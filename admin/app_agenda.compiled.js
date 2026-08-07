const {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} = React;
const db = firebase.firestore();
function Agenda() {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  const [sessoesPacientes, setSessoesPacientes] = useState([]);
  const [reservasSalaRaw, setReservasSalaRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [form, setForm] = useState({
    pacienteId: "",
    data: "",
    hora: "09:00",
    duracao: "50",
    tipo: "Psicoterapia",
    status: "agendado",
    obs: ""
  });
  const [salvando, setSalvando] = useState(false);
  const [viewMode, setViewMode] = useState("timeline");
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const TIPOS = ["Psicoterapia", "Avaliacao Neuropsicologica", "Avaliacao Psicologica", "Terapia de Casais", "Musicoterapia", "Orientacao de Carreira", "Retorno", "Outro"];
  const STATUS_CONFIG = {
    agendado: {
      label: "Agendado",
      cor: "#7B00C4",
      bg: "#f5f0ff"
    },
    confirmado: {
      label: "Confirmado",
      cor: "#059669",
      bg: "#d1fae5"
    },
    realizado: {
      label: "Realizado",
      cor: "#0891b2",
      bg: "#e0f2fe"
    },
    cancelado: {
      label: "Cancelado",
      cor: "#dc2626",
      bg: "#fee2e2"
    },
    falta: {
      label: "Falta",
      cor: "#d97706",
      bg: "#fef3c7"
    }
  };
  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  useEffect(() => {
    const u1 = db.collection("clinica_sessoes").onSnapshot(snap => {
      setSessoesPacientes(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    // Reservas da sala (Thais) — aparecem como bloqueios laranjas
    const u2 = db.collection("sala_reservas").onSnapshot(snap => {
      setReservasSalaRaw(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
    }, () => {});
    return () => {
      u1();
      u2();
    };
  }, []);

  // Combina sessões de pacientes + reservas de sala num único array memoizado,
  // sem race condition entre os dois listeners (cada um atualiza seu próprio estado)
  const sessoes = useMemo(() => {
    const reservasSala = reservasSalaRaw.map(r => ({
      id: "sala_" + r.id,
      ...r,
      pacienteNome: r.usuarioId === "thais" ? `🟠 Thais — ${r.titulo || "Sala reservada"}` : `🟣 ${r.titulo || "Sala — Lucia"}`,
      tipo: "sala",
      hora: r.horaInicio,
      status: "agendado",
      _sala: true
    }));
    return [...sessoesPacientes, ...reservasSala];
  }, [sessoesPacientes, reservasSalaRaw]);

  // Calcular semana atual
  function getInicioSemana(offset = 0) {
    const hoje = new Date();
    const dia = hoje.getDay();
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - dia + offset * 7);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  }
  function getDiasSemana(offset = 0) {
    const inicio = getInicioSemana(offset);
    return Array.from({
      length: 7
    }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }
  const dias = getDiasSemana(semanaOffset);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  function formatData(d) {
    return d.toISOString().split("T")[0];
  }
  function sessoesNoDia(dia) {
    const str = formatData(dia);
    return sessoes.filter(s => s.data === str).sort((a, b) => a.hora.localeCompare(b.hora));
  }
  async function salvar() {
    if (!form.pacienteId || !form.data || !form.hora) {
      alert("Preencha paciente, data e hora.");
      return;
    }
    setSalvando(true);
    const pac = pacientes.find(p => p.id === form.pacienteId);
    const dados = {
      ...form,
      pacienteNome: pac?.nome || "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (editando) {
      await db.collection("clinica_sessoes").doc(editando).update(dados);
      await dispararNotificacao({
        tipo: "sessao",
        titulo: `Sessão atualizada — ${pac?.nome || "Paciente"}`,
        corpo: `${form.data?.split("-").reverse().join("/") || ""} às ${form.hora} · ${form.tipo}`,
        pacienteId: form.pacienteId
      });
    } else {
      await db.collection("clinica_sessoes").add({
        ...dados,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await dispararNotificacao({
        tipo: "sessao",
        titulo: `Nova sessão agendada — ${pac?.nome || "Paciente"}`,
        corpo: `${form.data?.split("-").reverse().join("/") || ""} às ${form.hora} · ${form.tipo}`,
        pacienteId: form.pacienteId
      });
    }
    setModal(false);
    setEditando(null);
    setForm({
      pacienteId: "",
      data: "",
      hora: "09:00",
      duracao: "50",
      tipo: "Psicoterapia",
      status: "agendado",
      obs: ""
    });
    setSalvando(false);
  }
  function abrirEditar(s) {
    setForm({
      pacienteId: s.pacienteId || "",
      data: s.data || "",
      hora: s.hora || "09:00",
      duracao: s.duracao || "50",
      tipo: s.tipo || "Psicoterapia",
      status: s.status || "agendado",
      obs: s.obs || ""
    });
    setEditando(s.id);
    setModal(true);
  }
  async function mudarStatus(id, status) {
    await db.collection("clinica_sessoes").doc(id).update({
      status
    });
  }
  async function excluir(id) {
    if (!confirm("Excluir esta sessão?")) return;
    await db.collection("clinica_sessoes").doc(id).delete();
  }

  // Sessões de hoje para o painel
  const sessoesHoje = sessoesNoDia(hoje);
  const proximas = sessoes.filter(s => {
    const d = new Date(s.data + "T00:00:00");
    return d >= hoje && s.status !== "cancelado" && s.status !== "realizado";
  }).slice(0, 5);
  const [modalSala, setModalSala] = useState(false);
  const [formSala, setFormSala] = useState({
    data: "",
    horaInicio: "09:00",
    horaFim: "10:00",
    titulo: "",
    recorrencia: "unico"
  });
  const [salvandoSala, setSalvandoSala] = useState(false);
  async function salvarBloqueioSala() {
    if (!formSala.data || !formSala.horaInicio || !formSala.horaFim) {
      alert("Preencha data, início e fim.");
      return;
    }
    if (formSala.horaInicio >= formSala.horaFim) {
      alert("Início deve ser antes do fim.");
      return;
    }
    setSalvandoSala(true);
    const base = {
      horaInicio: formSala.horaInicio,
      horaFim: formSala.horaFim,
      titulo: formSala.titulo || "",
      usuarioId: "lucia",
      usuarioNome: "Lucia Kratz",
      cor: "#7B00C4",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (formSala.recorrencia === "recorrente") {
      // Gera para as próximas 12 semanas no mesmo dia da semana
      const dataInicio = new Date(formSala.data + "T00:00:00");
      const diaSemana = dataInicio.getDay();
      const batch = db.batch();
      for (let w = 0; w < 12; w++) {
        const d = new Date(dataInicio);
        d.setDate(dataInicio.getDate() + w * 7);
        const dataStr = d.toISOString().split("T")[0];
        const ref = db.collection("sala_reservas").doc();
        batch.set(ref, {
          ...base,
          data: dataStr,
          recorrenteRef: formSala.data
        });
      }
      await batch.commit();
      await dispararNotificacao({
        tipo: "bloqueio_sala",
        titulo: `Sala bloqueada — recorrente (12 semanas)`,
        corpo: `${formSala.data?.split("-").reverse().join("/") || ""} · ${formSala.horaInicio}–${formSala.horaFim}${formSala.titulo ? " · " + formSala.titulo : ""}`
      });
    } else {
      await db.collection("sala_reservas").add({
        ...base,
        data: formSala.data
      });
      await dispararNotificacao({
        tipo: "bloqueio_sala",
        titulo: `Sala bloqueada — ${formSala.data?.split("-").reverse().join("/") || ""}`,
        corpo: `${formSala.horaInicio}–${formSala.horaFim}${formSala.titulo ? " · " + formSala.titulo : ""}`
      });
    }
    setModalSala(false);
    setFormSala({
      data: "",
      horaInicio: "09:00",
      horaFim: "10:00",
      titulo: "",
      recorrencia: "unico"
    });
    setSalvandoSala(false);
  }
  if (loading) return /*#__PURE__*/React.createElement(Spinner, null);
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
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-title"
  }, "Agenda"), /*#__PURE__*/React.createElement("div", {
    className: "page-subtitle"
  }, sessoes.filter(s => s.status === "agendado" || s.status === "confirmado").length, " sessões agendadas")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://docplanner.doctoralia.com.br/#/calendar/week",
    target: "_blank",
    rel: "noreferrer",
    className: "btn btn-ghost",
    style: {
      fontSize: 13,
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "external-link",
    size: 13
  }), " Doctoralia"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      borderColor: "#ea580c",
      color: "#ea580c"
    },
    onClick: () => {
      setFormSala({
        data: formatData(hoje),
        horaInicio: "09:00",
        horaFim: "10:00",
        titulo: "",
        recorrencia: "unico"
      });
      setModalSala(true);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 15
  }), " Bloquear Sala"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      setForm({
        pacienteId: "",
        data: formatData(hoje),
        hora: "09:00",
        duracao: "50",
        tipo: "Psicoterapia",
        status: "agendado",
        obs: ""
      });
      setEditando(null);
      setModal(true);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Nova Sessão"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 10,
      marginBottom: 20
    }
  }, [["Hoje", sessoesHoje.length, "#7B00C4", "var(--purple-soft)"], ["Agendadas", sessoes.filter(s => s.status === "agendado").length, "#0891b2", "#e0f2fe"], ["Confirmadas", sessoes.filter(s => s.status === "confirmado").length, "#059669", "#d1fae5"], ["Este mês", sessoes.filter(s => s.data?.startsWith(new Date().toISOString().slice(0, 7))).length, "#d97706", "#fef3c7"]].map(([l, n, cor, bg]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      background: bg,
      borderRadius: 12,
      padding: "12px 16px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 800,
      color: cor
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: cor,
      fontWeight: 500
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "8px 12px"
    },
    onClick: () => setSemanaOffset(s => s - 1)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-left",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: "center",
      fontWeight: 600,
      fontSize: 15
    }
  }, dias[0].toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short"
  }), " — ", dias[6].toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "8px 10px",
      fontSize: 12
    },
    onClick: () => setSemanaOffset(0)
  }, "Hoje"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "8px 12px"
    },
    onClick: () => setSemanaOffset(s => s + 1)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 18
  }))), (() => {
    const isMobile = window.innerWidth < 768;
    const HORA_INI = 7,
      HORA_FIM = 22;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dias7 = getDiasSemana(semanaOffset);
    function horaParaMin(h) {
      const [hh, mm] = (h || "00:00").split(":").map(Number);
      return hh * 60 + (mm || 0);
    }
    function minParaHora(m) {
      return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
    }

    // Monta linhas da timeline para um dia
    function montarLinhasDia(diaStr) {
      const sessDia = sessoes.filter(s => s.data === diaStr && !s._sala).sort((a, b) => a.hora.localeCompare(b.hora));
      const salasDia = sessoes.filter(s => s.data === diaStr && s._sala).map(s => ({
        inicio: s.horaInicio || s.hora || "00:00",
        fim: s.horaFim || s.hora || "00:00",
        nome: s.pacienteNome || "Sala",
        ehLucia: !(s.pacienteNome || "").toLowerCase().includes("thais"),
        raw: s
      }));
      function sessoesNoMin(m) {
        // Retorna sessões que COMEÇAM neste slot de 1h (ini >= m E ini < m+60)
        return sessDia.filter(s => {
          const ini = horaParaMin(s.hora);
          return ini >= m && ini < m + 60;
        });
      }
      function blocoNoMin(m) {
        return salasDia.find(b => m >= horaParaMin(b.inicio) && m < horaParaMin(b.fim));
      }
      const linhas = [];
      const jaExibidas = new Set(); // ids de sessão já lançadas na timeline
      for (let m = HORA_INI * 60; m < HORA_FIM * 60; m += 60) {
        const hStr = minParaHora(m);
        const sessNoSlot = sessoesNoMin(m);
        const bloco = blocoNoMin(m);
        let teveSessaoInicio = false;
        sessNoSlot.forEach(sess => {
          // Exibe a sessão no slot onde ela COMEÇA (19:30 aparece no slot 19:00-20:00)
          const sessIni = horaParaMin(sess.hora);
          const iniciaSessao = sessIni >= m && sessIni < m + 60;
          if (iniciaSessao && !jaExibidas.has(sess.id)) {
            linhas.push({
              tipo: "sessao",
              hStr,
              sess
            });
            jaExibidas.add(sess.id);
            teveSessaoInicio = true;
          }
        });
        if (sessNoSlot.length > 0) {
          // já tem sessão cobrindo este minuto (seja início ou meio) — não mostrar vago/bloco neste slot
        } else if (bloco) {
          if (bloco.ehLucia) linhas.push({
            tipo: "livre",
            hStr,
            bloco
          });else {
            // só mostrar início do bloco Thais uma vez
            if (!linhas.length || linhas[linhas.length - 1].tipo !== "thais" || linhas[linhas.length - 1].bloco.raw.id !== bloco.raw.id) linhas.push({
              tipo: "thais",
              hStr,
              bloco
            });
          }
        }
        // fora de bloco: não mostrar para não poluir
      }
      return linhas;
    }

    // ── COMPONENTE de um card de sessão ──
    function CardSessao({
      s,
      hStr
    }) {
      const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.agendado;
      const dur = parseInt(s.duracao || 50);
      const fim = minParaHora(horaParaMin(s.hora) + dur);
      const online = (s.tipo || "").toLowerCase().includes("online");
      return /*#__PURE__*/React.createElement("div", {
        onClick: () => abrirEditar(s),
        style: {
          display: "flex",
          alignItems: "stretch",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          cursor: "pointer",
          background: st.bg,
          marginBottom: 4
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 4,
          background: st.cor,
          flexShrink: 0
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          padding: "10px 12px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 15,
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.3
        }
      }, s.pacienteNome || "—"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: st.cor,
          fontWeight: 600,
          marginTop: 2
        }
      }, s.hora.slice(0, 5), " – ", fim, online && /*#__PURE__*/React.createElement("span", {
        style: {
          marginLeft: 6
        }
      }, "📹")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#6b7280",
          marginTop: 1
        }
      }, s.tipo || "Psicoterapia")), /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 10px",
          gap: 4
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          background: st.cor,
          color: "white",
          borderRadius: 20,
          padding: "2px 8px",
          fontSize: 10,
          fontWeight: 700,
          whiteSpace: "nowrap"
        }
      }, st.label), /*#__PURE__*/React.createElement("select", {
        value: s.status,
        onChange: e => {
          e.stopPropagation();
          mudarStatus(s.id, e.target.value);
        },
        onClick: e => e.stopPropagation(),
        style: {
          fontSize: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          padding: "2px 3px",
          background: "white",
          cursor: "pointer",
          maxWidth: 84
        }
      }, Object.entries(STATUS_CONFIG).map(([k, v]) => /*#__PURE__*/React.createElement("option", {
        key: k,
        value: k
      }, v.label)))));
    }
    function CardLivre({
      hStr,
      diaStr
    }) {
      return /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          setForm({
            pacienteId: "",
            data: diaStr,
            hora: hStr,
            duracao: "50",
            tipo: "Psicoterapia",
            status: "agendado",
            obs: ""
          });
          setEditando(null);
          setModal(true);
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "#faf5ff",
          border: "1.5px dashed #c4b5fd",
          borderRadius: 10,
          padding: "8px 12px",
          cursor: "pointer",
          color: "#7B00C4",
          fontSize: 13,
          fontFamily: "var(--font-body)",
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "plus-circle",
        size: 14
      }), " ", /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 600
        }
      }, hStr), " ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: "#a78bfa",
          fontWeight: 400
        }
      }, "· Disponível"));
    }
    function CardThais({
      bloco
    }) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "stretch",
          borderRadius: 10,
          overflow: "hidden",
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          marginBottom: 3
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 4,
          background: "#ea580c",
          flexShrink: 0
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: "8px 12px"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: "#ea580c"
        }
      }, bloco.nome), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#9a3412"
        }
      }, bloco.inicio, " – ", bloco.fim, " · Sala ocupada")));
    }

    // ── VISÃO MOBILE: lista vertical contínua ──
    if (isMobile) {
      // Mostrar 14 dias a partir de hoje
      const diasMobile = Array.from({
        length: 14
      }, (_, i) => {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() + i);
        return d;
      });
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setSemanaOffset(o => o - 1),
        className: "btn btn-ghost",
        style: {
          padding: "6px 12px"
        }
      }, "‹ Anterior"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-muted)"
        }
      }, formatData(dias7[0]), " – ", formatData(dias7[6])), /*#__PURE__*/React.createElement("button", {
        onClick: () => setSemanaOffset(o => o + 1),
        className: "btn btn-ghost",
        style: {
          padding: "6px 12px"
        }
      }, "Próxima ›")), diasMobile.map((dia, di) => {
        const diaStr = formatData(dia);
        const linhas = montarLinhasDia(diaStr);
        const isHoje = diaStr === formatData(hoje);
        if (linhas.length === 0 && !isHoje) return null; // ocultar dias vazios sem bloco
        return /*#__PURE__*/React.createElement("div", {
          key: di,
          style: {
            display: "flex",
            gap: 0,
            marginBottom: 8
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            width: 44,
            flexShrink: 0,
            paddingTop: 10,
            textAlign: "center"
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontSize: 10,
            fontWeight: 700,
            color: isHoje ? "var(--purple)" : "#9ca3af",
            textTransform: "uppercase"
          }
        }, DIAS_SEMANA[dia.getDay()]), /*#__PURE__*/React.createElement("div", {
          style: {
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: isHoje ? "var(--purple)" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "2px auto 0"
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            fontSize: 18,
            fontWeight: 800,
            color: isHoje ? "white" : isHoje ? "var(--purple)" : "#111827"
          }
        }, dia.getDate()))), /*#__PURE__*/React.createElement("div", {
          style: {
            width: 2,
            background: isHoje ? "var(--purple)" : "#e5e7eb",
            borderRadius: 2,
            flexShrink: 0,
            marginTop: 14,
            marginRight: 10
          }
        }), /*#__PURE__*/React.createElement("div", {
          style: {
            flex: 1,
            paddingTop: 6
          }
        }, linhas.length === 0 ? /*#__PURE__*/React.createElement("div", {
          style: {
            color: "#d1d5db",
            fontSize: 12,
            padding: "8px 0"
          }
        }, "Sem eventos") : linhas.map((l, li) => {
          if (l.tipo === "sessao") return /*#__PURE__*/React.createElement(CardSessao, {
            key: li,
            s: l.sess,
            hStr: l.hStr
          });
          if (l.tipo === "livre") return /*#__PURE__*/React.createElement(CardLivre, {
            key: li,
            hStr: l.hStr,
            diaStr: diaStr
          });
          if (l.tipo === "thais") return /*#__PURE__*/React.createElement(CardThais, {
            key: li,
            bloco: l.bloco
          });
          return null;
        }), /*#__PURE__*/React.createElement("button", {
          onClick: () => {
            setForm({
              pacienteId: "",
              data: diaStr,
              hora: "09:00",
              duracao: "50",
              tipo: "Psicoterapia",
              status: "agendado",
              obs: ""
            });
            setEditando(null);
            setModal(true);
          },
          style: {
            background: "none",
            border: "1px dashed #d1d5db",
            borderRadius: 8,
            padding: "5px 12px",
            cursor: "pointer",
            color: "#9ca3af",
            fontSize: 12,
            width: "100%",
            marginTop: 2,
            fontFamily: "var(--font-body)"
          }
        }, "+ Agendar"), (() => {
          const sessDia = sessoes.filter(s => s.data === diaStr && !s._sala);
          if (sessDia.length === 0) return null;
          function enviarResumoMob() {
            const dataFmt = new Date(diaStr + "T12:00:00").toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric"
            });
            const realizadas = sessDia.filter(s => s.status === "realizado");
            const confirmadas = sessDia.filter(s => s.status === "confirmado");
            const agendadas = sessDia.filter(s => s.status === "agendado");
            const faltas = sessDia.filter(s => s.status === "falta");
            const canceladas = sessDia.filter(s => s.status === "cancelado");
            let msg = `📅 *Resumo do dia — ${dataFmt}*\n🔢 Total: ${sessDia.length} sessão(ões)\n\n`;
            if (realizadas.length) msg += `✅ *Realizadas (${realizadas.length}):*\n${realizadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
            if (confirmadas.length) msg += `🟢 *Confirmadas (${confirmadas.length}):*\n${confirmadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
            if (agendadas.length) msg += `🟡 *Agendadas/Pendentes (${agendadas.length}):*\n${agendadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
            if (faltas.length) msg += `❌ *Faltas (${faltas.length}):*\n${faltas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
            if (canceladas.length) msg += `🚫 *Canceladas (${canceladas.length}):*\n${canceladas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
            msg += `_Enviado pela Clínica Dra. Lucia Kratz_ 🦋`;
            window.open(`https://wa.me/5562991546765?text=${encodeURIComponent(msg)}`, "_blank");
          }
          return /*#__PURE__*/React.createElement("button", {
            onClick: enviarResumoMob,
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: "#25D366",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "7px 12px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              width: "100%",
              marginTop: 6,
              fontFamily: "var(--font-body)"
            }
          }, /*#__PURE__*/React.createElement("span", null, "📲"), " Resumo WhatsApp");
        })()));
      }));
    }

    // ── VISÃO DESKTOP: seletor de view + grade/timeline ──
    const diaAtual = diaSelecionado || formatData(hoje);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 16,
        background: "var(--gray-100)",
        borderRadius: 12,
        padding: 4,
        maxWidth: 260
      }
    }, [["timeline", "📅 Timeline"], ["semana", "🗓️ Semana"]].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
      key: v,
      onClick: () => setViewMode(v),
      style: {
        flex: 1,
        padding: "8px 12px",
        borderRadius: 9,
        border: "none",
        background: viewMode === v ? "white" : "transparent",
        color: viewMode === v ? "var(--purple)" : "#6b7280",
        fontWeight: viewMode === v ? 700 : 500,
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "var(--font-body)",
        boxShadow: viewMode === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none"
      }
    }, l))), viewMode === "timeline" && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 16,
        flexWrap: "wrap"
      }
    }, dias7.map((dia, idx) => {
      const str = formatData(dia);
      const isH = str === formatData(hoje);
      const isSel = str === diaAtual;
      const temS = sessoes.some(s => s.data === str && !s._sala);
      return /*#__PURE__*/React.createElement("button", {
        key: idx,
        onClick: () => setDiaSelecionado(str),
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "8px 12px",
          borderRadius: 12,
          border: "1.5px solid",
          borderColor: isSel ? "var(--purple)" : isH ? "#c4b5fd" : "#e5e7eb",
          background: isSel ? "var(--purple)" : isH ? "#f5f0ff" : "white",
          cursor: "pointer",
          minWidth: 56
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 600,
          color: isSel ? "rgba(255,255,255,.75)" : isH ? "var(--purple)" : "#9ca3af",
          textTransform: "uppercase"
        }
      }, DIAS_SEMANA[dia.getDay()]), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 20,
          fontWeight: 800,
          color: isSel ? "white" : isH ? "var(--purple)" : "#111827"
        }
      }, dia.getDate()), temS && /*#__PURE__*/React.createElement("div", {
        style: {
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: isSel ? "rgba(255,255,255,.7)" : "var(--purple)",
          marginTop: 2
        }
      }));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-muted)"
      }
    }, new Date(diaAtual + "T12:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long"
    })), (() => {
      const sessDia = sessoes.filter(s => s.data === diaAtual && !s._sala);
      if (sessDia.length === 0) return null;
      function enviarResumo() {
        const dataFmt = new Date(diaAtual + "T12:00:00").toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
        const realizadas = sessDia.filter(s => s.status === "realizado");
        const confirmadas = sessDia.filter(s => s.status === "confirmado");
        const agendadas = sessDia.filter(s => s.status === "agendado");
        const faltas = sessDia.filter(s => s.status === "falta");
        const canceladas = sessDia.filter(s => s.status === "cancelado");
        let msg = `📅 *Resumo do dia — ${dataFmt}*\n`;
        msg += `🔢 Total: ${sessDia.length} sessão(ões)\n\n`;
        if (realizadas.length) msg += `✅ *Realizadas (${realizadas.length}):*\n${realizadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
        if (confirmadas.length) msg += `🟢 *Confirmadas (${confirmadas.length}):*\n${confirmadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
        if (agendadas.length) msg += `🟡 *Agendadas/Pendentes (${agendadas.length}):*\n${agendadas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
        if (faltas.length) msg += `❌ *Faltas (${faltas.length}):*\n${faltas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
        if (canceladas.length) msg += `🚫 *Canceladas (${canceladas.length}):*\n${canceladas.map(s => `  • ${s.pacienteNome} — ${s.hora?.slice(0, 5)}`).join("\n")}\n\n`;
        msg += `_Enviado pela Clínica Dra. Lucia Kratz_ 🦋`;
        const url = `https://wa.me/5562991546765?text=${encodeURIComponent(msg)}`;
        window.open(url, "_blank");
      }
      return /*#__PURE__*/React.createElement("button", {
        onClick: enviarResumo,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "#25D366",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--font-body)"
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 15
        }
      }, "📲"), " Resumo WhatsApp");
    })()), (() => {
      const linhas = montarLinhasDia(diaAtual);
      if (linhas.length === 0) return /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: "center",
          padding: 40,
          color: "var(--text-muted)",
          background: "var(--gray-50)",
          borderRadius: 14
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "calendar",
        size: 32
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 8,
          fontWeight: 600
        }
      }, "Nenhum evento neste dia"), /*#__PURE__*/React.createElement("button", {
        className: "btn btn-purple",
        style: {
          marginTop: 12,
          fontSize: 13
        },
        onClick: () => {
          setForm({
            pacienteId: "",
            data: diaAtual,
            hora: "09:00",
            duracao: "50",
            tipo: "Psicoterapia",
            status: "agendado",
            obs: ""
          });
          setEditando(null);
          setModal(true);
        }
      }, "+ Agendar"));
      return linhas.map((l, li) => {
        if (l.tipo === "sessao") return /*#__PURE__*/React.createElement(CardSessao, {
          key: li,
          s: l.sess,
          hStr: l.hStr
        });
        if (l.tipo === "livre") return /*#__PURE__*/React.createElement(CardLivre, {
          key: li,
          hStr: l.hStr,
          diaStr: diaAtual
        });
        if (l.tipo === "thais") return /*#__PURE__*/React.createElement(CardThais, {
          key: li,
          bloco: l.bloco
        });
        return null;
      });
    })())), viewMode === "semana" && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        overflowX: "auto",
        WebkitOverflowScrolling: "touch"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "60px repeat(7,minmax(44px,1fr))",
        gap: 3,
        marginBottom: 4,
        minWidth: 380
      }
    }, /*#__PURE__*/React.createElement("div", null), dias.map((dia, i) => {
      const isHoje = formatData(dia) === formatData(hoje);
      const isPassado = dia < hoje;
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          textAlign: "center",
          padding: "8px 4px",
          borderRadius: 10,
          background: isHoje ? "var(--purple)" : "white",
          border: "1.5px solid",
          borderColor: isHoje ? "var(--purple)" : "var(--gray-200)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          color: isHoje ? "rgba(255,255,255,.8)" : isPassado ? "#9ca3af" : "var(--gray-500)"
        }
      }, DIAS_SEMANA[i]), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 20,
          fontWeight: 800,
          color: isHoje ? "white" : isPassado ? "#9ca3af" : "var(--gray-800)",
          lineHeight: 1.2
        }
      }, dia.getDate()), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9,
          color: isHoje ? "rgba(255,255,255,.7)" : "var(--gray-400)"
        }
      }, dia.toLocaleDateString("pt-BR", {
        month: "short"
      })));
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        marginBottom: 4
      }
    }, [{
      label: "☀️ Manhã",
      range: ["06:00", "12:00"],
      bg: "#fffbeb"
    }, {
      label: "🌤️ Tarde",
      range: ["12:00", "18:00"],
      bg: "#f0f9ff"
    }, {
      label: "🌙 Noite",
      range: ["18:00", "23:59"],
      bg: "#f5f3ff"
    }].map(periodo => /*#__PURE__*/React.createElement("div", {
      key: periodo.label,
      style: {
        display: "grid",
        gridTemplateColumns: "60px repeat(7,minmax(44px,1fr))",
        gap: 3,
        marginBottom: 4,
        minWidth: 380
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        paddingRight: 8,
        paddingTop: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: "var(--gray-500)"
      }
    }, periodo.label)), dias.map((dia, i) => {
      const isHoje = formatData(dia) === formatData(hoje);
      const sessDia = sessoesNoDia(dia).filter(s => s.hora >= periodo.range[0] && s.hora < periodo.range[1]);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          minHeight: 70,
          background: isHoje ? periodo.bg + "cc" : periodo.bg,
          border: "1px solid",
          borderColor: isHoje ? "var(--purple)30" : "var(--gray-200)",
          borderRadius: 8,
          padding: 4,
          display: "flex",
          flexDirection: "column",
          gap: 3
        }
      }, sessDia.map(s => {
        const st = s._sala ? {
          bg: "#fff7ed",
          cor: "#ea580c",
          label: "Sala"
        } : STATUS_CONFIG[s.status] || STATUS_CONFIG.agendado;
        return /*#__PURE__*/React.createElement("div", {
          key: s.id,
          onClick: () => !s._sala && abrirEditar(s),
          style: {
            background: st.bg,
            borderLeft: "3px solid " + st.cor,
            borderRadius: 5,
            padding: "4px 6px",
            cursor: s._sala ? "default" : "pointer",
            fontSize: 11,
            lineHeight: 1.4
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            fontWeight: 700,
            color: st.cor,
            fontSize: 12
          }
        }, s.hora), /*#__PURE__*/React.createElement("div", {
          style: {
            color: "#111",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11
          }
        }, s._sala ? s.pacienteNome || "Sala" : s.pacienteNome?.split(" ")[0] || "—"), !s._sala && /*#__PURE__*/React.createElement("div", {
          style: {
            color: "#6b7280",
            fontSize: 9
          }
        }, s.tipo));
      }), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          setForm({
            pacienteId: "",
            data: formatData(dia),
            hora: periodo.range[0] === "06:00" ? "08:00" : periodo.range[0] === "12:00" ? "14:00" : "19:00",
            duracao: "50",
            tipo: "Psicoterapia",
            status: "agendado",
            obs: ""
          });
          setEditando(null);
          setModal(true);
        },
        style: {
          background: "none",
          border: "1px dashed #d1d5db",
          borderRadius: 4,
          padding: "3px",
          cursor: "pointer",
          color: "#9ca3af",
          fontSize: 11,
          width: "100%",
          marginTop: "auto"
        }
      }, "+"));
    }))))));
  })(), modal && /*#__PURE__*/React.createElement("div", {
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
      maxWidth: 480
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
  }, editando ? "Editar Sessão" : "Nova Sessão"), /*#__PURE__*/React.createElement("button", {
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
  }, "Paciente *"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.pacienteId,
    onChange: e => setForm({
      ...form,
      pacienteId: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar paciente..."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.nome)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Data *"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: form.data,
    onChange: e => setForm({
      ...form,
      data: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Hora *"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "time",
    value: form.hora,
    onChange: e => setForm({
      ...form,
      hora: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Duração (min)"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.duracao,
    onChange: e => setForm({
      ...form,
      duracao: e.target.value
    })
  }, ["30", "45", "50", "60", "90"].map(d => /*#__PURE__*/React.createElement("option", {
    key: d,
    value: d
  }, d, " min"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Tipo"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.tipo,
    onChange: e => setForm({
      ...form,
      tipo: e.target.value
    })
  }, TIPOS.map(t => /*#__PURE__*/React.createElement("option", {
    key: t,
    value: t
  }, t)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Status"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.status,
    onChange: e => setForm({
      ...form,
      status: e.target.value
    })
  }, Object.entries(STATUS_CONFIG).map(([k, v]) => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, v.label))))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Observações"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: form.obs,
    onChange: e => setForm({
      ...form,
      obs: e.target.value
    }),
    placeholder: "Notas sobre a sessão..."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "space-between"
    }
  }, editando && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      color: "#dc2626",
      border: "1px solid #fecaca"
    },
    onClick: () => {
      excluir(editando);
      setModal(false);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 15
  }), " Excluir"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginLeft: "auto"
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
  }), " ", salvando ? "Salvando..." : "Salvar"))))), modalSala && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 500,
      padding: 20
    },
    onClick: () => setModalSala(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      padding: 28,
      width: "100%",
      maxWidth: 440
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
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 18
  }), " Bloquear Sala"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setModalSala(false),
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
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 13,
      color: "#92400e"
    }
  }, "Este bloqueio aparece para a Thais como horário ocupado na agenda compartilhada."), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Tipo de bloqueio"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["unico", "Só este dia", "#7B00C4"], ["recorrente", "Toda semana (12 semanas)", "#059669"]].map(([v, l, c]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setFormSala({
      ...formSala,
      recorrencia: v
    }),
    style: {
      flex: 1,
      padding: "10px 8px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: formSala.recorrencia === v ? c : "#e5e7eb",
      background: formSala.recorrencia === v ? c + "15" : "white",
      color: formSala.recorrencia === v ? c : "#6b7280",
      fontWeight: 600,
      cursor: "pointer",
      fontSize: 12,
      fontFamily: "var(--font-body)",
      textAlign: "center"
    }
  }, l))), formSala.recorrencia === "recorrente" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 12,
      color: "#059669",
      background: "#f0fdf4",
      borderRadius: 8,
      padding: "8px 12px"
    }
  }, "✓ Vai bloquear o mesmo dia da semana por 12 semanas consecutivas")), /*#__PURE__*/React.createElement("div", {
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
  }, "Data"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "date",
    value: formSala.data,
    onChange: e => setFormSala({
      ...formSala,
      data: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Início"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "time",
    value: formSala.horaInicio,
    onChange: e => setFormSala({
      ...formSala,
      horaInicio: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group"
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Fim"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    type: "time",
    value: formSala.horaFim,
    onChange: e => setFormSala({
      ...formSala,
      horaFim: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      gridColumn: "1/-1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Título (opcional)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: formSala.titulo,
    onChange: e => setFormSala({
      ...formSala,
      titulo: e.target.value
    }),
    placeholder: "Ex: Sessão, Avaliação..."
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setModalSala(false)
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: "#ea580c",
      color: "white",
      border: "none",
      borderRadius: 10,
      padding: "10px 20px",
      fontWeight: 600,
      fontSize: 14,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-body)"
    },
    onClick: salvarBloqueioSala,
    disabled: salvandoSala
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 15
  }), " ", salvandoSala ? "Salvando..." : "Bloquear")))));
}

// APP
// ─── VITRINE DE PRODUTOS (CRUD) ──────────────────────────