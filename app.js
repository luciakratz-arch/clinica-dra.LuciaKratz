// ═══════════════════════════════════════════════════════
//  ÁREA ADMINISTRATIVA — DRA. LUCIA KRATZ  
//  app.js — Etapa 2: Cadastro completo de pacientes
// ═══════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useRef, useMemo } = React;

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
async function getConfigFin(){
  try{
    const d = await db.collection("clinica_config").doc("comissoes").get();
    return d.exists ? {...CONFIG_FIN_PADRAO, ...d.data()} : {...CONFIG_FIN_PADRAO};
  }catch(e){ return {...CONFIG_FIN_PADRAO}; }
}

const LOGO_URL = "../logo-transparente.png";
const SENHA_ADMIN = "1234";
const SENHA_PAULO = "1234";
const SITE_URL = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";

const PERFIS = [
  { id:"psicologa",  nome:"Sou Psicologa",  desc:"Acesso ao painel clinico completo", icon:"stethoscope", cor:"#7B00C4" },
  { id:"secretaria", nome:"Sou Secretaria",  desc:"Cadastro de pacientes e financeiro da clinica", icon:"clipboard-list", cor:"#0891b2" },
  { id:"paulo",      nome:"Financeiro",      desc:"Acesso ao módulo financeiro completo", icon:"wallet", cor:"#16a34a" },
  { id:"marketing",  nome:"Marketing",       desc:"Captacao de leads e metricas de trafego", icon:"trending-up", cor:"#ea580c" },
];

const MODULOS = [
  { id:"tcc",      nome:"TCC — Pensamentos Automaticos", desc:"tcc" },
  { id:"humor",    nome:"Registro de Humor",             desc:"humor" },
  { id:"diario",   nome:"Diario Terapeutico",            desc:"diario" },
  { id:"metas",    nome:"Metas Terapeuticas",            desc:"metas" },
  { id:"reflexoes",nome:"Reflexoes Cognitivas",          desc:"reflexoes" },
  { id:"fabulas",  nome:"Fabulas Terapeuticas",          desc:"fabulas" },
  { id:"musico",   nome:"Musicoterapia",                 desc:"musicoterapia" },
];

const FERRAMENTAS = [
  { id:"arvore",      nome:"Arvore da Decisao",         desc:"Tecnica da TCC para transformar preocupacoes em acoes concretas." },
  { id:"ansiedade",   nome:"Gestao da Ansiedade",       desc:"Acompanhe nivel de estresse, tracking e roda da vida." },
  { id:"entrevista",  nome:"Entrevista Clinica Inicial",desc:"Instrumento de avaliacao clinica inicial com DSM-5." },
  { id:"anamnese",    nome:"Anamnese — Marcos do Desenvolvimento", desc:"Formulario completo de anamnese." },
  { id:"alimentacao", nome:"Rastreamento Emocional da Alimentacao", desc:"Consciencia sobre relacao entre emocoes e alimentacao." },
];

// ─── NOTIFICAÇÕES ─────────────────────────────────────────
// ─── NOTIFICAÇÕES PUSH (modelo Família Kratz) ─────────────

function fmtDataNotif(dataStr) {
  if (!dataStr) return "";
  const d = new Date(dataStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"2-digit"});
}

async function dispararNotificacao({ tipo, titulo, corpo="", pacienteId="" }) {
  try {
    await db.collection("clinica_notificacoes").add({
      tipo, titulo, corpo, pacienteId,
      lida: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) {}
}

// ─── ETAPA 1: HIGIENIZAÇÃO EM LOTE ────────────────────────
// Detecta e deleta duplicatas de Maio/2026 para um paciente.
// Critério: mesmo pacienteId + mesma data + mesmo valor + mesma descrição.
// Mantém o documento que possui pacoteId preenchido (ou o mais antigo).
async function deletarDuplicatasPaciente(pacienteId, mesRef) {
  try {
    const snap = await db.collection("clinica_lancamentos")
      .where("pacienteId","==",pacienteId)
      .get();
    const docs = snap.docs
      .map(d=>({id:d.id,...d.data()}))
      .filter(d=>(d.data||"").startsWith(mesRef));

    // Agrupar por chave composta
    const grupos = {};
    docs.forEach(d=>{
      const chave = `${d.data}|${parseFloat(d.valor||0).toFixed(2)}|${(d.descricao||d.tipo||"").trim().toLowerCase()}`;
      if(!grupos[chave]) grupos[chave]=[];
      grupos[chave].push(d);
    });

    const batch = db.batch();
    let deletados = 0;
    Object.values(grupos).forEach(grupo=>{
      if(grupo.length < 2) return;
      // Prioriza manter o que tem pacoteId; senão mantém o primeiro (mais antigo por ordem de array)
      grupo.sort((a,b)=>(b.pacoteId?1:0)-(a.pacoteId?1:0));
      const manter = grupo[0];
      // Garante que o mantido tem pacoteId se algum tinha
      const comPacote = grupo.find(g=>g.pacoteId);
      if(comPacote && !manter.pacoteId){
        batch.update(db.collection("clinica_lancamentos").doc(manter.id),{pacoteId:comPacote.pacoteId});
      }
      // Deleta os redundantes
      grupo.slice(1).forEach(dup=>{
        batch.delete(db.collection("clinica_lancamentos").doc(dup.id));
        deletados++;
      });
    });
    await batch.commit();
    return { ok:true, deletados };
  } catch(e) {
    return { ok:false, erro:e.message };
  }
}

// Categoriza lançamentos "Sem Nome" de um mês como Despesas Administrativas.
async function categorizarSemNome(mesRef) {
  try {
    const snap = await db.collection("clinica_lancamentos").get();
    const semNome = snap.docs.filter(d=>{
      const dado = d.data();
      const nome = (dado.pacienteNome||dado.nomePaciente||"").trim();
      return (!nome || nome==="") && (dado.data||"").startsWith(mesRef);
    });
    if(semNome.length===0) return { ok:true, atualizados:0 };
    const batch = db.batch();
    semNome.forEach(d=>{
      batch.update(d.ref,{
        pacienteNome:"— Clínica —",
        categoria:"Despesas Administrativas/Clínica",
        tipo_lancamento:"despesa",
        _auditoria:"categorizado_automatico_"+mesRef,
      });
    });
    await batch.commit();
    return { ok:true, atualizados:semNome.length };
  } catch(e) {
    return { ok:false, erro:e.message };
  }
}

// Deleta lançamentos tipo "sessao" que pertencem a pacotes (órfãos gerados por atualizarPagamento).
// Regra: se tem pacoteId + tipo_lancamento==sessao → é lixo, o pacote já cobre.
async function deletarLancamentosOrfaosDeSessao() {
  try {
    const snap = await db.collection("clinica_lancamentos")
      .where("tipo_lancamento","==","sessao").get();
    const orfaos = snap.docs.filter(d=>{
      const dado = d.data();
      return !!dado.pacoteId; // tem pacoteId = pertence a pacote = é duplicata
    });
    if(orfaos.length===0) return { ok:true, deletados:0 };
    // Firestore batch suporta até 500 operações
    const batches = [];
    let b = db.batch();
    orfaos.forEach((d,i)=>{
      b.delete(d.ref);
      if((i+1)%499===0){ batches.push(b); b=db.batch(); }
    });
    batches.push(b);
    await Promise.all(batches.map(bt=>bt.commit()));
    return { ok:true, deletados:orfaos.length };
  } catch(e) {
    return { ok:false, erro:e.message };
  }
}

function enviarPushLocal(titulo, corpo) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(titulo, { body: corpo, icon: "../logo-transparente.png" });
  }
}

async function verificarLembretesHoje(user) {
  if (!user) return;
  const hoje = new Date();
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
  const fmtDate = d => d.toISOString().split("T")[0];

  try {
    // Sessões de hoje e amanhã
    if (["psicologa","secretaria"].includes(user.tipo)) {
      const snap = await db.collection("clinica_sessoes")
        .where("data","in",[fmtDate(hoje), fmtDate(amanha)])
        .where("status","==","agendado").get();
      snap.docs.forEach(d => {
        const s = d.data();
        const dia = s.data === fmtDate(hoje) ? "Hoje" : "Amanhã";
        const diaSemana = fmtDataNotif(s.data);
        enviarPushLocal(
          `${dia} — Sessão às ${s.hora}`,
          `${diaSemana} · ${s.pacienteNome}`
        );
      });
    }

    // Pagamentos previstos (psicóloga e Paulo)
    if (["psicologa","paulo"].includes(user.tipo)) {
      const snap = await db.collection("clinica_lancamentos")
        .where("status","==","pendente")
        .where("data","<=", fmtDate(amanha)).get();
      snap.docs.forEach(d => {
        const l = d.data();
        const diaSemana = fmtDataNotif(l.data);
        enviarPushLocal(
          `Pagamento previsto — ${diaSemana}`,
          `R$ ${parseFloat(l.valor||0).toFixed(2).replace(".",",")} · ${l.pacienteNome||l.descricao||""}`
        );
      });
    }

    // Pagamentos pendentes (secretária)
    if (user.tipo === "secretaria") {
      const snap = await db.collection("clinica_lancamentos")
        .where("status","==","pendente").get();
      snap.docs.slice(0,3).forEach(d => {
        const l = d.data();
        const diaSemana = fmtDataNotif(l.data);
        enviarPushLocal(
          `Pagamento pendente — ${l.pacienteNome||""}`,
          `R$ ${parseFloat(l.valor||0).toFixed(2).replace(".",",")} · previsto ${diaSemana}`
        );
      });
    }
  } catch(e) {}
}

function useBotaoNotificacao(user) {
  const [permissao, setPermissao] = useState(
    "Notification" in window ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (!user || permissao !== "granted") return;
    // Verifica lembretes 2 segundos após login
    const t = setTimeout(() => verificarLembretesHoje(user), 2000);
    return () => clearTimeout(t);
  }, [user, permissao]);

  async function ativar() {
    if (!("Notification" in window)) { alert("Seu navegador não suporta notificações."); return; }
    const p = await Notification.requestPermission();
    setPermissao(p);
    if (p === "granted") {
      verificarLembretesHoje(user);
    }
  }

  return { permissao, ativar };
}

function BotaoNotificacao({ permissao, ativar }) {
  if (!("Notification" in window)) return null;
  if (permissao === "granted") return (
    <span style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:20,padding:"5px 14px",fontSize:12,fontFamily:"var(--font-body)"}}>
      🔔 Ativo
    </span>
  );
  if (permissao === "denied") return (
    <span style={{background:"rgba(255,0,0,0.15)",border:"1px solid rgba(255,0,0,0.3)",color:"#fca5a5",borderRadius:20,padding:"5px 14px",fontSize:12,fontFamily:"var(--font-body)"}}>
      🔕 Bloqueado
    </span>
  );
  return (
    <button onClick={ativar}
      style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:20,padding:"5px 14px",fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>
      🔔 Ativar lembretes
    </button>
  );
}

function useCollection(col, orderField="createdAt") {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = db.collection(col).onSnapshot(snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const av = a[orderField]?.seconds || a[orderField] || "";
        const bv = b[orderField]?.seconds || b[orderField] || "";
        return bv > av ? 1 : -1;
      });
      setData(docs); setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [col]);
  return { data, loading };
}

function Icon({ name, size=18 }) {
  const ref = useRef(null);
  useEffect(() => {
    try {
      if (!ref.current || !window.lucide) return;
      ref.current.innerHTML = "";
      const n = name.replace(/-([a-z])/g,(_, l)=>l.toUpperCase()).replace(/^./,s=>s.toUpperCase());
      const fn = lucide[n];
      if (!fn) return;
      const ic = lucide.createElement(fn);
      if (ic) {
        ic.setAttribute("width", size);
        ic.setAttribute("height", size);
        ic.setAttribute("stroke-width", "1.8");
        ref.current.appendChild(ic);
      }
    } catch(e) {}
  }, [name, size]);
  return <span ref={ref} style={{display:"inline-flex",alignItems:"center"}} />;
}

// ── TextArea com botão de voz reutilizável ──────────────────────────────────
function TextAreaVoz({value, onChange, placeholder, rows=3, className="form-input", style={}}){
  const [gravando, setGravando] = React.useState(false);
  const recRef = React.useRef(null);

  function toggleVoz(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return;
    if(gravando){ recRef.current?.stop(); setGravando(false); return; }
    const rec = new SR();
    rec.lang="pt-BR"; rec.continuous=true; rec.interimResults=true;
    rec.onresult = e=>{
      const t = Array.from(e.results).map(r=>r[0].transcript).join(" ");
      const base = (value||"").replace(/\s*\[\.\.\.]$/,"").trimEnd();
      onChange({target:{value: base ? base+" "+t : t}});
    };
    rec.onerror = ()=>setGravando(false);
    rec.onend   = ()=>setGravando(false);
    recRef.current = rec;
    rec.start();
    setGravando(true);
  }

  const SR_SUPPORT = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div style={{position:"relative"}}>
      <textarea
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        style={{...style, paddingRight: SR_SUPPORT ? 36 : undefined, resize:"vertical"}}
      />
      {SR_SUPPORT && (
        <button
          type="button"
          onClick={toggleVoz}
          title={gravando?"Parar gravação":"Falar para digitar"}
          style={{
            position:"absolute", right:6, bottom:8,
            background: gravando?"#7B00C4":"#f3e6ff",
            border:"none", borderRadius:6, padding:"4px 6px",
            cursor:"pointer", color: gravando?"white":"#7B00C4",
            fontSize:14, lineHeight:1,
            boxShadow: gravando?"0 0 0 3px #7B00C430":"none",
            transition:"all .2s"
          }}>
          🎙️
        </button>
      )}
      {gravando && (
        <div style={{fontSize:11,color:"#7B00C4",marginTop:3,display:"flex",alignItems:"center",gap:4}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#7B00C4",display:"inline-block",animation:"pulse-slow 1s infinite"}}/>
          Gravando... clique 🎙️ para parar
        </div>
      )}
    </div>
  );
}


function Spinner() { return <div className="spinner-wrap"><div className="spinner"/></div>; }
function EmBreve({ titulo, subtitulo }) {
  return (
    <div className="em-breve">
      <Icon name="wrench" size={48}/>
      <div className="em-breve-title">{titulo}</div>
      <div className="em-breve-sub">{subtitulo||"Modulo em construcao."}</div>
    </div>
  );
}

// LOGIN
function Login({ onLogin }) {
  const [etapa, setEtapa] = useState("perfil");
  const [senha, setSenha] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [perfilSel, setPerfilSel] = useState(null);

  async function handleLogin(e) {
    e.preventDefault(); setErro(""); setLoading(true);
    try {
      if (perfilSel === "psicologa") {
        if (senha === SENHA_ADMIN) onLogin({ tipo:"psicologa", nome:"Dra. Lucia Kratz", crp:"CRP 09/20590" });
        else setErro("Senha incorreta.");
      } else if (perfilSel === "paulo") {
        if (senha === SENHA_PAULO) onLogin({ tipo:"paulo", nome:"Paulo Sergio" });
        else setErro("Senha incorreta.");
      } else if (perfilSel === "secretaria") {
        const snap = await db.collection("clinica_secretarias").where("email","==",email.toLowerCase().trim()).get();
        if (snap.empty) { setErro("Usuario nao encontrado."); setLoading(false); return; }
        const sec = { id:snap.docs[0].id, ...snap.docs[0].data() };
        if (sec.senha !== senha) { setErro("Senha incorreta."); setLoading(false); return; }
        const nomeReal = sec.nome && !sec.nome.includes("@") ? sec.nome : "Secretaria";
        onLogin({ ...sec, tipo:"secretaria", nome: nomeReal });
      } else if (perfilSel === "marketing") {
        if (senha === "1234") onLogin({ tipo:"marketing", nome:"Marketing" });
        else setErro("Senha incorreta.");
      }
    } catch(e) { setErro("Erro ao conectar."); }
    setLoading(false);
  }

  const perfil = PERFIS.find(p => p.id === perfilSel);

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo">
          <img src={LOGO_URL} alt="Lucia Kratz" style={{width:140,height:140,objectFit:"contain"}}/>
        </div>
        <div className="login-name">Dra. Lucia Kratz</div>
        <div className="login-subtitle">Sistema Administrativo</div>
        <div className="login-crp">Psicologa Doutora · CRP 09/20590</div>
        <div className="login-left-btns">
          {PERFIS.map(p=>(
            <button key={p.id} onClick={()=>{setPerfilSel(p.id);setEtapa("senha");setErro("");setSenha("");setEmail("");}}>
              {p.nome.replace("Sou ","")}
            </button>
          ))}
        </div>
      </div>
      <div className="login-right">
        {etapa === "perfil" && (
          <>
            <div style={{width:"100%"}}>
              <div className="login-right-title">Area Administrativa</div>
              <div className="login-right-sub">Selecione seu perfil de acesso.</div>
            </div>
            <div className="profile-cards">
              {PERFIS.map(p=>(
                <button key={p.id} className="profile-card" onClick={()=>{setPerfilSel(p.id);setEtapa("senha");setErro("");}}>
                  <div className="profile-card-icon" style={{background:p.cor}}><Icon name={p.icon} size={22}/></div>
                  <div className="profile-card-text">
                    <div className="profile-card-name">{p.nome}</div>
                    <div className="profile-card-desc">{p.desc}</div>
                  </div>
                  <div className="profile-card-arrow"><Icon name="chevron-right" size={18}/></div>
                </button>
              ))}
            </div>
            <div className="login-footer">
            <a href="../sala/" target="_blank" style={{color:"#ea580c",fontSize:13,display:"flex",alignItems:"center",gap:6,textDecoration:"none",marginBottom:8}}>
              <span style={{width:28,height:28,borderRadius:8,background:"#fff7ed",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                <Icon name="door-open" size={15}/>
              </span>
              Agenda da Sala
            </a>
            <a href="../clinica/" style={{color:"#7B00C4",fontSize:13,display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <Icon name="activity" size={14}/> Área Clínica
            </a>
            <a href="../" style={{color:"var(--gray-400)",fontSize:12}}>Voltar ao site</a>
          </div>
          </>
        )}
        {etapa === "senha" && perfil && (
          <>
            <button className="login-right-back" onClick={()=>{setEtapa("perfil");setErro("");}}>
              <Icon name="arrow-left" size={14}/> Voltar
            </button>
            <form className="login-form" onSubmit={handleLogin}>
              <div>
                <div className="login-form-title">{perfil.nome}</div>
                <div className="login-form-sub">{perfil.desc}</div>
              </div>
              {erro && <div className="login-error">{erro}</div>}
              {perfilSel === "secretaria" && (
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus/>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" value={senha} onChange={e=>setSenha(e.target.value)} autoFocus={perfilSel!=="secretaria"}/>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>{loading?"Entrando...":"Entrar"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// NAV
const NAV_PSICOLOGA = [
  { grupo:"🏥 Clínica", itens:[
    {id:"dashboard",    label:"Dashboard",             icon:"layout-dashboard"},
    {id:"pacientes",    label:"Pacientes",             icon:"users"},
    {id:"alunos",       label:"Alunos",                icon:"graduation-cap"},
    {id:"casais",       label:"Terapia de Casais",     icon:"heart"},
    {id:"agenda",       label:"Agenda",                icon:"calendar"},
    {id:"laudos",       label:"Laudos",                icon:"file-text"},
    {id:"recursos",     label:"Recursos Terapêuticos", icon:"wrench"},
  ]},
  { grupo:"📊 Comercial & Marketing", itens:[
    {id:"funil-leads",           label:"Funil de Leads", icon:"filter"},
    {id:"marketing-dashboard",   label:"Marketing",      icon:"trending-up"},
    {id:"dashboard-performance", label:"Performance",    icon:"activity"},
    {id:"vitrine",               label:"Vitrine de Produtos", icon:"shopping-bag"},
  ]},
  { grupo:"💰 Financeiro", itens:[
    {id:"fin-clinica",  label:"Fin. Clínica",  icon:"dollar-sign"},
    {id:"fin-pessoal",  label:"Fin. Pessoal",  icon:"home"},
    {id:"fin-empresa",  label:"Fin. Empresa",  icon:"briefcase"},
    {id:"painel-geral", label:"Painel Geral",  icon:"pie-chart"},
  ]},
  { grupo:"⚙️ Configurações", itens:[
    {id:"permissoes",  label:"Permissões",    icon:"shield"},
    {id:"depoimentos", label:"Depoimentos",    icon:"star"},
    {id:"config",      label:"Configurações",  icon:"settings"},
  ]},
];

// Lista plana para compatibilidade com código existente
const NAV_PSICOLOGA_FLAT = NAV_PSICOLOGA.flatMap(g=>g.itens);

const NAV_SECRETARIA = [
  {id:"pacientes",   label:"Pacientes",    icon:"users"},
  {id:"agenda",      label:"Agenda",       icon:"calendar"},
  {id:"funil-leads", label:"Funil Leads",  icon:"filter"},
  {id:"fin-clinica", label:"Financeiro",   icon:"dollar-sign"},
  {id:"comissoes",   label:"Comissoes",    icon:"percent"},
];
const NAV_PAULO = [
  {id:"fin-pessoal",  label:"Financeiro Pessoal",  icon:"home"},
  {id:"fin-empresa",  label:"Financeiro Empresa",  icon:"briefcase"},
  {id:"fin-clinica",  label:"Financeiro Clínica",  icon:"building-2"},
];

// SIDEBAR
function Sidebar({ user, tab, setTab, onLogout, notifProps }) {
  const isPsicologa = user.tipo==="psicologa";
  const titulo = user.tipo==="secretaria"?"Area da Secretaria":user.tipo==="paulo"?"Financeiro":user.tipo==="marketing"?"Marketing":"Area Administrativa";
  const nomeExibir = user.nome && !user.nome.includes("@") ? user.nome : (user.nomeCompleto || "Usuário");
  const initials = nomeExibir.split(" ").map(w=>w[0]).filter(Boolean).slice(0,2).join("").toUpperCase() || "U";

  // Nav plana para perfis simples
  const navFlat = user.tipo==="secretaria" ? NAV_SECRETARIA
    : user.tipo==="paulo" ? NAV_PAULO
    : user.tipo==="marketing" ? NAV_MARKETING
    : null; // psicologa usa grupos

  return (
    <div className="sidebar-desktop">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={LOGO_URL} alt="LK" style={{width:44,height:44,objectFit:"contain"}} onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="block";}}/>
          <span className="sidebar-logo-placeholder" style={{display:"none"}}>LK</span>
        </div>
        <div>
          <div className="sidebar-title">Dra. Lucia Kratz</div>
          <div className="sidebar-role">{titulo}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {isPsicologa ? (
          // Menu com grupos para psicóloga
          NAV_PSICOLOGA.map(grupo=>(
            <div key={grupo.grupo} style={{marginBottom:4}}>
              <div style={{
                fontSize:10, fontWeight:700, letterSpacing:"0.08em",
                color:"rgba(255,255,255,0.45)", padding:"10px 14px 4px",
                textTransform:"uppercase"
              }}>
                {grupo.grupo}
              </div>
              {grupo.itens.map(item=>(
                <button key={item.id} className={"nav-item "+(tab===item.id?"active":"")} onClick={()=>setTab(item.id)}>
                  <Icon name={item.icon} size={18}/>{item.label}
                </button>
              ))}
            </div>
          ))
        ) : (
          // Menu plano para outros perfis
          navFlat.map(item=>(
            <button key={item.id} className={"nav-item "+(tab===item.id?"active":"")} onClick={()=>setTab(item.id)}>
              <Icon name={item.icon} size={18}/>{item.label}
            </button>
          ))
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.08)",borderRadius:10,marginBottom:8}}>
          <div className="sidebar-avatar" style={{flexShrink:0}}>{initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="sidebar-user-name" style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nomeExibir}</div>
            {user.crp && <div className="sidebar-user-crp">{user.crp}</div>}
          </div>
          {notifProps && <BotaoNotificacao {...notifProps}/>}
        </div>
        {user.tipo==="psicologa"&&(
          <a href="../sala/" target="_blank" className="nav-item" style={{color:"rgba(255,255,255,0.85)",background:"rgba(234,88,12,0.2)",borderRadius:8,marginBottom:2}}>
            <Icon name="door-open" size={18}/> Agenda da Sala
          </a>
        )}
        <a href="../clinica/" className="nav-item" style={{color:"rgba(255,255,255,0.85)",background:"rgba(123,0,196,0.25)",borderRadius:8,marginBottom:2}}>
          <Icon name="activity" size={18}/> Área Clínica
        </a>
        <a href="../" className="nav-item" style={{color:"rgba(255,255,255,0.6)"}}>
          <Icon name="globe" size={18}/> Site
        </a>
        <button className="nav-item nav-item-danger" onClick={onLogout}>
          <Icon name="log-out" size={18}/> Sair
        </button>
      </div>
    </div>
  );
}

// DASHBOARD
function DashboardAdmin({ user }) {
  const { data:pacientes } = useCollection("clinica_pacientes","nome");
  const [lancClinica, setLancClinica]   = useState([]);
  const [lancPessoal, setLancPessoal]   = useState([]);
  const [sessoes, setSessoes]           = useState([]);

  useEffect(()=>{
    const u1=db.collection("clinica_lancamentos").onSnapshot(s=>setLancClinica(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const u2=db.collection("clinica_financeiro_pessoal").onSnapshot(s=>setLancPessoal(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const u3=db.collection("clinica_sessoes").onSnapshot(s=>setSessoes(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return()=>{u1();u2();u3();};
  },[]);

  const mesAtual = new Date().toISOString().slice(0,7);
  const hoje = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const ativos = pacientes.filter(p=>p.status==="ativo").length;
  const sessoesHoje = sessoes.filter(s=>s.data===new Date().toISOString().slice(0,10)).length;

  function fmt(v){ return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

  // Clínica mês
  const lcMes = lancClinica.filter(l=>l.data?.startsWith(mesAtual));
  const recClinica  = lcMes.filter(l=>l.tipo_lancamento!=="despesa"&&(l.status==="recebido"||l.status==="pago")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  const despClinica = lcMes.filter(l=>l.tipo_lancamento==="despesa"&&(l.status==="recebido"||l.status==="pago")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  // Pessoal mês
  const lpMes = lancPessoal.filter(l=>l.data?.startsWith(mesAtual));
  const recPessoal  = lpMes.filter(l=>l.tipo==="receita"&&(l.status==="pago"||l.status==="recebido")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  const despPessoal = lpMes.filter(l=>l.tipo==="despesa"&&(l.status==="pago"||l.status==="recebido")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  const totalRec  = recClinica + recPessoal;
  const totalDesp = despClinica + despPessoal;
  const saldoMes  = totalRec - totalDesp;

  // Acumulado ano
  const anoAtual = new Date().getFullYear()+"";
  const lcAno = lancClinica.filter(l=>l.data?.startsWith(anoAtual));
  const lpAno = lancPessoal.filter(l=>l.data?.startsWith(anoAtual));
  const recAno  = lcAno.filter(l=>l.tipo_lancamento!=="despesa"&&(l.status==="recebido"||l.status==="pago")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0)
                + lpAno.filter(l=>l.tipo==="receita"&&(l.status==="pago"||l.status==="recebido")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  const despAno = lcAno.filter(l=>l.tipo_lancamento==="despesa"&&(l.status==="recebido"||l.status==="pago")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0)
                + lpAno.filter(l=>l.tipo==="despesa"&&(l.status==="pago"||l.status==="recebido")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  const saldoAno = recAno - despAno;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle" style={{textTransform:"capitalize"}}>{hoje}</div>
      </div>

      {/* Métricas clínicas */}
      <div className="metrics-grid" style={{marginBottom:24}}>
        <div className="metric-card"><div className="metric-icon"><Icon name="users" size={20}/></div><div className="metric-label">Pacientes Ativos</div><div className="metric-value">{ativos}</div><div className="metric-sub">{pacientes.length} total</div></div>
        <div className="metric-card"><div className="metric-icon"><Icon name="calendar" size={20}/></div><div className="metric-label">Sessões Hoje</div><div className="metric-value">{sessoesHoje}</div><div className="metric-sub">agendadas</div></div>
        <div className="metric-card"><div className="metric-icon"><Icon name="package" size={20}/></div><div className="metric-label">Pendente Clínica</div><div className="metric-value" style={{fontSize:18,color:"#d97706"}}>{fmt(lcMes.filter(l=>l.status==="pendente").reduce((a,l)=>a+(parseFloat(l.valor)||0),0))}</div></div>
        <div className="metric-card"><div className="metric-icon"><Icon name="heart" size={20}/></div><div className="metric-label">Casais em Terapia</div><div className="metric-value">{pacientes.filter(p=>p.casalId).length/2|0}</div></div>
      </div>

      {/* Resumo Financeiro Integrado */}
      <div className="card" style={{marginBottom:24}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
          <Icon name="bar-chart-2" size={18}/> Resumo Financeiro — {new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:20}}>
          <div style={{background:saldoMes>=0?"#d1fae5":"#fee2e2",borderRadius:12,padding:"16px 20px",border:"1.5px solid",borderColor:saldoMes>=0?"#6ee7b7":"#fca5a5"}}>
            <div style={{fontSize:12,fontWeight:600,color:saldoMes>=0?"#059669":"#dc2626",marginBottom:6}}>Saldo do Mês (Geral)</div>
            <div style={{fontSize:24,fontWeight:800,color:saldoMes>=0?"#059669":"#dc2626"}}>{fmt(saldoMes)}</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:4}}>Clínica + Pessoal</div>
          </div>
          <div style={{background:"#f0fdf4",borderRadius:12,padding:"16px 20px",border:"1.5px solid #86efac"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#059669",marginBottom:6}}>Total Receitas</div>
            <div style={{fontSize:22,fontWeight:800,color:"#059669"}}>{fmt(totalRec)}</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:4}}>Clínica: {fmt(recClinica)} · Pessoal: {fmt(recPessoal)}</div>
          </div>
          <div style={{background:"#fef2f2",borderRadius:12,padding:"16px 20px",border:"1.5px solid #fca5a5"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#dc2626",marginBottom:6}}>Total Despesas</div>
            <div style={{fontSize:22,fontWeight:800,color:"#dc2626"}}>{fmt(totalDesp)}</div>
            <div style={{fontSize:12,color:"#6b7280",marginTop:4}}>Clínica: {fmt(despClinica)} · Pessoal: {fmt(despPessoal)}</div>
          </div>
        </div>

        {/* Acumulado ano */}
        <div style={{borderTop:"1px solid var(--gray-100)",paddingTop:16}}>
          <div style={{fontWeight:600,marginBottom:12,fontSize:14,color:"var(--text-muted)"}}>Acumulado {anoAtual}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:8}}>
            <div style={{padding:"12px 16px",borderRadius:10,background:"var(--gray-50)",border:"1px solid var(--gray-200)"}}>
              <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>Receitas {anoAtual}</div>
              <div style={{fontWeight:700,fontSize:18,color:"#059669"}}>{fmt(recAno)}</div>
            </div>
            <div style={{padding:"12px 16px",borderRadius:10,background:"var(--gray-50)",border:"1px solid var(--gray-200)"}}>
              <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>Despesas {anoAtual}</div>
              <div style={{fontWeight:700,fontSize:18,color:"#dc2626"}}>{fmt(despAno)}</div>
            </div>
            <div style={{padding:"12px 16px",borderRadius:10,background:saldoAno>=0?"#f0fdf4":"#fef2f2",border:"1px solid",borderColor:saldoAno>=0?"#86efac":"#fca5a5"}}>
              <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>Saldo Acumulado {anoAtual}</div>
              <div style={{fontWeight:700,fontSize:18,color:saldoAno>=0?"#059669":"#dc2626"}}>{fmt(saldoAno)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:600,marginBottom:8}}>Bem-vinda, {user.nome} 🦋</div>
        <a href="../clinica/" style={{fontSize:13,color:"var(--purple)",display:"flex",alignItems:"center",gap:6,width:"fit-content",marginTop:8}}><Icon name="external-link" size={14}/> Portal do Paciente</a>
      </div>
    </div>
  );
}

// ABA PERFIL
function AbaPerfil({ paciente, pacientes }) {
  const [form, setForm] = useState({...paciente});
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function salvar() {
    setSalvando(true);
    const { id, ...dados } = form;
    await db.collection("clinica_pacientes").doc(paciente.id).update(dados);
    setSalvando(false);
    alert("Salvo!");
  }

  async function redefinirSenha() {
    await db.collection("clinica_pacientes").doc(paciente.id).update({ senha:"1234" });
    alert("Senha redefinida para 1234.");
  }

  const msgAcesso = "Ola, "+paciente.nome+"! Butterfly\n\nSeu acesso ao portal terapeutico da Dra. Lucia Kratz esta pronto.\n\nLink: "+SITE_URL+"/clinica/\n\nEmail: "+paciente.email+"\nSenha: 1234\n\nDra. Lucia Kratz - CRP 09/20590";

  function copiarMsg() {
    const msg = "Ola, "+paciente.nome+"!\n\nSeu acesso ao portal terapeutico da Dra. Lucia Kratz esta pronto.\n\nLink de acesso: "+SITE_URL+"/clinica/\n\nEmail: "+paciente.email+"\nSenha: 1234\n\nAo entrar pela primeira vez, recomendo trocar a senha em Minha Conta.\n\nQualquer duvida, estou a disposicao!\nDra. Lucia Kratz - CRP 09/20590";
    navigator.clipboard.writeText(msg);
    setCopiado(true);
    setTimeout(()=>setCopiado(false),2000);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div className="card">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div className="form-group" style={{gridColumn:"span 2"}}>
            <label className="form-label">Nome completo</label>
            <input className="form-input" value={form.nome||""} onChange={e=>setForm({...form,nome:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input className="form-input" value={form.telefone||""} onChange={e=>setForm({...form,telefone:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Data de Nascimento</label>
            <input className="form-input" type="date" value={form.dataNasc||""} onChange={e=>setForm({...form,dataNasc:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">CPF</label>
            <input className="form-input" value={form.cpf||""} onChange={e=>setForm({...form,cpf:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Genero</label>
            <select className="form-input" value={form.genero||""} onChange={e=>setForm({...form,genero:e.target.value})}>
              <option value="">Selecione</option>
              <option>Feminino</option><option>Masculino</option><option>Nao-binario</option><option>Nao informar</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              {[["ativo","Ativo","var(--success)"],["inativo","Inativo","var(--danger)"],["alta","Alta","var(--gray-400)"]].map(([s,l,c])=>(
                <button key={s} onClick={()=>setForm({...form,status:s})} style={{
                  padding:"7px 14px",borderRadius:20,border:"1.5px solid "+c,cursor:"pointer",fontSize:13,
                  fontFamily:"var(--font-body)",background:form.status===s?c:"white",color:form.status===s?"white":c
                }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{gridColumn:"span 2",fontSize:12,fontWeight:700,color:"var(--purple)",borderBottom:"1px solid var(--purple-soft)",paddingBottom:4,marginTop:4,textTransform:"uppercase",letterSpacing:0.5}}>
            🏢 Dados Ocupacionais — para documentos NR-1 e declarações
          </div>
          <div className="form-group" style={{gridColumn:"span 2"}}>
            <label className="form-label">Empresa Contratante</label>
            <input className="form-input" value={form.empresa||""} onChange={e=>setForm({...form,empresa:e.target.value})} placeholder="Ex: Construtora Horizonte Ltda."/>
          </div>
          <div className="form-group">
            <label className="form-label">Setor</label>
            <input className="form-input" value={form.setor||""} onChange={e=>setForm({...form,setor:e.target.value})} placeholder="Ex: Administrativo"/>
          </div>
          <div className="form-group">
            <label className="form-label">Cargo</label>
            <input className="form-input" value={form.cargo||""} onChange={e=>setForm({...form,cargo:e.target.value})} placeholder="Ex: Analista de RH"/>
          </div>
          <div className="form-group" style={{gridColumn:"span 2"}}>
            <label className="form-label">Objetivos Terapeuticos</label>
            <TextAreaVoz className="form-input" rows={3} value={form.objetivos||""} onChange={e=>setForm({...form,objetivos:e.target.value})} placeholder="Descreva os objetivos da terapia..."/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button className="btn btn-purple" onClick={salvar} disabled={salvando}>{salvando?"Salvando...":"Salvar alteracoes"}</button>
        </div>
      </div>
      <div className="card">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Icon name="key" size={18}/><div style={{fontWeight:600}}>Credenciais de Acesso</div></div>
        <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>Copie o texto abaixo e envie para o paciente. A senha padrao e <strong>1234</strong>.</p>
        <div style={{background:"var(--gray-50)",border:"1px solid var(--gray-200)",borderRadius:10,padding:16,fontSize:13,lineHeight:1.8,color:"var(--text-muted)"}}>
          {"Ola, "+paciente.nome+"!\n\nSeu acesso ao portal terapeutico da Dra. Lucia Kratz esta pronto.\nLink: "+SITE_URL+"/clinica/\nEmail: "+paciente.email+"\nSenha: 1234\n\nDra. Lucia Kratz - CRP 09/20590"}
        </div>
        <div style={{display:"flex",gap:10,marginTop:12}}>
          <button className="btn btn-outline" onClick={copiarMsg}><Icon name="copy" size={15}/> {copiado?"Copiado!":"Copiar mensagem"}</button>
          <button className="btn btn-ghost" onClick={redefinirSenha}><Icon name="key" size={15}/> Redefinir senha para 1234</button>
        </div>
      </div>
    </div>
  );
}

// ABA MODULOS
// FERRAMENTAS FIXAS DO MÓDULO I
const FERRAMENTAS_MOD1 = [
  { id:"humor",  nome:"Check-in Diário",      desc:"Registro de humor e bem-estar diário" },
  { id:"metas",  nome:"Metas Terapêuticas",   desc:"Acompanhamento de metas" },
  { id:"diario", nome:"Diário Terapêutico",   desc:"Escrita reflexiva livre" },
  // Pensamentos Automáticos e Reflexões Cognitivas → Módulo III (Ansiedade e Controle dos Pensamentos)
];

function Toggle({ ativo, onClick }) {
  return (
    <button onClick={onClick} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:ativo?"var(--purple)":"var(--gray-200)",position:"relative",transition:"background .2s",flexShrink:0}}>
      <span style={{position:"absolute",top:2,left:ativo?"22px":"2px",width:20,height:20,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
    </button>
  );
}

function AbaModulos({ paciente }) {
  const [config, setConfig] = useState(paciente.modulosConfig || {});
  const [recursos, setRecursos] = useState([]);
  const [fabulas, setFabulas] = useState([]);
  const [psicoeducacao, setPsicoeducacao] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [modalSugestao, setModalSugestao] = useState(null); // {ferramenta, categoria, sugestoes}
  const [sugestoesSel, setSugestoesSel] = useState({});

  useEffect(() => {
    // Busca config atualizado do Firebase (ignora cache da prop)
    db.collection("clinica_pacientes").doc(paciente.id).get().then(d => {
      if (d.exists && d.data().modulosConfig) setConfig(d.data().modulosConfig);
    });
    db.collection("clinica_recursos").get().then(s => setRecursos(s.docs.map(d=>({id:d.id,...d.data()}))));
    db.collection("clinica_fabulas").onSnapshot(s => setFabulas(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
    db.collection("clinica_psicoeducacao").onSnapshot(s => setPsicoeducacao(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
  }, [paciente.id]);

  async function salvarConfig(novaConfig) {
    setConfig(novaConfig);
    // Atualiza também modulosAtivos para compatibilidade
    const ativos = Object.keys(novaConfig).filter(k => novaConfig[k]?.ativo);
    await db.collection("clinica_pacientes").doc(paciente.id).update({
      modulosConfig: novaConfig,
      modulosAtivos: ativos
    });
  }

  function toggleModulo(modId) {
    const atual = config[modId] || {};
    const novaConfig = { ...config, [modId]: { ...atual, ativo: !atual.ativo, ferramentas: atual.ferramentas || {} } };
    salvarConfig(novaConfig);
  }

  function toggleFerramenta(modId, ferrId) {
    const modAtual = config[modId] || { ativo: true, ferramentas: {} };
    const ferrAtual = modAtual.ferramentas || {};
    const hoje = new Date().toISOString().split("T")[0];
    const estaAtiva = !!ferrAtual[ferrId];

    // Se está desativando, só remove — sem sugestão
    if(estaAtiva){
      const novaFerr = { ...ferrAtual };
      delete novaFerr[ferrId];
      salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: novaFerr } });
      return;
    }

    // Ativando — primeiro salva a ferramenta
    const novaFerr = { ...ferrAtual, [ferrId]: { ativo: true, dataInicio: hoje } };
    salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: novaFerr } });

    // Busca categoria da ferramenta para sugestões
    const rec = recursos.find(r=>r.id===ferrId);
    const catFerr = rec?.categoria || "";
    const macroId = FAB_LEGADO_MACRO[catFerr] || catFerr;
    if(!macroId || !macroId.startsWith("macro_")) return; // sem sugestões para cats sem macro

    // Busca fábulas e psicoeducações da mesma macrocategoria não ativadas
    const ferrAtivadas = new Set(Object.keys(novaFerr));
    const fabSugest = fabulas.filter(f=>
      (FAB_LEGADO_MACRO[f.categoria||""]===macroId || f.categoria===macroId) &&
      !ferrAtivadas.has(f.id)
    ).slice(0,3);
    const psicoSugest = psicoeducacao.filter(p=>
      (PSICO_LEGADO_MACRO[p.categoria||""]===macroId || p.categoria===macroId) &&
      !ferrAtivadas.has(p.id)
    ).slice(0,3);

    if(fabSugest.length===0 && psicoSugest.length===0) return;

    const macro = MACROCATEGORIAS.find(m=>m.id===macroId);
    setModalSugestao({
      ferramenta: rec?.titulo || ferrId,
      categoria: macro?.label || macroId,
      cor: macro?.cor || "#7B00C4",
      bg: macro?.bg || "#f3e6ff",
      icone: macro?.icone || "🔧",
      modId,
      fabulas: fabSugest,
      psicoeducacao: psicoSugest,
    });
    setSugestoesSel({});
  }

  async function ativarSugestoes(){
    if(!modalSugestao) return;
    const hoje = new Date().toISOString().split("T")[0];
    const modAtual = config[modalSugestao.modId] || { ativo:true, ferramentas:{} };
    const ferrAtual = { ...modAtual.ferramentas };
    // Ativa fábulas selecionadas no mod2
    const modFab = config["mod2"] || { ativo:true, ferramentas:{} };
    const ferrFab = { ...modFab.ferramentas };
    // Ativa psico selecionadas no mod6
    const modPsico = config["mod6"] || { ativo:true, ferramentas:{} };
    const ferrPsico = { ...modPsico.ferramentas };

    Object.entries(sugestoesSel).forEach(([id, sel])=>{
      if(!sel) return;
      const isFab = modalSugestao.fabulas.some(f=>f.id===id);
      const isPsico = modalSugestao.psicoeducacao.some(p=>p.id===id);
      if(isFab) ferrFab[id] = { ativo:true, dataInicio: hoje };
      if(isPsico) ferrPsico[id] = { ativo:true, dataInicio: hoje };
    });

    await db.collection("clinica_pacientes").doc(paciente.id).update({
      modulosConfig: {
        ...config,
        mod2: { ...modFab, ativo:true, ferramentas: ferrFab },
        mod6: { ...modPsico, ativo:true, ferramentas: ferrPsico },
      },
      modulosAtivos: [...new Set([...Object.keys(config).filter(k=>config[k]?.ativo), "mod2", "mod6"])],
    });
    setConfig(c=>({
      ...c,
      mod2: { ...modFab, ativo:true, ferramentas: ferrFab },
      mod6: { ...modPsico, ativo:true, ferramentas: ferrPsico },
    }));
    setModalSugestao(null);
  }

  function setDataInicio(modId, ferrId, data) {
    const modAtual = config[modId] || { ativo: true, ferramentas: {} };
    const ferrAtual = modAtual.ferramentas || {};
    salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: { ...ferrAtual, [ferrId]: { ...(ferrAtual[ferrId]||{}), dataInicio: data } } } });
  }

  const MODULOS_DEF = [
    { id:"mod1", nome:"Módulo I — Dashboard", desc:"Ferramentas do dia a dia", icone:"🧠", ferramentas: FERRAMENTAS_MOD1 },
    { id:"mod2", nome:"Módulo II — Fábulas Terapêuticas", desc:"Fábulas cadastradas em Recursos", icone:"📖", ferramentas: fabulas.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.macroCategoria||f.categoria||"", cat:f.macroCategoria||f.categoria||""})) },
    { id:"mod3", nome:"Módulo III — Ferramentas", desc:"Ferramentas cadastradas em Recursos", icone:"🔧", ferramentas: recursos.filter(r=>r.categoria!=="musicoterapia"&&r.categoria!=="casal").map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.macroCategoria||f.categoria||"", cat:f.macroCategoria||f.categoria||""})) },
    { id:"mod4", nome:"Módulo IV — Musicoterapia", desc:"Ferramentas de musicoterapia", icone:"🎵", ferramentas: recursos.filter(r=>r.categoria==="musicoterapia").map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.descricao||""})) },
    { id:"mod5", nome:"Módulo V — Terapia de Casais", desc:"Etapas da terapia de casais", icone:"💑",
      ferramentas: [
        {id:"etapa1-casal", nome:"Etapa 1 — Reconexão e Segurança Emocional",    desc:"Reduzir defensividade e aumentar conexão emocional"},
        {id:"etapa2-casal", nome:"Etapa 2 — Identidade e Vínculo do Casal",       desc:"Resgatar identidade afetiva e visão compartilhada"},
        {id:"etapa3-casal", nome:"Etapa 3 — Conceitualização Cognitiva",          desc:"Identificar padrões cognitivos e crenças relacionais"},
        {id:"etapa4-casal", nome:"Etapa 4 — Reestruturação Relacional",           desc:"Criar novos padrões emocionais e comportamentais"},
      ],
      automatico: false },
    { id:"mod6", nome:"Módulo VI — Psicoeducação", desc:"Materiais psicoeducativos cadastrados em Recursos", icone:"🎓",
      ferramentas: psicoeducacao.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.macroCategoria||f.categoria||"", cat:f.macroCategoria||f.categoria||""})) },
  ];

  // Módulos que agrupam por macrocategoria
  const MODS_COM_GRUPO = new Set(["mod2","mod3","mod6"]);

  // Mapa categoria → macrocategoria para agrupamento
  const CAT_PARA_MACRO_MOD = {
    // Ferramentas (mod3)
    ansiedade_diaria:"macro_ansiedade", distorcoes:"macro_ansiedade",
    crencas_esquemas:"macro_ansiedade", autocritica:"macro_ansiedade", procrastinacao:"macro_ansiedade",
    tcc:"macro_ansiedade", ansiedade:"macro_ansiedade", esquema:"macro_ansiedade",
    depressao:"macro_humor", desamor:"macro_humor", regulacao_emocional:"macro_humor",
    burnout:"macro_humor", vergonha:"macro_humor", emocoes:"macro_humor",
    rotina:"macro_habitos", sono:"macro_habitos", motivacao:"macro_habitos",
    neuroplasticidade:"macro_habitos", praticas_autocuidado:"macro_habitos", autocuidado:"macro_habitos",
    comunicacao:"macro_relacionamentos", dependencia:"macro_relacionamentos",
    limites:"macro_relacionamentos", ciumes:"macro_relacionamentos", toxicos:"macro_relacionamentos",
    relacionamentos:"macro_relacionamentos",
    conflitos_casal:"macro_casais", sexualidade:"macro_casais",
    parentalidade:"macro_casais", conflitos_familia:"macro_casais", traicao:"macro_casais",
    alimentacao:"macro_corpo", autoimagem:"macro_corpo", nervovago:"macro_corpo",
    sintomas_fisicos:"macro_corpo", saude_mental:"macro_corpo", corpo:"macro_corpo",
    musicoterapia:"macro_musico",
    avaliacao:"macro_aval",
    // Fábulas (mod2) — por tema
    resiliencia:"macro_habitos", esperanca:"macro_humor", autoconfianca:"macro_humor",
    autoconhecimento:"macro_ansiedade", perspectiva:"macro_habitos",
    mindfulness:"macro_habitos", ansiedade_fab:"macro_ansiedade",
    // Categorias adicionais de fábulas
    "resiliência":"macro_habitos", "esperança":"macro_humor",
    "autoconfiança":"macro_humor", "autoestima":"macro_humor",
    "expressão emocional":"macro_humor", "regulação emocional":"macro_humor",
    "perdão":"macro_humor", "crescimento":"macro_habitos",
    "autoconhecimento":"macro_ansiedade", "perspectiva":"macro_habitos",
    "mindfulness":"macro_habitos", "criatividade":"macro_habitos",
    "proposito":"macro_habitos", "propósito":"macro_habitos",
    // Psicoeducação (mod6) — igual ferramentas
  };

  // Mapa macroId → info visual
  const MACRO_INFO = {
    macro_ansiedade:      {icone:"🧠", label:"Ansiedade e Controle dos Pensamentos", cor:"#7B00C4", bg:"#f3e6ff"},
    macro_humor:          {icone:"❤️", label:"Humor e Regulação Emocional",          cor:"#db2777", bg:"#fce7f3"},
    macro_habitos:        {icone:"🌱", label:"Hábitos e Autocuidado",                cor:"#16a34a", bg:"#dcfce7"},
    macro_relacionamentos:{icone:"🤝", label:"Conflitos Interpessoais e Relacionamentos", cor:"#0891b2", bg:"#e0f2fe"},
    macro_casais:         {icone:"💑", label:"Casais, Família e Parentalidade",      cor:"#d97706", bg:"#fef3c7"},
    macro_corpo:          {icone:"🏃", label:"Corpo, Saúde e Conexão Somática",      cor:"#059669", bg:"#d1fae5"},
    macro_musico:         {icone:"🎵", label:"Musicoterapia",                        cor:"#7B00C4", bg:"#f3e6ff"},
    macro_aval:           {icone:"📋", label:"Avaliação e Anamnese",                 cor:"#6366f1", bg:"#e0e7ff"},
    _outros:              {icone:"🔧", label:"Outros",                               cor:"#6b7280", bg:"#f3f4f6"},
  };

  // Mapa nome da ferramenta → macro (para itens com categoria "outro")
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
    "Árvore da Decisão": "macro_ansiedade",
  };

  function agruparPorMacro(ferramentas) {
    const grupos = {};
    ferramentas.forEach(f => {
      const raw = f.desc || f.cat || "";
      let macroId;
      // 1. Já é macro_* direto
      if (MACRO_INFO[raw]) {
        macroId = raw;
      // 2. É "outro" ou vazio — tentar pelo nome
      } else if (!raw || raw === "outro" || raw === "outros") {
        // Busca parcial no nome
        const nomeLower = (f.nome||"").toLowerCase();
        const encontrado = Object.entries(NOME_PARA_MACRO).find(([k])=>nomeLower.includes(k.toLowerCase()));
        macroId = encontrado ? encontrado[1] : "_outros";
      // 3. Mapear categoria técnica
      } else {
        macroId = CAT_PARA_MACRO_MOD[raw] || CAT_PARA_MACRO_MOD[f.cat] || "_outros";
      }
      if (!grupos[macroId]) grupos[macroId] = [];
      grupos[macroId].push(f);
    });
    return Object.entries(MACRO_INFO)
      .filter(([id]) => grupos[id]?.length > 0)
      .map(([id, info]) => ({ id, ...info, itens: grupos[id] }));
  }

  const [gruposAbertos, setGruposAbertos] = useState({});
  function toggleGrupo(modId, grupoId) {
    const key = modId+"_"+grupoId;
    setGruposAbertos(g => ({...g, [key]: !g[key]}));
  }

  function renderFerramenta(ferr, modId, ferramentas) {
    const ferrConfig = ferramentas[ferr.id];
    const ferrAtiva = !!ferrConfig;
    return (
      <div key={ferr.id} style={{background:"white",borderRadius:10,
        border:`1.5px solid ${ferrAtiva?"var(--purple)":"var(--gray-200)"}`,
        padding:"12px 16px",display:"flex",alignItems:"center",gap:12,transition:"border-color .2s"}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:500,fontSize:13}}>{ferr.nome}</div>
          {ferr.desc && <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{ferr.desc}</div>}
        </div>
        {ferrAtiva && (
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <label style={{fontSize:11,color:"var(--text-muted)"}}>Início:</label>
            <input type="date" value={ferrConfig.dataInicio||""} onChange={e=>setDataInicio(modId,ferr.id,e.target.value)}
              style={{fontSize:12,border:"1px solid var(--gray-200)",borderRadius:6,padding:"3px 6px",fontFamily:"var(--font-body)"}}/>
          </div>
        )}
        <Toggle ativo={ferrAtiva} onClick={()=>toggleFerramenta(modId,ferr.id)}/>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {MODULOS_DEF.map(mod => {
        const modConfig = config[mod.id] || {};
        const ativo = !!modConfig.ativo;
        const ferramentas = modConfig.ferramentas || {};
        const usaGrupo = MODS_COM_GRUPO.has(mod.id);
        return (
          <div key={mod.id} style={{background:"white",borderRadius:14,border:`2px solid ${ativo?"var(--purple)":"var(--gray-200)"}`,overflow:"hidden",transition:"border-color .2s"}}>
            {/* Cabeçalho */}
            <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:ativo?"var(--purple-bg)":"white"}}>
              <div style={{fontSize:24}}>{mod.icone}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:"var(--text)"}}>{mod.nome}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{mod.desc}</div>
              </div>
              {mod.automatico
                ? <span style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic"}}>automático</span>
                : <Toggle ativo={ativo} onClick={()=>toggleModulo(mod.id)}/>}
            </div>

            {/* Ferramentas */}
            {ativo && !mod.automatico && (
              <div style={{borderTop:"1px solid var(--gray-100)",padding:"12px 20px",background:"#fafafa"}}>
                {mod.ferramentas.length === 0 ? (
                  <div style={{fontSize:13,color:"var(--text-muted)",padding:"8px 0"}}>
                    Nenhuma ferramenta cadastrada neste módulo ainda.
                  </div>
                ) : usaGrupo ? (
                  // ── Agrupado por macrocategoria ──
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {agruparPorMacro(mod.ferramentas).map(grupo => {
                      const key = mod.id+"_"+grupo.id;
                      const aberto = !!gruposAbertos[key]; // fechado por padrão
                      const ativosNoGrupo = grupo.itens.filter(f=>!!ferramentas[f.id]).length;
                      return (
                        <div key={grupo.id} style={{borderRadius:10,border:`1.5px solid ${grupo.cor}30`,overflow:"hidden"}}>
                          {/* Header do grupo */}
                          <div onClick={()=>toggleGrupo(mod.id,grupo.id)}
                            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                              background:grupo.bg,cursor:"pointer",userSelect:"none"}}>
                            <span style={{fontSize:16}}>{grupo.icone}</span>
                            <span style={{fontWeight:700,fontSize:12,color:grupo.cor,flex:1}}>
                              {grupo.label}
                            </span>
                            {ativosNoGrupo>0 && (
                              <span style={{background:grupo.cor,color:"white",borderRadius:20,
                                padding:"2px 8px",fontSize:11,fontWeight:700}}>
                                {ativosNoGrupo} ativo{ativosNoGrupo!==1?"s":""}
                              </span>
                            )}
                            <span style={{fontSize:11,color:grupo.cor,marginLeft:4}}>
                              {aberto?"▲":"▼"} {grupo.itens.length}
                            </span>
                          </div>
                          {/* Itens do grupo */}
                          {aberto && (
                            <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:8,background:"white"}}>
                              {grupo.itens.map(ferr => renderFerramenta(ferr, mod.id, ferramentas))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // ── Lista simples (mod1, mod4, mod5) ──
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>FERRAMENTAS DISPONÍVEIS</div>
                    {mod.ferramentas.map(ferr => renderFerramenta(ferr, mod.id, ferramentas))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    {/* Modal de sugestões */}
    {modalSugestao&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,
        display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:520,
          maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
          <div style={{background:`linear-gradient(135deg,${modalSugestao.cor},${modalSugestao.cor}cc)`,
            borderRadius:"16px 16px 0 0",padding:"18px 24px",color:"white"}}>
            <div style={{fontSize:11,opacity:0.85,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"}}>
              {modalSugestao.icone} {modalSugestao.categoria}
            </div>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,marginBottom:4}}>
              ✨ Sugestões para complementar
            </div>
            <div style={{fontSize:13,opacity:0.9}}>
              Você ativou <b>{modalSugestao.ferramenta}</b>. Selecione fábulas e psicoeducações da mesma temática.
            </div>
          </div>
          <div style={{padding:"20px 24px"}}>
            {modalSugestao.fabulas.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--purple)",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="book-open" size={15}/> Fábulas Terapêuticas
                </div>
                {modalSugestao.fabulas.map(f=>(
                  <label key={f.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",marginBottom:6,
                    background:sugestoesSel[f.id]?"var(--purple-soft)":"#fafafa",
                    border:`1.5px solid ${sugestoesSel[f.id]?"var(--purple)":"var(--gray-200)"}`,transition:"all .15s"}}>
                    <input type="checkbox" checked={!!sugestoesSel[f.id]}
                      onChange={e=>setSugestoesSel(s=>({...s,[f.id]:e.target.checked}))}
                      style={{marginTop:2,accentColor:"var(--purple)",flexShrink:0}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{f.titulo||f.nome}</div>
                      {f.moral&&<div style={{fontSize:11,color:"var(--text-muted)",marginTop:2,fontStyle:"italic"}}>"{f.moral}"</div>}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {modalSugestao.psicoeducacao.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--purple)",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="brain" size={15}/> Psicoeducação
                </div>
                {modalSugestao.psicoeducacao.map(p=>(
                  <label key={p.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",marginBottom:6,
                    background:sugestoesSel[p.id]?"var(--purple-soft)":"#fafafa",
                    border:`1.5px solid ${sugestoesSel[p.id]?"var(--purple)":"var(--gray-200)"}`,transition:"all .15s"}}>
                    <input type="checkbox" checked={!!sugestoesSel[p.id]}
                      onChange={e=>setSugestoesSel(s=>({...s,[p.id]:e.target.checked}))}
                      style={{marginTop:2,accentColor:"var(--purple)",flexShrink:0}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{p.titulo||p.nome}</div>
                      {p.descricao&&<div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{p.descricao.slice(0,80)}</div>}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setModalSugestao(null)}
                style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                Agora não
              </button>
              <button onClick={()=>{const algum=Object.values(sugestoesSel).some(v=>v);if(algum)ativarSugestoes();else setModalSugestao(null);}}
                style={{flex:2,padding:"10px",borderRadius:8,border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
                {Object.values(sugestoesSel).some(v=>v)?`✓ Ativar ${Object.values(sugestoesSel).filter(v=>v).length} selecionado(s)`:"Fechar sem ativar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

// ABA FERRAMENTAS
function AbaFerramentas({ paciente }) {
  const [ferramentas, setFerramentas] = useState(paciente.ferramentasAtivas||[]);
  async function toggle(id) {
    const novas = ferramentas.includes(id)?ferramentas.filter(f=>f!==id):[...ferramentas,id];
    setFerramentas(novas);
    await db.collection("clinica_pacientes").doc(paciente.id).update({ferramentasAtivas:novas});
  }
  return (
    <div className="card">
      <div style={{fontWeight:600,marginBottom:4}}>Ferramentas Terapeuticas</div>
      <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Selecione as ferramentas disponiveis para este paciente no portal.</p>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {FERRAMENTAS.map(f=>(
          <div key={f.id} style={{display:"flex",alignItems:"center",gap:14,padding:16,borderRadius:10,border:"1.5px solid",borderColor:ferramentas.includes(f.id)?"var(--purple)":"var(--gray-200)",background:ferramentas.includes(f.id)?"var(--purple-bg)":"white",cursor:"pointer",transition:"all .2s"}} onClick={()=>toggle(f.id)}>
            <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{f.nome}</div><div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{f.desc}</div></div>
            <button style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:ferramentas.includes(f.id)?"var(--purple)":"var(--gray-200)",position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",top:2,left:ferramentas.includes(f.id)?"22px":"2px",width:20,height:20,borderRadius:"50%",background:"white",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ABA METAS
// URLs do portal do paciente para visualização de cada ferramenta
const PORTAL_URLS = {
  humor:      "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#humor",
  diario:     "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#diario",
  metas:      "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#metas",
  reflexoes:  "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#reflexoes",
  tcc:        "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#tcc",
  respiracao: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#respiracao",
  relaxamento:"https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#relaxamento",
};

function AbaModulo1({ paciente }) {
  const [dados, setDados] = useState({humor:[],diario:[],metas:[],reflexoes:[],tcc:[],respiracao:[],relaxamento:[]});
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null); // id da ferramenta em preview

  useEffect(()=>{
    const id = paciente.id;
    Promise.all([
      db.collection("clinica_humor").where("pacienteId","==",id).get(),
      db.collection("clinica_diario").where("pacienteId","==",id).get(),
      db.collection("clinica_metas").where("pacienteId","==",id).where("status","==","ativa").get(),
      db.collection("clinica_reflexoes").where("pacienteId","==",id).get(),
      db.collection("clinica_tcc").where("pacienteId","==",id).get(),
      db.collection("clinica_atividades").where("pacienteId","==",id).where("tipo","==","respiracao").get(),
      db.collection("clinica_atividades").where("pacienteId","==",id).where("tipo","==","relaxamento").get(),
    ]).then(([h,d,m,r,t,resp,relax])=>{
      setDados({
        humor:    h.docs.map(x=>({id:x.id,...x.data()})),
        diario:   d.docs.map(x=>({id:x.id,...x.data()})),
        metas:    m.docs.map(x=>({id:x.id,...x.data()})),
        reflexoes:r.docs.map(x=>({id:x.id,...x.data()})),
        tcc:      t.docs.map(x=>({id:x.id,...x.data()})),
        respiracao: resp.docs.map(x=>({id:x.id,...x.data()})),
        relaxamento:relax.docs.map(x=>({id:x.id,...x.data()})),
      });
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[paciente.id]);

  const ITENS = [
    { id:"humor",  icone:"❤️", nome:"Check-in Diário",     qtd:dados.humor.length,  ultima:dados.humor.sort((a,b)=>(b.data||"").localeCompare(a.data||""))[0]?.data },
    { id:"metas",  icone:"🎯", nome:"Metas Terapêuticas",  qtd:dados.metas.length,  ultima:null },
    { id:"diario", icone:"📔", nome:"Diário Terapêutico",  qtd:dados.diario.length, ultima:dados.diario.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))[0]?.data },
    // Pensamentos e Reflexões → Módulo III / Ansiedade e Controle dos Pensamentos
  ];

  // Descrições resumidas para o modal de preview
  const DESC = {
    humor:      "Registro diário da escala de humor do paciente.",
    diario:     "Espaço de escrita reflexiva livre, como um diário terapêutico.",
    metas:      "Metas terapêuticas com acompanhamento de progresso.",
    reflexoes:  "Exercícios de reestruturação cognitiva e insight.",
    tcc:        "Registro ABC de pensamentos automáticos — Modelo TCC.",
    respiracao: "Exercício de respiração diafragmática 4-7-8 para regulação emocional.",
    relaxamento:"Técnica de relaxamento muscular progressivo de Jacobson.",
  };

  return (
    <div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Módulo 1 — Dashboard</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>
        Ferramentas básicas do dia a dia de {paciente.nome.split(" ")[0]}
      </div>

      {loading
        ? <div style={{textAlign:"center",padding:32,color:"var(--text-muted)"}}>Carregando...</div>
        : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
            {ITENS.map(item=>(
              <div key={item.id} style={{background:"white",border:"1px solid var(--gray-100)",
                borderRadius:14,padding:18,boxShadow:"0 2px 8px rgba(123,0,196,0.05)",
                display:"flex",flexDirection:"column",gap:10}}>

                {/* Header */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:40,height:40,borderRadius:10,background:"var(--purple-soft)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {item.icone}
                  </div>
                  <div style={{fontWeight:600,fontSize:13,lineHeight:1.3}}>{item.nome}</div>
                </div>

                {/* Contagem */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:24,fontWeight:700,color:"var(--purple)"}}>{item.qtd}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"right"}}>
                    {item.qtd===0 ? "Sem registros" : `registro${item.qtd!==1?"s":""}`}
                    {item.ultima&&<div style={{marginTop:2}}>Último: {new Date(item.ultima+"T00:00:00").toLocaleDateString("pt-BR")}</div>}
                  </div>
                </div>

                {/* Botão visualizar */}
                <button onClick={()=>setPreview(item.id)}
                  style={{width:"100%",padding:"7px",borderRadius:8,border:"1px solid var(--purple)",
                    background:"white",color:"var(--purple)",cursor:"pointer",
                    fontSize:12,fontWeight:600,fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <Icon name="eye" size={13}/> Visualizar
                </button>
              </div>
            ))}
          </div>
        )
      }

      {/* Modal de preview — iframe do portal */}
      {preview&&(()=>{
        const item = ITENS.find(i=>i.id===preview);
        const TAB_MAP = {
          humor:"humor", diario:"diario", metas:"metas",
          reflexoes:"reflexoes", tcc:"tcc",
          respiracao:"ferramentas", relaxamento:"ferramentas",
        };
        const tab = TAB_MAP[preview]||"painel";
        const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/?preview=${tab}&email=${encodeURIComponent(paciente.email||"")}&senha=${encodeURIComponent(paciente.senha||"1234")}`;
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,
            display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
            onClick={()=>setPreview(null)}>
            <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:900,
              height:"85vh",display:"flex",flexDirection:"column",
              boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}
              onClick={e=>e.stopPropagation()}>

              {/* Header */}
              <div style={{background:"linear-gradient(135deg,#7B00C4,#5a0090)",
                borderRadius:"16px 16px 0 0",padding:"14px 20px",color:"white",
                display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22}}>{item?.icone}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{item?.nome}</div>
                    <div style={{fontSize:11,opacity:0.8}}>👁 Prévia — visão de {paciente.nome.split(" ")[0]}</div>
                  </div>
                </div>
                <button onClick={()=>setPreview(null)}
                  style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,
                    padding:"6px 14px",color:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                  ✕ Fechar
                </button>
              </div>

              {/* iFrame do portal */}
              <iframe
                src={`https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/`}
                style={{flex:1,border:"none",borderRadius:"0 0 16px 16px"}}
                title="Prévia do portal do paciente"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function AbaMetas({ paciente }) {
  const [metas, setMetas] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null); // id da meta em edição
  const [form, setForm] = useState({titulo:"",categoria:"Emocional",progresso:0,status:"ativa"});

  useEffect(()=>{
    // Usa clinica_metas (coleção raiz) com pacienteId — mesma que o portal do paciente lê
    const unsub = db.collection("clinica_metas")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        setMetas(snap.docs.map(d=>({id:d.id,...d.data()})));
      },()=>{});
    return unsub;
  },[paciente.id]);

  function abrirNova(){
    setEditando(null);
    setForm({titulo:"",categoria:"Emocional",progresso:0,status:"ativa"});
    setModal(true);
  }
  function abrirEdicao(m){
    setEditando(m.id);
    setForm({titulo:m.titulo||"",categoria:m.categoria||"Emocional",progresso:m.progresso||0,status:m.status||"ativa"});
    setModal(true);
  }
  async function salvar() {
    if(!form.titulo){alert("Titulo obrigatorio.");return;}
    if(editando){
      await db.collection("clinica_metas").doc(editando).update({
        titulo:form.titulo, categoria:form.categoria,
        progresso:Number(form.progresso)||0, status:form.status,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await db.collection("clinica_metas").add({
        titulo:form.titulo, categoria:form.categoria,
        progresso:Number(form.progresso)||0, status:form.status,
        pacienteId: paciente.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    setModal(false); setEditando(null);
    setForm({titulo:"",categoria:"Emocional",progresso:0,status:"ativa"});
  }
  async function excluir(id){
    if(!confirm("Excluir meta?"))return;
    await db.collection("clinica_metas").doc(id).delete();
  }
  async function atualizarProgresso(id,val){
    await db.collection("clinica_metas").doc(id).update({progresso:val});
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontWeight:600}}>Metas Terapeuticas</div>
        <button className="btn btn-purple" onClick={abrirNova}><Icon name="plus" size={16}/> Nova Meta</button>
      </div>
      {metas.length===0?(
        <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}><Icon name="target" size={40}/><div style={{marginTop:12}}>Nenhuma meta cadastrada.</div></div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {metas.map(m=>(
            <div key={m.id} className="card" style={m.status==="concluida"?{border:"1.5px solid #059669",background:"#f0fdf4"}:m.status==="arquivada"?{opacity:0.55}:{}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div>
                  <div style={{fontWeight:500}}>{m.titulo}</div>
                  <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                    <span className="badge badge-purple">{m.categoria}</span>
                    {m.status==="concluida"&&<span style={{fontSize:11,fontWeight:700,color:"#059669",background:"#d1fae5",borderRadius:20,padding:"2px 8px"}}>Concluída</span>}
                    {m.status==="arquivada"&&<span style={{fontSize:11,fontWeight:700,color:"#6b7280",background:"#f3f4f6",borderRadius:20,padding:"2px 8px"}}>Arquivada</span>}
                    {m.atualizadoPor==="paciente"&&<span style={{fontSize:11,color:"var(--purple)"}}>✋ atualizada pelo paciente</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <button className="btn btn-ghost" style={{padding:"4px 8px"}} title="Editar meta" onClick={()=>abrirEdicao(m)}><Icon name="pencil" size={14}/></button>
                  <button className="btn btn-ghost" style={{padding:"4px 8px"}} title="Excluir meta" onClick={()=>excluir(m.id)}><Icon name="trash-2" size={14}/></button>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1,background:"var(--gray-100)",borderRadius:20,height:8,overflow:"hidden"}}>
                  <div style={{width:(m.progresso||0)+"%",height:"100%",background:"var(--purple)",borderRadius:20}}/>
                </div>
                <span style={{fontSize:13,fontWeight:600,color:"var(--purple)",minWidth:36}}>{m.progresso||0}%</span>
              </div>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button className="btn btn-ghost" style={{fontSize:12,padding:"4px 10px"}} onClick={()=>atualizarProgresso(m.id,Math.max(0,(m.progresso||0)-10))}>-10%</button>
                <button className="btn btn-ghost" style={{fontSize:12,padding:"4px 10px"}} onClick={()=>atualizarProgresso(m.id,Math.min(100,(m.progresso||0)+10))}>+10%</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:20}}>{editando?"Editar Meta":"Nova Meta"}</div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Titulo da Meta</label>
              <input className="form-input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Ex: Praticar mindfulness diariamente"/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Categoria</label>
              <select className="form-input" value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>
                {["Emocional","Saude","Pessoal","Profissional","Relacionamento","Outro"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Progresso: <strong style={{color:"var(--purple)"}}>{form.progresso}%</strong></label>
              <input type="range" min={0} max={100} step={5} value={form.progresso}
                onChange={e=>setForm({...form,progresso:+e.target.value})}
                style={{width:"100%",accentColor:"var(--purple)"}}/>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                <option value="ativa">Ativa (visível para o paciente)</option>
                <option value="concluida">Concluída (visível, marcada como alcançada)</option>
                <option value="arquivada">Arquivada (oculta do paciente)</option>
              </select>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar}>{editando?"Salvar alterações":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ABA EVOLUCAO
function AbaEvolucao({ paciente }) {
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
  useEffect(()=>{
    const u1 = db.collection("clinica_humor")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>{ const da=a.data||""; const db2=b.data||""; return da<db2?1:da>db2?-1:0; });
        setHumor(docs.slice(0,30));
      },()=>{});
    const u2 = db.collection("clinica_atividades")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setAtividades(docs);
      },()=>{});
    // Busca metas ativas em clinica_metas (coleção raiz — mesma do portal do paciente)
    const u3 = db.collection("clinica_metas")
      .where("pacienteId","==",paciente.id)
      .where("status","==","ativa")
      .onSnapshot(snap=>setMetas(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    // Sessões registradas do paciente
    const u4 = db.collection("clinica_sessoes")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>setSessoes(snap.size),()=>{});
    // Registros TCC (pensamentos guiados salvos no portal)
    const u5 = db.collection("clinica_tcc")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setTcc(docs);
      },()=>{});
    // Entradas no diário terapêutico
    const u6 = db.collection("clinica_diario")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setDiario(docs);
      },()=>{});
    // Log de uso de recursos (abriu / salvou)
    const u7 = db.collection("clinica_recurso_acessos")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setAcessos(docs.slice(0,40));
      },()=>{});
    // Reflexões salvas (fábulas e psicoeducações)
    const u8 = db.collection("clinica_reflexoes")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setReflexoes(docs);
      },()=>{});
    return ()=>{ u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); };
  },[paciente.id]);
  const media = humor.length?(humor.reduce((a,h)=>a+(h.valor||0),0)/humor.length).toFixed(1):"—";
  return (
    <div>
      <div className="metrics-grid" style={{marginBottom:20}}>
        {[{label:"Sessoes registradas",value:sessoes,icon:"calendar"},{label:"Registros TCC",value:tcc.length,icon:"brain"},{label:"Entradas no diario",value:diario.length,icon:"book-open"},{label:"Metas ativas",value:metas.length,icon:"target"}].map(m=>(
          <div key={m.label} className="metric-card"><div className="metric-icon"><Icon name={m.icon} size={20}/></div><div className="metric-label">{m.label}</div><div className="metric-value">{m.value}</div></div>
        ))}
      </div>
      <div className="card">
        <div style={{fontWeight:600,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
          <span>Evolucao do Humor</span>
          {humor.length>0&&<span style={{fontSize:13,color:"var(--text-muted)"}}>Media: <strong style={{color:"var(--purple)"}}>{media}/10</strong></span>}
        </div>
        {humor.length===0?(
          <div style={{textAlign:"center",padding:40,color:"var(--text-muted)"}}><Icon name="heart" size={40}/><div style={{marginTop:12}}>Sem dados de humor para este paciente.</div></div>
        ):(
          humor.slice(0,10).map(h=>(
            <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid var(--gray-100)"}}>
              <div style={{fontWeight:600,color:"var(--purple)",minWidth:40}}>{h.valor}/10</div>
              <div style={{flex:1,background:"var(--gray-100)",borderRadius:20,height:6}}><div style={{width:((h.valor/10)*100)+"%",height:"100%",background:"var(--purple)",borderRadius:20}}/></div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>{h.data}</div>
            </div>
          ))
        )}
      </div>

      {/* Atividades de relaxamento */}
      {atividades.length>0&&(
        <div className="card" style={{marginTop:16}}>
          <div style={{fontWeight:600,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>🧘 Atividades de Relaxamento</span>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{atividades.length} registro(s)</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {atividades.slice(0,10).map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,border:"1px solid var(--gray-100)",background:"#fafafa"}}>
                <span style={{fontSize:24}}>{a.ferramenta==="respiracao"?"🫁":"💆"}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13,textTransform:"capitalize"}}>{a.ferramenta==="respiracao"?"Respiração 4-7-8":"Relaxamento Muscular"}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)"}}>{a.data} às {a.hora}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontWeight:700,fontSize:18,color:a.nota>=7?"#16a34a":a.nota>=4?"#d97706":"#dc2626"}}>{a.nota}/10</div>
                  <div style={{fontSize:10,color:"var(--text-muted)"}}>relaxamento</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USO DE RECURSOS (log de acessos) ── */}
      <div className="card" style={{marginTop:16}}>
        <div style={{fontWeight:600,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>📊 Uso de Recursos Terapêuticos</span>
          <span style={{fontSize:13,color:"var(--text-muted)"}}>{acessos.length} registro(s)</span>
        </div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:14}}>Cada vez que o paciente abre um recurso ou salva um exercício, aparece aqui.</div>
        {acessos.length===0?(
          <div style={{textAlign:"center",padding:30,color:"var(--text-muted)"}}>
            <Icon name="mouse-pointer-click" size={36}/>
            <div style={{marginTop:10,fontSize:13}}>Nenhum acesso registrado ainda.</div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:420,overflowY:"auto"}}>
            {acessos.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",borderRadius:10,border:"1px solid var(--gray-100)",background:a.tipo==="salvou"?"#f0fdf4":"#fafafa"}}>
                <span style={{fontSize:11,fontWeight:700,borderRadius:20,padding:"3px 9px",flexShrink:0,marginTop:1,
                  background:a.tipo==="salvou"?"#d1fae5":a.tipo==="concluiu"?"#dbeafe":"#ede9fe",
                  color:a.tipo==="salvou"?"#059669":a.tipo==="concluiu"?"#1d4ed8":"var(--purple)"}}>
                  {a.tipo==="salvou"?"💾 Salvou":a.tipo==="concluiu"?"✅ Concluiu":"👁 Abriu"}
                </span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13}}>{a.recursoTitulo||"Recurso"}</div>
                  {a.detalhe&&<div style={{fontSize:12,color:"#4b5563",marginTop:2,lineHeight:1.5,wordBreak:"break-word"}}>{a.detalhe}</div>}
                </div>
                <div style={{fontSize:11,color:"var(--text-muted)",flexShrink:0,textAlign:"right"}}>{a.data}<br/>{a.hora}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── REGISTROS TCC (pensamentos guiados) ── */}
      {tcc.length>0&&(
        <div className="card" style={{marginTop:16}}>
          <div style={{fontWeight:600,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span>🧠 Registros TCC — Pensamentos Guiados</span>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{tcc.length} registro(s)</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {tcc.slice(0,15).map(t=>(
              <div key={t.id} style={{border:"1px solid var(--gray-100)",borderRadius:10,overflow:"hidden"}}>
                <div onClick={()=>setTccAberto(tccAberto===t.id?null:t.id)}
                  style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",cursor:"pointer",background:tccAberto===t.id?"var(--purple-soft,#f3e8ff)":"#fafafa"}}>
                  <div style={{fontWeight:600,fontSize:13}}>Registro de {t.data||"—"}</div>
                  <span style={{fontSize:12,color:"var(--purple)",fontWeight:600}}>{tccAberto===t.id?"▲ Fechar":"▼ Ver respostas"}</span>
                </div>
                {tccAberto===t.id&&(
                  <div style={{padding:"12px 14px",background:"white"}}>
                    {(t.registros||[]).map((r,i)=>(
                      <div key={i} style={{marginBottom:i<(t.registros||[]).length-1?12:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:"var(--purple)",marginBottom:3}}>{i+1}. {r.pergunta}</div>
                        <div style={{fontSize:13,color:r.resposta?"#1f2937":"#9ca3af",lineHeight:1.6,paddingLeft:14,borderLeft:"3px solid var(--purple-soft,#f3e8ff)"}}>{r.resposta||"— sem resposta —"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REFLEXÕES SALVAS (fábulas e psicoeducações) ── */}
      {reflexoes.length>0&&(
        <div className="card" style={{marginTop:16}}>
          <div style={{fontWeight:600,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span>💭 Reflexões Salvas — Fábulas e Psicoeducações</span>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{reflexoes.length} registro(s)</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {reflexoes.slice(0,15).map(r=>{
              const titulo = r.origemTitulo||r.psicoeducacaoTitulo||"Reflexão";
              const tipoBadge = r.origem==="fabula"?"📖 Fábula":"🎓 Psicoeducação";
              return (
                <div key={r.id} style={{border:"1px solid var(--gray-100)",borderRadius:10,overflow:"hidden"}}>
                  <div onClick={()=>setReflexaoAberta(reflexaoAberta===r.id?null:r.id)}
                    style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",cursor:"pointer",gap:10,background:reflexaoAberta===r.id?"var(--purple-soft,#f3e8ff)":"#fafafa"}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{titulo}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{tipoBadge} · {r.data||"—"}</div>
                    </div>
                    <span style={{fontSize:12,color:"var(--purple)",fontWeight:600,flexShrink:0}}>{reflexaoAberta===r.id?"▲ Fechar":"▼ Ver respostas"}</span>
                  </div>
                  {reflexaoAberta===r.id&&(
                    <div style={{padding:"12px 14px",background:"white"}}>
                      {(r.registros||[]).map((reg,i)=>(
                        <div key={i} style={{marginBottom:i<(r.registros||[]).length-1?12:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:"var(--purple)",marginBottom:3}}>{i+1}. {reg.pergunta}</div>
                          <div style={{fontSize:13,color:reg.resposta?"#1f2937":"#9ca3af",lineHeight:1.6,paddingLeft:14,borderLeft:"3px solid var(--purple-soft,#f3e8ff)"}}>{reg.resposta||"— sem resposta —"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DIÁRIO TERAPÊUTICO ── */}
      {diario.length>0&&(
        <div className="card" style={{marginTop:16}}>
          <div style={{fontWeight:600,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span>📓 Diário Terapêutico</span>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{diario.length} entrada(s)</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:360,overflowY:"auto"}}>
            {diario.slice(0,15).map(d=>(
              <div key={d.id} style={{padding:"10px 14px",borderRadius:10,border:"1px solid var(--gray-100)",background:"#fafafa"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:700,color:"var(--purple)",background:"var(--purple-soft,#f3e8ff)",borderRadius:20,padding:"2px 8px",textTransform:"capitalize"}}>{d.tag||"geral"}</span>
                  <span style={{fontSize:11,color:"var(--text-muted)"}}>{d.data} {d.hora?("às "+d.hora):""}</span>
                </div>
                <div style={{fontSize:13,lineHeight:1.6,color:"#1f2937",whiteSpace:"pre-wrap"}}>{d.texto}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ABA CASAL
// ── Categorias do Inventário (espelhadas do clinica/app.js) ─────────────────
const INVENTARIO_CATS_C = [
  {label:"Comunicação Eficaz",      cor:"#6366f1", questoes:[2,5,11,12,13,19,20]},
  {label:"Resolução de Conflitos",   cor:"#f59e0b", questoes:[4,8,14,18,23,28,31]},
  {label:"Intimidade Emocional",     cor:"#ec4899", questoes:[7,10,17,22,24,29,35]},
  {label:"Satisfação Sexual",        cor:"#dc2626", questoes:[3,6,9,15,21,25,27]},
  {label:"Cooperação e Colaboração", cor:"#16a34a", questoes:[1,16,26,37,38,39,41]},
  {label:"Senso de Humor e Lazer",   cor:"#0891b2", questoes:[30,32,33,34,36,40,42]},
];
const RODA_DIMENSOES_C = [
  "Comunicação","Família","Sexualidade","Estresse e Pressão",
  "Divisão","Ciúmes","Espiritualidade","Diferenças e Conflitos",
  "Estabilidade Financeira","Rel. de Poder","Mudanças","Expectativas e Equilíbrio"
];

function calcularInventario(resp) {
  return INVENTARIO_CATS_C.map(cat=>{
    const soma = cat.questoes.reduce((a,q)=>a+(resp[q]||0),0);
    return {...cat, soma, pct:Math.max(0,Math.round(((soma-7)/28)*100))};
  });
}

// ── Bloco visual: Inventário de Bem-Estar (comparativo) ─────────────────────
function BlocoInventario({ docPaciente, docParceiro, nomePac, nomePar }) {
  const [verBrutos, setVerBrutos] = useState(false);
  if(!docPaciente&&!docParceiro) return <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum preencheu ainda.</div>;

  const resPac = docPaciente?.respostas||{};
  const resPar = docParceiro?.respostas||{};
  const catsPac = docPaciente ? calcularInventario(resPac) : null;
  const catsPar = docParceiro ? calcularInventario(resPar) : null;

  // Pontos fortes e fracos (baseado em quem respondeu)
  const base = catsPac||catsPar;
  const fortes  = [...base].sort((a,b)=>b.soma-a.soma).slice(0,2);
  const fracos   = [...base].sort((a,b)=>a.soma-b.soma).slice(0,2);

  const ESCALA = ["","Nunca/Raramente","Às vezes","Frequentemente","Sempre/Quase sempre"];

  return (
    <div>
      {/* Gráfico comparativo */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",gap:16,fontSize:12,marginBottom:10,flexWrap:"wrap"}}>
          {docPaciente && <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#7B00C4",marginRight:4}}/>
            {nomePac} ({docPaciente.createdAt?.toDate?.()?.toLocaleDateString("pt-BR")||"—"})</span>}
          {docParceiro && <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#ec4899",marginRight:4}}/>
            {nomePar} ({docParceiro.createdAt?.toDate?.()?.toLocaleDateString("pt-BR")||"—"})</span>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {INVENTARIO_CATS_C.map((cat,i)=>{
            const vPac = catsPac?.[i];
            const vPar = catsPar?.[i];
            return (
              <div key={cat.label}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,marginBottom:6}}>
                  <span style={{color:cat.cor}}>{cat.label}</span>
                </div>
                {/* Barra paciente */}
                {vPac&&(
                  <div style={{marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:"#7B00C4",minWidth:14,fontWeight:600}}>🟣</span>
                      <div style={{flex:1,background:"#f3f4f6",borderRadius:20,height:10,overflow:"hidden"}}>
                        <div style={{width:vPac.pct+"%",height:"100%",background:"#7B00C4",borderRadius:20,transition:"width .5s"}}/>
                      </div>
                      <span style={{fontSize:12,color:"#7B00C4",fontWeight:700,minWidth:36,textAlign:"right"}}>{vPac.soma}/35</span>
                    </div>
                  </div>
                )}
                {/* Barra parceiro */}
                {vPar&&(
                  <div style={{marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:"#ec4899",minWidth:14,fontWeight:600}}>🩷</span>
                      <div style={{flex:1,background:"#f3f4f6",borderRadius:20,height:10,overflow:"hidden"}}>
                        <div style={{width:vPar.pct+"%",height:"100%",background:"#ec4899",borderRadius:20,transition:"width .5s"}}/>
                      </div>
                      <span style={{fontSize:12,color:"#ec4899",fontWeight:700,minWidth:36,textAlign:"right"}}>{vPar.soma}/35</span>
                    </div>
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text-muted)",marginTop:2,paddingLeft:22}}>
                  <span>Baixo (7)</span><span>Alto (35)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pontos fortes e atenção */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{background:"#f0fdf4",borderRadius:10,padding:12,border:"1px solid #86efac"}}>
          <div style={{fontWeight:700,fontSize:12,color:"#16a34a",marginBottom:8}}>💪 Pontos Fortes</div>
          {fortes.map(c=>(
            <div key={c.label} style={{fontSize:12,color:"#15803d",marginBottom:4}}>
              ● {c.label} <span style={{fontWeight:700}}>{c.soma}/35</span>
            </div>
          ))}
        </div>
        <div style={{background:"#fef2f2",borderRadius:10,padding:12,border:"1px solid #fca5a5"}}>
          <div style={{fontWeight:700,fontSize:12,color:"#dc2626",marginBottom:8}}>⚠️ Pontos de Atenção</div>
          {fracos.map(c=>(
            <div key={c.label} style={{fontSize:12,color:"#b91c1c",marginBottom:4}}>
              ● {c.label} <span style={{fontWeight:700}}>{c.soma}/35</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dados brutos colapsáveis */}
      <button onClick={()=>setVerBrutos(v=>!v)}
        style={{background:"none",border:"1px solid var(--gray-200)",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",color:"var(--text-muted)",width:"100%"}}>
        {verBrutos?"▲ Ocultar respostas brutas":"▼ Ver respostas brutas"}
      </button>
      {verBrutos&&(
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
          {Array.from({length:42},(_,i)=>i+1).map(n=>(
            <div key={n} style={{display:"flex",gap:8,fontSize:12,padding:"4px 8px",background:n%2===0?"#fafafa":"white",borderRadius:6}}>
              <span style={{color:"var(--purple)",fontWeight:600,minWidth:22}}>{n}.</span>
              {docPaciente&&<span style={{color:"#7B00C4",flex:1}}>{nomePac.split(" ")[0]}: {ESCALA[resPac[n]]||"—"}</span>}
              {docParceiro&&<span style={{color:"#ec4899",flex:1}}>{nomePar.split(" ")[0]}: {ESCALA[resPar[n]]||"—"}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bloco visual: Roda da Vida do Relacionamento ─────────────────────────────
function BlocoRodaVida({ docPaciente, docParceiro, nomePac, nomePar }) {
  const [verBrutos, setVerBrutos] = useState(false);
  if(!docPaciente&&!docParceiro) return <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum preencheu ainda.</div>;
  const vPac = docPaciente?.respostas||{};
  const vPar = docParceiro?.respostas||{};
  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        {RODA_DIMENSOES_C.map((dim,i)=>{
          const kPac = vPac[dim]; const kPar = vPar[dim];
          return (
            <div key={dim}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:3}}>
                <span>{dim}</span>
                <span style={{display:"flex",gap:10}}>
                  {docPaciente&&<span style={{color:"#7B00C4"}}>{kPac||0}/10</span>}
                  {docParceiro&&<span style={{color:"#ec4899"}}>{kPar||0}/10</span>}
                </span>
              </div>
              <div style={{position:"relative",height:8,borderRadius:20,background:"#f3f4f6",overflow:"hidden"}}>
                {docPaciente&&<div style={{position:"absolute",left:0,top:0,height:"100%",width:((kPac||0)*10)+"%",background:"#7B00C4",borderRadius:20,opacity:0.85}}/>}
                {docParceiro&&<div style={{position:"absolute",left:0,top:0,height:"100%",width:((kPar||0)*10)+"%",background:"#ec4899",borderRadius:20,opacity:0.5}}/>}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={()=>setVerBrutos(v=>!v)}
        style={{background:"none",border:"1px solid var(--gray-200)",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",color:"var(--text-muted)",width:"100%"}}>
        {verBrutos?"▲ Ocultar detalhes":"▼ Ver detalhes completos"}
      </button>
    </div>
  );
}

// ── Bloco visual genérico (Metas, Quem Sou, O Que Quero) ────────────────────
function BlocoTexto({ docPaciente, docParceiro, nomePac, nomePar }) {
  if(!docPaciente&&!docParceiro) return <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum preencheu ainda.</div>;
  const ESCALA = ["","Nunca/Raramente","Às vezes","Frequentemente","Sempre/Quase sempre"];
  function renderResp(resp) {
    if(!resp||typeof resp!=="object") return null;
    return Object.entries(resp).map(([k,v])=>(
      <div key={k} style={{padding:"6px 10px",background:"white",borderRadius:7,border:"1px solid #f3f4f6",fontSize:13,marginBottom:4}}>
        <span style={{fontWeight:600,color:"var(--purple)",marginRight:6}}>{k}:</span>
        <span style={{color:"var(--gray-700)"}}>{typeof v==="number"?(ESCALA[v]||v):String(v)}</span>
      </div>
    ));
  }
  return (
    <div style={{display:"grid",gridTemplateColumns:docPaciente&&docParceiro?"1fr 1fr":"1fr",gap:16}}>
      {docPaciente&&(
        <div>
          <div style={{fontWeight:700,fontSize:12,color:"#7B00C4",marginBottom:8}}>
            🟣 {nomePac} ({docPaciente.createdAt?.toDate?.()?.toLocaleDateString("pt-BR")||"—"})
          </div>
          {renderResp(docPaciente.respostas)}
        </div>
      )}
      {docParceiro&&(
        <div>
          <div style={{fontWeight:700,fontSize:12,color:"#ec4899",marginBottom:8}}>
            🩷 {nomePar} ({docParceiro.createdAt?.toDate?.()?.toLocaleDateString("pt-BR")||"—"})
          </div>
          {renderResp(docParceiro.respostas)}
        </div>
      )}
    </div>
  );
}

// ── Respostas do diagnóstico — componente principal do admin ─────────────────
function RespostasCasal({ pacienteId, parceiroId, parceiro, nomePaciente }) {
  const [respostas, setRespostas] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expandido, setExpandido] = useState("inventario-bem-estar"); // abre o primeiro por padrão

  const ATIVIDADES = [
    {id:"inventario-bem-estar",     titulo:"Inventário de Bem-Estar de Casais", emoji:"📊"},
    {id:"roda-vida-relacionamento", titulo:"Roda da Vida do Relacionamento",    emoji:"🎯"},
    {id:"3-metas",                  titulo:"Nossas 3 Metas",                    emoji:"🏆"},
    {id:"quem-sou",                 titulo:"Quem Eu Sou no Relacionamento",     emoji:"🪞"},
    {id:"o-que-quero",              titulo:"O Que Eu Quero e Não Quero Mais",   emoji:"✍️"},
  ];

  const nomePac = nomePaciente?.split(" ")[0]||"Paciente";
  const nomePar = parceiro?.nome?.split(" ")[0]||"Parceiro(a)";

  useEffect(()=>{
    if(!pacienteId||!parceiroId){ setLoading(false); return; }
    let r1=[], r2=[], n=0;
    const done = ()=>{ n++; if(n<2) return;
      setRespostas([...r1,...r2].sort((a,b)=>(b.createdAt?.toDate?.()||new Date(0))-(a.createdAt?.toDate?.()||new Date(0))));
      setLoading(false);
    };
    const u1 = db.collection("clinica_casais_respostas")
      .where("pacienteId","==",pacienteId).where("casalId","==",parceiroId)
      .onSnapshot(s=>{ r1=s.docs.map(d=>({id:d.id,...d.data()})); done(); },()=>{ n++; setLoading(false); });
    const u2 = db.collection("clinica_casais_respostas")
      .where("pacienteId","==",parceiroId).where("casalId","==",pacienteId)
      .onSnapshot(s=>{ r2=s.docs.map(d=>({id:d.id,...d.data()})); done(); },()=>{ n++; setLoading(false); });
    return ()=>{ u1(); u2(); };
  },[pacienteId,parceiroId]);

  if(loading) return <div style={{fontSize:13,color:"var(--text-muted)",padding:"8px 0"}}>Carregando...</div>;
  if(respostas.length===0) return (
    <div style={{background:"#f9fafb",borderRadius:10,padding:20,fontSize:13,color:"var(--text-muted)",textAlign:"center"}}>
      Nenhuma resposta registrada ainda.
    </div>
  );

  // Para cada atividade, pega o doc mais recente de cada pessoa
  function getDoc(atividadeId, autorId) {
    return respostas.find(r=>r.atividadeId===atividadeId&&r.pacienteId===autorId)||null;
  }

  return (
    <div>
      <div style={{display:"flex",gap:8,fontSize:12,marginBottom:16,flexWrap:"wrap"}}>
        <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#7B00C4",marginRight:4}}/>
          {nomePac}</span>
        <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#ec4899",marginRight:4}}/>
          {nomePar}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ATIVIDADES.map(atv=>{
          const docPac = getDoc(atv.id, pacienteId);
          const docPar = getDoc(atv.id, parceiroId);
          const total  = (docPac?1:0)+(docPar?1:0);
          if(total===0) return null;
          const aberto = expandido===atv.id;
          return (
            <div key={atv.id} style={{border:"1px solid var(--gray-200)",borderRadius:12,overflow:"hidden"}}>
              <button onClick={()=>setExpandido(aberto?null:atv.id)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"14px 16px",
                  background:aberto?"#f5f3ff":"white",border:"none",cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:20}}>{atv.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{atv.titulo}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>
                    {docPac&&<span style={{color:"#7B00C4",marginRight:10}}>✓ {nomePac}</span>}
                    {docPar&&<span style={{color:"#ec4899"}}>✓ {nomePar}</span>}
                    {!docPac&&<span style={{color:"var(--gray-400)",marginRight:10}}>○ {nomePac}</span>}
                    {!docPar&&<span style={{color:"var(--gray-400)"}}>○ {nomePar}</span>}
                  </div>
                </div>
                <Icon name={aberto?"chevron-up":"chevron-down"} size={16}/>
              </button>
              {aberto&&(
                <div style={{padding:"16px",background:"#fafafa",borderTop:"1px solid var(--gray-100)"}}>
                  {atv.id==="inventario-bem-estar"&&
                    <BlocoInventario docPaciente={docPac} docParceiro={docPar} nomePac={nomePac} nomePar={nomePar}/>}
                  {atv.id==="roda-vida-relacionamento"&&
                    <BlocoRodaVida docPaciente={docPac} docParceiro={docPar} nomePac={nomePac} nomePar={nomePar}/>}
                  {(atv.id==="3-metas"||atv.id==="quem-sou"||atv.id==="o-que-quero")&&
                    <BlocoTexto docPaciente={docPac} docParceiro={docPar} nomePac={nomePac} nomePar={nomePar}/>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AbaCasal({ paciente, pacientes }) {
  const [casalId, setCasalId] = useState(paciente.casalId||"");
  const [salvando, setSalvando] = useState(false);
  const parceiro = pacientes.find(p=>p.id===paciente.casalId);
  const outros = pacientes.filter(p=>p.id!==paciente.id&&p.status==="ativo").sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"));

  async function vincular() {
    if(!casalId){alert("Selecione o parceiro(a).");return;}
    if(casalId===paciente.id){alert("Selecione um paciente diferente.");return;}
    setSalvando(true);
    try {
      const p2 = pacientes.find(p=>p.id===casalId);
      // 1. Remove vínculo antigo de clinica_casais se existir (evita duplicatas)
      const snapAntigo1 = await db.collection("clinica_casais").where("p1Id","==",paciente.id).get();
      const snapAntigo2 = await db.collection("clinica_casais").where("p2Id","==",paciente.id).get();
      const batch = db.batch();
      [...snapAntigo1.docs, ...snapAntigo2.docs].forEach(d=>batch.delete(d.ref));
      await batch.commit();
      // 2. Cria novo documento em clinica_casais
      await db.collection("clinica_casais").add({
        p1Id: paciente.id, p1Nome: paciente.nome||"",
        p2Id: casalId,     p2Nome: p2?.nome||"",
        nomeCasal: `${paciente.nome?.split(" ")[0]||""} e ${p2?.nome?.split(" ")[0]||""}`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // 3. Grava casalId + mod5 nos dois pacientes
      await db.collection("clinica_pacientes").doc(paciente.id).update({
        casalId,
        modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
      });
      await db.collection("clinica_pacientes").doc(casalId).update({
        casalId: paciente.id,
        modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
      });
      alert("✓ Casal vinculado! Ambos terão acesso à Terapia de Casal no portal.");
    } catch(e) { alert("Erro ao vincular: "+e.message); }
    setSalvando(false);
  }
  async function desvincular() {
    if(!confirm("Desvincular casal?"))return;
    setSalvando(true);
    try {
      const parcId = paciente.casalId;
      // 1. Limpa casalId nos dois pacientes
      await db.collection("clinica_pacientes").doc(paciente.id).update({casalId:""});
      if(parcId) await db.collection("clinica_pacientes").doc(parcId).update({casalId:""});
      // 2. Remove documento de clinica_casais
      const snap1 = await db.collection("clinica_casais").where("p1Id","==",paciente.id).get();
      const snap2 = await db.collection("clinica_casais").where("p2Id","==",paciente.id).get();
      const batch = db.batch();
      [...snap1.docs, ...snap2.docs].forEach(d=>batch.delete(d.ref));
      await batch.commit();
      setCasalId("");
    } catch(e) { alert("Erro ao desvincular: "+e.message); }
    setSalvando(false);
  }

  return (
    <div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><Icon name="heart" size={18}/><div style={{fontWeight:600}}>Vínculo de Casal</div></div>
        {paciente.casalId&&parceiro?(
          <div>
            <div style={{background:"var(--purple-bg)",borderRadius:10,padding:16,marginBottom:16}}>
              <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:4}}>Parceiro(a) vinculado(a):</div>
              <div style={{fontWeight:600,fontSize:16}}>{parceiro.nome}</div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>{parceiro.email}</div>
            </div>
            <button className="btn btn-danger" onClick={desvincular} disabled={salvando}><Icon name="x" size={15}/> Desvincular casal</button>
          </div>
        ):(
          <div>
            <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>Este paciente nao esta vinculado a um casal em terapia.</p>
            <div className="form-group" style={{marginBottom:16}}>
              <label className="form-label">Selecionar Parceiro(a)</label>
              <select className="form-input" value={casalId} onChange={e=>setCasalId(e.target.value)}>
                <option value="">Selecione um paciente...</option>
                {outros.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <button className="btn btn-purple" onClick={vincular} disabled={salvando}><Icon name="heart" size={15}/> Associar como Casal</button>
          </div>
        )}
      </div>

      {/* Respostas do diagnóstico — só aparece se o casal está vinculado */}
      {paciente.casalId && parceiro && (
        <div className="card">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <Icon name="clipboard-list" size={18}/>
            <div style={{fontWeight:600}}>Diagnóstico e Atividades do Casal</div>
          </div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>
            Respostas preenchidas por {paciente.nome.split(" ")[0]} e {parceiro.nome.split(" ")[0]} no portal
          </div>
          <RespostasCasal
            pacienteId={paciente.id}
            parceiroId={paciente.casalId}
            parceiro={parceiro}
            nomePaciente={paciente.nome}
          />
        </div>
      )}
    </div>
  );
}

// PERFIL COMPLETO
function AbaOcupacional({ paciente }) {
  const EMITIDO_POR = { nome: "Dra. Lucia Kratz", crp: "CRP 09/20590" };
  const ASSINATURA_URL = "../Assinatura Lúcia Kratz.png"; // imagem na raiz do repositório

  const formVazio = {
    tipoDocumento: "relatorio_nr1",
    // Relatório NR-1
    dataInicio: "", dataFim: "", emAndamento: false,
    sessoesRealizadas: "", sessoesTotal: "",
    statusPrograma: "em_andamento", parecerTecnico: "",
    // Declaração de Comparecimento
    dataComparecimento: "", horaInicio: "", horaFim: "", obsDeclaracao: "",
  };

  const [form, setForm] = useState(formVazio);
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [preview, setPreview] = useState(null); // doc para preview (com _rascunho quando ainda não salvo)
  // Dados ocupacionais editáveis aqui mesmo (salvam de volta no cadastro do paciente)
  const [ocup, setOcup] = useState({
    empresa: paciente.empresa || paciente.empresaContratante || "",
    setor: paciente.setor || "",
    cargo: paciente.cargo || "",
  });

  useEffect(() => {
    db.collection("clinica_documentos_nr1")
      .where("pacienteId", "==", paciente.id)
      .get()
      .then(snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a,b)=>((b.createdAt&&b.createdAt.seconds)||0)-((a.createdAt&&a.createdAt.seconds)||0));
        setHistorico(docs);
        setLoadingHist(false);
      })
      .catch(() => setLoadingHist(false));
  }, [paciente.id]);

  const STATUS_LABELS = {
    em_andamento: "Em andamento (Acompanhamento contínuo)",
    concluido: "Concluído (Alta do programa ocupacional)",
    encaminhado: "Encaminhado para Especialista Externo",
    descontinuado: "Descontinuado (Faltas / Não adesão)",
  };

  const TIPO_LABELS = {
    relatorio_nr1: "Relatório de Atendimento Psicossocial (NR-1)",
    declaracao: "Declaração de Comparecimento",
  };
  const TIPO_DESC = {
    relatorio_nr1: "📊 Documento completo para a empresa: vigência do acompanhamento, sessões, status no programa e parecer técnico.",
    declaracao: "📄 Documento simples que atesta o comparecimento do colaborador em uma data e horário específicos.",
  };

  const eDeclaracao = form.tipoDocumento === "declaracao";
  const fmtData = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  function montarDoc() {
    return {
      pacienteId: paciente.id,
      pacienteNome: paciente.nome || "",
      empresaContratante: ocup.empresa || "",
      setor: ocup.setor || "",
      cargo: ocup.cargo || "",
      tipoDocumento: form.tipoDocumento,
      periodo: { dataInicio: form.dataInicio, dataFim: form.emAndamento ? "" : form.dataFim, emAndamento: form.emAndamento },
      sessoes: { realizadas: Number(form.sessoesRealizadas) || 0, total: Number(form.sessoesTotal) || 0 },
      statusPrograma: form.statusPrograma,
      parecerTecnico: form.parecerTecnico,
      dataComparecimento: form.dataComparecimento,
      horaInicio: form.horaInicio,
      horaFim: form.horaFim,
      obsDeclaracao: form.obsDeclaracao,
      emitidoPor: EMITIDO_POR,
    };
  }

  // 1) VISUALIZAR — monta o documento sem salvar nada
  function visualizar() {
    if (eDeclaracao && !form.dataComparecimento) { alert("Informe a data do comparecimento."); return; }
    if (!eDeclaracao && !form.parecerTecnico) { alert("Preencha o Parecer Técnico antes de visualizar."); return; }
    setPreview({ ...montarDoc(), _rascunho: true, createdAt: { seconds: Date.now()/1000 } });
  }

  // 2) SALVAR — só depois de visualizar e aprovar
  async function salvarDefinitivo() {
    setSalvando(true);
    const doc = { ...montarDoc(), createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
      const ref = await db.collection("clinica_documentos_nr1").add(doc);
      // Atualiza os dados ocupacionais no cadastro do paciente
      await db.collection("clinica_pacientes").doc(paciente.id).update({
        empresa: ocup.empresa || "", setor: ocup.setor || "", cargo: ocup.cargo || ""
      }).catch(()=>{});
      const novoDoc = { id: ref.id, ...doc, createdAt: { seconds: Date.now()/1000 } };
      setHistorico(prev => [novoDoc, ...prev]);
      setPreview(novoDoc);
      setForm(formVazio);
    } catch (e) { alert("Erro ao salvar: " + e.message); }
    setSalvando(false);
  }

  function abrirPreview(doc) { setPreview(doc); }

  function imprimirPreview() {
    const conteudo = document.getElementById("nr1-preview-print");
    if (!conteudo) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>${TIPO_LABELS[preview?.tipoDocumento]||"Documento"} — ${preview?.pacienteNome||""}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:40px;color:#1f2937;font-size:13px;line-height:1.6}
        img{max-height:70px}
        @media print{body{margin:20px}.no-print{display:none}}
      </style></head><body>
      ${conteudo.innerHTML}
      </body></html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
  }

  // ─── BLOCO DE ASSINATURA + CARIMBO ────────────────────────
  function BlocoAssinatura() {
    return (
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 24, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{ textAlign: "center" }}>
          <img src={ASSINATURA_URL} alt="" style={{ height: 64, objectFit: "contain", display: "block", margin: "0 auto -10px" }}
            onError={e => e.target.style.display = "none"} />
          <div style={{ width: 230, borderBottom: "1.5px solid #1f2937", margin: "0 auto 8px" }} />
          {/* Carimbo profissional */}
          <div style={{ display: "inline-block", border: "2px solid #7B00C4", borderRadius: 8, padding: "8px 20px", color: "#7B00C4" }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Dra. Lucia Kratz</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>Psicóloga — CRP 09/20590</div>
            <div style={{ fontSize: 9.5, marginTop: 2 }}>Doutora em Psicologia · TCC · Musicoterapia · Neuromodulação</div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PREVIEW ──────────────────────────────────────────────
  if (preview) {
    const ehDecl = preview.tipoDocumento === "declaracao";
    const periodoStr = preview.periodo?.emAndamento
      ? `${fmtData(preview.periodo?.dataInicio)} — Em andamento`
      : `${fmtData(preview.periodo?.dataInicio)} a ${fmtData(preview.periodo?.dataFim)}`;
    const hojeExtenso = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

    return (
      <div>
        {preview._rascunho && (
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#78350f", fontWeight: 600 }}>
            👁 Pré-visualização — o documento ainda NÃO foi salvo. Confira tudo e clique em "Salvar e Gerar PDF".
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => setPreview(null)}>
            <Icon name="arrow-left" size={15} /> {preview._rascunho ? "Voltar e editar" : "Voltar"}
          </button>
          {preview._rascunho ? (
            <button className="btn btn-purple" onClick={salvarDefinitivo} disabled={salvando}>
              <Icon name="save" size={15} /> {salvando ? "Salvando..." : "💾 Salvar e Gerar PDF"}
            </button>
          ) : (
            <button className="btn btn-purple" onClick={imprimirPreview}>
              <Icon name="printer" size={15} /> Imprimir / Salvar PDF
            </button>
          )}
        </div>

        <div id="nr1-preview-print" style={{ background: "white", borderRadius: 16, border: "1px solid var(--gray-200)", padding: 32, maxWidth: 680 }}>
          {/* Cabeçalho timbrado */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "2px solid #7B00C4" }}>
            <div>
              <div style={{ fontFamily: "Dancing Script, cursive", fontSize: 26, color: "#7B00C4", fontWeight: 700 }}>Dra. Lucia Kratz</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>CRP 09/20590 · Psicóloga · TCC · Musicoterapeuta · Neuromodulação</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Goiânia, GO — luciakratz.com.br</div>
            </div>
            <img src="../logo-transparente.png" style={{ height: 48, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />
          </div>

          {/* Título */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", textTransform: "uppercase", letterSpacing: 1 }}>
              {TIPO_LABELS[preview.tipoDocumento] || preview.tipoDocumento}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              Emitido em {preview.createdAt?.seconds ? new Date(preview.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}
            </div>
          </div>

          {ehDecl ? (
            <>
              {/* ── CORPO DA DECLARAÇÃO ── */}
              <div style={{ fontSize: 14, lineHeight: 2, textAlign: "justify", margin: "28px 0", textIndent: 40 }}>
                <strong>DECLARO</strong>, para os devidos fins, que <strong>{preview.pacienteNome}</strong>
                {preview.cargo ? `, ${preview.cargo}` : ""}
                {preview.empresaContratante ? <>, colaborador(a) da empresa <strong>{preview.empresaContratante}</strong></> : ""}
                , compareceu a atendimento psicológico nesta clínica no dia <strong>{fmtData(preview.dataComparecimento)}</strong>
                {preview.horaInicio ? <>, no horário das <strong>{preview.horaInicio}</strong>{preview.horaFim ? <> às <strong>{preview.horaFim}</strong></> : ""}</> : ""}.
              </div>
              {preview.obsDeclaracao && (
                <div style={{ fontSize: 13, lineHeight: 1.8, textAlign: "justify", marginBottom: 20, textIndent: 40 }}>{preview.obsDeclaracao}</div>
              )}
              <div style={{ fontSize: 13, margin: "28px 0 36px", textAlign: "right" }}>Goiânia, {hojeExtenso}.</div>
            </>
          ) : (
            <>
              {/* ── CORPO DO RELATÓRIO NR-1 ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7B00C4", borderBottom: "1px solid #e9d5ff", paddingBottom: 4, marginBottom: 10, textTransform: "uppercase" }}>
                  Dados do Colaborador
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
                  {[
                    ["Nome", preview.pacienteNome],
                    ["Empresa Contratante", preview.empresaContratante || "—"],
                    ["Cargo", preview.cargo || "—"],
                    ["Setor", preview.setor || "—"],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7B00C4", borderBottom: "1px solid #e9d5ff", paddingBottom: 4, marginBottom: 10, textTransform: "uppercase" }}>
                  Dados do Atendimento
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
                  {[
                    ["Vigência", periodoStr],
                    ["Sessões Realizadas", `${preview.sessoes?.realizadas || 0} de ${preview.sessoes?.total || 0}`],
                    ["Status no Programa", STATUS_LABELS[preview.statusPrograma] || preview.statusPrograma],
                  ].map(([l, v]) => (
                    <div key={l} style={{ gridColumn: l === "Status no Programa" ? "span 2" : "auto" }}>
                      <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {preview.parecerTecnico && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#7B00C4", borderBottom: "1px solid #e9d5ff", paddingBottom: 4, marginBottom: 10, textTransform: "uppercase" }}>
                    Parecer Técnico
                  </div>
                  <div style={{ background: "#f9f5ff", borderLeft: "3px solid #7B00C4", padding: "12px 16px", borderRadius: 4, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {preview.parecerTecnico}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Aviso ético */}
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 6, padding: "10px 14px", fontSize: 11, marginBottom: 24, color: "#78350f" }}>
            ⚖️ Este documento foi elaborado em conformidade com a Resolução CFP nº 06/2019, preservando o sigilo profissional. Não contém diagnósticos, CID, sintomas clínicos ou informações íntimas do colaborador.
          </div>

          <BlocoAssinatura/>
        </div>
      </div>
    );
  }

  // ─── FORMULÁRIO ───────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--purple-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="briefcase" size={18} style={{ color: "var(--purple)" }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Saúde Ocupacional — NR-1</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Relatórios e declarações para empresas contratantes</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Tipo de documento + descrição do que muda */}
          <div className="form-group" style={{ gridColumn: "span 2" }}>
            <label className="form-label">Tipo de Documento</label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {Object.entries(TIPO_LABELS).map(([val, label]) => (
                <button key={val} onClick={() => setForm({ ...form, tipoDocumento: val })}
                  style={{ padding: "8px 16px", borderRadius: 20, border: "1.5px solid", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", transition: "all .2s",
                    borderColor: form.tipoDocumento === val ? "var(--purple)" : "var(--gray-200)",
                    background: form.tipoDocumento === val ? "var(--purple)" : "white",
                    color: form.tipoDocumento === val ? "white" : "var(--gray-600)",
                    fontWeight: form.tipoDocumento === val ? 600 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--purple)", background: "var(--purple-soft)", borderRadius: 8, padding: "8px 12px" }}>
              {TIPO_DESC[form.tipoDocumento]}
            </div>
          </div>

          {/* Empresa / Setor / Cargo — editáveis, salvam no cadastro */}
          <div className="form-group" style={{ gridColumn: "span 2" }}>
            <label className="form-label">Empresa Contratante</label>
            <input className="form-input" value={ocup.empresa}
              onChange={e => setOcup({ ...ocup, empresa: e.target.value })}
              placeholder="Ex: Construtora Horizonte Ltda." />
          </div>
          <div className="form-group">
            <label className="form-label">Setor</label>
            <input className="form-input" value={ocup.setor}
              onChange={e => setOcup({ ...ocup, setor: e.target.value })}
              placeholder="Ex: Administrativo" />
          </div>
          <div className="form-group">
            <label className="form-label">Cargo</label>
            <input className="form-input" value={ocup.cargo}
              onChange={e => setOcup({ ...ocup, cargo: e.target.value })}
              placeholder="Ex: Analista de RH" />
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Gravados no cadastro do paciente ao salvar o documento.</div>
          </div>

          {eDeclaracao ? (
            <>
              {/* ── CAMPOS DA DECLARAÇÃO ── */}
              <div className="form-group">
                <label className="form-label">Data do Comparecimento</label>
                <input className="form-input" type="date" value={form.dataComparecimento}
                  onChange={e => setForm({ ...form, dataComparecimento: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Horário (início — término)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input className="form-input" type="time" value={form.horaInicio}
                    onChange={e => setForm({ ...form, horaInicio: e.target.value })} />
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                  <input className="form-input" type="time" value={form.horaFim}
                    onChange={e => setForm({ ...form, horaFim: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Observação (opcional)</label>
                <TextAreaVoz className="form-input" rows={3} value={form.obsDeclaracao}
                  onChange={e => setForm({ ...form, obsDeclaracao: e.target.value })}
                  placeholder="Ex: O comparecimento integra programa de acompanhamento psicossocial vigente." />
              </div>
            </>
          ) : (
            <>
              {/* ── CAMPOS DO RELATÓRIO NR-1 ── */}
              <div className="form-group">
                <label className="form-label">Data de Início</label>
                <input className="form-input" type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Data de Fim</label>
                <input className="form-input" type="date" value={form.dataFim} disabled={form.emAndamento}
                  onChange={e => setForm({ ...form, dataFim: e.target.value })}
                  style={form.emAndamento ? { background: "var(--gray-50)", color: "var(--text-muted)" } : {}} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <input type="checkbox" id="emAndamento" checked={form.emAndamento}
                    onChange={e => setForm({ ...form, emAndamento: e.target.checked, dataFim: "" })} />
                  <label htmlFor="emAndamento" style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>Em andamento</label>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Sessões Realizadas</label>
                <input className="form-input" type="number" min="0" value={form.sessoesRealizadas}
                  onChange={e => setForm({ ...form, sessoesRealizadas: e.target.value })} placeholder="Ex: 4" />
              </div>
              <div className="form-group">
                <label className="form-label">Total Planejado</label>
                <input className="form-input" type="number" min="0" value={form.sessoesTotal}
                  onChange={e => setForm({ ...form, sessoesTotal: e.target.value })} placeholder="Ex: 8" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Status no Programa</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <label key={val} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                      padding: "10px 14px", borderRadius: 8, border: "1.5px solid", transition: "all .2s",
                      borderColor: form.statusPrograma === val ? "var(--purple)" : "var(--gray-200)",
                      background: form.statusPrograma === val ? "var(--purple-soft)" : "white" }}>
                      <input type="radio" name="statusPrograma" value={val} checked={form.statusPrograma === val}
                        onChange={() => setForm({ ...form, statusPrograma: val })} />
                      <span style={{ fontSize: 13, fontWeight: form.statusPrograma === val ? 600 : 400,
                        color: form.statusPrograma === val ? "var(--purple)" : "var(--gray-700)" }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Parecer Técnico</label>
                <TextAreaVoz className="form-input" rows={6} value={form.parecerTecnico}
                  onChange={e => setForm({ ...form, parecerTecnico: e.target.value })}
                  placeholder={"Foque em:\n• Capacidade laboral e funcionalidade no trabalho\n• Recomendações ergonômicas ou organizacionais\n• Necessidade de adaptações no posto de trabalho\n\nEvite: diagnósticos, CID, sintomas clínicos, informações íntimas."} />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  ⚖️ Este campo deve seguir a Resolução CFP nº 06/2019 — foco em capacidade laboral, sem expor diagnósticos ou CID.
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button className="btn btn-purple" onClick={visualizar}>
            <Icon name="eye" size={15} /> 👁 Visualizar documento
          </button>
          <div style={{ fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>Nada é salvo antes de você conferir e aprovar.</div>
        </div>
      </div>

      {/* Histórico */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="history" size={16} /> Histórico de Documentos NR-1
        </div>
        {loadingHist ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Carregando...</div>
        ) : historico.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13 }}>
            Nenhum documento gerado ainda.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {historico.map(doc => (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                borderRadius: 10, border: "1px solid var(--gray-200)", background: "white" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: doc.tipoDocumento==="declaracao" ? "#ccfbf1" : "var(--purple-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name={doc.tipoDocumento==="declaracao" ? "badge-check" : "file-text"} size={16} style={{ color: doc.tipoDocumento==="declaracao" ? "#0d9488" : "var(--purple)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{TIPO_LABELS[doc.tipoDocumento] || doc.tipoDocumento}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {doc.tipoDocumento==="declaracao"
                      ? `Comparecimento em ${fmtData(doc.dataComparecimento)}${doc.horaInicio ? ` · ${doc.horaInicio}${doc.horaFim ? "–"+doc.horaFim : ""}` : ""}`
                      : `${doc.periodo?.emAndamento ? `${fmtData(doc.periodo?.dataInicio)} — Em andamento` : `${fmtData(doc.periodo?.dataInicio)} a ${fmtData(doc.periodo?.dataFim)}`} · ${doc.sessoes?.realizadas || 0}/${doc.sessoes?.total || 0} sessões`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => abrirPreview(doc)}>
                    <Icon name="eye" size={13} /> Ver
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => { abrirPreview(doc); setTimeout(imprimirPreview, 300); }}>
                    <Icon name="printer" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
//  MÓDULO 2: LINKS COMPARTILHÁVEIS — AbaLinksPartilhados
//  Coleção: clinica_links_partilhados
//  Inserir: antes da função PerfilPaciente em admin/app.js
// ═══════════════════════════════════════════════════════════════════

// Ferramentas disponíveis para link compartilhável
const FERRAMENTAS_LINK = [
  { id: "anamnese",    nome: "Anamnese — Marcos do Desenvolvimento", emoji: "📋", desc: "Formulário completo de anamnese" },
  { id: "entrevista",  nome: "Entrevista Clínica Inicial (DSM-5)",   emoji: "🧠", desc: "Instrumento de avaliação clínica inicial" },
  { id: "arvore",      nome: "Árvore da Decisão",                    emoji: "🌳", desc: "Técnica TCC para transformar preocupações" },
  { id: "ansiedade",   nome: "Gestão da Ansiedade",                  emoji: "🎯", desc: "Tracking de estresse, humor e roda da vida" },
  { id: "alimentacao", nome: "Rastreamento Emocional da Alimentação", emoji: "🍎", desc: "Relação entre emoções e comportamento alimentar" },
  { id: "abc-record",  nome: "Registro ABC de Pensamentos",          emoji: "📝", desc: "Modelo de registro cognitivo TCC" },
  { id: "relaxamento", nome: "Relaxamento Muscular Progressivo",     emoji: "💆", desc: "Técnica de Jacobson para tensão e ansiedade" },
];

function gerarToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase() +
    Math.random().toString(36).substring(2, 10).toUpperCase();
}

function AbaLinksPartilhados({ paciente }) {
  const BASE_URL = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";
  const [links, setLinks] = useState({});       // { ferramentaId: { token, status, createdAt, docId } }
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState({});   // { ferramentaId: true }
  const [copiado, setCopiado] = useState({});   // { token: true }

  // Carregar links existentes
  useEffect(() => {
    db.collection("clinica_links_partilhados")
      .where("pacienteId", "==", paciente.id)
      .get()
      .then(snap => {
        const mapa = {};
        snap.docs.forEach(d => {
          const data = d.data();
          // Manter o mais recente por ferramenta
          if (!mapa[data.tipoFerramenta] || (data.createdAt?.seconds || 0) > (mapa[data.tipoFerramenta]?.createdAt?.seconds || 0)) {
            mapa[data.tipoFerramenta] = { docId: d.id, ...data };
          }
        });
        setLinks(mapa);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [paciente.id]);

  async function gerarLink(ferramenta) {
    setGerando(g => ({ ...g, [ferramenta.id]: true }));
    const token = gerarToken();
    const doc = {
      token,
      pacienteId: paciente.id,
      pacienteNome: paciente.nome || "",
      tipoFerramenta: ferramenta.id,
      nomeFerramenta: ferramenta.nome,
      status: "pendente",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    try {
      // Desativar link anterior se existir
      if (links[ferramenta.id]?.docId) {
        await db.collection("clinica_links_partilhados").doc(links[ferramenta.id].docId).update({ status: "substituido" });
      }
      const ref = await db.collection("clinica_links_partilhados").add(doc);
      setLinks(l => ({
        ...l,
        [ferramenta.id]: {
          docId: ref.id, token, status: "pendente",
          createdAt: { seconds: Date.now() / 1000 },
          tipoFerramenta: ferramenta.id,
        },
      }));
    } catch (e) {
      alert("Erro ao gerar link: " + e.message);
    }
    setGerando(g => ({ ...g, [ferramenta.id]: false }));
  }

  function copiarLink(token) {
    const url = `${BASE_URL}/responder?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiado(c => ({ ...c, [token]: true }));
    setTimeout(() => setCopiado(c => ({ ...c, [token]: false })), 2000);
  }

  function enviarWhatsApp(ferramenta, token) {
    const url = `${BASE_URL}/responder?token=${token}`;
    const nome = paciente.nome?.split(" ")[0] || "paciente";
    const msg = `Olá, ${nome}! 😊\n\nSua psicóloga Dra. Lucia Kratz enviou um formulário para você preencher:\n\n📋 *${ferramenta.nome}*\n\nAcesse pelo link abaixo e responda com calma — suas respostas vão direto para o prontuário:\n${url}\n\nQualquer dúvida, estou por aqui!\n_Dra. Lucia Kratz · CRP 09/20590_`;
    window.open(`https://api.whatsapp.com/send?phone=55${(paciente.telefone || "").replace(/\D/g, "")}&text=${encodeURIComponent(msg)}`, "_blank");
  }

  const fmtDataHora = (seconds) => {
    if (!seconds) return "—";
    return new Date(seconds * 1000).toLocaleDateString("pt-BR");
  };

  const STATUS_CONFIG = {
    pendente:    { label: "Pendente",    cor: "#d97706", bg: "#fef3c7", icon: "clock" },
    respondido:  { label: "Respondido", cor: "#059669", bg: "#d1fae5", icon: "check-circle" },
    substituido: { label: "Substituído",cor: "#6b7280", bg: "#f3f4f6", icon: "refresh-cw" },
  };

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--purple-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="link" size={18} style={{ color: "var(--purple)" }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Links Compartilháveis</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Envie ferramentas clínicas diretamente para {paciente.nome?.split(" ")[0] || "o paciente"} responder pelo celular</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Carregando...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FERRAMENTAS_LINK.map(ferramenta => {
            const linkAtual = links[ferramenta.id];
            const statusCfg = STATUS_CONFIG[linkAtual?.status] || null;
            const url = linkAtual ? `${BASE_URL}/responder?token=${linkAtual.token}` : null;

            return (
              <div key={ferramenta.id} style={{ border: "1.5px solid", borderColor: linkAtual ? "var(--purple)" : "var(--gray-200)",
                borderRadius: 12, padding: "14px 16px", background: linkAtual ? "var(--purple-soft)" : "white", transition: "all .2s" }}>

                {/* Header da ferramenta */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: linkAtual ? 12 : 0 }}>
                  <div style={{ fontSize: 24, flexShrink: 0 }}>{ferramenta.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{ferramenta.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ferramenta.desc}</div>
                  </div>

                  {/* Badge status */}
                  {statusCfg && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20,
                      background: statusCfg.bg, color: statusCfg.cor, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                      <Icon name={statusCfg.icon} size={11} />
                      {statusCfg.label}
                      {linkAtual?.status === "respondido" && linkAtual?.respondidoEm &&
                        <span> em {fmtDataHora(linkAtual.respondidoEm?.seconds)}</span>
                      }
                    </div>
                  )}

                  {/* Botão gerar link */}
                  <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12, flexShrink: 0 }}
                    onClick={() => gerarLink(ferramenta)} disabled={gerando[ferramenta.id]}>
                    <Icon name="link" size={13} />
                    {gerando[ferramenta.id] ? "Gerando..." : linkAtual ? "Novo Link" : "Gerar Link"}
                  </button>
                </div>

                {/* Link gerado */}
                {linkAtual && linkAtual.status !== "substituido" && url && (
                  <div style={{ marginTop: 4 }}>
                    {/* URL */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white",
                      border: "1px solid var(--gray-200)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                      <Icon name="link" size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {url}
                      </span>
                    </div>

                    {/* Ações */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btn-outline" style={{ padding: "7px 14px", fontSize: 12 }}
                        onClick={() => copiarLink(linkAtual.token)}>
                        <Icon name={copiado[linkAtual.token] ? "check" : "copy"} size={13} />
                        {copiado[linkAtual.token] ? "Copiado!" : "Copiar Link"}
                      </button>
                      <button className="btn btn-purple" style={{ padding: "7px 14px", fontSize: 12 }}
                        onClick={() => enviarWhatsApp(ferramenta, linkAtual.token)}>
                        <Icon name="message-circle" size={13} /> Enviar pelo WhatsApp
                      </button>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                        <Icon name="calendar" size={11} />
                        Gerado em {fmtDataHora(linkAtual.createdAt?.seconds)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Nota informativa */}
      <div style={{ marginTop: 16, padding: "10px 14px", background: "#eff6ff", borderRadius: 8, fontSize: 11, color: "#1e40af", lineHeight: 1.6 }}>
        💡 <strong>Como funciona:</strong> O paciente recebe o link, acessa a ferramenta no celular, preenche e envia. As respostas entram automaticamente no prontuário e o status muda para <strong>Respondido</strong>.
        O link expira após ser respondido ou quando um novo link é gerado para a mesma ferramenta.
      </div>
    </div>
  );
}

function PerfilPaciente({ paciente, onVoltar, pacientes, user }) {
  const [aba, setAba] = useState("perfil");
  const isSecretaria = user?.tipo==="secretaria";
  const ABAS = [
    {id:"perfil",   label:"Perfil",          icon:"user"},
    ...(!isSecretaria?[
      {id:"modulos",  label:"Modulos",         icon:"toggle-right"},
      {id:"modulo1",  label:"Módulo 1",        icon:"layout-grid"},
      {id:"metas",    label:"Metas",           icon:"target"},
      {id:"laudos",   label:"Laudos",          icon:"file-text"},
      {id:"evolucao", label:"Evolucao",        icon:"trending-up"},
      {id:"casal",    label:"Terapia de Casal",icon:"heart"},
      {id:"nr1",      label:"Saúde Ocupacional",   icon:"briefcase"},
      {id:"links",    label:"Links Partilhados",   icon:"link"},
    ]:[]),
  ];
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button className="btn btn-ghost" onClick={onVoltar} style={{padding:"8px 12px"}}><Icon name="arrow-left" size={16}/></button>
        <div style={{flex:1}}>
          <div className="page-title" style={{fontSize:24}}>{paciente.nome}</div>
          <div className="page-subtitle">Perfil clinico completo</div>
        </div>
        <button className="btn btn-danger" onClick={async()=>{if(!confirm("Excluir paciente?"))return;await db.collection("clinica_pacientes").doc(paciente.id).delete();onVoltar();}}>
          <Icon name="trash-2" size={15}/> Excluir paciente
        </button>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:24,overflowX:"auto",borderBottom:"1px solid var(--gray-200)",flexShrink:0,WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        {ABAS.map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",border:"none",background:"none",fontSize:14,cursor:"pointer",fontFamily:"var(--font-body)",color:aba===a.id?"var(--purple)":"var(--gray-600)",borderBottom:aba===a.id?"2px solid var(--purple)":"2px solid transparent",fontWeight:aba===a.id?500:400,transition:"all .2s",marginBottom:-1}}>
            <Icon name={a.icon} size={15}/>{a.label}
          </button>
        ))}
      </div>
      {aba==="perfil"     &&<AbaPerfil      paciente={paciente} pacientes={pacientes}/>}
      {aba==="modulos"    &&<AbaModulos     paciente={paciente}/>}
      {aba==="modulo1"    &&<AbaModulo1     paciente={paciente}/>}
      {aba==="metas"      &&<AbaMetas       paciente={paciente}/>}
      {aba==="laudos"     &&<EmBreve titulo="Laudos" subtitulo="Etapa 10"/>}
      {aba==="evolucao"   &&<AbaEvolucao    paciente={paciente}/>}
      {aba==="casal"      &&<AbaCasal       paciente={paciente} pacientes={pacientes}/>}
      {aba==="nr1"        &&<AbaOcupacional paciente={paciente}/>}
      {aba==="links"      &&<AbaLinksPartilhados paciente={paciente}/>}
    </div>
  );
}

// LISTA PACIENTES
const MOD1_PADRAO = {
  mod1: {
    ativo: true,
    ferramentas: {
      humor:  { ativo:true, dataInicio: new Date().toISOString().slice(0,10) },
      metas:  { ativo:true, dataInicio: new Date().toISOString().slice(0,10) },
      diario: { ativo:true, dataInicio: new Date().toISOString().slice(0,10) },
    }
  }
};

function Pacientes({ user }) {
  const { data:pacientes, loading } = useCollection("clinica_pacientes","nome");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(false);
  const [modalImport, setModalImport] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(null);
  const [importLog, setImportLog] = useState([]);
  const [importando, setImportando] = useState(false);

  async function processarExcel(e){
    const file=e.target.files[0];
    if(!file)return;
    setImportando(true);setImportLog([{tipo:"info",msg:"Lendo arquivo..."}]);
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      try{
        const text=ev.target.result;
        const linhas=text.split(/\r?\n/).filter(l=>l.trim());
        if(linhas.length<2){setImportLog([{tipo:"err",msg:"Arquivo vazio ou sem dados."}]);setImportando(false);return;}
        const header=linhas[0].split(/[,;\t]/).map(h=>h.trim().toLowerCase().replace(/[^a-z]/g,""));
        const idx={
          nome:    header.findIndex(h=>h.includes("nome")),
          email:   header.findIndex(h=>h.includes("email")||h.includes("mail")),
          telefone:header.findIndex(h=>h.includes("tel")||h.includes("fone")||h.includes("celular")),
          cpf:     header.findIndex(h=>h.includes("cpf")||h.includes("documento")),
          nasc:    header.findIndex(h=>h.includes("nasc")||h.includes("data")),
          genero:  header.findIndex(h=>h.includes("gen")||h.includes("sexo")),
        };
        const log=[];let ok=0,err=0;
        for(let i=1;i<linhas.length;i++){
          const cols=linhas[i].split(/[,;\t]/);
          const nome=idx.nome>=0?cols[idx.nome]?.trim():"";
          if(!nome)continue;
          try{
            const email=idx.email>=0?(cols[idx.email]?.trim()||`sem-email-${Date.now()}@interno.local`):`sem-email-${Date.now()}@interno.local`;
            await db.collection("clinica_pacientes").add({
              nome,email,
              telefone:idx.telefone>=0?cols[idx.telefone]?.trim()||"":"",
              cpf:idx.cpf>=0?cols[idx.cpf]?.trim()||"":"",
              dataNascimento:idx.nasc>=0?cols[idx.nasc]?.trim()||"":"",
              genero:idx.genero>=0?cols[idx.genero]?.trim()||"Não informar":"Não informar",
              status:"ativo",senha:"",objetivosTerapeuticos:"",observacoesClinicas:"",
              origem:"importacao-excel",
              modulosConfig: MOD1_PADRAO,
              modulosAtivos: ["mod1"],
              createdAt:firebase.firestore.FieldValue.serverTimestamp()
            });
            ok++;log.push({tipo:"ok",msg:`✓ ${nome}`});
          }catch(er){err++;log.push({tipo:"err",msg:`✗ ${nome}: ${er.message}`});}
        }
        log.unshift({tipo:"info",msg:`Concluído: ${ok} importados · ${err} erro(s)`});
        setImportLog(log);
      }catch(er){setImportLog([{tipo:"err",msg:"Erro ao ler arquivo: "+er.message}]);}
      finally{setImportando(false);}
    };
    reader.readAsText(file,"UTF-8");
  }

  function baixarTemplate(){
    const csv="Nome,Email,Telefone,CPF,DataNascimento,Genero\nJoão Silva,joao@email.com,(62) 99999-0000,000.000.000-00,01/01/1990,Masculino\n";
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="template-pacientes.csv";a.click();
  }

  if(perfilAberto) {
    const pac = pacientes.find(p=>p.id===perfilAberto);
    if(pac) return <PerfilPaciente paciente={pac} onVoltar={()=>setPerfilAberto(null)} pacientes={pacientes}/>;
  }

  const filtrados = pacientes.filter(p=>{
    const ok=filtro==="todos"||p.status===filtro;
    const bk=!busca||p.nome?.toLowerCase().includes(busca.toLowerCase())||p.email?.toLowerCase().includes(busca.toLowerCase());
    return ok&&bk;
  }).sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"));

  function abrirNovo(){setForm({nome:"",email:"",telefone:"",status:"ativo",genero:"",dataNasc:"",cpf:"",objetivos:""});setModal(true);}
  async function salvar(){
    if(!form.nome||!form.email){alert("Nome e e-mail obrigatorios.");return;}
    setSalvando(true);
    await db.collection("clinica_pacientes").add({
      ...form, senha:"1234",
      modulosConfig: MOD1_PADRAO,
      modulosAtivos: ["mod1"],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setModal(false);setSalvando(false);
  }

  if(loading) return <Spinner/>;

  return (
    <div>
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Pacientes</div>
          <div className="page-subtitle">{pacientes.filter(p=>p.status==="ativo").length} ativos · {pacientes.filter(p=>p.status==="alta").length} com alta · {pacientes.filter(p=>p.status==="inativo").length} inativos</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn btn-ghost" style={{fontSize:13}} onClick={()=>setModalImport(true)}><Icon name="upload" size={15}/> Importar Excel</button>
          <button className="btn btn-ghost" style={{fontSize:13}} onClick={()=>{
            const url="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/cadastro/";
            const texto = `🦋 *Clínica Dra. Lucia Kratz*\n\nOlá! Para agilizar o seu atendimento, preencha o formulário de cadastro pelo link abaixo:\n\n👉 ${url}\n\nÉ rápido e seguro. Após o preenchimento, seus dados já estarão disponíveis para a sua psicóloga.\n\nQualquer dúvida, estamos à disposição! 💜`;
            navigator.clipboard.writeText(texto).then(()=>alert("✓ Texto + link copiado!\nCole direto no WhatsApp.")).catch(()=>prompt("Copie o texto:",texto));
          }}><Icon name="link" size={15}/> Link de Cadastro</button>
          <button className="btn btn-purple" onClick={abrirNovo}><Icon name="user-plus" size={16}/> Novo Paciente</button>
        </div>
      </div>
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <input className="form-input" style={{flex:1,minWidth:200}} placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e=>setBusca(e.target.value)}/>
        {[["todos","Todos"],["ativo","Em atendimento"],["alta","Alta"],["inativo","Inativos"]].map(([f,l])=>(
          <button key={f} className={"btn "+(filtro===f?"btn-purple":"btn-ghost")} onClick={()=>setFiltro(f)}>{l}</button>
        ))}
      </div>
      {["pendente","ativo","alta","inativo"].map(st=>{
        const grupo=filtrados.filter(p=>p.status===st);
        if(grupo.length===0)return null;
        return(
          <div key={st} style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:st==="ativo"?"var(--success)":st==="alta"?"var(--gray-400)":st==="pendente"?"#f59e0b":"var(--danger)"}}/>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.8px"}}>
                {st==="ativo"?"Em Atendimento":st==="alta"?"Alta":st==="pendente"?"⏳ Pendentes (Autocadastro)":"Inativos"} ({grupo.length})
              </div>
            </div>
            <div className="card" style={{padding:0}}>
              {grupo.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderBottom:"1px solid var(--gray-100)",cursor:"pointer",transition:"background .15s"}}
                  onClick={()=>setPerfilAberto(p.id)}
                  onMouseEnter={e=>e.currentTarget.style.background="#fafafa"}
                  onMouseLeave={e=>e.currentTarget.style.background="white"}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600,color:"var(--purple)",flexShrink:0}}>{(p.nome||"?")[0].toUpperCase()}</div>
                  <div style={{flex:1}}><div style={{fontWeight:500}}>{p.nome}</div><div style={{fontSize:13,color:"var(--text-muted)"}}>{p.email}</div></div>
                  <Icon name="chevron-right" size={16}/>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {filtrados.length===0&&<div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>Nenhum paciente encontrado.</div>}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>Novo Paciente</div>
              <button onClick={()=>setModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div className="form-group" style={{gridColumn:"span 2"}}><label className="form-label">Nome completo</label><input className="form-input" value={form.nome||""} onChange={e=>setForm({...form,nome:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.telefone||""} onChange={e=>setForm({...form,telefone:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Genero</label><select className="form-input" value={form.genero||""} onChange={e=>setForm({...form,genero:e.target.value})}><option value="">Selecione</option><option>Feminino</option><option>Masculino</option><option>Nao-binario</option><option>Nao informar</option></select></div>
              <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status||"ativo"} onChange={e=>setForm({...form,status:e.target.value})}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="alta">Alta</option></select></div>
              <div className="form-group" style={{gridColumn:"span 2"}}><label className="form-label">🏢 Empresa Contratante (opcional — NR-1)</label><input className="form-input" value={form.empresa||""} onChange={e=>setForm({...form,empresa:e.target.value})} placeholder="Para colaboradores de empresas"/></div>
              <div className="form-group"><label className="form-label">Setor</label><input className="form-input" value={form.setor||""} onChange={e=>setForm({...form,setor:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Cargo</label><input className="form-input" value={form.cargo||""} onChange={e=>setForm({...form,cargo:e.target.value})}/></div>
              <div className="form-group" style={{gridColumn:"span 2"}}><label className="form-label">Objetivos Terapeuticos</label><TextAreaVoz className="form-input" rows={3} value={form.objetivos||""} onChange={e=>setForm({...form,objetivos:e.target.value})} placeholder="Descreva os objetivos..."/></div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}>{salvando?"Salvando...":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar Excel */}
      {modalImport&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>{setModalImport(false);setImportLog([]);}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>Importar Pacientes (Excel/CSV)</div>
              <button onClick={()=>{setModalImport(false);setImportLog([]);}} style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{background:"#f9f5ff",border:"1px solid #e9d5ff",borderRadius:10,padding:14,marginBottom:16,fontSize:13,lineHeight:1.7}}>
              <strong>Colunas aceitas:</strong> Nome, Email, Telefone, CPF, DataNascimento, Genero<br/>
              <strong>Formatos:</strong> .csv ou .txt com separador vírgula, ponto-e-vírgula ou tab<br/>
              <strong>Encoding:</strong> UTF-8
            </div>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <button className="btn btn-outline" style={{flex:1,fontSize:13}} onClick={baixarTemplate}>
                <Icon name="download" size={14}/> Baixar template CSV
              </button>
              <label style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px",borderRadius:10,border:"1.5px solid var(--purple)",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:13,fontWeight:600}}>
                <Icon name="upload" size={14}/> Selecionar arquivo
                <input type="file" accept=".csv,.txt,.xls,.xlsx" style={{display:"none"}} onChange={processarExcel}/>
              </label>
            </div>
            {importLog.length>0&&(
              <div style={{background:"#f9fafb",borderRadius:10,padding:14,maxHeight:240,overflowY:"auto",fontSize:12,lineHeight:2,border:"1px solid #e5e7eb"}}>
                {importLog.map((l,i)=>(
                  <div key={i} style={{color:l.tipo==="ok"?"#059669":l.tipo==="err"?"#dc2626":"#7B00C4",fontWeight:l.tipo==="info"?600:400}}>{l.msg}</div>
                ))}
              </div>
            )}
            {importando&&<div style={{textAlign:"center",padding:12,color:"var(--purple)",fontSize:13}}>Importando... aguarde</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// FINANCEIRO CLINICA
// ── Relatório de Frequência (componente externo) ──────────────────────────
function RelatorioFrequencia({pacienteId, pacoteId, pacientes, sessoes, pacotes, lancamentos, FORMAS, onVoltar}){
  // Normaliza IDs removendo espaços e garantindo string limpa
  const pidNorm = (pacienteId||"").trim();
  const pac = pacientes.find(p=>p.id===pidNorm);
  const pacote = pacoteId ? pacotes.find(p=>p.id===pacoteId) : null;
  const pacEfetivo = pac || pacientes.find(p=>p.id===pacote?.pacienteId);

  // Busca pacotes do paciente — também tenta pelo nome caso ID não bata
  const pacotesPorId = pacotes.filter(p=>p.pacienteId===pidNorm);
  // Fallback extra: busca por pacienteNome se nenhum pacote encontrado
  const pacotesPac = pacoteId
    ? [pacote].filter(Boolean)
    : pacotesPorId.length > 0
      ? pacotesPorId
      : pacotes.filter(p=>p.pacienteNome && pacEfetivo && p.pacienteNome===pacEfetivo.nome);

  const pacoteIdsDosPac = pacotesPac.map(p=>p.id);
  const sessPac = pacoteId
    ? sessoes.filter(s=>s.pacoteId===pacoteId).sort((a,b)=>a.data?.localeCompare(b.data))
    : sessoes.filter(s=>s.pacienteId===pidNorm||pacoteIdsDosPac.includes(s.pacoteId)).sort((a,b)=>a.data?.localeCompare(b.data));
  const [mesFiltro, setMesFiltro] = useState("todos");
  const [accordionAberto, setAccordionAberto] = useState({});
  const [modalExcluir, setModalExcluir] = useState(null);

  const STATUS_S={
    agendado:  {l:"Agendado",   c:"#7B00C4"},
    confirmado:{l:"Confirmado", c:"#059669"},
    realizado: {l:"✓ Realizado",c:"#059669"},
    cancelado: {l:"Cancelado",  c:"#dc2626"},
    falta:     {l:"Falta",      c:"#d97706"},
    remarcado: {l:"Remarcado",  c:"#0891b2"},
  };

  const porMes = sessPac.reduce((acc,s)=>{
    const mes = s.data?.slice(0,7)||"sem-data";
    if(!acc[mes]) acc[mes]=[];
    acc[mes].push(s);
    return acc;
  },{});
  const meses = Object.keys(porMes).sort();
  const mesesFiltrados = mesFiltro==="todos"?meses:[mesFiltro];
  const anoAtual = new Date().getFullYear();
  const totalAno = sessPac.filter(s=>s.data?.startsWith(anoAtual+"")&&s.pagamento==="pago").reduce((a,s)=>a+(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0),0);

  async function atualizarSessao(id, campos){ await db.collection("clinica_sessoes").doc(id).update(campos); }
  async function remarcarSessao(s, novaData){
    if(!novaData) return;
    try {
      await db.collection("clinica_sessoes").doc(s.id).update({
        data: novaData,
        status: "remarcado",
        remarcada: true,
        dataRemarcada: novaData,
        dataOriginal: s.dataOriginal||s.data,
      });
    } catch(e){
      console.error("Erro ao remarcar sessão:", e);
      alert("Erro ao remarcar: "+e.message);
    }
  }

  async function atualizarPagamento(s, formaPag, valorPago){
    const pago = formaPag!==""&&formaPag!=="pendente";
    const vPago = parseFloat(valorPago)||(parseFloat(s.valorSessao)||0);
    await atualizarSessao(s.id,{
      formaPagamento:formaPag,
      pagamento:pago?"pago":"pendente",
      valorPago:pago?vPago:0,
      dataPagamento:pago&&!s.dataPagamento?new Date().toISOString().slice(0,10):s.dataPagamento
    });
    // ── REGRA: sessão de PACOTE nunca gera lançamento próprio.
    // O lançamento do pacote já cobre todas as sessões filhas.
    // Lançamento individual só existe para sessões AVULSAS (sem pacoteId).
    if(pago && !s.pacoteId){
      const lancExist = lancamentos.find(l=>l.sessaoId===s.id);
      if(!lancExist){
        await db.collection("clinica_lancamentos").add({
          tipo_lancamento:"sessao",sessaoId:s.id,
          pacienteId:s.pacienteId,pacienteNome:s.pacienteNome||"",
          tipo:"Sessão #"+(s.numSessao||""),
          valor:vPago,data:s.dataPagamento||new Date().toISOString().slice(0,10),
          formaPag,status:"recebido",
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await db.collection("clinica_lancamentos").doc(lancExist.id).update({valor:vPago,formaPag,status:"recebido"});
      }
    }
  }

  async function confirmarExclusao(tipo){
    if(!modalExcluir)return;
    const {id,pacoteId,numSessao}=modalExcluir;
    if(tipo==="este"){
      await db.collection("clinica_sessoes").doc(id).delete();
    } else if(tipo==="daqui"){
      const fut=sessoes.filter(s=>s.pacoteId===pacoteId&&(s.numSessao||0)>=(numSessao||0));
      const b=db.batch();fut.forEach(s=>b.delete(db.collection("clinica_sessoes").doc(s.id)));await b.commit();
    } else {
      const todas=sessoes.filter(s=>s.pacoteId===pacoteId);
      const b=db.batch();todas.forEach(s=>b.delete(db.collection("clinica_sessoes").doc(s.id)));
      b.delete(db.collection("clinica_pacotes").doc(pacoteId));
      const lp=lancamentos.find(l=>l.pacoteId===pacoteId);
      if(lp) b.delete(db.collection("clinica_lancamentos").doc(lp.id));
      await b.commit();
    }
    setModalExcluir(null);
  }

  return(
    <div>
      {/* Barra fixa de navegação */}
      <div style={{background:"var(--purple)",borderRadius:12,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={onVoltar} style={{background:"rgba(255,255,255,0.2)",border:"none",cursor:"pointer",color:"white",padding:"6px 12px",borderRadius:8,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
          <Icon name="arrow-left" size={15}/> Voltar
        </button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"Dancing Script, cursive",fontSize:20,color:"white",fontWeight:600,lineHeight:1}}>{pacEfetivo?.nome}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.75)",marginTop:2}}>Controle de Sessões e Frequência</div>
        </div>
        <button style={{background:"rgba(255,255,255,0.2)",border:"none",cursor:"pointer",color:"white",padding:"6px 14px",borderRadius:8,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}} onClick={()=>{
          const pac = pacEfetivo;
          const sessMeses = {};
          sessoesPac.forEach(s=>{
            const mes = (s.data||"").slice(0,7);
            if(!sessMeses[mes]) sessMeses[mes]=[];
            sessMeses[mes].push(s);
          });
          const totalPago = sessoesPac.reduce((a,s)=>a+(parseFloat(s.valorPago)||0),0);
          const totalValor = sessoesPac.reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0);
          const fmtD = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}) : "—";
          const fmtM = m => { const [y,mo]=m.split("-"); return new Date(y,mo-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}); };
          const statusLabel = {agendado:"Agendado",confirmado:"Confirmado",realizado:"✓ Realizado",cancelado:"Cancelado",falta:"Falta"};
          const statusColor = {agendado:"#7B00C4",confirmado:"#059669",realizado:"#0891b2",cancelado:"#dc2626",falta:"#d97706"};
          const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Resumo de Sessões — ${pac?.nome||""}</title>
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
  <div style="text-align:right;font-size:11px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</div>
</div>
<div class="paciente-box">
  <div class="paciente-nome">${pac?.nome||"—"}</div>
  <div class="paciente-meta">
    <div class="meta-item"><label>Início</label><span>${pacotesPac[0]?.dataInicio?new Date(pacotesPac[0].dataInicio+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</span></div>
    <div class="meta-item"><label>Horário</label><span>${pacotesPac[0]?.horario||"—"}</span></div>
    <div class="meta-item"><label>Recorrência</label><span>${pacotesPac[0]?.recorrencia||"—"}</span></div>
    <div class="meta-item"><label>Total de sessões</label><span>${sessoesPac.length}</span></div>
  </div>
</div>
${Object.entries(sessMeses).sort(([a],[b])=>a.localeCompare(b)).map(([mes,sess])=>`
<div class="mes-title">${fmtM(mes).charAt(0).toUpperCase()+fmtM(mes).slice(1)} — ${sess.length} sessão(ões)</div>
<table>
  <thead><tr><th>Nº</th><th>Data</th><th>Horário</th><th>Tipo</th><th>Presença</th><th>Valor</th></tr></thead>
  <tbody>${sess.sort((a,b)=>(a.data||"").localeCompare(b.data||"")).map((s,i)=>`
    <tr>
      <td style="font-weight:700;color:#7B00C4">${s.numSessao||i+1}</td>
      <td>${s.data?new Date(s.data+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"}):""}</td>
      <td>${s.hora||"—"}</td>
      <td>${s.tipo||"Psicoterapia"}</td>
      <td><span class="status" style="background:${statusColor[s.status]||"#7B00C4"}">${statusLabel[s.status]||s.status||"—"}</span></td>
      <td>R$ ${(parseFloat(s.valorSessao)||0).toFixed(2).replace(".",",")}</td>
    </tr>`).join("")}
  </tbody>
</table>`).join("")}
<div class="totais">
  <div class="total-item"><label>Total do pacote</label><span style="color:#111827">R$ ${totalValor.toFixed(2).replace(".",",")}</span></div>
  <div class="total-item"><label>Recebido</label><span style="color:#059669">R$ ${totalPago.toFixed(2).replace(".",",")}</span></div>
  <div class="total-item"><label>A receber</label><span style="color:#d97706">R$ ${(totalValor-totalPago).toFixed(2).replace(".",",")}</span></div>
</div>
<div class="footer">Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
          const w = window.open("","_blank");
          w.document.write(html);
          w.document.close();
          setTimeout(()=>w.print(),800);
        }}>
          <Icon name="printer" size={15}/> Imprimir / PDF
        </button>
      </div>

      {/* Cabeçalho */}
      <div style={{background:"white",borderRadius:16,overflow:"hidden",border:"1px solid var(--gray-200)",marginBottom:16}}>
        <div style={{background:"var(--purple)",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontFamily:"Dancing Script, cursive",fontSize:22,color:"white",fontWeight:600}}>Controle de Atendimento Terapêutico</div>
          <img src="../logo-transparente.png" style={{height:36,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
        </div>
        <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,borderBottom:"1px solid var(--gray-100)"}}>
          {[["Nome",pacEfetivo?.nome||"—"],["Início",pacotesPac[0]?.dataInicio?new Date(pacotesPac[0].dataInicio+"T00:00:00").toLocaleDateString("pt-BR"):"—"],["Horário",pacotesPac[0]?.horario||"—"],["Recorrência",pacotesPac[0]?.recorrencia||"—"]].map(([l,v])=>(
            <div key={l}><div style={{fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>{l}</div><div style={{fontWeight:600,fontSize:13}}>{v}</div></div>
          ))}
        </div>
        {/* Resumo proporcional ao filtro */}
        <div style={{padding:"12px 20px",display:"flex",gap:20,flexWrap:"wrap",background:"var(--purple-soft)"}}>
          {(()=>{
            const sessFiltro = mesFiltro==="todos"?sessPac:sessPac.filter(s=>s.data?.startsWith(mesFiltro));
            const recFiltro = sessFiltro.filter(s=>s.pagamento==="pago").reduce((a,s)=>a+(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0),0);
            const pendFiltro = sessFiltro.filter(s=>s.pagamento!=="pago"&&s.status!=="cancelado").reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0);
            return [
              ["Sessões",sessFiltro.length,"#7B00C4"],
              ["Realizadas",sessFiltro.filter(s=>s.status==="realizado").length,"#059669"],
              ["Pagas",sessFiltro.filter(s=>s.pagamento==="pago").length,"#059669"],
              ["Pendentes",sessFiltro.filter(s=>s.pagamento!=="pago"&&s.status!=="cancelado").length,"#d97706"],
              ["Faltas",sessFiltro.filter(s=>s.status==="falta").length,"#dc2626"],
              ["Recebido",recFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"#059669"],
              ["A Receber",pendFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"#d97706"],
              ["Ano "+anoAtual,totalAno.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"#0891b2"],
            ].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:10,color:c,fontWeight:500}}>{l}</div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Filtro mês */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text-muted)"}}>Mês:</span>
        <button onClick={()=>setMesFiltro("todos")} style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid",borderColor:mesFiltro==="todos"?"var(--purple)":"#e5e7eb",background:mesFiltro==="todos"?"var(--purple)":"white",color:mesFiltro==="todos"?"white":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer"}}>Todos</button>
        {meses.map(m=>(
          <button key={m} onClick={()=>setMesFiltro(m)} style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid",borderColor:mesFiltro===m?"var(--purple)":"#e5e7eb",background:mesFiltro===m?"var(--purple)":"white",color:mesFiltro===m?"white":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer"}}>
            {new Date(m+"-15").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"})}
          </button>
        ))}
      </div>

      {/* Accordion por mês */}
      {mesesFiltrados.map(mes=>{
        const sessMes = porMes[mes]||[];
        const mesLabel = new Date(mes+"-15").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
        const recMes = sessMes.filter(s=>s.pagamento==="pago").reduce((a,s)=>a+(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0),0);
        const aberto = accordionAberto[mes]!==false;
        return(
          <div key={mes} style={{background:"white",borderRadius:16,overflow:"hidden",border:"1px solid var(--gray-200)",marginBottom:12}}>
            <button onClick={()=>setAccordionAberto(a=>({...a,[mes]:!aberto}))}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",background:"#f5f0ff",border:"none",cursor:"pointer",borderBottom:aberto?"2px solid var(--purple)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontWeight:700,fontSize:14,color:"var(--purple)",textTransform:"capitalize"}}>{mesLabel}</span>
                <span style={{fontSize:12,color:"var(--text-muted)"}}>{sessMes.length} sessões</span>
                <span style={{fontSize:12,fontWeight:600,color:"#059669"}}>{recMes.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
              </div>
              <Icon name={aberto?"chevron-up":"chevron-down"} size={16}/>
            </button>
            {aberto&&(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"var(--purple)",color:"white"}}>
                      {["","Nº","Data","Presença","Modalidade","V. Sessão","V. Pago","Saldo","Forma Pagto","Data Pagto","Obs"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:600,whiteSpace:"nowrap",fontSize:11}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessMes.map((s,i)=>{
                      const st=STATUS_S[s.status]||STATUS_S.agendado;
                      const isPago=s.pagamento==="pago"; // remarcado mantém pagamento original
                      const vSessao=parseFloat(s.valorSessao)||0;
                      const vPago=parseFloat(s.valorPago)||(isPago?vSessao:0);
                      const saldo=isPago?(vPago-vSessao):0;
                      return(
                        <tr key={s.id} style={{borderBottom:"1px solid var(--gray-100)",background:i%2===0?"white":"#fafafa"}}>
                          <td style={{padding:"5px 6px"}}>
                            <button onClick={()=>setModalExcluir({id:s.id,pacoteId:s.pacoteId,numSessao:s.numSessao||i+1,data:s.data})}
                              style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",padding:"2px"}}>
                              <Icon name="trash-2" size={12}/>
                            </button>
                          </td>
                          <td style={{padding:"6px 10px",fontWeight:700,color:"var(--purple)"}}>{s.numSessao||"—"}</td>
                          <td style={{padding:"6px 10px",whiteSpace:"nowrap"}}>
                            {s.data?new Date(s.data+"T00:00:00").toLocaleDateString("pt-BR"):"—"}
                            {s.remarcada&&<span style={{fontSize:9,color:"#0891b2",marginLeft:4}}>Rem.</span>}
                          </td>
                          <td style={{padding:"6px 10px"}}>
                            <select value={s.status} onChange={e=>atualizarSessao(s.id,{status:e.target.value})}
                              style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 4px",color:st.c,fontWeight:600,background:"white",cursor:"pointer",minWidth:88}}>
                              {Object.entries(STATUS_S).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
                            </select>
                            {(s.status==="cancelado"||s.status==="remarcado")&&(
                              <div style={{marginTop:3}}>
                                <div style={{fontSize:9,color:"#0891b2",marginBottom:2}}>Nova data (sem mov. financeira):</div>
                                <input type="date" defaultValue={s.dataRemarcada||""} onBlur={e=>{if(e.target.value)remarcarSessao(s,e.target.value,s._motivoRemarc||"remarcacao");}}
                                  style={{fontSize:10,border:"1px solid #0891b2",borderRadius:3,padding:"1px 4px",color:"#0891b2",width:105}}/>
                                <select defaultValue={s.motivoRemarcacao||"remarcacao"} onChange={e=>atualizarSessao(s.id,{motivoRemarcacao:e.target.value})}
                                  style={{fontSize:9,marginTop:2,border:"1px solid #cbd5e1",borderRadius:3,padding:"1px 3px",width:105,color:"#374151",cursor:"pointer"}}>
                                  <option value="remarcacao">🔄 Remarcação</option>
                                  <option value="falta">⚠️ Falta</option>
                                  <option value="compensacao">✅ Compensação</option>
                                </select>
                              </div>
                            )}
                          </td>
                          <td style={{padding:"6px 10px"}}>
                            <input defaultValue={s.modalidade||"on-line"} onBlur={e=>atualizarSessao(s.id,{modalidade:e.target.value})}
                              style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 5px",width:62}}/>
                          </td>
                          <td style={{padding:"6px 10px",fontWeight:600,color:"#374151",whiteSpace:"nowrap"}}>
                            {vSessao.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                          </td>
                          <td style={{padding:"6px 10px"}}>
                            <input type="number" defaultValue={s.valorPago||""} key={s.id+"_vpago"} onBlur={e=>atualizarPagamento(s,s.formaPagamento||"",e.target.value)}
                              placeholder="0,00" style={{fontSize:10,border:"1px solid",borderColor:isPago?"#6ee7b7":"#e5e7eb",borderRadius:5,padding:"2px 5px",width:65,color:isPago?"#059669":"#374151",fontWeight:isPago?600:400}}/>
                          </td>
                          <td style={{padding:"6px 10px",fontWeight:600,whiteSpace:"nowrap",color:saldo<0?"#dc2626":saldo>0?"#059669":"#9ca3af",fontSize:11}}>
                            {isPago?(saldo===0?"—":saldo.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})):"—"}
                          </td>
                          <td style={{padding:"6px 10px"}}>
                            <select value={s.formaPagamento||""} onChange={e=>atualizarPagamento(s,e.target.value,s.valorPago||s.valorSessao)}
                              style={{fontSize:10,border:"1px solid",borderColor:isPago?"#6ee7b7":"#e5e7eb",borderRadius:5,padding:"2px 4px",color:isPago?"#059669":"#6b7280",fontWeight:isPago?600:400,cursor:"pointer",background:isPago?"#f0fdf4":"white",minWidth:72}}>
                              <option value="">Pendente</option>
                              {FORMAS.map(f=><option key={f} value={f}>{f}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"6px 10px"}}>
                            <input type="date" defaultValue={s.dataPagamento||""} key={s.id+"_dtpag"} onBlur={e=>atualizarSessao(s.id,{dataPagamento:e.target.value})}
                              style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 4px",width:105}}/>
                          </td>
                          <td style={{padding:"6px 10px"}}>
                            <input defaultValue={s.obs||""} onBlur={e=>atualizarSessao(s.id,{obs:e.target.value})}
                              placeholder="—" style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 5px",width:70}}/>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:"var(--purple-soft)"}}>
                      <td colSpan={5} style={{padding:"8px 10px",fontWeight:700,fontSize:11}}>Total {mesLabel}</td>
                      <td style={{padding:"8px 10px",fontWeight:700,fontSize:11}}>{sessMes.reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
                      <td style={{padding:"8px 10px",fontWeight:700,fontSize:11,color:"#059669"}}>{recMes.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
                      <td colSpan={4}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Modal exclusão */}
      {modalExcluir&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:20}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:400,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:12}}>🗑️</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:8}}>Excluir sessão #{modalExcluir.numSessao}?</div>
            <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>{modalExcluir.data?new Date(modalExcluir.data+"T00:00:00").toLocaleDateString("pt-BR"):""}</p>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              <button className="btn btn-ghost" style={{border:"1.5px solid #e5e7eb",textAlign:"left",padding:"12px 16px"}} onClick={()=>confirmarExclusao("este")}>
                <div style={{fontWeight:600,fontSize:13}}>Só esta sessão</div>
              </button>
              <button className="btn btn-ghost" style={{border:"1.5px solid #fbbf24",textAlign:"left",padding:"12px 16px"}} onClick={()=>confirmarExclusao("daqui")}>
                <div style={{fontWeight:600,fontSize:13,color:"#d97706"}}>Esta e todas as próximas</div>
              </button>
              <button className="btn btn-ghost" style={{border:"1.5px solid #fca5a5",textAlign:"left",padding:"12px 16px"}} onClick={()=>confirmarExclusao("todos")}>
                <div style={{fontWeight:600,fontSize:13,color:"#dc2626"}}>Cancelar todo o pacote</div>
              </button>
            </div>
            <button className="btn btn-ghost" style={{width:"100%"}} onClick={()=>setModalExcluir(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceiroClinica({ user }) {
  const { data:pacientes } = useCollection("clinica_pacientes","nome");
  const [lancamentos, setLancamentos] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0,7));
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear()+"");
  const [periodoCard, setPeriodoCard] = useState("mes");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [pacoteSelecionado, setPacoteSelecionado] = useState(null);
  const [modalExcluir, setModalExcluir] = useState(null);
  const [modalExcluirLanc, setModalExcluirLanc] = useState(null);
  const CATS_DESPESA_CLINICA = ["Aluguel","Condomínio","Energia / Água","Telefone / Internet","Salário Secretária","Contador / Impostos","Marketing","Equipamentos","Materiais","Ferramentas de IA","Cursos e Capacitação","Musicoterapia","Manutenção","Outros"];
  const FORMAS_PAG_CLINICA = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Depósito","Transferência","Outro"];
  const [modalDespesa, setModalDespesa] = useState(false);
  const [formDespesa, setFormDespesa] = useState({descricao:"",categoria:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"});
  const [editandoDespesa, setEditandoDespesa] = useState(null);

  async function salvarDespesaClinica(){
    if(!formDespesa.valor||!formDespesa.data){alert("Preencha valor e data.");return;}
    setSalvando(true);
    try {
      const val=parseFloat(formDespesa.valor);
      const nParc=parseInt(formDespesa.parcelas)||1;
      const base={
        tipo:"despesa",tipo_lancamento:"despesa",
        categoria:formDespesa.categoria||"Outros",
        descricao:formDespesa.descricao||formDespesa.categoria||"Despesa",
        formaPag:formDespesa.formaPag,status:formDespesa.status,
        obs:formDespesa.obs||"",centroCusto:"🏥 Clínica",
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      if(editandoDespesa){
        await db.collection("clinica_lancamentos").doc(editandoDespesa).update({...base,valor:val,data:formDespesa.data});
      } else if(nParc>1){
        const batch=db.batch();
        const [ano,mes,dia]=formDespesa.data.split("-").map(Number);
        for(let i=0;i<nParc;i++){
          let m=mes+i,a=ano; while(m>12){m-=12;a++;}
          const dp=`${a}-${String(m).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
          batch.set(db.collection("clinica_lancamentos").doc(),{...base,valor:val,data:dp,parcela:`${i+1}/${nParc}`,descricao:(formDespesa.descricao||formDespesa.categoria||"Despesa")+` (${i+1}/${nParc})`});
        }
        await batch.commit();
      } else {
        await db.collection("clinica_lancamentos").add({...base,valor:val,data:formDespesa.data});
      }
      setModalDespesa(false);setEditandoDespesa(null);
      setFormDespesa({descricao:"",categoria:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"});
    } catch(e){alert("Erro: "+e.message);}
    setSalvando(false);
  }
  const [aba, setAba] = useState("lancamentos");
  const [buscaPac, setBuscaPac] = useState("");

  const FORMAS = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Depósito","Transferência","Outro"];
  const RECORRENCIAS = ["Semanal (1x/semana)","2x por semana","3x por semana","Quinzenal","Mensal","Sessão única"];
  const DIAS_LABEL = {0:"Dom",1:"Seg",2:"Ter",3:"Qua",4:"Qui",5:"Sex",6:"Sáb"};

  const [formAvulso, setFormAvulso] = useState({pacienteId:"",tipo:"Consulta",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pendente",obs:""});
  // Estado dedicado para edição de despesas
  const CATS_DESPESA = ["Aluguel","Condomínio","Marketing","Salários","Investimentos","Musicoterapia","Ferramentas de IA","Telefone/Internet","Contador","Impostos","Outros"];
  const [formDespesaEdit, setFormDespesaEdit] = useState({descricao:"",categoria:"",valor:"",data:"",formaPag:"",status:"pago",obs:""});
  // ── Painel de higienização ────────────
  const [modalAuditoria, setModalAuditoria] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("tudo"); // "tudo" | "receita" | "despesa"
  const [auditLog, setAuditLog] = useState([]);
  const [auditando, setAuditando] = useState(false);
  const [formPacote, setFormPacote] = useState({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},statusPag:"pendente",formaPag:"",dataPagamento:"",pagamentosExtras:[],obs:"",parceiraId:"",percParceiro:"70"});
  const [parceiras, setParceiras] = useState([]);
  const [modalEditarPacote, setModalEditarPacote] = useState(null); // {pacote}
  const [formEdicaoPacote, setFormEdicaoPacote] = useState({});
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(()=>{
    const u1=db.collection("clinica_lancamentos").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(b.data||"").localeCompare(a.data||""));setLancamentos(docs);},()=>{});
    const u2=db.collection("clinica_pacotes").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));setPacotes(docs);},()=>{});
    const u3=db.collection("clinica_sessoes").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(a.data||"").localeCompare(b.data||""));setSessoes(docs);},()=>{});
    const u4=db.collection("clinica_parceiras").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(a.nome||"").localeCompare(b.nome||""));setParceiras(docs);},()=>{});
    return()=>{u1();u2();u3();u4();};
  },[]);

  const getPacNome = id=>pacientes.find(p=>p.id===id)?.nome||"—";

  // Anos disponíveis
  const anosDisp = [...new Set(lancamentos.map(l=>l.data?.slice(0,4)).filter(Boolean))].sort().reverse();
  if(!anosDisp.includes(anoFiltro)) anosDisp.unshift(anoFiltro);

  // Meses do ano selecionado — sempre Jan (01) → Dez (12)
  const mesAtual = new Date().toISOString().slice(0,7);
  const mesesDisp = Array.from({length:12},(_,i)=>`${anoFiltro}-${String(i+1).padStart(2,"0")}`);

  // Se mesFiltro não pertence ao anoFiltro, corrige para mês atual
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro) ? mesFiltro : mesAtual.startsWith(anoFiltro) ? mesAtual : anoFiltro+"-01";

  // Cards do topo — mês atual do ano selecionado, fixo
  const mesCards = anoFiltro+"-"+new Date().toISOString().slice(5,7);
  const lancMesCards = lancamentos.filter(l=>l.data?.startsWith(mesCards));
  const lancMes = lancamentos.filter(l=>l.data?.startsWith(mesFiltroEfetivo));
  const lancAno = lancamentos.filter(l=>l.data?.startsWith(anoFiltro));
  const lancPeriodo = periodoCard==="mes"?lancMesCards:lancAno;

  // Métricas por período selecionado nos cards
  // Receitas somam, despesas deduzem
  function calcSaldo(lista){
    return lista.reduce((a,l)=>{
      const v = parseFloat(l.valor)||0;
      return l.tipo_lancamento==="despesa" ? a-v : a+v;
    },0);
  }
  function calcReceitas(lista){ return lista.filter(l=>l.tipo_lancamento!=="despesa").reduce((a,l)=>a+(parseFloat(l.valor)||0),0); }
  function calcDespesas(lista){ return lista.filter(l=>l.tipo_lancamento==="despesa").reduce((a,l)=>a+(parseFloat(l.valor)||0),0); }

  const totalRecebidoPeriodo = calcSaldo(lancPeriodo.filter(l=>l.status==="recebido"||l.status==="pago"));
  const totalRecebidoMes = calcSaldo(lancMes.filter(l=>l.status==="recebido"||l.status==="pago"));
  const totalPendente = calcReceitas(lancamentos.filter(l=>l.status==="pendente"&&l.data?.startsWith(anoFiltro)));
  const mesAtualLabel = new Date(mesCards+"-15").toLocaleDateString("pt-BR",{month:"short"});

  // Salvar lançamento avulso — ETAPA 2: UPDATE obrigatório quando editando
  async function salvarAvulso(tipoVenda){
    if(!formAvulso.valor||!formAvulso.data){alert("Valor e data obrigatórios.");return;}
    setSalvando(true);
    try {
      const pac = pacientes.find(p=>p.id===formAvulso.pacienteId);
      const dados = {...formAvulso,valor:parseFloat(formAvulso.valor),pacienteNome:pac?.nome||""};

      if(editando){
        // ── ETAPA 2: GUARD — verifica se o contexto ainda existe antes de salvar
        const docSnap = await db.collection("clinica_lancamentos").doc(editando).get();
        if(!docSnap.exists){
          alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
          setModal(false);setEditando(null);setSalvando(false);return;
        }
        // UPDATE cirúrgico — nunca gera novo INSERT
        await db.collection("clinica_lancamentos").doc(editando).update({
          ...dados,
          _editadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Novo lançamento — INSERT legítimo
        await db.collection("clinica_lancamentos").add({
          ...dados,tipo_lancamento:"avulso",createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
        if(formAvulso.status==="pendente"){
          await dispararNotificacao({
            tipo:"pagamento_pendente",
            titulo:`Pagamento pendente — ${pac?.nome||"Paciente"}`,
            corpo:`R$ ${parseFloat(formAvulso.valor).toFixed(2).replace(".",",")} · ${formAvulso.tipo} · ${formAvulso.data?.split("-").reverse().join("/")||""}`,
            pacienteId: formAvulso.pacienteId
          });
        }
        if(tipoVenda) await registrarComissao({ tipo:"Sessão Avulsa", valor:parseFloat(formAvulso.valor), pacienteNome:pac?.nome||"", tipoVenda });
      }
    } catch(e){
      alert("Erro ao salvar: "+e.message);
    }
    setModal(false);setEditando(null);setFormAvulso({pacienteId:"",tipo:"Consulta",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pendente",obs:""});setSalvando(false);
  }

  function abrirEditar(l){
    // ── ETAPA 2: bifurca entre receita e despesa
    if(l.tipo_lancamento==="despesa"){
      setFormDespesa({descricao:l.descricao||"",categoria:l.categoria||"",valor:l.valor+"",data:l.data||"",formaPag:l.formaPag||"PIX",status:l.status||"pago",obs:l.obs||"",parcelas:"1"});
      setEditandoDespesa(l.id);
      setModalDespesa(true);
    } else {
      setFormAvulso({
        pacienteId: l.pacienteId||"",
        tipo:       l.tipo||"Consulta",
        valor:      l.valor+"",
        data:       l.data||"",
        formaPag:   l.formaPag||"PIX",
        status:     l.status||"pendente",
        obs:        l.obs||"",
        categoria:  l.categoria||"",
        descricao:  l.descricao||"",
      });
      setEditando(l.id);
      setModal("avulso");
    }
  }

  async function excluirLanc(id){
    if(!confirm("Excluir lançamento?"))return;
    await db.collection("clinica_lancamentos").doc(id).delete();
  }

  // ── Salvar edição de DESPESA — UPDATE obrigatório, nunca INSERT
  async function salvarDespesaEdit(){
    if(!formDespesaEdit.valor||!formDespesaEdit.data){alert("Valor e data obrigatórios.");return;}
    if(!editando){alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");return;}
    setSalvando(true);
    try {
      const docSnap = await db.collection("clinica_lancamentos").doc(editando).get();
      if(!docSnap.exists){
        alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
        setModal(false);setEditando(null);setSalvando(false);return;
      }
      await db.collection("clinica_lancamentos").doc(editando).update({
        descricao:   formDespesaEdit.descricao,
        categoria:   formDespesaEdit.categoria,
        valor:       parseFloat(formDespesaEdit.valor),
        data:        formDespesaEdit.data,
        formaPag:    formDespesaEdit.formaPag,
        status:      formDespesaEdit.status,
        obs:         formDespesaEdit.obs,
        tipo_lancamento: "despesa",
        _editadoEm:  firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch(e){ alert("Erro ao salvar: "+e.message); }
    setModal(false);setEditando(null);setSalvando(false);
  }

  // ── ETAPA 3: FONTE ÚNICA DA VERDADE ─────────────────────────────────────
  // Dar baixa em um pacote:
  //   1. Atualiza o documento do pacote (statusPag, valorPago, valorPendente)
  //   2. Marca todas as sessões filhas como pagas em batch
  //   3. Garante que existe EXATAMENTE 1 lançamento vinculado (sem criar duplicata)
  async function marcarPacotePago(pacoteId, formaPag){
    const sessPac = sessoes.filter(s=>s.pacoteId===pacoteId);
    const pacote  = pacotes.find(p=>p.id===pacoteId);
    if(!pacote) return;

    const hoje = new Date().toISOString().slice(0,10);
    const vTotal = parseFloat(pacote.valorTotal||0);
    const extras = pacote.pagamentosExtras||[];
    const totalExtras = extras.reduce((a,pg)=>a+(parseFloat(pg.valor)||0),0);
    const valorPagoFinal = totalExtras > 0 ? totalExtras : vTotal;
    const valorPendenteFinal = Math.max(0, vTotal - valorPagoFinal);

    const batch = db.batch();

    // 1. Atualiza o pacote — recalcula a matriz financeira
    batch.update(db.collection("clinica_pacotes").doc(pacoteId),{
      statusPag: "recebido",
      formaPag,
      dataPagamento: hoje,
      valorPago: valorPagoFinal,
      valorPendente: valorPendenteFinal,
      _sincronizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Atualiza todas as sessões filhas
    const valorPorSessao = sessPac.length > 0
      ? parseFloat((valorPagoFinal/sessPac.length).toFixed(2))
      : (pacote.valorSessao||0);
    sessPac.forEach(s=>{
      batch.update(db.collection("clinica_sessoes").doc(s.id),{
        pagamento:"pago",
        formaPagamento:formaPag,
        dataPagamento:hoje,
        valorPago: parseFloat(s.valorPago||0) > 0 ? s.valorPago : valorPorSessao,
        statusFinanceiro:"pago",
      });
    });

    // 3. Atualiza lançamento existente OU cria exatamente 1 novo (evita duplicata)
    const lancExistente = lancamentos.find(l=>l.pacoteId===pacoteId);
    if(lancExistente){
      batch.update(db.collection("clinica_lancamentos").doc(lancExistente.id),{
        status:"recebido",
        formaPag,
        dataPagamento:hoje,
        valor: valorPagoFinal,
        valorPendente: valorPendenteFinal,
      });
    } else {
      // Gera lançamento apenas se não existe nenhum para este pacote
      const pac = pacientes.find(p=>p.id===pacote.pacienteId);
      const mes = new Date(pacote.dataInicio+"T00:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
      const desc = `${pac?.nome||pacote.pacienteNome||"Paciente"} — Pacote ${pacote.totalSessoes||""} Sessões — ${mes.charAt(0).toUpperCase()+mes.slice(1)}`;
      batch.set(db.collection("clinica_lancamentos").doc(),{
        tipo_lancamento:"pacote", pacoteId,
        pacienteId:pacote.pacienteId, pacienteNome:pac?.nome||pacote.pacienteNome||"",
        tipo:desc, descricao:desc,
        valor:valorPagoFinal, valorPendente:valorPendenteFinal,
        data:hoje, formaPag, status:"recebido", dataPagamento:hoje,
        pagamentosExtras:extras,
        totalSessoes:pacote.totalSessoes, valorSessao:pacote.valorSessao,
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // ── GATILHO ÚNICO + TRAVA DUPLA DE COMISSÃO ──
    // Regra 1: Só dispara se o pacote estava estritamente "pendente" antes desta chamada
    // Regra 2: ID derivado (COM_pacoteId) garante idempotência — retry nunca duplica
    const eraPendente = (pacote.statusPag||"pendente") !== "recebido";
    if(eraPendente) {
      // Detecta se é primeira venda ou recorrente para este paciente
      const tipoVendaDetectado = lancamentos.some(
        l => l.pacienteId===pacote.pacienteId && l.pacoteId!==pacoteId && l.status==="recebido"
      ) ? "recorrente" : "primeira";
      await registrarComissao({
        tipo: "Pacote",
        valor: valorPagoFinal,
        pacienteNome: pacote.pacienteNome || pacientes.find(p=>p.id===pacote.pacienteId)?.nome || "",
        tipoVenda: tipoVendaDetectado,
        pacoteId
      });
    }
  }

  // Geração de datas recorrentes
  function gerarDatas(dataInicio, recorrencia, total, diasSemana){
    if(recorrencia==="Sessão única") return [dataInicio];
    const datas=[];
    if(["Semanal (1x/semana)","Quinzenal","Mensal"].includes(recorrencia)){
      let atual=new Date(dataInicio+"T00:00:00");
      while(datas.length<total){
        datas.push(atual.toISOString().split("T")[0]);
        if(recorrencia==="Semanal (1x/semana)") atual.setDate(atual.getDate()+7);
        else if(recorrencia==="Quinzenal") atual.setDate(atual.getDate()+14);
        else atual.setMonth(atual.getMonth()+1);
      }
      return datas.slice(0,total);
    }
    // 2x ou 3x por semana
    const dias=(diasSemana||[]).map(Number).sort();
    if(!dias.length) return [];
    let atual=new Date(dataInicio+"T00:00:00");
    const fim=new Date(atual);fim.setFullYear(fim.getFullYear()+2);
    while(datas.length<total&&atual<fim){
      if(dias.includes(atual.getDay())) datas.push(atual.toISOString().split("T")[0]);
      atual.setDate(atual.getDate()+1);
    }
    return datas.slice(0,total);
  }

  async function registrarComissao({ tipo, valor, pacienteNome, tipoVenda, pacoteId=null }) {
    // ── TRAVA DE IDEMPOTÊNCIA: ID do documento = "COM_" + pacoteId ──
    // Se o gatilho rodar mais de uma vez (erro de rede, retry), o Firestore
    // fará um UPDATE (merge) e nunca um INSERT duplicado.
    if(!pacoteId){
      console.warn("[registrarComissao] Chamada sem pacoteId — abortando para evitar registro órfão.");
      return;
    }
    const cfg = await getConfigFin();
    const percNum = tipoVenda === "primeira" ? (parseFloat(cfg.percPrimeira)||10) : (parseFloat(cfg.percRecorrente)||5);
    const perc = percNum/100;
    const valorComissao = parseFloat((valor * perc).toFixed(2));
    const hoje = new Date();
    const mesRef = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}`;
    // ID derivado do pacote → idempotente
    const docId = "COM_" + pacoteId;
    await db.collection("vendas_secretaria").doc(docId).set({
      tipo, tipoVenda, perc: perc*100,
      valorBase: valor, valorComissao,
      pacienteNome, mesRef,
      pacoteId,
      status: "pendente",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // Se não existia → cria com createdAt; se já existia → atualiza sem criar novo
    await db.collection("vendas_secretaria").doc(docId).set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  async function salvarPacote(tipoVenda){
    const {pacienteId,totalSessoes,valorSessao,recorrencia,dataInicio,horario,diasSemana,horariosPorDia,obs}=formPacote;
    if(!pacienteId||!totalSessoes||!dataInicio){alert("Paciente, nº de sessões e data de início obrigatórios.");return;}
    const needDias=["2x por semana","3x por semana"].includes(recorrencia);
    if(needDias&&(!diasSemana||diasSemana.length===0)){alert("Selecione os dias da semana.");return;}
    const eParceria=(formPacote.tipoAtendimento||"particular")==="parceria";
    if(eParceria&&!formPacote.parceiraId){alert("Selecione a parceira para a venda em parceria.");return;}
    setSalvando(true);
    try {
    const pac=pacientes.find(p=>p.id===pacienteId);
    const total=parseInt(totalSessoes)||1;
    const vSessao=parseFloat(valorSessao)||0;
    const vTotal=vSessao*total;
    const datas=gerarDatas(dataInicio,recorrencia,total,diasSemana);
    const parcSel=eParceria?parceiras.find(p=>p.id===formPacote.parceiraId):null;
    const percParc=eParceria?(parseFloat(formPacote.percParceiro)||70):0;

    // Cria pacote
    const pacRef=await db.collection("clinica_pacotes").add({
      pacienteId,pacienteNome:pac?.nome||"",totalSessoes:total,valorSessao:vSessao,valorTotal:vTotal,
      recorrencia,dataInicio,horario,diasSemana:diasSemana||[],horariosPorDia:horariosPorDia||{},obs,
      tipoAtendimento:formPacote.tipoAtendimento||"particular",
      parceiraId:eParceria?formPacote.parceiraId:null,
      parceiraNome:eParceria?(parcSel?.nome||""):null,
      percParceiro:eParceria?percParc:null,
      statusPag:formPacote.statusPag||"pendente",
      formaPag:formPacote.formaPag||"",
      dataPagamento:formPacote.dataPagamento||"",
      pagamentosExtras:formPacote.pagamentosExtras||[],
      status:"ativo",createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });

    // Cria lançamento financeiro do pacote
    const mesInicioPacote = new Date(dataInicio+"T00:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
    const nomePacote = `Pacote ${total} Sessões`;
    const descricaoLanc = `${pac?.nome||"Paciente"} — ${nomePacote} — ${mesInicioPacote.charAt(0).toUpperCase()+mesInicioPacote.slice(1)}`;
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento:"pacote",pacoteId:pacRef.id,
      pacienteId,pacienteNome:pac?.nome||"",
      tipo: descricaoLanc,
      descricao: descricaoLanc,
      valor:vTotal,data:dataInicio,
      formaPag:formPacote.formaPag||"",
      status:formPacote.statusPag||"pendente",
      dataPagamento:formPacote.dataPagamento||"",
      pagamentosExtras:formPacote.pagamentosExtras||[],
      obs,
      totalSessoes:total,valorSessao:vSessao,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });

    // Registra comissão da secretária APENAS se o pagamento já entrou no caixa
    // Se pendente, o gatilho será disparado exclusivamente em marcarPacotePago()
    const pagoImediato = (formPacote.statusPag||"pendente") === "recebido";
    if(tipoVenda && pagoImediato) {
      await registrarComissao({ tipo:"Pacote", valor:vTotal, pacienteNome:pac?.nome||"", tipoVenda, pacoteId:pacRef.id });
    }

    // Registra repasse da parceira → coleção exclusiva repasses_parcerias
    // ID derivado = "REP_" + pacoteId → idempotente
    if(eParceria&&parcSel){
      const vParceira=parseFloat((vTotal*percParc/100).toFixed(2));
      const mesRefParc=new Date().toISOString().slice(0,7);
      const repDocId = "REP_" + pacRef.id;
      await db.collection("repasses_parcerias").doc(repDocId).set({
        tipo:"Parceria — Repasse", tipoVenda:null, perc:percParc,
        valorBase:vTotal, valorComissao:vParceira,
        pacienteNome:pac?.nome||"",
        responsavel:parcSel.nome||"Parceira",
        parceiraId:parcSel.id,
        mesRef:mesRefParc, pacoteId:pacRef.id,
        status:"pendente",
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // ── E-MAIL AUTOMÁTICO via extensão ext-firestore-send-email ──────
    // Só envia se o paciente tiver e-mail cadastrado
    const emailPaciente = pac?.email || pac?.emailPaciente || "";
    if(emailPaciente) {
      const dataFmtEmail = new Date(dataInicio+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
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
<p style="font-size:16px;color:#374151;line-height:1.6">Olá, <strong>${pac?.nome||"Paciente"}</strong>! 💜<br><br>
Seu pacote de sessões de psicoterapia foi confirmado com sucesso.</p>
<div class="box"><h3 style="margin:0 0 12px;color:#7B00C4;font-size:14px">📋 Detalhes do pacote</h3>
<div class="row"><span class="label">Início</span><span class="val">${dataFmtEmail}</span></div>
<div class="row"><span class="label">Total de sessões</span><span class="val">${total} sessão(ões)</span></div>
${horario?`<div class="row"><span class="label">Horário</span><span class="val">${horario}</span></div>`:""}
<div class="row"><span class="label">Recorrência</span><span class="val">${recorrencia||"A combinar"}</span></div>
<div class="row"><span class="label">Valor total</span><span class="val">R$ ${vTotal.toFixed(2).replace(".",",")}</span></div>
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
    const jaPago = (formPacote.statusPag||"pendente")==="recebido";
    const batch=db.batch();
    datas.forEach((data,i)=>{
      const ref=db.collection("clinica_sessoes").doc();
      const dia=new Date(data+"T00:00:00").getDay().toString();
      const horaDia=(horariosPorDia||{})[dia]||horario;
      batch.set(ref,{
        pacienteId,pacienteNome:pac?.nome||"",data,hora:horaDia,
        duracao:"50",tipo:"Psicoterapia",status:"agendado",
        numSessao:i+1,pacoteId:pacRef.id,valorSessao:vSessao,
        pagamento:jaPago?"pago":"pendente",
        valorPago:jaPago?vSessao:0,
        formaPagamento:formPacote.formaPag||"",
        dataPagamento:jaPago?(formPacote.dataPagamento||new Date().toISOString().slice(0,10)):"",
        obs:"",
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    // Social: lança comissão estagiária automaticamente
    if((formPacote.tipoAtendimento||"particular")==="social"){
      const hoje = new Date().toISOString().slice(0,10);
      const mesRef = hoje.slice(0,7);
      const vSupervisao = parseFloat(formPacote.valorSupervisaoSocial||40);
      const vEstagiaria = parseFloat(formPacote.valorEstagiariaSocial||20);
      const snapEst = await db.collection("clinica_parceiras").where("tipo","==","estagiaria").limit(1).get();
      const nomeEst = !snapEst.empty ? snapEst.docs[0].data().nome : "Estagiária";
      const batchSoc = db.batch();
      batchSoc.set(db.collection("clinica_lancamentos").doc(),{
        tipo_lancamento:"social",
        tipo:`${pac?.nome||""} — Projeto Social`,
        descricao:`${pac?.nome||""} — Projeto Social`,
        pacienteNome:pac?.nome||"",
        valor:vSupervisao, data:dataInicio, mesRef,
        formaPag:formPacote.formaPag||"PIX",
        status:formPacote.statusPag||"pendente",
        origem:"pacote-social",
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      });
      batchSoc.set(db.collection("repasses_parcerias").doc(),{
        tipo:"Social — Estagiária",
        tipoVenda:"primeira", perc:0,
        valorBase:vSupervisao, valorComissao:vEstagiaria,
        pacienteNome:pac?.nome||"",
        responsavel:nomeEst,
        mesRef, status:"pendente",
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      });
      await batchSoc.commit();
    }

    setModal(false);setFormPacote({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},statusPag:"pendente",formaPag:"",dataPagamento:"",pagamentosExtras:[],obs:"",tipoAtendimento:"particular",valorSupervisaoSocial:"40",valorEstagiariaSocial:"20",parceiraId:"",percParceiro:"70"});
    alert(`✅ Pacote criado! ${datas.length} sessões geradas na agenda.`);
    } catch(e) {
      console.error("Erro ao criar pacote:", e);
      alert("⚠️ Erro ao criar pacote: "+e.message+"\n\nVerifique se o pacote e as sessões foram criados corretamente na aba Pacotes & Sessões e na Agenda antes de tentar novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarSessao(id,campos){ await db.collection("clinica_sessoes").doc(id).update(campos); }

  // ── ETAPA 3: Remarcação/Compensação ─────────────────────────────────────
  // Altera APENAS data + status. Jamais toca em valor, pagamento ou lançamentos.
  // Motivo: remarcação por falta ou compensação não gera movimentação financeira.
  async function remarcarSessao(s, novaData, motivo="remarcacao"){
    if(!novaData) return;
    try {
      await db.collection("clinica_sessoes").doc(s.id).update({
        data: novaData,
        status: "remarcado",
        remarcada: true,
        dataRemarcada: novaData,
        dataOriginal: s.dataOriginal||s.data,
        motivoRemarcacao: motivo,           // "remarcacao" | "falta" | "compensacao"
        // NÃO altera: pagamento, valorPago, valorSessao, dataPagamento, pacoteId
      });
    } catch(e){
      console.error("Erro ao remarcar sessão:", e);
      alert("Erro ao remarcar: "+e.message);
    }
  }

  async function confirmarExclusao(tipo){
    if(!modalExcluir) return;
    const {id, pacoteId, numSessao} = modalExcluir;
    try {
      if(tipo==="este"){
        await db.collection("clinica_sessoes").doc(id).delete();
      } else if(tipo==="daqui"){
        const fut = sessoes.filter(s=>s.pacoteId===pacoteId&&(s.numSessao||0)>=(numSessao||0));
        const b = db.batch();
        fut.forEach(s=>b.delete(db.collection("clinica_sessoes").doc(s.id)));
        await b.commit();
      } else {
        // Cancelar todo o pacote — exclusão em cascata via query direta (evita dados órfãos)
        const [snapSess, snapLanc] = await Promise.all([
          db.collection("clinica_sessoes").where("pacoteId","==",pacoteId).get(),
          db.collection("clinica_lancamentos").where("pacoteId","==",pacoteId).get(),
        ]);
        const b = db.batch();
        snapSess.docs.forEach(d=>b.delete(d.ref));
        snapLanc.docs.forEach(d=>b.delete(d.ref));
        b.delete(db.collection("clinica_pacotes").doc(pacoteId));
        await b.commit();
        if(typeof setPacoteSelecionado==="function") setPacoteSelecionado(null);
      }
    } catch(e){
      console.error("Erro ao excluir sessão/pacote:", e);
      alert("Erro ao excluir: " + e.message);
    }
    setModalExcluir(null);
  }


  if(pacoteSelecionado){
    // Modo ver sessões (id__sessoes)
    if(pacoteSelecionado.endsWith("__sessoes")){
      const pacoteId = pacoteSelecionado.replace("__sessoes","");
      return <RelatorioFrequencia
        pacienteId={null}
        pacoteId={pacoteId}
        pacientes={pacientes}
        sessoes={sessoes}
        pacotes={pacotes}
        lancamentos={lancamentos}
        FORMAS={FORMAS}
        onVoltar={()=>setPacoteSelecionado(null)}
      />;
    }
    // Modo editar pacote individual (id__pacote) — abre modal de edição
    if(pacoteSelecionado.endsWith("__pacote")){
      const pacoteId = pacoteSelecionado.replace("__pacote","");
      const pacoteAlvo = pacotes.find(p=>p.id===pacoteId);
      if(pacoteAlvo && !modalEditarPacote){
        setModalEditarPacote(pacoteAlvo);
        setFormEdicaoPacote({
          pacienteId: pacoteAlvo.pacienteId||"",
          totalSessoes: pacoteAlvo.totalSessoes||"",
          valorSessao: pacoteAlvo.valorSessao||"",
          recorrencia: pacoteAlvo.recorrencia||"Semanal (1x/semana)",
          dataInicio: pacoteAlvo.dataInicio||"",
          horario: pacoteAlvo.horario||"09:00",
          statusPag: pacoteAlvo.statusPag||"pendente",
          formaPag: pacoteAlvo.formaPag||"",
          dataPagamento: pacoteAlvo.dataPagamento||"",
          pagamentosExtras: pacoteAlvo.pagamentosExtras||[],
          obs: pacoteAlvo.obs||"",
        });
        setPacoteSelecionado(null);
      }
    }
    // Modo controle geral do paciente (pacienteId)
    return <RelatorioFrequencia
      pacienteId={pacoteSelecionado}
      pacoteId={null}
      pacientes={pacientes}
      sessoes={sessoes}
      pacotes={pacotes}
      lancamentos={lancamentos}
      FORMAS={FORMAS}
      onVoltar={()=>setPacoteSelecionado(null)}
    />;
  }

  // Função salvar edição do pacote — v2 (sync financeiro + pagamentosExtras + try/catch robusto)
  async function recalcularDatasPacote() {
    if(!modalEditarPacote) return;
    const f = formEdicaoPacote;
    if(!f.dataInicio){alert("Defina a data de início antes de recalcular.");return;}
    if(!confirm("Isso vai REESCREVER as datas de todas as sessões deste pacote a partir da nova data de início, mantendo a recorrência atual.\n\nSessões já realizadas ou pagas também terão a data alterada. Confirma?")) return;
    setSalvandoEdicao(true);
    try {
      const snapSess = await db.collection("clinica_sessoes")
        .where("pacoteId","==",modalEditarPacote.id).get();
      const sessDoPacote = snapSess.docs
        .map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>(a.numSessao||0)-(b.numSessao||0) || (a.data||"").localeCompare(b.data||""));
      const total = sessDoPacote.length || parseInt(f.totalSessoes)||1;
      const diasSemana = modalEditarPacote.diasSemana||[];
      const novasDatas = gerarDatas(f.dataInicio, f.recorrencia, total, diasSemana);
      const batch = db.batch();
      sessDoPacote.forEach((s,idx)=>{
        if(novasDatas[idx]){
          batch.update(db.collection("clinica_sessoes").doc(s.id), {data: novasDatas[idx]});
        }
      });
      await batch.commit();
      alert(`✓ ${novasDatas.length} sessão(ões) realinhada(s) a partir de ${new Date(f.dataInicio+"T00:00:00").toLocaleDateString("pt-BR")}.`);
    } catch(e){
      console.error("Erro recalcularDatasPacote:", e);
      alert("Erro ao recalcular datas: "+e.message);
    }
    setSalvandoEdicao(false);
  }

  async function salvarEdicaoPacote() {
    if(!modalEditarPacote) return;
    setSalvandoEdicao(true);
    try {
      const f = formEdicaoPacote;
      const jaPago = (f.statusPag||"pendente")==="recebido";
      const novoTotalSessoes = parseInt(f.totalSessoes)||modalEditarPacote.totalSessoes;
      const novoValorSessao = parseFloat(f.valorSessao)||modalEditarPacote.valorSessao;
      const novoValorTotal = novoTotalSessoes * novoValorSessao;
      const dataPagFinal = jaPago ? (f.dataPagamento||new Date().toISOString().slice(0,10)) : "";

      // Calcula valorPago por sessão distribuindo pagamentosExtras proporcionalmente
      const extras = f.pagamentosExtras||[];
      const totalExtras = extras.reduce((a,pg)=>a+(parseFloat(pg.valor)||0),0);
      const totalPagoRef = jaPago ? (totalExtras > 0 ? totalExtras : novoValorTotal) : 0;
      const valorPagoPorSessao = novoTotalSessoes > 0
        ? parseFloat((totalPagoRef / novoTotalSessoes).toFixed(2))
        : novoValorSessao;

      // 1. Atualiza o documento do pacote
      await db.collection("clinica_pacotes").doc(modalEditarPacote.id).update({
        totalSessoes: novoTotalSessoes,
        valorSessao: novoValorSessao,
        valorTotal: novoValorTotal,
        recorrencia: f.recorrencia,
        dataInicio: f.dataInicio,
        horario: f.horario,
        statusPag: f.statusPag,
        formaPag: f.formaPag||"",
        dataPagamento: dataPagFinal,
        pagamentosExtras: extras,
        obs: f.obs||"",
      });

      // 2. Atualiza lançamento financeiro vinculado via query direta
      try {
        const snapLanc = await db.collection("clinica_lancamentos")
          .where("pacoteId","==",modalEditarPacote.id).get();
        if(!snapLanc.empty){
          const pacEd = pacientes.find(p=>p.id===(modalEditarPacote.pacienteId||""));
          const mesEd = f.dataInicio
            ? new Date(f.dataInicio+"T00:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})
            : "";
          const nomePacEd = `Pacote ${novoTotalSessoes} Sessões`;
          const descEd = pacEd
            ? `${pacEd.nome} — ${nomePacEd} — ${mesEd.charAt(0).toUpperCase()+mesEd.slice(1)}`
            : snapLanc.docs[0].data().tipo||snapLanc.docs[0].data().descricao||nomePacEd;
          await snapLanc.docs[0].ref.update({
            valor: novoValorTotal,
            totalSessoes: novoTotalSessoes,
            valorSessao: novoValorSessao,
            status: f.statusPag||"pendente",
            formaPag: f.formaPag||"",
            dataPagamento: dataPagFinal,
            pagamentosExtras: extras,
            obs: f.obs||"",
            tipo: descEd,
            descricao: descEd,
          });
        }
      } catch(eLanc){ console.warn("Aviso: lançamento não atualizado →", eLanc.message); }

      // 3. Atualiza sessões filhas em batch
      const snapSess = await db.collection("clinica_sessoes")
        .where("pacoteId","==",modalEditarPacote.id).get();
      const sessDoPacote = snapSess.docs
        .map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>(a.data||"").localeCompare(b.data||""));

      if(sessDoPacote.length > 0){
        const batch = db.batch();
        sessDoPacote.forEach((s,idx)=>{
          if(idx >= novoTotalSessoes){
            batch.delete(db.collection("clinica_sessoes").doc(s.id));
          } else {
            const campos = {
              valorSessao: novoValorSessao,
              hora: f.horario||s.hora||"",
              recorrencia: f.recorrencia||s.recorrencia||"",
            };
            if(jaPago){
              const vPagoAtual = parseFloat(s.valorPago)||0;
              campos.pagamento = "pago";
              campos.formaPagamento = f.formaPag||s.formaPagamento||"";
              campos.dataPagamento = dataPagFinal||s.dataPagamento||"";
              campos.valorPago = vPagoAtual > 0 ? vPagoAtual : valorPagoPorSessao;
            } else if(f.statusPag === "pendente" && s.pagamento === "pago"){
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
    } catch(e){
      console.error("Erro salvarEdicaoPacote:", e);
      alert("Erro ao salvar pacote: " + e.message);
    }
    setSalvandoEdicao(false);
  }

  // Métricas
  const totalRecebido=lancamentos.filter(l=>l.status==="recebido").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  async function executarHigienizacao() {
    if(!confirm("⚠️ Confirmar higienização completa?\n\n• Lançamentos de sessão órfãos (de pacotes) serão deletados\n• Duplicatas de Ronei e Heitor serão removidas\n• Lançamentos Sem Nome viram Despesas Administrativas\n\nEssa ação não pode ser desfeita.")) return;
    setAuditando(true);
    const log = [];
    const mesRef = "2026-05";

    // ── PASSO 0: Maior fonte de duplicata — sessões de pacote gerando lançamento próprio
    const ro = await deletarLancamentosOrfaosDeSessao();
    log.push(`Sessões órfãs de pacote: ${ro.ok ? `${ro.deletados} lançamento(s) deletado(s)` : "Erro — "+ro.erro}`);

    // ── PASSO 1: Duplicatas por paciente
    const snapRonei  = await db.collection("clinica_pacientes").where("nome",">=","Ronei").where("nome","<=","Ronei").limit(1).get();
    const snapHeitor = await db.collection("clinica_pacientes").where("nome",">=","Heitor").where("nome","<=","Heitor").limit(1).get();

    if(!snapRonei.empty){
      const r = await deletarDuplicatasPaciente(snapRonei.docs[0].id, mesRef);
      log.push(`Ronei: ${r.ok ? `${r.deletados} duplicata(s) removida(s)` : "Erro — "+r.erro}`);
    } else { log.push("Ronei: paciente não encontrado"); }

    if(!snapHeitor.empty){
      const r = await deletarDuplicatasPaciente(snapHeitor.docs[0].id, mesRef);
      log.push(`Heitor: ${r.ok ? `${r.deletados} duplicata(s) removida(s)` : "Erro — "+r.erro}`);
    } else { log.push("Heitor: paciente não encontrado"); }

    // ── PASSO 2: Categorizar Sem Nome
    const rc = await categorizarSemNome(mesRef);
    log.push(`Sem Nome: ${rc.ok ? `${rc.atualizados} lançamento(s) categorizados` : "Erro — "+rc.erro}`);

    setAuditLog(log);
    setAuditando(false);
  }

  return(
    <div>
      {/* ── Modal Auditoria / Higienização Etapa 1 ── */}

      {modalEditarPacote&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:20}} onClick={e=>{if(e.target===e.currentTarget)setModalEditarPacote(null);}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{margin:0,color:"var(--purple)"}}>✏️ Editar Pacote</h3>
              <button onClick={()=>setModalEditarPacote(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"var(--gray-400)"}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div className="form-group"><label className="form-label">Nº de Sessões</label>
                <input className="form-input" type="number" value={formEdicaoPacote.totalSessoes||""} onChange={e=>setFormEdicaoPacote({...formEdicaoPacote,totalSessoes:e.target.value})}/>
              </div>
              <div className="form-group"><label className="form-label">Valor por Sessão (R$)</label>
                <input className="form-input" type="number" value={formEdicaoPacote.valorSessao||""} onChange={e=>setFormEdicaoPacote({...formEdicaoPacote,valorSessao:e.target.value})}/>
              </div>
              <div className="form-group"><label className="form-label">Data de Início</label>
                <input className="form-input" type="date" value={formEdicaoPacote.dataInicio||""} onChange={e=>setFormEdicaoPacote({...formEdicaoPacote,dataInicio:e.target.value})}/>
                {formEdicaoPacote.dataInicio!==modalEditarPacote.dataInicio&&(
                  <div style={{marginTop:6,fontSize:11,color:"#d97706",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"6px 10px",lineHeight:1.5}}>
                    ⚠️ Mudar a data de início <strong>não move</strong> as sessões já criadas — elas continuam nas datas originais. Use o botão abaixo se quiser realinhar todas as sessões a partir desta nova data.
                    <button type="button" onClick={recalcularDatasPacote} disabled={salvandoEdicao}
                      style={{display:"block",marginTop:8,background:"#f59e0b",color:"white",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                      🔄 Recalcular datas das sessões
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group"><label className="form-label">Horário</label>
                <input className="form-input" type="time" value={formEdicaoPacote.horario||""} onChange={e=>setFormEdicaoPacote({...formEdicaoPacote,horario:e.target.value})}/>
              </div>
              <div className="form-group"><label className="form-label">Recorrência</label>
                <select className="form-input" value={formEdicaoPacote.recorrencia||""} onChange={e=>setFormEdicaoPacote({...formEdicaoPacote,recorrencia:e.target.value})}>
                  {RECORRENCIAS.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Total do Pacote</label>
                <input className="form-input" readOnly value={"R$ "+((parseFloat(formEdicaoPacote.valorSessao||0)*parseInt(formEdicaoPacote.totalSessoes||0))||0).toFixed(2).replace(".",",")} style={{background:"#f9fafb",color:"var(--text-muted)"}}/>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Status do Pagamento</label>
                <div style={{display:"flex",gap:8}}>
                  {[["pendente","Pendente","#d97706"],["recebido","✓ Recebido","#059669"]].map(([v,l,cor])=>(
                    <button key={v} type="button" onClick={()=>setFormEdicaoPacote({...formEdicaoPacote,statusPag:v})}
                      style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid",cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"var(--font-body)",
                        borderColor:(formEdicaoPacote.statusPag||"pendente")===v?cor:"#e5e7eb",
                        background:(formEdicaoPacote.statusPag||"pendente")===v?cor+"15":"white",
                        color:(formEdicaoPacote.statusPag||"pendente")===v?cor:"#6b7280"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group"><label className="form-label">Forma de Pagamento Principal</label>
                  <select className="form-input" value={formEdicaoPacote.formaPag||""} onChange={e=>setFormEdicaoPacote({...formEdicaoPacote,formaPag:e.target.value})}>
                    <option value="">Selecionar...</option>
                    {FORMAS.map(f=><option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Data do Pagamento</label>
                  <input className="form-input" type="date" value={formEdicaoPacote.dataPagamento||""} onChange={e=>setFormEdicaoPacote({...formEdicaoPacote,dataPagamento:e.target.value})}/>
                </div>
                <div className="form-group" style={{gridColumn:"1/-1"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <label className="form-label" style={{margin:0}}>Formas de pagamento (PIX, cartão, dinheiro em datas diferentes)</label>
                    <button type="button" style={{fontSize:12,color:"#7B00C4",background:"#f3e6ff",border:"1px solid #d9b3f5",borderRadius:6,padding:"4px 12px",cursor:"pointer"}}
                      onClick={()=>setFormEdicaoPacote({...formEdicaoPacote,pagamentosExtras:[...(formEdicaoPacote.pagamentosExtras||[]),{forma:"",valor:"",data:new Date().toISOString().slice(0,10)}]})}>
                      + Adicionar forma
                    </button>
                  </div>
                  {(formEdicaoPacote.pagamentosExtras||[]).length===0&&(
                    <div style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic",padding:"6px 0"}}>Clique em "+ Adicionar forma" para registrar pagamentos parciais ou múltiplas formas.</div>
                  )}
                  {(formEdicaoPacote.pagamentosExtras||[]).map((pg,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:6,marginBottom:6,alignItems:"center"}}>
                      <select className="form-input" style={{fontSize:12}} value={pg.forma} onChange={e=>{const p=[...(formEdicaoPacote.pagamentosExtras||[])];p[i]={...p[i],forma:e.target.value};setFormEdicaoPacote({...formEdicaoPacote,pagamentosExtras:p});}}>
                        <option value="">Forma...</option>{FORMAS.map(f=><option key={f}>{f}</option>)}
                      </select>
                      <input className="form-input" style={{fontSize:12}} type="number" placeholder="Valor R$" value={pg.valor} onChange={e=>{const p=[...(formEdicaoPacote.pagamentosExtras||[])];p[i]={...p[i],valor:e.target.value};setFormEdicaoPacote({...formEdicaoPacote,pagamentosExtras:p});}}/>
                      <input className="form-input" style={{fontSize:12}} type="date" value={pg.data} onChange={e=>{const p=[...(formEdicaoPacote.pagamentosExtras||[])];p[i]={...p[i],data:e.target.value};setFormEdicaoPacote({...formEdicaoPacote,pagamentosExtras:p});}}/>
                      <button type="button" style={{color:"#dc2626",background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"0 4px"}} onClick={()=>{const p=[...(formEdicaoPacote.pagamentosExtras||[])];p.splice(i,1);setFormEdicaoPacote({...formEdicaoPacote,pagamentosExtras:p});}}>✕</button>
                    </div>
                  ))}
                </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}><label className="form-label">Observações</label>
                <textarea className="form-input" rows={2} value={formEdicaoPacote.obs||""} onChange={e=>setFormEdicaoPacote({...formEdicaoPacote,obs:e.target.value})} placeholder="Notas sobre o pacote..."/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <button className="btn btn-ghost" onClick={()=>setModalEditarPacote(null)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvarEdicaoPacote} disabled={salvandoEdicao}>
                {salvandoEdicao?"Salvando...":"💾 Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Financeiro da Clínica</div>
          <div className="page-subtitle">Lançamentos, pacotes e controle de sessões</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn btn-ghost" style={{color:"#dc2626",border:"1px solid #fca5a5",display:"flex",alignItems:"center",gap:6}}
            onClick={()=>{setModalDespesa(true);setEditandoDespesa(null);setFormDespesa({descricao:"",categoria:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"});}}>
            <Icon name="minus-circle" size={16}/> Nova Despesa
          </button>
          <button className="btn btn-purple" style={{display:"flex",alignItems:"center",gap:6}} onClick={()=>setModal("escolha")}><Icon name="plus" size={16}/> Novo Lançamento</button>
        </div>
      </div>

      {/* Seletor de Ano */}
      <div style={{display:"flex",gap:6,marginBottom:14,alignItems:"center"}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",flexShrink:0}}>Ano:</span>
        {(()=>{
          const anoAtualNum = new Date().getFullYear();
          const anosExist = [...new Set(lancamentos.map(l=>l.data?.slice(0,4)).filter(Boolean))].map(Number);
          // Sempre mostra: todos os anos com dados + ano atual + 1 ano antes e depois do atual
          const anosSet = new Set([...anosExist, anoAtualNum-1, anoAtualNum, anoAtualNum+1]);
          // Se houver dados fora dessa janela, eles já estão incluídos via anosExist
          const anos = [...anosSet].sort().map(String);
          return anos.map(a=>(
            <button key={a} onClick={()=>{
              setAnoFiltro(a);
              setMesFiltro(a===String(anoAtualNum)?mesAtual:a+"-01");
            }}
              style={{padding:"5px 16px",borderRadius:20,border:"1.5px solid",
                borderColor:anoFiltro===a?"var(--purple)":"#e5e7eb",
                background:anoFiltro===a?"var(--purple)":"white",
                color:anoFiltro===a?"white":"#6b7280",
                fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {a}{a===String(anoAtualNum)&&<span style={{marginLeft:3,fontSize:9}}>●</span>}
            </button>
          ));
        })()}
      </div>

      {/* Métricas clicáveis */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
        {/* Card Recebido — clicável mês/ano */}
        <div onClick={()=>setPeriodoCard(p=>p==="mes"?"ano":"mes")}
          style={{background:totalRecebidoPeriodo>=0?"#d1fae5":"#fee2e2",borderRadius:12,padding:"14px 16px",textAlign:"center",cursor:"pointer",border:"1.5px solid",borderColor:totalRecebidoPeriodo>=0?"#6ee7b7":"#fca5a5",transition:"all .2s",position:"relative"}}>
          <div style={{position:"absolute",top:6,right:8,fontSize:10,color:totalRecebidoPeriodo>=0?"#059669":"#dc2626",fontWeight:600,background:"white",borderRadius:10,padding:"1px 6px"}}>
            {periodoCard==="mes"?"mês ↕":"ano ↕"}
          </div>
          <div style={{fontSize:20,fontWeight:800,color:totalRecebidoPeriodo>=0?"#059669":"#dc2626"}}>{totalRecebidoPeriodo.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
          <div style={{fontSize:12,color:totalRecebidoPeriodo>=0?"#059669":"#dc2626",fontWeight:500,marginTop:2}}>
            Saldo ({periodoCard==="mes"?mesAtualLabel:anoFiltro})
          </div>
          <div style={{fontSize:10,color:"#6b7280",marginTop:4}}>
            +{calcReceitas(lancPeriodo).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} / -{calcDespesas(lancPeriodo).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
          </div>
        </div>
        {/* Card Pendente */}
        <div style={{background:"#fef3c7",borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:800,color:"#d97706"}}>{totalPendente.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
          <div style={{fontSize:12,color:"#d97706",fontWeight:500,marginTop:2}}>Pendente ({anoFiltro})</div>
        </div>
        {/* Card Pacotes */}
        <div style={{background:"var(--purple-soft)",borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:800,color:"var(--purple)"}}>{pacotes.filter(p=>p.status==="ativo").length}</div>
          <div style={{fontSize:12,color:"var(--purple)",fontWeight:500,marginTop:2}}>Pacotes ativos</div>
        </div>
        {/* Card Lançamentos */}
        <div style={{background:"#e0f2fe",borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:800,color:"#0891b2"}}>{lancPeriodo.length}</div>
          <div style={{fontSize:12,color:"#0891b2",fontWeight:500,marginTop:2}}>Lançamentos ({periodoCard==="mes"?new Date(mesFiltro+"-15").toLocaleDateString("pt-BR",{month:"short"}):anoFiltro})</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid var(--gray-200)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",flexShrink:0}}>
        {[["lancamentos","Lançamentos","dollar-sign"],["pacotes","Pacotes & Sessões","package"],["acompanhamento","Acompanhamento Geral","users"],["comissoes","Comissões","percent"]].map(([id,lbl,ic])=>(
          <button key={id} onClick={()=>setAba(id)} style={{padding:"10px 20px",border:"none",background:"none",cursor:"pointer",fontSize:14,color:aba===id?"var(--purple)":"var(--gray-600)",borderBottom:aba===id?"2px solid var(--purple)":"2px solid transparent",fontWeight:aba===id?600:400,fontFamily:"var(--font-body)",marginBottom:-1,display:"flex",alignItems:"center",gap:6}}>
            <Icon name={ic} size={15}/>{lbl}
          </button>
        ))}
        {/* Botão de higienização — Etapa 1 */}

        {(()=>{ return null; })()}
      </div>

      {/* ABA LANÇAMENTOS */}
      {aba==="lancamentos"&&(
        <div>
          {/* Tabs filtro tipo — Tudo / Receitas / Despesas */}
      {aba==="lancamentos"&&(
        <div style={{display:"flex",gap:6,marginBottom:16,background:"var(--gray-50)",padding:6,borderRadius:12,width:"fit-content"}}>
          {[["tudo","📊 Tudo"],["receita","💰 Receitas"],["despesa","💸 Despesas"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFiltroTipo(v)}
              style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"var(--font-body)",fontSize:13,fontWeight:600,
                background:filtroTipo===v?"white":"transparent",
                color:filtroTipo===v?(v==="receita"?"#059669":v==="despesa"?"#dc2626":"#7B00C4"):"#6b7280",
                boxShadow:filtroTipo===v?"0 1px 4px rgba(0,0,0,.1)":"none",transition:".15s"}}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Filtro mês — jan→dez com setas */}
          <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)",flexShrink:0}}>Mês:</span>
            <button onClick={()=>{
              const idx=mesesDisp.indexOf(mesFiltroEfetivo);
              if(idx>0) setMesFiltro(mesesDisp[idx-1]);
            }} style={{background:"var(--purple)",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"white",fontSize:16,fontWeight:700}}>‹</button>
            <div style={{display:"flex",gap:6,overflowX:"hidden",flex:1}}>
              {mesesDisp.map(m=>{
                const isAtual=m===mesAtual;
                const isSel=m===mesFiltroEfetivo;
                return(
                  <button key={m} onClick={()=>setMesFiltro(m)}
                    style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid",flexShrink:0,
                      borderColor:isSel?"var(--purple)":isAtual?"var(--purple)":"#e5e7eb",
                      background:isSel?"var(--purple)":"white",
                      color:isSel?"white":isAtual?"var(--purple)":"#6b7280",
                      fontSize:12,fontWeight:isSel||isAtual?700:400,cursor:"pointer",
                      display:Math.abs(mesesDisp.indexOf(m)-mesesDisp.indexOf(mesFiltroEfetivo))<=2?"flex":"none",
                      alignItems:"center",gap:4}}>
                    {new Date(m+"-15").toLocaleDateString("pt-BR",{month:"long"})}
                    {isAtual&&!isSel&&<span style={{fontSize:9}}>●</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={()=>{
              const idx=mesesDisp.indexOf(mesFiltroEfetivo);
              if(idx<mesesDisp.length-1) setMesFiltro(mesesDisp[idx+1]);
            }} style={{background:"var(--purple)",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"white",fontSize:16,fontWeight:700}}>›</button>
          </div>

          {lancMes.length===0?(
            <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>
              <Icon name="dollar-sign" size={40}/>
              <div style={{marginTop:12}}>Nenhum lançamento em {new Date(mesFiltro+"-15").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</div>
            </div>
          ):(()=>{
            const receitasTodas = lancMes.filter(l=>l.tipo_lancamento!=="despesa").sort((a,b)=>(b.data||"").localeCompare(a.data||""));
            const despesasTodas = lancMes.filter(l=>l.tipo_lancamento==="despesa").sort((a,b)=>(b.data||"").localeCompare(a.data||""));
            const receitas = filtroTipo==="despesa" ? [] : receitasTodas;
            const despesas = filtroTipo==="receita" ? [] : despesasTodas;
            const totalRecFiltro = receitasTodas.reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
            const totalDespFiltro = despesasTodas.reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
            const totalRec = calcReceitas(lancMes);
            const totalDesp = calcDespesas(lancMes);
            const saldo = totalRec - totalDesp;

            // Cards de saldo dinâmicos por filtroTipo
            const cardsSaldo = filtroTipo==="tudo" ? (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
                <div style={{background:"white",borderRadius:12,padding:"14px 18px",border:"1px solid #e5e7eb"}}>
                  <div style={{fontSize:11,color:"#6b7280",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Total Receitas</div>
                  <div style={{fontSize:20,fontWeight:800,color:"#059669"}}>{totalRecFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                </div>
                <div style={{background:"white",borderRadius:12,padding:"14px 18px",border:"1px solid #e5e7eb"}}>
                  <div style={{fontSize:11,color:"#6b7280",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Total Despesas</div>
                  <div style={{fontSize:20,fontWeight:800,color:"#dc2626"}}>{totalDespFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                </div>
                <div style={{background:"#f5f0ff",borderRadius:12,padding:"14px 18px",border:"2px solid #7B00C4"}}>
                  <div style={{fontSize:11,color:"#7B00C4",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Saldo Líquido</div>
                  <div style={{fontSize:20,fontWeight:800,color:totalRecFiltro-totalDespFiltro>=0?"#7B00C4":"#dc2626"}}>
                    {(totalRecFiltro-totalDespFiltro).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                  </div>
                </div>
              </div>
            ) : filtroTipo==="receita" ? (
              <div style={{background:"#f0fdf4",borderRadius:12,padding:"14px 18px",border:"1px solid #6ee7b7",marginBottom:16}}>
                <div style={{fontSize:11,color:"#15803d",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Total Receitas do Mês</div>
                <div style={{fontSize:24,fontWeight:800,color:"#059669"}}>{totalRecFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
              </div>
            ) : (
              <div style={{background:"#fef2f2",borderRadius:12,padding:"14px 18px",border:"1px solid #fca5a5",marginBottom:16}}>
                <div style={{fontSize:11,color:"#b91c1c",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Total Despesas do Mês</div>
                <div style={{fontSize:24,fontWeight:800,color:"#dc2626"}}>{totalDespFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
              </div>
            );

            function TabelaLanc({itens, titulo, corHeader, corValor, bgHeader}){
              if(!itens.length) return null;
              return(
                <div className="card" style={{padding:0,marginBottom:16}}>
                  <div style={{padding:"10px 16px",background:bgHeader,borderBottom:"2px solid "+corHeader,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontWeight:700,fontSize:14,color:corHeader}}>{titulo}</span>
                    <span style={{fontWeight:800,fontSize:14,color:corHeader}}>
                      {itens.reduce((a,l)=>a+(parseFloat(l.valor)||0),0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                    </span>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:"var(--gray-50)"}}>
                      {["Data","Descrição","Categoria","Forma Pag.","Valor","Status","Ações"].map(h=>(
                        <th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:"var(--text-muted)",borderBottom:"1px solid var(--gray-200)",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {itens.map(l=>{
                        const isFut = l.data>new Date().toISOString().slice(0,10);
                        const statusColor = l.status==="recebido"||l.status==="pago"?"#059669":l.status==="planejado"?"#0891b2":"#d97706";
                        const statusBg = l.status==="recebido"||l.status==="pago"?"#d1fae5":l.status==="planejado"?"#e0f2fe":"#fef3c7";
                        const statusLabel = l.status==="recebido"?"✓ Recebido":l.status==="pago"?"✓ Pago":l.status==="planejado"?"📅 Planejado":"Pendente";
                        return(
                          <tr key={l.id} style={{borderBottom:"1px solid var(--gray-100)",background:isFut?"#fafafa":"white",opacity:isFut?0.85:1}}>
                            <td style={{padding:"8px 14px",whiteSpace:"nowrap",fontSize:12}}>
                              {l.data?new Date(l.data+"T00:00:00").toLocaleDateString("pt-BR"):"—"}
                              {isFut&&<span style={{marginLeft:4,fontSize:9,color:"#0891b2",fontWeight:600}}>futuro</span>}
                            </td>
                            <td style={{padding:"8px 14px",maxWidth:320}}>
                              <div style={{fontWeight:500,fontSize:13,lineHeight:1.4}}>
                                {l.descricao||l.tipo||l.pacienteNome||"—"}
                              </div>
                              <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                                {l.tipo_lancamento==="pacote"&&<span style={{background:"var(--purple-soft)",color:"var(--purple)",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:600}}>Pacote</span>}
                                {l.tipo_lancamento==="sessao"&&<span style={{background:"#e0f2fe",color:"#0891b2",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:600}}>Sessão</span>}
                                {(l.pagamentosExtras||[]).length>0&&(
                                  <span style={{background:"#fef3c7",color:"#92400e",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:600}}>
                                    💳 {(l.pagamentosExtras||[]).length}x forma{(l.pagamentosExtras||[]).length>1?"s":""}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{padding:"8px 14px",fontSize:12,color:"var(--text-muted)"}}>{l.categoria||"—"}</td>
                            <td style={{padding:"8px 14px"}}><span style={{background:"#f3f4f6",borderRadius:6,padding:"2px 6px",fontSize:11}}>{l.formaPag||"—"}</span></td>
                            <td style={{padding:"8px 14px",fontWeight:700,color:corValor,whiteSpace:"nowrap"}}>
                              {(parseFloat(l.valor)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                            </td>
                            <td style={{padding:"8px 14px"}}>
                              <span style={{background:statusBg,color:statusColor,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{statusLabel}</span>
                            </td>
                            <td style={{padding:"8px 14px"}}>
                              <div style={{display:"flex",gap:4}}>
                                {l.tipo_lancamento==="pacote"?(
                                  <button className="btn btn-ghost" style={{padding:"4px 8px",fontSize:11,color:"var(--purple)"}} onClick={()=>{setPacoteSelecionado(l.pacoteId);setAba("pacotes");}}>
                                    <Icon name="clipboard-list" size={12}/>
                                  </button>
                                ):(
                                  <button className="btn btn-ghost" style={{padding:"4px 8px",fontSize:11,color:"var(--purple)"}} onClick={()=>abrirEditar(l)}>
                                    <Icon name="pencil" size={12}/>
                                  </button>
                                )}
                                <button className="btn btn-ghost" style={{padding:"4px 8px",fontSize:11,color:"#dc2626"}} onClick={()=>setModalExcluirLanc(l)}>
                                  <Icon name="trash-2" size={12}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }

            return(
              <div>
                {cardsSaldo}
                <TabelaLanc itens={receitas} titulo="💰 Receitas" corHeader="#059669" corValor="#059669" bgHeader="#f0fdf4"/>
                <TabelaLanc itens={despesas} titulo="💸 Despesas" corHeader="#dc2626" corValor="#dc2626" bgHeader="#fff1f2"/>
                {/* Resumo do mês */}
                <div style={{background:"white",borderRadius:12,border:"1px solid var(--gray-200)",padding:"14px 20px",display:"flex",gap:24,flexWrap:"wrap",alignItems:"center"}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:2}}>Receitas</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#059669"}}>{totalRec.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                  </div>
                  <div style={{fontSize:20,color:"var(--text-muted)"}}>−</div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:2}}>Despesas</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#dc2626"}}>{totalDesp.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                  </div>
                  <div style={{fontSize:20,color:"var(--text-muted)"}}>=</div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:2}}>Saldo do Mês</div>
                    <div style={{fontSize:22,fontWeight:900,color:saldo>=0?"#059669":"#dc2626"}}>{saldo.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Modal excluir lançamento — um ou todos os futuros */}
          {modalExcluirLanc&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:20}}>
              <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:420,textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:12}}>🗑️</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:17,fontWeight:600,marginBottom:6}}>{modalExcluirLanc.tipo}</div>
                <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>{modalExcluirLanc.data?new Date(modalExcluirLanc.data+"T00:00:00").toLocaleDateString("pt-BR"):""}</p>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                  <button className="btn btn-ghost" style={{border:"1.5px solid #e5e7eb",textAlign:"left",padding:"12px 16px"}} onClick={async()=>{
                    await db.collection("clinica_lancamentos").doc(modalExcluirLanc.id).delete();
                    setModalExcluirLanc(null);
                  }}>
                    <div style={{fontWeight:600,fontSize:13}}>Só este lançamento</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>Remove apenas {new Date(modalExcluirLanc.data+"T00:00:00").toLocaleDateString("pt-BR",{month:"long"})}</div>
                  </button>
                  <button className="btn btn-ghost" style={{border:"1.5px solid #fbbf24",textAlign:"left",padding:"12px 16px"}} onClick={async()=>{
                    if(!modalExcluirLanc.pacoteId){alert("Este lançamento não tem pacote vinculado — use 'Só este lançamento'.");return;}
                    if(!confirm("Excluir este e todos os lançamentos futuros deste pacote?"))return;
                    const snap = await db.collection("clinica_lancamentos").get();
                    const futuros = snap.docs.filter(d=>{
                      const dd=d.data();
                      return dd.pacoteId===modalExcluirLanc.pacoteId && dd.data>=modalExcluirLanc.data;
                    });
                    const b=db.batch();futuros.forEach(d=>b.delete(d.ref));await b.commit();
                    setModalExcluirLanc(null);
                  }}>
                    <div style={{fontWeight:600,fontSize:13,color:"#d97706"}}>Este e todos os futuros</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>Remove lançamentos deste pacote a partir de {new Date(modalExcluirLanc.data+"T00:00:00").toLocaleDateString("pt-BR",{month:"long"})}</div>
                  </button>
                  <button className="btn btn-ghost" style={{border:"1.5px solid #fca5a5",textAlign:"left",padding:"12px 16px"}} onClick={async()=>{
                    if(!modalExcluirLanc.pacoteId){alert("Este lançamento não tem pacote vinculado — use 'Só este lançamento'.");return;}
                    if(!confirm("Excluir TODOS os lançamentos deste pacote no ano inteiro?"))return;
                    const snap = await db.collection("clinica_lancamentos").get();
                    const todos = snap.docs.filter(d=>d.data().pacoteId===modalExcluirLanc.pacoteId);
                    const b=db.batch();todos.forEach(d=>b.delete(d.ref));await b.commit();
                    setModalExcluirLanc(null);
                  }}>
                    <div style={{fontWeight:600,fontSize:13,color:"#dc2626"}}>Todos — o ano inteiro</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>Remove todos os lançamentos deste pacote</div>
                  </button>
                </div>
                <button className="btn btn-ghost" style={{width:"100%"}} onClick={()=>setModalExcluirLanc(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA PACOTES */}
      {aba==="pacotes"&&(
        <div>
          {(()=>{
            const hoje = new Date().toISOString().slice(0,10);
            // Sessões pendentes = data PASSADA + status "agendado" + vinculada a pacote ativo
            // Exclui: falta, realizado, cancelado, remarcado, futuras, sessões sem pacote
            const pacoteIdsAtivos = new Set(pacotes.filter(p=>p.status!=="inativo").map(p=>p.id));
            const sessoesPendentes = sessoes.filter(s=>
              s.data < hoje &&
              s.status === "agendado" &&
              s.pacienteId &&
              s.pacoteId &&
              pacoteIdsAtivos.has(s.pacoteId)
            );
            // Pacotes com pagamento pendente (não 100% pago)
            const pacotesPendPag = pacotes.filter(p=>{
              const sessPac = sessoes.filter(s=>s.pacoteId===p.id);
              const pagas = sessPac.filter(s=>s.pagamento==="pago").length;
              return p.status !== "inativo" && pagas < (p.totalSessoes||0);
            });
            if(sessoesPendentes.length===0 && pacotesPendPag.length===0) return null;
            return (
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
                {sessoesPendentes.length>0&&(()=>{
                  function AvisoSessoes({lista, pacientes}){
                    const [expandido, setExpandido] = React.useState(false);
                    const visiveis = expandido ? lista : lista.slice(0,5);
                    const extras = lista.length - 5;
                    return (
                      <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:12,padding:"14px 18px"}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#92400e",marginBottom:4}}>⚠️ {lista.length} sessão(ões) passada(s) sem status final</div>
                        <div style={{fontSize:12,color:"#78350f",marginBottom:8}}>
                          Sessões que já ocorreram e ainda estão como "Agendado". Marque como <strong>Realizada</strong>, <strong>Cancelada</strong> ou <strong>Remarcada</strong>.
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
                          {visiveis.map(s=>{
                            const nome = pacientes.find(p=>p.id===s.pacienteId)?.nome||"—";
                            return (
                              <span key={s.id} style={{background:"#fde68a",borderRadius:20,padding:"2px 10px",fontSize:11,color:"#78350f",fontWeight:600}}>
                                {nome.split(" ")[0]} · {new Date(s.data+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}
                              </span>
                            );
                          })}
                          {!expandido && extras>0&&(
                            <button onClick={()=>setExpandido(true)}
                              style={{background:"#f59e0b",color:"white",border:"none",borderRadius:20,padding:"2px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                              +{extras} mais ▾
                            </button>
                          )}
                          {expandido&&(
                            <button onClick={()=>setExpandido(false)}
                              style={{background:"none",color:"#92400e",border:"1px solid #f59e0b",borderRadius:20,padding:"2px 10px",fontSize:11,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                              ▴ recolher
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return <AvisoSessoes lista={sessoesPendentes} pacientes={pacientes}/>;
                })()}
                {pacotesPendPag.length>0&&(()=>{
                  function AvisoPacotes({lista, pacientes, sessoes}){
                    const [expandidoPac, setExpandidoPac] = React.useState(false);
                    const visiveis = expandidoPac ? lista : lista.slice(0,5);
                    const extras = lista.length - 5;
                    return (
                      <div style={{background:"#fff7ed",border:"1px solid #fb923c",borderRadius:12,padding:"14px 18px"}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#c2410c",marginBottom:4}}>💰 {lista.length} pacote(s) com pagamento em aberto</div>
                        <div style={{fontSize:12,color:"#9a3412",marginBottom:8}}>
                          Pacotes ativos com sessões ainda não marcadas como pagas.
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
                          {visiveis.map(p=>{
                          const nome = pacientes.find(pac=>pac.id===p.pacienteId)?.nome||"—";
                          const sessPac = sessoes.filter(s=>s.pacoteId===p.id);
                          const pagas = sessPac.filter(s=>s.pagamento==="pago").length;
                          const total = p.totalSessoes||0;
                          return (
                            <span key={p.id} style={{background:"#fed7aa",borderRadius:20,padding:"2px 10px",fontSize:11,color:"#9a3412",fontWeight:600}}>
                              {nome.split(" ")[0]} · {pagas}/{total} pagas
                            </span>
                          );
                        })}
                        {!expandidoPac && pacotesPendPag.length>5&&(
                          <button onClick={()=>setExpandidoPac(true)}
                            style={{background:"#ea580c",color:"white",border:"none",borderRadius:20,padding:"2px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                            +{pacotesPendPag.length-5} mais ▾
                          </button>
                        )}
                        {expandidoPac&&(
                          <button onClick={()=>setExpandidoPac(false)}
                            style={{background:"none",color:"#c2410c",border:"1px solid #fb923c",borderRadius:20,padding:"2px 10px",fontSize:11,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                            ▴ recolher
                          </button>
                        )}
                        </div>
                      </div>
                    );
                  }
                  return <AvisoPacotes lista={pacotesPendPag} pacientes={pacientes} sessoes={sessoes}/>;
                })()}
              </div>
            );
          })()}

          {pacotes.length===0?(
            <div className="card" style={{textAlign:"center",padding:60}}>
              <Icon name="package" size={48}/>
              <div style={{marginTop:12,fontWeight:500}}>Nenhum pacote criado ainda</div>
              <button className="btn btn-purple" style={{marginTop:16}} onClick={()=>setModal("pacote")}>+ Criar Pacote</button>
            </div>
          ):(()=>{
            // Agrupar pacotes por paciente — ordem alfabética
            const pacientesComPacote = [...new Set(pacotes.map(p=>p.pacienteId))];
            const pacientesVisiveisBruto = buscaPac.trim()
              ? pacientesComPacote.filter(id=>{
                  const pac = pacientes.find(p=>p.id===id);
                  const inicial = (pac?.nome||"?")[0].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
                  return inicial === buscaPac;
                })
              : pacientesComPacote;
            const pacientesVisiveis = pacientesVisiveisBruto.sort((a,b)=>{
              const nA = (pacientes.find(p=>p.id===a)?.nome||"").toLowerCase();
              const nB = (pacientes.find(p=>p.id===b)?.nome||"").toLowerCase();
              return nA.localeCompare(nB,"pt-BR");
            });
            return (
              <div style={{display:"flex",flexDirection:"column",gap:28}}>
                {/* Índice A-Z */}
                {(()=>{
                  const letrasComPac = [...new Set(pacientesComPacote.map(id=>{
                    const pac = pacientes.find(p=>p.id===id);
                    return (pac?.nome||"?")[0].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
                  }))].sort();
                  return (
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
                      {buscaPac&&<button onClick={()=>setBuscaPac("")}
                        style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid #7B00C4",background:"#7B00C4",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        Todos
                      </button>}
                      {letrasComPac.map(letra=>(
                        <button key={letra} onClick={()=>setBuscaPac(buscaPac===letra?"":letra)}
                          style={{width:32,height:32,borderRadius:"50%",border:"1.5px solid",
                            borderColor:buscaPac===letra?"#7B00C4":"#e8c8ff",
                            background:buscaPac===letra?"#7B00C4":"white",
                            color:buscaPac===letra?"white":"#7B00C4",
                            fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                          {letra}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {pacientesVisiveis.map(pacId=>{
                  const pac = pacientes.find(p=>p.id===pacId);
                  const pacotesDoPac = pacotes.filter(p=>p.pacienteId===pacId).sort((a,b)=>{
                    const ta = a.createdAt?.seconds||0;
                    const tb = b.createdAt?.seconds||0;
                    return tb-ta;
                  });
                  return (
                    <div key={pacId}>
                      {/* Cabeçalho do paciente */}
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,paddingBottom:10,borderBottom:"2px solid var(--purple-soft)"}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:"var(--purple)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,flexShrink:0}}>
                          {(pac?.nome||"?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:16}}>{pac?.nome||pacotesDoPac[0]?.pacienteNome||"—"}</div>
                          <div style={{fontSize:12,color:"var(--text-muted)"}}>{pacotesDoPac.length} pacote(s)</div>
                        </div>
                        <button className="btn btn-outline" style={{marginLeft:"auto",fontSize:12}} onClick={()=>setPacoteSelecionado(pacId)}>
                          <Icon name="bar-chart-2" size={13}/> Acompanhamento
                        </button>
                      </div>
                      {/* Pacotes do paciente */}
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {pacotesDoPac.map(p=>{
                          const sessPac=sessoes.filter(s=>s.pacoteId===p.id);
                          const realizadas=sessPac.filter(s=>s.status==="realizado").length;
                          const pagas=sessPac.filter(s=>s.pagamento==="pago").length;
                          const pct=Math.round((realizadas/(p.totalSessoes||1))*100);
                          const lancsPac=lancamentos.filter(l=>l.pacoteId===p.id);
                          const totalPago=lancsPac.filter(l=>l.status==="recebido").reduce((a,l)=>a+(l.valor||0),0);
                          const isPago=p.statusPag==="recebido";
                          const dataStr=p.dataInicio?new Date(p.dataInicio+"T00:00:00").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}):"—";
                          return(
                            <div key={p.id} style={{borderRadius:12,border:"1px solid #e8c8ff",background:"white",padding:"14px 16px",marginBottom:10,boxShadow:"0 1px 3px #0001"}}>
                              {/* Cabeçalho do card */}
                              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <div style={{width:10,height:10,borderRadius:"50%",background:isPago?"#22c55e":"#f59e0b",flexShrink:0,marginTop:2}}/>
                                  <div>
                                    <div style={{fontWeight:700,fontSize:14,color:"#3d006a"}}>{p.obs||p.recorrencia||"Pacote"}</div>
                                    <div style={{fontSize:11,color:"var(--text-muted)",marginTop:1}}>
                                      {p.recorrencia}{p.horario&&<span> · 🕐 {p.horario}</span>} · {dataStr}
                                    </div>
                                  </div>
                                </div>
                                <div style={{textAlign:"right"}}>
                                  <div style={{fontWeight:800,fontSize:16,color:isPago?"#22c55e":"#f59e0b"}}>
                                    {(p.valorTotal||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                                  </div>
                                  <div style={{fontSize:11,color:isPago?"#22c55e":"#f59e0b",fontWeight:600}}>
                                    {isPago?"✓ Recebido":"⏳ Pendente"}
                                    {p.formaPag&&<span style={{fontWeight:400,color:"var(--text-muted)"}}> · {p.formaPag}</span>}
                                  </div>
                                </div>
                              </div>
                              {/* Barra de progresso */}
                              <div style={{marginBottom:10}}>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",marginBottom:4}}>
                                  <span>{realizadas} realizadas de {p.totalSessoes} · {pagas} pagas</span>
                                  <span style={{fontWeight:600,color:"var(--purple)"}}>{pct}%</span>
                                </div>
                                <div style={{height:6,background:"#e8c8ff",borderRadius:10,overflow:"hidden"}}>
                                  <div style={{width:pct+"%",height:"100%",background:"#7B00C4",borderRadius:10,transition:"width .4s"}}/>
                                </div>
                              </div>
                              {/* Pagamentos extras */}
                              {(p.pagamentosExtras||[]).length>0&&(
                                <div style={{marginBottom:10,display:"flex",gap:6,flexWrap:"wrap"}}>
                                  {(p.pagamentosExtras||[]).map((pg,i)=>(
                                    <span key={i} style={{background:"#f3e6ff",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#6b7280"}}>
                                      💳 {pg.forma||"?"} R${parseFloat(pg.valor||0).toFixed(2).replace(".",",")} · {pg.data?new Date(pg.data+"T00:00:00").toLocaleDateString("pt-BR"):"—"}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* Botões */}
                              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                <button className="btn btn-ghost" style={{fontSize:12,padding:"6px 12px",color:"var(--purple)",border:"1px solid #d9b3f5"}}
                                  onClick={e=>{e.stopPropagation();setPacoteSelecionado(p.id+"__pacote");}}>
                                  <Icon name="edit-3" size={13}/> Editar
                                </button>
                                <button className="btn btn-purple" style={{fontSize:12,padding:"6px 12px"}}
                                  onClick={e=>{e.stopPropagation();setPacoteSelecionado(p.id+"__sessoes");}}>
                                  <Icon name="clipboard-list" size={13}/> Sessões
                                </button>
                                <button className="btn btn-ghost" style={{fontSize:12,padding:"6px 12px",color:"#059669",border:"1px solid #6ee7b7"}}
                                  onClick={e=>{e.stopPropagation();
                                    const pac = pacientes.find(x=>x.id===pacId);
                                    const sessPac = sessoes.filter(s=>s.pacoteId===p.id).sort((a,b)=>(a.data||"").localeCompare(b.data||""));
                                    const statusLabel = {agendado:"Agendado",confirmado:"Confirmado",realizado:"✓ Realizado",cancelado:"Cancelado",falta:"Falta"};
                                    const statusColor = {agendado:"#7B00C4",confirmado:"#059669",realizado:"#0891b2",cancelado:"#dc2626",falta:"#d97706"};
                                    const totalValor = sessPac.reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0);
                                    const totalPago = sessPac.reduce((a,s)=>a+(parseFloat(s.valorPago)||0),0);
                                    const sessMeses = {};
                                    sessPac.forEach(s=>{ const m=(s.data||"").slice(0,7); if(!sessMeses[m])sessMeses[m]=[]; sessMeses[m].push(s); });
                                    const fmtM = m=>{ const [y,mo]=m.split("-"); return new Date(y,mo-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}); };
                                    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Resumo — ${pac?.nome||""}</title>
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
<div style="font-size:11px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</div></div>
<div class="box"><div class="nome">${pac?.nome||"—"}</div>
<div class="meta">
<div class="mi"><label>Início</label><span>${p.dataInicio?new Date(p.dataInicio+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</span></div>
<div class="mi"><label>Horário</label><span>${p.horario||"—"}</span></div>
<div class="mi"><label>Recorrência</label><span>${p.recorrencia||"—"}</span></div>
<div class="mi"><label>Sessões</label><span>${sessPac.length}</span></div>
</div></div>
${Object.entries(sessMeses).sort(([a],[b])=>a.localeCompare(b)).map(([mes,sess])=>`
<div class="mes">${fmtM(mes).charAt(0).toUpperCase()+fmtM(mes).slice(1)} — ${sess.length} sessão(ões)</div>
<table><thead><tr><th>Nº</th><th>Data</th><th>Horário</th><th>Tipo</th><th>Presença</th><th>Valor</th></tr></thead>
<tbody>${sess.map((s,i)=>`<tr><td style="font-weight:700;color:#7B00C4">${s.numSessao||i+1}</td>
<td>${s.data?new Date(s.data+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"}):""}</td>
<td>${s.hora||"—"}</td><td>${s.tipo||"Psicoterapia"}</td>
<td><span class="badge" style="background:${statusColor[s.status]||"#7B00C4"}">${statusLabel[s.status]||s.status||"—"}</span></td>
<td>R$ ${(parseFloat(s.valorSessao)||0).toFixed(2).replace(".",",")}</td></tr>`).join("")}
</tbody></table>`).join("")}
<div class="totais">
<div class="ti"><label>Total do pacote</label><span>R$ ${totalValor.toFixed(2).replace(".",",")}</span></div>
<div class="ti"><label>Recebido</label><span style="color:#059669">R$ ${totalPago.toFixed(2).replace(".",",")}</span></div>
<div class="ti"><label>A receber</label><span style="color:#d97706">R$ ${(totalValor-totalPago).toFixed(2).replace(".",",")}</span></div>
</div>
${(p.dataPagamento||p.dataRecebimento)?`<div style="margin-top:14px;background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:12px 18px;display:flex;align-items:center;gap:12px"><span style="font-size:18px">✅</span><div><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#065f46;letter-spacing:.5px">Data de Pagamento</div><div style="font-size:16px;font-weight:800;color:#059669">${new Date((p.dataPagamento||p.dataRecebimento)+"T00:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</div></div></div>`:""}
${sessPac.some(s=>s.dataPagamento||s.dataRecebimento)?`<div style="margin-top:10px;font-size:11px;color:#6b7280;font-weight:600">Pagamentos por sessão:</div><table style="margin-top:4px;font-size:11px"><tbody>${sessPac.filter(s=>s.dataPagamento||s.dataRecebimento).map(s=>`<tr><td style="padding:3px 10px 3px 0;color:#374151">Sessão ${s.numSessao||""} — ${s.data?new Date(s.data+"T12:00:00").toLocaleDateString("pt-BR"):""}:</td><td style="color:#059669;font-weight:700">pago em ${new Date((s.dataPagamento||s.dataRecebimento)+"T00:00:00").toLocaleDateString("pt-BR")}</td></tr>`).join("")}</tbody></table>`:""}
<div class="footer">Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
                                    const w=window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),800);
                                  }}>
                                  <Icon name="file-text" size={13}/> PDF
                                </button>
                                <button className="btn btn-ghost" style={{fontSize:12,padding:"6px 12px",color:"#dc2626",marginLeft:"auto"}}
                                  onClick={async e=>{e.stopPropagation();
                                    if(!confirm("Excluir pacote e TODAS as sessões e lançamentos vinculados? Esta ação não pode ser desfeita."))return;
                                    try {
                                      const [snapSess, snapLanc] = await Promise.all([
                                        db.collection("clinica_sessoes").where("pacoteId","==",p.id).get(),
                                        db.collection("clinica_lancamentos").where("pacoteId","==",p.id).get(),
                                      ]);
                                      const b = db.batch();
                                      snapSess.docs.forEach(d=>b.delete(d.ref));
                                      snapLanc.docs.forEach(d=>b.delete(d.ref));
                                      b.delete(db.collection("clinica_pacotes").doc(p.id));
                                      await b.commit();
                                    } catch(e){
                                      alert("Erro ao excluir pacote: "+e.message);
                                    }
                                  }}>
                                  <Icon name="trash-2" size={13}/> Excluir
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ABA ACOMPANHAMENTO GERAL */}
      {aba==="acompanhamento"&&(
        <div>
          <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>
            Clique em um paciente para abrir o Controle de Sessões e Frequência completo.
          </div>
          {pacientes.filter(p=>p.status==="ativo").sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR")).map(pac=>{
            const sessPac = sessoes.filter(s=>s.pacienteId===pac.id);
            const pacotesPac = pacotes.filter(p=>p.pacienteId===pac.id);
            if(pacotesPac.length===0) return null;
            const totalSessoes = sessPac.length;
            // "Remarcado" conta como sessão válida para fins de progresso e fluxo financeiro
            const realizadas = sessPac.filter(s=>s.status==="realizado"||s.status==="remarcado").length;
            const pagas = sessPac.filter(s=>s.pagamento==="pago").length;
            // Pendentes: exclui canceladas E remarcadas (remarcado já retém valor pago)
            const pendentes = sessPac.filter(s=>s.pagamento!=="pago"&&s.status!=="cancelado"&&s.status!=="remarcado").length;
            const recebido = sessPac.filter(s=>s.pagamento==="pago").reduce((a,s)=>a+(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0),0);
            // A receber: exclui canceladas E remarcadas do fluxo de cobrança pendente
            const aReceber = sessPac.filter(s=>s.pagamento!=="pago"&&s.status!=="cancelado"&&s.status!=="remarcado").reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0);
            return(
              <div key={pac.id} className="card" style={{padding:"14px 20px",cursor:"pointer",marginBottom:10,transition:"box-shadow .15s"}}
                onClick={()=>setPacoteSelecionado(pac.id)}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(123,0,196,0.12)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:"var(--purple)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,flexShrink:0}}>
                    {(pac.nome||"?")[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14}}>{pac.nome}</div>
                    <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>
                      {pacotesPac[0]?.recorrencia} · {pacotesPac[0]?.horario}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:700,color:"var(--purple)"}}>{realizadas}/{totalSessoes}</div>
                      <div style={{fontSize:10,color:"var(--text-muted)"}}>Sessões</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#059669"}}>{recebido.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                      <div style={{fontSize:10,color:"var(--text-muted)"}}>Recebido</div>
                    </div>
                    {aReceber>0&&<div style={{textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#d97706"}}>{aReceber.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                      <div style={{fontSize:10,color:"var(--text-muted)"}}>A Receber</div>
                    </div>}
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      {pendentes>0&&<span style={{background:"#fef3c7",color:"#b45309",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{pendentes} pendente(s)</span>}
                      {pendentes===0&&<span style={{background:"#d1fae5",color:"#065f46",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>✓ Em dia</span>}
                    </div>
                    <Icon name="chevron-right" size={16} style={{color:"var(--text-muted)"}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ABA COMISSÕES — embutida no Fin. Clínica para a psicóloga */}
      {aba==="comissoes"&&(
        <Comissoes user={user}/>
      )}

      {/* MODAL ESCOLHA */}
      {/* MODAL NOVA DESPESA */}
      {modalDespesa&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModalDespesa(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>{editandoDespesa?"Editar":"Nova"} Despesa — Clínica</div>
              <button onClick={()=>setModalDespesa(false)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={formDespesa.categoria} onChange={e=>setFormDespesa({...formDespesa,categoria:e.target.value})}>
                  <option value="">Selecionar...</option>
                  {CATS_DESPESA_CLINICA.map(cat=><option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input className="form-input" value={formDespesa.descricao} onChange={e=>setFormDespesa({...formDespesa,descricao:e.target.value})} placeholder="Ex: Equipamento Neurofeedback"/>
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input className="form-input" type="number" value={formDespesa.valor} onChange={e=>setFormDespesa({...formDespesa,valor:e.target.value})} placeholder="0,00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input className="form-input" type="date" value={formDespesa.data} onChange={e=>setFormDespesa({...formDespesa,data:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <select className="form-input" value={formDespesa.formaPag} onChange={e=>setFormDespesa({...formDespesa,formaPag:e.target.value})}>
                  {FORMAS_PAG_CLINICA.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
              {!editandoDespesa&&(
                <div className="form-group">
                  <label className="form-label">Parcelas</label>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input className="form-input" type="number" min="1" max="60" value={formDespesa.parcelas} onChange={e=>setFormDespesa({...formDespesa,parcelas:e.target.value})} style={{width:80}}/>
                    <span style={{fontSize:12,color:"var(--text-muted)"}}>= <strong style={{color:"var(--purple)"}}>R$ {((parseFloat(formDespesa.valor)||0)*(parseInt(formDespesa.parcelas)||1)).toFixed(2).replace(".",",")}</strong></span>
                  </div>
                </div>
              )}
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Status</label>
                <div style={{display:"flex",gap:8}}>
                  {[["pago","✓ Pago","#059669"],["pendente","Pendente","#d97706"]].map(([v,l,cor])=>(
                    <button key={v} type="button" onClick={()=>setFormDespesa({...formDespesa,status:v})}
                      style={{flex:1,padding:10,borderRadius:10,border:"1.5px solid",borderColor:formDespesa.status===v?cor:"#e5e7eb",background:formDespesa.status===v?cor+"15":"white",color:formDespesa.status===v?cor:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Observações</label>
                <input className="form-input" value={formDespesa.obs||""} onChange={e=>setFormDespesa({...formDespesa,obs:e.target.value})} placeholder="Opcional..."/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
              <button className="btn btn-ghost" onClick={()=>setModalDespesa(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvarDespesaClinica} disabled={salvando}>{salvando?"Salvando...":editandoDespesa?"Salvar":"Lançar"}</button>
            </div>
          </div>
        </div>
      )}

      {modal==="escolha"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:32,width:"100%",maxWidth:420,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>Novo Lançamento</div>
            <p style={{fontSize:13,color:"#6b7280",marginBottom:24}}>Selecione o tipo:</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button className="btn btn-outline" style={{width:"100%",padding:"20px 20px",fontSize:13,display:"flex",alignItems:"center",gap:16,textAlign:"left"}}
                onClick={()=>setModal("pacote")}>
                <span style={{fontSize:32,flexShrink:0}}>📦</span>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"var(--purple)"}}>Pacote de Sessões</div>
                  <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5,marginTop:2}}>Gera sessões recorrentes na agenda com ficha de frequência, controle de pagamento e formas mistas</div>
                </div>
              </button>
            </div>
            <button className="btn btn-ghost" style={{width:"100%",marginTop:12}} onClick={()=>setModal(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL AVULSO */}
      {(modal==="avulso")&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>{setModal(false);setEditando(null);}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>{editando?"Editar Lançamento":"Lançamento Avulso"}</div>
              <button onClick={()=>{setModal(false);setEditando(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div className="form-group" style={{gridColumn:"1/-1"}}><label className="form-label">Paciente / Cliente</label>
                <select className="form-input" value={formAvulso.pacienteId} onChange={e=>{
                  const pac=pacientes.find(p=>p.id===e.target.value);
                  setFormAvulso({...formAvulso,pacienteId:e.target.value,pacienteNome:pac?.nome||"",
                    obs:pac?`${formAvulso.tipo} — ${pac.nome}`:formAvulso.obs});
                }}>
                  <option value="">Selecionar...</option>{pacientes.filter(p=>p.status==="ativo").sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR")).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Tipo / Categoria</label>
                <select className="form-input" value={formAvulso.tipo} onChange={e=>{
                  const pac=pacientes.find(p=>p.id===formAvulso.pacienteId);
                  setFormAvulso({...formAvulso,tipo:e.target.value,
                    obs:pac?`${e.target.value} — ${pac.nome}`:formAvulso.obs});
                }}>
                  {["Consulta","Sessão","Avaliação","Musicoterapia","Neuromodulação","Orientação","Laudo","Outro"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Valor R$</label>
                <input className="form-input" type="number" placeholder="0,00" value={formAvulso.valor} onChange={e=>setFormAvulso({...formAvulso,valor:e.target.value})}/>
              </div>
              <div className="form-group"><label className="form-label">Data</label>
                <input className="form-input" type="date" value={formAvulso.data} onChange={e=>setFormAvulso({...formAvulso,data:e.target.value})}/>
              </div>
              <div className="form-group"><label className="form-label">Forma de Pagamento</label>
                <select className="form-input" value={formAvulso.formaPag} onChange={e=>setFormAvulso({...formAvulso,formaPag:e.target.value})}>
                  {FORMAS.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}><label className="form-label">Status</label>
                <div style={{display:"flex",gap:8}}>
                  {[["pendente","Pendente","#d97706"],["recebido","✓ Recebido","#059669"]].map(([v,l,c])=>(
                    <button key={v} onClick={()=>setFormAvulso({...formAvulso,status:v})}
                      style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid",borderColor:formAvulso.status===v?c:"#e5e7eb",background:formAvulso.status===v?c+"15":"white",color:formAvulso.status===v?c:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}><label className="form-label">Observações</label>
                <input className="form-input" placeholder="Opcional..." value={formAvulso.obs} onChange={e=>setFormAvulso({...formAvulso,obs:e.target.value})}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>{setModal(false);setEditando(null);}}>Cancelar</button>
              {editando&&(
                <button className="btn btn-ghost" style={{border:"1px solid #fecaca",color:"#dc2626",fontSize:12}}
                  title="Este lançamento é uma despesa, não uma receita"
                  onClick={()=>{
                    setFormDespesaEdit({
                      descricao: formAvulso.descricao||formAvulso.tipo||"",
                      categoria: formAvulso.categoria||"",
                      valor:     formAvulso.valor+"",
                      data:      formAvulso.data||"",
                      formaPag:  formAvulso.formaPag||"",
                      status:    formAvulso.status==="recebido"?"pago":(formAvulso.status||"pago"),
                      obs:       formAvulso.obs||"",
                    });
                    setModal("editar-despesa");
                  }}>
                  🔁 Marcar como Despesa
                </button>
              )}
              {editando ? (
                <button className="btn btn-purple" onClick={()=>salvarAvulso(null)} disabled={salvando}><Icon name="save" size={15}/> {salvando?"Salvando...":"Salvar Alterações"}</button>
              ) : (
                <>
                  <button className="btn btn-ghost" onClick={()=>salvarAvulso(null)} disabled={salvando}
                    style={{border:"1px solid #e5e7eb",color:"#6b7280",fontSize:12}} title="Sem comissão — para lançamentos passados">
                    📋 Sem comissão
                  </button>
                  <button className="btn btn-purple" onClick={()=>salvarAvulso("primeira")} disabled={salvando}
                    style={{background:"#7B00C4"}} title="10% de comissão">
                    🌟 Primeira Venda
                  </button>
                  <button className="btn btn-purple" onClick={()=>salvarAvulso("recorrente")} disabled={salvando}
                    style={{background:"#0891b2"}} title="5% de comissão">
                    🔁 Venda Recorrente
                  </button>
                </>
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR DESPESA */}
      {modal==="editar-despesa"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>{setModal(false);setEditando(null);}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"#dc2626"}}>✏️ Editar Despesa</div>
              <button onClick={()=>{setModal(false);setEditando(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Descrição</label>
                <input className="form-input" placeholder="Ex: Consultório locação" value={formDespesaEdit.descricao} onChange={e=>setFormDespesaEdit({...formDespesaEdit,descricao:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={formDespesaEdit.categoria} onChange={e=>setFormDespesaEdit({...formDespesaEdit,categoria:e.target.value})}>
                  <option value="">Selecionar...</option>
                  {CATS_DESPESA.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Valor R$</label>
                <input className="form-input" type="number" placeholder="0,00" value={formDespesaEdit.valor} onChange={e=>setFormDespesaEdit({...formDespesaEdit,valor:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input className="form-input" type="date" value={formDespesaEdit.data} onChange={e=>setFormDespesaEdit({...formDespesaEdit,data:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <select className="form-input" value={formDespesaEdit.formaPag} onChange={e=>setFormDespesaEdit({...formDespesaEdit,formaPag:e.target.value})}>
                  <option value="">—</option>
                  {FORMAS.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Status</label>
                <div style={{display:"flex",gap:8}}>
                  {[["pago","✓ Pago","#059669"],["pendente","Pendente","#d97706"]].map(([v,l,c])=>(
                    <button key={v} onClick={()=>setFormDespesaEdit({...formDespesaEdit,status:v})}
                      style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid",borderColor:formDespesaEdit.status===v?c:"#e5e7eb",background:formDespesaEdit.status===v?c+"15":"white",color:formDespesaEdit.status===v?c:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Observações</label>
                <input className="form-input" placeholder="Opcional..." value={formDespesaEdit.obs} onChange={e=>setFormDespesaEdit({...formDespesaEdit,obs:e.target.value})}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>{setModal(false);setEditando(null);}}>Cancelar</button>
              <button className="btn btn-purple" style={{background:"#dc2626"}} onClick={salvarDespesaEdit} disabled={salvando}>
                <Icon name="save" size={15}/> {salvando?"Salvando...":"Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PACOTE */}
      {modal==="pacote"&&(()=>{
        const DIAS=[{v:"0",l:"Dom"},{v:"1",l:"Seg"},{v:"2",l:"Ter"},{v:"3",l:"Qua"},{v:"4",l:"Qui"},{v:"5",l:"Sex"},{v:"6",l:"Sáb"}];
        const needDias=["2x por semana","3x por semana"].includes(formPacote.recorrencia);
        const maxDias=formPacote.recorrencia==="3x por semana"?3:2;
        const diasSel=formPacote.diasSemana||[];
        function toggleDia(v){if(diasSel.includes(v)){setFormPacote({...formPacote,diasSemana:diasSel.filter(d=>d!==v)});}else if(diasSel.length<maxDias){setFormPacote({...formPacote,diasSemana:[...diasSel,v].sort()});}}
        return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
            <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>Novo Pacote de Sessões</div>
                <button onClick={()=>setModal(false)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div className="form-group" style={{gridColumn:"1/-1"}}><label className="form-label">Paciente *</label>
                  <select className="form-input" value={formPacote.pacienteId} onChange={e=>setFormPacote({...formPacote,pacienteId:e.target.value})}>
                    <option value="">Selecionar...</option>{pacientes.filter(p=>p.status==="ativo").sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR")).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Nº de Sessões *</label>
                  <input className="form-input" type="number" min="1" max="40" placeholder="Ex: 10" value={formPacote.totalSessoes} onChange={e=>setFormPacote({...formPacote,totalSessoes:e.target.value})}/>
                </div>
                <div className="form-group"><label className="form-label">Recorrência *</label>
                  <select className="form-input" value={formPacote.recorrencia} onChange={e=>setFormPacote({...formPacote,recorrencia:e.target.value,diasSemana:[],horariosPorDia:{}})}>
                    {RECORRENCIAS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                {needDias&&(
                  <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <label className="form-label">Dias da Semana * (escolha {maxDias})</label>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                      {DIAS.map(d=>{
                        const sel=diasSel.includes(d.v);
                        const dis=!sel&&diasSel.length>=maxDias;
                        return(
                          <div key={d.v} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                            <button type="button" onClick={()=>toggleDia(d.v)} disabled={dis}
                              style={{padding:"8px 14px",borderRadius:10,border:"1.5px solid",borderColor:sel?"var(--purple)":"#e5e7eb",background:sel?"var(--purple)":"white",color:sel?"white":dis?"#d1d5db":"#374151",fontWeight:sel?700:400,cursor:dis?"not-allowed":"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>{d.l}</button>
                            {sel&&<input type="time" value={(formPacote.horariosPorDia||{})[d.v]||formPacote.horario||"09:00"}
                              onChange={e=>setFormPacote({...formPacote,horariosPorDia:{...(formPacote.horariosPorDia||{}),[d.v]:e.target.value}})}
                              style={{fontSize:11,border:"1px solid #e9d5ff",borderRadius:6,padding:"3px 6px",width:72,textAlign:"center",color:"var(--purple)",fontWeight:600}}/>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="form-group"><label className="form-label">Data de Início *</label>
                  <input className="form-input" type="date" value={formPacote.dataInicio} onChange={e=>setFormPacote({...formPacote,dataInicio:e.target.value})}/>
                </div>
                <div className="form-group"><label className="form-label">Horário {needDias?"(padrão)":""}</label>
                  <input className="form-input" type="time" value={formPacote.horario} onChange={e=>setFormPacote({...formPacote,horario:e.target.value})}/>
                </div>
                {/* Toggle Particular / Social / Parceria */}
                <div className="form-group" style={{gridColumn:"1/-1"}}>
                  <label className="form-label">Tipo de Atendimento</label>
                  <div style={{display:"flex",gap:8}}>
                    {[["particular","🏥 Particular"],["social","🌱 Social"],["parceria","🤝 Parceria"]].map(([v,l])=>(
                      <button key={v} type="button" onClick={()=>setFormPacote({...formPacote,tipoAtendimento:v,
                        valorSessao:v==="social"?"":formPacote.valorSessao,
                        valorSupervisaoSocial:v==="social"?"40":formPacote.valorSupervisaoSocial,
                        valorEstagiariaSocial:v==="social"?"20":formPacote.valorEstagiariaSocial,
                        percParceiro:v==="parceria"?(formPacote.percParceiro||"70"):formPacote.percParceiro})}
                        style={{flex:1,padding:"9px",borderRadius:8,border:"2px solid",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,
                          borderColor:(formPacote.tipoAtendimento||"particular")===v?
                            (v==="social"?"#0d9488":v==="parceria"?"#b45309":"#7B00C4"):"#e5e7eb",
                          background:(formPacote.tipoAtendimento||"particular")===v?
                            (v==="social"?"#ccfbf1":v==="parceria"?"#fef3c7":"#f5f3ff"):"white",
                          color:(formPacote.tipoAtendimento||"particular")===v?
                            (v==="social"?"#0d9488":v==="parceria"?"#b45309":"#7B00C4"):"#6b7280"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {(formPacote.tipoAtendimento||"particular")==="social"?(
                  <>
                    <div className="form-group">
                      <label className="form-label">Valor Supervisão (R$)</label>
                      <input className="form-input" type="number" value={formPacote.valorSupervisaoSocial||"40"}
                        onChange={e=>setFormPacote({...formPacote,valorSupervisaoSocial:e.target.value})}/>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:3}}>Receita da clínica</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Valor Estagiária (R$)</label>
                      <input className="form-input" type="number" value={formPacote.valorEstagiariaSocial||"20"}
                        onChange={e=>setFormPacote({...formPacote,valorEstagiariaSocial:e.target.value})}/>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:3}}>Comissão estagiária</div>
                    </div>
                  </>
                ):(
                  <>
                    <div className="form-group"><label className="form-label">Valor por Sessão (R$)</label>
                      <input className="form-input" type="number" placeholder="Ex: 250" value={formPacote.valorSessao} onChange={e=>setFormPacote({...formPacote,valorSessao:e.target.value})}/>
                    </div>
                    <div className="form-group"><label className="form-label">Total do Pacote (R$)</label>
                      <input className="form-input" type="number" placeholder="Automático" value={formPacote.valorSessao&&formPacote.totalSessoes?(parseFloat(formPacote.valorSessao)||0)*(parseInt(formPacote.totalSessoes)||0):""} readOnly style={{background:"#f9fafb"}}/>
                    </div>
                    {(formPacote.tipoAtendimento||"particular")==="parceria"&&(
                      <>
                        <div className="form-group">
                          <label className="form-label">Parceira</label>
                          <select className="form-input" value={formPacote.parceiraId||""}
                            onChange={e=>{
                              const p=parceiras.find(x=>x.id===e.target.value);
                              setFormPacote({...formPacote,parceiraId:e.target.value,
                                percParceiro:(p&&p.percentual)?String(p.percentual):(formPacote.percParceiro||"70")});
                            }}>
                            <option value="">Selecione a parceira...</option>
                            {parceiras.filter(p=>p.tipo!=="estagiaria").map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                          </select>
                          {parceiras.filter(p=>p.tipo!=="estagiaria").length===0&&<div style={{fontSize:11,color:"#b45309",marginTop:3}}>Nenhuma parceira cadastrada — cadastre na tela Comissões.</div>}
                        </div>
                        <div className="form-group">
                          <label className="form-label">% do Parceiro</label>
                          <input className="form-input" type="number" min="0" max="100" value={formPacote.percParceiro||"70"}
                            onChange={e=>setFormPacote({...formPacote,percParceiro:e.target.value})}/>
                          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:3}}>Editável — padrão 70%</div>
                        </div>
                        {formPacote.valorSessao&&formPacote.totalSessoes&&(()=>{
                          const tot=(parseFloat(formPacote.valorSessao)||0)*(parseInt(formPacote.totalSessoes)||0);
                          const pp=parseFloat(formPacote.percParceiro)||0;
                          const vParc=tot*pp/100;
                          return (
                            <div style={{gridColumn:"1/-1",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",fontSize:13}}>
                              <div style={{fontWeight:700,color:"#b45309",marginBottom:6}}>🤝 Cálculo da parceria</div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:"6px 18px",color:"#374151"}}>
                                <span>Total: <strong>R$ {tot.toFixed(2).replace(".",",")}</strong></span>
                                <span>Repasse parceira ({pp}%): <strong style={{color:"#b45309"}}>R$ {vParc.toFixed(2).replace(".",",")}</strong></span>
                                <span>Clínica antes da comissão: <strong style={{color:"#059669"}}>R$ {(tot-vParc).toFixed(2).replace(".",",")}</strong></span>
                              </div>
                              <div style={{fontSize:11,color:"#92400e",marginTop:6}}>A comissão da secretária (10% ou 5% sobre o total) é definida no botão de salvar abaixo.</div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </>
                )}
                {/* Pagamento */}
                <div className="form-group" style={{gridColumn:"1/-1"}}>
                  <label className="form-label">Status do Pagamento</label>
                  <div style={{display:"flex",gap:8}}>
                    {[["pendente","Pendente","#d97706"],["recebido","✓ Recebido","#059669"]].map(([v,l,c])=>(
                      <button key={v} type="button" onClick={()=>setFormPacote({...formPacote,statusPag:v})}
                        style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid",borderColor:(formPacote.statusPag||"pendente")===v?c:"#e5e7eb",background:(formPacote.statusPag||"pendente")===v?c+"15":"white",color:(formPacote.statusPag||"pendente")===v?c:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Forma de Pagamento</label>
                  <select className="form-input" value={formPacote.formaPag||""} onChange={e=>setFormPacote({...formPacote,formaPag:e.target.value})}>
                    <option value="">Selecionar...</option>
                    {FORMAS.map(f=><option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Data do Pagamento</label>
                  <input className="form-input" type="date" value={formPacote.dataPagamento||""} onChange={e=>setFormPacote({...formPacote,dataPagamento:e.target.value})}/>
                </div>
                <div className="form-group" style={{gridColumn:"1/-1"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <label className="form-label" style={{margin:0}}>Formas de pagamento</label>
                      <button type="button" style={{fontSize:12,color:"#7B00C4",background:"#f3e6ff",border:"1px solid #d9b3f5",borderRadius:6,padding:"3px 10px",cursor:"pointer"}}
                        onClick={()=>setFormPacote({...formPacote,pagamentosExtras:[...(formPacote.pagamentosExtras||[]),{forma:"",valor:"",data:new Date().toISOString().slice(0,10)}]})}>
                        + Adicionar forma
                      </button>
                    </div>
                    {(formPacote.pagamentosExtras||[]).length===0&&(
                      <div style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic",padding:"6px 0"}}>Clique em "+ Adicionar forma" para registrar PIX, cartão, dinheiro em datas diferentes.</div>
                    )}
                    {(formPacote.pagamentosExtras||[]).map((pg,i)=>(
                      <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:6,marginBottom:6,alignItems:"center"}}>
                        <select className="form-input" style={{fontSize:12}} value={pg.forma} onChange={e=>{const p=[...(formPacote.pagamentosExtras||[])];p[i]={...p[i],forma:e.target.value};setFormPacote({...formPacote,pagamentosExtras:p});}}>
                          <option value="">Forma...</option>{FORMAS.map(f=><option key={f}>{f}</option>)}
                        </select>
                        <input className="form-input" style={{fontSize:12}} type="number" placeholder="Valor R$" value={pg.valor} onChange={e=>{const p=[...(formPacote.pagamentosExtras||[])];p[i]={...p[i],valor:e.target.value};setFormPacote({...formPacote,pagamentosExtras:p});}}/>
                        <input className="form-input" style={{fontSize:12}} type="date" value={pg.data} onChange={e=>{const p=[...(formPacote.pagamentosExtras||[])];p[i]={...p[i],data:e.target.value};setFormPacote({...formPacote,pagamentosExtras:p});}}/>
                        <button type="button" style={{color:"#dc2626",background:"none",border:"none",cursor:"pointer",fontSize:16,padding:"0 4px"}} onClick={()=>{const p=[...(formPacote.pagamentosExtras||[])];p.splice(i,1);setFormPacote({...formPacote,pagamentosExtras:p});}}>✕</button>
                      </div>
                    ))}
                  </div>
                <div className="form-group" style={{gridColumn:"1/-1"}}><label className="form-label">Observações</label>
                  <TextAreaVoz className="form-input" rows={2} value={formPacote.obs} onChange={e=>setFormPacote({...formPacote,obs:e.target.value})} placeholder="Notas sobre o pacote..."/>
                </div>
              </div>
              {formPacote.totalSessoes&&formPacote.dataInicio&&(
                <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:12,marginBottom:14,fontSize:13,color:"#065f46"}}>
                  ✅ <strong>{formPacote.totalSessoes} sessões</strong> a partir de <strong>{new Date(formPacote.dataInicio+"T00:00:00").toLocaleDateString("pt-BR")}</strong> · <strong>{formPacote.recorrencia}</strong>
                  {needDias&&diasSel.length>0&&<span> · dias: <strong>{diasSel.map(d=>DIAS_LABEL[d]).join(", ")}</strong></span>}
                </div>
              )}
              <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
                <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                <button className="btn btn-ghost" onClick={()=>salvarPacote(null)} disabled={salvando}
                  style={{border:"1px solid #e5e7eb",color:"#6b7280",fontSize:12}} title="Sem comissão — para lançamentos passados">
                  📋 Sem comissão
                </button>
                <button className="btn btn-purple" onClick={()=>salvarPacote("primeira")} disabled={salvando}
                  style={{background:"#7B00C4"}} title="10% de comissão">
                  🌟 Primeira Venda
                </button>
                <button className="btn btn-purple" onClick={()=>salvarPacote("recorrente")} disabled={salvando}
                  style={{background:"#0891b2"}} title="5% de comissão">
                  🔁 Venda Recorrente
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// PAINEL GERAL — Dashboard consolidado (Pessoal + Clínica, todos os CCs)
// ───────────────────────────────────────────────────────────
function PainelGeral({ lancamentos, lancClinica, anoFiltro, setAnoFiltro, anos, fmt, mesLabel }){
  const CORES_CC = {
    "🏥 Clínica":"#7B00C4","🎵 Ônix Brasil":"#0891b2","🎶 Flamboyant":"#db2777",
    "⭐ Estrelas":"#d97706","🌱 Projetos Culturais":"#059669","📚 Consultorias & Cursos":"#2563eb",
    "🏢 Administrativo":"#6b7280","🏠 Pessoal":"#dc2626","—":"#9ca3af"
  };
  const CORES_CAT = ["#7B00C4","#0891b2","#db2777","#d97706","#059669","#2563eb","#dc2626","#6b7280","#9333ea","#16a34a","#ea580c","#0284c7"];

  // Normaliza lançamentos de ambas as origens em um formato único
  const normPessoal = lancamentos.map(l=>({
    tipo: l.tipo==="receita"?"receita":"despesa",
    valor: parseFloat(l.valor)||0,
    data: l.data||"",
    categoria: l.categoria||"Outros",
    centroCusto: l.centroCusto||"🏠 Pessoal",
    status: l.status||"pago",
  }));
  const normClinica = lancClinica.map(l=>({
    tipo: (l.tipo_lancamento==="despesa"||l.tipo==="despesa")?"despesa":"receita",
    valor: parseFloat(l.valor)||0,
    data: l.data||"",
    categoria: l.categoria||l.tipo||"Outros",
    centroCusto: l.centroCusto||"🏥 Clínica",
    status: l.status||"pago",
  }));
  const todos = [...normPessoal, ...normClinica];

  const pagos = t=>t.status==="pago"||t.status==="recebido";
  const doAno = todos.filter(l=>l.data?.startsWith(anoFiltro) && pagos(l));

  // Resumo por Centro de Custo
  const ccMap = {};
  doAno.forEach(l=>{
    const cc = l.centroCusto||"—";
    if(!ccMap[cc]) ccMap[cc]={receita:0,despesa:0};
    ccMap[cc][l.tipo] += l.valor;
  });
  const ccs = Object.entries(ccMap).map(([cc,v])=>({cc,...v,saldo:v.receita-v.despesa}))
    .sort((a,b)=>b.despesa-a.despesa);

  const totalReceita = doAno.filter(l=>l.tipo==="receita").reduce((a,l)=>a+l.valor,0);
  const totalDespesa = doAno.filter(l=>l.tipo==="despesa").reduce((a,l)=>a+l.valor,0);
  const saldoConsolidado = totalReceita-totalDespesa;
  const margem = totalReceita>0 ? (saldoConsolidado/totalReceita*100) : 0;

  // Comparativo com mês anterior
  const hoje = new Date();
  const mesAtualStr = hoje.toISOString().slice(0,7);
  const mesAnteriorDate = new Date(hoje.getFullYear(), hoje.getMonth()-1, 1);
  const mesAnteriorStr = mesAnteriorDate.toISOString().slice(0,7);
  const saldoMesAtual = (()=>{ const l=todos.filter(x=>x.data?.startsWith(mesAtualStr)&&pagos(x)); return l.filter(x=>x.tipo==="receita").reduce((a,x)=>a+x.valor,0) - l.filter(x=>x.tipo==="despesa").reduce((a,x)=>a+x.valor,0); })();
  const saldoMesAnterior = (()=>{ const l=todos.filter(x=>x.data?.startsWith(mesAnteriorStr)&&pagos(x)); return l.filter(x=>x.tipo==="receita").reduce((a,x)=>a+x.valor,0) - l.filter(x=>x.tipo==="despesa").reduce((a,x)=>a+x.valor,0); })();
  const variacaoMes = saldoMesAnterior!==0 ? ((saldoMesAtual-saldoMesAnterior)/Math.abs(saldoMesAnterior)*100) : (saldoMesAtual>0?100:0);

  // Despesas pendentes
  const pendentes = todos.filter(l=>l.status==="pendente"&&l.data?.startsWith(anoFiltro));
  const totalPendente = pendentes.reduce((a,l)=>a+l.valor,0);

  // Top 5 maiores despesas do mês atual
  const despesasMesAtual = todos.filter(l=>l.tipo==="despesa"&&l.data?.startsWith(mesAtualStr)&&pagos(l)).sort((a,b)=>b.valor-a.valor).slice(0,5);

  // Evolução últimos 12 meses (saldo total)
  const meses12 = Array.from({length:12},(_,i)=>{
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-11+i, 1);
    return d.toISOString().slice(0,7);
  });
  const evolucao = meses12.map(m=>{
    const l = todos.filter(x=>x.data?.startsWith(m)&&pagos(x));
    const rec = l.filter(x=>x.tipo==="receita").reduce((a,x)=>a+x.valor,0);
    const desp = l.filter(x=>x.tipo==="despesa").reduce((a,x)=>a+x.valor,0);
    return {mes:m, saldo:rec-desp, receita:rec, despesa:desp};
  });

  // Despesas por categoria (geral, todos os CCs)
  const catMap = {};
  doAno.filter(l=>l.tipo==="despesa").forEach(l=>{
    catMap[l.categoria] = (catMap[l.categoria]||0) + l.valor;
  });
  const categorias = Object.entries(catMap).map(([cat,v])=>({cat,valor:v})).sort((a,b)=>b.valor-a.valor);

  const maxDespCC = Math.max(1,...ccs.map(c=>Math.max(c.receita,c.despesa)));
  const maxEvol = Math.max(1,...evolucao.map(e=>Math.max(Math.abs(e.saldo),e.receita,e.despesa)));

  // Donut SVG — despesas por CC
  function Donut(){
    const total = ccs.reduce((a,c)=>a+c.despesa,0);
    if(total<=0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem despesas no período.</div>;
    let acc=0;
    const r=70, cx=90, cy=90, circ=2*Math.PI*r;
    return (
      <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="22"/>
          {ccs.filter(c=>c.despesa>0).map((c,i)=>{
            const frac = c.despesa/total;
            const dash = frac*circ;
            const offset = circ - acc;
            const el = <circle key={c.cc} cx={cx} cy={cy} r={r} fill="none" stroke={CORES_CC[c.cc]||CORES_CAT[i%CORES_CAT.length]} strokeWidth="22"
              strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset} transform={`rotate(-90 ${cx} ${cy})`}/>;
            acc += dash;
            return el;
          })}
          <text x={cx} y={cy-4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">{fmt(total)}</text>
          <text x={cx} y={cy+14} textAnchor="middle" fontSize="10" fill="#6b7280">despesas {anoFiltro}</text>
        </svg>
        <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:160}}>
          {ccs.filter(c=>c.despesa>0).sort((a,b)=>b.despesa-a.despesa).map((c,i)=>(
            <div key={c.cc} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
              <div style={{width:10,height:10,borderRadius:3,background:CORES_CC[c.cc]||CORES_CAT[i%CORES_CAT.length],flexShrink:0}}/>
              <div style={{flex:1}}>{c.cc}</div>
              <div style={{fontWeight:700}}>{fmt(c.despesa)}</div>
              <div style={{color:"var(--text-muted)",width:42,textAlign:"right"}}>{(c.despesa/total*100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Barras — receita vs despesa por CC
  function BarrasCC(){
    if(ccs.length===0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem dados no período.</div>;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {ccs.map(c=>(
          <div key={c.cc}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
              <span style={{fontWeight:600}}>{c.cc}</span>
              <span style={{color:c.saldo>=0?"#059669":"#dc2626",fontWeight:700}}>{fmt(c.saldo)}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:60,fontSize:10,color:"#059669"}}>Receita</div>
                <div style={{flex:1,background:"#f3f4f6",borderRadius:4,height:10,overflow:"hidden"}}>
                  <div style={{width:`${(c.receita/maxDespCC*100)}%`,height:"100%",background:"#10b981",borderRadius:4}}/>
                </div>
                <div style={{width:80,fontSize:11,textAlign:"right"}}>{fmt(c.receita)}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:60,fontSize:10,color:"#dc2626"}}>Despesa</div>
                <div style={{flex:1,background:"#f3f4f6",borderRadius:4,height:10,overflow:"hidden"}}>
                  <div style={{width:`${(c.despesa/maxDespCC*100)}%`,height:"100%",background:"#ef4444",borderRadius:4}}/>
                </div>
                <div style={{width:80,fontSize:11,textAlign:"right"}}>{fmt(c.despesa)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Linha — evolução do saldo (12 meses)
  function LinhaEvolucao(){
    const w=600,h=160,pad=30;
    const pontos = evolucao.map((e,i)=>{
      const x = pad + (i/(evolucao.length-1))*(w-2*pad);
      const yZero = h/2;
      const scale = (h/2-10)/maxEvol;
      const y = yZero - e.saldo*scale;
      return {x,y,...e};
    });
    const path = pontos.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
    return (
      <div style={{overflowX:"auto"}}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{minWidth:500}}>
          <line x1={pad} y1={h/2} x2={w-pad} y2={h/2} stroke="#e5e7eb" strokeWidth="1"/>
          <path d={path} fill="none" stroke="#7B00C4" strokeWidth="2.5"/>
          {pontos.map((p,i)=>(
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill={p.saldo>=0?"#059669":"#dc2626"}/>
              <text x={p.x} y={h-6} textAnchor="middle" fontSize="9" fill="#9ca3af">{mesLabel(p.mes)}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // Barras — despesas por categoria (geral)
  function BarrasCategorias(){
    const top = categorias.slice(0,10);
    const max = Math.max(1,...top.map(c=>c.valor));
    if(top.length===0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem despesas no período.</div>;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {top.map((c,i)=>(
          <div key={c.cat} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:130,fontSize:12,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.cat}</div>
            <div style={{flex:1,background:"#f3f4f6",borderRadius:4,height:14,overflow:"hidden"}}>
              <div style={{width:`${(c.valor/max*100)}%`,height:"100%",background:CORES_CAT[i%CORES_CAT.length],borderRadius:4}}/>
            </div>
            <div style={{width:90,fontSize:12,fontWeight:700,textAlign:"right"}}>{fmt(c.valor)}</div>
          </div>
        ))}
      </div>
    );
  }


  // ── Plano de Contas — agrupamento por categoria real ──
  const PLANO_CONTAS = {
    "Marketing / Tráfego Pago": ["Marketing","Tráfego Pago","Publicidade","Redes Sociais","Google Ads"],
    "Ferramentas Digitais": ["Ferramentas de IA","Software","Assinaturas","ElevenLabs","Tecnologia","Internet","Telefone / Internet"],
    "Ocupação / Aluguel": ["Aluguel","Condomínio","Sublocação","Energia / Água","Manutenção","IPTU"],
    "Repasses / Comissões": ["Salário Secretária","Repasse","Comissão","Parceria","Estagiária"],
    "Educação / Capacitação": ["Cursos e Capacitação","Educação","Livros","Supervisão","Desenvolvimento Pessoal"],
    "Saúde / Bem-estar": ["Saúde","Plano de Saúde","Medicamentos","Consultas"],
    "Gastos Domésticos": ["Moradia","Alimentação","Transporte","Vestuário","Lazer / Entretenimento","Lazer","Saneago","Seguro","Consórcio"],
    "Outros": [],
  };
  function mapearPlano(cat) {
    if(!cat) return "Outros";
    const c = cat.trim();
    for(const [grupo, cats] of Object.entries(PLANO_CONTAS)) {
      if(cats.some(k=>c.toLowerCase().includes(k.toLowerCase())||k.toLowerCase().includes(c.toLowerCase()))) return grupo;
    }
    return "Outros";
  }
  const CORES_PLANO = [
    "#7B00C4","#0891b2","#db2777","#d97706","#059669","#2563eb","#dc2626","#9ca3af"
  ];
  const planoMap = {};
  doAno.filter(l=>l.tipo==="despesa").forEach(l=>{
    const grupo = mapearPlano(l.categoria);
    planoMap[grupo] = (planoMap[grupo]||0) + l.valor;
  });
  const planoData = Object.entries(planoMap)
    .filter(([,v])=>v>0)
    .sort(([,a],[,b])=>b-a)
    .map(([cat,valor],i)=>({cat,valor,cor:CORES_PLANO[i%CORES_PLANO.length]}));

  function DonutPlano(){
    const total = planoData.reduce((a,p)=>a+p.valor,0);
    if(total<=0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem despesas no período.</div>;
    let acc=0;
    const r=70,cx=90,cy=90,circ=2*Math.PI*r;
    return (
      <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="22"/>
          {planoData.map((p,i)=>{
            const frac=p.valor/total;
            const dash=frac*circ;
            const offset=circ-acc;
            const el=<circle key={p.cat} cx={cx} cy={cy} r={r} fill="none" stroke={p.cor} strokeWidth="22"
              strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset} transform={`rotate(-90 ${cx} ${cy})`}/>;
            acc+=dash;
            return el;
          })}
          <text x={cx} y={cy-4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#111827">{fmt(total)}</text>
          <text x={cx} y={cy+14} textAnchor="middle" fontSize="10" fill="#6b7280">despesas {anoFiltro}</text>
        </svg>
        <div style={{display:"flex",flexDirection:"column",gap:5,flex:1,minWidth:180}}>
          {planoData.map(p=>(
            <div key={p.cat} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
              <div style={{width:10,height:10,borderRadius:3,background:p.cor,flexShrink:0}}/>
              <div style={{flex:1,lineHeight:1.3}}>{p.cat}</div>
              <div style={{fontWeight:700,flexShrink:0}}>{fmt(p.valor)}</div>
              <div style={{color:"var(--text-muted)",width:38,textAlign:"right",flexShrink:0}}>{(p.valor/total*100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function BarrasPlano(){
    if(planoData.length===0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem dados.</div>;
    const max=Math.max(1,...planoData.map(p=>p.valor));
    return(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {planoData.map(p=>(
          <div key={p.cat}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
              <span style={{fontWeight:600}}>{p.cat}</span>
              <span style={{fontWeight:700,color:p.cor}}>{fmt(p.valor)}</span>
            </div>
            <div style={{background:"#f3f4f6",borderRadius:6,height:12,overflow:"hidden"}}>
              <div style={{width:`${(p.valor/max*100)}%`,height:"100%",background:p.cor,borderRadius:6,transition:".4s"}}/>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Seletor Ano */}
      <div style={{display:"flex",gap:6,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",flexShrink:0}}>Ano:</span>
        {anos.map(a=>(
          <button key={a} onClick={()=>setAnoFiltro(a)}
            style={{padding:"5px 16px",borderRadius:20,border:"1.5px solid",borderColor:anoFiltro===a?"var(--purple)":"#e5e7eb",background:anoFiltro===a?"var(--purple)":"white",color:anoFiltro===a?"white":"#6b7280",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            {a}
          </button>
        ))}
      </div>

      {/* Indicadores */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        <div style={{background:saldoConsolidado>=0?"#d1fae5":"#fee2e2",borderRadius:12,padding:"14px 16px",border:"1.5px solid",borderColor:saldoConsolidado>=0?"#6ee7b7":"#fca5a5"}}>
          <div style={{fontSize:11,fontWeight:600,color:saldoConsolidado>=0?"#059669":"#dc2626",marginBottom:4}}>Saldo Consolidado ({anoFiltro})</div>
          <div style={{fontSize:20,fontWeight:800,color:saldoConsolidado>=0?"#059669":"#dc2626"}}>{fmt(saldoConsolidado)}</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>+{fmt(totalReceita)} / -{fmt(totalDespesa)}</div>
        </div>
        <div style={{background:"#f0f9ff",borderRadius:12,padding:"14px 16px",border:"1.5px solid #93c5fd"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#2563eb",marginBottom:4}}>Margem</div>
          <div style={{fontSize:20,fontWeight:800,color:"#2563eb"}}>{margem.toFixed(1)}%</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>(receita - despesa) / receita</div>
        </div>
        <div style={{background:variacaoMes>=0?"#f0fdf4":"#fef2f2",borderRadius:12,padding:"14px 16px",border:"1.5px solid",borderColor:variacaoMes>=0?"#86efac":"#fca5a5"}}>
          <div style={{fontSize:11,fontWeight:600,color:variacaoMes>=0?"#059669":"#dc2626",marginBottom:4}}>Vs. mês anterior</div>
          <div style={{fontSize:20,fontWeight:800,color:variacaoMes>=0?"#059669":"#dc2626"}}>{variacaoMes>=0?"▲":"▼"} {Math.abs(variacaoMes).toFixed(0)}%</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{fmt(saldoMesAnterior)} → {fmt(saldoMesAtual)}</div>
        </div>
        <div style={{background:"#fffbeb",borderRadius:12,padding:"14px 16px",border:"1.5px solid #fcd34d"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#d97706",marginBottom:4}}>Pendentes ({anoFiltro})</div>
          <div style={{fontSize:20,fontWeight:800,color:"#d97706"}}>{fmt(totalPendente)}</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{pendentes.length} lançamento(s)</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,marginBottom:20}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🥧 Despesas por Centro de Custo</div>
          <Donut/>
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📊 Receita vs Despesa por CC</div>
          <BarrasCC/>
        </div>
      </div>

      {/* Plano de Contas — gráfico por grupo de despesa */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,marginBottom:20}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🎯 Despesas por Plano de Contas</div>
          <DonutPlano/>
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📉 Distribuição por Grupo ({anoFiltro})</div>
          <BarrasPlano/>
        </div>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📈 Evolução do Saldo — últimos 12 meses</div>
        <LinhaEvolucao/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,marginBottom:20}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🏷️ Maiores Categorias de Despesa ({anoFiltro})</div>
          <BarrasCategorias/>
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🔝 Top 5 Maiores Despesas — {mesLabel(mesAtualStr)}</div>
          {despesasMesAtual.length===0
            ? <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem despesas neste mês.</div>
            : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {despesasMesAtual.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<despesasMesAtual.length-1?"1px solid var(--gray-100)":"none"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"#fee2e2",color:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{d.categoria}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>{d.centroCusto} · {d.data}</div>
                    </div>
                    <div style={{fontWeight:700,color:"#dc2626"}}>{fmt(d.valor)}</div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FINANCEIRO PESSOAL & EMPRESA — componente unificado por tipo
// ═══════════════════════════════════════════════════════

// Componente base reutilizável para Pessoal e Empresa
function FinanceiroBase({ titulo, subtitulo, colLanc, colRecorr, corAcento="#7B00C4", user }) {
  const [lancamentos, setLancamentos]   = useState([]);
  const [recorrentes, setRecorrentes]   = useState([]);
  const [anoFiltro, setAnoFiltro]       = useState(new Date().getFullYear()+"");
  const [mesFiltro, setMesFiltro]       = useState(new Date().toISOString().slice(0,7));
  const [filtroTipo, setFiltroTipo]     = useState("tudo");
  const [modal, setModal]               = useState(false);
  const [editando, setEditando]         = useState(null);
  const [salvando, setSalvando]         = useState(false);
  const [modalBaixa, setModalBaixa]     = useState(null);
  const [modalMover, setModalMover]     = useState(null); // {lanc, isRecorrente}
  const [movendoId, setMovendoId]       = useState(null);
  const [formBaixa, setFormBaixa]       = useState({valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",modo:"este"});
  const [formLanc, setFormLanc]         = useState({tipo:"despesa",categoria:"",descricao:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"});
  const [formRecorr, setFormRecorr]     = useState({tipo:"despesa",categoria:"",descricao:"",valorPrevisto:"",recorrencia:"Mensal",diaVencimento:"10",mesInicio:new Date().toISOString().slice(0,7),ativo:true,indeterminado:true,totalParcelas:""});
  const [abaModal, setAbaModal]         = useState("avulso");

  const FORMAS    = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Depósito","Transferência","Débito Automático","Outro"];
  const RECORRS   = ["Mensal","Semanal","Quinzenal","Bimestral","Trimestral","Semestral","Anual"];

  const CATS_REC_PES  = ["Pró-labore","Salário CLT","Professora CLT","Rendimento de Investimentos","Dividendos","Aluguel Recebido","Freelance","Outros"];
  const CATS_DES_PES  = ["Moradia","Aluguel","IPTU","Saneago","Energia / Água","Condomínio","Alimentação","Supermercado","Saúde","Plano de Saúde","Transporte","Combustível","Lazer","Vestuário","Viagem","Aporte em Investimentos","Seguro","Outros"];
  const CATS_REC_EMP  = ["Venda de Infoproduto","Consultoria","Curso Ministrado","Palestra","Licença","Outros"];
  const CATS_DES_EMP  = ["Marketing / Tráfego Pago","Ferramentas de IA","ElevenLabs","Designer / Freelancer","Equipamentos Digitais","Cursos / Treinamentos","Ônix Brasil","Contador","Impostos","Assinaturas","Outros"];

  const isPessoal = colLanc === "clinica_financeiro_pessoal";
  const catsRec   = isPessoal ? CATS_REC_PES : CATS_REC_EMP;
  const catsDes   = isPessoal ? CATS_DES_PES : CATS_DES_EMP;

  const DESTINOS = [
    {col:"clinica_financeiro_pessoal",  colRec:"clinica_fin_pessoal_recorrentes",  label:"💼 Financeiro Pessoal"},
    {col:"clinica_financeiro_empresa",  colRec:"clinica_fin_empresa_recorrentes",  label:"🏢 Financeiro Empresa"},
    {col:"clinica_lancamentos",         colRec:null,                               label:"🏥 Financeiro Clínica"},
  ].filter(d => d.col !== colLanc);

  useEffect(()=>{
    const u1 = db.collection(colLanc).onSnapshot(s=>{
      const docs = s.docs.map(d=>({id:d.id,...d.data()}));
      docs.sort((a,b)=>(b.data||"").localeCompare(a.data||""));
      setLancamentos(docs);
    },()=>{});
    const u2 = db.collection(colRecorr).onSnapshot(s=>{
      const docs = s.docs.map(d=>({id:d.id,...d.data()}));
      docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
      setRecorrentes(docs);
    },()=>{});
    return ()=>{ u1(); u2(); };
  },[colLanc, colRecorr]);

  const mesAtual = new Date().toISOString().slice(0,7);
  const anoAtualNum = new Date().getFullYear();
  const anosExist = [...new Set(lancamentos.map(l=>l.data?.slice(0,4)).filter(Boolean))].map(Number);
  const anos = [...new Set([...anosExist, anoAtualNum-1, anoAtualNum, anoAtualNum+1])].sort().map(String);
  const mesesDisp = Array.from({length:12},(_,i)=>`${anoFiltro}-${String(i+1).padStart(2,"0")}`);
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro)?mesFiltro:mesAtual.startsWith(anoFiltro)?mesAtual:anoFiltro+"-01";

  function fmt(v){ return (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
  function mesLabel(m){ try{ return new Date(m+"-02").toLocaleDateString("pt-BR",{month:"short"}); }catch(e){ return m; } }

  const lancMes = lancamentos.filter(l=>l.data?.startsWith(mesFiltroEfetivo));
  const lancAno = lancamentos.filter(l=>l.data?.startsWith(anoFiltro));

  function calcRec(l){ return l.filter(x=>x.tipo==="receita"&&(x.status==="pago"||x.status==="recebido")).reduce((a,x)=>a+(parseFloat(x.valor)||0),0); }
  function calcDes(l){ return l.filter(x=>x.tipo==="despesa"&&(x.status==="pago"||x.status==="recebido")).reduce((a,x)=>a+(parseFloat(x.valor)||0),0); }

  const recMes=calcRec(lancMes), desMes=calcDes(lancMes), saldoMes=recMes-desMes;
  const recAno=calcRec(lancAno), desAno=calcDes(lancAno);
  const pendMes=lancMes.filter(l=>l.status==="pendente").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  // Recorrentes ativos sem baixa neste mês
  const recorrAtivos = recorrentes.filter(r=>r.ativo!==false);
  function jaDeuBaixaMes(r){
    return lancamentos.some(l=>l.recorrenteId===r.id && l.data?.startsWith(mesFiltroEfetivo));
  }

  // Lista unificada: lançamentos do mês + recorrentes sem baixa
  const recSemBaixa = recorrAtivos.filter(r=>!jaDeuBaixaMes(r)).map(r=>({
    _virtual:true, id:r.id, tipo:r.tipo, categoria:r.categoria,
    descricao:r.descricao, valor:r.valorPrevisto, data:`${mesFiltroEfetivo}-${String(r.diaVencimento||10).padStart(2,"0")}`,
    status:"pendente", recorrenteId:r.id, _recObj:r
  }));
  const listaUnif = [...lancMes, ...recSemBaixa].sort((a,b)=>(b.data||"").localeCompare(a.data||""));
  const receitas  = filtroTipo==="despesa" ? [] : listaUnif.filter(l=>l.tipo==="receita");
  const despesas  = filtroTipo==="receita" ? [] : listaUnif.filter(l=>l.tipo==="despesa");

  function abrirNovo(tipo){ setFormLanc({tipo,categoria:"",descricao:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"}); setEditando(null); setAbaModal("avulso"); setModal("lanc"); }

  async function salvarLanc(){
    if(!formLanc.valor||!formLanc.data){alert("Valor e data obrigatórios.");return;}
    setSalvando(true);
    try {
      const val=parseFloat(formLanc.valor); const nParc=parseInt(formLanc.parcelas)||1;
      const base={tipo:formLanc.tipo,tipo_lancamento:formLanc.tipo==="despesa"?"despesa":"receita",categoria:formLanc.categoria||"Outros",descricao:formLanc.descricao||formLanc.categoria||"Lançamento",formaPag:formLanc.formaPag,status:formLanc.status,obs:formLanc.obs||"",createdAt:firebase.firestore.FieldValue.serverTimestamp()};
      if(editando){ await db.collection(colLanc).doc(editando).update({...base,valor:val,data:formLanc.data}); }
      else if(nParc>1){
        const batch=db.batch();
        const [a,m,d]=formLanc.data.split("-").map(Number);
        for(let i=0;i<nParc;i++){
          let mm=m+i,aa=a; while(mm>12){mm-=12;aa++;}
          const dp=`${aa}-${String(mm).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          batch.set(db.collection(colLanc).doc(),{...base,valor:val,data:dp,parcela:`${i+1}/${nParc}`,descricao:(formLanc.descricao||formLanc.categoria||"Lançamento")+` (${i+1}/${nParc})`});
        }
        await batch.commit();
      } else { await db.collection(colLanc).add({...base,valor:val,data:formLanc.data}); }
      setModal(false); setEditando(null);
    } catch(e){alert("Erro: "+e.message);}
    setSalvando(false);
  }

  async function salvarRecorr(){
    if(!formRecorr.categoria||!formRecorr.valorPrevisto){alert("Categoria e valor obrigatórios.");return;}
    setSalvando(true);
    try {
      const dados={...formRecorr,valorPrevisto:parseFloat(formRecorr.valorPrevisto),totalParcelas:formRecorr.indeterminado?0:(parseInt(formRecorr.totalParcelas)||0),indeterminado:!!formRecorr.indeterminado,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
      if(editando){ await db.collection(colRecorr).doc(editando).update(dados); }
      else { await db.collection(colRecorr).add(dados); }
      setModal(false); setEditando(null);
    } catch(e){alert("Erro: "+e.message);}
    setSalvando(false);
  }

  async function darBaixa(){
    if(!formBaixa.valor||!formBaixa.data){alert("Valor e data obrigatórios.");return;}
    setSalvando(true);
    try {
      const r=modalBaixa;
      await db.collection(colLanc).add({
        tipo: r.tipo||"despesa",
        tipo_lancamento: (r.tipo||"despesa")==="despesa"?"despesa":"receita",
        categoria: r.categoria||"",
        descricao: r.descricao||r.categoria||"",
        valor: parseFloat(formBaixa.valor),
        data: formBaixa.data,
        formaPag: formBaixa.formaPag||"PIX",
        status: "pago",
        recorrenteId: r.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setModalBaixa(null);
    } catch(e){ alert("Erro ao dar baixa: "+e.message); }
    finally { setSalvando(false); }
  }

  async function excluir(id){
    if(!confirm("Excluir este lançamento?")) return;
    try { await db.collection(colLanc).doc(id).delete(); }
    catch(e){ alert("Erro ao excluir: "+e.message); }
  }

  async function moverLancamento(lanc, destino, modoRecorr){
    setMovendoId(lanc.id);
    try {
      let dados = null;

      // Se é virtual (sem baixa), não tem doc em colLanc — usar os dados do próprio objeto
      if(lanc._virtual){
        const {_virtual, _recObj, ...rest} = lanc;
        dados = {...rest};
        // Para virtual, só mover o recorrente — não há lançamento real para mover
        if(destino.colRec && _recObj?.id){
          const rSnap = await db.collection(colRecorr).doc(_recObj.id).get();
          if(rSnap.exists){
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
      if(!snap.exists){ alert("Lançamento não encontrado."); setMovendoId(null); return; }
      dados = snap.data();

      // Gravar no destino
      if(destino.col==="clinica_lancamentos"){
        await db.collection("clinica_lancamentos").add({...dados, tipo_lancamento: dados.tipo==="despesa"?"despesa":dados.tipo_lancamento||"avulso"});
      } else {
        await db.collection(destino.col).add({...dados});
      }
      await db.collection(colLanc).doc(lanc.id).delete();

      // Mover recorrente vinculado se pedido
      if(lanc.recorrenteId && destino.colRec && modoRecorr==="todos"){
        const rSnap = await db.collection(colRecorr).doc(lanc.recorrenteId).get();
        if(rSnap.exists){
          await db.collection(destino.colRec).add(rSnap.data());
          await db.collection(colRecorr).doc(lanc.recorrenteId).delete();
        }
      }
      setModalMover(null);
    } catch(e){ alert("Erro ao mover: "+e.message); }
    finally { setMovendoId(null); }
  }

  const corRec="#059669"; const corDes="#dc2626";

  return (
    <div>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">{titulo}</div>
          <div className="page-subtitle">{subtitulo}</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>abrirNovo("receita")} className="btn" style={{background:"none",border:`1px solid ${corRec}`,color:corRec,borderRadius:8,padding:"8px 16px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"var(--font-body)"}}>
            <Icon name="plus" size={14}/> Nova Receita
          </button>
          <button onClick={()=>abrirNovo("despesa")} className="btn btn-purple" style={{padding:"8px 16px",fontSize:13}}>
            <Icon name="plus" size={14}/> Nova Despesa
          </button>
        </div>
      </div>

      {/* CARDS TOPO */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:24}}>
        <div className="card" style={{padding:20,background:saldoMes>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${saldoMes>=0?"#86efac":"#fca5a5"}`}}>
          <div style={{fontSize:11,fontWeight:600,color:saldoMes>=0?corRec:corDes,marginBottom:4}}>Saldo ({mesLabel(mesFiltroEfetivo)})</div>
          <div style={{fontSize:24,fontWeight:700,color:saldoMes>=0?corRec:corDes}}>{fmt(saldoMes)}</div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>+{fmt(recMes)} / -{fmt(desMes)}</div>
        </div>
        <div className="card" style={{padding:20,background:"#fffbeb",border:"1px solid #fde68a"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#d97706",marginBottom:4}}>Pendente ({anoFiltro})</div>
          <div style={{fontSize:24,fontWeight:700,color:"#d97706"}}>{fmt(pendMes)}</div>
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontSize:11,fontWeight:600,color:corRec,marginBottom:4}}>Receitas ({anoFiltro})</div>
          <div style={{fontSize:24,fontWeight:700,color:corRec}}>{fmt(recAno)}</div>
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontSize:11,fontWeight:600,color:corDes,marginBottom:4}}>Despesas ({anoFiltro})</div>
          <div style={{fontSize:24,fontWeight:700,color:corDes}}>{fmt(desAno)}</div>
        </div>
      </div>

      {/* FILTRO ANO */}
      <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
        <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:600}}>Ano:</span>
        {anos.map(a=>(
          <button key={a} onClick={()=>setAnoFiltro(a)} style={{padding:"4px 14px",borderRadius:20,border:"none",background:anoFiltro===a?"var(--purple)":"var(--gray-100)",color:anoFiltro===a?"white":"var(--gray-600)",fontWeight:anoFiltro===a?700:400,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>{a}</button>
        ))}
      </div>

      {/* FILTRO TIPO */}
      <div style={{display:"flex",gap:6,marginBottom:16,background:"var(--gray-50)",padding:6,borderRadius:12,width:"fit-content"}}>
        {[["tudo","📊 Tudo"],["receita","💰 Receitas"],["despesa","💸 Despesas"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltroTipo(v)} style={{padding:"6px 16px",borderRadius:8,border:"none",background:filtroTipo===v?"white":"transparent",color:filtroTipo===v?(v==="receita"?corRec:v==="despesa"?corDes:"var(--purple)"):"#6b7280",fontWeight:filtroTipo===v?700:500,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)",boxShadow:filtroTipo===v?"0 1px 4px rgba(0,0,0,.1)":"none",transition:".15s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* NAVEGAÇÃO MÊS */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,overflowX:"auto",scrollbarWidth:"none"}}>
        <button onClick={()=>{ const idx=mesesDisp.indexOf(mesFiltroEfetivo); if(idx>0)setMesFiltro(mesesDisp[idx-1]); }} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="chevron-left" size={14}/></button>
        {mesesDisp.map(m=>(
          <button key={m} onClick={()=>setMesFiltro(m)} style={{padding:"5px 14px",borderRadius:20,border:"none",background:m===mesFiltroEfetivo?"var(--purple)":"var(--gray-100)",color:m===mesFiltroEfetivo?"white":"var(--gray-600)",fontWeight:m===mesFiltroEfetivo?700:400,cursor:"pointer",fontSize:13,flexShrink:0,fontFamily:"var(--font-body)"}}>
            {mesLabel(m)}
          </button>
        ))}
        <button onClick={()=>{ const idx=mesesDisp.indexOf(mesFiltroEfetivo); if(idx<mesesDisp.length-1)setMesFiltro(mesesDisp[idx+1]); }} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="chevron-right" size={14}/></button>
      </div>

      {/* CARDS SALDO MÊS */}
      {filtroTipo!=="despesa"&&(
        <div style={{padding:"12px 20px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:12,marginBottom:12}}>
          <span style={{fontSize:12,color:corRec,fontWeight:600}}>TOTAL RECEITAS DO MÊS </span>
          <span style={{fontSize:18,fontWeight:700,color:corRec,marginLeft:8}}>{fmt(recMes)}</span>
        </div>
      )}
      {filtroTipo!=="receita"&&(
        <div style={{padding:"12px 20px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:12,marginBottom:12}}>
          <span style={{fontSize:12,color:corDes,fontWeight:600}}>TOTAL DESPESAS DO MÊS </span>
          <span style={{fontSize:18,fontWeight:700,color:corDes,marginLeft:8}}>{fmt(desMes)}</span>
        </div>
      )}

      {/* TABELA RECEITAS */}
      {receitas.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:14,color:corRec}}>🟢 Receitas</div>
            <div style={{fontWeight:700,color:corRec}}>{fmt(calcRec(receitas))}</div>
          </div>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"var(--gray-50)"}}>
                {["Data","Descrição","Categoria","Forma Pag.","Valor","Status","Ações"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:"var(--text-muted)",textAlign:"left",borderBottom:"1px solid var(--gray-200)"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {receitas.map((l,i)=>(
                  <tr key={l.id} style={{borderBottom:"1px solid var(--gray-100)",background:i%2===0?"white":"var(--gray-50)"}}>
                    <td style={{padding:"10px 14px",fontSize:13,color:"var(--text-muted)",whiteSpace:"nowrap"}}>
                      {l.data}
                      {l._virtual&&<span style={{fontSize:10,background:"#fef3c7",color:"#b45309",padding:"1px 6px",borderRadius:20,fontWeight:600,marginLeft:6}}>sem baixa</span>}
                    </td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:500}}>{l.descricao||l.categoria||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-muted)"}}>{l.categoria||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-muted)"}}>{l.formaPag||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,color:corRec,whiteSpace:"nowrap"}}>{fmt(l.valor)}</td>
                    <td style={{padding:"10px 14px"}}>
                      <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600,background:l.status==="pago"||l.status==="recebido"?"#d1fae5":"#fef3c7",color:l.status==="pago"||l.status==="recebido"?"#065f46":"#b45309"}}>
                        {l.status==="pago"||l.status==="recebido"?"✓ Recebido":"Pendente"}
                      </span>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                        {l._virtual&&(
                          <button onClick={()=>{ setModalBaixa(l._recObj); setFormBaixa({valor:l.valor+"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",modo:"este"}); }} style={{fontSize:11,background:"#d1fae5",color:"#065f46",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontWeight:600}}>Dar baixa</button>
                        )}
                        {!l._virtual&&(<>
                          <button onClick={()=>{ setFormLanc({tipo:l.tipo,categoria:l.categoria||"",descricao:l.descricao||"",valor:l.valor+"",data:l.data,formaPag:l.formaPag||"PIX",status:l.status||"pago",obs:l.obs||"",parcelas:"1"}); setEditando(l.id); setAbaModal("avulso"); setModal("lanc"); }} style={{background:"none",border:"none",cursor:"pointer",color:"var(--purple)",padding:"3px 6px"}} title="Editar"><Icon name="pencil" size={13}/></button>
                          <button onClick={()=>excluir(l.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",padding:"3px 6px"}} title="Excluir"><Icon name="trash-2" size={13}/></button>
                        </>)}
                        <button onClick={()=>setModalMover({lanc:l._virtual?{...l,id:l._recObj.id}:l,isRecorrente:true})} title="Mover para outro financeiro" style={{background:"#f3f0ff",border:"none",cursor:"pointer",color:"#7B00C4",padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:600}}>↗ Mover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABELA DESPESAS */}
      {despesas.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:14,color:corDes}}>🔴 Despesas</div>
            <div style={{fontWeight:700,color:corDes}}>{fmt(calcDes(despesas))}</div>
          </div>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"var(--gray-50)"}}>
                {["Data","Descrição","Categoria","Forma Pag.","Valor","Status","Ações"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:"var(--text-muted)",textAlign:"left",borderBottom:"1px solid var(--gray-200)"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {despesas.map((l,i)=>(
                  <tr key={l.id} style={{borderBottom:"1px solid var(--gray-100)",background:i%2===0?"white":"var(--gray-50)"}}>
                    <td style={{padding:"10px 14px",fontSize:13,color:"var(--text-muted)",whiteSpace:"nowrap"}}>
                      {l.data}
                      {l._virtual&&<span style={{fontSize:10,background:"#fef3c7",color:"#b45309",padding:"1px 6px",borderRadius:20,fontWeight:600,marginLeft:6}}>sem baixa</span>}
                    </td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:500}}>{l.descricao||l.categoria||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-muted)"}}>{l.categoria||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-muted)"}}>{l.formaPag||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,color:corDes,whiteSpace:"nowrap"}}>{fmt(l.valor)}</td>
                    <td style={{padding:"10px 14px"}}>
                      <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600,background:l.status==="pago"?"#d1fae5":"#fef3c7",color:l.status==="pago"?"#065f46":"#b45309"}}>
                        {l.status==="pago"?"✓ Pago":"Pendente"}
                      </span>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                        {l._virtual&&(
                          <button onClick={()=>{ setModalBaixa(l._recObj); setFormBaixa({valor:l.valor+"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",modo:"este"}); }} style={{fontSize:11,background:"#d1fae5",color:"#065f46",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontWeight:600}}>Dar baixa</button>
                        )}
                        {!l._virtual&&(<>
                          <button onClick={()=>{ setFormLanc({tipo:l.tipo,categoria:l.categoria||"",descricao:l.descricao||"",valor:l.valor+"",data:l.data,formaPag:l.formaPag||"PIX",status:l.status||"pago",obs:l.obs||"",parcelas:"1"}); setEditando(l.id); setAbaModal("avulso"); setModal("lanc"); }} style={{background:"none",border:"none",cursor:"pointer",color:"var(--purple)",padding:"3px 6px"}} title="Editar"><Icon name="pencil" size={13}/></button>
                          <button onClick={()=>excluir(l.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",padding:"3px 6px"}} title="Excluir"><Icon name="trash-2" size={13}/></button>
                        </>)}
                        <button onClick={()=>setModalMover({lanc:l._virtual?{...l,id:l._recObj.id}:l,isRecorrente:true})} title="Mover para outro financeiro" style={{background:"#f3f0ff",border:"none",cursor:"pointer",color:"#7B00C4",padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:600}}>↗ Mover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {receitas.length===0&&despesas.length===0&&(
        <div style={{textAlign:"center",padding:40,color:"var(--text-muted)",fontSize:14}}>Nenhum lançamento em {mesLabel(mesFiltroEfetivo)} de {anoFiltro}.</div>
      )}

      {/* RODAPÉ SALDO */}
      <div style={{display:"flex",gap:16,alignItems:"center",justifyContent:"flex-end",padding:"16px 0",borderTop:"1px solid var(--gray-200)",flexWrap:"wrap"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--text-muted)"}}>Receitas</div><div style={{fontWeight:700,color:corRec}}>{fmt(recMes)}</div></div>
        <div style={{fontSize:18,color:"var(--text-muted)"}}>—</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--text-muted)"}}>Despesas</div><div style={{fontWeight:700,color:corDes}}>{fmt(desMes)}</div></div>
        <div style={{fontSize:18,color:"var(--text-muted)"}}>=</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--text-muted)"}}>Saldo do Mês</div><div style={{fontWeight:700,fontSize:18,color:saldoMes>=0?corRec:corDes}}>{fmt(saldoMes)}</div></div>
      </div>

      {/* MODAL LANÇAMENTO */}
      {modal==="lanc"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>{setModal(false);setEditando(null);}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>{editando?"Editar":"Novo"} Lançamento</div>
              <button onClick={()=>{setModal(false);setEditando(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            {!editando&&(
              <div style={{display:"flex",gap:6,marginBottom:16,background:"var(--gray-50)",padding:4,borderRadius:10}}>
                {[["avulso","💰 Avulso"],["recorrente","🔁 Recorrente"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setAbaModal(v)} style={{flex:1,padding:"7px",border:"none",borderRadius:8,background:abaModal===v?"white":"transparent",color:abaModal===v?"var(--purple)":"#6b7280",fontWeight:abaModal===v?700:500,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>{l}</button>
                ))}
              </div>
            )}
            {abaModal==="avulso"?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={formLanc.tipo} onChange={e=>setFormLanc({...formLanc,tipo:e.target.value,categoria:""})}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-input" value={formLanc.categoria} onChange={e=>setFormLanc({...formLanc,categoria:e.target.value})}>
                    <option value="">Selecionar...</option>
                    {(formLanc.tipo==="receita"?catsRec:catsDes).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor (R$)</label>
                  <input className="form-input" type="number" step="0.01" value={formLanc.valor} onChange={e=>setFormLanc({...formLanc,valor:e.target.value})} placeholder="0,00"/>
                </div>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Descrição</label>
                  <input className="form-input" value={formLanc.descricao} onChange={e=>setFormLanc({...formLanc,descricao:e.target.value})} placeholder="Descrição opcional"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input className="form-input" type="date" value={formLanc.data} onChange={e=>setFormLanc({...formLanc,data:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Forma Pag.</label>
                  <select className="form-input" value={formLanc.formaPag} onChange={e=>setFormLanc({...formLanc,formaPag:e.target.value})}>
                    {FORMAS.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={formLanc.status} onChange={e=>setFormLanc({...formLanc,status:e.target.value})}>
                    <option value="pago">✓ Pago / Recebido</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Parcelas</label>
                  <input className="form-input" type="number" min="1" max="48" value={formLanc.parcelas} onChange={e=>setFormLanc({...formLanc,parcelas:e.target.value})}/>
                </div>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Observação</label>
                  <input className="form-input" value={formLanc.obs} onChange={e=>setFormLanc({...formLanc,obs:e.target.value})} placeholder="Opcional"/>
                </div>
                <div style={{gridColumn:"span 2",display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
                  {editando&&(
                    <button onClick={async()=>{if(confirm("Excluir este lançamento?")){await excluir(editando);setModal(false);setEditando(null);}}} style={{background:"none",border:"1px solid #dc2626",color:"#dc2626",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"var(--font-body)"}}>🗑️ Excluir</button>
                  )}
                  <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
                    <button onClick={()=>{setModal(false);setEditando(null);}} className="btn btn-ghost">Cancelar</button>
                    <button onClick={salvarLanc} disabled={salvando} className="btn btn-purple">{salvando?"Salvando...":"Salvar"}</button>
                  </div>
                </div>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={formRecorr.tipo} onChange={e=>setFormRecorr({...formRecorr,tipo:e.target.value,categoria:""})}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-input" value={formRecorr.categoria} onChange={e=>setFormRecorr({...formRecorr,categoria:e.target.value})}>
                    <option value="">Selecionar...</option>
                    {(formRecorr.tipo==="receita"?catsRec:catsDes).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor Previsto (R$)</label>
                  <input className="form-input" type="number" step="0.01" value={formRecorr.valorPrevisto} onChange={e=>setFormRecorr({...formRecorr,valorPrevisto:e.target.value})} placeholder="0,00"/>
                </div>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Descrição</label>
                  <input className="form-input" value={formRecorr.descricao} onChange={e=>setFormRecorr({...formRecorr,descricao:e.target.value})} placeholder="Ex: Aluguel apartamento"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Recorrência</label>
                  <select className="form-input" value={formRecorr.recorrencia} onChange={e=>setFormRecorr({...formRecorr,recorrencia:e.target.value})}>
                    {RECORRS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dia vencimento</label>
                  <input className="form-input" type="number" min="1" max="31" value={formRecorr.diaVencimento} onChange={e=>setFormRecorr({...formRecorr,diaVencimento:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Início</label>
                  <input className="form-input" type="month" value={formRecorr.mesInicio} onChange={e=>setFormRecorr({...formRecorr,mesInicio:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Duração</label>
                  <select className="form-input" value={formRecorr.indeterminado?"ind":"det"} onChange={e=>setFormRecorr({...formRecorr,indeterminado:e.target.value==="ind"})}>
                    <option value="ind">Indeterminado</option>
                    <option value="det">Número fixo de meses</option>
                  </select>
                </div>
                {!formRecorr.indeterminado&&(
                  <div className="form-group">
                    <label className="form-label">Qtd meses</label>
                    <input className="form-input" type="number" min="1" value={formRecorr.totalParcelas} onChange={e=>setFormRecorr({...formRecorr,totalParcelas:e.target.value})}/>
                  </div>
                )}
                <div style={{gridColumn:"span 2",display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>{setModal(false);setEditando(null);}} className="btn btn-ghost">Cancelar</button>
                  <button onClick={salvarRecorr} disabled={salvando} className="btn btn-purple">{salvando?"Salvando...":"Salvar"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DAR BAIXA */}
      {modalBaixa&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:20}} onClick={()=>setModalBaixa(null)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:16}}>Dar baixa — {modalBaixa.descricao||modalBaixa.categoria}</div>
            <div className="form-group"><label className="form-label">Valor pago</label><input className="form-input" type="number" step="0.01" value={formBaixa.valor} onChange={e=>setFormBaixa({...formBaixa,valor:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={formBaixa.data} onChange={e=>setFormBaixa({...formBaixa,data:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Forma Pag.</label><select className="form-input" value={formBaixa.formaPag} onChange={e=>setFormBaixa({...formBaixa,formaPag:e.target.value})}>{FORMAS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModalBaixa(null)} className="btn btn-ghost">Cancelar</button>
              <button onClick={darBaixa} disabled={salvando} className="btn btn-purple">{salvando?"Salvando...":"Confirmar baixa"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVER */}
      {modalMover&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,padding:20}} onClick={()=>setModalMover(null)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:8}}>↗ Mover lançamento</div>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>
              <strong>{modalMover.lanc.descricao||modalMover.lanc.categoria}</strong> — {fmt(modalMover.lanc.valor)}<br/>
              Para onde deseja mover?
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {DESTINOS.map(dest=>(
                <div key={dest.col}>
                  {modalMover.isRecorrente&&dest.colRec?(
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>moverLancamento(modalMover.lanc,dest,"este")} disabled={!!movendoId} style={{flex:1,padding:"10px",border:"1px solid #e5e7eb",borderRadius:10,background:"white",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"var(--font-body)"}}>
                        {movendoId===modalMover.lanc.id?"Movendo...":dest.label+" (só este)"}
                      </button>
                      <button onClick={()=>moverLancamento(modalMover.lanc,dest,"todos")} disabled={!!movendoId} style={{flex:1,padding:"10px",border:"2px solid var(--purple)",borderRadius:10,background:"#f3f0ff",cursor:"pointer",fontSize:13,fontWeight:700,color:"var(--purple)",fontFamily:"var(--font-body)"}}>
                        {dest.label+" + recorrente"}
                      </button>
                    </div>
                  ):(
                    <button onClick={()=>moverLancamento(modalMover.lanc,dest,"este")} disabled={!!movendoId} style={{width:"100%",padding:"12px",border:"1px solid #e5e7eb",borderRadius:10,background:"white",cursor:"pointer",fontSize:14,fontWeight:600,fontFamily:"var(--font-body)",textAlign:"left"}}>
                      {movendoId===modalMover.lanc.id?"Movendo...":dest.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid #fee2e2",paddingTop:14,marginTop:4,display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:12,fontWeight:600,color:"#dc2626",marginBottom:2}}>🗑️ Excluir</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={async()=>{if(confirm("Excluir só este lançamento?")){await excluir(modalMover.lanc.id);setModalMover(null);}}} disabled={!!movendoId} style={{flex:1,padding:"9px",border:"1px solid #fca5a5",borderRadius:10,background:"#fef2f2",cursor:"pointer",fontSize:13,fontWeight:600,color:"#dc2626",fontFamily:"var(--font-body)"}}>
                  Excluir só este
                </button>
                {modalMover.isRecorrente&&modalMover.lanc.recorrenteId&&(
                  <button onClick={async()=>{if(confirm("Excluir este e desativar o recorrente?")){await excluir(modalMover.lanc.id);await db.collection(colRecorr).doc(modalMover.lanc.recorrenteId).update({ativo:false});setModalMover(null);}}} disabled={!!movendoId} style={{flex:1,padding:"9px",border:"2px solid #dc2626",borderRadius:10,background:"#fef2f2",cursor:"pointer",fontSize:13,fontWeight:700,color:"#dc2626",fontFamily:"var(--font-body)"}}>
                    Excluir + desativar recorrente
                  </button>
                )}
              </div>
            </div>
            <button onClick={()=>setModalMover(null)} className="btn btn-ghost" style={{width:"100%",marginTop:8}}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceiroPessoal({ somenteLeitura=false }) {
  return <FinanceiroBase
    titulo="Financeiro Pessoal"
    subtitulo="Receitas e despesas pessoais — moradia, saúde, alimentação, investimentos"
    colLanc="clinica_financeiro_pessoal"
    colRecorr="clinica_fin_pessoal_recorrentes"
  />;
}

function FinanceiroEmpresa({ somenteLeitura=false }) {
  return <FinanceiroBase
    titulo="Financeiro Empresa"
    subtitulo="Negócio digital — Ônix Brasil, infoprodutos, marketing, ferramentas, treinamentos"
    colLanc="clinica_financeiro_empresa"
    colRecorr="clinica_fin_empresa_recorrentes"
  />;
}

function PainelGeralFinanceiro() {
  const [dados, setDados] = useState({clinica:[],pessoal:[],empresa:[]});
  const [ano, setAno]     = useState(new Date().getFullYear()+"");
  const [mesSel, setMesSel] = useState(new Date().toISOString().slice(0,7));
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let d={clinica:[],pessoal:[],empresa:[]}; let count=0;
    function check(){ count++; if(count===3){setDados({...d});setLoading(false);} }
    db.collection("clinica_lancamentos").onSnapshot(s=>{d.clinica=s.docs.map(x=>({id:x.id,...x.data()}));check();},()=>check());
    db.collection("clinica_financeiro_pessoal").onSnapshot(s=>{d.pessoal=s.docs.map(x=>({id:x.id,...x.data()}));check();},()=>check());
    db.collection("clinica_financeiro_empresa").onSnapshot(s=>{d.empresa=s.docs.map(x=>({id:x.id,...x.data()}));check();},()=>check());
  },[]);

  function fmt(v){ return (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
  function mesLabel(m,longo){ try{ return new Date(m+"-02").toLocaleDateString("pt-BR",{month:longo?"long":"short"}); }catch(e){return m;} }
  function isRec(l){ return l.tipo!=="despesa"&&l.tipo_lancamento!=="despesa"; }
  function isDes(l){ return l.tipo==="despesa"||l.tipo_lancamento==="despesa"; }
  function isPago(l){ return l.status==="pago"||l.status==="recebido"; }

  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().toISOString().slice(0,7);
  const anosDisp = [...new Set([...dados.clinica,...dados.pessoal,...dados.empresa].map(l=>l.data?.slice(0,4)).filter(Boolean).map(Number))];
  const anos = [...new Set([...anosDisp,anoAtual-1,anoAtual,anoAtual+1])].sort().map(String);
  const mesesAno = Array.from({length:12},(_,i)=>`${ano}-${String(i+1).padStart(2,"0")}`);
  const todas = [...dados.clinica,...dados.pessoal,...dados.empresa];

  function calcPeriodo(lista, prefixo){
    const l = lista.filter(x=>x.data?.startsWith(prefixo));
    return {
      rec: l.filter(x=>isRec(x)&&isPago(x)).reduce((a,x)=>a+(parseFloat(x.valor)||0),0),
      des: l.filter(x=>isDes(x)&&isPago(x)).reduce((a,x)=>a+(parseFloat(x.valor)||0),0),
      pend: l.filter(x=>x.status==="pendente").reduce((a,x)=>a+(parseFloat(x.valor)||0),0),
    };
  }

  // Anual
  const aCl=calcPeriodo(dados.clinica,ano), aPs=calcPeriodo(dados.pessoal,ano), aEm=calcPeriodo(dados.empresa,ano);
  const totalRec=aCl.rec+aPs.rec+aEm.rec, totalDes=aCl.des+aPs.des+aEm.des, totalSaldo=totalRec-totalDes;
  const totalPend=aCl.pend+aPs.pend+aEm.pend;

  // Mês selecionado
  const mCl=calcPeriodo(dados.clinica,mesSel), mPs=calcPeriodo(dados.pessoal,mesSel), mEm=calcPeriodo(dados.empresa,mesSel);
  const mesRec=mCl.rec+mPs.rec+mEm.rec, mesDes=mCl.des+mPs.des+mEm.des, mesSaldo=mesRec-mesDes;

  // Gráfico por mês
  const grafico = mesesAno.map(m=>{
    const rec = todas.filter(l=>l.data?.startsWith(m)&&isRec(l)&&isPago(l)).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
    const des = todas.filter(l=>l.data?.startsWith(m)&&isDes(l)&&isPago(l)).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
    return {mes:m, rec, des, saldo:rec-des};
  });
  const maxVal = Math.max(...grafico.map(g=>Math.max(g.rec,g.des)),1);
  const altBar = 160;

  if(loading) return <div style={{textAlign:"center",padding:60}}><Spinner/><div style={{marginTop:12,color:"var(--text-muted)"}}>Carregando...</div></div>;

  return (
    <div>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">Painel Geral</div>
          <div className="page-subtitle">Consolidado — Clínica + Pessoal + Empresa</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {anos.map(a=>(
            <button key={a} onClick={()=>{setAno(a);setMesSel(a===ano?mesSel:a+"-01");}} style={{padding:"6px 14px",borderRadius:20,border:"none",background:ano===a?"var(--purple)":"var(--gray-100)",color:ano===a?"white":"var(--gray-600)",fontWeight:ano===a?700:400,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>{a}</button>
          ))}
        </div>
      </div>

      {/* CARDS ANUAIS */}
      <div style={{marginBottom:8,fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Acumulado {ano}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        <div className="card" style={{padding:18,background:totalSaldo>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${totalSaldo>=0?"#86efac":"#fca5a5"}`}}>
          <div style={{fontSize:11,fontWeight:600,color:totalSaldo>=0?"#059669":"#dc2626",marginBottom:4}}>Saldo Total</div>
          <div style={{fontSize:20,fontWeight:700,color:totalSaldo>=0?"#059669":"#dc2626"}}>{fmt(totalSaldo)}</div>
          <div style={{fontSize:10,color:"var(--text-muted)",marginTop:4}}>+{fmt(totalRec)} / -{fmt(totalDes)}</div>
        </div>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#059669",marginBottom:4}}>Receitas {ano}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#059669"}}>{fmt(totalRec)}</div>
        </div>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#dc2626",marginBottom:4}}>Despesas {ano}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#dc2626"}}>{fmt(totalDes)}</div>
        </div>
        <div className="card" style={{padding:18,background:"#fffbeb",border:"1px solid #fde68a"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#d97706",marginBottom:4}}>Pendente {ano}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#d97706"}}>{fmt(totalPend)}</div>
        </div>
      </div>

      {/* GRÁFICO — clicável por mês */}
      <div className="card" style={{padding:20,marginBottom:24}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>📊 Receitas vs Despesas — {ano}</div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>Clique em um mês para ver o detalhamento abaixo</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:4,overflowX:"auto",paddingBottom:8}}>
          {grafico.map((g)=>{
            const hRec = maxVal>0?(g.rec/maxVal)*altBar:0;
            const hDes = maxVal>0?(g.des/maxVal)*altBar:0;
            const sel = g.mes===mesSel;
            const temDados = g.rec>0||g.des>0;
            return (
              <div key={g.mes} onClick={()=>setMesSel(g.mes)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:52,flex:1,cursor:"pointer",padding:"6px 4px",borderRadius:8,background:sel?"#f3f0ff":"transparent",border:sel?"2px solid var(--purple)":"2px solid transparent",transition:".15s"}}>
                <div style={{display:"flex",alignItems:"flex-end",gap:3,height:altBar}}>
                  <div title={`Receitas: ${fmt(g.rec)}`} style={{width:18,height:Math.max(hRec,2),background:"#059669",borderRadius:"4px 4px 0 0",opacity:temDados?1:0.15}}/>
                  <div title={`Despesas: ${fmt(g.des)}`} style={{width:18,height:Math.max(hDes,2),background:"#dc2626",borderRadius:"4px 4px 0 0",opacity:temDados?1:0.15}}/>
                </div>
                {temDados&&<div style={{fontSize:9,fontWeight:700,color:g.saldo>=0?"#059669":"#dc2626",whiteSpace:"nowrap"}}>{g.saldo>=0?"+":""}{fmt(g.saldo).replace("R$","").trim()}</div>}
                <div style={{fontSize:11,color:sel?"var(--purple)":"var(--text-muted)",fontWeight:sel?700:400}}>{mesLabel(g.mes)}</div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:16,marginTop:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><div style={{width:12,height:12,background:"#059669",borderRadius:3}}/> Receitas</div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><div style={{width:12,height:12,background:"#dc2626",borderRadius:3}}/> Despesas</div>
        </div>
      </div>

      {/* DETALHAMENTO DO MÊS SELECIONADO */}
      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:24,border:"2px solid var(--purple)"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-100)",fontWeight:700,fontSize:14,background:"#f3f0ff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>📅 {mesLabel(mesSel,true).charAt(0).toUpperCase()+mesLabel(mesSel,true).slice(1)} de {mesSel.slice(0,4)}</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{ const idx=mesesAno.indexOf(mesSel); if(idx>0)setMesSel(mesesAno[idx-1]); }} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="chevron-left" size={13}/></button>
            <button onClick={()=>{ const idx=mesesAno.indexOf(mesSel); if(idx<mesesAno.length-1)setMesSel(mesesAno[idx+1]); }} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="chevron-right" size={13}/></button>
          </div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"var(--gray-50)"}}>
            {["Financeiro","Receitas","Despesas","Saldo"].map(h=>(
              <th key={h} style={{padding:"10px 20px",fontSize:11,fontWeight:600,color:"var(--text-muted)",textAlign:"left",borderBottom:"1px solid var(--gray-200)"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[
              {label:"🏥 Clínica", rec:mCl.rec, des:mCl.des},
              {label:"🏠 Pessoal", rec:mPs.rec, des:mPs.des},
              {label:"🏢 Empresa", rec:mEm.rec, des:mEm.des},
            ].map((row,i)=>{
              const saldo=row.rec-row.des;
              return (
                <tr key={i} style={{borderBottom:"1px solid var(--gray-100)"}}>
                  <td style={{padding:"12px 20px",fontWeight:600,fontSize:14}}>{row.label}</td>
                  <td style={{padding:"12px 20px",color:"#059669",fontWeight:700}}>{fmt(row.rec)}</td>
                  <td style={{padding:"12px 20px",color:"#dc2626",fontWeight:700}}>{fmt(row.des)}</td>
                  <td style={{padding:"12px 20px",color:saldo>=0?"#059669":"#dc2626",fontWeight:700,fontSize:15}}>{fmt(saldo)}</td>
                </tr>
              );
            })}
            <tr style={{background:"#f3f0ff",borderTop:"2px solid var(--purple)"}}>
              <td style={{padding:"12px 20px",fontWeight:700,fontSize:14}}>TOTAL DO MÊS</td>
              <td style={{padding:"12px 20px",color:"#059669",fontWeight:700,fontSize:15}}>{fmt(mesRec)}</td>
              <td style={{padding:"12px 20px",color:"#dc2626",fontWeight:700,fontSize:15}}>{fmt(mesDes)}</td>
              <td style={{padding:"12px 20px",color:mesSaldo>=0?"#059669":"#dc2626",fontWeight:700,fontSize:16}}>{fmt(mesSaldo)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* RESUMO ANUAL */}
      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:24}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-100)",fontWeight:700,fontSize:14}}>📋 Resumo Anual — {ano}</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"var(--gray-50)"}}>
            {["Financeiro","Receitas","Despesas","Saldo"].map(h=>(
              <th key={h} style={{padding:"10px 20px",fontSize:11,fontWeight:600,color:"var(--text-muted)",textAlign:"left",borderBottom:"1px solid var(--gray-200)"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[
              {label:"🏥 Clínica", rec:aCl.rec, des:aCl.des},
              {label:"🏠 Pessoal", rec:aPs.rec, des:aPs.des},
              {label:"🏢 Empresa", rec:aEm.rec, des:aEm.des},
            ].map((row,i)=>{
              const saldo=row.rec-row.des;
              return (
                <tr key={i} style={{borderBottom:"1px solid var(--gray-100)"}}>
                  <td style={{padding:"12px 20px",fontWeight:600,fontSize:14}}>{row.label}</td>
                  <td style={{padding:"12px 20px",color:"#059669",fontWeight:700}}>{fmt(row.rec)}</td>
                  <td style={{padding:"12px 20px",color:"#dc2626",fontWeight:700}}>{fmt(row.des)}</td>
                  <td style={{padding:"12px 20px",color:saldo>=0?"#059669":"#dc2626",fontWeight:700,fontSize:15}}>{fmt(saldo)}</td>
                </tr>
              );
            })}
            <tr style={{background:"var(--gray-50)",borderTop:"2px solid var(--gray-200)"}}>
              <td style={{padding:"12px 20px",fontWeight:700,fontSize:14}}>TOTAL</td>
              <td style={{padding:"12px 20px",color:"#059669",fontWeight:700,fontSize:15}}>{fmt(totalRec)}</td>
              <td style={{padding:"12px 20px",color:"#dc2626",fontWeight:700,fontSize:15}}>{fmt(totalDes)}</td>
              <td style={{padding:"12px 20px",color:totalSaldo>=0?"#059669":"#dc2626",fontWeight:700,fontSize:16}}>{fmt(totalSaldo)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
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
  const [form, setForm] = useState({nome:"",email:"",telefone:"",instituicao:"",semestre:"",senha:"",obs:""});
  const [salvando, setSalvando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [editando, setEditando] = useState(null);

  useEffect(()=>{
    const unsub = db.collection("clinica_alunos").onSnapshot(snap=>{
      setAlunos(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
  },[]);

  const LINK_CADASTRO = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/cadastro-aluno/";
  const [linkCopiado, setLinkCopiado] = useState(false);

  const filtrados = alunos.filter(a=>{
    const fOk = filtro==="todos" || a.status===filtro;
    const bOk = !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.email?.toLowerCase().includes(busca.toLowerCase());
    return fOk && bOk;
  });

  const pendentes = alunos.filter(a=>a.status==="pendente");

  async function salvar(){
    if(!form.nome||!form.email){alert("Nome e e-mail obrigatorios.");return;}
    if(!editando&&!form.senha){alert("Senha obrigatoria para novo aluno.");return;}
    setSalvando(true);
    if(editando){
      const {senha,...dados}=form;
      const up = {...dados};
      if(senha) up.senha = senha; // só atualiza senha se preenchida
      await db.collection("clinica_alunos").doc(editando).update(up);
    } else {
      await db.collection("clinica_alunos").add({...form,status:"ativo",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    }
    setModal(false);setForm({nome:"",email:"",telefone:"",instituicao:"",semestre:"",senha:"",obs:""});setEditando(null);setSalvando(false);
  }

  async function alterarStatus(id, novoStatus){
    await db.collection("clinica_alunos").doc(id).update({status:novoStatus});
  }

  async function excluir(id){
    if(!confirm("Remover aluno?"))return;
    await db.collection("clinica_alunos").doc(id).delete();
  }

  function abrirEditar(a){
    setForm({nome:a.nome||"",email:a.email||"",telefone:a.telefone||"",instituicao:a.instituicao||"",semestre:a.semestre||"",senha:"",obs:a.obs||""});
    setEditando(a.id);setModal(true);
  }

  if(loading) return <Spinner/>;

  return (
    <div>
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Alunos em Supervisão</div>
          <div className="page-subtitle">{alunos.filter(a=>a.status==="ativo").length} aluno(s) cadastrado(s)</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{
            const texto = `🎓 *Supervisão Clínica — Dra. Lucia Kratz*\n\nOlá! Para solicitar acesso ao Portal de Supervisão Clínica, preencha seu cadastro pelo link abaixo:\n\n👉 ${LINK_CADASTRO}\n\n📝 Você vai informar: nome, e-mail, instituição e criar uma senha de acesso.\n\n⏳ Após o envio, seu cadastro ficará pendente até a aprovação da supervisora. Assim que aprovado, você já pode acessar o portal.\n\nQualquer dúvida, entre em contato! 💜`;
            navigator.clipboard.writeText(texto).then(()=>{setLinkCopiado(true);setTimeout(()=>setLinkCopiado(false),2500);}).catch(()=>prompt("Copie o texto:",texto));
          }}>
            {linkCopiado?"✓ Texto copiado!":"📋 Link de Cadastro"}
          </button>
          <button className="btn btn-purple" onClick={()=>{setForm({nome:"",email:"",telefone:"",instituicao:"",semestre:"",senha:"",obs:""});setEditando(null);setModal(true);}}>
            <Icon name="user-plus" size={16}/> Cadastrar Aluno
          </button>
        </div>
      </div>

      {/* Alerta de pendentes */}
      {pendentes.length>0&&(
        <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:12,padding:"12px 18px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#92400e"}}>🔔 {pendentes.length} solicitação(ões) pendente(s)</div>
            <div style={{fontSize:12,color:"#78350f",marginTop:2}}>Alunos que se cadastraram pelo link e aguardam sua aprovação.</div>
          </div>
          <button className="btn btn-ghost" style={{fontSize:12,color:"#92400e",border:"1px solid #f59e0b"}} onClick={()=>setFiltro("pendente")}>Ver pendentes</button>
        </div>
      )}

      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <input className="form-input" style={{flex:1,minWidth:200}} placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e=>setBusca(e.target.value)}/>
        {[["todos","Todos"],["ativo","Ativos"],["pendente","Pendentes"],["inativo","Inativos"]].map(([f,l])=>(
          <button key={f} className={"btn "+(filtro===f?"btn-purple":"btn-ghost")} onClick={()=>setFiltro(f)}>
            {l} {f==="pendente"&&pendentes.length>0&&<span style={{background:"#f59e0b",color:"white",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700,marginLeft:4}}>{pendentes.length}</span>}
          </button>
        ))}
      </div>
      {filtrados.length===0?(
        <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>
          <Icon name="graduation-cap" size={40}/>
          <div style={{marginTop:12}}>{busca?"Nenhum aluno encontrado.":"Nenhum aluno cadastrado ainda."}</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtrados.map(a=>(
            <div key={a.id} className="card" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",
              borderLeft:a.status==="pendente"?"4px solid #f59e0b":a.status==="inativo"?"4px solid #9ca3af":"4px solid transparent"}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:a.status==="pendente"?"#fef3c7":"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:a.status==="pendente"?"#92400e":"var(--purple)",flexShrink:0,fontSize:16}}>{(a.nome||"?")[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:600}}>{a.nome}</span>
                  <span className={"badge "+(a.status==="ativo"?"badge-green":a.status==="pendente"?"badge-yellow":"badge-gray")}
                    style={a.status==="pendente"?{background:"#fef3c7",color:"#92400e",border:"1px solid #f59e0b"}:{}}>{a.status==="ativo"?"Ativo":a.status==="pendente"?"⏳ Pendente":"Inativo"}</span>
                  {a.origemCadastro==="auto-cadastro"&&<span style={{fontSize:10,color:"var(--text-muted)",background:"var(--gray-100)",borderRadius:20,padding:"2px 8px"}}>auto-cadastro</span>}
                </div>
                <div style={{fontSize:13,color:"var(--text-muted)",display:"flex",gap:12,marginTop:2,flexWrap:"wrap"}}>
                  <span>✉ {a.email}</span>
                  {a.instituicao&&<span>🏛 {a.instituicao}{a.semestre?" · "+a.semestre:""}</span>}
                  <span>👤 {a.pacientesVinculados||0} paciente(s)</span>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {a.status==="pendente"&&(
                  <button className="btn btn-purple" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>alterarStatus(a.id,"ativo")}>
                    ✓ Aprovar
                  </button>
                )}
                {a.status==="ativo"&&(
                  <button className="btn btn-ghost" style={{fontSize:11,padding:"5px 10px",color:"#6b7280"}} onClick={()=>alterarStatus(a.id,"inativo")}>
                    Inativar
                  </button>
                )}
                {a.status==="inativo"&&(
                  <button className="btn btn-ghost" style={{fontSize:11,padding:"5px 10px",color:"#16a34a"}} onClick={()=>alterarStatus(a.id,"ativo")}>
                    Reativar
                  </button>
                )}
                <button className="btn btn-ghost" style={{fontSize:12,color:"var(--purple)",padding:"6px 12px"}} onClick={()=>setDetalhe(a)}>
                  <Icon name="eye" size={13}/> Ver
                </button>
                <button className="btn btn-ghost" style={{padding:"6px 10px"}} onClick={()=>abrirEditar(a)}><Icon name="pencil" size={13}/></button>
                <button className="btn btn-ghost" style={{padding:"6px 10px",color:"var(--danger)"}} onClick={()=>excluir(a.id)}><Icon name="trash-2" size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal cadastro */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:20}}>{editando?"Editar Aluno":"Cadastrar Novo Aluno"}</div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">NOME COMPLETO *</label>
              <input className="form-input" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome do aluno" autoFocus/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div className="form-group">
                <label className="form-label">E-MAIL *</label>
                <input className="form-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="aluno@email.com" disabled={!!editando}/>
              </div>
              <div className="form-group">
                <label className="form-label">TELEFONE</label>
                <input className="form-input" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} placeholder="(00) 9 0000-0000"/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div className="form-group">
                <label className="form-label">INSTITUIÇÃO</label>
                <input className="form-input" value={form.instituicao} onChange={e=>setForm({...form,instituicao:e.target.value})} placeholder="Nome da faculdade"/>
              </div>
              <div className="form-group">
                <label className="form-label">SEMESTRE</label>
                <input className="form-input" value={form.semestre} onChange={e=>setForm({...form,semestre:e.target.value})} placeholder="Ex: 8º semestre"/>
              </div>
            </div>
            {!editando&&(
              <div className="form-group" style={{marginBottom:14}}>
                <label className="form-label">SENHA DE ACESSO *</label>
                <input className="form-input" type="password" value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} placeholder="Senha para o aluno acessar o portal"/>
              </div>
            )}
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">OBSERVAÇÕES</label>
              <TextAreaVoz className="form-input" rows={2} value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} placeholder="Notas sobre o aluno..."/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}>{salvando?"Salvando...":editando?"Salvar":"Cadastrar aluno"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Detalhe aluno */}
      {detalhe&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"flex-end",zIndex:500}} onClick={()=>setDetalhe(null)}>
          <div style={{background:"white",width:"100%",maxWidth:480,height:"100%",overflowY:"auto",padding:28}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <Icon name="graduation-cap" size={20}/>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,flex:1}}>{detalhe.nome}</div>
              <button onClick={()=>setDetalhe(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <span className={"badge "+(detalhe.status==="ativo"?"badge-green":"badge-gray")}>{detalhe.status==="ativo"?"Ativo":"Inativo"}</span>
              {detalhe.instituicao&&<span className="badge badge-purple">{detalhe.instituicao}</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,fontSize:14}}>
              {detalhe.email&&<div><div style={{fontSize:12,color:"var(--text-muted)"}}>E-mail</div><div style={{fontWeight:500}}>{detalhe.email}</div></div>}
              {detalhe.telefone&&<div><div style={{fontSize:12,color:"var(--text-muted)"}}>Telefone</div><div style={{fontWeight:500}}>{detalhe.telefone}</div></div>}
              {detalhe.instituicao&&<div><div style={{fontSize:12,color:"var(--text-muted)"}}>Instituicao</div><div style={{fontWeight:500}}>{detalhe.instituicao}</div></div>}
              {detalhe.semestre&&<div><div style={{fontSize:12,color:"var(--text-muted)"}}>Semestre</div><div style={{fontWeight:500}}>{detalhe.semestre}</div></div>}
            </div>
            {detalhe.obs&&<div style={{marginTop:16,padding:12,background:"var(--gray-50)",borderRadius:8,fontSize:13,color:"var(--text-muted)"}}>{detalhe.obs}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TERAPIA DE CASAIS
// ═══════════════════════════════════════════════════════
// ── Botão de Emergência ──
function BotaoEmergenciaAdmin({ casalId, nomeCasal }) {
  const [palavra,    setPalavra]    = useState("");
  const [palavraSalva, setPalavraSalva] = useState("");
  const [acionamentos, setAcionamentos] = useState([]);
  const [salvando,   setSalvando]   = useState(false);
  const [salvo,      setSalvo]      = useState(false);

  useEffect(()=>{
    if (!casalId) return;
    db.collection("clinica_casais").doc(casalId).get().then(d=>{
      if (d.exists && d.data().palavraEmergencia) {
        setPalavraSalva(d.data().palavraEmergencia);
        setPalavra(d.data().palavraEmergencia);
      }
    });
    db.collection("clinica_emergencia")
      .where("casalId","==",casalId)
      .orderBy("createdAt","desc").limit(5)
      .onSnapshot(s=>setAcionamentos(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[casalId]);

  async function salvar() {
    if (!palavra.trim()) { alert("Digite a palavra de emergência."); return; }
    setSalvando(true);
    try {
      await db.collection("clinica_casais").doc(casalId).update({
        palavraEmergencia: palavra.trim().toUpperCase()
      });
      setPalavraSalva(palavra.trim().toUpperCase());
      setSalvo(true);
      setTimeout(()=>setSalvo(false), 3000);
    } catch(e) { alert("Erro ao salvar."); }
    setSalvando(false);
  }

  function fmtDH(ts) {
    if (!ts?.toDate) return "—";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR")+" às "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  }

  return (
    <div style={{background:"#fff5f5",border:"2px solid #fecaca",borderRadius:12,padding:16,marginTop:12}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:20}}>🔴</span>
        <div style={{fontWeight:700,fontSize:14,color:"#dc2626"}}>Botão de Emergência</div>
      </div>

      <div style={{fontSize:12,color:"#6b7280",marginBottom:12,lineHeight:1.6}}>
        Defina a palavra-código que o casal usará para acionar o tempo de pausa durante conflitos.
      </div>

      <div style={{display:"flex",gap:8,marginBottom:palavraSalva?12:0}}>
        <input className="form-input" value={palavra}
          onChange={e=>setPalavra(e.target.value.toUpperCase())}
          placeholder="Ex: PAUSA, RESPIRA, CAFÉ..."
          style={{flex:1,fontWeight:700,letterSpacing:2,fontSize:14,textTransform:"uppercase"}}/>
        <button className="btn btn-purple" onClick={salvar} disabled={salvando} style={{whiteSpace:"nowrap"}}>
          {salvando?"...":salvo?"✓ Salvo!":"Salvar"}
        </button>
      </div>

      {palavraSalva && (
        <div style={{background:"#7B00C4",borderRadius:10,padding:"10px 16px",textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4}}>Palavra ativa para {nomeCasal}</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"white",letterSpacing:4}}>{palavraSalva}</div>
        </div>
      )}

      {acionamentos.length>0 && (
        <div>
          <div style={{fontSize:11,fontWeight:600,color:"#dc2626",marginBottom:6}}>ÚLTIMOS ACIONAMENTOS</div>
          {acionamentos.map(a=>(
            <div key={a.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"5px 0",borderBottom:"1px solid #fecaca"}}>
              <span style={{color:"#6b7280"}}>{fmtDH(a.createdAt)}</span>
              <span style={{color:"#dc2626",fontWeight:600}}>⏱ {a.horas}h de pausa · por {a.acionadoPor||"—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Laudos() {
  const { data:pacientes } = useCollection("clinica_pacientes","nome");
  const [laudos, setLaudos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({tipo:"Avaliacao Neuropsicologica",pacienteId:"",linkDrive:"",observacoes:""});
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(null);

  const TIPOS_LAUDO = ["Avaliacao Neuropsicologica","Avaliacao Psicologica","Avaliacao Infantil","Avaliacao de TDAH","Avaliacao de Altas Habilidades","Pericia Psicologica","Demandas Judiciais","Orientacao de Carreira","Relatorio de Acompanhamento","Outro"];
  const STATUS_CONFIG = {
    rascunho: {label:"Rascunho",  bg:"#fef3c7", cor:"#b45309", icon:"edit-3"},
    enviado:  {label:"Enviado",   bg:"#d1fae5", cor:"#065f46", icon:"send"},
    arquivado:{label:"Arquivado", bg:"#f3f4f6", cor:"#6b7280", icon:"archive"},
  };

  useEffect(()=>{
    const unsub = db.collection("clinica_laudos").onSnapshot(snap=>{
      setLaudos(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
  },[]);

  async function salvar(){
    if(!form.tipo||!form.pacienteId||!form.linkDrive){alert("Selecione o tipo, o paciente e cole o link do PDF.");return;}
    setSalvando(true);
    const pac = pacientes.find(p=>p.id===form.pacienteId);
    let link = form.linkDrive.trim();
    const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if(m) link = `https://drive.google.com/file/d/${m[1]}/view`;
    await db.collection("clinica_laudos").add({
      tipo:form.tipo, titulo:form.tipo+" — "+(pacEfetivo?.nome||""),
      pacienteId:form.pacienteId, pacienteNome:pac?.nome||"",
      linkDrive:link, observacoes:form.observacoes,
      status:"rascunho", enviadoEm:null,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    setModal(false);setForm({tipo:"Avaliacao Neuropsicologica",pacienteId:"",linkDrive:"",observacoes:""});setSalvando(false);
  }

  async function enviarParaPaciente(laudo){
    if(!confirm(`Enviar "${laudo.tipo}" para ${laudo.pacienteNome}?\n\nO paciente verá o documento no portal dele.`))return;
    setEnviando(laudo.id);
    await db.collection("clinica_laudos").doc(laudo.id).update({status:"enviado",enviadoEm:new Date().toISOString()});
    setEnviando(null);
  }

  async function excluir(id){if(!confirm("Excluir laudo permanentemente?"))return;await db.collection("clinica_laudos").doc(id).delete();}
  async function arquivar(id){await db.collection("clinica_laudos").doc(id).update({status:"arquivado"});}

  if(loading) return <Spinner/>;

  const totalEnviado = laudos.filter(l=>l.status==="enviado").length;
  const totalRascunho = laudos.filter(l=>l.status==="rascunho").length;

  return (
    <div>
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Laudos</div>
          <div className="page-subtitle">{laudos.length} laudo(s) · {totalEnviado} enviado(s) ao paciente</div>
        </div>
        <button className="btn btn-purple" onClick={()=>setModal(true)}><Icon name="plus" size={16}/> Novo Laudo</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:24}}>
        {[["Rascunho",totalRascunho,"#b45309","#fef3c7"],["Enviado ao Paciente",totalEnviado,"#065f46","#d1fae5"],["Total",laudos.length,"#7B00C4","var(--purple-soft)"]].map(([l,n,cor,bg])=>(
          <div key={l} className="metric-card" style={{textAlign:"center",background:bg}}>
            <div className="metric-value" style={{fontSize:28,color:cor}}>{n}</div>
            <div className="metric-label" style={{color:cor}}>{l}</div>
          </div>
        ))}
      </div>

      {laudos.length===0?(
        <div className="card" style={{textAlign:"center",padding:60,color:"var(--text-muted)"}}>
          <Icon name="file-text" size={48}/>
          <div style={{marginTop:12,fontWeight:500}}>Nenhum laudo criado ainda</div>
          <p style={{fontSize:13,marginTop:8,marginBottom:20,color:"var(--text-muted)"}}>Crie o laudo no Word/Google Docs, salve como PDF no Drive, cole o link aqui e envie ao paciente.</p>
          <button className="btn btn-purple" onClick={()=>setModal(true)}><Icon name="plus" size={14}/> Criar primeiro laudo</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {laudos.map(l=>{
            const st = STATUS_CONFIG[l.status]||STATUS_CONFIG.rascunho;
            return (
              <div key={l.id} className="card" style={{padding:"18px 20px"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:st.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon name={st.icon} size={20}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:15}}>{l.tipo}</span>
                      <span style={{background:st.bg,color:st.cor,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{st.label}</span>
                    </div>
                    <div style={{fontSize:13,color:"var(--text-muted)",display:"flex",gap:12,flexWrap:"wrap"}}>
                      <span>👤 {l.pacienteNome||"—"}</span>
                      {l.createdAt?.seconds&&<span>📅 {new Date(l.createdAt.seconds*1000).toLocaleDateString("pt-BR")}</span>}
                      {l.enviadoEm&&<span style={{color:"#059669",fontWeight:600}}>✉ Enviado em {new Date(l.enviadoEm).toLocaleDateString("pt-BR")}</span>}
                    </div>
                    {l.observacoes&&<div style={{fontSize:12,color:"var(--text-muted)",marginTop:4,fontStyle:"italic"}}>{l.observacoes}</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap",borderTop:"1px solid var(--gray-100)",paddingTop:12}}>
                  {l.linkDrive&&(
                    <a href={l.linkDrive} target="_blank" rel="noreferrer" className="btn btn-outline" style={{fontSize:12,textDecoration:"none",display:"flex",alignItems:"center",gap:6}}>
                      <Icon name="external-link" size={13}/> Ver PDF
                    </a>
                  )}
                  {l.status==="rascunho"&&(
                    <button className="btn btn-purple" style={{fontSize:12}} onClick={()=>enviarParaPaciente(l)} disabled={enviando===l.id}>
                      <Icon name="send" size={13}/> {enviando===l.id?"Enviando...":"Enviar ao Paciente"}
                    </button>
                  )}
                  {l.status==="enviado"&&(
                    <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#059669",fontWeight:600}}>
                      <Icon name="check-circle" size={14}/> Disponível no portal do paciente
                    </div>
                  )}
                  {l.status!=="arquivado"&&(
                    <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>arquivar(l.id)}>
                      <Icon name="archive" size={13}/> Arquivar
                    </button>
                  )}
                  <button className="btn btn-ghost" style={{fontSize:12,color:"var(--danger)",marginLeft:"auto"}} onClick={()=>excluir(l.id)}>
                    <Icon name="trash-2" size={13}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>Novo Laudo</div>
              <button onClick={()=>setModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)"}}><Icon name="x" size={20}/></button>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Tipo de Laudo *</label>
              <select className="form-input" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                {TIPOS_LAUDO.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Paciente *</label>
              <select className="form-input" value={form.pacienteId} onChange={e=>setForm({...form,pacienteId:e.target.value})}>
                <option value="">Selecionar paciente...</option>
                {pacientes.filter(p=>p.status==="ativo").sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR")).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Link do PDF (Google Drive) *</label>
              <input className="form-input" value={form.linkDrive} onChange={e=>setForm({...form,linkDrive:e.target.value})} placeholder="https://drive.google.com/file/d/..."/>
              <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>No Drive: botão direito no arquivo → "Obter link" → cole aqui</div>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Observações internas (opcional)</label>
              <TextAreaVoz className="form-input" rows={2} value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} placeholder="Notas internas sobre este laudo..."/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}><Icon name="save" size={15}/> {salvando?"Salvando...":"Salvar Laudo"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════
// ─── COMISSÕES ────────────────────────────────────────────
function Comissoes({ user }) {
  const { data:pacotes } = useCollection("clinica_pacotes");
  // ── Esteira 1a: Comissões da secretária (vendas_secretaria) ──
  const [comissoes, setComissoes] = useState([]);
  // ── Esteira 1b: Repasses de parceiras/estagiárias (repasses_parcerias) ──
  const [repasses, setRepasses] = useState([]);
  // Fallback: lê clinica_comissoes legado para não perder histórico anterior
  const [comissoesLegado, setComissoesLegado] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [mesSel, setMesSel] = useState(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,"0")}`;
  });
  const [pagando, setPagando] = useState(false);

  // Configurações financeiras editáveis (clinica_config/comissoes)
  const [config, setConfig] = useState({...CONFIG_FIN_PADRAO});
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [formConfig, setFormConfig] = useState({...CONFIG_FIN_PADRAO});
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Parceiras
  const [parceiras, setParceiras] = useState([]);
  const [modalParceira, setModalParceira] = useState(false);
  const [editandoParceira, setEditandoParceira] = useState(null);
  const [formParceira, setFormParceira] = useState({nome:"",percentual:"70",pix:"",tipo:"parceira"});

  const SALARIO_FIXO = parseFloat(config.salarioFixo)||0;

  useEffect(() => {
    // Esteira 1a: Comissões da secretária (nova coleção) — sem orderBy, ordenar client-side
    const u1 = db.collection("vendas_secretaria")
      .onSnapshot(s => {
        const docs = s.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toMillis?.()??0)-(a.createdAt?.toMillis?.()??0));
        setComissoes(docs);
      }, ()=>{});
    // Esteira 1b: Repasses de parceiras — sem orderBy
    const u1b = db.collection("repasses_parcerias")
      .onSnapshot(s => {
        const docs = s.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toMillis?.()??0)-(a.createdAt?.toMillis?.()??0));
        setRepasses(docs);
      }, ()=>{});
    // Fallback: histórico legado clinica_comissoes — sem orderBy
    const u1c = db.collection("clinica_comissoes")
      .onSnapshot(s => {
        const docs = s.docs.map(d=>({id:d.id,...d.data(),_legado:true}));
        docs.sort((a,b)=>(b.createdAt?.toMillis?.()??0)-(a.createdAt?.toMillis?.()??0));
        setComissoesLegado(docs);
      }, ()=>{});
    const u2 = db.collection("clinica_lancamentos").orderBy("createdAt","desc")
      .onSnapshot(s => setLancamentos(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
    const u3 = db.collection("clinica_config").doc("comissoes")
      .onSnapshot(d => {
        const cfg = d.exists ? {...CONFIG_FIN_PADRAO, ...d.data()} : {...CONFIG_FIN_PADRAO};
        setConfig(cfg);
        if(!editandoConfig) setFormConfig(cfg);
      }, ()=>{});
    const u4 = db.collection("clinica_parceiras")
      .onSnapshot(s => {
        const docs = s.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(a.nome||"").localeCompare(b.nome||""));
        setParceiras(docs);
      }, ()=>{});
    return () => { u1(); u1b(); u1c(); u2(); u3(); u4(); };
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
    const todosPacotes = snapPac.docs.map(d=>({id:d.id,...d.data()}));

    // 2. Buscar todas as comissões (nova + legado)
    const [snapVS, snapLeg] = await Promise.all([
      db.collection("vendas_secretaria").get(),
      db.collection("clinica_comissoes").get(),
    ]);
    const todasComissoes = [
      ...snapVS.docs.map(d=>({id:d.id,...d.data(),_col:"vendas_secretaria"})),
      ...snapLeg.docs.map(d=>({id:d.id,...d.data(),_col:"clinica_comissoes"})),
    ];
    const comissoesPorPacote = {};
    todasComissoes.forEach(c=>{ if(c.pacoteId) comissoesPorPacote[c.pacoteId] = c; });

    // 3. Filtrar pacotes de junho e julho com tipoVenda (particular/recorrente — que geram comissão)
    const mesesAlvo = ["2026-06","2026-07"];
    const pacotesPagos = todosPacotes.filter(p=>{
      const mes = (p.dataInicio||"").slice(0,7);
      return mesesAlvo.includes(mes) && (p.statusPag||"pendente")==="recebido";
    });
    const pacotesPendentes = todosPacotes.filter(p=>{
      const mes = (p.dataInicio||"").slice(0,7);
      return mesesAlvo.includes(mes) && (p.statusPag||"pendente")!=="recebido";
    });

    // 4. Para pagos: checar se tem comissão
    const pagosComComissao = pacotesPagos.filter(p=>comissoesPorPacote[p.id]);
    const pagosSemComissao = pacotesPagos.filter(p=>!comissoesPorPacote[p.id]);

    setAuditResultado({
      pacotesPagos,
      pacotesPendentes,
      pagosComComissao,
      pagosSemComissao,
      todasComissoes,
      comissoesPorPacote,
    });
    setAuditando(false);
  }

  async function gerarComissaoFaltante(pacote) {
    const tipoVenda = lancamentos.some(
      l => l.pacienteId===pacote.pacienteId && l.pacoteId!==pacote.id && l.status==="recebido"
    ) ? "recorrente" : "primeira";
    await registrarComissao({
      tipo: "Pacote",
      valor: parseFloat(pacote.valorTotal||0),
      pacienteNome: pacote.pacienteNome || "",
      tipoVenda,
      pacoteId: pacote.id,
    });
    // Atualizar resultado
    setAuditResultado(prev=>({
      ...prev,
      pagosSemComissao: prev.pagosSemComissao.filter(p=>p.id!==pacote.id),
      pagosComComissao: [...prev.pagosComComissao, pacote],
    }));
  }

  async function gerarTodasFaltantes(lista) {
    if(!confirm(`Gerar ${lista.length} comissão(ões) faltante(s)? Isso vai criar os registros agora.`))return;
    for(const p of lista) await gerarComissaoFaltante(p);
    alert("✅ Comissões geradas!");
  }

  async function higienizarDuplicatas() {
    if(!confirm(
      "Essa operação vai:\n\n" +
      "1. Remover comissões DUPLICADAS pelo mesmo pacoteId\n" +
      "2. Remover comissões com ⚠️ Pacote não encontrado\n" +
      "3. Preencher mesRef nos registros antigos (restaura histórico de meses)\n\n" +
      "Confirma?"
    )) return;

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
      if(!pid) return;
      if(!porPacoteVS[pid]) porPacoteVS[pid] = [];
      porPacoteVS[pid].push({id:d.id, ts: d.data().createdAt?.toMillis?.()||0});
    });
    const bVS = db.batch();
    Object.values(porPacoteVS).forEach(lista => {
      if(lista.length <= 1) return;
      lista.sort((a,b)=>b.ts-a.ts);
      lista.slice(1).forEach(r => {
        if(!r.id.startsWith("COM_")){ bVS.delete(db.collection("vendas_secretaria").doc(r.id)); removidos++; }
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
      if(pid && !pacotesExistentes.has(pid)) {
        bLeg.delete(db.collection("clinica_comissoes").doc(d.id));
        orfaos++;
        bLegCount++;
        return;
      }

      // Agrupar para detectar duplicatas
      if(!pid) return;
      if(!porPacoteLeg[pid]) porPacoteLeg[pid] = [];
      porPacoteLeg[pid].push({id:d.id, ts: data.createdAt?.toMillis?.()||0});
    });

    // Duplicatas: manter só o mais recente
    Object.values(porPacoteLeg).forEach(lista => {
      if(lista.length <= 1) return;
      lista.sort((a,b)=>b.ts-a.ts);
      lista.slice(1).forEach(r => {
        bLeg.delete(db.collection("clinica_comissoes").doc(r.id));
        removidos++;
        bLegCount++;
      });
    });
    if(bLegCount > 0) await bLeg.commit();

    // ── PASSO 3: Migração de mesRef (restaura histórico de meses) ──
    // Re-ler após limpeza para não tentar migrar docs que foram deletados
    const snapLeg2 = await db.collection("clinica_comissoes").get();
    const bMig = db.batch();
    let bMigCount = 0;
    snapLeg2.docs.forEach(d => {
      const data = d.data();
      if(!data.mesRef) {
        let mesRef = null;
        if(data.createdAt?.toDate) {
          const dt = data.createdAt.toDate();
          mesRef = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
        } else if(data.data) {
          mesRef = String(data.data).slice(0,7);
        }
        if(mesRef) {
          bMig.update(d.ref, {mesRef});
          migrados++;
          bMigCount++;
        }
      }
    });
    if(bMigCount > 0) await bMig.commit();

    alert(
      "✅ Higienização concluída!\n\n" +
      `• ${removidos} duplicata(s) removida(s)\n` +
      `• ${orfaos} comissão(ões) com pacote inexistente removida(s)\n` +
      `• ${migrados} registro(s) com mesRef preenchido (histórico restaurado)`
    );
  }

  async function salvarConfig(){
    setSalvandoConfig(true);
    await db.collection("clinica_config").doc("comissoes").set({
      nomeSecretaria: formConfig.nomeSecretaria||"Secretária",
      salarioFixo: parseFloat(formConfig.salarioFixo)||0,
      percPrimeira: parseFloat(formConfig.percPrimeira)||10,
      percRecorrente: parseFloat(formConfig.percRecorrente)||5,
      percParceiroPadrao: parseFloat(formConfig.percParceiroPadrao)||70,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    setSalvandoConfig(false);
    setEditandoConfig(false);
  }

  async function salvarParceira(){
    if(!formParceira.nome.trim()){alert("Nome da parceira é obrigatório.");return;}
    const dados = {
      nome: formParceira.nome.trim(),
      percentual: parseFloat(formParceira.percentual)||parseFloat(config.percParceiroPadrao)||70,
      pix: formParceira.pix||"",
      tipo: formParceira.tipo||"parceira"
    };
    if(editandoParceira){
      await db.collection("clinica_parceiras").doc(editandoParceira).update(dados);
    } else {
      await db.collection("clinica_parceiras").add({...dados, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
    }
    setModalParceira(false); setEditandoParceira(null);
    setFormParceira({nome:"",percentual:String(config.percParceiroPadrao||70),pix:"",tipo:"parceira"});
  }

  // Meses disponíveis: une nova coleção + legado para mostrar histórico completo
  const meses = [...new Set([...comissoes, ...comissoesLegado].map(c=>c.mesRef).filter(Boolean))].sort().reverse();
  // Auto-navegar para o mês mais recente com dados se o atual estiver vazio
  React.useEffect(()=>{
    if(meses.length > 0 && !meses.includes(mesSel)){
      setMesSel(meses[0]);
    }
  }, [meses.join(",")]); // eslint-disable-line

  // Mescla nova coleção + legado para garantir histórico completo
  const todasComissoes = useMemo(()=>{
    // Deduplica por pacoteId: prefere registro novo (vendas_secretaria) sobre legado
    const porPacote = {};
    [...comissoesLegado, ...comissoes].forEach(c=>{
      const key = c.pacoteId || c.id;
      if(!porPacote[key] || !c._legado) porPacote[key] = c;
    });
    return Object.values(porPacote);
  }, [comissoes, comissoesLegado]);

  const comissoesMes = todasComissoes.filter(c => c.mesRef === mesSel);
  // Secretária: registros sem responsável definido (vendas dela)
  const comissoesSecretaria = comissoesMes.filter(c => !c.responsavel);
  // Repasses: registros com responsável (parceiras, estagiária do social)
  const repassesMes = comissoesMes.filter(c => c.responsavel);
  const responsaveis = [...new Set(repassesMes.map(c=>c.responsavel))];

  // Classificar comissões: limpas (entram no ciclo) vs suspeitas (fora do ciclo)
  const comissoesSecretariaPend = comissoesSecretaria.filter(c => c.status !== "pago");
  const comissoesSecretariaPagas = comissoesSecretaria.filter(c => c.status === "pago");

  function isComissaoSuspeita(c) {
    const pacoteVinc = c.pacoteId ? pacotes.find(p=>p.id===c.pacoteId) : null;
    // Suspeita 1: pacote existe mas ainda está pendente
    if(pacoteVinc && (pacoteVinc.statusPag||"pendente") !== "recebido") return true;
    // Suspeita 2: valor base diverge do valor total do pacote
    if(pacoteVinc && Math.abs((c.valorBase||0) - (pacoteVinc.valorTotal||0)) > 0.01) return true;
    // Suspeita 3: tem pacoteId mas o pacote não existe mais
    if(c.pacoteId && !pacotes.some(p=>p.id===c.pacoteId)) return true;
    return false;
  }

  // Apenas comissões limpas entram no ciclo de pagamento da Jéssica
  const comissoesPend  = comissoesSecretariaPend.filter(c => !isComissaoSuspeita(c));
  const comissoesSuspeitas = comissoesSecretariaPend.filter(c => isComissaoSuspeita(c));
  const comissoesPagas = comissoesSecretariaPagas;
  const totalPend  = comissoesPend.reduce((a,c) => a + (c.valorComissao||0), 0);
  const totalPagas = comissoesPagas.reduce((a,c) => a + (c.valorComissao||0), 0);
  const totalComissoes = totalPend + totalPagas;

  // Pagamentos já realizados neste mês (histórico)
  const pagamentosDoMes = lancamentos.filter(l =>
    l.tipo_lancamento === "salario_secretaria" && l.mesRef === mesSel
  );
  const pagamentoMes = pagamentosDoMes[0] || null;
  const salarioJaPago = !!pagamentoMes;
  // Ciclo atual: salário fixo entra só no 1º pagamento do mês; depois, só comissões novas
  const totalAPagar = (salarioJaPago ? 0 : SALARIO_FIXO) + totalPend;

  const [mesLabel] = useState(() => {
    const [ano, mes] = mesSel.split("-");
    return new Date(parseInt(ano), parseInt(mes)-1, 1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  });

  function getMesLabel(mesRef) {
    const [ano, mes] = mesRef.split("-");
    return new Date(parseInt(ano), parseInt(mes)-1, 1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  }

  async function pagarSalario() {
    const descr = salarioJaPago
      ? `${comissoesPend.length} comissão(ões) nova(s)`
      : `salário fixo + ${comissoesPend.length} comissão(ões)`;
    if (!confirm(`Confirma pagamento de R$ ${totalAPagar.toFixed(2).replace(".",",")} para ${config.nomeSecretaria} (${descr}) em ${getMesLabel(mesSel)}?`)) return;
    setPagando(true);
    const hoje = new Date().toISOString().slice(0,10);
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
      obs: `${salarioJaPago?"Comissões adicionais":"Salário"} ${getMesLabel(mesSel)} — ${config.nomeSecretaria}`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // Marca apenas as comissões pendentes da secretária como pagas
    const batch = db.batch();
    comissoesPend.forEach(c => {
      // Usa a coleção correta: nova ou legado
      const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
      batch.update(db.collection(col).doc(c.id), { status:"pago", dataPagamento: hoje });
    });
    await batch.commit();
    setPagando(false);
    alert("✅ Pagamento registrado! O ciclo zerou — novas vendas abrem o próximo pagamento.");
  }

  async function pagarRepasse(responsavel) {
    const pendentes = repassesMes.filter(c=>c.responsavel===responsavel && c.status!=="pago");
    const totalRep = pendentes.reduce((a,c)=>a+(c.valorComissao||0),0);
    if(pendentes.length===0) return;
    const parc = parceiras.find(p=>p.nome===responsavel);
    if (!confirm(`Confirma repasse de R$ ${totalRep.toFixed(2).replace(".",",")} para ${responsavel} em ${getMesLabel(mesSel)}?${parc?.pix?`\nPIX: ${parc.pix}`:""}`)) return;
    setPagando(true);
    const hoje = new Date().toISOString().slice(0,10);
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
    pendentes.forEach(c => batch.update(db.collection("clinica_comissoes").doc(c.id), { status:"pago", dataPagamento: hoje }));
    await batch.commit();
    setPagando(false);
    alert(`✅ Repasse para ${responsavel} registrado como despesa da clínica!`);
  }

  const corTipoVenda = t => t==="primeira" ? "#7B00C4" : "#0891b2";
  const labelTipoVenda = t => t==="primeira" ? `🌟 Primeira Venda (${config.percPrimeira}%)` : `🔁 Recorrente (${config.percRecorrente}%)`;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Comissões — {config.nomeSecretaria.split(" ")[0]}</div>
          <div className="page-subtitle">Salário fixo R$ {SALARIO_FIXO.toFixed(2).replace(".",",")} + comissões por vendas · Repasses a parceiras</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={higienizarDuplicatas}
            style={{background:"none",border:"1px solid #c4b5fd",borderRadius:8,cursor:"pointer",fontSize:12,color:"#7c3aed",padding:"7px 14px",fontWeight:600,fontFamily:"var(--font-body)",display:"flex",alignItems:"center",gap:5}}
            title="Remove registros duplicados de comissão pelo mesmo pacoteId">
            <Icon name="trash-2" size={13}/>🧹 Limpar Duplicatas
          </button>
          <button onClick={auditarComissoes}
            style={{background:"#059669",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,color:"white",padding:"7px 14px",fontWeight:600,fontFamily:"var(--font-body)",display:"flex",alignItems:"center",gap:5}}
            title="Confere pacotes pagos de jun/jul vs registros de comissão">
            <Icon name="search" size={13}/>🔍 Auditar Jun/Jul
          </button>
        </div>
      </div>

      {/* Modal de Auditoria */}
      {modalAuditComissao&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:600,padding:20,overflowY:"auto"}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:700,marginTop:40}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:18}}>🔍 Auditoria de Comissões — Jun/Jul 2026</div>
              <button onClick={()=>setModalAuditComissao(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>×</button>
            </div>

            {auditando?(
              <div style={{textAlign:"center",padding:40,color:"var(--text-muted)"}}>Analisando pacotes e comissões...</div>
            ):auditResultado&&(()=>{
              const {pacotesPagos,pacotesPendentes,pagosComComissao,pagosSemComissao} = auditResultado;
              const fmtVal = v => `R$ ${parseFloat(v||0).toFixed(2).replace(".",",")}`;
              return (
                <div>
                  {/* Resumo */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                    <div style={{background:"#f0fdf4",borderRadius:10,padding:14,textAlign:"center"}}>
                      <div style={{fontSize:24,fontWeight:800,color:"#16a34a"}}>{pacotesPagos.length}</div>
                      <div style={{fontSize:12,color:"#166534"}}>Pacotes pagos jun/jul</div>
                    </div>
                    <div style={{background:"#f5f0ff",borderRadius:10,padding:14,textAlign:"center"}}>
                      <div style={{fontSize:24,fontWeight:800,color:"#7B00C4"}}>{pagosComComissao.length}</div>
                      <div style={{fontSize:12,color:"#4c1d95"}}>Com comissão ✓</div>
                    </div>
                    <div style={{background:pagosSemComissao.length>0?"#fef2f2":"#f0fdf4",borderRadius:10,padding:14,textAlign:"center",border:pagosSemComissao.length>0?"2px solid #fca5a5":"none"}}>
                      <div style={{fontSize:24,fontWeight:800,color:pagosSemComissao.length>0?"#dc2626":"#16a34a"}}>{pagosSemComissao.length}</div>
                      <div style={{fontSize:12,color:pagosSemComissao.length>0?"#7f1d1d":"#166534"}}>{pagosSemComissao.length>0?"⚠️ Sem comissão!":"Tudo ok ✓"}</div>
                    </div>
                  </div>

                  {/* Pacotes pagos SEM comissão */}
                  {pagosSemComissao.length>0&&(
                    <div style={{marginBottom:20}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#dc2626"}}>⚠️ Pacotes pagos SEM comissão registrada</div>
                        <button onClick={()=>gerarTodasFaltantes(pagosSemComissao)}
                          style={{background:"#dc2626",color:"white",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                          ✚ Gerar todas ({pagosSemComissao.length})
                        </button>
                      </div>
                      {pagosSemComissao.map(p=>(
                        <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#fef2f2",borderRadius:8,marginBottom:6,border:"1px solid #fca5a5"}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13}}>{p.pacienteNome||"—"}</div>
                            <div style={{fontSize:11,color:"#6b7280"}}>{p.dataInicio} · {fmtVal(p.valorTotal)} · {p.recorrencia}</div>
                          </div>
                          <button onClick={()=>gerarComissaoFaltante(p)}
                            style={{background:"#7B00C4",color:"white",border:"none",borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                            ✚ Gerar comissão
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pacotes pagos COM comissão */}
                  {pagosComComissao.length>0&&(
                    <div style={{marginBottom:20}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#059669",marginBottom:8}}>✓ Pacotes com comissão registrada</div>
                      {pagosComComissao.map(p=>{
                        const com = auditResultado.comissoesPorPacote[p.id];
                        return (
                          <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#f0fdf4",borderRadius:8,marginBottom:6,border:"1px solid #6ee7b7"}}>
                            <div>
                              <div style={{fontWeight:600,fontSize:13}}>{p.pacienteNome||"—"}</div>
                              <div style={{fontSize:11,color:"#6b7280"}}>{p.dataInicio} · {fmtVal(p.valorTotal)}</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:11,color:"#059669",fontWeight:600}}>✓ Comissão: {fmtVal(com?.valorComissao)}</div>
                              <div style={{fontSize:10,color:"#9ca3af"}}>{com?.status==="pago"?"Paga":"Pendente"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pacotes pendentes */}
                  {pacotesPendentes.length>0&&(
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#b45309",marginBottom:8}}>⏳ Pacotes ainda pendentes de pagamento ({pacotesPendentes.length})</div>
                      {pacotesPendentes.map(p=>(
                        <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 14px",background:"#fffbeb",borderRadius:8,marginBottom:4,border:"1px solid #fde68a"}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13}}>{p.pacienteNome||"—"}</div>
                            <div style={{fontSize:11,color:"#6b7280"}}>{p.dataInicio} · {fmtVal(p.valorTotal)}</div>
                          </div>
                          <div style={{fontSize:11,color:"#b45309",fontWeight:600}}>Comissão entra ao pagar</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Seletor de mês — carrossel com setas */}
      {(()=>{
        const listaMeses = meses.length > 0 ? meses : [mesSel];
        const idxAtual = listaMeses.indexOf(mesSel);
        const irAntes = () => { if(idxAtual < listaMeses.length-1) setMesSel(listaMeses[idxAtual+1]); };
        const irProx  = () => { if(idxAtual > 0) setMesSel(listaMeses[idxAtual-1]); };
        return (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
            <button onClick={irAntes} disabled={idxAtual >= listaMeses.length-1}
              style={{width:32,height:32,borderRadius:"50%",border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",opacity:idxAtual>=listaMeses.length-1?0.3:1}}>
              ‹
            </button>
            <div style={{display:"flex",gap:6,overflowX:"auto",flex:1,scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
              {listaMeses.map(m => (
                <button key={m} onClick={()=>setMesSel(m)}
                  style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:"var(--font-body)",fontSize:13,fontWeight:600,flexShrink:0,
                    background:m===mesSel?"var(--purple)":"var(--gray-100)",
                    color:m===mesSel?"white":"var(--text)",
                    display:Math.abs(listaMeses.indexOf(m)-idxAtual)<=2?"flex":"none",
                    alignItems:"center"}}>
                  {getMesLabel(m)}
                </button>
              ))}
            </div>
            <button onClick={irProx} disabled={idxAtual <= 0}
              style={{width:32,height:32,borderRadius:"50%",border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",opacity:idxAtual<=0?0.3:1}}>
              ›
            </button>
            <span style={{fontSize:12,color:"var(--text-muted)",flexShrink:0}}>{idxAtual+1}/{listaMeses.length}</span>
          </div>
        );
      })()}

      {/* ⚙️ Configurações financeiras — só psicóloga */}
      {user.tipo==="psicologa" && (
        <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",padding:"16px 20px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:700,fontSize:14}}>⚙️ Configurações de Salário e Percentuais</div>
            {!editandoConfig
              ? <button onClick={()=>{setFormConfig({...config});setEditandoConfig(true);}}
                  style={{background:"var(--purple)",color:"white",border:"none",borderRadius:8,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>✏️ Editar</button>
              : <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setEditandoConfig(false)}
                    style={{background:"white",color:"#6b7280",border:"1px solid #e5e7eb",borderRadius:8,padding:"7px 14px",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>Cancelar</button>
                  <button onClick={salvarConfig} disabled={salvandoConfig}
                    style={{background:"#16a34a",color:"white",border:"none",borderRadius:8,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>{salvandoConfig?"Salvando...":"💾 Salvar"}</button>
                </div>}
          </div>
          {!editandoConfig ? (
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px 24px",marginTop:12,fontSize:13,color:"#374151"}}>
              <span>👩‍💼 Secretária: <strong>{config.nomeSecretaria}</strong></span>
              <span>💵 Salário fixo: <strong>R$ {SALARIO_FIXO.toFixed(2).replace(".",",")}</strong></span>
              <span>🌟 Primeira venda: <strong>{config.percPrimeira}%</strong></span>
              <span>🔁 Recorrente: <strong>{config.percRecorrente}%</strong></span>
              <span>🤝 Parceiro (padrão): <strong>{config.percParceiroPadrao}%</strong></span>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:14}}>
              <div className="form-group"><label className="form-label">Nome da secretária</label>
                <input className="form-input" value={formConfig.nomeSecretaria} onChange={e=>setFormConfig({...formConfig,nomeSecretaria:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Salário fixo (R$)</label>
                <input className="form-input" type="number" value={formConfig.salarioFixo} onChange={e=>setFormConfig({...formConfig,salarioFixo:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">% primeira venda</label>
                <input className="form-input" type="number" value={formConfig.percPrimeira} onChange={e=>setFormConfig({...formConfig,percPrimeira:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">% recorrente</label>
                <input className="form-input" type="number" value={formConfig.percRecorrente} onChange={e=>setFormConfig({...formConfig,percRecorrente:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">% parceiro padrão</label>
                <input className="form-input" type="number" value={formConfig.percParceiroPadrao} onChange={e=>setFormConfig({...formConfig,percParceiroPadrao:e.target.value})}/></div>
            </div>
          )}
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:10}}>Os novos percentuais valem para as próximas vendas; comissões já registradas não mudam.</div>
        </div>
      )}

      {/* Cards resumo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:24}}>
        <div style={{background:"var(--gray-50)",borderRadius:14,padding:"18px 20px",border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Salário Fixo</div>
          <div style={{fontSize:22,fontWeight:700,color:"var(--text)"}}>R$ {SALARIO_FIXO.toFixed(2).replace(".",",")}</div>
        </div>
        <div style={{background:"var(--gray-50)",borderRadius:14,padding:"18px 20px",border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Comissões Pendentes</div>
          <div style={{fontSize:22,fontWeight:700,color:"#7B00C4"}}>R$ {totalPend.toFixed(2).replace(".",",")}</div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{comissoesPend.length} venda(s) nova(s)
            {totalPagas>0&&<span style={{color:"#16a34a"}}> · ✓ R$ {totalPagas.toFixed(2).replace(".",",")} já pagas no mês</span>}
          </div>
        </div>
        <div style={{background:totalAPagar===0?"#f0fdf4":"#faf5ff",borderRadius:14,padding:"18px 20px",border:`2px solid ${totalAPagar===0?"#16a34a":"#7B00C4"}`}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Total a Pagar {salarioJaPago?"(novo ciclo)":""}</div>
          <div style={{fontSize:26,fontWeight:800,color:totalAPagar===0?"#16a34a":"#7B00C4"}}>
            {totalAPagar===0 ? "✓ Tudo pago" : `R$ ${totalAPagar.toFixed(2).replace(".",",")}`}
          </div>
          {pagamentoMes && <div style={{fontSize:11,color:"#16a34a",marginTop:4,fontWeight:600}}>Último pagamento em {pagamentosDoMes[0].data?.split("-").reverse().join("/")} · {pagamentosDoMes.length} pagamento(s) no mês</div>}
        </div>
      </div>

      {/* Botão pagar — só psicóloga vê; reaparece quando há comissões novas */}
      {user.tipo==="psicologa" && (
        <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap",alignItems:"center"}}>
          {totalAPagar > 0 && (salarioJaPago ? comissoesPend.length > 0 : true) && (
            <button onClick={pagarSalario} disabled={pagando}
              style={{background:"#16a34a",color:"white",border:"none",borderRadius:10,padding:"12px 28px",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"var(--font-body)"}}>
              {pagando ? "Registrando..." : `💰 ${salarioJaPago?"Pagar Comissões Novas":"Registrar Pagamento"} — R$ ${totalAPagar.toFixed(2).replace(".",",")}`}
            </button>
          )}
          {/* Botão de Gratificação — sempre visível para psicóloga */}
          {(()=>{
            const [showGrat, setShowGrat] = React.useState(false);
            const [valGrat, setValGrat] = React.useState("");
            const [obsGrat, setObsGrat] = React.useState("");
            const [salvGrat, setSalvGrat] = React.useState(false);
            async function registrarGratificacao(){
              const valor = parseFloat(valGrat);
              if(!valor || valor <= 0){ alert("Informe um valor válido."); return; }
              if(!obsGrat.trim()){ alert("Informe o motivo da gratificação."); return; }
              setSalvGrat(true);
              try {
                const hoje = new Date();
                const mesRef = mesSel;
                // Registra como comissão especial em vendas_secretaria
                await db.collection("vendas_secretaria").add({
                  tipo:"Gratificação",
                  tipoVenda:"gratificacao",
                  perc:0,
                  valorBase:valor,
                  valorComissao:valor,
                  pacienteNome:`🎁 ${obsGrat.trim()}`,
                  mesRef,
                  pacoteId:null,
                  status:"pendente",
                  createdAt:firebase.firestore.FieldValue.serverTimestamp()
                });
                // Registra também como lançamento financeiro (despesa)
                await db.collection("clinica_lancamentos").add({
                  tipo:"despesa",
                  tipo_lancamento:"despesa",
                  categoria:"Salários",
                  descricao:`Gratificação — ${config.nomeSecretaria} — ${obsGrat.trim()}`,
                  valor,
                  data:hoje.toISOString().slice(0,10),
                  centroCusto:"🏥 Clínica",
                  mes:mesRef,
                  formaPag:"PIX",
                  status:"pago",
                  createdAt:firebase.firestore.FieldValue.serverTimestamp()
                });
                setShowGrat(false); setValGrat(""); setObsGrat("");
                alert(`✅ Gratificação de R$ ${valor.toFixed(2).replace(".",",")} registrada com sucesso!`);
              } catch(e){ alert("Erro: "+e.message); }
              setSalvGrat(false);
            }
            return (
              <div>
                <button onClick={()=>setShowGrat(s=>!s)}
                  style={{background:"none",border:"2px solid #7B00C4",color:"#7B00C4",borderRadius:10,padding:"11px 18px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"var(--font-body)",display:"flex",alignItems:"center",gap:6}}>
                  🎁 Registrar Gratificação
                </button>
                {showGrat&&(
                  <div style={{marginTop:10,background:"#f5f0ff",border:"1px solid #c4b5fd",borderRadius:12,padding:"16px 18px",display:"flex",flexDirection:"column",gap:10,minWidth:280}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#7B00C4"}}>🎁 Gratificação para {config.nomeSecretaria}</div>
                    <div>
                      <label style={{fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4}}>VALOR (R$)</label>
                      <input type="number" value={valGrat} onChange={e=>setValGrat(e.target.value)} placeholder="Ex: 50"
                        style={{width:"100%",padding:"8px 10px",border:"1px solid #c4b5fd",borderRadius:8,fontSize:14,fontFamily:"var(--font-body)"}}/>
                    </div>
                    <div>
                      <label style={{fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4}}>MOTIVO</label>
                      <input type="text" value={obsGrat} onChange={e=>setObsGrat(e.target.value)} placeholder="Ex: Ajuste jul/26 — diferença 10%→5%"
                        style={{width:"100%",padding:"8px 10px",border:"1px solid #c4b5fd",borderRadius:8,fontSize:13,fontFamily:"var(--font-body)"}}/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={registrarGratificacao} disabled={salvGrat}
                        style={{flex:1,background:"#7B00C4",color:"white",border:"none",borderRadius:8,padding:"9px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                        {salvGrat?"Salvando...":"✓ Confirmar"}
                      </button>
                      <button onClick={()=>setShowGrat(false)}
                        style={{padding:"9px 14px",background:"white",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Botão Gerar Recibo — sempre visível para qualquer mês */}
      {(()=>{
        function gerarRecibo(){
          const mesLabel = getMesLabel(mesSel);
          const nomeSecretary = config.nomeSecretaria||"Secretária";
          // Inclui tanto pendentes quanto pagas do mês para o recibo histórico
          const itensPend = comissoesPend.map(c=>({
            desc:`${c.tipoVenda==="primeira"?"1ª venda":"Recorrente"} — ${c.pacienteNome||"Paciente"} (${c.perc||10}%)`,
            valor: c.valorComissao||0, status:"pendente"
          }));
          const itensPagos = comissoesPagas.map(c=>({
            desc:`${c.tipoVenda==="primeira"?"1ª venda":"Recorrente"} — ${c.pacienteNome||"Paciente"} (${c.perc||10}%)`,
            valor: c.valorComissao||0, status:"pago"
          }));
          const todoItens = [...itensPend,...itensPagos];
          const totalRecibo = SALARIO_FIXO + todoItens.reduce((a,i)=>a+i.valor,0);
          const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
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
  <div style="font-size:10px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</div>
</div>
<h2>Recibo de Pagamento</h2>
<div class="mes">${mesLabel}</div>
<p>Declaro o recebimento da importância de <strong>R$ ${totalRecibo.toFixed(2).replace(".",",")}</strong> referente à competência <strong>${mesLabel}</strong>:</p>
<table>
  <thead><tr><th>Descrição</th><th style="text-align:right;width:120px">Valor</th></tr></thead>
  <tbody>
    <tr><td>Salário Fixo</td><td style="text-align:right">R$ ${SALARIO_FIXO.toFixed(2).replace(".",",")}</td></tr>
    ${todoItens.map(i=>`<tr><td>${i.desc}</td><td style="text-align:right">R$ ${i.valor.toFixed(2).replace(".",",")}</td></tr>`).join("")}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">R$ ${totalRecibo.toFixed(2).replace(".",",")}</td></tr>
  </tbody>
</table>
<div class="assinatura">
  <div class="assinatura-bloco"><div class="linha"></div><div class="nome-assinatura">${nomeSecretary}</div><div class="cargo-assinatura">Secretária — Recebedor(a)</div></div>
  <div class="assinatura-bloco"><div class="linha"></div><div class="nome-assinatura">Dra. Lucia Kratz</div><div class="cargo-assinatura">CRP 09/20590 — Pagador(a)</div></div>
</div>
<div class="footer">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
          const w=window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),800);
        }
        return (
          <div style={{marginBottom:16}}>
            <button onClick={gerarRecibo}
              style={{background:"white",color:"#7B00C4",border:"2px solid #7B00C4",borderRadius:10,padding:"10px 20px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"var(--font-body)",display:"flex",alignItems:"center",gap:6}}>
              🖨️ Gerar Recibo — {getMesLabel(mesSel)}
            </button>
          </div>
        );
      })()}
      {/* Lista de comissões — ciclo atual */}
      <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-200)",fontWeight:700,fontSize:14}}>
          🔄 Ciclo Atual (a pagar) — {config.nomeSecretaria.split(" ")[0]} — {getMesLabel(mesSel)}
        </div>
        {comissoesPend.length === 0 ? (
          <div style={{padding:"30px 20px",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>
            ✓ Nenhuma comissão pendente — novas vendas aparecem aqui e reabrem o pagamento
          </div>
        ) : comissoesPend.map(c => {
          const dataStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("pt-BR") : c.mesRef||"—";
          return(
          <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid var(--gray-100)",background:"white"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>{c.pacienteNome||"—"}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{c.tipo} · {dataStr}</div>
              {c.pacoteId&&<div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>Pacote: {c.pacoteId.slice(0,8)}...</div>}
              <span style={{fontSize:11,fontWeight:700,color:corTipoVenda(c.tipoVenda),background:corTipoVenda(c.tipoVenda)+"18",padding:"2px 8px",borderRadius:20,display:"inline-block",marginTop:4}}>
                {labelTipoVenda(c.tipoVenda)}
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,color:"var(--text-muted)"}}>Base: R$ {(c.valorBase||0).toFixed(2).replace(".",",")}</div>
                <div style={{fontWeight:700,fontSize:16,color:"#7B00C4"}}>+R$ {(c.valorComissao||0).toFixed(2).replace(".",",")}</div>
              </div>
              {user.tipo==="psicologa"&&(
                <button title="Excluir comissão"
                  onClick={async()=>{
                    if(!confirm(`Excluir comissão de ${c.pacienteNome} (R$ ${(c.valorComissao||0).toFixed(2).replace(".",",")})?`))return;
                    const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
                    await db.collection(col).doc(c.id).delete();
                  }}
                  style={{background:"none",border:"1px solid #fca5a5",borderRadius:6,color:"#dc2626",cursor:"pointer",padding:"4px 8px",fontSize:11}}>
                  🗑️
                </button>
              )}
            </div>
          </div>
        );})}
      </div>

      {/* ── ⚠️ Comissões Aguardando — fora do ciclo até pacote ser pago ── */}
      {comissoesSuspeitas.length > 0 && (
        <div style={{background:"#fffbeb",borderRadius:14,border:"1px solid #fde68a",overflow:"hidden",marginTop:16}}>
          <div style={{padding:"12px 20px",borderBottom:"1px solid #fde68a",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <span style={{fontWeight:700,fontSize:13,color:"#b45309"}}>⏳ Aguardando pagamento do pacote — {comissoesSuspeitas.length} comissão(ões) fora do ciclo</span>
            <span style={{fontSize:11,color:"#92400e"}}>Entram automaticamente quando o pacote for marcado como pago</span>
          </div>
          {comissoesSuspeitas.map(c => {
            const pacoteVinc = c.pacoteId ? pacotes.find(p=>p.id===c.pacoteId) : null;
            const semPacote = c.pacoteId && !pacoteVinc;
            const dataStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("pt-BR") : c.mesRef||"-";
            return (
              <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderBottom:"1px solid #fef3c7"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <div style={{fontWeight:600,fontSize:13,color:"#78350f"}}>{c.pacienteNome||"-"}</div>
                    {semPacote && <span style={{fontSize:10,background:"#fca5a5",color:"#7f1d1d",padding:"1px 6px",borderRadius:8,fontWeight:700}}>Pacote removido</span>}
                    {pacoteVinc && <span style={{fontSize:10,background:"#fed7aa",color:"#7c2d12",padding:"1px 6px",borderRadius:8,fontWeight:600}}>Pacote pendente · R$ {(pacoteVinc.valorTotal||0).toFixed(2).replace(".",",")}</span>}
                  </div>
                  <div style={{fontSize:11,color:"#92400e",marginTop:2}}>{c.tipo} · {dataStr}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"#92400e"}}>Comissão prevista</div>
                    <div style={{fontWeight:700,fontSize:14,color:"#b45309"}}>R$ {(c.valorComissao||0).toFixed(2).replace(".",",")}</div>
                  </div>
                  {user.tipo==="psicologa" && (
                  <button title="Remover do sistema"
                    onClick={async()=>{
                      if(!confirm(`Remover comissão de ${c.pacienteNome}? Ela será gerada novamente quando o pacote for pago.`))return;
                      const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
                      await db.collection(col).doc(c.id).delete();
                    }}
                    style={{background:"none",border:"1px solid #fca5a5",borderRadius:6,color:"#dc2626",cursor:"pointer",padding:"4px 8px",fontSize:11}}>
                    🗑️
                  </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ✓ Histórico do mês: comissões já pagas e pagamentos realizados ── */}
      {(comissoesPagas.length>0||pagamentosDoMes.length>0)&&(
        <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",overflow:"hidden",marginTop:24}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-200)",fontWeight:700,fontSize:14,display:"flex",justifyContent:"space-between"}}>
            <span>✓ Histórico — {getMesLabel(mesSel)}</span>
            <span style={{fontSize:13,color:"#16a34a",fontWeight:600}}>R$ {totalPagas.toFixed(2).replace(".",",")} em comissões pagas</span>
          </div>
          {pagamentosDoMes.length>0&&(
            <div style={{padding:"10px 20px",background:"#f0fdf4",borderBottom:"1px solid var(--gray-100)"}}>
              {pagamentosDoMes.map(pg=>(
                <div key={pg.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}>
                  <span style={{color:"#166534"}}>💰 {pg.tipo} — {pg.data?.split("-").reverse().join("/")}
                    {pg.qtdComissoes?` · ${pg.qtdComissoes} comissão(ões)`:""}
                    {(pg.valorSalarioFixo||0)>0?` · inclui salário fixo`:""}
                  </span>
                  <strong style={{color:"#166534"}}>R$ {(pg.valor||0).toFixed(2).replace(".",",")}</strong>
                </div>
              ))}
            </div>
          )}
          {comissoesPagas.map(c=>(
            <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderBottom:"1px solid var(--gray-100)",opacity:0.75}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{c.pacienteNome||"—"}</div>
                <div style={{fontSize:11,color:"var(--text-muted)"}}>{c.tipo} · {labelTipoVenda(c.tipoVenda)} · pago em {c.dataPagamento?c.dataPagamento.split("-").reverse().join("/"):"—"}</div>
              </div>
              <div style={{fontWeight:700,fontSize:14,color:"#16a34a"}}>✓ R$ {(c.valorComissao||0).toFixed(2).replace(".",",")}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",overflow:"hidden",marginTop:24}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-200)",fontWeight:700,fontSize:14}}>
          🤝 Repasses a Parceiras — {getMesLabel(mesSel)}
        </div>
        {responsaveis.length===0 ? (
          <div style={{padding:"30px 20px",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>
            Nenhum repasse neste mês. Vendas em parceria aparecem aqui automaticamente.
          </div>
        ) : responsaveis.map(resp => {
          const itens = repassesMes.filter(c=>c.responsavel===resp);
          const totalResp = itens.reduce((a,c)=>a+(c.valorComissao||0),0);
          const pendentes = itens.filter(c=>c.status!=="pago");
          const totalPend = pendentes.reduce((a,c)=>a+(c.valorComissao||0),0);
          const parc = parceiras.find(p=>p.nome===resp);
          return (
            <div key={resp} style={{borderBottom:"1px solid var(--gray-100)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"#fffbeb",flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{resp}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)"}}>
                    {itens.length} venda(s) · Total R$ {totalResp.toFixed(2).replace(".",",")}
                    {parc?.pix?` · PIX: ${parc.pix}`:""}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"var(--text-muted)"}}>Pendente</div>
                    <div style={{fontWeight:800,fontSize:18,color:totalPend>0?"#b45309":"#16a34a"}}>R$ {totalPend.toFixed(2).replace(".",",")}</div>
                  </div>
                  {user.tipo==="psicologa" && totalPend>0 && (
                    <button onClick={()=>pagarRepasse(resp)} disabled={pagando}
                      style={{background:"#b45309",color:"white",border:"none",borderRadius:8,padding:"9px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                      {pagando?"...":"💸 Marcar como pago"}
                    </button>
                  )}
                </div>
              </div>
              {itens.map(c=>(
                <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderTop:"1px solid var(--gray-100)"}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{c.pacienteNome||"—"}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)"}}>{c.tipo} · {c.perc?`${c.perc}% de R$ ${(c.valorBase||0).toFixed(2).replace(".",",")}`:""}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#b45309"}}>R$ {(c.valorComissao||0).toFixed(2).replace(".",",")}</div>
                    {c.status==="pago"
                      ? <div style={{fontSize:11,color:"#16a34a",fontWeight:600}}>✓ Pago {c.dataPagamento?c.dataPagamento.split("-").reverse().join("/"):""}</div>
                      : <div style={{fontSize:11,color:"#b45309",fontWeight:600}}>Pendente</div>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── 🤝 CADASTRO DE PARCEIRAS — só psicóloga ── */}
      {user.tipo==="psicologa" && (
        <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",overflow:"hidden",marginTop:24}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-200)",fontWeight:700,fontSize:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Parceiras Cadastradas</span>
            <button onClick={()=>{setEditandoParceira(null);setFormParceira({nome:"",percentual:String(config.percParceiroPadrao||70),pix:"",tipo:"parceira"});setModalParceira(true);}}
              style={{background:"var(--purple)",color:"white",border:"none",borderRadius:8,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>+ Nova Parceira</button>
          </div>
          {parceiras.length===0 ? (
            <div style={{padding:"30px 20px",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>
              Nenhuma parceira cadastrada. Cadastre para usar nas vendas em parceria.
            </div>
          ) : parceiras.map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderBottom:"1px solid var(--gray-100)"}}>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>{p.nome} {p.tipo==="estagiaria"&&<span style={{fontSize:10,fontWeight:700,background:"#ccfbf1",color:"#0d9488",padding:"2px 8px",borderRadius:10,marginLeft:6}}>Estagiária</span>}</div>
                <div style={{fontSize:12,color:"var(--text-muted)"}}>Repasse padrão: {p.percentual||config.percParceiroPadrao}% {p.pix?` · PIX: ${p.pix}`:""}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{setEditandoParceira(p.id);setFormParceira({nome:p.nome||"",percentual:String(p.percentual||config.percParceiroPadrao||70),pix:p.pix||"",tipo:p.tipo||"parceira"});setModalParceira(true);}}
                  style={{background:"none",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",padding:"5px 10px",fontSize:12}}>✏️</button>
                <button onClick={async()=>{
                    if(!confirm(`Excluir parceira ${p.nome}? Os repasses já registrados não serão apagados.`))return;
                    await db.collection("clinica_parceiras").doc(p.id).delete();
                  }}
                  style={{background:"none",border:"1px solid #fca5a5",borderRadius:6,color:"#dc2626",cursor:"pointer",padding:"5px 10px",fontSize:12}}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova/Editar Parceira */}
      {modalParceira&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModalParceira(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:20}}>{editandoParceira?"Editar Parceira":"Nova Parceira"}</div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Nome</label>
              <input className="form-input" value={formParceira.nome} onChange={e=>setFormParceira({...formParceira,nome:e.target.value})} placeholder="Ex: Thais Cordeiro"/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">% de repasse padrão</label>
              <input className="form-input" type="number" min="0" max="100" value={formParceira.percentual} onChange={e=>setFormParceira({...formParceira,percentual:e.target.value})}/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Chave PIX (opcional)</label>
              <input className="form-input" value={formParceira.pix} onChange={e=>setFormParceira({...formParceira,pix:e.target.value})}/>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Tipo</label>
              <select className="form-input" value={formParceira.tipo} onChange={e=>setFormParceira({...formParceira,tipo:e.target.value})}>
                <option value="parceira">Parceira (vendas em parceria)</option>
                <option value="estagiaria">Estagiária (projeto social)</option>
              </select>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModalParceira(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvarParceira}>{editandoParceira?"Salvar alterações":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Depoimentos() {
  const [lista, setLista] = useState([]);
  const [aba, setAba] = useState("pendente");
  const [salvando, setSalvando] = useState(null);
  const [respostaEdit, setRespostaEdit] = useState({});
  const [salvandoResposta, setSalvandoResposta] = useState(null);

  useEffect(()=>{
    const unsub = db.collection("site_depoimentos")
      .orderBy("createdAt","desc")
      .onSnapshot(s=>setLista(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return unsub;
  },[]);

  const filtrado = lista.filter(d=>d.status===aba);
  const pendentes = lista.filter(d=>d.status==="pendente").length;

  async function aprovar(id){
    setSalvando(id);
    await db.collection("site_depoimentos").doc(id).update({status:"aprovado"});
    setSalvando(null);
  }
  async function rejeitar(id){
    if(!confirm("Rejeitar este depoimento?")) return;
    await db.collection("site_depoimentos").doc(id).update({status:"rejeitado"});
  }
  async function excluir(id){
    if(!confirm("Excluir permanentemente?")) return;
    await db.collection("site_depoimentos").doc(id).delete();
  }
  async function salvarResposta(id){
    const texto = (respostaEdit[id]||"").trim();
    setSalvandoResposta(id);
    await db.collection("site_depoimentos").doc(id).update({resposta:texto});
    setSalvandoResposta(null);
  }

  function Estrelas({n}){
    return <span style={{color:"#7B00C4",fontSize:16,letterSpacing:2}}>{"★".repeat(n||5)}{"☆".repeat(5-(n||5))}</span>;
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div className="page-title">Depoimentos</div>
          <div className="page-subtitle">Gerencie os depoimentos do site</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <a href="../feedback/" target="_blank"
            style={{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:10,background:"var(--purple-soft)",color:"var(--purple)",fontSize:13,fontWeight:600,textDecoration:"none"}}>
            <Icon name="external-link" size={14}/> Ver formulário
          </a>
          <button className="btn btn-ghost" style={{fontSize:13}}
            onClick={()=>{ navigator.clipboard.writeText("https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/feedback/"); alert("Link copiado!"); }}>
            <Icon name="copy" size={14}/> Copiar link
          </button>
        </div>
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"2px solid var(--gray-200)"}}>
        {[
          ["pendente","⏳ Pendentes",pendentes],
          ["aprovado","✓ Aprovados",lista.filter(d=>d.status==="aprovado").length],
          ["rejeitado","✗ Rejeitados",lista.filter(d=>d.status==="rejeitado").length],
        ].map(([id,label,count])=>(
          <button key={id} onClick={()=>setAba(id)}
            style={{padding:"10px 20px",border:"none",background:"none",cursor:"pointer",
              fontWeight:aba===id?600:400,color:aba===id?"var(--purple)":"#6b7280",
              borderBottom:aba===id?"2px solid var(--purple)":"2px solid transparent",
              marginBottom:-2,fontSize:14,fontFamily:"var(--font-body)",display:"flex",alignItems:"center",gap:6}}>
            {label}
            {count>0&&<span style={{background:id==="pendente"?"#dc2626":"var(--purple-soft)",color:id==="pendente"?"white":"var(--purple)",borderRadius:20,padding:"1px 7px",fontSize:11,fontWeight:700}}>{count}</span>}
          </button>
        ))}
      </div>

      {filtrado.length===0?(
        <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>
          <Icon name="star" size={40}/>
          <div style={{marginTop:12,fontWeight:500}}>
            {aba==="pendente"?"Nenhum depoimento aguardando aprovação":
             aba==="aprovado"?"Nenhum depoimento aprovado ainda":
             "Nenhum depoimento rejeitado"}
          </div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {filtrado.map(d=>(
            <div key={d.id} className="card" style={{padding:"20px 24px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"var(--purple)",flexShrink:0}}>
                      {(d.nome||"?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:15}}>{d.nome}</div>
                      {d.cargo&&<div style={{fontSize:12,color:"var(--text-muted)"}}>{d.cargo}</div>}
                    </div>
                    <Estrelas n={d.estrelas}/>
                  </div>
                  <p style={{fontSize:14,color:"#374151",lineHeight:1.7,fontStyle:"italic"}}>"{d.texto}"</p>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>
                    {d.createdAt?.seconds ? new Date(d.createdAt.seconds*1000).toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"}) : ""}
                  </div>

                  {/* Resposta da psicóloga */}
                  <div style={{marginTop:14,background:"var(--purple-bg,#f5eeff)",borderRadius:10,padding:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--purple)",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                      <Icon name="message-circle" size={14}/> Sua resposta (aparece no site)
                    </div>
                    <textarea
                      className="form-input"
                      style={{width:"100%",minHeight:60,fontSize:13,fontFamily:"var(--font-body)",resize:"vertical"}}
                      placeholder="Escreva aqui sua resposta pública a este depoimento..."
                      value={respostaEdit[d.id] !== undefined ? respostaEdit[d.id] : (d.resposta||"")}
                      onChange={e=>setRespostaEdit(prev=>({...prev,[d.id]:e.target.value}))}
                    />
                    <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                      <button className="btn btn-purple" style={{fontSize:12,padding:"6px 14px"}}
                        onClick={()=>salvarResposta(d.id)} disabled={salvandoResposta===d.id}>
                        <Icon name="save" size={13}/> {salvandoResposta===d.id?"Salvando...":"Salvar resposta"}
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  {aba==="pendente"&&(
                    <>
                      <button className="btn btn-purple" style={{fontSize:12,padding:"7px 14px"}}
                        onClick={()=>aprovar(d.id)} disabled={salvando===d.id}>
                        <Icon name="check" size={13}/> {salvando===d.id?"...":"Aprovar"}
                      </button>
                      <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px",color:"#dc2626",borderColor:"#fca5a5"}}
                        onClick={()=>rejeitar(d.id)}>
                        <Icon name="x" size={13}/> Rejeitar
                      </button>
                    </>
                  )}
                  {aba==="rejeitado"&&(
                    <button className="btn btn-purple" style={{fontSize:12,padding:"7px 14px"}}
                      onClick={()=>aprovar(d.id)}>
                      <Icon name="check" size={13}/> Aprovar mesmo assim
                    </button>
                  )}
                  {aba==="aprovado"&&(
                    <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 14px",color:"#dc2626",borderColor:"#fca5a5"}}
                      onClick={()=>rejeitar(d.id)}>
                      <Icon name="x" size={13}/> Remover do site
                    </button>
                  )}
                  <button className="btn btn-ghost" style={{fontSize:12,padding:"7px 10px",color:"#dc2626"}}
                    onClick={()=>excluir(d.id)}>
                    <Icon name="trash-2" size={13}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Configuracoes() {
  const [tiposLaudo, setTiposLaudo] = useState([
    "Avaliacao Neuropsicologica","Avaliacao Psicologica","Avaliacao Infantil",
    "Avaliacao de TDAH","Avaliacao de Altas Habilidades","Pericia Psicologica",
    "Demandas Judiciais","Orientacao de Carreira","Relatorio de Acompanhamento","Outro"
  ]);
  const [novoTipo, setNovoTipo] = useState("");
  const [logoUrl, setLogoUrl] = useState("../logo-transparente.png");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  function adicionarTipo(){
    const t = novoTipo.trim();
    if(!t||tiposLaudo.includes(t))return;
    setTiposLaudo(prev=>[...prev,t]);
    setNovoTipo("");
  }

  async function salvarTipos(){
    setSalvando(true);
    await db.collection("clinica_config").doc("laudoTypes").set({tipos:tiposLaudo});
    setMsg("Tipos de laudo salvos!");
    setSalvando(false);
    setTimeout(()=>setMsg(""),3000);
  }

  async function alterarSenha(){
    if(senhaAtual!=="1234"){setMsg("Senha atual incorreta.");return;}
    if(novaSenha.length<4){setMsg("Nova senha deve ter ao menos 4 caracteres.");return;}
    if(novaSenha!==confirmSenha){setMsg("Senhas nao conferem.");return;}
    await db.collection("clinica_config").doc("admin").set({senha:novaSenha});
    setMsg("Senha alterada! Atualize o arquivo app.js com a nova senha.");
    setSenhaAtual("");setNovaSenha("");setConfirmSenha("");
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Configuracoes</div>
        <div className="page-subtitle">Personalize sua identidade clinica e documentos</div>
      </div>

      {msg&&<div style={{background:"var(--purple-bg)",border:"1px solid var(--purple)",borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:14,color:"var(--purple)",fontWeight:500}}>{msg}</div>}

      {/* Identidade Visual */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Identidade Visual</div>
        <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Logotipo e assinatura digital para laudos e documentos oficiais.</p>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:16,padding:16,borderRadius:12,border:"1px solid var(--gray-200)"}}>
            <div style={{width:44,height:44,background:"var(--purple-soft)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Icon name="image" size={22}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>Logo / Identidade Visual</div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>Logotipo que aparecera no cabecalho dos laudos e documentos oficiais. Formatos aceitos: PNG, JPG, SVG.</div>
            </div>
            <button className="btn btn-outline" style={{fontSize:13}}><Icon name="upload" size={14}/> Enviar Logo</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16,padding:16,borderRadius:12,border:"1px solid var(--gray-200)"}}>
            <div style={{width:44,height:44,background:"#f5f3ff",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Icon name="pen-line" size={22}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>Assinatura Digital</div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>Imagem da sua assinatura manuscrita para uso nos laudos assinados. Recomendado fundo transparente (PNG).</div>
            </div>
            <button className="btn btn-outline" style={{fontSize:13}}><Icon name="upload" size={14}/> Enviar Assinatura</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16,padding:16,borderRadius:12,border:"1px solid var(--gray-200)",background:"var(--gray-50)"}}>
            <img src="../logo-transparente.png" alt="Logo padrao" style={{width:56,height:56,borderRadius:10,objectFit:"contain",background:"var(--purple)",padding:6}} onError={e=>e.target.style.display="none"}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>Logo Padrao do Sistema</div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>Esta e a logo padrao. Ela e usada automaticamente enquanto voce nao enviar uma logo personalizada.</div>
              <div style={{fontSize:12,marginTop:4}}><strong>Dra. Lucia Kratz</strong> · Psicologa Doutora · CRP 09/20590</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sobre os Laudos */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Sobre os Laudos</div>
        <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:16,lineHeight:1.7}}>Os laudos gerados seguem a Resolucao CFP no 06/2019. Ao clicar em "Assinar Laudo", o documento recebe um registro de data/hora da assinatura e sua assinatura digital.</p>
        <div style={{background:"var(--purple-bg)",borderRadius:10,padding:16}}>
          <div style={{fontWeight:600,marginBottom:12}}>Tipos de Laudo disponíveis</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
            {tiposLaudo.map((t,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"white",borderRadius:8,padding:"10px 14px",border:"1px solid var(--gray-200)"}}>
                <span style={{flex:1,fontSize:14}}>{t}</span>
                <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)",padding:4}} onClick={()=>setTiposLaudo(prev=>prev.filter((_,idx)=>idx!==i))}>
                  <Icon name="x" size={14}/>
                </button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <input className="form-input" style={{flex:1}} placeholder="Adicionar novo tipo..." value={novoTipo} onChange={e=>setNovoTipo(e.target.value)} onKeyDown={e=>e.key==="Enter"&&adicionarTipo()}/>
            <button className="btn btn-outline" onClick={adicionarTipo}><Icon name="plus" size={16}/></button>
          </div>
          <button className="btn btn-purple" style={{marginTop:14,width:"100%"}} onClick={salvarTipos} disabled={salvando}>{salvando?"Salvando...":"Salvar tipos de laudo"}</button>
        </div>
      </div>

      {/* Senha */}
      <div className="card">
        <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Segurança</div>
        <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>Alterar senha de acesso da Psicologa.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
          <div className="form-group">
            <label className="form-label">Senha atual</label>
            <input className="form-input" type="password" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Nova senha</label>
            <input className="form-input" type="password" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar nova senha</label>
            <input className="form-input" type="password" value={confirmSenha} onChange={e=>setConfirmSenha(e.target.value)}/>
          </div>
        </div>
        <button className="btn btn-purple" onClick={alterarSenha}><Icon name="key" size={15}/> Alterar Senha</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// AGENDA — Doctoralia integrado via iframe
// ═══════════════════════════════════════════════════════
function Agenda() {
  const { data:pacientes } = useCollection("clinica_pacientes","nome");
  const [sessoesPacientes, setSessoesPacientes] = useState([]);
  const [reservasSalaRaw, setReservasSalaRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [form, setForm] = useState({pacienteId:"",data:"",hora:"09:00",duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});
  const [salvando, setSalvando] = useState(false);
  const [viewMode, setViewMode] = useState("timeline");
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  const TIPOS = ["Psicoterapia","Avaliacao Neuropsicologica","Avaliacao Psicologica","Terapia de Casais","Musicoterapia","Orientacao de Carreira","Retorno","Outro"];
  const STATUS_CONFIG = {
    agendado:  {label:"Agendado",   cor:"#7B00C4", bg:"#f5f0ff"},
    confirmado:{label:"Confirmado", cor:"#059669", bg:"#d1fae5"},
    realizado: {label:"Realizado",  cor:"#0891b2", bg:"#e0f2fe"},
    cancelado: {label:"Cancelado",  cor:"#dc2626", bg:"#fee2e2"},
    falta:     {label:"Falta",      cor:"#d97706", bg:"#fef3c7"},
  };
  const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  useEffect(()=>{
    const u1 = db.collection("clinica_sessoes").onSnapshot(snap=>{
      setSessoesPacientes(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    // Reservas da sala (Thais) — aparecem como bloqueios laranjas
    const u2 = db.collection("sala_reservas").onSnapshot(snap=>{
      setReservasSalaRaw(snap.docs.map(d=>({id:d.id,...d.data()})));
    },()=>{});
    return()=>{u1();u2();};
  },[]);

  // Combina sessões de pacientes + reservas de sala num único array memoizado,
  // sem race condition entre os dois listeners (cada um atualiza seu próprio estado)
  const sessoes = useMemo(()=>{
    const reservasSala = reservasSalaRaw.map(r=>({
      id:"sala_"+r.id, ...r,
      pacienteNome: r.usuarioId==="thais"
        ? `🟠 Thais — ${r.titulo||"Sala reservada"}`
        : `🟣 ${r.titulo||"Sala — Lucia"}`,
      tipo:"sala", hora:r.horaInicio,
      status:"agendado", _sala:true
    }));
    return [...sessoesPacientes, ...reservasSala];
  },[sessoesPacientes, reservasSalaRaw]);

  // Calcular semana atual
  function getInicioSemana(offset=0){
    const hoje = new Date();
    const dia = hoje.getDay();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - dia + (offset*7));
    inicio.setHours(0,0,0,0);
    return inicio;
  }

  function getDiasSemana(offset=0){
    const inicio = getInicioSemana(offset);
    return Array.from({length:7},(_,i)=>{
      const d = new Date(inicio);
      d.setDate(inicio.getDate()+i);
      return d;
    });
  }

  const dias = getDiasSemana(semanaOffset);
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  function formatData(d){
    return d.toISOString().split("T")[0];
  }

  function sessoesNoDia(dia){
    const str = formatData(dia);
    return sessoes.filter(s=>s.data===str).sort((a,b)=>a.hora.localeCompare(b.hora));
  }

  async function salvar(){
    if(!form.pacienteId||!form.data||!form.hora){alert("Preencha paciente, data e hora.");return;}
    setSalvando(true);
    const pac = pacientes.find(p=>p.id===form.pacienteId);
    const dados = {...form, pacienteNome:pac?.nome||"", updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    if(editando){
      await db.collection("clinica_sessoes").doc(editando).update(dados);
      await dispararNotificacao({
        tipo:"sessao",
        titulo:`Sessão atualizada — ${pac?.nome||"Paciente"}`,
        corpo:`${form.data?.split("-").reverse().join("/") || ""} às ${form.hora} · ${form.tipo}`,
        pacienteId: form.pacienteId
      });
    } else {
      await db.collection("clinica_sessoes").add({...dados, createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      await dispararNotificacao({
        tipo:"sessao",
        titulo:`Nova sessão agendada — ${pac?.nome||"Paciente"}`,
        corpo:`${form.data?.split("-").reverse().join("/") || ""} às ${form.hora} · ${form.tipo}`,
        pacienteId: form.pacienteId
      });
    }
    setModal(false);setEditando(null);setForm({pacienteId:"",data:"",hora:"09:00",duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});setSalvando(false);
  }

  function abrirEditar(s){
    setForm({pacienteId:s.pacienteId||"",data:s.data||"",hora:s.hora||"09:00",duracao:s.duracao||"50",tipo:s.tipo||"Psicoterapia",status:s.status||"agendado",obs:s.obs||""});
    setEditando(s.id);setModal(true);
  }

  async function mudarStatus(id,status){
    await db.collection("clinica_sessoes").doc(id).update({status});
  }

  async function excluir(id){
    if(!confirm("Excluir esta sessão?"))return;
    await db.collection("clinica_sessoes").doc(id).delete();
  }

  // Sessões de hoje para o painel
  const sessoesHoje = sessoesNoDia(hoje);
  const proximas = sessoes.filter(s=>{
    const d = new Date(s.data+"T00:00:00");
    return d >= hoje && s.status!=="cancelado" && s.status!=="realizado";
  }).slice(0,5);

  const [modalSala, setModalSala] = useState(false);
  const [formSala, setFormSala]   = useState({data:"",horaInicio:"09:00",horaFim:"10:00",titulo:"",recorrencia:"unico"});
  const [salvandoSala, setSalvandoSala] = useState(false);

  async function salvarBloqueioSala(){
    if(!formSala.data||!formSala.horaInicio||!formSala.horaFim){alert("Preencha data, início e fim.");return;}
    if(formSala.horaInicio>=formSala.horaFim){alert("Início deve ser antes do fim.");return;}
    setSalvandoSala(true);
    const base = {
      horaInicio:formSala.horaInicio, horaFim:formSala.horaFim,
      titulo:formSala.titulo||"", usuarioId:"lucia", usuarioNome:"Lucia Kratz",
      cor:"#7B00C4", createdAt:firebase.firestore.FieldValue.serverTimestamp()
    };
    if(formSala.recorrencia==="recorrente"){
      // Gera para as próximas 12 semanas no mesmo dia da semana
      const dataInicio = new Date(formSala.data+"T00:00:00");
      const diaSemana = dataInicio.getDay();
      const batch = db.batch();
      for(let w=0; w<12; w++){
        const d = new Date(dataInicio);
        d.setDate(dataInicio.getDate()+(w*7));
        const dataStr = d.toISOString().split("T")[0];
        const ref = db.collection("sala_reservas").doc();
        batch.set(ref, {...base, data:dataStr, recorrenteRef:formSala.data});
      }
      await batch.commit();
      await dispararNotificacao({
        tipo:"bloqueio_sala",
        titulo:`Sala bloqueada — recorrente (12 semanas)`,
        corpo:`${formSala.data?.split("-").reverse().join("/") || ""} · ${formSala.horaInicio}–${formSala.horaFim}${formSala.titulo?" · "+formSala.titulo:""}`
      });
    } else {
      await db.collection("sala_reservas").add({...base, data:formSala.data});
      await dispararNotificacao({
        tipo:"bloqueio_sala",
        titulo:`Sala bloqueada — ${formSala.data?.split("-").reverse().join("/") || ""}`,
        corpo:`${formSala.horaInicio}–${formSala.horaFim}${formSala.titulo?" · "+formSala.titulo:""}`
      });
    }
    setModalSala(false);
    setFormSala({data:"",horaInicio:"09:00",horaFim:"10:00",titulo:"",recorrencia:"unico"});
    setSalvandoSala(false);
  }

  if(loading) return <Spinner/>;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div style={{minWidth:0}}>
          <div className="page-title">Agenda</div>
          <div className="page-subtitle">{sessoes.filter(s=>s.status==="agendado"||s.status==="confirmado").length} sessões agendadas</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <a href="https://docplanner.doctoralia.com.br/#/calendar/week" target="_blank" rel="noreferrer"
            className="btn btn-ghost" style={{fontSize:13,textDecoration:"none",display:"flex",alignItems:"center",gap:6}}>
            <Icon name="external-link" size={13}/> Doctoralia
          </a>
          <button className="btn btn-ghost" style={{borderColor:"#ea580c",color:"#ea580c"}}
            onClick={()=>{setFormSala({data:formatData(hoje),horaInicio:"09:00",horaFim:"10:00",titulo:"",recorrencia:"unico"});setModalSala(true);}}>
            <Icon name="lock" size={15}/> Bloquear Sala
          </button>
          <button className="btn btn-purple" onClick={()=>{setForm({pacienteId:"",data:formatData(hoje),hora:"09:00",duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});setEditando(null);setModal(true);}}>
            <Icon name="plus" size={16}/> Nova Sessão
          </button>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
        {[["Hoje",sessoesHoje.length,"#7B00C4","var(--purple-soft)"],["Agendadas",sessoes.filter(s=>s.status==="agendado").length,"#0891b2","#e0f2fe"],["Confirmadas",sessoes.filter(s=>s.status==="confirmado").length,"#059669","#d1fae5"],["Este mês",sessoes.filter(s=>s.data?.startsWith(new Date().toISOString().slice(0,7))).length,"#d97706","#fef3c7"]].map(([l,n,cor,bg])=>(
          <div key={l} style={{background:bg,borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
            <div style={{fontSize:24,fontWeight:800,color:cor}}>{n}</div>
            <div style={{fontSize:12,color:cor,fontWeight:500}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Navegação semana */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button className="btn btn-ghost" style={{padding:"8px 12px"}} onClick={()=>setSemanaOffset(s=>s-1)}><Icon name="chevron-left" size={18}/></button>
        <div style={{flex:1,textAlign:"center",fontWeight:600,fontSize:15}}>
          {dias[0].toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})} — {dias[6].toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}
        </div>
        <button className="btn btn-ghost" style={{padding:"8px 10px",fontSize:12}} onClick={()=>setSemanaOffset(0)}>Hoje</button>
        <button className="btn btn-ghost" style={{padding:"8px 12px"}} onClick={()=>setSemanaOffset(s=>s+1)}><Icon name="chevron-right" size={18}/></button>
      </div>

      {/* ── AGENDA: mobile=lista vertical / desktop=grade+lista ── */}
      {(()=>{
        const isMobile = window.innerWidth < 768;
        const HORA_INI = 7, HORA_FIM = 22;
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const dias7 = getDiasSemana(semanaOffset);

        function horaParaMin(h){ const [hh,mm]=(h||"00:00").split(":").map(Number); return hh*60+(mm||0); }
        function minParaHora(m){ return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); }

        // Monta linhas da timeline para um dia
        function montarLinhasDia(diaStr){
          const sessDia  = sessoes.filter(s=>s.data===diaStr&&!s._sala).sort((a,b)=>a.hora.localeCompare(b.hora));
          const salasDia = sessoes.filter(s=>s.data===diaStr&&s._sala).map(s=>({
            inicio: s.horaInicio||s.hora||"00:00",
            fim:    s.horaFim   ||s.hora||"00:00",
            nome:   s.pacienteNome||"Sala",
            ehLucia:!(s.pacienteNome||"").toLowerCase().includes("thais"),
            raw:s,
          }));

          function sessoesNoMin(m){
            // Retorna sessões que COMEÇAM neste slot de 1h (ini >= m E ini < m+60)
            return sessDia.filter(s=>{
              const ini=horaParaMin(s.hora);
              return ini >= m && ini < m+60;
            });
          }
          function blocoNoMin(m){
            return salasDia.find(b=>m>=horaParaMin(b.inicio)&&m<horaParaMin(b.fim));
          }

          const linhas=[];
          const jaExibidas = new Set(); // ids de sessão já lançadas na timeline
          for(let m=HORA_INI*60; m<HORA_FIM*60; m+=60){
            const hStr=minParaHora(m);
            const sessNoSlot=sessoesNoMin(m);
            const bloco=blocoNoMin(m);
            let teveSessaoInicio=false;
            sessNoSlot.forEach(sess=>{
              // Exibe a sessão no slot onde ela COMEÇA (19:30 aparece no slot 19:00-20:00)
              const sessIni = horaParaMin(sess.hora);
              const iniciaSessao = sessIni >= m && sessIni < m+60;
              if(iniciaSessao && !jaExibidas.has(sess.id)){
                linhas.push({tipo:"sessao",hStr,sess});
                jaExibidas.add(sess.id);
                teveSessaoInicio=true;
              }
            });
            if(sessNoSlot.length>0){
              // já tem sessão cobrindo este minuto (seja início ou meio) — não mostrar vago/bloco neste slot
            } else if(bloco){
              if(bloco.ehLucia) linhas.push({tipo:"livre",hStr,bloco});
              else {
                // só mostrar início do bloco Thais uma vez
                if(!linhas.length||linhas[linhas.length-1].tipo!=="thais"||linhas[linhas.length-1].bloco.raw.id!==bloco.raw.id)
                  linhas.push({tipo:"thais",hStr,bloco});
              }
            }
            // fora de bloco: não mostrar para não poluir
          }
          return linhas;
        }

        // ── COMPONENTE de um card de sessão ──
        function CardSessao({s,hStr}){
          const st=STATUS_CONFIG[s.status]||STATUS_CONFIG.agendado;
          const dur=parseInt(s.duracao||50);
          const fim=minParaHora(horaParaMin(s.hora)+dur);
          const online=(s.tipo||"").toLowerCase().includes("online");
          return (
            <div onClick={()=>abrirEditar(s)}
              style={{display:"flex",alignItems:"stretch",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",cursor:"pointer",background:st.bg,marginBottom:4}}>
              <div style={{width:4,background:st.cor,flexShrink:0}}/>
              <div style={{flex:1,padding:"10px 12px"}}>
                <div style={{fontSize:15,fontWeight:700,color:"#111827",lineHeight:1.3}}>{s.pacienteNome||"—"}</div>
                <div style={{fontSize:12,color:st.cor,fontWeight:600,marginTop:2}}>
                  {s.hora.slice(0,5)} – {fim}
                  {online&&<span style={{marginLeft:6}}>📹</span>}
                </div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:1}}>{s.tipo||"Psicoterapia"}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 10px",gap:4}}>
                <span style={{background:st.cor,color:"white",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{st.label}</span>
                <select value={s.status}
                  onChange={e=>{e.stopPropagation();mudarStatus(s.id,e.target.value);}}
                  onClick={e=>e.stopPropagation()}
                  style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:6,padding:"2px 3px",background:"white",cursor:"pointer",maxWidth:84}}>
                  {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          );
        }

        function CardLivre({hStr,diaStr}){
          return (
            <button onClick={()=>{setForm({pacienteId:"",data:diaStr,hora:hStr,duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});setEditando(null);setModal(true);}}
              style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"#faf5ff",border:"1.5px dashed #c4b5fd",borderRadius:10,padding:"8px 12px",cursor:"pointer",color:"#7B00C4",fontSize:13,fontFamily:"var(--font-body)",marginBottom:3}}>
              <Icon name="plus-circle" size={14}/> <span style={{fontWeight:600}}>{hStr}</span> <span style={{color:"#a78bfa",fontWeight:400}}>· Disponível</span>
            </button>
          );
        }

        function CardThais({bloco}){
          return (
            <div style={{display:"flex",alignItems:"stretch",borderRadius:10,overflow:"hidden",background:"#fff7ed",border:"1px solid #fed7aa",marginBottom:3}}>
              <div style={{width:4,background:"#ea580c",flexShrink:0}}/>
              <div style={{padding:"8px 12px"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#ea580c"}}>{bloco.nome}</div>
                <div style={{fontSize:11,color:"#9a3412"}}>{bloco.inicio} – {bloco.fim} · Sala ocupada</div>
              </div>
            </div>
          );
        }

        // ── VISÃO MOBILE: lista vertical contínua ──
        if(isMobile){
          // Mostrar 14 dias a partir de hoje
          const diasMobile = Array.from({length:14},(_,i)=>{
            const d=new Date(hoje); d.setDate(hoje.getDate()+i); return d;
          });
          return (
            <div>
              {/* Navegação semana */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <button onClick={()=>setSemanaOffset(o=>o-1)} className="btn btn-ghost" style={{padding:"6px 12px"}}>‹ Anterior</button>
                <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>
                  {formatData(dias7[0])} – {formatData(dias7[6])}
                </span>
                <button onClick={()=>setSemanaOffset(o=>o+1)} className="btn btn-ghost" style={{padding:"6px 12px"}}>Próxima ›</button>
              </div>
              {diasMobile.map((dia,di)=>{
                const diaStr=formatData(dia);
                const linhas=montarLinhasDia(diaStr);
                const isHoje=diaStr===formatData(hoje);
                if(linhas.length===0&&!isHoje) return null; // ocultar dias vazios sem bloco
                return (
                  <div key={di} style={{display:"flex",gap:0,marginBottom:8}}>
                    {/* Coluna lateral dia */}
                    <div style={{width:44,flexShrink:0,paddingTop:10,textAlign:"center"}}>
                      <div style={{fontSize:10,fontWeight:700,color:isHoje?"var(--purple)":"#9ca3af",textTransform:"uppercase"}}>
                        {DIAS_SEMANA[dia.getDay()]}
                      </div>
                      <div style={{width:32,height:32,borderRadius:"50%",background:isHoje?"var(--purple)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",margin:"2px auto 0"}}>
                        <span style={{fontSize:18,fontWeight:800,color:isHoje?"white":isHoje?"var(--purple)":"#111827"}}>{dia.getDate()}</span>
                      </div>
                    </div>
                    {/* Linha vertical */}
                    <div style={{width:2,background:isHoje?"var(--purple)":"#e5e7eb",borderRadius:2,flexShrink:0,marginTop:14,marginRight:10}}/>
                    {/* Cards */}
                    <div style={{flex:1,paddingTop:6}}>
                      {linhas.length===0?(
                        <div style={{color:"#d1d5db",fontSize:12,padding:"8px 0"}}>Sem eventos</div>
                      ):linhas.map((l,li)=>{
                        if(l.tipo==="sessao") return <CardSessao key={li} s={l.sess} hStr={l.hStr}/>;
                        if(l.tipo==="livre")  return <CardLivre  key={li} hStr={l.hStr} diaStr={diaStr}/>;
                        if(l.tipo==="thais")  return <CardThais  key={li} bloco={l.bloco}/>;
                        return null;
                      })}
                      <button onClick={()=>{setForm({pacienteId:"",data:diaStr,hora:"09:00",duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});setEditando(null);setModal(true);}}
                        style={{background:"none",border:"1px dashed #d1d5db",borderRadius:8,padding:"5px 12px",cursor:"pointer",color:"#9ca3af",fontSize:12,width:"100%",marginTop:2,fontFamily:"var(--font-body)"}}>
                        + Agendar
                      </button>
                      {(()=>{
                        const sessDia=sessoes.filter(s=>s.data===diaStr&&!s._sala);
                        if(sessDia.length===0) return null;
                        function enviarResumoMob(){
                          const dataFmt=new Date(diaStr+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
                          const realizadas=sessDia.filter(s=>s.status==="realizado");
                          const confirmadas=sessDia.filter(s=>s.status==="confirmado");
                          const agendadas=sessDia.filter(s=>s.status==="agendado");
                          const faltas=sessDia.filter(s=>s.status==="falta");
                          const canceladas=sessDia.filter(s=>s.status==="cancelado");
                          let msg=`📅 *Resumo do dia — ${dataFmt}*\n🔢 Total: ${sessDia.length} sessão(ões)\n\n`;
                          if(realizadas.length) msg+=`✅ *Realizadas (${realizadas.length}):*\n${realizadas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                          if(confirmadas.length) msg+=`🟢 *Confirmadas (${confirmadas.length}):*\n${confirmadas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                          if(agendadas.length) msg+=`🟡 *Agendadas/Pendentes (${agendadas.length}):*\n${agendadas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                          if(faltas.length) msg+=`❌ *Faltas (${faltas.length}):*\n${faltas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                          if(canceladas.length) msg+=`🚫 *Canceladas (${canceladas.length}):*\n${canceladas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                          msg+=`_Enviado pela Clínica Dra. Lucia Kratz_ 🦋`;
                          window.open(`https://wa.me/5562991546765?text=${encodeURIComponent(msg)}`,"_blank");
                        }
                        return (
                          <button onClick={enviarResumoMob}
                            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"#25D366",color:"white",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:600,width:"100%",marginTop:6,fontFamily:"var(--font-body)"}}>
                            <span>📲</span> Resumo WhatsApp
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        // ── VISÃO DESKTOP: seletor de view + grade/timeline ──
        const diaAtual = diaSelecionado || formatData(hoje);
        return (
          <div>
            {/* Seletor view */}
            <div style={{display:"flex",gap:6,marginBottom:16,background:"var(--gray-100)",borderRadius:12,padding:4,maxWidth:260}}>
              {[["timeline","📅 Timeline"],["semana","🗓️ Semana"]].map(([v,l])=>(
                <button key={v} onClick={()=>setViewMode(v)}
                  style={{flex:1,padding:"8px 12px",borderRadius:9,border:"none",background:viewMode===v?"white":"transparent",color:viewMode===v?"var(--purple)":"#6b7280",fontWeight:viewMode===v?700:500,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)",boxShadow:viewMode===v?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>
                  {l}
                </button>
              ))}
            </div>

            {/* DESKTOP TIMELINE */}
            {viewMode==="timeline"&&(
              <div style={{display:"flex",gap:20}}>
                {/* Seletor de dias */}
                <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
                  {dias7.map((dia,idx)=>{
                    const str=formatData(dia);
                    const isH=str===formatData(hoje);
                    const isSel=str===diaAtual;
                    const temS=sessoes.some(s=>s.data===str&&!s._sala);
                    return (
                      <button key={idx} onClick={()=>setDiaSelecionado(str)}
                        style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 12px",borderRadius:12,border:"1.5px solid",borderColor:isSel?"var(--purple)":isH?"#c4b5fd":"#e5e7eb",background:isSel?"var(--purple)":isH?"#f5f0ff":"white",cursor:"pointer",minWidth:56}}>
                        <span style={{fontSize:10,fontWeight:600,color:isSel?"rgba(255,255,255,.75)":isH?"var(--purple)":"#9ca3af",textTransform:"uppercase"}}>{DIAS_SEMANA[dia.getDay()]}</span>
                        <span style={{fontSize:20,fontWeight:800,color:isSel?"white":isH?"var(--purple)":"#111827"}}>{dia.getDate()}</span>
                        {temS&&<div style={{width:5,height:5,borderRadius:"50%",background:isSel?"rgba(255,255,255,.7)":"var(--purple)",marginTop:2}}/>}
                      </button>
                    );
                  })}
                </div>
                {/* Lista do dia */}
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>
                      {new Date(diaAtual+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}
                    </div>
                    {(()=>{
                      const sessDia = sessoes.filter(s=>s.data===diaAtual&&!s._sala);
                      if(sessDia.length===0) return null;
                      function enviarResumo(){
                        const dataFmt = new Date(diaAtual+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
                        const realizadas = sessDia.filter(s=>s.status==="realizado");
                        const confirmadas = sessDia.filter(s=>s.status==="confirmado");
                        const agendadas  = sessDia.filter(s=>s.status==="agendado");
                        const faltas     = sessDia.filter(s=>s.status==="falta");
                        const canceladas = sessDia.filter(s=>s.status==="cancelado");
                        let msg = `📅 *Resumo do dia — ${dataFmt}*\n`;
                        msg += `🔢 Total: ${sessDia.length} sessão(ões)\n\n`;
                        if(realizadas.length) msg += `✅ *Realizadas (${realizadas.length}):*\n${realizadas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                        if(confirmadas.length) msg += `🟢 *Confirmadas (${confirmadas.length}):*\n${confirmadas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                        if(agendadas.length)  msg += `🟡 *Agendadas/Pendentes (${agendadas.length}):*\n${agendadas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                        if(faltas.length)     msg += `❌ *Faltas (${faltas.length}):*\n${faltas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                        if(canceladas.length) msg += `🚫 *Canceladas (${canceladas.length}):*\n${canceladas.map(s=>`  • ${s.pacienteNome} — ${s.hora?.slice(0,5)}`).join("\n")}\n\n`;
                        msg += `_Enviado pela Clínica Dra. Lucia Kratz_ 🦋`;
                        const url = `https://wa.me/5562991546765?text=${encodeURIComponent(msg)}`;
                        window.open(url,"_blank");
                      }
                      return (
                        <button onClick={enviarResumo}
                          style={{display:"flex",alignItems:"center",gap:6,background:"#25D366",color:"white",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"var(--font-body)"}}>
                          <span style={{fontSize:15}}>📲</span> Resumo WhatsApp
                        </button>
                      );
                    })()}
                  </div>
                  {(()=>{
                    const linhas=montarLinhasDia(diaAtual);
                    if(linhas.length===0) return (
                      <div style={{textAlign:"center",padding:40,color:"var(--text-muted)",background:"var(--gray-50)",borderRadius:14}}>
                        <Icon name="calendar" size={32}/>
                        <div style={{marginTop:8,fontWeight:600}}>Nenhum evento neste dia</div>
                        <button className="btn btn-purple" style={{marginTop:12,fontSize:13}}
                          onClick={()=>{setForm({pacienteId:"",data:diaAtual,hora:"09:00",duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});setEditando(null);setModal(true);}}>
                          + Agendar
                        </button>
                      </div>
                    );
                    return linhas.map((l,li)=>{
                      if(l.tipo==="sessao") return <CardSessao key={li} s={l.sess} hStr={l.hStr}/>;
                      if(l.tipo==="livre")  return <CardLivre  key={li} hStr={l.hStr} diaStr={diaAtual}/>;
                      if(l.tipo==="thais")  return <CardThais  key={li} bloco={l.bloco}/>;
                      return null;
                    });
                  })()}
                </div>
              </div>
            )}

            {/* DESKTOP GRADE SEMANAL */}
            {viewMode==="semana"&&(
              <div style={{marginBottom:24}}>
                <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><div style={{display:"grid",gridTemplateColumns:"60px repeat(7,minmax(44px,1fr))",gap:3,marginBottom:4,minWidth:380}}>
                  <div/>
                  {dias.map((dia,i)=>{
                    const isHoje=formatData(dia)===formatData(hoje);
                    const isPassado=dia<hoje;
                    return (
                      <div key={i} style={{textAlign:"center",padding:"8px 4px",borderRadius:10,background:isHoje?"var(--purple)":"white",border:"1.5px solid",borderColor:isHoje?"var(--purple)":"var(--gray-200)"}}>
                        <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",color:isHoje?"rgba(255,255,255,.8)":isPassado?"#9ca3af":"var(--gray-500)"}}>{DIAS_SEMANA[i]}</div>
                        <div style={{fontSize:20,fontWeight:800,color:isHoje?"white":isPassado?"#9ca3af":"var(--gray-800)",lineHeight:1.2}}>{dia.getDate()}</div>
                        <div style={{fontSize:9,color:isHoje?"rgba(255,255,255,.7)":"var(--gray-400)"}}>{dia.toLocaleDateString("pt-BR",{month:"short"})}</div>
                      </div>
                    );
                  })}
                </div></div>
                <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:4}}>
                {[
                  {label:"☀️ Manhã",   range:["06:00","12:00"],bg:"#fffbeb"},
                  {label:"🌤️ Tarde",   range:["12:00","18:00"],bg:"#f0f9ff"},
                  {label:"🌙 Noite",   range:["18:00","23:59"],bg:"#f5f3ff"},
                ].map(periodo=>(
                  <div key={periodo.label} style={{display:"grid",gridTemplateColumns:"60px repeat(7,minmax(44px,1fr))",gap:3,marginBottom:4,minWidth:380}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"flex-end",paddingRight:8,paddingTop:8}}>
                      <span style={{fontSize:11,fontWeight:600,color:"var(--gray-500)"}}>{periodo.label}</span>
                    </div>
                    {dias.map((dia,i)=>{
                      const isHoje=formatData(dia)===formatData(hoje);
                      const sessDia=sessoesNoDia(dia).filter(s=>s.hora>=periodo.range[0]&&s.hora<periodo.range[1]);
                      return (
                        <div key={i} style={{minHeight:70,background:isHoje?periodo.bg+"cc":periodo.bg,border:"1px solid",borderColor:isHoje?"var(--purple)30":"var(--gray-200)",borderRadius:8,padding:4,display:"flex",flexDirection:"column",gap:3}}>
                          {sessDia.map(s=>{
                            const st=s._sala?{bg:"#fff7ed",cor:"#ea580c",label:"Sala"}:STATUS_CONFIG[s.status]||STATUS_CONFIG.agendado;
                            return (
                              <div key={s.id} onClick={()=>!s._sala&&abrirEditar(s)}
                                style={{background:st.bg,borderLeft:"3px solid "+st.cor,borderRadius:5,padding:"4px 6px",cursor:s._sala?"default":"pointer",fontSize:11,lineHeight:1.4}}>
                                <div style={{fontWeight:700,color:st.cor,fontSize:12}}>{s.hora}</div>
                                <div style={{color:"#111",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>
                                  {s._sala?(s.pacienteNome||"Sala"):(s.pacienteNome?.split(" ")[0]||"—")}
                                </div>
                                {!s._sala&&<div style={{color:"#6b7280",fontSize:9}}>{s.tipo}</div>}
                              </div>
                            );
                          })}
                          <button onClick={()=>{setForm({pacienteId:"",data:formatData(dia),hora:periodo.range[0]==="06:00"?"08:00":periodo.range[0]==="12:00"?"14:00":"19:00",duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});setEditando(null);setModal(true);}}
                            style={{background:"none",border:"1px dashed #d1d5db",borderRadius:4,padding:"3px",cursor:"pointer",color:"#9ca3af",fontSize:11,width:"100%",marginTop:"auto"}}>+</button>
                        </div>
                      );
                    })}
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal nova/editar sessão */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>{editando?"Editar Sessão":"Nova Sessão"}</div>
              <button onClick={()=>setModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)"}}><Icon name="x" size={20}/></button>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Paciente *</label>
              <select className="form-input" value={form.pacienteId} onChange={e=>setForm({...form,pacienteId:e.target.value})}>
                <option value="">Selecionar paciente...</option>
                {pacientes.filter(p=>p.status==="ativo").sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR")).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input className="form-input" type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Hora *</label>
                <input className="form-input" type="time" value={form.hora} onChange={e=>setForm({...form,hora:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Duração (min)</label>
                <select className="form-input" value={form.duracao} onChange={e=>setForm({...form,duracao:e.target.value})}>
                  {["30","45","50","60","90"].map(d=><option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                  {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                  {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Observações</label>
              <TextAreaVoz className="form-input" rows={2} value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} placeholder="Notas sobre a sessão..."/>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"space-between"}}>
              {editando&&(
                <button className="btn btn-ghost" style={{color:"#dc2626",border:"1px solid #fecaca"}}
                  onClick={()=>{excluir(editando);setModal(false);}}>
                  <Icon name="trash-2" size={15}/> Excluir
                </button>
              )}
              <div style={{display:"flex",gap:10,marginLeft:"auto"}}>
                <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                <button className="btn btn-purple" onClick={salvar} disabled={salvando}>
                  <Icon name="save" size={15}/> {salvando?"Salvando...":"Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL BLOQUEAR SALA */}
      {modalSala&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModalSala(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                <Icon name="lock" size={18}/> Bloquear Sala
              </div>
              <button onClick={()=>setModalSala(false)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#92400e"}}>
              Este bloqueio aparece para a Thais como horário ocupado na agenda compartilhada.
            </div>
            {/* Recorrência */}
            <div className="form-group" style={{marginBottom:16}}>
              <label className="form-label">Tipo de bloqueio</label>
              <div style={{display:"flex",gap:8}}>
                {[["unico","Só este dia","#7B00C4"],["recorrente","Toda semana (12 semanas)","#059669"]].map(([v,l,c])=>(
                  <button key={v} type="button" onClick={()=>setFormSala({...formSala,recorrencia:v})}
                    style={{flex:1,padding:"10px 8px",borderRadius:10,border:"1.5px solid",borderColor:formSala.recorrencia===v?c:"#e5e7eb",background:formSala.recorrencia===v?c+"15":"white",color:formSala.recorrencia===v?c:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:12,fontFamily:"var(--font-body)",textAlign:"center"}}>
                    {l}
                  </button>
                ))}
              </div>
              {formSala.recorrencia==="recorrente"&&(
                <div style={{marginTop:8,fontSize:12,color:"#059669",background:"#f0fdf4",borderRadius:8,padding:"8px 12px"}}>
                  ✓ Vai bloquear o mesmo dia da semana por 12 semanas consecutivas
                </div>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Data</label>
                <input className="form-input" type="date" value={formSala.data} onChange={e=>setFormSala({...formSala,data:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Início</label>
                <input className="form-input" type="time" value={formSala.horaInicio} onChange={e=>setFormSala({...formSala,horaInicio:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Fim</label>
                <input className="form-input" type="time" value={formSala.horaFim} onChange={e=>setFormSala({...formSala,horaFim:e.target.value})}/>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Título (opcional)</label>
                <input className="form-input" value={formSala.titulo} onChange={e=>setFormSala({...formSala,titulo:e.target.value})} placeholder="Ex: Sessão, Avaliação..."/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
              <button className="btn btn-ghost" onClick={()=>setModalSala(false)}>Cancelar</button>
              <button style={{background:"#ea580c",color:"white",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"var(--font-body)"}} onClick={salvarBloqueioSala} disabled={salvandoSala}>
                <Icon name="lock" size={15}/> {salvandoSala?"Salvando...":"Bloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// APP
// ─── VITRINE DE PRODUTOS (CRUD) ──────────────────────────
function VitrineProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const formVazio = {titulo:"",descricao:"",imagemUrl:"",linkVendas:"",textoBotao:"",ativo:true};
  const [form, setForm] = useState(formVazio);

  useEffect(()=>{
    const unsub = db.collection("produtos_vitrine").onSnapshot(s=>{
      const docs = s.docs.map(d=>({id:d.id,...d.data()}));
      docs.sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
      setProdutos(docs);
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
  },[]);

  function abrirNovo(){ setForm(formVazio); setEditando(null); setModal(true); }
  function abrirEditar(p){ setForm({titulo:p.titulo||"",descricao:p.descricao||"",imagemUrl:p.imagemUrl||"",linkVendas:p.linkVendas||"",textoBotao:p.textoBotao||"",ativo:p.ativo!==false}); setEditando(p.id); setModal(true); }

  async function salvar(){
    if(!form.titulo||!form.linkVendas){ alert("Título e link de vendas são obrigatórios."); return; }
    setSalvando(true);
    try {
      const dados = {...form, updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
      if(editando){
        await db.collection("produtos_vitrine").doc(editando).update(dados);
      } else {
        await db.collection("produtos_vitrine").add({...dados, createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      }
      setModal(false); setEditando(null); setForm(formVazio);
    } catch(e){ alert("Erro ao salvar: "+e.message); }
    finally{ setSalvando(false); }
  }

  async function toggleAtivo(p){
    await db.collection("produtos_vitrine").doc(p.id).update({ativo:!p.ativo});
  }

  async function excluir(id){
    if(!confirm("Excluir este produto da vitrine?")) return;
    await db.collection("produtos_vitrine").doc(id).delete();
  }

  if(loading) return <Spinner/>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <div className="page-title">🛍️ Vitrine de Produtos</div>
          <div className="page-subtitle">{produtos.length} produto(s) · {produtos.filter(p=>p.ativo).length} ativo(s)</div>
        </div>
        <button className="btn btn-purple" onClick={abrirNovo}><Icon name="plus" size={15}/> Novo Produto</button>
      </div>

      {produtos.length===0?(
        <div className="card" style={{textAlign:"center",padding:60,color:"var(--text-muted)"}}>
          <Icon name="shopping-bag" size={48}/>
          <div style={{marginTop:12,fontWeight:600}}>Nenhum produto cadastrado</div>
          <p style={{fontSize:13,marginTop:8,marginBottom:20}}>Cadastre produtos como o 9&Self para exibir no portal do paciente.</p>
          <button className="btn btn-purple" onClick={abrirNovo}><Icon name="plus" size={14}/> Cadastrar primeiro produto</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {produtos.map(p=>(
            <div key={p.id} className="card" style={{padding:"18px 20px",opacity:p.ativo?1:0.6}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                {p.imagemUrl?(
                  <img src={p.imagemUrl} alt={p.titulo} style={{width:72,height:56,objectFit:"cover",borderRadius:8,flexShrink:0}}/>
                ):(
                  <div style={{width:72,height:56,background:"var(--purple-soft)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon name="image" size={22}/>
                  </div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:15}}>{p.titulo}</span>
                    <span style={{background:p.ativo?"#d1fae5":"#f3f4f6",color:p.ativo?"#065f46":"#6b7280",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>
                      {p.ativo?"✓ Ativo":"Inativo"}
                    </span>
                  </div>
                  {p.descricao&&<div style={{fontSize:13,color:"var(--text-muted)",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.descricao}</div>}
                  {p.linkVendas&&<div style={{fontSize:12,color:"#2563eb"}}><Icon name="link" size={11}/> {p.linkVendas}</div>}
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:14,paddingTop:12,borderTop:"1px solid var(--gray-100)",flexWrap:"wrap"}}>
                <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>abrirEditar(p)}><Icon name="pencil" size={13}/> Editar</button>
                <button className="btn btn-ghost" style={{fontSize:12,color:p.ativo?"#d97706":"#059669"}} onClick={()=>toggleAtivo(p)}>
                  <Icon name={p.ativo?"eye-off":"eye"} size={13}/> {p.ativo?"Desativar":"Ativar"}
                </button>
                {p.linkVendas&&(
                  <a href={p.linkVendas} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{fontSize:12,textDecoration:"none"}}>
                    <Icon name="external-link" size={13}/> Ver página
                  </a>
                )}
                <button className="btn btn-ghost" style={{fontSize:12,color:"#dc2626",marginLeft:"auto"}} onClick={()=>excluir(p.id)}><Icon name="trash-2" size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:20}}>{editando?"Editar Produto":"Novo Produto"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input className="form-input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Ex: Mapeamento de Perfil 9&Self"/>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição (copy do produto)</label>
                <textarea className="form-input" rows={3} value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} placeholder="Texto comercial exibido no card do paciente..."/>
              </div>
              <div className="form-group">
                <label className="form-label">URL da imagem / banner</label>
                <input className="form-input" value={form.imagemUrl} onChange={e=>setForm({...form,imagemUrl:e.target.value})} placeholder="https://..."/>
              </div>
              <div className="form-group">
                <label className="form-label">Link de vendas / checkout *</label>
                <input className="form-input" value={form.linkVendas} onChange={e=>setForm({...form,linkVendas:e.target.value})} placeholder="https://..."/>
              </div>
              <div className="form-group">
                <label className="form-label">Texto do botão</label>
                <input className="form-input" value={form.textoBotao} onChange={e=>setForm({...form,textoBotao:e.target.value})} placeholder="Ex: Quero Fazer Meu Mapeamento"/>
              </div>
              <div style={{display:"flex",gap:10}}>
                {[true,false].map(v=>(
                  <button key={v+""}  type="button" onClick={()=>setForm({...form,ativo:v})}
                    style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid",borderColor:form.ativo===v?"var(--purple)":"#e5e7eb",background:form.ativo===v?"var(--purple-soft)":"white",color:form.ativo===v?"var(--purple)":"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13}}>
                    {v?"✓ Ativo no portal":"Inativo (oculto)"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}>{salvando?"Salvando...":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(null);
  const notifProps = useBotaoNotificacao(user);
  // ═══════════════════════════════════════════════════════
// PAINEL DE PERMISSÕES
// ═══════════════════════════════════════════════════════
const PERMISSOES_DEFAULT = {
  psicologa:  {ver_financeiro_clinica:true,ver_financeiro_pessoal:true,ver_pacientes:true,ver_agenda:true,ver_marketing:true,ver_funil:true,ver_resumo_marketing:true,ver_supervisao:true,ver_relatorios:true,editar_financeiro:true,editar_pacientes:true},
  secretaria: {ver_financeiro_clinica:true,ver_financeiro_pessoal:false,ver_pacientes:true,ver_agenda:true,ver_marketing:false,ver_funil:false,ver_resumo_marketing:false,ver_supervisao:false,ver_relatorios:true,editar_financeiro:true,editar_pacientes:true},
  paulo:      {ver_financeiro_clinica:true,ver_financeiro_pessoal:true,ver_pacientes:false,ver_agenda:false,ver_marketing:false,ver_funil:false,ver_resumo_marketing:false,ver_supervisao:false,ver_relatorios:true,editar_financeiro:true,editar_pacientes:false},
  marketing:  {ver_financeiro_clinica:false,ver_financeiro_pessoal:false,ver_pacientes:false,ver_agenda:false,ver_marketing:true,ver_funil:true,ver_resumo_marketing:true,ver_supervisao:false,ver_relatorios:false,editar_financeiro:false,editar_pacientes:false},
};

const PERMISSOES_LABELS = [
  {id:"ver_financeiro_clinica",  label:"Ver Financeiro da Clínica",  grupo:"💰 Financeiro"},
  {id:"ver_financeiro_pessoal",  label:"Ver Financeiro Pessoal",     grupo:"💰 Financeiro"},
  {id:"ver_relatorios",          label:"Ver Relatórios",             grupo:"💰 Financeiro"},
  {id:"ver_pacientes",           label:"Ver Pacientes",              grupo:"🏥 Clínica"},
  {id:"ver_agenda",              label:"Ver Agenda",                 grupo:"🏥 Clínica"},
  {id:"ver_supervisao",          label:"Ver Supervisão",             grupo:"🏥 Clínica"},
  {id:"editar_pacientes",        label:"Editar Pacientes",           grupo:"🏥 Clínica"},
  {id:"editar_financeiro",       label:"Editar Financeiro",          grupo:"💰 Financeiro"},
  {id:"ver_marketing",           label:"Ver Dashboard Marketing",    grupo:"📊 Marketing"},
  {id:"ver_funil",               label:"Ver Funil de Leads",        grupo:"📊 Marketing"},
  {id:"ver_resumo_marketing",    label:"Ver Resumo Técnico",        grupo:"📊 Marketing"},
];

function PainelPermissoes() {
  const [perfilSel, setPerfilSel] = useState("secretaria");
  const [permissoes, setPermissoes] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // Carregar permissões do Firebase ou usar defaults
  useEffect(()=>{
    db.collection("clinica_perfis_permissoes").doc(perfilSel).get().then(doc=>{
      if(doc.exists) setPermissoes(doc.data().permissoes||{});
      else setPermissoes(PERMISSOES_DEFAULT[perfilSel]||{});
    });
  },[perfilSel]);

  async function salvar(){
    setSalvando(true);
    await db.collection("clinica_perfis_permissoes").doc(perfilSel).set({
      perfilId:perfilSel, permissoes,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    setSalvando(false); setSalvo(true);
    setTimeout(()=>setSalvo(false),2000);
  }

  function toggle(id){ setPermissoes(p=>({...p,[id]:!p[id]})); setSalvo(false); }

  const perfisEdicao = [{id:"secretaria",label:"Secretária",cor:"#0891b2"},{id:"paulo",label:"Financeiro",cor:"#16a34a"},{id:"marketing",label:"Marketing",cor:"#ea580c"}];
  const grupos = [...new Set(PERMISSOES_LABELS.map(p=>p.grupo))];

  return(
    <div style={{maxWidth:640,margin:"0 auto"}}>
      <h2 style={{fontFamily:"var(--font-display)",fontSize:22,marginBottom:4}}>⚙️ Permissões por Perfil</h2>
      <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:24}}>Configure o que cada perfil pode ver e fazer no sistema.</p>

      {/* Seletor de perfil */}
      <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
        {perfisEdicao.map(p=>(
          <button key={p.id} onClick={()=>setPerfilSel(p.id)}
            style={{padding:"8px 20px",borderRadius:20,border:"2px solid",cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"inherit",
              borderColor:perfilSel===p.id?p.cor:"#e5e7eb",
              background:perfilSel===p.id?p.cor+"15":"white",
              color:perfilSel===p.id?p.cor:"#6b7280",transition:"all .15s"}}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Permissões agrupadas */}
      <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:24}}>
        {grupos.map(grupo=>(
          <div key={grupo} style={{background:"white",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb",fontWeight:700,fontSize:13,color:"#374151"}}>
              {grupo}
            </div>
            <div style={{padding:"8px 0"}}>
              {PERMISSOES_LABELS.filter(p=>p.grupo===grupo).map(p=>(
                <label key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",cursor:"pointer",transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                  onMouseLeave={e=>e.currentTarget.style.background="white"}>
                  <input type="checkbox" checked={!!permissoes[p.id]} onChange={()=>toggle(p.id)}
                    style={{width:16,height:16,cursor:"pointer",accentColor:"#7B00C4"}}/>
                  <span style={{fontSize:13,color:"#374151"}}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <button className="btn btn-purple" onClick={salvar} disabled={salvando}>
          {salvando?"Salvando...":"💾 Salvar Permissões"}
        </button>
        {salvo&&<span style={{fontSize:13,color:"#059669",fontWeight:600}}>✅ Salvo!</span>}
        <button className="btn btn-ghost" onClick={()=>setPermissoes(PERMISSOES_DEFAULT[perfilSel]||{})} style={{marginLeft:"auto",fontSize:12}}>
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}

function handleLogin(u){setUser(u);if(u.tipo==="psicologa")setTab("dashboard");if(u.tipo==="secretaria")setTab("pacientes");if(u.tipo==="paulo")setTab("fin-pessoal");if(u.tipo==="marketing")setTab("marketing-dashboard");}
  function handleLogout(){setUser(null);setTab(null);}
  if(!user) return <Login onLogin={handleLogin}/>;
  return (
    <div style={{display:"flex",minHeight:"100vh",width:"100%",overflowX:"auto"}}>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} notifProps={notifProps}/>
      <div className="header-mobile"><div className="header-mobile-logo">Administracao</div><button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button></div>
      <div className="main-content" style={{flex:1,minWidth:0,maxWidth:"100%",overflowX:"hidden"}}>
        {user.tipo==="psicologa"  &&tab==="dashboard"   &&<DashboardAdmin user={user}/>}
        {user.tipo==="psicologa"  &&tab==="pacientes"   &&<Pacientes user={user}/>}
        {user.tipo==="psicologa"  &&tab==="alunos"      &&<Alunos/>}
        {user.tipo==="psicologa"  &&tab==="casais"      &&<TerapiaCasais/>}
        {user.tipo==="psicologa"  &&tab==="recursos"    &&<RecursosTerapeuticos user={user}/>}
        {user.tipo==="psicologa"  &&tab==="laudos"      &&<Laudos/>}
        {user.tipo==="psicologa"  &&tab==="vitrine"     &&<VitrineProdutos/>}
        {user.tipo==="psicologa"  &&tab==="agenda"      &&<Agenda/>}
        {user.tipo==="psicologa"  &&tab==="fin-clinica" &&<FinanceiroClinica user={user}/>}
        {user.tipo==="psicologa"  &&tab==="comissoes"   &&<Comissoes user={user}/>}
        {user.tipo==="psicologa"  &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={false}/>}
        {user.tipo==="psicologa"  &&tab==="fin-empresa"   &&<FinanceiroEmpresa somenteLeitura={false}/>}
        {user.tipo==="psicologa"  &&tab==="painel-geral"  &&<PainelGeralFinanceiro/>}
        {tab==="__menu__"&&(
          <div style={{padding:20}}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:20}}>Menu</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {NAV_PSICOLOGA_FLAT.filter(i=>!["dashboard","pacientes","agenda","fin-clinica"].includes(i.id)).map(item=>(
                <button key={item.id} onClick={()=>setTab(item.id)}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"20px 12px",borderRadius:12,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",fontFamily:"var(--font-body)",fontSize:13,fontWeight:500,color:"var(--text)"}}>
                  <Icon name={item.icon} size={24}/>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {user.tipo==="psicologa"  &&tab==="depoimentos" &&<Depoimentos/>}
        {user.tipo==="psicologa"  &&tab==="config"      &&<Configuracoes/>}
        {user.tipo==="secretaria" &&tab==="pacientes"   &&<Pacientes user={user}/>}
        {user.tipo==="secretaria" &&tab==="agenda"      &&<Agenda/>}
        {user.tipo==="secretaria" &&tab==="fin-clinica" &&<FinanceiroClinica user={user}/>}
        {user.tipo==="secretaria" &&tab==="comissoes"   &&<Comissoes user={user}/>}
        {user.tipo==="paulo"      &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={false}/>}
        {user.tipo==="paulo"      &&tab==="fin-empresa" &&<FinanceiroEmpresa somenteLeitura={false}/>}
        {user.tipo==="paulo"      &&tab==="fin-clinica" &&<FinanceiroClinica user={user}/>}
        {(user.tipo==="psicologa"||user.tipo==="secretaria")&&tab==="funil-leads"&&<FunilLeads user={user}/>}
        {user.tipo==="marketing"  &&tab==="marketing-dashboard" &&<DashboardMarketing user={user}/>}
        {user.tipo==="psicologa"  &&tab==="marketing-dashboard" &&<DashboardMarketing user={user}/>}
        {user.tipo==="psicologa"  &&tab==="permissoes"         &&<PainelPermissoes/>}
        {(user.tipo==="psicologa"||user.tipo==="marketing")&&tab==="dashboard-performance"&&<DashboardPerformance user={user}/>}
      </div>
      <div className="nav-mobile">
        {user.tipo==="psicologa"&&[
          {id:"dashboard",  label:"Início",    icon:"layout-dashboard"},
          {id:"pacientes",  label:"Pacientes", icon:"users"},
          {id:"agenda",     label:"Agenda",    icon:"calendar"},
          {id:"fin-clinica",label:"Financeiro",icon:"dollar-sign"},
        ].map(item=>(
          <button key={item.id} className={"nav-mobile-item "+(tab===item.id?"active":"")} onClick={()=>setTab(item.id)}>
            <Icon name={item.icon} size={20}/><span>{item.label}</span>
          </button>
        ))}
        {user.tipo==="psicologa"&&(
          <button className="nav-mobile-item" onClick={()=>setTab("__menu__")}>
            <Icon name="menu" size={20}/><span>Mais</span>
          </button>
        )}
        {user.tipo==="secretaria"&&NAV_SECRETARIA.slice(0,5).map(item=>(
          <button key={item.id} className={"nav-mobile-item "+(tab===item.id?"active":"")} onClick={()=>setTab(item.id)}>
            <Icon name={item.icon} size={20}/><span>{item.label.split(" ")[0]}</span>
          </button>
        ))}
        {user.tipo==="paulo"&&NAV_PAULO.map(item=>(
          <button key={item.id} className={"nav-mobile-item "+(tab===item.id?"active":"")} onClick={()=>setTab(item.id)}>
            <Icon name={item.icon} size={20}/><span>{item.label.split(" ")[0]}</span>
          </button>
        ))}
        {user.tipo==="marketing"&&NAV_MARKETING.map(item=>(
          <button key={item.id} className={"nav-mobile-item "+(tab===item.id?"active":"")} onClick={()=>setTab(item.id)}>
            <Icon name={item.icon} size={20}/><span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  FUNIL DE LEADS — KANBAN
// ═══════════════════════════════════════════════════════

const NAV_MARKETING = [
  { id:"marketing-dashboard",    label:"Dashboard",   icon:"trending-up" },
  { id:"dashboard-performance",  label:"Performance", icon:"bar-chart-2" },
];

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
