const {
  useState,
  useEffect,
  useCallback,
  useRef
} = React;
const firebaseConfig = {
  apiKey: "AIzaSyDnrgaY8R0Zetkr18uHQJAZXIUa4EwDnv4",
  authDomain: "entrevista-inicial.firebaseapp.com",
  projectId: "entrevista-inicial",
  storageBucket: "entrevista-inicial.firebasestorage.app",
  messagingSenderId: "437375609844",
  appId: "1:437375609844:web:2ed0e16a7da5d46c2e27a1"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const CONFIG_FIN_PADRAO = {
  nomeSecretaria: "Jéssica Marjane",
  salarioFixo: 600,
  percPrimeira: 10,
  percRecorrente: 5,
  percParceiroPadrao: 70
};
async function getConfigFin() {
  try {
    const d = await db.collection("clinica_config").doc("comissoes").get();
    return d.exists ? {
      ...CONFIG_FIN_PADRAO,
      ...d.data()
    } : {
      ...CONFIG_FIN_PADRAO
    };
  } catch (e) {
    return {
      ...CONFIG_FIN_PADRAO
    };
  }
}
const LOGO_URL = "../logo-transparente.png";
const SENHA_ADMIN = "1234";
const SENHA_PAULO = "1234";
const SITE_URL = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";
const PERFIS = [{
  id: "psicologa",
  nome: "Sou Psicologa",
  desc: "Acesso ao painel clinico completo",
  icon: "stethoscope",
  cor: "#7B00C4"
}, {
  id: "secretaria",
  nome: "Sou Secretaria",
  desc: "Cadastro de pacientes e financeiro da clinica",
  icon: "clipboard-list",
  cor: "#0891b2"
}, {
  id: "paulo",
  nome: "Financeiro",
  desc: "Acesso ao módulo financeiro completo",
  icon: "wallet",
  cor: "#16a34a"
}, {
  id: "marketing",
  nome: "Marketing",
  desc: "Captacao de leads e metricas de trafego",
  icon: "trending-up",
  cor: "#ea580c"
}];
const MODULOS = [{
  id: "tcc",
  nome: "TCC — Pensamentos Automaticos",
  desc: "tcc"
}, {
  id: "humor",
  nome: "Registro de Humor",
  desc: "humor"
}, {
  id: "diario",
  nome: "Diario Terapeutico",
  desc: "diario"
}, {
  id: "metas",
  nome: "Metas Terapeuticas",
  desc: "metas"
}, {
  id: "reflexoes",
  nome: "Reflexoes Cognitivas",
  desc: "reflexoes"
}, {
  id: "fabulas",
  nome: "Fabulas Terapeuticas",
  desc: "fabulas"
}, {
  id: "musico",
  nome: "Musicoterapia",
  desc: "musicoterapia"
}];
const FERRAMENTAS = [{
  id: "arvore",
  nome: "Arvore da Decisao",
  desc: "Tecnica da TCC para transformar preocupacoes em acoes concretas."
}, {
  id: "ansiedade",
  nome: "Gestao da Ansiedade",
  desc: "Acompanhe nivel de estresse, tracking e roda da vida."
}, {
  id: "entrevista",
  nome: "Entrevista Clinica Inicial",
  desc: "Instrumento de avaliacao clinica inicial com DSM-5."
}, {
  id: "anamnese",
  nome: "Anamnese — Marcos do Desenvolvimento",
  desc: "Formulario completo de anamnese."
}, {
  id: "alimentacao",
  nome: "Rastreamento Emocional da Alimentacao",
  desc: "Consciencia sobre relacao entre emocoes e alimentacao."
}];
function fmtDataNotif(dataStr) {
  if (!dataStr) return "";
  const d = new Date(dataStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit"
  });
}
async function dispararNotificacao({
  tipo,
  titulo,
  corpo = "",
  pacienteId = ""
}) {
  try {
    await db.collection("clinica_notificacoes").add({
      tipo,
      titulo,
      corpo,
      pacienteId,
      lida: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {}
}
async function deletarDuplicatasPaciente(pacienteId, mesRef) {
  try {
    const snap = await db.collection("clinica_lancamentos").where("pacienteId", "==", pacienteId).get();
    const docs = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })).filter(d => (d.data || "").startsWith(mesRef));
    const grupos = {};
    docs.forEach(d => {
      const chave = `${d.data}|${parseFloat(d.valor || 0).toFixed(2)}|${(d.descricao || d.tipo || "").trim().toLowerCase()}`;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(d);
    });
    const batch = db.batch();
    let deletados = 0;
    Object.values(grupos).forEach(grupo => {
      if (grupo.length < 2) return;
      grupo.sort((a, b) => (b.pacoteId ? 1 : 0) - (a.pacoteId ? 1 : 0));
      const manter = grupo[0];
      const comPacote = grupo.find(g => g.pacoteId);
      if (comPacote && !manter.pacoteId) {
        batch.update(db.collection("clinica_lancamentos").doc(manter.id), {
          pacoteId: comPacote.pacoteId
        });
      }
      grupo.slice(1).forEach(dup => {
        batch.delete(db.collection("clinica_lancamentos").doc(dup.id));
        deletados++;
      });
    });
    await batch.commit();
    return {
      ok: true,
      deletados
    };
  } catch (e) {
    return {
      ok: false,
      erro: e.message
    };
  }
}
async function categorizarSemNome(mesRef) {
  try {
    const snap = await db.collection("clinica_lancamentos").get();
    const semNome = snap.docs.filter(d => {
      const dado = d.data();
      const nome = (dado.pacienteNome || dado.nomePaciente || "").trim();
      return (!nome || nome === "") && (dado.data || "").startsWith(mesRef);
    });
    if (semNome.length === 0) return {
      ok: true,
      atualizados: 0
    };
    const batch = db.batch();
    semNome.forEach(d => {
      batch.update(d.ref, {
        pacienteNome: "— Clínica —",
        categoria: "Despesas Administrativas/Clínica",
        tipo_lancamento: "despesa",
        _auditoria: "categorizado_automatico_" + mesRef
      });
    });
    await batch.commit();
    return {
      ok: true,
      atualizados: semNome.length
    };
  } catch (e) {
    return {
      ok: false,
      erro: e.message
    };
  }
}
async function deletarLancamentosOrfaosDeSessao() {
  try {
    const snap = await db.collection("clinica_lancamentos").where("tipo_lancamento", "==", "sessao").get();
    const orfaos = snap.docs.filter(d => {
      const dado = d.data();
      return !!dado.pacoteId;
    });
    if (orfaos.length === 0) return {
      ok: true,
      deletados: 0
    };
    const batches = [];
    let b = db.batch();
    orfaos.forEach((d, i) => {
      b.delete(d.ref);
      if ((i + 1) % 499 === 0) {
        batches.push(b);
        b = db.batch();
      }
    });
    batches.push(b);
    await Promise.all(batches.map(bt => bt.commit()));
    return {
      ok: true,
      deletados: orfaos.length
    };
  } catch (e) {
    return {
      ok: false,
      erro: e.message
    };
  }
}
function enviarPushLocal(titulo, corpo) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(titulo, {
      body: corpo,
      icon: "../logo-transparente.png"
    });
  }
}
async function verificarLembretesHoje(user) {
  if (!user) return;
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  const fmtDate = d => d.toISOString().split("T")[0];
  try {
    if (["psicologa", "secretaria"].includes(user.tipo)) {
      const snap = await db.collection("clinica_sessoes").where("data", "in", [fmtDate(hoje), fmtDate(amanha)]).where("status", "==", "agendado").get();
      snap.docs.forEach(d => {
        const s = d.data();
        const dia = s.data === fmtDate(hoje) ? "Hoje" : "Amanhã";
        const diaSemana = fmtDataNotif(s.data);
        enviarPushLocal(`${dia} — Sessão às ${s.hora}`, `${diaSemana} · ${s.pacienteNome}`);
      });
    }
    if (["psicologa", "paulo"].includes(user.tipo)) {
      const snap = await db.collection("clinica_lancamentos").where("status", "==", "pendente").where("data", "<=", fmtDate(amanha)).get();
      snap.docs.forEach(d => {
        const l = d.data();
        const diaSemana = fmtDataNotif(l.data);
        enviarPushLocal(`Pagamento previsto — ${diaSemana}`, `R$ ${parseFloat(l.valor || 0).toFixed(2).replace(".", ",")} · ${l.pacienteNome || l.descricao || ""}`);
      });
    }
    if (user.tipo === "secretaria") {
      const snap = await db.collection("clinica_lancamentos").where("status", "==", "pendente").get();
      snap.docs.slice(0, 3).forEach(d => {
        const l = d.data();
        const diaSemana = fmtDataNotif(l.data);
        enviarPushLocal(`Pagamento pendente — ${l.pacienteNome || ""}`, `R$ ${parseFloat(l.valor || 0).toFixed(2).replace(".", ",")} · previsto ${diaSemana}`);
      });
    }
  } catch (e) {}
}
function useBotaoNotificacao(user) {
  const [permissao, setPermissao] = useState("Notification" in window ? Notification.permission : "denied");
  useEffect(() => {
    if (!user || permissao !== "granted") return;
    const t = setTimeout(() => verificarLembretesHoje(user), 2000);
    return () => clearTimeout(t);
  }, [user, permissao]);
  async function ativar() {
    if (!("Notification" in window)) {
      alert("Seu navegador não suporta notificações.");
      return;
    }
    const p = await Notification.requestPermission();
    setPermissao(p);
    if (p === "granted") {
      verificarLembretesHoje(user);
    }
  }
  return {
    permissao,
    ativar
  };
}
function BotaoNotificacao({
  permissao,
  ativar
}) {
  if (!("Notification" in window)) return null;
  if (permissao === "granted") return React.createElement("span", {
    style: {
      background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.3)",
      color: "#fff",
      borderRadius: 20,
      padding: "5px 14px",
      fontSize: 12,
      fontFamily: "var(--font-body)"
    }
  }, "\uD83D\uDD14 Ativo");
  if (permissao === "denied") return React.createElement("span", {
    style: {
      background: "rgba(255,0,0,0.15)",
      border: "1px solid rgba(255,0,0,0.3)",
      color: "#fca5a5",
      borderRadius: 20,
      padding: "5px 14px",
      fontSize: 12,
      fontFamily: "var(--font-body)"
    }
  }, "\uD83D\uDD15 Bloqueado");
  return React.createElement("button", {
    onClick: ativar,
    style: {
      background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.3)",
      color: "#fff",
      borderRadius: 20,
      padding: "5px 14px",
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, "\uD83D\uDD14 Ativar lembretes");
}
function useCollection(col, orderField = "createdAt") {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = db.collection(col).onSnapshot(snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => {
        const av = a[orderField]?.seconds || a[orderField] || "";
        const bv = b[orderField]?.seconds || b[orderField] || "";
        return bv > av ? 1 : -1;
      });
      setData(docs);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [col]);
  return {
    data,
    loading
  };
}
function Icon({
  name,
  size = 18
}) {
  const ref = useRef(null);
  useEffect(() => {
    try {
      if (!ref.current || !window.lucide) return;
      ref.current.innerHTML = "";
      const n = name.replace(/-([a-z])/g, (_, l) => l.toUpperCase()).replace(/^./, s => s.toUpperCase());
      const fn = lucide[n];
      if (!fn) return;
      const ic = lucide.createElement(fn);
      if (ic) {
        ic.setAttribute("width", size);
        ic.setAttribute("height", size);
        ic.setAttribute("stroke-width", "1.8");
        ref.current.appendChild(ic);
      }
    } catch (e) {}
  }, [name, size]);
  return React.createElement("span", {
    ref: ref,
    style: {
      display: "inline-flex",
      alignItems: "center"
    }
  });
}
function TextAreaVoz({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "form-input",
  style = {}
}) {
  const [gravando, setGravando] = React.useState(false);
  const recRef = React.useRef(null);
  function toggleVoz() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (gravando) {
      recRef.current?.stop();
      setGravando(false);
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(" ");
      const base = (value || "").replace(/\s*\[\.\.\.]$/, "").trimEnd();
      onChange({
        target: {
          value: base ? base + " " + t : t
        }
      });
    };
    rec.onerror = () => setGravando(false);
    rec.onend = () => setGravando(false);
    recRef.current = rec;
    rec.start();
    setGravando(true);
  }
  const SR_SUPPORT = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  return React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("textarea", {
    className: className,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    rows: rows,
    style: {
      ...style,
      paddingRight: SR_SUPPORT ? 36 : undefined,
      resize: "vertical"
    }
  }), SR_SUPPORT && React.createElement("button", {
    type: "button",
    onClick: toggleVoz,
    title: gravando ? "Parar gravação" : "Falar para digitar",
    style: {
      position: "absolute",
      right: 6,
      bottom: 8,
      background: gravando ? "#7B00C4" : "#f3e6ff",
      border: "none",
      borderRadius: 6,
      padding: "4px 6px",
      cursor: "pointer",
      color: gravando ? "white" : "#7B00C4",
      fontSize: 14,
      lineHeight: 1,
      boxShadow: gravando ? "0 0 0 3px #7B00C430" : "none",
      transition: "all .2s"
    }
  }, "\uD83C\uDF99\uFE0F"), gravando && React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#7B00C4",
      marginTop: 3,
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "#7B00C4",
      display: "inline-block",
      animation: "pulse-slow 1s infinite"
    }
  }), "Gravando... clique \uD83C\uDF99\uFE0F para parar"));
}
function Spinner() {
  return React.createElement("div", {
    className: "spinner-wrap"
  }, React.createElement("div", {
    className: "spinner"
  }));
}
function EmBreve({
  titulo,
  subtitulo
}) {
  return React.createElement("div", {
    className: "em-breve"
  }, React.createElement(Icon, {
    name: "wrench",
    size: 48
  }), React.createElement("div", {
    className: "em-breve-title"
  }, titulo), React.createElement("div", {
    className: "em-breve-sub"
  }, subtitulo || "Modulo em construcao."));
}
function Login({
  onLogin
}) {
  const [etapa, setEtapa] = useState("perfil");
  const [senha, setSenha] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [perfilSel, setPerfilSel] = useState(null);
  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      if (perfilSel === "psicologa") {
        if (senha === SENHA_ADMIN) onLogin({
          tipo: "psicologa",
          nome: "Dra. Lucia Kratz",
          crp: "CRP 09/20590"
        });else setErro("Senha incorreta.");
      } else if (perfilSel === "paulo") {
        if (senha === SENHA_PAULO) onLogin({
          tipo: "paulo",
          nome: "Paulo Sergio"
        });else setErro("Senha incorreta.");
      } else if (perfilSel === "secretaria") {
        const snap = await db.collection("clinica_secretarias").where("email", "==", email.toLowerCase().trim()).get();
        if (snap.empty) {
          setErro("Usuario nao encontrado.");
          setLoading(false);
          return;
        }
        const sec = {
          id: snap.docs[0].id,
          ...snap.docs[0].data()
        };
        if (sec.senha !== senha) {
          setErro("Senha incorreta.");
          setLoading(false);
          return;
        }
        const nomeReal = sec.nome && !sec.nome.includes("@") ? sec.nome : "Secretaria";
        onLogin({
          ...sec,
          tipo: "secretaria",
          nome: nomeReal
        });
      } else if (perfilSel === "marketing") {
        if (senha === "1234") onLogin({
          tipo: "marketing",
          nome: "Marketing"
        });else setErro("Senha incorreta.");
      }
    } catch (e) {
      setErro("Erro ao conectar.");
    }
    setLoading(false);
  }
  const perfil = PERFIS.find(p => p.id === perfilSel);
  return React.createElement("div", {
    className: "login-page"
  }, React.createElement("div", {
    className: "login-left"
  }, React.createElement("div", {
    className: "login-logo"
  }, React.createElement("img", {
    src: LOGO_URL,
    alt: "Lucia Kratz",
    style: {
      width: 140,
      height: 140,
      objectFit: "contain"
    }
  })), React.createElement("div", {
    className: "login-name"
  }, "Dra. Lucia Kratz"), React.createElement("div", {
    className: "login-subtitle"
  }, "Sistema Administrativo"), React.createElement("div", {
    className: "login-crp"
  }, "Psicologa Doutora \xB7 CRP 09/20590"), React.createElement("div", {
    className: "login-left-btns"
  }, PERFIS.map(p => React.createElement("button", {
    key: p.id,
    onClick: () => {
      setPerfilSel(p.id);
      setEtapa("senha");
      setErro("");
      setSenha("");
      setEmail("");
    }
  }, p.nome.replace("Sou ", ""))))), React.createElement("div", {
    className: "login-right"
  }, etapa === "perfil" && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      width: "100%"
    }
  }, React.createElement("div", {
    className: "login-right-title"
  }, "Area Administrativa"), React.createElement("div", {
    className: "login-right-sub"
  }, "Selecione seu perfil de acesso.")), React.createElement("div", {
    className: "profile-cards"
  }, PERFIS.map(p => React.createElement("button", {
    key: p.id,
    className: "profile-card",
    onClick: () => {
      setPerfilSel(p.id);
      setEtapa("senha");
      setErro("");
    }
  }, React.createElement("div", {
    className: "profile-card-icon",
    style: {
      background: p.cor
    }
  }, React.createElement(Icon, {
    name: p.icon,
    size: 22
  })), React.createElement("div", {
    className: "profile-card-text"
  }, React.createElement("div", {
    className: "profile-card-name"
  }, p.nome), React.createElement("div", {
    className: "profile-card-desc"
  }, p.desc)), React.createElement("div", {
    className: "profile-card-arrow"
  }, React.createElement(Icon, {
    name: "chevron-right",
    size: 18
  }))))), React.createElement("div", {
    className: "login-footer"
  }, React.createElement("a", {
    href: "../sala/",
    target: "_blank",
    style: {
      color: "#ea580c",
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 6,
      textDecoration: "none",
      marginBottom: 8
    }
  }, React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 8,
      background: "#fff7ed",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement(Icon, {
    name: "door-open",
    size: 15
  })), "Agenda da Sala"), React.createElement("a", {
    href: "../clinica/",
    style: {
      color: "#7B00C4",
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginBottom: 6
    }
  }, React.createElement(Icon, {
    name: "activity",
    size: 14
  }), " \xC1rea Cl\xEDnica"), React.createElement("a", {
    href: "../",
    style: {
      color: "var(--gray-400)",
      fontSize: 12
    }
  }, "Voltar ao site"))), etapa === "senha" && perfil && React.createElement(React.Fragment, null, React.createElement("button", {
    className: "login-right-back",
    onClick: () => {
      setEtapa("perfil");
      setErro("");
    }
  }, React.createElement(Icon, {
    name: "arrow-left",
    size: 14
  }), " Voltar"), React.createElement("form", {
    className: "login-form",
    onSubmit: handleLogin
  }, React.createElement("div", null, React.createElement("div", {
    className: "login-form-title"
  }, perfil.nome), React.createElement("div", {
    className: "login-form-sub"
  }, perfil.desc)), erro && React.createElement("div", {
    className: "login-error"
  }, erro), perfilSel === "secretaria" && React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "E-mail"), React.createElement("input", {
    className: "form-input",
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    autoFocus: true
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Senha"), React.createElement("input", {
    className: "form-input",
    type: "password",
    value: senha,
    onChange: e => setSenha(e.target.value),
    autoFocus: perfilSel !== "secretaria"
  })), React.createElement("button", {
    className: "btn-primary",
    type: "submit",
    disabled: loading
  }, loading ? "Entrando..." : "Entrar")))));
}
const NAV_PSICOLOGA = [{
  grupo: "🏥 Clínica",
  itens: [{
    id: "dashboard",
    label: "Dashboard",
    icon: "layout-dashboard"
  }, {
    id: "pacientes",
    label: "Pacientes",
    icon: "users"
  }, {
    id: "alunos",
    label: "Alunos",
    icon: "graduation-cap"
  }, {
    id: "casais",
    label: "Terapia de Casais",
    icon: "heart"
  }, {
    id: "agenda",
    label: "Agenda",
    icon: "calendar"
  }, {
    id: "laudos",
    label: "Laudos",
    icon: "file-text"
  }, {
    id: "recursos",
    label: "Recursos Terapêuticos",
    icon: "wrench"
  }]
}, {
  grupo: "📊 Comercial & Marketing",
  itens: [{
    id: "funil-leads",
    label: "Funil de Leads",
    icon: "filter"
  }, {
    id: "marketing-dashboard",
    label: "Marketing",
    icon: "trending-up"
  }, {
    id: "dashboard-performance",
    label: "Performance",
    icon: "activity"
  }]
}, {
  grupo: "💰 Financeiro",
  itens: [{
    id: "fin-clinica",
    label: "Fin. Clínica",
    icon: "dollar-sign"
  }, {
    id: "comissoes",
    label: "Comissões",
    icon: "percent"
  }, {
    id: "fin-pessoal",
    label: "Fin. Pessoal",
    icon: "home"
  }]
}, {
  grupo: "⚙️ Configurações",
  itens: [{
    id: "permissoes",
    label: "Permissões",
    icon: "shield"
  }, {
    id: "depoimentos",
    label: "Depoimentos",
    icon: "star"
  }, {
    id: "config",
    label: "Configurações",
    icon: "settings"
  }]
}];
const NAV_PSICOLOGA_FLAT = NAV_PSICOLOGA.flatMap(g => g.itens);
const NAV_SECRETARIA = [{
  id: "pacientes",
  label: "Pacientes",
  icon: "users"
}, {
  id: "agenda",
  label: "Agenda",
  icon: "calendar"
}, {
  id: "funil-leads",
  label: "Funil Leads",
  icon: "filter"
}, {
  id: "fin-clinica",
  label: "Financeiro",
  icon: "dollar-sign"
}, {
  id: "comissoes",
  label: "Comissoes",
  icon: "percent"
}];
const NAV_PAULO = [{
  id: "fin-pessoal",
  label: "Financeiro Pessoal",
  icon: "home"
}, {
  id: "fin-clinica",
  label: "Financeiro Clínica",
  icon: "building-2"
}];
function Sidebar({
  user,
  tab,
  setTab,
  onLogout,
  notifProps
}) {
  const isPsicologa = user.tipo === "psicologa";
  const titulo = user.tipo === "secretaria" ? "Area da Secretaria" : user.tipo === "paulo" ? "Financeiro" : user.tipo === "marketing" ? "Marketing" : "Area Administrativa";
  const nomeExibir = user.nome && !user.nome.includes("@") ? user.nome : user.nomeCompleto || "Usuário";
  const initials = nomeExibir.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
  const navFlat = user.tipo === "secretaria" ? NAV_SECRETARIA : user.tipo === "paulo" ? NAV_PAULO : user.tipo === "marketing" ? NAV_MARKETING : null;
  return React.createElement("div", {
    className: "sidebar-desktop"
  }, React.createElement("div", {
    className: "sidebar-header"
  }, React.createElement("div", {
    className: "sidebar-logo"
  }, React.createElement("img", {
    src: LOGO_URL,
    alt: "LK",
    style: {
      width: 44,
      height: 44,
      objectFit: "contain"
    },
    onError: e => {
      e.target.style.display = "none";
      e.target.nextSibling.style.display = "block";
    }
  }), React.createElement("span", {
    className: "sidebar-logo-placeholder",
    style: {
      display: "none"
    }
  }, "LK")), React.createElement("div", null, React.createElement("div", {
    className: "sidebar-title"
  }, "Dra. Lucia Kratz"), React.createElement("div", {
    className: "sidebar-role"
  }, titulo))), React.createElement("nav", {
    className: "sidebar-nav"
  }, isPsicologa ? NAV_PSICOLOGA.map(grupo => React.createElement("div", {
    key: grupo.grupo,
    style: {
      marginBottom: 4
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.08em",
      color: "rgba(255,255,255,0.45)",
      padding: "10px 14px 4px",
      textTransform: "uppercase"
    }
  }, grupo.grupo), grupo.itens.map(item => React.createElement("button", {
    key: item.id,
    className: "nav-item " + (tab === item.id ? "active" : ""),
    onClick: () => setTab(item.id)
  }, React.createElement(Icon, {
    name: item.icon,
    size: 18
  }), item.label)))) : navFlat.map(item => React.createElement("button", {
    key: item.id,
    className: "nav-item " + (tab === item.id ? "active" : ""),
    onClick: () => setTab(item.id)
  }, React.createElement(Icon, {
    name: item.icon,
    size: 18
  }), item.label))), React.createElement("div", {
    className: "sidebar-footer"
  }, React.createElement("div", {
    className: "sidebar-user",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      background: "rgba(255,255,255,0.08)",
      borderRadius: 10,
      marginBottom: 8
    }
  }, React.createElement("div", {
    className: "sidebar-avatar",
    style: {
      flexShrink: 0
    }
  }, initials), React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, React.createElement("div", {
    className: "sidebar-user-name",
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, nomeExibir), user.crp && React.createElement("div", {
    className: "sidebar-user-crp"
  }, user.crp)), notifProps && React.createElement(BotaoNotificacao, notifProps)), user.tipo === "psicologa" && React.createElement("a", {
    href: "../sala/",
    target: "_blank",
    className: "nav-item",
    style: {
      color: "rgba(255,255,255,0.85)",
      background: "rgba(234,88,12,0.2)",
      borderRadius: 8,
      marginBottom: 2
    }
  }, React.createElement(Icon, {
    name: "door-open",
    size: 18
  }), " Agenda da Sala"), React.createElement("a", {
    href: "../clinica/",
    className: "nav-item",
    style: {
      color: "rgba(255,255,255,0.85)",
      background: "rgba(123,0,196,0.25)",
      borderRadius: 8,
      marginBottom: 2
    }
  }, React.createElement(Icon, {
    name: "activity",
    size: 18
  }), " \xC1rea Cl\xEDnica"), React.createElement("a", {
    href: "../",
    className: "nav-item",
    style: {
      color: "rgba(255,255,255,0.6)"
    }
  }, React.createElement(Icon, {
    name: "globe",
    size: 18
  }), " Site"), React.createElement("button", {
    className: "nav-item nav-item-danger",
    onClick: onLogout
  }, React.createElement(Icon, {
    name: "log-out",
    size: 18
  }), " Sair")));
}
function DashboardAdmin({
  user
}) {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  const [lancClinica, setLancClinica] = useState([]);
  const [lancPessoal, setLancPessoal] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  useEffect(() => {
    const u1 = db.collection("clinica_lancamentos").onSnapshot(s => setLancClinica(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    const u2 = db.collection("clinica_financeiro_pessoal").onSnapshot(s => setLancPessoal(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    const u3 = db.collection("clinica_sessoes").onSnapshot(s => setSessoes(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const ativos = pacientes.filter(p => p.status === "ativo").length;
  const sessoesHoje = sessoes.filter(s => s.data === new Date().toISOString().slice(0, 10)).length;
  function fmt(v) {
    return v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }
  const lcMes = lancClinica.filter(l => l.data?.startsWith(mesAtual));
  const recClinica = lcMes.filter(l => l.tipo_lancamento !== "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const despClinica = lcMes.filter(l => l.tipo_lancamento === "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const lpMes = lancPessoal.filter(l => l.data?.startsWith(mesAtual));
  const recPessoal = lpMes.filter(l => l.tipo === "receita" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const despPessoal = lpMes.filter(l => l.tipo === "despesa" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const totalRec = recClinica + recPessoal;
  const totalDesp = despClinica + despPessoal;
  const saldoMes = totalRec - totalDesp;
  const anoAtual = new Date().getFullYear() + "";
  const lcAno = lancClinica.filter(l => l.data?.startsWith(anoAtual));
  const lpAno = lancPessoal.filter(l => l.data?.startsWith(anoAtual));
  const recAno = lcAno.filter(l => l.tipo_lancamento !== "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0) + lpAno.filter(l => l.tipo === "receita" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const despAno = lcAno.filter(l => l.tipo_lancamento === "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0) + lpAno.filter(l => l.tipo === "despesa" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const saldoAno = recAno - despAno;
  return React.createElement("div", null, React.createElement("div", {
    className: "page-header"
  }, React.createElement("div", {
    className: "page-title"
  }, "Dashboard"), React.createElement("div", {
    className: "page-subtitle",
    style: {
      textTransform: "capitalize"
    }
  }, hoje)), React.createElement("div", {
    className: "metrics-grid",
    style: {
      marginBottom: 24
    }
  }, React.createElement("div", {
    className: "metric-card"
  }, React.createElement("div", {
    className: "metric-icon"
  }, React.createElement(Icon, {
    name: "users",
    size: 20
  })), React.createElement("div", {
    className: "metric-label"
  }, "Pacientes Ativos"), React.createElement("div", {
    className: "metric-value"
  }, ativos), React.createElement("div", {
    className: "metric-sub"
  }, pacientes.length, " total")), React.createElement("div", {
    className: "metric-card"
  }, React.createElement("div", {
    className: "metric-icon"
  }, React.createElement(Icon, {
    name: "calendar",
    size: 20
  })), React.createElement("div", {
    className: "metric-label"
  }, "Sess\xF5es Hoje"), React.createElement("div", {
    className: "metric-value"
  }, sessoesHoje), React.createElement("div", {
    className: "metric-sub"
  }, "agendadas")), React.createElement("div", {
    className: "metric-card"
  }, React.createElement("div", {
    className: "metric-icon"
  }, React.createElement(Icon, {
    name: "package",
    size: 20
  })), React.createElement("div", {
    className: "metric-label"
  }, "Pendente Cl\xEDnica"), React.createElement("div", {
    className: "metric-value",
    style: {
      fontSize: 18,
      color: "#d97706"
    }
  }, fmt(lcMes.filter(l => l.status === "pendente").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0)))), React.createElement("div", {
    className: "metric-card"
  }, React.createElement("div", {
    className: "metric-icon"
  }, React.createElement(Icon, {
    name: "heart",
    size: 20
  })), React.createElement("div", {
    className: "metric-label"
  }, "Casais em Terapia"), React.createElement("div", {
    className: "metric-value"
  }, pacientes.filter(p => p.casalId).length / 2 | 0))), React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 24
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, React.createElement(Icon, {
    name: "bar-chart-2",
    size: 18
  }), " Resumo Financeiro \u2014 ", new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  })), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
      gap: 10,
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      background: saldoMes >= 0 ? "#d1fae5" : "#fee2e2",
      borderRadius: 12,
      padding: "16px 20px",
      border: "1.5px solid",
      borderColor: saldoMes >= 0 ? "#6ee7b7" : "#fca5a5"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: saldoMes >= 0 ? "#059669" : "#dc2626",
      marginBottom: 6
    }
  }, "Saldo do M\xEAs (Geral)"), React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 800,
      color: saldoMes >= 0 ? "#059669" : "#dc2626"
    }
  }, fmt(saldoMes)), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6b7280",
      marginTop: 4
    }
  }, "Cl\xEDnica + Pessoal")), React.createElement("div", {
    style: {
      background: "#f0fdf4",
      borderRadius: 12,
      padding: "16px 20px",
      border: "1.5px solid #86efac"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "#059669",
      marginBottom: 6
    }
  }, "Total Receitas"), React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: "#059669"
    }
  }, fmt(totalRec)), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6b7280",
      marginTop: 4
    }
  }, "Cl\xEDnica: ", fmt(recClinica), " \xB7 Pessoal: ", fmt(recPessoal))), React.createElement("div", {
    style: {
      background: "#fef2f2",
      borderRadius: 12,
      padding: "16px 20px",
      border: "1.5px solid #fca5a5"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "#dc2626",
      marginBottom: 6
    }
  }, "Total Despesas"), React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: "#dc2626"
    }
  }, fmt(totalDesp)), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6b7280",
      marginTop: 4
    }
  }, "Cl\xEDnica: ", fmt(despClinica), " \xB7 Pessoal: ", fmt(despPessoal)))), React.createElement("div", {
    style: {
      borderTop: "1px solid var(--gray-100)",
      paddingTop: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 12,
      fontSize: 14,
      color: "var(--text-muted)"
    }
  }, "Acumulado ", anoAtual), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
      gap: 8
    }
  }, React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderRadius: 10,
      background: "var(--gray-50)",
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Receitas ", anoAtual), React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: "#059669"
    }
  }, fmt(recAno))), React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderRadius: 10,
      background: "var(--gray-50)",
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Despesas ", anoAtual), React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: "#dc2626"
    }
  }, fmt(despAno))), React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderRadius: 10,
      background: saldoAno >= 0 ? "#f0fdf4" : "#fef2f2",
      border: "1px solid",
      borderColor: saldoAno >= 0 ? "#86efac" : "#fca5a5"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Saldo Acumulado ", anoAtual), React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: saldoAno >= 0 ? "#059669" : "#dc2626"
    }
  }, fmt(saldoAno)))))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Bem-vinda, ", user.nome, " \uD83E\uDD8B"), React.createElement("a", {
    href: "../clinica/",
    style: {
      fontSize: 13,
      color: "var(--purple)",
      display: "flex",
      alignItems: "center",
      gap: 6,
      width: "fit-content",
      marginTop: 8
    }
  }, React.createElement(Icon, {
    name: "external-link",
    size: 14
  }), " Portal do Paciente")));
}
function AbaPerfil({
  paciente,
  pacientes
}) {
  const [form, setForm] = useState({
    ...paciente
  });
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  async function salvar() {
    setSalvando(true);
    const {
      id,
      ...dados
    } = form;
    await db.collection("clinica_pacientes").doc(paciente.id).update(dados);
    setSalvando(false);
    alert("Salvo!");
  }
  async function redefinirSenha() {
    await db.collection("clinica_pacientes").doc(paciente.id).update({
      senha: "1234"
    });
    alert("Senha redefinida para 1234.");
  }
  const msgAcesso = "Ola, " + paciente.nome + "! Butterfly\n\nSeu acesso ao portal terapeutico da Dra. Lucia Kratz esta pronto.\n\nLink: " + SITE_URL + "/clinica/\n\nEmail: " + paciente.email + "\nSenha: 1234\n\nDra. Lucia Kratz - CRP 09/20590";
  function copiarMsg() {
    const msg = "Ola, " + paciente.nome + "!\n\nSeu acesso ao portal terapeutico da Dra. Lucia Kratz esta pronto.\n\nLink de acesso: " + SITE_URL + "/clinica/\n\nEmail: " + paciente.email + "\nSenha: 1234\n\nAo entrar pela primeira vez, recomendo trocar a senha em Minha Conta.\n\nQualquer duvida, estou a disposicao!\nDra. Lucia Kratz - CRP 09/20590";
    navigator.clipboard.writeText(msg);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Nome completo"), React.createElement("input", {
    className: "form-input",
    value: form.nome || "",
    onChange: e => setForm({
      ...form,
      nome: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "E-mail"), React.createElement("input", {
    className: "form-input",
    type: "email",
    value: form.email || "",
    onChange: e => setForm({
      ...form,
      email: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Telefone"), React.createElement("input", {
    className: "form-input",
    value: form.telefone || "",
    onChange: e => setForm({
      ...form,
      telefone: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data de Nascimento"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: form.dataNasc || "",
    onChange: e => setForm({
      ...form,
      dataNasc: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "CPF"), React.createElement("input", {
    className: "form-input",
    value: form.cpf || "",
    onChange: e => setForm({
      ...form,
      cpf: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Genero"), React.createElement("select", {
    className: "form-input",
    value: form.genero || "",
    onChange: e => setForm({
      ...form,
      genero: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Selecione"), React.createElement("option", null, "Feminino"), React.createElement("option", null, "Masculino"), React.createElement("option", null, "Nao-binario"), React.createElement("option", null, "Nao informar"))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Status"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 4
    }
  }, [["ativo", "Ativo", "var(--success)"], ["inativo", "Inativo", "var(--danger)"], ["alta", "Alta", "var(--gray-400)"]].map(([s, l, c]) => React.createElement("button", {
    key: s,
    onClick: () => setForm({
      ...form,
      status: s
    }),
    style: {
      padding: "7px 14px",
      borderRadius: 20,
      border: "1.5px solid " + c,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)",
      background: form.status === s ? c : "white",
      color: form.status === s ? "white" : c
    }
  }, l)))), React.createElement("div", {
    style: {
      gridColumn: "span 2",
      fontSize: 12,
      fontWeight: 700,
      color: "var(--purple)",
      borderBottom: "1px solid var(--purple-soft)",
      paddingBottom: 4,
      marginTop: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5
    }
  }, "\uD83C\uDFE2 Dados Ocupacionais \u2014 para documentos NR-1 e declara\xE7\xF5es"), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Empresa Contratante"), React.createElement("input", {
    className: "form-input",
    value: form.empresa || "",
    onChange: e => setForm({
      ...form,
      empresa: e.target.value
    }),
    placeholder: "Ex: Construtora Horizonte Ltda."
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Setor"), React.createElement("input", {
    className: "form-input",
    value: form.setor || "",
    onChange: e => setForm({
      ...form,
      setor: e.target.value
    }),
    placeholder: "Ex: Administrativo"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Cargo"), React.createElement("input", {
    className: "form-input",
    value: form.cargo || "",
    onChange: e => setForm({
      ...form,
      cargo: e.target.value
    }),
    placeholder: "Ex: Analista de RH"
  })), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Objetivos Terapeuticos"), React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: form.objetivos || "",
    onChange: e => setForm({
      ...form,
      objetivos: e.target.value
    }),
    placeholder: "Descreva os objetivos da terapia..."
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 16
    }
  }, React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando
  }, salvando ? "Salvando..." : "Salvar alteracoes"))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12
    }
  }, React.createElement(Icon, {
    name: "key",
    size: 18
  }), React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Credenciais de Acesso")), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Copie o texto abaixo e envie para o paciente. A senha padrao e ", React.createElement("strong", null, "1234"), "."), React.createElement("div", {
    style: {
      background: "var(--gray-50)",
      border: "1px solid var(--gray-200)",
      borderRadius: 10,
      padding: 16,
      fontSize: 13,
      lineHeight: 1.8,
      color: "var(--text-muted)"
    }
  }, "Ola, " + paciente.nome + "!\n\nSeu acesso ao portal terapeutico da Dra. Lucia Kratz esta pronto.\nLink: " + SITE_URL + "/clinica/\nEmail: " + paciente.email + "\nSenha: 1234\n\nDra. Lucia Kratz - CRP 09/20590"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 12
    }
  }, React.createElement("button", {
    className: "btn btn-outline",
    onClick: copiarMsg
  }, React.createElement(Icon, {
    name: "copy",
    size: 15
  }), " ", copiado ? "Copiado!" : "Copiar mensagem"), React.createElement("button", {
    className: "btn btn-ghost",
    onClick: redefinirSenha
  }, React.createElement(Icon, {
    name: "key",
    size: 15
  }), " Redefinir senha para 1234"))));
}
const FERRAMENTAS_MOD1 = [{
  id: "humor",
  nome: "Check-in Diário",
  desc: "Registro de humor e bem-estar diário"
}, {
  id: "metas",
  nome: "Metas Terapêuticas",
  desc: "Acompanhamento de metas"
}, {
  id: "diario",
  nome: "Diário Terapêutico",
  desc: "Escrita reflexiva livre"
}];
function Toggle({
  ativo,
  onClick
}) {
  return React.createElement("button", {
    onClick: onClick,
    style: {
      width: 44,
      height: 24,
      borderRadius: 12,
      border: "none",
      cursor: "pointer",
      background: ativo ? "var(--purple)" : "var(--gray-200)",
      position: "relative",
      transition: "background .2s",
      flexShrink: 0
    }
  }, React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      left: ativo ? "22px" : "2px",
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "white",
      transition: "left .2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
    }
  }));
}
function AbaModulos({
  paciente
}) {
  const [config, setConfig] = useState(paciente.modulosConfig || {});
  const [recursos, setRecursos] = useState([]);
  const [fabulas, setFabulas] = useState([]);
  const [psicoeducacao, setPsicoeducacao] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [modalSugestao, setModalSugestao] = useState(null);
  const [sugestoesSel, setSugestoesSel] = useState({});
  useEffect(() => {
    db.collection("clinica_pacientes").doc(paciente.id).get().then(d => {
      if (d.exists && d.data().modulosConfig) setConfig(d.data().modulosConfig);
    });
    db.collection("clinica_recursos").get().then(s => setRecursos(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))));
    db.collection("clinica_fabulas").onSnapshot(s => setFabulas(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    db.collection("clinica_psicoeducacao").onSnapshot(s => setPsicoeducacao(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
  }, [paciente.id]);
  async function salvarConfig(novaConfig) {
    setConfig(novaConfig);
    const ativos = Object.keys(novaConfig).filter(k => novaConfig[k]?.ativo);
    await db.collection("clinica_pacientes").doc(paciente.id).update({
      modulosConfig: novaConfig,
      modulosAtivos: ativos
    });
  }
  function toggleModulo(modId) {
    const atual = config[modId] || {};
    const novaConfig = {
      ...config,
      [modId]: {
        ...atual,
        ativo: !atual.ativo,
        ferramentas: atual.ferramentas || {}
      }
    };
    salvarConfig(novaConfig);
  }
  function toggleFerramenta(modId, ferrId) {
    const modAtual = config[modId] || {
      ativo: true,
      ferramentas: {}
    };
    const ferrAtual = modAtual.ferramentas || {};
    const hoje = new Date().toISOString().split("T")[0];
    const estaAtiva = !!ferrAtual[ferrId];
    if (estaAtiva) {
      const novaFerr = {
        ...ferrAtual
      };
      delete novaFerr[ferrId];
      salvarConfig({
        ...config,
        [modId]: {
          ...modAtual,
          ferramentas: novaFerr
        }
      });
      return;
    }
    const novaFerr = {
      ...ferrAtual,
      [ferrId]: {
        ativo: true,
        dataInicio: hoje
      }
    };
    salvarConfig({
      ...config,
      [modId]: {
        ...modAtual,
        ferramentas: novaFerr
      }
    });
    const rec = recursos.find(r => r.id === ferrId);
    const catFerr = rec?.categoria || "";
    const macroId = FAB_LEGADO_MACRO[catFerr] || catFerr;
    if (!macroId || !macroId.startsWith("macro_")) return;
    const ferrAtivadas = new Set(Object.keys(novaFerr));
    const fabSugest = fabulas.filter(f => (FAB_LEGADO_MACRO[f.categoria || ""] === macroId || f.categoria === macroId) && !ferrAtivadas.has(f.id)).slice(0, 3);
    const psicoSugest = psicoeducacao.filter(p => (PSICO_LEGADO_MACRO[p.categoria || ""] === macroId || p.categoria === macroId) && !ferrAtivadas.has(p.id)).slice(0, 3);
    if (fabSugest.length === 0 && psicoSugest.length === 0) return;
    const macro = MACROCATEGORIAS.find(m => m.id === macroId);
    setModalSugestao({
      ferramenta: rec?.titulo || ferrId,
      categoria: macro?.label || macroId,
      cor: macro?.cor || "#7B00C4",
      bg: macro?.bg || "#f3e6ff",
      icone: macro?.icone || "🔧",
      modId,
      fabulas: fabSugest,
      psicoeducacao: psicoSugest
    });
    setSugestoesSel({});
  }
  async function ativarSugestoes() {
    if (!modalSugestao) return;
    const hoje = new Date().toISOString().split("T")[0];
    const modAtual = config[modalSugestao.modId] || {
      ativo: true,
      ferramentas: {}
    };
    const ferrAtual = {
      ...modAtual.ferramentas
    };
    const modFab = config["mod2"] || {
      ativo: true,
      ferramentas: {}
    };
    const ferrFab = {
      ...modFab.ferramentas
    };
    const modPsico = config["mod6"] || {
      ativo: true,
      ferramentas: {}
    };
    const ferrPsico = {
      ...modPsico.ferramentas
    };
    Object.entries(sugestoesSel).forEach(([id, sel]) => {
      if (!sel) return;
      const isFab = modalSugestao.fabulas.some(f => f.id === id);
      const isPsico = modalSugestao.psicoeducacao.some(p => p.id === id);
      if (isFab) ferrFab[id] = {
        ativo: true,
        dataInicio: hoje
      };
      if (isPsico) ferrPsico[id] = {
        ativo: true,
        dataInicio: hoje
      };
    });
    await db.collection("clinica_pacientes").doc(paciente.id).update({
      modulosConfig: {
        ...config,
        mod2: {
          ...modFab,
          ativo: true,
          ferramentas: ferrFab
        },
        mod6: {
          ...modPsico,
          ativo: true,
          ferramentas: ferrPsico
        }
      },
      modulosAtivos: [...new Set([...Object.keys(config).filter(k => config[k]?.ativo), "mod2", "mod6"])]
    });
    setConfig(c => ({
      ...c,
      mod2: {
        ...modFab,
        ativo: true,
        ferramentas: ferrFab
      },
      mod6: {
        ...modPsico,
        ativo: true,
        ferramentas: ferrPsico
      }
    }));
    setModalSugestao(null);
  }
  function setDataInicio(modId, ferrId, data) {
    const modAtual = config[modId] || {
      ativo: true,
      ferramentas: {}
    };
    const ferrAtual = modAtual.ferramentas || {};
    salvarConfig({
      ...config,
      [modId]: {
        ...modAtual,
        ferramentas: {
          ...ferrAtual,
          [ferrId]: {
            ...(ferrAtual[ferrId] || {}),
            dataInicio: data
          }
        }
      }
    });
  }
  const MODULOS_DEF = [{
    id: "mod1",
    nome: "Módulo I — Dashboard",
    desc: "Ferramentas do dia a dia",
    icone: "🧠",
    ferramentas: FERRAMENTAS_MOD1
  }, {
    id: "mod2",
    nome: "Módulo II — Fábulas Terapêuticas",
    desc: "Fábulas cadastradas em Recursos",
    icone: "📖",
    ferramentas: fabulas.map(f => ({
      id: f.id,
      nome: f.titulo || f.nome,
      desc: f.macroCategoria || f.categoria || "",
      cat: f.macroCategoria || f.categoria || ""
    }))
  }, {
    id: "mod3",
    nome: "Módulo III — Ferramentas",
    desc: "Ferramentas cadastradas em Recursos",
    icone: "🔧",
    ferramentas: recursos.filter(r => r.categoria !== "musicoterapia" && r.categoria !== "casal").map(f => ({
      id: f.id,
      nome: f.titulo || f.nome,
      desc: f.macroCategoria || f.categoria || "",
      cat: f.macroCategoria || f.categoria || ""
    }))
  }, {
    id: "mod4",
    nome: "Módulo IV — Musicoterapia",
    desc: "Ferramentas de musicoterapia",
    icone: "🎵",
    ferramentas: recursos.filter(r => r.categoria === "musicoterapia").map(f => ({
      id: f.id,
      nome: f.titulo || f.nome,
      desc: f.descricao || ""
    }))
  }, {
    id: "mod5",
    nome: "Módulo V — Terapia de Casais",
    desc: "Etapas da terapia de casais",
    icone: "💑",
    ferramentas: [{
      id: "etapa1-casal",
      nome: "Etapa 1 — Reconexão e Segurança Emocional",
      desc: "Reduzir defensividade e aumentar conexão emocional"
    }, {
      id: "etapa2-casal",
      nome: "Etapa 2 — Identidade e Vínculo do Casal",
      desc: "Resgatar identidade afetiva e visão compartilhada"
    }, {
      id: "etapa3-casal",
      nome: "Etapa 3 — Conceitualização Cognitiva",
      desc: "Identificar padrões cognitivos e crenças relacionais"
    }, {
      id: "etapa4-casal",
      nome: "Etapa 4 — Reestruturação Relacional",
      desc: "Criar novos padrões emocionais e comportamentais"
    }],
    automatico: false
  }, {
    id: "mod6",
    nome: "Módulo VI — Psicoeducação",
    desc: "Materiais psicoeducativos cadastrados em Recursos",
    icone: "🎓",
    ferramentas: psicoeducacao.map(f => ({
      id: f.id,
      nome: f.titulo || f.nome,
      desc: f.macroCategoria || f.categoria || "",
      cat: f.macroCategoria || f.categoria || ""
    }))
  }];
  const MODS_COM_GRUPO = new Set(["mod2", "mod3", "mod6"]);
  const CAT_PARA_MACRO_MOD = {
    ansiedade_diaria: "macro_ansiedade",
    distorcoes: "macro_ansiedade",
    crencas_esquemas: "macro_ansiedade",
    autocritica: "macro_ansiedade",
    procrastinacao: "macro_ansiedade",
    tcc: "macro_ansiedade",
    ansiedade: "macro_ansiedade",
    esquema: "macro_ansiedade",
    depressao: "macro_humor",
    desamor: "macro_humor",
    regulacao_emocional: "macro_humor",
    burnout: "macro_humor",
    vergonha: "macro_humor",
    emocoes: "macro_humor",
    rotina: "macro_habitos",
    sono: "macro_habitos",
    motivacao: "macro_habitos",
    neuroplasticidade: "macro_habitos",
    praticas_autocuidado: "macro_habitos",
    autocuidado: "macro_habitos",
    comunicacao: "macro_relacionamentos",
    dependencia: "macro_relacionamentos",
    limites: "macro_relacionamentos",
    ciumes: "macro_relacionamentos",
    toxicos: "macro_relacionamentos",
    relacionamentos: "macro_relacionamentos",
    conflitos_casal: "macro_casais",
    sexualidade: "macro_casais",
    parentalidade: "macro_casais",
    conflitos_familia: "macro_casais",
    traicao: "macro_casais",
    alimentacao: "macro_corpo",
    autoimagem: "macro_corpo",
    nervovago: "macro_corpo",
    sintomas_fisicos: "macro_corpo",
    saude_mental: "macro_corpo",
    corpo: "macro_corpo",
    musicoterapia: "macro_musico",
    avaliacao: "macro_aval",
    resiliencia: "macro_habitos",
    esperanca: "macro_humor",
    autoconfianca: "macro_humor",
    autoconhecimento: "macro_ansiedade",
    perspectiva: "macro_habitos",
    mindfulness: "macro_habitos",
    ansiedade_fab: "macro_ansiedade",
    "resiliência": "macro_habitos",
    "esperança": "macro_humor",
    "autoconfiança": "macro_humor",
    "autoestima": "macro_humor",
    "expressão emocional": "macro_humor",
    "regulação emocional": "macro_humor",
    "perdão": "macro_humor",
    "crescimento": "macro_habitos",
    "autoconhecimento": "macro_ansiedade",
    "perspectiva": "macro_habitos",
    "mindfulness": "macro_habitos",
    "criatividade": "macro_habitos",
    "proposito": "macro_habitos",
    "propósito": "macro_habitos"
  };
  const MACRO_INFO = {
    macro_ansiedade: {
      icone: "🧠",
      label: "Ansiedade e Controle dos Pensamentos",
      cor: "#7B00C4",
      bg: "#f3e6ff"
    },
    macro_humor: {
      icone: "❤️",
      label: "Humor e Regulação Emocional",
      cor: "#db2777",
      bg: "#fce7f3"
    },
    macro_habitos: {
      icone: "🌱",
      label: "Hábitos e Autocuidado",
      cor: "#16a34a",
      bg: "#dcfce7"
    },
    macro_relacionamentos: {
      icone: "🤝",
      label: "Conflitos Interpessoais e Relacionamentos",
      cor: "#0891b2",
      bg: "#e0f2fe"
    },
    macro_casais: {
      icone: "💑",
      label: "Casais, Família e Parentalidade",
      cor: "#d97706",
      bg: "#fef3c7"
    },
    macro_corpo: {
      icone: "🏃",
      label: "Corpo, Saúde e Conexão Somática",
      cor: "#059669",
      bg: "#d1fae5"
    },
    macro_musico: {
      icone: "🎵",
      label: "Musicoterapia",
      cor: "#7B00C4",
      bg: "#f3e6ff"
    },
    macro_aval: {
      icone: "📋",
      label: "Avaliação e Anamnese",
      cor: "#6366f1",
      bg: "#e0e7ff"
    },
    _outros: {
      icone: "🔧",
      label: "Outros",
      cor: "#6b7280",
      bg: "#f3f4f6"
    }
  };
  const NOME_PARA_MACRO = {
    "Mapa de Intensidade": "macro_corpo",
    "Mapa de Intimidade": "macro_casais",
    "Roda da Vida Integral": "macro_habitos",
    "Protocolo dos 3 Mapas": "macro_relacionamentos",
    "Diário de Parentalidade Compassiva": "macro_casais",
    "Diário de Autocompaixão": "macro_humor",
    "Plano de Ativação Comportamental": "macro_humor",
    "Prática de Presença": "macro_corpo",
    "Empilhamento de Hábitos": "macro_habitos",
    "Protocolo de Regulação Nervosa": "macro_corpo",
    "Mapeamento do Ciclo de Conflito": "macro_relacionamentos",
    "Análise em Cadeia": "macro_ansiedade",
    "Registo CNV": "macro_relacionamentos",
    "Registro CNV": "macro_relacionamentos",
    "Mapa de Triangulação": "macro_casais",
    "Kit SOS Emocional": "macro_humor",
    "Mapa de Limites Pessoais": "macro_relacionamentos",
    "Ritual de Descompressão Noturna": "macro_habitos",
    "Pausa Estratégica": "macro_humor",
    "Mapa da Bateria": "macro_habitos",
    "Mapa de Diferenciação": "macro_relacionamentos",
    "Diário Corpo-Mente": "macro_corpo",
    "Escuta Ativa": "macro_relacionamentos",
    "Regra dos 5 Minutos": "macro_habitos",
    "Inventário de Carga Mental": "macro_relacionamentos",
    "Árvore da Decisão": "macro_ansiedade"
  };
  function agruparPorMacro(ferramentas) {
    const grupos = {};
    ferramentas.forEach(f => {
      const raw = f.desc || f.cat || "";
      let macroId;
      if (MACRO_INFO[raw]) {
        macroId = raw;
      } else if (!raw || raw === "outro" || raw === "outros") {
        const nomeLower = (f.nome || "").toLowerCase();
        const encontrado = Object.entries(NOME_PARA_MACRO).find(([k]) => nomeLower.includes(k.toLowerCase()));
        macroId = encontrado ? encontrado[1] : "_outros";
      } else {
        macroId = CAT_PARA_MACRO_MOD[raw] || CAT_PARA_MACRO_MOD[f.cat] || "_outros";
      }
      if (!grupos[macroId]) grupos[macroId] = [];
      grupos[macroId].push(f);
    });
    return Object.entries(MACRO_INFO).filter(([id]) => grupos[id]?.length > 0).map(([id, info]) => ({
      id,
      ...info,
      itens: grupos[id]
    }));
  }
  const [gruposAbertos, setGruposAbertos] = useState({});
  function toggleGrupo(modId, grupoId) {
    const key = modId + "_" + grupoId;
    setGruposAbertos(g => ({
      ...g,
      [key]: !g[key]
    }));
  }
  function renderFerramenta(ferr, modId, ferramentas) {
    const ferrConfig = ferramentas[ferr.id];
    const ferrAtiva = !!ferrConfig;
    return React.createElement("div", {
      key: ferr.id,
      style: {
        background: "white",
        borderRadius: 10,
        border: `1.5px solid ${ferrAtiva ? "var(--purple)" : "var(--gray-200)"}`,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        transition: "border-color .2s"
      }
    }, React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 13
      }
    }, ferr.nome), ferr.desc && React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, ferr.desc)), ferrAtiva && React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, React.createElement("label", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)"
      }
    }, "In\xEDcio:"), React.createElement("input", {
      type: "date",
      value: ferrConfig.dataInicio || "",
      onChange: e => setDataInicio(modId, ferr.id, e.target.value),
      style: {
        fontSize: 12,
        border: "1px solid var(--gray-200)",
        borderRadius: 6,
        padding: "3px 6px",
        fontFamily: "var(--font-body)"
      }
    })), React.createElement(Toggle, {
      ativo: ferrAtiva,
      onClick: () => toggleFerramenta(modId, ferr.id)
    }));
  }
  return React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, MODULOS_DEF.map(mod => {
    const modConfig = config[mod.id] || {};
    const ativo = !!modConfig.ativo;
    const ferramentas = modConfig.ferramentas || {};
    const usaGrupo = MODS_COM_GRUPO.has(mod.id);
    return React.createElement("div", {
      key: mod.id,
      style: {
        background: "white",
        borderRadius: 14,
        border: `2px solid ${ativo ? "var(--purple)" : "var(--gray-200)"}`,
        overflow: "hidden",
        transition: "border-color .2s"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 20px",
        background: ativo ? "var(--purple-bg)" : "white"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 24
      }
    }, mod.icone), React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 15,
        color: "var(--text)"
      }
    }, mod.nome), React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, mod.desc)), mod.automatico ? React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        fontStyle: "italic"
      }
    }, "autom\xE1tico") : React.createElement(Toggle, {
      ativo: ativo,
      onClick: () => toggleModulo(mod.id)
    })), ativo && !mod.automatico && React.createElement("div", {
      style: {
        borderTop: "1px solid var(--gray-100)",
        padding: "12px 20px",
        background: "#fafafa"
      }
    }, mod.ferramentas.length === 0 ? React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        padding: "8px 0"
      }
    }, "Nenhuma ferramenta cadastrada neste m\xF3dulo ainda.") : usaGrupo ? React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, agruparPorMacro(mod.ferramentas).map(grupo => {
      const key = mod.id + "_" + grupo.id;
      const aberto = !!gruposAbertos[key];
      const ativosNoGrupo = grupo.itens.filter(f => !!ferramentas[f.id]).length;
      return React.createElement("div", {
        key: grupo.id,
        style: {
          borderRadius: 10,
          border: `1.5px solid ${grupo.cor}30`,
          overflow: "hidden"
        }
      }, React.createElement("div", {
        onClick: () => toggleGrupo(mod.id, grupo.id),
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: grupo.bg,
          cursor: "pointer",
          userSelect: "none"
        }
      }, React.createElement("span", {
        style: {
          fontSize: 16
        }
      }, grupo.icone), React.createElement("span", {
        style: {
          fontWeight: 700,
          fontSize: 12,
          color: grupo.cor,
          flex: 1
        }
      }, grupo.label), ativosNoGrupo > 0 && React.createElement("span", {
        style: {
          background: grupo.cor,
          color: "white",
          borderRadius: 20,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700
        }
      }, ativosNoGrupo, " ativo", ativosNoGrupo !== 1 ? "s" : ""), React.createElement("span", {
        style: {
          fontSize: 11,
          color: grupo.cor,
          marginLeft: 4
        }
      }, aberto ? "▲" : "▼", " ", grupo.itens.length)), aberto && React.createElement("div", {
        style: {
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "white"
        }
      }, grupo.itens.map(ferr => renderFerramenta(ferr, mod.id, ferramentas))));
    })) : React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-muted)",
        marginBottom: 4
      }
    }, "FERRAMENTAS DISPON\xCDVEIS"), mod.ferramentas.map(ferr => renderFerramenta(ferr, mod.id, ferramentas)))));
  }), modalSugestao && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      width: "100%",
      maxWidth: 520,
      maxHeight: "85vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
    }
  }, React.createElement("div", {
    style: {
      background: `linear-gradient(135deg,${modalSugestao.cor},${modalSugestao.cor}cc)`,
      borderRadius: "16px 16px 0 0",
      padding: "18px 24px",
      color: "white"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      opacity: 0.85,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: "0.6px"
    }
  }, modalSugestao.icone, " ", modalSugestao.categoria), React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 4
    }
  }, "\u2728 Sugest\xF5es para complementar"), React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: 0.9
    }
  }, "Voc\xEA ativou ", React.createElement("b", null, modalSugestao.ferramenta), ". Selecione f\xE1bulas e psicoeduca\xE7\xF5es da mesma tem\xE1tica.")), React.createElement("div", {
    style: {
      padding: "20px 24px"
    }
  }, modalSugestao.fabulas.length > 0 && React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: "var(--purple)",
      marginBottom: 10,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(Icon, {
    name: "book-open",
    size: 15
  }), " F\xE1bulas Terap\xEAuticas"), modalSugestao.fabulas.map(f => React.createElement("label", {
    key: f.id,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      cursor: "pointer",
      marginBottom: 6,
      background: sugestoesSel[f.id] ? "var(--purple-soft)" : "#fafafa",
      border: `1.5px solid ${sugestoesSel[f.id] ? "var(--purple)" : "var(--gray-200)"}`,
      transition: "all .15s"
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: !!sugestoesSel[f.id],
    onChange: e => setSugestoesSel(s => ({
      ...s,
      [f.id]: e.target.checked
    })),
    style: {
      marginTop: 2,
      accentColor: "var(--purple)",
      flexShrink: 0
    }
  }), React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, f.titulo || f.nome), f.moral && React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 2,
      fontStyle: "italic"
    }
  }, "\"", f.moral, "\""))))), modalSugestao.psicoeducacao.length > 0 && React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: "var(--purple)",
      marginBottom: 10,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(Icon, {
    name: "brain",
    size: 15
  }), " Psicoeduca\xE7\xE3o"), modalSugestao.psicoeducacao.map(p => React.createElement("label", {
    key: p.id,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      cursor: "pointer",
      marginBottom: 6,
      background: sugestoesSel[p.id] ? "var(--purple-soft)" : "#fafafa",
      border: `1.5px solid ${sugestoesSel[p.id] ? "var(--purple)" : "var(--gray-200)"}`,
      transition: "all .15s"
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: !!sugestoesSel[p.id],
    onChange: e => setSugestoesSel(s => ({
      ...s,
      [p.id]: e.target.checked
    })),
    style: {
      marginTop: 2,
      accentColor: "var(--purple)",
      flexShrink: 0
    }
  }), React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, p.titulo || p.nome), p.descricao && React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, p.descricao.slice(0, 80)))))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, React.createElement("button", {
    onClick: () => setModalSugestao(null),
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 8,
      border: "1px solid var(--gray-200)",
      background: "white",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, "Agora n\xE3o"), React.createElement("button", {
    onClick: () => {
      const algum = Object.values(sugestoesSel).some(v => v);
      if (algum) ativarSugestoes();else setModalSugestao(null);
    },
    style: {
      flex: 2,
      padding: "10px",
      borderRadius: 8,
      border: "none",
      background: "var(--purple)",
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, Object.values(sugestoesSel).some(v => v) ? `✓ Ativar ${Object.values(sugestoesSel).filter(v => v).length} selecionado(s)` : "Fechar sem ativar"))))));
}
function AbaFerramentas({
  paciente
}) {
  const [ferramentas, setFerramentas] = useState(paciente.ferramentasAtivas || []);
  async function toggle(id) {
    const novas = ferramentas.includes(id) ? ferramentas.filter(f => f !== id) : [...ferramentas, id];
    setFerramentas(novas);
    await db.collection("clinica_pacientes").doc(paciente.id).update({
      ferramentasAtivas: novas
    });
  }
  return React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 4
    }
  }, "Ferramentas Terapeuticas"), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Selecione as ferramentas disponiveis para este paciente no portal."), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, FERRAMENTAS.map(f => React.createElement("div", {
    key: f.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: 16,
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: ferramentas.includes(f.id) ? "var(--purple)" : "var(--gray-200)",
      background: ferramentas.includes(f.id) ? "var(--purple-bg)" : "white",
      cursor: "pointer",
      transition: "all .2s"
    },
    onClick: () => toggle(f.id)
  }, React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, f.nome), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, f.desc)), React.createElement("button", {
    style: {
      width: 44,
      height: 24,
      borderRadius: 12,
      border: "none",
      cursor: "pointer",
      background: ferramentas.includes(f.id) ? "var(--purple)" : "var(--gray-200)",
      position: "relative",
      flexShrink: 0
    }
  }, React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      left: ferramentas.includes(f.id) ? "22px" : "2px",
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "white",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
    }
  }))))));
}
const PORTAL_URLS = {
  humor: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#humor",
  diario: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#diario",
  metas: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#metas",
  reflexoes: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#reflexoes",
  tcc: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#tcc",
  respiracao: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#respiracao",
  relaxamento: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#relaxamento"
};
function AbaModulo1({
  paciente
}) {
  const [dados, setDados] = useState({
    humor: [],
    diario: [],
    metas: [],
    reflexoes: [],
    tcc: [],
    respiracao: [],
    relaxamento: []
  });
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    const id = paciente.id;
    Promise.all([db.collection("clinica_humor").where("pacienteId", "==", id).get(), db.collection("clinica_diario").where("pacienteId", "==", id).get(), db.collection("clinica_metas").where("pacienteId", "==", id).where("status", "==", "ativa").get(), db.collection("clinica_reflexoes").where("pacienteId", "==", id).get(), db.collection("clinica_tcc").where("pacienteId", "==", id).get(), db.collection("clinica_atividades").where("pacienteId", "==", id).where("tipo", "==", "respiracao").get(), db.collection("clinica_atividades").where("pacienteId", "==", id).where("tipo", "==", "relaxamento").get()]).then(([h, d, m, r, t, resp, relax]) => {
      setDados({
        humor: h.docs.map(x => ({
          id: x.id,
          ...x.data()
        })),
        diario: d.docs.map(x => ({
          id: x.id,
          ...x.data()
        })),
        metas: m.docs.map(x => ({
          id: x.id,
          ...x.data()
        })),
        reflexoes: r.docs.map(x => ({
          id: x.id,
          ...x.data()
        })),
        tcc: t.docs.map(x => ({
          id: x.id,
          ...x.data()
        })),
        respiracao: resp.docs.map(x => ({
          id: x.id,
          ...x.data()
        })),
        relaxamento: relax.docs.map(x => ({
          id: x.id,
          ...x.data()
        }))
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente.id]);
  const ITENS = [{
    id: "humor",
    icone: "❤️",
    nome: "Check-in Diário",
    qtd: dados.humor.length,
    ultima: dados.humor.sort((a, b) => (b.data || "").localeCompare(a.data || ""))[0]?.data
  }, {
    id: "metas",
    icone: "🎯",
    nome: "Metas Terapêuticas",
    qtd: dados.metas.length,
    ultima: null
  }, {
    id: "diario",
    icone: "📔",
    nome: "Diário Terapêutico",
    qtd: dados.diario.length,
    ultima: dados.diario.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0]?.data
  }];
  const DESC = {
    humor: "Registro diário da escala de humor do paciente.",
    diario: "Espaço de escrita reflexiva livre, como um diário terapêutico.",
    metas: "Metas terapêuticas com acompanhamento de progresso.",
    reflexoes: "Exercícios de reestruturação cognitiva e insight.",
    tcc: "Registro ABC de pensamentos automáticos — Modelo TCC.",
    respiracao: "Exercício de respiração diafragmática 4-7-8 para regulação emocional.",
    relaxamento: "Técnica de relaxamento muscular progressivo de Jacobson."
  };
  return React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      marginBottom: 4
    }
  }, "M\xF3dulo 1 \u2014 Dashboard"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Ferramentas b\xE1sicas do dia a dia de ", paciente.nome.split(" ")[0]), loading ? React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 32,
      color: "var(--text-muted)"
    }
  }, "Carregando...") : React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
      gap: 14
    }
  }, ITENS.map(item => React.createElement("div", {
    key: item.id,
    style: {
      background: "white",
      border: "1px solid var(--gray-100)",
      borderRadius: 14,
      padding: 18,
      boxShadow: "0 2px 8px rgba(123,0,196,0.05)",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      flexShrink: 0
    }
  }, item.icone), React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      lineHeight: 1.3
    }
  }, item.nome)), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 700,
      color: "var(--purple)"
    }
  }, item.qtd), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      textAlign: "right"
    }
  }, item.qtd === 0 ? "Sem registros" : `registro${item.qtd !== 1 ? "s" : ""}`, item.ultima && React.createElement("div", {
    style: {
      marginTop: 2
    }
  }, "\xDAltimo: ", new Date(item.ultima + "T00:00:00").toLocaleDateString("pt-BR")))), React.createElement("button", {
    onClick: () => setPreview(item.id),
    style: {
      width: "100%",
      padding: "7px",
      borderRadius: 8,
      border: "1px solid var(--purple)",
      background: "white",
      color: "var(--purple)",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 5
    }
  }, React.createElement(Icon, {
    name: "eye",
    size: 13
  }), " Visualizar")))), preview && (() => {
    const item = ITENS.find(i => i.id === preview);
    const TAB_MAP = {
      humor: "humor",
      diario: "diario",
      metas: "metas",
      reflexoes: "reflexoes",
      tcc: "tcc",
      respiracao: "ferramentas",
      relaxamento: "ferramentas"
    };
    const tab = TAB_MAP[preview] || "painel";
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/?preview=${tab}&email=${encodeURIComponent(paciente.email || "")}&senha=${encodeURIComponent(paciente.senha || "1234")}`;
    return React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      },
      onClick: () => setPreview(null)
    }, React.createElement("div", {
      style: {
        background: "white",
        borderRadius: 16,
        width: "100%",
        maxWidth: 900,
        height: "85vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)"
      },
      onClick: e => e.stopPropagation()
    }, React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,#7B00C4,#5a0090)",
        borderRadius: "16px 16px 0 0",
        padding: "14px 20px",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, React.createElement("span", {
      style: {
        fontSize: 22
      }
    }, item?.icone), React.createElement("div", null, React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 15
      }
    }, item?.nome), React.createElement("div", {
      style: {
        fontSize: 11,
        opacity: 0.8
      }
    }, "\uD83D\uDC41 Pr\xE9via \u2014 vis\xE3o de ", paciente.nome.split(" ")[0]))), React.createElement("button", {
      onClick: () => setPreview(null),
      style: {
        background: "rgba(255,255,255,0.2)",
        border: "none",
        borderRadius: 8,
        padding: "6px 14px",
        color: "white",
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "inherit"
      }
    }, "\u2715 Fechar")), React.createElement("iframe", {
      src: `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/`,
      style: {
        flex: 1,
        border: "none",
        borderRadius: "0 0 16px 16px"
      },
      title: "Pr\xE9via do portal do paciente"
    })));
  })());
}
function AbaMetas({
  paciente
}) {
  const [metas, setMetas] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    titulo: "",
    categoria: "Emocional",
    progresso: 0,
    status: "ativa"
  });
  useEffect(() => {
    const unsub = db.collection("clinica_metas").where("pacienteId", "==", paciente.id).onSnapshot(snap => {
      setMetas(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    }, () => {});
    return unsub;
  }, [paciente.id]);
  function abrirNova() {
    setEditando(null);
    setForm({
      titulo: "",
      categoria: "Emocional",
      progresso: 0,
      status: "ativa"
    });
    setModal(true);
  }
  function abrirEdicao(m) {
    setEditando(m.id);
    setForm({
      titulo: m.titulo || "",
      categoria: m.categoria || "Emocional",
      progresso: m.progresso || 0,
      status: m.status || "ativa"
    });
    setModal(true);
  }
  async function salvar() {
    if (!form.titulo) {
      alert("Titulo obrigatorio.");
      return;
    }
    if (editando) {
      await db.collection("clinica_metas").doc(editando).update({
        titulo: form.titulo,
        categoria: form.categoria,
        progresso: Number(form.progresso) || 0,
        status: form.status,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await db.collection("clinica_metas").add({
        titulo: form.titulo,
        categoria: form.categoria,
        progresso: Number(form.progresso) || 0,
        status: form.status,
        pacienteId: paciente.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    setModal(false);
    setEditando(null);
    setForm({
      titulo: "",
      categoria: "Emocional",
      progresso: 0,
      status: "ativa"
    });
  }
  async function excluir(id) {
    if (!confirm("Excluir meta?")) return;
    await db.collection("clinica_metas").doc(id).delete();
  }
  async function atualizarProgresso(id, val) {
    await db.collection("clinica_metas").doc(id).update({
      progresso: val
    });
  }
  return React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Metas Terapeuticas"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: abrirNova
  }, React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Nova Meta")), metas.length === 0 ? React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, React.createElement(Icon, {
    name: "target",
    size: 40
  }), React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, "Nenhuma meta cadastrada.")) : React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, metas.map(m => React.createElement("div", {
    key: m.id,
    className: "card",
    style: m.status === "concluida" ? {
      border: "1.5px solid #059669",
      background: "#f0fdf4"
    } : m.status === "arquivada" ? {
      opacity: 0.55
    } : {}
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, m.titulo), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 4,
      alignItems: "center"
    }
  }, React.createElement("span", {
    className: "badge badge-purple"
  }, m.categoria), m.status === "concluida" && React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#059669",
      background: "#d1fae5",
      borderRadius: 20,
      padding: "2px 8px"
    }
  }, "Conclu\xEDda"), m.status === "arquivada" && React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#6b7280",
      background: "#f3f4f6",
      borderRadius: 20,
      padding: "2px 8px"
    }
  }, "Arquivada"), m.atualizadoPor === "paciente" && React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--purple)"
    }
  }, "\u270B atualizada pelo paciente"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      flexShrink: 0
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px"
    },
    title: "Editar meta",
    onClick: () => abrirEdicao(m)
  }, React.createElement(Icon, {
    name: "pencil",
    size: 14
  })), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px"
    },
    title: "Excluir meta",
    onClick: () => excluir(m.id)
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 14
  })))), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--gray-100)",
      borderRadius: 20,
      height: 8,
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      width: (m.progresso || 0) + "%",
      height: "100%",
      background: "var(--purple)",
      borderRadius: 20
    }
  })), React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--purple)",
      minWidth: 36
    }
  }, m.progresso || 0, "%")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 10
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "4px 10px"
    },
    onClick: () => atualizarProgresso(m.id, Math.max(0, (m.progresso || 0) - 10))
  }, "-10%"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "4px 10px"
    },
    onClick: () => atualizarProgresso(m.id, Math.min(100, (m.progresso || 0) + 10))
  }, "+10%"))))), modal && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 440
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 20
    }
  }, editando ? "Editar Meta" : "Nova Meta"), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Titulo da Meta"), React.createElement("input", {
    className: "form-input",
    value: form.titulo,
    onChange: e => setForm({
      ...form,
      titulo: e.target.value
    }),
    placeholder: "Ex: Praticar mindfulness diariamente"
  })), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Categoria"), React.createElement("select", {
    className: "form-input",
    value: form.categoria,
    onChange: e => setForm({
      ...form,
      categoria: e.target.value
    })
  }, ["Emocional", "Saude", "Pessoal", "Profissional", "Relacionamento", "Outro"].map(c => React.createElement("option", {
    key: c
  }, c)))), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Progresso: ", React.createElement("strong", {
    style: {
      color: "var(--purple)"
    }
  }, form.progresso, "%")), React.createElement("input", {
    type: "range",
    min: 0,
    max: 100,
    step: 5,
    value: form.progresso,
    onChange: e => setForm({
      ...form,
      progresso: +e.target.value
    }),
    style: {
      width: "100%",
      accentColor: "var(--purple)"
    }
  })), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Status"), React.createElement("select", {
    className: "form-input",
    value: form.status,
    onChange: e => setForm({
      ...form,
      status: e.target.value
    })
  }, React.createElement("option", {
    value: "ativa"
  }, "Ativa (vis\xEDvel para o paciente)"), React.createElement("option", {
    value: "concluida"
  }, "Conclu\xEDda (vis\xEDvel, marcada como alcan\xE7ada)"), React.createElement("option", {
    value: "arquivada"
  }, "Arquivada (oculta do paciente)"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal(false)
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar
  }, editando ? "Salvar alterações" : "Salvar")))));
}
function AbaEvolucao({
  paciente
}) {
  const [humor, setHumor] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [metas, setMetas] = useState([]);
  const [sessoes, setSessoes] = useState(0);
  const [tcc, setTcc] = useState([]);
  const [diario, setDiario] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [reflexoes, setReflexoes] = useState([]);
  const [reflexaoAberta, setReflexaoAberta] = useState(null);
  const [tccAberto, setTccAberto] = useState(null);
  useEffect(() => {
    const u1 = db.collection("clinica_humor").where("pacienteId", "==", paciente.id).onSnapshot(snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => {
        const da = a.data || "";
        const db2 = b.data || "";
        return da < db2 ? 1 : da > db2 ? -1 : 0;
      });
      setHumor(docs.slice(0, 30));
    }, () => {});
    const u2 = db.collection("clinica_atividades").where("pacienteId", "==", paciente.id).onSnapshot(snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setAtividades(docs);
    }, () => {});
    const u3 = db.collection("clinica_metas").where("pacienteId", "==", paciente.id).where("status", "==", "ativa").onSnapshot(snap => setMetas(snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    const u4 = db.collection("clinica_sessoes").where("pacienteId", "==", paciente.id).onSnapshot(snap => setSessoes(snap.size), () => {});
    const u5 = db.collection("clinica_tcc").where("pacienteId", "==", paciente.id).onSnapshot(snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setTcc(docs);
    }, () => {});
    const u6 = db.collection("clinica_diario").where("pacienteId", "==", paciente.id).onSnapshot(snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setDiario(docs);
    }, () => {});
    const u7 = db.collection("clinica_recurso_acessos").where("pacienteId", "==", paciente.id).onSnapshot(snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setAcessos(docs.slice(0, 40));
    }, () => {});
    const u8 = db.collection("clinica_reflexoes").where("pacienteId", "==", paciente.id).onSnapshot(snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setReflexoes(docs);
    }, () => {});
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
      u8();
    };
  }, [paciente.id]);
  const media = humor.length ? (humor.reduce((a, h) => a + (h.valor || 0), 0) / humor.length).toFixed(1) : "—";
  return React.createElement("div", null, React.createElement("div", {
    className: "metrics-grid",
    style: {
      marginBottom: 20
    }
  }, [{
    label: "Sessoes registradas",
    value: sessoes,
    icon: "calendar"
  }, {
    label: "Registros TCC",
    value: tcc.length,
    icon: "brain"
  }, {
    label: "Entradas no diario",
    value: diario.length,
    icon: "book-open"
  }, {
    label: "Metas ativas",
    value: metas.length,
    icon: "target"
  }].map(m => React.createElement("div", {
    key: m.label,
    className: "metric-card"
  }, React.createElement("div", {
    className: "metric-icon"
  }, React.createElement(Icon, {
    name: m.icon,
    size: 20
  })), React.createElement("div", {
    className: "metric-label"
  }, m.label), React.createElement("div", {
    className: "metric-value"
  }, m.value)))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 16,
      display: "flex",
      justifyContent: "space-between"
    }
  }, React.createElement("span", null, "Evolucao do Humor"), humor.length > 0 && React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Media: ", React.createElement("strong", {
    style: {
      color: "var(--purple)"
    }
  }, media, "/10"))), humor.length === 0 ? React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 40,
      color: "var(--text-muted)"
    }
  }, React.createElement(Icon, {
    name: "heart",
    size: 40
  }), React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, "Sem dados de humor para este paciente.")) : humor.slice(0, 10).map(h => React.createElement("div", {
    key: h.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 0",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--purple)",
      minWidth: 40
    }
  }, h.valor, "/10"), React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--gray-100)",
      borderRadius: 20,
      height: 6
    }
  }, React.createElement("div", {
    style: {
      width: h.valor / 10 * 100 + "%",
      height: "100%",
      background: "var(--purple)",
      borderRadius: 20
    }
  })), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, h.data)))), atividades.length > 0 && React.createElement("div", {
    className: "card",
    style: {
      marginTop: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 16,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, React.createElement("span", null, "\uD83E\uDDD8 Atividades de Relaxamento"), React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, atividades.length, " registro(s)")), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, atividades.slice(0, 10).map(a => React.createElement("div", {
    key: a.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid var(--gray-100)",
      background: "#fafafa"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 24
    }
  }, a.ferramenta === "respiracao" ? "🫁" : "💆"), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      textTransform: "capitalize"
    }
  }, a.ferramenta === "respiracao" ? "Respiração 4-7-8" : "Relaxamento Muscular"), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, a.data, " \xE0s ", a.hora)), React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: a.nota >= 7 ? "#16a34a" : a.nota >= 4 ? "#d97706" : "#dc2626"
    }
  }, a.nota, "/10"), React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)"
    }
  }, "relaxamento")))))), React.createElement("div", {
    className: "card",
    style: {
      marginTop: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 4,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, React.createElement("span", null, "\uD83D\uDCCA Uso de Recursos Terap\xEAuticos"), React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, acessos.length, " registro(s)")), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 14
    }
  }, "Cada vez que o paciente abre um recurso ou salva um exerc\xEDcio, aparece aqui."), acessos.length === 0 ? React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 30,
      color: "var(--text-muted)"
    }
  }, React.createElement(Icon, {
    name: "mouse-pointer-click",
    size: 36
  }), React.createElement("div", {
    style: {
      marginTop: 10,
      fontSize: 13
    }
  }, "Nenhum acesso registrado ainda.")) : React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      maxHeight: 420,
      overflowY: "auto"
    }
  }, acessos.map(a => React.createElement("div", {
    key: a.id,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "9px 12px",
      borderRadius: 10,
      border: "1px solid var(--gray-100)",
      background: a.tipo === "salvou" ? "#f0fdf4" : "#fafafa"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 20,
      padding: "3px 9px",
      flexShrink: 0,
      marginTop: 1,
      background: a.tipo === "salvou" ? "#d1fae5" : a.tipo === "concluiu" ? "#dbeafe" : "#ede9fe",
      color: a.tipo === "salvou" ? "#059669" : a.tipo === "concluiu" ? "#1d4ed8" : "var(--purple)"
    }
  }, a.tipo === "salvou" ? "💾 Salvou" : a.tipo === "concluiu" ? "✅ Concluiu" : "👁 Abriu"), React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, a.recursoTitulo || "Recurso"), a.detalhe && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#4b5563",
      marginTop: 2,
      lineHeight: 1.5,
      wordBreak: "break-word"
    }
  }, a.detalhe)), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      flexShrink: 0,
      textAlign: "right"
    }
  }, a.data, React.createElement("br", null), a.hora))))), tcc.length > 0 && React.createElement("div", {
    className: "card",
    style: {
      marginTop: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 14,
      display: "flex",
      justifyContent: "space-between"
    }
  }, React.createElement("span", null, "\uD83E\uDDE0 Registros TCC \u2014 Pensamentos Guiados"), React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, tcc.length, " registro(s)")), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, tcc.slice(0, 15).map(t => React.createElement("div", {
    key: t.id,
    style: {
      border: "1px solid var(--gray-100)",
      borderRadius: 10,
      overflow: "hidden"
    }
  }, React.createElement("div", {
    onClick: () => setTccAberto(tccAberto === t.id ? null : t.id),
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 14px",
      cursor: "pointer",
      background: tccAberto === t.id ? "var(--purple-soft,#f3e8ff)" : "#fafafa"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "Registro de ", t.data || "—"), React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--purple)",
      fontWeight: 600
    }
  }, tccAberto === t.id ? "▲ Fechar" : "▼ Ver respostas")), tccAberto === t.id && React.createElement("div", {
    style: {
      padding: "12px 14px",
      background: "white"
    }
  }, (t.registros || []).map((r, i) => React.createElement("div", {
    key: i,
    style: {
      marginBottom: i < (t.registros || []).length - 1 ? 12 : 0
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--purple)",
      marginBottom: 3
    }
  }, i + 1, ". ", r.pergunta), React.createElement("div", {
    style: {
      fontSize: 13,
      color: r.resposta ? "#1f2937" : "#9ca3af",
      lineHeight: 1.6,
      paddingLeft: 14,
      borderLeft: "3px solid var(--purple-soft,#f3e8ff)"
    }
  }, r.resposta || "— sem resposta —")))))))), reflexoes.length > 0 && React.createElement("div", {
    className: "card",
    style: {
      marginTop: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 14,
      display: "flex",
      justifyContent: "space-between"
    }
  }, React.createElement("span", null, "\uD83D\uDCAD Reflex\xF5es Salvas \u2014 F\xE1bulas e Psicoeduca\xE7\xF5es"), React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, reflexoes.length, " registro(s)")), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, reflexoes.slice(0, 15).map(r => {
    const titulo = r.origemTitulo || r.psicoeducacaoTitulo || "Reflexão";
    const tipoBadge = r.origem === "fabula" ? "📖 Fábula" : "🎓 Psicoeducação";
    return React.createElement("div", {
      key: r.id,
      style: {
        border: "1px solid var(--gray-100)",
        borderRadius: 10,
        overflow: "hidden"
      }
    }, React.createElement("div", {
      onClick: () => setReflexaoAberta(reflexaoAberta === r.id ? null : r.id),
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        cursor: "pointer",
        gap: 10,
        background: reflexaoAberta === r.id ? "var(--purple-soft,#f3e8ff)" : "#fafafa"
      }
    }, React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, titulo), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, tipoBadge, " \xB7 ", r.data || "—")), React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--purple)",
        fontWeight: 600,
        flexShrink: 0
      }
    }, reflexaoAberta === r.id ? "▲ Fechar" : "▼ Ver respostas")), reflexaoAberta === r.id && React.createElement("div", {
      style: {
        padding: "12px 14px",
        background: "white"
      }
    }, (r.registros || []).map((reg, i) => React.createElement("div", {
      key: i,
      style: {
        marginBottom: i < (r.registros || []).length - 1 ? 12 : 0
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--purple)",
        marginBottom: 3
      }
    }, i + 1, ". ", reg.pergunta), React.createElement("div", {
      style: {
        fontSize: 13,
        color: reg.resposta ? "#1f2937" : "#9ca3af",
        lineHeight: 1.6,
        paddingLeft: 14,
        borderLeft: "3px solid var(--purple-soft,#f3e8ff)"
      }
    }, reg.resposta || "— sem resposta —")))));
  }))), diario.length > 0 && React.createElement("div", {
    className: "card",
    style: {
      marginTop: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 14,
      display: "flex",
      justifyContent: "space-between"
    }
  }, React.createElement("span", null, "\uD83D\uDCD3 Di\xE1rio Terap\xEAutico"), React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, diario.length, " entrada(s)")), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      maxHeight: 360,
      overflowY: "auto"
    }
  }, diario.slice(0, 15).map(d => React.createElement("div", {
    key: d.id,
    style: {
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid var(--gray-100)",
      background: "#fafafa"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 4
    }
  }, React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "var(--purple)",
      background: "var(--purple-soft,#f3e8ff)",
      borderRadius: 20,
      padding: "2px 8px",
      textTransform: "capitalize"
    }
  }, d.tag || "geral"), React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, d.data, " ", d.hora ? "às " + d.hora : "")), React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.6,
      color: "#1f2937",
      whiteSpace: "pre-wrap"
    }
  }, d.texto))))));
}
const INVENTARIO_CATS_C = [{
  label: "Comunicação Eficaz",
  cor: "#6366f1",
  questoes: [2, 5, 11, 12, 13, 19, 20]
}, {
  label: "Resolução de Conflitos",
  cor: "#f59e0b",
  questoes: [4, 8, 14, 18, 23, 28, 31]
}, {
  label: "Intimidade Emocional",
  cor: "#ec4899",
  questoes: [7, 10, 17, 22, 24, 29, 35]
}, {
  label: "Satisfação Sexual",
  cor: "#dc2626",
  questoes: [3, 6, 9, 15, 21, 25, 27]
}, {
  label: "Cooperação e Colaboração",
  cor: "#16a34a",
  questoes: [1, 16, 26, 37, 38, 39, 41]
}, {
  label: "Senso de Humor e Lazer",
  cor: "#0891b2",
  questoes: [30, 32, 33, 34, 36, 40, 42]
}];
const RODA_DIMENSOES_C = ["Comunicação", "Família", "Sexualidade", "Estresse e Pressão", "Divisão", "Ciúmes", "Espiritualidade", "Diferenças e Conflitos", "Estabilidade Financeira", "Rel. de Poder", "Mudanças", "Expectativas e Equilíbrio"];
function calcularInventario(resp) {
  return INVENTARIO_CATS_C.map(cat => {
    const soma = cat.questoes.reduce((a, q) => a + (resp[q] || 0), 0);
    return {
      ...cat,
      soma,
      pct: Math.max(0, Math.round((soma - 7) / 28 * 100))
    };
  });
}
function BlocoInventario({
  docPaciente,
  docParceiro,
  nomePac,
  nomePar
}) {
  const [verBrutos, setVerBrutos] = useState(false);
  if (!docPaciente && !docParceiro) return React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Nenhum preencheu ainda.");
  const resPac = docPaciente?.respostas || {};
  const resPar = docParceiro?.respostas || {};
  const catsPac = docPaciente ? calcularInventario(resPac) : null;
  const catsPar = docParceiro ? calcularInventario(resPar) : null;
  const base = catsPac || catsPar;
  const fortes = [...base].sort((a, b) => b.soma - a.soma).slice(0, 2);
  const fracos = [...base].sort((a, b) => a.soma - b.soma).slice(0, 2);
  const ESCALA = ["", "Nunca/Raramente", "Às vezes", "Frequentemente", "Sempre/Quase sempre"];
  return React.createElement("div", null, React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      fontSize: 12,
      marginBottom: 10,
      flexWrap: "wrap"
    }
  }, docPaciente && React.createElement("span", null, React.createElement("span", {
    style: {
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "#7B00C4",
      marginRight: 4
    }
  }), nomePac, " (", docPaciente.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—", ")"), docParceiro && React.createElement("span", null, React.createElement("span", {
    style: {
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "#ec4899",
      marginRight: 4
    }
  }), nomePar, " (", docParceiro.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—", ")")), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, INVENTARIO_CATS_C.map((cat, i) => {
    const vPac = catsPac?.[i];
    const vPar = catsPar?.[i];
    return React.createElement("div", {
      key: cat.label
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 6
      }
    }, React.createElement("span", {
      style: {
        color: cat.cor
      }
    }, cat.label)), vPac && React.createElement("div", {
      style: {
        marginBottom: 4
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#7B00C4",
        minWidth: 14,
        fontWeight: 600
      }
    }, "\uD83D\uDFE3"), React.createElement("div", {
      style: {
        flex: 1,
        background: "#f3f4f6",
        borderRadius: 20,
        height: 10,
        overflow: "hidden"
      }
    }, React.createElement("div", {
      style: {
        width: vPac.pct + "%",
        height: "100%",
        background: "#7B00C4",
        borderRadius: 20,
        transition: "width .5s"
      }
    })), React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#7B00C4",
        fontWeight: 700,
        minWidth: 36,
        textAlign: "right"
      }
    }, vPac.soma, "/35"))), vPar && React.createElement("div", {
      style: {
        marginBottom: 4
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#ec4899",
        minWidth: 14,
        fontWeight: 600
      }
    }, "\uD83E\uDE77"), React.createElement("div", {
      style: {
        flex: 1,
        background: "#f3f4f6",
        borderRadius: 20,
        height: 10,
        overflow: "hidden"
      }
    }, React.createElement("div", {
      style: {
        width: vPar.pct + "%",
        height: "100%",
        background: "#ec4899",
        borderRadius: 20,
        transition: "width .5s"
      }
    })), React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#ec4899",
        fontWeight: 700,
        minWidth: 36,
        textAlign: "right"
      }
    }, vPar.soma, "/35"))), React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 10,
        color: "var(--text-muted)",
        marginTop: 2,
        paddingLeft: 22
      }
    }, React.createElement("span", null, "Baixo (7)"), React.createElement("span", null, "Alto (35)")));
  }))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      background: "#f0fdf4",
      borderRadius: 10,
      padding: 12,
      border: "1px solid #86efac"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: "#16a34a",
      marginBottom: 8
    }
  }, "\uD83D\uDCAA Pontos Fortes"), fortes.map(c => React.createElement("div", {
    key: c.label,
    style: {
      fontSize: 12,
      color: "#15803d",
      marginBottom: 4
    }
  }, "\u25CF ", c.label, " ", React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, c.soma, "/35")))), React.createElement("div", {
    style: {
      background: "#fef2f2",
      borderRadius: 10,
      padding: 12,
      border: "1px solid #fca5a5"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: "#dc2626",
      marginBottom: 8
    }
  }, "\u26A0\uFE0F Pontos de Aten\xE7\xE3o"), fracos.map(c => React.createElement("div", {
    key: c.label,
    style: {
      fontSize: 12,
      color: "#b91c1c",
      marginBottom: 4
    }
  }, "\u25CF ", c.label, " ", React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, c.soma, "/35"))))), React.createElement("button", {
    onClick: () => setVerBrutos(v => !v),
    style: {
      background: "none",
      border: "1px solid var(--gray-200)",
      borderRadius: 8,
      padding: "6px 12px",
      fontSize: 12,
      cursor: "pointer",
      color: "var(--text-muted)",
      width: "100%"
    }
  }, verBrutos ? "▲ Ocultar respostas brutas" : "▼ Ver respostas brutas"), verBrutos && React.createElement("div", {
    style: {
      marginTop: 10,
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, Array.from({
    length: 42
  }, (_, i) => i + 1).map(n => React.createElement("div", {
    key: n,
    style: {
      display: "flex",
      gap: 8,
      fontSize: 12,
      padding: "4px 8px",
      background: n % 2 === 0 ? "#fafafa" : "white",
      borderRadius: 6
    }
  }, React.createElement("span", {
    style: {
      color: "var(--purple)",
      fontWeight: 600,
      minWidth: 22
    }
  }, n, "."), docPaciente && React.createElement("span", {
    style: {
      color: "#7B00C4",
      flex: 1
    }
  }, nomePac.split(" ")[0], ": ", ESCALA[resPac[n]] || "—"), docParceiro && React.createElement("span", {
    style: {
      color: "#ec4899",
      flex: 1
    }
  }, nomePar.split(" ")[0], ": ", ESCALA[resPar[n]] || "—")))));
}
function BlocoRodaVida({
  docPaciente,
  docParceiro,
  nomePac,
  nomePar
}) {
  const [verBrutos, setVerBrutos] = useState(false);
  if (!docPaciente && !docParceiro) return React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Nenhum preencheu ainda.");
  const vPac = docPaciente?.respostas || {};
  const vPar = docParceiro?.respostas || {};
  return React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginBottom: 12
    }
  }, RODA_DIMENSOES_C.map((dim, i) => {
    const kPac = vPac[dim];
    const kPar = vPar[dim];
    return React.createElement("div", {
      key: dim
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 3
      }
    }, React.createElement("span", null, dim), React.createElement("span", {
      style: {
        display: "flex",
        gap: 10
      }
    }, docPaciente && React.createElement("span", {
      style: {
        color: "#7B00C4"
      }
    }, kPac || 0, "/10"), docParceiro && React.createElement("span", {
      style: {
        color: "#ec4899"
      }
    }, kPar || 0, "/10"))), React.createElement("div", {
      style: {
        position: "relative",
        height: 8,
        borderRadius: 20,
        background: "#f3f4f6",
        overflow: "hidden"
      }
    }, docPaciente && React.createElement("div", {
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        height: "100%",
        width: (kPac || 0) * 10 + "%",
        background: "#7B00C4",
        borderRadius: 20,
        opacity: 0.85
      }
    }), docParceiro && React.createElement("div", {
      style: {
        position: "absolute",
        left: 0,
        top: 0,
        height: "100%",
        width: (kPar || 0) * 10 + "%",
        background: "#ec4899",
        borderRadius: 20,
        opacity: 0.5
      }
    })));
  })), React.createElement("button", {
    onClick: () => setVerBrutos(v => !v),
    style: {
      background: "none",
      border: "1px solid var(--gray-200)",
      borderRadius: 8,
      padding: "6px 12px",
      fontSize: 12,
      cursor: "pointer",
      color: "var(--text-muted)",
      width: "100%"
    }
  }, verBrutos ? "▲ Ocultar detalhes" : "▼ Ver detalhes completos"));
}
function BlocoTexto({
  docPaciente,
  docParceiro,
  nomePac,
  nomePar
}) {
  if (!docPaciente && !docParceiro) return React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Nenhum preencheu ainda.");
  const ESCALA = ["", "Nunca/Raramente", "Às vezes", "Frequentemente", "Sempre/Quase sempre"];
  function renderResp(resp) {
    if (!resp || typeof resp !== "object") return null;
    return Object.entries(resp).map(([k, v]) => React.createElement("div", {
      key: k,
      style: {
        padding: "6px 10px",
        background: "white",
        borderRadius: 7,
        border: "1px solid #f3f4f6",
        fontSize: 13,
        marginBottom: 4
      }
    }, React.createElement("span", {
      style: {
        fontWeight: 600,
        color: "var(--purple)",
        marginRight: 6
      }
    }, k, ":"), React.createElement("span", {
      style: {
        color: "var(--gray-700)"
      }
    }, typeof v === "number" ? ESCALA[v] || v : String(v))));
  }
  return React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: docPaciente && docParceiro ? "1fr 1fr" : "1fr",
      gap: 16
    }
  }, docPaciente && React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: "#7B00C4",
      marginBottom: 8
    }
  }, "\uD83D\uDFE3 ", nomePac, " (", docPaciente.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—", ")"), renderResp(docPaciente.respostas)), docParceiro && React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: "#ec4899",
      marginBottom: 8
    }
  }, "\uD83E\uDE77 ", nomePar, " (", docParceiro.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—", ")"), renderResp(docParceiro.respostas)));
}
function RespostasCasal({
  pacienteId,
  parceiroId,
  parceiro,
  nomePaciente
}) {
  const [respostas, setRespostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState("inventario-bem-estar");
  const ATIVIDADES = [{
    id: "inventario-bem-estar",
    titulo: "Inventário de Bem-Estar de Casais",
    emoji: "📊"
  }, {
    id: "roda-vida-relacionamento",
    titulo: "Roda da Vida do Relacionamento",
    emoji: "🎯"
  }, {
    id: "3-metas",
    titulo: "Nossas 3 Metas",
    emoji: "🏆"
  }, {
    id: "quem-sou",
    titulo: "Quem Eu Sou no Relacionamento",
    emoji: "🪞"
  }, {
    id: "o-que-quero",
    titulo: "O Que Eu Quero e Não Quero Mais",
    emoji: "✍️"
  }];
  const nomePac = nomePaciente?.split(" ")[0] || "Paciente";
  const nomePar = parceiro?.nome?.split(" ")[0] || "Parceiro(a)";
  useEffect(() => {
    if (!pacienteId || !parceiroId) {
      setLoading(false);
      return;
    }
    let r1 = [],
      r2 = [],
      n = 0;
    const done = () => {
      n++;
      if (n < 2) return;
      setRespostas([...r1, ...r2].sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0))));
      setLoading(false);
    };
    const u1 = db.collection("clinica_casais_respostas").where("pacienteId", "==", pacienteId).where("casalId", "==", parceiroId).onSnapshot(s => {
      r1 = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      done();
    }, () => {
      n++;
      setLoading(false);
    });
    const u2 = db.collection("clinica_casais_respostas").where("pacienteId", "==", parceiroId).where("casalId", "==", pacienteId).onSnapshot(s => {
      r2 = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      done();
    }, () => {
      n++;
      setLoading(false);
    });
    return () => {
      u1();
      u2();
    };
  }, [pacienteId, parceiroId]);
  if (loading) return React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      padding: "8px 0"
    }
  }, "Carregando...");
  if (respostas.length === 0) return React.createElement("div", {
    style: {
      background: "#f9fafb",
      borderRadius: 10,
      padding: 20,
      fontSize: 13,
      color: "var(--text-muted)",
      textAlign: "center"
    }
  }, "Nenhuma resposta registrada ainda.");
  function getDoc(atividadeId, autorId) {
    return respostas.find(r => r.atividadeId === atividadeId && r.pacienteId === autorId) || null;
  }
  return React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      fontSize: 12,
      marginBottom: 16,
      flexWrap: "wrap"
    }
  }, React.createElement("span", null, React.createElement("span", {
    style: {
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "#7B00C4",
      marginRight: 4
    }
  }), nomePac), React.createElement("span", null, React.createElement("span", {
    style: {
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "#ec4899",
      marginRight: 4
    }
  }), nomePar)), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, ATIVIDADES.map(atv => {
    const docPac = getDoc(atv.id, pacienteId);
    const docPar = getDoc(atv.id, parceiroId);
    const total = (docPac ? 1 : 0) + (docPar ? 1 : 0);
    if (total === 0) return null;
    const aberto = expandido === atv.id;
    return React.createElement("div", {
      key: atv.id,
      style: {
        border: "1px solid var(--gray-200)",
        borderRadius: 12,
        overflow: "hidden"
      }
    }, React.createElement("button", {
      onClick: () => setExpandido(aberto ? null : atv.id),
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px",
        background: aberto ? "#f5f3ff" : "white",
        border: "none",
        cursor: "pointer",
        textAlign: "left"
      }
    }, React.createElement("span", {
      style: {
        fontSize: 20
      }
    }, atv.emoji), React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14
      }
    }, atv.titulo), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, docPac && React.createElement("span", {
      style: {
        color: "#7B00C4",
        marginRight: 10
      }
    }, "\u2713 ", nomePac), docPar && React.createElement("span", {
      style: {
        color: "#ec4899"
      }
    }, "\u2713 ", nomePar), !docPac && React.createElement("span", {
      style: {
        color: "var(--gray-400)",
        marginRight: 10
      }
    }, "\u25CB ", nomePac), !docPar && React.createElement("span", {
      style: {
        color: "var(--gray-400)"
      }
    }, "\u25CB ", nomePar))), React.createElement(Icon, {
      name: aberto ? "chevron-up" : "chevron-down",
      size: 16
    })), aberto && React.createElement("div", {
      style: {
        padding: "16px",
        background: "#fafafa",
        borderTop: "1px solid var(--gray-100)"
      }
    }, atv.id === "inventario-bem-estar" && React.createElement(BlocoInventario, {
      docPaciente: docPac,
      docParceiro: docPar,
      nomePac: nomePac,
      nomePar: nomePar
    }), atv.id === "roda-vida-relacionamento" && React.createElement(BlocoRodaVida, {
      docPaciente: docPac,
      docParceiro: docPar,
      nomePac: nomePac,
      nomePar: nomePar
    }), (atv.id === "3-metas" || atv.id === "quem-sou" || atv.id === "o-que-quero") && React.createElement(BlocoTexto, {
      docPaciente: docPac,
      docParceiro: docPar,
      nomePac: nomePac,
      nomePar: nomePar
    })));
  })));
}
function AbaCasal({
  paciente,
  pacientes
}) {
  const [casalId, setCasalId] = useState(paciente.casalId || "");
  const [salvando, setSalvando] = useState(false);
  const parceiro = pacientes.find(p => p.id === paciente.casalId);
  const outros = pacientes.filter(p => p.id !== paciente.id && p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  async function vincular() {
    if (!casalId) {
      alert("Selecione o parceiro(a).");
      return;
    }
    if (casalId === paciente.id) {
      alert("Selecione um paciente diferente.");
      return;
    }
    setSalvando(true);
    try {
      const p2 = pacientes.find(p => p.id === casalId);
      const snapAntigo1 = await db.collection("clinica_casais").where("p1Id", "==", paciente.id).get();
      const snapAntigo2 = await db.collection("clinica_casais").where("p2Id", "==", paciente.id).get();
      const batch = db.batch();
      [...snapAntigo1.docs, ...snapAntigo2.docs].forEach(d => batch.delete(d.ref));
      await batch.commit();
      await db.collection("clinica_casais").add({
        p1Id: paciente.id,
        p1Nome: paciente.nome || "",
        p2Id: casalId,
        p2Nome: p2?.nome || "",
        nomeCasal: `${paciente.nome?.split(" ")[0] || ""} e ${p2?.nome?.split(" ")[0] || ""}`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection("clinica_pacientes").doc(paciente.id).update({
        casalId,
        modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
      });
      await db.collection("clinica_pacientes").doc(casalId).update({
        casalId: paciente.id,
        modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
      });
      alert("✓ Casal vinculado! Ambos terão acesso à Terapia de Casal no portal.");
    } catch (e) {
      alert("Erro ao vincular: " + e.message);
    }
    setSalvando(false);
  }
  async function desvincular() {
    if (!confirm("Desvincular casal?")) return;
    setSalvando(true);
    try {
      const parcId = paciente.casalId;
      await db.collection("clinica_pacientes").doc(paciente.id).update({
        casalId: ""
      });
      if (parcId) await db.collection("clinica_pacientes").doc(parcId).update({
        casalId: ""
      });
      const snap1 = await db.collection("clinica_casais").where("p1Id", "==", paciente.id).get();
      const snap2 = await db.collection("clinica_casais").where("p2Id", "==", paciente.id).get();
      const batch = db.batch();
      [...snap1.docs, ...snap2.docs].forEach(d => batch.delete(d.ref));
      await batch.commit();
      setCasalId("");
    } catch (e) {
      alert("Erro ao desvincular: " + e.message);
    }
    setSalvando(false);
  }
  return React.createElement("div", null, React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 16
    }
  }, React.createElement(Icon, {
    name: "heart",
    size: 18
  }), React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "V\xEDnculo de Casal")), paciente.casalId && parceiro ? React.createElement("div", null, React.createElement("div", {
    style: {
      background: "var(--purple-bg)",
      borderRadius: 10,
      padding: 16,
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Parceiro(a) vinculado(a):"), React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 16
    }
  }, parceiro.nome), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, parceiro.email)), React.createElement("button", {
    className: "btn btn-danger",
    onClick: desvincular,
    disabled: salvando
  }, React.createElement(Icon, {
    name: "x",
    size: 15
  }), " Desvincular casal")) : React.createElement("div", null, React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Este paciente nao esta vinculado a um casal em terapia."), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 16
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Selecionar Parceiro(a)"), React.createElement("select", {
    className: "form-input",
    value: casalId,
    onChange: e => setCasalId(e.target.value)
  }, React.createElement("option", {
    value: ""
  }, "Selecione um paciente..."), outros.map(p => React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.nome)))), React.createElement("button", {
    className: "btn btn-purple",
    onClick: vincular,
    disabled: salvando
  }, React.createElement(Icon, {
    name: "heart",
    size: 15
  }), " Associar como Casal"))), paciente.casalId && parceiro && React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 4
    }
  }, React.createElement(Icon, {
    name: "clipboard-list",
    size: 18
  }), React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Diagn\xF3stico e Atividades do Casal")), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Respostas preenchidas por ", paciente.nome.split(" ")[0], " e ", parceiro.nome.split(" ")[0], " no portal"), React.createElement(RespostasCasal, {
    pacienteId: paciente.id,
    parceiroId: paciente.casalId,
    parceiro: parceiro,
    nomePaciente: paciente.nome
  })));
}
function AbaOcupacional({
  paciente
}) {
  const EMITIDO_POR = {
    nome: "Dra. Lucia Kratz",
    crp: "CRP 09/20590"
  };
  const ASSINATURA_URL = "../Assinatura Lúcia Kratz.png";
  const formVazio = {
    tipoDocumento: "relatorio_nr1",
    dataInicio: "",
    dataFim: "",
    emAndamento: false,
    sessoesRealizadas: "",
    sessoesTotal: "",
    statusPrograma: "em_andamento",
    parecerTecnico: "",
    dataComparecimento: "",
    horaInicio: "",
    horaFim: "",
    obsDeclaracao: ""
  };
  const [form, setForm] = useState(formVazio);
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [ocup, setOcup] = useState({
    empresa: paciente.empresa || paciente.empresaContratante || "",
    setor: paciente.setor || "",
    cargo: paciente.cargo || ""
  });
  useEffect(() => {
    db.collection("clinica_documentos_nr1").where("pacienteId", "==", paciente.id).get().then(snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt && b.createdAt.seconds || 0) - (a.createdAt && a.createdAt.seconds || 0));
      setHistorico(docs);
      setLoadingHist(false);
    }).catch(() => setLoadingHist(false));
  }, [paciente.id]);
  const STATUS_LABELS = {
    em_andamento: "Em andamento (Acompanhamento contínuo)",
    concluido: "Concluído (Alta do programa ocupacional)",
    encaminhado: "Encaminhado para Especialista Externo",
    descontinuado: "Descontinuado (Faltas / Não adesão)"
  };
  const TIPO_LABELS = {
    relatorio_nr1: "Relatório de Atendimento Psicossocial (NR-1)",
    declaracao: "Declaração de Comparecimento"
  };
  const TIPO_DESC = {
    relatorio_nr1: "📊 Documento completo para a empresa: vigência do acompanhamento, sessões, status no programa e parecer técnico.",
    declaracao: "📄 Documento simples que atesta o comparecimento do colaborador em uma data e horário específicos."
  };
  const eDeclaracao = form.tipoDocumento === "declaracao";
  const fmtData = d => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
  function montarDoc() {
    return {
      pacienteId: paciente.id,
      pacienteNome: paciente.nome || "",
      empresaContratante: ocup.empresa || "",
      setor: ocup.setor || "",
      cargo: ocup.cargo || "",
      tipoDocumento: form.tipoDocumento,
      periodo: {
        dataInicio: form.dataInicio,
        dataFim: form.emAndamento ? "" : form.dataFim,
        emAndamento: form.emAndamento
      },
      sessoes: {
        realizadas: Number(form.sessoesRealizadas) || 0,
        total: Number(form.sessoesTotal) || 0
      },
      statusPrograma: form.statusPrograma,
      parecerTecnico: form.parecerTecnico,
      dataComparecimento: form.dataComparecimento,
      horaInicio: form.horaInicio,
      horaFim: form.horaFim,
      obsDeclaracao: form.obsDeclaracao,
      emitidoPor: EMITIDO_POR
    };
  }
  function visualizar() {
    if (eDeclaracao && !form.dataComparecimento) {
      alert("Informe a data do comparecimento.");
      return;
    }
    if (!eDeclaracao && !form.parecerTecnico) {
      alert("Preencha o Parecer Técnico antes de visualizar.");
      return;
    }
    setPreview({
      ...montarDoc(),
      _rascunho: true,
      createdAt: {
        seconds: Date.now() / 1000
      }
    });
  }
  async function salvarDefinitivo() {
    setSalvando(true);
    const doc = {
      ...montarDoc(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      const ref = await db.collection("clinica_documentos_nr1").add(doc);
      await db.collection("clinica_pacientes").doc(paciente.id).update({
        empresa: ocup.empresa || "",
        setor: ocup.setor || "",
        cargo: ocup.cargo || ""
      }).catch(() => {});
      const novoDoc = {
        id: ref.id,
        ...doc,
        createdAt: {
          seconds: Date.now() / 1000
        }
      };
      setHistorico(prev => [novoDoc, ...prev]);
      setPreview(novoDoc);
      setForm(formVazio);
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    }
    setSalvando(false);
  }
  function abrirPreview(doc) {
    setPreview(doc);
  }
  function imprimirPreview() {
    const conteudo = document.getElementById("nr1-preview-print");
    if (!conteudo) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>${TIPO_LABELS[preview?.tipoDocumento] || "Documento"} — ${preview?.pacienteNome || ""}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:40px;color:#1f2937;font-size:13px;line-height:1.6}
        img{max-height:70px}
        @media print{body{margin:20px}.no-print{display:none}}
      </style></head><body>
      ${conteudo.innerHTML}
      </body></html>
    `);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 600);
  }
  function BlocoAssinatura() {
    return React.createElement("div", {
      style: {
        borderTop: "1px solid #e5e7eb",
        paddingTop: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end"
      }
    }, React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, React.createElement("img", {
      src: ASSINATURA_URL,
      alt: "",
      style: {
        height: 64,
        objectFit: "contain",
        display: "block",
        margin: "0 auto -10px"
      },
      onError: e => e.target.style.display = "none"
    }), React.createElement("div", {
      style: {
        width: 230,
        borderBottom: "1.5px solid #1f2937",
        margin: "0 auto 8px"
      }
    }), React.createElement("div", {
      style: {
        display: "inline-block",
        border: "2px solid #7B00C4",
        borderRadius: 8,
        padding: "8px 20px",
        color: "#7B00C4"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 0.5
      }
    }, "Dra. Lucia Kratz"), React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600
      }
    }, "Psic\xF3loga \u2014 CRP 09/20590"), React.createElement("div", {
      style: {
        fontSize: 9.5,
        marginTop: 2
      }
    }, "Doutora em Psicologia \xB7 TCC \xB7 Musicoterapia \xB7 Neuromodula\xE7\xE3o"))));
  }
  if (preview) {
    const ehDecl = preview.tipoDocumento === "declaracao";
    const periodoStr = preview.periodo?.emAndamento ? `${fmtData(preview.periodo?.dataInicio)} — Em andamento` : `${fmtData(preview.periodo?.dataInicio)} a ${fmtData(preview.periodo?.dataFim)}`;
    const hojeExtenso = new Date().toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    return React.createElement("div", null, preview._rascunho && React.createElement("div", {
      style: {
        background: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 10,
        padding: "10px 16px",
        marginBottom: 14,
        fontSize: 13,
        color: "#78350f",
        fontWeight: 600
      }
    }, "\uD83D\uDC41 Pr\xE9-visualiza\xE7\xE3o \u2014 o documento ainda N\xC3O foi salvo. Confira tudo e clique em \"Salvar e Gerar PDF\"."), React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        marginBottom: 20,
        flexWrap: "wrap"
      }
    }, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => setPreview(null)
    }, React.createElement(Icon, {
      name: "arrow-left",
      size: 15
    }), " ", preview._rascunho ? "Voltar e editar" : "Voltar"), preview._rascunho ? React.createElement("button", {
      className: "btn btn-purple",
      onClick: salvarDefinitivo,
      disabled: salvando
    }, React.createElement(Icon, {
      name: "save",
      size: 15
    }), " ", salvando ? "Salvando..." : "💾 Salvar e Gerar PDF") : React.createElement("button", {
      className: "btn btn-purple",
      onClick: imprimirPreview
    }, React.createElement(Icon, {
      name: "printer",
      size: 15
    }), " Imprimir / Salvar PDF")), React.createElement("div", {
      id: "nr1-preview-print",
      style: {
        background: "white",
        borderRadius: 16,
        border: "1px solid var(--gray-200)",
        padding: 32,
        maxWidth: 680
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: "2px solid #7B00C4"
      }
    }, React.createElement("div", null, React.createElement("div", {
      style: {
        fontFamily: "Dancing Script, cursive",
        fontSize: 26,
        color: "#7B00C4",
        fontWeight: 700
      }
    }, "Dra. Lucia Kratz"), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#6b7280"
      }
    }, "CRP 09/20590 \xB7 Psic\xF3loga \xB7 TCC \xB7 Musicoterapeuta \xB7 Neuromodula\xE7\xE3o"), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#6b7280"
      }
    }, "Goi\xE2nia, GO \u2014 luciakratz.com.br")), React.createElement("img", {
      src: "../logo-transparente.png",
      style: {
        height: 48,
        objectFit: "contain"
      },
      onError: e => e.target.style.display = "none"
    })), React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: 24
      }
    }, React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 700,
        color: "#1f2937",
        textTransform: "uppercase",
        letterSpacing: 1
      }
    }, TIPO_LABELS[preview.tipoDocumento] || preview.tipoDocumento), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#6b7280",
        marginTop: 4
      }
    }, "Emitido em ", preview.createdAt?.seconds ? new Date(preview.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR"))), ehDecl ? React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        fontSize: 14,
        lineHeight: 2,
        textAlign: "justify",
        margin: "28px 0",
        textIndent: 40
      }
    }, React.createElement("strong", null, "DECLARO"), ", para os devidos fins, que ", React.createElement("strong", null, preview.pacienteNome), preview.cargo ? `, ${preview.cargo}` : "", preview.empresaContratante ? React.createElement(React.Fragment, null, ", colaborador(a) da empresa ", React.createElement("strong", null, preview.empresaContratante)) : "", ", compareceu a atendimento psicol\xF3gico nesta cl\xEDnica no dia ", React.createElement("strong", null, fmtData(preview.dataComparecimento)), preview.horaInicio ? React.createElement(React.Fragment, null, ", no hor\xE1rio das ", React.createElement("strong", null, preview.horaInicio), preview.horaFim ? React.createElement(React.Fragment, null, " \xE0s ", React.createElement("strong", null, preview.horaFim)) : "") : "", "."), preview.obsDeclaracao && React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.8,
        textAlign: "justify",
        marginBottom: 20,
        textIndent: 40
      }
    }, preview.obsDeclaracao), React.createElement("div", {
      style: {
        fontSize: 13,
        margin: "28px 0 36px",
        textAlign: "right"
      }
    }, "Goi\xE2nia, ", hojeExtenso, ".")) : React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        marginBottom: 20
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#7B00C4",
        borderBottom: "1px solid #e9d5ff",
        paddingBottom: 4,
        marginBottom: 10,
        textTransform: "uppercase"
      }
    }, "Dados do Colaborador"), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 24px"
      }
    }, [["Nome", preview.pacienteNome], ["Empresa Contratante", preview.empresaContratante || "—"], ["Cargo", preview.cargo || "—"], ["Setor", preview.setor || "—"]].map(([l, v]) => React.createElement("div", {
      key: l
    }, React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#6b7280",
        fontWeight: 600,
        textTransform: "uppercase",
        marginBottom: 2
      }
    }, l), React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 13
      }
    }, v))))), React.createElement("div", {
      style: {
        marginBottom: 20
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#7B00C4",
        borderBottom: "1px solid #e9d5ff",
        paddingBottom: 4,
        marginBottom: 10,
        textTransform: "uppercase"
      }
    }, "Dados do Atendimento"), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 24px"
      }
    }, [["Vigência", periodoStr], ["Sessões Realizadas", `${preview.sessoes?.realizadas || 0} de ${preview.sessoes?.total || 0}`], ["Status no Programa", STATUS_LABELS[preview.statusPrograma] || preview.statusPrograma]].map(([l, v]) => React.createElement("div", {
      key: l,
      style: {
        gridColumn: l === "Status no Programa" ? "span 2" : "auto"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#6b7280",
        fontWeight: 600,
        textTransform: "uppercase",
        marginBottom: 2
      }
    }, l), React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 13
      }
    }, v))))), preview.parecerTecnico && React.createElement("div", {
      style: {
        marginBottom: 20
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#7B00C4",
        borderBottom: "1px solid #e9d5ff",
        paddingBottom: 4,
        marginBottom: 10,
        textTransform: "uppercase"
      }
    }, "Parecer T\xE9cnico"), React.createElement("div", {
      style: {
        background: "#f9f5ff",
        borderLeft: "3px solid #7B00C4",
        padding: "12px 16px",
        borderRadius: 4,
        fontSize: 13,
        lineHeight: 1.7,
        whiteSpace: "pre-wrap"
      }
    }, preview.parecerTecnico))), React.createElement("div", {
      style: {
        background: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 6,
        padding: "10px 14px",
        fontSize: 11,
        marginBottom: 24,
        color: "#78350f"
      }
    }, "\u2696\uFE0F Este documento foi elaborado em conformidade com a Resolu\xE7\xE3o CFP n\xBA 06/2019, preservando o sigilo profissional. N\xE3o cont\xE9m diagn\xF3sticos, CID, sintomas cl\xEDnicos ou informa\xE7\xF5es \xEDntimas do colaborador."), React.createElement(BlocoAssinatura, null)));
  }
  return React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement(Icon, {
    name: "briefcase",
    size: 18,
    style: {
      color: "var(--purple)"
    }
  })), React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15
    }
  }, "Sa\xFAde Ocupacional \u2014 NR-1"), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Relat\xF3rios e declara\xE7\xF5es para empresas contratantes"))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Tipo de Documento"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap"
    }
  }, Object.entries(TIPO_LABELS).map(([val, label]) => React.createElement("button", {
    key: val,
    onClick: () => setForm({
      ...form,
      tipoDocumento: val
    }),
    style: {
      padding: "8px 16px",
      borderRadius: 20,
      border: "1.5px solid",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)",
      transition: "all .2s",
      borderColor: form.tipoDocumento === val ? "var(--purple)" : "var(--gray-200)",
      background: form.tipoDocumento === val ? "var(--purple)" : "white",
      color: form.tipoDocumento === val ? "white" : "var(--gray-600)",
      fontWeight: form.tipoDocumento === val ? 600 : 400
    }
  }, label))), React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 12,
      color: "var(--purple)",
      background: "var(--purple-soft)",
      borderRadius: 8,
      padding: "8px 12px"
    }
  }, TIPO_DESC[form.tipoDocumento])), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Empresa Contratante"), React.createElement("input", {
    className: "form-input",
    value: ocup.empresa,
    onChange: e => setOcup({
      ...ocup,
      empresa: e.target.value
    }),
    placeholder: "Ex: Construtora Horizonte Ltda."
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Setor"), React.createElement("input", {
    className: "form-input",
    value: ocup.setor,
    onChange: e => setOcup({
      ...ocup,
      setor: e.target.value
    }),
    placeholder: "Ex: Administrativo"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Cargo"), React.createElement("input", {
    className: "form-input",
    value: ocup.cargo,
    onChange: e => setOcup({
      ...ocup,
      cargo: e.target.value
    }),
    placeholder: "Ex: Analista de RH"
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 3
    }
  }, "Gravados no cadastro do paciente ao salvar o documento.")), eDeclaracao ? React.createElement(React.Fragment, null, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data do Comparecimento"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: form.dataComparecimento,
    onChange: e => setForm({
      ...form,
      dataComparecimento: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Hor\xE1rio (in\xEDcio \u2014 t\xE9rmino)"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, React.createElement("input", {
    className: "form-input",
    type: "time",
    value: form.horaInicio,
    onChange: e => setForm({
      ...form,
      horaInicio: e.target.value
    })
  }), React.createElement("span", {
    style: {
      color: "var(--text-muted)"
    }
  }, "\u2014"), React.createElement("input", {
    className: "form-input",
    type: "time",
    value: form.horaFim,
    onChange: e => setForm({
      ...form,
      horaFim: e.target.value
    })
  }))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Observa\xE7\xE3o (opcional)"), React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: form.obsDeclaracao,
    onChange: e => setForm({
      ...form,
      obsDeclaracao: e.target.value
    }),
    placeholder: "Ex: O comparecimento integra programa de acompanhamento psicossocial vigente."
  }))) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data de In\xEDcio"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: form.dataInicio,
    onChange: e => setForm({
      ...form,
      dataInicio: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data de Fim"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: form.dataFim,
    disabled: form.emAndamento,
    onChange: e => setForm({
      ...form,
      dataFim: e.target.value
    }),
    style: form.emAndamento ? {
      background: "var(--gray-50)",
      color: "var(--text-muted)"
    } : {}
  }), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 6
    }
  }, React.createElement("input", {
    type: "checkbox",
    id: "emAndamento",
    checked: form.emAndamento,
    onChange: e => setForm({
      ...form,
      emAndamento: e.target.checked,
      dataFim: ""
    })
  }), React.createElement("label", {
    htmlFor: "emAndamento",
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      cursor: "pointer"
    }
  }, "Em andamento"))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Sess\xF5es Realizadas"), React.createElement("input", {
    className: "form-input",
    type: "number",
    min: "0",
    value: form.sessoesRealizadas,
    onChange: e => setForm({
      ...form,
      sessoesRealizadas: e.target.value
    }),
    placeholder: "Ex: 4"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Total Planejado"), React.createElement("input", {
    className: "form-input",
    type: "number",
    min: "0",
    value: form.sessoesTotal,
    onChange: e => setForm({
      ...form,
      sessoesTotal: e.target.value
    }),
    placeholder: "Ex: 8"
  })), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Status no Programa"), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginTop: 4
    }
  }, Object.entries(STATUS_LABELS).map(([val, label]) => React.createElement("label", {
    key: val,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      padding: "10px 14px",
      borderRadius: 8,
      border: "1.5px solid",
      transition: "all .2s",
      borderColor: form.statusPrograma === val ? "var(--purple)" : "var(--gray-200)",
      background: form.statusPrograma === val ? "var(--purple-soft)" : "white"
    }
  }, React.createElement("input", {
    type: "radio",
    name: "statusPrograma",
    value: val,
    checked: form.statusPrograma === val,
    onChange: () => setForm({
      ...form,
      statusPrograma: val
    })
  }), React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: form.statusPrograma === val ? 600 : 400,
      color: form.statusPrograma === val ? "var(--purple)" : "var(--gray-700)"
    }
  }, label))))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Parecer T\xE9cnico"), React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 6,
    value: form.parecerTecnico,
    onChange: e => setForm({
      ...form,
      parecerTecnico: e.target.value
    }),
    placeholder: "Foque em:\n• Capacidade laboral e funcionalidade no trabalho\n• Recomendações ergonômicas ou organizacionais\n• Necessidade de adaptações no posto de trabalho\n\nEvite: diagnósticos, CID, sintomas clínicos, informações íntimas."
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "\u2696\uFE0F Este campo deve seguir a Resolu\xE7\xE3o CFP n\xBA 06/2019 \u2014 foco em capacidade laboral, sem expor diagn\xF3sticos ou CID.")))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 16,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    className: "btn btn-purple",
    onClick: visualizar
  }, React.createElement(Icon, {
    name: "eye",
    size: 15
  }), " \uD83D\uDC41 Visualizar documento"), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      alignSelf: "center"
    }
  }, "Nada \xE9 salvo antes de voc\xEA conferir e aprovar."))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, React.createElement(Icon, {
    name: "history",
    size: 16
  }), " Hist\xF3rico de Documentos NR-1"), loadingHist ? React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 20,
      color: "var(--text-muted)"
    }
  }, "Carregando...") : historico.length === 0 ? React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 20,
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhum documento gerado ainda.") : React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, historico.map(doc => React.createElement("div", {
    key: doc.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 16px",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      background: "white"
    }
  }, React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: doc.tipoDocumento === "declaracao" ? "#ccfbf1" : "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, React.createElement(Icon, {
    name: doc.tipoDocumento === "declaracao" ? "badge-check" : "file-text",
    size: 16,
    style: {
      color: doc.tipoDocumento === "declaracao" ? "#0d9488" : "var(--purple)"
    }
  })), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 13
    }
  }, TIPO_LABELS[doc.tipoDocumento] || doc.tipoDocumento), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, doc.tipoDocumento === "declaracao" ? `Comparecimento em ${fmtData(doc.dataComparecimento)}${doc.horaInicio ? ` · ${doc.horaInicio}${doc.horaFim ? "–" + doc.horaFim : ""}` : ""}` : `${doc.periodo?.emAndamento ? `${fmtData(doc.periodo?.dataInicio)} — Em andamento` : `${fmtData(doc.periodo?.dataInicio)} a ${fmtData(doc.periodo?.dataFim)}`} · ${doc.sessoes?.realizadas || 0}/${doc.sessoes?.total || 0} sessões`)), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: "6px 12px",
      fontSize: 12
    },
    onClick: () => abrirPreview(doc)
  }, React.createElement(Icon, {
    name: "eye",
    size: 13
  }), " Ver"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "6px 12px",
      fontSize: 12
    },
    onClick: () => {
      abrirPreview(doc);
      setTimeout(imprimirPreview, 300);
    }
  }, React.createElement(Icon, {
    name: "printer",
    size: 13
  }))))))));
}
const FERRAMENTAS_LINK = [{
  id: "anamnese",
  nome: "Anamnese — Marcos do Desenvolvimento",
  emoji: "📋",
  desc: "Formulário completo de anamnese"
}, {
  id: "entrevista",
  nome: "Entrevista Clínica Inicial (DSM-5)",
  emoji: "🧠",
  desc: "Instrumento de avaliação clínica inicial"
}, {
  id: "arvore",
  nome: "Árvore da Decisão",
  emoji: "🌳",
  desc: "Técnica TCC para transformar preocupações"
}, {
  id: "ansiedade",
  nome: "Gestão da Ansiedade",
  emoji: "🎯",
  desc: "Tracking de estresse, humor e roda da vida"
}, {
  id: "alimentacao",
  nome: "Rastreamento Emocional da Alimentação",
  emoji: "🍎",
  desc: "Relação entre emoções e comportamento alimentar"
}, {
  id: "abc-record",
  nome: "Registro ABC de Pensamentos",
  emoji: "📝",
  desc: "Modelo de registro cognitivo TCC"
}, {
  id: "relaxamento",
  nome: "Relaxamento Muscular Progressivo",
  emoji: "💆",
  desc: "Técnica de Jacobson para tensão e ansiedade"
}];
function gerarToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 10).toUpperCase();
}
function AbaLinksPartilhados({
  paciente
}) {
  const BASE_URL = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";
  const [links, setLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState({});
  const [copiado, setCopiado] = useState({});
  useEffect(() => {
    db.collection("clinica_links_partilhados").where("pacienteId", "==", paciente.id).get().then(snap => {
      const mapa = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!mapa[data.tipoFerramenta] || (data.createdAt?.seconds || 0) > (mapa[data.tipoFerramenta]?.createdAt?.seconds || 0)) {
          mapa[data.tipoFerramenta] = {
            docId: d.id,
            ...data
          };
        }
      });
      setLinks(mapa);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente.id]);
  async function gerarLink(ferramenta) {
    setGerando(g => ({
      ...g,
      [ferramenta.id]: true
    }));
    const token = gerarToken();
    const doc = {
      token,
      pacienteId: paciente.id,
      pacienteNome: paciente.nome || "",
      tipoFerramenta: ferramenta.id,
      nomeFerramenta: ferramenta.nome,
      status: "pendente",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      if (links[ferramenta.id]?.docId) {
        await db.collection("clinica_links_partilhados").doc(links[ferramenta.id].docId).update({
          status: "substituido"
        });
      }
      const ref = await db.collection("clinica_links_partilhados").add(doc);
      setLinks(l => ({
        ...l,
        [ferramenta.id]: {
          docId: ref.id,
          token,
          status: "pendente",
          createdAt: {
            seconds: Date.now() / 1000
          },
          tipoFerramenta: ferramenta.id
        }
      }));
    } catch (e) {
      alert("Erro ao gerar link: " + e.message);
    }
    setGerando(g => ({
      ...g,
      [ferramenta.id]: false
    }));
  }
  function copiarLink(token) {
    const url = `${BASE_URL}/responder?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiado(c => ({
      ...c,
      [token]: true
    }));
    setTimeout(() => setCopiado(c => ({
      ...c,
      [token]: false
    })), 2000);
  }
  function enviarWhatsApp(ferramenta, token) {
    const url = `${BASE_URL}/responder?token=${token}`;
    const nome = paciente.nome?.split(" ")[0] || "paciente";
    const msg = `Olá, ${nome}! 😊\n\nSua psicóloga Dra. Lucia Kratz enviou um formulário para você preencher:\n\n📋 *${ferramenta.nome}*\n\nAcesse pelo link abaixo e responda com calma — suas respostas vão direto para o prontuário:\n${url}\n\nQualquer dúvida, estou por aqui!\n_Dra. Lucia Kratz · CRP 09/20590_`;
    window.open(`https://api.whatsapp.com/send?phone=55${(paciente.telefone || "").replace(/\D/g, "")}&text=${encodeURIComponent(msg)}`, "_blank");
  }
  const fmtDataHora = seconds => {
    if (!seconds) return "—";
    return new Date(seconds * 1000).toLocaleDateString("pt-BR");
  };
  const STATUS_CONFIG = {
    pendente: {
      label: "Pendente",
      cor: "#d97706",
      bg: "#fef3c7",
      icon: "clock"
    },
    respondido: {
      label: "Respondido",
      cor: "#059669",
      bg: "#d1fae5",
      icon: "check-circle"
    },
    substituido: {
      label: "Substituído",
      cor: "#6b7280",
      bg: "#f3f4f6",
      icon: "refresh-cw"
    }
  };
  return React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement(Icon, {
    name: "link",
    size: 18,
    style: {
      color: "var(--purple)"
    }
  })), React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15
    }
  }, "Links Compartilh\xE1veis"), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Envie ferramentas cl\xEDnicas diretamente para ", paciente.nome?.split(" ")[0] || "o paciente", " responder pelo celular"))), loading ? React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 24,
      color: "var(--text-muted)"
    }
  }, "Carregando...") : React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, FERRAMENTAS_LINK.map(ferramenta => {
    const linkAtual = links[ferramenta.id];
    const statusCfg = STATUS_CONFIG[linkAtual?.status] || null;
    const url = linkAtual ? `${BASE_URL}/responder?token=${linkAtual.token}` : null;
    return React.createElement("div", {
      key: ferramenta.id,
      style: {
        border: "1.5px solid",
        borderColor: linkAtual ? "var(--purple)" : "var(--gray-200)",
        borderRadius: 12,
        padding: "14px 16px",
        background: linkAtual ? "var(--purple-soft)" : "white",
        transition: "all .2s"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: linkAtual ? 12 : 0
      }
    }, React.createElement("div", {
      style: {
        fontSize: 24,
        flexShrink: 0
      }
    }, ferramenta.emoji), React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, ferramenta.nome), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)"
      }
    }, ferramenta.desc)), statusCfg && React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        background: statusCfg.bg,
        color: statusCfg.cor,
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0
      }
    }, React.createElement(Icon, {
      name: statusCfg.icon,
      size: 11
    }), statusCfg.label, linkAtual?.status === "respondido" && linkAtual?.respondidoEm && React.createElement("span", null, " em ", fmtDataHora(linkAtual.respondidoEm?.seconds))), React.createElement("button", {
      className: "btn btn-outline",
      style: {
        padding: "6px 12px",
        fontSize: 12,
        flexShrink: 0
      },
      onClick: () => gerarLink(ferramenta),
      disabled: gerando[ferramenta.id]
    }, React.createElement(Icon, {
      name: "link",
      size: 13
    }), gerando[ferramenta.id] ? "Gerando..." : linkAtual ? "Novo Link" : "Gerar Link")), linkAtual && linkAtual.status !== "substituido" && url && React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "white",
        border: "1px solid var(--gray-200)",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 10
      }
    }, React.createElement(Icon, {
      name: "link",
      size: 13,
      style: {
        color: "var(--text-muted)",
        flexShrink: 0
      }
    }), React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, url)), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
      }
    }, React.createElement("button", {
      className: "btn btn-outline",
      style: {
        padding: "7px 14px",
        fontSize: 12
      },
      onClick: () => copiarLink(linkAtual.token)
    }, React.createElement(Icon, {
      name: copiado[linkAtual.token] ? "check" : "copy",
      size: 13
    }), copiado[linkAtual.token] ? "Copiado!" : "Copiar Link"), React.createElement("button", {
      className: "btn btn-purple",
      style: {
        padding: "7px 14px",
        fontSize: 12
      },
      onClick: () => enviarWhatsApp(ferramenta, linkAtual.token)
    }, React.createElement(Icon, {
      name: "message-circle",
      size: 13
    }), " Enviar pelo WhatsApp"), React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color: "var(--text-muted)",
        marginLeft: "auto"
      }
    }, React.createElement(Icon, {
      name: "calendar",
      size: 11
    }), "Gerado em ", fmtDataHora(linkAtual.createdAt?.seconds)))));
  })), React.createElement("div", {
    style: {
      marginTop: 16,
      padding: "10px 14px",
      background: "#eff6ff",
      borderRadius: 8,
      fontSize: 11,
      color: "#1e40af",
      lineHeight: 1.6
    }
  }, "\uD83D\uDCA1 ", React.createElement("strong", null, "Como funciona:"), " O paciente recebe o link, acessa a ferramenta no celular, preenche e envia. As respostas entram automaticamente no prontu\xE1rio e o status muda para ", React.createElement("strong", null, "Respondido"), ". O link expira ap\xF3s ser respondido ou quando um novo link \xE9 gerado para a mesma ferramenta."));
}
function PerfilPaciente({
  paciente,
  onVoltar,
  pacientes,
  user
}) {
  const [aba, setAba] = useState("perfil");
  const isSecretaria = user?.tipo === "secretaria";
  const ABAS = [{
    id: "perfil",
    label: "Perfil",
    icon: "user"
  }, ...(!isSecretaria ? [{
    id: "modulos",
    label: "Modulos",
    icon: "toggle-right"
  }, {
    id: "modulo1",
    label: "Módulo 1",
    icon: "layout-grid"
  }, {
    id: "metas",
    label: "Metas",
    icon: "target"
  }, {
    id: "laudos",
    label: "Laudos",
    icon: "file-text"
  }, {
    id: "evolucao",
    label: "Evolucao",
    icon: "trending-up"
  }, {
    id: "casal",
    label: "Terapia de Casal",
    icon: "heart"
  }, {
    id: "nr1",
    label: "Saúde Ocupacional",
    icon: "briefcase"
  }, {
    id: "links",
    label: "Links Partilhados",
    icon: "link"
  }] : [])];
  return React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: onVoltar,
    style: {
      padding: "8px 12px"
    }
  }, React.createElement(Icon, {
    name: "arrow-left",
    size: 16
  })), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    className: "page-title",
    style: {
      fontSize: 24
    }
  }, paciente.nome), React.createElement("div", {
    className: "page-subtitle"
  }, "Perfil clinico completo")), React.createElement("button", {
    className: "btn btn-danger",
    onClick: async () => {
      if (!confirm("Excluir paciente?")) return;
      await db.collection("clinica_pacientes").doc(paciente.id).delete();
      onVoltar();
    }
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 15
  }), " Excluir paciente")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 24,
      overflowX: "auto",
      borderBottom: "1px solid var(--gray-200)",
      flexShrink: 0,
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none"
    }
  }, ABAS.map(a => React.createElement("button", {
    key: a.id,
    onClick: () => setAba(a.id),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "10px 16px",
      border: "none",
      background: "none",
      fontSize: 14,
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      color: aba === a.id ? "var(--purple)" : "var(--gray-600)",
      borderBottom: aba === a.id ? "2px solid var(--purple)" : "2px solid transparent",
      fontWeight: aba === a.id ? 500 : 400,
      transition: "all .2s",
      marginBottom: -1
    }
  }, React.createElement(Icon, {
    name: a.icon,
    size: 15
  }), a.label))), aba === "perfil" && React.createElement(AbaPerfil, {
    paciente: paciente,
    pacientes: pacientes
  }), aba === "modulos" && React.createElement(AbaModulos, {
    paciente: paciente
  }), aba === "modulo1" && React.createElement(AbaModulo1, {
    paciente: paciente
  }), aba === "metas" && React.createElement(AbaMetas, {
    paciente: paciente
  }), aba === "laudos" && React.createElement(EmBreve, {
    titulo: "Laudos",
    subtitulo: "Etapa 10"
  }), aba === "evolucao" && React.createElement(AbaEvolucao, {
    paciente: paciente
  }), aba === "casal" && React.createElement(AbaCasal, {
    paciente: paciente,
    pacientes: pacientes
  }), aba === "nr1" && React.createElement(AbaOcupacional, {
    paciente: paciente
  }), aba === "links" && React.createElement(AbaLinksPartilhados, {
    paciente: paciente
  }));
}
const MOD1_PADRAO = {
  mod1: {
    ativo: true,
    ferramentas: {
      humor: {
        ativo: true,
        dataInicio: new Date().toISOString().slice(0, 10)
      },
      metas: {
        ativo: true,
        dataInicio: new Date().toISOString().slice(0, 10)
      },
      diario: {
        ativo: true,
        dataInicio: new Date().toISOString().slice(0, 10)
      }
    }
  }
};
function Pacientes({
  user
}) {
  const {
    data: pacientes,
    loading
  } = useCollection("clinica_pacientes", "nome");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(false);
  const [modalImport, setModalImport] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(null);
  const [importLog, setImportLog] = useState([]);
  const [importando, setImportando] = useState(false);
  async function processarExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    setImportLog([{
      tipo: "info",
      msg: "Lendo arquivo..."
    }]);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const text = ev.target.result;
        const linhas = text.split(/\r?\n/).filter(l => l.trim());
        if (linhas.length < 2) {
          setImportLog([{
            tipo: "err",
            msg: "Arquivo vazio ou sem dados."
          }]);
          setImportando(false);
          return;
        }
        const header = linhas[0].split(/[,;\t]/).map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
        const idx = {
          nome: header.findIndex(h => h.includes("nome")),
          email: header.findIndex(h => h.includes("email") || h.includes("mail")),
          telefone: header.findIndex(h => h.includes("tel") || h.includes("fone") || h.includes("celular")),
          cpf: header.findIndex(h => h.includes("cpf") || h.includes("documento")),
          nasc: header.findIndex(h => h.includes("nasc") || h.includes("data")),
          genero: header.findIndex(h => h.includes("gen") || h.includes("sexo"))
        };
        const log = [];
        let ok = 0,
          err = 0;
        for (let i = 1; i < linhas.length; i++) {
          const cols = linhas[i].split(/[,;\t]/);
          const nome = idx.nome >= 0 ? cols[idx.nome]?.trim() : "";
          if (!nome) continue;
          try {
            const email = idx.email >= 0 ? cols[idx.email]?.trim() || `sem-email-${Date.now()}@interno.local` : `sem-email-${Date.now()}@interno.local`;
            await db.collection("clinica_pacientes").add({
              nome,
              email,
              telefone: idx.telefone >= 0 ? cols[idx.telefone]?.trim() || "" : "",
              cpf: idx.cpf >= 0 ? cols[idx.cpf]?.trim() || "" : "",
              dataNascimento: idx.nasc >= 0 ? cols[idx.nasc]?.trim() || "" : "",
              genero: idx.genero >= 0 ? cols[idx.genero]?.trim() || "Não informar" : "Não informar",
              status: "ativo",
              senha: "",
              objetivosTerapeuticos: "",
              observacoesClinicas: "",
              origem: "importacao-excel",
              modulosConfig: MOD1_PADRAO,
              modulosAtivos: ["mod1"],
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            ok++;
            log.push({
              tipo: "ok",
              msg: `✓ ${nome}`
            });
          } catch (er) {
            err++;
            log.push({
              tipo: "err",
              msg: `✗ ${nome}: ${er.message}`
            });
          }
        }
        log.unshift({
          tipo: "info",
          msg: `Concluído: ${ok} importados · ${err} erro(s)`
        });
        setImportLog(log);
      } catch (er) {
        setImportLog([{
          tipo: "err",
          msg: "Erro ao ler arquivo: " + er.message
        }]);
      } finally {
        setImportando(false);
      }
    };
    reader.readAsText(file, "UTF-8");
  }
  function baixarTemplate() {
    const csv = "Nome,Email,Telefone,CPF,DataNascimento,Genero\nJoão Silva,joao@email.com,(62) 99999-0000,000.000.000-00,01/01/1990,Masculino\n";
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-pacientes.csv";
    a.click();
  }
  if (perfilAberto) {
    const pac = pacientes.find(p => p.id === perfilAberto);
    if (pac) return React.createElement(PerfilPaciente, {
      paciente: pac,
      onVoltar: () => setPerfilAberto(null),
      pacientes: pacientes
    });
  }
  const filtrados = pacientes.filter(p => {
    const ok = filtro === "todos" || p.status === filtro;
    const bk = !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()) || p.email?.toLowerCase().includes(busca.toLowerCase());
    return ok && bk;
  }).sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  function abrirNovo() {
    setForm({
      nome: "",
      email: "",
      telefone: "",
      status: "ativo",
      genero: "",
      dataNasc: "",
      cpf: "",
      objetivos: ""
    });
    setModal(true);
  }
  async function salvar() {
    if (!form.nome || !form.email) {
      alert("Nome e e-mail obrigatorios.");
      return;
    }
    setSalvando(true);
    await db.collection("clinica_pacientes").add({
      ...form,
      senha: "1234",
      modulosConfig: MOD1_PADRAO,
      modulosAtivos: ["mod1"],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setModal(false);
    setSalvando(false);
  }
  if (loading) return React.createElement(Spinner, null);
  return React.createElement("div", null, React.createElement("div", {
    className: "page-header",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "page-title"
  }, "Pacientes"), React.createElement("div", {
    className: "page-subtitle"
  }, pacientes.filter(p => p.status === "ativo").length, " ativos \xB7 ", pacientes.filter(p => p.status === "alta").length, " com alta \xB7 ", pacientes.filter(p => p.status === "inativo").length, " inativos")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 13
    },
    onClick: () => setModalImport(true)
  }, React.createElement(Icon, {
    name: "upload",
    size: 15
  }), " Importar Excel"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 13
    },
    onClick: () => {
      const url = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/cadastro/";
      const texto = `🦋 *Clínica Dra. Lucia Kratz*\n\nOlá! Para agilizar o seu atendimento, preencha o formulário de cadastro pelo link abaixo:\n\n👉 ${url}\n\nÉ rápido e seguro. Após o preenchimento, seus dados já estarão disponíveis para a sua psicóloga.\n\nQualquer dúvida, estamos à disposição! 💜`;
      navigator.clipboard.writeText(texto).then(() => alert("✓ Texto + link copiado!\nCole direto no WhatsApp.")).catch(() => prompt("Copie o texto:", texto));
    }
  }, React.createElement(Icon, {
    name: "link",
    size: 15
  }), " Link de Cadastro"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: abrirNovo
  }, React.createElement(Icon, {
    name: "user-plus",
    size: 16
  }), " Novo Paciente"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginBottom: 20,
      flexWrap: "wrap"
    }
  }, React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1,
      minWidth: 200
    },
    placeholder: "Buscar por nome ou e-mail...",
    value: busca,
    onChange: e => setBusca(e.target.value)
  }), [["todos", "Todos"], ["ativo", "Em atendimento"], ["alta", "Alta"], ["inativo", "Inativos"]].map(([f, l]) => React.createElement("button", {
    key: f,
    className: "btn " + (filtro === f ? "btn-purple" : "btn-ghost"),
    onClick: () => setFiltro(f)
  }, l))), ["pendente", "ativo", "alta", "inativo"].map(st => {
    const grupo = filtrados.filter(p => p.status === st);
    if (grupo.length === 0) return null;
    return React.createElement("div", {
      key: st,
      style: {
        marginBottom: 24
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12
      }
    }, React.createElement("div", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: st === "ativo" ? "var(--success)" : st === "alta" ? "var(--gray-400)" : st === "pendente" ? "#f59e0b" : "var(--danger)"
      }
    }), React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.8px"
      }
    }, st === "ativo" ? "Em Atendimento" : st === "alta" ? "Alta" : st === "pendente" ? "⏳ Pendentes (Autocadastro)" : "Inativos", " (", grupo.length, ")")), React.createElement("div", {
      className: "card",
      style: {
        padding: 0
      }
    }, grupo.map(p => React.createElement("div", {
      key: p.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 20px",
        borderBottom: "1px solid var(--gray-100)",
        cursor: "pointer",
        transition: "background .15s"
      },
      onClick: () => setPerfilAberto(p.id),
      onMouseEnter: e => e.currentTarget.style.background = "#fafafa",
      onMouseLeave: e => e.currentTarget.style.background = "white"
    }, React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "var(--purple-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        color: "var(--purple)",
        flexShrink: 0
      }
    }, (p.nome || "?")[0].toUpperCase()), React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 500
      }
    }, p.nome), React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)"
      }
    }, p.email)), React.createElement(Icon, {
      name: "chevron-right",
      size: 16
    })))));
  }), filtrados.length === 0 && React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, "Nenhum paciente encontrado."), modal && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 560,
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, "Novo Paciente"), React.createElement("button", {
    onClick: () => setModal(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Nome completo"), React.createElement("input", {
    className: "form-input",
    value: form.nome || "",
    onChange: e => setForm({
      ...form,
      nome: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "E-mail"), React.createElement("input", {
    className: "form-input",
    type: "email",
    value: form.email || "",
    onChange: e => setForm({
      ...form,
      email: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Telefone"), React.createElement("input", {
    className: "form-input",
    value: form.telefone || "",
    onChange: e => setForm({
      ...form,
      telefone: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Genero"), React.createElement("select", {
    className: "form-input",
    value: form.genero || "",
    onChange: e => setForm({
      ...form,
      genero: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Selecione"), React.createElement("option", null, "Feminino"), React.createElement("option", null, "Masculino"), React.createElement("option", null, "Nao-binario"), React.createElement("option", null, "Nao informar"))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Status"), React.createElement("select", {
    className: "form-input",
    value: form.status || "ativo",
    onChange: e => setForm({
      ...form,
      status: e.target.value
    })
  }, React.createElement("option", {
    value: "ativo"
  }, "Ativo"), React.createElement("option", {
    value: "inativo"
  }, "Inativo"), React.createElement("option", {
    value: "alta"
  }, "Alta"))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "\uD83C\uDFE2 Empresa Contratante (opcional \u2014 NR-1)"), React.createElement("input", {
    className: "form-input",
    value: form.empresa || "",
    onChange: e => setForm({
      ...form,
      empresa: e.target.value
    }),
    placeholder: "Para colaboradores de empresas"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Setor"), React.createElement("input", {
    className: "form-input",
    value: form.setor || "",
    onChange: e => setForm({
      ...form,
      setor: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Cargo"), React.createElement("input", {
    className: "form-input",
    value: form.cargo || "",
    onChange: e => setForm({
      ...form,
      cargo: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Objetivos Terapeuticos"), React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: form.objetivos || "",
    onChange: e => setForm({
      ...form,
      objetivos: e.target.value
    }),
    placeholder: "Descreva os objetivos..."
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 20,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal(false)
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando
  }, salvando ? "Salvando..." : "Salvar")))), modalImport && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => {
      setModalImport(false);
      setImportLog([]);
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 520
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, "Importar Pacientes (Excel/CSV)"), React.createElement("button", {
    onClick: () => {
      setModalImport(false);
      setImportLog([]);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    style: {
      background: "#f9f5ff",
      border: "1px solid #e9d5ff",
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      fontSize: 13,
      lineHeight: 1.7
    }
  }, React.createElement("strong", null, "Colunas aceitas:"), " Nome, Email, Telefone, CPF, DataNascimento, Genero", React.createElement("br", null), React.createElement("strong", null, "Formatos:"), " .csv ou .txt com separador v\xEDrgula, ponto-e-v\xEDrgula ou tab", React.createElement("br", null), React.createElement("strong", null, "Encoding:"), " UTF-8"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 16
    }
  }, React.createElement("button", {
    className: "btn btn-outline",
    style: {
      flex: 1,
      fontSize: 13
    },
    onClick: baixarTemplate
  }, React.createElement(Icon, {
    name: "download",
    size: 14
  }), " Baixar template CSV"), React.createElement("label", {
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid var(--purple)",
      background: "var(--purple)",
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600
    }
  }, React.createElement(Icon, {
    name: "upload",
    size: 14
  }), " Selecionar arquivo", React.createElement("input", {
    type: "file",
    accept: ".csv,.txt,.xls,.xlsx",
    style: {
      display: "none"
    },
    onChange: processarExcel
  }))), importLog.length > 0 && React.createElement("div", {
    style: {
      background: "#f9fafb",
      borderRadius: 10,
      padding: 14,
      maxHeight: 240,
      overflowY: "auto",
      fontSize: 12,
      lineHeight: 2,
      border: "1px solid #e5e7eb"
    }
  }, importLog.map((l, i) => React.createElement("div", {
    key: i,
    style: {
      color: l.tipo === "ok" ? "#059669" : l.tipo === "err" ? "#dc2626" : "#7B00C4",
      fontWeight: l.tipo === "info" ? 600 : 400
    }
  }, l.msg))), importando && React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 12,
      color: "var(--purple)",
      fontSize: 13
    }
  }, "Importando... aguarde"))));
}
function RelatorioFrequencia({
  pacienteId,
  pacoteId,
  pacientes,
  sessoes,
  pacotes,
  lancamentos,
  FORMAS,
  onVoltar
}) {
  const pidNorm = (pacienteId || "").trim();
  const pac = pacientes.find(p => p.id === pidNorm);
  const pacote = pacoteId ? pacotes.find(p => p.id === pacoteId) : null;
  const pacEfetivo = pac || pacientes.find(p => p.id === pacote?.pacienteId);
  const pacotesPorId = pacotes.filter(p => p.pacienteId === pidNorm);
  const pacotesPac = pacoteId ? [pacote].filter(Boolean) : pacotesPorId.length > 0 ? pacotesPorId : pacotes.filter(p => p.pacienteNome && pacEfetivo && p.pacienteNome === pacEfetivo.nome);
  const pacoteIdsDosPac = pacotesPac.map(p => p.id);
  const sessPac = pacoteId ? sessoes.filter(s => s.pacoteId === pacoteId).sort((a, b) => a.data?.localeCompare(b.data)) : sessoes.filter(s => s.pacienteId === pidNorm || pacoteIdsDosPac.includes(s.pacoteId)).sort((a, b) => a.data?.localeCompare(b.data));
  const [mesFiltro, setMesFiltro] = useState("todos");
  const [accordionAberto, setAccordionAberto] = useState({});
  const [modalExcluir, setModalExcluir] = useState(null);
  const STATUS_S = {
    agendado: {
      l: "Agendado",
      c: "#7B00C4"
    },
    confirmado: {
      l: "Confirmado",
      c: "#059669"
    },
    realizado: {
      l: "✓ Realizado",
      c: "#059669"
    },
    cancelado: {
      l: "Cancelado",
      c: "#dc2626"
    },
    falta: {
      l: "Falta",
      c: "#d97706"
    },
    remarcado: {
      l: "Remarcado",
      c: "#0891b2"
    }
  };
  const porMes = sessPac.reduce((acc, s) => {
    const mes = s.data?.slice(0, 7) || "sem-data";
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(s);
    return acc;
  }, {});
  const meses = Object.keys(porMes).sort();
  const mesesFiltrados = mesFiltro === "todos" ? meses : [mesFiltro];
  const anoAtual = new Date().getFullYear();
  const totalAno = sessPac.filter(s => s.data?.startsWith(anoAtual + "") && s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
  async function atualizarSessao(id, campos) {
    await db.collection("clinica_sessoes").doc(id).update(campos);
  }
  async function remarcarSessao(s, novaData) {
    if (!novaData) return;
    try {
      await db.collection("clinica_sessoes").doc(s.id).update({
        data: novaData,
        status: "remarcado",
        remarcada: true,
        dataRemarcada: novaData,
        dataOriginal: s.dataOriginal || s.data
      });
    } catch (e) {
      console.error("Erro ao remarcar sessão:", e);
      alert("Erro ao remarcar: " + e.message);
    }
  }
  async function atualizarPagamento(s, formaPag, valorPago) {
    const pago = formaPag !== "" && formaPag !== "pendente";
    const vPago = parseFloat(valorPago) || parseFloat(s.valorSessao) || 0;
    await atualizarSessao(s.id, {
      formaPagamento: formaPag,
      pagamento: pago ? "pago" : "pendente",
      valorPago: pago ? vPago : 0,
      dataPagamento: pago && !s.dataPagamento ? new Date().toISOString().slice(0, 10) : s.dataPagamento
    });
    if (pago && !s.pacoteId) {
      const lancExist = lancamentos.find(l => l.sessaoId === s.id);
      if (!lancExist) {
        await db.collection("clinica_lancamentos").add({
          tipo_lancamento: "sessao",
          sessaoId: s.id,
          pacienteId: s.pacienteId,
          pacienteNome: s.pacienteNome || "",
          tipo: "Sessão #" + (s.numSessao || ""),
          valor: vPago,
          data: s.dataPagamento || new Date().toISOString().slice(0, 10),
          formaPag,
          status: "recebido",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await db.collection("clinica_lancamentos").doc(lancExist.id).update({
          valor: vPago,
          formaPag,
          status: "recebido"
        });
      }
    }
  }
  async function confirmarExclusao(tipo) {
    if (!modalExcluir) return;
    const {
      id,
      pacoteId,
      numSessao
    } = modalExcluir;
    if (tipo === "este") {
      await db.collection("clinica_sessoes").doc(id).delete();
    } else if (tipo === "daqui") {
      const fut = sessoes.filter(s => s.pacoteId === pacoteId && (s.numSessao || 0) >= (numSessao || 0));
      const b = db.batch();
      fut.forEach(s => b.delete(db.collection("clinica_sessoes").doc(s.id)));
      await b.commit();
    } else {
      const todas = sessoes.filter(s => s.pacoteId === pacoteId);
      const b = db.batch();
      todas.forEach(s => b.delete(db.collection("clinica_sessoes").doc(s.id)));
      b.delete(db.collection("clinica_pacotes").doc(pacoteId));
      const lp = lancamentos.find(l => l.pacoteId === pacoteId);
      if (lp) b.delete(db.collection("clinica_lancamentos").doc(lp.id));
      await b.commit();
    }
    setModalExcluir(null);
  }
  return React.createElement("div", null, React.createElement("div", {
    style: {
      background: "var(--purple)",
      borderRadius: 12,
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    onClick: onVoltar,
    style: {
      background: "rgba(255,255,255,0.2)",
      border: "none",
      cursor: "pointer",
      color: "white",
      padding: "6px 12px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar"), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "Dancing Script, cursive",
      fontSize: 20,
      color: "white",
      fontWeight: 600,
      lineHeight: 1
    }
  }, pacEfetivo?.nome), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.75)",
      marginTop: 2
    }
  }, "Controle de Sess\xF5es e Frequ\xEAncia")), React.createElement("button", {
    style: {
      background: "rgba(255,255,255,0.2)",
      border: "none",
      cursor: "pointer",
      color: "white",
      padding: "6px 14px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 6
    },
    onClick: () => window.print()
  }, React.createElement(Icon, {
    name: "printer",
    size: 15
  }), " Imprimir")), React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid var(--gray-200)",
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      background: "var(--purple)",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "Dancing Script, cursive",
      fontSize: 22,
      color: "white",
      fontWeight: 600
    }
  }, "Controle de Atendimento Terap\xEAutico"), React.createElement("img", {
    src: "../logo-transparente.png",
    style: {
      height: 36,
      objectFit: "contain"
    },
    onError: e => e.target.style.display = "none"
  })), React.createElement("div", {
    style: {
      padding: "14px 20px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
      gap: 12,
      borderBottom: "1px solid var(--gray-100)"
    }
  }, [["Nome", pacEfetivo?.nome || "—"], ["Início", pacotesPac[0]?.dataInicio ? new Date(pacotesPac[0].dataInicio + "T00:00:00").toLocaleDateString("pt-BR") : "—"], ["Horário", pacotesPac[0]?.horario || "—"], ["Recorrência", pacotesPac[0]?.recorrencia || "—"]].map(([l, v]) => React.createElement("div", {
    key: l
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)",
      fontWeight: 600,
      textTransform: "uppercase",
      marginBottom: 2
    }
  }, l), React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, v)))), React.createElement("div", {
    style: {
      padding: "12px 20px",
      display: "flex",
      gap: 20,
      flexWrap: "wrap",
      background: "var(--purple-soft)"
    }
  }, (() => {
    const sessFiltro = mesFiltro === "todos" ? sessPac : sessPac.filter(s => s.data?.startsWith(mesFiltro));
    const recFiltro = sessFiltro.filter(s => s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
    const pendFiltro = sessFiltro.filter(s => s.pagamento !== "pago" && s.status !== "cancelado").reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0);
    return [["Sessões", sessFiltro.length, "#7B00C4"], ["Realizadas", sessFiltro.filter(s => s.status === "realizado").length, "#059669"], ["Pagas", sessFiltro.filter(s => s.pagamento === "pago").length, "#059669"], ["Pendentes", sessFiltro.filter(s => s.pagamento !== "pago" && s.status !== "cancelado").length, "#d97706"], ["Faltas", sessFiltro.filter(s => s.status === "falta").length, "#dc2626"], ["Recebido", recFiltro.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }), "#059669"], ["A Receber", pendFiltro.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }), "#d97706"], ["Ano " + anoAtual, totalAno.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }), "#0891b2"]].map(([l, v, c]) => React.createElement("div", {
      key: l,
      style: {
        textAlign: "center"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: c
      }
    }, v), React.createElement("div", {
      style: {
        fontSize: 10,
        color: c,
        fontWeight: 500
      }
    }, l)));
  })())), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 16,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)"
    }
  }, "M\xEAs:"), React.createElement("button", {
    onClick: () => setMesFiltro("todos"),
    style: {
      padding: "4px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: mesFiltro === "todos" ? "var(--purple)" : "#e5e7eb",
      background: mesFiltro === "todos" ? "var(--purple)" : "white",
      color: mesFiltro === "todos" ? "white" : "#6b7280",
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "Todos"), meses.map(m => React.createElement("button", {
    key: m,
    onClick: () => setMesFiltro(m),
    style: {
      padding: "4px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: mesFiltro === m ? "var(--purple)" : "#e5e7eb",
      background: mesFiltro === m ? "var(--purple)" : "white",
      color: mesFiltro === m ? "white" : "#6b7280",
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, new Date(m + "-15").toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit"
  })))), mesesFiltrados.map(mes => {
    const sessMes = porMes[mes] || [];
    const mesLabel = new Date(mes + "-15").toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
    const recMes = sessMes.filter(s => s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
    const aberto = accordionAberto[mes] !== false;
    return React.createElement("div", {
      key: mes,
      style: {
        background: "white",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--gray-200)",
        marginBottom: 12
      }
    }, React.createElement("button", {
      onClick: () => setAccordionAberto(a => ({
        ...a,
        [mes]: !aberto
      })),
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        background: "#f5f0ff",
        border: "none",
        cursor: "pointer",
        borderBottom: aberto ? "2px solid var(--purple)" : "none"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "var(--purple)",
        textTransform: "capitalize"
      }
    }, mesLabel), React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, sessMes.length, " sess\xF5es"), React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#059669"
      }
    }, recMes.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }))), React.createElement(Icon, {
      name: aberto ? "chevron-up" : "chevron-down",
      size: 16
    })), aberto && React.createElement("div", {
      style: {
        overflowX: "auto"
      }
    }, React.createElement("table", {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 12
      }
    }, React.createElement("thead", null, React.createElement("tr", {
      style: {
        background: "var(--purple)",
        color: "white"
      }
    }, ["", "Nº", "Data", "Presença", "Modalidade", "V. Sessão", "V. Pago", "Saldo", "Forma Pagto", "Data Pagto", "Obs"].map(h => React.createElement("th", {
      key: h,
      style: {
        padding: "8px 10px",
        textAlign: "left",
        fontWeight: 600,
        whiteSpace: "nowrap",
        fontSize: 11
      }
    }, h)))), React.createElement("tbody", null, sessMes.map((s, i) => {
      const st = STATUS_S[s.status] || STATUS_S.agendado;
      const isPago = s.pagamento === "pago";
      const vSessao = parseFloat(s.valorSessao) || 0;
      const vPago = parseFloat(s.valorPago) || (isPago ? vSessao : 0);
      const saldo = isPago ? vPago - vSessao : 0;
      return React.createElement("tr", {
        key: s.id,
        style: {
          borderBottom: "1px solid var(--gray-100)",
          background: i % 2 === 0 ? "white" : "#fafafa"
        }
      }, React.createElement("td", {
        style: {
          padding: "5px 6px"
        }
      }, React.createElement("button", {
        onClick: () => setModalExcluir({
          id: s.id,
          pacoteId: s.pacoteId,
          numSessao: s.numSessao || i + 1,
          data: s.data
        }),
        style: {
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#dc2626",
          padding: "2px"
        }
      }, React.createElement(Icon, {
        name: "trash-2",
        size: 12
      }))), React.createElement("td", {
        style: {
          padding: "6px 10px",
          fontWeight: 700,
          color: "var(--purple)"
        }
      }, s.numSessao || "—"), React.createElement("td", {
        style: {
          padding: "6px 10px",
          whiteSpace: "nowrap"
        }
      }, s.data ? new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR") : "—", s.remarcada && React.createElement("span", {
        style: {
          fontSize: 9,
          color: "#0891b2",
          marginLeft: 4
        }
      }, "Rem.")), React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, React.createElement("select", {
        value: s.status,
        onChange: e => atualizarSessao(s.id, {
          status: e.target.value
        }),
        style: {
          fontSize: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 5,
          padding: "2px 4px",
          color: st.c,
          fontWeight: 600,
          background: "white",
          cursor: "pointer",
          minWidth: 88
        }
      }, Object.entries(STATUS_S).map(([k, v]) => React.createElement("option", {
        key: k,
        value: k
      }, v.l))), (s.status === "cancelado" || s.status === "remarcado") && React.createElement("div", {
        style: {
          marginTop: 3
        }
      }, React.createElement("div", {
        style: {
          fontSize: 9,
          color: "#0891b2",
          marginBottom: 2
        }
      }, "Nova data (sem mov. financeira):"), React.createElement("input", {
        type: "date",
        defaultValue: s.dataRemarcada || "",
        onBlur: e => {
          if (e.target.value) remarcarSessao(s, e.target.value, s._motivoRemarc || "remarcacao");
        },
        style: {
          fontSize: 10,
          border: "1px solid #0891b2",
          borderRadius: 3,
          padding: "1px 4px",
          color: "#0891b2",
          width: 105
        }
      }), React.createElement("select", {
        defaultValue: s.motivoRemarcacao || "remarcacao",
        onChange: e => atualizarSessao(s.id, {
          motivoRemarcacao: e.target.value
        }),
        style: {
          fontSize: 9,
          marginTop: 2,
          border: "1px solid #cbd5e1",
          borderRadius: 3,
          padding: "1px 3px",
          width: 105,
          color: "#374151",
          cursor: "pointer"
        }
      }, React.createElement("option", {
        value: "remarcacao"
      }, "\uD83D\uDD04 Remarca\xE7\xE3o"), React.createElement("option", {
        value: "falta"
      }, "\u26A0\uFE0F Falta"), React.createElement("option", {
        value: "compensacao"
      }, "\u2705 Compensa\xE7\xE3o")))), React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, React.createElement("input", {
        defaultValue: s.modalidade || "on-line",
        onBlur: e => atualizarSessao(s.id, {
          modalidade: e.target.value
        }),
        style: {
          fontSize: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 5,
          padding: "2px 5px",
          width: 62
        }
      })), React.createElement("td", {
        style: {
          padding: "6px 10px",
          fontWeight: 600,
          color: "#374151",
          whiteSpace: "nowrap"
        }
      }, vSessao.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      })), React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, React.createElement("input", {
        type: "number",
        defaultValue: s.valorPago || "",
        key: s.id + "_vpago",
        onBlur: e => atualizarPagamento(s, s.formaPagamento || "", e.target.value),
        placeholder: "0,00",
        style: {
          fontSize: 10,
          border: "1px solid",
          borderColor: isPago ? "#6ee7b7" : "#e5e7eb",
          borderRadius: 5,
          padding: "2px 5px",
          width: 65,
          color: isPago ? "#059669" : "#374151",
          fontWeight: isPago ? 600 : 400
        }
      })), React.createElement("td", {
        style: {
          padding: "6px 10px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          color: saldo < 0 ? "#dc2626" : saldo > 0 ? "#059669" : "#9ca3af",
          fontSize: 11
        }
      }, isPago ? saldo === 0 ? "—" : saldo.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      }) : "—"), React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, React.createElement("select", {
        value: s.formaPagamento || "",
        onChange: e => atualizarPagamento(s, e.target.value, s.valorPago || s.valorSessao),
        style: {
          fontSize: 10,
          border: "1px solid",
          borderColor: isPago ? "#6ee7b7" : "#e5e7eb",
          borderRadius: 5,
          padding: "2px 4px",
          color: isPago ? "#059669" : "#6b7280",
          fontWeight: isPago ? 600 : 400,
          cursor: "pointer",
          background: isPago ? "#f0fdf4" : "white",
          minWidth: 72
        }
      }, React.createElement("option", {
        value: ""
      }, "Pendente"), FORMAS.map(f => React.createElement("option", {
        key: f,
        value: f
      }, f)))), React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, React.createElement("input", {
        type: "date",
        defaultValue: s.dataPagamento || "",
        key: s.id + "_dtpag",
        onBlur: e => atualizarSessao(s.id, {
          dataPagamento: e.target.value
        }),
        style: {
          fontSize: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 5,
          padding: "2px 4px",
          width: 105
        }
      })), React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, React.createElement("input", {
        defaultValue: s.obs || "",
        onBlur: e => atualizarSessao(s.id, {
          obs: e.target.value
        }),
        placeholder: "\u2014",
        style: {
          fontSize: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 5,
          padding: "2px 5px",
          width: 70
        }
      })));
    })), React.createElement("tfoot", null, React.createElement("tr", {
      style: {
        background: "var(--purple-soft)"
      }
    }, React.createElement("td", {
      colSpan: 5,
      style: {
        padding: "8px 10px",
        fontWeight: 700,
        fontSize: 11
      }
    }, "Total ", mesLabel), React.createElement("td", {
      style: {
        padding: "8px 10px",
        fontWeight: 700,
        fontSize: 11
      }
    }, sessMes.reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), React.createElement("td", {
      style: {
        padding: "8px 10px",
        fontWeight: 700,
        fontSize: 11,
        color: "#059669"
      }
    }, recMes.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), React.createElement("td", {
      colSpan: 4
    }))))));
  }), modalExcluir && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 600,
      padding: 20
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 400,
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 32,
      marginBottom: 12
    }
  }, "\uD83D\uDDD1\uFE0F"), React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Excluir sess\xE3o #", modalExcluir.numSessao, "?"), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 20
    }
  }, modalExcluir.data ? new Date(modalExcluir.data + "T00:00:00").toLocaleDateString("pt-BR") : ""), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginBottom: 14
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #e5e7eb",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: () => confirmarExclusao("este")
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "S\xF3 esta sess\xE3o")), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #fbbf24",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: () => confirmarExclusao("daqui")
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#d97706"
    }
  }, "Esta e todas as pr\xF3ximas")), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #fca5a5",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: () => confirmarExclusao("todos")
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#dc2626"
    }
  }, "Cancelar todo o pacote"))), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      width: "100%"
    },
    onClick: () => setModalExcluir(null)
  }, "Cancelar"))));
}
function FinanceiroClinica() {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  const [lancamentos, setLancamentos] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear() + "");
  const [periodoCard, setPeriodoCard] = useState("mes");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [pacoteSelecionado, setPacoteSelecionado] = useState(null);
  const [modalExcluir, setModalExcluir] = useState(null);
  const [modalExcluirLanc, setModalExcluirLanc] = useState(null);
  const [aba, setAba] = useState("lancamentos");
  const [buscaPac, setBuscaPac] = useState("");
  const FORMAS = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Depósito", "Transferência", "Outro"];
  const RECORRENCIAS = ["Semanal (1x/semana)", "2x por semana", "3x por semana", "Quinzenal", "Mensal", "Sessão única"];
  const DIAS_LABEL = {
    0: "Dom",
    1: "Seg",
    2: "Ter",
    3: "Qua",
    4: "Qui",
    5: "Sex",
    6: "Sáb"
  };
  const [formAvulso, setFormAvulso] = useState({
    pacienteId: "",
    tipo: "Consulta",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    formaPag: "PIX",
    status: "pendente",
    obs: ""
  });
  const CATS_DESPESA = ["Aluguel", "Condomínio", "Marketing", "Salários", "Investimentos", "Musicoterapia", "Ferramentas de IA", "Telefone/Internet", "Contador", "Impostos", "Outros"];
  const [formDespesaEdit, setFormDespesaEdit] = useState({
    descricao: "",
    categoria: "",
    valor: "",
    data: "",
    formaPag: "",
    status: "pago",
    obs: ""
  });
  const [modalAuditoria, setModalAuditoria] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [auditando, setAuditando] = useState(false);
  const [formPacote, setFormPacote] = useState({
    pacienteId: "",
    totalSessoes: "",
    valorSessao: "",
    recorrencia: "Semanal (1x/semana)",
    dataInicio: "",
    horario: "09:00",
    diasSemana: [],
    horariosPorDia: {},
    statusPag: "pendente",
    formaPag: "",
    dataPagamento: "",
    pagamentosExtras: [],
    obs: "",
    parceiraId: "",
    percParceiro: "70"
  });
  const [parceiras, setParceiras] = useState([]);
  const [modalEditarPacote, setModalEditarPacote] = useState(null);
  const [formEdicaoPacote, setFormEdicaoPacote] = useState({});
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  useEffect(() => {
    const u1 = db.collection("clinica_lancamentos").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
      setLancamentos(docs);
    }, () => {});
    const u2 = db.collection("clinica_pacotes").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setPacotes(docs);
    }, () => {});
    const u3 = db.collection("clinica_sessoes").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (a.data || "").localeCompare(b.data || ""));
      setSessoes(docs);
    }, () => {});
    const u4 = db.collection("clinica_parceiras").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setParceiras(docs);
    }, () => {});
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, []);
  const getPacNome = id => pacientes.find(p => p.id === id)?.nome || "—";
  const anosDisp = [...new Set(lancamentos.map(l => l.data?.slice(0, 4)).filter(Boolean))].sort().reverse();
  if (!anosDisp.includes(anoFiltro)) anosDisp.unshift(anoFiltro);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const mesesDisp = Array.from({
    length: 12
  }, (_, i) => `${anoFiltro}-${String(i + 1).padStart(2, "0")}`);
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro) ? mesFiltro : mesAtual.startsWith(anoFiltro) ? mesAtual : anoFiltro + "-01";
  const mesCards = anoFiltro + "-" + new Date().toISOString().slice(5, 7);
  const lancMesCards = lancamentos.filter(l => l.data?.startsWith(mesCards));
  const lancMes = lancamentos.filter(l => l.data?.startsWith(mesFiltroEfetivo));
  const lancAno = lancamentos.filter(l => l.data?.startsWith(anoFiltro));
  const lancPeriodo = periodoCard === "mes" ? lancMesCards : lancAno;
  function calcSaldo(lista) {
    return lista.reduce((a, l) => {
      const v = parseFloat(l.valor) || 0;
      return l.tipo_lancamento === "despesa" ? a - v : a + v;
    }, 0);
  }
  function calcReceitas(lista) {
    return lista.filter(l => l.tipo_lancamento !== "despesa").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  }
  function calcDespesas(lista) {
    return lista.filter(l => l.tipo_lancamento === "despesa").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  }
  const totalRecebidoPeriodo = calcSaldo(lancPeriodo.filter(l => l.status === "recebido" || l.status === "pago"));
  const totalRecebidoMes = calcSaldo(lancMes.filter(l => l.status === "recebido" || l.status === "pago"));
  const totalPendente = calcReceitas(lancamentos.filter(l => l.status === "pendente" && l.data?.startsWith(anoFiltro)));
  const mesAtualLabel = new Date(mesCards + "-15").toLocaleDateString("pt-BR", {
    month: "short"
  });
  async function salvarAvulso(tipoVenda) {
    if (!formAvulso.valor || !formAvulso.data) {
      alert("Valor e data obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const pac = pacientes.find(p => p.id === formAvulso.pacienteId);
      const dados = {
        ...formAvulso,
        valor: parseFloat(formAvulso.valor),
        pacienteNome: pac?.nome || ""
      };
      if (editando) {
        const docSnap = await db.collection("clinica_lancamentos").doc(editando).get();
        if (!docSnap.exists) {
          alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
          setModal(false);
          setEditando(null);
          setSalvando(false);
          return;
        }
        await db.collection("clinica_lancamentos").doc(editando).update({
          ...dados,
          _editadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await db.collection("clinica_lancamentos").add({
          ...dados,
          tipo_lancamento: "avulso",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (formAvulso.status === "pendente") {
          await dispararNotificacao({
            tipo: "pagamento_pendente",
            titulo: `Pagamento pendente — ${pac?.nome || "Paciente"}`,
            corpo: `R$ ${parseFloat(formAvulso.valor).toFixed(2).replace(".", ",")} · ${formAvulso.tipo} · ${formAvulso.data?.split("-").reverse().join("/") || ""}`,
            pacienteId: formAvulso.pacienteId
          });
        }
        if (tipoVenda) await registrarComissao({
          tipo: "Sessão Avulsa",
          valor: parseFloat(formAvulso.valor),
          pacienteNome: pac?.nome || "",
          tipoVenda
        });
      }
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    }
    setModal(false);
    setEditando(null);
    setFormAvulso({
      pacienteId: "",
      tipo: "Consulta",
      valor: "",
      data: new Date().toISOString().slice(0, 10),
      formaPag: "PIX",
      status: "pendente",
      obs: ""
    });
    setSalvando(false);
  }
  function abrirEditar(l) {
    if (l.tipo_lancamento === "despesa") {
      setFormDespesaEdit({
        descricao: l.descricao || l.tipo || "",
        categoria: l.categoria || "",
        valor: l.valor + "",
        data: l.data || "",
        formaPag: l.formaPag || "",
        status: l.status || "pago",
        obs: l.obs || ""
      });
      setEditando(l.id);
      setModal("editar-despesa");
    } else {
      setFormAvulso({
        pacienteId: l.pacienteId || "",
        tipo: l.tipo || "Consulta",
        valor: l.valor + "",
        data: l.data || "",
        formaPag: l.formaPag || "PIX",
        status: l.status || "pendente",
        obs: l.obs || "",
        categoria: l.categoria || "",
        descricao: l.descricao || ""
      });
      setEditando(l.id);
      setModal("avulso");
    }
  }
  async function excluirLanc(id) {
    if (!confirm("Excluir lançamento?")) return;
    await db.collection("clinica_lancamentos").doc(id).delete();
  }
  async function salvarDespesaEdit() {
    if (!formDespesaEdit.valor || !formDespesaEdit.data) {
      alert("Valor e data obrigatórios.");
      return;
    }
    if (!editando) {
      alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
      return;
    }
    setSalvando(true);
    try {
      const docSnap = await db.collection("clinica_lancamentos").doc(editando).get();
      if (!docSnap.exists) {
        alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
        setModal(false);
        setEditando(null);
        setSalvando(false);
        return;
      }
      await db.collection("clinica_lancamentos").doc(editando).update({
        descricao: formDespesaEdit.descricao,
        categoria: formDespesaEdit.categoria,
        valor: parseFloat(formDespesaEdit.valor),
        data: formDespesaEdit.data,
        formaPag: formDespesaEdit.formaPag,
        status: formDespesaEdit.status,
        obs: formDespesaEdit.obs,
        tipo_lancamento: "despesa",
        _editadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    }
    setModal(false);
    setEditando(null);
    setSalvando(false);
  }
  async function marcarPacotePago(pacoteId, formaPag) {
    const sessPac = sessoes.filter(s => s.pacoteId === pacoteId);
    const pacote = pacotes.find(p => p.id === pacoteId);
    if (!pacote) return;
    const hoje = new Date().toISOString().slice(0, 10);
    const vTotal = parseFloat(pacote.valorTotal || 0);
    const extras = pacote.pagamentosExtras || [];
    const totalExtras = extras.reduce((a, pg) => a + (parseFloat(pg.valor) || 0), 0);
    const valorPagoFinal = totalExtras > 0 ? totalExtras : vTotal;
    const valorPendenteFinal = Math.max(0, vTotal - valorPagoFinal);
    const batch = db.batch();
    batch.update(db.collection("clinica_pacotes").doc(pacoteId), {
      statusPag: "recebido",
      formaPag,
      dataPagamento: hoje,
      valorPago: valorPagoFinal,
      valorPendente: valorPendenteFinal,
      _sincronizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    const valorPorSessao = sessPac.length > 0 ? parseFloat((valorPagoFinal / sessPac.length).toFixed(2)) : pacote.valorSessao || 0;
    sessPac.forEach(s => {
      batch.update(db.collection("clinica_sessoes").doc(s.id), {
        pagamento: "pago",
        formaPagamento: formaPag,
        dataPagamento: hoje,
        valorPago: parseFloat(s.valorPago || 0) > 0 ? s.valorPago : valorPorSessao,
        statusFinanceiro: "pago"
      });
    });
    const lancExistente = lancamentos.find(l => l.pacoteId === pacoteId);
    if (lancExistente) {
      batch.update(db.collection("clinica_lancamentos").doc(lancExistente.id), {
        status: "recebido",
        formaPag,
        dataPagamento: hoje,
        valor: valorPagoFinal,
        valorPendente: valorPendenteFinal
      });
    } else {
      const pac = pacientes.find(p => p.id === pacote.pacienteId);
      const mes = new Date(pacote.dataInicio + "T00:00:00").toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      });
      const desc = `${pac?.nome || pacote.pacienteNome || "Paciente"} — Pacote ${pacote.totalSessoes || ""} Sessões — ${mes.charAt(0).toUpperCase() + mes.slice(1)}`;
      batch.set(db.collection("clinica_lancamentos").doc(), {
        tipo_lancamento: "pacote",
        pacoteId,
        pacienteId: pacote.pacienteId,
        pacienteNome: pac?.nome || pacote.pacienteNome || "",
        tipo: desc,
        descricao: desc,
        valor: valorPagoFinal,
        valorPendente: valorPendenteFinal,
        data: hoje,
        formaPag,
        status: "recebido",
        dataPagamento: hoje,
        pagamentosExtras: extras,
        totalSessoes: pacote.totalSessoes,
        valorSessao: pacote.valorSessao,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch.commit();
  }
  function gerarDatas(dataInicio, recorrencia, total, diasSemana) {
    if (recorrencia === "Sessão única") return [dataInicio];
    const datas = [];
    if (["Semanal (1x/semana)", "Quinzenal", "Mensal"].includes(recorrencia)) {
      let atual = new Date(dataInicio + "T00:00:00");
      while (datas.length < total) {
        datas.push(atual.toISOString().split("T")[0]);
        if (recorrencia === "Semanal (1x/semana)") atual.setDate(atual.getDate() + 7);else if (recorrencia === "Quinzenal") atual.setDate(atual.getDate() + 14);else atual.setMonth(atual.getMonth() + 1);
      }
      return datas.slice(0, total);
    }
    const dias = (diasSemana || []).map(Number).sort();
    if (!dias.length) return [];
    let atual = new Date(dataInicio + "T00:00:00");
    const fim = new Date(atual);
    fim.setFullYear(fim.getFullYear() + 2);
    while (datas.length < total && atual < fim) {
      if (dias.includes(atual.getDay())) datas.push(atual.toISOString().split("T")[0]);
      atual.setDate(atual.getDate() + 1);
    }
    return datas.slice(0, total);
  }
  async function registrarComissao({
    tipo,
    valor,
    pacienteNome,
    tipoVenda,
    pacoteId = null
  }) {
    const cfg = await getConfigFin();
    const percNum = tipoVenda === "primeira" ? parseFloat(cfg.percPrimeira) || 10 : parseFloat(cfg.percRecorrente) || 5;
    const perc = percNum / 100;
    const valorComissao = parseFloat((valor * perc).toFixed(2));
    const hoje = new Date();
    const mesRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    await db.collection("clinica_comissoes").add({
      tipo,
      tipoVenda,
      perc: perc * 100,
      valorBase: valor,
      valorComissao,
      pacienteNome,
      mesRef,
      pacoteId: pacoteId || null,
      status: "pendente",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  async function salvarPacote(tipoVenda) {
    const {
      pacienteId,
      totalSessoes,
      valorSessao,
      recorrencia,
      dataInicio,
      horario,
      diasSemana,
      horariosPorDia,
      obs
    } = formPacote;
    if (!pacienteId || !totalSessoes || !dataInicio) {
      alert("Paciente, nº de sessões e data de início obrigatórios.");
      return;
    }
    const needDias = ["2x por semana", "3x por semana"].includes(recorrencia);
    if (needDias && (!diasSemana || diasSemana.length === 0)) {
      alert("Selecione os dias da semana.");
      return;
    }
    const eParceria = (formPacote.tipoAtendimento || "particular") === "parceria";
    if (eParceria && !formPacote.parceiraId) {
      alert("Selecione a parceira para a venda em parceria.");
      return;
    }
    setSalvando(true);
    const pac = pacientes.find(p => p.id === pacienteId);
    const total = parseInt(totalSessoes) || 1;
    const vSessao = parseFloat(valorSessao) || 0;
    const vTotal = vSessao * total;
    const datas = gerarDatas(dataInicio, recorrencia, total, diasSemana);
    const parcSel = eParceria ? parceiras.find(p => p.id === formPacote.parceiraId) : null;
    const percParc = eParceria ? parseFloat(formPacote.percParceiro) || 70 : 0;
    const pacRef = await db.collection("clinica_pacotes").add({
      pacienteId,
      pacienteNome: pac?.nome || "",
      totalSessoes: total,
      valorSessao: vSessao,
      valorTotal: vTotal,
      recorrencia,
      dataInicio,
      horario,
      diasSemana: diasSemana || [],
      horariosPorDia: horariosPorDia || {},
      obs,
      tipoAtendimento: formPacote.tipoAtendimento || "particular",
      parceiraId: eParceria ? formPacote.parceiraId : null,
      parceiraNome: eParceria ? parcSel?.nome || "" : null,
      percParceiro: eParceria ? percParc : null,
      statusPag: formPacote.statusPag || "pendente",
      formaPag: formPacote.formaPag || "",
      dataPagamento: formPacote.dataPagamento || "",
      pagamentosExtras: formPacote.pagamentosExtras || [],
      status: "ativo",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const mesInicioPacote = new Date(dataInicio + "T00:00:00").toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
    const nomePacote = `Pacote ${total} Sessões`;
    const descricaoLanc = `${pac?.nome || "Paciente"} — ${nomePacote} — ${mesInicioPacote.charAt(0).toUpperCase() + mesInicioPacote.slice(1)}`;
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "pacote",
      pacoteId: pacRef.id,
      pacienteId,
      pacienteNome: pac?.nome || "",
      tipo: descricaoLanc,
      descricao: descricaoLanc,
      valor: vTotal,
      data: dataInicio,
      formaPag: formPacote.formaPag || "",
      status: formPacote.statusPag || "pendente",
      dataPagamento: formPacote.dataPagamento || "",
      pagamentosExtras: formPacote.pagamentosExtras || [],
      obs,
      totalSessoes: total,
      valorSessao: vSessao,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (tipoVenda) await registrarComissao({
      tipo: "Pacote",
      valor: vTotal,
      pacienteNome: pac?.nome || "",
      tipoVenda,
      pacoteId: pacRef.id
    });
    if (eParceria && parcSel) {
      const vParceira = parseFloat((vTotal * percParc / 100).toFixed(2));
      const mesRefParc = new Date().toISOString().slice(0, 7);
      await db.collection("clinica_comissoes").add({
        tipo: "Parceria — Repasse",
        tipoVenda: null,
        perc: percParc,
        valorBase: vTotal,
        valorComissao: vParceira,
        pacienteNome: pac?.nome || "",
        responsavel: parcSel.nome || "Parceira",
        parceiraId: parcSel.id,
        mesRef: mesRefParc,
        pacoteId: pacRef.id,
        status: "pendente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    const jaPago = (formPacote.statusPag || "pendente") === "recebido";
    const batch = db.batch();
    datas.forEach((data, i) => {
      const ref = db.collection("clinica_sessoes").doc();
      const dia = new Date(data + "T00:00:00").getDay().toString();
      const horaDia = (horariosPorDia || {})[dia] || horario;
      batch.set(ref, {
        pacienteId,
        pacienteNome: pac?.nome || "",
        data,
        hora: horaDia,
        duracao: "50",
        tipo: "Psicoterapia",
        status: "agendado",
        numSessao: i + 1,
        pacoteId: pacRef.id,
        valorSessao: vSessao,
        pagamento: jaPago ? "pago" : "pendente",
        valorPago: jaPago ? vSessao : 0,
        formaPagamento: formPacote.formaPag || "",
        dataPagamento: jaPago ? formPacote.dataPagamento || new Date().toISOString().slice(0, 10) : "",
        obs: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    if ((formPacote.tipoAtendimento || "particular") === "social") {
      const hoje = new Date().toISOString().slice(0, 10);
      const mesRef = hoje.slice(0, 7);
      const vSupervisao = parseFloat(formPacote.valorSupervisaoSocial || 40);
      const vEstagiaria = parseFloat(formPacote.valorEstagiariaSocial || 20);
      const snapEst = await db.collection("clinica_parceiras").where("tipo", "==", "estagiaria").limit(1).get();
      const nomeEst = !snapEst.empty ? snapEst.docs[0].data().nome : "Estagiária";
      const batchSoc = db.batch();
      batchSoc.set(db.collection("clinica_lancamentos").doc(), {
        tipo_lancamento: "social",
        tipo: `${pac?.nome || ""} — Projeto Social`,
        descricao: `${pac?.nome || ""} — Projeto Social`,
        pacienteNome: pac?.nome || "",
        valor: vSupervisao,
        data: dataInicio,
        mesRef,
        formaPag: formPacote.formaPag || "PIX",
        status: formPacote.statusPag || "pendente",
        origem: "pacote-social",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      batchSoc.set(db.collection("clinica_comissoes").doc(), {
        tipo: "Social — Estagiária",
        tipoVenda: "primeira",
        perc: 0,
        valorBase: vSupervisao,
        valorComissao: vEstagiaria,
        pacienteNome: pac?.nome || "",
        responsavel: nomeEst,
        mesRef,
        status: "pendente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await batchSoc.commit();
    }
    setModal(false);
    setFormPacote({
      pacienteId: "",
      totalSessoes: "",
      valorSessao: "",
      recorrencia: "Semanal (1x/semana)",
      dataInicio: "",
      horario: "09:00",
      diasSemana: [],
      horariosPorDia: {},
      statusPag: "pendente",
      formaPag: "",
      dataPagamento: "",
      pagamentosExtras: [],
      obs: "",
      tipoAtendimento: "particular",
      valorSupervisaoSocial: "40",
      valorEstagiariaSocial: "20",
      parceiraId: "",
      percParceiro: "70"
    });
    setSalvando(false);
    alert(`✅ Pacote criado! ${datas.length} sessões geradas na agenda.`);
  }
  async function atualizarSessao(id, campos) {
    await db.collection("clinica_sessoes").doc(id).update(campos);
  }
  async function remarcarSessao(s, novaData, motivo = "remarcacao") {
    if (!novaData) return;
    try {
      await db.collection("clinica_sessoes").doc(s.id).update({
        data: novaData,
        status: "remarcado",
        remarcada: true,
        dataRemarcada: novaData,
        dataOriginal: s.dataOriginal || s.data,
        motivoRemarcacao: motivo
      });
    } catch (e) {
      console.error("Erro ao remarcar sessão:", e);
      alert("Erro ao remarcar: " + e.message);
    }
  }
  async function confirmarExclusao(tipo) {
    if (!modalExcluir) return;
    const {
      id,
      pacoteId,
      numSessao
    } = modalExcluir;
    try {
      if (tipo === "este") {
        await db.collection("clinica_sessoes").doc(id).delete();
      } else if (tipo === "daqui") {
        const fut = sessoes.filter(s => s.pacoteId === pacoteId && (s.numSessao || 0) >= (numSessao || 0));
        const b = db.batch();
        fut.forEach(s => b.delete(db.collection("clinica_sessoes").doc(s.id)));
        await b.commit();
      } else {
        const [snapSess, snapLanc] = await Promise.all([db.collection("clinica_sessoes").where("pacoteId", "==", pacoteId).get(), db.collection("clinica_lancamentos").where("pacoteId", "==", pacoteId).get()]);
        const b = db.batch();
        snapSess.docs.forEach(d => b.delete(d.ref));
        snapLanc.docs.forEach(d => b.delete(d.ref));
        b.delete(db.collection("clinica_pacotes").doc(pacoteId));
        await b.commit();
        if (typeof setPacoteSelecionado === "function") setPacoteSelecionado(null);
      }
    } catch (e) {
      console.error("Erro ao excluir sessão/pacote:", e);
      alert("Erro ao excluir: " + e.message);
    }
    setModalExcluir(null);
  }
  if (pacoteSelecionado) {
    if (pacoteSelecionado.endsWith("__sessoes")) {
      const pacoteId = pacoteSelecionado.replace("__sessoes", "");
      return React.createElement(RelatorioFrequencia, {
        pacienteId: null,
        pacoteId: pacoteId,
        pacientes: pacientes,
        sessoes: sessoes,
        pacotes: pacotes,
        lancamentos: lancamentos,
        FORMAS: FORMAS,
        onVoltar: () => setPacoteSelecionado(null)
      });
    }
    if (pacoteSelecionado.endsWith("__pacote")) {
      const pacoteId = pacoteSelecionado.replace("__pacote", "");
      const pacoteAlvo = pacotes.find(p => p.id === pacoteId);
      if (pacoteAlvo && !modalEditarPacote) {
        setModalEditarPacote(pacoteAlvo);
        setFormEdicaoPacote({
          pacienteId: pacoteAlvo.pacienteId || "",
          totalSessoes: pacoteAlvo.totalSessoes || "",
          valorSessao: pacoteAlvo.valorSessao || "",
          recorrencia: pacoteAlvo.recorrencia || "Semanal (1x/semana)",
          dataInicio: pacoteAlvo.dataInicio || "",
          horario: pacoteAlvo.horario || "09:00",
          statusPag: pacoteAlvo.statusPag || "pendente",
          formaPag: pacoteAlvo.formaPag || "",
          dataPagamento: pacoteAlvo.dataPagamento || "",
          pagamentosExtras: pacoteAlvo.pagamentosExtras || [],
          obs: pacoteAlvo.obs || ""
        });
        setPacoteSelecionado(null);
      }
    }
    return React.createElement(RelatorioFrequencia, {
      pacienteId: pacoteSelecionado,
      pacoteId: null,
      pacientes: pacientes,
      sessoes: sessoes,
      pacotes: pacotes,
      lancamentos: lancamentos,
      FORMAS: FORMAS,
      onVoltar: () => setPacoteSelecionado(null)
    });
  }
  async function salvarEdicaoPacote() {
    if (!modalEditarPacote) return;
    setSalvandoEdicao(true);
    try {
      const f = formEdicaoPacote;
      const jaPago = (f.statusPag || "pendente") === "recebido";
      const novoTotalSessoes = parseInt(f.totalSessoes) || modalEditarPacote.totalSessoes;
      const novoValorSessao = parseFloat(f.valorSessao) || modalEditarPacote.valorSessao;
      const novoValorTotal = novoTotalSessoes * novoValorSessao;
      const dataPagFinal = jaPago ? f.dataPagamento || new Date().toISOString().slice(0, 10) : "";
      const extras = f.pagamentosExtras || [];
      const totalExtras = extras.reduce((a, pg) => a + (parseFloat(pg.valor) || 0), 0);
      const totalPagoRef = jaPago ? totalExtras > 0 ? totalExtras : novoValorTotal : 0;
      const valorPagoPorSessao = novoTotalSessoes > 0 ? parseFloat((totalPagoRef / novoTotalSessoes).toFixed(2)) : novoValorSessao;
      await db.collection("clinica_pacotes").doc(modalEditarPacote.id).update({
        totalSessoes: novoTotalSessoes,
        valorSessao: novoValorSessao,
        valorTotal: novoValorTotal,
        recorrencia: f.recorrencia,
        dataInicio: f.dataInicio,
        horario: f.horario,
        statusPag: f.statusPag,
        formaPag: f.formaPag || "",
        dataPagamento: dataPagFinal,
        pagamentosExtras: extras,
        obs: f.obs || ""
      });
      try {
        const snapLanc = await db.collection("clinica_lancamentos").where("pacoteId", "==", modalEditarPacote.id).get();
        if (!snapLanc.empty) {
          const pacEd = pacientes.find(p => p.id === (modalEditarPacote.pacienteId || ""));
          const mesEd = f.dataInicio ? new Date(f.dataInicio + "T00:00:00").toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
          }) : "";
          const nomePacEd = `Pacote ${novoTotalSessoes} Sessões`;
          const descEd = pacEd ? `${pacEd.nome} — ${nomePacEd} — ${mesEd.charAt(0).toUpperCase() + mesEd.slice(1)}` : snapLanc.docs[0].data().tipo || snapLanc.docs[0].data().descricao || nomePacEd;
          await snapLanc.docs[0].ref.update({
            valor: novoValorTotal,
            totalSessoes: novoTotalSessoes,
            valorSessao: novoValorSessao,
            status: f.statusPag || "pendente",
            formaPag: f.formaPag || "",
            dataPagamento: dataPagFinal,
            pagamentosExtras: extras,
            obs: f.obs || "",
            tipo: descEd,
            descricao: descEd
          });
        }
      } catch (eLanc) {
        console.warn("Aviso: lançamento não atualizado →", eLanc.message);
      }
      const snapSess = await db.collection("clinica_sessoes").where("pacoteId", "==", modalEditarPacote.id).get();
      const sessDoPacote = snapSess.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
      if (sessDoPacote.length > 0) {
        const batch = db.batch();
        sessDoPacote.forEach((s, idx) => {
          if (idx >= novoTotalSessoes) {
            batch.delete(db.collection("clinica_sessoes").doc(s.id));
          } else {
            const campos = {
              valorSessao: novoValorSessao,
              hora: f.horario || s.hora || "",
              recorrencia: f.recorrencia || s.recorrencia || ""
            };
            if (jaPago) {
              const vPagoAtual = parseFloat(s.valorPago) || 0;
              campos.pagamento = "pago";
              campos.formaPagamento = f.formaPag || s.formaPagamento || "";
              campos.dataPagamento = dataPagFinal || s.dataPagamento || "";
              campos.valorPago = vPagoAtual > 0 ? vPagoAtual : valorPagoPorSessao;
            } else if (f.statusPag === "pendente" && s.pagamento === "pago") {
              campos.pagamento = "pendente";
              campos.valorPago = 0;
              campos.dataPagamento = "";
            }
            batch.update(db.collection("clinica_sessoes").doc(s.id), campos);
          }
        });
        await batch.commit();
      }
      alert("✓ Pacote atualizado! Sessões e financeiro sincronizados.");
      setModalEditarPacote(null);
    } catch (e) {
      console.error("Erro salvarEdicaoPacote:", e);
      alert("Erro ao salvar pacote: " + e.message);
    }
    setSalvandoEdicao(false);
  }
  const totalRecebido = lancamentos.filter(l => l.status === "recebido").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  async function executarHigienizacao() {
    if (!confirm("⚠️ Confirmar higienização completa?\n\n• Lançamentos de sessão órfãos (de pacotes) serão deletados\n• Duplicatas de Ronei e Heitor serão removidas\n• Lançamentos Sem Nome viram Despesas Administrativas\n\nEssa ação não pode ser desfeita.")) return;
    setAuditando(true);
    const log = [];
    const mesRef = "2026-05";
    const ro = await deletarLancamentosOrfaosDeSessao();
    log.push(`Sessões órfãs de pacote: ${ro.ok ? `${ro.deletados} lançamento(s) deletado(s)` : "Erro — " + ro.erro}`);
    const snapRonei = await db.collection("clinica_pacientes").where("nome", ">=", "Ronei").where("nome", "<=", "Ronei").limit(1).get();
    const snapHeitor = await db.collection("clinica_pacientes").where("nome", ">=", "Heitor").where("nome", "<=", "Heitor").limit(1).get();
    if (!snapRonei.empty) {
      const r = await deletarDuplicatasPaciente(snapRonei.docs[0].id, mesRef);
      log.push(`Ronei: ${r.ok ? `${r.deletados} duplicata(s) removida(s)` : "Erro — " + r.erro}`);
    } else {
      log.push("Ronei: paciente não encontrado");
    }
    if (!snapHeitor.empty) {
      const r = await deletarDuplicatasPaciente(snapHeitor.docs[0].id, mesRef);
      log.push(`Heitor: ${r.ok ? `${r.deletados} duplicata(s) removida(s)` : "Erro — " + r.erro}`);
    } else {
      log.push("Heitor: paciente não encontrado");
    }
    const rc = await categorizarSemNome(mesRef);
    log.push(`Sem Nome: ${rc.ok ? `${rc.atualizados} lançamento(s) categorizados` : "Erro — " + rc.erro}`);
    setAuditLog(log);
    setAuditando(false);
  }
  return React.createElement("div", null, modalAuditoria && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 700,
      padding: 20
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 480
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, React.createElement("h3", {
    style: {
      margin: 0,
      color: "#b45309"
    }
  }, "\uD83D\uDD27 Higieniza\xE7\xE3o \u2014 Maio/2026"), React.createElement("button", {
    onClick: () => setModalAuditoria(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 20
    }
  }, "\u2715")), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 20,
      lineHeight: 1.6
    }
  }, "Esta opera\xE7\xE3o ir\xE1:", React.createElement("br", null), "\u2022 Deletar ", React.createElement("b", null, "lan\xE7amentos de sess\xE3o \xF3rf\xE3os"), " \u2014 sess\xF5es de pacote que geraram lan\xE7amento pr\xF3prio indevido", React.createElement("br", null), "\u2022 Remover duplicatas de ", React.createElement("b", null, "Ronei"), " e ", React.createElement("b", null, "Heitor"), React.createElement("br", null), "\u2022 Categorizar ", React.createElement("b", null, "lan\xE7amentos Sem Nome"), " como \"Despesas Administrativas/Cl\xEDnica\""), auditLog.length > 0 && React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #86efac",
      borderRadius: 8,
      padding: 14,
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: "#166534",
      marginBottom: 6
    }
  }, "\u2705 Resultado:"), auditLog.map((l, i) => React.createElement("div", {
    key: i,
    style: {
      fontSize: 12,
      color: "#374151",
      marginBottom: 2
    }
  }, "\u2022 ", l))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalAuditoria(false)
  }, "Fechar"), auditLog.length === 0 && React.createElement("button", {
    className: "btn btn-purple",
    style: {
      background: "#b45309"
    },
    onClick: executarHigienizacao,
    disabled: auditando
  }, auditando ? "Executando..." : "⚡ Executar Higienização")))), modalEditarPacote && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 600,
      padding: 20
    },
    onClick: e => {
      if (e.target === e.currentTarget) setModalEditarPacote(null);
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 560,
      maxHeight: "90vh",
      overflowY: "auto"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("h3", {
    style: {
      margin: 0,
      color: "var(--purple)"
    }
  }, "\u270F\uFE0F Editar Pacote"), React.createElement("button", {
    onClick: () => setModalEditarPacote(null),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 20,
      color: "var(--gray-400)"
    }
  }, "\u2715")), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "N\xBA de Sess\xF5es"), React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formEdicaoPacote.totalSessoes || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      totalSessoes: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Valor por Sess\xE3o (R$)"), React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formEdicaoPacote.valorSessao || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      valorSessao: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data de In\xEDcio"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formEdicaoPacote.dataInicio || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      dataInicio: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Hor\xE1rio"), React.createElement("input", {
    className: "form-input",
    type: "time",
    value: formEdicaoPacote.horario || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      horario: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Recorr\xEAncia"), React.createElement("select", {
    className: "form-input",
    value: formEdicaoPacote.recorrencia || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      recorrencia: e.target.value
    })
  }, RECORRENCIAS.map(r => React.createElement("option", {
    key: r
  }, r)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Total do Pacote"), React.createElement("input", {
    className: "form-input",
    readOnly: true,
    value: "R$ " + (parseFloat(formEdicaoPacote.valorSessao || 0) * parseInt(formEdicaoPacote.totalSessoes || 0) || 0).toFixed(2).replace(".", ","),
    style: {
      background: "#f9fafb",
      color: "var(--text-muted)"
    }
  })), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Status do Pagamento"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["pendente", "Pendente", "#d97706"], ["recebido", "✓ Recebido", "#059669"]].map(([v, l, cor]) => React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormEdicaoPacote({
      ...formEdicaoPacote,
      statusPag: v
    }),
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 13,
      fontFamily: "var(--font-body)",
      borderColor: (formEdicaoPacote.statusPag || "pendente") === v ? cor : "#e5e7eb",
      background: (formEdicaoPacote.statusPag || "pendente") === v ? cor + "15" : "white",
      color: (formEdicaoPacote.statusPag || "pendente") === v ? cor : "#6b7280"
    }
  }, l)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento Principal"), React.createElement("select", {
    className: "form-input",
    value: formEdicaoPacote.formaPag || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      formaPag: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Selecionar..."), FORMAS.map(f => React.createElement("option", {
    key: f
  }, f)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data do Pagamento"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formEdicaoPacote.dataPagamento || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      dataPagamento: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, React.createElement("label", {
    className: "form-label",
    style: {
      margin: 0
    }
  }, "Formas de pagamento (PIX, cart\xE3o, dinheiro em datas diferentes)"), React.createElement("button", {
    type: "button",
    style: {
      fontSize: 12,
      color: "#7B00C4",
      background: "#f3e6ff",
      border: "1px solid #d9b3f5",
      borderRadius: 6,
      padding: "4px 12px",
      cursor: "pointer"
    },
    onClick: () => setFormEdicaoPacote({
      ...formEdicaoPacote,
      pagamentosExtras: [...(formEdicaoPacote.pagamentosExtras || []), {
        forma: "",
        valor: "",
        data: new Date().toISOString().slice(0, 10)
      }]
    })
  }, "+ Adicionar forma")), (formEdicaoPacote.pagamentosExtras || []).length === 0 && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      fontStyle: "italic",
      padding: "6px 0"
    }
  }, "Clique em \"+ Adicionar forma\" para registrar pagamentos parciais ou m\xFAltiplas formas."), (formEdicaoPacote.pagamentosExtras || []).map((pg, i) => React.createElement("div", {
    key: i,
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr auto",
      gap: 6,
      marginBottom: 6,
      alignItems: "center"
    }
  }, React.createElement("select", {
    className: "form-input",
    style: {
      fontSize: 12
    },
    value: pg.forma,
    onChange: e => {
      const p = [...(formEdicaoPacote.pagamentosExtras || [])];
      p[i] = {
        ...p[i],
        forma: e.target.value
      };
      setFormEdicaoPacote({
        ...formEdicaoPacote,
        pagamentosExtras: p
      });
    }
  }, React.createElement("option", {
    value: ""
  }, "Forma..."), FORMAS.map(f => React.createElement("option", {
    key: f
  }, f))), React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 12
    },
    type: "number",
    placeholder: "Valor R$",
    value: pg.valor,
    onChange: e => {
      const p = [...(formEdicaoPacote.pagamentosExtras || [])];
      p[i] = {
        ...p[i],
        valor: e.target.value
      };
      setFormEdicaoPacote({
        ...formEdicaoPacote,
        pagamentosExtras: p
      });
    }
  }), React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 12
    },
    type: "date",
    value: pg.data,
    onChange: e => {
      const p = [...(formEdicaoPacote.pagamentosExtras || [])];
      p[i] = {
        ...p[i],
        data: e.target.value
      };
      setFormEdicaoPacote({
        ...formEdicaoPacote,
        pagamentosExtras: p
      });
    }
  }), React.createElement("button", {
    type: "button",
    style: {
      color: "#dc2626",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 18,
      padding: "0 4px"
    },
    onClick: () => {
      const p = [...(formEdicaoPacote.pagamentosExtras || [])];
      p.splice(i, 1);
      setFormEdicaoPacote({
        ...formEdicaoPacote,
        pagamentosExtras: p
      });
    }
  }, "\u2715")))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Observa\xE7\xF5es"), React.createElement("textarea", {
    className: "form-input",
    rows: 2,
    value: formEdicaoPacote.obs || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      obs: e.target.value
    }),
    placeholder: "Notas sobre o pacote..."
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 20
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalEditarPacote(null)
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarEdicaoPacote,
    disabled: salvandoEdicao
  }, salvandoEdicao ? "Salvando..." : "💾 Salvar alterações")))), React.createElement("div", {
    className: "page-header",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "page-title"
  }, "Financeiro da Cl\xEDnica"), React.createElement("div", {
    className: "page-subtitle"
  }, "Lan\xE7amentos, pacotes e controle de sess\xF5es")), React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setModal("escolha")
  }, React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Novo Lan\xE7amento")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 14,
      alignItems: "center"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, "Ano:"), (() => {
    const anoAtualNum = new Date().getFullYear();
    const anosExist = [...new Set(lancamentos.map(l => l.data?.slice(0, 4)).filter(Boolean))].map(Number);
    const anosSet = new Set([...anosExist, anoAtualNum - 1, anoAtualNum, anoAtualNum + 1]);
    const anos = [...anosSet].sort().map(String);
    return anos.map(a => React.createElement("button", {
      key: a,
      onClick: () => {
        setAnoFiltro(a);
        setMesFiltro(a === String(anoAtualNum) ? mesAtual : a + "-01");
      },
      style: {
        padding: "5px 16px",
        borderRadius: 20,
        border: "1.5px solid",
        borderColor: anoFiltro === a ? "var(--purple)" : "#e5e7eb",
        background: anoFiltro === a ? "var(--purple)" : "white",
        color: anoFiltro === a ? "white" : "#6b7280",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, a, a === String(anoAtualNum) && React.createElement("span", {
      style: {
        marginLeft: 3,
        fontSize: 9
      }
    }, "\u25CF")));
  })()), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 12,
      marginBottom: 20
    }
  }, React.createElement("div", {
    onClick: () => setPeriodoCard(p => p === "mes" ? "ano" : "mes"),
    style: {
      background: totalRecebidoPeriodo >= 0 ? "#d1fae5" : "#fee2e2",
      borderRadius: 12,
      padding: "14px 16px",
      textAlign: "center",
      cursor: "pointer",
      border: "1.5px solid",
      borderColor: totalRecebidoPeriodo >= 0 ? "#6ee7b7" : "#fca5a5",
      transition: "all .2s",
      position: "relative"
    }
  }, React.createElement("div", {
    style: {
      position: "absolute",
      top: 6,
      right: 8,
      fontSize: 10,
      color: totalRecebidoPeriodo >= 0 ? "#059669" : "#dc2626",
      fontWeight: 600,
      background: "white",
      borderRadius: 10,
      padding: "1px 6px"
    }
  }, periodoCard === "mes" ? "mês ↕" : "ano ↕"), React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: totalRecebidoPeriodo >= 0 ? "#059669" : "#dc2626"
    }
  }, totalRecebidoPeriodo.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })), React.createElement("div", {
    style: {
      fontSize: 12,
      color: totalRecebidoPeriodo >= 0 ? "#059669" : "#dc2626",
      fontWeight: 500,
      marginTop: 2
    }
  }, "Saldo (", periodoCard === "mes" ? mesAtualLabel : anoFiltro, ")"), React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#6b7280",
      marginTop: 4
    }
  }, "+", calcReceitas(lancPeriodo).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  }), " / -", calcDespesas(lancPeriodo).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  }))), React.createElement("div", {
    style: {
      background: "#fef3c7",
      borderRadius: 12,
      padding: "14px 16px",
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#d97706"
    }
  }, totalPendente.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#d97706",
      fontWeight: 500,
      marginTop: 2
    }
  }, "Pendente (", anoFiltro, ")")), React.createElement("div", {
    style: {
      background: "var(--purple-soft)",
      borderRadius: 12,
      padding: "14px 16px",
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "var(--purple)"
    }
  }, pacotes.filter(p => p.status === "ativo").length), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--purple)",
      fontWeight: 500,
      marginTop: 2
    }
  }, "Pacotes ativos")), React.createElement("div", {
    style: {
      background: "#e0f2fe",
      borderRadius: 12,
      padding: "14px 16px",
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#0891b2"
    }
  }, lancPeriodo.length), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#0891b2",
      fontWeight: 500,
      marginTop: 2
    }
  }, "Lan\xE7amentos (", periodoCard === "mes" ? new Date(mesFiltro + "-15").toLocaleDateString("pt-BR", {
    month: "short"
  }) : anoFiltro, ")"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 0,
      marginBottom: 20,
      borderBottom: "1px solid var(--gray-200)",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
      flexShrink: 0
    }
  }, [["lancamentos", "Lançamentos", "dollar-sign"], ["pacotes", "Pacotes & Sessões", "package"], ["acompanhamento", "Acompanhamento Geral", "users"]].map(([id, lbl, ic]) => React.createElement("button", {
    key: id,
    onClick: () => setAba(id),
    style: {
      padding: "10px 20px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: 14,
      color: aba === id ? "var(--purple)" : "var(--gray-600)",
      borderBottom: aba === id ? "2px solid var(--purple)" : "2px solid transparent",
      fontWeight: aba === id ? 600 : 400,
      fontFamily: "var(--font-body)",
      marginBottom: -1,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(Icon, {
    name: ic,
    size: 15
  }), lbl)), React.createElement("button", {
    onClick: () => {
      setAuditLog([]);
      setModalAuditoria(true);
    },
    style: {
      marginLeft: "auto",
      padding: "10px 14px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: 12,
      color: "#b45309",
      borderBottom: "2px solid transparent",
      fontWeight: 500,
      fontFamily: "var(--font-body)",
      marginBottom: -1,
      display: "flex",
      alignItems: "center",
      gap: 5,
      flexShrink: 0
    },
    title: "Higienizar duplicatas e lan\xE7amentos sem nome \u2014 Maio/2026"
  }, React.createElement(Icon, {
    name: "tool",
    size: 13
  }), "\uD83D\uDD27 Higienizar")), aba === "lancamentos" && React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16,
      alignItems: "center"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, "M\xEAs:"), React.createElement("button", {
    onClick: () => {
      const idx = mesesDisp.indexOf(mesFiltroEfetivo);
      if (idx > 0) setMesFiltro(mesesDisp[idx - 1]);
    },
    style: {
      background: "var(--purple)",
      border: "none",
      borderRadius: "50%",
      width: 30,
      height: 30,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: "white",
      fontSize: 16,
      fontWeight: 700
    }
  }, "\u2039"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      overflowX: "hidden",
      flex: 1
    }
  }, mesesDisp.map(m => {
    const isAtual = m === mesAtual;
    const isSel = m === mesFiltroEfetivo;
    return React.createElement("button", {
      key: m,
      onClick: () => setMesFiltro(m),
      style: {
        padding: "5px 14px",
        borderRadius: 20,
        border: "1.5px solid",
        flexShrink: 0,
        borderColor: isSel ? "var(--purple)" : isAtual ? "var(--purple)" : "#e5e7eb",
        background: isSel ? "var(--purple)" : "white",
        color: isSel ? "white" : isAtual ? "var(--purple)" : "#6b7280",
        fontSize: 12,
        fontWeight: isSel || isAtual ? 700 : 400,
        cursor: "pointer",
        display: Math.abs(mesesDisp.indexOf(m) - mesesDisp.indexOf(mesFiltroEfetivo)) <= 2 ? "flex" : "none",
        alignItems: "center",
        gap: 4
      }
    }, new Date(m + "-15").toLocaleDateString("pt-BR", {
      month: "long"
    }), isAtual && !isSel && React.createElement("span", {
      style: {
        fontSize: 9
      }
    }, "\u25CF"));
  })), React.createElement("button", {
    onClick: () => {
      const idx = mesesDisp.indexOf(mesFiltroEfetivo);
      if (idx < mesesDisp.length - 1) setMesFiltro(mesesDisp[idx + 1]);
    },
    style: {
      background: "var(--purple)",
      border: "none",
      borderRadius: "50%",
      width: 30,
      height: 30,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: "white",
      fontSize: 16,
      fontWeight: 700
    }
  }, "\u203A")), lancMes.length === 0 ? React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, React.createElement(Icon, {
    name: "dollar-sign",
    size: 40
  }), React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, "Nenhum lan\xE7amento em ", new Date(mesFiltro + "-15").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  }))) : (() => {
    const receitas = lancMes.filter(l => l.tipo_lancamento !== "despesa");
    const despesas = lancMes.filter(l => l.tipo_lancamento === "despesa");
    const totalRec = calcReceitas(lancMes);
    const totalDesp = calcDespesas(lancMes);
    const saldo = totalRec - totalDesp;
    function TabelaLanc({
      itens,
      titulo,
      corHeader,
      corValor,
      bgHeader
    }) {
      if (!itens.length) return null;
      return React.createElement("div", {
        className: "card",
        style: {
          padding: 0,
          marginBottom: 16
        }
      }, React.createElement("div", {
        style: {
          padding: "10px 16px",
          background: bgHeader,
          borderBottom: "2px solid " + corHeader,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }
      }, React.createElement("span", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: corHeader
        }
      }, titulo), React.createElement("span", {
        style: {
          fontWeight: 800,
          fontSize: 14,
          color: corHeader
        }
      }, itens.reduce((a, l) => a + (parseFloat(l.valor) || 0), 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      }))), React.createElement("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13
        }
      }, React.createElement("thead", null, React.createElement("tr", {
        style: {
          background: "var(--gray-50)"
        }
      }, ["Data", "Descrição", "Categoria", "Forma Pag.", "Valor", "Status", "Ações"].map(h => React.createElement("th", {
        key: h,
        style: {
          padding: "8px 14px",
          textAlign: "left",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted)",
          borderBottom: "1px solid var(--gray-200)",
          whiteSpace: "nowrap"
        }
      }, h)))), React.createElement("tbody", null, itens.map(l => {
        const isFut = l.data > new Date().toISOString().slice(0, 10);
        const statusColor = l.status === "recebido" || l.status === "pago" ? "#059669" : l.status === "planejado" ? "#0891b2" : "#d97706";
        const statusBg = l.status === "recebido" || l.status === "pago" ? "#d1fae5" : l.status === "planejado" ? "#e0f2fe" : "#fef3c7";
        const statusLabel = l.status === "recebido" ? "✓ Recebido" : l.status === "pago" ? "✓ Pago" : l.status === "planejado" ? "📅 Planejado" : "Pendente";
        return React.createElement("tr", {
          key: l.id,
          style: {
            borderBottom: "1px solid var(--gray-100)",
            background: isFut ? "#fafafa" : "white",
            opacity: isFut ? 0.85 : 1
          }
        }, React.createElement("td", {
          style: {
            padding: "8px 14px",
            whiteSpace: "nowrap",
            fontSize: 12
          }
        }, l.data ? new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR") : "—", isFut && React.createElement("span", {
          style: {
            marginLeft: 4,
            fontSize: 9,
            color: "#0891b2",
            fontWeight: 600
          }
        }, "futuro")), React.createElement("td", {
          style: {
            padding: "8px 14px",
            maxWidth: 320
          }
        }, React.createElement("div", {
          style: {
            fontWeight: 500,
            fontSize: 13,
            lineHeight: 1.4
          }
        }, l.descricao || l.tipo || l.pacienteNome || "—"), React.createElement("div", {
          style: {
            display: "flex",
            gap: 4,
            marginTop: 3,
            flexWrap: "wrap"
          }
        }, l.tipo_lancamento === "pacote" && React.createElement("span", {
          style: {
            background: "var(--purple-soft)",
            color: "var(--purple)",
            borderRadius: 20,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 600
          }
        }, "Pacote"), l.tipo_lancamento === "sessao" && React.createElement("span", {
          style: {
            background: "#e0f2fe",
            color: "#0891b2",
            borderRadius: 20,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 600
          }
        }, "Sess\xE3o"), (l.pagamentosExtras || []).length > 0 && React.createElement("span", {
          style: {
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: 20,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 600
          }
        }, "\uD83D\uDCB3 ", (l.pagamentosExtras || []).length, "x forma", (l.pagamentosExtras || []).length > 1 ? "s" : ""))), React.createElement("td", {
          style: {
            padding: "8px 14px",
            fontSize: 12,
            color: "var(--text-muted)"
          }
        }, l.categoria || "—"), React.createElement("td", {
          style: {
            padding: "8px 14px"
          }
        }, React.createElement("span", {
          style: {
            background: "#f3f4f6",
            borderRadius: 6,
            padding: "2px 6px",
            fontSize: 11
          }
        }, l.formaPag || "—")), React.createElement("td", {
          style: {
            padding: "8px 14px",
            fontWeight: 700,
            color: corValor,
            whiteSpace: "nowrap"
          }
        }, (parseFloat(l.valor) || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })), React.createElement("td", {
          style: {
            padding: "8px 14px"
          }
        }, React.createElement("span", {
          style: {
            background: statusBg,
            color: statusColor,
            borderRadius: 20,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600
          }
        }, statusLabel)), React.createElement("td", {
          style: {
            padding: "8px 14px"
          }
        }, React.createElement("div", {
          style: {
            display: "flex",
            gap: 4
          }
        }, l.tipo_lancamento === "pacote" ? React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            padding: "4px 8px",
            fontSize: 11,
            color: "var(--purple)"
          },
          onClick: () => {
            setPacoteSelecionado(l.pacoteId);
            setAba("pacotes");
          }
        }, React.createElement(Icon, {
          name: "clipboard-list",
          size: 12
        })) : React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            padding: "4px 8px",
            fontSize: 11,
            color: "var(--purple)"
          },
          onClick: () => abrirEditar(l)
        }, React.createElement(Icon, {
          name: "pencil",
          size: 12
        })), React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            padding: "4px 8px",
            fontSize: 11,
            color: "#dc2626"
          },
          onClick: () => setModalExcluirLanc(l)
        }, React.createElement(Icon, {
          name: "trash-2",
          size: 12
        })))));
      }))));
    }
    return React.createElement("div", null, React.createElement(TabelaLanc, {
      itens: receitas,
      titulo: "\uD83D\uDCB0 Receitas",
      corHeader: "#059669",
      corValor: "#059669",
      bgHeader: "#f0fdf4"
    }), React.createElement(TabelaLanc, {
      itens: despesas,
      titulo: "\uD83D\uDCB8 Despesas",
      corHeader: "#dc2626",
      corValor: "#dc2626",
      bgHeader: "#fff1f2"
    }), React.createElement("div", {
      style: {
        background: "white",
        borderRadius: 12,
        border: "1px solid var(--gray-200)",
        padding: "14px 20px",
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        alignItems: "center"
      }
    }, React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: 2
      }
    }, "Receitas"), React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: "#059669"
      }
    }, totalRec.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }))), React.createElement("div", {
      style: {
        fontSize: 20,
        color: "var(--text-muted)"
      }
    }, "\u2212"), React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: 2
      }
    }, "Despesas"), React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: "#dc2626"
      }
    }, totalDesp.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }))), React.createElement("div", {
      style: {
        fontSize: 20,
        color: "var(--text-muted)"
      }
    }, "="), React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: 2
      }
    }, "Saldo do M\xEAs"), React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: saldo >= 0 ? "#059669" : "#dc2626"
      }
    }, saldo.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })))));
  })(), modalExcluirLanc && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 600,
      padding: 20
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 420,
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 32,
      marginBottom: 12
    }
  }, "\uD83D\uDDD1\uFE0F"), React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 17,
      fontWeight: 600,
      marginBottom: 6
    }
  }, modalExcluirLanc.tipo), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 20
    }
  }, modalExcluirLanc.data ? new Date(modalExcluirLanc.data + "T00:00:00").toLocaleDateString("pt-BR") : ""), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginBottom: 14
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #e5e7eb",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: async () => {
      await db.collection("clinica_lancamentos").doc(modalExcluirLanc.id).delete();
      setModalExcluirLanc(null);
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "S\xF3 este lan\xE7amento"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280"
    }
  }, "Remove apenas ", new Date(modalExcluirLanc.data + "T00:00:00").toLocaleDateString("pt-BR", {
    month: "long"
  }))), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #fbbf24",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: async () => {
      const chave = modalExcluirLanc.descricaoRecorrente || modalExcluirLanc.tipo;
      const snap = await db.collection("clinica_lancamentos").get();
      const futuros = snap.docs.filter(d => {
        const dd = d.data();
        return (dd.descricaoRecorrente === chave || dd.tipo === chave) && dd.data >= modalExcluirLanc.data;
      });
      const b = db.batch();
      futuros.forEach(d => b.delete(d.ref));
      await b.commit();
      setModalExcluirLanc(null);
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#d97706"
    }
  }, "Este e todos os futuros"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280"
    }
  }, "Remove \"", modalExcluirLanc.tipo, "\" a partir de ", new Date(modalExcluirLanc.data + "T00:00:00").toLocaleDateString("pt-BR", {
    month: "long"
  }))), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #fca5a5",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: async () => {
      const chave = modalExcluirLanc.descricaoRecorrente || modalExcluirLanc.tipo;
      const snap = await db.collection("clinica_lancamentos").get();
      const todos = snap.docs.filter(d => {
        const dd = d.data();
        return dd.descricaoRecorrente === chave || dd.tipo === chave;
      });
      const b = db.batch();
      todos.forEach(d => b.delete(d.ref));
      await b.commit();
      setModalExcluirLanc(null);
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#dc2626"
    }
  }, "Todos \u2014 o ano inteiro"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280"
    }
  }, "Remove todos os meses de \"", modalExcluirLanc.tipo, "\""))), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      width: "100%"
    },
    onClick: () => setModalExcluirLanc(null)
  }, "Cancelar")))), aba === "pacotes" && React.createElement("div", null, pacotes.length === 0 ? React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 60
    }
  }, React.createElement(Icon, {
    name: "package",
    size: 48
  }), React.createElement("div", {
    style: {
      marginTop: 12,
      fontWeight: 500
    }
  }, "Nenhum pacote criado ainda"), React.createElement("button", {
    className: "btn btn-purple",
    style: {
      marginTop: 16
    },
    onClick: () => setModal("pacote")
  }, "+ Criar Pacote")) : (() => {
    const pacientesComPacote = [...new Set(pacotes.map(p => p.pacienteId))];
    const pacientesVisiveis = buscaPac.trim() ? pacientesComPacote.filter(id => {
      const pac = pacientes.find(p => p.id === id);
      const inicial = (pac?.nome || "?")[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return inicial === buscaPac;
    }) : pacientesComPacote;
    return React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 28
      }
    }, (() => {
      const letrasComPac = [...new Set(pacientesComPacote.map(id => {
        const pac = pacientes.find(p => p.id === id);
        return (pac?.nome || "?")[0].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      }))].sort();
      return React.createElement("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginBottom: 12
        }
      }, buscaPac && React.createElement("button", {
        onClick: () => setBuscaPac(""),
        style: {
          padding: "4px 12px",
          borderRadius: 20,
          border: "1.5px solid #7B00C4",
          background: "#7B00C4",
          color: "white",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer"
        }
      }, "Todos"), letrasComPac.map(letra => React.createElement("button", {
        key: letra,
        onClick: () => setBuscaPac(buscaPac === letra ? "" : letra),
        style: {
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1.5px solid",
          borderColor: buscaPac === letra ? "#7B00C4" : "#e8c8ff",
          background: buscaPac === letra ? "#7B00C4" : "white",
          color: buscaPac === letra ? "white" : "#7B00C4",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0
        }
      }, letra)));
    })(), pacientesVisiveis.map(pacId => {
      const pac = pacientes.find(p => p.id === pacId);
      const pacotesDoPac = pacotes.filter(p => p.pacienteId === pacId).sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
      return React.createElement("div", {
        key: pacId
      }, React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: "2px solid var(--purple-soft)"
        }
      }, React.createElement("div", {
        style: {
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "var(--purple)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 600,
          flexShrink: 0
        }
      }, (pac?.nome || "?")[0].toUpperCase()), React.createElement("div", null, React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 16
        }
      }, pac?.nome || pacotesDoPac[0]?.pacienteNome || "—"), React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--text-muted)"
        }
      }, pacotesDoPac.length, " pacote(s)")), React.createElement("button", {
        className: "btn btn-outline",
        style: {
          marginLeft: "auto",
          fontSize: 12
        },
        onClick: () => setPacoteSelecionado(pacId)
      }, React.createElement(Icon, {
        name: "bar-chart-2",
        size: 13
      }), " Acompanhamento")), React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10
        }
      }, pacotesDoPac.map(p => {
        const sessPac = sessoes.filter(s => s.pacoteId === p.id);
        const realizadas = sessPac.filter(s => s.status === "realizado").length;
        const pagas = sessPac.filter(s => s.pagamento === "pago").length;
        const pct = Math.round(realizadas / (p.totalSessoes || 1) * 100);
        const lancsPac = lancamentos.filter(l => l.pacoteId === p.id);
        const totalPago = lancsPac.filter(l => l.status === "recebido").reduce((a, l) => a + (l.valor || 0), 0);
        const isPago = p.statusPag === "recebido";
        const dataStr = p.dataInicio ? new Date(p.dataInicio + "T00:00:00").toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit"
        }) : "—";
        return React.createElement("div", {
          key: p.id,
          style: {
            borderRadius: 12,
            border: "1px solid #e8c8ff",
            background: "white",
            padding: "14px 16px",
            marginBottom: 10,
            boxShadow: "0 1px 3px #0001"
          }
        }, React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 10
          }
        }, React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8
          }
        }, React.createElement("div", {
          style: {
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isPago ? "#22c55e" : "#f59e0b",
            flexShrink: 0,
            marginTop: 2
          }
        }), React.createElement("div", null, React.createElement("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            color: "#3d006a"
          }
        }, p.obs || p.recorrencia || "Pacote"), React.createElement("div", {
          style: {
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 1
          }
        }, p.recorrencia, p.horario && React.createElement("span", null, " \xB7 \uD83D\uDD50 ", p.horario), " \xB7 ", dataStr))), React.createElement("div", {
          style: {
            textAlign: "right"
          }
        }, React.createElement("div", {
          style: {
            fontWeight: 800,
            fontSize: 16,
            color: isPago ? "#22c55e" : "#f59e0b"
          }
        }, (p.valorTotal || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })), React.createElement("div", {
          style: {
            fontSize: 11,
            color: isPago ? "#22c55e" : "#f59e0b",
            fontWeight: 600
          }
        }, isPago ? "✓ Recebido" : "⏳ Pendente", p.formaPag && React.createElement("span", {
          style: {
            fontWeight: 400,
            color: "var(--text-muted)"
          }
        }, " \xB7 ", p.formaPag)))), React.createElement("div", {
          style: {
            marginBottom: 10
          }
        }, React.createElement("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 4
          }
        }, React.createElement("span", null, realizadas, " realizadas de ", p.totalSessoes, " \xB7 ", pagas, " pagas"), React.createElement("span", {
          style: {
            fontWeight: 600,
            color: "var(--purple)"
          }
        }, pct, "%")), React.createElement("div", {
          style: {
            height: 6,
            background: "#e8c8ff",
            borderRadius: 10,
            overflow: "hidden"
          }
        }, React.createElement("div", {
          style: {
            width: pct + "%",
            height: "100%",
            background: "#7B00C4",
            borderRadius: 10,
            transition: "width .4s"
          }
        }))), (p.pagamentosExtras || []).length > 0 && React.createElement("div", {
          style: {
            marginBottom: 10,
            display: "flex",
            gap: 6,
            flexWrap: "wrap"
          }
        }, (p.pagamentosExtras || []).map((pg, i) => React.createElement("span", {
          key: i,
          style: {
            background: "#f3e6ff",
            borderRadius: 6,
            padding: "2px 8px",
            fontSize: 11,
            color: "#6b7280"
          }
        }, "\uD83D\uDCB3 ", pg.forma || "?", " R$", parseFloat(pg.valor || 0).toFixed(2).replace(".", ","), " \xB7 ", pg.data ? new Date(pg.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"))), React.createElement("div", {
          style: {
            display: "flex",
            gap: 6,
            flexWrap: "wrap"
          }
        }, React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 12,
            padding: "6px 12px",
            color: "var(--purple)",
            border: "1px solid #d9b3f5"
          },
          onClick: e => {
            e.stopPropagation();
            setPacoteSelecionado(p.id + "__pacote");
          }
        }, React.createElement(Icon, {
          name: "edit-3",
          size: 13
        }), " Editar"), React.createElement("button", {
          className: "btn btn-purple",
          style: {
            fontSize: 12,
            padding: "6px 12px"
          },
          onClick: e => {
            e.stopPropagation();
            setPacoteSelecionado(p.id + "__sessoes");
          }
        }, React.createElement(Icon, {
          name: "clipboard-list",
          size: 13
        }), " Sess\xF5es"), React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 12,
            padding: "6px 12px",
            color: "#dc2626",
            marginLeft: "auto"
          },
          onClick: async e => {
            e.stopPropagation();
            if (!confirm("Excluir pacote e TODAS as sessões e lançamentos vinculados? Esta ação não pode ser desfeita.")) return;
            try {
              const [snapSess, snapLanc] = await Promise.all([db.collection("clinica_sessoes").where("pacoteId", "==", p.id).get(), db.collection("clinica_lancamentos").where("pacoteId", "==", p.id).get()]);
              const b = db.batch();
              snapSess.docs.forEach(d => b.delete(d.ref));
              snapLanc.docs.forEach(d => b.delete(d.ref));
              b.delete(db.collection("clinica_pacotes").doc(p.id));
              await b.commit();
            } catch (e) {
              alert("Erro ao excluir pacote: " + e.message);
            }
          }
        }, React.createElement(Icon, {
          name: "trash-2",
          size: 13
        }), " Excluir")));
      })));
    }));
  })()), aba === "acompanhamento" && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Clique em um paciente para abrir o Controle de Sess\xF5es e Frequ\xEAncia completo."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(pac => {
    const sessPac = sessoes.filter(s => s.pacienteId === pac.id);
    const pacotesPac = pacotes.filter(p => p.pacienteId === pac.id);
    if (pacotesPac.length === 0) return null;
    const totalSessoes = sessPac.length;
    const realizadas = sessPac.filter(s => s.status === "realizado" || s.status === "remarcado").length;
    const pagas = sessPac.filter(s => s.pagamento === "pago").length;
    const pendentes = sessPac.filter(s => s.pagamento !== "pago" && s.status !== "cancelado" && s.status !== "remarcado").length;
    const recebido = sessPac.filter(s => s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
    const aReceber = sessPac.filter(s => s.pagamento !== "pago" && s.status !== "cancelado" && s.status !== "remarcado").reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0);
    return React.createElement("div", {
      key: pac.id,
      className: "card",
      style: {
        padding: "14px 20px",
        cursor: "pointer",
        marginBottom: 10,
        transition: "box-shadow .15s"
      },
      onClick: () => setPacoteSelecionado(pac.id),
      onMouseEnter: e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(123,0,196,0.12)",
      onMouseLeave: e => e.currentTarget.style.boxShadow = ""
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "var(--purple)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: 600,
        flexShrink: 0
      }
    }, (pac.nome || "?")[0].toUpperCase()), React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14
      }
    }, pac.nome), React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, pacotesPac[0]?.recorrencia, " \xB7 ", pacotesPac[0]?.horario)), React.createElement("div", {
      style: {
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap"
      }
    }, React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "var(--purple)"
      }
    }, realizadas, "/", totalSessoes), React.createElement("div", {
      style: {
        fontSize: 10,
        color: "var(--text-muted)"
      }
    }, "Sess\xF5es")), React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#059669"
      }
    }, recebido.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), React.createElement("div", {
      style: {
        fontSize: 10,
        color: "var(--text-muted)"
      }
    }, "Recebido")), aReceber > 0 && React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#d97706"
      }
    }, aReceber.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), React.createElement("div", {
      style: {
        fontSize: 10,
        color: "var(--text-muted)"
      }
    }, "A Receber")), React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, pendentes > 0 && React.createElement("span", {
      style: {
        background: "#fef3c7",
        color: "#b45309",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 600
      }
    }, pendentes, " pendente(s)"), pendentes === 0 && React.createElement("span", {
      style: {
        background: "#d1fae5",
        color: "#065f46",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 600
      }
    }, "\u2713 Em dia")), React.createElement(Icon, {
      name: "chevron-right",
      size: 16,
      style: {
        color: "var(--text-muted)"
      }
    }))));
  })), modal === "escolha" && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 32,
      width: "100%",
      maxWidth: 420,
      textAlign: "center"
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Novo Lan\xE7amento"), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 24
    }
  }, "Escolha o tipo de lan\xE7amento:"), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, React.createElement("button", {
    className: "btn btn-outline",
    style: {
      width: "100%",
      padding: "20px 20px",
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 16,
      textAlign: "left"
    },
    onClick: () => setModal("pacote")
  }, React.createElement("span", {
    style: {
      fontSize: 32,
      flexShrink: 0
    }
  }, "\uD83D\uDCE6"), React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "var(--purple)"
    }
  }, "Pacote de Sess\xF5es"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      lineHeight: 1.5,
      marginTop: 2
    }
  }, "Gera sess\xF5es recorrentes na agenda com ficha de frequ\xEAncia, controle de pagamento e formas mistas"))), React.createElement("button", {
    className: "btn btn-outline",
    style: {
      width: "100%",
      padding: "20px 20px",
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 16,
      textAlign: "left"
    },
    onClick: () => setModal("avulso")
  }, React.createElement("span", {
    style: {
      fontSize: 32,
      flexShrink: 0
    }
  }, "\uD83D\uDCB2"), React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#059669"
    }
  }, "Lan\xE7amento Avulso"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      lineHeight: 1.5,
      marginTop: 2
    }
  }, "Sess\xE3o \xFAnica, avalia\xE7\xE3o, neuromodula\xE7\xE3o ou outro servi\xE7o isolado")))), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      width: "100%",
      marginTop: 12
    },
    onClick: () => setModal(false)
  }, "Cancelar"))), modal === "avulso" && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, editando ? "Editar Lançamento" : "Lançamento Avulso"), React.createElement("button", {
    onClick: () => {
      setModal(false);
      setEditando(null);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 12
    }
  }, React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Paciente / Cliente"), React.createElement("select", {
    className: "form-input",
    value: formAvulso.pacienteId,
    onChange: e => {
      const pac = pacientes.find(p => p.id === e.target.value);
      setFormAvulso({
        ...formAvulso,
        pacienteId: e.target.value,
        pacienteNome: pac?.nome || "",
        obs: pac ? `${formAvulso.tipo} — ${pac.nome}` : formAvulso.obs
      });
    }
  }, React.createElement("option", {
    value: ""
  }, "Selecionar..."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.nome)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Tipo / Categoria"), React.createElement("select", {
    className: "form-input",
    value: formAvulso.tipo,
    onChange: e => {
      const pac = pacientes.find(p => p.id === formAvulso.pacienteId);
      setFormAvulso({
        ...formAvulso,
        tipo: e.target.value,
        obs: pac ? `${e.target.value} — ${pac.nome}` : formAvulso.obs
      });
    }
  }, ["Consulta", "Sessão", "Avaliação", "Musicoterapia", "Neuromodulação", "Orientação", "Laudo", "Outro"].map(t => React.createElement("option", {
    key: t
  }, t)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Valor R$"), React.createElement("input", {
    className: "form-input",
    type: "number",
    placeholder: "0,00",
    value: formAvulso.valor,
    onChange: e => setFormAvulso({
      ...formAvulso,
      valor: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formAvulso.data,
    onChange: e => setFormAvulso({
      ...formAvulso,
      data: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento"), React.createElement("select", {
    className: "form-input",
    value: formAvulso.formaPag,
    onChange: e => setFormAvulso({
      ...formAvulso,
      formaPag: e.target.value
    })
  }, FORMAS.map(f => React.createElement("option", {
    key: f
  }, f)))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Status"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["pendente", "Pendente", "#d97706"], ["recebido", "✓ Recebido", "#059669"]].map(([v, l, c]) => React.createElement("button", {
    key: v,
    onClick: () => setFormAvulso({
      ...formAvulso,
      status: v
    }),
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formAvulso.status === v ? c : "#e5e7eb",
      background: formAvulso.status === v ? c + "15" : "white",
      color: formAvulso.status === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Observa\xE7\xF5es"), React.createElement("input", {
    className: "form-input",
    placeholder: "Opcional...",
    value: formAvulso.obs,
    onChange: e => setFormAvulso({
      ...formAvulso,
      obs: e.target.value
    })
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, "Cancelar"), editando ? React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => salvarAvulso(null),
    disabled: salvando
  }, React.createElement(Icon, {
    name: "save",
    size: 15
  }), " ", salvando ? "Salvando..." : "Salvar Alterações") : React.createElement(React.Fragment, null, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => salvarAvulso(null),
    disabled: salvando,
    style: {
      border: "1px solid #e5e7eb",
      color: "#6b7280",
      fontSize: 12
    },
    title: "Sem comiss\xE3o \u2014 para lan\xE7amentos passados"
  }, "\uD83D\uDCCB Sem comiss\xE3o"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => salvarAvulso("primeira"),
    disabled: salvando,
    style: {
      background: "#7B00C4"
    },
    title: "10% de comiss\xE3o"
  }, "\uD83C\uDF1F Primeira Venda"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => salvarAvulso("recorrente"),
    disabled: salvando,
    style: {
      background: "#0891b2"
    },
    title: "5% de comiss\xE3o"
  }, "\uD83D\uDD01 Venda Recorrente"))))), modal === "editar-despesa" && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      color: "#dc2626"
    }
  }, "\u270F\uFE0F Editar Despesa"), React.createElement("button", {
    onClick: () => {
      setModal(false);
      setEditando(null);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 12
    }
  }, React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Descri\xE7\xE3o"), React.createElement("input", {
    className: "form-input",
    placeholder: "Ex: Consult\xF3rio loca\xE7\xE3o",
    value: formDespesaEdit.descricao,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      descricao: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Categoria"), React.createElement("select", {
    className: "form-input",
    value: formDespesaEdit.categoria,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      categoria: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Selecionar..."), CATS_DESPESA.map(c => React.createElement("option", {
    key: c
  }, c)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Valor R$"), React.createElement("input", {
    className: "form-input",
    type: "number",
    placeholder: "0,00",
    value: formDespesaEdit.valor,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      valor: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formDespesaEdit.data,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      data: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento"), React.createElement("select", {
    className: "form-input",
    value: formDespesaEdit.formaPag,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      formaPag: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "\u2014"), FORMAS.map(f => React.createElement("option", {
    key: f
  }, f)))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Status"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["pago", "✓ Pago", "#059669"], ["pendente", "Pendente", "#d97706"]].map(([v, l, c]) => React.createElement("button", {
    key: v,
    onClick: () => setFormDespesaEdit({
      ...formDespesaEdit,
      status: v
    }),
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formDespesaEdit.status === v ? c : "#e5e7eb",
      background: formDespesaEdit.status === v ? c + "15" : "white",
      color: formDespesaEdit.status === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Observa\xE7\xF5es"), React.createElement("input", {
    className: "form-input",
    placeholder: "Opcional...",
    value: formDespesaEdit.obs,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      obs: e.target.value
    })
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    style: {
      background: "#dc2626"
    },
    onClick: salvarDespesaEdit,
    disabled: salvando
  }, React.createElement(Icon, {
    name: "save",
    size: 15
  }), " ", salvando ? "Salvando..." : "Salvar Alterações")))), modal === "pacote" && (() => {
    const DIAS = [{
      v: "0",
      l: "Dom"
    }, {
      v: "1",
      l: "Seg"
    }, {
      v: "2",
      l: "Ter"
    }, {
      v: "3",
      l: "Qua"
    }, {
      v: "4",
      l: "Qui"
    }, {
      v: "5",
      l: "Sex"
    }, {
      v: "6",
      l: "Sáb"
    }];
    const needDias = ["2x por semana", "3x por semana"].includes(formPacote.recorrencia);
    const maxDias = formPacote.recorrencia === "3x por semana" ? 3 : 2;
    const diasSel = formPacote.diasSemana || [];
    function toggleDia(v) {
      if (diasSel.includes(v)) {
        setFormPacote({
          ...formPacote,
          diasSemana: diasSel.filter(d => d !== v)
        });
      } else if (diasSel.length < maxDias) {
        setFormPacote({
          ...formPacote,
          diasSemana: [...diasSel, v].sort()
        });
      }
    }
    return React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        padding: 20
      },
      onClick: () => setModal(false)
    }, React.createElement("div", {
      style: {
        background: "white",
        borderRadius: 16,
        padding: 28,
        width: "100%",
        maxWidth: 560,
        maxHeight: "90vh",
        overflowY: "auto"
      },
      onClick: e => e.stopPropagation()
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16
      }
    }, React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 20,
        fontWeight: 600
      }
    }, "Novo Pacote de Sess\xF5es"), React.createElement("button", {
      onClick: () => setModal(false),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer"
      }
    }, React.createElement(Icon, {
      name: "x",
      size: 20
    }))), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 12
      }
    }, React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, React.createElement("label", {
      className: "form-label"
    }, "Paciente *"), React.createElement("select", {
      className: "form-input",
      value: formPacote.pacienteId,
      onChange: e => setFormPacote({
        ...formPacote,
        pacienteId: e.target.value
      })
    }, React.createElement("option", {
      value: ""
    }, "Selecionar..."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => React.createElement("option", {
      key: p.id,
      value: p.id
    }, p.nome)))), React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "N\xBA de Sess\xF5es *"), React.createElement("input", {
      className: "form-input",
      type: "number",
      min: "1",
      max: "40",
      placeholder: "Ex: 10",
      value: formPacote.totalSessoes,
      onChange: e => setFormPacote({
        ...formPacote,
        totalSessoes: e.target.value
      })
    })), React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Recorr\xEAncia *"), React.createElement("select", {
      className: "form-input",
      value: formPacote.recorrencia,
      onChange: e => setFormPacote({
        ...formPacote,
        recorrencia: e.target.value,
        diasSemana: [],
        horariosPorDia: {}
      })
    }, RECORRENCIAS.map(r => React.createElement("option", {
      key: r
    }, r)))), needDias && React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, React.createElement("label", {
      className: "form-label"
    }, "Dias da Semana * (escolha ", maxDias, ")"), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 4
      }
    }, DIAS.map(d => {
      const sel = diasSel.includes(d.v);
      const dis = !sel && diasSel.length >= maxDias;
      return React.createElement("div", {
        key: d.v,
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3
        }
      }, React.createElement("button", {
        type: "button",
        onClick: () => toggleDia(d.v),
        disabled: dis,
        style: {
          padding: "8px 14px",
          borderRadius: 10,
          border: "1.5px solid",
          borderColor: sel ? "var(--purple)" : "#e5e7eb",
          background: sel ? "var(--purple)" : "white",
          color: sel ? "white" : dis ? "#d1d5db" : "#374151",
          fontWeight: sel ? 700 : 400,
          cursor: dis ? "not-allowed" : "pointer",
          fontSize: 13,
          fontFamily: "var(--font-body)"
        }
      }, d.l), sel && React.createElement("input", {
        type: "time",
        value: (formPacote.horariosPorDia || {})[d.v] || formPacote.horario || "09:00",
        onChange: e => setFormPacote({
          ...formPacote,
          horariosPorDia: {
            ...(formPacote.horariosPorDia || {}),
            [d.v]: e.target.value
          }
        }),
        style: {
          fontSize: 11,
          border: "1px solid #e9d5ff",
          borderRadius: 6,
          padding: "3px 6px",
          width: 72,
          textAlign: "center",
          color: "var(--purple)",
          fontWeight: 600
        }
      }));
    }))), React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Data de In\xEDcio *"), React.createElement("input", {
      className: "form-input",
      type: "date",
      value: formPacote.dataInicio,
      onChange: e => setFormPacote({
        ...formPacote,
        dataInicio: e.target.value
      })
    })), React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Hor\xE1rio ", needDias ? "(padrão)" : ""), React.createElement("input", {
      className: "form-input",
      type: "time",
      value: formPacote.horario,
      onChange: e => setFormPacote({
        ...formPacote,
        horario: e.target.value
      })
    })), React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, React.createElement("label", {
      className: "form-label"
    }, "Tipo de Atendimento"), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, [["particular", "🏥 Particular"], ["social", "🌱 Social"], ["parceria", "🤝 Parceria"]].map(([v, l]) => React.createElement("button", {
      key: v,
      type: "button",
      onClick: () => setFormPacote({
        ...formPacote,
        tipoAtendimento: v,
        valorSessao: v === "social" ? "" : formPacote.valorSessao,
        valorSupervisaoSocial: v === "social" ? "40" : formPacote.valorSupervisaoSocial,
        valorEstagiariaSocial: v === "social" ? "20" : formPacote.valorEstagiariaSocial,
        percParceiro: v === "parceria" ? formPacote.percParceiro || "70" : formPacote.percParceiro
      }),
      style: {
        flex: 1,
        padding: "9px",
        borderRadius: 8,
        border: "2px solid",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 600,
        borderColor: (formPacote.tipoAtendimento || "particular") === v ? v === "social" ? "#0d9488" : v === "parceria" ? "#b45309" : "#7B00C4" : "#e5e7eb",
        background: (formPacote.tipoAtendimento || "particular") === v ? v === "social" ? "#ccfbf1" : v === "parceria" ? "#fef3c7" : "#f5f3ff" : "white",
        color: (formPacote.tipoAtendimento || "particular") === v ? v === "social" ? "#0d9488" : v === "parceria" ? "#b45309" : "#7B00C4" : "#6b7280"
      }
    }, l)))), (formPacote.tipoAtendimento || "particular") === "social" ? React.createElement(React.Fragment, null, React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Valor Supervis\xE3o (R$)"), React.createElement("input", {
      className: "form-input",
      type: "number",
      value: formPacote.valorSupervisaoSocial || "40",
      onChange: e => setFormPacote({
        ...formPacote,
        valorSupervisaoSocial: e.target.value
      })
    }), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 3
      }
    }, "Receita da cl\xEDnica")), React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Valor Estagi\xE1ria (R$)"), React.createElement("input", {
      className: "form-input",
      type: "number",
      value: formPacote.valorEstagiariaSocial || "20",
      onChange: e => setFormPacote({
        ...formPacote,
        valorEstagiariaSocial: e.target.value
      })
    }), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 3
      }
    }, "Comiss\xE3o estagi\xE1ria"))) : React.createElement(React.Fragment, null, React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Valor por Sess\xE3o (R$)"), React.createElement("input", {
      className: "form-input",
      type: "number",
      placeholder: "Ex: 250",
      value: formPacote.valorSessao,
      onChange: e => setFormPacote({
        ...formPacote,
        valorSessao: e.target.value
      })
    })), React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Total do Pacote (R$)"), React.createElement("input", {
      className: "form-input",
      type: "number",
      placeholder: "Autom\xE1tico",
      value: formPacote.valorSessao && formPacote.totalSessoes ? (parseFloat(formPacote.valorSessao) || 0) * (parseInt(formPacote.totalSessoes) || 0) : "",
      readOnly: true,
      style: {
        background: "#f9fafb"
      }
    })), (formPacote.tipoAtendimento || "particular") === "parceria" && React.createElement(React.Fragment, null, React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Parceira"), React.createElement("select", {
      className: "form-input",
      value: formPacote.parceiraId || "",
      onChange: e => {
        const p = parceiras.find(x => x.id === e.target.value);
        setFormPacote({
          ...formPacote,
          parceiraId: e.target.value,
          percParceiro: p && p.percentual ? String(p.percentual) : formPacote.percParceiro || "70"
        });
      }
    }, React.createElement("option", {
      value: ""
    }, "Selecione a parceira..."), parceiras.filter(p => p.tipo !== "estagiaria").map(p => React.createElement("option", {
      key: p.id,
      value: p.id
    }, p.nome))), parceiras.filter(p => p.tipo !== "estagiaria").length === 0 && React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#b45309",
        marginTop: 3
      }
    }, "Nenhuma parceira cadastrada \u2014 cadastre na tela Comiss\xF5es.")), React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "% do Parceiro"), React.createElement("input", {
      className: "form-input",
      type: "number",
      min: "0",
      max: "100",
      value: formPacote.percParceiro || "70",
      onChange: e => setFormPacote({
        ...formPacote,
        percParceiro: e.target.value
      })
    }), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 3
      }
    }, "Edit\xE1vel \u2014 padr\xE3o 70%")), formPacote.valorSessao && formPacote.totalSessoes && (() => {
      const tot = (parseFloat(formPacote.valorSessao) || 0) * (parseInt(formPacote.totalSessoes) || 0);
      const pp = parseFloat(formPacote.percParceiro) || 0;
      const vParc = tot * pp / 100;
      return React.createElement("div", {
        style: {
          gridColumn: "1/-1",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13
        }
      }, React.createElement("div", {
        style: {
          fontWeight: 700,
          color: "#b45309",
          marginBottom: 6
        }
      }, "\uD83E\uDD1D C\xE1lculo da parceria"), React.createElement("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 18px",
          color: "#374151"
        }
      }, React.createElement("span", null, "Total: ", React.createElement("strong", null, "R$ ", tot.toFixed(2).replace(".", ","))), React.createElement("span", null, "Repasse parceira (", pp, "%): ", React.createElement("strong", {
        style: {
          color: "#b45309"
        }
      }, "R$ ", vParc.toFixed(2).replace(".", ","))), React.createElement("span", null, "Cl\xEDnica antes da comiss\xE3o: ", React.createElement("strong", {
        style: {
          color: "#059669"
        }
      }, "R$ ", (tot - vParc).toFixed(2).replace(".", ",")))), React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#92400e",
          marginTop: 6
        }
      }, "A comiss\xE3o da secret\xE1ria (10% ou 5% sobre o total) \xE9 definida no bot\xE3o de salvar abaixo."));
    })())), React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, React.createElement("label", {
      className: "form-label"
    }, "Status do Pagamento"), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, [["pendente", "Pendente", "#d97706"], ["recebido", "✓ Recebido", "#059669"]].map(([v, l, c]) => React.createElement("button", {
      key: v,
      type: "button",
      onClick: () => setFormPacote({
        ...formPacote,
        statusPag: v
      }),
      style: {
        flex: 1,
        padding: "10px",
        borderRadius: 10,
        border: "1.5px solid",
        borderColor: (formPacote.statusPag || "pendente") === v ? c : "#e5e7eb",
        background: (formPacote.statusPag || "pendente") === v ? c + "15" : "white",
        color: (formPacote.statusPag || "pendente") === v ? c : "#6b7280",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "var(--font-body)"
      }
    }, l)))), React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Forma de Pagamento"), React.createElement("select", {
      className: "form-input",
      value: formPacote.formaPag || "",
      onChange: e => setFormPacote({
        ...formPacote,
        formaPag: e.target.value
      })
    }, React.createElement("option", {
      value: ""
    }, "Selecionar..."), FORMAS.map(f => React.createElement("option", {
      key: f
    }, f)))), React.createElement("div", {
      className: "form-group"
    }, React.createElement("label", {
      className: "form-label"
    }, "Data do Pagamento"), React.createElement("input", {
      className: "form-input",
      type: "date",
      value: formPacote.dataPagamento || "",
      onChange: e => setFormPacote({
        ...formPacote,
        dataPagamento: e.target.value
      })
    })), React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8
      }
    }, React.createElement("label", {
      className: "form-label",
      style: {
        margin: 0
      }
    }, "Formas de pagamento"), React.createElement("button", {
      type: "button",
      style: {
        fontSize: 12,
        color: "#7B00C4",
        background: "#f3e6ff",
        border: "1px solid #d9b3f5",
        borderRadius: 6,
        padding: "3px 10px",
        cursor: "pointer"
      },
      onClick: () => setFormPacote({
        ...formPacote,
        pagamentosExtras: [...(formPacote.pagamentosExtras || []), {
          forma: "",
          valor: "",
          data: new Date().toISOString().slice(0, 10)
        }]
      })
    }, "+ Adicionar forma")), (formPacote.pagamentosExtras || []).length === 0 && React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        fontStyle: "italic",
        padding: "6px 0"
      }
    }, "Clique em \"+ Adicionar forma\" para registrar PIX, cart\xE3o, dinheiro em datas diferentes."), (formPacote.pagamentosExtras || []).map((pg, i) => React.createElement("div", {
      key: i,
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr auto",
        gap: 6,
        marginBottom: 6,
        alignItems: "center"
      }
    }, React.createElement("select", {
      className: "form-input",
      style: {
        fontSize: 12
      },
      value: pg.forma,
      onChange: e => {
        const p = [...(formPacote.pagamentosExtras || [])];
        p[i] = {
          ...p[i],
          forma: e.target.value
        };
        setFormPacote({
          ...formPacote,
          pagamentosExtras: p
        });
      }
    }, React.createElement("option", {
      value: ""
    }, "Forma..."), FORMAS.map(f => React.createElement("option", {
      key: f
    }, f))), React.createElement("input", {
      className: "form-input",
      style: {
        fontSize: 12
      },
      type: "number",
      placeholder: "Valor R$",
      value: pg.valor,
      onChange: e => {
        const p = [...(formPacote.pagamentosExtras || [])];
        p[i] = {
          ...p[i],
          valor: e.target.value
        };
        setFormPacote({
          ...formPacote,
          pagamentosExtras: p
        });
      }
    }), React.createElement("input", {
      className: "form-input",
      style: {
        fontSize: 12
      },
      type: "date",
      value: pg.data,
      onChange: e => {
        const p = [...(formPacote.pagamentosExtras || [])];
        p[i] = {
          ...p[i],
          data: e.target.value
        };
        setFormPacote({
          ...formPacote,
          pagamentosExtras: p
        });
      }
    }), React.createElement("button", {
      type: "button",
      style: {
        color: "#dc2626",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 16,
        padding: "0 4px"
      },
      onClick: () => {
        const p = [...(formPacote.pagamentosExtras || [])];
        p.splice(i, 1);
        setFormPacote({
          ...formPacote,
          pagamentosExtras: p
        });
      }
    }, "\u2715")))), React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, React.createElement("label", {
      className: "form-label"
    }, "Observa\xE7\xF5es"), React.createElement(TextAreaVoz, {
      className: "form-input",
      rows: 2,
      value: formPacote.obs,
      onChange: e => setFormPacote({
        ...formPacote,
        obs: e.target.value
      }),
      placeholder: "Notas sobre o pacote..."
    }))), formPacote.totalSessoes && formPacote.dataInicio && React.createElement("div", {
      style: {
        background: "#f0fdf4",
        border: "1px solid #86efac",
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        fontSize: 13,
        color: "#065f46"
      }
    }, "\u2705 ", React.createElement("strong", null, formPacote.totalSessoes, " sess\xF5es"), " a partir de ", React.createElement("strong", null, new Date(formPacote.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")), " \xB7 ", React.createElement("strong", null, formPacote.recorrencia), needDias && diasSel.length > 0 && React.createElement("span", null, " \xB7 dias: ", React.createElement("strong", null, diasSel.map(d => DIAS_LABEL[d]).join(", ")))), React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        justifyContent: "flex-end",
        flexWrap: "wrap"
      }
    }, React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => setModal(false)
    }, "Cancelar"), React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => salvarPacote(null),
      disabled: salvando,
      style: {
        border: "1px solid #e5e7eb",
        color: "#6b7280",
        fontSize: 12
      },
      title: "Sem comiss\xE3o \u2014 para lan\xE7amentos passados"
    }, "\uD83D\uDCCB Sem comiss\xE3o"), React.createElement("button", {
      className: "btn btn-purple",
      onClick: () => salvarPacote("primeira"),
      disabled: salvando,
      style: {
        background: "#7B00C4"
      },
      title: "10% de comiss\xE3o"
    }, "\uD83C\uDF1F Primeira Venda"), React.createElement("button", {
      className: "btn btn-purple",
      onClick: () => salvarPacote("recorrente"),
      disabled: salvando,
      style: {
        background: "#0891b2"
      },
      title: "5% de comiss\xE3o"
    }, "\uD83D\uDD01 Venda Recorrente"))));
  })());
}
function FinanceiroPessoal({
  somenteLeitura = false
}) {
  const [lancamentos, setLancamentos] = useState([]);
  const [recorrentes, setRecorrentes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear() + "");
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState({
    nome: "",
    tipo: "despesa"
  });
  const [modalBaixa, setModalBaixa] = useState(null);
  const [formBaixa, setFormBaixa] = useState({
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    formaPag: "PIX",
    modo: "este"
  });
  const mesAtual = new Date().toISOString().slice(0, 7);
  const CATS_RECEITA_DEFAULT = ["Salário/Pró-labore", "Consultoria", "Aluguel Recebido", "Investimentos", "Dividendos", "Freelance", "Outros"];
  const CATS_DESPESA_DEFAULT = ["Aluguel", "Condomínio", "Alimentação", "Saúde", "Educação", "Transporte", "Lazer", "Assinaturas", "Cartão de Crédito", "Empréstimo/Financiamento", "Contador", "Impostos", "Marketing", "Ferramentas de IA", "Telefone/Internet", "Energia/Água", "Vestuário", "Viagem", "Outros"];
  const FORMAS = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Depósito", "Transferência", "Débito Automático", "Outro"];
  const RECORR = ["Mensal", "Semanal", "Quinzenal", "Bimestral", "Trimestral", "Semestral", "Anual"];
  const catsReceita = [...CATS_RECEITA_DEFAULT, ...categorias.filter(c => c.tipo === "receita").map(c => c.nome)];
  const catsDespesa = [...CATS_DESPESA_DEFAULT, ...categorias.filter(c => c.tipo === "despesa").map(c => c.nome)];
  const CENTROS_CUSTO = ["🏥 Clínica", "🎵 Ônix Brasil", "🎶 Flamboyant", "⭐ Estrelas", "🌱 Projetos Culturais", "📚 Consultorias & Cursos", "🏢 Administrativo", "🏠 Pessoal"];
  const [formAvulso, setFormAvulso] = useState({
    tipo: "despesa",
    categoria: "",
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    formaPag: "PIX",
    status: "pago",
    obs: "",
    centroCusto: "",
    parcelas: "1",
    totalParcelas: ""
  });
  const [formRecorr, setFormRecorr] = useState({
    tipo: "despesa",
    categoria: "",
    descricao: "",
    valorPrevisto: "",
    recorrencia: "Mensal",
    diaVencimento: "10",
    mesInicio: new Date().toISOString().slice(0, 7),
    ativo: true,
    centroCusto: ""
  });
  useEffect(() => {
    const u1 = db.collection("clinica_financeiro_pessoal").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
      setLancamentos(docs);
    }, () => {});
    const u2 = db.collection("clinica_fin_pessoal_recorrentes").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setRecorrentes(docs);
    }, () => {});
    const u3 = db.collection("clinica_fin_pessoal_categorias").onSnapshot(s => setCategorias(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);
  const anoAtualNum = new Date().getFullYear();
  const anosExist = [...new Set(lancamentos.map(l => l.data?.slice(0, 4)).filter(Boolean))].map(Number);
  const anosSet = new Set([...anosExist, anoAtualNum - 1, anoAtualNum, anoAtualNum + 1]);
  const anos = [...anosSet].sort().map(String);
  const mesesDisp = Array.from({
    length: 12
  }, (_, i) => `${anoFiltro}-${String(i + 1).padStart(2, "0")}`);
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro) ? mesFiltro : mesAtual.startsWith(anoFiltro) ? mesAtual : anoFiltro + "-01";
  const lancMes = lancamentos.filter(l => l.data?.startsWith(mesFiltroEfetivo));
  const lancAno = lancamentos.filter(l => l.data?.startsWith(anoFiltro));
  function fmt(v) {
    return (v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }
  function mesLabel(m) {
    try {
      return new Date(m + "-02").toLocaleDateString("pt-BR", {
        month: "short"
      });
    } catch (e) {
      return m;
    }
  }
  function calcRec(l) {
    return l.filter(x => x.tipo === "receita" && (x.status === "pago" || x.status === "recebido")).reduce((a, x) => a + (parseFloat(x.valor) || 0), 0);
  }
  function calcDesp(l) {
    return l.filter(x => x.tipo === "despesa" && (x.status === "pago" || x.status === "recebido")).reduce((a, x) => a + (parseFloat(x.valor) || 0), 0);
  }
  const recMes = calcRec(lancMes),
    despMes = calcDesp(lancMes),
    saldoMes = recMes - despMes;
  const recAno = calcRec(lancAno),
    despAno = calcDesp(lancAno);
  const pendMes = lancMes.filter(l => l.status === "pendente").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const corTipo = t => t === "receita" ? "#059669" : "#dc2626";
  const bgTipo = t => t === "receita" ? "#d1fae5" : "#fee2e2";
  const recorrAtivos = recorrentes.filter(r => r.ativo !== false);
  function jaDeuBaixaMes(r) {
    return lancamentos.some(l => l.recorrenteId === r.id && l.data?.startsWith(mesFiltroEfetivo));
  }
  async function salvarAvulso() {
    if (!formAvulso.valor || !formAvulso.data) {
      alert("Valor e data obrigatórios.");
      return;
    }
    setSalvando(true);
    const nParc = parseInt(formAvulso.parcelas) || 1;
    const val = parseFloat(formAvulso.valor);
    const base = {
      tipo: formAvulso.tipo,
      categoria: formAvulso.categoria,
      formaPag: formAvulso.formaPag,
      status: formAvulso.status,
      obs: formAvulso.obs,
      centroCusto: formAvulso.centroCusto || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editando) {
      await db.collection("clinica_financeiro_pessoal").doc(editando).update({
        ...base,
        descricao: formAvulso.descricao,
        valor: val,
        data: formAvulso.data,
        parcela: formAvulso.totalParcelas ? formAvulso.parcelas + "/" + formAvulso.totalParcelas : ""
      });
    } else if (nParc > 1) {
      const batch = db.batch();
      const [anoI, mesI, diaI] = formAvulso.data.split("-").map(Number);
      for (let i = 0; i < nParc; i++) {
        let m = mesI + i,
          a = anoI;
        while (m > 12) {
          m -= 12;
          a++;
        }
        const dataParc = `${a}-${String(m).padStart(2, "0")}-${String(diaI).padStart(2, "0")}`;
        const desc = (formAvulso.descricao || formAvulso.categoria || "") + ` (${i + 1}/${nParc})`;
        const ref = db.collection("clinica_financeiro_pessoal").doc();
        batch.set(ref, {
          ...base,
          descricao: desc,
          valor: val,
          data: dataParc,
          parcela: `${i + 1}/${nParc}`,
          parcelaGrupo: formAvulso.data + "-" + nParc
        });
      }
      await batch.commit();
    } else {
      await db.collection("clinica_financeiro_pessoal").add({
        ...base,
        descricao: formAvulso.descricao,
        valor: val,
        data: formAvulso.data
      });
    }
    setModal(false);
    setEditando(null);
    setFormAvulso({
      tipo: "despesa",
      categoria: "",
      descricao: "",
      valor: "",
      data: new Date().toISOString().slice(0, 10),
      formaPag: "PIX",
      status: "pago",
      obs: "",
      centroCusto: "",
      parcelas: "1",
      totalParcelas: ""
    });
    setSalvando(false);
  }
  async function salvarRecorrente() {
    if (!formRecorr.categoria || !formRecorr.valorPrevisto) {
      alert("Categoria e valor obrigatórios.");
      return;
    }
    setSalvando(true);
    const dados = {
      ...formRecorr,
      valorPrevisto: parseFloat(formRecorr.valorPrevisto),
      centroCusto: formRecorr.centroCusto || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editando) {
      await db.collection("clinica_fin_pessoal_recorrentes").doc(editando).update(dados);
    } else {
      await db.collection("clinica_fin_pessoal_recorrentes").add(dados);
    }
    setModal(false);
    setEditando(null);
    setFormRecorr({
      tipo: "despesa",
      categoria: "",
      descricao: "",
      valorPrevisto: "",
      recorrencia: "Mensal",
      diaVencimento: "10",
      mesInicio: new Date().toISOString().slice(0, 7),
      ativo: true,
      centroCusto: ""
    });
    setSalvando(false);
  }
  async function confirmarBaixa() {
    if (!formBaixa.valor) {
      alert("Digite o valor.");
      return;
    }
    setSalvando(true);
    const r = modalBaixa;
    const batch = db.batch();
    if (formBaixa.modo === "este") {
      const dia = r.diaVencimento || "10";
      const data = `${mesFiltroEfetivo}-${String(dia).padStart(2, "0")}`;
      const ref = db.collection("clinica_financeiro_pessoal").doc();
      batch.set(ref, {
        tipo: r.tipo,
        categoria: r.categoria,
        descricao: r.descricao || r.categoria,
        valor: parseFloat(formBaixa.valor),
        data,
        formaPag: formBaixa.formaPag,
        status: "pago",
        recorrenteId: r.id,
        centroCusto: r.centroCusto || "",
        obs: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      const [anoMes, mesMes] = mesFiltroEfetivo.split("-").map(Number);
      for (let m = mesMes; m <= 12; m++) {
        const mesStr = `${anoMes}-${String(m).padStart(2, "0")}`;
        const dia = r.diaVencimento || "10";
        const data = `${mesStr}-${String(dia).padStart(2, "0")}`;
        const jaExiste = lancamentos.some(l => l.recorrenteId === r.id && l.data?.startsWith(mesStr));
        if (!jaExiste) {
          const ref = db.collection("clinica_financeiro_pessoal").doc();
          batch.set(ref, {
            tipo: r.tipo,
            categoria: r.categoria,
            descricao: r.descricao || r.categoria,
            valor: parseFloat(formBaixa.valor),
            data,
            formaPag: formBaixa.formaPag,
            status: "pago",
            recorrenteId: r.id,
            obs: "Baixa automática — série",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
    await batch.commit();
    setModalBaixa(null);
    setFormBaixa({
      valor: "",
      data: new Date().toISOString().slice(0, 10),
      formaPag: "PIX",
      modo: "este"
    });
    setSalvando(false);
  }
  async function excluir(id) {
    if (!confirm("Excluir lançamento?")) return;
    await db.collection("clinica_financeiro_pessoal").doc(id).delete();
  }
  async function excluirRec(id) {
    if (!confirm("Excluir recorrente?")) return;
    await db.collection("clinica_fin_pessoal_recorrentes").doc(id).delete();
  }
  async function salvarCategoria() {
    if (!novaCategoria.nome.trim()) {
      alert("Digite o nome.");
      return;
    }
    await db.collection("clinica_fin_pessoal_categorias").add({
      ...novaCategoria,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setNovaCategoria({
      nome: "",
      tipo: "despesa"
    });
  }
  async function excluirCategoria(id) {
    if (!confirm("Excluir?")) return;
    await db.collection("clinica_fin_pessoal_categorias").doc(id).delete();
  }
  return React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 12
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "page-title"
  }, "Financeiro Pessoal"), React.createElement("div", {
    className: "page-subtitle"
  }, somenteLeitura ? "Visualização" : "Módulo Financeiro Completo")), !somenteLeitura && React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal("categoria")
  }, React.createElement(Icon, {
    name: "tag",
    size: 15
  }), " Categorias"), React.createElement("button", {
    className: "btn btn-outline",
    onClick: () => {
      setModal("recorrente");
      setEditando(null);
    }
  }, React.createElement(Icon, {
    name: "repeat",
    size: 15
  }), " + Recorrente"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      setModal("avulso");
      setEditando(null);
    }
  }, React.createElement(Icon, {
    name: "plus",
    size: 15
  }), " + Lan\xE7amento"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 14,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, "Ano:"), anos.map(a => React.createElement("button", {
    key: a,
    onClick: () => {
      setAnoFiltro(a);
      setMesFiltro(a === String(anoAtualNum) ? mesAtual : a + "-01");
    },
    style: {
      padding: "5px 16px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: anoFiltro === a ? "var(--purple)" : "#e5e7eb",
      background: anoFiltro === a ? "var(--purple)" : "white",
      color: anoFiltro === a ? "white" : "#6b7280",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, a, a === String(anoAtualNum) && React.createElement("span", {
    style: {
      marginLeft: 3,
      fontSize: 9
    }
  }, "\u25CF")))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 12,
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      background: saldoMes >= 0 ? "#d1fae5" : "#fee2e2",
      borderRadius: 12,
      padding: "14px 16px",
      border: "1.5px solid",
      borderColor: saldoMes >= 0 ? "#6ee7b7" : "#fca5a5"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: saldoMes >= 0 ? "#059669" : "#dc2626",
      marginBottom: 4
    }
  }, "Saldo (", mesLabel(mesFiltroEfetivo), ")"), React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: saldoMes >= 0 ? "#059669" : "#dc2626"
    }
  }, fmt(saldoMes)), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      marginTop: 2
    }
  }, "+", fmt(recMes), " / -", fmt(despMes))), React.createElement("div", {
    style: {
      background: "#fffbeb",
      borderRadius: 12,
      padding: "14px 16px",
      border: "1.5px solid #fcd34d"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#d97706",
      marginBottom: 4
    }
  }, "Pendente"), React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#d97706"
    }
  }, fmt(pendMes))), React.createElement("div", {
    style: {
      background: "#f0fdf4",
      borderRadius: 12,
      padding: "14px 16px",
      border: "1.5px solid #86efac"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#059669",
      marginBottom: 4
    }
  }, "Receitas (", anoFiltro, ")"), React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#059669"
    }
  }, fmt(recAno))), React.createElement("div", {
    style: {
      background: "#fef2f2",
      borderRadius: 12,
      padding: "14px 16px",
      border: "1.5px solid #fca5a5"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#dc2626",
      marginBottom: 4
    }
  }, "Despesas (", anoFiltro, ")"), React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#dc2626"
    }
  }, fmt(despAno)))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 24,
      overflowX: "auto",
      paddingBottom: 4
    }
  }, mesesDisp.map(m => React.createElement("button", {
    key: m,
    onClick: () => setMesFiltro(m),
    style: {
      padding: "5px 14px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: mesFiltroEfetivo === m ? "var(--purple)" : "#e5e7eb",
      background: mesFiltroEfetivo === m ? "var(--purple)" : "white",
      color: mesFiltroEfetivo === m ? "white" : "#6b7280",
      fontSize: 12,
      fontWeight: mesFiltroEfetivo === m ? 700 : 400,
      cursor: "pointer",
      flexShrink: 0
    }
  }, mesLabel(m)))), recorrAtivos.length > 0 && React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      marginBottom: 10,
      display: "flex",
      alignItems: "center",
      gap: 6,
      color: "var(--text-muted)"
    }
  }, React.createElement(Icon, {
    name: "repeat",
    size: 15
  }), " Recorrentes \u2014 ", mesLabel(mesFiltroEfetivo)), React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, recorrAtivos.map(r => {
    const baixaDone = jaDeuBaixaMes(r);
    return React.createElement("div", {
      key: r.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid var(--gray-100)"
      }
    }, React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 8,
        background: bgTipo(r.tipo),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, React.createElement(Icon, {
      name: r.tipo === "receita" ? "trending-up" : "trending-down",
      size: 16
    })), React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14
      }
    }, r.descricao || r.categoria), React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, r.categoria, " \xB7 vence dia ", r.diaVencimento, " \xB7 ", r.recorrencia, r.centroCusto ? " · " + r.centroCusto : "")), React.createElement("div", {
      style: {
        fontWeight: 700,
        color: corTipo(r.tipo),
        marginRight: 8
      }
    }, fmt(parseFloat(r.valorPrevisto) || 0)), baixaDone ? React.createElement("span", {
      style: {
        background: "#d1fae5",
        color: "#065f46",
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20
      }
    }, "\u2713 Pago") : !somenteLeitura && React.createElement("button", {
      className: "btn btn-purple",
      style: {
        fontSize: 12,
        padding: "6px 14px"
      },
      onClick: () => {
        setModalBaixa(r);
        setFormBaixa({
          valor: r.valorPrevisto || "",
          data: `${mesFiltroEfetivo}-${String(r.diaVencimento || 10).padStart(2, "0")}`,
          formaPag: "PIX",
          modo: "este"
        });
      }
    }, "Dar baixa"), !somenteLeitura && React.createElement("div", {
      style: {
        display: "flex",
        gap: 4
      }
    }, React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        padding: "4px 8px"
      },
      onClick: () => {
        setFormRecorr({
          tipo: r.tipo,
          categoria: r.categoria,
          descricao: r.descricao || "",
          valorPrevisto: r.valorPrevisto + "",
          recorrencia: r.recorrencia,
          diaVencimento: r.diaVencimento,
          mesInicio: r.mesInicio || mesAtual,
          ativo: r.ativo,
          centroCusto: r.centroCusto || ""
        });
        setEditando(r.id);
        setModal("recorrente");
      }
    }, React.createElement(Icon, {
      name: "pencil",
      size: 13
    })), React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        padding: "4px 8px",
        color: "var(--danger)"
      },
      onClick: () => excluirRec(r.id)
    }, React.createElement(Icon, {
      name: "trash-2",
      size: 13
    }))));
  }))), React.createElement("div", null, lancMes.filter(l => l.tipo === "receita").length > 0 && React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#059669",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(Icon, {
    name: "trending-up",
    size: 16
  }), " Receitas"), React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#059669"
    }
  }, fmt(recMes))), React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, lancMes.filter(l => l.tipo === "receita").map(l => React.createElement("div", {
    key: l.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: "#d1fae5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, React.createElement(Icon, {
    name: "arrow-down-left",
    size: 16
  })), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, l.descricao || l.categoria), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, l.categoria, " \xB7 ", l.data, l.formaPag ? " · " + l.formaPag : "", l.centroCusto ? " · " + l.centroCusto : "", l.parcela ? " · " + l.parcela : "")), React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#059669"
    }
  }, fmt(parseFloat(l.valor) || 0)), React.createElement("span", {
    style: {
      background: "#d1fae5",
      color: "#065f46",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 20
    }
  }, "\u2713 Recebido"), !somenteLeitura && React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px"
    },
    onClick: () => {
      setFormAvulso({
        tipo: l.tipo,
        categoria: l.categoria || "",
        descricao: l.descricao || "",
        valor: l.valor + "",
        data: l.data,
        formaPag: l.formaPag || "PIX",
        status: l.status,
        obs: l.obs || "",
        centroCusto: l.centroCusto || "",
        parcelas: "1",
        totalParcelas: l.parcela || ""
      });
      setEditando(l.id);
      setModal("avulso");
    }
  }, React.createElement(Icon, {
    name: "pencil",
    size: 13
  })), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px",
      color: "var(--danger)"
    },
    onClick: () => excluir(l.id)
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }))))))), lancMes.filter(l => l.tipo === "despesa").length > 0 && React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#dc2626",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(Icon, {
    name: "trending-down",
    size: 16
  }), " Despesas"), React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#dc2626"
    }
  }, fmt(despMes))), React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, lancMes.filter(l => l.tipo === "despesa").map(l => React.createElement("div", {
    key: l.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: "#fee2e2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, React.createElement(Icon, {
    name: "arrow-up-right",
    size: 16
  })), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, l.descricao || l.categoria), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, l.categoria, " \xB7 ", l.data, l.formaPag ? " · " + l.formaPag : "", l.centroCusto ? " · " + l.centroCusto : "", l.parcela ? " · " + l.parcela : "")), React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#dc2626"
    }
  }, fmt(parseFloat(l.valor) || 0)), React.createElement("span", {
    style: {
      background: l.status === "pago" ? "#d1fae5" : "#fef3c7",
      color: l.status === "pago" ? "#065f46" : "#92400e",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 20
    }
  }, l.status === "pago" ? "✓ Pago" : "Pendente"), !somenteLeitura && React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px"
    },
    onClick: () => {
      setFormAvulso({
        tipo: l.tipo,
        categoria: l.categoria || "",
        descricao: l.descricao || "",
        valor: l.valor + "",
        data: l.data,
        formaPag: l.formaPag || "PIX",
        status: l.status,
        obs: l.obs || "",
        centroCusto: l.centroCusto || "",
        parcelas: "1",
        totalParcelas: l.parcela || ""
      });
      setEditando(l.id);
      setModal("avulso");
    }
  }, React.createElement(Icon, {
    name: "pencil",
    size: 13
  })), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px",
      color: "var(--danger)"
    },
    onClick: () => excluir(l.id)
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }))))))), lancMes.length === 0 && recorrAtivos.length === 0 && React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 40,
      color: "var(--text-muted)"
    }
  }, React.createElement(Icon, {
    name: "wallet",
    size: 40
  }), React.createElement("div", {
    style: {
      marginTop: 12,
      fontWeight: 500
    }
  }, "Nenhum lan\xE7amento em ", mesLabel(mesFiltroEfetivo)), !somenteLeitura && React.createElement("div", {
    style: {
      fontSize: 13,
      marginTop: 6
    }
  }, "Use \"+ Lan\xE7amento\" ou \"+ Recorrente\" acima."))), modalBaixa && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModalBaixa(null)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 460
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 4
    }
  }, "Dar baixa \u2014 ", modalBaixa.descricao || modalBaixa.categoria), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Previsto: ", fmt(parseFloat(modalBaixa.valorPrevisto) || 0)), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 16
    }
  }, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Valor Real (R$)"), React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formBaixa.valor,
    onChange: e => setFormBaixa({
      ...formBaixa,
      valor: e.target.value
    }),
    autoFocus: true
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento"), React.createElement("select", {
    className: "form-input",
    value: formBaixa.formaPag,
    onChange: e => setFormBaixa({
      ...formBaixa,
      formaPag: e.target.value
    })
  }, FORMAS.map(f => React.createElement("option", {
    key: f
  }, f))))), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Aplicar para"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["este", "Só este mês", "#7B00C4"], ["proximos", "Este e os próximos (até dez.)", "#0891b2"]].map(([v, l, c]) => React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormBaixa({
      ...formBaixa,
      modo: v
    }),
    style: {
      flex: 1,
      padding: "10px 8px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formBaixa.modo === v ? c : "#e5e7eb",
      background: formBaixa.modo === v ? c + "15" : "white",
      color: formBaixa.modo === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "var(--font-body)",
      textAlign: "center"
    }
  }, l)))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalBaixa(null)
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: confirmarBaixa,
    disabled: salvando
  }, salvando ? "Salvando..." : "Confirmar Baixa")))), modal === "avulso" && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500,
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, editando ? "Editar" : "Novo", " Lan\xE7amento"), React.createElement("button", {
    onClick: () => {
      setModal(false);
      setEditando(null);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Tipo"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["receita", "↓ Receita", "#059669"], ["despesa", "↑ Despesa", "#dc2626"]].map(([v, l, c]) => React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormAvulso({
      ...formAvulso,
      tipo: v,
      categoria: ""
    }),
    style: {
      flex: 1,
      padding: 10,
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formAvulso.tipo === v ? c : "#e5e7eb",
      background: formAvulso.tipo === v ? c + "15" : "white",
      color: formAvulso.tipo === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Categoria"), React.createElement("select", {
    className: "form-input",
    value: formAvulso.categoria,
    onChange: e => setFormAvulso({
      ...formAvulso,
      categoria: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Selecionar..."), (formAvulso.tipo === "receita" ? catsReceita : catsDespesa).map(c => React.createElement("option", {
    key: c
  }, c)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Descri\xE7\xE3o"), React.createElement("input", {
    className: "form-input",
    value: formAvulso.descricao,
    onChange: e => setFormAvulso({
      ...formAvulso,
      descricao: e.target.value
    }),
    placeholder: "Ex: Conta de luz"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Valor (R$)"), React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formAvulso.valor,
    onChange: e => setFormAvulso({
      ...formAvulso,
      valor: e.target.value
    }),
    placeholder: "0,00"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formAvulso.data,
    onChange: e => setFormAvulso({
      ...formAvulso,
      data: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento"), React.createElement("select", {
    className: "form-input",
    value: formAvulso.formaPag,
    onChange: e => setFormAvulso({
      ...formAvulso,
      formaPag: e.target.value
    })
  }, FORMAS.map(f => React.createElement("option", {
    key: f
  }, f)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Centro de Custo"), React.createElement("select", {
    className: "form-input",
    value: formAvulso.centroCusto || "",
    onChange: e => setFormAvulso({
      ...formAvulso,
      centroCusto: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Nenhum"), CENTROS_CUSTO.map(c => React.createElement("option", {
    key: c
  }, c)))), !editando && React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Parcelas"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, React.createElement("input", {
    className: "form-input",
    type: "number",
    min: "1",
    max: "60",
    value: formAvulso.parcelas || "1",
    onChange: e => setFormAvulso({
      ...formAvulso,
      parcelas: e.target.value
    }),
    style: {
      width: 80
    }
  }), React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "\xD7 R$ ", formAvulso.valor || "0", " = ", React.createElement("strong", {
    style: {
      color: "var(--purple)"
    }
  }, "R$ ", ((parseFloat(formAvulso.valor) || 0) * (parseInt(formAvulso.parcelas) || 1)).toFixed(2).replace(".", ",")), " total")), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, (parseInt(formAvulso.parcelas) || 1) > 1 ? `Serão gerados ${formAvulso.parcelas} lançamentos — um por mês a partir de ${formAvulso.data || "hoje"}, cada um de R$ ${formAvulso.valor || "0"}.` : "Lançamento único. Aumente para gerar parcelas mensais automáticas.")), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Status"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["pago", formAvulso.tipo === "receita" ? "✓ Recebido" : "✓ Pago", "#059669"], ["pendente", "Pendente", "#d97706"]].map(([v, l, c]) => React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormAvulso({
      ...formAvulso,
      status: v
    }),
    style: {
      flex: 1,
      padding: 10,
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formAvulso.status === v ? c : "#e5e7eb",
      background: formAvulso.status === v ? c + "15" : "white",
      color: formAvulso.status === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Observa\xE7\xF5es"), React.createElement("input", {
    className: "form-input",
    value: formAvulso.obs || "",
    onChange: e => setFormAvulso({
      ...formAvulso,
      obs: e.target.value
    }),
    placeholder: "Opcional..."
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarAvulso,
    disabled: salvando
  }, salvando ? "Salvando..." : editando ? "Salvar" : "Lançar")))), modal === "recorrente" && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500,
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, editando ? "Editar" : "Novo", " Lan\xE7amento Recorrente"), React.createElement("button", {
    onClick: () => {
      setModal(false);
      setEditando(null);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Tipo"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["receita", "↓ Receita", "#059669"], ["despesa", "↑ Despesa", "#dc2626"]].map(([v, l, c]) => React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormRecorr({
      ...formRecorr,
      tipo: v,
      categoria: ""
    }),
    style: {
      flex: 1,
      padding: 10,
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formRecorr.tipo === v ? c : "#e5e7eb",
      background: formRecorr.tipo === v ? c + "15" : "white",
      color: formRecorr.tipo === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Categoria"), React.createElement("select", {
    className: "form-input",
    value: formRecorr.categoria,
    onChange: e => setFormRecorr({
      ...formRecorr,
      categoria: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Selecionar..."), (formRecorr.tipo === "receita" ? catsReceita : catsDespesa).map(c => React.createElement("option", {
    key: c
  }, c)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Descri\xE7\xE3o"), React.createElement("input", {
    className: "form-input",
    value: formRecorr.descricao || "",
    onChange: e => setFormRecorr({
      ...formRecorr,
      descricao: e.target.value
    }),
    placeholder: "Ex: Aluguel ap. 302"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Valor Previsto (R$)"), React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formRecorr.valorPrevisto,
    onChange: e => setFormRecorr({
      ...formRecorr,
      valorPrevisto: e.target.value
    }),
    placeholder: "0,00"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Recorr\xEAncia"), React.createElement("select", {
    className: "form-input",
    value: formRecorr.recorrencia,
    onChange: e => setFormRecorr({
      ...formRecorr,
      recorrencia: e.target.value
    })
  }, RECORR.map(r => React.createElement("option", {
    key: r
  }, r)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Dia de Vencimento"), React.createElement("input", {
    className: "form-input",
    type: "number",
    min: "1",
    max: "31",
    value: formRecorr.diaVencimento,
    onChange: e => setFormRecorr({
      ...formRecorr,
      diaVencimento: e.target.value
    }),
    placeholder: "10"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "In\xEDcio"), React.createElement("input", {
    className: "form-input",
    type: "month",
    value: formRecorr.mesInicio,
    onChange: e => setFormRecorr({
      ...formRecorr,
      mesInicio: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Status"), React.createElement("select", {
    className: "form-input",
    value: formRecorr.ativo ? "ativo" : "inativo",
    onChange: e => setFormRecorr({
      ...formRecorr,
      ativo: e.target.value === "ativo"
    })
  }, React.createElement("option", {
    value: "ativo"
  }, "Ativo"), React.createElement("option", {
    value: "inativo"
  }, "Inativo"))), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Centro de Custo"), React.createElement("select", {
    className: "form-input",
    value: formRecorr.centroCusto || "",
    onChange: e => setFormRecorr({
      ...formRecorr,
      centroCusto: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Nenhum (pessoal geral)"), CENTROS_CUSTO.map(c => React.createElement("option", {
    key: c
  }, c))))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarRecorrente,
    disabled: salvando
  }, salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar")))), modal === "categoria" && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 480,
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, "Gerenciar Categorias"), React.createElement("button", {
    onClick: () => setModal(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, React.createElement("select", {
    className: "form-input",
    style: {
      width: 120,
      flexShrink: 0
    },
    value: novaCategoria.tipo,
    onChange: e => setNovaCategoria({
      ...novaCategoria,
      tipo: e.target.value
    })
  }, React.createElement("option", {
    value: "receita"
  }, "Receita"), React.createElement("option", {
    value: "despesa"
  }, "Despesa")), React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1
    },
    value: novaCategoria.nome,
    onChange: e => setNovaCategoria({
      ...novaCategoria,
      nome: e.target.value
    }),
    placeholder: "Nova categoria...",
    onKeyDown: e => e.key === "Enter" && salvarCategoria()
  }), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarCategoria
  }, React.createElement(Icon, {
    name: "plus",
    size: 16
  }))), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, categorias.length === 0 && React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      textAlign: "center",
      padding: 20
    }
  }, "Nenhuma categoria personalizada ainda."), categorias.map(c => React.createElement("div", {
    key: c.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      borderRadius: 10,
      background: c.tipo === "receita" ? "#f0fdf4" : "#fef2f2",
      border: "1px solid",
      borderColor: c.tipo === "receita" ? "#86efac" : "#fca5a5"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: c.tipo === "receita" ? "#059669" : "#dc2626",
      background: "white",
      padding: "2px 8px",
      borderRadius: 10
    }
  }, c.tipo), React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 14
    }
  }, c.nome), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px",
      color: "var(--danger)"
    },
    onClick: () => excluirCategoria(c.id)
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }))))), React.createElement("div", {
    style: {
      marginTop: 16,
      padding: 12,
      background: "var(--gray-50)",
      borderRadius: 10,
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "As categorias padr\xE3o j\xE1 est\xE3o inclusas (Aluguel, Contador, Impostos, etc.). Aqui voc\xEA adiciona categorias extras."))));
}
function Alunos() {
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("ativo");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    instituicao: "",
    semestre: "",
    senha: "",
    obs: ""
  });
  const [salvando, setSalvando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [editando, setEditando] = useState(null);
  useEffect(() => {
    const unsub = db.collection("clinica_alunos").onSnapshot(snap => {
      setAlunos(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  const LINK_CADASTRO = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/cadastro-aluno/";
  const [linkCopiado, setLinkCopiado] = useState(false);
  const filtrados = alunos.filter(a => {
    const fOk = filtro === "todos" || a.status === filtro;
    const bOk = !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.email?.toLowerCase().includes(busca.toLowerCase());
    return fOk && bOk;
  });
  const pendentes = alunos.filter(a => a.status === "pendente");
  async function salvar() {
    if (!form.nome || !form.email) {
      alert("Nome e e-mail obrigatorios.");
      return;
    }
    if (!editando && !form.senha) {
      alert("Senha obrigatoria para novo aluno.");
      return;
    }
    setSalvando(true);
    if (editando) {
      const {
        senha,
        ...dados
      } = form;
      const up = {
        ...dados
      };
      if (senha) up.senha = senha;
      await db.collection("clinica_alunos").doc(editando).update(up);
    } else {
      await db.collection("clinica_alunos").add({
        ...form,
        status: "ativo",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    setModal(false);
    setForm({
      nome: "",
      email: "",
      telefone: "",
      instituicao: "",
      semestre: "",
      senha: "",
      obs: ""
    });
    setEditando(null);
    setSalvando(false);
  }
  async function alterarStatus(id, novoStatus) {
    await db.collection("clinica_alunos").doc(id).update({
      status: novoStatus
    });
  }
  async function excluir(id) {
    if (!confirm("Remover aluno?")) return;
    await db.collection("clinica_alunos").doc(id).delete();
  }
  function abrirEditar(a) {
    setForm({
      nome: a.nome || "",
      email: a.email || "",
      telefone: a.telefone || "",
      instituicao: a.instituicao || "",
      semestre: a.semestre || "",
      senha: "",
      obs: a.obs || ""
    });
    setEditando(a.id);
    setModal(true);
  }
  if (loading) return React.createElement(Spinner, null);
  return React.createElement("div", null, React.createElement("div", {
    className: "page-header",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "page-title"
  }, "Alunos em Supervis\xE3o"), React.createElement("div", {
    className: "page-subtitle"
  }, alunos.filter(a => a.status === "ativo").length, " aluno(s) cadastrado(s)")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12
    },
    onClick: () => {
      const texto = `🎓 *Supervisão Clínica — Dra. Lucia Kratz*\n\nOlá! Para solicitar acesso ao Portal de Supervisão Clínica, preencha seu cadastro pelo link abaixo:\n\n👉 ${LINK_CADASTRO}\n\n📝 Você vai informar: nome, e-mail, instituição e criar uma senha de acesso.\n\n⏳ Após o envio, seu cadastro ficará pendente até a aprovação da supervisora. Assim que aprovado, você já pode acessar o portal.\n\nQualquer dúvida, entre em contato! 💜`;
      navigator.clipboard.writeText(texto).then(() => {
        setLinkCopiado(true);
        setTimeout(() => setLinkCopiado(false), 2500);
      }).catch(() => prompt("Copie o texto:", texto));
    }
  }, linkCopiado ? "✓ Texto copiado!" : "📋 Link de Cadastro"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      setForm({
        nome: "",
        email: "",
        telefone: "",
        instituicao: "",
        semestre: "",
        senha: "",
        obs: ""
      });
      setEditando(null);
      setModal(true);
    }
  }, React.createElement(Icon, {
    name: "user-plus",
    size: 16
  }), " Cadastrar Aluno"))), pendentes.length > 0 && React.createElement("div", {
    style: {
      background: "#fef3c7",
      border: "1px solid #f59e0b",
      borderRadius: 12,
      padding: "12px 18px",
      marginBottom: 18,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#92400e"
    }
  }, "\uD83D\uDD14 ", pendentes.length, " solicita\xE7\xE3o(\xF5es) pendente(s)"), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#78350f",
      marginTop: 2
    }
  }, "Alunos que se cadastraram pelo link e aguardam sua aprova\xE7\xE3o.")), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      color: "#92400e",
      border: "1px solid #f59e0b"
    },
    onClick: () => setFiltro("pendente")
  }, "Ver pendentes")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginBottom: 20,
      flexWrap: "wrap"
    }
  }, React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1,
      minWidth: 200
    },
    placeholder: "Buscar por nome ou e-mail...",
    value: busca,
    onChange: e => setBusca(e.target.value)
  }), [["todos", "Todos"], ["ativo", "Ativos"], ["pendente", "Pendentes"], ["inativo", "Inativos"]].map(([f, l]) => React.createElement("button", {
    key: f,
    className: "btn " + (filtro === f ? "btn-purple" : "btn-ghost"),
    onClick: () => setFiltro(f)
  }, l, " ", f === "pendente" && pendentes.length > 0 && React.createElement("span", {
    style: {
      background: "#f59e0b",
      color: "white",
      borderRadius: 20,
      padding: "1px 7px",
      fontSize: 10,
      fontWeight: 700,
      marginLeft: 4
    }
  }, pendentes.length)))), filtrados.length === 0 ? React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, React.createElement(Icon, {
    name: "graduation-cap",
    size: 40
  }), React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, busca ? "Nenhum aluno encontrado." : "Nenhum aluno cadastrado ainda.")) : React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, filtrados.map(a => React.createElement("div", {
    key: a.id,
    className: "card",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 20px",
      borderLeft: a.status === "pendente" ? "4px solid #f59e0b" : a.status === "inativo" ? "4px solid #9ca3af" : "4px solid transparent"
    }
  }, React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: "50%",
      background: a.status === "pendente" ? "#fef3c7" : "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      color: a.status === "pendente" ? "#92400e" : "var(--purple)",
      flexShrink: 0,
      fontSize: 16
    }
  }, (a.nome || "?")[0].toUpperCase()), React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, a.nome), React.createElement("span", {
    className: "badge " + (a.status === "ativo" ? "badge-green" : a.status === "pendente" ? "badge-yellow" : "badge-gray"),
    style: a.status === "pendente" ? {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #f59e0b"
    } : {}
  }, a.status === "ativo" ? "Ativo" : a.status === "pendente" ? "⏳ Pendente" : "Inativo"), a.origemCadastro === "auto-cadastro" && React.createElement("span", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)",
      background: "var(--gray-100)",
      borderRadius: 20,
      padding: "2px 8px"
    }
  }, "auto-cadastro")), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      display: "flex",
      gap: 12,
      marginTop: 2,
      flexWrap: "wrap"
    }
  }, React.createElement("span", null, "\u2709 ", a.email), a.instituicao && React.createElement("span", null, "\uD83C\uDFDB ", a.instituicao, a.semestre ? " · " + a.semestre : ""), React.createElement("span", null, "\uD83D\uDC64 ", a.pacientesVinculados || 0, " paciente(s)"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, a.status === "pendente" && React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 12,
      padding: "6px 14px"
    },
    onClick: () => alterarStatus(a.id, "ativo")
  }, "\u2713 Aprovar"), a.status === "ativo" && React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 11,
      padding: "5px 10px",
      color: "#6b7280"
    },
    onClick: () => alterarStatus(a.id, "inativo")
  }, "Inativar"), a.status === "inativo" && React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 11,
      padding: "5px 10px",
      color: "#16a34a"
    },
    onClick: () => alterarStatus(a.id, "ativo")
  }, "Reativar"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      color: "var(--purple)",
      padding: "6px 12px"
    },
    onClick: () => setDetalhe(a)
  }, React.createElement(Icon, {
    name: "eye",
    size: 13
  }), " Ver"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px"
    },
    onClick: () => abrirEditar(a)
  }, React.createElement(Icon, {
    name: "pencil",
    size: 13
  })), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px",
      color: "var(--danger)"
    },
    onClick: () => excluir(a.id)
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 13
  })))))), modal && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 520,
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 20
    }
  }, editando ? "Editar Aluno" : "Cadastrar Novo Aluno"), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "NOME COMPLETO *"), React.createElement("input", {
    className: "form-input",
    value: form.nome,
    onChange: e => setForm({
      ...form,
      nome: e.target.value
    }),
    placeholder: "Nome do aluno",
    autoFocus: true
  })), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "E-MAIL *"), React.createElement("input", {
    className: "form-input",
    type: "email",
    value: form.email,
    onChange: e => setForm({
      ...form,
      email: e.target.value
    }),
    placeholder: "aluno@email.com",
    disabled: !!editando
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "TELEFONE"), React.createElement("input", {
    className: "form-input",
    value: form.telefone,
    onChange: e => setForm({
      ...form,
      telefone: e.target.value
    }),
    placeholder: "(00) 9 0000-0000"
  }))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "INSTITUI\xC7\xC3O"), React.createElement("input", {
    className: "form-input",
    value: form.instituicao,
    onChange: e => setForm({
      ...form,
      instituicao: e.target.value
    }),
    placeholder: "Nome da faculdade"
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "SEMESTRE"), React.createElement("input", {
    className: "form-input",
    value: form.semestre,
    onChange: e => setForm({
      ...form,
      semestre: e.target.value
    }),
    placeholder: "Ex: 8\xBA semestre"
  }))), !editando && React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "SENHA DE ACESSO *"), React.createElement("input", {
    className: "form-input",
    type: "password",
    value: form.senha,
    onChange: e => setForm({
      ...form,
      senha: e.target.value
    }),
    placeholder: "Senha para o aluno acessar o portal"
  })), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "OBSERVA\xC7\xD5ES"), React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: form.obs,
    onChange: e => setForm({
      ...form,
      obs: e.target.value
    }),
    placeholder: "Notas sobre o aluno..."
  })), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal(false)
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando
  }, salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar aluno")))), detalhe && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      zIndex: 500
    },
    onClick: () => setDetalhe(null)
  }, React.createElement("div", {
    style: {
      background: "white",
      width: "100%",
      maxWidth: 480,
      height: "100%",
      overflowY: "auto",
      padding: 28
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 20
    }
  }, React.createElement(Icon, {
    name: "graduation-cap",
    size: 20
  }), React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      flex: 1
    }
  }, detalhe.nome), React.createElement("button", {
    onClick: () => setDetalhe(null),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 20
    }
  }, React.createElement("span", {
    className: "badge " + (detalhe.status === "ativo" ? "badge-green" : "badge-gray")
  }, detalhe.status === "ativo" ? "Ativo" : "Inativo"), detalhe.instituicao && React.createElement("span", {
    className: "badge badge-purple"
  }, detalhe.instituicao)), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      fontSize: 14
    }
  }, detalhe.email && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "E-mail"), React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, detalhe.email)), detalhe.telefone && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Telefone"), React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, detalhe.telefone)), detalhe.instituicao && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Instituicao"), React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, detalhe.instituicao)), detalhe.semestre && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Semestre"), React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, detalhe.semestre))), detalhe.obs && React.createElement("div", {
    style: {
      marginTop: 16,
      padding: 12,
      background: "var(--gray-50)",
      borderRadius: 8,
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, detalhe.obs))));
}
function BotaoEmergenciaAdmin({
  casalId,
  nomeCasal
}) {
  const [palavra, setPalavra] = useState("");
  const [palavraSalva, setPalavraSalva] = useState("");
  const [acionamentos, setAcionamentos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  useEffect(() => {
    if (!casalId) return;
    db.collection("clinica_casais").doc(casalId).get().then(d => {
      if (d.exists && d.data().palavraEmergencia) {
        setPalavraSalva(d.data().palavraEmergencia);
        setPalavra(d.data().palavraEmergencia);
      }
    });
    db.collection("clinica_emergencia").where("casalId", "==", casalId).orderBy("createdAt", "desc").limit(5).onSnapshot(s => setAcionamentos(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
  }, [casalId]);
  async function salvar() {
    if (!palavra.trim()) {
      alert("Digite a palavra de emergência.");
      return;
    }
    setSalvando(true);
    try {
      await db.collection("clinica_casais").doc(casalId).update({
        palavraEmergencia: palavra.trim().toUpperCase()
      });
      setPalavraSalva(palavra.trim().toUpperCase());
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch (e) {
      alert("Erro ao salvar.");
    }
    setSalvando(false);
  }
  function fmtDH(ts) {
    if (!ts?.toDate) return "—";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  return React.createElement("div", {
    style: {
      background: "#fff5f5",
      border: "2px solid #fecaca",
      borderRadius: 12,
      padding: 16,
      marginTop: 12
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12
    }
  }, React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, "\uD83D\uDD34"), React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#dc2626"
    }
  }, "Bot\xE3o de Emerg\xEAncia")), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6b7280",
      marginBottom: 12,
      lineHeight: 1.6
    }
  }, "Defina a palavra-c\xF3digo que o casal usar\xE1 para acionar o tempo de pausa durante conflitos."), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: palavraSalva ? 12 : 0
    }
  }, React.createElement("input", {
    className: "form-input",
    value: palavra,
    onChange: e => setPalavra(e.target.value.toUpperCase()),
    placeholder: "Ex: PAUSA, RESPIRA, CAF\xC9...",
    style: {
      flex: 1,
      fontWeight: 700,
      letterSpacing: 2,
      fontSize: 14,
      textTransform: "uppercase"
    }
  }), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando,
    style: {
      whiteSpace: "nowrap"
    }
  }, salvando ? "..." : salvo ? "✓ Salvo!" : "Salvar")), palavraSalva && React.createElement("div", {
    style: {
      background: "#7B00C4",
      borderRadius: 10,
      padding: "10px 16px",
      textAlign: "center",
      marginBottom: 12
    }
  }, React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.7)",
      marginBottom: 4
    }
  }, "Palavra ativa para ", nomeCasal), React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 700,
      color: "white",
      letterSpacing: 4
    }
  }, palavraSalva)), acionamentos.length > 0 && React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#dc2626",
      marginBottom: 6
    }
  }, "\xDALTIMOS ACIONAMENTOS"), acionamentos.map(a => React.createElement("div", {
    key: a.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      padding: "5px 0",
      borderBottom: "1px solid #fecaca"
    }
  }, React.createElement("span", {
    style: {
      color: "#6b7280"
    }
  }, fmtDH(a.createdAt)), React.createElement("span", {
    style: {
      color: "#dc2626",
      fontWeight: 600
    }
  }, "\u23F1 ", a.horas, "h de pausa \xB7 por ", a.acionadoPor || "—")))));
}
function Laudos() {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  const [laudos, setLaudos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    tipo: "Avaliacao Neuropsicologica",
    pacienteId: "",
    linkDrive: "",
    observacoes: ""
  });
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(null);
  const TIPOS_LAUDO = ["Avaliacao Neuropsicologica", "Avaliacao Psicologica", "Avaliacao Infantil", "Avaliacao de TDAH", "Avaliacao de Altas Habilidades", "Pericia Psicologica", "Demandas Judiciais", "Orientacao de Carreira", "Relatorio de Acompanhamento", "Outro"];
  const STATUS_CONFIG = {
    rascunho: {
      label: "Rascunho",
      bg: "#fef3c7",
      cor: "#b45309",
      icon: "edit-3"
    },
    enviado: {
      label: "Enviado",
      bg: "#d1fae5",
      cor: "#065f46",
      icon: "send"
    },
    arquivado: {
      label: "Arquivado",
      bg: "#f3f4f6",
      cor: "#6b7280",
      icon: "archive"
    }
  };
  useEffect(() => {
    const unsub = db.collection("clinica_laudos").onSnapshot(snap => {
      setLaudos(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  async function salvar() {
    if (!form.tipo || !form.pacienteId || !form.linkDrive) {
      alert("Selecione o tipo, o paciente e cole o link do PDF.");
      return;
    }
    setSalvando(true);
    const pac = pacientes.find(p => p.id === form.pacienteId);
    let link = form.linkDrive.trim();
    const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) link = `https://drive.google.com/file/d/${m[1]}/view`;
    await db.collection("clinica_laudos").add({
      tipo: form.tipo,
      titulo: form.tipo + " — " + (pacEfetivo?.nome || ""),
      pacienteId: form.pacienteId,
      pacienteNome: pac?.nome || "",
      linkDrive: link,
      observacoes: form.observacoes,
      status: "rascunho",
      enviadoEm: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setModal(false);
    setForm({
      tipo: "Avaliacao Neuropsicologica",
      pacienteId: "",
      linkDrive: "",
      observacoes: ""
    });
    setSalvando(false);
  }
  async function enviarParaPaciente(laudo) {
    if (!confirm(`Enviar "${laudo.tipo}" para ${laudo.pacienteNome}?\n\nO paciente verá o documento no portal dele.`)) return;
    setEnviando(laudo.id);
    await db.collection("clinica_laudos").doc(laudo.id).update({
      status: "enviado",
      enviadoEm: new Date().toISOString()
    });
    setEnviando(null);
  }
  async function excluir(id) {
    if (!confirm("Excluir laudo permanentemente?")) return;
    await db.collection("clinica_laudos").doc(id).delete();
  }
  async function arquivar(id) {
    await db.collection("clinica_laudos").doc(id).update({
      status: "arquivado"
    });
  }
  if (loading) return React.createElement(Spinner, null);
  const totalEnviado = laudos.filter(l => l.status === "enviado").length;
  const totalRascunho = laudos.filter(l => l.status === "rascunho").length;
  return React.createElement("div", null, React.createElement("div", {
    className: "page-header",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "page-title"
  }, "Laudos"), React.createElement("div", {
    className: "page-subtitle"
  }, laudos.length, " laudo(s) \xB7 ", totalEnviado, " enviado(s) ao paciente")), React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setModal(true)
  }, React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Novo Laudo")), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 12,
      marginBottom: 24
    }
  }, [["Rascunho", totalRascunho, "#b45309", "#fef3c7"], ["Enviado ao Paciente", totalEnviado, "#065f46", "#d1fae5"], ["Total", laudos.length, "#7B00C4", "var(--purple-soft)"]].map(([l, n, cor, bg]) => React.createElement("div", {
    key: l,
    className: "metric-card",
    style: {
      textAlign: "center",
      background: bg
    }
  }, React.createElement("div", {
    className: "metric-value",
    style: {
      fontSize: 28,
      color: cor
    }
  }, n), React.createElement("div", {
    className: "metric-label",
    style: {
      color: cor
    }
  }, l)))), laudos.length === 0 ? React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 60,
      color: "var(--text-muted)"
    }
  }, React.createElement(Icon, {
    name: "file-text",
    size: 48
  }), React.createElement("div", {
    style: {
      marginTop: 12,
      fontWeight: 500
    }
  }, "Nenhum laudo criado ainda"), React.createElement("p", {
    style: {
      fontSize: 13,
      marginTop: 8,
      marginBottom: 20,
      color: "var(--text-muted)"
    }
  }, "Crie o laudo no Word/Google Docs, salve como PDF no Drive, cole o link aqui e envie ao paciente."), React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setModal(true)
  }, React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " Criar primeiro laudo")) : React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, laudos.map(l => {
    const st = STATUS_CONFIG[l.status] || STATUS_CONFIG.rascunho;
    return React.createElement("div", {
      key: l.id,
      className: "card",
      style: {
        padding: "18px 20px"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 14
      }
    }, React.createElement("div", {
      style: {
        width: 44,
        height: 44,
        borderRadius: 12,
        background: st.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, React.createElement(Icon, {
      name: st.icon,
      size: 20
    })), React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 4
      }
    }, React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 15
      }
    }, l.tipo), React.createElement("span", {
      style: {
        background: st.bg,
        color: st.cor,
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 600
      }
    }, st.label)), React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        display: "flex",
        gap: 12,
        flexWrap: "wrap"
      }
    }, React.createElement("span", null, "\uD83D\uDC64 ", l.pacienteNome || "—"), l.createdAt?.seconds && React.createElement("span", null, "\uD83D\uDCC5 ", new Date(l.createdAt.seconds * 1000).toLocaleDateString("pt-BR")), l.enviadoEm && React.createElement("span", {
      style: {
        color: "#059669",
        fontWeight: 600
      }
    }, "\u2709 Enviado em ", new Date(l.enviadoEm).toLocaleDateString("pt-BR"))), l.observacoes && React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginTop: 4,
        fontStyle: "italic"
      }
    }, l.observacoes))), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 14,
        flexWrap: "wrap",
        borderTop: "1px solid var(--gray-100)",
        paddingTop: 12
      }
    }, l.linkDrive && React.createElement("a", {
      href: l.linkDrive,
      target: "_blank",
      rel: "noreferrer",
      className: "btn btn-outline",
      style: {
        fontSize: 12,
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, React.createElement(Icon, {
      name: "external-link",
      size: 13
    }), " Ver PDF"), l.status === "rascunho" && React.createElement("button", {
      className: "btn btn-purple",
      style: {
        fontSize: 12
      },
      onClick: () => enviarParaPaciente(l),
      disabled: enviando === l.id
    }, React.createElement(Icon, {
      name: "send",
      size: 13
    }), " ", enviando === l.id ? "Enviando..." : "Enviar ao Paciente"), l.status === "enviado" && React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "#059669",
        fontWeight: 600
      }
    }, React.createElement(Icon, {
      name: "check-circle",
      size: 14
    }), " Dispon\xEDvel no portal do paciente"), l.status !== "arquivado" && React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        fontSize: 12
      },
      onClick: () => arquivar(l.id)
    }, React.createElement(Icon, {
      name: "archive",
      size: 13
    }), " Arquivar"), React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        fontSize: 12,
        color: "var(--danger)",
        marginLeft: "auto"
      },
      onClick: () => excluir(l.id)
    }, React.createElement(Icon, {
      name: "trash-2",
      size: 13
    }))));
  })), modal && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, "Novo Laudo"), React.createElement("button", {
    onClick: () => setModal(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Tipo de Laudo *"), React.createElement("select", {
    className: "form-input",
    value: form.tipo,
    onChange: e => setForm({
      ...form,
      tipo: e.target.value
    })
  }, TIPOS_LAUDO.map(t => React.createElement("option", {
    key: t,
    value: t
  }, t)))), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Paciente *"), React.createElement("select", {
    className: "form-input",
    value: form.pacienteId,
    onChange: e => setForm({
      ...form,
      pacienteId: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Selecionar paciente..."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.nome)))), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Link do PDF (Google Drive) *"), React.createElement("input", {
    className: "form-input",
    value: form.linkDrive,
    onChange: e => setForm({
      ...form,
      linkDrive: e.target.value
    }),
    placeholder: "https://drive.google.com/file/d/..."
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "No Drive: bot\xE3o direito no arquivo \u2192 \"Obter link\" \u2192 cole aqui")), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Observa\xE7\xF5es internas (opcional)"), React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: form.observacoes,
    onChange: e => setForm({
      ...form,
      observacoes: e.target.value
    }),
    placeholder: "Notas internas sobre este laudo..."
  })), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal(false)
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando
  }, React.createElement(Icon, {
    name: "save",
    size: 15
  }), " ", salvando ? "Salvando..." : "Salvar Laudo")))));
}
function Comissoes({
  user
}) {
  const [comissoes, setComissoes] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [mesSel, setMesSel] = useState(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
  });
  const [pagando, setPagando] = useState(false);
  const [config, setConfig] = useState({
    ...CONFIG_FIN_PADRAO
  });
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [formConfig, setFormConfig] = useState({
    ...CONFIG_FIN_PADRAO
  });
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [parceiras, setParceiras] = useState([]);
  const [modalParceira, setModalParceira] = useState(false);
  const [editandoParceira, setEditandoParceira] = useState(null);
  const [formParceira, setFormParceira] = useState({
    nome: "",
    percentual: "70",
    pix: "",
    tipo: "parceira"
  });
  const SALARIO_FIXO = parseFloat(config.salarioFixo) || 0;
  useEffect(() => {
    const u1 = db.collection("clinica_comissoes").orderBy("createdAt", "desc").onSnapshot(s => setComissoes(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    const u2 = db.collection("clinica_lancamentos").orderBy("createdAt", "desc").onSnapshot(s => setLancamentos(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    const u3 = db.collection("clinica_config").doc("comissoes").onSnapshot(d => {
      const cfg = d.exists ? {
        ...CONFIG_FIN_PADRAO,
        ...d.data()
      } : {
        ...CONFIG_FIN_PADRAO
      };
      setConfig(cfg);
      if (!editandoConfig) setFormConfig(cfg);
    }, () => {});
    const u4 = db.collection("clinica_parceiras").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setParceiras(docs);
    }, () => {});
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, []);
  async function salvarConfig() {
    setSalvandoConfig(true);
    await db.collection("clinica_config").doc("comissoes").set({
      nomeSecretaria: formConfig.nomeSecretaria || "Secretária",
      salarioFixo: parseFloat(formConfig.salarioFixo) || 0,
      percPrimeira: parseFloat(formConfig.percPrimeira) || 10,
      percRecorrente: parseFloat(formConfig.percRecorrente) || 5,
      percParceiroPadrao: parseFloat(formConfig.percParceiroPadrao) || 70,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }, {
      merge: true
    });
    setSalvandoConfig(false);
    setEditandoConfig(false);
  }
  async function salvarParceira() {
    if (!formParceira.nome.trim()) {
      alert("Nome da parceira é obrigatório.");
      return;
    }
    const dados = {
      nome: formParceira.nome.trim(),
      percentual: parseFloat(formParceira.percentual) || parseFloat(config.percParceiroPadrao) || 70,
      pix: formParceira.pix || "",
      tipo: formParceira.tipo || "parceira"
    };
    if (editandoParceira) {
      await db.collection("clinica_parceiras").doc(editandoParceira).update(dados);
    } else {
      await db.collection("clinica_parceiras").add({
        ...dados,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    setModalParceira(false);
    setEditandoParceira(null);
    setFormParceira({
      nome: "",
      percentual: String(config.percParceiroPadrao || 70),
      pix: "",
      tipo: "parceira"
    });
  }
  const meses = [...new Set(comissoes.map(c => c.mesRef))].sort().reverse();
  if (!meses.includes(mesSel) && meses.length > 0) {}
  const comissoesMes = comissoes.filter(c => c.mesRef === mesSel);
  const comissoesSecretaria = comissoesMes.filter(c => !c.responsavel);
  const repassesMes = comissoesMes.filter(c => c.responsavel);
  const responsaveis = [...new Set(repassesMes.map(c => c.responsavel))];
  const totalComissoes = comissoesSecretaria.reduce((a, c) => a + (c.valorComissao || 0), 0);
  const comissoesPend = comissoesSecretaria.filter(c => c.status !== "pago");
  const comissoesPagas = comissoesSecretaria.filter(c => c.status === "pago");
  const totalPend = comissoesPend.reduce((a, c) => a + (c.valorComissao || 0), 0);
  const totalPagas = comissoesPagas.reduce((a, c) => a + (c.valorComissao || 0), 0);
  const pagamentosDoMes = lancamentos.filter(l => l.tipo_lancamento === "salario_secretaria" && l.mesRef === mesSel);
  const pagamentoMes = pagamentosDoMes[0] || null;
  const salarioJaPago = !!pagamentoMes;
  const totalAPagar = (salarioJaPago ? 0 : SALARIO_FIXO) + totalPend;
  const [mesLabel] = useState(() => {
    const [ano, mes] = mesSel.split("-");
    return new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
  });
  function getMesLabel(mesRef) {
    const [ano, mes] = mesRef.split("-");
    return new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
  }
  async function pagarSalario() {
    const descr = salarioJaPago ? `${comissoesPend.length} comissão(ões) nova(s)` : `salário fixo + ${comissoesPend.length} comissão(ões)`;
    if (!confirm(`Confirma pagamento de R$ ${totalAPagar.toFixed(2).replace(".", ",")} para ${config.nomeSecretaria} (${descr}) em ${getMesLabel(mesSel)}?`)) return;
    setPagando(true);
    const hoje = new Date().toISOString().slice(0, 10);
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "salario_secretaria",
      tipo: salarioJaPago ? "Comissões Secretária (adicional)" : "Salário Secretária",
      mesRef: mesSel,
      valor: totalAPagar,
      valorSalarioFixo: salarioJaPago ? 0 : SALARIO_FIXO,
      valorComissoes: totalPend,
      qtdComissoes: comissoesPend.length,
      data: hoje,
      status: "pago",
      obs: `${salarioJaPago ? "Comissões adicionais" : "Salário"} ${getMesLabel(mesSel)} — ${config.nomeSecretaria}`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const batch = db.batch();
    comissoesPend.forEach(c => batch.update(db.collection("clinica_comissoes").doc(c.id), {
      status: "pago",
      dataPagamento: hoje
    }));
    await batch.commit();
    setPagando(false);
    alert("✅ Pagamento registrado! O ciclo zerou — novas vendas abrem o próximo pagamento.");
  }
  async function pagarRepasse(responsavel) {
    const pendentes = repassesMes.filter(c => c.responsavel === responsavel && c.status !== "pago");
    const totalRep = pendentes.reduce((a, c) => a + (c.valorComissao || 0), 0);
    if (pendentes.length === 0) return;
    const parc = parceiras.find(p => p.nome === responsavel);
    if (!confirm(`Confirma repasse de R$ ${totalRep.toFixed(2).replace(".", ",")} para ${responsavel} em ${getMesLabel(mesSel)}?${parc?.pix ? `\nPIX: ${parc.pix}` : ""}`)) return;
    setPagando(true);
    const hoje = new Date().toISOString().slice(0, 10);
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "repasse_parceira",
      tipo: `Repasse — ${responsavel}`,
      mesRef: mesSel,
      valor: totalRep,
      data: hoje,
      status: "pago",
      obs: `Repasse ${getMesLabel(mesSel)} — ${responsavel} (${pendentes.length} venda(s))`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const batch = db.batch();
    pendentes.forEach(c => batch.update(db.collection("clinica_comissoes").doc(c.id), {
      status: "pago",
      dataPagamento: hoje
    }));
    await batch.commit();
    setPagando(false);
    alert(`✅ Repasse para ${responsavel} registrado como despesa da clínica!`);
  }
  const corTipoVenda = t => t === "primeira" ? "#7B00C4" : "#0891b2";
  const labelTipoVenda = t => t === "primeira" ? `🌟 Primeira Venda (${config.percPrimeira}%)` : `🔁 Recorrente (${config.percRecorrente}%)`;
  return React.createElement("div", null, React.createElement("div", {
    className: "page-header"
  }, React.createElement("div", null, React.createElement("div", {
    className: "page-title"
  }, "Comiss\xF5es \u2014 ", config.nomeSecretaria.split(" ")[0]), React.createElement("div", {
    className: "page-subtitle"
  }, "Sal\xE1rio fixo R$ ", SALARIO_FIXO.toFixed(2).replace(".", ","), " + comiss\xF5es por vendas \xB7 Repasses a parceiras"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 20,
      flexWrap: "wrap"
    }
  }, (meses.length > 0 ? meses : [mesSel]).map(m => React.createElement("button", {
    key: m,
    onClick: () => setMesSel(m),
    style: {
      padding: "6px 14px",
      borderRadius: 20,
      border: "none",
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      fontWeight: 600,
      background: m === mesSel ? "var(--purple)" : "var(--gray-100)",
      color: m === mesSel ? "white" : "var(--text)"
    }
  }, getMesLabel(m)))), user.tipo === "psicologa" && React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 14,
      border: "1px solid var(--gray-200)",
      padding: "16px 20px",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14
    }
  }, "\u2699\uFE0F Configura\xE7\xF5es de Sal\xE1rio e Percentuais"), !editandoConfig ? React.createElement("button", {
    onClick: () => {
      setFormConfig({
        ...config
      });
      setEditandoConfig(true);
    },
    style: {
      background: "var(--purple)",
      color: "white",
      border: "none",
      borderRadius: 8,
      padding: "7px 16px",
      fontWeight: 700,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, "\u270F\uFE0F Editar") : React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, React.createElement("button", {
    onClick: () => setEditandoConfig(false),
    style: {
      background: "white",
      color: "#6b7280",
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      padding: "7px 14px",
      fontWeight: 600,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, "Cancelar"), React.createElement("button", {
    onClick: salvarConfig,
    disabled: salvandoConfig,
    style: {
      background: "#16a34a",
      color: "white",
      border: "none",
      borderRadius: 8,
      padding: "7px 16px",
      fontWeight: 700,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, salvandoConfig ? "Salvando..." : "💾 Salvar"))), !editandoConfig ? React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px 24px",
      marginTop: 12,
      fontSize: 13,
      color: "#374151"
    }
  }, React.createElement("span", null, "\uD83D\uDC69\u200D\uD83D\uDCBC Secret\xE1ria: ", React.createElement("strong", null, config.nomeSecretaria)), React.createElement("span", null, "\uD83D\uDCB5 Sal\xE1rio fixo: ", React.createElement("strong", null, "R$ ", SALARIO_FIXO.toFixed(2).replace(".", ","))), React.createElement("span", null, "\uD83C\uDF1F Primeira venda: ", React.createElement("strong", null, config.percPrimeira, "%")), React.createElement("span", null, "\uD83D\uDD01 Recorrente: ", React.createElement("strong", null, config.percRecorrente, "%")), React.createElement("span", null, "\uD83E\uDD1D Parceiro (padr\xE3o): ", React.createElement("strong", null, config.percParceiroPadrao, "%"))) : React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
      gap: 12,
      marginTop: 14
    }
  }, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Nome da secret\xE1ria"), React.createElement("input", {
    className: "form-input",
    value: formConfig.nomeSecretaria,
    onChange: e => setFormConfig({
      ...formConfig,
      nomeSecretaria: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Sal\xE1rio fixo (R$)"), React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formConfig.salarioFixo,
    onChange: e => setFormConfig({
      ...formConfig,
      salarioFixo: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "% primeira venda"), React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formConfig.percPrimeira,
    onChange: e => setFormConfig({
      ...formConfig,
      percPrimeira: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "% recorrente"), React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formConfig.percRecorrente,
    onChange: e => setFormConfig({
      ...formConfig,
      percRecorrente: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "% parceiro padr\xE3o"), React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formConfig.percParceiroPadrao,
    onChange: e => setFormConfig({
      ...formConfig,
      percParceiroPadrao: e.target.value
    })
  }))), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 10
    }
  }, "Os novos percentuais valem para as pr\xF3ximas vendas; comiss\xF5es j\xE1 registradas n\xE3o mudam.")), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
      gap: 16,
      marginBottom: 24
    }
  }, React.createElement("div", {
    style: {
      background: "var(--gray-50)",
      borderRadius: 14,
      padding: "18px 20px",
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 6
    }
  }, "Sal\xE1rio Fixo"), React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: "var(--text)"
    }
  }, "R$ ", SALARIO_FIXO.toFixed(2).replace(".", ","))), React.createElement("div", {
    style: {
      background: "var(--gray-50)",
      borderRadius: 14,
      padding: "18px 20px",
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 6
    }
  }, "Comiss\xF5es Pendentes"), React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      color: "#7B00C4"
    }
  }, "R$ ", totalPend.toFixed(2).replace(".", ",")), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, comissoesPend.length, " venda(s) nova(s)", totalPagas > 0 && React.createElement("span", {
    style: {
      color: "#16a34a"
    }
  }, " \xB7 \u2713 R$ ", totalPagas.toFixed(2).replace(".", ","), " j\xE1 pagas no m\xEAs"))), React.createElement("div", {
    style: {
      background: totalAPagar === 0 ? "#f0fdf4" : "#faf5ff",
      borderRadius: 14,
      padding: "18px 20px",
      border: `2px solid ${totalAPagar === 0 ? "#16a34a" : "#7B00C4"}`
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 6
    }
  }, "Total a Pagar ", salarioJaPago ? "(novo ciclo)" : ""), React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 800,
      color: totalAPagar === 0 ? "#16a34a" : "#7B00C4"
    }
  }, totalAPagar === 0 ? "✓ Tudo pago" : `R$ ${totalAPagar.toFixed(2).replace(".", ",")}`), pagamentoMes && React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#16a34a",
      marginTop: 4,
      fontWeight: 600
    }
  }, "\xDAltimo pagamento em ", pagamentosDoMes[0].data?.split("-").reverse().join("/"), " \xB7 ", pagamentosDoMes.length, " pagamento(s) no m\xEAs"))), user.tipo === "psicologa" && totalAPagar > 0 && (salarioJaPago ? comissoesPend.length > 0 : true) && React.createElement("button", {
    onClick: pagarSalario,
    disabled: pagando,
    style: {
      background: "#16a34a",
      color: "white",
      border: "none",
      borderRadius: 10,
      padding: "12px 28px",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      marginBottom: 24,
      fontFamily: "var(--font-body)"
    }
  }, pagando ? "Registrando..." : `💰 ${salarioJaPago ? "Pagar Comissões Novas" : "Registrar Pagamento"} — R$ ${totalAPagar.toFixed(2).replace(".", ",")}`), React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 14,
      border: "1px solid var(--gray-200)",
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      padding: "14px 20px",
      borderBottom: "1px solid var(--gray-200)",
      fontWeight: 700,
      fontSize: 14
    }
  }, "\uD83D\uDD04 Ciclo Atual (a pagar) \u2014 ", config.nomeSecretaria.split(" ")[0], " \u2014 ", getMesLabel(mesSel)), comissoesPend.length === 0 ? React.createElement("div", {
    style: {
      padding: "30px 20px",
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "\u2713 Nenhuma comiss\xE3o pendente \u2014 novas vendas aparecem aqui e reabrem o pagamento") : comissoesPend.map(c => {
    const pacoteExiste = !c.pacoteId || pacotes.some(p => p.id === c.pacoteId);
    const dataStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("pt-BR") : c.mesRef || "—";
    return React.createElement("div", {
      key: c.id,
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: "1px solid var(--gray-100)",
        background: pacoteExiste ? "white" : "#fef9f0"
      }
    }, React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14
      }
    }, c.pacienteNome || "—"), !pacoteExiste && React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        background: "#fef3c7",
        color: "#92400e",
        padding: "1px 6px",
        borderRadius: 10
      }
    }, "\u26A0\uFE0F Pacote n\xE3o encontrado")), React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, c.tipo, " \xB7 ", dataStr), c.pacoteId && React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#9ca3af",
        marginTop: 1
      }
    }, "Pacote: ", c.pacoteId.slice(0, 8), "..."), React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: corTipoVenda(c.tipoVenda),
        background: corTipoVenda(c.tipoVenda) + "18",
        padding: "2px 8px",
        borderRadius: 20,
        display: "inline-block",
        marginTop: 4
      }
    }, labelTipoVenda(c.tipoVenda))), React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, "Base: R$ ", (c.valorBase || 0).toFixed(2).replace(".", ",")), React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 16,
        color: "#7B00C4"
      }
    }, "+R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")), c.status === "pago" && React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#16a34a",
        fontWeight: 600
      }
    }, "\u2713 Pago")), user.tipo === "psicologa" && React.createElement("button", {
      title: "Excluir comiss\xE3o",
      onClick: async () => {
        if (!confirm(`Excluir comissão de ${c.pacienteNome} (R$ ${(c.valorComissao || 0).toFixed(2).replace(".", ",")})?`)) return;
        await db.collection("clinica_comissoes").doc(c.id).delete();
      },
      style: {
        background: "none",
        border: "1px solid #fca5a5",
        borderRadius: 6,
        color: "#dc2626",
        cursor: "pointer",
        padding: "4px 8px",
        fontSize: 11
      }
    }, "\uD83D\uDDD1\uFE0F")));
  })), (comissoesPagas.length > 0 || pagamentosDoMes.length > 0) && React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 14,
      border: "1px solid var(--gray-200)",
      overflow: "hidden",
      marginTop: 24
    }
  }, React.createElement("div", {
    style: {
      padding: "14px 20px",
      borderBottom: "1px solid var(--gray-200)",
      fontWeight: 700,
      fontSize: 14,
      display: "flex",
      justifyContent: "space-between"
    }
  }, React.createElement("span", null, "\u2713 Hist\xF3rico \u2014 ", getMesLabel(mesSel)), React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#16a34a",
      fontWeight: 600
    }
  }, "R$ ", totalPagas.toFixed(2).replace(".", ","), " em comiss\xF5es pagas")), pagamentosDoMes.length > 0 && React.createElement("div", {
    style: {
      padding: "10px 20px",
      background: "#f0fdf4",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, pagamentosDoMes.map(pg => React.createElement("div", {
    key: pg.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      padding: "4px 0"
    }
  }, React.createElement("span", {
    style: {
      color: "#166534"
    }
  }, "\uD83D\uDCB0 ", pg.tipo, " \u2014 ", pg.data?.split("-").reverse().join("/"), pg.qtdComissoes ? ` · ${pg.qtdComissoes} comissão(ões)` : "", (pg.valorSalarioFixo || 0) > 0 ? ` · inclui salário fixo` : ""), React.createElement("strong", {
    style: {
      color: "#166534"
    }
  }, "R$ ", (pg.valor || 0).toFixed(2).replace(".", ","))))), comissoesPagas.map(c => React.createElement("div", {
    key: c.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 20px",
      borderBottom: "1px solid var(--gray-100)",
      opacity: 0.75
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, c.pacienteNome || "—"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, c.tipo, " \xB7 ", labelTipoVenda(c.tipoVenda), " \xB7 pago em ", c.dataPagamento ? c.dataPagamento.split("-").reverse().join("/") : "—")), React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#16a34a"
    }
  }, "\u2713 R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ","))))), React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 14,
      border: "1px solid var(--gray-200)",
      overflow: "hidden",
      marginTop: 24
    }
  }, React.createElement("div", {
    style: {
      padding: "14px 20px",
      borderBottom: "1px solid var(--gray-200)",
      fontWeight: 700,
      fontSize: 14
    }
  }, "\uD83E\uDD1D Repasses a Parceiras \u2014 ", getMesLabel(mesSel)), responsaveis.length === 0 ? React.createElement("div", {
    style: {
      padding: "30px 20px",
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhum repasse neste m\xEAs. Vendas em parceria aparecem aqui automaticamente.") : responsaveis.map(resp => {
    const itens = repassesMes.filter(c => c.responsavel === resp);
    const totalResp = itens.reduce((a, c) => a + (c.valorComissao || 0), 0);
    const pendentes = itens.filter(c => c.status !== "pago");
    const totalPend = pendentes.reduce((a, c) => a + (c.valorComissao || 0), 0);
    const parc = parceiras.find(p => p.nome === resp);
    return React.createElement("div", {
      key: resp,
      style: {
        borderBottom: "1px solid var(--gray-100)"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 20px",
        background: "#fffbeb",
        flexWrap: "wrap",
        gap: 10
      }
    }, React.createElement("div", null, React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14
      }
    }, resp), React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, itens.length, " venda(s) \xB7 Total R$ ", totalResp.toFixed(2).replace(".", ","), parc?.pix ? ` · PIX: ${parc.pix}` : "")), React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)"
      }
    }, "Pendente"), React.createElement("div", {
      style: {
        fontWeight: 800,
        fontSize: 18,
        color: totalPend > 0 ? "#b45309" : "#16a34a"
      }
    }, "R$ ", totalPend.toFixed(2).replace(".", ","))), user.tipo === "psicologa" && totalPend > 0 && React.createElement("button", {
      onClick: () => pagarRepasse(resp),
      disabled: pagando,
      style: {
        background: "#b45309",
        color: "white",
        border: "none",
        borderRadius: 8,
        padding: "9px 16px",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "var(--font-body)"
      }
    }, pagando ? "..." : "💸 Marcar como pago"))), itens.map(c => React.createElement("div", {
      key: c.id,
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        borderTop: "1px solid var(--gray-100)"
      }
    }, React.createElement("div", null, React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, c.pacienteNome || "—"), React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)"
      }
    }, c.tipo, " \xB7 ", c.perc ? `${c.perc}% de R$ ${(c.valorBase || 0).toFixed(2).replace(".", ",")}` : "")), React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "#b45309"
      }
    }, "R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")), c.status === "pago" ? React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#16a34a",
        fontWeight: 600
      }
    }, "\u2713 Pago ", c.dataPagamento ? c.dataPagamento.split("-").reverse().join("/") : "") : React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#b45309",
        fontWeight: 600
      }
    }, "Pendente")))));
  })), user.tipo === "psicologa" && React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 14,
      border: "1px solid var(--gray-200)",
      overflow: "hidden",
      marginTop: 24
    }
  }, React.createElement("div", {
    style: {
      padding: "14px 20px",
      borderBottom: "1px solid var(--gray-200)",
      fontWeight: 700,
      fontSize: 14,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, React.createElement("span", null, "Parceiras Cadastradas"), React.createElement("button", {
    onClick: () => {
      setEditandoParceira(null);
      setFormParceira({
        nome: "",
        percentual: String(config.percParceiroPadrao || 70),
        pix: "",
        tipo: "parceira"
      });
      setModalParceira(true);
    },
    style: {
      background: "var(--purple)",
      color: "white",
      border: "none",
      borderRadius: 8,
      padding: "7px 16px",
      fontWeight: 700,
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "var(--font-body)"
    }
  }, "+ Nova Parceira")), parceiras.length === 0 ? React.createElement("div", {
    style: {
      padding: "30px 20px",
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhuma parceira cadastrada. Cadastre para usar nas vendas em parceria.") : parceiras.map(p => React.createElement("div", {
    key: p.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 20px",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, p.nome, " ", p.tipo === "estagiaria" && React.createElement("span", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      background: "#ccfbf1",
      color: "#0d9488",
      padding: "2px 8px",
      borderRadius: 10,
      marginLeft: 6
    }
  }, "Estagi\xE1ria")), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Repasse padr\xE3o: ", p.percentual || config.percParceiroPadrao, "% ", p.pix ? ` · PIX: ${p.pix}` : "")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, React.createElement("button", {
    onClick: () => {
      setEditandoParceira(p.id);
      setFormParceira({
        nome: p.nome || "",
        percentual: String(p.percentual || config.percParceiroPadrao || 70),
        pix: p.pix || "",
        tipo: p.tipo || "parceira"
      });
      setModalParceira(true);
    },
    style: {
      background: "none",
      border: "1px solid #e5e7eb",
      borderRadius: 6,
      cursor: "pointer",
      padding: "5px 10px",
      fontSize: 12
    }
  }, "\u270F\uFE0F"), React.createElement("button", {
    onClick: async () => {
      if (!confirm(`Excluir parceira ${p.nome}? Os repasses já registrados não serão apagados.`)) return;
      await db.collection("clinica_parceiras").doc(p.id).delete();
    },
    style: {
      background: "none",
      border: "1px solid #fca5a5",
      borderRadius: 6,
      color: "#dc2626",
      cursor: "pointer",
      padding: "5px 10px",
      fontSize: 12
    }
  }, "\uD83D\uDDD1\uFE0F"))))), modalParceira && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModalParceira(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 420
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 20
    }
  }, editandoParceira ? "Editar Parceira" : "Nova Parceira"), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Nome"), React.createElement("input", {
    className: "form-input",
    value: formParceira.nome,
    onChange: e => setFormParceira({
      ...formParceira,
      nome: e.target.value
    }),
    placeholder: "Ex: Thais Cordeiro"
  })), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "% de repasse padr\xE3o"), React.createElement("input", {
    className: "form-input",
    type: "number",
    min: "0",
    max: "100",
    value: formParceira.percentual,
    onChange: e => setFormParceira({
      ...formParceira,
      percentual: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Chave PIX (opcional)"), React.createElement("input", {
    className: "form-input",
    value: formParceira.pix,
    onChange: e => setFormParceira({
      ...formParceira,
      pix: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Tipo"), React.createElement("select", {
    className: "form-input",
    value: formParceira.tipo,
    onChange: e => setFormParceira({
      ...formParceira,
      tipo: e.target.value
    })
  }, React.createElement("option", {
    value: "parceira"
  }, "Parceira (vendas em parceria)"), React.createElement("option", {
    value: "estagiaria"
  }, "Estagi\xE1ria (projeto social)"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalParceira(false)
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarParceira
  }, editandoParceira ? "Salvar alterações" : "Salvar")))));
}
function Depoimentos() {
  const [lista, setLista] = useState([]);
  const [aba, setAba] = useState("pendente");
  const [salvando, setSalvando] = useState(null);
  useEffect(() => {
    const unsub = db.collection("site_depoimentos").orderBy("createdAt", "desc").onSnapshot(s => setLista(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    return unsub;
  }, []);
  const filtrado = lista.filter(d => d.status === aba);
  const pendentes = lista.filter(d => d.status === "pendente").length;
  async function aprovar(id) {
    setSalvando(id);
    await db.collection("site_depoimentos").doc(id).update({
      status: "aprovado"
    });
    setSalvando(null);
  }
  async function rejeitar(id) {
    if (!confirm("Rejeitar este depoimento?")) return;
    await db.collection("site_depoimentos").doc(id).update({
      status: "rejeitado"
    });
  }
  async function excluir(id) {
    if (!confirm("Excluir permanentemente?")) return;
    await db.collection("site_depoimentos").doc(id).delete();
  }
  function Estrelas({
    n
  }) {
    return React.createElement("span", {
      style: {
        color: "#7B00C4",
        fontSize: 16,
        letterSpacing: 2
      }
    }, "★".repeat(n || 5), "☆".repeat(5 - (n || 5)));
  }
  return React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 12
    }
  }, React.createElement("div", null, React.createElement("div", {
    className: "page-title"
  }, "Depoimentos"), React.createElement("div", {
    className: "page-subtitle"
  }, "Gerencie os depoimentos do site")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, React.createElement("a", {
    href: "../feedback/",
    target: "_blank",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "9px 16px",
      borderRadius: 10,
      background: "var(--purple-soft)",
      color: "var(--purple)",
      fontSize: 13,
      fontWeight: 600,
      textDecoration: "none"
    }
  }, React.createElement(Icon, {
    name: "external-link",
    size: 14
  }), " Ver formul\xE1rio"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 13
    },
    onClick: () => {
      navigator.clipboard.writeText("https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/feedback/");
      alert("Link copiado!");
    }
  }, React.createElement(Icon, {
    name: "copy",
    size: 14
  }), " Copiar link"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 0,
      marginBottom: 20,
      borderBottom: "2px solid var(--gray-200)"
    }
  }, [["pendente", "⏳ Pendentes", pendentes], ["aprovado", "✓ Aprovados", lista.filter(d => d.status === "aprovado").length], ["rejeitado", "✗ Rejeitados", lista.filter(d => d.status === "rejeitado").length]].map(([id, label, count]) => React.createElement("button", {
    key: id,
    onClick: () => setAba(id),
    style: {
      padding: "10px 20px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontWeight: aba === id ? 600 : 400,
      color: aba === id ? "var(--purple)" : "#6b7280",
      borderBottom: aba === id ? "2px solid var(--purple)" : "2px solid transparent",
      marginBottom: -2,
      fontSize: 14,
      fontFamily: "var(--font-body)",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, label, count > 0 && React.createElement("span", {
    style: {
      background: id === "pendente" ? "#dc2626" : "var(--purple-soft)",
      color: id === "pendente" ? "white" : "var(--purple)",
      borderRadius: 20,
      padding: "1px 7px",
      fontSize: 11,
      fontWeight: 700
    }
  }, count)))), filtrado.length === 0 ? React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, React.createElement(Icon, {
    name: "star",
    size: 40
  }), React.createElement("div", {
    style: {
      marginTop: 12,
      fontWeight: 500
    }
  }, aba === "pendente" ? "Nenhum depoimento aguardando aprovação" : aba === "aprovado" ? "Nenhum depoimento aprovado ainda" : "Nenhum depoimento rejeitado")) : React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, filtrado.map(d => React.createElement("div", {
    key: d.id,
    className: "card",
    style: {
      padding: "20px 24px"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      flexWrap: "wrap"
    }
  }, React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 8
    }
  }, React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      background: "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      color: "var(--purple)",
      flexShrink: 0
    }
  }, (d.nome || "?")[0].toUpperCase()), React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15
    }
  }, d.nome), d.cargo && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, d.cargo)), React.createElement(Estrelas, {
    n: d.estrelas
  })), React.createElement("p", {
    style: {
      fontSize: 14,
      color: "#374151",
      lineHeight: 1.7,
      fontStyle: "italic"
    }
  }, "\"", d.texto, "\""), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 8
    }
  }, d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }) : "")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexShrink: 0
    }
  }, aba === "pendente" && React.createElement(React.Fragment, null, React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: () => aprovar(d.id),
    disabled: salvando === d.id
  }, React.createElement(Icon, {
    name: "check",
    size: 13
  }), " ", salvando === d.id ? "..." : "Aprovar"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px",
      color: "#dc2626",
      borderColor: "#fca5a5"
    },
    onClick: () => rejeitar(d.id)
  }, React.createElement(Icon, {
    name: "x",
    size: 13
  }), " Rejeitar")), aba === "rejeitado" && React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: () => aprovar(d.id)
  }, React.createElement(Icon, {
    name: "check",
    size: 13
  }), " Aprovar mesmo assim"), aba === "aprovado" && React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px",
      color: "#dc2626",
      borderColor: "#fca5a5"
    },
    onClick: () => rejeitar(d.id)
  }, React.createElement(Icon, {
    name: "x",
    size: 13
  }), " Remover do site"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 10px",
      color: "#dc2626"
    },
    onClick: () => excluir(d.id)
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }))))))));
}
function Configuracoes() {
  const [tiposLaudo, setTiposLaudo] = useState(["Avaliacao Neuropsicologica", "Avaliacao Psicologica", "Avaliacao Infantil", "Avaliacao de TDAH", "Avaliacao de Altas Habilidades", "Pericia Psicologica", "Demandas Judiciais", "Orientacao de Carreira", "Relatorio de Acompanhamento", "Outro"]);
  const [novoTipo, setNovoTipo] = useState("");
  const [logoUrl, setLogoUrl] = useState("../logo-transparente.png");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  function adicionarTipo() {
    const t = novoTipo.trim();
    if (!t || tiposLaudo.includes(t)) return;
    setTiposLaudo(prev => [...prev, t]);
    setNovoTipo("");
  }
  async function salvarTipos() {
    setSalvando(true);
    await db.collection("clinica_config").doc("laudoTypes").set({
      tipos: tiposLaudo
    });
    setMsg("Tipos de laudo salvos!");
    setSalvando(false);
    setTimeout(() => setMsg(""), 3000);
  }
  async function alterarSenha() {
    if (senhaAtual !== "1234") {
      setMsg("Senha atual incorreta.");
      return;
    }
    if (novaSenha.length < 4) {
      setMsg("Nova senha deve ter ao menos 4 caracteres.");
      return;
    }
    if (novaSenha !== confirmSenha) {
      setMsg("Senhas nao conferem.");
      return;
    }
    await db.collection("clinica_config").doc("admin").set({
      senha: novaSenha
    });
    setMsg("Senha alterada! Atualize o arquivo app.js com a nova senha.");
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmSenha("");
  }
  return React.createElement("div", null, React.createElement("div", {
    className: "page-header"
  }, React.createElement("div", {
    className: "page-title"
  }, "Configuracoes"), React.createElement("div", {
    className: "page-subtitle"
  }, "Personalize sua identidade clinica e documentos")), msg && React.createElement("div", {
    style: {
      background: "var(--purple-bg)",
      border: "1px solid var(--purple)",
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 20,
      fontSize: 14,
      color: "var(--purple)",
      fontWeight: 500
    }
  }, msg), React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      marginBottom: 4
    }
  }, "Identidade Visual"), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Logotipo e assinatura digital para laudos e documentos oficiais."), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: 16,
      borderRadius: 12,
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      background: "var(--purple-soft)",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement(Icon, {
    name: "image",
    size: 22
  })), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Logo / Identidade Visual"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Logotipo que aparecera no cabecalho dos laudos e documentos oficiais. Formatos aceitos: PNG, JPG, SVG.")), React.createElement("button", {
    className: "btn btn-outline",
    style: {
      fontSize: 13
    }
  }, React.createElement(Icon, {
    name: "upload",
    size: 14
  }), " Enviar Logo")), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: 16,
      borderRadius: 12,
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      background: "#f5f3ff",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement(Icon, {
    name: "pen-line",
    size: 22
  })), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Assinatura Digital"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Imagem da sua assinatura manuscrita para uso nos laudos assinados. Recomendado fundo transparente (PNG).")), React.createElement("button", {
    className: "btn btn-outline",
    style: {
      fontSize: 13
    }
  }, React.createElement(Icon, {
    name: "upload",
    size: 14
  }), " Enviar Assinatura")), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: 16,
      borderRadius: 12,
      border: "1px solid var(--gray-200)",
      background: "var(--gray-50)"
    }
  }, React.createElement("img", {
    src: "../logo-transparente.png",
    alt: "Logo padrao",
    style: {
      width: 56,
      height: 56,
      borderRadius: 10,
      objectFit: "contain",
      background: "var(--purple)",
      padding: 6
    },
    onError: e => e.target.style.display = "none"
  }), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Logo Padrao do Sistema"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Esta e a logo padrao. Ela e usada automaticamente enquanto voce nao enviar uma logo personalizada."), React.createElement("div", {
    style: {
      fontSize: 12,
      marginTop: 4
    }
  }, React.createElement("strong", null, "Dra. Lucia Kratz"), " \xB7 Psicologa Doutora \xB7 CRP 09/20590"))))), React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      marginBottom: 4
    }
  }, "Sobre os Laudos"), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16,
      lineHeight: 1.7
    }
  }, "Os laudos gerados seguem a Resolucao CFP no 06/2019. Ao clicar em \"Assinar Laudo\", o documento recebe um registro de data/hora da assinatura e sua assinatura digital."), React.createElement("div", {
    style: {
      background: "var(--purple-bg)",
      borderRadius: 10,
      padding: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 12
    }
  }, "Tipos de Laudo dispon\xEDveis"), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginBottom: 14
    }
  }, tiposLaudo.map((t, i) => React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "white",
      borderRadius: 8,
      padding: "10px 14px",
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 14
    }
  }, t), React.createElement("button", {
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)",
      padding: 4
    },
    onClick: () => setTiposLaudo(prev => prev.filter((_, idx) => idx !== i))
  }, React.createElement(Icon, {
    name: "x",
    size: 14
  }))))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1
    },
    placeholder: "Adicionar novo tipo...",
    value: novoTipo,
    onChange: e => setNovoTipo(e.target.value),
    onKeyDown: e => e.key === "Enter" && adicionarTipo()
  }), React.createElement("button", {
    className: "btn btn-outline",
    onClick: adicionarTipo
  }, React.createElement(Icon, {
    name: "plus",
    size: 16
  }))), React.createElement("button", {
    className: "btn btn-purple",
    style: {
      marginTop: 14,
      width: "100%"
    },
    onClick: salvarTipos,
    disabled: salvando
  }, salvando ? "Salvando..." : "Salvar tipos de laudo"))), React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      marginBottom: 4
    }
  }, "Seguran\xE7a"), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Alterar senha de acesso da Psicologa."), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Senha atual"), React.createElement("input", {
    className: "form-input",
    type: "password",
    value: senhaAtual,
    onChange: e => setSenhaAtual(e.target.value)
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Nova senha"), React.createElement("input", {
    className: "form-input",
    type: "password",
    value: novaSenha,
    onChange: e => setNovaSenha(e.target.value)
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Confirmar nova senha"), React.createElement("input", {
    className: "form-input",
    type: "password",
    value: confirmSenha,
    onChange: e => setConfirmSenha(e.target.value)
  }))), React.createElement("button", {
    className: "btn btn-purple",
    onClick: alterarSenha
  }, React.createElement(Icon, {
    name: "key",
    size: 15
  }), " Alterar Senha")));
}
function Agenda() {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  const [sessoes, setSessoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [form, setForm] = useState({
    pacienteId: "",
    data: "",
    hora: "09:00",
    duracao: "50",
    tipo: "Psicoterapia",
    status: "agendado",
    obs: ""
  });
  const [salvando, setSalvando] = useState(false);
  const TIPOS = ["Psicoterapia", "Avaliacao Neuropsicologica", "Avaliacao Psicologica", "Terapia de Casais", "Musicoterapia", "Orientacao de Carreira", "Retorno", "Outro"];
  const STATUS_CONFIG = {
    agendado: {
      label: "Agendado",
      cor: "#7B00C4",
      bg: "#f5f0ff"
    },
    confirmado: {
      label: "Confirmado",
      cor: "#059669",
      bg: "#d1fae5"
    },
    realizado: {
      label: "Realizado",
      cor: "#0891b2",
      bg: "#e0f2fe"
    },
    cancelado: {
      label: "Cancelado",
      cor: "#dc2626",
      bg: "#fee2e2"
    },
    falta: {
      label: "Falta",
      cor: "#d97706",
      bg: "#fef3c7"
    }
  };
  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  useEffect(() => {
    const u1 = db.collection("clinica_sessoes").onSnapshot(snap => {
      setSessoes(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    const u2 = db.collection("sala_reservas").onSnapshot(snap => {
      const reservasSala = snap.docs.map(d => ({
        id: "sala_" + d.id,
        ...d.data(),
        pacienteNome: d.data().usuarioId === "thais" ? `🟠 Thais — ${d.data().titulo || "Sala reservada"}` : `🟣 ${d.data().titulo || "Sala — Lucia"}`,
        tipo: "sala",
        hora: d.data().horaInicio,
        status: "agendado",
        _sala: true
      }));
      setSessoes(prev => {
        const semSala = prev.filter(s => !s._sala);
        return [...semSala, ...reservasSala];
      });
    }, () => {});
    return () => {
      u1();
      u2();
    };
  }, []);
  function getInicioSemana(offset = 0) {
    const hoje = new Date();
    const dia = hoje.getDay();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - dia + offset * 7);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  }
  function getDiasSemana(offset = 0) {
    const inicio = getInicioSemana(offset);
    return Array.from({
      length: 7
    }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }
  const dias = getDiasSemana(semanaOffset);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  function formatData(d) {
    return d.toISOString().split("T")[0];
  }
  function sessoesNoDia(dia) {
    const str = formatData(dia);
    return sessoes.filter(s => s.data === str).sort((a, b) => a.hora.localeCompare(b.hora));
  }
  async function salvar() {
    if (!form.pacienteId || !form.data || !form.hora) {
      alert("Preencha paciente, data e hora.");
      return;
    }
    setSalvando(true);
    const pac = pacientes.find(p => p.id === form.pacienteId);
    const dados = {
      ...form,
      pacienteNome: pac?.nome || "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editando) {
      await db.collection("clinica_sessoes").doc(editando).update(dados);
      await dispararNotificacao({
        tipo: "sessao",
        titulo: `Sessão atualizada — ${pac?.nome || "Paciente"}`,
        corpo: `${form.data?.split("-").reverse().join("/") || ""} às ${form.hora} · ${form.tipo}`,
        pacienteId: form.pacienteId
      });
    } else {
      await db.collection("clinica_sessoes").add({
        ...dados,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await dispararNotificacao({
        tipo: "sessao",
        titulo: `Nova sessão agendada — ${pac?.nome || "Paciente"}`,
        corpo: `${form.data?.split("-").reverse().join("/") || ""} às ${form.hora} · ${form.tipo}`,
        pacienteId: form.pacienteId
      });
    }
    setModal(false);
    setEditando(null);
    setForm({
      pacienteId: "",
      data: "",
      hora: "09:00",
      duracao: "50",
      tipo: "Psicoterapia",
      status: "agendado",
      obs: ""
    });
    setSalvando(false);
  }
  function abrirEditar(s) {
    setForm({
      pacienteId: s.pacienteId || "",
      data: s.data || "",
      hora: s.hora || "09:00",
      duracao: s.duracao || "50",
      tipo: s.tipo || "Psicoterapia",
      status: s.status || "agendado",
      obs: s.obs || ""
    });
    setEditando(s.id);
    setModal(true);
  }
  async function mudarStatus(id, status) {
    await db.collection("clinica_sessoes").doc(id).update({
      status
    });
  }
  async function excluir(id) {
    if (!confirm("Excluir esta sessão?")) return;
    await db.collection("clinica_sessoes").doc(id).delete();
  }
  const sessoesHoje = sessoesNoDia(hoje);
  const proximas = sessoes.filter(s => {
    const d = new Date(s.data + "T00:00:00");
    return d >= hoje && s.status !== "cancelado" && s.status !== "realizado";
  }).slice(0, 5);
  const [modalSala, setModalSala] = useState(false);
  const [formSala, setFormSala] = useState({
    data: "",
    horaInicio: "09:00",
    horaFim: "10:00",
    titulo: "",
    recorrencia: "unico"
  });
  const [salvandoSala, setSalvandoSala] = useState(false);
  async function salvarBloqueioSala() {
    if (!formSala.data || !formSala.horaInicio || !formSala.horaFim) {
      alert("Preencha data, início e fim.");
      return;
    }
    if (formSala.horaInicio >= formSala.horaFim) {
      alert("Início deve ser antes do fim.");
      return;
    }
    setSalvandoSala(true);
    const base = {
      horaInicio: formSala.horaInicio,
      horaFim: formSala.horaFim,
      titulo: formSala.titulo || "",
      usuarioId: "lucia",
      usuarioNome: "Lucia Kratz",
      cor: "#7B00C4",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (formSala.recorrencia === "recorrente") {
      const dataInicio = new Date(formSala.data + "T00:00:00");
      const diaSemana = dataInicio.getDay();
      const batch = db.batch();
      for (let w = 0; w < 12; w++) {
        const d = new Date(dataInicio);
        d.setDate(dataInicio.getDate() + w * 7);
        const dataStr = d.toISOString().split("T")[0];
        const ref = db.collection("sala_reservas").doc();
        batch.set(ref, {
          ...base,
          data: dataStr,
          recorrenteRef: formSala.data
        });
      }
      await batch.commit();
      await dispararNotificacao({
        tipo: "bloqueio_sala",
        titulo: `Sala bloqueada — recorrente (12 semanas)`,
        corpo: `${formSala.data?.split("-").reverse().join("/") || ""} · ${formSala.horaInicio}–${formSala.horaFim}${formSala.titulo ? " · " + formSala.titulo : ""}`
      });
    } else {
      await db.collection("sala_reservas").add({
        ...base,
        data: formSala.data
      });
      await dispararNotificacao({
        tipo: "bloqueio_sala",
        titulo: `Sala bloqueada — ${formSala.data?.split("-").reverse().join("/") || ""}`,
        corpo: `${formSala.horaInicio}–${formSala.horaFim}${formSala.titulo ? " · " + formSala.titulo : ""}`
      });
    }
    setModalSala(false);
    setFormSala({
      data: "",
      horaInicio: "09:00",
      horaFim: "10:00",
      titulo: "",
      recorrencia: "unico"
    });
    setSalvandoSala(false);
  }
  if (loading) return React.createElement(Spinner, null);
  return React.createElement("div", null, React.createElement("div", {
    className: "page-header",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 8
    }
  }, React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, React.createElement("div", {
    className: "page-title"
  }, "Agenda"), React.createElement("div", {
    className: "page-subtitle"
  }, sessoes.filter(s => s.status === "agendado" || s.status === "confirmado").length, " sess\xF5es agendadas")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      justifyContent: "flex-end"
    }
  }, React.createElement("a", {
    href: "https://docplanner.doctoralia.com.br/#/calendar/week",
    target: "_blank",
    rel: "noreferrer",
    className: "btn btn-ghost",
    style: {
      fontSize: 13,
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(Icon, {
    name: "external-link",
    size: 13
  }), " Doctoralia"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      borderColor: "#ea580c",
      color: "#ea580c"
    },
    onClick: () => {
      setFormSala({
        data: formatData(hoje),
        horaInicio: "09:00",
        horaFim: "10:00",
        titulo: "",
        recorrencia: "unico"
      });
      setModalSala(true);
    }
  }, React.createElement(Icon, {
    name: "lock",
    size: 15
  }), " Bloquear Sala"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      setForm({
        pacienteId: "",
        data: formatData(hoje),
        hora: "09:00",
        duracao: "50",
        tipo: "Psicoterapia",
        status: "agendado",
        obs: ""
      });
      setEditando(null);
      setModal(true);
    }
  }, React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Nova Sess\xE3o"))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 10,
      marginBottom: 20
    }
  }, [["Hoje", sessoesHoje.length, "#7B00C4", "var(--purple-soft)"], ["Agendadas", sessoes.filter(s => s.status === "agendado").length, "#0891b2", "#e0f2fe"], ["Confirmadas", sessoes.filter(s => s.status === "confirmado").length, "#059669", "#d1fae5"], ["Este mês", sessoes.filter(s => s.data?.startsWith(new Date().toISOString().slice(0, 7))).length, "#d97706", "#fef3c7"]].map(([l, n, cor, bg]) => React.createElement("div", {
    key: l,
    style: {
      background: bg,
      borderRadius: 12,
      padding: "12px 16px",
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 800,
      color: cor
    }
  }, n), React.createElement("div", {
    style: {
      fontSize: 12,
      color: cor,
      fontWeight: 500
    }
  }, l)))), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 16
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "8px 12px"
    },
    onClick: () => setSemanaOffset(s => s - 1)
  }, React.createElement(Icon, {
    name: "chevron-left",
    size: 18
  })), React.createElement("div", {
    style: {
      flex: 1,
      textAlign: "center",
      fontWeight: 600,
      fontSize: 15
    }
  }, dias[0].toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  }), " \u2014 ", dias[6].toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "8px 10px",
      fontSize: 12
    },
    onClick: () => setSemanaOffset(0)
  }, "Hoje"), React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "8px 12px"
    },
    onClick: () => setSemanaOffset(s => s + 1)
  }, React.createElement(Icon, {
    name: "chevron-right",
    size: 18
  }))), React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, React.createElement("div", {
    style: {
      overflowX: "auto",
      WebkitOverflowScrolling: "touch"
    }
  }, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "60px repeat(7,minmax(44px,1fr))",
      gap: 3,
      marginBottom: 4,
      minWidth: 380
    }
  }, React.createElement("div", null), dias.map((dia, i) => {
    const isHoje = formatData(dia) === formatData(hoje);
    const isPassado = dia < hoje;
    return React.createElement("div", {
      key: i,
      style: {
        textAlign: "center",
        padding: "8px 4px",
        borderRadius: 10,
        background: isHoje ? "var(--purple)" : "white",
        border: "1.5px solid",
        borderColor: isHoje ? "var(--purple)" : "var(--gray-200)"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        color: isHoje ? "rgba(255,255,255,.8)" : isPassado ? "#9ca3af" : "var(--gray-500)"
      }
    }, DIAS_SEMANA[i]), React.createElement("div", {
      style: {
        fontSize: 20,
        fontWeight: 800,
        color: isHoje ? "white" : isPassado ? "#9ca3af" : "var(--gray-800)",
        lineHeight: 1.2
      }
    }, dia.getDate()), React.createElement("div", {
      style: {
        fontSize: 9,
        color: isHoje ? "rgba(255,255,255,.7)" : "var(--gray-400)"
      }
    }, dia.toLocaleDateString("pt-BR", {
      month: "short"
    })));
  }))), React.createElement("div", {
    style: {
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      marginBottom: 4
    }
  }, [{
    label: "☀️ Manhã",
    range: ["06:00", "12:00"],
    bg: "#fffbeb"
  }, {
    label: "🌤️ Tarde",
    range: ["12:00", "18:00"],
    bg: "#f0f9ff"
  }, {
    label: "🌙 Noite",
    range: ["18:00", "23:59"],
    bg: "#f5f3ff"
  }].map(periodo => {
    const sessoesNoPeriodo = dias.some(dia => sessoesNoDia(dia).some(s => s.hora >= periodo.range[0] && s.hora < periodo.range[1]));
    return React.createElement("div", {
      key: periodo.label,
      style: {
        display: "grid",
        gridTemplateColumns: "60px repeat(7,minmax(44px,1fr))",
        gap: 3,
        marginBottom: 4,
        minWidth: 380
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        paddingRight: 8,
        paddingTop: 8
      }
    }, React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: "var(--gray-500)",
        writingMode: "horizontal-tb",
        whiteSpace: "nowrap"
      }
    }, periodo.label)), dias.map((dia, i) => {
      const isHoje = formatData(dia) === formatData(hoje);
      const sessDia = sessoesNoDia(dia).filter(s => s.hora >= periodo.range[0] && s.hora < periodo.range[1]);
      return React.createElement("div", {
        key: i,
        style: {
          minHeight: 70,
          background: isHoje ? periodo.bg + "cc" : periodo.bg,
          border: "1px solid",
          borderColor: isHoje ? "var(--purple)30" : "var(--gray-200)",
          borderRadius: 8,
          padding: 4,
          display: "flex",
          flexDirection: "column",
          gap: 3
        }
      }, sessDia.map(s => {
        const st = s._sala ? {
          bg: "#fff7ed",
          cor: "#ea580c",
          label: "Sala"
        } : STATUS_CONFIG[s.status] || STATUS_CONFIG.agendado;
        return React.createElement("div", {
          key: s.id,
          onClick: () => !s._sala && abrirEditar(s),
          style: {
            background: st.bg,
            borderLeft: "3px solid " + st.cor,
            borderRadius: 5,
            padding: "4px 6px",
            cursor: s._sala ? "default" : "pointer",
            fontSize: 11,
            lineHeight: 1.4
          }
        }, React.createElement("div", {
          style: {
            fontWeight: 700,
            color: st.cor,
            fontSize: 12
          }
        }, s.hora), React.createElement("div", {
          style: {
            color: "#111",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11
          }
        }, s._sala ? s.pacienteNome || "Sala" : s.pacienteNome?.split(" ")[0] || "—"), !s._sala && React.createElement("div", {
          style: {
            color: "#6b7280",
            fontSize: 9
          }
        }, s.tipo));
      }), React.createElement("button", {
        onClick: () => {
          setForm({
            pacienteId: "",
            data: formatData(dia),
            hora: periodo.range[0] === "06:00" ? "08:00" : periodo.range[0] === "12:00" ? "14:00" : "19:00",
            duracao: "50",
            tipo: "Psicoterapia",
            status: "agendado",
            obs: ""
          });
          setEditando(null);
          setModal(true);
        },
        style: {
          background: "none",
          border: "1px dashed #d1d5db",
          borderRadius: 4,
          padding: "3px",
          cursor: "pointer",
          color: "#9ca3af",
          fontSize: 11,
          width: "100%",
          marginTop: "auto"
        }
      }, "+"));
    }));
  }))), proximas.length > 0 && React.createElement("div", {
    className: "card"
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(Icon, {
    name: "clock",
    size: 16
  }), " Pr\xF3ximas Sess\xF5es"), proximas.map(s => {
    const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.agendado;
    const dataFmt = new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short"
    });
    return React.createElement("div", {
      key: s.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--gray-100)"
      }
    }, React.createElement("div", {
      style: {
        width: 48,
        height: 48,
        borderRadius: 10,
        background: st.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: st.cor
      }
    }, s.hora), React.createElement("div", {
      style: {
        fontSize: 9,
        color: st.cor
      }
    }, s.duracao, "min")), React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, s.pacienteNome), React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, dataFmt, " \xB7 ", s.tipo)), React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        alignItems: "center"
      }
    }, React.createElement("span", {
      style: {
        background: st.bg,
        color: st.cor,
        borderRadius: 20,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 600
      }
    }, st.label), React.createElement("select", {
      value: s.status,
      onChange: e => mudarStatus(s.id, e.target.value),
      style: {
        fontSize: 11,
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        padding: "2px 4px",
        cursor: "pointer",
        background: "white",
        color: "#374151"
      }
    }, Object.entries(STATUS_CONFIG).map(([k, v]) => React.createElement("option", {
      key: k,
      value: k
    }, v.label))), React.createElement("button", {
      onClick: () => excluir(s.id),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#dc2626",
        padding: 4
      }
    }, React.createElement(Icon, {
      name: "trash-2",
      size: 13
    }))));
  })), modal && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 480
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, editando ? "Editar Sessão" : "Nova Sessão"), React.createElement("button", {
    onClick: () => setModal(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Paciente *"), React.createElement("select", {
    className: "form-input",
    value: form.pacienteId,
    onChange: e => setForm({
      ...form,
      pacienteId: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Selecionar paciente..."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.nome)))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 12,
      marginBottom: 14
    }
  }, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Data *"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: form.data,
    onChange: e => setForm({
      ...form,
      data: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Hora *"), React.createElement("input", {
    className: "form-input",
    type: "time",
    value: form.hora,
    onChange: e => setForm({
      ...form,
      hora: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Dura\xE7\xE3o (min)"), React.createElement("select", {
    className: "form-input",
    value: form.duracao,
    onChange: e => setForm({
      ...form,
      duracao: e.target.value
    })
  }, ["30", "45", "50", "60", "90"].map(d => React.createElement("option", {
    key: d,
    value: d
  }, d, " min"))))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 14
    }
  }, React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Tipo"), React.createElement("select", {
    className: "form-input",
    value: form.tipo,
    onChange: e => setForm({
      ...form,
      tipo: e.target.value
    })
  }, TIPOS.map(t => React.createElement("option", {
    key: t,
    value: t
  }, t)))), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Status"), React.createElement("select", {
    className: "form-input",
    value: form.status,
    onChange: e => setForm({
      ...form,
      status: e.target.value
    })
  }, Object.entries(STATUS_CONFIG).map(([k, v]) => React.createElement("option", {
    key: k,
    value: k
  }, v.label))))), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Observa\xE7\xF5es"), React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: form.obs,
    onChange: e => setForm({
      ...form,
      obs: e.target.value
    }),
    placeholder: "Notas sobre a sess\xE3o..."
  })), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal(false)
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando
  }, React.createElement(Icon, {
    name: "save",
    size: 15
  }), " ", salvando ? "Salvando..." : "Salvar")))), modalSala && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModalSala(false)
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 440
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, React.createElement(Icon, {
    name: "lock",
    size: 18
  }), " Bloquear Sala"), React.createElement("button", {
    onClick: () => setModalSala(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, React.createElement(Icon, {
    name: "x",
    size: 20
  }))), React.createElement("div", {
    style: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 13,
      color: "#92400e"
    }
  }, "Este bloqueio aparece para a Thais como hor\xE1rio ocupado na agenda compartilhada."), React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 16
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Tipo de bloqueio"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["unico", "Só este dia", "#7B00C4"], ["recorrente", "Toda semana (12 semanas)", "#059669"]].map(([v, l, c]) => React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormSala({
      ...formSala,
      recorrencia: v
    }),
    style: {
      flex: 1,
      padding: "10px 8px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formSala.recorrencia === v ? c : "#e5e7eb",
      background: formSala.recorrencia === v ? c + "15" : "white",
      color: formSala.recorrencia === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "var(--font-body)",
      textAlign: "center"
    }
  }, l))), formSala.recorrencia === "recorrente" && React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 12,
      color: "#059669",
      background: "#f0fdf4",
      borderRadius: 8,
      padding: "8px 12px"
    }
  }, "\u2713 Vai bloquear o mesmo dia da semana por 12 semanas consecutivas")), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Data"), React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formSala.data,
    onChange: e => setFormSala({
      ...formSala,
      data: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "In\xEDcio"), React.createElement("input", {
    className: "form-input",
    type: "time",
    value: formSala.horaInicio,
    onChange: e => setFormSala({
      ...formSala,
      horaInicio: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group"
  }, React.createElement("label", {
    className: "form-label"
  }, "Fim"), React.createElement("input", {
    className: "form-input",
    type: "time",
    value: formSala.horaFim,
    onChange: e => setFormSala({
      ...formSala,
      horaFim: e.target.value
    })
  })), React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "T\xEDtulo (opcional)"), React.createElement("input", {
    className: "form-input",
    value: formSala.titulo,
    onChange: e => setFormSala({
      ...formSala,
      titulo: e.target.value
    }),
    placeholder: "Ex: Sess\xE3o, Avalia\xE7\xE3o..."
  }))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalSala(false)
  }, "Cancelar"), React.createElement("button", {
    style: {
      background: "#ea580c",
      color: "white",
      border: "none",
      borderRadius: 10,
      padding: "10px 20px",
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-body)"
    },
    onClick: salvarBloqueioSala,
    disabled: salvandoSala
  }, React.createElement(Icon, {
    name: "lock",
    size: 15
  }), " ", salvandoSala ? "Salvando..." : "Bloquear")))));
}
function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(null);
  const notifProps = useBotaoNotificacao(user);
  const PERMISSOES_DEFAULT = {
    psicologa: {
      ver_financeiro_clinica: true,
      ver_financeiro_pessoal: true,
      ver_pacientes: true,
      ver_agenda: true,
      ver_marketing: true,
      ver_funil: true,
      ver_resumo_marketing: true,
      ver_supervisao: true,
      ver_relatorios: true,
      editar_financeiro: true,
      editar_pacientes: true
    },
    secretaria: {
      ver_financeiro_clinica: true,
      ver_financeiro_pessoal: false,
      ver_pacientes: true,
      ver_agenda: true,
      ver_marketing: false,
      ver_funil: false,
      ver_resumo_marketing: false,
      ver_supervisao: false,
      ver_relatorios: true,
      editar_financeiro: true,
      editar_pacientes: true
    },
    paulo: {
      ver_financeiro_clinica: true,
      ver_financeiro_pessoal: true,
      ver_pacientes: false,
      ver_agenda: false,
      ver_marketing: false,
      ver_funil: false,
      ver_resumo_marketing: false,
      ver_supervisao: false,
      ver_relatorios: true,
      editar_financeiro: true,
      editar_pacientes: false
    },
    marketing: {
      ver_financeiro_clinica: false,
      ver_financeiro_pessoal: false,
      ver_pacientes: false,
      ver_agenda: false,
      ver_marketing: true,
      ver_funil: true,
      ver_resumo_marketing: true,
      ver_supervisao: false,
      ver_relatorios: false,
      editar_financeiro: false,
      editar_pacientes: false
    }
  };
  const PERMISSOES_LABELS = [{
    id: "ver_financeiro_clinica",
    label: "Ver Financeiro da Clínica",
    grupo: "💰 Financeiro"
  }, {
    id: "ver_financeiro_pessoal",
    label: "Ver Financeiro Pessoal",
    grupo: "💰 Financeiro"
  }, {
    id: "ver_relatorios",
    label: "Ver Relatórios",
    grupo: "💰 Financeiro"
  }, {
    id: "ver_pacientes",
    label: "Ver Pacientes",
    grupo: "🏥 Clínica"
  }, {
    id: "ver_agenda",
    label: "Ver Agenda",
    grupo: "🏥 Clínica"
  }, {
    id: "ver_supervisao",
    label: "Ver Supervisão",
    grupo: "🏥 Clínica"
  }, {
    id: "editar_pacientes",
    label: "Editar Pacientes",
    grupo: "🏥 Clínica"
  }, {
    id: "editar_financeiro",
    label: "Editar Financeiro",
    grupo: "💰 Financeiro"
  }, {
    id: "ver_marketing",
    label: "Ver Dashboard Marketing",
    grupo: "📊 Marketing"
  }, {
    id: "ver_funil",
    label: "Ver Funil de Leads",
    grupo: "📊 Marketing"
  }, {
    id: "ver_resumo_marketing",
    label: "Ver Resumo Técnico",
    grupo: "📊 Marketing"
  }];
  function PainelPermissoes() {
    const [perfilSel, setPerfilSel] = useState("secretaria");
    const [permissoes, setPermissoes] = useState({});
    const [salvando, setSalvando] = useState(false);
    const [salvo, setSalvo] = useState(false);
    useEffect(() => {
      db.collection("clinica_perfis_permissoes").doc(perfilSel).get().then(doc => {
        if (doc.exists) setPermissoes(doc.data().permissoes || {});else setPermissoes(PERMISSOES_DEFAULT[perfilSel] || {});
      });
    }, [perfilSel]);
    async function salvar() {
      setSalvando(true);
      await db.collection("clinica_perfis_permissoes").doc(perfilSel).set({
        perfilId: perfilSel,
        permissoes,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvando(false);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    }
    function toggle(id) {
      setPermissoes(p => ({
        ...p,
        [id]: !p[id]
      }));
      setSalvo(false);
    }
    const perfisEdicao = [{
      id: "secretaria",
      label: "Secretária",
      cor: "#0891b2"
    }, {
      id: "paulo",
      label: "Financeiro",
      cor: "#16a34a"
    }, {
      id: "marketing",
      label: "Marketing",
      cor: "#ea580c"
    }];
    const grupos = [...new Set(PERMISSOES_LABELS.map(p => p.grupo))];
    return React.createElement("div", {
      style: {
        maxWidth: 640,
        margin: "0 auto"
      }
    }, React.createElement("h2", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 22,
        marginBottom: 4
      }
    }, "\u2699\uFE0F Permiss\xF5es por Perfil"), React.createElement("p", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: 24
      }
    }, "Configure o que cada perfil pode ver e fazer no sistema."), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginBottom: 24,
        flexWrap: "wrap"
      }
    }, perfisEdicao.map(p => React.createElement("button", {
      key: p.id,
      onClick: () => setPerfilSel(p.id),
      style: {
        padding: "8px 20px",
        borderRadius: 20,
        border: "2px solid",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 13,
        fontFamily: "inherit",
        borderColor: perfilSel === p.id ? p.cor : "#e5e7eb",
        background: perfilSel === p.id ? p.cor + "15" : "white",
        color: perfilSel === p.id ? p.cor : "#6b7280",
        transition: "all .15s"
      }
    }, p.label))), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginBottom: 24
      }
    }, grupos.map(grupo => React.createElement("div", {
      key: grupo,
      style: {
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden"
      }
    }, React.createElement("div", {
      style: {
        padding: "10px 16px",
        background: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        fontWeight: 700,
        fontSize: 13,
        color: "#374151"
      }
    }, grupo), React.createElement("div", {
      style: {
        padding: "8px 0"
      }
    }, PERMISSOES_LABELS.filter(p => p.grupo === grupo).map(p => React.createElement("label", {
      key: p.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        cursor: "pointer",
        transition: "background .1s"
      },
      onMouseEnter: e => e.currentTarget.style.background = "#f9fafb",
      onMouseLeave: e => e.currentTarget.style.background = "white"
    }, React.createElement("input", {
      type: "checkbox",
      checked: !!permissoes[p.id],
      onChange: () => toggle(p.id),
      style: {
        width: 16,
        height: 16,
        cursor: "pointer",
        accentColor: "#7B00C4"
      }
    }), React.createElement("span", {
      style: {
        fontSize: 13,
        color: "#374151"
      }
    }, p.label))))))), React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        alignItems: "center"
      }
    }, React.createElement("button", {
      className: "btn btn-purple",
      onClick: salvar,
      disabled: salvando
    }, salvando ? "Salvando..." : "💾 Salvar Permissões"), salvo && React.createElement("span", {
      style: {
        fontSize: 13,
        color: "#059669",
        fontWeight: 600
      }
    }, "\u2705 Salvo!"), React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => setPermissoes(PERMISSOES_DEFAULT[perfilSel] || {}),
      style: {
        marginLeft: "auto",
        fontSize: 12
      }
    }, "Restaurar padr\xE3o")));
  }
  function handleLogin(u) {
    setUser(u);
    if (u.tipo === "psicologa") setTab("dashboard");
    if (u.tipo === "secretaria") setTab("pacientes");
    if (u.tipo === "paulo") setTab("fin-pessoal");
    if (u.tipo === "marketing") setTab("marketing-dashboard");
  }
  function handleLogout() {
    setUser(null);
    setTab(null);
  }
  if (!user) return React.createElement(Login, {
    onLogin: handleLogin
  });
  return React.createElement("div", {
    style: {
      display: "flex",
      minHeight: "100vh",
      width: "100%",
      overflowX: "auto"
    }
  }, React.createElement(Sidebar, {
    user: user,
    tab: tab,
    setTab: setTab,
    onLogout: handleLogout,
    notifProps: notifProps
  }), React.createElement("div", {
    className: "header-mobile"
  }, React.createElement("div", {
    className: "header-mobile-logo"
  }, "Administracao"), React.createElement("button", {
    className: "header-mobile-btn",
    onClick: handleLogout
  }, React.createElement(Icon, {
    name: "log-out",
    size: 18
  }))), React.createElement("div", {
    className: "main-content",
    style: {
      flex: 1,
      minWidth: 0,
      maxWidth: "100%",
      overflowX: "hidden"
    }
  }, user.tipo === "psicologa" && tab === "dashboard" && React.createElement(DashboardAdmin, {
    user: user
  }), user.tipo === "psicologa" && tab === "pacientes" && React.createElement(Pacientes, {
    user: user
  }), user.tipo === "psicologa" && tab === "alunos" && React.createElement(Alunos, null), user.tipo === "psicologa" && tab === "casais" && React.createElement(TerapiaCasais, null), user.tipo === "psicologa" && tab === "recursos" && React.createElement(RecursosTerapeuticos, {
    user: user
  }), user.tipo === "psicologa" && tab === "laudos" && React.createElement(Laudos, null), user.tipo === "psicologa" && tab === "agenda" && React.createElement(Agenda, null), user.tipo === "psicologa" && tab === "fin-clinica" && React.createElement(FinanceiroClinica, {
    user: user
  }), user.tipo === "psicologa" && tab === "comissoes" && React.createElement(Comissoes, {
    user: user
  }), user.tipo === "psicologa" && tab === "fin-pessoal" && React.createElement(FinanceiroPessoal, {
    somenteLeitura: false
  }), tab === "__menu__" && React.createElement("div", {
    style: {
      padding: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 20
    }
  }, "Menu"), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, NAV_PSICOLOGA_FLAT.filter(i => !["dashboard", "pacientes", "agenda", "fin-clinica"].includes(i.id)).map(item => React.createElement("button", {
    key: item.id,
    onClick: () => setTab(item.id),
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      padding: "20px 12px",
      borderRadius: 12,
      border: "1px solid var(--gray-200)",
      background: "white",
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      fontWeight: 500,
      color: "var(--text)"
    }
  }, React.createElement(Icon, {
    name: item.icon,
    size: 24
  }), item.label)))), user.tipo === "psicologa" && tab === "depoimentos" && React.createElement(Depoimentos, null), user.tipo === "psicologa" && tab === "config" && React.createElement(Configuracoes, null), user.tipo === "secretaria" && tab === "pacientes" && React.createElement(Pacientes, {
    user: user
  }), user.tipo === "secretaria" && tab === "agenda" && React.createElement(Agenda, null), user.tipo === "secretaria" && tab === "fin-clinica" && React.createElement(FinanceiroClinica, {
    user: user
  }), user.tipo === "secretaria" && tab === "comissoes" && React.createElement(Comissoes, {
    user: user
  }), user.tipo === "paulo" && tab === "fin-pessoal" && React.createElement(FinanceiroPessoal, {
    somenteLeitura: false
  }), user.tipo === "paulo" && tab === "fin-clinica" && React.createElement(FinanceiroClinica, {
    user: user
  }), (user.tipo === "psicologa" || user.tipo === "secretaria") && tab === "funil-leads" && React.createElement(FunilLeads, {
    user: user
  }), user.tipo === "marketing" && tab === "marketing-dashboard" && React.createElement(DashboardMarketing, {
    user: user
  }), user.tipo === "psicologa" && tab === "marketing-dashboard" && React.createElement(DashboardMarketing, {
    user: user
  }), user.tipo === "psicologa" && tab === "permissoes" && React.createElement(PainelPermissoes, null), (user.tipo === "psicologa" || user.tipo === "marketing") && tab === "dashboard-performance" && React.createElement(DashboardPerformance, {
    user: user
  })), React.createElement("div", {
    className: "nav-mobile"
  }, user.tipo === "psicologa" && [{
    id: "dashboard",
    label: "Início",
    icon: "layout-dashboard"
  }, {
    id: "pacientes",
    label: "Pacientes",
    icon: "users"
  }, {
    id: "agenda",
    label: "Agenda",
    icon: "calendar"
  }, {
    id: "fin-clinica",
    label: "Financeiro",
    icon: "dollar-sign"
  }].map(item => React.createElement("button", {
    key: item.id,
    className: "nav-mobile-item " + (tab === item.id ? "active" : ""),
    onClick: () => setTab(item.id)
  }, React.createElement(Icon, {
    name: item.icon,
    size: 20
  }), React.createElement("span", null, item.label))), user.tipo === "psicologa" && React.createElement("button", {
    className: "nav-mobile-item",
    onClick: () => setTab("__menu__")
  }, React.createElement(Icon, {
    name: "menu",
    size: 20
  }), React.createElement("span", null, "Mais")), user.tipo === "secretaria" && NAV_SECRETARIA.slice(0, 5).map(item => React.createElement("button", {
    key: item.id,
    className: "nav-mobile-item " + (tab === item.id ? "active" : ""),
    onClick: () => setTab(item.id)
  }, React.createElement(Icon, {
    name: item.icon,
    size: 20
  }), React.createElement("span", null, item.label.split(" ")[0]))), user.tipo === "paulo" && NAV_PAULO.map(item => React.createElement("button", {
    key: item.id,
    className: "nav-mobile-item " + (tab === item.id ? "active" : ""),
    onClick: () => setTab(item.id)
  }, React.createElement(Icon, {
    name: item.icon,
    size: 20
  }), React.createElement("span", null, item.label.split(" ")[0]))), user.tipo === "marketing" && NAV_MARKETING.map(item => React.createElement("button", {
    key: item.id,
    className: "nav-mobile-item " + (tab === item.id ? "active" : ""),
    onClick: () => setTab(item.id)
  }, React.createElement(Icon, {
    name: item.icon,
    size: 20
  }), React.createElement("span", null, item.label)))));
}
const NAV_MARKETING = [{
  id: "marketing-dashboard",
  label: "Dashboard",
  icon: "trending-up"
}, {
  id: "dashboard-performance",
  label: "Performance",
  icon: "bar-chart-2"
}];
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App, null));
