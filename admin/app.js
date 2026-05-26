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
  {id:"dashboard",    label:"Dashboard",          icon:"layout-dashboard"},
  {id:"pacientes",    label:"Pacientes",           icon:"users"},
  {id:"alunos",       label:"Alunos",              icon:"graduation-cap"},
  {id:"casais",       label:"Terapia de Casais",   icon:"heart"},
  {id:"funil-leads",  label:"Funil de Leads",      icon:"filter"},
  {id:"marketing-dashboard", label:"Marketing",    icon:"trending-up"},
  {id:"recursos",     label:"Recursos Terapeuticos",icon:"wrench"},
  {id:"laudos",       label:"Laudos",              icon:"file-text"},
  {id:"agenda",       label:"Agenda",              icon:"calendar"},
  {id:"fin-clinica",  label:"Fin. Clinica",        icon:"dollar-sign"},
  {id:"comissoes",    label:"Comissoes",           icon:"percent"},
  {id:"fin-pessoal",  label:"Fin. Pessoal",        icon:"home"},
  {id:"depoimentos",  label:"Depoimentos",         icon:"star"},
  {id:"config",       label:"Configuracoes",       icon:"settings"},
];
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
  const nav = user.tipo==="secretaria"?NAV_SECRETARIA:user.tipo==="paulo"?NAV_PAULO:user.tipo==="marketing"?NAV_MARKETING:NAV_PSICOLOGA;
  const titulo = user.tipo==="secretaria"?"Area da Secretaria":user.tipo==="paulo"?"Financeiro Familiar":user.tipo==="marketing"?"Marketing":"Area Administrativa";
  const nomeExibir = user.nome && !user.nome.includes("@") ? user.nome : (user.nomeCompleto || "Usuário");
  const initials = nomeExibir.split(" ").map(w=>w[0]).filter(Boolean).slice(0,2).join("").toUpperCase() || "U";
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
        {nav.map(item=>(
          <button key={item.id} className={"nav-item "+(tab===item.id?"active":"")} onClick={()=>setTab(item.id)}>
            <Icon name={item.icon} size={18}/>{item.label}
          </button>
        ))}
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
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
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
            <textarea className="form-input" rows={3} value={form.objetivos||""} onChange={e=>setForm({...form,objetivos:e.target.value})} placeholder="Descreva os objetivos da terapia..."/>
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
  const [casalEtapas, setCasalEtapas] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    db.collection("clinica_recursos").get().then(s => setRecursos(s.docs.map(d=>({id:d.id,...d.data()}))));
    db.collection("clinica_fabulas").onSnapshot(s => setFabulas(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
    db.collection("clinica_casais_etapas").onSnapshot(s => setCasalEtapas(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
  }, []);

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
      ferramentas: casalEtapas
        .sort((a,b)=>(parseInt(a.ordem)||99)-(parseInt(b.ordem)||99))
        .map(f=>({id:f.id, nome:f.titulo||f["título"]||f.nome||f.id, desc:f.descricao||f["descrição"]||""})),
      automatico: false },
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
  useEffect(()=>{
    const unsub = db.collection("clinica_pacientes").doc(paciente.id).collection("humor")
      .orderBy("data","desc").limit(30).onSnapshot(snap=>{setHumor(snap.docs.map(d=>({id:d.id,...d.data()})));},()=>{});
    return unsub;
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
    </div>
  );
}

// ABA CASAL
function AbaCasal({ paciente, pacientes }) {
  const [casalId, setCasalId] = useState(paciente.casalId||"");
  const [salvando, setSalvando] = useState(false);
  const parceiro = pacientes.find(p=>p.id===paciente.casalId);
  const outros = pacientes.filter(p=>p.id!==paciente.id&&p.status==="ativo");

  async function vincular() {
    if(!casalId){alert("Selecione o parceiro(a).");return;}
    setSalvando(true);
    await db.collection("clinica_pacientes").doc(paciente.id).update({casalId});
    await db.collection("clinica_pacientes").doc(casalId).update({casalId:paciente.id});
    setSalvando(false); alert("Casal vinculado!");
  }
  async function desvincular() {
    if(!confirm("Desvincular casal?"))return;
    setSalvando(true);
    if(paciente.casalId) await db.collection("clinica_pacientes").doc(paciente.casalId).update({casalId:""});
    await db.collection("clinica_pacientes").doc(paciente.id).update({casalId:""});
    setCasalId(""); setSalvando(false);
  }

  return (
    <div className="card">
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}><Icon name="heart" size={18}/><div style={{fontWeight:600}}>Vinculo de Casal</div></div>
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
  );
}

