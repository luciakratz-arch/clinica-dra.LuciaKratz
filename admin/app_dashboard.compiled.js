function DashboardAdmin({
  user,
  onVerEvolucao
}) {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  // Disponibilizar lista de pacientes para o feed resolver nomes ausentes
  useEffect(() => {
    window._pacientesCache = pacientes;
  }, [pacientes]);
  const [lancClinica, setLancClinica] = useState([]);
  const [lancPessoal, setLancPessoal] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [atividades, setAtividades] = useState({});
  const [loadingAtiv, setLoadingAtiv] = useState(true);
  const [rastreamentos, setRastreamentos] = useState([]);
  const [ultimaVisita] = useState(() => {
    const v = localStorage.getItem("dashboard_ultima_visita");
    const agora = new Date().toISOString();
    localStorage.setItem("dashboard_ultima_visita", agora);
    return v ? new Date(v) : new Date(0);
  });
  useEffect(() => {
    const u1 = db.collection("clinica_lancamentos").onSnapshot(s => setLancClinica(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    const u2 = db.collection("clinica_financeiro_pessoal").onSnapshot(s => setLancPessoal(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    const u3 = db.collection("clinica_sessoes").onSnapshot(s => setSessoes(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});

    // Buscar rastreamentos recentes (últimos 7 dias) de todas as coleções
    const limite7 = new Date();
    limite7.setDate(limite7.getDate() - 7);
    const COLS_RAST = [{
      col: "clinica_rastreamento_bipolar",
      label: "Bipolar / Borderline",
      emoji: "📊"
    }, {
      col: "clinica_rastreamento_neuro",
      label: "Funcionamento e Comportamento",
      emoji: "🧩"
    }, {
      col: "clinica_rastreamento_alimentar",
      label: "Hábitos Alimentares",
      emoji: "🍎"
    }, {
      col: "clinica_rastreamento_sexual",
      label: "Saúde Sexual",
      emoji: "🌸"
    }];
    Promise.all(COLS_RAST.map(({
      col,
      label,
      emoji
    }) => db.collection(col).get().then(snap => snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      _tipo: label,
      _emoji: emoji
    }))).catch(() => []))).then(resultados => {
      const todos = resultados.flat().filter(d => {
        const ts = d.createdAt?.toDate?.();
        return ts && ts >= limite7;
      }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 10);
      // Agrupar por paciente: mantém o mais recente de cada paciente+tipo
      const porPaciente = {};
      todos.forEach(r => {
        const chave = (r.pacienteId || r.pacienteNome || "?") + "||" + r._tipo;
        if (!porPaciente[chave] || (r.createdAt?.seconds || 0) > (porPaciente[chave].createdAt?.seconds || 0)) {
          porPaciente[chave] = r;
        }
      });
      setRastreamentos(Object.values(porPaciente).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 10));
    });
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  // Buscar atividades dos últimos 8 dias
  useEffect(() => {
    if (!pacientes || pacientes.length === 0) return;
    const limite = new Date();
    limite.setDate(limite.getDate() - 8);
    const limiteStr = limite.toISOString().slice(0, 10);
    const COLS = [{
      col: "clinica_diario",
      label: "📓 Diário",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_humor",
      label: "😊 Humor",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_metas",
      label: "🎯 Metas",
      campoData: "updatedAt",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_tcc",
      label: "🧠 TCC",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_reflexoes",
      label: "💭 Reflexão",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_gestao_ansiedade",
      label: "🗂️ Macroatividades",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_arvore_decisao",
      label: "🌳 Árvore Decisão",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }, {
      col: "clinica_atividades",
      label: "✅ Atividades",
      campoData: "data",
      campoNome: "pacienteNome",
      campoPacId: "pacienteId"
    }];
    let pending = COLS.length;
    const agrupado = {};
    COLS.forEach(({
      col,
      label,
      campoData,
      campoNome,
      campoPacId
    }) => {
      db.collection(col).get().then(snap => {
        snap.docs.forEach(d => {
          const doc = d.data();
          let dataStr = doc[campoData];
          if (dataStr?.toDate) dataStr = dataStr.toDate().toISOString().slice(0, 10);
          if (!dataStr || dataStr < limiteStr) return;
          const pacId = doc[campoPacId] || doc.pacienteId || "";
          const pacNome = doc[campoNome] || doc.pacienteNome || "";
          if (!pacId) return;
          if (!agrupado[pacId]) agrupado[pacId] = {
            nome: pacNome,
            itens: {},
            ultimaAtividade: null
          };
          if (!agrupado[pacId].itens[label]) agrupado[pacId].itens[label] = 0;
          agrupado[pacId].itens[label]++;
          if (pacNome && !agrupado[pacId].nome) agrupado[pacId].nome = pacNome;
          // Registrar data mais recente de atividade
          let dataAtiv = doc[campoData];
          if (dataAtiv?.toDate) dataAtiv = dataAtiv.toDate().toISOString();
          if (dataAtiv && (!agrupado[pacId].ultimaAtividade || dataAtiv > agrupado[pacId].ultimaAtividade)) agrupado[pacId].ultimaAtividade = dataAtiv;
        });
        pending--;
        if (pending === 0) {
          // Resolver nomes vazios pela lista de pacientes
          Object.keys(agrupado).forEach(pid => {
            if (!agrupado[pid].nome) {
              const pac = pacientes.find(p => p.id === pid);
              if (pac) agrupado[pid].nome = pac.nome || "";
            }
          });
          setAtividades({
            ...agrupado
          });
          setLoadingAtiv(false);
        }
      }).catch(() => {
        pending--;
        if (pending === 0) {
          // Resolver nomes vazios pela lista de pacientes
          Object.keys(agrupado).forEach(pid => {
            if (!agrupado[pid].nome) {
              const pac = pacientes.find(p => p.id === pid);
              if (pac) agrupado[pid].nome = pac.nome || "";
            }
          });
          setAtividades({
            ...agrupado
          });
          setLoadingAtiv(false);
        }
      });
    });
  }, [pacientes]);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const ativos = pacientes.filter(p => p.status === "ativo").length;
  const sessoesHoje = sessoes.filter(s => s.data === new Date().toISOString().slice(0, 10)).length;
  function fmt(v) {
    return v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  // Clínica mês
  const lcMes = lancClinica.filter(l => l.data?.startsWith(mesAtual));
  const recClinica = lcMes.filter(l => l.tipo_lancamento !== "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const despClinica = lcMes.filter(l => l.tipo_lancamento === "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);

  // Pessoal mês
  const lpMes = lancPessoal.filter(l => l.data?.startsWith(mesAtual));
  const recPessoal = lpMes.filter(l => l.tipo === "receita" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const despPessoal = lpMes.filter(l => l.tipo === "despesa" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const totalRec = recClinica + recPessoal;
  const totalDesp = despClinica + despPessoal;
  const saldoMes = totalRec - totalDesp;

  // Acumulado ano
  const anoAtual = new Date().getFullYear() + "";
  const lcAno = lancClinica.filter(l => l.data?.startsWith(anoAtual));
  const lpAno = lancPessoal.filter(l => l.data?.startsWith(anoAtual));
  const recAno = lcAno.filter(l => l.tipo_lancamento !== "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0) + lpAno.filter(l => l.tipo === "receita" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const despAno = lcAno.filter(l => l.tipo_lancamento === "despesa" && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0) + lpAno.filter(l => l.tipo === "despesa" && (l.status === "pago" || l.status === "recebido")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const saldoAno = recAno - despAno;
  const pacAtivos = Object.entries(atividades).filter(([, v]) => Object.keys(v.itens).length > 0).sort((a, b) => (a[1].nome || "").localeCompare(b[1].nome || ""));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-title"
  }, "Dashboard"), /*#__PURE__*/React.createElement("div", {
    className: "page-subtitle",
    style: {
      textTransform: "capitalize"
    }
  }, hoje)), /*#__PURE__*/React.createElement("div", {
    className: "metrics-grid",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "metric-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "metric-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "metric-label"
  }, "Pacientes Ativos"), /*#__PURE__*/React.createElement("div", {
    className: "metric-value"
  }, ativos), /*#__PURE__*/React.createElement("div", {
    className: "metric-sub"
  }, pacientes.length, " total")), /*#__PURE__*/React.createElement("div", {
    className: "metric-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "metric-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "calendar",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "metric-label"
  }, "Sessões Hoje"), /*#__PURE__*/React.createElement("div", {
    className: "metric-value"
  }, sessoesHoje), /*#__PURE__*/React.createElement("div", {
    className: "metric-sub"
  }, "agendadas")), /*#__PURE__*/React.createElement("div", {
    className: "metric-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "metric-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "package",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "metric-label"
  }, "Pendente Clínica"), /*#__PURE__*/React.createElement("div", {
    className: "metric-value",
    style: {
      fontSize: 18,
      color: "#d97706"
    }
  }, fmt(lcMes.filter(l => l.status === "pendente").reduce((a, l) => a + (parseFloat(l.valor) || 0), 0)))), /*#__PURE__*/React.createElement("div", {
    className: "metric-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "metric-icon"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "metric-label"
  }, "Casais em Terapia"), /*#__PURE__*/React.createElement("div", {
    className: "metric-value"
  }, pacientes.filter(p => p.casalId).length / 2 | 0))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      marginBottom: 4,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "activity",
    size: 18
  }), " Atividades dos últimos 8 dias"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Pacientes que interagiram no app"), loadingAtiv ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement(Spinner, null)) : pacAtivos.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 24,
      color: "var(--text-muted)",
      fontSize: 14
    }
  }, "Nenhuma atividade nos últimos 8 dias.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, pacAtivos.map(([pacId, info]) => {
    const maisRecente = info.ultimaAtividade ? new Date(info.ultimaAtividade) : new Date(0);
    const isNovo = maisRecente > ultimaVisita;
    return /*#__PURE__*/React.createElement("div", {
      key: pacId,
      style: {
        border: isNovo ? "1.5px solid var(--purple)" : "1px solid var(--gray-200)",
        borderRadius: 12,
        padding: "14px 18px",
        background: isNovo ? "var(--purple-soft)" : "var(--gray-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "relative",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "var(--purple-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        color: "var(--purple)",
        fontSize: 14
      }
    }, (info.nome || "?").charAt(0).toUpperCase()), isNovo && /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: "var(--purple)",
        border: "2px solid white"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        fontSize: 14
      }
    }, info.nome || "Paciente"), isNovo && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        background: "var(--purple)",
        color: "white",
        borderRadius: 20,
        padding: "1px 8px",
        fontWeight: 600
      }
    }, "NOVO")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6
      }
    }, Object.entries(info.itens).map(([label, count]) => /*#__PURE__*/React.createElement("span", {
      key: label,
      style: {
        fontSize: 12,
        background: "white",
        border: "1px solid var(--gray-200)",
        borderRadius: 20,
        padding: "2px 10px",
        color: "var(--text-muted)"
      }
    }, label, " ", count > 1 ? `(${count})` : ""))))), /*#__PURE__*/React.createElement("button", {
      onClick: () => onVerEvolucao && onVerEvolucao(pacId),
      style: {
        background: "var(--purple)",
        color: "white",
        border: "none",
        borderRadius: 8,
        padding: "7px 16px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "var(--font-body)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "trending-up",
      size: 13
    }), " Ver Evolução"));
  }))), rastreamentos.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      marginBottom: 4,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clipboard-list",
    size: 18
  }), " Rastreamentos Recebidos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Respondidos nos últimos 7 dias"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, rastreamentos.map(r => {
    const ts = r.createdAt?.toDate?.();
    const agora = new Date();
    const diff = ts ? Math.round((agora - ts) / 1000 / 60) : null;
    const tempo = diff === null ? "" : diff < 60 ? `há ${diff} min` : diff < 1440 ? `há ${Math.round(diff / 60)}h` : `há ${Math.round(diff / 1440)} dia${Math.round(diff / 1440) > 1 ? "s" : ""}`;
    const respondente = r.tipoRespondente === "paciente" ? "Próprio paciente" : r.parentesco || r.nomeRespondente || "Familiar";
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      style: {
        border: "1px solid var(--gray-200)",
        borderRadius: 12,
        padding: "12px 16px",
        background: "var(--gray-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 28,
        flexShrink: 0
      }
    }, r._emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14,
        marginBottom: 2
      }
    }, r.pacienteNome || "Paciente"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, r._tipo, " · ", respondente), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, tempo))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        background: "var(--purple-soft)",
        color: "var(--purple)",
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600
      }
    }, "Novo ✓"), r.pacienteId && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        window._pacienteInicialId = r.pacienteId;
        window._pacienteAbaInicial = "questionarios";
        // Emitir evento para o App navegar até Pacientes
        window.dispatchEvent(new CustomEvent("irParaPaciente", {
          detail: {
            pacienteId: r.pacienteId,
            aba: "questionarios"
          }
        }));
      },
      style: {
        background: "var(--purple)",
        color: "white",
        border: "none",
        borderRadius: 8,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        display: "flex",
        alignItems: "center",
        gap: 5
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "external-link",
      size: 12
    }), " Ver")));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bar-chart-2",
    size: 18
  }), " Resumo Financeiro — ", new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
      gap: 10,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: saldoMes >= 0 ? "#d1fae5" : "#fee2e2",
      borderRadius: 12,
      padding: "16px 20px",
      border: "1.5px solid",
      borderColor: saldoMes >= 0 ? "#6ee7b7" : "#fca5a5"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: saldoMes >= 0 ? "#059669" : "#dc2626",
      marginBottom: 6
    }
  }, "Saldo do Mês (Geral)"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 800,
      color: saldoMes >= 0 ? "#059669" : "#dc2626"
    }
  }, fmt(saldoMes)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6b7280",
      marginTop: 4
    }
  }, "Clínica + Pessoal")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f0fdf4",
      borderRadius: 12,
      padding: "16px 20px",
      border: "1.5px solid #86efac"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "#059669",
      marginBottom: 6
    }
  }, "Total Receitas"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: "#059669"
    }
  }, fmt(totalRec)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6b7280",
      marginTop: 4
    }
  }, "Clínica: ", fmt(recClinica), " · Pessoal: ", fmt(recPessoal))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fef2f2",
      borderRadius: 12,
      padding: "16px 20px",
      border: "1.5px solid #fca5a5"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "#dc2626",
      marginBottom: 6
    }
  }, "Total Despesas"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 800,
      color: "#dc2626"
    }
  }, fmt(totalDesp)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6b7280",
      marginTop: 4
    }
  }, "Clínica: ", fmt(despClinica), " · Pessoal: ", fmt(despPessoal)))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--gray-100)",
      paddingTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 12,
      fontSize: 14,
      color: "var(--text-muted)"
    }
  }, "Acumulado ", anoAtual), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderRadius: 10,
      background: "var(--gray-50)",
      border: "1px solid var(--gray-200)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Receitas ", anoAtual), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: "#059669"
    }
  }, fmt(recAno))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderRadius: 10,
      background: "var(--gray-50)",
      border: "1px solid var(--gray-200)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Despesas ", anoAtual), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: "#dc2626"
    }
  }, fmt(despAno))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderRadius: 10,
      background: saldoAno >= 0 ? "#f0fdf4" : "#fef2f2",
      border: "1px solid",
      borderColor: saldoAno >= 0 ? "#86efac" : "#fca5a5"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "Saldo Acumulado ", anoAtual), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      color: saldoAno >= 0 ? "#059669" : "#dc2626"
    }
  }, fmt(saldoAno)))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Bem-vinda, ", user.nome, " 🦋"), /*#__PURE__*/React.createElement("a", {
    href: "../clinica/",
    style: {
      fontSize: 13,
      color: "var(--purple)",
      display: "flex",
      alignItems: "center",
      gap: 6,
      width: "fit-content",
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external-link",
    size: 14
  }), " Portal do Paciente")));
}

