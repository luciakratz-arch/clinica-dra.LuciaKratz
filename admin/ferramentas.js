,color:"#6b7280",marginBottom:20,lineHeight:1.6}},"Pense se existe alguma ação concreta que você pode tomar."),
    e("div",{style:{display:"flex",gap:12}},
      e("button",{className:"btn btn-purple",style:{flex:1,padding:16},onClick:()=>setStep("actions")},"✅ Sim, posso agir"),
      e("button",{className:"btn btn-outline",style:{flex:1,padding:16},onClick:()=>salvarConclusao("redirect")},"❌ Não está no meu controle")
    )
  );
  if(step==="actions") return e("div",null,
    e("div",{style:{fontWeight:600,marginBottom:8}},"Quais ações você pode tomar?"),
    e("textarea",{className:"form-input",rows:3,value:acoes,onChange:ev=>setAcoes(ev.target.value),placeholder:"Liste as ações possíveis..."}),
    e("div",{style:{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}},
      e("button",{className:"btn btn-ghost",onClick:()=>setStep("can-intervene")},"Voltar"),
      e("button",{className:"btn btn-purple",onClick:()=>setStep("can-act-now"),disabled:!acoes.trim()},"Próximo →")
    )
  );
  if(step==="can-act-now") return e("div",null,
    e("div",{style:{fontWeight:600,marginBottom:8}},"Você pode realizar alguma dessas ações agora?"),
    e("div",{style:{display:"flex",gap:12,marginTop:16}},
      e("button",{className:"btn btn-purple",style:{flex:1,padding:16},onClick:()=>salvarConclusao("act-now")},"⚡ Sim, agora"),
      e("button",{className:"btn btn-outline",style:{flex:1,padding:16},onClick:()=>setStep("plan")},"📋 Preciso planejar")
    )
  );
  if(step==="plan") return e("div",null,
    e("div",{style:{fontWeight:600,marginBottom:8}},"Crie um plano de ação:"),
    e("textarea",{className:"form-input",rows:3,value:plano,onChange:ev=>setPlano(ev.target.value),placeholder:"Quando e como você vai agir?"}),
    e("div",{style:{display:"flex",gap:10,marginTop:16,justifyContent:"flex-end"}},
      e("button",{className:"btn btn-ghost",onClick:()=>setStep("can-act-now")},"Voltar"),
      e("button",{className:"btn btn-purple",onClick:()=>salvarConclusao("plan"),disabled:!plano.trim()},"Finalizar →")
    )
  );
  if(step==="conclusao"&&conclusao){
    const c=CONCLUSOES[conclusao];
    return e("div",null,
      e("div",{style:{background:c.bg,borderRadius:16,padding:28,textAlign:"center",marginBottom:20}},
        e("div",{style:{fontSize:44,marginBottom:8}},c.emoji),
        e("div",{style:{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:c.cor,marginBottom:8}},c.titulo),
        e("p",{style:{fontSize:13,color:"#6b7280",lineHeight:1.6}},c.desc)
      ),
      e("div",{style:{background:"#f9fafb",borderRadius:10,padding:14,marginBottom:16,fontSize:13}},
        e("div",{style:{fontWeight:600,marginBottom:4}},"Sua preocupação:"),
        e("div",{style:{color:"#6b7280",marginBottom:acoes?10:0}},preocupacao),
        acoes&&e("div",null,e("div",{style:{fontWeight:600,marginBottom:4}},"Ações identificadas:"),e("div",{style:{color:"#6b7280"}},acoes)),
        plano&&e("div",{style:{marginTop:10}},e("div",{style:{fontWeight:600,marginBottom:4}},"Seu plano:"),e("div",{style:{color:"#6b7280"}},plano))
      ),
      e("button",{className:"btn btn-purple",style:{width:"100%"},onClick:reiniciar},"↺ Nova preocupação")
    );
  }
  return null;
};

