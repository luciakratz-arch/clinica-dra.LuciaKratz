// ═══════════════════════════════════════════════════════
//  psico_ui.js — Aba Psicoeducação + Recursos Terapêuticos
//  Clínica Dra. Lucia Kratz — CRP 09/20590
//  Depende de: ferramentas.js + psicoeducacoes.js
//  Carregar 3º no index.html (antes de app.js)
// ═══════════════════════════════════════════════════════

// ── Modal compartilhado: Enviar ferramenta para paciente ──────────────────────
function ModalEnviarParaPaciente({
  recurso,
  tipo,
  onClose
}) {
  // tipo: "ferramenta" | "fabula" | "psicoeducacao"
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const BASE_URL = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz";
  useEffect(() => {
    db.collection("clinica_pacientes").where("status", "==", "ativo").get().then(snap => {
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
      setPacientes(lista);
    });
  }, []);
  function gerarToken() {
    return Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  const filtrados = pacientes.filter(p => !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()));
  async function enviar() {
    if (!selecionado) return;
    setEnviando(true);
    try {
      const token = gerarToken();
      const paciente = pacientes.find(p => p.id === selecionado);
      const nomeRecurso = recurso.titulo || recurso.nome || recurso.id || "";
      const doc = {
        pacienteId: selecionado,
        pacienteNome: paciente?.nome || "",
        tipoFerramenta: tipo + ":" + (recurso.id || recurso.titulo || ""),
        nomeRecurso,
        tipo,
        token,
        status: "pendente",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("clinica_links_partilhados").add(doc);

      // Habilitar automaticamente nos módulos da paciente via modulosConfig
      const recursoId = recurso.id || recurso.formularioKey || recurso.titulo || "";
      if (recursoId) {
        const hoje = new Date().toISOString().split("T")[0];
        if (tipo === "ferramenta" || tipo === "psicoeducacao") {
          const modKey = tipo === "psicoeducacao" ? "mod6" : "mod3";
          const upd = {};
          upd["modulosConfig." + modKey + ".ativo"] = true;
          upd["modulosConfig." + modKey + ".ferramentas." + recursoId + ".ativo"] = true;
          upd["modulosConfig." + modKey + ".ferramentas." + recursoId + ".dataInicio"] = hoje;
          await db.collection("clinica_pacientes").doc(selecionado).update(upd);
        } else if (tipo === "fabula") {
          const upd = {};
          upd["modulosConfig.mod2.ativo"] = true;
          upd["modulosConfig.mod2.ferramentas." + recursoId + ".ativo"] = true;
          upd["modulosConfig.mod2.ferramentas." + recursoId + ".dataInicio"] = hoje;
          await db.collection("clinica_pacientes").doc(selecionado).update(upd);
        }
      }

      // Abrir WhatsApp
      const url = `${BASE_URL}/ferramentas/?token=${token}`;
      const nome = paciente?.nome?.split(" ")[0] || "paciente";
      const msg = `Olá, ${nome}! 😊\n\nSua psicóloga Dra. Lucia Kratz enviou uma atividade terapêutica para você:\n\n🧠 *${nomeRecurso}*\n\nAcesse pelo link abaixo, faça no seu celular com calma — leva só alguns minutos:\n${url}\n\nQualquer dúvida, estou por aqui! 💜\n_Dra. Lucia Kratz · CRP 09/20590_`;
      const tel = (paciente?.telefone || "").replace(/\D/g, "");
      window.open(`https://api.whatsapp.com/send?${tel ? "phone=55" + tel + "&" : ""}text=${encodeURIComponent(msg)}`, "_blank");
      setEnviado(true);
    } catch (e) {
      alert("Erro ao gerar link: " + e.message);
    }
    setEnviando(false);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
      padding: 20
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 24,
      width: "100%",
      maxWidth: 460,
      maxHeight: "85vh",
      display: "flex",
      flexDirection: "column"
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
      fontWeight: 700,
      fontSize: 16
    }
  }, "📲 Enviar para paciente"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)",
      fontSize: 22
    }
  }, "×")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple-soft)",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 13,
      color: "var(--purple)",
      fontWeight: 600
    }
  }, recurso.emoji || "🧠", " ", recurso.titulo || recurso.nome || ""), enviado ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "24px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 12
    }
  }, "✅"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Link enviado pelo WhatsApp!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "O link foi registrado e aparecerá em Links Partilhados no perfil da paciente."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: onClose
  }, "Fechar")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    placeholder: "🔍 Buscar paciente...",
    value: busca,
    onChange: e => setBusca(e.target.value),
    style: {
      marginBottom: 10
    },
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowY: "auto",
      flex: 1,
      border: "1px solid var(--gray-200)",
      borderRadius: 10,
      marginBottom: 16
    }
  }, filtrados.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 24,
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhuma paciente encontrada.") : filtrados.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    onClick: () => setSelecionado(p.id),
    style: {
      padding: "12px 16px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 12,
      borderBottom: "1px solid var(--gray-100)",
      background: selecionado === p.id ? "var(--purple-soft)" : "white",
      transition: "background .15s"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      background: selecionado === p.id ? "var(--purple)" : "var(--gray-100)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      color: selecionado === p.id ? "white" : "var(--gray-600)",
      flexShrink: 0,
      fontSize: 14
    }
  }, (p.nome || "?")[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 14,
      color: selecionado === p.id ? "var(--purple)" : "inherit"
    }
  }, p.nome), p.telefone && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, p.telefone)), selecionado === p.id && /*#__PURE__*/React.createElement(Icon, {
    name: "check-circle",
    size: 16,
    style: {
      color: "var(--purple)"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      flex: 1
    },
    onClick: onClose
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      flex: 2
    },
    onClick: enviar,
    disabled: !selecionado || enviando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message-circle",
    size: 15
  }), enviando ? " Gerando..." : " Gerar Link + WhatsApp")))));
}
function AbaPsicoeducacao() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [aberto, setAberto] = useState(null);
  const [enviandoPsico, setEnviandoPsico] = useState(null);

  // Mapa de categorias legado → nova macrocategoria clínica
  const REMAP_PSICO = {
    "tcc": "macro_ansiedade",
    "ansiedade": "macro_ansiedade",
    "esquema": "macro_ansiedade",
    "emocoes": "macro_humor",
    "autocuidado": "macro_habitos",
    "relacionamentos": "macro_relacionamentos",
    "casais": "macro_casais",
    "corpo": "macro_habitos",
    "outros": "macro_ansiedade",
    // legados extras
    "autoestima": "macro_humor",
    "mindfulness": "macro_habitos",
    "trauma": "macro_ansiedade",
    "depressao": "macro_humor",
    "habitos": "macro_habitos"
  };
  async function migrarCatPsico() {
    if (!confirm("Migrar categorias de psicoeducação para a nova taxonomia clínica?")) return;
    setSalvando(true);
    try {
      const snap = await db.collection("clinica_psicoeducacao").get();
      const batch = db.batch();
      let count = 0;
      snap.docs.forEach(doc => {
        const cat = doc.data().categoria;
        const nova = REMAP_PSICO[cat];
        if (nova && nova !== cat) {
          batch.update(doc.ref, {
            categoria: nova
          });
          count++;
        }
      });
      if (count === 0) {
        alert("✅ Todas já estão na nova taxonomia!");
        setSalvando(false);
        return;
      }
      await batch.commit();
      alert(`✅ ${count} material(is) migrado(s) para a nova taxonomia clínica!`);
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setSalvando(false);
  }
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "ansiedade",
    conteudo: "",
    emoji: "📚",
    tipo: "texto"
  });
  useEffect(() => {
    const unsub = db.collection("clinica_psicoeducacao").onSnapshot(s => {
      setItens(s.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  async function salvar() {
    if (!form.titulo) {
      alert("Título obrigatório.");
      return;
    }
    setSalvando(true);
    if (editando) {
      await db.collection("clinica_psicoeducacao").doc(editando).update(form);
    } else {
      await db.collection("clinica_psicoeducacao").add({
        ...form,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    setModal(false);
    setEditando(null);
    setForm({
      titulo: "",
      descricao: "",
      categoria: "ansiedade",
      conteudo: "",
      emoji: "📚",
      tipo: "texto"
    });
    setSalvando(false);
  }
  async function popularPilulas() {
    if (!confirm(`Isso vai adicionar as pílulas TCC ao banco. Continuar?`)) return;
    setSalvando(true);
    try {
      for (const p of PILULAS_TCC) {
        await db.collection("clinica_psicoeducacao").add({
          ...p,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      alert("✓ Pílulas TCC adicionadas com sucesso!");
    } catch (e) {
      alert("Erro ao popular: " + e.message);
    }
    setSalvando(false);
  }
  async function atualizarVisuaisFirebase() {
    if (!confirm("Salvar visualKey nos documentos do Firebase. Continuar?")) return;
    setSalvando(true);
    const MAPA = {
      "Preocupação produtiva vs. improdutiva": {
        visualKey: "Preocupação produtiva vs. improdutiva",
        tipo: "visual"
      },
      "A armadilha do pior cenário": {
        visualKey: "A armadilha do pior cenário",
        tipo: "visual"
      },
      "Eustresse vs. distresse": {
        visualKey: "Eustresse vs. distresse",
        tipo: "visual"
      },
      "O ciclo da ansiedade": {
        visualKey: "O ciclo da ansiedade",
        tipo: "visual"
      },
      "Desmontar o Circuito Cerebral da Ansiedade": {
        visualKey: "Desmontar o Circuito Cerebral da Ansiedade",
        tipo: "visual"
      },
      "O modelo ABC na prática": {
        visualKey: "O modelo ABC na prática",
        tipo: "visual"
      },
      "O poder dos pensamentos": {
        visualKey: "O poder dos pensamentos",
        tipo: "visual"
      },
      "A pizza da responsabilidade": {
        visualKey: "A pizza da responsabilidade",
        tipo: "visual"
      },
      "Fatos vs. interpretações": {
        visualKey: "Fatos vs. interpretações",
        tipo: "visual"
      },
      "O perigo do sempre e nunca": {
        visualKey: "O perigo do sempre e nunca",
        tipo: "visual"
      },
      "7 Distorções de Pensamento": {
        visualKey: "7 Distorções de Pensamento",
        tipo: "visual"
      },
      "O Alarme Falso do Cérebro": {
        visualKey: "O Alarme Falso do Cérebro",
        tipo: "visual"
      },
      "Pensamentos São Eventos, Não Factos": {
        visualKey: "Pensamentos São Eventos, Não Factos",
        tipo: "visual"
      },
      "Por Que Discutimos Sobre Dinheiro — Quando Não é Realmente Sobre Dinheiro": {
        visualKey: "Por Que Discutimos Sobre Dinheiro — Quando Não é Realmente Sobre Dinheiro",
        tipo: "visual"
      },
      "Por Que Perder-se no Outro Não É Amor — É Fusão": {
        visualKey: "Por Que Perder-se no Outro Não É Amor — É Fusão",
        tipo: "visual"
      },
      "A Triangulação — Quando Usamos Terceiros para Evitar Conversas Difíceis": {
        visualKey: "A Triangulação — Quando Usamos Terceiros para Evitar Conversas Difíceis",
        tipo: "visual"
      },
      "O Mito do Pai/Mãe Perfeito — E o Custo Real do Perfeccionismo Parental": {
        visualKey: "O Mito do Pai/Mãe Perfeito — E o Custo Real do Perfeccionismo Parental",
        tipo: "visual"
      },
      "O Desejo Não Desaparece — Adormece": {
        visualKey: "O Desejo Não Desaparece — Adormece",
        tipo: "visual"
      }
    };
    try {
      const snap = await db.collection("clinica_psicoeducacao").get();
      const batch = db.batch();
      let count = 0;
      snap.docs.forEach(d => {
        const dados = MAPA[d.data().titulo];
        if (dados) {
          batch.update(d.ref, dados);
          count++;
        }
      });
      if (count === 0) {
        alert("Nenhum documento encontrado com os títulos mapeados.");
        setSalvando(false);
        return;
      }
      await batch.commit();
      alert("✅ " + count + " psicoeducações atualizadas!");
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setSalvando(false);
  }
  async function sincronizarNovas() {
    setSalvando(true);
    try {
      const snap = await db.collection("clinica_psicoeducacao").get();
      const titulosExistentes = snap.docs.map(d => d.data().titulo);
      const novas = PILULAS_TCC.filter(p => !titulosExistentes.includes(p.titulo));
      if (novas.length === 0) {
        alert("Todas as psicoeducações já estão no banco!");
        setSalvando(false);
        return;
      }
      for (const p of novas) {
        await db.collection("clinica_psicoeducacao").add({
          ...p,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      alert("✓ " + novas.length + " nova(s) psicoeducação(ões) adicionada(s): " + novas.map(p => p.titulo).join(", "));
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setSalvando(false);
  }

  // Filtro: "todos" ou macrocategoria + legado mapeado (PSICO_LEGADO_MACRO declarado fora)
  const filtrados = filtro === "todos" ? itens : itens.filter(i => {
    if (i.categoria === filtro) return true;
    const macro = MACROCATEGORIAS.find(m => m.id === filtro);
    if (macro) {
      const subIds = new Set(macro.subs.map(s => s.id));
      return subIds.has(i.categoria) || PSICO_LEGADO_MACRO[i.categoria] === filtro;
    }
    return false;
  });
  if (loading) return /*#__PURE__*/React.createElement(Spinner, null);
  if (aberto) {
    const macroAberto = MACROCATEGORIAS.find(m => m.id === aberto.categoria || m.subs.some(s => s.id === aberto.categoria)) || MACROCATEGORIAS[0];
    const cat = {
      label: macroAberto.label,
      cor: macroAberto.cor,
      bg: macroAberto.bg,
      accent: macroAberto.cor
    };
    const VisualComp = PSICO_VISUAIS[aberto.visualKey || aberto.titulo];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        marginBottom: 16,
        padding: "8px 12px"
      },
      onClick: () => setAberto(null)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-left",
      size: 16
    }), " Todos os materiais"), VisualComp ? /*#__PURE__*/React.createElement(VisualComp, {
      cat: cat
    }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        marginBottom: 16,
        background: cat.cor,
        color: "white"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "8px 0 16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 52,
        marginBottom: 12
      }
    }, aberto.emoji || "📚"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 22,
        fontWeight: 600,
        marginBottom: 8
      }
    }, aberto.titulo), /*#__PURE__*/React.createElement("span", {
      style: {
        background: "rgba(255,255,255,0.2)",
        borderRadius: 20,
        padding: "4px 14px",
        fontSize: 12
      }
    }, cat.label))), aberto.descricao && /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14,
        color: "var(--text-muted)",
        fontStyle: "italic"
      }
    }, aberto.descricao)), aberto.conteudo && /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        lineHeight: 1.8,
        whiteSpace: "pre-wrap"
      }
    }, aberto.conteudo))));
  }
  return /*#__PURE__*/React.createElement("div", null, enviandoPsico && /*#__PURE__*/React.createElement(ModalEnviarParaPaciente, {
    recurso: enviandoPsico,
    tipo: "psicoeducacao",
    onClose: () => setEnviandoPsico(null)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, itens.length, " material", itens.length !== 1 ? "is" : "", " de psicoeducação"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, itens.length === 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      fontSize: 12
    },
    onClick: popularPilulas,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 14
  }), " ", salvando ? "Adicionando..." : "Popular pílulas TCC"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      setForm({
        titulo: "",
        descricao: "",
        categoria: "ansiedade",
        conteudo: "",
        emoji: "📚",
        tipo: "texto"
      });
      setEditando(null);
      setModal(true);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Novo Material"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 20,
      flexWrap: "wrap",
      paddingBottom: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setFiltro("todos"),
    style: {
      padding: "5px 14px",
      borderRadius: 20,
      border: "1.5px solid",
      whiteSpace: "nowrap",
      flexShrink: 0,
      borderColor: filtro === "todos" ? "var(--purple)" : "var(--gray-200)",
      background: filtro === "todos" ? "var(--purple)" : "white",
      color: filtro === "todos" ? "white" : "var(--gray-600)",
      fontSize: 12,
      cursor: "pointer",
      fontWeight: filtro === "todos" ? 600 : 400
    }
  }, "Todos (", itens.length, ")"), MACROCATEGORIAS.map(m => {
    const subIds = new Set(m.subs.map(s => s.id));
    const count = itens.filter(i => subIds.has(i.categoria) || PSICO_LEGADO_MACRO[i.categoria] === m.id).length;
    if (count === 0) return null;
    return /*#__PURE__*/React.createElement("button", {
      key: m.id,
      onClick: () => setFiltro(m.id),
      style: {
        padding: "5px 14px",
        borderRadius: 20,
        border: "1.5px solid",
        whiteSpace: "nowrap",
        flexShrink: 0,
        borderColor: filtro === m.id ? m.cor : m.cor + "50",
        background: filtro === m.id ? m.cor : m.bg,
        color: filtro === m.id ? "white" : m.cor,
        fontSize: 12,
        cursor: "pointer",
        fontWeight: filtro === m.id ? 600 : 400
      }
    }, m.icone, " ", m.label, " (", count, ")");
  })), filtrados.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 40,
      color: "var(--text-muted)",
      fontSize: 14
    }
  }, "Nenhum material cadastrado ainda.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      marginTop: 12
    },
    onClick: () => setModal(true)
  }, "Adicionar primeiro material")) : (() => {
    // Agrupa por macrocategoria
    const grupos = MACROCATEGORIAS.map(m => {
      const itensGrupo = filtrados.filter(i => i.categoria === m.id || PSICO_LEGADO_MACRO[i.categoria] === m.id || m.subs.some(s => s.id === i.categoria));
      return {
        ...m,
        itens: itensGrupo
      };
    }).filter(g => g.itens.length > 0);
    const orfaos = filtrados.filter(i => !MACROCATEGORIAS.some(m => i.categoria === m.id || PSICO_LEGADO_MACRO[i.categoria] === m.id || m.subs.some(s => s.id === i.categoria)));
    const todosGrupos = [...grupos, ...(orfaos.length > 0 ? [{
      id: "_orfaos",
      label: "Sem Categoria",
      icone: "🔧",
      cor: "#6b7280",
      bg: "#f3f4f6",
      itens: orfaos
    }] : [])];
    function CardPsico({
      item,
      cat
    }) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          background: "white",
          borderRadius: 12,
          border: "1px solid var(--gray-200)",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          background: cat.bg,
          padding: "20px 16px",
          textAlign: "center",
          borderBottom: "1px solid " + cat.cor + "20"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 36,
          marginBottom: 8
        }
      }, item.emoji || "📚"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: cat.cor
        }
      }, item.titulo), /*#__PURE__*/React.createElement("span", {
        style: {
          background: cat.cor + "20",
          color: cat.cor,
          borderRadius: 20,
          padding: "2px 10px",
          fontSize: 11,
          fontWeight: 600,
          marginTop: 6,
          display: "inline-block"
        }
      }, cat.label)), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "12px 16px"
        }
      }, item.descricao && /*#__PURE__*/React.createElement("p", {
        style: {
          fontSize: 12,
          color: "var(--text-muted)",
          marginBottom: 10,
          lineHeight: 1.5
        }
      }, item.descricao.slice(0, 80), item.descricao.length > 80 ? "..." : ""), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 6
        }
      }, /*#__PURE__*/React.createElement("button", {
        className: "btn btn-ghost",
        style: {
          flex: 1,
          fontSize: 12,
          padding: "6px 0"
        },
        onClick: () => setAberto(item)
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "eye",
        size: 13
      }), " Ver"), /*#__PURE__*/React.createElement("button", {
        className: "btn btn-ghost",
        style: {
          fontSize: 12,
          padding: "6px 10px"
        },
        onClick: () => {
          setForm({
            titulo: item.titulo || "",
            descricao: item.descricao || "",
            categoria: item.categoria || "ansiedade",
            conteudo: item.conteudo || "",
            emoji: item.emoji || "📚",
            tipo: item.tipo || "texto"
          });
          setEditando(item.id);
          setModal(true);
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "edit-2",
        size: 13
      })), /*#__PURE__*/React.createElement("button", {
        className: "btn btn-ghost",
        style: {
          fontSize: 12,
          padding: "6px 10px",
          color: "var(--danger)"
        },
        onClick: () => excluir(item.id)
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "trash-2",
        size: 13
      }))), /*#__PURE__*/React.createElement("button", {
        className: "btn btn-outline",
        style: {
          fontSize: 12,
          width: "100%",
          marginTop: 6,
          color: "var(--purple)",
          borderColor: "var(--purple)"
        },
        onClick: () => setEnviandoPsico(item)
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "send",
        size: 13
      }), " 📲 Enviar para paciente")));
    }
    return /*#__PURE__*/React.createElement("div", null, todosGrupos.map(grupo => /*#__PURE__*/React.createElement("div", {
      key: grupo.id,
      style: {
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
        paddingBottom: 8,
        borderBottom: "1px solid var(--gray-100)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18
      }
    }, grupo.icone), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 12,
        color: grupo.cor,
        textTransform: "uppercase",
        letterSpacing: "0.8px"
      }
    }, grupo.label), /*#__PURE__*/React.createElement("span", {
      style: {
        background: grupo.bg,
        color: grupo.cor,
        borderRadius: 20,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600
      }
    }, grupo.itens.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
        gap: 16
      }
    }, grupo.itens.map(item => /*#__PURE__*/React.createElement(CardPsico, {
      key: item.id,
      item: item,
      cat: {
        label: grupo.label,
        cor: grupo.cor,
        bg: grupo.bg
      }
    }))))));
  })(), modal && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      width: "100%",
      maxWidth: 540,
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 24px",
      borderBottom: "1px solid var(--gray-100)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16
    }
  }, editando ? "Editar Material" : "Novo Material de Psicoeducação"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 22,
      color: "var(--text-muted)"
    }
  }, "×")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "60px 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      display: "block",
      marginBottom: 6
    }
  }, "Emoji"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.emoji,
    onChange: e => setForm(f => ({
      ...f,
      emoji: e.target.value
    })),
    style: {
      textAlign: "center",
      fontSize: 20
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      display: "block",
      marginBottom: 6
    }
  }, "Título *"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.titulo,
    onChange: e => setForm(f => ({
      ...f,
      titulo: e.target.value
    })),
    placeholder: "Ex: O que é ansiedade?"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      display: "block",
      marginBottom: 6
    }
  }, "Categoria"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.categoria,
    onChange: e => setForm(f => ({
      ...f,
      categoria: e.target.value
    }))
  }, MACROCATEGORIAS.map(m => /*#__PURE__*/React.createElement("optgroup", {
    key: m.id,
    label: `${m.icone} ${m.label}`
  }, m.subs.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.label)))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      display: "block",
      marginBottom: 6
    }
  }, "Descrição breve"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.descricao,
    onChange: e => setForm(f => ({
      ...f,
      descricao: e.target.value
    })),
    placeholder: "Resumo do material..."
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      display: "block",
      marginBottom: 6
    }
  }, "Conteúdo completo"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 6,
    value: form.conteudo,
    onChange: e => setForm(f => ({
      ...f,
      conteudo: e.target.value
    })),
    placeholder: "Texto educativo completo...",
    style: {
      resize: "vertical"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 24px",
      borderTop: "1px solid var(--gray-100)",
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal(false),
    className: "btn btn-ghost"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: salvar,
    disabled: salvando,
    className: "btn btn-purple"
  }, salvando ? "Salvando..." : "Salvar")))));
}
function RecursosTerapeuticos({
  user
}) {
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCateg, setFiltroCateg] = useState("todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "tcc",
    tipo: "interativa",
    formularioKey: "",
    musicUrl: ""
  });
  const [salvando, setSalvando] = useState(false);
  const [abaView, setAbaView] = useState("ferramentas");
  const [buscaIA, setBuscaIA] = useState(false);
  // Wizard Nova Ferramenta
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardBlocos, setWizardBlocos] = useState([]);
  const TIPOS_BLOCO = [{
    id: "banner",
    label: "Banner",
    emoji: "🎨",
    desc: "Cabeçalho colorido com título e emoji"
  }, {
    id: "texto",
    label: "Texto",
    emoji: "📝",
    desc: "Parágrafo de texto livre"
  }, {
    id: "card",
    label: "Card",
    emoji: "🃏",
    desc: "Card com ícone, título e texto"
  }, {
    id: "lista",
    label: "Lista",
    emoji: "📋",
    desc: "Lista de itens"
  }, {
    id: "imagem",
    label: "Imagem",
    emoji: "🖼️",
    desc: "Imagem via URL"
  }, {
    id: "grafico_barras",
    label: "Gráfico Barras",
    emoji: "📊",
    desc: "Gráfico de barras comparativo"
  }, {
    id: "grafico_radar",
    label: "Gráfico Teia",
    emoji: "🕸️",
    desc: "Gráfico radar/teia"
  }, {
    id: "grafico_pizza",
    label: "Gráfico Pizza",
    emoji: "🥧",
    desc: "Gráfico circular/pizza"
  }, {
    id: "slider",
    label: "Slider",
    emoji: "🎚️",
    desc: "Escala de intensidade (0 a 10)"
  }, {
    id: "pergunta",
    label: "Pergunta Aberta",
    emoji: "❓",
    desc: "Campo para a paciente responder"
  }, {
    id: "audio",
    label: "Áudio/Vídeo",
    emoji: "🎵",
    desc: "Link de áudio ou vídeo"
  }, {
    id: "estrelas",
    label: "Avaliação ⭐",
    emoji: "⭐",
    desc: "Avaliação de 1 a 5 estrelas"
  }, {
    id: "checklist",
    label: "Checklist",
    emoji: "☑️",
    desc: "Lista de itens para marcar"
  }, {
    id: "selecao",
    label: "Seleção",
    emoji: "🗂️",
    desc: "Múltipla escolha ou escolha única"
  }];
  function novoBloco(tipo) {
    const defaults = {
      banner: {
        cor: "#7B00C4",
        emoji: "🦋",
        titulo: ""
      },
      texto: {
        conteudo: ""
      },
      card: {
        icone: "💡",
        titulo: "",
        texto: ""
      },
      lista: {
        itens: [""]
      },
      imagem: {
        url: "",
        legenda: ""
      },
      grafico_barras: {
        titulo: "",
        itens: [{
          label: "",
          valor: 0
        }, {
          label: "",
          valor: 0
        }]
      },
      grafico_radar: {
        titulo: "",
        eixos: [{
          label: "",
          valor: 0
        }, {
          label: "",
          valor: 0
        }, {
          label: "",
          valor: 0
        }]
      },
      grafico_pizza: {
        titulo: "",
        fatias: [{
          label: "",
          valor: 50
        }, {
          label: "",
          valor: 50
        }]
      },
      slider: {
        pergunta: "",
        min: 0,
        max: 10,
        labelMin: "Nada",
        labelMax: "Muito"
      },
      pergunta: {
        pergunta: "",
        placeholder: "Escreva aqui..."
      },
      audio: {
        url: "",
        legenda: ""
      },
      estrelas: {
        pergunta: "",
        max: 5
      },
      checklist: {
        titulo: "",
        itens: [""]
      },
      selecao: {
        pergunta: "",
        tipo: "unica",
        opcoes: ["", ""]
      }
    };
    return {
      id: Date.now() + "_" + Math.random().toString(36).slice(2),
      tipo,
      ...defaults[tipo]
    };
  }
  function addBloco(tipo) {
    setWizardBlocos(b => [...b, novoBloco(tipo)]);
  }
  function removeBloco(idx) {
    setWizardBlocos(b => b.filter((_, i) => i !== idx));
  }
  function moveBloco(idx, dir) {
    setWizardBlocos(b => {
      const arr = [...b];
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr;
    });
  }
  function updateBloco(idx, patch) {
    setWizardBlocos(b => b.map((bl, i) => i === idx ? {
      ...bl,
      ...patch
    } : bl));
  }
  function abrirWizardNovo() {
    setForm({
      titulo: "",
      descricao: "",
      categoria: "macro_ansiedade",
      tipo: "builder",
      formularioKey: "",
      musicUrl: ""
    });
    setWizardBlocos([]);
    setWizardStep(1);
    setEditando(null);
    setModal(true);
  }
  async function salvarWizard() {
    if (!form.titulo) {
      alert("Título obrigatório.");
      return;
    }
    setSalvando(true);
    const doc = {
      titulo: form.titulo,
      descricao: form.descricao,
      categoria: form.categoria,
      tipo: "builder",
      blocos: wizardBlocos,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editando) {
      await db.collection("clinica_recursos").doc(editando).update(doc);
    } else {
      await db.collection("clinica_recursos").add(doc);
    }
    setModal(false);
    setWizardBlocos([]);
    setWizardStep(1);
    setEditando(null);
    setSalvando(false);
  }
  useEffect(() => {
    const unsub = db.collection("clinica_recursos").onSnapshot(snap => {
      setRecursos(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  const abaRecursos = recursos.filter(r => abaView === "ferramentas" ? r.categoria !== "casal" : r.categoria === "casal");

  // Mapa de categorias legado para macrocategoria
  const LEGADO_PARA_MACRO = {
    // Categorias legadas do Firestore
    "tcc": "macro_ansiedade",
    "ansiedade": "macro_ansiedade",
    "ansiedade_diario": "macro_ansiedade",
    "esquema": "macro_ansiedade",
    "emocoes": "macro_humor",
    "humor": "macro_humor",
    "autocuidado": "macro_habitos",
    "habitos": "macro_habitos",
    "relaxamento": "macro_habitos",
    "relacionamentos": "macro_relacionamentos",
    "comunicacao": "macro_relacionamentos",
    "corpo": "macro_habitos",
    "alimentacao": "macro_habitos",
    "casal": "macro_casais",
    "musicoterapia": "macro_musico",
    "avaliacao": "macro_aval",
    "compulsao_sexual": "macro_compulsao",
    "compulsao": "macro_compulsao",
    "macro_compulsao": "macro_compulsao",
    "macro_corpo": "macro_habitos",
    "compulsao_ciclo": "macro_compulsao",
    "compulsao_habitos": "macro_compulsao",
    "compulsao_emocional": "macro_compulsao",
    "compulsao_vinculos": "macro_compulsao",
    "compulsao_aval": "macro_compulsao",
    // formularioKey → macro
    "breathing-478": "macro_habitos",
    "muscle-relaxation": "macro_habitos",
    "anxiety-management": "macro_ansiedade",
    "decision-tree": "macro_ansiedade",
    "abc-record": "macro_ansiedade",
    "emotional-eating": "macro_habitos",
    "mapa-intimidade": "macro_casais",
    "aterramento-5-sentidos": "macro_habitos",
    "escada-polivagal": "macro_habitos",
    "diario-corpo-mente": "macro_habitos",
    "roda-vida-integral": "macro_habitos",
    "diagnostico-macroatividades": "macro_habitos",
    "rastreamento-bipolar": "macro_aval",
    "rastreamento-sexual": "macro_aval",
    "rastreamento-alimentar": "macro_aval",
    "rastreamento-neuro": "macro_aval",
    "rastreamento-dependencia": "macro_aval",
    "rastreamento-jogos": "macro_aval",
    "empilhamento-habitos": "macro_habitos",
    "ritual-noturno": "macro_habitos",
    "mapa-bateria": "macro_habitos",
    "mural-habilidades": "macro_habitos",
    "regra-5-minutos": "macro_habitos",
    "3-mapas-financeiros": "macro_casais",
    "ciclo-conflito": "macro_relacionamentos",
    "registro-cnv": "macro_relacionamentos",
    "mapa-limites": "macro_relacionamentos",
    "escuta-ativa": "macro_relacionamentos",
    "carga-mental": "macro_relacionamentos",
    "mapa-diferenciacao": "macro_casais",
    "mapa-triangulacao": "macro_casais",
    "diario-parentalidade": "macro_casais",
    "diario-autocompaixao": "macro_humor",
    "ativacao-comportamental": "macro_humor",
    "pausa-estrategica": "macro_humor",
    "kit-sos-tipp": "macro_humor",
    "analise-cadeia": "macro_ansiedade",
    "rastreamento-compulsao-sexual": "macro_compulsao"
  };
  const filtrados = abaRecursos.filter(r => {
    const macro = MACROCATEGORIAS.find(m => m.id === filtroCateg);
    let cOk;
    if (filtroCateg === "todos") {
      cOk = true;
    } else if (macro) {
      // Macrocategoria — inclui: id direto da macro, subcategorias, legado, formularioKey
      const subIds = new Set(macro.subs.map(s => s.id));
      const legadoIds = new Set(Object.entries(LEGADO_PARA_MACRO).filter(([, macroId]) => macroId === filtroCateg).map(([legId]) => legId));
      const macroInf = r.categoria !== "outro" && LEGADO_PARA_MACRO[r.categoria] || LEGADO_PARA_MACRO[r.formularioKey];
      cOk = r.categoria === filtroCateg || macroInf === filtroCateg || subIds.has(r.categoria) || legadoIds.has(r.categoria) || legadoIds.has(r.formularioKey);
    } else {
      cOk = r.categoria === filtroCateg;
    }
    const bOk = !busca || r.titulo?.toLowerCase().includes(busca.toLowerCase()) || r.descricao?.toLowerCase().includes(busca.toLowerCase());
    return cOk && bOk;
  });

  // Agrupa por categoria no grid
  const todasCatsConhecidas = new Set([...CATEGORIAS_LEGADO.map(c => c.id), ...TODAS_SUBCATEGORIAS.map(s => s.id), ...MACROCATEGORIAS.map(m => m.id) // inclui macro_humor, macro_habitos etc.
  ]);
  const porCategoria = [];
  // Macrocategorias (agrupa todas as subcategorias)
  MACROCATEGORIAS.forEach(m => {
    const subIds = new Set(m.subs.map(s => s.id));
    const legadoIds2 = new Set(Object.entries(LEGADO_PARA_MACRO).filter(([, mid]) => mid === m.id).map(([k]) => k));
    const itens = filtrados.filter(r => {
      const macroInf = r.categoria !== "outro" && LEGADO_PARA_MACRO[r.categoria] || LEGADO_PARA_MACRO[r.formularioKey];
      return r.categoria === m.id || subIds.has(r.categoria) || legadoIds2.has(r.categoria) || legadoIds2.has(r.formularioKey) || macroInf === m.id;
    });
    if (itens.length > 0) porCategoria.push({
      ...m,
      itens
    });
  });
  // Musicoterapia e Avaliação separados
  ["musicoterapia", "avaliacao"].forEach(cid => {
    const cat = CATEGORIAS_LEGADO.find(c => c.id === cid);
    if (!cat) return;
    const itens = filtrados.filter(r => r.categoria === cid);
    if (itens.length > 0) porCategoria.push({
      ...cat,
      itens
    });
  });
  // Órfãos (categorias não reconhecidas)
  const orfaos = filtrados.filter(r => !todasCatsConhecidas.has(r.categoria));
  if (orfaos.length > 0) porCategoria.push({
    id: "_orfaos",
    label: "Sem Categoria",
    cor: "#6b7280",
    bg: "#f3f4f6",
    itens: orfaos
  });
  async function salvar() {
    if (!form.titulo) {
      alert("Titulo obrigatorio.");
      return;
    }
    setSalvando(true);
    if (editando) {
      await db.collection("clinica_recursos").doc(editando).update(form);
    } else {
      await db.collection("clinica_recursos").add({
        ...form,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    setModal(false);
    setForm({
      titulo: "",
      descricao: "",
      categoria: "tcc",
      tipo: "interativa",
      formularioKey: "",
      musicUrl: ""
    });
    setEditando(null);
    setSalvando(false);
  }
  async function excluir(id) {
    if (!confirm("Excluir recurso?")) return;
    await db.collection("clinica_recursos").doc(id).delete();
  }
  function abrirEditar(r) {
    setForm({
      titulo: r.titulo || "",
      descricao: r.descricao || "",
      categoria: r.categoria || "tcc",
      tipo: r.tipo || "interativa",
      formularioKey: r.formularioKey || "",
      musicUrl: r.musicUrl || ""
    });
    setEditando(r.id);
    setModal(true);
  }
  const getCatInfo = id => CATEGORIAS_RECURSOS.find(c => c.id === id) || CATEGORIAS_RECURSOS[6];
  const ICONES_FERRAMENTA = {
    "breathing-478": "💨",
    "muscle-relaxation": "💪",
    "decision-tree": "🌳",
    "abc-record": "📋",
    "anxiety-management": "🎯",
    "emotional-eating": "🍃",
    "entrevista-clinica": "📝",
    "anamnese": "📄",
    "treino-neuro-auditivo": "🎵",
    "diario-terapeutico": "📓"
  };
  const getIcone = r => ICONES_FERRAMENTA[r.formularioKey] || (r.categoria === "tcc" ? "🧠" : r.categoria === "ansiedade" ? "😮" : r.categoria === "emocoes" ? "💜" : r.categoria === "autocuidado" ? "🌱" : r.categoria === "relacionamentos" ? "❤️" : r.categoria === "corpo" ? "🥗" : r.categoria === "esquema" ? "🔑" : r.categoria === "musicoterapia" ? "🎵" : r.categoria === "avaliacao" ? "📋" : "🔧");
  const [visualizando, setVisualizando] = useState(null);
  const [enviandoRecurso, setEnviandoRecurso] = useState(null);
  if (loading) return /*#__PURE__*/React.createElement(Spinner, null);
  if (enviandoRecurso) return /*#__PURE__*/React.createElement(ModalEnviarParaPaciente, {
    recurso: enviandoRecurso,
    tipo: "ferramenta",
    onClose: () => setEnviandoRecurso(null)
  });
  if (visualizando) return /*#__PURE__*/React.createElement(ModalVisualizarFerramenta, {
    recurso: visualizando,
    onClose: () => setVisualizando(null),
    user: user
  });
  function BuscaIASintomas({
    recursos,
    onClose,
    onEnviar
  }) {
    const [sintoma, setSintoma] = useState("");
    const [buscando, setBuscando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState("");
    async function buscar() {
      if (!sintoma.trim()) return;
      setBuscando(true);
      setErro("");
      setResultado(null);
      try {
        const lista = recursos.map(r => `- "${r.titulo || r.nome}" (${r.categoria || ""}): ${r.descricao || ""}`).join("\n");
        const prompt = `Você é uma psicóloga clínica especialista em TCC, Musicoterapia e Neuromodulação.\n\nA psicóloga Dra. Lucia Kratz tem estas ferramentas terapêuticas disponíveis:\n${lista}\n\nA queixa/sintoma da paciente é: "${sintoma}"\n\nSelecione as 3 a 5 ferramentas mais indicadas. Para cada uma, informe:\n- O título exato (igual à lista)\n- Por que é indicada (1-2 frases clínicas)\n- Ordem sugerida de uso\n\nResponda APENAS em JSON válido, sem markdown, neste formato:\n{"recomendacoes":[{"titulo":"título exato","motivo":"justificativa clínica","ordem":1}]}`;
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: prompt
            }]
          })
        });
        const data = await res.json();
        const texto = data.content?.[0]?.text || "";
        const json = JSON.parse(texto);
        const recomendados = json.recomendacoes.map(r => {
          const recurso = recursos.find(x => (x.titulo || x.nome || "").toLowerCase() === r.titulo.toLowerCase());
          return {
            ...r,
            recurso
          };
        }).filter(r => r.recurso);
        setResultado(recomendados);
      } catch (e) {
        setErro("Erro ao consultar a IA. Tente novamente.");
      }
      setBuscando(false);
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 16
      },
      onClick: onClose
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "white",
        borderRadius: 18,
        width: "100%",
        maxWidth: 560,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column"
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "linear-gradient(135deg,#7B00C4,#5a0090)",
        padding: "20px 24px",
        color: "white",
        borderRadius: "18px 18px 0 0"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 20,
        fontWeight: 700,
        marginBottom: 4
      }
    }, "🧠 Busca por Sintoma"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        opacity: 0.85
      }
    }, "Descreva a queixa e a IA recomenda as ferramentas mais indicadas")), /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      style: {
        background: "rgba(255,255,255,0.2)",
        border: "none",
        color: "white",
        borderRadius: 8,
        width: 30,
        height: 30,
        cursor: "pointer",
        fontSize: 18
      }
    }, "×"))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: "auto",
        padding: "20px 24px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("label", {
      className: "form-label"
    }, "Queixa ou sintoma da paciente"), /*#__PURE__*/React.createElement(TextAreaVoz, {
      className: "form-input",
      rows: 3,
      value: sintoma,
      onChange: e => setSintoma(e.target.value),
      placeholder: "Ex: autocrítica severa, pensamentos negativos recorrentes, dificuldade de se perdoar"
    })), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      style: {
        width: "100%",
        justifyContent: "center"
      },
      onClick: buscar,
      disabled: buscando || !sintoma.trim()
    }, buscando ? "🔍 Analisando com IA..." : "🔍 Buscar ferramentas indicadas"), erro && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        padding: 12,
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 10,
        color: "#dc2626",
        fontSize: 13
      }
    }, erro), resultado && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        marginBottom: 12,
        color: "var(--purple)"
      }
    }, "✨ ", resultado.length, " ferramentas recomendadas para esta queixa:"), resultado.sort((a, b) => a.ordem - b.ordem).map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        border: "1.5px solid var(--purple-soft)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 10,
        background: "white"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "var(--purple)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
        flexShrink: 0
      }
    }, r.ordem), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14
      }
    }, r.recurso.emoji || "🔧", " ", r.titulo), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, "Ferramenta Interativa"))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--gray-600)",
        lineHeight: 1.5,
        marginBottom: 10,
        fontStyle: "italic"
      }
    }, "💡 ", r.motivo), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      style: {
        fontSize: 12,
        padding: "7px 14px"
      },
      onClick: () => onEnviar(r.recurso)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "send",
      size: 13
    }), " Enviar para paciente")))))));
  }
  return /*#__PURE__*/React.createElement("div", null, buscaIA && /*#__PURE__*/React.createElement(BuscaIASintomas, {
    recursos: recursos,
    onClose: () => setBuscaIA(false),
    onEnviar: r => {
      setEnviandoRecurso(r);
      setBuscaIA(false);
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "page-header",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-title"
  }, "Recursos Terapeuticos"), /*#__PURE__*/React.createElement("div", {
    className: "page-subtitle"
  }, recursos.length, " ferramenta", recursos.length !== 1 ? "s" : "", " · ", recursos.filter(r => r.tipo === "interativa").length, " interativas · ", recursos.filter(r => r.tipo === "conteudo").length, " de conteudo"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 0,
      marginBottom: 20,
      borderBottom: "1px solid var(--gray-200)",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none"
    }
  }, [["ferramentas", "Ferramentas", "wrench"], ["fabulas", "Fábulas Terapêuticas", "book-open"], ["psicoeducacao", "Psicoeducação", "brain"], ["casais", "Terapia de Casais", "heart"]].map(([id, label, ic]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setAbaView(id),
    style: {
      padding: "10px 16px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: 13,
      color: abaView === id ? "var(--purple)" : "var(--gray-600)",
      borderBottom: abaView === id ? "2px solid var(--purple)" : "2px solid transparent",
      fontWeight: abaView === id ? 600 : 400,
      fontFamily: "var(--font-body)",
      marginBottom: -1,
      display: "flex",
      alignItems: "center",
      gap: 4,
      whiteSpace: "nowrap",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 15
  }), label))), abaView === "fabulas" && /*#__PURE__*/React.createElement(AbaFabulas, null), abaView === "psicoeducacao" && /*#__PURE__*/React.createElement(AbaPsicoeducacao, null), abaView === "casais" && /*#__PURE__*/React.createElement(AbaProtocoloCasais, null), abaView === "ferramentas" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginBottom: 16,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1,
      minWidth: 200
    },
    placeholder: "Buscar por nome, descricao ou tipo...",
    value: busca,
    onChange: e => setBusca(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      flexShrink: 0,
      borderColor: "var(--purple)",
      color: "var(--purple)",
      border: "1.5px solid"
    },
    onClick: () => setBuscaIA(true)
  }, "🧠 Busca por sintoma"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      flexShrink: 0
    },
    onClick: abrirWizardNovo
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Nova Ferramenta")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 8,
      flexWrap: "wrap",
      paddingBottom: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn " + (filtroCateg === "todos" ? "btn-purple" : "btn-ghost"),
    style: {
      fontSize: 12
    },
    onClick: () => setFiltroCateg("todos")
  }, "Todas ", recursos.length), MACROCATEGORIAS.map(m => {
    const subIds = new Set(m.subs.map(s => s.id));
    const legadoIds = new Set(Object.entries(LEGADO_PARA_MACRO).filter(([, mid]) => mid === m.id).map(([lid]) => lid));
    const n = recursos.filter(r => r.categoria === m.id || subIds.has(r.categoria) || legadoIds.has(r.categoria) || legadoIds.has(r.formularioKey)).length;
    const ativo = filtroCateg === m.id;
    return /*#__PURE__*/React.createElement("button", {
      key: m.id,
      onClick: () => setFiltroCateg(filtroCateg === m.id ? "todos" : m.id),
      style: {
        fontSize: 12,
        padding: "6px 12px",
        borderRadius: 20,
        border: "2px solid",
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: 600,
        transition: "all .15s",
        borderColor: ativo ? m.cor : m.cor + "50",
        background: ativo ? m.cor : m.bg,
        color: ativo ? "white" : m.cor,
        whiteSpace: "nowrap"
      }
    }, m.icone, " ", m.label, " ", n > 0 ? `(${n})` : "");
  }), ["musicoterapia", "avaliacao"].map(cid => {
    const cat = CATEGORIAS_LEGADO.find(c => c.id === cid);
    if (!cat) return null;
    const n = recursos.filter(r => r.categoria === cid).length;
    const ativo = filtroCateg === cid;
    return /*#__PURE__*/React.createElement("button", {
      key: cid,
      onClick: () => setFiltroCateg(filtroCateg === cid ? "todos" : cid),
      style: {
        fontSize: 12,
        padding: "6px 12px",
        borderRadius: 20,
        border: "2px solid",
        cursor: "pointer",
        fontFamily: "inherit",
        fontWeight: 600,
        borderColor: "#7B00C4",
        background: ativo ? "#7B00C4" : "#f3e6ff",
        color: ativo ? "white" : "#7B00C4"
      }
    }, cid === "musicoterapia" ? "🎵" : "📋", " ", cat.label, " ", n > 0 ? `(${n})` : "");
  })), filtroCateg !== "todos" && MACROCATEGORIAS.find(m => m.id === filtroCateg) && /*#__PURE__*/React.createElement("div", {
    style: {
      paddingLeft: 10,
      borderLeft: "3px solid",
      borderColor: MACROCATEGORIAS.find(m => m.id === filtroCateg)?.cor,
      fontSize: 12,
      color: "var(--text-muted)",
      lineHeight: 1.6
    }
  }, MACROCATEGORIAS.find(m => m.id === filtroCateg)?.subs.map(s => s.label).join(" · "))), filtrados.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "wrench",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, "Nenhuma ferramenta encontrada.")) : porCategoria.map(cat => /*#__PURE__*/React.createElement("div", {
    key: cat.id,
    style: {
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
      paddingBottom: 8,
      borderBottom: "1px solid var(--gray-100)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 12,
      color: cat.cor,
      textTransform: "uppercase",
      letterSpacing: "0.8px"
    }
  }, cat.label), /*#__PURE__*/React.createElement("span", {
    style: {
      background: cat.bg,
      color: cat.cor,
      borderRadius: 20,
      padding: "2px 10px",
      fontSize: 12,
      fontWeight: 600
    }
  }, cat.itens.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
      gap: 14
    }
  }, cat.itens.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    style: {
      background: "white",
      border: "1.5px solid",
      borderColor: cat.cor + "40",
      borderRadius: 14,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 10,
      background: cat.cor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 22,
      flexShrink: 0
    }
  }, getIcone(r)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 4,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: cat.bg,
      color: cat.cor,
      borderRadius: 20,
      padding: "2px 8px",
      fontSize: 10,
      fontWeight: 600,
      border: "1px solid " + cat.cor + "30"
    }
  }, r.tipo === "interativa" ? "INTERATIVA" : "CONTEÚDO"), r.categoria === "musicoterapia" && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#f3e6ff",
      color: "#7B00C4",
      borderRadius: 20,
      padding: "2px 8px",
      fontSize: 10,
      fontWeight: 600
    }
  }, "Música")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, r.titulo))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      lineHeight: 1.5,
      flex: 1
    }
  }, r.descricao), r.formularioKey && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--gray-400)",
      background: "var(--gray-50)",
      borderRadius: 6,
      padding: "2px 8px",
      display: "inline-block",
      width: "fit-content"
    }
  }, r.formularioKey), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--gray-100)",
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      flex: 1,
      color: "var(--purple)"
    },
    onClick: () => setVisualizando(r)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 13
  }), " Visualizar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      flex: 1
    },
    onClick: () => abrirEditar(r)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pencil",
    size: 13
  }), " Editar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px",
      color: "var(--danger)"
    },
    onClick: () => excluir(r.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      fontSize: 12,
      width: "100%",
      marginTop: 6,
      color: "var(--purple)",
      borderColor: "var(--purple)"
    },
    onClick: () => setEnviandoRecurso(r)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 13
  }), " 📲 Enviar para paciente"), (r.formularioKey === "anamnese" || ["rastreamento-bipolar", "rastreamento-sexual", "rastreamento-alimentar", "rastreamento-neuro", "rastreamento-dependencia", "rastreamento-jogos"].includes(r.formularioKey)) && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      width: "100%",
      color: "#059669",
      border: "1px solid #059669",
      marginTop: 6
    },
    onClick: () => {
      const BASE = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/";
      const LINKS = {
        "anamnese": BASE + "anamnese-publica/",
        "rastreamento-bipolar": BASE + "rastreamento/",
        "rastreamento-sexual": BASE + "rastreamento/sexual/",
        "rastreamento-alimentar": BASE + "rastreamento/alimentar/",
        "rastreamento-neuro": BASE + "rastreamento/neuro/",
        "rastreamento-dependencia": BASE + "rastreamento/dependencia/",
        "rastreamento-jogos": BASE + "rastreamento/jogos/"
      };
      const NOMES = {
        "anamnese": "Anamnese",
        "rastreamento-bipolar": "Rastreamento Bipolar / Borderline",
        "rastreamento-sexual": "Rastreamento de Saúde Sexual",
        "rastreamento-alimentar": "Rastreamento de Hábitos Alimentares",
        "rastreamento-neuro": "Rastreamento de Funcionamento e Comportamento",
        "rastreamento-dependencia": "Rastreamento de Dependência Química",
        "rastreamento-jogos": "Rastreamento de Jogos e Apostas"
      };
      const link = LINKS[r.formularioKey] || BASE;
      const nome = NOMES[r.formularioKey] || r.titulo;
      const msg = "Olá! 🦋\n\nA Dra. Lucia Kratz encaminhou um formulário de *" + nome + "* para você preencher.\n\n⏱️ Leva entre 5 e 15 minutos.\n\n💡 Dicas:\n• Responda com calma e honestidade\n• Se não souber algo, deixe em branco\n• Você pode falar em vez de digitar (botão 🎤)\n\n👇 *Acesse pelo link abaixo:*\n" + link + "\n\nQualquer dúvida, pode responder aqui. 💜";
      navigator.clipboard.writeText(msg).then(() => {
        alert("✅ Mensagem copiada!\n\nCole diretamente no WhatsApp do paciente.");
      }).catch(() => {
        window.prompt("Copie a mensagem abaixo:", msg);
      });
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), " 🔗 Copiar Mensagem"), false && r.formularioKey === "anamnese" && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      width: "100%",
      color: "#059669",
      border: "1px solid #059669",
      marginTop: 6
    },
    onClick: () => {
      const link = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/anamnese-publica/";
      const msg = "Olá! 🦋\n\nA Dra. Lucia Kratz encaminhou um formulário de Anamnese para você preencher antes da consulta.\n\n📋 *O que é isso?*\nSão perguntas sobre seu histórico de saúde e desenvolvimento — informações importantes para o atendimento.\n\n⏱️ *Quanto tempo leva?*\nEntre 10 e 20 minutos.\n\n💡 *Dicas:*\n• Responda com calma e honestidade\n• Se não souber algo, deixe em branco\n• Você pode falar em vez de digitar (botão 🎤)\n• Tenha em mãos informações sobre a infância, se possível\n\n👇 *Acesse pelo link abaixo:*\n" + link + "\n\nQualquer dúvida, pode responder aqui. 💜";
      navigator.clipboard.writeText(msg).then(() => {
        alert("✅ Mensagem copiada!\n\nCole diretamente no WhatsApp do paciente.");
      }).catch(() => {
        window.prompt("Copie a mensagem abaixo e envie para o paciente:", msg);
      });
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), " 🔗 Copiar Mensagem")))))))), modal && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 16
    },
    onClick: () => setModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 20,
      width: "100%",
      maxWidth: 720,
      maxHeight: "92vh",
      overflowY: "auto",
      boxShadow: "0 24px 80px rgba(0,0,0,0.25)"
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(135deg,#7B00C4,#9B30E0)",
      borderRadius: "20px 20px 0 0",
      padding: "20px 28px",
      color: "white",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700
    }
  }, editando ? "Editar Ferramenta" : "Nova Ferramenta"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      opacity: 0.85,
      marginTop: 3
    }
  }, wizardStep === 1 ? "Passo 1 — Identidade e Categoria" : wizardStep === 2 ? "Passo 2 — Blocos de Conteúdo" : "Passo 3 — Revisão e Salvar")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, [1, 2, 3].map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 700,
      background: wizardStep === s ? "white" : wizardStep > s ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
      color: wizardStep === s ? "#7B00C4" : wizardStep > s ? "white" : "rgba(255,255,255,0.7)"
    }
  }, wizardStep > s ? "✓" : s)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal(false),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "white",
      marginLeft: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 28px"
    }
  }, wizardStep === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Título da Ferramenta *"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.titulo,
    onChange: e => setForm({
      ...form,
      titulo: e.target.value
    }),
    placeholder: "Ex: Mapa das Emoções",
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Descrição curta"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: form.descricao,
    onChange: e => setForm({
      ...form,
      descricao: e.target.value
    }),
    placeholder: "O que esta ferramenta ajuda a paciente a fazer?"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Categoria"), MACROCATEGORIAS.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: m.cor,
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      marginBottom: 6
    }
  }, m.icone, " ", m.label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    }
  }, m.subs.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.id,
    onClick: () => setForm({
      ...form,
      categoria: s.id
    }),
    style: {
      padding: "6px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "var(--font-body)",
      borderColor: form.categoria === s.id ? m.cor : "var(--gray-200)",
      background: form.categoria === s.id ? m.bg : "white",
      color: form.categoria === s.id ? m.cor : "var(--gray-600)",
      fontWeight: form.categoria === s.id ? 600 : 400
    }
  }, s.label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: "#6b7280",
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      marginBottom: 6
    }
  }, "Especializadas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, [{
    id: "musicoterapia",
    label: "🎵 Musicoterapia"
  }, {
    id: "avaliacao",
    label: "📋 Avaliação e Anamnese"
  }, {
    id: "outro",
    label: "🔧 Outros"
  }].map(c => /*#__PURE__*/React.createElement("button", {
    key: c.id,
    onClick: () => setForm({
      ...form,
      categoria: c.id
    }),
    style: {
      padding: "6px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "var(--font-body)",
      borderColor: form.categoria === c.id ? "#7B00C4" : "var(--gray-200)",
      background: form.categoria === c.id ? "#f3e6ff" : "white",
      color: form.categoria === c.id ? "#7B00C4" : "var(--gray-600)",
      fontWeight: form.categoria === c.id ? 600 : 400
    }
  }, c.label))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      if (!form.titulo) {
        alert("Título obrigatório.");
        return;
      }
      setWizardStep(2);
    }
  }, "Próximo — Blocos de Conteúdo ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 15
  })))), wizardStep === 2 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      marginBottom: 10
    }
  }, "Adicionar Bloco"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, TIPOS_BLOCO.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => addBloco(t.id),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "7px 13px",
      borderRadius: 20,
      border: "1.5px solid var(--gray-200)",
      background: "white",
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "var(--font-body)",
      color: "var(--gray-700)",
      transition: "all .15s"
    },
    title: t.desc
  }, /*#__PURE__*/React.createElement("span", null, t.emoji), " ", t.label)))), wizardBlocos.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 20px",
      color: "var(--text-muted)",
      background: "#fafafa",
      borderRadius: 12,
      border: "1.5px dashed var(--gray-200)"
    }
  }, "Clique nos tipos acima para adicionar blocos à ferramenta"), wizardBlocos.map((bloco, idx) => /*#__PURE__*/React.createElement("div", {
    key: bloco.id,
    style: {
      border: "1.5px solid var(--gray-200)",
      borderRadius: 12,
      marginBottom: 12,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      background: "#f9f5ff",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, TIPOS_BLOCO.find(t => t.id === bloco.tipo)?.emoji), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "var(--purple)",
      flex: 1
    }
  }, TIPOS_BLOCO.find(t => t.id === bloco.tipo)?.label), /*#__PURE__*/React.createElement("button", {
    onClick: () => moveBloco(idx, -1),
    disabled: idx === 0,
    style: {
      background: "none",
      border: "none",
      cursor: idx === 0 ? "not-allowed" : "pointer",
      color: "var(--gray-400)",
      padding: "2px 6px"
    }
  }, "▲"), /*#__PURE__*/React.createElement("button", {
    onClick: () => moveBloco(idx, 1),
    disabled: idx === wizardBlocos.length - 1,
    style: {
      background: "none",
      border: "none",
      cursor: idx === wizardBlocos.length - 1 ? "not-allowed" : "pointer",
      color: "var(--gray-400)",
      padding: "2px 6px"
    }
  }, "▼"), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeBloco(idx),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#dc2626",
      padding: "2px 6px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px"
    }
  }, bloco.tipo === "banner" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Título do banner"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 13
    },
    value: bloco.titulo,
    onChange: e => updateBloco(idx, {
      titulo: e.target.value
    }),
    placeholder: "Título..."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Emoji"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 20,
      textAlign: "center"
    },
    value: bloco.emoji,
    onChange: e => updateBloco(idx, {
      emoji: e.target.value
    }),
    maxLength: 2
  }))), /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Cor de fundo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, ["#7B00C4", "#0891b2", "#059669", "#d97706", "#dc2626", "#db2777", "#6366f1", "#374151"].map(cor => /*#__PURE__*/React.createElement("button", {
    key: cor,
    onClick: () => updateBloco(idx, {
      cor
    }),
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: cor,
      border: bloco.cor === cor ? "3px solid #fff" : "2px solid transparent",
      outline: bloco.cor === cor ? "2px solid " + cor : "none",
      cursor: "pointer"
    }
  })), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: bloco.cor,
    onChange: e => updateBloco(idx, {
      cor: e.target.value
    }),
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      padding: 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      borderRadius: 10,
      padding: "14px 18px",
      background: bloco.cor,
      color: "white",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 24
    }
  }, bloco.emoji), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 15
    }
  }, bloco.titulo || "Preview do banner"))), bloco.tipo === "texto" && /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 4,
    value: bloco.conteudo,
    onChange: e => updateBloco(idx, {
      conteudo: e.target.value
    }),
    placeholder: "Escreva o texto aqui..."
  }), bloco.tipo === "card" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 70
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Ícone"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 20,
      textAlign: "center"
    },
    value: bloco.icone,
    onChange: e => updateBloco(idx, {
      icone: e.target.value
    }),
    maxLength: 2
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Título"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 13
    },
    value: bloco.titulo,
    onChange: e => updateBloco(idx, {
      titulo: e.target.value
    }),
    placeholder: "Título do card..."
  }))), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: bloco.texto,
    onChange: e => updateBloco(idx, {
      texto: e.target.value
    }),
    placeholder: "Texto do card..."
  })), bloco.tipo === "lista" && /*#__PURE__*/React.createElement(React.Fragment, null, bloco.itens.map((item, ii) => /*#__PURE__*/React.createElement("div", {
    key: ii,
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--purple)",
      fontSize: 16
    }
  }, "•"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1,
      fontSize: 13
    },
    value: item,
    onChange: e => updateBloco(idx, {
      itens: bloco.itens.map((v, i) => i === ii ? e.target.value : v)
    }),
    placeholder: `Item ${ii + 1}...`
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => updateBloco(idx, {
      itens: bloco.itens.filter((_, i) => i !== ii)
    }),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#dc2626"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12
    },
    onClick: () => updateBloco(idx, {
      itens: [...bloco.itens, ""]
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), " Adicionar item")), bloco.tipo === "imagem" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "URL da imagem"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      marginBottom: 8,
      fontSize: 13
    },
    value: bloco.url,
    onChange: e => updateBloco(idx, {
      url: e.target.value
    }),
    placeholder: "https://..."
  }), /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Legenda (opcional)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 13
    },
    value: bloco.legenda,
    onChange: e => updateBloco(idx, {
      legenda: e.target.value
    }),
    placeholder: "Legenda da imagem..."
  }), bloco.url && /*#__PURE__*/React.createElement("img", {
    src: bloco.url,
    alt: "",
    style: {
      marginTop: 10,
      maxWidth: "100%",
      borderRadius: 8,
      maxHeight: 160,
      objectFit: "cover"
    },
    onError: e => e.target.style.display = "none"
  })), bloco.tipo === "grafico_barras" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Título do gráfico"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      marginBottom: 10,
      fontSize: 13
    },
    value: bloco.titulo,
    onChange: e => updateBloco(idx, {
      titulo: e.target.value
    }),
    placeholder: "Ex: Áreas da minha vida"
  }), bloco.itens.map((item, ii) => /*#__PURE__*/React.createElement("div", {
    key: ii,
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      flex: 2,
      fontSize: 13
    },
    value: item.label,
    onChange: e => updateBloco(idx, {
      itens: bloco.itens.map((v, i) => i === ii ? {
        ...v,
        label: e.target.value
      } : v)
    }),
    placeholder: `Rótulo ${ii + 1}`
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    className: "form-input",
    style: {
      width: 70,
      fontSize: 13
    },
    min: 0,
    max: 100,
    value: item.valor,
    onChange: e => updateBloco(idx, {
      itens: bloco.itens.map((v, i) => i === ii ? {
        ...v,
        valor: Number(e.target.value)
      } : v)
    })
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => updateBloco(idx, {
      itens: bloco.itens.filter((_, i) => i !== ii)
    }),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#dc2626"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12
    },
    onClick: () => updateBloco(idx, {
      itens: [...bloco.itens, {
        label: "",
        valor: 0
      }]
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), " Adicionar barra")), bloco.tipo === "grafico_radar" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Título do gráfico"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      marginBottom: 10,
      fontSize: 13
    },
    value: bloco.titulo,
    onChange: e => updateBloco(idx, {
      titulo: e.target.value
    }),
    placeholder: "Ex: Roda da Vida"
  }), bloco.eixos.map((eixo, ii) => /*#__PURE__*/React.createElement("div", {
    key: ii,
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      flex: 2,
      fontSize: 13
    },
    value: eixo.label,
    onChange: e => updateBloco(idx, {
      eixos: bloco.eixos.map((v, i) => i === ii ? {
        ...v,
        label: e.target.value
      } : v)
    }),
    placeholder: `Eixo ${ii + 1}`
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    className: "form-input",
    style: {
      width: 70,
      fontSize: 13
    },
    min: 0,
    max: 10,
    value: eixo.valor,
    onChange: e => updateBloco(idx, {
      eixos: bloco.eixos.map((v, i) => i === ii ? {
        ...v,
        valor: Number(e.target.value)
      } : v)
    })
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => updateBloco(idx, {
      eixos: bloco.eixos.filter((_, i) => i !== ii)
    }),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#dc2626"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12
    },
    onClick: () => updateBloco(idx, {
      eixos: [...bloco.eixos, {
        label: "",
        valor: 0
      }]
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), " Adicionar eixo")), bloco.tipo === "grafico_pizza" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Título do gráfico"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      marginBottom: 10,
      fontSize: 13
    },
    value: bloco.titulo,
    onChange: e => updateBloco(idx, {
      titulo: e.target.value
    }),
    placeholder: "Ex: Como uso meu tempo"
  }), bloco.fatias.map((fatia, ii) => /*#__PURE__*/React.createElement("div", {
    key: ii,
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      flex: 2,
      fontSize: 13
    },
    value: fatia.label,
    onChange: e => updateBloco(idx, {
      fatias: bloco.fatias.map((v, i) => i === ii ? {
        ...v,
        label: e.target.value
      } : v)
    }),
    placeholder: `Fatia ${ii + 1}`
  }), /*#__PURE__*/React.createElement("input", {
    type: "number",
    className: "form-input",
    style: {
      width: 70,
      fontSize: 13
    },
    min: 0,
    max: 100,
    value: fatia.valor,
    onChange: e => updateBloco(idx, {
      fatias: bloco.fatias.map((v, i) => i === ii ? {
        ...v,
        valor: Number(e.target.value)
      } : v)
    })
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, "%"), /*#__PURE__*/React.createElement("button", {
    onClick: () => updateBloco(idx, {
      fatias: bloco.fatias.filter((_, i) => i !== ii)
    }),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#dc2626"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12
    },
    onClick: () => updateBloco(idx, {
      fatias: [...bloco.fatias, {
        label: "",
        valor: 0
      }]
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), " Adicionar fatia")), bloco.tipo === "slider" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Pergunta"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    style: {
      marginBottom: 10,
      fontSize: 13
    },
    value: bloco.pergunta,
    onChange: e => updateBloco(idx, {
      pergunta: e.target.value
    }),
    placeholder: "Ex: Como você está se sentindo hoje?"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Mínimo"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    className: "form-input",
    value: bloco.min,
    onChange: e => updateBloco(idx, {
      min: Number(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Máximo"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    className: "form-input",
    value: bloco.max,
    onChange: e => updateBloco(idx, {
      max: Number(e.target.value)
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 2
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Rótulo mín"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: bloco.labelMin,
    onChange: e => updateBloco(idx, {
      labelMin: e.target.value
    }),
    placeholder: "Nada"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 2
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Rótulo máx"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: bloco.labelMax,
    onChange: e => updateBloco(idx, {
      labelMax: e.target.value
    }),
    placeholder: "Muito"
  })))), bloco.tipo === "pergunta" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Pergunta"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    style: {
      marginBottom: 8,
      fontSize: 13
    },
    value: bloco.pergunta,
    onChange: e => updateBloco(idx, {
      pergunta: e.target.value
    }),
    placeholder: "O que você gostaria de compartilhar?"
  }), /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Placeholder (sugestão para a paciente)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 13
    },
    value: bloco.placeholder,
    onChange: e => updateBloco(idx, {
      placeholder: e.target.value
    }),
    placeholder: "Escreva aqui..."
  })), bloco.tipo === "audio" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "URL do áudio ou vídeo"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      marginBottom: 8,
      fontSize: 13
    },
    value: bloco.url,
    onChange: e => updateBloco(idx, {
      url: e.target.value
    }),
    placeholder: "YouTube, Spotify, SoundCloud, Google Drive..."
  }), /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Legenda (opcional)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      fontSize: 13
    },
    value: bloco.legenda,
    onChange: e => updateBloco(idx, {
      legenda: e.target.value
    }),
    placeholder: "Ex: Música para relaxamento"
  })), bloco.tipo === "estrelas" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Pergunta"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    style: {
      marginBottom: 8,
      fontSize: 13
    },
    value: bloco.pergunta,
    onChange: e => updateBloco(idx, {
      pergunta: e.target.value
    }),
    placeholder: "Ex: Como você avalia seu dia?"
  }), /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Máximo de estrelas"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    style: {
      fontSize: 13,
      width: 100
    },
    value: bloco.max,
    onChange: e => updateBloco(idx, {
      max: Number(e.target.value)
    })
  }, [3, 5, 7, 10].map(n => /*#__PURE__*/React.createElement("option", {
    key: n,
    value: n
  }, n, " ⭐")))), bloco.tipo === "checklist" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Título"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      marginBottom: 10,
      fontSize: 13
    },
    value: bloco.titulo,
    onChange: e => updateBloco(idx, {
      titulo: e.target.value
    }),
    placeholder: "Ex: Minha lista de autocuidado"
  }), bloco.itens.map((item, ii) => /*#__PURE__*/React.createElement("div", {
    key: ii,
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, "☐"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1,
      fontSize: 13
    },
    value: item,
    onChange: e => updateBloco(idx, {
      itens: bloco.itens.map((v, i) => i === ii ? e.target.value : v)
    }),
    placeholder: `Item ${ii + 1}...`
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => updateBloco(idx, {
      itens: bloco.itens.filter((_, i) => i !== ii)
    }),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#dc2626"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12
    },
    onClick: () => updateBloco(idx, {
      itens: [...bloco.itens, ""]
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), " Adicionar item")), bloco.tipo === "selecao" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "form-label",
    style: {
      fontSize: 11
    }
  }, "Pergunta"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    style: {
      marginBottom: 8,
      fontSize: 13
    },
    value: bloco.pergunta,
    onChange: e => updateBloco(idx, {
      pergunta: e.target.value
    }),
    placeholder: "Ex: Como você se sente agora?"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 10
    }
  }, ["unica", "multipla"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => updateBloco(idx, {
      tipo_sel: t
    }),
    style: {
      padding: "5px 14px",
      borderRadius: 16,
      border: "1.5px solid",
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "var(--font-body)",
      borderColor: bloco.tipo_sel === t ? "var(--purple)" : "var(--gray-200)",
      background: bloco.tipo_sel === t ? "var(--purple-bg)" : "white",
      color: bloco.tipo_sel === t ? "var(--purple)" : "var(--gray-600)"
    }
  }, t === "unica" ? "☝️ Escolha única" : "☑️ Múltipla escolha"))), bloco.opcoes.map((op, ii) => /*#__PURE__*/React.createElement("div", {
    key: ii,
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--purple)",
      fontSize: 13,
      width: 18
    }
  }, ii + 1, "."), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    style: {
      flex: 1,
      fontSize: 13
    },
    value: op,
    onChange: e => updateBloco(idx, {
      opcoes: bloco.opcoes.map((v, i) => i === ii ? e.target.value : v)
    }),
    placeholder: `Opção ${ii + 1}...`
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => updateBloco(idx, {
      opcoes: bloco.opcoes.filter((_, i) => i !== ii)
    }),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#dc2626"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  })))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12
    },
    onClick: () => updateBloco(idx, {
      opcoes: [...bloco.opcoes, ""]
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 13
  }), " Adicionar opção"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setWizardStep(1)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setWizardStep(3)
  }, "Próximo — Revisar ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 15
  })))), wizardStep === 3 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9f5ff",
      borderRadius: 12,
      padding: "16px 20px",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      marginBottom: 4
    }
  }, form.titulo), form.descricao && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 8
    }
  }, form.descricao), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--purple)",
      fontWeight: 600
    }
  }, MACROCATEGORIAS.find(m => m.subs.some(s => s.id === form.categoria))?.icone, " ", MACROCATEGORIAS.flatMap(m => m.subs).find(s => s.id === form.categoria)?.label || form.categoria)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.6px",
      marginBottom: 10
    }
  }, wizardBlocos.length, " bloco", wizardBlocos.length !== 1 ? "s" : "", " de conteúdo"), wizardBlocos.map((bloco, idx) => {
    const t = TIPOS_BLOCO.find(t => t.id === bloco.tipo);
    return /*#__PURE__*/React.createElement("div", {
      key: bloco.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "white",
        borderRadius: 10,
        border: "1px solid var(--gray-200)",
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18
      }
    }, t?.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, t?.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)"
      }
    }, bloco.tipo === "texto" && (bloco.conteudo?.slice(0, 60) || "—"), bloco.tipo === "banner" && (bloco.titulo || "—"), bloco.tipo === "card" && (bloco.titulo || "—"), bloco.tipo === "lista" && `${bloco.itens.filter(i => i).length} item(s)`, bloco.tipo === "imagem" && (bloco.url ? "URL definida" : "—"), (bloco.tipo === "grafico_barras" || bloco.tipo === "grafico_pizza") && `${bloco.itens?.length || bloco.fatias?.length} item(s)`, bloco.tipo === "grafico_radar" && `${bloco.eixos?.length} eixo(s)`, bloco.tipo === "slider" && `${bloco.min} → ${bloco.max}`, bloco.tipo === "pergunta" && (bloco.pergunta?.slice(0, 60) || "—"), bloco.tipo === "audio" && (bloco.url ? "URL definida" : "—"), bloco.tipo === "estrelas" && `Até ${bloco.max} estrelas`, bloco.tipo === "checklist" && `${bloco.itens.filter(i => i).length} item(s)`, bloco.tipo === "selecao" && `${bloco.opcoes.filter(o => o).length} opção(ões)`)), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setWizardStep(2);
      },
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--purple)",
        fontSize: 12
      }
    }, "editar"));
  }), wizardBlocos.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--text-muted)",
      fontSize: 13,
      padding: "12px 0"
    }
  }, "Nenhum bloco adicionado — a ferramenta terá apenas título e descrição."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setWizardStep(2)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvarWizard,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "save",
    size: 15
  }), " ", salvando ? "Salvando..." : "Salvar Ferramenta")))))));
}

// ═══════════════════════════════════════════════════════
// LAUDOS NEUROPSICOLÓGICOS
// ═══════════════════════════════════════════════════════
// PLACEHOLDER_NOVOS_COMPONENTES
