<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Atividade Terapêutica — Dra. Lucia Kratz</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600,700&family=Inter:wght@300,400,500,600,700&display=swap" rel="stylesheet"/>
  <script src="https://unpkg.com/lucide@0.383.0/dist/umd/lucide.min.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    :root {
      --purple:#7B00C4; --purple-soft:#f3e6ff; --gray-100:#f3f4f6;
      --gray-200:#e5e7eb; --gray-400:#9ca3af; --gray-600:#4b5563;
      --gray-700:#374151; --text-muted:#6b7280; --font-body:'Inter',sans-serif;
      --font-display:'Dancing Script',cursive;
    }
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:var(--font-body);background:#f8f4ff;min-height:100vh;color:#1f2937;}
    .header{background:linear-gradient(135deg,#7B00C4,#5a0090);color:white;padding:14px 20px;
      position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(123,0,196,0.3);}
    .header-logo{font-family:var(--font-display);font-size:20px;font-weight:700;}
    .header-sub{font-size:11px;opacity:0.8;}
    .container{max-width:680px;margin:0 auto;padding:20px 16px 60px;}
    .card{background:white;border-radius:14px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:16px;}
    .btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:10px;
      border:none;cursor:pointer;font-family:var(--font-body);font-size:14px;font-weight:600;transition:all .2s;}
    .btn-purple{background:var(--purple);color:white;}
    .btn-ghost{background:white;color:var(--gray-700);border:1.5px solid var(--gray-200);}
    .btn-outline{background:white;color:var(--purple);border:1.5px solid var(--purple);}
    .form-input{width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:10px;
      font-family:var(--font-body);font-size:14px;outline:none;transition:border-color .2s;}
    .form-input:focus{border-color:var(--purple);}
    .form-label{display:block;font-size:12px;font-weight:600;color:var(--gray-600);
      margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;}
    .spinner{width:36px;height:36px;border:3px solid var(--purple-soft);border-top-color:var(--purple);
      border-radius:50%;animation:spin .7s linear infinite;margin:40px auto;}
    @keyframes spin{to{transform:rotate(360deg);}}
    .aviso-login{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;
      padding:12px 16px;font-size:12px;color:#1e40af;line-height:1.6;margin-bottom:16px;}
    textarea.form-input{resize:vertical;}
    @media(max-width:480px){.container{padding:12px 12px 40px;}}
  </style>
</head>
<body>
<div class="header">
  <div class="header-logo">🦋 Dra. Lucia Kratz</div>
  <div class="header-sub">CRP 09/20590 · Atividade Terapêutica</div>
</div>
<div id="root"></div>

<script>
const firebaseConfig={apiKey:"AIzaSyC6oKRnBmWCWuQDMKnfWLjNPSNKDV_QpKM",authDomain:"entrevista-inicial.firebaseapp.com",projectId:"entrevista-inicial",storageBucket:"entrevista-inicial.appspot.com",messagingSenderId:"1030688430982",appId:"1:1030688430982:web:df18eb5b1dd4b53c1f70f3"};
if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();
</script>

<script type="text/babel">
const {useState,useEffect,useRef}=React;

function Icon({name,size=18,style}){
  const ref=useRef(null);
  useEffect(()=>{
    try{if(!ref.current||!window.lucide)return;ref.current.innerHTML="";
      const n=name.replace(/-([a-z])/g,(_,l)=>l.toUpperCase()).replace(/^./,s=>s.toUpperCase());
      const fn=lucide[n];if(!fn)return;
      const ic=lucide.createElement(fn);if(ic){ic.setAttribute("width",size);ic.setAttribute("height",size);ic.setAttribute("stroke-width","1.8");ref.current.appendChild(ic);}
    }catch(e){}
  },[name,size]);
  return <span ref={ref} style={{display:"inline-flex",alignItems:"center",...(style||{})}}/>;
}

// ── TextArea simples (sem voz) ────────────────────────────────────────────────
function TextAreaVoz({value,onChange,placeholder,rows=3,style,className}){
  return <textarea className={className||"form-input"} value={value} onChange={onChange}
    placeholder={placeholder} rows={rows} style={style}/>;
}

// ── Ferramenta Árvore da Decisão ──────────────────────────────────────────────
function FerramentaArvore({user}){
  const [step,setStep]=useState("home");
  const [preocupacao,setPreocupacao]=useState("");
  const [acoes,setAcoes]=useState("");
  const [plano,setPlano]=useState("");
  const [conclusao,setConclusao]=useState(null);

  function reiniciar(){setStep("home");setPreocupacao("");setAcoes("");setPlano("");setConclusao(null);}

  function salvarHistorico(c){
    if(user&&user.id){
      try{db.collection("clinica_arvore_decisao").add({
        pacienteId:user.id,pacienteNome:user.nome||"",
        preocupacao,acoes,plano,conclusao:c,
        data:new Date().toLocaleDateString("pt-BR"),
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });}catch(e){}
    }
    setConclusao(c);setStep("conclusao");
  }

  const CONCLUSOES={
    redirect:{emoji:"🌿",titulo:"Redirecione sua atenção",desc:"Esta situação está fora do seu controle agora. Direcione sua energia para algo que possa fazer.",cor:"#0891b2",bg:"#e0f2fe"},
    "act-now":{emoji:"⚡",titulo:"Realize esta tarefa agora!",desc:"Você identificou uma ação que pode ser feita agora. Coloque-a em prática!",cor:"#059669",bg:"#d1fae5"},
    plan:{emoji:"📋",titulo:"Siga o seu plano",desc:"Você tem um plano para agir no momento certo. Confie nele e direcione sua atenção.",cor:"#d97706",bg:"#fef3c7"},
  };

  if(step==="home") return(
    <div className="card" style={{textAlign:"center",padding:"24px 20px"}}>
      <div style={{fontSize:48,marginBottom:12}}>🌳</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>Árvore da Decisão</div>
      <p style={{fontSize:13,color:"#6b7280",marginBottom:24,lineHeight:1.6}}>Uma técnica da TCC para transformar preocupações em ações concretas — distinguindo o que está ou não no seu controle.</p>
      <button className="btn btn-purple" style={{fontSize:15,padding:"12px 32px"}} onClick={()=>setStep("worry")}>Iniciar exercício →</button>
    </div>
  );
  if(step==="worry") return(
    <div className="card">
      <div style={{fontWeight:600,marginBottom:8}}>Qual é a sua preocupação agora?</div>
      <TextAreaVoz rows={4} value={preocupacao} onChange={e=>setPreocupacao(e.target.value)} placeholder="Descreva o que está te preocupando..."/>
      <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
        <button className="btn btn-ghost" onClick={()=>setStep("home")}>Voltar</button>
        <button className="btn btn-purple" onClick={()=>setStep("can-intervene")} disabled={!preocupacao.trim()}>Próximo →</button>
      </div>
    </div>
  );
  if(step==="can-intervene") return(
    <div className="card">
      <div style={{fontWeight:600,marginBottom:8}}>Você pode fazer algo para resolver esta preocupação?</div>
      <p style={{fontSize:13,color:"#6b7280",marginBottom:20}}>Pense se existe alguma ação concreta que você pode tomar.</p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <button className="btn btn-purple" style={{flex:1,padding:16,justifyContent:"center"}} onClick={()=>setStep("actions")}>✅ Sim, posso agir</button>
        <button className="btn btn-outline" style={{flex:1,padding:16,justifyContent:"center"}} onClick={()=>salvarHistorico("redirect")}>❌ Não está no meu controle</button>
      </div>
    </div>
  );
  if(step==="actions") return(
    <div className="card">
      <div style={{fontWeight:600,marginBottom:8}}>Quais ações você pode tomar?</div>
      <TextAreaVoz rows={3} value={acoes} onChange={e=>setAcoes(e.target.value)} placeholder="Liste as ações possíveis..."/>
      <div style={{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}}>
        <button className="btn btn-ghost" onClick={()=>setStep("can-intervene")}>Voltar</button>
        <button className="btn btn-purple" onClick={()=>setStep("can-act-now")} disabled={!acoes.trim()}>Próximo →</button>
      </div>
    </div>
  );
  if(step==="can-act-now") return(
    <div className="card">
      <div style={{fontWeight:600,marginBottom:8}}>Você pode realizar alguma dessas ações agora?</div>
      <div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap"}}>
        <button className="btn btn-purple" style={{flex:1,padding:16,justifyContent:"center"}} onClick={()=>salvarHistorico("act-now")}>⚡ Sim, agora</button>
        <button className="btn btn-outline" style={{flex:1,padding:16,justifyContent:"center"}} onClick={()=>setStep("plan")}>📋 Preciso planejar</button>
      </div>
    </div>
  );
  if(step==="plan") return(
    <div className="card">
      <div style={{fontWeight:600,marginBottom:8}}>Crie um plano de ação:</div>
      <TextAreaVoz rows={3} value={plano} onChange={e=>setPlano(e.target.value)} placeholder="Quando e como você vai agir?"/>
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
        <div className="card" style={{background:c.bg,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:8}}>{c.emoji}</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:c.cor,marginBottom:8}}>{c.titulo}</div>
          <p style={{fontSize:13,color:"#6b7280"}}>{c.desc}</p>
        </div>
        <div className="card" style={{fontSize:13,color:"#6b7280"}}>
          <div style={{fontWeight:600,color:"#374151",marginBottom:4}}>Sua preocupação:</div>
          <div style={{marginBottom:10}}>{preocupacao}</div>
          {acoes&&<><div style={{fontWeight:600,color:"#374151",marginBottom:4}}>Ações identificadas:</div><div>{acoes}</div></>}
        </div>
        <button className="btn btn-purple" style={{width:"100%",justifyContent:"center"}} onClick={reiniciar}>Nova preocupação</button>
      </div>
    );
  }
  return null;
}

