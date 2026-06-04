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

// ─── ETAPA 1: HIGIENIZAÇÃO EM LOTE ────────────────────────
// Detecta e deleta duplicatas de Maio/2026 para um paciente.
// Critério: mesmo pacienteId + mesma data + mesmo valor + mesma descrição.
// Mantém o documento que possui pacoteId preenchido (ou o mais antigo).
async function deletarDuplicatasPaciente(pacienteId, mesRef) {
  try {
    const snap = await db.collection("clinica_lancamentos")
      .where("pacienteId","==",pacienteId)
      .get();
    const docs = snap.docs
      .map(d=>({id:d.id,...d.data()}))
      .filter(d=>(d.data||"").startsWith(mesRef));

    // Agrupar por chave composta
    const grupos = {};
    docs.forEach(d=>{
      const chave = `${d.data}|${parseFloat(d.valor||0).toFixed(2)}|${(d.descricao||d.tipo||"").trim().toLowerCase()}`;
      if(!grupos[chave]) grupos[chave]=[];
      grupos[chave].push(d);
    });

    const batch = db.batch();
    let deletados = 0;
    Object.values(grupos).forEach(grupo=>{
      if(grupo.length < 2) return;
      // Prioriza manter o que tem pacoteId; senão mantém o primeiro (mais antigo por ordem de array)
      grupo.sort((a,b)=>(b.pacoteId?1:0)-(a.pacoteId?1:0));
      const manter = grupo[0];
      // Garante que o mantido tem pacoteId se algum tinha
      const comPacote = grupo.find(g=>g.pacoteId);
      if(comPacote && !manter.pacoteId){
        batch.update(db.collection("clinica_lancamentos").doc(manter.id),{pacoteId:comPacote.pacoteId});
      }
      // Deleta os redundantes
      grupo.slice(1).forEach(dup=>{
        batch.delete(db.collection("clinica_lancamentos").doc(dup.id));
        deletados++;
      });
    });
    await batch.commit();
    return { ok:true, deletados };
  } catch(e) {
    return { ok:false, erro:e.message };
  }
}

// Categoriza lançamentos "Sem Nome" de um mês como Despesas Administrativas.
async function categorizarSemNome(mesRef) {
  try {
    const snap = await db.collection("clinica_lancamentos").get();
    const semNome = snap.docs.filter(d=>{
      const dado = d.data();
      const nome = (dado.pacienteNome||dado.nomePaciente||"").trim();
      return (!nome || nome==="") && (dado.data||"").startsWith(mesRef);
    });
    if(semNome.length===0) return { ok:true, atualizados:0 };
    const batch = db.batch();
    semNome.forEach(d=>{
      batch.update(d.ref,{
        pacienteNome:"— Clínica —",
        categoria:"Despesas Administrativas/Clínica",
        tipo_lancamento:"despesa",
        _auditoria:"categorizado_automatico_"+mesRef,
      });
    });
    await batch.commit();
    return { ok:true, atualizados:semNome.length };
  } catch(e) {
    return { ok:false, erro:e.message };
  }
}

