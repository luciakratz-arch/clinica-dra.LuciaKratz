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

const LOGO_URL = "../logo.png";
const SENHA_ADMIN = "1234";
const SENHA_PAULO = "paulo123";
const SITE_URL = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";

const PERFIS = [
  { id:"psicologa",  nome:"Sou Psicologa",  desc:"Acesso ao painel clinico completo", icon:"stethoscope", cor:"#7B00C4" },
  { id:"secretaria", nome:"Sou Secretaria",  desc:"Cadastro de pacientes e financeiro da clinica", icon:"clipboard-list", cor:"#0891b2" },
  { id:"paulo",      nome:"Paulo Sergio",    desc:"Visualizacao do financeiro familiar", icon:"bar-chart-2", cor:"#16a34a" },
];

const MODULOS = [
  { id:"tcc",    nome:"TCC — Pensamentos Automaticos", desc:"tcc" },
  { id:"humor",  nome:"Registro de Humor",             desc:"humor" },
  { id:"diario", nome:"Diario Terapeutico",            desc:"diario" },
  { id:"metas",  nome:"Metas Terapeuticas",            desc:"metas" },
  { id:"reflexoes", nome:"Reflexoes Cognitivas",       desc:"reflexoes" },
  { id:"musico", nome:"Musicoterapia",                 desc:"musicoterapia" },
];

const FERRAMENTAS = [
  { id:"arvore",      nome:"Arvore da Decisao",         desc:"Tecnica da TCC para transformar preocupacoes em acoes concretas." },
  { id:"ansiedade",   nome:"Gestao da Ansiedade",       desc:"Acompanhe nivel de estresse, tracking e roda da vida." },
  { id:"entrevista",  nome:"Entrevista Clinica Inicial",desc:"Instrumento de avaliacao clinica inicial com DSM-5." },
  { id:"anamnese",    nome:"Anamnese — Marcos do Desenvolvimento", desc:"Formulario completo de anamnese." },
  { id:"alimentacao", nome:"Rastreamento Emocional da Alimentacao", desc:"Consciencia sobre relacao entre emocoes e alimentacao." },
];

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
        onLogin({ tipo:"secretaria", ...sec });
      }
    } catch(e) { setErro("Erro ao conectar."); }
    setLoading(false);
  }

  const perfil = PERFIS.find(p => p.id === perfilSel);

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo">
          <img src={LOGO_URL} alt="LK" onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="block";}}/>
          <span className="login-logo-placeholder" style={{display:"none"}}>LK</span>
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
            <div className="login-footer"><a href="../" style={{color:"var(--gray-400)",fontSize:12}}>Voltar ao site</a></div>
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
  {id:"dashboard",   label:"Dashboard",         icon:"layout-dashboard"},
  {id:"pacientes",   label:"Pacientes",          icon:"users"},
  {id:"alunos",      label:"Alunos",             icon:"graduation-cap"},
  {id:"casais",      label:"Terapia de Casais",  icon:"heart"},
  {id:"recursos",    label:"Recursos",           icon:"tool"},
  {id:"laudos",      label:"Laudos",             icon:"file-text"},
  {id:"agenda",      label:"Agenda",             icon:"calendar"},
  {id:"fin-clinica", label:"Fin. Clinica",       icon:"dollar-sign"},
  {id:"fin-pessoal", label:"Fin. Pessoal",       icon:"home"},
  {id:"config",      label:"Configuracoes",      icon:"settings"},
];
const NAV_SECRETARIA = [
  {id:"pacientes",   label:"Pacientes",  icon:"users"},
  {id:"agenda",      label:"Agenda",     icon:"calendar"},
  {id:"fin-clinica", label:"Financeiro", icon:"dollar-sign"},
];
const NAV_PAULO = [{id:"fin-pessoal", label:"Financeiro Familiar", icon:"home"}];

