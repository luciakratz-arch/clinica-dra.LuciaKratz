// ═══════════════════════════════════════════════════════
//  ÁREA ADMINISTRATIVA — DRA. LUCIA KRATZ
//  app.js — Psicóloga + Secretária + Paulo Sérgio
// ═══════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useRef } = React;

// ─── FIREBASE CONFIG ────────────────────────────────────
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

// ─── CONSTANTES ─────────────────────────────────────────
const LOGO_URL = "../logo.png";
const SENHA_ADMIN = "1234";
const SENHA_PAULO = "paulo123";

// ─── PERFIS ─────────────────────────────────────────────
const PERFIS = [
  { id: "psicologa",  nome: "Sou Psicóloga",    desc: "Acesso ao painel clínico completo",     icon: "stethoscope", cor: "#7B00C4" },
  { id: "secretaria", nome: "Sou Secretária",    desc: "Cadastro de pacientes e financeiro da clínica", icon: "clipboard-list", cor: "#0891b2" },
  { id: "paulo",      nome: "Paulo Sérgio",      desc: "Visualização do financeiro familiar",   icon: "bar-chart-2", cor: "#16a34a" },
];

// ─── HOOKS ──────────────────────────────────────────────
function useCollection(col, orderField = "createdAt") {
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
      setData(docs);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [col]);
  return { data, loading };
}

// ─── ICON ───────────────────────────────────────────────
function Icon({ name, size = 18 }) {
  const ref = useRef(null);
  useEffect(() => {
    try {
      if (!ref.current || !window.lucide) return;
      ref.current.innerHTML = "";
      const iconName = name.replace(/-([a-z])/g, (_, l) => l.toUpperCase()).replace(/^./, s => s.toUpperCase());
      const iconFn = lucide[iconName];
      if (!iconFn) return;
      const icon = lucide.createElement(iconFn);
      if (icon) {
        icon.setAttribute("width", size);
        icon.setAttribute("height", size);
        icon.setAttribute("stroke-width", "1.8");
        ref.current.appendChild(icon);
      }
    } catch(e) {}
  }, [name, size]);
  return <span ref={ref} style={{ display:"inline-flex", alignItems:"center" }} />;
}

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

function EmBreve({ titulo, subtitulo }) {
  return (
    <div className="em-breve">
      <Icon name="wrench" size={48} />
      <div className="em-breve-title">{titulo}</div>
      <div className="em-breve-sub">{subtitulo || "Módulo em construção."}</div>
    </div>
  );
}