// Deleta lançamentos tipo "sessao" que pertencem a pacotes (órfãos gerados por atualizarPagamento).
// Regra: se tem pacoteId + tipo_lancamento==sessao → é lixo, o pacote já cobre.
async function deletarLancamentosOrfaosDeSessao() {
  try {
    const snap = await db.collection("clinica_lancamentos")
      .where("tipo_lancamento","==","sessao").get();
    const orfaos = snap.docs.filter(d=>{
      const dado = d.data();
      return !!dado.pacoteId; // tem pacoteId = pertence a pacote = é duplicata
    });
    if(orfaos.length===0) return { ok:true, deletados:0 };
    // Firestore batch suporta até 500 operações
    const batches = [];
    let b = db.batch();
    orfaos.forEach((d,i)=>{
      b.delete(d.ref);
      if((i+1)%499===0){ batches.push(b); b=db.batch(); }
    });
    batches.push(b);
    await Promise.all(batches.map(bt=>bt.commit()));
    return { ok:true, deletados:orfaos.length };
  } catch(e) {
    return { ok:false, erro:e.message };
  }
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
  { id:"humor",  nome:"Check-in Diário",      desc:"Registro de humor e bem-estar diário" },
  { id:"metas",  nome:"Metas Terapêuticas",   desc:"Acompanhamento de metas" },
  { id:"diario", nome:"Diário Terapêutico",   desc:"Escrita reflexiva livre" },
  // Pensamentos Automáticos e Reflexões Cognitivas → Módulo III (Ansiedade e Controle dos Pensamentos)
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
  const [modalSugestao, setModalSugestao] = useState(null); // {ferramenta, categoria, sugestoes}
  const [sugestoesSel, setSugestoesSel] = useState({});

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
    const estaAtiva = !!ferrAtual[ferrId];

    // Se está desativando, só remove — sem sugestão
    if(estaAtiva){
      const novaFerr = { ...ferrAtual };
      delete novaFerr[ferrId];
      salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: novaFerr } });
      return;
    }

    // Ativando — primeiro salva a ferramenta
    const novaFerr = { ...ferrAtual, [ferrId]: { ativo: true, dataInicio: hoje } };
    salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: novaFerr } });

    // Busca categoria da ferramenta para sugestões
    const rec = recursos.find(r=>r.id===ferrId);
    const catFerr = rec?.categoria || "";
    const macroId = FAB_LEGADO_MACRO[catFerr] || catFerr;
    if(!macroId || !macroId.startsWith("macro_")) return; // sem sugestões para cats sem macro

    // Busca fábulas e psicoeducações da mesma macrocategoria não ativadas
    const ferrAtivadas = new Set(Object.keys(novaFerr));
    const fabSugest = fabulas.filter(f=>
      (FAB_LEGADO_MACRO[f.categoria||""]===macroId || f.categoria===macroId) &&
      !ferrAtivadas.has(f.id)
    ).slice(0,3);
    const psicoSugest = psicoeducacao.filter(p=>
      (PSICO_LEGADO_MACRO[p.categoria||""]===macroId || p.categoria===macroId) &&
      !ferrAtivadas.has(p.id)
    ).slice(0,3);

    if(fabSugest.length===0 && psicoSugest.length===0) return;

    const macro = MACROCATEGORIAS.find(m=>m.id===macroId);
    setModalSugestao({
      ferramenta: rec?.titulo || ferrId,
      categoria: macro?.label || macroId,
      cor: macro?.cor || "#7B00C4",
      bg: macro?.bg || "#f3e6ff",
      icone: macro?.icone || "🔧",
      modId,
      fabulas: fabSugest,
      psicoeducacao: psicoSugest,
    });
    setSugestoesSel({});
  }

  async function ativarSugestoes(){
    if(!modalSugestao) return;
    const hoje = new Date().toISOString().split("T")[0];
    const modAtual = config[modalSugestao.modId] || { ativo:true, ferramentas:{} };
    const ferrAtual = { ...modAtual.ferramentas };
    // Ativa fábulas selecionadas no mod2
    const modFab = config["mod2"] || { ativo:true, ferramentas:{} };
    const ferrFab = { ...modFab.ferramentas };
    // Ativa psico selecionadas no mod6
    const modPsico = config["mod6"] || { ativo:true, ferramentas:{} };
    const ferrPsico = { ...modPsico.ferramentas };

    Object.entries(sugestoesSel).forEach(([id, sel])=>{
      if(!sel) return;
      const isFab = modalSugestao.fabulas.some(f=>f.id===id);
      const isPsico = modalSugestao.psicoeducacao.some(p=>p.id===id);
      if(isFab) ferrFab[id] = { ativo:true, dataInicio: hoje };
      if(isPsico) ferrPsico[id] = { ativo:true, dataInicio: hoje };
    });

    await db.collection("clinica_pacientes").doc(paciente.id).update({
      modulosConfig: {
        ...config,
        mod2: { ...modFab, ativo:true, ferramentas: ferrFab },
        mod6: { ...modPsico, ativo:true, ferramentas: ferrPsico },
      },
      modulosAtivos: [...new Set([...Object.keys(config).filter(k=>config[k]?.ativo), "mod2", "mod6"])],
    });
    setConfig(c=>({
      ...c,
      mod2: { ...modFab, ativo:true, ferramentas: ferrFab },
      mod6: { ...modPsico, ativo:true, ferramentas: ferrPsico },
    }));
    setModalSugestao(null);
  }

  function setDataInicio(modId, ferrId, data) {
    const modAtual = config[modId] || { ativo: true, ferramentas: {} };
    const ferrAtual = modAtual.ferramentas || {};
    salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: { ...ferrAtual, [ferrId]: { ...(ferrAtual[ferrId]||{}), dataInicio: data } } } });
  }

  const MODULOS_DEF = [
    { id:"mod1", nome:"Módulo I — Dashboard", desc:"Ferramentas do dia a dia", icone:"🧠", ferramentas: FERRAMENTAS_MOD1 },
    { id:"mod2", nome:"Módulo II — Fábulas Terapêuticas", desc:"Fábulas cadastradas em Recursos", icone:"📖", ferramentas: fabulas.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.macroCategoria||f.categoria||"", cat:f.macroCategoria||f.categoria||""})) },
    { id:"mod3", nome:"Módulo III — Ferramentas", desc:"Ferramentas cadastradas em Recursos", icone:"🔧", ferramentas: recursos.filter(r=>r.categoria!=="musicoterapia"&&r.categoria!=="casal").map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.macroCategoria||f.categoria||"", cat:f.macroCategoria||f.categoria||""})) },
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
      ferramentas: psicoeducacao.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.macroCategoria||f.categoria||"", cat:f.macroCategoria||f.categoria||""})) },
  ];

  // Módulos que agrupam por macrocategoria
  const MODS_COM_GRUPO = new Set(["mod2","mod3","mod6"]);

  // Mapa categoria → macrocategoria para agrupamento
  const CAT_PARA_MACRO_MOD = {
    // Ferramentas (mod3)
    ansiedade_diaria:"macro_ansiedade", distorcoes:"macro_ansiedade",
    crencas_esquemas:"macro_ansiedade", autocritica:"macro_ansiedade", procrastinacao:"macro_ansiedade",
    tcc:"macro_ansiedade", ansiedade:"macro_ansiedade", esquema:"macro_ansiedade",
    depressao:"macro_humor", desamor:"macro_humor", regulacao_emocional:"macro_humor",
    burnout:"macro_humor", vergonha:"macro_humor", emocoes:"macro_humor",
    rotina:"macro_habitos", sono:"macro_habitos", motivacao:"macro_habitos",
    neuroplasticidade:"macro_habitos", praticas_autocuidado:"macro_habitos", autocuidado:"macro_habitos",
    comunicacao:"macro_relacionamentos", dependencia:"macro_relacionamentos",
    limites:"macro_relacionamentos", ciumes:"macro_relacionamentos", toxicos:"macro_relacionamentos",
    relacionamentos:"macro_relacionamentos",
    conflitos_casal:"macro_casais", sexualidade:"macro_casais",
    parentalidade:"macro_casais", conflitos_familia:"macro_casais", traicao:"macro_casais",
    alimentacao:"macro_corpo", autoimagem:"macro_corpo", nervovago:"macro_corpo",
    sintomas_fisicos:"macro_corpo", saude_mental:"macro_corpo", corpo:"macro_corpo",
    musicoterapia:"macro_musico",
    avaliacao:"macro_aval",
    // Fábulas (mod2) — por tema
    resiliencia:"macro_habitos", esperanca:"macro_humor", autoconfianca:"macro_humor",
    autoconhecimento:"macro_ansiedade", perspectiva:"macro_habitos",
    mindfulness:"macro_habitos", ansiedade_fab:"macro_ansiedade",
    // Categorias adicionais de fábulas
    "resiliência":"macro_habitos", "esperança":"macro_humor",
    "autoconfiança":"macro_humor", "autoestima":"macro_humor",
    "expressão emocional":"macro_humor", "regulação emocional":"macro_humor",
    "perdão":"macro_humor", "crescimento":"macro_habitos",
    "autoconhecimento":"macro_ansiedade", "perspectiva":"macro_habitos",
    "mindfulness":"macro_habitos", "criatividade":"macro_habitos",
    "proposito":"macro_habitos", "propósito":"macro_habitos",
    // Psicoeducação (mod6) — igual ferramentas
  };

  // Mapa macroId → info visual
  const MACRO_INFO = {
    macro_ansiedade:      {icone:"🧠", label:"Ansiedade e Controle dos Pensamentos", cor:"#7B00C4", bg:"#f3e6ff"},
    macro_humor:          {icone:"❤️", label:"Humor e Regulação Emocional",          cor:"#db2777", bg:"#fce7f3"},
    macro_habitos:        {icone:"🌱", label:"Hábitos e Autocuidado",                cor:"#16a34a", bg:"#dcfce7"},
    macro_relacionamentos:{icone:"🤝", label:"Conflitos Interpessoais e Relacionamentos", cor:"#0891b2", bg:"#e0f2fe"},
    macro_casais:         {icone:"💑", label:"Casais, Família e Parentalidade",      cor:"#d97706", bg:"#fef3c7"},
    macro_corpo:          {icone:"🏃", label:"Corpo, Saúde e Conexão Somática",      cor:"#059669", bg:"#d1fae5"},
    macro_musico:         {icone:"🎵", label:"Musicoterapia",                        cor:"#7B00C4", bg:"#f3e6ff"},
    macro_aval:           {icone:"📋", label:"Avaliação e Anamnese",                 cor:"#6366f1", bg:"#e0e7ff"},
    _outros:              {icone:"🔧", label:"Outros",                               cor:"#6b7280", bg:"#f3f4f6"},
  };

  // Mapa nome da ferramenta → macro (para itens com categoria "outro")
  const NOME_PARA_MACRO = {
    "Mapa de Intensidade": "macro_corpo",
    "Roda da Vida Integral": "macro_habitos",
    "Protocolo dos 3 Mapas": "macro_relacionamentos",
    "Diário de Parentalidade Compassiva": "macro_casais",
    "Diário de Autocompaixão": "macro_humor",
    "Plano de Ativação Comportamental": "macro_humor",
    "Prática de Presença": "macro_corpo",
    "Empilhamento de Hábitos": "macro_habitos",
    "Protocolo de Regulação Nervosa": "macro_corpo",
    "Mapeamento do Ciclo de Conflito": "macro_relacionamentos",
    "Análise em Cadeia": "macro_ansiedade",
    "Registo CNV": "macro_relacionamentos",
    "Registro CNV": "macro_relacionamentos",
    "Mapa de Triangulação": "macro_casais",
    "Kit SOS Emocional": "macro_humor",
    "Mapa de Limites Pessoais": "macro_relacionamentos",
    "Ritual de Descompressão Noturna": "macro_habitos",
    "Pausa Estratégica": "macro_humor",
    "Mapa da Bateria": "macro_habitos",
    "Mapa de Diferenciação": "macro_relacionamentos",
    "Diário Corpo-Mente": "macro_corpo",
    "Escuta Ativa": "macro_relacionamentos",
    "Regra dos 5 Minutos": "macro_habitos",
    "Inventário de Carga Mental": "macro_relacionamentos",
    "Árvore da Decisão": "macro_ansiedade",
  };

  function agruparPorMacro(ferramentas) {
    const grupos = {};
    ferramentas.forEach(f => {
      const raw = f.desc || f.cat || "";
      let macroId;
      // 1. Já é macro_* direto
      if (MACRO_INFO[raw]) {
        macroId = raw;
      // 2. É "outro" ou vazio — tentar pelo nome
      } else if (!raw || raw === "outro" || raw === "outros") {
        // Busca parcial no nome
        const nomeLower = (f.nome||"").toLowerCase();
        const encontrado = Object.entries(NOME_PARA_MACRO).find(([k])=>nomeLower.includes(k.toLowerCase()));
        macroId = encontrado ? encontrado[1] : "_outros";
      // 3. Mapear categoria técnica
      } else {
        macroId = CAT_PARA_MACRO_MOD[raw] || CAT_PARA_MACRO_MOD[f.cat] || "_outros";
      }
      if (!grupos[macroId]) grupos[macroId] = [];
      grupos[macroId].push(f);
    });
    return Object.entries(MACRO_INFO)
      .filter(([id]) => grupos[id]?.length > 0)
      .map(([id, info]) => ({ id, ...info, itens: grupos[id] }));
  }

  const [gruposAbertos, setGruposAbertos] = useState({});
  function toggleGrupo(modId, grupoId) {
    const key = modId+"_"+grupoId;
    setGruposAbertos(g => ({...g, [key]: !g[key]}));
  }

  function renderFerramenta(ferr, modId, ferramentas) {
    const ferrConfig = ferramentas[ferr.id];
    const ferrAtiva = !!ferrConfig;
    return (
      <div key={ferr.id} style={{background:"white",borderRadius:10,
        border:`1.5px solid ${ferrAtiva?"var(--purple)":"var(--gray-200)"}`,
        padding:"12px 16px",display:"flex",alignItems:"center",gap:12,transition:"border-color .2s"}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:500,fontSize:13}}>{ferr.nome}</div>
          {ferr.desc && <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{ferr.desc}</div>}
        </div>
        {ferrAtiva && (
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <label style={{fontSize:11,color:"var(--text-muted)"}}>Início:</label>
            <input type="date" value={ferrConfig.dataInicio||""} onChange={e=>setDataInicio(modId,ferr.id,e.target.value)}
              style={{fontSize:12,border:"1px solid var(--gray-200)",borderRadius:6,padding:"3px 6px",fontFamily:"var(--font-body)"}}/>
          </div>
        )}
        <Toggle ativo={ferrAtiva} onClick={()=>toggleFerramenta(modId,ferr.id)}/>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {MODULOS_DEF.map(mod => {
        const modConfig = config[mod.id] || {};
        const ativo = !!modConfig.ativo;
        const ferramentas = modConfig.ferramentas || {};
        const usaGrupo = MODS_COM_GRUPO.has(mod.id);
        return (
          <div key={mod.id} style={{background:"white",borderRadius:14,border:`2px solid ${ativo?"var(--purple)":"var(--gray-200)"}`,overflow:"hidden",transition:"border-color .2s"}}>
            {/* Cabeçalho */}
            <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:ativo?"var(--purple-bg)":"white"}}>
              <div style={{fontSize:24}}>{mod.icone}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:"var(--text)"}}>{mod.nome}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{mod.desc}</div>
              </div>
              {mod.automatico
                ? <span style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic"}}>automático</span>
                : <Toggle ativo={ativo} onClick={()=>toggleModulo(mod.id)}/>}
            </div>

            {/* Ferramentas */}
            {ativo && !mod.automatico && (
              <div style={{borderTop:"1px solid var(--gray-100)",padding:"12px 20px",background:"#fafafa"}}>
                {mod.ferramentas.length === 0 ? (
                  <div style={{fontSize:13,color:"var(--text-muted)",padding:"8px 0"}}>
                    Nenhuma ferramenta cadastrada neste módulo ainda.
                  </div>
                ) : usaGrupo ? (
                  // ── Agrupado por macrocategoria ──
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {agruparPorMacro(mod.ferramentas).map(grupo => {
                      const key = mod.id+"_"+grupo.id;
                      const aberto = !!gruposAbertos[key]; // fechado por padrão
                      const ativosNoGrupo = grupo.itens.filter(f=>!!ferramentas[f.id]).length;
                      return (
                        <div key={grupo.id} style={{borderRadius:10,border:`1.5px solid ${grupo.cor}30`,overflow:"hidden"}}>
                          {/* Header do grupo */}
                          <div onClick={()=>toggleGrupo(mod.id,grupo.id)}
                            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                              background:grupo.bg,cursor:"pointer",userSelect:"none"}}>
                            <span style={{fontSize:16}}>{grupo.icone}</span>
                            <span style={{fontWeight:700,fontSize:12,color:grupo.cor,flex:1}}>
                              {grupo.label}
                            </span>
                            {ativosNoGrupo>0 && (
                              <span style={{background:grupo.cor,color:"white",borderRadius:20,
                                padding:"2px 8px",fontSize:11,fontWeight:700}}>
                                {ativosNoGrupo} ativo{ativosNoGrupo!==1?"s":""}
                              </span>
                            )}
                            <span style={{fontSize:11,color:grupo.cor,marginLeft:4}}>
                              {aberto?"▲":"▼"} {grupo.itens.length}
                            </span>
                          </div>
                          {/* Itens do grupo */}
                          {aberto && (
                            <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:8,background:"white"}}>
                              {grupo.itens.map(ferr => renderFerramenta(ferr, mod.id, ferramentas))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // ── Lista simples (mod1, mod4, mod5) ──
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>FERRAMENTAS DISPONÍVEIS</div>
                    {mod.ferramentas.map(ferr => renderFerramenta(ferr, mod.id, ferramentas))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    {/* Modal de sugestões */}
    {modalSugestao&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,
        display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:520,
          maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
          <div style={{background:`linear-gradient(135deg,${modalSugestao.cor},${modalSugestao.cor}cc)`,
            borderRadius:"16px 16px 0 0",padding:"18px 24px",color:"white"}}>
            <div style={{fontSize:11,opacity:0.85,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"}}>
              {modalSugestao.icone} {modalSugestao.categoria}
            </div>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,marginBottom:4}}>
              ✨ Sugestões para complementar
            </div>
            <div style={{fontSize:13,opacity:0.9}}>
              Você ativou <b>{modalSugestao.ferramenta}</b>. Selecione fábulas e psicoeducações da mesma temática.
            </div>
          </div>
          <div style={{padding:"20px 24px"}}>
            {modalSugestao.fabulas.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--purple)",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="book-open" size={15}/> Fábulas Terapêuticas
                </div>
                {modalSugestao.fabulas.map(f=>(
                  <label key={f.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",marginBottom:6,
                    background:sugestoesSel[f.id]?"var(--purple-soft)":"#fafafa",
                    border:`1.5px solid ${sugestoesSel[f.id]?"var(--purple)":"var(--gray-200)"}`,transition:"all .15s"}}>
                    <input type="checkbox" checked={!!sugestoesSel[f.id]}
                      onChange={e=>setSugestoesSel(s=>({...s,[f.id]:e.target.checked}))}
                      style={{marginTop:2,accentColor:"var(--purple)",flexShrink:0}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{f.titulo||f.nome}</div>
                      {f.moral&&<div style={{fontSize:11,color:"var(--text-muted)",marginTop:2,fontStyle:"italic"}}>"{f.moral}"</div>}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {modalSugestao.psicoeducacao.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--purple)",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="brain" size={15}/> Psicoeducação
                </div>
                {modalSugestao.psicoeducacao.map(p=>(
                  <label key={p.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",marginBottom:6,
                    background:sugestoesSel[p.id]?"var(--purple-soft)":"#fafafa",
                    border:`1.5px solid ${sugestoesSel[p.id]?"var(--purple)":"var(--gray-200)"}`,transition:"all .15s"}}>
                    <input type="checkbox" checked={!!sugestoesSel[p.id]}
                      onChange={e=>setSugestoesSel(s=>({...s,[p.id]:e.target.checked}))}
                      style={{marginTop:2,accentColor:"var(--purple)",flexShrink:0}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{p.titulo||p.nome}</div>
                      {p.descricao&&<div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{p.descricao.slice(0,80)}</div>}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setModalSugestao(null)}
                style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                Agora não
              </button>
              <button onClick={()=>{const algum=Object.values(sugestoesSel).some(v=>v);if(algum)ativarSugestoes();else setModalSugestao(null);}}
                style={{flex:2,padding:"10px",borderRadius:8,border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
                {Object.values(sugestoesSel).some(v=>v)?`✓ Ativar ${Object.values(sugestoesSel).filter(v=>v).length} selecionado(s)`:"Fechar sem ativar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
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
// URLs do portal do paciente para visualização de cada ferramenta
const PORTAL_URLS = {
  humor:      "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#humor",
  diario:     "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#diario",
  metas:      "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#metas",
  reflexoes:  "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#reflexoes",
  tcc:        "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#tcc",
  respiracao: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#respiracao",
  relaxamento:"https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#relaxamento",
};

function AbaModulo1({ paciente }) {
  const [dados, setDados] = useState({humor:[],diario:[],metas:[],reflexoes:[],tcc:[],respiracao:[],relaxamento:[]});
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null); // id da ferramenta em preview

  useEffect(()=>{
    const id = paciente.id;
    Promise.all([
      db.collection("clinica_humor").where("pacienteId","==",id).get(),
      db.collection("clinica_diario").where("pacienteId","==",id).get(),
      db.collection("clinica_metas").where("pacienteId","==",id).where("status","==","ativa").get(),
      db.collection("clinica_reflexoes").where("pacienteId","==",id).get(),
      db.collection("clinica_tcc").where("pacienteId","==",id).get(),
      db.collection("clinica_atividades").where("pacienteId","==",id).where("tipo","==","respiracao").get(),
      db.collection("clinica_atividades").where("pacienteId","==",id).where("tipo","==","relaxamento").get(),
    ]).then(([h,d,m,r,t,resp,relax])=>{
      setDados({
        humor:    h.docs.map(x=>({id:x.id,...x.data()})),
        diario:   d.docs.map(x=>({id:x.id,...x.data()})),
        metas:    m.docs.map(x=>({id:x.id,...x.data()})),
        reflexoes:r.docs.map(x=>({id:x.id,...x.data()})),
        tcc:      t.docs.map(x=>({id:x.id,...x.data()})),
        respiracao: resp.docs.map(x=>({id:x.id,...x.data()})),
        relaxamento:relax.docs.map(x=>({id:x.id,...x.data()})),
      });
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[paciente.id]);

  const ITENS = [
    { id:"humor",  icone:"❤️", nome:"Check-in Diário",     qtd:dados.humor.length,  ultima:dados.humor.sort((a,b)=>(b.data||"").localeCompare(a.data||""))[0]?.data },
    { id:"metas",  icone:"🎯", nome:"Metas Terapêuticas",  qtd:dados.metas.length,  ultima:null },
    { id:"diario", icone:"📔", nome:"Diário Terapêutico",  qtd:dados.diario.length, ultima:dados.diario.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))[0]?.data },
    // Pensamentos e Reflexões → Módulo III / Ansiedade e Controle dos Pensamentos
  ];

  // Descrições resumidas para o modal de preview
  const DESC = {
    humor:      "Registro diário da escala de humor do paciente.",
    diario:     "Espaço de escrita reflexiva livre, como um diário terapêutico.",
    metas:      "Metas terapêuticas com acompanhamento de progresso.",
    reflexoes:  "Exercícios de reestruturação cognitiva e insight.",
    tcc:        "Registro ABC de pensamentos automáticos — Modelo TCC.",
    respiracao: "Exercício de respiração diafragmática 4-7-8 para regulação emocional.",
    relaxamento:"Técnica de relaxamento muscular progressivo de Jacobson.",
  };

  return (
    <div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Módulo 1 — Dashboard</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>
        Ferramentas básicas do dia a dia de {paciente.nome.split(" ")[0]}
      </div>

      {loading
        ? <div style={{textAlign:"center",padding:32,color:"var(--text-muted)"}}>Carregando...</div>
        : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
            {ITENS.map(item=>(
              <div key={item.id} style={{background:"white",border:"1px solid var(--gray-100)",
                borderRadius:14,padding:18,boxShadow:"0 2px 8px rgba(123,0,196,0.05)",
                display:"flex",flexDirection:"column",gap:10}}>

                {/* Header */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:40,height:40,borderRadius:10,background:"var(--purple-soft)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {item.icone}
                  </div>
                  <div style={{fontWeight:600,fontSize:13,lineHeight:1.3}}>{item.nome}</div>
                </div>

                {/* Contagem */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:24,fontWeight:700,color:"var(--purple)"}}>{item.qtd}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"right"}}>
                    {item.qtd===0 ? "Sem registros" : `registro${item.qtd!==1?"s":""}`}
                    {item.ultima&&<div style={{marginTop:2}}>Último: {new Date(item.ultima+"T00:00:00").toLocaleDateString("pt-BR")}</div>}
                  </div>
                </div>

                {/* Botão visualizar */}
                <button onClick={()=>setPreview(item.id)}
                  style={{width:"100%",padding:"7px",borderRadius:8,border:"1px solid var(--purple)",
                    background:"white",color:"var(--purple)",cursor:"pointer",
                    fontSize:12,fontWeight:600,fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <Icon name="eye" size={13}/> Visualizar
                </button>
              </div>
            ))}
          </div>
        )
      }

      {/* Modal de preview — iframe do portal */}
      {preview&&(()=>{
        const item = ITENS.find(i=>i.id===preview);
        const TAB_MAP = {
          humor:"humor", diario:"diario", metas:"metas",
          reflexoes:"reflexoes", tcc:"tcc",
          respiracao:"ferramentas", relaxamento:"ferramentas",
        };
        const tab = TAB_MAP[preview]||"painel";
        const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/?preview=${tab}&email=${encodeURIComponent(paciente.email||"")}&senha=${encodeURIComponent(paciente.senha||"1234")}`;
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,
            display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
            onClick={()=>setPreview(null)}>
            <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:900,
              height:"85vh",display:"flex",flexDirection:"column",
              boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}
              onClick={e=>e.stopPropagation()}>

              {/* Header */}
              <div style={{background:"linear-gradient(135deg,#7B00C4,#5a0090)",
                borderRadius:"16px 16px 0 0",padding:"14px 20px",color:"white",
                display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22}}>{item?.icone}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{item?.nome}</div>
                    <div style={{fontSize:11,opacity:0.8}}>👁 Prévia — visão de {paciente.nome.split(" ")[0]}</div>
                  </div>
                </div>
                <button onClick={()=>setPreview(null)}
                  style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,
                    padding:"6px 14px",color:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                  ✕ Fechar
                </button>
              </div>

              {/* iFrame do portal */}
              <iframe
                src={`https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/`}
                style={{flex:1,border:"none",borderRadius:"0 0 16px 16px"}}
                title="Prévia do portal do paciente"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function AbaMetas({ paciente }) {
  const [metas, setMetas] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({titulo:"",categoria:"Emocional",progresso:0});

  useEffect(()=>{
    // Usa clinica_metas (coleção raiz) com pacienteId — mesma que o portal do paciente lê
    const unsub = db.collection("clinica_metas")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        setMetas(snap.docs.map(d=>({id:d.id,...d.data()})));
      },()=>{});
    return unsub;
  },[paciente.id]);

  async function salvar() {
    if(!form.titulo){alert("Titulo obrigatorio.");return;}
    await db.collection("clinica_metas").add({
      ...form,
      pacienteId: paciente.id,
      status: "ativa",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setModal(false); setForm({titulo:"",categoria:"Emocional",progresso:0});
  }
  async function excluir(id){
    if(!confirm("Excluir meta?"))return;
    await db.collection("clinica_metas").doc(id).delete();
  }
  async function atualizarProgresso(id,val){
    await db.collection("clinica_metas").doc(id).update({progresso:val});
  }

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
  const [metas, setMetas] = useState([]);
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
    // Busca metas ativas em clinica_metas (coleção raiz — mesma do portal do paciente)
    const u3 = db.collection("clinica_metas")
      .where("pacienteId","==",paciente.id)
      .where("status","==","ativa")
      .onSnapshot(snap=>setMetas(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return ()=>{ u1(); u2(); u3(); };
  },[paciente.id]);
  const media = humor.length?(humor.reduce((a,h)=>a+(h.valor||0),0)/humor.length).toFixed(1):"—";
  return (
    <div>
      <div className="metrics-grid" style={{marginBottom:20}}>
        {[{label:"Sessoes recentes",value:0,icon:"calendar"},{label:"Registros TCC",value:0,icon:"brain"},{label:"Entradas no diario",value:atividades.length,icon:"book-open"},{label:"Metas ativas",value:metas.length,icon:"target"}].map(m=>(
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
function PerfilPaciente({ paciente, onVoltar, pacientes, user }) {
  const [aba, setAba] = useState("perfil");
  const isSecretaria = user?.tipo==="secretaria";
  const ABAS = [
    {id:"perfil",   label:"Perfil",          icon:"user"},
    ...(!isSecretaria?[
      {id:"modulos",  label:"Modulos",         icon:"toggle-right"},
      {id:"modulo1",  label:"Módulo 1",        icon:"layout-grid"},
      {id:"metas",    label:"Metas",           icon:"target"},
      {id:"laudos",   label:"Laudos",          icon:"file-text"},
      {id:"evolucao", label:"Evolucao",        icon:"trending-up"},
      {id:"casal",    label:"Terapia de Casal",icon:"heart"},
    ]:[]),
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
      {aba==="modulo1"    &&<AbaModulo1     paciente={paciente}/>}
      {aba==="metas"      &&<AbaMetas       paciente={paciente}/>}
      {aba==="laudos"     &&<EmBreve titulo="Laudos" subtitulo="Etapa 10"/>}
      {aba==="evolucao"   &&<AbaEvolucao    paciente={paciente}/>}
      {aba==="casal"      &&<AbaCasal       paciente={paciente} pacientes={pacientes}/>}
    </div>
  );
}

// LISTA PACIENTES
const MOD1_PADRAO = {
  mod1: {
    ativo: true,
    ferramentas: {
      humor:  { ativo:true, dataInicio: new Date().toISOString().slice(0,10) },
      metas:  { ativo:true, dataInicio: new Date().toISOString().slice(0,10) },
      diario: { ativo:true, dataInicio: new Date().toISOString().slice(0,10) },
    }
  }
};

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
              modulosConfig: MOD1_PADRAO,
              modulosAtivos: ["mod1"],
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
    await db.collection("clinica_pacientes").add({
      ...form, senha:"1234",
      modulosConfig: MOD1_PADRAO,
      modulosAtivos: ["mod1"],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
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
            const url="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/cadastro/";
            navigator.clipboard.writeText(url).then(()=>alert("✓ Link copiado! Cole no WhatsApp ou e-mail:\n\n"+url)).catch(()=>prompt("Copie o link:",url));
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
      {["pendente","ativo","alta","inativo"].map(st=>{
        const grupo=filtrados.filter(p=>p.status===st);
        if(grupo.length===0)return null;
        return(
          <div key={st} style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:st==="ativo"?"var(--success)":st==="alta"?"var(--gray-400)":st==="pendente"?"#f59e0b":"var(--danger)"}}/>
              <div style={{fontSize:12,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.8px"}}>
                {st==="ativo"?"Em Atendimento":st==="alta"?"Alta":st==="pendente"?"⏳ Pendentes (Autocadastro)":"Inativos"} ({grupo.length})
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
    if(!novaData) return;
    try {
      await db.collection("clinica_sessoes").doc(s.id).update({
        data: novaData,
        status: "remarcado",
        remarcada: true,
        dataRemarcada: novaData,
        dataOriginal: s.dataOriginal||s.data,
      });
    } catch(e){
      console.error("Erro ao remarcar sessão:", e);
      alert("Erro ao remarcar: "+e.message);
    }
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
    // ── REGRA: sessão de PACOTE nunca gera lançamento próprio.
    // O lançamento do pacote já cobre todas as sessões filhas.
    // Lançamento individual só existe para sessões AVULSAS (sem pacoteId).
    if(pago && !s.pacoteId){
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
            {new Date(m+"-15").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"})}
          </button>
        ))}
      </div>

      {/* Accordion por mês */}
      {mesesFiltrados.map(mes=>{
        const sessMes = porMes[mes]||[];
        const mesLabel = new Date(mes+"-15").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
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
                                <div style={{fontSize:9,color:"#0891b2",marginBottom:2}}>Nova data (sem mov. financeira):</div>
                                <input type="date" defaultValue={s.dataRemarcada||""} onBlur={e=>{if(e.target.value)remarcarSessao(s,e.target.value,s._motivoRemarc||"remarcacao");}}
                                  style={{fontSize:10,border:"1px solid #0891b2",borderRadius:3,padding:"1px 4px",color:"#0891b2",width:105}}/>
                                <select defaultValue={s.motivoRemarcacao||"remarcacao"} onChange={e=>atualizarSessao(s.id,{motivoRemarcacao:e.target.value})}
                                  style={{fontSize:9,marginTop:2,border:"1px solid #cbd5e1",borderRadius:3,padding:"1px 3px",width:105,color:"#374151",cursor:"pointer"}}>
                                  <option value="remarcacao">🔄 Remarcação</option>
                                  <option value="falta">⚠️ Falta</option>
                                  <option value="compensacao">✅ Compensação</option>
                                </select>
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
  // Estado dedicado para edição de despesas
  const CATS_DESPESA = ["Aluguel","Condomínio","Marketing","Salários","Investimentos","Musicoterapia","Ferramentas de IA","Telefone/Internet","Contador","Impostos","Outros"];
  const [formDespesaEdit, setFormDespesaEdit] = useState({descricao:"",categoria:"",valor:"",data:"",formaPag:"",status:"pago",obs:""});
  // ── Painel de higienização ────────────
  const [modalAuditoria, setModalAuditoria] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [auditando, setAuditando] = useState(false);
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
  const mesAtualLabel = new Date(mesCards+"-15").toLocaleDateString("pt-BR",{month:"short"});

  // Salvar lançamento avulso — ETAPA 2: UPDATE obrigatório quando editando
  async function salvarAvulso(tipoVenda){
    if(!formAvulso.valor||!formAvulso.data){alert("Valor e data obrigatórios.");return;}
    setSalvando(true);
    try {
      const pac = pacientes.find(p=>p.id===formAvulso.pacienteId);
      const dados = {...formAvulso,valor:parseFloat(formAvulso.valor),pacienteNome:pac?.nome||""};

      if(editando){
        // ── ETAPA 2: GUARD — verifica se o contexto ainda existe antes de salvar
        const docSnap = await db.collection("clinica_lancamentos").doc(editando).get();
        if(!docSnap.exists){
          alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
          setModal(false);setEditando(null);setSalvando(false);return;
        }
        // UPDATE cirúrgico — nunca gera novo INSERT
        await db.collection("clinica_lancamentos").doc(editando).update({
          ...dados,
          _editadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Novo lançamento — INSERT legítimo
        await db.collection("clinica_lancamentos").add({
          ...dados,tipo_lancamento:"avulso",createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
        if(formAvulso.status==="pendente"){
          await dispararNotificacao({
            tipo:"pagamento_pendente",
            titulo:`Pagamento pendente — ${pac?.nome||"Paciente"}`,
            corpo:`R$ ${parseFloat(formAvulso.valor).toFixed(2).replace(".",",")} · ${formAvulso.tipo} · ${formAvulso.data?.split("-").reverse().join("/")||""}`,
            pacienteId: formAvulso.pacienteId
          });
        }
        if(tipoVenda) await registrarComissao({ tipo:"Sessão Avulsa", valor:parseFloat(formAvulso.valor), pacienteNome:pac?.nome||"", tipoVenda });
      }
    } catch(e){
      alert("Erro ao salvar: "+e.message);
    }
    setModal(false);setEditando(null);setFormAvulso({pacienteId:"",tipo:"Consulta",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pendente",obs:""});setSalvando(false);
  }

  function abrirEditar(l){
    // ── ETAPA 2: bifurca entre receita e despesa
    if(l.tipo_lancamento==="despesa"){
      setFormDespesaEdit({
        descricao: l.descricao||l.tipo||"",
        categoria: l.categoria||"",
        valor:     l.valor+"",
        data:      l.data||"",
        formaPag:  l.formaPag||"",
        status:    l.status||"pago",
        obs:       l.obs||"",
      });
      setEditando(l.id);
      setModal("editar-despesa");
    } else {
      setFormAvulso({
        pacienteId: l.pacienteId||"",
        tipo:       l.tipo||"Consulta",
        valor:      l.valor+"",
        data:       l.data||"",
        formaPag:   l.formaPag||"PIX",
        status:     l.status||"pendente",
        obs:        l.obs||"",
        categoria:  l.categoria||"",
        descricao:  l.descricao||"",
      });
      setEditando(l.id);
      setModal("avulso");
    }
  }

  async function excluirLanc(id){
    if(!confirm("Excluir lançamento?"))return;
    await db.collection("clinica_lancamentos").doc(id).delete();
  }

  // ── Salvar edição de DESPESA — UPDATE obrigatório, nunca INSERT
  async function salvarDespesaEdit(){
    if(!formDespesaEdit.valor||!formDespesaEdit.data){alert("Valor e data obrigatórios.");return;}
    if(!editando){alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");return;}
    setSalvando(true);
    try {
      const docSnap = await db.collection("clinica_lancamentos").doc(editando).get();
      if(!docSnap.exists){
        alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
        setModal(false);setEditando(null);setSalvando(false);return;
      }
      await db.collection("clinica_lancamentos").doc(editando).update({
        descricao:   formDespesaEdit.descricao,
        categoria:   formDespesaEdit.categoria,
        valor:       parseFloat(formDespesaEdit.valor),
        data:        formDespesaEdit.data,
        formaPag:    formDespesaEdit.formaPag,
        status:      formDespesaEdit.status,
        obs:         formDespesaEdit.obs,
        tipo_lancamento: "despesa",
        _editadoEm:  firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch(e){ alert("Erro ao salvar: "+e.message); }
    setModal(false);setEditando(null);setSalvando(false);
  }

  // ── ETAPA 3: FONTE ÚNICA DA VERDADE ─────────────────────────────────────
  // Dar baixa em um pacote:
  //   1. Atualiza o documento do pacote (statusPag, valorPago, valorPendente)
  //   2. Marca todas as sessões filhas como pagas em batch
  //   3. Garante que existe EXATAMENTE 1 lançamento vinculado (sem criar duplicata)
  async function marcarPacotePago(pacoteId, formaPag){
    const sessPac = sessoes.filter(s=>s.pacoteId===pacoteId);
    const pacote  = pacotes.find(p=>p.id===pacoteId);
    if(!pacote) return;

    const hoje = new Date().toISOString().slice(0,10);
    const vTotal = parseFloat(pacote.valorTotal||0);
    const extras = pacote.pagamentosExtras||[];
    const totalExtras = extras.reduce((a,pg)=>a+(parseFloat(pg.valor)||0),0);
    const valorPagoFinal = totalExtras > 0 ? totalExtras : vTotal;
    const valorPendenteFinal = Math.max(0, vTotal - valorPagoFinal);

    const batch = db.batch();

    // 1. Atualiza o pacote — recalcula a matriz financeira
    batch.update(db.collection("clinica_pacotes").doc(pacoteId),{
      statusPag: "recebido",
      formaPag,
      dataPagamento: hoje,
      valorPago: valorPagoFinal,
      valorPendente: valorPendenteFinal,
      _sincronizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Atualiza todas as sessões filhas
    const valorPorSessao = sessPac.length > 0
      ? parseFloat((valorPagoFinal/sessPac.length).toFixed(2))
      : (pacote.valorSessao||0);
    sessPac.forEach(s=>{
      batch.update(db.collection("clinica_sessoes").doc(s.id),{
        pagamento:"pago",
        formaPagamento:formaPag,
        dataPagamento:hoje,
        valorPago: parseFloat(s.valorPago||0) > 0 ? s.valorPago : valorPorSessao,
        statusFinanceiro:"pago",
      });
    });

    // 3. Atualiza lançamento existente OU cria exatamente 1 novo (evita duplicata)
    const lancExistente = lancamentos.find(l=>l.pacoteId===pacoteId);
    if(lancExistente){
      batch.update(db.collection("clinica_lancamentos").doc(lancExistente.id),{
        status:"recebido",
        formaPag,
        dataPagamento:hoje,
        valor: valorPagoFinal,
        valorPendente: valorPendenteFinal,
      });
    } else {
      // Gera lançamento apenas se não existe nenhum para este pacote
      const pac = pacientes.find(p=>p.id===pacote.pacienteId);
      const mes = new Date(pacote.dataInicio+"T00:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
      const desc = `${pac?.nome||pacote.pacienteNome||"Paciente"} — Pacote ${pacote.totalSessoes||""} Sessões — ${mes.charAt(0).toUpperCase()+mes.slice(1)}`;
      batch.set(db.collection("clinica_lancamentos").doc(),{
        tipo_lancamento:"pacote", pacoteId,
        pacienteId:pacote.pacienteId, pacienteNome:pac?.nome||pacote.pacienteNome||"",
        tipo:desc, descricao:desc,
        valor:valorPagoFinal, valorPendente:valorPendenteFinal,
        data:hoje, formaPag, status:"recebido", dataPagamento:hoje,
        pagamentosExtras:extras,
        totalSessoes:pacote.totalSessoes, valorSessao:pacote.valorSessao,
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      });
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
      statusPag:formPacote.statusPag||"pendente",
      formaPag:formPacote.formaPag||"",
      dataPagamento:formPacote.dataPagamento||"",
      pagamentosExtras:formPacote.pagamentosExtras||[],
      status:"ativo",createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });

    // Cria lançamento financeiro do pacote
    const mesInicioPacote = new Date(dataInicio+"T00:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
    const nomePacote = `Pacote ${total} Sessões`;
    const descricaoLanc = `${pac?.nome||"Paciente"} — ${nomePacote} — ${mesInicioPacote.charAt(0).toUpperCase()+mesInicioPacote.slice(1)}`;
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento:"pacote",pacoteId:pacRef.id,
      pacienteId,pacienteNome:pac?.nome||"",
      tipo: descricaoLanc,
      descricao: descricaoLanc,
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
    // Social: lança comissão estagiária automaticamente
    if((formPacote.tipoAtendimento||"particular")==="social"){
      const hoje = new Date().toISOString().slice(0,10);
      const mesRef = hoje.slice(0,7);
      const vSupervisao = parseFloat(formPacote.valorSupervisaoSocial||40);
      const vEstagiaria = parseFloat(formPacote.valorEstagiariaSocial||20);
      const snapEst = await db.collection("clinica_parceiras").where("tipo","==","estagiaria").limit(1).get();
      const nomeEst = !snapEst.empty ? snapEst.docs[0].data().nome : "Estagiária";
      const batchSoc = db.batch();
      batchSoc.set(db.collection("clinica_lancamentos").doc(),{
        tipo_lancamento:"social",
        tipo:`${pac?.nome||""} — Projeto Social`,
        descricao:`${pac?.nome||""} — Projeto Social`,
        pacienteNome:pac?.nome||"",
        valor:vSupervisao, data:dataInicio, mesRef,
        formaPag:formPacote.formaPag||"PIX",
        status:formPacote.statusPag||"pendente",
        origem:"pacote-social",
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      });
      batchSoc.set(db.collection("clinica_comissoes").doc(),{
        tipo:"Social — Estagiária",
        tipoVenda:"primeira", perc:0,
        valorBase:vSupervisao, valorComissao:vEstagiaria,
        pacienteNome:pac?.nome||"",
        responsavel:nomeEst,
        mesRef, status:"pendente",
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      });
      await batchSoc.commit();
    }

    setModal(false);setFormPacote({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},statusPag:"pendente",formaPag:"",dataPagamento:"",pagamentosExtras:[],obs:"",tipoAtendimento:"particular",valorSupervisaoSocial:"40",valorEstagiariaSocial:"20"});setSalvando(false);
    alert(`✅ Pacote criado! ${datas.length} sessões geradas na agenda.`);
  }

  async function atualizarSessao(id,campos){ await db.collection("clinica_sessoes").doc(id).update(campos); }

  // ── ETAPA 3: Remarcação/Compensação ─────────────────────────────────────
  // Altera APENAS data + status. Jamais toca em valor, pagamento ou lançamentos.
  // Motivo: remarcação por falta ou compensação não gera movimentação financeira.
  async function remarcarSessao(s, novaData, motivo="remarcacao"){
    if(!novaData) return;
    try {
      await db.collection("clinica_sessoes").doc(s.id).update({
        data: novaData,
        status: "remarcado",
        remarcada: true,
        dataRemarcada: novaData,
        dataOriginal: s.dataOriginal||s.data,
        motivoRemarcacao: motivo,           // "remarcacao" | "falta" | "compensacao"
        // NÃO altera: pagamento, valorPago, valorSessao, dataPagamento, pacoteId
      });
    } catch(e){
      console.error("Erro ao remarcar sessão:", e);
      alert("Erro ao remarcar: "+e.message);
    }
  }

  async function confirmarExclusao(tipo){
    if(!modalExcluir) return;
    const {id, pacoteId, numSessao} = modalExcluir;
    try {
      if(tipo==="este"){
        await db.collection("clinica_sessoes").doc(id).delete();
      } else if(tipo==="daqui"){
        const fut = sessoes.filter(s=>s.pacoteId===pacoteId&&(s.numSessao||0)>=(numSessao||0));
        const b = db.batch();
        fut.forEach(s=>b.delete(db.collection("clinica_sessoes").doc(s.id)));
        await b.commit();
      } else {
        // Cancelar todo o pacote — exclusão em cascata via query direta (evita dados órfãos)
        const [snapSess, snapLanc] = await Promise.all([
          db.collection("clinica_sessoes").where("pacoteId","==",pacoteId).get(),
          db.collection("clinica_lancamentos").where("pacoteId","==",pacoteId).get(),
        ]);
        const b = db.batch();
        snapSess.docs.forEach(d=>b.delete(d.ref));
        snapLanc.docs.forEach(d=>b.delete(d.ref));
        b.delete(db.collection("clinica_pacotes").doc(pacoteId));
        await b.commit();
        if(typeof setPacoteSelecionado==="function") setPacoteSelecionado(null);
      }
    } catch(e){
      console.error("Erro ao excluir sessão/pacote:", e);
      alert("Erro ao excluir: " + e.message);
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

  // Função salvar edição do pacote — v2 (sync financeiro + pagamentosExtras + try/catch robusto)
  async function salvarEdicaoPacote() {
    if(!modalEditarPacote) return;
    setSalvandoEdicao(true);
    try {
      const f = formEdicaoPacote;
      const jaPago = (f.statusPag||"pendente")==="recebido";
      const novoTotalSessoes = parseInt(f.totalSessoes)||modalEditarPacote.totalSessoes;
      const novoValorSessao = parseFloat(f.valorSessao)||modalEditarPacote.valorSessao;
      const novoValorTotal = novoTotalSessoes * novoValorSessao;
      const dataPagFinal = jaPago ? (f.dataPagamento||new Date().toISOString().slice(0,10)) : "";

      // Calcula valorPago por sessão distribuindo pagamentosExtras proporcionalmente
      const extras = f.pagamentosExtras||[];
      const totalExtras = extras.reduce((a,pg)=>a+(parseFloat(pg.valor)||0),0);
      const totalPagoRef = jaPago ? (totalExtras > 0 ? totalExtras : novoValorTotal) : 0;
      const valorPagoPorSessao = novoTotalSessoes > 0
        ? parseFloat((totalPagoRef / novoTotalSessoes).toFixed(2))
        : novoValorSessao;

      // 1. Atualiza o documento do pacote
      await db.collection("clinica_pacotes").doc(modalEditarPacote.id).update({
        totalSessoes: novoTotalSessoes,
        valorSessao: novoValorSessao,
        valorTotal: novoValorTotal,
        recorrencia: f.recorrencia,
        dataInicio: f.dataInicio,
        horario: f.horario,
        statusPag: f.statusPag,
        formaPag: f.formaPag||"",
        dataPagamento: dataPagFinal,
        pagamentosExtras: extras,
        obs: f.obs||"",
      });

      // 2. Atualiza lançamento financeiro vinculado via query direta
      try {
        const snapLanc = await db.collection("clinica_lancamentos")
          .where("pacoteId","==",modalEditarPacote.id).get();
        if(!snapLanc.empty){
          const pacEd = pacientes.find(p=>p.id===(modalEditarPacote.pacienteId||""));
          const mesEd = f.dataInicio
            ? new Date(f.dataInicio+"T00:00:00").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})
            : "";
          const nomePacEd = `Pacote ${novoTotalSessoes} Sessões`;
          const descEd = pacEd
            ? `${pacEd.nome} — ${nomePacEd} — ${mesEd.charAt(0).toUpperCase()+mesEd.slice(1)}`
            : snapLanc.docs[0].data().tipo||snapLanc.docs[0].data().descricao||nomePacEd;
          await snapLanc.docs[0].ref.update({
            valor: novoValorTotal,
            totalSessoes: novoTotalSessoes,
            valorSessao: novoValorSessao,
            status: f.statusPag||"pendente",
            formaPag: f.formaPag||"",
            dataPagamento: dataPagFinal,
            pagamentosExtras: extras,
            obs: f.obs||"",
            tipo: descEd,
            descricao: descEd,
          });
        }
      } catch(eLanc){ console.warn("Aviso: lançamento não atualizado →", eLanc.message); }

      // 3. Atualiza sessões filhas em batch
      const snapSess = await db.collection("clinica_sessoes")
        .where("pacoteId","==",modalEditarPacote.id).get();
      const sessDoPacote = snapSess.docs
        .map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>(a.data||"").localeCompare(b.data||""));

      if(sessDoPacote.length > 0){
        const batch = db.batch();
        sessDoPacote.forEach((s,idx)=>{
          if(idx >= novoTotalSessoes){
            batch.delete(db.collection("clinica_sessoes").doc(s.id));
          } else {
            const campos = {
              valorSessao: novoValorSessao,
              hora: f.horario||s.hora||"",
              recorrencia: f.recorrencia||s.recorrencia||"",
            };
            if(jaPago){
              const vPagoAtual = parseFloat(s.valorPago)||0;
              campos.pagamento = "pago";
              campos.formaPagamento = f.formaPag||s.formaPagamento||"";
              campos.dataPagamento = dataPagFinal||s.dataPagamento||"";
              campos.valorPago = vPagoAtual > 0 ? vPagoAtual : valorPagoPorSessao;
            } else if(f.statusPag === "pendente" && s.pagamento === "pago"){
              campos.pagamento = "pendente";
              campos.valorPago = 0;
              campos.dataPagamento = "";
            }
            batch.update(db.collection("clinica_sessoes").doc(s.id), campos);
          }
        });
        await batch.commit();
      }

      alert("✓ Pacote atualizado! Sessões e financeiro sincronizados.");
      setModalEditarPacote(null);
    } catch(e){
      console.error("Erro salvarEdicaoPacote:", e);
      alert("Erro ao salvar pacote: " + e.message);
    }
    setSalvandoEdicao(false);
  }

  // Métricas
  const totalRecebido=lancamentos.filter(l=>l.status==="recebido").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  async function executarHigienizacao() {
    if(!confirm("⚠️ Confirmar higienização completa?\n\n• Lançamentos de sessão órfãos (de pacotes) serão deletados\n• Duplicatas de Ronei e Heitor serão removidas\n• Lançamentos Sem Nome viram Despesas Administrativas\n\nEssa ação não pode ser desfeita.")) return;
    setAuditando(true);
    const log = [];
    const mesRef = "2026-05";

    // ── PASSO 0: Maior fonte de duplicata — sessões de pacote gerando lançamento próprio
    const ro = await deletarLancamentosOrfaosDeSessao();
    log.push(`Sessões órfãs de pacote: ${ro.ok ? `${ro.deletados} lançamento(s) deletado(s)` : "Erro — "+ro.erro}`);

    // ── PASSO 1: Duplicatas por paciente
    const snapRonei  = await db.collection("clinica_pacientes").where("nome",">=","Ronei").where("nome","<=","Ronei").limit(1).get();
    const snapHeitor = await db.collection("clinica_pacientes").where("nome",">=","Heitor").where("nome","<=","Heitor").limit(1).get();

    if(!snapRonei.empty){
      const r = await deletarDuplicatasPaciente(snapRonei.docs[0].id, mesRef);
      log.push(`Ronei: ${r.ok ? `${r.deletados} duplicata(s) removida(s)` : "Erro — "+r.erro}`);
    } else { log.push("Ronei: paciente não encontrado"); }

    if(!snapHeitor.empty){
      const r = await deletarDuplicatasPaciente(snapHeitor.docs[0].id, mesRef);
      log.push(`Heitor: ${r.ok ? `${r.deletados} duplicata(s) removida(s)` : "Erro — "+r.erro}`);
    } else { log.push("Heitor: paciente não encontrado"); }

    // ── PASSO 2: Categorizar Sem Nome
    const rc = await categorizarSemNome(mesRef);
    log.push(`Sem Nome: ${rc.ok ? `${rc.atualizados} lançamento(s) categorizados` : "Erro — "+rc.erro}`);

    setAuditLog(log);
    setAuditando(false);
  }

  return(
    <div>
      {/* ── Modal Auditoria / Higienização Etapa 1 ── */}
      {modalAuditoria&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,padding:20}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:480}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,color:"#b45309"}}>🔧 Higienização — Maio/2026</h3>
              <button onClick={()=>setModalAuditoria(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20}}>✕</button>
            </div>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:20,lineHeight:1.6}}>
              Esta operação irá:<br/>
              • Deletar <b>lançamentos de sessão órfãos</b> — sessões de pacote que geraram lançamento próprio indevido<br/>
              • Remover duplicatas de <b>Ronei</b> e <b>Heitor</b><br/>
              • Categorizar <b>lançamentos Sem Nome</b> como "Despesas Administrativas/Clínica"
            </div>
            {auditLog.length > 0 && (
              <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:14,marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:12,color:"#166534",marginBottom:6}}>✅ Resultado:</div>
                {auditLog.map((l,i)=><div key={i} style={{fontSize:12,color:"#374151",marginBottom:2}}>• {l}</div>)}
              </div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModalAuditoria(false)}>Fechar</button>
              {auditLog.length===0&&(
                <button className="btn btn-purple" style={{background:"#b45309"}} onClick={executarHigienizacao} disabled={auditando}>
                  {auditando?"Executando...":"⚡ Executar Higienização"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
          <div style={{fontSize:12,color:"#0891b2",fontWeight:500,marginTop:2}}>Lançamentos ({periodoCard==="mes"?new Date(mesFiltro+"-15").toLocaleDateString("pt-BR",{month:"short"}):anoFiltro})</div>
        </div>
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid var(--gray-200)",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",flexShrink:0}}>
        {[["lancamentos","Lançamentos","dollar-sign"],["pacotes","Pacotes & Sessões","package"],["acompanhamento","Acompanhamento Geral","users"]].map(([id,lbl,ic])=>(
          <button key={id} onClick={()=>setAba(id)} style={{padding:"10px 20px",border:"none",background:"none",cursor:"pointer",fontSize:14,color:aba===id?"var(--purple)":"var(--gray-600)",borderBottom:aba===id?"2px solid var(--purple)":"2px solid transparent",fontWeight:aba===id?600:400,fontFamily:"var(--font-body)",marginBottom:-1,display:"flex",alignItems:"center",gap:6}}>
            <Icon name={ic} size={15}/>{lbl}
          </button>
        ))}
        {/* Botão de higienização — Etapa 1 */}
        <button onClick={()=>{setAuditLog([]);setModalAuditoria(true);}}
          style={{marginLeft:"auto",padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12,color:"#b45309",borderBottom:"2px solid transparent",fontWeight:500,fontFamily:"var(--font-body)",marginBottom:-1,display:"flex",alignItems:"center",gap:5,flexShrink:0}}
          title="Higienizar duplicatas e lançamentos sem nome — Maio/2026">
          <Icon name="tool" size={13}/>🔧 Higienizar
        </button>
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
                    {new Date(m+"-15").toLocaleDateString("pt-BR",{month:"long"})}
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
              <div style={{marginTop:12}}>Nenhum lançamento em {new Date(mesFiltro+"-15").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</div>
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
                            <td style={{padding:"8px 14px",maxWidth:320}}>
                              <div style={{fontWeight:500,fontSize:13,lineHeight:1.4}}>
                                {l.descricao||l.tipo||l.pacienteNome||"—"}
                              </div>
                              <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>
                                {l.tipo_lancamento==="pacote"&&<span style={{background:"var(--purple-soft)",color:"var(--purple)",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:600}}>Pacote</span>}
                                {l.tipo_lancamento==="sessao"&&<span style={{background:"#e0f2fe",color:"#0891b2",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:600}}>Sessão</span>}
                                {(l.pagamentosExtras||[]).length>0&&(
                                  <span style={{background:"#fef3c7",color:"#92400e",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:600}}>
                                    💳 {(l.pagamentosExtras||[]).length}x forma{(l.pagamentosExtras||[]).length>1?"s":""}
                                  </span>
                                )}
                              </div>
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
                                    if(!confirm("Excluir pacote e TODAS as sessões e lançamentos vinculados? Esta ação não pode ser desfeita."))return;
                                    try {
                                      const [snapSess, snapLanc] = await Promise.all([
                                        db.collection("clinica_sessoes").where("pacoteId","==",p.id).get(),
                                        db.collection("clinica_lancamentos").where("pacoteId","==",p.id).get(),
                                      ]);
                                      const b = db.batch();
                                      snapSess.docs.forEach(d=>b.delete(d.ref));
                                      snapLanc.docs.forEach(d=>b.delete(d.ref));
                                      b.delete(db.collection("clinica_pacotes").doc(p.id));
                                      await b.commit();
                                    } catch(e){
                                      alert("Erro ao excluir pacote: "+e.message);
                                    }
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
            // "Remarcado" conta como sessão válida para fins de progresso e fluxo financeiro
            const realizadas = sessPac.filter(s=>s.status==="realizado"||s.status==="remarcado").length;
            const pagas = sessPac.filter(s=>s.pagamento==="pago").length;
            // Pendentes: exclui canceladas E remarcadas (remarcado já retém valor pago)
            const pendentes = sessPac.filter(s=>s.pagamento!=="pago"&&s.status!=="cancelado"&&s.status!=="remarcado").length;
            const recebido = sessPac.filter(s=>s.pagamento==="pago").reduce((a,s)=>a+(parseFloat(s.valorPago)||parseFloat(s.valorSessao)||0),0);
            // A receber: exclui canceladas E remarcadas do fluxo de cobrança pendente
            const aReceber = sessPac.filter(s=>s.pagamento!=="pago"&&s.status!=="cancelado"&&s.status!=="remarcado").reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0);
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
            <p style={{fontSize:13,color:"#6b7280",marginBottom:24}}>Escolha o tipo de lançamento:</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button className="btn btn-outline" style={{width:"100%",padding:"20px 20px",fontSize:13,display:"flex",alignItems:"center",gap:16,textAlign:"left"}}
                onClick={()=>setModal("pacote")}>
                <span style={{fontSize:32,flexShrink:0}}>📦</span>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"var(--purple)"}}>Pacote de Sessões</div>
                  <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5,marginTop:2}}>Gera sessões recorrentes na agenda com ficha de frequência, controle de pagamento e formas mistas</div>
                </div>
              </button>
              <button className="btn btn-outline" style={{width:"100%",padding:"20px 20px",fontSize:13,display:"flex",alignItems:"center",gap:16,textAlign:"left"}}
                onClick={()=>setModal("avulso")}>
                <span style={{fontSize:32,flexShrink:0}}>💲</span>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"#059669"}}>Lançamento Avulso</div>
                  <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5,marginTop:2}}>Sessão única, avaliação, neuromodulação ou outro serviço isolado</div>
                </div>
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

      {/* MODAL EDITAR DESPESA */}
      {modal==="editar-despesa"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>{setModal(false);setEditando(null);}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,color:"#dc2626"}}>✏️ Editar Despesa</div>
              <button onClick={()=>{setModal(false);setEditando(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Descrição</label>
                <input className="form-input" placeholder="Ex: Consultório locação" value={formDespesaEdit.descricao} onChange={e=>setFormDespesaEdit({...formDespesaEdit,descricao:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={formDespesaEdit.categoria} onChange={e=>setFormDespesaEdit({...formDespesaEdit,categoria:e.target.value})}>
                  <option value="">Selecionar...</option>
                  {CATS_DESPESA.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Valor R$</label>
                <input className="form-input" type="number" placeholder="0,00" value={formDespesaEdit.valor} onChange={e=>setFormDespesaEdit({...formDespesaEdit,valor:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input className="form-input" type="date" value={formDespesaEdit.data} onChange={e=>setFormDespesaEdit({...formDespesaEdit,data:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <select className="form-input" value={formDespesaEdit.formaPag} onChange={e=>setFormDespesaEdit({...formDespesaEdit,formaPag:e.target.value})}>
                  <option value="">—</option>
                  {FORMAS.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Status</label>
                <div style={{display:"flex",gap:8}}>
                  {[["pago","✓ Pago","#059669"],["pendente","Pendente","#d97706"]].map(([v,l,c])=>(
                    <button key={v} onClick={()=>setFormDespesaEdit({...formDespesaEdit,status:v})}
                      style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid",borderColor:formDespesaEdit.status===v?c:"#e5e7eb",background:formDespesaEdit.status===v?c+"15":"white",color:formDespesaEdit.status===v?c:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Observações</label>
                <input className="form-input" placeholder="Opcional..." value={formDespesaEdit.obs} onChange={e=>setFormDespesaEdit({...formDespesaEdit,obs:e.target.value})}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>{setModal(false);setEditando(null);}}>Cancelar</button>
              <button className="btn btn-purple" style={{background:"#dc2626"}} onClick={salvarDespesaEdit} disabled={salvando}>
                <Icon name="save" size={15}/> {salvando?"Salvando...":"Salvar Alterações"}
              </button>
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
                {/* Toggle Particular / Social */}
                <div className="form-group" style={{gridColumn:"1/-1"}}>
                  <label className="form-label">Tipo de Atendimento</label>
                  <div style={{display:"flex",gap:8}}>
                    {[["particular","🏥 Particular"],["social","🌱 Social"]].map(([v,l])=>(
                      <button key={v} type="button" onClick={()=>setFormPacote({...formPacote,tipoAtendimento:v,
                        valorSessao:v==="social"?"":formPacote.valorSessao,
                        valorSupervisaoSocial:v==="social"?"40":formPacote.valorSupervisaoSocial,
                        valorEstagiariaSocial:v==="social"?"20":formPacote.valorEstagiariaSocial})}
                        style={{flex:1,padding:"9px",borderRadius:8,border:"2px solid",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,
                          borderColor:(formPacote.tipoAtendimento||"particular")===v?
                            (v==="social"?"#0d9488":"#7B00C4"):"#e5e7eb",
                          background:(formPacote.tipoAtendimento||"particular")===v?
                            (v==="social"?"#ccfbf1":"#f5f3ff"):"white",
                          color:(formPacote.tipoAtendimento||"particular")===v?
                            (v==="social"?"#0d9488":"#7B00C4"):"#6b7280"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {(formPacote.tipoAtendimento||"particular")==="social"?(
                  <>
                    <div className="form-group">
                      <label className="form-label">Valor Supervisão (R$)</label>
                      <input className="form-input" type="number" value={formPacote.valorSupervisaoSocial||"40"}
                        onChange={e=>setFormPacote({...formPacote,valorSupervisaoSocial:e.target.value})}/>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:3}}>Receita da clínica</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Valor Estagiária (R$)</label>
                      <input className="form-input" type="number" value={formPacote.valorEstagiariaSocial||"20"}
                        onChange={e=>setFormPacote({...formPacote,valorEstagiariaSocial:e.target.value})}/>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:3}}>Comissão estagiária</div>
                    </div>
                  </>
                ):(
                  <>
                    <div className="form-group"><label className="form-label">Valor por Sessão (R$)</label>
                      <input className="form-input" type="number" placeholder="Ex: 250" value={formPacote.valorSessao} onChange={e=>setFormPacote({...formPacote,valorSessao:e.target.value})}/>
                    </div>
                    <div className="form-group"><label className="form-label">Total do Pacote (R$)</label>
                      <input className="form-input" type="number" placeholder="Automático" value={formPacote.valorSessao&&formPacote.totalSessoes?(parseFloat(formPacote.valorSessao)||0)*(parseInt(formPacote.totalSessoes)||0):""} readOnly style={{background:"#f9fafb"}}/>
                    </div>
                  </>
                )}
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
    <div style={{display:"flex",minHeight:"100vh",width:"100%",overflowX:"auto"}}>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} notifProps={notifProps}/>
      <div className="header-mobile"><div className="header-mobile-logo">Administracao</div><button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button></div>
      <div className="main-content" style={{flex:1,minWidth:0,maxWidth:"100%",overflowX:"hidden"}}>
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

const NAV_MARKETING = [
  { id:"marketing-dashboard",    label:"Dashboard",   icon:"trending-up" },
  { id:"dashboard-performance",  label:"Performance", icon:"bar-chart-2" },
];

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