// SIDEBAR
function Sidebar({ user, tab, setTab, onLogout }) {
  const nav = user.tipo==="secretaria"?NAV_SECRETARIA:user.tipo==="paulo"?NAV_PAULO:NAV_PSICOLOGA;
  const titulo = user.tipo==="secretaria"?"Area da Secretaria":user.tipo==="paulo"?"Financeiro Familiar":"Area Administrativa";
  const initials = (user.nome||"U").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return (
    <div className="sidebar-desktop">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={LOGO_URL} alt="LK" onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="block";}}/>
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
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div>
            <div className="sidebar-user-name">{user.nome}</div>
            {user.crp && <div className="sidebar-user-crp">{user.crp}</div>}
          </div>
        </div>
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
  const { data:pacientes } = useCollection("clinica_pacientes");
  const ativos = pacientes.filter(p=>p.status==="ativo").length;
  const hoje = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard Clinico</div>
        <div className="page-subtitle" style={{textTransform:"capitalize"}}>{hoje}</div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-icon"><Icon name="users" size={20}/></div><div className="metric-label">Total de Pacientes</div><div className="metric-value">{pacientes.length}</div><div className="metric-sub">{ativos} ativos</div></div>
        <div className="metric-card"><div className="metric-icon"><Icon name="calendar" size={20}/></div><div className="metric-label">Sessoes este Mes</div><div className="metric-value">0</div></div>
        <div className="metric-card"><div className="metric-icon"><Icon name="file-text" size={20}/></div><div className="metric-label">Laudos</div><div className="metric-value">0</div></div>
        <div className="metric-card"><div className="metric-icon"><Icon name="heart" size={20}/></div><div className="metric-label">Humor Medio</div><div className="metric-value">—</div></div>
      </div>
      <div className="card">
        <div style={{fontWeight:600,marginBottom:12}}>Bem-vinda, {user.nome} 🦋</div>
        <p style={{fontSize:14,color:"var(--text-muted)",lineHeight:1.7}}>Sistema administrativo em construcao progressiva.</p>
        <div style={{marginTop:16}}><a href="../clinica/" style={{fontSize:13,color:"var(--purple)",display:"flex",alignItems:"center",gap:6,width:"fit-content"}}><Icon name="external-link" size={14}/> Portal do Paciente</a></div>
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
function AbaModulos({ paciente }) {
  const [modulos, setModulos] = useState(paciente.modulosAtivos||[]);
  async function toggle(id) {
    const novos = modulos.includes(id)?modulos.filter(m=>m!==id):[...modulos,id];
    setModulos(novos);
    await db.collection("clinica_pacientes").doc(paciente.id).update({modulosAtivos:novos});
  }
  return (
    <div className="card">
      <div style={{fontWeight:600,marginBottom:4}}>Modulos Ativos</div>
      <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Ative ou desative modulos para personalizar a experiencia terapeutica deste paciente.</p>
      {MODULOS.map(m=>(
        <div key={m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0",borderBottom:"1px solid var(--gray-100)"}}>
          <div><div style={{fontWeight:500,fontSize:14}}>{m.nome}</div><div style={{fontSize:12,color:"var(--text-muted)"}}>{m.desc}</div></div>
          <button onClick={()=>toggle(m.id)} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:modulos.includes(m.id)?"var(--purple)":"var(--gray-200)",position:"relative",transition:"background .2s",flexShrink:0}}>
            <span style={{position:"absolute",top:2,left:modulos.includes(m.id)?"22px":"2px",width:20,height:20,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
          </button>
        </div>
      ))}
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
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(null);

  if(perfilAberto) {
    const pac = pacientes.find(p=>p.id===perfilAberto);
    if(pac) return <PerfilPaciente paciente={pac} onVoltar={()=>setPerfilAberto(null)} pacientes={pacientes}/>;
  }

  const filtrados = pacientes.filter(p=>{
    const ok=filtro==="todos"||p.status===filtro;
    const bk=!busca||p.nome?.toLowerCase().includes(busca.toLowerCase())||p.email?.toLowerCase().includes(busca.toLowerCase());
    return ok&&bk;
  });

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
        <button className="btn btn-purple" onClick={abrirNovo}><Icon name="user-plus" size={16}/> Novo Paciente</button>
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
    </div>
  );
}

// FINANCEIRO CLINICA
function FinanceiroClinica() {
  const { data:pacientes } = useCollection("clinica_pacientes","nome");
  const [lancamentos, setLancamentos] = useState([]);
  const [form, setForm] = useState({pacienteId:"",tipo:"consulta",valor:"",data:new Date().toISOString().slice(0,10),obs:"",status:"recebido"});
  const [salvando, setSalvando] = useState(false);
  useEffect(()=>{
    const unsub=db.collection("clinica_financeiro_clinica").orderBy("data","desc").onSnapshot(snap=>setLancamentos(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return unsub;
  },[]);
  const totalMes=lancamentos.filter(l=>{const d=new Date(l.data),n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()&&l.status==="recebido";}).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  const totalPendente=lancamentos.filter(l=>l.status==="pendente").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  async function salvarLancamento(){if(!form.valor||!form.data){alert("Valor e data obrigatorios.");return;}setSalvando(true);await db.collection("clinica_financeiro_clinica").add({...form,valor:parseFloat(form.valor),createdAt:firebase.firestore.FieldValue.serverTimestamp()});setForm({pacienteId:"",tipo:"consulta",valor:"",data:new Date().toISOString().slice(0,10),obs:"",status:"recebido"});setSalvando(false);}
  async function excluir(id){if(!confirm("Excluir?"))return;await db.collection("clinica_financeiro_clinica").doc(id).delete();}
  const getPacNome=id=>pacientes.find(p=>p.id===id)?.nome||"—";
  return (
    <div>
      <div className="page-header"><div className="page-title">Financeiro da Clinica</div><div className="page-subtitle">Receitas e lancamentos das consultas</div></div>
      <div className="metrics-grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        <div className="metric-card"><div className="metric-icon"><Icon name="trending-up" size={20}/></div><div className="metric-label">Recebido este Mes</div><div className="metric-value" style={{color:"var(--success)"}}>{totalMes.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div></div>
        <div className="metric-card"><div className="metric-icon"><Icon name="clock" size={20}/></div><div className="metric-label">Pendente</div><div className="metric-value" style={{color:"#d97706"}}>{totalPendente.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div></div>
        <div className="metric-card"><div className="metric-icon"><Icon name="list" size={20}/></div><div className="metric-label">Lancamentos</div><div className="metric-value">{lancamentos.length}</div></div>
      </div>
      <div className="card" style={{marginBottom:20}}>
        <div style={{fontWeight:600,marginBottom:16}}>Novo Lancamento</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
          <div className="form-group"><label className="form-label">Paciente</label><select className="form-input" value={form.pacienteId} onChange={e=>setForm({...form,pacienteId:e.target.value})}><option value="">Selecione...</option>{pacientes.filter(p=>p.status==="ativo").map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Tipo</label><select className="form-input" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}><option value="consulta">Consulta</option><option value="avaliacao">Avaliacao</option><option value="musicoterapia">Musicoterapia</option><option value="neuromodulacao">Neuromodulacao</option><option value="outro">Outro</option></select></div>
          <div className="form-group"><label className="form-label">Valor R$</label><input className="form-input" type="number" placeholder="250.00" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})}/></div>
          <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/></div>
          <div className="form-group"><label className="form-label">Status</label><select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="recebido">Recebido</option><option value="pendente">Pendente</option><option value="cancelado">Cancelado</option></select></div>
          <div className="form-group"><label className="form-label">Obs</label><input className="form-input" placeholder="Opcional..." value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})}/></div>
        </div>
        <button className="btn btn-purple" style={{marginTop:12}} onClick={salvarLancamento} disabled={salvando}><Icon name="plus" size={16}/> {salvando?"Salvando...":"Lancar"}</button>
      </div>
      <div className="card" style={{padding:0}}>
        <div style={{padding:"14px 20px",fontWeight:600,borderBottom:"1px solid var(--gray-100)"}}>Historico</div>
        {lancamentos.length===0?<div style={{padding:40,textAlign:"center",color:"var(--text-muted)"}}>Nenhum lancamento ainda.</div>:
          lancamentos.map(l=>(
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:"1px solid var(--gray-100)"}}>
              <div style={{flex:1}}><div style={{fontWeight:500}}>{getPacNome(l.pacienteId)} - {l.tipo}</div><div style={{fontSize:13,color:"var(--text-muted)"}}>{l.data}{l.obs?" - "+l.obs:""}</div></div>
              <div style={{fontWeight:600,fontSize:16,color:l.status==="recebido"?"var(--success)":l.status==="pendente"?"#d97706":"var(--gray-400)"}}>{parseFloat(l.valor||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
              <span className={"badge "+(l.status==="recebido"?"badge-green":l.status==="pendente"?"badge-purple":"badge-gray")}>{l.status}</span>
              <button className="btn btn-ghost" style={{padding:"6px 10px"}} onClick={()=>excluir(l.id)}><Icon name="trash-2" size={14}/></button>
            </div>
          ))}
      </div>
    </div>
  );
}

