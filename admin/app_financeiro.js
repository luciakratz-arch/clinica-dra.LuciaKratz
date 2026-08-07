const { useState, useEffect, useCallback, useRef, useMemo } = React;
const db = firebase.firestore();

function FinanceiroClinica({ user }) {
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
  const CATS_DESPESA_CLINICA = ["Aluguel","Condomínio","Energia / Água","Telefone / Internet","Salário Secretária","Contador / Impostos","Marketing","Equipamentos","Materiais","Ferramentas de IA","Cursos e Capacitação","Musicoterapia","Manutenção","Outros"];
  const FORMAS_PAG_CLINICA = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Depósito","Transferência","Outro"];
  const [modalDespesa, setModalDespesa] = useState(false);
  const [formDespesa, setFormDespesa] = useState({descricao:"",categoria:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"});
  const [editandoDespesa, setEditandoDespesa] = useState(null);

  async function salvarDespesaClinica(){
    if(!formDespesa.valor||!formDespesa.data){alert("Preencha valor e data.");return;}
    setSalvando(true);
    try {
      const val=parseFloat(formDespesa.valor);
      const nParc=parseInt(formDespesa.parcelas)||1;
      const base={
        tipo:"despesa",tipo_lancamento:"despesa",
        categoria:formDespesa.categoria||"Outros",
        descricao:formDespesa.descricao||formDespesa.categoria||"Despesa",
        formaPag:formDespesa.formaPag,status:formDespesa.status,
        obs:formDespesa.obs||"",centroCusto:"🏥 Clínica",
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      if(editandoDespesa){
        await db.collection("clinica_lancamentos").doc(editandoDespesa).update({...base,valor:val,data:formDespesa.data});
      } else if(nParc>1){
        const batch=db.batch();
        const [ano,mes,dia]=formDespesa.data.split("-").map(Number);
        for(let i=0;i<nParc;i++){
          let m=mes+i,a=ano; while(m>12){m-=12;a++;}
          const dp=`${a}-${String(m).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
          batch.set(db.collection("clinica_lancamentos").doc(),{...base,valor:val,data:dp,parcela:`${i+1}/${nParc}`,descricao:(formDespesa.descricao||formDespesa.categoria||"Despesa")+` (${i+1}/${nParc})`});
        }
        await batch.commit();
      } else {
        await db.collection("clinica_lancamentos").add({...base,valor:val,data:formDespesa.data});
      }
      setModalDespesa(false);setEditandoDespesa(null);
      setFormDespesa({descricao:"",categoria:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"});
    } catch(e){alert("Erro: "+e.message);}
    setSalvando(false);
  }
  const [aba, setAba] = useState("lancamentos");
  const [buscaPac, setBuscaPac] = useState("");

  const FORMAS = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Depósito","Transferência","Outro"];
  const RECORRENCIAS = ["Semanal (1x/semana)","2x por semana","3x por semana","Quinzenal","Mensal","Sessão única"];
  const DIAS_LABEL = {0:"Dom",1:"Seg",2:"Ter",3:"Qua",4:"Qui",5:"Sex",6:"Sáb"};

  const [formAvulso, setFormAvulso] = useState({pacienteId:"",tipo:"Consulta",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pendente",obs:""});
  // Estado dedicado para edição de despesas
  const CATS_DESPESA = ["Aluguel","Condomínio","Marketing","Salários","Investimentos","Musicoterapia","Ferramentas de IA","Telefone/Internet","Contador","Impostos","Outros"];
  const [formDespesaEdit, setFormDespesaEdit] = useState({descricao:"",categoria:"",valor:"",data:"",formaPag:"",status:"pago",obs:""});
  // ── Painel de higienização ────────────
  const [modalAuditoria, setModalAuditoria] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("tudo"); // "tudo" | "receita" | "despesa"
  const [auditLog, setAuditLog] = useState([]);
  const [auditando, setAuditando] = useState(false);
  const [formPacote, setFormPacote] = useState({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},statusPag:"pendente",formaPag:"",dataPagamento:"",pagamentosExtras:[],obs:"",parceiraId:"",percParceiro:"70"});
  const [parceiras, setParceiras] = useState([]);
  const [modalEditarPacote, setModalEditarPacote] = useState(null); // {pacote}
  const [formEdicaoPacote, setFormEdicaoPacote] = useState({});
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(()=>{
    const u1=db.collection("clinica_lancamentos").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(b.data||"").localeCompare(a.data||""));setLancamentos(docs);},()=>{});
    const u2=db.collection("clinica_pacotes").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));setPacotes(docs);},()=>{});
    const u3=db.collection("clinica_sessoes").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(a.data||"").localeCompare(b.data||""));setSessoes(docs);},()=>{});
    const u4=db.collection("clinica_parceiras").onSnapshot(s=>{const docs=s.docs.map(d=>({id:d.id,...d.data()}));docs.sort((a,b)=>(a.nome||"").localeCompare(b.nome||""));setParceiras(docs);},()=>{});
    return()=>{u1();u2();u3();u4();};
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
      setFormDespesa({descricao:l.descricao||"",categoria:l.categoria||"",valor:l.valor+"",data:l.data||"",formaPag:l.formaPag||"PIX",status:l.status||"pago",obs:l.obs||"",parcelas:"1"});
      setEditandoDespesa(l.id);
      setModalDespesa(true);
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

    // ── GATILHO ÚNICO + TRAVA DUPLA DE COMISSÃO ──
    // Regra 1: Só dispara se o pacote estava estritamente "pendente" antes desta chamada
    // Regra 2: ID derivado (COM_pacoteId) garante idempotência — retry nunca duplica
    const eraPendente = (pacote.statusPag||"pendente") !== "recebido";
    if(eraPendente) {
      // Detecta se é primeira venda ou recorrente para este paciente
      const tipoVendaDetectado = lancamentos.some(
        l => l.pacienteId===pacote.pacienteId && l.pacoteId!==pacoteId && l.status==="recebido"
      ) ? "recorrente" : "primeira";
      await registrarComissao({
        tipo: "Pacote",
        valor: valorPagoFinal,
        pacienteNome: pacote.pacienteNome || pacientes.find(p=>p.id===pacote.pacienteId)?.nome || "",
        tipoVenda: tipoVendaDetectado,
        pacoteId
      });
    }
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

  async function registrarComissao({ tipo, valor, pacienteNome, tipoVenda, pacoteId=null }) {
    // ── TRAVA DE IDEMPOTÊNCIA: ID do documento = "COM_" + pacoteId ──
    // Se o gatilho rodar mais de uma vez (erro de rede, retry), o Firestore
    // fará um UPDATE (merge) e nunca um INSERT duplicado.
    if(!pacoteId){
      console.warn("[registrarComissao] Chamada sem pacoteId — abortando para evitar registro órfão.");
      return;
    }
    const cfg = await getConfigFin();
    const percNum = tipoVenda === "primeira" ? (parseFloat(cfg.percPrimeira)||10) : (parseFloat(cfg.percRecorrente)||5);
    const perc = percNum/100;
    const valorComissao = parseFloat((valor * perc).toFixed(2));
    const hoje = new Date();
    const mesRef = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}`;
    // ID derivado do pacote → idempotente
    const docId = "COM_" + pacoteId;
    await db.collection("vendas_secretaria").doc(docId).set({
      tipo, tipoVenda, perc: perc*100,
      valorBase: valor, valorComissao,
      pacienteNome, mesRef,
      pacoteId,
      status: "pendente",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // Se não existia → cria com createdAt; se já existia → atualiza sem criar novo
    await db.collection("vendas_secretaria").doc(docId).set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  async function salvarPacote(tipoVenda){
    const {pacienteId,totalSessoes,valorSessao,recorrencia,dataInicio,horario,diasSemana,horariosPorDia,obs}=formPacote;
    if(!pacienteId||!totalSessoes||!dataInicio){alert("Paciente, nº de sessões e data de início obrigatórios.");return;}
    const needDias=["2x por semana","3x por semana"].includes(recorrencia);
    if(needDias&&(!diasSemana||diasSemana.length===0)){alert("Selecione os dias da semana.");return;}
    const eParceria=(formPacote.tipoAtendimento||"particular")==="parceria";
    if(eParceria&&(formPacote.parceirosList||[]).length===0){alert("Adicione ao menos um parceiro para a venda em parceria.");return;}
    setSalvando(true);
    try {
    const pac=pacientes.find(p=>p.id===pacienteId);
    const total=parseInt(totalSessoes)||1;
    const vSessao=parseFloat(valorSessao)||0;
    const vTotal=vSessao*total;
    const datas=gerarDatas(dataInicio,recorrencia,total,diasSemana);
    const parceirosList=eParceria?(formPacote.parceirosList||[]):[];
    // compatibilidade legada: parceiraId/percParceiro mantidos para o primeiro parceiro se existir
    const parcSel=eParceria&&parceirosList.length>0?parceiras.find(p=>p.id===parceirosList[0].parceiraId):null;
    const percParc=0;

    // Cria pacote
    const pacRef=await db.collection("clinica_pacotes").add({
      pacienteId,pacienteNome:pac?.nome||"",totalSessoes:total,valorSessao:vSessao,valorTotal:vTotal,
      recorrencia,dataInicio,horario,diasSemana:diasSemana||[],horariosPorDia:horariosPorDia||{},obs,
      tipoAtendimento:formPacote.tipoAtendimento||"particular",
      parceirosList:eParceria?parceirosList:[],
      parceiraId:eParceria&&parceirosList[0]?parceirosList[0].parceiraId||null:null,
      parceiraNome:eParceria&&parceirosList[0]?parceirosList[0].nome||null:null,
      percParceiro:null,
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

    // Registra comissão da secretária APENAS se o pagamento já entrou no caixa
    // Se pendente, o gatilho será disparado exclusivamente em marcarPacotePago()
    const pagoImediato = (formPacote.statusPag||"pendente") === "recebido";
    if(tipoVenda && pagoImediato) {
      await registrarComissao({ tipo:"Pacote", valor:vTotal, pacienteNome:pac?.nome||"", tipoVenda, pacoteId:pacRef.id });
    }

    // Registra repasses dos parceiros → clinica_lancamentos como despesa
    if(eParceria && parceirosList.length>0){
      const hoje=new Date().toISOString().slice(0,10);
      for(const pr of parceirosList){
        const vRep=pr.tipoValor==="fixo"
          ? parseFloat(pr.valor||0)
          : parseFloat((vTotal*(parseFloat(pr.perc)||0)/100).toFixed(2));
        if(!vRep||vRep<=0) continue;
        const nomeParc=pr.nome||parceiras.find(x=>x.id===pr.parceiraId)?.nome||"Parceiro";
        await db.collection("clinica_lancamentos").add({
          tipo_lancamento:"despesa",
          tipo:`Repasse parceria — ${nomeParc}`,
          descricao:`Repasse ${nomeParc} — ${pac?.nome||""} — pacote ${total} sessões`,
          categoria:"Repasse Parceria",
          valor:vRep,
          data:hoje,
          formaPag:"",
          status:"pendente",
          pacoteId:pacRef.id,
          pacienteNome:pac?.nome||"",
          parceiroNome:nomeParc,
          parceiraId:pr.parceiraId||"",
          obs:`Pacote de ${total} sessões — ${pac?.nome||""}`,
          createdAt:firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // ── E-MAIL AUTOMÁTICO via extensão ext-firestore-send-email ──────
    // Só envia se o paciente tiver e-mail cadastrado
    const emailPaciente = pac?.email || pac?.emailPaciente || "";
    if(emailPaciente) {
      const dataFmtEmail = new Date(dataInicio+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
      await db.collection("nr1map_emails").add({
        to: emailPaciente,
        message: {
          subject: `✅ Seu pacote de sessões foi confirmado — Dra. Lucia Kratz`,
          html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f0ff;margin:0;padding:20px;}
.c{max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;}
.h{background:linear-gradient(135deg,#7B00C4,#5a0090);padding:32px;color:white;text-align:center;}
.b{padding:28px;}.box{background:#f5f0ff;border-radius:12px;padding:18px;border-left:4px solid #7B00C4;margin-bottom:20px;}
.row{display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px;}
.label{color:#6b7280;}.val{font-weight:600;color:#111827;}
.btn{display:inline-block;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;margin:4px;}
.f{background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6;}
</style></head><body><div class="c">
<div class="h"><div style="font-size:28px;margin-bottom:8px">🦋</div>
<h1 style="margin:0;font-size:22px">Dra. Lucia Kratz</h1>
<p style="margin:8px 0 0;opacity:.85;font-size:13px">CRP 09/20590 · Psicóloga Doutora</p></div>
<div class="b">
<p style="font-size:16px;color:#374151;line-height:1.6">Olá, <strong>${pac?.nome||"Paciente"}</strong>! 💜<br><br>
Seu pacote de sessões de psicoterapia foi confirmado com sucesso.</p>
<div class="box"><h3 style="margin:0 0 12px;color:#7B00C4;font-size:14px">📋 Detalhes do pacote</h3>
<div class="row"><span class="label">Início</span><span class="val">${dataFmtEmail}</span></div>
<div class="row"><span class="label">Total de sessões</span><span class="val">${total} sessão(ões)</span></div>
${horario?`<div class="row"><span class="label">Horário</span><span class="val">${horario}</span></div>`:""}
<div class="row"><span class="label">Recorrência</span><span class="val">${recorrencia||"A combinar"}</span></div>
<div class="row"><span class="label">Valor total</span><span class="val">R$ ${vTotal.toFixed(2).replace(".",",")}</span></div>
</div>
<div style="background:#f0fdf4;border-radius:12px;padding:16px;border-left:4px solid #059669;margin-bottom:20px;font-size:13px;color:#065f46;line-height:1.6">
💡 Para reagendar ou tirar dúvidas, entre em contato pelo WhatsApp da clínica.
</div>
<div style="text-align:center;margin:20px 0">
<a href="https://wa.me/5562994644950" class="btn" style="background:#25D366;color:white">💬 WhatsApp da Clínica</a>
<a href="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica" class="btn" style="background:#7B00C4;color:white">🌐 Acessar Portal</a>
</div></div>
<div class="f"><p>Este e-mail foi enviado automaticamente pelo sistema da Dra. Lucia Kratz.</p>
<p>Goiânia, GO · CRP 09/20590</p></div></div></body></html>`
        }
      });
    }
    // ─────────────────────────────────────────────────────────────────

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
      batchSoc.set(db.collection("repasses_parcerias").doc(),{
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

    setModal(false);setFormPacote({pacienteId:"",totalSessoes:"",valorSessao:"",recorrencia:"Semanal (1x/semana)",dataInicio:"",horario:"09:00",diasSemana:[],horariosPorDia:{},statusPag:"pendente",formaPag:"",dataPagamento:"",pagamentosExtras:[],obs:"",tipoAtendimento:"particular",valorSupervisaoSocial:"40",valorEstagiariaSocial:"20",parceiraId:"",percParceiro:"70"});
    alert(`✅ Pacote criado! ${datas.length} sessões geradas na agenda.`);
    } catch(e) {
      console.error("Erro ao criar pacote:", e);
      alert("⚠️ Erro ao criar pacote: "+e.message+"\n\nVerifique se o pacote e as sessões foram criados corretamente na aba Pacotes & Sessões e na Agenda antes de tentar novamente.");
    } finally {
      setSalvando(false);
    }
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
  async function recalcularDatasPacote() {
    if(!modalEditarPacote) return;
    const f = formEdicaoPacote;
    if(!f.dataInicio){alert("Defina a data de início antes de recalcular.");return;}
    if(!confirm("Isso vai REESCREVER as datas de todas as sessões deste pacote a partir da nova data de início, mantendo a recorrência atual.\n\nSessões já realizadas ou pagas também terão a data alterada. Confirma?")) return;
    setSalvandoEdicao(true);
    try {
      const snapSess = await db.collection("clinica_sessoes")
        .where("pacoteId","==",modalEditarPacote.id).get();
      const sessDoPacote = snapSess.docs
        .map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>(a.numSessao||0)-(b.numSessao||0) || (a.data||"").localeCompare(b.data||""));
      const total = sessDoPacote.length || parseInt(f.totalSessoes)||1;
      const diasSemana = modalEditarPacote.diasSemana||[];
      const novasDatas = gerarDatas(f.dataInicio, f.recorrencia, total, diasSemana);
      const batch = db.batch();
      sessDoPacote.forEach((s,idx)=>{
        if(novasDatas[idx]){
          batch.update(db.collection("clinica_sessoes").doc(s.id), {data: novasDatas[idx]});
        }
      });
      await batch.commit();
      alert(`✓ ${novasDatas.length} sessão(ões) realinhada(s) a partir de ${new Date(f.dataInicio+"T00:00:00").toLocaleDateString("pt-BR")}.`);
    } catch(e){
      console.error("Erro recalcularDatasPacote:", e);
      alert("Erro ao recalcular datas: "+e.message);
    }
    setSalvandoEdicao(false);
  }

  async function salvarEdicaoPacote(tipoVenda) {
    if(!modalEditarPacote) return;
    setSalvandoEdicao(true);
    try {
      const f = formEdicaoPacote;
      const jaPago = (f.statusPag||"pendente")==="recebido";
      const eraPendente = (modalEditarPacote.statusPag||"pendente") !== "recebido";
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

      // ── COMISSÃO: só dispara se estava pendente, agora recebido e tipoVenda informado ──
      if(jaPago && eraPendente && tipoVenda) {
        const pacNome = pacientes.find(p=>p.id===modalEditarPacote.pacienteId)?.nome || modalEditarPacote.pacienteNome || "";
        await registrarComissao({
          tipo: "Pacote",
          valor: novoValorTotal,
          pacienteNome: pacNome,
          tipoVenda,
          pacoteId: modalEditarPacote.id,
        });
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
                {formEdicaoPacote.dataInicio!==modalEditarPacote.dataInicio&&(
                  <div style={{marginTop:6,fontSize:11,color:"#d97706",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"6px 10px",lineHeight:1.5}}>
                    ⚠️ Mudar a data de início <strong>não move</strong> as sessões já criadas — elas continuam nas datas originais. Use o botão abaixo se quiser realinhar todas as sessões a partir desta nova data.
                    <button type="button" onClick={recalcularDatasPacote} disabled={salvandoEdicao}
                      style={{display:"block",marginTop:8,background:"#f59e0b",color:"white",border:"none",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                      🔄 Recalcular datas das sessões
                    </button>
                  </div>
                )}
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
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:20,flexWrap:"wrap"}}>
              <button className="btn btn-ghost" onClick={()=>setModalEditarPacote(null)}>Cancelar</button>
              {(formEdicaoPacote.statusPag||"pendente")==="recebido" && (modalEditarPacote.statusPag||"pendente")!=="recebido" ? (<>
                <button className="btn btn-ghost" style={{border:"1px solid #e5e7eb",color:"#6b7280",fontSize:13}} onClick={()=>salvarEdicaoPacote(null)} disabled={salvandoEdicao} title="Salvar sem registrar comissão">
                  {salvandoEdicao?"Salvando...":"📋 Sem comissão"}
                </button>
                <button className="btn btn-purple" onClick={()=>salvarEdicaoPacote("primeira")} disabled={salvandoEdicao} title="10% de comissão">
                  {salvandoEdicao?"Salvando...":"✨ Primeira Venda"}
                </button>
                <button className="btn" style={{background:"#0891b2",color:"white"}} onClick={()=>salvarEdicaoPacote("recorrente")} disabled={salvandoEdicao} title="5% de comissão">
                  {salvandoEdicao?"Salvando...":"🔄 Venda Recorrente"}
                </button>
              </>) : (
                <button className="btn btn-purple" onClick={()=>salvarEdicaoPacote(null)} disabled={salvandoEdicao}>
                  {salvandoEdicao?"Salvando...":"💾 Salvar alterações"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="page-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div className="page-title">Financeiro da Clínica</div>
          <div className="page-subtitle">Lançamentos, pacotes e controle de sessões</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn btn-ghost" style={{color:"#dc2626",border:"1px solid #fca5a5",display:"flex",alignItems:"center",gap:6}}
            onClick={()=>{setModalDespesa(true);setEditandoDespesa(null);setFormDespesa({descricao:"",categoria:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"});}}>
            <Icon name="minus-circle" size={16}/> Nova Despesa
          </button>
          <button className="btn btn-purple" style={{display:"flex",alignItems:"center",gap:6}} onClick={()=>setModal("escolha")}><Icon name="plus" size={16}/> Novo Lançamento</button>
        </div>
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
        {[["lancamentos","Lançamentos","dollar-sign"],["pacotes","Pacotes & Sessões","package"],["acompanhamento","Acompanhamento Geral","users"],["comissoes","Comissões","percent"]].map(([id,lbl,ic])=>(
          <button key={id} onClick={()=>setAba(id)} style={{padding:"10px 20px",border:"none",background:"none",cursor:"pointer",fontSize:14,color:aba===id?"var(--purple)":"var(--gray-600)",borderBottom:aba===id?"2px solid var(--purple)":"2px solid transparent",fontWeight:aba===id?600:400,fontFamily:"var(--font-body)",marginBottom:-1,display:"flex",alignItems:"center",gap:6}}>
            <Icon name={ic} size={15}/>{lbl}
          </button>
        ))}
        {/* Botão de higienização — Etapa 1 */}

        {(()=>{ return null; })()}
      </div>

      {/* ABA LANÇAMENTOS */}
      {aba==="lancamentos"&&(
        <div>
          {/* Tabs filtro tipo — Tudo / Receitas / Despesas */}
      {aba==="lancamentos"&&(
        <div style={{display:"flex",gap:6,marginBottom:16,background:"var(--gray-50)",padding:6,borderRadius:12,width:"fit-content"}}>
          {[["tudo","📊 Tudo"],["receita","💰 Receitas"],["despesa","💸 Despesas"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFiltroTipo(v)}
              style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"var(--font-body)",fontSize:13,fontWeight:600,
                background:filtroTipo===v?"white":"transparent",
                color:filtroTipo===v?(v==="receita"?"#059669":v==="despesa"?"#dc2626":"#7B00C4"):"#6b7280",
                boxShadow:filtroTipo===v?"0 1px 4px rgba(0,0,0,.1)":"none",transition:".15s"}}>
              {l}
            </button>
          ))}
        </div>
      )}

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
            const receitasTodas = lancMes.filter(l=>l.tipo_lancamento!=="despesa").sort((a,b)=>(b.data||"").localeCompare(a.data||""));
            const despesasTodas = lancMes.filter(l=>l.tipo_lancamento==="despesa").sort((a,b)=>(b.data||"").localeCompare(a.data||""));
            const receitas = filtroTipo==="despesa" ? [] : receitasTodas;
            const despesas = filtroTipo==="receita" ? [] : despesasTodas;
            const totalRecFiltro = receitasTodas.reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
            const totalDespFiltro = despesasTodas.reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
            const totalRec = calcReceitas(lancMes);
            const totalDesp = calcDespesas(lancMes);
            const saldo = totalRec - totalDesp;

            // Cards de saldo dinâmicos por filtroTipo
            const cardsSaldo = filtroTipo==="tudo" ? (
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
                <div style={{background:"white",borderRadius:12,padding:"14px 18px",border:"1px solid #e5e7eb"}}>
                  <div style={{fontSize:11,color:"#6b7280",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Total Receitas</div>
                  <div style={{fontSize:20,fontWeight:800,color:"#059669"}}>{totalRecFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                </div>
                <div style={{background:"white",borderRadius:12,padding:"14px 18px",border:"1px solid #e5e7eb"}}>
                  <div style={{fontSize:11,color:"#6b7280",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Total Despesas</div>
                  <div style={{fontSize:20,fontWeight:800,color:"#dc2626"}}>{totalDespFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
                </div>
                <div style={{background:"#f5f0ff",borderRadius:12,padding:"14px 18px",border:"2px solid #7B00C4"}}>
                  <div style={{fontSize:11,color:"#7B00C4",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Saldo Líquido</div>
                  <div style={{fontSize:20,fontWeight:800,color:totalRecFiltro-totalDespFiltro>=0?"#7B00C4":"#dc2626"}}>
                    {(totalRecFiltro-totalDespFiltro).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
                  </div>
                </div>
              </div>
            ) : filtroTipo==="receita" ? (
              <div style={{background:"#f0fdf4",borderRadius:12,padding:"14px 18px",border:"1px solid #6ee7b7",marginBottom:16}}>
                <div style={{fontSize:11,color:"#15803d",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Total Receitas do Mês</div>
                <div style={{fontSize:24,fontWeight:800,color:"#059669"}}>{totalRecFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
              </div>
            ) : (
              <div style={{background:"#fef2f2",borderRadius:12,padding:"14px 18px",border:"1px solid #fca5a5",marginBottom:16}}>
                <div style={{fontSize:11,color:"#b91c1c",fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Total Despesas do Mês</div>
                <div style={{fontSize:24,fontWeight:800,color:"#dc2626"}}>{totalDespFiltro.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
              </div>
            );

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
                              <div style={{display:"flex",gap:4}}>
                                {l.tipo_lancamento==="pacote"?(
                                  <button className="btn btn-ghost" style={{padding:"4px 8px",fontSize:11,color:"var(--purple)"}} onClick={()=>{setPacoteSelecionado(l.pacoteId);setAba("pacotes");}}>
                                    <Icon name="clipboard-list" size={12}/>
                                  </button>
                                ):(
                                  <button className="btn btn-ghost" style={{padding:"4px 8px",fontSize:11,color:"var(--purple)"}} onClick={()=>abrirEditar(l)}>
                                    <Icon name="pencil" size={12}/>
                                  </button>
                                )}
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
                {cardsSaldo}
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
                    if(!modalExcluirLanc.pacoteId){alert("Este lançamento não tem pacote vinculado — use 'Só este lançamento'.");return;}
                    if(!confirm("Excluir este e todos os lançamentos futuros deste pacote?"))return;
                    const snap = await db.collection("clinica_lancamentos").get();
                    const futuros = snap.docs.filter(d=>{
                      const dd=d.data();
                      return dd.pacoteId===modalExcluirLanc.pacoteId && dd.data>=modalExcluirLanc.data;
                    });
                    const b=db.batch();futuros.forEach(d=>b.delete(d.ref));await b.commit();
                    setModalExcluirLanc(null);
                  }}>
                    <div style={{fontWeight:600,fontSize:13,color:"#d97706"}}>Este e todos os futuros</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>Remove lançamentos deste pacote a partir de {new Date(modalExcluirLanc.data+"T00:00:00").toLocaleDateString("pt-BR",{month:"long"})}</div>
                  </button>
                  <button className="btn btn-ghost" style={{border:"1.5px solid #fca5a5",textAlign:"left",padding:"12px 16px"}} onClick={async()=>{
                    if(!modalExcluirLanc.pacoteId){alert("Este lançamento não tem pacote vinculado — use 'Só este lançamento'.");return;}
                    if(!confirm("Excluir TODOS os lançamentos deste pacote no ano inteiro?"))return;
                    const snap = await db.collection("clinica_lancamentos").get();
                    const todos = snap.docs.filter(d=>d.data().pacoteId===modalExcluirLanc.pacoteId);
                    const b=db.batch();todos.forEach(d=>b.delete(d.ref));await b.commit();
                    setModalExcluirLanc(null);
                  }}>
                    <div style={{fontWeight:600,fontSize:13,color:"#dc2626"}}>Todos — o ano inteiro</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>Remove todos os lançamentos deste pacote</div>
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
          {(()=>{
            const hoje = new Date().toISOString().slice(0,10);
            // Sessões pendentes = data PASSADA + status "agendado" + vinculada a pacote ativo
            // Exclui: falta, realizado, cancelado, remarcado, futuras, sessões sem pacote
            const pacoteIdsAtivos = new Set(pacotes.filter(p=>p.status!=="inativo").map(p=>p.id));
            const sessoesPendentes = sessoes.filter(s=>
              s.data < hoje &&
              s.status === "agendado" &&
              s.pacienteId &&
              s.pacoteId &&
              pacoteIdsAtivos.has(s.pacoteId)
            );
            // Pacotes com pagamento pendente (não 100% pago)
            const pacotesPendPag = pacotes.filter(p=>{
              const sessPac = sessoes.filter(s=>s.pacoteId===p.id);
              const pagas = sessPac.filter(s=>s.pagamento==="pago").length;
              return p.status !== "inativo" && pagas < (p.totalSessoes||0);
            });
            if(sessoesPendentes.length===0 && pacotesPendPag.length===0) return null;
            return (
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
                {sessoesPendentes.length>0&&(()=>{
                  function AvisoSessoes({lista, pacientes}){
                    const [expandido, setExpandido] = React.useState(false);
                    const visiveis = expandido ? lista : lista.slice(0,5);
                    const extras = lista.length - 5;
                    return (
                      <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:12,padding:"14px 18px"}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#92400e",marginBottom:4}}>⚠️ {lista.length} sessão(ões) passada(s) sem status final</div>
                        <div style={{fontSize:12,color:"#78350f",marginBottom:8}}>
                          Sessões que já ocorreram e ainda estão como "Agendado". Marque como <strong>Realizada</strong>, <strong>Cancelada</strong> ou <strong>Remarcada</strong>.
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
                          {visiveis.map(s=>{
                            const nome = pacientes.find(p=>p.id===s.pacienteId)?.nome||"—";
                            return (
                              <span key={s.id} style={{background:"#fde68a",borderRadius:20,padding:"2px 10px",fontSize:11,color:"#78350f",fontWeight:600}}>
                                {nome.split(" ")[0]} · {new Date(s.data+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}
                              </span>
                            );
                          })}
                          {!expandido && extras>0&&(
                            <button onClick={()=>setExpandido(true)}
                              style={{background:"#f59e0b",color:"white",border:"none",borderRadius:20,padding:"2px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                              +{extras} mais ▾
                            </button>
                          )}
                          {expandido&&(
                            <button onClick={()=>setExpandido(false)}
                              style={{background:"none",color:"#92400e",border:"1px solid #f59e0b",borderRadius:20,padding:"2px 10px",fontSize:11,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                              ▴ recolher
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return <AvisoSessoes lista={sessoesPendentes} pacientes={pacientes}/>;
                })()}
                {pacotesPendPag.length>0&&(()=>{
                  function AvisoPacotes({lista, pacientes, sessoes}){
                    const [expandidoPac, setExpandidoPac] = React.useState(false);
                    const visiveis = expandidoPac ? lista : lista.slice(0,5);
                    const extras = lista.length - 5;
                    return (
                      <div style={{background:"#fff7ed",border:"1px solid #fb923c",borderRadius:12,padding:"14px 18px"}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#c2410c",marginBottom:4}}>💰 {lista.length} pacote(s) com pagamento em aberto</div>
                        <div style={{fontSize:12,color:"#9a3412",marginBottom:8}}>
                          Pacotes ativos com sessões ainda não marcadas como pagas.
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
                          {visiveis.map(p=>{
                          const nome = pacientes.find(pac=>pac.id===p.pacienteId)?.nome||"—";
                          const sessPac = sessoes.filter(s=>s.pacoteId===p.id);
                          const pagas = sessPac.filter(s=>s.pagamento==="pago").length;
                          const total = p.totalSessoes||0;
                          return (
                            <span key={p.id} style={{background:"#fed7aa",borderRadius:20,padding:"2px 10px",fontSize:11,color:"#9a3412",fontWeight:600}}>
                              {nome.split(" ")[0]} · {pagas}/{total} pagas
                            </span>
                          );
                        })}
                        {!expandidoPac && pacotesPendPag.length>5&&(
                          <button onClick={()=>setExpandidoPac(true)}
                            style={{background:"#ea580c",color:"white",border:"none",borderRadius:20,padding:"2px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                            +{pacotesPendPag.length-5} mais ▾
                          </button>
                        )}
                        {expandidoPac&&(
                          <button onClick={()=>setExpandidoPac(false)}
                            style={{background:"none",color:"#c2410c",border:"1px solid #fb923c",borderRadius:20,padding:"2px 10px",fontSize:11,cursor:"pointer",fontFamily:"var(--font-body)"}}>
                            ▴ recolher
                          </button>
                        )}
                        </div>
                      </div>
                    );
                  }
                  return <AvisoPacotes lista={pacotesPendPag} pacientes={pacientes} sessoes={sessoes}/>;
                })()}
              </div>
            );
          })()}

          {pacotes.length===0?(
            <div className="card" style={{textAlign:"center",padding:60}}>
              <Icon name="package" size={48}/>
              <div style={{marginTop:12,fontWeight:500}}>Nenhum pacote criado ainda</div>
              <button className="btn btn-purple" style={{marginTop:16}} onClick={()=>setModal("pacote")}>+ Criar Pacote</button>
            </div>
          ):(()=>{
            // Agrupar pacotes por paciente — ordem alfabética
            const pacientesComPacote = [...new Set(pacotes.map(p=>p.pacienteId))];
            const pacientesVisiveisBruto = buscaPac.trim()
              ? pacientesComPacote.filter(id=>{
                  const pac = pacientes.find(p=>p.id===id);
                  const inicial = (pac?.nome||"?")[0].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
                  return inicial === buscaPac;
                })
              : pacientesComPacote;
            const pacientesVisiveis = pacientesVisiveisBruto.sort((a,b)=>{
              const nA = (pacientes.find(p=>p.id===a)?.nome||"").toLowerCase();
              const nB = (pacientes.find(p=>p.id===b)?.nome||"").toLowerCase();
              return nA.localeCompare(nB,"pt-BR");
            });
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
                    const da = a.dataInicio||a.createdAt?.toDate?.()?.toISOString?.()?.slice(0,10)||"";
                    const db2 = b.dataInicio||b.createdAt?.toDate?.()?.toISOString?.()?.slice(0,10)||"";
                    return db2.localeCompare(da);
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
                                <button className="btn btn-ghost" style={{fontSize:12,padding:"6px 12px",color:"#059669",border:"1px solid #6ee7b7"}}
                                  onClick={e=>{e.stopPropagation();
                                    const pac = pacientes.find(x=>x.id===pacId);
                                    const sessPac = sessoes.filter(s=>s.pacoteId===p.id).sort((a,b)=>(a.data||"").localeCompare(b.data||""));
                                    const statusLabel = {agendado:"Agendado",confirmado:"Confirmado",realizado:"✓ Realizado",cancelado:"Cancelado",falta:"Falta"};
                                    const statusColor = {agendado:"#7B00C4",confirmado:"#059669",realizado:"#0891b2",cancelado:"#dc2626",falta:"#d97706"};
                                    const totalValor = sessPac.reduce((a,s)=>a+(parseFloat(s.valorSessao)||0),0);
                                    const totalPago = sessPac.reduce((a,s)=>a+(parseFloat(s.valorPago)||0),0);
                                    const sessMeses = {};
                                    sessPac.forEach(s=>{ const m=(s.data||"").slice(0,7); if(!sessMeses[m])sessMeses[m]=[]; sessMeses[m].push(s); });
                                    const fmtM = m=>{ const [y,mo]=m.split("-"); return new Date(y,mo-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}); };
                                    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Resumo — ${pac?.nome||""}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;padding:32px;max-width:680px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:3px solid #7B00C4;margin-bottom:22px}
.logo{font-family:Georgia,serif;font-size:24px;color:#7B00C4;font-weight:700}.sub{font-size:10px;color:#6b7280;margin-top:3px}
.box{background:#f5f0ff;border-radius:12px;padding:14px 18px;margin-bottom:20px;border-left:5px solid #7B00C4}
.nome{font-size:20px;font-weight:700;margin-bottom:8px}.meta{display:flex;gap:20px;flex-wrap:wrap}
.mi label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;display:block;margin-bottom:1px}.mi span{font-size:13px;font-weight:600}
.mes{font-size:13px;font-weight:700;color:#7B00C4;padding:7px 0;border-bottom:1px solid #e5e7eb;margin:18px 0 8px}
table{width:100%;border-collapse:collapse;font-size:12px}th{background:#7B00C4;color:white;padding:6px 10px;text-align:left;font-size:11px}
td{padding:6px 10px;border-bottom:1px solid #f3f4f6}tr:nth-child(even) td{background:#fafafa}
.badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;color:white;display:inline-block}
.totais{margin-top:20px;background:#f9fafb;border-radius:10px;padding:12px 18px;display:flex;gap:24px;flex-wrap:wrap}
.ti label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;display:block}.ti span{font-size:17px;font-weight:800}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
@media print{body{padding:16px}@page{margin:1.5cm}}</style></head><body>
<div class="header"><div><div class="logo">Dra. Lucia Kratz</div><div class="sub">CRP 09/20590 · Psicóloga · TCC · Musicoterapeuta · Neuromodulação · Goiânia, GO</div></div>
<div style="font-size:11px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})}</div></div>
<div class="box"><div class="nome">${pac?.nome||"—"}</div>
<div class="meta">
<div class="mi"><label>Início</label><span>${p.dataInicio?new Date(p.dataInicio+"T00:00:00").toLocaleDateString("pt-BR"):"—"}</span></div>
<div class="mi"><label>Horário</label><span>${p.horario||"—"}</span></div>
<div class="mi"><label>Recorrência</label><span>${p.recorrencia||"—"}</span></div>
<div class="mi"><label>Sessões</label><span>${sessPac.length}</span></div>
</div></div>
${Object.entries(sessMeses).sort(([a],[b])=>a.localeCompare(b)).map(([mes,sess])=>`
<div class="mes">${fmtM(mes).charAt(0).toUpperCase()+fmtM(mes).slice(1)} — ${sess.length} sessão(ões)</div>
<table><thead><tr><th>Nº</th><th>Data</th><th>Horário</th><th>Tipo</th><th>Presença</th><th>Valor</th></tr></thead>
<tbody>${sess.map((s,i)=>`<tr><td style="font-weight:700;color:#7B00C4">${s.numSessao||i+1}</td>
<td>${s.data?new Date(s.data+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"}):""}</td>
<td>${s.hora||"—"}</td><td>${s.tipo||"Psicoterapia"}</td>
<td><span class="badge" style="background:${statusColor[s.status]||"#7B00C4"}">${statusLabel[s.status]||s.status||"—"}</span></td>
<td>R$ ${(parseFloat(s.valorSessao)||0).toFixed(2).replace(".",",")}</td></tr>`).join("")}
</tbody></table>`).join("")}
<div class="totais">
<div class="ti"><label>Total do pacote</label><span>R$ ${totalValor.toFixed(2).replace(".",",")}</span></div>
<div class="ti"><label>Recebido</label><span style="color:#059669">R$ ${totalPago.toFixed(2).replace(".",",")}</span></div>
<div class="ti"><label>A receber</label><span style="color:#d97706">R$ ${(totalValor-totalPago).toFixed(2).replace(".",",")}</span></div>
</div>
${(p.dataPagamento||p.dataRecebimento)?`<div style="margin-top:14px;background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:12px 18px;display:flex;align-items:center;gap:12px"><span style="font-size:18px">✅</span><div><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#065f46;letter-spacing:.5px">Data de Pagamento</div><div style="font-size:16px;font-weight:800;color:#059669">${new Date((p.dataPagamento||p.dataRecebimento)+"T00:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</div></div></div>`:""}
${sessPac.some(s=>s.dataPagamento||s.dataRecebimento)?`<div style="margin-top:10px;font-size:11px;color:#6b7280;font-weight:600">Pagamentos por sessão:</div><table style="margin-top:4px;font-size:11px"><tbody>${sessPac.filter(s=>s.dataPagamento||s.dataRecebimento).map(s=>`<tr><td style="padding:3px 10px 3px 0;color:#374151">Sessão ${s.numSessao||""} — ${s.data?new Date(s.data+"T12:00:00").toLocaleDateString("pt-BR"):""}:</td><td style="color:#059669;font-weight:700">pago em ${new Date((s.dataPagamento||s.dataRecebimento)+"T00:00:00").toLocaleDateString("pt-BR")}</td></tr>`).join("")}</tbody></table>`:""}
<div class="footer">Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
                                    const w=window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),800);
                                  }}>
                                  <Icon name="file-text" size={13}/> PDF
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

      {/* ABA COMISSÕES — embutida no Fin. Clínica para a psicóloga */}
      {aba==="comissoes"&&(
        <Comissoes user={user}/>
      )}

      {/* MODAL ESCOLHA */}
      {/* MODAL NOVA DESPESA */}
      {modalDespesa&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModalDespesa(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>{editandoDespesa?"Editar":"Nova"} Despesa — Clínica</div>
              <button onClick={()=>setModalDespesa(false)} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={formDespesa.categoria} onChange={e=>setFormDespesa({...formDespesa,categoria:e.target.value})}>
                  <option value="">Selecionar...</option>
                  {CATS_DESPESA_CLINICA.map(cat=><option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input className="form-input" value={formDespesa.descricao} onChange={e=>setFormDespesa({...formDespesa,descricao:e.target.value})} placeholder="Ex: Equipamento Neurofeedback"/>
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input className="form-input" type="number" value={formDespesa.valor} onChange={e=>setFormDespesa({...formDespesa,valor:e.target.value})} placeholder="0,00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input className="form-input" type="date" value={formDespesa.data} onChange={e=>setFormDespesa({...formDespesa,data:e.target.value})}/>
              </div>
              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <select className="form-input" value={formDespesa.formaPag} onChange={e=>setFormDespesa({...formDespesa,formaPag:e.target.value})}>
                  {FORMAS_PAG_CLINICA.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
              {!editandoDespesa&&(
                <div className="form-group">
                  <label className="form-label">Parcelas</label>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input className="form-input" type="number" min="1" max="60" value={formDespesa.parcelas} onChange={e=>setFormDespesa({...formDespesa,parcelas:e.target.value})} style={{width:80}}/>
                    <span style={{fontSize:12,color:"var(--text-muted)"}}>= <strong style={{color:"var(--purple)"}}>R$ {((parseFloat(formDespesa.valor)||0)*(parseInt(formDespesa.parcelas)||1)).toFixed(2).replace(".",",")}</strong></span>
                  </div>
                </div>
              )}
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Status</label>
                <div style={{display:"flex",gap:8}}>
                  {[["pago","✓ Pago","#059669"],["pendente","Pendente","#d97706"]].map(([v,l,cor])=>(
                    <button key={v} type="button" onClick={()=>setFormDespesa({...formDespesa,status:v})}
                      style={{flex:1,padding:10,borderRadius:10,border:"1.5px solid",borderColor:formDespesa.status===v?cor:"#e5e7eb",background:formDespesa.status===v?cor+"15":"white",color:formDespesa.status===v?cor:"#6b7280",fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{gridColumn:"1/-1"}}>
                <label className="form-label">Observações</label>
                <input className="form-input" value={formDespesa.obs||""} onChange={e=>setFormDespesa({...formDespesa,obs:e.target.value})} placeholder="Opcional..."/>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
              <button className="btn btn-ghost" onClick={()=>setModalDespesa(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvarDespesaClinica} disabled={salvando}>{salvando?"Salvando...":editandoDespesa?"Salvar":"Lançar"}</button>
            </div>
          </div>
        </div>
      )}

      {modal==="escolha"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:32,width:"100%",maxWidth:420,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:8}}>Novo Lançamento</div>
            <p style={{fontSize:13,color:"#6b7280",marginBottom:24}}>Selecione o tipo:</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button className="btn btn-outline" style={{width:"100%",padding:"20px 20px",fontSize:13,display:"flex",alignItems:"center",gap:16,textAlign:"left"}}
                onClick={()=>setModal("pacote")}>
                <span style={{fontSize:32,flexShrink:0}}>📦</span>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"var(--purple)"}}>Pacote de Sessões</div>
                  <div style={{fontSize:11,color:"#6b7280",lineHeight:1.5,marginTop:2}}>Gera sessões recorrentes na agenda com ficha de frequência, controle de pagamento e formas mistas</div>
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
              {editando&&(
                <button className="btn btn-ghost" style={{border:"1px solid #fecaca",color:"#dc2626",fontSize:12}}
                  title="Este lançamento é uma despesa, não uma receita"
                  onClick={()=>{
                    setFormDespesaEdit({
                      descricao: formAvulso.descricao||formAvulso.tipo||"",
                      categoria: formAvulso.categoria||"",
                      valor:     formAvulso.valor+"",
                      data:      formAvulso.data||"",
                      formaPag:  formAvulso.formaPag||"",
                      status:    formAvulso.status==="recebido"?"pago":(formAvulso.status||"pago"),
                      obs:       formAvulso.obs||"",
                    });
                    setModal("editar-despesa");
                  }}>
                  🔁 Marcar como Despesa
                </button>
              )}
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
                {/* Toggle Particular / Social / Parceria */}
                <div className="form-group" style={{gridColumn:"1/-1"}}>
                  <label className="form-label">Tipo de Atendimento</label>
                  <div style={{display:"flex",gap:8}}>
                    {[["particular","🏥 Particular"],["social","🌱 Social"],["parceria","🤝 Parceria"]].map(([v,l])=>(
                      <button key={v} type="button" onClick={()=>setFormPacote({...formPacote,tipoAtendimento:v,
                        valorSessao:v==="social"?"":formPacote.valorSessao,
                        valorSupervisaoSocial:v==="social"?"40":formPacote.valorSupervisaoSocial,
                        valorEstagiariaSocial:v==="social"?"20":formPacote.valorEstagiariaSocial,
                        percParceiro:v==="parceria"?(formPacote.percParceiro||"70"):formPacote.percParceiro})}
                        style={{flex:1,padding:"9px",borderRadius:8,border:"2px solid",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,
                          borderColor:(formPacote.tipoAtendimento||"particular")===v?
                            (v==="social"?"#0d9488":v==="parceria"?"#b45309":"#7B00C4"):"#e5e7eb",
                          background:(formPacote.tipoAtendimento||"particular")===v?
                            (v==="social"?"#ccfbf1":v==="parceria"?"#fef3c7":"#f5f3ff"):"white",
                          color:(formPacote.tipoAtendimento||"particular")===v?
                            (v==="social"?"#0d9488":v==="parceria"?"#b45309":"#7B00C4"):"#6b7280"}}>
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
                    {(formPacote.tipoAtendimento||"particular")==="parceria"&&(()=>{
                      const tot=(parseFloat(formPacote.valorSessao)||0)*(parseInt(formPacote.totalSessoes)||0);
                      const parceiros=formPacote.parceirosList||[];
                      const totalRepasses=parceiros.reduce((a,p)=>{
                        const v=p.tipoValor==="fixo"?(parseFloat(p.valor)||0):(tot*(parseFloat(p.perc)||0)/100);
                        return a+v;
                      },0);
                      const liquidoClinica=tot-totalRepasses;
                      return(
                        <div style={{gridColumn:"1/-1"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                            <label className="form-label" style={{margin:0}}>🤝 Parceiros e Repasses</label>
                            <button type="button" style={{fontSize:12,color:"#b45309",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontWeight:600}}
                              onClick={()=>setFormPacote({...formPacote,parceirosList:[...(formPacote.parceirosList||[]),{nome:"",parceiraId:"",tipoValor:"fixo",valor:"",perc:""}]})}>
                              + Adicionar parceiro
                            </button>
                          </div>
                          {parceiros.length===0&&(
                            <div style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic",padding:"6px 0"}}>Clique em "+ Adicionar parceiro" para registrar cada pessoa e seu repasse.</div>
                          )}
                          {parceiros.map((p,i)=>{
                            const vCalc=p.tipoValor==="fixo"?(parseFloat(p.valor)||0):(tot*(parseFloat(p.perc)||0)/100);
                            return(
                              <div key={i} style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginBottom:8,alignItems:"center"}}>
                                  <div>
                                    <select className="form-input" style={{fontSize:12,marginBottom:4}} value={p.parceiraId||""}
                                      onChange={e=>{
                                        const pc=parceiras.find(x=>x.id===e.target.value);
                                        const lista=[...(formPacote.parceirosList||[])];
                                        lista[i]={...lista[i],parceiraId:e.target.value,nome:pc?.nome||lista[i].nome,perc:pc?.percentual?String(pc.percentual):lista[i].perc};
                                        setFormPacote({...formPacote,parceirosList:lista});
                                      }}>
                                      <option value="">— Do cadastro (opcional) —</option>
                                      {parceiras.map(pc=><option key={pc.id} value={pc.id}>{pc.nome}</option>)}
                                    </select>
                                    <input className="form-input" style={{fontSize:12}} placeholder="Nome do parceiro" value={p.nome||""}
                                      onChange={e=>{const lista=[...(formPacote.parceirosList||[])];lista[i]={...lista[i],nome:e.target.value};setFormPacote({...formPacote,parceirosList:lista});}}/>
                                  </div>
                                  <button type="button" style={{color:"#dc2626",background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"0 4px"}}
                                    onClick={()=>{const lista=[...(formPacote.parceirosList||[])];lista.splice(i,1);setFormPacote({...formPacote,parceirosList:lista});}}>✕</button>
                                </div>
                                <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:8,alignItems:"center"}}>
                                  <div style={{display:"flex",gap:4}}>
                                    {[["fixo","R$ fixo"],["perc","% do total"]].map(([tv,tl])=>(
                                      <button key={tv} type="button"
                                        onClick={()=>{const lista=[...(formPacote.parceirosList||[])];lista[i]={...lista[i],tipoValor:tv};setFormPacote({...formPacote,parceirosList:lista});}}
                                        style={{padding:"5px 10px",borderRadius:6,border:"1.5px solid",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"var(--font-body)",
                                          borderColor:p.tipoValor===tv?"#b45309":"#e5e7eb",background:p.tipoValor===tv?"#fffbeb":"white",color:p.tipoValor===tv?"#b45309":"#6b7280"}}>
                                        {tl}
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                                    {p.tipoValor==="fixo"?(
                                      <input className="form-input" style={{fontSize:12}} type="number" placeholder="Valor R$" value={p.valor||""}
                                        onChange={e=>{const lista=[...(formPacote.parceirosList||[])];lista[i]={...lista[i],valor:e.target.value};setFormPacote({...formPacote,parceirosList:lista});}}/>
                                    ):(
                                      <input className="form-input" style={{fontSize:12}} type="number" placeholder="%" min="0" max="100" value={p.perc||""}
                                        onChange={e=>{const lista=[...(formPacote.parceirosList||[])];lista[i]={...lista[i],perc:e.target.value};setFormPacote({...formPacote,parceirosList:lista});}}/>
                                    )}
                                    {vCalc>0&&<span style={{fontSize:12,color:"#b45309",fontWeight:700,whiteSpace:"nowrap"}}>= R$ {vCalc.toFixed(2).replace(".",",")}</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {tot>0&&parceiros.length>0&&(
                            <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"10px 14px",fontSize:13,marginTop:4}}>
                              <div style={{display:"flex",flexWrap:"wrap",gap:"6px 20px"}}>
                                <span>💰 Total recebido: <strong>R$ {tot.toFixed(2).replace(".",",")}</strong></span>
                                <span style={{color:"#b45309"}}>↗ Total repasses: <strong>R$ {totalRepasses.toFixed(2).replace(".",",")}</strong></span>
                                <span style={{color:"#059669"}}>🏥 Líquido clínica: <strong>R$ {liquidoClinica.toFixed(2).replace(".",",")}</strong></span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
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

// ───────────────────────────────────────────────────────────
// PAINEL GERAL — Dashboard consolidado (Pessoal + Clínica, todos os CCs)
// ───────────────────────────────────────────────────────────
function PainelGeral({ lancamentos, lancClinica, anoFiltro, setAnoFiltro, anos, fmt, mesLabel }){
  const CORES_CC = {
    "🏥 Clínica":"#7B00C4","🎵 Ônix Brasil":"#0891b2","🎶 Flamboyant":"#db2777",
    "⭐ Estrelas":"#d97706","🌱 Projetos Culturais":"#059669","📚 Consultorias & Cursos":"#2563eb",
    "🏢 Administrativo":"#6b7280","🏠 Pessoal":"#dc2626","—":"#9ca3af"
  };
  const CORES_CAT = ["#7B00C4","#0891b2","#db2777","#d97706","#059669","#2563eb","#dc2626","#6b7280","#9333ea","#16a34a","#ea580c","#0284c7"];

  // Normaliza lançamentos de ambas as origens em um formato único
  const normPessoal = lancamentos.map(l=>({
    tipo: l.tipo==="receita"?"receita":"despesa",
    valor: parseFloat(l.valor)||0,
    data: l.data||"",
    categoria: l.categoria||"Outros",
    centroCusto: l.centroCusto||"🏠 Pessoal",
    status: l.status||"pago",
  }));
  const normClinica = lancClinica.map(l=>({
    tipo: (l.tipo_lancamento==="despesa"||l.tipo==="despesa")?"despesa":"receita",
    valor: parseFloat(l.valor)||0,
    data: l.data||"",
    categoria: l.categoria||l.tipo||"Outros",
    centroCusto: l.centroCusto||"🏥 Clínica",
    status: l.status||"pago",
  }));
  const todos = [...normPessoal, ...normClinica];

  const pagos = t=>t.status==="pago"||t.status==="recebido";
  const doAno = todos.filter(l=>l.data?.startsWith(anoFiltro) && pagos(l));

  // Resumo por Centro de Custo
  const ccMap = {};
  doAno.forEach(l=>{
    const cc = l.centroCusto||"—";
    if(!ccMap[cc]) ccMap[cc]={receita:0,despesa:0};
    ccMap[cc][l.tipo] += l.valor;
  });
  const ccs = Object.entries(ccMap).map(([cc,v])=>({cc,...v,saldo:v.receita-v.despesa}))
    .sort((a,b)=>b.despesa-a.despesa);

  const totalReceita = doAno.filter(l=>l.tipo==="receita").reduce((a,l)=>a+l.valor,0);
  const totalDespesa = doAno.filter(l=>l.tipo==="despesa").reduce((a,l)=>a+l.valor,0);
  const saldoConsolidado = totalReceita-totalDespesa;
  const margem = totalReceita>0 ? (saldoConsolidado/totalReceita*100) : 0;

  // Comparativo com mês anterior
  const hoje = new Date();
  const mesAtualStr = hoje.toISOString().slice(0,7);
  const mesAnteriorDate = new Date(hoje.getFullYear(), hoje.getMonth()-1, 1);
  const mesAnteriorStr = mesAnteriorDate.toISOString().slice(0,7);
  const saldoMesAtual = (()=>{ const l=todos.filter(x=>x.data?.startsWith(mesAtualStr)&&pagos(x)); return l.filter(x=>x.tipo==="receita").reduce((a,x)=>a+x.valor,0) - l.filter(x=>x.tipo==="despesa").reduce((a,x)=>a+x.valor,0); })();
  const saldoMesAnterior = (()=>{ const l=todos.filter(x=>x.data?.startsWith(mesAnteriorStr)&&pagos(x)); return l.filter(x=>x.tipo==="receita").reduce((a,x)=>a+x.valor,0) - l.filter(x=>x.tipo==="despesa").reduce((a,x)=>a+x.valor,0); })();
  const variacaoMes = saldoMesAnterior!==0 ? ((saldoMesAtual-saldoMesAnterior)/Math.abs(saldoMesAnterior)*100) : (saldoMesAtual>0?100:0);

  // Despesas pendentes
  const pendentes = todos.filter(l=>l.status==="pendente"&&l.data?.startsWith(anoFiltro));
  const totalPendente = pendentes.reduce((a,l)=>a+l.valor,0);

  // Top 5 maiores despesas do mês atual
  const despesasMesAtual = todos.filter(l=>l.tipo==="despesa"&&l.data?.startsWith(mesAtualStr)&&pagos(l)).sort((a,b)=>b.valor-a.valor).slice(0,5);

  // Evolução últimos 12 meses (saldo total)
  const meses12 = Array.from({length:12},(_,i)=>{
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-11+i, 1);
    return d.toISOString().slice(0,7);
  });
  const evolucao = meses12.map(m=>{
    const l = todos.filter(x=>x.data?.startsWith(m)&&pagos(x));
    const rec = l.filter(x=>x.tipo==="receita").reduce((a,x)=>a+x.valor,0);
    const desp = l.filter(x=>x.tipo==="despesa").reduce((a,x)=>a+x.valor,0);
    return {mes:m, saldo:rec-desp, receita:rec, despesa:desp};
  });

  // Despesas por categoria (geral, todos os CCs)
  const catMap = {};
  doAno.filter(l=>l.tipo==="despesa").forEach(l=>{
    catMap[l.categoria] = (catMap[l.categoria]||0) + l.valor;
  });
  const categorias = Object.entries(catMap).map(([cat,v])=>({cat,valor:v})).sort((a,b)=>b.valor-a.valor);

  const maxDespCC = Math.max(1,...ccs.map(c=>Math.max(c.receita,c.despesa)));
  const maxEvol = Math.max(1,...evolucao.map(e=>Math.max(Math.abs(e.saldo),e.receita,e.despesa)));

  // Donut SVG — despesas por CC
  function Donut(){
    const total = ccs.reduce((a,c)=>a+c.despesa,0);
    if(total<=0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem despesas no período.</div>;
    let acc=0;
    const r=70, cx=90, cy=90, circ=2*Math.PI*r;
    return (
      <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="22"/>
          {ccs.filter(c=>c.despesa>0).map((c,i)=>{
            const frac = c.despesa/total;
            const dash = frac*circ;
            const offset = circ - acc;
            const el = <circle key={c.cc} cx={cx} cy={cy} r={r} fill="none" stroke={CORES_CC[c.cc]||CORES_CAT[i%CORES_CAT.length]} strokeWidth="22"
              strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset} transform={`rotate(-90 ${cx} ${cy})`}/>;
            acc += dash;
            return el;
          })}
          <text x={cx} y={cy-4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">{fmt(total)}</text>
          <text x={cx} y={cy+14} textAnchor="middle" fontSize="10" fill="#6b7280">despesas {anoFiltro}</text>
        </svg>
        <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:160}}>
          {ccs.filter(c=>c.despesa>0).sort((a,b)=>b.despesa-a.despesa).map((c,i)=>(
            <div key={c.cc} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
              <div style={{width:10,height:10,borderRadius:3,background:CORES_CC[c.cc]||CORES_CAT[i%CORES_CAT.length],flexShrink:0}}/>
              <div style={{flex:1}}>{c.cc}</div>
              <div style={{fontWeight:700}}>{fmt(c.despesa)}</div>
              <div style={{color:"var(--text-muted)",width:42,textAlign:"right"}}>{(c.despesa/total*100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Barras — receita vs despesa por CC
  function BarrasCC(){
    if(ccs.length===0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem dados no período.</div>;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {ccs.map(c=>(
          <div key={c.cc}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
              <span style={{fontWeight:600}}>{c.cc}</span>
              <span style={{color:c.saldo>=0?"#059669":"#dc2626",fontWeight:700}}>{fmt(c.saldo)}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:60,fontSize:10,color:"#059669"}}>Receita</div>
                <div style={{flex:1,background:"#f3f4f6",borderRadius:4,height:10,overflow:"hidden"}}>
                  <div style={{width:`${(c.receita/maxDespCC*100)}%`,height:"100%",background:"#10b981",borderRadius:4}}/>
                </div>
                <div style={{width:80,fontSize:11,textAlign:"right"}}>{fmt(c.receita)}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:60,fontSize:10,color:"#dc2626"}}>Despesa</div>
                <div style={{flex:1,background:"#f3f4f6",borderRadius:4,height:10,overflow:"hidden"}}>
                  <div style={{width:`${(c.despesa/maxDespCC*100)}%`,height:"100%",background:"#ef4444",borderRadius:4}}/>
                </div>
                <div style={{width:80,fontSize:11,textAlign:"right"}}>{fmt(c.despesa)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Linha — evolução do saldo (12 meses)
  function LinhaEvolucao(){
    const w=600,h=160,pad=30;
    const pontos = evolucao.map((e,i)=>{
      const x = pad + (i/(evolucao.length-1))*(w-2*pad);
      const yZero = h/2;
      const scale = (h/2-10)/maxEvol;
      const y = yZero - e.saldo*scale;
      return {x,y,...e};
    });
    const path = pontos.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
    return (
      <div style={{overflowX:"auto"}}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{minWidth:500}}>
          <line x1={pad} y1={h/2} x2={w-pad} y2={h/2} stroke="#e5e7eb" strokeWidth="1"/>
          <path d={path} fill="none" stroke="#7B00C4" strokeWidth="2.5"/>
          {pontos.map((p,i)=>(
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill={p.saldo>=0?"#059669":"#dc2626"}/>
              <text x={p.x} y={h-6} textAnchor="middle" fontSize="9" fill="#9ca3af">{mesLabel(p.mes)}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // Barras — despesas por categoria (geral)
  function BarrasCategorias(){
    const top = categorias.slice(0,10);
    const max = Math.max(1,...top.map(c=>c.valor));
    if(top.length===0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem despesas no período.</div>;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {top.map((c,i)=>(
          <div key={c.cat} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:130,fontSize:12,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.cat}</div>
            <div style={{flex:1,background:"#f3f4f6",borderRadius:4,height:14,overflow:"hidden"}}>
              <div style={{width:`${(c.valor/max*100)}%`,height:"100%",background:CORES_CAT[i%CORES_CAT.length],borderRadius:4}}/>
            </div>
            <div style={{width:90,fontSize:12,fontWeight:700,textAlign:"right"}}>{fmt(c.valor)}</div>
          </div>
        ))}
      </div>
    );
  }


  // ── Plano de Contas — agrupamento por categoria real ──
  const PLANO_CONTAS = {
    "Marketing / Tráfego Pago": ["Marketing","Tráfego Pago","Publicidade","Redes Sociais","Google Ads"],
    "Ferramentas Digitais": ["Ferramentas de IA","Software","Assinaturas","ElevenLabs","Tecnologia","Internet","Telefone / Internet"],
    "Ocupação / Aluguel": ["Aluguel","Condomínio","Sublocação","Energia / Água","Manutenção","IPTU"],
    "Repasses / Comissões": ["Salário Secretária","Repasse","Comissão","Parceria","Estagiária"],
    "Educação / Capacitação": ["Cursos e Capacitação","Educação","Livros","Supervisão","Desenvolvimento Pessoal"],
    "Saúde / Bem-estar": ["Saúde","Plano de Saúde","Medicamentos","Consultas"],
    "Gastos Domésticos": ["Moradia","Alimentação","Transporte","Vestuário","Lazer / Entretenimento","Lazer","Saneago","Seguro","Consórcio"],
    "Outros": [],
  };
  function mapearPlano(cat) {
    if(!cat) return "Outros";
    const c = cat.trim();
    for(const [grupo, cats] of Object.entries(PLANO_CONTAS)) {
      if(cats.some(k=>c.toLowerCase().includes(k.toLowerCase())||k.toLowerCase().includes(c.toLowerCase()))) return grupo;
    }
    return "Outros";
  }
  const CORES_PLANO = [
    "#7B00C4","#0891b2","#db2777","#d97706","#059669","#2563eb","#dc2626","#9ca3af"
  ];
  const planoMap = {};
  doAno.filter(l=>l.tipo==="despesa").forEach(l=>{
    const grupo = mapearPlano(l.categoria);
    planoMap[grupo] = (planoMap[grupo]||0) + l.valor;
  });
  const planoData = Object.entries(planoMap)
    .filter(([,v])=>v>0)
    .sort(([,a],[,b])=>b-a)
    .map(([cat,valor],i)=>({cat,valor,cor:CORES_PLANO[i%CORES_PLANO.length]}));

  function DonutPlano(){
    const total = planoData.reduce((a,p)=>a+p.valor,0);
    if(total<=0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem despesas no período.</div>;
    let acc=0;
    const r=70,cx=90,cy=90,circ=2*Math.PI*r;
    return (
      <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="22"/>
          {planoData.map((p,i)=>{
            const frac=p.valor/total;
            const dash=frac*circ;
            const offset=circ-acc;
            const el=<circle key={p.cat} cx={cx} cy={cy} r={r} fill="none" stroke={p.cor} strokeWidth="22"
              strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset} transform={`rotate(-90 ${cx} ${cy})`}/>;
            acc+=dash;
            return el;
          })}
          <text x={cx} y={cy-4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#111827">{fmt(total)}</text>
          <text x={cx} y={cy+14} textAnchor="middle" fontSize="10" fill="#6b7280">despesas {anoFiltro}</text>
        </svg>
        <div style={{display:"flex",flexDirection:"column",gap:5,flex:1,minWidth:180}}>
          {planoData.map(p=>(
            <div key={p.cat} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
              <div style={{width:10,height:10,borderRadius:3,background:p.cor,flexShrink:0}}/>
              <div style={{flex:1,lineHeight:1.3}}>{p.cat}</div>
              <div style={{fontWeight:700,flexShrink:0}}>{fmt(p.valor)}</div>
              <div style={{color:"var(--text-muted)",width:38,textAlign:"right",flexShrink:0}}>{(p.valor/total*100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function BarrasPlano(){
    if(planoData.length===0) return <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem dados.</div>;
    const max=Math.max(1,...planoData.map(p=>p.valor));
    return(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {planoData.map(p=>(
          <div key={p.cat}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
              <span style={{fontWeight:600}}>{p.cat}</span>
              <span style={{fontWeight:700,color:p.cor}}>{fmt(p.valor)}</span>
            </div>
            <div style={{background:"#f3f4f6",borderRadius:6,height:12,overflow:"hidden"}}>
              <div style={{width:`${(p.valor/max*100)}%`,height:"100%",background:p.cor,borderRadius:6,transition:".4s"}}/>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Seletor Ano */}
      <div style={{display:"flex",gap:6,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",flexShrink:0}}>Ano:</span>
        {anos.map(a=>(
          <button key={a} onClick={()=>setAnoFiltro(a)}
            style={{padding:"5px 16px",borderRadius:20,border:"1.5px solid",borderColor:anoFiltro===a?"var(--purple)":"#e5e7eb",background:anoFiltro===a?"var(--purple)":"white",color:anoFiltro===a?"white":"#6b7280",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            {a}
          </button>
        ))}
      </div>

      {/* Indicadores */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        <div style={{background:saldoConsolidado>=0?"#d1fae5":"#fee2e2",borderRadius:12,padding:"14px 16px",border:"1.5px solid",borderColor:saldoConsolidado>=0?"#6ee7b7":"#fca5a5"}}>
          <div style={{fontSize:11,fontWeight:600,color:saldoConsolidado>=0?"#059669":"#dc2626",marginBottom:4}}>Saldo Consolidado ({anoFiltro})</div>
          <div style={{fontSize:20,fontWeight:800,color:saldoConsolidado>=0?"#059669":"#dc2626"}}>{fmt(saldoConsolidado)}</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>+{fmt(totalReceita)} / -{fmt(totalDespesa)}</div>
        </div>
        <div style={{background:"#f0f9ff",borderRadius:12,padding:"14px 16px",border:"1.5px solid #93c5fd"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#2563eb",marginBottom:4}}>Margem</div>
          <div style={{fontSize:20,fontWeight:800,color:"#2563eb"}}>{margem.toFixed(1)}%</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>(receita - despesa) / receita</div>
        </div>
        <div style={{background:variacaoMes>=0?"#f0fdf4":"#fef2f2",borderRadius:12,padding:"14px 16px",border:"1.5px solid",borderColor:variacaoMes>=0?"#86efac":"#fca5a5"}}>
          <div style={{fontSize:11,fontWeight:600,color:variacaoMes>=0?"#059669":"#dc2626",marginBottom:4}}>Vs. mês anterior</div>
          <div style={{fontSize:20,fontWeight:800,color:variacaoMes>=0?"#059669":"#dc2626"}}>{variacaoMes>=0?"▲":"▼"} {Math.abs(variacaoMes).toFixed(0)}%</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{fmt(saldoMesAnterior)} → {fmt(saldoMesAtual)}</div>
        </div>
        <div style={{background:"#fffbeb",borderRadius:12,padding:"14px 16px",border:"1.5px solid #fcd34d"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#d97706",marginBottom:4}}>Pendentes ({anoFiltro})</div>
          <div style={{fontSize:20,fontWeight:800,color:"#d97706"}}>{fmt(totalPendente)}</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{pendentes.length} lançamento(s)</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,marginBottom:20}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🥧 Despesas por Centro de Custo</div>
          <Donut/>
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📊 Receita vs Despesa por CC</div>
          <BarrasCC/>
        </div>
      </div>

      {/* Plano de Contas — gráfico por grupo de despesa */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,marginBottom:20}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🎯 Despesas por Plano de Contas</div>
          <DonutPlano/>
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📉 Distribuição por Grupo ({anoFiltro})</div>
          <BarrasPlano/>
        </div>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📈 Evolução do Saldo — últimos 12 meses</div>
        <LinhaEvolucao/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,marginBottom:20}}>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🏷️ Maiores Categorias de Despesa ({anoFiltro})</div>
          <BarrasCategorias/>
        </div>
        <div className="card">
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🔝 Top 5 Maiores Despesas — {mesLabel(mesAtualStr)}</div>
          {despesasMesAtual.length===0
            ? <div style={{textAlign:"center",color:"var(--text-muted)",padding:20,fontSize:13}}>Sem despesas neste mês.</div>
            : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {despesasMesAtual.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<despesasMesAtual.length-1?"1px solid var(--gray-100)":"none"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"#fee2e2",color:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{d.categoria}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>{d.centroCusto} · {d.data}</div>
                    </div>
                    <div style={{fontWeight:700,color:"#dc2626"}}>{fmt(d.valor)}</div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FINANCEIRO PESSOAL & EMPRESA — componente unificado por tipo
// ═══════════════════════════════════════════════════════

// Componente base reutilizável para Pessoal e Empresa
function FinanceiroBase({ titulo, subtitulo, colLanc, colRecorr, corAcento="#7B00C4", user }) {
  const [lancamentos, setLancamentos]   = useState([]);
  const [recorrentes, setRecorrentes]   = useState([]);
  const [anoFiltro, setAnoFiltro]       = useState(new Date().getFullYear()+"");
  const [mesFiltro, setMesFiltro]       = useState(new Date().toISOString().slice(0,7));
  const [filtroTipo, setFiltroTipo]     = useState("tudo");
  const [modal, setModal]               = useState(false);
  const [editando, setEditando]         = useState(null);
  const [salvando, setSalvando]         = useState(false);
  const [modalBaixa, setModalBaixa]     = useState(null);
  const [modalMover, setModalMover]     = useState(null); // {lanc, isRecorrente}
  const [movendoId, setMovendoId]       = useState(null);
  const [formBaixa, setFormBaixa]       = useState({valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",modo:"este"});
  const [formLanc, setFormLanc]         = useState({tipo:"despesa",categoria:"",descricao:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"});
  const [formRecorr, setFormRecorr]     = useState({tipo:"despesa",categoria:"",descricao:"",valorPrevisto:"",recorrencia:"Mensal",diaVencimento:"10",mesInicio:new Date().toISOString().slice(0,7),ativo:true,indeterminado:true,totalParcelas:""});
  const [abaModal, setAbaModal]         = useState("avulso");

  const FORMAS    = ["PIX","Cartão de Crédito","Cartão de Débito","Dinheiro","Depósito","Transferência","Débito Automático","Outro"];
  const RECORRS   = ["Mensal","Semanal","Quinzenal","Bimestral","Trimestral","Semestral","Anual"];

  const CATS_REC_PES  = ["Pró-labore","Salário CLT","Professora CLT","Rendimento de Investimentos","Dividendos","Aluguel Recebido","Freelance","Outros"];
  const CATS_DES_PES  = ["Moradia","Aluguel","IPTU","Saneago","Energia / Água","Condomínio","Alimentação","Supermercado","Saúde","Plano de Saúde","Transporte","Combustível","Lazer","Vestuário","Viagem","Aporte em Investimentos","Seguro","Outros"];
  const CATS_REC_EMP  = ["Venda de Infoproduto","Consultoria","Curso Ministrado","Palestra","Licença","Outros"];
  const CATS_DES_EMP  = ["Marketing / Tráfego Pago","Ferramentas de IA","ElevenLabs","Designer / Freelancer","Equipamentos Digitais","Cursos / Treinamentos","Ônix Brasil","Contador","Impostos","Assinaturas","Outros"];

  const isPessoal = colLanc === "clinica_financeiro_pessoal";
  const catsRec   = isPessoal ? CATS_REC_PES : CATS_REC_EMP;
  const catsDes   = isPessoal ? CATS_DES_PES : CATS_DES_EMP;

  const DESTINOS = [
    {col:"clinica_financeiro_pessoal",  colRec:"clinica_fin_pessoal_recorrentes",  label:"💼 Financeiro Pessoal"},
    {col:"clinica_financeiro_empresa",  colRec:"clinica_fin_empresa_recorrentes",  label:"🏢 Financeiro Empresa"},
    {col:"clinica_lancamentos",         colRec:null,                               label:"🏥 Financeiro Clínica"},
  ].filter(d => d.col !== colLanc);

  useEffect(()=>{
    const u1 = db.collection(colLanc).onSnapshot(s=>{
      const docs = s.docs.map(d=>({id:d.id,...d.data()}));
      docs.sort((a,b)=>(b.data||"").localeCompare(a.data||""));
      setLancamentos(docs);
    },()=>{});
    const u2 = db.collection(colRecorr).onSnapshot(s=>{
      const docs = s.docs.map(d=>({id:d.id,...d.data()}));
      docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
      setRecorrentes(docs);
    },()=>{});
    return ()=>{ u1(); u2(); };
  },[colLanc, colRecorr]);

  const mesAtual = new Date().toISOString().slice(0,7);
  const anoAtualNum = new Date().getFullYear();
  const anosExist = [...new Set(lancamentos.map(l=>l.data?.slice(0,4)).filter(Boolean))].map(Number);
  const anos = [...new Set([...anosExist, anoAtualNum-1, anoAtualNum, anoAtualNum+1])].sort().map(String);
  const mesesDisp = Array.from({length:12},(_,i)=>`${anoFiltro}-${String(i+1).padStart(2,"0")}`);
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro)?mesFiltro:mesAtual.startsWith(anoFiltro)?mesAtual:anoFiltro+"-01";

  function fmt(v){ return (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
  function mesLabel(m){ try{ return new Date(m+"-02").toLocaleDateString("pt-BR",{month:"short"}); }catch(e){ return m; } }

  const lancMes = lancamentos.filter(l=>l.data?.startsWith(mesFiltroEfetivo));
  const lancAno = lancamentos.filter(l=>l.data?.startsWith(anoFiltro));

  function calcRec(l){ return l.filter(x=>x.tipo==="receita"&&(x.status==="pago"||x.status==="recebido")).reduce((a,x)=>a+(parseFloat(x.valor)||0),0); }
  function calcDes(l){ return l.filter(x=>x.tipo==="despesa"&&(x.status==="pago"||x.status==="recebido")).reduce((a,x)=>a+(parseFloat(x.valor)||0),0); }

  const recMes=calcRec(lancMes), desMes=calcDes(lancMes), saldoMes=recMes-desMes;
  const recAno=calcRec(lancAno), desAno=calcDes(lancAno);
  const pendMes=lancMes.filter(l=>l.status==="pendente").reduce((a,l)=>a+(parseFloat(l.valor)||0),0);

  // Recorrentes ativos sem baixa neste mês
  const recorrAtivos = recorrentes.filter(r=>r.ativo!==false);
  function jaDeuBaixaMes(r){
    return lancamentos.some(l=>l.recorrenteId===r.id && l.data?.startsWith(mesFiltroEfetivo));
  }

  // Lista unificada: lançamentos do mês + recorrentes sem baixa
  const recSemBaixa = recorrAtivos.filter(r=>!jaDeuBaixaMes(r)).map(r=>({
    _virtual:true, id:r.id, tipo:r.tipo, categoria:r.categoria,
    descricao:r.descricao, valor:r.valorPrevisto, data:`${mesFiltroEfetivo}-${String(r.diaVencimento||10).padStart(2,"0")}`,
    status:"pendente", recorrenteId:r.id, _recObj:r
  }));
  const listaUnif = [...lancMes, ...recSemBaixa].sort((a,b)=>(b.data||"").localeCompare(a.data||""));
  const receitas  = filtroTipo==="despesa" ? [] : listaUnif.filter(l=>l.tipo==="receita");
  const despesas  = filtroTipo==="receita" ? [] : listaUnif.filter(l=>l.tipo==="despesa");

  function abrirNovo(tipo){ setFormLanc({tipo,categoria:"",descricao:"",valor:"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",status:"pago",obs:"",parcelas:"1"}); setEditando(null); setAbaModal("avulso"); setModal("lanc"); }

  async function salvarLanc(){
    if(!formLanc.valor||!formLanc.data){alert("Valor e data obrigatórios.");return;}
    setSalvando(true);
    try {
      const val=parseFloat(formLanc.valor); const nParc=parseInt(formLanc.parcelas)||1;
      const base={tipo:formLanc.tipo,tipo_lancamento:formLanc.tipo==="despesa"?"despesa":"receita",categoria:formLanc.categoria||"Outros",descricao:formLanc.descricao||formLanc.categoria||"Lançamento",formaPag:formLanc.formaPag,status:formLanc.status,obs:formLanc.obs||"",createdAt:firebase.firestore.FieldValue.serverTimestamp()};
      if(editando){ await db.collection(colLanc).doc(editando).update({...base,valor:val,data:formLanc.data}); }
      else if(nParc>1){
        const batch=db.batch();
        const [a,m,d]=formLanc.data.split("-").map(Number);
        for(let i=0;i<nParc;i++){
          let mm=m+i,aa=a; while(mm>12){mm-=12;aa++;}
          const dp=`${aa}-${String(mm).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          batch.set(db.collection(colLanc).doc(),{...base,valor:val,data:dp,parcela:`${i+1}/${nParc}`,descricao:(formLanc.descricao||formLanc.categoria||"Lançamento")+` (${i+1}/${nParc})`});
        }
        await batch.commit();
      } else { await db.collection(colLanc).add({...base,valor:val,data:formLanc.data}); }
      setModal(false); setEditando(null);
    } catch(e){alert("Erro: "+e.message);}
    setSalvando(false);
  }

  async function salvarRecorr(){
    if(!formRecorr.categoria||!formRecorr.valorPrevisto){alert("Categoria e valor obrigatórios.");return;}
    setSalvando(true);
    try {
      const dados={...formRecorr,valorPrevisto:parseFloat(formRecorr.valorPrevisto),totalParcelas:formRecorr.indeterminado?0:(parseInt(formRecorr.totalParcelas)||0),indeterminado:!!formRecorr.indeterminado,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
      if(editando){ await db.collection(colRecorr).doc(editando).update(dados); }
      else { await db.collection(colRecorr).add(dados); }
      setModal(false); setEditando(null);
    } catch(e){alert("Erro: "+e.message);}
    setSalvando(false);
  }

  async function darBaixa(){
    if(!formBaixa.valor||!formBaixa.data){alert("Valor e data obrigatórios.");return;}
    setSalvando(true);
    try {
      const r=modalBaixa;
      await db.collection(colLanc).add({
        tipo: r.tipo||"despesa",
        tipo_lancamento: (r.tipo||"despesa")==="despesa"?"despesa":"receita",
        categoria: r.categoria||"",
        descricao: r.descricao||r.categoria||"",
        valor: parseFloat(formBaixa.valor),
        data: formBaixa.data,
        formaPag: formBaixa.formaPag||"PIX",
        status: "pago",
        recorrenteId: r.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setModalBaixa(null);
    } catch(e){ alert("Erro ao dar baixa: "+e.message); }
    finally { setSalvando(false); }
  }

  async function excluir(id){
    if(!confirm("Excluir este lançamento?")) return;
    try { await db.collection(colLanc).doc(id).delete(); }
    catch(e){ alert("Erro ao excluir: "+e.message); }
  }

  async function moverLancamento(lanc, destino, modoRecorr){
    setMovendoId(lanc.id);
    try {
      let dados = null;

      // Se é virtual (sem baixa), não tem doc em colLanc — usar os dados do próprio objeto
      if(lanc._virtual){
        const {_virtual, _recObj, ...rest} = lanc;
        dados = {...rest};
        // Para virtual, só mover o recorrente — não há lançamento real para mover
        if(destino.colRec && _recObj?.id){
          const rSnap = await db.collection(colRecorr).doc(_recObj.id).get();
          if(rSnap.exists){
            await db.collection(destino.colRec).add(rSnap.data());
            await db.collection(colRecorr).doc(_recObj.id).delete();
          }
        }
        setModalMover(null);
        setMovendoId(null);
        return;
      }

      // Lançamento real — buscar do Firestore
      const snap = await db.collection(colLanc).doc(lanc.id).get();
      if(!snap.exists){ alert("Lançamento não encontrado."); setMovendoId(null); return; }
      dados = snap.data();

      // Gravar no destino
      if(destino.col==="clinica_lancamentos"){
        await db.collection("clinica_lancamentos").add({...dados, tipo_lancamento: dados.tipo==="despesa"?"despesa":dados.tipo_lancamento||"avulso"});
      } else {
        await db.collection(destino.col).add({...dados});
      }
      await db.collection(colLanc).doc(lanc.id).delete();

      // Mover recorrente vinculado se pedido
      if(lanc.recorrenteId && destino.colRec && modoRecorr==="todos"){
        const rSnap = await db.collection(colRecorr).doc(lanc.recorrenteId).get();
        if(rSnap.exists){
          await db.collection(destino.colRec).add(rSnap.data());
          await db.collection(colRecorr).doc(lanc.recorrenteId).delete();
        }
      }
      setModalMover(null);
    } catch(e){ alert("Erro ao mover: "+e.message); }
    finally { setMovendoId(null); }
  }

  const corRec="#059669"; const corDes="#dc2626";

  return (
    <div>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">{titulo}</div>
          <div className="page-subtitle">{subtitulo}</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>abrirNovo("receita")} className="btn" style={{background:"none",border:`1px solid ${corRec}`,color:corRec,borderRadius:8,padding:"8px 16px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"var(--font-body)"}}>
            <Icon name="plus" size={14}/> Nova Receita
          </button>
          <button onClick={()=>abrirNovo("despesa")} className="btn btn-purple" style={{padding:"8px 16px",fontSize:13}}>
            <Icon name="plus" size={14}/> Nova Despesa
          </button>
        </div>
      </div>

      {/* CARDS TOPO */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:24}}>
        <div className="card" style={{padding:20,background:saldoMes>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${saldoMes>=0?"#86efac":"#fca5a5"}`}}>
          <div style={{fontSize:11,fontWeight:600,color:saldoMes>=0?corRec:corDes,marginBottom:4}}>Saldo ({mesLabel(mesFiltroEfetivo)})</div>
          <div style={{fontSize:24,fontWeight:700,color:saldoMes>=0?corRec:corDes}}>{fmt(saldoMes)}</div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>+{fmt(recMes)} / -{fmt(desMes)}</div>
        </div>
        <div className="card" style={{padding:20,background:"#fffbeb",border:"1px solid #fde68a"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#d97706",marginBottom:4}}>Pendente ({anoFiltro})</div>
          <div style={{fontSize:24,fontWeight:700,color:"#d97706"}}>{fmt(pendMes)}</div>
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontSize:11,fontWeight:600,color:corRec,marginBottom:4}}>Receitas ({anoFiltro})</div>
          <div style={{fontSize:24,fontWeight:700,color:corRec}}>{fmt(recAno)}</div>
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontSize:11,fontWeight:600,color:corDes,marginBottom:4}}>Despesas ({anoFiltro})</div>
          <div style={{fontSize:24,fontWeight:700,color:corDes}}>{fmt(desAno)}</div>
        </div>
      </div>

      {/* FILTRO ANO */}
      <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
        <span style={{fontSize:12,color:"var(--text-muted)",fontWeight:600}}>Ano:</span>
        {anos.map(a=>(
          <button key={a} onClick={()=>setAnoFiltro(a)} style={{padding:"4px 14px",borderRadius:20,border:"none",background:anoFiltro===a?"var(--purple)":"var(--gray-100)",color:anoFiltro===a?"white":"var(--gray-600)",fontWeight:anoFiltro===a?700:400,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>{a}</button>
        ))}
      </div>

      {/* FILTRO TIPO */}
      <div style={{display:"flex",gap:6,marginBottom:16,background:"var(--gray-50)",padding:6,borderRadius:12,width:"fit-content"}}>
        {[["tudo","📊 Tudo"],["receita","💰 Receitas"],["despesa","💸 Despesas"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltroTipo(v)} style={{padding:"6px 16px",borderRadius:8,border:"none",background:filtroTipo===v?"white":"transparent",color:filtroTipo===v?(v==="receita"?corRec:v==="despesa"?corDes:"var(--purple)"):"#6b7280",fontWeight:filtroTipo===v?700:500,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)",boxShadow:filtroTipo===v?"0 1px 4px rgba(0,0,0,.1)":"none",transition:".15s"}}>
            {l}
          </button>
        ))}
      </div>

      {/* NAVEGAÇÃO MÊS */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,overflowX:"auto",scrollbarWidth:"none"}}>
        <button onClick={()=>{ const idx=mesesDisp.indexOf(mesFiltroEfetivo); if(idx>0)setMesFiltro(mesesDisp[idx-1]); }} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="chevron-left" size={14}/></button>
        {mesesDisp.map(m=>(
          <button key={m} onClick={()=>setMesFiltro(m)} style={{padding:"5px 14px",borderRadius:20,border:"none",background:m===mesFiltroEfetivo?"var(--purple)":"var(--gray-100)",color:m===mesFiltroEfetivo?"white":"var(--gray-600)",fontWeight:m===mesFiltroEfetivo?700:400,cursor:"pointer",fontSize:13,flexShrink:0,fontFamily:"var(--font-body)"}}>
            {mesLabel(m)}
          </button>
        ))}
        <button onClick={()=>{ const idx=mesesDisp.indexOf(mesFiltroEfetivo); if(idx<mesesDisp.length-1)setMesFiltro(mesesDisp[idx+1]); }} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="chevron-right" size={14}/></button>
      </div>

      {/* CARDS SALDO MÊS */}
      {filtroTipo!=="despesa"&&(
        <div style={{padding:"12px 20px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:12,marginBottom:12}}>
          <span style={{fontSize:12,color:corRec,fontWeight:600}}>TOTAL RECEITAS DO MÊS </span>
          <span style={{fontSize:18,fontWeight:700,color:corRec,marginLeft:8}}>{fmt(recMes)}</span>
        </div>
      )}
      {filtroTipo!=="receita"&&(
        <div style={{padding:"12px 20px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:12,marginBottom:12}}>
          <span style={{fontSize:12,color:corDes,fontWeight:600}}>TOTAL DESPESAS DO MÊS </span>
          <span style={{fontSize:18,fontWeight:700,color:corDes,marginLeft:8}}>{fmt(desMes)}</span>
        </div>
      )}

      {/* TABELA RECEITAS */}
      {receitas.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:14,color:corRec}}>🟢 Receitas</div>
            <div style={{fontWeight:700,color:corRec}}>{fmt(calcRec(receitas))}</div>
          </div>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"var(--gray-50)"}}>
                {["Data","Descrição","Categoria","Forma Pag.","Valor","Status","Ações"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:"var(--text-muted)",textAlign:"left",borderBottom:"1px solid var(--gray-200)"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {receitas.map((l,i)=>(
                  <tr key={l.id} style={{borderBottom:"1px solid var(--gray-100)",background:i%2===0?"white":"var(--gray-50)"}}>
                    <td style={{padding:"10px 14px",fontSize:13,color:"var(--text-muted)",whiteSpace:"nowrap"}}>
                      {l.data}
                      {l._virtual&&<span style={{fontSize:10,background:"#fef3c7",color:"#b45309",padding:"1px 6px",borderRadius:20,fontWeight:600,marginLeft:6}}>sem baixa</span>}
                    </td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:500}}>{l.descricao||l.categoria||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-muted)"}}>{l.categoria||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-muted)"}}>{l.formaPag||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,color:corRec,whiteSpace:"nowrap"}}>{fmt(l.valor)}</td>
                    <td style={{padding:"10px 14px"}}>
                      <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600,background:l.status==="pago"||l.status==="recebido"?"#d1fae5":"#fef3c7",color:l.status==="pago"||l.status==="recebido"?"#065f46":"#b45309"}}>
                        {l.status==="pago"||l.status==="recebido"?"✓ Recebido":"Pendente"}
                      </span>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                        {l._virtual&&(
                          <button onClick={()=>{ setModalBaixa(l._recObj); setFormBaixa({valor:l.valor+"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",modo:"este"}); }} style={{fontSize:11,background:"#d1fae5",color:"#065f46",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontWeight:600}}>Dar baixa</button>
                        )}
                        {!l._virtual&&(<>
                          <button onClick={()=>{ setFormLanc({tipo:l.tipo,categoria:l.categoria||"",descricao:l.descricao||"",valor:l.valor+"",data:l.data,formaPag:l.formaPag||"PIX",status:l.status||"pago",obs:l.obs||"",parcelas:"1"}); setEditando(l.id); setAbaModal("avulso"); setModal("lanc"); }} style={{background:"none",border:"none",cursor:"pointer",color:"var(--purple)",padding:"3px 6px"}} title="Editar"><Icon name="pencil" size={13}/></button>
                          <button onClick={()=>excluir(l.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",padding:"3px 6px"}} title="Excluir"><Icon name="trash-2" size={13}/></button>
                        </>)}
                        <button onClick={()=>setModalMover({lanc:l._virtual?{...l,id:l._recObj.id}:l,isRecorrente:true})} title="Mover para outro financeiro" style={{background:"#f3f0ff",border:"none",cursor:"pointer",color:"#7B00C4",padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:600}}>↗ Mover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABELA DESPESAS */}
      {despesas.length>0&&(
        <div style={{marginBottom:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:14,color:corDes}}>🔴 Despesas</div>
            <div style={{fontWeight:700,color:corDes}}>{fmt(calcDes(despesas))}</div>
          </div>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"var(--gray-50)"}}>
                {["Data","Descrição","Categoria","Forma Pag.","Valor","Status","Ações"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:"var(--text-muted)",textAlign:"left",borderBottom:"1px solid var(--gray-200)"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {despesas.map((l,i)=>(
                  <tr key={l.id} style={{borderBottom:"1px solid var(--gray-100)",background:i%2===0?"white":"var(--gray-50)"}}>
                    <td style={{padding:"10px 14px",fontSize:13,color:"var(--text-muted)",whiteSpace:"nowrap"}}>
                      {l.data}
                      {l._virtual&&<span style={{fontSize:10,background:"#fef3c7",color:"#b45309",padding:"1px 6px",borderRadius:20,fontWeight:600,marginLeft:6}}>sem baixa</span>}
                    </td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:500}}>{l.descricao||l.categoria||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-muted)"}}>{l.categoria||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:12,color:"var(--text-muted)"}}>{l.formaPag||"—"}</td>
                    <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,color:corDes,whiteSpace:"nowrap"}}>{fmt(l.valor)}</td>
                    <td style={{padding:"10px 14px"}}>
                      <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,fontWeight:600,background:l.status==="pago"?"#d1fae5":"#fef3c7",color:l.status==="pago"?"#065f46":"#b45309"}}>
                        {l.status==="pago"?"✓ Pago":"Pendente"}
                      </span>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                        {l._virtual&&(
                          <button onClick={()=>{ setModalBaixa(l._recObj); setFormBaixa({valor:l.valor+"",data:new Date().toISOString().slice(0,10),formaPag:"PIX",modo:"este"}); }} style={{fontSize:11,background:"#d1fae5",color:"#065f46",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontWeight:600}}>Dar baixa</button>
                        )}
                        {!l._virtual&&(<>
                          <button onClick={()=>{ setFormLanc({tipo:l.tipo,categoria:l.categoria||"",descricao:l.descricao||"",valor:l.valor+"",data:l.data,formaPag:l.formaPag||"PIX",status:l.status||"pago",obs:l.obs||"",parcelas:"1"}); setEditando(l.id); setAbaModal("avulso"); setModal("lanc"); }} style={{background:"none",border:"none",cursor:"pointer",color:"var(--purple)",padding:"3px 6px"}} title="Editar"><Icon name="pencil" size={13}/></button>
                          <button onClick={()=>excluir(l.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",padding:"3px 6px"}} title="Excluir"><Icon name="trash-2" size={13}/></button>
                        </>)}
                        <button onClick={()=>setModalMover({lanc:l._virtual?{...l,id:l._recObj.id}:l,isRecorrente:true})} title="Mover para outro financeiro" style={{background:"#f3f0ff",border:"none",cursor:"pointer",color:"#7B00C4",padding:"3px 8px",borderRadius:6,fontSize:11,fontWeight:600}}>↗ Mover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {receitas.length===0&&despesas.length===0&&(
        <div style={{textAlign:"center",padding:40,color:"var(--text-muted)",fontSize:14}}>Nenhum lançamento em {mesLabel(mesFiltroEfetivo)} de {anoFiltro}.</div>
      )}

      {/* RODAPÉ SALDO */}
      <div style={{display:"flex",gap:16,alignItems:"center",justifyContent:"flex-end",padding:"16px 0",borderTop:"1px solid var(--gray-200)",flexWrap:"wrap"}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--text-muted)"}}>Receitas</div><div style={{fontWeight:700,color:corRec}}>{fmt(recMes)}</div></div>
        <div style={{fontSize:18,color:"var(--text-muted)"}}>—</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--text-muted)"}}>Despesas</div><div style={{fontWeight:700,color:corDes}}>{fmt(desMes)}</div></div>
        <div style={{fontSize:18,color:"var(--text-muted)"}}>=</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"var(--text-muted)"}}>Saldo do Mês</div><div style={{fontWeight:700,fontSize:18,color:saldoMes>=0?corRec:corDes}}>{fmt(saldoMes)}</div></div>
      </div>

      {/* MODAL LANÇAMENTO */}
      {modal==="lanc"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>{setModal(false);setEditando(null);}}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600}}>{editando?"Editar":"Novo"} Lançamento</div>
              <button onClick={()=>{setModal(false);setEditando(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><Icon name="x" size={20}/></button>
            </div>
            {!editando&&(
              <div style={{display:"flex",gap:6,marginBottom:16,background:"var(--gray-50)",padding:4,borderRadius:10}}>
                {[["avulso","💰 Avulso"],["recorrente","🔁 Recorrente"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setAbaModal(v)} style={{flex:1,padding:"7px",border:"none",borderRadius:8,background:abaModal===v?"white":"transparent",color:abaModal===v?"var(--purple)":"#6b7280",fontWeight:abaModal===v?700:500,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>{l}</button>
                ))}
              </div>
            )}
            {abaModal==="avulso"?(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={formLanc.tipo} onChange={e=>setFormLanc({...formLanc,tipo:e.target.value,categoria:""})}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-input" value={formLanc.categoria} onChange={e=>setFormLanc({...formLanc,categoria:e.target.value})}>
                    <option value="">Selecionar...</option>
                    {(formLanc.tipo==="receita"?catsRec:catsDes).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor (R$)</label>
                  <input className="form-input" type="number" step="0.01" value={formLanc.valor} onChange={e=>setFormLanc({...formLanc,valor:e.target.value})} placeholder="0,00"/>
                </div>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Descrição</label>
                  <input className="form-input" value={formLanc.descricao} onChange={e=>setFormLanc({...formLanc,descricao:e.target.value})} placeholder="Descrição opcional"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input className="form-input" type="date" value={formLanc.data} onChange={e=>setFormLanc({...formLanc,data:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Forma Pag.</label>
                  <select className="form-input" value={formLanc.formaPag} onChange={e=>setFormLanc({...formLanc,formaPag:e.target.value})}>
                    {FORMAS.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={formLanc.status} onChange={e=>setFormLanc({...formLanc,status:e.target.value})}>
                    <option value="pago">✓ Pago / Recebido</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Parcelas</label>
                  <input className="form-input" type="number" min="1" max="48" value={formLanc.parcelas} onChange={e=>setFormLanc({...formLanc,parcelas:e.target.value})}/>
                </div>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Observação</label>
                  <input className="form-input" value={formLanc.obs} onChange={e=>setFormLanc({...formLanc,obs:e.target.value})} placeholder="Opcional"/>
                </div>
                <div style={{gridColumn:"span 2",display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
                  {editando&&(
                    <button onClick={async()=>{if(confirm("Excluir este lançamento?")){await excluir(editando);setModal(false);setEditando(null);}}} style={{background:"none",border:"1px solid #dc2626",color:"#dc2626",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"var(--font-body)"}}>🗑️ Excluir</button>
                  )}
                  <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
                    <button onClick={()=>{setModal(false);setEditando(null);}} className="btn btn-ghost">Cancelar</button>
                    <button onClick={salvarLanc} disabled={salvando} className="btn btn-purple">{salvando?"Salvando...":"Salvar"}</button>
                  </div>
                </div>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={formRecorr.tipo} onChange={e=>setFormRecorr({...formRecorr,tipo:e.target.value,categoria:""})}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-input" value={formRecorr.categoria} onChange={e=>setFormRecorr({...formRecorr,categoria:e.target.value})}>
                    <option value="">Selecionar...</option>
                    {(formRecorr.tipo==="receita"?catsRec:catsDes).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Valor Previsto (R$)</label>
                  <input className="form-input" type="number" step="0.01" value={formRecorr.valorPrevisto} onChange={e=>setFormRecorr({...formRecorr,valorPrevisto:e.target.value})} placeholder="0,00"/>
                </div>
                <div className="form-group" style={{gridColumn:"span 2"}}>
                  <label className="form-label">Descrição</label>
                  <input className="form-input" value={formRecorr.descricao} onChange={e=>setFormRecorr({...formRecorr,descricao:e.target.value})} placeholder="Ex: Aluguel apartamento"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Recorrência</label>
                  <select className="form-input" value={formRecorr.recorrencia} onChange={e=>setFormRecorr({...formRecorr,recorrencia:e.target.value})}>
                    {RECORRS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dia vencimento</label>
                  <input className="form-input" type="number" min="1" max="31" value={formRecorr.diaVencimento} onChange={e=>setFormRecorr({...formRecorr,diaVencimento:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Início</label>
                  <input className="form-input" type="month" value={formRecorr.mesInicio} onChange={e=>setFormRecorr({...formRecorr,mesInicio:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Duração</label>
                  <select className="form-input" value={formRecorr.indeterminado?"ind":"det"} onChange={e=>setFormRecorr({...formRecorr,indeterminado:e.target.value==="ind"})}>
                    <option value="ind">Indeterminado</option>
                    <option value="det">Número fixo de meses</option>
                  </select>
                </div>
                {!formRecorr.indeterminado&&(
                  <div className="form-group">
                    <label className="form-label">Qtd meses</label>
                    <input className="form-input" type="number" min="1" value={formRecorr.totalParcelas} onChange={e=>setFormRecorr({...formRecorr,totalParcelas:e.target.value})}/>
                  </div>
                )}
                <div style={{gridColumn:"span 2",display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button onClick={()=>{setModal(false);setEditando(null);}} className="btn btn-ghost">Cancelar</button>
                  <button onClick={salvarRecorr} disabled={salvando} className="btn btn-purple">{salvando?"Salvando...":"Salvar"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DAR BAIXA */}
      {modalBaixa&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:20}} onClick={()=>setModalBaixa(null)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:16}}>Dar baixa — {modalBaixa.descricao||modalBaixa.categoria}</div>
            <div className="form-group"><label className="form-label">Valor pago</label><input className="form-input" type="number" step="0.01" value={formBaixa.valor} onChange={e=>setFormBaixa({...formBaixa,valor:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={formBaixa.data} onChange={e=>setFormBaixa({...formBaixa,data:e.target.value})}/></div>
            <div className="form-group"><label className="form-label">Forma Pag.</label><select className="form-input" value={formBaixa.formaPag} onChange={e=>setFormBaixa({...formBaixa,formaPag:e.target.value})}>{FORMAS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
              <button onClick={()=>setModalBaixa(null)} className="btn btn-ghost">Cancelar</button>
              <button onClick={darBaixa} disabled={salvando} className="btn btn-purple">{salvando?"Salvando...":"Confirmar baixa"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVER */}
      {modalMover&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:700,padding:20}} onClick={()=>setModalMover(null)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:600,marginBottom:8}}>↗ Mover lançamento</div>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>
              <strong>{modalMover.lanc.descricao||modalMover.lanc.categoria}</strong> — {fmt(modalMover.lanc.valor)}<br/>
              Para onde deseja mover?
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {DESTINOS.map(dest=>(
                <div key={dest.col}>
                  {modalMover.isRecorrente&&dest.colRec?(
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>moverLancamento(modalMover.lanc,dest,"este")} disabled={!!movendoId} style={{flex:1,padding:"10px",border:"1px solid #e5e7eb",borderRadius:10,background:"white",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"var(--font-body)"}}>
                        {movendoId===modalMover.lanc.id?"Movendo...":dest.label+" (só este)"}
                      </button>
                      <button onClick={()=>moverLancamento(modalMover.lanc,dest,"todos")} disabled={!!movendoId} style={{flex:1,padding:"10px",border:"2px solid var(--purple)",borderRadius:10,background:"#f3f0ff",cursor:"pointer",fontSize:13,fontWeight:700,color:"var(--purple)",fontFamily:"var(--font-body)"}}>
                        {dest.label+" + recorrente"}
                      </button>
                    </div>
                  ):(
                    <button onClick={()=>moverLancamento(modalMover.lanc,dest,"este")} disabled={!!movendoId} style={{width:"100%",padding:"12px",border:"1px solid #e5e7eb",borderRadius:10,background:"white",cursor:"pointer",fontSize:14,fontWeight:600,fontFamily:"var(--font-body)",textAlign:"left"}}>
                      {movendoId===modalMover.lanc.id?"Movendo...":dest.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid #fee2e2",paddingTop:14,marginTop:4,display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:12,fontWeight:600,color:"#dc2626",marginBottom:2}}>🗑️ Excluir</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={async()=>{if(confirm("Excluir só este lançamento?")){await excluir(modalMover.lanc.id);setModalMover(null);}}} disabled={!!movendoId} style={{flex:1,padding:"9px",border:"1px solid #fca5a5",borderRadius:10,background:"#fef2f2",cursor:"pointer",fontSize:13,fontWeight:600,color:"#dc2626",fontFamily:"var(--font-body)"}}>
                  Excluir só este
                </button>
                {modalMover.isRecorrente&&modalMover.lanc.recorrenteId&&(
                  <button onClick={async()=>{if(confirm("Excluir este e desativar o recorrente?")){await excluir(modalMover.lanc.id);await db.collection(colRecorr).doc(modalMover.lanc.recorrenteId).update({ativo:false});setModalMover(null);}}} disabled={!!movendoId} style={{flex:1,padding:"9px",border:"2px solid #dc2626",borderRadius:10,background:"#fef2f2",cursor:"pointer",fontSize:13,fontWeight:700,color:"#dc2626",fontFamily:"var(--font-body)"}}>
                    Excluir + desativar recorrente
                  </button>
                )}
              </div>
            </div>
            <button onClick={()=>setModalMover(null)} className="btn btn-ghost" style={{width:"100%",marginTop:8}}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FinanceiroPessoal({ somenteLeitura=false }) {
  return <FinanceiroBase
    titulo="Financeiro Pessoal"
    subtitulo="Receitas e despesas pessoais — moradia, saúde, alimentação, investimentos"
    colLanc="clinica_financeiro_pessoal"
    colRecorr="clinica_fin_pessoal_recorrentes"
  />;
}

function FinanceiroEmpresa({ somenteLeitura=false }) {
  return <FinanceiroBase
    titulo="Financeiro Empresa"
    subtitulo="Negócio digital — Ônix Brasil, infoprodutos, marketing, ferramentas, treinamentos"
    colLanc="clinica_financeiro_empresa"
    colRecorr="clinica_fin_empresa_recorrentes"
  />;
}

function PainelGeralFinanceiro() {
  const [dados, setDados] = useState({clinica:[],pessoal:[],empresa:[]});
  const [ano, setAno]     = useState(new Date().getFullYear()+"");
  const [mesSel, setMesSel] = useState(new Date().toISOString().slice(0,7));
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let d={clinica:[],pessoal:[],empresa:[]}; let count=0;
    function check(){ count++; if(count===3){setDados({...d});setLoading(false);} }
    db.collection("clinica_lancamentos").onSnapshot(s=>{d.clinica=s.docs.map(x=>({id:x.id,...x.data()}));check();},()=>check());
    db.collection("clinica_financeiro_pessoal").onSnapshot(s=>{d.pessoal=s.docs.map(x=>({id:x.id,...x.data()}));check();},()=>check());
    db.collection("clinica_financeiro_empresa").onSnapshot(s=>{d.empresa=s.docs.map(x=>({id:x.id,...x.data()}));check();},()=>check());
  },[]);

  function fmt(v){ return (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
  function mesLabel(m,longo){ try{ return new Date(m+"-02").toLocaleDateString("pt-BR",{month:longo?"long":"short"}); }catch(e){return m;} }
  function isRec(l){ return l.tipo!=="despesa"&&l.tipo_lancamento!=="despesa"; }
  function isDes(l){ return l.tipo==="despesa"||l.tipo_lancamento==="despesa"; }
  function isPago(l){ return l.status==="pago"||l.status==="recebido"; }

  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().toISOString().slice(0,7);
  const anosDisp = [...new Set([...dados.clinica,...dados.pessoal,...dados.empresa].map(l=>l.data?.slice(0,4)).filter(Boolean).map(Number))];
  const anos = [...new Set([...anosDisp,anoAtual-1,anoAtual,anoAtual+1])].sort().map(String);
  const mesesAno = Array.from({length:12},(_,i)=>`${ano}-${String(i+1).padStart(2,"0")}`);
  const todas = [...dados.clinica,...dados.pessoal,...dados.empresa];

  function calcPeriodo(lista, prefixo){
    const l = lista.filter(x=>x.data?.startsWith(prefixo));
    return {
      rec: l.filter(x=>isRec(x)&&isPago(x)).reduce((a,x)=>a+(parseFloat(x.valor)||0),0),
      des: l.filter(x=>isDes(x)&&isPago(x)).reduce((a,x)=>a+(parseFloat(x.valor)||0),0),
      pend: l.filter(x=>x.status==="pendente").reduce((a,x)=>a+(parseFloat(x.valor)||0),0),
    };
  }

  // Anual
  const aCl=calcPeriodo(dados.clinica,ano), aPs=calcPeriodo(dados.pessoal,ano), aEm=calcPeriodo(dados.empresa,ano);
  const totalRec=aCl.rec+aPs.rec+aEm.rec, totalDes=aCl.des+aPs.des+aEm.des, totalSaldo=totalRec-totalDes;
  const totalPend=aCl.pend+aPs.pend+aEm.pend;

  // Mês selecionado
  const mCl=calcPeriodo(dados.clinica,mesSel), mPs=calcPeriodo(dados.pessoal,mesSel), mEm=calcPeriodo(dados.empresa,mesSel);
  const mesRec=mCl.rec+mPs.rec+mEm.rec, mesDes=mCl.des+mPs.des+mEm.des, mesSaldo=mesRec-mesDes;

  // Gráfico por mês
  const grafico = mesesAno.map(m=>{
    const rec = todas.filter(l=>l.data?.startsWith(m)&&isRec(l)&&isPago(l)).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
    const des = todas.filter(l=>l.data?.startsWith(m)&&isDes(l)&&isPago(l)).reduce((a,l)=>a+(parseFloat(l.valor)||0),0);
    return {mes:m, rec, des, saldo:rec-des};
  });
  const maxVal = Math.max(...grafico.map(g=>Math.max(g.rec,g.des)),1);
  const altBar = 160;

  if(loading) return <div style={{textAlign:"center",padding:60}}><Spinner/><div style={{marginTop:12,color:"var(--text-muted)"}}>Carregando...</div></div>;

  return (
    <div>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <div className="page-title">Painel Geral</div>
          <div className="page-subtitle">Consolidado — Clínica + Pessoal + Empresa</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {anos.map(a=>(
            <button key={a} onClick={()=>{setAno(a);setMesSel(a===ano?mesSel:a+"-01");}} style={{padding:"6px 14px",borderRadius:20,border:"none",background:ano===a?"var(--purple)":"var(--gray-100)",color:ano===a?"white":"var(--gray-600)",fontWeight:ano===a?700:400,cursor:"pointer",fontSize:13,fontFamily:"var(--font-body)"}}>{a}</button>
          ))}
        </div>
      </div>

      {/* CARDS ANUAIS */}
      <div style={{marginBottom:8,fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:1}}>Acumulado {ano}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:24}}>
        <div className="card" style={{padding:18,background:totalSaldo>=0?"#f0fdf4":"#fef2f2",border:`1px solid ${totalSaldo>=0?"#86efac":"#fca5a5"}`}}>
          <div style={{fontSize:11,fontWeight:600,color:totalSaldo>=0?"#059669":"#dc2626",marginBottom:4}}>Saldo Total</div>
          <div style={{fontSize:20,fontWeight:700,color:totalSaldo>=0?"#059669":"#dc2626"}}>{fmt(totalSaldo)}</div>
          <div style={{fontSize:10,color:"var(--text-muted)",marginTop:4}}>+{fmt(totalRec)} / -{fmt(totalDes)}</div>
        </div>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#059669",marginBottom:4}}>Receitas {ano}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#059669"}}>{fmt(totalRec)}</div>
        </div>
        <div className="card" style={{padding:18}}>
          <div style={{fontSize:11,fontWeight:600,color:"#dc2626",marginBottom:4}}>Despesas {ano}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#dc2626"}}>{fmt(totalDes)}</div>
        </div>
        <div className="card" style={{padding:18,background:"#fffbeb",border:"1px solid #fde68a"}}>
          <div style={{fontSize:11,fontWeight:600,color:"#d97706",marginBottom:4}}>Pendente {ano}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#d97706"}}>{fmt(totalPend)}</div>
        </div>
      </div>

      {/* GRÁFICO — clicável por mês */}
      <div className="card" style={{padding:20,marginBottom:24}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>📊 Receitas vs Despesas — {ano}</div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:16}}>Clique em um mês para ver o detalhamento abaixo</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:4,overflowX:"auto",paddingBottom:8}}>
          {grafico.map((g)=>{
            const hRec = maxVal>0?(g.rec/maxVal)*altBar:0;
            const hDes = maxVal>0?(g.des/maxVal)*altBar:0;
            const sel = g.mes===mesSel;
            const temDados = g.rec>0||g.des>0;
            return (
              <div key={g.mes} onClick={()=>setMesSel(g.mes)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:52,flex:1,cursor:"pointer",padding:"6px 4px",borderRadius:8,background:sel?"#f3f0ff":"transparent",border:sel?"2px solid var(--purple)":"2px solid transparent",transition:".15s"}}>
                <div style={{display:"flex",alignItems:"flex-end",gap:3,height:altBar}}>
                  <div title={`Receitas: ${fmt(g.rec)}`} style={{width:18,height:Math.max(hRec,2),background:"#059669",borderRadius:"4px 4px 0 0",opacity:temDados?1:0.15}}/>
                  <div title={`Despesas: ${fmt(g.des)}`} style={{width:18,height:Math.max(hDes,2),background:"#dc2626",borderRadius:"4px 4px 0 0",opacity:temDados?1:0.15}}/>
                </div>
                {temDados&&<div style={{fontSize:9,fontWeight:700,color:g.saldo>=0?"#059669":"#dc2626",whiteSpace:"nowrap"}}>{g.saldo>=0?"+":""}{fmt(g.saldo).replace("R$","").trim()}</div>}
                <div style={{fontSize:11,color:sel?"var(--purple)":"var(--text-muted)",fontWeight:sel?700:400}}>{mesLabel(g.mes)}</div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:16,marginTop:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><div style={{width:12,height:12,background:"#059669",borderRadius:3}}/> Receitas</div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><div style={{width:12,height:12,background:"#dc2626",borderRadius:3}}/> Despesas</div>
        </div>
      </div>

      {/* DETALHAMENTO DO MÊS SELECIONADO */}
      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:24,border:"2px solid var(--purple)"}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-100)",fontWeight:700,fontSize:14,background:"#f3f0ff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>📅 {mesLabel(mesSel,true).charAt(0).toUpperCase()+mesLabel(mesSel,true).slice(1)} de {mesSel.slice(0,4)}</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{ const idx=mesesAno.indexOf(mesSel); if(idx>0)setMesSel(mesesAno[idx-1]); }} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="chevron-left" size={13}/></button>
            <button onClick={()=>{ const idx=mesesAno.indexOf(mesSel); if(idx<mesesAno.length-1)setMesSel(mesesAno[idx+1]); }} style={{background:"var(--purple)",color:"white",border:"none",borderRadius:"50%",width:26,height:26,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="chevron-right" size={13}/></button>
          </div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"var(--gray-50)"}}>
            {["Financeiro","Receitas","Despesas","Saldo"].map(h=>(
              <th key={h} style={{padding:"10px 20px",fontSize:11,fontWeight:600,color:"var(--text-muted)",textAlign:"left",borderBottom:"1px solid var(--gray-200)"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[
              {label:"🏥 Clínica", rec:mCl.rec, des:mCl.des},
              {label:"🏠 Pessoal", rec:mPs.rec, des:mPs.des},
              {label:"🏢 Empresa", rec:mEm.rec, des:mEm.des},
            ].map((row,i)=>{
              const saldo=row.rec-row.des;
              return (
                <tr key={i} style={{borderBottom:"1px solid var(--gray-100)"}}>
                  <td style={{padding:"12px 20px",fontWeight:600,fontSize:14}}>{row.label}</td>
                  <td style={{padding:"12px 20px",color:"#059669",fontWeight:700}}>{fmt(row.rec)}</td>
                  <td style={{padding:"12px 20px",color:"#dc2626",fontWeight:700}}>{fmt(row.des)}</td>
                  <td style={{padding:"12px 20px",color:saldo>=0?"#059669":"#dc2626",fontWeight:700,fontSize:15}}>{fmt(saldo)}</td>
                </tr>
              );
            })}
            <tr style={{background:"#f3f0ff",borderTop:"2px solid var(--purple)"}}>
              <td style={{padding:"12px 20px",fontWeight:700,fontSize:14}}>TOTAL DO MÊS</td>
              <td style={{padding:"12px 20px",color:"#059669",fontWeight:700,fontSize:15}}>{fmt(mesRec)}</td>
              <td style={{padding:"12px 20px",color:"#dc2626",fontWeight:700,fontSize:15}}>{fmt(mesDes)}</td>
              <td style={{padding:"12px 20px",color:mesSaldo>=0?"#059669":"#dc2626",fontWeight:700,fontSize:16}}>{fmt(mesSaldo)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* RESUMO ANUAL */}
      <div className="card" style={{padding:0,overflow:"hidden",marginBottom:24}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid var(--gray-100)",fontWeight:700,fontSize:14}}>📋 Resumo Anual — {ano}</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:"var(--gray-50)"}}>
            {["Financeiro","Receitas","Despesas","Saldo"].map(h=>(
              <th key={h} style={{padding:"10px 20px",fontSize:11,fontWeight:600,color:"var(--text-muted)",textAlign:"left",borderBottom:"1px solid var(--gray-200)"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[
              {label:"🏥 Clínica", rec:aCl.rec, des:aCl.des},
              {label:"🏠 Pessoal", rec:aPs.rec, des:aPs.des},
              {label:"🏢 Empresa", rec:aEm.rec, des:aEm.des},
            ].map((row,i)=>{
              const saldo=row.rec-row.des;
              return (
                <tr key={i} style={{borderBottom:"1px solid var(--gray-100)"}}>
                  <td style={{padding:"12px 20px",fontWeight:600,fontSize:14}}>{row.label}</td>
                  <td style={{padding:"12px 20px",color:"#059669",fontWeight:700}}>{fmt(row.rec)}</td>
                  <td style={{padding:"12px 20px",color:"#dc2626",fontWeight:700}}>{fmt(row.des)}</td>
                  <td style={{padding:"12px 20px",color:saldo>=0?"#059669":"#dc2626",fontWeight:700,fontSize:15}}>{fmt(saldo)}</td>
                </tr>
              );
            })}
            <tr style={{background:"var(--gray-50)",borderTop:"2px solid var(--gray-200)"}}>
              <td style={{padding:"12px 20px",fontWeight:700,fontSize:14}}>TOTAL</td>
              <td style={{padding:"12px 20px",color:"#059669",fontWeight:700,fontSize:15}}>{fmt(totalRec)}</td>
              <td style={{padding:"12px 20px",color:"#dc2626",fontWeight:700,fontSize:15}}>{fmt(totalDes)}</td>
              <td style={{padding:"12px 20px",color:totalSaldo>=0?"#059669":"#dc2626",fontWeight:700,fontSize:16}}>{fmt(totalSaldo)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════
// ALUNOS EM SUPERVISÃO
// ═══════════════════════════════════════════════════════