// ABA PERFIL
function PerfilPaciente({
  paciente,
  onVoltar,
  pacientes,
  user,
  abaInicial
}) {
  const [aba, setAba] = useState(abaInicial || "perfil");
  const isSecretaria = user?.tipo === "secretaria";
  const ABAS = [{
    id: "perfil",
    label: "Perfil",
    icon: "user"
  }, ...(!isSecretaria ? [{
    id: "modulos",
    label: "Modulos",
    icon: "toggle-right"
  }, {
    id: "modulo1",
    label: "Módulo 1",
    icon: "layout-grid"
  }, {
    id: "metas",
    label: "Metas",
    icon: "target"
  }, {
    id: "laudos",
    label: "Laudos",
    icon: "file-text"
  }, {
    id: "evolucao",
    label: "Evolucao",
    icon: "trending-up"
  }, {
    id: "casal",
    label: "Terapia de Casal",
    icon: "heart"
  }, {
    id: "nr1",
    label: "Saúde Ocupacional",
    icon: "briefcase"
  }, {
    id: "questionarios",
    label: "Questionários",
    icon: "clipboard-list"
  }, {
    id: "links",
    label: "Links Partilhados",
    icon: "link"
  }] : [])];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: onVoltar,
    style: {
      padding: "8px 12px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-title",
    style: {
      fontSize: 24
    }
  }, paciente.nome), /*#__PURE__*/React.createElement("div", {
    className: "page-subtitle"
  }, "Perfil clinico completo · ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      cursor: "pointer"
    },
    onClick: () => {
      navigator.clipboard.writeText(paciente.id);
      alert("ID copiado: " + paciente.id);
    }
  }, "ID: ", paciente.id, " 📋"))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: async () => {
      if (!confirm("Excluir paciente?")) return;
      await db.collection("clinica_pacientes").doc(paciente.id).delete();
      onVoltar();
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 15
  }), " Excluir paciente")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 24,
      overflowX: "auto",
      borderBottom: "1px solid var(--gray-200)",
      flexShrink: 0,
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none"
    }
  }, ABAS.map(a => /*#__PURE__*/React.createElement("button", {
    key: a.id,
    onClick: () => setAba(a.id),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "10px 16px",
      border: "none",
      background: "none",
      fontSize: 14,
      cursor: "pointer",
      fontFamily: "var(--font-body)",
      color: aba === a.id ? "var(--purple)" : "var(--gray-600)",
      borderBottom: aba === a.id ? "2px solid var(--purple)" : "2px solid transparent",
      fontWeight: aba === a.id ? 500 : 400,
      transition: "all .2s",
      marginBottom: -1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: a.icon,
    size: 15
  }), a.label))), aba === "perfil" && /*#__PURE__*/React.createElement(AbaPerfil, {
    paciente: paciente,
    pacientes: pacientes
  }), aba === "modulos" && /*#__PURE__*/React.createElement(AbaModulos, {
    paciente: paciente
  }), aba === "modulo1" && /*#__PURE__*/React.createElement(AbaModulo1, {
    paciente: paciente
  }), aba === "metas" && /*#__PURE__*/React.createElement(AbaMetas, {
    paciente: paciente
  }), aba === "laudos" && /*#__PURE__*/React.createElement(EmBreve, {
    titulo: "Laudos",
    subtitulo: "Etapa 10"
  }), aba === "evolucao" && /*#__PURE__*/React.createElement(AbaEvolucao, {
    paciente: paciente
  }), aba === "casal" && /*#__PURE__*/React.createElement(AbaCasal, {
    paciente: paciente,
    pacientes: pacientes
  }), aba === "nr1" && /*#__PURE__*/React.createElement(AbaOcupacional, {
    paciente: paciente
  }), aba === "questionarios" && /*#__PURE__*/React.createElement(AbaQuestionarios, {
    paciente: paciente
  }), aba === "links" && /*#__PURE__*/React.createElement(AbaLinksPartilhados, {
    paciente: paciente
  }));
}

