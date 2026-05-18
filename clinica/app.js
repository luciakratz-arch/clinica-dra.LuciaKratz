// ═══════════════════════════════════════════════════════
//  PORTAL CLÍNICO — DRA. LUCIA KRATZ
//  clinica/app.js — Login: Paciente + Aluno
// ═══════════════════════════════════════════════════════

const { useState, useEffect, useCallback, useRef } = React;

// ─── FIREBASE CONFIG ─────────────────────────────────────
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

// ─── CONSTANTES ──────────────────────────────────────────
const LOGO_URL = "../logo-transparente.png";
const SITE_URL  = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";

// ─── HOOK COLLECTION ─────────────────────────────────────
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

// ─── COMPONENTES BASE ─────────────────────────────────────
function Icon({ name, size = 18 }) {
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
    } catch(e) {}
  }, [name, size]);
  return <span ref={ref} style={{ display:"inline-flex", alignItems:"center" }} />;
}

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

function EmBreve({ titulo = "Em construção", subtitulo = "Este módulo estará disponível em breve." }) {
  return (
    <div className="em-breve">
      <Icon name="wrench" size={48} />
      <div className="em-breve-title">{titulo}</div>
      <div className="em-breve-sub">{subtitulo}</div>
    </div>
  );
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────
const NAV_PACIENTE = [
  { id:"painel",      label:"Meu Painel",           icon:"layout-dashboard" },
  { id:"humor",       label:"Humor",                icon:"smile" },
  { id:"pensamentos", label:"Pensamentos",           icon:"brain" },
  { id:"diario",      label:"Diário",               icon:"book-open" },
  { id:"metas",       label:"Metas",                icon:"target" },
  { id:"ferramentas", label:"Ferramentas",           icon:"wrench" },
  { id:"fabulas",     label:"Fábulas Terapêuticas",  icon:"book-heart" },
  { id:"reflexoes",   label:"Reflexões",             icon:"lightbulb" },
  { id:"meus-laudos", label:"Meus Laudos",           icon:"file-text" },
  { id:"minha-conta", label:"Minha Conta",           icon:"user-circle" },
];

const NAV_ALUNO = [
  { id:"painel-aluno",      label:"Meu Painel",    icon:"layout-dashboard" },
  { id:"ferramentas-aluno", label:"Ferramentas",   icon:"stethoscope" },
  { id:"relatorios-aluno",  label:"Relatórios",    icon:"file-bar-chart" },
];

// ─── SIDEBAR ──────────────────────────────────────────────
function Sidebar({ user, tab, setTab, onLogout }) {
  const nav = user.tipo === "aluno" ? NAV_ALUNO : NAV_PACIENTE;
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={LOGO_URL} alt="Logo" className="sidebar-logo"
          onError={e => e.target.style.display="none"} />
        <div className="sidebar-title">Dra. Lucia Kratz</div>
        <div className="sidebar-sub">Plataforma Clínica</div>
      </div>
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {(user.nome||"U")[0].toUpperCase()}
        </div>
        <div>
          <div className="sidebar-user-name">{user.nome}</div>
          <div className="sidebar-user-crp">
            {user.tipo === "paciente" ? "Paciente" : "Aluno/Estagiário"}
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {nav.map(item => (
          <button key={item.id}
            className={`nav-item ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}>
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div style={{marginTop:"auto", padding:"0 12px", display:"flex", flexDirection:"column", gap:4}}>
        <a href={SITE_URL} className="nav-item" style={{color:"rgba(255,255,255,0.6)", textDecoration:"none"}}>
          <Icon name="arrow-left" size={18}/> Voltar ao site
        </a>
        <button className="nav-item nav-item-danger" onClick={onLogout}>
          <Icon name="log-out" size={18} /> Sair
        </button>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────
function Login({ onLogin }) {
  const [etapa, setEtapa]   = useState("perfil");
  const [email, setEmail]   = useState("");
  const [senha, setSenha]   = useState("");
  const [erro, setErro]     = useState("");
  const [loading, setLoading] = useState(false);

  const perfis = [
    { id:"paciente", nome:"Sou Paciente", desc:"Portal do paciente — ferramentas e acompanhamento", icon:"user" },
    { id:"aluno",    nome:"Sou Aluno",    desc:"Portal de supervisão clínica",                       icon:"graduation-cap" },
  ];

  async function handleLoginPaciente(e) {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      const snap = await db.collection("clinica_pacientes")
        .where("email", "==", email.toLowerCase().trim()).get();
      if (snap.empty) { setErro("Paciente não encontrado."); setLoading(false); return; }
      const pac = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (pac.senha !== senha) { setErro("Senha incorreta."); setLoading(false); return; }
      if (pac.status === "inativo") { setErro("Conta inativa. Entre em contato com a psicóloga."); setLoading(false); return; }
      onLogin({ tipo:"paciente", ...pac });
    } catch(err) { setErro("Erro ao conectar. Tente novamente."); }
    setLoading(false);
  }

  async function handleLoginAluno(e) {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      const snap = await db.collection("clinica_alunos")
        .where("email", "==", email.toLowerCase().trim()).get();
      if (snap.empty) { setErro("Aluno não encontrado."); setLoading(false); return; }
      const aluno = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (aluno.senha !== senha) { setErro("Senha incorreta."); setLoading(false); return; }
      if (aluno.status === "inativo") { setErro("Conta inativa."); setLoading(false); return; }
      onLogin({ tipo:"aluno", ...aluno });
    } catch(err) { setErro("Erro ao conectar. Tente novamente."); }
    setLoading(false);
  }

  return (
    <div className="login-page">

      {/* ── Painel esquerdo ── */}
      <div className="login-left">
        <div className="login-logo">
          <img src={LOGO_URL} alt="Lucia Kratz"
            style={{width:140, height:140, objectFit:"contain"}}
            onError={e => e.target.style.display="none"} />
        </div>
        <div className="login-name">Dra. Lucia Kratz</div>
        <div className="login-subtitle">Plataforma Clínica Neuropsicológica</div>
        <div className="login-crp">Psicóloga Doutora · CRP 09/20590</div>
        <div className="login-left-btns">
          {perfis.map(p => (
            <button key={p.id} onClick={() => { setEtapa(p.id); setErro(""); setEmail(""); setSenha(""); }}>
              {p.nome.replace("Sou ","")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Painel direito ── */}
      <div className="login-right">

        {/* Seleção de perfil */}
        {etapa === "perfil" && (
          <>
            <div style={{width:"100%"}}>
              <div className="login-right-title">Quem é você?</div>
              <div className="login-right-sub">Selecione seu perfil para acessar a área correta.</div>
            </div>
            <div className="profile-cards">
              {perfis.map(p => (
                <button key={p.id} className="profile-card"
                  onClick={() => { setEtapa(p.id); setErro(""); }}>
                  <div className="profile-card-icon">
                    <Icon name={p.icon} size={22} />
                  </div>
                  <div className="profile-card-text">
                    <div className="profile-card-name">{p.nome}</div>
                    <div className="profile-card-desc">{p.desc}</div>
                  </div>
                  <div className="profile-card-arrow">
                    <Icon name="chevron-right" size={18} />
                  </div>
                </button>
              ))}
            </div>
            <div className="login-footer" style={{display:"flex", flexDirection:"column", alignItems:"center", gap:8}}>
              <span>Plataforma protegida · Dra. Lucia Kratz · CRP 09/20590</span>
              <a href={SITE_URL} style={{color:"var(--purple)", fontSize:13, display:"flex", alignItems:"center", gap:4}}>
                ← Voltar ao site
              </a>
            </div>
          </>
        )}

        {/* Login Paciente */}
        {etapa === "paciente" && (
          <>
            <button className="login-right-back" onClick={() => { setEtapa("perfil"); setErro(""); }}>
              <Icon name="arrow-left" size={14} /> Voltar
            </button>
            <form className="login-form" onSubmit={handleLoginPaciente}>
              <div>
                <div className="login-form-title">Área do Paciente</div>
                <div className="login-form-sub">Acesse seu espaço terapêutico</div>
              </div>
              {erro && <div className="login-error">{erro}</div>}
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••" />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </>
        )}

        {/* Login Aluno */}
        {etapa === "aluno" && (
          <>
            <button className="login-right-back" onClick={() => { setEtapa("perfil"); setErro(""); }}>
              <Icon name="arrow-left" size={14} /> Voltar
            </button>
            <form className="login-form" onSubmit={handleLoginAluno}>
              <div>
                <div className="login-form-title">Área do Aluno</div>
                <div className="login-form-sub">Acesse o portal de supervisão clínica</div>
              </div>
              {erro && <div className="login-error">{erro}</div>}
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••" />
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

// ─── PAINEL PACIENTE ──────────────────────────────────────
function PainelPaciente({ user }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Olá, {user.nome} 🦋</div>
        <div className="page-subtitle">Bem-vinda ao seu espaço terapêutico</div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon"><Icon name="smile" size={20}/></div>
          <div className="metric-label">Humor de Hoje</div>
          <div className="metric-value">—</div>
          <div className="metric-sub">Registre como você está</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="target" size={20}/></div>
          <div className="metric-label">Metas Ativas</div>
          <div className="metric-value">0</div>
          <div className="metric-sub">Acompanhe seu progresso</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="book-open" size={20}/></div>
          <div className="metric-label">Entradas no Diário</div>
          <div className="metric-value">0</div>
          <div className="metric-sub">Esta semana</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="brain" size={20}/></div>
          <div className="metric-label">Pensamentos</div>
          <div className="metric-value">0</div>
          <div className="metric-sub">Registros TCC</div>
        </div>
      </div>
      <div className="card">
        <div style={{fontWeight:600, marginBottom:12, fontSize:15}}>Ferramentas disponíveis</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12}}>
          {[
            { icon:"smile",       label:"Registro de Humor",      sub:"Como você está hoje?" },
            { icon:"brain",       label:"Pensamentos Automáticos", sub:"Técnica TCC" },
            { icon:"book-open",   label:"Diário Terapêutico",      sub:"Escreva livremente" },
            { icon:"target",      label:"Minhas Metas",            sub:"Acompanhe objetivos" },
            { icon:"book-heart",  label:"Fábulas Terapêuticas",    sub:"Histórias reflexivas" },
            { icon:"lightbulb",   label:"Reflexões Cognitivas",    sub:"Exercícios de insight" },
          ].map((item, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"14px 16px", borderRadius:12,
              border:"1px solid var(--gray-200)",
              background:"var(--gray-50)", cursor:"pointer"
            }}>
              <div style={{
                width:40, height:40, borderRadius:10,
                background:"var(--purple-soft)",
                display:"flex", alignItems:"center", justifyContent:"center"
              }}>
                <Icon name={item.icon} size={20}/>
              </div>
              <div>
                <div style={{fontWeight:600, fontSize:14}}>{item.label}</div>
                <div style={{fontSize:12, color:"var(--text-muted)"}}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PAINEL ALUNO ─────────────────────────────────────────
function PainelAluno({ user }) {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Olá, {user.nome} 🎓</div>
        <div className="page-subtitle">Portal de Supervisão Clínica — Dra. Lucia Kratz</div>
      </div>
      <div className="card">
        <div style={{fontWeight:600, marginBottom:8, fontSize:15}}>Bem-vindo ao portal do aluno</div>
        <p style={{fontSize:14, color:"var(--text-muted)", lineHeight:1.7}}>
          Aqui você terá acesso às ferramentas de supervisão clínica, materiais de estudo
          e recursos para a sua formação em psicologia clínica.
        </p>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon"><Icon name="file-bar-chart" size={20}/></div>
          <div className="metric-label">Relatórios</div>
          <div className="metric-value">0</div>
          <div className="metric-sub">Em elaboração</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="stethoscope" size={20}/></div>
          <div className="metric-label">Ferramentas</div>
          <div className="metric-value">5</div>
          <div className="metric-sub">Disponíveis</div>
        </div>
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab]   = useState(null);

  function handleLogin(u) {
    setUser(u);
    if (u.tipo === "paciente") setTab("painel");
    if (u.tipo === "aluno")    setTab("painel-aluno");
  }

  function handleLogout() { setUser(null); setTab(null); }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} />

      {/* Header Mobile */}
      <div className="header-mobile">
        <div className="header-mobile-logo">Dra. Lucia Kratz</div>
        <button className="header-mobile-btn" onClick={handleLogout}>
          <Icon name="log-out" size={18} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="main-content">

        {/* PACIENTE */}
        {user.tipo === "paciente" && tab === "painel"        && <PainelPaciente user={user} />}
        {user.tipo === "paciente" && tab === "humor"         && <EmBreve titulo="Registro de Humor" subtitulo="Módulo em construção." />}
        {user.tipo === "paciente" && tab === "pensamentos"   && <EmBreve titulo="Pensamentos Automáticos" subtitulo="Módulo em construção." />}
        {user.tipo === "paciente" && tab === "diario"        && <EmBreve titulo="Diário Terapêutico" subtitulo="Módulo em construção." />}
        {user.tipo === "paciente" && tab === "metas"         && <EmBreve titulo="Minhas Metas" subtitulo="Módulo em construção." />}
        {user.tipo === "paciente" && tab === "ferramentas"   && <EmBreve titulo="Ferramentas" subtitulo="Módulo em construção." />}
        {user.tipo === "paciente" && tab === "fabulas"       && <EmBreve titulo="Fábulas Terapêuticas" subtitulo="Módulo em construção." />}
        {user.tipo === "paciente" && tab === "reflexoes"     && <EmBreve titulo="Reflexões Cognitivas" subtitulo="Módulo em construção." />}
        {user.tipo === "paciente" && tab === "meus-laudos"   && <EmBreve titulo="Meus Laudos" subtitulo="Módulo em construção." />}
        {user.tipo === "paciente" && tab === "minha-conta"   && <EmBreve titulo="Minha Conta" subtitulo="Módulo em construção." />}

        {/* ALUNO */}
        {user.tipo === "aluno" && tab === "painel-aluno"      && <PainelAluno user={user} />}
        {user.tipo === "aluno" && tab === "ferramentas-aluno" && <EmBreve titulo="Ferramentas Clínicas" subtitulo="Módulo em construção." />}
        {user.tipo === "aluno" && tab === "relatorios-aluno"  && <EmBreve titulo="Relatórios de Supervisão" subtitulo="Módulo em construção." />}

      </div>

      {/* Nav Mobile */}
      <div className="nav-mobile">
        {(user.tipo === "aluno" ? NAV_ALUNO : NAV_PACIENTE.slice(0,5)).map(item => (
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

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
