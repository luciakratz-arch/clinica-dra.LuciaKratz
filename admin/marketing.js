// marketing.js — Módulo CRM/Marketing da Clínica Dra. Lucia Kratz
// Depende de: firebase (db), React (useState/useEffect), Icon, fmtDataHora, dispararNotificacao
// Carregado após app.js

const COLUNAS_FUNIL = [
  { id:"novo",              label:"Lead Novo",             cor:"#6b7280", bg:"#f3f4f6" },
  { id:"contato",           label:"Primeiro Contato",      cor:"#0891b2", bg:"#e0f2fe" },
  { id:"agendamento",       label:"Agendamento Pendente",  cor:"#d97706", bg:"#fef3c7" },
  { id:"agendado",          label:"Agendado & Confirmado", cor:"#7B00C4", bg:"#f5f3ff" },
  { id:"convertido",        label:"Convertido",            cor:"#16a34a", bg:"#dcfce7" },
  { id:"convertido_social",   label:"Convertido Social",       cor:"#0d9488", bg:"#ccfbf1" },
  { id:"convertido_parceria", label:"Convertido — Parceria",   cor:"#7B00C4", bg:"#f5f3ff" },
  { id:"perdido",             label:"Perdido",                 cor:"#dc2626", bg:"#fef2f2" },
];

function parsearLeadIA(texto) {
  const linhas = texto.split("\n");
  function extrairLinha(chaves) {
    for (const linha of linhas) {
      const limpa = linha.replace(/\*/g,"").replace(/\[|\]/g,"").trim();
      for (const chave of chaves) {
        const idx = limpa.toLowerCase().indexOf(chave.toLowerCase() + ":");
        if (idx !== -1) return limpa.substring(idx + chave.length + 1).trim();
      }
    }
    return "";
  }
  return {
    nome:     extrairLinha(["Nome do Lead","Nome"]),
    telefone: extrairLinha(["WhatsApp/Contato","WhatsApp","Contato","Telefone"]),
    queixa:   extrairLinha(["Principal Queixa/Objetivo","Queixa/Objetivo","Principal Queixa","Queixa","Objetivo"]),
    servico:  extrairLinha(["Serviço de Interesse","Servico de Interesse","Serviço","Servico"]),
  };
}

