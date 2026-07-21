// ═══════════════════════════════════════════════════════
//  psico_ui.js — Aba Psicoeducação + Recursos Terapêuticos
//  Clínica Dra. Lucia Kratz — CRP 09/20590
//  Depende de: ferramentas.js + psicoeducacoes.js
//  Carregar 3º no index.html (antes de app.js)
// ═══════════════════════════════════════════════════════

function AbaPsicoeducacao() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [aberto, setAberto] = useState(null);

  // Mapa de categorias legado → nova macrocategoria clínica
  const REMAP_PSICO = {
    "tcc": "macro_ansiedade",
    "ansiedade": "macro_ansiedade",
    "esquema": "macro_ansiedade",
    "emocoes": "macro_humor",
    "autocuidado": "macro_habitos",
    "relacionamentos": "macro_relacionamentos",
    "casais": "macro_casais",
    "corpo": "macro_corpo",
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
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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
  }), " ", salvando ? "Adicionando..." : "Popular pílulas TCC"), itens.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      fontSize: 12
    },
    onClick: sincronizarNovas,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "refresh-cw",
    size: 14
  }), " ", salvando ? "Sincronizando..." : "Sincronizar novas"), itens.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      fontSize: 12
    },
    onClick: migrarCatPsico,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layers",
    size: 14
  }), " Migrar categorias"), itens.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      fontSize: 12,
      background: "#f3e6ff",
      borderColor: "#7B00C4",
      color: "#7B00C4"
    },
    onClick: atualizarVisuaisFirebase,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "zap",
    size: 14
  }), " Ativar visuais"), /*#__PURE__*/React.createElement("button", {
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
      })))));
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
    "corpo": "macro_corpo",
    "alimentacao": "macro_corpo",
    "casal": "macro_casais",
    "musicoterapia": "macro_musico",
    "avaliacao": "macro_aval",
    "compulsao_sexual": "macro_compulsao",
    "compulsao": "macro_compulsao",
    "macro_compulsao": "macro_compulsao",
    // formularioKey → macro
    "breathing-478": "macro_corpo",
    "muscle-relaxation": "macro_corpo",
    "anxiety-management": "macro_ansiedade",
    "decision-tree": "macro_ansiedade",
    "abc-record": "macro_ansiedade",
    "emotional-eating": "macro_corpo",
    "mapa-intimidade": "macro_casais",
    "aterramento-5-sentidos": "macro_corpo",
    "escada-polivagal": "macro_corpo",
    "diario-corpo-mente": "macro_corpo",
    "roda-vida-integral": "macro_habitos",
    "empilhamento-habitos": "macro_habitos",
    "ritual-noturno": "macro_habitos",
    "mapa-bateria": "macro_habitos",
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
  if (loading) return /*#__PURE__*/React.createElement(Spinner, null);
  if (visualizando) return /*#__PURE__*/React.createElement(ModalVisualizarFerramenta, {
    recurso: visualizando,
    onClose: () => setVisualizando(null),
    user: user
  });
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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
  }, recursos.length, " ferramenta", recursos.length !== 1 ? "s" : "", " · ", recursos.filter(r => r.tipo === "interativa").length, " interativas · ", recursos.filter(r => r.tipo === "conteudo").length, " de conteudo")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12
    },
    title: "Corrige categorias antigas no Firebase",
    onClick: async () => {
      if (!confirm("Corrigir categorias de Respiração e Relaxamento no Firebase?")) return;
      const snap = await db.collection("clinica_recursos").get();
      const validas = new Set(["tcc", "ansiedade", "emocoes", "autocuidado", "relacionamentos", "corpo", "esquema", "musicoterapia", "avaliacao", "outro", "casal"]);
      const batch = db.batch();
      let n = 0;
      // Mapa de redistribuição clínica
      const REMAP_KEY = {
        "breathing-478": {
          categoria: "ansiedade_diaria",
          subcategoria: "Ansiedade Diária e Crises"
        },
        "muscle-relaxation": {
          categoria: "nervovago",
          subcategoria: "Regulação do Sistema Nervoso"
        },
        "anxiety-management": {
          categoria: "ansiedade_diaria",
          subcategoria: "Ansiedade Diária e Crises"
        },
        "decision-tree": {
          categoria: "procrastinacao",
          subcategoria: "Procrastinação e Foco"
        },
        "abc-record": {
          categoria: "distorcoes",
          subcategoria: "Distorções Cognitivas e Ruminação"
        },
        "emotional-eating": {
          categoria: "alimentacao",
          subcategoria: "Alimentação Emocional e Compulsão"
        },
        "treino-neuro-auditivo": {
          categoria: "musicoterapia",
          subcategoria: ""
        },
        "entrevista-clinica": {
          categoria: "avaliacao",
          subcategoria: ""
        },
        "anamnese": {
          categoria: "avaliacao",
          subcategoria: ""
        }
      };
      const MANTER = new Set(["musicoterapia", "avaliacao"]);
      snap.docs.forEach(doc => {
        const d = doc.data();
        const remap = REMAP_KEY[d.formularioKey];
        if (remap) {
          batch.update(doc.ref, {
            categoria: remap.categoria,
            subcategoria: remap.subcategoria
          });
          n++;
        } else if (!validas.has(d.categoria) && !MANTER.has(d.categoria)) {
          batch.update(doc.ref, {
            categoria: "outro"
          });
          n++;
        }
      });
      if (n === 0) {
        alert("✅ Nenhuma correção necessária — todas as categorias já estão corretas!");
        return;
      }
      await batch.commit();
      alert(`✅ ${n} ferramenta(s) corrigida(s)! Respiração e Relaxamento agora aparecem em Ansiedade.`);
    }
  }, "🔧 Corrigir Categorias"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      setForm({
        titulo: "",
        descricao: "",
        categoria: "tcc",
        tipo: "interativa",
        formularioKey: "",
        musicUrl: ""
      });
      setEditando(null);
      setModal(true);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Nova Ferramenta"))), /*#__PURE__*/React.createElement("div", {
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
  })), /*#__PURE__*/React.createElement("div", {
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
    const n = recursos.filter(r => r.categoria === m.id || subIds.has(r.categoria) || legadoIds.has(r.categoria)).length;
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
      display: "flex",
      gap: 8,
      borderTop: "1px solid var(--gray-100)",
      paddingTop: 10
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
  }), " Editar"), r.formularioKey === "anamnese" && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 12,
      flex: 2,
      color: "#059669",
      border: "1px solid #059669"
    },
    onClick: () => {
      const link = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/anamnese-publica/";
      navigator.clipboard.writeText(link).then(() => {
        alert("✅ Link copiado!\n\nCole no WhatsApp para o paciente:\n\n" + link);
      }).catch(() => {
        window.prompt("Copie o link abaixo e envie para o paciente:", link);
      });
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), " 🔗 Copiar Link"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px",
      color: "var(--danger)"
    },
    onClick: () => excluir(r.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }))))))))), modal && /*#__PURE__*/React.createElement("div", {
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
      maxWidth: 600,
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
  }, editando ? "Editar Ferramenta" : "Nova Ferramenta"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal(false),
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
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Titulo da Ferramenta *"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.titulo,
    onChange: e => setForm({
      ...form,
      titulo: e.target.value
    }),
    autoFocus: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Descricao curta"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: form.descricao,
    onChange: e => setForm({
      ...form,
      descricao: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
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
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Tipo de ferramenta"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, [["conteudo", "Conteudo para leitura", "file-text"], ["interativa", "Formulario interativo", "zap"]].map(([v, l, ic]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setForm({
      ...form,
      tipo: v
    }),
    style: {
      flex: 1,
      padding: "12px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: form.tipo === v ? "var(--purple)" : "var(--gray-200)",
      background: form.tipo === v ? "var(--purple-bg)" : "white",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "var(--font-body)",
      color: form.tipo === v ? "var(--purple)" : "var(--gray-700)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 15
  }), l)))), form.tipo === "interativa" && /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Formulario interativo"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.formularioKey,
    onChange: e => setForm({
      ...form,
      formularioKey: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar formulario..."), FERRAMENTAS_INTERATIVAS.map(f => /*#__PURE__*/React.createElement("option", {
    key: f.key,
    value: f.key
  }, f.label)))), (form.formularioKey === "breathing-478" || form.formularioKey === "muscle-relaxation") && /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "🎵 Link de Música (YouTube) — opcional"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.musicUrl || "",
    onChange: e => setForm({
      ...form,
      musicUrl: e.target.value
    }),
    placeholder: "https://www.youtube.com/watch?v=..."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "Tocará em loop durante o exercício no portal do paciente.")), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "🎬 Link de Áudio ou Vídeo complementar — opcional"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.mediaUrl || "",
    onChange: e => setForm({
      ...form,
      mediaUrl: e.target.value
    }),
    placeholder: "YouTube, Spotify, SoundCloud, Google Drive..."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "Aparecerá como botão \"▶ Ouvir / Assistir\" no portal do paciente junto com a ferramenta.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal(false)
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "save",
    size: 15
  }), " ", salvando ? "Salvando..." : "Salvar Alteracoes")))));
}

// ═══════════════════════════════════════════════════════
// LAUDOS NEUROPSICOLÓGICOS
// ═══════════════════════════════════════════════════════
// PLACEHOLDER_NOVOS_COMPONENTES
