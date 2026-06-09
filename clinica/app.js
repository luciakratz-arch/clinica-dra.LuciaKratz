// ═══════════════════════════════════════════════════════
//  PORTAL CLÍNICO — DRA. LUCIA KRATZ
//  clinica/app.js — Paciente (individual + casal) + Aluno
// ═══════════════════════════════════════════════════════


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

// ─── LOG DE USO DE RECURSOS ─────────────────────────────
// Registra quando a paciente ABRE um recurso e quando SALVA algo.
// Alimenta o relatório "Uso de Recursos" na Evolução do admin.
function registrarUsoRecurso(user, info, tipo, extra) {
  if (!user || !user.id) return;
  try {
    db.collection("clinica_recurso_acessos").add({
      pacienteId:    user.id,
      pacienteNome:  user.nome || "",
      recursoId:     (info && info.id) || "",
      recursoTitulo: (info && (info.titulo || info.nome)) || "",
      formularioKey: (info && info.formularioKey) || "",
      colecao:       (info && info._colecao) || "",
      tipo,                                  // "abriu" | "salvou"
      detalhe:       (extra && extra.detalhe) || "",
      data: new Date().toLocaleDateString("pt-BR"),
      hora: new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) {}
}

// ─── ICON ────────────────────────────────────────────────
function Icon({ name, size = 18 }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
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
function MinhaConta({ user }) {
  const [form, setForm]       = React.useState({
    nome:     user.nome||"",
    email:    user.email||"",
    telefone: user.telefone||"",
    genero:   user.genero||"",
  });
  const [senha,    setSenha]    = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [msg,      setMsg]      = React.useState("");

  async function salvar() {
    setSalvando(true);
    try {
      const dados = { nome:form.nome, telefone:form.telefone, genero:form.genero };
      await db.collection("clinica_pacientes").doc(user.id).update(dados);
      if (senha.trim()) {
        await firebase.auth().currentUser?.updatePassword(senha).catch(()=>{});
      }
      setMsg("✓ Dados atualizados com sucesso!");
      setTimeout(()=>setMsg(""),3000);
    } catch(e) { setMsg("Erro ao salvar. Tente novamente."); }
    setSalvando(false);
  }

  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,marginBottom:4}}>Minha Conta</div>
        <div style={{fontSize:13,color:"var(--text-muted)"}}>Atualize seus dados pessoais</div>
      </div>

      {/* Avatar */}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,padding:16,background:"#f5f3ff",borderRadius:12}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:"var(--purple)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"white",fontWeight:700,flexShrink:0}}>
          {(form.nome||"P")[0].toUpperCase()}
        </div>
        <div>
          <div style={{fontWeight:600,fontSize:15}}>{form.nome||"—"}</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>{user.email}</div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
        <div>
          <label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:5}}>Nome completo</label>
          <input className="form-input" value={form.nome}
            onChange={e=>setForm(f=>({...f,nome:e.target.value}))}
            placeholder="Seu nome completo"/>
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:5}}>Telefone / WhatsApp</label>
          <input className="form-input" value={form.telefone}
            onChange={e=>setForm(f=>({...f,telefone:e.target.value}))}
            placeholder="(00) 00000-0000"/>
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:5}}>Gênero</label>
          <select className="form-input" value={form.genero}
            onChange={e=>setForm(f=>({...f,genero:e.target.value}))}>
            <option value="">Selecionar...</option>
            <option value="Feminino">Feminino</option>
            <option value="Masculino">Masculino</option>
            <option value="Não-binário">Não-binário</option>
            <option value="Prefiro não informar">Prefiro não informar</option>
          </select>
        </div>
        <div>
          <label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:5}}>Nova senha <span style={{color:"var(--text-muted)",fontWeight:400}}>(deixe em branco para não alterar)</span></label>
          <input className="form-input" type="password" value={senha}
            onChange={e=>setSenha(e.target.value)}
            placeholder="Digite nova senha..."/>
        </div>
      </div>

      {msg && (
        <div style={{background:msg.startsWith("✓")?"#d1fae5":"#fef3c7",border:"1px solid",borderColor:msg.startsWith("✓")?"#6ee7b7":"#f59e0b",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:msg.startsWith("✓")?"#065f46":"#92400e"}}>
          {msg}
        </div>
      )}

      <button className="btn-primary" style={{width:"100%"}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar alterações"}
      </button>
    </div>
  );
}