// ─── LOGIN ───────────────────────────────────────────────
function Login({ onLogin }) {
  const [etapa, setEtapa] = useState("perfil");
  const [senha, setSenha] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [perfilSel, setPerfilSel] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      if (perfilSel === "psicologa") {
        if (senha === SENHA_ADMIN) onLogin({ tipo: "psicologa", nome: "Dra. Lucia Kratz", crp: "CRP 09/20590" });
        else setErro("Senha incorreta.");
      } else if (perfilSel === "paulo") {
        if (senha === SENHA_PAULO) onLogin({ tipo: "paulo", nome: "Paulo Sérgio" });
        else setErro("Senha incorreta.");
      } else if (perfilSel === "secretaria") {
        const snap = await db.collection("clinica_secretarias").where("email", "==", email.toLowerCase().trim()).get();
        if (snap.empty) { setErro("Usuário não encontrado."); setLoading(false); return; }
        const sec = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (sec.senha !== senha) { setErro("Senha incorreta."); setLoading(false); return; }
        onLogin({ tipo: "secretaria", ...sec });
      }
    } catch(e) { setErro("Erro ao conectar."); }
    setLoading(false);
  }

  const perfil = PERFIS.find(p => p.id === perfilSel);

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo">
          <img src={LOGO_URL} alt="LK" onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="block"; }} />
          <span className="login-logo-placeholder" style={{display:"none"}}>LK</span>
        </div>
        <div className="login-name">Dra. Lucia Kratz</div>
        <div className="login-subtitle">Sistema Administrativo</div>
        <div className="login-crp">Psicóloga Doutora · CRP 09/20590</div>
        <div className="login-left-btns">
          {PERFIS.map(p => (
            <button key={p.id} onClick={() => { setPerfilSel(p.id); setEtapa("senha"); setErro(""); setSenha(""); setEmail(""); }}>
              {p.nome.replace("Sou ","")}
            </button>
          ))}
        </div>
      </div>

      <div className="login-right">
        {etapa === "perfil" && (
          <>
            <div style={{width:"100%"}}>
              <div className="login-right-title">Área Administrativa</div>
              <div className="login-right-sub">Selecione seu perfil de acesso.</div>
            </div>
            <div className="profile-cards">
              {PERFIS.map(p => (
                <button key={p.id} className="profile-card" onClick={() => { setPerfilSel(p.id); setEtapa("senha"); setErro(""); }}>
                  <div className="profile-card-icon" style={{background: p.cor}}>
                    <Icon name={p.icon} size={22} />
                  </div>
                  <div className="profile-card-text">
                    <div className="profile-card-name">{p.nome}</div>
                    <div className="profile-card-desc">{p.desc}</div>
                  </div>
                  <div className="profile-card-arrow"><Icon name="chevron-right" size={18} /></div>
                </button>
              ))}
            </div>
            <div className="login-footer">
              <a href="../" style={{color:"var(--gray-400)", fontSize:12}}>← Voltar ao site</a>
            </div>
          </>
        )}

        {etapa === "senha" && perfil && (
          <>
            <button className="login-right-back" onClick={() => { setEtapa("perfil"); setErro(""); }}>
              <Icon name="arrow-left" size={14} /> Voltar
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
                  <input className="form-input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoFocus />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" value={senha}
                  onChange={e => setSenha(e.target.value)} placeholder="••••••••"
                  autoFocus={perfilSel !== "secretaria"} />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── NAV POR PERFIL ──────────────────────────────────────
const NAV_PSICOLOGA = [
  { id: "dashboard",   label: "Dashboard",            icon: "layout-dashboard" },
  { id: "pacientes",   label: "Pacientes",             icon: "users" },
  { id: "alunos",      label: "Alunos",                icon: "graduation-cap" },
  { id: "casais",      label: "Terapia de Casais",     icon: "heart" },
  { id: "recursos",    label: "Recursos Terapêuticos", icon: "tool" },
  { id: "laudos",      label: "Laudos",                icon: "file-text" },
  { id: "agenda",      label: "Agenda",                icon: "calendar" },
  { id: "fin-clinica", label: "Financeiro Clínica",    icon: "dollar-sign" },
  { id: "fin-pessoal", label: "Financeiro Pessoal",    icon: "home" },
  { id: "config",      label: "Configurações",         icon: "settings" },
];

const NAV_SECRETARIA = [
  { id: "pacientes",   label: "Pacientes",             icon: "users" },
  { id: "agenda",      label: "Agenda",                icon: "calendar" },
  { id: "fin-clinica", label: "Financeiro Clínica",    icon: "dollar-sign" },
];

const NAV_PAULO = [
  { id: "fin-pessoal", label: "Financeiro Familiar",   icon: "home" },
];

// ─── SIDEBAR ─────────────────────────────────────────────
function Sidebar({ user, tab, setTab, onLogout }) {
  const nav = user.tipo === "secretaria" ? NAV_SECRETARIA :
              user.tipo === "paulo"      ? NAV_PAULO      : NAV_PSICOLOGA;
  const titulo = user.tipo === "secretaria" ? "Área da Secretária" :
                 user.tipo === "paulo"      ? "Financeiro Familiar" : "Área Administrativa";
  const initials = (user.nome || "U").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="sidebar-desktop">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={LOGO_URL} alt="LK" onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="block"; }} />
          <span className="sidebar-logo-placeholder" style={{display:"none"}}>LK</span>
        </div>
        <div>
          <div className="sidebar-title">Dra. Lucia Kratz</div>
          <div className="sidebar-role">{titulo}</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {nav.map(item => (
          <button key={item.id}
            className={`nav-item ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}>
            <Icon name={item.icon} size={18} />
            {item.label}
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
          <Icon name="globe" size={18} /> Site
        </a>
        <button className="nav-item nav-item-danger" onClick={onLogout}>
          <Icon name="log-out" size={18} /> Sair
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD PSICÓLOGA ─────────────────────────────────
function DashboardAdmin({ user }) {
  const { data: pacientes } = useCollection("clinica_pacientes");
  const { data: sessoes }   = useCollection("clinica_sessoes");
  const ativos = pacientes.filter(p => p.status === "ativo").length;
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard Clínico</div>
        <div className="page-subtitle" style={{textTransform:"capitalize"}}>{hoje}</div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon"><Icon name="users" size={20} /></div>
          <div className="metric-label">Total de Pacientes</div>
          <div className="metric-value">{pacientes.length}</div>
          <div className="metric-sub">{ativos} ativos</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="calendar" size={20} /></div>
          <div className="metric-label">Sessões este Mês</div>
          <div className="metric-value">{sessoes.length}</div>
          <div className="metric-sub">total registrado</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="file-text" size={20} /></div>
          <div className="metric-label">Laudos</div>
          <div className="metric-value">0</div>
          <div className="metric-sub">em rascunho</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="heart" size={20} /></div>
          <div className="metric-label">Humor Médio</div>
          <div className="metric-value">—</div>
          <div className="metric-sub">média geral</div>
        </div>
      </div>
      <div className="card">
        <div style={{fontWeight:600, marginBottom:12}}>Bem-vinda, {user.nome} 🦋</div>
        <p style={{fontSize:14, color:"var(--text-muted)", lineHeight:1.7}}>
          Sistema administrativo em construção. Os módulos são liberados progressivamente.
        </p>
        <div style={{marginTop:20, display:"flex", gap:12, flexWrap:"wrap"}}>
          <a href="../clinica/" style={{fontSize:13, color:"var(--purple)", display:"flex", alignItems:"center", gap:6}}>
            <Icon name="external-link" size={14} /> Portal do Paciente
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── PACIENTES ───────────────────────────────────────────
function Pacientes({ user }) {
  const { data: pacientes, loading } = useCollection("clinica_pacientes", "nome");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  const filtrados = pacientes.filter(p => {
    const ok = filtro === "todos" || p.status === filtro;
    const bk = !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()) || p.email?.toLowerCase().includes(busca.toLowerCase());
    return ok && bk;
  });

  function abrirNovo() {
    setForm({ nome:"", email:"", telefone:"", status:"ativo", genero:"", dataNasc:"", cpf:"", objetivos:"" });
    setModal("novo");
  }

  function abrirEditar(p) {
    setForm({ ...p });
    setModal("editar");
  }

  async function salvar() {
    if (!form.nome || !form.email) { alert("Nome e e-mail obrigatórios."); return; }
    setSalvando(true);
    try {
      if (modal === "novo") {
        await db.collection("clinica_pacientes").add({
          ...form, senha: "1234", createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const { id, ...dados } = form;
        await db.collection("clinica_pacientes").doc(id).update(dados);
      }
      setModal(null);
    } catch(e) { alert("Erro ao salvar."); }
    setSalvando(false);
  }

  async function excluir(id) {
    if (!confirm("Excluir paciente?")) return;
    await db.collection("clinica_pacientes").doc(id).delete();
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="page-header" style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Pacientes</div>
          <div className="page-subtitle">{pacientes.filter(p=>p.status==="ativo").length} ativos · {pacientes.filter(p=>p.status==="alta").length} com alta · {pacientes.filter(p=>p.status==="inativo").length} inativos</div>
        </div>
        <button className="btn btn-purple" onClick={abrirNovo}>
          <Icon name="user-plus" size={16} /> Novo Paciente
        </button>
      </div>

      {/* Busca e filtros */}
      <div style={{display:"flex", gap:12, marginBottom:20, flexWrap:"wrap"}}>
        <input className="form-input" style={{flex:1, minWidth:200}}
          placeholder="Buscar por nome ou e-mail..."
          value={busca} onChange={e => setBusca(e.target.value)} />
        {["todos","ativo","alta","inativo"].map(f => (
          <button key={f} className={`btn ${filtro===f?"btn-purple":"btn-ghost"}`}
            onClick={() => setFiltro(f)}>
            {f === "todos" ? "Todos" : f === "ativo" ? "Em atendimento" : f === "alta" ? "Alta" : "Inativos"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="card" style={{padding:0}}>
        {filtrados.length === 0 ? (
          <div style={{padding:40, textAlign:"center", color:"var(--text-muted)"}}>Nenhum paciente encontrado.</div>
        ) : filtrados.map(p => (
          <div key={p.id} style={{
            display:"flex", alignItems:"center", gap:14,
            padding:"14px 20px", borderBottom:"1px solid var(--gray-100)",
            cursor:"pointer", transition:"background .15s"
          }} onClick={() => abrirEditar(p)}
            onMouseEnter={e => e.currentTarget.style.background="#fafafa"}
            onMouseLeave={e => e.currentTarget.style.background="white"}>
            <div style={{
              width:38, height:38, borderRadius:"50%",
              background:"var(--purple-soft)", display:"flex",
              alignItems:"center", justifyContent:"center",
              fontWeight:600, color:"var(--purple)", flexShrink:0
            }}>{(p.nome||"?")[0].toUpperCase()}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:500}}>{p.nome}</div>
              <div style={{fontSize:13, color:"var(--text-muted)"}}>{p.email}</div>
            </div>
            <span className={`badge ${p.status==="ativo"?"badge-green":p.status==="alta"?"badge-gray":"badge-red"}`}>
              {p.status === "ativo" ? "Ativo" : p.status === "alta" ? "Alta" : "Inativo"}
            </span>
            <button className="btn btn-ghost" style={{padding:"6px 10px"}}
              onClick={e => { e.stopPropagation(); excluir(p.id); }}>
              <Icon name="trash-2" size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:500, padding:20
        }} onClick={() => setModal(null)}>
          <div style={{
            background:"white", borderRadius:16, padding:28,
            width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto"
          }} onClick={e => e.stopPropagation()}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)", fontSize:20, fontWeight:600}}>
                {modal === "novo" ? "Novo Paciente" : "Editar Paciente"}
              </div>
              <button onClick={() => setModal(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)"}}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
              {[
                {label:"Nome completo", key:"nome", col:2},
                {label:"E-mail", key:"email", type:"email"},
                {label:"Telefone", key:"telefone"},
                {label:"Data de Nascimento", key:"dataNasc", type:"date"},
                {label:"CPF", key:"cpf"},
              ].map(({label, key, type="text", col}) => (
                <div key={key} className="form-group" style={col ? {gridColumn:`span ${col}`} : {}}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" type={type} value={form[key]||""}
                    onChange={e => setForm({...form, [key]: e.target.value})} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Gênero</label>
                <select className="form-input" value={form.genero||""} onChange={e => setForm({...form, genero:e.target.value})}>
                  <option value="">Selecione</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Não-binário">Não-binário</option>
                  <option value="Não informar">Não informar</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status||"ativo"} onChange={e => setForm({...form, status:e.target.value})}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className="form-group" style={{gridColumn:"span 2"}}>
                <label className="form-label">Objetivos Terapêuticos</label>
                <textarea className="form-input" rows={3} value={form.objetivos||""}
                  onChange={e => setForm({...form, objetivos:e.target.value})}
                  placeholder="Descreva os objetivos da terapia..." />
              </div>
            </div>
            <div style={{display:"flex", gap:10, marginTop:20, justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FINANCEIRO CLÍNICA ──────────────────────────────────
function FinanceiroClinica() {
  const { data: pacientes } = useCollection("clinica_pacientes", "nome");
  const [lancamentos, setLancamentos] = useState([]);
  const [form, setForm] = useState({ pacienteId:"", tipo:"consulta", valor:"", data: new Date().toISOString().slice(0,10), obs:"", status:"recebido" });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const unsub = db.collection("clinica_financeiro_clinica")
      .orderBy("data", "desc")
      .onSnapshot(snap => {
        setLancamentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, () => {});
    return unsub;
  }, []);

  const totalMes = lancamentos.filter(l => {
    const d = new Date(l.data);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear() && l.status === "recebido";
  }).reduce((a, l) => a + (parseFloat(l.valor)||0), 0);

  const totalPendente = lancamentos.filter(l => l.status === "pendente")
    .reduce((a, l) => a + (parseFloat(l.valor)||0), 0);

  async function salvarLancamento() {
    if (!form.valor || !form.data) { alert("Valor e data obrigatórios."); return; }
    setSalvando(true);
    try {
      await db.collection("clinica_financeiro_clinica").add({
        ...form, valor: parseFloat(form.valor),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setForm({ pacienteId:"", tipo:"consulta", valor:"", data: new Date().toISOString().slice(0,10), obs:"", status:"recebido" });
    } catch(e) { alert("Erro ao salvar."); }
    setSalvando(false);
  }

  async function excluir(id) {
    if (!confirm("Excluir lançamento?")) return;
    await db.collection("clinica_financeiro_clinica").doc(id).delete();
  }

  const getPacNome = id => pacientes.find(p => p.id === id)?.nome || "—";

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Financeiro da Clínica</div>
        <div className="page-subtitle">Receitas e lançamentos das consultas</div>
      </div>

      <div className="metrics-grid" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="trending-up" size={20} /></div>
          <div className="metric-label">Recebido este Mês</div>
          <div className="metric-value" style={{color:"var(--success)"}}>
            {totalMes.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="clock" size={20} /></div>
          <div className="metric-label">Pendente</div>
          <div className="metric-value" style={{color:"#d97706"}}>
            {totalPendente.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="list" size={20} /></div>
          <div className="metric-label">Lançamentos</div>
          <div className="metric-value">{lancamentos.length}</div>
        </div>
      </div>

      {/* Formulário de lançamento */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{fontWeight:600, marginBottom:16}}>Novo Lançamento</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12}}>
          <div className="form-group">
            <label className="form-label">Paciente</label>
            <select className="form-input" value={form.pacienteId} onChange={e => setForm({...form, pacienteId:e.target.value})}>
              <option value="">Selecione...</option>
              {pacientes.filter(p=>p.status==="ativo").map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select className="form-input" value={form.tipo} onChange={e => setForm({...form, tipo:e.target.value})}>
              <option value="consulta">Consulta</option>
              <option value="avaliacao">Avaliação</option>
              <option value="musicoterapia">Musicoterapia</option>
              <option value="neuromodulacao">Neuromodulação</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Valor R$</label>
            <input className="form-input" type="number" placeholder="250.00"
              value={form.valor} onChange={e => setForm({...form, valor:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input className="form-input" type="date" value={form.data}
              onChange={e => setForm({...form, data:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
              <option value="recebido">Recebido</option>
              <option value="pendente">Pendente</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Obs</label>
            <input className="form-input" placeholder="Opcional..."
              value={form.obs} onChange={e => setForm({...form, obs:e.target.value})} />
          </div>
        </div>
        <button className="btn btn-purple" style={{marginTop:12}} onClick={salvarLancamento} disabled={salvando}>
          <Icon name="plus" size={16} /> {salvando ? "Salvando..." : "Lançar"}
        </button>
      </div>

      {/* Lista */}
      <div className="card" style={{padding:0}}>
        <div style={{padding:"14px 20px", fontWeight:600, borderBottom:"1px solid var(--gray-100)"}}>
          Histórico de Lançamentos
        </div>
        {lancamentos.length === 0 ? (
          <div style={{padding:40, textAlign:"center", color:"var(--text-muted)"}}>Nenhum lançamento ainda.</div>
        ) : lancamentos.map(l => (
          <div key={l.id} style={{display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:"1px solid var(--gray-100)"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:500}}>{getPacNome(l.pacienteId)} · {l.tipo}</div>
              <div style={{fontSize:13, color:"var(--text-muted)"}}>{l.data}{l.obs ? ` · ${l.obs}` : ""}</div>
            </div>
            <div style={{fontWeight:600, fontSize:16, color: l.status==="recebido" ? "var(--success)" : l.status==="pendente" ? "#d97706" : "var(--gray-400)"}}>
              {parseFloat(l.valor||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
            </div>
            <span className={`badge ${l.status==="recebido"?"badge-green":l.status==="pendente"?"badge-purple":"badge-gray"}`}>
              {l.status}
            </span>
            <button className="btn btn-ghost" style={{padding:"6px 10px"}} onClick={() => excluir(l.id)}>
              <Icon name="trash-2" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FINANCEIRO PESSOAL (Lucia + Paulo) ──────────────────
function FinanceiroPessoal({ somenteLeitura = false }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Financeiro Familiar</div>
        <div className="page-subtitle">
          {somenteLeitura ? "Visualização — Paulo Sérgio" : "Gestão financeira pessoal e familiar"}
        </div>
      </div>
      <div className="card">
        <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}>
          <Icon name="home" size={24} />
          <div style={{fontWeight:600}}>Módulo Financeiro Pessoal</div>
          {somenteLeitura && <span className="badge badge-purple">Somente visualização</span>}
        </div>
        <p style={{fontSize:14, color:"var(--text-muted)", lineHeight:1.7}}>
          O sistema de gestão financeira pessoal está sendo integrado nesta área.
          Em breve você poderá acompanhar receitas, despesas, fluxo de caixa e dívidas.
        </p>
        <div style={{marginTop:16, padding:16, background:"var(--purple-bg)", borderRadius:"var(--radius)", fontSize:13, color:"var(--gray-600)"}}>
          💡 O sistema financeiro completo (com fluxo mensal, anual, gráficos e dívidas) será integrado na próxima etapa.
        </div>
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ───────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(null);

  function handleLogin(u) {
    setUser(u);
    if (u.tipo === "psicologa")  setTab("dashboard");
    if (u.tipo === "secretaria") setTab("pacientes");
    if (u.tipo === "paulo")      setTab("fin-pessoal");
  }

  function handleLogout() { setUser(null); setTab(null); }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} />

      <div className="header-mobile">
        <div className="header-mobile-logo">Administração</div>
        <button className="header-mobile-btn" onClick={handleLogout}>
          <Icon name="log-out" size={18} />
        </button>
      </div>

      <div className="main-content">
        {/* PSICÓLOGA */}
        {user.tipo === "psicologa" && tab === "dashboard"   && <DashboardAdmin user={user} />}
        {user.tipo === "psicologa" && tab === "pacientes"   && <Pacientes user={user} />}
        {user.tipo === "psicologa" && tab === "alunos"      && <EmBreve titulo="Alunos em Supervisão" subtitulo="Etapa 6" />}
        {user.tipo === "psicologa" && tab === "casais"      && <EmBreve titulo="Terapia de Casais" subtitulo="Etapa 7" />}
        {user.tipo === "psicologa" && tab === "recursos"    && <EmBreve titulo="Recursos Terapêuticos" subtitulo="Etapa 8" />}
        {user.tipo === "psicologa" && tab === "laudos"      && <EmBreve titulo="Laudos" subtitulo="Etapa 10" />}
        {user.tipo === "psicologa" && tab === "agenda"      && <EmBreve titulo="Agenda" subtitulo="Etapa 11" />}
        {user.tipo === "psicologa" && tab === "fin-clinica" && <FinanceiroClinica />}
        {user.tipo === "psicologa" && tab === "fin-pessoal" && <FinanceiroPessoal somenteLeitura={false} />}
        {user.tipo === "psicologa" && tab === "config"      && <EmBreve titulo="Configurações" subtitulo="Etapa 12" />}

        {/* SECRETÁRIA */}
        {user.tipo === "secretaria" && tab === "pacientes"   && <Pacientes user={user} />}
        {user.tipo === "secretaria" && tab === "agenda"      && <EmBreve titulo="Agenda" subtitulo="Etapa 11" />}
        {user.tipo === "secretaria" && tab === "fin-clinica" && <FinanceiroClinica />}

        {/* PAULO */}
        {user.tipo === "paulo" && tab === "fin-pessoal" && <FinanceiroPessoal somenteLeitura={true} />}
      </div>

      {/* Nav Mobile */}
      <div className="nav-mobile">
        {(user.tipo === "psicologa" ? NAV_PSICOLOGA.slice(0,5) :
          user.tipo === "secretaria" ? NAV_SECRETARIA :
          NAV_PAULO).map(item => (
          <button key={item.id}
            className={`nav-mobile-item ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}>
            <Icon name={item.icon} size={20} />
            <span>{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── RENDER ──────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
