// ═══════════════════════════════════════════════════════════════════
//  MÓDULO: QUESTIONÁRIOS — Anamnese + 7 Grupos Diagnósticos DSM-5
// ═══════════════════════════════════════════════════════════════════

// Definição dos 7 grupos diagnósticos com suas hipóteses
const GRUPOS_DIAGNOSTICOS = [{
  id: "g1",
  emoji: "🌊",
  titulo: "Instabilidade Emocional",
  descricao: "Humor, identidade e regulação emocional",
  cor: "#7B00C4",
  corBg: "#f5f3ff",
  hipoteses: [{
    id: "bipolar_mania",
    label: "Transtorno Bipolar I/II — Mania/Hipomania"
  }, {
    id: "bipolar_dep",
    label: "Transtorno Bipolar — Episódio Depressivo"
  }, {
    id: "ciclotimia",
    label: "Ciclotimia"
  }, {
    id: "borderline",
    label: "TP Borderline (TPB)"
  }, {
    id: "histrionico",
    label: "TP Histriônico"
  }, {
    id: "narcisista",
    label: "TP Narcisista"
  }]
}, {
  id: "g2",
  emoji: "🧩",
  titulo: "Neurodesenvolvimento",
  descricao: "Atenção, comportamento e interação social",
  cor: "#6d28d9",
  corBg: "#ede9fe",
  hipoteses: [{
    id: "tdah_desatento",
    label: "TDAH — Desatento"
  }, {
    id: "tdah_hiperativo",
    label: "TDAH — Hiperativo/Impulsivo"
  }, {
    id: "tea",
    label: "TEA — Espectro Autista"
  }, {
    id: "tod",
    label: "TOD — Transtorno Opositivo Desafiador"
  }]
}, {
  id: "g3",
  emoji: "💭",
  titulo: "Ansiedade e Internalização",
  descricao: "Depressão, ansiedade, pânico, TOC e trauma",
  cor: "#1d4ed8",
  corBg: "#eff6ff",
  hipoteses: [{
    id: "tdm",
    label: "Depressão Unipolar (TDM)"
  }, {
    id: "distimia",
    label: "Distimia / Depressão Persistente"
  }, {
    id: "tag",
    label: "TAG — Ansiedade Generalizada"
  }, {
    id: "panico",
    label: "Transtorno de Pânico"
  }, {
    id: "fobia_social",
    label: "Fobia Social / Ansiedade Social"
  }, {
    id: "toc",
    label: "TOC — Obsessivo-Compulsivo"
  }, {
    id: "tept",
    label: "TEPT — Estresse Pós-Traumático"
  }]
}, {
  id: "g4",
  emoji: "🍎",
  titulo: "Comportamento Alimentar",
  descricao: "Anorexia, Bulimia, TCA e ARFID",
  cor: "#15803d",
  corBg: "#f0fdf4",
  hipoteses: [{
    id: "anorexia",
    label: "Anorexia Nervosa"
  }, {
    id: "bulimia",
    label: "Bulimia Nervosa"
  }, {
    id: "tca",
    label: "TCA — Compulsão Alimentar"
  }, {
    id: "arfid",
    label: "ARFID — Evitação/Restrição Alimentar"
  }]
}, {
  id: "g5",
  emoji: "⚡",
  titulo: "Comportamento Aditivo",
  descricao: "Substâncias, jogos, apostas e TP Antissocial",
  cor: "#b45309",
  corBg: "#fef3c7",
  hipoteses: [{
    id: "substancias",
    label: "Transtorno por Uso de Substâncias"
  }, {
    id: "gaming",
    label: "Gaming Disorder — Jogos Digitais"
  }, {
    id: "gambling",
    label: "Gambling Disorder — Apostas"
  }, {
    id: "antissocial",
    label: "TP Antissocial (≥18 anos)"
  }]
}, {
  id: "g6",
  emoji: "🌸",
  titulo: "Saúde Sexual",
  descricao: "Disfunções e comportamento sexual",
  cor: "#be185d",
  corBg: "#fdf2f8",
  hipoteses: [{
    id: "sexual",
    label: "Disfunções e Saúde Sexual"
  }]
}, {
  id: "g7",
  emoji: "🌿",
  titulo: "Trauma e Dissociação",
  descricao: "Trauma complexo, dissociação e adaptação",
  cor: "#0f766e",
  corBg: "#f0fdfa",
  hipoteses: [{
    id: "tept_complexo",
    label: "TEPT Complexo / Trauma Crônico"
  }, {
    id: "dissociativo",
    label: "Transtorno Dissociativo"
  }, {
    id: "adaptacao",
    label: "Transtorno de Adaptação"
  }]
}];

// ── Sub-tela: Painel de um Grupo Diagnóstico ──────────────────────
function PainelGrupoDiagnostico({
  paciente,
  grupo,
  onVoltar
}) {
  const BASE_URL = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";
  const [selecionados, setSelecionados] = useState([]);
  const [gerandoLink, setGerandoLink] = useState(false);
  const [linkGerado, setLinkGerado] = useState(null);
  const [respostas, setRespostas] = useState([]);
  const [loadingRespostas, setLoadingRespostas] = useState(true);
  const [respSelecionada, setRespSelecionada] = useState(null);

  // Carregar respostas já recebidas deste grupo para este paciente
  useEffect(() => {
    if (!paciente?.nome) return;
    db.collection("clinica_rastreamento_diagnostico").where("pacienteNome", "==", paciente.nome).where("grupo", "==", grupo.id).get().then(snap => {
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRespostas(lista);
      setLoadingRespostas(false);
    }).catch(() => setLoadingRespostas(false));
  }, [paciente?.nome, grupo.id]);
  function toggleHipotese(id) {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setLinkGerado(null);
  }
  function gerarToken() {
    return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  }
  function gerarLink() {
    if (selecionados.length === 0) {
      alert("Selecione pelo menos uma hipótese diagnóstica.");
      return;
    }
    setGerandoLink(true);
    const token = gerarToken();
    const config = {
      token,
      grupo: grupo.id,
      grupoLabel: grupo.emoji + " " + grupo.titulo,
      pacienteNome: paciente.nome || "",
      modulos: selecionados,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      respondidoPor: null,
      totalRespondentes: 0
    };
    db.collection("clinica_rastreamento_tokens").doc(token).set(config).then(() => {
      const url = `${BASE_URL}/rastreamento/diagnostico/?token=${token}`;
      setLinkGerado(url);
      setGerandoLink(false);
    }).catch(err => {
      console.error(err);
      alert("Erro ao gerar link. Tente novamente.");
      setGerandoLink(false);
    });
  }
  function copiarLink() {
    if (!linkGerado) return;
    navigator.clipboard.writeText(linkGerado).then(() => alert("✓ Link copiado!\n" + linkGerado));
  }
  function enviarWhatsApp() {
    if (!linkGerado) return;
    const tel = (paciente.telefone || "").replace(/\D/g, "");
    const hipoLabels = selecionados.map(id => {
      const h = grupo.hipoteses.find(x => x.id === id);
      return h ? h.label : id;
    }).join(", ");
    const msg = `Olá! 😊\n\nSua psicóloga Dra. Lucia Kratz preparou um questionário clínico personalizado para você.\n\n${grupo.emoji} *${grupo.titulo}*\nÁreas avaliadas: ${hipoLabels}\n\nResponda com calma e honestidade — leva cerca de 10 a 20 minutos.\n\n${linkGerado}\n\nQualquer dúvida, estou por aqui! 🦋\n_Dra. Lucia Kratz · CRP 09/20590_`;
    if (tel) {
      window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    }
  }

  // Calcular resultado de uma resposta
  function calcularResultado(resp) {
    return (resp.resultados || []).map(r => ({
      ...r,
      cor: r.nC >= r.minC ? "#dc2626" : r.nC >= Math.ceil(r.minC * 0.6) ? "#d97706" : "#16a34a"
    }));
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: onVoltar,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      color: "var(--purple)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: 20,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar para Questionários"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26
    }
  }, grupo.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-dark)"
    }
  }, grupo.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, grupo.descricao))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      color: "var(--text-dark)",
      marginBottom: 10
    }
  }, "🎯 Selecione as hipóteses diagnósticas a avaliar:"), grupo.hipoteses.map(h => /*#__PURE__*/React.createElement("label", {
    key: h.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 10px",
      borderRadius: 8,
      cursor: "pointer",
      marginBottom: 4,
      background: selecionados.includes(h.id) ? "#f5f3ff" : "white",
      border: "1.5px solid",
      borderColor: selecionados.includes(h.id) ? grupo.cor : "#e5e7eb",
      transition: "all .15s"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: selecionados.includes(h.id),
    onChange: () => toggleHipotese(h.id),
    style: {
      accentColor: grupo.cor,
      width: 15,
      height: 15
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-dark)",
      fontWeight: selecionados.includes(h.id) ? 600 : 400
    }
  }, h.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 14,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: gerarLink,
    disabled: gerandoLink || selecionados.length === 0,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: grupo.cor,
      color: "white",
      border: "none",
      borderRadius: 9,
      padding: "9px 16px",
      fontSize: 12,
      fontWeight: 600,
      cursor: selecionados.length === 0 ? "not-allowed" : "pointer",
      opacity: selecionados.length === 0 ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), " ", gerandoLink ? "Gerando…" : "Gerar Link"), linkGerado && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: copiarLink,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: grupo.corBg,
      color: grupo.cor,
      border: "1px solid",
      borderColor: grupo.cor,
      borderRadius: 9,
      padding: "9px 16px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "copy",
    size: 13
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    onClick: enviarWhatsApp,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "#dcfce7",
      color: "#15803d",
      border: "none",
      borderRadius: 9,
      padding: "9px 16px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 13
  }), " WhatsApp"))), linkGerado && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 11,
      color: "#166534",
      wordBreak: "break-all"
    }
  }, "✓ Link gerado: ", linkGerado)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "var(--text-dark)",
      marginBottom: 12
    }
  }, "📥 Respostas recebidas (", loadingRespostas ? "…" : respostas.length, ")"), loadingRespostas ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Spinner, null)) : respostas.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9fafb",
      border: "1px dashed #d1d5db",
      borderRadius: 12,
      padding: 28,
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhuma resposta recebida ainda.", /*#__PURE__*/React.createElement("br", null), "Gere o link acima e envie ao paciente.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, respostas.map(resp => {
    const resultados = calcularResultado(resp);
    const comCriterio = resultados.filter(r => r.nC >= r.minC);
    const isOpen = respSelecionada === resp.id;
    return /*#__PURE__*/React.createElement("div", {
      key: resp.id,
      style: {
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => setRespSelecionada(isOpen ? null : resp.id),
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        cursor: "pointer",
        background: isOpen ? "#f5f3ff" : "white"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: "var(--text-dark)"
      }
    }, resp.tipoRespondente === "paciente" ? "🧑 Próprio paciente" : `👨‍👩‍👧 ${resp.nomeRespondente || "Familiar"} · ${resp.parentesco || ""}`), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, resp.createdAt?.seconds ? new Date(resp.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : "—", " · ", resp.modulos?.length || 0, " módulos avaliados")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, comCriterio.length > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#dc2626"
      }
    }, "⚠ ", comCriterio.length, " critério(s) atingido(s)") : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#16a34a"
      }
    }, "✅ Abaixo dos limiares"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: isOpen ? "chevron-up" : "chevron-down",
      size: 13
    })))), isOpen && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "0 16px 16px"
      }
    }, resultados.map(r => /*#__PURE__*/React.createElement("div", {
      key: r.mod,
      style: {
        marginBottom: 8,
        padding: "10px 12px",
        background: "#f9fafb",
        borderRadius: 10,
        border: "1px solid #e5e7eb"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-dark)"
      }
    }, r.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: r.cor,
        whiteSpace: "nowrap"
      }
    }, r.nC, "/", r.total, " C")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: r.cor,
        marginTop: 3
      }
    }, r.status), r.obs && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "var(--text-muted)",
        marginTop: 4,
        lineHeight: 1.5
      }
    }, r.obs))), resp.obsFinais && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        padding: "10px 12px",
        background: "#fffbeb",
        border: "1px solid #fcd34d",
        borderRadius: 10,
        fontSize: 12,
        color: "#78350f"
      }
    }, /*#__PURE__*/React.createElement("strong", null, "Observações:"), " ", resp.obsFinais)));
  })));
}

// ── Componente principal: AbaQuestionarios ────────────────────────
function AbaQuestionarios({
  paciente
}) {
  const [sub, setSub] = useState(null); // null | "anamnese" | "entrevista" | "rastreamento" | grupo.id

  if (sub === "anamnese") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(null),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      color: "var(--purple)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: 20,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar para Questionários"), /*#__PURE__*/React.createElement(AbaAnamnese, {
    paciente: paciente
  }));
  if (sub === "entrevista") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(null),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      color: "var(--purple)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: 20,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar para Questionários"), /*#__PURE__*/React.createElement(AbaEntrevistaClinica, {
    paciente: paciente
  }));
  if (sub === "rastreamento") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(null),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      color: "var(--purple)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: 20,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar para Questionários"), /*#__PURE__*/React.createElement(AbaRastreamento, {
    paciente: paciente
  }));

  // Sub-telas de compatibilidade (para histórico existente)
  if (sub === "sexual") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(null),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      color: "var(--purple)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: 20,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar para Questionários"), /*#__PURE__*/React.createElement(AbaRastreamentoSexual, {
    paciente: paciente
  }));
  if (sub === "alimentar") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(null),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      color: "var(--purple)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: 20,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar para Questionários"), /*#__PURE__*/React.createElement(AbaRastreamentoAlimentar, {
    paciente: paciente
  }));
  if (sub === "neuro") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(null),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      color: "var(--purple)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: 20,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar para Questionários"), /*#__PURE__*/React.createElement(AbaRastreamentoNeuro, {
    paciente: paciente
  }));
  if (sub === "dependencia") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(null),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      color: "var(--purple)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: 20,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar para Questionários"), /*#__PURE__*/React.createElement(AbaRastreamentoDependencia, {
    paciente: paciente
  }));
  if (sub === "jogos") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(null),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "none",
      border: "none",
      color: "var(--purple)",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      marginBottom: 20,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar para Questionários"), /*#__PURE__*/React.createElement(AbaRastreamentoJogos, {
    paciente: paciente
  }));

  // Painel de grupo diagnóstico
  const grupoAtivo = GRUPOS_DIAGNOSTICOS.find(g => g.id === sub);
  if (grupoAtivo) return /*#__PURE__*/React.createElement(PainelGrupoDiagnostico, {
    paciente: paciente,
    grupo: grupoAtivo,
    onVoltar: () => setSub(null)
  });

  // ── Tela de cards ───────────────────────────────────────────────
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-dark)",
      marginBottom: 4
    }
  }, "Questionários Clínicos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Selecione um grupo para escolher as hipóteses diagnósticas e gerar o link personalizado."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--gray-200)",
      borderRadius: 14,
      padding: 18,
      background: "white",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      lineHeight: 1
    }
  }, "📋"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13.5,
      color: "var(--text-dark)",
      marginBottom: 3
    }
  }, "Anamnese"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--text-muted)",
      lineHeight: 1.5
    }
  }, "Formulário clínico completo — histórico, desenvolvimento e queixas"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub("anamnese"),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      background: "var(--purple-light-bg)",
      color: "var(--purple)",
      border: "none",
      borderRadius: 8,
      padding: "7px 14px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      alignSelf: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 13
  }), " Visualizar")), GRUPOS_DIAGNOSTICOS.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.id,
    style: {
      border: "1px solid var(--gray-200)",
      borderRadius: 14,
      padding: 18,
      background: "white",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      lineHeight: 1
    }
  }, g.emoji), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13.5,
      color: "var(--text-dark)",
      marginBottom: 3
    }
  }, g.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: "var(--text-muted)",
      lineHeight: 1.5
    }
  }, g.descricao), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5,
      display: "flex",
      flexWrap: "wrap",
      gap: 4
    }
  }, g.hipoteses.map(h => /*#__PURE__*/React.createElement("span", {
    key: h.id,
    style: {
      fontSize: 9.5,
      background: g.corBg,
      color: g.cor,
      borderRadius: 4,
      padding: "2px 6px",
      fontWeight: 600
    }
  }, h.label.split(" — ")[0]))))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(g.id),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      background: g.corBg,
      color: g.cor,
      border: "none",
      borderRadius: 8,
      padding: "7px 14px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      alignSelf: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clipboard-list",
    size: 13
  }), " Selecionar e Gerar Link")))));
}

// ═══════════════════════════════════════════════════════════════════
//  Rastreamento Dependência Química — sub-tela de Questionários
//  Coleção: clinica_rastreamento_dependencia
// ═══════════════════════════════════════════════════════════════════

