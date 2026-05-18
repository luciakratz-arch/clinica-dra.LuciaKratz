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
  { id:"ferramentas", label:"Ferramentas",          icon:"wrench" },
  { id:"fabulas",     label:"Fábulas Terapêuticas", icon:"book-heart" },
  { id:"reflexoes",   label:"Reflexões Cognitivas", icon:"lightbulb" },
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
const MAPA_MODULOS = { humor:"humor", pensamentos:"tcc", diario:"diario", metas:"metas", ferramentas:"ferramentas", fabulas:"fabulas", reflexoes:"reflexoes" };

function navFiltradoPaciente(nav, user) {
  return nav.filter(item => {
    if (["painel","minha-conta","meus-laudos"].includes(item.id)) return true;
    const modulos = user.modulosAtivos || [];
    return modulos.includes(MAPA_MODULOS[item.id] || item.id);
  });
}

// ─── SIDEBAR ─────────────────────────────────────────────
function Sidebar({ user, tab, setTab, onLogout }) {
  const eCasal = user.tipo === "paciente" && !!user.casalId;
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
        <div className="sidebar-user">
          <div className="sidebar-avatar">{(user.nome||"P")[0].toUpperCase()}</div>
          <div>
            <div className="sidebar-user-name">{user.nome}</div>
            <div className="sidebar-user-crp">{user.tipo==="aluno"?"Aluno/Estagiário":eCasal?"Terapia de Casal":"Paciente"}</div>
          </div>
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
      const snap = await db.collection("clinica_alunos").where("email","==",email.toLowerCase().trim()).get();
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
            <button className="login-right-back" onClick={()=>{setEtapa("perfil");setErro("");setEmail("");setSenha("");}}>
              <Icon name="arrow-left" size={14}/> Voltar
            </button>
            <form className="login-form" onSubmit={handleLoginAluno}>
              <div>
                <div className="login-form-title">Área do Aluno</div>
                <div className="login-form-sub">Portal de supervisão clínica</div>
              </div>
              {erro && <div className="login-error">{erro}</div>}
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" autoFocus/>
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

      {/* Ferramentas habilitadas */}
      {ferramentasVisiveis.length > 0 && (
        <div className="card" style={{marginBottom:24}}>
          <div style={{fontWeight:600,fontSize:15,marginBottom:16}}>Suas ferramentas</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
            {ferramentasVisiveis.map(f=>(
              <button key={f.id} onClick={()=>setTab(f.tab)}
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:12,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--purple)";e.currentTarget.style.background="var(--purple-bg)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--gray-200)";e.currentTarget.style.background="white";}}>
                <div style={{width:44,height:44,borderRadius:12,background:f.cor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name={f.icon} size={20}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{f.label}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)"}}>{f.sub}</div>
                </div>
                <Icon name="chevron-right" size={16}/>
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
  return (
    <div>
      <div className="page-header">
        <div className="page-title">Olá, {user.nome.split(" ")[0]} 🎓</div>
        <div className="page-subtitle" style={{textTransform:"capitalize"}}>{hoje}</div>
      </div>
      <div className="metrics-grid" style={{marginBottom:24}}>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="file-bar-chart" size={20}/></div>
          <div className="metric-label">Relatórios</div>
          <div className="metric-value">0</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Icon name="stethoscope" size={20}/></div>
          <div className="metric-label">Ferramentas</div>
          <div className="metric-value">5</div>
        </div>
      </div>
      <div className="card">
        <div style={{fontWeight:600,marginBottom:8,fontSize:15}}>Portal de Supervisão Clínica</div>
        <p style={{fontSize:14,color:"var(--text-muted)",lineHeight:1.7}}>
          Aqui você terá acesso às ferramentas de supervisão, materiais de estudo e recursos para sua formação em psicologia clínica.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  APP PRINCIPAL
// ═══════════════════════════════════════════════════════
function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab]   = useState(null);

  function handleLogin(u) {
    setUser(u);
    if (u.tipo==="paciente") setTab(u.casalId?"inicio-casal":"painel");
    else if (u.tipo==="aluno") setTab("painel-aluno");
  }
  function handleLogout() { setUser(null); setTab(null); }

  if (!user) return <Login onLogin={handleLogin}/>;

  const eCasal = user.tipo==="paciente" && !!user.casalId;
  const navBase = user.tipo==="aluno"?NAV_ALUNO:eCasal?NAV_CASAL:NAV_INDIVIDUAL;
  const navMobile = (user.tipo==="paciente"&&!eCasal)
    ? navFiltradoPaciente(navBase,user).slice(0,5)
    : navBase.slice(0,5);

  return (
    <div>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout}/>

      <div className="header-mobile">
        <div className="header-mobile-logo">{eCasal?"Terapia de Casal":"Meu Espaço"}</div>
        <button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button>
      </div>

      <div className="main-content">
        {/* PACIENTE INDIVIDUAL */}
        {user.tipo==="paciente"&&!eCasal&&tab==="painel"        &&<PainelIndividual user={user} setTab={setTab}/>}
        {user.tipo==="paciente"&&!eCasal&&tab==="humor"         &&<RegistroHumor user={user}/>}
        {user.tipo==="paciente"&&!eCasal&&tab==="pensamentos"   &&<EmBreve titulo="Pensamentos Automáticos" sub="Registre e questione seus pensamentos — TCC."/>}
        {user.tipo==="paciente"&&!eCasal&&tab==="diario"        &&<EmBreve titulo="Diário Terapêutico" sub="Escreva sobre o seu dia e acompanhe sua evolução."/>}
        {user.tipo==="paciente"&&!eCasal&&tab==="metas"         &&<EmBreve titulo="Minhas Metas" sub="Defina e acompanhe seus objetivos terapêuticos."/>}
        {user.tipo==="paciente"&&!eCasal&&tab==="ferramentas"   &&<EmBreve titulo="Ferramentas Clínicas" sub="Recursos terapêuticos disponibilizados pela psicóloga."/>}
        {user.tipo==="paciente"&&!eCasal&&tab==="fabulas"       &&<EmBreve titulo="Fábulas Terapêuticas" sub="Histórias reflexivas para seu processo."/>}
        {user.tipo==="paciente"&&!eCasal&&tab==="reflexoes"     &&<EmBreve titulo="Reflexões Cognitivas" sub="Exercícios de insight e reestruturação cognitiva."/>}
        {user.tipo==="paciente"&&!eCasal&&tab==="meus-laudos"   &&<EmBreve titulo="Meus Laudos" sub="Laudos disponibilizados pela psicóloga."/>}
        {user.tipo==="paciente"&&!eCasal&&tab==="minha-conta"   &&<EmBreve titulo="Minha Conta" sub="Gerencie seus dados cadastrais."/>}

        {/* PACIENTE CASAL */}
        {user.tipo==="paciente"&&eCasal&&tab==="inicio-casal"      &&<PainelCasal user={user}/>}
        {user.tipo==="paciente"&&eCasal&&tab==="diagnostico-casal" &&<EmBreve titulo="Diagnóstico Inicial" sub="Avaliação inicial do relacionamento."/>}
        {user.tipo==="paciente"&&eCasal&&tab==="etapa1-casal"      &&<EmBreve titulo="Etapa 1 — Reconexão" sub="Exercícios de reconexão emocional."/>}
        {user.tipo==="paciente"&&eCasal&&tab==="etapa2-casal"      &&<EmBreve titulo="Etapa 2 — Identidade" sub="Construção da identidade do casal."/>}
        {user.tipo==="paciente"&&eCasal&&tab==="etapa3-casal"      &&<EmBreve titulo="Etapa 3 — Cognição" sub="Reestruturação cognitiva do relacionamento."/>}
        {user.tipo==="paciente"&&eCasal&&tab==="etapa4-casal"      &&<EmBreve titulo="Etapa 4 — Reestruturação" sub="Consolidação e plano futuro."/>}
        {user.tipo==="paciente"&&eCasal&&tab==="minha-conta"       &&<EmBreve titulo="Minha Conta" sub="Gerencie seus dados cadastrais."/>}

        {/* ALUNO */}
        {user.tipo==="aluno"&&tab==="painel-aluno"      &&<PainelAluno user={user}/>}
        {user.tipo==="aluno"&&tab==="ferramentas-aluno" &&<EmBreve titulo="Ferramentas Clínicas" sub="Recursos de supervisão."/>}
        {user.tipo==="aluno"&&tab==="relatorios-aluno"  &&<EmBreve titulo="Relatórios de Supervisão" sub="Em construção."/>}
      </div>

      <div className="nav-mobile">
        {navMobile.map(item=>(
          <button key={item.id} className={`nav-mobile-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
            <Icon name={item.icon} size={20}/>
            <span>{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
