// ═══════════════════════════════════════════════════════
//  PORTAL CLÍNICO — DRA. LUCIA KRATZ
//  clinica/app.js — Paciente (individual + casal) + Aluno
// ═══════════════════════════════════════════════════════

const { useState, useEffect, useRef } = React;

// ─── FIREBASE ────────────────────────────────────────────
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

const LOGO_URL = "../logo-transparente.png";
const SITE_URL  = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";

// ─── ICON ────────────────────────────────────────────────
function Icon({ name, size = 18 }) {
  const ref = useRef(null);
  useEffect(() => {
    try {
      if (!ref.current || !window.lucide) return;
      ref.current.innerHTML = "";
      const n = name.replace(/-([a-z])/g,(_, l)=>l.toUpperCase()).replace(/^./,s=>s.toUpperCase());
      const fn = lucide[n];
      if (!fn) return;
      const ic = lucide.createElement(fn);
      ic.setAttribute("width", size); ic.setAttribute("height", size); ic.setAttribute("stroke-width","1.8");
      ref.current.appendChild(ic);
    } catch(e){}
  }, [name, size]);
  return <span ref={ref} style={{display:"inline-flex",alignItems:"center"}}/>;
}

function Spinner() { return <div className="spinner-wrap"><div className="spinner"/></div>; }
function EmBreve({ titulo="Em construção", sub="Módulo disponível em breve." }) {
  return (
    <div className="em-breve">
      <Icon name="wrench" size={48}/>
      <div className="em-breve-title">{titulo}</div>
      <div className="em-breve-sub">{sub}</div>
    </div>
  );
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────
const NAV_INDIVIDUAL = [
  { id:"painel",      label:"Meu Painel",          icon:"layout-dashboard" },
  { id:"humor",       label:"Registro de Humor",   icon:"heart" },
  { id:"pensamentos", label:"Pensamentos",          icon:"brain" },
  { id:"diario",      label:"Diário Terapêutico",  icon:"book-open" },
  { id:"metas",       label:"Minhas Metas",         icon:"target" },
  { id:"ansiedade",   label:"Gestão da Ansiedade",  icon:"activity" },
  { id:"ferramentas", label:"Ferramentas",          icon:"wrench" },
  { id:"fabulas",     label:"Fábulas Terapêuticas", icon:"book-heart" },
  { id:"reflexoes",   label:"Reflexões Cognitivas", icon:"lightbulb" },
  { id:"musicoterapia",label:"Musicoterapia",       icon:"music" },
  { id:"meus-laudos", label:"Meus Laudos",          icon:"file-text" },
  { id:"minha-conta", label:"Minha Conta",          icon:"user-circle" },
];

const NAV_CASAL = [
  { id:"inicio-casal",      label:"Início",               icon:"home" },
  { id:"diagnostico-casal", label:"Diagnóstico Inicial",  icon:"clipboard" },
  { id:"etapa1-casal",      label:"Etapa 1 — Reconexão",  icon:"heart-handshake" },
  { id:"etapa2-casal",      label:"Etapa 2 — Identidade", icon:"users" },
  { id:"etapa3-casal",      label:"Etapa 3 — Cognição",   icon:"brain" },
  { id:"etapa4-casal",      label:"Etapa 4 — Reestruturação", icon:"refresh-cw" },
  { id:"minha-conta",       label:"Minha Conta",          icon:"user-circle" },
];

const NAV_ALUNO = [
  { id:"painel-aluno",      label:"Meu Painel",   icon:"layout-dashboard" },
  { id:"ferramentas-aluno", label:"Ferramentas",  icon:"stethoscope" },
  { id:"relatorios-aluno",  label:"Relatórios",   icon:"file-bar-chart" },
];

// ─── PROTOCOLO CASAIS (espelhado do admin) ───────────────
const PROTOCOLO_CASAIS = [
  {
    stage:0, tabId:"diagnostico-casal", titulo:"Diagnóstico Inicial de Casal",
    subtitulo:"Avaliação inicial do bem-estar conjugal antes da jornada",
    emoji:"🔍", cor:"#7c3aed", bg:"#f5f3ff",
    atividades:[
      {id:"inventario-bem-estar", titulo:"Inventário de Bem-Estar de Casais", desc:"42 questões sobre comunicação, resolução de conflitos, intimidade emocional, satisfação sexual e cooperação"},
      {id:"roda-vida-relacionamento", titulo:"Roda da Vida do Relacionamento", desc:"Avalie 8 dimensões do relacionamento em formato visual"},
      {id:"3-metas", titulo:"Nossas 3 Metas do Relacionamento", desc:"Definam juntos as 3 principais metas terapêuticas"},
      {id:"quem-sou", titulo:"Quem Eu Sou no Relacionamento", desc:"Reflexão individual sobre identidade no relacionamento"},
      {id:"o-que-quero", titulo:"O Que Eu Quero e Não Quero Mais", desc:"Mapeamento de expectativas e limites"}
    ]
  },
  {
    stage:1, tabId:"etapa1-casal", titulo:"Reconexão e Segurança Emocional",
    subtitulo:"Reduzir defensividade e aumentar conexão emocional",
    emoji:"💚", cor:"#059669", bg:"#d1fae5",
    atividades:[
      {id:"detalhes-dia", titulo:"Detalhes do Dia a Dia", desc:"Compartilhem os pequenos detalhes que fazem diferença na conexão diária"},
      {id:"plano-casal-ocupado", titulo:"Plano de Ação para um Casal Ocupado Demais", desc:"Estratégias práticas para manter conexão na correria"}
    ]
  },
  {
    stage:2, tabId:"etapa2-casal", titulo:"Identidade e Vínculo do Casal",
    subtitulo:"Resgatar identidade afetiva e visão compartilhada",
    emoji:"💜", cor:"#7c3aed", bg:"#ede9fe",
    atividades:[
      {id:"renovando-votos", titulo:"Renovando os Votos", desc:"Recontem a história do casal e renovem seus compromissos através de 5 narrativas guiadas"}
    ]
  },
  {
    stage:3, tabId:"etapa3-casal", titulo:"Conceitualização Cognitiva",
    subtitulo:"Identificar padrões cognitivos e crenças relacionais",
    emoji:"🧠", cor:"#0891b2", bg:"#e0f2fe",
    atividades:[
      {id:"mapa-cognitivo", titulo:"Mapa Cognitivo do Relacionamento", desc:"Identificar pensamentos automáticos, crenças e padrões que afetam o relacionamento"}
    ]
  },
  {
    stage:4, tabId:"etapa4-casal", titulo:"Reestruturação Relacional",
    subtitulo:"Criar novos padrões emocionais e comportamentais",
    emoji:"🌱", cor:"#16a34a", bg:"#dcfce7",
    atividades:[
      {id:"novos-padroes", titulo:"Novos Padrões Relacionais", desc:"Desenvolver e praticar novos comportamentos e respostas emocionais"}
    ]
  }
];

const CHECKIN_SEMANAL_PERGUNTAS = [
  "Hoje eu me sinto conectado(a) com meu parceiro(a)",
  "Sinto que fui ouvido(a) esta semana",
  "Expressamos afeto um pelo outro",
  "Resolvemos conflitos de forma saudável",
  "Dedicamos tempo de qualidade juntos",
  "Sinto que somos uma equipe",
  "Me sinto seguro(a) emocionalmente com meu parceiro(a)"
];

// mapa tab → id do módulo no Firebase
const MAPA_MODULOS = {
  humor:"humor", pensamentos:"tcc", diario:"diario", metas:"metas",
  ferramentas:"ferramentas", fabulas:"fabulas", reflexoes:"reflexoes",
  ansiedade:"ansiedade", musicoterapia:"musicoterapia",
  "arvore-decisao":"arvore_decisao", "entrevista":"entrevista_inicial",
  "anamnese":"anamnese", "rastreamento":"rastreamento_alimentar"
};

function navFiltradoPaciente(nav, user) {
  // Suporta formato novo (modulosConfig) e antigo (modulosAtivos)
  const config = user.modulosConfig || {};
  const ativos = user.modulosAtivos || [];

  // Mapa de item.id para módulo
  const ITEM_PARA_MODULO = {
    "humor":"mod1", "diario":"mod1", "metas":"mod1", "reflexoes":"mod1", "pensamentos":"mod1", "tcc":"mod1",
    "fabulas":"mod2",
    "ferramentas":"mod3", "ansiedade":"mod3", "arvore":"mod3",
    "musicoterapia":"mod4",
    "casais":"mod5",
  };

  return nav.filter(item => {
    if (["painel","minha-conta","meus-laudos"].includes(item.id)) return true;

    // Verifica no formato novo
    const modId = ITEM_PARA_MODULO[item.id];
    if (modId && config[modId]?.ativo) {
      // Verifica se a ferramenta específica está ativa dentro do módulo
      const ferramentas = config[modId].ferramentas || {};
      const ferrAtiva = ferramentas[item.id];
      if (ferrAtiva) {
        // Verifica data de início
        if (ferrAtiva.dataInicio) {
          const hoje = new Date().toISOString().split("T")[0];
          return ferrAtiva.dataInicio <= hoje;
        }
        return true;
      }
      // Se o módulo está ativo mas sem ferramentas específicas, mostra
      if (Object.keys(ferramentas).length === 0) return true;
      return false;
    }

    // Fallback formato antigo
    const chave = MAPA_MODULOS[item.id] || item.id;
    return ativos.includes(chave) || ativos.includes(item.id);
  });
}

// ─── SIDEBAR ─────────────────────────────────────────────
function fmtDataNotif(dataStr) {
  if (!dataStr) return "";
  const d = new Date(dataStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"2-digit"});
}

function enviarPushLocal(titulo, corpo) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(titulo, { body: corpo, icon: "../logo-transparente.png" });
  }
}

async function verificarLembretesClinica(user) {
  if (!user) return;
  const hoje = new Date();
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
  const fmtDate = d => d.toISOString().split("T")[0];
  try {
    if (user.tipo === "paciente") {
      const snap = await db.collection("clinica_sessoes")
        .where("pacienteId","==",user.id)
        .where("data","in",[fmtDate(hoje), fmtDate(amanha)])
        .where("status","==","agendado").get();
      snap.docs.forEach(d => {
        const s = d.data();
        const dia = s.data === fmtDate(hoje) ? "Hoje" : "Amanhã";
        enviarPushLocal(`${dia} — Sessão às ${s.hora}`, fmtDataNotif(s.data));
      });
      const snapPag = await db.collection("clinica_lancamentos")
        .where("pacienteId","==",user.id)
        .where("status","==","pendente").get();
      snapPag.docs.slice(0,2).forEach(d => {
        const l = d.data();
        enviarPushLocal(
          `Pagamento previsto — ${fmtDataNotif(l.data)}`,
          `R$ ${parseFloat(l.valor||0).toFixed(2).replace(".",",")}`
        );
      });
    }
    if (user.tipo === "aluno") {
      const snap = await db.collection("clinica_sessoes")
        .where("alunoId","==",user.id)
        .where("data","in",[fmtDate(hoje), fmtDate(amanha)]).get();
      snap.docs.forEach(d => {
        const s = d.data();
        const dia = s.data === fmtDate(hoje) ? "Hoje" : "Amanhã";
        enviarPushLocal(`${dia} — Supervisão às ${s.hora}`, fmtDataNotif(s.data));
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
    const t = setTimeout(() => verificarLembretesClinica(user), 2000);
    return () => clearTimeout(t);
  }, [user, permissao]);
  async function ativar() {
    if (!("Notification" in window)) { alert("Seu navegador não suporta notificações."); return; }
    const p = await Notification.requestPermission();
    setPermissao(p);
    if (p === "granted") verificarLembretesClinica(user);
  }
  return { permissao, ativar };
}

function BotaoNotificacao({ permissao, ativar }) {
  if (!("Notification" in window)) return null;
  if (permissao === "granted") return (
    <span style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:20,padding:"5px 12px",fontSize:12,fontFamily:"inherit"}}>
      🔔 Ativo
    </span>
  );
  if (permissao === "denied") return (
    <span style={{background:"rgba(255,0,0,0.15)",border:"1px solid rgba(255,0,0,0.3)",color:"#fca5a5",borderRadius:20,padding:"5px 12px",fontSize:12}}>
      🔕 Bloqueado
    </span>
  );
  return (
    <button onClick={ativar}
      style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:20,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
      🔔 Ativar
    </button>
  );
}