const PERGUNTAS_DEPENDENCIA = [{
  id: "p1",
  modulo: "Módulo A — Controle Prejudicado",
  texto: "Consumo em maiores quantidades ou por mais tempo do que o pretendido"
}, {
  id: "p2",
  modulo: "Módulo A — Controle Prejudicado",
  texto: "Desejo persistente ou esforços infrutíferos para controlar o uso"
}, {
  id: "p3",
  modulo: "Módulo A — Controle Prejudicado",
  texto: "Despendimento excessivo de tempo com a substância"
}, {
  id: "p4",
  modulo: "Módulo A — Controle Prejudicado",
  texto: "Fissura (craving) — desejo imperioso de usar"
}, {
  id: "p5",
  modulo: "Módulo B — Prejuízo Social",
  texto: "Falha no cumprimento de obrigações importantes"
}, {
  id: "p6",
  modulo: "Módulo B — Prejuízo Social",
  texto: "Uso contínuo apesar de problemas sociais ou interpessoais"
}, {
  id: "p7",
  modulo: "Módulo B — Prejuízo Social",
  texto: "Abandono de atividades importantes por causa do uso"
}, {
  id: "p8",
  modulo: "Módulo C — Uso de Risco",
  texto: "Uso em situações de perigo físico"
}, {
  id: "p9",
  modulo: "Módulo C — Uso de Risco",
  texto: "Uso contínuo apesar de problemas físicos ou psicológicos"
}, {
  id: "p10",
  modulo: "Módulo D — Farmacológico",
  texto: "Tolerância — necessidade de doses crescentes"
}, {
  id: "p11",
  modulo: "Módulo D — Farmacológico",
  texto: "Abstinência — síndrome ao parar ou uso para evitar mal-estar"
}];
function AbaRastreamentoDependencia({
  paciente
}) {
  const [docs, setDocs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selecionado, setSelecionado] = React.useState(null);
  const COR = {
    A: "#16a34a",
    B: "#d97706",
    C: "#dc2626"
  };
  const {
    ajustes: ajustesDep,
    historico: historicoDep,
    salvarAjuste: salvarDep,
    limparAjuste: limparDep,
    salvando: salvandoDep
  } = useAjustesClinicos("clinica_rastreamento_dependencia", docs.length > 0 ? docs[0].id : null);
  React.useEffect(() => {
    if (!paciente?.nome) return;
    db.collection("clinica_rastreamento_dependencia").where("pacienteNome", "==", paciente.nome).get().then(snap => {
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDocs(lista);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente?.nome]);
  function copiarLink() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/dependencia/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    navigator.clipboard.writeText(url).then(() => alert("✓ Link copiado!\n" + url));
  }
  function enviarWhatsApp() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/dependencia/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    const msg = `Olá! 😊\n\nSua psicóloga Dra. Lucia Kratz preparou um questionário clínico para você preencher.\n\n💊 *Rastreamento de Dependência Química e Substâncias*\nResponda com calma e honestidade — leva cerca de 8 a 12 minutos.\n\n${url}\n\nQualquer dúvida, estou por aqui!\n_Dra. Lucia Kratz · CRP 09/20590_`;
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }
  function calcularCriterios(doc) {
    const C = PERGUNTAS_DEPENDENCIA.filter(p => doc[p.id] === "C").length;
    const B = PERGUNTAS_DEPENDENCIA.filter(p => doc[p.id] === "B").length;
    const total = C;
    let gravidade = "—";
    if (total >= 6) gravidade = "⚠ Grave (6+ critérios C)";else if (total >= 4) gravidade = "⚡ Moderada (4–5 critérios C)";else if (total >= 2) gravidade = "🟡 Leve (2–3 critérios C)";else if (total === 1) gravidade = "🔍 Provável (1 critério C — a observar)";else gravidade = "✅ Abaixo do limiar diagnóstico";
    return {
      C,
      B,
      total,
      gravidade
    };
  }
  function gerarLaudo() {
    if (docs.length === 0) {
      alert("Nenhuma resposta para gerar laudo.");
      return;
    }
    const pacNome = paciente.nome || "Paciente";
    const data = new Date().toLocaleDateString("pt-BR");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Laudo Rastreamento Dependência Química — ${pacNome}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.6}
h1{font-size:20px;color:#3d006a;margin-bottom:4px}
h2{font-size:14px;color:#7B00C4;margin:20px 0 8px;border-bottom:1px solid #ede9fe;padding-bottom:4px}
h3{font-size:12.5px;color:#374151;margin:12px 0 6px}
.header{border-bottom:2px solid #7B00C4;padding-bottom:16px;margin-bottom:20px}
.sub{font-size:12px;color:#6b7280;margin-top:2px}
.gravidade{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:14px 18px;margin:12px 0;font-size:15px;font-weight:700;color:#3d006a}
.resp-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11.5px}
.resp-table th{background:#f5f3ff;padding:6px 10px;text-align:left;font-size:10.5px;color:#7B00C4;border:1px solid #ede9fe}
.resp-table td{padding:6px 10px;border:1px solid #e5e7eb;vertical-align:top}
.resp-table tr:nth-child(even) td{background:#fafafa}
.assinatura{text-align:center;margin-top:40px}
.assinatura img{height:60px;opacity:.9}
.assinatura p{font-size:12px;color:#374151;margin-top:6px}
.rodape{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
@media print{body{padding:16px}.no-print{display:none}}
</style></head><body>
<div class="no-print" style="margin-bottom:20px">
  <button onclick="window.print()" style="background:#7B00C4;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px">Imprimir / Salvar PDF</button>
</div>
<div class="header">
  <h1>Laudo de Rastreamento — Dependência Química e Substâncias</h1>
  <div class="sub">Paciente: <strong>${pacNome}</strong> · Data: ${data} · Dra. Lucia Kratz · CRP 09/20590</div>
  <div class="sub">Respondentes: ${docs.length} (${docs.map(d => d.tipoRespondente === "paciente" ? "próprio paciente" : d.parentesco || "familiar").join(", ")})</div>
</div>
${docs.map(doc => {
      const cr = calcularCriterios(doc);
      return `
<h2>Respondente: ${doc.tipoRespondente === "paciente" ? "Próprio paciente" : (doc.nomeRespondente || "Familiar") + " (" + (doc.parentesco || "—") + ")"}</h2>
<div class="gravidade">Critérios C (diagnósticos): ${cr.C}/11 &nbsp;·&nbsp; ${cr.gravidade}</div>
<p style="font-size:12px;color:#4b5563;margin-bottom:10px">Respostas C (critério pleno): <strong>${cr.C}</strong> &nbsp;|&nbsp; Respostas B (a observar): <strong>${cr.B}</strong></p>
<table class="resp-table"><thead><tr><th>#</th><th>Critério</th><th>Módulo</th><th>Resp.</th></tr></thead><tbody>
${PERGUNTAS_DEPENDENCIA.map(p => `<tr><td>${p.id.replace("p", "")}</td><td>${p.texto}</td><td>${p.modulo}</td><td style="font-weight:700;color:${COR[doc[p.id]] || "#6b7280"}">${doc[p.id] || "—"}</td></tr>`).join("")}
${doc.obsFinais ? `<tr><td colspan="2"><strong>Observações</strong></td><td colspan="2">${doc.obsFinais}</td></tr>` : ""}
</tbody></table>`;
    }).join("")}
<div class="assinatura">
  <img src="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/Assinatura%20Lu%C3%ADcia%20Kratz.png" alt="Assinatura" onerror="this.style.display='none'"/>
  <p><strong>Dra. Lucia Kratz</strong><br/>Psicóloga · CRP 09/20590<br/>Doutora em Psicologia · TCC · Musicoterapia · Neuromodulação</p>
</div>
<div class="rodape">Documento gerado em ${data} · Uso exclusivo para fins clínicos · Confidencial · LGPD</div>
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }
  if (loading) return React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center"
    }
  }, React.createElement(Spinner, null));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-dark)",
      marginBottom: 4
    }
  }, "Rastreamento de Dependência Química e Substâncias"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "11 critérios DSM-5 · Instrumento aplicado ao paciente e/ou familiares"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: copiarLink,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "var(--purple-light-bg)",
      color: "var(--purple)",
      border: "none",
      borderRadius: 10,
      padding: "8px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 14
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    onClick: enviarWhatsApp,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "#dcfce7",
      color: "#15803d",
      border: "none",
      borderRadius: 10,
      padding: "8px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 14
  }), " Enviar via WhatsApp"), docs.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: gerarLaudo,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "#fef3c7",
      color: "#b45309",
      border: "none",
      borderRadius: 10,
      padding: "8px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 14
  }), " Gerar Laudo PDF")), docs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9fafb",
      border: "1px dashed #d1d5db",
      borderRadius: 12,
      padding: 32,
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhuma resposta recebida ainda.", /*#__PURE__*/React.createElement("br", null), "Copie o link acima e envie ao paciente ou familiar.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, docs.map(doc => {
    const cr = calcularCriterios(doc);
    const isOpen = selecionado === doc.id;
    const corGrav = cr.total >= 6 ? "#dc2626" : cr.total >= 4 ? "#d97706" : cr.total >= 2 ? "#b45309" : "#16a34a";
    return /*#__PURE__*/React.createElement("div", {
      key: doc.id,
      style: {
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => setSelecionado(isOpen ? null : doc.id),
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        cursor: "pointer",
        background: isOpen ? "#f5f3ff" : "white"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: "var(--text-dark)"
      }
    }, doc.tipoRespondente === "paciente" ? "🧑 Próprio paciente" : "👨‍👩‍👧 " + (doc.nomeRespondente || "Familiar") + " · " + (doc.parentesco || "")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : "—")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 12,
        color: corGrav
      }
    }, cr.gravidade), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, cr.C, " critérios C / 11"))), isOpen && /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid #e5e7eb",
        padding: 16
      }
    }, PERGUNTAS_DEPENDENCIA.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
        borderBottom: "1px solid #f3f4f6"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 24,
        height: 24,
        minWidth: 24,
        borderRadius: "50%",
        background: doc[p.id] ? COR[doc[p.id]] + "22" : "#f3f4f6",
        border: "2px solid " + (doc[p.id] ? COR[doc[p.id]] : "#e5e7eb"),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        color: doc[p.id] ? COR[doc[p.id]] : "#9ca3af"
      }
    }, doc[p.id] || "—"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#374151",
        flex: 1
      }
    }, p.texto), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#9ca3af",
        whiteSpace: "nowrap"
      }
    }, p.modulo.split("—")[0].trim()))), doc.obsFinais && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        background: "#f9fafb",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 12,
        color: "#4b5563"
      }
    }, /*#__PURE__*/React.createElement("strong", null, "Observações:"), " ", doc.obsFinais)));
  })), docs.length > 0 && (() => {
    const d0 = docs[0];
    const criteriosDep = PERGUNTAS_DEPENDENCIA.map(p => ({
      texto: p.texto,
      valorOriginal: d0[p.id] === "C" ? "C" : ""
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 11,
        color: "#9ca3af",
        margin: "8px 0 4px",
        letterSpacing: 1
      }
    }, "── Reavaliação clínica ──"), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
      titulo: "Transtorno por Uso de Substâncias (DSM-5)",
      criterios: criteriosDep,
      ajustes: ajustesDep,
      historico: historicoDep,
      salvarAjuste: salvarDep,
      limparAjuste: limparDep,
      confirmacoes: CONF_DEPENDENCIA,
      salvando: salvandoDep,
      statusFn: crs => {
        const n = crs.filter(c => c.atendeResolvido).length;
        if (n >= 6) return {
          atende: "diag",
          label: "✓ Grave — ≥6 critérios"
        };
        if (n >= 4) return {
          atende: "diag",
          label: "✓ Moderado — 4–5 critérios"
        };
        if (n >= 2) return {
          atende: "prov",
          label: "⚠ Leve — 2–3 critérios"
        };
        return {
          atende: false,
          label: "✗ Não atende (< 2 critérios)"
        };
      }
    }));
  })());
}

// ═══════════════════════════════════════════════════════════════════
//  Rastreamento Jogos e Apostas — sub-tela de Questionários
//  Coleção: clinica_rastreamento_jogos
// ═══════════════════════════════════════════════════════════════════

const PERGUNTAS_JOGOS = [{
  id: "p1",
  modulo: "Módulo A — Preocupação/Abstinência",
  texto: "Preocupação mental excessiva com jogos"
}, {
  id: "p2",
  modulo: "Módulo A — Preocupação/Abstinência",
  texto: "Sintomas de abstinência ao parar (irritabilidade, ansiedade)"
}, {
  id: "p3",
  modulo: "Módulo B — Tolerância/Controle",
  texto: "Tolerância — necessidade crescente de tempo ou dinheiro"
}, {
  id: "p4",
  modulo: "Módulo B — Tolerância/Controle",
  texto: "Tentativas infrutíferas de controlar ou cessar o jogo"
}, {
  id: "p5",
  modulo: "Módulo B — Tolerância/Controle",
  texto: "Abandono de outros hobbies e atividades sociais"
}, {
  id: "p6",
  modulo: "Módulo C — Consequências",
  texto: "Continuidade apesar de problemas graves"
}, {
  id: "p7",
  modulo: "Módulo C — Consequências",
  texto: "Ocultação e mentiras sobre a extensão do hábito"
}, {
  id: "p8",
  modulo: "Módulo C — Consequências",
  texto: "Uso do jogo como fuga de problemas emocionais"
}, {
  id: "p9",
  modulo: "Módulo D — Prejuízo Funcional",
  texto: "Perda ou risco severo de emprego, estudos ou relacionamentos"
}];
function AbaRastreamentoJogos({
  paciente
}) {
  const [docs, setDocs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selecionado, setSelecionado] = React.useState(null);
  const COR = {
    A: "#16a34a",
    B: "#d97706",
    C: "#dc2626"
  };
  const {
    ajustes: ajustesJogos,
    historico: historicoJogos,
    salvarAjuste: salvarJogos,
    limparAjuste: limparJogos,
    salvando: salvandoJogos
  } = useAjustesClinicos("clinica_rastreamento_jogos", docs.length > 0 ? docs[0].id : null);
  React.useEffect(() => {
    if (!paciente?.nome) return;
    db.collection("clinica_rastreamento_jogos").where("pacienteNome", "==", paciente.nome).get().then(snap => {
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDocs(lista);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente?.nome]);
  function copiarLink() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/jogos/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    navigator.clipboard.writeText(url).then(() => alert("✓ Link copiado!\n" + url));
  }
  function enviarWhatsApp() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/jogos/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    const msg = `Olá! 😊\n\nSua psicóloga Dra. Lucia Kratz preparou um questionário clínico para você preencher.\n\n🎮 *Rastreamento de Dependência de Jogos e Apostas*\nResponda com calma e honestidade — leva cerca de 5 a 10 minutos.\n\n${url}\n\nQualquer dúvida, estou por aqui!\n_Dra. Lucia Kratz · CRP 09/20590_`;
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }
  function calcularCriterios(doc) {
    const C = PERGUNTAS_JOGOS.filter(p => doc[p.id] === "C").length;
    const B = PERGUNTAS_JOGOS.filter(p => doc[p.id] === "B").length;
    const total = C;
    let gravidade = "—";
    if (total >= 8) gravidade = "⚠ Grave (8–9 critérios C)";else if (total >= 6) gravidade = "⚡ Moderada (6–7 critérios C)";else if (total >= 4) gravidade = "🟡 Leve (4–5 critérios C)";else if (total === 3) gravidade = "🔍 Provável (3 critérios C — a observar)";else gravidade = "✅ Abaixo do limiar diagnóstico";
    return {
      C,
      B,
      total,
      gravidade
    };
  }
  function gerarLaudo() {
    if (docs.length === 0) {
      alert("Nenhuma resposta para gerar laudo.");
      return;
    }
    const pacNome = paciente.nome || "Paciente";
    const data = new Date().toLocaleDateString("pt-BR");
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Laudo Rastreamento Jogos e Apostas — ${pacNome}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.6}
h1{font-size:20px;color:#3d006a;margin-bottom:4px}
h2{font-size:14px;color:#7B00C4;margin:20px 0 8px;border-bottom:1px solid #ede9fe;padding-bottom:4px}
h3{font-size:12.5px;color:#374151;margin:12px 0 6px}
.header{border-bottom:2px solid #7B00C4;padding-bottom:16px;margin-bottom:20px}
.sub{font-size:12px;color:#6b7280;margin-top:2px}
.gravidade{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:14px 18px;margin:12px 0;font-size:15px;font-weight:700;color:#3d006a}
.resp-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11.5px}
.resp-table th{background:#f5f3ff;padding:6px 10px;text-align:left;font-size:10.5px;color:#7B00C4;border:1px solid #ede9fe}
.resp-table td{padding:6px 10px;border:1px solid #e5e7eb;vertical-align:top}
.resp-table tr:nth-child(even) td{background:#fafafa}
.assinatura{text-align:center;margin-top:40px}
.assinatura img{height:60px;opacity:.9}
.assinatura p{font-size:12px;color:#374151;margin-top:6px}
.rodape{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
@media print{body{padding:16px}.no-print{display:none}}
</style></head><body>
<div class="no-print" style="margin-bottom:20px">
  <button onclick="window.print()" style="background:#7B00C4;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px">Imprimir / Salvar PDF</button>
</div>
<div class="header">
  <h1>Laudo de Rastreamento — Dependência de Jogos e Apostas</h1>
  <div class="sub">Paciente: <strong>${pacNome}</strong> · Data: ${data} · Dra. Lucia Kratz · CRP 09/20590</div>
  <div class="sub">Respondentes: ${docs.length} (${docs.map(d => d.tipoRespondente === "paciente" ? "próprio paciente" : d.parentesco || "familiar").join(", ")})</div>
</div>
${docs.map(doc => {
      const cr = calcularCriterios(doc);
      return `
<h2>Respondente: ${doc.tipoRespondente === "paciente" ? "Próprio paciente" : (doc.nomeRespondente || "Familiar") + " (" + (doc.parentesco || "—") + ")"}</h2>
<div class="gravidade">Critérios C (diagnósticos): ${cr.C}/9 &nbsp;·&nbsp; ${cr.gravidade}</div>
<p style="font-size:12px;color:#4b5563;margin-bottom:10px">Respostas C (critério pleno): <strong>${cr.C}</strong> &nbsp;|&nbsp; Respostas B (a observar): <strong>${cr.B}</strong></p>
<table class="resp-table"><thead><tr><th>#</th><th>Critério</th><th>Módulo</th><th>Resp.</th></tr></thead><tbody>
${PERGUNTAS_JOGOS.map(p => `<tr><td>${p.id.replace("p", "")}</td><td>${p.texto}</td><td>${p.modulo}</td><td style="font-weight:700;color:${COR[doc[p.id]] || "#6b7280"}">${doc[p.id] || "—"}</td></tr>`).join("")}
${doc.obsFinais ? `<tr><td colspan="2"><strong>Observações</strong></td><td colspan="2">${doc.obsFinais}</td></tr>` : ""}
</tbody></table>`;
    }).join("")}
<div class="assinatura">
  <img src="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/Assinatura%20Lu%C3%ADcia%20Kratz.png" alt="Assinatura" onerror="this.style.display='none'"/>
  <p><strong>Dra. Lucia Kratz</strong><br/>Psicóloga · CRP 09/20590<br/>Doutora em Psicologia · TCC · Musicoterapia · Neuromodulação</p>
</div>
<div class="rodape">Documento gerado em ${data} · Uso exclusivo para fins clínicos · Confidencial · LGPD</div>
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }
  if (loading) return React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center"
    }
  }, React.createElement(Spinner, null));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-dark)",
      marginBottom: 4
    }
  }, "Rastreamento de Dependência de Jogos e Apostas"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "9 critérios DSM-5 / CID-11 · Instrumento aplicado ao paciente e/ou familiares"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: copiarLink,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "var(--purple-light-bg)",
      color: "var(--purple)",
      border: "none",
      borderRadius: 10,
      padding: "8px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 14
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    onClick: enviarWhatsApp,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "#dcfce7",
      color: "#15803d",
      border: "none",
      borderRadius: 10,
      padding: "8px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 14
  }), " Enviar via WhatsApp"), docs.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: gerarLaudo,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "#ecfdf5",
      color: "#047857",
      border: "none",
      borderRadius: 10,
      padding: "8px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 14
  }), " Gerar Laudo PDF")), docs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9fafb",
      border: "1px dashed #d1d5db",
      borderRadius: 12,
      padding: 32,
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhuma resposta recebida ainda.", /*#__PURE__*/React.createElement("br", null), "Copie o link acima e envie ao paciente ou familiar.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, docs.map(doc => {
    const cr = calcularCriterios(doc);
    const isOpen = selecionado === doc.id;
    const corGrav = cr.total >= 6 ? "#dc2626" : cr.total >= 4 ? "#d97706" : cr.total >= 2 ? "#b45309" : "#16a34a";
    return /*#__PURE__*/React.createElement("div", {
      key: doc.id,
      style: {
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => setSelecionado(isOpen ? null : doc.id),
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        cursor: "pointer",
        background: isOpen ? "#f5f3ff" : "white"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: "var(--text-dark)"
      }
    }, doc.tipoRespondente === "paciente" ? "🧑 Próprio paciente" : "👨‍👩‍👧 " + (doc.nomeRespondente || "Familiar") + " · " + (doc.parentesco || "")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : "—")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "right"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 12,
        color: corGrav
      }
    }, cr.gravidade), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, cr.C, " critérios C / 9"))), isOpen && /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid #e5e7eb",
        padding: 16
      }
    }, PERGUNTAS_JOGOS.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
        borderBottom: "1px solid #f3f4f6"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 24,
        height: 24,
        minWidth: 24,
        borderRadius: "50%",
        background: doc[p.id] ? COR[doc[p.id]] + "22" : "#f3f4f6",
        border: "2px solid " + (doc[p.id] ? COR[doc[p.id]] : "#e5e7eb"),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        color: doc[p.id] ? COR[doc[p.id]] : "#9ca3af"
      }
    }, doc[p.id] || "—"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#374151",
        flex: 1
      }
    }, p.texto), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#9ca3af",
        whiteSpace: "nowrap"
      }
    }, p.modulo.split("—")[0].trim()))), doc.obsFinais && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        background: "#f9fafb",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 12,
        color: "#4b5563"
      }
    }, /*#__PURE__*/React.createElement("strong", null, "Observações:"), " ", doc.obsFinais)));
  })), docs.length > 0 && (() => {
    const d0 = docs[0];
    const criteriosJogos = PERGUNTAS_JOGOS.map(p => ({
      texto: p.texto,
      valorOriginal: d0[p.id] === "C" ? "C" : ""
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        fontSize: 11,
        color: "#9ca3af",
        margin: "8px 0 4px",
        letterSpacing: 1
      }
    }, "── Reavaliação clínica ──"), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
      titulo: "Transtorno de Jogos (DSM-5 / CID-11)",
      criterios: criteriosJogos,
      ajustes: ajustesJogos,
      historico: historicoJogos,
      salvarAjuste: salvarJogos,
      limparAjuste: limparJogos,
      confirmacoes: CONF_JOGOS,
      salvando: salvandoJogos,
      statusFn: crs => {
        const n = crs.filter(c => c.atendeResolvido).length;
        if (n >= 5) return {
          atende: "diag",
          label: "✓ Transtorno de Jogos — ≥5 critérios"
        };
        if (n >= 4) return {
          atende: "prov",
          label: "⚠ Sugestivo — 4 critérios"
        };
        if (n >= 2) return {
          atende: "prov",
          label: "⚠ Investigar — " + n + " critérios"
        };
        return {
          atende: false,
          label: "✗ Não atende"
        };
      }
    }));
  })());
}

// ═══════════════════════════════════════════════════════════════════
//  Entrevista Clínica Inicial — sub-tela de Questionários
// ═══════════════════════════════════════════════════════════════════
function AbaEntrevistaClinica({
  paciente
}) {
  const [link, setLink] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const BASE = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";
  useEffect(() => {
    db.collection("clinica_links_partilhados").where("pacienteId", "==", paciente.id).where("tipoFerramenta", "==", "entrevista").where("status", "==", "pendente").get().then(snap => {
      if (!snap.empty) setLink({
        id: snap.docs[0].id,
        ...snap.docs[0].data()
      });
    });
  }, [paciente?.id]);
  async function gerarLink() {
    setGerando(true);
    try {
      const token = Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 10).toUpperCase();
      const ref = await db.collection("clinica_links_partilhados").add({
        pacienteId: paciente.id,
        pacienteNome: paciente.nome || "",
        tipoFerramenta: "entrevista",
        token,
        status: "pendente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setLink({
        id: ref.id,
        token,
        status: "pendente"
      });
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setGerando(false);
  }
  function copiarLink() {
    const url = `${BASE}/responder?token=${link.token}`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  function enviarWhatsApp() {
    const url = `${BASE}/responder?token=${link.token}`;
    const nome = paciente.nome?.split(" ")[0] || "paciente";
    const msg = `Olá, ${nome}! 😊

Sua psicóloga Dra. Lucia Kratz enviou um formulário para você preencher:

🧠 *Entrevista Clínica Inicial*

Acesse pelo link abaixo e responda com calma — suas respostas vão direto para o prontuário:
${url}

Qualquer dúvida, estou por aqui!
_Dra. Lucia Kratz · CRP 09/20590_`;
    window.open(`https://api.whatsapp.com/send?phone=55${(paciente.telefone || "").replace(/\D/g, "")}&text=${encodeURIComponent(msg)}`, "_blank");
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-dark)",
      marginBottom: 4
    }
  }, "Entrevista Clínica Inicial"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Instrumento de avaliação clínica inicial com perfil etário, escalas de observação e hipóteses diagnósticas DSM-5."), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1.5px solid",
      borderColor: link ? "var(--purple)" : "var(--gray-200)",
      borderRadius: 12,
      padding: "14px 16px",
      background: link ? "var(--purple-soft)" : "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: link ? 12 : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24
    }
  }, "🧠"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "Entrevista Clínica Inicial (DSM-5)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, "Instrumento de avaliação clínica inicial")), link && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fef3c7",
      color: "#d97706",
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600
    }
  }, "⏱ Pendente"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: "6px 12px",
      fontSize: 12,
      flexShrink: 0
    },
    onClick: gerarLink,
    disabled: gerando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), gerando ? "Gerando..." : link ? "Novo Link" : "Gerar Link")), link && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "white",
      border: "1px solid var(--gray-200)",
      borderRadius: 8,
      padding: "8px 12px",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13,
    style: {
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/responder?token=${link.token}`)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: "7px 14px",
      fontSize: 12
    },
    onClick: copiarLink
  }, /*#__PURE__*/React.createElement(Icon, {
    name: copiado ? "check" : "copy",
    size: 13
  }), copiado ? "Copiado!" : "Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      padding: "7px 14px",
      fontSize: 12
    },
    onClick: enviarWhatsApp
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 13
  }), " Enviar pelo WhatsApp")))));
}
function AbaAnamnese({
  paciente
}) {
  const [anamnese, setAnamnese] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!paciente?.id) return;
    db.collection("clinica_anamneses").where("pacienteNome", "==", paciente.nome).get().then(snap => {
      if (!snap.empty) {
        const doc = snap.docs[0];
        setAnamnese({
          id: doc.id,
          ...doc.data()
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente?.id]);
  const LABELS = {
    perfil: "Perfil",
    informanteTipo: "Quem respondeu",
    nomeRespondente: "Nome do respondente",
    parentescoRespondente: "Parentesco",
    queixa: "Queixa Principal",
    gestacaoPlanejada: "Gestação planejada",
    tipoParto: "Tipo de parto",
    idadeGestacional: "Idade gestacional",
    choroNascer: "Chorou ao nascer",
    sustCabeca: "Firmou a cabeça",
    sentou: "Sentou sozinho",
    engatinhou: "Engatinhou",
    caminhou: "Caminhou",
    lateralidade: "Lateralidade",
    balbucio: "Balbucio",
    primeirasParalavras: "Primeiras palavras",
    frasesSimples: "Frases simples",
    clarezaFala: "Clareza da fala",
    contatoVisual: "Contato visual",
    sorrisoSocial: "Sorriso social",
    padraOSono: "Padrão de sono",
    padraoAlimentar: "Padrão alimentar",
    desfralDiurno: "Desfralde diurno",
    desfralNoturno: "Desfralde noturno",
    idadeEscola: "Idade na escola",
    adaptacaoEscola: "Adaptação escolar",
    repetencia: "Repetência",
    facilidades: "Facilidades",
    dificuldades: "Dificuldades",
    foco: "Atenção/Foco",
    organizacao: "Organização",
    memoria: "Memória",
    convulsoes: "Convulsões/Desmaios",
    medicacoes: "Medicações",
    historicoFamiliar: "Histórico familiar",
    obsFinais: "Observações finais",
    // Adulto
    escolaridade: "Escolaridade",
    profissao: "Profissão",
    comQuemMora: "Com quem mora",
    contextoEncaminhamento: "Contexto do encaminhamento",
    inicioQueixa: "Início dos sintomas",
    evolucaoQueixa: "Evolução",
    usoAlcoolDrogas: "Uso de álcool/drogas",
    memoria: "Memória",
    orientacao: "Orientação",
    atencao: "Atenção",
    decisoes: "Tomada de decisões",
    avdBasicas: "Higiene/vestir",
    avdFinanceiro: "Gestão financeira",
    avdSair: "Sair sozinho",
    doencasCronicas: "Doenças crônicas",
    quedas: "Quedas frequentes",
    marcha: "Alteração de marcha",
    tremores: "Tremores",
    confusaoNoturna: "Confusão noturna"
  };
  const SKIP = ["pacienteId", "pacienteNome", "tipo", "createdAt", "id", "perfil", "informanteTipo", "nomeRespondente", "parentescoRespondente"];
  if (loading) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Spinner, null));
  if (!anamnese) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 40,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 12
    }
  }, "📋"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Nenhuma anamnese encontrada"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13
    }
  }, "O paciente ainda não preencheu o formulário de anamnese."));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginBottom: 20,
      flexWrap: "wrap",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple-light-bg)",
      color: "var(--purple)",
      padding: "4px 12px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600
    }
  }, anamnese.perfil === "infantil" ? "👶 Infantil/Neurodesenvolvimento" : "🧑 Adulto/Idoso"), anamnese.informanteTipo && anamnese.informanteTipo !== "proprio" && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f3f4f6",
      color: "#374151",
      padding: "4px 12px",
      borderRadius: 20,
      fontSize: 12
    }
  }, "Respondido por: ", anamnese.nomeRespondente || anamnese.informanteTipo, " ", anamnese.parentescoRespondente ? "(" + anamnese.parentescoRespondente + ")" : "")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      color: "var(--purple)",
      border: "1px solid var(--purple)",
      padding: "7px 14px"
    },
    onClick: () => gerarPDFAnamnese(paciente, anamnese, LABELS, SKIP)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 13
  }), " Gerar PDF")), anamnese.queixa && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0f4ff",
      border: "1px solid #c7d2fe",
      borderRadius: 12,
      padding: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#4338ca",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 6
    }
  }, "Queixa Principal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "#1f2937",
      lineHeight: 1.7
    }
  }, anamnese.queixa)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, Object.entries(anamnese).filter(([k, v]) => !SKIP.includes(k) && v && String(v).trim()).map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      background: "var(--gray-50)",
      border: "1px solid var(--gray-200)",
      borderRadius: 10,
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      fontWeight: 700,
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: .5,
      marginBottom: 4
    }
  }, LABELS[k] || k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: "var(--text-dark)",
      lineHeight: 1.55
    }
  }, String(v))))));
}
function AbaCasal({
  paciente,
  pacientes
}) {
  const [casalId, setCasalId] = useState(paciente.casalId || "");
  const [salvando, setSalvando] = useState(false);
  const parceiro = pacientes.find(p => p.id === paciente.casalId);
  const outros = pacientes.filter(p => p.id !== paciente.id && p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  async function vincular() {
    if (!casalId) {
      alert("Selecione o parceiro(a).");
      return;
    }
    if (casalId === paciente.id) {
      alert("Selecione um paciente diferente.");
      return;
    }
    setSalvando(true);
    try {
      const p2 = pacientes.find(p => p.id === casalId);
      // 1. Remove vínculo antigo de clinica_casais se existir (evita duplicatas)
      const snapAntigo1 = await db.collection("clinica_casais").where("p1Id", "==", paciente.id).get();
      const snapAntigo2 = await db.collection("clinica_casais").where("p2Id", "==", paciente.id).get();
      const batch = db.batch();
      [...snapAntigo1.docs, ...snapAntigo2.docs].forEach(d => batch.delete(d.ref));
      await batch.commit();
      // 2. Cria novo documento em clinica_casais
      await db.collection("clinica_casais").add({
        p1Id: paciente.id,
        p1Nome: paciente.nome || "",
        p2Id: casalId,
        p2Nome: p2?.nome || "",
        nomeCasal: `${paciente.nome?.split(" ")[0] || ""} e ${p2?.nome?.split(" ")[0] || ""}`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // 3. Grava casalId + mod5 nos dois pacientes
      await db.collection("clinica_pacientes").doc(paciente.id).update({
        casalId,
        modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
      });
      await db.collection("clinica_pacientes").doc(casalId).update({
        casalId: paciente.id,
        modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
      });
      alert("✓ Casal vinculado! Ambos terão acesso à Terapia de Casal no portal.");
    } catch (e) {
      alert("Erro ao vincular: " + e.message);
    }
    setSalvando(false);
  }
  async function desvincular() {
    if (!confirm("Desvincular casal?")) return;
    setSalvando(true);
    try {
      const parcId = paciente.casalId;
      // 1. Limpa casalId nos dois pacientes
      await db.collection("clinica_pacientes").doc(paciente.id).update({
        casalId: ""
      });
      if (parcId) await db.collection("clinica_pacientes").doc(parcId).update({
        casalId: ""
      });
      // 2. Remove documento de clinica_casais
      const snap1 = await db.collection("clinica_casais").where("p1Id", "==", paciente.id).get();
      const snap2 = await db.collection("clinica_casais").where("p2Id", "==", paciente.id).get();
      const batch = db.batch();
      [...snap1.docs, ...snap2.docs].forEach(d => batch.delete(d.ref));
      await batch.commit();
      setCasalId("");
    } catch (e) {
      alert("Erro ao desvincular: " + e.message);
    }
    setSalvando(false);
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 18
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Vínculo de Casal")), paciente.casalId && parceiro ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple-bg)",
      borderRadius: 10,
      padding: 16,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Parceiro(a) vinculado(a):"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 16
    }
  }, parceiro.nome), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, parceiro.email)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: desvincular,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 15
  }), " Desvincular casal")) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Este paciente nao esta vinculado a um casal em terapia."), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Selecionar Parceiro(a)"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: casalId,
    onChange: e => setCasalId(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione um paciente..."), outros.map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.nome)))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: vincular,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 15
  }), " Associar como Casal"))), paciente.casalId && parceiro && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clipboard-list",
    size: 18
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Diagnóstico e Atividades do Casal")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Respostas preenchidas por ", paciente.nome.split(" ")[0], " e ", parceiro.nome.split(" ")[0], " no portal"), /*#__PURE__*/React.createElement(RespostasCasal, {
    pacienteId: paciente.id,
    parceiroId: paciente.casalId,
    parceiro: parceiro,
    nomePaciente: paciente.nome
  })));
}

// PERFIL COMPLETO
function AbaOcupacional({
  paciente
}) {
  const EMITIDO_POR = {
    nome: "Dra. Lucia Kratz",
    crp: "CRP 09/20590"
  };
  const ASSINATURA_URL = "../Assinatura Lúcia Kratz.png"; // imagem na raiz do repositório

  const formVazio = {
    tipoDocumento: "relatorio_nr1",
    // Relatório NR-1
    dataInicio: "",
    dataFim: "",
    emAndamento: false,
    sessoesRealizadas: "",
    sessoesTotal: "",
    statusPrograma: "em_andamento",
    parecerTecnico: "",
    // Declaração de Comparecimento
    dataComparecimento: "",
    horaInicio: "",
    horaFim: "",
    obsDeclaracao: ""
  };
  const [form, setForm] = useState(formVazio);
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [preview, setPreview] = useState(null); // doc para preview (com _rascunho quando ainda não salvo)
  // Dados ocupacionais editáveis aqui mesmo (salvam de volta no cadastro do paciente)
  const [ocup, setOcup] = useState({
    empresa: paciente.empresa || paciente.empresaContratante || "",
    setor: paciente.setor || "",
    cargo: paciente.cargo || ""
  });
  useEffect(() => {
    db.collection("clinica_documentos_nr1").where("pacienteId", "==", paciente.id).get().then(snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt && b.createdAt.seconds || 0) - (a.createdAt && a.createdAt.seconds || 0));
      setHistorico(docs);
      setLoadingHist(false);
    }).catch(() => setLoadingHist(false));
  }, [paciente.id]);
  const STATUS_LABELS = {
    em_andamento: "Em andamento (Acompanhamento contínuo)",
    concluido: "Concluído (Alta do programa ocupacional)",
    encaminhado: "Encaminhado para Especialista Externo",
    descontinuado: "Descontinuado (Faltas / Não adesão)"
  };
  const TIPO_LABELS = {
    relatorio_nr1: "Relatório de Atendimento Psicossocial (NR-1)",
    declaracao: "Declaração de Comparecimento"
  };
  const TIPO_DESC = {
    relatorio_nr1: "📊 Documento completo para a empresa: vigência do acompanhamento, sessões, status no programa e parecer técnico.",
    declaracao: "📄 Documento simples que atesta o comparecimento do colaborador em uma data e horário específicos."
  };
  const eDeclaracao = form.tipoDocumento === "declaracao";
  const fmtData = d => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
  function montarDoc() {
    return {
      pacienteId: paciente.id,
      pacienteNome: paciente.nome || "",
      empresaContratante: ocup.empresa || "",
      setor: ocup.setor || "",
      cargo: ocup.cargo || "",
      tipoDocumento: form.tipoDocumento,
      periodo: {
        dataInicio: form.dataInicio,
        dataFim: form.emAndamento ? "" : form.dataFim,
        emAndamento: form.emAndamento
      },
      sessoes: {
        realizadas: Number(form.sessoesRealizadas) || 0,
        total: Number(form.sessoesTotal) || 0
      },
      statusPrograma: form.statusPrograma,
      parecerTecnico: form.parecerTecnico,
      dataComparecimento: form.dataComparecimento,
      horaInicio: form.horaInicio,
      horaFim: form.horaFim,
      obsDeclaracao: form.obsDeclaracao,
      emitidoPor: EMITIDO_POR
    };
  }

  // 1) VISUALIZAR — monta o documento sem salvar nada
  function visualizar() {
    if (eDeclaracao && !form.dataComparecimento) {
      alert("Informe a data do comparecimento.");
      return;
    }
    if (!eDeclaracao && !form.parecerTecnico) {
      alert("Preencha o Parecer Técnico antes de visualizar.");
      return;
    }
    setPreview({
      ...montarDoc(),
      _rascunho: true,
      createdAt: {
        seconds: Date.now() / 1000
      }
    });
  }

  // 2) SALVAR — só depois de visualizar e aprovar
  async function salvarDefinitivo() {
    setSalvando(true);
    const doc = {
      ...montarDoc(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      const ref = await db.collection("clinica_documentos_nr1").add(doc);
      // Atualiza os dados ocupacionais no cadastro do paciente
      await db.collection("clinica_pacientes").doc(paciente.id).update({
        empresa: ocup.empresa || "",
        setor: ocup.setor || "",
        cargo: ocup.cargo || ""
      }).catch(() => {});
      const novoDoc = {
        id: ref.id,
        ...doc,
        createdAt: {
          seconds: Date.now() / 1000
        }
      };
      setHistorico(prev => [novoDoc, ...prev]);
      setPreview(novoDoc);
      setForm(formVazio);
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    }
    setSalvando(false);
  }
  function abrirPreview(doc) {
    setPreview(doc);
  }
  function imprimirPreview() {
    const conteudo = document.getElementById("nr1-preview-print");
    if (!conteudo) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>${TIPO_LABELS[preview?.tipoDocumento] || "Documento"} — ${preview?.pacienteNome || ""}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:40px;color:#1f2937;font-size:13px;line-height:1.6}
        img{max-height:70px}
        @media print{body{margin:20px}.no-print{display:none}}
      </style></head><body>
      ${conteudo.innerHTML}
      </body></html>
    `);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 600);
  }

  // ─── BLOCO DE ASSINATURA + CARIMBO ────────────────────────
  function BlocoAssinatura() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid #e5e7eb",
        paddingTop: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: ASSINATURA_URL,
      alt: "",
      style: {
        height: 64,
        objectFit: "contain",
        display: "block",
        margin: "0 auto -10px"
      },
      onError: e => e.target.style.display = "none"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 230,
        borderBottom: "1.5px solid #1f2937",
        margin: "0 auto 8px"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-block",
        border: "2px solid #7B00C4",
        borderRadius: 8,
        padding: "8px 20px",
        color: "#7B00C4"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 0.5
      }
    }, "Dra. Lucia Kratz"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600
      }
    }, "Psicóloga — CRP 09/20590"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9.5,
        marginTop: 2
      }
    }, "Doutora em Psicologia · TCC · Musicoterapia · Neuromodulação"))));
  }

  // ─── PREVIEW ──────────────────────────────────────────────
  if (preview) {
    const ehDecl = preview.tipoDocumento === "declaracao";
    const periodoStr = preview.periodo?.emAndamento ? `${fmtData(preview.periodo?.dataInicio)} — Em andamento` : `${fmtData(preview.periodo?.dataInicio)} a ${fmtData(preview.periodo?.dataFim)}`;
    const hojeExtenso = new Date().toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    return /*#__PURE__*/React.createElement("div", null, preview._rascunho && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 10,
        padding: "10px 16px",
        marginBottom: 14,
        fontSize: 13,
        color: "#78350f",
        fontWeight: 600
      }
    }, "👁 Pré-visualização — o documento ainda NÃO foi salvo. Confira tudo e clique em \"Salvar e Gerar PDF\"."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        marginBottom: 20,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      onClick: () => setPreview(null)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-left",
      size: 15
    }), " ", preview._rascunho ? "Voltar e editar" : "Voltar"), preview._rascunho ? /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      onClick: salvarDefinitivo,
      disabled: salvando
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "save",
      size: 15
    }), " ", salvando ? "Salvando..." : "💾 Salvar e Gerar PDF") : /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      onClick: imprimirPreview
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "printer",
      size: 15
    }), " Imprimir / Salvar PDF")), /*#__PURE__*/React.createElement("div", {
      id: "nr1-preview-print",
      style: {
        background: "white",
        borderRadius: 16,
        border: "1px solid var(--gray-200)",
        padding: 32,
        maxWidth: 680
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: "2px solid #7B00C4"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "Dancing Script, cursive",
        fontSize: 26,
        color: "#7B00C4",
        fontWeight: 700
      }
    }, "Dra. Lucia Kratz"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#6b7280"
      }
    }, "CRP 09/20590 · Psicóloga · TCC · Musicoterapeuta · Neuromodulação"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#6b7280"
      }
    }, "Goiânia, GO — luciakratz.com.br")), /*#__PURE__*/React.createElement("img", {
      src: "../logo-transparente.png",
      style: {
        height: 48,
        objectFit: "contain"
      },
      onError: e => e.target.style.display = "none"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 700,
        color: "#1f2937",
        textTransform: "uppercase",
        letterSpacing: 1
      }
    }, TIPO_LABELS[preview.tipoDocumento] || preview.tipoDocumento), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "#6b7280",
        marginTop: 4
      }
    }, "Emitido em ", preview.createdAt?.seconds ? new Date(preview.createdAt.seconds * 1000).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR"))), ehDecl ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        lineHeight: 2,
        textAlign: "justify",
        margin: "28px 0",
        textIndent: 40
      }
    }, /*#__PURE__*/React.createElement("strong", null, "DECLARO"), ", para os devidos fins, que ", /*#__PURE__*/React.createElement("strong", null, preview.pacienteNome), preview.cargo ? `, ${preview.cargo}` : "", preview.empresaContratante ? /*#__PURE__*/React.createElement(React.Fragment, null, ", colaborador(a) da empresa ", /*#__PURE__*/React.createElement("strong", null, preview.empresaContratante)) : "", ", compareceu a atendimento psicológico nesta clínica no dia ", /*#__PURE__*/React.createElement("strong", null, fmtData(preview.dataComparecimento)), preview.horaInicio ? /*#__PURE__*/React.createElement(React.Fragment, null, ", no horário das ", /*#__PURE__*/React.createElement("strong", null, preview.horaInicio), preview.horaFim ? /*#__PURE__*/React.createElement(React.Fragment, null, " às ", /*#__PURE__*/React.createElement("strong", null, preview.horaFim)) : "") : "", "."), preview.obsDeclaracao && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.8,
        textAlign: "justify",
        marginBottom: 20,
        textIndent: 40
      }
    }, preview.obsDeclaracao), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        margin: "28px 0 36px",
        textAlign: "right"
      }
    }, "Goiânia, ", hojeExtenso, ".")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#7B00C4",
        borderBottom: "1px solid #e9d5ff",
        paddingBottom: 4,
        marginBottom: 10,
        textTransform: "uppercase"
      }
    }, "Dados do Colaborador"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 24px"
      }
    }, [["Nome", preview.pacienteNome], ["Empresa Contratante", preview.empresaContratante || "—"], ["Cargo", preview.cargo || "—"], ["Setor", preview.setor || "—"]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#6b7280",
        fontWeight: 600,
        textTransform: "uppercase",
        marginBottom: 2
      }
    }, l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 13
      }
    }, v))))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#7B00C4",
        borderBottom: "1px solid #e9d5ff",
        paddingBottom: 4,
        marginBottom: 10,
        textTransform: "uppercase"
      }
    }, "Dados do Atendimento"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 24px"
      }
    }, [["Vigência", periodoStr], ["Sessões Realizadas", `${preview.sessoes?.realizadas || 0} de ${preview.sessoes?.total || 0}`], ["Status no Programa", STATUS_LABELS[preview.statusPrograma] || preview.statusPrograma]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        gridColumn: l === "Status no Programa" ? "span 2" : "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: "#6b7280",
        fontWeight: 600,
        textTransform: "uppercase",
        marginBottom: 2
      }
    }, l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 13
      }
    }, v))))), preview.parecerTecnico && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#7B00C4",
        borderBottom: "1px solid #e9d5ff",
        paddingBottom: 4,
        marginBottom: 10,
        textTransform: "uppercase"
      }
    }, "Parecer Técnico"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f9f5ff",
        borderLeft: "3px solid #7B00C4",
        padding: "12px 16px",
        borderRadius: 4,
        fontSize: 13,
        lineHeight: 1.7,
        whiteSpace: "pre-wrap"
      }
    }, preview.parecerTecnico))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 6,
        padding: "10px 14px",
        fontSize: 11,
        marginBottom: 24,
        color: "#78350f"
      }
    }, "⚖️ Este documento foi elaborado em conformidade com a Resolução CFP nº 06/2019, preservando o sigilo profissional. Não contém diagnósticos, CID, sintomas clínicos ou informações íntimas do colaborador."), /*#__PURE__*/React.createElement(BlocoAssinatura, null)));
  }

  // ─── FORMULÁRIO ───────────────────────────────────────────
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "briefcase",
    size: 18,
    style: {
      color: "var(--purple)"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15
    }
  }, "Saúde Ocupacional — NR-1"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Relatórios e declarações para empresas contratantes"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Tipo de Documento"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap"
    }
  }, Object.entries(TIPO_LABELS).map(([val, label]) => /*#__PURE__*/React.createElement("button", {
    key: val,
    onClick: () => setForm({
      ...form,
      tipoDocumento: val
    }),
    style: {
      padding: "8px 16px",
      borderRadius: 20,
      border: "1.5px solid",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)",
      transition: "all .2s",
      borderColor: form.tipoDocumento === val ? "var(--purple)" : "var(--gray-200)",
      background: form.tipoDocumento === val ? "var(--purple)" : "white",
      color: form.tipoDocumento === val ? "white" : "var(--gray-600)",
      fontWeight: form.tipoDocumento === val ? 600 : 400
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 12,
      color: "var(--purple)",
      background: "var(--purple-soft)",
      borderRadius: 8,
      padding: "8px 12px"
    }
  }, TIPO_DESC[form.tipoDocumento])), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Empresa Contratante"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: ocup.empresa,
    onChange: e => setOcup({
      ...ocup,
      empresa: e.target.value
    }),
    placeholder: "Ex: Construtora Horizonte Ltda."
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Setor"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: ocup.setor,
    onChange: e => setOcup({
      ...ocup,
      setor: e.target.value
    }),
    placeholder: "Ex: Administrativo"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Cargo"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: ocup.cargo,
    onChange: e => setOcup({
      ...ocup,
      cargo: e.target.value
    }),
    placeholder: "Ex: Analista de RH"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 3
    }
  }, "Gravados no cadastro do paciente ao salvar o documento.")), eDeclaracao ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Data do Comparecimento"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: form.dataComparecimento,
    onChange: e => setForm({
      ...form,
      dataComparecimento: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Horário (início — término)"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "time",
    value: form.horaInicio,
    onChange: e => setForm({
      ...form,
      horaInicio: e.target.value
    })
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)"
    }
  }, "—"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "time",
    value: form.horaFim,
    onChange: e => setForm({
      ...form,
      horaFim: e.target.value
    })
  }))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Observação (opcional)"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: form.obsDeclaracao,
    onChange: e => setForm({
      ...form,
      obsDeclaracao: e.target.value
    }),
    placeholder: "Ex: O comparecimento integra programa de acompanhamento psicossocial vigente."
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Data de Início"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: form.dataInicio,
    onChange: e => setForm({
      ...form,
      dataInicio: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Data de Fim"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: form.dataFim,
    disabled: form.emAndamento,
    onChange: e => setForm({
      ...form,
      dataFim: e.target.value
    }),
    style: form.emAndamento ? {
      background: "var(--gray-50)",
      color: "var(--text-muted)"
    } : {}
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: "emAndamento",
    checked: form.emAndamento,
    onChange: e => setForm({
      ...form,
      emAndamento: e.target.checked,
      dataFim: ""
    })
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "emAndamento",
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      cursor: "pointer"
    }
  }, "Em andamento"))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Sessões Realizadas"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    min: "0",
    value: form.sessoesRealizadas,
    onChange: e => setForm({
      ...form,
      sessoesRealizadas: e.target.value
    }),
    placeholder: "Ex: 4"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Total Planejado"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "number",
    min: "0",
    value: form.sessoesTotal,
    onChange: e => setForm({
      ...form,
      sessoesTotal: e.target.value
    }),
    placeholder: "Ex: 8"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Status no Programa"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      marginTop: 4
    }
  }, Object.entries(STATUS_LABELS).map(([val, label]) => /*#__PURE__*/React.createElement("label", {
    key: val,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      cursor: "pointer",
      padding: "10px 14px",
      borderRadius: 8,
      border: "1.5px solid",
      transition: "all .2s",
      borderColor: form.statusPrograma === val ? "var(--purple)" : "var(--gray-200)",
      background: form.statusPrograma === val ? "var(--purple-soft)" : "white"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: "statusPrograma",
    value: val,
    checked: form.statusPrograma === val,
    onChange: () => setForm({
      ...form,
      statusPrograma: val
    })
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: form.statusPrograma === val ? 600 : 400,
      color: form.statusPrograma === val ? "var(--purple)" : "var(--gray-700)"
    }
  }, label))))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Parecer Técnico"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 6,
    value: form.parecerTecnico,
    onChange: e => setForm({
      ...form,
      parecerTecnico: e.target.value
    }),
    placeholder: "Foque em:\n• Capacidade laboral e funcionalidade no trabalho\n• Recomendações ergonômicas ou organizacionais\n• Necessidade de adaptações no posto de trabalho\n\nEvite: diagnósticos, CID, sintomas clínicos, informações íntimas."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "⚖️ Este campo deve seguir a Resolução CFP nº 06/2019 — foco em capacidade laboral, sem expor diagnósticos ou CID.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: visualizar
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 15
  }), " 👁 Visualizar documento"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      alignSelf: "center"
    }
  }, "Nada é salvo antes de você conferir e aprovar."))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "history",
    size: 16
  }), " Histórico de Documentos NR-1"), loadingHist ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 20,
      color: "var(--text-muted)"
    }
  }, "Carregando...") : historico.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 20,
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhum documento gerado ainda.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, historico.map(doc => /*#__PURE__*/React.createElement("div", {
    key: doc.id,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 16px",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      background: "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: doc.tipoDocumento === "declaracao" ? "#ccfbf1" : "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: doc.tipoDocumento === "declaracao" ? "badge-check" : "file-text",
    size: 16,
    style: {
      color: doc.tipoDocumento === "declaracao" ? "#0d9488" : "var(--purple)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 13
    }
  }, TIPO_LABELS[doc.tipoDocumento] || doc.tipoDocumento), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, doc.tipoDocumento === "declaracao" ? `Comparecimento em ${fmtData(doc.dataComparecimento)}${doc.horaInicio ? ` · ${doc.horaInicio}${doc.horaFim ? "–" + doc.horaFim : ""}` : ""}` : `${doc.periodo?.emAndamento ? `${fmtData(doc.periodo?.dataInicio)} — Em andamento` : `${fmtData(doc.periodo?.dataInicio)} a ${fmtData(doc.periodo?.dataFim)}`} · ${doc.sessoes?.realizadas || 0}/${doc.sessoes?.total || 0} sessões`)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: "6px 12px",
      fontSize: 12
    },
    onClick: () => abrirPreview(doc)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 13
  }), " Ver"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "6px 12px",
      fontSize: 12
    },
    onClick: () => {
      abrirPreview(doc);
      setTimeout(imprimirPreview, 300);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "printer",
    size: 13
  }))))))));
}

// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
//  MÓDULO: RASTREAMENTO BIPOLAR/BORDERLINE — AbaRastreamento
//  Coleção: clinica_rastreamento_bipolar
// ═══════════════════════════════════════════════════════════════════

const PERGUNTAS_RASTREAMENTO = [{
  id: "p1",
  bloco: "Eixo Bipolar · Energia",
  texto: "Energia muito acima do normal / fases de aceleração"
}, {
  id: "p2",
  bloco: "Eixo Bipolar · Energia",
  texto: "Padrão de sono e fala durante os momentos de agitação"
}, {
  id: "p3",
  bloco: "Eixo Bipolar · Energia",
  texto: "Autoconfiança exagerada ou riscos incomuns"
}, {
  id: "p4",
  bloco: "Eixo Bipolar · Depressão",
  texto: "Tristeza profunda ou perda de interesse prolongada"
}, {
  id: "p5",
  bloco: "Eixo Bipolar · Depressão",
  texto: "Disposição física, sono, apetite nas fases de baixa"
}, {
  id: "p6",
  bloco: "Eixo Bipolar · Depressão",
  texto: "Desesperança, culpa excessiva ou ideação suicida"
}, {
  id: "p7",
  bloco: "Eixo Borderline",
  texto: "Reação ao abandono real ou imaginado"
}, {
  id: "p8",
  bloco: "Eixo Borderline",
  texto: "Relações intensas e instáveis ao longo do tempo"
}, {
  id: "p9",
  bloco: "Eixo Borderline",
  texto: "Instabilidade de identidade, objetivos ou autoimagem"
}, {
  id: "p10",
  bloco: "Eixo Borderline",
  texto: "Comportamentos impulsivos no dia a dia"
}, {
  id: "p11",
  bloco: "Eixo Borderline",
  texto: "Automutilação ou tentativas de autoextermínio"
}, {
  id: "p12",
  bloco: "Eixo Borderline",
  texto: "Oscilação rápida de humor (horas / dias)"
}, {
  id: "p13",
  bloco: "Eixo Borderline",
  texto: "Vazio interior persistente ou tédio crônico"
}, {
  id: "p14",
  bloco: "Eixo Borderline",
  texto: "Manejo da raiva e da frustração"
}, {
  id: "p15",
  bloco: "Eixo Borderline",
  texto: "Dissociação ou paranoia sob estresse extremo"
}];

// DSM-5 contagem de critérios (apenas C = critério preenchido; B = "a observar")
function calcularEscores(doc) {
  const isC = k => doc[k] === "C";
  const isB = k => doc[k] === "B";
  const mania = ["p1", "p2", "p3"];
  const dep = ["p4", "p5", "p6"];
  const border = ["p7", "p8", "p9", "p10", "p11", "p12", "p13", "p14", "p15"];
  return {
    bipolarManiaC: mania.filter(isC).length,
    bipolarManiaB: mania.filter(isB).length,
    bipolarDepC: dep.filter(isC).length,
    bipolarDepB: dep.filter(isB).length,
    borderlineC: border.filter(isC).length,
    borderlineB: border.filter(isB).length
  };
}
function laudoDSM5(escores) {
  const {
    bipolarManiaC,
    bipolarManiaB,
    bipolarDepC,
    bipolarDepB,
    borderlineC,
    borderlineB
  } = escores;
  let hipotese = "";
  let criterios = [];
  let atencao = [];

  // Mania / Hipomania: 3 critérios possíveis (p1–p3). Diagnóstico = 3/3 C; Provável = 2/3 C
  if (bipolarManiaC === 3) {
    hipotese = "Transtorno Bipolar Tipo I (episódio maníaco)";
    criterios.push({
      label: "TB Tipo I",
      atende: "diag",
      obs: "Todos os 3 critérios de mania/hipomania preenchidos (p1–p3 = C). Verificar duração ≥7 dias e comprometimento funcional (Critério A do DSM-5)."
    });
    atencao.push("Confirmar duração exata dos episódios de aceleração (≥7 dias = mania; 4–6 dias = hipomania).");
    atencao.push("Checar se houve internação ou prejuízo grave — diferencial TB I vs TB II.");
  } else if (bipolarManiaC === 2) {
    if (!hipotese) hipotese = "Transtorno Bipolar Tipo II (hipomania) — provável";
    criterios.push({
      label: "TB Tipo II",
      atende: "prov",
      obs: "2 de 3 critérios de hipomania preenchidos. Confirmar ausência de episódio maníaco pleno e duração de 4–6 dias."
    });
    atencao.push("Investigar se os episódios de aceleração duraram 4–6 dias sem internação (perfil Tipo II).");
  } else if (bipolarManiaC === 1 && bipolarDepC >= 1) {
    if (!hipotese) hipotese = "Ciclotimia ou Transtorno Depressivo com características mistas — investigar";
    criterios.push({
      label: "Ciclotimia",
      atende: "prov",
      obs: "Critérios parciais de mania e depressão. Flutuações leves de humor sem critério pleno — avaliar longitudinalmente (≥2 anos)."
    });
    atencao.push("Mapear se as oscilações são crônicas (≥2 anos em adultos) para confirmar Ciclotimia (DSM-5 301.13).");
  } else {
    criterios.push({
      label: "TB Tipo I",
      atende: false,
      obs: "Critérios de mania/hipomania abaixo do limiar (" + bipolarManiaC + " de 3 C)."
    });
    criterios.push({
      label: "TB Tipo II",
      atende: false,
      obs: "Sem indícios consistentes de hipomania."
    });
  }

  // Depressão: 3 critérios possíveis (p4–p6). Diagnóstico = 3/3 C; Provável = 2/3 C
  if (bipolarDepC === 3) {
    criterios.push({
      label: "Episódio Depressivo Maior",
      atende: "diag",
      obs: "Todos os 3 critérios depressivos preenchidos (p4–p6 = C). Confirmar ≥5 critérios por ≥2 semanas (DSM-5 Critério A)."
    });
    atencao.push("Verificar presença de ideação suicida ativa (p6=C) — acionar protocolo de segurança se necessário.");
  } else if (bipolarDepC === 2) {
    criterios.push({
      label: "Depressão — Diagnóstico provável",
      atende: "prov",
      obs: "2 de 3 critérios depressivos preenchidos. Não preenche critérios plenos — monitorar."
    });
  } else {
    criterios.push({
      label: "Episódio Depressivo Maior",
      atende: false,
      obs: "Critérios depressivos abaixo do limiar (" + bipolarDepC + " de 3 C)."
    });
  }

  // Borderline: 9 critérios (p7–p15). Diagnóstico = 5+/9 C; Provável = 4/9 C
  if (borderlineC >= 5) {
    if (!hipotese) hipotese = "Transtorno da Personalidade Borderline (TPB)";else hipotese += " com forte sobreposição de TPB";
    criterios.push({
      label: "TPB (DSM-5 301.83)",
      atende: "diag",
      obs: borderlineC + " de 9 critérios DSM-5 para TPB preenchidos (C). Critério: ≥5 de 9."
    });
    atencao.push("Diferenciar oscilação de humor rápida (horas) do Borderline vs episódios longos do TB (dias/semanas).");
    atencao.push("Investigar história de automutilação, vazio crônico e instabilidade de identidade como critérios centrais do TPB.");
  } else if (borderlineC === 4) {
    criterios.push({
      label: "TPB (traços — diagnóstico provável)",
      atende: "prov",
      obs: "4 de 9 critérios DSM-5 para TPB preenchidos. Não preenche critério pleno (5+) — avaliar longitudinalmente."
    });
    atencao.push("Checar se oscilações emocionais são reativas a estressores interpessoais (perfil Borderline) ou autônomas (perfil Bipolar).");
  } else {
    criterios.push({
      label: "TPB",
      atende: false,
      obs: "Critérios borderline abaixo do limiar (" + borderlineC + " de 9 C — mínimo 5)."
    });
  }

  // Comorbidade
  if (bipolarManiaC >= 2 && borderlineC >= 4) {
    atencao.push("Alta probabilidade de COMORBIDADE TB + TPB — padrão encontrado em até 20% dos casos. Priorizar diagnóstico longitudinal.");
  }
  if (!hipotese) hipotese = "Sem hipótese diagnóstica definida pelos critérios — avaliação clínica aprofundada indicada.";
  return {
    hipotese,
    criterios,
    atencao,
    bipolarManiaC,
    bipolarManiaB,
    bipolarDepC,
    bipolarDepB,
    borderlineC,
    borderlineB
  };
}

