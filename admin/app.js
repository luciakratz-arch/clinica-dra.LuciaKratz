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
  {id:"recursos",    label:"Recursos Terapeuticos", icon:"wrench"},
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
  const { data:pacientes } = useCollection("clinica_pacientes","nome");
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
function FinanceiroClinica() {
  const { data:pacientes } = useCollection("clinica_pacientes","nome");
  const [lancamentos, setLancamentos] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0,7));
  const [modal, setModal] = useState(false); // false | "avulso" | "pacote"
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [pacoteSelecionado, setPacoteSelecionado] = useState(null);
  const [modalExcluir, setModalExcluir] = useState(null);
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

  // Agrupa lançamentos por mês
  const mesesDisp = [...new Set(lancamentos.map(l=>l.data?.slice(0,7)).filter(Boolean))].sort().reverse();
  if(!mesesDisp.includes(mesFiltro)) mesesDisp.unshift(mesFiltro);
  const lancMes = lancamentos.filter(l=>l.data?.startsWith(mesFiltro));
  const totalRecebidoMes = lancMes.filter(l=>l.status==="recebido").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  const totalPendente = lancamentos.filter(l=>l.status==="pendente").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  // Salvar lançamento avulso
  async function salvarAvulso(){
    if(!formAvulso.valor||!formAvulso.data){alert("Valor e data obrigatórios.");return;}
    setSalvando(true);
    const pac = pacientes.find(p=>p.id===formAvulso.pacienteId);
    const dados = {...formAvulso,valor:parseFloat(formAvulso.valor),pacienteNome:pac?.nome||""};
    if(editando){
      await db.collection("clinica_lancamentos").doc(editando).update(dados);
    } else {
      await db.collection("clinica_lancamentos").add({...dados,tipo_lancamento:"avulso",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
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

  async function salvarPacote(){
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
      formaPag:"",status:"pendente",obs,
      totalSessoes:total,valorSessao:vSessao,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });

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
    setModal(false);setFormPacote({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},obs:""});setSalvando(false);
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

  // ── Relatório de frequência ──
  function RelatorioFrequencia({pacienteId}){
    const pac = pacientes.find(p=>p.id===pacienteId);
    const sessPac = sessoes.filter(s=>s.pacienteId===pacienteId).sort((a,b)=>a.data?.localeCompare(b.data));
    const pacotesPac = pacotes.filter(p=>p.pacienteId===pacienteId);
    const [mesFiltro, setMesFiltro] = useState("todos");
    const [accordionAberto, setAccordionAberto] = useState({});

    const STATUS_S={
      agendado:  {l:"Agendado",   c:"#7B00C4"},
      confirmado:{l:"Confirmado", c:"#059669"},
      realizado: {l:"✓ Realizado",c:"#059669"},
      cancelado: {l:"Cancelado",  c:"#dc2626"},
      falta:     {l:"Falta",      c:"#d97706"},
      remarcado: {l:"Remarcado",  c:"#0891b2"},
    };

    // Agrupa por mês
    const porMes = sessPac.reduce((acc,s)=>{
      const mes = s.data?.slice(0,7)||"sem-data";
      if(!acc[mes]) acc[mes]=[];
      acc[mes].push(s);
      return acc;
    },{});
    const meses = Object.keys(porMes).sort();

    // Totais gerais
    const totalRecebido = sessPac.reduce((a,s)=>a+(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0)*(s.pagamento==="pago"?1:0),0);
    const totalSaldo = sessPac.filter(s=>s.pagamento==="pago").reduce((a,s)=>{
      const esperado=parseFloat(s.valorSessao)||0;
      const pago=parseFloat(s.valorPago)||esperado;
      return a+(pago-esperado);
    },0);
    const anoAtual = new Date().getFullYear();
    const totalAno = sessPac.filter(s=>s.data?.startsWith(anoAtual+"")&&s.pagamento==="pago").reduce((a,s)=>a+(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0),0);

    // Sessões do filtro
    const mesesFiltrados = mesFiltro==="todos"?meses:[mesFiltro];

    async function atualizarPagamento(s, formaPag, valorPago){
      const pago = formaPag!==""&&formaPag!=="pendente";
      const vPago = parseFloat(valorPago)||(parseFloat(s.valorSessao)||0);
      await atualizarSessao(s.id,{
        formaPagamento:formaPag,
        pagamento:pago?"pago":"pendente",
        valorPago:pago?vPago:0,
        dataPagamento:pago&&!s.dataPagamento?new Date().toISOString().slice(0,10):s.dataPagamento
      });
      // Integra com lançamentos — cria ou atualiza lançamento avulso da sessão
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

    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
          <button className="btn btn-ghost" onClick={()=>setPacoteSelecionado(null)}>← Voltar</button>
          <div style={{flex:1,fontFamily:"var(--font-display)",fontSize:18,fontWeight:600}}>{pac?.nome}</div>
          <button className="btn btn-outline" style={{fontSize:13}} onClick={()=>window.print()}>
            <Icon name="printer" size={14}/> Imprimir
          </button>
        </div>

        {/* Cabeçalho */}
        <div style={{background:"white",borderRadius:16,overflow:"hidden",border:"1px solid var(--gray-200)",marginBottom:16}}>
          <div style={{background:"var(--purple)",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontFamily:"Dancing Script, cursive",fontSize:22,color:"white",fontWeight:600}}>Controle de Atendimento Terapêutico</div>
            <img src="../logo-transparente.png" style={{height:36,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
          </div>
          <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,borderBottom:"1px solid var(--gray-100)"}}>
            {[["Nome",pac?.nome||"—"],["Início",pacotesPac[0]?.dataInicio?new Date(pacotesPac[0].dataInicio+"T00:00:00").toLocaleDateString("pt-BR"):"—"],["Horário",pacotesPac[0]?.horario||"—"],["Recorrência",pacotesPac[0]?.recorrencia||"—"]].map(([l,v])=>(
              <div key={l}><div style={{fontSize:10,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>{l}</div><div style={{fontWeight:600,fontSize:13}}>{v}</div></div>
            ))}
          </div>
          {/* Resumo por período selecionado */}
          <div style={{padding:"12px 20px",display:"flex",gap:20,flexWrap:"wrap",background:"var(--purple-soft)",borderBottom:"1px solid var(--gray-200)"}}>
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
                ["Total "+anoAtual,totalAno.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"#0891b2"],
              ].map(([l,v,c])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                  <div style={{fontSize:10,color:c,fontWeight:500}}>{l}</div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Filtro de mês */}
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:600,color:"var(--text-muted)"}}>Mês:</span>
          <button onClick={()=>setMesFiltro("todos")} style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid",borderColor:mesFiltro==="todos"?"var(--purple)":"#e5e7eb",background:mesFiltro==="todos"?"var(--purple)":"white",color:mesFiltro==="todos"?"white":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer"}}>Todos</button>
          {meses.map(m=>(
            <button key={m} onClick={()=>setMesFiltro(m)} style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid",borderColor:mesFiltro===m?"var(--purple)":"#e5e7eb",background:mesFiltro===m?"var(--purple)":"white",color:mesFiltro===m?"white":"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer"}}>
              {new Date(m+"-01").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"})}
            </button>
          ))}
        </div>

        {/* Tabelas por mês com accordion */}
        {mesesFiltrados.map(mes=>{
          const sessMes = porMes[mes]||[];
          const mesLabel = new Date(mes+"-01").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
          const recMes = sessMes.filter(s=>s.pagamento==="pago").reduce((a,s)=>a+(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0),0);
          const aberto = accordionAberto[mes]!==false; // default aberto
          return(
            <div key={mes} style={{background:"white",borderRadius:16,overflow:"hidden",border:"1px solid var(--gray-200)",marginBottom:12}}>
              {/* Header accordion */}
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
                              {s.remarcada&&<div style={{fontSize:9,color:"#0891b2"}}>Rem.</div>}
                            </td>
                            <td style={{padding:"6px 10px"}}>
                              <select value={s.status} onChange={e=>atualizarSessao(s.id,{status:e.target.value})}
                                style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 4px",color:st.c,fontWeight:600,background:"white",cursor:"pointer",minWidth:90}}>
                                {Object.entries(STATUS_S).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
                              </select>
                              {s.status==="cancelado"&&(
                                <button onClick={()=>remarcarSessao(s)} style={{marginTop:2,display:"block",fontSize:9,background:"none",border:"1px solid #0891b2",color:"#0891b2",borderRadius:3,padding:"1px 5px",cursor:"pointer"}}>Remarcar</button>
                              )}
                            </td>
                            <td style={{padding:"6px 10px"}}>
                              <input defaultValue={s.modalidade||"on-line"} onBlur={e=>atualizarSessao(s.id,{modalidade:e.target.value})}
                                style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 5px",width:65}}/>
                            </td>
                            <td style={{padding:"6px 10px",fontWeight:600,color:"#374151",whiteSpace:"nowrap"}}>
                              {vSessao.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                            </td>
                            <td style={{padding:"6px 10px"}}>
                              <input type="number" defaultValue={isPago?vPago:""} onBlur={e=>atualizarPagamento(s,s.formaPagamento||"",e.target.value)}
                                placeholder="0,00" style={{fontSize:10,border:"1px solid",borderColor:isPago?"#6ee7b7":"#e5e7eb",borderRadius:5,padding:"2px 5px",width:70,color:isPago?"#059669":"#374151",fontWeight:isPago?600:400}}/>
                            </td>
                            <td style={{padding:"6px 10px",fontWeight:600,whiteSpace:"nowrap",color:saldo<0?"#dc2626":saldo>0?"#059669":"#9ca3af"}}>
                              {isPago?(saldo===0?"—":saldo.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})):"—"}
                            </td>
                            <td style={{padding:"6px 10px"}}>
                              <select value={s.formaPagamento||""} onChange={e=>atualizarPagamento(s,e.target.value,s.valorPago||s.valorSessao)}
                                style={{fontSize:10,border:"1px solid",borderColor:isPago?"#6ee7b7":"#e5e7eb",borderRadius:5,padding:"2px 4px",color:isPago?"#059669":"#6b7280",fontWeight:isPago?600:400,cursor:"pointer",background:isPago?"#f0fdf4":"white",minWidth:75}}>
                                <option value="">Pendente</option>
                                {FORMAS.map(f=><option key={f} value={f}>{f}</option>)}
                              </select>
                            </td>
                            <td style={{padding:"6px 10px"}}>
                              <input type="date" defaultValue={s.dataPagamento||""} onBlur={e=>atualizarSessao(s.id,{dataPagamento:e.target.value})}
                                style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 4px",width:108}}/>
                            </td>
                            <td style={{padding:"6px 10px"}}>
                              <input defaultValue={s.obs||""} onBlur={e=>atualizarSessao(s.id,{obs:e.target.value})}
                                placeholder="—" style={{fontSize:10,border:"1px solid #e5e7eb",borderRadius:5,padding:"2px 5px",width:75}}/>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{background:"var(--purple-soft)"}}>
                        <td colSpan={5} style={{padding:"8px 10px",fontWeight:700,fontSize:12}}>Total do mês</td>
                        <td style={{padding:"8px 10px",fontWeight:700,fontSize:12}}>{sessMes.reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
                        <td style={{padding:"8px 10px",fontWeight:700,fontSize:12,color:"#059669"}}>{recMes.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
                        <td style={{padding:"8px 10px",fontWeight:700,fontSize:12,color:sessMes.reduce((a,s)=>a+(s.pagamento==="pago"?(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0)-(parseFloat(s.valorSessao)||0):0),0)<0?"#dc2626":"#059669"}}>
                          {(()=>{const sd=sessMes.reduce((a,s)=>a+(s.pagamento==="pago"?(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0)-(parseFloat(s.valorSessao)||0):0),0);return sd===0?"—":sd.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});})()}
                        </td>
                        <td colSpan={3}/>
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

    const STATUS_S={
      agendado:  {l:"Agendado",   c:"#7B00C4"},
      confirmado:{l:"Confirmado", c:"#059669"},
      realizado: {l:"✓",          c:"#059669"},
      cancelado: {l:"Cancelado",  c:"#dc2626"},
      falta:     {l:"Falta",      c:"#d97706"},
      remarcado: {l:"Remarcado",  c:"#0891b2"},
    };

    // Agrupa sessões por mês
    const porMes = sessPac.reduce((acc,s)=>{
      const mes = s.data?.slice(0,7)||"sem-data";
      if(!acc[mes]) acc[mes]=[];
      acc[mes].push(s);
      return acc;
    },{});

    const meses = Object.keys(porMes).sort();

    // Totais gerais
    const totalRealizadas = sessPac.filter(s=>s.status==="realizado").length;
    const totalPagas = sessPac.filter(s=>s.pagamento==="pago").length;
    const totalFaltas = sessPac.filter(s=>s.status==="falta").length;
    const totalRecebido = sessPac.filter(s=>s.pagamento==="pago").reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0);

    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button className="btn btn-ghost" onClick={()=>setPacoteSelecionado(null)}>← Voltar</button>
          <div style={{flex:1,fontFamily:"var(--font-display)",fontSize:18,fontWeight:600}}>{pac?.nome} — Controle de Atendimento</div>
          <button className="btn btn-outline" style={{fontSize:13}} onClick={()=>window.print()}>
            <Icon name="printer" size={14}/> Imprimir
          </button>
        </div>

        {/* Cabeçalho do relatório */}
        <div style={{background:"white",borderRadius:16,overflow:"hidden",border:"1px solid var(--gray-200)",marginBottom:16}}>
          <div style={{background:"var(--purple)",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontFamily:"Dancing Script, cursive",fontSize:24,color:"white",fontWeight:600}}>Controle de Atendimento Terapêutico</div>
            <img src="../logo-transparente.png" style={{height:40,objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>
          </div>
          <div style={{padding:"16px 20px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,borderBottom:"1px solid var(--gray-100)"}}>
            <div><div style={{fontSize:11,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:3}}>Nome</div><div style={{fontWeight:700,fontSize:15}}>{pac?.nome||"—"}</div></div>
            <div><div style={{fontSize:11,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:3}}>Início</div><div style={{fontWeight:600}}>{pacotesPac[0]?.dataInicio?new Date(pacotesPac[0].dataInicio+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</div></div>
            <div><div style={{fontSize:11,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:3}}>Horário</div><div style={{fontWeight:600}}>{pacotesPac[0]?.horario||"—"}</div></div>
            <div><div style={{fontSize:11,color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",marginBottom:3}}>Recorrência</div><div style={{fontWeight:600}}>{pacotesPac[0]?.recorrencia||"—"}</div></div>
          </div>
          {/* Totais gerais */}
          <div style={{padding:"12px 20px",background:"var(--purple-soft)",display:"flex",gap:24,flexWrap:"wrap"}}>
            {[["Total Sessões",sessPac.length,"#7B00C4"],["Realizadas",totalRealizadas,"#059669"],["Pagas",totalPagas,"#059669"],["Faltas",totalFaltas,"#dc2626"],["Total Recebido",totalRecebido.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"#059669"]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
                <div style={{fontSize:11,color:c,fontWeight:500}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabelas por mês */}
        {meses.map(mes=>{
          const sessMes = porMes[mes];
          const mesLabel = new Date(mes+"-01").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
          const pagas = sessMes.filter(s=>s.pagamento==="pago").length;
          const faltas = sessMes.filter(s=>s.status==="falta").length;
          return(
            <div key={mes} style={{background:"white",borderRadius:16,overflow:"hidden",border:"1px solid var(--gray-200)",marginBottom:16}}>
              {/* Cabeçalho do mês */}
              <div style={{background:"#f5f0ff",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"2px solid var(--purple)"}}>
                <div style={{fontWeight:700,fontSize:15,color:"var(--purple)",textTransform:"capitalize"}}>{mesLabel}</div>
                <div style={{display:"flex",gap:16,fontSize:12}}>
                  <span>Sessões: <strong>{sessMes.length}</strong></span>
                  <span style={{color:"#059669"}}>Pagas: <strong>{pagas}</strong></span>
                  {faltas>0&&<span style={{color:"#dc2626"}}>Faltas: <strong>{faltas}</strong></span>}
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"var(--purple)",color:"white"}}>
                      {["","Nº","Data","Presença","Modalidade","Forma Pagto","Data Pagto","Obs"].map(h=>(
                        <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessMes.map((s,i)=>{
                      const st=STATUS_S[s.status]||STATUS_S.agendado;
                      const isPago=s.pagamento==="pago";
                      return(
                        <tr key={s.id} style={{borderBottom:"1px solid var(--gray-100)",background:i%2===0?"white":"#fafafa"}}>
                          <td style={{padding:"6px 8px"}}>
                            <button onClick={()=>setModalExcluir({id:s.id,pacoteId:s.pacoteId,numSessao:s.numSessao||i+1,data:s.data})}
                              style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",padding:"2px 4px"}}>
                              <Icon name="trash-2" size={12}/>
                            </button>
                          </td>
                          <td style={{padding:"8px 12px",fontWeight:700,color:"var(--purple)"}}>{s.numSessao||"—"}</td>
                          <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
                            {s.data?new Date(s.data+"T00:00:00").toLocaleDateString("pt-BR"):"—"}
                            {s.remarcada&&<div style={{fontSize:9,color:"#0891b2"}}>Rem.</div>}
                          </td>
                          <td style={{padding:"8px 12px"}}>
                            <select value={s.status} onChange={e=>atualizarSessao(s.id,{status:e.target.value})}
                              style={{fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,padding:"3px 6px",color:st.c,fontWeight:600,background:"white",cursor:"pointer",minWidth:100}}>
                              {Object.entries(STATUS_S).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
                            </select>
                            {s.status==="cancelado"&&(
                              <button onClick={()=>remarcarSessao(s)} style={{marginTop:2,display:"block",fontSize:10,background:"none",border:"1px solid #0891b2",color:"#0891b2",borderRadius:4,padding:"1px 5px",cursor:"pointer"}}>Remarcar</button>
                            )}
                          </td>
                          <td style={{padding:"8px 12px"}}>
                            <input defaultValue={s.modalidade||"on-line"} onBlur={e=>atualizarSessao(s.id,{modalidade:e.target.value})}
                              style={{fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,padding:"3px 6px",width:75}}/>
                          </td>
                          <td style={{padding:"8px 12px"}}>
                            <select value={s.formaPagamento||""} onChange={e=>atualizarSessao(s.id,{formaPagamento:e.target.value,pagamento:e.target.value?"pago":"pendente"})}
                              style={{fontSize:11,border:"1px solid",borderColor:isPago?"#6ee7b7":"#e5e7eb",borderRadius:6,padding:"3px 6px",color:isPago?"#059669":"#6b7280",fontWeight:isPago?600:400,cursor:"pointer",background:isPago?"#f0fdf4":"white",minWidth:85}}>
                              <option value="">Pendente</option>
                              {FORMAS.map(f=><option key={f} value={f}>{f}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"8px 12px"}}>
                            <input type="date" defaultValue={s.dataPagamento||""} onBlur={e=>atualizarSessao(s.id,{dataPagamento:e.target.value})}
                              style={{fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,padding:"3px 6px",width:115}}/>
                          </td>
                          <td style={{padding:"8px 12px"}}>
                            <input defaultValue={s.obs||""} onBlur={e=>atualizarSessao(s.id,{obs:e.target.value})}
                              placeholder="—" style={{fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,padding:"3px 6px",width:85}}/>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                  <div style={{fontSize:11,color:"#6b7280"}}>Remove apenas esta sessão</div>
                </button>
                <button className="btn btn-ghost" style={{border:"1.5px solid #fbbf24",textAlign:"left",padding:"12px 16px"}} onClick={()=>confirmarExclusao("daqui")}>
                  <div style={{fontWeight:600,fontSize:13,color:"#d97706"}}>Esta e todas as próximas</div>
                  <div style={{fontSize:11,color:"#6b7280"}}>Remove esta e as sessões seguintes do pacote</div>
                </button>
                <button className="btn btn-ghost" style={{border:"1.5px solid #fca5a5",textAlign:"left",padding:"12px 16px"}} onClick={()=>confirmarExclusao("todos")}>
                  <div style={{fontWeight:600,fontSize:13,color:"#dc2626"}}>Cancelar todo o pacote</div>
                  <div style={{fontSize:11,color:"#6b7280"}}>Remove todas as sessões e encerra o pacote</div>
                </button>
              </div>
              <button className="btn btn-ghost" style={{width:"100%"}} onClick={()=>setModalExcluir(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if(pacoteSelecionado){
    return <RelatorioFrequencia pacienteId={pacoteSelecionado}/>;
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

      {/* Métricas */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[["Recebido (total)","#059669","#d1fae5",totalRecebido.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})],
          ["Pendente","#d97706","#fef3c7",totalPendente.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})],
          ["Pacotes ativos","#7B00C4","var(--purple-soft)",pacotes.filter(p=>p.status==="ativo").length],
          ["Lançamentos (mês)","#0891b2","#e0f2fe",lancMes.length]
        ].map(([l,cor,bg,v])=>(
          <div key={l} style={{background:bg,borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:cor}}>{v}</div>
            <div style={{fontSize:12,color:cor,fontWeight:500,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid var(--gray-200)"}}>
        {[["lancamentos","Lançamentos","dollar-sign"],["pacotes","Pacotes & Sessões","package"]].map(([id,lbl,ic])=>(
          <button key={id} onClick={()=>setAba(id)} style={{padding:"10px 20px",border:"none",background:"none",cursor:"pointer",fontSize:14,color:aba===id?"var(--purple)":"var(--gray-600)",borderBottom:aba===id?"2px solid var(--purple)":"2px solid transparent",fontWeight:aba===id?600:400,fontFamily:"var(--font-body)",marginBottom:-1,display:"flex",alignItems:"center",gap:6}}>
            <Icon name={ic} size={15}/>{lbl}
          </button>
        ))}
      </div>

      {/* ABA LANÇAMENTOS */}
      {aba==="lancamentos"&&(
        <div>
          {/* Filtro mês */}
          <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)"}}>Mês:</span>
            {mesesDisp.slice(0,18).map(m=>(
              <button key={m} onClick={()=>setMesFiltro(m)}
                style={{padding:"4px 12px",borderRadius:20,border:"1.5px solid",borderColor:mesFiltro===m?"var(--purple)":"#e5e7eb",background:mesFiltro===m?"var(--purple)":"white",color:mesFiltro===m?"white":"#6b7280",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {new Date(m+"-01").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"})}
              </button>
            ))}
          </div>
          {lancMes.length===0?(
            <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>
              <Icon name="dollar-sign" size={40}/>
              <div style={{marginTop:12}}>Nenhum lançamento em {new Date(mesFiltro+"-01").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</div>
            </div>
          ):(
            <div className="card" style={{padding:0}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:"var(--gray-50)"}}>
                  {["Data","Paciente","Tipo","Forma Pag.","Valor","Status","Ações"].map(h=>(
                    <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:12,fontWeight:600,color:"var(--text-muted)",borderBottom:"1px solid var(--gray-200)",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {lancMes.map(l=>(
                    <tr key={l.id} style={{borderBottom:"1px solid var(--gray-100)"}}>
                      <td style={{padding:"10px 16px",whiteSpace:"nowrap"}}>{l.data?new Date(l.data+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</td>
                      <td style={{padding:"10px 16px"}}>{l.pacienteNome||getPacNome(l.pacienteId)}</td>
                      <td style={{padding:"10px 16px"}}>
                        {l.tipo}
                        {l.tipo_lancamento==="pacote"&&<span style={{marginLeft:6,background:"var(--purple-soft)",color:"var(--purple)",borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:600}}>Pacote</span>}
                      </td>
                      <td style={{padding:"10px 16px"}}><span style={{background:"#f3f4f6",borderRadius:6,padding:"2px 8px",fontSize:11}}>{l.formaPag||"—"}</span></td>
                      <td style={{padding:"10px 16px",fontWeight:700,color:l.status==="recebido"?"#059669":l.status==="pendente"?"#d97706":"#9ca3af"}}>
                        {(parseFloat(l.valor)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                      </td>
                      <td style={{padding:"10px 16px"}}>
                        <span style={{background:l.status==="recebido"?"#d1fae5":"#fef3c7",color:l.status==="recebido"?"#065f46":"#b45309",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>
                          {l.status==="recebido"?"✓ Recebido":"Pendente"}
                        </span>
                      </td>
                      <td style={{padding:"10px 16px"}}>
                        <div style={{display:"flex",gap:4}}>
                          {l.tipo_lancamento==="pacote"?(
                            <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11,color:"var(--purple)"}}
                              onClick={()=>{setPacoteSelecionado(l.pacoteId);setAba("pacotes");}}>
                              <Icon name="clipboard-list" size={13}/>
                            </button>
                          ):(
                            <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11,color:"var(--purple)"}} onClick={()=>abrirEditar(l)}>
                              <Icon name="pencil" size={13}/>
                            </button>
                          )}
                          <button className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11,color:"#dc2626"}} onClick={()=>excluirLanc(l.id)}>
                            <Icon name="trash-2" size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{background:"var(--gray-50)"}}>
                  <td colSpan={4} style={{padding:"10px 16px",fontWeight:700}}>Total recebido no mês</td>
                  <td style={{padding:"10px 16px",fontWeight:800,color:"#059669",fontSize:15}}>{totalRecebidoMes.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
                  <td colSpan={2}/>
                </tr></tfoot>
              </table>
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
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {pacotes.map(p=>{
                const sessPac=sessoes.filter(s=>s.pacoteId===p.id);
                const realizadas=sessPac.filter(s=>s.status==="realizado").length;
                const pagas=sessPac.filter(s=>s.pagamento==="pago").length;
                const pct=Math.round((realizadas/(p.totalSessoes||1))*100);
                const lancPac=lancamentos.find(l=>l.pacoteId===p.id);
                return(
                  <div key={p.id} className="card" style={{padding:"16px 20px"}}>
                    <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:44,height:44,borderRadius:12,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📦</div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:15}}>{p.pacienteNome}</span>
                          <span style={{background:lancPac?.status==="recebido"?"#d1fae5":"#fef3c7",color:lancPac?.status==="recebido"?"#065f46":"#b45309",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{lancPac?.status==="recebido"?"✓ Pago":"Pagamento Pendente"}</span>
                        </div>
                        <div style={{fontSize:12,color:"var(--text-muted)",display:"flex",gap:12,flexWrap:"wrap",marginBottom:8}}>
                          <span>📅 {p.recorrencia}</span>
                          <span>🕐 {p.horario}</span>
                          <span>📋 {realizadas}/{p.totalSessoes} sessões</span>
                          <span style={{color:"#059669",fontWeight:600}}>{(p.valorTotal||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
                        </div>
                        <div style={{background:"#e5e7eb",borderRadius:20,height:5}}>
                          <div style={{background:"var(--purple)",height:5,borderRadius:20,width:pct+"%",transition:"width .3s"}}/>
                        </div>
                        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:3}}>{pct}% concluído</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:12,borderTop:"1px solid var(--gray-100)",paddingTop:12}}>
                      <button className="btn btn-purple" style={{fontSize:12}} onClick={()=>setPacoteSelecionado(p.pacienteId)}>
                        <Icon name="clipboard-list" size={13}/> Controle de Sessões e Frequência
                      </button>
                      <button className="btn btn-ghost" style={{fontSize:12,color:"#dc2626",marginLeft:"auto"}} onClick={async()=>{
                        if(!confirm(`Excluir pacote de ${p.pacienteNome}? Isso remove todas as sessões e o lançamento.`))return;
                        const todas=sessoes.filter(s=>s.pacoteId===p.id);
                        const b=db.batch();
                        todas.forEach(s=>b.delete(db.collection("clinica_sessoes").doc(s.id)));
                        b.delete(db.collection("clinica_pacotes").doc(p.id));
                        const lp=lancamentos.find(l=>l.pacoteId===p.id);
                        if(lp) b.delete(db.collection("clinica_lancamentos").doc(lp.id));
                        await b.commit();
                      }}>
                        <Icon name="trash-2" size={13}/> Excluir Pacote
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
              <div className="form-group" style={{gridColumn:"1/-1"}}><label className="form-label">Paciente</label>
                <select className="form-input" value={formAvulso.pacienteId} onChange={e=>setFormAvulso({...formAvulso,pacienteId:e.target.value})}>
                  <option value="">Selecionar...</option>{pacientes.filter(p=>p.status==="ativo").map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Tipo</label>
                <select className="form-input" value={formAvulso.tipo} onChange={e=>setFormAvulso({...formAvulso,tipo:e.target.value})}>
                  {["Consulta","Avaliação","Musicoterapia","Neuromodulação","Orientação","Outro"].map(t=><option key={t}>{t}</option>)}
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
              <button className="btn btn-purple" onClick={salvarAvulso} disabled={salvando}><Icon name="save" size={15}/> {salvando?"Salvando...":editando?"Salvar Alterações":"Lançar"}</button>
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
              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
                <button className="btn btn-purple" onClick={salvarPacote} disabled={salvando}><Icon name="package" size={15}/> {salvando?"Criando...":"Criar Pacote"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

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
      tipo:form.tipo, titulo:form.tipo+" — "+(pac?.nome||""),
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
    const unsub = db.collection("clinica_sessoes").orderBy("data").onSnapshot(snap=>{
      setSessoes(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
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
    } else {
      await db.collection("clinica_sessoes").add({...dados, createdAt:firebase.firestore.FieldValue.serverTimestamp()});
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

      {/* Grade semanal */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:24}}>
        {dias.map((dia,i)=>{
          const isHoje = formatData(dia)===formatData(hoje);
          const sessDia = sessoesNoDia(dia);
          const isPassado = dia < hoje;
          return (
            <div key={i} style={{minHeight:120,background:isHoje?"var(--purple-soft)":"white",border:"1.5px solid",borderColor:isHoje?"var(--purple)":"var(--gray-200)",borderRadius:12,overflow:"hidden"}}>
              {/* Cabeçalho do dia */}
              <div style={{padding:"8px 8px 6px",borderBottom:"1px solid",borderColor:isHoje?"var(--purple)20":"var(--gray-100)",background:isHoje?"var(--purple)":"transparent",textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:600,color:isHoje?"white":isPassado?"#9ca3af":"var(--gray-600)",textTransform:"uppercase"}}>{DIAS_SEMANA[i]}</div>
                <div style={{fontSize:18,fontWeight:800,color:isHoje?"white":isPassado?"#9ca3af":"var(--gray-800)"}}>{dia.getDate()}</div>
              </div>
              {/* Sessões do dia */}
              <div style={{padding:4,display:"flex",flexDirection:"column",gap:3}}>
                {sessDia.map(s=>{
                  const st = STATUS_CONFIG[s.status]||STATUS_CONFIG.agendado;
                  return (
                    <div key={s.id} onClick={()=>abrirEditar(s)}
                      style={{background:st.bg,borderLeft:"3px solid "+st.cor,borderRadius:4,padding:"3px 5px",cursor:"pointer",fontSize:10,lineHeight:1.3}}>
                      <div style={{fontWeight:700,color:st.cor}}>{s.hora}</div>
                      <div style={{color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.pacienteNome?.split(" ")[0]||"—"}</div>
                      <div style={{color:"#6b7280",fontSize:9}}>{s.tipo}</div>
                    </div>
                  );
                })}
                {/* Adicionar */}
                <button onClick={()=>{setForm({pacienteId:"",data:formatData(dia),hora:"09:00",duracao:"50",tipo:"Psicoterapia",status:"agendado",obs:""});setEditando(null);setModal(true);}}
                  style={{background:"none",border:"1px dashed #d1d5db",borderRadius:4,padding:"4px",cursor:"pointer",color:"#9ca3af",fontSize:11,width:"100%",marginTop:2}}>
                  + 
                </button>
              </div>
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
        {user.tipo==="psicologa"  &&tab==="agenda"      &&<Agenda/>}
        {user.tipo==="psicologa"  &&tab==="fin-clinica" &&<FinanceiroClinica/>}
        {user.tipo==="psicologa"  &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={false}/>}
        {user.tipo==="psicologa"  &&tab==="config"      &&<Configuracoes/>}
        {user.tipo==="secretaria" &&tab==="pacientes"   &&<Pacientes user={user}/>}
        {user.tipo==="secretaria" &&tab==="agenda"      &&<Agenda/>}
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
