// ═══════════════════════════════════════════════════════
//  PLATAFORMA CLÍNICA — DRA. LUCIA KRATZ
//  app.js — Etapa 1: Base + Login + Navegação
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
const LOGO_URL = "https://luciakratz-arch.github.io/entrevista-inicial/logo.png";

// Senha da psicóloga (admin)
const SENHA_ADMIN = "1234";

// ─── HOOKS REUTILIZÁVEIS ────────────────────────────────
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

// ─── COMPONENTES BASE ────────────────────────────────────
function Icon({ name, size = 18 }) {
  const ref = useRef(null);
  useEffect(() => {
    try {
      if (!ref.current || !window.lucide) return;
      ref.current.innerHTML = "";
      const iconName = name
        .replace(/-([a-z])/g, (_, l) => l.toUpperCase())
        .replace(/^./, s => s.toUpperCase());
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
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
    </div>
  );
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

// ─── TELA DE LOGIN ───────────────────────────────────────
function Login({ onLogin }) {
  const [etapa, setEtapa] = useState("perfil"); // "perfil" | "psicologa" | "paciente" | "aluno"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const perfis = [
    {
      id: "paciente",
      nome: "Sou Paciente",
      desc: "Portal do paciente — ferramentas e acompanhamento",
      icon: "user"
    },
    {
      id: "aluno",
      nome: "Sou Aluno",
      desc: "Portal de supervisão clínica",
      icon: "graduation-cap"
    }
  ];

  async function handleLoginPsicologa(e) {
    e.preventDefault();
    setErro(""); setLoading(true);
    if (senha === SENHA_ADMIN) {
      onLogin({ tipo: "psicologa", nome: "Dra. Lucia Kratz", crp: "CRP 09/20590" });
    } else {
      setErro("Senha incorreta. Tente novamente.");
    }
    setLoading(false);
  }

  async function handleLoginPaciente(e) {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      const snap = await db.collection("clinica_pacientes")
        .where("email", "==", email.toLowerCase().trim())
        .get();
      if (snap.empty) { setErro("Paciente não encontrado."); setLoading(false); return; }
      const pac = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (pac.senha !== senha) { setErro("Senha incorreta."); setLoading(false); return; }
      if (pac.status === "inativo") { setErro("Conta inativa. Entre em contato com a psicóloga."); setLoading(false); return; }
      onLogin({ tipo: "paciente", ...pac });
    } catch (err) {
      setErro("Erro ao conectar. Tente novamente.");
    }
    setLoading(false);
  }

  async function handleLoginAluno(e) {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      const snap = await db.collection("clinica_alunos")
        .where("email", "==", email.toLowerCase().trim())
        .get();
      if (snap.empty) { setErro("Aluno não encontrado."); setLoading(false); return; }
      const aluno = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (aluno.senha !== senha) { setErro("Senha incorreta."); setLoading(false); return; }
      if (aluno.status === "inativo") { setErro("Conta inativa."); setLoading(false); return; }
      onLogin({ tipo: "aluno", ...aluno });
    } catch (err) {
      setErro("Erro ao conectar. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      {/* Painel esquerdo */}
      <div className="login-left">
        <div className="login-logo">
          <img src={LOGO_URL} alt="Lucia Kratz"
            onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="block"; }} />
          <span className="login-logo-placeholder" style={{display:"none"}}>LK</span>
        </div>
        <div className="login-name">Dra. Lucia Kratz</div>
        <div className="login-subtitle">Plataforma Clínica Neuropsicológica</div>
        <div className="login-crp">Psicóloga Doutora · CRP 09/20590</div>
        <div className="login-left-btns">
          {perfis.map(p => (
            <button key={p.id} onClick={() => { setEtapa(p.id); setErro(""); }}>
              {p.nome.replace("Sou ","")}
            </button>
          ))}
        </div>
      </div>

      {/* Painel direito */}
      <div className="login-right">
        {etapa === "perfil" && (
          <>
            <div style={{width:"100%"}}>
              <div className="login-right-title">Quem é você?</div>
              <div className="login-right-sub">Selecione seu perfil para acessar a área correta.</div>
            </div>
            <div className="profile-cards">
              {perfis.map(p => (
                <button key={p.id} className="profile-card" onClick={() => { setEtapa(p.id); setErro(""); }}>
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
            <div className="login-footer" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <span>Plataforma protegida · Dra. Lucia Kratz · CRP 09/20590</span>
              <a href="../" style={{color:"var(--purple)",fontSize:13,display:"flex",alignItems:"center",gap:4}}>
                ← Voltar ao site
              </a>
            </div>
          </>
        )}

        {etapa === "psicologa" && (
          <>
            <button className="login-right-back" onClick={() => { setEtapa("perfil"); setErro(""); }}>
              <Icon name="arrow-left" size={14} /> Voltar
            </button>
            <form className="login-form" onSubmit={handleLoginPsicologa}>
              <div>
                <div className="login-form-title">Área da Psicóloga</div>
                <div className="login-form-sub">Digite sua senha de acesso</div>
              </div>
              {erro && <div className="login-error">{erro}</div>}
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••" autoFocus />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </>
        )}

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

        {etapa === "aluno" && (
          <>
            <button className="login-right-back" onClick={() => { setEtapa("perfil"); setErro(""); }}>
              <Icon name="arrow-left" size={14} /> Voltar
            </button>
            <form className="login-form" onSubmit={handleLoginAluno}>
              <div>
                <div className="login-form-title">Área do Aluno</div>
                <div className="login-form-sub">Portal de supervisão clínica</div>
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

// ─── SIDEBAR PSICÓLOGA ───────────────────────────────────
const NAV_PSICOLOGA = [
  { id: "dashboard",   label: "Dashboard",           icon: "layout-dashboard" },
  { id: "pacientes",   label: "Pacientes",            icon: "users" },
  { id: "alunos",      label: "Alunos",               icon: "graduation-cap" },
  { id: "casais",      label: "Terapia de Casais",    icon: "heart" },
  { id: "recursos",    label: "Recursos Terapêuticos",icon: "tool" },
  { id: "laudos",      label: "Laudos",               icon: "file-text" },
  { id: "agenda",      label: "Agenda",               icon: "calendar" },
  { id: "config",      label: "Configurações",        icon: "settings" },
];

// ─── SIDEBAR PACIENTE ────────────────────────────────────
const NAV_PACIENTE = [
  { id: "painel",        label: "Meu Painel",           icon: "layout-dashboard" },
  { id: "humor",         label: "Registro de Humor",    icon: "heart" },
  { id: "pensamentos",   label: "Pensamentos",          icon: "brain" },
  { id: "diario",        label: "Diário Terapêutico",   icon: "book-open" },
  { id: "metas",         label: "Minhas Metas",         icon: "target" },
  { id: "ferramentas",   label: "Ferramentas",          icon: "wrench" },
  { id: "fabulas",       label: "Fábulas Terapêuticas", icon: "book" },
  { id: "reflexoes",     label: "Reflexões Cognitivas", icon: "lightbulb" },
  { id: "meus-laudos",   label: "Meus Laudos",          icon: "file-text" },
  { id: "minha-conta",   label: "Minha Conta",          icon: "user-circle" },
];

const NAV_PACIENTE_CASAL = [
  { id: "inicio-casal",      label: "Início",               icon: "heart" },
  { id: "diagnostico-casal", label: "Diagnóstico Inicial",  icon: "search" },
  { id: "etapa1-casal",      label: "Etapa 1 — Reconexão",  icon: "sprout" },
  { id: "etapa2-casal",      label: "Etapa 2 — Identidade", icon: "link" },
  { id: "etapa3-casal",      label: "Etapa 3 — Cognição",   icon: "brain" },
  { id: "etapa4-casal",      label: "Etapa 4 — Reestruturação", icon: "refresh-cw" },
  { id: "minha-conta",       label: "Minha Conta",          icon: "user-circle" },
];

// ─── SIDEBAR ALUNO ───────────────────────────────────────
const NAV_ALUNO = [
  { id: "painel-aluno",    label: "Meu Painel",    icon: "layout-dashboard" },
  { id: "ferramentas-aluno", label: "Ferramentas", icon: "wrench" },
  { id: "relatorios-aluno", label: "Relatórios",   icon: "bar-chart-2" },
];

// ─── SIDEBAR COMPONENT ──────────────────────────────────
function Sidebar({ user, tab, setTab, onLogout }) {
  let nav = NAV_PSICOLOGA;
  let titulo = "Área Administrativa";

  if (user.tipo === "paciente") {
    // Determina qual nav mostrar baseado no tipo de terapia
    const temIndividual = user.modulosAtivos && user.modulosAtivos.length > 0;
    const temCasal = !!user.casalId;

    if (temCasal && !temIndividual) {
      nav = NAV_PACIENTE_CASAL;
      titulo = "Terapia de Casal";
    } else if (temCasal && temIndividual) {
      // Mostra os dois grupos
      nav = [...NAV_PACIENTE, ...NAV_PACIENTE_CASAL];
      titulo = "Meu Espaço";
    } else {
      nav = NAV_PACIENTE;
      titulo = "Meu Espaço";
    }
  } else if (user.tipo === "aluno") {
    nav = NAV_ALUNO;
    titulo = "Supervisão Clínica";
  }

  const initials = (user.nome || "U").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="sidebar-desktop">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={LOGO_URL} alt="LK"
            onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="block"; }} />
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
            {user.email && !user.crp && <div className="sidebar-user-crp">{user.email}</div>}
          </div>
        </div>
        <a href="../" className="nav-item" style={{color:"rgba(255,255,255,0.6)"}}>
          <Icon name="arrow-left" size={18}/> Voltar ao site
        </a>
        <button className="nav-item nav-item-danger" onClick={onLogout}>
          <Icon name="log-out" size={18} /> Sair
        </button>
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
    // Tab inicial por perfil
    if (u.tipo === "psicologa") setTab("dashboard");
    else if (u.tipo === "paciente") {
      const temCasal = !!u.casalId;
      const temIndividual = u.modulosAtivos && u.modulosAtivos.length > 0;
      setTab(temCasal && !temIndividual ? "inicio-casal" : "painel");
    }
    else if (u.tipo === "aluno") setTab("painel-aluno");
  }

  function handleLogout() { setUser(null); setTab(null); }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} />

      {/* Header Mobile */}
      <div className="header-mobile">
        <div className="header-mobile-logo">Dra. Lucia Kratz</div>
        <div style={{display:"flex", gap:8}}>
          <button className="header-mobile-btn" onClick={handleLogout}>
            <Icon name="log-out" size={18} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="main-content">
        {/* PSICÓLOGA */}
        {user.tipo === "psicologa" && tab === "dashboard"  && <DashboardAdmin user={user} />}
        {user.tipo === "psicologa" && tab === "pacientes"  && <EmBreve titulo="Pacientes" subtitulo="Módulo em construção — Etapa 3" />}
        {user.tipo === "psicologa" && tab === "alunos"     && <EmBreve titulo="Alunos" subtitulo="Módulo em construção — Etapa 6" />}
        {user.tipo === "psicologa" && tab === "casais"     && <EmBreve titulo="Terapia de Casais" subtitulo="Módulo em construção — Etapa 7" />}
        {user.tipo === "psicologa" && tab === "recursos"   && <EmBreve titulo="Recursos Terapêuticos" subtitulo="Módulo em construção — Etapa 8" />}
        {user.tipo === "psicologa" && tab === "laudos"     && <EmBreve titulo="Laudos" subtitulo="Módulo em construção — Etapa 10" />}
        {user.tipo === "psicologa" && tab === "agenda"     && <EmBreve titulo="Agenda" subtitulo="Módulo em construção — Etapa 11" />}
        {user.tipo === "psicologa" && tab === "config"     && <EmBreve titulo="Configurações" subtitulo="Módulo em construção — Etapa 12" />}

        {/* PACIENTE */}
        {user.tipo === "paciente" && tab === "painel"        && <EmBreve titulo="Meu Painel" subtitulo="Em construção — Etapa 5" />}
        {user.tipo === "paciente" && tab === "humor"         && <EmBreve titulo="Registro de Humor" subtitulo="Em construção — Etapa 5" />}
        {user.tipo === "paciente" && tab === "pensamentos"   && <EmBreve titulo="Pensamentos" subtitulo="Em construção — Etapa 5" />}
        {user.tipo === "paciente" && tab === "diario"        && <EmBreve titulo="Diário Terapêutico" subtitulo="Em construção — Etapa 5" />}
        {user.tipo === "paciente" && tab === "metas"         && <EmBreve titulo="Minhas Metas" subtitulo="Em construção — Etapa 5" />}
        {user.tipo === "paciente" && tab === "ferramentas"   && <EmBreve titulo="Ferramentas" subtitulo="Em construção — Etapa 5" />}
        {user.tipo === "paciente" && tab === "fabulas"       && <EmBreve titulo="Fábulas Terapêuticas" subtitulo="Em construção — Etapa 5" />}
        {user.tipo === "paciente" && tab === "reflexoes"     && <EmBreve titulo="Reflexões Cognitivas" subtitulo="Em construção — Etapa 5" />}
        {user.tipo === "paciente" && tab === "meus-laudos"   && <EmBreve titulo="Meus Laudos" subtitulo="Em construção — Etapa 11" />}
        {user.tipo === "paciente" && tab === "minha-conta"   && <EmBreve titulo="Minha Conta" subtitulo="Em construção — Etapa 5" />}
        {user.tipo === "paciente" && tab === "inicio-casal"        && <EmBreve titulo="Terapia de Casal" subtitulo="Em construção — Etapa 7" />}
        {user.tipo === "paciente" && tab === "diagnostico-casal"   && <EmBreve titulo="Diagnóstico Inicial" subtitulo="Em construção — Etapa 7" />}
        {user.tipo === "paciente" && tab === "etapa1-casal"        && <EmBreve titulo="Etapa 1 — Reconexão" subtitulo="Em construção — Etapa 7" />}
        {user.tipo === "paciente" && tab === "etapa2-casal"        && <EmBreve titulo="Etapa 2 — Identidade" subtitulo="Em construção — Etapa 7" />}
        {user.tipo === "paciente" && tab === "etapa3-casal"        && <EmBreve titulo="Etapa 3 — Cognição" subtitulo="Em construção — Etapa 7" />}
        {user.tipo === "paciente" && tab === "etapa4-casal"        && <EmBreve titulo="Etapa 4 — Reestruturação" subtitulo="Em construção — Etapa 7" />}

        {/* ALUNO */}
        {user.tipo === "aluno" && tab === "painel-aluno"      && <EmBreve titulo="Meu Painel" subtitulo="Em construção — Etapa 6" />}
        {user.tipo === "aluno" && tab === "ferramentas-aluno" && <EmBreve titulo="Ferramentas" subtitulo="Em construção — Etapa 6" />}
        {user.tipo === "aluno" && tab === "relatorios-aluno"  && <EmBreve titulo="Relatórios" subtitulo="Em construção — Etapa 6" />}
      </div>

      {/* Nav Mobile */}
      <div className="nav-mobile">
        {(user.tipo === "psicologa" ? NAV_PSICOLOGA.slice(0,5) :
          user.tipo === "aluno" ? NAV_ALUNO :
          NAV_PACIENTE.slice(0,5)).map(item => (
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

// ─── DASHBOARD ADMIN ─────────────────────────────────────
function DashboardAdmin({ user }) {
  const { data: pacientes } = useCollection("clinica_pacientes");
  const { data: sessoes   } = useCollection("clinica_sessoes");

  const ativos   = pacientes.filter(p => p.status === "ativo").length;
  const total    = pacientes.length;
  const mesAtual = new Date().getMonth();
  const sessoesMs = sessoes.filter(s => {
    const d = s.createdAt?.seconds ? new Date(s.createdAt.seconds*1000) : null;
    return d && d.getMonth() === mesAtual;
  }).length;

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

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
          <div className="metric-value">{total}</div>
          <div className="metric-sub">{ativos} ativos</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="calendar" size={20} /></div>
          <div className="metric-label">Sessões este Mês</div>
          <div className="metric-value">{sessoesMs}</div>
          <div className="metric-sub">{sessoes.length} no total</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="file-text" size={20} /></div>
          <div className="metric-label">Laudos</div>
          <div className="metric-value">0</div>
          <div className="metric-sub">0 em rascunho</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="heart" size={20} /></div>
          <div className="metric-label">Humor Médio</div>
          <div className="metric-value">—</div>
          <div className="metric-sub">média geral</div>
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:600, marginBottom:16, fontSize:15}}>
          Bem-vinda, {user.nome} 🦋
        </div>
        <p style={{fontSize:14, color:"var(--text-muted)", lineHeight:1.7}}>
          O sistema está em construção. Os módulos serão liberados progressivamente,
          etapa por etapa, com aprovação antes de avançar.
        </p>
      </div>
    </div>
  );
}

// ─── RENDER ──────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