// Badge: "diag" = Diagnóstico, "prov" = Diagnóstico provável, false = Não atende, null/"inv" = A observar
function CorBadge({
  atende
}) {
  if (atende === "diag") return /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fef2f2",
      color: "#dc2626",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700
    }
  }, "✓ Diagnóstico");
  if (atende === "prov") return /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fffbeb",
      color: "#d97706",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700
    }
  }, "⚠ Diagnóstico provável");
  if (atende === false) return /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#f0fdf4",
      color: "#16a34a",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700
    }
  }, "✗ Não atende");
  // legado: true → diag
  if (atende === true) return /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fef2f2",
      color: "#dc2626",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700
    }
  }, "✓ Diagnóstico");
  return /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#fffbeb",
      color: "#d97706",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700
    }
  }, "⚠ A observar");
}
function BarraEscore({
  label,
  valor,
  max,
  cor
}) {
  const pct = Math.min(100, Math.round(valor / max * 100));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "#374151"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: cor,
      fontWeight: 700
    }
  }, valor, " de ", max, " critérios")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f3f4f6",
      borderRadius: 20,
      height: 8,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + "%",
      background: cor,
      height: "100%",
      borderRadius: 20,
      transition: "width .5s"
    }
  })));
}

// ═══════════════════════════════════════════════════════════════════
//  MUDANÇA 2: REAVALIAÇÃO CLÍNICA DSM-5
// ═══════════════════════════════════════════════════════════════════

// Perguntas de confirmação por instrumento
const CONF_BIPOLAR_MANIA = [{
  id: "dur",
  pergunta: "Duração mínima de 4 dias (hipomania) ou 7 dias (mania) confirmada?"
}, {
  id: "excl",
  pergunta: "Excluída causa por substância ou condição médica geral?"
}];
const CONF_BIPOLAR_DEP = [{
  id: "dur",
  pergunta: "Duração de pelo menos 2 semanas confirmada?"
}, {
  id: "sofr",
  pergunta: "Sofrimento clínico significativo ou prejuízo funcional presente?"
}, {
  id: "excl",
  pergunta: "Excluída causa por substância ou condição médica?"
}];
const CONF_BORDERLINE = [{
  id: "perv",
  pergunta: "Padrão pervasivo presente desde a adolescência ou início da vida adulta?"
}, {
  id: "reativo",
  pergunta: "Humor reativo a estressores interpessoais (não episódio completo)?"
}];
const CONF_ANOREXIA = [{
  id: "peso",
  pergunta: "Peso significativamente abaixo do mínimo esperado para idade e estatura?"
}];
const CONF_BULIMIA = [{
  id: "auto",
  pergunta: "Autoavaliação indevidamente influenciada por forma e peso corporais?"
}, {
  id: "excl",
  pergunta: "Episódios NÃO ocorrem exclusivamente durante episódios de anorexia?"
}];
const CONF_TCA = [{
  id: "sofr",
  pergunta: "Sofrimento acentuado em relação à compulsão alimentar presente?"
}];
const CONF_ARFID = [{
  id: "alim",
  pergunta: "Comportamento NÃO explicado por falta de alimento disponível?"
}, {
  id: "excl",
  pergunta: "NÃO melhor explicado por outro transtorno mental ou condição médica?"
}];
const CONF_SEXUAL = [{
  id: "excl",
  pergunta: "NÃO melhor explicado por outro transtorno mental, substância/medicamento ou condição médica?"
}, {
  id: "rel",
  pergunta: "NÃO atribuído exclusivamente a conflito relacional grave?"
}];
const CONF_TDAH_IN = [{
  id: "ini",
  pergunta: "Sintomas de desatenção presentes antes dos 12 anos?"
}, {
  id: "ctx",
  pergunta: "Presentes em 2 ou mais contextos (escola/trabalho e casa)?"
}, {
  id: "dur",
  pergunta: "Duração mínima de 6 meses confirmada?"
}, {
  id: "prej",
  pergunta: "Prejuízo funcional claro em atividades sociais/acadêmicas/profissionais?"
}];
const CONF_TDAH_HI = [{
  id: "ini",
  pergunta: "Sintomas de hiperatividade/impulsividade presentes antes dos 12 anos?"
}, {
  id: "ctx",
  pergunta: "Presentes em 2 ou mais contextos?"
}, {
  id: "dur",
  pergunta: "Duração mínima de 6 meses confirmada?"
}, {
  id: "prej",
  pergunta: "Prejuízo funcional claro?"
}];
const CONF_TEA = [{
  id: "dev",
  pergunta: "Sintomas presentes no período de desenvolvimento precoce (mesmo que se manifestem depois)?"
}, {
  id: "prej",
  pergunta: "Prejuízo significativo no funcionamento social, profissional ou em outras áreas?"
}];
const CONF_TOD = [{
  id: "dur",
  pergunta: "Comportamentos presentes por pelo menos 6 meses?"
}, {
  id: "ctx",
  pergunta: "Ocorre com pelo menos uma pessoa que não seja irmão?"
}];
const CONF_JOGOS = [{
  id: "dur",
  pergunta: "Padrão persistente por pelo menos 12 meses?"
}, {
  id: "excl",
  pergunta: "NÃO ocorre exclusivamente durante episódio maníaco?"
}];
const CONF_DEPENDENCIA = [{
  id: "dur",
  pergunta: "Padrão problemático por pelo menos 12 meses?"
}];

// Hook: carrega e salva ajustes clínicos no Firestore
function useAjustesClinicos(colecao, docId) {
  const [ajustes, setAjustes] = useState({});
  const [historico, setHistorico] = useState([]);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (!docId) return;
    db.collection(colecao).doc(docId).get().then(snap => {
      if (snap.exists) {
        const data = snap.data().ajustesClinicos || {};
        const hist = data._historico || [];
        const ajustesSemHist = {
          ...data
        };
        delete ajustesSemHist._historico;
        setAjustes(ajustesSemHist);
        setHistorico(hist);
      }
    });
  }, [docId]);
  function salvarAjuste(chave, valor, snapshot) {
    const novos = {
      ...ajustes,
      [chave]: valor
    };
    setAjustes(novos);
    setSalvando(true);
    // Se vier snapshot de resultado, registra no histórico
    let novoHistorico = historico;
    if (snapshot) {
      const entrada = {
        ts: new Date().toISOString(),
        chave,
        valor,
        resultado: snapshot
      };
      novoHistorico = [...historico, entrada];
      setHistorico(novoHistorico);
    }
    db.collection(colecao).doc(docId).update({
      ajustesClinicos: {
        ...novos,
        _historico: novoHistorico
      }
    }).finally(() => setSalvando(false));
  }
  function limparAjuste(chave) {
    const novos = {
      ...ajustes
    };
    delete novos[chave];
    setAjustes(novos);
    db.collection(colecao).doc(docId).update({
      ajustesClinicos: {
        ...novos,
        _historico: historico
      }
    });
  }
  return {
    ajustes,
    historico,
    salvarAjuste,
    limparAjuste,
    salvando
  };
}

// Função: avalia critérios DSM-5 com ajustes clínicos e confirmações
function avaliarCriteriosDSM5(criterios, ajustes, confirmacoes, statusFn) {
  // Resolve cada critério
  const criteriosResolvidos = criterios.map((c, i) => {
    const chave = "criterio#" + i;
    const ajuste = ajustes[chave];
    let atendeResolvido;
    let fonte;
    if (ajuste === "presente") {
      atendeResolvido = true;
      fonte = "clinico";
    } else if (ajuste === "ausente") {
      atendeResolvido = false;
      fonte = "clinico";
    } else {
      atendeResolvido = c.valorOriginal === "C";
      fonte = "questionario";
    }
    return {
      ...c,
      atendeResolvido,
      fonte
    };
  });
  const nC = criteriosResolvidos.filter(c => c.atendeResolvido).length;

  // Resolve confirmações
  const confsResolvidas = (confirmacoes || []).map((conf, i) => {
    const chave = "conf#" + i;
    const resposta = ajustes[chave] || null;
    return {
      ...conf,
      resposta
    };
  });

  // Calcula status base
  let status, label;
  if (statusFn) {
    const resultado = statusFn(criteriosResolvidos, confsResolvidas);
    status = resultado.atende;
    label = resultado.label;
  } else {
    // Regra padrão igual ao laudoDSM5 — "diag" se todos C, "prov" se maioria
    const total = criteriosResolvidos.length;
    if (total === 0) {
      status = false;
      label = "✗ Sem critérios";
    } else if (nC === total) {
      status = "diag";
      label = "✓ Diagnóstico";
    } else if (nC >= Math.ceil(total * 0.6)) {
      status = "prov";
      label = "⚠ Diagnóstico provável";
    } else {
      status = false;
      label = "✗ Não atende";
    }
  }

  // Aplica regras de confirmação
  const respondidas = confsResolvidas.filter(c => c.resposta !== null);
  const algumaNao = confsResolvidas.some(c => c.resposta === "nao");
  if (algumaNao) {
    status = false;
    label = "✗ Não fecha diagnóstico";
  } else if (respondidas.length > 0 && status !== false) {
    const todasSim = respondidas.length === confsResolvidas.length && confsResolvidas.every(c => c.resposta === "sim");
    const algumasSim = respondidas.some(c => c.resposta === "sim");
    const algumasSemResposta = confsResolvidas.some(c => c.resposta === null);
    if (todasSim) {
      label = label + " (confirmado)";
    } else if (algumasSemResposta && algumasSim) {
      label = label + " (confirmação parcial)";
    } else if (algumasSemResposta) {
      label = label + " (confirmar na entrevista)";
    }
  }
  return {
    criteriosResolvidos,
    nC,
    status,
    label,
    confsResolvidas
  };
}