// ── 4. ABC DE PENSAMENTOS ───────────────────────────────────────────────────
window.FerramentaABC = function FerramentaABC(){
  const {useState}=React;
  const EMOCOES=["Ansiedade","Tristeza","Raiva","Medo","Vergonha","Culpa","Frustração","Insegurança"];
  const [entries,setEntries]=useState([]);
  const [draft,setDraft]=useState({situacao:"",pensamento:"",emocao:"",intensidade:50,alternativo:"",showAlt:false});
  const [msg,setMsg]=useState("");

  function salvar(){
    if(!draft.situacao||!draft.pensamento||!draft.emocao){alert("Preencha Situação, Pensamento e Emoção.");return;}
    setEntries(e=>[{...draft,id:Date.now()+"",data:new Date().toLocaleDateString("pt-BR")},...e]);
    setDraft({situacao:"",pensamento:"",emocao:"",intensidade:50,alternativo:"",showAlt:false});
    setMsg("✓ Salvo!");setTimeout(()=>setMsg(""),2000);
  }

  const intColor=draft.intensidade<34?"#059669":draft.intensidade<67?"#d97706":"#dc2626";
  const e=React.createElement;

  return e("div",null,
    e("div",{style:{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:14,marginBottom:20,fontSize:13,lineHeight:1.6}},
      e("strong",{style:{color:"#1d4ed8"}},"📋 Registro ABC · "),
      e("span",{style:{color:"#3b82f6"}},"A (Situação) → B (Pensamento) → C (Emoção/Consequência)")
    ),
    // A
    e("div",{style:{marginBottom:16}},
      e("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6}},
        e("div",{style:{width:24,height:24,borderRadius:"50%",background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#1d4ed8",fontSize:12,flexShrink:0}},"A"),
        e("div",{style:{fontWeight:600,fontSize:13}},"Situação ",e("span",{style:{fontWeight:400,color:"#9ca3af"}},"(Antecedente)"))
      ),
      e("div",{style:{fontSize:11,color:"#9ca3af",marginBottom:6,paddingLeft:32}},"O que aconteceu? Onde, quando, com quem?"),
      e("textarea",{className:"form-input",rows:2,value:draft.situacao,onChange:ev=>setDraft({...draft,situacao:ev.target.value}),placeholder:"Ex: Meu chefe me chamou para conversar..."})
    ),
    // B
    e("div",{style:{marginBottom:16}},
      e("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6}},
        e("div",{style:{width:24,height:24,borderRadius:"50%",background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#7c3aed",fontSize:12,flexShrink:0}},"B"),
        e("div",{style:{fontWeight:600,fontSize:13}},"Pensamento ",e("span",{style:{fontWeight:400,color:"#9ca3af"}},"(Belief)"))
      ),
      e("div",{style:{fontSize:11,color:"#9ca3af",marginBottom:6,paddingLeft:32}},"O que passou pela sua cabeça naquele momento?"),
      e("textarea",{className:"form-input",rows:2,value:draft.pensamento,onChange:ev=>setDraft({...draft,pensamento:ev.target.value}),placeholder:"Ex: Devo ter feito algo errado..."})
    ),
    // C
    e("div",{style:{marginBottom:16}},
      e("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:10}},
        e("div",{style:{width:24,height:24,borderRadius:"50%",background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#d97706",fontSize:12,flexShrink:0}},"C"),
        e("div",{style:{fontWeight:600,fontSize:13}},"Consequência ",e("span",{style:{fontWeight:400,color:"#9ca3af"}},"(Emoção)"))
      ),
      e("div",{style:{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12,paddingLeft:32}},
        EMOCOES.map(em=>e("button",{key:em,onClick:()=>setDraft({...draft,emocao:em}),style:{padding:"4px 12px",borderRadius:20,border:"1px solid",borderColor:draft.emocao===em?"var(--purple)":"#e5e7eb",background:draft.emocao===em?"var(--purple)":"white",color:draft.emocao===em?"white":"#6b7280",fontSize:12,cursor:"pointer",fontWeight:draft.emocao===em?600:400}},em))
      ),
      e("div",{style:{paddingLeft:32}},
        e("div",{style:{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}},
          e("span",{style:{color:"#6b7280"}},"Intensidade"),
          e("span",{style:{fontWeight:700,color:intColor}},draft.intensidade+"/100")
        ),
        e("input",{type:"range",min:0,max:100,value:draft.intensidade,onChange:ev=>setDraft({...draft,intensidade:+ev.target.value}),style:{width:"100%",accentColor:"var(--purple)"}}),
        e("div",{style:{background:"#e5e7eb",borderRadius:20,height:5,marginTop:4}},
          e("div",{style:{background:intColor,height:5,borderRadius:20,width:draft.intensidade+"%",transition:"width .2s"}})
        )
      )
    ),
    // Alternativo
    e("div",{style:{marginBottom:20}},
      e("button",{onClick:()=>setDraft({...draft,showAlt:!draft.showAlt}),style:{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#6b7280",padding:0}},
        "💡 Pensamento alternativo (opcional) ",draft.showAlt?"▲":"▼"
      ),
      draft.showAlt&&e("textarea",{className:"form-input",style:{marginTop:8},rows:2,value:draft.alternativo,onChange:ev=>setDraft({...draft,alternativo:ev.target.value}),placeholder:"Existe outra forma de ver essa situação?"})
    ),
    e("button",{className:"btn btn-purple",style:{width:"100%"},onClick:salvar},msg||"Salvar registro"),
    entries.length>0&&e("div",{style:{marginTop:20}},
      e("div",{style:{fontWeight:600,fontSize:13,marginBottom:10}},entries.length+" registro(s)"),
      entries.map(en=>e("div",{key:en.id,style:{background:"#f9fafb",borderRadius:10,padding:12,marginBottom:8,fontSize:12,border:"1px solid #e5e7eb"}},
        e("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
          e("span",{style:{color:"#6b7280"}},en.data),
          e("span",{style:{background:"var(--purple-soft)",color:"var(--purple)",borderRadius:20,padding:"1px 8px",fontWeight:600}},en.emocao+" "+en.intensidade+"%")
        ),
        e("div",{style:{color:"#374151",marginBottom:2}},e("strong",null,"A: "),en.situacao),
        e("div",{style:{color:"#374151",marginBottom:2}},e("strong",null,"B: "),en.pensamento),
        en.alternativo&&e("div",{style:{color:"#059669"}},e("strong",null,"Alt: "),en.alternativo)
      ))
    )
  );
};

// ── 5. GESTÃO DA ANSIEDADE ──────────────────────────────────────────────────
window.FerramentaGestaoAnsiedade = function FerramentaGestaoAnsiedade(){
  const {useState}=React;
  const TECNICAS=[{id:"resp",label:"Respiração Relaxada",desc:"Inspirar → Pausar → Expirar por 2 min"},{id:"visao",label:"Visão Periférica",desc:"Mover os olhos da direita para a esquerda"},{id:"musc",label:"Relaxamento Muscular",desc:"Contrair músculos 5s e relaxar com suspiro"}];
  const ATIVIDADES=[{id:"caminhada",label:"🚶 Caminhada"},{id:"meditacao",label:"🧘 Meditação"},{id:"diario",label:"📓 Diário emocional"},{id:"musica",label:"🎵 Música calma"},{id:"alongamento",label:"🤸 Alongamento"},{id:"agua",label:"💧 Hidratação"}];
  const PERGUNTAS=["Qual situação está me deixando ansioso(a) agora?","O que está passando na minha cabeça? Qual é o meu pensamento ansioso?","Tenho provas reais de que esse pensamento é 100% verdadeiro?","Quais são as evidências de que esse pensamento pode NÃO ser verdadeiro?","Qual é a probabilidade real de que o pior aconteça?","O que eu diria a um amigo querido com esse mesmo pensamento?","Existe uma forma mais útil de pensar sobre essa situação?","Preocupar-me com isso está me ajudando ou me machucando?"];
  const AREAS=[{id:"interior",label:"Cuidado Interior"},{id:"familiar",label:"Vida Familiar"},{id:"carreira",label:"Carreira"},{id:"social",label:"Vida Social"},{id:"qualidade",label:"Qualidade de Vida"},{id:"saudavel",label:"Vida Saudável"},{id:"financeiro",label:"Financeiro"},{id:"espiritualidade",label:"Espiritualidade"}];
  const STRESS_DESC={1:"Em paz, tranquilo.",2:"Disposto e otimista.",3:"Calmo e confiante.",4:"Um pouco confortável.",5:"Neutro.",6:"Começando a estressar.",7:"Um pouco estressado.",8:"Irritado e inquieto.",9:"Tenso e com energia baixa.",10:"Muito estressado, em pânico."};

  const [aba,setAba]=useState(0);
  const [stress,setStress]=useState(5);
  const [nota,setNota]=useState("");
  const [tracking,setTracking]=useState({});
  const [respostas,setRespostas]=useState(Array(8).fill(""));
  const [roda,setRoda]=useState({});
  const [msg,setMsg]=useState("");
  const [stressLog,setStressLog]=useState([]);

  const stressColor=stress<=3?"#059669":stress<=5?"#d97706":stress<=7?"#f97316":"#dc2626";
  const ABAS=["😰 Estresse","✅ Tracking","🧠 Pensamentos","🎯 Roda da Vida"];
  const e=React.createElement;

  function toggleTrack(id){setTracking(t=>({...t,[id]:!t[id]}));}
  function salvarStress(){
    if(!nota.trim()&&stress===5) return;
    setStressLog(l=>[{nivel:stress,nota,data:new Date().toLocaleDateString("pt-BR"),hora:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})},...l].slice(0,20));
    setMsg("✓ Registrado!");setTimeout(()=>setMsg(""),2000);
  }

  return e("div",null,
    // Abas
    e("div",{style:{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid #e5e7eb",overflowX:"auto"}},
      ABAS.map((n,i)=>e("button",{key:i,onClick:()=>setAba(i),style:{padding:"8px 14px",border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:aba===i?700:400,color:aba===i?"var(--purple)":"#6b7280",borderBottom:aba===i?"2px solid var(--purple)":"2px solid transparent",whiteSpace:"nowrap",fontFamily:"var(--font-body)"}},n))
    ),

    // Aba 0 — Estresse
    aba===0&&e("div",null,
      e("div",{style:{textAlign:"center",marginBottom:20}},
        e("div",{style:{fontSize:72,fontWeight:900,color:stressColor,lineHeight:1}},stress),
        e("div",{style:{fontSize:12,color:"#9ca3af",marginBottom:6}},"/10"),
        e("div",{style:{fontSize:13,fontWeight:600,color:stressColor}},(STRESS_DESC[stress]||""))
      ),
      e("input",{type:"range",min:1,max:10,value:stress,onChange:ev=>setStress(+ev.target.value),style:{width:"100%",accentColor:stressColor,marginBottom:4}}),
      e("div",{style:{display:"flex",justifyContent:"space-between",fontSize:11,color:"#9ca3af",marginBottom:16}},
        e("span","1 – Em paz"),e("span","5 – Neutro"),e("span","10 – Pânico")
      ),
      e("textarea",{className:"form-input",rows:2,value:nota,onChange:ev=>setNota(ev.target.value),placeholder:"Observações sobre este momento...",style:{marginBottom:12}}),
      e("button",{className:"btn btn-purple",style:{width:"100%"},onClick:salvarStress},msg||"Registrar nível"),
      stressLog.length>0&&e("div",{style:{marginTop:20}},
        e("div",{style:{fontWeight:600,fontSize:13,marginBottom:10}}),"Histórico",
        stressLog.map((s,i)=>e("div",{key:i,style:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#f9fafb",borderRadius:8,marginBottom:6,fontSize:12}},
          e("div",{style:{width:32,height:32,borderRadius:"50%",background:s.nivel<=3?"#d1fae5":s.nivel<=6?"#fef3c7":"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:s.nivel<=3?"#059669":s.nivel<=6?"#d97706":"#dc2626",flexShrink:0}},s.nivel),
          e("div",{style:{flex:1}},
            e("div",{style:{color:"#374151"}},s.nota||"Sem observações"),
            e("div",{style:{color:"#9ca3af"}},s.data+" "+s.hora)
          )
        ))
      )
    ),

    // Aba 1 — Tracking
    aba===1&&e("div",null,
      e("div",{style:{fontWeight:600,fontSize:14,marginBottom:14,color:"var(--purple)"}},"Técnicas Anti-Ansiedade"),
      TECNICAS.map(t=>e("div",{key:t.id,onClick:()=>toggleTrack(t.id),style:{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:12,border:"2px solid",borderColor:tracking[t.id]?"var(--purple)":"#e5e7eb",background:tracking[t.id]?"var(--purple-soft)":"white",cursor:"pointer",marginBottom:10,transition:"all .15s"}},
        e("div",{style:{width:28,height:28,borderRadius:"50%",background:tracking[t.id]?"var(--purple)":"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}},tracking[t.id]?"✓":"○"),
        e("div",null,
          e("div",{style:{fontWeight:600,fontSize:13,color:tracking[t.id]?"var(--purple)":"#374151"}},t.label),
          e("div",{style:{fontSize:12,color:"#6b7280"}},t.desc)
        )
      )),
      e("div",{style:{fontWeight:600,fontSize:14,marginBottom:14,marginTop:20,color:"var(--purple)"}},"Outras Atividades"),
      e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
        ATIVIDADES.map(a=>e("div",{key:a.id,onClick:()=>toggleTrack(a.id),style:{padding:"12px",borderRadius:10,border:"1.5px solid",borderColor:tracking[a.id]?"var(--purple)":"#e5e7eb",background:tracking[a.id]?"var(--purple-soft)":"white",cursor:"pointer",fontSize:12,fontWeight:tracking[a.id]?600:400,color:tracking[a.id]?"var(--purple)":"#6b7280",textAlign:"center",transition:"all .15s"}},a.label))
      )
    ),

    // Aba 2 — Pensamentos
    aba===2&&e("div",null,
      e("div",{style:{fontSize:13,color:"#6b7280",marginBottom:16,lineHeight:1.6,background:"#f9f5ff",padding:"12px 14px",borderRadius:10}},"Responda cada pergunta com honestidade. Este exercício ajuda a questionar pensamentos ansiosos."),
      PERGUNTAS.map((p,i)=>e("div",{key:i,style:{marginBottom:16}},
        e("div",{style:{display:"flex",gap:8,marginBottom:6}},
          e("div",{style:{width:22,height:22,borderRadius:"50%",background:"var(--purple-soft)",color:"var(--purple)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}},i+1),
          e("label",{style:{fontSize:13,fontWeight:600,lineHeight:1.4}},p)
        ),
        e("textarea",{className:"form-input",rows:2,value:respostas[i],onChange:ev=>{const r=[...respostas];r[i]=ev.target.value;setRespostas(r);},placeholder:"Sua resposta..."})
      )),
      e("button",{className:"btn btn-purple",style:{width:"100%"},onClick:()=>{setMsg("✓ Pensamentos registrados!");setTimeout(()=>setMsg(""),2000);}},msg||"Salvar respostas")
    ),

    // Aba 3 — Roda da Vida
    aba===3&&e("div",null,
      e("div",{style:{fontSize:13,color:"#6b7280",marginBottom:20,lineHeight:1.6}},"Avalie cada área da sua vida de 0 a 10. Seja honesto(a) sobre o momento atual."),
      AREAS.map(a=>e("div",{key:a.id,style:{marginBottom:16}},
        e("div",{style:{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}},
          e("span",{style:{fontWeight:600}},a.label),
          e("span",{style:{fontWeight:700,color:"var(--purple)"}},(roda[a.id]||0)+"/10")
        ),
        e("input",{type:"range",min:0,max:10,value:roda[a.id]||0,onChange:ev=>setRoda(r=>({...r,[a.id]:+ev.target.value})),style:{width:"100%",accentColor:"var(--purple)",marginBottom:4}}),
        e("div",{style:{background:"#e5e7eb",borderRadius:20,height:6}},
          e("div",{style:{background:"var(--purple)",height:6,borderRadius:20,width:((roda[a.id]||0)/10*100)+"%",transition:"width .2s"}})
        )
      )),
      e("button",{className:"btn btn-purple",style:{width:"100%",marginTop:8},onClick:()=>{setMsg("✓ Roda da Vida salva!");setTimeout(()=>setMsg(""),2000);}},msg||"Salvar Roda da Vida")
    )
  );
};

// ── 6. RASTREAMENTO EMOCIONAL DA ALIMENTAÇÃO ────────────────────────────────
window.FerramentaRastreamento = function FerramentaRastreamento(){
  const {useState}=React;
  const EMOCOES=["Ansiedade","Tédio","Tristeza","Raiva","Solidão","Estresse","Cansaço","Felicidade"];
  const SENSACOES_APOS=["Culpa","Vergonha","Alívio","Indiferença","Satisfação","Arrependimento"];
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

  const e=React.createElement;
  function toggleEm(em){setEmocoes(v=>v.includes(em)?v.filter(x=>x!==em):[...v,em]);}
  function toggleSens(s){setSensacoes(v=>v.includes(s)?v.filter(x=>x!==s):[...v,s]);}
  function salvar(){
    if(!comeu.trim()){alert("Descreva o que você comeu.");return;}
    setEntries(prev=>[{id:Date.now()+"",data:new Date().toLocaleDateString("pt-BR"),hora:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),fome,emocoes,pensamento,comeu,alivio,duracao,sensacoes,reflexao},...prev]);
    setFome(5);setEmocoes([]);setPensamento("");setComeu("");setAlivio(5);setDuracao("");setSensacoes([]);setReflexao("");
    setMsg("✓ Registro salvo!");setTimeout(()=>setMsg(""),2000);
  }
  const fomeColor=fome<=3?"#059669":fome<=6?"#d97706":"#dc2626";
  const alivioColor=alivio<=3?"#059669":alivio<=6?"#d97706":"#dc2626";

  function Chips({opts,sel,toggle}){
    return e("div",{style:{display:"flex",flexWrap:"wrap",gap:6}},
      opts.map(o=>e("button",{key:o,onClick:()=>toggle(o),style:{padding:"5px 12px",borderRadius:20,border:"1px solid",borderColor:sel.includes(o)?"var(--purple)":"#e5e7eb",background:sel.includes(o)?"var(--purple)":"white",color:sel.includes(o)?"white":"#6b7280",fontSize:12,cursor:"pointer"}},o))
    );
  }
  function Slider({label,val,set,color}){
    return e("div",{style:{marginBottom:16}},
      e("div",{style:{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}},
        e("span",{style:{fontWeight:600}},label),
        e("span",{style:{fontWeight:700,color}},val+"/10")
      ),
      e("input",{type:"range",min:0,max:10,value:val,onChange:ev=>set(+ev.target.value),style:{width:"100%",accentColor:"var(--purple)"}}),
      e("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,color:"#9ca3af"}},e("span","0 – Nenhuma"),e("span","5 – Moderada"),e("span","10 – Muita"))
    );
  }

  return e("div",null,
    e("div",{style:{background:"#fdf4ff",border:"1px solid #e9d5ff",borderRadius:12,padding:14,marginBottom:20,fontSize:13,color:"#5a007a",lineHeight:1.7}},
      e("strong",null,"Instruções: "),"Use sempre que sentir urgência de comer ou após um episódio de compulsão alimentar. O objetivo é entender o \"porquê\" — sem julgamento."
    ),
    e(Slider,{label:"Nível de Fome Física",val:fome,set:setFome,color:fomeColor}),
    e("div",{style:{marginBottom:16}},
      e("label",{style:{fontWeight:600,fontSize:13,display:"block",marginBottom:8}},"Emoções presentes"),
      e(Chips,{opts:EMOCOES,sel:emocoes,toggle:toggleEm})
    ),
    e("div",{style:{marginBottom:16}},
      e("label",{style:{fontWeight:600,fontSize:13,display:"block",marginBottom:6}},"Pensamento permissivo"),
      e("textarea",{className:"form-input",rows:2,value:pensamento,onChange:ev=>setPensamento(ev.target.value),placeholder:"Ex: 'Só desta vez...' 'Mereço isso...' 'Já estraguei tudo...'"})
    ),
    e("div",{style:{marginBottom:16}},
      e("label",{style:{fontWeight:600,fontSize:13,display:"block",marginBottom:6}},"O que você comeu?"),
      e("textarea",{className:"form-input",rows:2,value:comeu,onChange:ev=>setComeu(ev.target.value),placeholder:"Descreva os alimentos..."})
    ),
    e(Slider,{label:"Nível de Alívio após comer",val:alivio,set:setAlivio,color:alivioColor}),
    e("div",{style:{marginBottom:16}},
      e("label",{style:{fontWeight:600,fontSize:13,display:"block",marginBottom:6}},"Duração do alívio"),
      e("div",{style:{display:"flex",flexWrap:"wrap",gap:6}},
        ["Momentâneo","Alguns minutos","Algumas horas","Longa duração"].map(d=>e("button",{key:d,onClick:()=>setDuracao(d),style:{padding:"5px 12px",borderRadius:20,border:"1px solid",borderColor:duracao===d?"var(--purple)":"#e5e7eb",background:duracao===d?"var(--purple)":"white",color:duracao===d?"white":"#6b7280",fontSize:12,cursor:"pointer"}},d))
      )
    ),
    e("div",{style:{marginBottom:16}},
      e("label",{style:{fontWeight:600,fontSize:13,display:"block",marginBottom:8}},"Como você se sentiu depois?"),
      e(Chips,{opts:SENSACOES_APOS,sel:sensacoes,toggle:toggleSens})
    ),
    e("div",{style:{marginBottom:20}},
      e("label",{style:{fontWeight:600,fontSize:13,display:"block",marginBottom:6}},"Reflexão"),
      e("textarea",{className:"form-input",rows:2,value:reflexao,onChange:ev=>setReflexao(ev.target.value),placeholder:"O que esse episódio revela sobre suas necessidades emocionais?"})
    ),
    e("button",{className:"btn btn-purple",style:{width:"100%"},onClick:salvar},msg||"Salvar registro"),
    entries.length>0&&e("div",{style:{marginTop:20}},
      e("div",{style:{fontWeight:600,fontSize:13,marginBottom:10}},entries.length+" registro(s)"),
      entries.map(en=>e("div",{key:en.id,style:{background:"#f9fafb",borderRadius:10,padding:12,marginBottom:8,fontSize:12,border:"1px solid #e5e7eb"}},
        e("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
          e("span",{style:{color:"#6b7280"}},en.data+" "+en.hora),
          e("span",{style:{background:"#ede9fe",color:"var(--purple)",borderRadius:20,padding:"1px 8px",fontWeight:600}},"Fome: "+en.fome+"/10")
        ),
        e("div",{style:{color:"#374151",marginBottom:2}},e("strong",null,"Comeu: "),en.comeu),
        en.emocoes.length>0&&e("div",{style:{color:"#6b7280"}},e("strong",null,"Emoções: "),en.emocoes.join(", "))
      ))
    )
  );
};

// ── 7. TREINO NEURO-AUDITIVO ────────────────────────────────────────────────
window.FerramentaTreino = function FerramentaTreino(){
  const {useState,useRef}=React;
  const [modulo,setModulo]=useState(0);
  const [respostas,setRespostas]=useState({});
  const [feedbacks,setFeedbacks]=useState({});
  const [score,setScore]=useState(0);
  const [total,setTotal]=useState(0);
  const [tocando,setTocando]=useState(null);
  const ctxRef=useRef(null);
  const e=React.createElement;

  function getCtx(){
    if(!ctxRef.current) ctxRef.current=new AudioContext();
    if(ctxRef.current.state==="suspended") ctxRef.current.resume();
    return ctxRef.current;
  }
  function tocarTom(freq,dur=1.5,vol=0.4,wave="sine"){
    const ctx=getCtx();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type=wave;osc.frequency.value=freq;
    gain.gain.setValueAtTime(vol,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+dur);
  }
  function tocarFalar(txt){
    if(!("speechSynthesis" in window))return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(txt);u.lang="pt-BR";u.rate=0.8;
    const v=window.speechSynthesis.getVoices().find(x=>x.lang.startsWith("pt"));
    if(v)u.voice=v;
    window.speechSynthesis.speak(u);
  }

  const MODULOS=[
    {titulo:"Grave / Agudo",emoji:"🎵",desc:"Discriminação de frequências graves e agudas",
     exercicios:[
       {id:"m0e0",pergunta:"Clique em TOCAR e diga: esse som é GRAVE ou AGUDO?",
        btn:{label:"▶ Tocar som",action:()=>{const f=Math.random()>0.5?200:2000;tocarTom(f);return f>500?"agudo":"grave";}},
        opcoes:[{label:"🔉 Grave",valor:"grave"},{label:"🔊 Agudo",valor:"agudo"}],resposta:"grave",dica:"Sons graves têm frequência baixa (voz masculina, baixo). Sons agudos têm frequência alta (flauta, voz infantil)."},
       {id:"m0e1",pergunta:"Qual destes sons é mais GRAVE?",
        btn:{label:"▶ Tocar A (80Hz)",action:()=>tocarTom(80)},
        btn2:{label:"▶ Tocar B (800Hz)",action:()=>tocarTom(800)},
        opcoes:[{label:"🎵 Som A",valor:"a"},{label:"🎵 Som B",valor:"b"}],resposta:"a",dica:"O som A (80Hz) é grave — similar a um contrabaixo."},
     ]},
    {titulo:"Voz Feminina / Masculina",emoji:"🎤",desc:"Discriminação de vozes por gênero",
     exercicios:[
       {id:"m1e0",pergunta:"Ouça e identifique: voz feminina ou masculina?",
        btn:{label:"▶ Tocar voz feminina",action:()=>tocarFalar("Olá, como você está hoje?")},
        opcoes:[{label:"👩 Feminina",valor:"feminina"},{label:"👨 Masculina",valor:"masculina"}],resposta:"feminina",dica:"Vozes femininas tendem a ter frequência fundamental mais alta (200-300Hz)."},
       {id:"m1e1",pergunta:"Esta voz é masculina ou feminina?",
        btn:{label:"▶ Ouvir",action:()=>{const u=new SpeechSynthesisUtterance("Bom dia, tudo bem com você?");u.lang="pt-BR";u.pitch=0.5;window.speechSynthesis.speak(u);}},
        opcoes:[{label:"👩 Feminina",valor:"feminina"},{label:"👨 Masculina",valor:"masculina"}],resposta:"masculina",dica:"Pitch baixo indica voz masculina."},
     ]},
    {titulo:"Intensidade",emoji:"🔊",desc:"Discriminação de volume e intensidade sonora",
     exercicios:[
       {id:"m2e0",pergunta:"Qual som tem maior INTENSIDADE (volume)?",
        btn:{label:"▶ Som Fraco",action:()=>tocarTom(440,1,0.1)},
        btn2:{label:"▶ Som Forte",action:()=>tocarTom(440,1,0.8)},
        opcoes:[{label:"Som A (fraco)",valor:"a"},{label:"Som B (forte)",valor:"b"}],resposta:"b",dica:"O som B foi tocado com volume 8x maior."},
       {id:"m2e1",pergunta:"Este som é FRACO, MÉDIO ou FORTE?",
        btn:{label:"▶ Tocar",action:()=>tocarTom(440,1.5,0.45)},
        opcoes:[{label:"Fraco",valor:"fraco"},{label:"Médio",valor:"medio"},{label:"Forte",valor:"forte"}],resposta:"medio",dica:"Volume médio — nem muito baixo nem muito alto."},
     ]},
    {titulo:"Palavras",emoji:"💬",desc:"Discriminação e identificação de palavras",
     exercicios:[
       {id:"m3e0",pergunta:"Ouça e identifique a palavra correta:",
        btn:{label:"▶ Ouvir palavra",action:()=>tocarFalar("BOLO")},
        opcoes:[{label:"BOLO",valor:"bolo"},{label:"BOLA",valor:"bola"},{label:"BOLO",valor:"bolo2"},{label:"BOLO",valor:"bolo3"}],resposta:"bolo",dica:"A palavra foi BOLO — o 'L' + 'O' no final distingue de BOLA."},
       {id:"m3e1",pergunta:"Quantas sílabas tem a palavra que você ouviu?",
        btn:{label:"▶ Ouvir",action:()=>tocarFalar("BORBOLETA")},
        opcoes:[{label:"2 sílabas",valor:"2"},{label:"3 sílabas",valor:"3"},{label:"4 sílabas",valor:"4"}],resposta:"4",dica:"BOR-bo-le-ta = 4 sílabas."},
     ]},
    {titulo:"Ritmo",emoji:"🥁",desc:"Discriminação de padrões rítmicos",
     exercicios:[
       {id:"m4e0",pergunta:"Qual padrão rítmico foi tocado?",
        btn:{label:"▶ Tocar ritmo",action:()=>{const ctx=getCtx();[0,0.3,0.6,0.7,1.0].forEach(t=>{const o=ctx.createOscillator();const g=ctx.createGain();o.type="square";o.frequency.value=440;g.gain.setValueAtTime(0.3,ctx.currentTime+t);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+0.15);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.15);});}},
        opcoes:[{label:"♩♩♩♩♩ (5 batidas)",valor:"5"},{label:"♩♩♩ (3 batidas)",valor:"3"},{label:"♩♩♩♩ (4 batidas)",valor:"4"}],resposta:"5",dica:"Você ouviu 5 batidas: 3 rápidas + pausa + 2 juntas."},
     ]},
    {titulo:"Emoções",emoji:"😊",desc:"Identificação de emoções na voz",
     exercicios:[
       {id:"m5e0",pergunta:"Que emoção você identifica nesta voz?",
        btn:{label:"▶ Ouvir",action:()=>{const u=new SpeechSynthesisUtterance("Hoje foi um dia incrível, estou muito feliz!");u.lang="pt-BR";u.pitch=1.4;u.rate=1.1;window.speechSynthesis.speak(u);}},
        opcoes:[{label:"😊 Alegria",valor:"alegria"},{label:"😔 Tristeza",valor:"tristeza"},{label:"😡 Raiva",valor:"raiva"},{label:"😨 Medo",valor:"medo"}],resposta:"alegria",dica:"Tom de voz agudo, rápido e com ênfase = alegria."},
       {id:"m5e1",pergunta:"Que emoção você identifica agora?",
        btn:{label:"▶ Ouvir",action:()=>{const u=new SpeechSynthesisUtterance("Não sei o que fazer... tudo parece muito difícil.");u.lang="pt-BR";u.pitch=0.8;u.rate=0.85;window.speechSynthesis.speak(u);}},
        opcoes:[{label:"😊 Alegria",valor:"alegria"},{label:"😔 Tristeza",valor:"tristeza"},{label:"😤 Frustração",valor:"frustracao"},{label:"😰 Ansiedade",valor:"ansiedade"}],resposta:"tristeza",dica:"Tom de voz baixo, lento e pausado = tristeza."},
     ]},
  ];

  const mod=MODULOS[modulo];

  function responder(exId,val,correto){
    const c=val===correto;
    setRespostas(r=>({...r,[exId]:val}));
    setFeedbacks(f=>({...f,[exId]:c}));
    if(!respostas[exId]){setTotal(t=>t+1);if(c)setScore(s=>s+1);}
  }

  return e("div",null,
    // header score
    e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,padding:"10px 14px",background:"var(--purple-soft)",borderRadius:10}},
      e("span",{style:{fontSize:13,fontWeight:600,color:"var(--purple)"}},"🏆 Pontuação: "+score+"/"+total),
      e("span",{style:{fontSize:12,color:"var(--purple)"}},Math.round(total>0?score/total*100:0)+"% de acerto")
    ),
    // tabs módulos
    e("div",{style:{display:"flex",gap:6,overflowX:"auto",marginBottom:20,paddingBottom:4}},
      MODULOS.map((m,i)=>e("button",{key:i,onClick:()=>setModulo(i),style:{padding:"6px 12px",borderRadius:20,border:"1.5px solid",borderColor:modulo===i?"var(--purple)":"#e5e7eb",background:modulo===i?"var(--purple)":"white",color:modulo===i?"white":"#6b7280",fontSize:12,fontWeight:modulo===i?600:400,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}},m.emoji+" "+m.titulo))
    ),
    e("div",{style:{fontWeight:700,fontSize:15,marginBottom:4}},mod.emoji+" "+mod.titulo),
    e("div",{style:{fontSize:13,color:"#6b7280",marginBottom:20}},mod.desc),
    mod.exercicios.map(ex=>e("div",{key:ex.id,style:{background:"#f9fafb",borderRadius:12,padding:16,marginBottom:16,border:"1px solid #e5e7eb"}},
      e("div",{style:{fontWeight:600,fontSize:13,marginBottom:12}},ex.pergunta),
      e("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}},
        e("button",{className:"btn btn-purple",style:{fontSize:12},onClick:()=>{setTocando(ex.id);ex.btn.action();setTimeout(()=>setTocando(null),2000);}},
          tocando===ex.id?"🔊 Tocando...":ex.btn.label
        ),
        ex.btn2&&e("button",{className:"btn btn-outline",style:{fontSize:12},onClick:()=>ex.btn2.action()},ex.btn2.label)
      ),
      e("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}},
        ex.opcoes.map((op,oi)=>e("button",{key:oi,onClick:()=>responder(ex.id,op.valor,ex.resposta),style:{padding:"8px 16px",borderRadius:10,border:"1.5px solid",fontSize:13,cursor:"pointer",fontWeight:500,
          borderColor:respostas[ex.id]===op.valor?(feedbacks[ex.id]?"#059669":"#dc2626"):"#e5e7eb",
          background:respostas[ex.id]===op.valor?(feedbacks[ex.id]?"#d1fae5":"#fee2e2"):"white",
          color:respostas[ex.id]===op.valor?(feedbacks[ex.id]?"#059669":"#dc2626"):"#374151"}},
          op.label
        ))
      ),
      respostas[ex.id]&&e("div",{style:{padding:"8px 12px",borderRadius:8,background:feedbacks[ex.id]?"#d1fae5":"#fee2e2",fontSize:12,color:feedbacks[ex.id]?"#059669":"#dc2626",fontWeight:600}},
        feedbacks[ex.id]?"✓ Correto! "+ex.dica:"✗ Incorreto. "+ex.dica
      )
    ))
  );
};

// ── 8. ENTREVISTA CLÍNICA ────────────────────────────────────────────────────
window.FerramentaEntrevista = function FerramentaEntrevista(){
  const e=React.createElement;
  return e("div",{style:{textAlign:"center",padding:"20px 0"}},
    e("div",{style:{fontSize:44,marginBottom:12}},"📝"),
    e("div",{style:{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:8}},"Entrevista Clínica Inicial"),
    e("p",{style:{fontSize:13,color:"#6b7280",lineHeight:1.7,marginBottom:24,maxWidth:400,margin:"0 auto 24px"}},"Instrumento de avaliação clínica inicial com perfil etário, escalas de observação, questionário de habilidades, hipóteses diagnósticas DSM-5 e Teste do Relógio para idosos."),
    e("a",{href:"https://luciakratz-arch.github.io/entrevista-inicial/",target:"_blank",className:"btn btn-purple",style:{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:8,fontSize:14,padding:"12px 28px"}},
      "🔗 Abrir Entrevista Clínica"
    ),
    e("div",{style:{marginTop:16,fontSize:12,color:"#9ca3af"}},"Abre em nova aba · Sistema completo com Firebase")
  );
};

// ── 9. ANAMNESE ──────────────────────────────────────────────────────────────
window.FerramentaAnamnese = function FerramentaAnamnese(){
  const {useState}=React;
  const PERFIS=["Criança (0-12)","Adolescente (13-17)","Adulto (18-59)","Idoso (60+)"];
  const SECOES={
    "Criança (0-12)":["Identificação","Gestação e Parto","Marcos do Desenvolvimento","Alimentação e Sono","Desenvolvimento Motor","Linguagem","Comportamento","Escolaridade","Histórico de Saúde","Dinâmica Familiar"],
    "Adolescente (13-17)":["Identificação","Histórico Escolar","Relações Sociais","Comportamento e Humor","Sexualidade","Substâncias","Histórico de Saúde","Dinâmica Familiar"],
    "Adulto (18-59)":["Identificação","Queixa Principal","Histórico da Queixa","Histórico Psicológico","Saúde Física","Relacionamentos","Trabalho e Estudo","Sono e Alimentação","Histórico Familiar"],
    "Idoso (60+)":["Identificação","Queixa Principal","Histórico Médico","Medicamentos","Cognição","Mobilidade","Sono","Suporte Social","Dinâmica Familiar"],
  };
  const [perfil,setPerfil]=useState("");
  const [secaoAtual,setSecaoAtual]=useState(0);
  const [respostas,setRespostas]=useState({});
  const [concluido,setConcluido]=useState(false);
  const e=React.createElement;

  if(!perfil) return e("div",{style:{textAlign:"center",padding:"20px 0"}},
    e("div",{style:{fontSize:44,marginBottom:12}},"📄"),
    e("div",{style:{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:16}},"Anamnese — Marcos do Desenvolvimento"),
    e("p",{style:{fontSize:13,color:"#6b7280",marginBottom:24}},"Selecione o perfil do paciente para iniciar:"),
    e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:340,margin:"0 auto"}},
      PERFIS.map(p=>e("button",{key:p,onClick:()=>setPerfil(p),className:"btn btn-outline",style:{padding:"14px 8px",fontSize:12,fontWeight:600,lineHeight:1.4}},p))
    )
  );

  const secoes=SECOES[perfil]||[];
  const secao=secoes[secaoAtual];
  const progresso=((secaoAtual)/secoes.length*100);

  if(concluido) return e("div",{style:{textAlign:"center",padding:40}},
    e("div",{style:{fontSize:48,marginBottom:12}},"✅"),
    e("div",{style:{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}},"Anamnese Concluída!"),
    e("div",{style:{fontSize:13,color:"#6b7280",marginBottom:20}},perfil+" · "+secoes.length+" seções preenchidas"),
    e("button",{className:"btn btn-purple",onClick:()=>{setPerfil("");setSecaoAtual(0);setRespostas({});setConcluido(false);}},"Nova Anamnese")
  );

  return e("div",null,
    e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
      e("div",{style:{fontSize:12,color:"var(--purple)",fontWeight:600}},perfil),
      e("div",{style:{fontSize:12,color:"#6b7280"}},"Seção "+(secaoAtual+1)+"/"+secoes.length)
    ),
    e("div",{style:{background:"#e5e7eb",borderRadius:20,height:6,marginBottom:20}},
      e("div",{style:{background:"var(--purple)",height:6,borderRadius:20,width:progresso+"%",transition:"width .3s"}})
    ),
    e("div",{style:{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:16}},secao),
    e("textarea",{className:"form-input",rows:5,value:respostas[secao]||"",onChange:ev=>setRespostas(r=>({...r,[secao]:ev.target.value})),placeholder:"Registre as informações sobre "+secao.toLowerCase()+"..."}),
    e("div",{style:{display:"flex",gap:10,marginTop:16,justifyContent:"space-between"}},
      e("button",{className:"btn btn-ghost",onClick:()=>setSecaoAtual(s=>Math.max(0,s-1)),disabled:secaoAtual===0},"← Anterior"),
      secaoAtual<secoes.length-1
        ?e("button",{className:"btn btn-purple",onClick:()=>setSecaoAtual(s=>s+1)},"Próxima →")
        :e("button",{className:"btn btn-purple",onClick:()=>setConcluido(true)},"✓ Concluir Anamnese")
    )
  );
};

// ── MODAL VISUALIZAR FERRAMENTA (substitui o existente no app.js) ───────────
window.ModalVisualizarFerramenta = function ModalVisualizarFerramenta({recurso,onClose}){
  const e=React.createElement;
  function renderFerramenta(){
    const k=recurso.formularioKey;
    if(k==="breathing-478")     return e(window.FerramentaRespiracao,{musicUrl:recurso.musicUrl});
    if(k==="muscle-relaxation") return e(window.FerramentaRelaxamento,{musicUrl:recurso.musicUrl});
    if(k==="decision-tree")     return e(window.FerramentaArvore,null);
    if(k==="abc-record")        return e(window.FerramentaABC,null);
    if(k==="anxiety-management")return e(window.FerramentaGestaoAnsiedade,null);
    if(k==="emotional-eating")  return e(window.FerramentaRastreamento,null);
    if(k==="treino-neuro-auditivo") return e(window.FerramentaTreino,null);
    if(k==="entrevista-clinica")return e(window.FerramentaEntrevista,null);
    if(k==="anamnese")          return e(window.FerramentaAnamnese,null);
    return e("div",{style:{textAlign:"center",padding:40,color:"#6b7280"}},"Ferramenta não configurada.");
  }
  return e("div",null,
    e("button",{className:"btn btn-ghost",style:{marginBottom:16,padding:"8px 12px"},onClick:onClose},"← Voltar para Recursos"),
    e("div",{style:{background:"#f9f5ff",border:"1px solid #e9d5ff",borderRadius:8,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#7c3aed"}},
      "👁 Visualização do paciente — assim a ferramenta aparecerá na área do paciente"
    ),
    e("div",{className:"card"},
      e("div",{style:{display:"flex",alignItems:"flex-start",gap:12,marginBottom:20,paddingBottom:16,borderBottom:"1px solid #f3f4f6"}},
        e("div",{style:{width:48,height:48,borderRadius:12,background:"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}},
          recurso.categoria==="relaxamento"?"💨":recurso.categoria==="musicoterapia"?"🎵":recurso.categoria==="tcc"?"🧠":recurso.categoria==="avaliacao"?"📋":"🔧"
        ),
        e("div",null,
          e("div",{style:{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600}},recurso.titulo),
          e("div",{style:{fontSize:13,color:"#6b7280",marginTop:4}},recurso.descricao)
        )
      ),
      renderFerramenta()
    )
  );
};

console.log("✅ ferramentas.js carregado — 9 ferramentas interativas prontas");
