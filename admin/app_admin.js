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

  const LINK_CADASTRO = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/cadastro-aluno/";
  const [linkCopiado, setLinkCopiado] = useState(false);

  const filtrados = alunos.filter(a=>{
    const fOk = filtro==="todos" || a.status===filtro;
    const bOk = !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.email?.toLowerCase().includes(busca.toLowerCase());
    return fOk && bOk;
  });

  const pendentes = alunos.filter(a=>a.status==="pendente");

  async function salvar(){
    if(!form.nome||!form.email){alert("Nome e e-mail obrigatorios.");return;}
    if(!editando&&!form.senha){alert("Senha obrigatoria para novo aluno.");return;}
    setSalvando(true);
    if(editando){
      const {senha,...dados}=form;
      const up = {...dados};
      if(senha) up.senha = senha; // só atualiza senha se preenchida
      await db.collection("clinica_alunos").doc(editando).update(up);
    } else {
      await db.collection("clinica_alunos").add({...form,status:"ativo",createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    }
    setModal(false);setForm({nome:"",email:"",telefone:"",instituicao:"",semestre:"",senha:"",obs:""});setEditando(null);setSalvando(false);
  }

  async function alterarStatus(id, novoStatus){
    await db.collection("clinica_alunos").doc(id).update({status:novoStatus});
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
          <div className="page-title">Alunos em Supervisão</div>
          <div className="page-subtitle">{alunos.filter(a=>a.status==="ativo").length} aluno(s) cadastrado(s)</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{
            const texto = `🎓 *Supervisão Clínica — Dra. Lucia Kratz*\n\nOlá! Para solicitar acesso ao Portal de Supervisão Clínica, preencha seu cadastro pelo link abaixo:\n\n👉 ${LINK_CADASTRO}\n\n📝 Você vai informar: nome, e-mail, instituição e criar uma senha de acesso.\n\n⏳ Após o envio, seu cadastro ficará pendente até a aprovação da supervisora. Assim que aprovado, você já pode acessar o portal.\n\nQualquer dúvida, entre em contato! 💜`;
            navigator.clipboard.writeText(texto).then(()=>{setLinkCopiado(true);setTimeout(()=>setLinkCopiado(false),2500);}).catch(()=>prompt("Copie o texto:",texto));
          }}>
            {linkCopiado?"✓ Texto copiado!":"📋 Link de Cadastro"}
          </button>
          <button className="btn btn-purple" onClick={()=>{setForm({nome:"",email:"",telefone:"",instituicao:"",semestre:"",senha:"",obs:""});setEditando(null);setModal(true);}}>
            <Icon name="user-plus" size={16}/> Cadastrar Aluno
          </button>
        </div>
      </div>

      {/* Alerta de pendentes */}
      {pendentes.length>0&&(
        <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:12,padding:"12px 18px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#92400e"}}>🔔 {pendentes.length} solicitação(ões) pendente(s)</div>
            <div style={{fontSize:12,color:"#78350f",marginTop:2}}>Alunos que se cadastraram pelo link e aguardam sua aprovação.</div>
          </div>
          <button className="btn btn-ghost" style={{fontSize:12,color:"#92400e",border:"1px solid #f59e0b"}} onClick={()=>setFiltro("pendente")}>Ver pendentes</button>
        </div>
      )}

      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <input className="form-input" style={{flex:1,minWidth:200}} placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e=>setBusca(e.target.value)}/>
        {[["todos","Todos"],["ativo","Ativos"],["pendente","Pendentes"],["inativo","Inativos"]].map(([f,l])=>(
          <button key={f} className={"btn "+(filtro===f?"btn-purple":"btn-ghost")} onClick={()=>setFiltro(f)}>
            {l} {f==="pendente"&&pendentes.length>0&&<span style={{background:"#f59e0b",color:"white",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700,marginLeft:4}}>{pendentes.length}</span>}
          </button>
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
            <div key={a.id} className="card" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 20px",
              borderLeft:a.status==="pendente"?"4px solid #f59e0b":a.status==="inativo"?"4px solid #9ca3af":"4px solid transparent"}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:a.status==="pendente"?"#fef3c7":"var(--purple-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:a.status==="pendente"?"#92400e":"var(--purple)",flexShrink:0,fontSize:16}}>{(a.nome||"?")[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:600}}>{a.nome}</span>
                  <span className={"badge "+(a.status==="ativo"?"badge-green":a.status==="pendente"?"badge-yellow":"badge-gray")}
                    style={a.status==="pendente"?{background:"#fef3c7",color:"#92400e",border:"1px solid #f59e0b"}:{}}>{a.status==="ativo"?"Ativo":a.status==="pendente"?"⏳ Pendente":"Inativo"}</span>
                  {a.origemCadastro==="auto-cadastro"&&<span style={{fontSize:10,color:"var(--text-muted)",background:"var(--gray-100)",borderRadius:20,padding:"2px 8px"}}>auto-cadastro</span>}
                </div>
                <div style={{fontSize:13,color:"var(--text-muted)",display:"flex",gap:12,marginTop:2,flexWrap:"wrap"}}>
                  <span>✉ {a.email}</span>
                  {a.instituicao&&<span>🏛 {a.instituicao}{a.semestre?" · "+a.semestre:""}</span>}
                  <span>👤 {a.pacientesVinculados||0} paciente(s)</span>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {a.status==="pendente"&&(
                  <button className="btn btn-purple" style={{fontSize:12,padding:"6px 14px"}} onClick={()=>alterarStatus(a.id,"ativo")}>
                    ✓ Aprovar
                  </button>
                )}
                {a.status==="ativo"&&(
                  <button className="btn btn-ghost" style={{fontSize:11,padding:"5px 10px",color:"#6b7280"}} onClick={()=>alterarStatus(a.id,"inativo")}>
                    Inativar
                  </button>
                )}
                {a.status==="inativo"&&(
                  <button className="btn btn-ghost" style={{fontSize:11,padding:"5px 10px",color:"#16a34a"}} onClick={()=>alterarStatus(a.id,"ativo")}>
                    Reativar
                  </button>
                )}
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
  const { data:pacotes } = useCollection("clinica_pacotes");
  // ── Esteira 1a: Comissões da secretária (vendas_secretaria) ──
  const [comissoes, setComissoes] = useState([]);
  // ── Esteira 1b: Repasses de parceiras/estagiárias (repasses_parcerias) ──
  const [repasses, setRepasses] = useState([]);
  // Fallback: lê clinica_comissoes legado para não perder histórico anterior
  const [comissoesLegado, setComissoesLegado] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [mesSel, setMesSel] = useState(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,"0")}`;
  });
  const [pagando, setPagando] = useState(false);

  // Configurações financeiras editáveis (clinica_config/comissoes)
  const [config, setConfig] = useState({...CONFIG_FIN_PADRAO});
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [formConfig, setFormConfig] = useState({...CONFIG_FIN_PADRAO});
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Parceiras
  const [parceiras, setParceiras] = useState([]);
  const [modalParceira, setModalParceira] = useState(false);
  const [editandoParceira, setEditandoParceira] = useState(null);
  const [formParceira, setFormParceira] = useState({nome:"",percentual:"70",pix:"",tipo:"parceira"});

  const SALARIO_FIXO = parseFloat(config.salarioFixo)||0;

  useEffect(() => {
    // Esteira 1a: Comissões da secretária (nova coleção) — sem orderBy, ordenar client-side
    const u1 = db.collection("vendas_secretaria")
      .onSnapshot(s => {
        const docs = s.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toMillis?.()??0)-(a.createdAt?.toMillis?.()??0));
        setComissoes(docs);
      }, ()=>{});
    // Esteira 1b: Repasses de parceiras — sem orderBy
    const u1b = db.collection("repasses_parcerias")
      .onSnapshot(s => {
        const docs = s.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toMillis?.()??0)-(a.createdAt?.toMillis?.()??0));
        setRepasses(docs);
      }, ()=>{});
    // Fallback: histórico legado clinica_comissoes — sem orderBy
    const u1c = db.collection("clinica_comissoes")
      .onSnapshot(s => {
        const docs = s.docs.map(d=>({id:d.id,...d.data(),_legado:true}));
        docs.sort((a,b)=>(b.createdAt?.toMillis?.()??0)-(a.createdAt?.toMillis?.()??0));
        setComissoesLegado(docs);
      }, ()=>{});
    const u2 = db.collection("clinica_lancamentos").orderBy("createdAt","desc")
      .onSnapshot(s => setLancamentos(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
    const u3 = db.collection("clinica_config").doc("comissoes")
      .onSnapshot(d => {
        const cfg = d.exists ? {...CONFIG_FIN_PADRAO, ...d.data()} : {...CONFIG_FIN_PADRAO};
        setConfig(cfg);
        if(!editandoConfig) setFormConfig(cfg);
      }, ()=>{});
    const u4 = db.collection("clinica_parceiras")
      .onSnapshot(s => {
        const docs = s.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(a.nome||"").localeCompare(b.nome||""));
        setParceiras(docs);
      }, ()=>{});
    return () => { u1(); u1b(); u1c(); u2(); u3(); u4(); };
  }, []);

  // ── HIGIENIZAÇÃO: remove duplicatas por pacoteId nas coleções de comissão ──
  // ── AUDITORIA: cruza pacotes pagos com registros de comissão ──
  const [modalAuditComissao, setModalAuditComissao] = React.useState(false);
  const [auditResultado, setAuditResultado] = React.useState(null);
  const [auditando, setAuditando] = React.useState(false);

  async function auditarComissoes() {
    setAuditando(true);
    setModalAuditComissao(true);

    // 1. Buscar todos os pacotes
    const snapPac = await db.collection("clinica_pacotes").get();
    const todosPacotes = snapPac.docs.map(d=>({id:d.id,...d.data()}));

    // 2. Buscar todas as comissões (nova + legado)
    const [snapVS, snapLeg] = await Promise.all([
      db.collection("vendas_secretaria").get(),
      db.collection("clinica_comissoes").get(),
    ]);
    const todasComissoes = [
      ...snapVS.docs.map(d=>({id:d.id,...d.data(),_col:"vendas_secretaria"})),
      ...snapLeg.docs.map(d=>({id:d.id,...d.data(),_col:"clinica_comissoes"})),
    ];
    const comissoesPorPacote = {};
    todasComissoes.forEach(c=>{ if(c.pacoteId) comissoesPorPacote[c.pacoteId] = c; });

    // 3. Filtrar pacotes de junho e julho com tipoVenda (particular/recorrente — que geram comissão)
    const mesesAlvo = ["2026-06","2026-07"];
    const pacotesPagos = todosPacotes.filter(p=>{
      const mes = (p.dataInicio||"").slice(0,7);
      return mesesAlvo.includes(mes) && (p.statusPag||"pendente")==="recebido";
    });
    const pacotesPendentes = todosPacotes.filter(p=>{
      const mes = (p.dataInicio||"").slice(0,7);
      return mesesAlvo.includes(mes) && (p.statusPag||"pendente")!=="recebido";
    });

    // 4. Para pagos: checar se tem comissão
    const pagosComComissao = pacotesPagos.filter(p=>comissoesPorPacote[p.id]);
    const pagosSemComissao = pacotesPagos.filter(p=>!comissoesPorPacote[p.id]);

    setAuditResultado({
      pacotesPagos,
      pacotesPendentes,
      pagosComComissao,
      pagosSemComissao,
      todasComissoes,
      comissoesPorPacote,
    });
    setAuditando(false);
  }

  async function gerarComissaoFaltante(pacote) {
    const tipoVenda = lancamentos.some(
      l => l.pacienteId===pacote.pacienteId && l.pacoteId!==pacote.id && l.status==="recebido"
    ) ? "recorrente" : "primeira";
    await registrarComissao({
      tipo: "Pacote",
      valor: parseFloat(pacote.valorTotal||0),
      pacienteNome: pacote.pacienteNome || "",
      tipoVenda,
      pacoteId: pacote.id,
    });
    // Atualizar resultado
    setAuditResultado(prev=>({
      ...prev,
      pagosSemComissao: prev.pagosSemComissao.filter(p=>p.id!==pacote.id),
      pagosComComissao: [...prev.pagosComComissao, pacote],
    }));
  }

  async function gerarTodasFaltantes(lista) {
    if(!confirm(`Gerar ${lista.length} comissão(ões) faltante(s)? Isso vai criar os registros agora.`))return;
    for(const p of lista) await gerarComissaoFaltante(p);
    alert("✅ Comissões geradas!");
  }

  async function higienizarDuplicatas() {
    if(!confirm(
      "Essa operação vai:\n\n" +
      "1. Remover comissões DUPLICADAS pelo mesmo pacoteId\n" +
      "2. Remover comissões com ⚠️ Pacote não encontrado\n" +
      "3. Preencher mesRef nos registros antigos (restaura histórico de meses)\n\n" +
      "Confirma?"
    )) return;

    let removidos = 0;
    let orfaos = 0;
    let migrados = 0;

    // Carrega IDs de todos os pacotes existentes para cruzar
    const snapPacotes = await db.collection("clinica_pacotes").get();
    const pacotesExistentes = new Set(snapPacotes.docs.map(d => d.id));

    // ── PASSO 1: Duplicatas em vendas_secretaria ──
    const snapVS = await db.collection("vendas_secretaria").get();
    const porPacoteVS = {};
    snapVS.docs.forEach(d => {
      const pid = d.data().pacoteId;
      if(!pid) return;
      if(!porPacoteVS[pid]) porPacoteVS[pid] = [];
      porPacoteVS[pid].push({id:d.id, ts: d.data().createdAt?.toMillis?.()||0});
    });
    const bVS = db.batch();
    Object.values(porPacoteVS).forEach(lista => {
      if(lista.length <= 1) return;
      lista.sort((a,b)=>b.ts-a.ts);
      lista.slice(1).forEach(r => {
        if(!r.id.startsWith("COM_")){ bVS.delete(db.collection("vendas_secretaria").doc(r.id)); removidos++; }
      });
    });
    await bVS.commit();

    // ── PASSO 2: Duplicatas + órfãos em clinica_comissoes ──
    const snapLeg = await db.collection("clinica_comissoes").get();
    const porPacoteLeg = {};
    const bLeg = db.batch();
    let bLegCount = 0;

    snapLeg.docs.forEach(d => {
      const data = d.data();
      const pid = data.pacoteId;

      // Órfão: tem pacoteId mas o pacote não existe mais → remover
      if(pid && !pacotesExistentes.has(pid)) {
        bLeg.delete(db.collection("clinica_comissoes").doc(d.id));
        orfaos++;
        bLegCount++;
        return;
      }

      // Agrupar para detectar duplicatas
      if(!pid) return;
      if(!porPacoteLeg[pid]) porPacoteLeg[pid] = [];
      porPacoteLeg[pid].push({id:d.id, ts: data.createdAt?.toMillis?.()||0});
    });

    // Duplicatas: manter só o mais recente
    Object.values(porPacoteLeg).forEach(lista => {
      if(lista.length <= 1) return;
      lista.sort((a,b)=>b.ts-a.ts);
      lista.slice(1).forEach(r => {
        bLeg.delete(db.collection("clinica_comissoes").doc(r.id));
        removidos++;
        bLegCount++;
      });
    });
    if(bLegCount > 0) await bLeg.commit();

    // ── PASSO 3: Migração de mesRef (restaura histórico de meses) ──
    // Re-ler após limpeza para não tentar migrar docs que foram deletados
    const snapLeg2 = await db.collection("clinica_comissoes").get();
    const bMig = db.batch();
    let bMigCount = 0;
    snapLeg2.docs.forEach(d => {
      const data = d.data();
      if(!data.mesRef) {
        let mesRef = null;
        if(data.createdAt?.toDate) {
          const dt = data.createdAt.toDate();
          mesRef = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
        } else if(data.data) {
          mesRef = String(data.data).slice(0,7);
        }
        if(mesRef) {
          bMig.update(d.ref, {mesRef});
          migrados++;
          bMigCount++;
        }
      }
    });
    if(bMigCount > 0) await bMig.commit();

    alert(
      "✅ Higienização concluída!\n\n" +
      `• ${removidos} duplicata(s) removida(s)\n` +
      `• ${orfaos} comissão(ões) com pacote inexistente removida(s)\n` +
      `• ${migrados} registro(s) com mesRef preenchido (histórico restaurado)`
    );
  }

  async function salvarConfig(){
    setSalvandoConfig(true);
    await db.collection("clinica_config").doc("comissoes").set({
      nomeSecretaria: formConfig.nomeSecretaria||"Secretária",
      salarioFixo: parseFloat(formConfig.salarioFixo)||0,
      percPrimeira: parseFloat(formConfig.percPrimeira)||10,
      percRecorrente: parseFloat(formConfig.percRecorrente)||5,
      percParceiroPadrao: parseFloat(formConfig.percParceiroPadrao)||70,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    setSalvandoConfig(false);
    setEditandoConfig(false);
  }

  async function salvarParceira(){
    if(!formParceira.nome.trim()){alert("Nome da parceira é obrigatório.");return;}
    const dados = {
      nome: formParceira.nome.trim(),
      percentual: parseFloat(formParceira.percentual)||parseFloat(config.percParceiroPadrao)||70,
      pix: formParceira.pix||"",
      tipo: formParceira.tipo||"parceira"
    };
    if(editandoParceira){
      await db.collection("clinica_parceiras").doc(editandoParceira).update(dados);
    } else {
      await db.collection("clinica_parceiras").add({...dados, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
    }
    setModalParceira(false); setEditandoParceira(null);
    setFormParceira({nome:"",percentual:String(config.percParceiroPadrao||70),pix:"",tipo:"parceira"});
  }

  // Meses disponíveis: une nova coleção + legado para mostrar histórico completo
  const meses = [...new Set([...comissoes, ...comissoesLegado].map(c=>c.mesRef).filter(Boolean))].sort().reverse();
  // Auto-navegar para o mês mais recente com dados se o atual estiver vazio
  React.useEffect(()=>{
    if(meses.length > 0 && !meses.includes(mesSel)){
      setMesSel(meses[0]);
    }
  }, [meses.join(",")]); // eslint-disable-line

  // Mescla nova coleção + legado para garantir histórico completo
  const todasComissoes = useMemo(()=>{
    // Deduplica por pacoteId: prefere registro novo (vendas_secretaria) sobre legado
    const porPacote = {};
    [...comissoesLegado, ...comissoes].forEach(c=>{
      const key = c.pacoteId || c.id;
      if(!porPacote[key] || !c._legado) porPacote[key] = c;
    });
    return Object.values(porPacote);
  }, [comissoes, comissoesLegado]);

  const comissoesMes = todasComissoes.filter(c => c.mesRef === mesSel);
  // Secretária: registros sem responsável definido (vendas dela)
  const comissoesSecretaria = comissoesMes.filter(c => !c.responsavel);
  // Repasses: registros com responsável (parceiras, estagiária do social)
  const repassesMes = comissoesMes.filter(c => c.responsavel);
  const responsaveis = [...new Set(repassesMes.map(c=>c.responsavel))];

  // Classificar comissões: limpas (entram no ciclo) vs suspeitas (fora do ciclo)
  const comissoesSecretariaPend = comissoesSecretaria.filter(c => c.status !== "pago");
  const comissoesSecretariaPagas = comissoesSecretaria.filter(c => c.status === "pago");

  function isComissaoSuspeita(c) {
    const pacoteVinc = c.pacoteId ? pacotes.find(p=>p.id===c.pacoteId) : null;
    // Suspeita 1: pacote existe mas ainda está pendente
    if(pacoteVinc && (pacoteVinc.statusPag||"pendente") !== "recebido") return true;
    // Suspeita 2: valor base diverge do valor total do pacote
    if(pacoteVinc && Math.abs((c.valorBase||0) - (pacoteVinc.valorTotal||0)) > 0.01) return true;
    // Suspeita 3: tem pacoteId mas o pacote não existe mais
    if(c.pacoteId && !pacotes.some(p=>p.id===c.pacoteId)) return true;
    return false;
  }

  // Apenas comissões limpas entram no ciclo de pagamento da Jéssica
  const comissoesPend  = comissoesSecretariaPend.filter(c => !isComissaoSuspeita(c));
  const comissoesSuspeitas = comissoesSecretariaPend.filter(c => isComissaoSuspeita(c));
  const comissoesPagas = comissoesSecretariaPagas;
  const totalPend  = comissoesPend.reduce((a,c) => a + (c.valorComissao||0), 0);
  const totalPagas = comissoesPagas.reduce((a,c) => a + (c.valorComissao||0), 0);
  const totalComissoes = totalPend + totalPagas;

  // Pagamentos já realizados neste mês (histórico)
  const pagamentosDoMes = lancamentos.filter(l =>
    l.tipo_lancamento === "salario_secretaria" && l.mesRef === mesSel
  );
  const pagamentoMes = pagamentosDoMes[0] || null;
  const salarioJaPago = !!pagamentoMes;
  // Ciclo atual: salário fixo entra só no 1º pagamento do mês; depois, só comissões novas
  const totalAPagar = (salarioJaPago ? 0 : SALARIO_FIXO) + totalPend;

  const [mesLabel] = useState(() => {
    const [ano, mes] = mesSel.split("-");
    return new Date(parseInt(ano), parseInt(mes)-1, 1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  });

  function getMesLabel(mesRef) {
    const [ano, mes] = mesRef.split("-");
    return new Date(parseInt(ano), parseInt(mes)-1, 1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  }

  async function pagarSalario() {
    const descr = salarioJaPago
      ? `${comissoesPend.length} comissão(ões) nova(s)`
      : `salário fixo + ${comissoesPend.length} comissão(ões)`;
    if (!confirm(`Confirma pagamento de R$ ${totalAPagar.toFixed(2).replace(".",",")} para ${config.nomeSecretaria} (${descr}) em ${getMesLabel(mesSel)}?`)) return;
    setPagando(true);
    const hoje = new Date().toISOString().slice(0,10);
    // Lança como despesa da clínica
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "despesa",
      tipo: "despesa",
      categoria: "Salário Secretária",
      descricao: salarioJaPago ? "Comissões Secretária (adicional)" : "Salário Secretária",
      centroCusto: "🏥 Clínica",
      mesRef: mesSel,
      valor: totalAPagar,
      valorSalarioFixo: salarioJaPago ? 0 : SALARIO_FIXO,
      valorComissoes: totalPend,
      qtdComissoes: comissoesPend.length,
      data: hoje,
      status: "pago",
      obs: `${salarioJaPago?"Comissões adicionais":"Salário"} ${getMesLabel(mesSel)} — ${config.nomeSecretaria}`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // Marca apenas as comissões pendentes da secretária como pagas
    const batch = db.batch();
    comissoesPend.forEach(c => {
      // Usa a coleção correta: nova ou legado
      const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
      batch.update(db.collection(col).doc(c.id), { status:"pago", dataPagamento: hoje });
    });
    await batch.commit();
    setPagando(false);
    alert("✅ Pagamento registrado! O ciclo zerou — novas vendas abrem o próximo pagamento.");
  }

  async function pagarRepasse(responsavel) {
    const pendentes = repassesMes.filter(c=>c.responsavel===responsavel && c.status!=="pago");
    const totalRep = pendentes.reduce((a,c)=>a+(c.valorComissao||0),0);
    if(pendentes.length===0) return;
    const parc = parceiras.find(p=>p.nome===responsavel);
    if (!confirm(`Confirma repasse de R$ ${totalRep.toFixed(2).replace(".",",")} para ${responsavel} em ${getMesLabel(mesSel)}?${parc?.pix?`\nPIX: ${parc.pix}`:""}`)) return;
    setPagando(true);
    const hoje = new Date().toISOString().slice(0,10);
    // Lança como despesa da clínica
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "repasse_parceira",
      tipo: `Repasse — ${responsavel}`,
      mesRef: mesSel,
      valor: totalRep,
      data: hoje,
      status: "pago",
      obs: `Repasse ${getMesLabel(mesSel)} — ${responsavel} (${pendentes.length} venda(s))`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const batch = db.batch();
    pendentes.forEach(c => batch.update(db.collection("clinica_comissoes").doc(c.id), { status:"pago", dataPagamento: hoje }));
    await batch.commit();
    setPagando(false);
    alert(`✅ Repasse para ${responsavel} registrado como despesa da clínica!`);
  }

  const corTipoVenda = t => t==="primeira" ? "#7B00C4" : "#0891b2";
  const labelTipoVenda = t => t==="primeira" ? `🌟 Primeira Venda (${config.percPrimeira}%)` : `🔁 Recorrente (${config.percRecorrente}%)`;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Comissões — {config.nomeSecretaria.split(" ")[0]}</div>
          <div className="page-subtitle">Salário fixo R$ {SALARIO_FIXO.toFixed(2).replace(".",",")} + comissões por vendas · Repasses a parceiras</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <button onClick={higienizarDuplicatas}
            style={{background:"none",border:"1px solid #c4b5fd",borderRadius:8,cursor:"pointer",fontSize:12,color:"#7c3aed",padding:"7px 14px",fontWeight:600,fontFamily:"var(--font-body)",display:"flex",alignItems:"center",gap:5}}
            title="Remove registros duplicados de comissão pelo mesmo pacoteId">
            <Icon name="trash-2" size={13}/>🧹 Limpar Duplicatas
          </button>
          <button onClick={auditarComissoes}
            style={{background:"#059669",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,color:"white",padding:"7px 14px",fontWeight:600,fontFamily:"var(--font-body)",display:"flex",alignItems:"center",gap:5}}
            title="Confere pacotes pagos de jun/jul vs registros de comissão">
            <Icon name="search" size={13}/>🔍 Auditar Jun/Jul
          </button>
        </div>
      </div>

      {/* Modal de Auditoria */}
      {modalAuditComissao&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:600,padding:20,overflowY:"auto"}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:700,marginTop:40}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:18}}>🔍 Auditoria de Comissões — Jun/Jul 2026</div>
              <button onClick={()=>setModalAuditComissao(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>×</button>
            </div>

            {auditando?(
              <div style={{textAlign:"center",padding:40,color:"var(--text-muted)"}}>Analisando pacotes e comissões...</div>
            ):auditResultado&&(()=>{
              const {pacotesPagos,pacotesPendentes,pagosComComissao,pagosSemComissao} = auditResultado;
              const fmtVal = v => `R$ ${parseFloat(v||0).toFixed(2).replace(".",",")}`;
              return (
                <div>
                  {/* Resumo */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                    <div style={{background:"#f0fdf4",borderRadius:10,padding:14,textAlign:"center"}}>
                      <div style={{fontSize:24,fontWeight:800,color:"#16a34a"}}>{pacotesPagos.length}</div>
                      <div style={{fontSize:12,color:"#166534"}}>Pacotes pagos jun/jul</div>
                    </div>
                    <div style={{background:"#f5f0ff",borderRadius:10,padding:14,textAlign:"center"}}>
                      <div style={{fontSize:24,fontWeight:800,color:"#7B00C4"}}>{pagosComComissao.length}</div>
                      <div style={{fontSize:12,color:"#4c1d95"}}>Com comissão ✓</div>
                    </div>
                    <div style={{background:pagosSemComissao.length>0?"#fef2f2":"#f0fdf4",borderRadius:10,padding:14,textAlign:"center",border:pagosSemComissao.length>0?"2px solid #fca5a5":"none"}}>
                      <div style={{fontSize:24,fontWeight:800,color:pagosSemComissao.length>0?"#dc2626":"#16a34a"}}>{pagosSemComissao.length}</div>
                      <div style={{fontSize:12,color:pagosSemComissao.length>0?"#7f1d1d":"#166534"}}>{pagosSemComissao.length>0?"⚠️ Sem comissão!":"Tudo ok ✓"}</div>
                    </div>
                  </div>

                  {/* Pacotes pagos SEM comissão */}
                  {pagosSemComissao.length>0&&(
                    <div style={{marginBottom:20}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#dc2626"}}>⚠️ Pacotes pagos SEM comissão registrada</div>
                        <button onClick={()=>gerarTodasFaltantes(pagosSemComissao)}
                          style={{background:"#dc2626",color:"white",border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                          ✚ Gerar todas ({pagosSemComissao.length})
                        </button>
                      </div>
                      {pagosSemComissao.map(p=>(
                        <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#fef2f2",borderRadius:8,marginBottom:6,border:"1px solid #fca5a5"}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13}}>{p.pacienteNome||"—"}</div>
                            <div style={{fontSize:11,color:"#6b7280"}}>{p.dataInicio} · {fmtVal(p.valorTotal)} · {p.recorrencia}</div>
                          </div>
                          <button onClick={()=>gerarComissaoFaltante(p)}
                            style={{background:"#7B00C4",color:"white",border:"none",borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                            ✚ Gerar comissão
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pacotes pagos COM comissão */}
                  {pagosComComissao.length>0&&(
                    <div style={{marginBottom:20}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#059669",marginBottom:8}}>✓ Pacotes com comissão registrada</div>
                      {pagosComComissao.map(p=>{
                        const com = auditResultado.comissoesPorPacote[p.id];
                        return (
                          <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#f0fdf4",borderRadius:8,marginBottom:6,border:"1px solid #6ee7b7"}}>
                            <div>
                              <div style={{fontWeight:600,fontSize:13}}>{p.pacienteNome||"—"}</div>
                              <div style={{fontSize:11,color:"#6b7280"}}>{p.dataInicio} · {fmtVal(p.valorTotal)}</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:11,color:"#059669",fontWeight:600}}>✓ Comissão: {fmtVal(com?.valorComissao)}</div>
                              <div style={{fontSize:10,color:"#9ca3af"}}>{com?.status==="pago"?"Paga":"Pendente"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pacotes pendentes */}
                  {pacotesPendentes.length>0&&(
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#b45309",marginBottom:8}}>⏳ Pacotes ainda pendentes de pagamento ({pacotesPendentes.length})</div>
                      {pacotesPendentes.map(p=>(
                        <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 14px",background:"#fffbeb",borderRadius:8,marginBottom:4,border:"1px solid #fde68a"}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13}}>{p.pacienteNome||"—"}</div>
                            <div style={{fontSize:11,color:"#6b7280"}}>{p.dataInicio} · {fmtVal(p.valorTotal)}</div>
                          </div>
                          <div style={{fontSize:11,color:"#b45309",fontWeight:600}}>Comissão entra ao pagar</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Seletor de mês — carrossel com setas */}
      {(()=>{
        const listaMeses = meses.length > 0 ? meses : [mesSel];
        const idxAtual = listaMeses.indexOf(mesSel);
        const irAntes = () => { if(idxAtual < listaMeses.length-1) setMesSel(listaMeses[idxAtual+1]); };
        const irProx  = () => { if(idxAtual > 0) setMesSel(listaMeses[idxAtual-1]); };
        return (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
            <button onClick={irAntes} disabled={idxAtual >= listaMeses.length-1}
              style={{width:32,height:32,borderRadius:"50%",border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",opacity:idxAtual>=listaMeses.length-1?0.3:1}}>
              ‹
            </button>
            <div style={{display:"flex",gap:6,overflowX:"auto",flex:1,scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
              {listaMeses.map(m => (
                <button key={m} onClick={()=>setMesSel(m)}
                  style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:"var(--font-body)",fontSize:13,fontWeight:600,flexShrink:0,
                    background:m===mesSel?"var(--purple)":"var(--gray-100)",
                    color:m===mesSel?"white":"var(--text)",
                    display:Math.abs(listaMeses.indexOf(m)-idxAtual)<=2?"flex":"none",
                    alignItems:"center"}}>
                  {getMesLabel(m)}
                </button>
              ))}
            </div>
            <button onClick={irProx} disabled={idxAtual <= 0}
              style={{width:32,height:32,borderRadius:"50%",border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",opacity:idxAtual<=0?0.3:1}}>
              ›
            </button>
            <span style={{fontSize:12,color:"var(--text-muted)",flexShrink:0}}>{idxAtual+1}/{listaMeses.length}</span>
          </div>
        );
      })()}

      {/* ⚙️ Configurações financeiras — só psicóloga */}
      {user.tipo==="psicologa" && (
        <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",padding:"16px 20px",marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:700,fontSize:14}}>⚙️ Configurações de Salário e Percentuais</div>
            {!editandoConfig
              ? <button onClick={()=>{setFormConfig({...config});setEditandoConfig(true);}}
                  style={{background:"var(--purple)",color:"white",border:"none",borderRadius:8,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>✏️ Editar</button>
              : <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setEditandoConfig(false)}
                    style={{background:"white",color:"#6b7280",border:"1px solid #e5e7eb",borderRadius:8,padding:"7px 14px",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>Cancelar</button>
                  <button onClick={salvarConfig} disabled={salvandoConfig}
                    style={{background:"#16a34a",color:"white",border:"none",borderRadius:8,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>{salvandoConfig?"Salvando...":"💾 Salvar"}</button>
                </div>}
          </div>
          {!editandoConfig ? (
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px 24px",marginTop:12,fontSize:13,color:"#374151"}}>
              <span>👩‍💼 Secretária: <strong>{config.nomeSecretaria}</strong></span>
              <span>💵 Salário fixo: <strong>R$ {SALARIO_FIXO.toFixed(2).replace(".",",")}</strong></span>
              <span>🌟 Primeira venda: <strong>{config.percPrimeira}%</strong></span>
              <span>🔁 Recorrente: <strong>{config.percRecorrente}%</strong></span>
              <span>🤝 Parceiro (padrão): <strong>{config.percParceiroPadrao}%</strong></span>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:14}}>
              <div className="form-group"><label className="form-label">Nome da secretária</label>
                <input className="form-input" value={formConfig.nomeSecretaria} onChange={e=>setFormConfig({...formConfig,nomeSecretaria:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">Salário fixo (R$)</label>
                <input className="form-input" type="number" value={formConfig.salarioFixo} onChange={e=>setFormConfig({...formConfig,salarioFixo:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">% primeira venda</label>
                <input className="form-input" type="number" value={formConfig.percPrimeira} onChange={e=>setFormConfig({...formConfig,percPrimeira:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">% recorrente</label>
                <input className="form-input" type="number" value={formConfig.percRecorrente} onChange={e=>setFormConfig({...formConfig,percRecorrente:e.target.value})}/></div>
              <div className="form-group"><label className="form-label">% parceiro padrão</label>
                <input className="form-input" type="number" value={formConfig.percParceiroPadrao} onChange={e=>setFormConfig({...formConfig,percParceiroPadrao:e.target.value})}/></div>
            </div>
          )}
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:10}}>Os novos percentuais valem para as próximas vendas; comissões já registradas não mudam.</div>
        </div>
      )}

      {/* Cards resumo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:24}}>
        <div style={{background:"var(--gray-50)",borderRadius:14,padding:"18px 20px",border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Salário Fixo</div>
          <div style={{fontSize:22,fontWeight:700,color:"var(--text)"}}>R$ {SALARIO_FIXO.toFixed(2).replace(".",",")}</div>
        </div>
        <div style={{background:"var(--gray-50)",borderRadius:14,padding:"18px 20px",border:"1px solid var(--gray-200)"}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Comissões Pendentes</div>
          <div style={{fontSize:22,fontWeight:700,color:"#7B00C4"}}>R$ {totalPend.toFixed(2).replace(".",",")}</div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{comissoesPend.length} venda(s) nova(s)
            {totalPagas>0&&<span style={{color:"#16a34a"}}> · ✓ R$ {totalPagas.toFixed(2).replace(".",",")} já pagas no mês</span>}
          </div>
        </div>
        <div style={{background:totalAPagar===0?"#f0fdf4":"#faf5ff",borderRadius:14,padding:"18px 20px",border:`2px solid ${totalAPagar===0?"#16a34a":"#7B00C4"}`}}>
          <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Total a Pagar {salarioJaPago?"(novo ciclo)":""}</div>
          <div style={{fontSize:26,fontWeight:800,color:totalAPagar===0?"#16a34a":"#7B00C4"}}>
            {totalAPagar===0 ? "✓ Tudo pago" : `R$ ${totalAPagar.toFixed(2).replace(".",",")}`}
          </div>
          {pagamentoMes && <div style={{fontSize:11,color:"#16a34a",marginTop:4,fontWeight:600}}>Último pagamento em {pagamentosDoMes[0].data?.split("-").reverse().join("/")} · {pagamentosDoMes.length} pagamento(s) no mês</div>}
        </div>
      </div>

      {/* Botão pagar — só psicóloga vê; reaparece quando há comissões novas */}
      {user.tipo==="psicologa" && (
        <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap",alignItems:"center"}}>
          {totalAPagar > 0 && (salarioJaPago ? comissoesPend.length > 0 : true) && (
            <button onClick={pagarSalario} disabled={pagando}
              style={{background:"#16a34a",color:"white",border:"none",borderRadius:10,padding:"12px 28px",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"var(--font-body)"}}>
              {pagando ? "Registrando..." : `💰 ${salarioJaPago?"Pagar Comissões Novas":"Registrar Pagamento"} — R$ ${totalAPagar.toFixed(2).replace(".",",")}`}
            </button>
          )}
          {/* Botão de Gratificação — sempre visível para psicóloga */}
          {(()=>{
            const [showGrat, setShowGrat] = React.useState(false);
            const [valGrat, setValGrat] = React.useState("");
            const [obsGrat, setObsGrat] = React.useState("");
            const [salvGrat, setSalvGrat] = React.useState(false);
            async function registrarGratificacao(){
              const valor = parseFloat(valGrat);
              if(!valor || valor <= 0){ alert("Informe um valor válido."); return; }
              if(!obsGrat.trim()){ alert("Informe o motivo da gratificação."); return; }
              setSalvGrat(true);
              try {
                const hoje = new Date();
                const mesRef = mesSel;
                // Registra como comissão especial em vendas_secretaria
                await db.collection("vendas_secretaria").add({
                  tipo:"Gratificação",
                  tipoVenda:"gratificacao",
                  perc:0,
                  valorBase:valor,
                  valorComissao:valor,
                  pacienteNome:`🎁 ${obsGrat.trim()}`,
                  mesRef,
                  pacoteId:null,
                  status:"pendente",
                  createdAt:firebase.firestore.FieldValue.serverTimestamp()
                });
                // Registra também como lançamento financeiro (despesa)
                await db.collection("clinica_lancamentos").add({
                  tipo:"despesa",
                  tipo_lancamento:"despesa",
                  categoria:"Salários",
                  descricao:`Gratificação — ${config.nomeSecretaria} — ${obsGrat.trim()}`,
                  valor,
                  data:hoje.toISOString().slice(0,10),
                  centroCusto:"🏥 Clínica",
                  mes:mesRef,
                  formaPag:"PIX",
                  status:"pago",
                  createdAt:firebase.firestore.FieldValue.serverTimestamp()
                });
                setShowGrat(false); setValGrat(""); setObsGrat("");
                alert(`✅ Gratificação de R$ ${valor.toFixed(2).replace(".",",")} registrada com sucesso!`);
              } catch(e){ alert("Erro: "+e.message); }
              setSalvGrat(false);
            }
            return (
              <div>
                <button onClick={()=>setShowGrat(s=>!s)}
                  style={{background:"none",border:"2px solid #7B00C4",color:"#7B00C4",borderRadius:10,padding:"11px 18px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"var(--font-body)",display:"flex",alignItems:"center",gap:6}}>
                  🎁 Registrar Gratificação
                </button>
                {showGrat&&(
                  <div style={{marginTop:10,background:"#f5f0ff",border:"1px solid #c4b5fd",borderRadius:12,padding:"16px 18px",display:"flex",flexDirection:"column",gap:10,minWidth:280}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#7B00C4"}}>🎁 Gratificação para {config.nomeSecretaria}</div>
                    <div>
                      <label style={{fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4}}>VALOR (R$)</label>
                      <input type="number" value={valGrat} onChange={e=>setValGrat(e.target.value)} placeholder="Ex: 50"
                        style={{width:"100%",padding:"8px 10px",border:"1px solid #c4b5fd",borderRadius:8,fontSize:14,fontFamily:"var(--font-body)"}}/>
                    </div>
                    <div>
                      <label style={{fontSize:11,fontWeight:600,color:"#6b7280",display:"block",marginBottom:4}}>MOTIVO</label>
                      <input type="text" value={obsGrat} onChange={e=>setObsGrat(e.target.value)} placeholder="Ex: Ajuste jul/26 — diferença 10%→5%"
                        style={{width:"100%",padding:"8px 10px",border:"1px solid #c4b5fd",borderRadius:8,fontSize:13,fontFamily:"var(--font-body)"}}/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={registrarGratificacao} disabled={salvGrat}
                        style={{flex:1,background:"#7B00C4",color:"white",border:"none",borderRadius:8,padding:"9px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                        {salvGrat?"Salvando...":"✓ Confirmar"}
                      </button>
                      <button onClick={()=>setShowGrat(false)}
                        style={{padding:"9px 14px",background:"white",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Botão Gerar Recibo — sempre visível para qualquer mês */}
      {(()=>{
        function gerarRecibo(){
          const mesLabel = getMesLabel(mesSel);
          const nomeSecretary = config.nomeSecretaria||"Secretária";
          // Inclui tanto pendentes quanto pagas do mês para o recibo histórico
          const itensPend = comissoesPend.map(c=>({
            desc:`${c.tipoVenda==="primeira"?"1ª venda":"Recorrente"} — ${c.pacienteNome||"Paciente"} (${c.perc||10}%)`,
            valor: c.valorComissao||0, status:"pendente"
          }));
          const itensPagos = comissoesPagas.map(c=>({
            desc:`${c.tipoVenda==="primeira"?"1ª venda":"Recorrente"} — ${c.pacienteNome||"Paciente"} (${c.perc||10}%)`,
            valor: c.valorComissao||0, status:"pago"
          }));
          const todoItens = [...itensPend,...itensPagos];
          const totalRecibo = SALARIO_FIXO + todoItens.reduce((a,i)=>a+i.valor,0);
          const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Recibo de Pagamento — ${nomeSecretary} — ${mesLabel}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;padding:40px;max-width:620px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:3px solid #7B00C4;margin-bottom:24px}
.logo{font-family:Georgia,serif;font-size:22px;color:#7B00C4;font-weight:700}
.sub{font-size:10px;color:#6b7280;margin-top:3px}
h2{font-size:18px;color:#111827;margin-bottom:4px}
.mes{font-size:13px;color:#7B00C4;font-weight:600;margin-bottom:20px}
p{font-size:13px;color:#374151;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px}
th{background:#7B00C4;color:white;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase}
td{padding:8px 12px;border-bottom:1px solid #f3f4f6}
tr:nth-child(even) td{background:#fafafa}
.total-row td{font-weight:700;font-size:14px;border-top:2px solid #7B00C4;background:#f5f0ff;color:#7B00C4}
.assinatura{margin-top:40px;display:flex;justify-content:space-between;gap:40px}
.assinatura-bloco{flex:1;text-align:center}
.linha{border-top:1px solid #374151;margin-bottom:6px;margin-top:40px}
.nome-assinatura{font-size:12px;font-weight:600}
.cargo-assinatura{font-size:10px;color:#6b7280}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
@media print{body{padding:20px}@page{margin:1.5cm}}
</style></head><body>
<div class="header">
  <div><div class="logo">Dra. Lucia Kratz</div><div class="sub">CRP 09/20590 · Psicóloga · Goiânia, GO</div></div>
  <div style="font-size:10px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</div>
</div>
<h2>Recibo de Pagamento</h2>
<div class="mes">${mesLabel}</div>
<p>Declaro o recebimento da importância de <strong>R$ ${totalRecibo.toFixed(2).replace(".",",")}</strong> referente à competência <strong>${mesLabel}</strong>:</p>
<table>
  <thead><tr><th>Descrição</th><th style="text-align:right;width:120px">Valor</th></tr></thead>
  <tbody>
    <tr><td>Salário Fixo</td><td style="text-align:right">R$ ${SALARIO_FIXO.toFixed(2).replace(".",",")}</td></tr>
    ${todoItens.map(i=>`<tr><td>${i.desc}</td><td style="text-align:right">R$ ${i.valor.toFixed(2).replace(".",",")}</td></tr>`).join("")}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">R$ ${totalRecibo.toFixed(2).replace(".",",")}</td></tr>
  </tbody>
</table>
<div class="assinatura">
  <div class="assinatura-bloco"><div class="linha"></div><div class="nome-assinatura">${nomeSecretary}</div><div class="cargo-assinatura">Secretária — Recebedor(a)</div></div>
  <div class="assinatura-bloco"><div class="linha"></div><div class="nome-assinatura">Dra. Lucia Kratz</div><div class="cargo-assinatura">CRP 09/20590 — Pagador(a)</div></div>
</div>
<div class="footer">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
          const w=window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),800);
        }
        return (
          <div style={{marginBottom:16}}>
            <button onClick={gerarRecibo}
              style={{background:"white",color:"#7B00C4",border:"2px solid #7B00C4",borderRadius:10,padding:"10px 20px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"var(--font-body)",display:"flex",alignItems:"center",gap:6}}>
              🖨️ Gerar Recibo — {getMesLabel(mesSel)}
            </button>
          </div>
        );
      })()}
      {/* Lista de comissões — ciclo atual */}
      <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",overflow:"hidden"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-200)",fontWeight:700,fontSize:14}}>
          🔄 Ciclo Atual (a pagar) — {config.nomeSecretaria.split(" ")[0]} — {getMesLabel(mesSel)}
        </div>
        {comissoesPend.length === 0 ? (
          <div style={{padding:"30px 20px",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>
            ✓ Nenhuma comissão pendente — novas vendas aparecem aqui e reabrem o pagamento
          </div>
        ) : comissoesPend.map(c => {
          const dataStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("pt-BR") : c.mesRef||"—";
          return(
          <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid var(--gray-100)",background:"white"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>{c.pacienteNome||"—"}</div>
              <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{c.tipo} · {dataStr}</div>
              {c.pacoteId&&<div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>Pacote: {c.pacoteId.slice(0,8)}...</div>}
              <span style={{fontSize:11,fontWeight:700,color:corTipoVenda(c.tipoVenda),background:corTipoVenda(c.tipoVenda)+"18",padding:"2px 8px",borderRadius:20,display:"inline-block",marginTop:4}}>
                {labelTipoVenda(c.tipoVenda)}
              </span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,color:"var(--text-muted)"}}>Base: R$ {(c.valorBase||0).toFixed(2).replace(".",",")}</div>
                <div style={{fontWeight:700,fontSize:16,color:"#7B00C4"}}>+R$ {(c.valorComissao||0).toFixed(2).replace(".",",")}</div>
              </div>
              {user.tipo==="psicologa"&&(
                <button title="Excluir comissão"
                  onClick={async()=>{
                    if(!confirm(`Excluir comissão de ${c.pacienteNome} (R$ ${(c.valorComissao||0).toFixed(2).replace(".",",")})?`))return;
                    const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
                    await db.collection(col).doc(c.id).delete();
                  }}
                  style={{background:"none",border:"1px solid #fca5a5",borderRadius:6,color:"#dc2626",cursor:"pointer",padding:"4px 8px",fontSize:11}}>
                  🗑️
                </button>
              )}
            </div>
          </div>
        );})}
      </div>

      {/* ── ⚠️ Comissões Aguardando — fora do ciclo até pacote ser pago ── */}
      {comissoesSuspeitas.length > 0 && (
        <div style={{background:"#fffbeb",borderRadius:14,border:"1px solid #fde68a",overflow:"hidden",marginTop:16}}>
          <div style={{padding:"12px 20px",borderBottom:"1px solid #fde68a",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <span style={{fontWeight:700,fontSize:13,color:"#b45309"}}>⏳ Aguardando pagamento do pacote — {comissoesSuspeitas.length} comissão(ões) fora do ciclo</span>
            <span style={{fontSize:11,color:"#92400e"}}>Entram automaticamente quando o pacote for marcado como pago</span>
          </div>
          {comissoesSuspeitas.map(c => {
            const pacoteVinc = c.pacoteId ? pacotes.find(p=>p.id===c.pacoteId) : null;
            const semPacote = c.pacoteId && !pacoteVinc;
            const dataStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("pt-BR") : c.mesRef||"-";
            return (
              <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderBottom:"1px solid #fef3c7"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <div style={{fontWeight:600,fontSize:13,color:"#78350f"}}>{c.pacienteNome||"-"}</div>
                    {semPacote && <span style={{fontSize:10,background:"#fca5a5",color:"#7f1d1d",padding:"1px 6px",borderRadius:8,fontWeight:700}}>Pacote removido</span>}
                    {pacoteVinc && <span style={{fontSize:10,background:"#fed7aa",color:"#7c2d12",padding:"1px 6px",borderRadius:8,fontWeight:600}}>Pacote pendente · R$ {(pacoteVinc.valorTotal||0).toFixed(2).replace(".",",")}</span>}
                  </div>
                  <div style={{fontSize:11,color:"#92400e",marginTop:2}}>{c.tipo} · {dataStr}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"#92400e"}}>Comissão prevista</div>
                    <div style={{fontWeight:700,fontSize:14,color:"#b45309"}}>R$ {(c.valorComissao||0).toFixed(2).replace(".",",")}</div>
                  </div>
                  {user.tipo==="psicologa" && (
                  <button title="Remover do sistema"
                    onClick={async()=>{
                      if(!confirm(`Remover comissão de ${c.pacienteNome}? Ela será gerada novamente quando o pacote for pago.`))return;
                      const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
                      await db.collection(col).doc(c.id).delete();
                    }}
                    style={{background:"none",border:"1px solid #fca5a5",borderRadius:6,color:"#dc2626",cursor:"pointer",padding:"4px 8px",fontSize:11}}>
                    🗑️
                  </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ✓ Histórico do mês: comissões já pagas e pagamentos realizados ── */}
      {(comissoesPagas.length>0||pagamentosDoMes.length>0)&&(
        <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",overflow:"hidden",marginTop:24}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-200)",fontWeight:700,fontSize:14,display:"flex",justifyContent:"space-between"}}>
            <span>✓ Histórico — {getMesLabel(mesSel)}</span>
            <span style={{fontSize:13,color:"#16a34a",fontWeight:600}}>R$ {totalPagas.toFixed(2).replace(".",",")} em comissões pagas</span>
          </div>
          {pagamentosDoMes.length>0&&(
            <div style={{padding:"10px 20px",background:"#f0fdf4",borderBottom:"1px solid var(--gray-100)"}}>
              {pagamentosDoMes.map(pg=>(
                <div key={pg.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}>
                  <span style={{color:"#166534"}}>💰 {pg.tipo} — {pg.data?.split("-").reverse().join("/")}
                    {pg.qtdComissoes?` · ${pg.qtdComissoes} comissão(ões)`:""}
                    {(pg.valorSalarioFixo||0)>0?` · inclui salário fixo`:""}
                  </span>
                  <strong style={{color:"#166534"}}>R$ {(pg.valor||0).toFixed(2).replace(".",",")}</strong>
                </div>
              ))}
            </div>
          )}
          {comissoesPagas.map(c=>(
            <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderBottom:"1px solid var(--gray-100)",opacity:0.75}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{c.pacienteNome||"—"}</div>
                <div style={{fontSize:11,color:"var(--text-muted)"}}>{c.tipo} · {labelTipoVenda(c.tipoVenda)} · pago em {c.dataPagamento?c.dataPagamento.split("-").reverse().join("/"):"—"}</div>
              </div>
              <div style={{fontWeight:700,fontSize:14,color:"#16a34a"}}>✓ R$ {(c.valorComissao||0).toFixed(2).replace(".",",")}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",overflow:"hidden",marginTop:24}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-200)",fontWeight:700,fontSize:14}}>
          🤝 Repasses a Parceiras — {getMesLabel(mesSel)}
        </div>
        {responsaveis.length===0 ? (
          <div style={{padding:"30px 20px",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>
            Nenhum repasse neste mês. Vendas em parceria aparecem aqui automaticamente.
          </div>
        ) : responsaveis.map(resp => {
          const itens = repassesMes.filter(c=>c.responsavel===resp);
          const totalResp = itens.reduce((a,c)=>a+(c.valorComissao||0),0);
          const pendentes = itens.filter(c=>c.status!=="pago");
          const totalPend = pendentes.reduce((a,c)=>a+(c.valorComissao||0),0);
          const parc = parceiras.find(p=>p.nome===resp);
          return (
            <div key={resp} style={{borderBottom:"1px solid var(--gray-100)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"#fffbeb",flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{resp}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)"}}>
                    {itens.length} venda(s) · Total R$ {totalResp.toFixed(2).replace(".",",")}
                    {parc?.pix?` · PIX: ${parc.pix}`:""}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:"var(--text-muted)"}}>Pendente</div>
                    <div style={{fontWeight:800,fontSize:18,color:totalPend>0?"#b45309":"#16a34a"}}>R$ {totalPend.toFixed(2).replace(".",",")}</div>
                  </div>
                  {user.tipo==="psicologa" && totalPend>0 && (
                    <button onClick={()=>pagarRepasse(resp)} disabled={pagando}
                      style={{background:"#b45309",color:"white",border:"none",borderRadius:8,padding:"9px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                      {pagando?"...":"💸 Marcar como pago"}
                    </button>
                  )}
                </div>
              </div>
              {itens.map(c=>(
                <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderTop:"1px solid var(--gray-100)"}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{c.pacienteNome||"—"}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)"}}>{c.tipo} · {c.perc?`${c.perc}% de R$ ${(c.valorBase||0).toFixed(2).replace(".",",")}`:""}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#b45309"}}>R$ {(c.valorComissao||0).toFixed(2).replace(".",",")}</div>
                    {c.status==="pago"
                      ? <div style={{fontSize:11,color:"#16a34a",fontWeight:600}}>✓ Pago {c.dataPagamento?c.dataPagamento.split("-").reverse().join("/"):""}</div>
                      : <div style={{fontSize:11,color:"#b45309",fontWeight:600}}>Pendente</div>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── 🤝 CADASTRO DE PARCEIRAS — só psicóloga ── */}
      {user.tipo==="psicologa" && (
        <div style={{background:"white",borderRadius:14,border:"1px solid var(--gray-200)",overflow:"hidden",marginTop:24}}>
          <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-200)",fontWeight:700,fontSize:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Parceiras Cadastradas</span>
            <button onClick={()=>{setEditandoParceira(null);setFormParceira({nome:"",percentual:String(config.percParceiroPadrao||70),pix:"",tipo:"parceira"});setModalParceira(true);}}
              style={{background:"var(--purple)",color:"white",border:"none",borderRadius:8,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"var(--font-body)"}}>+ Nova Parceira</button>
          </div>
          {parceiras.length===0 ? (
            <div style={{padding:"30px 20px",textAlign:"center",color:"var(--text-muted)",fontSize:13}}>
              Nenhuma parceira cadastrada. Cadastre para usar nas vendas em parceria.
            </div>
          ) : parceiras.map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderBottom:"1px solid var(--gray-100)"}}>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>{p.nome} {p.tipo==="estagiaria"&&<span style={{fontSize:10,fontWeight:700,background:"#ccfbf1",color:"#0d9488",padding:"2px 8px",borderRadius:10,marginLeft:6}}>Estagiária</span>}</div>
                <div style={{fontSize:12,color:"var(--text-muted)"}}>Repasse padrão: {p.percentual||config.percParceiroPadrao}% {p.pix?` · PIX: ${p.pix}`:""}</div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{setEditandoParceira(p.id);setFormParceira({nome:p.nome||"",percentual:String(p.percentual||config.percParceiroPadrao||70),pix:p.pix||"",tipo:p.tipo||"parceira"});setModalParceira(true);}}
                  style={{background:"none",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",padding:"5px 10px",fontSize:12}}>✏️</button>
                <button onClick={async()=>{
                    if(!confirm(`Excluir parceira ${p.nome}? Os repasses já registrados não serão apagados.`))return;
                    await db.collection("clinica_parceiras").doc(p.id).delete();
                  }}
                  style={{background:"none",border:"1px solid #fca5a5",borderRadius:6,color:"#dc2626",cursor:"pointer",padding:"5px 10px",fontSize:12}}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova/Editar Parceira */}
      {modalParceira&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModalParceira(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:20}}>{editandoParceira?"Editar Parceira":"Nova Parceira"}</div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Nome</label>
              <input className="form-input" value={formParceira.nome} onChange={e=>setFormParceira({...formParceira,nome:e.target.value})} placeholder="Ex: Thais Cordeiro"/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">% de repasse padrão</label>
              <input className="form-input" type="number" min="0" max="100" value={formParceira.percentual} onChange={e=>setFormParceira({...formParceira,percentual:e.target.value})}/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Chave PIX (opcional)</label>
              <input className="form-input" value={formParceira.pix} onChange={e=>setFormParceira({...formParceira,pix:e.target.value})}/>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Tipo</label>
              <select className="form-input" value={formParceira.tipo} onChange={e=>setFormParceira({...formParceira,tipo:e.target.value})}>
                <option value="parceira">Parceira (vendas em parceria)</option>
                <option value="estagiaria">Estagiária (projeto social)</option>
              </select>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModalParceira(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvarParceira}>{editandoParceira?"Salvar alterações":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Depoimentos() {
  const [lista, setLista] = useState([]);
  const [aba, setAba] = useState("pendente");
  const [salvando, setSalvando] = useState(null);
  const [respostaEdit, setRespostaEdit] = useState({});
  const [salvandoResposta, setSalvandoResposta] = useState(null);

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
  async function salvarResposta(id){
    const texto = (respostaEdit[id]||"").trim();
    setSalvandoResposta(id);
    await db.collection("site_depoimentos").doc(id).update({resposta:texto});
    setSalvandoResposta(null);
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
          <a href="../depoimentos/" target="_blank"
            style={{display:"inline-flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:10,background:"var(--purple-soft)",color:"var(--purple)",fontSize:13,fontWeight:600,textDecoration:"none"}}>
            <Icon name="star" size={14}/> Página depoimentos
          </a>
          <button className="btn btn-ghost" style={{fontSize:13}}
            onClick={()=>{ navigator.clipboard.writeText("https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/depoimentos/"); alert("Link copiado!"); }}>
            <Icon name="link" size={14}/> Copiar link
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

                  {/* Resposta da psicóloga */}
                  <div style={{marginTop:14,background:"var(--purple-bg,#f5eeff)",borderRadius:10,padding:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--purple)",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                      <Icon name="message-circle" size={14}/> Sua resposta (aparece no site)
                    </div>
                    <textarea
                      className="form-input"
                      style={{width:"100%",minHeight:60,fontSize:13,fontFamily:"var(--font-body)",resize:"vertical"}}
                      placeholder="Escreva aqui sua resposta pública a este depoimento..."
                      value={respostaEdit[d.id] !== undefined ? respostaEdit[d.id] : (d.resposta||"")}
                      onChange={e=>setRespostaEdit(prev=>({...prev,[d.id]:e.target.value}))}
                    />
                    <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                      <button className="btn btn-purple" style={{fontSize:12,padding:"6px 14px"}}
                        onClick={()=>salvarResposta(d.id)} disabled={salvandoResposta===d.id}>
                        <Icon name="save" size={13}/> {salvandoResposta===d.id?"Salvando...":"Salvar resposta"}
                      </button>
                    </div>
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