// Componente: Lista de critérios DSM-5 com painel de reavaliação
function ListaCriteriosDSM5({
  titulo,
  criterios,
  ajustes,
  historico,
  salvarAjuste,
  limparAjuste,
  confirmacoes,
  statusFn,
  salvando
}) {
  const [painelAberto, setPainelAberto] = useState(false);
  const [histAberto, setHistAberto] = useState(false);
  const {
    criteriosResolvidos,
    nC,
    status,
    label,
    confsResolvidas
  } = avaliarCriteriosDSM5(criterios, ajustes, confirmacoes || [], statusFn);
  function badgeStatus() {
    const cor = status === "diag" ? {
      bg: "#fef2f2",
      cor: "#dc2626"
    } : status === "prov" ? {
      bg: "#fffbeb",
      cor: "#d97706"
    } : {
      bg: "#f0fdf4",
      cor: "#16a34a"
    };
    return /*#__PURE__*/React.createElement("span", {
      style: {
        background: cor.bg,
        color: cor.cor,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700
      }
    }, label);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      border: "1px solid #e9d5ff",
      borderRadius: 12,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f5f3ff",
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      color: "#3d006a"
    }
  }, "Análise DSM-5", titulo ? " — " + titulo : ""), badgeStatus(), salvando && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#7B00C4"
    }
  }, "💾 Salvando...")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPainelAberto(!painelAberto),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      background: painelAberto ? "#7B00C4" : "white",
      color: painelAberto ? "white" : "#7B00C4",
      border: "1.5px solid #7B00C4",
      borderRadius: 8,
      padding: "5px 12px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "🩺 ", painelAberto ? "Fechar reavaliação" : "Reavaliar com a entrevista")), painelAberto && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      background: "white",
      borderBottom: "1px solid #e9d5ff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      color: "#374151",
      marginBottom: 10
    }
  }, "Ajuste de critérios"), criteriosResolvidos.map((c, i) => {
    const chave = "criterio#" + i;
    const ajuste = ajustes[chave];
    const fonteLabel = c.fonte === "clinico" ? /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#ede9fe",
        color: "#7B00C4",
        fontSize: 10,
        padding: "1px 7px",
        borderRadius: 20,
        fontWeight: 600
      }
    }, "clínico 🩺") : /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#dbeafe",
        color: "#1d4ed8",
        fontSize: 10,
        padding: "1px 7px",
        borderRadius: 20,
        fontWeight: 600
      }
    }, "questionário");
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        borderBottom: "1px solid #f3f4f6",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 12,
        color: "#374151",
        minWidth: 120
      }
    }, c.label || c.texto), fonteLabel, /*#__PURE__*/React.createElement("button", {
      onClick: () => salvarAjuste(chave, "presente", {
        titulo,
        label,
        nC,
        total: criteriosResolvidos.length
      }),
      style: {
        padding: "3px 10px",
        borderRadius: 6,
        border: "1.5px solid",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        background: ajuste === "presente" ? "#dc2626" : "white",
        color: ajuste === "presente" ? "white" : "#dc2626",
        borderColor: "#dc2626"
      }
    }, "Presente"), /*#__PURE__*/React.createElement("button", {
      onClick: () => salvarAjuste(chave, "ausente", {
        titulo,
        label,
        nC,
        total: criteriosResolvidos.length
      }),
      style: {
        padding: "3px 10px",
        borderRadius: 6,
        border: "1.5px solid",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        background: ajuste === "ausente" ? "#16a34a" : "white",
        color: ajuste === "ausente" ? "white" : "#16a34a",
        borderColor: "#16a34a"
      }
    }, "Ausente"), ajuste && /*#__PURE__*/React.createElement("button", {
      onClick: () => limparAjuste(chave),
      style: {
        padding: "3px 8px",
        borderRadius: 6,
        border: "1px solid #9ca3af",
        cursor: "pointer",
        fontSize: 11,
        color: "#6b7280",
        background: "white"
      }
    }, "↩ Restaurar"));
  }), (confirmacoes || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      color: "#374151",
      marginBottom: 8,
      borderTop: "1px solid #e9d5ff",
      paddingTop: 10
    }
  }, "Perguntas da entrevista clínica"), confsResolvidas.map((conf, i) => {
    const chave = "conf#" + i;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        borderBottom: "1px solid #f3f4f6",
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 12,
        color: "#374151",
        minWidth: 180
      }
    }, conf.pergunta), /*#__PURE__*/React.createElement("button", {
      onClick: () => salvarAjuste(chave, "sim", {
        titulo,
        label,
        nC,
        total: criteriosResolvidos.length
      }),
      style: {
        padding: "3px 10px",
        borderRadius: 6,
        border: "1.5px solid",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        background: conf.resposta === "sim" ? "#059669" : "white",
        color: conf.resposta === "sim" ? "white" : "#059669",
        borderColor: "#059669"
      }
    }, "Sim"), /*#__PURE__*/React.createElement("button", {
      onClick: () => salvarAjuste(chave, "nao", {
        titulo,
        label,
        nC,
        total: criteriosResolvidos.length
      }),
      style: {
        padding: "3px 10px",
        borderRadius: 6,
        border: "1.5px solid",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 600,
        background: conf.resposta === "nao" ? "#dc2626" : "white",
        color: conf.resposta === "nao" ? "white" : "#dc2626",
        borderColor: "#dc2626"
      }
    }, "Não"), conf.resposta && /*#__PURE__*/React.createElement("button", {
      onClick: () => limparAjuste(chave),
      style: {
        padding: "3px 8px",
        borderRadius: 6,
        border: "1px solid #9ca3af",
        cursor: "pointer",
        fontSize: 11,
        color: "#6b7280",
        background: "white"
      }
    }, "↩"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "10px 14px",
      background: "white"
    }
  }, criteriosResolvidos.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      padding: "5px 0",
      borderBottom: "1px solid #f9fafb"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 22,
      height: 22,
      borderRadius: "50%",
      background: c.atendeResolvido ? "#fef2f2" : "#f0fdf4",
      color: c.atendeResolvido ? "#dc2626" : "#16a34a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 10,
      fontWeight: 700
    }
  }, c.atendeResolvido ? "C" : "—"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#374151"
    }
  }, c.label || c.texto), c.obs && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#6b7280",
      lineHeight: 1.4,
      marginTop: 2
    }
  }, c.obs)), c.fonte === "clinico" && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#ede9fe",
      color: "#7B00C4",
      fontSize: 9,
      padding: "1px 6px",
      borderRadius: 20,
      fontWeight: 600,
      flexShrink: 0
    }
  }, "🩺"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#6b7280"
    }
  }, nC, " de ", criteriosResolvidos.length, " critérios presentes"), badgeStatus())), historico && historico.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid #e9d5ff",
      background: "#faf5ff"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setHistAberto(!histAberto),
    style: {
      width: "100%",
      textAlign: "left",
      padding: "8px 14px",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 11,
      color: "#7B00C4",
      fontWeight: 600
    }
  }, "🕘 ", histAberto ? "Ocultar" : "Ver", " histórico de reavaliações (", historico.length, ")"), histAberto && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 14px 12px"
    }
  }, [...historico].reverse().map((h, i) => {
    const dt = new Date(h.ts).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    const tipoChave = h.chave.startsWith("conf#") ? "Entrevista" : "Critério";
    const valorLabel = h.valor === "presente" ? "Presente ✓" : h.valor === "ausente" ? "Ausente ✗" : h.valor === "sim" ? "Sim ✓" : "Não ✗";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        fontSize: 11,
        color: "#4b5563",
        padding: "5px 0",
        borderBottom: "1px solid #ede9fe",
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#9ca3af",
        minWidth: 100
      }
    }, dt), /*#__PURE__*/React.createElement("span", {
      style: {
        background: "#ede9fe",
        color: "#7B00C4",
        padding: "0 6px",
        borderRadius: 10,
        fontWeight: 600
      }
    }, tipoChave), /*#__PURE__*/React.createElement("span", null, valorLabel), h.resultado && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#6b7280"
      }
    }, "→ ", h.resultado.label, " (", h.resultado.nC, "/", h.resultado.total, ")"));
  }))));
}
function AbaRastreamento({
  paciente
}) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const {
    ajustes: ajustesBipolar,
    historico: historicoBipolar,
    salvarAjuste: salvarBipolar,
    limparAjuste: limparBipolar,
    salvando: salvandoBipolar
  } = useAjustesClinicos("clinica_rastreamento_bipolar", docs.length > 0 ? docs[0].id : null);
  useEffect(() => {
    if (!paciente?.nome) return;
    db.collection("clinica_rastreamento_bipolar").where("pacienteNome", "==", paciente.nome).get().then(snap => {
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDocs(lista);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente?.nome]);
  function copiarLink() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    navigator.clipboard.writeText(url).then(() => alert("✓ Link copiado! " + url));
  }
  function enviarWhatsApp() {
    const nome = paciente.nome || "paciente";
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/?paciente=${encodeURIComponent(nome)}`;
    const msg = "Olá! 😊\n\nA Dra. Lucia Kratz preparou um questionário clínico para você responder sobre *" + nome + "*.\n\n📊 *Rastreamento Clínico*\nResponda com calma e honestidade — leva cerca de 5 a 10 minutos.\n\nAcesse pelo link abaixo:\n" + url + "\n\nQualquer dúvida, estou por aqui!\n_Dra. Lucia Kratz · CRP 09/20590_";
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }
  function gerarLaudo() {
    if (docs.length === 0) {
      alert("Nenhuma resposta para gerar laudo.");
      return;
    }
    const pacNome = paciente.nome || "Paciente";
    const data = new Date().toLocaleDateString("pt-BR");

    // Calcular critérios por respondente
    const escoresPorDoc = docs.map(d => ({
      ...d,
      escores: calcularEscores(d)
    }));
    // Médias de critérios C
    const n = escoresPorDoc.length;
    const mediaEscores = {
      bipolarManiaC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.bipolarManiaC, 0) / n * 10) / 10,
      bipolarManiaB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.bipolarManiaB, 0) / n * 10) / 10,
      bipolarDepC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.bipolarDepC, 0) / n * 10) / 10,
      bipolarDepB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.bipolarDepB, 0) / n * 10) / 10,
      borderlineC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.borderlineC, 0) / n * 10) / 10,
      borderlineB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.borderlineB, 0) / n * 10) / 10
    };
    const laudo = laudoDSM5(mediaEscores);
    const LETRA_COR = {
      A: "#16a34a",
      B: "#d97706",
      C: "#dc2626",
      D: "#7f1d1d"
    };
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Laudo Rastreamento — ${pacNome}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.6}
h1{font-size:20px;color:#3d006a;margin-bottom:4px}
h2{font-size:14px;color:#7B00C4;margin:20px 0 8px;border-bottom:1px solid #ede9fe;padding-bottom:4px}
h3{font-size:12.5px;color:#374151;margin:12px 0 6px}
.header{border-bottom:2px solid #7B00C4;padding-bottom:16px;margin-bottom:20px}
.sub{font-size:12px;color:#6b7280;margin-top:2px}
.barra-wrap{margin-bottom:10px}
.barra-bg{background:#f3f4f6;border-radius:20px;height:10px;overflow:hidden;margin-top:3px}
.hipotese{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:14px 18px;margin:12px 0}
.hipotese .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7B00C4;margin-bottom:4px}
.hipotese .valor{font-size:15px;font-weight:700;color:#3d006a}
.criterio{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:8px}
.criterio .nome{font-weight:700;font-size:13px;margin-bottom:4px}
.badge-sim{background:#fef2f2;color:#dc2626;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.badge-nao{background:#f0fdf4;color:#16a34a;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.badge-inv{background:#fffbeb;color:#d97706;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.atencao-item{background:#fff7ed;border-left:3px solid #f97316;padding:8px 12px;margin-bottom:6px;border-radius:0 6px 6px 0;font-size:12px}
.resp-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11.5px}
.resp-table th{background:#f5f3ff;padding:6px 10px;text-align:left;font-size:10.5px;color:#7B00C4;border:1px solid #ede9fe}
.resp-table td{padding:6px 10px;border:1px solid #e5e7eb;vertical-align:top}
.resp-table tr:nth-child(even) td{background:#fafafa}
.letra{font-weight:700;font-size:13px}
.rodape{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
.assinatura{text-align:center;margin-top:40px}
.assinatura img{height:60px;opacity:.9}
.assinatura p{font-size:12px;color:#374151;margin-top:6px}
@media print{body{padding:16px}.no-print{display:none}}
</style></head><body>
<div class="no-print" style="margin-bottom:20px">
  <button onclick="window.print()" style="background:#7B00C4;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px">🖨️ Imprimir / Salvar PDF</button>
</div>
<div class="header">
  <h1>Laudo Analítico de Rastreamento Clínico</h1>
  <div class="sub">Paciente: <strong>${pacNome}</strong> · Data: ${data} · Dra. Lucia Kratz · CRP 09/20590</div>
  <div class="sub">Respondentes: ${docs.length} (${docs.map(d => d.tipoRespondente === "paciente" ? "próprio paciente" : d.parentesco || "familiar").join(", ")})</div>
</div>

<h2>I. Critérios por Eixo DSM-5 (média entre respondentes)</h2>
<div class="barra-wrap">
  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>Eixo Bipolar — Mania/Hipomania</strong> (3 critérios)</span><span style="color:#dc2626;font-weight:700">${mediaEscores.bipolarManiaC} de 3 critérios C</span></div>
  <div class="barra-bg"><div style="width:${Math.round(mediaEscores.bipolarManiaC / 3 * 100)}%;background:#dc2626;height:100%;border-radius:20px"></div></div>
</div>
<div class="barra-wrap">
  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>Eixo Bipolar — Depressão</strong> (3 critérios)</span><span style="color:#7c3aed;font-weight:700">${mediaEscores.bipolarDepC} de 3 critérios C</span></div>
  <div class="barra-bg"><div style="width:${Math.round(mediaEscores.bipolarDepC / 3 * 100)}%;background:#7c3aed;height:100%;border-radius:20px"></div></div>
</div>
<div class="barra-wrap">
  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>Eixo Borderline (TPB)</strong> (9 critérios)</span><span style="color:#2563eb;font-weight:700">${mediaEscores.borderlineC} de 9 critérios C</span></div>
  <div class="barra-bg"><div style="width:${Math.round(mediaEscores.borderlineC / 9 * 100)}%;background:#2563eb;height:100%;border-radius:20px"></div></div>
</div>

<h2>II. Hipótese Diagnóstica</h2>
<div class="hipotese">
  <div class="label">Hipótese principal</div>
  <div class="valor">${laudo.hipotese}</div>
</div>

<h3>Análise por Critério DSM-5</h3>
${laudo.criterios.map(c => `
<div class="criterio">
  <div class="nome">${c.label} &nbsp; <span class="${c.atende === "diag" || c.atende === true ? "badge-sim" : c.atende === false ? "badge-nao" : "badge-inv"}">${c.atende === "diag" || c.atende === true ? "✓ Diagnóstico" : c.atende === "prov" ? "⚠ Diagnóstico provável" : "✗ Não atende"}</span></div>
  <div style="font-size:12px;color:#4b5563;margin-top:4px">${c.obs}</div>
</div>`).join("")}

<h2>III. Pontos de Atenção para a Entrevista Clínica</h2>
${laudo.atencao.length === 0 ? "<p style='color:#6b7280;font-size:12px'>Nenhum ponto de atenção crítico identificado pelos escores.</p>" : laudo.atencao.map(a => `<div class="atencao-item">⚠ ${a}</div>`).join("")}

<h2>IV. Respostas por Respondente</h2>
${escoresPorDoc.map(d => `
<h3>${d.tipoRespondente === "paciente" ? "🧑 Próprio paciente" : "👨‍👩‍👧 " + (d.nomeRespondente || "Familiar") + " (" + (d.parentesco || "—") + ")"}</h3>
<table class="resp-table">
<thead><tr><th>#</th><th>Pergunta</th><th>Bloco</th><th>Resp.</th></tr></thead>
<tbody>
${PERGUNTAS_RASTREAMENTO.map(p => `
<tr><td>${p.id.replace("p", "")}</td><td>${p.texto}</td><td>${p.bloco}</td>
<td><span class="letra" style="color:${LETRA_COR[d[p.id]] || "#6b7280"}">${d[p.id] || "—"}</span></td></tr>`).join("")}
${d.obsFinais ? `<tr><td colspan="2"><strong>Observações livres</strong></td><td colspan="2">${d.obsFinais}</td></tr>` : ""}
</tbody></table>`).join("")}

<div class="assinatura">
  <img src="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/Assinatura Lu%C3%ADcia%20Kratz.png" alt="Assinatura" onerror="this.style.display='none'"/>
  <p><strong>Dra. Lucia Kratz</strong><br/>Psicóloga · CRP 09/20590<br/>Doutora em Psicologia · TCC · Musicoterapia · Neuromodulação</p>
</div>
<div class="rodape">Documento gerado em ${data} · Uso exclusivo para fins clínicos · Confidencial · LGPD</div>
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }
  if (loading) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Spinner, null));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginBottom: 20,
      flexWrap: "wrap",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-dark)"
    }
  }, "Rastreamento Bipolar / Borderline"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, docs.length, " respondente", docs.length !== 1 ? "s" : "", " encontrado", docs.length !== 1 ? "s" : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: copiarLink
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px",
      color: "#16a34a",
      borderColor: "#16a34a"
    },
    onClick: enviarWhatsApp
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 13
  }), " WhatsApp"), docs.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: gerarLaudo
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 13
  }), " Gerar Laudo PDF"))), docs.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 40,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 12
    }
  }, "📊"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Nenhuma resposta ainda"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      marginBottom: 16
    }
  }, "Envie o link do rastreamento para o paciente e os familiares."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: copiarLink
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 14
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: enviarWhatsApp
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 14
  }), " Enviar pelo WhatsApp"))), docs.length > 0 && (() => {
    const escoresPorDoc = docs.map(d => ({
      ...d,
      escores: calcularEscores(d)
    }));
    const nDocs = docs.length;
    const media = {
      bipolarManiaC: escoresPorDoc.reduce((s, d) => s + d.escores.bipolarManiaC, 0) / nDocs,
      bipolarManiaB: escoresPorDoc.reduce((s, d) => s + d.escores.bipolarManiaB, 0) / nDocs,
      bipolarDepC: escoresPorDoc.reduce((s, d) => s + d.escores.bipolarDepC, 0) / nDocs,
      bipolarDepB: escoresPorDoc.reduce((s, d) => s + d.escores.bipolarDepB, 0) / nDocs,
      borderlineC: escoresPorDoc.reduce((s, d) => s + d.escores.borderlineC, 0) / nDocs,
      borderlineB: escoresPorDoc.reduce((s, d) => s + d.escores.borderlineB, 0) / nDocs
    };
    const laudo = laudoDSM5(media);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f5f3ff",
        border: "1px solid #c4b5fd",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: "var(--purple)",
        marginBottom: 4
      }
    }, "Hipótese diagnóstica"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "#3d006a",
        lineHeight: 1.4
      }
    }, laudo.hipotese)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--gray-50)",
        border: "1px solid var(--gray-200)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 12
      }
    }, "Critérios por eixo (média entre respondentes)"), /*#__PURE__*/React.createElement(BarraEscore, {
      label: "Eixo Bipolar · Mania/Hipomania",
      valor: Math.round(laudo.bipolarManiaC),
      max: 3,
      cor: "#dc2626"
    }), /*#__PURE__*/React.createElement(BarraEscore, {
      label: "Eixo Bipolar · Depressão",
      valor: Math.round(laudo.bipolarDepC),
      max: 3,
      cor: "#7c3aed"
    }), /*#__PURE__*/React.createElement(BarraEscore, {
      label: "Eixo Borderline (TPB)",
      valor: Math.round(laudo.borderlineC),
      max: 9,
      cor: "#2563eb"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 10
      }
    }, "Análise DSM-5"), laudo.criterios.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        border: "1px solid var(--gray-200)",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, c.label), /*#__PURE__*/React.createElement(CorBadge, {
      atende: c.atende
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        lineHeight: 1.5
      }
    }, c.obs)))), docs.length > 0 && (() => {
      const d0 = docs[0];
      const criteriosMania = ["p1", "p2", "p3"].map(pid => {
        const p = PERGUNTAS_RASTREAMENTO.find(x => x.id === pid);
        return {
          texto: p ? p.texto : pid,
          valorOriginal: d0[pid] === "C" ? "C" : ""
        };
      });
      const criteriosDep = ["p4", "p5", "p6"].map(pid => {
        const p = PERGUNTAS_RASTREAMENTO.find(x => x.id === pid);
        return {
          texto: p ? p.texto : pid,
          valorOriginal: d0[pid] === "C" ? "C" : ""
        };
      });
      const criteriosBorderline = ["p7", "p8", "p9", "p10", "p11", "p12", "p13", "p14", "p15"].map(pid => {
        const p = PERGUNTAS_RASTREAMENTO.find(x => x.id === pid);
        return {
          texto: p ? p.texto : pid,
          valorOriginal: d0[pid] === "C" ? "C" : ""
        };
      });
      return /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "center",
          fontSize: 11,
          color: "#9ca3af",
          margin: "16px 0 4px",
          letterSpacing: 1
        }
      }, "── Reavaliação clínica ──"), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "Mania / Hipomania",
        criterios: criteriosMania,
        ajustes: ajustesBipolar,
        historico: historicoBipolar,
        salvarAjuste: salvarBipolar,
        limparAjuste: limparBipolar,
        confirmacoes: CONF_BIPOLAR_MANIA,
        salvando: salvandoBipolar,
        statusFn: (crs, confs) => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n === 3) return {
            atende: "diag",
            label: "✓ Mania/Hipomania — critérios presentes"
          };
          if (n === 2) return {
            atende: "prov",
            label: "⚠ Hipomania provável"
          };
          return {
            atende: false,
            label: "✗ Não atende"
          };
        }
      }), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "Depressão Bipolar",
        criterios: criteriosDep,
        ajustes: ajustesBipolar,
        historico: historicoBipolar,
        salvarAjuste: (k, v) => salvarBipolar("dep_" + k, v, {
          titulo: "Depressão Bipolar"
        }),
        limparAjuste: k => limparBipolar("dep_" + k),
        confirmacoes: CONF_BIPOLAR_DEP,
        salvando: salvandoBipolar,
        statusFn: (crs, confs) => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n === 3) return {
            atende: "diag",
            label: "✓ Episódio Depressivo Bipolar"
          };
          if (n === 2) return {
            atende: "prov",
            label: "⚠ Depressão bipolar provável"
          };
          return {
            atende: false,
            label: "✗ Não atende"
          };
        }
      }), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "Borderline (TPB)",
        criterios: criteriosBorderline,
        ajustes: ajustesBipolar,
        historico: historicoBipolar,
        salvarAjuste: (k, v) => salvarBipolar("tpb_" + k, v, {
          titulo: "Borderline"
        }),
        limparAjuste: k => limparBipolar("tpb_" + k),
        confirmacoes: CONF_BORDERLINE,
        salvando: salvandoBipolar,
        statusFn: (crs, confs) => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n >= 5) return {
            atende: "diag",
            label: "✓ TPB — 5+ critérios"
          };
          if (n >= 4) return {
            atende: "prov",
            label: "⚠ TPB provável — 4 critérios"
          };
          return {
            atende: false,
            label: "✗ Não atende (< 4 critérios)"
          };
        }
      }));
    })(), laudo.atencao.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 8
      }
    }, "⚠ Pontos de atenção para a entrevista"), laudo.atencao.map((a, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: "#fff7ed",
        borderLeft: "3px solid #f97316",
        padding: "8px 12px",
        marginBottom: 6,
        borderRadius: "0 8px 8px 0",
        fontSize: 12,
        lineHeight: 1.5
      }
    }, a))), (() => {
      // Agrupa por respondente e calcula média dos escores
      const mapaResp = new Map();
      escoresPorDoc.forEach(d => {
        const chave = (d.tipoRespondente || "") + "|" + (d.nomeRespondente || "");
        if (!mapaResp.has(chave)) {
          mapaResp.set(chave, {
            docs: [],
            ref: d
          });
        }
        mapaResp.get(chave).docs.push(d);
      });
      const unicos = Array.from(mapaResp.values()).map(grupo => {
        const n = grupo.docs.length;
        const mediaEscores = {
          bipolarManiaC: grupo.docs.reduce((s, d) => s + d.escores.bipolarManiaC, 0) / n,
          bipolarDepC: grupo.docs.reduce((s, d) => s + d.escores.bipolarDepC, 0) / n,
          borderlineC: grupo.docs.reduce((s, d) => s + d.escores.borderlineC, 0) / n
        };
        const ultimo = grupo.docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0];
        return {
          ...ultimo,
          escores: mediaEscores,
          totalEnvios: n
        };
      }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      const temDivergencia = unicos.length > 1;

      // Detecta divergência por eixo (diferença >1 critério entre respondentes)
      function diverge(campo) {
        if (unicos.length < 2) return false;
        const vals = unicos.map(d => Math.round(d.escores[campo]));
        return Math.max(...vals) - Math.min(...vals) > 1;
      }
      const divMania = diverge("bipolarManiaC");
      const divDep = diverge("bipolarDepC");
      const divTPB = diverge("borderlineC");
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 10
        }
      }, "Respondentes", temDivergencia && /*#__PURE__*/React.createElement("span", {
        style: {
          marginLeft: 8,
          fontSize: 11,
          fontWeight: 400,
          color: "#d97706",
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          borderRadius: 20,
          padding: "2px 8px"
        }
      }, "⚡ Divergência detectada")), /*#__PURE__*/React.createElement("div", {
        style: {
          overflowX: "auto",
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
        style: {
          background: "var(--gray-50)"
        }
      }, /*#__PURE__*/React.createElement("th", {
        style: {
          textAlign: "left",
          padding: "8px 10px",
          fontWeight: 600,
          color: "var(--text-muted)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: .5,
          borderBottom: "2px solid var(--gray-200)"
        }
      }, "Respondente"), /*#__PURE__*/React.createElement("th", {
        style: {
          textAlign: "left",
          padding: "8px 10px",
          fontWeight: 600,
          color: "var(--text-muted)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: .5,
          borderBottom: "2px solid var(--gray-200)"
        }
      }, "Data"), /*#__PURE__*/React.createElement("th", {
        style: {
          textAlign: "center",
          padding: "8px 10px",
          fontWeight: 600,
          color: "#dc2626",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: .5,
          borderBottom: "2px solid var(--gray-200)",
          background: divMania ? "#fef2f2" : "var(--gray-50)"
        }
      }, "Mania", divMania ? " ⚡" : ""), /*#__PURE__*/React.createElement("th", {
        style: {
          textAlign: "center",
          padding: "8px 10px",
          fontWeight: 600,
          color: "#7c3aed",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: .5,
          borderBottom: "2px solid var(--gray-200)",
          background: divDep ? "#fdf4ff" : "var(--gray-50)"
        }
      }, "Dep", divDep ? " ⚡" : ""), /*#__PURE__*/React.createElement("th", {
        style: {
          textAlign: "center",
          padding: "8px 10px",
          fontWeight: 600,
          color: "#2563eb",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: .5,
          borderBottom: "2px solid var(--gray-200)",
          background: divTPB ? "#eff6ff" : "var(--gray-50)"
        }
      }, "TPB", divTPB ? " ⚡" : ""), /*#__PURE__*/React.createElement("th", {
        style: {
          textAlign: "center",
          padding: "8px 10px",
          fontWeight: 600,
          color: "var(--text-muted)",
          fontSize: 11,
          borderBottom: "2px solid var(--gray-200)"
        }
      }))), /*#__PURE__*/React.createElement("tbody", null, unicos.map((d, i) => {
        const mC = Math.round(d.escores.bipolarManiaC);
        const dC = Math.round(d.escores.bipolarDepC);
        const tC = Math.round(d.escores.borderlineC);
        const nome = d.tipoRespondente === "paciente" ? "🧑 Próprio paciente" : "👥 " + (d.nomeRespondente || "Familiar") + " · " + (d.parentesco || "Familiar");
        const data = d.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "—";
        return /*#__PURE__*/React.createElement("tr", {
          key: i,
          style: {
            borderBottom: "1px solid var(--gray-200)",
            cursor: "pointer",
            background: selecionado === i ? "#f5f3ff" : "white"
          },
          onClick: () => setSelecionado(selecionado === i ? null : i)
        }, /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "10px 10px",
            fontWeight: 600,
            fontSize: 12,
            color: "var(--text-dark)"
          }
        }, nome), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "10px 10px",
            fontSize: 11,
            color: "var(--text-muted)"
          }
        }, data), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "10px 10px",
            textAlign: "center",
            background: divMania ? "#fff8f8" : ""
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            background: "#fef2f2",
            color: "#dc2626",
            padding: "2px 8px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700
          }
        }, mC, "/3")), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "10px 10px",
            textAlign: "center",
            background: divDep ? "#fdf4ff" : ""
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            background: "#ede9fe",
            color: "#7c3aed",
            padding: "2px 8px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700
          }
        }, dC, "/3")), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "10px 10px",
            textAlign: "center",
            background: divTPB ? "#f0f7ff" : ""
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            background: "#eff6ff",
            color: "#2563eb",
            padding: "2px 8px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700
          }
        }, tC, "/9")), /*#__PURE__*/React.createElement("td", {
          style: {
            padding: "10px 10px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 12
          }
        }, selecionado === i ? "▲" : "▼"));
      })))), unicos.map((d, i) => selecionado === i && /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          border: "1px solid #c4b5fd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 10,
          background: "#f5f3ff"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 12,
          color: "#3d006a"
        }
      }, d.tipoRespondente === "paciente" ? "🧑 Próprio paciente" : "👥 " + (d.nomeRespondente || "Familiar") + " · " + (d.parentesco || "Familiar"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11,
          fontWeight: 400,
          color: "var(--text-muted)",
          marginLeft: 8
        }
      }, d.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "")), /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 12
        }
      }, /*#__PURE__*/React.createElement(BarraEscore, {
        label: "Mania/Hipomania",
        valor: d.escores.bipolarManiaC,
        max: 3,
        cor: "#dc2626"
      }), /*#__PURE__*/React.createElement(BarraEscore, {
        label: "Depressão",
        valor: d.escores.bipolarDepC,
        max: 3,
        cor: "#7c3aed"
      }), /*#__PURE__*/React.createElement(BarraEscore, {
        label: "Borderline (TPB)",
        valor: d.escores.borderlineC,
        max: 9,
        cor: "#2563eb"
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          borderTop: "1px solid #c4b5fd",
          paddingTop: 12
        }
      }, PERGUNTAS_RASTREAMENTO.map(p => /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: {
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 8,
          fontSize: 12
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          minWidth: 22,
          height: 22,
          borderRadius: "50%",
          background: d[p.id] === "C" || d[p.id] === "D" ? "#fef2f2" : d[p.id] === "B" ? "#fffbeb" : "#f0fdf4",
          color: d[p.id] === "C" || d[p.id] === "D" ? "#dc2626" : d[p.id] === "B" ? "#d97706" : "#16a34a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 11
        }
      }, d[p.id] || "—"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          color: "var(--text-muted)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: .5
        }
      }, p.bloco), /*#__PURE__*/React.createElement("div", {
        style: {
          color: "var(--text-dark)",
          lineHeight: 1.4
        }
      }, p.texto)))), d.obsFinais && /*#__PURE__*/React.createElement("div", {
        style: {
          background: "white",
          border: "1px solid var(--gray-200)",
          borderRadius: 8,
          padding: 10,
          marginTop: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: .5,
          marginBottom: 4
        }
      }, "Observações livres"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--text-dark)",
          lineHeight: 1.6
        }
      }, d.obsFinais))))));
    })());
  })());
}

// ═══════════════════════════════════════════════════════════════════
//  MÓDULO: RASTREAMENTO NEURO — AbaRastreamentoNeuro
//  Coleção: clinica_rastreamento_neuro
// ═══════════════════════════════════════════════════════════════════

const PERGUNTAS_NEURO = [{
  id: "p1",
  eixo: "TDAH Inatenção",
  texto: "Falhas em detalhes / erros por descuido"
}, {
  id: "p2",
  eixo: "TDAH Inatenção",
  texto: "Dificuldade em manter foco em tarefas longas"
}, {
  id: "p3",
  eixo: "TDAH Inatenção",
  texto: "Abandona tarefas antes de terminar"
}, {
  id: "p4",
  eixo: "TDAH Inatenção",
  texto: "Desorganização crônica de tempo e espaço"
}, {
  id: "p5",
  eixo: "TDAH Inatenção",
  texto: "Evitação de tarefas com esforço mental prolongado"
}, {
  id: "p6",
  eixo: "TDAH Inatenção",
  texto: "Perda frequente de objetos essenciais"
}, {
  id: "p7",
  eixo: "TDAH Inatenção",
  texto: "Distrabilidade por estímulos externos"
}, {
  id: "p8",
  eixo: "TDAH Inatenção",
  texto: "Esquecimentos de compromissos e rotinas"
}, {
  id: "p9",
  eixo: "TDAH Hiperatividade",
  texto: "Inquietação motora (mãos, pés, corpo)"
}, {
  id: "p10",
  eixo: "TDAH Hiperatividade",
  texto: "Dificuldade em permanecer sentado(a)"
}, {
  id: "p11",
  eixo: "TDAH Hiperatividade",
  texto: "Sensação de aceleração interna crônica"
}, {
  id: "p12",
  eixo: "TDAH Hiperatividade",
  texto: "Fala excessiva / monopoliza conversas"
}, {
  id: "p13",
  eixo: "TDAH Hiperatividade",
  texto: "Precipitação de respostas / completa frases alheias"
}, {
  id: "p14",
  eixo: "TDAH Hiperatividade",
  texto: "Dificuldade para esperar / impaciência extrema"
}, {
  id: "p15",
  eixo: "TDAH Hiperatividade",
  texto: "Interrupção ou intrusão em atividades alheias"
}, {
  id: "p16",
  eixo: "TEA",
  texto: "Dificuldade na reciprocidade social"
}, {
  id: "p17",
  eixo: "TEA",
  texto: "Uso atípico de contato visual / expressão facial"
}, {
  id: "p18",
  eixo: "TEA",
  texto: "Dificuldade em fazer e manter amigos"
}, {
  id: "p19",
  eixo: "TEA",
  texto: "Movimentos ou falas repetitivas (stimming)"
}, {
  id: "p20",
  eixo: "TEA",
  texto: "Angústia severa diante de mudanças de rotina"
}, {
  id: "p21",
  eixo: "TEA",
  texto: "Interesses restritos e hiperfixados"
}, {
  id: "p22",
  eixo: "TEA",
  texto: "Hiper ou hipossensibilidade sensorial"
}, {
  id: "p23",
  eixo: "TOD",
  texto: "Humor irritável e irascível"
}, {
  id: "p24",
  eixo: "TOD",
  texto: "Discussões com figuras de autoridade"
}, {
  id: "p25",
  eixo: "TOD",
  texto: "Desobediência ativa e recusa de regras"
}, {
  id: "p26",
  eixo: "TOD",
  texto: "Incomoda deliberadamente outras pessoas"
}, {
  id: "p27",
  eixo: "TOD",
  texto: "Culpa os outros pelos próprios erros"
}, {
  id: "p28",
  eixo: "TOD",
  texto: "Rancor e vingança persistentes"
}];

// Critérios Neuro: conta apenas C por eixo
function calcularEscoresNeuro(doc) {
  const isC = id => doc[id] === "C";
  const isB = id => doc[id] === "B";
  const ids = (a, b) => Array.from({
    length: b - a + 1
  }, (_, i) => "p" + (a + i));
  const idsIn = ids(1, 8);
  const idsHi = ids(9, 15);
  const idsTea = ids(16, 22);
  const idsTod = ids(23, 28);
  return {
    tdahInC: idsIn.filter(isC).length,
    tdahInB: idsIn.filter(isB).length,
    tdahHiC: idsHi.filter(isC).length,
    tdahHiB: idsHi.filter(isB).length,
    teaA_C: ["p16", "p17", "p18"].filter(isC).length,
    // critério A: social (3 itens)
    teaB_C: ["p19", "p20", "p21", "p22"].filter(isC).length,
    // critério B: restritivo (4 itens)
    todC: idsTod.filter(isC).length,
    todB: idsTod.filter(isB).length
  };
}
function laudoNeuro(escores) {
  const {
    tdahInC,
    tdahInB,
    tdahHiC,
    tdahHiB,
    teaA_C,
    teaB_C,
    todC,
    todB
  } = escores;
  let hipotese = [];
  let criterios = [];
  let atencao = [];

  // TDAH Inatenção: 8 critérios — diag ≥5C, provável 4C
  // TDAH Hiperatividade: 7 critérios — diag ≥5C, provável 4C
  const tdahIn_diag = tdahInC >= 5;
  const tdahIn_prov = tdahInC === 4;
  const tdahHi_diag = tdahHiC >= 5;
  const tdahHi_prov = tdahHiC === 4;
  if (tdahIn_diag || tdahHi_diag) {
    const subtipo = tdahIn_diag && tdahHi_diag ? "Apresentação Combinada" : tdahIn_diag ? "Predominantemente Desatento" : "Predominantemente Hiperativo/Impulsivo";
    hipotese.push("TDAH — " + subtipo);
    criterios.push({
      label: "TDAH (" + subtipo + ")",
      atende: "diag",
      obs: "Inatenção: " + tdahInC + "/8 critérios C · Hiperatividade: " + tdahHiC + "/7 critérios C. Verificar início antes dos 12 anos e prejuízo em múltiplos contextos (DSM-5 Critério C)."
    });
    atencao.push("Confirmar início dos sintomas antes dos 12 anos de idade (critério obrigatório DSM-5).");
    atencao.push("Verificar se os sintomas ocorrem em pelo menos 2 contextos (escola/trabalho, casa, social).");
  } else if (tdahIn_prov || tdahHi_prov) {
    const subtipo = tdahIn_prov && tdahHi_prov ? "Apresentação Combinada (provável)" : tdahIn_prov ? "Desatento (provável)" : "Hiperativo/Impulsivo (provável)";
    hipotese.push("TDAH — " + subtipo);
    criterios.push({
      label: "TDAH (" + subtipo + ")",
      atende: "prov",
      obs: "Inatenção: " + tdahInC + "/8 critérios C · Hiperatividade: " + tdahHiC + "/7 critérios C. Critérios insuficientes para diagnóstico pleno — avaliar longitudinalmente."
    });
  } else {
    criterios.push({
      label: "TDAH",
      atende: false,
      obs: "Inatenção: " + tdahInC + "/8 C · Hiperatividade: " + tdahHiC + "/7 C. Abaixo do limiar clínico (mínimo 5 de cada subtipo)."
    });
  }

  // TEA: critério A = todos 3 de p16–p18 C; critério B = 2+ de p19–p22 C
  const teaA_ok = teaA_C === 3;
  const teaB_ok = teaB_C >= 2;
  if (teaA_ok && teaB_ok) {
    hipotese.push("TEA — Transtorno do Espectro Autista");
    criterios.push({
      label: "TEA (DSM-5 F84.0)",
      atende: "diag",
      obs: "Critério A (comunicação social): " + teaA_C + "/3 C. Critério B (padrões restritos): " + teaB_C + "/4 C. Verificar presença desde o desenvolvimento precoce."
    });
    atencao.push("Investigar histórico de desenvolvimento precoce — sinais de TEA devem estar presentes desde a infância.");
    atencao.push("Diferenciar hiperfoco do TEA (restrito e intenso) da desatenção seletiva do TDAH.");
    if (tdahInC >= 4) atencao.push("Alta sobreposição TDAH + TEA detectada — avaliar comorbidade (presente em ~50% dos casos de TEA).");
  } else if (teaA_ok || teaA_C >= 2 && teaB_C >= 1) {
    criterios.push({
      label: "TEA (traços — a investigar)",
      atende: "prov",
      obs: "Critério A: " + teaA_C + "/3 C · Critério B: " + teaB_C + "/4 C. Critérios parciais — não atende o diagnóstico pleno. Avaliação especializada recomendada."
    });
    atencao.push("Encaminhar para avaliação neuropsicológica especializada — critérios parciais para TEA detectados.");
  } else {
    criterios.push({
      label: "TEA",
      atende: false,
      obs: "Critério A: " + teaA_C + "/3 C · Critério B: " + teaB_C + "/4 C. Abaixo do limiar diagnóstico."
    });
  }

  // TOD: 6 critérios — diag ≥4C, provável 3C
  if (todC >= 4) {
    hipotese.push("TOD — Transtorno Opositivo-Desafiador");
    criterios.push({
      label: "TOD (DSM-5 F91.3)",
      atende: "diag",
      obs: todC + "/6 critérios C. Avaliar se o padrão é persistente por ≥6 meses e presente com pelo menos uma pessoa além do irmão."
    });
    atencao.push("Diferenciar se a irritabilidade e oposição decorrem de desregulação emocional do TDAH ou de TOD independente.");
    atencao.push("Verificar duração ≥6 meses e prejuízo em pelo menos um contexto (DSM-5 Critério B).");
  } else if (todC === 3) {
    criterios.push({
      label: "TOD (diagnóstico provável)",
      atende: "prov",
      obs: "3/6 critérios C. Abaixo do limiar pleno (4+) — monitorar e avaliar longitudinalmente."
    });
  } else {
    criterios.push({
      label: "TOD",
      atende: false,
      obs: todC + "/6 critérios C. Abaixo do limiar clínico (mínimo 4)."
    });
  }
  if (hipotese.length === 0) hipotese.push("Sem hipótese diagnóstica definida pelos critérios — avaliação clínica aprofundada indicada.");
  return {
    hipotese: hipotese.join(" + "),
    criterios,
    atencao,
    tdahInC,
    tdahHiC,
    teaA_C,
    teaB_C,
    todC
  };
}
function BarraEscoreNeuro({
  label,
  valor,
  max,
  cor
}) {
  const pct = Math.min(100, Math.round(valor / max * 100));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "#374151"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: cor,
      fontWeight: 700
    }
  }, valor, " de ", max, " critérios")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f3f4f6",
      borderRadius: 20,
      height: 8,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + "%",
      background: cor,
      height: "100%",
      borderRadius: 20,
      transition: "width .5s"
    }
  })));
}
function AbaRastreamentoNeuro({
  paciente
}) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const {
    ajustes: ajustesNeuro,
    historico: historicoNeuro,
    salvarAjuste: salvarNeuro,
    limparAjuste: limparNeuro,
    salvando: salvandoNeuro
  } = useAjustesClinicos("clinica_rastreamento_neuro", docs.length > 0 ? docs[0].id : null);
  useEffect(() => {
    if (!paciente?.nome) return;
    db.collection("clinica_rastreamento_neuro").where("pacienteNome", "==", paciente.nome).get().then(snap => {
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDocs(lista);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente?.nome]);
  function copiarLink() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/neuro/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    navigator.clipboard.writeText(url).then(() => alert("✓ Link copiado! " + url));
  }
  function enviarWhatsApp() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/neuro/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    const msg = "Olá! 😊\n\nSua psicóloga Dra. Lucia Kratz preparou um questionário clínico para você preencher.\n\n🧩 *Questionário Clínico*\nResponda com calma e honestidade — leva cerca de 10 a 15 minutos.\n\n" + url + "\n\nQualquer dúvida, estou por aqui!\n_Dra. Lucia Kratz · CRP 09/20590_";
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }
  function gerarLaudoNeuro() {
    if (docs.length === 0) {
      alert("Nenhuma resposta para gerar laudo.");
      return;
    }
    const pacNome = paciente.nome || "Paciente";
    const data = new Date().toLocaleDateString("pt-BR");
    const escoresPorDoc = docs.map(d => ({
      ...d,
      escores: calcularEscoresNeuro(d)
    }));
    const n = docs.length;
    const media = {
      tdahInC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.tdahInC, 0) / n * 10) / 10,
      tdahInB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.tdahInB, 0) / n * 10) / 10,
      tdahHiC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.tdahHiC, 0) / n * 10) / 10,
      tdahHiB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.tdahHiB, 0) / n * 10) / 10,
      teaA_C: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.teaA_C, 0) / n * 10) / 10,
      teaB_C: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.teaB_C, 0) / n * 10) / 10,
      todC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.todC, 0) / n * 10) / 10,
      todB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.todB, 0) / n * 10) / 10
    };
    const laudo = laudoNeuro(media);
    const COR = {
      A: "#16a34a",
      B: "#d97706",
      C: "#dc2626"
    };
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Laudo Rastreamento Comportamental — ${pacNome}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.6}
h1{font-size:20px;color:#3d006a;margin-bottom:4px}
h2{font-size:14px;color:#7B00C4;margin:20px 0 8px;border-bottom:1px solid #ede9fe;padding-bottom:4px}
h3{font-size:12.5px;color:#374151;margin:12px 0 6px}
.header{border-bottom:2px solid #7B00C4;padding-bottom:16px;margin-bottom:20px}
.sub{font-size:12px;color:#6b7280;margin-top:2px}
.barra-bg{background:#f3f4f6;border-radius:20px;height:10px;overflow:hidden;margin-top:3px}
.hipotese{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:14px 18px;margin:12px 0}
.criterio{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:8px}
.badge-sim{background:#fef2f2;color:#dc2626;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.badge-nao{background:#f0fdf4;color:#16a34a;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.atencao-item{background:#fff7ed;border-left:3px solid #f97316;padding:8px 12px;margin-bottom:6px;border-radius:0 6px 6px 0;font-size:12px}
.resp-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11.5px}
.resp-table th{background:#f5f3ff;padding:6px 10px;text-align:left;font-size:10.5px;color:#7B00C4;border:1px solid #ede9fe}
.resp-table td{padding:6px 10px;border:1px solid #e5e7eb;vertical-align:top}
.resp-table tr:nth-child(even) td{background:#fafafa}
.rodape{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
.assinatura{text-align:center;margin-top:40px}
.assinatura img{height:60px;opacity:.9}
.assinatura p{font-size:12px;color:#374151;margin-top:6px}
@media print{body{padding:16px}.no-print{display:none}}
</style></head><body>
<div class="no-print" style="margin-bottom:20px">
  <button onclick="window.print()" style="background:#7B00C4;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px">🖨️ Imprimir / Salvar PDF</button>
</div>
<div class="header">
  <h1>Laudo de Rastreamento — Funcionamento e Comportamento</h1>
  <div class="sub">Paciente: <strong>${pacNome}</strong> · Data: ${data} · Dra. Lucia Kratz · CRP 09/20590</div>
  <div class="sub">Respondentes: ${docs.length} (${docs.map(d => d.tipoRespondente === "paciente" ? "próprio paciente" : d.parentesco || "familiar").join(", ")})</div>
</div>

<h2>I. Critérios DSM-5 por Eixo (média entre respondentes)</h2>
<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>TDAH — Inatenção</strong> (8 critérios, mín. 5C)</span><span style="color:#7c3aed;font-weight:700">${laudo.tdahInC} de 8 critérios C</span></div><div class="barra-bg"><div style="width:${Math.round(laudo.tdahInC / 8 * 100)}%;background:#7c3aed;height:100%;border-radius:20px"></div></div></div>
<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>TDAH — Hiperatividade/Impulsividade</strong> (7 critérios, mín. 5C)</span><span style="color:#dc2626;font-weight:700">${laudo.tdahHiC} de 7 critérios C</span></div><div class="barra-bg"><div style="width:${Math.round(laudo.tdahHiC / 7 * 100)}%;background:#dc2626;height:100%;border-radius:20px"></div></div></div>
<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>TEA — Critério A (comunicação social)</strong> (3 critérios, todos obrigatórios)</span><span style="color:#2563eb;font-weight:700">${laudo.teaA_C} de 3 critérios C</span></div><div class="barra-bg"><div style="width:${Math.round(laudo.teaA_C / 3 * 100)}%;background:#2563eb;height:100%;border-radius:20px"></div></div></div>
<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>TEA — Critério B (padrões restritos)</strong> (4 critérios, mín. 2C)</span><span style="color:#6366f1;font-weight:700">${laudo.teaB_C} de 4 critérios C</span></div><div class="barra-bg"><div style="width:${Math.round(laudo.teaB_C / 4 * 100)}%;background:#6366f1;height:100%;border-radius:20px"></div></div></div>
<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>TOD — Transtorno Opositivo-Desafiador</strong> (6 critérios, mín. 4C)</span><span style="color:#d97706;font-weight:700">${laudo.todC} de 6 critérios C</span></div><div class="barra-bg"><div style="width:${Math.round(laudo.todC / 6 * 100)}%;background:#d97706;height:100%;border-radius:20px"></div></div></div>

<h2>II. Hipótese Diagnóstica</h2>
<div class="hipotese"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7B00C4;margin-bottom:4px">Hipótese principal</div><div style="font-size:15px;font-weight:700;color:#3d006a">${laudo.hipotese}</div></div>
${laudo.criterios.map(c => `<div class="criterio"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${c.label} &nbsp;<span class="${c.atende === "diag" || c.atende === true ? "badge-sim" : c.atende === false ? "badge-nao" : "badge-inv"}">${c.atende === "diag" || c.atende === true ? "✓ Diagnóstico" : c.atende === "prov" ? "⚠ Diagnóstico provável" : "✗ Não atende"}</span></div><div style="font-size:12px;color:#4b5563">${c.obs}</div></div>`).join("")}

<h2>III. Pontos de Atenção para a Entrevista Clínica</h2>
${laudo.atencao.length === 0 ? "<p style='color:#6b7280;font-size:12px'>Nenhum ponto crítico identificado pelos escores.</p>" : laudo.atencao.map(a => `<div class="atencao-item">⚠ ${a}</div>`).join("")}

<h2>IV. Respostas por Respondente</h2>
${escoresPorDoc.map(d => `
<h3>${d.tipoRespondente === "paciente" ? "Próprio paciente" : "Familiar: " + (d.nomeRespondente || "") + " (" + (d.parentesco || "—") + ")"}</h3>
<table class="resp-table"><thead><tr><th>#</th><th>Item</th><th>Eixo</th><th>Resp.</th></tr></thead><tbody>
${PERGUNTAS_NEURO.map(p => `<tr><td>${p.id.replace("p", "")}</td><td>${p.texto}</td><td>${p.eixo}</td><td style="font-weight:700;color:${COR[d[p.id]] || "#6b7280"}">${d[p.id] || "—"}</td></tr>`).join("")}
${d.obsFinais ? `<tr><td colspan="2"><strong>Observações</strong></td><td colspan="2">${d.obsFinais}</td></tr>` : ""}
</tbody></table>`).join("")}

<div class="assinatura">
  <img src="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/Assinatura%20Lu%C3%ADcia%20Kratz.png" alt="Assinatura" onerror="this.style.display='none'"/>
  <p><strong>Dra. Lucia Kratz</strong><br/>Psicóloga · CRP 09/20590<br/>Doutora em Psicologia · TCC · Musicoterapia · Neuromodulação</p>
</div>
<div class="rodape">Documento gerado em ${data} · Uso exclusivo para fins clínicos · Confidencial · LGPD</div>
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }
  if (loading) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Spinner, null));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginBottom: 20,
      flexWrap: "wrap",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-dark)"
    }
  }, "Funcionamento e Comportamento"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, docs.length, " respondente", docs.length !== 1 ? "s" : "", " encontrado", docs.length !== 1 ? "s" : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: copiarLink
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px",
      color: "#16a34a",
      borderColor: "#16a34a"
    },
    onClick: enviarWhatsApp
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 13
  }), " WhatsApp"), docs.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: gerarLaudoNeuro
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 13
  }), " Gerar Laudo PDF"))), docs.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 40,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 12
    }
  }, "🧩"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Nenhuma resposta ainda"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      marginBottom: 16
    }
  }, "Envie o link para o paciente e os familiares responderem."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: copiarLink
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 14
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: enviarWhatsApp
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 14
  }), " Enviar pelo WhatsApp"))), docs.length > 0 && (() => {
    const escoresPorDoc = docs.map(d => ({
      ...d,
      escores: calcularEscoresNeuro(d)
    }));
    const n = docs.length;
    const media = {
      tdahInC: escoresPorDoc.reduce((s, d) => s + d.escores.tdahInC, 0) / n,
      tdahInB: escoresPorDoc.reduce((s, d) => s + d.escores.tdahInB, 0) / n,
      tdahHiC: escoresPorDoc.reduce((s, d) => s + d.escores.tdahHiC, 0) / n,
      tdahHiB: escoresPorDoc.reduce((s, d) => s + d.escores.tdahHiB, 0) / n,
      teaA_C: escoresPorDoc.reduce((s, d) => s + d.escores.teaA_C, 0) / n,
      teaB_C: escoresPorDoc.reduce((s, d) => s + d.escores.teaB_C, 0) / n,
      todC: escoresPorDoc.reduce((s, d) => s + d.escores.todC, 0) / n,
      todB: escoresPorDoc.reduce((s, d) => s + d.escores.todB, 0) / n
    };
    const laudo = laudoNeuro(media);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f5f3ff",
        border: "1px solid #c4b5fd",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: "var(--purple)",
        marginBottom: 4
      }
    }, "Hipótese diagnóstica"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "#3d006a",
        lineHeight: 1.4
      }
    }, laudo.hipotese)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--gray-50)",
        border: "1px solid var(--gray-200)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 12
      }
    }, "Critérios por eixo DSM-5"), /*#__PURE__*/React.createElement(BarraEscoreNeuro, {
      label: "TDAH — Inatenção (mín. 5/8)",
      valor: media.tdahInC,
      max: 8,
      cor: "#7c3aed"
    }), /*#__PURE__*/React.createElement(BarraEscoreNeuro, {
      label: "TDAH — Hiperatividade/Impuls. (mín. 5/7)",
      valor: media.tdahHiC,
      max: 7,
      cor: "#dc2626"
    }), /*#__PURE__*/React.createElement(BarraEscoreNeuro, {
      label: "TEA — Critério A / Social (3/3 obrigatórios)",
      valor: media.teaA_C,
      max: 3,
      cor: "#2563eb"
    }), /*#__PURE__*/React.createElement(BarraEscoreNeuro, {
      label: "TEA — Critério B / Restritos (mín. 2/4)",
      valor: media.teaB_C,
      max: 4,
      cor: "#6366f1"
    }), /*#__PURE__*/React.createElement(BarraEscoreNeuro, {
      label: "TOD — Opositivo-Desafiador (mín. 4/6)",
      valor: media.todC,
      max: 6,
      cor: "#d97706"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 10
      }
    }, "Análise DSM-5"), laudo.criterios.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        border: "1px solid var(--gray-200)",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, c.label), /*#__PURE__*/React.createElement(CorBadge, {
      atende: c.atende
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        lineHeight: 1.5
      }
    }, c.obs)))), laudo.atencao.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 8
      }
    }, "⚠ Pontos de atenção para a entrevista"), laudo.atencao.map((a, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: "#fff7ed",
        borderLeft: "3px solid #f97316",
        padding: "8px 12px",
        marginBottom: 6,
        borderRadius: "0 8px 8px 0",
        fontSize: 12,
        lineHeight: 1.5
      }
    }, a))), docs.length > 0 && (() => {
      const d0 = docs[0];
      const cTdahIn = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].map(pid => {
        const p = PERGUNTAS_NEURO.find(x => x.id === pid);
        return {
          texto: p ? p.texto : pid,
          valorOriginal: d0[pid] === "C" ? "C" : ""
        };
      });
      const cTdahHi = ["p9", "p10", "p11", "p12", "p13", "p14", "p15"].map(pid => {
        const p = PERGUNTAS_NEURO.find(x => x.id === pid);
        return {
          texto: p ? p.texto : pid,
          valorOriginal: d0[pid] === "C" ? "C" : ""
        };
      });
      const cTeaA = ["p16", "p17", "p18"].map(pid => {
        const p = PERGUNTAS_NEURO.find(x => x.id === pid);
        return {
          texto: p ? p.texto : pid,
          valorOriginal: d0[pid] === "C" ? "C" : ""
        };
      });
      const cTeaB = ["p19", "p20", "p21", "p22"].map(pid => {
        const p = PERGUNTAS_NEURO.find(x => x.id === pid);
        return {
          texto: p ? p.texto : pid,
          valorOriginal: d0[pid] === "C" ? "C" : ""
        };
      });
      const cTod = ["p23", "p24", "p25", "p26", "p27", "p28"].map(pid => {
        const p = PERGUNTAS_NEURO.find(x => x.id === pid);
        return {
          texto: p ? p.texto : pid,
          valorOriginal: d0[pid] === "C" ? "C" : ""
        };
      });
      return /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "center",
          fontSize: 11,
          color: "#9ca3af",
          margin: "16px 0 4px",
          letterSpacing: 1
        }
      }, "── Reavaliação clínica ──"), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "TDAH — Inatenção",
        criterios: cTdahIn,
        ajustes: ajustesNeuro,
        historico: historicoNeuro,
        salvarAjuste: salvarNeuro,
        limparAjuste: limparNeuro,
        confirmacoes: CONF_TDAH_IN,
        salvando: salvandoNeuro,
        statusFn: crs => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n >= 5) return {
            atende: "diag",
            label: "✓ TDAH-In — ≥5 critérios"
          };
          if (n >= 3) return {
            atende: "prov",
            label: "⚠ Sugestivo — " + n + " critérios"
          };
          return {
            atende: false,
            label: "✗ Não atende (< 3)"
          };
        }
      }), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "TDAH — Hiperatividade/Impulsividade",
        criterios: cTdahHi,
        ajustes: ajustesNeuro,
        historico: historicoNeuro,
        salvarAjuste: (k, v) => salvarNeuro("hi_" + k, v),
        limparAjuste: k => limparNeuro("hi_" + k),
        confirmacoes: CONF_TDAH_HI,
        salvando: salvandoNeuro,
        statusFn: crs => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n >= 5) return {
            atende: "diag",
            label: "✓ TDAH-Hi — ≥5 critérios"
          };
          if (n >= 3) return {
            atende: "prov",
            label: "⚠ Sugestivo — " + n + " critérios"
          };
          return {
            atende: false,
            label: "✗ Não atende"
          };
        }
      }), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "TEA — Critério A (comunicação social)",
        criterios: cTeaA,
        ajustes: ajustesNeuro,
        historico: historicoNeuro,
        salvarAjuste: (k, v) => salvarNeuro("teaA_" + k, v),
        limparAjuste: k => limparNeuro("teaA_" + k),
        confirmacoes: CONF_TEA,
        salvando: salvandoNeuro,
        statusFn: (crs, confs) => {
          const n = crs.filter(c => c.atendeResolvido).length;
          // TEA Critério A: TODOS os 3 obrigatórios
          if (n === 3) return {
            atende: "diag",
            label: "✓ TEA Crit-A — todos obrigatórios"
          };
          if (n === 2) return {
            atende: "prov",
            label: "⚠ TEA Crit-A — 2/3"
          };
          return {
            atende: false,
            label: "✗ TEA Crit-A não atende"
          };
        }
      }), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "TEA — Critério B (comportamentos restritos)",
        criterios: cTeaB,
        ajustes: ajustesNeuro,
        historico: historicoNeuro,
        salvarAjuste: (k, v) => salvarNeuro("teaB_" + k, v),
        limparAjuste: k => limparNeuro("teaB_" + k),
        salvando: salvandoNeuro,
        statusFn: crs => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n >= 2) return {
            atende: "diag",
            label: "✓ TEA Crit-B — ≥2 critérios"
          };
          if (n === 1) return {
            atende: "prov",
            label: "⚠ TEA Crit-B — 1/4"
          };
          return {
            atende: false,
            label: "✗ TEA Crit-B não atende"
          };
        }
      }), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "TOD — Opositivo Desafiador",
        criterios: cTod,
        ajustes: ajustesNeuro,
        historico: historicoNeuro,
        salvarAjuste: (k, v) => salvarNeuro("tod_" + k, v),
        limparAjuste: k => limparNeuro("tod_" + k),
        confirmacoes: CONF_TOD,
        salvando: salvandoNeuro,
        statusFn: crs => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n >= 4) return {
            atende: "diag",
            label: "✓ TOD — ≥4 critérios"
          };
          if (n >= 3) return {
            atende: "prov",
            label: "⚠ TOD provável — " + n + " critérios"
          };
          return {
            atende: false,
            label: "✗ Não atende"
          };
        }
      }));
    })(), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 10
      }
    }, "Respondentes"), escoresPorDoc.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        border: "1px solid var(--gray-200)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        cursor: "pointer",
        background: selecionado === i ? "#f5f3ff" : "white"
      },
      onClick: () => setSelecionado(selecionado === i ? null : i)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, d.tipoRespondente === "paciente" ? "🙋 Próprio paciente" : "👨‍👩‍👧 " + (d.nomeRespondente || "Familiar") + " · " + (d.parentesco || "")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, d.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "Data não disponível")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        flexWrap: "wrap"
      }
    }, [{
      label: "In " + d.escores.tdahInC + "/8",
      cor: "#7c3aed",
      bg: "#ede9fe"
    }, {
      label: "Hi " + d.escores.tdahHiC + "/7",
      cor: "#dc2626",
      bg: "#fef2f2"
    }, {
      label: "TEA A " + d.escores.teaA_C + "/3",
      cor: "#2563eb",
      bg: "#eff6ff"
    }, {
      label: "TEA B " + d.escores.teaB_C + "/4",
      cor: "#6366f1",
      bg: "#eef2ff"
    }, {
      label: "TOD " + d.escores.todC + "/6",
      cor: "#d97706",
      bg: "#fffbeb"
    }].map((b, bi) => /*#__PURE__*/React.createElement("span", {
      key: bi,
      style: {
        background: b.bg,
        color: b.cor,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600
      }
    }, b.label)))), selecionado === i && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14,
        borderTop: "1px solid var(--gray-200)",
        paddingTop: 12
      }
    }, PERGUNTAS_NEURO.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        marginBottom: 8,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 22,
        height: 22,
        borderRadius: "50%",
        background: d[p.id] === "C" ? "#fef2f2" : d[p.id] === "B" ? "#fffbeb" : "#f0fdf4",
        color: d[p.id] === "C" ? "#dc2626" : d[p.id] === "B" ? "#d97706" : "#16a34a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 11
      }
    }, d[p.id] || "—"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--text-muted)",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: .5
      }
    }, p.eixo), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--text-dark)",
        lineHeight: 1.4
      }
    }, p.texto)))), d.obsFinais && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--gray-50)",
        border: "1px solid var(--gray-200)",
        borderRadius: 8,
        padding: 10,
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: .5,
        marginBottom: 4
      }
    }, "Observações"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-dark)",
        lineHeight: 1.6
      }
    }, d.obsFinais))))));
  })());
}

// ═══════════════════════════════════════════════════════════════════
//  MÓDULO: RASTREAMENTO ALIMENTAR — AbaRastreamentoAlimentar
//  Coleção: clinica_rastreamento_alimentar
// ═══════════════════════════════════════════════════════════════════

const PERGUNTAS_ALIMENTAR = [{
  id: "p1",
  eixo: "Anorexia",
  texto: "Restrição persistente / peso abaixo do esperado"
}, {
  id: "p2",
  eixo: "Anorexia",
  texto: "Medo intenso de engordar"
}, {
  id: "p3",
  eixo: "Anorexia",
  texto: "Distorção da imagem corporal"
}, {
  id: "p4",
  eixo: "Anorexia",
  texto: "Padrão de controle de peso (últimos 3 meses)"
}, {
  id: "p5",
  eixo: "Bulimia/TCA",
  texto: "Episódios de ingestão muito acima do normal"
}, {
  id: "p6",
  eixo: "Bulimia/TCA",
  texto: "Perda de controle durante os episódios"
}, {
  id: "p7",
  eixo: "Bulimia/TCA",
  texto: "Frequência dos episódios"
}, {
  id: "p8",
  eixo: "Bulimia/TCA",
  texto: "Uso de métodos compensatórios após ingestão excessiva"
}, {
  id: "p9",
  eixo: "TCA Puro",
  texto: "Padrão de ingestão rápida, secreta ou exagerada"
}, {
  id: "p10",
  eixo: "TCA Puro",
  texto: "Culpa intensa sem comportamentos compensatórios"
}];
function calcularEscoresAlimentar(doc) {
  const isC = id => doc[id] === "C";
  const isB = id => doc[id] === "B";
  return {
    anorexiaC: ["p1", "p2", "p3"].filter(isC).length,
    anorexiaB: ["p1", "p2", "p3"].filter(isB).length,
    bulimiaC: ["p5", "p6", "p7", "p8"].filter(isC).length,
    bulimiaB: ["p5", "p6", "p7", "p8"].filter(isB).length,
    tcaC: ["p5", "p6", "p7", "p9", "p10"].filter(isC).length,
    tcaB: ["p5", "p6", "p7", "p9", "p10"].filter(isB).length,
    arfid: isC("p1") && !isC("p2") && !isC("p3")
  };
}
function laudoAlimentar(escores, doc) {
  // Use o primeiro doc para ARFID e subtipo purgativo
  const isC = id => doc?.[id] === "C";
  const {
    anorexiaC,
    anorexiaB,
    bulimiaC,
    bulimiaB,
    tcaC,
    tcaB,
    arfid
  } = escores;
  let hipotese = [];
  let criterios = [];
  let atencao = [];

  // Anorexia: p1+p2+p3 todos C = diag; p1+p2 ou p1+p3 C = prov
  if (anorexiaC >= 3) {
    const subtipo = isC("p4") ? "Subtipo Compulsão/Purgativo" : "Subtipo Restritivo";
    hipotese.push("Anorexia Nervosa — " + subtipo);
    criterios.push({
      label: "Anorexia Nervosa (DSM-5 F50.0)",
      atende: "diag",
      obs: "Todos os três critérios nucleares preenchidos (C): restrição alimentar (p1), medo de engordar (p2) e distorção da imagem corporal (p3). Subtipo: " + subtipo + "."
    });
    atencao.push("Avaliar IMC atual e velocidade de perda de peso — risco clínico de desnutrição grave.");
    atencao.push("Solicitar exames laboratoriais urgentes: eletrólitos, hemograma, função cardíaca (ECG) e densidade óssea.");
    if (isC("p4")) atencao.push("Padrão purgativo confirmado — investigar lesões esofágicas, erosão dentária e hipocalemia.");
  } else if (anorexiaC === 2) {
    hipotese.push("Anorexia Nervosa (provável)");
    criterios.push({
      label: "Anorexia Nervosa (DSM-5 F50.0)",
      atende: "prov",
      obs: "Dois dos três critérios nucleares (C) preenchidos — investigar critério restante em avaliação presencial."
    });
    atencao.push("Confirmar em avaliação presencial: verificar critério faltante (restrição, medo de engordar ou distorção da imagem).");
  } else {
    criterios.push({
      label: "Anorexia Nervosa",
      atende: false,
      obs: "Menos de 2 critérios nucleares (C) — abaixo do limiar diagnóstico e de rastreamento."
    });
  }

  // Bulimia: p5+p6+p7+p8 todos C = diag; p5+p6+p7 C (sem p8) = prov
  if (bulimiaC >= 4) {
    hipotese.push("Bulimia Nervosa");
    criterios.push({
      label: "Bulimia Nervosa (DSM-5 F50.2)",
      atende: "diag",
      obs: "Todos os critérios confirmados (C): compulsão recorrente (p5), perda de controle (p6), frequência ≥1x/semana por 3 meses (p7) e comportamentos compensatórios (p8)."
    });
    atencao.push("Investigar desequilíbrio eletrolítico (hipocalemia, hiponatremia) — risco cardíaco.");
    atencao.push("Avaliar erosão dentária, calosas nos nós dos dedos (sinal de Russell) e lesões esofágicas.");
  } else if (bulimiaC >= 3 && !isC("p8")) {
    hipotese.push("Bulimia Nervosa (provável)");
    criterios.push({
      label: "Bulimia Nervosa (DSM-5 F50.2)",
      atende: "prov",
      obs: "Compulsão recorrente (p5/p6) e frequência (p7) confirmados — comportamentos compensatórios (p8) não marcados como critério pleno."
    });
    atencao.push("Investigar comportamentos compensatórios em avaliação presencial — podem estar presentes mas não revelados.");
  } else {
    if (hipotese.indexOf("Anorexia Nervosa — Subtipo Compulsão/Purgativo") < 0) criterios.push({
      label: "Bulimia Nervosa",
      atende: false,
      obs: "Critérios insuficientes (C) para o diagnóstico ou rastreamento positivo."
    });
  }

  // TCA (Compulsão Alimentar): p5+p6+p7+p9+p10 — 5C = diag; 3-4C = prov
  if (tcaC >= 5) {
    if (!hipotese.includes("Bulimia Nervosa") && !hipotese.includes("Bulimia Nervosa (provável)")) {
      hipotese.push("Transtorno de Compulsão Alimentar (TCA)");
      criterios.push({
        label: "TCA — Compulsão sem Purgação (DSM-5 F50.8)",
        atende: "diag",
        obs: "Todos os 5 critérios preenchidos (C): compulsão (p5), perda de controle (p6), frequência (p7), ingestão rápida/secreta (p9) e culpa sem compensação (p10)."
      });
      atencao.push("Avaliar sobrepeso/obesidade como consequência do TCA e impacto metabólico.");
      atencao.push("Rastrear depressão e ansiedade associadas — alta comorbidade com TCA.");
    }
  } else if (tcaC >= 3) {
    if (!hipotese.some(h => h.includes("Bulimia") || h.includes("TCA"))) {
      hipotese.push("Transtorno de Compulsão Alimentar (provável)");
      criterios.push({
        label: "TCA (DSM-5 F50.8)",
        atende: "prov",
        obs: tcaC + " de 5 critérios preenchidos (C) — abaixo do diagnóstico pleno mas acima do limiar de rastreamento."
      });
      atencao.push("Monitorar frequência dos episódios — se aumentar para ≥1x/semana por 3 meses, revisar diagnóstico.");
    }
  } else {
    if (!hipotese.some(h => h.includes("Bulimia") || h.includes("TCA"))) criterios.push({
      label: "TCA — Compulsão Alimentar",
      atende: false,
      obs: "Critérios insuficientes (C) para rastreamento positivo."
    });
  }

  // ARFID: restrição sem medo/distorção
  if (arfid && hipotese.length === 0) {
    hipotese.push("ARFID — investigar");
    criterios.push({
      label: "ARFID (DSM-5 F50.82)",
      atende: "prov",
      obs: "Restrição alimentar (p1=C) sem medo de engordar (p2≠C) nem distorção de imagem (p3≠C) — padrão compatível com ARFID. Investigar seletividade sensorial ou medo de engasgo."
    });
  }
  if (hipotese.length === 0) {
    hipotese.push("Sem hipótese diagnóstica definida pelos critérios — avaliação clínica aprofundada indicada.");
    criterios.push({
      label: "Transtornos Alimentares",
      atende: false,
      obs: "Critérios abaixo do limiar para todos os diagnósticos avaliados."
    });
  }
  return {
    hipotese: hipotese.join(" / "),
    criterios,
    atencao,
    anorexiaC,
    anorexiaB,
    bulimiaC,
    bulimiaB,
    tcaC,
    tcaB
  };
}
function AbaRastreamentoAlimentar({
  paciente
}) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const {
    ajustes: ajustesAlim,
    historico: historicoAlim,
    salvarAjuste: salvarAlim,
    limparAjuste: limparAlim,
    salvando: salvandoAlim
  } = useAjustesClinicos("clinica_rastreamento_alimentar", docs.length > 0 ? docs[0].id : null);
  useEffect(() => {
    if (!paciente?.nome) return;
    db.collection("clinica_rastreamento_alimentar").where("pacienteNome", "==", paciente.nome).get().then(snap => {
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDocs(lista);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente?.nome]);
  function copiarLink() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/alimentar/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    navigator.clipboard.writeText(url).then(() => alert("✓ Link copiado! " + url));
  }
  function enviarWhatsApp() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/alimentar/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    const msg = "Olá! 😊\n\nSua psicóloga Dra. Lucia Kratz preparou um questionário clínico para você preencher.\n\n🍎 *Questionário Clínico*\nResponda com calma e honestidade — leva cerca de 5 a 10 minutos.\n\n" + url + "\n\nQualquer dúvida, estou por aqui!\n_Dra. Lucia Kratz · CRP 09/20590_";
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }
  function gerarLaudoAlimentar() {
    if (docs.length === 0) {
      alert("Nenhuma resposta para gerar laudo.");
      return;
    }
    const pacNome = paciente.nome || "Paciente";
    const data = new Date().toLocaleDateString("pt-BR");
    const escoresPorDoc = docs.map(d => ({
      ...d,
      escores: calcularEscoresAlimentar(d)
    }));
    const n = docs.length;
    const media = {
      anorexiaC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.anorexiaC, 0) / n),
      anorexiaB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.anorexiaB, 0) / n),
      bulimiaC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.bulimiaC, 0) / n),
      bulimiaB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.bulimiaB, 0) / n),
      tcaC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.tcaC, 0) / n),
      tcaB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.tcaB, 0) / n),
      arfid: escoresPorDoc[0]?.escores?.arfid || false
    };
    const laudo = laudoAlimentar(media, docs[0]);
    const COR = {
      A: "#16a34a",
      B: "#d97706",
      C: "#dc2626"
    };
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Laudo Rastreamento Alimentar — ${pacNome}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.6}
h1{font-size:20px;color:#3d006a;margin-bottom:4px}
h2{font-size:14px;color:#7B00C4;margin:20px 0 8px;border-bottom:1px solid #ede9fe;padding-bottom:4px}
h3{font-size:12.5px;color:#374151;margin:12px 0 6px}
.header{border-bottom:2px solid #7B00C4;padding-bottom:16px;margin-bottom:20px}
.sub{font-size:12px;color:#6b7280;margin-top:2px}
.barra-bg{background:#f3f4f6;border-radius:20px;height:10px;overflow:hidden;margin-top:3px}
.hipotese{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:14px 18px;margin:12px 0}
.criterio{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:8px}
.badge-sim{background:#fef2f2;color:#dc2626;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.badge-nao{background:#f0fdf4;color:#16a34a;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.badge-inv{background:#fffbeb;color:#d97706;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.alerta{background:#fef2f2;border-left:3px solid #dc2626;padding:8px 12px;margin-bottom:6px;border-radius:0 6px 6px 0;font-size:12px}
.atencao-item{background:#fff7ed;border-left:3px solid #f97316;padding:8px 12px;margin-bottom:6px;border-radius:0 6px 6px 0;font-size:12px}
.resp-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11.5px}
.resp-table th{background:#f5f3ff;padding:6px 10px;text-align:left;font-size:10.5px;color:#7B00C4;border:1px solid #ede9fe}
.resp-table td{padding:6px 10px;border:1px solid #e5e7eb;vertical-align:top}
.resp-table tr:nth-child(even) td{background:#fafafa}
.rodape{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
.assinatura{text-align:center;margin-top:40px}
.assinatura img{height:60px;opacity:.9}
.assinatura p{font-size:12px;color:#374151;margin-top:6px}
@media print{body{padding:16px}.no-print{display:none}}
</style></head><body>
<div class="no-print" style="margin-bottom:20px">
  <button onclick="window.print()" style="background:#7B00C4;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px">Imprimir / Salvar PDF</button>
</div>
<div class="header">
  <h1>Laudo de Rastreamento — Hábitos Alimentares</h1>
  <div class="sub">Paciente: <strong>${pacNome}</strong> · Data: ${data} · Dra. Lucia Kratz · CRP 09/20590</div>
  <div class="sub">Respondentes: ${docs.length} (${docs.map(d => d.tipoRespondente === "paciente" ? "próprio paciente" : d.parentesco || "familiar").join(", ")})</div>
</div>

<h2>I. Critérios DSM-5 por Categoria</h2>
<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>Anorexia Nervosa</strong> (restrição, medo, distorção)</span><span style="color:#dc2626;font-weight:700">${laudo.anorexiaC} de 3 critérios</span></div><div class="barra-bg"><div style="width:${Math.round(laudo.anorexiaC / 3 * 100)}%;background:#dc2626;height:100%;border-radius:20px"></div></div></div>
<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>Bulimia Nervosa</strong> (compulsão + compensação)</span><span style="color:#7c3aed;font-weight:700">${laudo.bulimiaC} de 4 critérios</span></div><div class="barra-bg"><div style="width:${Math.round(laudo.bulimiaC / 4 * 100)}%;background:#7c3aed;height:100%;border-radius:20px"></div></div></div>
<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span><strong>TCA — Compulsão sem Purgação</strong></span><span style="color:#d97706;font-weight:700">${laudo.tcaC} de 5 critérios</span></div><div class="barra-bg"><div style="width:${Math.round(laudo.tcaC / 5 * 100)}%;background:#d97706;height:100%;border-radius:20px"></div></div></div>

<h2>II. Hipótese Diagnóstica</h2>
<div class="hipotese"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7B00C4;margin-bottom:4px">Hipótese principal</div><div style="font-size:15px;font-weight:700;color:#3d006a">${laudo.hipotese}</div></div>
${laudo.criterios.map(c => `<div class="criterio"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${c.label} &nbsp;<span class="${c.atende === "diag" ? "badge-sim" : c.atende === false ? "badge-nao" : "badge-inv"}">${c.atende === "diag" ? "✓ Diagnóstico" : c.atende === "prov" ? "⚠ Diagnóstico provável" : "✗ Não atende"}</span></div><div style="font-size:12px;color:#4b5563">${c.obs}</div></div>`).join("")}

<h2>III. Pontos de Atenção e Alertas Clínicos</h2>
${laudo.atencao.length === 0 ? "<p style='color:#6b7280;font-size:12px'>Nenhum alerta crítico identificado pelos escores.</p>" : laudo.atencao.map(a => `<div class="atencao-item">⚠ ${a}</div>`).join("")}

<h2>IV. Respostas por Respondente</h2>
${escoresPorDoc.map(d => `
<h3>${d.tipoRespondente === "paciente" ? "Próprio paciente" : "Familiar: " + (d.nomeRespondente || "") + " (" + (d.parentesco || "—") + ")"}</h3>
<table class="resp-table"><thead><tr><th>#</th><th>Item</th><th>Eixo</th><th>Resp.</th></tr></thead><tbody>
${PERGUNTAS_ALIMENTAR.map(p => `<tr><td>${p.id.replace("p", "")}</td><td>${p.texto}</td><td>${p.eixo}</td><td style="font-weight:700;color:${COR[d[p.id]] || "#6b7280"}">${d[p.id] || "—"}</td></tr>`).join("")}
${d.obsFinais ? `<tr><td colspan="2"><strong>Observações</strong></td><td colspan="2">${d.obsFinais}</td></tr>` : ""}
</tbody></table>`).join("")}

<div class="assinatura">
  <img src="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/Assinatura%20Lu%C3%ADcia%20Kratz.png" alt="Assinatura" onerror="this.style.display='none'"/>
  <p><strong>Dra. Lucia Kratz</strong><br/>Psicóloga · CRP 09/20590<br/>Doutora em Psicologia · TCC · Musicoterapia · Neuromodulação</p>
</div>
<div class="rodape">Documento gerado em ${data} · Uso exclusivo para fins clínicos · Confidencial · LGPD</div>
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }
  if (loading) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Spinner, null));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginBottom: 20,
      flexWrap: "wrap",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-dark)"
    }
  }, "Hábitos Alimentares"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, docs.length, " respondente", docs.length !== 1 ? "s" : "", " encontrado", docs.length !== 1 ? "s" : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: copiarLink
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px",
      color: "#16a34a",
      borderColor: "#16a34a"
    },
    onClick: enviarWhatsApp
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 13
  }), " WhatsApp"), docs.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: gerarLaudoAlimentar
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 13
  }), " Gerar Laudo PDF"))), docs.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 40,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 12
    }
  }, "🍎"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Nenhuma resposta ainda"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      marginBottom: 16
    }
  }, "Envie o link para o paciente e os familiares responderem."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: copiarLink
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 14
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: enviarWhatsApp
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 14
  }), " Enviar pelo WhatsApp"))), docs.length > 0 && (() => {
    const escoresPorDoc = docs.map(d => ({
      ...d,
      escores: calcularEscoresAlimentar(d)
    }));
    const n = docs.length;
    const media = {
      anorexiaC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.anorexiaC, 0) / n),
      anorexiaB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.anorexiaB, 0) / n),
      bulimiaC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.bulimiaC, 0) / n),
      bulimiaB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.bulimiaB, 0) / n),
      tcaC: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.tcaC, 0) / n),
      tcaB: Math.round(escoresPorDoc.reduce((s, d) => s + d.escores.tcaB, 0) / n),
      arfid: escoresPorDoc[0]?.escores?.arfid || false
    };
    const laudo = laudoAlimentar(media, docs[0]);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f5f3ff",
        border: "1px solid #c4b5fd",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: "var(--purple)",
        marginBottom: 4
      }
    }, "Hipótese diagnóstica"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "#3d006a",
        lineHeight: 1.4
      }
    }, laudo.hipotese)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--gray-50)",
        border: "1px solid var(--gray-200)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 12
      }
    }, "Critérios DSM-5 por categoria"), /*#__PURE__*/React.createElement(BarraEscore, {
      label: "Anorexia Nervosa (p1–p3)",
      valor: media.anorexiaC,
      max: 3,
      cor: "#dc2626"
    }), /*#__PURE__*/React.createElement(BarraEscore, {
      label: "Bulimia Nervosa (p5–p8)",
      valor: media.bulimiaC,
      max: 4,
      cor: "#7c3aed"
    }), /*#__PURE__*/React.createElement(BarraEscore, {
      label: "TCA — Compulsão (p5–p7,p9,p10)",
      valor: media.tcaC,
      max: 5,
      cor: "#d97706"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 10
      }
    }, "Análise DSM-5"), laudo.criterios.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        border: "1px solid var(--gray-200)",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, c.label), /*#__PURE__*/React.createElement(CorBadge, {
      atende: c.atende
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        lineHeight: 1.5
      }
    }, c.obs)))), laudo.atencao.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 8
      }
    }, "⚠ Pontos de atenção"), laudo.atencao.map((a, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: "#fff7ed",
        borderLeft: "3px solid #f97316",
        padding: "8px 12px",
        marginBottom: 6,
        borderRadius: "0 8px 8px 0",
        fontSize: 12,
        lineHeight: 1.5
      }
    }, a))), docs.length > 0 && (() => {
      const d0 = docs[0];
      const mkCriterio = pid => {
        const p = PERGUNTAS_ALIMENTAR.find(x => x.id === pid);
        return {
          texto: p ? p.texto : pid,
          valorOriginal: d0[pid] === "C" ? "C" : ""
        };
      };
      const cAnorexia = ["p1", "p2", "p3"].map(mkCriterio);
      const cBulimia = ["p5", "p6", "p7", "p8"].map(mkCriterio);
      const cTca = ["p5", "p6", "p7", "p9", "p10"].map(mkCriterio);
      const cArfid = ["p1"].map(mkCriterio); // ARFID: restrição sem medo de engordar nem distorção
      return /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "center",
          fontSize: 11,
          color: "#9ca3af",
          margin: "16px 0 4px",
          letterSpacing: 1
        }
      }, "── Reavaliação clínica ──"), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "Anorexia Nervosa",
        criterios: cAnorexia,
        ajustes: ajustesAlim,
        historico: historicoAlim,
        salvarAjuste: salvarAlim,
        limparAjuste: limparAlim,
        confirmacoes: CONF_ANOREXIA,
        salvando: salvandoAlim,
        statusFn: crs => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n === 3) return {
            atende: "diag",
            label: "✓ Anorexia Nervosa"
          };
          if (n === 2) return {
            atende: "prov",
            label: "⚠ Anorexia provável"
          };
          return {
            atende: false,
            label: "✗ Não atende"
          };
        }
      }), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "Bulimia Nervosa",
        criterios: cBulimia,
        ajustes: ajustesAlim,
        historico: historicoAlim,
        salvarAjuste: (k, v) => salvarAlim("bul_" + k, v),
        limparAjuste: k => limparAlim("bul_" + k),
        confirmacoes: CONF_BULIMIA,
        salvando: salvandoAlim,
        statusFn: crs => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n >= 3) return {
            atende: "diag",
            label: "✓ Bulimia Nervosa"
          };
          if (n === 2) return {
            atende: "prov",
            label: "⚠ Bulimia provável"
          };
          return {
            atende: false,
            label: "✗ Não atende"
          };
        }
      }), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "TCA — Transtorno da Compulsão Alimentar",
        criterios: cTca,
        ajustes: ajustesAlim,
        historico: historicoAlim,
        salvarAjuste: (k, v) => salvarAlim("tca_" + k, v),
        limparAjuste: k => limparAlim("tca_" + k),
        confirmacoes: CONF_TCA,
        salvando: salvandoAlim,
        statusFn: crs => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n >= 4) return {
            atende: "diag",
            label: "✓ TCA"
          };
          if (n === 3) return {
            atende: "prov",
            label: "⚠ TCA provável"
          };
          return {
            atende: false,
            label: "✗ Não atende"
          };
        }
      }), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "ARFID — Transtorno Alimentar Restritivo/Evitativo",
        criterios: cArfid,
        ajustes: ajustesAlim,
        historico: historicoAlim,
        salvarAjuste: (k, v) => salvarAlim("arfid_" + k, v),
        limparAjuste: k => limparAlim("arfid_" + k),
        confirmacoes: CONF_ARFID,
        salvando: salvandoAlim,
        statusFn: crs => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n === 1) return {
            atende: "prov",
            label: "⚠ Investigar ARFID"
          };
          return {
            atende: false,
            label: "✗ Sem indicação de ARFID"
          };
        }
      }));
    })(), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 10
      }
    }, "Respondentes"), escoresPorDoc.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        border: "1px solid var(--gray-200)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        cursor: "pointer",
        background: selecionado === i ? "#f5f3ff" : "white"
      },
      onClick: () => setSelecionado(selecionado === i ? null : i)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, d.tipoRespondente === "paciente" ? "🙋 Próprio paciente" : "👨‍👩‍👧 " + (d.nomeRespondente || "Familiar") + " · " + (d.parentesco || "")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, d.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || "Data não disponível")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        flexWrap: "wrap"
      }
    }, [{
      label: "AN " + d.escores.anorexiaC + "/3",
      cor: "#dc2626",
      bg: "#fef2f2"
    }, {
      label: "BN " + d.escores.bulimiaC + "/4",
      cor: "#7c3aed",
      bg: "#ede9fe"
    }, {
      label: "TCA " + d.escores.tcaC + "/5",
      cor: "#d97706",
      bg: "#fffbeb"
    }].map((b, bi) => /*#__PURE__*/React.createElement("span", {
      key: bi,
      style: {
        background: b.bg,
        color: b.cor,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600
      }
    }, b.label)))), selecionado === i && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14,
        borderTop: "1px solid var(--gray-200)",
        paddingTop: 12
      }
    }, PERGUNTAS_ALIMENTAR.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        marginBottom: 8,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 22,
        height: 22,
        borderRadius: "50%",
        background: d[p.id] === "C" ? "#fef2f2" : d[p.id] === "B" ? "#fffbeb" : "#f0fdf4",
        color: d[p.id] === "C" ? "#dc2626" : d[p.id] === "B" ? "#d97706" : "#16a34a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 11
      }
    }, d[p.id] || "—"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--text-muted)",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: .5
      }
    }, p.eixo), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--text-dark)",
        lineHeight: 1.4
      }
    }, p.texto)))), d.obsFinais && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--gray-50)",
        border: "1px solid var(--gray-200)",
        borderRadius: 8,
        padding: 10,
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: .5,
        marginBottom: 4
      }
    }, "Observações"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-dark)",
        lineHeight: 1.6
      }
    }, d.obsFinais))))));
  })());
}

// ═══════════════════════════════════════════════════════════════════
//  MÓDULO: RASTREAMENTO SEXUAL — AbaRastreamentoSexual
//  Coleção: clinica_rastreamento_sexual
// ═══════════════════════════════════════════════════════════════════

const PERGUNTAS_SEXUAL = [{
  id: "p1",
  eixo: "Desejo",
  texto: "Ausência ou redução persistente de desejo sexual (≥6m)"
}, {
  id: "p2",
  eixo: "Desejo",
  texto: "Repulsa ou aversão ativa ao contato sexual"
}, {
  id: "p3",
  eixo: "Excitação",
  texto: "Dificuldade na resposta física de excitação"
}, {
  id: "p4",
  eixo: "Orgasmo",
  texto: "Atraso ou ausência de orgasmo"
}, {
  id: "p5",
  eixo: "Ejaculação",
  texto: "Ejaculação precoce / involuntária (homens)"
}, {
  id: "p6",
  eixo: "Ejaculação",
  texto: "Atraso ou ausência de ejaculação (homens)"
}, {
  id: "p7",
  eixo: "Dor",
  texto: "Dor genital ou pélvica durante penetração"
}, {
  id: "p8",
  eixo: "Dor",
  texto: "Contração involuntária e medo da penetração (mulheres)"
}, {
  id: "p9",
  eixo: "Contexto",
  texto: "Persistência ≥6 meses com sofrimento clínico"
}, {
  id: "p10",
  eixo: "Contexto",
  texto: "Generalizado vs. situacional"
}, {
  id: "p11",
  eixo: "Contexto",
  texto: "Fator etiológico associado"
}];
function calcularEscoresSexual(doc) {
  const p = id => ({
    A: 0,
    B: 1,
    C: 2
  })[doc[id]] || 0;
  return {
    desejo: p("p1") + p("p2"),
    excitacao: p("p3"),
    orgasmo: p("p4"),
    ejaculacao: p("p5") + p("p6"),
    dor: p("p7") + p("p8"),
    criterio: p("p9")
  };
}
function laudoSexual(doc) {
  const p = id => doc[id] || "A";
  let hipotese = [];
  let criterios = [];
  let atencao = [];
  const temCriterio = p("p9") === "C";
  const generalizado = p("p10") === "C";
  const etiologia = p("p11");
  const atendeVal = temCriterio ? "diag" : "prov";
  if (p("p1") === "C") {
    hipotese.push("Transtorno do Desejo Sexual Hipoativo");
    criterios.push({
      label: "Desejo Sexual Hipoativo (DSM-5 F52.0)",
      atende: atendeVal,
      obs: "Ausência crônica de desejo por ≥6 meses com sofrimento clínico. " + (generalizado ? "Caráter generalizado." : "Caráter situacional — avaliar fatores relacionais.")
    });
    atencao.push("Investigar queda hormonal (testosterona/estrogênio), uso de antidepressivos ISRS e conflitos relacionais.");
  }
  if (p("p2") === "C") {
    hipotese.push("Aversão Sexual");
    criterios.push({
      label: "Aversão Sexual",
      atende: atendeVal,
      obs: "Evitação fóbica ativa de contato sexual. Avaliar histórico de trauma ou abuso sexual."
    });
    atencao.push("Rastrear histórico de trauma sexual — alta prevalência de TEPT associado à aversão sexual.");
  }
  if (p("p3") === "C") {
    hipotese.push("Transtorno de Excitação");
    criterios.push({
      label: "Transtorno de Excitação (DSM-5 F52.22/F52.21)",
      atende: atendeVal,
      obs: "Disfunção erétil ou déficit de lubrificação crônico. " + (etiologia === "B" ? "Possível efeito iatrogênico de medicação." : etiologia === "A" ? "Investigar causa orgânica vascular/neurológica." : "Fator psicogênico predominante.")
    });
    if (etiologia === "A") atencao.push("Encaminhar para urologia/ginecologia — possível causa orgânica vascular ou hormonal.");
    if (etiologia === "B") atencao.push("Revisar medicações em uso — ISRS, antihipertensivos e anticoncepcionais são causas iatrogênicas frequentes.");
  }
  if (p("p4") === "C") {
    hipotese.push("Transtorno do Orgasmo / Anorgasmia");
    criterios.push({
      label: "Anorgasmia (DSM-5 F52.31/F52.32)",
      atende: atendeVal,
      obs: "Ausência ou grande dificuldade persistente de atingir o orgasmo. Avaliar se é primária (nunca teve) ou secundária (perdeu após período funcional)."
    });
    atencao.push("Diferenciar anorgasmia primária (nunca vivenciou orgasmo) de secundária (perdeu após período funcional).");
  }
  if (p("p5") === "C") {
    hipotese.push("Ejaculação Precoce");
    criterios.push({
      label: "Ejaculação Precoce (DSM-5 F52.4)",
      atende: atendeVal,
      obs: "Padrão persistente de ejaculação involuntária. " + (generalizado ? "Caráter generalizado — não situacional." : "Caráter situacional.")
    });
    atencao.push("Avaliar ansiedade de desempenho como fator primário — técnica de start-stop e terapia sexual indicadas.");
  }
  if (p("p6") === "C") {
    hipotese.push("Ejaculação Retardada");
    criterios.push({
      label: "Ejaculação Retardada (DSM-5 F52.32)",
      atende: atendeVal,
      obs: "Atraso extremo ou incapacidade de ejacular intravaginal. Investigar uso de antidepressivos e fatores psicogênicos."
    });
    atencao.push("Ejaculação retardada tem alta correlação com uso de ISRS — avaliar ajuste medicamentoso com psiquiatra.");
  }
  if (p("p7") === "C") {
    hipotese.push("Dispareunia / Dor Gênito-Pélvica");
    criterios.push({
      label: "Transtorno de Dor Gênito-Pélvica/Penetração (DSM-5 F52.6)",
      atende: atendeVal,
      obs: "Dor genital/pélvica recorrente. Diferencial com endometriose, vulvodínia e vaginismo deve ser feito em consulta ginecológica."
    });
    atencao.push("Encaminhar para ginecologia — descartar endometriose, vulvodínia e outras causas orgânicas de dispareunia.");
  }
  if (p("p8") === "C") {
    if (!hipotese.includes("Dispareunia / Dor Gênito-Pélvica")) hipotese.push("Vaginismo");
    criterios.push({
      label: "Vaginismo (DSM-5 F52.6)",
      atende: atendeVal,
      obs: "Espasmo involuntário da musculatura pélvica com medo fóbico da penetração. Alta resposta à terapia sexual com fisioterapia pélvica."
    });
    atencao.push("Vaginismo tem excelente prognóstico com fisioterapia pélvica + terapia sexual — encaminhar para especialistas.");
    atencao.push("Rastrear histórico de trauma sexual — fator etiológico frequente no vaginismo.");
  }
  if (hipotese.length === 0) {
    hipotese.push("Sem hipótese diagnóstica definida pelos escores — avaliação clínica aprofundada indicada.");
    criterios.push({
      label: "Disfunções Sexuais DSM-5",
      atende: false,
      obs: "Escores abaixo do limiar para todos os diagnósticos avaliados."
    });
  }

  // Etiologia
  const etioLabel = etiologia === "A" ? "Orgânica/Médica" : etiologia === "B" ? "Iatrogênica (medicação)" : "Psicogênica/Relacional";
  const etioObs = etiologia === "A" ? "Investigação médica especializada indicada (urologia, ginecologia, endocrinologia)." : etiologia === "B" ? "Revisar medicações — especialmente ISRS, antihipertensivos e anticoncepcionais. Discutir com médico prescritor." : "Terapia sexual, psicoterapia cognitivo-comportamental e trabalho com crenças disfuncionais indicados.";
  return {
    hipotese: hipotese.join(" + "),
    criterios,
    atencao,
    etioLabel,
    etioObs,
    temCriterio,
    generalizado
  };
}
function AbaRastreamentoSexual({
  paciente
}) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const {
    ajustes: ajustesSex,
    historico: historicoSex,
    salvarAjuste: salvarSex,
    limparAjuste: limparSex,
    salvando: salvandoSex
  } = useAjustesClinicos("clinica_rastreamento_sexual", docs.length > 0 ? docs[0].id : null);
  useEffect(() => {
    if (!paciente?.nome) return;
    db.collection("clinica_rastreamento_sexual").where("pacienteNome", "==", paciente.nome).get().then(snap => {
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDocs(lista);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente?.nome]);
  function copiarLink() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/sexual/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    navigator.clipboard.writeText(url).then(() => alert("✓ Link copiado! " + url));
  }
  function enviarWhatsApp() {
    const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/rastreamento/sexual/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    const msg = "Olá! 😊\n\nSua psicóloga Dra. Lucia Kratz preparou um questionário clínico confidencial para você preencher.\n\n*Questionário Clínico*\nResponda com calma e honestidade — suas respostas são lidas apenas pela Dra. Lucia Kratz.\n\n" + url + "\n\nQualquer dúvida, estou por aqui!\n_Dra. Lucia Kratz · CRP 09/20590_";
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }
  function gerarLaudoSexual() {
    if (docs.length === 0) {
      alert("Nenhuma resposta para gerar laudo.");
      return;
    }
    const pacNome = paciente.nome || "Paciente";
    const data = new Date().toLocaleDateString("pt-BR");
    const doc = docs[0];
    const laudo = laudoSexual(doc);
    const COR = {
      A: "#16a34a",
      B: "#d97706",
      C: "#dc2626"
    };
    const htmlLaudo = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Laudo Saude Sexual — ${pacNome}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.6}
h1{font-size:20px;color:#3d006a;margin-bottom:4px}
h2{font-size:14px;color:#7B00C4;margin:20px 0 8px;border-bottom:1px solid #ede9fe;padding-bottom:4px}
h3{font-size:12.5px;color:#374151;margin:12px 0 6px}
.header{border-bottom:2px solid #7B00C4;padding-bottom:16px;margin-bottom:20px}
.sub{font-size:12px;color:#6b7280;margin-top:2px}
.hipotese{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:10px;padding:14px 18px;margin:12px 0}
.criterio{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:8px}
.badge-sim{background:#fef2f2;color:#dc2626;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.badge-nao{background:#f0fdf4;color:#16a34a;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700}
.atencao-item{background:#fff7ed;border-left:3px solid #f97316;padding:8px 12px;margin-bottom:6px;border-radius:0 6px 6px 0;font-size:12px}
.etio{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin:12px 0}
.resp-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11.5px}
.resp-table th{background:#f5f3ff;padding:6px 10px;text-align:left;font-size:10.5px;color:#7B00C4;border:1px solid #ede9fe}
.resp-table td{padding:6px 10px;border:1px solid #e5e7eb;vertical-align:top}
.resp-table tr:nth-child(even) td{background:#fafafa}
.confidencial{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;font-size:11px;color:#065f46;margin-bottom:16px}
.rodape{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
.assinatura{text-align:center;margin-top:40px}
.assinatura img{height:60px;opacity:.9}
.assinatura p{font-size:12px;color:#374151;margin-top:6px}
@media print{body{padding:16px}.no-print{display:none}}
</style></head><body>
<div class="no-print" style="margin-bottom:20px">
  <button onclick="window.print()" style="background:#7B00C4;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px">Imprimir / Salvar PDF</button>
</div>
<div class="confidencial">Documento de uso exclusivo e confidencial — acesso restrito à Dra. Lucia Kratz · CRP 09/20590</div>
<div class="header">
  <h1>Laudo de Rastreamento — Saúde Sexual</h1>
  <div class="sub">Paciente: <strong>${pacNome}</strong> · Data: ${data} · Dra. Lucia Kratz · CRP 09/20590</div>
  <div class="sub">Critério temporal ≥6 meses: ${laudo.temCriterio ? "✓ Confirmado" : "⚠ A verificar"} · Caráter: ${laudo.generalizado ? "Generalizado" : "Situacional/A definir"}</div>
</div>

<h2>I. Perfil Diagnóstico por Categoria DSM-5</h2>
<div class="hipotese"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7B00C4;margin-bottom:4px">Hipótese principal</div><div style="font-size:15px;font-weight:700;color:#3d006a">${laudo.hipotese}</div></div>
${laudo.criterios.map(c => `<div class="criterio"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${c.label} &nbsp;<span class="${c.atende === "diag" ? "badge-sim" : c.atende === false ? "badge-nao" : "badge-inv"}">${c.atende === "diag" ? "✓ Diagnóstico" : c.atende === "prov" ? "⚠ Diagnóstico provável" : "✗ Não atende"}</span></div><div style="font-size:12px;color:#4b5563">${c.obs}</div></div>`).join("")}

<h2>II. Análise Etiológica Diferencial</h2>
<div class="etio"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#2563eb;margin-bottom:4px">Etiologia predominante indicada</div><div style="font-size:14px;font-weight:700;color:#1e40af;margin-bottom:6px">${laudo.etioLabel}</div><div style="font-size:12px;color:#374151">${laudo.etioObs}</div></div>

<h2>III. Pontos de Atenção para a Anamnese Presencial</h2>
${laudo.atencao.length === 0 ? "<p style='color:#6b7280;font-size:12px'>Nenhum ponto crítico identificado.</p>" : laudo.atencao.map(a => `<div class="atencao-item">⚠ ${a}</div>`).join("")}

<h2>IV. Respostas do Paciente</h2>
<table class="resp-table"><thead><tr><th>#</th><th>Item</th><th>Eixo</th><th>Resp.</th></tr></thead><tbody>
${PERGUNTAS_SEXUAL.map(p => `<tr><td>${p.id.replace("p", "")}</td><td>${p.texto}</td><td>${p.eixo}</td><td style="font-weight:700;color:${COR[doc[p.id]] || "#6b7280"}">${doc[p.id] || "—"}</td></tr>`).join("")}
</tbody></table>

<div class="assinatura">
  <img src="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/Assinatura%20Lu%C3%ADcia%20Kratz.png" alt="Assinatura" onerror="this.style.display='none'"/>
  <p><strong>Dra. Lucia Kratz</strong><br/>Psicóloga · CRP 09/20590<br/>Doutora em Psicologia · TCC · Musicoterapia · Neuromodulação</p>
</div>
<div class="rodape">Documento gerado em ${data} · Uso exclusivo para fins clínicos · Confidencial · LGPD</div>
</body></html>`;
    const w = window.open("", "_blank");
    w.document.write(htmlLaudo);
    w.document.close();
  }
  if (loading) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 40,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Spinner, null));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      marginBottom: 16,
      flexWrap: "wrap",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text-dark)"
    }
  }, "Saúde Sexual"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, docs.length, " resposta", docs.length !== 1 ? "s" : "", " encontrada", docs.length !== 1 ? "s" : "", " · Confidencial")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: copiarLink
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      padding: "7px 14px",
      color: "#16a34a",
      borderColor: "#16a34a"
    },
    onClick: enviarWhatsApp
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 13
  }), " WhatsApp"), docs.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 12,
      padding: "7px 14px"
    },
    onClick: gerarLaudoSexual
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-text",
    size: 13
  }), " Gerar Laudo PDF"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #86efac",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 12,
      color: "#065f46",
      marginBottom: 16
    }
  }, "🔒 Este questionário é respondido apenas pelo próprio paciente. Nenhum familiar tem acesso."), docs.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 40,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 12
    }
  }, "🌸"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Nenhuma resposta ainda"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      marginBottom: 16
    }
  }, "Envie o link diretamente para o paciente."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: copiarLink
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 14
  }), " Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: enviarWhatsApp
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 14
  }), " Enviar pelo WhatsApp"))), docs.length > 0 && (() => {
    const doc = docs[0];
    const laudo = laudoSexual(doc);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f5f3ff",
        border: "1px solid #c4b5fd",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: "var(--purple)",
        marginBottom: 4
      }
    }, "Hipótese diagnóstica"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 700,
        color: "#3d006a",
        lineHeight: 1.4
      }
    }, laudo.hipotese)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1,
        color: "#2563eb",
        marginBottom: 4
      }
    }, "Etiologia predominante"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 13,
        color: "#1e40af",
        marginBottom: 4
      }
    }, laudo.etioLabel), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#374151"
      }
    }, laudo.etioObs)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 10
      }
    }, "Análise DSM-5"), laudo.criterios.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        border: "1px solid var(--gray-200)",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, c.label), /*#__PURE__*/React.createElement(CorBadge, {
      atende: c.atende
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        lineHeight: 1.5
      }
    }, c.obs)))), laudo.atencao.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 8
      }
    }, "⚠ Pontos de atenção"), laudo.atencao.map((a, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: "#fff7ed",
        borderLeft: "3px solid #f97316",
        padding: "8px 12px",
        marginBottom: 6,
        borderRadius: "0 8px 8px 0",
        fontSize: 12,
        lineHeight: 1.5
      }
    }, a))), (() => {
      const criteriosSex = PERGUNTAS_SEXUAL.filter(p => ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].includes(p.id)).map(p => ({
        texto: p.texto,
        valorOriginal: doc[p.id] === "C" ? "C" : ""
      }));
      return /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 16
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "center",
          fontSize: 11,
          color: "#9ca3af",
          margin: "16px 0 4px",
          letterSpacing: 1
        }
      }, "── Reavaliação clínica ──"), /*#__PURE__*/React.createElement(ListaCriteriosDSM5, {
        titulo: "Disfunções Sexuais DSM-5",
        criterios: criteriosSex,
        ajustes: ajustesSex,
        historico: historicoSex,
        salvarAjuste: salvarSex,
        limparAjuste: limparSex,
        confirmacoes: CONF_SEXUAL,
        salvando: salvandoSex,
        statusFn: crs => {
          const n = crs.filter(c => c.atendeResolvido).length;
          if (n >= 2) return {
            atende: "diag",
            label: "✓ Disfunção Sexual — critérios presentes"
          };
          if (n === 1) return {
            atende: "prov",
            label: "⚠ Investigar — 1 critério"
          };
          return {
            atende: false,
            label: "✗ Não atende"
          };
        }
      }));
    })(), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: 10
      }
    }, "Respostas — ", doc.createdAt?.toDate?.()?.toLocaleDateString("pt-BR") || ""), /*#__PURE__*/React.createElement("div", {
      style: {
        border: "1px solid var(--gray-200)",
        borderRadius: 12,
        padding: 14,
        cursor: "pointer",
        background: selecionado === 0 ? "#f5f3ff" : "white"
      },
      onClick: () => setSelecionado(selecionado === 0 ? null : 0)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        marginBottom: selecionado === 0 ? 12 : 0
      }
    }, "🌸 Próprio paciente — clique para expandir"), selecionado === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: "1px solid var(--gray-200)",
        paddingTop: 12
      }
    }, PERGUNTAS_SEXUAL.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        marginBottom: 8,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 22,
        height: 22,
        borderRadius: "50%",
        background: doc[p.id] === "C" ? "#fef2f2" : doc[p.id] === "B" ? "#fffbeb" : "#f0fdf4",
        color: doc[p.id] === "C" ? "#dc2626" : doc[p.id] === "B" ? "#d97706" : "#16a34a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 11
      }
    }, doc[p.id] || "—"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--text-muted)",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: .5
      }
    }, p.eixo), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "var(--text-dark)",
        lineHeight: 1.4
      }
    }, p.texto)))))), docs.length > 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginTop: 12,
        textAlign: "center"
      }
    }, docs.length, " respostas registradas — exibindo a mais recente. Gere o laudo PDF para ver todas."));
  })());
}

//  MÓDULO 2: LINKS COMPARTILHÁVEIS — AbaLinksPartilhados
//  Coleção: clinica_links_partilhados
//  Inserir: antes da função PerfilPaciente em admin/app.js
// ═══════════════════════════════════════════════════════════════════

// Ferramentas disponíveis para link compartilhável
const FERRAMENTAS_LINK = [{
  id: "anamnese",
  nome: "Anamnese — Marcos do Desenvolvimento",
  emoji: "📋",
  desc: "Formulário completo de anamnese"
}, {
  id: "entrevista",
  nome: "Entrevista Clínica Inicial (DSM-5)",
  emoji: "🧠",
  desc: "Instrumento de avaliação clínica inicial"
}, {
  id: "rastreamento",
  nome: "Rastreamento Bipolar / Borderline",
  emoji: "📊",
  desc: "Avaliação diferencial DSM-5 — paciente e familiares"
}, {
  id: "neuro",
  nome: "Rastreamento Comportamental",
  emoji: "🧩",
  desc: "Avaliação de funcionamento e comportamento"
}, {
  id: "alimentar",
  nome: "Hábitos Alimentares",
  emoji: "🍎",
  desc: "Rastreamento de padrões alimentares"
}, {
  id: "sexual",
  nome: "Saúde Sexual",
  emoji: "🌸",
  desc: "Rastreamento confidencial de saúde sexual"
}, {
  id: "dependencia",
  nome: "Dependência Química e Substâncias",
  emoji: "💊",
  desc: "11 critérios DSM-5 — paciente e familiares"
}, {
  id: "jogos",
  nome: "Dependência de Jogos e Apostas",
  emoji: "🎮",
  desc: "Gaming / Gambling Disorder — DSM-5/CID-11"
}];
function gerarToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 10).toUpperCase();
}
function AbaLinksPartilhados({
  paciente
}) {
  const BASE_URL = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";
  const [links, setLinks] = useState({}); // { ferramentaId: { token, status, createdAt, docId } }
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState({}); // { ferramentaId: true }
  const [copiado, setCopiado] = useState({}); // { token: true }

  // Carregar links existentes
  useEffect(() => {
    db.collection("clinica_links_partilhados").where("pacienteId", "==", paciente.id).get().then(snap => {
      const mapa = {};
      snap.docs.forEach(d => {
        const data = d.data();
        // Manter o mais recente por ferramenta
        if (!mapa[data.tipoFerramenta] || (data.createdAt?.seconds || 0) > (mapa[data.tipoFerramenta]?.createdAt?.seconds || 0)) {
          mapa[data.tipoFerramenta] = {
            docId: d.id,
            ...data
          };
        }
      });
      setLinks(mapa);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [paciente.id]);
  async function gerarLink(ferramenta) {
    setGerando(g => ({
      ...g,
      [ferramenta.id]: true
    }));
    const token = gerarToken();
    const doc = {
      token,
      pacienteId: paciente.id,
      pacienteNome: paciente.nome || "",
      tipoFerramenta: ferramenta.id,
      nomeFerramenta: ferramenta.nome,
      status: "pendente",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      // Desativar link anterior se existir
      if (links[ferramenta.id]?.docId) {
        await db.collection("clinica_links_partilhados").doc(links[ferramenta.id].docId).update({
          status: "substituido"
        });
      }
      const ref = await db.collection("clinica_links_partilhados").add(doc);
      setLinks(l => ({
        ...l,
        [ferramenta.id]: {
          docId: ref.id,
          token,
          status: "pendente",
          createdAt: {
            seconds: Date.now() / 1000
          },
          tipoFerramenta: ferramenta.id
        }
      }));
    } catch (e) {
      alert("Erro ao gerar link: " + e.message);
    }
    setGerando(g => ({
      ...g,
      [ferramenta.id]: false
    }));
  }
  function getLinkUrl(ferramenta, token) {
    if (ferramenta.id === "rastreamento") {
      return `${BASE_URL}/rastreamento/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    }
    if (ferramenta.id === "neuro") {
      return `${BASE_URL}/rastreamento/neuro/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    }
    if (ferramenta.id === "alimentar") {
      return `${BASE_URL}/rastreamento/alimentar/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    }
    if (ferramenta.id === "sexual") {
      return `${BASE_URL}/rastreamento/sexual/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    }
    if (ferramenta.id === "dependencia") {
      return `${BASE_URL}/rastreamento/dependencia/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    }
    if (ferramenta.id === "jogos") {
      return `${BASE_URL}/rastreamento/jogos/?paciente=${encodeURIComponent(paciente.nome || "")}`;
    }
    return `${BASE_URL}/responder?token=${token}`;
  }
  function copiarLink(token, ferramenta) {
    const url = getLinkUrl(ferramenta, token);
    navigator.clipboard.writeText(url);
    setCopiado(c => ({
      ...c,
      [token]: true
    }));
    setTimeout(() => setCopiado(c => ({
      ...c,
      [token]: false
    })), 2000);
  }
  function enviarWhatsApp(ferramenta, token) {
    const url = getLinkUrl(ferramenta, token);
    const nome = paciente.nome?.split(" ")[0] || "paciente";
    const isRastreio = ferramenta.id === "rastreamento" || ferramenta.id === "neuro" || ferramenta.id === "alimentar" || ferramenta.id === "sexual";
    const nomeForm = isRastreio ? "Questionário Clínico" : ferramenta.nome;
    const saudacao = isRastreio ? "Olá! 😊" : `Olá, ${nome}! 😊`;
    const msg = `${saudacao}\n\nSua psicóloga Dra. Lucia Kratz preparou um formulário para você preencher:\n\n📋 *${nomeForm}*\n\nAcesse pelo link abaixo e responda com calma — suas respostas vão direto para o prontuário:\n${url}\n\nQualquer dúvida, estou por aqui!\n_Dra. Lucia Kratz · CRP 09/20590_`;
    window.open(`https://api.whatsapp.com/send?phone=55${(paciente.telefone || "").replace(/\D/g, "")}&text=${encodeURIComponent(msg)}`, "_blank");
  }
  const fmtDataHora = seconds => {
    if (!seconds) return "—";
    return new Date(seconds * 1000).toLocaleDateString("pt-BR");
  };
  const STATUS_CONFIG = {
    pendente: {
      label: "Pendente",
      cor: "#d97706",
      bg: "#fef3c7",
      icon: "clock"
    },
    respondido: {
      label: "Respondido",
      cor: "#059669",
      bg: "#d1fae5",
      icon: "check-circle"
    },
    substituido: {
      label: "Substituído",
      cor: "#6b7280",
      bg: "#f3f4f6",
      icon: "refresh-cw"
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 18,
    style: {
      color: "var(--purple)"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15
    }
  }, "Links Compartilháveis"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Envie ferramentas clínicas diretamente para ", paciente.nome?.split(" ")[0] || "o paciente", " responder pelo celular"))), loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 24,
      color: "var(--text-muted)"
    }
  }, "Carregando...") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, FERRAMENTAS_LINK.map(ferramenta => {
    const linkAtual = links[ferramenta.id];
    const statusCfg = STATUS_CONFIG[linkAtual?.status] || null;
    const url = linkAtual ? getLinkUrl(ferramenta, linkAtual.token) : null;
    return /*#__PURE__*/React.createElement("div", {
      key: ferramenta.id,
      style: {
        border: "1.5px solid",
        borderColor: linkAtual ? "var(--purple)" : "var(--gray-200)",
        borderRadius: 12,
        padding: "14px 16px",
        background: linkAtual ? "var(--purple-soft)" : "white",
        transition: "all .2s"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: linkAtual ? 12 : 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        flexShrink: 0
      }
    }, ferramenta.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, ferramenta.nome), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)"
      }
    }, ferramenta.desc)), statusCfg && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        background: statusCfg.bg,
        color: statusCfg.cor,
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: statusCfg.icon,
      size: 11
    }), statusCfg.label, linkAtual?.status === "respondido" && linkAtual?.respondidoEm && /*#__PURE__*/React.createElement("span", null, " em ", fmtDataHora(linkAtual.respondidoEm?.seconds))), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-outline",
      style: {
        padding: "6px 12px",
        fontSize: 12,
        flexShrink: 0
      },
      onClick: () => gerarLink(ferramenta),
      disabled: gerando[ferramenta.id]
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "link",
      size: 13
    }), gerando[ferramenta.id] ? "Gerando..." : linkAtual ? "Novo Link" : "Gerar Link")), linkAtual && linkAtual.status !== "substituido" && url && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "white",
        border: "1px solid var(--gray-200)",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "link",
      size: 13,
      style: {
        color: "var(--text-muted)",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, url)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-outline",
      style: {
        padding: "7px 14px",
        fontSize: 12
      },
      onClick: () => copiarLink(linkAtual.token, ferramenta)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: copiado[linkAtual.token] ? "check" : "copy",
      size: 13
    }), copiado[linkAtual.token] ? "Copiado!" : "Copiar Link"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      style: {
        padding: "7px 14px",
        fontSize: 12
      },
      onClick: () => enviarWhatsApp(ferramenta, linkAtual.token)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "message-circle",
      size: 13
    }), " Enviar pelo WhatsApp"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color: "var(--text-muted)",
        marginLeft: "auto"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 11
    }), "Gerado em ", fmtDataHora(linkAtual.createdAt?.seconds)))));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: "10px 14px",
      background: "#eff6ff",
      borderRadius: 8,
      fontSize: 11,
      color: "#1e40af",
      lineHeight: 1.6
    }
  }, "💡 ", /*#__PURE__*/React.createElement("strong", null, "Como funciona:"), " O paciente recebe o link, acessa a ferramenta no celular, preenche e envia. As respostas entram automaticamente no prontuário e o status muda para ", /*#__PURE__*/React.createElement("strong", null, "Respondido"), ". O link expira após ser respondido ou quando um novo link é gerado para a mesma ferramenta."));
}