// ── Ferramenta ABC de Pensamentos ─────────────────────────────────────────────
function FerramentaABC({user}){
  const EMOCOES=["Ansiedade","Tristeza","Raiva","Medo","Vergonha","Culpa","Frustração","Insegurança","Alívio","Esperança"];
  const [passo,setPasso]=useState(1);
  const [draft,setDraft]=useState({situacao:"",pensamento:"",emocao:"",intensidade:60,alternativo:""});

  const PASSOS=[
    {n:1,letra:"A",titulo:"Situação",cor:"#3b82f6",bg:"#dbeafe",placeholder:"Ex: Meu chefe me chamou para uma conversa inesperada...",dica:"Descreva o que aconteceu de forma objetiva."},
    {n:2,letra:"B",titulo:"Pensamento Automático",cor:"#7c3aed",bg:"#ede9fe",placeholder:"Ex: Devo ter cometido um erro grave...",dica:"Qual foi o primeiro pensamento que surgiu?"},
    {n:3,letra:"C",titulo:"Emoção e Intensidade",cor:"#d97706",bg:"#fef3c7",placeholder:"",dica:"Nomeie a emoção principal e avalie a intensidade."},
    {n:4,letra:"D",titulo:"Resposta Racional",cor:"#059669",bg:"#dcfce7",placeholder:"Ex: Pode ser apenas um feedback de rotina...",dica:"Questione o pensamento. Há uma forma mais equilibrada de ver isso?"},
  ];
  const pi=PASSOS[passo-1];
  const intCor=draft.intensidade<34?"#059669":draft.intensidade<67?"#d97706":"#dc2626";

  function salvar(){
    if(user&&user.id){
      try{db.collection("clinica_tcc").add({
        pacienteId:user.id,pacienteNome:user.nome||"",
        situacao:draft.situacao,pensamento:draft.pensamento,emocao:draft.emocao,
        intensidade:draft.intensidade,alternativo:draft.alternativo,
        data:new Date().toLocaleDateString("pt-BR"),
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });}catch(e){}
    }
    setPasso(5);
  }

  if(passo===5) return(
    <div className="card" style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:48,marginBottom:12}}>⚖️</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,color:"var(--purple)",marginBottom:8}}>Registro salvo!</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24,lineHeight:1.6}}>Identificar pensamentos automáticos é um dos exercícios mais poderosos da TCC. 💜</div>
      <button className="btn btn-purple" onClick={()=>{setDraft({situacao:"",pensamento:"",emocao:"",intensidade:60,alternativo:""});setPasso(1);}}>Novo registro</button>
    </div>
  );

  return(
    <div className="card">
      <div style={{display:"flex",gap:6,marginBottom:20}}>
        {PASSOS.map(p=><div key={p.n} style={{flex:1,height:4,borderRadius:4,background:p.n<=passo?p.cor:"var(--gray-100)",transition:"background .2s"}}/>)}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{width:44,height:44,borderRadius:12,background:pi.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontWeight:900,fontSize:18,color:pi.cor}}>{pi.letra}</span>
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:15}}>{pi.titulo}</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>{pi.dica}</div>
        </div>
      </div>
      {passo<=2&&<TextAreaVoz rows={3} value={draft[passo===1?"situacao":"pensamento"]} onChange={e=>setDraft({...draft,[passo===1?"situacao":"pensamento"]:e.target.value})} placeholder={pi.placeholder}/>}
      {passo===3&&(
        <div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
            {EMOCOES.map(em=>{const sel=draft.emocao===em;return(
              <button key={em} onClick={()=>setDraft({...draft,emocao:em})} style={{padding:"7px 14px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontFamily:"inherit",fontSize:13,borderColor:sel?pi.cor:"var(--gray-200)",background:sel?pi.bg:"white",color:sel?pi.cor:"var(--text-muted)",fontWeight:sel?700:400}}>{em}</button>
            );})}
          </div>
          {draft.emocao&&(<div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
              <span style={{fontWeight:600}}>Intensidade</span>
              <span style={{fontWeight:700,color:intCor}}>{draft.intensidade}%</span>
            </div>
            <input type="range" min={0} max={100} value={draft.intensidade} onChange={e=>setDraft({...draft,intensidade:+e.target.value})} style={{width:"100%",accentColor:pi.cor}}/>
          </div>)}
        </div>
      )}
      {passo===4&&<TextAreaVoz rows={3} value={draft.alternativo} onChange={e=>setDraft({...draft,alternativo:e.target.value})} placeholder={pi.placeholder}/>}
      <div style={{display:"flex",gap:10,marginTop:20}}>
        {passo>1&&<button className="btn btn-ghost" style={{flex:1}} onClick={()=>setPasso(passo-1)}>← Anterior</button>}
        {passo<4&&<button className="btn btn-purple" style={{flex:2,justifyContent:"center"}} disabled={(passo===1&&!draft.situacao)||(passo===2&&!draft.pensamento)||(passo===3&&!draft.emocao)} onClick={()=>setPasso(passo+1)}>Próximo →</button>}
        {passo===4&&<button className="btn btn-purple" style={{flex:2,justifyContent:"center"}} onClick={salvar}>Salvar Registro ✓</button>}
      </div>
    </div>
  );
}

