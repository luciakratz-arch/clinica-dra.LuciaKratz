// financeiro.js — Módulo Financeiro da Clínica Dra. Lucia Kratz
// CRP 09/20590 · Simples Nacional · Fator R
// Depende de: firebase (db), React, Icon, fmtDataHora, dispararNotificacao
// Carregar APÓS app.js no index.html

function FinanceiroClinica({
  user
}) {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  const [lancamentos, setLancamentos] = useState([]);
  const [pacotes, setPacotes] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear() + "");
  const [filtroCentro, setFiltroCentro] = useState(user?.tipo === "secretaria" ? "clinica" : "todos");
  const [periodoCard, setPeriodoCard] = useState("mes");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [pacoteSelecionado, setPacoteSelecionado] = useState(null);
  const [modalExcluir, setModalExcluir] = useState(null);
  const [modalExcluirLanc, setModalExcluirLanc] = useState(null);
  const [aba, setAba] = useState("lancamentos");
  const [buscaPac, setBuscaPac] = useState("");
  const FORMAS = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Depósito", "Transferência", "Outro"];
  const RECORRENCIAS = ["Semanal (1x/semana)", "2x por semana", "3x por semana", "Quinzenal", "Mensal", "Sessão única"];
  const DIAS_LABEL = {
    0: "Dom",
    1: "Seg",
    2: "Ter",
    3: "Qua",
    4: "Qui",
    5: "Sex",
    6: "Sáb"
  };

  // ── Centros de Custo — dinâmicos (Firebase) com fallback padrão ──
  const CENTROS_PADRAO = [{
    id: "clinica",
    label: "🏥 Clínica",
    cor: "#7B00C4",
    bg: "#f5f3ff",
    fixo: true
  }, {
    id: "onix",
    label: "🎵 Ônix Brasil",
    cor: "#0891b2",
    bg: "#e0f2fe",
    fixo: true
  }, {
    id: "flamboyant",
    label: "🎶 Flamboyant",
    cor: "#ec4899",
    bg: "#fdf2f8",
    fixo: true
  }, {
    id: "estrelas",
    label: "⭐ Estrelas do Cerrado",
    cor: "#d97706",
    bg: "#fef3c7",
    fixo: true
  }, {
    id: "cultural",
    label: "🌱 Projetos Culturais",
    cor: "#16a34a",
    bg: "#dcfce7",
    fixo: true
  }, {
    id: "cursos",
    label: "📚 Consultorias & Cursos",
    cor: "#0891b2",
    bg: "#eff6ff",
    fixo: true
  }, {
    id: "admin",
    label: "🏢 Administrativo",
    cor: "#6b7280",
    bg: "#f3f4f6",
    fixo: true
  }];
  const [centrosCustom, setCentrosCustom] = useState([]);
  const [modalCentro, setModalCentro] = useState(false);
  const [formCentro, setFormCentro] = useState({
    label: "",
    cor: "#7B00C4",
    bg: "#f5f3ff"
  });
  const [editCentroId, setEditCentroId] = useState(null);
  const CENTROS = [...CENTROS_PADRAO, ...centrosCustom];
  // Secretária vê apenas Clínica — filtro travado
  const isPsicologa = user?.tipo === "psicologa";
  const centrosVisiveis = isPsicologa ? CENTROS : CENTROS.filter(c => c.id === "clinica");
  const [formAvulso, setFormAvulso] = useState({
    pacienteId: "",
    tipo: "Consulta",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    formaPag: "PIX",
    status: "pendente",
    obs: "",
    centroCusto: "clinica"
  });
  // ── Painel Fiscal ────────────────────────────────────────────────────
  const [proLabore, setProLabore] = useState(1518);
  const [modalNF, setModalNF] = useState(null); // {lancId, linkAtual}
  const [linkNF, setLinkNF] = useState("");
  // Estado dedicado para edição de despesas
  const CATS_DESPESA = ["Aluguel", "Condomínio", "Marketing", "Salários", "Investimentos", "Musicoterapia", "Ferramentas de IA", "Telefone/Internet", "Contador", "Impostos", "Outros"];
  const [formDespesaEdit, setFormDespesaEdit] = useState({
    descricao: "",
    categoria: "",
    valor: "",
    data: "",
    formaPag: "",
    status: "pago",
    obs: ""
  });
  // ── Painel de higienização ────────────
  const [modalAuditoria, setModalAuditoria] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [auditando, setAuditando] = useState(false);
  const [formPacote, setFormPacote] = useState({
    pacienteId: "",
    totalSessoes: "",
    valorSessao: "",
    recorrencia: "Semanal (1x/semana)",
    dataInicio: "",
    horario: "09:00",
    modalidade: "on-line",
    diasSemana: [],
    horariosPorDia: {},
    statusPag: "pendente",
    formaPag: "",
    dataPagamento: "",
    pagamentosExtras: [],
    obs: "",
    parceiraId: "",
    percParceiro: "70"
  });
  const [parceiras, setParceiras] = useState([]);
  const [modalEditarPacote, setModalEditarPacote] = useState(null); // {pacote}
  const [formEdicaoPacote, setFormEdicaoPacote] = useState({});
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  useEffect(() => {
    const unsub = db.collection("clinica_centros_custo").onSnapshot(snap => {
      setCentrosCustom(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        fixo: false
      })));
    }, () => {});
    return () => unsub();
  }, []);
  useEffect(() => {
    const u1 = db.collection("clinica_lancamentos").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
      setLancamentos(docs);
    }, () => {});
    const u2 = db.collection("clinica_pacotes").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setPacotes(docs);
    }, () => {});
    const u3 = db.collection("clinica_sessoes").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (a.data || "").localeCompare(b.data || ""));
      setSessoes(docs);
    }, () => {});
    const u4 = db.collection("clinica_parceiras").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setParceiras(docs);
    }, () => {});
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, []);
  const getPacNome = id => pacientes.find(p => p.id === id)?.nome || "—";

  // Anos disponíveis
  const anosDisp = [...new Set(lancamentos.map(l => l.data?.slice(0, 4)).filter(Boolean))].sort().reverse();
  if (!anosDisp.includes(anoFiltro)) anosDisp.unshift(anoFiltro);

  // Meses do ano selecionado — sempre Jan (01) → Dez (12)
  const mesAtual = new Date().toISOString().slice(0, 7);
  const mesesDisp = Array.from({
    length: 12
  }, (_, i) => `${anoFiltro}-${String(i + 1).padStart(2, "0")}`);

  // Se mesFiltro não pertence ao anoFiltro, corrige para mês atual
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro) ? mesFiltro : mesAtual.startsWith(anoFiltro) ? mesAtual : anoFiltro + "-01";

  // Cards do topo — mês atual do ano selecionado, fixo
  const mesCards = anoFiltro + "-" + new Date().toISOString().slice(5, 7);
  const lancMesCards = lancamentos.filter(l => l.data?.startsWith(mesCards));
  const lancMesBruto = lancamentos.filter(l => l.data?.startsWith(mesFiltroEfetivo));
  const lancMes = filtroCentro === "todos" ? lancMesBruto : lancMesBruto.filter(l => (l.centroCusto || "clinica") === filtroCentro);
  const lancAno = lancamentos.filter(l => l.data?.startsWith(anoFiltro));
  const lancPeriodo = periodoCard === "mes" ? lancMesCards : lancAno;

  // Métricas por período selecionado nos cards
  // Receitas somam, despesas deduzem
  function calcSaldo(lista) {
    return lista.reduce((a, l) => {
      const v = parseFloat(l.valor) || 0;
      return l.tipo_lancamento === "despesa" ? a - v : a + v;
    }, 0);
  }
  function calcReceitas(lista) {
    return lista.filter(l => l.tipo_lancamento !== "despesa").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  }
  function calcDespesas(lista) {
    return lista.filter(l => l.tipo_lancamento === "despesa").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  }
  const totalRecebidoPeriodo = calcSaldo(lancPeriodo.filter(l => l.status === "recebido" || l.status === "pago"));
  const totalRecebidoMes = calcSaldo(lancMes.filter(l => l.status === "recebido" || l.status === "pago"));
  const totalPendente = calcReceitas(lancamentos.filter(l => l.status === "pendente" && l.data?.startsWith(anoFiltro)));
  const mesAtualLabel = new Date(mesCards + "-15").toLocaleDateString("pt-BR", {
    month: "short"
  });

  // Salvar lançamento avulso — ETAPA 2: UPDATE obrigatório quando editando
  async function salvarAvulso(tipoVenda) {
    if (!formAvulso.valor || !formAvulso.data) {
      alert("Valor e data obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const pac = pacientes.find(p => p.id === formAvulso.pacienteId);
      const dados = {
        ...formAvulso,
        valor: parseFloat(formAvulso.valor),
        pacienteNome: pac?.nome || ""
      };
      if (editando) {
        // ── ETAPA 2: GUARD — verifica se o contexto ainda existe antes de salvar
        const docSnap = await db.collection("clinica_lancamentos").doc(editando).get();
        if (!docSnap.exists) {
          alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
          setModal(false);
          setEditando(null);
          setSalvando(false);
          return;
        }
        // UPDATE cirúrgico — nunca gera novo INSERT
        await db.collection("clinica_lancamentos").doc(editando).update({
          ...dados,
          centroCusto: formAvulso.centroCusto || "clinica",
          _editadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Novo lançamento — INSERT legítimo
        await db.collection("clinica_lancamentos").add({
          ...dados,
          tipo_lancamento: "avulso",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (formAvulso.status === "pendente") {
          await dispararNotificacao({
            tipo: "pagamento_pendente",
            titulo: `Pagamento pendente — ${pac?.nome || "Paciente"}`,
            corpo: `R$ ${parseFloat(formAvulso.valor).toFixed(2).replace(".", ",")} · ${formAvulso.tipo} · ${formAvulso.data?.split("-").reverse().join("/") || ""}`,
            pacienteId: formAvulso.pacienteId
          });
        }
        if (tipoVenda) await registrarComissao({
          tipo: "Sessão Avulsa",
          valor: parseFloat(formAvulso.valor),
          pacienteNome: pac?.nome || "",
          tipoVenda
        });
      }
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    }
    setModal(false);
    setEditando(null);
    setFormAvulso({
      pacienteId: "",
      tipo: "Consulta",
      valor: "",
      data: new Date().toISOString().slice(0, 10),
      formaPag: "PIX",
      status: "pendente",
      obs: ""
    });
    setSalvando(false);
  }
  function abrirEditar(l) {
    // ── ETAPA 2: bifurca entre receita e despesa
    if (l.tipo_lancamento === "despesa") {
      setFormDespesaEdit({
        descricao: l.descricao || l.tipo || "",
        categoria: l.categoria || "",
        valor: l.valor + "",
        data: l.data || "",
        formaPag: l.formaPag || "",
        status: l.status || "pago",
        obs: l.obs || "",
        centroCusto: l.centroCusto || "admin"
      });
      setEditando(l.id);
      setModal("editar-despesa");
    } else {
      setFormAvulso({
        pacienteId: l.pacienteId || "",
        tipo: l.tipo || "Consulta",
        valor: l.valor + "",
        data: l.data || "",
        formaPag: l.formaPag || "PIX",
        status: l.status || "pendente",
        obs: l.obs || "",
        categoria: l.categoria || "",
        descricao: l.descricao || "",
        centroCusto: l.centroCusto || "clinica"
      });
      setEditando(l.id);
      setModal("avulso");
    }
  }
  async function excluirLanc(id) {
    if (!confirm("Excluir lançamento?")) return;
    await db.collection("clinica_lancamentos").doc(id).delete();
  }

  // ── Salvar edição de DESPESA — UPDATE obrigatório, nunca INSERT
  async function salvarDespesaEdit() {
    if (!formDespesaEdit.valor || !formDespesaEdit.data) {
      alert("Valor e data obrigatórios.");
      return;
    }
    if (!editando) {
      alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
      return;
    }
    setSalvando(true);
    try {
      const docSnap = await db.collection("clinica_lancamentos").doc(editando).get();
      if (!docSnap.exists) {
        alert("Desculpe, perdi o contexto da edição. Por favor, clique no lápis novamente.");
        setModal(false);
        setEditando(null);
        setSalvando(false);
        return;
      }
      await db.collection("clinica_lancamentos").doc(editando).update({
        descricao: formDespesaEdit.descricao,
        categoria: formDespesaEdit.categoria,
        centroCusto: formDespesaEdit.centroCusto || "admin",
        valor: parseFloat(formDespesaEdit.valor),
        data: formDespesaEdit.data,
        formaPag: formDespesaEdit.formaPag,
        status: formDespesaEdit.status,
        obs: formDespesaEdit.obs,
        tipo_lancamento: "despesa",
        _editadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    }
    setModal(false);
    setEditando(null);
    setSalvando(false);
  }

  // ── ETAPA 3: FONTE ÚNICA DA VERDADE ─────────────────────────────────────
  // Dar baixa em um pacote:
  //   1. Atualiza o documento do pacote (statusPag, valorPago, valorPendente)
  //   2. Marca todas as sessões filhas como pagas em batch
  //   3. Garante que existe EXATAMENTE 1 lançamento vinculado (sem criar duplicata)
  async function marcarPacotePago(pacoteId, formaPag) {
    const sessPac = sessoes.filter(s => s.pacoteId === pacoteId);
    const pacote = pacotes.find(p => p.id === pacoteId);
    if (!pacote) return;
    const hoje = new Date().toISOString().slice(0, 10);
    const vTotal = parseFloat(pacote.valorTotal || 0);
    const extras = pacote.pagamentosExtras || [];
    const totalExtras = extras.reduce((a, pg) => a + (parseFloat(pg.valor) || 0), 0);
    const valorPagoFinal = totalExtras > 0 ? totalExtras : vTotal;
    const valorPendenteFinal = Math.max(0, vTotal - valorPagoFinal);
    const batch = db.batch();

    // 1. Atualiza o pacote — recalcula a matriz financeira
    batch.update(db.collection("clinica_pacotes").doc(pacoteId), {
      statusPag: "recebido",
      formaPag,
      dataPagamento: hoje,
      valorPago: valorPagoFinal,
      valorPendente: valorPendenteFinal,
      _sincronizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Atualiza todas as sessões filhas
    const valorPorSessao = sessPac.length > 0 ? parseFloat((valorPagoFinal / sessPac.length).toFixed(2)) : pacote.valorSessao || 0;
    sessPac.forEach(s => {
      batch.update(db.collection("clinica_sessoes").doc(s.id), {
        pagamento: "pago",
        formaPagamento: formaPag,
        dataPagamento: hoje,
        valorPago: parseFloat(s.valorPago || 0) > 0 ? s.valorPago : valorPorSessao,
        statusFinanceiro: "pago"
      });
    });

    // 3. Atualiza lançamento existente OU cria exatamente 1 novo (evita duplicata)
    const lancExistente = lancamentos.find(l => l.pacoteId === pacoteId);
    if (lancExistente) {
      batch.update(db.collection("clinica_lancamentos").doc(lancExistente.id), {
        status: "recebido",
        formaPag,
        dataPagamento: hoje,
        valor: valorPagoFinal,
        valorPendente: valorPendenteFinal
      });
    } else {
      // Gera lançamento apenas se não existe nenhum para este pacote
      const pac = pacientes.find(p => p.id === pacote.pacienteId);
      const mes = new Date(pacote.dataInicio + "T00:00:00").toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
      });
      const desc = `${pac?.nome || pacote.pacienteNome || "Paciente"} — Pacote ${pacote.totalSessoes || ""} Sessões — ${mes.charAt(0).toUpperCase() + mes.slice(1)}`;
      batch.set(db.collection("clinica_lancamentos").doc(), {
        tipo_lancamento: "pacote",
        pacoteId,
        pacienteId: pacote.pacienteId,
        pacienteNome: pac?.nome || pacote.pacienteNome || "",
        tipo: desc,
        descricao: desc,
        valor: valorPagoFinal,
        valorPendente: valorPendenteFinal,
        data: hoje,
        formaPag,
        status: "recebido",
        dataPagamento: hoje,
        pagamentosExtras: extras,
        totalSessoes: pacote.totalSessoes,
        valorSessao: pacote.valorSessao,
        centroCusto: pacote.centroCusto || "clinica",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch.commit();
  }

  // Geração de datas recorrentes
  function gerarDatas(dataInicio, recorrencia, total, diasSemana) {
    if (recorrencia === "Sessão única") return [dataInicio];
    const datas = [];
    if (["Semanal (1x/semana)", "Quinzenal", "Mensal"].includes(recorrencia)) {
      let atual = new Date(dataInicio + "T00:00:00");
      while (datas.length < total) {
        datas.push(atual.toISOString().split("T")[0]);
        if (recorrencia === "Semanal (1x/semana)") atual.setDate(atual.getDate() + 7);else if (recorrencia === "Quinzenal") atual.setDate(atual.getDate() + 14);else atual.setMonth(atual.getMonth() + 1);
      }
      return datas.slice(0, total);
    }
    // 2x ou 3x por semana
    const dias = (diasSemana || []).map(Number).sort();
    if (!dias.length) return [];
    let atual = new Date(dataInicio + "T00:00:00");
    const fim = new Date(atual);
    fim.setFullYear(fim.getFullYear() + 2);
    while (datas.length < total && atual < fim) {
      if (dias.includes(atual.getDay())) datas.push(atual.toISOString().split("T")[0]);
      atual.setDate(atual.getDate() + 1);
    }
    return datas.slice(0, total);
  }
  async function registrarComissao({
    tipo,
    valor,
    pacienteNome,
    tipoVenda,
    pacoteId = null
  }) {
    const cfg = typeof getConfigFin === "function" ? await getConfigFin() : {
      percPrimeira: 10,
      percRecorrente: 5
    };
    const percNum = tipoVenda === "primeira" ? parseFloat(cfg.percPrimeira) || 10 : parseFloat(cfg.percRecorrente) || 5;
    const perc = percNum / 100;
    const valorComissao = parseFloat((valor * perc).toFixed(2));
    const hoje = new Date();
    const mesRef = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    await db.collection("clinica_comissoes").add({
      tipo,
      tipoVenda,
      perc: percNum,
      valorBase: valor,
      valorComissao,
      pacienteNome,
      mesRef,
      pacoteId: pacoteId || null,
      status: "pendente",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  async function salvarPacote(tipoVenda) {
    const {
      pacienteId,
      totalSessoes,
      valorSessao,
      recorrencia,
      dataInicio,
      horario,
      diasSemana,
      horariosPorDia,
      obs
    } = formPacote;
    if (!pacienteId || !totalSessoes || !dataInicio) {
      alert("Paciente, nº de sessões e data de início obrigatórios.");
      return;
    }
    const needDias = ["2x por semana", "3x por semana"].includes(recorrencia);
    if (needDias && (!diasSemana || diasSemana.length === 0)) {
      alert("Selecione os dias da semana.");
      return;
    }
    const eParceria = (formPacote.tipoAtendimento || "particular") === "parceria";
    if (eParceria && !formPacote.parceiraId) {
      alert("Selecione a parceira para a venda em parceria.");
      return;
    }
    setSalvando(true);
    const pac = pacientes.find(p => p.id === pacienteId);
    const total = parseInt(totalSessoes) || 1;
    const vSessao = parseFloat(valorSessao) || 0;
    const vTotal = vSessao * total;
    const datas = gerarDatas(dataInicio, recorrencia, total, diasSemana);
    const parcSel = eParceria ? parceiras.find(p => p.id === formPacote.parceiraId) : null;
    const percParc = eParceria ? parseFloat(formPacote.percParceiro) || 70 : 0;

    // Cria pacote
    const pacRef = await db.collection("clinica_pacotes").add({
      pacienteId,
      pacienteNome: pac?.nome || "",
      totalSessoes: total,
      valorSessao: vSessao,
      valorTotal: vTotal,
      recorrencia,
      dataInicio,
      horario,
      modalidade: formPacote.modalidade || "on-line",
      diasSemana: diasSemana || [],
      horariosPorDia: horariosPorDia || {},
      obs,
      tipoAtendimento: formPacote.tipoAtendimento || "particular",
      parceiraId: eParceria ? formPacote.parceiraId : null,
      parceiraNome: eParceria ? parcSel?.nome || "" : null,
      percParceiro: eParceria ? percParc : null,
      statusPag: formPacote.statusPag || "pendente",
      formaPag: formPacote.formaPag || "",
      dataPagamento: formPacote.dataPagamento || "",
      pagamentosExtras: formPacote.pagamentosExtras || [],
      status: "ativo",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Cria lançamento financeiro do pacote
    const mesInicioPacote = new Date(dataInicio + "T00:00:00").toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
    const nomePacote = `Pacote ${total} Sessões`;
    const descricaoLanc = `${pac?.nome || "Paciente"} — ${nomePacote} — ${mesInicioPacote.charAt(0).toUpperCase() + mesInicioPacote.slice(1)}`;
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "pacote",
      pacoteId: pacRef.id,
      pacienteId,
      pacienteNome: pac?.nome || "",
      tipo: descricaoLanc,
      descricao: descricaoLanc,
      valor: vTotal,
      data: dataInicio,
      formaPag: formPacote.formaPag || "",
      status: formPacote.statusPag || "pendente",
      dataPagamento: formPacote.dataPagamento || "",
      pagamentosExtras: formPacote.pagamentosExtras || [],
      obs,
      totalSessoes: total,
      valorSessao: vSessao,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Registra comissão da secretária
    if (tipoVenda) await registrarComissao({
      tipo: "Pacote",
      valor: vTotal,
      pacienteNome: pac?.nome || "",
      tipoVenda,
      pacoteId: pacRef.id
    });

    // Registra repasse da parceira (venda em parceria)
    if (eParceria && parcSel) {
      const vParceira = parseFloat((vTotal * percParc / 100).toFixed(2));
      const mesRefParc = new Date().toISOString().slice(0, 7);
      await db.collection("clinica_comissoes").add({
        tipo: "Parceria — Repasse",
        tipoVenda: null,
        perc: percParc,
        valorBase: vTotal,
        valorComissao: vParceira,
        pacienteNome: pac?.nome || "",
        responsavel: parcSel.nome || "Parceira",
        parceiraId: parcSel.id,
        mesRef: mesRefParc,
        pacoteId: pacRef.id,
        status: "pendente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    // Cria sessões na agenda
    const jaPago = (formPacote.statusPag || "pendente") === "recebido";
    const batch = db.batch();
    datas.forEach((data, i) => {
      const ref = db.collection("clinica_sessoes").doc();
      const dia = new Date(data + "T00:00:00").getDay().toString();
      const horaDia = (horariosPorDia || {})[dia] || horario;
      batch.set(ref, {
        pacienteId,
        pacienteNome: pac?.nome || "",
        data,
        hora: horaDia,
        duracao: "50",
        tipo: "Psicoterapia",
        status: "agendado",
        numSessao: i + 1,
        pacoteId: pacRef.id,
        valorSessao: vSessao,
        pagamento: jaPago ? "pago" : "pendente",
        valorPago: jaPago ? vSessao : 0,
        formaPagamento: formPacote.formaPag || "",
        dataPagamento: jaPago ? formPacote.dataPagamento || new Date().toISOString().slice(0, 10) : "",
        obs: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    // Social: lança comissão estagiária automaticamente
    if ((formPacote.tipoAtendimento || "particular") === "social") {
      const hoje = new Date().toISOString().slice(0, 10);
      const mesRef = hoje.slice(0, 7);
      const vSupervisao = parseFloat(formPacote.valorSupervisaoSocial || 40);
      const vEstagiaria = parseFloat(formPacote.valorEstagiariaSocial || 20);
      const snapEst = await db.collection("clinica_parceiras").where("tipo", "==", "estagiaria").limit(1).get();
      const nomeEst = !snapEst.empty ? snapEst.docs[0].data().nome : "Estagiária";
      const batchSoc = db.batch();
      batchSoc.set(db.collection("clinica_lancamentos").doc(), {
        tipo_lancamento: "social",
        tipo: `${pac?.nome || ""} — Projeto Social`,
        descricao: `${pac?.nome || ""} — Projeto Social`,
        pacienteNome: pac?.nome || "",
        valor: vSupervisao,
        data: dataInicio,
        mesRef,
        formaPag: formPacote.formaPag || "PIX",
        status: formPacote.statusPag || "pendente",
        origem: "pacote-social",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      batchSoc.set(db.collection("clinica_comissoes").doc(), {
        tipo: "Social — Estagiária",
        tipoVenda: "primeira",
        perc: 0,
        valorBase: vSupervisao,
        valorComissao: vEstagiaria,
        pacienteNome: pac?.nome || "",
        responsavel: nomeEst,
        mesRef,
        status: "pendente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await batchSoc.commit();
    }
    setModal(false);
    setFormPacote({
      pacienteId: "",
      totalSessoes: "",
      valorSessao: "",
      recorrencia: "Semanal (1x/semana)",
      dataInicio: "",
      horario: "09:00",
      modalidade: "on-line",
      diasSemana: [],
      horariosPorDia: {},
      statusPag: "pendente",
      formaPag: "",
      dataPagamento: "",
      pagamentosExtras: [],
      obs: "",
      tipoAtendimento: "particular",
      valorSupervisaoSocial: "40",
      valorEstagiariaSocial: "20",
      parceiraId: "",
      percParceiro: "70"
    });
    setSalvando(false);
    alert(`✅ Pacote criado! ${datas.length} sessões geradas na agenda.`);
  }
  async function atualizarSessao(id, campos) {
    await db.collection("clinica_sessoes").doc(id).update(campos);
  }

  // ── ETAPA 3: Remarcação/Compensação ─────────────────────────────────────
  // Altera APENAS data + status. Jamais toca em valor, pagamento ou lançamentos.
  // Motivo: remarcação por falta ou compensação não gera movimentação financeira.
  async function remarcarSessao(s, novaData, motivo = "remarcacao") {
    if (!novaData) return;
    try {
      await db.collection("clinica_sessoes").doc(s.id).update({
        data: novaData,
        status: "remarcado",
        remarcada: true,
        dataRemarcada: novaData,
        dataOriginal: s.dataOriginal || s.data,
        motivoRemarcacao: motivo // "remarcacao" | "falta" | "compensacao"
        // NÃO altera: pagamento, valorPago, valorSessao, dataPagamento, pacoteId
      });
    } catch (e) {
      console.error("Erro ao remarcar sessão:", e);
      alert("Erro ao remarcar: " + e.message);
    }
  }
  async function confirmarExclusao(tipo) {
    if (!modalExcluir) return;
    const {
      id,
      pacoteId,
      numSessao
    } = modalExcluir;
    try {
      if (tipo === "este") {
        await db.collection("clinica_sessoes").doc(id).delete();
      } else if (tipo === "daqui") {
        const fut = sessoes.filter(s => s.pacoteId === pacoteId && (s.numSessao || 0) >= (numSessao || 0));
        const b = db.batch();
        fut.forEach(s => b.delete(db.collection("clinica_sessoes").doc(s.id)));
        await b.commit();
      } else {
        // Cancelar todo o pacote — exclusão em cascata via query direta (evita dados órfãos)
        const [snapSess, snapLanc] = await Promise.all([db.collection("clinica_sessoes").where("pacoteId", "==", pacoteId).get(), db.collection("clinica_lancamentos").where("pacoteId", "==", pacoteId).get()]);
        const b = db.batch();
        snapSess.docs.forEach(d => b.delete(d.ref));
        snapLanc.docs.forEach(d => b.delete(d.ref));
        b.delete(db.collection("clinica_pacotes").doc(pacoteId));
        await b.commit();
        if (typeof setPacoteSelecionado === "function") setPacoteSelecionado(null);
      }
    } catch (e) {
      console.error("Erro ao excluir sessão/pacote:", e);
      alert("Erro ao excluir: " + e.message);
    }
    setModalExcluir(null);
  }
  if (pacoteSelecionado) {
    // Modo ver sessões (id__sessoes)
    if (pacoteSelecionado.endsWith("__sessoes")) {
      const pacoteId = pacoteSelecionado.replace("__sessoes", "");
      return /*#__PURE__*/React.createElement(RelatorioFrequencia, {
        pacienteId: null,
        pacoteId: pacoteId,
        pacientes: pacientes,
        sessoes: sessoes,
        pacotes: pacotes,
        lancamentos: lancamentos,
        FORMAS: FORMAS,
        onVoltar: () => setPacoteSelecionado(null)
      });
    }
    // Modo editar pacote individual (id__pacote) — abre modal de edição
    if (pacoteSelecionado.endsWith("__pacote")) {
      const pacoteId = pacoteSelecionado.replace("__pacote", "");
      const pacoteAlvo = pacotes.find(p => p.id === pacoteId);
      if (pacoteAlvo && !modalEditarPacote) {
        setModalEditarPacote(pacoteAlvo);
        setFormEdicaoPacote({
          pacienteId: pacoteAlvo.pacienteId || "",
          totalSessoes: pacoteAlvo.totalSessoes || "",
          valorSessao: pacoteAlvo.valorSessao || "",
          recorrencia: pacoteAlvo.recorrencia || "Semanal (1x/semana)",
          dataInicio: pacoteAlvo.dataInicio || "",
          horario: pacoteAlvo.horario || "09:00",
          modalidade: pacoteAlvo.modalidade || "on-line",
          statusPag: pacoteAlvo.statusPag || "pendente",
          formaPag: pacoteAlvo.formaPag || "",
          dataPagamento: pacoteAlvo.dataPagamento || "",
          pagamentosExtras: pacoteAlvo.pagamentosExtras || [],
          obs: pacoteAlvo.obs || "",
          centroCusto: pacoteAlvo.centroCusto || "clinica"
        });
        setPacoteSelecionado(null);
      }
    }
    // Modo controle geral do paciente (pacienteId)
    return /*#__PURE__*/React.createElement(RelatorioFrequencia, {
      pacienteId: pacoteSelecionado,
      pacoteId: null,
      pacientes: pacientes,
      sessoes: sessoes,
      pacotes: pacotes,
      lancamentos: lancamentos,
      FORMAS: FORMAS,
      onVoltar: () => setPacoteSelecionado(null)
    });
  }

  // Função salvar edição do pacote — v2 (sync financeiro + pagamentosExtras + try/catch robusto)
  async function salvarEdicaoPacote() {
    if (!modalEditarPacote) return;
    setSalvandoEdicao(true);
    try {
      const f = formEdicaoPacote;
      const jaPago = (f.statusPag || "pendente") === "recebido";
      const novoTotalSessoes = parseInt(f.totalSessoes) || modalEditarPacote.totalSessoes;
      const novoValorSessao = parseFloat(f.valorSessao) || modalEditarPacote.valorSessao;
      const novoValorTotal = novoTotalSessoes * novoValorSessao;
      const dataPagFinal = jaPago ? f.dataPagamento || new Date().toISOString().slice(0, 10) : "";

      // Calcula valorPago por sessão distribuindo pagamentosExtras proporcionalmente
      const extras = f.pagamentosExtras || [];
      const totalExtras = extras.reduce((a, pg) => a + (parseFloat(pg.valor) || 0), 0);
      const totalPagoRef = jaPago ? totalExtras > 0 ? totalExtras : novoValorTotal : 0;
      const valorPagoPorSessao = novoTotalSessoes > 0 ? parseFloat((totalPagoRef / novoTotalSessoes).toFixed(2)) : novoValorSessao;

      // 1. Atualiza o documento do pacote
      await db.collection("clinica_pacotes").doc(modalEditarPacote.id).update({
        totalSessoes: novoTotalSessoes,
        valorSessao: novoValorSessao,
        valorTotal: novoValorTotal,
        centroCusto: f.centroCusto || "clinica",
        recorrencia: f.recorrencia,
        dataInicio: f.dataInicio,
        horario: f.horario,
        modalidade: f.modalidade || "on-line",
        statusPag: f.statusPag,
        formaPag: f.formaPag || "",
        dataPagamento: dataPagFinal,
        pagamentosExtras: extras,
        obs: f.obs || ""
      });

      // 2. Atualiza lançamento financeiro vinculado via query direta
      try {
        const snapLanc = await db.collection("clinica_lancamentos").where("pacoteId", "==", modalEditarPacote.id).get();
        if (!snapLanc.empty) {
          const pacEd = pacientes.find(p => p.id === (modalEditarPacote.pacienteId || ""));
          const mesEd = f.dataInicio ? new Date(f.dataInicio + "T00:00:00").toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
          }) : "";
          const nomePacEd = `Pacote ${novoTotalSessoes} Sessões`;
          const descEd = pacEd ? `${pacEd.nome} — ${nomePacEd} — ${mesEd.charAt(0).toUpperCase() + mesEd.slice(1)}` : snapLanc.docs[0].data().tipo || snapLanc.docs[0].data().descricao || nomePacEd;
          await snapLanc.docs[0].ref.update({
            valor: novoValorTotal,
            totalSessoes: novoTotalSessoes,
            valorSessao: novoValorSessao,
            status: f.statusPag || "pendente",
            formaPag: f.formaPag || "",
            dataPagamento: dataPagFinal,
            pagamentosExtras: extras,
            obs: f.obs || "",
            tipo: descEd,
            descricao: descEd
          });
        }
      } catch (eLanc) {
        console.warn("Aviso: lançamento não atualizado →", eLanc.message);
      }

      // 3. Atualiza sessões filhas em batch
      const snapSess = await db.collection("clinica_sessoes").where("pacoteId", "==", modalEditarPacote.id).get();
      const sessDoPacote = snapSess.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
      if (sessDoPacote.length > 0) {
        const batch = db.batch();
        sessDoPacote.forEach((s, idx) => {
          if (idx >= novoTotalSessoes) {
            batch.delete(db.collection("clinica_sessoes").doc(s.id));
          } else {
            const campos = {
              valorSessao: novoValorSessao,
              hora: f.horario || s.hora || "",
              modalidade: f.modalidade || s.modalidade || "on-line",
              recorrencia: f.recorrencia || s.recorrencia || ""
            };
            if (jaPago) {
              const vPagoAtual = parseFloat(s.valorPago) || 0;
              campos.pagamento = "pago";
              campos.formaPagamento = f.formaPag || s.formaPagamento || "";
              campos.dataPagamento = dataPagFinal || s.dataPagamento || "";
              campos.valorPago = vPagoAtual > 0 ? vPagoAtual : valorPagoPorSessao;
            } else if (f.statusPag === "pendente" && s.pagamento === "pago") {
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
    } catch (e) {
      console.error("Erro salvarEdicaoPacote:", e);
      alert("Erro ao salvar pacote: " + e.message);
    }
    setSalvandoEdicao(false);
  }

  // Métricas
  const totalRecebido = lancamentos.filter(l => l.status === "recebido").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  async function executarHigienizacao() {
    if (!confirm("⚠️ Confirmar higienização completa?\n\n• Lançamentos de sessão órfãos (de pacotes) serão deletados\n• Duplicatas de Ronei e Heitor serão removidas\n• Lançamentos Sem Nome viram Despesas Administrativas\n\nEssa ação não pode ser desfeita.")) return;
    setAuditando(true);
    const log = [];
    const mesRef = "2026-05";

    // ── PASSO 0: Maior fonte de duplicata — sessões de pacote gerando lançamento próprio
    const ro = await deletarLancamentosOrfaosDeSessao();
    log.push(`Sessões órfãs de pacote: ${ro.ok ? `${ro.deletados} lançamento(s) deletado(s)` : "Erro — " + ro.erro}`);

    // ── PASSO 1: Duplicatas por paciente
    const snapRonei = await db.collection("clinica_pacientes").where("nome", ">=", "Ronei").where("nome", "<=", "Ronei").limit(1).get();
    const snapHeitor = await db.collection("clinica_pacientes").where("nome", ">=", "Heitor").where("nome", "<=", "Heitor").limit(1).get();
    if (!snapRonei.empty) {
      const r = await deletarDuplicatasPaciente(snapRonei.docs[0].id, mesRef);
      log.push(`Ronei: ${r.ok ? `${r.deletados} duplicata(s) removida(s)` : "Erro — " + r.erro}`);
    } else {
      log.push("Ronei: paciente não encontrado");
    }
    if (!snapHeitor.empty) {
      const r = await deletarDuplicatasPaciente(snapHeitor.docs[0].id, mesRef);
      log.push(`Heitor: ${r.ok ? `${r.deletados} duplicata(s) removida(s)` : "Erro — " + r.erro}`);
    } else {
      log.push("Heitor: paciente não encontrado");
    }

    // ── PASSO 2: Categorizar Sem Nome
    const rc = await categorizarSemNome(mesRef);
    log.push(`Sem Nome: ${rc.ok ? `${rc.atualizados} lançamento(s) categorizados` : "Erro — " + rc.erro}`);
    setAuditLog(log);
    setAuditando(false);
  }
  return /*#__PURE__*/React.createElement("div", null, modalAuditoria && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 700,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 480
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      color: "#b45309"
    }
  }, "🔧 Higienização — Maio/2026"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModalAuditoria(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 20
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 20,
      lineHeight: 1.6
    }
  }, "Esta operação irá:", /*#__PURE__*/React.createElement("br", null), "• Deletar ", /*#__PURE__*/React.createElement("b", null, "lançamentos de sessão órfãos"), " — sessões de pacote que geraram lançamento próprio indevido", /*#__PURE__*/React.createElement("br", null), "• Remover duplicatas de ", /*#__PURE__*/React.createElement("b", null, "Ronei"), " e ", /*#__PURE__*/React.createElement("b", null, "Heitor"), /*#__PURE__*/React.createElement("br", null), "• Categorizar ", /*#__PURE__*/React.createElement("b", null, "lançamentos Sem Nome"), " como \"Despesas Administrativas/Clínica\""), auditLog.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #86efac",
      borderRadius: 8,
      padding: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: "#166534",
      marginBottom: 6
    }
  }, "✅ Resultado:"), auditLog.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 12,
      color: "#374151",
      marginBottom: 2
    }
  }, "• ", l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalAuditoria(false)
  }, "Fechar"), auditLog.length === 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      background: "#b45309"
    },
    onClick: executarHigienizacao,
    disabled: auditando
  }, auditando ? "Executando..." : "⚡ Executar Higienização")))), modalNF && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 600,
      padding: 20
    },
    onClick: () => setModalNF(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 460
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      color: "#16a34a"
    }
  }, "🧾 Nota Fiscal"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModalNF(null),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 20,
      color: "#9ca3af"
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Link da Nota Fiscal"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    placeholder: "https://...",
    value: linkNF,
    onChange: e => setLinkNF(e.target.value),
    style: {
      fontFamily: "monospace",
      fontSize: 12
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#9ca3af",
      marginTop: 4
    }
  }, "Cole o link do portal da prefeitura, PDF ou Drive")), modalNF.linkAtual && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: modalNF.linkAtual,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "#f0fdf4",
      border: "1px solid #86efac",
      borderRadius: 8,
      padding: "8px 14px",
      color: "#16a34a",
      fontSize: 12,
      fontWeight: 600,
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external-link",
    size: 13
  }), " Abrir NF atual")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, modalNF.linkAtual && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      color: "#dc2626"
    },
    onClick: async () => {
      await db.collection("clinica_lancamentos").doc(modalNF.lancId).update({
        linkNF: ""
      });
      setModalNF(null);
    }
  }, "🗑️ Remover NF"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalNF(null)
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: async () => {
      if (!linkNF.trim()) {
        alert("Cole o link da NF.");
        return;
      }
      await db.collection("clinica_lancamentos").doc(modalNF.lancId).update({
        linkNF: linkNF.trim()
      });
      setModalNF(null);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "save",
    size: 14
  }), " Salvar")))), modalEditarPacote && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 600,
      padding: 20
    },
    onClick: e => {
      if (e.target === e.currentTarget) setModalEditarPacote(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 560,
      maxHeight: "90vh",
      overflowY: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      color: "var(--purple)"
    }
  }, "✏️ Editar Pacote"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModalEditarPacote(null),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 20,
      color: "var(--gray-400)"
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Nº de Sessões"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formEdicaoPacote.totalSessoes || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      totalSessoes: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Valor por Sessão (R$)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formEdicaoPacote.valorSessao || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      valorSessao: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Data de Início"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formEdicaoPacote.dataInicio || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      dataInicio: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Horário"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "time",
    value: formEdicaoPacote.horario || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      horario: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Modalidade"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formEdicaoPacote.modalidade || "on-line",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      modalidade: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "on-line"
  }, "💻 On-line"), /*#__PURE__*/React.createElement("option", {
    value: "presencial"
  }, "🏥 Presencial"), /*#__PURE__*/React.createElement("option", {
    value: "híbrido"
  }, "🔄 Híbrido"))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Recorrência"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formEdicaoPacote.recorrencia || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      recorrencia: e.target.value
    })
  }, RECORRENCIAS.map(r => /*#__PURE__*/React.createElement("option", {
    key: r
  }, r)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Total do Pacote"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    readOnly: true,
    value: "R$ " + (parseFloat(formEdicaoPacote.valorSessao || 0) * parseInt(formEdicaoPacote.totalSessoes || 0) || 0).toFixed(2).replace(".", ","),
    style: {
      background: "#f9fafb",
      color: "var(--text-muted)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Status do Pagamento"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["pendente", "Pendente", "#d97706"], ["recebido", "✓ Recebido", "#059669"]].map(([v, l, cor]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormEdicaoPacote({
      ...formEdicaoPacote,
      statusPag: v
    }),
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 13,
      fontFamily: "var(--font-body)",
      borderColor: (formEdicaoPacote.statusPag || "pendente") === v ? cor : "#e5e7eb",
      background: (formEdicaoPacote.statusPag || "pendente") === v ? cor + "15" : "white",
      color: (formEdicaoPacote.statusPag || "pendente") === v ? cor : "#6b7280"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento Principal"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formEdicaoPacote.formaPag || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      formaPag: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar..."), FORMAS.map(f => /*#__PURE__*/React.createElement("option", {
    key: f
  }, f)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Data do Pagamento"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formEdicaoPacote.dataPagamento || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      dataPagamento: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      margin: 0
    }
  }, "Formas de pagamento (PIX, cartão, dinheiro em datas diferentes)"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      fontSize: 12,
      color: "#7B00C4",
      background: "#f3e6ff",
      border: "1px solid #d9b3f5",
      borderRadius: 6,
      padding: "4px 12px",
      cursor: "pointer"
    },
    onClick: () => setFormEdicaoPacote({
      ...formEdicaoPacote,
      pagamentosExtras: [...(formEdicaoPacote.pagamentosExtras || []), {
        forma: "",
        valor: "",
        data: new Date().toISOString().slice(0, 10)
      }]
    })
  }, "+ Adicionar forma")), (formEdicaoPacote.pagamentosExtras || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      fontStyle: "italic",
      padding: "6px 0"
    }
  }, "Clique em \"+ Adicionar forma\" para registrar pagamentos parciais ou múltiplas formas."), (formEdicaoPacote.pagamentosExtras || []).map((pg, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr auto",
      gap: 6,
      marginBottom: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    style: {
      fontSize: 12
    },
    value: pg.forma,
    onChange: e => {
      const p = [...(formEdicaoPacote.pagamentosExtras || [])];
      p[i] = {
        ...p[i],
        forma: e.target.value
      };
      setFormEdicaoPacote({
        ...formEdicaoPacote,
        pagamentosExtras: p
      });
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Forma..."), FORMAS.map(f => /*#__PURE__*/React.createElement("option", {
    key: f
  }, f))), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 12
    },
    type: "number",
    placeholder: "Valor R$",
    value: pg.valor,
    onChange: e => {
      const p = [...(formEdicaoPacote.pagamentosExtras || [])];
      p[i] = {
        ...p[i],
        valor: e.target.value
      };
      setFormEdicaoPacote({
        ...formEdicaoPacote,
        pagamentosExtras: p
      });
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 12
    },
    type: "date",
    value: pg.data,
    onChange: e => {
      const p = [...(formEdicaoPacote.pagamentosExtras || [])];
      p[i] = {
        ...p[i],
        data: e.target.value
      };
      setFormEdicaoPacote({
        ...formEdicaoPacote,
        pagamentosExtras: p
      });
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      color: "#dc2626",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 18,
      padding: "0 4px"
    },
    onClick: () => {
      const p = [...(formEdicaoPacote.pagamentosExtras || [])];
      p.splice(i, 1);
      setFormEdicaoPacote({
        ...formEdicaoPacote,
        pagamentosExtras: p
      });
    }
  }, "✕")))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Centro de Custo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, CENTROS.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    type: "button",
    onClick: () => setFormEdicaoPacote({
      ...formEdicaoPacote,
      centroCusto: c.id
    }),
    style: {
      padding: "6px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: (formEdicaoPacote.centroCusto || "clinica") === c.id ? 700 : 400,
      fontFamily: "inherit",
      borderColor: (formEdicaoPacote.centroCusto || "clinica") === c.id ? c.cor : "#e5e7eb",
      background: (formEdicaoPacote.centroCusto || "clinica") === c.id ? c.bg : "white",
      color: (formEdicaoPacote.centroCusto || "clinica") === c.id ? c.cor : "#6b7280",
      transition: "all .15s"
    }
  }, c.label)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Observações"), /*#__PURE__*/React.createElement("textarea", {
    className: "form-input",
    rows: 2,
    value: formEdicaoPacote.obs || "",
    onChange: e => setFormEdicaoPacote({
      ...formEdicaoPacote,
      obs: e.target.value
    }),
    placeholder: "Notas sobre o pacote..."
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalEditarPacote(null)
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarEdicaoPacote,
    disabled: salvandoEdicao
  }, salvandoEdicao ? "Salvando..." : "💾 Salvar alterações")))), /*#__PURE__*/React.createElement("div", {
    className: "page-header",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "page-title"
  }, "Financeiro da Clínica"), /*#__PURE__*/React.createElement("div", {
    className: "page-subtitle"
  }, "Lançamentos, pacotes e controle de sessões")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setModal("escolha")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Novo Lançamento")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, "Ano:"), (() => {
    const anoAtualNum = new Date().getFullYear();
    const anosExist = [...new Set(lancamentos.map(l => l.data?.slice(0, 4)).filter(Boolean))].map(Number);
    // Sempre mostra: todos os anos com dados + ano atual + 1 ano antes e depois do atual
    const anosSet = new Set([...anosExist, anoAtualNum - 1, anoAtualNum, anoAtualNum + 1]);
    // Se houver dados fora dessa janela, eles já estão incluídos via anosExist
    const anos = [...anosSet].sort().map(String);
    return anos.map(a => /*#__PURE__*/React.createElement("button", {
      key: a,
      onClick: () => {
        setAnoFiltro(a);
        setMesFiltro(a === String(anoAtualNum) ? mesAtual : a + "-01");
      },
      style: {
        padding: "5px 16px",
        borderRadius: 20,
        border: "1.5px solid",
        borderColor: anoFiltro === a ? "var(--purple)" : "#e5e7eb",
        background: anoFiltro === a ? "var(--purple)" : "white",
        color: anoFiltro === a ? "white" : "#6b7280",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, a, a === String(anoAtualNum) && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 3,
        fontSize: 9
      }
    }, "●")));
  })()), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setPeriodoCard(p => p === "mes" ? "ano" : "mes"),
    style: {
      background: totalRecebidoPeriodo >= 0 ? "#d1fae5" : "#fee2e2",
      borderRadius: 12,
      padding: "14px 16px",
      textAlign: "center",
      cursor: "pointer",
      border: "1.5px solid",
      borderColor: totalRecebidoPeriodo >= 0 ? "#6ee7b7" : "#fca5a5",
      transition: "all .2s",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 6,
      right: 8,
      fontSize: 10,
      color: totalRecebidoPeriodo >= 0 ? "#059669" : "#dc2626",
      fontWeight: 600,
      background: "white",
      borderRadius: 10,
      padding: "1px 6px"
    }
  }, periodoCard === "mes" ? "mês ↕" : "ano ↕"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: totalRecebidoPeriodo >= 0 ? "#059669" : "#dc2626"
    }
  }, totalRecebidoPeriodo.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: totalRecebidoPeriodo >= 0 ? "#059669" : "#dc2626",
      fontWeight: 500,
      marginTop: 2
    }
  }, "Saldo (", periodoCard === "mes" ? mesAtualLabel : anoFiltro, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#6b7280",
      marginTop: 4
    }
  }, "+", calcReceitas(lancPeriodo).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  }), " / -", calcDespesas(lancPeriodo).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fef3c7",
      borderRadius: 12,
      padding: "14px 16px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#d97706"
    }
  }, totalPendente.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#d97706",
      fontWeight: 500,
      marginTop: 2
    }
  }, "Pendente (", anoFiltro, ")")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple-soft)",
      borderRadius: 12,
      padding: "14px 16px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "var(--purple)"
    }
  }, pacotes.filter(p => p.status === "ativo").length), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--purple)",
      fontWeight: 500,
      marginTop: 2
    }
  }, "Pacotes ativos")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#e0f2fe",
      borderRadius: 12,
      padding: "14px 16px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#0891b2"
    }
  }, lancPeriodo.length), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#0891b2",
      fontWeight: 500,
      marginTop: 2
    }
  }, "Lançamentos (", periodoCard === "mes" ? new Date(mesFiltro + "-15").toLocaleDateString("pt-BR", {
    month: "short"
  }) : anoFiltro, ")"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 0,
      marginBottom: 20,
      borderBottom: "1px solid var(--gray-200)",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
      flexShrink: 0
    }
  }, [["lancamentos", "Lançamentos", "dollar-sign"], ["pacotes", "Pacotes & Sessões", "package"], ["acompanhamento", "Acompanhamento Geral", "users"], ["fiscal", "Fiscal 🧾", "bar-chart-2"]].map(([id, lbl, ic]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setAba(id),
    style: {
      padding: "10px 20px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: 14,
      color: aba === id ? "var(--purple)" : "var(--gray-600)",
      borderBottom: aba === id ? "2px solid var(--purple)" : "2px solid transparent",
      fontWeight: aba === id ? 600 : 400,
      fontFamily: "var(--font-body)",
      marginBottom: -1,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 15
  }), lbl)), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setAuditLog([]);
      setModalAuditoria(true);
    },
    style: {
      marginLeft: "auto",
      padding: "10px 14px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: 12,
      color: "#b45309",
      borderBottom: "2px solid transparent",
      fontWeight: 500,
      fontFamily: "var(--font-body)",
      marginBottom: -1,
      display: "flex",
      alignItems: "center",
      gap: 5,
      flexShrink: 0
    },
    title: "Higienizar duplicatas e lançamentos sem nome — Maio/2026"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "tool",
    size: 13
  }), "🔧 Higienizar")), aba === "lancamentos" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, "Mês:"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const idx = mesesDisp.indexOf(mesFiltroEfetivo);
      if (idx > 0) setMesFiltro(mesesDisp[idx - 1]);
    },
    style: {
      background: "var(--purple)",
      border: "none",
      borderRadius: "50%",
      width: 30,
      height: 30,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: "white",
      fontSize: 16,
      fontWeight: 700
    }
  }, "‹"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      overflowX: "hidden",
      flex: 1
    }
  }, mesesDisp.map(m => {
    const isAtual = m === mesAtual;
    const isSel = m === mesFiltroEfetivo;
    return /*#__PURE__*/React.createElement("button", {
      key: m,
      onClick: () => setMesFiltro(m),
      style: {
        padding: "5px 14px",
        borderRadius: 20,
        border: "1.5px solid",
        flexShrink: 0,
        borderColor: isSel ? "var(--purple)" : isAtual ? "var(--purple)" : "#e5e7eb",
        background: isSel ? "var(--purple)" : "white",
        color: isSel ? "white" : isAtual ? "var(--purple)" : "#6b7280",
        fontSize: 12,
        fontWeight: isSel || isAtual ? 700 : 400,
        cursor: "pointer",
        display: Math.abs(mesesDisp.indexOf(m) - mesesDisp.indexOf(mesFiltroEfetivo)) <= 2 ? "flex" : "none",
        alignItems: "center",
        gap: 4
      }
    }, new Date(m + "-15").toLocaleDateString("pt-BR", {
      month: "long"
    }), isAtual && !isSel && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9
      }
    }, "●"));
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const idx = mesesDisp.indexOf(mesFiltroEfetivo);
      if (idx < mesesDisp.length - 1) setMesFiltro(mesesDisp[idx + 1]);
    },
    style: {
      background: "var(--purple)",
      border: "none",
      borderRadius: "50%",
      width: 30,
      height: 30,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: "white",
      fontSize: 16,
      fontWeight: 700
    }
  }, "›")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 14,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, "Centro:"), (isPsicologa ? [{
    id: "todos",
    label: "Todos",
    cor: "#7B00C4",
    bg: "#f5f3ff"
  }, ...centrosVisiveis] : centrosVisiveis).map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    onClick: () => isPsicologa && setFiltroCentro(c.id),
    style: {
      padding: "4px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      cursor: isPsicologa ? "pointer" : "default",
      fontSize: 11,
      fontWeight: filtroCentro === c.id ? 700 : 400,
      fontFamily: "inherit",
      borderColor: filtroCentro === c.id ? c.cor : "#e5e7eb",
      background: filtroCentro === c.id ? c.bg : "white",
      color: filtroCentro === c.id ? c.cor : "#6b7280",
      transition: "all .15s"
    }
  }, c.label)), isPsicologa && /*#__PURE__*/React.createElement("button", {
    onClick: () => setModalCentro(true),
    style: {
      padding: "4px 10px",
      borderRadius: 20,
      border: "1.5px dashed #e5e7eb",
      cursor: "pointer",
      fontSize: 11,
      color: "#9ca3af",
      background: "white",
      fontFamily: "inherit",
      marginLeft: 4
    },
    title: "Gerenciar centros de custo"
  }, "+ Centro")), lancMes.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dollar-sign",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, "Nenhum lançamento em ", new Date(mesFiltro + "-15").toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  }))) : (() => {
    const receitas = lancMes.filter(l => l.tipo_lancamento !== "despesa");
    const despesas = lancMes.filter(l => l.tipo_lancamento === "despesa");
    const totalRec = calcReceitas(lancMes);
    const totalDesp = calcDespesas(lancMes);
    const saldo = totalRec - totalDesp;
    function TabelaLanc({
      itens,
      titulo,
      corHeader,
      corValor,
      bgHeader
    }) {
      if (!itens.length) return null;
      return /*#__PURE__*/React.createElement("div", {
        className: "card",
        style: {
          padding: 0,
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "10px 16px",
          background: bgHeader,
          borderBottom: "2px solid " + corHeader,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: corHeader
        }
      }, titulo), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 800,
          fontSize: 14,
          color: corHeader
        }
      }, itens.reduce((a, l) => a + (parseFloat(l.valor) || 0), 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      }))), /*#__PURE__*/React.createElement("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13
        }
      }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
        style: {
          background: "var(--gray-50)"
        }
      }, ["Data", "Descrição", "Categoria", "Forma Pag.", "Valor", "Status", "Ações"].map(h => /*#__PURE__*/React.createElement("th", {
        key: h,
        style: {
          padding: "8px 14px",
          textAlign: "left",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted)",
          borderBottom: "1px solid var(--gray-200)",
          whiteSpace: "nowrap"
        }
      }, h)))), /*#__PURE__*/React.createElement("tbody", null, itens.map(l => {
        const isFut = l.data > new Date().toISOString().slice(0, 10);
        const statusColor = l.status === "recebido" || l.status === "pago" ? "#059669" : l.status === "planejado" ? "#0891b2" : "#d97706";
        const statusBg = l.status === "recebido" || l.status === "pago" ? "#d1fae5" : l.status === "planejado" ? "#e0f2fe" : "#fef3c7";
        const statusLabel = l.status === "recebido" ? "✓ Recebido" : l.status === "pago" ? "✓ Pago" : l.status === "planejado" ? "📅 Planejado" : "Pendente";
        return /*#__PURE__*/React.createElement("tr", {
          key: l.id,
          style: {
            borderBottom: "1px solid var(--gray-100)",
            background: isFut ? "#fafafa" : "white",
            opacity: isFut ? 0.85 : 1
          }
        }, /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "8px 14px",
            whiteSpace: "nowrap",
            fontSize: 12
          }
        }, l.data ? new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR") : "—", isFut && /*#__PURE__*/React.createElement("span", {
          style: {
            marginLeft: 4,
            fontSize: 9,
            color: "#0891b2",
            fontWeight: 600
          }
        }, "futuro")), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "8px 14px",
            maxWidth: 320
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontWeight: 500,
            fontSize: 13,
            lineHeight: 1.4
          }
        }, l.descricao || l.tipo || l.pacienteNome || "—"), /*#__PURE__*/React.createElement("div", {
          style: {
            display: "flex",
            gap: 4,
            marginTop: 3,
            flexWrap: "wrap"
          }
        }, l.tipo_lancamento === "pacote" && /*#__PURE__*/React.createElement("span", {
          style: {
            background: "var(--purple-soft)",
            color: "var(--purple)",
            borderRadius: 20,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 600
          }
        }, "Pacote"), l.tipo_lancamento === "sessao" && /*#__PURE__*/React.createElement("span", {
          style: {
            background: "#e0f2fe",
            color: "#0891b2",
            borderRadius: 20,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 600
          }
        }, "Sessão"), (l.pagamentosExtras || []).length > 0 && /*#__PURE__*/React.createElement("span", {
          style: {
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: 20,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 600
          }
        }, "💳 ", (l.pagamentosExtras || []).length, "x forma", (l.pagamentosExtras || []).length > 1 ? "s" : ""), l.centroCusto && (() => {
          const c = CENTROS.find(x => x.id === l.centroCusto);
          return c ? /*#__PURE__*/React.createElement("span", {
            style: {
              background: c.bg,
              color: c.cor,
              borderRadius: 20,
              padding: "1px 6px",
              fontSize: 10,
              fontWeight: 600
            }
          }, c.label) : null;
        })())), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "8px 14px",
            fontSize: 12,
            color: "var(--text-muted)"
          }
        }, l.categoria || "—"), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "8px 14px"
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            background: "#f3f4f6",
            borderRadius: 6,
            padding: "2px 6px",
            fontSize: 11
          }
        }, l.formaPag || "—")), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "8px 14px",
            fontWeight: 700,
            color: corValor,
            whiteSpace: "nowrap"
          }
        }, (parseFloat(l.valor) || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "8px 14px"
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            background: statusBg,
            color: statusColor,
            borderRadius: 20,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600
          }
        }, statusLabel)), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "8px 14px"
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: "flex",
            gap: 4,
            alignItems: "center"
          }
        }, l.tipo_lancamento === "pacote" ? /*#__PURE__*/React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            padding: "4px 8px",
            fontSize: 11,
            color: "var(--purple)"
          },
          onClick: () => {
            setPacoteSelecionado(l.pacoteId);
            setAba("pacotes");
          }
        }, /*#__PURE__*/React.createElement(Icon, {
          name: "clipboard-list",
          size: 12
        })) : /*#__PURE__*/React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            padding: "4px 8px",
            fontSize: 11,
            color: "var(--purple)"
          },
          onClick: () => abrirEditar(l)
        }, /*#__PURE__*/React.createElement(Icon, {
          name: "pencil",
          size: 12
        })), l.tipo_lancamento !== "despesa" && /*#__PURE__*/React.createElement("button", {
          title: l.linkNF ? "Ver Nota Fiscal — clique para editar" : "Cadastrar Nota Fiscal",
          onClick: () => {
            setModalNF({
              lancId: l.id,
              linkAtual: l.linkNF || ""
            });
            setLinkNF(l.linkNF || "");
          },
          style: {
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid",
            cursor: "pointer",
            borderColor: l.linkNF ? "#16a34a" : "#d1d5db",
            background: l.linkNF ? "#dcfce7" : "#f9fafb",
            color: l.linkNF ? "#16a34a" : "#9ca3af",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 3
          }
        }, /*#__PURE__*/React.createElement(Icon, {
          name: "file-text",
          size: 11
        }), l.linkNF ? "✅" : "NF"), /*#__PURE__*/React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            padding: "4px 8px",
            fontSize: 11,
            color: "#dc2626"
          },
          onClick: () => setModalExcluirLanc(l)
        }, /*#__PURE__*/React.createElement(Icon, {
          name: "trash-2",
          size: 12
        })))));
      }))));
    }
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(TabelaLanc, {
      itens: receitas,
      titulo: "💰 Receitas",
      corHeader: "#059669",
      corValor: "#059669",
      bgHeader: "#f0fdf4"
    }), /*#__PURE__*/React.createElement(TabelaLanc, {
      itens: despesas,
      titulo: "💸 Despesas",
      corHeader: "#dc2626",
      corValor: "#dc2626",
      bgHeader: "#fff1f2"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "white",
        borderRadius: 12,
        border: "1px solid var(--gray-200)",
        padding: "14px 20px",
        display: "flex",
        gap: 24,
        flexWrap: "wrap",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: 2
      }
    }, "Receitas"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: "#059669"
      }
    }, totalRec.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        color: "var(--text-muted)"
      }
    }, "−"), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: 2
      }
    }, "Despesas"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: "#dc2626"
      }
    }, totalDesp.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        color: "var(--text-muted)"
      }
    }, "="), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginBottom: 2
      }
    }, "Saldo do Mês"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: saldo >= 0 ? "#059669" : "#dc2626"
      }
    }, saldo.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })))));
  })(), modalExcluirLanc && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 600,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 420,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      marginBottom: 12
    }
  }, "🗑️"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 17,
      fontWeight: 600,
      marginBottom: 6
    }
  }, modalExcluirLanc.tipo), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 20
    }
  }, modalExcluirLanc.data ? new Date(modalExcluirLanc.data + "T00:00:00").toLocaleDateString("pt-BR") : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #e5e7eb",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: async () => {
      await db.collection("clinica_lancamentos").doc(modalExcluirLanc.id).delete();
      setModalExcluirLanc(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "Só este lançamento"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280"
    }
  }, "Remove apenas ", new Date(modalExcluirLanc.data + "T00:00:00").toLocaleDateString("pt-BR", {
    month: "long"
  }))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #fbbf24",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: async () => {
      const chave = modalExcluirLanc.descricaoRecorrente || modalExcluirLanc.tipo;
      const snap = await db.collection("clinica_lancamentos").get();
      const futuros = snap.docs.filter(d => {
        const dd = d.data();
        return (dd.descricaoRecorrente === chave || dd.tipo === chave) && dd.data >= modalExcluirLanc.data;
      });
      const b = db.batch();
      futuros.forEach(d => b.delete(d.ref));
      await b.commit();
      setModalExcluirLanc(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#d97706"
    }
  }, "Este e todos os futuros"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280"
    }
  }, "Remove \"", modalExcluirLanc.tipo, "\" a partir de ", new Date(modalExcluirLanc.data + "T00:00:00").toLocaleDateString("pt-BR", {
    month: "long"
  }))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #fca5a5",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: async () => {
      const chave = modalExcluirLanc.descricaoRecorrente || modalExcluirLanc.tipo;
      const snap = await db.collection("clinica_lancamentos").get();
      const todos = snap.docs.filter(d => {
        const dd = d.data();
        return dd.descricaoRecorrente === chave || dd.tipo === chave;
      });
      const b = db.batch();
      todos.forEach(d => b.delete(d.ref));
      await b.commit();
      setModalExcluirLanc(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#dc2626"
    }
  }, "Todos — o ano inteiro"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280"
    }
  }, "Remove todos os meses de \"", modalExcluirLanc.tipo, "\""))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      width: "100%"
    },
    onClick: () => setModalExcluirLanc(null)
  }, "Cancelar")))), aba === "pacotes" && /*#__PURE__*/React.createElement("div", null, pacotes.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 60
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "package",
    size: 48
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontWeight: 500
    }
  }, "Nenhum pacote criado ainda"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      marginTop: 16
    },
    onClick: () => setModal("pacote")
  }, "+ Criar Pacote")) : (() => {
    // Agrupar pacotes por paciente
    const pacientesComPacote = [...new Set(pacotes.map(p => p.pacienteId))];
    const pacientesVisiveis = buscaPac.trim() ? pacientesComPacote.filter(id => {
      const pac = pacientes.find(p => p.id === id);
      const inicial = (pac?.nome || "?")[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return inicial === buscaPac;
    }) : pacientesComPacote;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 28
      }
    }, (() => {
      const letrasComPac = [...new Set(pacientesComPacote.map(id => {
        const pac = pacientes.find(p => p.id === id);
        return (pac?.nome || "?")[0].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      }))].sort();
      return /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginBottom: 12
        }
      }, buscaPac && /*#__PURE__*/React.createElement("button", {
        onClick: () => setBuscaPac(""),
        style: {
          padding: "4px 12px",
          borderRadius: 20,
          border: "1.5px solid #7B00C4",
          background: "#7B00C4",
          color: "white",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer"
        }
      }, "Todos"), letrasComPac.map(letra => /*#__PURE__*/React.createElement("button", {
        key: letra,
        onClick: () => setBuscaPac(buscaPac === letra ? "" : letra),
        style: {
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1.5px solid",
          borderColor: buscaPac === letra ? "#7B00C4" : "#e8c8ff",
          background: buscaPac === letra ? "#7B00C4" : "white",
          color: buscaPac === letra ? "white" : "#7B00C4",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0
        }
      }, letra)));
    })(), pacientesVisiveis.map(pacId => {
      const pac = pacientes.find(p => p.id === pacId);
      const pacotesDoPac = pacotes.filter(p => p.pacienteId === pacId).sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
      return /*#__PURE__*/React.createElement("div", {
        key: pacId
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: "2px solid var(--purple-soft)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "var(--purple)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 600,
          flexShrink: 0
        }
      }, (pac?.nome || "?")[0].toUpperCase()), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 16
        }
      }, pac?.nome || pacotesDoPac[0]?.pacienteNome || "—"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--text-muted)"
        }
      }, pacotesDoPac.length, " pacote(s)")), /*#__PURE__*/React.createElement("button", {
        className: "btn btn-outline",
        style: {
          marginLeft: "auto",
          fontSize: 12
        },
        onClick: () => setPacoteSelecionado(pacId)
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "bar-chart-2",
        size: 13
      }), " Acompanhamento")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10
        }
      }, pacotesDoPac.map(p => {
        const sessPac = sessoes.filter(s => s.pacoteId === p.id);
        const realizadas = sessPac.filter(s => s.status === "realizado").length;
        const pagas = sessPac.filter(s => s.pagamento === "pago").length;
        const pct = Math.round(realizadas / (p.totalSessoes || 1) * 100);
        const lancsPac = lancamentos.filter(l => l.pacoteId === p.id);
        const totalPago = lancsPac.filter(l => l.status === "recebido").reduce((a, l) => a + (l.valor || 0), 0);
        const isPago = p.statusPag === "recebido";
        const dataStr = p.dataInicio ? new Date(p.dataInicio + "T00:00:00").toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit"
        }) : "—";
        return /*#__PURE__*/React.createElement("div", {
          key: p.id,
          style: {
            borderRadius: 12,
            border: "1px solid #e8c8ff",
            background: "white",
            padding: "14px 16px",
            marginBottom: 10,
            boxShadow: "0 1px 3px #0001"
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 10
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isPago ? "#22c55e" : "#f59e0b",
            flexShrink: 0,
            marginTop: 2
          }
        }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            color: "#3d006a"
          }
        }, p.obs || p.recorrencia || "Pacote"), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 1
          }
        }, p.recorrencia, p.horario && /*#__PURE__*/React.createElement("span", null, " · 🕐 ", p.horario), " · ", dataStr))), /*#__PURE__*/React.createElement("div", {
          style: {
            textAlign: "right"
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontWeight: 800,
            fontSize: 16,
            color: isPago ? "#22c55e" : "#f59e0b"
          }
        }, (p.valorTotal || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })), /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 11,
            color: isPago ? "#22c55e" : "#f59e0b",
            fontWeight: 600
          }
        }, isPago ? "✓ Recebido" : "⏳ Pendente", p.formaPag && /*#__PURE__*/React.createElement("span", {
          style: {
            fontWeight: 400,
            color: "var(--text-muted)"
          }
        }, " · ", p.formaPag)))), /*#__PURE__*/React.createElement("div", {
          style: {
            marginBottom: 10
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 4
          }
        }, /*#__PURE__*/React.createElement("span", null, realizadas, " realizadas de ", p.totalSessoes, " · ", pagas, " pagas"), /*#__PURE__*/React.createElement("span", {
          style: {
            fontWeight: 600,
            color: "var(--purple)"
          }
        }, pct, "%")), /*#__PURE__*/React.createElement("div", {
          style: {
            height: 6,
            background: "#e8c8ff",
            borderRadius: 10,
            overflow: "hidden"
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            width: pct + "%",
            height: "100%",
            background: "#7B00C4",
            borderRadius: 10,
            transition: "width .4s"
          }
        }))), (p.pagamentosExtras || []).length > 0 && /*#__PURE__*/React.createElement("div", {
          style: {
            marginBottom: 10,
            display: "flex",
            gap: 6,
            flexWrap: "wrap"
          }
        }, (p.pagamentosExtras || []).map((pg, i) => /*#__PURE__*/React.createElement("span", {
          key: i,
          style: {
            background: "#f3e6ff",
            borderRadius: 6,
            padding: "2px 8px",
            fontSize: 11,
            color: "#6b7280"
          }
        }, "💳 ", pg.forma || "?", " R$", parseFloat(pg.valor || 0).toFixed(2).replace(".", ","), " · ", pg.data ? new Date(pg.data + "T00:00:00").toLocaleDateString("pt-BR") : "—"))), /*#__PURE__*/React.createElement("div", {
          style: {
            display: "flex",
            gap: 6,
            flexWrap: "wrap"
          }
        }, /*#__PURE__*/React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 12,
            padding: "6px 12px",
            color: "var(--purple)",
            border: "1px solid #d9b3f5"
          },
          onClick: e => {
            e.stopPropagation();
            setPacoteSelecionado(p.id + "__pacote");
          }
        }, /*#__PURE__*/React.createElement(Icon, {
          name: "edit-3",
          size: 13
        }), " Editar"), /*#__PURE__*/React.createElement("button", {
          className: "btn btn-purple",
          style: {
            fontSize: 12,
            padding: "6px 12px"
          },
          onClick: e => {
            e.stopPropagation();
            setPacoteSelecionado(p.id + "__sessoes");
          }
        }, /*#__PURE__*/React.createElement(Icon, {
          name: "clipboard-list",
          size: 13
        }), " Sessões"), /*#__PURE__*/React.createElement("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 12,
            padding: "6px 12px",
            color: "#dc2626",
            marginLeft: "auto"
          },
          onClick: async e => {
            e.stopPropagation();
            if (!confirm("Excluir pacote e TODAS as sessões e lançamentos vinculados? Esta ação não pode ser desfeita.")) return;
            try {
              const [snapSess, snapLanc] = await Promise.all([db.collection("clinica_sessoes").where("pacoteId", "==", p.id).get(), db.collection("clinica_lancamentos").where("pacoteId", "==", p.id).get()]);
              const b = db.batch();
              snapSess.docs.forEach(d => b.delete(d.ref));
              snapLanc.docs.forEach(d => b.delete(d.ref));
              b.delete(db.collection("clinica_pacotes").doc(p.id));
              await b.commit();
            } catch (e) {
              alert("Erro ao excluir pacote: " + e.message);
            }
          }
        }, /*#__PURE__*/React.createElement(Icon, {
          name: "trash-2",
          size: 13
        }), " Excluir")));
      })));
    }));
  })()), aba === "acompanhamento" && /*#__PURE__*/React.createElement("div", null, (() => {
    const ano = anoFiltro || new Date().getFullYear().toString();

    // Receitas e despesas por centro no ano
    const recPorCentro = {};
    const despPorCentro = {};
    const recPorMes = {}; // mes -> total receita
    const despPorMes = {}; // mes -> total despesa

    lancamentos.filter(l => (l.data || "").startsWith(ano)).forEach(l => {
      const v = parseFloat(l.valor) || 0;
      const c = l.centroCusto || "clinica";
      const mes = (l.data || "").slice(0, 7);
      const isDesp = l.tipo_lancamento === "despesa";
      if (isDesp) {
        despPorCentro[c] = (despPorCentro[c] || 0) + v;
        despPorMes[mes] = (despPorMes[mes] || 0) + v;
      } else {
        recPorCentro[c] = (recPorCentro[c] || 0) + v;
        recPorMes[mes] = (recPorMes[mes] || 0) + v;
      }
    });
    const totalRec = Object.values(recPorCentro).reduce((a, v) => a + v, 0);
    const totalDesp = Object.values(despPorCentro).reduce((a, v) => a + v, 0);
    const lucro = totalRec - totalDesp;

    // Meses do ano ordenados
    const meses = Array.from({
      length: 12
    }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);
    const maxBar = Math.max(...meses.map(m => Math.max(recPorMes[m] || 0, despPorMes[m] || 0)), 1);
    const fmt = v => v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    const MESES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 12,
        marginBottom: 20
      }
    }, [{
      label: "Receitas",
      valor: totalRec,
      cor: "#059669",
      bg: "#f0fdf4"
    }, {
      label: "Despesas",
      valor: totalDesp,
      cor: "#dc2626",
      bg: "#fef2f2"
    }, {
      label: lucro >= 0 ? "Lucro" : "Prejuízo",
      valor: Math.abs(lucro),
      cor: lucro >= 0 ? "#7B00C4" : "#dc2626",
      bg: lucro >= 0 ? "#f5f3ff" : "#fef2f2"
    }].map(({
      label,
      valor,
      cor,
      bg
    }) => /*#__PURE__*/React.createElement("div", {
      key: label,
      style: {
        background: bg,
        border: `1.5px solid ${cor}22`,
        borderRadius: 12,
        padding: "14px 18px",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 20,
        fontWeight: 800,
        color: cor
      }
    }, fmt(valor)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 2
      }
    }, label, " ", ano)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        marginBottom: 14,
        color: "#374151"
      }
    }, "📊 Receitas vs Despesas — ", ano), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        gap: 4,
        height: 120
      }
    }, meses.map((m, i) => {
      const r = recPorMes[m] || 0;
      const d = despPorMes[m] || 0;
      const hr = Math.round(r / maxBar * 110);
      const hd = Math.round(d / maxBar * 110);
      return /*#__PURE__*/React.createElement("div", {
        key: m,
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          height: 110
        }
      }, /*#__PURE__*/React.createElement("div", {
        title: `Receita: ${fmt(r)}`,
        style: {
          width: 8,
          height: hr || 2,
          background: "#059669",
          borderRadius: "2px 2px 0 0",
          cursor: "pointer"
        }
      }), /*#__PURE__*/React.createElement("div", {
        title: `Despesa: ${fmt(d)}`,
        style: {
          width: 8,
          height: hd || 2,
          background: "#dc2626",
          borderRadius: "2px 2px 0 0",
          cursor: "pointer"
        }
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: "#9ca3af",
          marginTop: 2
        }
      }, MESES_LABEL[i]));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        marginTop: 8,
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#6b7280",
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        background: "#059669",
        borderRadius: 2,
        display: "inline-block"
      }
    }), "Receita"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: "#6b7280",
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 10,
        height: 10,
        background: "#dc2626",
        borderRadius: 2,
        display: "inline-block"
      }
    }), "Despesa"))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        marginBottom: 14,
        color: "#374151"
      }
    }, "🏷️ Receitas por Centro de Custo"), totalRec === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        color: "#9ca3af",
        fontSize: 12,
        padding: "20px 0"
      }
    }, "Nenhuma receita em ", ano), CENTROS.filter(c => recPorCentro[c.id] > 0).sort((a, b) => (recPorCentro[b.id] || 0) - (recPorCentro[a.id] || 0)).map(c => {
      const v = recPorCentro[c.id] || 0;
      const pct = totalRec > 0 ? Math.round(v / totalRec * 100) : 0;
      return /*#__PURE__*/React.createElement("div", {
        key: c.id,
        style: {
          marginBottom: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: c.cor
        }
      }, c.label), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          color: "#6b7280"
        }
      }, fmt(v), " · ", pct, "%")), /*#__PURE__*/React.createElement("div", {
        style: {
          height: 6,
          background: "#f3f4f6",
          borderRadius: 20,
          overflow: "hidden"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: pct + "%",
          height: "100%",
          background: c.cor,
          borderRadius: 20,
          transition: "width .4s"
        }
      })));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "16px",
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        marginBottom: 14,
        color: "#374151"
      }
    }, "🏷️ Despesas por Centro de Custo"), totalDesp === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        color: "#9ca3af",
        fontSize: 12,
        padding: "8px 0"
      }
    }, "Nenhuma despesa em ", ano), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
        gap: 10
      }
    }, CENTROS.filter(c => despPorCentro[c.id] > 0).sort((a, b) => (despPorCentro[b.id] || 0) - (despPorCentro[a.id] || 0)).map(c => {
      const v = despPorCentro[c.id] || 0;
      const rec = recPorCentro[c.id] || 0;
      const luc = rec - v;
      return /*#__PURE__*/React.createElement("div", {
        key: c.id,
        style: {
          background: c.bg,
          border: `1.5px solid ${c.cor}33`,
          borderRadius: 10,
          padding: "12px 14px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 12,
          color: c.cor,
          marginBottom: 6
        }
      }, c.label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#374151"
        }
      }, "💰 Rec: ", /*#__PURE__*/React.createElement("b", null, fmt(rec))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#374151"
        }
      }, "💸 Desp: ", /*#__PURE__*/React.createElement("b", null, fmt(v))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 700,
          color: luc >= 0 ? "#059669" : "#dc2626",
          marginTop: 4,
          borderTop: `1px solid ${c.cor}22`,
          paddingTop: 4
        }
      }, luc >= 0 ? "✅" : "❌", " ", fmt(Math.abs(luc))));
    }))));
  })(), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Clique em um paciente para abrir o Controle de Sessões e Frequência completo."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(pac => {
    const sessPac = sessoes.filter(s => s.pacienteId === pac.id);
    const pacotesPac = pacotes.filter(p => p.pacienteId === pac.id);
    if (pacotesPac.length === 0) return null;
    const totalSessoes = sessPac.length;
    // "Remarcado" conta como sessão válida para fins de progresso e fluxo financeiro
    const realizadas = sessPac.filter(s => s.status === "realizado" || s.status === "remarcado").length;
    const pagas = sessPac.filter(s => s.pagamento === "pago").length;
    // Pendentes: exclui canceladas E remarcadas (remarcado já retém valor pago)
    const pendentes = sessPac.filter(s => s.pagamento !== "pago" && s.status !== "cancelado" && s.status !== "remarcado").length;
    const recebido = sessPac.filter(s => s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
    // A receber: exclui canceladas E remarcadas do fluxo de cobrança pendente
    const aReceber = sessPac.filter(s => s.pagamento !== "pago" && s.status !== "cancelado" && s.status !== "remarcado").reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0);
    return /*#__PURE__*/React.createElement("div", {
      key: pac.id,
      className: "card",
      style: {
        padding: "14px 20px",
        cursor: "pointer",
        marginBottom: 10,
        transition: "box-shadow .15s"
      },
      onClick: () => setPacoteSelecionado(pac.id),
      onMouseEnter: e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(123,0,196,0.12)",
      onMouseLeave: e => e.currentTarget.style.boxShadow = ""
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "var(--purple)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: 600,
        flexShrink: 0
      }
    }, (pac.nome || "?")[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14
      }
    }, pac.nome), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, pacotesPac[0]?.recorrencia, " · ", pacotesPac[0]?.horario)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "var(--purple)"
      }
    }, realizadas, "/", totalSessoes), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "var(--text-muted)"
      }
    }, "Sessões")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#059669"
      }
    }, recebido.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "var(--text-muted)"
      }
    }, "Recebido")), aReceber > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        color: "#d97706"
      }
    }, aReceber.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "var(--text-muted)"
      }
    }, "A Receber")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4
      }
    }, pendentes > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#fef3c7",
        color: "#b45309",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 600
      }
    }, pendentes, " pendente(s)"), pendentes === 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#d1fae5",
        color: "#065f46",
        borderRadius: 20,
        padding: "2px 10px",
        fontSize: 11,
        fontWeight: 600
      }
    }, "✓ Em dia")), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 16,
      style: {
        color: "var(--text-muted)"
      }
    }))));
  })), aba === "fiscal" && (() => {
    // Apenas lançamentos COM nota fiscal emitida (linkNF preenchido)
    const lancMesTodos = lancamentos.filter(l => l.tipo_lancamento !== "despesa" && (l.data || "").startsWith(mesFiltro));
    const lancMes = lancMesTodos.filter(l => l.linkNF && l.linkNF.trim() !== "");

    // Classificar por tipo de CNAE
    const CNAE_PSICO = ["psicologia", "psicanálise", "psicanálise", "terapia ocupacional", "psicoterapia", "atendimento psicológico", "sessão", "consulta"];
    const CNAE_OUTROS = ["musicoterapia", "música", "treinamento", "ensino", "produção musical", "neurofeedback", "coral", "artístico", "cultural", "assessoria", "desenvolvimento humano"];
    const CNAE_ALERTA = ["consultoria", "gestão empresarial"]; // Anexo V — alíquota maior

    function classificar(l) {
      const desc = (l.descricao || l.tipo || l.categoria || "").toLowerCase();
      if (CNAE_ALERTA.some(k => desc.includes(k))) return "alerta";
      if (CNAE_PSICO.some(k => desc.includes(k))) return "psico";
      return "outros";
    }
    const totalPsico = lancMes.filter(l => classificar(l) === "psico").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
    const totalOutros = lancMes.filter(l => classificar(l) === "outros").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
    const totalAlerta = lancMes.filter(l => classificar(l) === "alerta").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
    const totalNF = totalPsico + totalOutros + totalAlerta;
    const TETO_PSICO = 5750;
    const TETO_OUTROS = 9250;
    const TETO_TOTAL = 15000;
    const fatorR = totalNF > 0 ? proLabore / totalNF * 100 : 100;
    const fatorROk = fatorR >= 28;
    const pctPsico = Math.round(totalPsico / TETO_PSICO * 100);
    const pctOutros = Math.round(totalOutros / TETO_OUTROS * 100);
    const pctTotal = Math.round(totalNF / TETO_TOTAL * 100);
    function Barra({
      pct,
      cor
    }) {
      const c = pct >= 100 ? "#dc2626" : pct >= 85 ? "#d97706" : cor;
      return /*#__PURE__*/React.createElement("div", {
        style: {
          height: 8,
          borderRadius: 20,
          background: "#f3f4f6",
          overflow: "hidden",
          marginTop: 6
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: Math.min(pct, 100) + "%",
          height: "100%",
          background: c,
          borderRadius: 20,
          transition: "width .4s"
        }
      }));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 720
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: 700,
        margin: 0
      }
    }, "🧾 Painel Fiscal"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, "Simples Nacional · Fator R · Mês: ", new Date(mesFiltro + "-15").toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, "Pró-labore Paulo:"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      value: proLabore,
      onChange: e => setProLabore(parseFloat(e.target.value) || 0),
      style: {
        width: 90,
        padding: "4px 8px",
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        color: "#7B00C4",
        textAlign: "right"
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: fatorROk ? "#f0fdf4" : "#fef2f2",
        border: "1.5px solid",
        borderColor: fatorROk ? "#86efac" : "#fca5a5",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: fatorROk ? "#16a34a" : "#dc2626"
      }
    }, fatorROk ? "✅" : "🔴", " Fator R: ", fatorR.toFixed(1), "%"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 2
      }
    }, "Pró-labore (R$ ", proLabore.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).replace("R$", "").trim(), ") ÷ Faturamento NF do mês")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 800,
        color: fatorROk ? "#16a34a" : "#dc2626"
      }
    }, fatorROk ? "6%" : "⚠️ 15,5%"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#6b7280"
      }
    }, "Alíquota estimada"))), !fatorROk && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        background: "#fef2f2",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
        color: "#dc2626",
        fontWeight: 500
      }
    }, "⚠️ Fator R abaixo de 28% — ", /*#__PURE__*/React.createElement("strong", null, "Avisar contabilidade para revisar pró-labore do Paulo"), " para manter Anexo III (6%).", /*#__PURE__*/React.createElement("br", null), "Pró-labore mínimo necessário: ", /*#__PURE__*/React.createElement("strong", null, "R$ ", (totalNF * 0.28).toLocaleString("pt-BR", {
      minimumFractionDigits: 2
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 16
      }
    }, [{
      label: "Psicologia / Saúde Mental",
      total: totalPsico,
      teto: TETO_PSICO,
      pct: pctPsico,
      cor: "#7B00C4",
      desc: "CNAE 86.50-0/03 · Fator R"
    }, {
      label: "Outras Atividades",
      total: totalOutros,
      teto: TETO_OUTROS,
      pct: pctOutros,
      cor: "#0891b2",
      desc: "Musicoterapia, Treinamento, Produção Musical"
    }].map(({
      label,
      total,
      teto,
      pct,
      cor,
      desc
    }) => /*#__PURE__*/React.createElement("div", {
      key: label,
      style: {
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#374151",
        marginBottom: 4
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#9ca3af",
        marginBottom: 8
      }
    }, desc), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20,
        fontWeight: 800,
        color: pct >= 100 ? "#dc2626" : pct >= 85 ? "#d97706" : cor
      }
    }, total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#9ca3af"
      }
    }, "/ R$ ", teto.toLocaleString("pt-BR"))), /*#__PURE__*/React.createElement(Barra, {
      pct: pct,
      cor: cor
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: pct >= 100 ? "#dc2626" : pct >= 85 ? "#d97706" : "#6b7280",
        marginTop: 4,
        fontWeight: pct >= 85 ? 600 : 400
      }
    }, pct >= 100 ? "🔴 Limite atingido — revisar com contabilidade" : pct >= 85 ? "🟡 " + Math.round(teto - total).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }) + " restante — atenção" : "✅ " + Math.round(teto - total).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }) + " restante")))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "white",
        border: "1.5px solid",
        borderColor: pctTotal >= 100 ? "#fca5a5" : pctTotal >= 85 ? "#fcd34d" : "#e5e7eb",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "#111827"
      }
    }, "Total NF emitida no mês"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#9ca3af",
        marginTop: 2
      }
    }, "Teto mensal: R$ 15.000 (média)")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 800,
        color: pctTotal >= 100 ? "#dc2626" : pctTotal >= 85 ? "#d97706" : "#059669"
      }
    }, totalNF.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#9ca3af"
      }
    }, pctTotal, "% do teto"))), /*#__PURE__*/React.createElement(Barra, {
      pct: pctTotal,
      cor: "#059669"
    })), totalAlerta > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fef3c7",
        border: "1.5px solid #fcd34d",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: "#92400e",
        marginBottom: 4
      }
    }, "⚠️ Atenção — Lançamentos em atividade de Consultoria"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#92400e"
      }
    }, "R$ ", totalAlerta.toLocaleString("pt-BR", {
      minimumFractionDigits: 2
    }), " em consultoria/gestão empresarial (CNAE 70.20-4/00).", /*#__PURE__*/React.createElement("br", null), "Essa atividade é tributada pelo ", /*#__PURE__*/React.createElement("strong", null, "Anexo V (alíquota maior)"), ", independente do Fator R. Confirmar com contador se há segregação de receitas.")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "12px 16px",
        background: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, "Lançamentos de receita — ", new Date(mesFiltro + "-15").toLocaleDateString("pt-BR", {
      month: "long"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#6b7280"
      }
    }, lancMes.length, " com NF · ", lancMesTodos.length, " total")), lancMesTodos.length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 24,
        textAlign: "center",
        color: "#9ca3af",
        fontSize: 13
      }
    }, "Nenhum lançamento de receita neste mês."), lancMesTodos.map(l => {
      const cls = classificar(l);
      const cfgCls = cls === "alerta" ? {
        c: "#92400e",
        bg: "#fef3c7",
        label: "⚠️ Consultoria"
      } : cls === "psico" ? {
        c: "#7B00C4",
        bg: "#f5f3ff",
        label: "🧠 Psico"
      } : {
        c: "#0891b2",
        bg: "#e0f2fe",
        label: "🎵 Outros"
      };
      const temNF = l.linkNF && l.linkNF.trim() !== "";
      return /*#__PURE__*/React.createElement("div", {
        key: l.id,
        style: {
          padding: "10px 16px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          gap: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: cfgCls.c,
          background: cfgCls.bg,
          borderRadius: 20,
          padding: "2px 8px",
          flexShrink: 0
        }
      }, cfgCls.label), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 500
        }
      }, l.descricao || l.tipo || l.pacienteNome || "—"), /*#__PURE__*/React.createElement("span", {
        style: {
          color: "#9ca3af",
          marginLeft: 8
        }
      }, l.data ? new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR") : "—")), /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 700,
          fontSize: 13,
          color: "#059669",
          flexShrink: 0
        }
      }, (parseFloat(l.valor) || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      })), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          setModalNF({
            lancId: l.id,
            linkAtual: l.linkNF || ""
          });
          setLinkNF(l.linkNF || "");
        },
        title: l.linkNF ? "NF emitida — clique para ver/editar" : "NF não cadastrada",
        style: {
          padding: "3px 8px",
          borderRadius: 6,
          border: "1px solid",
          cursor: "pointer",
          fontSize: 10,
          fontWeight: 600,
          borderColor: l.linkNF ? "#16a34a" : "#d1d5db",
          background: l.linkNF ? "#dcfce7" : "#f9fafb",
          color: l.linkNF ? "#16a34a" : "#9ca3af"
        }
      }, l.linkNF ? "✅ NF" : "⬜ NF"));
    })));
  })(), modalCentro && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 700,
      padding: 20
    },
    onClick: () => {
      setModalCentro(false);
      setEditCentroId(null);
      setFormCentro({
        label: "",
        cor: "#7B00C4",
        bg: "#f5f3ff"
      });
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      color: "#7B00C4"
    }
  }, "🏷️ Centros de Custo"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModalCentro(false);
      setEditCentroId(null);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 20,
      color: "#9ca3af"
    }
  }, "✕")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#9ca3af",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: ".5px"
    }
  }, "Padrão (não editável)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 16
    }
  }, CENTROS_PADRAO.map(c => /*#__PURE__*/React.createElement("span", {
    key: c.id,
    style: {
      padding: "4px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: c.cor,
      background: c.bg,
      color: c.cor,
      fontSize: 12,
      fontWeight: 600
    }
  }, c.label))), centrosCustom.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#9ca3af",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: ".5px"
    }
  }, "Personalizados"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      marginBottom: 16
    }
  }, centrosCustom.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      border: "1px solid #e5e7eb",
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: c.cor,
      flexShrink: 0,
      display: "inline-block"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 500
    }
  }, c.label), /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      if (confirm("Excluir centro '" + c.label + "'?")) await db.collection("clinica_centros_custo").doc(c.id).delete();
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#dc2626",
      fontSize: 16,
      padding: "0 4px"
    }
  }, "🗑️"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid #e5e7eb",
      paddingTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "#374151",
      marginBottom: 10
    }
  }, "Adicionar novo centro"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      gap: 8,
      alignItems: "end"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      display: "block",
      marginBottom: 4
    }
  }, "Nome"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    placeholder: "Ex: Projeto XYZ",
    value: formCentro.label,
    onChange: e => setFormCentro({
      ...formCentro,
      label: e.target.value
    }),
    style: {
      fontSize: 13
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      display: "block",
      marginBottom: 4
    }
  }, "Cor"), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: formCentro.cor,
    onChange: e => setFormCentro({
      ...formCentro,
      cor: e.target.value,
      bg: e.target.value + "22"
    }),
    style: {
      width: 40,
      height: 36,
      border: "1px solid #e5e7eb",
      borderRadius: 6,
      cursor: "pointer",
      padding: 2
    }
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      height: 36,
      padding: "0 16px",
      fontSize: 13
    },
    onClick: async () => {
      if (!formCentro.label.trim()) return;
      const id = formCentro.label.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20) + "_" + Date.now().toString().slice(-4);
      await db.collection("clinica_centros_custo").doc(id).set({
        id,
        label: formCentro.label.trim(),
        cor: formCentro.cor,
        bg: formCentro.cor + "22",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setFormCentro({
        label: "",
        cor: "#7B00C4",
        bg: "#f5f3ff"
      });
    }
  }, "+ Criar"))))), modal === "escolha" && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 32,
      width: "100%",
      maxWidth: 420,
      textAlign: "center"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Novo Lançamento"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 24
    }
  }, "Escolha o tipo de lançamento:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      width: "100%",
      padding: "20px 20px",
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 16,
      textAlign: "left"
    },
    onClick: () => setModal("pacote")
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 32,
      flexShrink: 0
    }
  }, "📦"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "var(--purple)"
    }
  }, "Pacote de Sessões"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      lineHeight: 1.5,
      marginTop: 2
    }
  }, "Gera sessões recorrentes na agenda com ficha de frequência, controle de pagamento e formas mistas"))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      width: "100%",
      padding: "20px 20px",
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 16,
      textAlign: "left"
    },
    onClick: () => setModal("avulso")
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 32,
      flexShrink: 0
    }
  }, "💲"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#059669"
    }
  }, "Lançamento Avulso"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      lineHeight: 1.5,
      marginTop: 2
    }
  }, "Sessão única, avaliação, neuromodulação ou outro serviço isolado")))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      width: "100%",
      marginTop: 12
    },
    onClick: () => setModal(false)
  }, "Cancelar"))), modal === "avulso" && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, editando ? "Editar Lançamento" : "Lançamento Avulso"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(false);
      setEditando(null);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Paciente / Cliente"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formAvulso.pacienteId,
    onChange: e => {
      const pac = pacientes.find(p => p.id === e.target.value);
      setFormAvulso({
        ...formAvulso,
        pacienteId: e.target.value,
        pacienteNome: pac?.nome || "",
        obs: pac ? `${formAvulso.tipo} — ${pac.nome}` : formAvulso.obs
      });
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar..."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.nome)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Tipo / Categoria"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formAvulso.tipo,
    onChange: e => {
      const pac = pacientes.find(p => p.id === formAvulso.pacienteId);
      setFormAvulso({
        ...formAvulso,
        tipo: e.target.value,
        obs: pac ? `${e.target.value} — ${pac.nome}` : formAvulso.obs
      });
    }
  }, ["Consulta", "Sessão", "Avaliação", "Musicoterapia", "Neuromodulação", "Orientação", "Laudo", "Outro"].map(t => /*#__PURE__*/React.createElement("option", {
    key: t
  }, t)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Valor R$"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    placeholder: "0,00",
    value: formAvulso.valor,
    onChange: e => setFormAvulso({
      ...formAvulso,
      valor: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Data"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formAvulso.data,
    onChange: e => setFormAvulso({
      ...formAvulso,
      data: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formAvulso.formaPag,
    onChange: e => setFormAvulso({
      ...formAvulso,
      formaPag: e.target.value
    })
  }, FORMAS.map(f => /*#__PURE__*/React.createElement("option", {
    key: f
  }, f)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Status"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["pendente", "Pendente", "#d97706"], ["recebido", "✓ Recebido", "#059669"]].map(([v, l, c]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setFormAvulso({
      ...formAvulso,
      status: v
    }),
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formAvulso.status === v ? c : "#e5e7eb",
      background: formAvulso.status === v ? c + "15" : "white",
      color: formAvulso.status === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Centro de Custo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, CENTROS.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    type: "button",
    onClick: () => setFormAvulso({
      ...formAvulso,
      centroCusto: c.id
    }),
    style: {
      padding: "6px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: (formAvulso.centroCusto || "clinica") === c.id ? 700 : 400,
      fontFamily: "inherit",
      borderColor: (formAvulso.centroCusto || "clinica") === c.id ? c.cor : "#e5e7eb",
      background: (formAvulso.centroCusto || "clinica") === c.id ? c.bg : "white",
      color: (formAvulso.centroCusto || "clinica") === c.id ? c.cor : "#6b7280",
      transition: "all .15s"
    }
  }, c.label)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Observações"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    placeholder: "Opcional...",
    value: formAvulso.obs,
    onChange: e => setFormAvulso({
      ...formAvulso,
      obs: e.target.value
    })
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, "Cancelar"), editando ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => salvarAvulso(null),
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "save",
    size: 15
  }), " ", salvando ? "Salvando..." : "Salvar Alterações") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => salvarAvulso(null),
    disabled: salvando,
    style: {
      border: "1px solid #e5e7eb",
      color: "#6b7280",
      fontSize: 12
    },
    title: "Sem comissão — para lançamentos passados"
  }, "📋 Sem comissão"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => salvarAvulso("primeira"),
    disabled: salvando,
    style: {
      background: "#7B00C4"
    },
    title: "10% de comissão"
  }, "🌟 Primeira Venda"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => salvarAvulso("recorrente"),
    disabled: salvando,
    style: {
      background: "#0891b2"
    },
    title: "5% de comissão"
  }, "🔁 Venda Recorrente"))))), modal === "editar-despesa" && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      color: "#dc2626"
    }
  }, "✏️ Editar Despesa"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(false);
      setEditando(null);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Descrição"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    placeholder: "Ex: Consultório locação",
    value: formDespesaEdit.descricao,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      descricao: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Categoria"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formDespesaEdit.categoria,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      categoria: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar..."), CATS_DESPESA.map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Valor R$"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    placeholder: "0,00",
    value: formDespesaEdit.valor,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      valor: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Data"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formDespesaEdit.data,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      data: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formDespesaEdit.formaPag,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      formaPag: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "—"), FORMAS.map(f => /*#__PURE__*/React.createElement("option", {
    key: f
  }, f)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Status"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["pago", "✓ Pago", "#059669"], ["pendente", "Pendente", "#d97706"]].map(([v, l, c]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setFormDespesaEdit({
      ...formDespesaEdit,
      status: v
    }),
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formDespesaEdit.status === v ? c : "#e5e7eb",
      background: formDespesaEdit.status === v ? c + "15" : "white",
      color: formDespesaEdit.status === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Centro de Custo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, CENTROS.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    type: "button",
    onClick: () => setFormDespesaEdit({
      ...formDespesaEdit,
      centroCusto: c.id
    }),
    style: {
      padding: "6px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: (formDespesaEdit.centroCusto || "admin") === c.id ? 700 : 400,
      fontFamily: "inherit",
      borderColor: (formDespesaEdit.centroCusto || "admin") === c.id ? c.cor : "#e5e7eb",
      background: (formDespesaEdit.centroCusto || "admin") === c.id ? c.bg : "white",
      color: (formDespesaEdit.centroCusto || "admin") === c.id ? c.cor : "#6b7280",
      transition: "all .15s"
    }
  }, c.label)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Observações"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    placeholder: "Opcional...",
    value: formDespesaEdit.obs,
    onChange: e => setFormDespesaEdit({
      ...formDespesaEdit,
      obs: e.target.value
    })
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      background: "#dc2626"
    },
    onClick: salvarDespesaEdit,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "save",
    size: 15
  }), " ", salvando ? "Salvando..." : "Salvar Alterações")))), modal === "pacote" && (() => {
    const DIAS = [{
      v: "0",
      l: "Dom"
    }, {
      v: "1",
      l: "Seg"
    }, {
      v: "2",
      l: "Ter"
    }, {
      v: "3",
      l: "Qua"
    }, {
      v: "4",
      l: "Qui"
    }, {
      v: "5",
      l: "Sex"
    }, {
      v: "6",
      l: "Sáb"
    }];
    const needDias = ["2x por semana", "3x por semana"].includes(formPacote.recorrencia);
    const maxDias = formPacote.recorrencia === "3x por semana" ? 3 : 2;
    const diasSel = formPacote.diasSemana || [];
    function toggleDia(v) {
      if (diasSel.includes(v)) {
        setFormPacote({
          ...formPacote,
          diasSemana: diasSel.filter(d => d !== v)
        });
      } else if (diasSel.length < maxDias) {
        setFormPacote({
          ...formPacote,
          diasSemana: [...diasSel, v].sort()
        });
      }
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 500,
        padding: 20
      },
      onClick: () => setModal(false)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "white",
        borderRadius: 16,
        padding: 28,
        width: "100%",
        maxWidth: 560,
        maxHeight: "90vh",
        overflowY: "auto"
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 20,
        fontWeight: 600
      }
    }, "Novo Pacote de Sessões"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setModal(false),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 20
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Paciente *"), /*#__PURE__*/React.createElement("select", {
      className: "form-input",
      value: formPacote.pacienteId,
      onChange: e => setFormPacote({
        ...formPacote,
        pacienteId: e.target.value
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Selecionar..."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/React.createElement("option", {
      key: p.id,
      value: p.id
    }, p.nome)))), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Nº de Sessões *"), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      type: "number",
      min: "1",
      max: "40",
      placeholder: "Ex: 10",
      value: formPacote.totalSessoes,
      onChange: e => setFormPacote({
        ...formPacote,
        totalSessoes: e.target.value
      })
    })), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Recorrência *"), /*#__PURE__*/React.createElement("select", {
      className: "form-input",
      value: formPacote.recorrencia,
      onChange: e => setFormPacote({
        ...formPacote,
        recorrencia: e.target.value,
        diasSemana: [],
        horariosPorDia: {}
      })
    }, RECORRENCIAS.map(r => /*#__PURE__*/React.createElement("option", {
      key: r
    }, r)))), needDias && /*#__PURE__*/React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Dias da Semana * (escolha ", maxDias, ")"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 4
      }
    }, DIAS.map(d => {
      const sel = diasSel.includes(d.v);
      const dis = !sel && diasSel.length >= maxDias;
      return /*#__PURE__*/React.createElement("div", {
        key: d.v,
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3
        }
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: () => toggleDia(d.v),
        disabled: dis,
        style: {
          padding: "8px 14px",
          borderRadius: 10,
          border: "1.5px solid",
          borderColor: sel ? "var(--purple)" : "#e5e7eb",
          background: sel ? "var(--purple)" : "white",
          color: sel ? "white" : dis ? "#d1d5db" : "#374151",
          fontWeight: sel ? 700 : 400,
          cursor: dis ? "not-allowed" : "pointer",
          fontSize: 13,
          fontFamily: "var(--font-body)"
        }
      }, d.l), sel && /*#__PURE__*/React.createElement("input", {
        type: "time",
        value: (formPacote.horariosPorDia || {})[d.v] || formPacote.horario || "09:00",
        onChange: e => setFormPacote({
          ...formPacote,
          horariosPorDia: {
            ...(formPacote.horariosPorDia || {}),
            [d.v]: e.target.value
          }
        }),
        style: {
          fontSize: 11,
          border: "1px solid #e9d5ff",
          borderRadius: 6,
          padding: "3px 6px",
          width: 72,
          textAlign: "center",
          color: "var(--purple)",
          fontWeight: 600
        }
      }));
    }))), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Data de Início *"), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      type: "date",
      value: formPacote.dataInicio,
      onChange: e => setFormPacote({
        ...formPacote,
        dataInicio: e.target.value
      })
    })), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Horário ", needDias ? "(padrão)" : ""), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      type: "time",
      value: formPacote.horario,
      onChange: e => setFormPacote({
        ...formPacote,
        horario: e.target.value
      })
    })), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Modalidade"), /*#__PURE__*/React.createElement("select", {
      className: "form-input",
      value: formPacote.modalidade || "on-line",
      onChange: e => setFormPacote({
        ...formPacote,
        modalidade: e.target.value
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: "on-line"
    }, "💻 On-line"), /*#__PURE__*/React.createElement("option", {
      value: "presencial"
    }, "🏥 Presencial"), /*#__PURE__*/React.createElement("option", {
      value: "híbrido"
    }, "🔄 Híbrido"))), /*#__PURE__*/React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Tipo de Atendimento"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, [["particular", "🏥 Particular"], ["social", "🌱 Social"], ["parceria", "🤝 Parceria"]].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
      key: v,
      type: "button",
      onClick: () => setFormPacote({
        ...formPacote,
        tipoAtendimento: v,
        valorSessao: v === "social" ? "" : formPacote.valorSessao,
        valorSupervisaoSocial: v === "social" ? "40" : formPacote.valorSupervisaoSocial,
        valorEstagiariaSocial: v === "social" ? "20" : formPacote.valorEstagiariaSocial,
        percParceiro: v === "parceria" ? formPacote.percParceiro || "70" : formPacote.percParceiro
      }),
      style: {
        flex: 1,
        padding: "9px",
        borderRadius: 8,
        border: "2px solid",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: 600,
        borderColor: (formPacote.tipoAtendimento || "particular") === v ? v === "social" ? "#0d9488" : v === "parceria" ? "#b45309" : "#7B00C4" : "#e5e7eb",
        background: (formPacote.tipoAtendimento || "particular") === v ? v === "social" ? "#ccfbf1" : v === "parceria" ? "#fef3c7" : "#f5f3ff" : "white",
        color: (formPacote.tipoAtendimento || "particular") === v ? v === "social" ? "#0d9488" : v === "parceria" ? "#b45309" : "#7B00C4" : "#6b7280"
      }
    }, l)))), (formPacote.tipoAtendimento || "particular") === "social" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Valor Supervisão (R$)"), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      type: "number",
      value: formPacote.valorSupervisaoSocial || "40",
      onChange: e => setFormPacote({
        ...formPacote,
        valorSupervisaoSocial: e.target.value
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 3
      }
    }, "Receita da clínica")), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Valor Estagiária (R$)"), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      type: "number",
      value: formPacote.valorEstagiariaSocial || "20",
      onChange: e => setFormPacote({
        ...formPacote,
        valorEstagiariaSocial: e.target.value
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 3
      }
    }, "Comissão estagiária"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Valor por Sessão (R$)"), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      type: "number",
      placeholder: "Ex: 250",
      value: formPacote.valorSessao,
      onChange: e => setFormPacote({
        ...formPacote,
        valorSessao: e.target.value
      })
    })), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Total do Pacote (R$)"), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      type: "number",
      placeholder: "Automático",
      value: formPacote.valorSessao && formPacote.totalSessoes ? (parseFloat(formPacote.valorSessao) || 0) * (parseInt(formPacote.totalSessoes) || 0) : "",
      readOnly: true,
      style: {
        background: "#f9fafb"
      }
    })), (formPacote.tipoAtendimento || "particular") === "parceria" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Parceira"), /*#__PURE__*/React.createElement("select", {
      className: "form-input",
      value: formPacote.parceiraId || "",
      onChange: e => {
        const p = parceiras.find(x => x.id === e.target.value);
        setFormPacote({
          ...formPacote,
          parceiraId: e.target.value,
          percParceiro: p && p.percentual ? String(p.percentual) : formPacote.percParceiro || "70"
        });
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Selecione a parceira..."), parceiras.filter(p => p.tipo !== "estagiaria").map(p => /*#__PURE__*/React.createElement("option", {
      key: p.id,
      value: p.id
    }, p.nome))), parceiras.filter(p => p.tipo !== "estagiaria").length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#b45309",
        marginTop: 3
      }
    }, "Nenhuma parceira cadastrada — cadastre na tela Comissões.")), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "% do Parceiro"), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      type: "number",
      min: "0",
      max: "100",
      value: formPacote.percParceiro || "70",
      onChange: e => setFormPacote({
        ...formPacote,
        percParceiro: e.target.value
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 3
      }
    }, "Editável — padrão 70%")), formPacote.valorSessao && formPacote.totalSessoes && (() => {
      const tot = (parseFloat(formPacote.valorSessao) || 0) * (parseInt(formPacote.totalSessoes) || 0);
      const pp = parseFloat(formPacote.percParceiro) || 0;
      const vParc = tot * pp / 100;
      return /*#__PURE__*/React.createElement("div", {
        style: {
          gridColumn: "1/-1",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: 13
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          color: "#b45309",
          marginBottom: 6
        }
      }, "🤝 Cálculo da parceria"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 18px",
          color: "#374151"
        }
      }, /*#__PURE__*/React.createElement("span", null, "Total: ", /*#__PURE__*/React.createElement("strong", null, "R$ ", tot.toFixed(2).replace(".", ","))), /*#__PURE__*/React.createElement("span", null, "Repasse parceira (", pp, "%): ", /*#__PURE__*/React.createElement("strong", {
        style: {
          color: "#b45309"
        }
      }, "R$ ", vParc.toFixed(2).replace(".", ","))), /*#__PURE__*/React.createElement("span", null, "Clínica antes da comissão: ", /*#__PURE__*/React.createElement("strong", {
        style: {
          color: "#059669"
        }
      }, "R$ ", (tot - vParc).toFixed(2).replace(".", ",")))), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#92400e",
          marginTop: 6
        }
      }, "A comissão da secretária (sobre o total) é definida no botão de salvar abaixo."));
    })())), /*#__PURE__*/React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Status do Pagamento"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, [["pendente", "Pendente", "#d97706"], ["recebido", "✓ Recebido", "#059669"]].map(([v, l, c]) => /*#__PURE__*/React.createElement("button", {
      key: v,
      type: "button",
      onClick: () => setFormPacote({
        ...formPacote,
        statusPag: v
      }),
      style: {
        flex: 1,
        padding: "10px",
        borderRadius: 10,
        border: "1.5px solid",
        borderColor: (formPacote.statusPag || "pendente") === v ? c : "#e5e7eb",
        background: (formPacote.statusPag || "pendente") === v ? c + "15" : "white",
        color: (formPacote.statusPag || "pendente") === v ? c : "#6b7280",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "var(--font-body)"
      }
    }, l)))), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Forma de Pagamento"), /*#__PURE__*/React.createElement("select", {
      className: "form-input",
      value: formPacote.formaPag || "",
      onChange: e => setFormPacote({
        ...formPacote,
        formaPag: e.target.value
      })
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Selecionar..."), FORMAS.map(f => /*#__PURE__*/React.createElement("option", {
      key: f
    }, f)))), /*#__PURE__*/React.createElement("div", {
      className: "form-group"
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Data do Pagamento"), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      type: "date",
      value: formPacote.dataPagamento || "",
      onChange: e => setFormPacote({
        ...formPacote,
        dataPagamento: e.target.value
      })
    })), /*#__PURE__*/React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label",
      style: {
        margin: 0
      }
    }, "Formas de pagamento"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      style: {
        fontSize: 12,
        color: "#7B00C4",
        background: "#f3e6ff",
        border: "1px solid #d9b3f5",
        borderRadius: 6,
        padding: "3px 10px",
        cursor: "pointer"
      },
      onClick: () => setFormPacote({
        ...formPacote,
        pagamentosExtras: [...(formPacote.pagamentosExtras || []), {
          forma: "",
          valor: "",
          data: new Date().toISOString().slice(0, 10)
        }]
      })
    }, "+ Adicionar forma")), (formPacote.pagamentosExtras || []).length === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        fontStyle: "italic",
        padding: "6px 0"
      }
    }, "Clique em \"+ Adicionar forma\" para registrar PIX, cartão, dinheiro em datas diferentes."), (formPacote.pagamentosExtras || []).map((pg, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr auto",
        gap: 6,
        marginBottom: 6,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("select", {
      className: "form-input",
      style: {
        fontSize: 12
      },
      value: pg.forma,
      onChange: e => {
        const p = [...(formPacote.pagamentosExtras || [])];
        p[i] = {
          ...p[i],
          forma: e.target.value
        };
        setFormPacote({
          ...formPacote,
          pagamentosExtras: p
        });
      }
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Forma..."), FORMAS.map(f => /*#__PURE__*/React.createElement("option", {
      key: f
    }, f))), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      style: {
        fontSize: 12
      },
      type: "number",
      placeholder: "Valor R$",
      value: pg.valor,
      onChange: e => {
        const p = [...(formPacote.pagamentosExtras || [])];
        p[i] = {
          ...p[i],
          valor: e.target.value
        };
        setFormPacote({
          ...formPacote,
          pagamentosExtras: p
        });
      }
    }), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      style: {
        fontSize: 12
      },
      type: "date",
      value: pg.data,
      onChange: e => {
        const p = [...(formPacote.pagamentosExtras || [])];
        p[i] = {
          ...p[i],
          data: e.target.value
        };
        setFormPacote({
          ...formPacote,
          pagamentosExtras: p
        });
      }
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      style: {
        color: "#dc2626",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 16,
        padding: "0 4px"
      },
      onClick: () => {
        const p = [...(formPacote.pagamentosExtras || [])];
        p.splice(i, 1);
        setFormPacote({
          ...formPacote,
          pagamentosExtras: p
        });
      }
    }, "✕")))), /*#__PURE__*/React.createElement("div", {
      className: "form-group",
      style: {
        gridColumn: "1/-1"
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Observações"), /*#__PURE__*/React.createElement(TextAreaVoz, {
      className: "form-input",
      rows: 2,
      value: formPacote.obs,
      onChange: e => setFormPacote({
        ...formPacote,
        obs: e.target.value
      }),
      placeholder: "Notas sobre o pacote..."
    }))), formPacote.totalSessoes && formPacote.dataInicio && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f0fdf4",
        border: "1px solid #86efac",
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        fontSize: 13,
        color: "#065f46"
      }
    }, "✅ ", /*#__PURE__*/React.createElement("strong", null, formPacote.totalSessoes, " sessões"), " a partir de ", /*#__PURE__*/React.createElement("strong", null, new Date(formPacote.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")), " · ", /*#__PURE__*/React.createElement("strong", null, formPacote.recorrencia), needDias && diasSel.length > 0 && /*#__PURE__*/React.createElement("span", null, " · dias: ", /*#__PURE__*/React.createElement("strong", null, diasSel.map(d => DIAS_LABEL[d]).join(", ")))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        justifyContent: "flex-end",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => setModal(false)
    }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => salvarPacote(null),
      disabled: salvando,
      style: {
        border: "1px solid #e5e7eb",
        color: "#6b7280",
        fontSize: 12
      },
      title: "Sem comissão — para lançamentos passados"
    }, "📋 Sem comissão"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      onClick: () => salvarPacote("primeira"),
      disabled: salvando,
      style: {
        background: "#7B00C4"
      },
      title: "10% de comissão"
    }, "🌟 Primeira Venda"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      onClick: () => salvarPacote("recorrente"),
      disabled: salvando,
      style: {
        background: "#0891b2"
      },
      title: "5% de comissão"
    }, "🔁 Venda Recorrente"))));
  })());
}
function FinanceiroPessoal({
  somenteLeitura = false
}) {
  const [lancamentos, setLancamentos] = useState([]);
  const [recorrentes, setRecorrentes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear() + "");
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState({
    nome: "",
    tipo: "despesa"
  });
  const [modalBaixa, setModalBaixa] = useState(null); // recorrente para dar baixa
  const [formBaixa, setFormBaixa] = useState({
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    formaPag: "PIX",
    modo: "este"
  });
  const mesAtual = new Date().toISOString().slice(0, 7);
  const CATS_RECEITA_DEFAULT = ["Salário/Pró-labore", "Consultoria", "Aluguel Recebido", "Investimentos", "Dividendos", "Freelance", "Outros"];
  const CATS_DESPESA_DEFAULT = ["Aluguel", "Condomínio", "Alimentação", "Saúde", "Educação", "Transporte", "Lazer", "Assinaturas", "Cartão de Crédito", "Empréstimo/Financiamento", "Contador", "Impostos", "Marketing", "Ferramentas de IA", "Telefone/Internet", "Energia/Água", "Vestuário", "Viagem", "Outros"];
  const FORMAS = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Depósito", "Transferência", "Débito Automático", "Outro"];
  const RECORR = ["Mensal", "Semanal", "Quinzenal", "Bimestral", "Trimestral", "Semestral", "Anual"];
  const catsReceita = [...CATS_RECEITA_DEFAULT, ...categorias.filter(c => c.tipo === "receita").map(c => c.nome)];
  const catsDespesa = [...CATS_DESPESA_DEFAULT, ...categorias.filter(c => c.tipo === "despesa").map(c => c.nome)];
  const [formAvulso, setFormAvulso] = useState({
    tipo: "despesa",
    categoria: "",
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    formaPag: "PIX",
    status: "pago",
    obs: ""
  });
  const [formRecorr, setFormRecorr] = useState({
    tipo: "despesa",
    categoria: "",
    descricao: "",
    valorPrevisto: "",
    recorrencia: "Mensal",
    diaVencimento: "10",
    mesInicio: new Date().toISOString().slice(0, 7),
    ativo: true
  });
  useEffect(() => {
    const u1 = db.collection("clinica_financeiro_pessoal").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
      setLancamentos(docs);
    }, () => {});
    const u2 = db.collection("clinica_fin_pessoal_recorrentes").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toDate?.() ?? new Date(0)) - (a.createdAt?.toDate?.() ?? new Date(0)));
      setRecorrentes(docs);
    }, () => {});
    const u3 = db.collection("clinica_fin_pessoal_categorias").onSnapshot(s => setCategorias(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);
  const anoAtualNum = new Date().getFullYear();
  const anosExist = [...new Set(lancamentos.map(l => l.data?.slice(0, 4)).filter(Boolean))].map(Number);
  const anosSet = new Set([...anosExist, anoAtualNum - 1, anoAtualNum, anoAtualNum + 1]);
  const anos = [...anosSet].sort().map(String);
  const mesesDisp = Array.from({
    length: 12
  }, (_, i) => `${anoFiltro}-${String(i + 1).padStart(2, "0")}`);
  const mesFiltroEfetivo = mesFiltro.startsWith(anoFiltro) ? mesFiltro : mesAtual.startsWith(anoFiltro) ? mesAtual : anoFiltro + "-01";
  const lancMes = lancamentos.filter(l => l.data?.startsWith(mesFiltroEfetivo));
  const lancAno = lancamentos.filter(l => l.data?.startsWith(anoFiltro));
  function fmt(v) {
    return (v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }
  function mesLabel(m) {
    try {
      return new Date(m + "-02").toLocaleDateString("pt-BR", {
        month: "short"
      });
    } catch (e) {
      return m;
    }
  }
  function calcRec(l) {
    return l.filter(x => x.tipo === "receita" && (x.status === "pago" || x.status === "recebido")).reduce((a, x) => a + (parseFloat(x.valor) || 0), 0);
  }
  function calcDesp(l) {
    return l.filter(x => x.tipo === "despesa" && (x.status === "pago" || x.status === "recebido")).reduce((a, x) => a + (parseFloat(x.valor) || 0), 0);
  }
  const recMes = calcRec(lancMes),
    despMes = calcDesp(lancMes),
    saldoMes = recMes - despMes;
  const recAno = calcRec(lancAno),
    despAno = calcDesp(lancAno);
  const pendMes = lancMes.filter(l => l.status === "pendente").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const corTipo = t => t === "receita" ? "#059669" : "#dc2626";
  const bgTipo = t => t === "receita" ? "#d1fae5" : "#fee2e2";

  // Recorrentes ativos com baixa já registrada neste mês
  const recorrAtivos = recorrentes.filter(r => r.ativo !== false);
  function jaDeuBaixaMes(r) {
    return lancamentos.some(l => l.recorrenteId === r.id && l.data?.startsWith(mesFiltroEfetivo));
  }
  async function salvarAvulso() {
    if (!formAvulso.valor || !formAvulso.data) {
      alert("Valor e data obrigatórios.");
      return;
    }
    setSalvando(true);
    const dados = {
      ...formAvulso,
      valor: parseFloat(formAvulso.valor),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editando) {
      await db.collection("clinica_financeiro_pessoal").doc(editando).update(dados);
    } else {
      await db.collection("clinica_financeiro_pessoal").add(dados);
    }
    setModal(false);
    setEditando(null);
    setFormAvulso({
      tipo: "despesa",
      categoria: "",
      descricao: "",
      valor: "",
      data: new Date().toISOString().slice(0, 10),
      formaPag: "PIX",
      status: "pago",
      obs: ""
    });
    setSalvando(false);
  }
  async function salvarRecorrente() {
    if (!formRecorr.categoria || !formRecorr.valorPrevisto) {
      alert("Categoria e valor obrigatórios.");
      return;
    }
    setSalvando(true);
    const dados = {
      ...formRecorr,
      valorPrevisto: parseFloat(formRecorr.valorPrevisto),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editando) {
      await db.collection("clinica_fin_pessoal_recorrentes").doc(editando).update(dados);
    } else {
      await db.collection("clinica_fin_pessoal_recorrentes").add(dados);
    }
    setModal(false);
    setEditando(null);
    setFormRecorr({
      tipo: "despesa",
      categoria: "",
      descricao: "",
      valorPrevisto: "",
      recorrencia: "Mensal",
      diaVencimento: "10",
      mesInicio: new Date().toISOString().slice(0, 7),
      ativo: true
    });
    setSalvando(false);
  }

  // Dar baixa — este mês ou este e os próximos (até dez)
  async function confirmarBaixa() {
    if (!formBaixa.valor) {
      alert("Digite o valor.");
      return;
    }
    setSalvando(true);
    const r = modalBaixa;
    const batch = db.batch();
    if (formBaixa.modo === "este") {
      // Só este mês
      const dia = r.diaVencimento || "10";
      const data = `${mesFiltroEfetivo}-${String(dia).padStart(2, "0")}`;
      const ref = db.collection("clinica_financeiro_pessoal").doc();
      batch.set(ref, {
        tipo: r.tipo,
        categoria: r.categoria,
        descricao: r.descricao || r.categoria,
        valor: parseFloat(formBaixa.valor),
        data,
        formaPag: formBaixa.formaPag,
        status: "pago",
        recorrenteId: r.id,
        obs: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Este e os próximos até dezembro do ano atual
      const [anoMes, mesMes] = mesFiltroEfetivo.split("-").map(Number);
      for (let m = mesMes; m <= 12; m++) {
        const mesStr = `${anoMes}-${String(m).padStart(2, "0")}`;
        const dia = r.diaVencimento || "10";
        const data = `${mesStr}-${String(dia).padStart(2, "0")}`;
        // Não duplicar se já existe baixa neste mês
        const jaExiste = lancamentos.some(l => l.recorrenteId === r.id && l.data?.startsWith(mesStr));
        if (!jaExiste) {
          const ref = db.collection("clinica_financeiro_pessoal").doc();
          batch.set(ref, {
            tipo: r.tipo,
            categoria: r.categoria,
            descricao: r.descricao || r.categoria,
            valor: parseFloat(formBaixa.valor),
            data,
            formaPag: formBaixa.formaPag,
            status: "pago",
            recorrenteId: r.id,
            obs: "Baixa automática — série",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
    await batch.commit();
    setModalBaixa(null);
    setFormBaixa({
      valor: "",
      data: new Date().toISOString().slice(0, 10),
      formaPag: "PIX",
      modo: "este"
    });
    setSalvando(false);
  }
  async function excluir(id) {
    if (!confirm("Excluir lançamento?")) return;
    await db.collection("clinica_financeiro_pessoal").doc(id).delete();
  }
  async function excluirRec(id) {
    if (!confirm("Excluir recorrente?")) return;
    await db.collection("clinica_fin_pessoal_recorrentes").doc(id).delete();
  }
  async function salvarCategoria() {
    if (!novaCategoria.nome.trim()) {
      alert("Digite o nome.");
      return;
    }
    await db.collection("clinica_fin_pessoal_categorias").add({
      ...novaCategoria,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setNovaCategoria({
      nome: "",
      tipo: "despesa"
    });
  }
  async function excluirCategoria(id) {
    if (!confirm("Excluir?")) return;
    await db.collection("clinica_fin_pessoal_categorias").doc(id).delete();
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "page-title"
  }, "Financeiro Pessoal"), /*#__PURE__*/React.createElement("div", {
    className: "page-subtitle"
  }, somenteLeitura ? "Visualização — Paulo Sergio" : "Gestão financeira pessoal e familiar")), !somenteLeitura && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal("categoria")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "tag",
    size: 15
  }), " Categorias"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    onClick: () => {
      setModal("recorrente");
      setEditando(null);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "repeat",
    size: 15
  }), " + Recorrente"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      setModal("avulso");
      setEditando(null);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), " + Lançamento"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 14,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, "Ano:"), anos.map(a => /*#__PURE__*/React.createElement("button", {
    key: a,
    onClick: () => {
      setAnoFiltro(a);
      setMesFiltro(a === String(anoAtualNum) ? mesAtual : a + "-01");
    },
    style: {
      padding: "5px 16px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: anoFiltro === a ? "var(--purple)" : "#e5e7eb",
      background: anoFiltro === a ? "var(--purple)" : "white",
      color: anoFiltro === a ? "white" : "#6b7280",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, a, a === String(anoAtualNum) && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 3,
      fontSize: 9
    }
  }, "●")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: saldoMes >= 0 ? "#d1fae5" : "#fee2e2",
      borderRadius: 12,
      padding: "14px 16px",
      border: "1.5px solid",
      borderColor: saldoMes >= 0 ? "#6ee7b7" : "#fca5a5"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: saldoMes >= 0 ? "#059669" : "#dc2626",
      marginBottom: 4
    }
  }, "Saldo (", mesLabel(mesFiltroEfetivo), ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: saldoMes >= 0 ? "#059669" : "#dc2626"
    }
  }, fmt(saldoMes)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      marginTop: 2
    }
  }, "+", fmt(recMes), " / -", fmt(despMes))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fffbeb",
      borderRadius: 12,
      padding: "14px 16px",
      border: "1.5px solid #fcd34d"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#d97706",
      marginBottom: 4
    }
  }, "Pendente"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#d97706"
    }
  }, fmt(pendMes))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fdf4",
      borderRadius: 12,
      padding: "14px 16px",
      border: "1.5px solid #86efac"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#059669",
      marginBottom: 4
    }
  }, "Receitas (", anoFiltro, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#059669"
    }
  }, fmt(recAno))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fef2f2",
      borderRadius: 12,
      padding: "14px 16px",
      border: "1.5px solid #fca5a5"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#dc2626",
      marginBottom: 4
    }
  }, "Despesas (", anoFiltro, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: "#dc2626"
    }
  }, fmt(despAno)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 24,
      overflowX: "auto",
      paddingBottom: 4
    }
  }, mesesDisp.map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    onClick: () => setMesFiltro(m),
    style: {
      padding: "5px 14px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: mesFiltroEfetivo === m ? "var(--purple)" : "#e5e7eb",
      background: mesFiltroEfetivo === m ? "var(--purple)" : "white",
      color: mesFiltroEfetivo === m ? "white" : "#6b7280",
      fontSize: 12,
      fontWeight: mesFiltroEfetivo === m ? 700 : 400,
      cursor: "pointer",
      flexShrink: 0
    }
  }, mesLabel(m)))), recorrAtivos.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      marginBottom: 10,
      display: "flex",
      alignItems: "center",
      gap: 6,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "repeat",
    size: 15
  }), " Recorrentes — ", mesLabel(mesFiltroEfetivo)), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, recorrAtivos.map(r => {
    const baixaDone = jaDeuBaixaMes(r);
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid var(--gray-100)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: 8,
        background: bgTipo(r.tipo),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: r.tipo === "receita" ? "trending-up" : "trending-down",
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14
      }
    }, r.descricao || r.categoria), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, r.categoria, " · vence dia ", r.diaVencimento, " · ", r.recorrencia)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: corTipo(r.tipo),
        marginRight: 8
      }
    }, fmt(parseFloat(r.valorPrevisto) || 0)), baixaDone ? /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#d1fae5",
        color: "#065f46",
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20
      }
    }, "✓ Pago") : !somenteLeitura && /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      style: {
        fontSize: 12,
        padding: "6px 14px"
      },
      onClick: () => {
        setModalBaixa(r);
        setFormBaixa({
          valor: r.valorPrevisto || "",
          data: `${mesFiltroEfetivo}-${String(r.diaVencimento || 10).padStart(2, "0")}`,
          formaPag: "PIX",
          modo: "este"
        });
      }
    }, "Dar baixa"), !somenteLeitura && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        padding: "4px 8px"
      },
      onClick: () => {
        setFormRecorr({
          tipo: r.tipo,
          categoria: r.categoria,
          descricao: r.descricao || "",
          valorPrevisto: r.valorPrevisto + "",
          recorrencia: r.recorrencia,
          diaVencimento: r.diaVencimento,
          mesInicio: r.mesInicio || mesAtual,
          ativo: r.ativo
        });
        setEditando(r.id);
        setModal("recorrente");
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "pencil",
      size: 13
    })), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        padding: "4px 8px",
        color: "var(--danger)"
      },
      onClick: () => excluirRec(r.id)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "trash-2",
      size: 13
    }))));
  }))), /*#__PURE__*/React.createElement("div", null, lancMes.filter(l => l.tipo === "receita").length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#059669",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trending-up",
    size: 16
  }), " Receitas"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#059669"
    }
  }, fmt(recMes))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, lancMes.filter(l => l.tipo === "receita").map(l => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: "#d1fae5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-down-left",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, l.descricao || l.categoria), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, l.categoria, " · ", l.data, l.formaPag ? " · " + l.formaPag : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#059669"
    }
  }, fmt(parseFloat(l.valor) || 0)), /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#d1fae5",
      color: "#065f46",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 20
    }
  }, "✓ Recebido"), !somenteLeitura && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px"
    },
    onClick: () => {
      setFormAvulso({
        tipo: l.tipo,
        categoria: l.categoria || "",
        descricao: l.descricao || "",
        valor: l.valor + "",
        data: l.data,
        formaPag: l.formaPag || "PIX",
        status: l.status,
        obs: l.obs || ""
      });
      setEditando(l.id);
      setModal("avulso");
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pencil",
    size: 13
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px",
      color: "var(--danger)"
    },
    onClick: () => excluir(l.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }))))))), lancMes.filter(l => l.tipo === "despesa").length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#dc2626",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trending-down",
    size: 16
  }), " Despesas"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#dc2626"
    }
  }, fmt(despMes))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, lancMes.filter(l => l.tipo === "despesa").map(l => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: "#fee2e2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-up-right",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 14
    }
  }, l.descricao || l.categoria), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, l.categoria, " · ", l.data, l.formaPag ? " · " + l.formaPag : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: "#dc2626"
    }
  }, fmt(parseFloat(l.valor) || 0)), /*#__PURE__*/React.createElement("span", {
    style: {
      background: l.status === "pago" ? "#d1fae5" : "#fef3c7",
      color: l.status === "pago" ? "#065f46" : "#92400e",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 20
    }
  }, l.status === "pago" ? "✓ Pago" : "Pendente"), !somenteLeitura && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px"
    },
    onClick: () => {
      setFormAvulso({
        tipo: l.tipo,
        categoria: l.categoria || "",
        descricao: l.descricao || "",
        valor: l.valor + "",
        data: l.data,
        formaPag: l.formaPag || "PIX",
        status: l.status,
        obs: l.obs || ""
      });
      setEditando(l.id);
      setModal("avulso");
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pencil",
    size: 13
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px",
      color: "var(--danger)"
    },
    onClick: () => excluir(l.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }))))))), lancMes.length === 0 && recorrAtivos.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 40,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wallet",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontWeight: 500
    }
  }, "Nenhum lançamento em ", mesLabel(mesFiltroEfetivo)), !somenteLeitura && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      marginTop: 6
    }
  }, "Use \"+ Lançamento\" ou \"+ Recorrente\" acima."))), modalBaixa && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModalBaixa(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 460
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 4
    }
  }, "Dar baixa — ", modalBaixa.descricao || modalBaixa.categoria), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Previsto: ", fmt(parseFloat(modalBaixa.valorPrevisto) || 0)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Valor Real (R$)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formBaixa.valor,
    onChange: e => setFormBaixa({
      ...formBaixa,
      valor: e.target.value
    }),
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formBaixa.formaPag,
    onChange: e => setFormBaixa({
      ...formBaixa,
      formaPag: e.target.value
    })
  }, FORMAS.map(f => /*#__PURE__*/React.createElement("option", {
    key: f
  }, f))))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Aplicar para"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["este", "Só este mês", "#7B00C4"], ["proximos", "Este e os próximos (até dez.)", "#0891b2"]].map(([v, l, c]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormBaixa({
      ...formBaixa,
      modo: v
    }),
    style: {
      flex: 1,
      padding: "10px 8px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formBaixa.modo === v ? c : "#e5e7eb",
      background: formBaixa.modo === v ? c + "15" : "white",
      color: formBaixa.modo === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "var(--font-body)",
      textAlign: "center"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalBaixa(null)
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: confirmarBaixa,
    disabled: salvando
  }, salvando ? "Salvando..." : "Confirmar Baixa")))), modal === "avulso" && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500,
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, editando ? "Editar" : "Novo", " Lançamento"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(false);
      setEditando(null);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Tipo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["receita", "↓ Receita", "#059669"], ["despesa", "↑ Despesa", "#dc2626"]].map(([v, l, c]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormAvulso({
      ...formAvulso,
      tipo: v,
      categoria: ""
    }),
    style: {
      flex: 1,
      padding: 10,
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formAvulso.tipo === v ? c : "#e5e7eb",
      background: formAvulso.tipo === v ? c + "15" : "white",
      color: formAvulso.tipo === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Categoria"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formAvulso.categoria,
    onChange: e => setFormAvulso({
      ...formAvulso,
      categoria: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar..."), (formAvulso.tipo === "receita" ? catsReceita : catsDespesa).map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Descrição"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: formAvulso.descricao,
    onChange: e => setFormAvulso({
      ...formAvulso,
      descricao: e.target.value
    }),
    placeholder: "Ex: Conta de luz"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Valor (R$)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formAvulso.valor,
    onChange: e => setFormAvulso({
      ...formAvulso,
      valor: e.target.value
    }),
    placeholder: "0,00"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Data"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formAvulso.data,
    onChange: e => setFormAvulso({
      ...formAvulso,
      data: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Forma de Pagamento"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formAvulso.formaPag,
    onChange: e => setFormAvulso({
      ...formAvulso,
      formaPag: e.target.value
    })
  }, FORMAS.map(f => /*#__PURE__*/React.createElement("option", {
    key: f
  }, f)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Status"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["pago", formAvulso.tipo === "receita" ? "✓ Recebido" : "✓ Pago", "#059669"], ["pendente", "Pendente", "#d97706"]].map(([v, l, c]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormAvulso({
      ...formAvulso,
      status: v
    }),
    style: {
      flex: 1,
      padding: 10,
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formAvulso.status === v ? c : "#e5e7eb",
      background: formAvulso.status === v ? c + "15" : "white",
      color: formAvulso.status === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Observações"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: formAvulso.obs || "",
    onChange: e => setFormAvulso({
      ...formAvulso,
      obs: e.target.value
    }),
    placeholder: "Opcional..."
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarAvulso,
    disabled: salvando
  }, salvando ? "Salvando..." : editando ? "Salvar" : "Lançar")))), modal === "recorrente" && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 500,
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, editando ? "Editar" : "Novo", " Lançamento Recorrente"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(false);
      setEditando(null);
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Tipo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["receita", "↓ Receita", "#059669"], ["despesa", "↑ Despesa", "#dc2626"]].map(([v, l, c]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormRecorr({
      ...formRecorr,
      tipo: v,
      categoria: ""
    }),
    style: {
      flex: 1,
      padding: 10,
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formRecorr.tipo === v ? c : "#e5e7eb",
      background: formRecorr.tipo === v ? c + "15" : "white",
      color: formRecorr.tipo === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Categoria"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formRecorr.categoria,
    onChange: e => setFormRecorr({
      ...formRecorr,
      categoria: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar..."), (formRecorr.tipo === "receita" ? catsReceita : catsDespesa).map(c => /*#__PURE__*/React.createElement("option", {
    key: c
  }, c)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Descrição"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: formRecorr.descricao || "",
    onChange: e => setFormRecorr({
      ...formRecorr,
      descricao: e.target.value
    }),
    placeholder: "Ex: Aluguel ap. 302"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Valor Previsto (R$)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    value: formRecorr.valorPrevisto,
    onChange: e => setFormRecorr({
      ...formRecorr,
      valorPrevisto: e.target.value
    }),
    placeholder: "0,00"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Recorrência"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formRecorr.recorrencia,
    onChange: e => setFormRecorr({
      ...formRecorr,
      recorrencia: e.target.value
    })
  }, RECORR.map(r => /*#__PURE__*/React.createElement("option", {
    key: r
  }, r)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Dia de Vencimento"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    min: "1",
    max: "31",
    value: formRecorr.diaVencimento,
    onChange: e => setFormRecorr({
      ...formRecorr,
      diaVencimento: e.target.value
    }),
    placeholder: "10"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Início"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "month",
    value: formRecorr.mesInicio,
    onChange: e => setFormRecorr({
      ...formRecorr,
      mesInicio: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Status"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: formRecorr.ativo ? "ativo" : "inativo",
    onChange: e => setFormRecorr({
      ...formRecorr,
      ativo: e.target.value === "ativo"
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "ativo"
  }, "Ativo"), /*#__PURE__*/React.createElement("option", {
    value: "inativo"
  }, "Inativo")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setModal(false);
      setEditando(null);
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarRecorrente,
    disabled: salvando
  }, salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar")))), modal === "categoria" && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 480,
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, "Gerenciar Categorias"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    style: {
      width: 120,
      flexShrink: 0
    },
    value: novaCategoria.tipo,
    onChange: e => setNovaCategoria({
      ...novaCategoria,
      tipo: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "receita"
  }, "Receita"), /*#__PURE__*/React.createElement("option", {
    value: "despesa"
  }, "Despesa")), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1
    },
    value: novaCategoria.nome,
    onChange: e => setNovaCategoria({
      ...novaCategoria,
      nome: e.target.value
    }),
    placeholder: "Nova categoria...",
    onKeyDown: e => e.key === "Enter" && salvarCategoria()
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarCategoria
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, categorias.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      textAlign: "center",
      padding: 20
    }
  }, "Nenhuma categoria personalizada ainda."), categorias.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      borderRadius: 10,
      background: c.tipo === "receita" ? "#f0fdf4" : "#fef2f2",
      border: "1px solid",
      borderColor: c.tipo === "receita" ? "#86efac" : "#fca5a5"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: c.tipo === "receita" ? "#059669" : "#dc2626",
      background: "white",
      padding: "2px 8px",
      borderRadius: 10
    }
  }, c.tipo), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 14
    }
  }, c.nome), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "4px 8px",
      color: "var(--danger)"
    },
    onClick: () => excluirCategoria(c.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: 12,
      background: "var(--gray-50)",
      borderRadius: 10,
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "As categorias padrão já estão inclusas (Aluguel, Contador, Impostos, etc.). Aqui você adiciona categorias extras."))));
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
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    instituicao: "",
    semestre: "",
    senha: "",
    obs: ""
  });
  const [salvando, setSalvando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [editando, setEditando] = useState(null);
  useEffect(() => {
    const unsub = db.collection("clinica_alunos").onSnapshot(snap => {
      setAlunos(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  const filtrados = alunos.filter(a => {
    const fOk = filtro === "todos" || a.status === filtro;
    const bOk = !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.email?.toLowerCase().includes(busca.toLowerCase());
    return fOk && bOk;
  });
  async function salvar() {
    if (!form.nome || !form.email) {
      alert("Nome e e-mail obrigatorios.");
      return;
    }
    if (!editando && !form.senha) {
      alert("Senha obrigatoria para novo aluno.");
      return;
    }
    setSalvando(true);
    if (editando) {
      const {
        senha,
        ...dados
      } = form;
      await db.collection("clinica_alunos").doc(editando).update(dados);
    } else {
      await db.collection("clinica_alunos").add({
        ...form,
        status: "ativo",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    setModal(false);
    setForm({
      nome: "",
      email: "",
      telefone: "",
      instituicao: "",
      semestre: "",
      senha: "",
      obs: ""
    });
    setEditando(null);
    setSalvando(false);
  }
  async function excluir(id) {
    if (!confirm("Remover aluno?")) return;
    await db.collection("clinica_alunos").doc(id).delete();
  }
  function abrirEditar(a) {
    setForm({
      nome: a.nome || "",
      email: a.email || "",
      telefone: a.telefone || "",
      instituicao: a.instituicao || "",
      semestre: a.semestre || "",
      senha: "",
      obs: a.obs || ""
    });
    setEditando(a.id);
    setModal(true);
  }
  if (loading) return /*#__PURE__*/React.createElement(Spinner, null);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "page-header",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "page-title"
  }, "Alunos em Supervisao"), /*#__PURE__*/React.createElement("div", {
    className: "page-subtitle"
  }, alunos.filter(a => a.status === "ativo").length, " aluno(s) cadastrado(s)")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      setForm({
        nome: "",
        email: "",
        telefone: "",
        instituicao: "",
        semestre: "",
        senha: "",
        obs: ""
      });
      setEditando(null);
      setModal(true);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user-plus",
    size: 16
  }), " Cadastrar Aluno")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginBottom: 20,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1,
      minWidth: 200
    },
    placeholder: "Buscar por nome ou e-mail...",
    value: busca,
    onChange: e => setBusca(e.target.value)
  }), [["todos", "Todos"], ["ativo", "Ativos"], ["inativo", "Inativos"]].map(([f, l]) => /*#__PURE__*/React.createElement("button", {
    key: f,
    className: "btn " + (filtro === f ? "btn-purple" : "btn-ghost"),
    onClick: () => setFiltro(f)
  }, l))), filtrados.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "graduation-cap",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, busca ? "Nenhum aluno encontrado." : "Nenhum aluno cadastrado ainda.")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, filtrados.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "card",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: "50%",
      background: "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      color: "var(--purple)",
      flexShrink: 0,
      fontSize: 16
    }
  }, (a.nome || "?")[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, a.nome), /*#__PURE__*/React.createElement("span", {
    className: "badge " + (a.status === "ativo" ? "badge-green" : "badge-gray")
  }, a.status === "ativo" ? "Ativo" : "Inativo")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      display: "flex",
      gap: 12,
      marginTop: 2,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", null, "✉ ", a.email), a.instituicao && /*#__PURE__*/React.createElement("span", null, "🏛 ", a.instituicao, a.semestre ? " · " + a.semestre : ""), /*#__PURE__*/React.createElement("span", null, "👤 ", a.pacientesVinculados || 0, " paciente(s)"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      color: "var(--purple)",
      padding: "6px 12px"
    },
    onClick: () => setDetalhe(a)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 13
  }), " Ver"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px"
    },
    onClick: () => abrirEditar(a)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pencil",
    size: 13
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px",
      color: "var(--danger)"
    },
    onClick: () => excluir(a.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 13
  })))))), modal && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 520,
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 20
    }
  }, editando ? "Editar Aluno" : "Cadastrar Novo Aluno"), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "NOME COMPLETO *"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.nome,
    onChange: e => setForm({
      ...form,
      nome: e.target.value
    }),
    placeholder: "Nome do aluno",
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "E-MAIL *"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "email",
    value: form.email,
    onChange: e => setForm({
      ...form,
      email: e.target.value
    }),
    placeholder: "aluno@email.com",
    disabled: !!editando
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "TELEFONE"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.telefone,
    onChange: e => setForm({
      ...form,
      telefone: e.target.value
    }),
    placeholder: "(00) 9 0000-0000"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "INSTITUIÇÃO"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.instituicao,
    onChange: e => setForm({
      ...form,
      instituicao: e.target.value
    }),
    placeholder: "Nome da faculdade"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "SEMESTRE"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.semestre,
    onChange: e => setForm({
      ...form,
      semestre: e.target.value
    }),
    placeholder: "Ex: 8º semestre"
  }))), !editando && /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "SENHA DE ACESSO *"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "password",
    value: form.senha,
    onChange: e => setForm({
      ...form,
      senha: e.target.value
    }),
    placeholder: "Senha para o aluno acessar o portal"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "OBSERVAÇÕES"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: form.obs,
    onChange: e => setForm({
      ...form,
      obs: e.target.value
    }),
    placeholder: "Notas sobre o aluno..."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal(false)
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando
  }, salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar aluno")))), detalhe && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      zIndex: 500
    },
    onClick: () => setDetalhe(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      width: "100%",
      maxWidth: 480,
      height: "100%",
      overflowY: "auto",
      padding: 28
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "graduation-cap",
    size: 20
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      flex: 1
    }
  }, detalhe.nome), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDetalhe(null),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge " + (detalhe.status === "ativo" ? "badge-green" : "badge-gray")
  }, detalhe.status === "ativo" ? "Ativo" : "Inativo"), detalhe.instituicao && /*#__PURE__*/React.createElement("span", {
    className: "badge badge-purple"
  }, detalhe.instituicao)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      fontSize: 14
    }
  }, detalhe.email && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "E-mail"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, detalhe.email)), detalhe.telefone && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Telefone"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, detalhe.telefone)), detalhe.instituicao && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Instituicao"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, detalhe.instituicao)), detalhe.semestre && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Semestre"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, detalhe.semestre))), detalhe.obs && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: 12,
      background: "var(--gray-50)",
      borderRadius: 8,
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, detalhe.obs))));
}

