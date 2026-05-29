// ═══════════════════════════════════════════════════════
//  ÁREA ADMINISTRATIVA — DRA. LUCIA KRATZ  
//  app.js — Etapa 2: Cadastro completo de pacientes
// ═══════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useRef } = React;

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
const SENHA_ADMIN = "1234";
const SENHA_PAULO = "1234";
const SITE_URL = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";

const PERFIS = [
  { id:"psicologa",  nome:"Sou Psicologa",  desc:"Acesso ao painel clinico completo", icon:"stethoscope", cor:"#7B00C4" },
  { id:"secretaria", nome:"Sou Secretaria",  desc:"Cadastro de pacientes e financeiro da clinica", icon:"clipboard-list", cor:"#0891b2" },
  { id:"paulo",      nome:"Paulo Sergio",    desc:"Visualizacao do financeiro familiar", icon:"wallet", cor:"#16a34a" },
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
  ]},
  { grupo:"💰 Financeiro", itens:[
    {id:"fin-clinica", label:"Fin. Clínica",   icon:"dollar-sign"},
    {id:"comissoes",   label:"Comissões",      icon:"percent"},
    {id:"fin-pessoal", label:"Fin. Pessoal",   icon:"home"},
  ]},
  { grupo:"⚙️ Configurações", itens:[
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
const NAV_PAULO = [{id:"fin-pessoal", label:"Financeiro Familiar", icon:"home"}];

// SIDEBAR
function Sidebar({ user, tab, setTab, onLogout, notifProps }) {
  const isPsicologa = user.tipo==="psicologa";
  const titulo = user.tipo==="secretaria"?"Area da Secretaria":user.tipo==="paulo"?"Financeiro Familiar":user.tipo==="marketing"?"Marketing":"Area Administrativa";
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
  { id:"humor",    nome:"Registro de Humor",        desc:"Escala de humor diária" },
  { id:"diario",   nome:"Diário Terapêutico",        desc:"Escrita reflexiva livre" },
  { id:"metas",    nome:"Metas Terapêuticas",        desc:"Acompanhamento de metas" },
  { id:"reflexoes",nome:"Reflexões Cognitivas",      desc:"Reestruturação cognitiva" },
  { id:"tcc",      nome:"Pensamentos Automáticos",   desc:"Registro TCC" },
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
    const ferrNova = ferrAtual[ferrId] ? null : { ativo: true, dataInicio: hoje };
    const novaFerr = { ...ferrAtual };
    if (ferrNova) novaFerr[ferrId] = ferrNova;
    else delete novaFerr[ferrId];
    salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: novaFerr } });
  }

  function setDataInicio(modId, ferrId, data) {
    const modAtual = config[modId] || { ativo: true, ferramentas: {} };
    const ferrAtual = modAtual.ferramentas || {};
    salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: { ...ferrAtual, [ferrId]: { ...(ferrAtual[ferrId]||{}), dataInicio: data } } } });
  }

  const MODULOS_DEF = [
    { id:"mod1", nome:"Módulo I — Dashboard", desc:"Ferramentas do dia a dia", icone:"🧠", ferramentas: FERRAMENTAS_MOD1 },
    { id:"mod2", nome:"Módulo II — Fábulas Terapêuticas", desc:"Fábulas cadastradas em Recursos", icone:"📖", ferramentas: fabulas.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.categoria||""})) },
    { id:"mod3", nome:"Módulo III — Ferramentas", desc:"Ferramentas cadastradas em Recursos", icone:"🔧", ferramentas: recursos.filter(r=>r.categoria!=="musicoterapia"&&r.categoria!=="casal").map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.categoria||""})) },
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
      ferramentas: psicoeducacao.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.categoria||""})) },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {MODULOS_DEF.map(mod => {
        const modConfig = config[mod.id] || {};
        const ativo = !!modConfig.ativo;
        const ferramentas = modConfig.ferramentas || {};
        return (
          <div key={mod.id} style={{background:"white",borderRadius:14,border:`2px solid ${ativo?"var(--purple)":"var(--gray-200)"}`,overflow:"hidden",transition:"border-color .2s"}}>
            {/* Cabeçalho do módulo */}
            <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:ativo?"var(--purple-bg)":"white"}}>
              <div style={{fontSize:24}}>{mod.icone}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:"var(--text)"}}>{mod.nome}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{mod.desc}</div>
              </div>
              {mod.automatico ? (
                <span style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic"}}>automático</span>
              ) : (
                <Toggle ativo={ativo} onClick={()=>toggleModulo(mod.id)}/>
              )}
            </div>

            {/* Ferramentas do módulo */}
            {ativo && !mod.automatico && (
              <div style={{borderTop:"1px solid var(--gray-100)",padding:"12px 20px",background:"#fafafa"}}>
                {mod.ferramentas.length === 0 ? (
                  <div style={{fontSize:13,color:"var(--text-muted)",padding:"8px 0"}}>
                    Nenhuma ferramenta cadastrada neste módulo ainda.
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>FERRAMENTAS DISPONÍVEIS</div>
                    {mod.ferramentas.map(ferr => {
                      const ferrConfig = ferramentas[ferr.id];
                      const ferrAtiva = !!ferrConfig;
                      return (
                        <div key={ferr.id} style={{background:"white",borderRadius:10,border:`1.5px solid ${ferrAtiva?"var(--purple)":"var(--gray-200)"}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,transition:"border-color .2s"}}>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:500,fontSize:13}}>{ferr.nome}</div>
                            {ferr.desc && <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{ferr.desc}</div>}
                          </div>
                          {ferrAtiva && (
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <label style={{fontSize:11,color:"var(--text-muted)"}}>Início:</label>
                              <input type="date" value={ferrConfig.dataInicio||""} onChange={e=>setDataInicio(mod.id,ferr.id,e.target.value)}
                                style={{fontSize:12,border:"1px solid var(--gray-200)",borderRadius:6,padding:"3px 6px",fontFamily:"var(--font-body)"}}/>
                            </div>
                          )}
                          <Toggle ativo={ferrAtiva} onClick={()=>toggleFerramenta(mod.id,ferr.id)}/>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
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
function AbaMetas({ paciente }) {
  const [metas, setMetas] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({titulo:"",categoria:"Emocional",progresso:0});

  useEffect(()=>{
    const unsub = db.collection("clinica_pacientes").doc(paciente.id).collection("metas").onSnapshot(snap=>{
      setMetas(snap.docs.map(d=>({id:d.id,...d.data()})));
    },()=>{});
    return unsub;
  },[paciente.id]);

  async function salvar() {
    if(!form.titulo){alert("Titulo obrigatorio.");return;}
    await db.collection("clinica_pacientes").doc(paciente.id).collection("metas").add({...form,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    setModal(false); setForm({titulo:"",categoria:"Emocional",progresso:0});
  }
  async function excluir(id){if(!confirm("Excluir meta?"))return;await db.collection("clinica_pacientes").doc(paciente.id).collection("metas").doc(id).delete();}
  async function atualizarProgresso(id,val){await db.collection("clinica_pacientes").doc(paciente.id).collection("metas").doc(id).update({progresso:val});}

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontWeight:600}}>Metas Terapeuticas</div>
        <button className="btn btn-purple" onClick={()=>setModal(true)}><Icon name="plus" size={16}/> Nova Meta</button>
      </div>
      {metas.length===0?(
        <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}><Icon name="target" size={40}/><div style={{marginTop:12}}>Nenhuma meta cadastrada.</div></div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {metas.map(m=>(
            <div key={m.id} className="card">
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div><div style={{fontWeight:500}}>{m.titulo}</div><span className="badge badge-purple" style={{marginTop:4}}>{m.categoria}</span></div>
                <button className="btn btn-ghost" style={{padding:"4px 8px"}} onClick={()=>excluir(m.id)}><Icon name="trash-2" size={14}/></button>
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
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:20}}>Nova Meta</div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Titulo da Meta</label>
              <input className="form-input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Ex: Praticar mindfulness diariamente"/>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Categoria</label>
              <select className="form-input" value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>
                {["Emocional","Saude","Pessoal","Profissional","Relacionamento","Outro"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar}>Salvar</button>
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
    return ()=>{ u1(); u2(); };
  },[paciente.id]);
  const media = humor.length?(humor.reduce((a,h)=>a+(h.valor||0),0)/humor.length).toFixed(1):"—";
  return (
    <div>
      <div className="metrics-grid" style={{marginBottom:20}}>
        {[{label:"Sessoes recentes",value:0,icon:"calendar"},{label:"Registros TCC",value:0,icon:"brain"},{label:"Entradas no diario",value:0,icon:"book-open"},{label:"Metas ativas",value:0,icon:"target"}].map(m=>(
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
function PerfilPaciente({ paciente, onVoltar, pacientes }) {
  const [aba, setAba] = useState("perfil");
  const ABAS = [
    {id:"perfil",label:"Perfil",icon:"user"},
    {id:"modulos",label:"Modulos",icon:"toggle-right"},
    {id:"metas",label:"Metas",icon:"target"},
    {id:"laudos",label:"Laudos",icon:"file-text"},
    {id:"evolucao",label:"Evolucao",icon:"trending-up"},
    {id:"casal",label:"Terapia de Casal",icon:"heart"},
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
      {aba==="metas"      &&<AbaMetas       paciente={paciente}/>}
      {aba==="laudos"     &&<EmBreve titulo="Laudos" subtitulo="Etapa 10"/>}
      {aba==="evolucao"   &&<AbaEvolucao    paciente={paciente}/>}
      {aba==="casal"      &&<AbaCasal       paciente={paciente} pacientes={pacientes}/>}
    </div>
  );
}

// LISTA PACIENTES
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
    await db.collection("clinica_pacientes").add({...form,senha:"1234",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
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
            const url=window.location.origin+window.location.pathname.replace("admin/index.html","").replace("admin/","")+"clinica/cadastro.html";
            navigator.clipboard.writeText(url).then(()=>alert("Link copiado!\n\n"+url)).catch(()=>prompt("Copie o link:",url));
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
      {["ativo","alta","inativo"].map(st=>{
        const grupo=filtrados.filter(p=>p.status===st);
        if(grupo.length===0)return null;
        return(
          <div key={st} style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:st==="ativo"?"var(--success)":st==="alta"?"var(--gray-400)":"var(--danger)"}}/>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.8px"}}>
                {st==="ativo"?"Em Atendimento":st==="alta"?"Alta":"Inativos"} ({grupo.length})
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
    if(!novaData)return;
    // Manter pagamento/forma/data ao remarcar — só muda data e status
    await db.collection("clinica_sessoes").doc(s.id).update({
      data:novaData, status:"agendado", remarcada:true,
      dataRemarcada:novaData, dataOriginal:s.dataOriginal||s.data
      // pagamento, formaPagamento e dataPagamento NÃO são alterados
    });
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
    if(pago){
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
        <button style={{background:"rgba(255,255,255,0.2)",border:"none",cursor:"pointer",color:"white",padding:"6px 14px",borderRadius:8,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}} onClick={()=>window.print()}>
          <Icon name="printer" size={15}/> Imprimir
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
            {new Date(m+"-01").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"})}
          </button>
        ))}
      </div>

      {/* Accordion por mês */}
      {mesesFiltrados.map(mes=>{
        const sessMes = porMes[mes]||[];
        const mesLabel = new Date(mes+"-01").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
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
                                <div style={{fontSize:9,color:"#0891b2",marginBottom:2}}>Nova data:</div>
                                <input type="date" defaultValue={s.dataRemarcada||""} onBlur={e=>{if(e.target.value)remarcarSessao(s,e.target.value);}}
                                  style={{fontSize:10,border:"1px solid #0891b2",borderRadius:3,padding:"1px 4px",color:"#0891b2",width:105}}/>
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

function FinanceiroClinica() {
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
  const [aba, setAba] = useState("lancamentos");
  const [buscaPac, setBuscaPac] = useState("");

  const FORMAS = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Depósito","Transferência","Outro"];
  const RECORRENCIAS = ["Semanal (1x/semana)","2x por semana","3x por semana","Quinzenal","Mensal","Sessão única"];
  const DIAS_LABEL = {0:"Dom",1:"Seg",2:"Ter",3:"Qua",4:"Qui",5:"Sex",6:"Sáb"};

  const [formAvulso, setFormAvulso] = useState({pacienteId:"",tipo:"Consulta",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pendente",obs:""});
  const [formPacote, setFormPacote] = useState({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},statusPag:"pendente",formaPag:"",dataPagamento:"",pagamentosExtras:[],obs:""});
  const [modalEditarPacote, setModalEditarPacote] = useState(null); // {pacote}
  const [formEdicaoPacote, setFormEdicaoPacote] = useState({});
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(()=>{
    const u1=db.collection("clinica_lancamentos").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(b.data||"").localeCompare(a.data||""));setLancamentos(docs);},()=>{});
    const u2=db.collection("clinica_pacotes").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));setPacotes(docs);},()=>{});
    const u3=db.collection("clinica_sessoes").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(a.data||"").localeCompare(b.data||""));setSessoes(docs);},()=>{});
    return()=>{u1();u2();u3();};
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
  const mesAtualLabel = new Date(mesCards+"-01").toLocaleDateString("pt-BR",{month:"short"});

  // Salvar lançamento avulso
  async function salvarAvulso(tipoVenda){
    if(!formAvulso.valor||!formAvulso.data){alert("Valor e data obrigatórios.");return;}
    setSalvando(true);
    const pac = pacientes.find(p=>p.id===formAvulso.pacienteId);
    const dados = {...formAvulso,valor:parseFloat(formAvulso.valor),pacienteNome:pac?.nome||""};
    if(editando){
      await db.collection("clinica_lancamentos").doc(editando).update(dados);
    } else {
      await db.collection("clinica_lancamentos").add({...dados,tipo_lancamento:"avulso",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      if(formAvulso.status==="pendente"){
        await dispararNotificacao({
          tipo:"pagamento_pendente",
          titulo:`Pagamento pendente — ${pac?.nome||"Paciente"}`,
          corpo:`R$ ${parseFloat(formAvulso.valor).toFixed(2).replace(".",",")} · ${formAvulso.tipo} · ${formAvulso.data?.split("-").reverse().join("/")||""}`,
          pacienteId: formAvulso.pacienteId
        });
      }
      // Registra comissão da secretária
      if(tipoVenda) await registrarComissao({ tipo:"Sessão Avulsa", valor:parseFloat(formAvulso.valor), pacienteNome:pac?.nome||"", tipoVenda });
    }
    setModal(false);setEditando(null);setFormAvulso({pacienteId:"",tipo:"Consulta",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pendente",obs:""});setSalvando(false);
  }

  function abrirEditar(l){
    setFormAvulso({pacienteId:l.pacienteId||"",tipo:l.tipo||"Consulta",valor:l.valor||"",data:l.data||"",formaPag:l.formaPag||"PIX",status:l.status||"pendente",obs:l.obs||""});
    setEditando(l.id);setModal("avulso");
  }

  async function excluirLanc(id){
    if(!confirm("Excluir lançamento?"))return;
    await db.collection("clinica_lancamentos").doc(id).delete();
  }

  // Marcar pago — marca todas as sessões do pacote
  async function marcarPacotePago(pacoteId, formaPag){
    const sessPac = sessoes.filter(s=>s.pacoteId===pacoteId);
    const batch = db.batch();
    sessPac.forEach(s=>{
      batch.update(db.collection("clinica_sessoes").doc(s.id),{pagamento:"pago",formaPagamento:formaPag,dataPagamento:new Date().toISOString().slice(0,10)});
    });
    // Atualiza lançamento do pacote
    const lancPacote = lancamentos.find(l=>l.pacoteId===pacoteId);
    if(lancPacote){
      batch.update(db.collection("clinica_lancamentos").doc(lancPacote.id),{status:"recebido",formaPag,dataPagamento:new Date().toISOString().slice(0,10)});
    }
    await batch.commit();
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

  async function registrarComissao({ tipo, valor, pacienteNome, tipoVenda }) {
    const perc = tipoVenda === "primeira" ? 0.10 : 0.05;
    const valorComissao = parseFloat((valor * perc).toFixed(2));
    const hoje = new Date();
    const mesRef = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}`;
    await db.collection("clinica_comissoes").add({
      tipo, tipoVenda, perc: perc*100,
      valorBase: valor, valorComissao,
      pacienteNome, mesRef,
      status: "pendente",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function salvarPacote(tipoVenda){
    const {pacienteId,totalSessoes,valorSessao,recorrencia,dataInicio,horario,diasSemana,horariosPorDia,obs}=formPacote;
    if(!pacienteId||!totalSessoes||!dataInicio){alert("Paciente, nº de sessões e data de início obrigatórios.");return;}
    const needDias=["2x por semana","3x por semana"].includes(recorrencia);
    if(needDias&&(!diasSemana||diasSemana.length===0)){alert("Selecione os dias da semana.");return;}
    setSalvando(true);
    const pac=pacientes.find(p=>p.id===pacienteId);
    const total=parseInt(totalSessoes)||1;
    const vSessao=parseFloat(valorSessao)||0;
    const vTotal=vSessao*total;
    const datas=gerarDatas(dataInicio,recorrencia,total,diasSemana);

    // Cria pacote
    const pacRef=await db.collection("clinica_pacotes").add({
      pacienteId,pacienteNome:pac?.nome||"",totalSessoes:total,valorSessao:vSessao,valorTotal:vTotal,
      recorrencia,dataInicio,horario,diasSemana:diasSemana||[],horariosPorDia:horariosPorDia||{},obs,
      status:"ativo",createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });

    // Cria lançamento financeiro do pacote
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento:"pacote",pacoteId:pacRef.id,
      pacienteId,pacienteNome:pac?.nome||"",
      tipo:"Pacote "+recorrencia,
      valor:vTotal,data:dataInicio,
      formaPag:formPacote.formaPag||"",
      status:formPacote.statusPag||"pendente",
      dataPagamento:formPacote.dataPagamento||"",
      pagamentosExtras:formPacote.pagamentosExtras||[],
      obs,
      totalSessoes:total,valorSessao:vSessao,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });

    // Registra comissão da secretária
    if(tipoVenda) await registrarComissao({ tipo:"Pacote", valor:vTotal, pacienteNome:pac?.nome||"", tipoVenda });

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
    setModal(false);setFormPacote({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},statusPag:"pendente",formaPag:"",dataPagamento:"",pagamentosExtras:[],obs:""});setSalvando(false);
    alert(`✅ Pacote criado! ${datas.length} sessões geradas na agenda.`);
  }

  async function atualizarSessao(id,campos){ await db.collection("clinica_sessoes").doc(id).update(campos); }

  async function remarcarSessao(s, novaData){
    if(!novaData)return;
    // Manter pagamento/forma/data ao remarcar — só muda data e status
    await db.collection("clinica_sessoes").doc(s.id).update({
      data:novaData, status:"agendado", remarcada:true,
      dataRemarcada:novaData, dataOriginal:s.dataOriginal||s.data
      // pagamento, formaPagamento e dataPagamento NÃO são alterados
    });
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
      // Exclui lançamento do pacote também
      const lp=lancamentos.find(l=>l.pacoteId===pacoteId);
      if(lp) b.delete(db.collection("clinica_lancamentos").doc(lp.id));
      await b.commit();setPacoteSelecionado(null);
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

  // Função salvar edição do pacote
  async function salvarEdicaoPacote() {
    if(!modalEditarPacote) return;
    setSalvandoEdicao(true);
    try {
      const f = formEdicaoPacote;
      const jaPago = (f.statusPag||"pendente")==="recebido";
      // Atualiza o pacote
      await db.collection("clinica_pacotes").doc(modalEditarPacote.id).update({
        totalSessoes: parseInt(f.totalSessoes)||modalEditarPacote.totalSessoes,
        valorSessao: parseFloat(f.valorSessao)||modalEditarPacote.valorSessao,
        recorrencia: f.recorrencia,
        dataInicio: f.dataInicio,
        horario: f.horario,
        statusPag: f.statusPag,
        formaPag: f.formaPag||"",
        dataPagamento: jaPago?(f.dataPagamento||new Date().toISOString().slice(0,10)):"",
        pagamentosExtras: f.pagamentosExtras||[],
        obs: f.obs||"",
      });
      // Se marcado como recebido, herda pagamento nas sessões
      if(jaPago){
        const sessDoPacote = sessoes.filter(s=>s.pacoteId===modalEditarPacote.id);
        const batch = db.batch();
        sessDoPacote.forEach(s=>{
          batch.update(db.collection("clinica_sessoes").doc(s.id),{
            pagamento:"pago",
            formaPagamento: f.formaPag||s.formaPagamento||"",
            dataPagamento: f.dataPagamento||s.dataPagamento||new Date().toISOString().slice(0,10),
          });
        });
        await batch.commit();
      }
      alert("✓ Pacote atualizado com sucesso!");
      setModalEditarPacote(null);
    } catch(e){ alert("Erro: "+e.message); }
    setSalvandoEdicao(false);
  }

  // Métricas
  const totalRecebido=lancamentos.filter(l=>l.status==="recebido").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  return(
    <div>
      {/* ── Modal Editar Pacote ── */}
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
        <button className="btn btn-purple" onClick={()=>setModal("escolha")}><Icon name="plus" size={16}/> Novo Lançamento</button>
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
          <div style={{fontSize:12,color:"#0891b2",fontWeight:500,marginTop:2}}>Lançamentos ({periodoCard==="mes"?new Date(mesFiltro+"-01").toLocaleDateString("pt-BR",{month:"short"}):anoFiltro})</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid var(--gray-200)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",flexShrink:0}}>
        {[["lancamentos","Lançamentos","dollar-sign"],["pacotes","Pacotes & Sessões","package"],["acompanhamento","Acompanhamento Geral","users"]].map(([id,lbl,ic])=>(
          <button key={id} onClick={()=>setAba(id)} style={{padding:"10px 20px",border:"none",background:"none",cursor:"pointer",fontSize:14,color:aba===id?"var(--purple)":"var(--gray-600)",borderBottom:aba===id?"2px solid var(--purple)":"2px solid transparent",fontWeight:aba===id?600:400,fontFamily:"var(--font-body)",marginBottom:-1,display:"flex",alignItems:"center",gap:6}}>
            <Icon name={ic} size={15}/>{lbl}
          </button>
        ))}
      </div>

      {/* ABA LANÇAMENTOS */}
      {aba==="lancamentos"&&(
        <div>
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
                    {new Date(m+"-01").toLocaleDateString("pt-BR",{month:"long"})}
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
              <div style={{marginTop:12}}>Nenhum lançamento em {new Date(mesFiltro+"-01").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</div>
            </div>
          ):(()=>{
            const receitas = lancMes.filter(l=>l.tipo_lancamento!=="despesa");
            const despesas = lancMes.filter(l=>l.tipo_lancamento==="despesa");
            const totalRec = calcReceitas(lancMes);
            const totalDesp = calcDespesas(lancMes);
            const saldo = totalRec - totalDesp;

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
                            <td style={{padding:"8px 14px"}}>
                              {l.tipo||l.pacienteNome||"—"}
                              {l.tipo_lancamento==="pacote"&&<span style={{marginLeft:6,background:"var(--purple-soft)",color:"var(--purple)",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:600}}>Pacote</span>}
                              {l.tipo_lancamento==="sessao"&&<span style={{marginLeft:6,background:"#e0f2fe",color:"#0891b2",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:600}}>Sessão</span>}
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
                    const chave = modalExcluirLanc.descricaoRecorrente||modalExcluirLanc.tipo;
                    const snap = await db.collection("clinica_lancamentos").get();
                    const futuros = snap.docs.filter(d=>{
                      const dd=d.data();
                      return (dd.descricaoRecorrente===chave||dd.tipo===chave)&&dd.data>=modalExcluirLanc.data;
                    });
                    const b=db.batch();futuros.forEach(d=>b.delete(d.ref));await b.commit();
                    setModalExcluirLanc(null);
                  }}>
                    <div style={{fontWeight:600,fontSize:13,color:"#d97706"}}>Este e todos os futuros</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>Remove "{modalExcluirLanc.tipo}" a partir de {new Date(modalExcluirLanc.data+"T00:00:00").toLocaleDateString("pt-BR",{month:"long"})}</div>
                  </button>
                  <button className="btn btn-ghost" style={{border:"1.5px solid #fca5a5",textAlign:"left",padding:"12px 16px"}} onClick={async()=>{
                    const chave = modalExcluirLanc.descricaoRecorrente||modalExcluirLanc.tipo;
                    const snap = await db.collection("clinica_lancamentos").get();
                    const todos = snap.docs.filter(d=>{
                      const dd=d.data();
                      return dd.descricaoRecorrente===chave||dd.tipo===chave;
                    });
                    const b=db.batch();todos.forEach(d=>b.delete(d.ref));await b.commit();
                    setModalExcluirLanc(null);
                  }}>
                    <div style={{fontWeight:600,fontSize:13,color:"#dc2626"}}>Todos — o ano inteiro</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>Remove todos os meses de "{modalExcluirLanc.tipo}"</div>
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
          {pacotes.length===0?(
            <div className="card" style={{textAlign:"center",padding:60}}>
              <Icon name="package" size={48}/>
              <div style={{marginTop:12,fontWeight:500}}>Nenhum pacote criado ainda</div>
              <button className="btn btn-purple" style={{marginTop:16}} onClick={()=>setModal("pacote")}>+ Criar Pacote</button>
            </div>
          ):(()=>{
            // Agrupar pacotes por paciente
            const pacientesComPacote = [...new Set(pacotes.map(p=>p.pacienteId))];
            const pacientesVisiveis = buscaPac.trim()
              ? pacientesComPacote.filter(id=>{
                  const pac = pacientes.find(p=>p.id===id);
                  const inicial = (pac?.nome||"?")[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
                  return inicial === buscaPac;
                })
              : pacientesComPacote;
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
                                <button className="btn btn-ghost" style={{fontSize:12,padding:"6px 12px",color:"#dc2626",marginLeft:"auto"}}
                                  onClick={async e=>{e.stopPropagation();
                                    if(!confirm("Excluir pacote e todas as sessões?"))return;
                                    const todas=sessoes.filter(s=>s.pacoteId===p.id);
                                    const b=db.batch();
                                    todas.forEach(s=>b.delete(db.collection("clinica_sessoes").doc(s.id)));
                                    b.delete(db.collection("clinica_pacotes").doc(p.id));
                                    lancsPac.forEach(l=>b.delete(db.collection("clinica_lancamentos").doc(l.id)));
                                    await b.commit();
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
            const realizadas = sessPac.filter(s=>s.status==="realizado").length;
            const pagas = sessPac.filter(s=>s.pagamento==="pago").length;
            const pendentes = sessPac.filter(s=>s.pagamento!=="pago"&&s.status!=="cancelado").length;
            const recebido = sessPac.filter(s=>s.pagamento==="pago").reduce((a,s)=>a+(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0),0);
            const aReceber = sessPac.filter(s=>s.pagamento!=="pago"&&s.status!=="cancelado").reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0);
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

      {/* MODAL ESCOLHA */}
      {modal==="escolha"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:32,width:"100%",maxWidth:420,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>Novo Lançamento</div>
            <p style={{fontSize:13,color:"#6b7280",marginBottom:24}}>O que deseja lançar?</p>
            <div style={{display:"flex",gap:12}}>
              <button className="btn btn-outline" style={{flex:1,padding:"20px 12px",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}
                onClick={()=>setModal("pacote")}>
                <span style={{fontSize:32}}>📦</span>
                <strong>Pacote de Sessões</strong>
                <span style={{fontSize:11,color:"#6b7280",lineHeight:1.4}}>Gera sessões recorrentes na agenda com ficha de frequência</span>
              </button>
              <button className="btn btn-outline" style={{flex:1,padding:"20px 12px",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}
                onClick={()=>setModal("avulso")}>
                <span style={{fontSize:32}}>💲</span>
                <strong>Lançamento Avulso</strong>
                <span style={{fontSize:11,color:"#6b7280",lineHeight:1.4}}>Sessão única, avaliação, outro serviço isolado</span>
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
                <div className="form-group"><label className="form-label">Valor por Sessão (R$)</label>
                  <input className="form-input" type="number" placeholder="Ex: 250" value={formPacote.valorSessao} onChange={e=>setFormPacote({...formPacote,valorSessao:e.target.value})}/>
                </div>
                <div className="form-group"><label className="form-label">Total do Pacote (R$)</label>
                  <input className="form-input" type="number" placeholder="Automático" value={formPacote.valorSessao&&formPacote.totalSessoes?(parseFloat(formPacote.valorSessao)||0)*(parseInt(formPacote.totalSessoes)||0):""} readOnly style={{background:"#f9fafb"}}/>
                </div>
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

function FinanceiroPessoal({ somenteLeitura=false }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [recorrentes, setRecorrentes] = useState([]);
  const [categorias, setCategorias]   = useState([]);
  const [anoFiltro, setAnoFiltro]     = useState(new Date().getFullYear()+"");
  const [mesFiltro, setMesFiltro]     = useState(new Date().toISOString().slice(0,7));
  const [modal, setModal]             = useState(false);
  const [editando, setEditando]       = useState(null);
  const [salvando, setSalvando]       = useState(false);
  const [novaCategoria, setNovaCategoria] = useState({nome:"",tipo:"despesa"});
  const [modalBaixa, setModalBaixa]   = useState(null); // recorrente para dar baixa
  const [formBaixa, setFormBaixa]     = useState({valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",modo:"este"});
  const mesAtual = new Date().toISOString().slice(0,7);

  const CATS_RECEITA_DEFAULT = ["Salário/Pró-labore","Consultoria","Aluguel Recebido","Investimentos","Dividendos","Freelance","Outros"];
  const CATS_DESPESA_DEFAULT = ["Aluguel","Condomínio","Alimentação","Saúde","Educação","Transporte","Lazer","Assinaturas","Cartão de Crédito","Empréstimo/Financiamento","Contador","Impostos","Marketing","Ferramentas de IA","Telefone/Internet","Energia/Água","Vestuário","Viagem","Outros"];
  const FORMAS  = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Depósito","Transferência","Débito Automático","Outro"];
  const RECORR  = ["Mensal","Semanal","Quinzenal","Bimestral","Trimestral","Semestral","Anual"];

  const catsReceita = [...CATS_RECEITA_DEFAULT,...categorias.filter(c=>c.tipo==="receita").map(c=>c.nome)];
  const catsDespesa = [...CATS_DESPESA_DEFAULT,...categorias.filter(c=>c.tipo==="despesa").map(c=>c.nome)];

  const [formAvulso, setFormAvulso] = useState({tipo:"despesa",categoria:"",descricao:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:""});
  const [formRecorr, setFormRecorr] = useState({tipo:"despesa",categoria:"",descricao:"",valorPrevisto:"",recorrencia:"Mensal",diaVencimento:"10",mesInicio:new Date().toISOString().slice(0,7),ativo:true});

  useEffect(()=>{
    const u1=db.collection("clinica_financeiro_pessoal").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(b.data||"").localeCompare(a.data||""));setLancamentos(docs);},()=>{});
    const u2=db.collection("clinica_fin_pessoal_recorrentes").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));setRecorrentes(docs);},()=>{});
    const u3=db.collection("clinica_fin_pessoal_categorias").onSnapshot(s=>setCategorias(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return()=>{u1();u2();u3();};
  },[]);

  const anoAtualNum = new Date().getFullYear();
  const anosExist   = [...new Set(lancamentos.map(l=>l.data?.slice(0,4)).filter(Boolean))].map(Number);
  const anosSet     = new Set([...anosExist, anoAtualNum-1, anoAtualNum, anoAtualNum+1]);
  const anos        = [...anosSet].sort().map(String);
  const mesesDisp   = Array.from({length:12},(_,i)=>`${anoFiltro}-${String(i+1).padStart(2,"0")}`);
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro)?mesFiltro:mesAtual.startsWith(anoFiltro)?mesAtual:anoFiltro+"-01";

  const lancMes = lancamentos.filter(l=>l.data?.startsWith(mesFiltroEfetivo));
  const lancAno = lancamentos.filter(l=>l.data?.startsWith(anoFiltro));

  function fmt(v){ return (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
  function mesLabel(m){ try{ return new Date(m+"-02").toLocaleDateString("pt-BR",{month:"short"}); }catch(e){ return m; } }
  function calcRec(l){ return l.filter(x=>x.tipo==="receita"&&(x.status==="pago"||x.status==="recebido")).reduce((a,x)=>a+(parseFloat(x.valor)||0),0); }
  function calcDesp(l){ return l.filter(x=>x.tipo==="despesa"&&(x.status==="pago"||x.status==="recebido")).reduce((a,x)=>a+(parseFloat(x.valor)||0),0); }

  const recMes=calcRec(lancMes), despMes=calcDesp(lancMes), saldoMes=recMes-despMes;
  const recAno=calcRec(lancAno), despAno=calcDesp(lancAno);
  const pendMes=lancMes.filter(l=>l.status==="pendente").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  const corTipo=t=>t==="receita"?"#059669":"#dc2626";
  const bgTipo=t=>t==="receita"?"#d1fae5":"#fee2e2";

  // Recorrentes ativos com baixa já registrada neste mês
  const recorrAtivos = recorrentes.filter(r=>r.ativo!==false);
  function jaDeuBaixaMes(r){
    return lancamentos.some(l=>l.recorrenteId===r.id && l.data?.startsWith(mesFiltroEfetivo));
  }

  async function salvarAvulso(){
    if(!formAvulso.valor||!formAvulso.data){alert("Valor e data obrigatórios.");return;}
    setSalvando(true);
    const dados={...formAvulso,valor:parseFloat(formAvulso.valor),createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    if(editando){ await db.collection("clinica_financeiro_pessoal").doc(editando).update(dados); }
    else { await db.collection("clinica_financeiro_pessoal").add(dados); }
    setModal(false);setEditando(null);
    setFormAvulso({tipo:"despesa",categoria:"",descricao:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:""});
    setSalvando(false);
  }

  async function salvarRecorrente(){
    if(!formRecorr.categoria||!formRecorr.valorPrevisto){alert("Categoria e valor obrigatórios.");return;}
    setSalvando(true);
    const dados={...formRecorr,valorPrevisto:parseFloat(formRecorr.valorPrevisto),createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    if(editando){ await db.collection("clinica_fin_pessoal_recorrentes").doc(editando).update(dados); }
    else { await db.collection("clinica_fin_pessoal_recorrentes").add(dados); }
    setModal(false);setEditando(null);
    setFormRecorr({tipo:"despesa",categoria:"",descricao:"",valorPrevisto:"",recorrencia:"Mensal",diaVencimento:"10",mesInicio:new Date().toISOString().slice(0,7),ativo:true});
    setSalvando(false);
  }

  // Dar baixa — este mês ou este e os próximos (até dez)
  async function confirmarBaixa(){
    if(!formBaixa.valor){alert("Digite o valor.");return;}
    setSalvando(true);
    const r = modalBaixa;
    const batch = db.batch();

    if(formBaixa.modo==="este"){
      // Só este mês
      const dia = r.diaVencimento||"10";
      const data = `${mesFiltroEfetivo}-${String(dia).padStart(2,"0")}`;
      const ref = db.collection("clinica_financeiro_pessoal").doc();
      batch.set(ref,{
        tipo:r.tipo,categoria:r.categoria,descricao:r.descricao||r.categoria,
        valor:parseFloat(formBaixa.valor),data,formaPag:formBaixa.formaPag,
        status:"pago",recorrenteId:r.id,obs:"",
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Este e os próximos até dezembro do ano atual
      const [anoMes, mesMes] = mesFiltroEfetivo.split("-").map(Number);
      for(let m=mesMes; m<=12; m++){
        const mesStr = `${anoMes}-${String(m).padStart(2,"0")}`;
        const dia = r.diaVencimento||"10";
        const data = `${mesStr}-${String(dia).padStart(2,"0")}`;
        // Não duplicar se já existe baixa neste mês
        const jaExiste = lancamentos.some(l=>l.recorrenteId===r.id&&l.data?.startsWith(mesStr));
        if(!jaExiste){
          const ref = db.collection("clinica_financeiro_pessoal").doc();
          batch.set(ref,{
            tipo:r.tipo,categoria:r.categoria,descricao:r.descricao||r.categoria,
            valor:parseFloat(formBaixa.valor),data,formaPag:formBaixa.formaPag,
            status:"pago",recorrenteId:r.id,obs:"Baixa automática — série",
            createdAt:firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
    await batch.commit();
    setModalBaixa(null);
    setFormBaixa({valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",modo:"este"});
    setSalvando(false);
  }

  async function excluir(id){ if(!confirm("Excluir lançamento?"))return; await db.collection("clinica_financeiro_pessoal").doc(id).delete(); }
  async function excluirRec(id){ if(!confirm("Excluir recorrente?"))return; await db.collection("clinica_fin_pessoal_recorrentes").doc(id).delete(); }
  async function salvarCategoria(){
    if(!novaCategoria.nome.trim()){alert("Digite o nome.");return;}
    await db.collection("clinica_fin_pessoal_categorias").add({...novaCategoria,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    setNovaCategoria({nome:"",tipo:"despesa"});
  }
  async function excluirCategoria(id){ if(!confirm("Excluir?"))return; await db.collection("clinica_fin_pessoal_categorias").doc(id).delete(); }

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <div className="page-title">Financeiro Pessoal</div>
          <div className="page-subtitle">{somenteLeitura?"Visualização — Paulo Sergio":"Gestão financeira pessoal e familiar"}</div>
        </div>
        {!somenteLeitura&&(
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="btn btn-ghost" onClick={()=>setModal("categoria")}><Icon name="tag" size={15}/> Categorias</button>
            <button className="btn btn-outline" onClick={()=>{setModal("recorrente");setEditando(null);}}><Icon name="repeat" size={15}/> + Recorrente</button>
            <button className="btn btn-purple" onClick={()=>{setModal("avulso");setEditando(null);}}><Icon name="plus" size={15}/> + Lançamento</button>
          </div>
        )}
      </div>

      {/* Seletor Ano */}
      <div style={{display:"flex",gap:6,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",flexShrink:0}}>Ano:</span>
        {anos.map(a=>(
          <button key={a} onClick={()=>{setAnoFiltro(a);setMesFiltro(a===String(anoAtualNum)?mesAtual:a+"-01");}}
            style={{padding:"5px 16px",borderRadius:20,border:"1.5px solid",borderColor:anoFiltro===a?"var(--purple)":"#e5e7eb",background:anoFiltro===a?"var(--purple)":"white",color:anoFiltro===a?"white":"#6b7280",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            {a}{a===String(anoAtualNum)&&<span style={{marginLeft:3,fontSize:9}}>●</span>}
          </button>
        ))}
      </div>

      {/* Cards métricas */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
        <div style={{background:saldoMes>=0?"#d1fae5":"#fee2e2",borderRadius:12,padding:"14px 16px",border:"1.5px solid",borderColor:saldoMes>=0?"#6ee7b7":"#fca5a5"}}>
          <div style={{fontSize:11,fontWeight:600,color:saldoMes>=0?"#059669":"#dc2626",marginBottom:4}}>Saldo ({mesLabel(mesFiltroEfetivo)})</div>
          <div style={{fontSize:20,fontWeight:800,color:saldoMes>=0?"#059669":"#dc2626"}}>{fmt(saldoMes)}</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>+{fmt(recMes)} / -{fmt(despMes)}</div>
        </div>
        <div style={{background:"#fffbeb",borderRadius:12,padding:"14px 16px",border:"1.5px solid #fcd34d"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#d97706",marginBottom:4}}>Pendente</div>
          <div style={{fontSize:20,fontWeight:800,color:"#d97706"}}>{fmt(pendMes)}</div>
        </div>
        <div style={{background:"#f0fdf4",borderRadius:12,padding:"14px 16px",border:"1.5px solid #86efac"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#059669",marginBottom:4}}>Receitas ({anoFiltro})</div>
          <div style={{fontSize:20,fontWeight:800,color:"#059669"}}>{fmt(recAno)}</div>
        </div>
        <div style={{background:"#fef2f2",borderRadius:12,padding:"14px 16px",border:"1.5px solid #fca5a5"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#dc2626",marginBottom:4}}>Despesas ({anoFiltro})</div>
          <div style={{fontSize:20,fontWeight:800,color:"#dc2626"}}>{fmt(despAno)}</div>
        </div>
      </div>

      {/* Seletor Mês */}
      <div style={{display:"flex",gap:4,marginBottom:24,overflowX:"auto",paddingBottom:4}}>
        {mesesDisp.map(m=>(
          <button key={m} onClick={()=>setMesFiltro(m)}
            style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid",borderColor:mesFiltroEfetivo===m?"var(--purple)":"#e5e7eb",background:mesFiltroEfetivo===m?"var(--purple)":"white",color:mesFiltroEfetivo===m?"white":"#6b7280",fontSize:12,fontWeight:mesFiltroEfetivo===m?700:400,cursor:"pointer",flexShrink:0}}>
            {mesLabel(m)}
          </button>
        ))}
      </div>

      {/* RECORRENTES — sempre visível */}
      {recorrAtivos.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:10,display:"flex",alignItems:"center",gap:6,color:"var(--text-muted)"}}>
            <Icon name="repeat" size={15}/> Recorrentes — {mesLabel(mesFiltroEfetivo)}
          </div>
          <div className="card" style={{padding:0}}>
            {recorrAtivos.map(r=>{
              const baixaDone = jaDeuBaixaMes(r);
              return (
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid var(--gray-100)"}}>
                  <div style={{width:36,height:36,borderRadius:8,background:bgTipo(r.tipo),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon name={r.tipo==="receita"?"trending-up":"trending-down"} size={16}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{r.descricao||r.categoria}</div>
                    <div style={{fontSize:12,color:"var(--text-muted)"}}>{r.categoria} · vence dia {r.diaVencimento} · {r.recorrencia}</div>
                  </div>
                  <div style={{fontWeight:700,color:corTipo(r.tipo),marginRight:8}}>{fmt(parseFloat(r.valorPrevisto)||0)}</div>
                  {baixaDone
                    ? <span style={{background:"#d1fae5",color:"#065f46",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20}}>✓ Pago</span>
                    : !somenteLeitura&&<button className="btn btn-purple" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>{setModalBaixa(r);setFormBaixa({valor:r.valorPrevisto||"",data:`${mesFiltroEfetivo}-${String(r.diaVencimento||10).padStart(2,"0")}`,formaPag:"PIX",modo:"este"});}}>Dar baixa</button>
                  }
                  {!somenteLeitura&&(
                    <div style={{display:"flex",gap:4}}>
                      <button className="btn btn-ghost" style={{padding:"4px 8px"}} onClick={()=>{setFormRecorr({tipo:r.tipo,categoria:r.categoria,descricao:r.descricao||"",valorPrevisto:r.valorPrevisto+"",recorrencia:r.recorrencia,diaVencimento:r.diaVencimento,mesInicio:r.mesInicio||mesAtual,ativo:r.ativo});setEditando(r.id);setModal("recorrente");}}><Icon name="pencil" size={13}/></button>
                      <button className="btn btn-ghost" style={{padding:"4px 8px",color:"var(--danger)"}} onClick={()=>excluirRec(r.id)}><Icon name="trash-2" size={13}/></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LANÇAMENTOS DO MÊS */}
      <div>
        {lancMes.filter(l=>l.tipo==="receita").length>0&&(
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:700,color:"#059669",display:"flex",alignItems:"center",gap:6}}><Icon name="trending-up" size={16}/> Receitas</div>
              <div style={{fontWeight:700,color:"#059669"}}>{fmt(recMes)}</div>
            </div>
            <div className="card" style={{padding:0}}>
              {lancMes.filter(l=>l.tipo==="receita").map(l=>(
                <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid var(--gray-100)"}}>
                  <div style={{width:36,height:36,borderRadius:8,background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="arrow-down-left" size={16}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:14}}>{l.descricao||l.categoria}</div>
                    <div style={{fontSize:12,color:"var(--text-muted)"}}>{l.categoria} · {l.data}{l.formaPag?" · "+l.formaPag:""}</div>
                  </div>
                  <div style={{fontWeight:700,color:"#059669"}}>{fmt(parseFloat(l.valor)||0)}</div>
                  <span style={{background:"#d1fae5",color:"#065f46",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>✓ Recebido</span>
                  {!somenteLeitura&&(
                    <div style={{display:"flex",gap:4}}>
                      <button className="btn btn-ghost" style={{padding:"4px 8px"}} onClick={()=>{setFormAvulso({tipo:l.tipo,categoria:l.categoria||"",descricao:l.descricao||"",valor:l.valor+"",data:l.data,formaPag:l.formaPag||"PIX",status:l.status,obs:l.obs||""});setEditando(l.id);setModal("avulso");}}><Icon name="pencil" size={13}/></button>
                      <button className="btn btn-ghost" style={{padding:"4px 8px",color:"var(--danger)"}} onClick={()=>excluir(l.id)}><Icon name="trash-2" size={13}/></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {lancMes.filter(l=>l.tipo==="despesa").length>0&&(
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:700,color:"#dc2626",display:"flex",alignItems:"center",gap:6}}><Icon name="trending-down" size={16}/> Despesas</div>
              <div style={{fontWeight:700,color:"#dc2626"}}>{fmt(despMes)}</div>
            </div>
            <div className="card" style={{padding:0}}>
              {lancMes.filter(l=>l.tipo==="despesa").map(l=>(
                <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid var(--gray-100)"}}>
                  <div style={{width:36,height:36,borderRadius:8,background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="arrow-up-right" size={16}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:500,fontSize:14}}>{l.descricao||l.categoria}</div>
                    <div style={{fontSize:12,color:"var(--text-muted)"}}>{l.categoria} · {l.data}{l.formaPag?" · "+l.formaPag:""}</div>
                  </div>
                  <div style={{fontWeight:700,color:"#dc2626"}}>{fmt(parseFloat(l.valor)||0)}</div>
                  <span style={{background:l.status==="pago"?"#d1fae5":"#fef3c7",color:l.status==="pago"?"#065f46":"#92400e",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>{l.status==="pago"?"✓ Pago":"Pendente"}</span>
                  {!somenteLeitura&&(
                    <div style={{display:"flex",gap:4}}>
                      <button className="btn btn-ghost" style={{padding:"4px 8px"}} onClick={()=>{setFormAvulso({tipo:l.tipo,categoria:l.categoria||"",descricao:l.descricao||"",valor:l.valor+"",data:l.data,formaPag:l.formaPag||"PIX",status:l.status,obs:l.obs||""});setEditando(l.id);setModal("avulso");}}><Icon name="pencil" size={13}/></button>
                      <button className="btn btn-ghost" style={{padding:"4px 8px",color:"var(--danger)"}} onClick={()=>excluir(l.id)}><Icon name="trash-2" size={13}/></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {lancMes.length===0&&recorrAtivos.length===0&&(
          <div className="card" style={{textAlign:"center",padding:40,color:"var(--text-muted)"}}>
            <Icon name="wallet" size={40}/>
            <div style={{marginTop:12,fontWeight:500}}>Nenhum lançamento em {mesLabel(mesFiltroEfetivo)}</div>
            {!somenteLeitura&&<div style={{fontSize:13,marginTop:6}}>Use "+ Lançamento" ou "+ Recorrente" acima.</div>}
          </div>
        )}
      </div>

      {/* MODAL BAIXA RECORRENTE */}
      {modalBaixa&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModalBaixa(null)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:460}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:4}}>Dar baixa — {modalBaixa.descricao||modalBaixa.categoria}</div>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Previsto: {fmt(parseFloat(modalBaixa.valorPrevisto)||0)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div className="form-group">
                <label className="form-label">Valor Real (R$)</label>
                <input className="form-input" type="number" value={formBaixa.valor} onChange={e=>setFormBaixa({...formBaixa,valor:e.target.value})} autoFocus/>
              </div>
              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <select className="form-input" value={formBaixa.formaPag} onChange={e=>setFormBaixa({...formBaixa,formaPag:e.target.value})}>
                  {FORMAS.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Aplicar para</label>
              <div style={{display:"flex",gap:8}}>
                {[["este","Só este mês","#7B00C4"],["proximos","Este e os próximos (até dez.)","#0891b2"]].map(([v,l,c])=>(
                  <button key={v} type="button" onClick={()=>setFormBaixa({...formBaixa,modo:v})}
                    style={{flex:1,padding:"10px 8px",borderRadius:10,border:"1.5px solid",borderColor:formBaixa.modo===v?c:"#e5e7eb",background:formBaixa.modo===v?c+"15":"white",color:formBaixa.modo===v?c:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:12,fontFamily:"var(--font-body)",textAlign:"center"}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModalBaixa(null)}>Cancelar</button>
              <button className="btn btn-purple" onClick={confirmarBaixa} disabled={salvando}>{salvando?"Salvando...":"Confirmar Baixa"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LANÇAMENTO AVULSO */}
      {modal==="avulso"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>{editando?"Editar":"Novo"} Lançamento</div>
              <button onClick={()=>{setModal(false);setEditando(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Tipo</label>
                <div style={{display:"flex",gap:8}}>
                  {[["receita","↓ Receita","#059669"],["despesa","↑ Despesa","#dc2626"]].map(([v,l,c])=>(
                    <button key={v} type="button" onClick={()=>setFormAvulso({...formAvulso,tipo:v,categoria:""})}
                      style={{flex:1,padding:10,borderRadius:10,border:"1.5px solid",borderColor:formAvulso.tipo===v?c:"#e5e7eb",background:formAvulso.tipo===v?c+"15":"white",color:formAvulso.tipo===v?c:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={formAvulso.categoria} onChange={e=>setFormAvulso({...formAvulso,categoria:e.target.value})}>
                  <option value="">Selecionar...</option>
                  {(formAvulso.tipo==="receita"?catsReceita:catsDespesa).map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input className="form-input" value={formAvulso.descricao} onChange={e=>setFormAvulso({...formAvulso,descricao:e.target.value})} placeholder="Ex: Conta de luz"/>
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input className="form-input" type="number" value={formAvulso.valor} onChange={e=>setFormAvulso({...formAvulso,valor:e.target.value})} placeholder="0,00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input className="form-input" type="date" value={formAvulso.data} onChange={e=>setFormAvulso({...formAvulso,data:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <select className="form-input" value={formAvulso.formaPag} onChange={e=>setFormAvulso({...formAvulso,formaPag:e.target.value})}>
                  {FORMAS.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Status</label>
                <div style={{display:"flex",gap:8}}>
                  {[["pago",formAvulso.tipo==="receita"?"✓ Recebido":"✓ Pago","#059669"],["pendente","Pendente","#d97706"]].map(([v,l,c])=>(
                    <button key={v} type="button" onClick={()=>setFormAvulso({...formAvulso,status:v})}
                      style={{flex:1,padding:10,borderRadius:10,border:"1.5px solid",borderColor:formAvulso.status===v?c:"#e5e7eb",background:formAvulso.status===v?c+"15":"white",color:formAvulso.status===v?c:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Observações</label>
                <input className="form-input" value={formAvulso.obs||""} onChange={e=>setFormAvulso({...formAvulso,obs:e.target.value})} placeholder="Opcional..."/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
              <button className="btn btn-ghost" onClick={()=>{setModal(false);setEditando(null);}}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvarAvulso} disabled={salvando}>{salvando?"Salvando...":editando?"Salvar":"Lançar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECORRENTE */}
      {modal==="recorrente"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>{editando?"Editar":"Novo"} Lançamento Recorrente</div>
              <button onClick={()=>{setModal(false);setEditando(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Tipo</label>
                <div style={{display:"flex",gap:8}}>
                  {[["receita","↓ Receita","#059669"],["despesa","↑ Despesa","#dc2626"]].map(([v,l,c])=>(
                    <button key={v} type="button" onClick={()=>setFormRecorr({...formRecorr,tipo:v,categoria:""})}
                      style={{flex:1,padding:10,borderRadius:10,border:"1.5px solid",borderColor:formRecorr.tipo===v?c:"#e5e7eb",background:formRecorr.tipo===v?c+"15":"white",color:formRecorr.tipo===v?c:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={formRecorr.categoria} onChange={e=>setFormRecorr({...formRecorr,categoria:e.target.value})}>
                  <option value="">Selecionar...</option>
                  {(formRecorr.tipo==="receita"?catsReceita:catsDespesa).map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input className="form-input" value={formRecorr.descricao||""} onChange={e=>setFormRecorr({...formRecorr,descricao:e.target.value})} placeholder="Ex: Aluguel ap. 302"/>
              </div>
              <div className="form-group">
                <label className="form-label">Valor Previsto (R$)</label>
                <input className="form-input" type="number" value={formRecorr.valorPrevisto} onChange={e=>setFormRecorr({...formRecorr,valorPrevisto:e.target.value})} placeholder="0,00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Recorrência</label>
                <select className="form-input" value={formRecorr.recorrencia} onChange={e=>setFormRecorr({...formRecorr,recorrencia:e.target.value})}>
                  {RECORR.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dia de Vencimento</label>
                <input className="form-input" type="number" min="1" max="31" value={formRecorr.diaVencimento} onChange={e=>setFormRecorr({...formRecorr,diaVencimento:e.target.value})} placeholder="10"/>
              </div>
              <div className="form-group">
                <label className="form-label">Início</label>
                <input className="form-input" type="month" value={formRecorr.mesInicio} onChange={e=>setFormRecorr({...formRecorr,mesInicio:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={formRecorr.ativo?"ativo":"inativo"} onChange={e=>setFormRecorr({...formRecorr,ativo:e.target.value==="ativo"})}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
              <button className="btn btn-ghost" onClick={()=>{setModal(false);setEditando(null);}}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvarRecorrente} disabled={salvando}>{salvando?"Salvando...":editando?"Salvar":"Cadastrar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATEGORIAS */}
      {modal==="categoria"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>Gerenciar Categorias</div>
              <button onClick={()=>setModal(false)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <select className="form-input" style={{width:120,flexShrink:0}} value={novaCategoria.tipo} onChange={e=>setNovaCategoria({...novaCategoria,tipo:e.target.value})}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
              <input className="form-input" style={{flex:1}} value={novaCategoria.nome} onChange={e=>setNovaCategoria({...novaCategoria,nome:e.target.value})} placeholder="Nova categoria..." onKeyDown={e=>e.key==="Enter"&&salvarCategoria()}/>
              <button className="btn btn-purple" onClick={salvarCategoria}><Icon name="plus" size={16}/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {categorias.length===0&&<div style={{fontSize:13,color:"var(--text-muted)",textAlign:"center",padding:20}}>Nenhuma categoria personalizada ainda.</div>}
              {categorias.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:c.tipo==="receita"?"#f0fdf4":"#fef2f2",border:"1px solid",borderColor:c.tipo==="receita"?"#86efac":"#fca5a5"}}>
                  <span style={{fontSize:11,fontWeight:600,color:c.tipo==="receita"?"#059669":"#dc2626",background:"white",padding:"2px 8px",borderRadius:10}}>{c.tipo}</span>
                  <span style={{flex:1,fontSize:14}}>{c.nome}</span>
                  <button className="btn btn-ghost" style={{padding:"4px 8px",color:"var(--danger)"}} onClick={()=>excluirCategoria(c.id)}><Icon name="trash-2" size={13}/></button>
                </div>
              ))}
            </div>
            <div style={{marginTop:16,padding:12,background:"var(--gray-50)",borderRadius:10,fontSize:12,color:"var(--text-muted)"}}>
              As categorias padrão já estão inclusas (Aluguel, Contador, Impostos, etc.). Aqui você adiciona categorias extras.
            </div>
          </div>
        </div>
      )}
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

  const filtrados = alunos.filter(a=>{
    const fOk = filtro==="todos" || a.status===filtro;
    const bOk = !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.email?.toLowerCase().includes(busca.toLowerCase());
    return fOk && bOk;
  });

  async function salvar(){
    if(!form.nome||!form.email){alert("Nome e e-mail obrigatorios.");return;}
    if(!editando&&!form.senha){alert("Senha obrigatoria para novo aluno.");return;}
    setSalvando(true);
    if(editando){
      const {senha,...dados}=form;
      await db.collection("clinica_alunos").doc(editando).update(dados);
    } else {
      await db.collection("clinica_alunos").add({...form,status:"ativo",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    }
    setModal(false);setForm({nome:"",email:"",telefone:"",instituicao:"",semestre:"",senha:"",obs:""});setEditando(null);setSalvando(false);
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
          <div className="page-title">Alunos em Supervisao</div>
          <div className="page-subtitle">{alunos.filter(a=>a.status==="ativo").length} aluno(s) cadastrado(s)</div>
        </div>
        <button className="btn btn-purple" onClick={()=>{setForm({nome:"",email:"",telefone:"",instituicao:"",semestre:"",senha:"",obs:""});setEditando(null);setModal(true);}}>
          <Icon name="user-plus" size={16}/> Cadastrar Aluno
        </button>
      </div>
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <input className="form-input" style={{flex:1,minWidth:200}} placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e=>setBusca(e.target.value)}/>
        {[["todos","Todos"],["ativo","Ativos"],["inativo","Inativos"]].map(([f,l])=>(
          <button key={f} className={"btn "+(filtro===f?"btn-purple":"btn-ghost")} onClick={()=>setFiltro(f)}>{l}</button>
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
            <div key={a.id} className="card" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px"}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"var(--purple)",flexShrink:0,fontSize:16}}>{(a.nome||"?")[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:600}}>{a.nome}</span>
                  <span className={"badge "+(a.status==="ativo"?"badge-green":"badge-gray")}>{a.status==="ativo"?"Ativo":"Inativo"}</span>
                </div>
                <div style={{fontSize:13,color:"var(--text-muted)",display:"flex",gap:12,marginTop:2,flexWrap:"wrap"}}>
                  <span>✉ {a.email}</span>
                  {a.instituicao&&<span>🏛 {a.instituicao}{a.semestre?" · "+a.semestre:""}</span>}
                  <span>👤 {a.pacientesVinculados||0} paciente(s)</span>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
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

function TerapiaCasais() {
  const { data:pacientes } = useCollection("clinica_pacientes","nome");
  const [casais, setCasais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({nomeCasal:"",p1:"",p2:""});
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState(null);

  useEffect(()=>{
    const unsub = db.collection("clinica_casais").onSnapshot(snap=>{
      setCasais(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
  },[]);

  async function vincular(){
    if(!form.p1||!form.p2||form.p1===form.p2){alert("Selecione dois pacientes diferentes.");return;}
    setSalvando(true);
    const p1 = pacientes.find(p=>p.id===form.p1);
    const p2 = pacientes.find(p=>p.id===form.p2);
    // Grava na coleção de casais
    await db.collection("clinica_casais").add({
      nomeCasal:form.nomeCasal||null,
      p1Id:form.p1, p1Nome:p1?.nome||"",
      p2Id:form.p2, p2Nome:p2?.nome||"",
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    // Grava casalId + mod5 nos dois pacientes para o portal clínico detectar
    await db.collection("clinica_pacientes").doc(form.p1).update({
      casalId:form.p2,
      modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
    });
    await db.collection("clinica_pacientes").doc(form.p2).update({
      casalId:form.p1,
      modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
    });
    setModal(false);setForm({nomeCasal:"",p1:"",p2:""});setSalvando(false);
  }

  async function excluir(id){
    if(!confirm("Remover vinculo?"))return;
    // Busca o casal para limpar casalId dos pacientes
    const casal = casais.find(c=>c.id===id);
    if(casal){
      await db.collection("clinica_pacientes").doc(casal.p1Id).update({casalId:""}).catch(()=>{});
      await db.collection("clinica_pacientes").doc(casal.p2Id).update({casalId:""}).catch(()=>{});
    }
    await db.collection("clinica_casais").doc(id).delete();
  }

  const getNomeExibicao = (c) => c.nomeCasal || `${c.p1Nome} & ${c.p2Nome}`;

  if(loading) return <Spinner/>;

  return (
    <div>
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Terapia de Casais</div>
          <div className="page-subtitle">{casais.length} casal{casais.length!==1?"is":""} em acompanhamento</div>
        </div>
        <button className="btn btn-purple" onClick={()=>setModal(true)}><Icon name="plus" size={16}/> Vincular Casal</button>
      </div>

      {casais.length===0?(
        <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>
          <Icon name="heart" size={40}/>
          <div style={{marginTop:12}}>Nenhum casal vinculado ainda.</div>
          <button className="btn btn-purple" style={{marginTop:16}} onClick={()=>setModal(true)}><Icon name="plus" size={14}/> Vincular primeiro casal</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {casais.map(c=>(
            <React.Fragment key={c.id}>
            <div className="card" style={{display:"flex",alignItems:"center",gap:16,padding:"18px 24px"}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Icon name="heart" size={20}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:600}}>{c.nomeCasal||`${c.p1Nome} & ${c.p2Nome}`}</span>
                  {c.nomeCasal&&<span style={{fontSize:13,color:"var(--text-muted)"}}>({c.p1Nome} & {c.p2Nome})</span>}
                </div>
                {(c.satisfacao||c.estadoCivil)&&(
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    {c.satisfacao&&<span className="badge badge-purple">Satisfacao: {c.satisfacao}/10</span>}
                    {c.estadoCivil&&<span className="badge badge-gray">{c.estadoCivil}</span>}
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button className="btn btn-ghost" style={{padding:"6px 10px",color:"var(--danger)"}} onClick={()=>excluir(c.id)}><Icon name="trash-2" size={14}/></button>
                <button className="btn btn-outline" style={{fontSize:13}} onClick={()=>setExpandido(expandido===c.id?null:c.id)}>
                  🔴 Emergência <Icon name={expandido===c.id?"chevron-up":"chevron-down"} size={14}/>
                </button>
              </div>
            </div>
            {expandido===c.id && (
              <BotaoEmergenciaAdmin casalId={c.id} nomeCasal={getNomeExibicao(c)}/>
            )}
            </React.Fragment>
          ))}
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <Icon name="heart" size={18}/>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>Vincular Casal</div>
            </div>
            <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Selecione dois pacientes cadastrados para vincular como casal em terapia.</p>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Nome do casal (opcional)</label>
              <input className="form-input" value={form.nomeCasal} onChange={e=>setForm({...form,nomeCasal:e.target.value})} placeholder="Ex: Silva & Costa"/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Parceiro(a) 1 *</label>
              <select className="form-input" value={form.p1} onChange={e=>setForm({...form,p1:e.target.value})}>
                <option value="">Selecionar paciente...</option>
                {pacientes.filter(p=>p.status==="ativo").sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR")).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Parceiro(a) 2 *</label>
              <select className="form-input" value={form.p2} onChange={e=>setForm({...form,p2:e.target.value})}>
                <option value="">Selecionar paciente...</option>
                {pacientes.filter(p=>p.status==="ativo"&&p.id!==form.p1).sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR")).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={vincular} disabled={salvando}><Icon name="heart" size={15}/> {salvando?"Salvando...":"Vincular"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RECURSOS TERAPÊUTICOS
// ═══════════════════════════════════════════════════════
const CATEGORIAS_RECURSOS = [
  {id:"tcc",          label:"TCC",                  cor:"#7B00C4", bg:"#f3e6ff", accent:"#0EA5E9"},
  {id:"ansiedade",    label:"Ansiedade",             cor:"#7B00C4", bg:"#f3e6ff", accent:"#F97316"},
  {id:"emocoes",      label:"Emocoes",               cor:"#7B00C4", bg:"#f3e6ff", accent:"#F43F5E"},
  {id:"autocuidado",  label:"Autocuidado",           cor:"#7B00C4", bg:"#f3e6ff", accent:"#22C55E"},
  {id:"relacionamentos",label:"Relacionamentos",     cor:"#7B00C4", bg:"#f3e6ff", accent:"#EF4444"},
  {id:"corpo",        label:"Corpo & Alimentacao",   cor:"#7B00C4", bg:"#f3e6ff", accent:"#EAB308"},
  {id:"esquema",      label:"Terapia do Esquema",    cor:"#7B00C4", bg:"#f3e6ff", accent:"#8B5CF6"},
  {id:"musicoterapia",label:"Musicoterapia",         cor:"#7B00C4", bg:"#f3e6ff", accent:"#EC4899"},
  {id:"avaliacao",    label:"Avaliacao e Anamnese",  cor:"#7B00C4", bg:"#f3e6ff", accent:"#6366F1"},
  {id:"outro",        label:"Outros",                cor:"#7B00C4", bg:"#f3e6ff", accent:"#64748B"},
];

const FERRAMENTAS_INTERATIVAS = [
  {key:"breathing-478",       label:"Exercicio de Respiracao 4-7-8"},
  {key:"abc-record",          label:"Registro ABC de Pensamentos"},
  {key:"muscle-relaxation",   label:"Relaxamento Muscular Progressivo"},
  {key:"anxiety-management",  label:"Gestao da Ansiedade"},
  {key:"entrevista-clinica",  label:"Entrevista Clinica Inicial"},
  {key:"emotional-eating",    label:"Rastreamento Emocional da Alimentacao"},
  {key:"treino-neuro-auditivo",label:"Treino Neuro-Auditivo"},
  {key:"decision-tree",       label:"Arvore da Decisao"},
  {key:"anamnese",            label:"Anamnese — Marcos do Desenvolvimento"},
  {key:"diario-terapeutico",  label:"Diário Terapêutico"},
];


// ═══════════════════════════════════════════════════════
// FERRAMENTAS INTERATIVAS — MODAL VISUALIZAR
// ═══════════════════════════════════════════════════════

// ── helpers compartilhados ──
function getYouTubeEmbed(url){
  if(!url||!url.trim()) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if(!m) return null;
  return `https://www.youtube.com/embed/${m[1]}?autoplay=1&loop=1&playlist=${m[1]}&controls=1&rel=0`;
}
function falarTexto(txt){
  if(!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(txt);
  u.lang="pt-BR"; u.rate=0.85; u.pitch=1.05;
  const v = window.speechSynthesis.getVoices().find(x=>x.lang.startsWith("pt"));
  if(v) u.voice=v;
  window.speechSynthesis.speak(u);
}

// ── Nota de Relaxamento — salva no Firebase após conclusão ──────────────────
function NotaRelaxamento({ user, ferramenta, emoji, onRepetir }) {
  const [nota, setNota] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvarNota(n) {
    setNota(n);
    if (!user?.id) { setSalvo(true); return; }
    setSalvando(true);
    try {
      await db.collection("clinica_atividades").add({
        pacienteId: user.id,
        pacienteNome: user.nome || "",
        ferramenta,
        nota: n,
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch(e) {}
    setSalvando(false);
    setSalvo(true);
  }

  if (salvo) return (
    <div style={{marginTop:8}}>
      <div style={{background:"#d1fae5",borderRadius:12,padding:"14px 20px",fontSize:14,color:"#065f46",marginBottom:20}}>
        ✓ Nota {nota}/10 registrada! Seu progresso foi salvo. 💜
      </div>
      <button className="btn btn-purple" onClick={onRepetir}>
        <Icon name="rotate-ccw" size={16}/> Repetir
      </button>
    </div>
  );

  return (
    <div style={{marginTop:8}}>
      <div style={{fontWeight:600,fontSize:15,marginBottom:6}}>Como você está se sentindo agora?</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Dê uma nota de 0 a 10 para o seu nível de relaxamento</div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
        {[0,1,2,3,4,5,6,7,8,9,10].map(n=>(
          <button key={n} onClick={()=>salvarNota(n)} disabled={salvando}
            style={{width:44,height:44,borderRadius:10,border:"1.5px solid",
              borderColor: n<=3?"#fca5a5":n<=6?"#fbbf24":"#6ee7b7",
              background: n<=3?"#fef2f2":n<=6?"#fef3c7":"#f0fdf4",
              color: n<=3?"#dc2626":n<=6?"#d97706":"#16a34a",
              fontWeight:700,fontSize:15,cursor:"pointer"}}>
            {n}
          </button>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",paddingLeft:4,paddingRight:4}}>
        <span>😰 Muito tenso</span><span>😐 Regular</span><span>😌 Muito relaxado</span>
      </div>
    </div>
  );
}

// ── Técnica de Respiração 4-7-8 (áudio MP4 guiado) ──
function FerramentaRespiracao({ user }){
  const AUDIO_SRC = "../media/atividade2respiracao.mp4";
  const [iniciado,  setIniciado]  = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [tempo,     setTempo]     = useState(0);
  const [pausado,   setPausado]   = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  function iniciar() {
    setIniciado(true); setConcluido(false); setTempo(0); setPausado(false);
    if (audioRef.current) { audioRef.current.currentTime=0; audioRef.current.play().catch(()=>{}); }
    timerRef.current = setInterval(()=>setTempo(t=>t+1), 1000);
  }

  function togglePausa() {
    if (!audioRef.current) return;
    if (pausado) { audioRef.current.play().catch(()=>{}); timerRef.current=setInterval(()=>setTempo(t=>t+1),1000); }
    else { audioRef.current.pause(); clearInterval(timerRef.current); }
    setPausado(p=>!p);
  }

  function parar() {
    clearInterval(timerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime=0; }
    setIniciado(false); setTempo(0); setPausado(false);
  }

  function onEnded() {
    clearInterval(timerRef.current);
    setIniciado(false); setConcluido(true);
  }

  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const mm = String(Math.floor(tempo/60)).padStart(2,"0");
  const ss = String(tempo%60).padStart(2,"0");

  if (concluido) return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🌿</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,marginBottom:8}}>Respiração Concluída!</div>
      <div style={{fontSize:14,color:"var(--text-muted)",marginBottom:24}}>Parabéns por cuidar de você. 💜</div>
      <NotaRelaxamento user={user} ferramenta="respiracao" emoji="🫁" onRepetir={iniciar}/>
    </div>
  );

  if (!iniciado) return (
    <div style={{textAlign:"center",padding:"32px 20px"}}>
      <audio ref={audioRef} src={AUDIO_SRC} onEnded={onEnded} preload="auto"/>
      <div style={{fontSize:56,marginBottom:16}}>🫁</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>Técnica de Respiração 4-7-8</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24,lineHeight:1.6}}>
        Exercício guiado pela voz da Dra. Lucia Kratz.<br/>
        Siga as instruções do áudio e respire no seu próprio ritmo.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24,textAlign:"left"}}>
        {[{e:"🧘",t:"Encontre uma posição confortável"},{e:"🎧",t:"Use fone de ouvido se possível"},{e:"📵",t:"Coloque o celular no silencioso"}].map((i,idx)=>(
          <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:"#f5f3ff",border:"1px solid #ede9fe"}}>
            <span style={{fontSize:22}}>{i.e}</span>
            <span style={{fontSize:13,color:"var(--gray-700)"}}>{i.t}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-purple" style={{minWidth:160,fontSize:15,padding:"12px 24px"}} onClick={iniciar}>
        <Icon name="play" size={18}/> Iniciar
      </button>
    </div>
  );

  return (
    <div style={{textAlign:"center",padding:"20px 0"}}>
      <audio ref={audioRef} src={AUDIO_SRC} onEnded={onEnded} preload="auto"/>

      <div style={{position:"relative",width:200,height:200,margin:"0 auto 24px",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:190,height:190,borderRadius:"50%",background:"#7B00C408",border:"2px solid #7B00C420",animation:pausado?"none":"pulse-slow 3s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:150,height:150,borderRadius:"50%",background:"#7B00C415",border:"2px solid #7B00C430",animation:pausado?"none":"pulse-slow 3s ease-in-out infinite 0.5s"}}/>
        <div style={{width:110,height:110,borderRadius:"50%",background:"linear-gradient(135deg,#7B00C4,#b040e0)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:"0 0 30px #7B00C440",color:"white"}}>
          <div style={{fontSize:28}}>🫁</div>
        </div>
      </div>

      <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:4}}>
        {pausado ? "Pausado" : "Siga o áudio..."}
      </div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Respire no ritmo da voz guiada</div>

      <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#f5f3ff",borderRadius:20,padding:"8px 20px",border:"1px solid #ede9fe",marginBottom:24}}>
        <Icon name="clock" size={14} style={{color:"#7B00C4"}}/>
        <span style={{fontWeight:700,fontSize:18,fontFamily:"monospace",color:"#7B00C4"}}>{mm}:{ss}</span>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        <button className="btn btn-purple" onClick={togglePausa}>
          <Icon name={pausado?"play":"pause"} size={16}/> {pausado?"Continuar":"Pausar"}
        </button>
        <button className="btn btn-ghost" onClick={parar}>
          <Icon name="square" size={15}/> Parar
        </button>
      </div>
    </div>
  );
}

// ── Relaxamento Muscular Progressivo ──
// ── Relaxamento Muscular (arquivo único de vídeo) ──
function FerramentaRelaxamento({ user }){
  const AUDIO_SRC = "../media/atividade1meditacao.mp4";
  const [iniciado,  setIniciado]  = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [tempo,     setTempo]     = useState(0);
  const [pausado,   setPausado]   = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  function iniciar() {
    setIniciado(true); setConcluido(false); setTempo(0); setPausado(false);
    if (audioRef.current) { audioRef.current.currentTime=0; audioRef.current.play().catch(()=>{}); }
    timerRef.current = setInterval(()=>setTempo(t=>t+1), 1000);
  }

  function togglePausa() {
    if (!audioRef.current) return;
    if (pausado) { audioRef.current.play().catch(()=>{}); clearInterval(timerRef.current); timerRef.current=setInterval(()=>setTempo(t=>t+1),1000); }
    else { audioRef.current.pause(); clearInterval(timerRef.current); }
    setPausado(p=>!p);
  }

  function parar() {
    clearInterval(timerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime=0; }
    setIniciado(false); setTempo(0); setPausado(false);
  }

  function onEnded() {
    clearInterval(timerRef.current);
    setIniciado(false); setConcluido(true);
  }

  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const mm = String(Math.floor(tempo/60)).padStart(2,"0");
  const ss = String(tempo%60).padStart(2,"0");

  if (concluido) return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:56,marginBottom:12}}>✅</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,marginBottom:8}}>Relaxamento Completo!</div>
      <div style={{fontSize:14,color:"var(--text-muted)",marginBottom:24}}>Parabéns por cuidar de você. 💜</div>
      <NotaRelaxamento user={user} ferramenta="relaxamento" emoji="💆" onRepetir={iniciar}/>
    </div>
  );

  if (!iniciado) return (
    <div style={{textAlign:"center",padding:"32px 20px"}}>
      <audio ref={audioRef} src={AUDIO_SRC} onEnded={onEnded} preload="auto"/>
      <div style={{fontSize:56,marginBottom:16}}>💆</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>Relaxamento Muscular Progressivo</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24,lineHeight:1.6}}>
        Exercício guiado pela voz da Dra. Lucia Kratz.<br/>
        Siga as instruções do áudio e relaxe cada grupo muscular.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24,textAlign:"left"}}>
        {[{e:"🧘",t:"Encontre uma posição confortável"},{e:"🎧",t:"Use fone de ouvido se possível"},{e:"📵",t:"Coloque o celular no silencioso"}].map((i,idx)=>(
          <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:"#f5f3ff",border:"1px solid #ede9fe"}}>
            <span style={{fontSize:22}}>{i.e}</span>
            <span style={{fontSize:13,color:"var(--gray-700)"}}>{i.t}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-purple" style={{minWidth:160,fontSize:15,padding:"12px 24px"}} onClick={iniciar}>
        <Icon name="play" size={18}/> Iniciar
      </button>
    </div>
  );

  return (
    <div style={{textAlign:"center",padding:"20px 0"}}>
      <audio ref={audioRef} src={AUDIO_SRC} onEnded={onEnded} preload="auto"/>

      {/* Animação pulsante */}
      <div style={{position:"relative",width:200,height:200,margin:"0 auto 24px",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:190,height:190,borderRadius:"50%",background:"#7B00C408",border:"2px solid #7B00C420",animation:pausado?"none":"pulse-slow 3s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:150,height:150,borderRadius:"50%",background:"#7B00C415",border:"2px solid #7B00C430",animation:pausado?"none":"pulse-slow 3s ease-in-out infinite 0.5s"}}/>
        <div style={{width:110,height:110,borderRadius:"50%",background:"linear-gradient(135deg,#7B00C4,#b040e0)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:"0 0 30px #7B00C440",color:"white"}}>
          <div style={{fontSize:28}}>💆</div>
        </div>
      </div>

      <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:4}}>
        {pausado ? "Pausado" : "Em relaxamento..."}
      </div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Siga as instruções do áudio</div>

      {/* Cronômetro */}
      <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#f5f3ff",borderRadius:20,padding:"8px 20px",border:"1px solid #ede9fe",marginBottom:24}}>
        <Icon name="clock" size={14} style={{color:"#7B00C4"}}/>
        <span style={{fontWeight:700,fontSize:18,fontFamily:"monospace",color:"#7B00C4"}}>{mm}:{ss}</span>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        <button className="btn btn-purple" onClick={togglePausa}>
          <Icon name={pausado?"play":"pause"} size={16}/> {pausado?"Continuar":"Pausar"}
        </button>
        <button className="btn btn-ghost" onClick={parar}>
          <Icon name="square" size={15}/> Parar
        </button>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%,100%{transform:scale(1);opacity:0.6}
          50%{transform:scale(1.08);opacity:1}
        }
        .pulse-slow{animation:pulse-slow 3s ease-in-out infinite}
      `}</style>
    </div>
  );
}
// ── Árvore da Decisão ──
function FerramentaArvore(){
  const [step,setStep]=useState("home");
  const [preocupacao,setPreocupacao]=useState("");
  const [acoes,setAcoes]=useState("");
  const [plano,setPlano]=useState("");
  const [conclusao,setConclusao]=useState(null);
  const [historico,setHistorico]=useState([]);

  function reiniciar(){setStep("home");setPreocupacao("");setAcoes("");setPlano("");setConclusao(null);}

  function salvarHistorico(c){
    setHistorico(h=>[{data:new Date().toLocaleDateString("pt-BR"),preocupacao,conclusao:c},...h].slice(0,10));
    setConclusao(c);setStep("conclusao");
  }

  const CONCLUSOES={
    redirect:{emoji:"🌿",titulo:"Redirecione sua atenção",desc:"Esta situação está fora do seu controle agora. Direcione sua energia para algo que possa fazer.",cor:"#0891b2",bg:"#e0f2fe"},
    "act-now":{emoji:"⚡",titulo:"Realize esta tarefa agora!",desc:"Você identificou uma ação que pode ser feita agora. Coloque-a em prática!",cor:"#059669",bg:"#d1fae5"},
    plan:{emoji:"📋",titulo:"Siga o seu plano",desc:"Você tem um plano para agir no momento certo. Confie nele e direcione sua atenção.",cor:"#d97706",bg:"#fef3c7"},
  };

  if(step==="home") return(
    <div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:48,marginBottom:12}}>🌳</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>Árvore da Decisão</div>
      <p style={{fontSize:13,color:"#6b7280",marginBottom:8}}>Uma técnica da TCC para transformar preocupações em ações concretas — distinguindo o que está ou não no seu controle.</p>
      <p style={{fontSize:12,color:"#9ca3af",marginBottom:24}}>💡 Preocupações <strong>produtivas</strong> levam à ação. <strong>Improdutivas</strong> paralisam.</p>
      <button className="btn btn-purple" style={{fontSize:15,padding:"12px 32px"}} onClick={()=>setStep("worry")}>Iniciar exercício →</button>
      {historico.length>0&&<div style={{marginTop:24,textAlign:"left"}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Registros anteriores</div>
        {historico.map((h,i)=><div key={i} style={{padding:"8px 12px",background:"#f9fafb",borderRadius:8,marginBottom:6,fontSize:12,display:"flex",justifyContent:"space-between"}}>
          <span style={{flex:1,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.preocupacao}</span>
          <span style={{color:"#9ca3af",marginLeft:8,flexShrink:0}}>{h.data}</span>
        </div>)}
      </div>}
    </div>
  );
  if(step==="worry") return(
    <div>
      <div style={{fontWeight:600,marginBottom:8}}>Qual é a sua preocupação agora?</div>
      <TextAreaVoz className="form-input" rows={3} value={preocupacao} onChange={e=>setPreocupacao(e.target.value)} placeholder="Descreva o que está te preocupando..."/>
      <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
        <button className="btn btn-ghost" onClick={()=>setStep("home")}>Voltar</button>
        <button className="btn btn-purple" onClick={()=>setStep("can-intervene")} disabled={!preocupacao.trim()}>Próximo →</button>
      </div>
    </div>
  );
  if(step==="can-intervene") return(
    <div>
      <div style={{fontWeight:600,marginBottom:8}}>Você pode fazer algo para resolver esta preocupação?</div>
      <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>Pense se existe alguma ação concreta que você pode tomar.</p>
      <div style={{display:"flex",gap:12}}>
        <button className="btn btn-purple" style={{flex:1,padding:16}} onClick={()=>setStep("actions")}>✅ Sim, posso agir</button>
        <button className="btn btn-outline" style={{flex:1,padding:16}} onClick={()=>salvarHistorico("redirect")}>❌ Não está no meu controle</button>
      </div>
    </div>
  );
  if(step==="actions") return(
    <div>
      <div style={{fontWeight:600,marginBottom:8}}>Quais ações você pode tomar?</div>
      <TextAreaVoz className="form-input" rows={3} value={acoes} onChange={e=>setAcoes(e.target.value)} placeholder="Liste as ações possíveis..."/>
      <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
        <button className="btn btn-ghost" onClick={()=>setStep("can-intervene")}>Voltar</button>
        <button className="btn btn-purple" onClick={()=>setStep("can-act-now")} disabled={!acoes.trim()}>Próximo →</button>
      </div>
    </div>
  );
  if(step==="can-act-now") return(
    <div>
      <div style={{fontWeight:600,marginBottom:8}}>Você pode realizar alguma dessas ações agora?</div>
      <div style={{display:"flex",gap:12,marginTop:16}}>
        <button className="btn btn-purple" style={{flex:1,padding:16}} onClick={()=>salvarHistorico("act-now")}>⚡ Sim, agora</button>
        <button className="btn btn-outline" style={{flex:1,padding:16}} onClick={()=>setStep("plan")}>📋 Preciso planejar</button>
      </div>
    </div>
  );
  if(step==="plan") return(
    <div>
      <div style={{fontWeight:600,marginBottom:8}}>Crie um plano de ação:</div>
      <TextAreaVoz className="form-input" rows={3} value={plano} onChange={e=>setPlano(e.target.value)} placeholder="Quando e como você vai agir?"/>
      <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
        <button className="btn btn-ghost" onClick={()=>setStep("can-act-now")}>Voltar</button>
        <button className="btn btn-purple" onClick={()=>salvarHistorico("plan")} disabled={!plano.trim()}>Finalizar →</button>
      </div>
    </div>
  );
  if(step==="conclusao"&&conclusao){
    const c=CONCLUSOES[conclusao];
    return(
      <div>
        <div style={{background:c.bg,borderRadius:16,padding:24,textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:8}}>{c.emoji}</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:c.cor,marginBottom:8}}>{c.titulo}</div>
          <p style={{fontSize:13,color:"#6b7280"}}>{c.desc}</p>
        </div>
        <div style={{background:"#f9fafb",borderRadius:10,padding:14,marginBottom:16,fontSize:13}}>
          <div style={{fontWeight:600,marginBottom:4}}>Sua preocupação:</div>
          <div style={{color:"#6b7280"}}>{preocupacao}</div>
          {acoes&&<><div style={{fontWeight:600,marginBottom:4,marginTop:10}}>Ações identificadas:</div><div style={{color:"#6b7280"}}>{acoes}</div></>}
          {plano&&<><div style={{fontWeight:600,marginBottom:4,marginTop:10}}>Seu plano:</div><div style={{color:"#6b7280"}}>{plano}</div></>}
        </div>
        <button className="btn btn-purple" style={{width:"100%"}} onClick={reiniciar}><Icon name="rotate-ccw" size={16}/> Nova preocupação</button>
      </div>
    );
  }
  return null;
}

// ── Ferramenta genérica (placeholder para as demais) ──
function FerramentaGenerica({recurso}){
  const INFO={
    "abc-record":     {emoji:"📋",titulo:"Registro ABC de Pensamentos",   desc:"Identifique a Situação (A), o Pensamento Automático (B) e a Emoção/Consequência (C).",cor:"#7c3aed"},
    "anxiety-management":{emoji:"🎯",titulo:"Gestão da Ansiedade",        desc:"Monitore seu nível de estresse, atividades anti-ansiedade, pensamentos e roda da vida.",cor:"#6366f1"},
    "emotional-eating":  {emoji:"🍃",titulo:"Rastreamento Emocional da Alimentação",desc:"Registre a emoção, o gatilho e o comportamento alimentar.",cor:"#059669"},
    "entrevista-clinica":{emoji:"📝",titulo:"Entrevista Clínica Inicial",  desc:"Instrumento de avaliação clínica inicial com perfil etário e hipóteses DSM-5.",cor:"#0891b2"},
    "anamnese":          {emoji:"📄",titulo:"Anamnese — Marcos do Desenvolvimento",desc:"Formulário completo de anamnese para histórico do desenvolvimento.",cor:"#7c3aed"},
    "treino-neuro-auditivo":{emoji:"🎵",titulo:"Treino Neuro-Auditivo",   desc:"Discriminação auditiva: sons graves/agudos, vozes, intensidade, ritmo e melodia.",cor:"#be185d"},
  };
  const info = INFO[recurso.formularioKey]||{emoji:"🔧",titulo:recurso.titulo,desc:recurso.descricao,cor:"#7c3aed"};
  return(
    <div style={{textAlign:"center",padding:"30px 20px"}}>
      <div style={{width:80,height:80,borderRadius:20,background:info.cor+"15",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:36}}>{info.emoji}</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>{info.titulo}</div>
      <p style={{fontSize:13,color:"#6b7280",lineHeight:1.7,marginBottom:24,maxWidth:400,margin:"0 auto 24px"}}>{info.desc}</p>
      <div style={{background:"#f9f5ff",border:"1px solid #e9d5ff",borderRadius:10,padding:16,fontSize:13,color:"#7c3aed"}}>
        Esta ferramenta está disponível no portal do paciente. O paciente acessa e preenche diretamente pelo login deles.
      </div>
    </div>
  );
}

// ── Modal principal ──
// ── ABC de Pensamentos ──────────────────────────────────────────────────────
function FerramentaABC(){
  const EMOCOES=["Ansiedade","Tristeza","Raiva","Medo","Vergonha","Culpa","Frustração","Insegurança"];
  const [entries,setEntries]=useState([]);
  const [draft,setDraft]=useState({situacao:"",pensamento:"",emocao:"",intensidade:50,alternativo:"",showAlt:false});
  const [msg,setMsg]=useState("");
  function salvar(){
    if(!draft.situacao||!draft.pensamento||!draft.emocao){alert("Preencha Situação, Pensamento e Emoção.");return;}
    setEntries(e=>[{...draft,id:Date.now()+"",data:new Date().toLocaleDateString("pt-BR")},...e]);
    setDraft({situacao:"",pensamento:"",emocao:"",intensidade:50,alternativo:"",showAlt:false});
    setMsg("✓ Salvo!");setTimeout(()=>setMsg(""),2000);
  }
  const intColor=draft.intensidade<34?"#059669":draft.intensidade<67?"#d97706":"#dc2626";
  return(
    <div>
      <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:12,marginBottom:16,fontSize:13,lineHeight:1.6}}>
        <strong style={{color:"#1d4ed8"}}>A</strong><span style={{color:"#3b82f6"}}> (Situação) → </span><strong style={{color:"#7c3aed"}}>B</strong><span style={{color:"#7c3aed"}}> (Pensamento) → </span><strong style={{color:"#d97706"}}>C</strong><span style={{color:"#d97706"}}> (Emoção/Consequência)</span>
      </div>
      {[["A","#dbeafe","#1d4ed8","situacao","Situação (Antecedente)","O que aconteceu? Onde, quando, com quem?","Ex: Meu chefe me chamou para conversar..."],
        ["B","#ede9fe","#7c3aed","pensamento","Pensamento (Belief)","O que passou pela sua cabeça naquele momento?","Ex: Devo ter feito algo errado..."]].map(([letra,bg,cor,campo,titulo,dica,ph])=>(
        <div key={campo} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:24,height:24,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:cor,fontSize:12,flexShrink:0}}>{letra}</div>
            <div style={{fontWeight:600,fontSize:13}}>{titulo}</div>
          </div>
          <div style={{fontSize:11,color:"#9ca3af",marginBottom:6,paddingLeft:32}}>{dica}</div>
          <TextAreaVoz className="form-input" rows={2} value={draft[campo]} onChange={e=>setDraft({...draft,[campo]:e.target.value})} placeholder={ph}/>
        </div>
      ))}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#d97706",fontSize:12,flexShrink:0}}>C</div>
          <div style={{fontWeight:600,fontSize:13}}>Consequência (Emoção)</div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10,paddingLeft:32}}>
          {EMOCOES.map(em=><button key={em} onClick={()=>setDraft({...draft,emocao:em})} style={{padding:"4px 12px",borderRadius:20,border:"1px solid",borderColor:draft.emocao===em?"var(--purple)":"#e5e7eb",background:draft.emocao===em?"var(--purple)":"white",color:draft.emocao===em?"white":"#6b7280",fontSize:12,cursor:"pointer"}}>{em}</button>)}
        </div>
        <div style={{paddingLeft:32}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:"#6b7280"}}>Intensidade</span><span style={{fontWeight:700,color:intColor}}>{draft.intensidade}/100</span></div>
          <input type="range" min={0} max={100} value={draft.intensidade} onChange={e=>setDraft({...draft,intensidade:+e.target.value})} style={{width:"100%",accentColor:"var(--purple)"}}/>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <button onClick={()=>setDraft({...draft,showAlt:!draft.showAlt})} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#6b7280",padding:0}}>
          💡 Pensamento alternativo (opcional) {draft.showAlt?"▲":"▼"}
        </button>
        {draft.showAlt&&<TextAreaVoz className="form-input" style={{marginTop:8}} rows={2} value={draft.alternativo} onChange={e=>setDraft({...draft,alternativo:e.target.value})} placeholder="Existe outra forma de ver essa situação?"/>}
      </div>
      <button className="btn btn-purple" style={{width:"100%"}} onClick={salvar}>{msg||"Salvar registro"}</button>
      {entries.length>0&&<div style={{marginTop:16}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>{entries.length} registro(s)</div>
        {entries.map(en=><div key={en.id} style={{background:"#f9fafb",borderRadius:10,padding:12,marginBottom:8,fontSize:12,border:"1px solid #e5e7eb"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:"#6b7280"}}>{en.data}</span><span style={{background:"var(--purple-soft)",color:"var(--purple)",borderRadius:20,padding:"1px 8px",fontWeight:600}}>{en.emocao} {en.intensidade}%</span></div>
          <div><strong>A:</strong> {en.situacao}</div><div><strong>B:</strong> {en.pensamento}</div>
          {en.alternativo&&<div style={{color:"#059669"}}><strong>Alt:</strong> {en.alternativo}</div>}
        </div>)}
      </div>}
    </div>
  );
}

// ── Gestão da Ansiedade ──────────────────────────────────────────────────────
function FerramentaGestaoAnsiedade(){
  const TECNICAS=[{id:"resp",label:"Respiração Relaxada",desc:"Inspirar → Pausar → Expirar por 2 min"},{id:"visao",label:"Visão Periférica",desc:"Mover os olhos da direita para a esquerda"},{id:"musc",label:"Relaxamento Muscular",desc:"Contrair músculos 5s e relaxar com suspiro"}];
  const ATIVIDADES=[{id:"caminhada",label:"🚶 Caminhada"},{id:"meditacao",label:"🧘 Meditação"},{id:"diario",label:"📓 Diário"},{id:"musica",label:"🎵 Música"},{id:"alongamento",label:"🤸 Alongamento"},{id:"agua",label:"💧 Hidratação"}];
  const PERGUNTAS=["Qual situação está me deixando ansioso(a)?","Qual é o meu pensamento ansioso?","Tenho provas reais de que é 100% verdadeiro?","Quais evidências indicam que pode NÃO ser verdadeiro?","Qual a probabilidade real de que o pior aconteça?","O que eu diria a um amigo com esse mesmo pensamento?","Existe uma forma mais útil de ver essa situação?","Preocupar-me está me ajudando ou me machucando?"];
  const AREAS=[{id:"interior",label:"Cuidado Interior"},{id:"familiar",label:"Vida Familiar"},{id:"carreira",label:"Carreira"},{id:"social",label:"Vida Social"},{id:"qualidade",label:"Qualidade de Vida"},{id:"saudavel",label:"Vida Saudável"},{id:"financeiro",label:"Financeiro"},{id:"espiritualidade",label:"Espiritualidade"}];
  const DESC={1:"Em paz.",2:"Otimista.",3:"Calmo.",4:"Confortável.",5:"Neutro.",6:"Estressando.",7:"Estressado.",8:"Irritado.",9:"Tenso.",10:"Em pânico."};
  const [aba,setAba]=useState(0);
  const [stress,setStress]=useState(5);
  const [nota,setNota]=useState("");
  const [track,setTrack]=useState({});
  const [resp,setResp]=useState(Array(8).fill(""));
  const [roda,setRoda]=useState({});
  const [log,setLog]=useState([]);
  const [msg,setMsg]=useState("");
  const sc=stress<=3?"#059669":stress<=5?"#d97706":stress<=7?"#f97316":"#dc2626";
  return(
    <div>
      <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"1px solid #e5e7eb",overflowX:"auto"}}>
        {["😰 Estresse","✅ Tracking","🧠 Pensamentos","🎯 Roda da Vida"].map((n,i)=>
          <button key={i} onClick={()=>setAba(i)} style={{padding:"8px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:aba===i?700:400,color:aba===i?"var(--purple)":"#6b7280",borderBottom:aba===i?"2px solid var(--purple)":"2px solid transparent",whiteSpace:"nowrap",fontFamily:"var(--font-body)"}}>{n}</button>
        )}
      </div>
      {aba===0&&<div>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:64,fontWeight:900,color:sc,lineHeight:1}}>{stress}</div><div style={{fontSize:12,color:"#9ca3af"}}>/10</div><div style={{fontSize:13,fontWeight:600,color:sc}}>{DESC[stress]}</div></div>
        <input type="range" min={1} max={10} value={stress} onChange={e=>setStress(+e.target.value)} style={{width:"100%",accentColor:sc,marginBottom:12}}/>
        <TextAreaVoz className="form-input" rows={2} value={nota} onChange={e=>setNota(e.target.value)} placeholder="Observações..." style={{marginBottom:10}}/>
        <button className="btn btn-purple" style={{width:"100%"}} onClick={()=>{setLog(l=>[{nivel:stress,nota,data:new Date().toLocaleDateString("pt-BR")},...l].slice(0,20));setMsg("✓ Registrado!");setTimeout(()=>setMsg(""),2000);}}>{msg||"Registrar"}</button>
        {log.length>0&&<div style={{marginTop:12}}>{log.slice(0,5).map((s,i)=><div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:"#f9fafb",borderRadius:8,marginBottom:4,fontSize:12}}><span style={{fontWeight:700,color:sc}}>{s.nivel}/10</span><span style={{flex:1,color:"#6b7280"}}>{s.nota||"—"}</span><span style={{color:"#9ca3af"}}>{s.data}</span></div>)}</div>}
      </div>}
      {aba===1&&<div>
        <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"var(--purple)"}}>Técnicas Anti-Ansiedade</div>
        {TECNICAS.map(t=><div key={t.id} onClick={()=>setTrack(tr=>({...tr,[t.id]:!tr[t.id]}))} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,border:"1.5px solid",borderColor:track[t.id]?"var(--purple)":"#e5e7eb",background:track[t.id]?"var(--purple-soft)":"white",cursor:"pointer",marginBottom:8}}>
          <span style={{fontSize:16}}>{track[t.id]?"✅":"⭕"}</span><div><div style={{fontWeight:600,fontSize:13}}>{t.label}</div><div style={{fontSize:12,color:"#6b7280"}}>{t.desc}</div></div>
        </div>)}
        <div style={{fontWeight:600,fontSize:13,margin:"14px 0 10px",color:"var(--purple)"}}>Atividades</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {ATIVIDADES.map(a=><div key={a.id} onClick={()=>setTrack(tr=>({...tr,[a.id]:!tr[a.id]}))} style={{padding:"10px",borderRadius:10,border:"1.5px solid",borderColor:track[a.id]?"var(--purple)":"#e5e7eb",background:track[a.id]?"var(--purple-soft)":"white",cursor:"pointer",fontSize:12,fontWeight:track[a.id]?600:400,color:track[a.id]?"var(--purple)":"#6b7280",textAlign:"center"}}>{a.label}</div>)}
        </div>
      </div>}
      {aba===2&&<div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:14,background:"#f9f5ff",padding:"10px 12px",borderRadius:8}}>Responda cada pergunta com honestidade para questionar pensamentos ansiosos.</div>
        {PERGUNTAS.map((p,i)=><div key={i} style={{marginBottom:14}}>
          <div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:"var(--purple-soft)",color:"var(--purple)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><label style={{fontSize:13,fontWeight:600,lineHeight:1.4}}>{p}</label></div>
          <TextAreaVoz className="form-input" rows={2} value={resp[i]} onChange={e=>{const r=[...resp];r[i]=e.target.value;setResp(r);}} placeholder="Sua resposta..."/>
        </div>)}
        <button className="btn btn-purple" style={{width:"100%"}} onClick={()=>{setMsg("✓ Salvo!");setTimeout(()=>setMsg(""),2000);}}>{msg||"Salvar respostas"}</button>
      </div>}
      {aba===3&&<div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:14}}>Avalie cada área de 0 a 10. O gráfico atualiza em tempo real.</div>
        {AREAS.map(a=><div key={a.id} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{fontWeight:600}}>{a.label}</span><span style={{fontWeight:700,color:"var(--purple)"}}>{roda[a.id]||0}/10</span></div>
          <input type="range" min={0} max={10} value={roda[a.id]||0} onChange={e=>setRoda(r=>({...r,[a.id]:+e.target.value}))} style={{width:"100%",accentColor:"var(--purple)"}}/>
        </div>)}
        <div style={{display:"flex",justifyContent:"center",margin:"16px 0"}}>
          <canvas id="rodaChart" width="260" height="260" ref={el=>{
            if(!el||typeof Chart==="undefined")return;
            const vals=AREAS.map(a=>roda[a.id]||0);
            const labels=AREAS.map(a=>a.label);
            if(el._chart)el._chart.destroy();
            el._chart=new Chart(el,{type:"radar",data:{labels,datasets:[{data:vals,backgroundColor:"rgba(123,0,196,0.15)",borderColor:"#7B00C4",borderWidth:2,pointBackgroundColor:"#7B00C4",pointRadius:4}]},options:{scales:{r:{min:0,max:10,ticks:{stepSize:2,font:{size:9}},pointLabels:{font:{size:10}}}},plugins:{legend:{display:false}}}});
          }}/>
        </div>
        <button className="btn btn-purple" style={{width:"100%"}} onClick={()=>{setMsg("✓ Roda da Vida salva!");setTimeout(()=>setMsg(""),2000);}}>{msg||"Salvar Roda da Vida"}</button>
      </div>}
    </div>
  );
}

// ── Rastreamento Emocional da Alimentação ───────────────────────────────────
function FerramentaRastreamento(){
  const EMOCOES=["Ansiedade","Tédio","Tristeza","Raiva","Solidão","Estresse","Cansaço","Felicidade"];
  const SENSACOES=["Culpa","Vergonha","Alívio","Indiferença","Satisfação","Arrependimento"];
  const [fome,setFome]=useState(5);
  const [emocoes,setEmocoes]=useState([]);
  const [pensamento,setPensamento]=useState("");
  const [comeu,setComeu]=useState("");
  const [alivio,setAlivio]=useState(5);
  const [duracao,setDuracao]=useState("");
  const [sensacoes,setSensacoes]=useState([]);
  const [reflexao,setReflexao]=useState("");
  const [entries,setEntries]=useState([]);
  const [msg,setMsg]=useState("");
  function Chips({opts,sel,toggle}){return(<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{opts.map(o=><button key={o} onClick={()=>toggle(o)} style={{padding:"4px 12px",borderRadius:20,border:"1px solid",borderColor:sel.includes(o)?"var(--purple)":"#e5e7eb",background:sel.includes(o)?"var(--purple)":"white",color:sel.includes(o)?"white":"#6b7280",fontSize:12,cursor:"pointer"}}>{o}</button>)}</div>);}
  function salvar(){
    if(!comeu.trim()){alert("Descreva o que você comeu.");return;}
    setEntries(e=>[{id:Date.now()+"",data:new Date().toLocaleDateString("pt-BR"),fome,emocoes:[...emocoes],pensamento,comeu,alivio,duracao,sensacoes:[...sensacoes],reflexao},...e]);
    setFome(5);setEmocoes([]);setPensamento("");setComeu("");setAlivio(5);setDuracao("");setSensacoes([]);setReflexao("");
    setMsg("✓ Salvo!");setTimeout(()=>setMsg(""),2000);
  }
  const fc=fome<=3?"#059669":fome<=6?"#d97706":"#dc2626";
  const ac=alivio<=3?"#059669":alivio<=6?"#d97706":"#dc2626";
  return(
    <div>
      <div style={{background:"#fdf4ff",border:"1px solid #e9d5ff",borderRadius:10,padding:12,marginBottom:16,fontSize:12,color:"#5a007a",lineHeight:1.6}}>Use sempre que sentir urgência de comer ou após um episódio de compulsão. O objetivo é entender o "porquê" — sem julgamento.</div>
      {[["Nível de Fome Física",fome,setFome,fc],["Nível de Alívio após comer",alivio,setAlivio,ac]].map(([lbl,val,set,col])=><div key={lbl} style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{fontWeight:600}}>{lbl}</span><span style={{fontWeight:700,color:col}}>{val}/10</span></div>
        <input type="range" min={0} max={10} value={val} onChange={e=>set(+e.target.value)} style={{width:"100%",accentColor:"var(--purple)"}}/>
      </div>)}
      <div style={{marginBottom:12}}><label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Emoções presentes</label><Chips opts={EMOCOES} sel={emocoes} toggle={o=>setEmocoes(v=>v.includes(o)?v.filter(x=>x!==o):[...v,o])}/></div>
      <div style={{marginBottom:12}}><label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Pensamento permissivo</label><TextAreaVoz className="form-input" rows={2} value={pensamento} onChange={e=>setPensamento(e.target.value)} placeholder="'Só desta vez...' 'Mereço isso...'"/></div>
      <div style={{marginBottom:12}}><label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>O que você comeu?</label><TextAreaVoz className="form-input" rows={2} value={comeu} onChange={e=>setComeu(e.target.value)} placeholder="Descreva os alimentos..."/></div>
      <div style={{marginBottom:12}}><label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:8}}>Como você se sentiu depois?</label><Chips opts={SENSACOES} sel={sensacoes} toggle={o=>setSensacoes(v=>v.includes(o)?v.filter(x=>x!==o):[...v,o])}/></div>
      <div style={{marginBottom:16}}><label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Reflexão</label><TextAreaVoz className="form-input" rows={2} value={reflexao} onChange={e=>setReflexao(e.target.value)} placeholder="O que esse episódio revela sobre suas necessidades emocionais?"/></div>
      <button className="btn btn-purple" style={{width:"100%"}} onClick={salvar}>{msg||"Salvar registro"}</button>
      {entries.length>0&&<div style={{marginTop:14}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>{entries.length} registro(s)</div>
        {entries.map(en=><div key={en.id} style={{background:"#f9fafb",borderRadius:10,padding:12,marginBottom:8,fontSize:12,border:"1px solid #e5e7eb"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:"#6b7280"}}>{en.data}</span><span style={{background:"#ede9fe",color:"var(--purple)",borderRadius:20,padding:"1px 8px",fontWeight:600}}>Fome: {en.fome}/10</span></div>
          <div><strong>Comeu:</strong> {en.comeu}</div>
          {en.emocoes.length>0&&<div style={{color:"#6b7280"}}><strong>Emoções:</strong> {en.emocoes.join(", ")}</div>}
        </div>)}
      </div>}
    </div>
  );
}

// ── Treino Neuro-Auditivo ───────────────────────────────────────────────────
function FerramentaTreino(){
  const [modulo,setModulo]=useState(0);
  const [respostas,setRespostas]=useState({});
  const [feedbacks,setFeedbacks]=useState({});
  const [score,setScore]=useState(0);
  const [total,setTotal]=useState(0);
  const [tocando,setTocando]=useState(null);
  const ctxRef=useRef(null);
  function getCtx(){if(!ctxRef.current)ctxRef.current=new AudioContext();if(ctxRef.current.state==="suspended")ctxRef.current.resume();return ctxRef.current;}
  function tocarTom(freq,dur=1.5,vol=0.4,wave="sine"){const ctx=getCtx();const osc=ctx.createOscillator();const g=ctx.createGain();osc.type=wave;osc.frequency.value=freq;g.gain.setValueAtTime(vol,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);osc.connect(g);g.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+dur);}
  function falar(txt,pitch=1,rate=0.9){if(!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(txt);u.lang="pt-BR";u.pitch=pitch;u.rate=rate;const v=window.speechSynthesis.getVoices().find(x=>x.lang.startsWith("pt"));if(v)u.voice=v;window.speechSynthesis.speak(u);}
  const MODULOS=[
    {titulo:"Grave / Agudo",emoji:"🎵",exercicios:[
      {id:"m0e0",pergunta:"Ouça e diga: GRAVE ou AGUDO?",btn:{label:"▶ Tocar",action:()=>{const f=Math.random()>0.5?180:2200;tocarTom(f);return f>500?"agudo":"grave";}},opcoes:["grave","agudo"],resposta:"grave",dica:"Sons graves têm frequência baixa. Sons agudos têm frequência alta."},
      {id:"m0e1",pergunta:"Qual som é mais GRAVE?",btn:{label:"▶ Som A (80Hz)",action:()=>tocarTom(80)},btn2:{label:"▶ Som B (800Hz)",action:()=>tocarTom(800)},opcoes:["Som A","Som B"],resposta:"Som A",dica:"O Som A (80Hz) é grave — similar a um contrabaixo."},
    ]},
    {titulo:"Vozes",emoji:"🎤",exercicios:[
      {id:"m1e0",pergunta:"Feminina ou masculina?",btn:{label:"▶ Ouvir",action:()=>falar("Olá, como você está hoje?",1.4,0.95)},opcoes:["Feminina","Masculina"],resposta:"Feminina",dica:"Tom agudo + pitch alto = voz feminina."},
      {id:"m1e1",pergunta:"Feminina ou masculina?",btn:{label:"▶ Ouvir",action:()=>falar("Bom dia, tudo bem com você?",0.5,0.85)},opcoes:["Feminina","Masculina"],resposta:"Masculina",dica:"Pitch baixo indica voz masculina."},
    ]},
    {titulo:"Intensidade",emoji:"🔊",exercicios:[
      {id:"m2e0",pergunta:"Qual som tem mais VOLUME?",btn:{label:"▶ Som Fraco",action:()=>tocarTom(440,1,0.08)},btn2:{label:"▶ Som Forte",action:()=>tocarTom(440,1,0.7)},opcoes:["Som Fraco","Som Forte"],resposta:"Som Forte",dica:"O Som Forte foi tocado com volume muito maior."},
    ]},
    {titulo:"Emoções",emoji:"😊",exercicios:[
      {id:"m3e0",pergunta:"Que emoção você identifica?",btn:{label:"▶ Ouvir",action:()=>falar("Hoje foi um dia incrível, estou muito feliz!",1.4,1.1)},opcoes:["Alegria","Tristeza","Raiva","Medo"],resposta:"Alegria",dica:"Tom agudo, rápido e animado = alegria."},
      {id:"m3e1",pergunta:"Que emoção você identifica?",btn:{label:"▶ Ouvir",action:()=>falar("Não sei o que fazer, tudo parece muito difícil.",0.8,0.8)},opcoes:["Alegria","Tristeza","Frustração","Ansiedade"],resposta:"Tristeza",dica:"Tom baixo e pausado = tristeza."},
    ]},
  ];
  function responder(exId,val,correto){
    const c=val===correto;
    setRespostas(r=>({...r,[exId]:val}));
    setFeedbacks(f=>({...f,[exId]:c}));
    if(!respostas[exId]){setTotal(t=>t+1);if(c)setScore(s=>s+1);}
  }
  const mod=MODULOS[modulo];
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,padding:"8px 12px",background:"var(--purple-soft)",borderRadius:8}}>
        <span style={{fontSize:13,fontWeight:600,color:"var(--purple)"}}>🏆 {score}/{total}</span>
        <span style={{fontSize:12,color:"var(--purple)"}}>{Math.round(total>0?score/total*100:0)}% de acerto</span>
      </div>
      <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:16,paddingBottom:4}}>
        {MODULOS.map((m,i)=><button key={i} onClick={()=>setModulo(i)} style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid",borderColor:modulo===i?"var(--purple)":"#e5e7eb",background:modulo===i?"var(--purple)":"white",color:modulo===i?"white":"#6b7280",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{m.emoji} {m.titulo}</button>)}
      </div>
      <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>{mod.emoji} {mod.titulo}</div>
      {mod.exercicios.map(ex=><div key={ex.id} style={{background:"#f9fafb",borderRadius:12,padding:14,marginBottom:14,border:"1px solid #e5e7eb"}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>{ex.pergunta}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          <button className="btn btn-purple" style={{fontSize:12}} onClick={()=>{setTocando(ex.id);ex.btn.action();setTimeout(()=>setTocando(null),2000);}}>{tocando===ex.id?"🔊 Tocando...":ex.btn.label}</button>
          {ex.btn2&&<button className="btn btn-outline" style={{fontSize:12}} onClick={()=>ex.btn2.action()}>{ex.btn2.label}</button>}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          {ex.opcoes.map((op,oi)=><button key={oi} onClick={()=>responder(ex.id,op,ex.resposta)} style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid",fontSize:13,cursor:"pointer",fontWeight:500,borderColor:respostas[ex.id]===op?(feedbacks[ex.id]?"#059669":"#dc2626"):"#e5e7eb",background:respostas[ex.id]===op?(feedbacks[ex.id]?"#d1fae5":"#fee2e2"):"white",color:respostas[ex.id]===op?(feedbacks[ex.id]?"#059669":"#dc2626"):"#374151"}}>{op}</button>)}
        </div>
        {respostas[ex.id]&&<div style={{padding:"8px 12px",borderRadius:8,background:feedbacks[ex.id]?"#d1fae5":"#fee2e2",fontSize:12,color:feedbacks[ex.id]?"#059669":"#dc2626",fontWeight:600}}>{feedbacks[ex.id]?"✓ Correto! ":"✗ Incorreto. "}{ex.dica}</div>}
      </div>)}
    </div>
  );
}

// ── Anamnese ────────────────────────────────────────────────────────────────
function FerramentaAnamnese(){
  const PERFIS=["Criança (0-12)","Adolescente (13-17)","Adulto (18-59)","Idoso (60+)"];
  const SECOES={"Criança (0-12)":["Identificação","Gestação e Parto","Marcos do Desenvolvimento","Alimentação e Sono","Desenvolvimento Motor","Linguagem","Comportamento","Escolaridade","Histórico de Saúde","Dinâmica Familiar"],"Adolescente (13-17)":["Identificação","Histórico Escolar","Relações Sociais","Comportamento e Humor","Sexualidade","Substâncias","Histórico de Saúde","Dinâmica Familiar"],"Adulto (18-59)":["Identificação","Queixa Principal","Histórico da Queixa","Histórico Psicológico","Saúde Física","Relacionamentos","Trabalho e Estudo","Sono e Alimentação","Histórico Familiar"],"Idoso (60+)":["Identificação","Queixa Principal","Histórico Médico","Medicamentos","Cognição","Mobilidade","Sono","Suporte Social","Dinâmica Familiar"]};
  const [perfil,setPerfil]=useState("");
  const [secao,setSecao]=useState(0);
  const [respostas,setRespostas]=useState({});
  const [concluido,setConcluido]=useState(false);
  if(!perfil)return(<div style={{textAlign:"center",padding:"20px 0"}}>
    <div style={{fontSize:44,marginBottom:12}}>📄</div>
    <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:14}}>Selecione o perfil:</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:320,margin:"0 auto"}}>
      {PERFIS.map(p=><button key={p} className="btn btn-outline" style={{padding:"12px 8px",fontSize:12,fontWeight:600}} onClick={()=>setPerfil(p)}>{p}</button>)}
    </div>
  </div>);
  const secs=SECOES[perfil]||[];
  if(concluido)return(<div style={{textAlign:"center",padding:40}}>
    <div style={{fontSize:48,marginBottom:12}}>✅</div>
    <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:8}}>Anamnese Concluída!</div>
    <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>{perfil} · {secs.length} seções</div>
    <button className="btn btn-purple" onClick={()=>{setPerfil("");setSecao(0);setRespostas({});setConcluido(false);}}>Nova Anamnese</button>
  </div>);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginBottom:8}}><span style={{color:"var(--purple)",fontWeight:600}}>{perfil}</span><span>Seção {secao+1}/{secs.length}</span></div>
    <div style={{background:"#e5e7eb",borderRadius:20,height:5,marginBottom:16}}><div style={{background:"var(--purple)",height:5,borderRadius:20,width:(secao/secs.length*100)+"%",transition:"width .3s"}}/></div>
    <div style={{fontFamily:"var(--font-display)",fontSize:17,fontWeight:600,marginBottom:12}}>{secs[secao]}</div>
    <TextAreaVoz className="form-input" rows={5} value={respostas[secs[secao]]||""} onChange={e=>setRespostas(r=>({...r,[secs[secao]]:e.target.value}))} placeholder={"Registre as informações sobre "+secs[secao].toLowerCase()+"..."}/>
    <div style={{display:"flex",gap:10,marginTop:14,justifyContent:"space-between"}}>
      <button className="btn btn-ghost" onClick={()=>setSecao(s=>Math.max(0,s-1))} disabled={secao===0}>← Anterior</button>
      {secao<secs.length-1?<button className="btn btn-purple" onClick={()=>setSecao(s=>s+1)}>Próxima →</button>:<button className="btn btn-purple" onClick={()=>setConcluido(true)}>✓ Concluir</button>}
    </div>
  </div>);
}

// ── Diário Terapêutico ──────────────────────────────────────────────────────
function FerramentaDiario({ user }){
  const [entradas, setEntradas] = useState([]);
  const [texto,    setTexto]    = useState("");
  const [tag,      setTag]      = useState("geral");
  const [salvando, setSalvando] = useState(false);
  const [msg,      setMsg]      = useState("");
  const [verEntrada, setVerEntrada] = useState(null);
  const [gravando,   setGravando]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const recRef = useRef(null);

  const TAGS = [
    {v:"geral",     l:"Geral",     e:"📝"},
    {v:"gratidao",  l:"Gratidão",  e:"🙏"},
    {v:"desafio",   l:"Desafio",   e:"⚡"},
    {v:"conquista", l:"Conquista", e:"🏆"},
    {v:"emocao",    l:"Emoção",    e:"💜"},
  ];

  useEffect(()=>{
    if(!user?.id){setLoading(false);return;}
    const unsub = db.collection("clinica_diario")
      .where("pacienteId","==",user.id)
      .orderBy("createdAt","desc")
      .onSnapshot(snap=>{
        setEntradas(snap.docs.map(d=>({id:d.id,...d.data()})));
        setLoading(false);
      }, ()=>setLoading(false));
    return ()=>unsub();
  },[user?.id]);

  function toggleGravacao(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){alert("Seu navegador não suporta reconhecimento de voz. Tente o Chrome.");return;}
    if(gravando){
      recRef.current?.stop();
      setGravando(false);
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e=>{
      const transcript = Array.from(e.results).map(r=>r[0].transcript).join(" ");
      setTexto(t => {
        const base = t.replace(/\s*\[gravando\.\.\.\]$/,"").trimEnd();
        return base ? base+" "+transcript : transcript;
      });
    };
    rec.onerror = ()=>setGravando(false);
    rec.onend   = ()=>setGravando(false);
    recRef.current = rec;
    rec.start();
    setGravando(true);
  }

  async function salvar(){
    if(!texto.trim()){setMsg("Escreva ou grave algo antes de salvar.");setTimeout(()=>setMsg(""),2500);return;}
    setSalvando(true);
    try {
      await db.collection("clinica_diario").add({
        pacienteId: user?.id || "",
        pacienteNome: user?.nome || "",
        texto: texto.trim(),
        tag,
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setTexto(""); setTag("geral");
      setMsg("✓ Entrada salva! 💜");
      setTimeout(()=>setMsg(""),2500);
    } catch(e){ setMsg("Erro ao salvar: "+e.message); }
    setSalvando(false);
  }

  async function excluir(id){
    if(!confirm("Excluir esta entrada?"))return;
    await db.collection("clinica_diario").doc(id).delete();
    setVerEntrada(null);
  }

  if(verEntrada) return(
    <div style={{padding:"0 4px"}}>
      <button className="btn btn-ghost" style={{marginBottom:16,padding:"8px 12px"}} onClick={()=>setVerEntrada(null)}>
        <Icon name="arrow-left" size={16}/> Voltar
      </button>
      <div style={{background:"#f9f5ff",borderRadius:14,padding:20,marginBottom:12,border:"1px solid #ede9fe"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,color:"var(--text-muted)"}}>{verEntrada.data} às {verEntrada.hora}</span>
          <span style={{fontSize:11,color:"var(--purple)",background:"#ede9fe",borderRadius:20,padding:"2px 10px"}}>
            {TAGS.find(t=>t.v===verEntrada.tag)?.e} {TAGS.find(t=>t.v===verEntrada.tag)?.l}
          </span>
        </div>
        <div style={{fontSize:14,lineHeight:1.8,color:"var(--gray-800)",whiteSpace:"pre-wrap"}}>{verEntrada.texto}</div>
      </div>
      <button className="btn btn-ghost" style={{color:"#dc2626",borderColor:"#fca5a5",fontSize:13}} onClick={()=>excluir(verEntrada.id)}>
        <Icon name="trash-2" size={14}/> Excluir entrada
      </button>
    </div>
  );

  return(
    <div style={{padding:"0 4px"}}>
      {/* Nova entrada */}
      <div style={{background:"#faf5ff",borderRadius:14,padding:16,marginBottom:20,border:"1px solid #ede9fe"}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:600,marginBottom:12,color:"var(--purple)"}}>
          📓 Nova entrada
        </div>

        {/* Tag */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Categoria</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {TAGS.map(t=>(
              <button key={t.v} onClick={()=>setTag(t.v)}
                style={{fontSize:12,padding:"4px 10px",borderRadius:20,border:tag===t.v?"2px solid var(--purple)":"1px solid #e5e7eb",background:tag===t.v?"#ede9fe":"white",color:tag===t.v?"var(--purple)":"var(--gray-600)",cursor:"pointer"}}>
                {t.e} {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* Texto + microfone */}
        <div style={{position:"relative"}}>
          <textarea value={texto} onChange={e=>setTexto(e.target.value)}
            placeholder="Escreva ou use o microfone para falar sobre o seu dia..."
            style={{width:"100%",minHeight:120,borderRadius:10,border:gravando?"2px solid var(--purple)":"1px solid #e5e7eb",padding:"10px 44px 10px 14px",fontSize:14,fontFamily:"var(--font-body)",resize:"vertical",outline:"none",lineHeight:1.7,boxSizing:"border-box",transition:"border .2s"}}/>
          <button onClick={toggleGravacao} title={gravando?"Parar gravação":"Falar"}
            style={{position:"absolute",right:8,bottom:10,background:gravando?"#7B00C4":"#f3f0ff",border:"none",borderRadius:8,padding:"6px 8px",cursor:"pointer",color:gravando?"white":"var(--purple)",fontSize:18,lineHeight:1,boxShadow:gravando?"0 0 0 3px #7B00C430":"none",transition:"all .2s"}}>
            🎙️
          </button>
        </div>
        {gravando && <div style={{fontSize:12,color:"var(--purple)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"#7B00C4",display:"inline-block",animation:"pulse-slow 1s infinite"}}/>
          Gravando... fale normalmente. Clique 🎙️ para parar.
        </div>}

        {msg && <div style={{fontSize:13,color:"var(--purple)",marginTop:6,fontWeight:500}}>{msg}</div>}

        <button className="btn btn-purple" style={{width:"100%",marginTop:10}} onClick={salvar} disabled={salvando}>
          <Icon name="save" size={16}/> {salvando?"Salvando...":"Salvar entrada"}
        </button>
      </div>

      {/* Entradas anteriores */}
      {loading && <div style={{textAlign:"center",color:"var(--text-muted)",fontSize:13,padding:16}}>Carregando...</div>}
      {!loading && entradas.length>0 && (
        <div>
          <div style={{fontWeight:600,fontSize:14,marginBottom:10,color:"var(--gray-700)"}}>
            Entradas anteriores ({entradas.length})
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {entradas.map(en=>(
              <div key={en.id} onClick={()=>setVerEntrada(en)}
                style={{background:"white",borderRadius:12,padding:"12px 14px",border:"1px solid #e5e7eb",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 8px #7B00C420"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:12,color:"var(--text-muted)"}}>{en.data} · {en.hora}</span>
                  <span style={{fontSize:11,color:"var(--purple)"}}>{TAGS.find(t=>t.v===en.tag)?.e}</span>
                </div>
                <div style={{fontSize:13,color:"var(--gray-700)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{en.texto}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && entradas.length===0 && (
        <div style={{textAlign:"center",padding:"24px 0",color:"var(--text-muted)",fontSize:13}}>
          Nenhuma entrada ainda. Comece escrevendo hoje! 💜
        </div>
      )}
    </div>
  );
}


// ── Modal Visualizar Ferramenta ─────────────────────────────────────────────
function ModalVisualizarFerramenta({recurso,onClose,user}){
  function renderFerramenta(){
    const k=recurso.formularioKey;
    if(k==="breathing-478")      return <FerramentaRespiracao/>;
    if(k==="muscle-relaxation")  return <FerramentaRelaxamento/>;
    if(k==="decision-tree")      return <FerramentaArvore/>;
    if(k==="abc-record")         return <FerramentaABC/>;
    if(k==="anxiety-management") return <FerramentaGestaoAnsiedade/>;
    if(k==="emotional-eating")   return <FerramentaRastreamento/>;
    if(k==="treino-neuro-auditivo") return <FerramentaTreino/>;
    if(k==="entrevista-clinica") return(
      <div style={{textAlign:"center",padding:"30px 20px"}}>
        <div style={{fontSize:44,marginBottom:12}}>📝</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:8}}>Entrevista Clínica Inicial</div>
        <p style={{fontSize:13,color:"#6b7280",marginBottom:20,lineHeight:1.7}}>Instrumento de avaliação com perfil etário, escalas de observação, questionário de habilidades e hipóteses DSM-5.</p>
        <a href="https://luciakratz-arch.github.io/entrevista-inicial/" target="_blank" className="btn btn-purple" style={{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:8}}>🔗 Abrir Entrevista Clínica</a>
      </div>
    );
    if(k==="anamnese") return <FerramentaAnamnese/>;
    if(k==="diario-terapeutico") return <FerramentaDiario user={user}/>;
    return <div style={{textAlign:"center",padding:40,color:"#6b7280"}}>Ferramenta não configurada.</div>;
  }
  const EMOJIS={relaxamento:"💨",tcc:"🧠",avaliacao:"📋",musicoterapia:"🎵",outro:"🔧"};
  const ICONES_FERRAMENTA={"breathing-478":"💨","muscle-relaxation":"💪","decision-tree":"🌳","abc-record":"📋","anxiety-management":"🎯","emotional-eating":"🍃","entrevista-clinica":"📝","anamnese":"📄","treino-neuro-auditivo":"🎵","diario-terapeutico":"📓"};
  const iconeRecurso = ICONES_FERRAMENTA?.[recurso.formularioKey] || EMOJIS[recurso.categoria] || "🔧";
  return(
    <div>
      <button className="btn btn-ghost" style={{marginBottom:16,padding:"8px 12px"}} onClick={onClose}>
        <Icon name="arrow-left" size={16}/> Voltar para Recursos
      </button>
      <div style={{background:"#f9f5ff",border:"1px solid #e9d5ff",borderRadius:8,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#7c3aed"}}>
        <Icon name="eye" size={14}/> <strong>Visualização do paciente</strong> — assim a ferramenta aparecerá na área do paciente
      </div>
      <div className="card">
        <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16,paddingBottom:16,borderBottom:"1px solid #f3f4f6"}}>
          <div style={{width:52,height:52,borderRadius:12,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:26}}>
            {iconeRecurso}
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600}}>{recurso.titulo}</div>
            <div style={{fontSize:13,color:"#6b7280",marginTop:4}}>{recurso.descricao}</div>
            {recurso.mediaUrl&&<a href={recurso.mediaUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:8,padding:"6px 14px",borderRadius:20,background:"var(--purple-soft)",color:"var(--purple)",fontSize:12,fontWeight:600,textDecoration:"none",border:"1px solid #e9d5ff"}}>
              ▶ Ouvir / Assistir
            </a>}
          </div>
        </div>
        {renderFerramenta()}
      </div>
    </div>
  );
}

// ── Protocolo de Terapia de Casais ──────────────────────────────────────────
const PROTOCOLO_CASAIS = [
  {
    stage:0, titulo:"Diagnóstico Inicial de Casal", subtitulo:"Avaliação inicial do bem-estar conjugal antes da jornada", emoji:"🔍", cor:"#7c3aed", bg:"#f5f3ff",
    atividades:[
      {id:"inventario-bem-estar", titulo:"Inventário de Bem-Estar de Casais", desc:"42 questões sobre comunicação, resolução de conflitos, intimidade emocional, satisfação sexual e cooperação"},
      {id:"roda-vida-relacionamento", titulo:"Roda da Vida do Relacionamento", desc:"Avalie 8 dimensões do relacionamento em formato visual"},
      {id:"3-metas", titulo:"Nossas 3 Metas do Relacionamento", desc:"Definam juntos as 3 principais metas terapêuticas"},
      {id:"quem-sou", titulo:"Quem Eu Sou no Relacionamento", desc:"Reflexão individual sobre identidade no relacionamento"},
      {id:"o-que-quero", titulo:"O Que Eu Quero e Não Quero Mais", desc:"Mapeamento de expectativas e limites"}
    ]
  },
  {
    stage:1, titulo:"Reconexão e Segurança Emocional", subtitulo:"Reduzir defensividade e aumentar conexão emocional", emoji:"💚", cor:"#059669", bg:"#d1fae5",
    atividades:[
      {id:"detalhes-dia", titulo:"Detalhes do Dia a Dia", desc:"Compartilhem os pequenos detalhes que fazem diferença na conexão diária"},
      {id:"plano-casal-ocupado", titulo:"Plano de Ação para um Casal Ocupado Demais", desc:"Estratégias práticas para manter conexão na correria"}
    ]
  },
  {
    stage:2, titulo:"Identidade e Vínculo do Casal", subtitulo:"Resgatar identidade afetiva e visão compartilhada", emoji:"💜", cor:"#7c3aed", bg:"#ede9fe",
    atividades:[
      {id:"renovando-votos", titulo:"Renovando os Votos", desc:"Recontem a história do casal e renovem seus compromissos através de 5 narrativas guiadas"}
    ]
  },
  {
    stage:3, titulo:"Conceitualização Cognitiva", subtitulo:"Identificar padrões cognitivos e crenças relacionais", emoji:"🧠", cor:"#0891b2", bg:"#e0f2fe",
    atividades:[
      {id:"mapa-cognitivo", titulo:"Mapa Cognitivo do Relacionamento", desc:"Identificar pensamentos automáticos, crenças e padrões que afetam o relacionamento"}
    ]
  },
  {
    stage:4, titulo:"Reestruturação Relacional", subtitulo:"Criar novos padrões emocionais e comportamentais", emoji:"🌱", cor:"#16a34a", bg:"#dcfce7",
    atividades:[
      {id:"novos-padroes", titulo:"Novos Padrões Relacionais", desc:"Desenvolver e praticar novos comportamentos e respostas emocionais"}
    ]
  }
];

const CHECKIN_SEMANAL = [
  "Hoje eu me sinto conectado(a) com meu parceiro(a)",
  "Sinto que fui ouvido(a) esta semana",
  "Expressamos afeto um pelo outro",
  "Resolvemos conflitos de forma saudável",
  "Dedicamos tempo de qualidade juntos",
  "Sinto que somos uma equipe",
  "Me sinto seguro(a) emocionalmente com meu parceiro(a)"
];

// ── Inventário de Bem-Estar de Casais (42 questões) ──
const INVENTARIO_QUESTOES = [
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

const INVENTARIO_CATEGORIAS = [
  {label:"Comunicação Eficaz",          cor:"#6366f1", questoes:[2,5,11,12,13,19,20]},
  {label:"Resolução de Conflitos",       cor:"#f59e0b", questoes:[4,8,14,18,23,28,31]},
  {label:"Intimidade Emocional",         cor:"#ec4899", questoes:[7,10,17,22,24,29,35]},
  {label:"Satisfação Sexual",            cor:"#dc2626", questoes:[3,6,9,15,21,25,27]},
  {label:"Cooperação e Colaboração",     cor:"#16a34a", questoes:[1,16,26,37,38,39,41]},
  {label:"Senso de Humor e Lazer",       cor:"#0891b2", questoes:[30,32,33,34,36,40,42]},
];

function InventarioBemEstarCasal({ onVoltar }) {
  const [respostas, setRespostas] = useState({});
  const [pagina, setPagina]       = useState(0); // 0=instrucoes, 1-7=grupos de 6q, 8=resultado
  const [salvando, setSalvando]   = useState(false);

  const POR_PAG = 6;
  const totalPaginas = Math.ceil(INVENTARIO_QUESTOES.length / POR_PAG);

  function responder(n, val) { setRespostas(r=>({...r,[n]:val})); }

  function calcular() {
    return INVENTARIO_CATEGORIAS.map(cat => {
      const soma = cat.questoes.reduce((acc, q) => acc + (respostas[q] || 0), 0);
      const pct  = Math.round(((soma - 7) / 28) * 100);
      return { ...cat, soma, pct: Math.max(0, pct) };
    });
  }

  const questoesPagina = INVENTARIO_QUESTOES.slice((pagina-1)*POR_PAG, pagina*POR_PAG);
  const totalRespondidas = Object.keys(respostas).length;
  const completo = totalRespondidas === 42;

  // Tela de instruções
  if (pagina === 0) return (
    <div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:48,marginBottom:12}}>💑</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>Inventário de Bem-Estar de Casais</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16,lineHeight:1.7,maxWidth:480,margin:"0 auto 16px"}}>
        Este questionário avalia 6 dimensões importantes do relacionamento: Comunicação, Resolução de Conflitos, Intimidade Emocional, Satisfação Sexual, Cooperação e Senso de Humor.<br/><br/>
        <strong>42 questões</strong> · Responda com honestidade · Não há respostas certas ou erradas<br/>
        <em>Seja rápido, não pondere!</em>
      </div>
      <button className="btn btn-purple" style={{fontSize:15,padding:"12px 32px"}} onClick={()=>setPagina(1)}>
        <Icon name="play" size={16}/> Iniciar Inventário
      </button>
    </div>
  );

  // Tela de resultado
  if (pagina === totalPaginas + 1) {
    const resultados = calcular();
    const totalGeral = resultados.reduce((a,r)=>a+r.soma,0);
    return (
      <div>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:40,marginBottom:8}}>📊</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>Resultado do Inventário</div>
          <div style={{fontSize:13,color:"var(--text-muted)",marginTop:4}}>Pontuação total: {totalGeral} / 252</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:24}}>
          {resultados.map(cat=>(
            <div key={cat.label}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,marginBottom:6}}>
                <span style={{color:cat.cor}}>{cat.label}</span>
                <span>{cat.soma} / 35</span>
              </div>
              <div style={{background:"#f3f4f6",borderRadius:20,height:12,overflow:"hidden"}}>
                <div style={{
                  width:cat.pct+"%", height:"100%",
                  background:cat.cor,
                  borderRadius:20,
                  transition:"width 1s ease"
                }}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text-muted)",marginTop:2}}>
                <span>Baixo (7)</span>
                <span style={{fontWeight:600,color:cat.cor}}>{cat.pct}%</span>
                <span>Alto (35)</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:"#f9fafb",borderRadius:10,padding:14,marginBottom:16,fontSize:12,color:"var(--gray-600)",lineHeight:1.7}}>
          <strong>Como interpretar:</strong> Pontuações mais altas (próximas de 35) indicam maior satisfação naquela dimensão. Pontuações baixas (próximas de 7) indicam áreas que merecem atenção terapêutica.
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-ghost" style={{flex:1}} onClick={()=>{setRespostas({});setPagina(0);}}>
            <Icon name="rotate-ccw" size={15}/> Refazer
          </button>
          <button className="btn btn-purple" style={{flex:1}} onClick={onVoltar}>
            <Icon name="check" size={15}/> Concluir
          </button>
        </div>
      </div>
    );
  }

  // Páginas de questões
  const progresso = Math.round((totalRespondidas / 42) * 100);
  return (
    <div>
      {/* Barra de progresso */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>
          <span>Questões {(pagina-1)*POR_PAG+1}–{Math.min(pagina*POR_PAG,42)} de 42</span>
          <span>{totalRespondidas} respondidas · {progresso}%</span>
        </div>
        <div style={{background:"#f3f4f6",borderRadius:20,height:6}}>
          <div style={{width:progresso+"%",height:"100%",background:"var(--purple)",borderRadius:20,transition:"width .3s"}}/>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        {questoesPagina.map(q=>(
          <div key={q.n} style={{background:"#fafafa",borderRadius:10,padding:16,border:"1px solid var(--gray-100)"}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:12,lineHeight:1.5}}>
              <span style={{color:"var(--purple)",marginRight:6}}>{q.n}.</span>{q.texto}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {q.opcoes.map((op,i)=>(
                <button key={i} onClick={()=>responder(q.n, i+1)}
                  style={{
                    display:"flex",alignItems:"center",gap:10,
                    padding:"8px 12px",borderRadius:8,
                    border:`1.5px solid ${respostas[q.n]===i+1?"var(--purple)":"var(--gray-200)"}`,
                    background:respostas[q.n]===i+1?"var(--purple-bg)":"white",
                    cursor:"pointer",textAlign:"left",fontFamily:"inherit",fontSize:13,
                    color:respostas[q.n]===i+1?"var(--purple)":"var(--gray-700)",
                    fontWeight:respostas[q.n]===i+1?600:400,
                    transition:"all .15s"
                  }}>
                  <div style={{
                    width:18,height:18,borderRadius:"50%",flexShrink:0,
                    border:`2px solid ${respostas[q.n]===i+1?"var(--purple)":"var(--gray-300)"}`,
                    background:respostas[q.n]===i+1?"var(--purple)":"white",
                    display:"flex",alignItems:"center",justifyContent:"center"
                  }}>
                    {respostas[q.n]===i+1&&<div style={{width:6,height:6,borderRadius:"50%",background:"white"}}/>}
                  </div>
                  <span style={{fontWeight:500,fontSize:11,color:"var(--gray-400)",minWidth:16}}>{String.fromCharCode(97+i)})</span>
                  {op}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Navegação */}
      <div style={{display:"flex",gap:10,marginTop:24}}>
        <button className="btn btn-ghost" onClick={()=>setPagina(p=>p-1)} disabled={pagina===1}>
          <Icon name="arrow-left" size={15}/> Anterior
        </button>
        <div style={{flex:1}}/>
        {pagina < totalPaginas ? (
          <button className="btn btn-purple" onClick={()=>setPagina(p=>p+1)}>
            Próximo <Icon name="arrow-right" size={15}/>
          </button>
        ) : (
          <button className="btn btn-purple" onClick={()=>setPagina(totalPaginas+1)}
            disabled={!completo} style={{opacity:completo?1:0.5}}>
            {completo ? "Ver Resultado" : `Faltam ${42-totalRespondidas}`} <Icon name="bar-chart-2" size={15}/>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Admin: Roda da Vida ──
const RODA_DIMS_ADM = [
  "Comunicação","Família","Sexualidade","Estresse e Pressão",
  "Divisão","Ciúmes","Espiritualidade","Diferenças e Conflitos",
  "Estabilidade Financeira","Rel. de Poder","Mudanças","Expectativas e Equilíbrio"
];

function AdminRodaVida({ onVoltar }) {
  const [valores, setValores] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId:"admin", casalId:"admin",
        atividadeId:"roda-vida-relacionamento",
        respostas:valores,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  function RodaSVG() {
    const n=RODA_DIMS_ADM.length, cx=120,cy=120,r=90;
    const pontos = RODA_DIMS_ADM.map((_,i)=>{
      const ang=(i/n)*2*Math.PI-Math.PI/2;
      const v=(valores[RODA_DIMS_ADM[i]]||0)/10;
      return [cx+r*v*Math.cos(ang),cy+r*v*Math.sin(ang)];
    });
    const pts=pontos.map(p=>p.join(",")).join(" ");
    const grades=[2,4,6,8,10].map(g=>{
      const gpts=RODA_DIMS_ADM.map((_,i)=>{
        const ang=(i/n)*2*Math.PI-Math.PI/2;
        return [cx+r*(g/10)*Math.cos(ang),cy+r*(g/10)*Math.sin(ang)].join(",");
      }).join(" ");
      return <polygon key={g} points={gpts} fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>;
    });
    const eixos=RODA_DIMS_ADM.map((_,i)=>{
      const ang=(i/n)*2*Math.PI-Math.PI/2;
      return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(ang)} y2={cy+r*Math.sin(ang)} stroke="#e5e7eb" strokeWidth="0.5"/>;
    });
    const labels=RODA_DIMS_ADM.map((d,i)=>{
      const ang=(i/n)*2*Math.PI-Math.PI/2;
      return <text key={i} x={cx+(r+14)*Math.cos(ang)} y={cy+(r+14)*Math.sin(ang)} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fill="#6b7280">{d}</text>;
    });
    return (
      <svg width="240" height="240" viewBox="0 0 240 240" style={{display:"block",margin:"0 auto 16px"}}>
        {grades}{eixos}
        <polygon points={pts} fill="#7B00C440" stroke="#7B00C4" strokeWidth="1.5"/>
        {labels}
      </svg>
    );
  }

  return (
    <div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16,lineHeight:1.6}}>
        Avalie cada dimensão de 0 a 10. <strong>0</strong> = nenhuma tensão · <strong>10</strong> = tensão máxima.
      </div>
      {Object.keys(valores).length>0 && <RodaSVG/>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {RODA_DIMS_ADM.map(dim=>(
          <div key={dim}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>{dim}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min="0" max="10" step="1"
                value={valores[dim]||0}
                onChange={e=>setValores(v=>({...v,[dim]:parseInt(e.target.value)}))}
                style={{flex:1,accentColor:"var(--purple)"}}/>
              <span style={{width:18,textAlign:"center",fontWeight:700,fontSize:12,color:"var(--purple)"}}>{valores[dim]||0}</span>
            </div>
          </div>
        ))}
      </div>
      {salvo&&<div style={{background:"#d1fae5",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13,color:"#065f46"}}>✓ Salvo com sucesso!</div>}
      <button className="btn btn-purple" style={{width:"100%"}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar Roda da Vida"}
      </button>
    </div>
  );
}

// ── Admin: Nossas 3 Metas ──
function AdminMetas({ onVoltar }) {
  const [metas, setMetas] = useState([
    {titulo:"",indicador:"",dataInicio:""},
    {titulo:"",indicador:"",dataInicio:""},
    {titulo:"",indicador:"",dataInicio:""},
  ]);
  const [metasSalvas, setMetasSalvas] = useState([]);
  const [evolucoes,   setEvolucoes]   = useState({});
  const [novaEv,      setNovaEv]      = useState({});
  const [salvando,    setSalvando]    = useState(false);
  const [salvo,       setSalvo]       = useState(false);
  const [aba,         setAba]         = useState("definir"); // definir | evolucao

  useEffect(()=>{
    db.collection("clinica_metas_casal")
      .where("tipo","==","admin")
      .orderBy("createdAt","desc").limit(3)
      .onSnapshot(s=>setMetasSalvas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[]);

  useEffect(()=>{
    metasSalvas.forEach(m=>{
      db.collection("clinica_metas_casal").doc(m.id).collection("evolucoes")
        .orderBy("data","asc")
        .onSnapshot(s=>setEvolucoes(ev=>({...ev,[m.id]:s.docs.map(d=>({id:d.id,...d.data()}))})),()=>{});
    });
  },[metasSalvas]);

  async function salvarMetas() {
    const validas = metas.filter(m=>m.titulo.trim());
    if(!validas.length){alert("Digite pelo menos 1 meta.");return;}
    setSalvando(true);
    try {
      // Arquiva metas antigas
      const antigas = await db.collection("clinica_metas_casal").where("tipo","==","admin").where("status","==","ativa").get();
      const batch = db.batch();
      antigas.docs.forEach(d=>batch.update(d.ref,{status:"arquivada"}));
      await batch.commit();
      // Cria novas
      for(const m of validas){
        await db.collection("clinica_metas_casal").add({
          ...m, tipo:"admin", status:"ativa",
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      setSalvo(true); setAba("evolucao");
    } catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  async function registrarEvolucao(metaId) {
    const ev = novaEv[metaId];
    if(!ev?.nota||!ev?.data){alert("Preencha nota e data.");return;}
    await db.collection("clinica_metas_casal").doc(metaId).collection("evolucoes").add({
      nota: parseFloat(ev.nota), data:ev.data,
      obs: ev.obs||"",
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    setNovaEv(n=>({...n,[metaId]:{nota:"",data:new Date().toISOString().slice(0,10),obs:""}}));
  }

  function GraficoLinha({evs}) {
    if(!evs||evs.length<2) return <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"center",padding:8}}>Registre pelo menos 2 evoluções para ver o gráfico</div>;
    const w=260,h=80,pad=20;
    const notas=evs.map(e=>e.nota);
    const min=0,max=10;
    const pts=evs.map((e,i)=>{
      const x=pad+(i/(evs.length-1))*(w-2*pad);
      const y=h-pad-((e.nota-min)/(max-min))*(h-2*pad);
      return [x,y];
    });
    const path="M"+pts.map(p=>p.join(",")).join(" L");
    return (
      <svg width={w} height={h} style={{display:"block",margin:"8px auto"}}>
        {[0,2,4,6,8,10].map(v=>{
          const y=h-pad-((v-min)/(max-min))*(h-2*pad);
          return <g key={v}><line x1={pad} y1={y} x2={w-pad} y2={y} stroke="#f3f4f6" strokeWidth="1"/><text x={pad-4} y={y} textAnchor="end" fontSize="7" fill="#9ca3af" dominantBaseline="middle">{v}</text></g>;
        })}
        <path d={path} fill="none" stroke="#7B00C4" strokeWidth="2"/>
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="3" fill="#7B00C4"/>
            <text x={p[0]} y={p[1]-6} textAnchor="middle" fontSize="7" fill="#7B00C4" fontWeight="bold">{evs[i].nota}</text>
          </g>
        ))}
      </svg>
    );
  }

  return (
    <div>
      {/* Abas */}
      <div style={{display:"flex",borderBottom:"1px solid var(--gray-200)",marginBottom:16}}>
        {[{id:"definir",label:"📋 Definir Metas"},{id:"evolucao",label:"📈 Registrar Evolução"}].map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)}
            style={{padding:"10px 16px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit",
              fontWeight:aba===a.id?700:400,
              borderBottom:aba===a.id?"2px solid var(--purple)":"2px solid transparent",
              color:aba===a.id?"var(--purple)":"var(--text-muted)"}}>
            {a.label}
          </button>
        ))}
      </div>

      {aba==="definir"&&(
        <div>
          <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>
            Defina metas quantificáveis com indicador de progresso. Cada cônjuge define as suas pelo portal.
          </div>
          {[0,1,2].map(i=>(
            <div key={i} style={{background:"#fafafa",borderRadius:10,padding:14,marginBottom:12,border:"1px solid var(--gray-100)"}}>
              <div style={{fontWeight:600,fontSize:13,color:"var(--purple)",marginBottom:10}}>Meta {i+1}</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <input className="form-input" value={metas[i].titulo}
                  onChange={e=>{const n=[...metas];n[i]={...n[i],titulo:e.target.value};setMetas(n);}}
                  placeholder="Ex: Melhorar a comunicação diária"/>
                <input className="form-input" value={metas[i].indicador}
                  onChange={e=>{const n=[...metas];n[i]={...n[i],indicador:e.target.value};setMetas(n);}}
                  placeholder="Indicador quantificável: Ex: De 3 para 8 na escala de comunicação"/>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <label style={{fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>Data de início:</label>
                  <input type="date" className="form-input" value={metas[i].dataInicio}
                    onChange={e=>{const n=[...metas];n[i]={...n[i],dataInicio:e.target.value};setMetas(n);}}
                    style={{flex:1}}/>
                </div>
              </div>
            </div>
          ))}
          {salvo&&<div style={{background:"#d1fae5",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13,color:"#065f46"}}>✓ Metas salvas! Aparecem no dashboard do casal.</div>}
          <button className="btn btn-purple" style={{width:"100%"}} onClick={salvarMetas} disabled={salvando}>
            {salvando?"Salvando...":"💾 Salvar metas"}
          </button>
        </div>
      )}

      {aba==="evolucao"&&(
        <div>
          {metasSalvas.length===0
            ? <div style={{textAlign:"center",padding:24,fontSize:13,color:"var(--text-muted)"}}>Defina as metas primeiro na aba "Definir Metas".</div>
            : metasSalvas.map(m=>{
                const evs = evolucoes[m.id]||[];
                const ev  = novaEv[m.id]||{nota:"",data:new Date().toISOString().slice(0,10),obs:""};
                return (
                  <div key={m.id} style={{background:"#fafafa",borderRadius:12,padding:16,marginBottom:16,border:"1px solid var(--gray-100)"}}>
                    <div style={{fontWeight:700,fontSize:14,color:"var(--purple)",marginBottom:2}}>{m.titulo}</div>
                    {m.indicador&&<div style={{fontSize:12,color:"var(--text-muted)",marginBottom:10}}>🎯 {m.indicador}</div>}

                    <GraficoLinha evs={evs}/>

                    {/* Histórico */}
                    {evs.length>0&&(
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:600,color:"var(--text-muted)",marginBottom:6}}>HISTÓRICO</div>
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {[...evs].reverse().slice(0,5).map(e=>(
                            <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,padding:"5px 10px",borderRadius:6,background:"white",border:"1px solid var(--gray-100)"}}>
                              <span style={{color:"var(--text-muted)"}}>{e.data?.split("-").reverse().join("/")}</span>
                              <span style={{fontWeight:700,color:"var(--purple)",fontSize:14}}>{e.nota}/10</span>
                              {e.obs&&<span style={{color:"var(--text-muted)",fontSize:11,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.obs}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Novo registro */}
                    <div style={{background:"white",borderRadius:8,padding:12,border:"1px solid var(--gray-200)"}}>
                      <div style={{fontSize:12,fontWeight:600,marginBottom:8}}>Registrar nova nota</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        <div>
                          <label style={{fontSize:11,fontWeight:600,display:"block",marginBottom:4}}>Nota (0-10)</label>
                          <input type="number" min="0" max="10" step="0.5" className="form-input"
                            value={ev.nota} onChange={e=>setNovaEv(n=>({...n,[m.id]:{...ev,nota:e.target.value}}))}
                            placeholder="0-10"/>
                        </div>
                        <div>
                          <label style={{fontSize:11,fontWeight:600,display:"block",marginBottom:4}}>Data</label>
                          <input type="date" className="form-input" value={ev.data}
                            onChange={e=>setNovaEv(n=>({...n,[m.id]:{...ev,data:e.target.value}}))}/>
                        </div>
                      </div>
                      <input className="form-input" value={ev.obs||""}
                        onChange={e=>setNovaEv(n=>({...n,[m.id]:{...ev,obs:e.target.value}}))}
                        placeholder="Observação (opcional)" style={{marginBottom:8}}/>
                      <button className="btn btn-purple" style={{width:"100%",fontSize:12}} onClick={()=>registrarEvolucao(m.id)}>
                        + Registrar nota
                      </button>
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

// ── Admin: Quem Eu Sou ──
function AdminQuemSou({ onVoltar }) {
  const QUADRANTES = [
    {id:"sou",    label:"SOU",                   desc:"Características que possuo e não me incomodam.",    cor:"#7B00C4",bg:"#f5f3ff"},
    {id:"nao_mas",label:"NÃO SOU, MAS GOSTARIA",  desc:"Características que não possuo e me fazem falta.",  cor:"#0891b2",bg:"#e0f2fe"},
    {id:"sou_nao",label:"SOU, MAS NÃO GOSTARIA",  desc:"Características que possuo mas me incomodam.",      cor:"#d97706",bg:"#fef3c7"},
    {id:"nao_sou",label:"NÃO SOU",                desc:"Características que não possuo e não me incomodam.",cor:"#6b7280",bg:"#f3f4f6"},
  ];
  const [campos, setCampos]   = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo]     = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId:"admin", casalId:"admin", atividadeId:"quem-sou",
        respostas:campos, createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  return (
    <div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>
        Reflexão individual sobre identidade no relacionamento. Cada cônjuge preenche pelo próprio login no portal.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {QUADRANTES.map(q=>(
          <div key={q.id} style={{background:q.bg,borderRadius:10,padding:12,border:`1px solid ${q.cor}30`}}>
            <div style={{fontWeight:700,fontSize:11,color:q.cor,marginBottom:3}}>{q.label}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:8,lineHeight:1.4}}>{q.desc}</div>
            <TextAreaVoz className="form-input" rows={4} value={campos[q.id]||""}
              onChange={e=>setCampos(c=>({...c,[q.id]:e.target.value}))}
              placeholder="Digite aqui..." style={{fontSize:12,resize:"none",background:"white"}}/>
          </div>
        ))}
      </div>
      {salvo&&<div style={{background:"#d1fae5",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13,color:"#065f46"}}>✓ Salvo!</div>}
      <button className="btn btn-purple" style={{width:"100%"}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar"}
      </button>
    </div>
  );
}

// ── Admin: O Que Eu Quero e Não Quero Mais ──
function AdminOQueQuero({ onVoltar }) {
  const CAMPOS = [
    {id:"quero_sit",  label:"QUERO +  Situações",  desc:"Situações que gosta e quer que continuem.", cor:"#16a34a",bg:"#f0fdf4"},
    {id:"quero_val",  label:"QUERO +  Valores",     desc:"Situações MUITO IMPORTANTES a manter.",    cor:"#16a34a",bg:"#dcfce7"},
    {id:"nquero_sit", label:"QUERO −  Situações",   desc:"Situações que NÃO gosta e quer que parem.",cor:"#dc2626",bg:"#fef2f2"},
    {id:"nquero_val", label:"QUERO −  Valores",     desc:"Situações MUITO IMPORTANTES a mudar.",     cor:"#dc2626",bg:"#fee2e2"},
  ];
  const [campos, setCampos]     = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo]       = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId:"admin", casalId:"admin", atividadeId:"o-que-quero",
        respostas:campos, createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  return (
    <div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>
        Mapeamento de expectativas e limites no relacionamento.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {CAMPOS.map(c=>(
          <div key={c.id} style={{background:c.bg,borderRadius:10,padding:12,border:`1px solid ${c.cor}30`}}>
            <div style={{fontWeight:700,fontSize:11,color:c.cor,marginBottom:3}}>{c.label}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:8,lineHeight:1.4}}>{c.desc}</div>
            <TextAreaVoz className="form-input" rows={4} value={campos[c.id]||""}
              onChange={e=>setCampos(v=>({...v,[c.id]:e.target.value}))}
              placeholder="Digite aqui..." style={{fontSize:12,resize:"none",background:"white"}}/>
          </div>
        ))}
      </div>
      {salvo&&<div style={{background:"#d1fae5",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13,color:"#065f46"}}>✓ Salvo!</div>}
      <button className="btn btn-purple" style={{width:"100%"}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar"}
      </button>
    </div>
  );
}

// ── Formulário genérico para atividades das etapas ──
const ATIVIDADES_FORMULARIOS = {
  "detalhes-dia": {
    titulo: "Detalhes do Dia a Dia",
    instrucao: "Pequenos gestos que reconstroem a conexão",
    perguntas: [
      "Que pequeno gesto positivo você fez hoje pelo(a) seu/sua parceiro(a)?",
      "Como foi a resposta do(a) seu/sua parceiro(a)?",
      "Como esse gesto te fez sentir?",
      "O que você gostaria de receber do(a) seu/sua parceiro(a) amanhã?",
      "Impacto emocional desse momento (0 = nenhum, 10 = muito intenso)",
    ]
  },
  "plano-casal-ocupado": {
    titulo: "Plano de Ação para um Casal Ocupado Demais",
    instrucao: "Reorganizando a conexão na rotina",
    perguntas: [
      "Quais são os maiores obstáculos para a conexão no dia a dia de vocês?",
      "Que rituais gostaríamos de criar juntos?",
      "Qual o momento do dia que podemos reservar só para nós?",
      "O que admiro no(a) meu/minha parceiro(a) que nunca digo?",
      "Meu compromisso desta semana com o nosso relacionamento:",
    ]
  },
  "renovando-votos": {
    titulo: "Renovando os Votos",
    instrucao: "Uma jornada de reflexão profunda sobre o relacionamento",
    perguntas: [
      "Quem éramos no início — Como vocês se conheceram? O que te atraiu nessa pessoa? Que memória do início do relacionamento você ainda guarda com carinho?",
      "O que construímos juntos — Quais conquistas, momentos e experiências construímos como casal? O que só existiu porque estávamos juntos?",
      "Sobre meu parceiro(a) — O que você admira profundamente no(a) seu/sua parceiro(a)? Que qualidades fazem você se sentir grato(a) por tê-lo(a) ao seu lado?",
      "Nosso futuro — Que tipo de casal queremos ser daqui a 5 anos? Como imaginamos nossa vida juntos? O que queremos preservar e o que queremos construir?",
      "Meus votos renovados — Escreva seus votos renovados. O que você se compromete a oferecer neste relacionamento? O que promete cuidar e honrar?",
    ]
  },
  "mapa-cognitivo": {
    titulo: "Mapa Cognitivo do Relacionamento",
    instrucao: "Identificando crenças e padrões que moldam a relação",
    perguntas: [
      "Uma memória da sua história de vida que influencia como você se relaciona hoje:",
      "Quais crenças você carrega sobre relacionamentos? (Ex: 'Amor exige sacrifício', 'Parceiro(a) deve me adivinhar'...)",
      "Que situações no relacionamento disparam emoções intensas em você?",
      "Quando há conflito, qual é a sua estratégia habitual de enfrentamento?",
      "Que padrão repetitivo você observa em vocês como casal?",
      "O que você mais deseja que mude na dinâmica do relacionamento?",
    ]
  },
  "novos-padroes": {
    titulo: "Novos Padrões Relacionais",
    instrucao: "Construindo acordos e comunicação saudável",
    perguntas: [
      "Descreva uma situação onde você reconheceu e validou o sentimento do(a) seu/sua parceiro(a) esta semana:",
      "Em vez de 'Você sempre...', use: 'Eu me sinto ___ quando ___. Preciso de ___.' Escreva uma situação real usando essa fórmula:",
      "Que acordo relacional vocês podem fazer para melhorar a convivência? (Ex: sem celular durante as refeições, check-in diário de 10 min...)",
      "Descreva um conflito passado e como poderiam tê-lo reparado de forma mais gentil:",
      "Que melhoria concreta você observou no relacionamento desde o início desta jornada?",
    ]
  },
};

function FormularioCasal({ atividadeId, onVoltar }) {
  const config = ATIVIDADES_FORMULARIOS[atividadeId];
  const [respostas, setRespostas] = useState({});
  const [salvando,  setSalvando]  = useState(false);
  const [salvo,     setSalvo]     = useState(false);

  if (!config) return (
    <div style={{textAlign:"center",padding:32,color:"var(--text-muted)"}}>
      Formulário não configurado para esta atividade.
    </div>
  );

  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId:"admin", casalId:"admin",
        atividadeId,
        respostas,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch(e) { alert("Erro ao salvar."); }
    setSalvando(false);
  }

  return (
    <div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20,fontStyle:"italic"}}>
        {config.instrucao}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
        {config.perguntas.map((p,i)=>(
          <div key={i} style={{background:"#fafafa",borderRadius:10,padding:14,border:"1px solid var(--gray-100)"}}>
            <div style={{display:"flex",gap:10,marginBottom:8}}>
              <span style={{background:"var(--purple)",color:"white",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</span>
              <span style={{fontSize:13,fontWeight:500,lineHeight:1.5}}>{p}</span>
            </div>
            <TextAreaVoz className="form-input" rows={3}
              value={respostas[i]||""}
              onChange={e=>setRespostas(r=>({...r,[i]:e.target.value}))}
              placeholder="Escreva sua resposta..."
              style={{resize:"vertical"}}/>
          </div>
        ))}
      </div>
      {salvo && <div style={{background:"#d1fae5",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13,color:"#065f46"}}>✓ Respostas salvas!</div>}
      <button className="btn btn-purple" style={{width:"100%"}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar respostas"}
      </button>
    </div>
  );
}


// ── Psicoeducações e Fábulas para Casais ────────────────────────────────────
function PsicoFabCasais(){
  const [psicos, setPsicos]     = useState([]);
  const [fabulas, setFabulas]   = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("psico");
  const [aberto, setAberto]     = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(()=>{
    let loaded = 0;
    const check = ()=>{ loaded++; if(loaded===2) setLoading(false); };
    const u1 = db.collection("clinica_psicoeducacao")
      .where("categoria","==","casais")
      .onSnapshot(s=>{ setPsicos(s.docs.map(d=>({id:d.id,...d.data()}))); check(); }, check);
    const u2 = db.collection("clinica_fabulas")
      .where("categoria","==","casais")
      .onSnapshot(s=>{ setFabulas(s.docs.map(d=>({id:d.id,...d.data()}))); check(); }, check);
    return ()=>{ u1(); u2(); };
  },[]);

  if(loading) return null;
  if(psicos.length===0 && fabulas.length===0) return null;

  if(aberto){
    const VisualComp = PSICO_VISUAIS[aberto.visualKey||aberto.titulo];
    return(
      <div style={{marginBottom:12}}>
        <button className="btn btn-ghost" style={{marginBottom:12,padding:"8px 12px"}} onClick={()=>setAberto(null)}>
          <Icon name="arrow-left" size={16}/> Voltar
        </button>
        {VisualComp ? <VisualComp cat={{cor:"#7B00C4",bg:"#f3e6ff",accent:"#EC4899"}}/> : (
          <div className="card">
            <div style={{textAlign:"center",padding:"8px 0 16px"}}>
              <div style={{fontSize:40,marginBottom:8}}>{aberto.emoji||"💜"}</div>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:6}}>{aberto.titulo}</div>
            </div>
            {aberto.descricao&&<p style={{fontSize:13,color:"var(--text-muted)",fontStyle:"italic",marginBottom:12}}>{aberto.descricao}</p>}
            {aberto.conteudo&&<div style={{fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aberto.conteudo}</div>}
          </div>
        )}
      </div>
    );
  }

  return(
    <div style={{borderRadius:12,border:"1.5px solid #f0b8ff",overflow:"hidden",marginBottom:12}}>
      <div style={{background:"linear-gradient(to right,#f9f0ff,#f3e6ff)",padding:"12px 18px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #e8c8ff"}}>
        <span style={{fontSize:20}}>💜</span>
        <div style={{fontWeight:700,fontSize:14,color:"#7B00C4"}}>Recursos para o Casal</div>
      </div>
      <div style={{background:"white",padding:"10px 18px",borderBottom:"1px solid #e8c8ff",display:"flex",gap:8}}>
        {[["psico","Psicoeducação",psicos.length],["fabula","Fábulas",fabulas.length]].map(([k,l,c])=>(
          <button key={k} onClick={()=>setAbaAtiva(k)}
            style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid",borderColor:abaAtiva===k?"#7B00C4":"#e5e7eb",background:abaAtiva===k?"#f3e6ff":"white",color:abaAtiva===k?"#7B00C4":"var(--gray-600)",fontSize:12,cursor:"pointer",fontWeight:abaAtiva===k?600:400}}>
            {l} ({c})
          </button>
        ))}
      </div>
      <div style={{background:"white",padding:"12px 18px",display:"flex",flexDirection:"column",gap:8}}>
        {(abaAtiva==="psico"?psicos:fabulas).map(item=>(
          <div key={item.id} onClick={()=>setAberto(item)}
            style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#faf5ff",borderRadius:10,border:"1px solid #e8c8ff",cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background="#f3e6ff"}
            onMouseLeave={e=>e.currentTarget.style.background="#faf5ff"}>
            <div style={{fontSize:26,flexShrink:0}}>{item.emoji||"💜"}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13,color:"#3d006a"}}>{item.titulo}</div>
              {item.descricao&&<div style={{fontSize:11,color:"#7B00C4",marginTop:2,lineHeight:1.4}}>{item.descricao}</div>}
            </div>
            <span style={{fontSize:12,color:"#7B00C4",fontWeight:600,flexShrink:0}}>Ver →</span>
          </div>
        ))}
        {(abaAtiva==="psico"?psicos:fabulas).length===0&&(
          <div style={{textAlign:"center",padding:"16px 0",color:"var(--text-muted)",fontSize:13}}>
            Nenhum item cadastrado para casais ainda.
          </div>
        )}
      </div>
    </div>
  );
}

function AbaProtocoloCasais() {
  const [expandido, setExpandido] = useState(null);
  const [atividadeAberta, setAtividadeAberta] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [checkin, setCheckin] = useState({});
  const [msg, setMsg] = useState("");

  if(atividadeAberta){
    const {etapa, at} = atividadeAberta;
    return(
      <div>
        <button className="btn btn-ghost" style={{marginBottom:16,padding:"8px 12px"}} onClick={()=>setAtividadeAberta(null)}>
          <Icon name="arrow-left" size={16}/> Voltar ao Protocolo
        </button>
        <div className="card" style={{marginBottom:16,background:etapa.bg,border:"1.5px solid "+etapa.cor+"40"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <span style={{fontSize:28}}>{etapa.emoji}</span>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:etapa.cor}}>{etapa.stage===0?"Diagnóstico":"Etapa "+etapa.stage} — {etapa.titulo}</div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>{at.titulo}</div>
            </div>
          </div>
          <p style={{fontSize:13,color:"var(--gray-700)",marginTop:8,paddingLeft:38}}>{at.desc}</p>
        </div>
        <div className="card">
          <div style={{fontWeight:600,fontSize:15,marginBottom:16}}>{at.titulo}</div>
          {at.id==="inventario-bem-estar"
            ? <InventarioBemEstarCasal onVoltar={()=>setAtividadeAberta(null)}/>
            : at.id==="roda-vida-relacionamento"
            ? <AdminRodaVida onVoltar={()=>setAtividadeAberta(null)}/>
            : at.id==="3-metas"
            ? <AdminMetas onVoltar={()=>setAtividadeAberta(null)}/>
            : at.id==="quem-sou"
            ? <AdminQuemSou onVoltar={()=>setAtividadeAberta(null)}/>
            : at.id==="o-que-quero"
            ? <AdminOQueQuero onVoltar={()=>setAtividadeAberta(null)}/>
            : ATIVIDADES_FORMULARIOS[at.id]
            ? <FormularioCasal atividadeId={at.id} onVoltar={()=>setAtividadeAberta(null)}/>
            : (<>
          <div style={{background:"#f9fafb",borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:"#6b7280",lineHeight:1.7}}>
            Responda com honestidade e na presença da psicóloga. Esta atividade faz parte do protocolo de Terapia de Casais TCC.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[1,2,3].map(n=>(
              <div key={n}>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Reflexão {n}</label>
                <TextAreaVoz className="form-input" rows={3}
                  value={respostas[at.id+"_"+n]||""}
                  onChange={e=>setRespostas(r=>({...r,[at.id+"_"+n]:e.target.value}))}
                  placeholder="Escreva sua resposta..."/>
              </div>
            ))}
          </div>
          <button className="btn btn-purple" style={{width:"100%",marginTop:16}} onClick={()=>{setMsg("✓ Salvo!");setTimeout(()=>setMsg(""),2000);}}>
            {msg||<><Icon name="save" size={15}/> Salvar respostas</>}
          </button>
          </>)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{background:"var(--purple-bg)",border:"1px solid var(--purple)30",borderRadius:12,padding:14,marginBottom:20,display:"flex",alignItems:"flex-start",gap:10}}>
        <Icon name="heart" size={16}/>
        <div style={{fontSize:13,color:"var(--gray-700)",lineHeight:1.6}}>
          <strong>Protocolo TCC para Casais</strong> — diagnóstico inicial + 4 etapas progressivas. Clique em cada atividade para acessar.
        </div>
      </div>

      {/* Check-in Semanal */}
      <div style={{borderRadius:12,border:"1.5px solid #fda4af",overflow:"hidden",marginBottom:12}}>
        <button onClick={()=>setExpandido(expandido==="checkin"?null:"checkin")}
          style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 18px",background:"linear-gradient(to right,#fff1f2,#fdf2f8)",border:"none",cursor:"pointer",textAlign:"left"}}>
          <span style={{fontSize:22}}>✨</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:"#be185d"}}>Check-in Semanal do Casal</div>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>Recorrente · 7 questões de conexão emocional</div>
          </div>
          <Icon name={expandido==="checkin"?"chevron-up":"chevron-down"} size={16}/>
        </button>
        {expandido==="checkin"&&(
          <div style={{background:"white",padding:"16px 18px"}}>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:12}}>Escala: 1=Nunca · 2=Raramente · 3=Às vezes · 4=Frequentemente · 5=Sempre</div>
            {CHECKIN_SEMANAL.map((q,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<CHECKIN_SEMANAL.length-1?"1px solid var(--gray-100)":"none"}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:"#ffe4e6",color:"#be185d",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                <div style={{fontSize:13,flex:1,lineHeight:1.4}}>{q}</div>
                <div style={{display:"flex",gap:4}}>
                  {[1,2,3,4,5].map(v=>(
                    <button key={v} onClick={()=>setCheckin(c=>({...c,[i]:v}))} style={{width:28,height:28,borderRadius:"50%",border:"1.5px solid",borderColor:checkin[i]===v?"#be185d":"#e5e7eb",background:checkin[i]===v?"#be185d":"white",color:checkin[i]===v?"white":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer"}}>{v}</button>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn btn-purple" style={{width:"100%",marginTop:12,background:"#be185d",border:"none"}} onClick={()=>{setMsg("✓ Check-in salvo!");setTimeout(()=>setMsg(""),2000);}}>
              {msg||"Salvar Check-in"}
            </button>
          </div>
        )}
      </div>

      {/* Psicoeducações para Casais */}
      <PsicoFabCasais/>

      {PROTOCOLO_CASAIS.map(etapa=>(
        <div key={etapa.stage} style={{borderRadius:12,border:"1.5px solid",borderColor:etapa.cor+"40",overflow:"hidden",marginBottom:12}}>
          <button onClick={()=>setExpandido(expandido===etapa.stage?null:etapa.stage)}
            style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 18px",background:etapa.bg,border:"none",cursor:"pointer",textAlign:"left"}}>
            <span style={{fontSize:22}}>{etapa.emoji}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:etapa.cor}}>
                {etapa.stage===0?"Diagnóstico":"Etapa "+etapa.stage} — {etapa.titulo}
              </div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{etapa.subtitulo}</div>
            </div>
            <span style={{background:"white",color:etapa.cor,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,border:"1px solid "+etapa.cor+"40"}}>
              {etapa.atividades.length} ativ.
            </span>
            <Icon name={expandido===etapa.stage?"chevron-up":"chevron-down"} size={16}/>
          </button>
          {expandido===etapa.stage&&(
            <div style={{background:"white",padding:"12px 18px",display:"flex",flexDirection:"column",gap:8}}>
              {etapa.atividades.map(at=>(
                <div key={at.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:"var(--gray-50)",borderRadius:10,border:"1px solid var(--gray-200)",cursor:"pointer",transition:"all .15s"}}
                  onClick={()=>setAtividadeAberta({etapa,at})}
                  onMouseEnter={e=>{e.currentTarget.style.background=etapa.bg;e.currentTarget.style.borderColor=etapa.cor+"40";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="var(--gray-50)";e.currentTarget.style.borderColor="var(--gray-200)";}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:etapa.cor,marginTop:5,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{at.titulo}</div>
                    <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2,lineHeight:1.5}}>{at.desc}</div>
                  </div>
                  <span style={{fontSize:12,color:etapa.cor,fontWeight:600,flexShrink:0}}>Acessar →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Aba Fábulas ──────────────────────────────────────────────────────────────
const CATS_FABULAS = {
  ansiedade:      {label:"Ansiedade",           cor:"#7B00C4", bg:"#f3e6ff", accent:"#F97316"},
  emocoes:        {label:"Emoções",             cor:"#7B00C4", bg:"#f3e6ff", accent:"#F43F5E"},
  autoconhecimento:{label:"Autoconhecimento",   cor:"#7B00C4", bg:"#f3e6ff", accent:"#0EA5E9"},
  crescimento:    {label:"Crescimento",         cor:"#7B00C4", bg:"#f3e6ff", accent:"#22C55E"},
  relacionamentos:{label:"Relacionamentos",     cor:"#7B00C4", bg:"#f3e6ff", accent:"#EF4444"},
  casais:         {label:"Casais",              cor:"#7B00C4", bg:"#f3e6ff", accent:"#EC4899"},
  perdao:         {label:"Perdão",              cor:"#7B00C4", bg:"#f3e6ff", accent:"#8B5CF6"},
  outros:         {label:"Outros",              cor:"#7B00C4", bg:"#f3e6ff", accent:"#64748B"},
};

function AbaFabulas() {
  const [fabulas, setFabulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fabulaAberta, setFabulaAberta] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [migrando, setMigrando] = useState(false);

  const MIGRACAO_CATS = {
    "resiliência":"crescimento","resiliencia":"crescimento",
    "esperança":"crescimento","esperanca":"crescimento",
    "autoconfiança":"autoconhecimento","autoconfianca":"autoconhecimento",
    "autoestima":"autoconhecimento",
    "mindfulness":"emocoes",
    "tcc":"autoconhecimento",
    "expressão emocional":"emocoes","expressao emocional":"emocoes",
    "regulação emocional":"emocoes","regulacao emocional":"emocoes",
    "perspectiva":"autoconhecimento",
    "perdão":"perdao",
  };

  async function migrarCategorias(){
    if(!confirm("Migrar categorias antigas para as novas? Isso atualiza os documentos no Firebase.")) return;
    setMigrando(true);
    try{
      const snap = await db.collection("clinica_fabulas").get();
      let count = 0;
      for(const doc of snap.docs){
        const cat = doc.data().categoria;
        const nova = MIGRACAO_CATS[cat];
        if(nova){ await db.collection("clinica_fabulas").doc(doc.id).update({categoria:nova}); count++; }
      }
      alert("✓ "+count+" fábulas migradas!");
    } catch(e){ alert("Erro: "+e.message); }
    setMigrando(false);
  }

  useEffect(()=>{
    const unsub = db.collection("clinica_fabulas").onSnapshot(snap=>{
      setFabulas(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
  },[]);

  if(loading) return <Spinner/>;

  if(fabulaAberta){
    const cat = CATS_FABULAS[fabulaAberta.categoria]||{label:fabulaAberta.categoria,cor:"#7c3aed",bg:"#ede9fe"};
    return (
      <div>
        <button className="btn btn-ghost" style={{marginBottom:16,padding:"8px 12px"}} onClick={()=>setFabulaAberta(null)}>
          <Icon name="arrow-left" size={16}/> Todas as fábulas
        </button>
        <div className="card" style={{marginBottom:16,background:cat.cor,color:"white"}}>
          <div style={{textAlign:"center",padding:"8px 0 16px"}}>
            <div style={{fontSize:52,marginBottom:12}}>{fabulaAberta.emoji}</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,marginBottom:8}}>{fabulaAberta.titulo}</div>
            <div style={{fontSize:13,fontStyle:"italic",opacity:0.9}}>"{fabulaAberta.moral}"</div>
            <div style={{marginTop:12,fontSize:12,opacity:0.75}}>{(fabulaAberta.paginas||[]).length} páginas · {(fabulaAberta.perguntas||[]).length} reflexões</div>
          </div>
        </div>
        {(fabulaAberta.paginas||[]).map((pag,i)=>(
          <div key={i} className="card" style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:cat.cor,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.8px"}}>Página {i+1} de {fabulaAberta.paginas.length}</div>
            <p style={{fontSize:14,lineHeight:1.9,color:"var(--gray-700)"}}>{pag}</p>
          </div>
        ))}
        {(fabulaAberta.perguntas||[]).length>0&&(
          <div className="card" style={{border:"1.5px solid "+cat.cor+"30",background:cat.bg}}>
            <div style={{fontWeight:700,marginBottom:14,display:"flex",alignItems:"center",gap:8,color:cat.cor}}>
              <Icon name="help-circle" size={16}/> Perguntas de Reflexão
            </div>
            {fabulaAberta.perguntas.map((p,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"12px 0",borderBottom:i<fabulaAberta.perguntas.length-1?"1px solid "+cat.cor+"20":"none"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:cat.cor,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{i+1}</div>
                <p style={{fontSize:13,lineHeight:1.6,color:"var(--gray-700)"}}>{p}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if(fabulas.length===0) return (
    <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>
      <Icon name="book-open" size={40}/>
      <div style={{marginTop:12,fontWeight:500}}>Nenhuma fábula cadastrada ainda.</div>
      <div style={{fontSize:13,marginTop:6}}>Execute o arquivo <code>popular-recursos.html</code> para criar as 15 fábulas.</div>
    </div>
  );

  // Categorias únicas
  const cats = ["todos", ...new Set(fabulas.map(f=>f.categoria||"outro"))];
  const filtradas = filtro==="todos" ? fabulas : fabulas.filter(f=>(f.categoria||"outro")===filtro);
  const porCat = filtradas.reduce((acc,f)=>{
    const k = f.categoria||"outro";
    if(!acc[k]) acc[k]=[];
    acc[k].push(f);
    return acc;
  },{});

  return (
    <div>
      {/* Filtros */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {cats.map(cat=>{
          const c = CATS_FABULAS[cat]||{label:cat==="todos"?"Todas":cat,cor:"#7c3aed",bg:"#ede9fe"};
          const n = cat==="todos"?fabulas.length:fabulas.filter(f=>(f.categoria||"outro")===cat).length;
          const ativo = filtro===cat;
          return(
            <button key={cat} onClick={()=>setFiltro(cat)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:20,border:"1.5px solid",borderColor:ativo?c.cor:"#e5e7eb",background:ativo?c.cor:"white",color:ativo?"white":c.cor,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s"}}>
              {cat!=="todos"&&<span style={{fontSize:14}}>{fabulas.find(f=>f.categoria===cat)?.emoji||"📖"}</span>}
              {cat==="todos"?"📚 Todas":c.label} <span style={{opacity:0.8,fontSize:11}}>{n}</span>
            </button>
          );
        })}
      </div>

      {Object.entries(porCat).map(([cat,itens])=>{
        const c = CATS_FABULAS[cat]||{label:cat,cor:"#7c3aed",bg:"#ede9fe"};
        return (
          <div key={cat} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:8,borderBottom:"1px solid var(--gray-100)"}}>
              <span style={{fontWeight:700,fontSize:11,color:c.cor,textTransform:"uppercase",letterSpacing:"0.8px"}}>{c.label}</span>
              <span style={{background:c.bg,color:c.cor,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{itens.length}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
              {itens.map(f=>(
                <div key={f.id} style={{background:"white",border:"1.5px solid",borderColor:c.cor+"40",borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"box-shadow .15s"}}
                  onClick={()=>setFabulaAberta(f)}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px "+c.cor+"30"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
                  <div style={{background:c.cor,padding:"16px",display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:28}}>{f.emoji||"📖"}</span>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,color:"white",lineHeight:1.3}}>{f.titulo}</div>
                      <span style={{background:"rgba(255,255,255,0.2)",color:"white",borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:600}}>{c.label}</span>
                    </div>
                  </div>
                  <div style={{padding:"12px 14px"}}>
                    <p style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic",lineHeight:1.5,marginBottom:8}}>"{f.moral}"</p>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"var(--text-muted)"}}>
                      <span>{(f.paginas||[]).length} pág. · {(f.perguntas||[]).length} reflexões</span>
                      <span style={{color:c.cor,fontWeight:600,fontSize:12}}>Começar a ler →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Aba Psicoeducação ─────────────────────────────────────────────────────────
const PILULAS_TCC = [
  {emoji:"💭",titulo:"O poder dos pensamentos",descricao:"Como o que pensamos afeta o que sentimos",categoria:"tcc",tipo:"texto",
   conteudo:"Você já reparou como uma ideia pode mudar completamente o seu humor?\n\nA mente funciona como um filtro: o que pensamos molda o que sentimos e o que fazemos. Um mesmo evento pode gerar tristeza ou tranquilidade — depende do que sua cabeça conta sobre ele. Não são as coisas em si que nos perturbam, mas o que acreditamos sobre elas.\n\n🎯 Na prática:\nHoje, quando notar uma emoção forte, pergunte: \"Que pensamento veio antes disso?\" Escreva num papel. Só observar já muda tudo."},
  {emoji:"🔍",titulo:"Fatos vs. interpretações",descricao:"Como não acreditar em tudo o que nossa mente diz",categoria:"tcc",tipo:"texto",
   conteudo:"A mente preenche lacunas automaticamente — e nem sempre acerta.\n\n\"Ela não me respondeu, deve estar com raiva de mim\" é uma interpretação, não um fato. O fato é apenas: \"Ela não respondeu\". Todo o resto é história que criamos. E histórias podem ser reescritas.\n\n🎯 Na prática:\nPegue uma situação que te incomodou hoje. Separe: o que REALMENTE aconteceu? E o que VOCÊ acrescentou? Escreva os dois lados."},
  {emoji:"⛈️",titulo:"A armadilha do pior cenário",descricao:"O hábito de catastrofizar o futuro e como parar",categoria:"ansiedade",tipo:"texto",
   conteudo:"Catastrofizar é o hábito de imaginar sempre o pior desfecho possível — e tratá-lo como certeza.\n\n\"E se eu reprovar? E se perder o emprego? E se ninguém me amar?\" O problema é que o cérebro não distingue ameaça real de imaginada, então você sofre antecipado por algo que talvez nunca aconteça.\n\n🎯 Na prática:\nQuando catastrofizar aparecer, faça 3 perguntas:\n1. Isso é provável?\n2. Já aconteceu antes?\n3. Se acontecer, eu consigo lidar?\nQuase sempre a resposta ao item 3 é sim."},
  {emoji:"🌀",titulo:"O ciclo da ansiedade",descricao:"Como evitar o que tememos só faz o medo crescer",categoria:"ansiedade",tipo:"texto",
   conteudo:"Quanto mais evitamos o que tememos, mais o medo cresce.\n\nParece contraditório, mas é assim: ao fugir da situação, o alívio imediato ensina ao cérebro que \"fugir = segurança\". Com o tempo, o gatilho fica cada vez menor e a evitação, cada vez maior. A única saída é, aos poucos, enfrentar.\n\n🎯 Na prática:\nEscolha uma coisa pequena que você evita há tempo. Faça por 5 minutos hoje — só 5. Observe que o pior quase nunca acontece."},
  {emoji:"🚀",titulo:"Agir antes de ter vontade",descricao:"O princípio prático: fazer algo para gerar motivação",categoria:"autocuidado",tipo:"texto",
   conteudo:"Esperamos a motivação aparecer para agir — mas funciona ao contrário.\n\nA ação cria a motivação, não o contrário. Você não precisa estar animado para começar; precisa começar para ficar animado. É como empurrar um carro parado: o começo exige mais força, depois o movimento sustenta.\n\n🎯 Na prática:\nEscolha uma tarefa que você está adiando. Faça os primeiros 2 minutos agora — sem julgamento. Só isso. Veja o que acontece depois."},
  {emoji:"🤗",titulo:"Autocompaixão",descricao:"Como ser menos crítico consigo mesmo",categoria:"autoestima",tipo:"texto",
   conteudo:"Nós seríamos horrorosos como amigos de nós mesmos.\n\nCom uma pessoa que amamos, somos gentis e pacientes. Com nós, somos críticos e impacientes. Autocompaixão não é preguiça nem fraqueza — é tratar a si mesmo com a mesma ternura que você ofereceria a quem você ama.\n\n🎯 Na prática:\nHoje, quando errar algo, diga internamente: \"Tudo bem, isso é humano. Qualquer pessoa teria dificuldade aqui. Eu faço o que posso.\" Apenas isso."},
  {emoji:"🎨",titulo:"A roda das emoções",descricao:"A importância de saber nomear exatamente o que sente",categoria:"mindfulness",tipo:"texto",
   conteudo:"\"Estou mal\" é vago demais para o cérebro agir.\n\nQuando nomeamos com precisão o que sentimos — \"estou ansioso\", \"estou frustrado\", \"estou envergonhado\" — ativamos o córtex pré-frontal, que acalma a amígdala. Nomear emoções é uma forma de regulação emocional.\n\nEmoções primárias: Alegria, Tristeza, Raiva, Medo, Surpresa, Nojo.\nCada uma tem dezenas de nuances — quanto mais preciso o nome, mais controle você tem.\n\n🎯 Na prática:\nAntes de dormir, escreva: \"Hoje me senti ___\" — use o nome mais preciso possível. Evite \"bem\" ou \"mal\"."},
  {emoji:"🔺",titulo:"O modelo ABC na prática",descricao:"Como nossa crença sobre um evento muda nossa reação",categoria:"tcc",tipo:"texto",
   conteudo:"A — Adversidade (o que aconteceu)\nB — Belief, ou seja, a crença sobre o que aconteceu\nC — Consequência emocional\n\nA mesma situação pode gerar emoções completamente diferentes dependendo do B. Dois colegas recebem críticas do chefe: um pensa \"Sou um fracasso\" e fica triste; o outro pensa \"Posso melhorar\" e fica motivado. Mesmo A, B diferente, C diferente.\n\n🎯 Na prática:\nPense em uma situação que te deixou mal. Escreva o A (fato), o B (o que você acreditou) e o C (emoção). Agora invente um B diferente — o que mudaria?"},
  {emoji:"⚡",titulo:"Eustresse vs. distresse",descricao:"Como diferenciar o estresse que impulsiona do que adoece",categoria:"ansiedade",tipo:"texto",
   conteudo:"Nem todo estresse é ruim.\n\nEustresse é o estresse que nos impulsiona — aquela energia antes de uma apresentação importante, a adrenalina de um desafio. Distresse é quando a pressão ultrapassa nossa capacidade e começa a nos adoecer. A diferença está na duração e na percepção de controle.\n\n🎯 Na prática:\nHoje, pergunte sobre um estressor: \"Isso me desafia ou me paralisa?\" Se desafia, use a energia. Se paralisa, é sinal de que precisa de pausa ou ajuda."},
  {emoji:"🪫",titulo:"Sinais de desgaste emocional",descricao:"Como identificar a sobrecarga e estratégias de pausa",categoria:"autocuidado",tipo:"texto",
   conteudo:"O corpo e a mente avisam antes de entrar em colapso — mas aprendemos a ignorar esses sinais.\n\nIrritabilidade sem causa, dificuldade de concentração, sono perturbado, sensação de vazio ou indiferença são sinais de que o sistema está sobrecarregado. Pausar não é fraqueza; é manutenção obrigatória.\n\n🎯 Na prática:\nHoje, reserve 15 minutos para fazer absolutamente nada útil: sentar ao sol, ouvir música, tomar um chá. Sem culpa. É recuperação."},
  {emoji:"∞",titulo:"O perigo do sempre e nunca",descricao:"Como a supergeneralização afeta nosso humor",categoria:"tcc",tipo:"texto",
   conteudo:"\"Eu SEMPRE faço isso errado.\" \"Ele NUNCA me ouve.\"\n\nEssas palavras parecem verdade, mas são armadilhas. Uma generalização transforma um evento pontual em característica permanente. E o que parece permanente gera desânimo. Quase nada na vida humana é realmente \"sempre\" ou \"nunca\".\n\n🎯 Na prática:\nQuando notar um \"sempre\" ou \"nunca\" no seu pensamento ou fala, troque por: \"desta vez\", \"às vezes\", \"com frequência\". Observe como a frase — e a emoção — mudam."},
  {emoji:"🍕",titulo:"A pizza da responsabilidade",descricao:"Como dividir a culpa evitando autoculpa ou vitimização",categoria:"tcc",tipo:"texto",
   conteudo:"Quando algo dá errado, tendemos aos extremos: ou colocamos toda a culpa em nós mesmos (autoculpa tóxica) ou em outro alguém (vitimização).\n\nA verdade é que a maioria dos problemas tem múltiplos autores: você, o outro e as circunstâncias. Dividir a culpa em fatias mais justas libera peso.\n\nFórmula: 33% Eu + 33% O Outro + 33% As Circunstâncias\n\n🎯 Na prática:\nPense num problema recente. Divida: qual parte foi sua? Qual foi do outro? Qual foi das circunstâncias? Você ficará surpreso com o quanto não precisa carregar."},
  {emoji:"🔦",titulo:"O filtro negativo da mente",descricao:"Por que ignoramos 10 elogios e focamos em 1 crítica",categoria:"autoestima",tipo:"texto",
   conteudo:"O cérebro tem um viés de negatividade — herança evolutiva para detectar perigos.\n\nIsso nos faz ignorar 10 elogios e ruminar 1 crítica por dias. É automático, não é fraqueza. Mas podemos treinar ativamente a atenção para o que funcionou.\n\n🎯 Na prática:\nAntes de dormir, anote 3 coisas que deram certo hoje — podem ser minúsculas. Fazer isso por 21 dias literalmente reconfigura os circuitos atencionais do cérebro."},
  {emoji:"⏱️",titulo:"A regra dos 5 minutos",descricao:"Uma técnica infalível para vencer a procrastinação",categoria:"autocuidado",tipo:"texto",
   conteudo:"Procrastinamos porque o cérebro antecipa a tarefa como enorme e desagradável.\n\nMas a aversão quase sempre é maior na antecipação do que na execução. A regra é: comprometa-se com apenas 5 minutos. Só. Após esses 5 minutos, você pode parar — com honra. Na maioria das vezes, você continua.\n\n🎯 Na prática:\nEscolha a tarefa mais temida da sua lista hoje. Configure um timer para 5 minutos. Comece agora. Só 5 minutos."},
  {emoji:"🌊",titulo:"Surfando a onda da emoção",descricao:"Como sentir uma emoção intensa sem agir por impulso",categoria:"mindfulness",tipo:"texto",
   conteudo:"Emoções intensas parecem eternas, mas têm um pico e depois diminuem — como uma onda do mar.\n\nO problema é que quando agimos por impulso no pico da onda, quase sempre nos arrependemos. A técnica de \"surfar a onda\" é: observe a emoção sem agir nela, sabendo que ela vai passar.\n\n🎯 Na prática:\nNa próxima emoção intensa, observe como uma onda: onde ela começa no corpo? Ela sobe? Quando chega ao pico? Você verá que em 10 a 20 minutos ela diminui naturalmente."},
  {emoji:"🧩",titulo:"7 Distorções de Pensamento",descricao:"Os padrões de pensamento que distorcem sua realidade",categoria:"tcc",tipo:"visual",conteudo:""},
  {emoji:"🧠",titulo:"Desmontar o Circuito Cerebral da Ansiedade",descricao:"4 passos para retomar o comando da sua própria vida",categoria:"ansiedade",tipo:"visual",conteudo:""},
  {emoji:"🎛️",titulo:"Preocupação produtiva vs. improdutiva",descricao:"Como separar o que posso resolver do que está fora do controle",categoria:"ansiedade",tipo:"texto",
   conteudo:"Preocupação produtiva: tenho uma ação concreta que posso fazer agora para resolver isso.\n\nPreocupação improdutiva: o problema está fora do meu controle ou no futuro, e ficar ruminando só gasta energia. A pergunta-chave é: existe algo que eu possa FAZER agora?\n\n🎯 Na prática:\nListe suas 3 preocupações do momento. Para cada uma: existe uma ação concreta que você pode fazer hoje? Se sim, faça. Se não, escreva: \"Isso está fora do meu controle agora\" e pratique soltar."},
  {emoji:"🏆",titulo:"O diário de pequenas vitórias",descricao:"Como treinar o cérebro para notar o que deu certo",categoria:"autocuidado",tipo:"texto",
   conteudo:"Positividade tóxica é fingir que tudo está bem quando não está.\n\nO diário de pequenas vitórias é diferente: é treinar o cérebro para notar o que realmente funcionou — por menor que seja. \"Tomei água hoje.\" \"Respondi um email difícil.\" \"Saí da cama quando não queria.\" Essas coisas contam.\n\n🎯 Na prática:\nHoje à noite, escreva 3 pequenas vitórias do dia. Podem ser minúsculas. Não vale inventar — vale notar o que realmente aconteceu e que você normalmente ignoraria."},
];


// ═══════════════════════════════════════════════════════════════════════
// PSICOEDUCAÇÕES VISUAIS — ANSIEDADE
// ═══════════════════════════════════════════════════════════════════════

function PsicoPreocupacao({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🧩</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Você preocupa com o que pode — ou com o que não pode controlar?</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Aprender a separar as preocupações muda sua relação com a ansiedade.</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
        <div style={{background:"#f9f0ff",padding:"16px 18px",borderRight:"2px solid #e8c8ff",borderBottom:"1px solid #e8c8ff"}}>
          <div style={{color:"#22C55E",fontWeight:600,fontSize:13,marginBottom:6}}>✅ Produtiva</div>
          <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>Existe uma ação concreta que posso fazer agora para resolver. A energia vai para a solução.</div>
        </div>
        <div style={{background:"#f3e6ff",padding:"16px 18px",borderBottom:"1px solid #e8c8ff"}}>
          <div style={{color:"#F97316",fontWeight:600,fontSize:13,marginBottom:6}}>⚠️ Improdutiva</div>
          <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>O problema está fora do meu controle ou no futuro. Ruminar só gasta energia sem resolver nada.</div>
        </div>
      </div>
      <div style={{background:"#7B00C4",padding:"14px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:8}}>Pergunta-chave:</div>
        <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 14px",color:"#f3e6ff",fontSize:13,fontStyle:"italic"}}>
          "Existe algo que eu possa FAZER agora para resolver isso?"
        </div>
        <div style={{display:"flex",gap:10,marginTop:10}}>
          <div style={{flex:1,background:"rgba(34,197,94,0.2)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(34,197,94,0.4)"}}>
            <div style={{color:"#86efac",fontSize:12,fontWeight:500}}>SIM → Aja agora</div>
            <div style={{color:"#d9b3f5",fontSize:11,marginTop:2}}>Transforme em tarefa concreta</div>
          </div>
          <div style={{flex:1,background:"rgba(249,115,22,0.2)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(249,115,22,0.4)"}}>
            <div style={{color:"#fed7aa",fontSize:12,fontWeight:500}}>NÃO → Solte conscientemente</div>
            <div style={{color:"#d9b3f5",fontSize:11,marginTop:2}}>Escreva: "Isso está fora do meu controle"</div>
          </div>
        </div>
      </div>
      <div style={{background:"#f9f0ff",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:6}}>🎯 Na prática</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>Liste suas 3 preocupações do momento. Para cada uma: existe uma ação concreta que você pode fazer hoje? Se sim, faça. Se não, pratique soltar conscientemente.</div>
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>De cada 10 preocupações, 8 estão fora do nosso controle. Quanto de energia você investe nessas 8? 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoPiorCenario({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>⛈️</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Você vive imaginando o pior?</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Catastrofizar é um hábito mental — e hábitos podem ser mudados.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:8}}>O que é catastrofizar?</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>É o hábito de imaginar o pior resultado possível como o mais provável. A mente entra em modo de ameaça — mesmo quando não há perigo real — e a ansiedade dispara.</div>
      </div>
      <div style={{background:"#7B00C4",padding:"16px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:10}}>O triângulo da catastrofização</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[["🔮","Superestimar o perigo","Trata incerteza como certeza negativa"],["🙈","Subestimar a capacidade","Esquece que já superou coisas difíceis"],["🚫","Descartar o positivo","Ignora evidências de que pode dar certo"]].map(([e,t,d],i)=>(
            <div key={i} style={{flex:1,minWidth:140,background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(255,255,255,0.2)"}}>
              <div style={{fontSize:22,marginBottom:4}}>{e}</div>
              <div style={{color:"#f3e6ff",fontSize:12,fontWeight:500,marginBottom:3}}>{t}</div>
              <div style={{color:"#d9b3f5",fontSize:11,lineHeight:1.4}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:8}}>3 perguntas para quebrar o ciclo</div>
        {[["1","Qual é a evidência real de que isso vai acontecer?"],["2","Qual é o resultado mais provável — não o mais temido?"],["3","Se acontecer, conseguirei lidar? O que faria?"]].map(([n,q])=>(
          <div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:"#7B00C4",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,flexShrink:0}}>{n}</div>
            <div style={{fontSize:12,color:"#5a0090",lineHeight:1.5}}>{q}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>Da última vez que você imaginou o pior — o que realmente aconteceu? Sua mente provavelmente superestimou o perigo. 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoEustresse({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>⚡</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Nem todo estresse é seu inimigo</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Aprender a diferenciá-los muda como você responde às pressões da vida.</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
        <div style={{background:"#f9f0ff",padding:"16px 18px",borderRight:"2px solid #e8c8ff",borderBottom:"1px solid #e8c8ff"}}>
          <div style={{color:"#22C55E",fontWeight:600,fontSize:14,marginBottom:8}}>Eustresse ✅</div>
          <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6,marginBottom:10}}>O estresse que impulsiona. Gera energia, foco e motivação para superar desafios.</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {["Antes de apresentações","Novos desafios","Metas importantes","Adrenalina saudável"].map(t=>(
              <span key={t} style={{background:"#dcfce7",color:"#16a34a",borderRadius:20,padding:"2px 8px",fontSize:10}}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{background:"#f3e6ff",padding:"16px 18px",borderBottom:"1px solid #e8c8ff"}}>
          <div style={{color:"#F97316",fontWeight:600,fontSize:14,marginBottom:8}}>Distresse ⚠️</div>
          <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6,marginBottom:10}}>O estresse que adoece. Quando a pressão ultrapassa a capacidade e se torna crônica.</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {["Pressão constante","Sem descanso","Sensação de descontrole","Esgotamento"].map(t=>(
              <span key={t} style={{background:"#fff7ed",color:"#ea580c",borderRadius:20,padding:"2px 8px",fontSize:10}}>{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"#7B00C4",padding:"14px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:8}}>A diferença está em 2 fatores:</div>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1,background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"10px 12px"}}>
            <div style={{color:"#f3e6ff",fontSize:12,fontWeight:500,marginBottom:3}}>⏱️ Duração</div>
            <div style={{color:"#d9b3f5",fontSize:11,lineHeight:1.4}}>Temporário = eustresse. Crônico = distresse.</div>
          </div>
          <div style={{flex:1,background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"10px 12px"}}>
            <div style={{color:"#f3e6ff",fontSize:12,fontWeight:500,marginBottom:3}}>🎮 Percepção de controle</div>
            <div style={{color:"#d9b3f5",fontSize:11,lineHeight:1.4}}>Sinto que posso lidar = eustresse. Paralisado = distresse.</div>
          </div>
        </div>
      </div>
      <div style={{background:"#f9f0ff",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:6}}>🎯 Na prática</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>Hoje, identifique um estressor e pergunte: <em>"Isso me desafia ou me paralisa?"</em> Se desafia, use a energia. Se paralisa, é sinal de que precisa de pausa ou ajuda.</div>
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>O estresse que você sente agora — está te impulsionando ou te adoecendo? Essa resposta é o primeiro passo para cuidar de você. 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoCicloAnsiedade({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🌀</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Evitar o que teme só faz o medo crescer</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Entender o ciclo da ansiedade é o primeiro passo para quebrá-lo.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:10}}>O ciclo que alimenta a ansiedade</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {n:"1",e:"😰",t:"Situação temida",d:"Algo aciona a ameaça percebida",c:"#7B00C4"},
            {n:"2",e:"💓",t:"Reação física",d:"Coração acelera, tensão, sudorese",c:"#9a00e0"},
            {n:"3",e:"🧠",t:"Pensamento catastrófico",d:"'Não vou conseguir', 'Algo vai dar errado'",c:"#b040e0"},
            {n:"4",e:"🚪",t:"Evitação",d:"Foge ou evita a situação temida",c:"#c870f0"},
            {n:"5",e:"😮",t:"Alívio temporário",d:"A ansiedade cai — mas o medo cresce",c:"#d9b3f5"},
          ].map(({n,e,t,d,c})=>(
            <div key={n} style={{display:"flex",gap:10,alignItems:"center",background:"white",borderRadius:8,padding:"8px 12px",border:"1px solid #e8c8ff"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:c,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,flexShrink:0}}>{n}</div>
              <div style={{fontSize:18,flexShrink:0}}>{e}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:"#3d006a"}}>{t}</div>
                <div style={{fontSize:11,color:"#7B00C4",lineHeight:1.4}}>{d}</div>
              </div>
            </div>
          ))}
          <div style={{textAlign:"center",fontSize:12,color:"#F97316",fontWeight:500,padding:"4px 0"}}>↩️ Volta para o passo 1 — o ciclo se repete e se fortalece</div>
        </div>
      </div>
      <div style={{background:"#7B00C4",padding:"14px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:8}}>Como quebrar o ciclo?</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[["🎯","Exposição gradual","Enfrente a situação temida em pequenos passos — o medo diminui com a prática"],["💨","Técnicas de regulação","Respiração, mindfulness e relaxamento interrompem a resposta física"],["🧩","Reestruturação cognitiva","Questione os pensamentos catastróficos — são fatos ou suposições?"]].map(([e,t,d])=>(
            <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px"}}>
              <div style={{fontSize:18,flexShrink:0}}>{e}</div>
              <div>
                <div style={{color:"#f3e6ff",fontSize:12,fontWeight:500,marginBottom:2}}>{t}</div>
                <div style={{color:"#d9b3f5",fontSize:11,lineHeight:1.4}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>O que você tem evitado por ansiedade? Cada vez que evita, o medo ganha poder. Cada vez que enfrenta — mesmo com medo — você retoma o controle. 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoDesmontarAnsiedade({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🧠</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Você pode desmontar o circuito cerebral da ansiedade</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>4 passos para retomar o comando da sua própria vida.</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {[
          {n:"1",e:"🔍",t:"SEPARAR",c:"#7B00C4",bg:"#f9f0ff",tc:"#3d006a",dc:"#5a0090",d:"Quando separamos a ansiedade de quem você é, podemos colocá-la no banco do carona. Assim você que estará no comando — não importa o quanto a ansiedade grite."},
          {n:"2",e:"🎯",t:"CONHECER",c:"#9a00e0",bg:"#f3e6ff",tc:"#3d006a",dc:"#5a0090",d:"A ansiedade é composta por sensações físicas, pensamentos automáticos negativos e ações comportamentais. Quando conhecemos esses três aspectos em nós mesmos, podemos desarmar o ciclo ansioso."},
          {n:"3",e:"🛡️",t:"NEUTRALIZAR",c:"#b040e0",bg:"#f9f0ff",tc:"#3d006a",dc:"#5a0090",d:"É importante reunir ferramentas estratégicas de força mental antes que a crise de ansiedade comece — e treinar o sistema natural de relaxamento e confiança do corpo."},
          {n:"4",e:"🗺️",t:"PLANEJAR",c:"#c870f0",bg:"#f3e6ff",tc:"#3d006a",dc:"#5a0090",d:"Para vencer a ansiedade precisamos mapear como e quando ela tende a atacar. Assim criamos um roteiro de como agir — com ações práticas e declarações de coragem."},
        ].map(({n,e,t,c,bg,tc,dc,d})=>(
          <div key={n} style={{background:bg,padding:"14px 20px",borderBottom:"1px solid #e8c8ff",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:c,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{n}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:18}}>{e}</span>
                <span style={{fontSize:13,fontWeight:600,color:tc,letterSpacing:1}}>{t}</span>
              </div>
              <div style={{fontSize:12,color:dc,lineHeight:1.6}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>Em qual dos 4 passos você sente que precisa trabalhar mais? A consciência sobre o próprio processo ansioso já é, em si, um ato de cura. 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// PSICOEDUCAÇÕES VISUAIS — TCC
// ═══════════════════════════════════════════════════════════════════════

function PsicoModeloABC({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔺</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>O que realmente gera suas emoções?</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Não é o evento — é o que você acredita sobre ele.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:12}}>O Modelo ABC da TCC</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            {l:"A","t":"Adversidade","e":"📌","d":"O evento que aconteceu — o fato puro, sem julgamento","c":"#7B00C4"},
            {l:"B","t":"Belief (Crença)","e":"🧠","d":"O que você acredita, pensa ou interpreta sobre o evento","c":"#9a00e0"},
            {l:"C","t":"Consequência","e":"💭","d":"A emoção e o comportamento que surgem da crença","c":"#b040e0"},
          ].map(({l,t,e,d,c})=>(
            <div key={l} style={{display:"flex",gap:12,alignItems:"flex-start",background:"white",borderRadius:10,padding:"10px 14px",border:"1px solid #e8c8ff"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:c,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0}}>{l}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                  <span style={{fontSize:16}}>{e}</span>
                  <span style={{fontSize:13,fontWeight:600,color:"#3d006a"}}>{t}</span>
                </div>
                <div style={{fontSize:12,color:"#5a0090",lineHeight:1.5}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#7B00C4",padding:"16px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:10}}>Exemplo prático</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{color:"#d9b3f5",fontSize:11,fontWeight:500,marginBottom:4}}>Situação A (mesmo evento)</div>
            <div style={{color:"#f3e6ff",fontSize:11,lineHeight:1.4}}>Chefe critica seu trabalho</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{color:"#d9b3f5",fontSize:11,fontWeight:500,marginBottom:4}}>Situação A (mesmo evento)</div>
            <div style={{color:"#f3e6ff",fontSize:11,lineHeight:1.4}}>Chefe critica seu trabalho</div>
          </div>
          <div style={{background:"rgba(249,115,22,0.2)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(249,115,22,0.3)"}}>
            <div style={{color:"#fed7aa",fontSize:11,fontWeight:500,marginBottom:4}}>B: "Sou um fracasso"</div>
            <div style={{color:"#fde68a",fontSize:11}}>C: Tristeza, desmotivação</div>
          </div>
          <div style={{background:"rgba(34,197,94,0.2)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(34,197,94,0.3)"}}>
            <div style={{color:"#86efac",fontSize:11,fontWeight:500,marginBottom:4}}>B: "Posso melhorar"</div>
            <div style={{color:"#86efac",fontSize:11}}>C: Motivação, foco</div>
          </div>
        </div>
        <div style={{color:"#d9b3f5",fontSize:12,marginTop:10,textAlign:"center",fontStyle:"italic"}}>Mesmo A — B diferente — C completamente diferente</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:6}}>🎯 Na prática</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>Pense em uma situação que te deixou mal. Escreva o A (fato), o B (o que você acreditou) e o C (emoção). Agora invente um B diferente — o que mudaria?</div>
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>Você não pode controlar tudo que acontece (A), mas pode trabalhar suas crenças (B) — e isso muda tudo no que você sente (C). 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoPensamentos({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>💭</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Seus pensamentos criam sua realidade emocional</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Não são as coisas em si — é o que você acredita sobre elas.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:10}}>Como funciona o ciclo</div>
        <div style={{display:"flex",justifyContent:"space-around",alignItems:"center",flexWrap:"wrap",gap:8}}>
          {[["💭","Pensamento"],["💓","Emoção"],["🏃","Comportamento"],["🌍","Resultado"]].map(([e,t],i,arr)=>(
            <React.Fragment key={t}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:4}}>{e}</div>
                <div style={{fontSize:11,color:"#5a0090",fontWeight:500}}>{t}</div>
              </div>
              {i<arr.length-1&&<div style={{color:"#b040e0",fontSize:18,fontWeight:700}}>→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div style={{background:"#7B00C4",padding:"16px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:10}}>O mesmo evento — perspectivas diferentes</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            {p:"'Fui ignorado — ninguém gosta de mim'",e:"Tristeza, isolamento",cor:"rgba(249,115,22,0.2)",bc:"rgba(249,115,22,0.4)"},
            {p:"'Fui ignorado — ela deve estar ocupada'",e:"Neutralidade, tranquilidade",cor:"rgba(34,197,94,0.2)",bc:"rgba(34,197,94,0.4)"},
          ].map(({p,e,cor,bc})=>(
            <div key={p} style={{background:cor,borderRadius:8,padding:"10px 12px",border:"1px solid "+bc}}>
              <div style={{color:"#f3e6ff",fontSize:12,fontStyle:"italic",marginBottom:4}}>{p}</div>
              <div style={{color:"#d9b3f5",fontSize:11}}>→ {e}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f9f0ff",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:6}}>🎯 Na prática</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>Hoje, quando notar uma emoção forte, pergunte: "Que pensamento veio antes disso?" Escreva num papel. Só observar já começa a mudar tudo.</div>
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>Que história sua mente conta sobre você quando as coisas dão errado? Essa história é um fato — ou uma interpretação? 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoPizzaResponsabilidade({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🍕</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Você carrega mais culpa do que te pertence?</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Dividir a responsabilidade libera peso — sem isentar ninguém.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:10}}>Os dois extremos que nos prendem</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:"#f3e6ff",borderRadius:10,padding:"12px 14px",border:"1px solid #d9b3f5"}}>
            <div style={{fontSize:22,marginBottom:6}}>😔</div>
            <div style={{color:"#3d006a",fontSize:12,fontWeight:500,marginBottom:4}}>Autoculpa tóxica</div>
            <div style={{color:"#5a0090",fontSize:11,lineHeight:1.5}}>"Tudo foi culpa minha." Você assume 100% de uma situação que tinha múltiplos fatores.</div>
          </div>
          <div style={{background:"#f3e6ff",borderRadius:10,padding:"12px 14px",border:"1px solid #d9b3f5"}}>
            <div style={{fontSize:22,marginBottom:6}}>😤</div>
            <div style={{color:"#3d006a",fontSize:12,fontWeight:500,marginBottom:4}}>Vitimização</div>
            <div style={{color:"#5a0090",fontSize:11,lineHeight:1.5}}>"A culpa é sempre do outro." Você se isenta completamente e perde o poder de mudar.</div>
          </div>
        </div>
      </div>
      <div style={{background:"#7B00C4",padding:"16px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:10}}>A pizza da responsabilidade</div>
        <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="#9a00e0"/>
            <path d="M80 80 L80 10 A70 70 0 0 1 140.6 45 Z" fill="#F97316"/>
            <path d="M80 80 L140.6 45 A70 70 0 0 1 140.6 115 Z" fill="#0EA5E9"/>
            <path d="M80 80 L140.6 115 A70 70 0 0 1 19.4 115 Z" fill="#22C55E"/>
            <path d="M80 80 L19.4 115 A70 70 0 0 1 19.4 45 Z" fill="#EAB308"/>
            <path d="M80 80 L19.4 45 A70 70 0 0 1 80 10 Z" fill="#EC4899"/>
            <circle cx="80" cy="80" r="20" fill="#7B00C4"/>
            <text x="80" y="84" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">VOCÊ</text>
          </svg>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
          {[["#F97316","Suas escolhas"],["#0EA5E9","O outro envolvido"],["#22C55E","As circunstâncias"],["#EAB308","O contexto"],["#EC4899","O acaso"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:c,flexShrink:0}}/>
              <span style={{fontSize:11,color:"#f3e6ff"}}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f9f0ff",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:6}}>🎯 Na prática</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>Pense num problema recente. Divida: qual parte foi sua? Qual foi do outro? Qual foi das circunstâncias? Você ficará surpreso com o quanto não precisa carregar.</div>
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>Você costuma assumir mais ou menos responsabilidade do que te pertence? Qual dos dois extremos é mais comum em você? 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoFatosInterpretacoes({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔍</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Você acredita em tudo que sua mente diz?</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Separar fatos de interpretações é uma das habilidades mais poderosas da TCC.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:10}}>Qual é a diferença?</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:"#f3e6ff",borderRadius:10,padding:"12px 14px",border:"2px solid #7B00C4"}}>
            <div style={{color:"#3d006a",fontSize:12,fontWeight:600,marginBottom:6}}>📌 Fato</div>
            <div style={{color:"#5a0090",fontSize:11,lineHeight:1.5}}>O que aconteceu objetivamente. Pode ser verificado. Qualquer pessoa que estivesse lá veria a mesma coisa.</div>
          </div>
          <div style={{background:"#fff7ed",borderRadius:10,padding:"12px 14px",border:"2px solid #F97316"}}>
            <div style={{color:"#9a3412",fontSize:12,fontWeight:600,marginBottom:6}}>🧠 Interpretação</div>
            <div style={{color:"#7c2d12",fontSize:11,lineHeight:1.5}}>O significado que sua mente atribui ao fato. Depende da sua história, crenças e estado emocional.</div>
          </div>
        </div>
      </div>
      <div style={{background:"#7B00C4",padding:"16px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:10}}>Exemplos do dia a dia</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            {f:"Ela não respondeu minha mensagem",i:"Deve estar com raiva de mim"},
            {f:"Meu chefe não sorriu para mim",i:"Devo ter feito algo errado"},
            {f:"Fui reprovado na prova",i:"Não sou inteligente o suficiente"},
          ].map(({f,i})=>(
            <div key={f} style={{background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 12px"}}>
              <div style={{color:"#f3e6ff",fontSize:11,marginBottom:3}}><span style={{color:"#d9b3f5",fontWeight:500}}>Fato:</span> {f}</div>
              <div style={{color:"#fde68a",fontSize:11}}><span style={{color:"#fde68a",fontWeight:500}}>Interpretação:</span> {i}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f9f0ff",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:6}}>🎯 Na prática</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>Pegue uma situação que te incomodou hoje. Separe: o que REALMENTE aconteceu? E o que VOCÊ acrescentou com sua interpretação? Escreva os dois lados.</div>
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>Quantas vezes sua mente criou uma história sobre alguém — e você sofreu por algo que nunca aconteceu de verdade? 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoSempreNunca({cat}){
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>∞</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>"Eu SEMPRE faço isso errado" — isso é verdade?</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>A supergeneralização transforma eventos pontuais em verdades permanentes.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:10}}>O que é supergeneralização?</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6,marginBottom:12}}>É quando transformamos um evento específico em uma regra geral sobre nós, os outros ou o mundo. Uma experiência ruim vira uma "verdade eterna".</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {a:"Errei uma vez",b:"SEMPRE erro tudo"},
            {a:"Ela não me ouviu hoje",b:"NUNCA me ouve"},
            {a:"Não consegui dormir ontem",b:"NUNCA durmo bem"},
          ].map(({a,b})=>(
            <div key={a} style={{display:"flex",alignItems:"center",gap:8,background:"white",borderRadius:8,padding:"8px 12px",border:"1px solid #e8c8ff"}}>
              <span style={{fontSize:11,color:"#5a0090",flex:1}}>{a}</span>
              <span style={{color:"#F97316",fontWeight:700,fontSize:14}}>→</span>
              <span style={{fontSize:11,color:"#F97316",fontWeight:500,flex:1}}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#7B00C4",padding:"16px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:10}}>Como quebrar a generalização</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {de:"SEMPRE / NUNCA",para:"Desta vez / Às vezes / Com frequência"},
            {de:"TODO MUNDO",para:"Algumas pessoas / Nesse contexto"},
            {de:"SOU assim",para:"Agi assim nessa situação"},
          ].map(({de,para})=>(
            <div key={de} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 12px"}}>
              <span style={{fontSize:11,color:"#fde68a",fontWeight:500,flex:1}}>{de}</span>
              <span style={{color:"#86efac",fontWeight:700}}>→</span>
              <span style={{fontSize:11,color:"#86efac",flex:1}}>{para}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f9f0ff",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:500,marginBottom:6}}>🎯 Na prática</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>Quando notar um "sempre" ou "nunca" no seu pensamento, troque por: "desta vez", "às vezes", "com frequência". Observe como a frase — e a emoção — mudam completamente.</div>
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>Que "verdades permanentes" você carrega sobre si mesmo que na verdade foram apenas momentos passageiros? 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function Psico7Distorcoes({cat}){
  const distorcoes = [
    {e:"📢",t:"Generalização Excessiva",d:"Tirar conclusões amplas com base em uma única experiência negativa.",ex:"'Eu sempre falho.'"},
    {e:"🎭",t:"Pensamento Dicotômico",d:"Ver as coisas como preto ou branco, sem considerar outras opções — o famoso 8 ou 80.",ex:"'Ou faço perfeito ou não faço.'"},
    {e:"👥",t:"Leitura da Mente",d:"Presumir que sabe o que os outros estão pensando ou sentindo, sem evidências.",ex:"'Ele está com raiva de mim.'"},
    {e:"👤",t:"Culpa Pessoal",d:"Atribuir a si mesmo a culpa por tudo que acontece de ruim.",ex:"'Estraguei tudo mesmo.'"},
    {e:"💔",t:"Raciocínio Emocional",d:"Tomar decisões com base em emoções em vez de fatos ou lógica.",ex:"'Sinto que vai dar errado, então vai.'"},
    {e:"🏆",t:"Desqualificação do Positivo",d:"Nomear eventos positivos como sorte ou coincidência, nunca como conquista.",ex:"'Foi pura sorte.'"},
    {e:"🌪️",t:"Catastrofização",d:"Supor que as coisas sempre serão as piores possíveis, sem considerar outras saídas.",ex:"'Não vai dar certo de jeito nenhum.'"},
  ];
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🧩</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Sua mente te engana — e você nem percebe</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>As 7 distorções de pensamento mais comuns que afetam como você sente e age.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.6}}>Distorções cognitivas são padrões de pensamento que levam a conclusões imprecisas e negativas. Eles se repetem na nossa mente, afetando nossa interpretação da realidade, nossos sentimentos e nossas reações.</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {distorcoes.map(({e,t,d,ex},i)=>(
          <div key={t} style={{padding:"12px 20px",borderBottom:"1px solid #e8c8ff",background:i%2===0?"#f9f0ff":"white",display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:"#7B00C4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{e}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"#3d006a",marginBottom:3}}>{t}</div>
              <div style={{fontSize:12,color:"#5a0090",lineHeight:1.5,marginBottom:4}}>{d}</div>
              <div style={{fontSize:11,color:"#9a00e0",fontStyle:"italic",background:"#f3e6ff",borderRadius:6,padding:"3px 8px",display:"inline-block"}}>{ex}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>Reflita</div>
        <div style={{color:"#7B00C4",fontSize:12,lineHeight:1.6}}>Qual dessas distorções aparece mais nos seus pensamentos? Reconhecer o padrão é o primeiro passo para mudar a narrativa interna. 💜</div>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

// Mapa de visualizações
const PSICO_VISUAIS = {
  "Preocupação produtiva vs. improdutiva": PsicoPreocupacao,
  "A armadilha do pior cenário": PsicoPiorCenario,
  "Eustresse vs. distresse": PsicoEustresse,
  "O ciclo da ansiedade": PsicoCicloAnsiedade,
  "Desmontar o Circuito Cerebral da Ansiedade": PsicoDesmontarAnsiedade,
  "O modelo ABC na prática": PsicoModeloABC,
  "O poder dos pensamentos": PsicoPensamentos,
  "A pizza da responsabilidade": PsicoPizzaResponsabilidade,
  "Fatos vs. interpretações": PsicoFatosInterpretacoes,
  "O perigo do sempre e nunca": PsicoSempreNunca,
  "7 Distorções de Pensamento": Psico7Distorcoes,
};

const CATS_PSICOEDUCACAO = {
  tcc:              {label:"TCC",                  cor:"#7B00C4", bg:"#f3e6ff", accent:"#0EA5E9"},
  ansiedade:        {label:"Ansiedade",            cor:"#7B00C4", bg:"#f3e6ff", accent:"#F97316"},
  emocoes:          {label:"Emoções",              cor:"#7B00C4", bg:"#f3e6ff", accent:"#F43F5E"},
  autocuidado:      {label:"Autocuidado",          cor:"#7B00C4", bg:"#f3e6ff", accent:"#22C55E"},
  relacionamentos:  {label:"Relacionamentos",      cor:"#7B00C4", bg:"#f3e6ff", accent:"#EF4444"},
  casais:           {label:"Casais",               cor:"#7B00C4", bg:"#f3e6ff", accent:"#EC4899"},
  corpo:            {label:"Corpo & Alimentação",  cor:"#7B00C4", bg:"#f3e6ff", accent:"#EAB308"},
  esquema:          {label:"Terapia do Esquema",   cor:"#7B00C4", bg:"#f3e6ff", accent:"#8B5CF6"},
  outros:           {label:"Outros",               cor:"#7B00C4", bg:"#f3e6ff", accent:"#64748B"},
};

function AbaPsicoeducacao() {
  const [itens, setItens]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editando, setEditando]   = useState(null);
  const [salvando, setSalvando]   = useState(false);
  const [filtro, setFiltro]       = useState("todos");
  const [aberto, setAberto]       = useState(null);

  const MIGRACAO_PSICO = {
    "autoestima":"emocoes","mindfulness":"emocoes","trauma":"esquema",
    "depressao":"emocoes","habitos":"autocuidado",
  };

  async function migrarCatPsico(){
    if(!confirm("Migrar categorias antigas de psicoeducação?")) return;
    setSalvando(true);
    try{
      const snap = await db.collection("clinica_psicoeducacao").get();
      let count = 0;
      for(const doc of snap.docs){
        const cat = doc.data().categoria;
        const nova = MIGRACAO_PSICO[cat];
        if(nova){ await db.collection("clinica_psicoeducacao").doc(doc.id).update({categoria:nova}); count++; }
      }
      alert("✓ "+count+" psicoeducações migradas!");
    } catch(e){ alert("Erro: "+e.message); }
    setSalvando(false);
  }
  const [form, setForm] = useState({titulo:"",descricao:"",categoria:"ansiedade",conteudo:"",emoji:"📚",tipo:"texto"});

  useEffect(()=>{
    const unsub = db.collection("clinica_psicoeducacao").onSnapshot(s=>{
      setItens(s.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
  },[]);

  async function salvar(){
    if(!form.titulo){alert("Título obrigatório.");return;}
    setSalvando(true);
    if(editando){
      await db.collection("clinica_psicoeducacao").doc(editando).update(form);
    } else {
      await db.collection("clinica_psicoeducacao").add({...form,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    }
    setModal(false);setEditando(null);setForm({titulo:"",descricao:"",categoria:"ansiedade",conteudo:"",emoji:"📚",tipo:"texto"});setSalvando(false);
  }

  async function popularPilulas() {
    if (!confirm(`Isso vai adicionar as pílulas TCC ao banco. Continuar?`)) return;
    setSalvando(true);
    try {
      for (const p of PILULAS_TCC) {
        await db.collection("clinica_psicoeducacao").add({
          ...p, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      alert("✓ Pílulas TCC adicionadas com sucesso!");
    } catch(e) { alert("Erro ao popular: " + e.message); }
    setSalvando(false);
  }

  async function sincronizarNovas() {
    setSalvando(true);
    try {
      const snap = await db.collection("clinica_psicoeducacao").get();
      const titulosExistentes = snap.docs.map(d=>d.data().titulo);
      const novas = PILULAS_TCC.filter(p=>!titulosExistentes.includes(p.titulo));
      if(novas.length===0){alert("Todas as psicoeducações já estão no banco!");setSalvando(false);return;}
      for(const p of novas){
        await db.collection("clinica_psicoeducacao").add({...p,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      }
      alert("✓ "+novas.length+" nova(s) psicoeducação(ões) adicionada(s): "+novas.map(p=>p.titulo).join(", "));
    } catch(e){alert("Erro: "+e.message);}
    setSalvando(false);
  }

  const cats = ["todos",...Object.keys(CATS_PSICOEDUCACAO)];
  const filtrados = filtro==="todos" ? itens : itens.filter(i=>i.categoria===filtro);

  if(loading) return <Spinner/>;

  if(aberto){
    const cat = CATS_PSICOEDUCACAO[aberto.categoria]||CATS_PSICOEDUCACAO.outros;
    const VisualComp = PSICO_VISUAIS[aberto.visualKey||aberto.titulo];
    return (
      <div>
        <button className="btn btn-ghost" style={{marginBottom:16,padding:"8px 12px"}} onClick={()=>setAberto(null)}>
          <Icon name="arrow-left" size={16}/> Todos os materiais
        </button>
        {VisualComp ? <VisualComp cat={cat}/> : (
          <>
            <div className="card" style={{marginBottom:16,background:cat.cor,color:"white"}}>
              <div style={{textAlign:"center",padding:"8px 0 16px"}}>
                <div style={{fontSize:52,marginBottom:12}}>{aberto.emoji||"📚"}</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,marginBottom:8}}>{aberto.titulo}</div>
                <span style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 14px",fontSize:12}}>{cat.label}</span>
              </div>
            </div>
            {aberto.descricao&&<div className="card" style={{marginBottom:12}}><p style={{fontSize:14,color:"var(--text-muted)",fontStyle:"italic"}}>{aberto.descricao}</p></div>}
            {aberto.conteudo&&<div className="card"><div style={{fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{aberto.conteudo}</div></div>}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,color:"var(--text-muted)"}}>{itens.length} material{itens.length!==1?"is":""} de psicoeducação</div>
        <div style={{display:"flex",gap:8}}>
          {itens.length===0&&(
            <button className="btn btn-outline" style={{fontSize:12}} onClick={popularPilulas} disabled={salvando}>
              <Icon name="download" size={14}/> {salvando?"Adicionando...":"Popular pílulas TCC"}
            </button>
          )}
          {itens.length>0&&(
            <button className="btn btn-outline" style={{fontSize:12}} onClick={sincronizarNovas} disabled={salvando}>
              <Icon name="refresh-cw" size={14}/> {salvando?"Sincronizando...":"Sincronizar novas"}
            </button>
          )}
          {itens.length>0&&(
            <button className="btn btn-outline" style={{fontSize:12}} onClick={migrarCatPsico} disabled={salvando}>
              <Icon name="layers" size={14}/> Migrar categorias
            </button>
          )}
          <button className="btn btn-purple" onClick={()=>{setForm({titulo:"",descricao:"",categoria:"ansiedade",conteudo:"",emoji:"📚",tipo:"texto"});setEditando(null);setModal(true);}}>
            <Icon name="plus" size={16}/> Novo Material
          </button>
        </div>
      </div>

      {/* Filtro por categoria */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {cats.map(cat=>{
          const info = CATS_PSICOEDUCACAO[cat];
          const count = cat==="todos"?itens.length:itens.filter(i=>i.categoria===cat).length;
          if(count===0&&cat!=="todos") return null;
          return (
            <button key={cat} onClick={()=>setFiltro(cat)}
              style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid",borderColor:filtro===cat?(info?.cor||"var(--purple)"):"var(--gray-200)",background:filtro===cat?(info?.bg||"var(--purple-bg)"):"white",color:filtro===cat?(info?.cor||"var(--purple)"):"var(--gray-600)",fontSize:12,cursor:"pointer",fontWeight:filtro===cat?600:400}}>
              {cat==="todos"?"Todos":info?.label} ({count})
            </button>
          );
        })}
      </div>

      {filtrados.length===0
        ? <div style={{textAlign:"center",padding:40,color:"var(--text-muted)",fontSize:14}}>
            Nenhum material cadastrado ainda.<br/>
            <button className="btn btn-purple" style={{marginTop:12}} onClick={()=>setModal(true)}>Adicionar primeiro material</button>
          </div>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
            {filtrados.map(item=>{
              const cat = CATS_PSICOEDUCACAO[item.categoria]||CATS_PSICOEDUCACAO.outros;
              return (
                <div key={item.id} style={{background:"white",borderRadius:12,border:"1px solid var(--gray-200)",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
                  <div style={{background:cat.bg,padding:"20px 16px",textAlign:"center",borderBottom:"1px solid "+cat.cor+"20"}}>
                    <div style={{fontSize:36,marginBottom:8}}>{item.emoji||"📚"}</div>
                    <div style={{fontWeight:700,fontSize:14,color:cat.cor}}>{item.titulo}</div>
                    <span style={{background:cat.cor+"20",color:cat.cor,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,marginTop:6,display:"inline-block"}}>{cat.label}</span>
                  </div>
                  <div style={{padding:"12px 16px"}}>
                    {item.descricao&&<p style={{fontSize:12,color:"var(--text-muted)",marginBottom:10,lineHeight:1.5}}>{item.descricao.slice(0,80)}{item.descricao.length>80?"...":""}</p>}
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-ghost" style={{flex:1,fontSize:12,padding:"6px 0"}} onClick={()=>setAberto(item)}>
                        <Icon name="eye" size={13}/> Ver
                      </button>
                      <button className="btn btn-ghost" style={{fontSize:12,padding:"6px 10px"}} onClick={()=>{setForm({titulo:item.titulo||"",descricao:item.descricao||"",categoria:item.categoria||"ansiedade",conteudo:item.conteudo||"",emoji:item.emoji||"📚",tipo:item.tipo||"texto"});setEditando(item.id);setModal(true);}}>
                        <Icon name="edit-2" size={13}/>
                      </button>
                      <button className="btn btn-ghost" style={{fontSize:12,padding:"6px 10px",color:"var(--danger)"}} onClick={()=>excluir(item.id)}>
                        <Icon name="trash-2" size={13}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      }

      {/* Modal cadastro */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"18px 24px",borderBottom:"1px solid var(--gray-100)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,fontSize:16}}>{editando?"Editar Material":"Novo Material de Psicoeducação"}</div>
              <button onClick={()=>setModal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--text-muted)"}}>×</button>
            </div>
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"60px 1fr",gap:10}}>
                <div>
                  <label style={{fontWeight:600,fontSize:12,display:"block",marginBottom:6}}>Emoji</label>
                  <input className="form-input" value={form.emoji} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} style={{textAlign:"center",fontSize:20}}/>
                </div>
                <div>
                  <label style={{fontWeight:600,fontSize:12,display:"block",marginBottom:6}}>Título *</label>
                  <input className="form-input" value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Ex: O que é ansiedade?"/>
                </div>
              </div>
              <div>
                <label style={{fontWeight:600,fontSize:12,display:"block",marginBottom:6}}>Categoria</label>
                <select className="form-input" value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                  {Object.entries(CATS_PSICOEDUCACAO).map(([id,{label}])=><option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontWeight:600,fontSize:12,display:"block",marginBottom:6}}>Descrição breve</label>
                <input className="form-input" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Resumo do material..."/>
              </div>
              <div>
                <label style={{fontWeight:600,fontSize:12,display:"block",marginBottom:6}}>Conteúdo completo</label>
                <TextAreaVoz className="form-input" rows={6} value={form.conteudo} onChange={e=>setForm(f=>({...f,conteudo:e.target.value}))} placeholder="Texto educativo completo..." style={{resize:"vertical"}}/>
              </div>
            </div>
            <div style={{padding:"14px 24px",borderTop:"1px solid var(--gray-100)",display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="btn btn-purple">{salvando?"Salvando...":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RecursosTerapeuticos({ user }) {
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCateg, setFiltroCateg] = useState("todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({titulo:"",descricao:"",categoria:"tcc",tipo:"interativa",formularioKey:"",musicUrl:""});
  const [salvando, setSalvando] = useState(false);
  const [abaView, setAbaView] = useState("ferramentas");

  useEffect(()=>{
    const unsub = db.collection("clinica_recursos").onSnapshot(snap=>{
      setRecursos(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
  },[]);

  const abaRecursos = recursos.filter(r=>abaView==="ferramentas"?r.categoria!=="casal":r.categoria==="casal");
  const filtrados = abaRecursos.filter(r=>{
    const cOk = filtroCateg==="todos" || r.categoria===filtroCateg;
    const bOk = !busca || r.titulo?.toLowerCase().includes(busca.toLowerCase()) || r.descricao?.toLowerCase().includes(busca.toLowerCase());
    return cOk && bOk;
  });

  const porCategoria = CATEGORIAS_RECURSOS.reduce((acc,cat)=>{
    const itens = filtrados.filter(r=>r.categoria===cat.id);
    if(itens.length>0) acc.push({...cat, itens});
    return acc;
  },[]);

  async function salvar(){
    if(!form.titulo){alert("Titulo obrigatorio.");return;}
    setSalvando(true);
    if(editando){
      await db.collection("clinica_recursos").doc(editando).update(form);
    } else {
      await db.collection("clinica_recursos").add({...form,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    }
    setModal(false);setForm({titulo:"",descricao:"",categoria:"tcc",tipo:"interativa",formularioKey:"",musicUrl:""});setEditando(null);setSalvando(false);
  }

  async function excluir(id){if(!confirm("Excluir recurso?"))return;await db.collection("clinica_recursos").doc(id).delete();}

  function abrirEditar(r){
    setForm({titulo:r.titulo||"",descricao:r.descricao||"",categoria:r.categoria||"tcc",tipo:r.tipo||"interativa",formularioKey:r.formularioKey||"",musicUrl:r.musicUrl||""});
    setEditando(r.id);setModal(true);
  }

  const getCatInfo = (id) => CATEGORIAS_RECURSOS.find(c=>c.id===id)||CATEGORIAS_RECURSOS[6];
  const ICONES_FERRAMENTA={"breathing-478":"💨","muscle-relaxation":"💪","decision-tree":"🌳","abc-record":"📋","anxiety-management":"🎯","emotional-eating":"🍃","entrevista-clinica":"📝","anamnese":"📄","treino-neuro-auditivo":"🎵","diario-terapeutico":"📓"};
  const getIcone=(r)=>ICONES_FERRAMENTA[r.formularioKey]||(r.categoria==="tcc"?"🧠":r.categoria==="ansiedade"?"😮":r.categoria==="emocoes"?"💜":r.categoria==="autocuidado"?"🌱":r.categoria==="relacionamentos"?"❤️":r.categoria==="corpo"?"🥗":r.categoria==="esquema"?"🔑":r.categoria==="musicoterapia"?"🎵":r.categoria==="avaliacao"?"📋":"🔧");
  const [visualizando, setVisualizando] = useState(null);

  if(loading) return <Spinner/>;

  if(visualizando) return <ModalVisualizarFerramenta recurso={visualizando} onClose={()=>setVisualizando(null)} user={user}/>;
  return (
    <div>
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div style={{minWidth:0,flex:1}}>
          <div className="page-title">Recursos Terapeuticos</div>
          <div className="page-subtitle">{recursos.length} ferramenta{recursos.length!==1?"s":""} · {recursos.filter(r=>r.tipo==="interativa").length} interativas · {recursos.filter(r=>r.tipo==="conteudo").length} de conteudo</div>
        </div>
        <button className="btn btn-purple" onClick={()=>{setForm({titulo:"",descricao:"",categoria:"tcc",tipo:"interativa",formularioKey:"",musicUrl:""});setEditando(null);setModal(true);}}>
          <Icon name="plus" size={16}/> Nova Ferramenta
        </button>
      </div>

      {/* Abas — 3 abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid var(--gray-200)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        {[["ferramentas","Ferramentas","wrench"],["fabulas","Fábulas Terapêuticas","book-open"],["psicoeducacao","Psicoeducação","brain"],["casais","Terapia de Casais","heart"]].map(([id,label,ic])=>(
          <button key={id} onClick={()=>setAbaView(id)} style={{padding:"10px 16px",border:"none",background:"none",cursor:"pointer",fontSize:13,color:abaView===id?"var(--purple)":"var(--gray-600)",borderBottom:abaView===id?"2px solid var(--purple)":"2px solid transparent",fontWeight:abaView===id?600:400,fontFamily:"var(--font-body)",marginBottom:-1,display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",flexShrink:0}}>
            <Icon name={ic} size={15}/>{label}
          </button>
        ))}
      </div>

      {/* Aba Fábulas */}
      {abaView==="fabulas"&&<AbaFabulas/>}

      {/* Aba Psicoeducação */}
      {abaView==="psicoeducacao"&&<AbaPsicoeducacao/>}

      {/* Aba Terapia de Casais */}
      {abaView==="casais"&&<AbaProtocoloCasais/>}

      {/* Aba Ferramentas — busca + filtros + grid */}
      {abaView==="ferramentas"&&(<>
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <input className="form-input" style={{flex:1,minWidth:200}} placeholder="Buscar por nome, descricao ou tipo..." value={busca} onChange={e=>setBusca(e.target.value)}/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button className={"btn "+(filtroCateg==="todos"?"btn-purple":"btn-ghost")} style={{fontSize:12}} onClick={()=>setFiltroCateg("todos")}>Todas {recursos.length}</button>
          {CATEGORIAS_RECURSOS.map(c=>{
            const n = recursos.filter(r=>r.categoria===c.id).length;
            if(!n) return null;
            return <button key={c.id} className={"btn "+(filtroCateg===c.id?"btn-purple":"btn-ghost")} style={{fontSize:12}} onClick={()=>setFiltroCateg(c.id)}>{c.label.split(" ")[0]} {n}</button>;
          })}
        </div>
      </div>
      {filtrados.length===0?(
        <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>
          <Icon name="wrench" size={40}/>
          <div style={{marginTop:12}}>Nenhuma ferramenta encontrada.</div>
        </div>
      ):(
        porCategoria.map(cat=>(
          <div key={cat.id} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,paddingBottom:8,borderBottom:"1px solid var(--gray-100)"}}>
              <span style={{fontWeight:700,fontSize:12,color:cat.cor,textTransform:"uppercase",letterSpacing:"0.8px"}}>{cat.label}</span>
              <span style={{background:cat.bg,color:cat.cor,borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:600}}>{cat.itens.length}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
              {cat.itens.map(r=>(
                <div key={r.id} style={{background:"white",border:"1.5px solid",borderColor:cat.cor+"40",borderRadius:14,padding:18,display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <div style={{width:44,height:44,borderRadius:10,background:cat.cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{getIcone(r)}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{background:cat.bg,color:cat.cor,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600,border:"1px solid "+cat.cor+"30"}}>{r.tipo==="interativa"?"INTERATIVA":"CONTEÚDO"}</span>
                        {r.categoria==="musicoterapia"&&<span style={{background:"#f3e6ff",color:"#7B00C4",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}>Música</span>}
                      </div>
                      <div style={{fontWeight:600,fontSize:14}}>{r.titulo}</div>
                    </div>
                  </div>
                  <p style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.5,flex:1}}>{r.descricao}</p>
                  {r.formularioKey&&<span style={{fontSize:11,color:"var(--gray-400)",background:"var(--gray-50)",borderRadius:6,padding:"2px 8px",display:"inline-block",width:"fit-content"}}>{r.formularioKey}</span>}
                  <div style={{display:"flex",gap:8,borderTop:"1px solid var(--gray-100)",paddingTop:10}}>
                    <button className="btn btn-ghost" style={{fontSize:12,flex:1,color:"var(--purple)"}} onClick={()=>setVisualizando(r)}><Icon name="eye" size={13}/> Visualizar</button>
                    <button className="btn btn-ghost" style={{fontSize:12,flex:1}} onClick={()=>abrirEditar(r)}><Icon name="pencil" size={13}/> Editar</button>
                    <button className="btn btn-ghost" style={{padding:"6px 10px",color:"var(--danger)"}} onClick={()=>excluir(r.id)}><Icon name="trash-2" size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
      </>)}

      {/* Modal novo/editar recurso */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>{editando?"Editar Ferramenta":"Nova Ferramenta"}</div>
              <button onClick={()=>setModal(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)"}}><Icon name="x" size={20}/></button>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Titulo da Ferramenta *</label>
              <input className="form-input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} autoFocus/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Descricao curta</label>
              <TextAreaVoz className="form-input" rows={2} value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Categoria</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
                {CATEGORIAS_RECURSOS.map(c=>(
                  <button key={c.id} onClick={()=>setForm({...form,categoria:c.id})} style={{padding:"10px 12px",borderRadius:8,border:"1.5px solid",borderColor:form.categoria===c.id?c.cor:"var(--gray-200)",background:form.categoria===c.id?c.bg:"white",cursor:"pointer",fontSize:13,textAlign:"left",fontFamily:"var(--font-body)",color:form.categoria===c.id?c.cor:"var(--gray-700)"}}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Tipo de ferramenta</label>
              <div style={{display:"flex",gap:10}}>
                {[["conteudo","Conteudo para leitura","file-text"],["interativa","Formulario interativo","zap"]].map(([v,l,ic])=>(
                  <button key={v} onClick={()=>setForm({...form,tipo:v})} style={{flex:1,padding:"12px",borderRadius:10,border:"1.5px solid",borderColor:form.tipo===v?"var(--purple)":"var(--gray-200)",background:form.tipo===v?"var(--purple-bg)":"white",cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)",color:form.tipo===v?"var(--purple)":"var(--gray-700)",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <Icon name={ic} size={15}/>{l}
                  </button>
                ))}
              </div>
            </div>
            {form.tipo==="interativa"&&(
              <div className="form-group" style={{marginBottom:14}}>
                <label className="form-label">Formulario interativo</label>
                <select className="form-input" value={form.formularioKey} onChange={e=>setForm({...form,formularioKey:e.target.value})}>
                  <option value="">Selecionar formulario...</option>
                  {FERRAMENTAS_INTERATIVAS.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
            )}
            {(form.formularioKey==="breathing-478"||form.formularioKey==="muscle-relaxation")&&(
              <div className="form-group" style={{marginBottom:14}}>
                <label className="form-label">🎵 Link de Música (YouTube) — opcional</label>
                <input className="form-input" value={form.musicUrl||""} onChange={e=>setForm({...form,musicUrl:e.target.value})} placeholder="https://www.youtube.com/watch?v=..."/>
                <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>Tocará em loop durante o exercício no portal do paciente.</div>
              </div>
            )}
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">🎬 Link de Áudio ou Vídeo complementar — opcional</label>
              <input className="form-input" value={form.mediaUrl||""} onChange={e=>setForm({...form,mediaUrl:e.target.value})} placeholder="YouTube, Spotify, SoundCloud, Google Drive..."/>
              <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>Aparecerá como botão "▶ Ouvir / Assistir" no portal do paciente junto com a ferramenta.</div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}><Icon name="save" size={15}/> {salvando?"Salvando...":"Salvar Alteracoes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LAUDOS NEUROPSICOLÓGICOS
// ═══════════════════════════════════════════════════════
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
  const [comissoes, setComissoes] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [mesSel, setMesSel] = useState(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,"0")}`;
  });
  const [pagando, setPagando] = useState(false);

  const SALARIO_FIXO = 600;

  useEffect(() => {
    const u1 = db.collection("clinica_comissoes").orderBy("createdAt","desc")
      .onSnapshot(s => setComissoes(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
    const u2 = db.collection("clinica_lancamentos").orderBy("createdAt","desc")
      .onSnapshot(s => setLancamentos(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
    return () => { u1(); u2(); };
  }, []);

  const meses = [...new Set(comissoes.map(c=>c.mesRef))].sort().reverse();
  if (!meses.includes(mesSel) && meses.length > 0) {
    // mantém o mês selecionado mesmo sem comissões
  }

  const comissoesMes = comissoes.filter(c => c.mesRef === mesSel);
  const totalComissoes = comissoesMes.reduce((a,c) => a + (c.valorComissao||0), 0);
  const totalAPagar = SALARIO_FIXO + totalComissoes;

  // Verifica se já foi pago neste mês
  const pagamentoMes = lancamentos.find(l =>
    l.tipo_lancamento === "salario_secretaria" && l.mesRef === mesSel
  );

  const [mesLabel] = useState(() => {
    const [ano, mes] = mesSel.split("-");
    return new Date(parseInt(ano), parseInt(mes)-1, 1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  });

  function getMesLabel(mesRef) {
    const [ano, mes] = mesRef.split("-");
    return new Date(parseInt(ano), parseInt(mes)-1, 1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  }

  async function pagarSalario() {
    if (!confirm(`Confirma pagamento de R$ ${totalAPagar.toFixed(2).replace(".",",")} para Jéssica em ${getMesLabel(mesSel)}?`)) return;
    setPagando(true);
    const hoje = new Date().toISOString().slice(0,10);
    // Lança como despesa da clínica
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "salario_secretaria",
      tipo: "Salário Secretária",
      mesRef: mesSel,
      valor: totalAPagar,
      valorSalarioFixo: SALARIO_FIXO,
      valorComissoes: totalComissoes,
      data: hoje,
      status: "pago",
      obs: `Salário ${getMesLabel(mesSel)} — Jéssica Marjane`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // Marca comissões do mês como pagas
    const batch = db.batch();
    comissoesMes.forEach(c => batch.update(db.collection("clinica_comissoes").doc(c.id), { status:"pago", dataPagamento: hoje }));
    await batch.commit();
    setPagando(false);
    alert("✅ Pagamento registrado como despesa da clínica!");
  }

  const corTipoVenda = t => t==="primeira" ? "#7B00C4" : "#0891b2";
  const labelTipoVenda = t => t==="primeira" ? "🌟 Primeira Venda (10%)" : "🔁 Recorrente (5%)";

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Comissões — Jéssica</div>
          <div className="page-subtitle">Salário fixo R$ 600 + comissões por vendas</div>
        </div>
      </div>

      {/* Seletor de mês */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {(meses.length > 0 ? meses : [mesSel]).map(m => (
          <button key={m} onClick={()=>setMesSel(m)}
            style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:"var(--font-body)",fontSize:13,fontWeight:600,
              background:m===mesSel?"var(--purple)":"var(--gray-100)",
              color:m===mesSel?"white":"var(--text)"}}>
            {getMesLabel(m)}
          </button>
        ))}
      </div>

      {/* Cards resumo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:24}}>
        <div style={{background:"var(--gray-50)",borderRadius:14,padding:"18px 20px",border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Salário Fixo</div>
          <div style={{fontSize:22,fontWeight:700,color:"var(--text)"}}>R$ 600,00</div>
        </div>
        <div style={{background:"var(--gray-50)",borderRadius:14,padding:"18px 20px",border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Comissões {getMesLabel(mesSel)}</div>
          <div style={{fontSize:22,fontWeight:700,color:"#7B00C4"}}>R$ {totalComissoes.toFixed(2).replace(".",",")}</div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{comissoesMes.length} venda(s)</div>
        </div>
        <div style={{background:pagamentoMes?"#f0fdf4":"#faf5ff",borderRadius:14,padding:"18px 20px",border:`2px solid ${pagamentoMes?"#16a34a":"#7B00C4"}`}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Total a Pagar</div>
          <div style={{fontSize:26,fontWeight:800,color:pagamentoMes?"#16a34a":"#7B00C4"}}>
            R$ {totalAPagar.toFixed(2).replace(".",",")}
          </div>
          {pagamentoMes && <div style={{fontSize:11,color:"#16a34a",marginTop:4,fontWeight:600}}>✓ Pago em {pagamentoMes.data?.split("-").reverse().join("/")}</div>}
        </div>
      </div>

      {/* Botão pagar — só psicóloga vê */}
      {user.tipo==="psicologa" && !pagamentoMes && comissoesMes.length > 0 && (
        <button onClick={pagarSalario} disabled={pagando}
          style={{background:"#16a34a",color:"white",border:"none",borderRadius:10,padding:"12px 28px",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:24,fontFamily:"var(--font-body)"}}>
          {pagando ? "Registrando..." : `💰 Registrar Pagamento — R$ ${totalAPagar.toFixed(2).replace(".",",")}`}
        </button>
      )}

      {/* Lista de comissões */}
      <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-200)",fontWeight:700,fontSize:14}}>
          Detalhamento — {getMesLabel(mesSel)}
        </div>
        {comissoesMes.length === 0 ? (
          <div style={{padding:"40px 20px",textAlign:"center",color:"var(--text-muted)"}}>
            <Icon name="percent" size={32}/>
            <div style={{marginTop:8}}>Nenhuma comissão registrada neste mês</div>
          </div>
        ) : comissoesMes.map(c => (
          <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid var(--gray-100)"}}>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>{c.pacienteNome}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{c.tipo}</div>
              <span style={{fontSize:11,fontWeight:700,color:corTipoVenda(c.tipoVenda),background:corTipoVenda(c.tipoVenda)+"18",padding:"2px 8px",borderRadius:20}}>
                {labelTipoVenda(c.tipoVenda)}
              </span>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>Base: R$ {(c.valorBase||0).toFixed(2).replace(".",",")}</div>
              <div style={{fontWeight:700,fontSize:16,color:"#7B00C4"}}>+R$ {(c.valorComissao||0).toFixed(2).replace(".",",")}</div>
              {c.status==="pago" && <div style={{fontSize:11,color:"#16a34a",fontWeight:600}}>✓ Pago</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Depoimentos() {
  const [lista, setLista] = useState([]);
  const [aba, setAba] = useState("pendente");
  const [salvando, setSalvando] = useState(null);

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
  const [sessoes, setSessoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [form, setForm] = useState({pacienteId:"",data:"",hora:"09:00",duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});
  const [salvando, setSalvando] = useState(false);

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
      setSessoes(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    // Reservas da sala (Thais) — aparecem como bloqueios laranjas
    const u2 = db.collection("sala_reservas").onSnapshot(snap=>{
      const reservasSala = snap.docs.map(d=>({
        id:"sala_"+d.id, ...d.data(),
        pacienteNome: d.data().usuarioId==="thais"
          ? `🟠 Thais — ${d.data().titulo||"Sala reservada"}`
          : `🟣 ${d.data().titulo||"Sala — Lucia"}`,
        tipo:"sala", hora:d.data().horaInicio,
        status:"agendado", _sala:true
      }));
      setSessoes(prev=>{
        const semSala = prev.filter(s=>!s._sala);
        return [...semSala, ...reservasSala];
      });
    },()=>{});
    return()=>{u1();u2();};
  },[]);

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

      {/* Grade semanal — separada por período */}
      <div style={{marginBottom:24}}>
        {/* Cabeçalho dos dias */}
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}><div style={{display:"grid",gridTemplateColumns:"60px repeat(7,minmax(44px,1fr))",gap:3,marginBottom:4,minWidth:380}}>
          <div/>
          {dias.map((dia,i)=>{
            const isHoje = formatData(dia)===formatData(hoje);
            const isPassado = dia < hoje;
            return (
              <div key={i} style={{textAlign:"center",padding:"8px 4px",borderRadius:10,background:isHoje?"var(--purple)":"white",border:"1.5px solid",borderColor:isHoje?"var(--purple)":"var(--gray-200)"}}>
                <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",color:isHoje?"rgba(255,255,255,.8)":isPassado?"#9ca3af":"var(--gray-500)"}}>{DIAS_SEMANA[i]}</div>
                <div style={{fontSize:20,fontWeight:800,color:isHoje?"white":isPassado?"#9ca3af":"var(--gray-800)",lineHeight:1.2}}>{dia.getDate()}</div>
                <div style={{fontSize:9,color:isHoje?"rgba(255,255,255,.7)":"var(--gray-400)"}}>
                  {dia.toLocaleDateString("pt-BR",{month:"short"})}
                </div>
              </div>
            );
          })}
        </div></div>

        {/* Períodos */}
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:4}}>
        {[
          {label:"☀️ Manhã",   range:["06:00","12:00"], bg:"#fffbeb"},
          {label:"🌤️ Tarde",   range:["12:00","18:00"], bg:"#f0f9ff"},
          {label:"🌙 Noite",   range:["18:00","23:59"], bg:"#f5f3ff"},
        ].map(periodo=>{
          const sessoesNoPeriodo = dias.some(dia=>
            sessoesNoDia(dia).some(s=>s.hora>=periodo.range[0]&&s.hora<periodo.range[1])
          );
          return (
            <div key={periodo.label} style={{display:"grid",gridTemplateColumns:"60px repeat(7,minmax(44px,1fr))",gap:3,marginBottom:4,minWidth:380}}>
              {/* Label período */}
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"flex-end",paddingRight:8,paddingTop:8}}>
                <span style={{fontSize:11,fontWeight:600,color:"var(--gray-500)",writingMode:"horizontal-tb",whiteSpace:"nowrap"}}>{periodo.label}</span>
              </div>
              {/* Dias */}
              {dias.map((dia,i)=>{
                const isHoje = formatData(dia)===formatData(hoje);
                const sessDia = sessoesNoDia(dia).filter(s=>s.hora>=periodo.range[0]&&s.hora<periodo.range[1]);
                return (
                  <div key={i} style={{minHeight:70,background:isHoje?periodo.bg+"cc":periodo.bg,border:"1px solid",borderColor:isHoje?"var(--purple)30":"var(--gray-200)",borderRadius:8,padding:4,display:"flex",flexDirection:"column",gap:3}}>
                    {sessDia.map(s=>{
                      const st = s._sala
                        ? {bg:"#fff7ed",cor:"#ea580c",label:"Sala"}
                        : STATUS_CONFIG[s.status]||STATUS_CONFIG.agendado;
                      return (
                        <div key={s.id}
                          onClick={()=>!s._sala&&abrirEditar(s)}
                          style={{background:st.bg,borderLeft:"3px solid "+st.cor,borderRadius:5,padding:"4px 6px",cursor:s._sala?"default":"pointer",fontSize:11,lineHeight:1.4}}>
                          <div style={{fontWeight:700,color:st.cor,fontSize:12}}>{s.hora}</div>
                          <div style={{color:"#111",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11}}>
                            {s._sala ? (s.pacienteNome||"Sala") : (s.pacienteNome?.split(" ")[0]||"—")}
                          </div>
                          {!s._sala&&<div style={{color:"#6b7280",fontSize:9}}>{s.tipo}</div>}
                        </div>
                      );
                    })}
                    <button onClick={()=>{setForm({pacienteId:"",data:formatData(dia),hora:periodo.range[0]==="06:00"?"08:00":periodo.range[0]==="12:00"?"14:00":"19:00",duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});setEditando(null);setModal(true);}}
                      style={{background:"none",border:"1px dashed #d1d5db",borderRadius:4,padding:"3px",cursor:"pointer",color:"#9ca3af",fontSize:11,width:"100%",marginTop:"auto"}}>
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
        </div>{/* fecha overflow wrapper períodos */}
      </div>

      {/* Lista próximas sessões */}
      {proximas.length>0&&(
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>
            <Icon name="clock" size={16}/> Próximas Sessões
          </div>
          {proximas.map(s=>{
            const st = STATUS_CONFIG[s.status]||STATUS_CONFIG.agendado;
            const dataFmt = new Date(s.data+"T00:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"});
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--gray-100)"}}>
                <div style={{width:48,height:48,borderRadius:10,background:st.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <div style={{fontSize:11,fontWeight:700,color:st.cor}}>{s.hora}</div>
                  <div style={{fontSize:9,color:st.cor}}>{s.duracao}min</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13}}>{s.pacienteNome}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)"}}>{dataFmt} · {s.tipo}</div>
                </div>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{background:st.bg,color:st.cor,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}>{st.label}</span>
                  <select value={s.status} onChange={e=>mudarStatus(s.id,e.target.value)}
                    style={{fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,padding:"2px 4px",cursor:"pointer",background:"white",color:"#374151"}}>
                    {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={()=>excluir(s.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",padding:4}}><Icon name="trash-2" size={13}/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}>
                <Icon name="save" size={15}/> {salvando?"Salvando...":"Salvar"}
              </button>
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
function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(null);
  const notifProps = useBotaoNotificacao(user);
  function handleLogin(u){setUser(u);if(u.tipo==="psicologa")setTab("dashboard");if(u.tipo==="secretaria")setTab("pacientes");if(u.tipo==="paulo")setTab("fin-pessoal");if(u.tipo==="marketing")setTab("marketing-dashboard");}
  function handleLogout(){setUser(null);setTab(null);}
  if(!user) return <Login onLogin={handleLogin}/>;
  return (
    <div style={{maxWidth:"100vw",overflowX:"hidden"}}>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} notifProps={notifProps}/>
      <div className="header-mobile"><div className="header-mobile-logo">Administracao</div><button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button></div>
      <div className="main-content">
        {user.tipo==="psicologa"  &&tab==="dashboard"   &&<DashboardAdmin user={user}/>}
        {user.tipo==="psicologa"  &&tab==="pacientes"   &&<Pacientes user={user}/>}
        {user.tipo==="psicologa"  &&tab==="alunos"      &&<Alunos/>}
        {user.tipo==="psicologa"  &&tab==="casais"      &&<TerapiaCasais/>}
        {user.tipo==="psicologa"  &&tab==="recursos"    &&<RecursosTerapeuticos user={user}/>}
        {user.tipo==="psicologa"  &&tab==="laudos"      &&<Laudos/>}
        {user.tipo==="psicologa"  &&tab==="agenda"      &&<Agenda/>}
        {user.tipo==="psicologa"  &&tab==="fin-clinica" &&<FinanceiroClinica/>}
        {user.tipo==="psicologa"  &&tab==="comissoes"   &&<Comissoes user={user}/>}
        {user.tipo==="psicologa"  &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={false}/>}
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
        {user.tipo==="secretaria" &&tab==="fin-clinica" &&<FinanceiroClinica/>}
        {user.tipo==="secretaria" &&tab==="comissoes"   &&<Comissoes user={user}/>}
        {user.tipo==="paulo"      &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={false}/>}
        {(user.tipo==="psicologa"||user.tipo==="secretaria")&&tab==="funil-leads"&&<FunilLeads user={user}/>}
        {user.tipo==="marketing"  &&tab==="marketing-dashboard" &&<DashboardMarketing user={user}/>}
        {user.tipo==="psicologa"  &&tab==="marketing-dashboard" &&<DashboardMarketing user={user}/>}
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
const COLUNAS_FUNIL = [
  { id:"novo",        label:"Lead Novo",             cor:"#6b7280", bg:"#f3f4f6" },
  { id:"contato",     label:"Primeiro Contato",      cor:"#0891b2", bg:"#e0f2fe" },
  { id:"agendamento", label:"Agendamento Pendente",  cor:"#d97706", bg:"#fef3c7" },
  { id:"agendado",    label:"Agendado & Confirmado", cor:"#7B00C4", bg:"#f5f3ff" },
  { id:"convertido",  label:"Convertido",            cor:"#16a34a", bg:"#dcfce7" },
  { id:"perdido",     label:"Perdido",               cor:"#dc2626", bg:"#fef2f2" },
];

function parsearLeadIA(texto) {
  const linhas = texto.split("\n");
  function extrairLinha(chaves) {
    for (const linha of linhas) {
      const limpa = linha.replace(/\*/g,"").replace(/\[|\]/g,"").trim();
      for (const chave of chaves) {
        const idx = limpa.toLowerCase().indexOf(chave.toLowerCase() + ":");
        if (idx !== -1) return limpa.substring(idx + chave.length + 1).trim();
      }
    }
    return "";
  }
  return {
    nome:     extrairLinha(["Nome do Lead","Nome"]),
    telefone: extrairLinha(["WhatsApp/Contato","WhatsApp","Contato","Telefone"]),
    queixa:   extrairLinha(["Principal Queixa/Objetivo","Queixa/Objetivo","Principal Queixa","Queixa","Objetivo"]),
    servico:  extrairLinha(["Serviço de Interesse","Servico de Interesse","Serviço","Servico"]),
  };
}

function TagInputCampanha({ value=[], onChange }) {
  const [input, setInput]           = useState("");
  const [sugestoes, setSugestoes]   = useState([]);
  const [todasTags, setTodasTags]   = useState([]);

  useEffect(()=>{
    db.collection("clinica_campanhas").orderBy("nome").onSnapshot(
      s => setTodasTags(s.docs.map(d=>d.data().nome)),
      ()=>{}
    );
  },[]);

  const filtradas = input.length>0
    ? todasTags.filter(t=>t.toLowerCase().includes(input.toLowerCase()) && !value.includes(t))
    : [];

  async function adicionarTag(tag) {
    const t = tag.trim();
    if (!t || value.includes(t)) return;
    // salvar no Firebase se nova
    if (!todasTags.includes(t)) {
      await db.collection("clinica_campanhas").add({ nome:t, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
    }
    onChange([...value, t]);
    setInput(""); setSugestoes([]);
  }

  function removerTag(t) { onChange(value.filter(x=>x!==t)); }

  function onKeyDown(e) {
    if ((e.key==="Enter"||e.key===",") && input.trim()) { e.preventDefault(); adicionarTag(input); }
    if (e.key==="Backspace" && !input && value.length>0) removerTag(value[value.length-1]);
  }

  return (
    <div style={{border:"1px solid var(--gray-200)",borderRadius:8,padding:"6px 8px",background:"white",minHeight:38,cursor:"text"}}
      onClick={()=>document.getElementById("tag-input-camp")?.focus()}>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
        {value.map(t=>(
          <span key={t} style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
            {t}
            <button onClick={()=>removerTag(t)} style={{background:"none",border:"none",cursor:"pointer",color:"#ea580c",padding:0,fontSize:14,lineHeight:1}}>×</button>
          </span>
        ))}
        <div style={{position:"relative",flex:1,minWidth:120}}>
          <input id="tag-input-camp" value={input} onChange={e=>{setInput(e.target.value);}}
            onKeyDown={onKeyDown} placeholder={value.length===0?"Campanha/Origem...":""}
            style={{border:"none",outline:"none",fontSize:13,width:"100%",padding:"2px 0",background:"transparent"}}/>
          {filtradas.length>0&&(
            <div style={{position:"absolute",top:"100%",left:0,background:"white",border:"1px solid var(--gray-200)",borderRadius:8,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:100,minWidth:200}}>
              {filtradas.slice(0,6).map(t=>(
                <button key={t} onMouseDown={e=>{e.preventDefault();adicionarTag(t);}}
                  style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  {t}
                </button>
              ))}
              {input&&!todasTags.includes(input.trim())&&(
                <button onMouseDown={e=>{e.preventDefault();adicionarTag(input);}}
                  style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit",color:"#7B00C4",fontWeight:600}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  + Criar "{input.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalLead({ lead, onSalvar, onFechar, user, onConverter }) {
  const novo = !lead?.id;
  const [form, setForm]         = useState(lead || { nome:"", telefone:"", queixa:"", servico:"", campanhas:[], status:"novo", obs:"" });
  const [textoIA, setTextoIA]   = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba]           = useState("dados"); // "dados" | "timeline"
  const [interacoes, setInteracoes] = useState([]);
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const [registrando, setRegistrando]   = useState(false);
  const [excluindo, setExcluindo]        = useState(false);

  useEffect(()=>{
    if (!lead?.id) return;
    db.collection("clinica_leads").doc(lead.id).collection("interacoes")
      .orderBy("createdAt","desc")
      .onSnapshot(s=>setInteracoes(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[lead?.id]);

  function aplicarIA() {
    const parsed = parsearLeadIA(textoIA);
    if (!parsed.nome && !parsed.telefone) { alert("Não foi possível identificar os campos. Verifique o formato do texto."); return; }
    setForm(f=>({...f, ...parsed}));
    setTextoIA("");
  }

  async function salvar() {
    if (!form.nome?.trim()) { alert("Nome é obrigatório."); return; }
    setSalvando(true);
    try {
      const dados = { ...form, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (novo) {
        dados.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        dados.status = dados.status || "novo";
        await db.collection("clinica_leads").add(dados);
      } else {
        await db.collection("clinica_leads").doc(lead.id).update(dados);
      }
      onSalvar();
    } catch(e) { alert("Erro ao salvar."); }
    setSalvando(false);
  }

  async function registrarContato() {
    if (!novaAnotacao.trim()) return;
    if (!lead?.id) { alert("Salve o lead primeiro antes de registrar interações."); return; }
    setRegistrando(true);
    try {
      await db.collection("clinica_leads").doc(lead.id).collection("interacoes").add({
        texto: novaAnotacao.trim(),
        autor: user?.nome || "Usuário",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setNovaAnotacao("");
    } catch(e) { alert("Erro ao registrar."); }
    setRegistrando(false);
  }

  async function excluirLead() {
    if (!lead?.id) return;
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este lead? Esta ação não poderá ser desfeita.")) return;
    setExcluindo(true);
    try {
      await db.collection("clinica_leads").doc(lead.id).delete();
      onFechar();
    } catch(e) { alert("Erro ao excluir."); }
    setExcluindo(false);
  }

  const f = (campo, val) => setForm(x=>({...x,[campo]:val}));

  function fmtDataHora(ts) {
    if (!ts?.toDate) return "—";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:"1px solid var(--gray-100)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontWeight:700,fontSize:16}}>{novo?"Novo Lead": form.nome||"Lead"}</div>
          <button onClick={onFechar} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:22,lineHeight:1}}>×</button>
        </div>

        {/* Abas — só para lead existente */}
        {!novo && (
          <div style={{display:"flex",borderBottom:"1px solid var(--gray-100)",flexShrink:0}}>
            {[{id:"dados",label:"📋 Dados"},{id:"timeline",label:`💬 Follow-up (${interacoes.length})`}].map(a=>(
              <button key={a.id} onClick={()=>setAba(a.id)}
                style={{flex:1,padding:"12px 0",background:"none",border:"none",cursor:"pointer",fontWeight:aba===a.id?700:400,fontSize:13,fontFamily:"inherit",borderBottom:aba===a.id?"2px solid #7B00C4":"2px solid transparent",color:aba===a.id?"#7B00C4":"var(--text-muted)",transition:"all .15s"}}>
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Corpo scrollável */}
        <div style={{overflowY:"auto",flex:1}}>

          {/* ABA DADOS */}
          {(novo || aba==="dados") && (
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
              {novo && (
                <div style={{background:"#f5f3ff",border:"1px solid #7B00C420",borderRadius:10,padding:14}}>
                  <div style={{fontWeight:600,fontSize:13,color:"#7B00C4",marginBottom:8}}>✨ Inserir Lead via IA</div>
                  <TextAreaVoz value={textoIA} onChange={e=>setTextoIA(e.target.value)} rows={5}
                    placeholder={"Cole aqui o bloco gerado pela IA de triagem:\n\n### ESTRUTURA PARA O CRM\n* **Nome do Lead:** ...\n* **WhatsApp/Contato:** ...\n* **Principal Queixa/Objetivo:** ...\n* **Serviço de Interesse:** ..."}
                    style={{width:"100%",border:"1px solid #7B00C430",borderRadius:8,padding:"10px 12px",fontSize:12,fontFamily:"monospace",resize:"vertical",outline:"none",boxSizing:"border-box",background:"white"}}/>
                  <button onClick={aplicarIA} style={{marginTop:8,background:"#7B00C4",color:"white",border:"none",borderRadius:20,padding:"7px 18px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                    ⚡ Preencher campos automaticamente
                  </button>
                </div>
              )}

              {[
                {label:"Nome do Lead *",          campo:"nome",     placeholder:"Nome completo"},
                {label:"WhatsApp / Contato",       campo:"telefone", placeholder:"(62) 99999-9999"},
                {label:"Principal Queixa/Objetivo",campo:"queixa",   placeholder:"Ex: Ansiedade, insônia..."},
                {label:"Serviço de Interesse",     campo:"servico",  placeholder:"Ex: Psicoterapia individual"},
              ].map(({label,campo,placeholder})=>(
                <div key={campo}>
                  <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>{label}</label>
                  <input type="text" value={form[campo]||""} onChange={e=>f(campo,e.target.value)}
                    placeholder={placeholder} className="form-input"/>
                </div>
              ))}

              <div>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Campanha / Origem</label>
                <TagInputCampanha value={form.campanhas||[]} onChange={v=>f("campanhas",v)}/>
                <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>Digite e pressione Enter. Campanhas novas são salvas automaticamente.</div>
              </div>

              <div>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Status</label>
                <select value={form.status||"novo"} onChange={e=>{
                  const novoStatus = e.target.value;
                  f("status", novoStatus);
                  if (novoStatus==="convertido" && !novo && onConverter) {
                    onConverter({...form, id:lead.id});
                  }
                }} className="form-input">
                  {COLUNAS_FUNIL.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Observações</label>
                <TextAreaVoz value={form.obs||""} onChange={e=>f("obs",e.target.value)} rows={3}
                  className="form-input" placeholder="Anotações internas..." style={{resize:"vertical"}}/>
              </div>
            </div>
          )}

          {/* ABA TIMELINE */}
          {!novo && aba==="timeline" && (
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>

              {/* Campo nova anotação */}
              <div style={{background:"#f9fafb",border:"1px solid var(--gray-200)",borderRadius:12,padding:16}}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>📝 Nova anotação de follow-up</div>
                <TextAreaVoz value={novaAnotacao} onChange={e=>setNovaAnotacao(e.target.value)} rows={3}
                  className="form-input"
                  placeholder='Ex: "Cliente disse que vai falar com o marido e pediu para retornar na quinta-feira."'
                  style={{resize:"vertical",marginBottom:10}}/>
                <button onClick={registrarContato} disabled={registrando||!novaAnotacao.trim()}
                  style={{background:"#7B00C4",color:"white",border:"none",borderRadius:8,padding:"9px 20px",fontSize:13,fontWeight:600,cursor:"pointer",opacity:(!novaAnotacao.trim()||registrando)?0.5:1}}>
                  {registrando?"Registrando...":"✅ Registrar Contato"}
                </button>
              </div>

              {/* Timeline */}
              <div>
                <div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"var(--text-muted)"}}>HISTÓRICO DE INTERAÇÕES</div>
                {interacoes.length===0
                  ? <div style={{textAlign:"center",padding:"32px 0",color:"var(--gray-400)",fontSize:13}}>Nenhuma interação registrada ainda.</div>
                  : (
                    <div style={{position:"relative"}}>
                      {/* Linha vertical */}
                      <div style={{position:"absolute",left:15,top:0,bottom:0,width:2,background:"var(--gray-100)"}}/>
                      <div style={{display:"flex",flexDirection:"column",gap:0}}>
                        {interacoes.map((it,idx)=>(
                          <div key={it.id} style={{display:"flex",gap:16,paddingBottom:20,position:"relative"}}>
                            {/* Bolinha */}
                            <div style={{width:32,height:32,borderRadius:"50%",background:"#7B00C4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1,fontSize:13}}>
                              💬
                            </div>
                            {/* Conteúdo */}
                            <div style={{flex:1,background:"white",border:"1px solid var(--gray-100)",borderRadius:10,padding:"12px 14px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:4}}>
                                <span style={{fontWeight:600,fontSize:12,color:"#7B00C4"}}>{it.autor}</span>
                                <span style={{fontSize:11,color:"var(--gray-400)"}}>{fmtDataHora(it.createdAt)}</span>
                              </div>
                              <div style={{fontSize:13,lineHeight:1.6,color:"var(--text)"}}>{it.texto}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 24px",borderTop:"1px solid var(--gray-100)",display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          {/* Lixeira — só para lead existente */}
          {!novo ? (
            <button onClick={excluirLead} disabled={excluindo}
              style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:8,border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:500}}>
              <Icon name="trash-2" size={14}/> {excluindo?"Excluindo...":"Excluir lead"}
            </button>
          ) : <div/>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={onFechar} style={{padding:"9px 20px",borderRadius:8,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
              {aba==="timeline"?"Fechar":"Cancelar"}
            </button>
            {(novo||aba==="dados") && (
              <button onClick={salvar} disabled={salvando} className="btn-primary">
                {salvando?"Salvando...":"Salvar Lead"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const REGRAS_INATIVIDADE = [
  {
    status: "novo",
    limiteMs: 30 * 60 * 1000, // 30 minutos
    emoji: "⚠️",
    titulo: (nome) => `⚠️ Lead aguardando primeiro contato`,
    corpo:  (nome, tempo) => `${nome} está em "Lead Novo" há ${tempo} sem contato.`,
    cor: "#d97706", bg: "#fef3c7", borda: "#fde68a",
  },
  {
    status: "contato",
    limiteMs: 4 * 60 * 60 * 1000, // 4 horas
    emoji: "📞",
    titulo: (nome) => `📞 Primeiro contato sem avanço`,
    corpo:  (nome, tempo) => `${nome} está em "Primeiro Contato" há ${tempo}. Tentar avançar para agendamento.`,
    cor: "#0891b2", bg: "#e0f2fe", borda: "#bae6fd",
  },
  {
    status: "agendamento",
    limiteMs: 24 * 60 * 60 * 1000, // 24 horas
    emoji: "⏰",
    titulo: (nome) => `⏰ Agendamento pendente há mais de 24h`,
    corpo:  (nome, tempo) => `${nome} está em "Agendamento Pendente" há ${tempo}. Verificar contato.`,
    cor: "#dc2626", bg: "#fef2f2", borda: "#fecaca",
  },
];

function formatarTempo(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h/24)}d ${h%24}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function fmtWhats(tel) {
  if (!tel) return null;
  const num = tel.replace(/\D/g,"");
  if (!num) return null;
  return num.startsWith("55") ? num : "55"+num;
}

function CardLead({ lead, onEditar, onMover, colunas }) {
  const [dragging, setDragging] = useState(false);

  // Verifica se está em alerta
  const regra = REGRAS_INATIVIDADE.find(r=>r.status===(lead.status||"novo"));
  const rawRef = lead.updatedAt || lead.createdAt;
  const refMs = rawRef ? (typeof rawRef.toDate==="function" ? rawRef.toDate().getTime() : rawRef.seconds ? rawRef.seconds*1000 : null) : null;
  const emAlerta = regra && refMs && (Date.now()-refMs) >= regra.limiteMs;
  const whats = fmtWhats(lead.telefone);

  return (
    <div draggable
      onDragStart={e=>{ setDragging(true); e.dataTransfer.setData("leadId", lead.id); }}
      onDragEnd={()=>setDragging(false)}
      onClick={()=>onEditar(lead)}
      style={{
        background:"white", borderRadius:10, padding:"12px 14px",
        boxShadow:"0 1px 4px rgba(0,0,0,0.08)", cursor:"grab",
        opacity: dragging?0.5:1, transition:"opacity .15s",
        border: emAlerta ? `1.5px solid ${regra.borda}` : "1px solid var(--gray-100)",
        marginBottom:8,
      }}>
      <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{lead.nome}</div>
      {lead.servico&&<div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>🎯 {lead.servico}</div>}
      {lead.queixa&&<div style={{fontSize:11,color:"var(--gray-500)",marginBottom:6,lineHeight:1.4}}>{lead.queixa.slice(0,60)}{lead.queixa.length>60?"...":""}</div>}
      {lead.telefone&&<div style={{fontSize:12,color:"var(--text-muted)"}}>📱 {lead.telefone}</div>}
      {(lead.campanhas||[]).length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
          {lead.campanhas.map(c=>(
            <span key={c} style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}>{c}</span>
          ))}
        </div>
      )}
      <div style={{fontSize:10,color:"var(--gray-400)",marginTop:8}}>
        {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString("pt-BR") : ""}
      </div>
      {emAlerta && whats && (
        <a href={`https://wa.me/${whats}`} target="_blank" rel="noopener noreferrer"
          onClick={e=>e.stopPropagation()}
          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:8,background:"#16a34a",color:"white",borderRadius:6,padding:"5px 0",fontSize:11,fontWeight:600,textDecoration:"none"}}>
          <Icon name="message-circle" size={11}/> Acessar WhatsApp
        </a>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  MODAL CONVERSÃO — Lead → Paciente
// ═══════════════════════════════════════════════════════
function ModalConversao({ lead, onConfirmar, onCancelar }) {
  const [email, setEmail]                   = useState("");
  const [tipoContratacao, setTipoContratacao] = useState("individual");
  const [salvando, setSalvando]             = useState(false);
  const [erro, setErro]                     = useState("");

  const valorEstimado = tipoContratacao === "pacote" ? 250 : 300;

  async function confirmar() {
    if (!email.trim()) { setErro("E-mail é obrigatório para criar o cadastro clínico."); return; }
    setSalvando(true);
    try {
      await db.collection("clinica_pacientes").add({
        nome:                  lead.nome || "",
        email:                 email.trim().toLowerCase(),
        telefone:              lead.telefone || "",
        cpf:                   "",
        dataNascimento:        "",
        genero:                "Não informar",
        status:                "ativo",
        senha:                 "1234",
        objetivosTerapeuticos: lead.queixa || "",
        observacoesClinicas:   "",
        origem:                "crm-lead",
        leadId:                lead.id,
        tipoContratacao,
        valorEstimado,
        campanhas:             lead.campanhas || [],
        createdAt:             firebase.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection("clinica_leads").doc(lead.id).update({
        status:        "convertido",
        arquivado:     true,
        convertidoEm: firebase.firestore.FieldValue.serverTimestamp(),
      });
      onConfirmar();
    } catch(e) { setErro("Erro ao cadastrar. Tente novamente."); }
    setSalvando(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{background:"linear-gradient(135deg,#16a34a,#15803d)",borderRadius:"16px 16px 0 0",padding:"24px",textAlign:"center",color:"white"}}>
          <div style={{fontSize:40,marginBottom:8}}>🎉</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700}}>Lead Convertido!</div>
          <div style={{fontSize:13,opacity:0.85,marginTop:4}}>Deseja cadastrar como Paciente na Clínica?</div>
        </div>

        <div style={{padding:"20px 24px",borderBottom:"1px solid var(--gray-100)"}}>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:"#16a34a",marginBottom:8}}>DADOS QUE SERÃO MIGRADOS</div>
            <div style={{fontSize:13,display:"flex",flexDirection:"column",gap:4}}>
              <div><strong>Nome:</strong> {lead.nome}</div>
              {lead.telefone&&<div><strong>WhatsApp:</strong> {lead.telefone}</div>}
              {lead.queixa&&<div><strong>Queixa:</strong> {lead.queixa}</div>}
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:8}}>Tipo de Contratação</label>
            <div style={{display:"flex",gap:8}}>
              {[{id:"individual",label:"Consulta Individual",valor:300},{id:"pacote",label:"Pacote",valor:250}].map(op=>(
                <button key={op.id} onClick={()=>setTipoContratacao(op.id)}
                  style={{flex:1,padding:"10px 8px",borderRadius:8,border:"2px solid",
                    borderColor:tipoContratacao===op.id?"#16a34a":"var(--gray-200)",
                    background:tipoContratacao===op.id?"#f0fdf4":"white",
                    cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,
                    color:tipoContratacao===op.id?"#16a34a":"var(--text-muted)"}}>
                  {op.label}<br/>
                  <span style={{fontSize:11,fontWeight:400}}>Est. R$ {op.valor}/sessão</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>
              E-mail do paciente <span style={{color:"#dc2626"}}>*</span>
            </label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErro("");}}
              className="form-input" placeholder="email@exemplo.com" autoFocus/>
            <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>
              Necessário para acesso ao portal. Senha inicial: <strong>1234</strong>
            </div>
          </div>

          {erro&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:13,color:"#dc2626"}}>{erro}</div>}
        </div>

        <div style={{padding:"16px 24px",display:"flex",gap:10}}>
          <button onClick={onCancelar}
            style={{flex:1,padding:"11px 0",borderRadius:8,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:500}}>
            Apenas mover o card
          </button>
          <button onClick={confirmar} disabled={salvando}
            style={{flex:1,padding:"11px 0",borderRadius:8,border:"none",background:"#16a34a",color:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700,opacity:salvando?0.7:1}}>
            {salvando?"Cadastrando...":"✓ Sim, cadastrar paciente"}
          </button>
        </div>
      </div>
    </div>
  );
}

  async function confirmar() {
    if (!email.trim()) { setErro("E-mail é obrigatório para criar o cadastro clínico."); return; }
    setSalvando(true);
    try {
      // 1. Criar paciente em clinica_pacientes
      await db.collection("clinica_pacientes").add({
        nome:                 lead.nome || "",
        email:                email.trim().toLowerCase(),
        telefone:             lead.telefone || "",
        cpf:                  "",
        dataNascimento:       "",
        genero:               "Não informar",
        status:               "ativo",
        senha:                "1234",
        objetivosTerapeuticos: lead.queixa || "",
        observacoesClinicas:  "",
        origem:               "crm-lead",
        leadId:               lead.id,
        createdAt:            firebase.firestore.FieldValue.serverTimestamp(),
      });
      // 2. Arquivar lead como "ganho"
      await db.collection("clinica_leads").doc(lead.id).update({
        status:      "convertido",
        arquivado:   true,
        convertidoEm: firebase.firestore.FieldValue.serverTimestamp(),
      });
      onConfirmar();
    } catch(e) { setErro("Erro ao cadastrar. Tente novamente."); }
    setSalvando(false);
  }


// ═══════════════════════════════════════════════════════
//  ALERTAS DE INATIVIDADE — ETAPA 6
// ═══════════════════════════════════════════════════════
function AlertasInatividade({ leads, onAbrirLead }) {
  const [descartados, setDescartados] = useState(new Set());
  const [agora, setAgora] = useState(Date.now());

  // Atualiza a cada minuto para manter alertas frescos
  useEffect(()=>{
    const t = setInterval(()=>setAgora(Date.now()), 60000);
    return ()=>clearInterval(t);
  },[]);

  function extrairMs(campo) {
    if (!campo) return null;
    // Objeto Firestore Timestamp
    if (campo.seconds) return campo.seconds * 1000;
    // Já é Date
    if (campo instanceof Date) return campo.getTime();
    // String ISO
    if (typeof campo === "string") return new Date(campo).getTime();
    // Tenta toDate()
    try { return campo.toDate().getTime(); } catch(e) {}
    return null;
  }

  const alertas = leads
    .filter(l => !l.arquivado && !descartados.has(l.id) && l.status !== "perdido")
    .reduce((acc, lead) => {
      const regra = REGRAS_INATIVIDADE.find(r => r.status === (lead.status || "novo"));
      if (!regra) return acc;
      const ms = extrairMs(lead.updatedAt) || extrairMs(lead.createdAt);
      if (!ms || isNaN(ms)) return acc;
      const inativo = agora - ms;
      if (inativo >= regra.limiteMs) acc.push({ lead, regra, inativo });
      return acc;
    }, [])
    .sort((a,b) => b.inativo - a.inativo);

  if (alertas.length === 0) return null;

  return (
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"#dc2626",animation:"pulse 1.5s infinite"}}/>
        <span style={{fontWeight:700,fontSize:13,color:"#dc2626"}}>
          {alertas.length} alerta{alertas.length!==1?"s":""} de inatividade
        </span>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {alertas.map(({lead, regra, inativo})=>{
          const whats = fmtWhats(lead.telefone);
          return (
            <div key={lead.id} style={{
              background:regra.bg, border:`1.5px solid ${regra.borda}`,
              borderRadius:12, padding:"12px 16px",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              gap:12, flexWrap:"wrap"
            }}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:regra.cor,marginBottom:2}}>
                  {regra.titulo(lead.nome)}
                </div>
                <div style={{fontSize:12,color:regra.cor,opacity:0.85}}>
                  {regra.corpo(lead.nome, formatarTempo(inativo))}
                </div>
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                {whats && (
                  <a href={`https://wa.me/${whats}`} target="_blank" rel="noopener noreferrer"
                    style={{display:"flex",alignItems:"center",gap:5,background:"#16a34a",color:"white",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,textDecoration:"none"}}>
                    <Icon name="message-circle" size={13}/> WhatsApp
                  </a>
                )}
                <button onClick={()=>onAbrirLead(lead)}
                  style={{background:"white",border:`1px solid ${regra.borda}`,color:regra.cor,borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  Ver card
                </button>
                <button onClick={()=>setDescartados(s=>new Set([...s,lead.id]))}
                  style={{background:"none",border:"none",cursor:"pointer",color:regra.cor,opacity:0.5,padding:"4px",fontSize:16,lineHeight:1}}
                  title="Dispensar alerta">
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FunilLeads({ user }) {
  const [leads, setLeads]                   = useState([]);
  const [modalLead, setModalLead]           = useState(null);
  const [dragOver, setDragOver]             = useState(null);
  const [modalConversao, setModalConversao] = useState(null);

  useEffect(()=>{
    db.collection("clinica_leads")
      .onSnapshot(s=>setLeads(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[]);

  async function moverLead(leadId, novoStatus) {
    await db.collection("clinica_leads").doc(leadId).update({
      status: novoStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(()=>{});
  }

  function onDrop(e, colId) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) { setDragOver(null); return; }
    if (colId === "convertido") {
      const lead = leads.find(l=>l.id===leadId);
      if (lead) {
        moverLead(leadId, "convertido");
        setModalConversao(lead);
      }
    } else {
      moverLead(leadId, colId);
    }
    setDragOver(null);
  }

  const leadsColuna = (colId) => leads.filter(l=>(l.status||"novo")===colId && !l.arquivado);

  return (
    <div style={{padding:"20px 24px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600}}>Funil de Leads</div>
          <div style={{fontSize:13,color:"var(--text-muted)",marginTop:2}}>{leads.filter(l=>!l.arquivado).length} lead{leads.filter(l=>!l.arquivado).length!==1?"s":""} no funil</div>
        </div>
        <button onClick={()=>setModalLead({})} className="btn-primary" style={{display:"flex",alignItems:"center",gap:6}}>
          <Icon name="plus" size={15}/> Novo Lead
        </button>
      </div>

      {/* Alertas de inatividade */}
      <AlertasInatividade leads={leads} onAbrirLead={l=>setModalLead(l)}/>

      {/* Kanban */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,minWidth:0}}>
        {COLUNAS_FUNIL.map(col=>{
          const cards = leadsColuna(col.id);
          const isOver = dragOver===col.id;
          return (
            <div key={col.id}
              onDragOver={e=>{e.preventDefault();setDragOver(col.id);}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={e=>onDrop(e,col.id)}
              style={{
                background: isOver ? col.bg : "#f9fafb",
                borderRadius:12, padding:"12px 10px",
                border: isOver ? `2px solid ${col.cor}` : "2px solid transparent",
                transition:"all .15s", minHeight:400,
              }}>
              {/* Cabeçalho coluna */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:col.cor}}/>
                  <span style={{fontWeight:700,fontSize:12,color:col.cor}}>{col.label.toUpperCase()}</span>
                </div>
                <span style={{background:col.cor+"20",color:col.cor,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700}}>{cards.length}</span>
              </div>

              {/* Cards */}
              {cards.map(lead=>(
                <CardLead key={lead.id} lead={lead}
                  onEditar={l=>setModalLead(l)}
                  onMover={moverLead}
                  colunas={COLUNAS_FUNIL}/>
              ))}

              {cards.length===0&&(
                <div style={{textAlign:"center",padding:"20px 0",color:"var(--gray-400)",fontSize:12}}>
                  {isOver?"Solte aqui":"Nenhum lead"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalLead!==null&&(
        <ModalLead
          lead={modalLead?.id ? modalLead : null}
          user={user}
          onConverter={l=>{ setModalLead(null); setModalConversao(l); }}
          onSalvar={()=>setModalLead(null)}
          onFechar={()=>setModalLead(null)}/>
      )}
      {modalConversao&&(
        <ModalConversao
          lead={modalConversao}
          onConfirmar={()=>setModalConversao(null)}
          onCancelar={()=>setModalConversao(null)}/>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD DE PERFORMANCE — ETAPA 5
// ═══════════════════════════════════════════════════════
const CPL_LIMITES = {
  nacional:      { verde:10,  amarelo:15 },
  internacional: { verde:50,  amarelo:999 },
};

function badgeCPL(cpl, abrangencia) {
  const lim = CPL_LIMITES[abrangencia||"nacional"];
  if (cpl <= lim.verde)   return { cor:"#16a34a", bg:"#f0fdf4", label:"✅ Saudável" };
  if (cpl <= lim.amarelo) return { cor:"#d97706", bg:"#fef3c7", label:"⚠️ Atenção" };
  const aviso = abrangencia==="internacional"
    ? "🚨 Alerta de teto atingido. Custo de captação internacional inviabilizando o retorno do consultório."
    : "🚨 Custo acima do limite realista para o mercado nacional. Avaliar pausa imediata do anúncio.";
  return { cor:"#dc2626", bg:"#fef2f2", label:"🚨 Acima do limite", aviso };
}

// ═══════════════════════════════════════════════════════
//  ANÁLISE COLABORATIVA POR CAMPANHA
// ═══════════════════════════════════════════════════════
function AnaliseCampanha({ campanha, user }) {
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto]             = useState("");
  const [enviando, setEnviando]       = useState(false);
  const [pdfs, setPdfs]               = useState([]);
  const [uploadando, setUploadando]   = useState(false);
  const [aberto, setAberto]           = useState(false);

  useEffect(()=>{
    if (!aberto) return;
    const unsub = db.collection("clinica_campanhas").doc(campanha.id)
      .collection("analises").orderBy("createdAt","asc")
      .onSnapshot(s=>setComentarios(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const unsubPdf = db.collection("clinica_campanhas").doc(campanha.id)
      .collection("relatorios").orderBy("createdAt","desc")
      .onSnapshot(s=>setPdfs(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return ()=>{ unsub(); unsubPdf(); };
  },[campanha.id, aberto]);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await db.collection("clinica_campanhas").doc(campanha.id).collection("analises").add({
        texto: texto.trim(),
        autor: user?.nome || "Usuário",
        tipo:  user?.tipo || "psicologa",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setTexto("");
    } catch(e) { alert("Erro ao enviar."); }
    setEnviando(false);
  }

  async function uploadPdf(e) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") { alert("Selecione um arquivo PDF."); return; }
    if (file.size > 5*1024*1024) { alert("Arquivo muito grande. Máximo 5MB."); return; }
    setUploadando(true);
    const reader = new FileReader();
    reader.onload = async(ev)=>{
      try {
        await db.collection("clinica_campanhas").doc(campanha.id).collection("relatorios").add({
          nome:      file.name,
          tamanho:   (file.size/1024).toFixed(0)+"KB",
          base64:    ev.target.result,
          autor:     user?.nome || "Usuário",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch(e) { alert("Erro ao fazer upload."); }
      setUploadando(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function excluirPdf(id) {
    if (!window.confirm("Excluir este relatório?")) return;
    await db.collection("clinica_campanhas").doc(campanha.id).collection("relatorios").doc(id).delete();
  }

  async function excluirComentario(id) {
    await db.collection("clinica_campanhas").doc(campanha.id).collection("analises").doc(id).delete();
  }

  function fmtDH(ts) {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR")+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  }

  const corTipo = { psicologa:"#7B00C4", marketing:"#ea580c", secretaria:"#0891b2" };

  return (
    <div style={{border:"1px solid var(--gray-200)",borderRadius:12,overflow:"hidden",marginBottom:12,background:"white"}}>
      <button onClick={()=>setAberto(x=>!x)}
        style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:"white",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:600}}>{campanha.nome}</span>
          <span style={{fontSize:11,color:"var(--text-muted)"}}>{campanha.abrangencia==="internacional"?"🌍 Internacional":"🇧🇷 Nacional"}</span>
          {comentarios.length>0&&<span style={{background:"#7B00C418",color:"#7B00C4",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>💬 {comentarios.length}</span>}
          {pdfs.length>0&&<span style={{background:"#dc262618",color:"#dc2626",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>📄 {pdfs.length}</span>}
        </div>
        <Icon name={aberto?"chevron-up":"chevron-down"} size={16}/>
      </button>

      {aberto&&(
        <div style={{borderTop:"1px solid var(--gray-100)",background:"#fafafa"}}>

          {/* PDFs */}
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--gray-100)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontWeight:600,fontSize:13}}>📄 Relatórios em PDF</div>
              <label style={{display:"flex",alignItems:"center",gap:6,background:"#7B00C4",color:"white",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                <Icon name="upload" size={13}/> {uploadando?"Enviando...":"Upload PDF"}
                <input type="file" accept=".pdf" onChange={uploadPdf} style={{display:"none"}} disabled={uploadando}/>
              </label>
            </div>
            {pdfs.length===0
              ? <div style={{fontSize:12,color:"var(--text-muted)"}}>Nenhum relatório ainda.</div>
              : pdfs.map(pdf=>(
                  <div key={pdf.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"white",borderRadius:8,padding:"10px 14px",border:"1px solid var(--gray-100)",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>📄</span>
                      <div>
                        <div style={{fontWeight:600,fontSize:13}}>{pdf.nome}</div>
                        <div style={{fontSize:11,color:"var(--text-muted)"}}>{pdf.tamanho} · {pdf.autor} · {fmtDH(pdf.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <a href={pdf.base64} download={pdf.nome}
                        style={{background:"#f0fdf4",color:"#16a34a",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:600,textDecoration:"none"}}>
                        ⬇ Baixar
                      </a>
                      {(user?.tipo==="psicologa"||pdf.autor===user?.nome)&&(
                        <button onClick={()=>excluirPdf(pdf.id)}
                          style={{background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                ))
            }
          </div>

          {/* Chat */}
          <div style={{padding:"14px 18px"}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>💬 Análise e Ações de Ajuste</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14,maxHeight:300,overflowY:"auto",padding:"4px 0"}}>
              {comentarios.length===0
                ? <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center",padding:16}}>Nenhuma análise ainda.</div>
                : comentarios.map(c=>{
                    const isMe = c.autor===user?.nome;
                    return (
                      <div key={c.id} style={{display:"flex",flexDirection:isMe?"row-reverse":"row",gap:8,alignItems:"flex-start"}}>
                        <div style={{width:30,height:30,borderRadius:"50%",background:corTipo[c.tipo]||"#7B00C4",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:12,flexShrink:0}}>
                          {(c.autor||"?")[0].toUpperCase()}
                        </div>
                        <div style={{maxWidth:"75%"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexDirection:isMe?"row-reverse":"row"}}>
                            <span style={{fontSize:11,fontWeight:600,color:corTipo[c.tipo]||"#7B00C4"}}>{c.autor}</span>
                            <span style={{fontSize:10,color:"var(--gray-400)"}}>{fmtDH(c.createdAt)}</span>
                          </div>
                          <div style={{background:isMe?"#7B00C4":"white",color:isMe?"white":"var(--text)",borderRadius:isMe?"12px 4px 12px 12px":"4px 12px 12px 12px",padding:"10px 14px",fontSize:13,lineHeight:1.6,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:isMe?"none":"1px solid var(--gray-100)"}}>
                            {c.texto}
                          </div>
                          {(user?.tipo==="psicologa"||isMe)&&(
                            <button onClick={()=>excluirComentario(c.id)}
                              style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"var(--gray-400)",marginTop:2,padding:"0 4px",fontFamily:"inherit",float:isMe?"right":"left"}}
                              onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                              onMouseLeave={e=>e.currentTarget.style.color="var(--gray-400)"}>
                              excluir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              }
            </div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <TextAreaVoz value={texto} onChange={e=>setTexto(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();enviar();} }}
                rows={2} placeholder="Escreva sua análise ou ação de ajuste... (Enter para enviar)"
                className="form-input" style={{flex:1,resize:"none",fontSize:13}}/>
              <button onClick={enviar} disabled={enviando||!texto.trim()}
                style={{background:"#7B00C4",color:"white",border:"none",borderRadius:8,padding:"10px 14px",cursor:"pointer",opacity:(!texto.trim()||enviando)?0.5:1,flexShrink:0}}>
                <Icon name="send" size={16}/>
              </button>
            </div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:4}}>Enter para enviar · Shift+Enter para nova linha</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnaliseCampanhas({ campanhas, user }) {
  if (campanhas.length===0) return null;
  return (
    <div style={{marginTop:24}}>
      <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,marginBottom:4}}>📊 Análise por Campanha</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>Relatórios em PDF e chat de estratégia entre Psicóloga e Marketing.</div>
      {campanhas.map(c=><AnaliseCampanha key={c.id} campanha={c} user={user}/>)}
    </div>
  );
}

function DashboardPerformance({ user }) {
  const [leads, setLeads]           = useState([]);
  const [pacientes, setPacientes]   = useState([]);
  const [campanhas, setCampanhas]   = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [lancClinica, setLancClinica] = useState([]);
  const [periodo, setPeriodo]       = useState({ de: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10), ate: new Date().toISOString().slice(0,10) });

  useEffect(()=>{
    db.collection("clinica_leads").onSnapshot(s=>setLeads(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_pacientes").where("origem","==","crm-lead").onSnapshot(s=>setPacientes(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_campanhas").onSnapshot(s=>setCampanhas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_lancamentos").where("origem","==","crm-marketing").onSnapshot(s=>setLancamentos(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_lancamentos").where("tipo_lancamento","!=","despesa").onSnapshot(s=>setLancClinica(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[]);

  // Filtro por período
  function noPeriodo(data) { return data >= periodo.de && data <= periodo.ate; }

  const leadsFiltrados      = leads.filter(l=>{ const d=l.createdAt?.toDate?.()?.toISOString().slice(0,10)||""; return d>=periodo.de&&d<=periodo.ate; });
  const convertidosFiltrados = pacientes.filter(p=>{ const d=p.createdAt?.toDate?.()?.toISOString().slice(0,10)||""; return d>=periodo.de&&d<=periodo.ate; });
  const lancFiltrados       = lancamentos.filter(l=>l.data&&noPeriodo(l.data));

  const totalLeads      = leadsFiltrados.length;
  const totalConvertidos = convertidosFiltrados.length;
  const taxaConversao   = totalLeads>0 ? ((totalConvertidos/totalLeads)*100).toFixed(1) : 0;
  const totalInvestido  = lancFiltrados.reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  // CAC
  const cac = totalConvertidos>0 ? totalInvestido/totalConvertidos : 0;

  // Faturamento real (lançamentos do financeiro vinculados a pacientes do CRM)
  const idsConversos = new Set(convertidosFiltrados.map(p=>p.id));
  const receitaReal  = lancClinica.filter(l=>l.pacienteId&&idsConversos.has(l.pacienteId)&&(l.status==="recebido"||l.status==="pago")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  // Faturamento estimado para pacientes sem lançamentos
  const pacientesComReceita = new Set(lancClinica.filter(l=>l.pacienteId&&idsConversos.has(l.pacienteId)).map(l=>l.pacienteId));
  const pacientesSemReceita = convertidosFiltrados.filter(p=>!pacientesComReceita.has(p.id));
  const receitaEstimada     = pacientesSemReceita.reduce((a,p)=>a+(p.valorEstimado||300),0);
  const receitaTotal        = receitaReal + receitaEstimada;
  const roi                 = totalInvestido>0 ? (((receitaTotal-totalInvestido)/totalInvestido)*100).toFixed(1) : 0;

  // Por campanha
  const porCampanha = campanhas.map(camp=>{
    const leadsC      = leadsFiltrados.filter(l=>(l.campanhas||[]).includes(camp.nome));
    const convertC    = convertidosFiltrados.filter(p=>(p.campanhas||[]).includes(camp.nome));
    const investidoC  = lancFiltrados.filter(l=>l.campanhaNome===camp.nome).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
    const cpl         = leadsC.length>0&&investidoC>0 ? investidoC/leadsC.length : 0;
    const receitaC    = convertC.reduce((a,p)=>{
      const real = lancClinica.filter(l=>l.pacienteId===p.id&&(l.status==="recebido"||l.status==="pago")).reduce((x,l)=>x+(parseFloat(l.valor)||0),0);
      return a + (real > 0 ? real : (p.valorEstimado||300));
    },0);
    const roiC = investidoC>0 ? (((receitaC-investidoC)/investidoC)*100).toFixed(1) : "—";
    const badge = cpl>0 ? badgeCPL(cpl, camp.abrangencia) : null;
    return { ...camp, leadsC:leadsC.length, convertC:convertC.length, investidoC, cpl, receitaC, roiC, badge };
  }).filter(c=>c.leadsC>0||c.investidoC>0);

  function fmtR(v){ return "R$ "+parseFloat(v||0).toFixed(2).replace(".",","); }
  function fmtPct(v){ return v+"%"; }

  return (
    <div style={{padding:"20px 28px",maxWidth:1000}}>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700}}>Dashboard de Performance</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:2}}>Métricas de captação, custo e retorno</div>
      </div>

      {/* Filtro período */}
      <div style={{background:"white",border:"1px solid var(--gray-200)",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:13,fontWeight:600}}>📅 Período:</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="date" value={periodo.de} onChange={e=>setPeriodo(p=>({...p,de:e.target.value}))}
            style={{border:"1px solid var(--gray-200)",borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"inherit"}}/>
          <span style={{fontSize:12,color:"var(--text-muted)"}}>até</span>
          <input type="date" value={periodo.ate} onChange={e=>setPeriodo(p=>({...p,ate:e.target.value}))}
            style={{border:"1px solid var(--gray-200)",borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"inherit"}}/>
        </div>
        <button onClick={()=>setPeriodo({de:new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10),ate:new Date().toISOString().slice(0,10)})}
          style={{background:"var(--gray-100)",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
          Este mês
        </button>
      </div>

      {/* Cards de resumo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:14,marginBottom:24}}>
        {[
          {label:"Leads Recebidos",    valor:totalLeads,           icon:"users",         cor:"#7B00C4"},
          {label:"Convertidos",        valor:totalConvertidos,     icon:"check-circle",  cor:"#16a34a"},
          {label:"Taxa de Conversão",  valor:fmtPct(taxaConversao),icon:"trending-up",   cor:"#0891b2"},
          {label:"Total Investido",    valor:fmtR(totalInvestido), icon:"dollar-sign",   cor:"#ea580c"},
        ].map((c,i)=>(
          <div key={i} style={{background:"white",borderRadius:12,padding:"16px 18px",border:"1px solid var(--gray-200)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontSize:12,color:"var(--text-muted)",fontWeight:500}}>{c.label}</div>
              <div style={{width:30,height:30,borderRadius:8,background:c.cor+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon name={c.icon} size={15} style={{color:c.cor}}/>
              </div>
            </div>
            <div style={{fontSize:24,fontWeight:700,color:c.cor}}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* CAC e ROI */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
        <div style={{background:"white",borderRadius:12,padding:20,border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:8}}>💰 CAC — CUSTO DE AQUISIÇÃO POR CLIENTE</div>
          <div style={{fontSize:32,fontWeight:700,color:cac>300?"#dc2626":"#16a34a",marginBottom:4}}>{fmtR(cac)}</div>
          {cac>300&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#dc2626"}}>
            ⚠️ CAC acima de R$ 300,00 — avaliar eficiência das campanhas
          </div>}
          {cac>0&&cac<=300&&<div style={{fontSize:12,color:"#16a34a"}}>✅ Dentro do limite saudável (até R$ 300,00)</div>}
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>Total investido ÷ pacientes convertidos no período</div>
        </div>
        <div style={{background:"white",borderRadius:12,padding:20,border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:8}}>📈 ROI — RETORNO SOBRE INVESTIMENTO</div>
          <div style={{fontSize:32,fontWeight:700,color:parseFloat(roi)>=0?"#16a34a":"#dc2626",marginBottom:4}}>{roi}%</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,fontSize:12,color:"var(--text-muted)"}}>
            <div>Receita real: <strong style={{color:"#16a34a"}}>{fmtR(receitaReal)}</strong></div>
            <div>Receita estimada: <strong style={{color:"#0891b2"}}>{fmtR(receitaEstimada)}</strong> ({pacientesSemReceita.length} pac. sem lançamentos)</div>
            <div>Total investido: <strong style={{color:"#ea580c"}}>{fmtR(totalInvestido)}</strong></div>
          </div>
        </div>
      </div>

      {/* Tabela por campanha */}
      {porCampanha.length>0&&(
        <div style={{background:"white",borderRadius:12,border:"1px solid var(--gray-200)",overflow:"hidden",marginBottom:24}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--gray-100)",fontWeight:600,fontSize:14}}>
            🎯 Performance por Campanha
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--gray-50)"}}>
                  {["Campanha","Tipo","Leads","Convertidos","Investido","CPL","Receita","ROI","Status CPL"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:600,color:"var(--text-muted)",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porCampanha.map(c=>{
                  const b = c.badge;
                  return (
                    <tr key={c.id} style={{borderTop:"1px solid var(--gray-100)"}}>
                      <td style={{padding:"12px 14px",fontWeight:600}}>{c.nome}</td>
                      <td style={{padding:"12px 14px"}}>
                        <span style={{fontSize:11,fontWeight:600,color:c.abrangencia==="internacional"?"#7B00C4":"#0891b2"}}>
                          {c.abrangencia==="internacional"?"🌍 Intl":"🇧🇷 Nac"}
                        </span>
                      </td>
                      <td style={{padding:"12px 14px",textAlign:"center"}}>{c.leadsC}</td>
                      <td style={{padding:"12px 14px",textAlign:"center",color:"#16a34a",fontWeight:600}}>{c.convertC}</td>
                      <td style={{padding:"12px 14px",color:"#ea580c",fontWeight:500}}>{fmtR(c.investidoC)}</td>
                      <td style={{padding:"12px 14px",fontWeight:700,color:b?.cor||"var(--text-muted)"}}>{c.cpl>0?fmtR(c.cpl):"—"}</td>
                      <td style={{padding:"12px 14px",color:"#16a34a",fontWeight:500}}>{fmtR(c.receitaC)}</td>
                      <td style={{padding:"12px 14px",fontWeight:700,color:parseFloat(c.roiC)>=0?"#16a34a":"#dc2626"}}>{c.roiC!=="—"?c.roiC+"%":"—"}</td>
                      <td style={{padding:"12px 14px"}}>
                        {b?(
                          <div>
                            <span style={{background:b.bg,color:b.cor,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{b.label}</span>
                            {b.aviso&&<div style={{fontSize:10,color:b.cor,marginTop:4,maxWidth:200,lineHeight:1.4}}>{b.aviso}</div>}
                          </div>
                        ):"—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {porCampanha.length===0&&(
        <div style={{background:"white",borderRadius:12,border:"1px solid var(--gray-200)",padding:32,textAlign:"center",color:"var(--text-muted)",fontSize:13}}>
          Nenhuma campanha com dados no período selecionado. Crie campanhas no Funil de Leads e lance gastos em Marketing para ver as métricas.
        </div>
      )}

      {/* Área colaborativa por campanha */}
      <AnaliseCampanhas campanhas={campanhas} user={user}/>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
function CentralLancamentosMarketing() {
  const [campanhas, setCampanhas]         = useState([]);
  const [lancamentos, setLancamentos]     = useState([]);
  const [salvando, setSalvando]           = useState(false);
  const [msg, setMsg]                     = useState(null);
  const [novaCampanha, setNovaCampanha]   = useState("");
  const [novaAbrangencia, setNovaAbrangencia] = useState("nacional");
  const [criandoCamp, setCriandoCamp]     = useState(false);
  const [mesFiltro, setMesFiltro]         = useState(new Date().toISOString().slice(0,7));
  const [form, setForm] = useState({
    tipoDespesa: "trafego",
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0,10),
    campanhaId: "",
  });

  useEffect(()=>{
    db.collection("clinica_campanhas").orderBy("nome")
      .onSnapshot(s=>setCampanhas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_lancamentos")
      .where("origem","==","crm-marketing")
      .orderBy("createdAt","desc").limit(20)
      .onSnapshot(s=>setLancamentos(s.docs.map(d=>({id:d.id,...d.data()}))),
        err=>{ // fallback sem orderBy se não tiver índice
          db.collection("clinica_lancamentos")
            .where("origem","==","crm-marketing")
            .onSnapshot(s=>setLancamentos(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))),()=>{});
        });
  },[]);

  const TIPOS = [
    {id:"trafego", label:"Impulsionamento / Tráfego Pago"},
    {id:"agencia", label:"Honorários da Equipe / Agência"},
  ];

  const f = (k,v) => setForm(x=>({...x,[k]:v}));

  async function criarCampanha() {
    if (!novaCampanha.trim()) return;
    if (campanhas.find(c=>c.nome.toLowerCase()===novaCampanha.trim().toLowerCase())) {
      setMsg({tipo:"erro",texto:"Campanha já existe."}); return;
    }
    try {
      const ref = await db.collection("clinica_campanhas").add({
        nome: novaCampanha.trim(),
        abrangencia: novaAbrangencia,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      f("campanhaId", ref.id);
      setNovaCampanha(""); setNovaAbrangencia("nacional");
      setCriandoCamp(false);
    } catch(e) { setMsg({tipo:"erro",texto:"Erro ao criar campanha."}); }
  }

  async function salvar() {
    if (!form.descricao?.trim()) { setMsg({tipo:"erro",texto:"Descrição é obrigatória."}); return; }
    if (!form.valor || !form.data) { setMsg({tipo:"erro",texto:"Valor e data são obrigatórios."}); return; }
    if (parseFloat(form.valor)<=0) { setMsg({tipo:"erro",texto:"Valor deve ser maior que zero."}); return; }
    setSalvando(true);
    try {
      const campanha = campanhas.find(c=>c.id===form.campanhaId);
      await db.collection("clinica_lancamentos").add({
        tipo_lancamento: "despesa",
        tipo:            form.descricao.trim(),
        categoria:       "Marketing",
        descricao:       form.descricao.trim(),
        tipoDespesaMkt:  form.tipoDespesa,
        campanhaId:      form.campanhaId || null,
        campanhaNome:    campanha?.nome || null,
        valor:           parseFloat(form.valor),
        data:            form.data,
        formaPag:        "PIX",
        status:          "pago",
        origem:          "crm-marketing",
        createdAt:       firebase.firestore.FieldValue.serverTimestamp(),
      });
      setMsg({tipo:"ok", texto:`✓ Lançado R$ ${parseFloat(form.valor).toFixed(2).replace(".",",")} — ${form.descricao.trim()}`});
      setForm({tipoDespesa:"trafego", descricao:"", valor:"", data:new Date().toISOString().slice(0,10), campanhaId:""});
      setTimeout(()=>setMsg(null), 4000);
    } catch(e) { setMsg({tipo:"erro",texto:"Erro ao salvar. Tente novamente."}); }
    setSalvando(false);
  }

  async function excluir(lanc) {
    if (!window.confirm(`Excluir o lançamento "${lanc.descricao}" de ${fmtVal(lanc.valor)}? Esta ação não pode ser desfeita.`)) return;
    await db.collection("clinica_lancamentos").doc(lanc.id).delete().catch(()=>{});
  }

  const lancamentosFiltrados = lancamentos.filter(l=>l.data?.startsWith(mesFiltro));

  const totalMes = lancamentosFiltrados.reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  function fmtData(d) { return d ? d.split("-").reverse().join("/") : "—"; }
  function fmtVal(v)  { return "R$ "+parseFloat(v||0).toFixed(2).replace(".",","); }

  return (
    <div style={{marginTop:28}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15}}>💸 Central de Lançamentos</div>
        <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"6px 14px",fontSize:12,color:"#dc2626",fontWeight:600}}>
          🔒 Visível apenas para Administradora
        </div>
      </div>

      {/* Formulário */}
      <div style={{background:"white",border:"1px solid var(--gray-200)",borderRadius:12,padding:20,marginBottom:20}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:16,color:"var(--text-muted)"}}>LANÇAR NOVO GASTO DE MARKETING</div>
        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:14}}>

          <div>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Tipo de Despesa</label>
            <select value={form.tipoDespesa} onChange={e=>f("tipoDespesa",e.target.value)} className="form-input">
              {TIPOS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Descrição / Observação <span style={{color:"#dc2626"}}>*</span></label>
            <input type="text" value={form.descricao} onChange={e=>f("descricao",e.target.value)}
              className="form-input" placeholder='Ex: "Pagamento mensal Agência Scale Views" ou "Créditos Meta Ads maio"'/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div>
              <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Valor (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor}
                onChange={e=>f("valor",e.target.value)} className="form-input" placeholder="0,00"/>
            </div>
            <div>
              <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Data de Competência</label>
              <input type="date" value={form.data} onChange={e=>f("data",e.target.value)} className="form-input"/>
            </div>
          </div>

          {/* Campanha + botão criar nova */}
          <div>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>
              Campanha Vinculada <span style={{fontWeight:400,color:"var(--text-muted)"}}>(opcional)</span>
            </label>
            <div style={{display:"flex",gap:8}}>
              <select value={form.campanhaId} onChange={e=>f("campanhaId",e.target.value)} className="form-input" style={{flex:1}}>
                <option value="">— Selecionar campanha —</option>
                {campanhas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <button onClick={()=>setCriandoCamp(x=>!x)}
                style={{background: criandoCamp?"#ea580c":"#ea580c18",color: criandoCamp?"white":"#ea580c",border:"1px solid #ea580c40",borderRadius:8,padding:"0 14px",fontWeight:700,fontSize:18,cursor:"pointer",flexShrink:0}}>
                {criandoCamp?"×":"+"}
              </button>
            </div>
            {criandoCamp && (
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:8}}>
                  <input type="text" value={novaCampanha} onChange={e=>setNovaCampanha(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&criarCampanha()}
                    className="form-input" placeholder="Nome da nova campanha..." style={{flex:1}}
                    autoFocus/>
                  <button onClick={criarCampanha}
                    style={{background:"#ea580c",color:"white",border:"none",borderRadius:8,padding:"0 16px",fontWeight:600,fontSize:13,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>
                    Criar
                  </button>
                </div>
                <div style={{display:"flex",gap:8}}>
                  {["nacional","internacional"].map(op=>(
                    <button key={op} onClick={()=>setNovaAbrangencia(op)}
                      style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid",
                        borderColor:novaAbrangencia===op?"#ea580c":"var(--gray-200)",
                        background:novaAbrangencia===op?"#fff7ed":"white",
                        cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,
                        color:novaAbrangencia===op?"#ea580c":"var(--text-muted)",textTransform:"capitalize"}}>
                      {op==="nacional"?"🇧🇷 Nacional":"🌍 Internacional"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {msg&&(
          <div style={{background:msg.tipo==="ok"?"#f0fdf4":"#fef2f2",border:"1px solid",borderColor:msg.tipo==="ok"?"#bbf7d0":"#fecaca",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:msg.tipo==="ok"?"#15803d":"#dc2626",fontWeight:500}}>
            {msg.texto}
          </div>
        )}

        <button onClick={salvar} disabled={salvando} className="btn-primary" style={{width:"100%"}}>
          {salvando?"Salvando...":"💾 Salvar e Lançar no Financeiro"}
        </button>
        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8,textAlign:"center"}}>
          O lançamento será registrado automaticamente como despesa paga em "Financeiro Clínica"
        </div>
      </div>

      {/* Histórico */}
      <div style={{background:"white",border:"1px solid var(--gray-200)",borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--gray-100)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontWeight:600,fontSize:13}}>Lançamentos de Marketing</div>
            <input type="month" value={mesFiltro} onChange={e=>setMesFiltro(e.target.value)}
              style={{border:"1px solid var(--gray-200)",borderRadius:6,padding:"4px 8px",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:"#dc2626"}}>{mesFiltro.split("-").reverse().join("/")} : {fmtVal(totalMes)}</div>
        </div>
        {lancamentosFiltrados.length===0
          ? <div style={{padding:24,textAlign:"center",fontSize:13,color:"var(--text-muted)"}}>Nenhum lançamento em {mesFiltro.split("-").reverse().join("/")}.</div>
          : <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--gray-50)"}}>
                  {["Data","Descrição","Campanha","Valor",""].map(h=>(
                    <th key={h} style={{padding:"9px 14px",textAlign:"left",fontWeight:600,color:"var(--text-muted)",fontSize:12}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lancamentosFiltrados.map(l=>(
                  <tr key={l.id} style={{borderTop:"1px solid var(--gray-100)"}}>
                    <td style={{padding:"10px 14px",color:"var(--text-muted)"}}>{fmtData(l.data)}</td>
                    <td style={{padding:"10px 14px",fontWeight:500}}>{l.descricao||"—"}</td>
                    <td style={{padding:"10px 14px"}}>
                      {l.campanhaNome
                        ? <span style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{l.campanhaNome}</span>
                        : <span style={{color:"var(--gray-400)",fontSize:12}}>—</span>}
                    </td>
                    <td style={{padding:"10px 14px",fontWeight:700,color:"#dc2626"}}>{fmtVal(l.valor)}</td>
                    <td style={{padding:"10px 14px"}}>
                      <button onClick={()=>excluir(l)}
                        style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)",padding:4,display:"flex",alignItems:"center",gap:4,fontSize:12,fontFamily:"inherit"}}
                        onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                        onMouseLeave={e=>e.currentTarget.style.color="var(--gray-400)"}>
                        <Icon name="trash-2" size={13}/> Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {/* Gerenciamento de Campanhas */}
      <div style={{background:"white",border:"1px solid var(--gray-200)",borderRadius:12,overflow:"hidden",marginTop:20}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--gray-100)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:600,fontSize:13}}>🏷️ Gerenciar Campanhas</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>{campanhas.length} campanha{campanhas.length!==1?"s":""} cadastrada{campanhas.length!==1?"s":""}</div>
        </div>
        {campanhas.length===0
          ? <div style={{padding:24,textAlign:"center",fontSize:13,color:"var(--text-muted)"}}>Nenhuma campanha cadastrada ainda.</div>
          : <div style={{padding:"8px 0"}}>
              {campanhas.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 18px",borderBottom:"1px solid var(--gray-50)"}}>
                  <span style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:600}}>{c.nome}</span>
                  <button onClick={async()=>{
                    if (!window.confirm(`Excluir a campanha "${c.nome}" e todos os lançamentos financeiros vinculados? Esta ação não pode ser desfeita.`)) return;
                    try {
                      const snap = await db.collection("clinica_lancamentos").where("campanhaId","==",c.id).get();
                      const batch = db.batch();
                      snap.docs.forEach(d=>batch.delete(d.ref));
                      await batch.commit();
                      await db.collection("clinica_campanhas").doc(c.id).delete();
                    } catch(e) { alert("Erro ao excluir."); }
                  }} style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)",padding:4,display:"flex",alignItems:"center",gap:4,fontSize:12,fontFamily:"inherit"}}
                    onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                    onMouseLeave={e=>e.currentTarget.style.color="var(--gray-400)"}>
                    <Icon name="trash-2" size={13}/> Excluir
                  </button>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════
function DashboardMarketing({ user }) {
  const [leads, setLeads] = useState([]);
  useEffect(()=>{
    db.collection("clinica_leads").limit(100)
      .onSnapshot(s=>setLeads(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[]);

  const total     = leads.length;
  const converted = leads.filter(l=>l.status==="convertido").length;
  const inProgress= leads.filter(l=>["contato","proposta","agendado"].includes(l.status)).length;
  const taxa      = total>0 ? Math.round((converted/total)*100) : 0;

  const porOrigem = leads.reduce((acc,l)=>{ const o=l.origem||"Não informado"; acc[o]=(acc[o]||0)+1; return acc; },{});
  const porStatus = leads.reduce((acc,l)=>{ const s=l.status||"novo"; acc[s]=(acc[s]||0)+1; return acc; },{});

  const STATUS_LABEL = { novo:"Novo", contato:"Em contato", proposta:"Proposta enviada", agendado:"Agendado", convertido:"Convertido", perdido:"Perdido" };
  const STATUS_COR   = { novo:"#6b7280", contato:"#0891b2", proposta:"#7B00C4", agendado:"#d97706", convertido:"#16a34a", perdido:"#dc2626" };

  return (
    <div style={{padding:"24px 28px",maxWidth:900}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:600}}>Dashboard de Marketing</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:4}}>Captação de leads — somente leitura</div>
      </div>

      {/* Cards resumo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,marginBottom:28}}>
        {[
          {label:"Total de Leads",   valor:total,      icon:"users",        cor:"#7B00C4"},
          {label:"Em andamento",     valor:inProgress,  icon:"clock",        cor:"#0891b2"},
          {label:"Convertidos",      valor:converted,   icon:"check-circle", cor:"#16a34a"},
          {label:"Taxa de conversão",valor:taxa+"%",    icon:"trending-up",  cor:"#ea580c"},
        ].map((c,i)=>(
          <div key={i} style={{background:"white",borderRadius:12,padding:"18px 20px",border:"1px solid var(--gray-200)",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{fontSize:12,color:"var(--text-muted)",fontWeight:500}}>{c.label}</div>
              <div style={{width:32,height:32,borderRadius:8,background:c.cor+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon name={c.icon} size={16} style={{color:c.cor}}/>
              </div>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:c.cor}}>{c.valor}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
        {/* Por origem */}
        <div style={{background:"white",borderRadius:12,padding:20,border:"1px solid var(--gray-200)"}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>📊 Leads por Origem</div>
          {Object.keys(porOrigem).length===0
            ? <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum dado ainda.</div>
            : Object.entries(porOrigem).sort((a,b)=>b[1]-a[1]).map(([origem,qty])=>{
                const pct = total>0?Math.round((qty/total)*100):0;
                return (
                  <div key={origem} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                      <span>{origem}</span><span style={{fontWeight:600}}>{qty} ({pct}%)</span>
                    </div>
                    <div style={{background:"var(--gray-100)",borderRadius:4,height:6}}>
                      <div style={{width:pct+"%",height:"100%",background:"#7B00C4",borderRadius:4}}/>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Por status */}
        <div style={{background:"white",borderRadius:12,padding:20,border:"1px solid var(--gray-200)"}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>🎯 Leads por Status</div>
          {Object.keys(porStatus).length===0
            ? <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum dado ainda.</div>
            : Object.entries(porStatus).sort((a,b)=>b[1]-a[1]).map(([status,qty])=>(
                <div key={status} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,marginBottom:6,background:((STATUS_COR[status]||"#6b7280")+"15")}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:STATUS_COR[status]||"#6b7280"}}/>
                    <span style={{fontSize:13}}>{STATUS_LABEL[status]||status}</span>
                  </div>
                  <span style={{fontWeight:700,fontSize:14,color:STATUS_COR[status]||"#6b7280"}}>{qty}</span>
                </div>
              ))
          }
        </div>
      </div>

      {/* Lista de leads recentes */}
      <div style={{background:"white",borderRadius:12,border:"1px solid var(--gray-200)",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--gray-100)",fontWeight:600,fontSize:14}}>
          📋 Leads Recentes
        </div>
        {leads.length===0
          ? <div style={{padding:24,textAlign:"center",fontSize:13,color:"var(--text-muted)"}}>Nenhum lead cadastrado ainda.</div>
          : <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"var(--gray-50)"}}>
                    {["Nome","Origem","Status","Contato","Data"].map(h=>(
                      <th key={h} style={{padding:"10px 16px",textAlign:"left",fontWeight:600,color:"var(--text-muted)",fontSize:12}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0,20).map(l=>(
                    <tr key={l.id} style={{borderTop:"1px solid var(--gray-100)"}}>
                      <td style={{padding:"10px 16px",fontWeight:500}}>{l.nome||"—"}</td>
                      <td style={{padding:"10px 16px",color:"var(--text-muted)"}}>{l.origem||"—"}</td>
                      <td style={{padding:"10px 16px"}}>
                        <span style={{background:(STATUS_COR[l.status]||"#6b7280")+"20",color:STATUS_COR[l.status]||"#6b7280",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}>
                          {STATUS_LABEL[l.status]||l.status||"novo"}
                        </span>
                      </td>
                      <td style={{padding:"10px 16px",color:"var(--text-muted)"}}>{l.telefone||l.email||"—"}</td>
                      <td style={{padding:"10px 16px",color:"var(--text-muted)"}}>
                        {l.createdAt?.toDate ? l.createdAt.toDate().toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
      {/* Central de Lançamentos — só psicóloga */}
      {user?.tipo==="psicologa" && <CentralLancamentosMarketing/>}
    </div>
  );
}

const NAV_MARKETING = [
  { id:"marketing-dashboard",    label:"Dashboard",   icon:"trending-up" },
  { id:"dashboard-performance",  label:"Performance", icon:"bar-chart-2" },
];

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