function TagInputCampanha({ value=[], onChange }) {
  const [input, setInput]           = useState("");
  const [sugestoes, setSugestoes]   = useState([]);
  const [todasTags, setTodasTags]   = useState([]);

  useEffect(()=>{
    db.collection("clinica_campanhas").orderBy("nome").onSnapshot(
      s => setTodasTags(s.docs.map(d=>d.data().nome)),
      ()=>{}
    );
  },[]);

  const filtradas = input.length>0
    ? todasTags.filter(t=>t.toLowerCase().includes(input.toLowerCase()) && !value.includes(t))
    : [];

  async function adicionarTag(tag) {
    const t = tag.trim();
    if (!t || value.includes(t)) return;
    // salvar no Firebase se nova
    if (!todasTags.includes(t)) {
      await db.collection("clinica_campanhas").add({ nome:t, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(()=>{});
    }
    onChange([...value, t]);
    setInput(""); setSugestoes([]);
  }

  function removerTag(t) { onChange(value.filter(x=>x!==t)); }

  function onKeyDown(e) {
    if ((e.key==="Enter"||e.key===",") && input.trim()) { e.preventDefault(); adicionarTag(input); }
    if (e.key==="Backspace" && !input && value.length>0) removerTag(value[value.length-1]);
  }

  return (
    <div style={{border:"1px solid var(--gray-200)",borderRadius:8,padding:"6px 8px",background:"white",minHeight:38,cursor:"text"}}
      onClick={()=>document.getElementById("tag-input-camp")?.focus()}>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
        {value.map(t=>(
          <span key={t} style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
            {t}
            <button onClick={()=>removerTag(t)} style={{background:"none",border:"none",cursor:"pointer",color:"#ea580c",padding:0,fontSize:14,lineHeight:1}}>×</button>
          </span>
        ))}
        <div style={{position:"relative",flex:1,minWidth:120}}>
          <input id="tag-input-camp" value={input} onChange={e=>{setInput(e.target.value);}}
            onKeyDown={onKeyDown} placeholder={value.length===0?"Campanha/Origem...":""}
            style={{border:"none",outline:"none",fontSize:13,width:"100%",padding:"2px 0",background:"transparent"}}/>
          {filtradas.length>0&&(
            <div style={{position:"absolute",top:"100%",left:0,background:"white",border:"1px solid var(--gray-200)",borderRadius:8,boxShadow:"0 4px 12px rgba(0,0,0,0.1)",zIndex:100,minWidth:200}}>
              {filtradas.slice(0,6).map(t=>(
                <button key={t} onMouseDown={e=>{e.preventDefault();adicionarTag(t);}}
                  style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  {t}
                </button>
              ))}
              {input&&!todasTags.includes(input.trim())&&(
                <button onMouseDown={e=>{e.preventDefault();adicionarTag(input);}}
                  style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontFamily:"inherit",color:"#7B00C4",fontWeight:600}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  + Criar "{input.trim()}"
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalLead({ lead, onSalvar, onFechar, user, onConverter }) {
  const novo = !lead?.id;
  const [form, setForm]         = useState(lead || { nome:"", telefone:"", queixa:"", servico:"", campanhas:[], status:"novo", temperatura:"morno", obs:"" });
  const [textoIA, setTextoIA]   = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba]           = useState("dados"); // "dados" | "timeline"
  const [interacoes, setInteracoes] = useState([]);
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const [registrando, setRegistrando]   = useState(false);
  const [excluindo, setExcluindo]        = useState(false);

  useEffect(()=>{
    if (!lead?.id) return;
    db.collection("clinica_leads").doc(lead.id).collection("interacoes")
      .orderBy("createdAt","desc")
      .onSnapshot(s=>setInteracoes(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[lead?.id]);

  function aplicarIA() {
    const parsed = parsearLeadIA(textoIA);
    if (!parsed.nome && !parsed.telefone) { alert("Não foi possível identificar os campos. Verifique o formato do texto."); return; }
    setForm(f=>({...f, ...parsed}));
    setTextoIA("");
  }

  async function salvar() {
    if (!form.nome?.trim()) { alert("Nome é obrigatório."); return; }
    setSalvando(true);
    try {
      const dados = { ...form, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (novo) {
        dados.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        dados.status = dados.status || "novo";
        await db.collection("clinica_leads").add(dados);
      } else {
        await db.collection("clinica_leads").doc(lead.id).update(dados);
      }
      onSalvar();
    } catch(e) { alert("Erro ao salvar."); }
    setSalvando(false);
  }

  async function registrarContato() {
    if (!novaAnotacao.trim()) return;
    if (!lead?.id) { alert("Salve o lead primeiro antes de registrar interações."); return; }
    setRegistrando(true);
    try {
      await db.collection("clinica_leads").doc(lead.id).collection("interacoes").add({
        texto: novaAnotacao.trim(),
        autor: user?.nome || "Usuário",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setNovaAnotacao("");
    } catch(e) { alert("Erro ao registrar."); }
    setRegistrando(false);
  }

  async function excluirLead() {
    if (!lead?.id) return;
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este lead? Esta ação não poderá ser desfeita.")) return;
    setExcluindo(true);
    try {
      await db.collection("clinica_leads").doc(lead.id).delete();
      onFechar();
    } catch(e) { alert("Erro ao excluir."); }
    setExcluindo(false);
  }

  const f = (campo, val) => setForm(x=>({...x,[campo]:val}));

  function fmtDataHora(ts) {
    if (!ts?.toDate) return "—";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>

        {/* Header */}
        <div style={{padding:"18px 24px",borderBottom:"1px solid var(--gray-100)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontWeight:700,fontSize:16}}>{novo?"Novo Lead": form.nome||"Lead"}</div>
          <button onClick={onFechar} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:22,lineHeight:1}}>×</button>
        </div>

        {/* Abas — só para lead existente */}
        {!novo && (
          <div style={{display:"flex",borderBottom:"1px solid var(--gray-100)",flexShrink:0}}>
            {[{id:"dados",label:"📋 Dados"},{id:"timeline",label:`💬 Follow-up (${interacoes.length})`}].map(a=>(
              <button key={a.id} onClick={()=>setAba(a.id)}
                style={{flex:1,padding:"12px 0",background:"none",border:"none",cursor:"pointer",fontWeight:aba===a.id?700:400,fontSize:13,fontFamily:"inherit",borderBottom:aba===a.id?"2px solid #7B00C4":"2px solid transparent",color:aba===a.id?"#7B00C4":"var(--text-muted)",transition:"all .15s"}}>
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Corpo scrollável */}
        <div style={{overflowY:"auto",flex:1}}>

          {/* ABA DADOS */}
          {(novo || aba==="dados") && (
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
              {novo && (
                <div style={{background:"#f5f3ff",border:"1px solid #7B00C420",borderRadius:10,padding:14}}>
                  <div style={{fontWeight:600,fontSize:13,color:"#7B00C4",marginBottom:8}}>✨ Inserir Lead via IA</div>
                  <TextAreaVoz value={textoIA} onChange={e=>setTextoIA(e.target.value)} rows={5}
                    placeholder={`Cole aqui o bloco gerado pela IA de triagem:\n\n### ESTRUTURA PARA O CRM\n* **Nome do Lead:** ...\n* **WhatsApp/Contato:** ...\n* **Principal Queixa/Objetivo:** ...\n* **Serviço de Interesse:** ...`}
                    style={{width:"100%",border:"1px solid #7B00C430",borderRadius:8,padding:"10px 12px",fontSize:12,fontFamily:"monospace",resize:"vertical",outline:"none",boxSizing:"border-box",background:"white"}}/>
                  <button onClick={aplicarIA} style={{marginTop:8,background:"#7B00C4",color:"white",border:"none",borderRadius:20,padding:"7px 18px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                    ⚡ Preencher campos automaticamente
                  </button>
                </div>
              )}

              {[
                {label:"Nome do Lead *",          campo:"nome",     placeholder:"Nome completo"},
                {label:"WhatsApp / Contato",       campo:"telefone", placeholder:"(62) 99999-9999"},
                {label:"Principal Queixa/Objetivo",campo:"queixa",   placeholder:"Ex: Ansiedade, insônia..."},
                {label:"Serviço de Interesse",     campo:"servico",  placeholder:"Ex: Psicoterapia individual"},
              ].map(({label,campo,placeholder})=>(
                <div key={campo}>
                  <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>{label}</label>
                  <input type="text" value={form[campo]||""} onChange={e=>f(campo,e.target.value)}
                    placeholder={placeholder} className="form-input"/>
                </div>
              ))}

              <div>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Campanha / Origem</label>
                <TagInputCampanha value={form.campanhas||[]} onChange={v=>f("campanhas",v)}/>
                <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>Digite e pressione Enter. Campanhas novas são salvas automaticamente.</div>
              </div>

              <div>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Status</label>
                <select value={form.status||"novo"} onChange={e=>{
                  const novoStatus = e.target.value;
                  f("status", novoStatus);
                  if ((novoStatus==="convertido" || novoStatus==="convertido_social" || novoStatus==="convertido_parceria") && !novo && onConverter) {
                    onConverter({...form, id:lead.id, _tipoConversao: novoStatus});
                  }
                }} className="form-input">
                  {COLUNAS_FUNIL.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              {/* ── Campo Temperatura do Lead ── */}
              <div>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>🌡️ Temperatura do Lead</label>
                <div style={{display:"flex",gap:8}}>
                  {[
                    {v:"quente", e:"🔥", l:"Quente",  cor:"#dc2626", bg:"#fef2f2"},
                    {v:"morno",  e:"🌡️", l:"Morno",   cor:"#d97706", bg:"#fef3c7"},
                    {v:"frio",   e:"🧊", l:"Frio",    cor:"#0891b2", bg:"#e0f2fe"},
                  ].map(({v,e,l,cor,bg})=>(
                    <button key={v} type="button" onClick={()=>f("temperatura",v)}
                      style={{flex:1,padding:"10px 6px",borderRadius:10,border:"2px solid",
                        borderColor:(form.temperatura||"morno")===v?cor:"#e5e7eb",
                        background:(form.temperatura||"morno")===v?bg:"white",
                        cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                      <div style={{fontSize:18,marginBottom:2}}>{e}</div>
                      <div style={{fontSize:12,fontWeight:700,color:(form.temperatura||"morno")===v?cor:"#6b7280"}}>{l}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Observações</label>
                <TextAreaVoz value={form.obs||""} onChange={e=>f("obs",e.target.value)} rows={3}
                  className="form-input" placeholder="Anotações internas..." style={{resize:"vertical"}}/>
              </div>
            </div>
          )}

          {/* ABA TIMELINE */}
          {!novo && aba==="timeline" && (
            <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>

              {/* Campo nova anotação */}
              <div style={{background:"#f9fafb",border:"1px solid var(--gray-200)",borderRadius:12,padding:16}}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>📝 Nova anotação de follow-up</div>
                <TextAreaVoz value={novaAnotacao} onChange={e=>setNovaAnotacao(e.target.value)} rows={3}
                  className="form-input"
                  placeholder='Ex: "Cliente disse que vai falar com o marido e pediu para retornar na quinta-feira."'
                  style={{resize:"vertical",marginBottom:10}}/>
                <button onClick={registrarContato} disabled={registrando||!novaAnotacao.trim()}
                  style={{background:"#7B00C4",color:"white",border:"none",borderRadius:8,padding:"9px 20px",fontSize:13,fontWeight:600,cursor:"pointer",opacity:(!novaAnotacao.trim()||registrando)?0.5:1}}>
                  {registrando?"Registrando...":"✅ Registrar Contato"}
                </button>
              </div>

              {/* Timeline */}
              <div>
                <div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"var(--text-muted)"}}>HISTÓRICO DE INTERAÇÕES</div>
                {interacoes.length===0
                  ? <div style={{textAlign:"center",padding:"32px 0",color:"var(--gray-400)",fontSize:13}}>Nenhuma interação registrada ainda.</div>
                  : (
                    <div style={{position:"relative"}}>
                      {/* Linha vertical */}
                      <div style={{position:"absolute",left:15,top:0,bottom:0,width:2,background:"var(--gray-100)"}}/>
                      <div style={{display:"flex",flexDirection:"column",gap:0}}>
                        {interacoes.map((it,idx)=>(
                          <div key={it.id} style={{display:"flex",gap:16,paddingBottom:20,position:"relative"}}>
                            {/* Bolinha */}
                            <div style={{width:32,height:32,borderRadius:"50%",background:"#7B00C4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1,fontSize:13}}>
                              💬
                            </div>
                            {/* Conteúdo */}
                            <div style={{flex:1,background:"white",border:"1px solid var(--gray-100)",borderRadius:10,padding:"12px 14px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:4}}>
                                <span style={{fontWeight:600,fontSize:12,color:"#7B00C4"}}>{it.autor}</span>
                                <span style={{fontSize:11,color:"var(--gray-400)"}}>{fmtDataHora(it.createdAt)}</span>
                              </div>
                              <div style={{fontSize:13,lineHeight:1.6,color:"var(--text)"}}>{it.texto}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 24px",borderTop:"1px solid var(--gray-100)",display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          {/* Lixeira — só para lead existente */}
          {!novo ? (
            <button onClick={excluirLead} disabled={excluindo}
              style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:8,border:"1px solid #fecaca",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:500}}>
              <Icon name="trash-2" size={14}/> {excluindo?"Excluindo...":"Excluir lead"}
            </button>
          ) : <div/>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={onFechar} style={{padding:"9px 20px",borderRadius:8,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
              {aba==="timeline"?"Fechar":"Cancelar"}
            </button>
            {(novo||aba==="dados") && (
              <button onClick={salvar} disabled={salvando} className="btn-primary">
                {salvando?"Salvando...":"Salvar Lead"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const REGRAS_INATIVIDADE = [
  {
    status: "novo",
    limiteMs: 30 * 60 * 1000, // 30 minutos
    emoji: "⚠️",
    titulo: (nome) => `⚠️ Lead aguardando primeiro contato`,
    corpo:  (nome, tempo) => `${nome} está em "Lead Novo" há ${tempo} sem contato.`,
    cor: "#d97706", bg: "#fef3c7", borda: "#fde68a",
  },
  {
    status: "contato",
    limiteMs: 4 * 60 * 60 * 1000, // 4 horas
    emoji: "📞",
    titulo: (nome) => `📞 Primeiro contato sem avanço`,
    corpo:  (nome, tempo) => `${nome} está em "Primeiro Contato" há ${tempo}. Tentar avançar para agendamento.`,
    cor: "#0891b2", bg: "#e0f2fe", borda: "#bae6fd",
  },
  {
    status: "agendamento",
    limiteMs: 24 * 60 * 60 * 1000, // 24 horas
    emoji: "⏰",
    titulo: (nome) => `⏰ Agendamento pendente há mais de 24h`,
    corpo:  (nome, tempo) => `${nome} está em "Agendamento Pendente" há ${tempo}. Verificar contato.`,
    cor: "#dc2626", bg: "#fef2f2", borda: "#fecaca",
  },
];

function formatarTempo(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h/24)}d ${h%24}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function fmtWhats(tel) {
  if (!tel) return null;
  const num = tel.replace(/\D/g,"");
  if (!num) return null;
  return num.startsWith("55") ? num : "55"+num;
}

function CardLead({ lead, onEditar, onMover, colunas }) {
  const [dragging, setDragging] = useState(false);

  // Verifica se está em alerta
  const regra = REGRAS_INATIVIDADE.find(r=>r.status===(lead.status||"novo"));
  const rawRef = lead.updatedAt || lead.createdAt;
  const refMs = rawRef ? (typeof rawRef.toDate==="function" ? rawRef.toDate().getTime() : rawRef.seconds ? rawRef.seconds*1000 : null) : null;
  const emAlerta = regra && refMs && (Date.now()-refMs) >= regra.limiteMs;
  const whats = fmtWhats(lead.telefone);

  return (
    <div draggable
      onDragStart={e=>{ setDragging(true); e.dataTransfer.setData("leadId", lead.id); }}
      onDragEnd={()=>setDragging(false)}
      onClick={()=>onEditar(lead)}
      style={{
        background:"white", borderRadius:10, padding:"12px 14px",
        boxShadow:"0 1px 4px rgba(0,0,0,0.08)", cursor:"grab",
        opacity: dragging?0.5:1, transition:"opacity .15s",
        border: emAlerta ? `1.5px solid ${regra.borda}` : "1px solid var(--gray-100)",
        marginBottom:8,
      }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{fontWeight:600,fontSize:13}}>{lead.nome}</div>
        {lead.temperatura&&(()=>{
          const t={quente:{e:"🔥",c:"#dc2626",bg:"#fef2f2"},morno:{e:"🌡️",c:"#d97706",bg:"#fef3c7"},frio:{e:"🧊",c:"#0891b2",bg:"#e0f2fe"}};
          const cfg=t[lead.temperatura]||t.morno;
          return <span style={{fontSize:10,fontWeight:700,color:cfg.c,background:cfg.bg,borderRadius:20,padding:"1px 7px"}}>{cfg.e} {lead.temperatura.charAt(0).toUpperCase()+lead.temperatura.slice(1)}</span>;
        })()}
      </div>
      {lead.servico&&<div style={{fontSize:12,color:"var(--text-muted)",marginBottom:4}}>🎯 {lead.servico}</div>}
      {lead.queixa&&<div style={{fontSize:11,color:"var(--gray-500)",marginBottom:6,lineHeight:1.4}}>{lead.queixa.slice(0,60)}{lead.queixa.length>60?"...":""}</div>}
      {lead.telefone&&<div style={{fontSize:12,color:"var(--text-muted)"}}>📱 {lead.telefone}</div>}
      {(lead.campanhas||[]).length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
          {lead.campanhas.map(c=>(
            <span key={c} style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}>{c}</span>
          ))}
        </div>
      )}
      <div style={{fontSize:10,color:"var(--gray-400)",marginTop:8}}>
        {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString("pt-BR") : ""}
      </div>
      {emAlerta && whats && (
        <a href={`https://wa.me/${whats}`} target="_blank" rel="noopener noreferrer"
          onClick={e=>e.stopPropagation()}
          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:8,background:"#16a34a",color:"white",borderRadius:6,padding:"5px 0",fontSize:11,fontWeight:600,textDecoration:"none"}}>
          <Icon name="message-circle" size={11}/> Acessar WhatsApp
        </a>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  MODAL CONVERSÃO — Lead → Paciente
// ═══════════════════════════════════════════════════════
// ── Psicólogas parceiras do Instituto Cegatti ─────────────────────────────
const PARCEIRAS_CEGATTI = [
  { nome: "Psicóloga Parceira A", crp: "09/XXXXX", telefone: "5562999999999" },
  { nome: "Psicóloga Parceira B", crp: "09/XXXXX", telefone: "5562999999999" },
];

function ModalConversao({ lead, onConfirmar, onCancelar }) {
  const isSocial    = lead._tipoConversao === "convertido_social";
  const isParceria  = lead._tipoConversao === "convertido_parceria";

  const [email, setEmail]                     = useState("");
  const [tipoContratacao, setTipoContratacao] = useState("individual");
  const [salvando, setSalvando]               = useState(false);
  const [erro, setErro]                       = useState("");
  const [salvo, setSalvo]                     = useState(false);
  const [parceiraSel, setParceiraSel]         = useState(null); // id no Firestore
  const [parceiras, setParceiras]             = useState([]);
  const [valorPacoteParceria, setValorPacoteParceria] = useState("");

  const valorEstimado = tipoContratacao === "pacote" ? 250 : 300;

  // Carrega parceiras do Firestore
  useEffect(()=>{
    db.collection("clinica_parceiras").orderBy("createdAt","asc")
      .onSnapshot(s=>{
        const lista = s.docs.map(d=>({id:d.id,...d.data()}));
        setParceiras(lista);
        if(isParceria && lista.filter(p=>p.tipo==="parceira").length>0){
          setParceiraSel(lista.filter(p=>p.tipo==="parceira")[0].id);
        }
      },()=>{});
  },[]);

  const parceiraObj = parceiras.find(p=>p.id===parceiraSel)||null;
  const estagiaria  = parceiras.find(p=>p.tipo==="estagiaria")||null;

  // Cor e ícone do header conforme tipo
  const headerGrad = isParceria
    ? "linear-gradient(135deg,#7B00C4,#5a0090)"
    : isSocial
      ? "linear-gradient(135deg,#0d9488,#0f766e)"
      : "linear-gradient(135deg,#16a34a,#15803d)";
  const headerIcon  = isParceria ? "🤝" : isSocial ? "📱" : "🎉";
  const headerTitulo = isParceria
    ? "Encaminhamento — Parceria!"
    : isSocial
      ? "Convertido pelo Social!"
      : "Lead Convertido!";

  async function confirmar() {
    const hoje = new Date().toISOString().slice(0,10);
    const mesRef = hoje.slice(0,7);

    if(isParceria){
      // Parceria: não precisa de email, só valor do pacote
      const vBase = parseFloat(valorPacoteParceria)||0;
      if(vBase<=0){setErro("Informe o valor do pacote fechado.");return;}
      setSalvando(true);
      try {
        const comissao10 = parseFloat((vBase*0.10).toFixed(2));
        const nomePac = lead.nome||"Lead";
        const nomeParc = parceiraObj?.nome||"Parceira";
        const batch = db.batch();
        // Receita clínica: 10% do pacote
        batch.set(db.collection("clinica_lancamentos").doc(),{
          tipo_lancamento:"parceria",
          tipo:`${nomePac} — Parceria ${nomeParc}`,
          descricao:`${nomePac} — Parceria ${nomeParc}`,
          pacienteNome: nomePac,
          valor: comissao10,
          data: hoje, mesRef,
          formaPag:"PIX",
          status:"recebido",
          origem:"convertido_parceria",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        // Comissão clínica
        batch.set(db.collection("clinica_comissoes").doc(),{
          tipo:"Parceria — Clínica",
          tipoVenda:"primeira",
          perc:10,
          valorBase: vBase,
          valorComissao: comissao10,
          pacienteNome: nomePac,
          mesRef, status:"pendente",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        // Comissão estagiária: 10%
        if(estagiaria){
          batch.set(db.collection("clinica_comissoes").doc(),{
            tipo:"Parceria — Estagiária",
            tipoVenda:"primeira",
            perc:10,
            valorBase: vBase,
            valorComissao: comissao10,
            pacienteNome: nomePac,
            responsavel: estagiaria.nome,
            mesRef, status:"pendente",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
        // Arquiva lead
        await db.collection("clinica_leads").doc(lead.id).update({
          status:"convertido_parceria", arquivado:true,
          convertidoEm: firebase.firestore.FieldValue.serverTimestamp(),
        });
        setSalvo(true);
      } catch(e){setErro("Erro: "+e.message);}
      setSalvando(false);
      return;
    }

    // Social ou Convertido normal — cadastra paciente
    if (!email.trim()) { setErro("E-mail é obrigatório para criar o cadastro clínico."); return; }
    setSalvando(true);
    try {
      const nomePac = lead.nome||"";
      await db.collection("clinica_pacientes").add({
        nome: nomePac,
        email: email.trim().toLowerCase(),
        telefone: lead.telefone||"",
        cpf:"", dataNascimento:"",
        genero:"Não informar",
        status:"ativo", senha:"1234",
        objetivosTerapeuticos: lead.queixa||"",
        observacoesClinicas:"",
        origem: isSocial ? "projeto-social" : "crm-lead",
        leadId: lead.id,
        tipoContratacao, valorEstimado,
        campanhas: lead.campanhas||[],
        isSocial: isSocial||false,
        modulosConfig: MOD1_PADRAO,
        modulosAtivos: ["mod1"],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      if(isSocial){
        const batch = db.batch();
        // Receita clínica: R$40 fixo
        batch.set(db.collection("clinica_lancamentos").doc(),{
          tipo_lancamento:"social",
          tipo:`${nomePac} — Projeto Social`,
          descricao:`${nomePac} — Projeto Social`,
          pacienteNome: nomePac,
          valor: 40,
          data: hoje, mesRef,
          formaPag:"PIX",
          status:"recebido",
          origem:"convertido_social",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        // Comissão estagiária: R$20 fixo
        if(estagiaria){
          batch.set(db.collection("clinica_comissoes").doc(),{
            tipo:"Social — Estagiária",
            tipoVenda:"primeira",
            perc:0,
            valorBase:40,
            valorComissao:20,
            pacienteNome: nomePac,
            responsavel: estagiaria.nome,
            mesRef, status:"pendente",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
      }

      await db.collection("clinica_leads").doc(lead.id).update({
        status: lead._tipoConversao||"convertido",
        arquivado:true,
        convertidoEm: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setSalvo(true);
    } catch(e){setErro("Erro ao cadastrar. Tente novamente.");}
    setSalvando(false);
  }

  function gerarWhatsApp() {
    const parceira = parceiraObj;
    if(!parceira){alert("Selecione uma parceira.");return;}
    const telPaciente = (lead.telefone || "").replace(/[^0-9]/g,"");
    const msg = `Olá, ${lead.nome || ""}! Tudo bem?
Aqui é da equipe de atendimento. Passando para informar que realizamos o seu encaminhamento clínico. Você será atendido(a) pela psicóloga ${parceira.nome}, CRP: ${parceira.crp}.
Ela faz parte dos grupos do Instituto Cegatti, que integram o projeto social e de parcerias da Doutora Lúcia Kratz.
Você pode entrar em contato diretamente com ela através do número abaixo para alinhar o seu primeiro horário:
👉 WhatsApp: https://wa.me/${parceira.telefone}
Estamos à disposição!`;
    const url = `https://wa.me/${telPaciente}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  function gerarWhatsAppSocial() {
    const telPaciente = (lead.telefone || "").replace(/\D/g,"");
    const msg = `Olá, ${lead.nome || ""}! Tudo bem?
Aqui é da equipe da Dra. Lúcia Kratz. Que bom ter você com a gente!
Seu cadastro foi realizado com sucesso. Entraremos em contato para alinhar os próximos passos do seu atendimento.
Estamos à disposição! 🌷`;
    const url = `https://wa.me/${telPaciente}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>

        {/* Header */}
        <div style={{background:headerGrad,borderRadius:"16px 16px 0 0",padding:"24px",textAlign:"center",color:"white"}}>
          <div style={{fontSize:40,marginBottom:8}}>{headerIcon}</div>
          <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700}}>{headerTitulo}</div>
          <div style={{fontSize:13,opacity:0.85,marginTop:4}}>Deseja cadastrar como Paciente na Clínica?</div>
        </div>

        {/* Dados migrados */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid var(--gray-100)"}}>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:"#16a34a",marginBottom:8}}>DADOS QUE SERÃO MIGRADOS</div>
            <div style={{fontSize:13,display:"flex",flexDirection:"column",gap:4}}>
              <div><strong>Nome:</strong> {lead.nome}</div>
              {lead.telefone&&<div><strong>WhatsApp:</strong> {lead.telefone}</div>}
              {lead.queixa&&<div><strong>Queixa:</strong> {lead.queixa}</div>}
            </div>
          </div>

          {/* Seleção de parceira — só para parceria */}
          {isParceria&&(
            <div style={{marginBottom:14}}>
              <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:8}}>Psicóloga Parceira</label>
              {parceiras.filter(p=>p.tipo==="parceira").length===0
                ? <div style={{fontSize:12,color:"#d97706",padding:"8px 12px",background:"#fef3c7",borderRadius:8}}>
                    Nenhuma parceira cadastrada. Vá em Funil → aba Parceiras & Estagiárias.
                  </div>
                : <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {parceiras.filter(p=>p.tipo==="parceira").map(p=>(
                      <button key={p.id} onClick={()=>setParceiraSel(p.id)}
                        style={{padding:"10px 14px",borderRadius:8,border:"2px solid",textAlign:"left",
                          borderColor:parceiraSel===p.id?"#7B00C4":"var(--gray-200)",
                          background:parceiraSel===p.id?"#f5f3ff":"white",
                          cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,
                          color:parceiraSel===p.id?"#7B00C4":"var(--text-muted)"}}>
                        {p.nome}
                        <span style={{display:"block",fontSize:11,fontWeight:400,marginTop:2}}>
                          {p.crp&&<span>CRP {p.crp} · </span>}WhatsApp: {p.telefone}
                        </span>
                      </button>
                    ))}
                  </div>
              }
              {/* Valor do pacote fechado */}
              <div style={{marginTop:12}}>
                <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>
                  Valor do pacote fechado (R$) <span style={{color:"#dc2626"}}>*</span>
                </label>
                <input type="number" value={valorPacoteParceria}
                  onChange={e=>setValorPacoteParceria(e.target.value)}
                  className="form-input" placeholder="Ex: 800"/>
                {valorPacoteParceria&&parseFloat(valorPacoteParceria)>0&&(
                  <div style={{fontSize:12,color:"#7B00C4",marginTop:6,background:"#f5f3ff",borderRadius:6,padding:"6px 10px"}}>
                    Comissão clínica: <b>R$ {(parseFloat(valorPacoteParceria)*0.10).toFixed(2).replace(".",",")}</b>
                    {estagiaria&&<span> · Comissão estagiária: <b>R$ {(parseFloat(valorPacoteParceria)*0.10).toFixed(2).replace(".",",")}</b></span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tipo de contratação */}
          <div style={{marginBottom:14}}>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:8}}>Tipo de Contratação</label>
            <div style={{display:"flex",gap:8}}>
              {[{id:"individual",label:"Consulta Individual",valor:300},{id:"pacote",label:"Pacote",valor:250}].map(op=>(
                <button key={op.id} onClick={()=>setTipoContratacao(op.id)}
                  style={{flex:1,padding:"10px 8px",borderRadius:8,border:"2px solid",
                    borderColor:tipoContratacao===op.id?"#16a34a":"var(--gray-200)",
                    background:tipoContratacao===op.id?"#f0fdf4":"white",
                    cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,
                    color:tipoContratacao===op.id?"#16a34a":"var(--text-muted)"}}>
                  {op.label}<br/>
                  <span style={{fontSize:11,fontWeight:400}}>Est. R$ {op.valor}/sessão</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>
              E-mail do paciente <span style={{color:"#dc2626"}}>*</span>
            </label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErro("");}}
              className="form-input" placeholder="email@exemplo.com" autoFocus/>
            <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>
              Necessário para acesso ao portal. Senha inicial: <strong>1234</strong>
            </div>
          </div>

          {erro&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",marginTop:12,fontSize:13,color:"#dc2626"}}>{erro}</div>}

          {/* Feedback pós-salvamento */}
          {salvo&&(
            <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"14px 16px",marginTop:16}}>
              <div style={{fontWeight:700,fontSize:13,color:"#059669",marginBottom:10}}>✅ Paciente cadastrado com sucesso!</div>
              {isParceria&&(
                <button onClick={gerarWhatsApp}
                  style={{width:"100%",padding:"12px",borderRadius:8,border:"none",
                    background:"#25D366",color:"white",cursor:"pointer",
                    fontSize:13,fontWeight:700,fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  📲 Gerar Mensagem para o Paciente (WhatsApp)
                </button>
              )}
              {(isSocial||(!isParceria&&!isSocial))&&lead.telefone&&(
                <button onClick={gerarWhatsAppSocial}
                  style={{width:"100%",padding:"12px",borderRadius:8,border:"none",
                    background:"#25D366",color:"white",cursor:"pointer",
                    fontSize:13,fontWeight:700,fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  📲 Enviar boas-vindas pelo WhatsApp
                </button>
              )}
              <button onClick={onConfirmar}
                style={{width:"100%",marginTop:8,padding:"10px",borderRadius:8,
                  border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",
                  fontSize:13,fontFamily:"inherit",color:"var(--text-muted)"}}>
                Fechar
              </button>
            </div>
          )}
        </div>

        {/* Botões principais */}
        {!salvo&&(
          <div style={{padding:"16px 24px",display:"flex",gap:10}}>
            <button onClick={onCancelar}
              style={{flex:1,padding:"11px 0",borderRadius:8,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:500}}>
              Apenas mover o card
            </button>
            <button onClick={confirmar} disabled={salvando}
              style={{flex:1,padding:"11px 0",borderRadius:8,border:"none",
                background: isParceria?"#7B00C4":isSocial?"#0d9488":"#16a34a",
                color:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:700,
                opacity:salvando?0.7:1}}>
              {salvando?"Cadastrando...":"✓ Sim, cadastrar paciente"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}




// ═══════════════════════════════════════════════════════
//  ALERTAS DE INATIVIDADE — ETAPA 6
// ═══════════════════════════════════════════════════════
function AlertasInatividade({ leads, onAbrirLead }) {
  const [descartados, setDescartados] = useState(new Set());
  const [agora, setAgora] = useState(Date.now());
  const [expandido, setExpandido] = useState(false);

  useEffect(()=>{
    const t = setInterval(()=>setAgora(Date.now()), 60000);
    return ()=>clearInterval(t);
  },[]);

  function extrairMs(campo) {
    if (!campo) return null;
    // Objeto Firestore Timestamp
    if (campo.seconds) return campo.seconds * 1000;
    // Já é Date
    if (campo instanceof Date) return campo.getTime();
    // String ISO
    if (typeof campo === "string") return new Date(campo).getTime();
    // Tenta toDate()
    try { return campo.toDate().getTime(); } catch(e) {}
    return null;
  }

  const alertas = leads
    .filter(l => !l.arquivado && !descartados.has(l.id) && l.status !== "perdido")
    .reduce((acc, lead) => {
      const regra = REGRAS_INATIVIDADE.find(r => r.status === (lead.status || "novo"));
      if (!regra) return acc;
      const ms = extrairMs(lead.updatedAt) || extrairMs(lead.createdAt);
      if (!ms || isNaN(ms)) return acc;
      const inativo = agora - ms;
      if (inativo >= regra.limiteMs) acc.push({ lead, regra, inativo });
      return acc;
    }, [])
    .sort((a,b) => b.inativo - a.inativo);

  if (alertas.length === 0) return null;

  return (
    <div style={{marginBottom:12}}>
      {/* Banner colapsável — 1 linha quando fechado */}
      <button onClick={()=>setExpandido(e=>!e)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 14px",
          background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:expandido?"10px 10px 0 0":10,
          cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#dc2626",flexShrink:0}}/>
        <span style={{fontWeight:700,fontSize:13,color:"#dc2626",flex:1}}>
          {alertas.length} alerta{alertas.length!==1?"s":""} de inatividade
        </span>
        <span style={{fontSize:11,color:"#dc2626",opacity:0.7}}>
          {alertas.slice(0,2).map(a=>a.lead.nome?.split(" ")[0]).join(", ")}{alertas.length>2?` +${alertas.length-2}`:""}
        </span>
        <Icon name={expandido?"chevron-up":"chevron-down"} size={14} style={{color:"#dc2626",flexShrink:0}}/>
      </button>

      {/* Lista expandida */}
      {expandido&&(
        <div style={{border:"1.5px solid #fca5a5",borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"hidden"}}>
          {alertas.map(({lead, regra, inativo},idx)=>{
            const whats = fmtWhats(lead.telefone);
            return (
              <div key={lead.id} style={{
                background:idx%2===0?"#fef9f9":"white",
                borderTop:idx>0?"1px solid #fee2e2":"none",
                padding:"10px 14px",
                display:"flex", alignItems:"center", justifyContent:"space-between",
                gap:10, flexWrap:"wrap"
              }}>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontWeight:600,fontSize:12,color:regra.cor}}>{lead.nome}</span>
                  <span style={{fontSize:11,color:"#6b7280",marginLeft:6}}>{regra.corpo(lead.nome, formatarTempo(inativo)).replace(lead.nome+" ","")}</span>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  {whats&&(
                    <a href={`https://wa.me/${whats}`} target="_blank" rel="noopener noreferrer"
                      style={{display:"flex",alignItems:"center",gap:4,background:"#16a34a",color:"white",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:600,textDecoration:"none"}}>
                      <Icon name="message-circle" size={11}/> WA
                    </a>
                  )}
                  <button onClick={()=>onAbrirLead(lead)}
                    style={{background:"white",border:"1px solid #fca5a5",color:"#dc2626",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                    Ver
                  </button>
                  <button onClick={()=>setDescartados(s=>new Set([...s,lead.id]))}
                    style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",opacity:0.4,padding:"2px 4px",fontSize:14,lineHeight:1}}>
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GerenciamentoParceiras() {
  const [parceiras, setParceiras] = useState([]);
  const [form, setForm]           = useState({nome:"",crp:"",telefone:"",tipo:"parceira"});
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando]   = useState(false);

  useEffect(()=>{
    db.collection("clinica_parceiras").orderBy("createdAt","asc")
      .onSnapshot(s=>setParceiras(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[]);

  async function salvar(){
    if(!form.nome.trim()||!form.telefone.trim()){alert("Nome e telefone obrigatórios.");return;}
    setSalvando(true);
    try {
      if(editandoId){
        await db.collection("clinica_parceiras").doc(editandoId).update({nome:form.nome,crp:form.crp,telefone:form.telefone.replace(/\D/g,""),tipo:form.tipo});
        setEditandoId(null);
      } else {
        await db.collection("clinica_parceiras").add({nome:form.nome,crp:form.crp,telefone:form.telefone.replace(/\D/g,""),tipo:form.tipo,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      }
      setForm({nome:"",crp:"",telefone:"",tipo:"parceira"});
    } catch(e){alert("Erro: "+e.message);}
    setSalvando(false);
  }

  async function excluir(id){
    if(!confirm("Excluir este cadastro?"))return;
    await db.collection("clinica_parceiras").doc(id).delete();
  }

  function editar(p){
    setForm({nome:p.nome,crp:p.crp||"",telefone:p.telefone||"",tipo:p.tipo||"parceira"});
    setEditandoId(p.id);
  }

  const parceirasLista   = parceiras.filter(p=>p.tipo==="parceira");
  const estagiariasLista = parceiras.filter(p=>p.tipo==="estagiaria");

  return(
    <div style={{maxWidth:700}}>
      <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:4}}>Parceiras & Estagiárias</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Psicólogas parceiras e estagiárias do Instituto Cegatti</div>

      {/* Formulário */}
      <div style={{background:"white",borderRadius:12,padding:20,border:"1px solid #e8c8ff",marginBottom:24}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>{editandoId?"✏️ Editar cadastro":"➕ Novo cadastro"}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div style={{gridColumn:"1/-1"}}>
            <label className="form-label">Nome completo *</label>
            <input className="form-input" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Ex: Andréia de Fátima Mateus Silva"/>
          </div>
          <div>
            <label className="form-label">CRP</label>
            <input className="form-input" value={form.crp} onChange={e=>setForm({...form,crp:e.target.value})} placeholder="Ex: 09/14031"/>
          </div>
          <div>
            <label className="form-label">Telefone (WhatsApp) *</label>
            <input className="form-input" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} placeholder="Ex: 5562985666960"/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label className="form-label">Tipo</label>
            <div style={{display:"flex",gap:8}}>
              {[["parceira","🤝 Parceira"],["estagiaria","🎓 Estagiária"]].map(([v,l])=>(
                <button key={v} type="button" onClick={()=>setForm({...form,tipo:v})}
                  style={{flex:1,padding:"9px",borderRadius:8,border:"2px solid",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,
                    borderColor:form.tipo===v?"#7B00C4":"#e5e7eb",
                    background:form.tipo===v?"#f5f3ff":"white",
                    color:form.tipo===v?"#7B00C4":"#6b7280"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {editandoId&&<button className="btn btn-ghost" onClick={()=>{setEditandoId(null);setForm({nome:"",crp:"",telefone:"",tipo:"parceira"});}}>Cancelar</button>}
          <button className="btn btn-purple" onClick={salvar} disabled={salvando} style={{flex:1}}>
            {salvando?"Salvando...":(editandoId?"💾 Salvar alterações":"➕ Cadastrar")}
          </button>
        </div>
      </div>

      {/* Lista Parceiras */}
      {parceirasLista.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{fontWeight:700,fontSize:13,color:"#7B00C4",marginBottom:8}}>🤝 Parceiras</div>
          {parceirasLista.map(p=>(
            <div key={p.id} style={{background:"white",borderRadius:10,padding:"12px 16px",border:"1px solid #e8c8ff",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{p.nome}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>
                  {p.crp&&<span>CRP {p.crp} · </span>}
                  <a href={`https://wa.me/${p.telefone}`} target="_blank" style={{color:"#16a34a",textDecoration:"none"}}>📱 {p.telefone}</a>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>editar(p)} className="btn btn-ghost" style={{padding:"6px 10px",fontSize:12}}><Icon name="pencil" size={13}/></button>
                <button onClick={()=>excluir(p.id)} className="btn btn-ghost" style={{padding:"6px 10px",fontSize:12,color:"#dc2626"}}><Icon name="trash-2" size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista Estagiárias */}
      {estagiariasLista.length>0&&(
        <div>
          <div style={{fontWeight:700,fontSize:13,color:"#0891b2",marginBottom:8}}>🎓 Estagiárias</div>
          {estagiariasLista.map(p=>(
            <div key={p.id} style={{background:"white",borderRadius:10,padding:"12px 16px",border:"1px solid #bae6fd",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{p.nome}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>
                  {p.crp&&<span>CRP {p.crp} · </span>}
                  <a href={`https://wa.me/${p.telefone}`} target="_blank" style={{color:"#16a34a",textDecoration:"none"}}>📱 {p.telefone}</a>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>editar(p)} className="btn btn-ghost" style={{padding:"6px 10px",fontSize:12}}><Icon name="pencil" size={13}/></button>
                <button onClick={()=>excluir(p.id)} className="btn btn-ghost" style={{padding:"6px 10px",fontSize:12,color:"#dc2626"}}><Icon name="trash-2" size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {parceiras.length===0&&(
        <div style={{textAlign:"center",padding:"32px 0",color:"var(--text-muted)",fontSize:13}}>
          Nenhuma parceira ou estagiária cadastrada ainda.
        </div>
      )}
    </div>
  );
}

function FunilLeads({ user }) {
  const [leads, setLeads]                   = useState([]);
  const [modalLead, setModalLead]           = useState(null);
  const [dragOver, setDragOver]             = useState(null);
  const [modalConversao, setModalConversao] = useState(null);
  const [abaFunil, setAbaFunil]             = useState("kanban");
  const [busca, setBusca]                   = useState("");
  const [filtroTemp, setFiltroTemp]         = useState("todos");

  useEffect(()=>{
    db.collection("clinica_leads")
      .onSnapshot(s=>setLeads(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[]);

  async function moverLead(leadId, novoStatus) {
    await db.collection("clinica_leads").doc(leadId).update({
      status: novoStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(()=>{});
  }

  function onDrop(e, colId) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) { setDragOver(null); return; }
    if (colId === "convertido" || colId === "convertido_social" || colId === "convertido_parceria") {
      const lead = leads.find(l=>l.id===leadId);
      if (lead) {
        moverLead(leadId, colId);
        setModalConversao({...lead, _tipoConversao: colId});
      }
    } else {
      moverLead(leadId, colId);
    }
    setDragOver(null);
  }

  const leadsColuna = (colId) => leads.filter(l=>{
    if((l.status||"novo")!==colId || l.arquivado) return false;
    if(filtroTemp!=="todos" && (l.temperatura||"morno")!==filtroTemp) return false;
    if(busca.trim()){
      const q = busca.trim().toLowerCase();
      const nome = (l.nome||"").toLowerCase();
      const tel  = (l.telefone||"").replace(/\D/g,"");
      const qTel = q.replace(/\D/g,"");
      if(!nome.includes(q) && !tel.includes(qTel)) return false;
    }
    return true;
  });

  return (
    <div style={{padding:"20px 24px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:600}}>Funil de Leads</div>
          <div style={{fontSize:13,color:"var(--text-muted)",marginTop:2}}>{leads.filter(l=>!l.arquivado).length} lead{leads.filter(l=>!l.arquivado).length!==1?"s":""} no funil</div>
        </div>
        {abaFunil==="kanban"&&(
          <button onClick={()=>setModalLead({})} className="btn-primary" style={{display:"flex",alignItems:"center",gap:6}}>
            <Icon name="plus" size={15}/> Novo Lead
          </button>
        )}
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"2px solid var(--gray-100)",paddingBottom:0}}>
        {[["kanban","📋 Kanban"],["parceiras","🤝 Parceiras & Estagiárias"]].map(([id,label])=>(
          <button key={id} onClick={()=>setAbaFunil(id)}
            style={{padding:"8px 16px",border:"none",background:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:abaFunil===id?700:400,
              color:abaFunil===id?"#7B00C4":"var(--text-muted)",
              borderBottom:abaFunil===id?"2px solid #7B00C4":"2px solid transparent",
              marginBottom:-2,transition:"all .15s"}}>
            {label}
          </button>
        ))}
      </div>

      {/* Aba Parceiras */}
      {abaFunil==="parceiras"&&<GerenciamentoParceiras/>}

      {abaFunil==="kanban"&&<>
      {/* Barra de busca + filtro temperatura */}
      <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <Icon name="search" size={15} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",pointerEvents:"none"}}/>
          <input
            value={busca} onChange={e=>setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            style={{width:"100%",padding:"9px 12px 9px 34px",border:"1.5px solid",borderColor:busca?"#7B00C4":"#e5e7eb",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",transition:"border-color .15s"}}/>
          {busca&&<button onClick={()=>setBusca("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af",lineHeight:1}}>×</button>}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {v:"todos", l:"Todos",   e:""},
            {v:"quente",l:"Quentes", e:"🔥"},
            {v:"morno", l:"Mornos",  e:"🌡️"},
            {v:"frio",  l:"Frios",   e:"🧊"},
          ].map(({v,l,e})=>(
            <button key={v} onClick={()=>setFiltroTemp(v)}
              style={{padding:"6px 12px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:filtroTemp===v?700:400,fontFamily:"inherit",
                borderColor:filtroTemp===v?"#7B00C4":"#e5e7eb",
                background:filtroTemp===v?"#7B00C4":"white",
                color:filtroTemp===v?"white":"#6b7280",
                transition:"all .15s"}}>
              {e&&<span style={{marginRight:3}}>{e}</span>}{l}
            </button>
          ))}
        </div>
      </div>

      {/* Alertas de inatividade — colapsável */}
      <AlertasInatividade leads={leads} onAbrirLead={l=>setModalLead(l)}/>

      {/* Modo lista quando há busca ou filtro de temperatura */}
      {(busca.trim()||filtroTemp!=="todos") ? (()=>{
        const ORDEM_TEMP = {quente:0,morno:1,frio:2};
        const resultados = leads
          .filter(l=>{
            if(l.arquivado) return false;
            if(filtroTemp!=="todos" && (l.temperatura||"morno")!==filtroTemp) return false;
            if(busca.trim()){
              const q = busca.trim().toLowerCase();
              const nome = (l.nome||"").toLowerCase();
              const tel  = (l.telefone||"").replace(/\D/g,"");
              const qTel = q.replace(/\D/g,"");
              if(!nome.includes(q) && (qTel.length<3 || !tel.includes(qTel))) return false;
            }
            return true;
          })
          .sort((a,b)=>{
            const ta = ORDEM_TEMP[a.temperatura||"morno"]??1;
            const tb = ORDEM_TEMP[b.temperatura||"morno"]??1;
            if(ta!==tb) return ta-tb;
            return (a.nome||"").localeCompare(b.nome||"");
          });

        const TEMP_CFG = {quente:{e:"🔥",c:"#dc2626",bg:"#fef2f2"},morno:{e:"🌡️",c:"#d97706",bg:"#fef3c7"},frio:{e:"🧊",c:"#0891b2",bg:"#e0f2fe"}};
        return (
          <div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:10,fontWeight:500}}>
              {resultados.length} resultado{resultados.length!==1?"s":""} {busca?`para "${busca}"`:""}
              {filtroTemp!=="todos"?` · ${filtroTemp}s`:""}
              {" "}<button onClick={()=>{setBusca("");setFiltroTemp("todos");}} style={{background:"none",border:"none",color:"#7B00C4",cursor:"pointer",fontSize:12,fontWeight:600,padding:0}}>limpar</button>
            </div>
            {resultados.length===0&&(
              <div style={{textAlign:"center",padding:40,color:"#9ca3af",fontSize:13}}>Nenhum lead encontrado.</div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {resultados.map(lead=>{
                const tcfg = TEMP_CFG[lead.temperatura||"morno"]||TEMP_CFG.morno;
                const col = COLUNAS_FUNIL.find(c=>c.id===(lead.status||"novo"));
                return (
                  <div key={lead.id} onClick={()=>setModalLead(lead)}
                    style={{background:"white",border:"1.5px solid #e5e7eb",borderRadius:10,padding:"12px 16px",
                      display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"border-color .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="#7B00C4"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e7eb"}>
                    <span style={{fontSize:18,flexShrink:0}}>{tcfg.e}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,color:"#111827",marginBottom:2}}>{lead.nome||"—"}</div>
                      <div style={{fontSize:11,color:"#6b7280"}}>{lead.telefone||""}{lead.servico?` · ${lead.servico}`:""}</div>
                    </div>
                    {col&&<span style={{fontSize:10,fontWeight:700,color:col.cor,background:col.cor+"18",borderRadius:20,padding:"2px 8px",flexShrink:0}}>{col.label}</span>}
                    <Icon name="chevron-right" size={14} style={{color:"#9ca3af",flexShrink:0}}/>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })() : null}

      {/* Kanban — só aparece quando não há busca/filtro */}
      {!busca.trim()&&filtroTemp==="todos"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,minWidth:0}}>
        {COLUNAS_FUNIL.map(col=>{
          const cards = leadsColuna(col.id);
          const isOver = dragOver===col.id;
          return (
            <div key={col.id}
              onDragOver={e=>{e.preventDefault();setDragOver(col.id);}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={e=>onDrop(e,col.id)}
              style={{
                background: isOver ? col.bg : "#f9fafb",
                borderRadius:12, padding:"12px 10px",
                border: isOver ? `2px solid ${col.cor}` : "2px solid transparent",
                transition:"all .15s", minHeight:400,
              }}>
              {/* Cabeçalho coluna */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:col.cor}}/>
                  <span style={{fontWeight:700,fontSize:12,color:col.cor}}>{col.label.toUpperCase()}</span>
                </div>
                <span style={{background:col.cor+"20",color:col.cor,borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700}}>{cards.length}</span>
              </div>

              {/* Cards */}
              {cards.map(lead=>(
                <CardLead key={lead.id} lead={lead}
                  onEditar={l=>setModalLead(l)}
                  onMover={moverLead}
                  colunas={COLUNAS_FUNIL}/>
              ))}

              {cards.length===0&&(
                <div style={{textAlign:"center",padding:"20px 0",color:"var(--gray-400)",fontSize:12}}>
                  {isOver?"Solte aqui":"Nenhum lead"}
                </div>
              )}
            </div>
          );
        })}
      </div>}

      {/* Modal */}
      {modalLead!==null&&(
        <ModalLead
          lead={modalLead?.id ? modalLead : null}
          user={user}
          onConverter={l=>{ setModalLead(null); setModalConversao(l); }}
          onSalvar={()=>setModalLead(null)}
          onFechar={()=>setModalLead(null)}/>
      )}
      {modalConversao&&(
        <ModalConversao
          lead={modalConversao}
          onConfirmar={()=>setModalConversao(null)}
          onCancelar={()=>setModalConversao(null)}/>
      )}
      </>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD DE PERFORMANCE — ETAPA 5
// ═══════════════════════════════════════════════════════
const CPL_LIMITES = {
  nacional:      { verde:10,  amarelo:15 },
  internacional: { verde:50,  amarelo:999 },
};

function badgeCPL(cpl, abrangencia) {
  const lim = CPL_LIMITES[abrangencia||"nacional"];
  if (cpl <= lim.verde)   return { cor:"#16a34a", bg:"#f0fdf4", label:"✅ Saudável" };
  if (cpl <= lim.amarelo) return { cor:"#d97706", bg:"#fef3c7", label:"⚠️ Atenção" };
  const aviso = abrangencia==="internacional"
    ? "🚨 Alerta de teto atingido. Custo de captação internacional inviabilizando o retorno do consultório."
    : "🚨 Custo acima do limite realista para o mercado nacional. Avaliar pausa imediata do anúncio.";
  return { cor:"#dc2626", bg:"#fef2f2", label:"🚨 Acima do limite", aviso };
}

// ═══════════════════════════════════════════════════════
//  ANÁLISE COLABORATIVA POR CAMPANHA
// ═══════════════════════════════════════════════════════
function AnaliseCampanha({ campanha, user }) {
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto]             = useState("");
  const [enviando, setEnviando]       = useState(false);
  const [pdfs, setPdfs]               = useState([]);
  const [uploadando, setUploadando]   = useState(false);
  const [aberto, setAberto]           = useState(false);

  useEffect(()=>{
    if (!aberto) return;
    const unsub = db.collection("clinica_campanhas").doc(campanha.id)
      .collection("analises").orderBy("createdAt","asc")
      .onSnapshot(s=>setComentarios(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const unsubPdf = db.collection("clinica_campanhas").doc(campanha.id)
      .collection("relatorios").orderBy("createdAt","desc")
      .onSnapshot(s=>setPdfs(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return ()=>{ unsub(); unsubPdf(); };
  },[campanha.id, aberto]);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await db.collection("clinica_campanhas").doc(campanha.id).collection("analises").add({
        texto: texto.trim(),
        autor: user?.nome || "Usuário",
        tipo:  user?.tipo || "psicologa",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setTexto("");
    } catch(e) { alert("Erro ao enviar."); }
    setEnviando(false);
  }

  async function uploadPdf(e) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") { alert("Selecione um arquivo PDF."); return; }
    if (file.size > 5*1024*1024) { alert("Arquivo muito grande. Máximo 5MB."); return; }
    setUploadando(true);
    const reader = new FileReader();
    reader.onload = async(ev)=>{
      try {
        await db.collection("clinica_campanhas").doc(campanha.id).collection("relatorios").add({
          nome:      file.name,
          tamanho:   (file.size/1024).toFixed(0)+"KB",
          base64:    ev.target.result,
          autor:     user?.nome || "Usuário",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch(e) { alert("Erro ao fazer upload."); }
      setUploadando(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function excluirPdf(id) {
    if (!window.confirm("Excluir este relatório?")) return;
    await db.collection("clinica_campanhas").doc(campanha.id).collection("relatorios").doc(id).delete();
  }

  async function excluirComentario(id) {
    await db.collection("clinica_campanhas").doc(campanha.id).collection("analises").doc(id).delete();
  }

  function fmtDH(ts) {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR")+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  }

  const corTipo = { psicologa:"#7B00C4", marketing:"#ea580c", secretaria:"#0891b2" };

  return (
    <div style={{border:"1px solid var(--gray-200)",borderRadius:12,overflow:"hidden",marginBottom:12,background:"white"}}>
      <button onClick={()=>setAberto(x=>!x)}
        style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:"white",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:600}}>{campanha.nome}</span>
          <span style={{fontSize:11,color:"var(--text-muted)"}}>{campanha.abrangencia==="internacional"?"🌍 Internacional":"🇧🇷 Nacional"}</span>
          {comentarios.length>0&&<span style={{background:"#7B00C418",color:"#7B00C4",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>💬 {comentarios.length}</span>}
          {pdfs.length>0&&<span style={{background:"#dc262618",color:"#dc2626",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:600}}>📄 {pdfs.length}</span>}
        </div>
        <Icon name={aberto?"chevron-up":"chevron-down"} size={16}/>
      </button>

      {aberto&&(
        <div style={{borderTop:"1px solid var(--gray-100)",background:"#fafafa"}}>

          {/* PDFs */}
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--gray-100)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontWeight:600,fontSize:13}}>📄 Relatórios em PDF</div>
              <label style={{display:"flex",alignItems:"center",gap:6,background:"#7B00C4",color:"white",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                <Icon name="upload" size={13}/> {uploadando?"Enviando...":"Upload PDF"}
                <input type="file" accept=".pdf" onChange={uploadPdf} style={{display:"none"}} disabled={uploadando}/>
              </label>
            </div>
            {pdfs.length===0
              ? <div style={{fontSize:12,color:"var(--text-muted)"}}>Nenhum relatório ainda.</div>
              : pdfs.map(pdf=>(
                  <div key={pdf.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"white",borderRadius:8,padding:"10px 14px",border:"1px solid var(--gray-100)",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>📄</span>
                      <div>
                        <div style={{fontWeight:600,fontSize:13}}>{pdf.nome}</div>
                        <div style={{fontSize:11,color:"var(--text-muted)"}}>{pdf.tamanho} · {pdf.autor} · {fmtDH(pdf.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <a href={pdf.base64} download={pdf.nome}
                        style={{background:"#f0fdf4",color:"#16a34a",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:600,textDecoration:"none"}}>
                        ⬇ Baixar
                      </a>
                      {(user?.tipo==="psicologa"||pdf.autor===user?.nome)&&(
                        <button onClick={()=>excluirPdf(pdf.id)}
                          style={{background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                ))
            }
          </div>

          {/* Chat */}
          <div style={{padding:"14px 18px"}}>
            <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>💬 Análise e Ações de Ajuste</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14,maxHeight:300,overflowY:"auto",padding:"4px 0"}}>
              {comentarios.length===0
                ? <div style={{fontSize:12,color:"var(--text-muted)",textAlign:"center",padding:16}}>Nenhuma análise ainda.</div>
                : comentarios.map(c=>{
                    const isMe = c.autor===user?.nome;
                    return (
                      <div key={c.id} style={{display:"flex",flexDirection:isMe?"row-reverse":"row",gap:8,alignItems:"flex-start"}}>
                        <div style={{width:30,height:30,borderRadius:"50%",background:corTipo[c.tipo]||"#7B00C4",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:12,flexShrink:0}}>
                          {(c.autor||"?")[0].toUpperCase()}
                        </div>
                        <div style={{maxWidth:"75%"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexDirection:isMe?"row-reverse":"row"}}>
                            <span style={{fontSize:11,fontWeight:600,color:corTipo[c.tipo]||"#7B00C4"}}>{c.autor}</span>
                            <span style={{fontSize:10,color:"var(--gray-400)"}}>{fmtDH(c.createdAt)}</span>
                          </div>
                          <div style={{background:isMe?"#7B00C4":"white",color:isMe?"white":"var(--text)",borderRadius:isMe?"12px 4px 12px 12px":"4px 12px 12px 12px",padding:"10px 14px",fontSize:13,lineHeight:1.6,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",border:isMe?"none":"1px solid var(--gray-100)"}}>
                            {c.texto}
                          </div>
                          {(user?.tipo==="psicologa"||isMe)&&(
                            <button onClick={()=>excluirComentario(c.id)}
                              style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"var(--gray-400)",marginTop:2,padding:"0 4px",fontFamily:"inherit",float:isMe?"right":"left"}}
                              onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                              onMouseLeave={e=>e.currentTarget.style.color="var(--gray-400)"}>
                              excluir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              }
            </div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <TextAreaVoz value={texto} onChange={e=>setTexto(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();enviar();} }}
                rows={2} placeholder="Escreva sua análise ou ação de ajuste... (Enter para enviar)"
                className="form-input" style={{flex:1,resize:"none",fontSize:13}}/>
              <button onClick={enviar} disabled={enviando||!texto.trim()}
                style={{background:"#7B00C4",color:"white",border:"none",borderRadius:8,padding:"10px 14px",cursor:"pointer",opacity:(!texto.trim()||enviando)?0.5:1,flexShrink:0}}>
                <Icon name="send" size={16}/>
              </button>
            </div>
            <div style={{fontSize:10,color:"var(--text-muted)",marginTop:4}}>Enter para enviar · Shift+Enter para nova linha</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnaliseCampanhas({ campanhas, user }) {
  if (campanhas.length===0) return null;
  return (
    <div style={{marginTop:24}}>
      <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,marginBottom:4}}>📊 Análise por Campanha</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>Relatórios em PDF e chat de estratégia entre Psicóloga e Marketing.</div>
      {campanhas.map(c=><AnaliseCampanha key={c.id} campanha={c} user={user}/>)}
    </div>
  );
}

function DashboardPerformance({ user }) {
  const [leads, setLeads]           = useState([]);
  const [pacientes, setPacientes]   = useState([]);
  const [campanhas, setCampanhas]   = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [lancClinica, setLancClinica] = useState([]);
  const [periodo, setPeriodo]       = useState({ de: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10), ate: new Date().toISOString().slice(0,10) });

  useEffect(()=>{
    db.collection("clinica_leads").onSnapshot(s=>setLeads(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_pacientes").where("origem","==","crm-lead").onSnapshot(s=>setPacientes(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_campanhas").onSnapshot(s=>setCampanhas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_lancamentos").where("origem","==","crm-marketing").onSnapshot(s=>setLancamentos(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_lancamentos").where("tipo_lancamento","!=","despesa").onSnapshot(s=>setLancClinica(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[]);

  // Filtro por período
  function noPeriodo(data) { return data >= periodo.de && data <= periodo.ate; }

  const leadsFiltrados      = leads.filter(l=>{ const d=l.createdAt?.toDate?.()?.toISOString().slice(0,10)||""; return d>=periodo.de&&d<=periodo.ate; });
  const convertidosFiltrados = pacientes.filter(p=>{ const d=p.createdAt?.toDate?.()?.toISOString().slice(0,10)||""; return d>=periodo.de&&d<=periodo.ate; });
  const lancFiltrados       = lancamentos.filter(l=>l.data&&noPeriodo(l.data));

  const totalLeads      = leadsFiltrados.length;
  const totalConvertidos = convertidosFiltrados.length;
  const taxaConversao   = totalLeads>0 ? ((totalConvertidos/totalLeads)*100).toFixed(1) : 0;
  const totalInvestido  = lancFiltrados.reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  // CAC
  const cac = totalConvertidos>0 ? totalInvestido/totalConvertidos : 0;

  // Faturamento real (lançamentos do financeiro vinculados a pacientes do CRM)
  const idsConversos = new Set(convertidosFiltrados.map(p=>p.id));
  const receitaReal  = lancClinica.filter(l=>l.pacienteId&&idsConversos.has(l.pacienteId)&&(l.status==="recebido"||l.status==="pago")).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
  // Faturamento estimado para pacientes sem lançamentos
  const pacientesComReceita = new Set(lancClinica.filter(l=>l.pacienteId&&idsConversos.has(l.pacienteId)).map(l=>l.pacienteId));
  const pacientesSemReceita = convertidosFiltrados.filter(p=>!pacientesComReceita.has(p.id));
  const receitaEstimada     = pacientesSemReceita.reduce((a,p)=>a+(p.valorEstimado||300),0);
  const receitaTotal        = receitaReal + receitaEstimada;
  const roi                 = totalInvestido>0 ? (((receitaTotal-totalInvestido)/totalInvestido)*100).toFixed(1) : 0;

  // Por campanha
  const porCampanha = campanhas.map(camp=>{
    const leadsC      = leadsFiltrados.filter(l=>(l.campanhas||[]).includes(camp.nome));
    const convertC    = convertidosFiltrados.filter(p=>(p.campanhas||[]).includes(camp.nome));
    const investidoC  = lancFiltrados.filter(l=>l.campanhaNome===camp.nome).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
    const cpl         = leadsC.length>0&&investidoC>0 ? investidoC/leadsC.length : 0;
    const receitaC    = convertC.reduce((a,p)=>{
      const real = lancClinica.filter(l=>l.pacienteId===p.id&&(l.status==="recebido"||l.status==="pago")).reduce((x,l)=>x+(parseFloat(l.valor)||0),0);
      return a + (real > 0 ? real : (p.valorEstimado||300));
    },0);
    const roiC = investidoC>0 ? (((receitaC-investidoC)/investidoC)*100).toFixed(1) : "—";
    const badge = cpl>0 ? badgeCPL(cpl, camp.abrangencia) : null;
    return { ...camp, leadsC:leadsC.length, convertC:convertC.length, investidoC, cpl, receitaC, roiC, badge };
  }).filter(c=>c.leadsC>0||c.investidoC>0);

  function fmtR(v){ return "R$ "+parseFloat(v||0).toFixed(2).replace(".",","); }
  function fmtPct(v){ return v+"%"; }

  return (
    <div style={{padding:"20px 28px",maxWidth:1000}}>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700}}>Dashboard de Performance</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:2}}>Métricas de captação, custo e retorno</div>
      </div>

      {/* Filtro período */}
      <div style={{background:"white",border:"1px solid var(--gray-200)",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:13,fontWeight:600}}>📅 Período:</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="date" value={periodo.de} onChange={e=>setPeriodo(p=>({...p,de:e.target.value}))}
            style={{border:"1px solid var(--gray-200)",borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"inherit"}}/>
          <span style={{fontSize:12,color:"var(--text-muted)"}}>até</span>
          <input type="date" value={periodo.ate} onChange={e=>setPeriodo(p=>({...p,ate:e.target.value}))}
            style={{border:"1px solid var(--gray-200)",borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"inherit"}}/>
        </div>
        <button onClick={()=>setPeriodo({de:new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10),ate:new Date().toISOString().slice(0,10)})}
          style={{background:"var(--gray-100)",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
          Este mês
        </button>
      </div>

      {/* Cards de resumo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:14,marginBottom:24}}>
        {[
          {label:"Leads Recebidos",    valor:totalLeads,           icon:"users",         cor:"#7B00C4"},
          {label:"Convertidos",        valor:totalConvertidos,     icon:"check-circle",  cor:"#16a34a"},
          {label:"Taxa de Conversão",  valor:fmtPct(taxaConversao),icon:"trending-up",   cor:"#0891b2"},
          {label:"Total Investido",    valor:fmtR(totalInvestido), icon:"dollar-sign",   cor:"#ea580c"},
        ].map((c,i)=>(
          <div key={i} style={{background:"white",borderRadius:12,padding:"16px 18px",border:"1px solid var(--gray-200)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontSize:12,color:"var(--text-muted)",fontWeight:500}}>{c.label}</div>
              <div style={{width:30,height:30,borderRadius:8,background:c.cor+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon name={c.icon} size={15} style={{color:c.cor}}/>
              </div>
            </div>
            <div style={{fontSize:24,fontWeight:700,color:c.cor}}>{c.valor}</div>
          </div>
        ))}
      </div>

      {/* CAC e ROI */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
        <div style={{background:"white",borderRadius:12,padding:20,border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:8}}>💰 CAC — CUSTO DE AQUISIÇÃO POR CLIENTE</div>
          <div style={{fontSize:32,fontWeight:700,color:cac>300?"#dc2626":"#16a34a",marginBottom:4}}>{fmtR(cac)}</div>
          {cac>300&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#dc2626"}}>
            ⚠️ CAC acima de R$ 300,00 — avaliar eficiência das campanhas
          </div>}
          {cac>0&&cac<=300&&<div style={{fontSize:12,color:"#16a34a"}}>✅ Dentro do limite saudável (até R$ 300,00)</div>}
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8}}>Total investido ÷ pacientes convertidos no período</div>
        </div>
        <div style={{background:"white",borderRadius:12,padding:20,border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:8}}>📈 ROI — RETORNO SOBRE INVESTIMENTO</div>
          <div style={{fontSize:32,fontWeight:700,color:parseFloat(roi)>=0?"#16a34a":"#dc2626",marginBottom:4}}>{roi}%</div>
          <div style={{display:"flex",flexDirection:"column",gap:4,fontSize:12,color:"var(--text-muted)"}}>
            <div>Receita real: <strong style={{color:"#16a34a"}}>{fmtR(receitaReal)}</strong></div>
            <div>Receita estimada: <strong style={{color:"#0891b2"}}>{fmtR(receitaEstimada)}</strong> ({pacientesSemReceita.length} pac. sem lançamentos)</div>
            <div>Total investido: <strong style={{color:"#ea580c"}}>{fmtR(totalInvestido)}</strong></div>
          </div>
        </div>
      </div>

      {/* Tabela por campanha */}
      {porCampanha.length>0&&(
        <div style={{background:"white",borderRadius:12,border:"1px solid var(--gray-200)",overflow:"hidden",marginBottom:24}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid var(--gray-100)",fontWeight:600,fontSize:14}}>
            🎯 Performance por Campanha
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--gray-50)"}}>
                  {["Campanha","Tipo","Leads","Convertidos","Investido","CPL","Receita","ROI","Status CPL"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:600,color:"var(--text-muted)",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porCampanha.map(c=>{
                  const b = c.badge;
                  return (
                    <tr key={c.id} style={{borderTop:"1px solid var(--gray-100)"}}>
                      <td style={{padding:"12px 14px",fontWeight:600}}>{c.nome}</td>
                      <td style={{padding:"12px 14px"}}>
                        <span style={{fontSize:11,fontWeight:600,color:c.abrangencia==="internacional"?"#7B00C4":"#0891b2"}}>
                          {c.abrangencia==="internacional"?"🌍 Intl":"🇧🇷 Nac"}
                        </span>
                      </td>
                      <td style={{padding:"12px 14px",textAlign:"center"}}>{c.leadsC}</td>
                      <td style={{padding:"12px 14px",textAlign:"center",color:"#16a34a",fontWeight:600}}>{c.convertC}</td>
                      <td style={{padding:"12px 14px",color:"#ea580c",fontWeight:500}}>{fmtR(c.investidoC)}</td>
                      <td style={{padding:"12px 14px",fontWeight:700,color:b?.cor||"var(--text-muted)"}}>{c.cpl>0?fmtR(c.cpl):"—"}</td>
                      <td style={{padding:"12px 14px",color:"#16a34a",fontWeight:500}}>{fmtR(c.receitaC)}</td>
                      <td style={{padding:"12px 14px",fontWeight:700,color:parseFloat(c.roiC)>=0?"#16a34a":"#dc2626"}}>{c.roiC!=="—"?c.roiC+"%":"—"}</td>
                      <td style={{padding:"12px 14px"}}>
                        {b?(
                          <div>
                            <span style={{background:b.bg,color:b.cor,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{b.label}</span>
                            {b.aviso&&<div style={{fontSize:10,color:b.cor,marginTop:4,maxWidth:200,lineHeight:1.4}}>{b.aviso}</div>}
                          </div>
                        ):"—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {porCampanha.length===0&&(
        <div style={{background:"white",borderRadius:12,border:"1px solid var(--gray-200)",padding:32,textAlign:"center",color:"var(--text-muted)",fontSize:13}}>
          Nenhuma campanha com dados no período selecionado. Crie campanhas no Funil de Leads e lance gastos em Marketing para ver as métricas.
        </div>
      )}

      {/* Área colaborativa por campanha */}
      <AnaliseCampanhas campanhas={campanhas} user={user}/>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
function CentralLancamentosMarketing() {
  const [campanhas, setCampanhas]         = useState([]);
  const [lancamentos, setLancamentos]     = useState([]);
  const [salvando, setSalvando]           = useState(false);
  const [msg, setMsg]                     = useState(null);
  const [novaCampanha, setNovaCampanha]   = useState("");
  const [novaAbrangencia, setNovaAbrangencia] = useState("nacional");
  const [criandoCamp, setCriandoCamp]     = useState(false);
  const [mesFiltro, setMesFiltro]         = useState(new Date().toISOString().slice(0,7));
  const [form, setForm] = useState({
    tipoDespesa: "trafego",
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0,10),
    campanhaId: "",
  });

  useEffect(()=>{
    db.collection("clinica_campanhas").orderBy("nome")
      .onSnapshot(s=>setCampanhas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    db.collection("clinica_lancamentos")
      .where("origem","==","crm-marketing")
      .orderBy("createdAt","desc").limit(20)
      .onSnapshot(s=>setLancamentos(s.docs.map(d=>({id:d.id,...d.data()}))),
        err=>{ // fallback sem orderBy se não tiver índice
          db.collection("clinica_lancamentos")
            .where("origem","==","crm-marketing")
            .onSnapshot(s=>setLancamentos(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))),()=>{});
        });
  },[]);

  const TIPOS = [
    {id:"trafego", label:"Impulsionamento / Tráfego Pago"},
    {id:"agencia", label:"Honorários da Equipe / Agência"},
  ];

  const f = (k,v) => setForm(x=>({...x,[k]:v}));

  async function criarCampanha() {
    if (!novaCampanha.trim()) return;
    if (campanhas.find(c=>c.nome.toLowerCase()===novaCampanha.trim().toLowerCase())) {
      setMsg({tipo:"erro",texto:"Campanha já existe."}); return;
    }
    try {
      const ref = await db.collection("clinica_campanhas").add({
        nome: novaCampanha.trim(),
        abrangencia: novaAbrangencia,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      f("campanhaId", ref.id);
      setNovaCampanha(""); setNovaAbrangencia("nacional");
      setCriandoCamp(false);
    } catch(e) { setMsg({tipo:"erro",texto:"Erro ao criar campanha."}); }
  }

  async function salvar() {
    if (!form.descricao?.trim()) { setMsg({tipo:"erro",texto:"Descrição é obrigatória."}); return; }
    if (!form.valor || !form.data) { setMsg({tipo:"erro",texto:"Valor e data são obrigatórios."}); return; }
    if (parseFloat(form.valor)<=0) { setMsg({tipo:"erro",texto:"Valor deve ser maior que zero."}); return; }
    setSalvando(true);
    try {
      const campanha = campanhas.find(c=>c.id===form.campanhaId);
      await db.collection("clinica_lancamentos").add({
        tipo_lancamento: "despesa",
        tipo:            form.descricao.trim(),
        categoria:       "Marketing",
        descricao:       form.descricao.trim(),
        tipoDespesaMkt:  form.tipoDespesa,
        campanhaId:      form.campanhaId || null,
        campanhaNome:    campanha?.nome || null,
        valor:           parseFloat(form.valor),
        data:            form.data,
        formaPag:        "PIX",
        status:          "pago",
        origem:          "crm-marketing",
        createdAt:       firebase.firestore.FieldValue.serverTimestamp(),
      });
      setMsg({tipo:"ok", texto:`✓ Lançado R$ ${parseFloat(form.valor).toFixed(2).replace(".",",")} — ${form.descricao.trim()}`});
      setForm({tipoDespesa:"trafego", descricao:"", valor:"", data:new Date().toISOString().slice(0,10), campanhaId:""});
      setTimeout(()=>setMsg(null), 4000);
    } catch(e) { setMsg({tipo:"erro",texto:"Erro ao salvar. Tente novamente."}); }
    setSalvando(false);
  }

  async function excluir(lanc) {
    if (!window.confirm(`Excluir o lançamento "${lanc.descricao}" de ${fmtVal(lanc.valor)}? Esta ação não pode ser desfeita.`)) return;
    await db.collection("clinica_lancamentos").doc(lanc.id).delete().catch(()=>{});
  }

  const lancamentosFiltrados = lancamentos.filter(l=>l.data?.startsWith(mesFiltro));

  const totalMes = lancamentosFiltrados.reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  function fmtData(d) { return d ? d.split("-").reverse().join("/") : "—"; }
  function fmtVal(v)  { return "R$ "+parseFloat(v||0).toFixed(2).replace(".",","); }

  return (
    <div style={{marginTop:28}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15}}>💸 Central de Lançamentos</div>
        <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"6px 14px",fontSize:12,color:"#dc2626",fontWeight:600}}>
          🔒 Visível apenas para Administradora
        </div>
      </div>

      {/* Formulário */}
      <div style={{background:"white",border:"1px solid var(--gray-200)",borderRadius:12,padding:20,marginBottom:20}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:16,color:"var(--text-muted)"}}>LANÇAR NOVO GASTO DE MARKETING</div>
        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:14}}>

          <div>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Tipo de Despesa</label>
            <select value={form.tipoDespesa} onChange={e=>f("tipoDespesa",e.target.value)} className="form-input">
              {TIPOS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Descrição / Observação <span style={{color:"#dc2626"}}>*</span></label>
            <input type="text" value={form.descricao} onChange={e=>f("descricao",e.target.value)}
              className="form-input" placeholder='Ex: "Pagamento mensal Agência Scale Views" ou "Créditos Meta Ads maio"'/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div>
              <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Valor (R$)</label>
              <input type="number" min="0" step="0.01" value={form.valor}
                onChange={e=>f("valor",e.target.value)} className="form-input" placeholder="0,00"/>
            </div>
            <div>
              <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>Data de Competência</label>
              <input type="date" value={form.data} onChange={e=>f("data",e.target.value)} className="form-input"/>
            </div>
          </div>

          {/* Campanha + botão criar nova */}
          <div>
            <label style={{fontWeight:600,fontSize:13,display:"block",marginBottom:6}}>
              Campanha Vinculada <span style={{fontWeight:400,color:"var(--text-muted)"}}>(opcional)</span>
            </label>
            <div style={{display:"flex",gap:8}}>
              <select value={form.campanhaId} onChange={e=>f("campanhaId",e.target.value)} className="form-input" style={{flex:1}}>
                <option value="">— Selecionar campanha —</option>
                {campanhas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <button onClick={()=>setCriandoCamp(x=>!x)}
                style={{background: criandoCamp?"#ea580c":"#ea580c18",color: criandoCamp?"white":"#ea580c",border:"1px solid #ea580c40",borderRadius:8,padding:"0 14px",fontWeight:700,fontSize:18,cursor:"pointer",flexShrink:0}}>
                {criandoCamp?"×":"+"}
              </button>
            </div>
            {criandoCamp && (
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:8}}>
                  <input type="text" value={novaCampanha} onChange={e=>setNovaCampanha(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&criarCampanha()}
                    className="form-input" placeholder="Nome da nova campanha..." style={{flex:1}}
                    autoFocus/>
                  <button onClick={criarCampanha}
                    style={{background:"#ea580c",color:"white",border:"none",borderRadius:8,padding:"0 16px",fontWeight:600,fontSize:13,cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>
                    Criar
                  </button>
                </div>
                <div style={{display:"flex",gap:8}}>
                  {["nacional","internacional"].map(op=>(
                    <button key={op} onClick={()=>setNovaAbrangencia(op)}
                      style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid",
                        borderColor:novaAbrangencia===op?"#ea580c":"var(--gray-200)",
                        background:novaAbrangencia===op?"#fff7ed":"white",
                        cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,
                        color:novaAbrangencia===op?"#ea580c":"var(--text-muted)",textTransform:"capitalize"}}>
                      {op==="nacional"?"🇧🇷 Nacional":"🌍 Internacional"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {msg&&(
          <div style={{background:msg.tipo==="ok"?"#f0fdf4":"#fef2f2",border:"1px solid",borderColor:msg.tipo==="ok"?"#bbf7d0":"#fecaca",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:13,color:msg.tipo==="ok"?"#15803d":"#dc2626",fontWeight:500}}>
            {msg.texto}
          </div>
        )}

        <button onClick={salvar} disabled={salvando} className="btn-primary" style={{width:"100%"}}>
          {salvando?"Salvando...":"💾 Salvar e Lançar no Financeiro"}
        </button>
        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8,textAlign:"center"}}>
          O lançamento será registrado automaticamente como despesa paga em "Financeiro Clínica"
        </div>
      </div>

      {/* Histórico */}
      <div style={{background:"white",border:"1px solid var(--gray-200)",borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--gray-100)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontWeight:600,fontSize:13}}>Lançamentos de Marketing</div>
            <input type="month" value={mesFiltro} onChange={e=>setMesFiltro(e.target.value)}
              style={{border:"1px solid var(--gray-200)",borderRadius:6,padding:"4px 8px",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:"#dc2626"}}>{mesFiltro.split("-").reverse().join("/")} : {fmtVal(totalMes)}</div>
        </div>
        {lancamentosFiltrados.length===0
          ? <div style={{padding:24,textAlign:"center",fontSize:13,color:"var(--text-muted)"}}>Nenhum lançamento em {mesFiltro.split("-").reverse().join("/")}.</div>
          : <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"var(--gray-50)"}}>
                  {["Data","Descrição","Campanha","Valor",""].map(h=>(
                    <th key={h} style={{padding:"9px 14px",textAlign:"left",fontWeight:600,color:"var(--text-muted)",fontSize:12}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lancamentosFiltrados.map(l=>(
                  <tr key={l.id} style={{borderTop:"1px solid var(--gray-100)"}}>
                    <td style={{padding:"10px 14px",color:"var(--text-muted)"}}>{fmtData(l.data)}</td>
                    <td style={{padding:"10px 14px",fontWeight:500}}>{l.descricao||"—"}</td>
                    <td style={{padding:"10px 14px"}}>
                      {l.campanhaNome
                        ? <span style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>{l.campanhaNome}</span>
                        : <span style={{color:"var(--gray-400)",fontSize:12}}>—</span>}
                    </td>
                    <td style={{padding:"10px 14px",fontWeight:700,color:"#dc2626"}}>{fmtVal(l.valor)}</td>
                    <td style={{padding:"10px 14px"}}>
                      <button onClick={()=>excluir(l)}
                        style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)",padding:4,display:"flex",alignItems:"center",gap:4,fontSize:12,fontFamily:"inherit"}}
                        onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                        onMouseLeave={e=>e.currentTarget.style.color="var(--gray-400)"}>
                        <Icon name="trash-2" size={13}/> Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {/* Gerenciamento de Campanhas */}
      <div style={{background:"white",border:"1px solid var(--gray-200)",borderRadius:12,overflow:"hidden",marginTop:20}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid var(--gray-100)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:600,fontSize:13}}>🏷️ Gerenciar Campanhas</div>
          <div style={{fontSize:12,color:"var(--text-muted)"}}>{campanhas.length} campanha{campanhas.length!==1?"s":""} cadastrada{campanhas.length!==1?"s":""}</div>
        </div>
        {campanhas.length===0
          ? <div style={{padding:24,textAlign:"center",fontSize:13,color:"var(--text-muted)"}}>Nenhuma campanha cadastrada ainda.</div>
          : <div style={{padding:"8px 0"}}>
              {campanhas.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 18px",borderBottom:"1px solid var(--gray-50)"}}>
                  <span style={{background:"#ea580c18",color:"#ea580c",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:600}}>{c.nome}</span>
                  <button onClick={async()=>{
                    if (!window.confirm(`Excluir a campanha "${c.nome}" e todos os lançamentos financeiros vinculados? Esta ação não pode ser desfeita.`)) return;
                    try {
                      const snap = await db.collection("clinica_lancamentos").where("campanhaId","==",c.id).get();
                      const batch = db.batch();
                      snap.docs.forEach(d=>batch.delete(d.ref));
                      await batch.commit();
                      await db.collection("clinica_campanhas").doc(c.id).delete();
                    } catch(e) { alert("Erro ao excluir."); }
                  }} style={{background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)",padding:4,display:"flex",alignItems:"center",gap:4,fontSize:12,fontFamily:"inherit"}}
                    onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                    onMouseLeave={e=>e.currentTarget.style.color="var(--gray-400)"}>
                    <Icon name="trash-2" size={13}/> Excluir
                  </button>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════
function DashboardMarketing({ user }) {
  const [leads, setLeads] = useState([]);
  useEffect(()=>{
    db.collection("clinica_leads").limit(100)
      .onSnapshot(s=>setLeads(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
  },[]);

  const total     = leads.length;
  const converted = leads.filter(l=>l.status==="convertido").length;
  const inProgress= leads.filter(l=>["contato","proposta","agendado"].includes(l.status)).length;
  const taxa      = total>0 ? Math.round((converted/total)*100) : 0;

  const porOrigem = leads.reduce((acc,l)=>{
    const camps = l.campanhas&&l.campanhas.length>0 ? l.campanhas : ["Não informado"];
    camps.forEach(o=>{ acc[o]=(acc[o]||0)+1; });
    return acc;
  },{});
  const porStatus = leads.reduce((acc,l)=>{ const s=l.status||"novo"; acc[s]=(acc[s]||0)+1; return acc; },{});

  const STATUS_LABEL = { novo:"Novo", contato:"Em contato", proposta:"Proposta enviada", agendado:"Agendado", convertido:"Convertido", convertido_social:"Convertido Social", convertido_parceria:"Convertido — Parceria", perdido:"Perdido" };
  const STATUS_COR   = { novo:"#6b7280", contato:"#0891b2", proposta:"#7B00C4", agendado:"#d97706", convertido:"#16a34a", convertido_social:"#0d9488", convertido_parceria:"#7B00C4", perdido:"#dc2626" };

  return (
    <div style={{padding:"24px 28px",maxWidth:900}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"var(--font-display)",fontSize:26,fontWeight:600}}>Dashboard de Marketing</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:4}}>Captação de leads — somente leitura</div>
      </div>

      {/* Cards resumo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:16,marginBottom:28}}>
        {[
          {label:"Total de Leads",   valor:total,      icon:"users",        cor:"#7B00C4"},
          {label:"Em andamento",     valor:inProgress,  icon:"clock",        cor:"#0891b2"},
          {label:"Convertidos",      valor:converted,   icon:"check-circle", cor:"#16a34a"},
          {label:"Taxa de conversão",valor:taxa+"%",    icon:"trending-up",  cor:"#ea580c"},
        ].map((c,i)=>(
          <div key={i} style={{background:"white",borderRadius:12,padding:"18px 20px",border:"1px solid var(--gray-200)",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{fontSize:12,color:"var(--text-muted)",fontWeight:500}}>{c.label}</div>
              <div style={{width:32,height:32,borderRadius:8,background:c.cor+"18",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon name={c.icon} size={16} style={{color:c.cor}}/>
              </div>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:c.cor}}>{c.valor}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:28}}>
        {/* Por origem */}
        <div style={{background:"white",borderRadius:12,padding:20,border:"1px solid var(--gray-200)"}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>📊 Leads por Origem</div>
          {Object.keys(porOrigem).length===0
            ? <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum dado ainda.</div>
            : Object.entries(porOrigem).sort((a,b)=>b[1]-a[1]).map(([origem,qty])=>{
                const pct = total>0?Math.round((qty/total)*100):0;
                return (
                  <div key={origem} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                      <span>{origem}</span><span style={{fontWeight:600}}>{qty} ({pct}%)</span>
                    </div>
                    <div style={{background:"var(--gray-100)",borderRadius:4,height:6}}>
                      <div style={{width:pct+"%",height:"100%",background:"#7B00C4",borderRadius:4}}/>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Por status */}
        <div style={{background:"white",borderRadius:12,padding:20,border:"1px solid var(--gray-200)"}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>🎯 Leads por Status</div>
          {Object.keys(porStatus).length===0
            ? <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum dado ainda.</div>
            : Object.entries(porStatus).sort((a,b)=>b[1]-a[1]).map(([status,qty])=>(
                <div key={status} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:8,marginBottom:6,background:((STATUS_COR[status]||"#6b7280")+"15")}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:STATUS_COR[status]||"#6b7280"}}/>
                    <span style={{fontSize:13}}>{STATUS_LABEL[status]||status}</span>
                  </div>
                  <span style={{fontWeight:700,fontSize:14,color:STATUS_COR[status]||"#6b7280"}}>{qty}</span>
                </div>
              ))
          }
        </div>
      </div>

      {/* Lista de leads recentes */}
      <div style={{background:"white",borderRadius:12,border:"1px solid var(--gray-200)",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--gray-100)",fontWeight:600,fontSize:14}}>
          📋 Leads Recentes
        </div>
        {leads.length===0
          ? <div style={{padding:24,textAlign:"center",fontSize:13,color:"var(--text-muted)"}}>Nenhum lead cadastrado ainda.</div>
          : <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{background:"var(--gray-50)"}}>
                    {["Nome","Origem","Status","Contato","Data"].map(h=>(
                      <th key={h} style={{padding:"10px 16px",textAlign:"left",fontWeight:600,color:"var(--text-muted)",fontSize:12}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0,20).map(l=>(
                    <tr key={l.id} style={{borderTop:"1px solid var(--gray-100)"}}>
                      <td style={{padding:"10px 16px",fontWeight:500}}>{l.nome||"—"}</td>
                      <td style={{padding:"10px 16px",color:"var(--text-muted)"}}>{(l.campanhas||[]).join(", ")||"—"}</td>
                      <td style={{padding:"10px 16px"}}>
                        <span style={{background:(STATUS_COR[l.status]||"#6b7280")+"20",color:STATUS_COR[l.status]||"#6b7280",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}>
                          {STATUS_LABEL[l.status]||l.status||"novo"}
                        </span>
                      </td>
                      <td style={{padding:"10px 16px",color:"var(--text-muted)"}}>{l.telefone||l.email||"—"}</td>
                      <td style={{padding:"10px 16px",color:"var(--text-muted)"}}>
                        {l.createdAt?.toDate ? l.createdAt.toDate().toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
      {/* Central de Lançamentos — só psicóloga */}
      {user?.tipo==="psicologa" && <CentralLancamentosMarketing/>}
    </div>
  );
}