// ── Diário Terapêutico ──────────────────────────────────────────────────────
function FerramentaDiario({ user }){
  const [entradas,  setEntradas]  = React.useState([]);
  const [texto,     setTexto]     = React.useState("");
  const [tag,       setTag]       = React.useState("geral");
  const [salvando,  setSalvando]  = React.useState(false);
  const [msg,       setMsg]       = React.useState("");
  const [verEntrada,setVerEntrada]= React.useState(null);
  const [loading,   setLoading]   = React.useState(true);

  const TAGS = [
    {v:"geral",     l:"Geral",     e:"📝"},
    {v:"gratidao",  l:"Gratidão",  e:"🙏"},
    {v:"desafio",   l:"Desafio",   e:"⚡"},
    {v:"conquista", l:"Conquista", e:"🏆"},
    {v:"emocao",    l:"Emoção",    e:"💜"},
  ];

  // Prompts rotativos por dia da semana
  const PROMPTS = [
    "O que você está carregando hoje que precisa colocar para fora?",
    "O que te surpreendeu em você esta semana?",
    "Se você pudesse falar com alguém hoje, o que diria?",
    "O que está difícil de aceitar neste momento da sua vida?",
    "Que pensamento fica voltando à sua mente hoje?",
    "O que você precisaria ouvir de alguém que ama?",
    "Que parte de você está pedindo mais atenção agora?",
  ];
  const promptDia = PROMPTS[new Date().getDay()];

  React.useEffect(()=>{
    if(!user?.id){setLoading(false);return;}
    const unsub = db.collection("clinica_diario")
      .where("pacienteId","==",user.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setEntradas(docs);
        setLoading(false);
      }, ()=>setLoading(false));
    return ()=>unsub();
  },[user?.id]);

  async function salvar(){
    if(!texto.trim()){setMsg("Escreva algo antes de salvar.");setTimeout(()=>setMsg(""),2500);return;}
    setSalvando(true);
    try {
      await db.collection("clinica_diario").add({
        pacienteId: user?.id||"", pacienteNome: user?.nome||"",
        texto: texto.trim(), tag,
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setTexto(""); setTag("geral");
      setMsg("✓ Entrada salva! 💜");
      setTimeout(()=>setMsg(""),2500);
    } catch(e){ setMsg("Erro ao salvar."); }
    setSalvando(false);
  }

  async function excluir(id){
    if(!confirm("Excluir esta entrada?"))return;
    await db.collection("clinica_diario").doc(id).delete();
    setVerEntrada(null);
  }

  // ── Ver entrada ──────────────────────────────────────────────────
  if(verEntrada) return(
    <div>
      <button onClick={()=>setVerEntrada(null)}
        style={{background:"none",border:"none",cursor:"pointer",color:"var(--purple)",fontSize:13,fontWeight:600,fontFamily:"inherit",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
        ← Voltar
      </button>
      <div style={{background:"#fffdf5",borderRadius:14,padding:24,border:"1px solid #f3e6c0",
        backgroundImage:"repeating-linear-gradient(transparent,transparent 27px,#f0ebe0 27px,#f0ebe0 28px)",
        lineHeight:"28px",fontFamily:"Georgia,serif"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,fontFamily:"var(--font-body)"}}>
          <span style={{fontSize:12,color:"var(--text-muted)"}}>{verEntrada.data} · {verEntrada.hora}</span>
          <span style={{fontSize:11,color:"var(--purple)",background:"var(--purple-soft)",borderRadius:20,padding:"2px 10px"}}>
            {TAGS.find(t=>t.v===verEntrada.tag)?.e} {TAGS.find(t=>t.v===verEntrada.tag)?.l}
          </span>
        </div>
        <div style={{fontSize:15,lineHeight:"28px",color:"#2d2d2d",whiteSpace:"pre-wrap",fontFamily:"Georgia,serif"}}>{verEntrada.texto}</div>
      </div>
      <button onClick={()=>excluir(verEntrada.id)}
        style={{marginTop:16,padding:"8px 16px",borderRadius:8,border:"1px solid #fca5a5",background:"white",color:"#dc2626",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
        🗑 Excluir entrada
      </button>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Diário Terapêutico</div>
        <div className="page-subtitle">Um espaço só seu, sem julgamentos</div>
      </div>

      {/* Prompt do dia */}
      <div style={{background:"linear-gradient(135deg,#f3e6ff,#ede9fe)",borderRadius:12,padding:"14px 16px",
        marginBottom:16,borderLeft:"3px solid var(--purple)"}}>
        <div style={{fontSize:11,fontWeight:700,color:"var(--purple)",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>
          💭 Reflexão de hoje
        </div>
        <div style={{fontSize:14,color:"#3d006a",fontStyle:"italic",lineHeight:1.6}}>{promptDia}</div>
      </div>

      {/* Tags */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {TAGS.map(t=>(
          <button key={t.v} onClick={()=>setTag(t.v)}
            style={{padding:"5px 12px",borderRadius:16,border:"1.5px solid",cursor:"pointer",
              fontFamily:"inherit",fontSize:12,
              borderColor:tag===t.v?"var(--purple)":"var(--gray-200)",
              background:tag===t.v?"var(--purple-soft)":"white",
              color:tag===t.v?"var(--purple)":"var(--text-muted)",
              fontWeight:tag===t.v?700:400}}>
            {t.e} {t.l}
          </button>
        ))}
      </div>

      {/* Caderno */}
      <div style={{position:"relative",background:"#fffdf5",borderRadius:14,
        border:"1px solid #f3e6c0",marginBottom:12,overflow:"hidden"}}>
        {/* Margem vermelha */}
        <div style={{position:"absolute",left:40,top:0,bottom:0,width:1,background:"#fca5a5",opacity:0.4}}/>
        <textarea
          value={texto}
          onChange={e=>setTexto(e.target.value)}
          placeholder="Escreva livremente aqui..."
          style={{
            width:"100%", minHeight:220, padding:"16px 16px 16px 52px",
            background:"transparent",border:"none",outline:"none",resize:"none",
            fontSize:15, lineHeight:"28px", fontFamily:"Georgia,serif",
            color:"#2d2d2d", boxSizing:"border-box",
            backgroundImage:"repeating-linear-gradient(transparent,transparent 27px,#f0ebe0 27px,#f0ebe0 28px)",
          }}/>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:12,color:"var(--text-muted)"}}>{texto.length} caracteres</span>
        {msg&&<span style={{fontSize:13,color:"var(--purple)",fontWeight:600}}>{msg}</span>}
      </div>

      <button onClick={salvar} disabled={salvando||!texto.trim()}
        style={{width:"100%",padding:"12px",borderRadius:10,border:"none",
          background:texto.trim()?"var(--purple)":"var(--gray-100)",
          color:texto.trim()?"white":"var(--text-muted)",cursor:texto.trim()?"pointer":"not-allowed",
          fontSize:14,fontWeight:700,fontFamily:"inherit",marginBottom:24}}>
        {salvando?"Salvando...":"Salvar entrada 💜"}
      </button>

      {/* Histórico */}
      {entradas.length>0&&(
        <div>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>
            Entradas anteriores
          </div>
          {entradas.map(e=>(
            <button key={e.id} onClick={()=>setVerEntrada(e)}
              style={{width:"100%",background:"white",border:"1px solid var(--gray-100)",borderRadius:12,
                padding:"12px 16px",marginBottom:8,cursor:"pointer",textAlign:"left",fontFamily:"inherit",
                display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:8,background:"var(--purple-soft)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                {TAGS.find(t=>t.v===e.tag)?.e||"📝"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{e.data}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {e.texto.slice(0,60)}{e.texto.length>60?"...":""}
                </div>
              </div>
              <Icon name="chevron-right" size={14} style={{color:"var(--text-muted)",flexShrink:0}}/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}



function RegistroHumor({ user }) {
  const [etapa,    setEtapa]    = React.useState("humor");   // humor | emocoes | gatilhos | concluido
  const [valor,    setValor]    = React.useState(null);
  const [emocoes,  setEmocoes]  = React.useState([]);
  const [gatilhos, setGatilhos] = React.useState([]);
  const [nota,     setNota]     = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [historico,setHistorico]= React.useState([]);

  React.useEffect(()=>{
    const unsub = db.collection("clinica_humor").where("pacienteId","==",user.id)
      .onSnapshot(s=>{
        const docs = s.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setHistorico(docs.slice(0,14));
      },()=>{});
    return unsub;
  },[user.id]);

  const NIVEIS = [
    {v:1, emoji:"😞", label:"Muito mal",    cor:"#dc2626", bg:"#fee2e2"},
    {v:2, emoji:"😔", label:"Mal",          cor:"#ea580c", bg:"#fed7aa"},
    {v:3, emoji:"😕", label:"Abaixo do normal", cor:"#d97706", bg:"#fef3c7"},
    {v:4, emoji:"😐", label:"Regular",      cor:"#ca8a04", bg:"#fef9c3"},
    {v:5, emoji:"🙂", label:"Ok",           cor:"#65a30d", bg:"#ecfccb"},
    {v:6, emoji:"😊", label:"Bem",          cor:"#16a34a", bg:"#dcfce7"},
    {v:7, emoji:"😄", label:"Muito bem",    cor:"#059669", bg:"#d1fae5"},
  ];

  const EMOCOES_LISTA = [
    {v:"ansioso",    l:"Ansioso",    e:"😰"},
    {v:"irritado",   l:"Irritado",   e:"😤"},
    {v:"triste",     l:"Triste",     e:"😢"},
    {v:"cansado",    l:"Cansado",    e:"😴"},
    {v:"angustiado", l:"Angustiado", e:"😟"},
    {v:"alegre",     l:"Alegre",     e:"😄"},
    {v:"calmo",      l:"Calmo",      e:"😌"},
    {v:"motivado",   l:"Motivado",   e:"💪"},
    {v:"grato",      l:"Grato",      e:"🙏"},
    {v:"sobrecarregado",l:"Sobrecarregado",e:"🫠"},
    {v:"esperancoso",l:"Esperançoso",e:"🌟"},
    {v:"confuso",    l:"Confuso",    e:"🤔"},
  ];

  const GATILHOS_LISTA = [
    {v:"trabalho",   l:"Trabalho",   e:"💼"},
    {v:"familia",    l:"Família",    e:"👨‍👩‍👧"},
    {v:"sono",       l:"Sono",       e:"😴"},
    {v:"saude",      l:"Saúde",      e:"🏥"},
    {v:"financas",   l:"Finanças",   e:"💰"},
    {v:"relacao",    l:"Relação",    e:"💑"},
    {v:"solidao",    l:"Solidão",    e:"🫂"},
    {v:"conquista",  l:"Conquista",  e:"🏆"},
    {v:"exercicio",  l:"Exercício",  e:"🏃"},
    {v:"alimentacao",l:"Alimentação",e:"🥗"},
    {v:"clima",      l:"Clima",      e:"🌤"},
    {v:"lazer",      l:"Lazer",      e:"🎉"},
  ];

  const toggleItem = (list, setList, val) => {
    setList(list.includes(val) ? list.filter(x=>x!==val) : [...list, val]);
  };

  async function salvar(){
    if(!valor) return;
    setSalvando(true);
    const hoje = new Date().toLocaleDateString("pt-BR");
    try {
      await db.collection("clinica_humor").add({
        pacienteId:user.id, nome:user.nome,
        valor, emocoes, gatilhos, nota,
        data: hoje,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setEtapa("concluido");
    } catch(e){ alert("Erro ao salvar."); }
    setSalvando(false);
  }

  function reiniciar(){
    setValor(null); setEmocoes([]); setGatilhos([]); setNota(""); setEtapa("humor");
  }

  const nivelAtual = NIVEIS.find(n=>n.v===valor);

  // ── Etapa: Humor ────────────────────────────────────────────────
  if(etapa==="humor") return (
    <div>
      <div className="page-header">
        <div className="page-title">Check-in Diário</div>
        <div className="page-subtitle">Como está o seu humor agora?</div>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",margin:"32px 0"}}>
        {NIVEIS.map(n=>(
          <button key={n.v} onClick={()=>{setValor(n.v);setEtapa("emocoes");}}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,
              padding:"16px 14px",borderRadius:16,border:"2px solid",cursor:"pointer",
              fontFamily:"inherit",minWidth:80,
              borderColor: valor===n.v ? n.cor : "var(--gray-100)",
              background: valor===n.v ? n.bg : "white",
              boxShadow: valor===n.v ? `0 4px 12px ${n.cor}30` : "0 1px 4px rgba(0,0,0,0.05)",
              transition:"all .15s"}}>
            <span style={{fontSize:36}}>{n.emoji}</span>
            <span style={{fontSize:11,fontWeight:600,color:valor===n.v?n.cor:"var(--text-muted)"}}>{n.label}</span>
          </button>
        ))}
      </div>
      {historico.length>0&&(
        <div style={{marginTop:8}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.5px"}}>Últimos 14 dias</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {historico.slice(0,14).reverse().map((h,i)=>{
              const n = NIVEIS.find(x=>x.v===h.valor)||NIVEIS[3];
              return (
                <div key={i} title={`${h.data}: ${n.label}`}
                  style={{width:32,height:32,borderRadius:8,background:n.bg,border:`2px solid ${n.cor}40`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
                  {n.emoji}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ── Etapa: Emoções ───────────────────────────────────────────────
  if(etapa==="emocoes") return (
    <div>
      <button onClick={()=>setEtapa("humor")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--purple)",fontSize:13,fontWeight:600,fontFamily:"inherit",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
        ← Voltar
      </button>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:48}}>{nivelAtual?.emoji}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:nivelAtual?.cor,marginTop:6}}>{nivelAtual?.label}</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:4}}>Que emoções estão presentes agora? (opcional)</div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:24}}>
        {EMOCOES_LISTA.map(em=>{
          const sel = emocoes.includes(em.v);
          return (
            <button key={em.v} onClick={()=>toggleItem(emocoes,setEmocoes,em.v)}
              style={{padding:"8px 14px",borderRadius:20,border:"1.5px solid",cursor:"pointer",
                fontFamily:"inherit",fontSize:13,display:"flex",alignItems:"center",gap:6,
                borderColor:sel?"var(--purple)":"var(--gray-200)",
                background:sel?"var(--purple-soft)":"white",
                color:sel?"var(--purple)":"var(--text-muted)",
                fontWeight:sel?700:400,transition:"all .12s"}}>
              {em.e} {em.l}
            </button>
          );
        })}
      </div>
      <button onClick={()=>setEtapa("gatilhos")}
        style={{width:"100%",padding:"13px",borderRadius:12,border:"none",
          background:"var(--purple)",color:"white",cursor:"pointer",
          fontSize:14,fontWeight:700,fontFamily:"inherit"}}>
        Continuar →
      </button>
    </div>
  );

  // ── Etapa: Gatilhos ──────────────────────────────────────────────
  if(etapa==="gatilhos") return (
    <div>
      <button onClick={()=>setEtapa("emocoes")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--purple)",fontSize:13,fontWeight:600,fontFamily:"inherit",marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
        ← Voltar
      </button>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>O que influenciou o seu humor?</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:4}}>Selecione os fatores (opcional)</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:8,marginBottom:20}}>
        {GATILHOS_LISTA.map(g=>{
          const sel = gatilhos.includes(g.v);
          return (
            <button key={g.v} onClick={()=>toggleItem(gatilhos,setGatilhos,g.v)}
              style={{padding:"12px 8px",borderRadius:12,border:"1.5px solid",cursor:"pointer",
                fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                borderColor:sel?"var(--purple)":"var(--gray-200)",
                background:sel?"var(--purple-soft)":"white",
                transition:"all .12s"}}>
              <span style={{fontSize:22}}>{g.e}</span>
              <span style={{fontSize:11,fontWeight:sel?700:400,color:sel?"var(--purple)":"var(--text-muted)"}}>{g.l}</span>
            </button>
          );
        })}
      </div>
      <textarea value={nota} onChange={e=>setNota(e.target.value)}
        placeholder="Algo mais que queira registrar? (opcional)"
        style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid var(--gray-200)",
          fontSize:13,fontFamily:"inherit",resize:"none",height:72,marginBottom:16,boxSizing:"border-box"}}/>
      <button onClick={salvar} disabled={salvando}
        style={{width:"100%",padding:"13px",borderRadius:12,border:"none",
          background:"var(--purple)",color:"white",cursor:"pointer",
          fontSize:14,fontWeight:700,fontFamily:"inherit"}}>
        {salvando?"Salvando...":"Salvar Check-in 💜"}
      </button>
    </div>
  );

  // ── Etapa: Concluído ─────────────────────────────────────────────
  return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:64,marginBottom:16}}>{nivelAtual?.emoji}</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"var(--purple)",marginBottom:8}}>
        Check-in registrado!
      </div>
      <div style={{fontSize:14,color:"var(--text-muted)",marginBottom:32,lineHeight:1.6}}>
        Obrigada por cuidar de si hoje. 💜<br/>
        {emocoes.length>0 && `Emoções: ${emocoes.map(e=>EMOCOES_LISTA.find(x=>x.v===e)?.l).join(", ")}`}
      </div>
      <button onClick={reiniciar}
        style={{padding:"11px 24px",borderRadius:10,border:"1px solid var(--purple)",
          background:"white",color:"var(--purple)",cursor:"pointer",
          fontSize:13,fontWeight:600,fontFamily:"inherit"}}>
        Novo registro
      </button>
    </div>
  );
}




function NotaRelaxamento({ user, ferramenta, emoji, onRepetir }) {
  const [nota, setNota] = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);
  const [salvo, setSalvo] = React.useState(false);

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
      registrarUsoRecurso(user,{titulo:ferramenta==="respiracao"?"Respiração 4-7-8":"Relaxamento Muscular",formularioKey:ferramenta==="respiracao"?"breathing-478":"muscle-relaxation"},"salvou",{detalhe:`Relaxamento ${n}/10`});
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

  const [ativo,      setAtivo]     = React.useState(false);
  const [concluido,  setConcluido] = React.useState(false);
  const [faseIdx,    setFaseIdx]   = React.useState(0);
  const [progresso,  setProgresso] = React.useState(0); // 0-100 dentro da fase
  const [ciclo,      setCiclo]     = React.useState(1);
  const [tempoFase,  setTempoFase] = React.useState(0);
  const timerRef = React.useRef(null);

  const fase = FASES[faseIdx];
  const durTotal = FASES.reduce((a,f)=>a+f.dur,0); // 19s

  function iniciar(){ setAtivo(true); setConcluido(false); setFaseIdx(0); setProgresso(0); setCiclo(1); setTempoFase(0); }
  function parar(){ clearInterval(timerRef.current); setAtivo(false); setFaseIdx(0); setProgresso(0); setCiclo(1); setTempoFase(0); }

  React.useEffect(()=>{
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
  const [iniciado,  setIniciado]  = React.useState(false);
  const [concluido, setConcluido] = React.useState(false);
  const [tempo,     setTempo]     = React.useState(0);
  const [pausado,   setPausado]   = React.useState(false);
  const audioRef = React.useRef(null);
  const timerRef = React.useRef(null);

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

  React.useEffect(()=>()=>clearInterval(timerRef.current),[]);

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
function FerramentaArvore({user}){
  const INFO_REC = {titulo:"Árvore da Decisão", formularioKey:"decision-tree"};
  const [step,setStep]=React.useState("home");
  const [preocupacao,setPreocupacao]=React.useState("");
  const [acoes,setAcoes]=React.useState("");
  const [plano,setPlano]=React.useState("");
  const [conclusao,setConclusao]=React.useState(null);
  const [historico,setHistorico]=React.useState([]);

  function reiniciar(){setStep("home");setPreocupacao("");setAcoes("");setPlano("");setConclusao(null);}

  function salvarHistorico(c){
    setHistorico(h=>[{data:new Date().toLocaleDateString("pt-BR"),preocupacao,conclusao:c},...h].slice(0,10));
    if(user&&user.id){
      try{
        db.collection("clinica_arvore_decisao").add({
          pacienteId:user.id, pacienteNome:user.nome||"",
          preocupacao, acoes, plano, conclusao:c,
          data:new Date().toLocaleDateString("pt-BR"),
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
        registrarUsoRecurso(user,INFO_REC,"salvou",{detalhe:`"${preocupacao.slice(0,80)}" → ${c}`});
      }catch(e){}
    }
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
  const EMOCOES = ["Ansiedade","Tristeza","Raiva","Medo","Vergonha","Culpa","Frustração","Insegurança","Alívio","Esperança"];
  const [passo,    setPasso]    = React.useState(1); // 1=situação, 2=pensamento, 3=emoção, 4=resposta, 5=concluído
  const [draft,    setDraft]    = React.useState({situacao:"",pensamento:"",emocao:"",intensidade:60,alternativo:""});
  const [registros,setRegistros]= React.useState([]);
  const [verReg,   setVerReg]   = React.useState(null);

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
function FerramentaGestaoAnsiedade({user}){
  const INFO_REC = {titulo:"Gestão da Ansiedade", formularioKey:"anxiety-management"};
  const TECNICAS=[{id:"resp",label:"Respiração Relaxada",desc:"Inspirar → Pausar → Expirar por 2 min"},{id:"visao",label:"Visão Periférica",desc:"Mover os olhos da direita para a esquerda"},{id:"musc",label:"Relaxamento Muscular",desc:"Contrair músculos 5s e relaxar com suspiro"}];
  const ATIVIDADES=[{id:"caminhada",label:"🚶 Caminhada"},{id:"meditacao",label:"🧘 Meditação"},{id:"diario",label:"📓 Diário"},{id:"musica",label:"🎵 Música"},{id:"alongamento",label:"🤸 Alongamento"},{id:"agua",label:"💧 Hidratação"}];
  const PERGUNTAS=["Qual situação está me deixando ansioso(a)?","Qual é o meu pensamento ansioso?","Tenho provas reais de que é 100% verdadeiro?","Quais evidências indicam que pode NÃO ser verdadeiro?","Qual a probabilidade real de que o pior aconteça?","O que eu diria a um amigo com esse mesmo pensamento?","Existe uma forma mais útil de ver essa situação?","Preocupar-me está me ajudando ou me machucando?"];
  const AREAS=[{id:"interior",label:"Cuidado Interior"},{id:"familiar",label:"Vida Familiar"},{id:"carreira",label:"Carreira"},{id:"social",label:"Vida Social"},{id:"qualidade",label:"Qualidade de Vida"},{id:"saudavel",label:"Vida Saudável"},{id:"financeiro",label:"Financeiro"},{id:"espiritualidade",label:"Espiritualidade"}];
  const DESC={1:"Em paz.",2:"Otimista.",3:"Calmo.",4:"Confortável.",5:"Neutro.",6:"Estressando.",7:"Estressado.",8:"Irritado.",9:"Tenso.",10:"Em pânico."};
  const [aba,setAba]=React.useState(0);
  const [stress,setStress]=React.useState(5);
  const [nota,setNota]=React.useState("");
  const [track,setTrack]=React.useState({});
  const [resp,setResp]=React.useState(Array(8).fill(""));
  const [roda,setRoda]=React.useState({});
  const [log,setLog]=React.useState([]);
  const [msg,setMsg]=React.useState("");
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
        <button className="btn btn-purple" style={{width:"100%"}} onClick={async()=>{
          setLog(l=>[{nivel:stress,nota,data:new Date().toLocaleDateString("pt-BR")},...l].slice(0,20));
          if(user&&user.id){
            try{
              await db.collection("clinica_gestao_ansiedade").add({
                pacienteId:user.id, pacienteNome:user.nome||"", tipo:"estresse",
                nivel:stress, nota,
                data:new Date().toLocaleDateString("pt-BR"),
                createdAt:firebase.firestore.FieldValue.serverTimestamp()
              });
              registrarUsoRecurso(user,INFO_REC,"salvou",{detalhe:`Estresse ${stress}/10${nota?" — "+nota:""}`});
            }catch(e){}
          }
          setNota("");setMsg("✓ Registrado!");setTimeout(()=>setMsg(""),2000);
        }}>{msg||"Registrar"}</button>
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
        <button className="btn btn-purple" style={{width:"100%",marginTop:14}} onClick={async()=>{
          const feitos=[...TECNICAS,...ATIVIDADES].filter(x=>track[x.id]).map(x=>x.label.replace(/^[^\s]+\s/,""));
          if(feitos.length===0){alert("Marque pelo menos uma técnica ou atividade.");return;}
          if(user&&user.id){
            try{
              await db.collection("clinica_gestao_ansiedade").add({
                pacienteId:user.id, pacienteNome:user.nome||"", tipo:"tracking",
                itens:feitos,
                data:new Date().toLocaleDateString("pt-BR"),
                createdAt:firebase.firestore.FieldValue.serverTimestamp()
              });
              registrarUsoRecurso(user,INFO_REC,"salvou",{detalhe:"Tracking do dia: "+feitos.join(", ")});
            }catch(e){}
          }
          setTrack({});setMsg("✓ Tracking salvo!");setTimeout(()=>setMsg(""),2000);
        }}>{msg||"Salvar tracking do dia"}</button>
      </div>}
      {aba===2&&<div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:14,background:"#f9f5ff",padding:"10px 12px",borderRadius:8}}>Responda cada pergunta com honestidade para questionar pensamentos ansiosos.</div>
        {PERGUNTAS.map((p,i)=><div key={i} style={{marginBottom:14}}>
          <div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:"var(--purple-soft)",color:"var(--purple)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><label style={{fontSize:13,fontWeight:600,lineHeight:1.4}}>{p}</label></div>
          <textarea className="form-input" rows={2} value={resp[i]} onChange={e=>{const r=[...resp];r[i]=e.target.value;setResp(r);}} placeholder="Sua resposta..."/>
        </div>)}
        <button className="btn btn-purple" style={{width:"100%"}} onClick={async()=>{
          if(!resp.some(r=>r.trim())){alert("Responda pelo menos uma pergunta antes de salvar.");return;}
          if(user&&user.id){
            try{
              await db.collection("clinica_tcc").add({
                pacienteId:user.id, pacienteNome:user.nome||"",
                origem:"gestao-ansiedade",
                registros: PERGUNTAS.map((p,i)=>({pergunta:p, resposta:resp[i]||""})),
                data:new Date().toLocaleDateString("pt-BR"),
                createdAt:firebase.firestore.FieldValue.serverTimestamp()
              });
              registrarUsoRecurso(user,INFO_REC,"salvou",{detalhe:"Pensamentos guiados (8 perguntas TCC)"});
            }catch(e){}
          }
          setResp(Array(8).fill(""));setMsg("✓ Salvo!");setTimeout(()=>setMsg(""),2000);
        }}>{msg||"Salvar respostas"}</button>
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
        <button className="btn btn-purple" style={{width:"100%"}} onClick={async()=>{
          if(user&&user.id){
            try{
              await db.collection("clinica_gestao_ansiedade").add({
                pacienteId:user.id, pacienteNome:user.nome||"", tipo:"roda",
                areas: AREAS.map(a=>({area:a.label, valor:roda[a.id]||0})),
                data:new Date().toLocaleDateString("pt-BR"),
                createdAt:firebase.firestore.FieldValue.serverTimestamp()
              });
              registrarUsoRecurso(user,INFO_REC,"salvou",{detalhe:"Roda da Vida ("+AREAS.map(a=>`${a.label}: ${roda[a.id]||0}`).join(", ")+")"});
            }catch(e){}
          }
          setMsg("✓ Roda da Vida salva!");setTimeout(()=>setMsg(""),2000);
        }}>{msg||"Salvar Roda da Vida"}</button>
      </div>}
    </div>
  );
}

// ── Rastreamento Emocional da Alimentação ───────────────────────────────────
function FerramentaRastreamento({user}){
  const INFO_REC = {titulo:"Rastreamento Emocional da Alimentação", formularioKey:"emotional-eating"};
  const EMOCOES=["Ansiedade","Tédio","Tristeza","Raiva","Solidão","Estresse","Cansaço","Felicidade"];
  const SENSACOES=["Culpa","Vergonha","Alívio","Indiferença","Satisfação","Arrependimento"];
  const [fome,setFome]=React.useState(5);
  const [emocoes,setEmocoes]=React.useState([]);
  const [pensamento,setPensamento]=React.useState("");
  const [comeu,setComeu]=React.useState("");
  const [alivio,setAlivio]=React.useState(5);
  const [duracao,setDuracao]=React.useState("");
  const [sensacoes,setSensacoes]=React.useState([]);
  const [reflexao,setReflexao]=React.useState("");
  const [entries,setEntries]=React.useState([]);
  const [msg,setMsg]=React.useState("");
  React.useEffect(()=>{
    if(!user||!user.id)return;
    const unsub=db.collection("clinica_rastreamento_alimentar")
      .where("pacienteId","==",user.id)
      .onSnapshot(snap=>{
        const docs=snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>((b.createdAt&&b.createdAt.toDate?b.createdAt.toDate():new Date(0)))-((a.createdAt&&a.createdAt.toDate?a.createdAt.toDate():new Date(0))));
        setEntries(docs.slice(0,20));
      },()=>{});
    return unsub;
  },[user&&user.id]);
  function Chips({opts,sel,toggle}){return(<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{opts.map(o=><button key={o} onClick={()=>toggle(o)} style={{padding:"4px 12px",borderRadius:20,border:"1px solid",borderColor:sel.includes(o)?"var(--purple)":"#e5e7eb",background:sel.includes(o)?"var(--purple)":"white",color:sel.includes(o)?"white":"#6b7280",fontSize:12,cursor:"pointer"}}>{o}</button>)}</div>);}
  async function salvar(){
    if(!comeu.trim()){alert("Descreva o que você comeu.");return;}
    const registro={data:new Date().toLocaleDateString("pt-BR"),fome,emocoes:[...emocoes],pensamento,comeu,alivio,duracao,sensacoes:[...sensacoes],reflexao};
    if(user&&user.id){
      try{
        await db.collection("clinica_rastreamento_alimentar").add({
          ...registro, pacienteId:user.id, pacienteNome:user.nome||"",
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
        registrarUsoRecurso(user,INFO_REC,"salvou",{detalhe:`Fome ${fome}/10, alívio ${alivio}/10${emocoes.length?" — "+emocoes.join(", "):""}`});
      }catch(e){}
    }else{
      setEntries(e=>[{id:Date.now()+"",...registro},...e]);
    }
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
  const [modulo,setModulo]=React.useState(0);
  const [respostas,setRespostas]=React.useState({});
  const [feedbacks,setFeedbacks]=React.useState({});
  const [score,setScore]=React.useState(0);
  const [total,setTotal]=React.useState(0);
  const [tocando,setTocando]=React.useState(null);
  const ctxRef=React.useRef(null);
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
function FerramentaPortal({ recurso, user }){
  const k = recurso?.formularioKey || "";
  if(k==="breathing-478")        return <FerramentaRespiracao user={user}/>;
  if(k==="muscle-relaxation")    return <FerramentaRelaxamento user={user}/>;
  if(k==="anxiety-management")   return <FerramentaGestaoAnsiedade user={user}/>;
  if(k==="decision-tree")        return <FerramentaArvore user={user}/>;
  if(k==="emotional-eating")     return <FerramentaRastreamento user={user}/>;
  if(k==="treino-neuro-auditivo") return <FerramentaTreino user={user}/>;
  // ── Fábulas com campo "paginas" (array) ──────────────────────────
  const paginas = recurso.paginas||[];
  if(paginas.length>0){
    const [idx,setIdx] = React.useState(0);
    const pag = paginas[idx]||"";
    const pct = Math.round(((idx+1)/paginas.length)*100);
    const concluido = idx===paginas.length-1;
    return(
      <div style={{fontFamily:"Georgia,serif"}}>
        {/* Barra de progresso */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <div style={{flex:1,height:5,background:"rgba(123,0,196,0.15)",borderRadius:20,overflow:"hidden"}}>
            <div style={{width:pct+"%",height:"100%",background:"linear-gradient(90deg,#7B00C4,#a855f7)",borderRadius:20,transition:"width .4s ease"}}/>
          </div>
          <span style={{fontSize:12,color:"#7B00C4",fontWeight:700,flexShrink:0}}>{idx+1}/{paginas.length}</span>
        </div>
        {/* Card da página */}
        <div style={{
          background:"linear-gradient(145deg,#4c0094,#7B00C4,#6d28d9)",
          borderRadius:20,padding:"36px 28px",minHeight:220,marginBottom:20,
          boxShadow:"0 8px 32px rgba(123,0,196,0.35)",
          display:"flex",alignItems:"center",justifyContent:"center"
        }}>
          <p style={{
            fontSize:19,color:"white",lineHeight:1.9,textAlign:"center",
            fontStyle:"italic",margin:0,
            textShadow:"0 1px 3px rgba(0,0,0,0.2)"
          }}>{pag}</p>
        </div>
        {/* Reflexões no último slide */}
        {concluido&&(recurso.perguntas||[]).length>0&&(
          <div style={{background:"#f5f3ff",borderRadius:14,padding:"18px 20px",marginBottom:20,border:"1px solid #ede9fe"}}>
            <div style={{fontWeight:700,fontSize:12,color:"#7B00C4",marginBottom:12,textTransform:"uppercase",letterSpacing:"0.6px"}}>💭 Para Refletir</div>
            {(recurso.perguntas||[]).map((q,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:i<(recurso.perguntas||[]).length-1?10:0}}>
                <span style={{color:"#a855f7",fontWeight:700,flexShrink:0}}>{i+1}.</span>
                <span style={{fontSize:14,color:"#374151",lineHeight:1.7}}>{q}</span>
              </div>
            ))}
          </div>
        )}
        {/* Navegação */}
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0}
            style={{flex:1,padding:"13px",borderRadius:12,border:"1.5px solid #e9d5ff",
              background:"white",color:idx===0?"#d1d5db":"#7B00C4",
              fontWeight:600,fontSize:14,cursor:idx===0?"not-allowed":"pointer",
              fontFamily:"inherit",transition:"all .15s"}}>
            ← Anterior
          </button>
          {!concluido?(
            <button onClick={()=>setIdx(i=>i+1)}
              style={{flex:2,padding:"13px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg,#7B00C4,#a855f7)",
                color:"white",fontWeight:700,fontSize:15,cursor:"pointer",
                fontFamily:"inherit",boxShadow:"0 4px 14px rgba(123,0,196,0.4)"}}>
              Próxima página →
            </button>
          ):(
            <button onClick={()=>setIdx(0)}
              style={{flex:2,padding:"13px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg,#059669,#10b981)",
                color:"white",fontWeight:700,fontSize:15,cursor:"pointer",
                fontFamily:"inherit",boxShadow:"0 4px 14px rgba(5,150,105,0.35)"}}>
              ✅ Concluído — Reler
            </button>
          )}
        </div>
      </div>
    );
  }
  // ── Ferramentas com campo "passos" ou "conteudo" (texto) ──────────
  const conteudo  = recurso.passos || recurso.conteudo || recurso.texto || "";
  const objetivo  = recurso.objetivo || recurso.descricao || "";
  return (
    <div>
      {objetivo&&(
        <div style={{background:"#f3e6ff",borderRadius:10,padding:"14px 16px",marginBottom:20,border:"1px solid #e9d5ff"}}>
          <div style={{fontWeight:700,fontSize:12,color:"#7B00C4",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>🎯 Objetivo</div>
          <div style={{fontSize:13,color:"#3d006a",lineHeight:1.7}}>{objetivo}</div>
        </div>
      )}
      {conteudo&&(()=>{
        const slides = conteudo.split("\n\n").filter(function(p){return p.trim().length>2;});
        const [idx, setIdx] = React.useState(0);
        const atual = slides[idx]||"";
        const linhas = atual.trim().split("\n");
        const titulo = linhas[0];
        const corpo  = linhas.slice(1).join("\n").trim();
        const pct    = Math.round(((idx+1)/slides.length)*100);
        return (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:11,color:"#9ca3af"}}>{idx+1} de {slides.length}</span>
              <span style={{fontSize:11,color:"#7B00C4",fontWeight:600}}>{pct}%</span>
            </div>
            <div style={{height:4,background:"#f3e6ff",borderRadius:20,marginBottom:20,overflow:"hidden"}}>
              <div style={{width:pct+"%",height:"100%",background:"#7B00C4",borderRadius:20,transition:"width .3s"}}/>
            </div>
            <div style={{background:"white",border:"1px solid #e9d5ff",borderRadius:16,padding:"24px 20px",minHeight:160,marginBottom:20,borderLeft:"4px solid #7B00C4"}}>
              {titulo&&<div style={{fontWeight:700,fontSize:15,color:"#7B00C4",marginBottom:corpo?12:0,lineHeight:1.5}}>{titulo}</div>}
              {corpo&&<div style={{fontSize:14,color:"#374151",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{corpo}</div>}
            </div>
            <div style={{display:"flex",gap:12}}>
              <button onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0}
                style={{flex:1,padding:"12px",borderRadius:12,border:"1.5px solid #e9d5ff",background:"white",color:idx===0?"#d1d5db":"#7B00C4",fontWeight:600,fontSize:14,cursor:idx===0?"not-allowed":"pointer",fontFamily:"inherit"}}>
                ← Anterior
              </button>
              {idx<slides.length-1?(
                <button onClick={()=>setIdx(i=>i+1)}
                  style={{flex:2,padding:"12px",borderRadius:12,border:"none",background:"#7B00C4",color:"white",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                  Próximo →
                </button>
              ):(
                <button onClick={()=>setIdx(0)}
                  style={{flex:2,padding:"12px",borderRadius:12,border:"none",background:"#059669",color:"white",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                  ✅ Concluído — Recomeçar
                </button>
              )}
            </div>
          </div>
        );
      })()}
      {!objetivo&&!conteudo&&(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:48,marginBottom:12}}>🔧</div>
          <div style={{fontFamily:"var(--font-display,Georgia)",fontSize:18,fontWeight:700,color:"#7B00C4",marginBottom:8}}>Em desenvolvimento</div>
          <div style={{fontSize:13,color:"#6b7280",lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>
            Esta ferramenta está sendo preparada especialmente para você.<br/>Em breve estará disponível nesta área. 💜
          </div>
        </div>
      )}
    </div>
  );
}

function RecursosPaciente({ user, setTab, abaInicial }) {
  const [ferramentas,   setFerramentas]   = React.useState([]);
  const [fabulas,       setFabulas]       = React.useState([]);
  const [psicoeducacao, setPsicoeducacao] = React.useState([]);
  const [aba,           setAba]           = React.useState(abaInicial||"ferramentas");
  const [abrindo,       setAbrindo]       = React.useState(null);
  const [abrindoPsico,  setAbrindoPsico]  = React.useState(null);
  const [loading,       setLoading]       = React.useState(true);

  // ── Gesto de voltar do celular fecha o exercício (em vez de sair do app) ──
  React.useEffect(()=>{
    if(abrindo||abrindoPsico){
      window.history.pushState({exercicioAberto:true},"");
      const onPop=()=>{ setAbrindo(null); setAbrindoPsico(null); };
      window.addEventListener("popstate",onPop);
      return ()=>window.removeEventListener("popstate",onPop);
    }
  },[!!abrindo,!!abrindoPsico]);

  function fecharExercicio(){
    if(window.history.state&&window.history.state.exercicioAberto){ window.history.back(); }
    else { setAbrindo(null); setAbrindoPsico(null); }
  }

  function abrirRecurso(r){
    registrarUsoRecurso(user, r, "abriu");
    if(r._colecao==="psicoeducacao") setAbrindoPsico(r); else setAbrindo(r);
  }

  // ── Barra de voltar destacada e fixa no topo ──
  function BarraVoltar({texto}){
    return (
      <div style={{position:"sticky",top:0,zIndex:60,background:"white",
        margin:"-10px -6px 18px",padding:"10px 6px",
        borderBottom:"2px solid rgba(123,0,196,0.18)",
        boxShadow:"0 2px 10px rgba(123,0,196,0.08)",
        display:"flex",alignItems:"center",gap:12}}>
        <button onClick={fecharExercicio}
          style={{display:"flex",alignItems:"center",gap:8,
            background:"var(--purple)",color:"white",border:"none",
            borderRadius:12,padding:"11px 20px",fontWeight:700,fontSize:14,
            cursor:"pointer",fontFamily:"inherit",flexShrink:0,
            boxShadow:"0 3px 10px rgba(123,0,196,0.35)"}}>
          ← Voltar
        </button>
        <div style={{fontWeight:600,fontSize:13,color:"var(--purple)",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{texto}</div>
      </div>
    );
  }

  React.useEffect(()=>{
    // Busca as três coleções em paralelo
    Promise.all([
      db.collection("clinica_recursos").get(),
      db.collection("clinica_fabulas").get(),
      db.collection("clinica_psicoeducacao").get(),
    ]).then(([sF, sFab, sPsi])=>{
      setFerramentas(sF.docs.map(d=>({id:d.id,...d.data(),_colecao:"recursos"})));
      setFabulas(sFab.docs.map(d=>({id:d.id,...d.data(),_colecao:"fabulas"})));
      setPsicoeducacao(sPsi.docs.map(d=>({id:d.id,...d.data(),_colecao:"psicoeducacao"})));
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  // Coleta IDs habilitados do modulosConfig
  function idsAtivos() {
    const ids = new Set();
    const config = user.modulosConfig || {};
    const hoje = new Date().toISOString().split("T")[0];
    Object.values(config).forEach(mod => {
      if (!mod?.ativo) return;
      Object.entries(mod.ferramentas || {}).forEach(([fid, fd]) => {
        if (!fd?.ativo) return;
        if (fd.dataInicio && fd.dataInicio > hoje) return;
        ids.add(fid);
      });
    });
    return ids;
  }

  const ids = idsAtivos();

  // Filtra cada coleção pelos IDs habilitados
  // Filtra por id do documento OU por formularioKey (modulosConfig pode guardar qualquer um)
  const ferramentasVisiveis   = ferramentas.filter(r => ids.has(r.id) || ids.has(r.formularioKey));
  const fabulasVisiveis       = fabulas.filter(r => ids.has(r.id) || ids.has(r.formularioKey));
  const psicoeducacaoVisiveis = psicoeducacao.filter(r => ids.has(r.id));

  const visiveis = aba==="ferramentas" ? ferramentasVisiveis
                 : aba==="fabulas"     ? fabulasVisiveis
                 : psicoeducacaoVisiveis;

  const ICONES_KEY = {
    "breathing-478":"💨","muscle-relaxation":"💪","decision-tree":"🌳",
    "abc-record":"📋","anxiety-management":"🎯","emotional-eating":"🍃",
    "entrevista-clinica":"📝","anamnese":"📄","treino-neuro-auditivo":"🎵",
  };
  const EMOJI_CAT = {
    tcc:"🧠", ansiedade:"🎯", emocoes:"💜", autocuidado:"🌱",
    relacionamentos:"❤️", corpo:"🥗", esquema:"🔑", musicoterapia:"🎵",
    avaliacao:"📋", resiliencia:"🌊", esperanca:"🌟", autoconfianca:"🦅",
    autoconhecimento:"🔍", perspectiva:"🔭", outro:"🔧",
  };
  const icone = r => ICONES_KEY[r.formularioKey] || EMOJI_CAT[r.categoria] || "📄";
  const titulo = r => r.titulo || r.nome || "—";
  const descricao = r => r.descricao || r.resumo || r.texto?.slice(0,120) || "";

  if (abrindoPsico) return (
    <div>
      <BarraVoltar texto={abrindoPsico.titulo||"Psicoeducação"}/>
      <PsicoeducacaoAberta item={abrindoPsico} user={user} onVoltar={fecharExercicio}/>
    </div>
  );

  if (abrindo) return (
    <div>
      <BarraVoltar texto={titulo(abrindo)}/>
      <FerramentaPortal recurso={abrindo} user={user}/>
    </div>
  );

  return (
    <div>
      {/* Título */}
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"var(--purple)"}}>
          Recursos Terapêuticos
        </div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:4}}>
          Conteúdos liberados pela sua psicóloga
        </div>
        <div style={{fontSize:11,color:"var(--purple)",marginTop:6,display:"flex",alignItems:"center",gap:4,opacity:0.7}}>
          <span>← deslize nas abas para ver mais →</span>
        </div>
      </div>

      {/* Abas superiores — scroll horizontal no mobile */}
      <div style={{display:"flex",gap:0,borderBottom:"2px solid var(--gray-100)",
        marginBottom:24,overflowX:"auto",scrollbarWidth:"none",
        msOverflowStyle:"none",WebkitOverflowScrolling:"touch",
        paddingBottom:0}}>
        {[
          ["ferramentas",   "🔧 Ferramentas",         ferramentasVisiveis.length],
          ["fabulas",       "📖 Fábulas",              fabulasVisiveis.length],
          ["psicoeducacao", "🎓 Psicoeducação",        psicoeducacaoVisiveis.length],
        ].map(([id,label,count])=>(
          <button key={id} onClick={()=>setAba(id)}
            style={{padding:"10px 14px",border:"none",background:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:13,whiteSpace:"nowrap",flexShrink:0,
              fontWeight: aba===id ? 700 : 400,
              color: aba===id ? "var(--purple)" : "var(--text-muted)",
              borderBottom: aba===id ? "2px solid var(--purple)" : "2px solid transparent",
              marginBottom:-2,transition:"all .15s",display:"flex",alignItems:"center",gap:5}}>
            {label}
            {count>0 && <span style={{background:"var(--purple-soft)",color:"var(--purple)",
              borderRadius:20,padding:"1px 6px",fontSize:11,fontWeight:700}}>{count}</span>}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>
          Carregando...
        </div>
      )}

      {/* Vazio */}
      {!loading && visiveis.length === 0 && (
        <div style={{textAlign:"center",padding:48,color:"var(--text-muted)",
          background:"white",borderRadius:16,border:"1px solid var(--gray-100)"}}>
          <div style={{fontSize:36,marginBottom:12}}>🌱</div>
          <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>
            Nenhum conteúdo liberado nesta categoria ainda.
          </div>
          <div style={{fontSize:12}}>
            Sua psicóloga irá liberar os recursos conforme o seu progresso.
          </div>
        </div>
      )}

      {/* Grid de cards */}
      {!loading && visiveis.length > 0 && (
        <div style={{display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
          {visiveis.map(r=>(
            <div key={r.id} style={{background:"white",borderRadius:16,padding:20,
              border:"1px solid var(--gray-100)",
              boxShadow:"0 2px 8px rgba(123,0,196,0.06)",
              display:"flex",flexDirection:"column",gap:12}}>

              {/* Ícone + nome */}
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:48,height:48,borderRadius:12,
                  background:"var(--purple-soft)",flexShrink:0,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                  {icone(r)}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,lineHeight:1.3}}>{titulo(r)}</div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2,
                    textTransform:"uppercase",letterSpacing:"0.5px"}}>
                    {r._colecao==="recursos"
                      ? (r.tipo==="interativa" ? "Exercício interativo" : "Conteúdo")
                      : r._colecao==="fabulas" ? "Fábula Terapêutica" : "Psicoeducação"}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              {descricao(r) && (
                <p style={{fontSize:12,color:"var(--text-muted)",
                  lineHeight:1.5,margin:0,flex:1}}>
                  {descricao(r)}
                </p>
              )}

              {/* Botão */}
              <button onClick={()=>abrirRecurso(r)}
                style={{width:"100%",padding:"10px",borderRadius:10,border:"none",
                  background:"var(--purple)",color:"white",cursor:"pointer",
                  fontSize:13,fontWeight:600,fontFamily:"inherit",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {r._colecao==="recursos" && r.tipo==="interativa"
                  ? "▶ Iniciar Exercício"
                  : r._colecao==="psicoeducacao"
                    ? "📖 Ler e Refletir"
                    : "📖 Abrir Conteúdo"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function PsicoeducacaoAberta({ item, user, onVoltar }) {
  const cat = user || {};
  const [respostas, setRespostas] = React.useState(["","",""]);
  const [msgSalvo, setMsgSalvo] = React.useState("");
  const VisualComp = typeof PSICO_VISUAIS !== "undefined"
    ? (PSICO_VISUAIS[item.visualKey] || PSICO_VISUAIS[item.titulo])
    : null;

  function enviarWhatsApp(){
    const tel = (user&&user.telefone||"").replace(/\D/g,"");
    const texto = "Reflexões — "+item.titulo+":\n\n"+
      (item.perguntas||[]).map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"—"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }

  async function salvarReflexoes(){
    if(!respostas.some(r=>r.trim())){alert("Escreva pelo menos uma reflexão antes de salvar.");return;}
    if(user&&user.id){
      try{
        await db.collection("clinica_reflexoes").add({
          pacienteId:user.id, pacienteNome:user.nome||"",
          psicoeducacaoId:item.id||"", psicoeducacaoTitulo:item.titulo||"",
          registros:(item.perguntas||[]).map((p,i)=>({pergunta:p, resposta:respostas[i]||""})),
          data:new Date().toLocaleDateString("pt-BR"),
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
        registrarUsoRecurso(user,{...item,_colecao:"psicoeducacao"},"salvou",{detalhe:"Reflexões — "+(item.titulo||"")});
      }catch(e){}
    }
    setMsgSalvo("✓ Reflexões salvas!");setTimeout(()=>setMsgSalvo(""),2500);
  }

  return (
    <div style={{maxWidth:680,margin:"0 auto",paddingBottom:32}}>
      {VisualComp
        ? <VisualComp cat={cat}/>
        : (
          <div>
            <div style={{background:"var(--purple)",borderRadius:"12px 12px 0 0",
              padding:"24px",textAlign:"center",color:"white"}}>
              <div style={{fontSize:40,marginBottom:8}}>{item.emoji||"📚"}</div>
              <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>{item.titulo}</div>
              {item.descricao&&<div style={{fontSize:13,opacity:0.85}}>{item.descricao}</div>}
            </div>
            {item.conteudo&&(
              <div style={{background:"white",padding:"20px 24px",
                border:"1px solid #e8c8ff",fontSize:14,lineHeight:1.8,
                whiteSpace:"pre-wrap",color:"#2d2d2d"}}>
                {item.conteudo}
              </div>
            )}
            {item.perguntas&&item.perguntas.length>0&&(
              <div style={{background:"#f3e6ff",padding:"16px 20px",
                borderRadius:"0 0 12px 12px",borderTop:"2px solid var(--purple)"}}>
                <div style={{color:"var(--purple)",fontSize:13,fontWeight:600,marginBottom:12}}>
                  ✏️ Suas reflexões
                </div>
                {item.perguntas.map((p,i)=>(
                  <div key={i} style={{marginBottom:14}}>
                    <div style={{display:"flex",gap:8,marginBottom:6}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:"var(--purple)",
                        color:"white",display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                      <div style={{fontSize:12,fontWeight:500,color:"#3d006a",lineHeight:1.5}}>{p}</div>
                    </div>
                    <textarea value={respostas[i]}
                      onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
                      placeholder="Escreva sua reflexão..."
                      style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,
                        border:"1px solid #7B00C450",fontSize:13,fontFamily:"inherit",
                        resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
                  </div>
                ))}
                <button onClick={salvarReflexoes}
                  style={{width:"100%",padding:"12px",borderRadius:10,border:"none",
                    background:msgSalvo?"#059669":"var(--purple)",color:"white",cursor:"pointer",fontSize:13,
                    fontWeight:700,fontFamily:"inherit",marginBottom:8,transition:"background .2s"}}>
                  {msgSalvo||"💾 Salvar reflexões"}
                </button>
                <button onClick={enviarWhatsApp}
                  style={{width:"100%",padding:"12px",borderRadius:10,border:"1.5px solid var(--purple)",
                    background:"white",color:"var(--purple)",cursor:"pointer",fontSize:13,
                    fontWeight:700,fontFamily:"inherit"}}>
                  📲 Enviar reflexões pelo WhatsApp
                </button>
              </div>
            )}
          </div>
        )
      }
    </div>
  );
}


// ── MINHAS METAS (paciente) ─────────────────────────────────────────────────
// Lê as metas cadastradas pela psicóloga em clinica_metas e permite que a
// paciente atualize o próprio progresso.
function MinhasMetas({ user }) {
  const [metas, setMetas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(()=>{
    if(!user||!user.id){ setLoading(false); return; }
    const unsub = db.collection("clinica_metas")
      .where("pacienteId","==",user.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}))
          .filter(m=>m.status!=="arquivada");
        docs.sort((a,b)=>((b.createdAt&&b.createdAt.toDate?b.createdAt.toDate():new Date(0)))-((a.createdAt&&a.createdAt.toDate?a.createdAt.toDate():new Date(0))));
        setMetas(docs);
        setLoading(false);
      },()=>setLoading(false));
    return unsub;
  },[user&&user.id]);

  async function atualizarProgresso(meta, delta){
    const novo = Math.max(0, Math.min(100, (meta.progresso||0)+delta));
    try{
      await db.collection("clinica_metas").doc(meta.id).update({
        progresso: novo,
        atualizadoPor: "paciente",
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    }catch(e){}
  }

  if (loading) return <Spinner/>;

  return (
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:600,color:"var(--purple)"}}>🎯 Minhas Metas</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:4}}>
          Metas terapêuticas definidas com a sua psicóloga. Atualize seu progresso conforme avança!
        </div>
      </div>

      {metas.length===0 ? (
        <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}>
          <Icon name="target" size={40}/>
          <div style={{marginTop:12,fontWeight:600}}>Nenhuma meta por enquanto</div>
          <div style={{fontSize:13,marginTop:4}}>Suas metas aparecerão aqui assim que forem definidas na sessão.</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {metas.map(m=>{
            const p = m.progresso||0;
            const completa = p>=100;
            return (
              <div key={m.id} className="card" style={completa?{border:"1.5px solid #059669",background:"#f0fdf4"}:{}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:15}}>{completa?"🎉 ":""}{m.titulo}</div>
                    <span className="badge badge-purple" style={{marginTop:6,display:"inline-block"}}>{m.categoria||"Meta"}</span>
                  </div>
                  {completa&&<span style={{fontSize:11,fontWeight:700,color:"#059669",background:"#d1fae5",borderRadius:20,padding:"4px 10px",flexShrink:0}}>Concluída!</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1,background:"var(--gray-100,#f3f4f6)",borderRadius:20,height:10,overflow:"hidden"}}>
                    <div style={{width:p+"%",height:"100%",borderRadius:20,transition:"width .4s ease",
                      background:completa?"#059669":"linear-gradient(90deg,#7B00C4,#a855f7)"}}/>
                  </div>
                  <span style={{fontSize:14,fontWeight:700,color:completa?"#059669":"var(--purple)",minWidth:42,textAlign:"right"}}>{p}%</span>
                </div>
                {!completa&&(
                  <div style={{display:"flex",gap:8,marginTop:12}}>
                    <button onClick={()=>atualizarProgresso(m,-10)}
                      style={{flex:1,padding:"9px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"white",
                        color:"#6b7280",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>−10%</button>
                    <button onClick={()=>atualizarProgresso(m,10)}
                      style={{flex:2,padding:"9px",borderRadius:10,border:"none",background:"var(--purple)",
                        color:"white",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>✓ Avancei +10%</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  { id:"painel",      label:"Meu Painel",            icon:"layout-dashboard" },
  { id:"humor",       label:"Check-in Diário",       icon:"heart" },
  { id:"metas",       label:"Minhas Metas",           icon:"target" },
  { id:"diario",      label:"Diário Terapêutico",    icon:"book-open" },
  { id:"ferramentas", label:"Recursos Terapêuticos", icon:"wrench" },
  { id:"meus-laudos", label:"Meus Laudos",           icon:"file-text" },
  { id:"minha-conta", label:"Minha Conta",           icon:"user-circle" },
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

// ─── PROTOCOLO CASAIS (espelhado do admin) ───────────────
const PROTOCOLO_CASAIS = [
  {
    stage:0, tabId:"diagnostico-casal", titulo:"Diagnóstico Inicial de Casal",
    subtitulo:"Avaliação inicial do bem-estar conjugal antes da jornada",
    emoji:"🔍", cor:"#7c3aed", bg:"#f5f3ff",
    atividades:[
      {id:"inventario-bem-estar", titulo:"Inventário de Bem-Estar de Casais", desc:"42 questões sobre comunicação, resolução de conflitos, intimidade emocional, satisfação sexual e cooperação"},
      {id:"roda-vida-relacionamento", titulo:"Roda da Vida do Relacionamento", desc:"Avalie 8 dimensões do relacionamento em formato visual"},
      {id:"3-metas", titulo:"Nossas 3 Metas do Relacionamento", desc:"Definam juntos as 3 principais metas terapêuticas"},
      {id:"quem-sou", titulo:"Quem Eu Sou no Relacionamento", desc:"Reflexão individual sobre identidade no relacionamento"},
      {id:"o-que-quero", titulo:"O Que Eu Quero e Não Quero Mais", desc:"Mapeamento de expectativas e limites"}
    ]
  },
  {
    stage:1, tabId:"etapa1-casal", titulo:"Reconexão e Segurança Emocional",
    subtitulo:"Reduzir defensividade e aumentar conexão emocional",
    emoji:"💚", cor:"#059669", bg:"#d1fae5",
    atividades:[
      {id:"detalhes-dia", titulo:"Detalhes do Dia a Dia", desc:"Compartilhem os pequenos detalhes que fazem diferença na conexão diária"},
      {id:"plano-casal-ocupado", titulo:"Plano de Ação para um Casal Ocupado Demais", desc:"Estratégias práticas para manter conexão na correria"}
    ]
  },
  {
    stage:2, tabId:"etapa2-casal", titulo:"Identidade e Vínculo do Casal",
    subtitulo:"Resgatar identidade afetiva e visão compartilhada",
    emoji:"💜", cor:"#7c3aed", bg:"#ede9fe",
    atividades:[
      {id:"renovando-votos", titulo:"Renovando os Votos", desc:"Recontem a história do casal e renovem seus compromissos através de 5 narrativas guiadas"}
    ]
  },
  {
    stage:3, tabId:"etapa3-casal", titulo:"Conceitualização Cognitiva",
    subtitulo:"Identificar padrões cognitivos e crenças relacionais",
    emoji:"🧠", cor:"#0891b2", bg:"#e0f2fe",
    atividades:[
      {id:"mapa-cognitivo", titulo:"Mapa Cognitivo do Relacionamento", desc:"Identificar pensamentos automáticos, crenças e padrões que afetam o relacionamento"}
    ]
  },
  {
    stage:4, tabId:"etapa4-casal", titulo:"Reestruturação Relacional",
    subtitulo:"Criar novos padrões emocionais e comportamentais",
    emoji:"🌱", cor:"#16a34a", bg:"#dcfce7",
    atividades:[
      {id:"novos-padroes", titulo:"Novos Padrões Relacionais", desc:"Desenvolver e praticar novos comportamentos e respostas emocionais"}
    ]
  }
];

const CHECKIN_SEMANAL_PERGUNTAS = [
  "Hoje eu me sinto conectado(a) com meu parceiro(a)",
  "Sinto que fui ouvido(a) esta semana",
  "Expressamos afeto um pelo outro",
  "Resolvemos conflitos de forma saudável",
  "Dedicamos tempo de qualidade juntos",
  "Sinto que somos uma equipe",
  "Me sinto seguro(a) emocionalmente com meu parceiro(a)"
];

// mapa tab → id do módulo no Firebase
const MAPA_MODULOS = {
  humor:"humor", pensamentos:"tcc", diario:"diario", metas:"metas",
  ferramentas:"ferramentas", fabulas:"fabulas", reflexoes:"reflexoes",
  ansiedade:"ansiedade", musicoterapia:"musicoterapia",
  "arvore-decisao":"arvore_decisao", "entrevista":"entrevista_inicial",
  "anamnese":"anamnese", "rastreamento":"rastreamento_alimentar"
};

function navFiltradoPaciente(nav, user) {
  const config = user.modulosConfig || {};
  const hoje = new Date().toISOString().split("T")[0];

  // Mapa: id do item de nav → chave exata dentro de mod.ferramentas
  const ITEM_CHAVE = {
    "humor":  { mod:"mod1", chave:"humor"  },
    "metas":  { mod:"mod1", chave:"metas"  },
    "diario": { mod:"mod1", chave:"diario" },
    // tcc e reflexoes → Recursos Terapêuticos (mod3)
  };

  return nav.filter(item => {
    // Sempre visíveis
    if (["painel","minha-conta","meus-laudos"].includes(item.id)) return true;

    // Recursos Terapêuticos — aparece se qualquer módulo de conteúdo estiver ativo
    if (item.id === "ferramentas") {
      return ["mod2","mod3","mod4","mod6"].some(m => config[m]?.ativo);
    }

    // Gestão da Ansiedade — é recurso interno, NÃO fica na sidebar
    if (item.id === "ansiedade") return false;

    const mapa = ITEM_CHAVE[item.id];
    if (!mapa) return false;

    const mod = config[mapa.mod];
    if (!mod?.ativo) return false;

    // Módulo inteiro sem chave específica (ex: fábulas = mod2)
    if (!mapa.chave) return true;

    // Verifica a ferramenta específica
    const ft = (mod.ferramentas || {})[mapa.chave];
    if (!ft?.ativo) return false;
    if (ft.dataInicio && ft.dataInicio > hoje) return false;
    return true;
  });
}


// ─── SIDEBAR ─────────────────────────────────────────────
function fmtDataNotif(dataStr) {
  if (!dataStr) return "";
  const d = new Date(dataStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"2-digit"});
}

function enviarPushLocal(titulo, corpo) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(titulo, { body: corpo, icon: "../logo-transparente.png" });
  }
}

async function verificarLembretesClinica(user) {
  if (!user) return;
  const hoje = new Date();
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
  const fmtDate = d => d.toISOString().split("T")[0];
  try {
    if (user.tipo === "paciente") {
      const snap = await db.collection("clinica_sessoes")
        .where("pacienteId","==",user.id)
        .where("data","in",[fmtDate(hoje), fmtDate(amanha)])
        .where("status","==","agendado").get();
      snap.docs.forEach(d => {
        const s = d.data();
        const dia = s.data === fmtDate(hoje) ? "Hoje" : "Amanhã";
        enviarPushLocal(`${dia} — Sessão às ${s.hora}`, fmtDataNotif(s.data));
      });
      const snapPag = await db.collection("clinica_lancamentos")
        .where("pacienteId","==",user.id)
        .where("status","==","pendente").get();
      snapPag.docs.slice(0,2).forEach(d => {
        const l = d.data();
        enviarPushLocal(
          `Pagamento previsto — ${fmtDataNotif(l.data)}`,
          `R$ ${parseFloat(l.valor||0).toFixed(2).replace(".",",")}`
        );
      });
    }
    if (user.tipo === "aluno") {
      const snap = await db.collection("clinica_sessoes")
        .where("alunoId","==",user.id)
        .where("data","in",[fmtDate(hoje), fmtDate(amanha)]).get();
      snap.docs.forEach(d => {
        const s = d.data();
        const dia = s.data === fmtDate(hoje) ? "Hoje" : "Amanhã";
        enviarPushLocal(`${dia} — Supervisão às ${s.hora}`, fmtDataNotif(s.data));
      });
    }
  } catch(e) {}
}

function useBotaoNotificacao(user) {
  const [permissao, setPermissao] = React.useState(
    "Notification" in window ? Notification.permission : "denied"
  );
  React.useEffect(() => {
    if (!user || permissao !== "granted") return;
    const t = setTimeout(() => verificarLembretesClinica(user), 2000);
    return () => clearTimeout(t);
  }, [user, permissao]);
  async function ativar() {
    if (!("Notification" in window)) { alert("Seu navegador não suporta notificações."); return; }
    const p = await Notification.requestPermission();
    setPermissao(p);
    if (p === "granted") verificarLembretesClinica(user);
  }
  return { permissao, ativar };
}

function BotaoNotificacao({ permissao, ativar }) {
  if (!("Notification" in window)) return null;
  if (permissao === "granted") return (
    <span style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:20,padding:"5px 12px",fontSize:12,fontFamily:"inherit"}}>
      🔔 Ativo
    </span>
  );
  if (permissao === "denied") return (
    <span style={{background:"rgba(255,0,0,0.15)",border:"1px solid rgba(255,0,0,0.3)",color:"#fca5a5",borderRadius:20,padding:"5px 12px",fontSize:12}}>
      🔕 Bloqueado
    </span>
  );
  return (
    <button onClick={ativar}
      style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:20,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
      🔔 Ativar
    </button>
  );
}

function Sidebar({ user, tab, setTab, onLogout, modo, onTrocarModo, notifProps, nav:navProp }) {
  const eCasal = modo === "casal";
  const navBase = user.tipo === "aluno" ? NAV_ALUNO : eCasal ? NAV_CASAL : NAV_INDIVIDUAL;
  const nav = navProp || ((user.tipo === "paciente" && !eCasal) ? navFiltradoPaciente(navBase, user) : navBase);

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
        <div className="sidebar-user" style={{display:"flex",alignItems:"center",gap:8}}>
          <div className="sidebar-avatar">{(user.nome||"P")[0].toUpperCase()}</div>
          <div style={{flex:1}}>
            <div className="sidebar-user-name">{user.nome}</div>
            <div className="sidebar-user-crp">{user.tipo==="aluno"?"Aluno/Estagiário":eCasal?"Terapia de Casal":"Paciente"}</div>
          </div>
          {notifProps && <BotaoNotificacao {...notifProps}/>}
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(item => {
          // Para itens de etapa do casal, verifica se está habilitado
          const ehEtapa = item.id.startsWith("etapa") && item.id.includes("casal");
          if (ehEtapa && navProp) {
            const visivel = navProp.some(n => n.id === item.id);
            if (!visivel) return null;
          }
          return (
            <button key={item.id} className={`nav-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
              <Icon name={item.icon} size={18}/>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {onTrocarModo && (
          <button className="nav-item" onClick={onTrocarModo} style={{color:"rgba(255,255,255,0.85)"}}>
            <Icon name="refresh-cw" size={18}/> Trocar modo
          </button>
        )}
        <a href="../admin/" className="nav-item" style={{color:"rgba(255,255,255,0.85)",background:"rgba(123,0,196,0.25)",borderRadius:8,marginBottom:2,textDecoration:"none"}}>
          <Icon name="settings" size={18}/> Área Administrativa
        </a>
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
  const [etapa, setEtapa]     = React.useState("perfil");
  const [nome, setNome]       = React.useState("");
  const [email, setEmail]     = React.useState("");
  const [senha, setSenha]     = React.useState("");
  const [erro, setErro]       = React.useState("");
  const [loading, setLoading] = React.useState(false);

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
      if (senha !== "1234") { setErro("Senha incorreta."); setLoading(false); return; }
      const nomeNorm = nome.trim().toLowerCase();
      if (!nomeNorm) { setErro("Digite seu nome completo."); setLoading(false); return; }
      const snap = await db.collection("clinica_alunos").get();
      const match = snap.docs.find(d => (d.data().nome||"").trim().toLowerCase() === nomeNorm);
      if (!match) { setErro("Aluno não encontrado. Verifique o nome completo."); setLoading(false); return; }
      const aluno = { id: match.id, ...match.data() };
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
            <button className="login-right-back" onClick={()=>{setEtapa("perfil");setErro("");setNome("");setSenha("");}}>
              <Icon name="arrow-left" size={14}/> Voltar
            </button>
            <form className="login-form" onSubmit={handleLoginAluno}>
              <div>
                <div className="login-form-title">Área do Aluno</div>
                <div className="login-form-sub">Portal de supervisão clínica</div>
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
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PAINEL INDIVIDUAL
// ═══════════════════════════════════════════════════════
function PainelIndividual({ user, setTab }) {
  const [humores, setHumores] = React.useState([]);
  const [metas, setMetas]     = React.useState([]);

  React.useEffect(() => {
    const u1 = db.collection("clinica_humor").where("pacienteId","==",user.id)
      .onSnapshot(s=>{
        const docs = s.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setHumores(docs.slice(0,30));
      },()=>{});
    const u2 = db.collection("clinica_metas").where("pacienteId","==",user.id).where("status","==","ativa")
      .onSnapshot(s=>setMetas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return ()=>{ u1(); u2(); };
  }, [user.id]);

  const hoje      = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  const hora      = new Date().getHours();
  const saudacao  = hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";
  const humorHoje = humores.find(h=>h.data===new Date().toLocaleDateString("pt-BR"));
  const media30   = humores.length>0 ? (humores.reduce((a,h)=>a+(h.valor||0),0)/humores.length).toFixed(1) : null;

  // Suporta 3 formatos:
  // 1. ferramentasAtivas (novo admin) — array com IDs das ferramentas habilitadas
  // 2. modulosConfig (formato módulos) — objeto com configuração por módulo
  // 3. modulosAtivos (legado) — array simples de IDs
  const config = user.modulosConfig || {};
  const modulosAtivosLegacy = user.modulosAtivos || [];
  const ferramentasAtivasAdmin = user.ferramentasAtivas || [];
  const FERRAMENTA_PARA_MOD = {
    "humor":"mod1","diario":"mod1","metas":"mod1","reflexoes":"mod1","tcc":"mod1",
    "fabulas":"mod2","ferramentas":"mod3","ansiedade":"mod3","arvore":"mod3","musicoterapia":"mod4"
  };
  function ferramentaAtiva(id) {
    // Formato 1: ferramentasAtivas (salvo pela AbaFerramentas do admin)
    if (ferramentasAtivasAdmin.length > 0) {
      return ferramentasAtivasAdmin.includes(id);
    }
    // Formato 2: modulosConfig — se módulo ativo, ferramenta está disponível
    const modId = FERRAMENTA_PARA_MOD[id];
    if (modId && config[modId]?.ativo) {
      const fts = config[modId]?.ferramentas;
      // Sem ferramentas específicas = todas ativas
      if (!fts || (typeof fts === "object" && Object.keys(fts).length === 0)) return true;
      if (Array.isArray(fts)) return fts.includes(id);
      // Objeto de ferramentas: verifica se este id está ativo
      if (typeof fts === "object") {
        const ft = fts[id];
        if (ft === undefined) return true; // não configurado = ativo
        return ft === true || (typeof ft === "object");
      }
      return true;
    }
    // Formato 3: modulosAtivos (legado array) — ex: ["mod1","mod2","mod3"]
    if (Array.isArray(modulosAtivosLegacy) && modulosAtivosLegacy.includes(modId)) return true;
    return Array.isArray(modulosAtivosLegacy) && modulosAtivosLegacy.includes(id);
  }
  const modulos = user.modulosAtivos || [];
  const todasFerramentas = [
    { id:"humor",       label:"Registrar Humor",         sub:"Como você está se sentindo hoje?",  icon:"heart",      cor:"#fde8f0", tab:"humor" },
    { id:"tcc",         label:"Pensamentos Automáticos", sub:"Registre e questione pensamentos",  icon:"brain",      cor:"#ede0fa", tab:"tcc" },
    { id:"diario",      label:"Diário Terapêutico",      sub:"Escreva sobre o seu dia",           icon:"book-open",  cor:"#e0f0ff", tab:"diario" },
    { id:"metas",       label:"Minhas Metas",            sub:"Acompanhe seu progresso",           icon:"target",     cor:"#e0faed", tab:"metas" },
    { id:"fabulas",     label:"Fábulas Terapêuticas",    sub:"Histórias reflexivas",              icon:"book-heart", cor:"#fff3e0", tab:"fabulas" },
    { id:"reflexoes",   label:"Reflexões Cognitivas",    sub:"Exercícios de insight",             icon:"lightbulb",  cor:"#fefce0", tab:"reflexoes" },
    { id:"ferramentas", label:"Ferramentas Clínicas",    sub:"Recursos disponíveis",              icon:"wrench",     cor:"#f0f0f0", tab:"ferramentas" },
  ];
  const ferramentasVisiveis = todasFerramentas.filter(f=>ferramentaAtiva(f.id));
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

      {/* Ferramentas — acesso rápido só se houver módulos */}
      {ferramentasVisiveis.length > 0 && (
        <div className="card" style={{marginBottom:24}}>
          <div style={{fontWeight:600,fontSize:15,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Acesso Rápido</span>
            <span style={{fontSize:12,color:"var(--text-muted)"}}>{ferramentasVisiveis.length} módulo(s) ativo(s)</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
            {ferramentasVisiveis.slice(0,4).map(f=>(
              <button key={f.id} onClick={()=>setTab(f.tab)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--purple)";e.currentTarget.style.background="var(--purple-bg)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--gray-200)";e.currentTarget.style.background="white";}}>
                <div style={{width:36,height:36,borderRadius:10,background:f.cor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name={f.icon} size={18}/>
                </div>
                <div style={{fontSize:13,fontWeight:600}}>{f.label.split(" ")[0]}</div>
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

function FormCheckinSemanal({ user, semana, onSalvo, onCancelar }) {
  const [respostas, setRespostas] = React.useState({});
  const [salvando, setSalvando]   = React.useState(false);
  const [msg, setMsg]             = React.useState("");

  const escala = [1,2,3,4,5];
  const escalaLabel = {1:"Discordo totalmente",3:"Neutro",5:"Concordo totalmente"};

  async function salvar() {
    if (Object.keys(respostas).length < CHECKIN_SEMANAL_PERGUNTAS.length) {
      setMsg("Responda todas as perguntas antes de salvar.");
      return;
    }
    setSalvando(true);
    try {
      await db.collection("clinica_checkin_casal").add({
        pacienteId: user.id,
        casalId: user.casalId || user.id,
        semana,
        respostas,
        media: (Object.values(respostas).reduce((a,b)=>a+b,0) / CHECKIN_SEMANAL_PERGUNTAS.length).toFixed(1),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      onSalvo();
    } catch(e) { setMsg("Erro ao salvar. Tente novamente."); }
    setSalvando(false);
  }

  return (
    <div className="card">
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={onCancelar} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",display:"flex",alignItems:"center",gap:4,fontSize:13}}>
          <Icon name="arrow-left" size={15}/> Voltar
        </button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:16}}>Check-in Semanal</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>Semana {semana} — responda com honestidade</div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        {CHECKIN_SEMANAL_PERGUNTAS.map((pergunta, idx) => (
          <div key={idx} style={{borderBottom:"1px solid var(--gray-100)",paddingBottom:16}}>
            <div style={{fontSize:14,fontWeight:500,marginBottom:12,lineHeight:1.5}}>
              {idx+1}. {pergunta}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
              {escala.map(v => (
                <button key={v} onClick={()=>setRespostas(r=>({...r,[idx]:v}))}
                  style={{
                    width:44,height:44,borderRadius:"50%",border:"2px solid",
                    borderColor: respostas[idx]===v ? "var(--purple)" : "var(--gray-200)",
                    background: respostas[idx]===v ? "var(--purple)" : "white",
                    color: respostas[idx]===v ? "white" : "var(--text-muted)",
                    fontWeight:700,fontSize:15,cursor:"pointer",transition:"all .15s",flexShrink:0
                  }}>
                  {v}
                </button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text-muted)",marginTop:6}}>
              <span>Discordo totalmente</span><span>Concordo totalmente</span>
            </div>
          </div>
        ))}
      </div>

      {msg && <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:13,color:"#92400e"}}>{msg}</div>}

      <button onClick={salvar} disabled={salvando} className="btn-primary" style={{width:"100%",marginTop:20}}>
        {salvando ? "Salvando..." : "Enviar Check-in 💜"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PAINEL CASAL
// ═══════════════════════════════════════════════════════
function PainelCasal({ user }) {
  const [parceiro, setParceiro]           = React.useState(null);
  const [checkin, setCheckin]             = React.useState(null);
  const [metas, setMetas]                 = React.useState([]);
  const [metasParceiro, setMetasParceiro] = React.useState([]);
  const [mostrarForm, setMostrarForm]     = React.useState(false);

  function getSemana() {
    const d=new Date(), jan=new Date(d.getFullYear(),0,1);
    return `${Math.ceil(((d-jan)/86400000+jan.getDay()+1)/7)}/${d.getFullYear()}`;
  }

  React.useEffect(() => {
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
  const semana   = getSemana();

  if (mostrarForm) {
    return <FormCheckinSemanal user={user} semana={semana}
      onSalvo={()=>setMostrarForm(false)}
      onCancelar={()=>setMostrarForm(false)}/>;
  }

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
        <BotaoEmergenciaCard user={user} casalId={user.casalId||user.id}/>
      </div>

      {/* Check-in semanal */}
      <div style={{background:"linear-gradient(135deg,#7B00C4,#b040e0)",borderRadius:16,padding:24,marginBottom:16,color:"white"}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:1,opacity:0.8,marginBottom:8}}>CHECK-IN SEMANAL</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600,marginBottom:4}}>Como foi a semana de vocês?</div>
        <div style={{fontSize:13,opacity:0.75,marginBottom:16}}>Semana {semana}</div>
        <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,height:6,marginBottom:8}}>
          <div style={{width:checkin?"100%":"0%",height:"100%",background:"white",borderRadius:8,transition:"width .5s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:checkin?0:12}}>
          <span style={{fontSize:13,opacity:0.8}}>{checkin?"Respondido ✓":"Ainda não respondido"}</span>
          <span style={{fontSize:13,fontWeight:600}}>{checkin?"100%":"0%"}</span>
        </div>
        {!checkin && (
          <button onClick={()=>setMostrarForm(true)}
            style={{marginTop:8,background:"white",color:"var(--purple)",border:"none",borderRadius:20,padding:"8px 20px",fontWeight:600,fontSize:13,cursor:"pointer"}}>
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

// ── Botão Emergência como card de métrica ──
function BotaoEmergenciaCard({ user, casalId }) {
  const [palavra,    setPalavra]   = React.useState("");
  const [ativo,      setAtivo]     = React.useState(null);
  const [escolhendo, setEscolhendo]= React.useState(false);
  const [salvando,   setSalvando]  = React.useState(false);
  const [agora,      setAgora]     = React.useState(Date.now());

  React.useEffect(()=>{
    if(!casalId) return;
    db.collection("clinica_casais").where("p1Id","==",user.id).limit(1).get().then(s=>{
      if(s.docs.length>0) setPalavra(s.docs[0].data().palavraEmergencia||"");
      else db.collection("clinica_casais").where("p2Id","==",user.id).limit(1).get()
        .then(s2=>{ if(s2.docs.length>0) setPalavra(s2.docs[0].data().palavraEmergencia||""); });
    });
    db.collection("clinica_emergencia")
      .where("casalId","==",casalId).where("fim",">=",new Date().toISOString())
      .orderBy("fim","desc").limit(1)
      .onSnapshot(s=>{ setAtivo(s.docs.length>0?s.docs[0].data():null); },()=>{});
    const t=setInterval(()=>setAgora(Date.now()),60000);
    return()=>clearInterval(t);
  },[casalId,user.id]);

  async function acionar(h){
    setSalvando(true);
    try{
      const fim=new Date(Date.now()+h*3600000).toISOString();
      await db.collection("clinica_emergencia").add({
        casalId,horas:h,fim,
        acionadoPor:user.nome.split(" ")[0],
        acionadoPorId:user.id,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setEscolhendo(false);
    }catch(e){alert("Erro.");}
    setSalvando(false);
  }

  function restante(){
    if(!ativo?.fim) return null;
    const ms=new Date(ativo.fim).getTime()-agora;
    if(ms<=0) return null;
    const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);
    return h>0?`${h}h${m>0?" "+m+"min":""}`:m+"min";
  }

  if(!palavra) return null;
  const rest=restante();

  // Modal de escolha de tempo
  if(escolhendo) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"white",borderRadius:20,padding:28,maxWidth:320,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔴</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:"#dc2626",letterSpacing:3,marginBottom:8}}>{palavra}</div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:20,lineHeight:1.6}}>Por quanto tempo precisam de pausa?</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:16}}>
          {[1,2,6,12,24].map(h=>(
            <button key={h} onClick={()=>acionar(h)} disabled={salvando}
              style={{background:"#dc2626",color:"white",border:"none",borderRadius:20,padding:"8px 18px",fontSize:14,fontWeight:600,cursor:"pointer"}}>
              {h}h
            </button>
          ))}
        </div>
        <button onClick={()=>setEscolhendo(false)}
          style={{background:"none",border:"none",color:"#9ca3af",fontSize:13,cursor:"pointer"}}>
          Cancelar
        </button>
      </div>
    </div>
  );

  // Card ativo
  if(ativo&&rest) return (
    <div className="metric-card" style={{background:"linear-gradient(135deg,#dc2626,#b91c1c)",border:"none",cursor:"default"}}>
      <div style={{fontSize:22}}>🔴</div>
      <div style={{fontSize:10,fontWeight:700,color:"white",letterSpacing:1}}>{palavra}</div>
      <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.9)"}}>{rest}</div>
    </div>
  );

  // Card normal
  return (
    <div className="metric-card"
      style={{background:"linear-gradient(135deg,#dc2626,#b91c1c)",border:"none",cursor:"pointer",boxShadow:"0 4px 12px rgba(220,38,38,0.35)"}}
      onClick={()=>setEscolhendo(true)}
      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
      <div style={{fontSize:22}}>🔴</div>
      <div style={{fontSize:11,fontWeight:700,color:"white",letterSpacing:2,marginTop:2}}>{palavra}</div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.75)",marginTop:1}}>Emergência</div>
    </div>
  );
}

// ── Inventário Bem-Estar (42 questões) ──
const INVENTARIO_QUESTOES_C = [
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

const INVENTARIO_CATS_C = [
  {label:"Comunicação Eficaz",      cor:"#6366f1", questoes:[2,5,11,12,13,19,20]},
  {label:"Resolução de Conflitos",   cor:"#f59e0b", questoes:[4,8,14,18,23,28,31]},
  {label:"Intimidade Emocional",     cor:"#ec4899", questoes:[7,10,17,22,24,29,35]},
  {label:"Satisfação Sexual",        cor:"#dc2626", questoes:[3,6,9,15,21,25,27]},
  {label:"Cooperação e Colaboração", cor:"#16a34a", questoes:[1,16,26,37,38,39,41]},
  {label:"Senso de Humor e Lazer",   cor:"#0891b2", questoes:[30,32,33,34,36,40,42]},
];

const RODA_DIMENSOES = [
  "Comunicação","Família","Sexualidade","Estresse e Pressão",
  "Divisão","Ciúmes","Espiritualidade","Diferenças e Conflitos",
  "Estabilidade Financeira","Rel. de Poder","Mudanças","Expectativas e Equilíbrio"
];

function AtivInventario({ user, casalId, onVoltar }) {
  const [respostas, setRespostas] = React.useState({});
  const [parceiro,  setParceiro]  = React.useState(null);
  const [respParceiro, setRespParceiro] = React.useState(null);
  const [pagina, setPagina]       = React.useState(0);
  const [salvando, setSalvando]   = React.useState(false);
  const [salvo, setSalvo]         = React.useState(false);
  const [verComparativo, setVerComparativo] = React.useState(false);
  const POR_PAG = 6;
  const total   = INVENTARIO_QUESTOES_C.length;
  const totalPag = Math.ceil(total / POR_PAG);

  React.useEffect(()=>{
    if (!casalId) return;
    // Buscar parceiro
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{
      if(d.exists) setParceiro({id:d.id,...d.data()});
    });
    // Buscar resposta já salva do próprio usuário
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId)
      .where("pacienteId","==",user.id)
      .where("atividadeId","==","inventario-bem-estar")
      
      .onSnapshot(s=>{
        if(s.docs.length>0) { setRespostas(s.docs[0].data().respostas||{}); setSalvo(true); }
      },()=>{});
    // Buscar resposta do parceiro
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId)
      .where("atividadeId","==","inventario-bem-estar")
      .onSnapshot(s=>{
        const docParceiro = s.docs.find(d=>d.data().pacienteId !== user.id);
        if(docParceiro) setRespParceiro(docParceiro.data().respostas||{});
      },()=>{});
  },[casalId, user.id]);

  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId: user.id, casalId,
        atividadeId: "inventario-bem-estar",
        respostas,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch(e) { alert("Erro ao salvar."); }
    setSalvando(false);
  }

  function calcular(resp) {
    return INVENTARIO_CATS_C.map(cat=>{
      const soma = cat.questoes.reduce((a,q)=>a+(resp[q]||0),0);
      return {...cat, soma, pct: Math.max(0,Math.round(((soma-7)/28)*100))};
    });
  }

  // Comparativo visual
  if (verComparativo) {
    const meu = calcular(respostas);
    const del = respParceiro ? calcular(respParceiro) : null;
    const isEla = user.genero==="Feminino";
    const corEu = isEla ? "#ec4899" : "#2563eb";
    const corParceiro = isEla ? "#2563eb" : "#ec4899";
    return (
      <div>
        <button onClick={()=>setVerComparativo(false)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
          <Icon name="arrow-left" size={15}/> Voltar
        </button>
        <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Comparativo do Inventário</div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20}}>
          <span style={{color:corEu,fontWeight:600}}>● {user.nome.split(" ")[0]}</span>
          {parceiro && <span style={{color:corParceiro,fontWeight:600,marginLeft:12}}>● {parceiro.nome.split(" ")[0]}</span>}
        </div>
        {meu.map((cat,i)=>(
          <div key={cat.label} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,marginBottom:6}}>
              <span>{cat.label}</span>
              <span style={{display:"flex",gap:12}}>
                <span style={{color:corEu}}>{cat.soma}/35</span>
                {del && <span style={{color:corParceiro}}>{del[i].soma}/35</span>}
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <span style={{fontSize:10,color:corEu,fontWeight:700,width:18,flexShrink:0}}>Eu</span>
              <div style={{flex:1,height:10,borderRadius:20,background:"#f3f4f6",overflow:"hidden"}}>
                <div style={{height:"100%",width:cat.pct+"%",background:corEu,borderRadius:20}}/>
              </div>
            </div>
            {del && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{fontSize:9,color:corParceiro,fontWeight:700,width:18,flexShrink:0,overflow:"hidden",whiteSpace:"nowrap"}}>{parceiro.nome.split(" ")[0].slice(0,3)}</span>
                <div style={{flex:1,height:10,borderRadius:20,background:"#f3f4f6",overflow:"hidden"}}>
                  <div style={{height:"100%",width:del[i].pct+"%",background:corParceiro,borderRadius:20}}/>
                </div>
              </div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text-muted)",marginTop:2,paddingLeft:22}}>
              <span>Baixo (7)</span><span>Alto (35)</span>
            </div>
          </div>
        ))}
        {!del && <div style={{textAlign:"center",padding:16,fontSize:13,color:"var(--text-muted)",background:"#f9fafb",borderRadius:10}}>{parceiro?`${parceiro.nome.split(" ")[0]} ainda não respondeu o inventário.`:"Parceiro(a) não vinculado."}</div>}
      </div>
    );
  }

  // Instruções
  if (pagina===0) return (
    <div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:48,marginBottom:12}}>💑</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:8}}>Inventário de Bem-Estar de Casais</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20,lineHeight:1.7}}>
        42 questões sobre 6 dimensões do relacionamento.<br/>
        <em>Seja rápido, não pondere!</em>
      </div>
      {salvo && <div style={{background:"#d1fae5",borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:"#065f46"}}>✓ Você já respondeu. Pode refazer ou ver o comparativo.</div>}
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        <button className="btn-primary" onClick={()=>setPagina(1)}>
          {salvo?"Refazer inventário":"Iniciar"}
        </button>
        {salvo && <button className="btn-secondary" onClick={()=>setVerComparativo(true)}>Ver comparativo 📊</button>}
      </div>
    </div>
  );

  // Resultado
  if (pagina===totalPag+1) {
    return (
      <div>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:8}}>✅</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600}}>Inventário concluído!</div>
        </div>
        {calcular(respostas).map(cat=>(
          <div key={cat.label} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,marginBottom:4}}>
              <span style={{color:cat.cor}}>{cat.label}</span><span>{cat.soma}/35</span>
            </div>
            <div style={{background:"#f3f4f6",borderRadius:20,height:8}}>
              <div style={{width:cat.pct+"%",height:"100%",background:cat.cor,borderRadius:20}}/>
            </div>
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button className="btn-secondary" style={{flex:1}} onClick={salvar} disabled={salvando}>
            {salvando?"Salvando...":"💾 Salvar respostas"}
          </button>
          <button className="btn-primary" style={{flex:1}} onClick={()=>setVerComparativo(true)}>
            Ver comparativo 📊
          </button>
        </div>
      </div>
    );
  }

  const questoesPag = INVENTARIO_QUESTOES_C.slice((pagina-1)*POR_PAG, pagina*POR_PAG);
  const respondidas = Object.keys(respostas).length;
  return (
    <div>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text-muted)",marginBottom:4}}>
          <span>Questões {(pagina-1)*POR_PAG+1}–{Math.min(pagina*POR_PAG,42)} de 42</span>
          <span>{respondidas} respondidas</span>
        </div>
        <div style={{background:"#f3f4f6",borderRadius:20,height:5}}>
          <div style={{width:Math.round((respondidas/42)*100)+"%",height:"100%",background:"var(--purple)",borderRadius:20}}/>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {questoesPag.map(q=>(
          <div key={q.n} style={{background:"#fafafa",borderRadius:10,padding:14,border:"1px solid var(--gray-100)"}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:10,lineHeight:1.5}}>
              <span style={{color:"var(--purple)",marginRight:6}}>{q.n}.</span>{q.texto}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {q.opcoes.map((op,i)=>(
                <button key={i} onClick={()=>setRespostas(r=>({...r,[q.n]:i+1}))}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,
                    border:`1.5px solid ${respostas[q.n]===i+1?"var(--purple)":"var(--gray-200)"}`,
                    background:respostas[q.n]===i+1?"#f5f3ff":"white",
                    cursor:"pointer",fontFamily:"inherit",fontSize:12,textAlign:"left",
                    color:respostas[q.n]===i+1?"var(--purple)":"var(--gray-700)",
                    fontWeight:respostas[q.n]===i+1?600:400}}>
                  <span style={{fontSize:10,color:"var(--gray-400)",minWidth:14}}>{String.fromCharCode(97+i)})</span>{op}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginTop:20}}>
        <button className="btn-secondary" onClick={()=>setPagina(p=>p-1)} disabled={pagina===1}>← Anterior</button>
        <div style={{flex:1}}/>
        {pagina<totalPag
          ? <button className="btn-primary" onClick={()=>setPagina(p=>p+1)}>Próximo →</button>
          : <button className="btn-primary" onClick={()=>setPagina(totalPag+1)} disabled={respondidas<42} style={{opacity:respondidas<42?0.5:1}}>
              {respondidas<42?`Faltam ${42-respondidas}`:"Ver Resultado →"}
            </button>
        }
      </div>
    </div>
  );
}

// ── Roda da Vida do Relacionamento ──
function AtivRodaVida({ user, casalId, onVoltar }) {
  const [valores,    setValores]    = React.useState({});
  const [parceiro,   setParceiro]   = React.useState(null);
  const [valParceiro,setValParceiro]= React.useState(null);
  const [salvando,   setSalvando]   = React.useState(false);
  const [salvo,      setSalvo]      = React.useState(false);

  React.useEffect(()=>{
    if (!casalId) return;
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",user.id)
      .where("atividadeId","==","roda-vida-relacionamento")
      .onSnapshot(s=>{ if(s.docs.length>0){setValores(s.docs[0].data().respostas||{});setSalvo(true);} },()=>{});
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",casalId)
      .where("atividadeId","==","roda-vida-relacionamento")
      .onSnapshot(s=>{ if(s.docs.length>0) setValParceiro(s.docs[0].data().respostas||{}); },()=>{});
  },[casalId,user.id]);

  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId:user.id, casalId, atividadeId:"roda-vida-relacionamento",
        respostas:valores, createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  const isEla = user.genero==="Feminino";
  const corEu = isEla?"#ec4899":"#2563eb";
  const corParceiro = isEla?"#2563eb":"#ec4899";

  // SVG Radar
  function Radar({vals, cor, opacity=1}) {
    const n = RODA_DIMENSOES.length;
    const cx=150,cy=150,r=110;
    const pontos = RODA_DIMENSOES.map((_,i)=>{
      const ang = (i/n)*2*Math.PI - Math.PI/2;
      const v = (vals[RODA_DIMENSOES[i]]||0)/10;
      return [cx+r*v*Math.cos(ang), cy+r*v*Math.sin(ang)];
    });
    const pts = pontos.map(p=>p.join(",")).join(" ");
    const grades = [2,4,6,8,10].map(g=>{
      const gpts = RODA_DIMENSOES.map((_,i)=>{
        const ang=(i/n)*2*Math.PI-Math.PI/2;
        return [cx+r*(g/10)*Math.cos(ang),cy+r*(g/10)*Math.sin(ang)].join(",");
      }).join(" ");
      return <polygon key={g} points={gpts} fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>;
    });
    const eixos = RODA_DIMENSOES.map((_,i)=>{
      const ang=(i/n)*2*Math.PI-Math.PI/2;
      return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(ang)} y2={cy+r*Math.sin(ang)} stroke="#e5e7eb" strokeWidth="0.5"/>;
    });
    const labels = RODA_DIMENSOES.map((d,i)=>{
      const ang=(i/n)*2*Math.PI-Math.PI/2;
      const lx=cx+(r+18)*Math.cos(ang), ly=cy+(r+18)*Math.sin(ang);
      return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#6b7280">{d}</text>;
    });
    return (
      <g opacity={opacity}>
        {grades}{eixos}
        <polygon points={pts} fill={cor} fillOpacity="0.2" stroke={cor} strokeWidth="2"/>
        {labels}
      </g>
    );
  }

  return (
    <div>
      <button onClick={onVoltar} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
        <Icon name="arrow-left" size={15}/> Voltar
      </button>
      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Roda da Vida do Relacionamento</div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>Avalie de 0 a 10 cada dimensão. 0 = nenhum estresse · 10 = estresse máximo</div>

      {salvo && (
        <div style={{marginBottom:20,textAlign:"center"}}>
          <svg width="300" height="300" viewBox="0 0 300 300">
            <Radar vals={valores} cor={corEu}/>
            {valParceiro && <Radar vals={valParceiro} cor={corParceiro} opacity={0.7}/>}
          </svg>
          <div style={{display:"flex",gap:16,justifyContent:"center",fontSize:12,marginTop:8}}>
            <span style={{color:corEu,fontWeight:600}}>● {user.nome.split(" ")[0]}</span>
            {parceiro&&valParceiro&&<span style={{color:corParceiro,fontWeight:600}}>● {parceiro.nome.split(" ")[0]}</span>}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {RODA_DIMENSOES.map(dim=>(
          <div key={dim}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:4}}>{dim}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="range" min="0" max="10" step="1"
                value={valores[dim]||0}
                onChange={e=>setValores(v=>({...v,[dim]:parseInt(e.target.value)}))}
                style={{flex:1,accentColor:"var(--purple)"}}/>
              <span style={{width:20,textAlign:"center",fontWeight:700,fontSize:13,color:"var(--purple)"}}>{valores[dim]||0}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary" style={{width:"100%"}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar Roda da Vida"}
      </button>
      {salvo&&!valParceiro&&parceiro&&<div style={{marginTop:12,fontSize:12,color:"var(--text-muted)",textAlign:"center"}}>{parceiro.nome.split(" ")[0]} ainda não respondeu — o comparativo aparecerá quando ambos responderem.</div>}
    </div>
  );
}

// ── Nossas 3 Metas ──
function AtivMetas({ user, casalId, onVoltar }) {
  const [metas, setMetas]     = React.useState(["","",""]);
  const [salvas, setSalvas]   = React.useState([]);
  const [parceiroMetas, setParceiroMetas] = React.useState([]);
  const [parceiro, setParceiro] = React.useState(null);
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(()=>{
    if(!casalId) return;
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    db.collection("clinica_metas").where("pacienteId","==",user.id).where("status","==","ativa")
      .onSnapshot(s=>setSalvas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_metas").where("pacienteId","==",casalId).where("status","==","ativa")
      .onSnapshot(s=>setParceiroMetas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[casalId,user.id]);

  async function salvar() {
    const validas = metas.filter(m=>m.trim());
    if(validas.length===0){alert("Digite pelo menos 1 meta.");return;}
    setSalvando(true);
    try {
      // Remove metas antigas
      const antigas = await db.collection("clinica_metas").where("pacienteId","==",user.id).where("status","==","ativa").get();
      const batch = db.batch();
      antigas.docs.forEach(d=>batch.update(d.ref,{status:"arquivada"}));
      // Adiciona novas
      for(const titulo of validas){
        const ref = db.collection("clinica_metas").doc();
        batch.set(ref,{titulo,pacienteId:user.id,casalId,status:"ativa",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      }
      await batch.commit();
      setMetas(["","",""]);
    } catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  return (
    <div>
      <button onClick={onVoltar} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
        <Icon name="arrow-left" size={15}/> Voltar
      </button>
      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Nossas 3 Metas do Relacionamento</div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:20}}>Defina suas 3 principais metas terapêuticas. Elas aparecem no dashboard do casal.</div>

      {/* Metas atuais */}
      {salvas.length>0&&(
        <div style={{background:"#f5f3ff",borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--purple)",marginBottom:8}}>Suas metas atuais:</div>
          {salvas.map(m=><div key={m.id} style={{fontSize:13,marginBottom:4}}>🥈 {m.titulo}</div>)}
        </div>
      )}

      {/* Comparativo com parceiro */}
      {parceiroMetas.length>0&&parceiro&&(
        <div style={{background:"#eff6ff",borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"#2563eb",marginBottom:8}}>Metas de {parceiro.nome.split(" ")[0]}:</div>
          {parceiroMetas.map(m=><div key={m.id} style={{fontSize:13,marginBottom:4}}>🥈 {m.titulo}</div>)}
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {[0,1,2].map(i=>(
          <div key={i}>
            <label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Meta {i+1}</label>
            <input className="form-input" value={metas[i]}
              onChange={e=>{const n=[...metas];n[i]=e.target.value;setMetas(n);}}
              placeholder={`Ex: ${["Melhorar a comunicação diária","Reservar tempo de qualidade juntos","Resolver conflitos com mais calma"][i]}`}/>
          </div>
        ))}
      </div>
      <button className="btn-primary" style={{width:"100%"}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar metas"}
      </button>
    </div>
  );
}

// ── Quem Eu Sou no Relacionamento ──
function AtivQuemSou({ user, casalId, onVoltar }) {
  const QUADRANTES = [
    {id:"sou",    label:"SOU",                  desc:"Características que possuo e não me incomodam.",              cor:"#7B00C4",bg:"#f5f3ff"},
    {id:"nao_mas",label:"NÃO SOU, MAS GOSTARIA", desc:"Características que não possuo e me fazem falta.",            cor:"#0891b2",bg:"#e0f2fe"},
    {id:"sou_nao",label:"SOU, MAS NÃO GOSTARIA", desc:"Características que possuo mas me incomodam.",                cor:"#d97706",bg:"#fef3c7"},
    {id:"nao_sou",label:"NÃO SOU",               desc:"Características que não possuo e não me incomodam.",          cor:"#6b7280",bg:"#f3f4f6"},
  ];
  const [campos,  setCampos]  = React.useState({sou:"",nao_mas:"",sou_nao:"",nao_sou:""});
  const [parceiro,setParceiro]= React.useState(null);
  const [respP,   setRespP]   = React.useState(null);
  const [salvo,   setSalvo]   = React.useState(false);
  const [salvando,setSalvando]= React.useState(false);

  React.useEffect(()=>{
    if(!casalId) return;
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",user.id)
      .where("atividadeId","==","quem-sou")
      .onSnapshot(s=>{ if(s.docs.length>0){setCampos(s.docs[0].data().respostas||{});setSalvo(true);} },()=>{});
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",casalId)
      .where("atividadeId","==","quem-sou")
      .onSnapshot(s=>{ if(s.docs.length>0) setRespP(s.docs[0].data().respostas||{}); },()=>{});
  },[casalId,user.id]);

  async function salvar(){
    setSalvando(true);
    try{
      await db.collection("clinica_casais_respostas").add({
        pacienteId:user.id,casalId,atividadeId:"quem-sou",
        respostas:campos,createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    }catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  return (
    <div>
      <button onClick={onVoltar} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
        <Icon name="arrow-left" size={15}/> Voltar
      </button>
      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Quem Eu Sou no Relacionamento</div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>Reflexão individual sobre sua identidade no relacionamento.</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {QUADRANTES.map(q=>(
          <div key={q.id} style={{background:q.bg,borderRadius:10,padding:12,border:`1px solid ${q.cor}30`}}>
            <div style={{fontWeight:700,fontSize:11,color:q.cor,marginBottom:4}}>{q.label}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:8,lineHeight:1.4}}>{q.desc}</div>
            <textarea className="form-input" rows={4} value={campos[q.id]||""}
              onChange={e=>setCampos(c=>({...c,[q.id]:e.target.value}))}
              placeholder="Digite aqui..." style={{fontSize:12,resize:"none",background:"white"}}/>
          </div>
        ))}
      </div>

      <button className="btn-primary" style={{width:"100%",marginBottom:16}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar"}
      </button>

      {/* Comparativo com parceiro */}
      {respP&&parceiro&&(
        <div style={{borderTop:"1px solid var(--gray-100)",paddingTop:16}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>💬 Respostas de {parceiro.nome.split(" ")[0]}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {QUADRANTES.map(q=>(
              <div key={q.id} style={{background:q.bg,borderRadius:10,padding:12,border:`1px solid ${q.cor}30`}}>
                <div style={{fontWeight:700,fontSize:11,color:q.cor,marginBottom:6}}>{q.label}</div>
                <div style={{fontSize:12,color:"var(--gray-700)",whiteSpace:"pre-wrap",lineHeight:1.5}}>{respP[q.id]||<span style={{color:"var(--gray-400)"}}>Não preenchido</span>}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── O Que Eu Quero e Não Quero Mais ──
function AtivOQueQuero({ user, casalId, onVoltar }) {
  const CAMPOS = [
    {id:"quero_sit",  label:"QUERO +  Situações",  desc:"Situações que você gosta e deseja que continuem.",      cor:"#16a34a",bg:"#f0fdf4"},
    {id:"quero_val",  label:"QUERO +  Valores",     desc:"Situações MUITO IMPORTANTES que deseja manter.",        cor:"#16a34a",bg:"#dcfce7"},
    {id:"nquero_sit", label:"QUERO −  Situações",   desc:"Situações que você NÃO gosta e quer que parem.",        cor:"#dc2626",bg:"#fef2f2"},
    {id:"nquero_val", label:"QUERO −  Valores",     desc:"Situações MUITO IMPORTANTES que deseja mudar.",         cor:"#dc2626",bg:"#fee2e2"},
  ];
  const [campos,  setCampos]  = React.useState({});
  const [parceiro,setParceiro]= React.useState(null);
  const [respP,   setRespP]   = React.useState(null);
  const [salvando,setSalvando]= React.useState(false);
  const [salvo,   setSalvo]   = React.useState(false);

  React.useEffect(()=>{
    if(!casalId) return;
    db.collection("clinica_pacientes").doc(casalId).get().then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",user.id)
      .where("atividadeId","==","o-que-quero")
      .onSnapshot(s=>{ if(s.docs.length>0){setCampos(s.docs[0].data().respostas||{});setSalvo(true);} },()=>{});
    db.collection("clinica_casais_respostas")
      .where("casalId","==",casalId).where("pacienteId","==",casalId)
      .where("atividadeId","==","o-que-quero")
      .onSnapshot(s=>{ if(s.docs.length>0) setRespP(s.docs[0].data().respostas||{}); },()=>{});
  },[casalId,user.id]);

  async function salvar(){
    setSalvando(true);
    try{
      await db.collection("clinica_casais_respostas").add({
        pacienteId:user.id,casalId,atividadeId:"o-que-quero",
        respostas:campos,createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    }catch(e){alert("Erro ao salvar.");}
    setSalvando(false);
  }

  return (
    <div>
      <button onClick={onVoltar} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16}}>
        <Icon name="arrow-left" size={15}/> Voltar
      </button>
      <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>O Que Eu Quero e Não Quero Mais</div>
      <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>Mapeamento de expectativas e limites no relacionamento.</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {CAMPOS.map(c=>(
          <div key={c.id} style={{background:c.bg,borderRadius:10,padding:12,border:`1px solid ${c.cor}30`}}>
            <div style={{fontWeight:700,fontSize:11,color:c.cor,marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:8,lineHeight:1.4}}>{c.desc}</div>
            <textarea className="form-input" rows={4} value={campos[c.id]||""}
              onChange={e=>setCampos(v=>({...v,[c.id]:e.target.value}))}
              placeholder="Digite aqui..." style={{fontSize:12,resize:"none",background:"white"}}/>
          </div>
        ))}
      </div>

      <button className="btn-primary" style={{width:"100%",marginBottom:16}} onClick={salvar} disabled={salvando}>
        {salvando?"Salvando...":"💾 Salvar"}
      </button>

      {respP&&parceiro&&(
        <div style={{borderTop:"1px solid var(--gray-100)",paddingTop:16}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>💬 Respostas de {parceiro.nome.split(" ")[0]}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {CAMPOS.map(c=>(
              <div key={c.id} style={{background:c.bg,borderRadius:10,padding:12,border:`1px solid ${c.cor}30`}}>
                <div style={{fontWeight:700,fontSize:11,color:c.cor,marginBottom:6}}>{c.label}</div>
                <div style={{fontSize:12,color:"var(--gray-700)",whiteSpace:"pre-wrap",lineHeight:1.5}}>{respP[c.id]||<span style={{color:"var(--gray-400)"}}>Não preenchido</span>}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
function EtapaCasal({ user, etapaData }) {
  const [atividadeAberta, setAtividadeAberta] = React.useState(null);
  const [respostas, setRespostas]             = React.useState({});
  const [salvando, setSalvando]               = React.useState(false);
  const [msg, setMsg]                         = React.useState("");
  const casalId = user.casalId || user.id;

  async function salvarRespostas() {
    if (!atividadeAberta) return;
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId: user.id, casalId,
        etapaId: etapaData.tabId,
        atividadeId: atividadeAberta.id,
        atividadeTitulo: atividadeAberta.titulo,
        respostas,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setMsg("✓ Respostas salvas! 💜");
      setTimeout(()=>setMsg(""), 3000);
    } catch(e) { setMsg("Erro ao salvar. Tente novamente."); }
    setSalvando(false);
  }

  if (atividadeAberta) {
    // Atividades específicas do Diagnóstico
    if (atividadeAberta.id==="inventario-bem-estar")
      return <AtivInventario user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;
    if (atividadeAberta.id==="roda-vida-relacionamento")
      return <AtivRodaVida user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;
    if (atividadeAberta.id==="3-metas")
      return <AtivMetas user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;
    if (atividadeAberta.id==="quem-sou")
      return <AtivQuemSou user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;
    if (atividadeAberta.id==="o-que-quero")
      return <AtivOQueQuero user={user} casalId={casalId} onVoltar={()=>setAtividadeAberta(null)}/>;

    // Template genérico para etapas 1-4
    return (
      <div>
        <button onClick={()=>{ setAtividadeAberta(null); setRespostas({}); setMsg(""); }}
          style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:13,marginBottom:16,padding:"6px 0"}}>
          <Icon name="arrow-left" size={15}/> Voltar para {etapaData.stage===0?"Diagnóstico":"Etapa "+etapaData.stage}
        </button>
        <div style={{background:etapaData.bg,border:"1.5px solid "+etapaData.cor+"40",borderRadius:14,padding:20,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:28}}>{etapaData.emoji}</span>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:etapaData.cor}}>{etapaData.stage===0?"Diagnóstico":"Etapa "+etapaData.stage} — {etapaData.titulo}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{atividadeAberta.titulo}</div>
            </div>
          </div>
          <p style={{fontSize:13,color:"var(--gray-700)",marginTop:10,lineHeight:1.6}}>{atividadeAberta.desc}</p>
        </div>
        <div className="card">
          <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>{atividadeAberta.titulo}</div>
          <div style={{background:"#f9fafb",borderRadius:10,padding:14,marginBottom:20,fontSize:13,color:"#6b7280",lineHeight:1.7}}>
            Responda com honestidade. Esta atividade faz parte do protocolo de Terapia de Casais TCC da Dra. Lucia Kratz.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[1,2,3].map(n=>(
              <div key={n}>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Reflexão {n}</label>
                <textarea className="form-input" rows={3}
                  value={respostas[atividadeAberta.id+"_"+n]||""}
                  onChange={e=>setRespostas(r=>({...r,[atividadeAberta.id+"_"+n]:e.target.value}))}
                  placeholder="Escreva sua resposta..." style={{resize:"vertical"}}/>
              </div>
            ))}
          </div>
          {msg && <div style={{background:msg.startsWith("✓")?"#d1fae5":"#fef3c7",border:"1px solid",borderColor:msg.startsWith("✓")?"#6ee7b7":"#f59e0b",borderRadius:8,padding:"10px 14px",marginTop:16,fontSize:13,color:msg.startsWith("✓")?"#065f46":"#92400e"}}>{msg}</div>}
          <button onClick={salvarRespostas} disabled={salvando} className="btn-primary" style={{width:"100%",marginTop:20}}>
            {salvando?"Salvando...":<><Icon name="save" size={15}/> Salvar respostas</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{background:etapaData.bg, border:"1.5px solid "+etapaData.cor+"40", borderRadius:14, padding:24, marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <span style={{fontSize:36}}>{etapaData.emoji}</span>
          <div>
            <div style={{fontWeight:700,fontSize:18,color:etapaData.cor}}>
              {etapaData.stage===0?"Diagnóstico Inicial":"Etapa "+etapaData.stage} — {etapaData.titulo}
            </div>
            <div style={{fontSize:13,color:"var(--gray-700)",marginTop:2}}>{etapaData.subtitulo}</div>
          </div>
        </div>
        <div style={{fontSize:13,color:"var(--gray-600)",marginTop:8,lineHeight:1.6}}>
          {etapaData.atividades.length} atividade{etapaData.atividades.length!==1?"s":""} disponível{etapaData.atividades.length!==1?"is":""} nesta etapa. Clique para acessar.
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {etapaData.atividades.map(at=>(
          <button key={at.id} onClick={()=>setAtividadeAberta(at)}
            style={{display:"flex",alignItems:"flex-start",gap:14,padding:18,borderRadius:12,border:"1.5px solid var(--gray-200)",background:"white",cursor:"pointer",textAlign:"left",transition:"all .2s",width:"100%"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=etapaData.cor;e.currentTarget.style.background=etapaData.bg;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--gray-200)";e.currentTarget.style.background="white";}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:etapaData.cor,marginTop:5,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>{at.titulo}</div>
              <div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.5}}>{at.desc}</div>
            </div>
            <span style={{fontSize:12,color:etapaData.cor,fontWeight:600,flexShrink:0,marginTop:2}}>Acessar →</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  PAINEL ALUNO
// ═══════════════════════════════════════════════════════
function PainelAluno({ user }) {
  const hoje = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
  const hora = new Date().getHours();
  const saudacao = hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";

  const FERRAMENTAS_ALUNO = [
    { id:"tcc",       label:"Pensamentos Automáticos", sub:"Registre e questione pensamentos — TCC", icon:"brain",      cor:"#ede0fa" },
    { id:"humor",     label:"Registro de Humor",       sub:"Escala de humor do paciente",            icon:"heart",      cor:"#fde8f0" },
    { id:"diario",    label:"Diário Terapêutico",      sub:"Escrita reflexiva livre",                icon:"book-open",  cor:"#e0f0ff" },
    { id:"metas",     label:"Metas Terapêuticas",      sub:"Defina objetivos com o paciente",        icon:"target",     cor:"#e0faed" },
    { id:"fabulas",   label:"Fábulas Terapêuticas",    sub:"Histórias reflexivas para sessão",       icon:"book-heart", cor:"#fff3e0" },
    { id:"reflexoes", label:"Reflexões Cognitivas",    sub:"Exercícios de insight e reestruturação", icon:"lightbulb",  cor:"#fefce0" },
    { id:"ansiedade", label:"Gestão da Ansiedade",     sub:"Tracking, nível de estresse, roda",      icon:"activity",   cor:"#f0e8ff" },
  ];

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#7B00C4,#5a0090)",borderRadius:16,padding:"28px 32px",marginBottom:24,color:"white",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
        <div style={{fontSize:13,opacity:0.8,marginBottom:6,textTransform:"capitalize"}}>{hoje}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:28,fontWeight:600,marginBottom:4}}>
          {saudacao}, {user.nome.split(" ")[0]}! 🎓
        </div>
        <div style={{fontSize:14,opacity:0.85}}>Portal de Supervisão Clínica — Dra. Lucia Kratz</div>
      </div>

      <LinkCompartilhavel user={user}/>

      <div className="card" style={{marginBottom:24}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Ferramentas Clínicas</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {FERRAMENTAS_ALUNO.map(f=>(
            <div key={f.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:12,border:"1px solid var(--gray-200)",background:"white"}}>
              <div style={{width:44,height:44,borderRadius:12,background:f.cor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Icon name={f.icon} size={20}/>
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>{f.label}</div>
                <div style={{fontSize:12,color:"var(--text-muted)"}}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <HistoricoAluno user={user}/>
    </div>
  );
}

function LinkCompartilhavel({ user }) {
  const [descricao, setDescricao]   = React.useState("");
  const [ferramenta, setFerramenta] = React.useState("tcc");
  const [salvando, setSalvando]     = React.useState(false);
  const [links, setLinks]           = React.useState([]);
  const [copiado, setCopiado]       = React.useState(null);
  const [mostrarForm, setMostrarForm] = React.useState(false);

  const FERRAMENTAS_LINK = [
    {id:"tcc",       label:"Pensamentos Automáticos"},
    {id:"humor",     label:"Registro de Humor"},
    {id:"diario",    label:"Diário Terapêutico"},
    {id:"metas",     label:"Metas Terapêuticas"},
    {id:"fabulas",   label:"Fábulas Terapêuticas"},
    {id:"reflexoes", label:"Reflexões Cognitivas"},
    {id:"ansiedade", label:"Gestão da Ansiedade"},
  ];

  React.useEffect(()=>{
    const unsub = db.collection("clinica_aluno_links")
      .where("alunoId","==",user.id)
      .onSnapshot(s=>{
        const docs = s.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setLinks(docs);
      },()=>{});
    return unsub;
  },[user.id]);

  async function gerarLink(){
    if(!descricao.trim()){alert("Digite uma identificação.");return;}
    setSalvando(true);
    const token = Math.random().toString(36).slice(2,10).toUpperCase();
    await db.collection("clinica_aluno_links").add({
      alunoId:user.id, alunoNome:user.nome,
      token, ferramenta, descricao,
      url:`${SITE_URL}/clinica/?link=${token}`,
      usos:0, createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    setDescricao(""); setMostrarForm(false); setSalvando(false);
  }

  function copiar(url,id){
    navigator.clipboard.writeText(url);
    setCopiado(id);
    setTimeout(()=>setCopiado(null),2000);
  }

  async function excluir(id){ if(!confirm("Excluir link?"))return; await db.collection("clinica_aluno_links").doc(id).delete(); }

  return (
    <div className="card" style={{marginBottom:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}>
          <Icon name="share-2" size={16}/> Links para Pacientes
        </div>
        <button className="btn btn-purple" style={{fontSize:13}} onClick={()=>setMostrarForm(f=>!f)}>
          <Icon name="plus" size={15}/> Gerar Link
        </button>
      </div>

      {mostrarForm&&(
        <div style={{background:"var(--purple-bg)",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div className="form-group">
              <label className="form-label">Ferramenta</label>
              <select className="form-input" value={ferramenta} onChange={e=>setFerramenta(e.target.value)}>
                {FERRAMENTAS_LINK.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Identificação (ex: nome do paciente)</label>
              <input className="form-input" value={descricao} onChange={e=>setDescricao(e.target.value)} placeholder="Ex: João — TCC sessão 3"/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn btn-ghost" onClick={()=>setMostrarForm(false)}>Cancelar</button>
            <button className="btn btn-purple" onClick={gerarLink} disabled={salvando}>{salvando?"Gerando...":"Gerar Link"}</button>
          </div>
        </div>
      )}

      {links.length===0&&!mostrarForm&&(
        <div style={{textAlign:"center",padding:24,color:"var(--text-muted)",fontSize:14}}>
          Nenhum link gerado ainda. Crie um link para compartilhar com seu paciente.
        </div>
      )}

      {links.map(l=>(
        <div key={l.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid var(--gray-100)"}}>
          <div style={{width:36,height:36,borderRadius:8,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Icon name="link" size={16}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14}}>{l.descricao}</div>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>{l.ferramenta} · {l.usos||0} uso(s)</div>
          </div>
          <button onClick={()=>copiar(l.url,l.id)}
            style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid var(--purple)",background:copiado===l.id?"var(--purple)":"white",color:copiado===l.id?"white":"var(--purple)",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .2s"}}>
            {copiado===l.id?"✓ Copiado!":"Copiar Link"}
          </button>
          <button className="btn btn-ghost" style={{padding:"4px 8px",color:"var(--danger)"}} onClick={()=>excluir(l.id)}>
            <Icon name="trash-2" size={13}/>
          </button>
        </div>
      ))}
    </div>
  );
}

function HistoricoAluno({ user }) {
  const [registros, setRegistros] = React.useState([]);
  React.useEffect(()=>{
    const unsub = db.collection("clinica_aluno_registros")
      .where("alunoId","==",user.id)
      
      .onSnapshot(s=>setRegistros(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return unsub;
  },[user.id]);

  if(registros.length===0) return null;
  return (
    <div className="card">
      <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Histórico de Registros</div>
      {registros.map(r=>(
        <div key={r.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:"1px solid var(--gray-100)"}}>
          <div style={{width:36,height:36,borderRadius:8,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Icon name="file-text" size={16}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:500,fontSize:14}}>{r.ferramenta} — {r.descricao||"Sem descrição"}</div>
            <div style={{fontSize:12,color:"var(--text-muted)"}}>{r.createdAt?.seconds?new Date(r.createdAt.seconds*1000).toLocaleDateString("pt-BR"):""}</div>
            {r.conteudo&&<div style={{marginTop:6,fontSize:13,color:"var(--gray-600)",background:"var(--gray-50)",borderRadius:8,padding:"8px 12px"}}>{r.conteudo}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SELETOR DE MODO — individual ou casal
// ═══════════════════════════════════════════════════════
function SeletorModo({ user, onEscolha }) {
  const [parceiro, setParceiro] = React.useState(null);
  const temIndividual = (user.modulosAtivos||[]).filter(m=>m!=="mod5").length > 0 ||
    Object.entries(user.modulosConfig||{}).some(([k,v])=>k!=="mod5"&&v?.ativo);
  const temCasal = !!user.casalId;

  React.useEffect(()=>{
    if(user.casalId){
      db.collection("clinica_pacientes").doc(user.casalId).get()
        .then(d=>{ if(d.exists) setParceiro({id:d.id,...d.data()}); });
    }
  },[user.casalId]);

  // Se só tem um modo, vai direto
  React.useEffect(()=>{
    if(temCasal && !temIndividual) onEscolha("casal");
    else if(!temCasal && temIndividual) onEscolha("individual");
    else if(!temCasal && !temIndividual) onEscolha("individual");
  },[temCasal, temIndividual]);

  // Se tem os dois, mostra seletor
  if(!temCasal || !temIndividual) return <Spinner/>;

  return (
    <div style={{minHeight:"100vh",background:"var(--gray-50)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:480}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <img src={LOGO_URL} alt="Lucia Kratz" style={{width:100,height:100,objectFit:"contain",marginBottom:16}} onError={e=>e.target.style.display="none"}/>
          <div style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:600,color:"var(--purple)"}}>
            Olá, {user.nome.split(" ")[0]}! 💜
          </div>
          <div style={{fontSize:14,color:"var(--text-muted)",marginTop:4}}>Como você quer acessar hoje?</div>
        </div>

        {/* Opções */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <button onClick={()=>onEscolha("individual")}
            style={{display:"flex",alignItems:"center",gap:20,padding:"24px 28px",borderRadius:16,border:"2px solid var(--gray-200)",background:"white",cursor:"pointer",textAlign:"left",transition:"all .2s",width:"100%"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--purple)";e.currentTarget.style.background="var(--purple-bg)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--gray-200)";e.currentTarget.style.background="white";}}>
            <div style={{width:56,height:56,borderRadius:16,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Icon name="user" size={28}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text)",marginBottom:4}}>
                Meu Espaço Individual
              </div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>
                Ferramentas pessoais, humor, diário e metas terapêuticas
              </div>
            </div>
            <Icon name="chevron-right" size={20}/>
          </button>

          <button onClick={()=>onEscolha("casal")}
            style={{display:"flex",alignItems:"center",gap:20,padding:"24px 28px",borderRadius:16,border:"2px solid var(--gray-200)",background:"white",cursor:"pointer",textAlign:"left",transition:"all .2s",width:"100%"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#e879f9";e.currentTarget.style.background="#fdf4ff";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--gray-200)";e.currentTarget.style.background="white";}}>
            <div style={{width:56,height:56,borderRadius:16,background:"#fce7f3",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Icon name="heart" size={28}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,color:"var(--text)",marginBottom:4}}>
                Terapia de Casal
              </div>
              <div style={{fontSize:13,color:"var(--text-muted)"}}>
                {parceiro ? `Com ${parceiro.nome.split(" ")[0]}` : "Espaço do casal"} — check-ins, etapas e metas
              </div>
            </div>
            <Icon name="chevron-right" size={20}/>
          </button>
        </div>

        <div style={{textAlign:"center",marginTop:32,fontSize:12,color:"var(--gray-400)"}}>
          Plataforma protegida · Dra. Lucia Kratz · CRP 09/20590
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  APP PRINCIPAL
// ═══════════════════════════════════════════════════════
function App() {
  const [user, setUser]   = React.useState(null);
  const [modo, setModo]   = React.useState(null);
  const [tab, setTab]     = React.useState(null);
  const notifProps = useBotaoNotificacao(user);

  // Mantém user sincronizado com Firebase em tempo real
  React.useEffect(()=>{
    if (!user?.id) return;
    const unsub = db.collection("clinica_pacientes").doc(user.id)
      .onSnapshot(d=>{ if(d.exists) setUser(u=>({...u,...d.data(),id:d.id})); },()=>{});
    return unsub;
  },[user?.id]);

  function handleLogin(u) {
    setUser(u);
    if (u.tipo==="aluno") setTab("painel-aluno");
  }

  function handleEscolha(m) {
    setModo(m);
    setTab(m==="casal" ? "inicio-casal" : "painel");
  }

  function handleLogout() { setUser(null); setModo(null); setTab(null); }

  if (!user) return <Login onLogin={handleLogin}/>;

  if (user.tipo === "aluno") {
    return (
      <div>
        <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} modo="aluno" notifProps={notifProps}/>
        <div className="header-mobile">
          <div className="header-mobile-logo">Meu Espaço</div>
          <button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button>
        </div>
        <div className="main-content">
          {tab==="painel-aluno"      && <PainelAluno user={user}/>}
          {tab==="ferramentas-aluno" && <EmBreve titulo="Ferramentas Clínicas" sub="Recursos de supervisão."/>}
          {tab==="relatorios-aluno"  && <EmBreve titulo="Relatórios de Supervisão" sub="Em construção."/>}
        </div>
        <div className="nav-mobile">
          {NAV_ALUNO.slice(0,5).map(item=>(
            <button key={item.id} className={`nav-mobile-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
              <Icon name={item.icon} size={20}/><span>{item.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Paciente — mostra seletor se ainda não escolheu
  if (user.tipo === "paciente" && !modo) {
    return <SeletorModo user={user} onEscolha={handleEscolha}/>;
  }

  const eCasal = modo === "casal";
  const navBase = eCasal ? NAV_CASAL : NAV_INDIVIDUAL;

  function navFiltradoCasal(nav, user) {
    const mod5 = user.modulosConfig?.mod5;
    if (!mod5?.ativo) return nav.filter(i => ["inicio-casal","minha-conta"].includes(i.id));
    const ferrAtivas = mod5.ferramentas || {};

    // Monta lista de etapas ativas — aceita tanto ID exato quanto ID do Firestore
    // O admin salva dataInicio junto quando ativa, então verifica se tem valor
    const etapasAtivas = new Set();
    Object.entries(ferrAtivas).forEach(([k,v]) => {
      if (!v || v === null) return;
      // Se a chave é exatamente etapa1-casal, etapa2-casal, etc.
      if (k.startsWith("etapa") && k.includes("casal")) {
        if (v?.ativo) etapasAtivas.add(k);
      } else {
        // ID aleatório do Firestore — usa o nome ou ordem para mapear
        // Verifica pelo índice: primeira ferramenta = etapa1, segunda = etapa2, etc.
        if (v?.ativo || v?.dataInicio) {
          const chaves = Object.keys(ferrAtivas);
          const idx = chaves.indexOf(k);
          if (idx >= 0) etapasAtivas.add(`etapa${idx+1}-casal`);
        }
      }
    });

    return nav.filter(item => {
      if (["inicio-casal","minha-conta","diagnostico-casal"].includes(item.id)) return true;
      return etapasAtivas.has(item.id);
    });
  }

  const navFinal = eCasal ? navFiltradoCasal(navBase, user) : navFiltradoPaciente(navBase, user);
  const navMobile = navFinal.slice(0,5);

  return (
    <div>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} modo={modo}
        nav={navFinal}
        notifProps={notifProps}
        onTrocarModo={user.casalId && (user.modulosAtivos||[]).length>0 ? ()=>{setModo(null);setTab(null);} : null}/>

      <div className="header-mobile">
        <div className="header-mobile-logo">{eCasal?"Terapia de Casal":"Meu Espaço"}</div>
        <button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button>
      </div>

      <div className="main-content">
        {/* INDIVIDUAL */}
        {!eCasal&&tab==="painel"        &&<PainelIndividual user={user} setTab={setTab}/>}
        {!eCasal&&tab==="humor"         &&<RegistroHumor user={user}/>}
        {/* tcc e reflexoes agora estão em Recursos Terapêuticos */}
        {!eCasal&&tab==="diario"        &&<FerramentaDiario user={user}/>}
        {!eCasal&&tab==="metas"         &&<MinhasMetas user={user}/>}
        {!eCasal&&tab==="ferramentas"   &&<RecursosPaciente user={user} setTab={setTab}/>}
        {!eCasal&&tab==="fabulas"       &&<RecursosPaciente user={user} setTab={setTab} abaInicial="fabulas"/>}
        {!eCasal&&tab==="reflexoes"     &&<EmBreve titulo="Reflexões Cognitivas" sub="Exercícios de insight."/>}
        {!eCasal&&tab==="ansiedade"     &&<EmBreve titulo="Gestão da Ansiedade" sub="Tracking de estresse, pensamentos e roda da vida."/>}
        {!eCasal&&tab==="musicoterapia" &&<EmBreve titulo="Musicoterapia" sub="Recursos de musicoterapia clínica."/>}
        {!eCasal&&tab==="meus-laudos"   &&<EmBreve titulo="Meus Laudos"/>}
        {!eCasal&&tab==="minha-conta"   &&<MinhaConta user={user}/>}

        {/* CASAL */}
        {eCasal&&tab==="inicio-casal"      &&<PainelCasal user={user}/>}
        {eCasal&&tab==="diagnostico-casal" &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[0]}/>}
        {eCasal&&tab==="etapa1-casal"      &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[1]}/>}
        {eCasal&&tab==="etapa2-casal"      &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[2]}/>}
        {eCasal&&tab==="etapa3-casal"      &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[3]}/>}
        {eCasal&&tab==="etapa4-casal"      &&<EtapaCasal user={user} etapaData={PROTOCOLO_CASAIS[4]}/>}
        {eCasal&&tab==="minha-conta"       &&<MinhaConta user={user}/>}
      </div>

      <div className="nav-mobile">
        {navMobile.map(item=>(
          <button key={item.id} className={`nav-mobile-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
            <Icon name={item.icon} size={20}/><span>{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