// LISTA PACIENTES
const MOD1_PADRAO = {
  mod1: {
    ativo: true,
    ferramentas: {
      humor: {
        ativo: true,
        dataInicio: new Date().toISOString().slice(0, 10)
      },
      metas: {
        ativo: true,
        dataInicio: new Date().toISOString().slice(0, 10)
      },
      diario: {
        ativo: true,
        dataInicio: new Date().toISOString().slice(0, 10)
      }
    }
  }
};
function Pacientes({
  user
}) {
  const {
    data: pacientes,
    loading
  } = useCollection("clinica_pacientes", "nome");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [modal, setModal] = useState(false);
  const [modalImport, setModalImport] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(null);
  const [abaInicialPerfil, setAbaInicialPerfil] = useState(null);

  // Navegar direto para um paciente vindo do Dashboard
  useEffect(() => {
    if (window._pacienteInicialId) {
      setPerfilAberto(window._pacienteInicialId);
      setAbaInicialPerfil(window._pacienteAbaInicial || "evolucao");
      window._pacienteInicialId = null;
      window._pacienteAbaInicial = null;
    }
    function handleIrParaPaciente(e) {
      setPerfilAberto(e.detail.pacienteId);
      setAbaInicialPerfil(e.detail.aba || "questionarios");
    }
    window.addEventListener("irParaPaciente", handleIrParaPaciente);
    return () => window.removeEventListener("irParaPaciente", handleIrParaPaciente);
  }, []);
  const [importLog, setImportLog] = useState([]);
  const [importando, setImportando] = useState(false);
  async function processarExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    setImportLog([{
      tipo: "info",
      msg: "Lendo arquivo..."
    }]);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const text = ev.target.result;
        const linhas = text.split(/\r?\n/).filter(l => l.trim());
        if (linhas.length < 2) {
          setImportLog([{
            tipo: "err",
            msg: "Arquivo vazio ou sem dados."
          }]);
          setImportando(false);
          return;
        }
        const header = linhas[0].split(/[,;\t]/).map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
        const idx = {
          nome: header.findIndex(h => h.includes("nome")),
          email: header.findIndex(h => h.includes("email") || h.includes("mail")),
          telefone: header.findIndex(h => h.includes("tel") || h.includes("fone") || h.includes("celular")),
          cpf: header.findIndex(h => h.includes("cpf") || h.includes("documento")),
          nasc: header.findIndex(h => h.includes("nasc") || h.includes("data")),
          genero: header.findIndex(h => h.includes("gen") || h.includes("sexo"))
        };
        const log = [];
        let ok = 0,
          err = 0;
        for (let i = 1; i < linhas.length; i++) {
          const cols = linhas[i].split(/[,;\t]/);
          const nome = idx.nome >= 0 ? cols[idx.nome]?.trim() : "";
          if (!nome) continue;
          try {
            const email = idx.email >= 0 ? cols[idx.email]?.trim() || `sem-email-${Date.now()}@interno.local` : `sem-email-${Date.now()}@interno.local`;
            await db.collection("clinica_pacientes").add({
              nome,
              email,
              telefone: idx.telefone >= 0 ? cols[idx.telefone]?.trim() || "" : "",
              cpf: idx.cpf >= 0 ? cols[idx.cpf]?.trim() || "" : "",
              dataNascimento: idx.nasc >= 0 ? cols[idx.nasc]?.trim() || "" : "",
              genero: idx.genero >= 0 ? cols[idx.genero]?.trim() || "Não informar" : "Não informar",
              status: "ativo",
              senha: "",
              objetivosTerapeuticos: "",
              observacoesClinicas: "",
              origem: "importacao-excel",
              modulosConfig: MOD1_PADRAO,
              modulosAtivos: ["mod1"],
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            ok++;
            log.push({
              tipo: "ok",
              msg: `✓ ${nome}`
            });
          } catch (er) {
            err++;
            log.push({
              tipo: "err",
              msg: `✗ ${nome}: ${er.message}`
            });
          }
        }
        log.unshift({
          tipo: "info",
          msg: `Concluído: ${ok} importados · ${err} erro(s)`
        });
        setImportLog(log);
      } catch (er) {
        setImportLog([{
          tipo: "err",
          msg: "Erro ao ler arquivo: " + er.message
        }]);
      } finally {
        setImportando(false);
      }
    };
    reader.readAsText(file, "UTF-8");
  }
  function baixarTemplate() {
    const csv = "Nome,Email,Telefone,CPF,DataNascimento,Genero\nJoão Silva,joao@email.com,(62) 99999-0000,000.000.000-00,01/01/1990,Masculino\n";
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-pacientes.csv";
    a.click();
  }
  if (perfilAberto) {
    const pac = pacientes.find(p => p.id === perfilAberto);
    if (pac) return /*#__PURE__*/React.createElement(PerfilPaciente, {
      paciente: pac,
      onVoltar: () => {
        setPerfilAberto(null);
        setAbaInicialPerfil(null);
      },
      pacientes: pacientes,
      abaInicial: abaInicialPerfil
    });
  }
  const filtrados = pacientes.filter(p => {
    const ok = filtro === "todos" || p.status === filtro;
    const bk = !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()) || p.email?.toLowerCase().includes(busca.toLowerCase());
    return ok && bk;
  }).sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  function abrirNovo() {
    setForm({
      nome: "",
      email: "",
      telefone: "",
      status: "ativo",
      genero: "",
      dataNasc: "",
      cpf: "",
      objetivos: ""
    });
    setModal(true);
  }
  async function salvar() {
    if (!form.nome || !form.email) {
      alert("Nome e e-mail obrigatorios.");
      return;
    }
    setSalvando(true);
    await db.collection("clinica_pacientes").add({
      ...form,
      senha: "1234",
      modulosConfig: MOD1_PADRAO,
      modulosAtivos: ["mod1"],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setModal(false);
    setSalvando(false);
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
  }, "Pacientes"), /*#__PURE__*/React.createElement("div", {
    className: "page-subtitle"
  }, pacientes.filter(p => p.status === "ativo").length, " ativos · ", pacientes.filter(p => p.status === "alta").length, " com alta · ", pacientes.filter(p => p.status === "inativo").length, " inativos")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 13
    },
    onClick: () => setModalImport(true)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "upload",
    size: 15
  }), " Importar Excel"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      fontSize: 13
    },
    onClick: () => {
      const url = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/cadastro/";
      const texto = `🦋 *Clínica Dra. Lucia Kratz*\n\nOlá! Para agilizar o seu atendimento, preencha o formulário de cadastro pelo link abaixo:\n\n👉 ${url}\n\nÉ rápido e seguro. Após o preenchimento, seus dados já estarão disponíveis para a sua psicóloga.\n\nQualquer dúvida, estamos à disposição! 💜`;
      navigator.clipboard.writeText(texto).then(() => alert("✓ Texto + link copiado!\nCole direto no WhatsApp.")).catch(() => prompt("Copie o texto:", texto));
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 15
  }), " Link de Cadastro"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: abrirNovo
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user-plus",
    size: 16
  }), " Novo Paciente"))), /*#__PURE__*/React.createElement("div", {
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
  }), [["todos", "Todos"], ["ativo", "Em atendimento"], ["alta", "Alta"], ["inativo", "Inativos"]].map(([f, l]) => /*#__PURE__*/React.createElement("button", {
    key: f,
    className: "btn " + (filtro === f ? "btn-purple" : "btn-ghost"),
    onClick: () => setFiltro(f)
  }, l))), ["pendente", "ativo", "alta", "inativo"].map(st => {
    const grupo = filtrados.filter(p => p.status === st);
    if (grupo.length === 0) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: st,
      style: {
        marginBottom: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: st === "ativo" ? "var(--success)" : st === "alta" ? "var(--gray-400)" : st === "pendente" ? "#f59e0b" : "var(--danger)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.8px"
      }
    }, st === "ativo" ? "Em Atendimento" : st === "alta" ? "Alta" : st === "pendente" ? "⏳ Pendentes (Autocadastro)" : "Inativos", " (", grupo.length, ")")), /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        padding: 0
      }
    }, grupo.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 20px",
        borderBottom: "1px solid var(--gray-100)",
        cursor: "pointer",
        transition: "background .15s"
      },
      onClick: () => setPerfilAberto(p.id),
      onMouseEnter: e => e.currentTarget.style.background = "#fafafa",
      onMouseLeave: e => e.currentTarget.style.background = "white"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "var(--purple-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        color: "var(--purple)",
        flexShrink: 0
      }
    }, (p.nome || "?")[0].toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500
      }
    }, p.nome), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)"
      }
    }, p.email)), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-right",
      size: 16
    })))));
  }), filtrados.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, "Nenhum paciente encontrado."), modal && /*#__PURE__*/React.createElement("div", {
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
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, "Novo Paciente"), /*#__PURE__*/React.createElement("button", {
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
  }, "Nome completo"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.nome || "",
    onChange: e => setForm({
      ...form,
      nome: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "E-mail"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "email",
    value: form.email || "",
    onChange: e => setForm({
      ...form,
      email: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Telefone"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.telefone || "",
    onChange: e => setForm({
      ...form,
      telefone: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Genero"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.genero || "",
    onChange: e => setForm({
      ...form,
      genero: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecione"), /*#__PURE__*/React.createElement("option", null, "Feminino"), /*#__PURE__*/React.createElement("option", null, "Masculino"), /*#__PURE__*/React.createElement("option", null, "Nao-binario"), /*#__PURE__*/React.createElement("option", null, "Nao informar"))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Status"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.status || "ativo",
    onChange: e => setForm({
      ...form,
      status: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "ativo"
  }, "Ativo"), /*#__PURE__*/React.createElement("option", {
    value: "inativo"
  }, "Inativo"), /*#__PURE__*/React.createElement("option", {
    value: "alta"
  }, "Alta"))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "🏢 Empresa Contratante (opcional — NR-1)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.empresa || "",
    onChange: e => setForm({
      ...form,
      empresa: e.target.value
    }),
    placeholder: "Para colaboradores de empresas"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Setor"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.setor || "",
    onChange: e => setForm({
      ...form,
      setor: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Cargo"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.cargo || "",
    onChange: e => setForm({
      ...form,
      cargo: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "span 2"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Objetivos Terapeuticos"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: form.objetivos || "",
    onChange: e => setForm({
      ...form,
      objetivos: e.target.value
    }),
    placeholder: "Descreva os objetivos..."
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 20,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModal(false)
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando
  }, salvando ? "Salvando..." : "Salvar")))), modalImport && /*#__PURE__*/React.createElement("div", {
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
      setModalImport(false);
      setImportLog([]);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 520
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
  }, "Importar Pacientes (Excel/CSV)"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModalImport(false);
      setImportLog([]);
    },
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
      background: "#f9f5ff",
      border: "1px solid #e9d5ff",
      borderRadius: 10,
      padding: 14,
      marginBottom: 16,
      fontSize: 13,
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Colunas aceitas:"), " Nome, Email, Telefone, CPF, DataNascimento, Genero", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", null, "Formatos:"), " .csv ou .txt com separador vírgula, ponto-e-vírgula ou tab", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", null, "Encoding:"), " UTF-8"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      flex: 1,
      fontSize: 13
    },
    onClick: baixarTemplate
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "download",
    size: 14
  }), " Baixar template CSV"), /*#__PURE__*/React.createElement("label", {
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid var(--purple)",
      background: "var(--purple)",
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "upload",
    size: 14
  }), " Selecionar arquivo", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".csv,.txt,.xls,.xlsx",
    style: {
      display: "none"
    },
    onChange: processarExcel
  }))), importLog.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9fafb",
      borderRadius: 10,
      padding: 14,
      maxHeight: 240,
      overflowY: "auto",
      fontSize: 12,
      lineHeight: 2,
      border: "1px solid #e5e7eb"
    }
  }, importLog.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: l.tipo === "ok" ? "#059669" : l.tipo === "err" ? "#dc2626" : "#7B00C4",
      fontWeight: l.tipo === "info" ? 600 : 400
    }
  }, l.msg))), importando && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 12,
      color: "var(--purple)",
      fontSize: 13
    }
  }, "Importando... aguarde"))));
}