// ═══════════════════════════════════════════════════════
// TERAPIA DE CASAIS
// ═══════════════════════════════════════════════════════
// ── Botão de Emergência ──
function BotaoEmergenciaAdmin({
  casalId,
  nomeCasal
}) {
  const [palavra, setPalavra] = useState("");
  const [palavraSalva, setPalavraSalva] = useState("");
  const [acionamentos, setAcionamentos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  useEffect(() => {
    if (!casalId) return;
    db.collection("clinica_casais").doc(casalId).get().then(d => {
      if (d.exists && d.data().palavraEmergencia) {
        setPalavraSalva(d.data().palavraEmergencia);
        setPalavra(d.data().palavraEmergencia);
      }
    });
    db.collection("clinica_emergencia").where("casalId", "==", casalId).orderBy("createdAt", "desc").limit(5).onSnapshot(s => setAcionamentos(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
  }, [casalId]);
  async function salvar() {
    if (!palavra.trim()) {
      alert("Digite a palavra de emergência.");
      return;
    }
    setSalvando(true);
    try {
      await db.collection("clinica_casais").doc(casalId).update({
        palavraEmergencia: palavra.trim().toUpperCase()
      });
      setPalavraSalva(palavra.trim().toUpperCase());
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch (e) {
      alert("Erro ao salvar.");
    }
    setSalvando(false);
  }
  function fmtDH(ts) {
    if (!ts?.toDate) return "—";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff5f5",
      border: "2px solid #fecaca",
      borderRadius: 12,
      padding: 16,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, "🔴"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#dc2626"
    }
  }, "Botão de Emergência")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6b7280",
      marginBottom: 12,
      lineHeight: 1.6
    }
  }, "Defina a palavra-código que o casal usará para acionar o tempo de pausa durante conflitos."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: palavraSalva ? 12 : 0
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: palavra,
    onChange: e => setPalavra(e.target.value.toUpperCase()),
    placeholder: "Ex: PAUSA, RESPIRA, CAFÉ...",
    style: {
      flex: 1,
      fontWeight: 700,
      letterSpacing: 2,
      fontSize: 14,
      textTransform: "uppercase"
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando,
    style: {
      whiteSpace: "nowrap"
    }
  }, salvando ? "..." : salvo ? "✓ Salvo!" : "Salvar")), palavraSalva && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#7B00C4",
      borderRadius: 10,
      padding: "10px 16px",
      textAlign: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.7)",
      marginBottom: 4
    }
  }, "Palavra ativa para ", nomeCasal), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 700,
      color: "white",
      letterSpacing: 4
    }
  }, palavraSalva)), acionamentos.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "#dc2626",
      marginBottom: 6
    }
  }, "ÚLTIMOS ACIONAMENTOS"), acionamentos.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      padding: "5px 0",
      borderBottom: "1px solid #fecaca"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280"
    }
  }, fmtDH(a.createdAt)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#dc2626",
      fontWeight: 600
    }
  }, "⏱ ", a.horas, "h de pausa · por ", a.acionadoPor || "—")))));
}