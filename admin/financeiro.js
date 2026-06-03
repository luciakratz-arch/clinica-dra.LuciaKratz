// financeiro.js — Módulo Financeiro da Clínica Dra. Lucia Kratz
// CRP 09/20590 · Simples Nacional · Fator R
// Depende de: firebase (db), React, Icon, fmtDataHora, dispararNotificacao
// Carregar APÓS app.js no index.html

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
  // ── Painel Fiscal ────────────────────────────────────────────────────
  const [proLabore, setProLabore] = useState(1518);
  const [modalNF, setModalNF]     = useState(null); // {lancId, linkAtual}
  const [linkNF, setLinkNF]       = useState("");
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
      {/* ── MODAL NOTA FISCAL ── */}
      {modalNF&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:20}} onClick={()=>setModalNF(null)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:460}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,color:"#16a34a"}}>🧾 Nota Fiscal</div>
              <button onClick={()=>setModalNF(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af"}}>✕</button>
            </div>
            <div className="form-group" style={{marginBottom:16}}>
              <label className="form-label">Link da Nota Fiscal</label>
              <input className="form-input" placeholder="https://..." value={linkNF} onChange={e=>setLinkNF(e.target.value)}
                style={{fontFamily:"monospace",fontSize:12}}/>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Cole o link do portal da prefeitura, PDF ou Drive</div>
            </div>
            {modalNF.linkAtual&&(
              <div style={{marginBottom:16}}>
                <a href={modalNF.linkAtual} target="_blank" rel="noopener noreferrer"
                  style={{display:"inline-flex",alignItems:"center",gap:6,background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"8px 14px",color:"#16a34a",fontSize:12,fontWeight:600,textDecoration:"none"}}>
                  <Icon name="external-link" size={13}/> Abrir NF atual
                </a>
              </div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              {modalNF.linkAtual&&(
                <button className="btn btn-ghost" style={{color:"#dc2626"}} onClick={async()=>{
                  await db.collection("clinica_lancamentos").doc(modalNF.lancId).update({linkNF:""});
                  setModalNF(null);
                }}>🗑️ Remover NF</button>
              )}
              <button className="btn btn-ghost" onClick={()=>setModalNF(null)}>Cancelar</button>
              <button className="btn btn-purple" onClick={async()=>{
                if(!linkNF.trim()){alert("Cole o link da NF.");return;}
                await db.collection("clinica_lancamentos").doc(modalNF.lancId).update({linkNF:linkNF.trim()});
                setModalNF(null);
              }}>
                <Icon name="save" size={14}/> Salvar
              </button>
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
        {[["lancamentos","Lançamentos","dollar-sign"],["pacotes","Pacotes & Sessões","package"],["acompanhamento","Acompanhamento Geral","users"],["fiscal","Fiscal 🧾","bar-chart-2"]].map(([id,lbl,ic])=>(
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
                              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                                {l.tipo_lancamento==="pacote"?(
                                  <button className="btn btn-ghost" style={{padding:"4px 8px",fontSize:11,color:"var(--purple)"}} onClick={()=>{setPacoteSelecionado(l.pacoteId);setAba("pacotes");}}>
                                    <Icon name="clipboard-list" size={12}/>
                                  </button>
                                ):(
                                  <button className="btn btn-ghost" style={{padding:"4px 8px",fontSize:11,color:"var(--purple)"}} onClick={()=>abrirEditar(l)}>
                                    <Icon name="pencil" size={12}/>
                                  </button>
                                )}
                                {/* Botão NF — verde se tem link, cinza se não tem */}
                                <button
                                  title={l.linkNF?"Ver Nota Fiscal":"Cadastrar Nota Fiscal"}
                                  onClick={()=>{setModalNF({lancId:l.id,linkAtual:l.linkNF||""});setLinkNF(l.linkNF||"");}}
                                  style={{padding:"4px 8px",borderRadius:6,border:"1px solid",cursor:"pointer",
                                    borderColor:l.linkNF?"#16a34a":"#d1d5db",
                                    background:l.linkNF?"#dcfce7":"#f9fafb",
                                    color:l.linkNF?"#16a34a":"#9ca3af",fontSize:11,fontWeight:600,
                                    display:"flex",alignItems:"center",gap:3}}>
                                  <Icon name="file-text" size={11}/>
                                  {l.linkNF?"NF":"NF"}
                                </button>
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

      {/* ABA FISCAL */}
      {aba==="fiscal"&&(()=>{
        // Lançamentos de receita do mês selecionado
        const lancMes = lancamentos.filter(l=>
          l.tipo_lancamento!=="despesa" &&
          (l.data||"").startsWith(mesFiltro)
        );

        // Classificar por tipo de CNAE
        const CNAE_PSICO = ["psicologia","psicanálise","psicanálise","terapia ocupacional","psicoterapia","atendimento psicológico","sessão","consulta"];
        const CNAE_OUTROS = ["musicoterapia","música","treinamento","ensino","produção musical","neurofeedback","coral","artístico","cultural","assessoria","desenvolvimento humano"];
        const CNAE_ALERTA = ["consultoria","gestão empresarial"]; // Anexo V — alíquota maior

        function classificar(l){
          const desc = (l.descricao||l.tipo||l.categoria||"").toLowerCase();
          if(CNAE_ALERTA.some(k=>desc.includes(k))) return "alerta";
          if(CNAE_PSICO.some(k=>desc.includes(k))) return "psico";
          return "outros";
        }

        const totalPsico  = lancMes.filter(l=>classificar(l)==="psico").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
        const totalOutros = lancMes.filter(l=>classificar(l)==="outros").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
        const totalAlerta = lancMes.filter(l=>classificar(l)==="alerta").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
        const totalNF     = totalPsico + totalOutros + totalAlerta;

        const TETO_PSICO  = 5750;
        const TETO_OUTROS = 9250;
        const TETO_TOTAL  = 15000;

        const fatorR = totalNF > 0 ? (proLabore / totalNF) * 100 : 100;
        const fatorROk = fatorR >= 28;

        const pctPsico  = Math.round((totalPsico/TETO_PSICO)*100);
        const pctOutros = Math.round((totalOutros/TETO_OUTROS)*100);
        const pctTotal  = Math.round((totalNF/TETO_TOTAL)*100);

        function Barra({pct, cor}){
          const c = pct>=100?"#dc2626":pct>=85?"#d97706":cor;
          return <div style={{height:8,borderRadius:20,background:"#f3f4f6",overflow:"hidden",marginTop:6}}>
            <div style={{width:Math.min(pct,100)+"%",height:"100%",background:c,borderRadius:20,transition:"width .4s"}}/>
          </div>;
        }

        return (
          <div style={{maxWidth:720}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <h2 style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,margin:0}}>🧾 Painel Fiscal</h2>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>Simples Nacional · Fator R · Mês: {new Date(mesFiltro+"-15").toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:"var(--text-muted)"}}>Pró-labore Paulo:</span>
                <input type="number" value={proLabore} onChange={e=>setProLabore(parseFloat(e.target.value)||0)}
                  style={{width:90,padding:"4px 8px",border:"1px solid #e5e7eb",borderRadius:6,fontSize:13,fontWeight:600,color:"#7B00C4",textAlign:"right"}}/>
              </div>
            </div>

            {/* Fator R */}
            <div style={{background:fatorROk?"#f0fdf4":"#fef2f2",border:"1.5px solid",borderColor:fatorROk?"#86efac":"#fca5a5",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:fatorROk?"#16a34a":"#dc2626"}}>
                    {fatorROk?"✅":"🔴"} Fator R: {fatorR.toFixed(1)}%
                  </div>
                  <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>
                    Pró-labore (R$ {proLabore.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}).replace("R$","").trim()}) ÷ Faturamento NF do mês
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:22,fontWeight:800,color:fatorROk?"#16a34a":"#dc2626"}}>{fatorROk?"6%":"⚠️ 15,5%"}</div>
                  <div style={{fontSize:10,color:"#6b7280"}}>Alíquota estimada</div>
                </div>
              </div>
              {!fatorROk&&(
                <div style={{marginTop:12,background:"#fef2f2",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#dc2626",fontWeight:500}}>
                  ⚠️ Fator R abaixo de 28% — <strong>Avisar contabilidade para revisar pró-labore do Paulo</strong> para manter Anexo III (6%).
                  <br/>Pró-labore mínimo necessário: <strong>R$ {(totalNF*0.28).toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong>
                </div>
              )}
            </div>

            {/* Tetos por categoria */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              {[
                {label:"Psicologia / Saúde Mental",total:totalPsico,teto:TETO_PSICO,pct:pctPsico,cor:"#7B00C4",desc:"CNAE 86.50-0/03 · Fator R"},
                {label:"Outras Atividades",total:totalOutros,teto:TETO_OUTROS,pct:pctOutros,cor:"#0891b2",desc:"Musicoterapia, Treinamento, Produção Musical"},
              ].map(({label,total,teto,pct,cor,desc})=>(
                <div key={label} style={{background:"white",border:"1px solid #e5e7eb",borderRadius:12,padding:"16px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:4}}>{label}</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:8}}>{desc}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                    <span style={{fontSize:20,fontWeight:800,color:pct>=100?"#dc2626":pct>=85?"#d97706":cor}}>
                      {total.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                    </span>
                    <span style={{fontSize:11,color:"#9ca3af"}}>/ R$ {teto.toLocaleString("pt-BR")}</span>
                  </div>
                  <Barra pct={pct} cor={cor}/>
                  <div style={{fontSize:11,color:pct>=100?"#dc2626":pct>=85?"#d97706":"#6b7280",marginTop:4,fontWeight:pct>=85?600:400}}>
                    {pct>=100?"🔴 Limite atingido — revisar com contabilidade":pct>=85?"🟡 "+Math.round(teto-total).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+" restante — atenção":"✅ "+Math.round(teto-total).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})+" restante"}
                  </div>
                </div>
              ))}
            </div>

            {/* Total geral */}
            <div style={{background:"white",border:"1.5px solid",borderColor:pctTotal>=100?"#fca5a5":pctTotal>=85?"#fcd34d":"#e5e7eb",borderRadius:12,padding:"16px 20px",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"#111827"}}>Total NF emitida no mês</div>
                  <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>Teto mensal: R$ 15.000 (média)</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:24,fontWeight:800,color:pctTotal>=100?"#dc2626":pctTotal>=85?"#d97706":"#059669"}}>
                    {totalNF.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{pctTotal}% do teto</div>
                </div>
              </div>
              <Barra pct={pctTotal} cor="#059669"/>
            </div>

            {/* Alerta de consultoria */}
            {totalAlerta>0&&(
              <div style={{background:"#fef3c7",border:"1.5px solid #fcd34d",borderRadius:12,padding:"14px 18px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:13,color:"#92400e",marginBottom:4}}>⚠️ Atenção — Lançamentos em atividade de Consultoria</div>
                <div style={{fontSize:12,color:"#92400e"}}>
                  R$ {totalAlerta.toLocaleString("pt-BR",{minimumFractionDigits:2})} em consultoria/gestão empresarial (CNAE 70.20-4/00).<br/>
                  Essa atividade é tributada pelo <strong>Anexo V (alíquota maior)</strong>, independente do Fator R. Confirmar com contador se há segregação de receitas.
                </div>
              </div>
            )}

            {/* Lista de lançamentos do mês com NF */}
            <div style={{background:"white",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:600,fontSize:13}}>Lançamentos de receita — {new Date(mesFiltro+"-15").toLocaleDateString("pt-BR",{month:"long"})}</span>
                <span style={{fontSize:12,color:"#6b7280"}}>{lancMes.length} lançamentos</span>
              </div>
              {lancMes.length===0&&<div style={{padding:24,textAlign:"center",color:"#9ca3af",fontSize:13}}>Nenhum lançamento de receita neste mês.</div>}
              {lancMes.map(l=>{
                const cls = classificar(l);
                const cfgCls = cls==="alerta"?{c:"#92400e",bg:"#fef3c7",label:"⚠️ Consultoria"}:cls==="psico"?{c:"#7B00C4",bg:"#f5f3ff",label:"🧠 Psico"}:{c:"#0891b2",bg:"#e0f2fe",label:"🎵 Outros"};
                return (
                  <div key={l.id} style={{padding:"10px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:10,fontWeight:700,color:cfgCls.c,background:cfgCls.bg,borderRadius:20,padding:"2px 8px",flexShrink:0}}>{cfgCls.label}</span>
                    <div style={{flex:1,fontSize:12}}>
                      <span style={{fontWeight:500}}>{l.descricao||l.tipo||l.pacienteNome||"—"}</span>
                      <span style={{color:"#9ca3af",marginLeft:8}}>{l.data?new Date(l.data+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</span>
                    </div>
                    <span style={{fontWeight:700,fontSize:13,color:"#059669",flexShrink:0}}>
                      {(parseFloat(l.valor)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                    </span>
                    {/* Indicador NF */}
                    <button onClick={()=>{setModalNF({lancId:l.id,linkAtual:l.linkNF||""});setLinkNF(l.linkNF||"");}}
                      title={l.linkNF?"NF emitida — clique para ver/editar":"NF não cadastrada"}
                      style={{padding:"3px 8px",borderRadius:6,border:"1px solid",cursor:"pointer",fontSize:10,fontWeight:600,
                        borderColor:l.linkNF?"#16a34a":"#d1d5db",background:l.linkNF?"#dcfce7":"#f9fafb",color:l.linkNF?"#16a34a":"#9ca3af"}}>
                      {l.linkNF?"✅ NF":"⬜ NF"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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