// FINANCEIRO CLINICA
// ── Relatório de Frequência (componente externo) ──────────────────────────
function RelatorioFrequencia({
  pacienteId,
  pacoteId,
  pacientes,
  sessoes,
  pacotes,
  lancamentos,
  FORMAS,
  onVoltar
}) {
  // Normaliza IDs removendo espaços e garantindo string limpa
  const pidNorm = (pacienteId || "").trim();
  const pac = pacientes.find(p => p.id === pidNorm);
  const pacote = pacoteId ? pacotes.find(p => p.id === pacoteId) : null;
  const pacEfetivo = pac || pacientes.find(p => p.id === pacote?.pacienteId);

  // Busca pacotes do paciente — também tenta pelo nome caso ID não bata
  const pacotesPorId = pacotes.filter(p => p.pacienteId === pidNorm);
  // Fallback extra: busca por pacienteNome se nenhum pacote encontrado
  const pacotesPac = pacoteId ? [pacote].filter(Boolean) : pacotesPorId.length > 0 ? pacotesPorId : pacotes.filter(p => p.pacienteNome && pacEfetivo && p.pacienteNome === pacEfetivo.nome);
  const pacoteIdsDosPac = pacotesPac.map(p => p.id);
  const sessPac = pacoteId ? sessoes.filter(s => s.pacoteId === pacoteId).sort((a, b) => a.data?.localeCompare(b.data)) : sessoes.filter(s => s.pacienteId === pidNorm || pacoteIdsDosPac.includes(s.pacoteId)).sort((a, b) => a.data?.localeCompare(b.data));
  const [mesFiltro, setMesFiltro] = useState("todos");
  const [accordionAberto, setAccordionAberto] = useState({});
  const [modalExcluir, setModalExcluir] = useState(null);
  const STATUS_S = {
    agendado: {
      l: "Agendado",
      c: "#7B00C4"
    },
    confirmado: {
      l: "Confirmado",
      c: "#059669"
    },
    realizado: {
      l: "✓ Realizado",
      c: "#059669"
    },
    falta: {
      l: "Falta",
      c: "#d97706"
    },
    remarcado: {
      l: "Remarcado",
      c: "#6366f1"
    }
  };
  const porMes = sessPac.reduce((acc, s) => {
    const mes = s.data?.slice(0, 7) || "sem-data";
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(s);
    return acc;
  }, {});
  const meses = Object.keys(porMes).sort();
  const mesesFiltrados = mesFiltro === "todos" ? meses : [mesFiltro];
  const anoAtual = new Date().getFullYear();
  const totalAno = sessPac.filter(s => s.data?.startsWith(anoAtual + "") && s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
  async function atualizarSessao(id, campos) {
    await db.collection("clinica_sessoes").doc(id).update(campos);
  }
  async function remarcarSessao(s, novaData, motivo, novaHora) {
    if (!novaData) return;
    try {
      const campos = {
        data: novaData,
        status: "remarcado",
        remarcada: true,
        dataRemarcada: novaData,
        dataOriginal: s.dataOriginal || s.data,
        motivoRemarcacao: motivo || "remarcacao"
      };
      if (novaHora) campos.hora = novaHora;
      await db.collection("clinica_sessoes").doc(s.id).update(campos);
    } catch (e) {
      console.error("Erro ao remarcar sessão:", e);
      alert("Erro ao remarcar: " + e.message);
    }
  }
  async function atualizarPagamento(s, formaPag, valorPago) {
    const pago = formaPag !== "" && formaPag !== "pendente";
    const vPago = parseFloat(valorPago) || parseFloat(s.valorSessao) || 0;
    await atualizarSessao(s.id, {
      formaPagamento: formaPag,
      pagamento: pago ? "pago" : "pendente",
      valorPago: pago ? vPago : 0,
      dataPagamento: pago && !s.dataPagamento ? new Date().toISOString().slice(0, 10) : s.dataPagamento
    });
    // ── REGRA: sessão de PACOTE nunca gera lançamento próprio.
    // O lançamento do pacote já cobre todas as sessões filhas.
    // Lançamento individual só existe para sessões AVULSAS (sem pacoteId).
    if (pago && !s.pacoteId) {
      const lancExist = lancamentos.find(l => l.sessaoId === s.id);
      if (!lancExist) {
        await db.collection("clinica_lancamentos").add({
          tipo_lancamento: "sessao",
          sessaoId: s.id,
          pacienteId: s.pacienteId,
          pacienteNome: s.pacienteNome || "",
          tipo: "Sessão #" + (s.numSessao || ""),
          valor: vPago,
          data: s.dataPagamento || new Date().toISOString().slice(0, 10),
          formaPag,
          status: "recebido",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await db.collection("clinica_lancamentos").doc(lancExist.id).update({
          valor: vPago,
          formaPag,
          status: "recebido"
        });
      }
    }
  }
  async function confirmarExclusao(tipo) {
    if (!modalExcluir) return;
    const {
      id,
      pacoteId,
      numSessao
    } = modalExcluir;
    if (tipo === "este") {
      await db.collection("clinica_sessoes").doc(id).delete();
    } else if (tipo === "daqui") {
      const fut = sessoes.filter(s => s.pacoteId === pacoteId && (s.numSessao || 0) >= (numSessao || 0));
      const b = db.batch();
      fut.forEach(s => b.delete(db.collection("clinica_sessoes").doc(s.id)));
      await b.commit();
    } else {
      const todas = sessoes.filter(s => s.pacoteId === pacoteId);
      const b = db.batch();
      todas.forEach(s => b.delete(db.collection("clinica_sessoes").doc(s.id)));
      b.delete(db.collection("clinica_pacotes").doc(pacoteId));
      const lp = lancamentos.find(l => l.pacoteId === pacoteId);
      if (lp) b.delete(db.collection("clinica_lancamentos").doc(lp.id));
      await b.commit();
    }
    setModalExcluir(null);
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple)",
      borderRadius: 12,
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onVoltar,
    style: {
      background: "rgba(255,255,255,0.2)",
      border: "none",
      cursor: "pointer",
      color: "white",
      padding: "6px 12px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Voltar"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Dancing Script, cursive",
      fontSize: 20,
      color: "white",
      fontWeight: 600,
      lineHeight: 1
    }
  }, pacEfetivo?.nome), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.75)",
      marginTop: 2
    }
  }, "Controle de Sessões e Frequência")), /*#__PURE__*/React.createElement("button", {
    style: {
      background: "rgba(255,255,255,0.2)",
      border: "none",
      cursor: "pointer",
      color: "white",
      padding: "6px 14px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 6
    },
    onClick: () => {
      const pac = pacEfetivo;
      const sessMeses = {};
      sessoesPac.forEach(s => {
        const mes = (s.data || "").slice(0, 7);
        if (!sessMeses[mes]) sessMeses[mes] = [];
        sessMeses[mes].push(s);
      });
      const totalPago = sessoesPac.reduce((a, s) => a + (parseFloat(s.valorPago) || 0), 0);
      const totalValor = sessoesPac.reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0);
      const fmtD = d => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }) : "—";
      const fmtM = m => {
        const [y, mo] = m.split("-");
        return new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric"
        });
      };
      const statusLabel = {
        agendado: "Agendado",
        confirmado: "Confirmado",
        realizado: "✓ Realizado",
        falta: "Falta",
        remarcado: "Remarcado"
      };
      const statusColor = {
        agendado: "#7B00C4",
        confirmado: "#059669",
        realizado: "#0891b2",
        falta: "#d97706",
        remarcado: "#6366f1"
      };
      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Resumo de Sessões — ${pac?.nome || ""}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;background:white;padding:32px;max-width:680px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:16px;border-bottom:3px solid #7B00C4;margin-bottom:24px}
  .logo-name{font-family:Georgia,serif;font-size:26px;color:#7B00C4;font-weight:700}
  .logo-sub{font-size:11px;color:#6b7280;margin-top:3px}
  .paciente-box{background:#f5f0ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;border-left:5px solid #7B00C4}
  .paciente-nome{font-size:22px;font-weight:700;color:#111827;margin-bottom:6px}
  .paciente-meta{display:flex;gap:24px;flex-wrap:wrap}
  .meta-item label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;display:block;margin-bottom:2px}
  .meta-item span{font-size:13px;font-weight:600;color:#374151}
  .mes-title{font-size:14px;font-weight:700;color:#7B00C4;padding:8px 0;border-bottom:1px solid #e5e7eb;margin-bottom:8px;margin-top:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#7B00C4;color:white;padding:7px 10px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase}
  td{padding:7px 10px;border-bottom:1px solid #f3f4f6}
  tr:nth-child(even) td{background:#fafafa}
  .status{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;color:white;display:inline-block}
  .totais{margin-top:24px;background:#f9fafb;border-radius:10px;padding:14px 20px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12}
  .total-item label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600;display:block}
  .total-item span{font-size:18px;font-weight:800}
  .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
  @media print{body{padding:16px} @page{margin:1.5cm}}
</style></head><body>
<div class="header">
  <div><div class="logo-name">Dra. Lucia Kratz</div><div class="logo-sub">CRP 09/20590 · Psicóloga · TCC · Musicoterapeuta · Neuromodulação<br>Goiânia, GO</div></div>
  <div style="text-align:right;font-size:11px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })}</div>
</div>
<div class="paciente-box">
  <div class="paciente-nome">${pac?.nome || "—"}</div>
  <div class="paciente-meta">
    <div class="meta-item"><label>Início</label><span>${pacotesPac[0]?.dataInicio ? new Date(pacotesPac[0].dataInicio + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</span></div>
    <div class="meta-item"><label>Horário</label><span>${pacotesPac[0]?.horario || "—"}</span></div>
    <div class="meta-item"><label>Recorrência</label><span>${pacotesPac[0]?.recorrencia || "—"}</span></div>
    <div class="meta-item"><label>Total de sessões</label><span>${sessoesPac.length}</span></div>
  </div>
</div>
${Object.entries(sessMeses).sort(([a], [b]) => a.localeCompare(b)).map(([mes, sess]) => `
<div class="mes-title">${fmtM(mes).charAt(0).toUpperCase() + fmtM(mes).slice(1)} — ${sess.length} sessão(ões)</div>
<table>
  <thead><tr><th>Nº</th><th>Data</th><th>Horário</th><th>Tipo</th><th>Presença</th><th>Valor</th></tr></thead>
  <tbody>${sess.sort((a, b) => (a.data || "").localeCompare(b.data || "")).map((s, i) => `
    <tr>
      <td style="font-weight:700;color:#7B00C4">${s.numSessao || i + 1}</td>
      <td>${s.data ? new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit"
      }) : ""}</td>
      <td>${s.hora || "—"}</td>
      <td>${s.tipo || "Psicoterapia"}</td>
      <td><span class="status" style="background:${statusColor[s.status] || "#7B00C4"}">${statusLabel[s.status] || s.status || "—"}</span></td>
      <td>R$ ${(parseFloat(s.valorSessao) || 0).toFixed(2).replace(".", ",")}</td>
    </tr>`).join("")}
  </tbody>
</table>`).join("")}
<div class="totais">
  <div class="total-item"><label>Total do pacote</label><span style="color:#111827">R$ ${totalValor.toFixed(2).replace(".", ",")}</span></div>
  <div class="total-item"><label>Recebido</label><span style="color:#059669">R$ ${totalPago.toFixed(2).replace(".", ",")}</span></div>
  <div class="total-item"><label>A receber</label><span style="color:#d97706">R$ ${(totalValor - totalPago).toFixed(2).replace(".", ",")}</span></div>
</div>
<div class="footer">Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
      const w = window.open("", "_blank");
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 800);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "printer",
    size: 15
  }), " Imprimir / PDF")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid var(--gray-200)",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple)",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "Dancing Script, cursive",
      fontSize: 22,
      color: "white",
      fontWeight: 600
    }
  }, "Controle de Atendimento Terapêutico"), /*#__PURE__*/React.createElement("img", {
    src: "../logo-transparente.png",
    style: {
      height: 36,
      objectFit: "contain"
    },
    onError: e => e.target.style.display = "none"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 20px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
      gap: 12,
      borderBottom: "1px solid var(--gray-100)"
    }
  }, [["Nome", pacEfetivo?.nome || "—"], ["Início", pacotesPac[0]?.dataInicio ? new Date(pacotesPac[0].dataInicio + "T00:00:00").toLocaleDateString("pt-BR") : "—"], ["Horário", pacotesPac[0]?.horario || "—"], ["Recorrência", pacotesPac[0]?.recorrencia || "—"]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)",
      fontWeight: 600,
      textTransform: "uppercase",
      marginBottom: 2
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 20px",
      display: "flex",
      gap: 20,
      flexWrap: "wrap",
      background: "var(--purple-soft)"
    }
  }, (() => {
    const sessFiltro = mesFiltro === "todos" ? sessPac : sessPac.filter(s => s.data?.startsWith(mesFiltro));
    const recFiltro = sessFiltro.filter(s => s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
    const pendFiltro = sessFiltro.filter(s => s.pagamento !== "pago" && s.status !== "cancelado").reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0);
    return [["Sessões", sessFiltro.length, "#7B00C4"], ["Realizadas", sessFiltro.filter(s => s.status === "realizado" || s.status === "falta").length, "#059669"], ["Pagas", sessFiltro.filter(s => s.pagamento === "pago").length, "#059669"], ["Pendentes", sessFiltro.filter(s => s.pagamento !== "pago" && s.status !== "cancelado").length, "#d97706"], ["Faltas", sessFiltro.filter(s => s.status === "falta").length, "#dc2626"], ["Recebido", recFiltro.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }), "#059669"], ["A Receber", pendFiltro.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }), "#d97706"], ["Ano " + anoAtual, totalAno.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }), "#0891b2"]].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 800,
        color: c
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: c,
        fontWeight: 500
      }
    }, l)));
  })())), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 16,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)"
    }
  }, "Mês:"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMesFiltro("todos"),
    style: {
      padding: "4px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: mesFiltro === "todos" ? "var(--purple)" : "#e5e7eb",
      background: mesFiltro === "todos" ? "var(--purple)" : "white",
      color: mesFiltro === "todos" ? "white" : "#6b7280",
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "Todos"), meses.map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    onClick: () => setMesFiltro(m),
    style: {
      padding: "4px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: mesFiltro === m ? "var(--purple)" : "#e5e7eb",
      background: mesFiltro === m ? "var(--purple)" : "white",
      color: mesFiltro === m ? "white" : "#6b7280",
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, new Date(m + "-15").toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit"
  })))), mesesFiltrados.map(mes => {
    const sessMes = porMes[mes] || [];
    const mesLabel = new Date(mes + "-15").toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
    const recMes = sessMes.filter(s => s.pagamento === "pago").reduce((a, s) => a + (parseFloat(s.valorPago) || parseFloat(s.valorSessao) || 0), 0);
    const aberto = accordionAberto[mes] !== false;
    return /*#__PURE__*/React.createElement("div", {
      key: mes,
      style: {
        background: "white",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--gray-200)",
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setAccordionAberto(a => ({
        ...a,
        [mes]: !aberto
      })),
      style: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        background: "#f5f0ff",
        border: "none",
        cursor: "pointer",
        borderBottom: aberto ? "2px solid var(--purple)" : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "var(--purple)",
        textTransform: "capitalize"
      }
    }, mesLabel), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, sessMes.length, " sessões"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#059669"
      }
    }, recMes.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    }))), /*#__PURE__*/React.createElement(Icon, {
      name: aberto ? "chevron-up" : "chevron-down",
      size: 16
    })), aberto && /*#__PURE__*/React.createElement("div", {
      style: {
        overflowX: "auto"
      }
    }, /*#__PURE__*/React.createElement("table", {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        background: "var(--purple)",
        color: "white"
      }
    }, ["", "Nº", "Data", "Presença", "Modalidade", "V. Sessão", "V. Pago", "Saldo", "Forma Pagto", "Data Pagto", "Obs"].map(h => /*#__PURE__*/React.createElement("th", {
      key: h,
      style: {
        padding: "8px 10px",
        textAlign: "left",
        fontWeight: 600,
        whiteSpace: "nowrap",
        fontSize: 11
      }
    }, h)))), /*#__PURE__*/React.createElement("tbody", null, sessMes.map((s, i) => {
      const st = STATUS_S[s.status] || STATUS_S.agendado;
      const isPago = s.pagamento === "pago"; // remarcado mantém pagamento original
      const vSessao = parseFloat(s.valorSessao) || 0;
      const vPago = parseFloat(s.valorPago) || (isPago ? vSessao : 0);
      const saldo = isPago ? vPago - vSessao : 0;
      return /*#__PURE__*/React.createElement("tr", {
        key: s.id,
        style: {
          borderBottom: "1px solid var(--gray-100)",
          background: i % 2 === 0 ? "white" : "#fafafa"
        }
      }, /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "5px 6px"
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setModalExcluir({
          id: s.id,
          pacoteId: s.pacoteId,
          numSessao: s.numSessao || i + 1,
          data: s.data
        }),
        style: {
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#dc2626",
          padding: "2px"
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "trash-2",
        size: 12
      }))), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px",
          fontWeight: 700,
          color: "var(--purple)"
        }
      }, s.numSessao || "—"), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px",
          whiteSpace: "nowrap"
        }
      }, s.data ? new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR") : "—", s.remarcada && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 9,
          color: "#0891b2",
          marginLeft: 4
        }
      }, "Rem.")), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, /*#__PURE__*/React.createElement("select", {
        value: s.status,
        onChange: e => atualizarSessao(s.id, {
          status: e.target.value
        }),
        style: {
          fontSize: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 5,
          padding: "2px 4px",
          color: st.c,
          fontWeight: 600,
          background: "white",
          cursor: "pointer",
          minWidth: 88
        }
      }, Object.entries(STATUS_S).map(([k, v]) => /*#__PURE__*/React.createElement("option", {
        key: k,
        value: k
      }, v.l))), (s.status === "cancelado" || s.status === "remarcado") && /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 3
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: "#0891b2",
          marginBottom: 2
        }
      }, "Nova data e horário:"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          gap: 4,
          marginBottom: 2
        }
      }, /*#__PURE__*/React.createElement("input", {
        type: "date",
        id: "data_rem_" + s.id,
        defaultValue: s.dataRemarcada || "",
        onBlur: e => {
          const h = document.getElementById("hora_rem_" + s.id)?.value || null;
          if (e.target.value) remarcarSessao(s, e.target.value, s.motivoRemarcacao || "remarcacao", h);
        },
        style: {
          fontSize: 10,
          border: "1px solid #0891b2",
          borderRadius: 3,
          padding: "1px 4px",
          color: "#0891b2",
          width: 105
        }
      }), /*#__PURE__*/React.createElement("input", {
        type: "time",
        id: "hora_rem_" + s.id,
        defaultValue: s.hora || "",
        onBlur: e => {
          const d = document.getElementById("data_rem_" + s.id)?.value || null;
          if (d && e.target.value) remarcarSessao(s, d, s.motivoRemarcacao || "remarcacao", e.target.value);
        },
        style: {
          fontSize: 10,
          border: "1px solid #0891b2",
          borderRadius: 3,
          padding: "1px 4px",
          color: "#0891b2",
          width: 76
        }
      })), /*#__PURE__*/React.createElement("select", {
        defaultValue: s.motivoRemarcacao || "remarcacao",
        onChange: e => atualizarSessao(s.id, {
          motivoRemarcacao: e.target.value
        }),
        style: {
          fontSize: 9,
          marginTop: 2,
          border: "1px solid #cbd5e1",
          borderRadius: 3,
          padding: "1px 3px",
          width: 105,
          color: "#374151",
          cursor: "pointer"
        }
      }, /*#__PURE__*/React.createElement("option", {
        value: "remarcacao"
      }, "🔄 Remarcação"), /*#__PURE__*/React.createElement("option", {
        value: "falta"
      }, "⚠️ Falta"), /*#__PURE__*/React.createElement("option", {
        value: "remarcado"
      }, "🔄 Remarcado"), /*#__PURE__*/React.createElement("option", {
        value: "compensacao"
      }, "✅ Compensação")))), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, /*#__PURE__*/React.createElement("input", {
        defaultValue: s.modalidade || "on-line",
        onBlur: e => atualizarSessao(s.id, {
          modalidade: e.target.value
        }),
        style: {
          fontSize: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 5,
          padding: "2px 5px",
          width: 62
        }
      })), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px",
          fontWeight: 600,
          color: "#374151",
          whiteSpace: "nowrap"
        }
      }, vSessao.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      })), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, /*#__PURE__*/React.createElement("input", {
        type: "number",
        defaultValue: s.valorPago || "",
        key: s.id + "_vpago",
        onBlur: e => atualizarPagamento(s, s.formaPagamento || "", e.target.value),
        placeholder: "0,00",
        style: {
          fontSize: 10,
          border: "1px solid",
          borderColor: isPago ? "#6ee7b7" : "#e5e7eb",
          borderRadius: 5,
          padding: "2px 5px",
          width: 65,
          color: isPago ? "#059669" : "#374151",
          fontWeight: isPago ? 600 : 400
        }
      })), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          color: saldo < 0 ? "#dc2626" : saldo > 0 ? "#059669" : "#9ca3af",
          fontSize: 11
        }
      }, isPago ? saldo === 0 ? "—" : saldo.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      }) : "—"), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, /*#__PURE__*/React.createElement("select", {
        value: s.formaPagamento || "",
        onChange: e => atualizarPagamento(s, e.target.value, s.valorPago || s.valorSessao),
        style: {
          fontSize: 10,
          border: "1px solid",
          borderColor: isPago ? "#6ee7b7" : "#e5e7eb",
          borderRadius: 5,
          padding: "2px 4px",
          color: isPago ? "#059669" : "#6b7280",
          fontWeight: isPago ? 600 : 400,
          cursor: "pointer",
          background: isPago ? "#f0fdf4" : "white",
          minWidth: 72
        }
      }, /*#__PURE__*/React.createElement("option", {
        value: ""
      }, "Pendente"), FORMAS.map(f => /*#__PURE__*/React.createElement("option", {
        key: f,
        value: f
      }, f)))), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, /*#__PURE__*/React.createElement("input", {
        type: "date",
        defaultValue: s.dataPagamento || "",
        key: s.id + "_dtpag",
        onBlur: e => atualizarSessao(s.id, {
          dataPagamento: e.target.value
        }),
        style: {
          fontSize: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 5,
          padding: "2px 4px",
          width: 105
        }
      })), /*#__PURE__*/React.createElement("td", {
        style: {
          padding: "6px 10px"
        }
      }, /*#__PURE__*/React.createElement("input", {
        defaultValue: s.obs || "",
        onBlur: e => atualizarSessao(s.id, {
          obs: e.target.value
        }),
        placeholder: "—",
        style: {
          fontSize: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 5,
          padding: "2px 5px",
          width: 70
        }
      })));
    })), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        background: "var(--purple-soft)"
      }
    }, /*#__PURE__*/React.createElement("td", {
      colSpan: 5,
      style: {
        padding: "8px 10px",
        fontWeight: 700,
        fontSize: 11
      }
    }, "Total ", mesLabel), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 10px",
        fontWeight: 700,
        fontSize: 11
      }
    }, sessMes.reduce((a, s) => a + (parseFloat(s.valorSessao) || 0), 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 10px",
        fontWeight: 700,
        fontSize: 11,
        color: "#059669"
      }
    }, recMes.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })), /*#__PURE__*/React.createElement("td", {
      colSpan: 4
    }))))));
  }), modalExcluir && /*#__PURE__*/React.createElement("div", {
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
      maxWidth: 400,
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
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Excluir sessão #", modalExcluir.numSessao, "?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 20
    }
  }, modalExcluir.data ? new Date(modalExcluir.data + "T00:00:00").toLocaleDateString("pt-BR") : ""), /*#__PURE__*/React.createElement("div", {
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
    onClick: () => confirmarExclusao("este")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "Só esta sessão")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #fbbf24",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: () => confirmarExclusao("daqui")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#d97706"
    }
  }, "Esta e todas as próximas")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      border: "1.5px solid #fca5a5",
      textAlign: "left",
      padding: "12px 16px"
    },
    onClick: () => confirmarExclusao("todos")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#dc2626"
    }
  }, "Cancelar todo o pacote"))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      width: "100%"
    },
    onClick: () => setModalExcluir(null)
  }, "Cancelar"))));
}
