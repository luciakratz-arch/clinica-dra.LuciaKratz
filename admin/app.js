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
    { id:"mod2", nome:"Módulo II — Fábulas Terapêuticas", desc:"Fábulas cadastradas em Recursos", icone:"📖", ferramentas: fabulas.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.categoria||""})) },
    { id:"mod3", nome:"Módulo III — Ferramentas", desc:"Ferramentas cadastradas em Recursos", icone:"🔧", ferramentas: recursos.filter(r=>r.categoria!=="musicoterapia"&&r.categoria!=="casal").map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.categoria||"", cat:f.categoria||""})) },
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
      ferramentas: psicoeducacao.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.categoria||"", cat:f.categoria||""})) },
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

  function agruparPorMacro(ferramentas) {
    const grupos = {};
    ferramentas.forEach(f => {
      const macroId = CAT_PARA_MACRO_MOD[f.desc] || CAT_PARA_MACRO_MOD[f.cat] || "_outros";
      if (!grupos[macroId]) grupos[macroId] = [];
      grupos[macroId].push(f);
    });
    // Ordena: macros com ferramentas primeiro, na ordem de MACRO_INFO
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
                      const aberto = gruposAbertos[key] !== false; // aberto por padrão
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
// ── Categorias originais (mantidas para compatibilidade) ──────────────────
const CATEGORIAS_LEGADO = [
  {id:"tcc",           label:"TCC",                 cor:"#7B00C4", bg:"#f3e6ff"},
  {id:"ansiedade",     label:"Ansiedade",            cor:"#7B00C4", bg:"#f3e6ff"},
  {id:"emocoes",       label:"Emoções",              cor:"#7B00C4", bg:"#f3e6ff"},
  {id:"autocuidado",   label:"Autocuidado",          cor:"#7B00C4", bg:"#f3e6ff"},
  {id:"relacionamentos",label:"Relacionamentos",     cor:"#7B00C4", bg:"#f3e6ff"},
  {id:"corpo",         label:"Corpo & Alimentação",  cor:"#7B00C4", bg:"#f3e6ff"},
  {id:"esquema",       label:"Terapia do Esquema",   cor:"#7B00C4", bg:"#f3e6ff"},
  {id:"musicoterapia", label:"Musicoterapia",        cor:"#7B00C4", bg:"#f3e6ff"},
  {id:"avaliacao",     label:"Avaliação e Anamnese", cor:"#7B00C4", bg:"#f3e6ff"},
  {id:"outro",         label:"Outros",               cor:"#7B00C4", bg:"#f3e6ff"},
];

// ── Nova taxonomia clínica por demanda ────────────────────────────────────
const MACROCATEGORIAS = [
  {
    id:"macro_ansiedade", icone:"🧠", label:"Ansiedade e Controle dos Pensamentos",
    cor:"#7B00C4", bg:"#f3e6ff",
    subs:[
      {id:"ansiedade_diaria",    label:"Ansiedade Diária e Crises"},
      {id:"distorcoes",          label:"Distorções Cognitivas e Ruminação"},
      {id:"crencas_esquemas",    label:"Crenças e Esquemas Disfuncionais"},
      {id:"autocritica",         label:"Autocrítica e Culpa"},
      {id:"procrastinacao",      label:"Procrastinação e Foco"},
    ]
  },
  {
    id:"macro_humor", icone:"❤️", label:"Humor e Regulação Emocional",
    cor:"#db2777", bg:"#fce7f3",
    subs:[
      {id:"depressao",           label:"Depressão e Desânimo"},
      {id:"desamor",             label:"Desamor, Desamparo e Desvalor"},
      {id:"regulacao_emocional", label:"Inteligência e Regulação Emocional"},
      {id:"burnout",             label:"Burnout, Estresse e Frustração"},
      {id:"vergonha",            label:"Vergonha e Insegurança"},
    ]
  },
  {
    id:"macro_habitos", icone:"🌱", label:"Hábitos e Autocuidado",
    cor:"#16a34a", bg:"#dcfce7",
    subs:[
      {id:"rotina",              label:"Rotina e Organização Diária"},
      {id:"sono",                label:"Sono e Descanso"},
      {id:"motivacao",           label:"Motivação e Zona de Conforto"},
      {id:"neuroplasticidade",   label:"Neuroplasticidade e Novos Hábitos"},
      {id:"praticas_autocuidado",label:"Práticas de Autocuidado"},
    ]
  },
  {
    id:"macro_relacionamentos", icone:"🤝", label:"Conflitos Interpessoais e Relacionamentos",
    cor:"#0891b2", bg:"#e0f2fe",
    subs:[
      {id:"comunicacao",         label:"Comunicação Assertiva"},
      {id:"dependencia",         label:"Dependência Emocional e Apego"},
      {id:"limites",             label:"Limites e Autoestima"},
      {id:"ciumes",              label:"Ciúmes e Insegurança na Relação"},
      {id:"toxicos",             label:"Relacionamentos Tóxicos e Abusivos"},
    ]
  },
  {
    id:"macro_casais", icone:"💑", label:"Casais, Família e Parentalidade",
    cor:"#d97706", bg:"#fef3c7",
    subs:[
      {id:"conflitos_casal",     label:"Conflitos e Alinhamento de Casal"},
      {id:"sexualidade",         label:"Sexualidade e Intimidade"},
      {id:"parentalidade",       label:"Parentalidade e Educação de Filhos"},
      {id:"conflitos_familia",   label:"Conflitos Familiares e Enteados"},
      {id:"traicao",             label:"Traição e Reconexão Conjugal"},
    ]
  },
  {
    id:"macro_corpo", icone:"🏃", label:"Corpo, Saúde e Conexão Somática",
    cor:"#059669", bg:"#d1fae5",
    subs:[
      {id:"alimentacao",         label:"Alimentação Emocional e Compulsão"},
      {id:"autoimagem",          label:"Autoimagem e Aceitação Corporal"},
      {id:"nervovago",           label:"Regulação do Sistema Nervoso (Nervo Vago)"},
      {id:"sintomas_fisicos",    label:"Sintomas Físicos da Ansiedade"},
      {id:"saude_mental",        label:"Integração Saúde Física e Mental"},
    ]
  },
];

// Todas as subcategorias num array plano (para selects e filtros)
const TODAS_SUBCATEGORIAS = MACROCATEGORIAS.flatMap(m=>
  m.subs.map(s=>({...s, macroId:m.id, macroLabel:m.label, macroIcone:m.icone, cor:m.cor, bg:m.bg}))
);

// Compatibilidade: CATEGORIAS_RECURSOS = legado + novas subcategorias
const CATEGORIAS_RECURSOS = [
  ...CATEGORIAS_LEGADO,
  ...TODAS_SUBCATEGORIAS,
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
  // Ciclo 4-7-8: inspirar 4s, segurar 7s, expirar 8s = 19s total
  const FASES = [
    {label:"Inspire",   dur:4,  cor:"#7B00C4", instrucao:"Inspire pelo nariz lentamente..."},
    {label:"Segure",    dur:7,  cor:"#0891b2", instrucao:"Segure o ar com calma..."},
    {label:"Expire",    dur:8,  cor:"#059669", instrucao:"Expire completamente pela boca..."},
  ];
  const TOTAL_CICLOS = 4;

  const [ativo,      setAtivo]     = useState(false);
  const [concluido,  setConcluido] = useState(false);
  const [faseIdx,    setFaseIdx]   = useState(0);
  const [progresso,  setProgresso] = useState(0); // 0-100 dentro da fase
  const [ciclo,      setCiclo]     = useState(1);
  const [tempoFase,  setTempoFase] = useState(0);
  const timerRef = useRef(null);

  const fase = FASES[faseIdx];
  const durTotal = FASES.reduce((a,f)=>a+f.dur,0); // 19s

  function iniciar(){ setAtivo(true); setConcluido(false); setFaseIdx(0); setProgresso(0); setCiclo(1); setTempoFase(0); }
  function parar(){ clearInterval(timerRef.current); setAtivo(false); setFaseIdx(0); setProgresso(0); setCiclo(1); setTempoFase(0); }

  useEffect(()=>{
    if(!ativo) return;
    timerRef.current = setInterval(()=>{
      setTempoFase(t=>{
        const novot = t + 0.1;
        const durFase = FASES[faseIdx].dur;
        if(novot >= durFase){
          // avança fase
          const proxFase = faseIdx + 1;
          if(proxFase >= FASES.length){
            // fim do ciclo
            setCiclo(c=>{
              if(c >= TOTAL_CICLOS){
                clearInterval(timerRef.current);
                setAtivo(false); setConcluido(true);
                return c;
              }
              setFaseIdx(0); setProgresso(0);
              return c+1;
            });
          } else {
            setFaseIdx(proxFase); setProgresso(0);
          }
          return 0;
        }
        setProgresso((novot/durFase)*100);
        return novot;
      });
    }, 100);
    return ()=>clearInterval(timerRef.current);
  },[ativo, faseIdx]);

  const tamanhoCirculo = ativo
    ? fase.label==="Inspire" ? 140 + progresso*0.6
    : fase.label==="Segure"  ? 200
    : 200 - progresso*0.6
    : 140;

  if(concluido) return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:64,marginBottom:16}}>✨</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"var(--purple)",marginBottom:8}}>
        Prática concluída!
      </div>
      <div style={{fontSize:14,color:"var(--text-muted)",marginBottom:32,lineHeight:1.6}}>
        {TOTAL_CICLOS} ciclos de respiração 4-7-8 concluídos.<br/>
        O seu sistema nervoso agradece. 💜
      </div>
      <button onClick={iniciar}
        style={{padding:"11px 24px",borderRadius:10,border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>
        Praticar novamente
      </button>
    </div>
  );

  return (
    <div style={{textAlign:"center",padding:"20px 0"}}>
      {!ativo ? (
        <>
          <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:"var(--text)",marginBottom:8}}>
            Técnica de Respiração 4-7-8
          </div>
          <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:32,lineHeight:1.6,maxWidth:300,margin:"0 auto 32px"}}>
            Esta técnica ativa o nervo vago e reduz a ansiedade em minutos.<br/>
            <strong>4</strong> ciclos · <strong>4</strong> inspirar · <strong>7</strong> segurar · <strong>8</strong> expirar
          </div>
          {/* Círculo estático */}
          <div style={{display:"flex",justifyContent:"center",marginBottom:32}}>
            <div style={{width:160,height:160,borderRadius:"50%",
              background:"var(--purple-soft)",border:"3px solid var(--purple)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:32,opacity:0.6}}>
              💨
            </div>
          </div>
          <button onClick={iniciar}
            style={{padding:"14px 32px",borderRadius:12,border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit"}}>
            ▶ Iniciar Prática
          </button>
        </>
      ) : (
        <>
          {/* Contador de ciclos */}
          <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:24}}>
            {Array.from({length:TOTAL_CICLOS}).map((_,i)=>(
              <div key={i} style={{width:10,height:10,borderRadius:"50%",
                background:i<ciclo?"var(--purple)":"var(--gray-200)",transition:"background .3s"}}/>
            ))}
          </div>

          {/* Círculo animado */}
          <div style={{display:"flex",justifyContent:"center",marginBottom:24}}>
            <div style={{
              width: tamanhoCirculo, height: tamanhoCirculo,
              borderRadius:"50%", background:`${fase.cor}18`,
              border:`4px solid ${fase.cor}`,
              display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",
              transition:"all 0.1s linear",
              boxShadow:`0 0 ${progresso*0.5}px ${fase.cor}40`}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:fase.cor}}>{fase.label}</div>
              <div style={{fontSize:28,fontWeight:700,color:fase.cor,marginTop:4}}>{Math.ceil(fase.dur - tempoFase)}s</div>
            </div>
          </div>

          {/* Instrução */}
          <div style={{fontSize:14,color:"var(--text-muted)",marginBottom:24,fontStyle:"italic"}}>
            {fase.instrucao}
          </div>

          {/* Barra de progresso da fase */}
          <div style={{width:"100%",maxWidth:280,margin:"0 auto 24px",background:"var(--gray-100)",borderRadius:20,height:6}}>
            <div style={{width:progresso+"%",height:"100%",borderRadius:20,background:fase.cor,transition:"width 0.1s linear"}}/>
          </div>

          <button onClick={parar}
            style={{padding:"10px 24px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
            ✕ Parar
          </button>
        </>
      )}
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
  const EMOCOES = ["Ansiedade","Tristeza","Raiva","Medo","Vergonha","Culpa","Frustração","Insegurança","Alívio","Esperança"];
  const [passo,    setPasso]    = useState(1); // 1=situação, 2=pensamento, 3=emoção, 4=resposta, 5=concluído
  const [draft,    setDraft]    = useState({situacao:"",pensamento:"",emocao:"",intensidade:60,alternativo:""});
  const [registros,setRegistros]= useState([]);
  const [verReg,   setVerReg]   = useState(null);

  function salvar(){
    if(!draft.situacao||!draft.pensamento||!draft.emocao) return;
    setRegistros(r=>[{...draft,id:Date.now()+"",data:new Date().toLocaleDateString("pt-BR")},...r]);
    setPasso(5);
  }

  function reiniciar(){
    setDraft({situacao:"",pensamento:"",emocao:"",intensidade:60,alternativo:""});
    setPasso(1);
  }

  const PASSOS_INFO = [
    {n:1,letra:"A",titulo:"Situação",subtitulo:"O que aconteceu?",cor:"#3b82f6",bg:"#dbeafe",icone:"🔍",
      dica:"Descreva a situação de forma objetiva — onde estava, com quem, o que aconteceu. Sem interpretações ainda.",
      placeholder:"Ex: Meu chefe me chamou para uma conversa inesperada..."},
    {n:2,letra:"B",titulo:"Pensamento Automático",subtitulo:"O que passou pela sua cabeça?",cor:"#7c3aed",bg:"#ede9fe",icone:"💭",
      dica:"Qual foi o primeiro pensamento que surgiu automaticamente? Escreva exatamente como veio, sem filtrar.",
      placeholder:"Ex: Devo ter cometido um erro grave. Vou ser demitido..."},
    {n:3,letra:"C",titulo:"Emoção e Intensidade",subtitulo:"O que você sentiu?",cor:"#d97706",bg:"#fef3c7",icone:"❤️",
      dica:"Nomeie a emoção principal e avalie sua intensidade. Pode haver mais de uma — escolha a mais forte."},
    {n:4,letra:"D",titulo:"Resposta Racional",subtitulo:"O que a razão diz?",cor:"#059669",bg:"#dcfce7",icone:"⚖️",
      dica:"Questione o pensamento automático. Há evidências reais? Qual seria uma forma mais equilibrada de ver essa situação?",
      placeholder:"Ex: Pode ser apenas um feedback de rotina. Não tenho evidências de que vou ser demitido..."},
  ];

  const passoInfo = PASSOS_INFO[passo-1] || PASSOS_INFO[0];
  const intCor = draft.intensidade<34?"#059669":draft.intensidade<67?"#d97706":"#dc2626";

  // ── Ver registro ─────────────────────────────────────────────────
  if(verReg) return (
    <div>
      <button onClick={()=>setVerReg(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--purple)",fontSize:13,fontWeight:600,fontFamily:"inherit",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
        ← Voltar
      </button>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>{verReg.data}</div>
      {[
        {letra:"A",cor:"#3b82f6",bg:"#dbeafe",titulo:"Situação",val:verReg.situacao},
        {letra:"B",cor:"#7c3aed",bg:"#ede9fe",titulo:"Pensamento",val:verReg.pensamento},
        {letra:"C",cor:"#d97706",bg:"#fef3c7",titulo:`Emoção: ${verReg.emocao} (${verReg.intensidade}%)`,val:null},
        {letra:"D",cor:"#059669",bg:"#dcfce7",titulo:"Resposta Racional",val:verReg.alternativo||"—"},
      ].map(c=>(
        <div key={c.letra} style={{background:c.bg,borderRadius:12,padding:"12px 16px",marginBottom:10,borderLeft:`4px solid ${c.cor}`}}>
          <div style={{fontWeight:700,fontSize:11,color:c.cor,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>{c.letra} — {c.titulo}</div>
          {c.val&&<div style={{fontSize:13,color:"#374151",lineHeight:1.6}}>{c.val}</div>}
        </div>
      ))}
    </div>
  );

  // ── Concluído ────────────────────────────────────────────────────
  if(passo===5) return (
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>⚖️</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:"var(--purple)",marginBottom:8}}>
        Registro salvo!
      </div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:32,lineHeight:1.6}}>
        Identificar e questionar pensamentos automáticos é um dos exercícios mais poderosos da TCC. 💜
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button onClick={reiniciar}
          style={{padding:"10px 20px",borderRadius:10,border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>
          Novo registro
        </button>
        {registros.length>0&&(
          <button onClick={()=>setVerReg(registros[0])}
            style={{padding:"10px 20px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
            Ver último
          </button>
        )}
      </div>
    </div>
  );

  // ── Wizard ───────────────────────────────────────────────────────
  return (
    <div>
      {/* Progresso */}
      <div style={{display:"flex",gap:6,marginBottom:24}}>
        {PASSOS_INFO.map(p=>(
          <div key={p.n} style={{flex:1,height:4,borderRadius:4,
            background:p.n<=passo?p.cor:"var(--gray-100)",
            cursor:p.n<passo?"pointer":"default",transition:"background .2s"}}
            onClick={()=>p.n<passo&&setPasso(p.n)}/>
        ))}
      </div>

      {/* Header do passo */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div style={{width:48,height:48,borderRadius:12,background:passoInfo.bg,
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontWeight:900,fontSize:18,color:passoInfo.cor}}>{passoInfo.letra}</span>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:16,color:"var(--text)"}}>{passoInfo.titulo}</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>{passoInfo.subtitulo}</div>
        </div>
      </div>

      {/* Dica */}
      <div style={{background:"var(--gray-50)",borderRadius:10,padding:"10px 14px",marginBottom:16,
        fontSize:12,color:"var(--text-muted)",lineHeight:1.6,borderLeft:`3px solid ${passoInfo.cor}`}}>
        {passoInfo.dica}
      </div>

      {/* Campo do passo */}
      {passo<=2&&(
        <textarea value={draft[passo===1?"situacao":"pensamento"]}
          onChange={e=>setDraft({...draft,[passo===1?"situacao":"pensamento"]:e.target.value})}
          placeholder={passoInfo.placeholder}
          style={{width:"100%",minHeight:100,padding:"12px",borderRadius:10,
            border:`1.5px solid ${passoInfo.cor}50`,fontSize:14,fontFamily:"inherit",
            resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
      )}

      {passo===3&&(
        <div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
            {EMOCOES.map(em=>{
              const sel = draft.emocao===em;
              return (
                <button key={em} onClick={()=>setDraft({...draft,emocao:em})}
                  style={{padding:"7px 14px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",fontSize:13,
                    borderColor:sel?passoInfo.cor:"var(--gray-200)",
                    background:sel?passoInfo.bg:"white",
                    color:sel?passoInfo.cor:"var(--text-muted)",
                    fontWeight:sel?700:400,transition:"all .12s"}}>
                  {em}
                </button>
              );
            })}
          </div>
          {draft.emocao&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
                <span style={{fontWeight:600}}>Intensidade de {draft.emocao}</span>
                <span style={{fontWeight:700,color:intCor}}>{draft.intensidade}%</span>
              </div>
              <input type="range" min={0} max={100} value={draft.intensidade}
                onChange={e=>setDraft({...draft,intensidade:+e.target.value})}
                style={{width:"100%",accentColor:passoInfo.cor}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",marginTop:4}}>
                <span>Leve</span><span>Moderada</span><span>Intensa</span>
              </div>
            </div>
          )}
        </div>
      )}

      {passo===4&&(
        <textarea value={draft.alternativo}
          onChange={e=>setDraft({...draft,alternativo:e.target.value})}
          placeholder={passoInfo.placeholder}
          style={{width:"100%",minHeight:100,padding:"12px",borderRadius:10,
            border:`1.5px solid ${passoInfo.cor}50`,fontSize:14,fontFamily:"inherit",
            resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
      )}

      {/* Navegação */}
      <div style={{display:"flex",gap:10,marginTop:20}}>
        {passo>1&&(
          <button onClick={()=>setPasso(passo-1)}
            style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
            ← Anterior
          </button>
        )}
        {passo<4&&(
          <button onClick={()=>setPasso(passo+1)}
            disabled={passo===1&&!draft.situacao || passo===2&&!draft.pensamento || passo===3&&!draft.emocao}
            style={{flex:2,padding:"11px",borderRadius:10,border:"none",
              background:(passo===1&&draft.situacao)||(passo===2&&draft.pensamento)||(passo===3&&draft.emocao)||passo>3
                ?passoInfo.cor:"var(--gray-100)",
              color:(passo===1&&draft.situacao)||(passo===2&&draft.pensamento)||(passo===3&&draft.emocao)||passo>3
                ?"white":"var(--text-muted)",
              cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>
            Próximo →
          </button>
        )}
        {passo===4&&(
          <button onClick={salvar}
            style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:passoInfo.cor,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
            Salvar Registro ✓
          </button>
        )}
      </div>

      {/* Histórico compacto */}
      {registros.length>0&&passo===1&&(
        <div style={{marginTop:24}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>
            Registros anteriores
          </div>
          {registros.slice(0,3).map(r=>(
            <button key={r.id} onClick={()=>setVerReg(r)}
              style={{width:"100%",background:"white",border:"1px solid var(--gray-100)",borderRadius:10,
                padding:"10px 14px",marginBottom:6,cursor:"pointer",textAlign:"left",fontFamily:"inherit",
                display:"flex",alignItems:"center",gap:10}}>
              <span style={{background:"#ede9fe",color:"#7c3aed",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,flexShrink:0}}>{r.emocao}</span>
              <span style={{fontSize:12,color:"var(--text-muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{r.situacao}</span>
              <span style={{fontSize:11,color:"var(--text-muted)",flexShrink:0}}>{r.data}</span>
            </button>
          ))}
        </div>
      )}
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
    <TextAreaVoz className="form-input" rows={5} value={respostas[secs[secao]]||""} onChange={e=>setRespostas(r=>({...r,[secs[secao]]:e.target.value}))} placeholder={`Registre as informações sobre "+secs[secao].toLowerCase()+"...`}/>
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


// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_HABITOS — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// ── 1. Ritual de Descompressão Noturna ───────────────────────────
function FerramentaSleepRitual({ user }){
  const COR="#0891b2"; const BG="#e0f2fe";
  const PASSOS_RITUAL = [
    {id:"ecras",    titulo:"Ecrãs desligados",        desc:"Telefone, TV e computador off",         tipo:"check"},
    {id:"temp",     titulo:"Temperatura do quarto",    desc:"18-20°C ou banho morno",                tipo:"check"},
    {id:"pendentes",titulo:"Lista de pendentes",       desc:"Escreva o que precisa fazer amanhã",    tipo:"texto"},
    {id:"transicao",titulo:"Atividade de transição",   desc:"Leitura, música suave ou alongamento",  tipo:"timer", dur:600},
    {id:"alarme",   titulo:"Evite conteúdo ativante",  desc:"Sem notícias, conflitos ou decisões",   tipo:"check"},
    {id:"gratidao", titulo:"3 gratidões do dia",       desc:"Escreva 3 coisas pequenas que correram bem", tipo:"texto"},
    {id:"hora",     titulo:"Hora consistente",         desc:"Mesma hora todos os dias — incluindo fim de semana", tipo:"check"},
  ];

  const [checks,   setChecks]   = useState({});
  const [textos,   setTextos]   = useState({});
  const [timerRod, setTimerRod] = useState(false);
  const [timerVal, setTimerVal] = useState(600);
  const [concluido,setConcluido]= useState(false);
  const timerRef = React.useRef(null);

  React.useEffect(()=>{
    if(!timerRod) return;
    timerRef.current = setInterval(()=>{
      setTimerVal(t=>{
        if(t<=1){ clearInterval(timerRef.current); setTimerRod(false); return 0; }
        return t-1;
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[timerRod]);

  const feitos = PASSOS_RITUAL.filter(p=>{
    if(p.tipo==="check") return checks[p.id];
    if(p.tipo==="texto") return (textos[p.id]||"").trim().length>2;
    if(p.tipo==="timer") return timerVal<600;
    return false;
  }).length;

  if(concluido) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🌙</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Ritual concluído!</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24,lineHeight:1.6}}>
        {feitos} de {PASSOS_RITUAL.length} passos completados.<br/>O seu sistema nervoso agradece. 💜
      </div>
      <button onClick={()=>{setChecks({});setTextos({});setTimerVal(600);setTimerRod(false);setConcluido(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo ritual
      </button>
    </div>
  );

  const min=Math.floor(timerVal/60), seg=timerVal%60;

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{flex:1,background:"var(--gray-100)",borderRadius:20,height:6}}>
          <div style={{width:(feitos/PASSOS_RITUAL.length*100)+"%",height:"100%",borderRadius:20,background:COR,transition:"width .3s"}}/>
        </div>
        <span style={{fontSize:12,color:"var(--text-muted)",flexShrink:0}}>{feitos}/{PASSOS_RITUAL.length}</span>
      </div>

      {PASSOS_RITUAL.map(p=>{
        const feito = p.tipo==="check"?checks[p.id]: p.tipo==="texto"?(textos[p.id]||"").trim().length>2: timerVal<600;
        return(
          <div key={p.id} style={{background:"white",border:"1.5px solid",borderRadius:12,
            padding:"12px 14px",marginBottom:8,
            borderColor:feito?COR:"var(--gray-200)"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              {p.tipo==="check"&&(
                <div onClick={()=>setChecks(c=>({...c,[p.id]:!c[p.id]}))}
                  style={{width:22,height:22,borderRadius:"50%",border:"2px solid",flexShrink:0,marginTop:1,cursor:"pointer",
                    borderColor:feito?COR:"var(--gray-300)",background:feito?COR:"white",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {feito&&<span style={{color:"white",fontSize:12}}>✓</span>}
                </div>
              )}
              {p.tipo!=="check"&&(
                <div style={{width:22,height:22,borderRadius:"50%",background:feito?COR:BG,
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  <span style={{fontSize:12}}>{p.tipo==="timer"?"⏱":"✏️"}</span>
                </div>
              )}
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:feito?COR:"var(--text)",marginBottom:2}}>{p.titulo}</div>
                <div style={{fontSize:12,color:"var(--text-muted)"}}>{p.desc}</div>
                {p.tipo==="texto"&&(
                  <textarea value={textos[p.id]||""} onChange={e=>setTextos(t=>({...t,[p.id]:e.target.value}))}
                    placeholder={p.id==="pendentes"?"Ex: Responder email, ligar para médico...":"Ex: Aprendi algo novo, conversei bem com alguém..."}
                    style={{width:"100%",minHeight:60,padding:"8px 10px",borderRadius:8,border:"1px solid "+COR+"40",
                      fontSize:12,fontFamily:"inherit",resize:"none",marginTop:8,boxSizing:"border-box",outline:"none"}}/>
                )}
                {p.tipo==="timer"&&(
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontWeight:700,fontSize:16,color:COR,minWidth:50}}>{min}:{seg.toString().padStart(2,"0")}</div>
                    {!timerRod&&timerVal===600&&<button onClick={()=>setTimerRod(true)}
                      style={{padding:"5px 12px",borderRadius:8,border:"none",background:COR,color:"white",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      Iniciar
                    </button>}
                    {timerRod&&<button onClick={()=>{setTimerRod(false);clearInterval(timerRef.current);}}
                      style={{padding:"5px 12px",borderRadius:8,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      Pausar
                    </button>}
                    {!timerRod&&timerVal<600&&<span style={{fontSize:12,color:COR,fontWeight:600}}>✓ feito</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={()=>setConcluido(true)}
        style={{width:"100%",padding:"12px",borderRadius:10,border:"none",marginTop:8,
          background:feitos>=4?COR:"var(--gray-100)",
          color:feitos>=4?"white":"var(--text-muted)",
          cursor:feitos>=4?"pointer":"not-allowed",
          fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        {feitos>=4?"Concluir ritual 🌙":"Complete pelo menos 4 passos"}
      </button>
    </div>
  );
}

// ── 2. Regra dos 5 Minutos ────────────────────────────────────────
function FerramentaFiveMinute({ user }){
  const COR="#7c3aed"; const BG="#ede9fe";
  const [p,setP]=useState(0);
  const [tarefa,setTarefa]=useState("");
  const [desconfortAntes,setDesconfortAntes]=useState(7);
  const [timerRod,setTimerRod]=useState(false);
  const [timerVal,setTimerVal]=useState(300);
  const [desconfortDurante,setDesconfortDurante]=useState(5);
  const [decisao,setDecisao]=useState(null);
  const [salvo,setSalvo]=useState(false);
  const timerRef=React.useRef(null);

  React.useEffect(()=>{
    if(!timerRod) return;
    timerRef.current=setInterval(()=>{
      setTimerVal(t=>{
        if(t<=1){clearInterval(timerRef.current);setTimerRod(false);return 0;}
        return t-1;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[timerRod]);

  const min=Math.floor(timerVal/60), seg=timerVal%60;
  const concluido=timerVal===0;

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>⚡</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>
        {decisao==="continuar"?"Continuou! Momentum ativado!":"5 minutos concluídos!"}
      </div>
      <div style={{background:BG,borderRadius:10,padding:"12px",marginBottom:20,fontSize:13,color:"#4c1d95"}}>
        Desconforto antecipado: <strong>{desconfortAntes}/10</strong> →
        Desconforto real: <strong>{desconfortDurante}/10</strong>
        {desconfortDurante<desconfortAntes&&<div style={{marginTop:4,color:"#059669",fontWeight:600}}>
          ✓ O real foi menor que o imaginado!
        </div>}
      </div>
      <button onClick={()=>{setTarefa("");setDesconfortAntes(7);setTimerVal(300);setTimerRod(false);setDesconfortDurante(5);setDecisao(null);setSalvo(false);setP(0);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Nova tarefa
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={4} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Qual tarefa está evitando?" subtitulo="Seja específico — uma tarefa só" dica="Quanto mais específico, mais fácil de começar. Não 'trabalho' — mas 'responder o email do cliente X'." cor={COR} bg={BG}/>
        <textarea value={tarefa} onChange={e=>setTarefa(e.target.value)}
          placeholder="Ex: Responder o email do cliente sobre o relatório..."
          style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onNext={()=>setP(1)} podeProsseguir={tarefa.trim().length>5}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Quão difícil parece agora?" subtitulo="Desconforto antecipado" dica="Avalie ANTES de começar. Vamos comparar com o real depois." cor={COR} bg={BG}/>
        <SliderStep label="Desconforto antecipado" valor={desconfortAntes} onChange={setDesconfortAntes} cor={COR} antes="Tranquilo" depois="Muito difícil"/>
        <div style={{background:BG,borderRadius:10,padding:"12px",marginTop:16,fontSize:13,color:"#4c1d95",lineHeight:1.5}}>
          <strong>Micro-compromisso:</strong> Vou trabalhar nisto durante apenas <strong>5 minutos</strong>. Ao fim de 5 minutos, posso parar sem culpa.
        </div>
        <NavButtons passo={p} total={4} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={true}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="Timer de 5 minutos" subtitulo="Apenas o primeiro passo físico" dica="Abra o documento, pegue o caderno, escreva a primeira frase. Só isso." cor={COR} bg={BG}/>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{width:100,height:100,borderRadius:"50%",border:"3px solid "+COR,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",
            background:concluido?BG:"white"}}>
            <div style={{fontSize:26,fontWeight:700,color:COR}}>{min}:{seg.toString().padStart(2,"0")}</div>
            <div style={{fontSize:10,color:"var(--text-muted)"}}>{concluido?"feito!":"min"}</div>
          </div>
          {!timerRod&&!concluido&&<button onClick={()=>setTimerRod(true)}
            style={{padding:"11px 28px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>
            Iniciar 5 min
          </button>}
          {timerRod&&<div>
            <div style={{background:"var(--gray-100)",borderRadius:20,height:5,marginBottom:12,maxWidth:200,margin:"0 auto 12px"}}>
              <div style={{width:((300-timerVal)/300*100)+"%",height:"100%",borderRadius:20,background:COR,transition:"width 1s"}}/>
            </div>
            <button onClick={()=>{setTimerRod(false);clearInterval(timerRef.current);}}
              style={{padding:"8px 20px",borderRadius:8,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Pausar
            </button>
          </div>}
        </div>
        <NavButtons passo={p} total={4} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={concluido||timerVal<290}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Como foi na prática?" subtitulo="Compare o real com o antecipado" dica="Esta comparação é o aprendizado mais valioso da ferramenta." cor={COR} bg={BG}/>
        <div style={{marginBottom:16}}>
          <SliderStep label="Desconforto real durante" valor={desconfortDurante} onChange={setDesconfortDurante} cor={COR} antes="Tranquilo" depois="Muito difícil"/>
        </div>
        <div style={{fontWeight:600,fontSize:13,color:"var(--text)",marginBottom:10}}>Quer parar ou continuar?</div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {[{v:"continuar",l:"Continuar trabalhando",e:"💪"},{v:"parar",l:"Parar — compromisso cumprido",e:"✅"}].map(op=>(
            <button key={op.v} onClick={()=>setDecisao(op.v)}
              style={{flex:1,padding:"12px 8px",borderRadius:10,border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",
                borderColor:decisao===op.v?COR:"var(--gray-200)",
                background:decisao===op.v?BG:"white",
                color:decisao===op.v?COR:"var(--text-muted)",
                fontWeight:decisao===op.v?700:400,fontSize:13,textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:4}}>{op.e}</div>
              {op.l}
            </button>
          ))}
        </div>
        <NavButtons passo={p} total={4} onBack={()=>setP(2)} onSave={()=>setSalvo(true)} podeProsseguir={decisao!==null}/>
      </div>}
    </div>
  );
}

// ── 3. Empilhamento de Hábitos ────────────────────────────────────
function FerramentaHabitStacking({ user }){
  const COR="#059669"; const BG="#dcfce7";
  const ANCORA_OPCOES=[
    {v:"cafe",l:"Café da manhã",e:"☕"},{v:"escova",l:"Escovar os dentes",e:"🪥"},
    {v:"acordar",l:"Ao acordar",e:"🌅"},{v:"trabalho",l:"Chegada ao trabalho",e:"💼"},
    {v:"almoco",l:"Após o almoço",e:"🍽️"},{v:"carro",l:"Entrar no carro",e:"🚗"},
    {v:"jantar",l:"Após o jantar",e:"🌙"},{v:"dormir",l:"Antes de dormir",e:"😴"},
  ];
  const [p,setP]=useState(0);
  const [ancora,setAncora]=useState("");
  const [novoHabito,setNovoHabito]=useState("");
  const [formula,setFormula]=useState("");
  const [dias,setDias]=useState({});
  const [resistencia,setResistencia]=useState(3);
  const [salvo,setSalvo]=useState(false);

  const diasSemana=["Seg","Ter","Qua","Qui","Sex","Sab","Dom"];
  const feitos=Object.values(dias).filter(Boolean).length;

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🌱</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Hábito registrado!</div>
      <div style={{background:BG,borderRadius:10,padding:"12px",marginBottom:20,fontSize:13,color:"#064e3b",lineHeight:1.6}}>
        <strong>Fórmula:</strong> "{formula||`Depois de ${ancora}, vou ${novoHabito}`}"<br/>
        <strong>Consistência:</strong> {feitos}/7 dias<br/>
        <strong>Resistência:</strong> {resistencia}/10
      </div>
      <button onClick={()=>{setAncora("");setNovoHabito("");setFormula("");setDias({});setResistencia(3);setSalvo(false);setP(0);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo hábito
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={4} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Escolha o hábito âncora" subtitulo="Algo que já faz todos os dias sem falhar" dica="Este será o gatilho automático do novo hábito. Quanto mais fixo na rotina, melhor." cor={COR} bg={BG}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {ANCORA_OPCOES.map(op=>(
            <button key={op.v} onClick={()=>setAncora(op.l)}
              style={{padding:"12px 8px",borderRadius:10,border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",
                borderColor:ancora===op.l?COR:"var(--gray-200)",
                background:ancora===op.l?BG:"white",
                display:"flex",alignItems:"center",gap:8,fontSize:13,
                color:ancora===op.l?COR:"var(--text-muted)",fontWeight:ancora===op.l?700:400}}>
              <span style={{fontSize:20}}>{op.e}</span>{op.l}
            </button>
          ))}
        </div>
        <NavButtons passo={p} total={4} onNext={()=>setP(1)} podeProsseguir={ancora.length>0}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Defina o novo hábito" subtitulo="Pequeno e específico" dica="Não 'meditar' — mas 'respirar profundamente por 2 minutos'. Quanto menor, maior a chance." cor={COR} bg={BG}/>
        <textarea value={novoHabito} onChange={e=>setNovoHabito(e.target.value)}
          placeholder="Ex: Escrever uma coisa pela qual sou grato, respirar 2 minutos, fazer 10 flexões..."
          style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        {ancora&&novoHabito&&<div style={{background:BG,borderRadius:10,padding:"12px",marginTop:12,fontSize:13,color:"#064e3b",lineHeight:1.5,fontStyle:"italic"}}>
          "Depois de <strong>{ancora}</strong>, vou <strong>{novoHabito}</strong>."
        </div>}
        <NavButtons passo={p} total={4} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={novoHabito.trim().length>3}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="Registro da semana" subtitulo="Marque os dias que executou" dica="Os primeiros 7 dias exigem intenção consciente. Marque honestamente." cor={COR} bg={BG}/>
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:16}}>
          {diasSemana.map(d=>(
            <div key={d} onClick={()=>setDias(ds=>({...ds,[d]:!ds[d]}))}
              style={{width:40,height:40,borderRadius:10,border:"1.5px solid",cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
                borderColor:dias[d]?COR:"var(--gray-200)",
                background:dias[d]?COR:"white",
                color:dias[d]?"white":"var(--text-muted)",
                fontWeight:600,fontSize:12}}>
              {dias[d]?"✓":d[0]}
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",fontSize:13,color:"var(--text-muted)",marginBottom:16}}>
          {feitos} de 7 dias executados
        </div>
        <SliderStep label="Resistência sentida" valor={resistencia} onChange={setResistencia} cor={COR} antes="Fácil" depois="Muito difícil"/>
        {resistencia>=7&&<div style={{background:"#fef3c7",borderRadius:10,padding:"10px 12px",marginTop:10,fontSize:12,color:"#854F0B"}}>
          Resistência alta — considere reduzir o hábito pela metade.
        </div>}
        <NavButtons passo={p} total={4} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={feitos>0}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Reflexão da semana" subtitulo="O que funcionou e o que ajustar?" dica="Após 21 dias de consistência, o hábito começa a ser automático." cor={COR} bg={BG}/>
        <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:16}}>
          <div style={{fontSize:13,color:"#064e3b",lineHeight:1.6}}>
            <div style={{marginBottom:4}}>Âncora: <strong>{ancora}</strong></div>
            <div style={{marginBottom:4}}>Hábito: <strong>{novoHabito}</strong></div>
            <div style={{marginBottom:4}}>Consistência: <strong>{feitos}/7 dias</strong></div>
            <div>Resistência: <strong>{resistencia}/10</strong> {resistencia<=3?"— ótimo!":resistencia<=6?"— ajustável":""}</div>
          </div>
        </div>
        <textarea value={formula} onChange={e=>setFormula(e.target.value)}
          placeholder="Alguma observação sobre como correu? O que pode ajustar na próxima semana?"
          style={{width:"100%",minHeight:70,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(2)} onSave={()=>setSalvo(true)} podeProsseguir={true}/>
      </div>}
    </div>
  );
}

// ── 4. Mapa da Bateria ────────────────────────────────────────────
function FerramentaEnergyMap({ user }){
  const COR="#059669"; const BG="#dcfce7";
  const DRENOS_OPCOES=[
    {v:"reunioes",l:"Reuniões longas",e:"🗓️"},{v:"conflitos",l:"Conflitos não resolvidos",e:"⚡"},
    {v:"redes",l:"Redes sociais",e:"📱"},{v:"sem_sentido",l:"Tarefas sem sentido",e:"😑"},
    {v:"deslocamento",l:"Deslocamento",e:"🚗"},{v:"barulho",l:"Barulho/distração",e:"🔊"},
    {v:"decisoes",l:"Muitas decisões",e:"🤯"},{v:"perfeccionismo",l:"Perfeccionismo",e:"🎯"},
  ];
  const RECARGAS_OPCOES=[
    {v:"natureza",l:"Tempo na natureza",e:"🌿"},{v:"amigos",l:"Conversa com amigo",e:"👥"},
    {v:"exercicio",l:"Exercício",e:"🏃"},{v:"silencio",l:"Momento de silêncio",e:"🧘"},
    {v:"criatividade",l:"Atividade criativa",e:"🎨"},{v:"leitura",l:"Leitura",e:"📚"},
    {v:"musica",l:"Música",e:"🎵"},{v:"sono",l:"Sono de qualidade",e:"😴"},
  ];
  const ALERTAS=[
    "Cansaço que não passa com sono",
    "Irritabilidade por pequenas coisas",
    "Dificuldade de concentração",
    "Prazer reduzido nas atividades",
  ];
  const [p,setP]=useState(0);
  const [bateria,setBateria]=useState(60);
  const [drenos,setDrenos]=useState([]);
  const [recargas,setRecargas]=useState([]);
  const [alertas,setAlertas]=useState([]);
  const [recargaAmanha,setRecargaAmanha]=useState("");
  const [salvo,setSalvo]=useState(false);

  const batCor=bateria>=60?"#059669":bateria>=30?"#d97706":"#dc2626";

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🔋</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:batCor,marginBottom:8}}>
        Mapa registrado!
      </div>
      <div style={{background:BG,borderRadius:10,padding:"12px",marginBottom:12,fontSize:13,color:"#064e3b",lineHeight:1.7}}>
        Bateria: <strong style={{color:batCor}}>{bateria}%</strong><br/>
        Drenos: <strong>{drenos.length}</strong> · Recargas: <strong>{recargas.length}</strong><br/>
        {alertas.length>0&&<span style={{color:"#dc2626"}}>⚠️ {alertas.length} sinal(is) de alerta</span>}
      </div>
      {recargaAmanha&&<div style={{background:"#dcfce7",borderRadius:10,padding:"10px",fontSize:13,color:"#064e3b",marginBottom:20}}>
        Recarga amanhã: <strong>{recargaAmanha}</strong>
      </div>}
      <button onClick={()=>{setBateria(60);setDrenos([]);setRecargas([]);setAlertas([]);setRecargaAmanha("");setSalvo(false);setP(0);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo mapa
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={4} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Nível da bateria" subtitulo="Qual é sua energia agora?" dica="Não pense — responda instintivamente. De 0 (esgotado) a 100 (plena energia)." cor={COR} bg={BG}/>
        <div style={{textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:44,fontWeight:700,color:batCor,lineHeight:1}}>{bateria}%</div>
          <div style={{fontSize:12,color:"var(--text-muted)",marginTop:4}}>
            {bateria>=70?"Energia boa":bateria>=40?"Atenção necessária":"Zona de esgotamento"}
          </div>
        </div>
        <input type="range" min={0} max={100} step={1} value={bateria}
          onChange={e=>setBateria(Number(e.target.value))}
          style={{width:"100%",accentColor:batCor,marginBottom:8}}/>
        <div style={{background:"var(--gray-100)",borderRadius:20,height:8,marginBottom:16}}>
          <div style={{width:bateria+"%",height:"100%",borderRadius:20,background:batCor,transition:"width .2s"}}/>
        </div>
        <NavButtons passo={p} total={4} onNext={()=>setP(1)} podeProsseguir={true}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="O que está drenando?" subtitulo="Selecione o que consumiu energia esta semana" dica="Seja honesto — o mapa só é útil se for real." cor={COR} bg={BG}/>
        <TagsSelector opcoes={DRENOS_OPCOES} selecionadas={drenos} onChange={setDrenos} cor="#dc2626" bg="#fee2e2"/>
        <NavButtons passo={p} total={4} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={drenos.length>0}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="O que recarrega?" subtitulo="O que deu energia esta semana?" dica="Inclua também coisas que sabe que recarregam mas que não fez — isso é informação importante." cor={COR} bg={BG}/>
        <TagsSelector opcoes={RECARGAS_OPCOES} selecionadas={recargas} onChange={setRecargas} cor={COR} bg={BG}/>
        <div style={{marginTop:16}}>
          <div style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:8}}>Sinais de alerta presentes?</div>
          {ALERTAS.map(a=>(
            <div key={a} onClick={()=>setAlertas(al=>al.includes(a)?al.filter(x=>x!==a):[...al,a])}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,
                border:"1.5px solid",marginBottom:6,cursor:"pointer",
                borderColor:alertas.includes(a)?"#dc2626":"var(--gray-200)",
                background:alertas.includes(a)?"#fee2e2":"white"}}>
              <div style={{width:18,height:18,borderRadius:"50%",border:"1.5px solid",flexShrink:0,
                borderColor:alertas.includes(a)?"#dc2626":"var(--gray-300)",
                background:alertas.includes(a)?"#dc2626":"white",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {alertas.includes(a)&&<span style={{color:"white",fontSize:10}}>✓</span>}
              </div>
              <span style={{fontSize:13,color:alertas.includes(a)?"#7f1d1d":"var(--text-muted)"}}>{a}</span>
            </div>
          ))}
        </div>
        <NavButtons passo={p} total={4} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={recargas.length>0}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Plano de recarga" subtitulo="Uma ação para amanhã" dica="Escolha uma recarga concreta e agende com hora definida." cor={COR} bg={BG}/>
        <div style={{background:bateria<40?"#fee2e2":BG,borderRadius:10,padding:"12px",marginBottom:16,fontSize:13,
          color:bateria<40?"#7f1d1d":"#064e3b",lineHeight:1.5}}>
          {bateria<40?"⚠️ Bateria crítica — priorize uma recarga hoje mesmo.":
           bateria<60?"Atenção — planeje recargas antes de chegar ao vermelho.":
           "Bateria ok — mantenha o equilíbrio com recargas regulares."}
        </div>
        <textarea value={recargaAmanha} onChange={e=>setRecargaAmanha(e.target.value)}
          placeholder="Ex: Caminhada de 20min às 18h, ligar para amiga às 19h..."
          style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(2)} onSave={()=>setSalvo(true)} podeProsseguir={recargaAmanha.trim().length>3}/>
      </div>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_CORPO — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// ── 1. Escada Polivagal ──────────────────────────────────────────
function FerramentaPolyvagal({ user }){
  const [estado,setEstado]=useState(null);
  const [ancora,setAncora]=useState([]);
  const [segAntes,setSegAntes]=useState(5);
  const [segDepois,setSegDepois]=useState(5);
  const [fase,setFase]=useState("avaliacao"); // avaliacao | tecnica | resultado
  const [checks,setChecks]=useState({});

  const ESTADOS={
    verde:{label:"Verde — Segurança",emoji:"🟢",cor:"#059669",bg:"#dcfce7",
      desc:"Calmo, presente, conectado, consegue pensar com clareza",
      tecnicas:[
        {id:"pes",l:"Pés no chão — sinta o contacto"},
        {id:"olhar",l:"Nomeie 5 coisas que vê ao redor"},
        {id:"mao",l:"Mão no peito — 'Estou seguro agora'"},
        {id:"respirar",l:"3 respirações lentas com expiração longa"},
      ]},
    vermelho:{label:"Vermelho — Luta/Fuga",emoji:"🔴",cor:"#dc2626",bg:"#fee2e2",
      desc:"Agitado, ansioso, irritado, coração acelerado, pensamentos a mil",
      tecnicas:[
        {id:"agua",l:"Água fria no rosto ou pulsos (15-30s)"},
        {id:"expiracao",l:"Inspirar 4s → Expirar 8s (5 vezes)"},
        {id:"movimento",l:"Balançar o corpo lentamente"},
        {id:"humm",l:"Humme uma nota grave (ativa nervo vago)"},
      ]},
    azul:{label:"Azul — Colapso",emoji:"🔵",cor:"#1d4ed8",bg:"#dbeafe",
      desc:"Desmotivado, entorpecido, sem energia, sensação de desligar",
      tecnicas:[
        {id:"saltar",l:"30s de movimento: salte no lugar"},
        {id:"luz",l:"Vá para espaço com luz natural"},
        {id:"contacto",l:"Chame alguém ou envie mensagem"},
        {id:"frio",l:"Água fria nas mãos e rosto"},
      ]},
  };

  const ANCORAS=[
    {v:"respiracao",l:"Respiração lenta",e:"💨"},
    {v:"pes",l:"Pés no chão",e:"🦶"},
    {v:"musica",l:"Música calmante",e:"🎵"},
    {v:"natureza",l:"Estar na natureza",e:"🌿"},
    {v:"movimento",l:"Movimento suave",e:"🚶"},
    {v:"contacto",l:"Contacto social seguro",e:"🤝"},
    {v:"frio",l:"Água fria",e:"💧"},
    {v:"silencio",l:"Silêncio e descanso",e:"🌙"},
  ];

  const est = estado ? ESTADOS[estado] : null;
  const feitosChecks = Object.values(checks).filter(Boolean).length;

  if(fase==="resultado") return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>{est?.emoji}</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:est?.cor,marginBottom:8}}>
        Regulação registrada!
      </div>
      <div style={{background:est?.bg,borderRadius:12,padding:"14px",marginBottom:20,fontSize:13,lineHeight:1.7}}>
        <div>Estado inicial: <strong>{est?.label}</strong></div>
        <div>Segurança antes: <strong>{segAntes}/10</strong> → depois: <strong>{segDepois}/10</strong></div>
        <div>Técnicas aplicadas: <strong>{feitosChecks}</strong></div>
        {ancora.length>0&&<div>Âncoras: <strong>{ancora.join(", ")}</strong></div>}
      </div>
      <button onClick={()=>{setEstado(null);setAncora([]);setSegAntes(5);setSegDepois(5);setFase("avaliacao");setChecks({});}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:"#7B00C4",color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Nova prática
      </button>
    </div>
  );

  if(fase==="tecnica"&&est) return(
    <div>
      <div style={{background:est.bg,borderRadius:12,padding:"14px 16px",marginBottom:16,borderLeft:"4px solid "+est.cor}}>
        <div style={{fontWeight:700,fontSize:14,color:est.cor,marginBottom:4}}>{est.emoji} {est.label}</div>
        <div style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>Aplique as técnicas abaixo para subir a escada de regulação.</div>
      </div>
      <div style={{marginBottom:16}}>
        <SliderStep label="Sensação de segurança agora" valor={segAntes} onChange={setSegAntes} cor={est.cor} antes="Muito inseguro" depois="Muito seguro"/>
      </div>
      <div style={{marginBottom:16}}>
        {est.tecnicas.map(t=>(
          <div key={t.id} onClick={()=>setChecks(c=>({...c,[t.id]:!c[t.id]}))}
            style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:10,
              border:"1.5px solid",marginBottom:8,cursor:"pointer",
              borderColor:checks[t.id]?est.cor:"var(--gray-200)",
              background:checks[t.id]?est.bg:"white"}}>
            <div style={{width:20,height:20,borderRadius:"50%",border:"2px solid",flexShrink:0,
              borderColor:checks[t.id]?est.cor:"var(--gray-300)",background:checks[t.id]?est.cor:"white",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              {checks[t.id]&&<span style={{color:"white",fontSize:11}}>✓</span>}
            </div>
            <span style={{fontSize:13,color:checks[t.id]?est.cor:"var(--text-muted)"}}>{t.l}</span>
          </div>
        ))}
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>As suas âncoras pessoais</div>
        <TagsSelector opcoes={ANCORAS} selecionadas={ancora} onChange={setAncora} cor={est.cor} bg={est.bg}/>
      </div>
      <div style={{marginBottom:16}}>
        <SliderStep label="Sensação de segurança após as técnicas" valor={segDepois} onChange={setSegDepois} cor={est.cor} antes="Muito inseguro" depois="Muito seguro"/>
      </div>
      <button onClick={()=>setFase("resultado")}
        style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:est.cor,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Registrar prática ✓
      </button>
    </div>
  );

  return(
    <div>
      <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,marginBottom:8}}>Escada Polivagal</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20,lineHeight:1.5}}>
        Identifique o seu estado atual e aplique técnicas específicas para regulação.
      </div>
      {Object.entries(ESTADOS).map(([k,e])=>(
        <div key={k} onClick={()=>{setEstado(k);setFase("tecnica");}}
          style={{display:"flex",alignItems:"center",gap:14,padding:"16px",borderRadius:14,
            border:"2px solid",marginBottom:10,cursor:"pointer",
            borderColor:estado===k?e.cor:e.cor+"40",
            background:estado===k?e.bg:"white",
            transition:"all .15s"}}>
          <span style={{fontSize:32,flexShrink:0}}>{e.emoji}</span>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:e.cor,marginBottom:3}}>{e.label}</div>
            <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.4}}>{e.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 2. Aterramento 5 Sentidos ────────────────────────────────────
function FerramentaGrounding({ user }){
  const COR="#0891b2"; const BG="#e0f2fe";
  const [p,setP]=useState(-1); // -1=intro
  const [respostas,setRespostas]=useState({v:"",t:"",o:"",c:"",s:""});
  const [presAntes,setPresAntes]=useState(3);
  const [presDepois,setPresDepois]=useState(3);
  const [concluido,setConcluido]=useState(false);

  const SENTIDOS=[
    {k:"v",n:5,titulo:"O que VÊ",instrucao:"Olhe ao redor. Nomeie 5 coisas que consegue ver agora. Seja específico — não 'uma cadeira' mas 'uma cadeira de madeira com assento desgastado'.",placeholder:"Ex: Uma planta verde no canto, a luz da janela, um copo azul..."},
    {k:"t",n:4,titulo:"O que TOCA",instrucao:"Foque na sensação física. Nomeie 4 coisas que consegue sentir no corpo agora.",placeholder:"Ex: O tecido da roupa no braço, a temperatura do ar, o peso dos pés no chão..."},
    {k:"o",n:3,titulo:"O que OUVE",instrucao:"Feche os olhos se quiser. Nomeie 3 sons — um próximo, um distante, um que não tinha reparado.",placeholder:"Ex: O ventilador, uma voz ao longe, o meu próprio respirar..."},
    {k:"c",n:2,titulo:"O que CHEIRA",instrucao:"Identifique 2 cheiros presentes agora. Se não sentir nenhum, leve algo ao nariz.",placeholder:"Ex: O café da manhã, o sabão das mãos..."},
    {k:"s",n:1,titulo:"O que SABOREIA",instrucao:"Foque na boca. Qual é o sabor presente agora?",placeholder:"Ex: Residual de café, nada em particular..."},
  ];

  if(concluido) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>⚓</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:12}}>
        Aterramento concluído!
      </div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20,fontSize:13,lineHeight:1.7}}>
        <div>Presença antes: <strong>{presAntes}/10</strong></div>
        <div>Presença depois: <strong>{presDepois}/10</strong></div>
        {presDepois>presAntes&&<div style={{color:COR,fontWeight:600,marginTop:4}}>
          ✓ +{presDepois-presAntes} pontos de presença 💜
        </div>}
      </div>
      <button onClick={()=>{setP(-1);setRespostas({v:"",t:"",o:"",c:"",s:""});setPresAntes(3);setPresDepois(3);setConcluido(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Nova prática
      </button>
    </div>
  );

  if(p===-1) return(
    <div>
      <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,marginBottom:8}}>Aterramento 5 Sentidos</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20,lineHeight:1.5}}>
        Exercício de presença sensorial para interromper ruminação, dissociação ou ansiedade.
      </div>
      <div style={{marginBottom:20}}>
        <SliderStep label="Presença no momento atual" valor={presAntes} onChange={setPresAntes} cor={COR} antes="Muito distante" depois="Totalmente presente"/>
      </div>
      <div style={{background:BG,borderRadius:10,padding:"12px 14px",marginBottom:20,fontSize:13,color:"#0c4a6e",lineHeight:1.5}}>
        <strong>Como funciona:</strong> Vamos ativar os 5 sentidos um a um — do maior para o menor número de itens. Isso ancora a mente no presente.
      </div>
      <button onClick={()=>setP(0)}
        style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>
        ▶ Iniciar aterramento
      </button>
    </div>
  );

  const sentido=SENTIDOS[p];
  return(
    <div>
      <StepProgress passo={p} total={SENTIDOS.length} cor={COR}/>
      <div style={{background:`linear-gradient(135deg,${COR},${COR}dd)`,borderRadius:12,padding:"14px 16px",marginBottom:16,color:"white"}}>
        <div style={{fontSize:28,marginBottom:4}}>{["👁️","🤲","👂","👃","👅"][p]}</div>
        <div style={{fontWeight:700,fontSize:17,marginBottom:4}}>{sentido.n} — {sentido.titulo}</div>
        <div style={{fontSize:13,opacity:0.9,lineHeight:1.5}}>{sentido.instrucao}</div>
      </div>
      <textarea value={respostas[sentido.k]} onChange={e=>setRespostas(r=>({...r,[sentido.k]:e.target.value}))}
        placeholder={sentido.placeholder}
        style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        {p>0&&<button onClick={()=>setP(p-1)}
          style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
          ←
        </button>}
        {p<SENTIDOS.length-1&&<button onClick={()=>setP(p+1)}
          style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
          Próximo sentido →
        </button>}
        {p===SENTIDOS.length-1&&<button onClick={()=>{}}
          style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:"#e5e7eb",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
          <div style={{marginBottom:8,fontSize:13,fontWeight:600,color:"var(--text)"}}>Como está a presença agora?</div>
          <input type="range" min={1} max={10} value={presDepois} onChange={e=>{e.stopPropagation();setPresDepois(Number(e.target.value));}}
            style={{width:"100%",accentColor:COR}} onClick={e=>e.stopPropagation()}/>
        </button>}
        {p===SENTIDOS.length-1&&<button onClick={()=>setConcluido(true)}
          style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
          ✓
        </button>}
      </div>
      {p===SENTIDOS.length-1&&<div style={{marginTop:12}}>
        <SliderStep label="Presença agora" valor={presDepois} onChange={setPresDepois} cor={COR} antes="Distante" depois="Presente"/>
        <button onClick={()=>setConcluido(true)}
          style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",marginTop:10}}>
          Concluir ✓
        </button>
      </div>}
    </div>
  );
}

// ── 3. Diário Corpo-Mente ────────────────────────────────────────
function FerramentaBodyMind({ user }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  const ANTECEDENTES=[
    {v:"sono_mau",l:"Sono fraco",e:"😴"},{v:"conflito",l:"Conflito",e:"⚡"},
    {v:"decisao",l:"Decisão difícil",e:"🤔"},{v:"trabalho",l:"Stress trabalho",e:"💼"},
    {v:"comida",l:"Comida irregular",e:"🍽️"},{v:"exercicio",l:"Sem exercício",e:"🏃"},
  ];
  const PADROES=[
    {v:"ansiedade",l:"Ansiedade",e:"😰"},{v:"raiva",l:"Raiva suprimida",e:"😤"},
    {v:"tristeza",l:"Tristeza",e:"😢"},{v:"sobrecarga",l:"Sobrecarga",e:"🫠"},
    {v:"solidao",l:"Solidão",e:"🥺"},{v:"estresse",l:"Stress crónico",e:"😫"},
  ];
  const ALIVOS=[
    {v:"repouso",l:"Repouso",e:"😴"},{v:"movimento",l:"Movimento",e:"🏃"},
    {v:"calor",l:"Calor/banho",e:"🛁"},{v:"conversa",l:"Conversa",e:"💬"},
    {v:"choro",l:"Choro",e:"😢"},{v:"medicacao",l:"Medicação",e:"💊"},
  ];
  const [p,setP]=useState(0);
  const [sintoma,setSintoma]=useState("");
  const [intensidade,setIntensidade]=useState(5);
  const [contexto,setContexto]=useState("");
  const [antecedentes,setAntecedentes]=useState([]);
  const [padroes,setPadroes]=useState([]);
  const [aliviou,setAliviou]=useState([]);
  const [salvo,setSalvo]=useState(false);

  const intCor=intensidade>=7?"#dc2626":intensidade>=4?"#d97706":"#059669";

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🫀</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Registo salvo!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20,fontSize:13,color:"#3d006a",lineHeight:1.7}}>
        <div>Sintoma: <strong>{sintoma.slice(0,50)}</strong></div>
        <div>Intensidade: <strong style={{color:intCor}}>{intensidade}/10</strong></div>
        {padroes.length>0&&<div>Padrão emocional: <strong>{padroes.join(", ")}</strong></div>}
      </div>
      <button onClick={()=>{setSintoma("");setIntensidade(5);setContexto("");setAntecedentes([]);setPadroes([]);setAliviou([]);setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo registo
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={4} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="O sintoma" subtitulo="O que está sentindo no corpo?" dica="Localização, qualidade e duração. Ex: 'Aperto no peito desde esta manhã, intensidade 7'." cor={COR} bg={BG}/>
        <textarea value={sintoma} onChange={e=>setSintoma(e.target.value)}
          placeholder="Ex: Tensão nos ombros e pescoço desde ontem, piora ao fim do dia..."
          style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none",marginBottom:14}}/>
        <SliderStep label="Intensidade do sintoma" valor={intensidade} onChange={setIntensidade} cor={intCor} antes="Leve" depois="Muito intenso"/>
        <NavButtons passo={p} total={4} onNext={()=>setP(1)} podeProsseguir={sintoma.trim().length>5}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Contexto e antecedentes" subtitulo="O que estava acontecendo?" dica="O que aconteceu nas 2-4 horas antes do sintoma surgir ou intensificar?" cor={COR} bg={BG}/>
        <textarea value={contexto} onChange={e=>setContexto(e.target.value)} placeholder="Ex: Tive uma reunião difícil, depois recebi uma mensagem que me deixou tensa..."
          style={{width:"100%",minHeight:70,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",marginBottom:12,boxSizing:"border-box",outline:"none"}}/>
        <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Antecedentes presentes</div>
        <TagsSelector opcoes={ANTECEDENTES} selecionadas={antecedentes} onChange={setAntecedentes} cor={COR} bg={BG}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={true}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="Padrão emocional" subtitulo="Que emoção pode estar associada?" dica="'Este sintoma aparece mais quando eu sinto...' — seja honesto consigo mesmo." cor={COR} bg={BG}/>
        <TagsSelector opcoes={PADROES} selecionadas={padroes} onChange={setPadroes} cor={COR} bg={BG}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={padroes.length>0}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="O que aliviou?" subtitulo="O que reduziu o sintoma?" dica="Pode incluir coisas que ainda não tentou mas que costumam funcionar." cor={COR} bg={BG}/>
        <TagsSelector opcoes={ALIVOS} selecionadas={aliviou} onChange={setAliviou} cor={COR} bg={BG}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(2)} onSave={()=>setSalvo(true)} podeProsseguir={true}/>
      </div>}
    </div>
  );
}

// ── 4. Roda da Vida ──────────────────────────────────────────────
function FerramentaWheelOfLife({ user }){
  const COR="#059669"; const BG="#dcfce7";
  const DIMENSOES=[
    {id:"saude_fisica",    label:"Saúde Física",     emoji:"🏃",desc:"Energia, sono, alimentação, exercício"},
    {id:"saude_mental",    label:"Saúde Mental",     emoji:"🧠",desc:"Equilíbrio emocional, bem-estar"},
    {id:"relacoes",        label:"Relações Íntimas", emoji:"💑",desc:"Qualidade das relações próximas"},
    {id:"familia",         label:"Família e Amigos", emoji:"👨‍👩‍👧",desc:"Ligação com família e amizades"},
    {id:"trabalho",        label:"Trabalho",         emoji:"💼",desc:"Satisfação, sentido, crescimento"},
    {id:"financas",        label:"Finanças",         emoji:"💰",desc:"Estabilidade e segurança financeira"},
    {id:"lazer",           label:"Lazer",            emoji:"🎉",desc:"Tempo para alegria e descanso real"},
    {id:"espiritualidade", label:"Espiritualidade",  emoji:"🌟",desc:"Propósito, valores, sentido de vida"},
  ];
  const [valores,setValores]=useState(Object.fromEntries(DIMENSOES.map(d=>[d.id,5])));
  const [foco,setFoco]=useState("");
  const [acoes,setAcoes]=useState("");
  const [p,setP]=useState(0);
  const [salvo,setSalvo]=useState(false);

  const media=Math.round(Object.values(valores).reduce((a,b)=>a+b,0)/DIMENSOES.length*10)/10;
  const maisAlto=DIMENSOES.reduce((a,d)=>valores[d.id]>valores[a.id]?d:a, DIMENSOES[0]);
  const maisBaixo=DIMENSOES.reduce((a,d)=>valores[d.id]<valores[a.id]?d:a, DIMENSOES[0]);

  if(salvo) return(
    <div style={{padding:"16px 0"}}>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:48,marginBottom:8}}>⭕</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR}}>Roda registrada!</div>
        <div style={{fontSize:14,color:"var(--text-muted)",marginTop:4}}>Média: <strong style={{color:COR}}>{media}/10</strong></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {DIMENSOES.map(d=>{
          const v=valores[d.id];
          const cor=v>=7?COR:v>=4?"#d97706":"#dc2626";
          return(
            <div key={d.id} style={{background:"white",borderRadius:10,padding:"10px 12px",border:"1px solid var(--gray-200)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13}}>{d.emoji} {d.label}</span>
                <span style={{fontWeight:700,color:cor}}>{v}</span>
              </div>
              <div style={{background:"var(--gray-100)",borderRadius:20,height:4,marginTop:4}}>
                <div style={{width:(v/10*100)+"%",height:"100%",borderRadius:20,background:cor,transition:"width .3s"}}/>
              </div>
            </div>
          );
        })}
      </div>
      {foco&&<div style={{background:BG,borderRadius:10,padding:"12px",marginBottom:12,fontSize:13,color:"#064e3b"}}>
        🎯 Foco: <strong>{foco}</strong>
      </div>}
      {acoes&&<div style={{background:"#ede9fe",borderRadius:10,padding:"12px",marginBottom:16,fontSize:13,color:"#4c1d95"}}>
        📋 Ações: {acoes}
      </div>}
      <button onClick={()=>{setValores(Object.fromEntries(DIMENSOES.map(d=>[d.id,5])));setFoco("");setAcoes("");setP(0);setSalvo(false);}}
        style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Nova avaliação
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={2} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Avalie as 8 dimensões" subtitulo="Como está cada área da sua vida agora?" dica="Responda com honestidade — não como gostaria, mas como realmente está." cor={COR} bg={BG}/>
        {DIMENSOES.map(d=>{
          const v=valores[d.id];
          const cor=v>=7?COR:v>=4?"#d97706":"#dc2626";
          return(
            <div key={d.id} style={{background:"white",borderRadius:12,padding:"12px 14px",marginBottom:8,border:"1px solid var(--gray-200)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:20}}>{d.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{d.label}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)"}}>{d.desc}</div>
                </div>
                <span style={{fontWeight:700,fontSize:16,color:cor,minWidth:24,textAlign:"right"}}>{v}</span>
              </div>
              <input type="range" min={0} max={10} value={v}
                onChange={e=>setValores(vals=>({...vals,[d.id]:Number(e.target.value)}))}
                style={{width:"100%",accentColor:cor}}/>
            </div>
          );
        })}
        <div style={{background:BG,borderRadius:10,padding:"12px",marginTop:8,fontSize:13,color:"#064e3b"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span>Média geral: <strong>{media}/10</strong></span>
            <span>Mais alto: {maisAlto.emoji} <strong>{valores[maisAlto.id]}</strong></span>
            <span>Mais baixo: {maisBaixo.emoji} <strong>{valores[maisBaixo.id]}</strong></span>
          </div>
        </div>
        <NavButtons passo={p} total={2} onNext={()=>setP(1)} podeProsseguir={true}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Foco e ações" subtitulo="O que vai priorizar?" dica="Não tente melhorar tudo. Escolha a dimensão que mais impacto teria nas outras se melhorada." cor={COR} bg={BG}/>
        <div style={{background:"#fee2e2",borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:13,color:"#7f1d1d"}}>
          ⚠️ Menor pontuação: {maisBaixo.emoji} <strong>{maisBaixo.label}</strong> ({valores[maisBaixo.id]}/10)
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block"}}>Dimensão de foco escolhida</label>
          <input value={foco} onChange={e=>setFoco(e.target.value)} placeholder={`Ex: ${maisBaixo.label} — ${maisBaixo.desc}`}
            style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block"}}>3 micro-ações para esta semana</label>
          <textarea value={acoes} onChange={e=>setAcoes(e.target.value)}
            placeholder={`Ex:\n1. Dormir às 23h esta semana\n2. Caminhar 20min na terça\n3. Desligar telemóvel 1h antes de dormir`}
            style={{width:"100%",minHeight:100,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",lineHeight:1.7,boxSizing:"border-box",outline:"none"}}/>
        </div>
        <NavButtons passo={p} total={2} onBack={()=>setP(0)} onSave={()=>setSalvo(true)} podeProsseguir={foco.trim().length>3}/>
      </div>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_CASAIS — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// ── 1. Mapa de Diferenciação ─────────────────────────────────────
function FerramentaDifferentiation({ user }){
  const COR="#7c3aed"; const BG="#ede9fe";
  const AREAS_FUSAO=[
    {v:"amigos",l:"Amigos",e:"👥"},{v:"familia",l:"Família",e:"👨‍👩‍👧"},
    {v:"trabalho",l:"Trabalho",e:"💼"},{v:"decisoes",l:"Decisões",e:"🤔"},
    {v:"hobbies",l:"Hobbies",e:"🎨"},{v:"opiniao",l:"Opiniões",e:"💭"},
    {v:"tempo",l:"Tempo livre",e:"⏰"},{v:"financas",l:"Finanças",e:"💰"},
  ];
  const [p,setP]=useState(0);
  const [opinioes,setOpinioes]=useState("");
  const [fusao,setFusao]=useState([]);
  const [dependencia,setDependencia]=useState(5);
  const [honesto,setHonesto]=useState("");
  const [espacos,setEspacos]=useState("");
  const [salvo,setSalvo]=useState(false);

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🌱</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Mapa registrado!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20,fontSize:13,color:"#4c1d95",lineHeight:1.7}}>
        <div>Dependência emocional: <strong>{dependencia}/10</strong></div>
        <div>Áreas de fusão: <strong>{fusao.length}</strong></div>
        {espacos&&<div>Espaços próprios: <strong>{espacos.slice(0,50)}</strong></div>}
      </div>
      <button onClick={()=>{setOpinioes("");setFusao([]);setDependencia(5);setHonesto("");setEspacos("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo mapa
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={4} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Opiniões autónomas" subtitulo="O que pensa independentemente do parceiro?" dica="Escreva 3-5 opiniões ou preferências genuinamente suas — não moldadas pela relação." cor={COR} bg={BG}/>
        <textarea value={opinioes} onChange={e=>setOpinioes(e.target.value)}
          placeholder={`Ex:\n• Prefiro filmes de ficção científica\n• Acho que devíamos mudar de cidade\n• Discordo da forma como os filhos são educados...`}
          style={{width:"100%",minHeight:110,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.7,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onNext={()=>setP(1)} podeProsseguir={opinioes.trim().length>10}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Áreas de fusão" subtitulo="Onde tende a ceder automaticamente?" dica="Fusão é quando deixa de processar a sua própria posição antes de responder ao outro." cor={COR} bg={BG}/>
        <TagsSelector opcoes={AREAS_FUSAO} selecionadas={fusao} onChange={setFusao} cor={COR} bg={BG}/>
        <div style={{marginTop:16}}>
          <SliderStep label="Meu estado emocional depende do dele/dela" valor={dependencia} onChange={setDependencia} cor={COR} antes="Pouco" depois="Muito"/>
        </div>
        <NavButtons passo={p} total={4} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={true}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="A voz honesta" subtitulo="O que diria se pudesse ser totalmente honesto?" dica="Pense numa situação recente em que cedeu quando não queria. O que teria dito?" cor={COR} bg={BG}/>
        <textarea value={honesto} onChange={e=>setHonesto(e.target.value)}
          placeholder="Ex: Quando ele decidiu as férias sem me perguntar, queria dizer que precisava de ser consultada..."
          style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={honesto.trim().length>5}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Espaços genuinamente seus" subtitulo="3 atividades, amizades ou interesses independentes" dica="O que mantém independentemente da relação? São espaços de identidade própria." cor={COR} bg={BG}/>
        <textarea value={espacos} onChange={e=>setEspacos(e.target.value)}
          placeholder={`Ex:\n1. Grupo de corrida às quintas\n2. Amizade com a Clara\n3. Leitura de ficção antes de dormir`}
          style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.7,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(2)} onSave={()=>setSalvo(true)} podeProsseguir={espacos.trim().length>5}/>
      </div>}
    </div>
  );
}

// ── 2. Mapa de Triangulação ──────────────────────────────────────
function FerramentaTriangulation({ user }){
  const COR="#0891b2"; const BG="#e0f2fe";
  const PAPEIS=[
    {v:"recruta",l:"Recruto terceiros",e:"📢"},
    {v:"recrutado",l:"Sou recrutado",e:"🎯"},
    {v:"triangulado",l:"Sou triangulado",e:"🔺"},
    {v:"mensageiro",l:"Sou mensageiro",e:"📩"},
  ];
  const [p,setP]=useState(0);
  const [vertices,setVertices]=useState({a:"",b:"",c:""});
  const [papel,setPapel]=useState([]);
  const [evita,setEvita]=useState("");
  const [direto,setDireto]=useState("");
  const [salvo,setSalvo]=useState(false);

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🔺</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Triangulação mapeada!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20,fontSize:13,color:"#0c4a6e",lineHeight:1.7}}>
        {vertices.a&&<div>Vértice A: <strong>{vertices.a}</strong></div>}
        {vertices.b&&<div>Vértice B: <strong>{vertices.b}</strong></div>}
        {vertices.c&&<div>Intermediário: <strong>{vertices.c}</strong></div>}
        {direto&&<div style={{marginTop:8,fontStyle:"italic"}}>Comunicação direta: "{direto.slice(0,60)}..."</div>}
      </div>
      <button onClick={()=>{setVertices({a:"",b:"",c:""});setPapel([]);setEvita("");setDireto("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo mapeamento
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={3} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Os 3 vértices" subtitulo="Quem são as pessoas no triângulo?" dica="Identifique as três pessoas: quem tem tensão com quem, e quem está no meio." cor={COR} bg={BG}/>
        {[{k:"a",l:"Pessoa A (você ou outra)"},{k:"b",l:"Pessoa B (em tensão com A)"},{k:"c",l:"Pessoa C (intermediário)"}].map(f=>(
          <div key={f.k} style={{marginBottom:10}}>
            <label style={{fontSize:13,fontWeight:600,marginBottom:5,display:"block",color:"var(--text)"}}>{f.l}</label>
            <input value={vertices[f.k]} onChange={e=>setVertices(v=>({...v,[f.k]:e.target.value}))}
              placeholder={f.k==="c"?"Ex: filho, sogra, amigo...":"Ex: eu, parceiro, chefe..."}
              style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
        <NavButtons passo={p} total={3} onNext={()=>setP(1)} podeProsseguir={vertices.a.length>1&&vertices.b.length>1}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Seu papel" subtitulo="Como você participa deste triângulo?" dica="Identifique o seu papel mais frequente — sem julgamento." cor={COR} bg={BG}/>
        <TagsSelector opcoes={PAPEIS} selecionadas={papel} onChange={setPapel} cor={COR} bg={BG}/>
        <div style={{marginTop:14}}>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block"}}>O que está a evitar comunicar diretamente?</label>
          <textarea value={evita} onChange={e=>setEvita(e.target.value)} placeholder="Ex: Evito dizer diretamente ao meu pai que preciso de mais espaço..."
            style={{width:"100%",minHeight:70,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}}/>
        </div>
        <NavButtons passo={p} total={3} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={papel.length>0}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="A comunicação direta" subtitulo="O que diria diretamente à pessoa?" dica="Sem intermediários. Escreva como se fosse dizer agora — com calma e assertividade." cor={COR} bg={BG}/>
        <textarea value={direto} onChange={e=>setDireto(e.target.value)}
          placeholder="Ex: 'Pai, preciso de te dizer diretamente que preciso de mais espaço nas nossas conversas...' "
          style={{width:"100%",minHeight:100,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={3} onBack={()=>setP(1)} onSave={()=>setSalvo(true)} podeProsseguir={direto.trim().length>5}/>
      </div>}
    </div>
  );
}

// ── 3. Diário de Parentalidade Compassiva ────────────────────────
function FerramentaCompassionateParenting({ user }){
  const COR="#d97706"; const BG="#fef3c7";
  const GATILHOS=[
    {v:"cansaco",l:"Cansaço",e:"😴"},{v:"pressao",l:"Pressão/pressa",e:"⏱️"},
    {v:"barulho",l:"Barulho/caos",e:"🔊"},{v:"desobediencia",l:"Desobediência",e:"🙅"},
    {v:"trabalho",l:"Stress do trabalho",e:"💼"},{v:"fome",l:"Fome/falta de sono",e:"😫"},
  ];
  const [p,setP]=useState(0);
  const [momento,setMomento]=useState("");
  const [gatilho,setGatilho]=useState([]);
  const [juiz,setJuiz]=useState("");
  const [amigo,setAmigo]=useState("");
  const [gentil,setGentil]=useState("");
  const [bom,setBom]=useState("");
  const [salvo,setSalvo]=useState(false);

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>💛</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Registo salvo!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20,fontSize:13,color:"#78350f",lineHeight:1.7}}>
        {bom&&<div>✨ Hoje foi bem: <em>"{bom}"</em></div>}
        {gentil&&<div style={{marginTop:8}}>💜 Para mim mesmo: <em>"{gentil.slice(0,80)}..."</em></div>}
      </div>
      <button onClick={()=>{setMomento("");setGatilho([]);setJuiz("");setAmigo("");setGentil("");setBom("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Nova entrada
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={5} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="O momento difícil" subtitulo="O que aconteceu?" dica="Descreva a situação brevemente. Sem julgamento — apenas os factos." cor={COR} bg={BG}/>
        <textarea value={momento} onChange={e=>setMomento(e.target.value)}
          placeholder="Ex: Perdi a paciência quando o meu filho recusou fazer a lição pela terceira vez..."
          style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <div style={{marginTop:14}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:8,color:"var(--text)"}}>O que estava a contribuir?</div>
          <TagsSelector opcoes={GATILHOS} selecionadas={gatilho} onChange={setGatilho} cor={COR} bg={BG}/>
        </div>
        <NavButtons passo={p} total={5} onNext={()=>setP(1)} podeProsseguir={momento.trim().length>5}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="O juiz interno" subtitulo="O que a voz crítica está a dizer?" dica="Escreva exatamente os pensamentos autocríticos. Sem filtrar." cor={COR} bg={BG}/>
        <textarea value={juiz} onChange={e=>setJuiz(e.target.value)}
          placeholder="Ex: Sou uma péssima mãe. Estou a marcar os meus filhos para sempre. Nunca consigo controlar-me..."
          style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={5} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={juiz.trim().length>5}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="O que diria ao seu melhor amigo?" subtitulo="Se ele/ela vivesse exatamente isso..." dica="Com que tom faria? Escreva como se fosse enviar uma mensagem agora." cor={COR} bg={BG}/>
        <textarea value={amigo} onChange={e=>setAmigo(e.target.value)}
          placeholder="Ex: 'Olha, você está cansada e sob pressão. Não és uma má mãe — és uma mãe humana que está a tentar...'"
          style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={5} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={amigo.trim().length>5}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Reescreva com gentileza" subtitulo="Agora aplique a si mesmo" dica="Mesmo tom que usou com o amigo — rigoroso mas gentil. Reconheça o erro sem atacar a identidade." cor={COR} bg={BG}/>
        <textarea value={gentil} onChange={e=>setGentil(e.target.value)}
          placeholder="Ex: 'Cometi um erro. Estou cansada. Isso não me define como mãe. Posso pedir desculpa e tentar diferente amanhã...'"
          style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={5} onBack={()=>setP(2)} onNext={()=>setP(4)} podeProsseguir={gentil.trim().length>5}/>
      </div>}
      {p===4&&<div>
        <StepHeader letra="5" titulo="O que correu bem hoje?" subtitulo="Pelo menos uma coisa" dica="Por menor que pareça — um momento de paciência, de presença, de amor. Ele conta." cor={COR} bg={BG}/>
        <textarea value={bom} onChange={e=>setBom(e.target.value)}
          placeholder="Ex: Abracei o meu filho antes de dormir e disse-lhe que o amava. Isso foi real."
          style={{width:"100%",minHeight:70,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={5} onBack={()=>setP(3)} onSave={()=>setSalvo(true)} podeProsseguir={bom.trim().length>3}/>
      </div>}
    </div>
  );
}

// ── 4. Protocolo Financeiro dos 3 Mapas ─────────────────────────
function FerramentaFinancialMaps({ user }){
  const COR="#059669"; const BG="#dcfce7";
  const VALORES=[
    {v:"seguranca",l:"Segurança",e:"🛡️"},{v:"liberdade",l:"Liberdade",e:"🕊️"},
    {v:"experiencias",l:"Experiências",e:"🌍"},{v:"estatuto",l:"Estatuto",e:"🏆"},
    {v:"legado",l:"Legado",e:"🌳"},{v:"conforto",l:"Conforto",e:"🛋️"},
    {v:"controlo",l:"Controlo",e:"🎯"},{v:"generosidade",l:"Generosidade",e:"🤝"},
  ];
  const [p,setP]=useState(0);
  const [historia,setHistoria]=useState("");
  const [valores,setValores]=useState([]);
  const [segLiberdade,setSegLiberdade]=useState(50);
  const [objetivo1,setObjetivo1]=useState("");
  const [objetivo5,setObjetivo5]=useState("");
  const [autonomia,setAutonomia]=useState("");
  const [salvo,setSalvo]=useState(false);

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>💰</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Protocolo registrado!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20,fontSize:13,color:"#064e3b",lineHeight:1.7}}>
        <div>Valores prioritários: <strong>{valores.slice(0,3).join(", ")}</strong></div>
        {objetivo1&&<div>Objetivo 1 ano: <strong>{objetivo1.slice(0,50)}</strong></div>}
        {objetivo5&&<div>Objetivo 5 anos: <strong>{objetivo5.slice(0,50)}</strong></div>}
      </div>
      <button onClick={()=>{setHistoria("");setValores([]);setSegLiberdade(50);setObjetivo1("");setObjetivo5("");setAutonomia("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo protocolo
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={3} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="M1" titulo="Mapa da História" subtitulo="Como era o dinheiro na sua família?" dica="O guião financeiro que aprendeu na infância opera de forma inconsciente. Torná-lo visível é o primeiro passo." cor={COR} bg={BG}/>
        <textarea value={historia} onChange={e=>setHistoria(e.target.value)}
          placeholder={`Ex:\n• O dinheiro era tabu — nunca se falava\n• Havia sempre escassez e preocupação\n• Quem controlava era o meu pai\n• Aprendi que poupar era obrigação`}
          style={{width:"100%",minHeight:110,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.7,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={3} onNext={()=>setP(1)} podeProsseguir={historia.trim().length>10}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="M2" titulo="Mapa dos Valores" subtitulo="O que o dinheiro representa para você?" dica="Escolha os 3 valores mais importantes. A divergência de valores é a raiz da maioria dos conflitos financeiros em casal." cor={COR} bg={BG}/>
        <TagsSelector opcoes={VALORES} selecionadas={valores} onChange={v=>setValores(v.slice(0,3))} cor={COR} bg={BG}/>
        {valores.length>0&&<div style={{margin:"12px 0",fontSize:12,color:"var(--text-muted)"}}>Selecionados: {valores.length}/3</div>}
        <SliderStep label="Segurança vs. Liberdade" valor={segLiberdade} onChange={setSegLiberdade} min={0} max={100} cor={COR} antes="Priorizo segurança" depois="Priorizo liberdade"/>
        <NavButtons passo={p} total={3} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={valores.length>0}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="M3" titulo="Mapa do Projeto Partilhado" subtitulo="Para onde vamos juntos?" dica="Transformar o dinheiro de campo de batalha em projeto partilhado começa por ter objetivos comuns." cor={COR} bg={BG}/>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block"}}>Objetivo financeiro a 1 ano</label>
          <textarea value={objetivo1} onChange={e=>setObjetivo1(e.target.value)} placeholder="Ex: Criar uma reserva de emergência de 3 meses, quitar a dívida do cartão..."
            style={{width:"100%",minHeight:60,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}}/>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block"}}>Objetivo a 5 anos</label>
          <textarea value={objetivo5} onChange={e=>setObjetivo5(e.target.value)} placeholder="Ex: Casa própria, viagem grande, investimento para os filhos..."
            style={{width:"100%",minHeight:60,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}}/>
        </div>
        <div>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block"}}>Valor de autonomia individual (cada um)</label>
          <input value={autonomia} onChange={e=>setAutonomia(e.target.value)} placeholder="Ex: R$ 300 por mês cada um sem precisar justificar..."
            style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <NavButtons passo={p} total={3} onBack={()=>setP(1)} onSave={()=>setSalvo(true)} podeProsseguir={objetivo1.trim().length>5}/>
      </div>}
    </div>
  );
}

// ── 5. Mapa de Intimidade ────────────────────────────────────────
function FerramentaIntimacyMap({ user }){
  const COR="#db2777"; const BG="#fce7f3";
  const NIVEIS=[
    {id:"emocional",label:"Intimidade Emocional",desc:"Partilho vulnerabilidades sem ser julgado/a",icone:"💜"},
    {id:"intelectual",label:"Intimidade Intelectual",desc:"Temos conversas estimulantes e partilhamos curiosidades",icone:"🧠"},
    {id:"fisico",label:"Toque Afetivo",desc:"Há carinho físico não-sexual no quotidiano",icone:"🤝"},
    {id:"sexual",label:"Intimidade Sexual",desc:"Há desejo, prazer e comunicação sobre necessidades",icone:"🔥"},
  ];
  const [valores,setValores]=useState({emocional:5,intelectual:5,fisico:5,sexual:5});
  const [foco,setFoco]=useState("");
  const [ritual,setRitual]=useState("");
  const [p,setP]=useState(0);
  const [salvo,setSalvo]=useState(false);

  const nivelMaisBaixo=Object.entries(valores).sort((a,b)=>a[1]-b[1])[0];
  const media=Math.round(Object.values(valores).reduce((a,b)=>a+b,0)/4*10)/10;

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>💑</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Mapa registrado!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:16}}>
        {NIVEIS.map(n=>(
          <div key={n.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid "+COR+"20"}}>
            <span style={{fontSize:13}}>{n.icone} {n.label}</span>
            <span style={{fontWeight:700,color:valores[n.id]>=7?COR:valores[n.id]>=4?"#d97706":"#dc2626"}}>{valores[n.id]}/10</span>
          </div>
        ))}
        <div style={{marginTop:8,fontSize:14,fontWeight:700,color:COR}}>Média: {media}/10</div>
      </div>
      {ritual&&<div style={{background:"#dcfce7",borderRadius:10,padding:"10px",fontSize:13,color:"#064e3b",marginBottom:20}}>
        🌱 Ritual desta semana: <em>"{ritual}"</em>
      </div>}
      <button onClick={()=>{setValores({emocional:5,intelectual:5,fisico:5,sexual:5});setFoco("");setRitual("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo mapa
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={2} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Os 4 níveis de intimidade" subtitulo="Avalie a qualidade atual de cada nível" dica="Responda com honestidade — não como gostaria que fosse, mas como realmente está." cor={COR} bg={BG}/>
        {NIVEIS.map(n=>(
          <div key={n.id} style={{marginBottom:16,background:"white",borderRadius:12,padding:"12px 14px",border:"1px solid "+COR+"20"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:20}}>{n.icone}</span>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{n.label}</div>
                <div style={{fontSize:11,color:"var(--text-muted)"}}>{n.desc}</div>
              </div>
              <span style={{marginLeft:"auto",fontWeight:700,fontSize:16,color:valores[n.id]>=7?COR:valores[n.id]>=4?"#d97706":"#dc2626"}}>{valores[n.id]}</span>
            </div>
            <input type="range" min={0} max={10} value={valores[n.id]}
              onChange={e=>setValores(v=>({...v,[n.id]:Number(e.target.value)}))}
              style={{width:"100%",accentColor:COR}}/>
          </div>
        ))}
        <NavButtons passo={p} total={2} onNext={()=>setP(1)} podeProsseguir={true}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Foco e ritual" subtitulo="O que precisa de atenção?" dica="Escolha apenas uma área de foco. Um ritual pequeno e consistente vale mais do que grandes gestos esporádicos." cor={COR} bg={BG}/>
        <div style={{background:BG,borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13,color:"#831843"}}>
          <strong>Nível mais baixo:</strong> {NIVEIS.find(n=>n.id===nivelMaisBaixo[0])?.icone} {NIVEIS.find(n=>n.id===nivelMaisBaixo[0])?.label} ({nivelMaisBaixo[1]}/10)
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block"}}>Área de foco escolhida</label>
          <input value={foco} onChange={e=>setFoco(e.target.value)} placeholder="Ex: Intimidade emocional — ter conversas mais profundas..."
            style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block"}}>Ritual de reconexão esta semana</label>
          <textarea value={ritual} onChange={e=>setRitual(e.target.value)} placeholder="Ex: 20 minutos sem telemóvel a conversar às sextas após o jantar..."
            style={{width:"100%",minHeight:70,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}}/>
        </div>
        <NavButtons passo={p} total={2} onBack={()=>setP(0)} onSave={()=>setSalvo(true)} podeProsseguir={foco.trim().length>3}/>
      </div>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_RELACIONAMENTOS — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// ── 1. Registo CNV ───────────────────────────────────────────────
function FerramentaCNV({ user }){
  const COR="#0891b2"; const BG="#e0f2fe";
  const [p,setP]=useState(0);
  const [d,setD]=useState({observacao:"",sentimento:"",necessidade:"",pedido:""});
  const [salvo,setSalvo]=useState(false);

  const PASSOS=[
    {letra:"O",titulo:"Observação",subtitulo:"O que aconteceu — só os factos",
     dica:"Descreva o facto concreto sem julgamento. Em vez de 'és irresponsável', diga 'reparei que X não foi feito'.",
     campo:"observacao",placeholder:"Ex: Reparei que chegaste 30 minutos depois do combinado sem avisar..."},
    {letra:"S",titulo:"Sentimento",subtitulo:"O que você sentiu",
     dica:"Nomeie a emoção sem atribuir culpa. 'Sinto-me ansioso' em vez de 'fizeste-me sentir mal'.",
     campo:"sentimento",placeholder:"Ex: Sinto-me ansioso e sozinho quando isso acontece..."},
    {letra:"N",titulo:"Necessidade",subtitulo:"O que está por baixo do sentimento",
     dica:"Identifique a necessidade não satisfeita. Não é sobre o outro — é sobre o que você precisa.",
     campo:"necessidade",placeholder:"Ex: Preciso de me sentir considerado e de confiar nos nossos combinados..."},
    {letra:"P",titulo:"Pedido",subtitulo:"O que você quer que aconteça",
     dica:"Formule um pedido claro, positivo e realizável. Permite que o outro diga não.",
     campo:"pedido",placeholder:"Ex: Podes avisar-me com antecedência quando vais atrasar?"},
  ];

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>💬</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:12}}>Registo CNV salvo!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px 16px",marginBottom:20,textAlign:"left"}}>
        {PASSOS.map(ps=>(
          <div key={ps.letra} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid "+COR+"20"}}>
            <div style={{fontSize:11,fontWeight:700,color:COR,marginBottom:3}}>{ps.letra} — {ps.titulo}</div>
            <div style={{fontSize:13,color:"var(--text)"}}>{d[ps.campo]||"—"}</div>
          </div>
        ))}
      </div>
      <button onClick={()=>{setD({observacao:"",sentimento:"",necessidade:"",pedido:""});setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo registo
      </button>
    </div>
  );

  const pInfo=PASSOS[p];
  return(
    <div>
      <StepProgress passo={p} total={PASSOS.length} cor={COR}/>
      <StepHeader letra={pInfo.letra} titulo={pInfo.titulo} subtitulo={pInfo.subtitulo} dica={pInfo.dica} cor={COR} bg={BG}/>
      <textarea value={d[pInfo.campo]} onChange={e=>setD({...d,[pInfo.campo]:e.target.value})}
        placeholder={pInfo.placeholder}
        style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
      {p===3&&d.observacao&&d.sentimento&&d.necessidade&&(
        <div style={{background:BG,borderRadius:10,padding:"12px 14px",marginTop:12,fontSize:13,color:"#0c4a6e",lineHeight:1.7,fontStyle:"italic"}}>
          "Quando <strong>{d.observacao.slice(0,40)}...</strong>, sinto <strong>{d.sentimento.slice(0,30)}</strong>, porque preciso de <strong>{d.necessidade.slice(0,30)}</strong>. {d.pedido?d.pedido.slice(0,50)+"...":""}"
        </div>
      )}
      <NavButtons passo={p} total={PASSOS.length} onBack={()=>setP(p-1)} onNext={()=>setP(p+1)} onSave={()=>setSalvo(true)} podeProsseguir={d[pInfo.campo].trim().length>5}/>
    </div>
  );
}

// ── 2. Mapa de Limites ───────────────────────────────────────────
function FerramentaLimitsMap({ user }){
  const COR="#7c3aed"; const BG="#ede9fe";
  const RESPOSTAS=[
    {v:"silencio",l:"Cedo em silêncio",e:"😶"},
    {v:"explode",l:"Explodo depois",e:"💥"},
    {v:"evito",l:"Evito a situação",e:"🚪"},
    {v:"ironizo",l:"Uso ironia",e:"😏"},
    {v:"assertivo",l:"Comunico diretamente",e:"💬"},
  ];
  const [p,setP]=useState(0);
  const [situacao,setSituacao]=useState("");
  const [quem,setQuem]=useState("");
  const [resposta,setResposta]=useState([]);
  const [formulacao,setFormulacao]=useState("");
  const [resistencia,setResistencia]=useState("");
  const [salvo,setSalvo]=useState(false);

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🚪</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:12}}>Limite mapeado!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20,textAlign:"left",fontSize:13,lineHeight:1.7}}>
        <div><strong>Situação:</strong> {situacao}</div>
        <div><strong>Com quem:</strong> {quem}</div>
        <div><strong>Formulação:</strong> {formulacao}</div>
      </div>
      <button onClick={()=>{setSituacao("");setQuem("");setResposta([]);setFormulacao("");setResistencia("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo limite
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={4} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="A situação de desconforto" subtitulo="Onde sente que um limite está sendo violado?" dica="Pense numa situação recente em que ficou ressentido, esgotado ou com sensação de injustiça." cor={COR} bg={BG}/>
        <textarea value={situacao} onChange={e=>setSituacao(e.target.value)}
          placeholder="Ex: Minha chefe pede tarefas fora do horário de trabalho regularmente..."
          style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none",marginBottom:12}}/>
        <label style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6,display:"block"}}>Com quem acontece?</label>
        <input value={quem} onChange={e=>setQuem(e.target.value)} placeholder="Ex: Chefe, parceiro, familiar..."
          style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        <NavButtons passo={p} total={4} onNext={()=>setP(1)} podeProsseguir={situacao.trim().length>5&&quem.trim().length>2}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Sua resposta habitual" subtitulo="O que costuma fazer quando o limite é violado?" dica="Cada padrão tem um custo — identifique o seu sem julgamento." cor={COR} bg={BG}/>
        <TagsSelector opcoes={RESPOSTAS} selecionadas={resposta} onChange={setResposta} cor={COR} bg={BG}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={resposta.length>0}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="Formule o limite" subtitulo="Como comunicar de forma clara e assertiva" dica='"Quando [situação], eu preciso que [pedido]. Se isso não mudar, vou [consequência realista]."' cor={COR} bg={BG}/>
        <textarea value={formulacao} onChange={e=>setFormulacao(e.target.value)}
          placeholder="Ex: Quando recebo pedidos fora do horário, preciso que sejam deixados para o dia seguinte. Se isso continuar, terei de conversar formalmente..."
          style={{width:"100%",minHeight:100,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={formulacao.trim().length>10}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Prepare-se para a resistência" subtitulo="Como vai responder se o limite for pressionado?" dica="Limites novos geram resistência. Ter uma resposta pronta reduz a ansiedade." cor={COR} bg={BG}/>
        <textarea value={resistencia} onChange={e=>setResistencia(e.target.value)}
          placeholder="Ex: Se insistirem, vou repetir com calma: 'Compreendo, mas preciso de manter este limite'..."
          style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(2)} onSave={()=>setSalvo(true)} podeProsseguir={true}/>
      </div>}
    </div>
  );
}

// ── 3. Inventário de Carga Mental ────────────────────────────────
function FerramentaMentalLoad({ user }){
  const COR="#d97706"; const BG="#fef3c7";
  const [ver,setVer]=useState("");
  const [planear,setPlanear]=useState("");
  const [fazer,setFazer]=useState("");
  const [pctVoce,setPctVoce]=useState(60);
  const [atrito,setAtrito]=useState("");
  const [plano,setPlano]=useState("");
  const [p,setP]=useState(0);
  const [salvo,setSalvo]=useState(false);

  const pctOutro=100-pctVoce;
  const corBal=pctVoce>=70?"#dc2626":pctVoce>=55?"#d97706":"#059669";

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🧩</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:12}}>Inventário registrado!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700}}>
          <span style={{color:corBal}}>Você: {pctVoce}%</span>
          <span style={{color:"#059669"}}>Outro: {pctOutro}%</span>
        </div>
      </div>
      <button onClick={()=>{setVer("");setPlanear("");setFazer("");setPctVoce(60);setAtrito("");setPlano("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo inventário
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={4} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="VER — O que você percebe" subtitulo="Tarefas que você nota precisam ser feitas" dica="Durante 3 dias, anote tudo que 'gere' mentalmente: compras, consultas, necessidades dos filhos, gestão da casa." cor={COR} bg={BG}/>
        <textarea value={ver} onChange={e=>setVer(e.target.value)}
          placeholder="Ex: Leite acabou, consulta do médico para marcar, aniversário da professora, carro precisa de revisão..."
          style={{width:"100%",minHeight:100,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onNext={()=>setP(1)} podeProsseguir={ver.trim().length>5}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="PLANEAR + FAZER" subtitulo="Quem decide e quem executa?" dica="Separar quem planeia de quem faz revela onde está o desequilíbrio real." cor={COR} bg={BG}/>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block",color:"var(--text)"}}>Quem planeia (como, quando, com quê)?</label>
          <textarea value={planear} onChange={e=>setPlanear(e.target.value)} placeholder="Ex: Eu decido tudo sobre as refeições, escola, médico..."
            style={{width:"100%",minHeight:70,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}}/>
        </div>
        <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block",color:"var(--text)"}}>Quem executa as tarefas?</label>
        <textarea value={fazer} onChange={e=>setFazer(e.target.value)} placeholder="Ex: Eu faço 80%, ele faz 20%..."
          style={{width:"100%",minHeight:70,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={planear.trim().length>3}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="Balanço da carga" subtitulo="Quanto você carrega?" dica="Seja honesto — este dado é para você, não para acusar." cor={COR} bg={BG}/>
        <div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:36,fontWeight:700,color:corBal}}>{pctVoce}%</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>da carga mental total</div>
        </div>
        <input type="range" min={0} max={100} value={pctVoce} onChange={e=>setPctVoce(Number(e.target.value))} style={{width:"100%",accentColor:corBal,marginBottom:8}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span style={{color:corBal,fontWeight:700}}>Você: {pctVoce}%</span>
          <span style={{color:"#059669",fontWeight:700}}>Outro(s): {pctOutro}%</span>
        </div>
        {pctVoce>=70&&<div style={{background:"#fee2e2",borderRadius:10,padding:"10px 12px",marginTop:10,fontSize:12,color:"#7f1d1d"}}>
          ⚠️ Carga assimétrica — considere a conversa de redistribuição.
        </div>}
        <NavButtons passo={p} total={4} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={true}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Plano de redistribuição" subtitulo="O que pode ser redistribuído?" dica="Apresente como dados, não como acusação. 'Quero que vejamos juntos' em vez de 'nunca fazes nada'." cor={COR} bg={BG}/>
        <textarea value={atrito} onChange={e=>setAtrito(e.target.value)} placeholder="Qual tarefa gera mais atrito ou é mais negligenciada?" style={{width:"100%",minHeight:60,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
        <textarea value={plano} onChange={e=>setPlano(e.target.value)} placeholder="O que vai propor redistribuir e como?" style={{width:"100%",minHeight:70,padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(2)} onSave={()=>setSalvo(true)} podeProsseguir={true}/>
      </div>}
    </div>
  );
}

// ── 4. Mapeamento do Ciclo de Conflito ───────────────────────────
function FerramentaConflictCycle({ user }){
  const COR="#dc2626"; const BG="#fee2e2";
  const PAPEIS=[
    {v:"inicia",l:"Quem inicia",e:"⚡"},{v:"acusa",l:"Quem acusa",e:"👆"},
    {v:"defende",l:"Quem defende",e:"🛡️"},{v:"retira",l:"Quem se retira",e:"🚪"},
    {v:"persegue",l:"Quem persegue",e:"🏃"},{v:"explode",l:"Quem explode",e:"💥"},
  ];
  const [p,setP]=useState(0);
  const [conflito,setConflito]=useState("");
  const [papeis,setPapeis]=useState([]);
  const [gatilho,setGatilho]=useState("");
  const [sequencia,setSequencia]=useState("");
  const [sinal,setSinal]=useState("");
  const [salvo,setSalvo]=useState(false);

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🔄</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:12}}>Ciclo mapeado!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20,textAlign:"left",fontSize:13,lineHeight:1.8}}>
        <div><strong>Conflito:</strong> {conflito.slice(0,60)}...</div>
        <div><strong>Gatilho:</strong> {gatilho}</div>
        {sinal&&<div><strong>Sinal de pausa:</strong> "{sinal}"</div>}
      </div>
      <button onClick={()=>{setConflito("");setPapeis([]);setGatilho("");setSequencia("");setSinal("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo mapeamento
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={4} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="O conflito recorrente" subtitulo="Qual discussão se repete?" dica="Não o conteúdo específico — o padrão. 'Quando discutimos sobre X, o que acontece é sempre...'" cor={COR} bg={BG}/>
        <textarea value={conflito} onChange={e=>setConflito(e.target.value)}
          placeholder="Ex: Sempre que discutimos sobre organização da casa, o padrão é..."
          style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onNext={()=>setP(1)} podeProsseguir={conflito.trim().length>5}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Papéis no ciclo" subtitulo="Quem costuma fazer o quê?" dica="Os papéis são fluidos — podem mudar conforme o tema." cor={COR} bg={BG}/>
        <TagsSelector opcoes={PAPEIS} selecionadas={papeis} onChange={setPapeis} cor={COR} bg={BG}/>
        <div style={{marginTop:14}}>
          <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:"block"}}>Qual é o gatilho principal?</label>
          <input value={gatilho} onChange={e=>setGatilho(e.target.value)} placeholder="Ex: Tom de voz, uma frase específica, momento do dia..."
            style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <NavButtons passo={p} total={4} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={papeis.length>0&&gatilho.trim().length>3}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="A sequência típica" subtitulo="O que acontece do início ao fim?" dica="Escreva em passos numerados: eu digo X → ele reage Y → eu faço Z..." cor={COR} bg={BG}/>
        <textarea value={sequencia} onChange={e=>setSequencia(e.target.value)}
          placeholder={`1. Eu digo...\n2. Ele/ela reage...\n3. Eu então...\n4. Ele/ela...\n5. O assunto fica...`}
          style={{width:"100%",minHeight:120,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:13,fontFamily:"inherit",resize:"none",lineHeight:1.8,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={4} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={sequencia.trim().length>10}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Sinal de interrupção" subtitulo="O que vão usar para sair do ciclo?" dica="Acordem em momento de calma — uma palavra, gesto ou frase neutra que significa 'estamos no ciclo, precisamos parar'." cor={COR} bg={BG}/>
        <input value={sinal} onChange={e=>setSinal(e.target.value)} placeholder="Ex: 'Pausa', 'Tempo', um gesto com a mão..."
          style={{width:"100%",padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
        <div style={{background:BG,borderRadius:10,padding:"10px 12px",fontSize:12,color:"#7f1d1d",lineHeight:1.6}}>
          💡 Após o sinal: separem-se 20 minutos, evitem rever a conversa mentalmente, regressem quando conseguirem falar com calma.
        </div>
        <NavButtons passo={p} total={4} onBack={()=>setP(2)} onSave={()=>setSalvo(true)} podeProsseguir={true}/>
      </div>}
    </div>
  );
}

// ── 5. Escuta Ativa ──────────────────────────────────────────────
function FerramentaActiveListening({ user }){
  const COR="#059669"; const BG="#dcfce7";
  const CHECKS=[
    {id:"postura",l:"Corpo voltado, telemóvel fora"},
    {id:"interrupcao",l:"Ouvi sem interromper"},
    {id:"parafrase",l:"Parafraseei o que ouvi"},
    {id:"validei",l:"Validei a emoção sem julgamento"},
    {id:"pergunta",l:"Fiz pelo menos uma pergunta aberta"},
    {id:"resolucao",l:"Perguntei se queria solução ou só ser ouvido"},
  ];
  const [qualidade,setQualidade]=useState(5);
  const [parafrase,setParafrase]=useState("");
  const [checks,setChecks]=useState({});
  const [reflexao,setReflexao]=useState("");
  const [p,setP]=useState(0);
  const [salvo,setSalvo]=useState(false);

  const feitos=Object.values(checks).filter(Boolean).length;
  const corQ=qualidade<=4?"#dc2626":qualidade<=6?"#d97706":"#059669";

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>👂</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Escuta registrada!</div>
      <div style={{background:BG,borderRadius:12,padding:"14px",marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,color:COR}}>Qualidade: {qualidade}/10</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:4}}>{feitos}/{CHECKS.length} práticas realizadas</div>
      </div>
      <button onClick={()=>{setQualidade(5);setParafrase("");setChecks({});setReflexao("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Nova sessão
      </button>
    </div>
  );

  return(
    <div>
      <StepProgress passo={p} total={3} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Auto-avaliação da escuta" subtitulo="Como foi a sua escuta hoje?" dica="Avalie honestamente — não como gostaria de ter sido, mas como realmente foi." cor={COR} bg={BG}/>
        <div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:36,fontWeight:700,color:corQ}}>{qualidade}/10</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>
            {qualidade<=3?"Escuta muito comprometida":qualidade<=5?"Escuta parcial":qualidade<=7?"Escuta razoável":"Escuta ativa e presente"}
          </div>
        </div>
        <input type="range" min={1} max={10} value={qualidade} onChange={e=>setQualidade(Number(e.target.value))} style={{width:"100%",accentColor:corQ,marginBottom:16}}/>
        <StepHeader letra="2" titulo="Checklist da escuta" subtitulo="O que praticou nesta conversa?" dica="" cor={COR} bg={BG}/>
        {CHECKS.map(c=>(
          <div key={c.id} onClick={()=>setChecks(ch=>({...ch,[c.id]:!ch[c.id]}))}
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,
              border:"1.5px solid",marginBottom:6,cursor:"pointer",
              borderColor:checks[c.id]?COR:"var(--gray-200)",background:checks[c.id]?BG:"white"}}>
            <div style={{width:20,height:20,borderRadius:"50%",border:"2px solid",flexShrink:0,
              borderColor:checks[c.id]?COR:"var(--gray-300)",background:checks[c.id]?COR:"white",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              {checks[c.id]&&<span style={{color:"white",fontSize:11}}>✓</span>}
            </div>
            <span style={{fontSize:13,color:checks[c.id]?COR:"var(--text-muted)"}}>{c.l}</span>
          </div>
        ))}
        <NavButtons passo={p} total={3} onNext={()=>setP(1)} podeProsseguir={true}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="3" titulo="Paráfrase" subtitulo="O que você entendeu que o outro quis dizer?" dica="Escreva como se fosse devolver ao outro: 'Se entendi bem, o que te preocupa é...'" cor={COR} bg={BG}/>
        <textarea value={parafrase} onChange={e=>setParafrase(e.target.value)}
          placeholder="Ex: Se entendi bem, o que te preocupa é que te sentes sozinho quando trabalho até tarde..."
          style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={3} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={parafrase.trim().length>5}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="4" titulo="Reflexão final" subtitulo="O que aprendeu sobre a sua escuta?" dica="O que foi mais difícil? O que quer praticar diferente na próxima conversa?" cor={COR} bg={BG}/>
        <textarea value={reflexao} onChange={e=>setReflexao(e.target.value)}
          placeholder="Ex: Percebi que já estava a preparar a resposta enquanto ela falava..."
          style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>
        <NavButtons passo={p} total={3} onBack={()=>setP(1)} onSave={()=>setSalvo(true)} podeProsseguir={true}/>
      </div>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_HUMOR — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// Componentes reutilizáveis
function StepProgress({passo, total, cor}){
  return (
    <div style={{display:"flex",gap:4,marginBottom:20}}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{flex:1,height:4,borderRadius:4,
          background:i<=passo?cor:"var(--gray-100)",transition:"background .2s"}}/>
      ))}
    </div>
  );
}

function StepHeader({letra, titulo, subtitulo, dica, cor, bg}){
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:40,height:40,borderRadius:10,background:bg,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontWeight:700,fontSize:16,color:cor,flexShrink:0}}>{letra}</div>
        <div>
          <div style={{fontWeight:700,fontSize:15,color:"var(--text)"}}>{titulo}</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>{subtitulo}</div>
        </div>
      </div>
      {dica&&<div style={{background:"var(--gray-50,#f9fafb)",borderRadius:8,padding:"9px 12px",
        fontSize:12,color:"var(--text-muted)",lineHeight:1.6,borderLeft:"3px solid "+cor}}>
        {dica}
      </div>}
    </div>
  );
}

function TagsSelector({opcoes, selecionadas, onChange, cor, bg}){
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
      {opcoes.map(op=>{
        const sel = selecionadas.includes(op.v||op);
        const val = op.v||op;
        const label = op.l||op;
        return (
          <button key={val} onClick={()=>onChange(
            sel ? selecionadas.filter(x=>x!==val) : [...selecionadas,val]
          )}
            style={{padding:"6px 13px",borderRadius:20,border:"1.5px solid",cursor:"pointer",
              fontFamily:"inherit",fontSize:13,
              borderColor:sel?cor:"var(--gray-200)",
              background:sel?bg:"white",
              color:sel?cor:"var(--text-muted)",
              fontWeight:sel?700:400,transition:"all .12s"}}>
            {op.e&&<span style={{marginRight:4}}>{op.e}</span>}{label}
          </button>
        );
      })}
    </div>
  );
}

function SliderStep({label, valor, onChange, min=0, max=10, cor, antes, depois}){
  const pct = Math.round((valor-min)/(max-min)*100);
  const c = valor<=(max*0.35)?cor: valor<=(max*0.65)?"#d97706":"#dc2626";
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
        <span style={{fontWeight:600,color:"var(--text)"}}>{label}</span>
        <span style={{fontWeight:700,color:c}}>{valor}{max===100?"%":"/"+max}</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={valor}
        onChange={e=>onChange(Number(e.target.value))}
        style={{width:"100%",accentColor:cor}}/>
      {(antes||depois)&&<div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",marginTop:3}}>
        <span>{antes}</span><span>{depois}</span>
      </div>}
    </div>
  );
}

function NavButtons({passo, total, onBack, onNext, onSave, podeProsseguir, salvando}){
  return (
    <div style={{display:"flex",gap:8,marginTop:20}}>
      {passo>0&&<button onClick={onBack}
        style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid var(--gray-200)",
          background:"white",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
        ← Anterior
      </button>}
      {passo<total-1&&<button onClick={onNext} disabled={!podeProsseguir}
        style={{flex:2,padding:"10px",borderRadius:10,border:"none",
          background:podeProsseguir?"var(--purple)":"var(--gray-100)",
          color:podeProsseguir?"white":"var(--text-muted)",
          cursor:podeProsseguir?"pointer":"not-allowed",
          fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Próximo →
      </button>}
      {passo===total-1&&onSave&&<button onClick={onSave} disabled={salvando||!podeProsseguir}
        style={{flex:2,padding:"10px",borderRadius:10,border:"none",
          background:podeProsseguir?"var(--purple)":"var(--gray-100)",
          color:podeProsseguir?"white":"var(--text-muted)",
          cursor:podeProsseguir?"pointer":"not-allowed",
          fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        {salvando?"Salvando...":"Salvar 💜"}
      </button>}
    </div>
  );
}

// ── 1. Análise em Cadeia ──────────────────────────────────────────
function FerramentaChainAnalysis({ user }){
  const COR="#db2777"; const BG="#fce7f3";
  const EMOCOES=[
    {v:"ansiedade",l:"Ansiedade",e:"😰"},{v:"raiva",l:"Raiva",e:"😤"},
    {v:"tristeza",l:"Tristeza",e:"😢"},{v:"medo",l:"Medo",e:"😨"},
    {v:"vergonha",l:"Vergonha",e:"😳"},{v:"culpa",l:"Culpa",e:"😞"},
    {v:"frustração",l:"Frustração",e:"😠"},{v:"solidão",l:"Solidão",e:"🥺"},
  ];
  const COMPORTAMENTOS=[
    {v:"evitei",l:"Evitei"},{v:"gritei",l:"Gritei"},{v:"chorei",l:"Chorei"},
    {v:"me afastei",l:"Me afastei"},{v:"fui ao celular",l:"Fui ao celular"},
    {v:"comi",l:"Comi"},{v:"fiquei quieto",l:"Fiquei quieto"},{v:"pedi desculpa",l:"Pedi desculpa"},
  ];
  const [p,setP]=useState(0);
  const [d,setD]=useState({episodio:"",gatilho:"",pensamento:"",emocoes:[],intensidade:6,sensacao:"",comportamentos:[],reflexao:""});
  const [salvo,setSalvo]=useState(false);

  const PASSOS=[
    {letra:"1",titulo:"Escolha um episódio",subtitulo:"O que aconteceu?",
     dica:"Descreva a situação de forma objetiva — onde estava, com quem, o que aconteceu.",
     valido:d.episodio.trim().length>5},
    {letra:"2",titulo:"Identifique o gatilho",subtitulo:"O que veio imediatamente antes?",
     dica:"Pode ser externo (uma frase, evento) ou interno (memória, pensamento espontâneo).",
     valido:d.gatilho.trim().length>3},
    {letra:"3",titulo:"Pensamento automático",subtitulo:"O que passou pela sua cabeça?",
     dica:"Escreva exatamente como surgiu, sem filtrar.",
     valido:d.pensamento.trim().length>3},
    {letra:"4",titulo:"Emoção primária",subtitulo:"O que sentiu?",
     dica:"Selecione a emoção principal e avalie a intensidade.",
     valido:d.emocoes.length>0},
    {letra:"5",titulo:"Sensação física",subtitulo:"O que sentiu no corpo?",
     dica:"Aperto no peito? Nó na garganta? Tensão nos ombros? Descreva onde e como.",
     valido:true},
    {letra:"6",titulo:"Comportamento",subtitulo:"O que fez a seguir?",
     dica:"Selecione o que melhor descreve sua reação imediata.",
     valido:d.comportamentos.length>0},
    {letra:"7",titulo:"Reflexão",subtitulo:"O que poderia ter sido diferente?",
     dica:"Em que ponto da cadeia você poderia ter intervido? Qual alternativa teria mudado o resultado?",
     valido:true},
  ];

  if(salvo) return (
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🔗</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Análise registrada!</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24,lineHeight:1.6}}>
        Identificar a cadeia é o primeiro passo para interrompê-la. 💜
      </div>
      <button onClick={()=>{setD({episodio:"",gatilho:"",pensamento:"",emocoes:[],intensidade:6,sensacao:"",comportamentos:[],reflexao:""});setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Nova análise
      </button>
    </div>
  );

  const pInfo = PASSOS[p];
  return (
    <div>
      <StepProgress passo={p} total={PASSOS.length} cor={COR}/>
      <StepHeader letra={pInfo.letra} titulo={pInfo.titulo} subtitulo={pInfo.subtitulo} dica={pInfo.dica} cor={COR} bg={BG}/>
      {p===0&&<textarea value={d.episodio} onChange={e=>setD({...d,episodio:e.target.value})}
        placeholder="Ex: Minha chefe me chamou para conversar de última hora..."
        style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>}
      {p===1&&<textarea value={d.gatilho} onChange={e=>setD({...d,gatilho:e.target.value})}
        placeholder="Ex: Recebi uma mensagem dizendo que ela precisava falar comigo urgente..."
        style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>}
      {p===2&&<textarea value={d.pensamento} onChange={e=>setD({...d,pensamento:e.target.value})}
        placeholder="Ex: Fiz algo errado. Vou ser demitida. Não sirvo para este trabalho..."
        style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>}
      {p===3&&<div>
        <TagsSelector opcoes={EMOCOES} selecionadas={d.emocoes} onChange={v=>setD({...d,emocoes:v})} cor={COR} bg={BG}/>
        {d.emocoes.length>0&&<div style={{marginTop:16}}>
          <SliderStep label={`Intensidade da ${d.emocoes[0]}`} valor={d.intensidade} onChange={v=>setD({...d,intensidade:v})} cor={COR} antes="Leve" depois="Muito intensa"/>
        </div>}
      </div>}
      {p===4&&<textarea value={d.sensacao} onChange={e=>setD({...d,sensacao:e.target.value})}
        placeholder="Ex: Aperto no peito, respiração acelerada, estômago contraído..."
        style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>}
      {p===5&&<TagsSelector opcoes={COMPORTAMENTOS} selecionadas={d.comportamentos} onChange={v=>setD({...d,comportamentos:v})} cor={COR} bg={BG}/>}
      {p===6&&<textarea value={d.reflexao} onChange={e=>setD({...d,reflexao:e.target.value})}
        placeholder="Ex: No passo 2 eu poderia ter respirado antes de catastrofizar..."
        style={{width:"100%",minHeight:90,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>}
      <NavButtons passo={p} total={PASSOS.length} onBack={()=>setP(p-1)} onNext={()=>setP(p+1)}
        onSave={()=>setSalvo(true)} podeProsseguir={pInfo.valido}/>
    </div>
  );
}

// ── 2. Plano de Ativação Comportamental ──────────────────────────
function FerramentaBehavioralActivation({ user }){
  const COR="#059669"; const BG="#dcfce7";
  const PRAZER_OPCOES=[
    {v:"musica",l:"Ouvir música",e:"🎵"},{v:"banho",l:"Banho quente",e:"🚿"},
    {v:"caminhada",l:"Caminhar",e:"🚶"},{v:"ligar",l:"Ligar para alguém",e:"📞"},
    {v:"serie",l:"Assistir série",e:"📺"},{v:"ler",l:"Ler",e:"📚"},
    {v:"cozinhar",l:"Cozinhar",e:"🍳"},{v:"natureza",l:"Ficar na natureza",e:"🌿"},
  ];
  const DOMINIO_OPCOES=[
    {v:"louça",l:"Lavar a louça",e:"🍽️"},{v:"email",l:"Responder email",e:"📧"},
    {v:"gaveta",l:"Arrumar gaveta",e:"🗂️"},{v:"compras",l:"Lista de compras",e:"🛒"},
    {v:"roupa",l:"Dobrar roupa",e:"👕"},{v:"mensagem",l:"Enviar mensagem",e:"💬"},
    {v:"tarefa",l:"Uma tarefa pendente",e:"✅"},{v:"ambiente",l:"Organizar ambiente",e:"🏠"},
  ];
  const [p,setP]=useState(0);
  const [prazer,setPrazer]=useState([]);
  const [dominio,setDominio]=useState([]);
  const [escolhaPrazer,setEscolhaPrazer]=useState("");
  const [escolhaDominio,setEscolhaDominio]=useState("");
  const [horaPrazer,setHoraPrazer]=useState("");
  const [horaDominio,setHoraDominio]=useState("");
  const [humorAntes,setHumorAntes]=useState(5);
  const [humorDepois,setHumorDepois]=useState(5);
  const [feito,setFeito]=useState({prazer:false,dominio:false});
  const [salvo,setSalvo]=useState(false);

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>⚡</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Plano registrado!</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:8,lineHeight:1.6}}>
        Humor antes: <strong>{humorAntes}/10</strong> → depois: <strong>{humorDepois}/10</strong>
      </div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24}}>A ação gerou a motivação. 💜</div>
      <button onClick={()=>{setPrazer([]);setDominio([]);setEscolhaPrazer("");setEscolhaDominio("");setHoraPrazer("");setHoraDominio("");setHumorAntes(5);setHumorDepois(5);setFeito({prazer:false,dominio:false});setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Novo plano
      </button>
    </div>
  );

  return (
    <div>
      <StepProgress passo={p} total={5} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Humor agora" subtitulo="Como está se sentindo antes de começar?" dica="Seja honesto — não há resposta certa." cor={COR} bg={BG}/>
        <SliderStep label="Meu humor agora" valor={humorAntes} onChange={setHumorAntes} cor={COR} antes="Muito mal" depois="Muito bem"/>
        <NavButtons passo={p} total={5} onNext={()=>setP(1)} podeProsseguir={true}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Atividades de prazer" subtitulo="O que pode dar leveza hoje?" dica="Escolha opções pequenas — possíveis mesmo num dia difícil." cor={COR} bg={BG}/>
        <TagsSelector opcoes={PRAZER_OPCOES} selecionadas={prazer} onChange={setPrazer} cor={COR} bg={BG}/>
        <NavButtons passo={p} total={5} onBack={()=>setP(0)} onNext={()=>setP(2)} podeProsseguir={prazer.length>0}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="Atividades de domínio" subtitulo="O que pode concluir hoje?" dica="Tarefas pequenas que dão sensação de capacidade quando concluídas." cor={COR} bg={BG}/>
        <TagsSelector opcoes={DOMINIO_OPCOES} selecionadas={dominio} onChange={setDominio} cor={COR} bg={BG}/>
        <NavButtons passo={p} total={5} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={dominio.length>0}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Agenda do dia" subtitulo="Defina a hora exata de cada atividade" dica="Hora definida = muito mais chance de acontecer." cor={COR} bg={BG}/>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6,display:"block"}}>
            Prazer — {PRAZER_OPCOES.find(x=>x.v===prazer[0])?.l||prazer[0]}
          </label>
          <input type="time" value={horaPrazer} onChange={e=>setHoraPrazer(e.target.value)}
            style={{padding:"8px 12px",borderRadius:8,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
        </div>
        <div>
          <label style={{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:6,display:"block"}}>
            Domínio — {DOMINIO_OPCOES.find(x=>x.v===dominio[0])?.l||dominio[0]}
          </label>
          <input type="time" value={horaDominio} onChange={e=>setHoraDominio(e.target.value)}
            style={{padding:"8px 12px",borderRadius:8,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",outline:"none"}}/>
        </div>
        <NavButtons passo={p} total={5} onBack={()=>setP(2)} onNext={()=>setP(4)} podeProsseguir={horaPrazer.length>0&&horaDominio.length>0}/>
      </div>}
      {p===4&&<div>
        <StepHeader letra="5" titulo="Como ficou?" subtitulo="Registre após realizar as atividades" dica="Marque o que fez e avalie o humor depois." cor={COR} bg={BG}/>
        <div style={{marginBottom:16}}>
          {[{k:"prazer",l:"Atividade de prazer feita"},{k:"dominio",l:"Atividade de domínio feita"}].map(item=>(
            <div key={item.k} onClick={()=>setFeito(f=>({...f,[item.k]:!f[item.k]}))}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px",borderRadius:10,
                border:"1.5px solid",marginBottom:8,cursor:"pointer",
                borderColor:feito[item.k]?COR:"var(--gray-200)",
                background:feito[item.k]?BG:"white"}}>
              <div style={{width:22,height:22,borderRadius:"50%",border:"2px solid",flexShrink:0,
                borderColor:feito[item.k]?COR:"var(--gray-300)",
                background:feito[item.k]?COR:"white",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {feito[item.k]&&<span style={{color:"white",fontSize:13}}>✓</span>}
              </div>
              <span style={{fontSize:13,fontWeight:feito[item.k]?700:400,color:feito[item.k]?COR:"var(--text-muted)"}}>{item.l}</span>
            </div>
          ))}
        </div>
        <SliderStep label="Meu humor agora" valor={humorDepois} onChange={setHumorDepois} cor={COR} antes="Muito mal" depois="Muito bem"/>
        <NavButtons passo={p} total={5} onBack={()=>setP(3)} onSave={()=>setSalvo(true)} podeProsseguir={true}/>
      </div>}
    </div>
  );
}

// ── 3. Kit SOS — TIPP ────────────────────────────────────────────
function FerramentaTIPP({ user }){
  const COR="#dc2626"; const BG="#fee2e2";
  const FASES=[
    {id:"T",titulo:"T — Temperatura",instrucao:"Mergulhe o rosto em água fria 15-30s ou segure gelo nas mãos.",
     tipo:"timer",dur:30,cor:"#0891b2",bg:"#e0f2fe"},
    {id:"I",titulo:"I — Intensidade",instrucao:"Jumping jacks, correr no lugar ou flexões por 60 segundos.",
     tipo:"timer",dur:60,cor:"#d97706",bg:"#fef3c7"},
    {id:"P1",titulo:"P — Pace respiratório",instrucao:"Inspire 4s → Expire 8s. Repita 5 vezes.",
     tipo:"timer",dur:60,cor:"#7c3aed",bg:"#ede9fe"},
    {id:"P2",titulo:"P — Relaxamento muscular",instrucao:"Contraia e solte grupos musculares dos pés à cabeça. 5s contraído, 10s solto.",
     tipo:"check",cor:"#059669",bg:"#dcfce7"},
  ];
  const [p,setP]=useState(-1); // -1=intro
  const [intensAntes,setIntensAntes]=useState(8);
  const [intensDepois,setIntensDepois]=useState(8);
  const [checks,setChecks]=useState({});
  const [tempoRestante,setTempoRestante]=useState(0);
  const [rodando,setRodando]=useState(false);
  const [faseConcluida,setFaseConcluida]=useState({});
  const timerRef = React.useRef(null);

  function iniciarTimer(dur){
    setTempoRestante(dur);
    setRodando(true);
  }

  React.useEffect(()=>{
    if(!rodando) return;
    timerRef.current = setInterval(()=>{
      setTempoRestante(t=>{
        if(t<=1){ clearInterval(timerRef.current); setRodando(false); setFaseConcluida(f=>({...f,[p]:true})); return 0; }
        return t-1;
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[rodando,p]);

  if(p===-1) return(
    <div>
      <div style={{background:BG,borderRadius:12,padding:"16px",marginBottom:20,borderLeft:"3px solid "+COR}}>
        <div style={{fontWeight:700,fontSize:13,color:COR,marginBottom:6}}>Kit SOS Emocional — Técnica TIPP</div>
        <div style={{fontSize:13,color:"#7f1d1d",lineHeight:1.6}}>Esta técnica ativa o sistema nervoso parassimpático em minutos. Use quando estiver em pico emocional.</div>
      </div>
      <div style={{marginBottom:20}}>
        <SliderStep label="Intensidade emocional agora" valor={intensAntes} onChange={setIntensAntes} cor={COR} antes="Baixa" depois="Muito alta"/>
      </div>
      <button onClick={()=>setP(0)}
        style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>
        Iniciar SOS →
      </button>
    </div>
  );

  if(p>=FASES.length) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>🧘</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:"#059669",marginBottom:12}}>
        TIPP concluído!
      </div>
      <div style={{marginBottom:20}}>
        <SliderStep label="Intensidade emocional agora" valor={intensDepois} onChange={setIntensDepois} cor="#059669" antes="Baixa" depois="Muito alta"/>
      </div>
      {intensDepois<intensAntes&&<div style={{background:"#dcfce7",borderRadius:10,padding:"12px",fontSize:13,color:"#166534",marginBottom:20}}>
        ✓ Redução de {intensAntes-intensDepois} pontos. O seu sistema nervoso respondeu. 💜
      </div>}
      <button onClick={()=>{setP(-1);setFaseConcluida({});setChecks({});setRodando(false);setIntensAntes(8);setIntensDepois(8);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Usar novamente
      </button>
    </div>
  );

  const fase = FASES[p];
  const concluida = faseConcluida[p];

  return(
    <div>
      <StepProgress passo={p} total={FASES.length} cor={COR}/>
      <div style={{background:fase.bg,borderRadius:12,padding:"14px 16px",marginBottom:16,borderLeft:"3px solid "+fase.cor}}>
        <div style={{fontWeight:700,fontSize:14,color:fase.cor,marginBottom:4}}>{fase.titulo}</div>
        <div style={{fontSize:13,color:"var(--text)",lineHeight:1.6}}>{fase.instrucao}</div>
      </div>

      {fase.tipo==="timer"&&<div style={{textAlign:"center",marginBottom:16}}>
        {!rodando&&!concluida&&<button onClick={()=>iniciarTimer(fase.dur)}
          style={{padding:"12px 28px",borderRadius:10,border:"none",background:fase.cor,color:"white",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>
          ▶ Iniciar ({fase.dur}s)
        </button>}
        {rodando&&<div>
          <div style={{width:90,height:90,borderRadius:"50%",border:"3px solid "+fase.cor,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <div style={{fontSize:28,fontWeight:700,color:fase.cor}}>{tempoRestante}</div>
            <div style={{fontSize:10,color:"var(--text-muted)"}}>seg</div>
          </div>
          <div style={{background:"var(--gray-100)",borderRadius:20,height:5,marginBottom:12}}>
            <div style={{width:((fase.dur-tempoRestante)/fase.dur*100)+"%",height:"100%",borderRadius:20,background:fase.cor,transition:"width 1s linear"}}/>
          </div>
        </div>}
        {concluida&&<div style={{background:fase.bg,borderRadius:10,padding:"12px",fontSize:13,fontWeight:600,color:fase.cor}}>
          ✓ Concluído!
        </div>}
      </div>}

      {fase.tipo==="check"&&<div style={{marginBottom:16}}>
        {["Pés e pernas","Abdômen","Ombros e braços","Rosto e pescoço"].map(m=>(
          <div key={m} onClick={()=>setChecks(c=>({...c,[m]:!c[m]}))}
            style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:10,
              border:"1.5px solid",marginBottom:8,cursor:"pointer",
              borderColor:checks[m]?fase.cor:"var(--gray-200)",
              background:checks[m]?fase.bg:"white"}}>
            <div style={{width:20,height:20,borderRadius:"50%",border:"2px solid",flexShrink:0,
              borderColor:checks[m]?fase.cor:"var(--gray-300)",background:checks[m]?fase.cor:"white",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              {checks[m]&&<span style={{color:"white",fontSize:11}}>✓</span>}
            </div>
            <span style={{fontSize:13,color:checks[m]?fase.cor:"var(--text-muted)"}}>{m}</span>
          </div>
        ))}
      </div>}

      <div style={{display:"flex",gap:8,marginTop:8}}>
        {p>0&&<button onClick={()=>{setP(p-1);setRodando(false);clearInterval(timerRef.current);}}
          style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
          ← Voltar
        </button>}
        <button onClick={()=>{setP(p+1);setRodando(false);clearInterval(timerRef.current);}}
          disabled={fase.tipo==="timer"&&!concluida&&!rodando===false&&tempoRestante>0}
          style={{flex:2,padding:"10px",borderRadius:10,border:"none",
            background:fase.cor,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
          {p===FASES.length-1?"Ver resultado →":"Próxima etapa →"}
        </button>
      </div>
    </div>
  );
}

// ── 4. Pausa Estratégica ──────────────────────────────────────────
function FerramentaStrategicPause({ user }){
  const COR="#7c3aed"; const BG="#ede9fe";
  const SINAIS=[
    {v:"voz",l:"Voz que sobe"},{v:"peito",l:"Aperto no peito"},
    {v:"rapido",l:"Pensamentos acelerados"},{v:"chorar",l:"Vontade de chorar"},
    {v:"fugir",l:"Vontade de sair"},{v:"atacar",l:"Vontade de atacar"},
    {v:"travar",l:"Travar/congelar"},{v:"sarcasmo",l:"Sarcasmo automático"},
  ];
  const [p,setP]=useState(0);
  const [sinais,setSinais]=useState([]);
  const [anunciou,setAnunciou]=useState(false);
  const [tempoPausa,setTempoPausa]=useState(20);
  const [rodando,setRodando]=useState(false);
  const [tempoRestante,setTempoRestante]=useState(20*60);
  const [ativou,setAtivou]=useState([]);
  const [pronto,setPronto]=useState(null);
  const timerRef=React.useRef(null);

  React.useEffect(()=>{
    if(!rodando) return;
    timerRef.current=setInterval(()=>{
      setTempoRestante(t=>{
        if(t<=1){clearInterval(timerRef.current);setRodando(false);return 0;}
        return t-1;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[rodando]);

  const min=Math.floor(tempoRestante/60);
  const seg=tempoRestante%60;

  return(
    <div>
      <StepProgress passo={p} total={4} cor={COR}/>
      {p===0&&<div>
        <StepHeader letra="1" titulo="Seus sinais de alarme" subtitulo="O que sente quando está sendo sequestrado?" dica="Reconhecer o sinal é o primeiro passo para a pausa." cor={COR} bg={BG}/>
        <TagsSelector opcoes={SINAIS} selecionadas={sinais} onChange={setSinais} cor={COR} bg={BG}/>
        <NavButtons passo={p} total={4} onNext={()=>setP(1)} podeProsseguir={sinais.length>0}/>
      </div>}
      {p===1&&<div>
        <StepHeader letra="2" titulo="Anuncie a pausa" subtitulo="Não saia sem avisar" dica='"Preciso de 20 minutos. Não estou fugindo — vou voltar para resolvermos isso."' cor={COR} bg={BG}/>
        <div onClick={()=>setAnunciou(!anunciou)}
          style={{display:"flex",alignItems:"center",gap:10,padding:"14px",borderRadius:12,
            border:"1.5px solid",cursor:"pointer",marginBottom:16,
            borderColor:anunciou?COR:"var(--gray-200)",background:anunciou?BG:"white"}}>
          <div style={{width:22,height:22,borderRadius:"50%",border:"2px solid",flexShrink:0,
            borderColor:anunciou?COR:"var(--gray-300)",background:anunciou?COR:"white",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            {anunciou&&<span style={{color:"white",fontSize:12}}>✓</span>}
          </div>
          <span style={{fontSize:13,fontWeight:anunciou?700:400,color:anunciou?COR:"var(--text-muted)"}}>
            Avisei a outra pessoa que vou fazer uma pausa
          </span>
        </div>
        <NavButtons passo={p} total={4} onBack={()=>setP(0)} onNext={()=>{setTempoRestante(tempoPausa*60);setP(2);}} podeProsseguir={anunciou}/>
      </div>}
      {p===2&&<div>
        <StepHeader letra="3" titulo="Pausa de 20 minutos" subtitulo="Não alimente a raiva durante a pausa" dica="Evite rever a conversa mentalmente. Caminhe, beba água, respire." cor={COR} bg={BG}/>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{width:100,height:100,borderRadius:"50%",border:"3px solid "+COR,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <div style={{fontSize:26,fontWeight:700,color:COR}}>{min}:{seg.toString().padStart(2,"0")}</div>
            <div style={{fontSize:10,color:"var(--text-muted)"}}>restantes</div>
          </div>
          {!rodando&&tempoRestante===tempoPausa*60&&<button onClick={()=>setRodando(true)}
            style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
            Iniciar pausa
          </button>}
          {rodando&&<button onClick={()=>{setRodando(false);clearInterval(timerRef.current);}}
            style={{padding:"8px 20px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
            Pausar timer
          </button>}
        </div>
        <NavButtons passo={p} total={4} onBack={()=>setP(1)} onNext={()=>setP(3)} podeProsseguir={true}/>
      </div>}
      {p===3&&<div>
        <StepHeader letra="4" titulo="Você está pronto?" subtitulo="Antes de voltar, verifique" dica="Só volte ao assunto quando conseguir falar com tom calmo e acesso ao raciocínio." cor={COR} bg={BG}/>
        <div style={{marginBottom:16}}>
          {["Voz está calma","Corpo está relaxado","Consigo ouvir sem contra-atacar","Tenho acesso ao raciocínio"].map(item=>(
            <div key={item} onClick={()=>setAtivou(a=>a.includes(item)?a.filter(x=>x!==item):[...a,item])}
              style={{display:"flex",alignItems:"center",gap:10,padding:"11px",borderRadius:10,
                border:"1.5px solid",marginBottom:8,cursor:"pointer",
                borderColor:ativou.includes(item)?COR:"var(--gray-200)",background:ativou.includes(item)?BG:"white"}}>
              <div style={{width:20,height:20,borderRadius:"50%",border:"2px solid",flexShrink:0,
                borderColor:ativou.includes(item)?COR:"var(--gray-300)",background:ativou.includes(item)?COR:"white",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                {ativou.includes(item)&&<span style={{color:"white",fontSize:11}}>✓</span>}
              </div>
              <span style={{fontSize:13,color:ativou.includes(item)?COR:"var(--text-muted)"}}>{item}</span>
            </div>
          ))}
        </div>
        {ativou.length>=3&&<div style={{background:BG,borderRadius:10,padding:"12px",fontSize:13,color:COR,fontWeight:600,marginBottom:16}}>
          ✓ Pronto para retomar a conversa com equilíbrio.
        </div>}
        {ativou.length<3&&<div style={{background:"#fef3c7",borderRadius:10,padding:"12px",fontSize:13,color:"#854F0B",marginBottom:16}}>
          Ainda não — aguarde mais um pouco ou estenda a pausa.
        </div>}
        <NavButtons passo={p} total={4} onBack={()=>setP(2)} onSave={()=>setPronto(ativou.length>=3)} podeProsseguir={true}/>
      </div>}
      {pronto!==null&&<div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{fontSize:48,marginBottom:12}}>{pronto?"🕊️":"⏳"}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:pronto?COR:"#d97706",marginBottom:16}}>
          {pronto?"Pausa concluída com sucesso!":"Mais um pouco de pausa"}
        </div>
        <button onClick={()=>{setSinais([]);setAnunciou(false);setAtivou([]);setPronto(null);setTempoRestante(20*60);setP(0);}}
          style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
          Reiniciar
        </button>
      </div>}
    </div>
  );
}

// ── 5. Diário de Autocompaixão ────────────────────────────────────
function FerramentaSelfCompassion({ user }){
  const COR="#d97706"; const BG="#fef3c7";
  const [p,setP]=useState(0);
  const [situacao,setSituacao]=useState("");
  const [juiz,setJuiz]=useState("");
  const [amigo,setAmigo]=useState("");
  const [reescrita,setReescrita]=useState("");
  const [acao,setAcao]=useState("");
  const [salvo,setSalvo]=useState(false);

  if(salvo) return(
    <div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:56,marginBottom:12}}>💛</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:COR,marginBottom:8}}>Autocompaixão registrada!</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24,lineHeight:1.6}}>
        Você praticou falar consigo mesmo com a gentileza que merece. 💜
      </div>
      <button onClick={()=>{setSituacao("");setJuiz("");setAmigo("");setReescrita("");setAcao("");setP(0);setSalvo(false);}}
        style={{padding:"10px 24px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Nova entrada
      </button>
    </div>
  );

  const PASSOS=[
    {letra:"1",titulo:"A situação",subtitulo:"O que aconteceu?",
     dica:"Descreva brevemente algo que correu mal ou que está fazendo você se sentir mal consigo mesmo.",
     campo:<textarea value={situacao} onChange={e=>setSituacao(e.target.value)} placeholder="Ex: Esqueci de um compromisso importante e decepcionei alguém..." style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>,
     valido:situacao.trim().length>5},
    {letra:"2",titulo:"O juiz interno",subtitulo:"O que a voz crítica está dizendo?",
     dica:"Escreva exatamente os pensamentos autocríticos que surgem. Sem filtro.",
     campo:<textarea value={juiz} onChange={e=>setJuiz(e.target.value)} placeholder="Ex: Que idiota. Sou irresponsável. Nunca faço nada certo..." style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>,
     valido:juiz.trim().length>5},
    {letra:"3",titulo:"O amigo que ama",subtitulo:"O que diria ao seu melhor amigo?",
     dica:"Imagine-o passando pela mesma situação. Escreva exatamente o que você diria a ele — com o tom que usaria.",
     campo:<textarea value={amigo} onChange={e=>setAmigo(e.target.value)} placeholder="Ex: Acontece, você não é perfeito. O que importa é como vai reparar..." style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>,
     valido:amigo.trim().length>5},
    {letra:"4",titulo:"Reescreva para si",subtitulo:"Agora fale consigo com essa mesma gentileza",
     dica:"Use o mesmo tom que usou com o amigo — rigoroso mas gentil. Reconheça o erro sem atacar a identidade.",
     campo:<textarea value={reescrita} onChange={e=>setReescrita(e.target.value)} placeholder="Ex: Cometi um erro e isso não me define. Posso pedir desculpa e fazer diferente..." style={{width:"100%",minHeight:80,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>,
     valido:reescrita.trim().length>5},
    {letra:"5",titulo:"Um passo pequeno",subtitulo:"O que pode fazer agora?",
     dica:"Uma ação concreta e pequena. Não precisa resolver tudo — só o próximo passo.",
     campo:<textarea value={acao} onChange={e=>setAcao(e.target.value)} placeholder="Ex: Vou enviar uma mensagem pedindo desculpa ainda hoje..." style={{width:"100%",minHeight:70,padding:"11px",borderRadius:10,border:"1.5px solid "+COR+"50",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.6,boxSizing:"border-box",outline:"none"}}/>,
     valido:true},
  ];

  const pInfo=PASSOS[p];
  return(
    <div>
      <StepProgress passo={p} total={PASSOS.length} cor={COR}/>
      <StepHeader letra={pInfo.letra} titulo={pInfo.titulo} subtitulo={pInfo.subtitulo} dica={pInfo.dica} cor={COR} bg={BG}/>
      {pInfo.campo}
      {p===1&&juiz.length>10&&<div style={{background:"#f3f4f6",borderRadius:10,padding:"10px 12px",marginTop:10,fontSize:12,color:"var(--text-muted)",fontStyle:"italic"}}>
        💭 Você diria isso a alguém que ama? Guarde essa pergunta para o próximo passo.
      </div>}
      <NavButtons passo={p} total={PASSOS.length} onBack={()=>setP(p-1)} onNext={()=>setP(p+1)} onSave={()=>setSalvo(true)} podeProsseguir={pInfo.valido}/>
    </div>
  );
}

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
    // macro_corpo
    if(k==="polyvagal-ladder")    return <FerramentaPolyvagal user={user}/>;
    if(k==="grounding-5senses")   return <FerramentaGrounding user={user}/>;
    if(k==="body-mind-journal")   return <FerramentaBodyMind user={user}/>;
    if(k==="wheel-of-life")       return <FerramentaWheelOfLife user={user}/>;
    // macro_casais
    if(k==="differentiation-map")        return <FerramentaDifferentiation user={user}/>;
    if(k==="triangulation-map")          return <FerramentaTriangulation user={user}/>;
    if(k==="compassionate-parenting-journal") return <FerramentaCompassionateParenting user={user}/>;
    if(k==="financial-three-maps")       return <FerramentaFinancialMaps user={user}/>;
    if(k==="intimacy-map")               return <FerramentaIntimacyMap user={user}/>;
    // macro_relacionamentos
    if(k==="cnv-record")            return <FerramentaCNV user={user}/>;
    if(k==="limits-map")            return <FerramentaLimitsMap user={user}/>;
    if(k==="mental-load-inventory") return <FerramentaMentalLoad user={user}/>;
    if(k==="conflict-cycle-map")    return <FerramentaConflictCycle user={user}/>;
    if(k==="active-listening")      return <FerramentaActiveListening user={user}/>;
    // macro_habitos
    if(k==="sleep-ritual")       return <FerramentaSleepRitual user={user}/>;
    if(k==="five-minute-rule")   return <FerramentaFiveMinute user={user}/>;
    if(k==="habit-stacking")     return <FerramentaHabitStacking user={user}/>;
    if(k==="energy-map")         return <FerramentaEnergyMap user={user}/>;
    // macro_humor
    if(k==="chain-analysis")      return <FerramentaChainAnalysis user={user}/>;
    if(k==="behavioral-activation") return <FerramentaBehavioralActivation user={user}/>;
    if(k==="tipp-sos")            return <FerramentaTIPP user={user}/>;
    if(k==="strategic-pause")     return <FerramentaStrategicPause user={user}/>;
    if(k==="self-compassion-journal") return <FerramentaSelfCompassion user={user}/>;

    // Fallback: mostra conteúdo dos campos passos e objetivo para ferramentas sem componente interativo
    if(recurso.passos || recurso.objetivo) return (
      <div style={{padding:"4px 0"}}>
        {recurso.objetivo&&(
          <div style={{background:"var(--purple-soft)",borderRadius:10,padding:"14px 16px",marginBottom:20,border:"1px solid #e9d5ff"}}>
            <div style={{fontWeight:700,fontSize:12,color:"var(--purple)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>🎯 Objetivo Terapêutico</div>
            <div style={{fontSize:13,color:"#3d006a",lineHeight:1.7}}>{recurso.objetivo}</div>
          </div>
        )}
        {recurso.passos&&(
          <div>
            <div style={{fontWeight:700,fontSize:12,color:"var(--text-muted)",marginBottom:12,textTransform:"uppercase",letterSpacing:"0.5px"}}>📋 Passo a Passo</div>
            {recurso.passos.split(/(?=\d+\.)/).filter(Boolean).map((passo,i)=>{
              const linhas = passo.trim().split("\n");
              const titulo = linhas[0];
              const corpo = linhas.slice(1).join("\n").trim();
              return (
                <div key={i} style={{background:"white",border:"1px solid var(--gray-100)",borderRadius:10,padding:"12px 16px",marginBottom:10,borderLeft:"3px solid var(--purple)"}}>
                  <div style={{fontWeight:700,fontSize:13,color:"var(--purple)",marginBottom:corpo?6:0}}>{titulo}</div>
                  {corpo&&<div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{corpo}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

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
    // Garante que breathing-478 e muscle-relaxation ficam visíveis com categoria ansiedade
    const snapAnsi = await db.collection("clinica_recursos")
      .where("formularioKey","in",["breathing-478","muscle-relaxation"]).get();
    for(const doc of snapAnsi.docs){
      const cat = doc.data().categoria;
      if(!["tcc","ansiedade","emocoes","autocuidado","relacionamentos","corpo","esquema","musicoterapia","avaliacao","outro"].includes(cat)){
        await doc.ref.update({categoria:"ansiedade"});
      }
    }
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

  // Agrupa por macrocategoria
  const filtradas = filtro==="todos"
    ? fabulas
    : fabulas.filter(f=>{
        const macro = MACROCATEGORIAS.find(m=>m.id===filtro);
        if(macro){ return FAB_LEGADO_MACRO[f.categoria||"outro"]===filtro || f.categoria===filtro; }
        return (f.categoria||"outro")===filtro;
      });

  // Para o grid: agrupa por macro
  const porMacro = MACROCATEGORIAS.map(m=>{
    const itens = filtradas.filter(f=>FAB_LEGADO_MACRO[f.categoria||"outro"]===m.id || f.categoria===m.id);
    return {...m, itens};
  }).filter(m=>m.itens.length>0);
  // Órfãos
  const macroIds = new Set(Object.values(FAB_LEGADO_MACRO));
  const orfaos = filtradas.filter(f=>!macroIds.has(f.categoria) && !FAB_LEGADO_MACRO[f.categoria||""]);

  return (
    <div>
      {/* Filtros por macrocategoria */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap",paddingBottom:4}}>
        <button onClick={()=>setFiltro("todos")}
          style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid",whiteSpace:"nowrap",flexShrink:0,
            borderColor:filtro==="todos"?"var(--purple)":"#e5e7eb",
            background:filtro==="todos"?"var(--purple)":"white",
            color:filtro==="todos"?"white":"var(--gray-600)",
            fontSize:12,fontWeight:600,cursor:"pointer"}}>
          📚 Todas ({fabulas.length})
        </button>
        {MACROCATEGORIAS.map(m=>{
          const n = fabulas.filter(f=>FAB_LEGADO_MACRO[f.categoria||"outro"]===m.id||f.categoria===m.id).length;
          if(n===0) return null;
          const ativo = filtro===m.id;
          return(
            <button key={m.id} onClick={()=>setFiltro(ativo?"todos":m.id)}
              style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid",whiteSpace:"nowrap",flexShrink:0,
                borderColor:ativo?m.cor:m.cor+"50",background:ativo?m.cor:m.bg,
                color:ativo?"white":m.cor,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              {m.icone} {m.label} ({n})
            </button>
          );
        })}
      </div>

      {[...porMacro, ...(orfaos.length>0?[{id:"_orfaos",label:"Sem Categoria",cor:"#6b7280",bg:"#f3f4f6",icone:"🔧",itens:orfaos}]:[])].map(grupo=>{
        const c = {cor:grupo.cor, bg:grupo.bg, label:grupo.label};
        return (
          <div key={grupo.id} style={{marginBottom:28}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:8,borderBottom:"1px solid var(--gray-100)"}}>
              <span style={{fontSize:16}}>{grupo.icone}</span>
              <span style={{fontWeight:700,fontSize:11,color:c.cor,textTransform:"uppercase",letterSpacing:"0.8px"}}>{c.label}</span>
              <span style={{background:c.bg,color:c.cor,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{grupo.itens.length}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
              {grupo.itens.map(f=>(
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
  const [passo, setPasso] = React.useState(0);
  const [resps, setResps] = React.useState({outro:"", ambiente:"", eu:""});

  const FATIAS = [
    {key:"outro",    cor:"#0EA5E9", label:"O Outro",     emoji:"👤", angIni:270, angFim:390},
    {key:"ambiente", cor:"#22C55E", label:"O Ambiente",  emoji:"🌍", angIni:390, angFim:510},
    {key:"eu",       cor:"#7B00C4", label:"Eu",          emoji:"🫵", angIni:510, angFim:630},
  ];

  function fatiaPath(cx,cy,r,angIni,angFim){
    const a1 = (angIni-90)*Math.PI/180;
    const a2 = (angFim-90)*Math.PI/180;
    const x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
    const x2=cx+r*Math.cos(a2), y2=cy+r*Math.sin(a2);
    return `M${cx},${cy} L${x1},${y1} A${r},${r},0,0,1,${x2},${y2} Z`;
  }

  function labelPos(cx,cy,r,angIni,angFim){
    const mid = ((angIni+angFim)/2-90)*Math.PI/180;
    return {x:cx+(r*0.65)*Math.cos(mid), y:cy+(r*0.65)*Math.sin(mid)};
  }

  const PERGUNTAS = [
    {key:"outro",    titulo:"1️⃣ O que o OUTRO fez ou deixou de fazer?",    sub:"Seja honesto. Qual foi a parte de responsabilidade da outra pessoa nessa situação?", placeholder:"Ex: Ele não comunicou claramente o que esperava de mim..."},
    {key:"ambiente", titulo:"2️⃣ O que o AMBIENTE ou contexto contribuiu?", sub:"Circunstâncias, pressões externas, cultura, recursos disponíveis — o que estava fora do seu controle?", placeholder:"Ex: A situação era nova para todos, não havia um processo claro..."},
    {key:"eu",       titulo:"3️⃣ O que EU fiz ou deixei de fazer?",         sub:"Agora, com a perspectiva dos outros dois terços avaliados, qual é a sua parte real? E mais importante: você está fazendo os seus 33,33%?", placeholder:"Ex: Eu poderia ter pedido mais clareza antes de agir..."},
  ];

  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      {/* Header */}
      <div style={{background:"#7B00C4",borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🍕</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:600,marginBottom:6}}>A Pizza da Responsabilidade</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Toda situação tem 3 fatias iguais de 33,33%: o outro, o ambiente e você.</div>
      </div>

      {/* Pizza visual */}
      <div style={{background:"#f9f0ff",padding:"20px",textAlign:"center",borderBottom:"1px solid #e8c8ff"}}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          {FATIAS.map(f=>(
            <path key={f.key} d={fatiaPath(90,90,80,f.angIni,f.angFim)} fill={f.cor}
              stroke="white" strokeWidth="2"/>
          ))}
          {FATIAS.map(f=>{
            const pos = labelPos(90,90,80,f.angIni,f.angFim);
            return (
              <g key={f.key}>
                <text x={pos.x} y={pos.y-6} textAnchor="middle" fill="white" fontSize="16">{f.emoji}</text>
                <text x={pos.x} y={pos.y+10} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{f.label}</text>
                <text x={pos.x} y={pos.y+20} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="8">33,33%</text>
              </g>
            );
          })}
        </svg>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8}}>
          {FATIAS.map(f=>(
            <div key={f.key} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:f.cor}}/>
              <span style={{fontSize:11,color:"#5a0090"}}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Conceito */}
      <div style={{background:"white",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:12,fontWeight:600,marginBottom:8}}>Por que isso importa?</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:"#fff0f0",borderRadius:8,padding:"10px 12px",border:"1px solid #fca5a5"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#dc2626",marginBottom:4}}>😔 Autoculpa tóxica</div>
            <div style={{fontSize:11,color:"#7f1d1d",lineHeight:1.4}}>Assume 100% e carrega o peso dos outros dois terços que não são seus.</div>
          </div>
          <div style={{background:"#fff7ed",borderRadius:8,padding:"10px 12px",border:"1px solid #fed7aa"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#c2410c",marginBottom:4}}>😤 Vitimização</div>
            <div style={{fontSize:11,color:"#7c2d12",lineHeight:1.4}}>Isenta-se completamente e perde o poder de mudar a sua parte real.</div>
          </div>
        </div>
      </div>

      {/* Exercício guiado */}
      <div style={{background:"#f9f0ff",padding:"14px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:"#7B00C4",fontSize:13,fontWeight:600,marginBottom:12}}>🎯 Exercício — avalie uma situação difícil</div>

        {/* Progresso */}
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          {PERGUNTAS.map((p,i)=>(
            <div key={i} onClick={()=>setPasso(i)}
              style={{flex:1,height:4,borderRadius:4,cursor:"pointer",
                background:i<=passo?FATIAS[i].cor:"#e8c8ff",
                transition:"background .3s"}}>
            </div>
          ))}
        </div>

        {/* Passo atual */}
        <div style={{background:"white",borderRadius:10,padding:"14px 16px",border:`2px solid ${FATIAS[passo].cor}30`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:FATIAS[passo].cor,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
              {FATIAS[passo].emoji}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"#3d006a"}}>{PERGUNTAS[passo].titulo}</div>
              <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{PERGUNTAS[passo].sub}</div>
            </div>
          </div>
          <textarea
            value={resps[FATIAS[passo].key]}
            onChange={e=>setResps({...resps,[FATIAS[passo].key]:e.target.value})}
            placeholder={PERGUNTAS[passo].placeholder}
            style={{width:"100%",minHeight:80,padding:"8px 10px",borderRadius:8,
              border:`1px solid ${FATIAS[passo].cor}50`,fontSize:12,fontFamily:"inherit",
              resize:"vertical",lineHeight:1.5,boxSizing:"border-box"}}/>
        </div>

        {/* Navegação */}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
          <button onClick={()=>setPasso(Math.max(0,passo-1))} disabled={passo===0}
            style={{padding:"7px 16px",borderRadius:8,border:"1px solid #e8c8ff",
              background:"white",color:"#7B00C4",cursor:passo===0?"not-allowed":"pointer",
              fontSize:12,fontFamily:"inherit",opacity:passo===0?0.4:1}}>
            ← Anterior
          </button>
          {passo<2
            ? <button onClick={()=>setPasso(passo+1)}
                style={{padding:"7px 16px",borderRadius:8,border:"none",
                  background:FATIAS[passo].cor,color:"white",cursor:"pointer",
                  fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                Próximo →
              </button>
            : <button onClick={()=>setPasso(0)}
                style={{padding:"7px 16px",borderRadius:8,border:"none",
                  background:"#7B00C4",color:"white",cursor:"pointer",
                  fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                Recomeçar 🔄
              </button>
          }
        </div>
      </div>

      {/* Reflexão final */}
      <div style={{background:"#f3e6ff",borderRadius:"0 0 12px 12px",padding:"14px 20px",borderTop:"2px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:600,marginBottom:6}}>💜 Reflexão final</div>
        <div style={{fontSize:12,color:"#3d006a",lineHeight:1.7}}>
          Depois de avaliar o outro e o ambiente, olhe para a sua fatia com honestidade:<br/>
          <strong>Você está fazendo os seus 33,33%?</strong><br/>
          Não 100% — só a sua parte. E isso já é o suficiente para começar a mudar.
        </div>
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

// Mapa legado → macro para fábulas
const FAB_LEGADO_MACRO = {
  "resiliencia":"macro_habitos", "resiliência":"macro_habitos",
  "crescimento":"macro_habitos", "mindfulness":"macro_habitos",
  "perspectiva":"macro_habitos", "habitos":"macro_habitos",
  "esperanca":"macro_humor", "esperança":"macro_humor",
  "autoconfianca":"macro_humor", "autoconfiança":"macro_humor",
  "autoestima":"macro_humor", "emocoes":"macro_humor",
  "expressão emocional":"macro_humor", "expressao emocional":"macro_humor",
  "regulação emocional":"macro_humor", "regulacao emocional":"macro_humor",
  "coragem":"macro_humor", "perdao":"macro_humor", "perdão":"macro_humor",
  "autoconhecimento":"macro_ansiedade", "ansiedade":"macro_ansiedade",
  "tcc":"macro_ansiedade",
  "relacionamentos":"macro_relacionamentos",
  "casais":"macro_casais",
  "corpo":"macro_corpo",
  // já migradas
  "macro_ansiedade":"macro_ansiedade","macro_humor":"macro_humor",
  "macro_habitos":"macro_habitos","macro_relacionamentos":"macro_relacionamentos",
  "macro_casais":"macro_casais","macro_corpo":"macro_corpo",
};

// Mapa de visualizações

// ═══════════════════════════════════════════════════════════════════
// PSICOEDUCAÇÕES VISUAIS — Novas (macro_ansiedade, macro_humor, etc.)
// ═══════════════════════════════════════════════════════════════════

// Componente base reutilizável para todas as psicoeducações visuais
function PsicoVisualBase({ titulo, emoji, cor, bg, secoes, perguntas }){
  const [secao,   setSecao]   = useState(0);
  const [fase,    setFase]    = useState("leitura"); // leitura | reflexao | concluido
  const [respostas, setRespostas] = useState(Array(perguntas.length).fill(""));
  const [respIdx, setRespIdx] = useState(0);

  const total = secoes.length;
  const progresso = Math.round(((secao + (fase==="reflexao"?0.5:0)) / total) * 100);

  // ── Concluído ───────────────────────────────────────────────────
  if(fase==="concluido") return(
    <div>
      <div style={{background:cor,borderRadius:14,padding:"20px",marginBottom:20,color:"white",textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:8}}>{emoji}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,marginBottom:4}}>{titulo}</div>
        <div style={{fontSize:13,opacity:0.85}}>Leitura e reflexão concluídas 💜</div>
      </div>
      {respostas.some(r=>r.trim().length>0)&&(
        <div style={{background:"white",border:"1px solid var(--gray-200)",borderRadius:12,padding:"16px",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,color:cor,marginBottom:12}}>Suas reflexões</div>
          {perguntas.map((p,i)=>respostas[i].trim()&&(
            <div key={i} style={{marginBottom:12,paddingBottom:12,borderBottom:i<perguntas.length-1?"1px solid var(--gray-100)":"none"}}>
              <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4,fontStyle:"italic"}}>{p}</div>
              <div style={{fontSize:13,color:"var(--text)",lineHeight:1.6,background:bg,borderRadius:8,padding:"8px 12px"}}>{respostas[i]}</div>
            </div>
          ))}
        </div>
      )}
      <button onClick={()=>{setSecao(0);setFase("leitura");setRespostas(Array(perguntas.length).fill(""));setRespIdx(0);}}
        style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:cor,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
        Rever conteúdo
      </button>
    </div>
  );

  // ── Reflexão ────────────────────────────────────────────────────
  if(fase==="reflexao") return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <div style={{flex:1,background:"var(--gray-100)",borderRadius:20,height:5}}>
          <div style={{width:progresso+"%",height:"100%",borderRadius:20,background:cor,transition:"width .3s"}}/>
        </div>
        <span style={{fontSize:11,color:"var(--text-muted)",flexShrink:0}}>{secao+1}/{total}</span>
      </div>

      {/* Caderno de reflexão */}
      <div style={{background:"#fffdf5",borderRadius:14,border:"1px solid #f3e6c0",marginBottom:16,overflow:"hidden"}}>
        <div style={{background:cor,padding:"12px 16px"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>Reflexão</div>
          <div style={{fontSize:14,color:"white",fontWeight:600,lineHeight:1.4}}>{perguntas[respIdx]||perguntas[0]}</div>
        </div>
        <div style={{position:"relative"}}>
          <div style={{position:"absolute",left:36,top:0,bottom:0,width:1,background:"#fca5a5",opacity:0.4}}/>
          <textarea
            value={respostas[respIdx]||""}
            onChange={e=>{const r=[...respostas];r[respIdx]=e.target.value;setRespostas(r);}}
            placeholder="Escreva livremente aqui..."
            style={{width:"100%",minHeight:130,padding:"12px 12px 12px 48px",
              background:"transparent",border:"none",outline:"none",resize:"none",
              fontSize:14,lineHeight:"28px",fontFamily:"Georgia,serif",
              color:"var(--text)",boxSizing:"border-box",
              backgroundImage:"repeating-linear-gradient(transparent,transparent 27px,#f0ebe0 27px,#f0ebe0 28px)"}}/>
        </div>
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setFase("leitura")}
          style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
          ← Voltar
        </button>
        <button onClick={()=>{
          if(secao < total-1){ setSecao(secao+1); setRespIdx(Math.min(respIdx+1,perguntas.length-1)); setFase("leitura"); }
          else setFase("concluido");
        }}
          style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:cor,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
          {secao<total-1?"Próxima seção →":"Concluir 💜"}
        </button>
      </div>
    </div>
  );

  // ── Leitura ─────────────────────────────────────────────────────
  const s = secoes[secao];
  return(
    <div>
      {/* Progresso */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <div style={{flex:1,background:"var(--gray-100)",borderRadius:20,height:5}}>
          <div style={{width:progresso+"%",height:"100%",borderRadius:20,background:cor,transition:"width .3s"}}/>
        </div>
        <span style={{fontSize:11,color:"var(--text-muted)",flexShrink:0}}>{secao+1}/{total}</span>
      </div>

      {/* Header da seção */}
      <div style={{background:`linear-gradient(135deg,${cor},${cor}dd)`,borderRadius:12,padding:"16px",marginBottom:16,color:"white"}}>
        <div style={{fontSize:32,marginBottom:6}}>{s.icone}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,marginBottom:4}}>{s.titulo}</div>
        {s.subtitulo&&<div style={{fontSize:13,opacity:0.85}}>{s.subtitulo}</div>}
      </div>

      {/* Conteúdo visual da seção */}
      {s.tipo==="intro"&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:14,color:"var(--text)",lineHeight:1.8,marginBottom:16}}>{s.texto}</div>
          {s.destaque&&<div style={{background:bg,borderRadius:12,padding:"14px 16px",borderLeft:"4px solid "+cor}}>
            <div style={{fontSize:13,color:cor,fontWeight:700,lineHeight:1.6}}>{s.destaque}</div>
          </div>}
        </div>
      )}

      {s.tipo==="cards"&&(
        <div style={{marginBottom:16}}>
          {s.intro&&<div style={{fontSize:14,color:"var(--text)",lineHeight:1.7,marginBottom:14}}>{s.intro}</div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
            {s.cards.map((c,i)=>(
              <div key={i} style={{background:c.bg||bg,borderRadius:12,padding:"14px",border:"1px solid "+c.cor+"30"}}>
                <div style={{fontSize:24,marginBottom:6}}>{c.icone}</div>
                <div style={{fontWeight:700,fontSize:13,color:c.cor||cor,marginBottom:4}}>{c.titulo}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.5}}>{c.texto}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.tipo==="lista"&&(
        <div style={{marginBottom:16}}>
          {s.intro&&<div style={{fontSize:14,color:"var(--text)",lineHeight:1.7,marginBottom:14}}>{s.intro}</div>}
          {s.itens.map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",
              background:i%2===0?bg:"white",borderRadius:10,marginBottom:6,
              border:"1px solid "+cor+"20"}}>
              <span style={{fontSize:20,flexShrink:0}}>{item.icone}</span>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:cor,marginBottom:2}}>{item.titulo}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",lineHeight:1.5}}>{item.texto}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {s.tipo==="destaque"&&(
        <div style={{marginBottom:16}}>
          {s.intro&&<div style={{fontSize:14,color:"var(--text)",lineHeight:1.7,marginBottom:14}}>{s.intro}</div>}
          <div style={{background:bg,borderRadius:14,padding:"20px",textAlign:"center",border:"2px solid "+cor+"30"}}>
            <div style={{fontSize:44,marginBottom:8}}>{s.icone}</div>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:cor,marginBottom:8}}>{s.frase}</div>
            {s.subtexto&&<div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.6}}>{s.subtexto}</div>}
          </div>
        </div>
      )}

      {s.tipo==="comparacao"&&(
        <div style={{marginBottom:16}}>
          {s.intro&&<div style={{fontSize:14,color:"var(--text)",lineHeight:1.7,marginBottom:14}}>{s.intro}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {s.lados.map((lado,i)=>(
              <div key={i} style={{background:lado.bg,borderRadius:12,padding:"14px",border:"1px solid "+lado.cor+"30"}}>
                <div style={{fontWeight:700,fontSize:13,color:lado.cor,marginBottom:8}}>{lado.icone} {lado.titulo}</div>
                {lado.itens.map((it,j)=>(
                  <div key={j} style={{fontSize:12,color:"var(--text-muted)",padding:"4px 0",borderBottom:j<lado.itens.length-1?"1px solid "+lado.cor+"20":"none"}}>
                    {it}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navegação */}
      <div style={{display:"flex",gap:8}}>
        {secao>0&&<button onClick={()=>setSecao(secao-1)}
          style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",color:"var(--text-muted)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
          ←
        </button>}
        <button onClick={()=>setFase("reflexao")}
          style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:cor,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
          Refletir sobre isso ✏️
        </button>
      </div>
    </div>
  );
}

// ── PILOTO: O Alarme Falso do Cérebro ────────────────────────────
function PsicoAlarme({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase
    titulo="O Alarme Falso do Cérebro"
    emoji="🧠"
    cor={COR} bg={BG}
    secoes={[
      {
        tipo:"intro",
        icone:"🔔",
        titulo:"O seu cérebro tem um alarme",
        subtitulo:"E ele dispara mais do que deveria",
        texto:"O seu cérebro tem um sistema de segurança chamado amígdala — uma estrutura antiga, rápida e poderosa. A função dela é simples: manter você vivo. Quando percebe qualquer sinal de perigo, ela dispara o alarme antes mesmo que você pense conscientemente sobre o que está acontecendo.",
        destaque:"O problema? Ela não distingue um leão de uma apresentação no trabalho."
      },
      {
        tipo:"lista",
        icone:"⚡",
        titulo:"O que acontece quando o alarme dispara",
        subtitulo:"Em milissegundos, o corpo reage",
        intro:"Quando a amígdala dispara, o seu corpo entra em modo de emergência automaticamente:",
        itens:[
          {icone:"❤️", titulo:"Coração acelera", texto:"Para bombear mais sangue aos músculos — prontos para correr ou lutar"},
          {icone:"💨", titulo:"Respiração fica rápida", texto:"Para captar mais oxigênio e alimentar a ação"},
          {icone:"💪", titulo:"Músculos tensionam", texto:"Preparando o corpo para movimento imediato"},
          {icone:"🍃", titulo:"Digestão para", texto:"O estômago aperta — digestão não é prioridade numa emergência"},
          {icone:"👁️", titulo:"Foco estreita", texto:"A visão periférica diminui — tudo foca na ameaça percebida"},
        ]
      },
      {
        tipo:"comparacao",
        icone:"⚖️",
        titulo:"Ontem vs. hoje",
        subtitulo:"O sistema não evoluiu — o ambiente sim",
        intro:"Este sistema foi essencial para os nossos ancestrais. O desafio é que hoje os 'predadores' são outros:",
        lados:[
          {titulo:"Para o que foi criado", icone:"🦁", cor:"#dc2626", bg:"#fee2e2",
           itens:["Predadores reais","Ameaças físicas imediatas","Perigos de vida ou morte","Situações com solução física"]},
          {titulo:"Para o que dispara hoje", icone:"📧", cor:"#d97706", bg:"#fef3c7",
           itens:["E-mails não respondidos","Conflitos no trabalho","Incerteza sobre o futuro","Críticas e julgamentos"]},
        ]
      },
      {
        tipo:"destaque",
        icone:"💡",
        titulo:"O insight que muda tudo",
        frase:"A ansiedade não é fraqueza. É um sistema de proteção a disparar fora do contexto certo.",
        subtexto:"Quando você entende isso, muda a relação com os sintomas: em vez de lutar contra o alarme com pânico, começa a reconhecê-lo com curiosidade — 'O meu sistema de segurança está ativo. O que está a interpretar como ameaça?'"
      },
    ]}
    perguntas={[
      "Você consegue identificar situações recentes em que seu alarme disparou sem perigo real?",
      "Que situações do dia a dia o seu cérebro trata como se fossem ameaças?",
      "Como você costuma reagir quando o alarme dispara? Luta, foge ou congela?",
    ]}
  />;
}


// ── macro_ansiedade: novos componentes ───────────────────────────────────────

function PsicoPensamentosSaoEventos({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="Pensamentos São Eventos, Não Factos" emoji="💭" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🌊", titulo:"O que é um pensamento?", subtitulo:"Não é a realidade — é uma interpretação",
        texto:"A nossa mente produz cerca de 60 000 pensamentos por dia. A maioria passa sem ser notada. O problema começa quando acreditamos que todo pensamento é verdade — como se pensar algo fosse prova de que é real.",
        destaque:"Pensar 'Sou um fracasso' não me torna um fracasso. É apenas um evento mental, como uma nuvem a passar."
      },
      { tipo:"comparacao", icone:"⚖️", titulo:"Facto vs. interpretação", subtitulo:"A diferença que muda tudo",
        intro:"A mente mistura os dois automaticamente. Separar é uma habilidade que se treina:",
        lados:[
          { titulo:"Facto", icone:"📌", cor:"#16a34a", bg:"#dcfce7", itens:["Ela não respondeu minha mensagem","A reunião foi adiada","Cometi um erro no relatório","Fiquei em silêncio na reunião"] },
          { titulo:"Interpretação", icone:"🔮", cor:"#dc2626", bg:"#fee2e2", itens:["Ela está com raiva de mim","Não valorizam meu trabalho","Sou incompetente","As pessoas me julgaram"] }
        ]
      },
      { tipo:"lista", icone:"🧘", titulo:"Defusão cognitiva", subtitulo:"Criar distância do pensamento",
        intro:"Na TCC e no mindfulness, 'defusão' é a capacidade de observar o pensamento sem ser controlado por ele:",
        itens:[
          { icone:"👁️", titulo:"Nomeie o pensamento", texto:"Em vez de 'Sou um fracasso', diga: 'Estou tendo o pensamento de que sou um fracasso'" },
          { icone:"🍃", titulo:"Deixe passar", texto:"Visualize o pensamento como uma folha num rio — observe-o fluir sem segurá-lo" },
          { icone:"❓", titulo:"Questione a evidência", texto:"'O que prova que esse pensamento é 100% verdade? E o que contradiz?'" },
          { icone:"🔄", titulo:"Gere alternativas", texto:"'Que outro pensamento seria igualmente plausível sobre esta situação?'" }
        ]
      },
      { tipo:"destaque", icone:"💡", titulo:"A virada",
        frase:"Você não é seus pensamentos. Você é quem os observa.",
        subtexto:"Essa distinção simples é a base de toda mudança cognitiva. Quando você observa um pensamento em vez de ser ele, recupera o poder de escolher como reagir."
      }
    ]}
    perguntas={[
      "Que pensamento recorrente você tem e que talvez esteja a tratar como facto?",
      "Se separasse o facto da interpretação numa situação recente, o que mudaria?",
      "O que aconteceria se você observasse esse pensamento como uma nuvem a passar — sem lutar contra ele?"
    ]}
  />;
}

function PsicoEustresseV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="Eustresse vs. distresse" emoji="⚡" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"⚡", titulo:"Nem todo estresse é inimigo", subtitulo:"Existe um estresse que nos faz crescer",
        texto:"A palavra 'estresse' virou sinônimo de algo negativo. Mas o psicólogo Hans Selye mostrou que existe uma distinção crucial: há o estresse que nos impulsiona e o que nos adoece.",
        destaque:"A diferença não está na intensidade — está na nossa percepção de controle e no tempo de duração."
      },
      { tipo:"comparacao", icone:"⚖️", titulo:"Eustresse vs. Distresse", subtitulo:"Dois tipos, efeitos opostos",
        intro:"O mesmo evento pode gerar eustresse numa pessoa e distresse em outra, dependendo de recursos e percepção:",
        lados:[
          { titulo:"Eustresse ✅", icone:"🚀", cor:"#16a34a", bg:"#dcfce7", itens:["Motivador e energizante","Sentido de desafio","Curto prazo, gerenciável","Aumenta foco e desempenho","Exemplo: prazo que estimula"] },
          { titulo:"Distresse ❌", icone:"🪫", cor:"#dc2626", bg:"#fee2e2", itens:["Desgastante e paralisante","Sensação de ameaça","Prolongado ou sem saída","Prejudica saúde e memória","Exemplo: sobrecarga crônica"] }
        ]
      },
      { tipo:"lista", icone:"🎯", titulo:"Como converter distresse em eustresse", subtitulo:"Estratégias concretas",
        intro:"A percepção é modificável. Algumas formas práticas de ressignificar o estresse:",
        itens:[
          { icone:"🔍", titulo:"Identifique o que está no seu controle", texto:"Separe o que você pode fazer agora do que está fora do seu alcance" },
          { icone:"🧩", titulo:"Divida o desafio", texto:"Tarefas enormes geram distresse; tarefas pequenas e claras geram eustresse" },
          { icone:"🌱", titulo:"Reframe o significado", texto:"'Isso está me destruindo' → 'Isso está me desafiando a crescer'" },
          { icone:"⏱️", titulo:"Estabeleça limites de tempo", texto:"Estresse sem fim é distresse; estresse com prazo definido é tolerável" }
        ]
      },
      { tipo:"destaque", icone:"🧠", titulo:"O que a ciência diz",
        frase:"Acreditar que o estresse é útil pode melhorar seu desempenho e saúde.",
        subtexto:"Um estudo de Stanford com 30 000 pessoas mostrou que o estresse só é prejudicial quando acreditamos que ele é prejudicial. A percepção importa tanto quanto a intensidade."
      }
    ]}
    perguntas={[
      "Existe algum estressor na sua vida agora que poderia ser reinterpretado como desafio em vez de ameaça?",
      "Quando você pensa nos seus momentos de maior crescimento, havia algum estresse presente?",
      "O que mudaria se você tratasse o nervosismo antes de algo importante como energia, e não como sinal de perigo?"
    ]}
  />;
}

function PsicoCicloAnsiedadeV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="O ciclo da ansiedade" emoji="🌀" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🌀", titulo:"Como a ansiedade se alimenta de si mesma", subtitulo:"O ciclo que nunca para — até você entender",
        texto:"A ansiedade não surge do nada. Ela segue um ciclo previsível que se repete e se intensifica cada vez que não é interrompido. Entender o ciclo é o primeiro passo para quebrá-lo.",
        destaque:"A evitação é o combustível da ansiedade. O que evitamos hoje fica maior amanhã."
      },
      { tipo:"lista", icone:"🔄", titulo:"As 4 fases do ciclo", subtitulo:"Reconheça onde você está",
        intro:"O ciclo da ansiedade passa por quatro estágios que se retroalimentam:",
        itens:[
          { icone:"1️⃣", titulo:"Gatilho", texto:"Situação real ou imaginada que o cérebro interpreta como ameaça — uma apresentação, um conflito, uma incerteza" },
          { icone:"2️⃣", titulo:"Pensamentos catastróficos", texto:"A mente começa a projetar o pior: 'Vou falhar', 'Vão me julgar', 'Não vou conseguir'" },
          { icone:"3️⃣", titulo:"Sintomas físicos", texto:"Coração acelera, músculo tensa, estômago aperta — o corpo entra em modo de alerta real" },
          { icone:"4️⃣", titulo:"Evitação ou fuga", texto:"Você evita a situação → sente alívio imediato → o cérebro aprende que 'fugir = seguro' → o gatilho fica maior" }
        ]
      },
      { tipo:"cards", icone:"🔓", titulo:"Como quebrar o ciclo", subtitulo:"Intervenção em cada fase",
        intro:"Você pode interromper o ciclo em qualquer ponto:",
        cards:[
          { icone:"🎯", titulo:"No gatilho", texto:"Identifique o que realmente desencadeou a ansiedade — nem sempre é o óbvio", cor:COR, bg:BG },
          { icone:"💭", titulo:"No pensamento", texto:"Questione: 'Qual a evidência? Qual o pior caso real? Consigo lidar?'", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"🌬️", titulo:"No corpo", texto:"Respiração 4-7-8: inspire 4s, segure 7s, expire 8s — ativa o nervo vago", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"🚶", titulo:"Na evitação", texto:"Exposição gradual: enfrente a situação em passos pequenos, do menos ao mais temido", cor:"#d97706", bg:"#fef3c7" }
        ]
      },
      { tipo:"destaque", icone:"💪", titulo:"A exposição gradual",
        frase:"Cada vez que você enfrenta em vez de fugir, o ciclo perde força.",
        subtexto:"A ansiedade é como uma onda: sobe, atinge o pico e desce. Se você ficar presente durante a subida, vai descobrir que o pico passa — e que sobreviveu."
      }
    ]}
    perguntas={[
      "Em qual fase do ciclo você costuma estar quando percebe a ansiedade?",
      "Existe algo que você evita regularmente e que, no fundo, sabe que poderia enfrentar?",
      "Que exposição pequena e segura você poderia fazer esta semana para começar a quebrar o ciclo?"
    ]}
  />;
}

function PsicoPreocupacaoV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="Preocupação produtiva vs. improdutiva" emoji="🎛️" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🎛️", titulo:"Nem toda preocupação é inútil", subtitulo:"Mas a maioria é",
        texto:"Preocupar-se é natural e, em pequenas doses, útil. O problema é quando a mente fica presa em loop — ruminando o mesmo problema sem chegar a nenhuma solução. Isso se chama preocupação improdutiva.",
        destaque:"A pergunta-chave: 'Existe alguma ação concreta que posso fazer agora?' Se sim, é produtiva. Se não, é improdutiva."
      },
      { tipo:"comparacao", icone:"⚖️", titulo:"Produtiva vs. Improdutiva", subtitulo:"Como diferenciar na prática",
        intro:"",
        lados:[
          { titulo:"Produtiva ✅", icone:"✅", cor:"#16a34a", bg:"#dcfce7", itens:["Leva a uma ação concreta","Tem prazo e solução possível","Você pensa e depois age","Reduz a incerteza","Exemplo: planejar uma conversa difícil"] },
          { titulo:"Improdutiva ❌", icone:"🔄", cor:"#dc2626", bg:"#fee2e2", itens:["Fica em loop sem solução","Sobre o futuro ou passado","Você pensa e continua pensando","Aumenta a incerteza","Exemplo: 'E se eu ficar doente?'"] }
        ]
      },
      { tipo:"lista", icone:"🛑", titulo:"Como interromper a preocupação improdutiva", subtitulo:"4 técnicas testadas",
        intro:"",
        itens:[
          { icone:"📅", titulo:"Agenda a preocupação", texto:"Reserve 20 minutos por dia para se preocupar conscientemente. Fora desse horário, adie o pensamento: 'Vou pensar nisso às 18h'" },
          { icone:"✍️", titulo:"Escreva e solte", texto:"Coloque a preocupação no papel. O ato de escrever descarrega a memória de trabalho e reduz a ruminação" },
          { icone:"❓", titulo:"Teste a utilidade", texto:"Pergunte: 'Pensar nisso agora vai mudar alguma coisa?' Se não, é sinal para redirecionar a atenção" },
          { icone:"🎯", titulo:"Converta em ação", texto:"Para cada preocupação, defina UMA ação pequena possível — mesmo que não resolva tudo, cria sensação de controle" }
        ]
      },
      { tipo:"destaque", icone:"🧘", titulo:"Soltar o incontrolável",
        frase:"Se você pode fazer algo, faça. Se não pode, preocupar-se não vai ajudar.",
        subtexto:"Esta frase, do estoicismo, resume séculos de sabedoria: energia mental é um recurso finito. Investir em preocupações fora do seu controle é um desperdício que drena exatamente o que você precisaria para agir."
      }
    ]}
    perguntas={[
      "Liste suas 3 principais preocupações agora. Para cada uma: existe uma ação concreta possível hoje?",
      "Existe uma preocupação que você carrega há muito tempo sem conseguir resolver? O que a mantém viva?",
      "Como seria a sua semana se você dedicasse à preocupação apenas 20 minutos por dia — e o restante, às ações?"
    ]}
  />;
}

function PsicoPiorCenarioV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="A armadilha do pior cenário" emoji="⛈️" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"⛈️", titulo:"Catastrofizar: o hábito de sofrer antecipado", subtitulo:"Por que a mente vai sempre para o pior",
        texto:"Catastrofizar é imaginar o pior desfecho possível e tratá-lo como provável ou certo. 'E se eu perder o emprego?' 'E se a doença for grave?' O cérebro não distingue ameaça imaginada de real — então você sofre de verdade por algo que talvez nunca aconteça.",
        destaque:"A catastrofização é uma distorção cognitiva, não uma previsão realista do futuro."
      },
      { tipo:"lista", icone:"🔍", titulo:"Como identificar que você está catastrofizando", subtitulo:"Sinais internos",
        intro:"",
        itens:[
          { icone:"📢", titulo:"Linguagem absoluta", texto:"'Vai ser horrível', 'Não vou conseguir', 'Vai dar tudo errado'" },
          { icone:"🔮", titulo:"Previsão sem evidência", texto:"Você prevê resultados negativos sem dados que os sustentem" },
          { icone:"💥", titulo:"Magnificação", texto:"O erro vira catástrofe: um deslize no trabalho = demissão certa" },
          { icone:"🏃", titulo:"Fuga preventiva", texto:"Você começa a evitar situações por medo do pior cenário imaginado" }
        ]
      },
      { tipo:"cards", icone:"🛠️", titulo:"As 3 perguntas que destroem o catastrofismo", subtitulo:"Técnica da TCC",
        intro:"Quando perceber que está indo para o pior cenário, faça essas três perguntas:",
        cards:[
          { icone:"📊", titulo:"Qual a probabilidade real?", texto:"De 0 a 100%, o quanto isso realmente vai acontecer? Seja honesto.", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"📚", titulo:"Qual o histórico?", texto:"Esse tipo de coisa já aconteceu antes? Com que frequência o pior cenário se concretizou?", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"💪", titulo:"Se acontecer, consigo lidar?", texto:"Humanos são incrivelmente resilientes. Você já superou coisas difíceis antes.", cor:COR, bg:BG }
        ]
      },
      { tipo:"destaque", icone:"🌤️", titulo:"O cenário realista",
        frase:"Entre o melhor e o pior cenário, existe um mais provável — e geralmente é suportável.",
        subtexto:"A mente ansiosa tende a ignorar o cenário médio realista. Treine-se a perguntar: 'O que provavelmente vai acontecer?' — não o melhor, não o pior, mas o mais provável."
      }
    ]}
    perguntas={[
      "Qual é uma situação atual em que você sente que está indo para o pior cenário?",
      "Se você desse uma probabilidade real (%) a esse pior cenário, qual seria?",
      "Pensando em situações difíceis que já viveu — o que isso diz sobre sua capacidade de lidar com o que vier?"
    ]}
  />;
}

function PsicoModeloABCV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="O modelo ABC na prática" emoji="🔺" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🔺", titulo:"Não são os eventos que nos perturbam", subtitulo:"São nossas crenças sobre eles",
        texto:"Albert Ellis criou o modelo ABC para mostrar que entre um evento e nossa reação emocional existe algo crucial: o que acreditamos sobre o evento. A mesma situação pode gerar emoções completamente diferentes dependendo da crença.",
        destaque:"A → Adversidade (o que aconteceu) · B → Belief (crença) · C → Consequência emocional"
      },
      { tipo:"lista", icone:"🧩", titulo:"O modelo na vida real", subtitulo:"Dois colegas, mesma crítica, emoções opostas",
        intro:"Maria e João recebem a mesma crítica do chefe: 'Esse relatório precisa melhorar'.",
        itens:[
          { icone:"👩", titulo:"Maria — B: 'Sou incompetente'", texto:"C: Tristeza, vergonha, desmotivação. Pensa em pedir demissão." },
          { icone:"👨", titulo:"João — B: 'Posso aprender com isso'", texto:"C: Curiosidade leve, motivação. Pergunta como melhorar." },
          { icone:"📌", titulo:"O A foi idêntico", texto:"O que criou emoções opostas foi exclusivamente o B — a crença de cada um sobre o evento." },
          { icone:"💡", titulo:"A boa notícia", texto:"Crenças são modificáveis. Diferente de eventos, que muitas vezes estão fora do nosso controle." }
        ]
      },
      { tipo:"cards", icone:"🔧", titulo:"Como disputar crenças (o D do modelo)", subtitulo:"ABCDE na prática",
        intro:"Ellis adicionou D (Dispute) e E (Efeito) ao modelo original:",
        cards:[
          { icone:"❓", titulo:"D — Dispute", texto:"'Que evidências tenho de que essa crença é verdade? E contra ela?'", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"🔄", titulo:"Crença alternativa", texto:"'O que mais poderia significar esse evento além da minha interpretação inicial?'", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"✨", titulo:"E — Efeito", texto:"Após disputar a crença, que nova emoção emerge? Como muda seu comportamento?", cor:COR, bg:BG }
        ]
      },
      { tipo:"destaque", icone:"🗝️", titulo:"O poder do B",
        frase:"Mudar os eventos é raro. Mudar o que acreditamos sobre eles está ao nosso alcance.",
        subtexto:"Não se trata de pensamento positivo forçado — mas de pensamento realista e flexível. A crença não precisa ser bonita; precisa ser mais precisa."
      }
    ]}
    perguntas={[
      "Pense numa situação recente que gerou emoção forte. Qual foi o A? Qual foi o B que você não percebeu de imediato?",
      "Se você mudasse o B dessa situação para uma crença mais realista, como mudaria o C?",
      "Existe uma crença recorrente sua que você já questiona se é verdade, mas continua acreditando?"
    ]}
  />;
}

function PsicoPensamentosV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="O poder dos pensamentos" emoji="💭" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"💭", titulo:"A mente como filtro da realidade", subtitulo:"O que pensamos molda o que sentimos",
        texto:"Você já reparou como a mesma situação pode gerar emoções completamente diferentes em pessoas diferentes? Não é a situação em si que determina como nos sentimos — é o que pensamos sobre ela. A mente funciona como um filtro.",
        destaque:"Não são as coisas em si que nos perturbam, mas o que acreditamos sobre elas. — Epicteto"
      },
      { tipo:"lista", icone:"🔗", titulo:"A cadeia pensamento → emoção → comportamento", subtitulo:"Como tudo se conecta",
        intro:"Cada pensamento dispara uma emoção, que dispara um comportamento, que cria uma nova situação:",
        itens:[
          { icone:"💭", titulo:"Pensamento automático", texto:"'Ela não me respondeu — deve estar me ignorando de propósito'" },
          { icone:"😠", titulo:"Emoção", texto:"Raiva, mágoa, insegurança — sentidas no corpo como tensão real" },
          { icone:"🚪", titulo:"Comportamento", texto:"Você age de forma distante ou confrontadora — criando o problema que temia" },
          { icone:"🔄", titulo:"Retroalimentação", texto:"O resultado confirma o pensamento original — o ciclo se fecha e se fortalece" }
        ]
      },
      { tipo:"cards", icone:"🛠️", titulo:"Como trabalhar os pensamentos", subtitulo:"3 ferramentas práticas",
        intro:"",
        cards:[
          { icone:"📓", titulo:"Registro de pensamentos", texto:"Anote o pensamento, a emoção, a situação. Observar já cria distância", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"🔍", titulo:"Questionamento socrático", texto:"'Isso é um facto ou uma interpretação? Que evidência tenho? E contra?'", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"🔄", titulo:"Pensamento alternativo", texto:"Gere pelo menos 2 explicações alternativas para a mesma situação", cor:COR, bg:BG }
        ]
      },
      { tipo:"destaque", icone:"✏️", titulo:"O exercício de hoje",
        frase:"Hoje, quando notar uma emoção forte, pergunte: 'Que pensamento veio antes disso?'",
        subtexto:"Só essa pergunta — feita com curiosidade, sem julgamento — já começa a criar o espaço entre o estímulo e a resposta. E nesse espaço mora a liberdade."
      }
    ]}
    perguntas={[
      "Que pensamento recorrente você tem que mais afeta seu humor ao longo do dia?",
      "Consegue identificar um momento recente em que um pensamento automático levou a uma emoção forte?",
      "Se você gerasse um pensamento alternativo para aquela situação, como sua emoção poderia ter sido diferente?"
    ]}
  />;
}

function PsicoPizzaV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="A pizza da responsabilidade" emoji="🍕" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🍕", titulo:"A culpa raramente é só sua", subtitulo:"Como dividir a responsabilidade com mais justiça",
        texto:"Quando algo dá errado, a mente ansiosa tende a um extremo: ou coloca toda a culpa em si mesma (autoculpa tóxica) ou em outra pessoa (vitimização). A realidade é mais complexa e mais justa.",
        destaque:"Distribuir responsabilidade de forma justa não é escapar da culpa. É pensar com clareza."
      },
      { tipo:"lista", icone:"⚖️", titulo:"Os três fatores de todo problema", subtitulo:"A fórmula equilibrada",
        intro:"Na maioria das situações difíceis, existe uma combinação de:",
        itens:[
          { icone:"🙋", titulo:"Eu (minha parte)", texto:"Minhas escolhas, meu comportamento, o que eu poderia ter feito diferente — sem exagerar nem minimizar" },
          { icone:"🧑‍🤝‍🧑", titulo:"O outro (parte deles)", texto:"O comportamento do outro, as escolhas que fizeram, o que contribuíram para a situação" },
          { icone:"🌍", titulo:"As circunstâncias (contexto)", texto:"Fatores externos: timing, pressão, informações que ninguém tinha, acasos que ninguém controlava" }
        ]
      },
      { tipo:"cards", icone:"🎯", titulo:"Como fazer a pizza na prática", subtitulo:"Passo a passo",
        intro:"",
        cards:[
          { icone:"📝", titulo:"Descreva a situação", texto:"Seja objetivo: o que aconteceu de fato, sem julgamentos ainda", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"🍕", titulo:"Divida a pizza", texto:"Dê uma porcentagem a cada fator: Eu (X%) · O outro (Y%) · Circunstâncias (Z%)", cor:COR, bg:BG },
          { icone:"🔍", titulo:"Avalie a sua fatia", texto:"O que exatamente foi sua responsabilidade? Nem mais, nem menos do que foi.", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"🌱", titulo:"Defina o que você pode mudar", texto:"Só a sua fatia é modificável por você. Trabalhe o que está ao seu alcance.", cor:"#d97706", bg:"#fef3c7" }
        ]
      },
      { tipo:"destaque", icone:"🕊️", titulo:"O alívio da divisão justa",
        frase:"Você não precisa carregar 100% do peso de algo que foi construído por vários.",
        subtexto:"Assumir apenas a sua fatia real significa que você pode trabalhar nela com clareza, sem o peso paralisante de se sentir responsável por tudo."
      }
    ]}
    perguntas={[
      "Existe uma situação passada em que você assumiu 100% da culpa? Como ficaria a pizza se você dividisse honestamente?",
      "E o oposto — existe algo em que colocou toda a culpa no outro, mas que tinha uma parte sua?",
      "Como seria trabalhar só a sua fatia — sem se sentir responsável pela parte dos outros?"
    ]}
  />;
}

function PsicoFatosV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="Fatos vs. interpretações" emoji="🔍" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🔍", titulo:"A mente preenche lacunas automaticamente", subtitulo:"E nem sempre acerta",
        texto:"O cérebro recebe informação incompleta e, em frações de segundo, preenche as lacunas com base em experiências passadas, medos e crenças. O resultado? Confundimos a nossa versão da realidade com a realidade em si.",
        destaque:"'Ela não me respondeu' é um facto. 'Ela está com raiva de mim' é uma interpretação. Toda a emoção vem da interpretação, não do facto."
      },
      { tipo:"lista", icone:"🧩", titulo:"Como separar facto de interpretação", subtitulo:"O teste prático",
        intro:"Um facto: qualquer pessoa na sala teria visto a mesma coisa. Uma interpretação: é a história que você acrescenta.",
        itens:[
          { icone:"📹", titulo:"O teste da câmera", texto:"O que uma câmera filmaria? Só isso é facto. Tudo que a câmera não captura é interpretação." },
          { icone:"💬", titulo:"O teste do acordo", texto:"Qualquer pessoa concordaria com essa afirmação? Se não, provavelmente é interpretação." },
          { icone:"🔮", titulo:"Cuidado com o 'deve ser'", texto:"'Ele deve estar bravo', 'ela deve estar me ignorando' — o 'deve' quase sempre sinaliza interpretação." },
          { icone:"❓", titulo:"A pergunta de ouro", texto:"'Isso eu sei, ou estou supondo?' — simples e transformadora." }
        ]
      },
      { tipo:"comparacao", icone:"⚖️", titulo:"Exemplos do dia a dia", subtitulo:"",
        intro:"",
        lados:[
          { titulo:"Facto", icone:"📌", cor:"#16a34a", bg:"#dcfce7", itens:["Ele ficou em silêncio","A reunião foi cancelada","Ela não sorriu","Não recebi resposta"] },
          { titulo:"Interpretação comum", icone:"🔮", cor:"#dc2626", bg:"#fee2e2", itens:["Ele está me ignorando","Não confiam em mim","Ela me detesta","Fiz algo errado"] }
        ]
      },
      { tipo:"destaque", icone:"🗝️", titulo:"A liberdade da distinção",
        frase:"Quando você para de confundir interpretação com facto, perde menos energia sofrendo por histórias que inventou.",
        subtexto:"Não é sobre não ter interpretações — é inevitável, somos humanos. É sobre perceber quando está confundindo uma com a outra, e ter a curiosidade de verificar antes de reagir."
      }
    ]}
    perguntas={[
      "Pense numa situação recente que te gerou emoção negativa. O que era facto? O que era interpretação?",
      "Você tem o hábito de verificar suas interpretações antes de agir? O que te impede de fazer isso mais?",
      "Existe uma interpretação sobre alguém próximo que você nunca verificou e que pode não ser verdade?"
    ]}
  />;
}

function PsicoSempreNuncaV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="O perigo do sempre e nunca" emoji="∞" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"∞", titulo:"A supergeneralização", subtitulo:"Quando um evento vira uma regra permanente",
        texto:"'Eu SEMPRE faço tudo errado.' 'Ele NUNCA me ouve.' Essas palavras parecem descrever a realidade — mas na verdade a distorcem. Transformam um evento pontual em característica permanente. E o permanente gera desânimo.",
        destaque:"Quase nada na vida humana é realmente 'sempre' ou 'nunca'. Essas palavras são sinais de alarme cognitivo."
      },
      { tipo:"lista", icone:"⚠️", titulo:"Por que é perigoso", subtitulo:"O impacto real da supergeneralização",
        intro:"",
        itens:[
          { icone:"🧊", titulo:"Paralisa a mudança", texto:"Se 'sempre foi assim', pra que tentar? A supergeneralização cria fatalismo." },
          { icone:"💔", titulo:"Destrói relacionamentos", texto:"'Você nunca me ouve' fecha o diálogo. A outra pessoa se defende em vez de ouvir." },
          { icone:"🪞", titulo:"Distorce a autoimagem", texto:"'Sou sempre o problema' generaliza um erro pontual para a identidade inteira." },
          { icone:"😔", titulo:"Alimenta depressão", texto:"A supergeneralização é um dos principais mecanismos cognitivos da depressão." }
        ]
      },
      { tipo:"cards", icone:"🔧", titulo:"Como corrigir", subtitulo:"Substituições que mudam tudo",
        intro:"Palavras pequenas, impacto enorme. Experimente trocar:",
        cards:[
          { icone:"🔄", titulo:"'Sempre' → 'desta vez'", texto:"'Errei desta vez' é verdade e modificável. 'Sempre erro' é uma sentença.", cor:COR, bg:BG },
          { icone:"🔄", titulo:"'Nunca' → 'ainda não'", texto:"'Ainda não consegui' mantém a possibilidade aberta. 'Nunca vou conseguir' a fecha.", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"🔄", titulo:"'É sempre assim' → 'às vezes'", texto:"Reduz a magnitude e permite ver exceções que existem mas são ignoradas.", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"🔎", titulo:"Busque a exceção", texto:"Existe algum momento em que não foi assim? Uma exceção destrói o 'sempre'.", cor:"#d97706", bg:"#fef3c7" }
        ]
      },
      { tipo:"destaque", icone:"🌱", titulo:"A precisão como cura",
        frase:"Quanto mais precisa a linguagem, mais preciso o pensamento — e mais realista a emoção.",
        subtexto:"'Cometi um erro nessa situação' é um facto que pode ser trabalhado. 'Sempre cometo erros' é uma sentença que paralisa."
      }
    ]}
    perguntas={[
      "Você usa 'sempre' ou 'nunca' com frequência? Sobre quem — você mesmo ou alguém próximo?",
      "Escolha uma frase com 'sempre/nunca' que você pensa com frequência. Existe pelo menos uma exceção?",
      "Como mudaria a sua emoção se trocasse 'sempre' por 'desta vez' nessa frase?"
    ]}
  />;
}

function PsicoDesmontarV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="Desmontar o Circuito Cerebral da Ansiedade" emoji="🧠" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🧠", titulo:"Como o cérebro cria a ansiedade", subtitulo:"E como você pode interromper o circuito",
        texto:"A ansiedade não é aleatória — é um circuito neural bem estabelecido. A amígdala detecta ameaça (real ou imaginada), dispara o alarme, e o corpo reage antes que o pensamento consciente intervenha. Mas esse circuito pode ser interrompido.",
        destaque:"Você não pode evitar que o alarme dispare. Mas pode aprender a não deixá-lo tomar o comando."
      },
      { tipo:"lista", icone:"⚡", titulo:"O circuito em 4 passos", subtitulo:"O que acontece no seu cérebro",
        intro:"",
        itens:[
          { icone:"1️⃣", titulo:"Detecção da ameaça (amígdala)", texto:"Em milissegundos, a amígdala escaneia o ambiente. Qualquer sinal de perigo — real ou simbólico — ativa o alarme." },
          { icone:"2️⃣", titulo:"Resposta de estresse (hipotálamo)", texto:"Cortisol e adrenalina são liberados. Coração acelera, músculos tensionam, atenção estreita." },
          { icone:"3️⃣", titulo:"Pensamentos catastróficos (córtex)", texto:"O córtex pré-frontal, agora sobrecarregado, gera pensamentos de ameaça em cascata." },
          { icone:"4️⃣", titulo:"Evitação ou hipervigilância", texto:"O comportamento de fuga reforça o circuito: o cérebro aprende que a situação era mesmo perigosa." }
        ]
      },
      { tipo:"cards", icone:"🔓", titulo:"4 interruptores do circuito", subtitulo:"Técnicas com base neurocientífica",
        intro:"",
        cards:[
          { icone:"🌬️", titulo:"Respiração diafragmática", texto:"Ativa o nervo vago e sinaliza segurança ao sistema nervoso em 60-90 segundos", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"🖐️", titulo:"Técnica 5-4-3-2-1", texto:"5 coisas que vê, 4 que toca, 3 que ouve, 2 que cheira, 1 que saboreia — âncora no presente", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"💭", titulo:"Nomear a emoção", texto:"'Estou sentindo ansiedade' ativa o córtex pré-frontal e reduz a ativação da amígdala", cor:COR, bg:BG },
          { icone:"🚶", titulo:"Movimento intencional", texto:"10 minutos de caminhada reduzem cortisol e produzem endorfina — quebra o ciclo fisiologicamente", cor:"#d97706", bg:"#fef3c7" }
        ]
      },
      { tipo:"destaque", icone:"🔄", titulo:"Neuroplasticidade",
        frase:"Cada vez que você usa um interruptor, o circuito da ansiedade perde um pouco de força.",
        subtexto:"O cérebro muda com o uso. Repetição constrói novos caminhos neurais. Com prática, o alarme começa a disparar com menos intensidade e você recupera o acesso ao pensamento claro mais rapidamente."
      }
    ]}
    perguntas={[
      "Qual dos 4 interruptores parece mais acessível para você experimentar esta semana?",
      "Em que momento do seu dia o circuito da ansiedade costuma disparar com mais força?",
      "Você já percebeu que depois de respirar fundo ou se mover, a ansiedade diminuiu? O que isso diz?"
    ]}
  />;
}

function Psico7DistorcoesV2({ cat }){
  const COR="#7B00C4"; const BG="#f3e6ff";
  return <PsicoVisualBase titulo="7 Distorções de Pensamento" emoji="🧩" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🧩", titulo:"A mente distorce — é parte do design", subtitulo:"Mas podemos aprender a perceber",
        texto:"Distorções cognitivas são padrões de pensamento sistemáticos que nos afastam da realidade. Não são defeitos de caráter — são atalhos neurais que o cérebro desenvolveu. O problema é que muitos desses atalhos nos sabotam.",
        destaque:"Reconhecer uma distorção não a apaga — mas cria distância suficiente para você escolher como responder."
      },
      { tipo:"lista", icone:"🔍", titulo:"As 7 distorções mais comuns", subtitulo:"Você se reconhece em alguma?",
        intro:"",
        itens:[
          { icone:"⚫", titulo:"Pensamento tudo ou nada", texto:"'Ou é perfeito ou é um fracasso.' Sem meio-termo. Leva ao perfeccionismo e à decepção constante." },
          { icone:"🌊", titulo:"Supergeneralização", texto:"Um evento negativo vira uma regra permanente: 'Isso sempre acontece comigo.'" },
          { icone:"🔦", titulo:"Filtro mental", texto:"Foca exclusivamente no negativo, ignorando o positivo — como uma gota de tinta escurecendo um copo d'água." },
          { icone:"⛔", titulo:"Desconto do positivo", texto:"Conquistas são minimizadas: 'Qualquer um teria feito isso.' O negativo conta; o positivo não." },
          { icone:"🔮", titulo:"Leitura mental", texto:"'Sei o que ele está pensando' — sem perguntar. Quase sempre erra, e age com base no erro." },
          { icone:"💥", titulo:"Catastrofização", texto:"Amplifica o negativo e minimiza a capacidade de lidar: 'Vai ser horrível e não vou aguentar.'" },
          { icone:"🏷️", titulo:"Rotulação", texto:"Generaliza um comportamento para a identidade: 'Errei' vira 'Sou um fracasso.'" }
        ]
      },
      { tipo:"cards", icone:"🛠️", titulo:"Como responder a cada distorção", subtitulo:"A pergunta certa para cada uma",
        intro:"",
        cards:[
          { icone:"⚫", titulo:"Tudo ou nada", texto:"'Existe um meio-termo? Onde estaria numa escala de 0 a 10?'", cor:COR, bg:BG },
          { icone:"🌊", titulo:"Supergeneralização", texto:"'Existe pelo menos uma exceção a esse sempre/nunca?'", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"🔦", titulo:"Filtro / Desconto", texto:"'O que estou ignorando que também é verdade nessa situação?'", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"💥", titulo:"Catastrofização / Leitura mental", texto:"'Qual a probabilidade real? Já verifiquei com a pessoa?'", cor:"#d97706", bg:"#fef3c7" }
        ]
      },
      { tipo:"destaque", icone:"🪞", titulo:"O treino da consciência",
        frase:"Você não precisa eliminar distorções. Precisa apenas reconhecê-las antes de agir.",
        subtexto:"O simples ato de dizer 'Estou catastrofizando agora' já ativa o córtex pré-frontal e cria distância da reação automática. A consciência é o início da mudança."
      }
    ]}
    perguntas={[
      "Das 7 distorções, qual você mais reconhece no seu próprio padrão de pensamento?",
      "Consegue lembrar de uma situação recente em que essa distorção influenciou como você agiu?",
      "O que mudaria se você fizesse a pergunta certa para essa distorção na próxima vez que ela aparecer?"
    ]}
  />;
}



// ── macro_casais ─────────────────────────────────────────────────────────────

function PsicoDiscutirDinheiro({ cat }){
  const COR="#EC4899"; const BG="#fdf2f8";
  return <PsicoVisualBase titulo="Por Que Discutimos Sobre Dinheiro – Quando Não é Realmente Sobre Dinheiro" emoji="💰" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"💰", titulo:"O dinheiro como campo de batalha simbólico", subtitulo:"O que está realmente em jogo",
        texto:"Casais brigam sobre dinheiro com uma frequência e intensidade que vai muito além dos números. A conta que não foi paga, o gasto que não foi consultado, a poupança que não cresce — raramente são sobre o valor em si. São sobre controle, segurança, respeito e poder.",
        destaque:"Quando a briga é sobre dinheiro, a pergunta real é: 'Você me respeita? Você me protege? Você me vê?'"
      },
      { tipo:"comparacao", icone:"⚖️", titulo:"O que parece vs. o que é", subtitulo:"A camada oculta dos conflitos financeiros",
        intro:"",
        lados:[
          { titulo:"O que dizemos", icone:"💬", cor:"#0891b2", bg:"#e0f2fe", itens:["'Você gasta demais'","'Nunca decidimos juntos'","'Você é controlador(a)'","'Não sobra nada no mês'"] },
          { titulo:"O que sentimos", icone:"❤️", cor:"#ec4899", bg:"#fdf2f8", itens:["'Não me sinto seguro(a)'","'Não tenho voz nessa relação'","'Não confio em você'","'Tenho medo do futuro'"] }
        ]
      },
      { tipo:"lista", icone:"🔍", titulo:"As raízes do conflito financeiro", subtitulo:"De onde vêm as crenças sobre dinheiro",
        intro:"Cada pessoa traz para o relacionamento uma 'herança financeira' da família de origem:",
        itens:[
          { icone:"👨‍👩‍👧", titulo:"Família de origem", texto:"Quem controlava o dinheiro em casa? Era tabu falar sobre ele? Havia escassez ou abundância?" },
          { icone:"🧠", titulo:"Crenças formadas", texto:"'Dinheiro é fonte de conflito', 'Quem ganha mais manda', 'Poupar é obrigação moral'" },
          { icone:"😰", titulo:"Gatilhos emocionais", texto:"Ver o saldo baixar pode ativar um medo primitivo de sobrevivência, não uma análise racional" },
          { icone:"🔄", titulo:"Padrões repetidos", texto:"Casais frequentemente reencenam dinâmicas de poder financeiro que viram nos pais" }
        ]
      },
      { tipo:"cards", icone:"🛠️", titulo:"Como conversar sobre dinheiro de verdade", subtitulo:"4 passos para sair do conflito",
        intro:"",
        cards:[
          { icone:"🕐", titulo:"Escolha o momento", texto:"Nunca quando estão exaustos ou no calor de uma compra. Agende uma conversa financeira semanal.", cor:COR, bg:BG },
          { icone:"🎯", titulo:"Separe fatos de sentimentos", texto:"'O saldo caiu R$800' (facto) antes de 'Estou preocupado(a) com nossa segurança' (sentimento)", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"🌱", titulo:"Explore as origens", texto:"Pergunte com curiosidade: 'O que o dinheiro representa pra você? Como era na sua família?'", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"🤝", titulo:"Construam um projeto comum", texto:"Objetivos compartilhados (viagem, casa, aposentadoria) transformam o dinheiro de campo de batalha em aliado", cor:"#d97706", bg:"#fef3c7" }
        ]
      },
      { tipo:"destaque", icone:"💡", titulo:"A virada",
        frase:"O dinheiro não divide casais — a falta de conversa honesta sobre o que ele representa é que divide.",
        subtexto:"Quando dois parceiros conseguem falar sobre o medo por trás das contas, a conversa financeira deixa de ser uma batalha e se torna um ato de intimidade."
      }
    ]}
    perguntas={[
      "Quando você e seu parceiro(a) discutem sobre dinheiro, o que você está sentindo por baixo — segurança, controle, respeito?",
      "Como o dinheiro era tratado na sua família de origem? Que crença você herdou sobre ele?",
      "Existe um objetivo financeiro comum que vocês ainda não colocaram no papel e que poderia unir em vez de dividir?"
    ]}
  />;
}

function PsicoFusaoCasal({ cat }){
  const COR="#EC4899"; const BG="#fdf2f8";
  return <PsicoVisualBase titulo="Por Que Perder-se no Outro Não É Amor – É Fusão" emoji="🔗" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🔗", titulo:"Amor ou fusão?", subtitulo:"A diferença que define a saúde do relacionamento",
        texto:"No início de um relacionamento, a fusão parece amor profundo: querer estar sempre juntos, pensar no outro o tempo todo, abrir mão das próprias preferências. Mas com o tempo, o que parecia intimidade se torna sufocamento — e o que parecia cuidado se torna dependência.",
        destaque:"Você não pode amar bem alguém se perdeu a si mesmo. O amor saudável acontece entre dois inteiros, não entre duas metades."
      },
      { tipo:"comparacao", icone:"⚖️", titulo:"Fusão vs. Intimidade", subtitulo:"Duas formas de estar junto",
        intro:"",
        lados:[
          { titulo:"Fusão ⚠️", icone:"🔗", cor:"#dc2626", bg:"#fee2e2", itens:["'Somos um só'","Abandona hobbies e amizades","Ansiedade quando separados","Identidade depende do parceiro","Ciúme como prova de amor"] },
          { titulo:"Intimidade ✅", icone:"💛", cor:"#16a34a", bg:"#dcfce7", itens:["'Somos dois que escolhem estar juntos'","Mantém vida própria","Conforto na separação temporária","Identidade estável fora da relação","Confiança sem controle"] }
        ]
      },
      { tipo:"lista", icone:"🌱", titulo:"Como cultivar individualidade dentro do casal", subtitulo:"O paradoxo da proximidade",
        intro:"Paradoxalmente, manter identidade própria é o que sustenta a atração e o respeito ao longo do tempo:",
        itens:[
          { icone:"🎯", titulo:"Mantenha seus interesses", texto:"Hobbies, amizades e objetivos individuais não ameaçam o casal — o nutrem" },
          { icone:"🗣️", titulo:"Expresse discordâncias", texto:"Sempre concordar não é harmonia — é apagamento. Divergir com respeito é intimidade real" },
          { icone:"⏱️", titulo:"Valorize o tempo sozinho", texto:"Estar bem consigo mesmo é pré-requisito para estar bem com o outro" },
          { icone:"🪞", titulo:"Pergunte-se regularmente", texto:"'O que eu penso? O que eu quero? O que eu sinto?' — independente do que o parceiro pensa, quer e sente" }
        ]
      },
      { tipo:"destaque", icone:"🦋", titulo:"A metáfora dos dois rios",
        frase:"Um relacionamento saudável é como dois rios que correm lado a lado — próximos, mas com suas próprias margens.",
        subtexto:"Quando dois rios se fundem completamente, perdem sua identidade. Quando correm paralelos, cada um mantém sua força — e juntos, criam algo maior do que cada um sozinho."
      }
    ]}
    perguntas={[
      "Existe algum interesse, amizade ou parte de você que foi diminuindo desde que está nessa relação?",
      "Você consegue expressar discordâncias com seu parceiro(a) sem sentir que ameaça a relação?",
      "O que você faria diferente se soubesse que manter sua individualidade fortalece — e não ameaça — o amor?"
    ]}
  />;
}

function PsicoTriangulacao({ cat }){
  const COR="#EC4899"; const BG="#fdf2f8";
  return <PsicoVisualBase titulo="A Triangulação – Quando Usamos Terceiros para Evitar Conversas Difíceis" emoji="🔺" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🔺", titulo:"O triângulo invisível", subtitulo:"Por que envolvemos terceiros em conflitos de casal",
        texto:"Quando um conflito entre dois parceiros fica tenso demais, a mente humana busca instintivamente uma saída: envolver uma terceira pessoa. Pode ser um filho, um amigo, a sogra ou até um terapeuta — qualquer um que alivie a tensão direta. Isso se chama triangulação.",
        destaque:"A triangulação alivia a tensão imediata mas impede que o conflito real seja resolvido. O problema fica enterrado — até explodir de outra forma."
      },
      { tipo:"lista", icone:"🔍", titulo:"Formas de triangulação no casal", subtitulo:"Você reconhece alguma?",
        intro:"",
        itens:[
          { icone:"👶", titulo:"Usar os filhos", texto:"Passar recados pelo filho, fazer a criança 'escolher lados', desabafar com ela sobre o cônjuge" },
          { icone:"👩‍👦", titulo:"Envolver a família", texto:"'Minha mãe também acha que você está errado(a)' — buscar aliados fora para ganhar dentro" },
          { icone:"👫", titulo:"Desabafar em excesso com amigos", texto:"Processar o conflito com terceiros em vez de com o parceiro — o amigo vira árbitro involuntário" },
          { icone:"📱", titulo:"Ciúme como triangulação", texto:"Introduzir uma ameaça real ou imaginada para provocar reação emocional no parceiro" }
        ]
      },
      { tipo:"cards", icone:"🛠️", titulo:"Como sair do triângulo", subtitulo:"Voltando para a conversa de dois",
        intro:"",
        cards:[
          { icone:"🎯", titulo:"Identifique o que evita", texto:"A triangulação serve para evitar algo: medo de rejeição, conflito direto, vulnerabilidade. Nomeie isso.", cor:COR, bg:BG },
          { icone:"🗣️", titulo:"Volte ao par", texto:"'Preciso conversar com você sobre algo que me incomoda' — direto, sem intermediários", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"🔒", titulo:"Proteja a privacidade do casal", texto:"Conflitos de casal resolvem-se dentro do casal. Compartilhar com terceiros corrói a confiança.", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"🧰", titulo:"Use apoio terapêutico", texto:"Terapia de casal é o único 'terceiro' saudável — porque o objetivo é fortalecer o par, não arbitrar", cor:"#d97706", bg:"#fef3c7" }
        ]
      },
      { tipo:"destaque", icone:"💬", titulo:"O caminho direto",
        frase:"Toda triangulação é um pedido de conversa que ainda não teve coragem de acontecer.",
        subtexto:"Quando você percebe que está envolvendo uma terceira pessoa num conflito de casal, a pergunta é: 'O que eu preciso dizer diretamente ao meu parceiro(a) que ainda não disse?'"
      }
    ]}
    perguntas={[
      "Existe alguém que você tem envolvido nos conflitos do seu relacionamento? O que isso diz sobre o que você evita dizer diretamente?",
      "Quando sente tensão no casal, qual é o seu impulso — confrontar diretamente ou buscar apoio externo?",
      "O que tornaria mais seguro ter conversas difíceis diretamente com seu parceiro(a)?"
    ]}
  />;
}

function PsicoPaisPerfeitos({ cat }){
  const COR="#EC4899"; const BG="#fdf2f8";
  return <PsicoVisualBase titulo="O Mito do Pai/Mãe Perfeito – E o Custo Real do Perfeccionismo Parental" emoji="👨‍👩‍👧" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"👨‍👩‍👧", titulo:"Ninguém foi gerado para ser perfeito", subtitulo:"Mas a cultura exige que sejamos",
        texto:"Nunca houve tantas informações sobre parentalidade — e nunca houve tanto sentimento de inadequação entre pais. O excesso de informação criou um ideal impossível: o pai/mãe perfeitamente presente, paciente, estimulante, gentil e realizado. E quem não alcança esse ideal sente que está falhando.",
        destaque:"O perfeccionismo parental não protege os filhos — mas adoece os pais e, indiretamente, as crianças."
      },
      { tipo:"lista", icone:"⚠️", titulo:"O custo do perfeccionismo parental", subtitulo:"O que ele produz na prática",
        intro:"",
        itens:[
          { icone:"😰", titulo:"Ansiedade crônica", texto:"Monitoramento constante do próprio desempenho como pai/mãe, com culpa automática a cada erro" },
          { icone:"😤", titulo:"Irritabilidade aumentada", texto:"A pressão de ser sempre paciente e gentil cria um cansaço emocional que explode nos momentos errados" },
          { icone:"💔", titulo:"Modelagem do perfeccionismo", texto:"Filhos aprendem com o que veem: pais que não toleram seus próprios erros ensinam o mesmo à criança" },
          { icone:"🚪", titulo:"Distância emocional", texto:"Pais exaustos de se cobrar ficam menos presentes emocionalmente do que pais que se permitem ser humanos" }
        ]
      },
      { tipo:"cards", icone:"🌱", titulo:"O que as crianças realmente precisam", subtitulo:"A pesquisa diz",
        intro:"Donald Winnicott cunhou o termo 'mãe suficientemente boa' — e a ciência confirma:",
        cards:[
          { icone:"🔄", titulo:"Reparação, não perfeição", texto:"O que forma o apego seguro não é nunca errar — é reparar quando erra. 'Me desculpe, errei'", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"🎭", titulo:"Emoções autênticas", texto:"Ver o pai/mãe lidar com frustração de forma humana ensina regulação emocional", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"⏱️", titulo:"Presença qualitativa", texto:"20 minutos de presença real valem mais do que 3 horas de presença física enquanto scrollando o celular", cor:COR, bg:BG },
          { icone:"🌿", titulo:"Pais que se cuidam", texto:"Um pai/mãe descansado e emocionalmente bem é mais disponível do que um exausto e culpado", cor:"#d97706", bg:"#fef3c7" }
        ]
      },
      { tipo:"destaque", icone:"💛", titulo:"A permissão para ser humano",
        frase:"Você não precisa ser perfeito(a) para ser o(a) pai/mãe que seu filho(a) precisa.",
        subtexto:"Winnicott estava certo: 'suficientemente bom(a)' é exatamente o que uma criança precisa para crescer segura. A perfeição que você persegue pode ser justamente o que está te impedindo de ser presente."
      }
    ]}
    perguntas={[
      "Em que aspecto da parentalidade você se cobra mais? Essa cobrança está te aproximando ou te afastando dos seus filhos?",
      "Lembra de um momento em que você 'errou' como pai/mãe e depois reparou? Como a criança respondeu?",
      "Como seria dar a si mesmo(a) a mesma compaixão que daria a um(a) amigo(a) que estivesse passando pelo mesmo?"
    ]}
  />;
}

function PsicoDesejoAdormece({ cat }){
  const COR="#EC4899"; const BG="#fdf2f8";
  return <PsicoVisualBase titulo="O Desejo Não Desaparece – Adormece" emoji="🔥" cor={COR} bg={BG}
    secoes={[
      { tipo:"intro", icone:"🔥", titulo:"O que acontece com o desejo no longo prazo", subtitulo:"E por que quase todos os casais passam por isso",
        texto:"Em quase todos os relacionamentos longos, chega um momento em que o desejo sexual diminui. Isso é tão comum que pesquisadores o consideram quase universal. Mas culturalmente, tratamos como sinal de que algo está errado — com a relação, com a pessoa, ou com os dois.",
        destaque:"A queda do desejo raramente significa falta de amor. Quase sempre sinaliza algo que precisa de atenção — mas não necessariamente o fim."
      },
      { tipo:"lista", icone:"🔍", titulo:"Por que o desejo adormece", subtitulo:"As causas mais comuns",
        intro:"",
        itens:[
          { icone:"🧠", titulo:"Neurobiologia do longo prazo", texto:"A dopamina da novidade diminui com a familiaridade — é fisiológico, não é falta de amor" },
          { icone:"😤", titulo:"Conflitos não resolvidos", texto:"Ressentimentos acumulados criam uma barreira emocional que bloqueia a proximidade física" },
          { icone:"🪫", titulo:"Exaustão e sobrecarga", texto:"Filhos, trabalho, finanças — quando a energia está no mínimo, o desejo vai junto" },
          { icone:"🔄", titulo:"Rotina excessiva", texto:"Previsibilidade total é confortável — mas não é excitante. O desejo precisa de algum elemento de surpresa" }
        ]
      },
      { tipo:"cards", icone:"🌱", titulo:"Como despertar o que adormeceu", subtitulo:"4 caminhos concretos",
        intro:"",
        cards:[
          { icone:"💬", titulo:"Conversa honesta", texto:"Falar sobre o desejo (ou a falta dele) sem acusação é um dos maiores atos de intimidade possíveis", cor:COR, bg:BG },
          { icone:"🆕", titulo:"Introduzir novidade", texto:"Experiências novas juntos — viagens, atividades diferentes, sair do script cotidiano — reativam dopamina", cor:"#0891b2", bg:"#e0f2fe" },
          { icone:"🤝", titulo:"Resolver o que ficou pendente", texto:"Às vezes o bloqueio é emocional. Resolver um conflito antigo pode desbloquear o desejo físico", cor:"#16a34a", bg:"#dcfce7" },
          { icone:"🧰", titulo:"Buscar apoio especializado", texto:"Terapia de casal ou sexual não é sinal de fracasso — é investimento num aspecto vital da relação", cor:"#d97706", bg:"#fef3c7" }
        ]
      },
      { tipo:"destaque", icone:"💛", titulo:"O desejo como termômetro",
        frase:"O desejo não some — ele vai para onde há espaço, cuidado e conexão emocional.",
        subtexto:"Em casais que mantêm o desejo ao longo do tempo, o denominador comum não é frequência ou técnica — é a qualidade da conexão emocional e a disposição de continuar se escolhendo ativamente."
      }
    ]}
    perguntas={[
      "O que você sente quando pensa na diminuição do desejo na sua relação — culpa, tristeza, resignação?",
      "Existe algum conflito emocional não resolvido que pode estar criando distância física também?",
      "O que vocês faziam no início da relação que criava conexão e que pararam de fazer?"
    ]}
  />;
}


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
  // Novas psicoeducações visuais
  "O Alarme Falso do Cérebro": PsicoAlarme,
  // macro_ansiedade — componentes completos
  "Pensamentos São Eventos, Não Factos": PsicoPensamentosSaoEventos,
  "O modelo ABC na prática": PsicoModeloABCV2,
  "Preocupação produtiva vs. improdutiva": PsicoPreocupacaoV2,
  "A armadilha do pior cenário": PsicoPiorCenarioV2,
  "O ciclo da ansiedade": PsicoCicloAnsiedadeV2,
  "Eustresse vs. distresse": PsicoEustresseV2,
  "O poder dos pensamentos": PsicoPensamentosV2,
  "A pizza da responsabilidade": PsicoPizzaV2,
  "Fatos vs. interpretações": PsicoFatosV2,
  "O perigo do sempre e nunca": PsicoSempreNuncaV2,
  "Desmontar o Circuito Cerebral da Ansiedade": PsicoDesmontarV2,
  "7 Distorções de Pensamento": Psico7DistorcoesV2,
  // macro_casais
  "Por Que Discutimos Sobre Dinheiro – Quando Não é Realmente Sobre Dinheiro": PsicoDiscutirDinheiro,
  "Por Que Perder-se no Outro Não É Amor – É Fusão": PsicoFusaoCasal,
  "A Triangulação – Quando Usamos Terceiros para Evitar Conversas Difíceis": PsicoTriangulacao,
  "O Mito do Pai/Mãe Perfeito – E o Custo Real do Perfeccionismo Parental": PsicoPaisPerfeitos,
  "O Desejo Não Desaparece – Adormece": PsicoDesejoAdormece,
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

// Mapa legado → macro para psicoeducação (fora do componente para evitar hoisting)
const PSICO_LEGADO_MACRO = {
  tcc:"macro_ansiedade", ansiedade:"macro_ansiedade", esquema:"macro_ansiedade",
  emocoes:"macro_humor", autocuidado:"macro_habitos",
  relacionamentos:"macro_relacionamentos", casais:"macro_casais", corpo:"macro_corpo",
  outros:"macro_ansiedade", autoestima:"macro_humor", mindfulness:"macro_habitos",
  trauma:"macro_ansiedade", depressao:"macro_humor", habitos:"macro_habitos",
  // novas macrocategorias já passam direto
  macro_ansiedade:"macro_ansiedade", macro_humor:"macro_humor",
  macro_habitos:"macro_habitos", macro_relacionamentos:"macro_relacionamentos",
  macro_casais:"macro_casais", macro_corpo:"macro_corpo",
};

function AbaPsicoeducacao() {
  const [itens, setItens]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editando, setEditando]   = useState(null);
  const [salvando, setSalvando]   = useState(false);
  const [filtro, setFiltro]       = useState("todos");
  const [aberto, setAberto]       = useState(null);

  // Mapa de categorias legado → nova macrocategoria clínica
  const REMAP_PSICO = {
    "tcc":             "macro_ansiedade",
    "ansiedade":       "macro_ansiedade",
    "esquema":         "macro_ansiedade",
    "emocoes":         "macro_humor",
    "autocuidado":     "macro_habitos",
    "relacionamentos": "macro_relacionamentos",
    "casais":          "macro_casais",
    "corpo":           "macro_corpo",
    "outros":          "macro_ansiedade",
    // legados extras
    "autoestima":      "macro_humor",
    "mindfulness":     "macro_habitos",
    "trauma":          "macro_ansiedade",
    "depressao":       "macro_humor",
    "habitos":         "macro_habitos",
  };

  async function migrarCatPsico(){
    if(!confirm("Migrar categorias de psicoeducação para a nova taxonomia clínica?")) return;
    setSalvando(true);
    try{
      const snap = await db.collection("clinica_psicoeducacao").get();
      const batch = db.batch();
      let count = 0;
      snap.docs.forEach(doc=>{
        const cat = doc.data().categoria;
        const nova = REMAP_PSICO[cat];
        if(nova && nova!==cat){ batch.update(doc.ref,{categoria:nova}); count++; }
      });
      if(count===0){ alert("✅ Todas já estão na nova taxonomia!"); setSalvando(false); return; }
      await batch.commit();
      alert(`✅ ${count} material(is) migrado(s) para a nova taxonomia clínica!`);
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

  // Filtro: "todos" ou macrocategoria + legado mapeado (PSICO_LEGADO_MACRO declarado fora)
  const filtrados = filtro==="todos" ? itens : itens.filter(i=>{
    if(i.categoria===filtro) return true;
    const macro = MACROCATEGORIAS.find(m=>m.id===filtro);
    if(macro){
      const subIds = new Set(macro.subs.map(s=>s.id));
      return subIds.has(i.categoria) || PSICO_LEGADO_MACRO[i.categoria]===filtro;
    }
    return false;
  });

  if(loading) return <Spinner/>;

  if(aberto){
    const macroAberto = MACROCATEGORIAS.find(m=>m.id===aberto.categoria||m.subs.some(s=>s.id===aberto.categoria))||MACROCATEGORIAS[0];
    const cat = {label:macroAberto.label, cor:macroAberto.cor, bg:macroAberto.bg, accent:macroAberto.cor};
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

      {/* Filtro por macrocategoria clínica */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap",paddingBottom:4}}>
        <button onClick={()=>setFiltro("todos")}
          style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid",whiteSpace:"nowrap",flexShrink:0,
            borderColor:filtro==="todos"?"var(--purple)":"var(--gray-200)",
            background:filtro==="todos"?"var(--purple)":"white",
            color:filtro==="todos"?"white":"var(--gray-600)",fontSize:12,cursor:"pointer",fontWeight:filtro==="todos"?600:400}}>
          Todos ({itens.length})
        </button>
        {MACROCATEGORIAS.map(m=>{
          const subIds = new Set(m.subs.map(s=>s.id));
          const count = itens.filter(i=>subIds.has(i.categoria)||PSICO_LEGADO_MACRO[i.categoria]===m.id).length;
          if(count===0) return null;
          return (
            <button key={m.id} onClick={()=>setFiltro(m.id)}
              style={{padding:"5px 14px",borderRadius:20,border:"1.5px solid",whiteSpace:"nowrap",flexShrink:0,
                borderColor:filtro===m.id?m.cor:m.cor+"50",
                background:filtro===m.id?m.cor:m.bg,
                color:filtro===m.id?"white":m.cor,
                fontSize:12,cursor:"pointer",fontWeight:filtro===m.id?600:400}}>
              {m.icone} {m.label} ({count})
            </button>
          );
        })}
      </div>

      {filtrados.length===0
        ? <div style={{textAlign:"center",padding:40,color:"var(--text-muted)",fontSize:14}}>
            Nenhum material cadastrado ainda.<br/>
            <button className="btn btn-purple" style={{marginTop:12}} onClick={()=>setModal(true)}>Adicionar primeiro material</button>
          </div>
        : (() => {
            // Agrupa por macrocategoria
            const grupos = MACROCATEGORIAS.map(m=>{
              const itensGrupo = filtrados.filter(i=>
                i.categoria===m.id ||
                PSICO_LEGADO_MACRO[i.categoria]===m.id ||
                m.subs.some(s=>s.id===i.categoria)
              );
              return {...m, itens: itensGrupo};
            }).filter(g=>g.itens.length>0);
            const orfaos = filtrados.filter(i=>!MACROCATEGORIAS.some(m=>
              i.categoria===m.id||PSICO_LEGADO_MACRO[i.categoria]===m.id||m.subs.some(s=>s.id===i.categoria)
            ));
            const todosGrupos = [...grupos, ...(orfaos.length>0?[{id:"_orfaos",label:"Sem Categoria",icone:"🔧",cor:"#6b7280",bg:"#f3f4f6",itens:orfaos}]:[])];

            function CardPsico({item, cat}){
              return (
                <div style={{background:"white",borderRadius:12,border:"1px solid var(--gray-200)",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
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
            }

            return (
              <div>
                {todosGrupos.map(grupo=>(
                  <div key={grupo.id} style={{marginBottom:28}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,paddingBottom:8,borderBottom:"1px solid var(--gray-100)"}}>
                      <span style={{fontSize:18}}>{grupo.icone}</span>
                      <span style={{fontWeight:700,fontSize:12,color:grupo.cor,textTransform:"uppercase",letterSpacing:"0.8px"}}>{grupo.label}</span>
                      <span style={{background:grupo.bg,color:grupo.cor,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>{grupo.itens.length}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
                      {grupo.itens.map(item=>(
                        <CardPsico key={item.id} item={item} cat={{label:grupo.label,cor:grupo.cor,bg:grupo.bg}}/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
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
                  {MACROCATEGORIAS.map(m=>(
                    <optgroup key={m.id} label={`${m.icone} ${m.label}`}>
                      {m.subs.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                    </optgroup>
                  ))}
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

  // Mapa de categorias legado para macrocategoria
  const LEGADO_PARA_MACRO = {
    "tcc":             "macro_ansiedade",
    "ansiedade":       "macro_ansiedade",
    "esquema":         "macro_ansiedade",
    "emocoes":         "macro_humor",
    "autocuidado":     "macro_habitos",
    "relacionamentos": "macro_relacionamentos",
    "corpo":           "macro_corpo",
    // formularioKey → macro (para ferramentas ainda com categoria legado)
    "breathing-478":      "macro_ansiedade",
    "muscle-relaxation":  "macro_corpo",
    "anxiety-management": "macro_ansiedade",
    "decision-tree":      "macro_ansiedade",
    "abc-record":         "macro_ansiedade",
    "emotional-eating":   "macro_corpo",
  };

  const filtrados = abaRecursos.filter(r=>{
    const macro = MACROCATEGORIAS.find(m=>m.id===filtroCateg);
    let cOk;
    if(filtroCateg==="todos"){
      cOk = true;
    } else if(macro){
      // Macrocategoria — inclui: id direto da macro, subcategorias, legado, formularioKey
      const subIds = new Set(macro.subs.map(s=>s.id));
      const legadoIds = new Set(
        Object.entries(LEGADO_PARA_MACRO)
          .filter(([,macroId])=>macroId===filtroCateg)
          .map(([legId])=>legId)
      );
      cOk = r.categoria === filtroCateg        // categoria igual ao id da macro (ex: "macro_humor")
         || subIds.has(r.categoria)            // subcategoria da macro
         || legadoIds.has(r.categoria)         // categoria legado mapeada
         || legadoIds.has(r.formularioKey);    // formularioKey legado mapeado
    } else {
      cOk = r.categoria===filtroCateg;
    }
    const bOk = !busca || r.titulo?.toLowerCase().includes(busca.toLowerCase()) || r.descricao?.toLowerCase().includes(busca.toLowerCase());
    return cOk && bOk;
  });

  // Agrupa por categoria no grid
  const todasCatsConhecidas = new Set([
    ...CATEGORIAS_LEGADO.map(c=>c.id),
    ...TODAS_SUBCATEGORIAS.map(s=>s.id),
    ...MACROCATEGORIAS.map(m=>m.id), // inclui macro_humor, macro_habitos etc.
  ]);
  const porCategoria = [];
  // Macrocategorias (agrupa todas as subcategorias)
  MACROCATEGORIAS.forEach(m=>{
    const subIds = new Set(m.subs.map(s=>s.id));
    const itens = filtrados.filter(r=>r.categoria===m.id||subIds.has(r.categoria));
    if(itens.length>0) porCategoria.push({...m, itens});
  });
  // Musicoterapia e Avaliação separados
  ["musicoterapia","avaliacao"].forEach(cid=>{
    const cat = CATEGORIAS_LEGADO.find(c=>c.id===cid);
    if(!cat) return;
    const itens = filtrados.filter(r=>r.categoria===cid);
    if(itens.length>0) porCategoria.push({...cat, itens});
  });
  // Órfãos (categorias não reconhecidas)
  const orfaos = filtrados.filter(r=>!todasCatsConhecidas.has(r.categoria));
  if(orfaos.length>0) porCategoria.push({
    id:"_orfaos", label:"Sem Categoria", cor:"#6b7280", bg:"#f3f4f6", itens:orfaos
  });

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
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost" style={{fontSize:12}} title="Corrige categorias antigas no Firebase"
            onClick={async()=>{
              if(!confirm("Corrigir categorias de Respiração e Relaxamento no Firebase?")) return;
              const snap = await db.collection("clinica_recursos").get();
              const validas = new Set(["tcc","ansiedade","emocoes","autocuidado","relacionamentos","corpo","esquema","musicoterapia","avaliacao","outro","casal"]);
              const batch = db.batch();
              let n = 0;
              // Mapa de redistribuição clínica
              const REMAP_KEY = {
                "breathing-478":      {categoria:"ansiedade_diaria",    subcategoria:"Ansiedade Diária e Crises"},
                "muscle-relaxation":  {categoria:"nervovago",           subcategoria:"Regulação do Sistema Nervoso"},
                "anxiety-management": {categoria:"ansiedade_diaria",    subcategoria:"Ansiedade Diária e Crises"},
                "decision-tree":      {categoria:"procrastinacao",      subcategoria:"Procrastinação e Foco"},
                "abc-record":         {categoria:"distorcoes",          subcategoria:"Distorções Cognitivas e Ruminação"},
                "emotional-eating":   {categoria:"alimentacao",         subcategoria:"Alimentação Emocional e Compulsão"},
                "treino-neuro-auditivo":{categoria:"musicoterapia",     subcategoria:""},
                "entrevista-clinica": {categoria:"avaliacao",           subcategoria:""},
                "anamnese":           {categoria:"avaliacao",           subcategoria:""},
              };
              const MANTER = new Set(["musicoterapia","avaliacao"]);
              snap.docs.forEach(doc=>{
                const d = doc.data();
                const remap = REMAP_KEY[d.formularioKey];
                if(remap){
                  batch.update(doc.ref,{categoria:remap.categoria, subcategoria:remap.subcategoria}); n++;
                } else if(!validas.has(d.categoria) && !MANTER.has(d.categoria)){
                  batch.update(doc.ref,{categoria:"outro"}); n++;
                }
              });
              if(n===0){alert("✅ Nenhuma correção necessária — todas as categorias já estão corretas!");return;}
              await batch.commit();
              alert(`✅ ${n} ferramenta(s) corrigida(s)! Respiração e Relaxamento agora aparecem em Ansiedade.`);
            }}>
            🔧 Corrigir Categorias
          </button>
          <button className="btn btn-purple" onClick={()=>{setForm({titulo:"",descricao:"",categoria:"tcc",tipo:"interativa",formularioKey:"",musicUrl:""});setEditando(null);setModal(true);}}>
            <Icon name="plus" size={16}/> Nova Ferramenta
          </button>
        </div>
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
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input className="form-input" style={{flex:1,minWidth:200}} placeholder="Buscar por nome, descricao ou tipo..." value={busca} onChange={e=>setBusca(e.target.value)}/>
      </div>
      {/* Filtros por macrocategoria */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",paddingBottom:4}}>
          <button className={"btn "+(filtroCateg==="todos"?"btn-purple":"btn-ghost")}
            style={{fontSize:12}} onClick={()=>setFiltroCateg("todos")}>
            Todas {recursos.length}
          </button>
          {/* Macrocategorias clínicas */}
          {MACROCATEGORIAS.map(m=>{
            const subIds = new Set(m.subs.map(s=>s.id));
            const legadoIds = new Set(Object.entries(LEGADO_PARA_MACRO).filter(([,mid])=>mid===m.id).map(([lid])=>lid));
            const n = recursos.filter(r=>r.categoria===m.id||subIds.has(r.categoria)||legadoIds.has(r.categoria)).length;
            const ativo = filtroCateg===m.id;
            return (
              <button key={m.id} onClick={()=>setFiltroCateg(filtroCateg===m.id?"todos":m.id)}
                style={{fontSize:12,padding:"6px 12px",borderRadius:20,border:"2px solid",cursor:"pointer",
                  fontFamily:"inherit",fontWeight:600,transition:"all .15s",
                  borderColor: ativo ? m.cor : m.cor+"50",
                  background: ativo ? m.cor : m.bg,
                  color: ativo ? "white" : m.cor,
                  whiteSpace:"nowrap"}}>
                {m.icone} {m.label} {n>0?`(${n})`:""}
              </button>
            );
          })}
          {/* Categorias fixas */}
          {["musicoterapia","avaliacao"].map(cid=>{
            const cat = CATEGORIAS_LEGADO.find(c=>c.id===cid);
            if(!cat) return null;
            const n = recursos.filter(r=>r.categoria===cid).length;
            const ativo = filtroCateg===cid;
            return (
              <button key={cid} onClick={()=>setFiltroCateg(filtroCateg===cid?"todos":cid)}
                style={{fontSize:12,padding:"6px 12px",borderRadius:20,border:"2px solid",cursor:"pointer",
                  fontFamily:"inherit",fontWeight:600,
                  borderColor:"#7B00C4",
                  background: ativo?"#7B00C4":"#f3e6ff",
                  color: ativo?"white":"#7B00C4"}}>
                {cid==="musicoterapia"?"🎵":"📋"} {cat.label} {n>0?`(${n})`:""}
              </button>
            );
          })}
        </div>
        {/* Info da macro selecionada */}
        {filtroCateg!=="todos" && MACROCATEGORIAS.find(m=>m.id===filtroCateg)&&(
          <div style={{paddingLeft:10,borderLeft:"3px solid",
            borderColor:MACROCATEGORIAS.find(m=>m.id===filtroCateg)?.cor,
            fontSize:12,color:"var(--text-muted)",lineHeight:1.6}}>
            {MACROCATEGORIAS.find(m=>m.id===filtroCateg)?.subs.map(s=>s.label).join(" · ")}
          </div>
        )}
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
              {/* Macrocategorias clínicas */}
              {MACROCATEGORIAS.map(m=>(
                <div key={m.id} style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:m.cor,textTransform:"uppercase",
                    letterSpacing:"0.6px",marginBottom:6}}>
                    {m.icone} {m.label}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {m.subs.map(s=>(
                      <button key={s.id} onClick={()=>setForm({...form,categoria:s.id})}
                        style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",
                          fontSize:12,fontFamily:"var(--font-body)",
                          borderColor:form.categoria===s.id?m.cor:"var(--gray-200)",
                          background:form.categoria===s.id?m.bg:"white",
                          color:form.categoria===s.id?m.cor:"var(--gray-600)",
                          fontWeight:form.categoria===s.id?600:400}}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {/* Especializadas */}
              <div style={{marginTop:6}}>
                <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",
                  letterSpacing:"0.6px",marginBottom:6}}>Especializadas</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[{id:"musicoterapia",label:"🎵 Musicoterapia"},{id:"avaliacao",label:"📋 Avaliação e Anamnese"},{id:"outro",label:"🔧 Outros"}].map(c=>(
                    <button key={c.id} onClick={()=>setForm({...form,categoria:c.id})}
                      style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",
                        fontSize:12,fontFamily:"var(--font-body)",
                        borderColor:form.categoria===c.id?"#7B00C4":"var(--gray-200)",
                        background:form.categoria===c.id?"#f3e6ff":"white",
                        color:form.categoria===c.id?"#7B00C4":"var(--gray-600)",
                        fontWeight:form.categoria===c.id?600:400}}>
                      {c.label}
                    </button>
                  ))}
                </div>
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
