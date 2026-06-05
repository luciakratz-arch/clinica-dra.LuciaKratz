// ferramentas.js — Módulo de Ferramentas Clínicas e Psicoeducação
// Clínica Dra. Lucia Kratz — CRP 09/20590
// Depende de: firebase (db), React (useState/useEffect), Icon, falarTexto
// Carregar APÓS app.js no index.html

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
function PsicoAlarme({cat}){
  const COR="#7B00C4"; const BG="#f3e6ff";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Você consegue identificar situações recentes em que seu alarme disparou sem perigo real?",
    "Que situações do dia a dia o seu cérebro trata como se fossem ameaças?",
    "Como você costuma reagir quando o alarme dispara? Luta, foge ou congela?",
  ];
  function enviarWhatsApp(){
    const tel = (cat&&cat.telefone||"").replace(/\D/g,"");
    const texto = "Reflexões — O Alarme Falso do Cérebro:\n\n" +
      PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"—"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🧠</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>O seu cérebro tem um alarme — e ele dispara mais do que deveria</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>A amígdala não distingue um leão de uma apresentação no trabalho.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>🔔 O que é a amígdala?</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.7}}>É uma estrutura cerebral antiga, rápida e poderosa cuja função é simples: manter você vivo. Quando percebe qualquer sinal de perigo, dispara o alarme antes mesmo que você pense conscientemente sobre o que está acontecendo.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#3d006a",fontStyle:"italic",fontWeight:500}}>O problema? Ela não distingue um leão de uma crítica no trabalho.</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:10}}>⚡ Quando o alarme dispara, em milissegundos...</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {e:"❤️",t:"Coração acelera",d:"Para bombear sangue aos músculos — prontos para correr ou lutar"},
            {e:"💨",t:"Respiração fica rápida",d:"Para captar mais oxigênio e alimentar a ação"},
            {e:"💪",t:"Músculos tensionam",d:"Preparando o corpo para movimento imediato"},
            {e:"🍃",t:"Digestão para",d:"O estômago aperta — não é prioridade numa emergência"},
            {e:"👁️",t:"Foco estreita",d:"A visão periférica diminui — tudo foca na ameaça percebida"},
          ].map(({e,t,d})=>(
            <div key={t} style={{display:"flex",alignItems:"flex-start",gap:10,background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px"}}>
              <span style={{fontSize:18,flexShrink:0}}>{e}</span>
              <div>
                <div style={{color:"#f3e6ff",fontSize:12,fontWeight:600}}>{t}</div>
                <div style={{color:"#d9b3f5",fontSize:11,marginTop:2}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>⚖️ Para o que foi criado vs. o que dispara hoje</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:"#fee2e2",borderRadius:10,padding:"12px"}}>
            <div style={{color:"#dc2626",fontWeight:700,fontSize:12,marginBottom:6}}>🦁 Para o que foi criado</div>
            {["Predadores reais","Ameaças físicas","Perigos de vida ou morte","Soluções físicas imediatas"].map(i=>(
              <div key={i} style={{fontSize:11,color:"#7f1d1d",marginBottom:3}}>• {i}</div>
            ))}
          </div>
          <div style={{background:"#fef3c7",borderRadius:10,padding:"12px"}}>
            <div style={{color:"#d97706",fontWeight:700,fontSize:12,marginBottom:6}}>📧 Para o que dispara hoje</div>
            {["E-mails não respondidos","Conflitos no trabalho","Incerteza sobre o futuro","Críticas e julgamentos"].map(i=>(
              <div key={i} style={{fontSize:11,color:"#78350f",marginBottom:3}}>• {i}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"#f3e6ff",padding:"14px 20px",borderBottom:"1px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>💡 O insight que muda tudo</div>
        <div style={{fontSize:12,color:"#3d006a",lineHeight:1.7}}>A ansiedade não é fraqueza. É um sistema de proteção disparando fora do contexto certo. Quando você entende isso, muda a relação com os sintomas — em vez de lutar contra o alarme com pânico, começa a reconhecê-lo: <em>"Meu sistema de segurança está ativo. O que está interpretando como ameaça?"</em></div>
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#3d006a",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexões</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#3d006a",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexão..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexões pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

// ── macro_ansiedade: novos componentes ───────────────────────────────────────

function PsicoPensamentosSaoEventos({cat}){
  const COR="#7B00C4"; const BG="#f3e6ff";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Que pensamento recorrente você tem e que talvez esteja tratando como facto?",
    "Se separasse o facto da interpretação numa situação recente, o que mudaria?",
    "O que aconteceria se você observasse esse pensamento como uma nuvem passando — sem lutar contra ele?",
  ];
  function enviarWhatsApp(){
    const tel = (cat&&cat.telefone||"").replace(/\D/g,"");
    const texto = "Reflexões — Pensamentos São Eventos, Não Factos:\n\n" +
      PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"—"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>💭</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>Você não é seus pensamentos — você é quem os observa</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>Pensar algo não torna aquilo verdade. Pensamentos são eventos mentais, como nuvens passando.</div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>🌊 O que é um pensamento?</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.7}}>A nossa mente produz cerca de 60.000 pensamentos por dia. A maioria passa sem ser notada. O problema começa quando acreditamos que todo pensamento é verdade — como se pensar algo fosse prova de que é real.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#3d006a",fontStyle:"italic",fontWeight:500}}>Pensar "Sou um fracasso" não me torna um fracasso. É apenas um evento mental, como uma nuvem passando.</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:10}}>⚖️ Facto vs. interpretação — a diferença que muda tudo</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"12px"}}>
            <div style={{color:"#86efac",fontWeight:700,fontSize:12,marginBottom:6}}>📌 Facto</div>
            {["Ela não respondeu minha mensagem","A reunião foi adiada","Cometi um erro no relatório","Fiquei em silêncio na reunião"].map(i=>(
              <div key={i} style={{fontSize:11,color:"#f3e6ff",marginBottom:3,padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>{i}</div>
            ))}
          </div>
          <div style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"12px"}}>
            <div style={{color:"#fca5a5",fontWeight:700,fontSize:12,marginBottom:6}}>🔮 Interpretação</div>
            {["Ela está com raiva de mim","Não valorizam meu trabalho","Sou incompetente","As pessoas me julgaram"].map(i=>(
              <div key={i} style={{fontSize:11,color:"#f3e6ff",marginBottom:3,padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>{i}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>🧘 Defusão cognitiva — criar distância do pensamento</div>
        {[
          {e:"👁️",t:"Nomeie o pensamento",d:"Em vez de 'Sou um fracasso', diga: 'Estou tendo o pensamento de que sou um fracasso'"},
          {e:"🍃",t:"Deixe passar",d:"Visualize o pensamento como uma folha num rio — observe-o fluir sem segurá-lo"},
          {e:"❓",t:"Questione a evidência",d:"'O que prova que esse pensamento é 100% verdade? E o que contradiz?'"},
          {e:"🔄",t:"Gere alternativas",d:"'Que outro pensamento seria igualmente plausível sobre esta situação?'"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #e8c8ff"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#3d006a",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#5a0090",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:"#f3e6ff",padding:"14px 20px",borderBottom:"1px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>💡 A virada</div>
        <div style={{fontSize:12,color:"#3d006a",lineHeight:1.7}}>Você não é seus pensamentos. Você é quem os observa. Essa distinção simples é a base de toda mudança cognitiva. Quando você observa um pensamento em vez de ser ele, recupera o poder de escolher como reagir. 💜</div>
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#3d006a",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexões</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#3d006a",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexão..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexões pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoCurvaPanico({cat}){
  const COR="#7B00C4"; const BG="#f3e6ff";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Em um ataque de pânico, qual é o pensamento que mais te assusta no momento em que os sintomas aparecem?",
    "Sabendo que o pânico tem pico e desce naturalmente, o que muda na sua forma de encarar os sintomas?",
    "Que estratégia você pode usar nos primeiros minutos para não alimentar o ciclo do pânico?",
  ];
  function enviarWhatsApp(){
    const tel = (cat&&cat.telefone||"").replace(/\D/g,"");
    const texto = "Reflexões — A Curva do Pânico:\n\n" +
      PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"—"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>📈</div>
        <div style={{color:"#f3e6ff",fontSize:16,fontWeight:500,marginBottom:6}}>O pânico atinge o pico — e desce naturalmente</div>
        <div style={{color:"#d9b3f5",fontSize:13,lineHeight:1.5}}>O maior medo de quem passa por pânico é que não vai parar. A neurociência mostra que sempre para.</div>
      </div>

      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>🧠 O que a neurociência diz</div>
        <div style={{fontSize:12,color:"#5a0090",lineHeight:1.7}}>Um dos maiores medos de quem experiencia ataques de pânico é acreditar que vai continuar a crescer indefinidamente — que o coração vai continuar a acelerar até parar, que o descontrolo vai aumentar até à loucura.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#3d006a",fontStyle:"italic",fontWeight:500}}>Isso não acontece. O pânico segue sempre uma curva previsível — e o seu corpo sabe como descer.</div>
        </div>
      </div>

      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #9a00e0"}}>
        <div style={{color:"#f3e6ff",fontSize:13,fontWeight:500,marginBottom:10}}>📊 As 3 fases da curva</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            {n:"1",fase:"Ativação",t:"0–3 min",desc:"O sistema nervoso simpático dispara. O coração acelera, a respiração fica curta, os músculos tensionam. O corpo entra em modo de emergência.",cor:"#fca5a5"},
            {n:"2",fase:"Pico",t:"3–10 min",desc:"A intensidade atinge o máximo — geralmente entre 3 e 10 minutos após o início. Este é o momento mais assustador, mas também o ponto de virada.",cor:"#fde68a"},
            {n:"3",fase:"Descida",t:"10–30 min",desc:"O sistema parassimpático assume. O cortisol e a adrenalina são metabolizados. O corpo começa a se acalmar — inevitavelmente.",cor:"#86efac"},
          ].map(({n,fase,t,desc,cor})=>(
            <div key={fase} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#1a001a",flexShrink:0}}>{n}</div>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{color:"#f3e6ff",fontSize:13,fontWeight:600}}>{fase}</span>
                  <span style={{background:"rgba(255,255,255,0.15)",color:cor,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:10}}>{t}</span>
                </div>
                <div style={{color:"#d9b3f5",fontSize:11,lineHeight:1.6}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:"#f9f0ff",padding:"16px 20px",borderBottom:"1px solid #e8c8ff"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>⚠️ O que alimenta o ciclo — e o que quebra</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:"#fee2e2",borderRadius:10,padding:"12px"}}>
            <div style={{color:"#dc2626",fontWeight:700,fontSize:12,marginBottom:6}}>🔁 Alimenta o pânico</div>
            {["'Não vai parar'","Lutar contra os sintomas","Fugir da situação","Checar o coração com medo","Respiração hiperventilada"].map(i=>(
              <div key={i} style={{fontSize:11,color:"#7f1d1d",marginBottom:3}}>• {i}</div>
            ))}
          </div>
          <div style={{background:"#dcfce7",borderRadius:10,padding:"12px"}}>
            <div style={{color:"#16a34a",fontWeight:700,fontSize:12,marginBottom:6}}>✅ Quebra o ciclo</div>
            {["'Já passou antes, vai passar'","Observar sem lutar","Permanecer e atravessar","Respiração lenta e profunda","Nomear o que está sentindo"].map(i=>(
              <div key={i} style={{fontSize:11,color:"#14532d",marginBottom:3}}>• {i}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:"#f3e6ff",padding:"14px 20px",borderBottom:"1px solid #d9b3f5"}}>
        <div style={{color:"#5a0090",fontSize:13,fontWeight:500,marginBottom:6}}>💡 A frase que muda tudo</div>
        <div style={{fontSize:12,color:"#3d006a",lineHeight:1.7}}>Quando o pânico aparece, o cérebro grita <em>"isso não vai parar"</em>. Mas o seu histórico prova o contrário: <strong>sempre parou</strong>. Saber disso não elimina o medo — mas cria uma âncora de realidade no momento mais difícil. A curva sempre desce. 💜</div>
      </div>

      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#3d006a",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexões</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#3d006a",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexão..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexões pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
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
  const COR="#d97706"; const BG="#fef3c7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Quando você e seu parceiro(a) discutem sobre dinheiro, o que você está sentindo por baixo — segurança, controle, respeito?",
    "Como o dinheiro era tratado na sua família de origem? Que crença você herdou sobre ele?",
    "Existe um objetivo financeiro comum que vocês ainda não colocaram no papel e que poderia unir em vez de dividir?",
  ];
  function enviarWhatsApp(){
    const tel = (cat&&cat.telefone||"").replace(/\D/g,"");
    const texto = "Reflexões sobre Dinheiro e Relacionamento:\n\n" +
      PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"—"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>💰</div>
        <div style={{color:"#fff7ed",fontSize:16,fontWeight:500,marginBottom:6}}>Por que brigamos sobre dinheiro?</div>
        <div style={{color:"#fed7aa",fontSize:13,lineHeight:1.5}}>Quase nunca é sobre o dinheiro em si — é sobre o que ele representa.</div>
      </div>

      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>O dinheiro como campo de batalha simbólico</div>
        <div style={{fontSize:12,color:"#92400e",lineHeight:1.7}}>
          Casais brigam sobre dinheiro com uma intensidade que vai muito além dos números. A conta que não foi paga, o gasto que não foi consultado — raramente são sobre o valor em si. São sobre <strong>controle, segurança, respeito e poder</strong>.
        </div>
        <div style={{background:BG,borderRadius:10,padding:"10px 14px",marginTop:10,borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#78350f",fontStyle:"italic"}}>Quando a briga é sobre dinheiro, a pergunta real é: "Você me respeita? Você me protege? Você me vê?"</div>
        </div>
      </div>

      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #b45309"}}>
        <div style={{color:"#fff7ed",fontSize:13,fontWeight:500,marginBottom:10}}>O que dizemos vs. o que sentimos</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {t:"O que dizemos",itens:["'Você gasta demais'","'Nunca decidimos juntos'","'Você é controlador(a)'","'Não sobra nada'"],bg:"rgba(255,255,255,0.12)",c:"#fed7aa"},
            {t:"O que sentimos",itens:["'Não me sinto seguro(a)'","'Não tenho voz aqui'","'Não confio em você'","'Tenho medo do futuro'"],bg:"rgba(255,255,255,0.2)",c:"#fef3c7"},
          ].map(({t,itens,bg,c})=>(
            <div key={t} style={{background:bg,borderRadius:10,padding:"10px 12px"}}>
              <div style={{color:c,fontSize:11,fontWeight:600,marginBottom:6}}>{t}</div>
              {itens.map(i=><div key={i} style={{color:"#fff7ed",fontSize:11,padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>{i}</div>)}
            </div>
          ))}
        </div>
      </div>

      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>De onde vêm as crenças sobre dinheiro?</div>
        {[
          {e:"👨‍👩‍👧",t:"Família de origem",d:"Quem controlava o dinheiro em casa? Era tabu? Havia escassez ou abundância?"},
          {e:"🧠",t:"Crenças formadas",d:"'Dinheiro é fonte de conflito', 'Quem ganha mais manda', 'Poupar é obrigação'"},
          {e:"😰",t:"Gatilhos emocionais",d:"Ver o saldo baixar pode ativar um medo primitivo de sobrevivência"},
          {e:"🔄",t:"Padrões repetidos",d:"Casais reencenam dinâmicas financeiras que viram nos pais"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fed7aa"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#78350f",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#92400e",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:COR,padding:"14px 20px",borderBottom:"1px solid #b45309"}}>
        <div style={{color:"#fff7ed",fontSize:13,fontWeight:500,marginBottom:8}}>Como conversar sobre dinheiro de verdade</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            ["🕐","Escolha o momento","Nunca quando exaustos. Agende uma conversa financeira semanal"],
            ["🎯","Separe fato de sentimento","'O saldo caiu' (fato) → 'Estou preocupado(a) com nossa segurança' (sentimento)"],
            ["🌱","Explore as origens","'O que o dinheiro representa pra você? Como era na sua família?'"],
            ["🤝","Construam projeto comum","Objetivos compartilhados transformam o dinheiro de campo de batalha em aliado"],
          ].map(([e,t,d])=>(
            <div key={t} style={{display:"flex",gap:8,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 10px"}}>
              <span style={{fontSize:16,flexShrink:0}}>{e}</span>
              <div>
                <div style={{color:"#fff7ed",fontSize:12,fontWeight:500,marginBottom:1}}>{t}</div>
                <div style={{color:"#fed7aa",fontSize:11,lineHeight:1.4}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:"#fff7ed",padding:"14px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:6}}>💡 Para lembrar</div>
        <div style={{fontSize:12,color:"#78350f",lineHeight:1.7}}>O dinheiro não divide casais — a falta de conversa honesta sobre o que ele <em>representa</em> é que divide. Quando dois parceiros conseguem falar sobre o medo por trás das contas, a conversa financeira deixa de ser uma batalha e se torna um ato de intimidade. 💜</div>
      </div>

      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#78350f",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexões</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#78350f",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexão..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexões pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoFusaoCasal({ cat }){
  const COR="#EC4899"; const BG="#fdf2f8";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Existe algum interesse, amizade ou parte de você que foi diminuindo desde que está nessa relação?",
    "Você consegue expressar discordâncias com seu parceiro(a) sem sentir que ameaça a relação?",
    "O que você faria diferente se soubesse que manter sua individualidade fortalece — e não ameaça — o amor?",
  ];
  function enviarWhatsApp(){
    const tel = (cat&&cat.telefone||"").replace(/\D/g,"");
    const texto = "Reflexões — Amor ou Fusão:\n\n" +
      PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"—"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔗</div>
        <div style={{color:"#fff0f6",fontSize:16,fontWeight:500,marginBottom:6}}>Amor ou fusão?</div>
        <div style={{color:"#fce7f3",fontSize:13,lineHeight:1.5}}>Você não pode amar bem alguém se perdeu a si mesmo.</div>
      </div>

      <div style={{background:"#fff0f6",padding:"16px 20px",borderBottom:"1px solid #fce7f3"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que é fusão?</div>
        <div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>
          No início, a fusão parece amor profundo: querer estar sempre juntos, pensar no outro o tempo todo, abrir mão das próprias preferências. Mas com o tempo, o que parecia intimidade se torna sufocamento — e o que parecia cuidado se torna dependência.
        </div>
        <div style={{background:BG,borderRadius:10,padding:"10px 14px",marginTop:10,borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#831843",fontStyle:"italic"}}>O amor saudável acontece entre dois inteiros — não entre duas metades.</div>
        </div>
      </div>

      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}>
        <div style={{color:"#fff0f6",fontSize:13,fontWeight:500,marginBottom:10}}>Fusão vs. Intimidade</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {t:"Fusão ⚠️",itens:["'Somos um só'","Abandona hobbies","Ansiedade ao se separar","Identidade depende do outro","Ciúme como 'prova de amor'"],bg:"rgba(220,38,38,0.2)",c:"#fce7f3"},
            {t:"Intimidade ✅",itens:["'Somos dois que escolhem'","Mantém vida própria","Conforto na separação","Identidade estável","Confiança sem controle"],bg:"rgba(255,255,255,0.15)",c:"#fff0f6"},
          ].map(({t,itens,bg,c})=>(
            <div key={t} style={{background:bg,borderRadius:10,padding:"10px 12px"}}>
              <div style={{color:c,fontSize:11,fontWeight:600,marginBottom:6}}>{t}</div>
              {itens.map(i=><div key={i} style={{color:"#fce7f3",fontSize:11,padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>{i}</div>)}
            </div>
          ))}
        </div>
      </div>

      <div style={{background:"#fff0f6",padding:"16px 20px",borderBottom:"1px solid #fce7f3"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como cultivar individualidade dentro do casal</div>
        {[
          {e:"🎯",t:"Mantenha seus interesses",d:"Hobbies, amizades e objetivos individuais não ameaçam o casal — o nutrem"},
          {e:"🗣️",t:"Expresse discordâncias",d:"Sempre concordar não é harmonia — é apagamento. Divergir com respeito é intimidade real"},
          {e:"⏱️",t:"Valorize o tempo sozinho",d:"Estar bem consigo mesmo é pré-requisito para estar bem com o outro"},
          {e:"🪞",t:"Pergunte-se regularmente",d:"'O que eu penso? O que eu quero?' — independente do que o parceiro pensa e quer"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fce7f3"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff0f6",padding:"14px 20px",borderBottom:"1px solid #fce7f3"}}>
        <div style={{color:COR,fontSize:12,lineHeight:1.7}}>🦋 <em>Um relacionamento saudável é como dois rios que correm lado a lado — próximos, mas com suas próprias margens. Quando correm paralelos, cada um mantém sua força — e juntos, criam algo maior.</em></div>
      </div>

      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexões</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexão..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexões pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoTriangulacao({ cat }){
  const COR="#0891b2"; const BG="#e0f2fe";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Existe alguém que você tem envolvido nos conflitos do seu relacionamento? O que isso diz sobre o que você evita dizer diretamente?",
    "Quando sente tensão no casal, qual é o seu impulso — confrontar diretamente ou buscar apoio externo?",
    "O que tornaria mais seguro ter conversas difíceis diretamente com seu parceiro(a)?",
  ];
  function enviarWhatsApp(){
    const tel = (cat&&cat.telefone||"").replace(/\D/g,"");
    const texto = "Reflexões — Triangulação no Casal:\n\n" +
      PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"—"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔺</div>
        <div style={{color:"#e0f2fe",fontSize:16,fontWeight:500,marginBottom:6}}>O triângulo invisível</div>
        <div style={{color:"#bae6fd",fontSize:13,lineHeight:1.5}}>Por que envolvemos terceiros para evitar conversas difíceis.</div>
      </div>

      <div style={{background:"#f0f9ff",padding:"16px 20px",borderBottom:"1px solid #bae6fd"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que é triangulação?</div>
        <div style={{fontSize:12,color:"#0c4a6e",lineHeight:1.7}}>
          Quando um conflito fica tenso demais, a mente busca uma saída: envolver uma terceira pessoa — um filho, um amigo, a sogra. Qualquer um que alivie a tensão direta. Mas isso impede que o conflito real seja resolvido.
        </div>
        <div style={{background:BG,borderRadius:10,padding:"10px 14px",marginTop:10,borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#0c4a6e",fontStyle:"italic"}}>A triangulação alivia a tensão imediata mas enterra o problema — até ele explodir de outra forma.</div>
        </div>
      </div>

      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #0369a1"}}>
        <div style={{color:"#e0f2fe",fontSize:13,fontWeight:500,marginBottom:10}}>Formas comuns de triangulação</div>
        {[
          {e:"👶",t:"Usar os filhos",d:"Passar recados, fazer a criança escolher lados, desabafar sobre o cônjuge"},
          {e:"👩‍👦",t:"Envolver a família",d:"'Minha mãe também acha que você está errado(a)' — buscar aliados fora"},
          {e:"👫",t:"Desabafar demais com amigos",d:"O amigo vira árbitro involuntário do conflito do casal"},
          {e:"📱",t:"Ciúme como triangulação",d:"Introduzir uma ameaça para provocar reação emocional no parceiro"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:8,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
            <span style={{fontSize:18,flexShrink:0}}>{e}</span>
            <div>
              <div style={{color:"#e0f2fe",fontSize:12,fontWeight:500,marginBottom:1}}>{t}</div>
              <div style={{color:"#bae6fd",fontSize:11,lineHeight:1.4}}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#f0f9ff",padding:"16px 20px",borderBottom:"1px solid #bae6fd"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como sair do triângulo</div>
        {[
          {e:"🎯",t:"Identifique o que evita",d:"Medo de rejeição, conflito direto, vulnerabilidade — nomeie o que a triangulação serve para esconder"},
          {e:"🗣️",t:"Volte ao par",d:"'Preciso conversar com você sobre algo que me incomoda' — direto, sem intermediários"},
          {e:"🔒",t:"Proteja a privacidade do casal",d:"Conflitos de casal resolvem-se dentro do casal. Compartilhar com terceiros corrói a confiança"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #bae6fd"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#0c4a6e",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#075985",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#f0f9ff",padding:"14px 20px",borderBottom:"1px solid #bae6fd"}}>
        <div style={{color:COR,fontSize:12,lineHeight:1.7}}>💬 <em>Toda triangulação é um pedido de conversa que ainda não teve coragem de acontecer. O que você precisa dizer diretamente ao seu parceiro(a) que ainda não disse?</em></div>
      </div>

      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#0c4a6e",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexões</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#0c4a6e",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexão..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexões pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoPaisPerfeitos({ cat }){
  const COR="#EC4899"; const BG="#fdf2f8";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Em que aspecto da parentalidade você se cobra mais? Essa cobrança está te aproximando ou te afastando dos seus filhos?",
    "Lembra de um momento em que você 'errou' como pai/mãe e depois reparou? Como a criança respondeu?",
    "Como seria dar a si mesmo(a) a mesma compaixão que daria a um(a) amigo(a) que estivesse passando pelo mesmo?",
  ];
  function enviarWhatsApp(){
    const tel = (cat&&cat.telefone||"").replace(/\D/g,"");
    const texto = "Reflexões — O Mito do Pai/Mãe Perfeito:\n\n" +
      PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"—"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>👨‍👩‍👧</div>
        <div style={{color:"#fff0f6",fontSize:16,fontWeight:500,marginBottom:6}}>O mito do pai/mãe perfeito</div>
        <div style={{color:"#fce7f3",fontSize:13,lineHeight:1.5}}>Nunca houve tantas informações sobre parentalidade — e tanta culpa.</div>
      </div>

      <div style={{background:"#fff0f6",padding:"16px 20px",borderBottom:"1px solid #fce7f3"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O ideal impossível</div>
        <div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>
          O excesso de informação criou um ideal impossível: o pai/mãe perfeitamente presente, paciente, estimulante, gentil e realizado. Quem não alcança esse ideal sente que está falhando — e esse sentimento <strong>adoece</strong>.
        </div>
        <div style={{background:BG,borderRadius:10,padding:"10px 14px",marginTop:10,borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#831843",fontStyle:"italic"}}>O perfeccionismo parental não protege os filhos — mas adoece os pais e, indiretamente, as crianças.</div>
        </div>
      </div>

      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}>
        <div style={{color:"#fff0f6",fontSize:13,fontWeight:500,marginBottom:10}}>O custo do perfeccionismo parental</div>
        {[
          {e:"😰",t:"Ansiedade crônica",d:"Monitoramento constante com culpa automática a cada erro"},
          {e:"😤",t:"Irritabilidade aumentada",d:"A pressão de ser sempre paciente cria um cansaço que explode nos momentos errados"},
          {e:"💔",t:"Modelagem do perfeccionismo",d:"Pais que não toleram seus erros ensinam o mesmo às crianças"},
          {e:"🚪",t:"Distância emocional",d:"Pais exaustos ficam menos presentes do que pais que se permitem ser humanos"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:8,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
            <span style={{fontSize:18,flexShrink:0}}>{e}</span>
            <div>
              <div style={{color:"#fff0f6",fontSize:12,fontWeight:500,marginBottom:1}}>{t}</div>
              <div style={{color:"#fce7f3",fontSize:11,lineHeight:1.4}}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff0f6",padding:"16px 20px",borderBottom:"1px solid #fce7f3"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>O que as crianças realmente precisam</div>
        {[
          {e:"🔄",t:"Reparação, não perfeição",d:"O que forma o apego seguro não é nunca errar — é reparar quando erra. 'Me desculpe, errei'"},
          {e:"🎭",t:"Emoções autênticas",d:"Ver o pai/mãe lidar com frustração de forma humana ensina regulação emocional"},
          {e:"⏱️",t:"Presença qualitativa",d:"20 minutos de presença real valem mais do que 3 horas de presença física no celular"},
          {e:"🌿",t:"Pais que se cuidam",d:"Um pai/mãe descansado é mais disponível do que um exausto e culpado"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fce7f3"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff0f6",padding:"14px 20px",borderBottom:"1px solid #fce7f3"}}>
        <div style={{color:COR,fontSize:12,lineHeight:1.7}}>💛 <em>Winnicott estava certo: 'suficientemente bom(a)' é exatamente o que uma criança precisa para crescer segura. Você não precisa ser perfeito(a) para ser o(a) pai/mãe que seu filho(a) precisa.</em></div>
      </div>

      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexões</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexão..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexões pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

function PsicoDesejoAdormece({ cat }){
  const COR="#EC4899"; const BG="#fdf2f8";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "O que você sente quando pensa na diminuição do desejo na sua relação — culpa, tristeza, resignação?",
    "Existe algum conflito emocional não resolvido que pode estar criando distância física também?",
    "O que vocês faziam no início da relação que criava conexão e que pararam de fazer?",
  ];
  function enviarWhatsApp(){
    const tel = (cat&&cat.telefone||"").replace(/\D/g,"");
    const texto = "Reflexões — O Desejo Não Desaparece, Adormece:\n\n" +
      PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"—"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔥</div>
        <div style={{color:"#fff0f6",fontSize:16,fontWeight:500,marginBottom:6}}>O desejo não desaparece — adormece</div>
        <div style={{color:"#fce7f3",fontSize:13,lineHeight:1.5}}>A queda do desejo raramente significa falta de amor.</div>
      </div>

      <div style={{background:"#fff0f6",padding:"16px 20px",borderBottom:"1px solid #fce7f3"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que acontece com o desejo no longo prazo</div>
        <div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>
          Em quase todos os relacionamentos longos, chega um momento em que o desejo sexual diminui. Isso é tão comum que pesquisadores o consideram quase universal. Mas culturalmente tratamos como sinal de que algo está errado — quando quase sempre sinaliza algo que precisa de atenção, não o fim.
        </div>
        <div style={{background:BG,borderRadius:10,padding:"10px 14px",marginTop:10,borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#831843",fontStyle:"italic"}}>A queda do desejo raramente significa falta de amor. Quase sempre sinaliza algo que precisa de atenção.</div>
        </div>
      </div>

      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}>
        <div style={{color:"#fff0f6",fontSize:13,fontWeight:500,marginBottom:10}}>Por que o desejo adormece</div>
        {[
          {e:"🧠",t:"Neurobiologia",d:"A dopamina da novidade diminui com a familiaridade — é fisiológico, não é falta de amor"},
          {e:"😤",t:"Conflitos não resolvidos",d:"Ressentimentos acumulados criam uma barreira emocional que bloqueia a proximidade física"},
          {e:"🪫",t:"Exaustão e sobrecarga",d:"Filhos, trabalho, finanças — quando a energia está no mínimo, o desejo vai junto"},
          {e:"🔄",t:"Rotina excessiva",d:"Previsibilidade total é confortável — mas não é excitante. O desejo precisa de alguma surpresa"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:8,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 10px",marginBottom:6}}>
            <span style={{fontSize:18,flexShrink:0}}>{e}</span>
            <div>
              <div style={{color:"#fff0f6",fontSize:12,fontWeight:500,marginBottom:1}}>{t}</div>
              <div style={{color:"#fce7f3",fontSize:11,lineHeight:1.4}}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff0f6",padding:"16px 20px",borderBottom:"1px solid #fce7f3"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como despertar o que adormeceu</div>
        {[
          {e:"💬",t:"Conversa honesta",d:"Falar sobre o desejo (ou a falta dele) sem acusação é um dos maiores atos de intimidade possíveis"},
          {e:"🆕",t:"Introduzir novidade",d:"Experiências novas juntos — viagens, atividades diferentes — reativam dopamina"},
          {e:"🤝",t:"Resolver o que ficou pendente",d:"Às vezes o bloqueio é emocional. Resolver um conflito antigo pode desbloquear o desejo físico"},
          {e:"🧰",t:"Buscar apoio especializado",d:"Terapia de casal ou sexual não é sinal de fracasso — é investimento num aspecto vital da relação"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fce7f3"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff0f6",padding:"14px 20px",borderBottom:"1px solid #fce7f3"}}>
        <div style={{color:COR,fontSize:12,lineHeight:1.7}}>💛 <em>O desejo não some — ele vai para onde há espaço, cuidado e conexão emocional. Em casais que mantêm o desejo ao longo do tempo, o denominador comum é a disposição de continuar se escolhendo ativamente.</em></div>
      </div>

      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexões</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexão..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexões pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicóloga · CRP 09/20590</div>
    </div>
  );
}

// ── macro_relacionamentos ─────────────────────────────────────────────────────

function PsicoOuvirCompetencia({cat}){
  const COR="#d97706"; const BG="#fef3c7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Numa conversa recente, voce estava realmente ouvindo ou ja preparando sua resposta?",
    "O que costuma te impedir de ouvir de verdade — pressa, julgamento, necessidade de resolver?",
    "Como seria uma conversa dificil na sua vida se voce aplicasse escuta ativa de verdade?",
  ];
  function enviarWhatsApp(){
    const tel=(cat&&cat.telefone||"").replace(/\D/g,"");
    const texto="Reflexoes -- Ouvir E Uma Competencia:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>👂</div>
        <div style={{color:"#fff7ed",fontSize:16,fontWeight:500,marginBottom:6}}>Ouvir e uma competencia — e a maioria de nos nao aprendeu</div>
        <div style={{color:"#fed7aa",fontSize:13,lineHeight:1.5}}>Escuta ativa e mais poderosa do que qualquer argumento.</div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que e realmente escutar?</div>
        <div style={{fontSize:12,color:"#92400e",lineHeight:1.7}}>A maioria das pessoas nao ouve para entender — ouve para responder. Enquanto o outro fala, ja estamos formulando nossa resposta, julgando, comparando com nossa experiencia. A escuta real exige suspender tudo isso.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#78350f",fontStyle:"italic",fontWeight:500}}>Sentir-se ouvido e uma das necessidades humanas mais profundas. E raro. E poderoso.</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #b45309"}}>
        <div style={{color:"#fff7ed",fontSize:13,fontWeight:500,marginBottom:10}}>Os 4 niveis de escuta</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {n:"1",t:"Fingir que ouve",d:"Balancando a cabeca mas pensando em outra coisa",c:"#fca5a5"},
            {n:"2",t:"Ouvir seletivamente",d:"So capta o que confirma o que ja pensa",c:"#fde68a"},
            {n:"3",t:"Ouvir atentamente",d:"Presta atencao nas palavras, mas nao no sentimento",c:"#86efac"},
            {n:"4",t:"Escuta empatica",d:"Ouve para entender — palavras, emocao, intencao por tras",c:"#7dd3fc"},
          ].map(({n,t,d,c})=>(
            <div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#1a001a",flexShrink:0}}>{n}</div>
              <div>
                <div style={{color:"#fff7ed",fontSize:12,fontWeight:600}}>{t}</div>
                <div style={{color:"#fed7aa",fontSize:11,marginTop:2}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como praticar escuta ativa</div>
        {[
          {e:"👁️",t:"Contato visual",d:"Olhe para a pessoa, nao para o celular ou ao redor"},
          {e:"🤐",t:"Nao interrompa",d:"Deixe o silencio existir — ele nao precisa ser preenchido"},
          {e:"🔄",t:"Parafrasear",d:"Repita o que entendeu: Se entendi bem, voce esta dizendo..."},
          {e:"❓",t:"Perguntar antes de opinar",d:"Voce quer que eu ajude a resolver ou so quer ser ouvido?"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fed7aa"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#78350f",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#92400e",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#78350f",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexoes</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#78350f",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexao..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexoes pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
    </div>
  );
}

function PsicoPalavrasFerem({cat}){
  const COR="#d97706"; const BG="#fef3c7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Voce consegue identificar uma situacao em que suas palavras feriram mais do que queria — o que estava acontecendo no seu cerebro naquele momento?",
    "Que padrao voce percebe em si mesmo quando esta sob estresse: atacar, calar, ou outro?",
    "Como voce gostaria de reagir na proxima vez que sentir o cerebro sequestrado numa conversa dificil?",
  ];
  function enviarWhatsApp(){
    const tel=(cat&&cat.telefone||"").replace(/\D/g,"");
    const texto="Reflexoes -- Por Que as Nossas Palavras Ferem:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>💬</div>
        <div style={{color:"#fff7ed",fontSize:16,fontWeight:500,marginBottom:6}}>Por que as nossas palavras ferem mais do que queremos?</div>
        <div style={{color:"#fed7aa",fontSize:13,lineHeight:1.5}}>O cerebro sob stress abandona a linguagem empatica e recorre a acusacao automatica.</div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que acontece no cerebro em conflito</div>
        <div style={{fontSize:12,color:"#92400e",lineHeight:1.7}}>Quando nos sentimos ameacados emocionalmente, a amigdala sequestra o cortex pre-frontal — a parte responsavel pela empatia, raciocinio e escolha das palavras. O que sai e reativo, nao refletido.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#78350f",fontStyle:"italic",fontWeight:500}}>Nao e falta de carater — e neurobiologia. Mas entender isso nao nos isenta de aprender a fazer diferente.</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #b45309"}}>
        <div style={{color:"#fff7ed",fontSize:13,fontWeight:500,marginBottom:10}}>O que dizemos vs. o que queremos dizer</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {a:"Voce nunca me ouve",b:"Preciso sentir que importo para voce"},
            {a:"Voce e irresponsavel",b:"Estou com medo e preciso de seguranca"},
            {a:"Sempre e assim com voce",b:"Esse padrao me esgota e precisa mudar"},
            {a:"Esquece, nao adianta",b:"Estou desistindo porque me sinto invisivel"},
          ].map(({a,b})=>(
            <div key={a} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px"}}>
              <div style={{flex:1,fontSize:11,color:"#fde68a"}}>{a}</div>
              <span style={{color:"#86efac",fontWeight:700}}>→</span>
              <div style={{flex:1,fontSize:11,color:"#bbf7d0"}}>{b}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como desacelerar antes de falar</div>
        {[
          {e:"⏸️",t:"Pausa de 6 segundos",d:"O cortisol demora 6s para reduzir o suficiente para voce pensar antes de falar"},
          {e:"🌬️",t:"Uma respiracao profunda",d:"Ativa o sistema parassimpatico e reduz a reatividade da amigdala"},
          {e:"🎯",t:"Pergunte-se",d:"O que eu quero que o outro entenda de verdade?"},
          {e:"📝",t:"Reformule",d:"Troque acusacao por necessidade: de Voce faz X para Eu preciso de Y"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fed7aa"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#78350f",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#92400e",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#78350f",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexoes</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#78350f",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexao..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexoes pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
    </div>
  );
}

function PsicoTangoConflito({cat}){
  const COR="#d97706"; const BG="#fef3c7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Qual e o conflito que se repete na sua vida com mais frequencia — e qual e o padrao por tras dele?",
    "No ciclo de acusacao e defesa, qual e geralmente o seu papel: quem ataca ou quem recua?",
    "O que precisaria mudar na dinamica para o ciclo ser interrompido antes de escalar?",
  ];
  function enviarWhatsApp(){
    const tel=(cat&&cat.telefone||"").replace(/\D/g,"");
    const texto="Reflexoes -- O Tango do Conflito:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🔄</div>
        <div style={{color:"#fff7ed",fontSize:16,fontWeight:500,marginBottom:6}}>Por que discutimos sempre pela mesma razao?</div>
        <div style={{color:"#fed7aa",fontSize:13,lineHeight:1.5}}>Os ciclos de acusacao e defesa se formam — e e possivel criar pontos de saida.</div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O tango leva dois</div>
        <div style={{fontSize:12,color:"#92400e",lineHeight:1.7}}>Conflitos relacionais raramente sao sobre o conteudo da discussao. Sao padroes que se repetem: um ataca, o outro defende ou recua, o primeiro escala, o segundo fecha. Um tango que nenhum dos dois ensaiou conscientemente — mas que ambos sabem dancar.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#78350f",fontStyle:"italic",fontWeight:500}}>Nao e o tema que se repete. E o padrao de interacao que se repete usando temas diferentes.</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #b45309"}}>
        <div style={{color:"#fff7ed",fontSize:13,fontWeight:500,marginBottom:10}}>O ciclo mais comum</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {n:"1",t:"Gatilho",d:"Um evento ativa uma ferida antiga ou necessidade nao atendida"},
            {n:"2",t:"Acusacao",d:"A dor se transforma em ataque: Voce sempre... Voce nunca..."},
            {n:"3",t:"Defesa",d:"O outro sente ameaca e contra-ataca ou recua — nenhum dos dois ouve"},
            {n:"4",t:"Escalada ou silencio",d:"A briga explode ou alguem fecha — o problema original fica sem solucao"},
            {n:"5",t:"Falsa reconciliacao",d:"Fazem as pazes sem falar do real — o ciclo se prepara para recomecar"},
          ].map(({n,t,d})=>(
            <div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:"#fde68a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#78350f",flexShrink:0}}>{n}</div>
              <div>
                <div style={{color:"#fff7ed",fontSize:12,fontWeight:600}}>{t}</div>
                <div style={{color:"#fed7aa",fontSize:11,marginTop:2}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Como criar pontos de saida</div>
        {[
          {e:"🛑",t:"Sinal combinado",d:"Acordem uma palavra ou gesto neutro que significa: estamos no ciclo, precisamos parar"},
          {e:"⏰",t:"Pausa consciente",d:"20 minutos e o tempo minimo para o cortisol baixar o suficiente para conversar"},
          {e:"🎯",t:"Nomear o padrao",d:"Acho que estamos no nosso ciclo de novo"},
          {e:"💬",t:"Falar do sentimento",d:"Eu me sinto invisivel em vez de Voce me ignora"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fed7aa"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#78350f",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#92400e",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#78350f",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexoes</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#78350f",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexao..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexoes pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
    </div>
  );
}

function PsicoLimitesPortas({cat}){
  const COR="#d97706"; const BG="#fef3c7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Em qual area da sua vida voce sente mais dificuldade de estabelecer limites — trabalho, familia, amizades?",
    "Qual e o medo por tras da dificuldade de dizer nao? Rejeicao, culpa, conflito?",
    "Um limite que voce precisa estabelecer agora — e como voce poderia comunicar isso de forma clara e respeitosa?",
  ];
  function enviarWhatsApp(){
    const tel=(cat&&cat.telefone||"").replace(/\D/g,"");
    const texto="Reflexoes -- Limites Nao Sao Muros:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🚪</div>
        <div style={{color:"#fff7ed",fontSize:16,fontWeight:500,marginBottom:6}}>Limites nao sao muros — sao portas com chave</div>
        <div style={{color:"#fed7aa",fontSize:13,lineHeight:1.5}}>Voce decide quem entra, quando e em que condicoes.</div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que e um limite saudavel?</div>
        <div style={{fontSize:12,color:"#92400e",lineHeight:1.7}}>Um limite nao e uma parede para manter as pessoas longe. E uma porta com chave — voce decide quem entra, quando entra, e em que condicoes. Limites saudaveis protegem sua energia, sua identidade e seus valores sem isolar voce do mundo.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#78350f",fontStyle:"italic",fontWeight:500}}>Dizer nao a algo e dizer sim para voce mesmo.</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #b45309"}}>
        <div style={{color:"#fff7ed",fontSize:13,fontWeight:500,marginBottom:10}}>Muro vs. Porta com chave</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"12px"}}>
            <div style={{color:"#fca5a5",fontWeight:700,fontSize:12,marginBottom:6}}>Muro (rigido)</div>
            {["Nao deixa ninguem se aproximar","Vem do medo e da dor","Isola e protege em excesso","Nao tem excecoes"].map(i=>(
              <div key={i} style={{fontSize:11,color:"#fde8d8",marginBottom:3}}>• {i}</div>
            ))}
          </div>
          <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"12px"}}>
            <div style={{color:"#86efac",fontWeight:700,fontSize:12,marginBottom:6}}>Porta (saudavel)</div>
            {["Escolhe quem entra e quando","Vem dos valores e necessidades","Permite intimidade com seguranca","E flexivel e comunicado"].map(i=>(
              <div key={i} style={{fontSize:11,color:"#bbf7d0",marginBottom:3}}>• {i}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Por que e tao dificil dizer nao?</div>
        {[
          {e:"😰",t:"Medo de rejeicao",d:"Fui ensinado que meu valor depende de agradar os outros"},
          {e:"😔",t:"Culpa",d:"Sinto que sou egoista quando coloco minhas necessidades em primeiro lugar"},
          {e:"⚡",t:"Medo do conflito",d:"Prefiro me sobrecarregar a enfrentar a tensao de discordar"},
          {e:"🔄",t:"Padrao aprendido",d:"Em minha familia de origem, limites nao eram permitidos ou modelados"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fed7aa"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#78350f",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#92400e",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#78350f",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexoes</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#78350f",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexao..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexoes pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
    </div>
  );
}

function PsicoCargaMental({cat}){
  const COR="#d97706"; const BG="#fef3c7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Quais sao as tarefas invisiveis que voce gerencia sozinho(a) e que raramente sao reconhecidas?",
    "Voce ja tentou redistribuir essa carga? O que aconteceu?",
    "O que voce precisaria que a outra pessoa entendesse sobre o peso do que voce carrega?",
  ];
  function enviarWhatsApp(){
    const tel=(cat&&cat.telefone||"").replace(/\D/g,"");
    const texto="Reflexoes -- A Carga que Nao Se Ve:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🧩</div>
        <div style={{color:"#fff7ed",fontSize:16,fontWeight:500,marginBottom:6}}>A carga que nao se ve — o que e a carga mental</div>
        <div style={{color:"#fed7aa",fontSize:13,lineHeight:1.5}}>O trabalho invisivel de gerir, planejar e coordenar que esgota sem ser reconhecido.</div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que e carga mental?</div>
        <div style={{fontSize:12,color:"#92400e",lineHeight:1.7}}>Carga mental e o trabalho cognitivo e emocional invisivel de antecipar, lembrar, planejar e coordenar tudo que precisa ser feito. Quem a carrega nao so faz as tarefas — gerencia a existencia delas. E esse gerenciamento e o que esgota.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#78350f",fontStyle:"italic",fontWeight:500}}>Nao e so fazer — e lembrar que precisa ser feito, quando, como, por quem. Isso tem peso.</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #b45309"}}>
        <div style={{color:"#fff7ed",fontSize:13,fontWeight:500,marginBottom:10}}>O que a carga mental inclui</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {e:"🧠",t:"Antecipacao",d:"Pensar no que vai acabar, o que precisa ser agendado, o que pode dar errado"},
            {e:"📋",t:"Planejamento",d:"Organizar rotinas, compromissos, necessidades de todos"},
            {e:"🔄",t:"Delegacao",d:"Dividir tarefas e ainda assim acompanhar se foram feitas"},
            {e:"💭",t:"Carga emocional",d:"Monitorar o humor, as necessidades e o bem-estar das pessoas ao redor"},
            {e:"🤫",t:"Invisibilidade",d:"Tudo isso acontece em silencio — e raramente e visto ou agradecido"},
          ].map(({e,t,d})=>(
            <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px"}}>
              <span style={{fontSize:18,flexShrink:0}}>{e}</span>
              <div>
                <div style={{color:"#fff7ed",fontSize:12,fontWeight:600}}>{t}</div>
                <div style={{color:"#fed7aa",fontSize:11,marginTop:2}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#fff7ed",padding:"16px 20px",borderBottom:"1px solid #fed7aa"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Como redistribuir de forma saudavel</div>
        {[
          {e:"📊",t:"Tornar visivel",d:"Liste tudo que voce gerencia. Mostrar dados e mais eficaz do que reclamar"},
          {e:"🤝",t:"Delegar de verdade",d:"Delegar e transferir a responsabilidade — nao so a tarefa com instrucoes detalhadas"},
          {e:"💬",t:"Conversar sem acusar",d:"Aborde como parceiros resolvendo um problema, nao como adversarios"},
          {e:"🔄",t:"Rever periodicamente",d:"A distribuicao precisa ser revisitada conforme a vida muda"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fed7aa"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#78350f",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#92400e",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#78350f",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexoes</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#78350f",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexao..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexoes pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
    </div>
  );
}

// ── macro_corpo ───────────────────────────────────────────────────────────────

function PsicoVisaoIntegral({cat}){
  const COR="#16a34a"; const BG="#dcfce7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Qual dimensao da sua vida esta mais negligenciada agora — fisica, emocional, social, espiritual?",
    "Como essa negligencia esta afetando as outras areas?",
    "Um pequeno passo que voce poderia dar essa semana para atender essa area?",
  ];
  function enviarWhatsApp(){
    const tel=(cat&&cat.telefone||"").replace(/\D/g,"");
    const texto="Reflexoes -- Visao Integral da Saude:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>⭕</div>
        <div style={{color:"#f0fdf4",fontSize:16,fontWeight:500,marginBottom:6}}>Por que nao basta tratar um sintoma</div>
        <div style={{color:"#bbf7d0",fontSize:13,lineHeight:1.5}}>As dimensoes de vida se influenciam mutuamente — o diagnostico precisa ser sistemico.</div>
      </div>
      <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #bbf7d0"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>A visao integral da saude</div>
        <div style={{fontSize:12,color:"#14532d",lineHeight:1.7}}>Tratar apenas o sintoma e como apagar a luz de aviso no painel do carro sem verificar o motor. A saude integral reconhece que corpo, mente, emocoes, relacoes e proposito estao interligados — o que acontece em uma area afeta todas as outras.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#14532d",fontStyle:"italic",fontWeight:500}}>O sintoma e um mensageiro. A pergunta real e: do que ele esta tentando me avisar?</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #15803d"}}>
        <div style={{color:"#f0fdf4",fontSize:13,fontWeight:500,marginBottom:10}}>As dimensoes que se influenciam</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {[
            {e:"🏃",t:"Fisica",d:"Sono, alimentacao, movimento, dor"},
            {e:"🧠",t:"Mental",d:"Pensamentos, crencas, cognicao"},
            {e:"💜",t:"Emocional",d:"Sentimentos, regulacao, autoestima"},
            {e:"👥",t:"Social",d:"Vinculos, pertencimento, limites"},
            {e:"🌱",t:"Espiritual",d:"Proposito, valores, sentido de vida"},
            {e:"💼",t:"Ocupacional",d:"Trabalho, criatividade, realizacao"},
          ].map(({e,t,d})=>(
            <div key={t} style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:16,marginBottom:4}}>{e}</div>
              <div style={{color:"#f0fdf4",fontSize:11,fontWeight:600}}>{t}</div>
              <div style={{color:"#bbf7d0",fontSize:10,marginTop:2}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #bbf7d0"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Como pensar sistemicamente sobre sua saude</div>
        {[
          {e:"🔍",t:"Identifique o sintoma",d:"Onde voce sente o desequilibrio? Corpo, emocoes, relacoes?"},
          {e:"🔗",t:"Busque a conexao",d:"Que outra area pode estar alimentando esse sintoma?"},
          {e:"⚖️",t:"Avalie o conjunto",d:"Qual dimensao esta mais negligenciada na sua vida agora?"},
          {e:"🌱",t:"Intervenha na raiz",d:"Tratar o sistema, nao so o sinal — mesmo que seja mais lento"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #bbf7d0"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#14532d",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#166534",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#14532d",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexoes</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#14532d",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexao..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexoes pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
    </div>
  );
}

function PsicoEscadaSeguranca({cat}){
  const COR="#16a34a"; const BG="#dcfce7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Em qual dos 3 estados do sistema nervoso voce passa mais tempo — seguranca, mobilizacao ou colapso?",
    "Que situacoes ou pessoas te ajudam a voltar ao estado de seguranca?",
    "Que sinais do seu corpo indicam que voce esta saindo do estado de seguranca?",
  ];
  function enviarWhatsApp(){
    const tel=(cat&&cat.telefone||"").replace(/\D/g,"");
    const texto="Reflexoes -- A Escada de Seguranca:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🧬</div>
        <div style={{color:"#f0fdf4",fontSize:16,fontWeight:500,marginBottom:6}}>Como o seu sistema nervoso decide se esta em perigo</div>
        <div style={{color:"#bbf7d0",fontSize:13,lineHeight:1.5}}>A Teoria Polivagal — os tres estados do sistema nervoso e como regula-los.</div>
      </div>
      <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #bbf7d0"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que e a Teoria Polivagal?</div>
        <div style={{fontSize:12,color:"#14532d",lineHeight:1.7}}>Desenvolvida pelo Dr. Stephen Porges, a Teoria Polivagal explica que o sistema nervoso autonomo tem tres estados hierarquicos de resposta ao ambiente. O corpo avalia constantemente o nivel de seguranca — processo chamado neurocepção — e ativa o estado correspondente, sem consultar a mente consciente.</div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #15803d"}}>
        <div style={{color:"#f0fdf4",fontSize:13,fontWeight:500,marginBottom:10}}>Os 3 estados da escada</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            {n:"↑",t:"Seguranca e conexao",sub:"Nervo vago ventral",d:"Voce se sente calmo, conectado, curioso. Consegue pensar com clareza, ser empatico e colaborativo.",c:"#86efac"},
            {n:"⚡",t:"Mobilizacao",sub:"Sistema simpatico",d:"Voce sente urgencia, ansiedade, irritacao. O corpo se prepara para lutar ou fugir.",c:"#fde68a"},
            {n:"↓",t:"Colapso e desligamento",sub:"Nervo vago dorsal",d:"Voce se sente entorpecido, desconectado, apagado. O corpo entra em modo de conservacao de energia.",c:"#fca5a5"},
          ].map(({n,t,sub,d,c})=>(
            <div key={t} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:18}}>{n}</span>
                <div>
                  <div style={{color:"#f0fdf4",fontSize:12,fontWeight:600}}>{t}</div>
                  <div style={{background:c,color:"#1a001a",fontSize:10,fontWeight:600,padding:"1px 7px",borderRadius:10,display:"inline-block",marginTop:2}}>{sub}</div>
                </div>
              </div>
              <div style={{color:"#bbf7d0",fontSize:11,lineHeight:1.6}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #bbf7d0"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como subir a escada de volta para seguranca</div>
        {[
          {e:"🌬️",t:"Respiracao lenta",d:"Expiracao mais longa que a inspiracao ativa o vago ventral diretamente"},
          {e:"👁️",t:"Movimento dos olhos",d:"Olhar lentamente ao redor sinaliza ao cerebro que o ambiente e seguro"},
          {e:"🤝",t:"Conexao humana",d:"Uma voz calma, um toque gentil ou um rosto acolhedor regulam o sistema"},
          {e:"🎵",t:"Musica ou voz ritmica",d:"O nervo vago responde a sons humanos suaves e ritmos regulares"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #bbf7d0"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#14532d",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#166534",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#14532d",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexoes</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#14532d",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexao..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexoes pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
    </div>
  );
}

function PsicoCorpoNaoMente({cat}){
  const COR="#16a34a"; const BG="#dcfce7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Voce consegue identificar uma emocao que costuma se manifestar como sintoma fisico no seu corpo?",
    "Que situacoes ou emocoes precedem seus sintomas fisicos mais frequentes?",
    "Se o seu corpo pudesse falar, o que ele estaria tentando dizer agora?",
  ];
  function enviarWhatsApp(){
    const tel=(cat&&cat.telefone||"").replace(/\D/g,"");
    const texto="Reflexoes -- O Corpo Nao Mente:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🫀</div>
        <div style={{color:"#f0fdf4",fontSize:16,fontWeight:500,marginBottom:6}}>O corpo nao mente — a linguagem fisica das emocoes nao expressas</div>
        <div style={{color:"#bbf7d0",fontSize:13,lineHeight:1.5}}>A neurobiologia da somatizacao — por que os sintomas fisicos sao frequentemente mensagens emocionais.</div>
      </div>
      <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #bbf7d0"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que e somatizacao?</div>
        <div style={{fontSize:12,color:"#14532d",lineHeight:1.7}}>Somatizacao e quando o corpo expressa atraves de sintomas fisicos o que a mente nao consegue ou nao permite processar emocionalmente. Nao e fingimento — e neurobiologia. O sistema nervoso registra tudo, e quando as emocoes nao encontram saida consciente, elas encontram saida pelo corpo.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#14532d",fontStyle:"italic",fontWeight:500}}>O corpo mantem o placar. O que nao e expresso, e armazenado.</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #15803d"}}>
        <div style={{color:"#f0fdf4",fontSize:13,fontWeight:500,marginBottom:10}}>Emocoes e suas manifestacoes no corpo</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {e:"😰",em:"Ansiedade",f:"Aperto no peito, nausea, tensao muscular, formigamento"},
            {e:"😔",em:"Tristeza reprimida",f:"Cansaco cronico, dores nas costas, sensacao de peso"},
            {e:"😤",em:"Raiva contida",f:"Dor de cabeca, tensao no pescoco, mandibula travada"},
            {e:"😨",em:"Medo",f:"Estomago embrulhado, frio nas maos, dificuldade de respirar"},
            {e:"😶",em:"Emocoes nao expressas",f:"Sintomas difusos que medicos nao conseguem explicar"},
          ].map(({e,em,f})=>(
            <div key={em} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px"}}>
              <span style={{fontSize:18,flexShrink:0}}>{e}</span>
              <div>
                <div style={{color:"#f0fdf4",fontSize:12,fontWeight:600}}>{em}</div>
                <div style={{color:"#bbf7d0",fontSize:11,marginTop:2}}>{f}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #bbf7d0"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como ouvir o corpo</div>
        {[
          {e:"🔍",t:"Escanear o corpo",d:"Feche os olhos e percorra o corpo — onde ha tensao, dor ou desconforto?"},
          {e:"❓",t:"Pergunte ao sintoma",d:"Se essa dor pudesse falar, o que ela diria? Qual emocao ela carrega?"},
          {e:"📓",t:"Diario corpo-emocao",d:"Registre quando o sintoma aparece e o que estava acontecendo emocionalmente"},
          {e:"🤝",t:"Busque apoio",d:"Terapia, fisioterapia, acupuntura — tratar o sistema todo, nao so o sintoma"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #bbf7d0"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#14532d",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#166534",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#14532d",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexoes</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#14532d",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexao..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexoes pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
    </div>
  );
}

function PsicoCienciaPresenca({cat}){
  const COR="#16a34a"; const BG="#dcfce7";
  const [respostas, setRespostas] = React.useState(["","",""]);
  const PERGUNTAS = [
    "Em quais momentos do dia voce percebe que sua mente esta mais ausente do que presente?",
    "O que voce perde quando esta fisicamente em um lugar mas mentalmente em outro?",
    "Uma pratica pequena que voce poderia adotar para treinar mais presenca no dia a dia?",
  ];
  function enviarWhatsApp(){
    const tel=(cat&&cat.telefone||"").replace(/\D/g,"");
    const texto="Reflexoes -- A Ciencia da Presenca:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");
  }
  return (
    <div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:8}}>🧘</div>
        <div style={{color:"#f0fdf4",fontSize:16,fontWeight:500,marginBottom:6}}>Onde esta a sua mente quando seu corpo esta aqui?</div>
        <div style={{color:"#bbf7d0",fontSize:13,lineHeight:1.5}}>A mente vagua 47% do tempo — e esse custo e fisico, emocional e relacional.</div>
      </div>
      <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #bbf7d0"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que a ciencia diz sobre presenca</div>
        <div style={{fontSize:12,color:"#14532d",lineHeight:1.7}}>Uma pesquisa de Harvard com 2.250 pessoas mostrou que a mente vagueia em 47% do tempo — independente do que a pessoa esta fazendo. Os participantes eram menos felizes quando a mente estava em outro lugar, mesmo que o pensamento fosse positivo. A presenca, por si so, gera bem-estar.</div>
        <div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}>
          <div style={{fontSize:12,color:"#14532d",fontStyle:"italic",fontWeight:500}}>Uma mente que vagueia e uma mente infeliz. A presenca e treinavel.</div>
        </div>
      </div>
      <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #15803d"}}>
        <div style={{color:"#f0fdf4",fontSize:13,fontWeight:500,marginBottom:10}}>Os custos da ausencia mental</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[
            {e:"😔",t:"Infelicidade",d:"A mente no passado gera arrependimento. No futuro, gera ansiedade"},
            {e:"💔",t:"Conexao reduzida",d:"Estar presente em corpo mas ausente em mente isola mesmo estando junto"},
            {e:"⚡",t:"Esgotamento",d:"Multitarefa mental consome energia sem produzir"},
            {e:"🧠",t:"Memoria prejudicada",d:"Nao formamos memorias do que nao vivenciamos conscientemente"},
          ].map(({e,t,d})=>(
            <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px"}}>
              <span style={{fontSize:18,flexShrink:0}}>{e}</span>
              <div>
                <div style={{color:"#f0fdf4",fontSize:12,fontWeight:600}}>{t}</div>
                <div style={{color:"#bbf7d0",fontSize:11,marginTop:2}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #bbf7d0"}}>
        <div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como treinar a presenca</div>
        {[
          {e:"🔁",t:"Retorne sem julgamento",d:"Quando perceber que a mente viajou, simplesmente retorne. Sem critica — isso e o treino"},
          {e:"👁️",t:"Ancora sensorial",d:"Foque em 1 coisa que voce ve, ouve ou sente agora. Isso ancora no presente"},
          {e:"📵",t:"Uma coisa de cada vez",d:"Multitarefa e mito — faz tudo pior. Escolha uma tarefa e fique so com ela"},
          {e:"🌬️",t:"Respire conscientemente",d:"3 respiracoes lentas e intencionais reiniciam a presenca em qualquer momento"},
        ].map(({e,t,d})=>(
          <div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #bbf7d0"}}>
            <span style={{fontSize:20,flexShrink:0}}>{e}</span>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:"#14532d",marginBottom:2}}>{t}</div>
              <div style={{fontSize:11,color:"#166534",lineHeight:1.5}}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}>
        <div style={{color:"#14532d",fontSize:13,fontWeight:600,marginBottom:12}}>✏️ Suas reflexoes</div>
        {PERGUNTAS.map((p,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:12,fontWeight:500,color:"#14532d",lineHeight:1.5}}>{p}</div>
            </div>
            <textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}}
              placeholder="Escreva sua reflexao..."
              style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box",outline:"none"}}/>
          </div>
        ))}
        <button onClick={enviarWhatsApp}
          style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📲 Enviar reflexoes pelo WhatsApp
        </button>
      </div>
      <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
    </div>
  );
}

// ── macro_habitos ─────────────────────────────────────────────────────────────

function PsicoCicloAlivioFalso({cat}){
  const COR="#059669"; const BG="#d1fae5";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Qual e o seu principal comportamento de alivio falso — procrastinacao, comida, celular, outro?","O que voce esta evitando quando recorre a esse comportamento?","Como voce se sente 30 minutos depois de ter usado esse alivio?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- O Ciclo do Alivio Falso:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🔁</div><div style={{color:"#ecfdf5",fontSize:16,fontWeight:500,marginBottom:6}}>O ciclo do alivio falso</div><div style={{color:"#a7f3d0",fontSize:13}}>Por que adiar nos acalma na hora — mas gera uma avalanche de ansiedade depois.</div></div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que e alivio falso?</div><div style={{fontSize:12,color:"#065f46",lineHeight:1.7}}>Alivio falso e qualquer comportamento que reduz a ansiedade no curto prazo, mas que aumenta o problema no longo prazo. A procrastinacao e o exemplo classico: adiar a tarefa alivia imediatamente — mas a tarefa continua la, e a culpa e a ansiedade crescem.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#065f46",fontStyle:"italic",fontWeight:500}}>O problema nao desaparece — ele cobra juros.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #047857"}}><div style={{color:"#ecfdf5",fontSize:13,fontWeight:500,marginBottom:10}}>O ciclo em 4 passos</div>{[{n:"1",t:"Gatilho",d:"Tarefa dificil, emocao desconfortavel"},{n:"2",t:"Comportamento de fuga",d:"Procrastinar, rolar o celular, maratonar serie"},{n:"3",t:"Alivio imediato",d:"A tensao cai — o cerebro aprende que funciona"},{n:"4",t:"Consequencia",d:"A tarefa acumula, a culpa e a ansiedade crescem"}].map(({n,t,d})=>(<div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:"#a7f3d0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#065f46",flexShrink:0}}>{n}</div><div><div style={{color:"#ecfdf5",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#a7f3d0",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como quebrar o ciclo</div>{[{e:"🎯",t:"Identifique o gatilho",d:"O que especificamente aciona o comportamento?"},{e:"⏱️",t:"Regra dos 2 minutos",d:"Se leva menos de 2 minutos, faca agora"},{e:"🌊",t:"Surf na emocao",d:"Observe o desconforto sem agir — ele passa mais rapido do que parece"},{e:"✅",t:"Comece pelo menor passo",d:"Nao a tarefa inteira — apenas o primeiro minuto"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #a7f3d0"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#065f46",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#047857",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#065f46",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#065f46",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoLimpezaNoturna({cat}){
  const COR="#059669"; const BG="#d1fae5";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Como tem sido a qualidade do seu sono ultimamente — e o que voce acha que esta interferindo?","Qual e o seu ritual (ou falta de ritual) antes de dormir?","Uma mudanca pequena que voce poderia fazer essa semana para proteger melhor o seu sono?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- A Limpeza Noturna do Cerebro:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🌙</div><div style={{color:"#ecfdf5",fontSize:16,fontWeight:500,marginBottom:6}}>A limpeza noturna do cerebro</div><div style={{color:"#a7f3d0",fontSize:13}}>Como o sono lava as toxinas emocionais e consolida a memoria.</div></div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O sistema glinfatico</div><div style={{fontSize:12,color:"#065f46",lineHeight:1.7}}>Durante o sono profundo, o cerebro ativa o sistema glinfatico — uma rede de canais que literalmente lava as toxinas acumuladas ao longo do dia. Privacao de sono nao e apenas cansaco: e toxinas acumuladas no cerebro.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#065f46",fontStyle:"italic",fontWeight:500}}>Dormir bem nao e preguica — e manutencao essencial do cerebro.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #047857"}}><div style={{color:"#ecfdf5",fontSize:13,fontWeight:500,marginBottom:10}}>O que acontece enquanto voce dorme</div>{[{e:"🧹",t:"Limpeza de toxinas",d:"O sistema glinfatico remove residuos metabolicos"},{e:"💾",t:"Consolidacao da memoria",d:"Aprendizados do dia sao transferidos para a memoria de longo prazo"},{e:"😌",t:"Regulacao emocional",d:"O sono REM processa emocoes dificeis"},{e:"🔧",t:"Reparacao celular",d:"Hormonios de crescimento sao liberados"},{e:"⚡",t:"Recarga energetica",d:"O ATP e restaurado — sem sono, cada decisao custa mais"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:4}}><span style={{fontSize:18,flexShrink:0}}>{e}</span><div><div style={{color:"#ecfdf5",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#a7f3d0",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como proteger o sono</div>{[{e:"📵",t:"Tela fora 1h antes",d:"A luz azul suprime a melatonina e atrasa o inicio do sono"},{e:"🌡️",t:"Quarto fresco e escuro",d:"O cerebro precisa baixar 1-2 graus para o sono profundo"},{e:"⏰",t:"Horario regular",d:"Acordar sempre no mesmo horario e mais importante que a hora de dormir"},{e:"🌙",t:"Ritual de transicao",d:"20-30 min de atividade calma sinaliza ao cerebro que e hora de desligar"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #a7f3d0"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#065f46",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#047857",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#065f46",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#065f46",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoRegra5Minutos({cat}){
  const COR="#059669"; const BG="#d1fae5";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Qual tarefa voce vem adiando ha mais tempo — o que aconteceria se voce fizesse apenas 5 minutos dela agora?","Quando voce comeca uma tarefa, consegue parar depois de 5 minutos — ou tende a continuar?","O que o seu cerebro costuma dizer para justificar o adiamento?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- A Regra dos 5 Minutos:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>⏱️</div><div style={{color:"#ecfdf5",fontSize:16,fontWeight:500,marginBottom:6}}>A regra dos 5 minutos</div><div style={{color:"#a7f3d0",fontSize:13}}>A tecnica infalivel para vencer a procrastinacao.</div></div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Por que o inicio e o maior obstaculo</div><div style={{fontSize:12,color:"#065f46",lineHeight:1.7}}>O cerebro percebe tarefas adiadas como ameacas. A antecipacao do esforco ativa a mesma regiao cerebral que processa dor fisica. A regra dos 5 minutos engana esse mecanismo: comprometer-se com apenas 5 minutos e suficientemente pequeno para o cerebro aceitar.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#065f46",fontStyle:"italic",fontWeight:500}}>A motivacao nao vem antes da acao — vem depois. Comece, e o humor muda.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #047857"}}><div style={{color:"#ecfdf5",fontSize:13,fontWeight:500,marginBottom:10}}>Como aplicar</div>{[{n:"1",t:"Escolha a tarefa",d:"Aquela que voce mais esta evitando"},{n:"2",t:"Comprometa-se com 5 minutos",d:"Nao com a tarefa inteira — apenas 5 minutos"},{n:"3",t:"Comece imediatamente",d:"Sem preparar, sem o momento perfeito. Agora"},{n:"4",t:"Avalie aos 5 minutos",d:"Quer continuar? Otimo. Quer parar? Voce quebrou o ciclo"}].map(({n,t,d})=>(<div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:"#a7f3d0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#065f46",flexShrink:0}}>{n}</div><div><div style={{color:"#ecfdf5",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#a7f3d0",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Por que funciona</div>{[{e:"🧠",t:"Efeito Zeigarnik",d:"O cerebro tem dificuldade de esquecer tarefas incompletas — comecar cria impulso"},{e:"💉",t:"Dopamina do progresso",d:"Qualquer progresso, mesmo pequeno, libera dopamina"},{e:"🌊",t:"Quebra a inercio",d:"O maior custo de energia e o inicio — depois fica mais facil"},{e:"🎯",t:"Permite comecar imperfeito",d:"Imperfeitamente comecado e melhor que nao comecado"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #a7f3d0"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#065f46",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#047857",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#065f46",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#065f46",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoSinaisDesgaste({cat}){
  const COR="#059669"; const BG="#d1fae5";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Quais sinais de desgaste emocional voce esta ignorando ou minimizando agora?","O que costuma impedir voce de fazer pausa quando precisa?","Uma estrategia de recarga que funciona para voce — e por que voce nao a usa com mais frequencia?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- Sinais de Desgaste Emocional:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🔋</div><div style={{color:"#ecfdf5",fontSize:16,fontWeight:500,marginBottom:6}}>Sinais de desgaste emocional</div><div style={{color:"#a7f3d0",fontSize:13}}>Como identificar a sobrecarga e estrategias de pausa real.</div></div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Por que ignoramos os sinais</div><div style={{fontSize:12,color:"#065f46",lineHeight:1.7}}>O desgaste emocional raramente aparece de repente. Ele se instala aos poucos, com sinais que frequentemente normalizamos. A cultura da produtividade ensinou a tratar o cansaco como fraqueza — e muitos so param quando o corpo para compulsoriamente.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#065f46",fontStyle:"italic",fontWeight:500}}>Se voce nao criar espaco para descansar, o seu corpo vai criar — geralmente na pior hora.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #047857"}}><div style={{color:"#ecfdf5",fontSize:13,fontWeight:500,marginBottom:10}}>Sinais de alerta por nivel</div>{[{nivel:"Amarelo",c:"#fde68a",tc:"#78350f",s:"Irritabilidade, dificuldade de concentrar, sono irregular, menos prazer nas coisas"},{nivel:"Laranja",c:"#fed7aa",tc:"#7c2d12",s:"Esquecimento frequente, choro facil, isolamento, sensacao de estar no limite"},{nivel:"Vermelho",c:"#fca5a5",tc:"#7f1d1d",s:"Esgotamento mesmo apos dormir, apatia total, sintomas fisicos, incapacidade de funcionar"}].map(({nivel,c,tc,s})=>(<div key={nivel} style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"10px 12px",marginBottom:6}}><div style={{background:c,color:tc,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,display:"inline-block",marginBottom:6}}>{nivel}</div><div style={{color:"#ecfdf5",fontSize:11,lineHeight:1.6}}>{s}</div></div>))}</div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Estrategias de pausa real</div>{[{e:"🌿",t:"Pausa ativa",d:"Caminhada, alongamento — movimento leve que reseta o sistema nervoso"},{e:"📵",t:"Desconexao digital",d:"30 minutos sem tela sao mais restauradores do que 3h de rolagem passiva"},{e:"💤",t:"Sono como prioridade",d:"Nao e luxo — e a manutencao mais barata e eficaz que existe"},{e:"🤝",t:"Conexao genuina",d:"Uma conversa de verdade com alguem que voce confia recarrega de forma unica"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #a7f3d0"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#065f46",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#047857",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#065f46",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#065f46",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoAgirantesVontade({cat}){
  const COR="#059669"; const BG="#d1fae5";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Existe um habito que voce so age quando esta motivado — e o que acontece quando a motivacao vai embora?","Qual seria um passo tao pequeno que voce conseguiria fazer mesmo sem vontade nenhuma?","Como voce poderia estruturar seu ambiente para que a acao seja mais facil do que a inacao?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- Agir Antes de Ter Vontade:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🚀</div><div style={{color:"#ecfdf5",fontSize:16,fontWeight:500,marginBottom:6}}>Agir antes de ter vontade</div><div style={{color:"#a7f3d0",fontSize:13}}>O principio pratico: fazer algo para gerar motivacao — nao o contrario.</div></div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O mito da motivacao</div><div style={{fontSize:12,color:"#065f46",lineHeight:1.7}}>A maioria das pessoas espera sentir vontade para agir. Mas a neurociencia mostra o oposto: a motivacao e consequencia da acao, nao sua causa. O sistema dopaminergico e ativado pelo progresso — e o progresso so existe se voce comecar, com ou sem vontade.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#065f46",fontStyle:"italic",fontWeight:500}}>Nao espere a vontade. A vontade vem depois que voce comeca.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #047857"}}><div style={{color:"#ecfdf5",fontSize:13,fontWeight:500,marginBottom:10}}>O ciclo correto</div>{[{n:"❌",t:"Mito",d:"Vontade → Acao → Resultado (funciona raramente)"},{n:"✅",t:"Realidade",d:"Acao → Progresso → Dopamina → Motivacao → Mais acao"}].map(({n,t,d})=>(<div key={t} style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"10px 12px",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontSize:18}}>{n}</span><div style={{color:"#ecfdf5",fontSize:12,fontWeight:600}}>{t}</div></div><div style={{color:"#a7f3d0",fontSize:11}}>{d}</div></div>))}<div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>{[{e:"📐",t:"Design do ambiente",d:"Remova friccao: tenis ao lado da cama, livro na mesa"},{e:"⏰",t:"Horario fixo",d:"Habito atrelado a horario nao precisa de decisao"},{e:"🔗",t:"Empilhamento",d:"Depois de [habito existente], vou [novo habito]"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px"}}><span style={{fontSize:18,flexShrink:0}}>{e}</span><div><div style={{color:"#ecfdf5",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#a7f3d0",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div></div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#065f46",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#065f46",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoMitoBateriaInfinita({cat}){
  const COR="#059669"; const BG="#d1fae5";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Em que nivel sua bateria emocional esta agora — e quando foi a ultima vez que voce a recarregou de verdade?","O que drena mais sua energia — situacoes, pessoas ou pensamentos?","O que voce precisaria eliminar, reduzir ou mudar para ter mais energia disponivel?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- O Mito da Bateria Infinita:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🔋</div><div style={{color:"#ecfdf5",fontSize:16,fontWeight:500,marginBottom:6}}>O mito da bateria infinita</div><div style={{color:"#a7f3d0",fontSize:13}}>Sinais de alerta de que o sistema nervoso esta a entrar em esgotamento.</div></div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O mito da produtividade ilimitada</div><div style={{fontSize:12,color:"#065f46",lineHeight:1.7}}>A cultura moderna trata os seres humanos como maquinas com bateria infinita. Mas o sistema nervoso tem limites fisicos e quimicos reais. Cortisol, noradrenalina, serotonina — todos se esgotam. Quando os recursos neurobiologicos acabam, o desempenho cai e a irritabilidade aumenta.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#065f46",fontStyle:"italic",fontWeight:500}}>Voce nao e preguicoso quando esta esgotado. Voce esta sem recurso.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #047857"}}><div style={{color:"#ecfdf5",fontSize:13,fontWeight:500,marginBottom:10}}>Sinais de bateria baixa</div>{[{e:"😤",t:"Irritabilidade desproporcional",d:"Pequenas coisas provocam reacoes grandes"},{e:"🧠",t:"Neblina mental",d:"Dificuldade de concentrar, esquecer coisas simples"},{e:"😴",t:"Cansaco que nao passa",d:"Dormir nao resolve — esgotamento mais profundo"},{e:"😶",t:"Apatia e desconexao",d:"Coisas que antes davam prazer nao movem mais"},{e:"🤒",t:"Sintomas fisicos recorrentes",d:"Imunidade baixa, dores de cabeca, tensao cronica"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:4}}><span style={{fontSize:18,flexShrink:0}}>{e}</span><div><div style={{color:"#ecfdf5",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#a7f3d0",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como recarregar de verdade</div>{[{e:"💤",t:"Sono de qualidade",d:"A unica recarga que o cerebro aceita — nao ha substituto"},{e:"🌿",t:"Exposicao a natureza",d:"20 minutos em ambiente natural reduz cortisol significativamente"},{e:"🤝",t:"Conexao genuina",d:"Conversas reais com pessoas que te fazem bem"},{e:"🎯",t:"Eliminar drenos",d:"Identificar e reduzir o que consome energia sem retornar"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #a7f3d0"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#065f46",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#047857",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#065f46",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#065f46",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoPoder1Porcento({cat}){
  const COR="#059669"; const BG="#d1fae5";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Em qual area da sua vida 1% de melhoria diaria teria mais impacto em 1 ano?","Qual habito pequeno voce poderia comecar hoje — tao pequeno que seria impossivel dizer nao?","O que tem te impedido de manter habitos — o inicio ou a consistencia?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- O Poder do 1% Diario:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>📈</div><div style={{color:"#ecfdf5",fontSize:16,fontWeight:500,marginBottom:6}}>O poder do 1% diario</div><div style={{color:"#a7f3d0",fontSize:13}}>Como pequenas melhorias diarias se acumulam em transformacoes extraordinarias.</div></div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>A matematica dos pequenos habitos</div><div style={{fontSize:12,color:"#065f46",lineHeight:1.7}}>Melhorar 1% por dia durante um ano resulta em 37 vezes melhor. Piorar 1% por dia resulta em quase zero. O impacto dos habitos e invisivel no curto prazo — e inevitavel no longo prazo.</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}><div style={{background:BG,borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:COR}}>37x</div><div style={{fontSize:11,color:"#065f46"}}>+1% ao dia / 1 ano</div></div><div style={{background:"#fee2e2",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:"#dc2626"}}>0,03</div><div style={{fontSize:11,color:"#7f1d1d"}}>-1% ao dia / 1 ano</div></div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #047857"}}><div style={{color:"#ecfdf5",fontSize:13,fontWeight:500,marginBottom:10}}>Por que habitos pequenos funcionam melhor</div>{[{e:"🧠",t:"Reducao da resistencia",d:"O cerebro nao resiste a algo pequeno"},{e:"🔄",t:"Automatizacao",d:"Acoes repetidas criam vias neurais — apos 60-70 dias vira piloto automatico"},{e:"💉",t:"Recompensa imediata",d:"Pequenas vitorias diarias geram dopamina"},{e:"📐",t:"Identidade",d:"Cada acao consistente confirma para voce mesmo quem voce e"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:4}}><span style={{fontSize:18,flexShrink:0}}>{e}</span><div><div style={{color:"#ecfdf5",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#a7f3d0",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Como comecar o seu 1%</div>{[{e:"🎯",t:"Escolha uma area so",d:"Saude, relacoes, trabalho, aprendizado"},{e:"📏",t:"Seja especifico",d:"Nao meditar — mas respirar 2 minutos"},{e:"🔗",t:"Conecte a algo existente",d:"Depois de escovar os dentes, vou ler 1 pagina"},{e:"📊",t:"Registre",d:"Ver progresso visual e mais motivador do que qualquer discurso"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #a7f3d0"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#065f46",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#047857",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#065f46",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#065f46",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoDiarioPequenasVitorias({cat}){
  const COR="#059669"; const BG="#d1fae5";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Quais foram as 3 menores vitorias dessa semana que voce deixou passar sem reconhecer?","Como voce se sente quando reconhece o proprio progresso — mesmo que pequeno?","Que formato de registro funcionaria melhor para voce: diario, app, bloco de papel?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- O Diario de Pequenas Vitorias:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🏆</div><div style={{color:"#ecfdf5",fontSize:16,fontWeight:500,marginBottom:6}}>O diario de pequenas vitorias</div><div style={{color:"#a7f3d0",fontSize:13}}>Como treinar o cerebro para notar o que deu certo.</div></div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Por que o cerebro ignora o progresso</div><div style={{fontSize:12,color:"#065f46",lineHeight:1.7}}>O cerebro humano tem vies de negatividade — registra ameacas e fracassos com muito mais intensidade do que sucessos. Isso foi util na savana. Na vida moderna, significa que acabamos o dia lembrando do que nao fizemos e esquecendo o que fizemos.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#065f46",fontStyle:"italic",fontWeight:500}}>O que voce registra, voce fortifica. O que voce ignora, desaparece.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #047857"}}><div style={{color:"#ecfdf5",fontSize:13,fontWeight:500,marginBottom:10}}>O que conta como vitoria</div>{[{e:"✅",t:"Fez o que planejou",d:"Acordou no horario, foi a academia, entregou — isso conta"},{e:"💪",t:"Resistiu a algo dificil",d:"Nao comeu o que nao queria, esperou — isso conta"},{e:"🌱",t:"Tentou algo novo",d:"Saiu da zona de conforto, pediu ajuda — isso conta"},{e:"💜",t:"Cuidou de si",d:"Dormiu cedo, fez pausa, disse nao — isso conta"},{e:"🔄",t:"Recomeçou",d:"Caiu e retomou no mesmo dia — isso conta mais do que nunca ter caido"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:4}}><span style={{fontSize:18,flexShrink:0}}>{e}</span><div><div style={{color:"#ecfdf5",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#a7f3d0",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div>
    <div style={{background:"#f0fdf4",padding:"16px 20px",borderBottom:"1px solid #a7f3d0"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como criar o habito do registro</div>{[{e:"🌙",t:"Faca a noite",d:"2 minutos antes de dormir. Qual foi a menor vitoria de hoje?"},{e:"📏",t:"Seja especifico",d:"Nao apenas bom dia — mas acordei sem celular por 30 minutos"},{e:"🔢",t:"3 por dia",d:"Suficiente para treinar o olhar, pequeno o suficiente para manter"},{e:"🔁",t:"Revise semanalmente",d:"Ler as vitorias da semana toda de uma vez cria sensacao poderosa de progresso"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #a7f3d0"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#065f46",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#047857",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#065f46",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#065f46",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

// ── macro_humor ───────────────────────────────────────────────────────────────

function PsicoParaQueServemEmocoes({cat}){
  const COR="#db2777"; const BG="#fce7f3";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Qual emocao voce mais tende a suprimir — e o que voce acha que ela esta tentando dizer?","Quando voce sente uma emocao intensa, sua tendencia e agir, suprimir ou observar?","Como seria sua relacao com suas emocoes se voce as tratasse como mensageiras em vez de inimigos?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- Para que Servem as Emocoes:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>❤️</div><div style={{color:"#fdf2f8",fontSize:16,fontWeight:500,marginBottom:6}}>Para que servem as emocoes?</div><div style={{color:"#fbcfe8",fontSize:13}}>Nao ha emocoes erradas — todas sao mensageiras com uma funcao vital.</div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Emocoes como sistema de informacao</div><div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>As emocoes nao sao defeitos do sistema nervoso — sao o sistema de navegacao mais sofisticado que existe. Cada emocao carrega uma mensagem sobre o que e importante para voce, o que esta ameacado, o que precisa de atencao. Suprimir emocoes e como desligar os indicadores do painel do carro.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#831843",fontStyle:"italic",fontWeight:500}}>Nao existe emocao ruim. Existe emocao bem ou mal utilizada.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}><div style={{color:"#fdf2f8",fontSize:13,fontWeight:500,marginBottom:10}}>O que cada emocao comunica</div>{[{e:"😨",em:"Medo",f:"Algo importante esta ameacado — avalie o perigo real"},{e:"😤",em:"Raiva",f:"Um limite foi violado ou uma injustica aconteceu"},{e:"😢",em:"Tristeza",f:"Uma perda ocorreu — voce precisa processar e integrar"},{e:"😔",em:"Culpa",f:"Voce agiu contra seus valores — ha oportunidade de reparar"},{e:"😊",em:"Alegria",f:"Voce esta alinhado com o que importa — registre e amplifique"},{e:"🤢",em:"Nojo",f:"Um limite moral ou fisico foi cruzado"}].map(({e,em,f})=>(<div key={em} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 10px",marginBottom:4}}><span style={{fontSize:18,flexShrink:0}}>{e}</span><div><div style={{color:"#fdf2f8",fontSize:12,fontWeight:600}}>{em}</div><div style={{color:"#fbcfe8",fontSize:11,marginTop:2}}>{f}</div></div></div>))}</div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como se relacionar melhor com as emocoes</div>{[{e:"👁️",t:"Observe antes de agir",d:"Pause entre sentir e reagir"},{e:"🏷️",t:"Nomeie com precisao",d:"Diferenciar ansiedade de medo muda a resposta"},{e:"❓",t:"Pergunte a mensagem",d:"O que essa emocao esta tentando me dizer?"},{e:"🌊",t:"Surf — nao lute",d:"Resistir amplifica. Observar deixa passar"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fbcfe8"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoAutocompaixao({cat}){
  const COR="#db2777"; const BG="#fce7f3";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Como voce fala consigo mesmo quando comete um erro — voce trataria um amigo da mesma forma?","Que crenca esta por tras da sua autocritica — ela te protege ou te motiva de verdade?","Uma frase de autocompaixao que voce poderia usar na proxima vez que falhar consigo mesmo?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- Autocompaixao:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🤗</div><div style={{color:"#fdf2f8",fontSize:16,fontWeight:500,marginBottom:6}}>Autocompaixao</div><div style={{color:"#fbcfe8",fontSize:13}}>Como ser menos critico consigo mesmo — sem baixar o padrao.</div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que e autocompaixao</div><div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>Autocompaixao e a capacidade de se tratar com a mesma gentileza que voce trataria um bom amigo diante do sofrimento ou das proprias falhas. Nao e vitimismo, nao e baixar o padrao. E parar de adicionar sofrimento ao sofrimento.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#831843",fontStyle:"italic",fontWeight:500}}>A critica severa nao motiva — paralisa. A autocompaixao libera energia para mudar.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}><div style={{color:"#fdf2f8",fontSize:13,fontWeight:500,marginBottom:10}}>Os 3 componentes</div>{[{n:"1",t:"Gentileza consigo mesmo",sub:"Em vez de julgamento severo",d:"Tratar-se com cuidado quando voce falha — como faria com alguem que ama"},{n:"2",t:"Humanidade compartilhada",sub:"Em vez de isolamento",d:"Reconhecer que sofrer e falhar faz parte da experiencia humana"},{n:"3",t:"Mindfulness",sub:"Em vez de superidentificacao",d:"Observar pensamentos e emocoes dolorosas sem exagerar nem suprimir"}].map(({n,t,sub,d})=>(<div key={n} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"10px 12px",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><div style={{width:22,height:22,borderRadius:"50%",background:"#fbcfe8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#831843",flexShrink:0}}>{n}</div><div><div style={{color:"#fdf2f8",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#fbcfe8",fontSize:10,marginTop:1}}>{sub}</div></div></div><div style={{color:"#fbcfe8",fontSize:11,lineHeight:1.6}}>{d}</div></div>))}</div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Praticas</div>{[{e:"🪞",t:"Fale como falaria a um amigo",d:"Quando critico, pergunte: eu diria isso a alguem que amo?"},{e:"✋",t:"Gesto de conforto",d:"Mao no coracao ao sentir sofrimento — o toque ativa o sistema de cuidado"},{e:"📝",t:"Carta de autocompaixao",d:"Escreva para si como um amigo compassivo escreveria"},{e:"🌊",t:"Valide antes de resolver",d:"Antes de buscar solucao: isso e dificil. Faz sentido que eu esteja sofrendo"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fbcfe8"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoAcaoGeraMotivacao({cat}){
  const COR="#db2777"; const BG="#fce7f3";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Existe algo que voce vem adiando esperando ter vontade — qual seria o menor passo possivel para comecar agora?","Como voce se sente depois de agir mesmo sem vontade — diferente de quando ficou parado esperando?","Que area da sua vida mais precisa de acao agora, independente de como voce esta se sentindo?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- Acao Gera Motivacao:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>⚡</div><div style={{color:"#fdf2f8",fontSize:16,fontWeight:500,marginBottom:6}}>Acao gera motivacao</div><div style={{color:"#fbcfe8",fontSize:13}}>Por que esperar ter vontade so agrava o desanimo — e como inverter o ciclo.</div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>A armadilha de esperar a motivacao</div><div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>Quando estamos desanimados, esperamos sentir vontade para agir. Mas a neurociencia mostra que essa sequencia esta invertida: a motivacao nao precede a acao — ela e produzida por ela. A dopamina e liberada pelo progresso, nao pela antecipacao.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#831843",fontStyle:"italic",fontWeight:500}}>Voce nao precisa estar pronto. Voce precisa comecar.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}><div style={{color:"#fdf2f8",fontSize:13,fontWeight:500,marginBottom:10}}>Como o ciclo funciona</div>{[{n:"1",t:"Acao minima",d:"Qualquer acao, por menor que seja"},{n:"2",t:"Progresso percebido",d:"O cerebro registra que algo foi feito"},{n:"3",t:"Dopamina liberada",d:"O sistema de recompensa e ativado"},{n:"4",t:"Motivacao gerada",d:"A vontade aparece como consequencia da acao"},{n:"5",t:"Mais acao",d:"O ciclo se autoalimenta"}].map(({n,t,d})=>(<div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:4}}><div style={{width:22,height:22,borderRadius:"50%",background:"#fbcfe8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#831843",flexShrink:0}}>{n}</div><div><div style={{color:"#fdf2f8",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#fbcfe8",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Estrategias para comecar sem vontade</div>{[{e:"🎯",t:"O minimo absurdo",d:"O que e tao pequeno que seria ridiculo nao fazer?"},{e:"⏱️",t:"Temporizador de 10 min",d:"Comprometa-se com 10 minutos apenas"},{e:"🌍",t:"Mude o ambiente",d:"Sair do lugar onde voce esta parado quebra o estado emocional"},{e:"💬",t:"Diga em voz alta",d:"Declarar a acao antes de fazer aumenta a probabilidade de execucao"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fbcfe8"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoCerebroSequestrado({cat}){
  const COR="#db2777"; const BG="#fce7f3";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Voce consegue identificar uma situacao recente em que seu cerebro foi sequestrado — o que disparou e como voce reagiu?","Quais sao os seus sinais pessoais de que o sequestro esta acontecendo — no corpo, no pensamento, na fala?","Que estrategia voce poderia usar nos proximos 6 segundos para nao dizer algo de que vai se arrepender?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- O Cerebro Sequestrado:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🧠</div><div style={{color:"#fdf2f8",fontSize:16,fontWeight:500,marginBottom:6}}>O cerebro sequestrado</div><div style={{color:"#fbcfe8",fontSize:13}}>O sequestro da amigdala — por que dizemos o que nao queremos na raiva.</div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O que e o sequestro da amigdala?</div><div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>Quando a amigdala percebe uma ameaca, ela literalmente sequestra o cortex pre-frontal — responsavel pela razao, empatia e controle de impulsos. Em milissegundos, voce perde acesso ao seu melhor julgamento e age a partir do instinto de sobrevivencia.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#831843",fontStyle:"italic",fontWeight:500}}>Nao e fraqueza de carater — e neurobiologia. Mas e possivel treinar a pausa.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}><div style={{color:"#fdf2f8",fontSize:13,fontWeight:500,marginBottom:10}}>O que acontece durante o sequestro</div>{[{e:"⚡",t:"Disparo instantaneo",d:"A amigdala reage antes do cortex processar"},{e:"🔴",t:"Cortex desligado",d:"Perdemos acesso a empatia, logica e controle de impulsos"},{e:"💬",t:"Palavras que escapam",d:"O filtro social desaparece"},{e:"😔",t:"Arrependimento depois",d:"Quando o cortex volta (10-20 min), percebemos o estrago"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:4}}><span style={{fontSize:18,flexShrink:0}}>{e}</span><div><div style={{color:"#fdf2f8",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#fbcfe8",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como treinar a pausa</div>{[{e:"⏱️",t:"Regra dos 6 segundos",d:"O pico de cortisol dura 6 segundos. Aguardar reduz drasticamente a reatividade"},{e:"🌬️",t:"Respiracao 4-7-8",d:"Inspirar 4s, segurar 7s, expirar 8s. Ativa o vago"},{e:"🚶",t:"Sair fisicamente",d:"Mudar o ambiente interrompe o ciclo"},{e:"🏷️",t:"Nomeie a emocao",d:"Nomear em voz alta reduz a atividade da amigdala"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fbcfe8"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoFiltroNegativo({cat}){
  const COR="#db2777"; const BG="#fce7f3";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Voce consegue identificar uma situacao recente em que ignorou elogios e focou em uma critica?","Que evidencias positivas sobre voce mesmo voce costuma descartar ou minimizar?","Como seria sua percepcao de si mesmo se voce aplicasse o mesmo peso aos elogios que as criticas?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- O Filtro Negativo da Mente:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🔦</div><div style={{color:"#fdf2f8",fontSize:16,fontWeight:500,marginBottom:6}}>O filtro negativo da mente</div><div style={{color:"#fbcfe8",fontSize:13}}>Por que ignoramos 10 elogios e focamos em 1 critica.</div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>O vies de negatividade</div><div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>O cerebro humano e biologicamente programado para dar mais peso a experiencias negativas — uma heranca evolutiva. Na vida moderna, esse mecanismo faz com que uma critica dure dias na memoria enquanto 10 elogios desaparecem em horas.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#831843",fontStyle:"italic",fontWeight:500}}>Experiencias negativas grudam. Positivas escorregam. E possivel mudar isso.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}><div style={{color:"#fdf2f8",fontSize:13,fontWeight:500,marginBottom:10}}>Como o filtro se manifesta</div>{[{e:"🔍",t:"Filtragem mental",d:"Captar apenas o negativo, ignorando todo o contexto positivo"},{e:"💭",t:"Desqualificacao do positivo",d:"Receber elogio e pensar: foi sorte, estao sendo gentis"},{e:"📺",t:"Ruminacao seletiva",d:"Revisitar criticas repetidamente enquanto sucessos sao esquecidos"},{e:"⚖️",t:"Assimetria de peso",d:"Erros valem muito mais do que acertos na balanca interna"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:4}}><span style={{fontSize:18,flexShrink:0}}>{e}</span><div><div style={{color:"#fdf2f8",fontSize:12,fontWeight:600}}>{t}</div><div style={{color:"#fbcfe8",fontSize:11,marginTop:2}}>{d}</div></div></div>))}</div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como re-equilibrar o filtro</div>{[{e:"📓",t:"Diario de evidencias positivas",d:"Registre diariamente 3 coisas que deram certo"},{e:"⏸️",t:"Pause antes de descartar",d:"Quando receber um elogio, respire antes de minimizar"},{e:"🔄",t:"Busque evidencias contrarias",d:"Para cada critica que gruda, liste 3 evidencias que a contradizem"},{e:"🧠",t:"Saiba que e neurobiologia",d:"Nao e pessimismo — e o sistema padrao. Mudar exige esforco consciente"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fbcfe8"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoJuizInternoTreinador({cat}){
  const COR="#db2777"; const BG="#fce7f3";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Como e a voz do seu Juiz Interno — severa, ironica, catastrofica? De onde voce acha que ela veio?","Pense em um treinador que voce admira. Como essa pessoa falaria sobre o mesmo erro?","Como seria sua vida se voce substituisse 50% das mensagens do Juiz pelo Treinador?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- O Juiz Interno vs. O Treinador:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>⚖️</div><div style={{color:"#fdf2f8",fontSize:16,fontWeight:500,marginBottom:6}}>O Juiz Interno vs. O Treinador</div><div style={{color:"#fbcfe8",fontSize:13}}>A diferenca entre a critica que paralisa e o incentivo que produz mudanca real.</div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Duas vozes internas</div><div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>Todos temos duas vozes internas: o Juiz — que condena, humilha e generaliza — e o Treinador — que avalia com honestidade, aponta o que melhorar e encoraja. A diferenca nao e o nivel de exigencia. E a intencao: o Juiz quer punir; o Treinador quer crescimento.</div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}><div style={{color:"#fdf2f8",fontSize:13,fontWeight:500,marginBottom:10}}>Juiz vs. Treinador — na pratica</div>{[{j:"Que idiota, voce errou de novo",t:"Esse erro mostra onde precisa praticar mais"},{j:"Voce nunca vai conseguir",t:"Ainda nao chegou la — o que pode fazer diferente?"},{j:"Todo mundo ja percebeu que voce e incompetente",t:"Essa situacao foi dificil. O que voce aprendeu?"},{j:"Nao adianta nem tentar",t:"O proximo passo e pequeno o suficiente para tentar agora"}].map(({j,t})=>(<div key={j} style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",marginBottom:6}}><div style={{display:"flex",gap:6,marginBottom:4,alignItems:"flex-start"}}><span style={{fontSize:12,color:"#fca5a5",fontWeight:600,flexShrink:0}}>Juiz:</span><span style={{fontSize:11,color:"#fde8d8",fontStyle:"italic"}}>{j}</span></div><div style={{display:"flex",gap:6,alignItems:"flex-start"}}><span style={{fontSize:12,color:"#86efac",fontWeight:600,flexShrink:0}}>Trein.:</span><span style={{fontSize:11,color:"#bbf7d0"}}>{t}</span></div></div>))}</div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como fortalecer o Treinador</div>{[{e:"👁️",t:"Reconheca a voz do Juiz",d:"Nomeie quando ele falar — isso cria distancia"},{e:"❓",t:"Questione a sentenca",d:"O Juiz e justo? Quais evidencias contradizem o que ele diz?"},{e:"🔄",t:"Reformule com o Treinador",d:"O que um treinador que eu respeito diria sobre isso?"},{e:"📈",t:"Foque no processo",d:"Juiz foca no resultado. Treinador foca no aprendizado"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fbcfe8"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoRodaEmocoes({cat}){
  const COR="#db2777"; const BG="#fce7f3";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Voce tem dificuldade de nomear o que sente com precisao — ou usa sempre as mesmas palavras como bem, mal, estressado?","Qual e a emocao que voce mais evita nomear — e por que acha que a evita?","Como um vocabulario emocional mais rico poderia mudar suas conversas mais importantes?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- A Roda das Emocoes:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🎨</div><div style={{color:"#fdf2f8",fontSize:16,fontWeight:500,marginBottom:6}}>A roda das emocoes</div><div style={{color:"#fbcfe8",fontSize:13}}>A importancia de saber nomear exatamente o que voce sente.</div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>Por que nomear importa</div><div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>Pesquisas de neurociencia mostram que nomear uma emocao com precisao reduz sua intensidade — processo chamado affect labeling. Quanto mais preciso voce e ao nomear o que sente, mais controle tem sobre isso.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#831843",fontStyle:"italic",fontWeight:500}}>Granularidade emocional — vocabulario emocional rico — e preditor de saude mental.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}><div style={{color:"#fdf2f8",fontSize:13,fontWeight:500,marginBottom:10}}>Da emocao basica a nuance</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{[{base:"Triste",nuances:["Melancólico","Decepcionado","Saudoso","Desolado"]},{base:"Com medo",nuances:["Ansioso","Apreensivo","Inseguro","Vulneravel"]},{base:"Raivoso",nuances:["Frustrado","Indignado","Irritado","Ressentido"]},{base:"Feliz",nuances:["Grato","Aliviado","Empolgado","Realizado"]}].map(({base,nuances})=>(<div key={base} style={{background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"10px"}}><div style={{color:"#fdf2f8",fontSize:12,fontWeight:600,marginBottom:6}}>{base}</div>{nuances.map(n=>(<div key={n} style={{fontSize:10,color:"#fbcfe8",marginBottom:2}}>• {n}</div>))}</div>))}</div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como ampliar seu vocabulario emocional</div>{[{e:"🎨",t:"Use a Roda das Emocoes",d:"A roda de Robert Plutchik mostra camadas de nuance"},{e:"📓",t:"Diario emocional",d:"Qual foi a emocao mais intensa hoje? Consigo nomear com mais precisao?"},{e:"❓",t:"Pergunte mais fundo",d:"Quando disser estou mal, pergunte: mal como? Cansado, triste, frustrado?"},{e:"🗣️",t:"Compartilhe com precisao",d:"Em conversas importantes, ouse usar palavras mais especificas"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fbcfe8"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoSurfarOndaEmocao({cat}){
  const COR="#db2777"; const BG="#fce7f3";
  const [respostas,setRespostas]=React.useState(["","",""]);
  const PERGUNTAS=["Qual emocao intensa voce mais tende a fugir ou suprimir — e o que costuma fazer para evitar sentir?","Voce ja tentou apenas observar uma emocao sem agir ou fugir? O que aconteceu?","Como seria atravessar a proxima onda emocional intensa com curiosidade em vez de resistencia?"];
  function enviarWhatsApp(){const tel=(cat&&cat.telefone||"").replace(/\D/g,"");const texto="Reflexoes -- Surfar a Onda da Emocao:\n\n"+PERGUNTAS.map((p,i)=>`${i+1}. ${p}\nR: ${respostas[i]||"--"}`).join("\n\n");window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`,"_blank");}
  return (<div style={{fontFamily:"var(--font-body)",maxWidth:640,margin:"0 auto",paddingBottom:16}}>
    <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>🏄</div><div style={{color:"#fdf2f8",fontSize:16,fontWeight:500,marginBottom:6}}>Surfar a onda da emocao</div><div style={{color:"#fbcfe8",fontSize:13}}>Como a emocao intensa tem um pico e desce naturalmente — se nao lutarmos contra ela.</div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:8}}>A metafora da onda</div><div style={{fontSize:12,color:"#831843",lineHeight:1.7}}>Emocoes sao como ondas: sobem, atingem um pico e descem naturalmente — se nao interferirmos. O problema e que a maioria das pessoas tenta resistir a onda ou e arrastada por ela. Surfar e diferente: voce se move com a onda, sem ser controlado por ela e sem fugir dela.</div><div style={{marginTop:10,background:BG,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${COR}`}}><div style={{fontSize:12,color:"#831843",fontStyle:"italic",fontWeight:500}}>A emocao nao e o problema. Resistir a ela e que a torna insuportavel.</div></div></div>
    <div style={{background:COR,padding:"16px 20px",borderBottom:"1px solid #be185d"}}><div style={{color:"#fdf2f8",fontSize:13,fontWeight:500,marginBottom:10}}>Resistir vs. Surfar</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"12px"}}><div style={{color:"#fca5a5",fontWeight:700,fontSize:12,marginBottom:6}}>Resistir</div>{["Emocao fica mais intensa","Gera mais ansiedade","Cria comportamentos de fuga","Consome muita energia"].map(i=>(<div key={i} style={{fontSize:11,color:"#fde8d8",marginBottom:3}}>• {i}</div>))}</div><div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"12px"}}><div style={{color:"#86efac",fontWeight:700,fontSize:12,marginBottom:6}}>Surfar</div>{["Emocao tem seu curso natural","Dura menos do que parece","Reduz o medo da propria emocao","Libera energia para agir"].map(i=>(<div key={i} style={{fontSize:11,color:"#bbf7d0",marginBottom:3}}>• {i}</div>))}</div></div></div>
    <div style={{background:"#fdf2f8",padding:"16px 20px",borderBottom:"1px solid #fbcfe8"}}><div style={{color:COR,fontSize:13,fontWeight:500,marginBottom:10}}>Como surfar na pratica</div>{[{e:"🧘",t:"Observe sem agir",d:"Quando a emocao chegar, pause antes de fazer qualquer coisa"},{e:"📍",t:"Localize no corpo",d:"Onde voce sente essa emocao? Descreva sem julgar"},{e:"🌬️",t:"Respire com ela",d:"Nao para eliminar — para acompanhar"},{e:"⏱️",t:"Espere o pico",d:"A maioria das emocoes intensas dura menos de 90 segundos no pico"}].map(({e,t,d})=>(<div key={t} style={{display:"flex",gap:10,alignItems:"flex-start",background:"white",borderRadius:8,padding:"8px 12px",marginBottom:6,border:"1px solid #fbcfe8"}}><span style={{fontSize:20,flexShrink:0}}>{e}</span><div><div style={{fontSize:12,fontWeight:600,color:"#831843",marginBottom:2}}>{t}</div><div style={{fontSize:11,color:"#9d174d",lineHeight:1.5}}>{d}</div></div></div>))}</div>
    <div style={{background:BG,padding:"16px 20px",borderTop:`2px solid ${COR}`}}><div style={{color:"#831843",fontSize:13,fontWeight:600,marginBottom:12}}>Suas reflexoes</div>{PERGUNTAS.map((p,i)=>(<div key={i} style={{marginBottom:14}}><div style={{display:"flex",gap:8,marginBottom:6}}><div style={{width:22,height:22,borderRadius:"50%",background:COR,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div><div style={{fontSize:12,fontWeight:500,color:"#831843",lineHeight:1.5}}>{p}</div></div><textarea value={respostas[i]} onChange={e=>{const r=[...respostas];r[i]=e.target.value;setRespostas(r);}} placeholder="Escreva sua reflexao..." style={{width:"100%",minHeight:70,padding:"8px 10px",borderRadius:8,border:`1px solid ${COR}50`,fontSize:13,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></div>))}<button onClick={enviarWhatsApp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:COR,color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>📲 Enviar reflexoes pelo WhatsApp</button></div>
    <div style={{textAlign:"center",fontSize:11,color:"#888780",marginTop:8}}>Dra. Lucia Kratz · Psicologa · CRP 09/20590</div>
  </div>);
}

function PsicoSurfandoOndaEmocao({cat}){return <PsicoSurfarOndaEmocao cat={cat}/>;}


const PSICO_VISUAIS = {
  // macro_ansiedade — originais (página única, sem navegação)
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
  "O Alarme Falso do Cérebro": PsicoAlarme,
  "Pensamentos São Eventos, Não Factos": PsicoPensamentosSaoEventos,
  "A Curva do Pânico": PsicoCurvaPanico,
  // macro_casais — página única com perguntas + WhatsApp
  "Por Que Discutimos Sobre Dinheiro — Quando Não é Realmente Sobre Dinheiro": PsicoDiscutirDinheiro,
  "Por Que Perder-se no Outro Não É Amor — É Fusão": PsicoFusaoCasal,
  "A Triangulação — Quando Usamos Terceiros para Evitar Conversas Difíceis": PsicoTriangulacao,
  "O Mito do Pai/Mãe Perfeito — E o Custo Real do Perfeccionismo Parental": PsicoPaisPerfeitos,
  "O Desejo Não Desaparece — Adormece": PsicoDesejoAdormece,
  // macro_relacionamentos
  "Ouvir É Uma Competência — E a Maioria de Nós Não Aprendeu": PsicoOuvirCompetencia,
  "Por Que as Nossas Palavras Ferem Mais do que Queremos?": PsicoPalavrasFerem,
  "O Tango do Conflito — Por Que Discutimos Sempre Pela Mesma Razão": PsicoTangoConflito,
  "Limites Não São Muros — São Portas com Chave": PsicoLimitesPortas,
  "A Carga que Não Se Vê — O que É a Carga Mental": PsicoCargaMental,
  // macro_corpo
  "Por Que Não Basta Tratar Um Sintoma — A Visão Integral da Saúde": PsicoVisaoIntegral,
  "A Escada de Segurança — Como o Seu Sistema Nervoso Decide se Está em Perigo": PsicoEscadaSeguranca,
  "O Corpo Não Mente — A Linguagem Física das Emoções Não Expressas": PsicoCorpoNaoMente,
  "Onde Está a Sua Mente Quando o Seu Corpo Está Aqui — A Ciência da Presença": PsicoCienciaPresenca,
  // macro_habitos
  "O Ciclo do Alívio Falso": PsicoCicloAlivioFalso,
  "A \"Limpeza Noturna\" do Cérebro": PsicoLimpezaNoturna,
  "A regra dos 5 minutos": PsicoRegra5Minutos,
  "Sinais de desgaste emocional": PsicoSinaisDesgaste,
  "Agir antes de ter vontade": PsicoAgirantesVontade,
  "O Mito da Bateria Infinita": PsicoMitoBateriaInfinita,
  "O Poder do 1% Diário": PsicoPoder1Porcento,
  "O diário de pequenas vitórias": PsicoDiarioPequenasVitorias,
  // macro_humor
  "Para que Servem as Emoções?": PsicoParaQueServemEmocoes,
  "Autocompaixão": PsicoAutocompaixao,
  "Ação Gera Motivação": PsicoAcaoGeraMotivacao,
  "O Cérebro Sequestrado": PsicoCerebroSequestrado,
  "O filtro negativo da mente": PsicoFiltroNegativo,
  "O Juiz Interno vs. O Treinador": PsicoJuizInternoTreinador,
  "A roda das emoções": PsicoRodaEmocoes,
  "Surfar a Onda da Emoção": PsicoSurfarOndaEmocao,
  "Surfando a onda da emoção": PsicoSurfandoOndaEmocao,
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


  async function atualizarVisuaisFirebase() {
    if(!confirm("Salvar visualKey nos documentos do Firebase. Continuar?")) return;
    setSalvando(true);
    const MAPA = {
      "Preocupação produtiva vs. improdutiva":        { visualKey:"Preocupação produtiva vs. improdutiva", tipo:"visual" },
      "A armadilha do pior cenário":                  { visualKey:"A armadilha do pior cenário", tipo:"visual" },
      "Eustresse vs. distresse":                      { visualKey:"Eustresse vs. distresse", tipo:"visual" },
      "O ciclo da ansiedade":                         { visualKey:"O ciclo da ansiedade", tipo:"visual" },
      "Desmontar o Circuito Cerebral da Ansiedade":   { visualKey:"Desmontar o Circuito Cerebral da Ansiedade", tipo:"visual" },
      "O modelo ABC na prática":                      { visualKey:"O modelo ABC na prática", tipo:"visual" },
      "O poder dos pensamentos":                      { visualKey:"O poder dos pensamentos", tipo:"visual" },
      "A pizza da responsabilidade":                  { visualKey:"A pizza da responsabilidade", tipo:"visual" },
      "Fatos vs. interpretações":                     { visualKey:"Fatos vs. interpretações", tipo:"visual" },
      "O perigo do sempre e nunca":                   { visualKey:"O perigo do sempre e nunca", tipo:"visual" },
      "7 Distorções de Pensamento":                   { visualKey:"7 Distorções de Pensamento", tipo:"visual" },
      "O Alarme Falso do Cérebro":                    { visualKey:"O Alarme Falso do Cérebro", tipo:"visual" },
      "Pensamentos São Eventos, Não Factos":          { visualKey:"Pensamentos São Eventos, Não Factos", tipo:"visual" },
      "Por Que Discutimos Sobre Dinheiro — Quando Não é Realmente Sobre Dinheiro": { visualKey:"Por Que Discutimos Sobre Dinheiro — Quando Não é Realmente Sobre Dinheiro", tipo:"visual" },
      "Por Que Perder-se no Outro Não É Amor — É Fusão": { visualKey:"Por Que Perder-se no Outro Não É Amor — É Fusão", tipo:"visual" },
      "A Triangulação — Quando Usamos Terceiros para Evitar Conversas Difíceis": { visualKey:"A Triangulação — Quando Usamos Terceiros para Evitar Conversas Difíceis", tipo:"visual" },
      "O Mito do Pai/Mãe Perfeito — E o Custo Real do Perfeccionismo Parental": { visualKey:"O Mito do Pai/Mãe Perfeito — E o Custo Real do Perfeccionismo Parental", tipo:"visual" },
      "O Desejo Não Desaparece — Adormece":           { visualKey:"O Desejo Não Desaparece — Adormece", tipo:"visual" },
    };
    try {
      const snap = await db.collection("clinica_psicoeducacao").get();
      const batch = db.batch();
      let count = 0;
      snap.docs.forEach(d => {
        const dados = MAPA[d.data().titulo];
        if(dados) { batch.update(d.ref, dados); count++; }
      });
      if(count===0){ alert("Nenhum documento encontrado com os títulos mapeados."); setSalvando(false); return; }
      await batch.commit();
      alert("✅ "+count+" psicoeducações atualizadas!");
    } catch(e){ alert("Erro: "+e.message); }
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
          {itens.length>0&&(
            <button className="btn btn-outline" style={{fontSize:12,background:"#f3e6ff",borderColor:"#7B00C4",color:"#7B00C4"}} onClick={atualizarVisuaisFirebase} disabled={salvando}>
              <Icon name="zap" size={14}/> Ativar visuais
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
      const subIds = new Set(macro.subs.map(s=>s.id));
      const legadoIds = new Set(
        Object.entries(LEGADO_PARA_MACRO)
          .filter(([,macroId])=>macroId===filtroCateg)
          .map(([legId])=>legId)
      );
      // Inferir macro pelo LEGADO_PARA_MACRO para a categoria do recurso
      const macroInferida = LEGADO_PARA_MACRO[r.categoria] || LEGADO_PARA_MACRO[r.formularioKey] || r.categoria;
      cOk = r.categoria === filtroCateg
         || macroInferida === filtroCateg
         || subIds.has(r.categoria)
         || legadoIds.has(r.categoria)
         || legadoIds.has(r.formularioKey);
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
// PLACEHOLDER_NOVOS_COMPONENTES
