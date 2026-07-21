// ═══════════════════════════════════════════════════════
//  psifabulas.js — Fábulas Terapêuticas + Ferramentas Clínicas
//  Clínica Dra. Lucia Kratz — CRP 09/20590
//  Carregar 1º no index.html (antes de psicoeducacoes.js e app.js)
// ═══════════════════════════════════════════════════════


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
  {
    id:"macro_compulsao", icone:"🔒", label:"Compulsão Sexual",
    cor:"#7c3aed", bg:"#ede9fe",
    subs:[
      {id:"compulsao_ciclo",     label:"Ciclo do Gatilho e Fissura"},
      {id:"compulsao_habitos",   label:"Substituição de Hábitos"},
      {id:"compulsao_emocional", label:"Regulação Emocional"},
      {id:"compulsao_vinculos",  label:"Impacto nos Vínculos"},
      {id:"compulsao_aval",      label:"Rastreamento e Avaliação"},
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
  const link = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/anamnese-publica/";
  return(
    <div style={{textAlign:"center",padding:"28px 16px"}}>
      <div style={{fontSize:48,marginBottom:12}}>📋</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"#3d006a",marginBottom:8}}>
        Anamnese — Marcos do Desenvolvimento
      </div>
      <div style={{fontSize:13,color:"#6b7280",marginBottom:20,lineHeight:1.6,maxWidth:380,margin:"0 auto 20px"}}>
        O formulário completo de anamnese está disponível em uma página dedicada.<br/>
        Acesse o link abaixo para preencher ou envie para o paciente.
      </div>
      <a href={link} target="_blank" rel="noreferrer"
        style={{display:"inline-flex",alignItems:"center",gap:8,
          background:"#7B00C4",color:"white",padding:"13px 24px",
          borderRadius:12,fontWeight:700,fontSize:14,textDecoration:"none",
          boxShadow:"0 4px 14px rgba(123,0,196,0.35)",marginBottom:12}}>
        📋 Abrir Formulário de Anamnese
      </a>
      <div style={{marginTop:8}}>
        <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{
          navigator.clipboard.writeText(link).then(()=>alert("✅ Link copiado!")).catch(()=>window.prompt("Copie o link:",link));
        }}>🔗 Copiar link para o paciente</button>
      </div>
    </div>
  );
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
function FerramentaRastreamentoCompulsao({ user }) {
  const COR = "#7c3aed";
  const BG  = "#ede9fe";
  const BLOCOS = [
    { id:"A", titulo:"Perda de Controle", icone:"🔄", perguntas:[
      "Tento parar ou reduzir meu comportamento sexual, mas não consigo.",
      "Gasto mais tempo do que pretendia em atividades sexuais ou relacionadas.",
      "Já tentei parar mais de uma vez e voltei ao mesmo padrão.",
      "Sinto que o comportamento é maior do que minha vontade de controlá-lo.",
    ]},
    { id:"B", titulo:"Gatilhos e Fissura", icone:"⚡", perguntas:[
      "Situações de estresse, tédio ou solidão me levam ao comportamento.",
      "Sinto uma tensão crescente antes de ceder, seguida de alívio temporário.",
      "Pensamentos sobre o comportamento aparecem mesmo quando não quero.",
      "O comportamento serve para aliviar emoções difíceis, não apenas por prazer.",
    ]},
    { id:"C", titulo:"Consequências", icone:"💔", perguntas:[
      "O comportamento já afetou meus relacionamentos afetivos.",
      "Já prejudicou meu trabalho, estudos ou compromissos.",
      "Sinto culpa, vergonha ou arrependimento depois do comportamento.",
      "Escondo o comportamento de pessoas próximas.",
    ]},
    { id:"D", titulo:"Escalada", icone:"📈", perguntas:[
      "Preciso de estímulos cada vez mais intensos para obter o mesmo efeito.",
      "O tempo ou frequência dedicados ao comportamento aumentou com o tempo.",
      "Já busquei situações de risco para manter o comportamento.",
    ]},
  ];
  const LABELS = ["Nunca","Raramente","Às vezes","Frequentemente","Quase sempre"];
  const totalQ = BLOCOS.reduce((a,b)=>a+b.perguntas.length,0);
  const [respostas, setRespostas] = React.useState({});
  const [resultado, setResultado] = React.useState(null);
  const [enviando, setEnviando] = React.useState(false);
  const respondidas = Object.keys(respostas).length;
  const scoreTotal = Object.values(respostas).reduce((a,b)=>a+b,0);

  function getNivel(s){
    if(s<=10) return {nivel:"Baixo",   cor:"#059669", texto:"Seu padrão atual não indica compulsão significativa. Continue atento aos seus gatilhos emocionais."};
    if(s<=22) return {nivel:"Moderado",cor:"#d97706", texto:"Há sinais de que o comportamento sexual pode estar sendo usado como regulação emocional. Vale explorar isso com sua psicóloga."};
    if(s<=35) return {nivel:"Elevado", cor:"#dc2626", texto:"Os resultados indicam padrão compulsivo com impacto na sua vida. Este é um ponto importante para trabalhar em terapia."};
    return      {nivel:"Alto",    cor:"#7c3aed", texto:"Os dados sugerem comportamento compulsivo significativo. Seu processo terapêutico pode se beneficiar de atenção específica a este tema."};
  }

  async function enviar(){
    if(respondidas<totalQ) return;
    setEnviando(true);
    const res = getNivel(scoreTotal);
    setResultado({...res, score:scoreTotal});
    try{
      await db.collection("clinica_respostas_ferramentas").add({
        pacienteId:user?.id||"", pacienteNome:user?.nome||"",
        formularioKey:"rastreamento-compulsao-sexual",
        respostas, score:scoreTotal, nivel:res.nivel,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
    }catch(e){console.warn(e);}
    setEnviando(false);
  }

  if(resultado) return(
    <div>
      <div style={{background:resultado.cor,borderRadius:12,padding:"24px",textAlign:"center",color:"white",marginBottom:20}}>
        <div style={{fontSize:40,marginBottom:8}}>🔒</div>
        <div style={{fontSize:13,opacity:0.85,marginBottom:4}}>Nível identificado</div>
        <div style={{fontSize:28,fontWeight:700,marginBottom:8}}>{resultado.nivel}</div>
        <div style={{fontSize:13,opacity:0.9}}>{resultado.score} de 60 pontos</div>
      </div>
      <div style={{background:resultado.cor+"15",border:"1px solid "+resultado.cor+"40",borderRadius:10,padding:"16px 20px",marginBottom:16}}>
        <div style={{fontSize:14,color:"#1f2937",lineHeight:1.7}}>{resultado.texto}</div>
      </div>
      <div style={{background:"#f3e6ff",borderRadius:10,padding:"14px 16px",fontSize:12,color:COR,lineHeight:1.6}}>
        ⚠️ Instrumento de triagem interna — não substitui avaliação clínica formal. Resultado compartilhado com sua psicóloga.
      </div>
    </div>
  );

  let qNum=0;
  return(
    <div>
      <div style={{background:COR,borderRadius:"12px 12px 0 0",padding:"20px",color:"white"}}>
        <div style={{fontSize:13,opacity:0.85,marginBottom:4}}>Rastreamento Clínico Interno</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,marginBottom:4}}>Comportamento Sexual Compulsivo</div>
        <div style={{fontSize:12,opacity:0.8}}>Responda pensando nos últimos 3 meses · {respondidas}/{totalQ} respondidas</div>
      </div>
      <div style={{background:"white",border:"1px solid #e9d5ff",borderRadius:"0 0 12px 12px",padding:"20px",marginBottom:16}}>
        <div style={{width:"100%",height:4,background:"#f3f4f6",borderRadius:20,overflow:"hidden",marginBottom:16}}>
          <div style={{height:"100%",width:(respondidas/totalQ*100)+"%",background:COR,transition:"width .3s"}}/>
        </div>
        <div style={{fontSize:11,color:COR,fontWeight:600,marginBottom:16,textAlign:"center"}}>
          0 = Nunca · 1 = Raramente · 2 = Às vezes · 3 = Frequentemente · 4 = Quase sempre
        </div>
        {BLOCOS.map(bloco=>(
          <div key={bloco.id} style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 12px",background:BG,borderRadius:8}}>
              <span style={{fontSize:16}}>{bloco.icone}</span>
              <div style={{fontSize:12,fontWeight:700,color:COR}}>Bloco {bloco.id} — {bloco.titulo}</div>
            </div>
            {bloco.perguntas.map((p,pi)=>{
              qNum++;
              const key=`${bloco.id}-${pi}`;
              return(
                <div key={key} style={{marginBottom:14,padding:"12px",background:"#fafafa",borderRadius:8,border:"1px solid #f3f4f6"}}>
                  <div style={{fontSize:13,color:"#374151",lineHeight:1.5,marginBottom:8}}>
                    <span style={{fontWeight:600,color:COR}}>{qNum}. </span>{p}
                  </div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {[0,1,2,3,4].map(v=>(
                      <button key={v} onClick={()=>setRespostas(r=>({...r,[key]:v}))}
                        style={{padding:"5px 8px",borderRadius:16,border:"1.5px solid",fontSize:11,cursor:"pointer",fontFamily:"inherit",
                          borderColor:respostas[key]===v?COR:"#e5e7eb",
                          background:respostas[key]===v?COR:"white",
                          color:respostas[key]===v?"white":"#374151",
                          fontWeight:respostas[key]===v?700:400}}>
                        {v} — {LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <button onClick={enviar} disabled={respondidas<totalQ||enviando}
          style={{width:"100%",padding:"14px",borderRadius:10,border:"none",
            background:respondidas<totalQ?"#e5e7eb":COR,
            color:respondidas<totalQ?"#9ca3af":"white",
            fontSize:14,fontWeight:700,cursor:respondidas<totalQ?"not-allowed":"pointer",fontFamily:"inherit"}}>
          {enviando?"Enviando...":respondidas<totalQ?`Responda mais ${totalQ-respondidas} pergunta(s)`:"Ver meu resultado →"}
        </button>
      </div>
    </div>
  );
}


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

    // macro_compulsao
    if(k==="rastreamento-compulsao-sexual") return <FerramentaRastreamentoCompulsao user={user}/>;

    return <div style={{textAlign:"center",padding:40,color:"#6b7280"}}>Ferramenta não configurada.</div>;
  }
  const EMOJIS={relaxamento:"💨",tcc:"🧠",avaliacao:"📋",musicoterapia:"🎵",outro:"🔧"};
  const ICONES_FERRAMENTA={"breathing-478":"💨","muscle-relaxation":"💪","decision-tree":"🌳","abc-record":"📋","anxiety-management":"🎯","emotional-eating":"🍃","entrevista-clinica":"📝","anamnese":"📄","treino-neuro-auditivo":"🎵","diario-terapeutico":"📓","rastreamento-compulsao-sexual":"🔒"};
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
