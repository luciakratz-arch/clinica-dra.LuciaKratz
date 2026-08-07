import { jsxDEV as _jsxDEV, Fragment as _Fragment } from "react/jsx-dev-runtime";
// ═══════════════════════════════════════════════════════
//  ÁREA ADMINISTRATIVA — DRA. LUCIA KRATZ  
//  app.js — Etapa 2: Cadastro completo de pacientes
// ═══════════════════════════════════════════════════════

const {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
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

// ─── CONFIGURAÇÃO FINANCEIRA EDITÁVEL ───────────────────────────
// Valores padrão; os reais ficam em clinica_config/comissoes (editáveis na tela Comissões)
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

// ─── NOTIFICAÇÕES ─────────────────────────────────────────
// ─── NOTIFICAÇÕES PUSH (modelo Família Kratz) ─────────────

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

// ─── ETAPA 1: HIGIENIZAÇÃO EM LOTE ────────────────────────
// Detecta e deleta duplicatas de Maio/2026 para um paciente.
// Critério: mesmo pacienteId + mesma data + mesmo valor + mesma descrição.
// Mantém o documento que possui pacoteId preenchido (ou o mais antigo).
async function deletarDuplicatasPaciente(pacienteId, mesRef) {
  try {
    const snap = await db.collection("clinica_lancamentos").where("pacienteId", "==", pacienteId).get();
    const docs = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })).filter(d => (d.data || "").startsWith(mesRef));

    // Agrupar por chave composta
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
      // Prioriza manter o que tem pacoteId; senão mantém o primeiro (mais antigo por ordem de array)
      grupo.sort((a, b) => (b.pacoteId ? 1 : 0) - (a.pacoteId ? 1 : 0));
      const manter = grupo[0];
      // Garante que o mantido tem pacoteId se algum tinha
      const comPacote = grupo.find(g => g.pacoteId);
      if (comPacote && !manter.pacoteId) {
        batch.update(db.collection("clinica_lancamentos").doc(manter.id), {
          pacoteId: comPacote.pacoteId
        });
      }
      // Deleta os redundantes
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

// Categoriza lançamentos "Sem Nome" de um mês como Despesas Administrativas.
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

// Deleta lançamentos tipo "sessao" que pertencem a pacotes (órfãos gerados por atualizarPagamento).
// Regra: se tem pacoteId + tipo_lancamento==sessao → é lixo, o pacote já cobre.
async function deletarLancamentosOrfaosDeSessao() {
  try {
    const snap = await db.collection("clinica_lancamentos").where("tipo_lancamento", "==", "sessao").get();
    const orfaos = snap.docs.filter(d => {
      const dado = d.data();
      return !!dado.pacoteId; // tem pacoteId = pertence a pacote = é duplicata
    });
    if (orfaos.length === 0) return {
      ok: true,
      deletados: 0
    };
    // Firestore batch suporta até 500 operações
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
    // Sessões de hoje e amanhã
    if (["psicologa", "secretaria"].includes(user.tipo)) {
      const snap = await db.collection("clinica_sessoes").where("data", "in", [fmtDate(hoje), fmtDate(amanha)]).where("status", "==", "agendado").get();
      snap.docs.forEach(d => {
        const s = d.data();
        const dia = s.data === fmtDate(hoje) ? "Hoje" : "Amanhã";
        const diaSemana = fmtDataNotif(s.data);
        enviarPushLocal(`${dia} — Sessão às ${s.hora}`, `${diaSemana} · ${s.pacienteNome}`);
      });
    }

    // Pagamentos previstos (psicóloga e Paulo)
    if (["psicologa", "paulo"].includes(user.tipo)) {
      const snap = await db.collection("clinica_lancamentos").where("status", "==", "pendente").where("data", "<=", fmtDate(amanha)).get();
      snap.docs.forEach(d => {
        const l = d.data();
        const diaSemana = fmtDataNotif(l.data);
        enviarPushLocal(`Pagamento previsto — ${diaSemana}`, `R$ ${parseFloat(l.valor || 0).toFixed(2).replace(".", ",")} · ${l.pacienteNome || l.descricao || ""}`);
      });
    }

    // Pagamentos pendentes (secretária)
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
    // Verifica lembretes 2 segundos após login
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
  if (permissao === "granted") return /*#__PURE__*/_jsxDEV("span", {
    style: {
      background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.3)",
      color: "#fff",
      borderRadius: 20,
      padding: "5px 14px",
      fontSize: 12,
      fontFamily: "var(--font-body)"
    },
    children: "🔔 Ativo"
  }, void 0, false);
  if (permissao === "denied") return /*#__PURE__*/_jsxDEV("span", {
    style: {
      background: "rgba(255,0,0,0.15)",
      border: "1px solid rgba(255,0,0,0.3)",
      color: "#fca5a5",
      borderRadius: 20,
      padding: "5px 14px",
      fontSize: 12,
      fontFamily: "var(--font-body)"
    },
    children: "🔕 Bloqueado"
  }, void 0, false);
  return /*#__PURE__*/_jsxDEV("button", {
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
    },
    children: "🔔 Ativar lembretes"
  }, void 0, false);
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
  return /*#__PURE__*/_jsxDEV("span", {
    ref: ref,
    style: {
      display: "inline-flex",
      alignItems: "center"
    }
  }, void 0, false);
}

// ── TextArea com botão de voz reutilizável ──────────────────────────────────
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
  return /*#__PURE__*/_jsxDEV("div", {
    style: {
      position: "relative"
    },
    children: [/*#__PURE__*/_jsxDEV("textarea", {
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
    }, void 0, false), SR_SUPPORT && /*#__PURE__*/_jsxDEV("button", {
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
      },
      children: "🎙️"
    }, void 0, false), gravando && /*#__PURE__*/_jsxDEV("div", {
      style: {
        fontSize: 11,
        color: "#7B00C4",
        marginTop: 3,
        display: "flex",
        alignItems: "center",
        gap: 4
      },
      children: [/*#__PURE__*/_jsxDEV("span", {
        style: {
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#7B00C4",
          display: "inline-block",
          animation: "pulse-slow 1s infinite"
        }
      }, void 0, false), "Gravando... clique 🎙️ para parar"]
    }, void 0, true)]
  }, void 0, true);
}
function Spinner() {
  return /*#__PURE__*/_jsxDEV("div", {
    className: "spinner-wrap",
    children: /*#__PURE__*/_jsxDEV("div", {
      className: "spinner"
    }, void 0, false)
  }, void 0, false);
}
function EmBreve({
  titulo,
  subtitulo
}) {
  return /*#__PURE__*/_jsxDEV("div", {
    className: "em-breve",
    children: [/*#__PURE__*/_jsxDEV(Icon, {
      name: "wrench",
      size: 48
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      className: "em-breve-title",
      children: titulo
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      className: "em-breve-sub",
      children: subtitulo || "Modulo em construcao."
    }, void 0, false)]
  }, void 0, true);
}

// LOGIN
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
  return /*#__PURE__*/_jsxDEV("div", {
    className: "login-page",
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "login-left",
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "login-logo",
        children: /*#__PURE__*/_jsxDEV("img", {
          src: LOGO_URL,
          alt: "Lucia Kratz",
          style: {
            width: 140,
            height: 140,
            objectFit: "contain"
          }
        }, void 0, false)
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        className: "login-name",
        children: "Dra. Lucia Kratz"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        className: "login-subtitle",
        children: "Sistema Administrativo"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        className: "login-crp",
        children: "Psicologa Doutora · CRP 09/20590"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        className: "login-left-btns",
        children: PERFIS.map(p => /*#__PURE__*/_jsxDEV("button", {
          onClick: () => {
            setPerfilSel(p.id);
            setEtapa("senha");
            setErro("");
            setSenha("");
            setEmail("");
          },
          children: p.nome.replace("Sou ", "")
        }, p.id, false))
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "login-right",
      children: [etapa === "perfil" && /*#__PURE__*/_jsxDEV(_Fragment, {
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            width: "100%"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "login-right-title",
            children: "Area Administrativa"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            className: "login-right-sub",
            children: "Selecione seu perfil de acesso."
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "profile-cards",
          children: PERFIS.map(p => /*#__PURE__*/_jsxDEV("button", {
            className: "profile-card",
            onClick: () => {
              setPerfilSel(p.id);
              setEtapa("senha");
              setErro("");
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              className: "profile-card-icon",
              style: {
                background: p.cor
              },
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: p.icon,
                size: 22
              }, void 0, false)
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              className: "profile-card-text",
              children: [/*#__PURE__*/_jsxDEV("div", {
                className: "profile-card-name",
                children: p.nome
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                className: "profile-card-desc",
                children: p.desc
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "profile-card-arrow",
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: "chevron-right",
                size: 18
              }, void 0, false)
            }, void 0, false)]
          }, p.id, true))
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "login-footer",
          children: [/*#__PURE__*/_jsxDEV("a", {
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
            },
            children: [/*#__PURE__*/_jsxDEV("span", {
              style: {
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#fff7ed",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              },
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: "door-open",
                size: 15
              }, void 0, false)
            }, void 0, false), "Agenda da Sala"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("a", {
            href: "../clinica/",
            style: {
              color: "#7B00C4",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "activity",
              size: 14
            }, void 0, false), " Área Clínica"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("a", {
            href: "../",
            style: {
              color: "var(--gray-400)",
              fontSize: 12
            },
            children: "Voltar ao site"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true), etapa === "senha" && perfil && /*#__PURE__*/_jsxDEV(_Fragment, {
        children: [/*#__PURE__*/_jsxDEV("button", {
          className: "login-right-back",
          onClick: () => {
            setEtapa("perfil");
            setErro("");
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "arrow-left",
            size: 14
          }, void 0, false), " Voltar"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("form", {
          className: "login-form",
          onSubmit: handleLogin,
          children: [/*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              className: "login-form-title",
              children: perfil.nome
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              className: "login-form-sub",
              children: perfil.desc
            }, void 0, false)]
          }, void 0, true), erro && /*#__PURE__*/_jsxDEV("div", {
            className: "login-error",
            children: erro
          }, void 0, false), perfilSel === "secretaria" && /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "E-mail"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "email",
              value: email,
              onChange: e => setEmail(e.target.value),
              autoFocus: true
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Senha"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "password",
              value: senha,
              onChange: e => setSenha(e.target.value),
              autoFocus: perfilSel !== "secretaria"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn-primary",
            type: "submit",
            disabled: loading,
            children: loading ? "Entrando..." : "Entrar"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true)]
  }, void 0, true);
}

// NAV
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
  }, {
    id: "vitrine",
    label: "Vitrine de Produtos",
    icon: "shopping-bag"
  }]
}, {
  grupo: "💰 Financeiro",
  itens: [{
    id: "fin-clinica",
    label: "Fin. Clínica",
    icon: "dollar-sign"
  }, {
    id: "fin-pessoal",
    label: "Fin. Pessoal",
    icon: "home"
  }, {
    id: "fin-empresa",
    label: "Fin. Empresa",
    icon: "briefcase"
  }, {
    id: "painel-geral",
    label: "Painel Geral",
    icon: "pie-chart"
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

// Lista plana para compatibilidade com código existente
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
  id: "fin-empresa",
  label: "Financeiro Empresa",
  icon: "briefcase"
}, {
  id: "fin-clinica",
  label: "Financeiro Clínica",
  icon: "building-2"
}];

// SIDEBAR
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

  // Nav plana para perfis simples
  const navFlat = user.tipo === "secretaria" ? NAV_SECRETARIA : user.tipo === "paulo" ? NAV_PAULO : user.tipo === "marketing" ? NAV_MARKETING : null; // psicologa usa grupos

  return /*#__PURE__*/_jsxDEV("div", {
    className: "sidebar-desktop",
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "sidebar-header",
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "sidebar-logo",
        children: [/*#__PURE__*/_jsxDEV("img", {
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
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          className: "sidebar-logo-placeholder",
          style: {
            display: "none"
          },
          children: "LK"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "sidebar-title",
          children: "Dra. Lucia Kratz"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "sidebar-role",
          children: titulo
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("nav", {
      className: "sidebar-nav",
      children: isPsicologa ?
      // Menu com grupos para psicóloga
      NAV_PSICOLOGA.map(grupo => /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginBottom: 4
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.45)",
            padding: "10px 14px 4px",
            textTransform: "uppercase"
          },
          children: grupo.grupo
        }, void 0, false), grupo.itens.map(item => /*#__PURE__*/_jsxDEV("button", {
          className: "nav-item " + (tab === item.id ? "active" : ""),
          onClick: () => setTab(item.id),
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: item.icon,
            size: 18
          }, void 0, false), item.label]
        }, item.id, true))]
      }, grupo.grupo, true)) :
      // Menu plano para outros perfis
      navFlat.map(item => /*#__PURE__*/_jsxDEV("button", {
        className: "nav-item " + (tab === item.id ? "active" : ""),
        onClick: () => setTab(item.id),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: item.icon,
          size: 18
        }, void 0, false), item.label]
      }, item.id, true))
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      className: "sidebar-footer",
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "sidebar-user",
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "rgba(255,255,255,0.08)",
          borderRadius: 10,
          marginBottom: 8
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "sidebar-avatar",
          style: {
            flexShrink: 0
          },
          children: initials
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            flex: 1,
            minWidth: 0
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "sidebar-user-name",
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            },
            children: nomeExibir
          }, void 0, false), user.crp && /*#__PURE__*/_jsxDEV("div", {
            className: "sidebar-user-crp",
            children: user.crp
          }, void 0, false)]
        }, void 0, true), notifProps && /*#__PURE__*/_jsxDEV(BotaoNotificacao, {
          ...notifProps
        }, void 0, false)]
      }, void 0, true), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("a", {
        href: "../sala/",
        target: "_blank",
        className: "nav-item",
        style: {
          color: "rgba(255,255,255,0.85)",
          background: "rgba(234,88,12,0.2)",
          borderRadius: 8,
          marginBottom: 2
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "door-open",
          size: 18
        }, void 0, false), " Agenda da Sala"]
      }, void 0, true), /*#__PURE__*/_jsxDEV("a", {
        href: "../clinica/",
        className: "nav-item",
        style: {
          color: "rgba(255,255,255,0.85)",
          background: "rgba(123,0,196,0.25)",
          borderRadius: 8,
          marginBottom: 2
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "activity",
          size: 18
        }, void 0, false), " Área Clínica"]
      }, void 0, true), /*#__PURE__*/_jsxDEV("a", {
        href: "../",
        className: "nav-item",
        style: {
          color: "rgba(255,255,255,0.6)"
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "globe",
          size: 18
        }, void 0, false), " Site"]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "nav-item nav-item-danger",
        onClick: onLogout,
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "log-out",
          size: 18
        }, void 0, false), " Sair"]
      }, void 0, true)]
    }, void 0, true)]
  }, void 0, true);
}

// DASHBOARD
function DashboardAdmin({
  user,
  onVerEvolucao
}) {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  // Disponibilizar lista de pacientes para o feed resolver nomes ausentes
  useEffect(() => {
    window._pacientesCache = pacientes;
  }, [pacientes]);
  const [lancClinica, setLancClinica] = useState([]);
  const [lancPessoal, setLancPessoal] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [atividades, setAtividades] = useState({});
  const [loadingAtiv, setLoadingAtiv] = useState(true);
  const [rastreamentos, setRastreamentos] = useState([]);
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

    // Buscar rastreamentos recentes (últimos 7 dias) de todas as coleções
    const limite7 = new Date();
    limite7.setDate(limite7.getDate() - 7);
    const COLS_RAST = [{
      col: "clinica_rastreamento_bipolar",
      label: "Bipolar / Borderline",
      emoji: "📊"
    }, {
      col: "clinica_rastreamento_neuro",
      label: "Funcionamento e Comportamento",
      emoji: "🧩"
    }, {
      col: "clinica_rastreamento_alimentar",
      label: "Hábitos Alimentares",
      emoji: "🍎"
    }, {
      col: "clinica_rastreamento_sexual",
      label: "Saúde Sexual",
      emoji: "🌸"
    }];
    Promise.all(COLS_RAST.map(({
      col,
      label,
      emoji
    }) => db.collection(col).get().then(snap => snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      _tipo: label,
      _emoji: emoji
    }))).catch(() => []))).then(resultados => {
      const todos = resultados.flat().filter(d => {
        const ts = d.createdAt?.toDate?.();
        return ts && ts >= limite7;
      }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 10);
      setRastreamentos(todos);
    });
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  // Buscar atividades dos últimos 8 dias
  useEffect(() => {
    if (!pacientes || pacientes.length === 0) return;
    const limite = new Date();
    limite.setDate(limite.getDate() - 8);
    const limiteStr = limite.toISOString().slice(0, 10);
    const COLS = [{
      col: "clinica_diario",
      label: "📓 Diário",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_humor",
      label: "😊 Humor",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_metas",
      label: "🎯 Metas",
      campoData: "updatedAt",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_tcc",
      label: "🧠 TCC",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_reflexoes",
      label: "💭 Reflexão",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }];
    let pending = COLS.length;
    const agrupado = {};
    COLS.forEach(({
      col,
      label,
      campoData,
      campoNome,
      campoPacId
    }) => {
      db.collection(col).get().then(snap => {
        snap.docs.forEach(d => {
          const doc = d.data();
          let dataStr = doc[campoData];
          if (dataStr?.toDate) dataStr = dataStr.toDate().toISOString().slice(0, 10);
          if (!dataStr || dataStr < limiteStr) return;
          const pacId = doc[campoPacId] || doc.pacienteId || "";
          const pacNome = doc[campoNome] || doc.pacienteNome || "";
          if (!pacId) return;
          if (!agrupado[pacId]) agrupado[pacId] = {
            nome: pacNome,
            itens: {}
          };
          if (!agrupado[pacId].itens[label]) agrupado[pacId].itens[label] = 0;
          agrupado[pacId].itens[label]++;
          // Se nome ainda vazio, guardar para resolver depois com a lista de pacientes
          if (pacNome && !agrupado[pacId].nome) agrupado[pacId].nome = pacNome;
        });
        pending--;
        if (pending === 0) {
          // Resolver nomes vazios pela lista de pacientes
          Object.keys(agrupado).forEach(pid => {
            if (!agrupado[pid].nome) {
              const pac = pacientes.find(p => p.id === pid);
              if (pac) agrupado[pid].nome = pac.nome || "";
            }
          });
          setAtividades({
            ...agrupado
          });
          setLoadingAtiv(false);
        }
      }).catch(() => {
        pending--;
        if (pending === 0) {
          // Resolver nomes vazios pela lista de pacientes
          Object.keys(agrupado).forEach(pid => {
            if (!agrupado[pid].nome) {
              const pac = pacientes.find(p => p.id === pid);
              if (pac) agrupado[pid].nome = pac.nome || "";
            }
          });
          setAtividades({
            ...agrupado
          });
          setLoadingAtiv(false);
        }
      });
    });
  }, [pacientes]);
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

  // Clínica mês
  const lcMes = lancClinica.filter(l => l.data?.startsWith(mesAtual));
  const recClinica = lcMes.filter(l => l.tipo_lancamento !== "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const despClinica = lcMes.filter(l => l.tipo_lancamento === "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);

  // Pessoal mês
  const lpMes = lancPessoal.filter(l => l.data?.startsWith(mesAtual));
  const recPessoal = lpMes.filter(l => l.tipo === "receita" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const despPessoal = lpMes.filter(l => l.tipo === "despesa" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const totalRec = recClinica + recPessoal;
  const totalDesp = despClinica + despPessoal;
  const saldoMes = totalRec - totalDesp;

  // Acumulado ano
  const anoAtual = new Date().getFullYear() + "";
  const lcAno = lancClinica.filter(l => l.data?.startsWith(anoAtual));
  const lpAno = lancPessoal.filter(l => l.data?.startsWith(anoAtual));
  const recAno = lcAno.filter(l => l.tipo_lancamento !== "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0) + lpAno.filter(l => l.tipo === "receita" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const despAno = lcAno.filter(l => l.tipo_lancamento === "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0) + lpAno.filter(l => l.tipo === "despesa" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const saldoAno = recAno - despAno;
  const pacAtivos = Object.entries(atividades).filter(([, v]) => Object.keys(v.itens).length > 0).sort((a, b) => (a[1].nome || "").localeCompare(b[1].nome || ""));
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "page-title",
        children: "Dashboard"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        className: "page-subtitle",
        style: {
          textTransform: "capitalize"
        },
        children: hoje
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "metrics-grid",
      style: {
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "metric-card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "metric-icon",
          children: /*#__PURE__*/_jsxDEV(Icon, {
            name: "users",
            size: 20
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-label",
          children: "Pacientes Ativos"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-value",
          children: ativos
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-sub",
          children: [pacientes.length, " total"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "metric-card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "metric-icon",
          children: /*#__PURE__*/_jsxDEV(Icon, {
            name: "calendar",
            size: 20
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-label",
          children: "Sessões Hoje"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-value",
          children: sessoesHoje
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-sub",
          children: "agendadas"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "metric-card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "metric-icon",
          children: /*#__PURE__*/_jsxDEV(Icon, {
            name: "package",
            size: 20
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-label",
          children: "Pendente Clínica"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-value",
          style: {
            fontSize: 18,
            color: "#d97706"
          },
          children: fmt(lcMes.filter(l => l.status === "pendente").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0))
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "metric-card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "metric-icon",
          children: /*#__PURE__*/_jsxDEV(Icon, {
            name: "heart",
            size: 20
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-label",
          children: "Casais em Terapia"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-value",
          children: pacientes.filter(p => p.casalId).length / 2 | 0
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 8
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "activity",
          size: 18
        }, void 0, false), " Atividades dos últimos 8 dias"]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 16
        },
        children: "Pacientes que interagiram no app"
      }, void 0, false), loadingAtiv ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          textAlign: "center",
          padding: 20
        },
        children: /*#__PURE__*/_jsxDEV(Spinner, {}, void 0, false)
      }, void 0, false) : pacAtivos.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          textAlign: "center",
          padding: 24,
          color: "var(--text-muted)",
          fontSize: 14
        },
        children: "Nenhuma atividade nos últimos 8 dias."
      }, void 0, false) : /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10
        },
        children: pacAtivos.map(([pacId, info]) => /*#__PURE__*/_jsxDEV("div", {
          style: {
            border: "1px solid var(--gray-200)",
            borderRadius: 12,
            padding: "14px 18px",
            background: "var(--gray-50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: 1,
              minWidth: 0
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--purple-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                color: "var(--purple)",
                fontSize: 14,
                flexShrink: 0
              },
              children: (info.nome || "?").charAt(0).toUpperCase()
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                minWidth: 0
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 4
                },
                children: info.nome || "Paciente"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6
                },
                children: Object.entries(info.itens).map(([label, count]) => /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontSize: 12,
                    background: "white",
                    border: "1px solid var(--gray-200)",
                    borderRadius: 20,
                    padding: "2px 10px",
                    color: "var(--text-muted)"
                  },
                  children: [label, " ", count > 1 ? `(${count})` : ""]
                }, label, true))
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => onVerEvolucao && onVerEvolucao(pacId),
            style: {
              background: "var(--purple)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-body)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "trending-up",
              size: 13
            }, void 0, false), " Ver Evolução"]
          }, void 0, true)]
        }, pacId, true))
      }, void 0, false)]
    }, void 0, true), rastreamentos.length > 0 && /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 8
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "clipboard-list",
          size: 18
        }, void 0, false), " Rastreamentos Recebidos"]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 16
        },
        children: "Respondidos nos últimos 7 dias"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10
        },
        children: rastreamentos.map(r => {
          const ts = r.createdAt?.toDate?.();
          const agora = new Date();
          const diff = ts ? Math.round((agora - ts) / 1000 / 60) : null;
          const tempo = diff === null ? "" : diff < 60 ? `há ${diff} min` : diff < 1440 ? `há ${Math.round(diff / 60)}h` : `há ${Math.round(diff / 1440)} dia${Math.round(diff / 1440) > 1 ? "s" : ""}`;
          const respondente = r.tipoRespondente === "paciente" ? "Próprio paciente" : r.parentesco || r.nomeRespondente || "Familiar";
          return /*#__PURE__*/_jsxDEV("div", {
            style: {
              border: "1px solid var(--gray-200)",
              borderRadius: 12,
              padding: "12px 16px",
              background: "var(--gray-50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12,
                flex: 1,
                minWidth: 0
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 28,
                  flexShrink: 0
                },
                children: r._emoji
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  minWidth: 0
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontWeight: 600,
                    fontSize: 14,
                    marginBottom: 2
                  },
                  children: r.pacienteNome || "Paciente"
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: "var(--text-muted)"
                  },
                  children: [r._tipo, " · ", respondente]
                }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 2
                  },
                  children: tempo
                }, void 0, false)]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
              style: {
                background: "var(--purple-soft)",
                color: "var(--purple)",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0
              },
              children: "Novo ✓"
            }, void 0, false)]
          }, r.id, true);
        })
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "bar-chart-2",
          size: 18
        }, void 0, false), " Resumo Financeiro — ", new Date().toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric"
        })]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
          gap: 10,
          marginBottom: 20
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            background: saldoMes >= 0 ? "#d1fae5" : "#fee2e2",
            borderRadius: 12,
            padding: "16px 20px",
            border: "1.5px solid",
            borderColor: saldoMes >= 0 ? "#6ee7b7" : "#fca5a5"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: saldoMes >= 0 ? "#059669" : "#dc2626",
              marginBottom: 6
            },
            children: "Saldo do Mês (Geral)"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 24,
              fontWeight: 800,
              color: saldoMes >= 0 ? "#059669" : "#dc2626"
            },
            children: fmt(saldoMes)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              color: "#6b7280",
              marginTop: 4
            },
            children: "Clínica + Pessoal"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "#f0fdf4",
            borderRadius: 12,
            padding: "16px 20px",
            border: "1.5px solid #86efac"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: "#059669",
              marginBottom: 6
            },
            children: "Total Receitas"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 22,
              fontWeight: 800,
              color: "#059669"
            },
            children: fmt(totalRec)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              color: "#6b7280",
              marginTop: 4
            },
            children: ["Clínica: ", fmt(recClinica), " · Pessoal: ", fmt(recPessoal)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "#fef2f2",
            borderRadius: 12,
            padding: "16px 20px",
            border: "1.5px solid #fca5a5"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: "#dc2626",
              marginBottom: 6
            },
            children: "Total Despesas"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 22,
              fontWeight: 800,
              color: "#dc2626"
            },
            children: fmt(totalDesp)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              color: "#6b7280",
              marginTop: 4
            },
            children: ["Clínica: ", fmt(despClinica), " · Pessoal: ", fmt(despPessoal)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          borderTop: "1px solid var(--gray-100)",
          paddingTop: 16
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 600,
            marginBottom: 12,
            fontSize: 14,
            color: "var(--text-muted)"
          },
          children: ["Acumulado ", anoAtual]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
            gap: 8
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--gray-50)",
              border: "1px solid var(--gray-200)"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 4
              },
              children: ["Receitas ", anoAtual]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 700,
                fontSize: 18,
                color: "#059669"
              },
              children: fmt(recAno)
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--gray-50)",
              border: "1px solid var(--gray-200)"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 4
              },
              children: ["Despesas ", anoAtual]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 700,
                fontSize: 18,
                color: "#dc2626"
              },
              children: fmt(despAno)
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              padding: "12px 16px",
              borderRadius: 10,
              background: saldoAno >= 0 ? "#f0fdf4" : "#fef2f2",
              border: "1px solid",
              borderColor: saldoAno >= 0 ? "#86efac" : "#fca5a5"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 4
              },
              children: ["Saldo Acumulado ", anoAtual]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 700,
                fontSize: 18,
                color: saldoAno >= 0 ? "#059669" : "#dc2626"
              },
              children: fmt(saldoAno)
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 600,
          marginBottom: 8
        },
        children: ["Bem-vinda, ", user.nome, " 🦋"]
      }, void 0, true), /*#__PURE__*/_jsxDEV("a", {
        href: "../clinica/",
        style: {
          fontSize: 13,
          color: "var(--purple)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "fit-content",
          marginTop: 8
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "external-link",
          size: 14
        }, void 0, false), " Portal do Paciente"]
      }, void 0, true)]
    }, void 0, true)]
  }, void 0, true);
}

// ABA PERFIL
function PerfilPaciente({
  paciente,
  onVoltar,
  pacientes,
  user,
  abaInicial
}) {
  const [aba, setAba] = useState(abaInicial || "perfil");
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
    id: "questionarios",
    label: "Questionários",
    icon: "clipboard-list"
  }, {
    id: "links",
    label: "Links Partilhados",
    icon: "link"
  }] : [])];
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-ghost",
        onClick: onVoltar,
        style: {
          padding: "8px 12px"
        },
        children: /*#__PURE__*/_jsxDEV(Icon, {
          name: "arrow-left",
          size: 16
        }, void 0, false)
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          flex: 1
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          style: {
            fontSize: 24
          },
          children: paciente.nome
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: ["Perfil clinico completo · ", /*#__PURE__*/_jsxDEV("span", {
            style: {
              fontSize: 11,
              color: "var(--text-muted)",
              cursor: "pointer"
            },
            onClick: () => {
              navigator.clipboard.writeText(paciente.id);
              alert("ID copiado: " + paciente.id);
            },
            children: ["ID: ", paciente.id, " 📋"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-danger",
        onClick: async () => {
          if (!confirm("Excluir paciente?")) return;
          await db.collection("clinica_pacientes").doc(paciente.id).delete();
          onVoltar();
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "trash-2",
          size: 15
        }, void 0, false), " Excluir paciente"]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 4,
        marginBottom: 24,
        overflowX: "auto",
        borderBottom: "1px solid var(--gray-200)",
        flexShrink: 0,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none"
      },
      children: ABAS.map(a => /*#__PURE__*/_jsxDEV("button", {
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
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: a.icon,
          size: 15
        }, void 0, false), a.label]
      }, a.id, true))
    }, void 0, false), aba === "perfil" && /*#__PURE__*/_jsxDEV(AbaPerfil, {
      paciente: paciente,
      pacientes: pacientes
    }, void 0, false), aba === "modulos" && /*#__PURE__*/_jsxDEV(AbaModulos, {
      paciente: paciente
    }, void 0, false), aba === "modulo1" && /*#__PURE__*/_jsxDEV(AbaModulo1, {
      paciente: paciente
    }, void 0, false), aba === "metas" && /*#__PURE__*/_jsxDEV(AbaMetas, {
      paciente: paciente
    }, void 0, false), aba === "laudos" && /*#__PURE__*/_jsxDEV(EmBreve, {
      titulo: "Laudos",
      subtitulo: "Etapa 10"
    }, void 0, false), aba === "evolucao" && /*#__PURE__*/_jsxDEV(AbaEvolucao, {
      paciente: paciente
    }, void 0, false), aba === "casal" && /*#__PURE__*/_jsxDEV(AbaCasal, {
      paciente: paciente,
      pacientes: pacientes
    }, void 0, false), aba === "nr1" && /*#__PURE__*/_jsxDEV(AbaOcupacional, {
      paciente: paciente
    }, void 0, false), aba === "questionarios" && /*#__PURE__*/_jsxDEV(AbaQuestionarios, {
      paciente: paciente
    }, void 0, false), aba === "links" && /*#__PURE__*/_jsxDEV(AbaLinksPartilhados, {
      paciente: paciente
    }, void 0, false)]
  }, void 0, true);
}

// LISTA PACIENTES
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
  const [abaInicialPerfil, setAbaInicialPerfil] = useState(null);

  // Navegar direto para um paciente vindo do Dashboard
  useEffect(() => {
    if (window._pacienteInicialId) {
      setPerfilAberto(window._pacienteInicialId);
      setAbaInicialPerfil("evolucao");
      window._pacienteInicialId = null;
    }
  }, []);
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
    if (pac) return /*#__PURE__*/_jsxDEV(PerfilPaciente, {
      paciente: pac,
      onVoltar: () => {
        setPerfilAberto(null);
        setAbaInicialPerfil(null);
      },
      pacientes: pacientes,
      abaInicial: abaInicialPerfil
    }, void 0, false);
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
  if (loading) return /*#__PURE__*/_jsxDEV(Spinner, {}, void 0, false);
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Pacientes"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: [pacientes.filter(p => p.status === "ativo").length, " ativos · ", pacientes.filter(p => p.status === "alta").length, " com alta · ", pacientes.filter(p => p.status === "inativo").length, " inativos"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 13
          },
          onClick: () => setModalImport(true),
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "upload",
            size: 15
          }, void 0, false), " Importar Excel"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 13
          },
          onClick: () => {
            const url = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/cadastro/";
            const texto = `🦋 *Clínica Dra. Lucia Kratz*\n\nOlá! Para agilizar o seu atendimento, preencha o formulário de cadastro pelo link abaixo:\n\n👉 ${url}\n\nÉ rápido e seguro. Após o preenchimento, seus dados já estarão disponíveis para a sua psicóloga.\n\nQualquer dúvida, estamos à disposição! 💜`;
            navigator.clipboard.writeText(texto).then(() => alert("✓ Texto + link copiado!\nCole direto no WhatsApp.")).catch(() => prompt("Copie o texto:", texto));
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "link",
            size: 15
          }, void 0, false), " Link de Cadastro"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-purple",
          onClick: abrirNovo,
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "user-plus",
            size: 16
          }, void 0, false), " Novo Paciente"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap"
      },
      children: [/*#__PURE__*/_jsxDEV("input", {
        className: "form-input",
        style: {
          flex: 1,
          minWidth: 200
        },
        placeholder: "Buscar por nome ou e-mail...",
        value: busca,
        onChange: e => setBusca(e.target.value)
      }, void 0, false), [["todos", "Todos"], ["ativo", "Em atendimento"], ["alta", "Alta"], ["inativo", "Inativos"]].map(([f, l]) => /*#__PURE__*/_jsxDEV("button", {
        className: "btn " + (filtro === f ? "btn-purple" : "btn-ghost"),
        onClick: () => setFiltro(f),
        children: l
      }, f, false))]
    }, void 0, true), ["pendente", "ativo", "alta", "inativo"].map(st => {
      const grupo = filtrados.filter(p => p.status === st);
      if (grupo.length === 0) return null;
      return /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginBottom: 24
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: st === "ativo" ? "var(--success)" : st === "alta" ? "var(--gray-400)" : st === "pendente" ? "#f59e0b" : "var(--danger)"
            }
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.8px"
            },
            children: [st === "ativo" ? "Em Atendimento" : st === "alta" ? "Alta" : st === "pendente" ? "⏳ Pendentes (Autocadastro)" : "Inativos", " (", grupo.length, ")"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "card",
          style: {
            padding: 0
          },
          children: grupo.map(p => /*#__PURE__*/_jsxDEV("div", {
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
            onMouseLeave: e => e.currentTarget.style.background = "white",
            children: [/*#__PURE__*/_jsxDEV("div", {
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
              },
              children: (p.nome || "?")[0].toUpperCase()
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                flex: 1
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 500
                },
                children: p.nome
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 13,
                  color: "var(--text-muted)"
                },
                children: p.email
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV(Icon, {
              name: "chevron-right",
              size: 16
            }, void 0, false)]
          }, p.id, true))
        }, void 0, false)]
      }, st, true);
    }), filtrados.length === 0 && /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        textAlign: "center",
        padding: 48,
        color: "var(--text-muted)"
      },
      children: "Nenhum paciente encontrado."
    }, void 0, false), modal && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModal(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto"
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600
            },
            children: "Novo Paciente"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModal(false),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--gray-400)"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "span 2"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Nome completo"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.nome || "",
              onChange: e => setForm({
                ...form,
                nome: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "E-mail"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "email",
              value: form.email || "",
              onChange: e => setForm({
                ...form,
                email: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Telefone"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.telefone || "",
              onChange: e => setForm({
                ...form,
                telefone: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Genero"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: form.genero || "",
              onChange: e => setForm({
                ...form,
                genero: e.target.value
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "",
                children: "Selecione"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                children: "Feminino"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                children: "Masculino"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                children: "Nao-binario"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                children: "Nao informar"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Status"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: form.status || "ativo",
              onChange: e => setForm({
                ...form,
                status: e.target.value
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "ativo",
                children: "Ativo"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                value: "inativo",
                children: "Inativo"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                value: "alta",
                children: "Alta"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "span 2"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "🏢 Empresa Contratante (opcional — NR-1)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.empresa || "",
              onChange: e => setForm({
                ...form,
                empresa: e.target.value
              }),
              placeholder: "Para colaboradores de empresas"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Setor"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.setor || "",
              onChange: e => setForm({
                ...form,
                setor: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Cargo"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.cargo || "",
              onChange: e => setForm({
                ...form,
                cargo: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "span 2"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Objetivos Terapeuticos"
            }, void 0, false), /*#__PURE__*/_jsxDEV(TextAreaVoz, {
              className: "form-input",
              rows: 3,
              value: form.objetivos || "",
              onChange: e => setForm({
                ...form,
                objetivos: e.target.value
              }),
              placeholder: "Descreva os objetivos..."
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            marginTop: 20,
            justifyContent: "flex-end"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModal(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: salvar,
            disabled: salvando,
            children: salvando ? "Salvando..." : "Salvar"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), modalImport && /*#__PURE__*/_jsxDEV("div", {
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
      },
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 520
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600
            },
            children: "Importar Pacientes (Excel/CSV)"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => {
              setModalImport(false);
              setImportLog([]);
            },
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--gray-400)"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "#f9f5ff",
            border: "1px solid #e9d5ff",
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
            fontSize: 13,
            lineHeight: 1.7
          },
          children: [/*#__PURE__*/_jsxDEV("strong", {
            children: "Colunas aceitas:"
          }, void 0, false), " Nome, Email, Telefone, CPF, DataNascimento, Genero", /*#__PURE__*/_jsxDEV("br", {}, void 0, false), /*#__PURE__*/_jsxDEV("strong", {
            children: "Formatos:"
          }, void 0, false), " .csv ou .txt com separador vírgula, ponto-e-vírgula ou tab", /*#__PURE__*/_jsxDEV("br", {}, void 0, false), /*#__PURE__*/_jsxDEV("strong", {
            children: "Encoding:"
          }, void 0, false), " UTF-8"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            marginBottom: 16
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-outline",
            style: {
              flex: 1,
              fontSize: 13
            },
            onClick: baixarTemplate,
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "download",
              size: 14
            }, void 0, false), " Baixar template CSV"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("label", {
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
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "upload",
              size: 14
            }, void 0, false), " Selecionar arquivo", /*#__PURE__*/_jsxDEV("input", {
              type: "file",
              accept: ".csv,.txt,.xls,.xlsx",
              style: {
                display: "none"
              },
              onChange: processarExcel
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), importLog.length > 0 && /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "#f9fafb",
            borderRadius: 10,
            padding: 14,
            maxHeight: 240,
            overflowY: "auto",
            fontSize: 12,
            lineHeight: 2,
            border: "1px solid #e5e7eb"
          },
          children: importLog.map((l, i) => /*#__PURE__*/_jsxDEV("div", {
            style: {
              color: l.tipo === "ok" ? "#059669" : l.tipo === "err" ? "#dc2626" : "#7B00C4",
              fontWeight: l.tipo === "info" ? 600 : 400
            },
            children: l.msg
          }, i, false))
        }, void 0, false), importando && /*#__PURE__*/_jsxDEV("div", {
          style: {
            textAlign: "center",
            padding: 12,
            color: "var(--purple)",
            fontSize: 13
          },
          children: "Importando... aguarde"
        }, void 0, false)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}

// FINANCEIRO CLINICA
// ── Relatório de Frequência (componente externo) ──────────────────────────
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
  // Normaliza IDs removendo espaços e garantindo string limpa
  const pidNorm = (pacienteId || "").trim();
  const pac = pacientes.find(p => p.id === pidNorm);
  const pacote = pacoteId ? pacotes.find(p => p.id === pacoteId) : null;
  const pacEfetivo = pac || pacientes.find(p => p.id === pacote?.pacienteId);

  // Busca pacotes do paciente — também tenta pelo nome caso ID não bata
  const pacotesPorId = pacotes.filter(p => p.pacienteId === pidNorm);
  // Fallback extra: busca por pacienteNome se nenhum pacote encontrado
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
    // ── REGRA: sessão de PACOTE nunca gera lançamento próprio.
    // O lançamento do pacote já cobre todas as sessões filhas.
    // Lançamento individual só existe para sessões AVULSAS (sem pacoteId).
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
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "var(--purple)",
        borderRadius: 12,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
        flexWrap: "wrap"
      },
      children: [/*#__PURE__*/_jsxDEV("button", {
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
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "arrow-left",
          size: 15
        }, void 0, false), " Voltar"]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          flex: 1
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "Dancing Script, cursive",
            fontSize: 20,
            color: "white",
            fontWeight: 600,
            lineHeight: 1
          },
          children: pacEfetivo?.nome
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "rgba(255,255,255,0.75)",
            marginTop: 2
          },
          children: "Controle de Sessões e Frequência"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
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
        onClick: () => {
          const pac = pacEfetivo;
          const sessMeses = {};
          sessoesPac.forEach(s => {
            const mes = (s.data || "").slice(0, 7);
            if (!sessMeses[mes]) sessMeses[mes] = [];
            sessMeses[mes].push(s);
          });
          const totalPago = sessoesPac.reduce((a, s) => a + (parseFloat(s.valorPago) || 0), 0);
          const totalValor = sessoesPac.reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0);
          const fmtD = d => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
          }) : "—";
          const fmtM = m => {
            const [y, mo] = m.split("-");
            return new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric"
            });
          };
          const statusLabel = {
            agendado: "Agendado",
            confirmado: "Confirmado",
            realizado: "✓ Realizado",
            cancelado: "Cancelado",
            falta: "Falta"
          };
          const statusColor = {
            agendado: "#7B00C4",
            confirmado: "#059669",
            realizado: "#0891b2",
            cancelado: "#dc2626",
            falta: "#d97706"
          };
          const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Resumo de Sessões — ${pac?.nome || ""}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;background:white;padding:32px;max-width:680px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:16px;border-bottom:3px solid #7B00C4;margin-bottom:24px}
  .logo-name{font-family:Georgia,serif;font-size:26px;color:#7B00C4;font-weight:700}
  .logo-sub{font-size:11px;color:#6b7280;margin-top:3px}
  .paciente-box{background:#f5f0ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;border-left:5px solid #7B00C4}
  .paciente-nome{font-size:22px;font-weight:700;color:#111827;margin-bottom:6px}
  .paciente-meta{display:flex;gap:24px;flex-wrap:wrap}
  .meta-item label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;display:block;margin-bottom:2px}
  .meta-item span{font-size:13px;font-weight:600;color:#374151}
  .mes-title{font-size:14px;font-weight:700;color:#7B00C4;padding:8px 0;border-bottom:1px solid #e5e7eb;margin-bottom:8px;margin-top:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#7B00C4;color:white;padding:7px 10px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase}
  td{padding:7px 10px;border-bottom:1px solid #f3f4f6}
  tr:nth-child(even) td{background:#fafafa}
  .status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;color:white;display:inline-block}
  .totais{margin-top:24px;background:#f9fafb;border-radius:10px;padding:14px 20px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12}
  .total-item label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;display:block}
  .total-item span{font-size:18px;font-weight:800}
  .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
  @media print{body{padding:16px} @page{margin:1.5cm}}
</style></head><body>
<div class="header">
  <div><div class="logo-name">Dra. Lucia Kratz</div><div class="logo-sub">CRP 09/20590 · Psicóloga · TCC · Musicoterapeuta · Neuromodulação<br>Goiânia, GO</div></div>
  <div style="text-align:right;font-size:11px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
          })}</div>
</div>
<div class="paciente-box">
  <div class="paciente-nome">${pac?.nome || "—"}</div>
  <div class="paciente-meta">
    <div class="meta-item"><label>Início</label><span>${pacotesPac[0]?.dataInicio ? new Date(pacotesPac[0].dataInicio + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</span></div>
    <div class="meta-item"><label>Horário</label><span>${pacotesPac[0]?.horario || "—"}</span></div>
    <div class="meta-item"><label>Recorrência</label><span>${pacotesPac[0]?.recorrencia || "—"}</span></div>
    <div class="meta-item"><label>Total de sessões</label><span>${sessoesPac.length}</span></div>
  </div>
</div>
${Object.entries(sessMeses).sort(([a], [b]) => a.localeCompare(b)).map(([mes, sess]) => `
<div class="mes-title">${fmtM(mes).charAt(0).toUpperCase() + fmtM(mes).slice(1)} — ${sess.length} sessão(ões)</div>
<table>
  <thead><tr><th>Nº</th><th>Data</th><th>Horário</th><th>Tipo</th><th>Presença</th><th>Valor</th></tr></thead>
  <tbody>${sess.sort((a, b) => (a.data || "").localeCompare(b.data || "")).map((s, i) => `
    <tr>
      <td style="font-weight:700;color:#7B00C4">${s.numSessao || i + 1}</td>
      <td>${s.data ? new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit"
          }) : ""}</td>
      <td>${s.hora || "—"}</td>
      <td>${s.tipo || "Psicoterapia"}</td>
      <td><span class="status" style="background:${statusColor[s.status] || "#7B00C4"}">${statusLabel[s.status] || s.status || "—"}</span></td>
      <td>R$ ${(parseFloat(s.valorSessao) || 0).toFixed(2).replace(".", ",")}</td>
    </tr>`).join("")}
  </tbody>
</table>`).join("")}
<div class="totais">
  <div class="total-item"><label>Total do pacote</label><span style="color:#111827">R$ ${totalValor.toFixed(2).replace(".", ",")}</span></div>
  <div class="total-item"><label>Recebido</label><span style="color:#059669">R$ ${totalPago.toFixed(2).replace(".", ",")}</span></div>
  <div class="total-item"><label>A receber</label><span style="color:#d97706">R$ ${(totalValor - totalPago).toFixed(2).replace(".", ",")}</span></div>
</div>
<div class="footer">Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
          })} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
          const w = window.open("", "_blank");
          w.document.write(html);
          w.document.close();
          setTimeout(() => w.print(), 800);
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "printer",
          size: 15
        }, void 0, false), " Imprimir / PDF"]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--gray-200)",
        marginBottom: 16
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "var(--purple)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "Dancing Script, cursive",
            fontSize: 22,
            color: "white",
            fontWeight: 600
          },
          children: "Controle de Atendimento Terapêutico"
        }, void 0, false), /*#__PURE__*/_jsxDEV("img", {
          src: "../logo-transparente.png",
          style: {
            height: 36,
            objectFit: "contain"
          },
          onError: e => e.target.style.display = "none"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
          gap: 12,
          borderBottom: "1px solid var(--gray-100)"
        },
        children: [["Nome", pacEfetivo?.nome || "—"], ["Início", pacotesPac[0]?.dataInicio ? new Date(pacotesPac[0].dataInicio + "T00:00:00").toLocaleDateString("pt-BR") : "—"], ["Horário", pacotesPac[0]?.horario || "—"], ["Recorrência", pacotesPac[0]?.recorrencia || "—"]].map(([l, v]) => /*#__PURE__*/_jsxDEV("div", {
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 10,
              color: "var(--text-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 2
            },
            children: l
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontWeight: 600,
              fontSize: 13
            },
            children: v
          }, void 0, false)]
        }, l, true))
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "12px 20px",
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          background: "var(--purple-soft)"
        },
        children: (() => {
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
          }), "#0891b2"]].map(([l, v, c]) => /*#__PURE__*/_jsxDEV("div", {
            style: {
              textAlign: "center"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 16,
                fontWeight: 800,
                color: c
              },
              children: v
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 10,
                color: c,
                fontWeight: 500
              },
              children: l
            }, void 0, false)]
          }, l, true));
        })()
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 16,
        flexWrap: "wrap",
        alignItems: "center"
      },
      children: [/*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)"
        },
        children: "Mês:"
      }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
        },
        children: "Todos"
      }, void 0, false), meses.map(m => /*#__PURE__*/_jsxDEV("button", {
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
        },
        children: new Date(m + "-15").toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit"
        })
      }, m, false))]
    }, void 0, true), mesesFiltrados.map(mes => {
      const sessMes = porMes[mes] || [];
      const mesLabel = new Date(mes + "-15").toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      });
      const recMes = sessMes.filter(s => s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
      const aberto = accordionAberto[mes] !== false;
      return /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--gray-200)",
          marginBottom: 12
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
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
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12
            },
            children: [/*#__PURE__*/_jsxDEV("span", {
              style: {
                fontWeight: 700,
                fontSize: 14,
                color: "var(--purple)",
                textTransform: "capitalize"
              },
              children: mesLabel
            }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)"
              },
              children: [sessMes.length, " sessões"]
            }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: "#059669"
              },
              children: recMes.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV(Icon, {
            name: aberto ? "chevron-up" : "chevron-down",
            size: 16
          }, void 0, false)]
        }, void 0, true), aberto && /*#__PURE__*/_jsxDEV("div", {
          style: {
            overflowX: "auto"
          },
          children: /*#__PURE__*/_jsxDEV("table", {
            style: {
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12
            },
            children: [/*#__PURE__*/_jsxDEV("thead", {
              children: /*#__PURE__*/_jsxDEV("tr", {
                style: {
                  background: "var(--purple)",
                  color: "white"
                },
                children: ["", "Nº", "Data", "Presença", "Modalidade", "V. Sessão", "V. Pago", "Saldo", "Forma Pagto", "Data Pagto", "Obs"].map(h => /*#__PURE__*/_jsxDEV("th", {
                  style: {
                    padding: "8px 10px",
                    textAlign: "left",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    fontSize: 11
                  },
                  children: h
                }, h, false))
              }, void 0, false)
            }, void 0, false), /*#__PURE__*/_jsxDEV("tbody", {
              children: sessMes.map((s, i) => {
                const st = STATUS_S[s.status] || STATUS_S.agendado;
                const isPago = s.pagamento === "pago"; // remarcado mantém pagamento original
                const vSessao = parseFloat(s.valorSessao) || 0;
                const vPago = parseFloat(s.valorPago) || (isPago ? vSessao : 0);
                const saldo = isPago ? vPago - vSessao : 0;
                return /*#__PURE__*/_jsxDEV("tr", {
                  style: {
                    borderBottom: "1px solid var(--gray-100)",
                    background: i % 2 === 0 ? "white" : "#fafafa"
                  },
                  children: [/*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "5px 6px"
                    },
                    children: /*#__PURE__*/_jsxDEV("button", {
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
                      },
                      children: /*#__PURE__*/_jsxDEV(Icon, {
                        name: "trash-2",
                        size: 12
                      }, void 0, false)
                    }, void 0, false)
                  }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px",
                      fontWeight: 700,
                      color: "var(--purple)"
                    },
                    children: s.numSessao || "—"
                  }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px",
                      whiteSpace: "nowrap"
                    },
                    children: [s.data ? new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR") : "—", s.remarcada && /*#__PURE__*/_jsxDEV("span", {
                      style: {
                        fontSize: 9,
                        color: "#0891b2",
                        marginLeft: 4
                      },
                      children: "Rem."
                    }, void 0, false)]
                  }, void 0, true), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px"
                    },
                    children: [/*#__PURE__*/_jsxDEV("select", {
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
                      },
                      children: Object.entries(STATUS_S).map(([k, v]) => /*#__PURE__*/_jsxDEV("option", {
                        value: k,
                        children: v.l
                      }, k, false))
                    }, void 0, false), (s.status === "cancelado" || s.status === "remarcado") && /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        marginTop: 3
                      },
                      children: [/*#__PURE__*/_jsxDEV("div", {
                        style: {
                          fontSize: 9,
                          color: "#0891b2",
                          marginBottom: 2
                        },
                        children: "Nova data (sem mov. financeira):"
                      }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
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
                      }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
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
                        },
                        children: [/*#__PURE__*/_jsxDEV("option", {
                          value: "remarcacao",
                          children: "🔄 Remarcação"
                        }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                          value: "falta",
                          children: "⚠️ Falta"
                        }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                          value: "compensacao",
                          children: "✅ Compensação"
                        }, void 0, false)]
                      }, void 0, true)]
                    }, void 0, true)]
                  }, void 0, true), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px"
                    },
                    children: /*#__PURE__*/_jsxDEV("input", {
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
                    }, void 0, false)
                  }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px",
                      fontWeight: 600,
                      color: "#374151",
                      whiteSpace: "nowrap"
                    },
                    children: vSessao.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    })
                  }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px"
                    },
                    children: /*#__PURE__*/_jsxDEV("input", {
                      type: "number",
                      defaultValue: s.valorPago || "",
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
                    }, s.id + "_vpago", false)
                  }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      color: saldo < 0 ? "#dc2626" : saldo > 0 ? "#059669" : "#9ca3af",
                      fontSize: 11
                    },
                    children: isPago ? saldo === 0 ? "—" : saldo.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }) : "—"
                  }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px"
                    },
                    children: /*#__PURE__*/_jsxDEV("select", {
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
                      },
                      children: [/*#__PURE__*/_jsxDEV("option", {
                        value: "",
                        children: "Pendente"
                      }, void 0, false), FORMAS.map(f => /*#__PURE__*/_jsxDEV("option", {
                        value: f,
                        children: f
                      }, f, false))]
                    }, void 0, true)
                  }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px"
                    },
                    children: /*#__PURE__*/_jsxDEV("input", {
                      type: "date",
                      defaultValue: s.dataPagamento || "",
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
                    }, s.id + "_dtpag", false)
                  }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                    style: {
                      padding: "6px 10px"
                    },
                    children: /*#__PURE__*/_jsxDEV("input", {
                      defaultValue: s.obs || "",
                      onBlur: e => atualizarSessao(s.id, {
                        obs: e.target.value
                      }),
                      placeholder: "—",
                      style: {
                        fontSize: 10,
                        border: "1px solid #e5e7eb",
                        borderRadius: 5,
                        padding: "2px 5px",
                        width: 70
                      }
                    }, void 0, false)
                  }, void 0, false)]
                }, s.id, true);
              })
            }, void 0, false), /*#__PURE__*/_jsxDEV("tfoot", {
              children: /*#__PURE__*/_jsxDEV("tr", {
                style: {
                  background: "var(--purple-soft)"
                },
                children: [/*#__PURE__*/_jsxDEV("td", {
                  colSpan: 5,
                  style: {
                    padding: "8px 10px",
                    fontWeight: 700,
                    fontSize: 11
                  },
                  children: ["Total ", mesLabel]
                }, void 0, true), /*#__PURE__*/_jsxDEV("td", {
                  style: {
                    padding: "8px 10px",
                    fontWeight: 700,
                    fontSize: 11
                  },
                  children: sessMes.reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  })
                }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                  style: {
                    padding: "8px 10px",
                    fontWeight: 700,
                    fontSize: 11,
                    color: "#059669"
                  },
                  children: recMes.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  })
                }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                  colSpan: 4
                }, void 0, false)]
              }, void 0, true)
            }, void 0, false)]
          }, void 0, true)
        }, void 0, false)]
      }, mes, true);
    }), modalExcluir && /*#__PURE__*/_jsxDEV("div", {
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
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 400,
          textAlign: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 32,
            marginBottom: 12
          },
          children: "🗑️"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 8
          },
          children: ["Excluir sessão #", modalExcluir.numSessao, "?"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("p", {
          style: {
            fontSize: 13,
            color: "#6b7280",
            marginBottom: 20
          },
          children: modalExcluir.data ? new Date(modalExcluir.data + "T00:00:00").toLocaleDateString("pt-BR") : ""
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              border: "1.5px solid #e5e7eb",
              textAlign: "left",
              padding: "12px 16px"
            },
            onClick: () => confirmarExclusao("este"),
            children: /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600,
                fontSize: 13
              },
              children: "Só esta sessão"
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              border: "1.5px solid #fbbf24",
              textAlign: "left",
              padding: "12px 16px"
            },
            onClick: () => confirmarExclusao("daqui"),
            children: /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600,
                fontSize: 13,
                color: "#d97706"
              },
              children: "Esta e todas as próximas"
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              border: "1.5px solid #fca5a5",
              textAlign: "left",
              padding: "12px 16px"
            },
            onClick: () => confirmarExclusao("todos"),
            children: /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600,
                fontSize: 13,
                color: "#dc2626"
              },
              children: "Cancelar todo o pacote"
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            width: "100%"
          },
          onClick: () => setModalExcluir(null),
          children: "Cancelar"
        }, void 0, false)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}
function FinanceiroClinica({
  user
}) {
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
  const CATS_DESPESA_CLINICA = ["Aluguel", "Condomínio", "Energia / Água", "Telefone / Internet", "Salário Secretária", "Contador / Impostos", "Marketing", "Equipamentos", "Materiais", "Ferramentas de IA", "Cursos e Capacitação", "Musicoterapia", "Manutenção", "Outros"];
  const FORMAS_PAG_CLINICA = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Depósito", "Transferência", "Outro"];
  const [modalDespesa, setModalDespesa] = useState(false);
  const [formDespesa, setFormDespesa] = useState({
    descricao: "",
    categoria: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    formaPag: "PIX",
    status: "pago",
    obs: "",
    parcelas: "1"
  });
  const [editandoDespesa, setEditandoDespesa] = useState(null);
  async function salvarDespesaClinica() {
    if (!formDespesa.valor || !formDespesa.data) {
      alert("Preencha valor e data.");
      return;
    }
    setSalvando(true);
    try {
      const val = parseFloat(formDespesa.valor);
      const nParc = parseInt(formDespesa.parcelas) || 1;
      const base = {
        tipo: "despesa",
        tipo_lancamento: "despesa",
        categoria: formDespesa.categoria || "Outros",
        descricao: formDespesa.descricao || formDespesa.categoria || "Despesa",
        formaPag: formDespesa.formaPag,
        status: formDespesa.status,
        obs: formDespesa.obs || "",
        centroCusto: "🏥 Clínica",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (editandoDespesa) {
        await db.collection("clinica_lancamentos").doc(editandoDespesa).update({
          ...base,
          valor: val,
          data: formDespesa.data
        });
      } else if (nParc > 1) {
        const batch = db.batch();
        const [ano, mes, dia] = formDespesa.data.split("-").map(Number);
        for (let i = 0; i < nParc; i++) {
          let m = mes + i,
            a = ano;
          while (m > 12) {
            m -= 12;
            a++;
          }
          const dp = `${a}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          batch.set(db.collection("clinica_lancamentos").doc(), {
            ...base,
            valor: val,
            data: dp,
            parcela: `${i + 1}/${nParc}`,
            descricao: (formDespesa.descricao || formDespesa.categoria || "Despesa") + ` (${i + 1}/${nParc})`
          });
        }
        await batch.commit();
      } else {
        await db.collection("clinica_lancamentos").add({
          ...base,
          valor: val,
          data: formDespesa.data
        });
      }
      setModalDespesa(false);
      setEditandoDespesa(null);
      setFormDespesa({
        descricao: "",
        categoria: "",
        valor: "",
        data: new Date().toISOString().slice(0, 10),
        formaPag: "PIX",
        status: "pago",
        obs: "",
        parcelas: "1"
      });
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setSalvando(false);
  }
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
  // Estado dedicado para edição de despesas
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
  // ── Painel de higienização ────────────
  const [modalAuditoria, setModalAuditoria] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("tudo"); // "tudo" | "receita" | "despesa"
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
  const [modalEditarPacote, setModalEditarPacote] = useState(null); // {pacote}
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

  // Anos disponíveis
  const anosDisp = [...new Set(lancamentos.map(l => l.data?.slice(0, 4)).filter(Boolean))].sort().reverse();
  if (!anosDisp.includes(anoFiltro)) anosDisp.unshift(anoFiltro);

  // Meses do ano selecionado — sempre Jan (01) → Dez (12)
  const mesAtual = new Date().toISOString().slice(0, 7);
  const mesesDisp = Array.from({
    length: 12
  }, (_, i) => `${anoFiltro}-${String(i + 1).padStart(2, "0")}`);

  // Se mesFiltro não pertence ao anoFiltro, corrige para mês atual
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro) ? mesFiltro : mesAtual.startsWith(anoFiltro) ? mesAtual : anoFiltro + "-01";

  // Cards do topo — mês atual do ano selecionado, fixo
  const mesCards = anoFiltro + "-" + new Date().toISOString().slice(5, 7);
  const lancMesCards = lancamentos.filter(l => l.data?.startsWith(mesCards));
  const lancMes = lancamentos.filter(l => l.data?.startsWith(mesFiltroEfetivo));
  const lancAno = lancamentos.filter(l => l.data?.startsWith(anoFiltro));
  const lancPeriodo = periodoCard === "mes" ? lancMesCards : lancAno;

  // Métricas por período selecionado nos cards
  // Receitas somam, despesas deduzem
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

  // Salvar lançamento avulso — ETAPA 2: UPDATE obrigatório quando editando
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
        // ── ETAPA 2: GUARD — verifica se o contexto ainda existe antes de salvar
        const docSnap = await db.collection("clinica_lancamentos").doc(editando).get();
        if (!docSnap.exists) {
          alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
          setModal(false);
          setEditando(null);
          setSalvando(false);
          return;
        }
        // UPDATE cirúrgico — nunca gera novo INSERT
        await db.collection("clinica_lancamentos").doc(editando).update({
          ...dados,
          _editadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Novo lançamento — INSERT legítimo
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
    // ── ETAPA 2: bifurca entre receita e despesa
    if (l.tipo_lancamento === "despesa") {
      setFormDespesa({
        descricao: l.descricao || "",
        categoria: l.categoria || "",
        valor: l.valor + "",
        data: l.data || "",
        formaPag: l.formaPag || "PIX",
        status: l.status || "pago",
        obs: l.obs || "",
        parcelas: "1"
      });
      setEditandoDespesa(l.id);
      setModalDespesa(true);
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

  // ── Salvar edição de DESPESA — UPDATE obrigatório, nunca INSERT
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

  // ── ETAPA 3: FONTE ÚNICA DA VERDADE ─────────────────────────────────────
  // Dar baixa em um pacote:
  //   1. Atualiza o documento do pacote (statusPag, valorPago, valorPendente)
  //   2. Marca todas as sessões filhas como pagas em batch
  //   3. Garante que existe EXATAMENTE 1 lançamento vinculado (sem criar duplicata)
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

    // 1. Atualiza o pacote — recalcula a matriz financeira
    batch.update(db.collection("clinica_pacotes").doc(pacoteId), {
      statusPag: "recebido",
      formaPag,
      dataPagamento: hoje,
      valorPago: valorPagoFinal,
      valorPendente: valorPendenteFinal,
      _sincronizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Atualiza todas as sessões filhas
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

    // 3. Atualiza lançamento existente OU cria exatamente 1 novo (evita duplicata)
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
      // Gera lançamento apenas se não existe nenhum para este pacote
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

    // ── GATILHO ÚNICO + TRAVA DUPLA DE COMISSÃO ──
    // Regra 1: Só dispara se o pacote estava estritamente "pendente" antes desta chamada
    // Regra 2: ID derivado (COM_pacoteId) garante idempotência — retry nunca duplica
    const eraPendente = (pacote.statusPag || "pendente") !== "recebido";
    if (eraPendente) {
      // Detecta se é primeira venda ou recorrente para este paciente
      const tipoVendaDetectado = lancamentos.some(l => l.pacienteId === pacote.pacienteId && l.pacoteId !== pacoteId && l.status === "recebido") ? "recorrente" : "primeira";
      await registrarComissao({
        tipo: "Pacote",
        valor: valorPagoFinal,
        pacienteNome: pacote.pacienteNome || pacientes.find(p => p.id === pacote.pacienteId)?.nome || "",
        tipoVenda: tipoVendaDetectado,
        pacoteId
      });
    }
  }

  // Geração de datas recorrentes
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
    // 2x ou 3x por semana
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
    // ── TRAVA DE IDEMPOTÊNCIA: ID do documento = "COM_" + pacoteId ──
    // Se o gatilho rodar mais de uma vez (erro de rede, retry), o Firestore
    // fará um UPDATE (merge) e nunca um INSERT duplicado.
    if (!pacoteId) {
      console.warn("[registrarComissao] Chamada sem pacoteId — abortando para evitar registro órfão.");
      return;
    }
    const cfg = await getConfigFin();
    const percNum = tipoVenda === "primeira" ? parseFloat(cfg.percPrimeira) || 10 : parseFloat(cfg.percRecorrente) || 5;
    const perc = percNum / 100;
    const valorComissao = parseFloat((valor * perc).toFixed(2));
    const hoje = new Date();
    const mesRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    // ID derivado do pacote → idempotente
    const docId = "COM_" + pacoteId;
    await db.collection("vendas_secretaria").doc(docId).set({
      tipo,
      tipoVenda,
      perc: perc * 100,
      valorBase: valor,
      valorComissao,
      pacienteNome,
      mesRef,
      pacoteId,
      status: "pendente",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {
      merge: true
    });
    // Se não existia → cria com createdAt; se já existia → atualiza sem criar novo
    await db.collection("vendas_secretaria").doc(docId).set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {
      merge: true
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
    if (eParceria && (formPacote.parceirosList || []).length === 0) {
      alert("Adicione ao menos um parceiro para a venda em parceria.");
      return;
    }
    setSalvando(true);
    try {
      const pac = pacientes.find(p => p.id === pacienteId);
      const total = parseInt(totalSessoes) || 1;
      const vSessao = parseFloat(valorSessao) || 0;
      const vTotal = vSessao * total;
      const datas = gerarDatas(dataInicio, recorrencia, total, diasSemana);
      const parceirosList = eParceria ? formPacote.parceirosList || [] : [];
      // compatibilidade legada: parceiraId/percParceiro mantidos para o primeiro parceiro se existir
      const parcSel = eParceria && parceirosList.length > 0 ? parceiras.find(p => p.id === parceirosList[0].parceiraId) : null;
      const percParc = 0;

      // Cria pacote
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
        parceirosList: eParceria ? parceirosList : [],
        parceiraId: eParceria && parceirosList[0] ? parceirosList[0].parceiraId || null : null,
        parceiraNome: eParceria && parceirosList[0] ? parceirosList[0].nome || null : null,
        percParceiro: null,
        statusPag: formPacote.statusPag || "pendente",
        formaPag: formPacote.formaPag || "",
        dataPagamento: formPacote.dataPagamento || "",
        pagamentosExtras: formPacote.pagamentosExtras || [],
        status: "ativo",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Cria lançamento financeiro do pacote
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

      // Registra comissão da secretária APENAS se o pagamento já entrou no caixa
      // Se pendente, o gatilho será disparado exclusivamente em marcarPacotePago()
      const pagoImediato = (formPacote.statusPag || "pendente") === "recebido";
      if (tipoVenda && pagoImediato) {
        await registrarComissao({
          tipo: "Pacote",
          valor: vTotal,
          pacienteNome: pac?.nome || "",
          tipoVenda,
          pacoteId: pacRef.id
        });
      }

      // Registra repasses dos parceiros → clinica_lancamentos como despesa
      if (eParceria && parceirosList.length > 0) {
        const hoje = new Date().toISOString().slice(0, 10);
        for (const pr of parceirosList) {
          const vRep = pr.tipoValor === "fixo" ? parseFloat(pr.valor || 0) : parseFloat((vTotal * (parseFloat(pr.perc) || 0) / 100).toFixed(2));
          if (!vRep || vRep <= 0) continue;
          const nomeParc = pr.nome || parceiras.find(x => x.id === pr.parceiraId)?.nome || "Parceiro";
          await db.collection("clinica_lancamentos").add({
            tipo_lancamento: "despesa",
            tipo: `Repasse parceria — ${nomeParc}`,
            descricao: `Repasse ${nomeParc} — ${pac?.nome || ""} — pacote ${total} sessões`,
            categoria: "Repasse Parceria",
            valor: vRep,
            data: hoje,
            formaPag: "",
            status: "pendente",
            pacoteId: pacRef.id,
            pacienteNome: pac?.nome || "",
            parceiroNome: nomeParc,
            parceiraId: pr.parceiraId || "",
            obs: `Pacote de ${total} sessões — ${pac?.nome || ""}`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      // ── E-MAIL AUTOMÁTICO via extensão ext-firestore-send-email ──────
      // Só envia se o paciente tiver e-mail cadastrado
      const emailPaciente = pac?.email || pac?.emailPaciente || "";
      if (emailPaciente) {
        const dataFmtEmail = new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
        await db.collection("nr1map_emails").add({
          to: emailPaciente,
          message: {
            subject: `✅ Seu pacote de sessões foi confirmado — Dra. Lucia Kratz`,
            html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f0ff;margin:0;padding:20px;}
.c{max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;}
.h{background:linear-gradient(135deg,#7B00C4,#5a0090);padding:32px;color:white;text-align:center;}
.b{padding:28px;}.box{background:#f5f0ff;border-radius:12px;padding:18px;border-left:4px solid #7B00C4;margin-bottom:20px;}
.row{display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px;}
.label{color:#6b7280;}.val{font-weight:600;color:#111827;}
.btn{display:inline-block;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin:4px;}
.f{background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;}
</style></head><body><div class="c">
<div class="h"><div style="font-size:28px;margin-bottom:8px">🦋</div>
<h1 style="margin:0;font-size:22px">Dra. Lucia Kratz</h1>
<p style="margin:8px 0 0;opacity:.85;font-size:13px">CRP 09/20590 · Psicóloga Doutora</p></div>
<div class="b">
<p style="font-size:16px;color:#374151;line-height:1.6">Olá, <strong>${pac?.nome || "Paciente"}</strong>! 💜<br><br>
Seu pacote de sessões de psicoterapia foi confirmado com sucesso.</p>
<div class="box"><h3 style="margin:0 0 12px;color:#7B00C4;font-size:14px">📋 Detalhes do pacote</h3>
<div class="row"><span class="label">Início</span><span class="val">${dataFmtEmail}</span></div>
<div class="row"><span class="label">Total de sessões</span><span class="val">${total} sessão(ões)</span></div>
${horario ? `<div class="row"><span class="label">Horário</span><span class="val">${horario}</span></div>` : ""}
<div class="row"><span class="label">Recorrência</span><span class="val">${recorrencia || "A combinar"}</span></div>
<div class="row"><span class="label">Valor total</span><span class="val">R$ ${vTotal.toFixed(2).replace(".", ",")}</span></div>
</div>
<div style="background:#f0fdf4;border-radius:12px;padding:16px;border-left:4px solid #059669;margin-bottom:20px;font-size:13px;color:#065f46;line-height:1.6">
💡 Para reagendar ou tirar dúvidas, entre em contato pelo WhatsApp da clínica.
</div>
<div style="text-align:center;margin:20px 0">
<a href="https://wa.me/5562994644950" class="btn" style="background:#25D366;color:white">💬 WhatsApp da Clínica</a>
<a href="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica" class="btn" style="background:#7B00C4;color:white">🌐 Acessar Portal</a>
</div></div>
<div class="f"><p>Este e-mail foi enviado automaticamente pelo sistema da Dra. Lucia Kratz.</p>
<p>Goiânia, GO · CRP 09/20590</p></div></div></body></html>`
          }
        });
      }
      // ─────────────────────────────────────────────────────────────────

      // Cria sessões na agenda
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
      // Social: lança comissão estagiária automaticamente
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
        batchSoc.set(db.collection("repasses_parcerias").doc(), {
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
      alert(`✅ Pacote criado! ${datas.length} sessões geradas na agenda.`);
    } catch (e) {
      console.error("Erro ao criar pacote:", e);
      alert("⚠️ Erro ao criar pacote: " + e.message + "\n\nVerifique se o pacote e as sessões foram criados corretamente na aba Pacotes & Sessões e na Agenda antes de tentar novamente.");
    } finally {
      setSalvando(false);
    }
  }
  async function atualizarSessao(id, campos) {
    await db.collection("clinica_sessoes").doc(id).update(campos);
  }

  // ── ETAPA 3: Remarcação/Compensação ─────────────────────────────────────
  // Altera APENAS data + status. Jamais toca em valor, pagamento ou lançamentos.
  // Motivo: remarcação por falta ou compensação não gera movimentação financeira.
  async function remarcarSessao(s, novaData, motivo = "remarcacao") {
    if (!novaData) return;
    try {
      await db.collection("clinica_sessoes").doc(s.id).update({
        data: novaData,
        status: "remarcado",
        remarcada: true,
        dataRemarcada: novaData,
        dataOriginal: s.dataOriginal || s.data,
        motivoRemarcacao: motivo // "remarcacao" | "falta" | "compensacao"
        // NÃO altera: pagamento, valorPago, valorSessao, dataPagamento, pacoteId
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
        // Cancelar todo o pacote — exclusão em cascata via query direta (evita dados órfãos)
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
    // Modo ver sessões (id__sessoes)
    if (pacoteSelecionado.endsWith("__sessoes")) {
      const pacoteId = pacoteSelecionado.replace("__sessoes", "");
      return /*#__PURE__*/_jsxDEV(RelatorioFrequencia, {
        pacienteId: null,
        pacoteId: pacoteId,
        pacientes: pacientes,
        sessoes: sessoes,
        pacotes: pacotes,
        lancamentos: lancamentos,
        FORMAS: FORMAS,
        onVoltar: () => setPacoteSelecionado(null)
      }, void 0, false);
    }
    // Modo editar pacote individual (id__pacote) — abre modal de edição
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
    // Modo controle geral do paciente (pacienteId)
    return /*#__PURE__*/_jsxDEV(RelatorioFrequencia, {
      pacienteId: pacoteSelecionado,
      pacoteId: null,
      pacientes: pacientes,
      sessoes: sessoes,
      pacotes: pacotes,
      lancamentos: lancamentos,
      FORMAS: FORMAS,
      onVoltar: () => setPacoteSelecionado(null)
    }, void 0, false);
  }

  // Função salvar edição do pacote — v2 (sync financeiro + pagamentosExtras + try/catch robusto)
  async function recalcularDatasPacote() {
    if (!modalEditarPacote) return;
    const f = formEdicaoPacote;
    if (!f.dataInicio) {
      alert("Defina a data de início antes de recalcular.");
      return;
    }
    if (!confirm("Isso vai REESCREVER as datas de todas as sessões deste pacote a partir da nova data de início, mantendo a recorrência atual.\n\nSessões já realizadas ou pagas também terão a data alterada. Confirma?")) return;
    setSalvandoEdicao(true);
    try {
      const snapSess = await db.collection("clinica_sessoes").where("pacoteId", "==", modalEditarPacote.id).get();
      const sessDoPacote = snapSess.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (a.numSessao || 0) - (b.numSessao || 0) || (a.data || "").localeCompare(b.data || ""));
      const total = sessDoPacote.length || parseInt(f.totalSessoes) || 1;
      const diasSemana = modalEditarPacote.diasSemana || [];
      const novasDatas = gerarDatas(f.dataInicio, f.recorrencia, total, diasSemana);
      const batch = db.batch();
      sessDoPacote.forEach((s, idx) => {
        if (novasDatas[idx]) {
          batch.update(db.collection("clinica_sessoes").doc(s.id), {
            data: novasDatas[idx]
          });
        }
      });
      await batch.commit();
      alert(`✓ ${novasDatas.length} sessão(ões) realinhada(s) a partir de ${new Date(f.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")}.`);
    } catch (e) {
      console.error("Erro recalcularDatasPacote:", e);
      alert("Erro ao recalcular datas: " + e.message);
    }
    setSalvandoEdicao(false);
  }
  async function salvarEdicaoPacote(tipoVenda) {
    if (!modalEditarPacote) return;
    setSalvandoEdicao(true);
    try {
      const f = formEdicaoPacote;
      const jaPago = (f.statusPag || "pendente") === "recebido";
      const eraPendente = (modalEditarPacote.statusPag || "pendente") !== "recebido";
      const novoTotalSessoes = parseInt(f.totalSessoes) || modalEditarPacote.totalSessoes;
      const novoValorSessao = parseFloat(f.valorSessao) || modalEditarPacote.valorSessao;
      const novoValorTotal = novoTotalSessoes * novoValorSessao;
      const dataPagFinal = jaPago ? f.dataPagamento || new Date().toISOString().slice(0, 10) : "";

      // Calcula valorPago por sessão distribuindo pagamentosExtras proporcionalmente
      const extras = f.pagamentosExtras || [];
      const totalExtras = extras.reduce((a, pg) => a + (parseFloat(pg.valor) || 0), 0);
      const totalPagoRef = jaPago ? totalExtras > 0 ? totalExtras : novoValorTotal : 0;
      const valorPagoPorSessao = novoTotalSessoes > 0 ? parseFloat((totalPagoRef / novoTotalSessoes).toFixed(2)) : novoValorSessao;

      // 1. Atualiza o documento do pacote
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

      // 2. Atualiza lançamento financeiro vinculado via query direta
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

      // 3. Atualiza sessões filhas em batch
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

      // ── COMISSÃO: só dispara se estava pendente, agora recebido e tipoVenda informado ──
      if (jaPago && eraPendente && tipoVenda) {
        const pacNome = pacientes.find(p => p.id === modalEditarPacote.pacienteId)?.nome || modalEditarPacote.pacienteNome || "";
        await registrarComissao({
          tipo: "Pacote",
          valor: novoValorTotal,
          pacienteNome: pacNome,
          tipoVenda,
          pacoteId: modalEditarPacote.id
        });
      }
      alert("✓ Pacote atualizado! Sessões e financeiro sincronizados.");
      setModalEditarPacote(null);
    } catch (e) {
      console.error("Erro salvarEdicaoPacote:", e);
      alert("Erro ao salvar pacote: " + e.message);
    }
    setSalvandoEdicao(false);
  }

  // Métricas
  const totalRecebido = lancamentos.filter(l => l.status === "recebido").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  async function executarHigienizacao() {
    if (!confirm("⚠️ Confirmar higienização completa?\n\n• Lançamentos de sessão órfãos (de pacotes) serão deletados\n• Duplicatas de Ronei e Heitor serão removidas\n• Lançamentos Sem Nome viram Despesas Administrativas\n\nEssa ação não pode ser desfeita.")) return;
    setAuditando(true);
    const log = [];
    const mesRef = "2026-05";

    // ── PASSO 0: Maior fonte de duplicata — sessões de pacote gerando lançamento próprio
    const ro = await deletarLancamentosOrfaosDeSessao();
    log.push(`Sessões órfãs de pacote: ${ro.ok ? `${ro.deletados} lançamento(s) deletado(s)` : "Erro — " + ro.erro}`);

    // ── PASSO 1: Duplicatas por paciente
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

    // ── PASSO 2: Categorizar Sem Nome
    const rc = await categorizarSemNome(mesRef);
    log.push(`Sem Nome: ${rc.ok ? `${rc.atualizados} lançamento(s) categorizados` : "Erro — " + rc.erro}`);
    setAuditLog(log);
    setAuditando(false);
  }
  return /*#__PURE__*/_jsxDEV("div", {
    children: [modalEditarPacote && /*#__PURE__*/_jsxDEV("div", {
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
      },
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("h3", {
            style: {
              margin: 0,
              color: "var(--purple)"
            },
            children: "✏️ Editar Pacote"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModalEditarPacote(null),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "var(--gray-400)"
            },
            children: "✕"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Nº de Sessões"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              value: formEdicaoPacote.totalSessoes || "",
              onChange: e => setFormEdicaoPacote({
                ...formEdicaoPacote,
                totalSessoes: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Valor por Sessão (R$)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              value: formEdicaoPacote.valorSessao || "",
              onChange: e => setFormEdicaoPacote({
                ...formEdicaoPacote,
                valorSessao: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Data de Início"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "date",
              value: formEdicaoPacote.dataInicio || "",
              onChange: e => setFormEdicaoPacote({
                ...formEdicaoPacote,
                dataInicio: e.target.value
              })
            }, void 0, false), formEdicaoPacote.dataInicio !== modalEditarPacote.dataInicio && /*#__PURE__*/_jsxDEV("div", {
              style: {
                marginTop: 6,
                fontSize: 11,
                color: "#d97706",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: "6px 10px",
                lineHeight: 1.5
              },
              children: ["⚠️ Mudar a data de início ", /*#__PURE__*/_jsxDEV("strong", {
                children: "não move"
              }, void 0, false), " as sessões já criadas — elas continuam nas datas originais. Use o botão abaixo se quiser realinhar todas as sessões a partir desta nova data.", /*#__PURE__*/_jsxDEV("button", {
                type: "button",
                onClick: recalcularDatasPacote,
                disabled: salvandoEdicao,
                style: {
                  display: "block",
                  marginTop: 8,
                  background: "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)"
                },
                children: "🔄 Recalcular datas das sessões"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Horário"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "time",
              value: formEdicaoPacote.horario || "",
              onChange: e => setFormEdicaoPacote({
                ...formEdicaoPacote,
                horario: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Recorrência"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formEdicaoPacote.recorrencia || "",
              onChange: e => setFormEdicaoPacote({
                ...formEdicaoPacote,
                recorrencia: e.target.value
              }),
              children: RECORRENCIAS.map(r => /*#__PURE__*/_jsxDEV("option", {
                children: r
              }, r, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Total do Pacote"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              readOnly: true,
              value: "R$ " + (parseFloat(formEdicaoPacote.valorSessao || 0) * parseInt(formEdicaoPacote.totalSessoes || 0) || 0).toFixed(2).replace(".", ","),
              style: {
                background: "#f9fafb",
                color: "var(--text-muted)"
              }
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Status do Pagamento"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 8
              },
              children: [["pendente", "Pendente", "#d97706"], ["recebido", "✓ Recebido", "#059669"]].map(([v, l, cor]) => /*#__PURE__*/_jsxDEV("button", {
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
                },
                children: l
              }, v, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Forma de Pagamento Principal"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formEdicaoPacote.formaPag || "",
              onChange: e => setFormEdicaoPacote({
                ...formEdicaoPacote,
                formaPag: e.target.value
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "",
                children: "Selecionar..."
              }, void 0, false), FORMAS.map(f => /*#__PURE__*/_jsxDEV("option", {
                children: f
              }, f, false))]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Data do Pagamento"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "date",
              value: formEdicaoPacote.dataPagamento || "",
              onChange: e => setFormEdicaoPacote({
                ...formEdicaoPacote,
                dataPagamento: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8
              },
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                style: {
                  margin: 0
                },
                children: "Formas de pagamento (PIX, cartão, dinheiro em datas diferentes)"
              }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
                }),
                children: "+ Adicionar forma"
              }, void 0, false)]
            }, void 0, true), (formEdicaoPacote.pagamentosExtras || []).length === 0 && /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)",
                fontStyle: "italic",
                padding: "6px 0"
              },
              children: "Clique em \"+ Adicionar forma\" para registrar pagamentos parciais ou múltiplas formas."
            }, void 0, false), (formEdicaoPacote.pagamentosExtras || []).map((pg, i) => /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: 6,
                marginBottom: 6,
                alignItems: "center"
              },
              children: [/*#__PURE__*/_jsxDEV("select", {
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
                },
                children: [/*#__PURE__*/_jsxDEV("option", {
                  value: "",
                  children: "Forma..."
                }, void 0, false), FORMAS.map(f => /*#__PURE__*/_jsxDEV("option", {
                  children: f
                }, f, false))]
              }, void 0, true), /*#__PURE__*/_jsxDEV("input", {
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
              }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
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
              }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
                },
                children: "✕"
              }, void 0, false)]
            }, i, true))]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Observações"
            }, void 0, false), /*#__PURE__*/_jsxDEV("textarea", {
              className: "form-input",
              rows: 2,
              value: formEdicaoPacote.obs || "",
              onChange: e => setFormEdicaoPacote({
                ...formEdicaoPacote,
                obs: e.target.value
              }),
              placeholder: "Notas sobre o pacote..."
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 20,
            flexWrap: "wrap"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModalEditarPacote(null),
            children: "Cancelar"
          }, void 0, false), (formEdicaoPacote.statusPag || "pendente") === "recebido" && (modalEditarPacote.statusPag || "pendente") !== "recebido" ? /*#__PURE__*/_jsxDEV(_Fragment, {
            children: [/*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                border: "1px solid #e5e7eb",
                color: "#6b7280",
                fontSize: 13
              },
              onClick: () => salvarEdicaoPacote(null),
              disabled: salvandoEdicao,
              title: "Salvar sem registrar comissão",
              children: salvandoEdicao ? "Salvando..." : "📋 Sem comissão"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              onClick: () => salvarEdicaoPacote("primeira"),
              disabled: salvandoEdicao,
              title: "10% de comissão",
              children: salvandoEdicao ? "Salvando..." : "✨ Primeira Venda"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              className: "btn",
              style: {
                background: "#0891b2",
                color: "white"
              },
              onClick: () => salvarEdicaoPacote("recorrente"),
              disabled: salvandoEdicao,
              title: "5% de comissão",
              children: salvandoEdicao ? "Salvando..." : "🔄 Venda Recorrente"
            }, void 0, false)]
          }, void 0, true) : /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: () => salvarEdicaoPacote(null),
            disabled: salvandoEdicao,
            children: salvandoEdicao ? "Salvando..." : "💾 Salvar alterações"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Financeiro da Clínica"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: "Lançamentos, pacotes e controle de sessões"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            color: "#dc2626",
            border: "1px solid #fca5a5",
            display: "flex",
            alignItems: "center",
            gap: 6
          },
          onClick: () => {
            setModalDespesa(true);
            setEditandoDespesa(null);
            setFormDespesa({
              descricao: "",
              categoria: "",
              valor: "",
              data: new Date().toISOString().slice(0, 10),
              formaPag: "PIX",
              status: "pago",
              obs: "",
              parcelas: "1"
            });
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "minus-circle",
            size: 16
          }, void 0, false), " Nova Despesa"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-purple",
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6
          },
          onClick: () => setModal("escolha"),
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "plus",
            size: 16
          }, void 0, false), " Novo Lançamento"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 14,
        alignItems: "center"
      },
      children: [/*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)",
          flexShrink: 0
        },
        children: "Ano:"
      }, void 0, false), (() => {
        const anoAtualNum = new Date().getFullYear();
        const anosExist = [...new Set(lancamentos.map(l => l.data?.slice(0, 4)).filter(Boolean))].map(Number);
        // Sempre mostra: todos os anos com dados + ano atual + 1 ano antes e depois do atual
        const anosSet = new Set([...anosExist, anoAtualNum - 1, anoAtualNum, anoAtualNum + 1]);
        // Se houver dados fora dessa janela, eles já estão incluídos via anosExist
        const anos = [...anosSet].sort().map(String);
        return anos.map(a => /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: [a, a === String(anoAtualNum) && /*#__PURE__*/_jsxDEV("span", {
            style: {
              marginLeft: 3,
              fontSize: 9
            },
            children: "●"
          }, void 0, false)]
        }, a, true));
      })()]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
        gap: 12,
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
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
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
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
          },
          children: periodoCard === "mes" ? "mês ↕" : "ano ↕"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 800,
            color: totalRecebidoPeriodo >= 0 ? "#059669" : "#dc2626"
          },
          children: totalRecebidoPeriodo.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          })
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: totalRecebidoPeriodo >= 0 ? "#059669" : "#dc2626",
            fontWeight: 500,
            marginTop: 2
          },
          children: ["Saldo (", periodoCard === "mes" ? mesAtualLabel : anoFiltro, ")"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 10,
            color: "#6b7280",
            marginTop: 4
          },
          children: ["+", calcReceitas(lancPeriodo).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          }), " / -", calcDespesas(lancPeriodo).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          })]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "#fef3c7",
          borderRadius: 12,
          padding: "14px 16px",
          textAlign: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 800,
            color: "#d97706"
          },
          children: totalPendente.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          })
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "#d97706",
            fontWeight: 500,
            marginTop: 2
          },
          children: ["Pendente (", anoFiltro, ")"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "var(--purple-soft)",
          borderRadius: 12,
          padding: "14px 16px",
          textAlign: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 800,
            color: "var(--purple)"
          },
          children: pacotes.filter(p => p.status === "ativo").length
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "var(--purple)",
            fontWeight: 500,
            marginTop: 2
          },
          children: "Pacotes ativos"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "#e0f2fe",
          borderRadius: 12,
          padding: "14px 16px",
          textAlign: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 800,
            color: "#0891b2"
          },
          children: lancPeriodo.length
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "#0891b2",
            fontWeight: 500,
            marginTop: 2
          },
          children: ["Lançamentos (", periodoCard === "mes" ? new Date(mesFiltro + "-15").toLocaleDateString("pt-BR", {
            month: "short"
          }) : anoFiltro, ")"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 0,
        marginBottom: 20,
        borderBottom: "1px solid var(--gray-200)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        flexShrink: 0
      },
      children: [[["lancamentos", "Lançamentos", "dollar-sign"], ["pacotes", "Pacotes & Sessões", "package"], ["acompanhamento", "Acompanhamento Geral", "users"], ["comissoes", "Comissões", "percent"]].map(([id, lbl, ic]) => /*#__PURE__*/_jsxDEV("button", {
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
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: ic,
          size: 15
        }, void 0, false), lbl]
      }, id, true)), (() => {
        return null;
      })()]
    }, void 0, true), aba === "lancamentos" && /*#__PURE__*/_jsxDEV("div", {
      children: [aba === "lancamentos" && /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 6,
          marginBottom: 16,
          background: "var(--gray-50)",
          padding: 6,
          borderRadius: 12,
          width: "fit-content"
        },
        children: [["tudo", "📊 Tudo"], ["receita", "💰 Receitas"], ["despesa", "💸 Despesas"]].map(([v, l]) => /*#__PURE__*/_jsxDEV("button", {
          onClick: () => setFiltroTipo(v),
          style: {
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 600,
            background: filtroTipo === v ? "white" : "transparent",
            color: filtroTipo === v ? v === "receita" ? "#059669" : v === "despesa" ? "#dc2626" : "#7B00C4" : "#6b7280",
            boxShadow: filtroTipo === v ? "0 1px 4px rgba(0,0,0,.1)" : "none",
            transition: ".15s"
          },
          children: l
        }, v, false))
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          marginBottom: 16,
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          style: {
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-muted)",
            flexShrink: 0
          },
          children: "Mês:"
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: "‹"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 6,
            overflowX: "hidden",
            flex: 1
          },
          children: mesesDisp.map(m => {
            const isAtual = m === mesAtual;
            const isSel = m === mesFiltroEfetivo;
            return /*#__PURE__*/_jsxDEV("button", {
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
              },
              children: [new Date(m + "-15").toLocaleDateString("pt-BR", {
                month: "long"
              }), isAtual && !isSel && /*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontSize: 9
                },
                children: "●"
              }, void 0, false)]
            }, m, true);
          })
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: "›"
        }, void 0, false)]
      }, void 0, true), lancMes.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          textAlign: "center",
          padding: 48,
          color: "var(--text-muted)"
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "dollar-sign",
          size: 40
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            marginTop: 12
          },
          children: ["Nenhum lançamento em ", new Date(mesFiltro + "-15").toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
          })]
        }, void 0, true)]
      }, void 0, true) : (() => {
        const receitasTodas = lancMes.filter(l => l.tipo_lancamento !== "despesa").sort((a, b) => (b.data || "").localeCompare(a.data || ""));
        const despesasTodas = lancMes.filter(l => l.tipo_lancamento === "despesa").sort((a, b) => (b.data || "").localeCompare(a.data || ""));
        const receitas = filtroTipo === "despesa" ? [] : receitasTodas;
        const despesas = filtroTipo === "receita" ? [] : despesasTodas;
        const totalRecFiltro = receitasTodas.reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
        const totalDespFiltro = despesasTodas.reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
        const totalRec = calcReceitas(lancMes);
        const totalDesp = calcDespesas(lancMes);
        const saldo = totalRec - totalDesp;

        // Cards de saldo dinâmicos por filtroTipo
        const cardsSaldo = filtroTipo === "tudo" ? /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 16
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              background: "white",
              borderRadius: 12,
              padding: "14px 18px",
              border: "1px solid #e5e7eb"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: "#6b7280",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: 4
              },
              children: "Total Receitas"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 20,
                fontWeight: 800,
                color: "#059669"
              },
              children: totalRecFiltro.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              background: "white",
              borderRadius: 12,
              padding: "14px 18px",
              border: "1px solid #e5e7eb"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: "#6b7280",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: 4
              },
              children: "Total Despesas"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 20,
                fontWeight: 800,
                color: "#dc2626"
              },
              children: totalDespFiltro.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              background: "#f5f0ff",
              borderRadius: 12,
              padding: "14px 18px",
              border: "2px solid #7B00C4"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: "#7B00C4",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: 4
              },
              children: "Saldo Líquido"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 20,
                fontWeight: 800,
                color: totalRecFiltro - totalDespFiltro >= 0 ? "#7B00C4" : "#dc2626"
              },
              children: (totalRecFiltro - totalDespFiltro).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true) : filtroTipo === "receita" ? /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "#f0fdf4",
            borderRadius: 12,
            padding: "14px 18px",
            border: "1px solid #6ee7b7",
            marginBottom: 16
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 11,
              color: "#15803d",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 4
            },
            children: "Total Receitas do Mês"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 24,
              fontWeight: 800,
              color: "#059669"
            },
            children: totalRecFiltro.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })
          }, void 0, false)]
        }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "#fef2f2",
            borderRadius: 12,
            padding: "14px 18px",
            border: "1px solid #fca5a5",
            marginBottom: 16
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 11,
              color: "#b91c1c",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 4
            },
            children: "Total Despesas do Mês"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 24,
              fontWeight: 800,
              color: "#dc2626"
            },
            children: totalDespFiltro.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })
          }, void 0, false)]
        }, void 0, true);
        function TabelaLanc({
          itens,
          titulo,
          corHeader,
          corValor,
          bgHeader
        }) {
          if (!itens.length) return null;
          return /*#__PURE__*/_jsxDEV("div", {
            className: "card",
            style: {
              padding: 0,
              marginBottom: 16
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                padding: "10px 16px",
                background: bgHeader,
                borderBottom: "2px solid " + corHeader,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              },
              children: [/*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontWeight: 700,
                  fontSize: 14,
                  color: corHeader
                },
                children: titulo
              }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontWeight: 800,
                  fontSize: 14,
                  color: corHeader
                },
                children: itens.reduce((a, l) => a + (parseFloat(l.valor) || 0), 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("table", {
              style: {
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13
              },
              children: [/*#__PURE__*/_jsxDEV("thead", {
                children: /*#__PURE__*/_jsxDEV("tr", {
                  style: {
                    background: "var(--gray-50)"
                  },
                  children: ["Data", "Descrição", "Categoria", "Forma Pag.", "Valor", "Status", "Ações"].map(h => /*#__PURE__*/_jsxDEV("th", {
                    style: {
                      padding: "8px 14px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--gray-200)",
                      whiteSpace: "nowrap"
                    },
                    children: h
                  }, h, false))
                }, void 0, false)
              }, void 0, false), /*#__PURE__*/_jsxDEV("tbody", {
                children: itens.map(l => {
                  const isFut = l.data > new Date().toISOString().slice(0, 10);
                  const statusColor = l.status === "recebido" || l.status === "pago" ? "#059669" : l.status === "planejado" ? "#0891b2" : "#d97706";
                  const statusBg = l.status === "recebido" || l.status === "pago" ? "#d1fae5" : l.status === "planejado" ? "#e0f2fe" : "#fef3c7";
                  const statusLabel = l.status === "recebido" ? "✓ Recebido" : l.status === "pago" ? "✓ Pago" : l.status === "planejado" ? "📅 Planejado" : "Pendente";
                  return /*#__PURE__*/_jsxDEV("tr", {
                    style: {
                      borderBottom: "1px solid var(--gray-100)",
                      background: isFut ? "#fafafa" : "white",
                      opacity: isFut ? 0.85 : 1
                    },
                    children: [/*#__PURE__*/_jsxDEV("td", {
                      style: {
                        padding: "8px 14px",
                        whiteSpace: "nowrap",
                        fontSize: 12
                      },
                      children: [l.data ? new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR") : "—", isFut && /*#__PURE__*/_jsxDEV("span", {
                        style: {
                          marginLeft: 4,
                          fontSize: 9,
                          color: "#0891b2",
                          fontWeight: 600
                        },
                        children: "futuro"
                      }, void 0, false)]
                    }, void 0, true), /*#__PURE__*/_jsxDEV("td", {
                      style: {
                        padding: "8px 14px",
                        maxWidth: 320
                      },
                      children: [/*#__PURE__*/_jsxDEV("div", {
                        style: {
                          fontWeight: 500,
                          fontSize: 13,
                          lineHeight: 1.4
                        },
                        children: l.descricao || l.tipo || l.pacienteNome || "—"
                      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                        style: {
                          display: "flex",
                          gap: 4,
                          marginTop: 3,
                          flexWrap: "wrap"
                        },
                        children: [l.tipo_lancamento === "pacote" && /*#__PURE__*/_jsxDEV("span", {
                          style: {
                            background: "var(--purple-soft)",
                            color: "var(--purple)",
                            borderRadius: 20,
                            padding: "1px 6px",
                            fontSize: 10,
                            fontWeight: 600
                          },
                          children: "Pacote"
                        }, void 0, false), l.tipo_lancamento === "sessao" && /*#__PURE__*/_jsxDEV("span", {
                          style: {
                            background: "#e0f2fe",
                            color: "#0891b2",
                            borderRadius: 20,
                            padding: "1px 6px",
                            fontSize: 10,
                            fontWeight: 600
                          },
                          children: "Sessão"
                        }, void 0, false), (l.pagamentosExtras || []).length > 0 && /*#__PURE__*/_jsxDEV("span", {
                          style: {
                            background: "#fef3c7",
                            color: "#92400e",
                            borderRadius: 20,
                            padding: "1px 6px",
                            fontSize: 10,
                            fontWeight: 600
                          },
                          children: ["💳 ", (l.pagamentosExtras || []).length, "x forma", (l.pagamentosExtras || []).length > 1 ? "s" : ""]
                        }, void 0, true)]
                      }, void 0, true)]
                    }, void 0, true), /*#__PURE__*/_jsxDEV("td", {
                      style: {
                        padding: "8px 14px",
                        fontSize: 12,
                        color: "var(--text-muted)"
                      },
                      children: l.categoria || "—"
                    }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                      style: {
                        padding: "8px 14px"
                      },
                      children: /*#__PURE__*/_jsxDEV("span", {
                        style: {
                          background: "#f3f4f6",
                          borderRadius: 6,
                          padding: "2px 6px",
                          fontSize: 11
                        },
                        children: l.formaPag || "—"
                      }, void 0, false)
                    }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                      style: {
                        padding: "8px 14px",
                        fontWeight: 700,
                        color: corValor,
                        whiteSpace: "nowrap"
                      },
                      children: (parseFloat(l.valor) || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      })
                    }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                      style: {
                        padding: "8px 14px"
                      },
                      children: /*#__PURE__*/_jsxDEV("span", {
                        style: {
                          background: statusBg,
                          color: statusColor,
                          borderRadius: 20,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 600
                        },
                        children: statusLabel
                      }, void 0, false)
                    }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                      style: {
                        padding: "8px 14px"
                      },
                      children: /*#__PURE__*/_jsxDEV("div", {
                        style: {
                          display: "flex",
                          gap: 4
                        },
                        children: [l.tipo_lancamento === "pacote" ? /*#__PURE__*/_jsxDEV("button", {
                          className: "btn btn-ghost",
                          style: {
                            padding: "4px 8px",
                            fontSize: 11,
                            color: "var(--purple)"
                          },
                          onClick: () => {
                            setPacoteSelecionado(l.pacoteId);
                            setAba("pacotes");
                          },
                          children: /*#__PURE__*/_jsxDEV(Icon, {
                            name: "clipboard-list",
                            size: 12
                          }, void 0, false)
                        }, void 0, false) : /*#__PURE__*/_jsxDEV("button", {
                          className: "btn btn-ghost",
                          style: {
                            padding: "4px 8px",
                            fontSize: 11,
                            color: "var(--purple)"
                          },
                          onClick: () => abrirEditar(l),
                          children: /*#__PURE__*/_jsxDEV(Icon, {
                            name: "pencil",
                            size: 12
                          }, void 0, false)
                        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                          className: "btn btn-ghost",
                          style: {
                            padding: "4px 8px",
                            fontSize: 11,
                            color: "#dc2626"
                          },
                          onClick: () => setModalExcluirLanc(l),
                          children: /*#__PURE__*/_jsxDEV(Icon, {
                            name: "trash-2",
                            size: 12
                          }, void 0, false)
                        }, void 0, false)]
                      }, void 0, true)
                    }, void 0, false)]
                  }, l.id, true);
                })
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true);
        }
        return /*#__PURE__*/_jsxDEV("div", {
          children: [cardsSaldo, /*#__PURE__*/_jsxDEV(TabelaLanc, {
            itens: receitas,
            titulo: "💰 Receitas",
            corHeader: "#059669",
            corValor: "#059669",
            bgHeader: "#f0fdf4"
          }, void 0, false), /*#__PURE__*/_jsxDEV(TabelaLanc, {
            itens: despesas,
            titulo: "💸 Despesas",
            corHeader: "#dc2626",
            corValor: "#dc2626",
            bgHeader: "#fff1f2"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              background: "white",
              borderRadius: 12,
              border: "1px solid var(--gray-200)",
              padding: "14px 20px",
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              alignItems: "center"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                textAlign: "center"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 2
                },
                children: "Receitas"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#059669"
                },
                children: totalRec.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 20,
                color: "var(--text-muted)"
              },
              children: "−"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                textAlign: "center"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 2
                },
                children: "Despesas"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#dc2626"
                },
                children: totalDesp.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 20,
                color: "var(--text-muted)"
              },
              children: "="
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                textAlign: "center"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 2
                },
                children: "Saldo do Mês"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 22,
                  fontWeight: 900,
                  color: saldo >= 0 ? "#059669" : "#dc2626"
                },
                children: saldo.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true);
      })(), modalExcluirLanc && /*#__PURE__*/_jsxDEV("div", {
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
        children: /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "white",
            borderRadius: 16,
            padding: 28,
            width: "100%",
            maxWidth: 420,
            textAlign: "center"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 32,
              marginBottom: 12
            },
            children: "🗑️"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 600,
              marginBottom: 6
            },
            children: modalExcluirLanc.tipo
          }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
            style: {
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 20
            },
            children: modalExcluirLanc.data ? new Date(modalExcluirLanc.data + "T00:00:00").toLocaleDateString("pt-BR") : ""
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 14
            },
            children: [/*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                border: "1.5px solid #e5e7eb",
                textAlign: "left",
                padding: "12px 16px"
              },
              onClick: async () => {
                await db.collection("clinica_lancamentos").doc(modalExcluirLanc.id).delete();
                setModalExcluirLanc(null);
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 600,
                  fontSize: 13
                },
                children: "Só este lançamento"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#6b7280"
                },
                children: ["Remove apenas ", new Date(modalExcluirLanc.data + "T00:00:00").toLocaleDateString("pt-BR", {
                  month: "long"
                })]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                border: "1.5px solid #fbbf24",
                textAlign: "left",
                padding: "12px 16px"
              },
              onClick: async () => {
                if (!modalExcluirLanc.pacoteId) {
                  alert("Este lançamento não tem pacote vinculado — use 'Só este lançamento'.");
                  return;
                }
                if (!confirm("Excluir este e todos os lançamentos futuros deste pacote?")) return;
                const snap = await db.collection("clinica_lancamentos").get();
                const futuros = snap.docs.filter(d => {
                  const dd = d.data();
                  return dd.pacoteId === modalExcluirLanc.pacoteId && dd.data >= modalExcluirLanc.data;
                });
                const b = db.batch();
                futuros.forEach(d => b.delete(d.ref));
                await b.commit();
                setModalExcluirLanc(null);
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#d97706"
                },
                children: "Este e todos os futuros"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#6b7280"
                },
                children: ["Remove lançamentos deste pacote a partir de ", new Date(modalExcluirLanc.data + "T00:00:00").toLocaleDateString("pt-BR", {
                  month: "long"
                })]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                border: "1.5px solid #fca5a5",
                textAlign: "left",
                padding: "12px 16px"
              },
              onClick: async () => {
                if (!modalExcluirLanc.pacoteId) {
                  alert("Este lançamento não tem pacote vinculado — use 'Só este lançamento'.");
                  return;
                }
                if (!confirm("Excluir TODOS os lançamentos deste pacote no ano inteiro?")) return;
                const snap = await db.collection("clinica_lancamentos").get();
                const todos = snap.docs.filter(d => d.data().pacoteId === modalExcluirLanc.pacoteId);
                const b = db.batch();
                todos.forEach(d => b.delete(d.ref));
                await b.commit();
                setModalExcluirLanc(null);
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#dc2626"
                },
                children: "Todos — o ano inteiro"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#6b7280"
                },
                children: "Remove todos os lançamentos deste pacote"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              width: "100%"
            },
            onClick: () => setModalExcluirLanc(null),
            children: "Cancelar"
          }, void 0, false)]
        }, void 0, true)
      }, void 0, false)]
    }, void 0, true), aba === "pacotes" && /*#__PURE__*/_jsxDEV("div", {
      children: [(() => {
        const hoje = new Date().toISOString().slice(0, 10);
        // Sessões pendentes = data PASSADA + status "agendado" + vinculada a pacote ativo
        // Exclui: falta, realizado, cancelado, remarcado, futuras, sessões sem pacote
        const pacoteIdsAtivos = new Set(pacotes.filter(p => p.status !== "inativo").map(p => p.id));
        const sessoesPendentes = sessoes.filter(s => s.data < hoje && s.status === "agendado" && s.pacienteId && s.pacoteId && pacoteIdsAtivos.has(s.pacoteId));
        // Pacotes com pagamento pendente (não 100% pago)
        const pacotesPendPag = pacotes.filter(p => {
          const sessPac = sessoes.filter(s => s.pacoteId === p.id);
          const pagas = sessPac.filter(s => s.pagamento === "pago").length;
          return p.status !== "inativo" && pagas < (p.totalSessoes || 0);
        });
        if (sessoesPendentes.length === 0 && pacotesPendPag.length === 0) return null;
        return /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 20
          },
          children: [sessoesPendentes.length > 0 && (() => {
            function AvisoSessoes({
              lista,
              pacientes
            }) {
              const [expandido, setExpandido] = React.useState(false);
              const visiveis = expandido ? lista : lista.slice(0, 5);
              const extras = lista.length - 5;
              return /*#__PURE__*/_jsxDEV("div", {
                style: {
                  background: "#fef3c7",
                  border: "1px solid #f59e0b",
                  borderRadius: 12,
                  padding: "14px 18px"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#92400e",
                    marginBottom: 4
                  },
                  children: ["⚠️ ", lista.length, " sessão(ões) passada(s) sem status final"]
                }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: "#78350f",
                    marginBottom: 8
                  },
                  children: ["Sessões que já ocorreram e ainda estão como \"Agendado\". Marque como ", /*#__PURE__*/_jsxDEV("strong", {
                    children: "Realizada"
                  }, void 0, false), ", ", /*#__PURE__*/_jsxDEV("strong", {
                    children: "Cancelada"
                  }, void 0, false), " ou ", /*#__PURE__*/_jsxDEV("strong", {
                    children: "Remarcada"
                  }, void 0, false), "."]
                }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    alignItems: "center"
                  },
                  children: [visiveis.map(s => {
                    const nome = pacientes.find(p => p.id === s.pacienteId)?.nome || "—";
                    return /*#__PURE__*/_jsxDEV("span", {
                      style: {
                        background: "#fde68a",
                        borderRadius: 20,
                        padding: "2px 10px",
                        fontSize: 11,
                        color: "#78350f",
                        fontWeight: 600
                      },
                      children: [nome.split(" ")[0], " · ", new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short"
                      })]
                    }, s.id, true);
                  }), !expandido && extras > 0 && /*#__PURE__*/_jsxDEV("button", {
                    onClick: () => setExpandido(true),
                    style: {
                      background: "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: 20,
                      padding: "2px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)"
                    },
                    children: ["+", extras, " mais ▾"]
                  }, void 0, true), expandido && /*#__PURE__*/_jsxDEV("button", {
                    onClick: () => setExpandido(false),
                    style: {
                      background: "none",
                      color: "#92400e",
                      border: "1px solid #f59e0b",
                      borderRadius: 20,
                      padding: "2px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)"
                    },
                    children: "▴ recolher"
                  }, void 0, false)]
                }, void 0, true)]
              }, void 0, true);
            }
            return /*#__PURE__*/_jsxDEV(AvisoSessoes, {
              lista: sessoesPendentes,
              pacientes: pacientes
            }, void 0, false);
          })(), pacotesPendPag.length > 0 && (() => {
            function AvisoPacotes({
              lista,
              pacientes,
              sessoes
            }) {
              const [expandidoPac, setExpandidoPac] = React.useState(false);
              const visiveis = expandidoPac ? lista : lista.slice(0, 5);
              const extras = lista.length - 5;
              return /*#__PURE__*/_jsxDEV("div", {
                style: {
                  background: "#fff7ed",
                  border: "1px solid #fb923c",
                  borderRadius: 12,
                  padding: "14px 18px"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#c2410c",
                    marginBottom: 4
                  },
                  children: ["💰 ", lista.length, " pacote(s) com pagamento em aberto"]
                }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: "#9a3412",
                    marginBottom: 8
                  },
                  children: "Pacotes ativos com sessões ainda não marcadas como pagas."
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    alignItems: "center"
                  },
                  children: [visiveis.map(p => {
                    const nome = pacientes.find(pac => pac.id === p.pacienteId)?.nome || "—";
                    const sessPac = sessoes.filter(s => s.pacoteId === p.id);
                    const pagas = sessPac.filter(s => s.pagamento === "pago").length;
                    const total = p.totalSessoes || 0;
                    return /*#__PURE__*/_jsxDEV("span", {
                      style: {
                        background: "#fed7aa",
                        borderRadius: 20,
                        padding: "2px 10px",
                        fontSize: 11,
                        color: "#9a3412",
                        fontWeight: 600
                      },
                      children: [nome.split(" ")[0], " · ", pagas, "/", total, " pagas"]
                    }, p.id, true);
                  }), !expandidoPac && pacotesPendPag.length > 5 && /*#__PURE__*/_jsxDEV("button", {
                    onClick: () => setExpandidoPac(true),
                    style: {
                      background: "#ea580c",
                      color: "white",
                      border: "none",
                      borderRadius: 20,
                      padding: "2px 12px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)"
                    },
                    children: ["+", pacotesPendPag.length - 5, " mais ▾"]
                  }, void 0, true), expandidoPac && /*#__PURE__*/_jsxDEV("button", {
                    onClick: () => setExpandidoPac(false),
                    style: {
                      background: "none",
                      color: "#c2410c",
                      border: "1px solid #fb923c",
                      borderRadius: 20,
                      padding: "2px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)"
                    },
                    children: "▴ recolher"
                  }, void 0, false)]
                }, void 0, true)]
              }, void 0, true);
            }
            return /*#__PURE__*/_jsxDEV(AvisoPacotes, {
              lista: pacotesPendPag,
              pacientes: pacientes,
              sessoes: sessoes
            }, void 0, false);
          })()]
        }, void 0, true);
      })(), pacotes.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          textAlign: "center",
          padding: 60
        },
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "package",
          size: 48
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            marginTop: 12,
            fontWeight: 500
          },
          children: "Nenhum pacote criado ainda"
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-purple",
          style: {
            marginTop: 16
          },
          onClick: () => setModal("pacote"),
          children: "+ Criar Pacote"
        }, void 0, false)]
      }, void 0, true) : (() => {
        // Agrupar pacotes por paciente — ordem alfabética
        const pacientesComPacote = [...new Set(pacotes.map(p => p.pacienteId))];
        const pacientesVisiveisBruto = buscaPac.trim() ? pacientesComPacote.filter(id => {
          const pac = pacientes.find(p => p.id === id);
          const inicial = (pac?.nome || "?")[0].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
          return inicial === buscaPac;
        }) : pacientesComPacote;
        const pacientesVisiveis = pacientesVisiveisBruto.sort((a, b) => {
          const nA = (pacientes.find(p => p.id === a)?.nome || "").toLowerCase();
          const nB = (pacientes.find(p => p.id === b)?.nome || "").toLowerCase();
          return nA.localeCompare(nB, "pt-BR");
        });
        return /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 28
          },
          children: [(() => {
            const letrasComPac = [...new Set(pacientesComPacote.map(id => {
              const pac = pacientes.find(p => p.id === id);
              return (pac?.nome || "?")[0].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
            }))].sort();
            return /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                marginBottom: 12
              },
              children: [buscaPac && /*#__PURE__*/_jsxDEV("button", {
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
                },
                children: "Todos"
              }, void 0, false), letrasComPac.map(letra => /*#__PURE__*/_jsxDEV("button", {
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
                },
                children: letra
              }, letra, false))]
            }, void 0, true);
          })(), pacientesVisiveis.map(pacId => {
            const pac = pacientes.find(p => p.id === pacId);
            const pacotesDoPac = pacotes.filter(p => p.pacienteId === pacId).sort((a, b) => {
              const da = a.dataInicio || a.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || "";
              const db2 = b.dataInicio || b.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10) || "";
              return db2.localeCompare(da);
            });
            return /*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                  paddingBottom: 10,
                  borderBottom: "2px solid var(--purple-soft)"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
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
                  },
                  children: (pac?.nome || "?")[0].toUpperCase()
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  children: [/*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontWeight: 700,
                      fontSize: 16
                    },
                    children: pac?.nome || pacotesDoPac[0]?.pacienteNome || "—"
                  }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontSize: 12,
                      color: "var(--text-muted)"
                    },
                    children: [pacotesDoPac.length, " pacote(s)"]
                  }, void 0, true)]
                }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                  className: "btn btn-outline",
                  style: {
                    marginLeft: "auto",
                    fontSize: 12
                  },
                  onClick: () => setPacoteSelecionado(pacId),
                  children: [/*#__PURE__*/_jsxDEV(Icon, {
                    name: "bar-chart-2",
                    size: 13
                  }, void 0, false), " Acompanhamento"]
                }, void 0, true)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 10
                },
                children: pacotesDoPac.map(p => {
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
                  return /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      borderRadius: 12,
                      border: "1px solid #e8c8ff",
                      background: "white",
                      padding: "14px 16px",
                      marginBottom: 10,
                      boxShadow: "0 1px 3px #0001"
                    },
                    children: [/*#__PURE__*/_jsxDEV("div", {
                      style: {
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 10
                      },
                      children: [/*#__PURE__*/_jsxDEV("div", {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        },
                        children: [/*#__PURE__*/_jsxDEV("div", {
                          style: {
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: isPago ? "#22c55e" : "#f59e0b",
                            flexShrink: 0,
                            marginTop: 2
                          }
                        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                          children: [/*#__PURE__*/_jsxDEV("div", {
                            style: {
                              fontWeight: 700,
                              fontSize: 14,
                              color: "#3d006a"
                            },
                            children: p.obs || p.recorrencia || "Pacote"
                          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                            style: {
                              fontSize: 11,
                              color: "var(--text-muted)",
                              marginTop: 1
                            },
                            children: [p.recorrencia, p.horario && /*#__PURE__*/_jsxDEV("span", {
                              children: [" · 🕐 ", p.horario]
                            }, void 0, true), " · ", dataStr]
                          }, void 0, true)]
                        }, void 0, true)]
                      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                        style: {
                          textAlign: "right"
                        },
                        children: [/*#__PURE__*/_jsxDEV("div", {
                          style: {
                            fontWeight: 800,
                            fontSize: 16,
                            color: isPago ? "#22c55e" : "#f59e0b"
                          },
                          children: (p.valorTotal || 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          })
                        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                          style: {
                            fontSize: 11,
                            color: isPago ? "#22c55e" : "#f59e0b",
                            fontWeight: 600
                          },
                          children: [isPago ? "✓ Recebido" : "⏳ Pendente", p.formaPag && /*#__PURE__*/_jsxDEV("span", {
                            style: {
                              fontWeight: 400,
                              color: "var(--text-muted)"
                            },
                            children: [" · ", p.formaPag]
                          }, void 0, true)]
                        }, void 0, true)]
                      }, void 0, true)]
                    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        marginBottom: 10
                      },
                      children: [/*#__PURE__*/_jsxDEV("div", {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginBottom: 4
                        },
                        children: [/*#__PURE__*/_jsxDEV("span", {
                          children: [realizadas, " realizadas de ", p.totalSessoes, " · ", pagas, " pagas"]
                        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
                          style: {
                            fontWeight: 600,
                            color: "var(--purple)"
                          },
                          children: [pct, "%"]
                        }, void 0, true)]
                      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                        style: {
                          height: 6,
                          background: "#e8c8ff",
                          borderRadius: 10,
                          overflow: "hidden"
                        },
                        children: /*#__PURE__*/_jsxDEV("div", {
                          style: {
                            width: pct + "%",
                            height: "100%",
                            background: "#7B00C4",
                            borderRadius: 10,
                            transition: "width .4s"
                          }
                        }, void 0, false)
                      }, void 0, false)]
                    }, void 0, true), (p.pagamentosExtras || []).length > 0 && /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        marginBottom: 10,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap"
                      },
                      children: (p.pagamentosExtras || []).map((pg, i) => /*#__PURE__*/_jsxDEV("span", {
                        style: {
                          background: "#f3e6ff",
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontSize: 11,
                          color: "#6b7280"
                        },
                        children: ["💳 ", pg.forma || "?", " R$", parseFloat(pg.valor || 0).toFixed(2).replace(".", ","), " · ", pg.data ? new Date(pg.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"]
                      }, i, true))
                    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap"
                      },
                      children: [/*#__PURE__*/_jsxDEV("button", {
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
                        },
                        children: [/*#__PURE__*/_jsxDEV(Icon, {
                          name: "edit-3",
                          size: 13
                        }, void 0, false), " Editar"]
                      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                        className: "btn btn-purple",
                        style: {
                          fontSize: 12,
                          padding: "6px 12px"
                        },
                        onClick: e => {
                          e.stopPropagation();
                          setPacoteSelecionado(p.id + "__sessoes");
                        },
                        children: [/*#__PURE__*/_jsxDEV(Icon, {
                          name: "clipboard-list",
                          size: 13
                        }, void 0, false), " Sessões"]
                      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                        className: "btn btn-ghost",
                        style: {
                          fontSize: 12,
                          padding: "6px 12px",
                          color: "#059669",
                          border: "1px solid #6ee7b7"
                        },
                        onClick: e => {
                          e.stopPropagation();
                          const pac = pacientes.find(x => x.id === pacId);
                          const sessPac = sessoes.filter(s => s.pacoteId === p.id).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
                          const statusLabel = {
                            agendado: "Agendado",
                            confirmado: "Confirmado",
                            realizado: "✓ Realizado",
                            cancelado: "Cancelado",
                            falta: "Falta"
                          };
                          const statusColor = {
                            agendado: "#7B00C4",
                            confirmado: "#059669",
                            realizado: "#0891b2",
                            cancelado: "#dc2626",
                            falta: "#d97706"
                          };
                          const totalValor = sessPac.reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0);
                          const totalPago = sessPac.reduce((a, s) => a + (parseFloat(s.valorPago) || 0), 0);
                          const sessMeses = {};
                          sessPac.forEach(s => {
                            const m = (s.data || "").slice(0, 7);
                            if (!sessMeses[m]) sessMeses[m] = [];
                            sessMeses[m].push(s);
                          });
                          const fmtM = m => {
                            const [y, mo] = m.split("-");
                            return new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", {
                              month: "long",
                              year: "numeric"
                            });
                          };
                          const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Resumo — ${pac?.nome || ""}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;padding:32px;max-width:680px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:3px solid #7B00C4;margin-bottom:22px}
.logo{font-family:Georgia,serif;font-size:24px;color:#7B00C4;font-weight:700}.sub{font-size:10px;color:#6b7280;margin-top:3px}
.box{background:#f5f0ff;border-radius:12px;padding:14px 18px;margin-bottom:20px;border-left:5px solid #7B00C4}
.nome{font-size:20px;font-weight:700;margin-bottom:8px}.meta{display:flex;gap:20px;flex-wrap:wrap}
.mi label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;display:block;margin-bottom:1px}.mi span{font-size:13px;font-weight:600}
.mes{font-size:13px;font-weight:700;color:#7B00C4;padding:7px 0;border-bottom:1px solid #e5e7eb;margin:18px 0 8px}
table{width:100%;border-collapse:collapse;font-size:12px}th{background:#7B00C4;color:white;padding:6px 10px;text-align:left;font-size:11px}
td{padding:6px 10px;border-bottom:1px solid #f3f4f6}tr:nth-child(even) td{background:#fafafa}
.badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;color:white;display:inline-block}
.totais{margin-top:20px;background:#f9fafb;border-radius:10px;padding:12px 18px;display:flex;gap:24px;flex-wrap:wrap}
.ti label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;display:block}.ti span{font-size:17px;font-weight:800}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
@media print{body{padding:16px}@page{margin:1.5cm}}</style></head><body>
<div class="header"><div><div class="logo">Dra. Lucia Kratz</div><div class="sub">CRP 09/20590 · Psicóloga · TCC · Musicoterapeuta · Neuromodulação · Goiânia, GO</div></div>
<div style="font-size:11px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                          })}</div></div>
<div class="box"><div class="nome">${pac?.nome || "—"}</div>
<div class="meta">
<div class="mi"><label>Início</label><span>${p.dataInicio ? new Date(p.dataInicio + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</span></div>
<div class="mi"><label>Horário</label><span>${p.horario || "—"}</span></div>
<div class="mi"><label>Recorrência</label><span>${p.recorrencia || "—"}</span></div>
<div class="mi"><label>Sessões</label><span>${sessPac.length}</span></div>
</div></div>
${Object.entries(sessMeses).sort(([a], [b]) => a.localeCompare(b)).map(([mes, sess]) => `
<div class="mes">${fmtM(mes).charAt(0).toUpperCase() + fmtM(mes).slice(1)} — ${sess.length} sessão(ões)</div>
<table><thead><tr><th>Nº</th><th>Data</th><th>Horário</th><th>Tipo</th><th>Presença</th><th>Valor</th></tr></thead>
<tbody>${sess.map((s, i) => `<tr><td style="font-weight:700;color:#7B00C4">${s.numSessao || i + 1}</td>
<td>${s.data ? new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit"
                          }) : ""}</td>
<td>${s.hora || "—"}</td><td>${s.tipo || "Psicoterapia"}</td>
<td><span class="badge" style="background:${statusColor[s.status] || "#7B00C4"}">${statusLabel[s.status] || s.status || "—"}</span></td>
<td>R$ ${(parseFloat(s.valorSessao) || 0).toFixed(2).replace(".", ",")}</td></tr>`).join("")}
</tbody></table>`).join("")}
<div class="totais">
<div class="ti"><label>Total do pacote</label><span>R$ ${totalValor.toFixed(2).replace(".", ",")}</span></div>
<div class="ti"><label>Recebido</label><span style="color:#059669">R$ ${totalPago.toFixed(2).replace(".", ",")}</span></div>
<div class="ti"><label>A receber</label><span style="color:#d97706">R$ ${(totalValor - totalPago).toFixed(2).replace(".", ",")}</span></div>
</div>
${p.dataPagamento || p.dataRecebimento ? `<div style="margin-top:14px;background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:12px 18px;display:flex;align-items:center;gap:12px"><span style="font-size:18px">✅</span><div><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#065f46;letter-spacing:.5px">Data de Pagamento</div><div style="font-size:16px;font-weight:800;color:#059669">${new Date((p.dataPagamento || p.dataRecebimento) + "T00:00:00").toLocaleDateString("pt-BR", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                          })}</div></div></div>` : ""}
${sessPac.some(s => s.dataPagamento || s.dataRecebimento) ? `<div style="margin-top:10px;font-size:11px;color:#6b7280;font-weight:600">Pagamentos por sessão:</div><table style="margin-top:4px;font-size:11px"><tbody>${sessPac.filter(s => s.dataPagamento || s.dataRecebimento).map(s => `<tr><td style="padding:3px 10px 3px 0;color:#374151">Sessão ${s.numSessao || ""} — ${s.data ? new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR") : ""}:</td><td style="color:#059669;font-weight:700">pago em ${new Date((s.dataPagamento || s.dataRecebimento) + "T00:00:00").toLocaleDateString("pt-BR")}</td></tr>`).join("")}</tbody></table>` : ""}
<div class="footer">Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
                          const w = window.open("", "_blank");
                          w.document.write(html);
                          w.document.close();
                          setTimeout(() => w.print(), 800);
                        },
                        children: [/*#__PURE__*/_jsxDEV(Icon, {
                          name: "file-text",
                          size: 13
                        }, void 0, false), " PDF"]
                      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
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
                        },
                        children: [/*#__PURE__*/_jsxDEV(Icon, {
                          name: "trash-2",
                          size: 13
                        }, void 0, false), " Excluir"]
                      }, void 0, true)]
                    }, void 0, true)]
                  }, p.id, true);
                })
              }, void 0, false)]
            }, pacId, true);
          })]
        }, void 0, true);
      })()]
    }, void 0, true), aba === "acompanhamento" && /*#__PURE__*/_jsxDEV("div", {
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 16
        },
        children: "Clique em um paciente para abrir o Controle de Sessões e Frequência completo."
      }, void 0, false), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(pac => {
        const sessPac = sessoes.filter(s => s.pacienteId === pac.id);
        const pacotesPac = pacotes.filter(p => p.pacienteId === pac.id);
        if (pacotesPac.length === 0) return null;
        const totalSessoes = sessPac.length;
        // "Remarcado" conta como sessão válida para fins de progresso e fluxo financeiro
        const realizadas = sessPac.filter(s => s.status === "realizado" || s.status === "remarcado").length;
        const pagas = sessPac.filter(s => s.pagamento === "pago").length;
        // Pendentes: exclui canceladas E remarcadas (remarcado já retém valor pago)
        const pendentes = sessPac.filter(s => s.pagamento !== "pago" && s.status !== "cancelado" && s.status !== "remarcado").length;
        const recebido = sessPac.filter(s => s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
        // A receber: exclui canceladas E remarcadas do fluxo de cobrança pendente
        const aReceber = sessPac.filter(s => s.pagamento !== "pago" && s.status !== "cancelado" && s.status !== "remarcado").reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0);
        return /*#__PURE__*/_jsxDEV("div", {
          className: "card",
          style: {
            padding: "14px 20px",
            cursor: "pointer",
            marginBottom: 10,
            transition: "box-shadow .15s"
          },
          onClick: () => setPacoteSelecionado(pac.id),
          onMouseEnter: e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(123,0,196,0.12)",
          onMouseLeave: e => e.currentTarget.style.boxShadow = "",
          children: /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
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
              },
              children: (pac.nome || "?")[0].toUpperCase()
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                flex: 1
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14
                },
                children: pac.nome
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2
                },
                children: [pacotesPac[0]?.recorrencia, " · ", pacotesPac[0]?.horario]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 16,
                alignItems: "center",
                flexWrap: "wrap"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  textAlign: "center"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--purple)"
                  },
                  children: [realizadas, "/", totalSessoes]
                }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 10,
                    color: "var(--text-muted)"
                  },
                  children: "Sessões"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  textAlign: "center"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#059669"
                  },
                  children: recebido.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  })
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 10,
                    color: "var(--text-muted)"
                  },
                  children: "Recebido"
                }, void 0, false)]
              }, void 0, true), aReceber > 0 && /*#__PURE__*/_jsxDEV("div", {
                style: {
                  textAlign: "center"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#d97706"
                  },
                  children: aReceber.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  })
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 10,
                    color: "var(--text-muted)"
                  },
                  children: "A Receber"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                },
                children: [pendentes > 0 && /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    background: "#fef3c7",
                    color: "#b45309",
                    borderRadius: 20,
                    padding: "2px 10px",
                    fontSize: 11,
                    fontWeight: 600
                  },
                  children: [pendentes, " pendente(s)"]
                }, void 0, true), pendentes === 0 && /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    background: "#d1fae5",
                    color: "#065f46",
                    borderRadius: 20,
                    padding: "2px 10px",
                    fontSize: 11,
                    fontWeight: 600
                  },
                  children: "✓ Em dia"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV(Icon, {
                name: "chevron-right",
                size: 16,
                style: {
                  color: "var(--text-muted)"
                }
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true)
        }, pac.id, false);
      })]
    }, void 0, true), aba === "comissoes" && /*#__PURE__*/_jsxDEV(Comissoes, {
      user: user
    }, void 0, false), modalDespesa && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModalDespesa(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflowY: "auto"
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600
            },
            children: [editandoDespesa ? "Editar" : "Nova", " Despesa — Clínica"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModalDespesa(false),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Categoria"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formDespesa.categoria,
              onChange: e => setFormDespesa({
                ...formDespesa,
                categoria: e.target.value
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "",
                children: "Selecionar..."
              }, void 0, false), CATS_DESPESA_CLINICA.map(cat => /*#__PURE__*/_jsxDEV("option", {
                children: cat
              }, cat, false))]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Descrição"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: formDespesa.descricao,
              onChange: e => setFormDespesa({
                ...formDespesa,
                descricao: e.target.value
              }),
              placeholder: "Ex: Equipamento Neurofeedback"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Valor (R$)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              value: formDespesa.valor,
              onChange: e => setFormDespesa({
                ...formDespesa,
                valor: e.target.value
              }),
              placeholder: "0,00"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Data"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "date",
              value: formDespesa.data,
              onChange: e => setFormDespesa({
                ...formDespesa,
                data: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Forma de Pagamento"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formDespesa.formaPag,
              onChange: e => setFormDespesa({
                ...formDespesa,
                formaPag: e.target.value
              }),
              children: FORMAS_PAG_CLINICA.map(f => /*#__PURE__*/_jsxDEV("option", {
                children: f
              }, f, false))
            }, void 0, false)]
          }, void 0, true), !editandoDespesa && /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Parcelas"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 8,
                alignItems: "center"
              },
              children: [/*#__PURE__*/_jsxDEV("input", {
                className: "form-input",
                type: "number",
                min: "1",
                max: "60",
                value: formDespesa.parcelas,
                onChange: e => setFormDespesa({
                  ...formDespesa,
                  parcelas: e.target.value
                }),
                style: {
                  width: 80
                }
              }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)"
                },
                children: ["= ", /*#__PURE__*/_jsxDEV("strong", {
                  style: {
                    color: "var(--purple)"
                  },
                  children: ["R$ ", ((parseFloat(formDespesa.valor) || 0) * (parseInt(formDespesa.parcelas) || 1)).toFixed(2).replace(".", ",")]
                }, void 0, true)]
              }, void 0, true)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Status"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 8
              },
              children: [["pago", "✓ Pago", "#059669"], ["pendente", "Pendente", "#d97706"]].map(([v, l, cor]) => /*#__PURE__*/_jsxDEV("button", {
                type: "button",
                onClick: () => setFormDespesa({
                  ...formDespesa,
                  status: v
                }),
                style: {
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: "1.5px solid",
                  borderColor: formDespesa.status === v ? cor : "#e5e7eb",
                  background: formDespesa.status === v ? cor + "15" : "white",
                  color: formDespesa.status === v ? cor : "#6b7280",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "var(--font-body)"
                },
                children: l
              }, v, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Observações"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: formDespesa.obs || "",
              onChange: e => setFormDespesa({
                ...formDespesa,
                obs: e.target.value
              }),
              placeholder: "Opcional..."
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 16
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModalDespesa(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: salvarDespesaClinica,
            disabled: salvando,
            children: salvando ? "Salvando..." : editandoDespesa ? "Salvar" : "Lançar"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), modal === "escolha" && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModal(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 32,
          width: "100%",
          maxWidth: 420,
          textAlign: "center"
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 8
          },
          children: "Novo Lançamento"
        }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
          style: {
            fontSize: 13,
            color: "#6b7280",
            marginBottom: 24
          },
          children: "Selecione o tipo:"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 10
          },
          children: /*#__PURE__*/_jsxDEV("button", {
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
            onClick: () => setModal("pacote"),
            children: [/*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 32,
                flexShrink: 0
              },
              children: "📦"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--purple)"
                },
                children: "Pacote de Sessões"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#6b7280",
                  lineHeight: 1.5,
                  marginTop: 2
                },
                children: "Gera sessões recorrentes na agenda com ficha de frequência, controle de pagamento e formas mistas"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true)
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            width: "100%",
            marginTop: 12
          },
          onClick: () => setModal(false),
          children: "Cancelar"
        }, void 0, false)]
      }, void 0, true)
    }, void 0, false), modal === "avulso" && /*#__PURE__*/_jsxDEV("div", {
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
      },
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 500
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600
            },
            children: editando ? "Editar Lançamento" : "Lançamento Avulso"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => {
              setModal(false);
              setEditando(null);
            },
            style: {
              background: "none",
              border: "none",
              cursor: "pointer"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Paciente / Cliente"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
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
              },
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "",
                children: "Selecionar..."
              }, void 0, false), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/_jsxDEV("option", {
                value: p.id,
                children: p.nome
              }, p.id, false))]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Tipo / Categoria"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formAvulso.tipo,
              onChange: e => {
                const pac = pacientes.find(p => p.id === formAvulso.pacienteId);
                setFormAvulso({
                  ...formAvulso,
                  tipo: e.target.value,
                  obs: pac ? `${e.target.value} — ${pac.nome}` : formAvulso.obs
                });
              },
              children: ["Consulta", "Sessão", "Avaliação", "Musicoterapia", "Neuromodulação", "Orientação", "Laudo", "Outro"].map(t => /*#__PURE__*/_jsxDEV("option", {
                children: t
              }, t, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Valor R$"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              placeholder: "0,00",
              value: formAvulso.valor,
              onChange: e => setFormAvulso({
                ...formAvulso,
                valor: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Data"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "date",
              value: formAvulso.data,
              onChange: e => setFormAvulso({
                ...formAvulso,
                data: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Forma de Pagamento"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formAvulso.formaPag,
              onChange: e => setFormAvulso({
                ...formAvulso,
                formaPag: e.target.value
              }),
              children: FORMAS.map(f => /*#__PURE__*/_jsxDEV("option", {
                children: f
              }, f, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Status"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 8
              },
              children: [["pendente", "Pendente", "#d97706"], ["recebido", "✓ Recebido", "#059669"]].map(([v, l, c]) => /*#__PURE__*/_jsxDEV("button", {
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
                },
                children: l
              }, v, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Observações"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              placeholder: "Opcional...",
              value: formAvulso.obs,
              onChange: e => setFormAvulso({
                ...formAvulso,
                obs: e.target.value
              })
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => {
              setModal(false);
              setEditando(null);
            },
            children: "Cancelar"
          }, void 0, false), editando && /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: 12
            },
            title: "Este lançamento é uma despesa, não uma receita",
            onClick: () => {
              setFormDespesaEdit({
                descricao: formAvulso.descricao || formAvulso.tipo || "",
                categoria: formAvulso.categoria || "",
                valor: formAvulso.valor + "",
                data: formAvulso.data || "",
                formaPag: formAvulso.formaPag || "",
                status: formAvulso.status === "recebido" ? "pago" : formAvulso.status || "pago",
                obs: formAvulso.obs || ""
              });
              setModal("editar-despesa");
            },
            children: "🔁 Marcar como Despesa"
          }, void 0, false), editando ? /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: () => salvarAvulso(null),
            disabled: salvando,
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "save",
              size: 15
            }, void 0, false), " ", salvando ? "Salvando..." : "Salvar Alterações"]
          }, void 0, true) : /*#__PURE__*/_jsxDEV(_Fragment, {
            children: [/*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              onClick: () => salvarAvulso(null),
              disabled: salvando,
              style: {
                border: "1px solid #e5e7eb",
                color: "#6b7280",
                fontSize: 12
              },
              title: "Sem comissão — para lançamentos passados",
              children: "📋 Sem comissão"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              onClick: () => salvarAvulso("primeira"),
              disabled: salvando,
              style: {
                background: "#7B00C4"
              },
              title: "10% de comissão",
              children: "🌟 Primeira Venda"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              onClick: () => salvarAvulso("recorrente"),
              disabled: salvando,
              style: {
                background: "#0891b2"
              },
              title: "5% de comissão",
              children: "🔁 Venda Recorrente"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), modal === "editar-despesa" && /*#__PURE__*/_jsxDEV("div", {
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
      },
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 500
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600,
              color: "#dc2626"
            },
            children: "✏️ Editar Despesa"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => {
              setModal(false);
              setEditando(null);
            },
            style: {
              background: "none",
              border: "none",
              cursor: "pointer"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Descrição"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              placeholder: "Ex: Consultório locação",
              value: formDespesaEdit.descricao,
              onChange: e => setFormDespesaEdit({
                ...formDespesaEdit,
                descricao: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Categoria"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formDespesaEdit.categoria,
              onChange: e => setFormDespesaEdit({
                ...formDespesaEdit,
                categoria: e.target.value
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "",
                children: "Selecionar..."
              }, void 0, false), CATS_DESPESA.map(c => /*#__PURE__*/_jsxDEV("option", {
                children: c
              }, c, false))]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Valor R$"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              placeholder: "0,00",
              value: formDespesaEdit.valor,
              onChange: e => setFormDespesaEdit({
                ...formDespesaEdit,
                valor: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Data"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "date",
              value: formDespesaEdit.data,
              onChange: e => setFormDespesaEdit({
                ...formDespesaEdit,
                data: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Forma de Pagamento"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formDespesaEdit.formaPag,
              onChange: e => setFormDespesaEdit({
                ...formDespesaEdit,
                formaPag: e.target.value
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "",
                children: "—"
              }, void 0, false), FORMAS.map(f => /*#__PURE__*/_jsxDEV("option", {
                children: f
              }, f, false))]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Status"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 8
              },
              children: [["pago", "✓ Pago", "#059669"], ["pendente", "Pendente", "#d97706"]].map(([v, l, c]) => /*#__PURE__*/_jsxDEV("button", {
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
                },
                children: l
              }, v, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Observações"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              placeholder: "Opcional...",
              value: formDespesaEdit.obs,
              onChange: e => setFormDespesaEdit({
                ...formDespesaEdit,
                obs: e.target.value
              })
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => {
              setModal(false);
              setEditando(null);
            },
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            style: {
              background: "#dc2626"
            },
            onClick: salvarDespesaEdit,
            disabled: salvando,
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "save",
              size: 15
            }, void 0, false), " ", salvando ? "Salvando..." : "Salvar Alterações"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), modal === "pacote" && (() => {
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
      return /*#__PURE__*/_jsxDEV("div", {
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
        onClick: () => setModal(false),
        children: /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "white",
            borderRadius: 16,
            padding: 28,
            width: "100%",
            maxWidth: 560,
            maxHeight: "90vh",
            overflowY: "auto"
          },
          onClick: e => e.stopPropagation(),
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 600
              },
              children: "Novo Pacote de Sessões"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              onClick: () => setModal(false),
              style: {
                background: "none",
                border: "none",
                cursor: "pointer"
              },
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: "x",
                size: 20
              }, void 0, false)
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              style: {
                gridColumn: "1/-1"
              },
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: "Paciente *"
              }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
                className: "form-input",
                value: formPacote.pacienteId,
                onChange: e => setFormPacote({
                  ...formPacote,
                  pacienteId: e.target.value
                }),
                children: [/*#__PURE__*/_jsxDEV("option", {
                  value: "",
                  children: "Selecionar..."
                }, void 0, false), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/_jsxDEV("option", {
                  value: p.id,
                  children: p.nome
                }, p.id, false))]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: "Nº de Sessões *"
              }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
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
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: "Recorrência *"
              }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
                className: "form-input",
                value: formPacote.recorrencia,
                onChange: e => setFormPacote({
                  ...formPacote,
                  recorrencia: e.target.value,
                  diasSemana: [],
                  horariosPorDia: {}
                }),
                children: RECORRENCIAS.map(r => /*#__PURE__*/_jsxDEV("option", {
                  children: r
                }, r, false))
              }, void 0, false)]
            }, void 0, true), needDias && /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              style: {
                gridColumn: "1/-1"
              },
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: ["Dias da Semana * (escolha ", maxDias, ")"]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 4
                },
                children: DIAS.map(d => {
                  const sel = diasSel.includes(d.v);
                  const dis = !sel && diasSel.length >= maxDias;
                  return /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3
                    },
                    children: [/*#__PURE__*/_jsxDEV("button", {
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
                      },
                      children: d.l
                    }, void 0, false), sel && /*#__PURE__*/_jsxDEV("input", {
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
                    }, void 0, false)]
                  }, d.v, true);
                })
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: "Data de Início *"
              }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                className: "form-input",
                type: "date",
                value: formPacote.dataInicio,
                onChange: e => setFormPacote({
                  ...formPacote,
                  dataInicio: e.target.value
                })
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: ["Horário ", needDias ? "(padrão)" : ""]
              }, void 0, true), /*#__PURE__*/_jsxDEV("input", {
                className: "form-input",
                type: "time",
                value: formPacote.horario,
                onChange: e => setFormPacote({
                  ...formPacote,
                  horario: e.target.value
                })
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              style: {
                gridColumn: "1/-1"
              },
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: "Tipo de Atendimento"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  gap: 8
                },
                children: [["particular", "🏥 Particular"], ["social", "🌱 Social"], ["parceria", "🤝 Parceria"]].map(([v, l]) => /*#__PURE__*/_jsxDEV("button", {
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
                  },
                  children: l
                }, v, false))
              }, void 0, false)]
            }, void 0, true), (formPacote.tipoAtendimento || "particular") === "social" ? /*#__PURE__*/_jsxDEV(_Fragment, {
              children: [/*#__PURE__*/_jsxDEV("div", {
                className: "form-group",
                children: [/*#__PURE__*/_jsxDEV("label", {
                  className: "form-label",
                  children: "Valor Supervisão (R$)"
                }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                  className: "form-input",
                  type: "number",
                  value: formPacote.valorSupervisaoSocial || "40",
                  onChange: e => setFormPacote({
                    ...formPacote,
                    valorSupervisaoSocial: e.target.value
                  })
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 3
                  },
                  children: "Receita da clínica"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                className: "form-group",
                children: [/*#__PURE__*/_jsxDEV("label", {
                  className: "form-label",
                  children: "Valor Estagiária (R$)"
                }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                  className: "form-input",
                  type: "number",
                  value: formPacote.valorEstagiariaSocial || "20",
                  onChange: e => setFormPacote({
                    ...formPacote,
                    valorEstagiariaSocial: e.target.value
                  })
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 3
                  },
                  children: "Comissão estagiária"
                }, void 0, false)]
              }, void 0, true)]
            }, void 0, true) : /*#__PURE__*/_jsxDEV(_Fragment, {
              children: [/*#__PURE__*/_jsxDEV("div", {
                className: "form-group",
                children: [/*#__PURE__*/_jsxDEV("label", {
                  className: "form-label",
                  children: "Valor por Sessão (R$)"
                }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                  className: "form-input",
                  type: "number",
                  placeholder: "Ex: 250",
                  value: formPacote.valorSessao,
                  onChange: e => setFormPacote({
                    ...formPacote,
                    valorSessao: e.target.value
                  })
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                className: "form-group",
                children: [/*#__PURE__*/_jsxDEV("label", {
                  className: "form-label",
                  children: "Total do Pacote (R$)"
                }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                  className: "form-input",
                  type: "number",
                  placeholder: "Automático",
                  value: formPacote.valorSessao && formPacote.totalSessoes ? (parseFloat(formPacote.valorSessao) || 0) * (parseInt(formPacote.totalSessoes) || 0) : "",
                  readOnly: true,
                  style: {
                    background: "#f9fafb"
                  }
                }, void 0, false)]
              }, void 0, true), (formPacote.tipoAtendimento || "particular") === "parceria" && (() => {
                const tot = (parseFloat(formPacote.valorSessao) || 0) * (parseInt(formPacote.totalSessoes) || 0);
                const parceiros = formPacote.parceirosList || [];
                const totalRepasses = parceiros.reduce((a, p) => {
                  const v = p.tipoValor === "fixo" ? parseFloat(p.valor) || 0 : tot * (parseFloat(p.perc) || 0) / 100;
                  return a + v;
                }, 0);
                const liquidoClinica = tot - totalRepasses;
                return /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    gridColumn: "1/-1"
                  },
                  children: [/*#__PURE__*/_jsxDEV("div", {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8
                    },
                    children: [/*#__PURE__*/_jsxDEV("label", {
                      className: "form-label",
                      style: {
                        margin: 0
                      },
                      children: "🤝 Parceiros e Repasses"
                    }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                      type: "button",
                      style: {
                        fontSize: 12,
                        color: "#b45309",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: 6,
                        padding: "4px 12px",
                        cursor: "pointer",
                        fontWeight: 600
                      },
                      onClick: () => setFormPacote({
                        ...formPacote,
                        parceirosList: [...(formPacote.parceirosList || []), {
                          nome: "",
                          parceiraId: "",
                          tipoValor: "fixo",
                          valor: "",
                          perc: ""
                        }]
                      }),
                      children: "+ Adicionar parceiro"
                    }, void 0, false)]
                  }, void 0, true), parceiros.length === 0 && /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                      padding: "6px 0"
                    },
                    children: "Clique em \"+ Adicionar parceiro\" para registrar cada pessoa e seu repasse."
                  }, void 0, false), parceiros.map((p, i) => {
                    const vCalc = p.tipoValor === "fixo" ? parseFloat(p.valor) || 0 : tot * (parseFloat(p.perc) || 0) / 100;
                    return /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: 10,
                        padding: "10px 12px",
                        marginBottom: 8
                      },
                      children: [/*#__PURE__*/_jsxDEV("div", {
                        style: {
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 8,
                          marginBottom: 8,
                          alignItems: "center"
                        },
                        children: [/*#__PURE__*/_jsxDEV("div", {
                          children: [/*#__PURE__*/_jsxDEV("select", {
                            className: "form-input",
                            style: {
                              fontSize: 12,
                              marginBottom: 4
                            },
                            value: p.parceiraId || "",
                            onChange: e => {
                              const pc = parceiras.find(x => x.id === e.target.value);
                              const lista = [...(formPacote.parceirosList || [])];
                              lista[i] = {
                                ...lista[i],
                                parceiraId: e.target.value,
                                nome: pc?.nome || lista[i].nome,
                                perc: pc?.percentual ? String(pc.percentual) : lista[i].perc
                              };
                              setFormPacote({
                                ...formPacote,
                                parceirosList: lista
                              });
                            },
                            children: [/*#__PURE__*/_jsxDEV("option", {
                              value: "",
                              children: "— Do cadastro (opcional) —"
                            }, void 0, false), parceiras.map(pc => /*#__PURE__*/_jsxDEV("option", {
                              value: pc.id,
                              children: pc.nome
                            }, pc.id, false))]
                          }, void 0, true), /*#__PURE__*/_jsxDEV("input", {
                            className: "form-input",
                            style: {
                              fontSize: 12
                            },
                            placeholder: "Nome do parceiro",
                            value: p.nome || "",
                            onChange: e => {
                              const lista = [...(formPacote.parceirosList || [])];
                              lista[i] = {
                                ...lista[i],
                                nome: e.target.value
                              };
                              setFormPacote({
                                ...formPacote,
                                parceirosList: lista
                              });
                            }
                          }, void 0, false)]
                        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
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
                            const lista = [...(formPacote.parceirosList || [])];
                            lista.splice(i, 1);
                            setFormPacote({
                              ...formPacote,
                              parceirosList: lista
                            });
                          },
                          children: "✕"
                        }, void 0, false)]
                      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                        style: {
                          display: "grid",
                          gridTemplateColumns: "auto 1fr",
                          gap: 8,
                          alignItems: "center"
                        },
                        children: [/*#__PURE__*/_jsxDEV("div", {
                          style: {
                            display: "flex",
                            gap: 4
                          },
                          children: [["fixo", "R$ fixo"], ["perc", "% do total"]].map(([tv, tl]) => /*#__PURE__*/_jsxDEV("button", {
                            type: "button",
                            onClick: () => {
                              const lista = [...(formPacote.parceirosList || [])];
                              lista[i] = {
                                ...lista[i],
                                tipoValor: tv
                              };
                              setFormPacote({
                                ...formPacote,
                                parceirosList: lista
                              });
                            },
                            style: {
                              padding: "5px 10px",
                              borderRadius: 6,
                              border: "1.5px solid",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: "var(--font-body)",
                              borderColor: p.tipoValor === tv ? "#b45309" : "#e5e7eb",
                              background: p.tipoValor === tv ? "#fffbeb" : "white",
                              color: p.tipoValor === tv ? "#b45309" : "#6b7280"
                            },
                            children: tl
                          }, tv, false))
                        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                          style: {
                            display: "flex",
                            gap: 8,
                            alignItems: "center"
                          },
                          children: [p.tipoValor === "fixo" ? /*#__PURE__*/_jsxDEV("input", {
                            className: "form-input",
                            style: {
                              fontSize: 12
                            },
                            type: "number",
                            placeholder: "Valor R$",
                            value: p.valor || "",
                            onChange: e => {
                              const lista = [...(formPacote.parceirosList || [])];
                              lista[i] = {
                                ...lista[i],
                                valor: e.target.value
                              };
                              setFormPacote({
                                ...formPacote,
                                parceirosList: lista
                              });
                            }
                          }, void 0, false) : /*#__PURE__*/_jsxDEV("input", {
                            className: "form-input",
                            style: {
                              fontSize: 12
                            },
                            type: "number",
                            placeholder: "%",
                            min: "0",
                            max: "100",
                            value: p.perc || "",
                            onChange: e => {
                              const lista = [...(formPacote.parceirosList || [])];
                              lista[i] = {
                                ...lista[i],
                                perc: e.target.value
                              };
                              setFormPacote({
                                ...formPacote,
                                parceirosList: lista
                              });
                            }
                          }, void 0, false), vCalc > 0 && /*#__PURE__*/_jsxDEV("span", {
                            style: {
                              fontSize: 12,
                              color: "#b45309",
                              fontWeight: 700,
                              whiteSpace: "nowrap"
                            },
                            children: ["= R$ ", vCalc.toFixed(2).replace(".", ",")]
                          }, void 0, true)]
                        }, void 0, true)]
                      }, void 0, true)]
                    }, i, true);
                  }), tot > 0 && parceiros.length > 0 && /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 13,
                      marginTop: 4
                    },
                    children: /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px 20px"
                      },
                      children: [/*#__PURE__*/_jsxDEV("span", {
                        children: ["💰 Total recebido: ", /*#__PURE__*/_jsxDEV("strong", {
                          children: ["R$ ", tot.toFixed(2).replace(".", ",")]
                        }, void 0, true)]
                      }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
                        style: {
                          color: "#b45309"
                        },
                        children: ["↗ Total repasses: ", /*#__PURE__*/_jsxDEV("strong", {
                          children: ["R$ ", totalRepasses.toFixed(2).replace(".", ",")]
                        }, void 0, true)]
                      }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
                        style: {
                          color: "#059669"
                        },
                        children: ["🏥 Líquido clínica: ", /*#__PURE__*/_jsxDEV("strong", {
                          children: ["R$ ", liquidoClinica.toFixed(2).replace(".", ",")]
                        }, void 0, true)]
                      }, void 0, true)]
                    }, void 0, true)
                  }, void 0, false)]
                }, void 0, true);
              })()]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              style: {
                gridColumn: "1/-1"
              },
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: "Status do Pagamento"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  gap: 8
                },
                children: [["pendente", "Pendente", "#d97706"], ["recebido", "✓ Recebido", "#059669"]].map(([v, l, c]) => /*#__PURE__*/_jsxDEV("button", {
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
                  },
                  children: l
                }, v, false))
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: "Forma de Pagamento"
              }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
                className: "form-input",
                value: formPacote.formaPag || "",
                onChange: e => setFormPacote({
                  ...formPacote,
                  formaPag: e.target.value
                }),
                children: [/*#__PURE__*/_jsxDEV("option", {
                  value: "",
                  children: "Selecionar..."
                }, void 0, false), FORMAS.map(f => /*#__PURE__*/_jsxDEV("option", {
                  children: f
                }, f, false))]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: "Data do Pagamento"
              }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                className: "form-input",
                type: "date",
                value: formPacote.dataPagamento || "",
                onChange: e => setFormPacote({
                  ...formPacote,
                  dataPagamento: e.target.value
                })
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              style: {
                gridColumn: "1/-1"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8
                },
                children: [/*#__PURE__*/_jsxDEV("label", {
                  className: "form-label",
                  style: {
                    margin: 0
                  },
                  children: "Formas de pagamento"
                }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
                  }),
                  children: "+ Adicionar forma"
                }, void 0, false)]
              }, void 0, true), (formPacote.pagamentosExtras || []).length === 0 && /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  padding: "6px 0"
                },
                children: "Clique em \"+ Adicionar forma\" para registrar PIX, cartão, dinheiro em datas diferentes."
              }, void 0, false), (formPacote.pagamentosExtras || []).map((pg, i) => /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: 6,
                  marginBottom: 6,
                  alignItems: "center"
                },
                children: [/*#__PURE__*/_jsxDEV("select", {
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
                  },
                  children: [/*#__PURE__*/_jsxDEV("option", {
                    value: "",
                    children: "Forma..."
                  }, void 0, false), FORMAS.map(f => /*#__PURE__*/_jsxDEV("option", {
                    children: f
                  }, f, false))]
                }, void 0, true), /*#__PURE__*/_jsxDEV("input", {
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
                }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
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
                }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
                  },
                  children: "✕"
                }, void 0, false)]
              }, i, true))]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              className: "form-group",
              style: {
                gridColumn: "1/-1"
              },
              children: [/*#__PURE__*/_jsxDEV("label", {
                className: "form-label",
                children: "Observações"
              }, void 0, false), /*#__PURE__*/_jsxDEV(TextAreaVoz, {
                className: "form-input",
                rows: 2,
                value: formPacote.obs,
                onChange: e => setFormPacote({
                  ...formPacote,
                  obs: e.target.value
                }),
                placeholder: "Notas sobre o pacote..."
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), formPacote.totalSessoes && formPacote.dataInicio && /*#__PURE__*/_jsxDEV("div", {
            style: {
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 10,
              padding: 12,
              marginBottom: 14,
              fontSize: 13,
              color: "#065f46"
            },
            children: ["✅ ", /*#__PURE__*/_jsxDEV("strong", {
              children: [formPacote.totalSessoes, " sessões"]
            }, void 0, true), " a partir de ", /*#__PURE__*/_jsxDEV("strong", {
              children: new Date(formPacote.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")
            }, void 0, false), " · ", /*#__PURE__*/_jsxDEV("strong", {
              children: formPacote.recorrencia
            }, void 0, false), needDias && diasSel.length > 0 && /*#__PURE__*/_jsxDEV("span", {
              children: [" · dias: ", /*#__PURE__*/_jsxDEV("strong", {
                children: diasSel.map(d => DIAS_LABEL[d]).join(", ")
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexWrap: "wrap"
            },
            children: [/*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              onClick: () => setModal(false),
              children: "Cancelar"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              onClick: () => salvarPacote(null),
              disabled: salvando,
              style: {
                border: "1px solid #e5e7eb",
                color: "#6b7280",
                fontSize: 12
              },
              title: "Sem comissão — para lançamentos passados",
              children: "📋 Sem comissão"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              onClick: () => salvarPacote("primeira"),
              disabled: salvando,
              style: {
                background: "#7B00C4"
              },
              title: "10% de comissão",
              children: "🌟 Primeira Venda"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              onClick: () => salvarPacote("recorrente"),
              disabled: salvando,
              style: {
                background: "#0891b2"
              },
              title: "5% de comissão",
              children: "🔁 Venda Recorrente"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)
      }, void 0, false);
    })()]
  }, void 0, true);
}

// ───────────────────────────────────────────────────────────
// PAINEL GERAL — Dashboard consolidado (Pessoal + Clínica, todos os CCs)
// ───────────────────────────────────────────────────────────
function PainelGeral({
  lancamentos,
  lancClinica,
  anoFiltro,
  setAnoFiltro,
  anos,
  fmt,
  mesLabel
}) {
  const CORES_CC = {
    "🏥 Clínica": "#7B00C4",
    "🎵 Ônix Brasil": "#0891b2",
    "🎶 Flamboyant": "#db2777",
    "⭐ Estrelas": "#d97706",
    "🌱 Projetos Culturais": "#059669",
    "📚 Consultorias & Cursos": "#2563eb",
    "🏢 Administrativo": "#6b7280",
    "🏠 Pessoal": "#dc2626",
    "—": "#9ca3af"
  };
  const CORES_CAT = ["#7B00C4", "#0891b2", "#db2777", "#d97706", "#059669", "#2563eb", "#dc2626", "#6b7280", "#9333ea", "#16a34a", "#ea580c", "#0284c7"];

  // Normaliza lançamentos de ambas as origens em um formato único
  const normPessoal = lancamentos.map(l => ({
    tipo: l.tipo === "receita" ? "receita" : "despesa",
    valor: parseFloat(l.valor) || 0,
    data: l.data || "",
    categoria: l.categoria || "Outros",
    centroCusto: l.centroCusto || "🏠 Pessoal",
    status: l.status || "pago"
  }));
  const normClinica = lancClinica.map(l => ({
    tipo: l.tipo_lancamento === "despesa" || l.tipo === "despesa" ? "despesa" : "receita",
    valor: parseFloat(l.valor) || 0,
    data: l.data || "",
    categoria: l.categoria || l.tipo || "Outros",
    centroCusto: l.centroCusto || "🏥 Clínica",
    status: l.status || "pago"
  }));
  const todos = [...normPessoal, ...normClinica];
  const pagos = t => t.status === "pago" || t.status === "recebido";
  const doAno = todos.filter(l => l.data?.startsWith(anoFiltro) && pagos(l));

  // Resumo por Centro de Custo
  const ccMap = {};
  doAno.forEach(l => {
    const cc = l.centroCusto || "—";
    if (!ccMap[cc]) ccMap[cc] = {
      receita: 0,
      despesa: 0
    };
    ccMap[cc][l.tipo] += l.valor;
  });
  const ccs = Object.entries(ccMap).map(([cc, v]) => ({
    cc,
    ...v,
    saldo: v.receita - v.despesa
  })).sort((a, b) => b.despesa - a.despesa);
  const totalReceita = doAno.filter(l => l.tipo === "receita").reduce((a, l) => a + l.valor, 0);
  const totalDespesa = doAno.filter(l => l.tipo === "despesa").reduce((a, l) => a + l.valor, 0);
  const saldoConsolidado = totalReceita - totalDespesa;
  const margem = totalReceita > 0 ? saldoConsolidado / totalReceita * 100 : 0;

  // Comparativo com mês anterior
  const hoje = new Date();
  const mesAtualStr = hoje.toISOString().slice(0, 7);
  const mesAnteriorDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesAnteriorStr = mesAnteriorDate.toISOString().slice(0, 7);
  const saldoMesAtual = (() => {
    const l = todos.filter(x => x.data?.startsWith(mesAtualStr) && pagos(x));
    return l.filter(x => x.tipo === "receita").reduce((a, x) => a + x.valor, 0) - l.filter(x => x.tipo === "despesa").reduce((a, x) => a + x.valor, 0);
  })();
  const saldoMesAnterior = (() => {
    const l = todos.filter(x => x.data?.startsWith(mesAnteriorStr) && pagos(x));
    return l.filter(x => x.tipo === "receita").reduce((a, x) => a + x.valor, 0) - l.filter(x => x.tipo === "despesa").reduce((a, x) => a + x.valor, 0);
  })();
  const variacaoMes = saldoMesAnterior !== 0 ? (saldoMesAtual - saldoMesAnterior) / Math.abs(saldoMesAnterior) * 100 : saldoMesAtual > 0 ? 100 : 0;

  // Despesas pendentes
  const pendentes = todos.filter(l => l.status === "pendente" && l.data?.startsWith(anoFiltro));
  const totalPendente = pendentes.reduce((a, l) => a + l.valor, 0);

  // Top 5 maiores despesas do mês atual
  const despesasMesAtual = todos.filter(l => l.tipo === "despesa" && l.data?.startsWith(mesAtualStr) && pagos(l)).sort((a, b) => b.valor - a.valor).slice(0, 5);

  // Evolução últimos 12 meses (saldo total)
  const meses12 = Array.from({
    length: 12
  }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + i, 1);
    return d.toISOString().slice(0, 7);
  });
  const evolucao = meses12.map(m => {
    const l = todos.filter(x => x.data?.startsWith(m) && pagos(x));
    const rec = l.filter(x => x.tipo === "receita").reduce((a, x) => a + x.valor, 0);
    const desp = l.filter(x => x.tipo === "despesa").reduce((a, x) => a + x.valor, 0);
    return {
      mes: m,
      saldo: rec - desp,
      receita: rec,
      despesa: desp
    };
  });

  // Despesas por categoria (geral, todos os CCs)
  const catMap = {};
  doAno.filter(l => l.tipo === "despesa").forEach(l => {
    catMap[l.categoria] = (catMap[l.categoria] || 0) + l.valor;
  });
  const categorias = Object.entries(catMap).map(([cat, v]) => ({
    cat,
    valor: v
  })).sort((a, b) => b.valor - a.valor);
  const maxDespCC = Math.max(1, ...ccs.map(c => Math.max(c.receita, c.despesa)));
  const maxEvol = Math.max(1, ...evolucao.map(e => Math.max(Math.abs(e.saldo), e.receita, e.despesa)));

  // Donut SVG — despesas por CC
  function Donut() {
    const total = ccs.reduce((a, c) => a + c.despesa, 0);
    if (total <= 0) return /*#__PURE__*/_jsxDEV("div", {
      style: {
        textAlign: "center",
        color: "var(--text-muted)",
        padding: 20,
        fontSize: 13
      },
      children: "Sem despesas no período."
    }, void 0, false);
    let acc = 0;
    const r = 70,
      cx = 90,
      cy = 90,
      circ = 2 * Math.PI * r;
    return /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap"
      },
      children: [/*#__PURE__*/_jsxDEV("svg", {
        width: "180",
        height: "180",
        viewBox: "0 0 180 180",
        children: [/*#__PURE__*/_jsxDEV("circle", {
          cx: cx,
          cy: cy,
          r: r,
          fill: "none",
          stroke: "#f3f4f6",
          strokeWidth: "22"
        }, void 0, false), ccs.filter(c => c.despesa > 0).map((c, i) => {
          const frac = c.despesa / total;
          const dash = frac * circ;
          const offset = circ - acc;
          const el = /*#__PURE__*/_jsxDEV("circle", {
            cx: cx,
            cy: cy,
            r: r,
            fill: "none",
            stroke: CORES_CC[c.cc] || CORES_CAT[i % CORES_CAT.length],
            strokeWidth: "22",
            strokeDasharray: `${dash} ${circ - dash}`,
            strokeDashoffset: offset,
            transform: `rotate(-90 ${cx} ${cy})`
          }, c.cc, false);
          acc += dash;
          return el;
        }), /*#__PURE__*/_jsxDEV("text", {
          x: cx,
          y: cy - 4,
          textAnchor: "middle",
          fontSize: "13",
          fontWeight: "700",
          fill: "#111827",
          children: fmt(total)
        }, void 0, false), /*#__PURE__*/_jsxDEV("text", {
          x: cx,
          y: cy + 14,
          textAnchor: "middle",
          fontSize: "10",
          fill: "#6b7280",
          children: ["despesas ", anoFiltro]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
          minWidth: 160
        },
        children: ccs.filter(c => c.despesa > 0).sort((a, b) => b.despesa - a.despesa).map((c, i) => /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 10,
              height: 10,
              borderRadius: 3,
              background: CORES_CC[c.cc] || CORES_CAT[i % CORES_CAT.length],
              flexShrink: 0
            }
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: c.cc
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontWeight: 700
            },
            children: fmt(c.despesa)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              color: "var(--text-muted)",
              width: 42,
              textAlign: "right"
            },
            children: [(c.despesa / total * 100).toFixed(0), "%"]
          }, void 0, true)]
        }, c.cc, true))
      }, void 0, false)]
    }, void 0, true);
  }

  // Barras — receita vs despesa por CC
  function BarrasCC() {
    if (ccs.length === 0) return /*#__PURE__*/_jsxDEV("div", {
      style: {
        textAlign: "center",
        color: "var(--text-muted)",
        padding: 20,
        fontSize: 13
      },
      children: "Sem dados no período."
    }, void 0, false);
    return /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      },
      children: ccs.map(c => /*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            marginBottom: 4
          },
          children: [/*#__PURE__*/_jsxDEV("span", {
            style: {
              fontWeight: 600
            },
            children: c.cc
          }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
            style: {
              color: c.saldo >= 0 ? "#059669" : "#dc2626",
              fontWeight: 700
            },
            children: fmt(c.saldo)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 3
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 6
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                width: 60,
                fontSize: 10,
                color: "#059669"
              },
              children: "Receita"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                flex: 1,
                background: "#f3f4f6",
                borderRadius: 4,
                height: 10,
                overflow: "hidden"
              },
              children: /*#__PURE__*/_jsxDEV("div", {
                style: {
                  width: `${c.receita / maxDespCC * 100}%`,
                  height: "100%",
                  background: "#10b981",
                  borderRadius: 4
                }
              }, void 0, false)
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                width: 80,
                fontSize: 11,
                textAlign: "right"
              },
              children: fmt(c.receita)
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 6
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                width: 60,
                fontSize: 10,
                color: "#dc2626"
              },
              children: "Despesa"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                flex: 1,
                background: "#f3f4f6",
                borderRadius: 4,
                height: 10,
                overflow: "hidden"
              },
              children: /*#__PURE__*/_jsxDEV("div", {
                style: {
                  width: `${c.despesa / maxDespCC * 100}%`,
                  height: "100%",
                  background: "#ef4444",
                  borderRadius: 4
                }
              }, void 0, false)
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                width: 80,
                fontSize: 11,
                textAlign: "right"
              },
              children: fmt(c.despesa)
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)]
      }, c.cc, true))
    }, void 0, false);
  }

  // Linha — evolução do saldo (12 meses)
  function LinhaEvolucao() {
    const w = 600,
      h = 160,
      pad = 30;
    const pontos = evolucao.map((e, i) => {
      const x = pad + i / (evolucao.length - 1) * (w - 2 * pad);
      const yZero = h / 2;
      const scale = (h / 2 - 10) / maxEvol;
      const y = yZero - e.saldo * scale;
      return {
        x,
        y,
        ...e
      };
    });
    const path = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    return /*#__PURE__*/_jsxDEV("div", {
      style: {
        overflowX: "auto"
      },
      children: /*#__PURE__*/_jsxDEV("svg", {
        width: w,
        height: h,
        viewBox: `0 0 ${w} ${h}`,
        style: {
          minWidth: 500
        },
        children: [/*#__PURE__*/_jsxDEV("line", {
          x1: pad,
          y1: h / 2,
          x2: w - pad,
          y2: h / 2,
          stroke: "#e5e7eb",
          strokeWidth: "1"
        }, void 0, false), /*#__PURE__*/_jsxDEV("path", {
          d: path,
          fill: "none",
          stroke: "#7B00C4",
          strokeWidth: "2.5"
        }, void 0, false), pontos.map((p, i) => /*#__PURE__*/_jsxDEV("g", {
          children: [/*#__PURE__*/_jsxDEV("circle", {
            cx: p.x,
            cy: p.y,
            r: "3.5",
            fill: p.saldo >= 0 ? "#059669" : "#dc2626"
          }, void 0, false), /*#__PURE__*/_jsxDEV("text", {
            x: p.x,
            y: h - 6,
            textAnchor: "middle",
            fontSize: "9",
            fill: "#9ca3af",
            children: mesLabel(p.mes)
          }, void 0, false)]
        }, i, true))]
      }, void 0, true)
    }, void 0, false);
  }

  // Barras — despesas por categoria (geral)
  function BarrasCategorias() {
    const top = categorias.slice(0, 10);
    const max = Math.max(1, ...top.map(c => c.valor));
    if (top.length === 0) return /*#__PURE__*/_jsxDEV("div", {
      style: {
        textAlign: "center",
        color: "var(--text-muted)",
        padding: 20,
        fontSize: 13
      },
      children: "Sem despesas no período."
    }, void 0, false);
    return /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      },
      children: top.map((c, i) => /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            width: 130,
            fontSize: 12,
            flexShrink: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          },
          children: c.cat
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            flex: 1,
            background: "#f3f4f6",
            borderRadius: 4,
            height: 14,
            overflow: "hidden"
          },
          children: /*#__PURE__*/_jsxDEV("div", {
            style: {
              width: `${c.valor / max * 100}%`,
              height: "100%",
              background: CORES_CAT[i % CORES_CAT.length],
              borderRadius: 4
            }
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            width: 90,
            fontSize: 12,
            fontWeight: 700,
            textAlign: "right"
          },
          children: fmt(c.valor)
        }, void 0, false)]
      }, c.cat, true))
    }, void 0, false);
  }

  // ── Plano de Contas — agrupamento por categoria real ──
  const PLANO_CONTAS = {
    "Marketing / Tráfego Pago": ["Marketing", "Tráfego Pago", "Publicidade", "Redes Sociais", "Google Ads"],
    "Ferramentas Digitais": ["Ferramentas de IA", "Software", "Assinaturas", "ElevenLabs", "Tecnologia", "Internet", "Telefone / Internet"],
    "Ocupação / Aluguel": ["Aluguel", "Condomínio", "Sublocação", "Energia / Água", "Manutenção", "IPTU"],
    "Repasses / Comissões": ["Salário Secretária", "Repasse", "Comissão", "Parceria", "Estagiária"],
    "Educação / Capacitação": ["Cursos e Capacitação", "Educação", "Livros", "Supervisão", "Desenvolvimento Pessoal"],
    "Saúde / Bem-estar": ["Saúde", "Plano de Saúde", "Medicamentos", "Consultas"],
    "Gastos Domésticos": ["Moradia", "Alimentação", "Transporte", "Vestuário", "Lazer / Entretenimento", "Lazer", "Saneago", "Seguro", "Consórcio"],
    "Outros": []
  };
  function mapearPlano(cat) {
    if (!cat) return "Outros";
    const c = cat.trim();
    for (const [grupo, cats] of Object.entries(PLANO_CONTAS)) {
      if (cats.some(k => c.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(c.toLowerCase()))) return grupo;
    }
    return "Outros";
  }
  const CORES_PLANO = ["#7B00C4", "#0891b2", "#db2777", "#d97706", "#059669", "#2563eb", "#dc2626", "#9ca3af"];
  const planoMap = {};
  doAno.filter(l => l.tipo === "despesa").forEach(l => {
    const grupo = mapearPlano(l.categoria);
    planoMap[grupo] = (planoMap[grupo] || 0) + l.valor;
  });
  const planoData = Object.entries(planoMap).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a).map(([cat, valor], i) => ({
    cat,
    valor,
    cor: CORES_PLANO[i % CORES_PLANO.length]
  }));
  function DonutPlano() {
    const total = planoData.reduce((a, p) => a + p.valor, 0);
    if (total <= 0) return /*#__PURE__*/_jsxDEV("div", {
      style: {
        textAlign: "center",
        color: "var(--text-muted)",
        padding: 20,
        fontSize: 13
      },
      children: "Sem despesas no período."
    }, void 0, false);
    let acc = 0;
    const r = 70,
      cx = 90,
      cy = 90,
      circ = 2 * Math.PI * r;
    return /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap"
      },
      children: [/*#__PURE__*/_jsxDEV("svg", {
        width: "180",
        height: "180",
        viewBox: "0 0 180 180",
        children: [/*#__PURE__*/_jsxDEV("circle", {
          cx: cx,
          cy: cy,
          r: r,
          fill: "none",
          stroke: "#f3f4f6",
          strokeWidth: "22"
        }, void 0, false), planoData.map((p, i) => {
          const frac = p.valor / total;
          const dash = frac * circ;
          const offset = circ - acc;
          const el = /*#__PURE__*/_jsxDEV("circle", {
            cx: cx,
            cy: cy,
            r: r,
            fill: "none",
            stroke: p.cor,
            strokeWidth: "22",
            strokeDasharray: `${dash} ${circ - dash}`,
            strokeDashoffset: offset,
            transform: `rotate(-90 ${cx} ${cy})`
          }, p.cat, false);
          acc += dash;
          return el;
        }), /*#__PURE__*/_jsxDEV("text", {
          x: cx,
          y: cy - 4,
          textAnchor: "middle",
          fontSize: "12",
          fontWeight: "700",
          fill: "#111827",
          children: fmt(total)
        }, void 0, false), /*#__PURE__*/_jsxDEV("text", {
          x: cx,
          y: cy + 14,
          textAnchor: "middle",
          fontSize: "10",
          fill: "#6b7280",
          children: ["despesas ", anoFiltro]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 5,
          flex: 1,
          minWidth: 180
        },
        children: planoData.map(p => /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 10,
              height: 10,
              borderRadius: 3,
              background: p.cor,
              flexShrink: 0
            }
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1,
              lineHeight: 1.3
            },
            children: p.cat
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontWeight: 700,
              flexShrink: 0
            },
            children: fmt(p.valor)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              color: "var(--text-muted)",
              width: 38,
              textAlign: "right",
              flexShrink: 0
            },
            children: [(p.valor / total * 100).toFixed(0), "%"]
          }, void 0, true)]
        }, p.cat, true))
      }, void 0, false)]
    }, void 0, true);
  }
  function BarrasPlano() {
    if (planoData.length === 0) return /*#__PURE__*/_jsxDEV("div", {
      style: {
        textAlign: "center",
        color: "var(--text-muted)",
        padding: 20,
        fontSize: 13
      },
      children: "Sem dados."
    }, void 0, false);
    const max = Math.max(1, ...planoData.map(p => p.valor));
    return /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      },
      children: planoData.map(p => /*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            marginBottom: 3
          },
          children: [/*#__PURE__*/_jsxDEV("span", {
            style: {
              fontWeight: 600
            },
            children: p.cat
          }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
            style: {
              fontWeight: 700,
              color: p.cor
            },
            children: fmt(p.valor)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "#f3f4f6",
            borderRadius: 6,
            height: 12,
            overflow: "hidden"
          },
          children: /*#__PURE__*/_jsxDEV("div", {
            style: {
              width: `${p.valor / max * 100}%`,
              height: "100%",
              background: p.cor,
              borderRadius: 6,
              transition: ".4s"
            }
          }, void 0, false)
        }, void 0, false)]
      }, p.cat, true))
    }, void 0, false);
  }
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 18,
        alignItems: "center",
        flexWrap: "wrap"
      },
      children: [/*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)",
          flexShrink: 0
        },
        children: "Ano:"
      }, void 0, false), anos.map(a => /*#__PURE__*/_jsxDEV("button", {
        onClick: () => setAnoFiltro(a),
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
        },
        children: a
      }, a, false))]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
        gap: 12,
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          background: saldoConsolidado >= 0 ? "#d1fae5" : "#fee2e2",
          borderRadius: 12,
          padding: "14px 16px",
          border: "1.5px solid",
          borderColor: saldoConsolidado >= 0 ? "#6ee7b7" : "#fca5a5"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: saldoConsolidado >= 0 ? "#059669" : "#dc2626",
            marginBottom: 4
          },
          children: ["Saldo Consolidado (", anoFiltro, ")"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 800,
            color: saldoConsolidado >= 0 ? "#059669" : "#dc2626"
          },
          children: fmt(saldoConsolidado)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "#6b7280",
            marginTop: 2
          },
          children: ["+", fmt(totalReceita), " / -", fmt(totalDespesa)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "#f0f9ff",
          borderRadius: 12,
          padding: "14px 16px",
          border: "1.5px solid #93c5fd"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: "#2563eb",
            marginBottom: 4
          },
          children: "Margem"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 800,
            color: "#2563eb"
          },
          children: [margem.toFixed(1), "%"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "#6b7280",
            marginTop: 2
          },
          children: "(receita - despesa) / receita"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: variacaoMes >= 0 ? "#f0fdf4" : "#fef2f2",
          borderRadius: 12,
          padding: "14px 16px",
          border: "1.5px solid",
          borderColor: variacaoMes >= 0 ? "#86efac" : "#fca5a5"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: variacaoMes >= 0 ? "#059669" : "#dc2626",
            marginBottom: 4
          },
          children: "Vs. mês anterior"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 800,
            color: variacaoMes >= 0 ? "#059669" : "#dc2626"
          },
          children: [variacaoMes >= 0 ? "▲" : "▼", " ", Math.abs(variacaoMes).toFixed(0), "%"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "#6b7280",
            marginTop: 2
          },
          children: [fmt(saldoMesAnterior), " → ", fmt(saldoMesAtual)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "#fffbeb",
          borderRadius: 12,
          padding: "14px 16px",
          border: "1.5px solid #fcd34d"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: "#d97706",
            marginBottom: 4
          },
          children: ["Pendentes (", anoFiltro, ")"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 800,
            color: "#d97706"
          },
          children: fmt(totalPendente)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "#6b7280",
            marginTop: 2
          },
          children: [pendentes.length, " lançamento(s)"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
        gap: 16,
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 14
          },
          children: "🥧 Despesas por Centro de Custo"
        }, void 0, false), /*#__PURE__*/_jsxDEV(Donut, {}, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 14
          },
          children: "📊 Receita vs Despesa por CC"
        }, void 0, false), /*#__PURE__*/_jsxDEV(BarrasCC, {}, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
        gap: 16,
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 14
          },
          children: "🎯 Despesas por Plano de Contas"
        }, void 0, false), /*#__PURE__*/_jsxDEV(DonutPlano, {}, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 14
          },
          children: ["📉 Distribuição por Grupo (", anoFiltro, ")"]
        }, void 0, true), /*#__PURE__*/_jsxDEV(BarrasPlano, {}, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 14
        },
        children: "📈 Evolução do Saldo — últimos 12 meses"
      }, void 0, false), /*#__PURE__*/_jsxDEV(LinhaEvolucao, {}, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
        gap: 16,
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 14
          },
          children: ["🏷️ Maiores Categorias de Despesa (", anoFiltro, ")"]
        }, void 0, true), /*#__PURE__*/_jsxDEV(BarrasCategorias, {}, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 14
          },
          children: ["🔝 Top 5 Maiores Despesas — ", mesLabel(mesAtualStr)]
        }, void 0, true), despesasMesAtual.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
          style: {
            textAlign: "center",
            color: "var(--text-muted)",
            padding: 20,
            fontSize: 13
          },
          children: "Sem despesas neste mês."
        }, void 0, false) : /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 8
          },
          children: despesasMesAtual.map((d, i) => /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom: i < despesasMesAtual.length - 1 ? "1px solid var(--gray-100)" : "none"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0
              },
              children: i + 1
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                flex: 1
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 600,
                  fontSize: 13
                },
                children: d.categoria
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "var(--text-muted)"
                },
                children: [d.centroCusto, " · ", d.data]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 700,
                color: "#dc2626"
              },
              children: fmt(d.valor)
            }, void 0, false)]
          }, i, true))
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true)]
  }, void 0, true);
}

// ═══════════════════════════════════════════════════════
// FINANCEIRO PESSOAL & EMPRESA — componente unificado por tipo
// ═══════════════════════════════════════════════════════

// Componente base reutilizável para Pessoal e Empresa
function FinanceiroBase({
  titulo,
  subtitulo,
  colLanc,
  colRecorr,
  corAcento = "#7B00C4",
  user
}) {
  const [lancamentos, setLancamentos] = useState([]);
  const [recorrentes, setRecorrentes] = useState([]);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear() + "");
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [filtroTipo, setFiltroTipo] = useState("tudo");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [modalBaixa, setModalBaixa] = useState(null);
  const [modalMover, setModalMover] = useState(null); // {lanc, isRecorrente}
  const [movendoId, setMovendoId] = useState(null);
  const [formBaixa, setFormBaixa] = useState({
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    formaPag: "PIX",
    modo: "este"
  });
  const [formLanc, setFormLanc] = useState({
    tipo: "despesa",
    categoria: "",
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    formaPag: "PIX",
    status: "pago",
    obs: "",
    parcelas: "1"
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
    indeterminado: true,
    totalParcelas: ""
  });
  const [abaModal, setAbaModal] = useState("avulso");
  const FORMAS = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Depósito", "Transferência", "Débito Automático", "Outro"];
  const RECORRS = ["Mensal", "Semanal", "Quinzenal", "Bimestral", "Trimestral", "Semestral", "Anual"];
  const CATS_REC_PES = ["Pró-labore", "Salário CLT", "Professora CLT", "Rendimento de Investimentos", "Dividendos", "Aluguel Recebido", "Freelance", "Outros"];
  const CATS_DES_PES = ["Moradia", "Aluguel", "IPTU", "Saneago", "Energia / Água", "Condomínio", "Alimentação", "Supermercado", "Saúde", "Plano de Saúde", "Transporte", "Combustível", "Lazer", "Vestuário", "Viagem", "Aporte em Investimentos", "Seguro", "Outros"];
  const CATS_REC_EMP = ["Venda de Infoproduto", "Consultoria", "Curso Ministrado", "Palestra", "Licença", "Outros"];
  const CATS_DES_EMP = ["Marketing / Tráfego Pago", "Ferramentas de IA", "ElevenLabs", "Designer / Freelancer", "Equipamentos Digitais", "Cursos / Treinamentos", "Ônix Brasil", "Contador", "Impostos", "Assinaturas", "Outros"];
  const isPessoal = colLanc === "clinica_financeiro_pessoal";
  const catsRec = isPessoal ? CATS_REC_PES : CATS_REC_EMP;
  const catsDes = isPessoal ? CATS_DES_PES : CATS_DES_EMP;
  const DESTINOS = [{
    col: "clinica_financeiro_pessoal",
    colRec: "clinica_fin_pessoal_recorrentes",
    label: "💼 Financeiro Pessoal"
  }, {
    col: "clinica_financeiro_empresa",
    colRec: "clinica_fin_empresa_recorrentes",
    label: "🏢 Financeiro Empresa"
  }, {
    col: "clinica_lancamentos",
    colRec: null,
    label: "🏥 Financeiro Clínica"
  }].filter(d => d.col !== colLanc);
  useEffect(() => {
    const u1 = db.collection(colLanc).onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
      setLancamentos(docs);
    }, () => {});
    const u2 = db.collection(colRecorr).onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setRecorrentes(docs);
    }, () => {});
    return () => {
      u1();
      u2();
    };
  }, [colLanc, colRecorr]);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const anoAtualNum = new Date().getFullYear();
  const anosExist = [...new Set(lancamentos.map(l => l.data?.slice(0, 4)).filter(Boolean))].map(Number);
  const anos = [...new Set([...anosExist, anoAtualNum - 1, anoAtualNum, anoAtualNum + 1])].sort().map(String);
  const mesesDisp = Array.from({
    length: 12
  }, (_, i) => `${anoFiltro}-${String(i + 1).padStart(2, "0")}`);
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro) ? mesFiltro : mesAtual.startsWith(anoFiltro) ? mesAtual : anoFiltro + "-01";
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
  const lancMes = lancamentos.filter(l => l.data?.startsWith(mesFiltroEfetivo));
  const lancAno = lancamentos.filter(l => l.data?.startsWith(anoFiltro));
  function calcRec(l) {
    return l.filter(x => x.tipo === "receita" && (x.status === "pago" || x.status === "recebido")).reduce((a, x) => a + (parseFloat(x.valor) || 0), 0);
  }
  function calcDes(l) {
    return l.filter(x => x.tipo === "despesa" && (x.status === "pago" || x.status === "recebido")).reduce((a, x) => a + (parseFloat(x.valor) || 0), 0);
  }
  const recMes = calcRec(lancMes),
    desMes = calcDes(lancMes),
    saldoMes = recMes - desMes;
  const recAno = calcRec(lancAno),
    desAno = calcDes(lancAno);
  const pendMes = lancMes.filter(l => l.status === "pendente").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);

  // Recorrentes ativos sem baixa neste mês
  const recorrAtivos = recorrentes.filter(r => r.ativo !== false);
  function jaDeuBaixaMes(r) {
    return lancamentos.some(l => l.recorrenteId === r.id && l.data?.startsWith(mesFiltroEfetivo));
  }

  // Lista unificada: lançamentos do mês + recorrentes sem baixa
  const recSemBaixa = recorrAtivos.filter(r => !jaDeuBaixaMes(r)).map(r => ({
    _virtual: true,
    id: r.id,
    tipo: r.tipo,
    categoria: r.categoria,
    descricao: r.descricao,
    valor: r.valorPrevisto,
    data: `${mesFiltroEfetivo}-${String(r.diaVencimento || 10).padStart(2, "0")}`,
    status: "pendente",
    recorrenteId: r.id,
    _recObj: r
  }));
  const listaUnif = [...lancMes, ...recSemBaixa].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  const receitas = filtroTipo === "despesa" ? [] : listaUnif.filter(l => l.tipo === "receita");
  const despesas = filtroTipo === "receita" ? [] : listaUnif.filter(l => l.tipo === "despesa");
  function abrirNovo(tipo) {
    setFormLanc({
      tipo,
      categoria: "",
      descricao: "",
      valor: "",
      data: new Date().toISOString().slice(0, 10),
      formaPag: "PIX",
      status: "pago",
      obs: "",
      parcelas: "1"
    });
    setEditando(null);
    setAbaModal("avulso");
    setModal("lanc");
  }
  async function salvarLanc() {
    if (!formLanc.valor || !formLanc.data) {
      alert("Valor e data obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const val = parseFloat(formLanc.valor);
      const nParc = parseInt(formLanc.parcelas) || 1;
      const base = {
        tipo: formLanc.tipo,
        tipo_lancamento: formLanc.tipo === "despesa" ? "despesa" : "receita",
        categoria: formLanc.categoria || "Outros",
        descricao: formLanc.descricao || formLanc.categoria || "Lançamento",
        formaPag: formLanc.formaPag,
        status: formLanc.status,
        obs: formLanc.obs || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (editando) {
        await db.collection(colLanc).doc(editando).update({
          ...base,
          valor: val,
          data: formLanc.data
        });
      } else if (nParc > 1) {
        const batch = db.batch();
        const [a, m, d] = formLanc.data.split("-").map(Number);
        for (let i = 0; i < nParc; i++) {
          let mm = m + i,
            aa = a;
          while (mm > 12) {
            mm -= 12;
            aa++;
          }
          const dp = `${aa}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          batch.set(db.collection(colLanc).doc(), {
            ...base,
            valor: val,
            data: dp,
            parcela: `${i + 1}/${nParc}`,
            descricao: (formLanc.descricao || formLanc.categoria || "Lançamento") + ` (${i + 1}/${nParc})`
          });
        }
        await batch.commit();
      } else {
        await db.collection(colLanc).add({
          ...base,
          valor: val,
          data: formLanc.data
        });
      }
      setModal(false);
      setEditando(null);
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setSalvando(false);
  }
  async function salvarRecorr() {
    if (!formRecorr.categoria || !formRecorr.valorPrevisto) {
      alert("Categoria e valor obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        ...formRecorr,
        valorPrevisto: parseFloat(formRecorr.valorPrevisto),
        totalParcelas: formRecorr.indeterminado ? 0 : parseInt(formRecorr.totalParcelas) || 0,
        indeterminado: !!formRecorr.indeterminado,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (editando) {
        await db.collection(colRecorr).doc(editando).update(dados);
      } else {
        await db.collection(colRecorr).add(dados);
      }
      setModal(false);
      setEditando(null);
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setSalvando(false);
  }
  async function darBaixa() {
    if (!formBaixa.valor || !formBaixa.data) {
      alert("Valor e data obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const r = modalBaixa;
      await db.collection(colLanc).add({
        tipo: r.tipo || "despesa",
        tipo_lancamento: (r.tipo || "despesa") === "despesa" ? "despesa" : "receita",
        categoria: r.categoria || "",
        descricao: r.descricao || r.categoria || "",
        valor: parseFloat(formBaixa.valor),
        data: formBaixa.data,
        formaPag: formBaixa.formaPag || "PIX",
        status: "pago",
        recorrenteId: r.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setModalBaixa(null);
    } catch (e) {
      alert("Erro ao dar baixa: " + e.message);
    } finally {
      setSalvando(false);
    }
  }
  async function excluir(id) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await db.collection(colLanc).doc(id).delete();
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  }
  async function moverLancamento(lanc, destino, modoRecorr) {
    setMovendoId(lanc.id);
    try {
      let dados = null;

      // Se é virtual (sem baixa), não tem doc em colLanc — usar os dados do próprio objeto
      if (lanc._virtual) {
        const {
          _virtual,
          _recObj,
          ...rest
        } = lanc;
        dados = {
          ...rest
        };
        // Para virtual, só mover o recorrente — não há lançamento real para mover
        if (destino.colRec && _recObj?.id) {
          const rSnap = await db.collection(colRecorr).doc(_recObj.id).get();
          if (rSnap.exists) {
            await db.collection(destino.colRec).add(rSnap.data());
            await db.collection(colRecorr).doc(_recObj.id).delete();
          }
        }
        setModalMover(null);
        setMovendoId(null);
        return;
      }

      // Lançamento real — buscar do Firestore
      const snap = await db.collection(colLanc).doc(lanc.id).get();
      if (!snap.exists) {
        alert("Lançamento não encontrado.");
        setMovendoId(null);
        return;
      }
      dados = snap.data();

      // Gravar no destino
      if (destino.col === "clinica_lancamentos") {
        await db.collection("clinica_lancamentos").add({
          ...dados,
          tipo_lancamento: dados.tipo === "despesa" ? "despesa" : dados.tipo_lancamento || "avulso"
        });
      } else {
        await db.collection(destino.col).add({
          ...dados
        });
      }
      await db.collection(colLanc).doc(lanc.id).delete();

      // Mover recorrente vinculado se pedido
      if (lanc.recorrenteId && destino.colRec && modoRecorr === "todos") {
        const rSnap = await db.collection(colRecorr).doc(lanc.recorrenteId).get();
        if (rSnap.exists) {
          await db.collection(destino.colRec).add(rSnap.data());
          await db.collection(colRecorr).doc(lanc.recorrenteId).delete();
        }
      }
      setModalMover(null);
    } catch (e) {
      alert("Erro ao mover: " + e.message);
    } finally {
      setMovendoId(null);
    }
  }
  const corRec = "#059669";
  const corDes = "#dc2626";
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: titulo
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: subtitulo
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
          onClick: () => abrirNovo("receita"),
          className: "btn",
          style: {
            background: "none",
            border: `1px solid ${corRec}`,
            color: corRec,
            borderRadius: 8,
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-body)"
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "plus",
            size: 14
          }, void 0, false), " Nova Receita"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          onClick: () => abrirNovo("despesa"),
          className: "btn btn-purple",
          style: {
            padding: "8px 16px",
            fontSize: 13
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "plus",
            size: 14
          }, void 0, false), " Nova Despesa"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
        gap: 16,
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 20,
          background: saldoMes >= 0 ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${saldoMes >= 0 ? "#86efac" : "#fca5a5"}`
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: saldoMes >= 0 ? corRec : corDes,
            marginBottom: 4
          },
          children: ["Saldo (", mesLabel(mesFiltroEfetivo), ")"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 24,
            fontWeight: 700,
            color: saldoMes >= 0 ? corRec : corDes
          },
          children: fmt(saldoMes)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4
          },
          children: ["+", fmt(recMes), " / -", fmt(desMes)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 20,
          background: "#fffbeb",
          border: "1px solid #fde68a"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: "#d97706",
            marginBottom: 4
          },
          children: ["Pendente (", anoFiltro, ")"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 24,
            fontWeight: 700,
            color: "#d97706"
          },
          children: fmt(pendMes)
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 20
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: corRec,
            marginBottom: 4
          },
          children: ["Receitas (", anoFiltro, ")"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 24,
            fontWeight: 700,
            color: corRec
          },
          children: fmt(recAno)
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 20
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: corDes,
            marginBottom: 4
          },
          children: ["Despesas (", anoFiltro, ")"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 24,
            fontWeight: 700,
            color: corDes
          },
          children: fmt(desAno)
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 8,
        marginBottom: 16,
        alignItems: "center"
      },
      children: [/*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 12,
          color: "var(--text-muted)",
          fontWeight: 600
        },
        children: "Ano:"
      }, void 0, false), anos.map(a => /*#__PURE__*/_jsxDEV("button", {
        onClick: () => setAnoFiltro(a),
        style: {
          padding: "4px 14px",
          borderRadius: 20,
          border: "none",
          background: anoFiltro === a ? "var(--purple)" : "var(--gray-100)",
          color: anoFiltro === a ? "white" : "var(--gray-600)",
          fontWeight: anoFiltro === a ? 700 : 400,
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "var(--font-body)"
        },
        children: a
      }, a, false))]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 16,
        background: "var(--gray-50)",
        padding: 6,
        borderRadius: 12,
        width: "fit-content"
      },
      children: [["tudo", "📊 Tudo"], ["receita", "💰 Receitas"], ["despesa", "💸 Despesas"]].map(([v, l]) => /*#__PURE__*/_jsxDEV("button", {
        onClick: () => setFiltroTipo(v),
        style: {
          padding: "6px 16px",
          borderRadius: 8,
          border: "none",
          background: filtroTipo === v ? "white" : "transparent",
          color: filtroTipo === v ? v === "receita" ? corRec : v === "despesa" ? corDes : "var(--purple)" : "#6b7280",
          fontWeight: filtroTipo === v ? 700 : 500,
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "var(--font-body)",
          boxShadow: filtroTipo === v ? "0 1px 4px rgba(0,0,0,.1)" : "none",
          transition: ".15s"
        },
        children: l
      }, v, false))
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
        overflowX: "auto",
        scrollbarWidth: "none"
      },
      children: [/*#__PURE__*/_jsxDEV("button", {
        onClick: () => {
          const idx = mesesDisp.indexOf(mesFiltroEfetivo);
          if (idx > 0) setMesFiltro(mesesDisp[idx - 1]);
        },
        style: {
          background: "var(--purple)",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: 28,
          height: 28,
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        },
        children: /*#__PURE__*/_jsxDEV(Icon, {
          name: "chevron-left",
          size: 14
        }, void 0, false)
      }, void 0, false), mesesDisp.map(m => /*#__PURE__*/_jsxDEV("button", {
        onClick: () => setMesFiltro(m),
        style: {
          padding: "5px 14px",
          borderRadius: 20,
          border: "none",
          background: m === mesFiltroEfetivo ? "var(--purple)" : "var(--gray-100)",
          color: m === mesFiltroEfetivo ? "white" : "var(--gray-600)",
          fontWeight: m === mesFiltroEfetivo ? 700 : 400,
          cursor: "pointer",
          fontSize: 13,
          flexShrink: 0,
          fontFamily: "var(--font-body)"
        },
        children: mesLabel(m)
      }, m, false)), /*#__PURE__*/_jsxDEV("button", {
        onClick: () => {
          const idx = mesesDisp.indexOf(mesFiltroEfetivo);
          if (idx < mesesDisp.length - 1) setMesFiltro(mesesDisp[idx + 1]);
        },
        style: {
          background: "var(--purple)",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: 28,
          height: 28,
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        },
        children: /*#__PURE__*/_jsxDEV(Icon, {
          name: "chevron-right",
          size: 14
        }, void 0, false)
      }, void 0, false)]
    }, void 0, true), filtroTipo !== "despesa" && /*#__PURE__*/_jsxDEV("div", {
      style: {
        padding: "12px 20px",
        background: "#f0fdf4",
        border: "1px solid #86efac",
        borderRadius: 12,
        marginBottom: 12
      },
      children: [/*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 12,
          color: corRec,
          fontWeight: 600
        },
        children: "TOTAL RECEITAS DO MÊS "
      }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 18,
          fontWeight: 700,
          color: corRec,
          marginLeft: 8
        },
        children: fmt(recMes)
      }, void 0, false)]
    }, void 0, true), filtroTipo !== "receita" && /*#__PURE__*/_jsxDEV("div", {
      style: {
        padding: "12px 20px",
        background: "#fef2f2",
        border: "1px solid #fca5a5",
        borderRadius: 12,
        marginBottom: 12
      },
      children: [/*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 12,
          color: corDes,
          fontWeight: 600
        },
        children: "TOTAL DESPESAS DO MÊS "
      }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 18,
          fontWeight: 700,
          color: corDes,
          marginLeft: 8
        },
        children: fmt(desMes)
      }, void 0, false)]
    }, void 0, true), receitas.length > 0 && /*#__PURE__*/_jsxDEV("div", {
      style: {
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            color: corRec
          },
          children: "🟢 Receitas"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            color: corRec
          },
          children: fmt(calcRec(receitas))
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 0,
          overflow: "hidden"
        },
        children: /*#__PURE__*/_jsxDEV("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse"
          },
          children: [/*#__PURE__*/_jsxDEV("thead", {
            children: /*#__PURE__*/_jsxDEV("tr", {
              style: {
                background: "var(--gray-50)"
              },
              children: ["Data", "Descrição", "Categoria", "Forma Pag.", "Valor", "Status", "Ações"].map(h => /*#__PURE__*/_jsxDEV("th", {
                style: {
                  padding: "10px 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textAlign: "left",
                  borderBottom: "1px solid var(--gray-200)"
                },
                children: h
              }, h, false))
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("tbody", {
            children: receitas.map((l, i) => /*#__PURE__*/_jsxDEV("tr", {
              style: {
                borderBottom: "1px solid var(--gray-100)",
                background: i % 2 === 0 ? "white" : "var(--gray-50)"
              },
              children: [/*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap"
                },
                children: [l.data, l._virtual && /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontSize: 10,
                    background: "#fef3c7",
                    color: "#b45309",
                    padding: "1px 6px",
                    borderRadius: 20,
                    fontWeight: 600,
                    marginLeft: 6
                  },
                  children: "sem baixa"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 500
                },
                children: l.descricao || l.categoria || "—"
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--text-muted)"
                },
                children: l.categoria || "—"
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--text-muted)"
                },
                children: l.formaPag || "—"
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: corRec,
                  whiteSpace: "nowrap"
                },
                children: fmt(l.valor)
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px"
                },
                children: /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontWeight: 600,
                    background: l.status === "pago" || l.status === "recebido" ? "#d1fae5" : "#fef3c7",
                    color: l.status === "pago" || l.status === "recebido" ? "#065f46" : "#b45309"
                  },
                  children: l.status === "pago" || l.status === "recebido" ? "✓ Recebido" : "Pendente"
                }, void 0, false)
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px"
                },
                children: /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    alignItems: "center"
                  },
                  children: [l._virtual && /*#__PURE__*/_jsxDEV("button", {
                    onClick: () => {
                      setModalBaixa(l._recObj);
                      setFormBaixa({
                        valor: l.valor + "",
                        data: new Date().toISOString().slice(0, 10),
                        formaPag: "PIX",
                        modo: "este"
                      });
                    },
                    style: {
                      fontSize: 11,
                      background: "#d1fae5",
                      color: "#065f46",
                      border: "none",
                      borderRadius: 6,
                      padding: "3px 8px",
                      cursor: "pointer",
                      fontWeight: 600
                    },
                    children: "Dar baixa"
                  }, void 0, false), !l._virtual && /*#__PURE__*/_jsxDEV(_Fragment, {
                    children: [/*#__PURE__*/_jsxDEV("button", {
                      onClick: () => {
                        setFormLanc({
                          tipo: l.tipo,
                          categoria: l.categoria || "",
                          descricao: l.descricao || "",
                          valor: l.valor + "",
                          data: l.data,
                          formaPag: l.formaPag || "PIX",
                          status: l.status || "pago",
                          obs: l.obs || "",
                          parcelas: "1"
                        });
                        setEditando(l.id);
                        setAbaModal("avulso");
                        setModal("lanc");
                      },
                      style: {
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--purple)",
                        padding: "3px 6px"
                      },
                      title: "Editar",
                      children: /*#__PURE__*/_jsxDEV(Icon, {
                        name: "pencil",
                        size: 13
                      }, void 0, false)
                    }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                      onClick: () => excluir(l.id),
                      style: {
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#dc2626",
                        padding: "3px 6px"
                      },
                      title: "Excluir",
                      children: /*#__PURE__*/_jsxDEV(Icon, {
                        name: "trash-2",
                        size: 13
                      }, void 0, false)
                    }, void 0, false)]
                  }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                    onClick: () => setModalMover({
                      lanc: l._virtual ? {
                        ...l,
                        id: l._recObj.id
                      } : l,
                      isRecorrente: true
                    }),
                    title: "Mover para outro financeiro",
                    style: {
                      background: "#f3f0ff",
                      border: "none",
                      cursor: "pointer",
                      color: "#7B00C4",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600
                    },
                    children: "↗ Mover"
                  }, void 0, false)]
                }, void 0, true)
              }, void 0, false)]
            }, l.id, true))
          }, void 0, false)]
        }, void 0, true)
      }, void 0, false)]
    }, void 0, true), despesas.length > 0 && /*#__PURE__*/_jsxDEV("div", {
      style: {
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            color: corDes
          },
          children: "🔴 Despesas"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            color: corDes
          },
          children: fmt(calcDes(despesas))
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 0,
          overflow: "hidden"
        },
        children: /*#__PURE__*/_jsxDEV("table", {
          style: {
            width: "100%",
            borderCollapse: "collapse"
          },
          children: [/*#__PURE__*/_jsxDEV("thead", {
            children: /*#__PURE__*/_jsxDEV("tr", {
              style: {
                background: "var(--gray-50)"
              },
              children: ["Data", "Descrição", "Categoria", "Forma Pag.", "Valor", "Status", "Ações"].map(h => /*#__PURE__*/_jsxDEV("th", {
                style: {
                  padding: "10px 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textAlign: "left",
                  borderBottom: "1px solid var(--gray-200)"
                },
                children: h
              }, h, false))
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("tbody", {
            children: despesas.map((l, i) => /*#__PURE__*/_jsxDEV("tr", {
              style: {
                borderBottom: "1px solid var(--gray-100)",
                background: i % 2 === 0 ? "white" : "var(--gray-50)"
              },
              children: [/*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap"
                },
                children: [l.data, l._virtual && /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontSize: 10,
                    background: "#fef3c7",
                    color: "#b45309",
                    padding: "1px 6px",
                    borderRadius: 20,
                    fontWeight: 600,
                    marginLeft: 6
                  },
                  children: "sem baixa"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 500
                },
                children: l.descricao || l.categoria || "—"
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--text-muted)"
                },
                children: l.categoria || "—"
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--text-muted)"
                },
                children: l.formaPag || "—"
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: corDes,
                  whiteSpace: "nowrap"
                },
                children: fmt(l.valor)
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px"
                },
                children: /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontWeight: 600,
                    background: l.status === "pago" ? "#d1fae5" : "#fef3c7",
                    color: l.status === "pago" ? "#065f46" : "#b45309"
                  },
                  children: l.status === "pago" ? "✓ Pago" : "Pendente"
                }, void 0, false)
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "10px 14px"
                },
                children: /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    alignItems: "center"
                  },
                  children: [l._virtual && /*#__PURE__*/_jsxDEV("button", {
                    onClick: () => {
                      setModalBaixa(l._recObj);
                      setFormBaixa({
                        valor: l.valor + "",
                        data: new Date().toISOString().slice(0, 10),
                        formaPag: "PIX",
                        modo: "este"
                      });
                    },
                    style: {
                      fontSize: 11,
                      background: "#d1fae5",
                      color: "#065f46",
                      border: "none",
                      borderRadius: 6,
                      padding: "3px 8px",
                      cursor: "pointer",
                      fontWeight: 600
                    },
                    children: "Dar baixa"
                  }, void 0, false), !l._virtual && /*#__PURE__*/_jsxDEV(_Fragment, {
                    children: [/*#__PURE__*/_jsxDEV("button", {
                      onClick: () => {
                        setFormLanc({
                          tipo: l.tipo,
                          categoria: l.categoria || "",
                          descricao: l.descricao || "",
                          valor: l.valor + "",
                          data: l.data,
                          formaPag: l.formaPag || "PIX",
                          status: l.status || "pago",
                          obs: l.obs || "",
                          parcelas: "1"
                        });
                        setEditando(l.id);
                        setAbaModal("avulso");
                        setModal("lanc");
                      },
                      style: {
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--purple)",
                        padding: "3px 6px"
                      },
                      title: "Editar",
                      children: /*#__PURE__*/_jsxDEV(Icon, {
                        name: "pencil",
                        size: 13
                      }, void 0, false)
                    }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                      onClick: () => excluir(l.id),
                      style: {
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#dc2626",
                        padding: "3px 6px"
                      },
                      title: "Excluir",
                      children: /*#__PURE__*/_jsxDEV(Icon, {
                        name: "trash-2",
                        size: 13
                      }, void 0, false)
                    }, void 0, false)]
                  }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                    onClick: () => setModalMover({
                      lanc: l._virtual ? {
                        ...l,
                        id: l._recObj.id
                      } : l,
                      isRecorrente: true
                    }),
                    title: "Mover para outro financeiro",
                    style: {
                      background: "#f3f0ff",
                      border: "none",
                      cursor: "pointer",
                      color: "#7B00C4",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600
                    },
                    children: "↗ Mover"
                  }, void 0, false)]
                }, void 0, true)
              }, void 0, false)]
            }, l.id, true))
          }, void 0, false)]
        }, void 0, true)
      }, void 0, false)]
    }, void 0, true), receitas.length === 0 && despesas.length === 0 && /*#__PURE__*/_jsxDEV("div", {
      style: {
        textAlign: "center",
        padding: 40,
        color: "var(--text-muted)",
        fontSize: 14
      },
      children: ["Nenhum lançamento em ", mesLabel(mesFiltroEfetivo), " de ", anoFiltro, "."]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 16,
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "16px 0",
        borderTop: "1px solid var(--gray-200)",
        flexWrap: "wrap"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          textAlign: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "var(--text-muted)"
          },
          children: "Receitas"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            color: corRec
          },
          children: fmt(recMes)
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 18,
          color: "var(--text-muted)"
        },
        children: "—"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          textAlign: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "var(--text-muted)"
          },
          children: "Despesas"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            color: corDes
          },
          children: fmt(desMes)
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 18,
          color: "var(--text-muted)"
        },
        children: "="
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          textAlign: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "var(--text-muted)"
          },
          children: "Saldo do Mês"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 18,
            color: saldoMes >= 0 ? corRec : corDes
          },
          children: fmt(saldoMes)
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), modal === "lanc" && /*#__PURE__*/_jsxDEV("div", {
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
      },
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto"
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600
            },
            children: [editando ? "Editar" : "Novo", " Lançamento"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => {
              setModal(false);
              setEditando(null);
            },
            style: {
              background: "none",
              border: "none",
              cursor: "pointer"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), !editando && /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 6,
            marginBottom: 16,
            background: "var(--gray-50)",
            padding: 4,
            borderRadius: 10
          },
          children: [["avulso", "💰 Avulso"], ["recorrente", "🔁 Recorrente"]].map(([v, l]) => /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setAbaModal(v),
            style: {
              flex: 1,
              padding: "7px",
              border: "none",
              borderRadius: 8,
              background: abaModal === v ? "white" : "transparent",
              color: abaModal === v ? "var(--purple)" : "#6b7280",
              fontWeight: abaModal === v ? 700 : 500,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "var(--font-body)"
            },
            children: l
          }, v, false))
        }, void 0, false), abaModal === "avulso" ? /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "span 2"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Tipo"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formLanc.tipo,
              onChange: e => setFormLanc({
                ...formLanc,
                tipo: e.target.value,
                categoria: ""
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "receita",
                children: "Receita"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                value: "despesa",
                children: "Despesa"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Categoria"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formLanc.categoria,
              onChange: e => setFormLanc({
                ...formLanc,
                categoria: e.target.value
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "",
                children: "Selecionar..."
              }, void 0, false), (formLanc.tipo === "receita" ? catsRec : catsDes).map(c => /*#__PURE__*/_jsxDEV("option", {
                value: c,
                children: c
              }, c, false))]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Valor (R$)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: formLanc.valor,
              onChange: e => setFormLanc({
                ...formLanc,
                valor: e.target.value
              }),
              placeholder: "0,00"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "span 2"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Descrição"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: formLanc.descricao,
              onChange: e => setFormLanc({
                ...formLanc,
                descricao: e.target.value
              }),
              placeholder: "Descrição opcional"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Data"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "date",
              value: formLanc.data,
              onChange: e => setFormLanc({
                ...formLanc,
                data: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Forma Pag."
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formLanc.formaPag,
              onChange: e => setFormLanc({
                ...formLanc,
                formaPag: e.target.value
              }),
              children: FORMAS.map(f => /*#__PURE__*/_jsxDEV("option", {
                value: f,
                children: f
              }, f, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Status"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formLanc.status,
              onChange: e => setFormLanc({
                ...formLanc,
                status: e.target.value
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "pago",
                children: "✓ Pago / Recebido"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                value: "pendente",
                children: "Pendente"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Parcelas"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              min: "1",
              max: "48",
              value: formLanc.parcelas,
              onChange: e => setFormLanc({
                ...formLanc,
                parcelas: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "span 2"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Observação"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: formLanc.obs,
              onChange: e => setFormLanc({
                ...formLanc,
                obs: e.target.value
              }),
              placeholder: "Opcional"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              gridColumn: "span 2",
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
              alignItems: "center"
            },
            children: [editando && /*#__PURE__*/_jsxDEV("button", {
              onClick: async () => {
                if (confirm("Excluir este lançamento?")) {
                  await excluir(editando);
                  setModal(false);
                  setEditando(null);
                }
              },
              style: {
                background: "none",
                border: "1px solid #dc2626",
                color: "#dc2626",
                borderRadius: 8,
                padding: "7px 14px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font-body)"
              },
              children: "🗑️ Excluir"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 8,
                marginLeft: "auto"
              },
              children: [/*#__PURE__*/_jsxDEV("button", {
                onClick: () => {
                  setModal(false);
                  setEditando(null);
                },
                className: "btn btn-ghost",
                children: "Cancelar"
              }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                onClick: salvarLanc,
                disabled: salvando,
                className: "btn btn-purple",
                children: salvando ? "Salvando..." : "Salvar"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "span 2"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Tipo"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formRecorr.tipo,
              onChange: e => setFormRecorr({
                ...formRecorr,
                tipo: e.target.value,
                categoria: ""
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "receita",
                children: "Receita"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                value: "despesa",
                children: "Despesa"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Categoria"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formRecorr.categoria,
              onChange: e => setFormRecorr({
                ...formRecorr,
                categoria: e.target.value
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "",
                children: "Selecionar..."
              }, void 0, false), (formRecorr.tipo === "receita" ? catsRec : catsDes).map(c => /*#__PURE__*/_jsxDEV("option", {
                value: c,
                children: c
              }, c, false))]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Valor Previsto (R$)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: formRecorr.valorPrevisto,
              onChange: e => setFormRecorr({
                ...formRecorr,
                valorPrevisto: e.target.value
              }),
              placeholder: "0,00"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "span 2"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Descrição"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: formRecorr.descricao,
              onChange: e => setFormRecorr({
                ...formRecorr,
                descricao: e.target.value
              }),
              placeholder: "Ex: Aluguel apartamento"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Recorrência"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formRecorr.recorrencia,
              onChange: e => setFormRecorr({
                ...formRecorr,
                recorrencia: e.target.value
              }),
              children: RECORRS.map(r => /*#__PURE__*/_jsxDEV("option", {
                value: r,
                children: r
              }, r, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Dia vencimento"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              min: "1",
              max: "31",
              value: formRecorr.diaVencimento,
              onChange: e => setFormRecorr({
                ...formRecorr,
                diaVencimento: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Início"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "month",
              value: formRecorr.mesInicio,
              onChange: e => setFormRecorr({
                ...formRecorr,
                mesInicio: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Duração"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: formRecorr.indeterminado ? "ind" : "det",
              onChange: e => setFormRecorr({
                ...formRecorr,
                indeterminado: e.target.value === "ind"
              }),
              children: [/*#__PURE__*/_jsxDEV("option", {
                value: "ind",
                children: "Indeterminado"
              }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
                value: "det",
                children: "Número fixo de meses"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), !formRecorr.indeterminado && /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Qtd meses"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "number",
              min: "1",
              value: formRecorr.totalParcelas,
              onChange: e => setFormRecorr({
                ...formRecorr,
                totalParcelas: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              gridColumn: "span 2",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end"
            },
            children: [/*#__PURE__*/_jsxDEV("button", {
              onClick: () => {
                setModal(false);
                setEditando(null);
              },
              className: "btn btn-ghost",
              children: "Cancelar"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              onClick: salvarRecorr,
              disabled: salvando,
              className: "btn btn-purple",
              children: salvando ? "Salvando..." : "Salvar"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), modalBaixa && /*#__PURE__*/_jsxDEV("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 600,
        padding: 20
      },
      onClick: () => setModalBaixa(null),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 400
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 16
          },
          children: ["Dar baixa — ", modalBaixa.descricao || modalBaixa.categoria]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Valor pago"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            step: "0.01",
            value: formBaixa.valor,
            onChange: e => setFormBaixa({
              ...formBaixa,
              valor: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Data"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "date",
            value: formBaixa.data,
            onChange: e => setFormBaixa({
              ...formBaixa,
              data: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Forma Pag."
          }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
            className: "form-input",
            value: formBaixa.formaPag,
            onChange: e => setFormBaixa({
              ...formBaixa,
              formaPag: e.target.value
            }),
            children: FORMAS.map(f => /*#__PURE__*/_jsxDEV("option", {
              value: f,
              children: f
            }, f, false))
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 16
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModalBaixa(null),
            className: "btn btn-ghost",
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: darBaixa,
            disabled: salvando,
            className: "btn btn-purple",
            children: salvando ? "Salvando..." : "Confirmar baixa"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), modalMover && /*#__PURE__*/_jsxDEV("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 700,
        padding: 20
      },
      onClick: () => setModalMover(null),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 420
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 8
          },
          children: "↗ Mover lançamento"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 13,
            color: "var(--text-muted)",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("strong", {
            children: modalMover.lanc.descricao || modalMover.lanc.categoria
          }, void 0, false), " — ", fmt(modalMover.lanc.valor), /*#__PURE__*/_jsxDEV("br", {}, void 0, false), "Para onde deseja mover?"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 20
          },
          children: DESTINOS.map(dest => /*#__PURE__*/_jsxDEV("div", {
            children: modalMover.isRecorrente && dest.colRec ? /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 8
              },
              children: [/*#__PURE__*/_jsxDEV("button", {
                onClick: () => moverLancamento(modalMover.lanc, dest, "este"),
                disabled: !!movendoId,
                style: {
                  flex: 1,
                  padding: "10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "white",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-body)"
                },
                children: movendoId === modalMover.lanc.id ? "Movendo..." : dest.label + " (só este)"
              }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                onClick: () => moverLancamento(modalMover.lanc, dest, "todos"),
                disabled: !!movendoId,
                style: {
                  flex: 1,
                  padding: "10px",
                  border: "2px solid var(--purple)",
                  borderRadius: 10,
                  background: "#f3f0ff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--purple)",
                  fontFamily: "var(--font-body)"
                },
                children: dest.label + " + recorrente"
              }, void 0, false)]
            }, void 0, true) : /*#__PURE__*/_jsxDEV("button", {
              onClick: () => moverLancamento(modalMover.lanc, dest, "este"),
              disabled: !!movendoId,
              style: {
                width: "100%",
                padding: "12px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                background: "white",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-body)",
                textAlign: "left"
              },
              children: movendoId === modalMover.lanc.id ? "Movendo..." : dest.label
            }, void 0, false)
          }, dest.col, false))
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            borderTop: "1px solid #fee2e2",
            paddingTop: 14,
            marginTop: 4,
            display: "flex",
            flexDirection: "column",
            gap: 8
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: "#dc2626",
              marginBottom: 2
            },
            children: "🗑️ Excluir"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 8
            },
            children: [/*#__PURE__*/_jsxDEV("button", {
              onClick: async () => {
                if (confirm("Excluir só este lançamento?")) {
                  await excluir(modalMover.lanc.id);
                  setModalMover(null);
                }
              },
              disabled: !!movendoId,
              style: {
                flex: 1,
                padding: "9px",
                border: "1px solid #fca5a5",
                borderRadius: 10,
                background: "#fef2f2",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: "#dc2626",
                fontFamily: "var(--font-body)"
              },
              children: "Excluir só este"
            }, void 0, false), modalMover.isRecorrente && modalMover.lanc.recorrenteId && /*#__PURE__*/_jsxDEV("button", {
              onClick: async () => {
                if (confirm("Excluir este e desativar o recorrente?")) {
                  await excluir(modalMover.lanc.id);
                  await db.collection(colRecorr).doc(modalMover.lanc.recorrenteId).update({
                    ativo: false
                  });
                  setModalMover(null);
                }
              },
              disabled: !!movendoId,
              style: {
                flex: 1,
                padding: "9px",
                border: "2px solid #dc2626",
                borderRadius: 10,
                background: "#fef2f2",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                color: "#dc2626",
                fontFamily: "var(--font-body)"
              },
              children: "Excluir + desativar recorrente"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          onClick: () => setModalMover(null),
          className: "btn btn-ghost",
          style: {
            width: "100%",
            marginTop: 8
          },
          children: "Cancelar"
        }, void 0, false)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}
function FinanceiroPessoal({
  somenteLeitura = false
}) {
  return /*#__PURE__*/_jsxDEV(FinanceiroBase, {
    titulo: "Financeiro Pessoal",
    subtitulo: "Receitas e despesas pessoais — moradia, saúde, alimentação, investimentos",
    colLanc: "clinica_financeiro_pessoal",
    colRecorr: "clinica_fin_pessoal_recorrentes"
  }, void 0, false);
}
function FinanceiroEmpresa({
  somenteLeitura = false
}) {
  return /*#__PURE__*/_jsxDEV(FinanceiroBase, {
    titulo: "Financeiro Empresa",
    subtitulo: "Negócio digital — Ônix Brasil, infoprodutos, marketing, ferramentas, treinamentos",
    colLanc: "clinica_financeiro_empresa",
    colRecorr: "clinica_fin_empresa_recorrentes"
  }, void 0, false);
}
function PainelGeralFinanceiro() {
  const [dados, setDados] = useState({
    clinica: [],
    pessoal: [],
    empresa: []
  });
  const [ano, setAno] = useState(new Date().getFullYear() + "");
  const [mesSel, setMesSel] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let d = {
      clinica: [],
      pessoal: [],
      empresa: []
    };
    let count = 0;
    function check() {
      count++;
      if (count === 3) {
        setDados({
          ...d
        });
        setLoading(false);
      }
    }
    db.collection("clinica_lancamentos").onSnapshot(s => {
      d.clinica = s.docs.map(x => ({
        id: x.id,
        ...x.data()
      }));
      check();
    }, () => check());
    db.collection("clinica_financeiro_pessoal").onSnapshot(s => {
      d.pessoal = s.docs.map(x => ({
        id: x.id,
        ...x.data()
      }));
      check();
    }, () => check());
    db.collection("clinica_financeiro_empresa").onSnapshot(s => {
      d.empresa = s.docs.map(x => ({
        id: x.id,
        ...x.data()
      }));
      check();
    }, () => check());
  }, []);
  function fmt(v) {
    return (v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }
  function mesLabel(m, longo) {
    try {
      return new Date(m + "-02").toLocaleDateString("pt-BR", {
        month: longo ? "long" : "short"
      });
    } catch (e) {
      return m;
    }
  }
  function isRec(l) {
    return l.tipo !== "despesa" && l.tipo_lancamento !== "despesa";
  }
  function isDes(l) {
    return l.tipo === "despesa" || l.tipo_lancamento === "despesa";
  }
  function isPago(l) {
    return l.status === "pago" || l.status === "recebido";
  }
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().toISOString().slice(0, 7);
  const anosDisp = [...new Set([...dados.clinica, ...dados.pessoal, ...dados.empresa].map(l => l.data?.slice(0, 4)).filter(Boolean).map(Number))];
  const anos = [...new Set([...anosDisp, anoAtual - 1, anoAtual, anoAtual + 1])].sort().map(String);
  const mesesAno = Array.from({
    length: 12
  }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
  const todas = [...dados.clinica, ...dados.pessoal, ...dados.empresa];
  function calcPeriodo(lista, prefixo) {
    const l = lista.filter(x => x.data?.startsWith(prefixo));
    return {
      rec: l.filter(x => isRec(x) && isPago(x)).reduce((a, x) => a + (parseFloat(x.valor) || 0), 0),
      des: l.filter(x => isDes(x) && isPago(x)).reduce((a, x) => a + (parseFloat(x.valor) || 0), 0),
      pend: l.filter(x => x.status === "pendente").reduce((a, x) => a + (parseFloat(x.valor) || 0), 0)
    };
  }

  // Anual
  const aCl = calcPeriodo(dados.clinica, ano),
    aPs = calcPeriodo(dados.pessoal, ano),
    aEm = calcPeriodo(dados.empresa, ano);
  const totalRec = aCl.rec + aPs.rec + aEm.rec,
    totalDes = aCl.des + aPs.des + aEm.des,
    totalSaldo = totalRec - totalDes;
  const totalPend = aCl.pend + aPs.pend + aEm.pend;

  // Mês selecionado
  const mCl = calcPeriodo(dados.clinica, mesSel),
    mPs = calcPeriodo(dados.pessoal, mesSel),
    mEm = calcPeriodo(dados.empresa, mesSel);
  const mesRec = mCl.rec + mPs.rec + mEm.rec,
    mesDes = mCl.des + mPs.des + mEm.des,
    mesSaldo = mesRec - mesDes;

  // Gráfico por mês
  const grafico = mesesAno.map(m => {
    const rec = todas.filter(l => l.data?.startsWith(m) && isRec(l) && isPago(l)).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
    const des = todas.filter(l => l.data?.startsWith(m) && isDes(l) && isPago(l)).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
    return {
      mes: m,
      rec,
      des,
      saldo: rec - des
    };
  });
  const maxVal = Math.max(...grafico.map(g => Math.max(g.rec, g.des)), 1);
  const altBar = 160;
  if (loading) return /*#__PURE__*/_jsxDEV("div", {
    style: {
      textAlign: "center",
      padding: 60
    },
    children: [/*#__PURE__*/_jsxDEV(Spinner, {}, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      style: {
        marginTop: 12,
        color: "var(--text-muted)"
      },
      children: "Carregando..."
    }, void 0, false)]
  }, void 0, true);
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Painel Geral"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: "Consolidado — Clínica + Pessoal + Empresa"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 6,
          flexWrap: "wrap"
        },
        children: anos.map(a => /*#__PURE__*/_jsxDEV("button", {
          onClick: () => {
            setAno(a);
            setMesSel(a === ano ? mesSel : a + "-01");
          },
          style: {
            padding: "6px 14px",
            borderRadius: 20,
            border: "none",
            background: ano === a ? "var(--purple)" : "var(--gray-100)",
            color: ano === a ? "white" : "var(--gray-600)",
            fontWeight: ano === a ? 700 : 400,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "var(--font-body)"
          },
          children: a
        }, a, false))
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        marginBottom: 8,
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: 1
      },
      children: ["Acumulado ", ano]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
        gap: 12,
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 18,
          background: totalSaldo >= 0 ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${totalSaldo >= 0 ? "#86efac" : "#fca5a5"}`
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: totalSaldo >= 0 ? "#059669" : "#dc2626",
            marginBottom: 4
          },
          children: "Saldo Total"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 700,
            color: totalSaldo >= 0 ? "#059669" : "#dc2626"
          },
          children: fmt(totalSaldo)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 10,
            color: "var(--text-muted)",
            marginTop: 4
          },
          children: ["+", fmt(totalRec), " / -", fmt(totalDes)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 18
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: "#059669",
            marginBottom: 4
          },
          children: ["Receitas ", ano]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 700,
            color: "#059669"
          },
          children: fmt(totalRec)
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 18
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: "#dc2626",
            marginBottom: 4
          },
          children: ["Despesas ", ano]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 700,
            color: "#dc2626"
          },
          children: fmt(totalDes)
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: 18,
          background: "#fffbeb",
          border: "1px solid #fde68a"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            fontWeight: 600,
            color: "#d97706",
            marginBottom: 4
          },
          children: ["Pendente ", ano]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 20,
            fontWeight: 700,
            color: "#d97706"
          },
          children: fmt(totalPend)
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        padding: 20,
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 4
        },
        children: ["📊 Receitas vs Despesas — ", ano]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 12,
          color: "var(--text-muted)",
          marginBottom: 16
        },
        children: "Clique em um mês para ver o detalhamento abaixo"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          overflowX: "auto",
          paddingBottom: 8
        },
        children: grafico.map(g => {
          const hRec = maxVal > 0 ? g.rec / maxVal * altBar : 0;
          const hDes = maxVal > 0 ? g.des / maxVal * altBar : 0;
          const sel = g.mes === mesSel;
          const temDados = g.rec > 0 || g.des > 0;
          return /*#__PURE__*/_jsxDEV("div", {
            onClick: () => setMesSel(g.mes),
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              minWidth: 52,
              flex: 1,
              cursor: "pointer",
              padding: "6px 4px",
              borderRadius: 8,
              background: sel ? "#f3f0ff" : "transparent",
              border: sel ? "2px solid var(--purple)" : "2px solid transparent",
              transition: ".15s"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "flex-end",
                gap: 3,
                height: altBar
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                title: `Receitas: ${fmt(g.rec)}`,
                style: {
                  width: 18,
                  height: Math.max(hRec, 2),
                  background: "#059669",
                  borderRadius: "4px 4px 0 0",
                  opacity: temDados ? 1 : 0.15
                }
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                title: `Despesas: ${fmt(g.des)}`,
                style: {
                  width: 18,
                  height: Math.max(hDes, 2),
                  background: "#dc2626",
                  borderRadius: "4px 4px 0 0",
                  opacity: temDados ? 1 : 0.15
                }
              }, void 0, false)]
            }, void 0, true), temDados && /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 9,
                fontWeight: 700,
                color: g.saldo >= 0 ? "#059669" : "#dc2626",
                whiteSpace: "nowrap"
              },
              children: [g.saldo >= 0 ? "+" : "", fmt(g.saldo).replace("R$", "").trim()]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: sel ? "var(--purple)" : "var(--text-muted)",
                fontWeight: sel ? 700 : 400
              },
              children: mesLabel(g.mes)
            }, void 0, false)]
          }, g.mes, true);
        })
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 16,
          marginTop: 8
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 12,
              height: 12,
              background: "#059669",
              borderRadius: 3
            }
          }, void 0, false), " Receitas"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 12,
              height: 12,
              background: "#dc2626",
              borderRadius: 3
            }
          }, void 0, false), " Despesas"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        padding: 0,
        overflow: "hidden",
        marginBottom: 24,
        border: "2px solid var(--purple)"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-100)",
          fontWeight: 700,
          fontSize: 14,
          background: "#f3f0ff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          children: ["📅 ", mesLabel(mesSel, true).charAt(0).toUpperCase() + mesLabel(mesSel, true).slice(1), " de ", mesSel.slice(0, 4)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 8
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            onClick: () => {
              const idx = mesesAno.indexOf(mesSel);
              if (idx > 0) setMesSel(mesesAno[idx - 1]);
            },
            style: {
              background: "var(--purple)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: 26,
              height: 26,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "chevron-left",
              size: 13
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => {
              const idx = mesesAno.indexOf(mesSel);
              if (idx < mesesAno.length - 1) setMesSel(mesesAno[idx + 1]);
            },
            style: {
              background: "var(--purple)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: 26,
              height: 26,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "chevron-right",
              size: 13
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse"
        },
        children: [/*#__PURE__*/_jsxDEV("thead", {
          children: /*#__PURE__*/_jsxDEV("tr", {
            style: {
              background: "var(--gray-50)"
            },
            children: ["Financeiro", "Receitas", "Despesas", "Saldo"].map(h => /*#__PURE__*/_jsxDEV("th", {
              style: {
                padding: "10px 20px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                textAlign: "left",
                borderBottom: "1px solid var(--gray-200)"
              },
              children: h
            }, h, false))
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("tbody", {
          children: [[{
            label: "🏥 Clínica",
            rec: mCl.rec,
            des: mCl.des
          }, {
            label: "🏠 Pessoal",
            rec: mPs.rec,
            des: mPs.des
          }, {
            label: "🏢 Empresa",
            rec: mEm.rec,
            des: mEm.des
          }].map((row, i) => {
            const saldo = row.rec - row.des;
            return /*#__PURE__*/_jsxDEV("tr", {
              style: {
                borderBottom: "1px solid var(--gray-100)"
              },
              children: [/*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "12px 20px",
                  fontWeight: 600,
                  fontSize: 14
                },
                children: row.label
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "12px 20px",
                  color: "#059669",
                  fontWeight: 700
                },
                children: fmt(row.rec)
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "12px 20px",
                  color: "#dc2626",
                  fontWeight: 700
                },
                children: fmt(row.des)
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "12px 20px",
                  color: saldo >= 0 ? "#059669" : "#dc2626",
                  fontWeight: 700,
                  fontSize: 15
                },
                children: fmt(saldo)
              }, void 0, false)]
            }, i, true);
          }), /*#__PURE__*/_jsxDEV("tr", {
            style: {
              background: "#f3f0ff",
              borderTop: "2px solid var(--purple)"
            },
            children: [/*#__PURE__*/_jsxDEV("td", {
              style: {
                padding: "12px 20px",
                fontWeight: 700,
                fontSize: 14
              },
              children: "TOTAL DO MÊS"
            }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
              style: {
                padding: "12px 20px",
                color: "#059669",
                fontWeight: 700,
                fontSize: 15
              },
              children: fmt(mesRec)
            }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
              style: {
                padding: "12px 20px",
                color: "#dc2626",
                fontWeight: 700,
                fontSize: 15
              },
              children: fmt(mesDes)
            }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
              style: {
                padding: "12px 20px",
                color: mesSaldo >= 0 ? "#059669" : "#dc2626",
                fontWeight: 700,
                fontSize: 16
              },
              children: fmt(mesSaldo)
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        padding: 0,
        overflow: "hidden",
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-100)",
          fontWeight: 700,
          fontSize: 14
        },
        children: ["📋 Resumo Anual — ", ano]
      }, void 0, true), /*#__PURE__*/_jsxDEV("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse"
        },
        children: [/*#__PURE__*/_jsxDEV("thead", {
          children: /*#__PURE__*/_jsxDEV("tr", {
            style: {
              background: "var(--gray-50)"
            },
            children: ["Financeiro", "Receitas", "Despesas", "Saldo"].map(h => /*#__PURE__*/_jsxDEV("th", {
              style: {
                padding: "10px 20px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                textAlign: "left",
                borderBottom: "1px solid var(--gray-200)"
              },
              children: h
            }, h, false))
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("tbody", {
          children: [[{
            label: "🏥 Clínica",
            rec: aCl.rec,
            des: aCl.des
          }, {
            label: "🏠 Pessoal",
            rec: aPs.rec,
            des: aPs.des
          }, {
            label: "🏢 Empresa",
            rec: aEm.rec,
            des: aEm.des
          }].map((row, i) => {
            const saldo = row.rec - row.des;
            return /*#__PURE__*/_jsxDEV("tr", {
              style: {
                borderBottom: "1px solid var(--gray-100)"
              },
              children: [/*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "12px 20px",
                  fontWeight: 600,
                  fontSize: 14
                },
                children: row.label
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "12px 20px",
                  color: "#059669",
                  fontWeight: 700
                },
                children: fmt(row.rec)
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "12px 20px",
                  color: "#dc2626",
                  fontWeight: 700
                },
                children: fmt(row.des)
              }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
                style: {
                  padding: "12px 20px",
                  color: saldo >= 0 ? "#059669" : "#dc2626",
                  fontWeight: 700,
                  fontSize: 15
                },
                children: fmt(saldo)
              }, void 0, false)]
            }, i, true);
          }), /*#__PURE__*/_jsxDEV("tr", {
            style: {
              background: "var(--gray-50)",
              borderTop: "2px solid var(--gray-200)"
            },
            children: [/*#__PURE__*/_jsxDEV("td", {
              style: {
                padding: "12px 20px",
                fontWeight: 700,
                fontSize: 14
              },
              children: "TOTAL"
            }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
              style: {
                padding: "12px 20px",
                color: "#059669",
                fontWeight: 700,
                fontSize: 15
              },
              children: fmt(totalRec)
            }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
              style: {
                padding: "12px 20px",
                color: "#dc2626",
                fontWeight: 700,
                fontSize: 15
              },
              children: fmt(totalDes)
            }, void 0, false), /*#__PURE__*/_jsxDEV("td", {
              style: {
                padding: "12px 20px",
                color: totalSaldo >= 0 ? "#059669" : "#dc2626",
                fontWeight: 700,
                fontSize: 16
              },
              children: fmt(totalSaldo)
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true)]
  }, void 0, true);
}
// ═══════════════════════════════════════════════════════
// ALUNOS EM SUPERVISÃO
// ═══════════════════════════════════════════════════════
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
      if (senha) up.senha = senha; // só atualiza senha se preenchida
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
  if (loading) return /*#__PURE__*/_jsxDEV(Spinner, {}, void 0, false);
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Alunos em Supervisão"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: [alunos.filter(a => a.status === "ativo").length, " aluno(s) cadastrado(s)"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
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
          },
          children: linkCopiado ? "✓ Texto copiado!" : "📋 Link de Cadastro"
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "user-plus",
            size: 16
          }, void 0, false), " Cadastrar Aluno"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), pendentes.length > 0 && /*#__PURE__*/_jsxDEV("div", {
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
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            color: "#92400e"
          },
          children: ["🔔 ", pendentes.length, " solicitação(ões) pendente(s)"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "#78350f",
            marginTop: 2
          },
          children: "Alunos que se cadastraram pelo link e aguardam sua aprovação."
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-ghost",
        style: {
          fontSize: 12,
          color: "#92400e",
          border: "1px solid #f59e0b"
        },
        onClick: () => setFiltro("pendente"),
        children: "Ver pendentes"
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap"
      },
      children: [/*#__PURE__*/_jsxDEV("input", {
        className: "form-input",
        style: {
          flex: 1,
          minWidth: 200
        },
        placeholder: "Buscar por nome ou e-mail...",
        value: busca,
        onChange: e => setBusca(e.target.value)
      }, void 0, false), [["todos", "Todos"], ["ativo", "Ativos"], ["pendente", "Pendentes"], ["inativo", "Inativos"]].map(([f, l]) => /*#__PURE__*/_jsxDEV("button", {
        className: "btn " + (filtro === f ? "btn-purple" : "btn-ghost"),
        onClick: () => setFiltro(f),
        children: [l, " ", f === "pendente" && pendentes.length > 0 && /*#__PURE__*/_jsxDEV("span", {
          style: {
            background: "#f59e0b",
            color: "white",
            borderRadius: 20,
            padding: "1px 7px",
            fontSize: 10,
            fontWeight: 700,
            marginLeft: 4
          },
          children: pendentes.length
        }, void 0, false)]
      }, f, true))]
    }, void 0, true), filtrados.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        textAlign: "center",
        padding: 48,
        color: "var(--text-muted)"
      },
      children: [/*#__PURE__*/_jsxDEV(Icon, {
        name: "graduation-cap",
        size: 40
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginTop: 12
        },
        children: busca ? "Nenhum aluno encontrado." : "Nenhum aluno cadastrado ainda."
      }, void 0, false)]
    }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      },
      children: filtrados.map(a => /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 20px",
          borderLeft: a.status === "pendente" ? "4px solid #f59e0b" : a.status === "inativo" ? "4px solid #9ca3af" : "4px solid transparent"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
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
          },
          children: (a.nome || "?")[0].toUpperCase()
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            flex: 1,
            minWidth: 0
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap"
            },
            children: [/*#__PURE__*/_jsxDEV("span", {
              style: {
                fontWeight: 600
              },
              children: a.nome
            }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
              className: "badge " + (a.status === "ativo" ? "badge-green" : a.status === "pendente" ? "badge-yellow" : "badge-gray"),
              style: a.status === "pendente" ? {
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #f59e0b"
              } : {},
              children: a.status === "ativo" ? "Ativo" : a.status === "pendente" ? "⏳ Pendente" : "Inativo"
            }, void 0, false), a.origemCadastro === "auto-cadastro" && /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 10,
                color: "var(--text-muted)",
                background: "var(--gray-100)",
                borderRadius: 20,
                padding: "2px 8px"
              },
              children: "auto-cadastro"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 13,
              color: "var(--text-muted)",
              display: "flex",
              gap: 12,
              marginTop: 2,
              flexWrap: "wrap"
            },
            children: [/*#__PURE__*/_jsxDEV("span", {
              children: ["✉ ", a.email]
            }, void 0, true), a.instituicao && /*#__PURE__*/_jsxDEV("span", {
              children: ["🏛 ", a.instituicao, a.semestre ? " · " + a.semestre : ""]
            }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
              children: ["👤 ", a.pacientesVinculados || 0, " paciente(s)"]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 6,
            flexWrap: "wrap"
          },
          children: [a.status === "pendente" && /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            style: {
              fontSize: 12,
              padding: "6px 14px"
            },
            onClick: () => alterarStatus(a.id, "ativo"),
            children: "✓ Aprovar"
          }, void 0, false), a.status === "ativo" && /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              fontSize: 11,
              padding: "5px 10px",
              color: "#6b7280"
            },
            onClick: () => alterarStatus(a.id, "inativo"),
            children: "Inativar"
          }, void 0, false), a.status === "inativo" && /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              fontSize: 11,
              padding: "5px 10px",
              color: "#16a34a"
            },
            onClick: () => alterarStatus(a.id, "ativo"),
            children: "Reativar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              fontSize: 12,
              color: "var(--purple)",
              padding: "6px 12px"
            },
            onClick: () => setDetalhe(a),
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "eye",
              size: 13
            }, void 0, false), " Ver"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              padding: "6px 10px"
            },
            onClick: () => abrirEditar(a),
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "pencil",
              size: 13
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              padding: "6px 10px",
              color: "var(--danger)"
            },
            onClick: () => excluir(a.id),
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "trash-2",
              size: 13
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true)]
      }, a.id, true))
    }, void 0, false), modal && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModal(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto"
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 20
          },
          children: editando ? "Editar Aluno" : "Cadastrar Novo Aluno"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "NOME COMPLETO *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: form.nome,
            onChange: e => setForm({
              ...form,
              nome: e.target.value
            }),
            placeholder: "Nome do aluno",
            autoFocus: true
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "E-MAIL *"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "email",
              value: form.email,
              onChange: e => setForm({
                ...form,
                email: e.target.value
              }),
              placeholder: "aluno@email.com",
              disabled: !!editando
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "TELEFONE"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.telefone,
              onChange: e => setForm({
                ...form,
                telefone: e.target.value
              }),
              placeholder: "(00) 9 0000-0000"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "INSTITUIÇÃO"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.instituicao,
              onChange: e => setForm({
                ...form,
                instituicao: e.target.value
              }),
              placeholder: "Nome da faculdade"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "SEMESTRE"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.semestre,
              onChange: e => setForm({
                ...form,
                semestre: e.target.value
              }),
              placeholder: "Ex: 8º semestre"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), !editando && /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "SENHA DE ACESSO *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "password",
            value: form.senha,
            onChange: e => setForm({
              ...form,
              senha: e.target.value
            }),
            placeholder: "Senha para o aluno acessar o portal"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "OBSERVAÇÕES"
          }, void 0, false), /*#__PURE__*/_jsxDEV(TextAreaVoz, {
            className: "form-input",
            rows: 2,
            value: form.obs,
            onChange: e => setForm({
              ...form,
              obs: e.target.value
            }),
            placeholder: "Notas sobre o aluno..."
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModal(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: salvar,
            disabled: salvando,
            children: salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar aluno"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), detalhe && /*#__PURE__*/_jsxDEV("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        zIndex: 500
      },
      onClick: () => setDetalhe(null),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          width: "100%",
          maxWidth: 480,
          height: "100%",
          overflowY: "auto",
          padding: 28
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "graduation-cap",
            size: 20
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600,
              flex: 1
            },
            children: detalhe.nome
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setDetalhe(null),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--gray-400)"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 8,
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("span", {
            className: "badge " + (detalhe.status === "ativo" ? "badge-green" : "badge-gray"),
            children: detalhe.status === "ativo" ? "Ativo" : "Inativo"
          }, void 0, false), detalhe.instituicao && /*#__PURE__*/_jsxDEV("span", {
            className: "badge badge-purple",
            children: detalhe.instituicao
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            fontSize: 14
          },
          children: [detalhe.email && /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)"
              },
              children: "E-mail"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 500
              },
              children: detalhe.email
            }, void 0, false)]
          }, void 0, true), detalhe.telefone && /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)"
              },
              children: "Telefone"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 500
              },
              children: detalhe.telefone
            }, void 0, false)]
          }, void 0, true), detalhe.instituicao && /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)"
              },
              children: "Instituicao"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 500
              },
              children: detalhe.instituicao
            }, void 0, false)]
          }, void 0, true), detalhe.semestre && /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)"
              },
              children: "Semestre"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 500
              },
              children: detalhe.semestre
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), detalhe.obs && /*#__PURE__*/_jsxDEV("div", {
          style: {
            marginTop: 16,
            padding: 12,
            background: "var(--gray-50)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--text-muted)"
          },
          children: detalhe.obs
        }, void 0, false)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}

// ═══════════════════════════════════════════════════════
// TERAPIA DE CASAIS
// ═══════════════════════════════════════════════════════
// ── Botão de Emergência ──
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
  return /*#__PURE__*/_jsxDEV("div", {
    style: {
      background: "#fff5f5",
      border: "2px solid #fecaca",
      borderRadius: 12,
      padding: 16,
      marginTop: 12
    },
    children: [/*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12
      },
      children: [/*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 20
        },
        children: "🔴"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: "#dc2626"
        },
        children: "Botão de Emergência"
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 12,
        lineHeight: 1.6
      },
      children: "Defina a palavra-código que o casal usará para acionar o tempo de pausa durante conflitos."
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 8,
        marginBottom: palavraSalva ? 12 : 0
      },
      children: [/*#__PURE__*/_jsxDEV("input", {
        className: "form-input",
        value: palavra,
        onChange: e => setPalavra(e.target.value.toUpperCase()),
        placeholder: "Ex: PAUSA, RESPIRA, CAFÉ...",
        style: {
          flex: 1,
          fontWeight: 700,
          letterSpacing: 2,
          fontSize: 14,
          textTransform: "uppercase"
        }
      }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: salvar,
        disabled: salvando,
        style: {
          whiteSpace: "nowrap"
        },
        children: salvando ? "..." : salvo ? "✓ Salvo!" : "Salvar"
      }, void 0, false)]
    }, void 0, true), palavraSalva && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "#7B00C4",
        borderRadius: 10,
        padding: "10px 16px",
        textAlign: "center",
        marginBottom: 12
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 11,
          color: "rgba(255,255,255,0.7)",
          marginBottom: 4
        },
        children: ["Palavra ativa para ", nomeCasal]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 700,
          color: "white",
          letterSpacing: 4
        },
        children: palavraSalva
      }, void 0, false)]
    }, void 0, true), acionamentos.length > 0 && /*#__PURE__*/_jsxDEV("div", {
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: "#dc2626",
          marginBottom: 6
        },
        children: "ÚLTIMOS ACIONAMENTOS"
      }, void 0, false), acionamentos.map(a => /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          padding: "5px 0",
          borderBottom: "1px solid #fecaca"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          style: {
            color: "#6b7280"
          },
          children: fmtDH(a.createdAt)
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          style: {
            color: "#dc2626",
            fontWeight: 600
          },
          children: ["⏱ ", a.horas, "h de pausa · por ", a.acionadoPor || "—"]
        }, void 0, true)]
      }, a.id, true))]
    }, void 0, true)]
  }, void 0, true);
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
  if (loading) return /*#__PURE__*/_jsxDEV(Spinner, {}, void 0, false);
  const totalEnviado = laudos.filter(l => l.status === "enviado").length;
  const totalRascunho = laudos.filter(l => l.status === "rascunho").length;
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Laudos"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: [laudos.length, " laudo(s) · ", totalEnviado, " enviado(s) ao paciente"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: () => setModal(true),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "plus",
          size: 16
        }, void 0, false), " Novo Laudo"]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
        gap: 12,
        marginBottom: 24
      },
      children: [["Rascunho", totalRascunho, "#b45309", "#fef3c7"], ["Enviado ao Paciente", totalEnviado, "#065f46", "#d1fae5"], ["Total", laudos.length, "#7B00C4", "var(--purple-soft)"]].map(([l, n, cor, bg]) => /*#__PURE__*/_jsxDEV("div", {
        className: "metric-card",
        style: {
          textAlign: "center",
          background: bg
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "metric-value",
          style: {
            fontSize: 28,
            color: cor
          },
          children: n
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-label",
          style: {
            color: cor
          },
          children: l
        }, void 0, false)]
      }, l, true))
    }, void 0, false), laudos.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        textAlign: "center",
        padding: 60,
        color: "var(--text-muted)"
      },
      children: [/*#__PURE__*/_jsxDEV(Icon, {
        name: "file-text",
        size: 48
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginTop: 12,
          fontWeight: 500
        },
        children: "Nenhum laudo criado ainda"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          marginTop: 8,
          marginBottom: 20,
          color: "var(--text-muted)"
        },
        children: "Crie o laudo no Word/Google Docs, salve como PDF no Drive, cole o link aqui e envie ao paciente."
      }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: () => setModal(true),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "plus",
          size: 14
        }, void 0, false), " Criar primeiro laudo"]
      }, void 0, true)]
    }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      children: laudos.map(l => {
        const st = STATUS_CONFIG[l.status] || STATUS_CONFIG.rascunho;
        return /*#__PURE__*/_jsxDEV("div", {
          className: "card",
          style: {
            padding: "18px 20px"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "flex-start",
              gap: 14
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                width: 44,
                height: 44,
                borderRadius: 12,
                background: st.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              },
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: st.icon,
                size: 20
              }, void 0, false)
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                flex: 1,
                minWidth: 0
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 4
                },
                children: [/*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontWeight: 700,
                    fontSize: 15
                  },
                  children: l.tipo
                }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    background: st.bg,
                    color: st.cor,
                    borderRadius: 20,
                    padding: "2px 10px",
                    fontSize: 11,
                    fontWeight: 600
                  },
                  children: st.label
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 13,
                  color: "var(--text-muted)",
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap"
                },
                children: [/*#__PURE__*/_jsxDEV("span", {
                  children: ["👤 ", l.pacienteNome || "—"]
                }, void 0, true), l.createdAt?.seconds && /*#__PURE__*/_jsxDEV("span", {
                  children: ["📅 ", new Date(l.createdAt.seconds * 1000).toLocaleDateString("pt-BR")]
                }, void 0, true), l.enviadoEm && /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    color: "#059669",
                    fontWeight: 600
                  },
                  children: ["✉ Enviado em ", new Date(l.enviadoEm).toLocaleDateString("pt-BR")]
                }, void 0, true)]
              }, void 0, true), l.observacoes && /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 4,
                  fontStyle: "italic"
                },
                children: l.observacoes
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 8,
              marginTop: 14,
              flexWrap: "wrap",
              borderTop: "1px solid var(--gray-100)",
              paddingTop: 12
            },
            children: [l.linkDrive && /*#__PURE__*/_jsxDEV("a", {
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
              },
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "external-link",
                size: 13
              }, void 0, false), " Ver PDF"]
            }, void 0, true), l.status === "rascunho" && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              style: {
                fontSize: 12
              },
              onClick: () => enviarParaPaciente(l),
              disabled: enviando === l.id,
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "send",
                size: 13
              }, void 0, false), " ", enviando === l.id ? "Enviando..." : "Enviar ao Paciente"]
            }, void 0, true), l.status === "enviado" && /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#059669",
                fontWeight: 600
              },
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "check-circle",
                size: 14
              }, void 0, false), " Disponível no portal do paciente"]
            }, void 0, true), l.status !== "arquivado" && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                fontSize: 12
              },
              onClick: () => arquivar(l.id),
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "archive",
                size: 13
              }, void 0, false), " Arquivar"]
            }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                fontSize: 12,
                color: "var(--danger)",
                marginLeft: "auto"
              },
              onClick: () => excluir(l.id),
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: "trash-2",
                size: 13
              }, void 0, false)
            }, void 0, false)]
          }, void 0, true)]
        }, l.id, true);
      })
    }, void 0, false), modal && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModal(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 500
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600
            },
            children: "Novo Laudo"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModal(false),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--gray-400)"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Tipo de Laudo *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
            className: "form-input",
            value: form.tipo,
            onChange: e => setForm({
              ...form,
              tipo: e.target.value
            }),
            children: TIPOS_LAUDO.map(t => /*#__PURE__*/_jsxDEV("option", {
              value: t,
              children: t
            }, t, false))
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Paciente *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
            className: "form-input",
            value: form.pacienteId,
            onChange: e => setForm({
              ...form,
              pacienteId: e.target.value
            }),
            children: [/*#__PURE__*/_jsxDEV("option", {
              value: "",
              children: "Selecionar paciente..."
            }, void 0, false), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/_jsxDEV("option", {
              value: p.id,
              children: p.nome
            }, p.id, false))]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Link do PDF (Google Drive) *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: form.linkDrive,
            onChange: e => setForm({
              ...form,
              linkDrive: e.target.value
            }),
            placeholder: "https://drive.google.com/file/d/..."
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 4
            },
            children: "No Drive: botão direito no arquivo → \"Obter link\" → cole aqui"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Observações internas (opcional)"
          }, void 0, false), /*#__PURE__*/_jsxDEV(TextAreaVoz, {
            className: "form-input",
            rows: 2,
            value: form.observacoes,
            onChange: e => setForm({
              ...form,
              observacoes: e.target.value
            }),
            placeholder: "Notas internas sobre este laudo..."
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModal(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: salvar,
            disabled: salvando,
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "save",
              size: 15
            }, void 0, false), " ", salvando ? "Salvando..." : "Salvar Laudo"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}

// ═══════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════
// ─── COMISSÕES ────────────────────────────────────────────
function Comissoes({
  user
}) {
  const {
    data: pacotes
  } = useCollection("clinica_pacotes");
  // ── Esteira 1a: Comissões da secretária (vendas_secretaria) ──
  const [comissoes, setComissoes] = useState([]);
  // ── Esteira 1b: Repasses de parceiras/estagiárias (repasses_parcerias) ──
  const [repasses, setRepasses] = useState([]);
  // Fallback: lê clinica_comissoes legado para não perder histórico anterior
  const [comissoesLegado, setComissoesLegado] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [mesSel, setMesSel] = useState(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
  });
  const [pagando, setPagando] = useState(false);

  // Configurações financeiras editáveis (clinica_config/comissoes)
  const [config, setConfig] = useState({
    ...CONFIG_FIN_PADRAO
  });
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [formConfig, setFormConfig] = useState({
    ...CONFIG_FIN_PADRAO
  });
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Parceiras
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
    // Esteira 1a: Comissões da secretária (nova coleção) — sem orderBy, ordenar client-side
    const u1 = db.collection("vendas_secretaria").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setComissoes(docs);
    }, () => {});
    // Esteira 1b: Repasses de parceiras — sem orderBy
    const u1b = db.collection("repasses_parcerias").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setRepasses(docs);
    }, () => {});
    // Fallback: histórico legado clinica_comissoes — sem orderBy
    const u1c = db.collection("clinica_comissoes").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data(),
        _legado: true
      }));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setComissoesLegado(docs);
    }, () => {});
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
      u1b();
      u1c();
      u2();
      u3();
      u4();
    };
  }, []);

  // ── HIGIENIZAÇÃO: remove duplicatas por pacoteId nas coleções de comissão ──
  // ── AUDITORIA: cruza pacotes pagos com registros de comissão ──
  const [modalAuditComissao, setModalAuditComissao] = React.useState(false);
  const [auditResultado, setAuditResultado] = React.useState(null);
  const [auditando, setAuditando] = React.useState(false);
  async function auditarComissoes() {
    setAuditando(true);
    setModalAuditComissao(true);

    // 1. Buscar todos os pacotes
    const snapPac = await db.collection("clinica_pacotes").get();
    const todosPacotes = snapPac.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // 2. Buscar todas as comissões (nova + legado)
    const [snapVS, snapLeg] = await Promise.all([db.collection("vendas_secretaria").get(), db.collection("clinica_comissoes").get()]);
    const todasComissoes = [...snapVS.docs.map(d => ({
      id: d.id,
      ...d.data(),
      _col: "vendas_secretaria"
    })), ...snapLeg.docs.map(d => ({
      id: d.id,
      ...d.data(),
      _col: "clinica_comissoes"
    }))];
    const comissoesPorPacote = {};
    todasComissoes.forEach(c => {
      if (c.pacoteId) comissoesPorPacote[c.pacoteId] = c;
    });

    // 3. Filtrar pacotes de junho e julho com tipoVenda (particular/recorrente — que geram comissão)
    const mesesAlvo = ["2026-06", "2026-07"];
    const pacotesPagos = todosPacotes.filter(p => {
      const mes = (p.dataInicio || "").slice(0, 7);
      return mesesAlvo.includes(mes) && (p.statusPag || "pendente") === "recebido";
    });
    const pacotesPendentes = todosPacotes.filter(p => {
      const mes = (p.dataInicio || "").slice(0, 7);
      return mesesAlvo.includes(mes) && (p.statusPag || "pendente") !== "recebido";
    });

    // 4. Para pagos: checar se tem comissão
    const pagosComComissao = pacotesPagos.filter(p => comissoesPorPacote[p.id]);
    const pagosSemComissao = pacotesPagos.filter(p => !comissoesPorPacote[p.id]);
    setAuditResultado({
      pacotesPagos,
      pacotesPendentes,
      pagosComComissao,
      pagosSemComissao,
      todasComissoes,
      comissoesPorPacote
    });
    setAuditando(false);
  }
  async function gerarComissaoFaltante(pacote) {
    const tipoVenda = lancamentos.some(l => l.pacienteId === pacote.pacienteId && l.pacoteId !== pacote.id && l.status === "recebido") ? "recorrente" : "primeira";
    await registrarComissao({
      tipo: "Pacote",
      valor: parseFloat(pacote.valorTotal || 0),
      pacienteNome: pacote.pacienteNome || "",
      tipoVenda,
      pacoteId: pacote.id
    });
    // Atualizar resultado
    setAuditResultado(prev => ({
      ...prev,
      pagosSemComissao: prev.pagosSemComissao.filter(p => p.id !== pacote.id),
      pagosComComissao: [...prev.pagosComComissao, pacote]
    }));
  }
  async function gerarTodasFaltantes(lista) {
    if (!confirm(`Gerar ${lista.length} comissão(ões) faltante(s)? Isso vai criar os registros agora.`)) return;
    for (const p of lista) await gerarComissaoFaltante(p);
    alert("✅ Comissões geradas!");
  }
  async function higienizarDuplicatas() {
    if (!confirm("Essa operação vai:\n\n" + "1. Remover comissões DUPLICADAS pelo mesmo pacoteId\n" + "2. Remover comissões com ⚠️ Pacote não encontrado\n" + "3. Preencher mesRef nos registros antigos (restaura histórico de meses)\n\n" + "Confirma?")) return;
    let removidos = 0;
    let orfaos = 0;
    let migrados = 0;

    // Carrega IDs de todos os pacotes existentes para cruzar
    const snapPacotes = await db.collection("clinica_pacotes").get();
    const pacotesExistentes = new Set(snapPacotes.docs.map(d => d.id));

    // ── PASSO 1: Duplicatas em vendas_secretaria ──
    const snapVS = await db.collection("vendas_secretaria").get();
    const porPacoteVS = {};
    snapVS.docs.forEach(d => {
      const pid = d.data().pacoteId;
      if (!pid) return;
      if (!porPacoteVS[pid]) porPacoteVS[pid] = [];
      porPacoteVS[pid].push({
        id: d.id,
        ts: d.data().createdAt?.toMillis?.() || 0
      });
    });
    const bVS = db.batch();
    Object.values(porPacoteVS).forEach(lista => {
      if (lista.length <= 1) return;
      lista.sort((a, b) => b.ts - a.ts);
      lista.slice(1).forEach(r => {
        if (!r.id.startsWith("COM_")) {
          bVS.delete(db.collection("vendas_secretaria").doc(r.id));
          removidos++;
        }
      });
    });
    await bVS.commit();

    // ── PASSO 2: Duplicatas + órfãos em clinica_comissoes ──
    const snapLeg = await db.collection("clinica_comissoes").get();
    const porPacoteLeg = {};
    const bLeg = db.batch();
    let bLegCount = 0;
    snapLeg.docs.forEach(d => {
      const data = d.data();
      const pid = data.pacoteId;

      // Órfão: tem pacoteId mas o pacote não existe mais → remover
      if (pid && !pacotesExistentes.has(pid)) {
        bLeg.delete(db.collection("clinica_comissoes").doc(d.id));
        orfaos++;
        bLegCount++;
        return;
      }

      // Agrupar para detectar duplicatas
      if (!pid) return;
      if (!porPacoteLeg[pid]) porPacoteLeg[pid] = [];
      porPacoteLeg[pid].push({
        id: d.id,
        ts: data.createdAt?.toMillis?.() || 0
      });
    });

    // Duplicatas: manter só o mais recente
    Object.values(porPacoteLeg).forEach(lista => {
      if (lista.length <= 1) return;
      lista.sort((a, b) => b.ts - a.ts);
      lista.slice(1).forEach(r => {
        bLeg.delete(db.collection("clinica_comissoes").doc(r.id));
        removidos++;
        bLegCount++;
      });
    });
    if (bLegCount > 0) await bLeg.commit();

    // ── PASSO 3: Migração de mesRef (restaura histórico de meses) ──
    // Re-ler após limpeza para não tentar migrar docs que foram deletados
    const snapLeg2 = await db.collection("clinica_comissoes").get();
    const bMig = db.batch();
    let bMigCount = 0;
    snapLeg2.docs.forEach(d => {
      const data = d.data();
      if (!data.mesRef) {
        let mesRef = null;
        if (data.createdAt?.toDate) {
          const dt = data.createdAt.toDate();
          mesRef = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        } else if (data.data) {
          mesRef = String(data.data).slice(0, 7);
        }
        if (mesRef) {
          bMig.update(d.ref, {
            mesRef
          });
          migrados++;
          bMigCount++;
        }
      }
    });
    if (bMigCount > 0) await bMig.commit();
    alert("✅ Higienização concluída!\n\n" + `• ${removidos} duplicata(s) removida(s)\n` + `• ${orfaos} comissão(ões) com pacote inexistente removida(s)\n` + `• ${migrados} registro(s) com mesRef preenchido (histórico restaurado)`);
  }
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

  // Meses disponíveis: une nova coleção + legado para mostrar histórico completo
  const meses = [...new Set([...comissoes, ...comissoesLegado].map(c => c.mesRef).filter(Boolean))].sort().reverse();
  // Auto-navegar para o mês mais recente com dados se o atual estiver vazio
  React.useEffect(() => {
    if (meses.length > 0 && !meses.includes(mesSel)) {
      setMesSel(meses[0]);
    }
  }, [meses.join(",")]); // eslint-disable-line

  // Mescla nova coleção + legado para garantir histórico completo
  const todasComissoes = useMemo(() => {
    // Deduplica por pacoteId: prefere registro novo (vendas_secretaria) sobre legado
    const porPacote = {};
    [...comissoesLegado, ...comissoes].forEach(c => {
      const key = c.pacoteId || c.id;
      if (!porPacote[key] || !c._legado) porPacote[key] = c;
    });
    return Object.values(porPacote);
  }, [comissoes, comissoesLegado]);
  const comissoesMes = todasComissoes.filter(c => c.mesRef === mesSel);
  // Secretária: registros sem responsável definido (vendas dela)
  const comissoesSecretaria = comissoesMes.filter(c => !c.responsavel);
  // Repasses: registros com responsável (parceiras, estagiária do social)
  const repassesMes = comissoesMes.filter(c => c.responsavel);
  const responsaveis = [...new Set(repassesMes.map(c => c.responsavel))];

  // Classificar comissões: limpas (entram no ciclo) vs suspeitas (fora do ciclo)
  const comissoesSecretariaPend = comissoesSecretaria.filter(c => c.status !== "pago");
  const comissoesSecretariaPagas = comissoesSecretaria.filter(c => c.status === "pago");
  function isComissaoSuspeita(c) {
    const pacoteVinc = c.pacoteId ? pacotes.find(p => p.id === c.pacoteId) : null;
    // Suspeita 1: pacote existe mas ainda está pendente
    if (pacoteVinc && (pacoteVinc.statusPag || "pendente") !== "recebido") return true;
    // Suspeita 2: valor base diverge do valor total do pacote
    if (pacoteVinc && Math.abs((c.valorBase || 0) - (pacoteVinc.valorTotal || 0)) > 0.01) return true;
    // Suspeita 3: tem pacoteId mas o pacote não existe mais
    if (c.pacoteId && !pacotes.some(p => p.id === c.pacoteId)) return true;
    return false;
  }

  // Apenas comissões limpas entram no ciclo de pagamento da Jéssica
  const comissoesPend = comissoesSecretariaPend.filter(c => !isComissaoSuspeita(c));
  const comissoesSuspeitas = comissoesSecretariaPend.filter(c => isComissaoSuspeita(c));
  const comissoesPagas = comissoesSecretariaPagas;
  const totalPend = comissoesPend.reduce((a, c) => a + (c.valorComissao || 0), 0);
  const totalPagas = comissoesPagas.reduce((a, c) => a + (c.valorComissao || 0), 0);
  const totalComissoes = totalPend + totalPagas;

  // Pagamentos já realizados neste mês (histórico)
  const pagamentosDoMes = lancamentos.filter(l => l.tipo_lancamento === "salario_secretaria" && l.mesRef === mesSel);
  const pagamentoMes = pagamentosDoMes[0] || null;
  const salarioJaPago = !!pagamentoMes;
  // Ciclo atual: salário fixo entra só no 1º pagamento do mês; depois, só comissões novas
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
    // Lança como despesa da clínica
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "despesa",
      tipo: "despesa",
      categoria: "Salário Secretária",
      descricao: salarioJaPago ? "Comissões Secretária (adicional)" : "Salário Secretária",
      centroCusto: "🏥 Clínica",
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
    // Marca apenas as comissões pendentes da secretária como pagas
    const batch = db.batch();
    comissoesPend.forEach(c => {
      // Usa a coleção correta: nova ou legado
      const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
      batch.update(db.collection(col).doc(c.id), {
        status: "pago",
        dataPagamento: hoje
      });
    });
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
    // Lança como despesa da clínica
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
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: ["Comissões — ", config.nomeSecretaria.split(" ")[0]]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: ["Salário fixo R$ ", SALARIO_FIXO.toFixed(2).replace(".", ","), " + comissões por vendas · Repasses a parceiras"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
          onClick: higienizarDuplicatas,
          style: {
            background: "none",
            border: "1px solid #c4b5fd",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            color: "#7c3aed",
            padding: "7px 14px",
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            display: "flex",
            alignItems: "center",
            gap: 5
          },
          title: "Remove registros duplicados de comissão pelo mesmo pacoteId",
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "trash-2",
            size: 13
          }, void 0, false), "🧹 Limpar Duplicatas"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          onClick: auditarComissoes,
          style: {
            background: "#059669",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            color: "white",
            padding: "7px 14px",
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            display: "flex",
            alignItems: "center",
            gap: 5
          },
          title: "Confere pacotes pagos de jun/jul vs registros de comissão",
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "search",
            size: 13
          }, void 0, false), "🔍 Auditar Jun/Jul"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), modalAuditComissao && /*#__PURE__*/_jsxDEV("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 600,
        padding: 20,
        overflowY: "auto"
      },
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 700,
          marginTop: 40
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontWeight: 700,
              fontSize: 18
            },
            children: "🔍 Auditoria de Comissões — Jun/Jul 2026"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModalAuditComissao(false),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "#9ca3af"
            },
            children: "×"
          }, void 0, false)]
        }, void 0, true), auditando ? /*#__PURE__*/_jsxDEV("div", {
          style: {
            textAlign: "center",
            padding: 40,
            color: "var(--text-muted)"
          },
          children: "Analisando pacotes e comissões..."
        }, void 0, false) : auditResultado && (() => {
          const {
            pacotesPagos,
            pacotesPendentes,
            pagosComComissao,
            pagosSemComissao
          } = auditResultado;
          const fmtVal = v => `R$ ${parseFloat(v || 0).toFixed(2).replace(".", ",")}`;
          return /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 12,
                marginBottom: 20
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  background: "#f0fdf4",
                  borderRadius: 10,
                  padding: 14,
                  textAlign: "center"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#16a34a"
                  },
                  children: pacotesPagos.length
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: "#166534"
                  },
                  children: "Pacotes pagos jun/jul"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  background: "#f5f0ff",
                  borderRadius: 10,
                  padding: 14,
                  textAlign: "center"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#7B00C4"
                  },
                  children: pagosComComissao.length
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: "#4c1d95"
                  },
                  children: "Com comissão ✓"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  background: pagosSemComissao.length > 0 ? "#fef2f2" : "#f0fdf4",
                  borderRadius: 10,
                  padding: 14,
                  textAlign: "center",
                  border: pagosSemComissao.length > 0 ? "2px solid #fca5a5" : "none"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 24,
                    fontWeight: 800,
                    color: pagosSemComissao.length > 0 ? "#dc2626" : "#16a34a"
                  },
                  children: pagosSemComissao.length
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: pagosSemComissao.length > 0 ? "#7f1d1d" : "#166534"
                  },
                  children: pagosSemComissao.length > 0 ? "⚠️ Sem comissão!" : "Tudo ok ✓"
                }, void 0, false)]
              }, void 0, true)]
            }, void 0, true), pagosSemComissao.length > 0 && /*#__PURE__*/_jsxDEV("div", {
              style: {
                marginBottom: 20
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#dc2626"
                  },
                  children: "⚠️ Pacotes pagos SEM comissão registrada"
                }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                  onClick: () => gerarTodasFaltantes(pagosSemComissao),
                  style: {
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)"
                  },
                  children: ["✚ Gerar todas (", pagosSemComissao.length, ")"]
                }, void 0, true)]
              }, void 0, true), pagosSemComissao.map(p => /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "#fef2f2",
                  borderRadius: 8,
                  marginBottom: 6,
                  border: "1px solid #fca5a5"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  children: [/*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontWeight: 600,
                      fontSize: 13
                    },
                    children: p.pacienteNome || "—"
                  }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontSize: 11,
                      color: "#6b7280"
                    },
                    children: [p.dataInicio, " · ", fmtVal(p.valorTotal), " · ", p.recorrencia]
                  }, void 0, true)]
                }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                  onClick: () => gerarComissaoFaltante(p),
                  style: {
                    background: "#7B00C4",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)"
                  },
                  children: "✚ Gerar comissão"
                }, void 0, false)]
              }, p.id, true))]
            }, void 0, true), pagosComComissao.length > 0 && /*#__PURE__*/_jsxDEV("div", {
              style: {
                marginBottom: 20
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#059669",
                  marginBottom: 8
                },
                children: "✓ Pacotes com comissão registrada"
              }, void 0, false), pagosComComissao.map(p => {
                const com = auditResultado.comissoesPorPacote[p.id];
                return /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#f0fdf4",
                    borderRadius: 8,
                    marginBottom: 6,
                    border: "1px solid #6ee7b7"
                  },
                  children: [/*#__PURE__*/_jsxDEV("div", {
                    children: [/*#__PURE__*/_jsxDEV("div", {
                      style: {
                        fontWeight: 600,
                        fontSize: 13
                      },
                      children: p.pacienteNome || "—"
                    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        fontSize: 11,
                        color: "#6b7280"
                      },
                      children: [p.dataInicio, " · ", fmtVal(p.valorTotal)]
                    }, void 0, true)]
                  }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      textAlign: "right"
                    },
                    children: [/*#__PURE__*/_jsxDEV("div", {
                      style: {
                        fontSize: 11,
                        color: "#059669",
                        fontWeight: 600
                      },
                      children: ["✓ Comissão: ", fmtVal(com?.valorComissao)]
                    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        fontSize: 10,
                        color: "#9ca3af"
                      },
                      children: com?.status === "pago" ? "Paga" : "Pendente"
                    }, void 0, false)]
                  }, void 0, true)]
                }, p.id, true);
              })]
            }, void 0, true), pacotesPendentes.length > 0 && /*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#b45309",
                  marginBottom: 8
                },
                children: ["⏳ Pacotes ainda pendentes de pagamento (", pacotesPendentes.length, ")"]
              }, void 0, true), pacotesPendentes.map(p => /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  background: "#fffbeb",
                  borderRadius: 8,
                  marginBottom: 4,
                  border: "1px solid #fde68a"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  children: [/*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontWeight: 600,
                      fontSize: 13
                    },
                    children: p.pacienteNome || "—"
                  }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontSize: 11,
                      color: "#6b7280"
                    },
                    children: [p.dataInicio, " · ", fmtVal(p.valorTotal)]
                  }, void 0, true)]
                }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 11,
                    color: "#b45309",
                    fontWeight: 600
                  },
                  children: "Comissão entra ao pagar"
                }, void 0, false)]
              }, p.id, true))]
            }, void 0, true)]
          }, void 0, true);
        })()]
      }, void 0, true)
    }, void 0, false), (() => {
      const listaMeses = meses.length > 0 ? meses : [mesSel];
      const idxAtual = listaMeses.indexOf(mesSel);
      const irAntes = () => {
        if (idxAtual < listaMeses.length - 1) setMesSel(listaMeses[idxAtual + 1]);
      };
      const irProx = () => {
        if (idxAtual > 0) setMesSel(listaMeses[idxAtual - 1]);
      };
      return /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
          onClick: irAntes,
          disabled: idxAtual >= listaMeses.length - 1,
          style: {
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "var(--purple)",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: idxAtual >= listaMeses.length - 1 ? 0.3 : 1
          },
          children: "‹"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 6,
            overflowX: "auto",
            flex: 1,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch"
          },
          children: listaMeses.map(m => /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setMesSel(m),
            style: {
              padding: "6px 14px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
              background: m === mesSel ? "var(--purple)" : "var(--gray-100)",
              color: m === mesSel ? "white" : "var(--text)",
              display: Math.abs(listaMeses.indexOf(m) - idxAtual) <= 2 ? "flex" : "none",
              alignItems: "center"
            },
            children: getMesLabel(m)
          }, m, false))
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
          onClick: irProx,
          disabled: idxAtual <= 0,
          style: {
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "var(--purple)",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: idxAtual <= 0 ? 0.3 : 1
          },
          children: "›"
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          style: {
            fontSize: 12,
            color: "var(--text-muted)",
            flexShrink: 0
          },
          children: [idxAtual + 1, "/", listaMeses.length]
        }, void 0, true)]
      }, void 0, true);
    })(), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        padding: "16px 20px",
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14
          },
          children: "⚙️ Configurações de Salário e Percentuais"
        }, void 0, false), !editandoConfig ? /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: "✏️ Editar"
        }, void 0, false) : /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 8
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
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
            },
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
            },
            children: salvandoConfig ? "Salvando..." : "💾 Salvar"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true), !editandoConfig ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 24px",
          marginTop: 12,
          fontSize: 13,
          color: "#374151"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          children: ["👩‍💼 Secretária: ", /*#__PURE__*/_jsxDEV("strong", {
            children: config.nomeSecretaria
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          children: ["💵 Salário fixo: ", /*#__PURE__*/_jsxDEV("strong", {
            children: ["R$ ", SALARIO_FIXO.toFixed(2).replace(".", ",")]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          children: ["🌟 Primeira venda: ", /*#__PURE__*/_jsxDEV("strong", {
            children: [config.percPrimeira, "%"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          children: ["🔁 Recorrente: ", /*#__PURE__*/_jsxDEV("strong", {
            children: [config.percRecorrente, "%"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          children: ["🤝 Parceiro (padrão): ", /*#__PURE__*/_jsxDEV("strong", {
            children: [config.percParceiroPadrao, "%"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 12,
          marginTop: 14
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Nome da secretária"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: formConfig.nomeSecretaria,
            onChange: e => setFormConfig({
              ...formConfig,
              nomeSecretaria: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Salário fixo (R$)"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            value: formConfig.salarioFixo,
            onChange: e => setFormConfig({
              ...formConfig,
              salarioFixo: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "% primeira venda"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            value: formConfig.percPrimeira,
            onChange: e => setFormConfig({
              ...formConfig,
              percPrimeira: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "% recorrente"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            value: formConfig.percRecorrente,
            onChange: e => setFormConfig({
              ...formConfig,
              percRecorrente: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "% parceiro padrão"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            value: formConfig.percParceiroPadrao,
            onChange: e => setFormConfig({
              ...formConfig,
              percParceiroPadrao: e.target.value
            })
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 11,
          color: "var(--text-muted)",
          marginTop: 10
        },
        children: "Os novos percentuais valem para as próximas vendas; comissões já registradas não mudam."
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
        gap: 16,
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "var(--gray-50)",
          borderRadius: 14,
          padding: "18px 20px",
          border: "1px solid var(--gray-200)"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 6
          },
          children: "Salário Fixo"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text)"
          },
          children: ["R$ ", SALARIO_FIXO.toFixed(2).replace(".", ",")]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "var(--gray-50)",
          borderRadius: 14,
          padding: "18px 20px",
          border: "1px solid var(--gray-200)"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 6
          },
          children: "Comissões Pendentes"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 22,
            fontWeight: 700,
            color: "#7B00C4"
          },
          children: ["R$ ", totalPend.toFixed(2).replace(".", ",")]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4
          },
          children: [comissoesPend.length, " venda(s) nova(s)", totalPagas > 0 && /*#__PURE__*/_jsxDEV("span", {
            style: {
              color: "#16a34a"
            },
            children: [" · ✓ R$ ", totalPagas.toFixed(2).replace(".", ","), " já pagas no mês"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: totalAPagar === 0 ? "#f0fdf4" : "#faf5ff",
          borderRadius: 14,
          padding: "18px 20px",
          border: `2px solid ${totalAPagar === 0 ? "#16a34a" : "#7B00C4"}`
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 6
          },
          children: ["Total a Pagar ", salarioJaPago ? "(novo ciclo)" : ""]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 26,
            fontWeight: 800,
            color: totalAPagar === 0 ? "#16a34a" : "#7B00C4"
          },
          children: totalAPagar === 0 ? "✓ Tudo pago" : `R$ ${totalAPagar.toFixed(2).replace(".", ",")}`
        }, void 0, false), pagamentoMes && /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "#16a34a",
            marginTop: 4,
            fontWeight: 600
          },
          children: ["Último pagamento em ", pagamentosDoMes[0].data?.split("-").reverse().join("/"), " · ", pagamentosDoMes.length, " pagamento(s) no mês"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 10,
        marginBottom: 24,
        flexWrap: "wrap",
        alignItems: "center"
      },
      children: [totalAPagar > 0 && (salarioJaPago ? comissoesPend.length > 0 : true) && /*#__PURE__*/_jsxDEV("button", {
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
          fontFamily: "var(--font-body)"
        },
        children: pagando ? "Registrando..." : `💰 ${salarioJaPago ? "Pagar Comissões Novas" : "Registrar Pagamento"} — R$ ${totalAPagar.toFixed(2).replace(".", ",")}`
      }, void 0, false), (() => {
        const [showGrat, setShowGrat] = React.useState(false);
        const [valGrat, setValGrat] = React.useState("");
        const [obsGrat, setObsGrat] = React.useState("");
        const [salvGrat, setSalvGrat] = React.useState(false);
        async function registrarGratificacao() {
          const valor = parseFloat(valGrat);
          if (!valor || valor <= 0) {
            alert("Informe um valor válido.");
            return;
          }
          if (!obsGrat.trim()) {
            alert("Informe o motivo da gratificação.");
            return;
          }
          setSalvGrat(true);
          try {
            const hoje = new Date();
            const mesRef = mesSel;
            // Registra como comissão especial em vendas_secretaria
            await db.collection("vendas_secretaria").add({
              tipo: "Gratificação",
              tipoVenda: "gratificacao",
              perc: 0,
              valorBase: valor,
              valorComissao: valor,
              pacienteNome: `🎁 ${obsGrat.trim()}`,
              mesRef,
              pacoteId: null,
              status: "pendente",
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // Registra também como lançamento financeiro (despesa)
            await db.collection("clinica_lancamentos").add({
              tipo: "despesa",
              tipo_lancamento: "despesa",
              categoria: "Salários",
              descricao: `Gratificação — ${config.nomeSecretaria} — ${obsGrat.trim()}`,
              valor,
              data: hoje.toISOString().slice(0, 10),
              centroCusto: "🏥 Clínica",
              mes: mesRef,
              formaPag: "PIX",
              status: "pago",
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setShowGrat(false);
            setValGrat("");
            setObsGrat("");
            alert(`✅ Gratificação de R$ ${valor.toFixed(2).replace(".", ",")} registrada com sucesso!`);
          } catch (e) {
            alert("Erro: " + e.message);
          }
          setSalvGrat(false);
        }
        return /*#__PURE__*/_jsxDEV("div", {
          children: [/*#__PURE__*/_jsxDEV("button", {
            onClick: () => setShowGrat(s => !s),
            style: {
              background: "none",
              border: "2px solid #7B00C4",
              color: "#7B00C4",
              borderRadius: 10,
              padding: "11px 18px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              display: "flex",
              alignItems: "center",
              gap: 6
            },
            children: "🎁 Registrar Gratificação"
          }, void 0, false), showGrat && /*#__PURE__*/_jsxDEV("div", {
            style: {
              marginTop: 10,
              background: "#f5f0ff",
              border: "1px solid #c4b5fd",
              borderRadius: 12,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minWidth: 280
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                fontWeight: 700,
                color: "#7B00C4"
              },
              children: ["🎁 Gratificação para ", config.nomeSecretaria]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("label", {
                style: {
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4
                },
                children: "VALOR (R$)"
              }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                type: "number",
                value: valGrat,
                onChange: e => setValGrat(e.target.value),
                placeholder: "Ex: 50",
                style: {
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #c4b5fd",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "var(--font-body)"
                }
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("label", {
                style: {
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4
                },
                children: "MOTIVO"
              }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                type: "text",
                value: obsGrat,
                onChange: e => setObsGrat(e.target.value),
                placeholder: "Ex: Ajuste jul/26 — diferença 10%→5%",
                style: {
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #c4b5fd",
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "var(--font-body)"
                }
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 8
              },
              children: [/*#__PURE__*/_jsxDEV("button", {
                onClick: registrarGratificacao,
                disabled: salvGrat,
                style: {
                  flex: 1,
                  background: "#7B00C4",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)"
                },
                children: salvGrat ? "Salvando..." : "✓ Confirmar"
              }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                onClick: () => setShowGrat(false),
                style: {
                  padding: "9px 14px",
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "var(--font-body)"
                },
                children: "Cancelar"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true);
      })()]
    }, void 0, true), (() => {
      function gerarRecibo() {
        const mesLabel = getMesLabel(mesSel);
        const nomeSecretary = config.nomeSecretaria || "Secretária";
        // Inclui tanto pendentes quanto pagas do mês para o recibo histórico
        const itensPend = comissoesPend.map(c => ({
          desc: `${c.tipoVenda === "primeira" ? "1ª venda" : "Recorrente"} — ${c.pacienteNome || "Paciente"} (${c.perc || 10}%)`,
          valor: c.valorComissao || 0,
          status: "pendente"
        }));
        const itensPagos = comissoesPagas.map(c => ({
          desc: `${c.tipoVenda === "primeira" ? "1ª venda" : "Recorrente"} — ${c.pacienteNome || "Paciente"} (${c.perc || 10}%)`,
          valor: c.valorComissao || 0,
          status: "pago"
        }));
        const todoItens = [...itensPend, ...itensPagos];
        const totalRecibo = SALARIO_FIXO + todoItens.reduce((a, i) => a + i.valor, 0);
        const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Recibo de Pagamento — ${nomeSecretary} — ${mesLabel}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;padding:40px;max-width:620px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:3px solid #7B00C4;margin-bottom:24px}
.logo{font-family:Georgia,serif;font-size:22px;color:#7B00C4;font-weight:700}
.sub{font-size:10px;color:#6b7280;margin-top:3px}
h2{font-size:18px;color:#111827;margin-bottom:4px}
.mes{font-size:13px;color:#7B00C4;font-weight:600;margin-bottom:20px}
p{font-size:13px;color:#374151;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px}
th{background:#7B00C4;color:white;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase}
td{padding:8px 12px;border-bottom:1px solid #f3f4f6}
tr:nth-child(even) td{background:#fafafa}
.total-row td{font-weight:700;font-size:14px;border-top:2px solid #7B00C4;background:#f5f0ff;color:#7B00C4}
.assinatura{margin-top:40px;display:flex;justify-content:space-between;gap:40px}
.assinatura-bloco{flex:1;text-align:center}
.linha{border-top:1px solid #374151;margin-bottom:6px;margin-top:40px}
.nome-assinatura{font-size:12px;font-weight:600}
.cargo-assinatura{font-size:10px;color:#6b7280}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
@media print{body{padding:20px}@page{margin:1.5cm}}
</style></head><body>
<div class="header">
  <div><div class="logo">Dra. Lucia Kratz</div><div class="sub">CRP 09/20590 · Psicóloga · Goiânia, GO</div></div>
  <div style="font-size:10px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        })}</div>
</div>
<h2>Recibo de Pagamento</h2>
<div class="mes">${mesLabel}</div>
<p>Declaro o recebimento da importância de <strong>R$ ${totalRecibo.toFixed(2).replace(".", ",")}</strong> referente à competência <strong>${mesLabel}</strong>:</p>
<table>
  <thead><tr><th>Descrição</th><th style="text-align:right;width:120px">Valor</th></tr></thead>
  <tbody>
    <tr><td>Salário Fixo</td><td style="text-align:right">R$ ${SALARIO_FIXO.toFixed(2).replace(".", ",")}</td></tr>
    ${todoItens.map(i => `<tr><td>${i.desc}</td><td style="text-align:right">R$ ${i.valor.toFixed(2).replace(".", ",")}</td></tr>`).join("")}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">R$ ${totalRecibo.toFixed(2).replace(".", ",")}</td></tr>
  </tbody>
</table>
<div class="assinatura">
  <div class="assinatura-bloco"><div class="linha"></div><div class="nome-assinatura">${nomeSecretary}</div><div class="cargo-assinatura">Secretária — Recebedor(a)</div></div>
  <div class="assinatura-bloco"><div class="linha"></div><div class="nome-assinatura">Dra. Lucia Kratz</div><div class="cargo-assinatura">CRP 09/20590 — Pagador(a)</div></div>
</div>
<div class="footer">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        })} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
        const w = window.open("", "_blank");
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 800);
      }
      return /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginBottom: 16
        },
        children: /*#__PURE__*/_jsxDEV("button", {
          onClick: gerarRecibo,
          style: {
            background: "white",
            color: "#7B00C4",
            border: "2px solid #7B00C4",
            borderRadius: 10,
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            display: "flex",
            alignItems: "center",
            gap: 6
          },
          children: ["🖨️ Gerar Recibo — ", getMesLabel(mesSel)]
        }, void 0, true)
      }, void 0, false);
    })(), /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        overflow: "hidden"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-200)",
          fontWeight: 700,
          fontSize: 14
        },
        children: ["🔄 Ciclo Atual (a pagar) — ", config.nomeSecretaria.split(" ")[0], " — ", getMesLabel(mesSel)]
      }, void 0, true), comissoesPend.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "30px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13
        },
        children: "✓ Nenhuma comissão pendente — novas vendas aparecem aqui e reabrem o pagamento"
      }, void 0, false) : comissoesPend.map(c => {
        const dataStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("pt-BR") : c.mesRef || "—";
        return /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid var(--gray-100)",
            background: "white"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600,
                fontSize: 14
              },
              children: c.pacienteNome || "—"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 2
              },
              children: [c.tipo, " · ", dataStr]
            }, void 0, true), c.pacoteId && /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 10,
                color: "#9ca3af",
                marginTop: 1
              },
              children: ["Pacote: ", c.pacoteId.slice(0, 8), "..."]
            }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 11,
                fontWeight: 700,
                color: corTipoVenda(c.tipoVenda),
                background: corTipoVenda(c.tipoVenda) + "18",
                padding: "2px 8px",
                borderRadius: 20,
                display: "inline-block",
                marginTop: 4
              },
              children: labelTipoVenda(c.tipoVenda)
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                textAlign: "right"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)"
                },
                children: ["Base: R$ ", (c.valorBase || 0).toFixed(2).replace(".", ",")]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#7B00C4"
                },
                children: ["+R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")]
              }, void 0, true)]
            }, void 0, true), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("button", {
              title: "Excluir comissão",
              onClick: async () => {
                if (!confirm(`Excluir comissão de ${c.pacienteNome} (R$ ${(c.valorComissao || 0).toFixed(2).replace(".", ",")})?`)) return;
                const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
                await db.collection(col).doc(c.id).delete();
              },
              style: {
                background: "none",
                border: "1px solid #fca5a5",
                borderRadius: 6,
                color: "#dc2626",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: 11
              },
              children: "🗑️"
            }, void 0, false)]
          }, void 0, true)]
        }, c.id, true);
      })]
    }, void 0, true), comissoesSuspeitas.length > 0 && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "#fffbeb",
        borderRadius: 14,
        border: "1px solid #fde68a",
        overflow: "hidden",
        marginTop: 16
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "12px 20px",
          borderBottom: "1px solid #fde68a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          style: {
            fontWeight: 700,
            fontSize: 13,
            color: "#b45309"
          },
          children: ["⏳ Aguardando pagamento do pacote — ", comissoesSuspeitas.length, " comissão(ões) fora do ciclo"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          style: {
            fontSize: 11,
            color: "#92400e"
          },
          children: "Entram automaticamente quando o pacote for marcado como pago"
        }, void 0, false)]
      }, void 0, true), comissoesSuspeitas.map(c => {
        const pacoteVinc = c.pacoteId ? pacotes.find(p => p.id === c.pacoteId) : null;
        const semPacote = c.pacoteId && !pacoteVinc;
        const dataStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("pt-BR") : c.mesRef || "-";
        return /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderBottom: "1px solid #fef3c7"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#78350f"
                },
                children: c.pacienteNome || "-"
              }, void 0, false), semPacote && /*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontSize: 10,
                  background: "#fca5a5",
                  color: "#7f1d1d",
                  padding: "1px 6px",
                  borderRadius: 8,
                  fontWeight: 700
                },
                children: "Pacote removido"
              }, void 0, false), pacoteVinc && /*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontSize: 10,
                  background: "#fed7aa",
                  color: "#7c2d12",
                  padding: "1px 6px",
                  borderRadius: 8,
                  fontWeight: 600
                },
                children: ["Pacote pendente · R$ ", (pacoteVinc.valorTotal || 0).toFixed(2).replace(".", ",")]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: "#92400e",
                marginTop: 2
              },
              children: [c.tipo, " · ", dataStr]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                textAlign: "right"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#92400e"
                },
                children: "Comissão prevista"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#b45309"
                },
                children: ["R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")]
              }, void 0, true)]
            }, void 0, true), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("button", {
              title: "Remover do sistema",
              onClick: async () => {
                if (!confirm(`Remover comissão de ${c.pacienteNome}? Ela será gerada novamente quando o pacote for pago.`)) return;
                const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
                await db.collection(col).doc(c.id).delete();
              },
              style: {
                background: "none",
                border: "1px solid #fca5a5",
                borderRadius: 6,
                color: "#dc2626",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: 11
              },
              children: "🗑️"
            }, void 0, false)]
          }, void 0, true)]
        }, c.id, true);
      })]
    }, void 0, true), (comissoesPagas.length > 0 || pagamentosDoMes.length > 0) && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        overflow: "hidden",
        marginTop: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-200)",
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          justifyContent: "space-between"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          children: ["✓ Histórico — ", getMesLabel(mesSel)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          style: {
            fontSize: 13,
            color: "#16a34a",
            fontWeight: 600
          },
          children: ["R$ ", totalPagas.toFixed(2).replace(".", ","), " em comissões pagas"]
        }, void 0, true)]
      }, void 0, true), pagamentosDoMes.length > 0 && /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "10px 20px",
          background: "#f0fdf4",
          borderBottom: "1px solid var(--gray-100)"
        },
        children: pagamentosDoMes.map(pg => /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            padding: "4px 0"
          },
          children: [/*#__PURE__*/_jsxDEV("span", {
            style: {
              color: "#166534"
            },
            children: ["💰 ", pg.tipo, " — ", pg.data?.split("-").reverse().join("/"), pg.qtdComissoes ? ` · ${pg.qtdComissoes} comissão(ões)` : "", (pg.valorSalarioFixo || 0) > 0 ? ` · inclui salário fixo` : ""]
          }, void 0, true), /*#__PURE__*/_jsxDEV("strong", {
            style: {
              color: "#166534"
            },
            children: ["R$ ", (pg.valor || 0).toFixed(2).replace(".", ",")]
          }, void 0, true)]
        }, pg.id, true))
      }, void 0, false), comissoesPagas.map(c => /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          borderBottom: "1px solid var(--gray-100)",
          opacity: 0.75
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontWeight: 600,
              fontSize: 13
            },
            children: c.pacienteNome || "—"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 11,
              color: "var(--text-muted)"
            },
            children: [c.tipo, " · ", labelTipoVenda(c.tipoVenda), " · pago em ", c.dataPagamento ? c.dataPagamento.split("-").reverse().join("/") : "—"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            color: "#16a34a"
          },
          children: ["✓ R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")]
        }, void 0, true)]
      }, c.id, true))]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        overflow: "hidden",
        marginTop: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-200)",
          fontWeight: 700,
          fontSize: 14
        },
        children: ["🤝 Repasses a Parceiras — ", getMesLabel(mesSel)]
      }, void 0, true), responsaveis.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "30px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13
        },
        children: "Nenhum repasse neste mês. Vendas em parceria aparecem aqui automaticamente."
      }, void 0, false) : responsaveis.map(resp => {
        const itens = repassesMes.filter(c => c.responsavel === resp);
        const totalResp = itens.reduce((a, c) => a + (c.valorComissao || 0), 0);
        const pendentes = itens.filter(c => c.status !== "pago");
        const totalPend = pendentes.reduce((a, c) => a + (c.valorComissao || 0), 0);
        const parc = parceiras.find(p => p.nome === resp);
        return /*#__PURE__*/_jsxDEV("div", {
          style: {
            borderBottom: "1px solid var(--gray-100)"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              background: "#fffbeb",
              flexWrap: "wrap",
              gap: 10
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14
                },
                children: resp
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)"
                },
                children: [itens.length, " venda(s) · Total R$ ", totalResp.toFixed(2).replace(".", ","), parc?.pix ? ` · PIX: ${parc.pix}` : ""]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  textAlign: "right"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--text-muted)"
                  },
                  children: "Pendente"
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontWeight: 800,
                    fontSize: 18,
                    color: totalPend > 0 ? "#b45309" : "#16a34a"
                  },
                  children: ["R$ ", totalPend.toFixed(2).replace(".", ",")]
                }, void 0, true)]
              }, void 0, true), user.tipo === "psicologa" && totalPend > 0 && /*#__PURE__*/_jsxDEV("button", {
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
                },
                children: pagando ? "..." : "💸 Marcar como pago"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), itens.map(c => /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 20px",
              borderTop: "1px solid var(--gray-100)"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 600,
                  fontSize: 13
                },
                children: c.pacienteNome || "—"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "var(--text-muted)"
                },
                children: [c.tipo, " · ", c.perc ? `${c.perc}% de R$ ${(c.valorBase || 0).toFixed(2).replace(".", ",")}` : ""]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                textAlign: "right"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#b45309"
                },
                children: ["R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")]
              }, void 0, true), c.status === "pago" ? /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#16a34a",
                  fontWeight: 600
                },
                children: ["✓ Pago ", c.dataPagamento ? c.dataPagamento.split("-").reverse().join("/") : ""]
              }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#b45309",
                  fontWeight: 600
                },
                children: "Pendente"
              }, void 0, false)]
            }, void 0, true)]
          }, c.id, true))]
        }, resp, true);
      })]
    }, void 0, true), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        overflow: "hidden",
        marginTop: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-200)",
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          children: "Parceiras Cadastradas"
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: "+ Nova Parceira"
        }, void 0, false)]
      }, void 0, true), parceiras.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "30px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13
        },
        children: "Nenhuma parceira cadastrada. Cadastre para usar nas vendas em parceria."
      }, void 0, false) : parceiras.map(p => /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          borderBottom: "1px solid var(--gray-100)"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontWeight: 600,
              fontSize: 14
            },
            children: [p.nome, " ", p.tipo === "estagiaria" && /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 10,
                fontWeight: 700,
                background: "#ccfbf1",
                color: "#0d9488",
                padding: "2px 8px",
                borderRadius: 10,
                marginLeft: 6
              },
              children: "Estagiária"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              color: "var(--text-muted)"
            },
            children: ["Repasse padrão: ", p.percentual || config.percParceiroPadrao, "% ", p.pix ? ` · PIX: ${p.pix}` : ""]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 6
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
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
            },
            children: "✏️"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
            },
            children: "🗑️"
          }, void 0, false)]
        }, void 0, true)]
      }, p.id, true))]
    }, void 0, true), modalParceira && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModalParceira(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 420
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 20
          },
          children: editandoParceira ? "Editar Parceira" : "Nova Parceira"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Nome"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: formParceira.nome,
            onChange: e => setFormParceira({
              ...formParceira,
              nome: e.target.value
            }),
            placeholder: "Ex: Thais Cordeiro"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "% de repasse padrão"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            min: "0",
            max: "100",
            value: formParceira.percentual,
            onChange: e => setFormParceira({
              ...formParceira,
              percentual: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Chave PIX (opcional)"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: formParceira.pix,
            onChange: e => setFormParceira({
              ...formParceira,
              pix: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Tipo"
          }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
            className: "form-input",
            value: formParceira.tipo,
            onChange: e => setFormParceira({
              ...formParceira,
              tipo: e.target.value
            }),
            children: [/*#__PURE__*/_jsxDEV("option", {
              value: "parceira",
              children: "Parceira (vendas em parceria)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
              value: "estagiaria",
              children: "Estagiária (projeto social)"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModalParceira(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: salvarParceira,
            children: editandoParceira ? "Salvar alterações" : "Salvar"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}
function Depoimentos() {
  const [lista, setLista] = useState([]);
  const [aba, setAba] = useState("pendente");
  const [salvando, setSalvando] = useState(null);
  const [respostaEdit, setRespostaEdit] = useState({});
  const [salvandoResposta, setSalvandoResposta] = useState(null);
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
  async function salvarResposta(id) {
    const texto = (respostaEdit[id] || "").trim();
    setSalvandoResposta(id);
    await db.collection("site_depoimentos").doc(id).update({
      resposta: texto
    });
    setSalvandoResposta(null);
  }
  function Estrelas({
    n
  }) {
    return /*#__PURE__*/_jsxDEV("span", {
      style: {
        color: "#7B00C4",
        fontSize: 16,
        letterSpacing: 2
      },
      children: ["★".repeat(n || 5), "☆".repeat(5 - (n || 5))]
    }, void 0, true);
  }
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 12
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Depoimentos"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: "Gerencie os depoimentos do site"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        },
        children: [/*#__PURE__*/_jsxDEV("a", {
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
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "external-link",
            size: 14
          }, void 0, false), " Ver formulário"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 13
          },
          onClick: () => {
            navigator.clipboard.writeText("https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/feedback/");
            alert("Link copiado!");
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "copy",
            size: 14
          }, void 0, false), " Copiar link"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("a", {
          href: "../depoimentos/",
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
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "star",
            size: 14
          }, void 0, false), " Página depoimentos"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 13
          },
          onClick: () => {
            navigator.clipboard.writeText("https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/depoimentos/");
            alert("Link copiado!");
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "link",
            size: 14
          }, void 0, false), " Copiar link"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 0,
        marginBottom: 20,
        borderBottom: "2px solid var(--gray-200)"
      },
      children: [["pendente", "⏳ Pendentes", pendentes], ["aprovado", "✓ Aprovados", lista.filter(d => d.status === "aprovado").length], ["rejeitado", "✗ Rejeitados", lista.filter(d => d.status === "rejeitado").length]].map(([id, label, count]) => /*#__PURE__*/_jsxDEV("button", {
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
        },
        children: [label, count > 0 && /*#__PURE__*/_jsxDEV("span", {
          style: {
            background: id === "pendente" ? "#dc2626" : "var(--purple-soft)",
            color: id === "pendente" ? "white" : "var(--purple)",
            borderRadius: 20,
            padding: "1px 7px",
            fontSize: 11,
            fontWeight: 700
          },
          children: count
        }, void 0, false)]
      }, id, true))
    }, void 0, false), filtrado.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        textAlign: "center",
        padding: 48,
        color: "var(--text-muted)"
      },
      children: [/*#__PURE__*/_jsxDEV(Icon, {
        name: "star",
        size: 40
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginTop: 12,
          fontWeight: 500
        },
        children: aba === "pendente" ? "Nenhum depoimento aguardando aprovação" : aba === "aprovado" ? "Nenhum depoimento aprovado ainda" : "Nenhum depoimento rejeitado"
      }, void 0, false)]
    }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      children: filtrado.map(d => /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: "20px 24px"
        },
        children: /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
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
                },
                children: (d.nome || "?")[0].toUpperCase()
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontWeight: 700,
                    fontSize: 15
                  },
                  children: d.nome
                }, void 0, false), d.cargo && /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: "var(--text-muted)"
                  },
                  children: d.cargo
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV(Estrelas, {
                n: d.estrelas
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("p", {
              style: {
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.7,
                fontStyle: "italic"
              },
              children: ["\"", d.texto, "\""]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: "var(--text-muted)",
                marginTop: 8
              },
              children: d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              }) : ""
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                marginTop: 14,
                background: "var(--purple-bg,#f5eeff)",
                borderRadius: 10,
                padding: 14
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--purple)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                },
                children: [/*#__PURE__*/_jsxDEV(Icon, {
                  name: "message-circle",
                  size: 14
                }, void 0, false), " Sua resposta (aparece no site)"]
              }, void 0, true), /*#__PURE__*/_jsxDEV("textarea", {
                className: "form-input",
                style: {
                  width: "100%",
                  minHeight: 60,
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                  resize: "vertical"
                },
                placeholder: "Escreva aqui sua resposta pública a este depoimento...",
                value: respostaEdit[d.id] !== undefined ? respostaEdit[d.id] : d.resposta || "",
                onChange: e => setRespostaEdit(prev => ({
                  ...prev,
                  [d.id]: e.target.value
                }))
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 8
                },
                children: /*#__PURE__*/_jsxDEV("button", {
                  className: "btn btn-purple",
                  style: {
                    fontSize: 12,
                    padding: "6px 14px"
                  },
                  onClick: () => salvarResposta(d.id),
                  disabled: salvandoResposta === d.id,
                  children: [/*#__PURE__*/_jsxDEV(Icon, {
                    name: "save",
                    size: 13
                  }, void 0, false), " ", salvandoResposta === d.id ? "Salvando..." : "Salvar resposta"]
                }, void 0, true)
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 8,
              flexShrink: 0
            },
            children: [aba === "pendente" && /*#__PURE__*/_jsxDEV(_Fragment, {
              children: [/*#__PURE__*/_jsxDEV("button", {
                className: "btn btn-purple",
                style: {
                  fontSize: 12,
                  padding: "7px 14px"
                },
                onClick: () => aprovar(d.id),
                disabled: salvando === d.id,
                children: [/*#__PURE__*/_jsxDEV(Icon, {
                  name: "check",
                  size: 13
                }, void 0, false), " ", salvando === d.id ? "..." : "Aprovar"]
              }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                className: "btn btn-ghost",
                style: {
                  fontSize: 12,
                  padding: "7px 14px",
                  color: "#dc2626",
                  borderColor: "#fca5a5"
                },
                onClick: () => rejeitar(d.id),
                children: [/*#__PURE__*/_jsxDEV(Icon, {
                  name: "x",
                  size: 13
                }, void 0, false), " Rejeitar"]
              }, void 0, true)]
            }, void 0, true), aba === "rejeitado" && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              style: {
                fontSize: 12,
                padding: "7px 14px"
              },
              onClick: () => aprovar(d.id),
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "check",
                size: 13
              }, void 0, false), " Aprovar mesmo assim"]
            }, void 0, true), aba === "aprovado" && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                fontSize: 12,
                padding: "7px 14px",
                color: "#dc2626",
                borderColor: "#fca5a5"
              },
              onClick: () => rejeitar(d.id),
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "x",
                size: 13
              }, void 0, false), " Remover do site"]
            }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                fontSize: 12,
                padding: "7px 10px",
                color: "#dc2626"
              },
              onClick: () => excluir(d.id),
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: "trash-2",
                size: 13
              }, void 0, false)
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)
      }, d.id, false))
    }, void 0, false)]
  }, void 0, true);
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
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "page-title",
        children: "Configuracoes"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        className: "page-subtitle",
        children: "Personalize sua identidade clinica e documentos"
      }, void 0, false)]
    }, void 0, true), msg && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "var(--purple-bg)",
        border: "1px solid var(--purple)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 20,
        fontSize: 14,
        color: "var(--purple)",
        fontWeight: 500
      },
      children: msg
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 4
        },
        children: "Identidade Visual"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 20
        },
        children: "Logotipo e assinatura digital para laudos e documentos oficiais."
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 14
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--gray-200)"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 44,
              height: 44,
              background: "var(--purple-soft)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "image",
              size: 22
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600
              },
              children: "Logo / Identidade Visual"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                color: "var(--text-muted)"
              },
              children: "Logotipo que aparecera no cabecalho dos laudos e documentos oficiais. Formatos aceitos: PNG, JPG, SVG."
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-outline",
            style: {
              fontSize: 13
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "upload",
              size: 14
            }, void 0, false), " Enviar Logo"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--gray-200)"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 44,
              height: 44,
              background: "#f5f3ff",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "pen-line",
              size: 22
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600
              },
              children: "Assinatura Digital"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                color: "var(--text-muted)"
              },
              children: "Imagem da sua assinatura manuscrita para uso nos laudos assinados. Recomendado fundo transparente (PNG)."
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-outline",
            style: {
              fontSize: 13
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "upload",
              size: 14
            }, void 0, false), " Enviar Assinatura"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--gray-200)",
            background: "var(--gray-50)"
          },
          children: [/*#__PURE__*/_jsxDEV("img", {
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
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600
              },
              children: "Logo Padrao do Sistema"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                color: "var(--text-muted)"
              },
              children: "Esta e a logo padrao. Ela e usada automaticamente enquanto voce nao enviar uma logo personalizada."
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                marginTop: 4
              },
              children: [/*#__PURE__*/_jsxDEV("strong", {
                children: "Dra. Lucia Kratz"
              }, void 0, false), " · Psicologa Doutora · CRP 09/20590"]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 4
        },
        children: "Sobre os Laudos"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 16,
          lineHeight: 1.7
        },
        children: "Os laudos gerados seguem a Resolucao CFP no 06/2019. Ao clicar em \"Assinar Laudo\", o documento recebe um registro de data/hora da assinatura e sua assinatura digital."
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "var(--purple-bg)",
          borderRadius: 10,
          padding: 16
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 600,
            marginBottom: 12
          },
          children: "Tipos de Laudo disponíveis"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 14
          },
          children: tiposLaudo.map((t, i) => /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "white",
              borderRadius: 8,
              padding: "10px 14px",
              border: "1px solid var(--gray-200)"
            },
            children: [/*#__PURE__*/_jsxDEV("span", {
              style: {
                flex: 1,
                fontSize: 14
              },
              children: t
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              style: {
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--gray-400)",
                padding: 4
              },
              onClick: () => setTiposLaudo(prev => prev.filter((_, idx) => idx !== i)),
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: "x",
                size: 14
              }, void 0, false)
            }, void 0, false)]
          }, i, true))
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10
          },
          children: [/*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            style: {
              flex: 1
            },
            placeholder: "Adicionar novo tipo...",
            value: novoTipo,
            onChange: e => setNovoTipo(e.target.value),
            onKeyDown: e => e.key === "Enter" && adicionarTipo()
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-outline",
            onClick: adicionarTipo,
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "plus",
              size: 16
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-purple",
          style: {
            marginTop: 14,
            width: "100%"
          },
          onClick: salvarTipos,
          disabled: salvando,
          children: salvando ? "Salvando..." : "Salvar tipos de laudo"
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 4
        },
        children: "Segurança"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 16
        },
        children: "Alterar senha de acesso da Psicologa."
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          marginBottom: 14
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Senha atual"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "password",
            value: senhaAtual,
            onChange: e => setSenhaAtual(e.target.value)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Nova senha"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "password",
            value: novaSenha,
            onChange: e => setNovaSenha(e.target.value)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Confirmar nova senha"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "password",
            value: confirmSenha,
            onChange: e => setConfirmSenha(e.target.value)
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: alterarSenha,
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "key",
          size: 15
        }, void 0, false), " Alterar Senha"]
      }, void 0, true)]
    }, void 0, true)]
  }, void 0, true);
}

// ═══════════════════════════════════════════════════════
// AGENDA — Doctoralia integrado via iframe
// ═══════════════════════════════════════════════════════
function Agenda() {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  const [sessoesPacientes, setSessoesPacientes] = useState([]);
  const [reservasSalaRaw, setReservasSalaRaw] = useState([]);
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
  const [viewMode, setViewMode] = useState("timeline");
  const [diaSelecionado, setDiaSelecionado] = useState(null);
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
      setSessoesPacientes(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    // Reservas da sala (Thais) — aparecem como bloqueios laranjas
    const u2 = db.collection("sala_reservas").onSnapshot(snap => {
      setReservasSalaRaw(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    }, () => {});
    return () => {
      u1();
      u2();
    };
  }, []);

  // Combina sessões de pacientes + reservas de sala num único array memoizado,
  // sem race condition entre os dois listeners (cada um atualiza seu próprio estado)
  const sessoes = useMemo(() => {
    const reservasSala = reservasSalaRaw.map(r => ({
      id: "sala_" + r.id,
      ...r,
      pacienteNome: r.usuarioId === "thais" ? `🟠 Thais — ${r.titulo || "Sala reservada"}` : `🟣 ${r.titulo || "Sala — Lucia"}`,
      tipo: "sala",
      hora: r.horaInicio,
      status: "agendado",
      _sala: true
    }));
    return [...sessoesPacientes, ...reservasSala];
  }, [sessoesPacientes, reservasSalaRaw]);

  // Calcular semana atual
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

  // Sessões de hoje para o painel
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
      // Gera para as próximas 12 semanas no mesmo dia da semana
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
  if (loading) return /*#__PURE__*/_jsxDEV(Spinner, {}, void 0, false);
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 8
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          minWidth: 0
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Agenda"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: [sessoes.filter(s => s.status === "agendado" || s.status === "confirmado").length, " sessões agendadas"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          justifyContent: "flex-end"
        },
        children: [/*#__PURE__*/_jsxDEV("a", {
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
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "external-link",
            size: 13
          }, void 0, false), " Doctoralia"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "lock",
            size: 15
          }, void 0, false), " Bloquear Sala"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "plus",
            size: 16
          }, void 0, false), " Nova Sessão"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
        gap: 10,
        marginBottom: 20
      },
      children: [["Hoje", sessoesHoje.length, "#7B00C4", "var(--purple-soft)"], ["Agendadas", sessoes.filter(s => s.status === "agendado").length, "#0891b2", "#e0f2fe"], ["Confirmadas", sessoes.filter(s => s.status === "confirmado").length, "#059669", "#d1fae5"], ["Este mês", sessoes.filter(s => s.data?.startsWith(new Date().toISOString().slice(0, 7))).length, "#d97706", "#fef3c7"]].map(([l, n, cor, bg]) => /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: bg,
          borderRadius: 12,
          padding: "12px 16px",
          textAlign: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 24,
            fontWeight: 800,
            color: cor
          },
          children: n
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: cor,
            fontWeight: 500
          },
          children: l
        }, void 0, false)]
      }, l, true))
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16
      },
      children: [/*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-ghost",
        style: {
          padding: "8px 12px"
        },
        onClick: () => setSemanaOffset(s => s - 1),
        children: /*#__PURE__*/_jsxDEV(Icon, {
          name: "chevron-left",
          size: 18
        }, void 0, false)
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          flex: 1,
          textAlign: "center",
          fontWeight: 600,
          fontSize: 15
        },
        children: [dias[0].toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short"
        }), " — ", dias[6].toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-ghost",
        style: {
          padding: "8px 10px",
          fontSize: 12
        },
        onClick: () => setSemanaOffset(0),
        children: "Hoje"
      }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-ghost",
        style: {
          padding: "8px 12px"
        },
        onClick: () => setSemanaOffset(s => s + 1),
        children: /*#__PURE__*/_jsxDEV(Icon, {
          name: "chevron-right",
          size: 18
        }, void 0, false)
      }, void 0, false)]
    }, void 0, true), (() => {
      const isMobile = window.innerWidth < 768;
      const HORA_INI = 7,
        HORA_FIM = 22;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dias7 = getDiasSemana(semanaOffset);
      function horaParaMin(h) {
        const [hh, mm] = (h || "00:00").split(":").map(Number);
        return hh * 60 + (mm || 0);
      }
      function minParaHora(m) {
        return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
      }

      // Monta linhas da timeline para um dia
      function montarLinhasDia(diaStr) {
        const sessDia = sessoes.filter(s => s.data === diaStr && !s._sala).sort((a, b) => a.hora.localeCompare(b.hora));
        const salasDia = sessoes.filter(s => s.data === diaStr && s._sala).map(s => ({
          inicio: s.horaInicio || s.hora || "00:00",
          fim: s.horaFim || s.hora || "00:00",
          nome: s.pacienteNome || "Sala",
          ehLucia: !(s.pacienteNome || "").toLowerCase().includes("thais"),
          raw: s
        }));
        function sessoesNoMin(m) {
          // Retorna sessões que COMEÇAM neste slot de 1h (ini >= m E ini < m+60)
          return sessDia.filter(s => {
            const ini = horaParaMin(s.hora);
            return ini >= m && ini < m + 60;
          });
        }
        function blocoNoMin(m) {
          return salasDia.find(b => m >= horaParaMin(b.inicio) && m < horaParaMin(b.fim));
        }
        const linhas = [];
        const jaExibidas = new Set(); // ids de sessão já lançadas na timeline
        for (let m = HORA_INI * 60; m < HORA_FIM * 60; m += 60) {
          const hStr = minParaHora(m);
          const sessNoSlot = sessoesNoMin(m);
          const bloco = blocoNoMin(m);
          let teveSessaoInicio = false;
          sessNoSlot.forEach(sess => {
            // Exibe a sessão no slot onde ela COMEÇA (19:30 aparece no slot 19:00-20:00)
            const sessIni = horaParaMin(sess.hora);
            const iniciaSessao = sessIni >= m && sessIni < m + 60;
            if (iniciaSessao && !jaExibidas.has(sess.id)) {
              linhas.push({
                tipo: "sessao",
                hStr,
                sess
              });
              jaExibidas.add(sess.id);
              teveSessaoInicio = true;
            }
          });
          if (sessNoSlot.length > 0) {
            // já tem sessão cobrindo este minuto (seja início ou meio) — não mostrar vago/bloco neste slot
          } else if (bloco) {
            if (bloco.ehLucia) linhas.push({
              tipo: "livre",
              hStr,
              bloco
            });else {
              // só mostrar início do bloco Thais uma vez
              if (!linhas.length || linhas[linhas.length - 1].tipo !== "thais" || linhas[linhas.length - 1].bloco.raw.id !== bloco.raw.id) linhas.push({
                tipo: "thais",
                hStr,
                bloco
              });
            }
          }
          // fora de bloco: não mostrar para não poluir
        }
        return linhas;
      }

      // ── COMPONENTE de um card de sessão ──
      function CardSessao({
        s,
        hStr
      }) {
        const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.agendado;
        const dur = parseInt(s.duracao || 50);
        const fim = minParaHora(horaParaMin(s.hora) + dur);
        const online = (s.tipo || "").toLowerCase().includes("online");
        return /*#__PURE__*/_jsxDEV("div", {
          onClick: () => abrirEditar(s),
          style: {
            display: "flex",
            alignItems: "stretch",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            cursor: "pointer",
            background: st.bg,
            marginBottom: 4
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 4,
              background: st.cor,
              flexShrink: 0
            }
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1,
              padding: "10px 12px"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 15,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.3
              },
              children: s.pacienteNome || "—"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: st.cor,
                fontWeight: 600,
                marginTop: 2
              },
              children: [s.hora.slice(0, 5), " – ", fim, online && /*#__PURE__*/_jsxDEV("span", {
                style: {
                  marginLeft: 6
                },
                children: "📹"
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: "#6b7280",
                marginTop: 1
              },
              children: s.tipo || "Psicoterapia"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 10px",
              gap: 4
            },
            children: [/*#__PURE__*/_jsxDEV("span", {
              style: {
                background: st.cor,
                color: "white",
                borderRadius: 20,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: "nowrap"
              },
              children: st.label
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              value: s.status,
              onChange: e => {
                e.stopPropagation();
                mudarStatus(s.id, e.target.value);
              },
              onClick: e => e.stopPropagation(),
              style: {
                fontSize: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "2px 3px",
                background: "white",
                cursor: "pointer",
                maxWidth: 84
              },
              children: Object.entries(STATUS_CONFIG).map(([k, v]) => /*#__PURE__*/_jsxDEV("option", {
                value: k,
                children: v.label
              }, k, false))
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true);
      }
      function CardLivre({
        hStr,
        diaStr
      }) {
        return /*#__PURE__*/_jsxDEV("button", {
          onClick: () => {
            setForm({
              pacienteId: "",
              data: diaStr,
              hora: hStr,
              duracao: "50",
              tipo: "Psicoterapia",
              status: "agendado",
              obs: ""
            });
            setEditando(null);
            setModal(true);
          },
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            background: "#faf5ff",
            border: "1.5px dashed #c4b5fd",
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
            color: "#7B00C4",
            fontSize: 13,
            fontFamily: "var(--font-body)",
            marginBottom: 3
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "plus-circle",
            size: 14
          }, void 0, false), " ", /*#__PURE__*/_jsxDEV("span", {
            style: {
              fontWeight: 600
            },
            children: hStr
          }, void 0, false), " ", /*#__PURE__*/_jsxDEV("span", {
            style: {
              color: "#a78bfa",
              fontWeight: 400
            },
            children: "· Disponível"
          }, void 0, false)]
        }, void 0, true);
      }
      function CardThais({
        bloco
      }) {
        return /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "stretch",
            borderRadius: 10,
            overflow: "hidden",
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            marginBottom: 3
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 4,
              background: "#ea580c",
              flexShrink: 0
            }
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              padding: "8px 12px"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                fontWeight: 700,
                color: "#ea580c"
              },
              children: bloco.nome
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: "#9a3412"
              },
              children: [bloco.inicio, " – ", bloco.fim, " · Sala ocupada"]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true);
      }

      // ── VISÃO MOBILE: lista vertical contínua ──
      if (isMobile) {
        // Mostrar 14 dias a partir de hoje
        const diasMobile = Array.from({
          length: 14
        }, (_, i) => {
          const d = new Date(hoje);
          d.setDate(hoje.getDate() + i);
          return d;
        });
        return /*#__PURE__*/_jsxDEV("div", {
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12
            },
            children: [/*#__PURE__*/_jsxDEV("button", {
              onClick: () => setSemanaOffset(o => o - 1),
              className: "btn btn-ghost",
              style: {
                padding: "6px 12px"
              },
              children: "‹ Anterior"
            }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-muted)"
              },
              children: [formatData(dias7[0]), " – ", formatData(dias7[6])]
            }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
              onClick: () => setSemanaOffset(o => o + 1),
              className: "btn btn-ghost",
              style: {
                padding: "6px 12px"
              },
              children: "Próxima ›"
            }, void 0, false)]
          }, void 0, true), diasMobile.map((dia, di) => {
            const diaStr = formatData(dia);
            const linhas = montarLinhasDia(diaStr);
            const isHoje = diaStr === formatData(hoje);
            if (linhas.length === 0 && !isHoje) return null; // ocultar dias vazios sem bloco
            return /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 0,
                marginBottom: 8
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  width: 44,
                  flexShrink: 0,
                  paddingTop: 10,
                  textAlign: "center"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 10,
                    fontWeight: 700,
                    color: isHoje ? "var(--purple)" : "#9ca3af",
                    textTransform: "uppercase"
                  },
                  children: DIAS_SEMANA[dia.getDay()]
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: isHoje ? "var(--purple)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "2px auto 0"
                  },
                  children: /*#__PURE__*/_jsxDEV("span", {
                    style: {
                      fontSize: 18,
                      fontWeight: 800,
                      color: isHoje ? "white" : isHoje ? "var(--purple)" : "#111827"
                    },
                    children: dia.getDate()
                  }, void 0, false)
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  width: 2,
                  background: isHoje ? "var(--purple)" : "#e5e7eb",
                  borderRadius: 2,
                  flexShrink: 0,
                  marginTop: 14,
                  marginRight: 10
                }
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  flex: 1,
                  paddingTop: 6
                },
                children: [linhas.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    color: "#d1d5db",
                    fontSize: 12,
                    padding: "8px 0"
                  },
                  children: "Sem eventos"
                }, void 0, false) : linhas.map((l, li) => {
                  if (l.tipo === "sessao") return /*#__PURE__*/_jsxDEV(CardSessao, {
                    s: l.sess,
                    hStr: l.hStr
                  }, li, false);
                  if (l.tipo === "livre") return /*#__PURE__*/_jsxDEV(CardLivre, {
                    hStr: l.hStr,
                    diaStr: diaStr
                  }, li, false);
                  if (l.tipo === "thais") return /*#__PURE__*/_jsxDEV(CardThais, {
                    bloco: l.bloco
                  }, li, false);
                  return null;
                }), /*#__PURE__*/_jsxDEV("button", {
                  onClick: () => {
                    setForm({
                      pacienteId: "",
                      data: diaStr,
                      hora: "09:00",
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
                    borderRadius: 8,
                    padding: "5px 12px",
                    cursor: "pointer",
                    color: "#9ca3af",
                    fontSize: 12,
                    width: "100%",
                    marginTop: 2,
                    fontFamily: "var(--font-body)"
                  },
                  children: "+ Agendar"
                }, void 0, false), (() => {
                  const sessDia = sessoes.filter(s => s.data === diaStr && !s._sala);
                  if (sessDia.length === 0) return null;
                  function enviarResumoMob() {
                    const dataFmt = new Date(diaStr + "T12:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    });
                    const realizadas = sessDia.filter(s => s.status === "realizado");
                    const confirmadas = sessDia.filter(s => s.status === "confirmado");
                    const agendadas = sessDia.filter(s => s.status === "agendado");
                    const faltas = sessDia.filter(s => s.status === "falta");
                    const canceladas = sessDia.filter(s => s.status === "cancelado");
                    let msg = `📅 *Resumo do dia — ${dataFmt}*\n🔢 Total: ${sessDia.length} sessão(ões)\n\n`;
                    if (realizadas.length) msg += `✅ *Realizadas (${realizadas.length}):*\n${realizadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                    if (confirmadas.length) msg += `🟢 *Confirmadas (${confirmadas.length}):*\n${confirmadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                    if (agendadas.length) msg += `🟡 *Agendadas/Pendentes (${agendadas.length}):*\n${agendadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                    if (faltas.length) msg += `❌ *Faltas (${faltas.length}):*\n${faltas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                    if (canceladas.length) msg += `🚫 *Canceladas (${canceladas.length}):*\n${canceladas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                    msg += `_Enviado pela Clínica Dra. Lucia Kratz_ 🦋`;
                    window.open(`https://wa.me/5562991546765?text=${encodeURIComponent(msg)}`, "_blank");
                  }
                  return /*#__PURE__*/_jsxDEV("button", {
                    onClick: enviarResumoMob,
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      background: "#25D366",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "7px 12px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      width: "100%",
                      marginTop: 6,
                      fontFamily: "var(--font-body)"
                    },
                    children: [/*#__PURE__*/_jsxDEV("span", {
                      children: "📲"
                    }, void 0, false), " Resumo WhatsApp"]
                  }, void 0, true);
                })()]
              }, void 0, true)]
            }, di, true);
          })]
        }, void 0, true);
      }

      // ── VISÃO DESKTOP: seletor de view + grade/timeline ──
      const diaAtual = diaSelecionado || formatData(hoje);
      return /*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 6,
            marginBottom: 16,
            background: "var(--gray-100)",
            borderRadius: 12,
            padding: 4,
            maxWidth: 260
          },
          children: [["timeline", "📅 Timeline"], ["semana", "🗓️ Semana"]].map(([v, l]) => /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setViewMode(v),
            style: {
              flex: 1,
              padding: "8px 12px",
              borderRadius: 9,
              border: "none",
              background: viewMode === v ? "white" : "transparent",
              color: viewMode === v ? "var(--purple)" : "#6b7280",
              fontWeight: viewMode === v ? 700 : 500,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "var(--font-body)",
              boxShadow: viewMode === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none"
            },
            children: l
          }, v, false))
        }, void 0, false), viewMode === "timeline" && /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 6,
              marginBottom: 16,
              flexWrap: "wrap"
            },
            children: dias7.map((dia, idx) => {
              const str = formatData(dia);
              const isH = str === formatData(hoje);
              const isSel = str === diaAtual;
              const temS = sessoes.some(s => s.data === str && !s._sala);
              return /*#__PURE__*/_jsxDEV("button", {
                onClick: () => setDiaSelecionado(str),
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1.5px solid",
                  borderColor: isSel ? "var(--purple)" : isH ? "#c4b5fd" : "#e5e7eb",
                  background: isSel ? "var(--purple)" : isH ? "#f5f0ff" : "white",
                  cursor: "pointer",
                  minWidth: 56
                },
                children: [/*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontSize: 10,
                    fontWeight: 600,
                    color: isSel ? "rgba(255,255,255,.75)" : isH ? "var(--purple)" : "#9ca3af",
                    textTransform: "uppercase"
                  },
                  children: DIAS_SEMANA[dia.getDay()]
                }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontSize: 20,
                    fontWeight: 800,
                    color: isSel ? "white" : isH ? "var(--purple)" : "#111827"
                  },
                  children: dia.getDate()
                }, void 0, false), temS && /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: isSel ? "rgba(255,255,255,.7)" : "var(--purple)",
                    marginTop: 2
                  }
                }, void 0, false)]
              }, idx, true);
            })
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-muted)"
                },
                children: new Date(diaAtual + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long"
                })
              }, void 0, false), (() => {
                const sessDia = sessoes.filter(s => s.data === diaAtual && !s._sala);
                if (sessDia.length === 0) return null;
                function enviarResumo() {
                  const dataFmt = new Date(diaAtual + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  });
                  const realizadas = sessDia.filter(s => s.status === "realizado");
                  const confirmadas = sessDia.filter(s => s.status === "confirmado");
                  const agendadas = sessDia.filter(s => s.status === "agendado");
                  const faltas = sessDia.filter(s => s.status === "falta");
                  const canceladas = sessDia.filter(s => s.status === "cancelado");
                  let msg = `📅 *Resumo do dia — ${dataFmt}*\n`;
                  msg += `🔢 Total: ${sessDia.length} sessão(ões)\n\n`;
                  if (realizadas.length) msg += `✅ *Realizadas (${realizadas.length}):*\n${realizadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                  if (confirmadas.length) msg += `🟢 *Confirmadas (${confirmadas.length}):*\n${confirmadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                  if (agendadas.length) msg += `🟡 *Agendadas/Pendentes (${agendadas.length}):*\n${agendadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                  if (faltas.length) msg += `❌ *Faltas (${faltas.length}):*\n${faltas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                  if (canceladas.length) msg += `🚫 *Canceladas (${canceladas.length}):*\n${canceladas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
                  msg += `_Enviado pela Clínica Dra. Lucia Kratz_ 🦋`;
                  const url = `https://wa.me/5562991546765?text=${encodeURIComponent(msg)}`;
                  window.open(url, "_blank");
                }
                return /*#__PURE__*/_jsxDEV("button", {
                  onClick: enviarResumo,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#25D366",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)"
                  },
                  children: [/*#__PURE__*/_jsxDEV("span", {
                    style: {
                      fontSize: 15
                    },
                    children: "📲"
                  }, void 0, false), " Resumo WhatsApp"]
                }, void 0, true);
              })()]
            }, void 0, true), (() => {
              const linhas = montarLinhasDia(diaAtual);
              if (linhas.length === 0) return /*#__PURE__*/_jsxDEV("div", {
                style: {
                  textAlign: "center",
                  padding: 40,
                  color: "var(--text-muted)",
                  background: "var(--gray-50)",
                  borderRadius: 14
                },
                children: [/*#__PURE__*/_jsxDEV(Icon, {
                  name: "calendar",
                  size: 32
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    marginTop: 8,
                    fontWeight: 600
                  },
                  children: "Nenhum evento neste dia"
                }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                  className: "btn btn-purple",
                  style: {
                    marginTop: 12,
                    fontSize: 13
                  },
                  onClick: () => {
                    setForm({
                      pacienteId: "",
                      data: diaAtual,
                      hora: "09:00",
                      duracao: "50",
                      tipo: "Psicoterapia",
                      status: "agendado",
                      obs: ""
                    });
                    setEditando(null);
                    setModal(true);
                  },
                  children: "+ Agendar"
                }, void 0, false)]
              }, void 0, true);
              return linhas.map((l, li) => {
                if (l.tipo === "sessao") return /*#__PURE__*/_jsxDEV(CardSessao, {
                  s: l.sess,
                  hStr: l.hStr
                }, li, false);
                if (l.tipo === "livre") return /*#__PURE__*/_jsxDEV(CardLivre, {
                  hStr: l.hStr,
                  diaStr: diaAtual
                }, li, false);
                if (l.tipo === "thais") return /*#__PURE__*/_jsxDEV(CardThais, {
                  bloco: l.bloco
                }, li, false);
                return null;
              });
            })()]
          }, void 0, true)]
        }, void 0, true), viewMode === "semana" && /*#__PURE__*/_jsxDEV("div", {
          style: {
            marginBottom: 24
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              overflowX: "auto",
              WebkitOverflowScrolling: "touch"
            },
            children: /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "60px repeat(7,minmax(44px,1fr))",
                gap: 3,
                marginBottom: 4,
                minWidth: 380
              },
              children: [/*#__PURE__*/_jsxDEV("div", {}, void 0, false), dias.map((dia, i) => {
                const isHoje = formatData(dia) === formatData(hoje);
                const isPassado = dia < hoje;
                return /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    textAlign: "center",
                    padding: "8px 4px",
                    borderRadius: 10,
                    background: isHoje ? "var(--purple)" : "white",
                    border: "1.5px solid",
                    borderColor: isHoje ? "var(--purple)" : "var(--gray-200)"
                  },
                  children: [/*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: isHoje ? "rgba(255,255,255,.8)" : isPassado ? "#9ca3af" : "var(--gray-500)"
                    },
                    children: DIAS_SEMANA[i]
                  }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontSize: 20,
                      fontWeight: 800,
                      color: isHoje ? "white" : isPassado ? "#9ca3af" : "var(--gray-800)",
                      lineHeight: 1.2
                    },
                    children: dia.getDate()
                  }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontSize: 9,
                      color: isHoje ? "rgba(255,255,255,.7)" : "var(--gray-400)"
                    },
                    children: dia.toLocaleDateString("pt-BR", {
                      month: "short"
                    })
                  }, void 0, false)]
                }, i, true);
              })]
            }, void 0, true)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              marginBottom: 4
            },
            children: [{
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
            }].map(periodo => /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "60px repeat(7,minmax(44px,1fr))",
                gap: 3,
                marginBottom: 4,
                minWidth: 380
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  paddingRight: 8,
                  paddingTop: 8
                },
                children: /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--gray-500)"
                  },
                  children: periodo.label
                }, void 0, false)
              }, void 0, false), dias.map((dia, i) => {
                const isHoje = formatData(dia) === formatData(hoje);
                const sessDia = sessoesNoDia(dia).filter(s => s.hora >= periodo.range[0] && s.hora < periodo.range[1]);
                return /*#__PURE__*/_jsxDEV("div", {
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
                  },
                  children: [sessDia.map(s => {
                    const st = s._sala ? {
                      bg: "#fff7ed",
                      cor: "#ea580c",
                      label: "Sala"
                    } : STATUS_CONFIG[s.status] || STATUS_CONFIG.agendado;
                    return /*#__PURE__*/_jsxDEV("div", {
                      onClick: () => !s._sala && abrirEditar(s),
                      style: {
                        background: st.bg,
                        borderLeft: "3px solid " + st.cor,
                        borderRadius: 5,
                        padding: "4px 6px",
                        cursor: s._sala ? "default" : "pointer",
                        fontSize: 11,
                        lineHeight: 1.4
                      },
                      children: [/*#__PURE__*/_jsxDEV("div", {
                        style: {
                          fontWeight: 700,
                          color: st.cor,
                          fontSize: 12
                        },
                        children: s.hora
                      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                        style: {
                          color: "#111",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 11
                        },
                        children: s._sala ? s.pacienteNome || "Sala" : s.pacienteNome?.split(" ")[0] || "—"
                      }, void 0, false), !s._sala && /*#__PURE__*/_jsxDEV("div", {
                        style: {
                          color: "#6b7280",
                          fontSize: 9
                        },
                        children: s.tipo
                      }, void 0, false)]
                    }, s.id, true);
                  }), /*#__PURE__*/_jsxDEV("button", {
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
                    },
                    children: "+"
                  }, void 0, false)]
                }, i, true);
              })]
            }, periodo.label, true))
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true);
    })(), modal && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModal(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 480
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600
            },
            children: editando ? "Editar Sessão" : "Nova Sessão"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModal(false),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--gray-400)"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Paciente *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
            className: "form-input",
            value: form.pacienteId,
            onChange: e => setForm({
              ...form,
              pacienteId: e.target.value
            }),
            children: [/*#__PURE__*/_jsxDEV("option", {
              value: "",
              children: "Selecionar paciente..."
            }, void 0, false), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/_jsxDEV("option", {
              value: p.id,
              children: p.nome
            }, p.id, false))]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Data *"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "date",
              value: form.data,
              onChange: e => setForm({
                ...form,
                data: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Hora *"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "time",
              value: form.hora,
              onChange: e => setForm({
                ...form,
                hora: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Duração (min)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: form.duracao,
              onChange: e => setForm({
                ...form,
                duracao: e.target.value
              }),
              children: ["30", "45", "50", "60", "90"].map(d => /*#__PURE__*/_jsxDEV("option", {
                value: d,
                children: [d, " min"]
              }, d, true))
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Tipo"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: form.tipo,
              onChange: e => setForm({
                ...form,
                tipo: e.target.value
              }),
              children: TIPOS.map(t => /*#__PURE__*/_jsxDEV("option", {
                value: t,
                children: t
              }, t, false))
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Status"
            }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
              className: "form-input",
              value: form.status,
              onChange: e => setForm({
                ...form,
                status: e.target.value
              }),
              children: Object.entries(STATUS_CONFIG).map(([k, v]) => /*#__PURE__*/_jsxDEV("option", {
                value: k,
                children: v.label
              }, k, false))
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Observações"
          }, void 0, false), /*#__PURE__*/_jsxDEV(TextAreaVoz, {
            className: "form-input",
            rows: 2,
            value: form.obs,
            onChange: e => setForm({
              ...form,
              obs: e.target.value
            }),
            placeholder: "Notas sobre a sessão..."
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "space-between"
          },
          children: [editando && /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              color: "#dc2626",
              border: "1px solid #fecaca"
            },
            onClick: () => {
              excluir(editando);
              setModal(false);
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "trash-2",
              size: 15
            }, void 0, false), " Excluir"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 10,
              marginLeft: "auto"
            },
            children: [/*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              onClick: () => setModal(false),
              children: "Cancelar"
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              onClick: salvar,
              disabled: salvando,
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "save",
                size: 15
              }, void 0, false), " ", salvando ? "Salvando..." : "Salvar"]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), modalSala && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModalSala(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 440
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "lock",
              size: 18
            }, void 0, false), " Bloquear Sala"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModalSala(false),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: "#92400e"
          },
          children: "Este bloqueio aparece para a Thais como horário ocupado na agenda compartilhada."
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 16
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Tipo de bloqueio"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 8
            },
            children: [["unico", "Só este dia", "#7B00C4"], ["recorrente", "Toda semana (12 semanas)", "#059669"]].map(([v, l, c]) => /*#__PURE__*/_jsxDEV("button", {
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
              },
              children: l
            }, v, false))
          }, void 0, false), formSala.recorrencia === "recorrente" && /*#__PURE__*/_jsxDEV("div", {
            style: {
              marginTop: 8,
              fontSize: 12,
              color: "#059669",
              background: "#f0fdf4",
              borderRadius: 8,
              padding: "8px 12px"
            },
            children: "✓ Vai bloquear o mesmo dia da semana por 12 semanas consecutivas"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Data"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "date",
              value: formSala.data,
              onChange: e => setFormSala({
                ...formSala,
                data: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Início"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "time",
              value: formSala.horaInicio,
              onChange: e => setFormSala({
                ...formSala,
                horaInicio: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Fim"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "time",
              value: formSala.horaFim,
              onChange: e => setFormSala({
                ...formSala,
                horaFim: e.target.value
              })
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            style: {
              gridColumn: "1/-1"
            },
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Título (opcional)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: formSala.titulo,
              onChange: e => setFormSala({
                ...formSala,
                titulo: e.target.value
              }),
              placeholder: "Ex: Sessão, Avaliação..."
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 16
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModalSala(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
            disabled: salvandoSala,
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "lock",
              size: 15
            }, void 0, false), " ", salvandoSala ? "Salvando..." : "Bloquear"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}

// APP
// ─── VITRINE DE PRODUTOS (CRUD) ──────────────────────────
function VitrineProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const formVazio = {
    titulo: "",
    descricao: "",
    imagemUrl: "",
    linkVendas: "",
    textoBotao: "",
    ativo: true
  };
  const [form, setForm] = useState(formVazio);
  useEffect(() => {
    const unsub = db.collection("produtos_vitrine").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setProdutos(docs);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  function abrirNovo() {
    setForm(formVazio);
    setEditando(null);
    setModal(true);
  }
  function abrirEditar(p) {
    setForm({
      titulo: p.titulo || "",
      descricao: p.descricao || "",
      imagemUrl: p.imagemUrl || "",
      linkVendas: p.linkVendas || "",
      textoBotao: p.textoBotao || "",
      ativo: p.ativo !== false
    });
    setEditando(p.id);
    setModal(true);
  }
  async function salvar() {
    if (!form.titulo || !form.linkVendas) {
      alert("Título e link de vendas são obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        ...form,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (editando) {
        await db.collection("produtos_vitrine").doc(editando).update(dados);
      } else {
        await db.collection("produtos_vitrine").add({
          ...dados,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      setModal(false);
      setEditando(null);
      setForm(formVazio);
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }
  async function toggleAtivo(p) {
    await db.collection("produtos_vitrine").doc(p.id).update({
      ativo: !p.ativo
    });
  }
  async function excluir(id) {
    if (!confirm("Excluir este produto da vitrine?")) return;
    await db.collection("produtos_vitrine").doc(id).delete();
  }
  if (loading) return /*#__PURE__*/_jsxDEV(Spinner, {}, void 0, false);
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        flexWrap: "wrap",
        gap: 12
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "🛍️ Vitrine de Produtos"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: [produtos.length, " produto(s) · ", produtos.filter(p => p.ativo).length, " ativo(s)"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: abrirNovo,
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "plus",
          size: 15
        }, void 0, false), " Novo Produto"]
      }, void 0, true)]
    }, void 0, true), produtos.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        textAlign: "center",
        padding: 60,
        color: "var(--text-muted)"
      },
      children: [/*#__PURE__*/_jsxDEV(Icon, {
        name: "shopping-bag",
        size: 48
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginTop: 12,
          fontWeight: 600
        },
        children: "Nenhum produto cadastrado"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          marginTop: 8,
          marginBottom: 20
        },
        children: "Cadastre produtos como o 9&Self para exibir no portal do paciente."
      }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: abrirNovo,
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "plus",
          size: 14
        }, void 0, false), " Cadastrar primeiro produto"]
      }, void 0, true)]
    }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      children: produtos.map(p => /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: "18px 20px",
          opacity: p.ativo ? 1 : 0.6
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "flex-start",
            gap: 14
          },
          children: [p.imagemUrl ? /*#__PURE__*/_jsxDEV("img", {
            src: p.imagemUrl,
            alt: p.titulo,
            style: {
              width: 72,
              height: 56,
              objectFit: "cover",
              borderRadius: 8,
              flexShrink: 0
            }
          }, void 0, false) : /*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 72,
              height: 56,
              background: "var(--purple-soft)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "image",
              size: 22
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1,
              minWidth: 0
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 4
              },
              children: [/*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontWeight: 700,
                  fontSize: 15
                },
                children: p.titulo
              }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
                style: {
                  background: p.ativo ? "#d1fae5" : "#f3f4f6",
                  color: p.ativo ? "#065f46" : "#6b7280",
                  borderRadius: 20,
                  padding: "2px 10px",
                  fontSize: 11,
                  fontWeight: 600
                },
                children: p.ativo ? "✓ Ativo" : "Inativo"
              }, void 0, false)]
            }, void 0, true), p.descricao && /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              },
              children: p.descricao
            }, void 0, false), p.linkVendas && /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "#2563eb"
              },
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "link",
                size: 11
              }, void 0, false), " ", p.linkVendas]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 8,
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid var(--gray-100)",
            flexWrap: "wrap"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              fontSize: 12
            },
            onClick: () => abrirEditar(p),
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "pencil",
              size: 13
            }, void 0, false), " Editar"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              fontSize: 12,
              color: p.ativo ? "#d97706" : "#059669"
            },
            onClick: () => toggleAtivo(p),
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: p.ativo ? "eye-off" : "eye",
              size: 13
            }, void 0, false), " ", p.ativo ? "Desativar" : "Ativar"]
          }, void 0, true), p.linkVendas && /*#__PURE__*/_jsxDEV("a", {
            href: p.linkVendas,
            target: "_blank",
            rel: "noreferrer",
            className: "btn btn-ghost",
            style: {
              fontSize: 12,
              textDecoration: "none"
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "external-link",
              size: 13
            }, void 0, false), " Ver página"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              fontSize: 12,
              color: "#dc2626",
              marginLeft: "auto"
            },
            onClick: () => excluir(p.id),
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "trash-2",
              size: 13
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true)]
      }, p.id, true))
    }, void 0, false), modal && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModal(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto"
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 20
          },
          children: editando ? "Editar Produto" : "Novo Produto"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 14
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Título *"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.titulo,
              onChange: e => setForm({
                ...form,
                titulo: e.target.value
              }),
              placeholder: "Ex: Mapeamento de Perfil 9&Self"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Descrição (copy do produto)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("textarea", {
              className: "form-input",
              rows: 3,
              value: form.descricao,
              onChange: e => setForm({
                ...form,
                descricao: e.target.value
              }),
              placeholder: "Texto comercial exibido no card do paciente..."
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "URL da imagem / banner"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.imagemUrl,
              onChange: e => setForm({
                ...form,
                imagemUrl: e.target.value
              }),
              placeholder: "https://..."
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Link de vendas / checkout *"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.linkVendas,
              onChange: e => setForm({
                ...form,
                linkVendas: e.target.value
              }),
              placeholder: "https://..."
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "Texto do botão"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.textoBotao,
              onChange: e => setForm({
                ...form,
                textoBotao: e.target.value
              }),
              placeholder: "Ex: Quero Fazer Meu Mapeamento"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 10
            },
            children: [true, false].map(v => /*#__PURE__*/_jsxDEV("button", {
              type: "button",
              onClick: () => setForm({
                ...form,
                ativo: v
              }),
              style: {
                flex: 1,
                padding: "10px",
                borderRadius: 10,
                border: "1.5px solid",
                borderColor: form.ativo === v ? "var(--purple)" : "#e5e7eb",
                background: form.ativo === v ? "var(--purple-soft)" : "white",
                color: form.ativo === v ? "var(--purple)" : "#6b7280",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13
              },
              children: v ? "✓ Ativo no portal" : "Inativo (oculto)"
            }, v + "", false))
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 20
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModal(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: salvar,
            disabled: salvando,
            children: salvando ? "Salvando..." : "Salvar"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}
function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(null);
  const notifProps = useBotaoNotificacao(user);
  // ═══════════════════════════════════════════════════════
  // PAINEL DE PERMISSÕES
  // ═══════════════════════════════════════════════════════
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

    // Carregar permissões do Firebase ou usar defaults
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
    return /*#__PURE__*/_jsxDEV("div", {
      style: {
        maxWidth: 640,
        margin: "0 auto"
      },
      children: [/*#__PURE__*/_jsxDEV("h2", {
        style: {
          fontFamily: "var(--font-display)",
          fontSize: 22,
          marginBottom: 4
        },
        children: "⚙️ Permissões por Perfil"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 24
        },
        children: "Configure o que cada perfil pode ver e fazer no sistema."
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap"
        },
        children: perfisEdicao.map(p => /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: p.label
        }, p.id, false))
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 24
        },
        children: grupos.map(grupo => /*#__PURE__*/_jsxDEV("div", {
          style: {
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              padding: "10px 16px",
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              fontWeight: 700,
              fontSize: 13,
              color: "#374151"
            },
            children: grupo
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              padding: "8px 0"
            },
            children: PERMISSOES_LABELS.filter(p => p.grupo === grupo).map(p => /*#__PURE__*/_jsxDEV("label", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                cursor: "pointer",
                transition: "background .1s"
              },
              onMouseEnter: e => e.currentTarget.style.background = "#f9fafb",
              onMouseLeave: e => e.currentTarget.style.background = "white",
              children: [/*#__PURE__*/_jsxDEV("input", {
                type: "checkbox",
                checked: !!permissoes[p.id],
                onChange: () => toggle(p.id),
                style: {
                  width: 16,
                  height: 16,
                  cursor: "pointer",
                  accentColor: "#7B00C4"
                }
              }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontSize: 13,
                  color: "#374151"
                },
                children: p.label
              }, void 0, false)]
            }, p.id, true))
          }, void 0, false)]
        }, grupo, true))
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-purple",
          onClick: salvar,
          disabled: salvando,
          children: salvando ? "Salvando..." : "💾 Salvar Permissões"
        }, void 0, false), salvo && /*#__PURE__*/_jsxDEV("span", {
          style: {
            fontSize: 13,
            color: "#059669",
            fontWeight: 600
          },
          children: "✅ Salvo!"
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          onClick: () => setPermissoes(PERMISSOES_DEFAULT[perfilSel] || {}),
          style: {
            marginLeft: "auto",
            fontSize: 12
          },
          children: "Restaurar padrão"
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true);
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
  if (!user) return /*#__PURE__*/_jsxDEV(Login, {
    onLogin: handleLogin
  }, void 0, false);
  return /*#__PURE__*/_jsxDEV("div", {
    style: {
      display: "flex",
      minHeight: "100vh",
      width: "100%",
      overflowX: "auto"
    },
    children: [/*#__PURE__*/_jsxDEV(Sidebar, {
      user: user,
      tab: tab,
      setTab: setTab,
      onLogout: handleLogout,
      notifProps: notifProps
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      className: "header-mobile",
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "header-mobile-logo",
        children: "Administracao"
      }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
        className: "header-mobile-btn",
        onClick: handleLogout,
        children: /*#__PURE__*/_jsxDEV(Icon, {
          name: "log-out",
          size: 18
        }, void 0, false)
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "main-content",
      style: {
        flex: 1,
        minWidth: 0,
        maxWidth: "100%",
        overflowX: "hidden"
      },
      children: [user.tipo === "psicologa" && tab === "dashboard" && /*#__PURE__*/_jsxDEV(DashboardAdmin, {
        user: user,
        onVerEvolucao: pacId => {
          window._pacienteInicialId = pacId;
          setTab("pacientes");
        }
      }, void 0, false), user.tipo === "psicologa" && tab === "pacientes" && /*#__PURE__*/_jsxDEV(Pacientes, {
        user: user
      }, void 0, false), user.tipo === "psicologa" && tab === "alunos" && /*#__PURE__*/_jsxDEV(Alunos, {}, void 0, false), user.tipo === "psicologa" && tab === "casais" && /*#__PURE__*/_jsxDEV(TerapiaCasais, {}, void 0, false), user.tipo === "psicologa" && tab === "recursos" && /*#__PURE__*/_jsxDEV(RecursosTerapeuticos, {
        user: user
      }, void 0, false), user.tipo === "psicologa" && tab === "laudos" && /*#__PURE__*/_jsxDEV(Laudos, {}, void 0, false), user.tipo === "psicologa" && tab === "vitrine" && /*#__PURE__*/_jsxDEV(VitrineProdutos, {}, void 0, false), user.tipo === "psicologa" && tab === "agenda" && /*#__PURE__*/_jsxDEV(Agenda, {}, void 0, false), user.tipo === "psicologa" && tab === "fin-clinica" && /*#__PURE__*/_jsxDEV(FinanceiroClinica, {
        user: user
      }, void 0, false), user.tipo === "psicologa" && tab === "comissoes" && /*#__PURE__*/_jsxDEV(Comissoes, {
        user: user
      }, void 0, false), user.tipo === "psicologa" && tab === "fin-pessoal" && /*#__PURE__*/_jsxDEV(FinanceiroPessoal, {
        somenteLeitura: false
      }, void 0, false), user.tipo === "psicologa" && tab === "fin-empresa" && /*#__PURE__*/_jsxDEV(FinanceiroEmpresa, {
        somenteLeitura: false
      }, void 0, false), user.tipo === "psicologa" && tab === "painel-geral" && /*#__PURE__*/_jsxDEV(PainelGeralFinanceiro, {}, void 0, false), tab === "__menu__" && /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: 20
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 20
          },
          children: "Menu"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12
          },
          children: NAV_PSICOLOGA_FLAT.filter(i => !["dashboard", "pacientes", "agenda", "fin-clinica"].includes(i.id)).map(item => /*#__PURE__*/_jsxDEV("button", {
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
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: item.icon,
              size: 24
            }, void 0, false), item.label]
          }, item.id, true))
        }, void 0, false)]
      }, void 0, true), user.tipo === "psicologa" && tab === "depoimentos" && /*#__PURE__*/_jsxDEV(Depoimentos, {}, void 0, false), user.tipo === "psicologa" && tab === "config" && /*#__PURE__*/_jsxDEV(Configuracoes, {}, void 0, false), user.tipo === "secretaria" && tab === "pacientes" && /*#__PURE__*/_jsxDEV(Pacientes, {
        user: user
      }, void 0, false), user.tipo === "secretaria" && tab === "agenda" && /*#__PURE__*/_jsxDEV(Agenda, {}, void 0, false), user.tipo === "secretaria" && tab === "fin-clinica" && /*#__PURE__*/_jsxDEV(FinanceiroClinica, {
        user: user
      }, void 0, false), user.tipo === "secretaria" && tab === "comissoes" && /*#__PURE__*/_jsxDEV(Comissoes, {
        user: user
      }, void 0, false), user.tipo === "paulo" && tab === "fin-pessoal" && /*#__PURE__*/_jsxDEV(FinanceiroPessoal, {
        somenteLeitura: false
      }, void 0, false), user.tipo === "paulo" && tab === "fin-empresa" && /*#__PURE__*/_jsxDEV(FinanceiroEmpresa, {
        somenteLeitura: false
      }, void 0, false), user.tipo === "paulo" && tab === "fin-clinica" && /*#__PURE__*/_jsxDEV(FinanceiroClinica, {
        user: user
      }, void 0, false), (user.tipo === "psicologa" || user.tipo === "secretaria") && tab === "funil-leads" && /*#__PURE__*/_jsxDEV(FunilLeads, {
        user: user
      }, void 0, false), user.tipo === "marketing" && tab === "marketing-dashboard" && /*#__PURE__*/_jsxDEV(DashboardMarketing, {
        user: user
      }, void 0, false), user.tipo === "psicologa" && tab === "marketing-dashboard" && /*#__PURE__*/_jsxDEV(DashboardMarketing, {
        user: user
      }, void 0, false), user.tipo === "psicologa" && tab === "permissoes" && /*#__PURE__*/_jsxDEV(PainelPermissoes, {}, void 0, false), (user.tipo === "psicologa" || user.tipo === "marketing") && tab === "dashboard-performance" && /*#__PURE__*/_jsxDEV(DashboardPerformance, {
        user: user
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "nav-mobile",
      children: [user.tipo === "psicologa" && [{
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
      }].map(item => /*#__PURE__*/_jsxDEV("button", {
        className: "nav-mobile-item " + (tab === item.id ? "active" : ""),
        onClick: () => setTab(item.id),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: item.icon,
          size: 20
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          children: item.label
        }, void 0, false)]
      }, item.id, true)), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("button", {
        className: "nav-mobile-item",
        onClick: () => setTab("__menu__"),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "menu",
          size: 20
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          children: "Mais"
        }, void 0, false)]
      }, void 0, true), user.tipo === "secretaria" && NAV_SECRETARIA.slice(0, 5).map(item => /*#__PURE__*/_jsxDEV("button", {
        className: "nav-mobile-item " + (tab === item.id ? "active" : ""),
        onClick: () => setTab(item.id),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: item.icon,
          size: 20
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          children: item.label.split(" ")[0]
        }, void 0, false)]
      }, item.id, true)), user.tipo === "paulo" && NAV_PAULO.map(item => /*#__PURE__*/_jsxDEV("button", {
        className: "nav-mobile-item " + (tab === item.id ? "active" : ""),
        onClick: () => setTab(item.id),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: item.icon,
          size: 20
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          children: item.label.split(" ")[0]
        }, void 0, false)]
      }, item.id, true)), user.tipo === "marketing" && NAV_MARKETING.map(item => /*#__PURE__*/_jsxDEV("button", {
        className: "nav-mobile-item " + (tab === item.id ? "active" : ""),
        onClick: () => setTab(item.id),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: item.icon,
          size: 20
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          children: item.label
        }, void 0, false)]
      }, item.id, true))]
    }, void 0, true)]
  }, void 0, true);
}

// ═══════════════════════════════════════════════════════
//  FUNIL DE LEADS — KANBAN
// ═══════════════════════════════════════════════════════

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
root.render(/*#__PURE__*/_jsxDEV(App, {}, void 0, false));