// PERFIL COMPLETO
function PerfilPaciente({ paciente, onVoltar, pacientes }) {
  const [aba, setAba] = useState("perfil");
  const ABAS = [
    {id:"perfil",label:"Perfil",icon:"user"},
    {id:"modulos",label:"Modulos",icon:"toggle-right"},
    {id:"ferramentas",label:"Ferramentas",icon:"wrench"},
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
      <div style={{display:"flex",gap:4,marginBottom:24,flexWrap:"wrap",borderBottom:"1px solid var(--gray-200)"}}>
        {ABAS.map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",border:"none",background:"none",fontSize:14,cursor:"pointer",fontFamily:"var(--font-body)",color:aba===a.id?"var(--purple)":"var(--gray-600)",borderBottom:aba===a.id?"2px solid var(--purple)":"2px solid transparent",fontWeight:aba===a.id?500:400,transition:"all .2s",marginBottom:-1}}>
            <Icon name={a.icon} size={15}/>{a.label}
          </button>
        ))}
      </div>
      {aba==="perfil"     &&<AbaPerfil      paciente={paciente} pacientes={pacientes}/>}
      {aba==="modulos"    &&<AbaModulos     paciente={paciente}/>}
      {aba==="ferramentas"&&<AbaFerramentas paciente={paciente}/>}
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
              <div className="form-group" style={{gridColumn:"span 2"}}><label className="form-label">Objetivos Terapeuticos</label><textarea className="form-input" rows={3} value={form.objetivos||""} onChange={e=>setForm({...form,objetivos:e.target.value})} placeholder="Descreva os objetivos..."/></div>
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
  const pac = pacientes.find(p=>p.id===pacienteId);
  const pacote = pacoteId ? pacotes.find(p=>p.id===pacoteId) : null;
  const pacEfetivo = pac || pacientes.find(p=>p.id===pacote?.pacienteId);

  // Se pacoteId → só sessões deste pacote; se pacienteId → todas do paciente
  const sessPac = pacoteId
    ? sessoes.filter(s=>s.pacoteId===pacoteId).sort((a,b)=>a.data?.localeCompare(b.data))
    : sessoes.filter(s=>s.pacienteId===pacienteId).sort((a,b)=>a.data?.localeCompare(b.data));

  const pacotesPac = pacoteId
    ? [pacote].filter(Boolean)
    : pacotes.filter(p=>p.pacienteId===pacienteId);
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
  async function remarcarSessao(s){
    const nd=prompt("Nova data (AAAA-MM-DD):",s.data);
    if(!nd)return;
    await db.collection("clinica_sessoes").doc(s.id).update({data:nd,status:"agendado",remarcada:true,dataOriginal:s.dataOriginal||s.data});
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
        <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,borderBottom:"1px solid var(--gray-100)"}}>
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
                      const isPago=s.pagamento==="pago";
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
                            {s.status==="cancelado"&&(
                              <button onClick={()=>remarcarSessao(s)} style={{marginTop:2,display:"block",fontSize:9,background:"none",border:"1px solid #0891b2",color:"#0891b2",borderRadius:3,padding:"1px 4px",cursor:"pointer"}}>Remarcar</button>
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
                            <input type="number" defaultValue={isPago?vPago:""} onBlur={e=>atualizarPagamento(s,s.formaPagamento||"",e.target.value)}
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
                            <input type="date" defaultValue={s.dataPagamento||""} onBlur={e=>atualizarSessao(s.id,{dataPagamento:e.target.value})}
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

  const FORMAS = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Depósito","Transferência","Outro"];
  const RECORRENCIAS = ["Semanal (1x/semana)","2x por semana","3x por semana","Quinzenal","Mensal","Sessão única"];
  const DIAS_LABEL = {0:"Dom",1:"Seg",2:"Ter",3:"Qua",4:"Qui",5:"Sex",6:"Sáb"};

  const [formAvulso, setFormAvulso] = useState({pacienteId:"",tipo:"Consulta",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pendente",obs:""});
  const [formPacote, setFormPacote] = useState({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},obs:""});

  useEffect(()=>{
    const u1=db.collection("clinica_lancamentos").orderBy("data","desc").onSnapshot(s=>setLancamentos(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const u2=db.collection("clinica_pacotes").orderBy("createdAt","desc").onSnapshot(s=>setPacotes(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const u3=db.collection("clinica_sessoes").orderBy("data").onSnapshot(s=>setSessoes(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
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
      obs,
      totalSessoes:total,valorSessao:vSessao,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });

    // Registra comissão da secretária
    if(tipoVenda) await registrarComissao({ tipo:"Pacote", valor:vTotal, pacienteNome:pac?.nome||"", tipoVenda });

    // Cria sessões na agenda
    const batch=db.batch();
    datas.forEach((data,i)=>{
      const ref=db.collection("clinica_sessoes").doc();
      const dia=new Date(data+"T00:00:00").getDay().toString();
      const horaDia=(horariosPorDia||{})[dia]||horario;
      batch.set(ref,{
        pacienteId,pacienteNome:pac?.nome||"",data,hora:horaDia,
        duracao:"50",tipo:"Psicoterapia",status:"agendado",
        numSessao:i+1,pacoteId:pacRef.id,valorSessao:vSessao,
        pagamento:"pendente",formaPagamento:"",dataPagamento:"",obs:"",
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    setModal(false);setFormPacote({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},statusPag:"pendente",formaPag:"",dataPagamento:"",obs:""});setSalvando(false);
    alert(`✅ Pacote criado! ${datas.length} sessões geradas na agenda.`);
  }

  async function atualizarSessao(id,campos){ await db.collection("clinica_sessoes").doc(id).update(campos); }

  async function remarcarSessao(s){
    const nd=prompt("Nova data (AAAA-MM-DD):",s.data);
    if(!nd)return;
    await db.collection("clinica_sessoes").doc(s.id).update({data:nd,status:"agendado",remarcada:true,dataOriginal:s.dataOriginal||s.data});
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
    // Modo editar pacote individual (id__pacote)
    if(pacoteSelecionado.endsWith("__pacote")){
      const pacoteId = pacoteSelecionado.replace("__pacote","");
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

  // Métricas
  const totalRecebido=lancamentos.filter(l=>l.status==="recebido").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  return(
    <div>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
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
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid var(--gray-200)"}}>
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
            return (
              <div style={{display:"flex",flexDirection:"column",gap:28}}>
                {pacientesComPacote.map(pacId=>{
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
                          const pct=Math.round((realizadas/(p.totalSessoes||1))*100);
                          const lancPac=lancamentos.find(l=>l.pacoteId===p.id);
                          const dataInclusao = p.createdAt?.seconds
                            ? new Date(p.createdAt.seconds*1000).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})
                            : p.dataInicio
                              ? new Date(p.dataInicio+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})
                              : "—";
                          return(
                            <div key={p.id} className="card" style={{padding:"16px 20px",borderLeft:"4px solid var(--purple)"}}>
                              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                                <div style={{flex:1}}>
                                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                                    <span style={{background:"var(--purple-soft)",color:"var(--purple)",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>
                                      📅 Criado em {dataInclusao}
                                    </span>
                                    <span style={{background:lancPac?.status==="recebido"?"#d1fae5":"#fef3c7",color:lancPac?.status==="recebido"?"#065f46":"#b45309",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>
                                      {lancPac?.status==="recebido"?"✓ Pago":"Pagamento Pendente"}
                                    </span>
                                    <span style={{marginLeft:"auto",fontWeight:700,color:"#059669",fontSize:14}}>
                                      {(p.valorTotal||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                                    </span>
                                  </div>
                                  <div style={{fontSize:12,color:"var(--text-muted)",display:"flex",gap:12,flexWrap:"wrap",marginBottom:10}}>
                                    <span>🔄 {p.recorrencia}</span>
                                    <span>🕐 {p.horario}</span>
                                    <span>📋 {realizadas}/{p.totalSessoes} sessões</span>
                                    <span>📆 Início: {p.dataInicio?new Date(p.dataInicio+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</span>
                                  </div>
                                  <div style={{background:"#e5e7eb",borderRadius:20,height:6,marginBottom:4}}>
                                    <div style={{background:"var(--purple)",height:6,borderRadius:20,width:pct+"%",transition:"width .3s"}}/>
                                  </div>
                                  <div style={{fontSize:11,color:"var(--text-muted)"}}>{pct}% concluído</div>
                                </div>
                              </div>
                              <div style={{display:"flex",gap:8,marginTop:12,borderTop:"1px solid var(--gray-100)",paddingTop:12}}>
                                <button className="btn btn-ghost" style={{fontSize:12,color:"var(--purple)",border:"1.5px solid var(--purple)"}} onClick={()=>setPacoteSelecionado(p.id+"__pacote")}>
                                  <Icon name="edit-3" size={13}/> Editar pacote
                                </button>
                                <button className="btn btn-purple" style={{fontSize:12}} onClick={()=>setPacoteSelecionado(p.id+"__pacote")}>
                                  <Icon name="clipboard-list" size={13}/> Ver Sessões
                                </button>
                                <button className="btn btn-ghost" style={{fontSize:12,color:"#dc2626",marginLeft:"auto"}} onClick={async()=>{
                                  if(!confirm(`Excluir pacote de ${p.pacienteNome}?`))return;
                                  const todas=sessoes.filter(s=>s.pacoteId===p.id);
                                  const b=db.batch();
                                  todas.forEach(s=>b.delete(db.collection("clinica_sessoes").doc(s.id)));
                                  b.delete(db.collection("clinica_pacotes").doc(p.id));
                                  const lp=lancamentos.find(l=>l.pacoteId===p.id);
                                  if(lp) b.delete(db.collection("clinica_lancamentos").doc(lp.id));
                                  await b.commit();
                                }}>
                                  <Icon name="trash-2" size={13}/>
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
                  <option value="">Selecionar...</option>{pacientes.filter(p=>p.status==="ativo").map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
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
                  <button className="btn btn-purple" onClick={()=>salvarAvulso("primeira")} disabled={salvando}
                    style={{background:"#7B00C4"}} title="10% de comissão">
                    🌟 Primeira Venda
                  </button>
                  <button className="btn btn-purple" onClick={()=>salvarAvulso("recorrente")} disabled={salvando}
                    style={{background:"#0891b2"}} title="5% de comissão">
                    🔁 Venda Recorrente
                  </button>
                </>
              )}
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
                    <option value="">Selecionar...</option>{pacientes.filter(p=>p.status==="ativo").map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
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
                <div className="form-group" style={{gridColumn:"1/-1"}}><label className="form-label">Observações</label>
                  <textarea className="form-input" rows={2} value={formPacote.obs} onChange={e=>setFormPacote({...formPacote,obs:e.target.value})} placeholder="Notas sobre o pacote..."/>
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
    const u1=db.collection("clinica_financeiro_pessoal").orderBy("data","desc").onSnapshot(s=>setLancamentos(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const u2=db.collection("clinica_fin_pessoal_recorrentes").orderBy("createdAt","desc").onSnapshot(s=>setRecorrentes(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
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
              <textarea className="form-input" rows={2} value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} placeholder="Notas sobre o aluno..."/>
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
function TerapiaCasais() {
  const { data:pacientes } = useCollection("clinica_pacientes","nome");
  const [casais, setCasais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({nomeCasal:"",p1:"",p2:""});
  const [salvando, setSalvando] = useState(false);

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
    // Grava casalId nos dois pacientes para o portal clínico detectar
    await db.collection("clinica_pacientes").doc(form.p1).update({casalId:form.p2});
    await db.collection("clinica_pacientes").doc(form.p2).update({casalId:form.p1});
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
            <div key={c.id} className="card" style={{display:"flex",alignItems:"center",gap:16,padding:"18px 24px"}}>
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
                <button className="btn btn-outline" style={{fontSize:13}} onClick={()=>alert("Detalhe do casal — em breve")}>Ver detalhes <Icon name="chevron-right" size={14}/></button>
              </div>
            </div>
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
                {pacientes.filter(p=>p.status==="ativo").map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Parceiro(a) 2 *</label>
              <select className="form-input" value={form.p2} onChange={e=>setForm({...form,p2:e.target.value})}>
                <option value="">Selecionar paciente...</option>
                {pacientes.filter(p=>p.status==="ativo"&&p.id!==form.p1).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
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
  {id:"relaxamento",  label:"Relaxamento e Bem-estar",         cor:"#0284c7", bg:"#e0f2fe"},
  {id:"tcc",          label:"Terapia Cognitivo-Comportamental", cor:"#7c3aed", bg:"#ede9fe"},
  {id:"avaliacao",    label:"Avaliacao e Anamnese",             cor:"#6d28d9", bg:"#f5f3ff"},
  {id:"psicoeducacao",label:"Psicoeducacao",                    cor:"#b45309", bg:"#fef3c7"},
  {id:"mindfulness",  label:"Mindfulness",                      cor:"#059669", bg:"#d1fae5"},
  {id:"musicoterapia",label:"Musicoterapia",                    cor:"#be185d", bg:"#fce7f3"},
  {id:"outro",        label:"Outros Recursos",                  cor:"#6b7280", bg:"#f3f4f6"},
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

// ── Respiração 4-7-8 ──
function FerramentaRespiracao({musicUrl}){
  const FASES=[{fase:"inhale",label:"Inspire",seg:4,cor:"#6366f1",speech:"Inspire pelo nariz"},
               {fase:"hold",  label:"Segure", seg:7,cor:"#f59e0b",speech:"Segure o ar"},
               {fase:"exhale",label:"Expire", seg:8,cor:"#10b981",speech:"Expire pela boca"}];
  const TOTAL=19;
  const [running,setRunning]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [ciclos,setCiclos]=useState(0);
  const [voz,setVoz]=useState(true);
  const [showMusic,setShowMusic]=useState(false);
  const ref=useRef(0); const iv=useRef(null); const faseAnterior=useRef(null);
  const embedUrl=getYouTubeEmbed(musicUrl||"");

  function getFase(e){
    let acc=0;
    for(let i=0;i<FASES.length;i++){acc+=FASES[i].seg;if(e<acc)return{...FASES[i],restante:acc-e};}
    return{...FASES[0],restante:FASES[0].seg};
  }

  useEffect(()=>{
    if(!running){if(iv.current)clearInterval(iv.current);return;}
    iv.current=setInterval(()=>{
      ref.current+=1;
      if(ref.current>=TOTAL){ref.current=0;setCiclos(c=>c+1);}
      setElapsed(ref.current);
    },1000);
    return()=>clearInterval(iv.current);
  },[running]);

  const fase=getFase(elapsed);
  useEffect(()=>{
    if(running&&voz&&fase.fase!==faseAnterior.current){falarTexto(fase.speech);faseAnterior.current=fase.fase;}
  },[fase.fase,running,voz]);

  const pct=(elapsed/TOTAL)*100;
  const raio=80; const circ=2*Math.PI*raio;
  const phaseColors={"inhale":"#6366f1","hold":"#f59e0b","exhale":"#10b981"};
  const cor=phaseColors[fase.fase];

  return(
    <div style={{textAlign:"center",padding:"20px 0"}}>
      {embedUrl&&showMusic&&<iframe src={embedUrl} style={{width:"100%",height:60,border:"none",borderRadius:8,marginBottom:16}} allow="autoplay"/>}
      <div style={{position:"relative",width:200,height:200,margin:"0 auto 20px"}}>
        <svg width={200} height={200} style={{transform:"rotate(-90deg)"}}>
          <circle cx={100} cy={100} r={raio} fill="none" stroke="#e5e7eb" strokeWidth={8}/>
          <circle cx={100} cy={100} r={raio} fill="none" stroke={cor} strokeWidth={8}
            strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round"
            style={{transition:"stroke-dashoffset 0.9s linear,stroke 0.3s"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:28,fontWeight:700,color:cor}}>{fase.restante}</div>
          <div style={{fontSize:14,fontWeight:600,color:cor}}>{fase.label}</div>
          <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>ciclo {ciclos+1}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginBottom:16}}>
        {FASES.map(f=><span key={f.fase} style={{background:f.fase===fase.fase?f.cor+"20":"#f3f4f6",color:f.fase===fase.fase?f.cor:"#6b7280",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:600,border:"1px solid "+(f.fase===fase.fase?f.cor+"40":"#e5e7eb")}}>{f.label} {f.seg}s</span>)}
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button className="btn btn-purple" style={{minWidth:120}} onClick={()=>{setRunning(!running);if(!running){ref.current=elapsed;}}}>
          <Icon name={running?"pause":"play"} size={16}/> {running?"Pausar":"Iniciar"}
        </button>
        <button className="btn btn-ghost" onClick={()=>{setRunning(false);setElapsed(0);ref.current=0;setCiclos(0);faseAnterior.current=null;}}>
          <Icon name="rotate-ccw" size={16}/> Reiniciar
        </button>
        <button className="btn btn-ghost" onClick={()=>setVoz(!voz)} title={voz?"Desativar voz":"Ativar voz"}>
          <Icon name={voz?"volume-2":"volume-x"} size={16}/>
        </button>
        {embedUrl&&<button className="btn btn-ghost" onClick={()=>setShowMusic(!showMusic)}><Icon name="music" size={16}/></button>}
      </div>
      <div style={{marginTop:16,fontSize:13,color:"#6b7280"}}>Inspire 4s → Segure 7s → Expire 8s · {ciclos} ciclo(s) completo(s)</div>
    </div>
  );
}

// ── Relaxamento Muscular Progressivo ──
function FerramentaRelaxamento({musicUrl}){
  const GRUPOS=[
    {nome:"Pés",         instrucao:"Curve os dedos dos pés para baixo, fortemente.",  tensao:5, relax:15},
    {nome:"Panturrilhas",instrucao:"Puxe os pés em direção a você, estique.",         tensao:5, relax:15},
    {nome:"Coxas",       instrucao:"Aperte as coxas juntas, pressione a cadeira.",    tensao:5, relax:15},
    {nome:"Abdômen",     instrucao:"Contraia o estômago fortemente.",                  tensao:5, relax:15},
    {nome:"Mãos",        instrucao:"Feche os punhos com toda a sua força.",            tensao:5, relax:15},
    {nome:"Braços",      instrucao:"Dobre os cotovelos e contraia os bíceps.",         tensao:5, relax:15},
    {nome:"Ombros",      instrucao:"Levante-os até as orelhas, segure.",               tensao:5, relax:15},
    {nome:"Rosto",       instrucao:"Feche os olhos com força, aperte os lábios.",      tensao:5, relax:15},
  ];
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);
  const [concluidos,setConcluidos]=useState([]);
  const [grupoIdx,setGrupoIdx]=useState(0);
  const [fase,setFase]=useState("tensao"); // tensao | relax
  const [elapsed,setElapsed]=useState(0);
  const [voz,setVoz]=useState(true);
  const [showMusic,setShowMusic]=useState(false);
  const stRef=useRef({grupoIdx:0,fase:"tensao",elapsed:0});
  const concRef=useRef([]);
  const iv=useRef(null);
  const embedUrl=getYouTubeEmbed(musicUrl||"");

  function tick(){
    const s=stRef.current;
    const g=GRUPOS[s.grupoIdx];
    const lim=s.fase==="tensao"?g.tensao:g.relax;
    const ne=s.elapsed+1;
    if(ne>=lim){
      if(s.fase==="tensao"){
        const ns={...s,fase:"relax",elapsed:0};stRef.current=ns;setFase("relax");setElapsed(0);
        if(voz)falarTexto("Relaxe.");
      } else {
        concRef.current=[...concRef.current,s.grupoIdx];setConcluidos([...concRef.current]);
        const ng=s.grupoIdx+1;
        if(ng>=GRUPOS.length){clearInterval(iv.current);setRunning(false);setDone(true);if(voz)falarTexto("Parabéns! Você completou o relaxamento muscular.");}
        else{const ns={grupoIdx:ng,fase:"tensao",elapsed:0};stRef.current=ns;setGrupoIdx(ng);setFase("tensao");setElapsed(0);if(voz)falarTexto(GRUPOS[ng].nome+". Contraia.");}
      }
    } else {
      stRef.current={...s,elapsed:ne};setElapsed(ne);
    }
  }

  function iniciar(){
    if(running){clearInterval(iv.current);setRunning(false);return;}
    if(voz)falarTexto(GRUPOS[stRef.current.grupoIdx].nome+". Contraia.");
    iv.current=setInterval(tick,1000);setRunning(true);
  }
  function reiniciar(){clearInterval(iv.current);setRunning(false);setDone(false);setConcluidos([]);concRef.current=[];stRef.current={grupoIdx:0,fase:"tensao",elapsed:0};setGrupoIdx(0);setFase("tensao");setElapsed(0);}

  const g=GRUPOS[grupoIdx];
  const lim=fase==="tensao"?g.tensao:g.relax;
  const pct=Math.min((elapsed/lim)*100,100);

  if(done) return(
    <div style={{textAlign:"center",padding:40}}>
      <div style={{fontSize:48,marginBottom:12}}>✅</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>Relaxamento Completo!</div>
      <div style={{fontSize:13,color:"#6b7280",marginBottom:20}}>Você completou todos os 8 grupos musculares.</div>
      <button className="btn btn-purple" onClick={reiniciar}><Icon name="rotate-ccw" size={16}/> Reiniciar</button>
    </div>
  );

  return(
    <div>
      {embedUrl&&showMusic&&<iframe src={embedUrl} style={{width:"100%",height:60,border:"none",borderRadius:8,marginBottom:16}} allow="autoplay"/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:12,color:"#6b7280"}}>Progresso geral</div>
        <div style={{fontSize:12,color:"#6b7280"}}>{concluidos.length}/{GRUPOS.length} grupos</div>
      </div>
      <div style={{background:"#e5e7eb",borderRadius:20,height:6,marginBottom:20}}>
        <div style={{background:"var(--purple)",height:6,borderRadius:20,transition:"width .3s",width:(concluidos.length/GRUPOS.length*100)+"%"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
        {GRUPOS.map((g2,i)=>(
          <div key={i} style={{textAlign:"center",padding:"8px 4px",borderRadius:8,background:concluidos.includes(i)?"#d1fae5":i===grupoIdx?"var(--purple-soft)":"#f9fafb",border:"1px solid",borderColor:concluidos.includes(i)?"#6ee7b7":i===grupoIdx?"var(--purple)":"#e5e7eb"}}>
            <div style={{fontSize:10,fontWeight:600,color:concluidos.includes(i)?"#059669":i===grupoIdx?"var(--purple)":"#9ca3af"}}>{g2.nome}</div>
            {concluidos.includes(i)&&<div style={{fontSize:12}}>✓</div>}
          </div>
        ))}
      </div>
      <div style={{background:fase==="tensao"?"#fef3c7":"#d1fae5",borderRadius:12,padding:24,textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,color:fase==="tensao"?"#d97706":"#059669",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.8px"}}>
          {fase==="tensao"?"🔥 CONTRAIA":"✨ RELAXE"}
        </div>
        <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:4}}>{g.nome}</div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>{g.instrucao}</div>
        <div style={{fontSize:48,fontWeight:700,color:fase==="tensao"?"#d97706":"#059669"}}>{lim-elapsed}</div>
        <div style={{background:"#e5e7eb",borderRadius:20,height:6,marginTop:12}}>
          <div style={{background:fase==="tensao"?"#f59e0b":"#10b981",height:6,borderRadius:20,transition:"width .9s",width:pct+"%"}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button className="btn btn-purple" style={{minWidth:120}} onClick={iniciar}>
          <Icon name={running?"pause":"play"} size={16}/> {running?"Pausar":"Iniciar"}
        </button>
        <button className="btn btn-ghost" onClick={reiniciar}><Icon name="rotate-ccw" size={16}/> Reiniciar</button>
        <button className="btn btn-ghost" onClick={()=>setVoz(!voz)}><Icon name={voz?"volume-2":"volume-x"} size={16}/></button>
        {embedUrl&&<button className="btn btn-ghost" onClick={()=>setShowMusic(!showMusic)}><Icon name="music" size={16}/></button>}
      </div>
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
      <textarea className="form-input" rows={3} value={preocupacao} onChange={e=>setPreocupacao(e.target.value)} placeholder="Descreva o que está te preocupando..."/>
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
      <textarea className="form-input" rows={3} value={acoes} onChange={e=>setAcoes(e.target.value)} placeholder="Liste as ações possíveis..."/>
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
      <textarea className="form-input" rows={3} value={plano} onChange={e=>setPlano(e.target.value)} placeholder="Quando e como você vai agir?"/>
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
          <textarea className="form-input" rows={2} value={draft[campo]} onChange={e=>setDraft({...draft,[campo]:e.target.value})} placeholder={ph}/>
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
        {draft.showAlt&&<textarea className="form-input" style={{marginTop:8}} rows={2} value={draft.alternativo} onChange={e=>setDraft({...draft,alternativo:e.target.value})} placeholder="Existe outra forma de ver essa situação?"/>}
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
        <textarea className="form-input" rows={2} value={nota} onChange={e=>setNota(e.target.value)} placeholder="Observações..." style={{marginBottom:10}}/>
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
          <textarea className="form-input" rows={2} value={resp[i]} onChange={e=>{const r=[...resp];r[i]=e.target.value;setResp(r);}} placeholder="Sua resposta..."/>
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
      <div style={{marginBottom:12}}><label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Pensamento permissivo</label><textarea className="form-input" rows={2} value={pensamento} onChange={e=>setPensamento(e.target.value)} placeholder="'Só desta vez...' 'Mereço isso...'"/></div>
      <div style={{marginBottom:12}}><label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>O que você comeu?</label><textarea className="form-input" rows={2} value={comeu} onChange={e=>setComeu(e.target.value)} placeholder="Descreva os alimentos..."/></div>
      <div style={{marginBottom:12}}><label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:8}}>Como você se sentiu depois?</label><Chips opts={SENSACOES} sel={sensacoes} toggle={o=>setSensacoes(v=>v.includes(o)?v.filter(x=>x!==o):[...v,o])}/></div>
      <div style={{marginBottom:16}}><label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Reflexão</label><textarea className="form-input" rows={2} value={reflexao} onChange={e=>setReflexao(e.target.value)} placeholder="O que esse episódio revela sobre suas necessidades emocionais?"/></div>
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
    <textarea className="form-input" rows={5} value={respostas[secs[secao]]||""} onChange={e=>setRespostas(r=>({...r,[secs[secao]]:e.target.value}))} placeholder={"Registre as informações sobre "+secs[secao].toLowerCase()+"..."}/>
    <div style={{display:"flex",gap:10,marginTop:14,justifyContent:"space-between"}}>
      <button className="btn btn-ghost" onClick={()=>setSecao(s=>Math.max(0,s-1))} disabled={secao===0}>← Anterior</button>
      {secao<secs.length-1?<button className="btn btn-purple" onClick={()=>setSecao(s=>s+1)}>Próxima →</button>:<button className="btn btn-purple" onClick={()=>setConcluido(true)}>✓ Concluir</button>}
    </div>
  </div>);
}

// ── Modal Visualizar Ferramenta ─────────────────────────────────────────────
function ModalVisualizarFerramenta({recurso,onClose}){
  function renderFerramenta(){
    const k=recurso.formularioKey;
    if(k==="breathing-478")      return <FerramentaRespiracao musicUrl={recurso.musicUrl}/>;
    if(k==="muscle-relaxation")  return <FerramentaRelaxamento musicUrl={recurso.musicUrl}/>;
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
    return <div style={{textAlign:"center",padding:40,color:"#6b7280"}}>Ferramenta não configurada.</div>;
  }
  const EMOJIS={relaxamento:"💨",tcc:"🧠",avaliacao:"📋",musicoterapia:"🎵",outro:"🔧"};
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
          <div style={{background:"#f9fafb",borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:"#6b7280",lineHeight:1.7}}>
            Responda com honestidade e na presença da psicóloga. Esta atividade faz parte do protocolo de Terapia de Casais TCC.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[1,2,3].map(n=>(
              <div key={n}>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Reflexão {n}</label>
                <textarea className="form-input" rows={3}
                  value={respostas[at.id+"_"+n]||""}
                  onChange={e=>setRespostas(r=>({...r,[at.id+"_"+n]:e.target.value}))}
                  placeholder="Escreva sua resposta..."/>
              </div>
            ))}
          </div>
          <button className="btn btn-purple" style={{width:"100%",marginTop:16}} onClick={()=>{setMsg("✓ Salvo!");setTimeout(()=>setMsg(""),2000);}}>
            {msg||<><Icon name="save" size={15}/> Salvar respostas</>}
          </button>
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
  ansiedade:   {label:"Ansiedade",          cor:"#6366f1", bg:"#eef2ff"},
  resiliência: {label:"Resiliência",        cor:"#0ea5e9", bg:"#e0f2fe"},
  crescimento: {label:"Crescimento",        cor:"#16a34a", bg:"#dcfce7"},
  esperança:   {label:"Esperança",          cor:"#f59e0b", bg:"#fef3c7"},
  autoconfiança:{label:"Autoconfiança",     cor:"#7c3aed", bg:"#ede9fe"},
  tcc:         {label:"TCC",               cor:"#84cc16", bg:"#f7fee7"},
  perdão:      {label:"Perdão",             cor:"#8b5cf6", bg:"#f5f3ff"},
  autoestima:  {label:"Autoestima",         cor:"#ec4899", bg:"#fdf2f8"},
  autoconhecimento:{label:"Autoconhecimento",cor:"#374151",bg:"#f9fafb"},
  mindfulness: {label:"Mindfulness",       cor:"#059669", bg:"#d1fae5"},
  relacionamentos:{label:"Relacionamentos",cor:"#d97706", bg:"#fef3c7"},
  perspectiva: {label:"Perspectiva",       cor:"#1e3a5f", bg:"#e0f2fe"},
  "expressão emocional":{label:"Expressão Emocional",cor:"#0891b2",bg:"#cffafe"},
  "regulação emocional":{label:"Regulação Emocional",cor:"#2563eb",bg:"#dbeafe"},
};

function AbaFabulas() {
  const [fabulas, setFabulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fabulaAberta, setFabulaAberta] = useState(null);
  const [filtro, setFiltro] = useState("todos");

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

function RecursosTerapeuticos() {
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
  const ICONES_FERRAMENTA={"breathing-478":"💨","muscle-relaxation":"💪","decision-tree":"🌳","abc-record":"📋","anxiety-management":"🎯","emotional-eating":"🍃","entrevista-clinica":"📝","anamnese":"📄","treino-neuro-auditivo":"🎵"};
  const getIcone=(r)=>ICONES_FERRAMENTA[r.formularioKey]||(r.categoria==="relaxamento"?"💨":r.categoria==="tcc"?"🧠":r.categoria==="avaliacao"?"📋":r.categoria==="musicoterapia"?"🎵":"🔧");
  const [visualizando, setVisualizando] = useState(null);

  if(loading) return <Spinner/>;

  if(visualizando) return <ModalVisualizarFerramenta recurso={visualizando} onClose={()=>setVisualizando(null)}/>;
  return (
    <div>
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Recursos Terapeuticos</div>
          <div className="page-subtitle">{recursos.length} ferramenta{recursos.length!==1?"s":""} · {recursos.filter(r=>r.tipo==="interativa").length} interativas · {recursos.filter(r=>r.tipo==="conteudo").length} de conteudo</div>
        </div>
        <button className="btn btn-purple" onClick={()=>{setForm({titulo:"",descricao:"",categoria:"tcc",tipo:"interativa",formularioKey:"",musicUrl:""});setEditando(null);setModal(true);}}>
          <Icon name="plus" size={16}/> Nova Ferramenta
        </button>
      </div>

      {/* Abas — 3 abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid var(--gray-200)"}}>
        {[["ferramentas","Ferramentas","wrench"],["fabulas","Fábulas Terapêuticas","book-open"],["casais","Terapia de Casais","heart"]].map(([id,label,ic])=>(
          <button key={id} onClick={()=>setAbaView(id)} style={{padding:"10px 20px",border:"none",background:"none",cursor:"pointer",fontSize:14,color:abaView===id?"var(--purple)":"var(--gray-600)",borderBottom:abaView===id?"2px solid var(--purple)":"2px solid transparent",fontWeight:abaView===id?600:400,fontFamily:"var(--font-body)",marginBottom:-1,display:"flex",alignItems:"center",gap:6}}>
            <Icon name={ic} size={15}/>{label}
          </button>
        ))}
      </div>

      {/* Aba Fábulas */}
      {abaView==="fabulas"&&<AbaFabulas/>}

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
                        {r.categoria==="musicoterapia"&&<span style={{background:"#fce7f3",color:"#be185d",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}>Música</span>}
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
              <textarea className="form-input" rows={2} value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/>
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
    const unsub = db.collection("clinica_laudos").orderBy("createdAt","desc").onSnapshot(snap=>{
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

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
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
                {pacientes.filter(p=>p.status==="ativo").map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Link do PDF (Google Drive) *</label>
              <input className="form-input" value={form.linkDrive} onChange={e=>setForm({...form,linkDrive:e.target.value})} placeholder="https://drive.google.com/file/d/..."/>
              <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>No Drive: botão direito no arquivo → "Obter link" → cole aqui</div>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Observações internas (opcional)</label>
              <textarea className="form-input" rows={2} value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})} placeholder="Notas internas sobre este laudo..."/>
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
    const u1 = db.collection("clinica_sessoes").orderBy("data").onSnapshot(snap=>{
      setSessoes(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    // Reservas da sala (Thais) — aparecem como bloqueios laranjas
    const u2 = db.collection("sala_reservas").orderBy("data").onSnapshot(snap=>{
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
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Agenda</div>
          <div className="page-subtitle">{sessoes.filter(s=>s.status==="agendado"||s.status==="confirmado").length} sessões agendadas</div>
        </div>
        <div style={{display:"flex",gap:8}}>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
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
        <div style={{display:"grid",gridTemplateColumns:"80px repeat(7,1fr)",gap:4,marginBottom:4}}>
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
        </div>

        {/* Períodos */}
        {[
          {label:"☀️ Manhã",   range:["06:00","12:00"], bg:"#fffbeb"},
          {label:"🌤️ Tarde",   range:["12:00","18:00"], bg:"#f0f9ff"},
          {label:"🌙 Noite",   range:["18:00","23:59"], bg:"#f5f3ff"},
        ].map(periodo=>{
          const sessoesNoPeriodo = dias.some(dia=>
            sessoesNoDia(dia).some(s=>s.hora>=periodo.range[0]&&s.hora<periodo.range[1])
          );
          return (
            <div key={periodo.label} style={{display:"grid",gridTemplateColumns:"80px repeat(7,1fr)",gap:4,marginBottom:4}}>
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
                {pacientes.filter(p=>p.status==="ativo").map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
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
              <textarea className="form-input" rows={2} value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} placeholder="Notas sobre a sessão..."/>
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
    <div>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} notifProps={notifProps}/>
      <div className="header-mobile"><div className="header-mobile-logo">Administracao</div><button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button></div>
      <div className="main-content">
        {user.tipo==="psicologa"  &&tab==="dashboard"   &&<DashboardAdmin user={user}/>}
        {user.tipo==="psicologa"  &&tab==="pacientes"   &&<Pacientes user={user}/>}
        {user.tipo==="psicologa"  &&tab==="alunos"      &&<Alunos/>}
        {user.tipo==="psicologa"  &&tab==="casais"      &&<TerapiaCasais/>}
        {user.tipo==="psicologa"  &&tab==="recursos"    &&<RecursosTerapeuticos/>}
        {user.tipo==="psicologa"  &&tab==="laudos"      &&<Laudos/>}
        {user.tipo==="psicologa"  &&tab==="agenda"      &&<Agenda/>}
        {user.tipo==="psicologa"  &&tab==="fin-clinica" &&<FinanceiroClinica/>}
        {user.tipo==="psicologa"  &&tab==="comissoes"   &&<Comissoes user={user}/>}
        {user.tipo==="psicologa"  &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={false}/>}
        {tab==="__menu__"&&(
          <div style={{padding:20}}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:20}}>Menu</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {NAV_PSICOLOGA.filter(i=>!["dashboard","pacientes","agenda","fin-clinica"].includes(i.id)).map(item=>(
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
                  <textarea value={textoIA} onChange={e=>setTextoIA(e.target.value)} rows={5}
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
                <textarea value={form.obs||""} onChange={e=>f("obs",e.target.value)} rows={3}
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
                <textarea value={novaAnotacao} onChange={e=>setNovaAnotacao(e.target.value)} rows={3}
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

function CardLead({ lead, onEditar, onMover, colunas }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div draggable
      onDragStart={e=>{ setDragging(true); e.dataTransfer.setData("leadId", lead.id); }}
      onDragEnd={()=>setDragging(false)}
      onClick={()=>onEditar(lead)}
      style={{
        background:"white", borderRadius:10, padding:"12px 14px",
        boxShadow:"0 1px 4px rgba(0,0,0,0.08)", cursor:"grab",
        opacity: dragging?0.5:1, transition:"opacity .15s",
        border:"1px solid var(--gray-100)", marginBottom:8,
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  MODAL CONVERSÃO — Lead → Paciente
// ═══════════════════════════════════════════════════════
function ModalConversao({ lead, onConfirmar, onCancelar }) {
  const [email, setEmail]       = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");

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

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#16a34a,#15803d)",borderRadius:"16px 16px 0 0",padding:"24px",textAlign:"center",color:"white"}}>
          <div style={{fontSize:40,marginBottom:8}}>🎉</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700}}>Lead Convertido!</div>
          <div style={{fontSize:13,opacity:0.85,marginTop:4}}>Deseja cadastrar como Paciente na Clínica?</div>
        </div>

        {/* Dados do lead */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid var(--gray-100)"}}>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:"#16a34a",marginBottom:8}}>DADOS QUE SERÃO MIGRADOS</div>
            <div style={{fontSize:13,display:"flex",flexDirection:"column",gap:4}}>
              <div><strong>Nome:</strong> {lead.nome}</div>
              {lead.telefone&&<div><strong>WhatsApp:</strong> {lead.telefone}</div>}
              {lead.queixa&&<div><strong>Queixa:</strong> {lead.queixa}</div>}
            </div>
          </div>

          <div>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>
              E-mail do paciente <span style={{color:"#dc2626"}}>*</span>
            </label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErro("");}}
              className="form-input" placeholder="email@exemplo.com" autoFocus/>
            <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>
              Necessário para o acesso ao portal do paciente. Senha inicial: <strong>1234</strong>
            </div>
          </div>

          {erro&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:13,color:"#dc2626"}}>{erro}</div>}
        </div>

        {/* Botões */}
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

function FunilLeads({ user }) {
  const [leads, setLeads]                   = useState([]);
  const [modalLead, setModalLead]           = useState(null);
  const [dragOver, setDragOver]             = useState(null);
  const [modalConversao, setModalConversao] = useState(null);

  useEffect(()=>{
    db.collection("clinica_leads").orderBy("createdAt","desc")
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
          <div style={{fontSize:13,color:"var(--text-muted)",marginTop:2}}>{leads.length} lead{leads.length!==1?"s":""} no funil</div>
        </div>
        <button onClick={()=>setModalLead({})} className="btn-primary" style={{display:"flex",alignItems:"center",gap:6}}>
          <Icon name="plus" size={15}/> Novo Lead
        </button>
      </div>

      {/* Kanban */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,overflowX:"auto",minWidth:0}}>
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
//  CENTRAL DE LANÇAMENTOS DE MARKETING (só psicóloga)
// ═══════════════════════════════════════════════════════
function CentralLancamentosMarketing() {
  const [campanhas, setCampanhas]         = useState([]);
  const [lancamentos, setLancamentos]     = useState([]);
  const [salvando, setSalvando]           = useState(false);
  const [msg, setMsg]                     = useState(null);
  const [novaCampanha, setNovaCampanha]   = useState("");
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      f("campanhaId", ref.id);
      setNovaCampanha("");
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
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <input type="text" value={novaCampanha} onChange={e=>setNovaCampanha(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&criarCampanha()}
                  className="form-input" placeholder="Nome da nova campanha..." style={{flex:1}}
                  autoFocus/>
                <button onClick={criarCampanha}
                  style={{background:"#ea580c",color:"white",border:"none",borderRadius:8,padding:"0 16px",fontWeight:600,fontSize:13,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>
                  Criar
                </button>
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
    db.collection("clinica_leads").orderBy("createdAt","desc").limit(100)
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
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
  { id:"marketing-dashboard", label:"Dashboard", icon:"trending-up" },
];

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
