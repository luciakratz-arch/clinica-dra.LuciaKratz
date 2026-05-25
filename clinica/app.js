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

// mapa tab → id do módulo no Firebase
const MAPA_MODULOS = {
  humor:"humor", pensamentos:"tcc", diario:"diario", metas:"metas",
  ferramentas:"ferramentas", fabulas:"fabulas", reflexoes:"reflexoes",
  ansiedade:"ansiedade", musicoterapia:"musicoterapia",
  "arvore-decisao":"arvore_decisao", "entrevista":"entrevista_inicial",
  "anamnese":"anamnese", "rastreamento":"rastreamento_alimentar"
};

function navFiltradoPaciente(nav, user) {
  return nav.filter(item => {
    if (["painel","minha-conta","meus-laudos"].includes(item.id)) return true;
    const modulos = user.modulosAtivos || [];
    const chave = MAPA_MODULOS[item.id] || item.id;
    // aceita tanto a chave mapeada quanto o id direto
    return modulos.includes(chave) || modulos.includes(item.id);
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
//  PAINEL CASAL
// ═══════════════════════════════════════════════════════
function PainelCasal({ user }) {
  const [parceiro, setParceiro]           = useState(null);
  const [checkin, setCheckin]             = useState(null);
  const [metas, setMetas]                 = useState([]);
  const [metasParceiro, setMetasParceiro] = useState([]);

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
      </div>

      {/* Check-in semanal */}
      <div style={{background:"linear-gradient(135deg,#7B00C4,#b040e0)",borderRadius:16,padding:24,marginBottom:16,color:"white"}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:1,opacity:0.8,marginBottom:8}}>CHECK-IN SEMANAL</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,marginBottom:4}}>Como foi a semana de vocês?</div>
        <div style={{fontSize:13,opacity:0.75,marginBottom:16}}>Semana {getSemana()}</div>
        <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,height:6,marginBottom:8}}>
          <div style={{width:checkin?"100%":"0%",height:"100%",background:"white",borderRadius:8}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:checkin?0:12}}>
          <span style={{fontSize:13,opacity:0.8}}>{checkin?"Respondido ✓":"Ainda não respondido"}</span>
          <span style={{fontSize:13,fontWeight:600}}>{checkin?"100%":"0%"}</span>
        </div>
        {!checkin && (
          <button style={{marginTop:8,background:"white",color:"var(--purple)",border:"none",borderRadius:20,padding:"8px 20px",fontWeight:600,fontSize:13,cursor:"pointer"}}>
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
  const navFinal = !eCasal ? navFiltradoPaciente(navBase, user) : navBase;
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
        {eCasal&&tab==="diagnostico-casal" &&<EmBreve titulo="Diagnóstico Inicial"/>}
        {eCasal&&tab==="etapa1-casal"      &&<EmBreve titulo="Etapa 1 — Reconexão"/>}
        {eCasal&&tab==="etapa2-casal"      &&<EmBreve titulo="Etapa 2 — Identidade"/>}
        {eCasal&&tab==="etapa3-casal"      &&<EmBreve titulo="Etapa 3 — Cognição"/>}
        {eCasal&&tab==="etapa4-casal"      &&<EmBreve titulo="Etapa 4 — Reestruturação"/>}
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
