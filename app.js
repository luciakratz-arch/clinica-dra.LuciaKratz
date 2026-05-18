// ═══════════════════════════════════════════════════════
//  AGENDA DA SALA — Dra. Lucia Kratz & Thais Cordeiro
// ═══════════════════════════════════════════════════════

const { useState, useEffect, useRef } = React;

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

const LOGO_URL  = "../logo-transparente.png";
const SITE_URL  = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";
const WA_LUCIA  = "5562991546757";
const WA_THAIS  = "5562995370858";

const USUARIOS = {
  lucia: { nome:"Lucia Kratz",    senha:"1234", cor:"#7B00C4", bg:"#f5f0ff", label:"Lucia" },
  thais: { nome:"Thais Cordeiro", senha:"1234", cor:"#ea580c", bg:"#fff7ed", label:"Thais" },
};

// ─── ICON ───────────────────────────────────────────────
function Icon({ name, size=18 }) {
  const ref = useRef(null);
  useEffect(()=>{
    try {
      if(!ref.current||!window.lucide) return;
      ref.current.innerHTML="";
      const n=name.replace(/-([a-z])/g,(_,l)=>l.toUpperCase()).replace(/^./,s=>s.toUpperCase());
      const fn=lucide[n]; if(!fn) return;
      const ic=lucide.createElement(fn);
      ic.setAttribute("width",size);ic.setAttribute("height",size);ic.setAttribute("stroke-width","1.8");
      ref.current.appendChild(ic);
    }catch(e){}
  },[name,size]);
  return <span ref={ref} style={{display:"inline-flex",alignItems:"center"}}/>;
}

function Spinner(){ return <div className="spinner-wrap"><div className="spinner"/></div>; }