// ── Ferramenta Genérica ──────────────────────────────────────────────────────
function FerramentaGenerica({recurso,user,onConcluido}){
  return(
    <div className="card" style={{textAlign:"center",padding:"32px 20px"}}>
      <div style={{fontSize:48,marginBottom:12}}>🧠</div>
      <div style={{fontFamily:"var(--font-display)",fontSize:20,color:"var(--purple)",marginBottom:8}}>{recurso.titulo||"Ferramenta"}</div>
      {recurso.descricao&&<p style={{fontSize:13,color:"var(--text-muted)",marginBottom:20,lineHeight:1.6}}>{recurso.descricao}</p>}
      {recurso.conteudo&&<div style={{fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap",textAlign:"left",marginBottom:20}}>{recurso.conteudo}</div>}
      <button className="btn btn-purple" style={{width:"100%",justifyContent:"center"}} onClick={onConcluido}>✓ Concluído</button>
    </div>
  );
}

// ── Fábula pública ────────────────────────────────────────────────────────────
function FabulaPublica({fabula,user,onConcluido}){
  const [idx,setIdx]=useState(0);
  const [respostas,setRespostas]=useState({});
  const [etapa,setEtapa]=useState("leitura");
  const paginas=fabula.paginas||[];
  const perguntas=fabula.perguntas||[];

  async function salvar(){
    if(user?.id){
      try{await db.collection("clinica_reflexoes").add({
        pacienteId:user.id,pacienteNome:user.nome||"",
        fabulaId:fabula.id||"",fabulaTitulo:fabula.titulo||"",
        registros:perguntas.map((p,i)=>({pergunta:p,resposta:respostas[i]||""})),
        data:new Date().toLocaleDateString("pt-BR"),
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });}catch(e){}
    }
    onConcluido();
  }

  if(etapa==="reflexao") return(
    <div className="card">
      <div style={{fontWeight:700,fontSize:16,color:"var(--purple)",marginBottom:4}}>💭 Reflexões — {fabula.titulo}</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Responda com calma. Não há resposta certa ou errada.</div>
      {perguntas.map((p,i)=>(
        <div key={i} style={{marginBottom:16}}>
          <label className="form-label">{i+1}. {p}</label>
          <TextAreaVoz rows={3} value={respostas[i]||""} onChange={e=>setRespostas(r=>({...r,[i]:e.target.value}))} placeholder="Escreva sua reflexão aqui..."/>
        </div>
      ))}
      <button className="btn btn-purple" style={{width:"100%",justifyContent:"center"}} onClick={salvar}>💾 Salvar reflexões</button>
    </div>
  );

  return(
    <div>
      <div className="card" style={{background:"var(--purple)",color:"white",textAlign:"center",padding:"24px 20px"}}>
        <div style={{fontSize:48,marginBottom:8}}>{fabula.emoji||"📖"}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,marginBottom:6}}>{fabula.titulo}</div>
        {fabula.moral&&<div style={{fontSize:13,fontStyle:"italic",opacity:0.9}}>"{fabula.moral}"</div>}
        <div style={{fontSize:11,opacity:0.7,marginTop:8}}>Página {idx+1} de {paginas.length}</div>
      </div>
      {paginas[idx]&&<div className="card"><p style={{fontSize:14,lineHeight:1.9,color:"var(--gray-700)"}}>{paginas[idx]}</p></div>}
      <div style={{display:"flex",gap:10}}>
        {idx>0&&<button className="btn btn-ghost" style={{flex:1}} onClick={()=>setIdx(i=>i-1)}>← Anterior</button>}
        {idx<paginas.length-1
          ?<button className="btn btn-purple" style={{flex:2,justifyContent:"center"}} onClick={()=>setIdx(i=>i+1)}>Próxima página →</button>
          :<button className="btn btn-purple" style={{flex:2,justifyContent:"center"}} onClick={()=>perguntas.length>0?setEtapa("reflexao"):onConcluido()}>
            {perguntas.length>0?"💭 Reflexões →":"✓ Concluído"}
          </button>
        }
      </div>
    </div>
  );
}

// ── Psicoeducação pública ────────────────────────────────────────────────────
function PsicoeducacaoPublica({item,user,onConcluido}){
  const [respostas,setRespostas]=useState(["","",""]);
  const perguntas=item.perguntas||["O que mais te marcou neste conteúdo?","Como isso se conecta com algo que você vive hoje?","Que pequena mudança você pode tentar esta semana?"];

  async function salvar(){
    if(user?.id){
      try{await db.collection("clinica_reflexoes").add({
        pacienteId:user.id,pacienteNome:user.nome||"",
        psicoeducacaoId:item.id||"",psicoeducacaoTitulo:item.titulo||"",
        registros:perguntas.map((p,i)=>({pergunta:p,resposta:respostas[i]||""})),
        data:new Date().toLocaleDateString("pt-BR"),
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });}catch(e){}
    }
    onConcluido();
  }

  return(
    <div>
      <div className="card" style={{background:"var(--purple)",color:"white",textAlign:"center",padding:"24px 20px"}}>
        <div style={{fontSize:48,marginBottom:8}}>{item.emoji||"📚"}</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,marginBottom:6}}>{item.titulo}</div>
        {item.descricao&&<div style={{fontSize:13,opacity:0.85}}>{item.descricao}</div>}
      </div>
      {item.conteudo&&<div className="card"><div style={{fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{item.conteudo}</div></div>}
      <div className="card">
        <div style={{fontWeight:700,fontSize:15,marginBottom:4,color:"var(--purple)"}}>💭 Reflexões</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>Suas respostas vão para o seu prontuário.</div>
        {perguntas.map((p,i)=>(
          <div key={i} style={{marginBottom:16}}>
            <label className="form-label">{i+1}. {p}</label>
            <TextAreaVoz rows={3} value={respostas[i]} onChange={e=>setRespostas(r=>{const n=[...r];n[i]=e.target.value;return n;})} placeholder="Escreva sua reflexão aqui..."/>
          </div>
        ))}
        <button className="btn btn-purple" style={{width:"100%",justifyContent:"center"}} onClick={salvar}>💾 Salvar e concluir</button>
      </div>
    </div>
  );
}

// ── App principal ─────────────────────────────────────────────────────────────
function App(){
  const [estado,setEstado]=useState("carregando");
  const [dadosLink,setDadosLink]=useState(null);
  const [recurso,setRecurso]=useState(null);
  const [paciente,setPaciente]=useState(null);
  const [concluido,setConcluido]=useState(false);
  const token=new URLSearchParams(window.location.search).get("token");

  useEffect(()=>{
    if(!token){setEstado("erro");return;}
    carregar();
  },[]);

  async function carregar(){
    try{
      const snap=await db.collection("clinica_links_partilhados").where("token","==",token).limit(1).get();
      if(snap.empty){setEstado("erro");return;}
      const link={id:snap.docs[0].id,...snap.docs[0].data()};
      setDadosLink(link);
      if(link.pacienteId){
        const ps=await db.collection("clinica_pacientes").doc(link.pacienteId).get();
        if(ps.exists)setPaciente({id:ps.id,...ps.data()});
      }
      const tipo=link.tipo||"ferramenta";
      const partes=(link.tipoFerramenta||"").split(":");
      const recursoId=partes.slice(1).join(":");
      if(tipo==="ferramenta"){
        // Tentar buscar por ID direto
        let r=null;
        try{const rs=await db.collection("clinica_recursos").doc(recursoId).get();if(rs.exists)r={id:rs.id,...rs.data()};}catch(e){}
        if(!r){
          const rs2=await db.collection("clinica_recursos").where("formularioKey","==",recursoId).limit(1).get();
          if(!rs2.empty)r={id:rs2.docs[0].id,...rs2.docs[0].data()};
          else r={id:recursoId,formularioKey:recursoId,titulo:link.nomeRecurso||recursoId};
        }
        setRecurso(r);setEstado("ferramenta");
      } else if(tipo==="fabula"){
        const fs=await db.collection("clinica_fabulas").doc(recursoId).get();
        if(fs.exists){setRecurso({id:fs.id,...fs.data()});setEstado("fabula");}
        else setEstado("erro");
      } else if(tipo==="psicoeducacao"){
        const ps=await db.collection("clinica_psicoeducacao").doc(recursoId).get();
        if(ps.exists){setRecurso({id:ps.id,...ps.data()});setEstado("psicoeducacao");}
        else setEstado("erro");
      } else setEstado("erro");
    }catch(e){console.error(e);setEstado("erro");}
  }

  async function marcarRespondido(){
    if(!dadosLink?.id)return;
    try{await db.collection("clinica_links_partilhados").doc(dadosLink.id).update({status:"respondido",respondidoEm:firebase.firestore.FieldValue.serverTimestamp()});}catch(e){}
  }

  function concluir(){marcarRespondido();setConcluido(true);}

  const user=paciente||{id:dadosLink?.pacienteId,nome:dadosLink?.pacienteNome};
  const nomePaciente=user?.nome?.split(" ")[0]||"você";

  if(estado==="carregando") return(
    <div className="container">
      <div className="card" style={{textAlign:"center",padding:40}}>
        <div className="spinner"/>
        <div style={{color:"var(--text-muted)",fontSize:14}}>Carregando sua atividade...</div>
      </div>
    </div>
  );

  if(estado==="erro") return(
    <div className="container">
      <div className="card" style={{textAlign:"center",padding:40}}>
        <div style={{fontSize:48,marginBottom:16}}>😕</div>
        <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>Link não encontrado</div>
        <div style={{color:"var(--text-muted)",fontSize:14,lineHeight:1.6}}>Este link pode ter expirado ou sido substituído por um novo.<br/>Entre em contato com a Dra. Lucia Kratz para receber um novo link.</div>
      </div>
    </div>
  );

  if(concluido) return(
    <div className="container">
      <div className="card" style={{textAlign:"center",padding:40}}>
        <div style={{fontSize:52,marginBottom:16}}>✅</div>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--purple)",marginBottom:8}}>Muito bem, {nomePaciente}!</div>
        <div style={{color:"var(--text-muted)",fontSize:14,lineHeight:1.7}}>Sua resposta foi registrada e a Dra. Lucia já pode visualizar no prontuário.<br/>Pode fechar esta janela. 💜</div>
      </div>
    </div>
  );

  const k=recurso?.formularioKey||"";

  return(
    <div className="container">
      <div className="aviso-login">
        💡 <strong>Dica:</strong> Faça login no app para ver seu histórico completo.&nbsp;
        <a href="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/" style={{color:"var(--purple)",fontWeight:600}}>Acessar o app →</a>
      </div>

      {estado==="ferramenta"&&recurso&&(
        k==="decision-tree"?<FerramentaArvore user={user}/>:
        k==="abc-record"?<FerramentaABC user={user}/>:
        <FerramentaGenerica recurso={recurso} user={user} onConcluido={concluir}/>
      )}

      {estado==="fabula"&&recurso&&<FabulaPublica fabula={recurso} user={user} onConcluido={concluir}/>}
      {estado==="psicoeducacao"&&recurso&&<PsicoeducacaoPublica item={recurso} user={user} onConcluido={concluir}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
</script>
</body>
</html>