// FINANCEIRO PESSOAL
function FinanceiroPessoal({ somenteLeitura=false }) {
  return (
    <div>
      <div className="page-header"><div className="page-title">Financeiro Familiar</div><div className="page-subtitle">{somenteLeitura?"Visualizacao — Paulo Sergio":"Gestao financeira pessoal e familiar"}</div></div>
      <div className="card">
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><Icon name="home" size={24}/><div style={{fontWeight:600}}>Modulo Financeiro Pessoal</div>{somenteLeitura&&<span className="badge badge-purple">Somente visualizacao</span>}</div>
        <p style={{fontSize:14,color:"var(--text-muted)",lineHeight:1.7}}>O sistema de gestao financeira pessoal sera integrado nesta area em breve.</p>
        <div style={{marginTop:16,padding:16,background:"var(--purple-bg)",borderRadius:"var(--radius)",fontSize:13,color:"var(--gray-600)"}}>O sistema financeiro completo (fluxo mensal, anual, graficos e dividas) sera integrado na proxima etapa.</div>
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
    await db.collection("clinica_casais").add({
      nomeCasal:form.nomeCasal||null,
      p1Id:form.p1, p1Nome:p1?.nome||"",
      p2Id:form.p2, p2Nome:p2?.nome||"",
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    setModal(false);setForm({nomeCasal:"",p1:"",p2:""});setSalvando(false);
  }

  async function excluir(id){
    if(!confirm("Remover vinculo?"))return;
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

function RecursosTerapeuticos() {
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCateg, setFiltroCateg] = useState("todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({titulo:"",descricao:"",categoria:"tcc",tipo:"interativa",formularioKey:""});
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
    setModal(false);setForm({titulo:"",descricao:"",categoria:"tcc",tipo:"interativa",formularioKey:""});setEditando(null);setSalvando(false);
  }

  async function excluir(id){if(!confirm("Excluir recurso?"))return;await db.collection("clinica_recursos").doc(id).delete();}

  function abrirEditar(r){
    setForm({titulo:r.titulo||"",descricao:r.descricao||"",categoria:r.categoria||"tcc",tipo:r.tipo||"interativa",formularioKey:r.formularioKey||""});
    setEditando(r.id);setModal(true);
  }

  const getCatInfo = (id) => CATEGORIAS_RECURSOS.find(c=>c.id===id)||CATEGORIAS_RECURSOS[6];

  if(loading) return <Spinner/>;

  return (
    <div>
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Recursos Terapeuticos</div>
          <div className="page-subtitle">{recursos.length} ferramenta{recursos.length!==1?"s":""} · {recursos.filter(r=>r.tipo==="interativa").length} interativas · {recursos.filter(r=>r.tipo==="conteudo").length} de conteudo</div>
        </div>
        <button className="btn btn-purple" onClick={()=>{setForm({titulo:"",descricao:"",categoria:"tcc",tipo:"interativa",formularioKey:""});setEditando(null);setModal(true);}}>
          <Icon name="plus" size={16}/> Nova Ferramenta
        </button>
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid var(--gray-200)"}}>
        {[["ferramentas","Ferramentas"],["casais","Terapia de Casais"]].map(([id,label])=>(
          <button key={id} onClick={()=>setAbaView(id)} style={{padding:"10px 20px",border:"none",background:"none",cursor:"pointer",fontSize:14,color:abaView===id?"var(--purple)":"var(--gray-600)",borderBottom:abaView===id?"2px solid var(--purple)":"2px solid transparent",fontWeight:abaView===id?600:400,fontFamily:"var(--font-body)",marginBottom:-1,display:"flex",alignItems:"center",gap:6}}>
            <Icon name={id==="ferramentas"?"wrench":"heart"} size={15}/>{label}
          </button>
        ))}
      </div>

      {/* Busca + filtros */}
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

      {/* Grid por categoria */}
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
                    <div style={{background:cat.bg,borderRadius:8,padding:8,flexShrink:0}}><Icon name={r.tipo==="interativa"?"zap":"file-text"} size={16}/></div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{background:cat.bg,color:cat.cor,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600,border:"1px solid "+cat.cor+"30"}}>INTERATIVA</span>
                        {r.tipo==="musicoterapia"&&<span style={{background:"#fce7f3",color:"#be185d",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}>Musica</span>}
                      </div>
                      <div style={{fontWeight:600,fontSize:14}}>{r.titulo}</div>
                    </div>
                  </div>
                  <p style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.5,flex:1}}>{r.descricao}</p>
                  {r.formularioKey&&<span style={{fontSize:11,color:"var(--gray-400)",background:"var(--gray-50)",borderRadius:6,padding:"2px 8px",display:"inline-block",width:"fit-content"}}>{r.formularioKey}</span>}
                  <div style={{display:"flex",gap:8,borderTop:"1px solid var(--gray-100)",paddingTop:10}}>
                    <button className="btn btn-ghost" style={{fontSize:12,flex:1,color:"var(--purple)"}}><Icon name="eye" size={13}/> Visualizar</button>
                    <button className="btn btn-ghost" style={{fontSize:12,flex:1}} onClick={()=>abrirEditar(r)}><Icon name="pencil" size={13}/> Editar</button>
                    <button className="btn btn-ghost" style={{padding:"6px 10px",color:"var(--danger)"}} onClick={()=>excluir(r.id)}><Icon name="trash-2" size={13}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

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
  const [form, setForm] = useState({titulo:"",pacienteId:"",tipo:"Avaliacao Neuropsicologica",status:"rascunho",conteudo:""});
  const [salvando, setSalvando] = useState(false);
  const [laudoAberto, setLaudoAberto] = useState(null);

  const TIPOS_LAUDO = ["Avaliacao Neuropsicologica","Avaliacao Psicologica","Avaliacao Infantil","Avaliacao de TDAH","Avaliacao de Altas Habilidades","Pericia Psicologica","Demandas Judiciais","Orientacao de Carreira","Relatorio de Acompanhamento","Outro"];

  const STATUS_CONFIG = {
    rascunho: {label:"Rascunho", bg:"#fef3c7", cor:"#b45309"},
    assinado: {label:"Assinado", bg:"#d1fae5", cor:"#065f46"},
    finalizado:{label:"Finalizado",bg:"#dbeafe",cor:"#1e40af"},
  };

  useEffect(()=>{
    const unsub = db.collection("clinica_laudos").orderBy("createdAt","desc").onSnapshot(snap=>{
      setLaudos(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
  },[]);

  async function salvar(){
    if(!form.titulo){alert("Titulo obrigatorio.");return;}
    setSalvando(true);
    const pac = pacientes.find(p=>p.id===form.pacienteId);
    await db.collection("clinica_laudos").add({
      ...form,
      pacienteNome:pac?.nome||"",
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    setModal(false);setForm({titulo:"",pacienteId:"",tipo:"Avaliacao Neuropsicologica",status:"rascunho",conteudo:""});setSalvando(false);
  }

  async function excluir(id){if(!confirm("Excluir laudo?"))return;await db.collection("clinica_laudos").doc(id).delete();}

  async function mudarStatus(id,novoStatus){
    await db.collection("clinica_laudos").doc(id).update({status:novoStatus,assinadoEm:novoStatus==="assinado"?new Date().toISOString():null});
    setLaudoAberto(l=>l?{...l,status:novoStatus}:null);
  }

  const totalRascunho = laudos.filter(l=>l.status==="rascunho").length;
  const totalAssinado = laudos.filter(l=>l.status==="assinado").length;
  const totalFinalizado = laudos.filter(l=>l.status==="finalizado").length;

  if(loading) return <Spinner/>;

  // Tela de edição do laudo
  if(laudoAberto){
    const st = STATUS_CONFIG[laudoAberto.status]||STATUS_CONFIG.rascunho;
    return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <button className="btn btn-ghost" style={{padding:"8px 12px"}} onClick={()=>setLaudoAberto(null)}><Icon name="arrow-left" size={16}/></button>
          <div style={{flex:1}}>
            <div className="page-title" style={{fontSize:22}}>{laudoAberto.titulo}</div>
            <div style={{fontSize:13,color:"var(--text-muted)"}}>{laudoAberto.pacienteNome} · {laudoAberto.tipo}</div>
          </div>
          <span style={{background:st.bg,color:st.cor,borderRadius:20,padding:"4px 14px",fontSize:13,fontWeight:600}}>{st.label}</span>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>Mudar status:</span>
            {Object.entries(STATUS_CONFIG).map(([k,v])=>(
              <button key={k} className={"btn "+(laudoAberto.status===k?"btn-purple":"btn-ghost")} style={{fontSize:12}} onClick={()=>mudarStatus(laudoAberto.id,k)}>{v.label}</button>
            ))}
          </div>
        </div>
        <div className="card">
          <label className="form-label" style={{marginBottom:8,display:"block"}}>Conteudo do Laudo</label>
          <textarea
            className="form-input"
            rows={20}
            value={laudoAberto.conteudo||""}
            onChange={async e=>{
              const novoConteudo = e.target.value;
              setLaudoAberto(l=>({...l,conteudo:novoConteudo}));
              await db.collection("clinica_laudos").doc(laudoAberto.id).update({conteudo:novoConteudo});
            }}
            placeholder="Digite o conteudo do laudo aqui..."
            style={{fontSize:14,lineHeight:1.7,minHeight:400}}
          />
          <div style={{marginTop:10,fontSize:12,color:"var(--text-muted)"}}>Autosalvo automaticamente.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Laudos Neuropsicologicos</div>
          <div className="page-subtitle">{laudos.length} laudo(s)</div>
        </div>
        <button className="btn btn-purple" onClick={()=>setModal(true)}><Icon name="plus" size={16}/> Novo Laudo</button>
      </div>

      <div className="metrics-grid" style={{gridTemplateColumns:"repeat(3,1fr)",marginBottom:24}}>
        {[["rascunho","Rascunho",totalRascunho],["assinado","Assinado",totalAssinado],["finalizado","Finalizado",totalFinalizado]].map(([k,l,n])=>(
          <div key={k} className="metric-card" style={{textAlign:"center"}}>
            <div className="metric-value" style={{fontSize:28}}>{n}</div>
            <div className="metric-label">{l}</div>
          </div>
        ))}
      </div>

      {laudos.length===0?(
        <div className="card" style={{textAlign:"center",padding:60,color:"var(--text-muted)"}}>
          <Icon name="file-text" size={48}/>
          <div style={{marginTop:12,fontWeight:500}}>Nenhum laudo criado ainda</div>
          <button className="btn btn-purple" style={{marginTop:16}} onClick={()=>setModal(true)}><Icon name="plus" size={14}/> Criar primeiro laudo</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {laudos.map(l=>{
            const st = STATUS_CONFIG[l.status]||STATUS_CONFIG.rascunho;
            return (
              <div key={l.id} className="card" style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",cursor:"pointer"}}
                onClick={()=>setLaudoAberto(l)}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(123,0,196,0.12)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
                <div style={{width:42,height:42,background:"var(--purple-soft)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name="file-text" size={18}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:600}}>{l.titulo}</span>
                    <span style={{background:st.bg,color:st.cor,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{st.label}</span>
                  </div>
                  <div style={{fontSize:13,color:"var(--text-muted)",display:"flex",gap:10,marginTop:2}}>
                    <span>{l.pacienteNome||"—"}</span>
                    <span>{l.tipo}</span>
                    {l.createdAt?.seconds&&<span>{new Date(l.createdAt.seconds*1000).toLocaleDateString("pt-BR")}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn btn-ghost" style={{padding:"6px 10px",color:"var(--danger)"}} onClick={e=>{e.stopPropagation();excluir(l.id);}}><Icon name="trash-2" size={13}/></button>
                  <Icon name="chevron-right" size={16}/>
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
              <label className="form-label">Titulo do Laudo *</label>
              <input className="form-input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Ex: Avaliacao Neuropsicologica — Nome do Paciente" autoFocus/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Paciente</label>
              <select className="form-input" value={form.pacienteId} onChange={e=>setForm({...form,pacienteId:e.target.value})}>
                <option value="">Selecionar paciente...</option>
                {pacientes.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Tipo de Laudo</label>
              <select className="form-input" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                {TIPOS_LAUDO.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}>{salvando?"Criando...":"Criar Laudo"}</button>
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
function Configuracoes() {
  const [tiposLaudo, setTiposLaudo] = useState([
    "Avaliacao Neuropsicologica","Avaliacao Psicologica","Avaliacao Infantil",
    "Avaliacao de TDAH","Avaliacao de Altas Habilidades","Pericia Psicologica",
    "Demandas Judiciais","Orientacao de Carreira","Relatorio de Acompanhamento","Outro"
  ]);
  const [novoTipo, setNovoTipo] = useState("");
  const [logoUrl, setLogoUrl] = useState("../logo.png");
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
            <img src="../logo.png" alt="Logo padrao" style={{width:52,height:52,borderRadius:10,objectFit:"contain",background:"white",padding:4}} onError={e=>e.target.style.display="none"}/>
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

// APP
function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(null);
  function handleLogin(u){setUser(u);if(u.tipo==="psicologa")setTab("dashboard");if(u.tipo==="secretaria")setTab("pacientes");if(u.tipo==="paulo")setTab("fin-pessoal");}
  function handleLogout(){setUser(null);setTab(null);}
  if(!user) return <Login onLogin={handleLogin}/>;
  return (
    <div>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout}/>
      <div className="header-mobile"><div className="header-mobile-logo">Administracao</div><button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button></div>
      <div className="main-content">
        {user.tipo==="psicologa"  &&tab==="dashboard"   &&<DashboardAdmin user={user}/>}
        {user.tipo==="psicologa"  &&tab==="pacientes"   &&<Pacientes user={user}/>}
        {user.tipo==="psicologa"  &&tab==="alunos"      &&<Alunos/>}
        {user.tipo==="psicologa"  &&tab==="casais"      &&<TerapiaCasais/>}
        {user.tipo==="psicologa"  &&tab==="recursos"    &&<RecursosTerapeuticos/>}
        {user.tipo==="psicologa"  &&tab==="laudos"      &&<Laudos/>}
        {user.tipo==="psicologa"  &&tab==="fin-clinica" &&<FinanceiroClinica/>}
        {user.tipo==="psicologa"  &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={false}/>}
        {user.tipo==="psicologa"  &&tab==="config"      &&<Configuracoes/>}
        {user.tipo==="secretaria" &&tab==="pacientes"   &&<Pacientes user={user}/>}
        {user.tipo==="secretaria" &&tab==="fin-clinica" &&<FinanceiroClinica/>}
        {user.tipo==="paulo"      &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={true}/>}
      </div>
      <div className="nav-mobile">
        {(user.tipo==="psicologa"?NAV_PSICOLOGA.slice(0,5):user.tipo==="secretaria"?NAV_SECRETARIA:NAV_PAULO).map(item=>(
          <button key={item.id} className={"nav-mobile-item "+(tab===item.id?"active":"")} onClick={()=>setTab(item.id)}><Icon name={item.icon} size={20}/><span>{item.label.split(" ")[0]}</span></button>
        ))}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
