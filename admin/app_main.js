const { useState, useEffect, useCallback, useRef, useMemo } = React;
const db = firebase.firestore();

function VitrineProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const formVazio = {titulo:"",descricao:"",imagemUrl:"",linkVendas:"",textoBotao:"",ativo:true};
  const [form, setForm] = useState(formVazio);

  useEffect(()=>{
    const unsub = db.collection("produtos_vitrine").onSnapshot(s=>{
      const docs = s.docs.map(d=>({id:d.id,...d.data()}));
      docs.sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
      setProdutos(docs);
      setLoading(false);
    },()=>setLoading(false));
    return unsub;
  },[]);

  function abrirNovo(){ setForm(formVazio); setEditando(null); setModal(true); }
  function abrirEditar(p){ setForm({titulo:p.titulo||"",descricao:p.descricao||"",imagemUrl:p.imagemUrl||"",linkVendas:p.linkVendas||"",textoBotao:p.textoBotao||"",ativo:p.ativo!==false}); setEditando(p.id); setModal(true); }

  async function salvar(){
    if(!form.titulo||!form.linkVendas){ alert("Título e link de vendas são obrigatórios."); return; }
    setSalvando(true);
    try {
      const dados = {...form, updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
      if(editando){
        await db.collection("produtos_vitrine").doc(editando).update(dados);
      } else {
        await db.collection("produtos_vitrine").add({...dados, createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      }
      setModal(false); setEditando(null); setForm(formVazio);
    } catch(e){ alert("Erro ao salvar: "+e.message); }
    finally{ setSalvando(false); }
  }

  async function toggleAtivo(p){
    await db.collection("produtos_vitrine").doc(p.id).update({ativo:!p.ativo});
  }

  async function excluir(id){
    if(!confirm("Excluir este produto da vitrine?")) return;
    await db.collection("produtos_vitrine").doc(id).delete();
  }

  if(loading) return <Spinner/>;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <div className="page-title">🛍️ Vitrine de Produtos</div>
          <div className="page-subtitle">{produtos.length} produto(s) · {produtos.filter(p=>p.ativo).length} ativo(s)</div>
        </div>
        <button className="btn btn-purple" onClick={abrirNovo}><Icon name="plus" size={15}/> Novo Produto</button>
      </div>

      {produtos.length===0?(
        <div className="card" style={{textAlign:"center",padding:60,color:"var(--text-muted)"}}>
          <Icon name="shopping-bag" size={48}/>
          <div style={{marginTop:12,fontWeight:600}}>Nenhum produto cadastrado</div>
          <p style={{fontSize:13,marginTop:8,marginBottom:20}}>Cadastre produtos como o 9&Self para exibir no portal do paciente.</p>
          <button className="btn btn-purple" onClick={abrirNovo}><Icon name="plus" size={14}/> Cadastrar primeiro produto</button>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {produtos.map(p=>(
            <div key={p.id} className="card" style={{padding:"18px 20px",opacity:p.ativo?1:0.6}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                {p.imagemUrl?(
                  <img src={p.imagemUrl} alt={p.titulo} style={{width:72,height:56,objectFit:"cover",borderRadius:8,flexShrink:0}}/>
                ):(
                  <div style={{width:72,height:56,background:"var(--purple-soft)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon name="image" size={22}/>
                  </div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:15}}>{p.titulo}</span>
                    <span style={{background:p.ativo?"#d1fae5":"#f3f4f6",color:p.ativo?"#065f46":"#6b7280",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600}}>
                      {p.ativo?"✓ Ativo":"Inativo"}
                    </span>
                  </div>
                  {p.descricao&&<div style={{fontSize:13,color:"var(--text-muted)",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.descricao}</div>}
                  {p.linkVendas&&<div style={{fontSize:12,color:"#2563eb"}}><Icon name="link" size={11}/> {p.linkVendas}</div>}
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:14,paddingTop:12,borderTop:"1px solid var(--gray-100)",flexWrap:"wrap"}}>
                <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>abrirEditar(p)}><Icon name="pencil" size={13}/> Editar</button>
                <button className="btn btn-ghost" style={{fontSize:12,color:p.ativo?"#d97706":"#059669"}} onClick={()=>toggleAtivo(p)}>
                  <Icon name={p.ativo?"eye-off":"eye"} size={13}/> {p.ativo?"Desativar":"Ativar"}
                </button>
                {p.linkVendas&&(
                  <a href={p.linkVendas} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{fontSize:12,textDecoration:"none"}}>
                    <Icon name="external-link" size={13}/> Ver página
                  </a>
                )}
                <button className="btn btn-ghost" style={{fontSize:12,color:"#dc2626",marginLeft:"auto"}} onClick={()=>excluir(p.id)}><Icon name="trash-2" size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:20}}>{editando?"Editar Produto":"Novo Produto"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input className="form-input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Ex: Mapeamento de Perfil 9&Self"/>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição (copy do produto)</label>
                <textarea className="form-input" rows={3} value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} placeholder="Texto comercial exibido no card do paciente..."/>
              </div>
              <div className="form-group">
                <label className="form-label">URL da imagem / banner</label>
                <input className="form-input" value={form.imagemUrl} onChange={e=>setForm({...form,imagemUrl:e.target.value})} placeholder="https://..."/>
              </div>
              <div className="form-group">
                <label className="form-label">Link de vendas / checkout *</label>
                <input className="form-input" value={form.linkVendas} onChange={e=>setForm({...form,linkVendas:e.target.value})} placeholder="https://..."/>
              </div>
              <div className="form-group">
                <label className="form-label">Texto do botão</label>
                <input className="form-input" value={form.textoBotao} onChange={e=>setForm({...form,textoBotao:e.target.value})} placeholder="Ex: Quero Fazer Meu Mapeamento"/>
              </div>
              <div style={{display:"flex",gap:10}}>
                {[true,false].map(v=>(
                  <button key={v+""}  type="button" onClick={()=>setForm({...form,ativo:v})}
                    style={{flex:1,padding:"10px",borderRadius:10,border:"1.5px solid",borderColor:form.ativo===v?"var(--purple)":"#e5e7eb",background:form.ativo===v?"var(--purple-soft)":"white",color:form.ativo===v?"var(--purple)":"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13}}>
                    {v?"✓ Ativo no portal":"Inativo (oculto)"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar} disabled={salvando}>{salvando?"Salvando...":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(null);
  const notifProps = useBotaoNotificacao(user);
  // ═══════════════════════════════════════════════════════
// PAINEL DE PERMISSÕES
// ═══════════════════════════════════════════════════════
const PERMISSOES_DEFAULT = {
  psicologa:  {ver_financeiro_clinica:true,ver_financeiro_pessoal:true,ver_pacientes:true,ver_agenda:true,ver_marketing:true,ver_funil:true,ver_resumo_marketing:true,ver_supervisao:true,ver_relatorios:true,editar_financeiro:true,editar_pacientes:true},
  secretaria: {ver_financeiro_clinica:true,ver_financeiro_pessoal:false,ver_pacientes:true,ver_agenda:true,ver_marketing:false,ver_funil:false,ver_resumo_marketing:false,ver_supervisao:false,ver_relatorios:true,editar_financeiro:true,editar_pacientes:true},
  paulo:      {ver_financeiro_clinica:true,ver_financeiro_pessoal:true,ver_pacientes:false,ver_agenda:false,ver_marketing:false,ver_funil:false,ver_resumo_marketing:false,ver_supervisao:false,ver_relatorios:true,editar_financeiro:true,editar_pacientes:false},
  marketing:  {ver_financeiro_clinica:false,ver_financeiro_pessoal:false,ver_pacientes:false,ver_agenda:false,ver_marketing:true,ver_funil:true,ver_resumo_marketing:true,ver_supervisao:false,ver_relatorios:false,editar_financeiro:false,editar_pacientes:false},
};

const PERMISSOES_LABELS = [
  {id:"ver_financeiro_clinica",  label:"Ver Financeiro da Clínica",  grupo:"💰 Financeiro"},
  {id:"ver_financeiro_pessoal",  label:"Ver Financeiro Pessoal",     grupo:"💰 Financeiro"},
  {id:"ver_relatorios",          label:"Ver Relatórios",             grupo:"💰 Financeiro"},
  {id:"ver_pacientes",           label:"Ver Pacientes",              grupo:"🏥 Clínica"},
  {id:"ver_agenda",              label:"Ver Agenda",                 grupo:"🏥 Clínica"},
  {id:"ver_supervisao",          label:"Ver Supervisão",             grupo:"🏥 Clínica"},
  {id:"editar_pacientes",        label:"Editar Pacientes",           grupo:"🏥 Clínica"},
  {id:"editar_financeiro",       label:"Editar Financeiro",          grupo:"💰 Financeiro"},
  {id:"ver_marketing",           label:"Ver Dashboard Marketing",    grupo:"📊 Marketing"},
  {id:"ver_funil",               label:"Ver Funil de Leads",        grupo:"📊 Marketing"},
  {id:"ver_resumo_marketing",    label:"Ver Resumo Técnico",        grupo:"📊 Marketing"},
];

function PainelPermissoes() {
  const [perfilSel, setPerfilSel] = useState("secretaria");
  const [permissoes, setPermissoes] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  // Carregar permissões do Firebase ou usar defaults
  useEffect(()=>{
    db.collection("clinica_perfis_permissoes").doc(perfilSel).get().then(doc=>{
      if(doc.exists) setPermissoes(doc.data().permissoes||{});
      else setPermissoes(PERMISSOES_DEFAULT[perfilSel]||{});
    });
  },[perfilSel]);

  async function salvar(){
    setSalvando(true);
    await db.collection("clinica_perfis_permissoes").doc(perfilSel).set({
      perfilId:perfilSel, permissoes,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    setSalvando(false); setSalvo(true);
    setTimeout(()=>setSalvo(false),2000);
  }

  function toggle(id){ setPermissoes(p=>({...p,[id]:!p[id]})); setSalvo(false); }

  const perfisEdicao = [{id:"secretaria",label:"Secretária",cor:"#0891b2"},{id:"paulo",label:"Financeiro",cor:"#16a34a"},{id:"marketing",label:"Marketing",cor:"#ea580c"}];
  const grupos = [...new Set(PERMISSOES_LABELS.map(p=>p.grupo))];

  return(
    <div style={{maxWidth:640,margin:"0 auto"}}>
      <h2 style={{fontFamily:"var(--font-display)",fontSize:22,marginBottom:4}}>⚙️ Permissões por Perfil</h2>
      <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:24}}>Configure o que cada perfil pode ver e fazer no sistema.</p>

      {/* Seletor de perfil */}
      <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
        {perfisEdicao.map(p=>(
          <button key={p.id} onClick={()=>setPerfilSel(p.id)}
            style={{padding:"8px 20px",borderRadius:20,border:"2px solid",cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"inherit",
              borderColor:perfilSel===p.id?p.cor:"#e5e7eb",
              background:perfilSel===p.id?p.cor+"15":"white",
              color:perfilSel===p.id?p.cor:"#6b7280",transition:"all .15s"}}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Permissões agrupadas */}
      <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:24}}>
        {grupos.map(grupo=>(
          <div key={grupo} style={{background:"white",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb",fontWeight:700,fontSize:13,color:"#374151"}}>
              {grupo}
            </div>
            <div style={{padding:"8px 0"}}>
              {PERMISSOES_LABELS.filter(p=>p.grupo===grupo).map(p=>(
                <label key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",cursor:"pointer",transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                  onMouseLeave={e=>e.currentTarget.style.background="white"}>
                  <input type="checkbox" checked={!!permissoes[p.id]} onChange={()=>toggle(p.id)}
                    style={{width:16,height:16,cursor:"pointer",accentColor:"#7B00C4"}}/>
                  <span style={{fontSize:13,color:"#374151"}}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <button className="btn btn-purple" onClick={salvar} disabled={salvando}>
          {salvando?"Salvando...":"💾 Salvar Permissões"}
        </button>
        {salvo&&<span style={{fontSize:13,color:"#059669",fontWeight:600}}>✅ Salvo!</span>}
        <button className="btn btn-ghost" onClick={()=>setPermissoes(PERMISSOES_DEFAULT[perfilSel]||{})} style={{marginLeft:"auto",fontSize:12}}>
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}

function handleLogin(u){setUser(u);if(u.tipo==="psicologa")setTab("dashboard");if(u.tipo==="secretaria")setTab("pacientes");if(u.tipo==="paulo")setTab("fin-pessoal");if(u.tipo==="marketing")setTab("marketing-dashboard");}
  function handleLogout(){setUser(null);setTab(null);}
  if(!user) return <Login onLogin={handleLogin}/>;
  return (
    <div style={{display:"flex",minHeight:"100vh",width:"100%",overflowX:"auto"}}>
      <Sidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} notifProps={notifProps}/>
      <div className="header-mobile"><div className="header-mobile-logo">Administracao</div><button className="header-mobile-btn" onClick={handleLogout}><Icon name="log-out" size={18}/></button></div>
      <div className="main-content" style={{flex:1,minWidth:0,maxWidth:"100%",overflowX:"hidden"}}>
        {user.tipo==="psicologa"  &&tab==="dashboard"   &&<DashboardAdmin user={user} onVerEvolucao={(pacId)=>{window._pacienteInicialId=pacId;setTab("pacientes");}}/>}
        {user.tipo==="psicologa"  &&tab==="pacientes"   &&<Pacientes user={user}/>}
        {user.tipo==="psicologa"  &&tab==="alunos"      &&<Alunos/>}
        {user.tipo==="psicologa"  &&tab==="casais"      &&<TerapiaCasais/>}
        {user.tipo==="psicologa"  &&tab==="recursos"    &&<RecursosTerapeuticos user={user}/>}
        {user.tipo==="psicologa"  &&tab==="laudos"      &&<Laudos/>}
        {user.tipo==="psicologa"  &&tab==="vitrine"     &&<VitrineProdutos/>}
        {user.tipo==="psicologa"  &&tab==="agenda"      &&<Agenda/>}
        {user.tipo==="psicologa"  &&tab==="fin-clinica" &&<FinanceiroClinica user={user}/>}
        {user.tipo==="psicologa"  &&tab==="comissoes"   &&<Comissoes user={user}/>}
        {user.tipo==="psicologa"  &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={false}/>}
        {user.tipo==="psicologa"  &&tab==="fin-empresa"   &&<FinanceiroEmpresa somenteLeitura={false}/>}
        {user.tipo==="psicologa"  &&tab==="painel-geral"  &&<PainelGeralFinanceiro/>}
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
        {user.tipo==="secretaria" &&tab==="fin-clinica" &&<FinanceiroClinica user={user}/>}
        {user.tipo==="secretaria" &&tab==="comissoes"   &&<Comissoes user={user}/>}
        {user.tipo==="paulo"      &&tab==="fin-pessoal" &&<FinanceiroPessoal somenteLeitura={false}/>}
        {user.tipo==="paulo"      &&tab==="fin-empresa" &&<FinanceiroEmpresa somenteLeitura={false}/>}
        {user.tipo==="paulo"      &&tab==="fin-clinica" &&<FinanceiroClinica user={user}/>}
        {(user.tipo==="psicologa"||user.tipo==="secretaria")&&tab==="funil-leads"&&<FunilLeads user={user}/>}
        {user.tipo==="marketing"  &&tab==="marketing-dashboard" &&<DashboardMarketing user={user}/>}
        {user.tipo==="psicologa"  &&tab==="marketing-dashboard" &&<DashboardMarketing user={user}/>}
        {user.tipo==="psicologa"  &&tab==="permissoes"         &&<PainelPermissoes/>}
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