// ─── LOGIN ───────────────────────────────────────────────
function Login({ onLogin }) {
  const [etapa, setEtapa]   = useState("perfil");
  const [senha, setSenha]   = useState("");
  const [userId, setUserId] = useState("");
  const [erro, setErro]     = useState("");
  const [loading, setLoading] = useState(false);

  function handleEscolha(id){ setUserId(id); setEtapa("senha"); setErro(""); setSenha(""); }

  function handleLogin(e){
    e.preventDefault(); setErro("");
    const u = USUARIOS[userId];
    if(!u){ setErro("Usuário inválido."); return; }
    if(senha !== u.senha){ setErro("Senha incorreta."); return; }
    onLogin({ id:userId, ...u });
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={LOGO_URL} alt="Logo" onError={e=>e.target.style.display="none"}/>
        <div className="login-name">Agenda da Sala</div>
        <div className="login-sub">Dra. Lucia Kratz · CRP 09/20590</div>
      </div>
      <div className="login-right">
        {etapa==="perfil"&&(
          <>
            <div style={{width:"100%",maxWidth:440}}>
              <div className="login-title">Quem é você?</div>
              <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:24}}>Selecione seu perfil para acessar a agenda.</div>
            </div>
            {Object.entries(USUARIOS).map(([id,u])=>(
              <button key={id} className="profile-card" onClick={()=>handleEscolha(id)}>
                <div className="profile-card-icon" style={{background:u.bg}}>
                  <Icon name="calendar" size={22}/>
                </div>
                <div style={{flex:1}}>
                  <div className="profile-card-name" style={{color:u.cor}}>{u.nome}</div>
                  <div className="profile-card-desc">Agenda compartilhada da sala</div>
                </div>
                <Icon name="chevron-right" size={18}/>
              </button>
            ))}
            <div style={{fontSize:12,color:"var(--gray-400)",marginTop:8}}>
              <a href={SITE_URL} style={{color:"var(--purple)"}}>← Voltar ao site</a>
            </div>
          </>
        )}
        {etapa==="senha"&&(
          <>
            <button className="login-back" onClick={()=>setEtapa("perfil")}>
              <Icon name="arrow-left" size={14}/> Voltar
            </button>
            <form className="login-form" onSubmit={handleLogin}>
              <div>
                <div className="login-form-title" style={{color:USUARIOS[userId]?.cor}}>{USUARIOS[userId]?.nome}</div>
                <div style={{fontSize:13,color:"var(--text-muted)"}}>Acesse a agenda compartilhada</div>
              </div>
              {erro&&<div className="login-error">{erro}</div>}
              <div>
                <label className="form-label">Senha</label>
                <input className="form-input" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="••••" autoFocus/>
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>{loading?"Entrando...":"Entrar"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ───────────────────────────────────────
function App() {
  const [user, setUser]             = useState(null);
  const [reservas, setReservas]     = useState([]);
  const [pedidos, setPedidos]       = useState([]);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [modal, setModal]           = useState(false);
  const [modalConflito, setModalConflito] = useState(null);
  const [modalPedido, setModalPedido] = useState(null);
  const [editando, setEditando]     = useState(null);
  const [salvando, setSalvando]     = useState(false);
  const [form, setForm]             = useState({ data:"", horaInicio:"09:00", horaFim:"10:00", titulo:"", recorrencia:"unico" });

  useEffect(()=>{
    if(!user) return;
    const u1 = db.collection("sala_reservas").orderBy("data").onSnapshot(s=>setReservas(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    const u2 = db.collection("sala_pedidos").where("status","==","pendente").onSnapshot(s=>setPedidos(s.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    return()=>{u1();u2();};
  },[user]);

  function getInicioSemana(offset=0){
    const hoje=new Date(); const dia=hoje.getDay();
    const inicio=new Date(hoje); inicio.setDate(hoje.getDate()-dia+(offset*7)); inicio.setHours(0,0,0,0);
    return inicio;
  }
  function getDiasSemana(offset=0){
    const inicio=getInicioSemana(offset);
    return Array.from({length:7},(_,i)=>{ const d=new Date(inicio); d.setDate(inicio.getDate()+i); return d; });
  }
  function fmt(d){ return d.toISOString().split("T")[0]; }
  function mesLabel(d){ return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}); }

  const dias = getDiasSemana(semanaOffset);
  const hoje = new Date(); hoje.setHours(0,0,0,0);

  function reservasNoDia(dia){
    const str = fmt(dia);
    return reservas.filter(r=>r.data===str).sort((a,b)=>a.horaInicio.localeCompare(b.horaInicio));
  }

  function temConflito(data, horaInicio, horaFim, ignorarId=null){
    return reservas.some(r=>{
      if(r.data!==data) return false;
      if(ignorarId && r.id===ignorarId) return false;
      // sobreposição de horários
      return horaInicio < r.horaFim && horaFim > r.horaInicio;
    });
  }

  async function salvar(){
    if(!form.data||!form.horaInicio||!form.horaFim){ alert("Preencha data, início e fim."); return; }
    if(form.horaInicio>=form.horaFim){ alert("Horário de início deve ser antes do fim."); return; }

    // Verifica conflito
    if(temConflito(form.data, form.horaInicio, form.horaFim, editando)){
      const conflito = reservas.find(r=>
        r.data===form.data && !editando &&
        form.horaInicio < r.horaFim && form.horaFim > r.horaInicio
      );
      setModalConflito({ form: {...form}, conflito });
      return;
    }

    await confirmarSalvar(form);
  }

  async function confirmarSalvar(dados){
    setSalvando(true);
    const base = {
      horaInicio:dados.horaInicio, horaFim:dados.horaFim,
      titulo:dados.titulo||"",
      usuarioId: user.id, usuarioNome: user.nome, cor: user.cor,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if(editando){
      await db.collection("sala_reservas").doc(editando).update(base);
    } else if(dados.recorrencia==="recorrente"){
      const dataInicio = new Date(dados.data+"T00:00:00");
      const batch = db.batch();
      for(let w=0; w<12; w++){
        const d = new Date(dataInicio);
        d.setDate(dataInicio.getDate()+(w*7));
        const ref = db.collection("sala_reservas").doc();
        batch.set(ref, {...base, data:d.toISOString().split("T")[0], recorrenteRef:dados.data});
      }
      await batch.commit();
    } else {
      await db.collection("sala_reservas").add({...base, data:dados.data});
    }
    setModal(false); setEditando(null);
    setForm({ data:"", horaInicio:"09:00", horaFim:"10:00", titulo:"", recorrencia:"unico" });
    setModalConflito(null);
    setSalvando(false);
  }

  async function excluir(id){ if(!confirm("Excluir reserva?"))return; await db.collection("sala_reservas").doc(id).delete(); }

  // Pedido de liberação de horário
  async function pedirLiberacao(reserva){
    const msg = `Olá ${reserva.usuarioNome}! 😊 Você tem a sala reservada das ${reserva.horaInicio} às ${reserva.horaFim} do dia ${new Date(reserva.data+"T00:00:00").toLocaleDateString("pt-BR")}. Posso usar esse horário? Por favor responda no sistema: ${window.location.href}`;
    const waNum = reserva.usuarioId==="lucia" ? WA_LUCIA : WA_THAIS;
    await db.collection("sala_pedidos").add({
      reservaId: reserva.id,
      de: user.id,
      deNome: user.nome,
      para: reserva.usuarioId,
      paraNome: reserva.usuarioNome,
      data: reserva.data,
      horaInicio: reserva.horaInicio,
      horaFim: reserva.horaFim,
      status: "pendente",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank");
    setModalConflito(null);
  }

  async function responderPedido(pedidoId, aceitar){
    const pedido = pedidos.find(p=>p.id===pedidoId);
    if(!pedido) return;
    if(aceitar){
      // Libera a reserva existente
      await db.collection("sala_reservas").doc(pedido.reservaId).delete();
      const msg = `${pedido.deNome}, liberei o horário das ${pedido.horaInicio} às ${pedido.horaFim}! Sala disponível para você. 🟣`;
      const waNum = pedido.de==="lucia" ? WA_LUCIA : WA_THAIS;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      const msg = `${pedido.deNome}, não consigo liberar o horário das ${pedido.horaInicio} às ${pedido.horaFim}. Podemos tentar outro horário? 😊`;
      const waNum = pedido.de==="lucia" ? WA_LUCIA : WA_THAIS;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank");
    }
    await db.collection("sala_pedidos").doc(pedidoId).update({ status: aceitar?"aceito":"recusado" });
    setModalPedido(null);
  }

  function abrirNovaReserva(data){
    setForm({ data:fmt(data), horaInicio:"09:00", horaFim:"10:00", titulo:"", recorrencia:"unico" });
    setEditando(null); setModal(true);
  }

  function abrirEditar(r){
    if(r.usuarioId !== user.id){ alert("Você só pode editar suas próprias reservas."); return; }
    setForm({ data:r.data, horaInicio:r.horaInicio, horaFim:r.horaFim, titulo:r.titulo||"" });
    setEditando(r.id); setModal(true);
  }

  const pedidosParaMim = pedidos.filter(p=>p.para===user?.id);

  if(!user) return <Login onLogin={setUser}/>;

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <img src={LOGO_URL} alt="Logo" onError={e=>e.target.style.display="none"}/>
          <div>
            <div className="sidebar-title">Agenda da Sala</div>
            <div className="sidebar-sub">Espaço compartilhado</div>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{background:user.cor}}>
            {user.nome[0]}
          </div>
          <div>
            <div className="sidebar-user-name">{user.nome}</div>
            <div className="sidebar-user-role">Psicóloga</div>
          </div>
        </div>

        {/* Legenda */}
        <div style={{padding:"16px",borderBottom:"1px solid rgba(255,255,255,.1)"}}>
          <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.6)",marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>Legenda</div>
          {Object.entries(USUARIOS).map(([id,u])=>(
            <div key={id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{width:12,height:12,borderRadius:3,background:u.cor,flexShrink:0}}/>
              <span style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>{u.nome.split(" ")[0]}</span>
              {id===user.id&&<span style={{fontSize:10,color:u.cor,fontWeight:600,marginLeft:"auto"}}>você</span>}
            </div>
          ))}
        </div>

        {/* Pedidos pendentes */}
        {pedidosParaMim.length>0&&(
          <div style={{padding:"12px 16px",background:"rgba(239,68,68,.15)",margin:"8px",borderRadius:10}}>
            <div style={{fontSize:12,fontWeight:700,color:"#fca5a5",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
              <Icon name="bell" size={13}/> {pedidosParaMim.length} pedido(s)
            </div>
            {pedidosParaMim.map(p=>(
              <div key={p.id} style={{fontSize:11,color:"rgba(255,255,255,.8)",marginBottom:8}}>
                <div>{p.deNome} quer {p.horaInicio}–{p.horaFim}</div>
                <div style={{display:"flex",gap:6,marginTop:6}}>
                  <button onClick={()=>responderPedido(p.id,true)}
                    style={{flex:1,padding:"4px",borderRadius:6,background:"#059669",color:"white",border:"none",fontSize:11,fontWeight:600,cursor:"pointer"}}>Liberar</button>
                  <button onClick={()=>responderPedido(p.id,false)}
                    style={{flex:1,padding:"4px",borderRadius:6,background:"#dc2626",color:"white",border:"none",fontSize:11,fontWeight:600,cursor:"pointer"}}>Manter</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <button className="nav-item" onClick={()=>{ setForm({data:fmt(hoje),horaInicio:"09:00",horaFim:"10:00",titulo:"",recorrencia:"unico"}); setEditando(null); setModal(true); }}>
            <Icon name="plus" size={16}/> Nova Reserva
          </button>
          <a href={SITE_URL} className="nav-item" style={{color:"rgba(255,255,255,.6)",textDecoration:"none"}}>
            <Icon name="arrow-left" size={16}/> Site
          </a>
          <button className="nav-item nav-item-danger" onClick={()=>setUser(null)}>
            <Icon name="log-out" size={16}/> Sair
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="main">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
          <div>
            <div className="page-title">Agenda da Sala</div>
            <div className="page-sub">Reservas do espaço compartilhado</div>
          </div>
          <button className="btn btn-purple" onClick={()=>{ setForm({data:fmt(hoje),horaInicio:"09:00",horaFim:"10:00",titulo:"",recorrencia:"unico"}); setEditando(null); setModal(true); }}>
            <Icon name="plus" size={15}/> Nova Reserva
          </button>
        </div>

        {/* Navegação semana */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <button className="btn btn-ghost" style={{padding:"8px 12px"}} onClick={()=>setSemanaOffset(o=>o-1)}>
            <Icon name="chevron-left" size={18}/>
          </button>
          <div style={{flex:1,textAlign:"center",fontWeight:600,fontSize:15}}>
            {mesLabel(dias[0])} — {dias[6].toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}
          </div>
          <button className="btn btn-ghost" style={{padding:"6px 12px",fontSize:12}} onClick={()=>setSemanaOffset(0)}>Hoje</button>
          <button className="btn btn-ghost" style={{padding:"8px 12px"}} onClick={()=>setSemanaOffset(o=>o+1)}>
            <Icon name="chevron-right" size={18}/>
          </button>
        </div>

        {/* Grade da semana — colunas fixas */}
        <div style={{overflowX:"auto",marginBottom:24}}>
          <table style={{width:"100%",tableLayout:"fixed",borderCollapse:"separate",borderSpacing:4}}>
            <colgroup>
              {dias.map((_,i)=><col key={i} style={{width:"calc(100% / 7)"}}/>)}
            </colgroup>
            <thead>
              <tr>
                {dias.map((dia,i)=>{
                  const isHoje = fmt(dia)===fmt(hoje);
                  const isPassado = dia < hoje;
                  return (
                    <th key={i} style={{
                      padding:"10px 6px",textAlign:"center",
                      background:isHoje?"var(--purple)":"white",
                      border:"1.5px solid",borderColor:isHoje?"var(--purple)":"var(--gray-200)",
                      borderRadius:10,fontWeight:"normal"
                    }}>
                      <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:.5,
                        color:isHoje?"rgba(255,255,255,.8)":isPassado?"#9ca3af":"var(--gray-500)"}}>
                        {dia.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","").toUpperCase()}
                      </div>
                      <div style={{fontSize:22,fontWeight:800,lineHeight:1.1,
                        color:isHoje?"white":isPassado?"#9ca3af":"var(--gray-800)"}}>
                        {dia.getDate()}
                      </div>
                      <div style={{fontSize:10,color:isHoje?"rgba(255,255,255,.65)":"var(--gray-400)"}}>
                        {dia.toLocaleDateString("pt-BR",{month:"short"})}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                {dias.map(dia=>{
                  const isHoje = fmt(dia)===fmt(hoje);
                  const resDia = reservasNoDia(dia);
                  return (
                    <td key={fmt(dia)} style={{
                      verticalAlign:"top",padding:4,minHeight:100,
                      background:isHoje?"#faf5ff":"white",
                      border:"1.5px solid",borderColor:isHoje?"var(--purple)20":"var(--gray-200)",
                      borderRadius:10
                    }}>
                      <div style={{display:"flex",flexDirection:"column",gap:4,minHeight:80}}>
                        {resDia.map(r=>{
                          const eDaMinha = r.usuarioId===user.id;
                          const cor = r.usuarioId==="lucia" ? "#7B00C4" : "#ea580c";
                          const bg  = r.usuarioId==="lucia" ? "#f5f0ff" : "#fff7ed";
                          return (
                            <div key={r.id}
                              onClick={()=>eDaMinha?abrirEditar(r):null}
                              style={{
                                background:bg,borderLeft:"3px solid "+cor,
                                borderRadius:6,padding:"5px 7px",
                                cursor:eDaMinha?"pointer":"default",fontSize:11
                              }}>
                              <div style={{fontWeight:700,color:cor,fontSize:12}}>{r.horaInicio}–{r.horaFim}</div>
                              <div style={{color:"#374151",fontWeight:500,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                {eDaMinha?(r.titulo||"Minha reserva"):`Ocupado — ${r.usuarioNome.split(" ")[0]}`}
                              </div>
                              {!eDaMinha&&(
                                <button onClick={e=>{e.stopPropagation();pedirLiberacao(r);}}
                                  style={{marginTop:4,fontSize:10,background:"white",border:"1px solid "+cor,borderRadius:4,padding:"2px 6px",cursor:"pointer",color:cor,fontFamily:"var(--font-body)",width:"100%"}}>
                                  Pedir horário
                                </button>
                              )}
                              {eDaMinha&&(
                                <button onClick={e=>{e.stopPropagation();excluir(r.id);}}
                                  style={{marginTop:4,fontSize:10,background:"white",border:"1px solid #fca5a5",borderRadius:4,padding:"2px 6px",cursor:"pointer",color:"#dc2626",fontFamily:"var(--font-body)",width:"100%"}}>
                                  Cancelar
                                </button>
                              )}
                            </div>
                          );
                        })}
                        <button onClick={()=>abrirNovaReserva(dia)}
                          style={{background:"none",border:"1px dashed #d1d5db",borderRadius:6,padding:"6px",cursor:"pointer",color:"#9ca3af",fontSize:14,width:"100%",marginTop:"auto"}}>
                          +
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Minhas reservas futuras */}
        <div style={{marginTop:28}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>Minhas próximas reservas</div>
          {reservas.filter(r=>r.usuarioId===user.id&&r.data>=fmt(hoje)).length===0
            ? <div className="card" style={{textAlign:"center",padding:32,color:"var(--text-muted)",fontSize:14}}>
                Nenhuma reserva futura. Clique em "+ Nova Reserva" para bloquear um horário.
              </div>
            : <div className="card" style={{padding:0}}>
                {reservas.filter(r=>r.usuarioId===user.id&&r.data>=fmt(hoje))
                  .sort((a,b)=>a.data.localeCompare(b.data)||a.horaInicio.localeCompare(b.horaInicio))
                  .map(r=>(
                  <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid var(--gray-100)"}}>
                    <div style={{width:42,height:42,borderRadius:10,background:user.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <Icon name="calendar" size={18}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:14}}>{new Date(r.data+"T00:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}</div>
                      <div style={{fontSize:12,color:"var(--text-muted)"}}>{r.horaInicio} – {r.horaFim}{r.titulo?" · "+r.titulo:""}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button className="btn btn-ghost" style={{padding:"6px 10px"}} onClick={()=>abrirEditar(r)}><Icon name="pencil" size={13}/></button>
                      <button className="btn btn-ghost" style={{padding:"6px 10px",color:"#dc2626"}} onClick={()=>excluir(r.id)}><Icon name="trash-2" size={13}/></button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* MODAL NOVA/EDITAR RESERVA */}
      {modal&&(
        <div className="modal-bg" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">
              {editando?"Editar Reserva":"Nova Reserva"}
              <button onClick={()=>{setModal(false);setEditando(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {/* Recorrência — só na criação */}
              {!editando&&(
                <div className="form-group" style={{gridColumn:"1/-1"}}>
                  <label className="form-label">Tipo de reserva</label>
                  <div style={{display:"flex",gap:8}}>
                    {[["unico","Só este dia",user?.cor||"#7B00C4"],["recorrente","Toda semana (12 sem.)","#059669"]].map(([v,l,c])=>(
                      <button key={v} type="button" onClick={()=>setForm({...form,recorrencia:v})}
                        style={{flex:1,padding:"10px 8px",borderRadius:10,border:"1.5px solid",
                          borderColor:(form.recorrencia||"unico")===v?c:"#e5e7eb",
                          background:(form.recorrencia||"unico")===v?c+"18":"white",
                          color:(form.recorrencia||"unico")===v?c:"#6b7280",
                          fontWeight:600,cursor:"pointer",fontSize:12,fontFamily:"var(--font-body)"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {form.recorrencia==="recorrente"&&(
                    <div style={{marginTop:6,fontSize:12,color:"#059669",background:"#f0fdf4",borderRadius:8,padding:"7px 10px"}}>
                      ✓ Bloqueia este dia da semana por 12 semanas consecutivas
                    </div>
                  )}
                </div>
              )}
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Data</label>
                <input className="form-input" type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Início</label>
                <input className="form-input" type="time" value={form.horaInicio} onChange={e=>setForm({...form,horaInicio:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Fim</label>
                <input className="form-input" type="time" value={form.horaFim} onChange={e=>setForm({...form,horaFim:e.target.value})}/>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Título (opcional)</label>
                <input className="form-input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Ex: Sessão, Supervisão..."/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <button className="btn btn-ghost" onClick={()=>{setModal(false);setEditando(null);}}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}
                style={{background:user?.cor||"var(--purple)"}}>
                {salvando?"Salvando...":editando?"Salvar":"Reservar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFLITO */}
      {modalConflito&&(
        <div className="modal-bg" onClick={()=>setModalConflito(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">
              ⚠️ Conflito de Horário
              <button onClick={()=>setModalConflito(null)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div className="conflito-banner">
              <div className="conflito-banner-title">Horário já reservado</div>
              <div className="conflito-banner-sub">
                {modalConflito.conflito?.usuarioNome} tem a sala das {modalConflito.conflito?.horaInicio} às {modalConflito.conflito?.horaFim} neste dia.
              </div>
            </div>
            <p style={{fontSize:14,color:"var(--text-muted)",marginBottom:20,lineHeight:1.6}}>
              Você pode pedir a liberação do horário. Um link do WhatsApp será aberto para {modalConflito.conflito?.usuarioNome?.split(" ")[0]} confirmar.
            </p>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModalConflito(null)}>Cancelar</button>
              <button className="btn btn-purple" onClick={()=>pedirLiberacao(modalConflito.conflito)}
                style={{background:"#d97706"}}>
                <Icon name="message-circle" size={15}/> Pedir via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