function Sidebar({ user, tab, setTab, onLogout, modo, onTrocarModo, notifProps }) {
  const eCasal = modo === "casal";
  const navBase = user.tipo === "aluno" ? NAV_ALUNO : eCasal ? NAV_CASAL : NAV_INDIVIDUAL;
  const nav = (user.tipo === "paciente" && !eCasal) ? navFiltradoPaciente(navBase, user) : navBase;

  return (
    <div className="sidebar-desktop">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={LOGO_URL} alt="Logo" style={{width:32,height:32,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
        </div>
        <div>
          <div className="sidebar-title">{eCasal ? "Terapia de Casal" : "Meu Espaço"}</div>
          <div className="sidebar-role">Área do Paciente</div>
        </div>
      </div>

      <div className="sidebar-footer" style={{borderTop:"none",paddingTop:12}}>
        <div className="sidebar-user" style={{display:"flex",alignItems:"center",gap:8}}>
          <div className="sidebar-avatar">{(user.nome||"P")[0].toUpperCase()}</div>
          <div style={{flex:1}}>
            <div className="sidebar-user-name">{user.nome}</div>
            <div className="sidebar-user-crp">{user.tipo==="aluno"?"Aluno/Estagiário":eCasal?"Terapia de Casal":"Paciente"}</div>
          </div>
          {notifProps && <BotaoNotificacao {...notifProps}/>}
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(item => (
          <button key={item.id} className={`nav-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
            <Icon name={item.icon} size={18}/>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {onTrocarModo && (
          <button className="nav-item" onClick={onTrocarModo} style={{color:"rgba(255,255,255,0.85)"}}>
            <Icon name="refresh-cw" size={18}/> Trocar modo
          </button>
        )}
        <a href={SITE_URL} className="nav-item" style={{color:"rgba(255,255,255,0.6)",textDecoration:"none"}}>
          <Icon name="arrow-left" size={18}/> Voltar ao site
        </a>
        <button className="nav-item nav-item-danger" onClick={onLogout}>
          <Icon name="log-out" size={18}/> Sair
        </button>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────
function Login({ onLogin }) {
  const [etapa, setEtapa]     = useState("perfil");
  const [nome, setNome]       = useState("");
  const [email, setEmail]     = useState("");
  const [senha, setSenha]     = useState("");
  const [erro, setErro]       = useState("");
  const [loading, setLoading] = useState(false);

  const perfis = [
    { id:"paciente", nome:"Sou Paciente", desc:"Portal do paciente — ferramentas e acompanhamento", icon:"user" },
    { id:"aluno",    nome:"Sou Aluno",    desc:"Portal de supervisão clínica", icon:"graduation-cap" },
  ];

  async function handleLoginPaciente(e) {
    e.preventDefault(); setErro(""); setLoading(true);
    try {
      if (senha !== "1234") { setErro("Senha incorreta."); setLoading(false); return; }
      const nomeNorm = nome.trim().toLowerCase();
      if (!nomeNorm) { setErro("Digite seu nome completo."); setLoading(false); return; }
      const snap = await db.collection("clinica_pacientes").get();
      const match = snap.docs.find(d => (d.data().nome||"").trim().toLowerCase() === nomeNorm);
      if (!match) { setErro("Paciente não encontrado. Verifique o nome completo."); setLoading(false); return; }
      const pac = { id: match.id, ...match.data() };
      if (pac.status === "inativo") { setErro("Conta inativa. Entre em contato com a psicóloga."); setLoading(false); return; }
      onLogin({ tipo:"paciente", ...pac });
    } catch(err) { setErro("Erro ao conectar. Tente novamente."); }
    setLoading(false);
  }

  async function handleLoginAluno(e) {
    e.preventDefault(); setErro(""); setLoading(true);
    try {
      if (senha !== "1234") { setErro("Senha incorreta."); setLoading(false); return; }
      const nomeNorm = nome.trim().toLowerCase();
      if (!nomeNorm) { setErro("Digite seu nome completo."); setLoading(false); return; }
      const snap = await db.collection("clinica_alunos").get();
      const match = snap.docs.find(d => (d.data().nome||"").trim().toLowerCase() === nomeNorm);
      if (!match) { setErro("Aluno não encontrado. Verifique o nome completo."); setLoading(false); return; }
      const aluno = { id: match.id, ...match.data() };
      if (aluno.status === "inativo") { setErro("Conta inativa."); setLoading(false); return; }
      onLogin({ tipo:"aluno", ...aluno });
    } catch(err) { setErro("Erro ao conectar. Tente novamente."); }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo">
          <img src={LOGO_URL} alt="Lucia Kratz" style={{width:140,height:140,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
        </div>
        <div className="login-name">Dra. Lucia Kratz</div>
        <div className="login-subtitle">Plataforma Clínica Neuropsicológica</div>
        <div className="login-crp">Psicóloga Doutora · CRP 09/20590</div>
        <div className="login-left-btns">
          {perfis.map(p=>(
            <button key={p.id} onClick={()=>{setEtapa(p.id);setErro("");setNome("");setEmail("");setSenha("");}}>
              {p.nome.replace("Sou ","")}
            </button>
          ))}
        </div>
      </div>

      <div className="login-right">
        {etapa==="perfil" && (
          <>
            <div style={{width:"100%"}}>
              <div className="login-right-title">Quem é você?</div>
              <div className="login-right-sub">Selecione seu perfil para acessar a área correta.</div>
            </div>
            <div className="profile-cards">
              {perfis.map(p=>(
                <button key={p.id} className="profile-card" onClick={()=>{setEtapa(p.id);setErro("");}}>
                  <div className="profile-card-icon"><Icon name={p.icon} size={22}/></div>
                  <div className="profile-card-text">
                    <div className="profile-card-name">{p.nome}</div>
                    <div className="profile-card-desc">{p.desc}</div>
                  </div>
                  <div className="profile-card-arrow"><Icon name="chevron-right" size={18}/></div>
                </button>
              ))}
            </div>
            <div className="login-footer" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <span>Plataforma protegida · Dra. Lucia Kratz · CRP 09/20590</span>
              <a href={SITE_URL} style={{color:"var(--purple)",fontSize:13}}>← Voltar ao site</a>
            </div>
          </>
        )}

        {etapa==="paciente" && (
          <>
            <button className="login-right-back" onClick={()=>{setEtapa("perfil");setErro("");setNome("");setSenha("");}}>
              <Icon name="arrow-left" size={14}/> Voltar
            </button>
            <form className="login-form" onSubmit={handleLoginPaciente}>
              <div>
                <div className="login-form-title">Área do Paciente</div>
                <div className="login-form-sub">Acesse seu espaço terapêutico</div>
              </div>
              {erro && <div className="login-error">{erro}</div>}
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input className="form-input" type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Digite seu nome completo" autoFocus/>
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••"/>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>{loading?"Entrando...":"Entrar"}</button>
            </form>
          </>
        )}

        {etapa==="aluno" && (
          <>
            <button className="login-right-back" onClick={()=>{setEtapa("perfil");setErro("");setNome("");setSenha("");}}>
              <Icon name="arrow-left" size={14}/> Voltar
            </button>
            <form className="login-form" onSubmit={handleLoginAluno}>
              <div>
                <div className="login-form-title">Área do Aluno</div>
                <div className="login-form-sub">Portal de supervisão clínica</div>
              </div>
              {erro && <div className="login-error">{erro}</div>}
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input className="form-input" type="text" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Digite seu nome completo" autoFocus/>
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••••••"/>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>{loading?"Entrando...":"Entrar"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PAINEL INDIVIDUAL
// ═══════════════════════════════════════════════════════
function PainelIndividual({ user, setTab }) {
  const [humores, setHumores] = useState([]);
  const [metas, setMetas]     = useState([]);

  useEffect(() => {
    const u1 = db.collection("clinica_humor").where("pacienteId","==",user.id)
      .orderBy("createdAt","desc").limit(30)
      .onSnapshot(s=>setHumores(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const u2 = db.collection("clinica_metas").where("pacienteId","==",user.id).where("status","==","ativa")
      .onSnapshot(s=>setMetas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return ()=>{ u1(); u2(); };
  }, [user.id]);

  const hoje      = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  const hora      = new Date().getHours();
  const saudacao  = hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";
  const humorHoje = humores.find(h=>h.data===new Date().toLocaleDateString("pt-BR"));
  const media30   = humores.length>0 ? (humores.reduce((a,h)=>a+(h.valor||0),0)/humores.length).toFixed(1) : null;

  const modulos = user.modulosAtivos || [];
  const todasFerramentas = [
    { id:"humor",       label:"Registrar Humor",         sub:"Como você está se sentindo hoje?",  icon:"heart",      cor:"#fde8f0", tab:"humor" },
    { id:"tcc",         label:"Pensamentos Automáticos", sub:"Registre e questione pensamentos",  icon:"brain",      cor:"#ede0fa", tab:"pensamentos" },
    { id:"diario",      label:"Diário Terapêutico",      sub:"Escreva sobre o seu dia",           icon:"book-open",  cor:"#e0f0ff", tab:"diario" },
    { id:"metas",       label:"Minhas Metas",            sub:"Acompanhe seu progresso",           icon:"target",     cor:"#e0faed", tab:"metas" },
    { id:"fabulas",     label:"Fábulas Terapêuticas",    sub:"Histórias reflexivas",              icon:"book-heart", cor:"#fff3e0", tab:"fabulas" },
    { id:"reflexoes",   label:"Reflexões Cognitivas",    sub:"Exercícios de insight",             icon:"lightbulb",  cor:"#fefce0", tab:"reflexoes" },
    { id:"ferramentas", label:"Ferramentas Clínicas",    sub:"Recursos disponíveis",              icon:"wrench",     cor:"#f0f0f0", tab:"ferramentas" },
  ];
  const ferramentasVisiveis = todasFerramentas.filter(f=>modulos.includes(f.id));
  const chartData = [...humores].reverse().slice(-14);

  return (
    <div>
      {/* Banner */}
      <div style={{background:"linear-gradient(135deg,#7B00C4,#5a0090)",borderRadius:16,padding:"28px 32px",marginBottom:24,color:"white",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{fontSize:13,opacity:0.8,marginBottom:6,textTransform:"capitalize"}}>{hoje}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:32,fontWeight:600,marginBottom:4}}>
          {saudacao}, {user.nome.split(" ")[0]}! 💜
        </div>
        {humorHoje && <div style={{fontSize:14,opacity:0.85}}>Humor hoje: {humorHoje.valor}/10</div>}
      </div>

      {/* Métricas */}
      <div className="metrics-grid" style={{marginBottom:24}}>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="heart" size={20}/></div>
          <div className="metric-label">Humor hoje</div>
          <div className="metric-value">{humorHoje?`${humorHoje.valor}/10`:"—"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="trending-up" size={20}/></div>
          <div className="metric-label">Média 30 dias</div>
          <div className="metric-value">{media30?`${media30}/10`:"—"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="target" size={20}/></div>
          <div className="metric-label">Metas ativas</div>
          <div className="metric-value">{metas.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="book-open" size={20}/></div>
          <div className="metric-label">Entradas no diário</div>
          <div className="metric-value">0</div>
        </div>
      </div>

      {/* Ferramentas — acesso rápido só se houver módulos */}
      {ferramentasVisiveis.length > 0 && (
        <div className="card" style={{marginBottom:24}}>
          <div style={{fontWeight:600,fontSize:15,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Acesso Rápido</span>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>{ferramentasVisiveis.length} módulo(s) ativo(s)</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
            {ferramentasVisiveis.slice(0,4).map(f=>(
              <button key={f.id} onClick={()=>setTab(f.tab)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--purple)";e.currentTarget.style.background="var(--purple-bg)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--gray-200)";e.currentTarget.style.background="white";}}>
                <div style={{width:36,height:36,borderRadius:10,background:f.cor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name={f.icon} size={18}/>
                </div>
                <div style={{fontSize:13,fontWeight:600}}>{f.label.split(" ")[0]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico de humor */}
      {chartData.length > 0 && (
        <div className="card" style={{marginBottom:24}}>
          <div style={{fontWeight:600,fontSize:15,marginBottom:16}}>Minha Evolução de Humor</div>
          <canvas id="humorChart" height={120}/>
          <script dangerouslySetInnerHTML={{__html:`
            (function(){
              var ctx = document.getElementById('humorChart');
              if(!ctx||!window.Chart) return;
              var labels = ${JSON.stringify(chartData.map(h=>h.data?.split("/").slice(0,2).join("/")||""))};
              var vals   = ${JSON.stringify(chartData.map(h=>h.valor||0))};
              new Chart(ctx,{type:'line',data:{labels,datasets:[{data:vals,borderColor:'#7B00C4',backgroundColor:'rgba(123,0,196,0.08)',pointBackgroundColor:'white',pointBorderColor:'#7B00C4',pointBorderWidth:2,pointRadius:5,tension:0.4,fill:true}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>'Humor: '+ctx.raw+'/10'}}},scales:{y:{min:0,max:10,ticks:{stepSize:2}},x:{ticks:{maxTicksLimit:7}}}}});
            })();
          `}}/>
        </div>
      )}

      {/* Sem módulos */}
      {ferramentasVisiveis.length===0 && (
        <div className="card" style={{textAlign:"center",padding:40}}>
          <Icon name="lock" size={40}/>
          <div style={{marginTop:12,fontWeight:600}}>Aguardando ativação</div>
          <div style={{fontSize:14,color:"var(--text-muted)",marginTop:6}}>
            A psicóloga ainda não habilitou módulos para você. Fale com a Dra. Lucia Kratz.
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  REGISTRO DE HUMOR
// ═══════════════════════════════════════════════════════
function RegistroHumor({ user }) {
  const [valor, setValor]     = useState(5);
  const [nota, setNota]       = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg]         = useState("");
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    const unsub = db.collection("clinica_humor").where("pacienteId","==",user.id)
      .orderBy("createdAt","desc").limit(20)
      .onSnapshot(s=>setHistorico(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return unsub;
  }, [user.id]);

  const hoje = new Date().toLocaleDateString("pt-BR");
  const jaRegistrou = historico.some(h=>h.data===hoje);
  const emojis = ["😞","😔","😐","🙂","😊","😄","🤩"];
  const emojiIdx = Math.min(Math.floor((valor-1)/1.5),6);

  async function salvar(e) {
    e.preventDefault(); setSalvando(true); setMsg("");
    try {
      await db.collection("clinica_humor").add({
        pacienteId:user.id, nome:user.nome,
        valor, nota, data:hoje,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setMsg("Humor registrado! 💜"); setNota(""); setValor(5);
    } catch(err){ setMsg("Erro ao salvar."); }
    setSalvando(false);
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Registro de Humor</div>
        <div className="page-subtitle">Como você está se sentindo hoje?</div>
      </div>

      {jaRegistrou && (
        <div style={{background:"#d1fae5",border:"1px solid #6ee7b7",borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:14,color:"#065f46"}}>
          ✓ Você já registrou seu humor hoje. Pode atualizar se quiser.
        </div>
      )}

      <div className="card" style={{marginBottom:24}}>
        <form onSubmit={salvar}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontSize:64,marginBottom:8}}>{emojis[emojiIdx]}</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:48,fontWeight:600,color:"var(--purple)"}}>{valor}/10</div>
          </div>
          <input type="range" min="1" max="10" value={valor} onChange={e=>setValor(Number(e.target.value))}
            style={{width:"100%",accentColor:"var(--purple)",height:8,cursor:"pointer",marginBottom:8}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text-muted)",marginBottom:24}}>
            <span>1 — Muito ruim</span><span>5 — Regular</span><span>10 — Excelente</span>
          </div>
          <div className="form-group" style={{marginBottom:20}}>
            <label className="form-label">Como você está se sentindo? (opcional)</label>
            <textarea className="form-input" rows={3} value={nota} onChange={e=>setNota(e.target.value)}
              placeholder="Descreva brevemente como está seu dia..." style={{resize:"vertical"}}/>
          </div>
          {msg && <div style={{background:"var(--purple-bg)",border:"1px solid var(--purple)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:14,color:"var(--purple)"}}>{msg}</div>}
          <button className="btn-primary" type="submit" disabled={salvando}>{salvando?"Salvando...":"Registrar Humor"}</button>
        </form>
      </div>

      {historico.length > 0 && (
        <div className="card">
          <div style={{fontWeight:600,marginBottom:16}}>Histórico recente</div>
          {historico.map(h=>(
            <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--gray-100)"}}>
              <div style={{width:44,height:44,borderRadius:10,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"var(--purple)",fontSize:16,flexShrink:0}}>{h.valor}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:14}}>{h.data}</div>
                {h.nota && <div style={{fontSize:13,color:"var(--text-muted)"}}>{h.nota}</div>}
              </div>
              <div style={{width:80,background:"var(--gray-100)",borderRadius:20,height:6}}>
                <div style={{width:((h.valor/10)*100)+"%",height:"100%",background:"var(--purple)",borderRadius:20}}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  CHECK-IN SEMANAL — FORMULÁRIO
// ═══════════════════════════════════════════════════════
function FormCheckinSemanal({ user, semana, onSalvo, onCancelar }) {
  const [respostas, setRespostas] = useState({});
  const [salvando, setSalvando]   = useState(false);
  const [msg, setMsg]             = useState("");

  const escala = [1,2,3,4,5];
  const escalaLabel = {1:"Discordo totalmente",3:"Neutro",5:"Concordo totalmente"};

  async function salvar() {
    if (Object.keys(respostas).length < CHECKIN_SEMANAL_PERGUNTAS.length) {
      setMsg("Responda todas as perguntas antes de salvar.");
      return;
    }
    setSalvando(true);
    try {
      await db.collection("clinica_checkin_casal").add({
        pacienteId: user.id,
        casalId: user.casalId || user.id,
        semana,
        respostas,
        media: (Object.values(respostas).reduce((a,b)=>a+b,0) / CHECKIN_SEMANAL_PERGUNTAS.length).toFixed(1),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      onSalvo();
    } catch(e) { setMsg("Erro ao salvar. Tente novamente."); }
    setSalvando(false);
  }

  return (
    <div className="card">
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={onCancelar} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4,fontSize:13}}>
          <Icon name="arrow-left" size={15}/> Voltar
        </button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:16}}>Check-in Semanal</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>Semana {semana} — responda com honestidade</div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        {CHECKIN_SEMANAL_PERGUNTAS.map((pergunta, idx) => (
          <div key={idx} style={{borderBottom:"1px solid var(--gray-100)",paddingBottom:16}}>
            <div style={{fontSize:14,fontWeight:500,marginBottom:12,lineHeight:1.5}}>
              {idx+1}. {pergunta}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
              {escala.map(v => (
                <button key={v} onClick={()=>setRespostas(r=>({...r,[idx]:v}))}
                  style={{
                    width:44,height:44,borderRadius:"50%",border:"2px solid",
                    borderColor: respostas[idx]===v ? "var(--purple)" : "var(--gray-200)",
                    background: respostas[idx]===v ? "var(--purple)" : "white",
                    color: respostas[idx]===v ? "white" : "var(--text-muted)",
                    fontWeight:700,fontSize:15,cursor:"pointer",transition:"all .15s",flexShrink:0
                  }}>
                  {v}
                </button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",marginTop:6}}>
              <span>Discordo totalmente</span><span>Concordo totalmente</span>
            </div>
          </div>
        ))}
      </div>

      {msg && <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:13,color:"#92400e"}}>{msg}</div>}

      <button onClick={salvar} disabled={salvando} className="btn-primary" style={{width:"100%",marginTop:20}}>
        {salvando ? "Salvando..." : "Enviar Check-in 💜"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PAINEL CASAL
// ═══════════════════════════════════════════════════════
function PainelCasal({ user }) {
  const [parceiro, setParceiro]           = useState(null);
  const [checkin, setCheckin]             = useState(null);
  const [metas, setMetas]                 = useState([]);
  const [metasParceiro, setMetasParceiro] = useState([]);
  const [mostrarForm, setMostrarForm]     = useState(false);

  function getSemana() {
    const d=new Date(), jan=new Date(d.getFullYear(),0,1);
    return `${Math.ceil(((d-jan)/86400000+jan.getDay()+1)/7)}/${d.getFullYear()}`;
  }

  useEffect(() => {
    if (user.casalId) {
      db.collection("clinica_pacientes").doc(user.casalId).get()
        .then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
      db.collection("clinica_metas").where("pacienteId","==",user.casalId).where("status","==","ativa")
        .onSnapshot(s=>setMetasParceiro(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    }
    db.collection("clinica_checkin_casal")
      .where("casalId","==",user.casalId||user.id)
      .where("semana","==",getSemana())
      .where("pacienteId","==",user.id)
      .onSnapshot(s=>setCheckin(s.docs[0]?{id:s.docs[0].id,...s.docs[0].data()}:null),()=>{});
    db.collection("clinica_metas").where("pacienteId","==",user.id).where("status","==","ativa")
      .onSnapshot(s=>setMetas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[user.id,user.casalId]);

  const hoje     = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  const hora     = new Date().getHours();
  const saudacao = hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";
  const semana   = getSemana();

  if (mostrarForm) {
    return <FormCheckinSemanal user={user} semana={semana}
      onSalvo={()=>setMostrarForm(false)}
      onCancelar={()=>setMostrarForm(false)}/>;
  }

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#7B00C4,#b040e0)",borderRadius:16,padding:"28px 32px",marginBottom:24,color:"white",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{fontSize:13,opacity:0.8,marginBottom:6,textTransform:"capitalize"}}>{hoje}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:32,fontWeight:600,marginBottom:4}}>
          {saudacao}, {user.nome.split(" ")[0]}! 💜
        </div>
        {parceiro && <div style={{fontSize:14,opacity:0.85}}>💑 {user.nome.split(" ")[0]} e {parceiro.nome.split(" ")[0]}</div>}
      </div>

      <div className="metrics-grid" style={{marginBottom:24}}>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="flame" size={20}/></div>
          <div className="metric-label">Check-ins feitos</div>
          <div className="metric-value">0</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="star" size={20}/></div>
          <div className="metric-label">Esta semana</div>
          <div className="metric-value">{checkin?"✓":"—"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="heart" size={20}/></div>
          <div className="metric-label">{parceiro?parceiro.nome.split(" ")[0]:"Parceiro(a)"}</div>
          <div className="metric-value" style={{fontSize:14}}>{parceiro?"Vinculado":"—"}</div>
        </div>
        <BotaoEmergenciaCard user={user} casalId={user.casalId||user.id}/>
      </div>

      {/* Check-in semanal */}
      <div style={{background:"linear-gradient(135deg,#7B00C4,#b040e0)",borderRadius:16,padding:24,marginBottom:16,color:"white"}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:1,opacity:0.8,marginBottom:8}}>CHECK-IN SEMANAL</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,marginBottom:4}}>Como foi a semana de vocês?</div>
        <div style={{fontSize:13,opacity:0.75,marginBottom:16}}>Semana {semana}</div>
        <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,height:6,marginBottom:8}}>
          <div style={{width:checkin?"100%":"0%",height:"100%",background:"white",borderRadius:8,transition:"width .5s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:checkin?0:12}}>
          <span style={{fontSize:13,opacity:0.8}}>{checkin?"Respondido ✓":"Ainda não respondido"}</span>
          <span style={{fontSize:13,fontWeight:600}}>{checkin?"100%":"0%"}</span>
        </div>
        {!checkin && (
          <button onClick={()=>setMostrarForm(true)}
            style={{marginTop:8,background:"white",color:"var(--purple)",border:"none",borderRadius:20,padding:"8px 20px",fontWeight:600,fontSize:13,cursor:"pointer"}}>
            Responder agora
          </button>
        )}
      </div>

      {/* Metas */}
      <div style={{background:"linear-gradient(135deg,#5a0090,#7B00C4)",borderRadius:16,padding:24,color:"white"}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:1,opacity:0.8,marginBottom:8}}>NOSSAS METAS</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:16}}>
          {metas.length+metasParceiro.length} Metas do Relacionamento
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,opacity:0.8,marginBottom:8}}>⊙ MINHAS METAS</div>
            {metas.length===0
              ? <div style={{fontSize:13,opacity:0.7}}>Não definida</div>
              : metas.slice(0,3).map(m=><div key={m.id} style={{fontSize:13,marginBottom:4}}>🥈 {m.titulo}</div>)
            }
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:600,opacity:0.8,marginBottom:8}}>♡ {parceiro?parceiro.nome.split(" ")[0].toUpperCase():"PARCEIRO(A)"}</div>
            {metasParceiro.length===0
              ? <div style={{fontSize:13,opacity:0.7}}>{parceiro?`${parceiro.nome.split(" ")[0]} ainda não definiu suas metas.`:"—"}</div>
              : metasParceiro.slice(0,3).map(m=><div key={m.id} style={{fontSize:13,marginBottom:4}}>🥈 {m.titulo}</div>)
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Botão Emergência como card de métrica ──
function BotaoEmergenciaCard({ user, casalId }) {
  const [palavra,    setPalavra]   = useState("");
  const [ativo,      setAtivo]     = useState(null);
  const [escolhendo, setEscolhendo]= useState(false);
  const [salvando,   setSalvando]  = useState(false);
  const [agora,      setAgora]     = useState(Date.now());

  useEffect(()=>{
    if(!casalId) return;
    db.collection("clinica_casais").where("p1Id","==",user.id).limit(1).get().then(s=>{
      if(s.docs.length>0) setPalavra(s.docs[0].data().palavraEmergencia||"");
      else db.collection("clinica_casais").where("p2Id","==",user.id).limit(1).get()
        .then(s2=>{ if(s2.docs.length>0) setPalavra(s2.docs[0].data().palavraEmergencia||""); });
    });
    db.collection("clinica_emergencia")
      .where("casalId","==",casalId).where("fim",">=",new Date().toISOString())
      .orderBy("fim","desc").limit(1)
      .onSnapshot(s=>{ setAtivo(s.docs.length>0?s.docs[0].data():null); },()=>{});
    const t=setInterval(()=>setAgora(Date.now()),60000);
    return()=>clearInterval(t);
  },[casalId,user.id]);

  async function acionar(h){
    setSalvando(true);
    try{
      const fim=new Date(Date.now()+h*3600000).toISOString();
      await db.collection("clinica_emergencia").add({
        casalId,horas:h,fim,
        acionadoPor:user.nome.split(" ")[0],
        acionadoPorId:user.id,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setEscolhendo(false);
    }catch(e){alert("Erro.");}
    setSalvando(false);
  }

  function restante(){
    if(!ativo?.fim) return null;
    const ms=new Date(ativo.fim).getTime()-agora;
    if(ms<=0) return null;
    const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);
    return h>0?`${h}h${m>0?" "+m+"min":""}`:m+"min";
  }

  if(!palavra) return null;
  const rest=restante();

  // Modal de escolha de tempo
  if(escolhendo) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"white",borderRadius:20,padding:28,maxWidth:320,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔴</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"#dc2626",letterSpacing:3,marginBottom:8}}>{palavra}</div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:20,lineHeight:1.6}}>Por quanto tempo precisam de pausa?</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
          {[1,2,6,12,24].map(h=>(
            <button key={h} onClick={()=>acionar(h)} disabled={salvando}
              style={{background:"#dc2626",color:"white",border:"none",borderRadius:20,padding:"8px 18px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
              {h}h
            </button>
          ))}
        </div>
        <button onClick={()=>setEscolhendo(false)}
          style={{background:"none",border:"none",color:"#9ca3af",fontSize:13,cursor:"pointer"}}>
          Cancelar
        </button>
      </div>
    </div>
  );

  // Card ativo
  if(ativo&&rest) return (
    <div className="metric-card" style={{background:"#fef2f2",border:"2px solid #fca5a5",cursor:"default"}}>
      <div style={{fontSize:20}}>🔴</div>
      <div style={{fontSize:10,fontWeight:600,color:"#dc2626",letterSpacing:1}}>{palavra}</div>
      <div style={{fontSize:11,fontWeight:700,color:"#dc2626"}}>{rest}</div>
    </div>
  );

  // Card normal
  return (
    <div className="metric-card" style={{cursor:"pointer",border:"1.5px solid #fecaca"}}
      onClick={()=>setEscolhendo(true)}>
      <div style={{fontSize:20}}>🔴</div>
      <div style={{fontSize:10,fontWeight:700,color:"#dc2626",letterSpacing:1,marginTop:2}}>{palavra}</div>
      <div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>Emergência</div>
    </div>
  );
}

// ── Inventário Bem-Estar (42 questões) ──
const INVENTARIO_QUESTOES_C = [
  {n:1,  texto:"Com que frequência você e seu parceiro(a) trabalham juntos para alcançar objetivos comuns?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:2,  texto:"Como você descreveria a frequência com que você e seu parceiro(a) têm conversas abertas e honestas sobre suas preocupações e problemas?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:3,  texto:"Como você avalia sua satisfação geral com a vida sexual em seu relacionamento?", opcoes:["Muito insatisfeito(a)","Insatisfeito(a)","Neutro(a)","Satisfeito(a)","Muito satisfeito(a)"]},
  {n:4,  texto:"Quando você e seu parceiro(a) enfrentam um desentendimento, com que frequência vocês conseguem encontrar uma solução que seja satisfatória para ambos?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:5,  texto:"Em geral, como você avalia a qualidade das discussões que você e seu parceiro(a) têm sobre assuntos importantes?", opcoes:["Muito insatisfatória","Insatisfatória","Neutra","Satisfatória","Muito satisfatória"]},
  {n:6,  texto:"Com que frequência você e seu parceiro(a) se comunicam sobre suas necessidades e desejos sexuais?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:7,  texto:"Com que frequência você e seu parceiro(a) compartilham seus sentimentos mais profundos um com o outro?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:8,  texto:"Como você avalia a capacidade de seu relacionamento em resolver conflitos de forma efetiva?", opcoes:["Muito insatisfatória","Insatisfatória","Neutra","Satisfatória","Muito satisfatória"]},
  {n:9,  texto:"Como você descreveria a qualidade de suas relações sexuais em seu relacionamento?", opcoes:["Muito insatisfatória","Insatisfatória","Neutra","Satisfatória","Muito satisfatória"]},
  {n:10, texto:"Como você descreveria a capacidade de seu relacionamento em criar um ambiente emocionalmente seguro e acolhedor?", opcoes:["Muito insatisfatória","Insatisfatória","Neutra","Satisfatória","Muito satisfatória"]},
  {n:11, texto:"Quando você e seu parceiro(a) discordam sobre algo, com que frequência vocês conseguem resolver o conflito de maneira efetiva?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:12, texto:"Como você se sente em relação à habilidade de seu parceiro(a) de expressar seus sentimentos de forma clara e compreensível durante uma conversa?", opcoes:["Muito insatisfeito(a)","Insatisfeito(a)","Neutro(a)","Satisfeito(a)","Muito satisfeito(a)"]},
  {n:13, texto:"Com que frequência você e seu parceiro(a) encontram soluções diferentes para resolver problemas ou desafios em seu relacionamento?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:14, texto:"Com que frequência você e seu parceiro(a) conseguem discutir um problema sem que isso afete negativamente o relacionamento?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:15, texto:"Com que frequência você e seu parceiro(a) experimentam momentos íntimos e prazerosos juntos?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:16, texto:"Como você avalia a disposição de seu parceiro(a) para ajudá-lo(a) nas tarefas domésticas e responsabilidades compartilhadas?", opcoes:["Muito insatisfatória","Insatisfatória","Neutra","Satisfatória","Muito satisfatória"]},
  {n:17, texto:"Quando você está passando por momentos difíceis, com quem você costuma compartilhar seus sentimentos primeiro?", opcoes:["Com ninguém","Com um membro da família","Com um amigo(a)","Com meu parceiro(a)","Com um profissional especializado(a)"]},
  {n:18, texto:"Quando ocorre um desacordo entre vocês, como vocês costumam resolver a situação?", opcoes:["Ignorando o problema","Gritando ou discutindo","Evitando o assunto","Argumentando meu ponto de vista","Conversando e buscando uma solução"]},
  {n:19, texto:"Quando você compartilha suas opiniões com seu parceiro(a), com que frequência você se sente ouvido(a) e compreendido(a)?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:20, texto:"Com que frequência você e seu parceiro(a) reservam um tempo específico para conversar sobre questões importantes ou preocupações relacionadas ao relacionamento?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:21, texto:"Você se sente à vontade para expressar suas preferências sexuais e fantasias com seu parceiro(a)?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:22, texto:"Como você se sente em relação à capacidade de seu parceiro(a) de compreender suas emoções e oferecer apoio quando você precisa?", opcoes:["Muito insatisfeito(a)","Insatisfeito(a)","Neutro(a)","Satisfeito(a)","Muito satisfeito(a)"]},
  {n:23, texto:"Vocês conseguem chegar a um consenso sobre questões importantes, mesmo quando têm opiniões diferentes?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:24, texto:"Com que frequência você e seu parceiro(a) dedicam tempo para se conectar emocionalmente, sem distrações externas?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:25, texto:"Como você avalia a capacidade de seu relacionamento em superar desafios ou dificuldades na vida sexual?", opcoes:["Muito insatisfatória","Insatisfatória","Neutra","Satisfatória","Muito satisfatória"]},
  {n:26, texto:"Você e seu parceiro(a) costumam discutir e tomar decisões importantes juntos?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:27, texto:"Você e seu parceiro(a) estão satisfeitos com a frequência das relações sexuais em seu relacionamento?", opcoes:["Muito insatisfeito(a)","Insatisfeito(a)","Neutro(a)","Satisfeito(a)","Muito satisfeito(a)"]},
  {n:28, texto:"Com que frequência vocês conseguem manter o respeito mútuo mesmo durante uma discussão acalorada?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:29, texto:"Você se sente à vontade para expressar suas emoções, mesmo as mais vulneráveis, com seu parceiro(a)?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:30, texto:"Com que frequência você e seu parceiro(a) compartilham momentos de diversão e risadas juntos?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:31, texto:"Quando um conflito é resolvido, como vocês se sentem em relação ao processo de resolução?", opcoes:["Muito insatisfeito(a)","Insatisfeito(a)","Neutro(a)","Satisfeito(a)","Muito satisfeito(a)"]},
  {n:32, texto:"Como você avalia a capacidade de seu parceiro(a) de fazer você rir e levantar seu ânimo quando necessário?", opcoes:["Muito insatisfatória","Insatisfatória","Neutra","Satisfatória","Muito satisfatória"]},
  {n:33, texto:"Você e seu parceiro(a) têm interesses em comum que os levam a participar de atividades recreativas juntos?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:34, texto:"Como você descreveria a importância do humor em seu relacionamento?", opcoes:["Muito pouco importante","Pouco importante","Neutro(a)","Importante","Muito importante"]},
  {n:35, texto:"Como você descreveria a profundidade do vínculo emocional entre você e seu parceiro(a)?", opcoes:["Muito superficial","Superficial","Moderado","Profundo","Muito profundo"]},
  {n:36, texto:"Com que frequência você e seu parceiro(a) compartilham momentos de descontração e relaxamento juntos?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:37, texto:"Com que frequência você e seu parceiro(a) se apoiam mutuamente para lidar com o estresse e os desafios da vida?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:38, texto:"Você se sente valorizado(a) e reconhecido(a) pelo seu parceiro(a) em suas contribuições para o relacionamento?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:39, texto:"Como você descreveria a igualdade de contribuição entre você e seu parceiro(a) nos compromissos financeiros e nas despesas domésticas?", opcoes:["Muito desigual","Desigual","Neutra","Igual","Muito igual"]},
  {n:40, texto:"Você se sente confortável para expressar seu senso de humor com seu parceiro(a)?", opcoes:["Nunca","Raramente","Às vezes","Frequentemente","Sempre"]},
  {n:41, texto:"Como você avalia a capacidade de seu relacionamento em resolver conflitos de forma colaborativa, buscando soluções que beneficiem ambos os parceiros?", opcoes:["Muito insatisfatória","Insatisfatória","Neutra","Satisfatória","Muito satisfatória"]},
  {n:42, texto:"Como você avalia a capacidade de seu relacionamento em lidar com situações difíceis com leveza e humor?", opcoes:["Muito insatisfatória","Insatisfatória","Neutra","Satisfatória","Muito satisfatória"]},
];

const INVENTARIO_CATS_C = [
  {label:"Comunicação Eficaz",      cor:"#6366f1", questoes:[2,5,11,12,13,19,20]},
  {label:"Resolução de Conflitos",   cor:"#f59e0b", questoes:[4,8,14,18,23,28,31]},
  {label:"Intimidade Emocional",     cor:"#ec4899", questoes:[7,10,17,22,24,29,35]},
  {label:"Satisfação Sexual",        cor:"#dc2626", questoes:[3,6,9,15,21,25,27]},
  {label:"Cooperação e Colaboração", cor:"#16a34a", questoes:[1,16,26,37,38,39,41]},
  {label:"Senso de Humor e Lazer",   cor:"#0891b2", questoes:[30,32,33,34,36,40,42]},
];

const RODA_DIMENSOES = [
  "Comunicação","Família","Sexualidade","Estresse e Pressão",
  "Divisão","Ciúmes","Espiritualidade","Diferenças e Conflitos",
  "Estabilidade Financeira","Rel. de Poder","Mudanças","Expectativas e Equilíbrio"
];

function AtivInventario({ user, casalId, onVoltar }) {
  const [respostas, setRespostas] = useState({});
  const [parceiro,  setParceiro]  = useState(null);
  const [respParceiro, setRespParceiro] = useState(null);
  const [pagina, setPagina]       = useState(0);
  const [salvando, setSalvando]   = useState(false);
  const [salvo, setSalvo]         = useState(false);
  const [verComparativo, setVerComparativo] = useState(false);
  const POR_PAG = 6;
  const total   = INVENTARIO_QUESTOES_C.length;
  const totalPag = Math.ceil(total / POR_PAG);

  useEffect(()=>{
    if (!casalId) return;
    // Buscar parceiro
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{
      if(d.exists) setParceiro({id:d.id,...d.data()});
    });
    // Buscar resposta já salva do próprio usuário
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId)
      .where("pacienteId","==",user.id)
      .where("atividadeId","==","inventario-bem-estar")
      .orderBy("createdAt","desc").limit(1)
      .onSnapshot(s=>{
        if(s.docs.length>0) { setRespostas(s.docs[0].data().respostas||{}); setSalvo(true); }
      },()=>{});
    // Buscar resposta do parceiro
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId)
      .where("pacienteId","==",casalId)
      .where("atividadeId","==","inventario-bem-estar")
      .orderBy("createdAt","desc").limit(1)
      .onSnapshot(s=>{
        if(s.docs.length>0) setRespParceiro(s.docs[0].data().respostas||{});
      },()=>{});
  },[casalId, user.id]);

  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId: user.id, casalId,
        atividadeId: "inventario-bem-estar",
        respostas,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch(e) { alert("Erro ao salvar."); }
    setSalvando(false);
  }

  function calcular(resp) {
    return INVENTARIO_CATS_C.map(cat=>{
      const soma = cat.questoes.reduce((a,q)=>a+(resp[q]||0),0);
      return {...cat, soma, pct: Math.max(0,Math.round(((soma-7)/28)*100))};
    });
  }

  // Comparativo visual
  if (verComparativo) {
    const meu = calcular(respostas);
    const del = respParceiro ? calcular(respParceiro) : null;
    const isEla = user.genero==="Feminino";
    const corEu = isEla ? "#ec4899" : "#2563eb";
    const corParceiro = isEla ? "#2563eb" : "#ec4899";
    return (
      <div>
        <button onClick={()=>setVerComparativo(false)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
          <Icon name="arrow-left" size={15}/> Voltar
        </button>
        <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Comparativo do Inventário</div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20}}>
          <span style={{color:corEu,fontWeight:600}}>● {user.nome.split(" ")[0]}</span>
          {parceiro && <span style={{color:corParceiro,fontWeight:600,marginLeft:12}}>● {parceiro.nome.split(" ")[0]}</span>}
        </div>
        {meu.map((cat,i)=>(
          <div key={cat.label} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,marginBottom:6}}>
              <span>{cat.label}</span>
              <span style={{display:"flex",gap:12}}>
                <span style={{color:corEu}}>{cat.soma}/35</span>
                {del && <span style={{color:corParceiro}}>{del[i].soma}/35</span>}
              </span>
            </div>
            <div style={{position:"relative",height:10,borderRadius:20,background:"#f3f4f6",overflow:"hidden"}}>
              <div style={{position:"absolute",left:0,top:0,height:"100%",width:cat.pct+"%",background:corEu,borderRadius:20,opacity:0.85}}/>
              {del && <div style={{position:"absolute",left:0,top:0,height:"100%",width:del[i].pct+"%",background:corParceiro,borderRadius:20,opacity:0.5}}/>}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text-muted)",marginTop:2}}>
              <span>Baixo (7)</span><span>Alto (35)</span>
            </div>
          </div>
        ))}
        {!del && <div style={{textAlign:"center",padding:16,fontSize:13,color:"var(--text-muted)",background:"#f9fafb",borderRadius:10}}>{parceiro?`${parceiro.nome.split(" ")[0]} ainda não respondeu o inventário.`:"Parceiro(a) não vinculado."}</div>}
      </div>
    );
  }

  // Instruções
  if (pagina===0) return (
    <div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:48,marginBottom:12}}>💑</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:8}}>Inventário de Bem-Estar de Casais</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20,lineHeight:1.7}}>
        42 questões sobre 6 dimensões do relacionamento.<br/>
        <em>Seja rápido, não pondere!</em>
      </div>
      {salvo && <div style={{background:"#d1fae5",borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:"#065f46"}}>✓ Você já respondeu. Pode refazer ou ver o comparativo.</div>}
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button className="btn-primary" onClick={()=>setPagina(1)}>
          {salvo?"Refazer inventário":"Iniciar"}
        </button>
        {salvo && <button className="btn-secondary" onClick={()=>setVerComparativo(true)}>Ver comparativo 📊</button>}
      </div>
    </div>
  );

  // Resultado
  if (pagina===totalPag+1) {
    return (
      <div>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:8}}>✅</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600}}>Inventário concluído!</div>
        </div>
        {calcular(respostas).map(cat=>(
          <div key={cat.label} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,marginBottom:4}}>
              <span style={{color:cat.cor}}>{cat.label}</span><span>{cat.soma}/35</span>
            </div>
            <div style={{background:"#f3f4f6",borderRadius:20,height:8}}>
              <div style={{width:cat.pct+"%",height:"100%",background:cat.cor,borderRadius:20}}/>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button className="btn-secondary" style={{flex:1}} onClick={salvar} disabled={salvando}>
            {salvando?"Salvando...":"💾 Salvar respostas"}
          </button>
          <button className="btn-primary" style={{flex:1}} onClick={()=>setVerComparativo(true)}>
            Ver comparativo 📊
          </button>
        </div>
      </div>
    );
  }

  const questoesPag = INVENTARIO_QUESTOES_C.slice((pagina-1)*POR_PAG, pagina*POR_PAG);
  const respondidas = Object.keys(respostas).length;
  return (
    <div>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text-muted)",marginBottom:4}}>
          <span>Questões {(pagina-1)*POR_PAG+1}–{Math.min(pagina*POR_PAG,42)} de 42</span>
          <span>{respondidas} respondidas</span>
        </div>
        <div style={{background:"#f3f4f6",borderRadius:20,height:5}}>
          <div style={{width:Math.round((respondidas/42)*100)+"%",height:"100%",background:"var(--purple)",borderRadius:20}}/>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {questoesPag.map(q=>(
          <div key={q.n} style={{background:"#fafafa",borderRadius:10,padding:14,border:"1px solid var(--gray-100)"}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:10,lineHeight:1.5}}>
              <span style={{color:"var(--purple)",marginRight:6}}>{q.n}.</span>{q.texto}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {q.opcoes.map((op,i)=>(
                <button key={i} onClick={()=>setRespostas(r=>({...r,[q.n]:i+1}))}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,
                    border:`1.5px solid ${respostas[q.n]===i+1?"var(--purple)":"var(--gray-200)"}`,
                    background:respostas[q.n]===i+1?"#f5f3ff":"white",
                    cursor:"pointer",fontFamily:"inherit",fontSize:12,textAlign:"left",
                    color:respostas[q.n]===i+1?"var(--purple)":"var(--gray-700)",
                    fontWeight:respostas[q.n]===i+1?600:400}}>
                  <span style={{fontSize:10,color:"var(--gray-400)",minWidth:14}}>{String.fromCharCode(97+i)})</span>{op}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginTop:20}}>
        <button className="btn-secondary" onClick={()=>setPagina(p=>p-1)} disabled={pagina===1}>← Anterior</button>
        <div style={{flex:1}}/>
        {pagina<totalPag
          ? <button className="btn-primary" onClick={()=>setPagina(p=>p+1)}>Próximo →</button>
          : <button className="btn-primary" onClick={()=>setPagina(totalPag+1)} disabled={respondidas<42} style={{opacity:respondidas<42?0.5:1}}>
              {respondidas<42?`Faltam ${42-respondidas}`:"Ver Resultado →"}
            </button>
        }
      </div>
    </div>
  );
}

// ── Roda da Vida do Relacionamento ──
function AtivRodaVida({ user, casalId, onVoltar }) {
  const [valores,    setValores]    = useState({});
  const [parceiro,   setParceiro]   = useState(null);
  const [valParceiro,setValParceiro]= useState(null);
  const [salvando,   setSalvando]   = useState(false);
  const [salvo,      setSalvo]      = useState(false);

  useEffect(()=>{
    if (!casalId) return;
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",user.id)
      .where("atividadeId","==","roda-vida-relacionamento").orderBy("createdAt","desc").limit(1)
      .onSnapshot(s=>{ if(s.docs.length>0){setValores(s.docs[0].data().respostas||{});setSalvo(true);} },()=>{});
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",casalId)
      .where("atividadeId","==","roda-vida-relacionamento").orderBy("createdAt","desc").limit(1)
      .onSnapshot(s=>{ if(s.docs.length>0) setValParceiro(s.docs[0].data().respostas||{}); },()=>{});
  },[casalId,user.id]);

  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId:user.id, casalId, atividadeId:"roda-vida-relacionamento",
        respostas:valores, createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  const isEla = user.genero==="Feminino";
  const corEu = isEla?"#ec4899":"#2563eb";
  const corParceiro = isEla?"#2563eb":"#ec4899";

  // SVG Radar
  function Radar({vals, cor, opacity=1}) {
    const n = RODA_DIMENSOES.length;
    const cx=150,cy=150,r=110;
    const pontos = RODA_DIMENSOES.map((_,i)=>{
      const ang = (i/n)*2*Math.PI - Math.PI/2;
      const v = (vals[RODA_DIMENSOES[i]]||0)/10;
      return [cx+r*v*Math.cos(ang), cy+r*v*Math.sin(ang)];
    });
    const pts = pontos.map(p=>p.join(",")).join(" ");
    const grades = [2,4,6,8,10].map(g=>{
      const gpts = RODA_DIMENSOES.map((_,i)=>{
        const ang=(i/n)*2*Math.PI-Math.PI/2;
        return [cx+r*(g/10)*Math.cos(ang),cy+r*(g/10)*Math.sin(ang)].join(",");
      }).join(" ");
      return <polygon key={g} points={gpts} fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>;
    });
    const eixos = RODA_DIMENSOES.map((_,i)=>{
      const ang=(i/n)*2*Math.PI-Math.PI/2;
      return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(ang)} y2={cy+r*Math.sin(ang)} stroke="#e5e7eb" strokeWidth="0.5"/>;
    });
    const labels = RODA_DIMENSOES.map((d,i)=>{
      const ang=(i/n)*2*Math.PI-Math.PI/2;
      const lx=cx+(r+18)*Math.cos(ang), ly=cy+(r+18)*Math.sin(ang);
      return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#6b7280">{d}</text>;
    });
    return (
      <g opacity={opacity}>
        {grades}{eixos}
        <polygon points={pts} fill={cor} fillOpacity="0.2" stroke={cor} strokeWidth="2"/>
        {labels}
      </g>
    );
  }

  return (
    <div>
      <button onClick={onVoltar} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
        <Icon name="arrow-left" size={15}/> Voltar
      </button>
      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Roda da Vida do Relacionamento</div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>Avalie de 0 a 10 cada dimensão. 0 = nenhum estresse · 10 = estresse máximo</div>

      {salvo && (
        <div style={{marginBottom:20,textAlign:"center"}}>
          <svg width="300" height="300" viewBox="0 0 300 300">
            <Radar vals={valores} cor={corEu}/>
            {valParceiro && <Radar vals={valParceiro} cor={corParceiro} opacity={0.7}/>}
          </svg>
          <div style={{display:"flex",gap:16,justifyContent:"center",fontSize:12,marginTop:8}}>
            <span style={{color:corEu,fontWeight:600}}>● {user.nome.split(" ")[0]}</span>
            {parceiro&&valParceiro&&<span style={{color:corParceiro,fontWeight:600}}>● {parceiro.nome.split(" ")[0]}</span>}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {RODA_DIMENSOES.map(dim=>(
          <div key={dim}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>{dim}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min="0" max="10" step="1"
                value={valores[dim]||0}
                onChange={e=>setValores(v=>({...v,[dim]:parseInt(e.target.value)}))}
                style={{flex:1,accentColor:"var(--purple)"}}/>
              <span style={{width:20,textAlign:"center",fontWeight:700,fontSize:13,color:"var(--purple)"}}>{valores[dim]||0}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary" style={{width:"100%"}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar Roda da Vida"}
      </button>
      {salvo&&!valParceiro&&parceiro&&<div style={{marginTop:12,fontSize:12,color:"var(--text-muted)",textAlign:"center"}}>{parceiro.nome.split(" ")[0]} ainda não respondeu — o comparativo aparecerá quando ambos responderem.</div>}
    </div>
  );
}

// ── Nossas 3 Metas ──
function AtivMetas({ user, casalId, onVoltar }) {
  const [metas, setMetas]     = useState(["","",""]);
  const [salvas, setSalvas]   = useState([]);
  const [parceiroMetas, setParceiroMetas] = useState([]);
  const [parceiro, setParceiro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(()=>{
    if(!casalId) return;
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    db.collection("clinica_metas").where("pacienteId","==",user.id).where("status","==","ativa")
      .onSnapshot(s=>setSalvas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_metas").where("pacienteId","==",casalId).where("status","==","ativa")
      .onSnapshot(s=>setParceiroMetas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[casalId,user.id]);

  async function salvar() {
    const validas = metas.filter(m=>m.trim());
    if(validas.length===0){alert("Digite pelo menos 1 meta.");return;}
    setSalvando(true);
    try {
      // Remove metas antigas
      const antigas = await db.collection("clinica_metas").where("pacienteId","==",user.id).where("status","==","ativa").get();
      const batch = db.batch();
      antigas.docs.forEach(d=>batch.update(d.ref,{status:"arquivada"}));
      // Adiciona novas
      for(const titulo of validas){
        const ref = db.collection("clinica_metas").doc();
        batch.set(ref,{titulo,pacienteId:user.id,casalId,status:"ativa",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      }
      await batch.commit();
      setMetas(["","",""]);
    } catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  return (
    <div>
      <button onClick={onVoltar} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
        <Icon name="arrow-left" size={15}/> Voltar
      </button>
      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Nossas 3 Metas do Relacionamento</div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20}}>Defina suas 3 principais metas terapêuticas. Elas aparecem no dashboard do casal.</div>

      {/* Metas atuais */}
      {salvas.length>0&&(
        <div style={{background:"#f5f3ff",borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--purple)",marginBottom:8}}>Suas metas atuais:</div>
          {salvas.map(m=><div key={m.id} style={{fontSize:13,marginBottom:4}}>🥈 {m.titulo}</div>)}
        </div>
      )}

      {/* Comparativo com parceiro */}
      {parceiroMetas.length>0&&parceiro&&(
        <div style={{background:"#eff6ff",borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"#2563eb",marginBottom:8}}>Metas de {parceiro.nome.split(" ")[0]}:</div>
          {parceiroMetas.map(m=><div key={m.id} style={{fontSize:13,marginBottom:4}}>🥈 {m.titulo}</div>)}
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {[0,1,2].map(i=>(
          <div key={i}>
            <label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Meta {i+1}</label>
            <input className="form-input" value={metas[i]}
              onChange={e=>{const n=[...metas];n[i]=e.target.value;setMetas(n);}}
              placeholder={`Ex: ${["Melhorar a comunicação diária","Reservar tempo de qualidade juntos","Resolver conflitos com mais calma"][i]}`}/>
          </div>
        ))}
      </div>
      <button className="btn-primary" style={{width:"100%"}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar metas"}
      </button>
    </div>
  );
}

// ── Quem Eu Sou no Relacionamento ──
function AtivQuemSou({ user, casalId, onVoltar }) {
  const QUADRANTES = [
    {id:"sou",    label:"SOU",                  desc:"Características que possuo e não me incomodam.",              cor:"#7B00C4",bg:"#f5f3ff"},
    {id:"nao_mas",label:"NÃO SOU, MAS GOSTARIA", desc:"Características que não possuo e me fazem falta.",            cor:"#0891b2",bg:"#e0f2fe"},
    {id:"sou_nao",label:"SOU, MAS NÃO GOSTARIA", desc:"Características que possuo mas me incomodam.",                cor:"#d97706",bg:"#fef3c7"},
    {id:"nao_sou",label:"NÃO SOU",               desc:"Características que não possuo e não me incomodam.",          cor:"#6b7280",bg:"#f3f4f6"},
  ];
  const [campos,  setCampos]  = useState({sou:"",nao_mas:"",sou_nao:"",nao_sou:""});
  const [parceiro,setParceiro]= useState(null);
  const [respP,   setRespP]   = useState(null);
  const [salvo,   setSalvo]   = useState(false);
  const [salvando,setSalvando]= useState(false);

  useEffect(()=>{
    if(!casalId) return;
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",user.id)
      .where("atividadeId","==","quem-sou").orderBy("createdAt","desc").limit(1)
      .onSnapshot(s=>{ if(s.docs.length>0){setCampos(s.docs[0].data().respostas||{});setSalvo(true);} },()=>{});
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",casalId)
      .where("atividadeId","==","quem-sou").orderBy("createdAt","desc").limit(1)
      .onSnapshot(s=>{ if(s.docs.length>0) setRespP(s.docs[0].data().respostas||{}); },()=>{});
  },[casalId,user.id]);

  async function salvar(){
    setSalvando(true);
    try{
      await db.collection("clinica_casais_respostas").add({
        pacienteId:user.id,casalId,atividadeId:"quem-sou",
        respostas:campos,createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    }catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  return (
    <div>
      <button onClick={onVoltar} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
        <Icon name="arrow-left" size={15}/> Voltar
      </button>
      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Quem Eu Sou no Relacionamento</div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>Reflexão individual sobre sua identidade no relacionamento.</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {QUADRANTES.map(q=>(
          <div key={q.id} style={{background:q.bg,borderRadius:10,padding:12,border:`1px solid ${q.cor}30`}}>
            <div style={{fontWeight:700,fontSize:11,color:q.cor,marginBottom:4}}>{q.label}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:8,lineHeight:1.4}}>{q.desc}</div>
            <textarea className="form-input" rows={4} value={campos[q.id]||""}
              onChange={e=>setCampos(c=>({...c,[q.id]:e.target.value}))}
              placeholder="Digite aqui..." style={{fontSize:12,resize:"none",background:"white"}}/>
          </div>
        ))}
      </div>

      <button className="btn-primary" style={{width:"100%",marginBottom:16}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar"}
      </button>

      {/* Comparativo com parceiro */}
      {respP&&parceiro&&(
        <div style={{borderTop:"1px solid var(--gray-100)",paddingTop:16}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>💬 Respostas de {parceiro.nome.split(" ")[0]}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {QUADRANTES.map(q=>(
              <div key={q.id} style={{background:q.bg,borderRadius:10,padding:12,border:`1px solid ${q.cor}30`}}>
                <div style={{fontWeight:700,fontSize:11,color:q.cor,marginBottom:6}}>{q.label}</div>
                <div style={{fontSize:12,color:"var(--gray-700)",whiteSpace:"pre-wrap",lineHeight:1.5}}>{respP[q.id]||<span style={{color:"var(--gray-400)"}}>Não preenchido</span>}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── O Que Eu Quero e Não Quero Mais ──
function AtivOQueQuero({ user, casalId, onVoltar }) {
  const CAMPOS = [
    {id:"quero_sit",  label:"QUERO +  Situações",  desc:"Situações que você gosta e deseja que continuem.",      cor:"#16a34a",bg:"#f0fdf4"},
    {id:"quero_val",  label:"QUERO +  Valores",     desc:"Situações MUITO IMPORTANTES que deseja manter.",        cor:"#16a34a",bg:"#dcfce7"},
    {id:"nquero_sit", label:"QUERO −  Situações",   desc:"Situações que você NÃO gosta e quer que parem.",        cor:"#dc2626",bg:"#fef2f2"},
    {id:"nquero_val", label:"QUERO −  Valores",     desc:"Situações MUITO IMPORTANTES que deseja mudar.",         cor:"#dc2626",bg:"#fee2e2"},
  ];
  const [campos,  setCampos]  = useState({});
  const [parceiro,setParceiro]= useState(null);
  const [respP,   setRespP]   = useState(null);
  const [salvando,setSalvando]= useState(false);
  const [salvo,   setSalvo]   = useState(false);

  useEffect(()=>{
    if(!casalId) return;
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",user.id)
      .where("atividadeId","==","o-que-quero").orderBy("createdAt","desc").limit(1)
      .onSnapshot(s=>{ if(s.docs.length>0){setCampos(s.docs[0].data().respostas||{});setSalvo(true);} },()=>{});
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",casalId)
      .where("atividadeId","==","o-que-quero").orderBy("createdAt","desc").limit(1)
      .onSnapshot(s=>{ if(s.docs.length>0) setRespP(s.docs[0].data().respostas||{}); },()=>{});
  },[casalId,user.id]);

  async function salvar(){
    setSalvando(true);
    try{
      await db.collection("clinica_casais_respostas").add({
        pacienteId:user.id,casalId,atividadeId:"o-que-quero",
        respostas:campos,createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    }catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  return (
    <div>
      <button onClick={onVoltar} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
        <Icon name="arrow-left" size={15}/> Voltar
      </button>
      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>O Que Eu Quero e Não Quero Mais</div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>Mapeamento de expectativas e limites no relacionamento.</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {CAMPOS.map(c=>(
          <div key={c.id} style={{background:c.bg,borderRadius:10,padding:12,border:`1px solid ${c.cor}30`}}>
            <div style={{fontWeight:700,fontSize:11,color:c.cor,marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:8,lineHeight:1.4}}>{c.desc}</div>
            <textarea className="form-input" rows={4} value={campos[c.id]||""}
              onChange={e=>setCampos(v=>({...v,[c.id]:e.target.value}))}
              placeholder="Digite aqui..." style={{fontSize:12,resize:"none",background:"white"}}/>
          </div>
        ))}
      </div>

      <button className="btn-primary" style={{width:"100%",marginBottom:16}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar"}
      </button>

      {respP&&parceiro&&(
        <div style={{borderTop:"1px solid var(--gray-100)",paddingTop:16}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>💬 Respostas de {parceiro.nome.split(" ")[0]}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {CAMPOS.map(c=>(
              <div key={c.id} style={{background:c.bg,borderRadius:10,padding:12,border:`1px solid ${c.cor}30`}}>
                <div style={{fontWeight:700,fontSize:11,color:c.cor,marginBottom:6}}>{c.label}</div>
                <div style={{fontSize:12,color:"var(--gray-700)",whiteSpace:"pre-wrap",lineHeight:1.5}}>{respP[c.id]||<span style={{color:"var(--gray-400)"}}>Não preenchido</span>}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
function EtapaCasal({ user, etapaData }) {
  const [atividadeAberta, setAtividadeAberta] = useState(null);
  const [respostas, setRespostas]             = useState({});
  const [salvando, setSalvando]               = useState(false);
  const [msg, setMsg]                         = useState("");
  const casalId = user.casalId || user.id;

  async function salvarRespostas() {
    if (!atividadeAberta) return;
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId: user.id, casalId,
        etapaId: etapaData.tabId,
        atividadeId: atividadeAberta.id,
        atividadeTitulo: atividadeAberta.titulo,
        respostas,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setMsg("✓ Respostas salvas! 💜");
      setTimeout(()=>setMsg(""), 3000);
    } catch(e) { setMsg("Erro ao salvar. Tente novamente."); }
    setSalvando(false);
  }

  if (atividadeAberta) {
    // Atividades específicas do Diagnóstico
    if (atividadeAberta.id==="inventario-bem-estar")
      return <AtivInventario user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;
    if (atividadeAberta.id==="roda-vida-relacionamento")
      return <AtivRodaVida user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;
    if (atividadeAberta.id==="3-metas")
      return <AtivMetas user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;
    if (atividadeAberta.id==="quem-sou")
      return <AtivQuemSou user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;
    if (atividadeAberta.id==="o-que-quero")
      return <AtivOQueQuero user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;

    // Template genérico para etapas 1-4
    return (
      <div>
        <button onClick={()=>{ setAtividadeAberta(null); setRespostas({}); setMsg(""); }}
          style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16,padding:"6px 0"}}>
          <Icon name="arrow-left" size={15}/> Voltar para {etapaData.stage===0?"Diagnóstico":"Etapa "+etapaData.stage}
        </button>
        <div style={{background:etapaData.bg,border:"1.5px solid "+etapaData.cor+"40",borderRadius:14,padding:20,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:28}}>{etapaData.emoji}</span>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:etapaData.cor}}>{etapaData.stage===0?"Diagnóstico":"Etapa "+etapaData.stage} — {etapaData.titulo}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{atividadeAberta.titulo}</div>
            </div>
          </div>
          <p style={{fontSize:13,color:"var(--gray-700)",marginTop:10,lineHeight:1.6}}>{atividadeAberta.desc}</p>
        </div>
        <div className="card">
          <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>{atividadeAberta.titulo}</div>
          <div style={{background:"#f9fafb",borderRadius:10,padding:14,marginBottom:20,fontSize:13,color:"#6b7280",lineHeight:1.7}}>
            Responda com honestidade. Esta atividade faz parte do protocolo de Terapia de Casais TCC da Dra. Lucia Kratz.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[1,2,3].map(n=>(
              <div key={n}>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Reflexão {n}</label>
                <textarea className="form-input" rows={3}
                  value={respostas[atividadeAberta.id+"_"+n]||""}
                  onChange={e=>setRespostas(r=>({...r,[atividadeAberta.id+"_"+n]:e.target.value}))}
                  placeholder="Escreva sua resposta..." style={{resize:"vertical"}}/>
              </div>
            ))}
          </div>
          {msg && <div style={{background:msg.startsWith("✓")?"#d1fae5":"#fef3c7",border:"1px solid",borderColor:msg.startsWith("✓")?"#6ee7b7":"#f59e0b",borderRadius:8,padding:"10px 14px",marginTop:16,fontSize:13,color:msg.startsWith("✓")?"#065f46":"#92400e"}}>{msg}</div>}
          <button onClick={salvarRespostas} disabled={salvando} className="btn-primary" style={{width:"100%",marginTop:20}}>
            {salvando?"Salvando...":<><Icon name="save" size={15}/> Salvar respostas</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{background:etapaData.bg, border:"1.5px solid "+etapaData.cor+"40", borderRadius:14, padding:24, marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <span style={{fontSize:36}}>{etapaData.emoji}</span>
          <div>
            <div style={{fontWeight:700,fontSize:18,color:etapaData.cor}}>
              {etapaData.stage===0?"Diagnóstico Inicial":"Etapa "+etapaData.stage} — {etapaData.titulo}
            </div>
            <div style={{fontSize:13,color:"var(--gray-700)",marginTop:2}}>{etapaData.subtitulo}</div>
          </div>
        </div>
        <div style={{fontSize:13,color:"var(--gray-600)",marginTop:8,lineHeight:1.6}}>
          {etapaData.atividades.length} atividade{etapaData.atividades.length!==1?"s":""} disponível{etapaData.atividades.length!==1?"is":""} nesta etapa. Clique para acessar.
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {etapaData.atividades.map(at=>(
          <button key={at.id} onClick={()=>setAtividadeAberta(at)}
            style={{display:"flex",alignItems:"flex-start",gap:14,padding:18,borderRadius:12,border:"1.5px solid var(--gray-200)",background:"white",cursor:"pointer",textAlign:"left",transition:"all .2s",width:"100%"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=etapaData.cor;e.currentTarget.style.background=etapaData.bg;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--gray-200)";e.currentTarget.style.background="white";}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:etapaData.cor,marginTop:5,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>{at.titulo}</div>
              <div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.5}}>{at.desc}</div>
            </div>
            <span style={{fontSize:12,color:etapaData.cor,fontWeight:600,flexShrink:0,marginTop:2}}>Acessar →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PAINEL ALUNO
// ═══════════════════════════════════════════════════════
function PainelAluno({ user }) {
  const hoje = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  const hora = new Date().getHours();
  const saudacao = hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";

  const FERRAMENTAS_ALUNO = [
    { id:"tcc",       label:"Pensamentos Automáticos", sub:"Registre e questione pensamentos — TCC", icon:"brain",      cor:"#ede0fa" },
    { id:"humor",     label:"Registro de Humor",       sub:"Escala de humor do paciente",            icon:"heart",      cor:"#fde8f0" },
    { id:"diario",    label:"Diário Terapêutico",      sub:"Escrita reflexiva livre",                icon:"book-open",  cor:"#e0f0ff" },
    { id:"metas",     label:"Metas Terapêuticas",      sub:"Defina objetivos com o paciente",        icon:"target",     cor:"#e0faed" },
    { id:"fabulas",   label:"Fábulas Terapêuticas",    sub:"Histórias reflexivas para sessão",       icon:"book-heart", cor:"#fff3e0" },
    { id:"reflexoes", label:"Reflexões Cognitivas",    sub:"Exercícios de insight e reestruturação", icon:"lightbulb",  cor:"#fefce0" },
    { id:"ansiedade", label:"Gestão da Ansiedade",     sub:"Tracking, nível de estresse, roda",      icon:"activity",   cor:"#f0e8ff" },
  ];

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#7B00C4,#5a0090)",borderRadius:16,padding:"28px 32px",marginBottom:24,color:"white",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{fontSize:13,opacity:0.8,marginBottom:6,textTransform:"capitalize"}}>{hoje}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:28,fontWeight:600,marginBottom:4}}>
          {saudacao}, {user.nome.split(" ")[0]}! 🎓
        </div>
        <div style={{fontSize:14,opacity:0.85}}>Portal de Supervisão Clínica — Dra. Lucia Kratz</div>
      </div>

      <LinkCompartilhavel user={user}/>

      <div className="card" style={{marginBottom:24}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Ferramentas Clínicas</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {FERRAMENTAS_ALUNO.map(f=>(
            <div key={f.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:12,border:"1px solid var(--gray-200)",background:"white"}}>
              <div style={{width:44,height:44,borderRadius:12,background:f.cor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Icon name={f.icon} size={20}/>
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>{f.label}</div>
                <div style={{fontSize:12,color:"var(--text-muted)"}}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <HistoricoAluno user={user}/>
    </div>
  );
}

function LinkCompartilhavel({ user }) {
  const [descricao, setDescricao]   = useState("");
  const [ferramenta, setFerramenta] = useState("tcc");
  const [salvando, setSalvando]     = useState(false);
  const [links, setLinks]           = useState([]);
  const [copiado, setCopiado]       = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const FERRAMENTAS_LINK = [
    {id:"tcc",       label:"Pensamentos Automáticos"},
    {id:"humor",     label:"Registro de Humor"},
    {id:"diario",    label:"Diário Terapêutico"},
    {id:"metas",     label:"Metas Terapêuticas"},
    {id:"fabulas",   label:"Fábulas Terapêuticas"},
    {id:"reflexoes", label:"Reflexões Cognitivas"},
    {id:"ansiedade", label:"Gestão da Ansiedade"},
  ];

  useEffect(()=>{
    const unsub = db.collection("clinica_aluno_links")
      .where("alunoId","==",user.id)
      .orderBy("createdAt","desc")
      .onSnapshot(s=>setLinks(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return unsub;
  },[user.id]);

  async function gerarLink(){
    if(!descricao.trim()){alert("Digite uma identificação.");return;}
    setSalvando(true);
    const token = Math.random().toString(36).slice(2,10).toUpperCase();
    await db.collection("clinica_aluno_links").add({
      alunoId:user.id, alunoNome:user.nome,
      token, ferramenta, descricao,
      url:`${SITE_URL}/clinica/?link=${token}`,
      usos:0, createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    setDescricao(""); setMostrarForm(false); setSalvando(false);
  }

  function copiar(url,id){
    navigator.clipboard.writeText(url);
    setCopiado(id);
    setTimeout(()=>setCopiado(null),2000);
  }

  async function excluir(id){ if(!confirm("Excluir link?"))return; await db.collection("clinica_aluno_links").doc(id).delete(); }

  return (
    <div className="card" style={{marginBottom:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
          <Icon name="share-2" size={16}/> Links para Pacientes
        </div>
        <button className="btn btn-purple" style={{fontSize:13}} onClick={()=>setMostrarForm(f=>!f)}>
          <Icon name="plus" size={15}/> Gerar Link
        </button>
      </div>

      {mostrarForm&&(
        <div style={{background:"var(--purple-bg)",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div className="form-group">
              <label className="form-label">Ferramenta</label>
              <select className="form-input" value={ferramenta} onChange={e=>setFerramenta(e.target.value)}>
                {FERRAMENTAS_LINK.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Identificação (ex: nome do paciente)</label>
              <input className="form-input" value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Ex: João — TCC sessão 3"/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost" onClick={()=>setMostrarForm(false)}>Cancelar</button>
            <button className="btn btn-purple" onClick={gerarLink} disabled={salvando}>{salvando?"Gerando...":"Gerar Link"}</button>
          </div>
        </div>
      )}

      {links.length===0&&!mostrarForm&&(
        <div style={{textAlign:"center",padding:24,color:"var(--text-muted)",fontSize:14}}>
          Nenhum link gerado ainda. Crie um link para compartilhar com seu paciente.
        </div>
      )}

      {links.map(l=>(
        <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid var(--gray-100)"}}>
          <div style={{width:36,height:36,borderRadius:8,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Icon name="link" size={16}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14}}>{l.descricao}</div>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>{l.ferramenta} · {l.usos||0} uso(s)</div>
          </div>
          <button onClick={()=>copiar(l.url,l.id)}
            style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--purple)",background:copiado===l.id?"var(--purple)":"white",color:copiado===l.id?"white":"var(--purple)",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .2s"}}>
            {copiado===l.id?"✓ Copiado!":"Copiar Link"}
          </button>
          <button className="btn btn-ghost" style={{padding:"4px 8px",color:"var(--danger)"}} onClick={()=>excluir(l.id)}>
            <Icon name="trash-2" size={13}/>
          </button>
        </div>
      ))}
    </div>
  );
}

function HistoricoAluno({ user }) {
  const [registros, setRegistros] = useState([]);
  useEffect(()=>{
    const unsub = db.collection("clinica_aluno_registros")
      .where("alunoId","==",user.id)
      .orderBy("createdAt","desc").limit(20)
      .onSnapshot(s=>setRegistros(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return unsub;
  },[user.id]);

  if(registros.length===0) return null;
  return (
    <div className="card">
      <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Histórico de Registros</div>
      {registros.map(r=>(
        <div key={r.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:"1px solid var(--gray-100)"}}>
          <div style={{width:36,height:36,borderRadius:8,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Icon name="file-text" size={16}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:500,fontSize:14}}>{r.ferramenta} — {r.descricao||"Sem descrição"}</div>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>{r.createdAt?.seconds?new Date(r.createdAt.seconds*1000).toLocaleDateString("pt-BR"):""}</div>
            {r.conteudo&&<div style={{marginTop:6,fontSize:13,color:"var(--gray-600)",background:"var(--gray-50)",borderRadius:8,padding:"8px 12px"}}>{r.conteudo}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SELETOR DE MODO — individual ou casal
// ═══════════════════════════════════════════════════════
function SeletorModo({ user, onEscolha }) {
  const [parceiro, setParceiro] = useState(null);
  const temIndividual = (user.modulosAtivos||[]).length > 0;
  const temCasal = !!user.casalId;

  useEffect(()=>{
    if(user.casalId){
      db.collection("clinica_pacientes").doc(user.casalId).get()
        .then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    }
  },[user.casalId]);

  // Se só tem um modo, vai direto
  useEffect(()=>{
    if(temCasal && !temIndividual) onEscolha("casal");
    else if(!temCasal && temIndividual) onEscolha("individual");
    else if(!temCasal && !temIndividual) onEscolha("individual"); // painel aguardando ativação
  },[temCasal, temIndividual]);

  // Se tem os dois, mostra seletor
  if(!temCasal || !temIndividual) return <Spinner/>;

  return (
    <div style={{minHeight:"100vh",background:"var(--gray-50)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:480}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <img src={LOGO_URL} alt="Lucia Kratz" style={{width:100,height:100,objectFit:"contain",marginBottom:16}} onError={e=>e.target.style.display="none"}/>
          <div style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:600,color:"var(--purple)"}}>
            Olá, {user.nome.split(" ")[0]}! 💜
          </div>
          <div style={{fontSize:14,color:"var(--text-muted)",marginTop:4}}>Como você quer acessar hoje?</div>
        </div>

        {/* Opções */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <button onClick={()=>onEscolha("individual")}
            style={{display:"flex",alignItems:"center",gap:20,padding:"24px 28px",borderRadius:16,border:"2px solid var(--gray-200)",background:"white",cursor:"pointer",textAlign:"left",transition:"all .2s",width:"100%"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--purple)";e.currentTarget.style.background="var(--purple-bg)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--gray-200)";e.currentTarget.style.background="white";}}>
            <div style={{width:56,height:56,borderRadius:16,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Icon name="user" size={28}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text)",marginBottom:4}}>
                Meu Espaço Individual
              </div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>
                Ferramentas pessoais, humor, diário e metas terapêuticas
              </div>
            </div>
            <Icon name="chevron-right" size={20}/>
          </button>

          <button onClick={()=>onEscolha("casal")}
            style={{display:"flex",alignItems:"center",gap:20,padding:"24px 28px",borderRadius:16,border:"2px solid var(--gray-200)",background:"white",cursor:"pointer",textAlign:"left",transition:"all .2s",width:"100%"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#e879f9";e.currentTarget.style.background="#fdf4ff";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--gray-200)";e.currentTarget.style.background="white";}}>
            <div style={{width:56,height:56,borderRadius:16,background:"#fce7f3",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Icon name="heart" size={28}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text)",marginBottom:4}}>
                Terapia de Casal
              </div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>
                {parceiro ? `Com ${parceiro.nome.split(" ")[0]}` : "Espaço do casal"} — check-ins, etapas e metas
              </div>
            </div>
            <Icon name="chevron-right" size={20}/>
          </button>
        </div>

        <div style={{textAlign:"center",marginTop:32,fontSize:12,color:"var(--gray-400)"}}>
          Plataforma protegida · Dra. Lucia Kratz · CRP 09/20590
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  APP PRINCIPAL
// ═══════════════════════════════════════════════════════
function App() {
  const [user, setUser]   = useState(null);
  const [modo, setModo]   = useState(null);
  const [tab, setTab]     = useState(null);
  const notifProps = useBotaoNotificacao(user);

  function handleLogin(u) {
    setUser(u);
    if (u.tipo==="aluno") setTab("painel-aluno");
  }

  function handleEscolha(m) {
    setModo(m);
    setTab(m==="casal" ? "inicio-casal" : "painel");
  }

  function handleLogout() { setUser(null); setModo(null); setTab(null); }

  if (!user) return <Login onLogin={handleLogin}/>;

  if (user.tipo === "aluno") {
    return (
      <div>
        <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} modo="aluno" notifProps={notifProps}/>
        <div className="header-mobile">
          <div className="header-mobile-logo">Meu Espaço</div>
          <button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button>
        </div>
        <div className="main-content">
          {tab==="painel-aluno"      && <PainelAluno user={user}/>}
          {tab==="ferramentas-aluno" && <EmBreve titulo="Ferramentas Clínicas" sub="Recursos de supervisão."/>}
          {tab==="relatorios-aluno"  && <EmBreve titulo="Relatórios de Supervisão" sub="Em construção."/>}
        </div>
        <div className="nav-mobile">
          {NAV_ALUNO.slice(0,5).map(item=>(
            <button key={item.id} className={`nav-mobile-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
              <Icon name={item.icon} size={20}/><span>{item.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Paciente — mostra seletor se ainda não escolheu
  if (user.tipo === "paciente" && !modo) {
    return <SeletorModo user={user} onEscolha={handleEscolha}/>;
  }

  const eCasal = modo === "casal";
  const navBase = eCasal ? NAV_CASAL : NAV_INDIVIDUAL;

  function navFiltradoCasal(nav, user) {
    const mod5 = user.modulosConfig?.mod5;
    // Se mod5 não existe ou não está ativo, mostra só Início e Minha Conta
    if (!mod5?.ativo) return nav.filter(i => ["inicio-casal","minha-conta"].includes(i.id));
    const ferrAtivas = mod5.ferramentas || {};
    // etapas habilitadas = ferramentas do mod5 que têm ativo:true
    // O id da ferramenta é o id do doc em clinica_casais_etapas (ex: "etapa1-casal")
    return nav.filter(item => {
      if (["inicio-casal","minha-conta"].includes(item.id)) return true;
      // diagnostico-casal não está em clinica_casais_etapas, sempre visível se mod5 ativo
      if (item.id === "diagnostico-casal") return true;
      return !!ferrAtivas[item.id];
    });
  }

  const navFinal = eCasal ? navFiltradoCasal(navBase, user) : navFiltradoPaciente(navBase, user);
  const navMobile = navFinal.slice(0,5);

  return (
    <div>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} modo={modo}
        notifProps={notifProps}
        onTrocarModo={user.casalId && (user.modulosAtivos||[]).length>0 ? ()=>{setModo(null);setTab(null);} : null}/>

      <div className="header-mobile">
        <div className="header-mobile-logo">{eCasal?"Terapia de Casal":"Meu Espaço"}</div>
        <button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button>
      </div>

      <div className="main-content">
        {/* INDIVIDUAL */}
        {!eCasal&&tab==="painel"        &&<PainelIndividual user={user} setTab={setTab}/>}
        {!eCasal&&tab==="humor"         &&<RegistroHumor user={user}/>}
        {!eCasal&&tab==="pensamentos"   &&<EmBreve titulo="Pensamentos Automáticos" sub="Registre e questione seus pensamentos — TCC."/>}
        {!eCasal&&tab==="diario"        &&<EmBreve titulo="Diário Terapêutico" sub="Escreva sobre o seu dia."/>}
        {!eCasal&&tab==="metas"         &&<EmBreve titulo="Minhas Metas" sub="Defina e acompanhe seus objetivos."/>}
        {!eCasal&&tab==="ferramentas"   &&<EmBreve titulo="Ferramentas Clínicas" sub="Recursos terapêuticos."/>}
        {!eCasal&&tab==="fabulas"       &&<EmBreve titulo="Fábulas Terapêuticas" sub="Histórias reflexivas."/>}
        {!eCasal&&tab==="reflexoes"     &&<EmBreve titulo="Reflexões Cognitivas" sub="Exercícios de insight."/>}
        {!eCasal&&tab==="ansiedade"     &&<EmBreve titulo="Gestão da Ansiedade" sub="Tracking de estresse, pensamentos e roda da vida."/>}
        {!eCasal&&tab==="musicoterapia" &&<EmBreve titulo="Musicoterapia" sub="Recursos de musicoterapia clínica."/>}
        {!eCasal&&tab==="meus-laudos"   &&<EmBreve titulo="Meus Laudos"/>}
        {!eCasal&&tab==="minha-conta"   &&<EmBreve titulo="Minha Conta"/>}

        {/* CASAL */}
        {eCasal&&tab==="inicio-casal"      &&<PainelCasal user={user}/>}
        {eCasal&&tab==="diagnostico-casal" &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[0]}/>}
        {eCasal&&tab==="etapa1-casal"      &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[1]}/>}
        {eCasal&&tab==="etapa2-casal"      &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[2]}/>}
        {eCasal&&tab==="etapa3-casal"      &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[3]}/>}
        {eCasal&&tab==="etapa4-casal"      &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[4]}/>}
        {eCasal&&tab==="minha-conta"       &&<EmBreve titulo="Minha Conta"/>}
      </div>

      <div className="nav-mobile">
        {navMobile.map(item=>(
          <button key={item.id} className={`nav-mobile-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
            <Icon name={item.icon} size={20}/><span>{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
