// ═══════════════════════════════════════════════════════
//  psifabulas.js — Fábulas Terapêuticas + Ferramentas Clínicas
//  Clínica Dra. Lucia Kratz — CRP 09/20590
//  Carregar 1º no index.html (antes de psicoeducacoes.js e app.js)
// ═══════════════════════════════════════════════════════

function TerapiaCasais() {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  const [casais, setCasais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    nomeCasal: "",
    p1: "",
    p2: ""
  });
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  useEffect(() => {
    const unsub = db.collection("clinica_casais").onSnapshot(snap => {
      setCasais(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  async function vincular() {
    if (!form.p1 || !form.p2 || form.p1 === form.p2) {
      alert("Selecione dois pacientes diferentes.");
      return;
    }
    setSalvando(true);
    const p1 = pacientes.find(p => p.id === form.p1);
    const p2 = pacientes.find(p => p.id === form.p2);
    // Grava na coleção de casais
    await db.collection("clinica_casais").add({
      nomeCasal: form.nomeCasal || null,
      p1Id: form.p1,
      p1Nome: p1?.nome || "",
      p2Id: form.p2,
      p2Nome: p2?.nome || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // Grava casalId + mod5 nos dois pacientes para o portal clínico detectar
    await db.collection("clinica_pacientes").doc(form.p1).update({
      casalId: form.p2,
      modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
    });
    await db.collection("clinica_pacientes").doc(form.p2).update({
      casalId: form.p1,
      modulosAtivos: firebase.firestore.FieldValue.arrayUnion("mod5")
    });
    setModal(false);
    setForm({
      nomeCasal: "",
      p1: "",
      p2: ""
    });
    setSalvando(false);
  }
  async function excluir(id) {
    if (!confirm("Remover vinculo?")) return;
    // Busca o casal para limpar casalId dos pacientes
    const casal = casais.find(c => c.id === id);
    if (casal) {
      await db.collection("clinica_pacientes").doc(casal.p1Id).update({
        casalId: ""
      }).catch(() => {});
      await db.collection("clinica_pacientes").doc(casal.p2Id).update({
        casalId: ""
      }).catch(() => {});
    }
    await db.collection("clinica_casais").doc(id).delete();
  }
  const getNomeExibicao = c => c.nomeCasal || `${c.p1Nome} & ${c.p2Nome}`;
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
  }, "Terapia de Casais"), /*#__PURE__*/React.createElement("div", {
    className: "page-subtitle"
  }, casais.length, " casal", casais.length !== 1 ? "is" : "", " em acompanhamento")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setModal(true)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), " Vincular Casal")), casais.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, "Nenhum casal vinculado ainda."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      marginTop: 16
    },
    onClick: () => setModal(true)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), " Vincular primeiro casal")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, casais.map(c => /*#__PURE__*/React.createElement(React.Fragment, {
    key: c.id
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "18px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "50%",
      background: "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
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
      fontWeight: 600
    }
  }, c.nomeCasal || `${c.p1Nome} & ${c.p2Nome}`), c.nomeCasal && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "(", c.p1Nome, " & ", c.p2Nome, ")")), (c.satisfacao || c.estadoCivil) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 4
    }
  }, c.satisfacao && /*#__PURE__*/React.createElement("span", {
    className: "badge badge-purple"
  }, "Satisfacao: ", c.satisfacao, "/10"), c.estadoCivil && /*#__PURE__*/React.createElement("span", {
    className: "badge badge-gray"
  }, c.estadoCivil))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px",
      color: "var(--danger)"
    },
    onClick: () => excluir(c.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      fontSize: 13
    },
    onClick: () => setExpandido(expandido === c.id ? null : c.id)
  }, "\uD83D\uDD34 Emerg\xEAncia ", /*#__PURE__*/React.createElement(Icon, {
    name: expandido === c.id ? "chevron-up" : "chevron-down",
    size: 14
  })))), expandido === c.id && /*#__PURE__*/React.createElement(BotaoEmergenciaAdmin, {
    casalId: c.id,
    nomeCasal: getNomeExibicao(c)
  })))), modal && /*#__PURE__*/React.createElement("div", {
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
      maxWidth: 440
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 18
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600
    }
  }, "Vincular Casal")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Selecione dois pacientes cadastrados para vincular como casal em terapia."), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Nome do casal (opcional)"), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: form.nomeCasal,
    onChange: e => setForm({
      ...form,
      nomeCasal: e.target.value
    }),
    placeholder: "Ex: Silva & Costa"
  })), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Parceiro(a) 1 *"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.p1,
    onChange: e => setForm({
      ...form,
      p1: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar paciente..."), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.nome)))), /*#__PURE__*/React.createElement("div", {
    className: "form-group",
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "form-label"
  }, "Parceiro(a) 2 *"), /*#__PURE__*/React.createElement("select", {
    className: "form-input",
    value: form.p2,
    onChange: e => setForm({
      ...form,
      p2: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Selecionar paciente..."), pacientes.filter(p => p.status === "ativo" && p.id !== form.p1).sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/React.createElement("option", {
    key: p.id,
    value: p.id
  }, p.nome)))), /*#__PURE__*/React.createElement("div", {
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
    onClick: vincular,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 15
  }), " ", salvando ? "Salvando..." : "Vincular")))));
}

// ═══════════════════════════════════════════════════════
// RECURSOS TERAPÊUTICOS
// ═══════════════════════════════════════════════════════
// ── Categorias originais (mantidas para compatibilidade) ──────────────────
const CATEGORIAS_LEGADO = [{
  id: "tcc",
  label: "TCC",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}, {
  id: "ansiedade",
  label: "Ansiedade",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}, {
  id: "emocoes",
  label: "Emoções",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}, {
  id: "autocuidado",
  label: "Autocuidado",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}, {
  id: "relacionamentos",
  label: "Relacionamentos",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}, {
  id: "corpo",
  label: "Corpo & Alimentação",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}, {
  id: "esquema",
  label: "Terapia do Esquema",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}, {
  id: "musicoterapia",
  label: "Musicoterapia",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}, {
  id: "avaliacao",
  label: "Avaliação e Anamnese",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}, {
  id: "outro",
  label: "Outros",
  cor: "#7B00C4",
  bg: "#f3e6ff"
}];

// ── Nova taxonomia clínica por demanda ────────────────────────────────────
const MACROCATEGORIAS = [{
  id: "macro_ansiedade",
  icone: "🧠",
  label: "Ansiedade e Controle dos Pensamentos",
  cor: "#7B00C4",
  bg: "#f3e6ff",
  subs: [{
    id: "ansiedade_diaria",
    label: "Ansiedade Diária e Crises"
  }, {
    id: "distorcoes",
    label: "Distorções Cognitivas e Ruminação"
  }, {
    id: "crencas_esquemas",
    label: "Crenças e Esquemas Disfuncionais"
  }, {
    id: "autocritica",
    label: "Autocrítica e Culpa"
  }, {
    id: "procrastinacao",
    label: "Procrastinação e Foco"
  }]
}, {
  id: "macro_humor",
  icone: "❤️",
  label: "Humor e Regulação Emocional",
  cor: "#db2777",
  bg: "#fce7f3",
  subs: [{
    id: "depressao",
    label: "Depressão e Desânimo"
  }, {
    id: "desamor",
    label: "Desamor, Desamparo e Desvalor"
  }, {
    id: "regulacao_emocional",
    label: "Inteligência e Regulação Emocional"
  }, {
    id: "burnout",
    label: "Burnout, Estresse e Frustração"
  }, {
    id: "vergonha",
    label: "Vergonha e Insegurança"
  }]
}, {
  id: "macro_habitos",
  icone: "🌱",
  label: "Hábitos e Autocuidado",
  cor: "#16a34a",
  bg: "#dcfce7",
  subs: [{
    id: "rotina",
    label: "Rotina e Organização Diária"
  }, {
    id: "sono",
    label: "Sono e Descanso"
  }, {
    id: "motivacao",
    label: "Motivação e Zona de Conforto"
  }, {
    id: "neuroplasticidade",
    label: "Neuroplasticidade e Novos Hábitos"
  }, {
    id: "praticas_autocuidado",
    label: "Práticas de Autocuidado"
  }]
}, {
  id: "macro_relacionamentos",
  icone: "🤝",
  label: "Conflitos Interpessoais e Relacionamentos",
  cor: "#0891b2",
  bg: "#e0f2fe",
  subs: [{
    id: "comunicacao",
    label: "Comunicação Assertiva"
  }, {
    id: "dependencia",
    label: "Dependência Emocional e Apego"
  }, {
    id: "limites",
    label: "Limites e Autoestima"
  }, {
    id: "ciumes",
    label: "Ciúmes e Insegurança na Relação"
  }, {
    id: "toxicos",
    label: "Relacionamentos Tóxicos e Abusivos"
  }]
}, {
  id: "macro_casais",
  icone: "💑",
  label: "Casais, Família e Parentalidade",
  cor: "#d97706",
  bg: "#fef3c7",
  subs: [{
    id: "conflitos_casal",
    label: "Conflitos e Alinhamento de Casal"
  }, {
    id: "sexualidade",
    label: "Sexualidade e Intimidade"
  }, {
    id: "parentalidade",
    label: "Parentalidade e Educação de Filhos"
  }, {
    id: "conflitos_familia",
    label: "Conflitos Familiares e Enteados"
  }, {
    id: "traicao",
    label: "Traição e Reconexão Conjugal"
  }]
}, {
  id: "macro_corpo",
  icone: "🏃",
  label: "Corpo, Saúde e Conexão Somática",
  cor: "#059669",
  bg: "#d1fae5",
  subs: [{
    id: "alimentacao",
    label: "Alimentação Emocional e Compulsão"
  }, {
    id: "autoimagem",
    label: "Autoimagem e Aceitação Corporal"
  }, {
    id: "nervovago",
    label: "Regulação do Sistema Nervoso (Nervo Vago)"
  }, {
    id: "sintomas_fisicos",
    label: "Sintomas Físicos da Ansiedade"
  }, {
    id: "saude_mental",
    label: "Integração Saúde Física e Mental"
  }]
}, {
  id: "macro_compulsao",
  icone: "🔒",
  label: "Compulsão Sexual",
  cor: "#7c3aed",
  bg: "#ede9fe",
  subs: [{
    id: "compulsao_ciclo",
    label: "Ciclo do Gatilho e Fissura"
  }, {
    id: "compulsao_habitos",
    label: "Substituição de Hábitos"
  }, {
    id: "compulsao_emocional",
    label: "Regulação Emocional"
  }, {
    id: "compulsao_vinculos",
    label: "Impacto nos Vínculos"
  }, {
    id: "compulsao_aval",
    label: "Rastreamento e Avaliação"
  }]
}];

// Todas as subcategorias num array plano (para selects e filtros)
const TODAS_SUBCATEGORIAS = MACROCATEGORIAS.flatMap(m => m.subs.map(s => ({
  ...s,
  macroId: m.id,
  macroLabel: m.label,
  macroIcone: m.icone,
  cor: m.cor,
  bg: m.bg
})));

// Compatibilidade: CATEGORIAS_RECURSOS = legado + novas subcategorias
const CATEGORIAS_RECURSOS = [...CATEGORIAS_LEGADO, ...TODAS_SUBCATEGORIAS];
const FERRAMENTAS_INTERATIVAS = [{
  key: "breathing-478",
  label: "Exercicio de Respiracao 4-7-8"
}, {
  key: "abc-record",
  label: "Registro ABC de Pensamentos"
}, {
  key: "muscle-relaxation",
  label: "Relaxamento Muscular Progressivo"
}, {
  key: "anxiety-management",
  label: "Gestao da Ansiedade"
}, {
  key: "entrevista-clinica",
  label: "Entrevista Clinica Inicial"
}, {
  key: "emotional-eating",
  label: "Rastreamento Emocional da Alimentacao"
}, {
  key: "treino-neuro-auditivo",
  label: "Treino Neuro-Auditivo"
}, {
  key: "decision-tree",
  label: "Arvore da Decisao"
}, {
  key: "anamnese",
  label: "Anamnese — Marcos do Desenvolvimento"
}, {
  key: "diario-terapeutico",
  label: "Diário Terapêutico"
}];

// ═══════════════════════════════════════════════════════
// FERRAMENTAS INTERATIVAS — MODAL VISUALIZAR
// ═══════════════════════════════════════════════════════

// ── helpers compartilhados ──
function getYouTubeEmbed(url) {
  if (!url || !url.trim()) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (!m) return null;
  return `https://www.youtube.com/embed/${m[1]}?autoplay=1&loop=1&playlist=${m[1]}&controls=1&rel=0`;
}
function falarTexto(txt) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(txt);
  u.lang = "pt-BR";
  u.rate = 0.85;
  u.pitch = 1.05;
  const v = window.speechSynthesis.getVoices().find(x => x.lang.startsWith("pt"));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

// ── Nota de Relaxamento — salva no Firebase após conclusão ──────────────────
function NotaRelaxamento({
  user,
  ferramenta,
  emoji,
  onRepetir
}) {
  const [nota, setNota] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  async function salvarNota(n) {
    setNota(n);
    if (!user?.id) {
      setSalvo(true);
      return;
    }
    setSalvando(true);
    try {
      await db.collection("clinica_atividades").add({
        pacienteId: user.id,
        pacienteNome: user.nome || "",
        ferramenta,
        nota: n,
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {}
    setSalvando(false);
    setSalvo(true);
  }
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#d1fae5",
      borderRadius: 12,
      padding: "14px 20px",
      fontSize: 14,
      color: "#065f46",
      marginBottom: 20
    }
  }, "\u2713 Nota ", nota, "/10 registrada! Seu progresso foi salvo. \uD83D\uDC9C"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: onRepetir
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "rotate-ccw",
    size: 16
  }), " Repetir"));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginBottom: 6
    }
  }, "Como voc\xEA est\xE1 se sentindo agora?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "D\xEA uma nota de 0 a 10 para o seu n\xEDvel de relaxamento"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "center",
      flexWrap: "wrap",
      marginBottom: 20
    }
  }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => salvarNota(n),
    disabled: salvando,
    style: {
      width: 44,
      height: 44,
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: n <= 3 ? "#fca5a5" : n <= 6 ? "#fbbf24" : "#6ee7b7",
      background: n <= 3 ? "#fef2f2" : n <= 6 ? "#fef3c7" : "#f0fdf4",
      color: n <= 3 ? "#dc2626" : n <= 6 ? "#d97706" : "#16a34a",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer"
    }
  }, n))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 11,
      color: "var(--text-muted)",
      paddingLeft: 4,
      paddingRight: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDE30 Muito tenso"), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDE10 Regular"), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDE0C Muito relaxado")));
}

// ── Técnica de Respiração 4-7-8 (áudio MP4 guiado) ──
function FerramentaRespiracao({
  user
}) {
  // Ciclo 4-7-8: inspirar 4s, segurar 7s, expirar 8s = 19s total
  const FASES = [{
    label: "Inspire",
    dur: 4,
    cor: "#7B00C4",
    instrucao: "Inspire pelo nariz lentamente..."
  }, {
    label: "Segure",
    dur: 7,
    cor: "#0891b2",
    instrucao: "Segure o ar com calma..."
  }, {
    label: "Expire",
    dur: 8,
    cor: "#059669",
    instrucao: "Expire completamente pela boca..."
  }];
  const TOTAL_CICLOS = 4;
  const [ativo, setAtivo] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [faseIdx, setFaseIdx] = useState(0);
  const [progresso, setProgresso] = useState(0); // 0-100 dentro da fase
  const [ciclo, setCiclo] = useState(1);
  const [tempoFase, setTempoFase] = useState(0);
  const timerRef = useRef(null);
  const fase = FASES[faseIdx];
  const durTotal = FASES.reduce((a, f) => a + f.dur, 0); // 19s

  function iniciar() {
    setAtivo(true);
    setConcluido(false);
    setFaseIdx(0);
    setProgresso(0);
    setCiclo(1);
    setTempoFase(0);
  }
  function parar() {
    clearInterval(timerRef.current);
    setAtivo(false);
    setFaseIdx(0);
    setProgresso(0);
    setCiclo(1);
    setTempoFase(0);
  }
  useEffect(() => {
    if (!ativo) return;
    timerRef.current = setInterval(() => {
      setTempoFase(t => {
        const novot = t + 0.1;
        const durFase = FASES[faseIdx].dur;
        if (novot >= durFase) {
          // avança fase
          const proxFase = faseIdx + 1;
          if (proxFase >= FASES.length) {
            // fim do ciclo
            setCiclo(c => {
              if (c >= TOTAL_CICLOS) {
                clearInterval(timerRef.current);
                setAtivo(false);
                setConcluido(true);
                return c;
              }
              setFaseIdx(0);
              setProgresso(0);
              return c + 1;
            });
          } else {
            setFaseIdx(proxFase);
            setProgresso(0);
          }
          return 0;
        }
        setProgresso(novot / durFase * 100);
        return novot;
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [ativo, faseIdx]);
  const tamanhoCirculo = ativo ? fase.label === "Inspire" ? 140 + progresso * 0.6 : fase.label === "Segure" ? 200 : 200 - progresso * 0.6 : 140;
  if (concluido) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "40px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      marginBottom: 16
    }
  }, "\u2728"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 700,
      color: "var(--purple)",
      marginBottom: 8
    }
  }, "Pr\xE1tica conclu\xEDda!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)",
      marginBottom: 32,
      lineHeight: 1.6
    }
  }, TOTAL_CICLOS, " ciclos de respira\xE7\xE3o 4-7-8 conclu\xEDdos.", /*#__PURE__*/React.createElement("br", null), "O seu sistema nervoso agradece. \uD83D\uDC9C"), /*#__PURE__*/React.createElement("button", {
    onClick: iniciar,
    style: {
      padding: "11px 24px",
      borderRadius: 10,
      border: "none",
      background: "var(--purple)",
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "inherit"
    }
  }, "Praticar novamente"));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 0"
    }
  }, !ativo ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: "var(--text)",
      marginBottom: 8
    }
  }, "T\xE9cnica de Respira\xE7\xE3o 4-7-8"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 32,
      lineHeight: 1.6,
      maxWidth: 300,
      margin: "0 auto 32px"
    }
  }, "Esta t\xE9cnica ativa o nervo vago e reduz a ansiedade em minutos.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", null, "4"), " ciclos \xB7 ", /*#__PURE__*/React.createElement("strong", null, "4"), " inspirar \xB7 ", /*#__PURE__*/React.createElement("strong", null, "7"), " segurar \xB7 ", /*#__PURE__*/React.createElement("strong", null, "8"), " expirar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 160,
      height: 160,
      borderRadius: "50%",
      background: "var(--purple-soft)",
      border: "3px solid var(--purple)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 32,
      opacity: 0.6
    }
  }, "\uD83D\uDCA8")), /*#__PURE__*/React.createElement("button", {
    onClick: iniciar,
    style: {
      padding: "14px 32px",
      borderRadius: 12,
      border: "none",
      background: "var(--purple)",
      color: "white",
      cursor: "pointer",
      fontSize: 15,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "\u25B6 Iniciar Pr\xE1tica")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 8,
      marginBottom: 24
    }
  }, Array.from({
    length: TOTAL_CICLOS
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: i < ciclo ? "var(--purple)" : "var(--gray-200)",
      transition: "background .3s"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: tamanhoCirculo,
      height: tamanhoCirculo,
      borderRadius: "50%",
      background: `${fase.cor}18`,
      border: `4px solid ${fase.cor}`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.1s linear",
      boxShadow: `0 0 ${progresso * 0.5}px ${fase.cor}40`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 700,
      color: fase.cor
    }
  }, fase.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      color: fase.cor,
      marginTop: 4
    }
  }, Math.ceil(fase.dur - tempoFase), "s"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)",
      marginBottom: 24,
      fontStyle: "italic"
    }
  }, fase.instrucao), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 280,
      margin: "0 auto 24px",
      background: "var(--gray-100)",
      borderRadius: 20,
      height: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: progresso + "%",
      height: "100%",
      borderRadius: 20,
      background: fase.cor,
      transition: "width 0.1s linear"
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: parar,
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      background: "white",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, "\u2715 Parar")));
}

// ── Relaxamento Muscular Progressivo ──
// ── Relaxamento Muscular (arquivo único de vídeo) ──
function FerramentaRelaxamento({
  user
}) {
  const AUDIO_SRC = "../media/atividade1meditacao.mp4";
  const [iniciado, setIniciado] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  function iniciar() {
    setIniciado(true);
    setConcluido(false);
    setTempo(0);
    setPausado(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    timerRef.current = setInterval(() => setTempo(t => t + 1), 1000);
  }
  function togglePausa() {
    if (!audioRef.current) return;
    if (pausado) {
      audioRef.current.play().catch(() => {});
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setTempo(t => t + 1), 1000);
    } else {
      audioRef.current.pause();
      clearInterval(timerRef.current);
    }
    setPausado(p => !p);
  }
  function parar() {
    clearInterval(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIniciado(false);
    setTempo(0);
    setPausado(false);
  }
  function onEnded() {
    clearInterval(timerRef.current);
    setIniciado(false);
    setConcluido(true);
  }
  useEffect(() => () => clearInterval(timerRef.current), []);
  const mm = String(Math.floor(tempo / 60)).padStart(2, "0");
  const ss = String(tempo % 60).padStart(2, "0");
  if (concluido) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "40px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\u2705"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Relaxamento Completo!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)",
      marginBottom: 24
    }
  }, "Parab\xE9ns por cuidar de voc\xEA. \uD83D\uDC9C"), /*#__PURE__*/React.createElement(NotaRelaxamento, {
    user: user,
    ferramenta: "relaxamento",
    emoji: "\uD83D\uDC86",
    onRepetir: iniciar
  }));
  if (!iniciado) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 20px"
    }
  }, /*#__PURE__*/React.createElement("audio", {
    ref: audioRef,
    src: AUDIO_SRC,
    onEnded: onEnded,
    preload: "auto"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 16
    }
  }, "\uD83D\uDC86"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Relaxamento Muscular Progressivo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 24,
      lineHeight: 1.6
    }
  }, "Exerc\xEDcio guiado pela voz da Dra. Lucia Kratz.", /*#__PURE__*/React.createElement("br", null), "Siga as instru\xE7\xF5es do \xE1udio e relaxe cada grupo muscular."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginBottom: 24,
      textAlign: "left"
    }
  }, [{
    e: "🧘",
    t: "Encontre uma posição confortável"
  }, {
    e: "🎧",
    t: "Use fone de ouvido se possível"
  }, {
    e: "📵",
    t: "Coloque o celular no silencioso"
  }].map((i, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      borderRadius: 10,
      background: "#f5f3ff",
      border: "1px solid #ede9fe"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, i.e), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--gray-700)"
    }
  }, i.t)))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      minWidth: 160,
      fontSize: 15,
      padding: "12px 24px"
    },
    onClick: iniciar
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: 18
  }), " Iniciar"));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 0"
    }
  }, /*#__PURE__*/React.createElement("audio", {
    ref: audioRef,
    src: AUDIO_SRC,
    onEnded: onEnded,
    preload: "auto"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 200,
      height: 200,
      margin: "0 auto 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: 190,
      height: 190,
      borderRadius: "50%",
      background: "#7B00C408",
      border: "2px solid #7B00C420",
      animation: pausado ? "none" : "pulse-slow 3s ease-in-out infinite"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      width: 150,
      height: 150,
      borderRadius: "50%",
      background: "#7B00C415",
      border: "2px solid #7B00C430",
      animation: pausado ? "none" : "pulse-slow 3s ease-in-out infinite 0.5s"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 110,
      height: 110,
      borderRadius: "50%",
      background: "linear-gradient(135deg,#7B00C4,#b040e0)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 0 30px #7B00C440",
      color: "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28
    }
  }, "\uD83D\uDC86"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 4
    }
  }, pausado ? "Pausado" : "Em relaxamento..."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Siga as instru\xE7\xF5es do \xE1udio"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: "#f5f3ff",
      borderRadius: 20,
      padding: "8px 20px",
      border: "1px solid #ede9fe",
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 14,
    style: {
      color: "#7B00C4"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      fontFamily: "monospace",
      color: "#7B00C4"
    }
  }, mm, ":", ss)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: togglePausa
  }, /*#__PURE__*/React.createElement(Icon, {
    name: pausado ? "play" : "pause",
    size: 16
  }), " ", pausado ? "Continuar" : "Pausar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: parar
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "square",
    size: 15
  }), " Parar")), /*#__PURE__*/React.createElement("style", null, `
        @keyframes pulse-slow {
          0%,100%{transform:scale(1);opacity:0.6}
          50%{transform:scale(1.08);opacity:1}
        }
        .pulse-slow{animation:pulse-slow 3s ease-in-out infinite}
      `));
}
// ── Árvore da Decisão ──
function FerramentaArvore() {
  const [step, setStep] = useState("home");
  const [preocupacao, setPreocupacao] = useState("");
  const [acoes, setAcoes] = useState("");
  const [plano, setPlano] = useState("");
  const [conclusao, setConclusao] = useState(null);
  const [historico, setHistorico] = useState([]);
  function reiniciar() {
    setStep("home");
    setPreocupacao("");
    setAcoes("");
    setPlano("");
    setConclusao(null);
  }
  function salvarHistorico(c) {
    setHistorico(h => [{
      data: new Date().toLocaleDateString("pt-BR"),
      preocupacao,
      conclusao: c
    }, ...h].slice(0, 10));
    setConclusao(c);
    setStep("conclusao");
  }
  const CONCLUSOES = {
    redirect: {
      emoji: "🌿",
      titulo: "Redirecione sua atenção",
      desc: "Esta situação está fora do seu controle agora. Direcione sua energia para algo que possa fazer.",
      cor: "#0891b2",
      bg: "#e0f2fe"
    },
    "act-now": {
      emoji: "⚡",
      titulo: "Realize esta tarefa agora!",
      desc: "Você identificou uma ação que pode ser feita agora. Coloque-a em prática!",
      cor: "#059669",
      bg: "#d1fae5"
    },
    plan: {
      emoji: "📋",
      titulo: "Siga o seu plano",
      desc: "Você tem um plano para agir no momento certo. Confie nele e direcione sua atenção.",
      cor: "#d97706",
      bg: "#fef3c7"
    }
  };
  if (step === "home") return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 12
    }
  }, "\uD83C\uDF33"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "\xC1rvore da Decis\xE3o"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 8
    }
  }, "Uma t\xE9cnica da TCC para transformar preocupa\xE7\xF5es em a\xE7\xF5es concretas \u2014 distinguindo o que est\xE1 ou n\xE3o no seu controle."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "#9ca3af",
      marginBottom: 24
    }
  }, "\uD83D\uDCA1 Preocupa\xE7\xF5es ", /*#__PURE__*/React.createElement("strong", null, "produtivas"), " levam \xE0 a\xE7\xE3o. ", /*#__PURE__*/React.createElement("strong", null, "Improdutivas"), " paralisam."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 15,
      padding: "12px 32px"
    },
    onClick: () => setStep("worry")
  }, "Iniciar exerc\xEDcio \u2192"), historico.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 10
    }
  }, "Registros anteriores"), historico.map((h, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "8px 12px",
      background: "#f9fafb",
      borderRadius: 8,
      marginBottom: 6,
      fontSize: 12,
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      color: "#374151",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, h.preocupacao), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#9ca3af",
      marginLeft: 8,
      flexShrink: 0
    }
  }, h.data)))));
  if (step === "worry") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Qual \xE9 a sua preocupa\xE7\xE3o agora?"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: preocupacao,
    onChange: e => setPreocupacao(e.target.value),
    placeholder: "Descreva o que est\xE1 te preocupando..."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 16,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep("home")
  }, "Voltar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setStep("can-intervene"),
    disabled: !preocupacao.trim()
  }, "Pr\xF3ximo \u2192")));
  if (step === "can-intervene") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Voc\xEA pode fazer algo para resolver esta preocupa\xE7\xE3o?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 20
    }
  }, "Pense se existe alguma a\xE7\xE3o concreta que voc\xEA pode tomar."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      flex: 1,
      padding: 16
    },
    onClick: () => setStep("actions")
  }, "\u2705 Sim, posso agir"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      flex: 1,
      padding: 16
    },
    onClick: () => salvarHistorico("redirect")
  }, "\u274C N\xE3o est\xE1 no meu controle")));
  if (step === "actions") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Quais a\xE7\xF5es voc\xEA pode tomar?"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: acoes,
    onChange: e => setAcoes(e.target.value),
    placeholder: "Liste as a\xE7\xF5es poss\xEDveis..."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 16,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep("can-intervene")
  }, "Voltar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setStep("can-act-now"),
    disabled: !acoes.trim()
  }, "Pr\xF3ximo \u2192")));
  if (step === "can-act-now") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Voc\xEA pode realizar alguma dessas a\xE7\xF5es agora?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      flex: 1,
      padding: 16
    },
    onClick: () => salvarHistorico("act-now")
  }, "\u26A1 Sim, agora"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      flex: 1,
      padding: 16
    },
    onClick: () => setStep("plan")
  }, "\uD83D\uDCCB Preciso planejar")));
  if (step === "plan") return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Crie um plano de a\xE7\xE3o:"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: plano,
    onChange: e => setPlano(e.target.value),
    placeholder: "Quando e como voc\xEA vai agir?"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 16,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStep("can-act-now")
  }, "Voltar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => salvarHistorico("plan"),
    disabled: !plano.trim()
  }, "Finalizar \u2192")));
  if (step === "conclusao" && conclusao) {
    const c = CONCLUSOES[conclusao];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: c.bg,
        borderRadius: 16,
        padding: 24,
        textAlign: "center",
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 40,
        marginBottom: 8
      }
    }, c.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: 700,
        color: c.cor,
        marginBottom: 8
      }
    }, c.titulo), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#6b7280"
      }
    }, c.desc)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f9fafb",
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        marginBottom: 4
      }
    }, "Sua preocupa\xE7\xE3o:"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#6b7280"
      }
    }, preocupacao), acoes && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        marginBottom: 4,
        marginTop: 10
      }
    }, "A\xE7\xF5es identificadas:"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#6b7280"
      }
    }, acoes)), plano && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        marginBottom: 4,
        marginTop: 10
      }
    }, "Seu plano:"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#6b7280"
      }
    }, plano))), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      style: {
        width: "100%"
      },
      onClick: reiniciar
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "rotate-ccw",
      size: 16
    }), " Nova preocupa\xE7\xE3o"));
  }
  return null;
}

// ── Ferramenta genérica (placeholder para as demais) ──
function FerramentaGenerica({
  recurso
}) {
  const INFO = {
    "abc-record": {
      emoji: "📋",
      titulo: "Registro ABC de Pensamentos",
      desc: "Identifique a Situação (A), o Pensamento Automático (B) e a Emoção/Consequência (C).",
      cor: "#7c3aed"
    },
    "anxiety-management": {
      emoji: "🎯",
      titulo: "Gestão da Ansiedade",
      desc: "Monitore seu nível de estresse, atividades anti-ansiedade, pensamentos e roda da vida.",
      cor: "#6366f1"
    },
    "emotional-eating": {
      emoji: "🍃",
      titulo: "Rastreamento Emocional da Alimentação",
      desc: "Registre a emoção, o gatilho e o comportamento alimentar.",
      cor: "#059669"
    },
    "entrevista-clinica": {
      emoji: "📝",
      titulo: "Entrevista Clínica Inicial",
      desc: "Instrumento de avaliação clínica inicial com perfil etário e hipóteses DSM-5.",
      cor: "#0891b2"
    },
    "anamnese": {
      emoji: "📄",
      titulo: "Anamnese — Marcos do Desenvolvimento",
      desc: "Formulário completo de anamnese para histórico do desenvolvimento.",
      cor: "#7c3aed"
    },
    "treino-neuro-auditivo": {
      emoji: "🎵",
      titulo: "Treino Neuro-Auditivo",
      desc: "Discriminação auditiva: sons graves/agudos, vozes, intensidade, ritmo e melodia.",
      cor: "#be185d"
    }
  };
  const info = INFO[recurso.formularioKey] || {
    emoji: "🔧",
    titulo: recurso.titulo,
    desc: recurso.descricao,
    cor: "#7c3aed"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "30px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 80,
      borderRadius: 20,
      background: info.cor + "15",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 16px",
      fontSize: 36
    }
  }, info.emoji), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 8
    }
  }, info.titulo), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      lineHeight: 1.7,
      marginBottom: 24,
      maxWidth: 400,
      margin: "0 auto 24px"
    }
  }, info.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9f5ff",
      border: "1px solid #e9d5ff",
      borderRadius: 10,
      padding: 16,
      fontSize: 13,
      color: "#7c3aed"
    }
  }, "Esta ferramenta est\xE1 dispon\xEDvel no portal do paciente. O paciente acessa e preenche diretamente pelo login deles."));
}

// ── Modal principal ──
// ── ABC de Pensamentos ──────────────────────────────────────────────────────
function FerramentaABC() {
  const EMOCOES = ["Ansiedade", "Tristeza", "Raiva", "Medo", "Vergonha", "Culpa", "Frustração", "Insegurança", "Alívio", "Esperança"];
  const [passo, setPasso] = useState(1); // 1=situação, 2=pensamento, 3=emoção, 4=resposta, 5=concluído
  const [draft, setDraft] = useState({
    situacao: "",
    pensamento: "",
    emocao: "",
    intensidade: 60,
    alternativo: ""
  });
  const [registros, setRegistros] = useState([]);
  const [verReg, setVerReg] = useState(null);
  function salvar() {
    if (!draft.situacao || !draft.pensamento || !draft.emocao) return;
    setRegistros(r => [{
      ...draft,
      id: Date.now() + "",
      data: new Date().toLocaleDateString("pt-BR")
    }, ...r]);
    setPasso(5);
  }
  function reiniciar() {
    setDraft({
      situacao: "",
      pensamento: "",
      emocao: "",
      intensidade: 60,
      alternativo: ""
    });
    setPasso(1);
  }
  const PASSOS_INFO = [{
    n: 1,
    letra: "A",
    titulo: "Situação",
    subtitulo: "O que aconteceu?",
    cor: "#3b82f6",
    bg: "#dbeafe",
    icone: "🔍",
    dica: "Descreva a situação de forma objetiva — onde estava, com quem, o que aconteceu. Sem interpretações ainda.",
    placeholder: "Ex: Meu chefe me chamou para uma conversa inesperada..."
  }, {
    n: 2,
    letra: "B",
    titulo: "Pensamento Automático",
    subtitulo: "O que passou pela sua cabeça?",
    cor: "#7c3aed",
    bg: "#ede9fe",
    icone: "💭",
    dica: "Qual foi o primeiro pensamento que surgiu automaticamente? Escreva exatamente como veio, sem filtrar.",
    placeholder: "Ex: Devo ter cometido um erro grave. Vou ser demitido..."
  }, {
    n: 3,
    letra: "C",
    titulo: "Emoção e Intensidade",
    subtitulo: "O que você sentiu?",
    cor: "#d97706",
    bg: "#fef3c7",
    icone: "❤️",
    dica: "Nomeie a emoção principal e avalie sua intensidade. Pode haver mais de uma — escolha a mais forte."
  }, {
    n: 4,
    letra: "D",
    titulo: "Resposta Racional",
    subtitulo: "O que a razão diz?",
    cor: "#059669",
    bg: "#dcfce7",
    icone: "⚖️",
    dica: "Questione o pensamento automático. Há evidências reais? Qual seria uma forma mais equilibrada de ver essa situação?",
    placeholder: "Ex: Pode ser apenas um feedback de rotina. Não tenho evidências de que vou ser demitido..."
  }];
  const passoInfo = PASSOS_INFO[passo - 1] || PASSOS_INFO[0];
  const intCor = draft.intensidade < 34 ? "#059669" : draft.intensidade < 67 ? "#d97706" : "#dc2626";

  // ── Ver registro ─────────────────────────────────────────────────
  if (verReg) return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setVerReg(null),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--purple)",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "inherit",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, "\u2190 Voltar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, verReg.data), [{
    letra: "A",
    cor: "#3b82f6",
    bg: "#dbeafe",
    titulo: "Situação",
    val: verReg.situacao
  }, {
    letra: "B",
    cor: "#7c3aed",
    bg: "#ede9fe",
    titulo: "Pensamento",
    val: verReg.pensamento
  }, {
    letra: "C",
    cor: "#d97706",
    bg: "#fef3c7",
    titulo: `Emoção: ${verReg.emocao} (${verReg.intensidade}%)`,
    val: null
  }, {
    letra: "D",
    cor: "#059669",
    bg: "#dcfce7",
    titulo: "Resposta Racional",
    val: verReg.alternativo || "—"
  }].map(c => /*#__PURE__*/React.createElement("div", {
    key: c.letra,
    style: {
      background: c.bg,
      borderRadius: 12,
      padding: "12px 16px",
      marginBottom: 10,
      borderLeft: `4px solid ${c.cor}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 11,
      color: c.cor,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: "0.5px"
    }
  }, c.letra, " \u2014 ", c.titulo), c.val && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#374151",
      lineHeight: 1.6
    }
  }, c.val))));

  // ── Concluído ────────────────────────────────────────────────────
  if (passo === 5) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\u2696\uFE0F"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: "var(--purple)",
      marginBottom: 8
    }
  }, "Registro salvo!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 32,
      lineHeight: 1.6
    }
  }, "Identificar e questionar pensamentos autom\xE1ticos \xE9 um dos exerc\xEDcios mais poderosos da TCC. \uD83D\uDC9C"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: reiniciar,
    style: {
      padding: "10px 20px",
      borderRadius: 10,
      border: "none",
      background: "var(--purple)",
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "inherit"
    }
  }, "Novo registro"), registros.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setVerReg(registros[0]),
    style: {
      padding: "10px 20px",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      background: "white",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, "Ver \xFAltimo")));

  // ── Wizard ───────────────────────────────────────────────────────
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 24
    }
  }, PASSOS_INFO.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.n,
    style: {
      flex: 1,
      height: 4,
      borderRadius: 4,
      background: p.n <= passo ? p.cor : "var(--gray-100)",
      cursor: p.n < passo ? "pointer" : "default",
      transition: "background .2s"
    },
    onClick: () => p.n < passo && setPasso(p.n)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 12,
      background: passoInfo.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 900,
      fontSize: 18,
      color: passoInfo.cor
    }
  }, passoInfo.letra)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      color: "var(--text)"
    }
  }, passoInfo.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, passoInfo.subtitulo))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--gray-50)",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 12,
      color: "var(--text-muted)",
      lineHeight: 1.6,
      borderLeft: `3px solid ${passoInfo.cor}`
    }
  }, passoInfo.dica), passo <= 2 && /*#__PURE__*/React.createElement("textarea", {
    value: draft[passo === 1 ? "situacao" : "pensamento"],
    onChange: e => setDraft({
      ...draft,
      [passo === 1 ? "situacao" : "pensamento"]: e.target.value
    }),
    placeholder: passoInfo.placeholder,
    style: {
      width: "100%",
      minHeight: 100,
      padding: "12px",
      borderRadius: 10,
      border: `1.5px solid ${passoInfo.cor}50`,
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), passo === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 20
    }
  }, EMOCOES.map(em => {
    const sel = draft.emocao === em;
    return /*#__PURE__*/React.createElement("button", {
      key: em,
      onClick: () => setDraft({
        ...draft,
        emocao: em
      }),
      style: {
        padding: "7px 14px",
        borderRadius: 20,
        border: "1.5px solid",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        borderColor: sel ? passoInfo.cor : "var(--gray-200)",
        background: sel ? passoInfo.bg : "white",
        color: sel ? passoInfo.cor : "var(--text-muted)",
        fontWeight: sel ? 700 : 400,
        transition: "all .12s"
      }
    }, em);
  })), draft.emocao && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "Intensidade de ", draft.emocao), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: intCor
    }
  }, draft.intensidade, "%")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: 100,
    value: draft.intensidade,
    onChange: e => setDraft({
      ...draft,
      intensidade: +e.target.value
    }),
    style: {
      width: "100%",
      accentColor: passoInfo.cor
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", null, "Leve"), /*#__PURE__*/React.createElement("span", null, "Moderada"), /*#__PURE__*/React.createElement("span", null, "Intensa")))), passo === 4 && /*#__PURE__*/React.createElement("textarea", {
    value: draft.alternativo,
    onChange: e => setDraft({
      ...draft,
      alternativo: e.target.value
    }),
    placeholder: passoInfo.placeholder,
    style: {
      width: "100%",
      minHeight: 100,
      padding: "12px",
      borderRadius: 10,
      border: `1.5px solid ${passoInfo.cor}50`,
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 20
    }
  }, passo > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setPasso(passo - 1),
    style: {
      flex: 1,
      padding: "11px",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      background: "white",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, "\u2190 Anterior"), passo < 4 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setPasso(passo + 1),
    disabled: passo === 1 && !draft.situacao || passo === 2 && !draft.pensamento || passo === 3 && !draft.emocao,
    style: {
      flex: 2,
      padding: "11px",
      borderRadius: 10,
      border: "none",
      background: passo === 1 && draft.situacao || passo === 2 && draft.pensamento || passo === 3 && draft.emocao || passo > 3 ? passoInfo.cor : "var(--gray-100)",
      color: passo === 1 && draft.situacao || passo === 2 && draft.pensamento || passo === 3 && draft.emocao || passo > 3 ? "white" : "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "inherit"
    }
  }, "Pr\xF3ximo \u2192"), passo === 4 && /*#__PURE__*/React.createElement("button", {
    onClick: salvar,
    style: {
      flex: 2,
      padding: "11px",
      borderRadius: 10,
      border: "none",
      background: passoInfo.cor,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Salvar Registro \u2713")), registros.length > 0 && passo === 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)",
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: "0.5px"
    }
  }, "Registros anteriores"), registros.slice(0, 3).map(r => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    onClick: () => setVerReg(r),
    style: {
      width: "100%",
      background: "white",
      border: "1px solid var(--gray-100)",
      borderRadius: 10,
      padding: "10px 14px",
      marginBottom: 6,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#ede9fe",
      color: "#7c3aed",
      borderRadius: 6,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 700,
      flexShrink: 0
    }
  }, r.emocao), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      flex: 1
    }
  }, r.situacao), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, r.data)))));
}

// ── Gestão da Ansiedade ──────────────────────────────────────────────────────
function FerramentaGestaoAnsiedade() {
  const TECNICAS = [{
    id: "resp",
    label: "Respiração Relaxada",
    desc: "Inspirar → Pausar → Expirar por 2 min"
  }, {
    id: "visao",
    label: "Visão Periférica",
    desc: "Mover os olhos da direita para a esquerda"
  }, {
    id: "musc",
    label: "Relaxamento Muscular",
    desc: "Contrair músculos 5s e relaxar com suspiro"
  }];
  const ATIVIDADES = [{
    id: "caminhada",
    label: "🚶 Caminhada"
  }, {
    id: "meditacao",
    label: "🧘 Meditação"
  }, {
    id: "diario",
    label: "📓 Diário"
  }, {
    id: "musica",
    label: "🎵 Música"
  }, {
    id: "alongamento",
    label: "🤸 Alongamento"
  }, {
    id: "agua",
    label: "💧 Hidratação"
  }];
  const PERGUNTAS = ["Qual situação está me deixando ansioso(a)?", "Qual é o meu pensamento ansioso?", "Tenho provas reais de que é 100% verdadeiro?", "Quais evidências indicam que pode NÃO ser verdadeiro?", "Qual a probabilidade real de que o pior aconteça?", "O que eu diria a um amigo com esse mesmo pensamento?", "Existe uma forma mais útil de ver essa situação?", "Preocupar-me está me ajudando ou me machucando?"];
  const AREAS = [{
    id: "interior",
    label: "Cuidado Interior"
  }, {
    id: "familiar",
    label: "Vida Familiar"
  }, {
    id: "carreira",
    label: "Carreira"
  }, {
    id: "social",
    label: "Vida Social"
  }, {
    id: "qualidade",
    label: "Qualidade de Vida"
  }, {
    id: "saudavel",
    label: "Vida Saudável"
  }, {
    id: "financeiro",
    label: "Financeiro"
  }, {
    id: "espiritualidade",
    label: "Espiritualidade"
  }];
  const DESC = {
    1: "Em paz.",
    2: "Otimista.",
    3: "Calmo.",
    4: "Confortável.",
    5: "Neutro.",
    6: "Estressando.",
    7: "Estressado.",
    8: "Irritado.",
    9: "Tenso.",
    10: "Em pânico."
  };
  const [aba, setAba] = useState(0);
  const [stress, setStress] = useState(5);
  const [nota, setNota] = useState("");
  const [track, setTrack] = useState({});
  const [resp, setResp] = useState(Array(8).fill(""));
  const [roda, setRoda] = useState({});
  const [log, setLog] = useState([]);
  const [msg, setMsg] = useState("");
  const sc = stress <= 3 ? "#059669" : stress <= 5 ? "#d97706" : stress <= 7 ? "#f97316" : "#dc2626";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 0,
      marginBottom: 16,
      borderBottom: "1px solid #e5e7eb",
      overflowX: "auto"
    }
  }, ["😰 Estresse", "✅ Tracking", "🧠 Pensamentos", "🎯 Roda da Vida"].map((n, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setAba(i),
    style: {
      padding: "8px 14px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: aba === i ? 700 : 400,
      color: aba === i ? "var(--purple)" : "#6b7280",
      borderBottom: aba === i ? "2px solid var(--purple)" : "2px solid transparent",
      whiteSpace: "nowrap",
      fontFamily: "var(--font-body)"
    }
  }, n))), aba === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 900,
      color: sc,
      lineHeight: 1
    }
  }, stress), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#9ca3af"
    }
  }, "/10"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: sc
    }
  }, DESC[stress])), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 1,
    max: 10,
    value: stress,
    onChange: e => setStress(+e.target.value),
    style: {
      width: "100%",
      accentColor: sc,
      marginBottom: 12
    }
  }), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: nota,
    onChange: e => setNota(e.target.value),
    placeholder: "Observa\xE7\xF5es...",
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%"
    },
    onClick: () => {
      setLog(l => [{
        nivel: stress,
        nota,
        data: new Date().toLocaleDateString("pt-BR")
      }, ...l].slice(0, 20));
      setMsg("✓ Registrado!");
      setTimeout(() => setMsg(""), 2000);
    }
  }, msg || "Registrar"), log.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, log.slice(0, 5).map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 8,
      padding: "6px 10px",
      background: "#f9fafb",
      borderRadius: 8,
      marginBottom: 4,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: sc
    }
  }, s.nivel, "/10"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      color: "#6b7280"
    }
  }, s.nota || "—"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#9ca3af"
    }
  }, s.data))))), aba === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 10,
      color: "var(--purple)"
    }
  }, "T\xE9cnicas Anti-Ansiedade"), TECNICAS.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    onClick: () => setTrack(tr => ({
      ...tr,
      [t.id]: !tr[t.id]
    })),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: track[t.id] ? "var(--purple)" : "#e5e7eb",
      background: track[t.id] ? "var(--purple-soft)" : "white",
      cursor: "pointer",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, track[t.id] ? "✅" : "⭕"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, t.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6b7280"
    }
  }, t.desc)))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      margin: "14px 0 10px",
      color: "var(--purple)"
    }
  }, "Atividades"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8
    }
  }, ATIVIDADES.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    onClick: () => setTrack(tr => ({
      ...tr,
      [a.id]: !tr[a.id]
    })),
    style: {
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid",
      borderColor: track[a.id] ? "var(--purple)" : "#e5e7eb",
      background: track[a.id] ? "var(--purple-soft)" : "white",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: track[a.id] ? 600 : 400,
      color: track[a.id] ? "var(--purple)" : "#6b7280",
      textAlign: "center"
    }
  }, a.label)))), aba === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 14,
      background: "#f9f5ff",
      padding: "10px 12px",
      borderRadius: 8
    }
  }, "Responda cada pergunta com honestidade para questionar pensamentos ansiosos."), PERGUNTAS.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: "var(--purple-soft)",
      color: "var(--purple)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700,
      flexShrink: 0
    }
  }, i + 1), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      lineHeight: 1.4
    }
  }, p)), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: resp[i],
    onChange: e => {
      const r = [...resp];
      r[i] = e.target.value;
      setResp(r);
    },
    placeholder: "Sua resposta..."
  }))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%"
    },
    onClick: () => {
      setMsg("✓ Salvo!");
      setTimeout(() => setMsg(""), 2000);
    }
  }, msg || "Salvar respostas")), aba === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 14
    }
  }, "Avalie cada \xE1rea de 0 a 10. O gr\xE1fico atualiza em tempo real."), AREAS.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      marginBottom: 10
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
      fontWeight: 600
    }
  }, a.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: "var(--purple)"
    }
  }, roda[a.id] || 0, "/10")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: 10,
    value: roda[a.id] || 0,
    onChange: e => setRoda(r => ({
      ...r,
      [a.id]: +e.target.value
    })),
    style: {
      width: "100%",
      accentColor: "var(--purple)"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      margin: "16px 0"
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    id: "rodaChart",
    width: "260",
    height: "260",
    ref: el => {
      if (!el || typeof Chart === "undefined") return;
      const vals = AREAS.map(a => roda[a.id] || 0);
      const labels = AREAS.map(a => a.label);
      if (el._chart) el._chart.destroy();
      el._chart = new Chart(el, {
        type: "radar",
        data: {
          labels,
          datasets: [{
            data: vals,
            backgroundColor: "rgba(123,0,196,0.15)",
            borderColor: "#7B00C4",
            borderWidth: 2,
            pointBackgroundColor: "#7B00C4",
            pointRadius: 4
          }]
        },
        options: {
          scales: {
            r: {
              min: 0,
              max: 10,
              ticks: {
                stepSize: 2,
                font: {
                  size: 9
                }
              },
              pointLabels: {
                font: {
                  size: 10
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%"
    },
    onClick: () => {
      setMsg("✓ Roda da Vida salva!");
      setTimeout(() => setMsg(""), 2000);
    }
  }, msg || "Salvar Roda da Vida")));
}

// ── Rastreamento Emocional da Alimentação ───────────────────────────────────
function FerramentaRastreamento() {
  const EMOCOES = ["Ansiedade", "Tédio", "Tristeza", "Raiva", "Solidão", "Estresse", "Cansaço", "Felicidade"];
  const SENSACOES = ["Culpa", "Vergonha", "Alívio", "Indiferença", "Satisfação", "Arrependimento"];
  const [fome, setFome] = useState(5);
  const [emocoes, setEmocoes] = useState([]);
  const [pensamento, setPensamento] = useState("");
  const [comeu, setComeu] = useState("");
  const [alivio, setAlivio] = useState(5);
  const [duracao, setDuracao] = useState("");
  const [sensacoes, setSensacoes] = useState([]);
  const [reflexao, setReflexao] = useState("");
  const [entries, setEntries] = useState([]);
  const [msg, setMsg] = useState("");
  function Chips({
    opts,
    sel,
    toggle
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6
      }
    }, opts.map(o => /*#__PURE__*/React.createElement("button", {
      key: o,
      onClick: () => toggle(o),
      style: {
        padding: "4px 12px",
        borderRadius: 20,
        border: "1px solid",
        borderColor: sel.includes(o) ? "var(--purple)" : "#e5e7eb",
        background: sel.includes(o) ? "var(--purple)" : "white",
        color: sel.includes(o) ? "white" : "#6b7280",
        fontSize: 12,
        cursor: "pointer"
      }
    }, o)));
  }
  function salvar() {
    if (!comeu.trim()) {
      alert("Descreva o que você comeu.");
      return;
    }
    setEntries(e => [{
      id: Date.now() + "",
      data: new Date().toLocaleDateString("pt-BR"),
      fome,
      emocoes: [...emocoes],
      pensamento,
      comeu,
      alivio,
      duracao,
      sensacoes: [...sensacoes],
      reflexao
    }, ...e]);
    setFome(5);
    setEmocoes([]);
    setPensamento("");
    setComeu("");
    setAlivio(5);
    setDuracao("");
    setSensacoes([]);
    setReflexao("");
    setMsg("✓ Salvo!");
    setTimeout(() => setMsg(""), 2000);
  }
  const fc = fome <= 3 ? "#059669" : fome <= 6 ? "#d97706" : "#dc2626";
  const ac = alivio <= 3 ? "#059669" : alivio <= 6 ? "#d97706" : "#dc2626";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fdf4ff",
      border: "1px solid #e9d5ff",
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      fontSize: 12,
      color: "#5a007a",
      lineHeight: 1.6
    }
  }, "Use sempre que sentir urg\xEAncia de comer ou ap\xF3s um epis\xF3dio de compuls\xE3o. O objetivo \xE9 entender o \"porqu\xEA\" \u2014 sem julgamento."), [["Nível de Fome Física", fome, setFome, fc], ["Nível de Alívio após comer", alivio, setAlivio, ac]].map(([lbl, val, set, col]) => /*#__PURE__*/React.createElement("div", {
    key: lbl,
    style: {
      marginBottom: 14
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
      fontWeight: 600
    }
  }, lbl), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: col
    }
  }, val, "/10")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: 10,
    value: val,
    onChange: e => set(+e.target.value),
    style: {
      width: "100%",
      accentColor: "var(--purple)"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Emo\xE7\xF5es presentes"), /*#__PURE__*/React.createElement(Chips, {
    opts: EMOCOES,
    sel: emocoes,
    toggle: o => setEmocoes(v => v.includes(o) ? v.filter(x => x !== o) : [...v, o])
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Pensamento permissivo"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: pensamento,
    onChange: e => setPensamento(e.target.value),
    placeholder: "'S\xF3 desta vez...' 'Mere\xE7o isso...'"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "O que voc\xEA comeu?"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: comeu,
    onChange: e => setComeu(e.target.value),
    placeholder: "Descreva os alimentos..."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 8
    }
  }, "Como voc\xEA se sentiu depois?"), /*#__PURE__*/React.createElement(Chips, {
    opts: SENSACOES,
    sel: sensacoes,
    toggle: o => setSensacoes(v => v.includes(o) ? v.filter(x => x !== o) : [...v, o])
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Reflex\xE3o"), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 2,
    value: reflexao,
    onChange: e => setReflexao(e.target.value),
    placeholder: "O que esse epis\xF3dio revela sobre suas necessidades emocionais?"
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%"
    },
    onClick: salvar
  }, msg || "Salvar registro"), entries.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 8
    }
  }, entries.length, " registro(s)"), entries.map(en => /*#__PURE__*/React.createElement("div", {
    key: en.id,
    style: {
      background: "#f9fafb",
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      fontSize: 12,
      border: "1px solid #e5e7eb"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#6b7280"
    }
  }, en.data), /*#__PURE__*/React.createElement("span", {
    style: {
      background: "#ede9fe",
      color: "var(--purple)",
      borderRadius: 20,
      padding: "1px 8px",
      fontWeight: 600
    }
  }, "Fome: ", en.fome, "/10")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Comeu:"), " ", en.comeu), en.emocoes.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#6b7280"
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Emo\xE7\xF5es:"), " ", en.emocoes.join(", "))))));
}

// ── Treino Neuro-Auditivo ───────────────────────────────────────────────────
function FerramentaTreino() {
  const [modulo, setModulo] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [tocando, setTocando] = useState(null);
  const ctxRef = useRef(null);
  function getCtx() {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }
  function tocarTom(freq, dur = 1.5, vol = 0.4, wave = "sine") {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
  function falar(txt, pitch = 1, rate = 0.9) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "pt-BR";
    u.pitch = pitch;
    u.rate = rate;
    const v = window.speechSynthesis.getVoices().find(x => x.lang.startsWith("pt"));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }
  const MODULOS = [{
    titulo: "Grave / Agudo",
    emoji: "🎵",
    exercicios: [{
      id: "m0e0",
      pergunta: "Ouça e diga: GRAVE ou AGUDO?",
      btn: {
        label: "▶ Tocar",
        action: () => {
          const f = Math.random() > 0.5 ? 180 : 2200;
          tocarTom(f);
          return f > 500 ? "agudo" : "grave";
        }
      },
      opcoes: ["grave", "agudo"],
      resposta: "grave",
      dica: "Sons graves têm frequência baixa. Sons agudos têm frequência alta."
    }, {
      id: "m0e1",
      pergunta: "Qual som é mais GRAVE?",
      btn: {
        label: "▶ Som A (80Hz)",
        action: () => tocarTom(80)
      },
      btn2: {
        label: "▶ Som B (800Hz)",
        action: () => tocarTom(800)
      },
      opcoes: ["Som A", "Som B"],
      resposta: "Som A",
      dica: "O Som A (80Hz) é grave — similar a um contrabaixo."
    }]
  }, {
    titulo: "Vozes",
    emoji: "🎤",
    exercicios: [{
      id: "m1e0",
      pergunta: "Feminina ou masculina?",
      btn: {
        label: "▶ Ouvir",
        action: () => falar("Olá, como você está hoje?", 1.4, 0.95)
      },
      opcoes: ["Feminina", "Masculina"],
      resposta: "Feminina",
      dica: "Tom agudo + pitch alto = voz feminina."
    }, {
      id: "m1e1",
      pergunta: "Feminina ou masculina?",
      btn: {
        label: "▶ Ouvir",
        action: () => falar("Bom dia, tudo bem com você?", 0.5, 0.85)
      },
      opcoes: ["Feminina", "Masculina"],
      resposta: "Masculina",
      dica: "Pitch baixo indica voz masculina."
    }]
  }, {
    titulo: "Intensidade",
    emoji: "🔊",
    exercicios: [{
      id: "m2e0",
      pergunta: "Qual som tem mais VOLUME?",
      btn: {
        label: "▶ Som Fraco",
        action: () => tocarTom(440, 1, 0.08)
      },
      btn2: {
        label: "▶ Som Forte",
        action: () => tocarTom(440, 1, 0.7)
      },
      opcoes: ["Som Fraco", "Som Forte"],
      resposta: "Som Forte",
      dica: "O Som Forte foi tocado com volume muito maior."
    }]
  }, {
    titulo: "Emoções",
    emoji: "😊",
    exercicios: [{
      id: "m3e0",
      pergunta: "Que emoção você identifica?",
      btn: {
        label: "▶ Ouvir",
        action: () => falar("Hoje foi um dia incrível, estou muito feliz!", 1.4, 1.1)
      },
      opcoes: ["Alegria", "Tristeza", "Raiva", "Medo"],
      resposta: "Alegria",
      dica: "Tom agudo, rápido e animado = alegria."
    }, {
      id: "m3e1",
      pergunta: "Que emoção você identifica?",
      btn: {
        label: "▶ Ouvir",
        action: () => falar("Não sei o que fazer, tudo parece muito difícil.", 0.8, 0.8)
      },
      opcoes: ["Alegria", "Tristeza", "Frustração", "Ansiedade"],
      resposta: "Tristeza",
      dica: "Tom baixo e pausado = tristeza."
    }]
  }];
  function responder(exId, val, correto) {
    const c = val === correto;
    setRespostas(r => ({
      ...r,
      [exId]: val
    }));
    setFeedbacks(f => ({
      ...f,
      [exId]: c
    }));
    if (!respostas[exId]) {
      setTotal(t => t + 1);
      if (c) setScore(s => s + 1);
    }
  }
  const mod = MODULOS[modulo];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
      padding: "8px 12px",
      background: "var(--purple-soft)",
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--purple)"
    }
  }, "\uD83C\uDFC6 ", score, "/", total), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--purple)"
    }
  }, Math.round(total > 0 ? score / total * 100 : 0), "% de acerto")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      overflowX: "auto",
      marginBottom: 16,
      paddingBottom: 4
    }
  }, MODULOS.map((m, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setModulo(i),
    style: {
      padding: "6px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: modulo === i ? "var(--purple)" : "#e5e7eb",
      background: modulo === i ? "var(--purple)" : "white",
      color: modulo === i ? "white" : "#6b7280",
      fontSize: 12,
      cursor: "pointer",
      whiteSpace: "nowrap",
      flexShrink: 0
    }
  }, m.emoji, " ", m.titulo))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      marginBottom: 14
    }
  }, mod.emoji, " ", mod.titulo), mod.exercicios.map(ex => /*#__PURE__*/React.createElement("div", {
    key: ex.id,
    style: {
      background: "#f9fafb",
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
      border: "1px solid #e5e7eb"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 10
    }
  }, ex.pergunta), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 12
    },
    onClick: () => {
      setTocando(ex.id);
      ex.btn.action();
      setTimeout(() => setTocando(null), 2000);
    }
  }, tocando === ex.id ? "🔊 Tocando..." : ex.btn.label), ex.btn2 && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      fontSize: 12
    },
    onClick: () => ex.btn2.action()
  }, ex.btn2.label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 8
    }
  }, ex.opcoes.map((op, oi) => /*#__PURE__*/React.createElement("button", {
    key: oi,
    onClick: () => responder(ex.id, op, ex.resposta),
    style: {
      padding: "8px 16px",
      borderRadius: 10,
      border: "1.5px solid",
      fontSize: 13,
      cursor: "pointer",
      fontWeight: 500,
      borderColor: respostas[ex.id] === op ? feedbacks[ex.id] ? "#059669" : "#dc2626" : "#e5e7eb",
      background: respostas[ex.id] === op ? feedbacks[ex.id] ? "#d1fae5" : "#fee2e2" : "white",
      color: respostas[ex.id] === op ? feedbacks[ex.id] ? "#059669" : "#dc2626" : "#374151"
    }
  }, op))), respostas[ex.id] && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      background: feedbacks[ex.id] ? "#d1fae5" : "#fee2e2",
      fontSize: 12,
      color: feedbacks[ex.id] ? "#059669" : "#dc2626",
      fontWeight: 600
    }
  }, feedbacks[ex.id] ? "✓ Correto! " : "✗ Incorreto. ", ex.dica))));
}

// ── Anamnese ────────────────────────────────────────────────────────────────
function FerramentaAnamnese() {
  const PERFIS = ["Criança (0-12)", "Adolescente (13-17)", "Adulto (18-59)", "Idoso (60+)"];
  const SECOES = {
    "Criança (0-12)": ["Identificação", "Gestação e Parto", "Marcos do Desenvolvimento", "Alimentação e Sono", "Desenvolvimento Motor", "Linguagem", "Comportamento", "Escolaridade", "Histórico de Saúde", "Dinâmica Familiar"],
    "Adolescente (13-17)": ["Identificação", "Histórico Escolar", "Relações Sociais", "Comportamento e Humor", "Sexualidade", "Substâncias", "Histórico de Saúde", "Dinâmica Familiar"],
    "Adulto (18-59)": ["Identificação", "Queixa Principal", "Histórico da Queixa", "Histórico Psicológico", "Saúde Física", "Relacionamentos", "Trabalho e Estudo", "Sono e Alimentação", "Histórico Familiar"],
    "Idoso (60+)": ["Identificação", "Queixa Principal", "Histórico Médico", "Medicamentos", "Cognição", "Mobilidade", "Sono", "Suporte Social", "Dinâmica Familiar"]
  };
  const [perfil, setPerfil] = useState("");
  const [secao, setSecao] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [concluido, setConcluido] = useState(false);
  if (!perfil) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      marginBottom: 12
    }
  }, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 14
    }
  }, "Selecione o perfil:"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      maxWidth: 320,
      margin: "0 auto"
    }
  }, PERFIS.map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    className: "btn btn-outline",
    style: {
      padding: "12px 8px",
      fontSize: 12,
      fontWeight: 600
    },
    onClick: () => setPerfil(p)
  }, p))));
  const secs = SECOES[perfil] || [];
  if (concluido) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 12
    }
  }, "\u2705"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Anamnese Conclu\xEDda!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginBottom: 16
    }
  }, perfil, " \xB7 ", secs.length, " se\xE7\xF5es"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => {
      setPerfil("");
      setSecao(0);
      setRespostas({});
      setConcluido(false);
    }
  }, "Nova Anamnese"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      color: "#6b7280",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--purple)",
      fontWeight: 600
    }
  }, perfil), /*#__PURE__*/React.createElement("span", null, "Se\xE7\xE3o ", secao + 1, "/", secs.length)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#e5e7eb",
      borderRadius: 20,
      height: 5,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple)",
      height: 5,
      borderRadius: 20,
      width: secao / secs.length * 100 + "%",
      transition: "width .3s"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 17,
      fontWeight: 600,
      marginBottom: 12
    }
  }, secs[secao]), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 5,
    value: respostas[secs[secao]] || "",
    onChange: e => setRespostas(r => ({
      ...r,
      [secs[secao]]: e.target.value
    })),
    placeholder: `Registre as informações sobre "+secs[secao].toLowerCase()+"...`
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 14,
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setSecao(s => Math.max(0, s - 1)),
    disabled: secao === 0
  }, "\u2190 Anterior"), secao < secs.length - 1 ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setSecao(s => s + 1)
  }, "Pr\xF3xima \u2192") : /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setConcluido(true)
  }, "\u2713 Concluir")));
}

// ── Diário Terapêutico ──────────────────────────────────────────────────────
function FerramentaDiario({
  user
}) {
  const [entradas, setEntradas] = useState([]);
  const [texto, setTexto] = useState("");
  const [tag, setTag] = useState("geral");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [verEntrada, setVerEntrada] = useState(null);
  const [gravando, setGravando] = useState(false);
  const [loading, setLoading] = useState(true);
  const recRef = useRef(null);
  const TAGS = [{
    v: "geral",
    l: "Geral",
    e: "📝"
  }, {
    v: "gratidao",
    l: "Gratidão",
    e: "🙏"
  }, {
    v: "desafio",
    l: "Desafio",
    e: "⚡"
  }, {
    v: "conquista",
    l: "Conquista",
    e: "🏆"
  }, {
    v: "emocao",
    l: "Emoção",
    e: "💜"
  }];
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const unsub = db.collection("clinica_diario").where("pacienteId", "==", user.id).orderBy("createdAt", "desc").onSnapshot(snap => {
      setEntradas(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user?.id]);
  function toggleGravacao() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Seu navegador não suporta reconhecimento de voz. Tente o Chrome.");
      return;
    }
    if (gravando) {
      recRef.current?.stop();
      setGravando(false);
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(" ");
      setTexto(t => {
        const base = t.replace(/\s*\[gravando\.\.\.\]$/, "").trimEnd();
        return base ? base + " " + transcript : transcript;
      });
    };
    rec.onerror = () => setGravando(false);
    rec.onend = () => setGravando(false);
    recRef.current = rec;
    rec.start();
    setGravando(true);
  }
  async function salvar() {
    if (!texto.trim()) {
      setMsg("Escreva ou grave algo antes de salvar.");
      setTimeout(() => setMsg(""), 2500);
      return;
    }
    setSalvando(true);
    try {
      await db.collection("clinica_diario").add({
        pacienteId: user?.id || "",
        pacienteNome: user?.nome || "",
        texto: texto.trim(),
        tag,
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        }),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setTexto("");
      setTag("geral");
      setMsg("✓ Entrada salva! 💜");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setMsg("Erro ao salvar: " + e.message);
    }
    setSalvando(false);
  }
  async function excluir(id) {
    if (!confirm("Excluir esta entrada?")) return;
    await db.collection("clinica_diario").doc(id).delete();
    setVerEntrada(null);
  }
  if (verEntrada) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 4px"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      marginBottom: 16,
      padding: "8px 12px"
    },
    onClick: () => setVerEntrada(null)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 16
  }), " Voltar"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9f5ff",
      borderRadius: 14,
      padding: 20,
      marginBottom: 12,
      border: "1px solid #ede9fe"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, verEntrada.data, " \xE0s ", verEntrada.hora), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--purple)",
      background: "#ede9fe",
      borderRadius: 20,
      padding: "2px 10px"
    }
  }, TAGS.find(t => t.v === verEntrada.tag)?.e, " ", TAGS.find(t => t.v === verEntrada.tag)?.l)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      lineHeight: 1.8,
      color: "var(--gray-800)",
      whiteSpace: "pre-wrap"
    }
  }, verEntrada.texto)), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      color: "#dc2626",
      borderColor: "#fca5a5",
      fontSize: 13
    },
    onClick: () => excluir(verEntrada.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trash-2",
    size: 14
  }), " Excluir entrada"));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 4px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#faf5ff",
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
      border: "1px solid #ede9fe"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 16,
      fontWeight: 600,
      marginBottom: 12,
      color: "var(--purple)"
    }
  }, "\uD83D\uDCD3 Nova entrada"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 6
    }
  }, "Categoria"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, TAGS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.v,
    onClick: () => setTag(t.v),
    style: {
      fontSize: 12,
      padding: "4px 10px",
      borderRadius: 20,
      border: tag === t.v ? "2px solid var(--purple)" : "1px solid #e5e7eb",
      background: tag === t.v ? "#ede9fe" : "white",
      color: tag === t.v ? "var(--purple)" : "var(--gray-600)",
      cursor: "pointer"
    }
  }, t.e, " ", t.l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("textarea", {
    value: texto,
    onChange: e => setTexto(e.target.value),
    placeholder: "Escreva ou use o microfone para falar sobre o seu dia...",
    style: {
      width: "100%",
      minHeight: 120,
      borderRadius: 10,
      border: gravando ? "2px solid var(--purple)" : "1px solid #e5e7eb",
      padding: "10px 44px 10px 14px",
      fontSize: 14,
      fontFamily: "var(--font-body)",
      resize: "vertical",
      outline: "none",
      lineHeight: 1.7,
      boxSizing: "border-box",
      transition: "border .2s"
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: toggleGravacao,
    title: gravando ? "Parar gravação" : "Falar",
    style: {
      position: "absolute",
      right: 8,
      bottom: 10,
      background: gravando ? "#7B00C4" : "#f3f0ff",
      border: "none",
      borderRadius: 8,
      padding: "6px 8px",
      cursor: "pointer",
      color: gravando ? "white" : "var(--purple)",
      fontSize: 18,
      lineHeight: 1,
      boxShadow: gravando ? "0 0 0 3px #7B00C430" : "none",
      transition: "all .2s"
    }
  }, "\uD83C\uDF99\uFE0F")), gravando && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--purple)",
      marginTop: 4,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#7B00C4",
      display: "inline-block",
      animation: "pulse-slow 1s infinite"
    }
  }), "Gravando... fale normalmente. Clique \uD83C\uDF99\uFE0F para parar."), msg && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--purple)",
      marginTop: 6,
      fontWeight: 500
    }
  }, msg), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%",
      marginTop: 10
    },
    onClick: salvar,
    disabled: salvando
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "save",
    size: 16
  }), " ", salvando ? "Salvando..." : "Salvar entrada")), loading && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 13,
      padding: 16
    }
  }, "Carregando..."), !loading && entradas.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 10,
      color: "var(--gray-700)"
    }
  }, "Entradas anteriores (", entradas.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, entradas.map(en => /*#__PURE__*/React.createElement("div", {
    key: en.id,
    onClick: () => setVerEntrada(en),
    style: {
      background: "white",
      borderRadius: 12,
      padding: "12px 14px",
      border: "1px solid #e5e7eb",
      cursor: "pointer"
    },
    onMouseEnter: e => e.currentTarget.style.boxShadow = "0 2px 8px #7B00C420",
    onMouseLeave: e => e.currentTarget.style.boxShadow = "none"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, en.data, " \xB7 ", en.hora), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--purple)"
    }
  }, TAGS.find(t => t.v === en.tag)?.e)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--gray-700)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, en.texto))))), !loading && entradas.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "24px 0",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhuma entrada ainda. Comece escrevendo hoje! \uD83D\uDC9C"));
}

// ── Modal Visualizar Ferramenta ─────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_HABITOS — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// ── 1. Ritual de Descompressão Noturna ───────────────────────────
function FerramentaSleepRitual({
  user
}) {
  const COR = "#0891b2";
  const BG = "#e0f2fe";
  const PASSOS_RITUAL = [{
    id: "ecras",
    titulo: "Ecrãs desligados",
    desc: "Telefone, TV e computador off",
    tipo: "check"
  }, {
    id: "temp",
    titulo: "Temperatura do quarto",
    desc: "18-20°C ou banho morno",
    tipo: "check"
  }, {
    id: "pendentes",
    titulo: "Lista de pendentes",
    desc: "Escreva o que precisa fazer amanhã",
    tipo: "texto"
  }, {
    id: "transicao",
    titulo: "Atividade de transição",
    desc: "Leitura, música suave ou alongamento",
    tipo: "timer",
    dur: 600
  }, {
    id: "alarme",
    titulo: "Evite conteúdo ativante",
    desc: "Sem notícias, conflitos ou decisões",
    tipo: "check"
  }, {
    id: "gratidao",
    titulo: "3 gratidões do dia",
    desc: "Escreva 3 coisas pequenas que correram bem",
    tipo: "texto"
  }, {
    id: "hora",
    titulo: "Hora consistente",
    desc: "Mesma hora todos os dias — incluindo fim de semana",
    tipo: "check"
  }];
  const [checks, setChecks] = useState({});
  const [textos, setTextos] = useState({});
  const [timerRod, setTimerRod] = useState(false);
  const [timerVal, setTimerVal] = useState(600);
  const [concluido, setConcluido] = useState(false);
  const timerRef = React.useRef(null);
  React.useEffect(() => {
    if (!timerRod) return;
    timerRef.current = setInterval(() => {
      setTimerVal(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setTimerRod(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRod]);
  const feitos = PASSOS_RITUAL.filter(p => {
    if (p.tipo === "check") return checks[p.id];
    if (p.tipo === "texto") return (textos[p.id] || "").trim().length > 2;
    if (p.tipo === "timer") return timerVal < 600;
    return false;
  }).length;
  if (concluido) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83C\uDF19"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Ritual conclu\xEDdo!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 24,
      lineHeight: 1.6
    }
  }, feitos, " de ", PASSOS_RITUAL.length, " passos completados.", /*#__PURE__*/React.createElement("br", null), "O seu sistema nervoso agradece. \uD83D\uDC9C"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setChecks({});
      setTextos({});
      setTimerVal(600);
      setTimerRod(false);
      setConcluido(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo ritual"));
  const min = Math.floor(timerVal / 60),
    seg = timerVal % 60;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: "var(--gray-100)",
      borderRadius: 20,
      height: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: feitos / PASSOS_RITUAL.length * 100 + "%",
      height: "100%",
      borderRadius: 20,
      background: COR,
      transition: "width .3s"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      flexShrink: 0
    }
  }, feitos, "/", PASSOS_RITUAL.length)), PASSOS_RITUAL.map(p => {
    const feito = p.tipo === "check" ? checks[p.id] : p.tipo === "texto" ? (textos[p.id] || "").trim().length > 2 : timerVal < 600;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        background: "white",
        border: "1.5px solid",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 8,
        borderColor: feito ? COR : "var(--gray-200)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 10
      }
    }, p.tipo === "check" && /*#__PURE__*/React.createElement("div", {
      onClick: () => setChecks(c => ({
        ...c,
        [p.id]: !c[p.id]
      })),
      style: {
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: "2px solid",
        flexShrink: 0,
        marginTop: 1,
        cursor: "pointer",
        borderColor: feito ? COR : "var(--gray-300)",
        background: feito ? COR : "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, feito && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "white",
        fontSize: 12
      }
    }, "\u2713")), p.tipo !== "check" && /*#__PURE__*/React.createElement("div", {
      style: {
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: feito ? COR : BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12
      }
    }, p.tipo === "timer" ? "⏱" : "✏️")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        color: feito ? COR : "var(--text)",
        marginBottom: 2
      }
    }, p.titulo), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, p.desc), p.tipo === "texto" && /*#__PURE__*/React.createElement("textarea", {
      value: textos[p.id] || "",
      onChange: e => setTextos(t => ({
        ...t,
        [p.id]: e.target.value
      })),
      placeholder: p.id === "pendentes" ? "Ex: Responder email, ligar para médico..." : "Ex: Aprendi algo novo, conversei bem com alguém...",
      style: {
        width: "100%",
        minHeight: 60,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid " + COR + "40",
        fontSize: 12,
        fontFamily: "inherit",
        resize: "none",
        marginTop: 8,
        boxSizing: "border-box",
        outline: "none"
      }
    }), p.tipo === "timer" && /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8,
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 16,
        color: COR,
        minWidth: 50
      }
    }, min, ":", seg.toString().padStart(2, "0")), !timerRod && timerVal === 600 && /*#__PURE__*/React.createElement("button", {
      onClick: () => setTimerRod(true),
      style: {
        padding: "5px 12px",
        borderRadius: 8,
        border: "none",
        background: COR,
        color: "white",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "inherit"
      }
    }, "Iniciar"), timerRod && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setTimerRod(false);
        clearInterval(timerRef.current);
      },
      style: {
        padding: "5px 12px",
        borderRadius: 8,
        border: "1px solid var(--gray-200)",
        background: "white",
        color: "var(--text-muted)",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "inherit"
      }
    }, "Pausar"), !timerRod && timerVal < 600 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: COR,
        fontWeight: 600
      }
    }, "\u2713 feito")))));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setConcluido(true),
    style: {
      width: "100%",
      padding: "12px",
      borderRadius: 10,
      border: "none",
      marginTop: 8,
      background: feitos >= 4 ? COR : "var(--gray-100)",
      color: feitos >= 4 ? "white" : "var(--text-muted)",
      cursor: feitos >= 4 ? "pointer" : "not-allowed",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, feitos >= 4 ? "Concluir ritual 🌙" : "Complete pelo menos 4 passos"));
}

// ── 2. Regra dos 5 Minutos ────────────────────────────────────────
function FerramentaFiveMinute({
  user
}) {
  const COR = "#7c3aed";
  const BG = "#ede9fe";
  const [p, setP] = useState(0);
  const [tarefa, setTarefa] = useState("");
  const [desconfortAntes, setDesconfortAntes] = useState(7);
  const [timerRod, setTimerRod] = useState(false);
  const [timerVal, setTimerVal] = useState(300);
  const [desconfortDurante, setDesconfortDurante] = useState(5);
  const [decisao, setDecisao] = useState(null);
  const [salvo, setSalvo] = useState(false);
  const timerRef = React.useRef(null);
  React.useEffect(() => {
    if (!timerRod) return;
    timerRef.current = setInterval(() => {
      setTimerVal(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setTimerRod(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerRod]);
  const min = Math.floor(timerVal / 60),
    seg = timerVal % 60;
  const concluido = timerVal === 0;
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\u26A1"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, decisao === "continuar" ? "Continuou! Momentum ativado!" : "5 minutos concluídos!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px",
      marginBottom: 20,
      fontSize: 13,
      color: "#4c1d95"
    }
  }, "Desconforto antecipado: ", /*#__PURE__*/React.createElement("strong", null, desconfortAntes, "/10"), " \u2192 Desconforto real: ", /*#__PURE__*/React.createElement("strong", null, desconfortDurante, "/10"), desconfortDurante < desconfortAntes && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      color: "#059669",
      fontWeight: 600
    }
  }, "\u2713 O real foi menor que o imaginado!")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setTarefa("");
      setDesconfortAntes(7);
      setTimerVal(300);
      setTimerRod(false);
      setDesconfortDurante(5);
      setDecisao(null);
      setSalvo(false);
      setP(0);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Nova tarefa"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 4,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "Qual tarefa est\xE1 evitando?",
    subtitulo: "Seja espec\xEDfico \u2014 uma tarefa s\xF3",
    dica: "Quanto mais espec\xEDfico, mais f\xE1cil de come\xE7ar. N\xE3o 'trabalho' \u2014 mas 'responder o email do cliente X'.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: tarefa,
    onChange: e => setTarefa(e.target.value),
    placeholder: "Ex: Responder o email do cliente sobre o relat\xF3rio...",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onNext: () => setP(1),
    podeProsseguir: tarefa.trim().length > 5
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Qu\xE3o dif\xEDcil parece agora?",
    subtitulo: "Desconforto antecipado",
    dica: "Avalie ANTES de come\xE7ar. Vamos comparar com o real depois.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(SliderStep, {
    label: "Desconforto antecipado",
    valor: desconfortAntes,
    onChange: setDesconfortAntes,
    cor: COR,
    antes: "Tranquilo",
    depois: "Muito dif\xEDcil"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px",
      marginTop: 16,
      fontSize: 13,
      color: "#4c1d95",
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Micro-compromisso:"), " Vou trabalhar nisto durante apenas ", /*#__PURE__*/React.createElement("strong", null, "5 minutos"), ". Ao fim de 5 minutos, posso parar sem culpa."), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: true
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "Timer de 5 minutos",
    subtitulo: "Apenas o primeiro passo f\xEDsico",
    dica: "Abra o documento, pegue o caderno, escreva a primeira frase. S\xF3 isso.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 100,
      height: 100,
      borderRadius: "50%",
      border: "3px solid " + COR,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 12px",
      background: concluido ? BG : "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 700,
      color: COR
    }
  }, min, ":", seg.toString().padStart(2, "0")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)"
    }
  }, concluido ? "feito!" : "min")), !timerRod && !concluido && /*#__PURE__*/React.createElement("button", {
    onClick: () => setTimerRod(true),
    style: {
      padding: "11px 28px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Iniciar 5 min"), timerRod && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--gray-100)",
      borderRadius: 20,
      height: 5,
      marginBottom: 12,
      maxWidth: 200,
      margin: "0 auto 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: (300 - timerVal) / 300 * 100 + "%",
      height: "100%",
      borderRadius: 20,
      background: COR,
      transition: "width 1s"
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setTimerRod(false);
      clearInterval(timerRef.current);
    },
    style: {
      padding: "8px 20px",
      borderRadius: 8,
      border: "1px solid var(--gray-200)",
      background: "white",
      color: "var(--text-muted)",
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, "Pausar"))), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: concluido || timerVal < 290
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Como foi na pr\xE1tica?",
    subtitulo: "Compare o real com o antecipado",
    dica: "Esta compara\xE7\xE3o \xE9 o aprendizado mais valioso da ferramenta.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(SliderStep, {
    label: "Desconforto real durante",
    valor: desconfortDurante,
    onChange: setDesconfortDurante,
    cor: COR,
    antes: "Tranquilo",
    depois: "Muito dif\xEDcil"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "var(--text)",
      marginBottom: 10
    }
  }, "Quer parar ou continuar?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, [{
    v: "continuar",
    l: "Continuar trabalhando",
    e: "💪"
  }, {
    v: "parar",
    l: "Parar — compromisso cumprido",
    e: "✅"
  }].map(op => /*#__PURE__*/React.createElement("button", {
    key: op.v,
    onClick: () => setDecisao(op.v),
    style: {
      flex: 1,
      padding: "12px 8px",
      borderRadius: 10,
      border: "1.5px solid",
      cursor: "pointer",
      fontFamily: "inherit",
      borderColor: decisao === op.v ? COR : "var(--gray-200)",
      background: decisao === op.v ? BG : "white",
      color: decisao === op.v ? COR : "var(--text-muted)",
      fontWeight: decisao === op.v ? 700 : 400,
      fontSize: 13,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      marginBottom: 4
    }
  }, op.e), op.l))), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(2),
    onSave: () => setSalvo(true),
    podeProsseguir: decisao !== null
  })));
}

// ── 3. Empilhamento de Hábitos ────────────────────────────────────
function FerramentaHabitStacking({
  user
}) {
  const COR = "#059669";
  const BG = "#dcfce7";
  const ANCORA_OPCOES = [{
    v: "cafe",
    l: "Café da manhã",
    e: "☕"
  }, {
    v: "escova",
    l: "Escovar os dentes",
    e: "🪥"
  }, {
    v: "acordar",
    l: "Ao acordar",
    e: "🌅"
  }, {
    v: "trabalho",
    l: "Chegada ao trabalho",
    e: "💼"
  }, {
    v: "almoco",
    l: "Após o almoço",
    e: "🍽️"
  }, {
    v: "carro",
    l: "Entrar no carro",
    e: "🚗"
  }, {
    v: "jantar",
    l: "Após o jantar",
    e: "🌙"
  }, {
    v: "dormir",
    l: "Antes de dormir",
    e: "😴"
  }];
  const [p, setP] = useState(0);
  const [ancora, setAncora] = useState("");
  const [novoHabito, setNovoHabito] = useState("");
  const [formula, setFormula] = useState("");
  const [dias, setDias] = useState({});
  const [resistencia, setResistencia] = useState(3);
  const [salvo, setSalvo] = useState(false);
  const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
  const feitos = Object.values(dias).filter(Boolean).length;
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83C\uDF31"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "H\xE1bito registrado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px",
      marginBottom: 20,
      fontSize: 13,
      color: "#064e3b",
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("strong", null, "F\xF3rmula:"), " \"", formula || `Depois de ${ancora}, vou ${novoHabito}`, "\"", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", null, "Consist\xEAncia:"), " ", feitos, "/7 dias", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", null, "Resist\xEAncia:"), " ", resistencia, "/10"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setAncora("");
      setNovoHabito("");
      setFormula("");
      setDias({});
      setResistencia(3);
      setSalvo(false);
      setP(0);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo h\xE1bito"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 4,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "Escolha o h\xE1bito \xE2ncora",
    subtitulo: "Algo que j\xE1 faz todos os dias sem falhar",
    dica: "Este ser\xE1 o gatilho autom\xE1tico do novo h\xE1bito. Quanto mais fixo na rotina, melhor.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8
    }
  }, ANCORA_OPCOES.map(op => /*#__PURE__*/React.createElement("button", {
    key: op.v,
    onClick: () => setAncora(op.l),
    style: {
      padding: "12px 8px",
      borderRadius: 10,
      border: "1.5px solid",
      cursor: "pointer",
      fontFamily: "inherit",
      borderColor: ancora === op.l ? COR : "var(--gray-200)",
      background: ancora === op.l ? BG : "white",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      color: ancora === op.l ? COR : "var(--text-muted)",
      fontWeight: ancora === op.l ? 700 : 400
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, op.e), op.l))), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onNext: () => setP(1),
    podeProsseguir: ancora.length > 0
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Defina o novo h\xE1bito",
    subtitulo: "Pequeno e espec\xEDfico",
    dica: "N\xE3o 'meditar' \u2014 mas 'respirar profundamente por 2 minutos'. Quanto menor, maior a chance.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: novoHabito,
    onChange: e => setNovoHabito(e.target.value),
    placeholder: "Ex: Escrever uma coisa pela qual sou grato, respirar 2 minutos, fazer 10 flex\xF5es...",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), ancora && novoHabito && /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px",
      marginTop: 12,
      fontSize: 13,
      color: "#064e3b",
      lineHeight: 1.5,
      fontStyle: "italic"
    }
  }, "\"Depois de ", /*#__PURE__*/React.createElement("strong", null, ancora), ", vou ", /*#__PURE__*/React.createElement("strong", null, novoHabito), ".\""), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: novoHabito.trim().length > 3
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "Registro da semana",
    subtitulo: "Marque os dias que executou",
    dica: "Os primeiros 7 dias exigem inten\xE7\xE3o consciente. Marque honestamente.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      justifyContent: "center",
      marginBottom: 16
    }
  }, diasSemana.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    onClick: () => setDias(ds => ({
      ...ds,
      [d]: !ds[d]
    })),
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      border: "1.5px solid",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderColor: dias[d] ? COR : "var(--gray-200)",
      background: dias[d] ? COR : "white",
      color: dias[d] ? "white" : "var(--text-muted)",
      fontWeight: 600,
      fontSize: 12
    }
  }, dias[d] ? "✓" : d[0]))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, feitos, " de 7 dias executados"), /*#__PURE__*/React.createElement(SliderStep, {
    label: "Resist\xEAncia sentida",
    valor: resistencia,
    onChange: setResistencia,
    cor: COR,
    antes: "F\xE1cil",
    depois: "Muito dif\xEDcil"
  }), resistencia >= 7 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fef3c7",
      borderRadius: 10,
      padding: "10px 12px",
      marginTop: 10,
      fontSize: 12,
      color: "#854F0B"
    }
  }, "Resist\xEAncia alta \u2014 considere reduzir o h\xE1bito pela metade."), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: feitos > 0
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Reflex\xE3o da semana",
    subtitulo: "O que funcionou e o que ajustar?",
    dica: "Ap\xF3s 21 dias de consist\xEAncia, o h\xE1bito come\xE7a a ser autom\xE1tico.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#064e3b",
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 4
    }
  }, "\xC2ncora: ", /*#__PURE__*/React.createElement("strong", null, ancora)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 4
    }
  }, "H\xE1bito: ", /*#__PURE__*/React.createElement("strong", null, novoHabito)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 4
    }
  }, "Consist\xEAncia: ", /*#__PURE__*/React.createElement("strong", null, feitos, "/7 dias")), /*#__PURE__*/React.createElement("div", null, "Resist\xEAncia: ", /*#__PURE__*/React.createElement("strong", null, resistencia, "/10"), " ", resistencia <= 3 ? "— ótimo!" : resistencia <= 6 ? "— ajustável" : ""))), /*#__PURE__*/React.createElement("textarea", {
    value: formula,
    onChange: e => setFormula(e.target.value),
    placeholder: "Alguma observa\xE7\xE3o sobre como correu? O que pode ajustar na pr\xF3xima semana?",
    style: {
      width: "100%",
      minHeight: 70,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(2),
    onSave: () => setSalvo(true),
    podeProsseguir: true
  })));
}

// ── 4. Mapa da Bateria ────────────────────────────────────────────
function FerramentaEnergyMap({
  user
}) {
  const COR = "#059669";
  const BG = "#dcfce7";
  const DRENOS_OPCOES = [{
    v: "reunioes",
    l: "Reuniões longas",
    e: "🗓️"
  }, {
    v: "conflitos",
    l: "Conflitos não resolvidos",
    e: "⚡"
  }, {
    v: "redes",
    l: "Redes sociais",
    e: "📱"
  }, {
    v: "sem_sentido",
    l: "Tarefas sem sentido",
    e: "😑"
  }, {
    v: "deslocamento",
    l: "Deslocamento",
    e: "🚗"
  }, {
    v: "barulho",
    l: "Barulho/distração",
    e: "🔊"
  }, {
    v: "decisoes",
    l: "Muitas decisões",
    e: "🤯"
  }, {
    v: "perfeccionismo",
    l: "Perfeccionismo",
    e: "🎯"
  }];
  const RECARGAS_OPCOES = [{
    v: "natureza",
    l: "Tempo na natureza",
    e: "🌿"
  }, {
    v: "amigos",
    l: "Conversa com amigo",
    e: "👥"
  }, {
    v: "exercicio",
    l: "Exercício",
    e: "🏃"
  }, {
    v: "silencio",
    l: "Momento de silêncio",
    e: "🧘"
  }, {
    v: "criatividade",
    l: "Atividade criativa",
    e: "🎨"
  }, {
    v: "leitura",
    l: "Leitura",
    e: "📚"
  }, {
    v: "musica",
    l: "Música",
    e: "🎵"
  }, {
    v: "sono",
    l: "Sono de qualidade",
    e: "😴"
  }];
  const ALERTAS = ["Cansaço que não passa com sono", "Irritabilidade por pequenas coisas", "Dificuldade de concentração", "Prazer reduzido nas atividades"];
  const [p, setP] = useState(0);
  const [bateria, setBateria] = useState(60);
  const [drenos, setDrenos] = useState([]);
  const [recargas, setRecargas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [recargaAmanha, setRecargaAmanha] = useState("");
  const [salvo, setSalvo] = useState(false);
  const batCor = bateria >= 60 ? "#059669" : bateria >= 30 ? "#d97706" : "#dc2626";
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDD0B"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: batCor,
      marginBottom: 8
    }
  }, "Mapa registrado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px",
      marginBottom: 12,
      fontSize: 13,
      color: "#064e3b",
      lineHeight: 1.7
    }
  }, "Bateria: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: batCor
    }
  }, bateria, "%"), /*#__PURE__*/React.createElement("br", null), "Drenos: ", /*#__PURE__*/React.createElement("strong", null, drenos.length), " \xB7 Recargas: ", /*#__PURE__*/React.createElement("strong", null, recargas.length), /*#__PURE__*/React.createElement("br", null), alertas.length > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#dc2626"
    }
  }, "\u26A0\uFE0F ", alertas.length, " sinal(is) de alerta")), recargaAmanha && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#dcfce7",
      borderRadius: 10,
      padding: "10px",
      fontSize: 13,
      color: "#064e3b",
      marginBottom: 20
    }
  }, "Recarga amanh\xE3: ", /*#__PURE__*/React.createElement("strong", null, recargaAmanha)), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setBateria(60);
      setDrenos([]);
      setRecargas([]);
      setAlertas([]);
      setRecargaAmanha("");
      setSalvo(false);
      setP(0);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo mapa"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 4,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "N\xEDvel da bateria",
    subtitulo: "Qual \xE9 sua energia agora?",
    dica: "N\xE3o pense \u2014 responda instintivamente. De 0 (esgotado) a 100 (plena energia).",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 44,
      fontWeight: 700,
      color: batCor,
      lineHeight: 1
    }
  }, bateria, "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, bateria >= 70 ? "Energia boa" : bateria >= 40 ? "Atenção necessária" : "Zona de esgotamento")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: 100,
    step: 1,
    value: bateria,
    onChange: e => setBateria(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: batCor,
      marginBottom: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--gray-100)",
      borderRadius: 20,
      height: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: bateria + "%",
      height: "100%",
      borderRadius: 20,
      background: batCor,
      transition: "width .2s"
    }
  })), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onNext: () => setP(1),
    podeProsseguir: true
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "O que est\xE1 drenando?",
    subtitulo: "Selecione o que consumiu energia esta semana",
    dica: "Seja honesto \u2014 o mapa s\xF3 \xE9 \xFAtil se for real.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: DRENOS_OPCOES,
    selecionadas: drenos,
    onChange: setDrenos,
    cor: "#dc2626",
    bg: "#fee2e2"
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: drenos.length > 0
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "O que recarrega?",
    subtitulo: "O que deu energia esta semana?",
    dica: "Inclua tamb\xE9m coisas que sabe que recarregam mas que n\xE3o fez \u2014 isso \xE9 informa\xE7\xE3o importante.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: RECARGAS_OPCOES,
    selecionadas: recargas,
    onChange: setRecargas,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text)",
      marginBottom: 8
    }
  }, "Sinais de alerta presentes?"), ALERTAS.map(a => /*#__PURE__*/React.createElement("div", {
    key: a,
    onClick: () => setAlertas(al => al.includes(a) ? al.filter(x => x !== a) : [...al, a]),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1.5px solid",
      marginBottom: 6,
      cursor: "pointer",
      borderColor: alertas.includes(a) ? "#dc2626" : "var(--gray-200)",
      background: alertas.includes(a) ? "#fee2e2" : "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: "50%",
      border: "1.5px solid",
      flexShrink: 0,
      borderColor: alertas.includes(a) ? "#dc2626" : "var(--gray-300)",
      background: alertas.includes(a) ? "#dc2626" : "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, alertas.includes(a) && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "white",
      fontSize: 10
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: alertas.includes(a) ? "#7f1d1d" : "var(--text-muted)"
    }
  }, a)))), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: recargas.length > 0
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Plano de recarga",
    subtitulo: "Uma a\xE7\xE3o para amanh\xE3",
    dica: "Escolha uma recarga concreta e agende com hora definida.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bateria < 40 ? "#fee2e2" : BG,
      borderRadius: 10,
      padding: "12px",
      marginBottom: 16,
      fontSize: 13,
      color: bateria < 40 ? "#7f1d1d" : "#064e3b",
      lineHeight: 1.5
    }
  }, bateria < 40 ? "⚠️ Bateria crítica — priorize uma recarga hoje mesmo." : bateria < 60 ? "Atenção — planeje recargas antes de chegar ao vermelho." : "Bateria ok — mantenha o equilíbrio com recargas regulares."), /*#__PURE__*/React.createElement("textarea", {
    value: recargaAmanha,
    onChange: e => setRecargaAmanha(e.target.value),
    placeholder: "Ex: Caminhada de 20min \xE0s 18h, ligar para amiga \xE0s 19h...",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(2),
    onSave: () => setSalvo(true),
    podeProsseguir: recargaAmanha.trim().length > 3
  })));
}

// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_CORPO — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// ── 1. Escada Polivagal ──────────────────────────────────────────
function FerramentaPolyvagal({
  user
}) {
  const [estado, setEstado] = useState(null);
  const [ancora, setAncora] = useState([]);
  const [segAntes, setSegAntes] = useState(5);
  const [segDepois, setSegDepois] = useState(5);
  const [fase, setFase] = useState("avaliacao"); // avaliacao | tecnica | resultado
  const [checks, setChecks] = useState({});
  const ESTADOS = {
    verde: {
      label: "Verde — Segurança",
      emoji: "🟢",
      cor: "#059669",
      bg: "#dcfce7",
      desc: "Calmo, presente, conectado, consegue pensar com clareza",
      tecnicas: [{
        id: "pes",
        l: "Pés no chão — sinta o contacto"
      }, {
        id: "olhar",
        l: "Nomeie 5 coisas que vê ao redor"
      }, {
        id: "mao",
        l: "Mão no peito — 'Estou seguro agora'"
      }, {
        id: "respirar",
        l: "3 respirações lentas com expiração longa"
      }]
    },
    vermelho: {
      label: "Vermelho — Luta/Fuga",
      emoji: "🔴",
      cor: "#dc2626",
      bg: "#fee2e2",
      desc: "Agitado, ansioso, irritado, coração acelerado, pensamentos a mil",
      tecnicas: [{
        id: "agua",
        l: "Água fria no rosto ou pulsos (15-30s)"
      }, {
        id: "expiracao",
        l: "Inspirar 4s → Expirar 8s (5 vezes)"
      }, {
        id: "movimento",
        l: "Balançar o corpo lentamente"
      }, {
        id: "humm",
        l: "Humme uma nota grave (ativa nervo vago)"
      }]
    },
    azul: {
      label: "Azul — Colapso",
      emoji: "🔵",
      cor: "#1d4ed8",
      bg: "#dbeafe",
      desc: "Desmotivado, entorpecido, sem energia, sensação de desligar",
      tecnicas: [{
        id: "saltar",
        l: "30s de movimento: salte no lugar"
      }, {
        id: "luz",
        l: "Vá para espaço com luz natural"
      }, {
        id: "contacto",
        l: "Chame alguém ou envie mensagem"
      }, {
        id: "frio",
        l: "Água fria nas mãos e rosto"
      }]
    }
  };
  const ANCORAS = [{
    v: "respiracao",
    l: "Respiração lenta",
    e: "💨"
  }, {
    v: "pes",
    l: "Pés no chão",
    e: "🦶"
  }, {
    v: "musica",
    l: "Música calmante",
    e: "🎵"
  }, {
    v: "natureza",
    l: "Estar na natureza",
    e: "🌿"
  }, {
    v: "movimento",
    l: "Movimento suave",
    e: "🚶"
  }, {
    v: "contacto",
    l: "Contacto social seguro",
    e: "🤝"
  }, {
    v: "frio",
    l: "Água fria",
    e: "💧"
  }, {
    v: "silencio",
    l: "Silêncio e descanso",
    e: "🌙"
  }];
  const est = estado ? ESTADOS[estado] : null;
  const feitosChecks = Object.values(checks).filter(Boolean).length;
  if (fase === "resultado") return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, est?.emoji), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: est?.cor,
      marginBottom: 8
    }
  }, "Regula\xE7\xE3o registrada!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: est?.bg,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20,
      fontSize: 13,
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", null, "Estado inicial: ", /*#__PURE__*/React.createElement("strong", null, est?.label)), /*#__PURE__*/React.createElement("div", null, "Seguran\xE7a antes: ", /*#__PURE__*/React.createElement("strong", null, segAntes, "/10"), " \u2192 depois: ", /*#__PURE__*/React.createElement("strong", null, segDepois, "/10")), /*#__PURE__*/React.createElement("div", null, "T\xE9cnicas aplicadas: ", /*#__PURE__*/React.createElement("strong", null, feitosChecks)), ancora.length > 0 && /*#__PURE__*/React.createElement("div", null, "\xC2ncoras: ", /*#__PURE__*/React.createElement("strong", null, ancora.join(", ")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setEstado(null);
      setAncora([]);
      setSegAntes(5);
      setSegDepois(5);
      setFase("avaliacao");
      setChecks({});
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: "#7B00C4",
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Nova pr\xE1tica"));
  if (fase === "tecnica" && est) return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: est.bg,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 16,
      borderLeft: "4px solid " + est.cor
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: est.cor,
      marginBottom: 4
    }
  }, est.emoji, " ", est.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text)",
      lineHeight: 1.5
    }
  }, "Aplique as t\xE9cnicas abaixo para subir a escada de regula\xE7\xE3o.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(SliderStep, {
    label: "Sensa\xE7\xE3o de seguran\xE7a agora",
    valor: segAntes,
    onChange: setSegAntes,
    cor: est.cor,
    antes: "Muito inseguro",
    depois: "Muito seguro"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, est.tecnicas.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    onClick: () => setChecks(c => ({
      ...c,
      [t.id]: !c[t.id]
    })),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "11px 12px",
      borderRadius: 10,
      border: "1.5px solid",
      marginBottom: 8,
      cursor: "pointer",
      borderColor: checks[t.id] ? est.cor : "var(--gray-200)",
      background: checks[t.id] ? est.bg : "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      border: "2px solid",
      flexShrink: 0,
      borderColor: checks[t.id] ? est.cor : "var(--gray-300)",
      background: checks[t.id] ? est.cor : "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, checks[t.id] && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "white",
      fontSize: 11
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: checks[t.id] ? est.cor : "var(--text-muted)"
    }
  }, t.l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "As suas \xE2ncoras pessoais"), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: ANCORAS,
    selecionadas: ancora,
    onChange: setAncora,
    cor: est.cor,
    bg: est.bg
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(SliderStep, {
    label: "Sensa\xE7\xE3o de seguran\xE7a ap\xF3s as t\xE9cnicas",
    valor: segDepois,
    onChange: setSegDepois,
    cor: est.cor,
    antes: "Muito inseguro",
    depois: "Muito seguro"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setFase("resultado"),
    style: {
      width: "100%",
      padding: "12px",
      borderRadius: 10,
      border: "none",
      background: est.cor,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Registrar pr\xE1tica \u2713"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 8
    }
  }, "Escada Polivagal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20,
      lineHeight: 1.5
    }
  }, "Identifique o seu estado atual e aplique t\xE9cnicas espec\xEDficas para regula\xE7\xE3o."), Object.entries(ESTADOS).map(([k, e]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    onClick: () => {
      setEstado(k);
      setFase("tecnica");
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px",
      borderRadius: 14,
      border: "2px solid",
      marginBottom: 10,
      cursor: "pointer",
      borderColor: estado === k ? e.cor : e.cor + "40",
      background: estado === k ? e.bg : "white",
      transition: "all .15s"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 32,
      flexShrink: 0
    }
  }, e.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: e.cor,
      marginBottom: 3
    }
  }, e.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      lineHeight: 1.4
    }
  }, e.desc)))));
}

// ── 2. Aterramento 5 Sentidos ────────────────────────────────────
function FerramentaGrounding({
  user
}) {
  const COR = "#0891b2";
  const BG = "#e0f2fe";
  const [p, setP] = useState(-1); // -1=intro
  const [respostas, setRespostas] = useState({
    v: "",
    t: "",
    o: "",
    c: "",
    s: ""
  });
  const [presAntes, setPresAntes] = useState(3);
  const [presDepois, setPresDepois] = useState(3);
  const [concluido, setConcluido] = useState(false);
  const SENTIDOS = [{
    k: "v",
    n: 5,
    titulo: "O que VÊ",
    instrucao: "Olhe ao redor. Nomeie 5 coisas que consegue ver agora. Seja específico — não 'uma cadeira' mas 'uma cadeira de madeira com assento desgastado'.",
    placeholder: "Ex: Uma planta verde no canto, a luz da janela, um copo azul..."
  }, {
    k: "t",
    n: 4,
    titulo: "O que TOCA",
    instrucao: "Foque na sensação física. Nomeie 4 coisas que consegue sentir no corpo agora.",
    placeholder: "Ex: O tecido da roupa no braço, a temperatura do ar, o peso dos pés no chão..."
  }, {
    k: "o",
    n: 3,
    titulo: "O que OUVE",
    instrucao: "Feche os olhos se quiser. Nomeie 3 sons — um próximo, um distante, um que não tinha reparado.",
    placeholder: "Ex: O ventilador, uma voz ao longe, o meu próprio respirar..."
  }, {
    k: "c",
    n: 2,
    titulo: "O que CHEIRA",
    instrucao: "Identifique 2 cheiros presentes agora. Se não sentir nenhum, leve algo ao nariz.",
    placeholder: "Ex: O café da manhã, o sabão das mãos..."
  }, {
    k: "s",
    n: 1,
    titulo: "O que SABOREIA",
    instrucao: "Foque na boca. Qual é o sabor presente agora?",
    placeholder: "Ex: Residual de café, nada em particular..."
  }];
  if (concluido) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\u2693"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 12
    }
  }, "Aterramento conclu\xEDdo!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20,
      fontSize: 13,
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", null, "Presen\xE7a antes: ", /*#__PURE__*/React.createElement("strong", null, presAntes, "/10")), /*#__PURE__*/React.createElement("div", null, "Presen\xE7a depois: ", /*#__PURE__*/React.createElement("strong", null, presDepois, "/10")), presDepois > presAntes && /*#__PURE__*/React.createElement("div", {
    style: {
      color: COR,
      fontWeight: 600,
      marginTop: 4
    }
  }, "\u2713 +", presDepois - presAntes, " pontos de presen\xE7a \uD83D\uDC9C")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setP(-1);
      setRespostas({
        v: "",
        t: "",
        o: "",
        c: "",
        s: ""
      });
      setPresAntes(3);
      setPresDepois(3);
      setConcluido(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Nova pr\xE1tica"));
  if (p === -1) return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 8
    }
  }, "Aterramento 5 Sentidos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20,
      lineHeight: 1.5
    }
  }, "Exerc\xEDcio de presen\xE7a sensorial para interromper rumina\xE7\xE3o, dissocia\xE7\xE3o ou ansiedade."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(SliderStep, {
    label: "Presen\xE7a no momento atual",
    valor: presAntes,
    onChange: setPresAntes,
    cor: COR,
    antes: "Muito distante",
    depois: "Totalmente presente"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 20,
      fontSize: 13,
      color: "#0c4a6e",
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Como funciona:"), " Vamos ativar os 5 sentidos um a um \u2014 do maior para o menor n\xFAmero de itens. Isso ancora a mente no presente."), /*#__PURE__*/React.createElement("button", {
    onClick: () => setP(0),
    style: {
      width: "100%",
      padding: "13px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "\u25B6 Iniciar aterramento"));
  const sentido = SENTIDOS[p];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: SENTIDOS.length,
    cor: COR
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: `linear-gradient(135deg,${COR},${COR}dd)`,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 16,
      color: "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      marginBottom: 4
    }
  }, ["👁️", "🤲", "👂", "👃", "👅"][p]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 17,
      marginBottom: 4
    }
  }, sentido.n, " \u2014 ", sentido.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: 0.9,
      lineHeight: 1.5
    }
  }, sentido.instrucao)), /*#__PURE__*/React.createElement("textarea", {
    value: respostas[sentido.k],
    onChange: e => setRespostas(r => ({
      ...r,
      [sentido.k]: e.target.value
    })),
    placeholder: sentido.placeholder,
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 16
    }
  }, p > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setP(p - 1),
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      background: "white",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, "\u2190"), p < SENTIDOS.length - 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setP(p + 1),
    style: {
      flex: 2,
      padding: "10px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Pr\xF3ximo sentido \u2192"), p === SENTIDOS.length - 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => {},
    style: {
      flex: 2,
      padding: "10px",
      borderRadius: 10,
      border: "none",
      background: "#e5e7eb",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text)"
    }
  }, "Como est\xE1 a presen\xE7a agora?"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 1,
    max: 10,
    value: presDepois,
    onChange: e => {
      e.stopPropagation();
      setPresDepois(Number(e.target.value));
    },
    style: {
      width: "100%",
      accentColor: COR
    },
    onClick: e => e.stopPropagation()
  })), p === SENTIDOS.length - 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setConcluido(true),
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "\u2713")), p === SENTIDOS.length - 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(SliderStep, {
    label: "Presen\xE7a agora",
    valor: presDepois,
    onChange: setPresDepois,
    cor: COR,
    antes: "Distante",
    depois: "Presente"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setConcluido(true),
    style: {
      width: "100%",
      padding: "11px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit",
      marginTop: 10
    }
  }, "Concluir \u2713")));
}

// ── 3. Diário Corpo-Mente ────────────────────────────────────────
function FerramentaBodyMind({
  user
}) {
  const COR = "#7B00C4";
  const BG = "#f3e6ff";
  const ANTECEDENTES = [{
    v: "sono_mau",
    l: "Sono fraco",
    e: "😴"
  }, {
    v: "conflito",
    l: "Conflito",
    e: "⚡"
  }, {
    v: "decisao",
    l: "Decisão difícil",
    e: "🤔"
  }, {
    v: "trabalho",
    l: "Stress trabalho",
    e: "💼"
  }, {
    v: "comida",
    l: "Comida irregular",
    e: "🍽️"
  }, {
    v: "exercicio",
    l: "Sem exercício",
    e: "🏃"
  }];
  const PADROES = [{
    v: "ansiedade",
    l: "Ansiedade",
    e: "😰"
  }, {
    v: "raiva",
    l: "Raiva suprimida",
    e: "😤"
  }, {
    v: "tristeza",
    l: "Tristeza",
    e: "😢"
  }, {
    v: "sobrecarga",
    l: "Sobrecarga",
    e: "🫠"
  }, {
    v: "solidao",
    l: "Solidão",
    e: "🥺"
  }, {
    v: "estresse",
    l: "Stress crónico",
    e: "😫"
  }];
  const ALIVOS = [{
    v: "repouso",
    l: "Repouso",
    e: "😴"
  }, {
    v: "movimento",
    l: "Movimento",
    e: "🏃"
  }, {
    v: "calor",
    l: "Calor/banho",
    e: "🛁"
  }, {
    v: "conversa",
    l: "Conversa",
    e: "💬"
  }, {
    v: "choro",
    l: "Choro",
    e: "😢"
  }, {
    v: "medicacao",
    l: "Medicação",
    e: "💊"
  }];
  const [p, setP] = useState(0);
  const [sintoma, setSintoma] = useState("");
  const [intensidade, setIntensidade] = useState(5);
  const [contexto, setContexto] = useState("");
  const [antecedentes, setAntecedentes] = useState([]);
  const [padroes, setPadroes] = useState([]);
  const [aliviou, setAliviou] = useState([]);
  const [salvo, setSalvo] = useState(false);
  const intCor = intensidade >= 7 ? "#dc2626" : intensidade >= 4 ? "#d97706" : "#059669";
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83E\uDEC0"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Registo salvo!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20,
      fontSize: 13,
      color: "#3d006a",
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", null, "Sintoma: ", /*#__PURE__*/React.createElement("strong", null, sintoma.slice(0, 50))), /*#__PURE__*/React.createElement("div", null, "Intensidade: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: intCor
    }
  }, intensidade, "/10")), padroes.length > 0 && /*#__PURE__*/React.createElement("div", null, "Padr\xE3o emocional: ", /*#__PURE__*/React.createElement("strong", null, padroes.join(", ")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSintoma("");
      setIntensidade(5);
      setContexto("");
      setAntecedentes([]);
      setPadroes([]);
      setAliviou([]);
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo registo"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 4,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "O sintoma",
    subtitulo: "O que est\xE1 sentindo no corpo?",
    dica: "Localiza\xE7\xE3o, qualidade e dura\xE7\xE3o. Ex: 'Aperto no peito desde esta manh\xE3, intensidade 7'.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: sintoma,
    onChange: e => setSintoma(e.target.value),
    placeholder: "Ex: Tens\xE3o nos ombros e pesco\xE7o desde ontem, piora ao fim do dia...",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none",
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement(SliderStep, {
    label: "Intensidade do sintoma",
    valor: intensidade,
    onChange: setIntensidade,
    cor: intCor,
    antes: "Leve",
    depois: "Muito intenso"
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onNext: () => setP(1),
    podeProsseguir: sintoma.trim().length > 5
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Contexto e antecedentes",
    subtitulo: "O que estava acontecendo?",
    dica: "O que aconteceu nas 2-4 horas antes do sintoma surgir ou intensificar?",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: contexto,
    onChange: e => setContexto(e.target.value),
    placeholder: "Ex: Tive uma reuni\xE3o dif\xEDcil, depois recebi uma mensagem que me deixou tensa...",
    style: {
      width: "100%",
      minHeight: 70,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      marginBottom: 12,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Antecedentes presentes"), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: ANTECEDENTES,
    selecionadas: antecedentes,
    onChange: setAntecedentes,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: true
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "Padr\xE3o emocional",
    subtitulo: "Que emo\xE7\xE3o pode estar associada?",
    dica: "'Este sintoma aparece mais quando eu sinto...' \u2014 seja honesto consigo mesmo.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: PADROES,
    selecionadas: padroes,
    onChange: setPadroes,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: padroes.length > 0
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "O que aliviou?",
    subtitulo: "O que reduziu o sintoma?",
    dica: "Pode incluir coisas que ainda n\xE3o tentou mas que costumam funcionar.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: ALIVOS,
    selecionadas: aliviou,
    onChange: setAliviou,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(2),
    onSave: () => setSalvo(true),
    podeProsseguir: true
  })));
}

// ── 4. Roda da Vida ──────────────────────────────────────────────
function FerramentaWheelOfLife({
  user
}) {
  const COR = "#059669";
  const BG = "#dcfce7";
  const DIMENSOES = [{
    id: "saude_fisica",
    label: "Saúde Física",
    emoji: "🏃",
    desc: "Energia, sono, alimentação, exercício"
  }, {
    id: "saude_mental",
    label: "Saúde Mental",
    emoji: "🧠",
    desc: "Equilíbrio emocional, bem-estar"
  }, {
    id: "relacoes",
    label: "Relações Íntimas",
    emoji: "💑",
    desc: "Qualidade das relações próximas"
  }, {
    id: "familia",
    label: "Família e Amigos",
    emoji: "👨‍👩‍👧",
    desc: "Ligação com família e amizades"
  }, {
    id: "trabalho",
    label: "Trabalho",
    emoji: "💼",
    desc: "Satisfação, sentido, crescimento"
  }, {
    id: "financas",
    label: "Finanças",
    emoji: "💰",
    desc: "Estabilidade e segurança financeira"
  }, {
    id: "lazer",
    label: "Lazer",
    emoji: "🎉",
    desc: "Tempo para alegria e descanso real"
  }, {
    id: "espiritualidade",
    label: "Espiritualidade",
    emoji: "🌟",
    desc: "Propósito, valores, sentido de vida"
  }];
  const [valores, setValores] = useState(Object.fromEntries(DIMENSOES.map(d => [d.id, 5])));
  const [foco, setFoco] = useState("");
  const [acoes, setAcoes] = useState("");
  const [p, setP] = useState(0);
  const [salvo, setSalvo] = useState(false);
  const media = Math.round(Object.values(valores).reduce((a, b) => a + b, 0) / DIMENSOES.length * 10) / 10;
  const maisAlto = DIMENSOES.reduce((a, d) => valores[d.id] > valores[a.id] ? d : a, DIMENSOES[0]);
  const maisBaixo = DIMENSOES.reduce((a, d) => valores[d.id] < valores[a.id] ? d : a, DIMENSOES[0]);
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 8
    }
  }, "\u2B55"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR
    }
  }, "Roda registrada!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "M\xE9dia: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: COR
    }
  }, media, "/10"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 16
    }
  }, DIMENSOES.map(d => {
    const v = valores[d.id];
    const cor = v >= 7 ? COR : v >= 4 ? "#d97706" : "#dc2626";
    return /*#__PURE__*/React.createElement("div", {
      key: d.id,
      style: {
        background: "white",
        borderRadius: 10,
        padding: "10px 12px",
        border: "1px solid var(--gray-200)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, d.emoji, " ", d.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: cor
      }
    }, v)), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--gray-100)",
        borderRadius: 20,
        height: 4,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: v / 10 * 100 + "%",
        height: "100%",
        borderRadius: 20,
        background: cor,
        transition: "width .3s"
      }
    })));
  })), foco && /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px",
      marginBottom: 12,
      fontSize: 13,
      color: "#064e3b"
    }
  }, "\uD83C\uDFAF Foco: ", /*#__PURE__*/React.createElement("strong", null, foco)), acoes && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#ede9fe",
      borderRadius: 10,
      padding: "12px",
      marginBottom: 16,
      fontSize: 13,
      color: "#4c1d95"
    }
  }, "\uD83D\uDCCB A\xE7\xF5es: ", acoes), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setValores(Object.fromEntries(DIMENSOES.map(d => [d.id, 5])));
      setFoco("");
      setAcoes("");
      setP(0);
      setSalvo(false);
    },
    style: {
      width: "100%",
      padding: "11px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Nova avalia\xE7\xE3o"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 2,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "Avalie as 8 dimens\xF5es",
    subtitulo: "Como est\xE1 cada \xE1rea da sua vida agora?",
    dica: "Responda com honestidade \u2014 n\xE3o como gostaria, mas como realmente est\xE1.",
    cor: COR,
    bg: BG
  }), DIMENSOES.map(d => {
    const v = valores[d.id];
    const cor = v >= 7 ? COR : v >= 4 ? "#d97706" : "#dc2626";
    return /*#__PURE__*/React.createElement("div", {
      key: d.id,
      style: {
        background: "white",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 8,
        border: "1px solid var(--gray-200)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20
      }
    }, d.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13
      }
    }, d.label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)"
      }
    }, d.desc)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 16,
        color: cor,
        minWidth: 24,
        textAlign: "right"
      }
    }, v)), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: 0,
      max: 10,
      value: v,
      onChange: e => setValores(vals => ({
        ...vals,
        [d.id]: Number(e.target.value)
      })),
      style: {
        width: "100%",
        accentColor: cor
      }
    }));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px",
      marginTop: 8,
      fontSize: 13,
      color: "#064e3b"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", null, "M\xE9dia geral: ", /*#__PURE__*/React.createElement("strong", null, media, "/10")), /*#__PURE__*/React.createElement("span", null, "Mais alto: ", maisAlto.emoji, " ", /*#__PURE__*/React.createElement("strong", null, valores[maisAlto.id])), /*#__PURE__*/React.createElement("span", null, "Mais baixo: ", maisBaixo.emoji, " ", /*#__PURE__*/React.createElement("strong", null, valores[maisBaixo.id])))), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 2,
    onNext: () => setP(1),
    podeProsseguir: true
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Foco e a\xE7\xF5es",
    subtitulo: "O que vai priorizar?",
    dica: "N\xE3o tente melhorar tudo. Escolha a dimens\xE3o que mais impacto teria nas outras se melhorada.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fee2e2",
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 14,
      fontSize: 13,
      color: "#7f1d1d"
    }
  }, "\u26A0\uFE0F Menor pontua\xE7\xE3o: ", maisBaixo.emoji, " ", /*#__PURE__*/React.createElement("strong", null, maisBaixo.label), " (", valores[maisBaixo.id], "/10)"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block"
    }
  }, "Dimens\xE3o de foco escolhida"), /*#__PURE__*/React.createElement("input", {
    value: foco,
    onChange: e => setFoco(e.target.value),
    placeholder: `Ex: ${maisBaixo.label} — ${maisBaixo.desc}`,
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block"
    }
  }, "3 micro-a\xE7\xF5es para esta semana"), /*#__PURE__*/React.createElement("textarea", {
    value: acoes,
    onChange: e => setAcoes(e.target.value),
    placeholder: `Ex:\n1. Dormir às 23h esta semana\n2. Caminhar 20min na terça\n3. Desligar telemóvel 1h antes de dormir`,
    style: {
      width: "100%",
      minHeight: 100,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.7,
      boxSizing: "border-box",
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 2,
    onBack: () => setP(0),
    onSave: () => setSalvo(true),
    podeProsseguir: foco.trim().length > 3
  })));
}

// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_CASAIS — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// ── 1. Mapa de Diferenciação ─────────────────────────────────────
function FerramentaDifferentiation({
  user
}) {
  const COR = "#7c3aed";
  const BG = "#ede9fe";
  const AREAS_FUSAO = [{
    v: "amigos",
    l: "Amigos",
    e: "👥"
  }, {
    v: "familia",
    l: "Família",
    e: "👨‍👩‍👧"
  }, {
    v: "trabalho",
    l: "Trabalho",
    e: "💼"
  }, {
    v: "decisoes",
    l: "Decisões",
    e: "🤔"
  }, {
    v: "hobbies",
    l: "Hobbies",
    e: "🎨"
  }, {
    v: "opiniao",
    l: "Opiniões",
    e: "💭"
  }, {
    v: "tempo",
    l: "Tempo livre",
    e: "⏰"
  }, {
    v: "financas",
    l: "Finanças",
    e: "💰"
  }];
  const [p, setP] = useState(0);
  const [opinioes, setOpinioes] = useState("");
  const [fusao, setFusao] = useState([]);
  const [dependencia, setDependencia] = useState(5);
  const [honesto, setHonesto] = useState("");
  const [espacos, setEspacos] = useState("");
  const [salvo, setSalvo] = useState(false);
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83C\uDF31"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Mapa registrado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20,
      fontSize: 13,
      color: "#4c1d95",
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", null, "Depend\xEAncia emocional: ", /*#__PURE__*/React.createElement("strong", null, dependencia, "/10")), /*#__PURE__*/React.createElement("div", null, "\xC1reas de fus\xE3o: ", /*#__PURE__*/React.createElement("strong", null, fusao.length)), espacos && /*#__PURE__*/React.createElement("div", null, "Espa\xE7os pr\xF3prios: ", /*#__PURE__*/React.createElement("strong", null, espacos.slice(0, 50)))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setOpinioes("");
      setFusao([]);
      setDependencia(5);
      setHonesto("");
      setEspacos("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo mapa"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 4,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "Opini\xF5es aut\xF3nomas",
    subtitulo: "O que pensa independentemente do parceiro?",
    dica: "Escreva 3-5 opini\xF5es ou prefer\xEAncias genuinamente suas \u2014 n\xE3o moldadas pela rela\xE7\xE3o.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: opinioes,
    onChange: e => setOpinioes(e.target.value),
    placeholder: `Ex:\n• Prefiro filmes de ficção científica\n• Acho que devíamos mudar de cidade\n• Discordo da forma como os filhos são educados...`,
    style: {
      width: "100%",
      minHeight: 110,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.7,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onNext: () => setP(1),
    podeProsseguir: opinioes.trim().length > 10
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "\xC1reas de fus\xE3o",
    subtitulo: "Onde tende a ceder automaticamente?",
    dica: "Fus\xE3o \xE9 quando deixa de processar a sua pr\xF3pria posi\xE7\xE3o antes de responder ao outro.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: AREAS_FUSAO,
    selecionadas: fusao,
    onChange: setFusao,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(SliderStep, {
    label: "Meu estado emocional depende do dele/dela",
    valor: dependencia,
    onChange: setDependencia,
    cor: COR,
    antes: "Pouco",
    depois: "Muito"
  })), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: true
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "A voz honesta",
    subtitulo: "O que diria se pudesse ser totalmente honesto?",
    dica: "Pense numa situa\xE7\xE3o recente em que cedeu quando n\xE3o queria. O que teria dito?",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: honesto,
    onChange: e => setHonesto(e.target.value),
    placeholder: "Ex: Quando ele decidiu as f\xE9rias sem me perguntar, queria dizer que precisava de ser consultada...",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: honesto.trim().length > 5
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Espa\xE7os genuinamente seus",
    subtitulo: "3 atividades, amizades ou interesses independentes",
    dica: "O que mant\xE9m independentemente da rela\xE7\xE3o? S\xE3o espa\xE7os de identidade pr\xF3pria.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: espacos,
    onChange: e => setEspacos(e.target.value),
    placeholder: `Ex:\n1. Grupo de corrida às quintas\n2. Amizade com a Clara\n3. Leitura de ficção antes de dormir`,
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.7,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(2),
    onSave: () => setSalvo(true),
    podeProsseguir: espacos.trim().length > 5
  })));
}

// ── 2. Mapa de Triangulação ──────────────────────────────────────
function FerramentaTriangulation({
  user
}) {
  const COR = "#0891b2";
  const BG = "#e0f2fe";
  const PAPEIS = [{
    v: "recruta",
    l: "Recruto terceiros",
    e: "📢"
  }, {
    v: "recrutado",
    l: "Sou recrutado",
    e: "🎯"
  }, {
    v: "triangulado",
    l: "Sou triangulado",
    e: "🔺"
  }, {
    v: "mensageiro",
    l: "Sou mensageiro",
    e: "📩"
  }];
  const [p, setP] = useState(0);
  const [vertices, setVertices] = useState({
    a: "",
    b: "",
    c: ""
  });
  const [papel, setPapel] = useState([]);
  const [evita, setEvita] = useState("");
  const [direto, setDireto] = useState("");
  const [salvo, setSalvo] = useState(false);
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDD3A"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Triangula\xE7\xE3o mapeada!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20,
      fontSize: 13,
      color: "#0c4a6e",
      lineHeight: 1.7
    }
  }, vertices.a && /*#__PURE__*/React.createElement("div", null, "V\xE9rtice A: ", /*#__PURE__*/React.createElement("strong", null, vertices.a)), vertices.b && /*#__PURE__*/React.createElement("div", null, "V\xE9rtice B: ", /*#__PURE__*/React.createElement("strong", null, vertices.b)), vertices.c && /*#__PURE__*/React.createElement("div", null, "Intermedi\xE1rio: ", /*#__PURE__*/React.createElement("strong", null, vertices.c)), direto && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontStyle: "italic"
    }
  }, "Comunica\xE7\xE3o direta: \"", direto.slice(0, 60), "...\"")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setVertices({
        a: "",
        b: "",
        c: ""
      });
      setPapel([]);
      setEvita("");
      setDireto("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo mapeamento"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 3,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "Os 3 v\xE9rtices",
    subtitulo: "Quem s\xE3o as pessoas no tri\xE2ngulo?",
    dica: "Identifique as tr\xEAs pessoas: quem tem tens\xE3o com quem, e quem est\xE1 no meio.",
    cor: COR,
    bg: BG
  }), [{
    k: "a",
    l: "Pessoa A (você ou outra)"
  }, {
    k: "b",
    l: "Pessoa B (em tensão com A)"
  }, {
    k: "c",
    l: "Pessoa C (intermediário)"
  }].map(f => /*#__PURE__*/React.createElement("div", {
    key: f.k,
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 5,
      display: "block",
      color: "var(--text)"
    }
  }, f.l), /*#__PURE__*/React.createElement("input", {
    value: vertices[f.k],
    onChange: e => setVertices(v => ({
      ...v,
      [f.k]: e.target.value
    })),
    placeholder: f.k === "c" ? "Ex: filho, sogra, amigo..." : "Ex: eu, parceiro, chefe...",
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box"
    }
  }))), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 3,
    onNext: () => setP(1),
    podeProsseguir: vertices.a.length > 1 && vertices.b.length > 1
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Seu papel",
    subtitulo: "Como voc\xEA participa deste tri\xE2ngulo?",
    dica: "Identifique o seu papel mais frequente \u2014 sem julgamento.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: PAPEIS,
    selecionadas: papel,
    onChange: setPapel,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block"
    }
  }, "O que est\xE1 a evitar comunicar diretamente?"), /*#__PURE__*/React.createElement("textarea", {
    value: evita,
    onChange: e => setEvita(e.target.value),
    placeholder: "Ex: Evito dizer diretamente ao meu pai que preciso de mais espa\xE7o...",
    style: {
      width: "100%",
      minHeight: 70,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      boxSizing: "border-box",
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 3,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: papel.length > 0
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "A comunica\xE7\xE3o direta",
    subtitulo: "O que diria diretamente \xE0 pessoa?",
    dica: "Sem intermedi\xE1rios. Escreva como se fosse dizer agora \u2014 com calma e assertividade.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: direto,
    onChange: e => setDireto(e.target.value),
    placeholder: "Ex: 'Pai, preciso de te dizer diretamente que preciso de mais espa\xE7o nas nossas conversas...' ",
    style: {
      width: "100%",
      minHeight: 100,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 3,
    onBack: () => setP(1),
    onSave: () => setSalvo(true),
    podeProsseguir: direto.trim().length > 5
  })));
}

// ── 3. Diário de Parentalidade Compassiva ────────────────────────
function FerramentaCompassionateParenting({
  user
}) {
  const COR = "#d97706";
  const BG = "#fef3c7";
  const GATILHOS = [{
    v: "cansaco",
    l: "Cansaço",
    e: "😴"
  }, {
    v: "pressao",
    l: "Pressão/pressa",
    e: "⏱️"
  }, {
    v: "barulho",
    l: "Barulho/caos",
    e: "🔊"
  }, {
    v: "desobediencia",
    l: "Desobediência",
    e: "🙅"
  }, {
    v: "trabalho",
    l: "Stress do trabalho",
    e: "💼"
  }, {
    v: "fome",
    l: "Fome/falta de sono",
    e: "😫"
  }];
  const [p, setP] = useState(0);
  const [momento, setMomento] = useState("");
  const [gatilho, setGatilho] = useState([]);
  const [juiz, setJuiz] = useState("");
  const [amigo, setAmigo] = useState("");
  const [gentil, setGentil] = useState("");
  const [bom, setBom] = useState("");
  const [salvo, setSalvo] = useState(false);
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDC9B"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Registo salvo!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20,
      fontSize: 13,
      color: "#78350f",
      lineHeight: 1.7
    }
  }, bom && /*#__PURE__*/React.createElement("div", null, "\u2728 Hoje foi bem: ", /*#__PURE__*/React.createElement("em", null, "\"", bom, "\"")), gentil && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, "\uD83D\uDC9C Para mim mesmo: ", /*#__PURE__*/React.createElement("em", null, "\"", gentil.slice(0, 80), "...\""))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setMomento("");
      setGatilho([]);
      setJuiz("");
      setAmigo("");
      setGentil("");
      setBom("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Nova entrada"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 5,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "O momento dif\xEDcil",
    subtitulo: "O que aconteceu?",
    dica: "Descreva a situa\xE7\xE3o brevemente. Sem julgamento \u2014 apenas os factos.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: momento,
    onChange: e => setMomento(e.target.value),
    placeholder: "Ex: Perdi a paci\xEAncia quando o meu filho recusou fazer a li\xE7\xE3o pela terceira vez...",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 8,
      color: "var(--text)"
    }
  }, "O que estava a contribuir?"), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: GATILHOS,
    selecionadas: gatilho,
    onChange: setGatilho,
    cor: COR,
    bg: BG
  })), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onNext: () => setP(1),
    podeProsseguir: momento.trim().length > 5
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "O juiz interno",
    subtitulo: "O que a voz cr\xEDtica est\xE1 a dizer?",
    dica: "Escreva exatamente os pensamentos autocr\xEDticos. Sem filtrar.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: juiz,
    onChange: e => setJuiz(e.target.value),
    placeholder: "Ex: Sou uma p\xE9ssima m\xE3e. Estou a marcar os meus filhos para sempre. Nunca consigo controlar-me...",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: juiz.trim().length > 5
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "O que diria ao seu melhor amigo?",
    subtitulo: "Se ele/ela vivesse exatamente isso...",
    dica: "Com que tom faria? Escreva como se fosse enviar uma mensagem agora.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: amigo,
    onChange: e => setAmigo(e.target.value),
    placeholder: "Ex: 'Olha, voc\xEA est\xE1 cansada e sob press\xE3o. N\xE3o \xE9s uma m\xE1 m\xE3e \u2014 \xE9s uma m\xE3e humana que est\xE1 a tentar...'",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: amigo.trim().length > 5
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Reescreva com gentileza",
    subtitulo: "Agora aplique a si mesmo",
    dica: "Mesmo tom que usou com o amigo \u2014 rigoroso mas gentil. Reconhe\xE7a o erro sem atacar a identidade.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: gentil,
    onChange: e => setGentil(e.target.value),
    placeholder: "Ex: 'Cometi um erro. Estou cansada. Isso n\xE3o me define como m\xE3e. Posso pedir desculpa e tentar diferente amanh\xE3...'",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onBack: () => setP(2),
    onNext: () => setP(4),
    podeProsseguir: gentil.trim().length > 5
  })), p === 4 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "5",
    titulo: "O que correu bem hoje?",
    subtitulo: "Pelo menos uma coisa",
    dica: "Por menor que pare\xE7a \u2014 um momento de paci\xEAncia, de presen\xE7a, de amor. Ele conta.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: bom,
    onChange: e => setBom(e.target.value),
    placeholder: "Ex: Abracei o meu filho antes de dormir e disse-lhe que o amava. Isso foi real.",
    style: {
      width: "100%",
      minHeight: 70,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onBack: () => setP(3),
    onSave: () => setSalvo(true),
    podeProsseguir: bom.trim().length > 3
  })));
}

// ── 4. Protocolo Financeiro dos 3 Mapas ─────────────────────────
function FerramentaFinancialMaps({
  user
}) {
  const COR = "#059669";
  const BG = "#dcfce7";
  const VALORES = [{
    v: "seguranca",
    l: "Segurança",
    e: "🛡️"
  }, {
    v: "liberdade",
    l: "Liberdade",
    e: "🕊️"
  }, {
    v: "experiencias",
    l: "Experiências",
    e: "🌍"
  }, {
    v: "estatuto",
    l: "Estatuto",
    e: "🏆"
  }, {
    v: "legado",
    l: "Legado",
    e: "🌳"
  }, {
    v: "conforto",
    l: "Conforto",
    e: "🛋️"
  }, {
    v: "controlo",
    l: "Controlo",
    e: "🎯"
  }, {
    v: "generosidade",
    l: "Generosidade",
    e: "🤝"
  }];
  const [p, setP] = useState(0);
  const [historia, setHistoria] = useState("");
  const [valores, setValores] = useState([]);
  const [segLiberdade, setSegLiberdade] = useState(50);
  const [objetivo1, setObjetivo1] = useState("");
  const [objetivo5, setObjetivo5] = useState("");
  const [autonomia, setAutonomia] = useState("");
  const [salvo, setSalvo] = useState(false);
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDCB0"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Protocolo registrado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20,
      fontSize: 13,
      color: "#064e3b",
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", null, "Valores priorit\xE1rios: ", /*#__PURE__*/React.createElement("strong", null, valores.slice(0, 3).join(", "))), objetivo1 && /*#__PURE__*/React.createElement("div", null, "Objetivo 1 ano: ", /*#__PURE__*/React.createElement("strong", null, objetivo1.slice(0, 50))), objetivo5 && /*#__PURE__*/React.createElement("div", null, "Objetivo 5 anos: ", /*#__PURE__*/React.createElement("strong", null, objetivo5.slice(0, 50)))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setHistoria("");
      setValores([]);
      setSegLiberdade(50);
      setObjetivo1("");
      setObjetivo5("");
      setAutonomia("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo protocolo"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 3,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "M1",
    titulo: "Mapa da Hist\xF3ria",
    subtitulo: "Como era o dinheiro na sua fam\xEDlia?",
    dica: "O gui\xE3o financeiro que aprendeu na inf\xE2ncia opera de forma inconsciente. Torn\xE1-lo vis\xEDvel \xE9 o primeiro passo.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: historia,
    onChange: e => setHistoria(e.target.value),
    placeholder: `Ex:\n• O dinheiro era tabu — nunca se falava\n• Havia sempre escassez e preocupação\n• Quem controlava era o meu pai\n• Aprendi que poupar era obrigação`,
    style: {
      width: "100%",
      minHeight: 110,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.7,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 3,
    onNext: () => setP(1),
    podeProsseguir: historia.trim().length > 10
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "M2",
    titulo: "Mapa dos Valores",
    subtitulo: "O que o dinheiro representa para voc\xEA?",
    dica: "Escolha os 3 valores mais importantes. A diverg\xEAncia de valores \xE9 a raiz da maioria dos conflitos financeiros em casal.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: VALORES,
    selecionadas: valores,
    onChange: v => setValores(v.slice(0, 3)),
    cor: COR,
    bg: BG
  }), valores.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "12px 0",
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Selecionados: ", valores.length, "/3"), /*#__PURE__*/React.createElement(SliderStep, {
    label: "Seguran\xE7a vs. Liberdade",
    valor: segLiberdade,
    onChange: setSegLiberdade,
    min: 0,
    max: 100,
    cor: COR,
    antes: "Priorizo seguran\xE7a",
    depois: "Priorizo liberdade"
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 3,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: valores.length > 0
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "M3",
    titulo: "Mapa do Projeto Partilhado",
    subtitulo: "Para onde vamos juntos?",
    dica: "Transformar o dinheiro de campo de batalha em projeto partilhado come\xE7a por ter objetivos comuns.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block"
    }
  }, "Objetivo financeiro a 1 ano"), /*#__PURE__*/React.createElement("textarea", {
    value: objetivo1,
    onChange: e => setObjetivo1(e.target.value),
    placeholder: "Ex: Criar uma reserva de emerg\xEAncia de 3 meses, quitar a d\xEDvida do cart\xE3o...",
    style: {
      width: "100%",
      minHeight: 60,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      boxSizing: "border-box",
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block"
    }
  }, "Objetivo a 5 anos"), /*#__PURE__*/React.createElement("textarea", {
    value: objetivo5,
    onChange: e => setObjetivo5(e.target.value),
    placeholder: "Ex: Casa pr\xF3pria, viagem grande, investimento para os filhos...",
    style: {
      width: "100%",
      minHeight: 60,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      boxSizing: "border-box",
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block"
    }
  }, "Valor de autonomia individual (cada um)"), /*#__PURE__*/React.createElement("input", {
    value: autonomia,
    onChange: e => setAutonomia(e.target.value),
    placeholder: "Ex: R$ 300 por m\xEAs cada um sem precisar justificar...",
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box"
    }
  })), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 3,
    onBack: () => setP(1),
    onSave: () => setSalvo(true),
    podeProsseguir: objetivo1.trim().length > 5
  })));
}

// ── 5. Mapa de Intimidade ────────────────────────────────────────
function FerramentaIntimacyMap({
  user
}) {
  const COR = "#db2777";
  const BG = "#fce7f3";
  const NIVEIS = [{
    id: "emocional",
    label: "Intimidade Emocional",
    desc: "Partilho vulnerabilidades sem ser julgado/a",
    icone: "💜"
  }, {
    id: "intelectual",
    label: "Intimidade Intelectual",
    desc: "Temos conversas estimulantes e partilhamos curiosidades",
    icone: "🧠"
  }, {
    id: "fisico",
    label: "Toque Afetivo",
    desc: "Há carinho físico não-sexual no quotidiano",
    icone: "🤝"
  }, {
    id: "sexual",
    label: "Intimidade Sexual",
    desc: "Há desejo, prazer e comunicação sobre necessidades",
    icone: "🔥"
  }];
  const [valores, setValores] = useState({
    emocional: 5,
    intelectual: 5,
    fisico: 5,
    sexual: 5
  });
  const [foco, setFoco] = useState("");
  const [ritual, setRitual] = useState("");
  const [p, setP] = useState(0);
  const [salvo, setSalvo] = useState(false);
  const nivelMaisBaixo = Object.entries(valores).sort((a, b) => a[1] - b[1])[0];
  const media = Math.round(Object.values(valores).reduce((a, b) => a + b, 0) / 4 * 10) / 10;
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDC91"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Mapa registrado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 16
    }
  }, NIVEIS.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 0",
      borderBottom: "1px solid " + COR + "20"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, n.icone, " ", n.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: valores[n.id] >= 7 ? COR : valores[n.id] >= 4 ? "#d97706" : "#dc2626"
    }
  }, valores[n.id], "/10"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: 700,
      color: COR
    }
  }, "M\xE9dia: ", media, "/10")), ritual && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#dcfce7",
      borderRadius: 10,
      padding: "10px",
      fontSize: 13,
      color: "#064e3b",
      marginBottom: 20
    }
  }, "\uD83C\uDF31 Ritual desta semana: ", /*#__PURE__*/React.createElement("em", null, "\"", ritual, "\"")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setValores({
        emocional: 5,
        intelectual: 5,
        fisico: 5,
        sexual: 5
      });
      setFoco("");
      setRitual("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo mapa"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 2,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "Os 4 n\xEDveis de intimidade",
    subtitulo: "Avalie a qualidade atual de cada n\xEDvel",
    dica: "Responda com honestidade \u2014 n\xE3o como gostaria que fosse, mas como realmente est\xE1.",
    cor: COR,
    bg: BG
  }), NIVEIS.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    style: {
      marginBottom: 16,
      background: "white",
      borderRadius: 12,
      padding: "12px 14px",
      border: "1px solid " + COR + "20"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, n.icone), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, n.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, n.desc)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontWeight: 700,
      fontSize: 16,
      color: valores[n.id] >= 7 ? COR : valores[n.id] >= 4 ? "#d97706" : "#dc2626"
    }
  }, valores[n.id])), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: 10,
    value: valores[n.id],
    onChange: e => setValores(v => ({
      ...v,
      [n.id]: Number(e.target.value)
    })),
    style: {
      width: "100%",
      accentColor: COR
    }
  }))), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 2,
    onNext: () => setP(1),
    podeProsseguir: true
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Foco e ritual",
    subtitulo: "O que precisa de aten\xE7\xE3o?",
    dica: "Escolha apenas uma \xE1rea de foco. Um ritual pequeno e consistente vale mais do que grandes gestos espor\xE1dicos.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 16,
      fontSize: 13,
      color: "#831843"
    }
  }, /*#__PURE__*/React.createElement("strong", null, "N\xEDvel mais baixo:"), " ", NIVEIS.find(n => n.id === nivelMaisBaixo[0])?.icone, " ", NIVEIS.find(n => n.id === nivelMaisBaixo[0])?.label, " (", nivelMaisBaixo[1], "/10)"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block"
    }
  }, "\xC1rea de foco escolhida"), /*#__PURE__*/React.createElement("input", {
    value: foco,
    onChange: e => setFoco(e.target.value),
    placeholder: "Ex: Intimidade emocional \u2014 ter conversas mais profundas...",
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block"
    }
  }, "Ritual de reconex\xE3o esta semana"), /*#__PURE__*/React.createElement("textarea", {
    value: ritual,
    onChange: e => setRitual(e.target.value),
    placeholder: "Ex: 20 minutos sem telem\xF3vel a conversar \xE0s sextas ap\xF3s o jantar...",
    style: {
      width: "100%",
      minHeight: 70,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      boxSizing: "border-box",
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 2,
    onBack: () => setP(0),
    onSave: () => setSalvo(true),
    podeProsseguir: foco.trim().length > 3
  })));
}

// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_RELACIONAMENTOS — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// ── 1. Registo CNV ───────────────────────────────────────────────
function FerramentaCNV({
  user
}) {
  const COR = "#0891b2";
  const BG = "#e0f2fe";
  const [p, setP] = useState(0);
  const [d, setD] = useState({
    observacao: "",
    sentimento: "",
    necessidade: "",
    pedido: ""
  });
  const [salvo, setSalvo] = useState(false);
  const PASSOS = [{
    letra: "O",
    titulo: "Observação",
    subtitulo: "O que aconteceu — só os factos",
    dica: "Descreva o facto concreto sem julgamento. Em vez de 'és irresponsável', diga 'reparei que X não foi feito'.",
    campo: "observacao",
    placeholder: "Ex: Reparei que chegaste 30 minutos depois do combinado sem avisar..."
  }, {
    letra: "S",
    titulo: "Sentimento",
    subtitulo: "O que você sentiu",
    dica: "Nomeie a emoção sem atribuir culpa. 'Sinto-me ansioso' em vez de 'fizeste-me sentir mal'.",
    campo: "sentimento",
    placeholder: "Ex: Sinto-me ansioso e sozinho quando isso acontece..."
  }, {
    letra: "N",
    titulo: "Necessidade",
    subtitulo: "O que está por baixo do sentimento",
    dica: "Identifique a necessidade não satisfeita. Não é sobre o outro — é sobre o que você precisa.",
    campo: "necessidade",
    placeholder: "Ex: Preciso de me sentir considerado e de confiar nos nossos combinados..."
  }, {
    letra: "P",
    titulo: "Pedido",
    subtitulo: "O que você quer que aconteça",
    dica: "Formule um pedido claro, positivo e realizável. Permite que o outro diga não.",
    campo: "pedido",
    placeholder: "Ex: Podes avisar-me com antecedência quando vais atrasar?"
  }];
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDCAC"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 12
    }
  }, "Registo CNV salvo!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 20,
      textAlign: "left"
    }
  }, PASSOS.map(ps => /*#__PURE__*/React.createElement("div", {
    key: ps.letra,
    style: {
      marginBottom: 10,
      paddingBottom: 10,
      borderBottom: "1px solid " + COR + "20"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: COR,
      marginBottom: 3
    }
  }, ps.letra, " \u2014 ", ps.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text)"
    }
  }, d[ps.campo] || "—")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setD({
        observacao: "",
        sentimento: "",
        necessidade: "",
        pedido: ""
      });
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo registo"));
  const pInfo = PASSOS[p];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: PASSOS.length,
    cor: COR
  }), /*#__PURE__*/React.createElement(StepHeader, {
    letra: pInfo.letra,
    titulo: pInfo.titulo,
    subtitulo: pInfo.subtitulo,
    dica: pInfo.dica,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: d[pInfo.campo],
    onChange: e => setD({
      ...d,
      [pInfo.campo]: e.target.value
    }),
    placeholder: pInfo.placeholder,
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), p === 3 && d.observacao && d.sentimento && d.necessidade && /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px 14px",
      marginTop: 12,
      fontSize: 13,
      color: "#0c4a6e",
      lineHeight: 1.7,
      fontStyle: "italic"
    }
  }, "\"Quando ", /*#__PURE__*/React.createElement("strong", null, d.observacao.slice(0, 40), "..."), ", sinto ", /*#__PURE__*/React.createElement("strong", null, d.sentimento.slice(0, 30)), ", porque preciso de ", /*#__PURE__*/React.createElement("strong", null, d.necessidade.slice(0, 30)), ". ", d.pedido ? d.pedido.slice(0, 50) + "..." : "", "\""), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: PASSOS.length,
    onBack: () => setP(p - 1),
    onNext: () => setP(p + 1),
    onSave: () => setSalvo(true),
    podeProsseguir: d[pInfo.campo].trim().length > 5
  }));
}

// ── 2. Mapa de Limites ───────────────────────────────────────────
function FerramentaLimitsMap({
  user
}) {
  const COR = "#7c3aed";
  const BG = "#ede9fe";
  const RESPOSTAS = [{
    v: "silencio",
    l: "Cedo em silêncio",
    e: "😶"
  }, {
    v: "explode",
    l: "Explodo depois",
    e: "💥"
  }, {
    v: "evito",
    l: "Evito a situação",
    e: "🚪"
  }, {
    v: "ironizo",
    l: "Uso ironia",
    e: "😏"
  }, {
    v: "assertivo",
    l: "Comunico diretamente",
    e: "💬"
  }];
  const [p, setP] = useState(0);
  const [situacao, setSituacao] = useState("");
  const [quem, setQuem] = useState("");
  const [resposta, setResposta] = useState([]);
  const [formulacao, setFormulacao] = useState("");
  const [resistencia, setResistencia] = useState("");
  const [salvo, setSalvo] = useState(false);
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDEAA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 12
    }
  }, "Limite mapeado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20,
      textAlign: "left",
      fontSize: 13,
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Situa\xE7\xE3o:"), " ", situacao), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Com quem:"), " ", quem), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Formula\xE7\xE3o:"), " ", formulacao)), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSituacao("");
      setQuem("");
      setResposta([]);
      setFormulacao("");
      setResistencia("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo limite"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 4,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "A situa\xE7\xE3o de desconforto",
    subtitulo: "Onde sente que um limite est\xE1 sendo violado?",
    dica: "Pense numa situa\xE7\xE3o recente em que ficou ressentido, esgotado ou com sensa\xE7\xE3o de injusti\xE7a.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: situacao,
    onChange: e => setSituacao(e.target.value),
    placeholder: "Ex: Minha chefe pede tarefas fora do hor\xE1rio de trabalho regularmente...",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none",
      marginBottom: 12
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text)",
      marginBottom: 6,
      display: "block"
    }
  }, "Com quem acontece?"), /*#__PURE__*/React.createElement("input", {
    value: quem,
    onChange: e => setQuem(e.target.value),
    placeholder: "Ex: Chefe, parceiro, familiar...",
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onNext: () => setP(1),
    podeProsseguir: situacao.trim().length > 5 && quem.trim().length > 2
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Sua resposta habitual",
    subtitulo: "O que costuma fazer quando o limite \xE9 violado?",
    dica: "Cada padr\xE3o tem um custo \u2014 identifique o seu sem julgamento.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: RESPOSTAS,
    selecionadas: resposta,
    onChange: setResposta,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: resposta.length > 0
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "Formule o limite",
    subtitulo: "Como comunicar de forma clara e assertiva",
    dica: "\"Quando [situa\xE7\xE3o], eu preciso que [pedido]. Se isso n\xE3o mudar, vou [consequ\xEAncia realista].\"",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: formulacao,
    onChange: e => setFormulacao(e.target.value),
    placeholder: "Ex: Quando recebo pedidos fora do hor\xE1rio, preciso que sejam deixados para o dia seguinte. Se isso continuar, terei de conversar formalmente...",
    style: {
      width: "100%",
      minHeight: 100,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: formulacao.trim().length > 10
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Prepare-se para a resist\xEAncia",
    subtitulo: "Como vai responder se o limite for pressionado?",
    dica: "Limites novos geram resist\xEAncia. Ter uma resposta pronta reduz a ansiedade.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: resistencia,
    onChange: e => setResistencia(e.target.value),
    placeholder: "Ex: Se insistirem, vou repetir com calma: 'Compreendo, mas preciso de manter este limite'...",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(2),
    onSave: () => setSalvo(true),
    podeProsseguir: true
  })));
}

// ── 3. Inventário de Carga Mental ────────────────────────────────
function FerramentaMentalLoad({
  user
}) {
  const COR = "#d97706";
  const BG = "#fef3c7";
  const [ver, setVer] = useState("");
  const [planear, setPlanear] = useState("");
  const [fazer, setFazer] = useState("");
  const [pctVoce, setPctVoce] = useState(60);
  const [atrito, setAtrito] = useState("");
  const [plano, setPlano] = useState("");
  const [p, setP] = useState(0);
  const [salvo, setSalvo] = useState(false);
  const pctOutro = 100 - pctVoce;
  const corBal = pctVoce >= 70 ? "#dc2626" : pctVoce >= 55 ? "#d97706" : "#059669";
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83E\uDDE9"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 12
    }
  }, "Invent\xE1rio registrado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 14,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: corBal
    }
  }, "Voc\xEA: ", pctVoce, "%"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#059669"
    }
  }, "Outro: ", pctOutro, "%"))), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setVer("");
      setPlanear("");
      setFazer("");
      setPctVoce(60);
      setAtrito("");
      setPlano("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo invent\xE1rio"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 4,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "VER \u2014 O que voc\xEA percebe",
    subtitulo: "Tarefas que voc\xEA nota precisam ser feitas",
    dica: "Durante 3 dias, anote tudo que 'gere' mentalmente: compras, consultas, necessidades dos filhos, gest\xE3o da casa.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: ver,
    onChange: e => setVer(e.target.value),
    placeholder: "Ex: Leite acabou, consulta do m\xE9dico para marcar, anivers\xE1rio da professora, carro precisa de revis\xE3o...",
    style: {
      width: "100%",
      minHeight: 100,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onNext: () => setP(1),
    podeProsseguir: ver.trim().length > 5
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "PLANEAR + FAZER",
    subtitulo: "Quem decide e quem executa?",
    dica: "Separar quem planeia de quem faz revela onde est\xE1 o desequil\xEDbrio real.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block",
      color: "var(--text)"
    }
  }, "Quem planeia (como, quando, com qu\xEA)?"), /*#__PURE__*/React.createElement("textarea", {
    value: planear,
    onChange: e => setPlanear(e.target.value),
    placeholder: "Ex: Eu decido tudo sobre as refei\xE7\xF5es, escola, m\xE9dico...",
    style: {
      width: "100%",
      minHeight: 70,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      boxSizing: "border-box",
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block",
      color: "var(--text)"
    }
  }, "Quem executa as tarefas?"), /*#__PURE__*/React.createElement("textarea", {
    value: fazer,
    onChange: e => setFazer(e.target.value),
    placeholder: "Ex: Eu fa\xE7o 80%, ele faz 20%...",
    style: {
      width: "100%",
      minHeight: 70,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: planear.trim().length > 3
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "Balan\xE7o da carga",
    subtitulo: "Quanto voc\xEA carrega?",
    dica: "Seja honesto \u2014 este dado \xE9 para voc\xEA, n\xE3o para acusar.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      fontWeight: 700,
      color: corBal
    }
  }, pctVoce, "%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "da carga mental total")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 0,
    max: 100,
    value: pctVoce,
    onChange: e => setPctVoce(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: corBal,
      marginBottom: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: corBal,
      fontWeight: 700
    }
  }, "Voc\xEA: ", pctVoce, "%"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#059669",
      fontWeight: 700
    }
  }, "Outro(s): ", pctOutro, "%")), pctVoce >= 70 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fee2e2",
      borderRadius: 10,
      padding: "10px 12px",
      marginTop: 10,
      fontSize: 12,
      color: "#7f1d1d"
    }
  }, "\u26A0\uFE0F Carga assim\xE9trica \u2014 considere a conversa de redistribui\xE7\xE3o."), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: true
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Plano de redistribui\xE7\xE3o",
    subtitulo: "O que pode ser redistribu\xEDdo?",
    dica: "Apresente como dados, n\xE3o como acusa\xE7\xE3o. 'Quero que vejamos juntos' em vez de 'nunca fazes nada'.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: atrito,
    onChange: e => setAtrito(e.target.value),
    placeholder: "Qual tarefa gera mais atrito ou \xE9 mais negligenciada?",
    style: {
      width: "100%",
      minHeight: 60,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      marginBottom: 10,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("textarea", {
    value: plano,
    onChange: e => setPlano(e.target.value),
    placeholder: "O que vai propor redistribuir e como?",
    style: {
      width: "100%",
      minHeight: 70,
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(2),
    onSave: () => setSalvo(true),
    podeProsseguir: true
  })));
}

// ── 4. Mapeamento do Ciclo de Conflito ───────────────────────────
function FerramentaConflictCycle({
  user
}) {
  const COR = "#dc2626";
  const BG = "#fee2e2";
  const PAPEIS = [{
    v: "inicia",
    l: "Quem inicia",
    e: "⚡"
  }, {
    v: "acusa",
    l: "Quem acusa",
    e: "👆"
  }, {
    v: "defende",
    l: "Quem defende",
    e: "🛡️"
  }, {
    v: "retira",
    l: "Quem se retira",
    e: "🚪"
  }, {
    v: "persegue",
    l: "Quem persegue",
    e: "🏃"
  }, {
    v: "explode",
    l: "Quem explode",
    e: "💥"
  }];
  const [p, setP] = useState(0);
  const [conflito, setConflito] = useState("");
  const [papeis, setPapeis] = useState([]);
  const [gatilho, setGatilho] = useState("");
  const [sequencia, setSequencia] = useState("");
  const [sinal, setSinal] = useState("");
  const [salvo, setSalvo] = useState(false);
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDD04"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 12
    }
  }, "Ciclo mapeado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20,
      textAlign: "left",
      fontSize: 13,
      lineHeight: 1.8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Conflito:"), " ", conflito.slice(0, 60), "..."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Gatilho:"), " ", gatilho), sinal && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", null, "Sinal de pausa:"), " \"", sinal, "\"")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setConflito("");
      setPapeis([]);
      setGatilho("");
      setSequencia("");
      setSinal("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo mapeamento"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 4,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "O conflito recorrente",
    subtitulo: "Qual discuss\xE3o se repete?",
    dica: "N\xE3o o conte\xFAdo espec\xEDfico \u2014 o padr\xE3o. 'Quando discutimos sobre X, o que acontece \xE9 sempre...'",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: conflito,
    onChange: e => setConflito(e.target.value),
    placeholder: "Ex: Sempre que discutimos sobre organiza\xE7\xE3o da casa, o padr\xE3o \xE9...",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onNext: () => setP(1),
    podeProsseguir: conflito.trim().length > 5
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Pap\xE9is no ciclo",
    subtitulo: "Quem costuma fazer o qu\xEA?",
    dica: "Os pap\xE9is s\xE3o fluidos \u2014 podem mudar conforme o tema.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: PAPEIS,
    selecionadas: papeis,
    onChange: setPapeis,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6,
      display: "block"
    }
  }, "Qual \xE9 o gatilho principal?"), /*#__PURE__*/React.createElement("input", {
    value: gatilho,
    onChange: e => setGatilho(e.target.value),
    placeholder: "Ex: Tom de voz, uma frase espec\xEDfica, momento do dia...",
    style: {
      width: "100%",
      padding: "10px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box"
    }
  })), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: papeis.length > 0 && gatilho.trim().length > 3
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "A sequ\xEAncia t\xEDpica",
    subtitulo: "O que acontece do in\xEDcio ao fim?",
    dica: "Escreva em passos numerados: eu digo X \u2192 ele reage Y \u2192 eu fa\xE7o Z...",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: sequencia,
    onChange: e => setSequencia(e.target.value),
    placeholder: `1. Eu digo...\n2. Ele/ela reage...\n3. Eu então...\n4. Ele/ela...\n5. O assunto fica...`,
    style: {
      width: "100%",
      minHeight: 120,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 13,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.8,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: sequencia.trim().length > 10
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Sinal de interrup\xE7\xE3o",
    subtitulo: "O que v\xE3o usar para sair do ciclo?",
    dica: "Acordem em momento de calma \u2014 uma palavra, gesto ou frase neutra que significa 'estamos no ciclo, precisamos parar'.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("input", {
    value: sinal,
    onChange: e => setSinal(e.target.value),
    placeholder: "Ex: 'Pausa', 'Tempo', um gesto com a m\xE3o...",
    style: {
      width: "100%",
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
      marginBottom: 12
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "10px 12px",
      fontSize: 12,
      color: "#7f1d1d",
      lineHeight: 1.6
    }
  }, "\uD83D\uDCA1 Ap\xF3s o sinal: separem-se 20 minutos, evitem rever a conversa mentalmente, regressem quando conseguirem falar com calma."), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(2),
    onSave: () => setSalvo(true),
    podeProsseguir: true
  })));
}

// ── 5. Escuta Ativa ──────────────────────────────────────────────
function FerramentaActiveListening({
  user
}) {
  const COR = "#059669";
  const BG = "#dcfce7";
  const CHECKS = [{
    id: "postura",
    l: "Corpo voltado, telemóvel fora"
  }, {
    id: "interrupcao",
    l: "Ouvi sem interromper"
  }, {
    id: "parafrase",
    l: "Parafraseei o que ouvi"
  }, {
    id: "validei",
    l: "Validei a emoção sem julgamento"
  }, {
    id: "pergunta",
    l: "Fiz pelo menos uma pergunta aberta"
  }, {
    id: "resolucao",
    l: "Perguntei se queria solução ou só ser ouvido"
  }];
  const [qualidade, setQualidade] = useState(5);
  const [parafrase, setParafrase] = useState("");
  const [checks, setChecks] = useState({});
  const [reflexao, setReflexao] = useState("");
  const [p, setP] = useState(0);
  const [salvo, setSalvo] = useState(false);
  const feitos = Object.values(checks).filter(Boolean).length;
  const corQ = qualidade <= 4 ? "#dc2626" : qualidade <= 6 ? "#d97706" : "#059669";
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDC42"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Escuta registrada!"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "14px",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: COR
    }
  }, "Qualidade: ", qualidade, "/10"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, feitos, "/", CHECKS.length, " pr\xE1ticas realizadas")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setQualidade(5);
      setParafrase("");
      setChecks({});
      setReflexao("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Nova sess\xE3o"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 3,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "Auto-avalia\xE7\xE3o da escuta",
    subtitulo: "Como foi a sua escuta hoje?",
    dica: "Avalie honestamente \u2014 n\xE3o como gostaria de ter sido, mas como realmente foi.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      fontWeight: 700,
      color: corQ
    }
  }, qualidade, "/10"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, qualidade <= 3 ? "Escuta muito comprometida" : qualidade <= 5 ? "Escuta parcial" : qualidade <= 7 ? "Escuta razoável" : "Escuta ativa e presente")), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: 1,
    max: 10,
    value: qualidade,
    onChange: e => setQualidade(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: corQ,
      marginBottom: 16
    }
  }), /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Checklist da escuta",
    subtitulo: "O que praticou nesta conversa?",
    dica: "",
    cor: COR,
    bg: BG
  }), CHECKS.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    onClick: () => setChecks(ch => ({
      ...ch,
      [c.id]: !ch[c.id]
    })),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1.5px solid",
      marginBottom: 6,
      cursor: "pointer",
      borderColor: checks[c.id] ? COR : "var(--gray-200)",
      background: checks[c.id] ? BG : "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      border: "2px solid",
      flexShrink: 0,
      borderColor: checks[c.id] ? COR : "var(--gray-300)",
      background: checks[c.id] ? COR : "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, checks[c.id] && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "white",
      fontSize: 11
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: checks[c.id] ? COR : "var(--text-muted)"
    }
  }, c.l))), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 3,
    onNext: () => setP(1),
    podeProsseguir: true
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "Par\xE1frase",
    subtitulo: "O que voc\xEA entendeu que o outro quis dizer?",
    dica: "Escreva como se fosse devolver ao outro: 'Se entendi bem, o que te preocupa \xE9...'",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: parafrase,
    onChange: e => setParafrase(e.target.value),
    placeholder: "Ex: Se entendi bem, o que te preocupa \xE9 que te sentes sozinho quando trabalho at\xE9 tarde...",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 3,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: parafrase.trim().length > 5
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Reflex\xE3o final",
    subtitulo: "O que aprendeu sobre a sua escuta?",
    dica: "O que foi mais dif\xEDcil? O que quer praticar diferente na pr\xF3xima conversa?",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("textarea", {
    value: reflexao,
    onChange: e => setReflexao(e.target.value),
    placeholder: "Ex: Percebi que j\xE1 estava a preparar a resposta enquanto ela falava...",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 3,
    onBack: () => setP(1),
    onSave: () => setSalvo(true),
    podeProsseguir: true
  })));
}

// ═══════════════════════════════════════════════════════════════════
// FERRAMENTAS MACRO_HUMOR — Componentes Mistos
// ═══════════════════════════════════════════════════════════════════

// Componentes reutilizáveis
function StepProgress({
  passo,
  total,
  cor
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 20
    }
  }, Array.from({
    length: total
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height: 4,
      borderRadius: 4,
      background: i <= passo ? cor : "var(--gray-100)",
      transition: "background .2s"
    }
  })));
}
function StepHeader({
  letra,
  titulo,
  subtitulo,
  dica,
  cor,
  bg
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 16,
      color: cor,
      flexShrink: 0
    }
  }, letra), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text)"
    }
  }, titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, subtitulo))), dica && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--gray-50,#f9fafb)",
      borderRadius: 8,
      padding: "9px 12px",
      fontSize: 12,
      color: "var(--text-muted)",
      lineHeight: 1.6,
      borderLeft: "3px solid " + cor
    }
  }, dica));
}
function TagsSelector({
  opcoes,
  selecionadas,
  onChange,
  cor,
  bg
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 7
    }
  }, opcoes.map(op => {
    const sel = selecionadas.includes(op.v || op);
    const val = op.v || op;
    const label = op.l || op;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      onClick: () => onChange(sel ? selecionadas.filter(x => x !== val) : [...selecionadas, val]),
      style: {
        padding: "6px 13px",
        borderRadius: 20,
        border: "1.5px solid",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        borderColor: sel ? cor : "var(--gray-200)",
        background: sel ? bg : "white",
        color: sel ? cor : "var(--text-muted)",
        fontWeight: sel ? 700 : 400,
        transition: "all .12s"
      }
    }, op.e && /*#__PURE__*/React.createElement("span", {
      style: {
        marginRight: 4
      }
    }, op.e), label);
  }));
}
function SliderStep({
  label,
  valor,
  onChange,
  min = 0,
  max = 10,
  cor,
  antes,
  depois
}) {
  const pct = Math.round((valor - min) / (max - min) * 100);
  const c = valor <= max * 0.35 ? cor : valor <= max * 0.65 ? "#d97706" : "#dc2626";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--text)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: c
    }
  }, valor, max === 100 ? "%" : "/" + max)), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: min,
    max: max,
    step: 1,
    value: valor,
    onChange: e => onChange(Number(e.target.value)),
    style: {
      width: "100%",
      accentColor: cor
    }
  }), (antes || depois) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement("span", null, antes), /*#__PURE__*/React.createElement("span", null, depois)));
}
function NavButtons({
  passo,
  total,
  onBack,
  onNext,
  onSave,
  podeProsseguir,
  salvando
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 20
    }
  }, passo > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      background: "white",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, "\u2190 Anterior"), passo < total - 1 && /*#__PURE__*/React.createElement("button", {
    onClick: onNext,
    disabled: !podeProsseguir,
    style: {
      flex: 2,
      padding: "10px",
      borderRadius: 10,
      border: "none",
      background: podeProsseguir ? "var(--purple)" : "var(--gray-100)",
      color: podeProsseguir ? "white" : "var(--text-muted)",
      cursor: podeProsseguir ? "pointer" : "not-allowed",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Pr\xF3ximo \u2192"), passo === total - 1 && onSave && /*#__PURE__*/React.createElement("button", {
    onClick: onSave,
    disabled: salvando || !podeProsseguir,
    style: {
      flex: 2,
      padding: "10px",
      borderRadius: 10,
      border: "none",
      background: podeProsseguir ? "var(--purple)" : "var(--gray-100)",
      color: podeProsseguir ? "white" : "var(--text-muted)",
      cursor: podeProsseguir ? "pointer" : "not-allowed",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, salvando ? "Salvando..." : "Salvar 💜"));
}

// ── 1. Análise em Cadeia ──────────────────────────────────────────
function FerramentaChainAnalysis({
  user
}) {
  const COR = "#db2777";
  const BG = "#fce7f3";
  const EMOCOES = [{
    v: "ansiedade",
    l: "Ansiedade",
    e: "😰"
  }, {
    v: "raiva",
    l: "Raiva",
    e: "😤"
  }, {
    v: "tristeza",
    l: "Tristeza",
    e: "😢"
  }, {
    v: "medo",
    l: "Medo",
    e: "😨"
  }, {
    v: "vergonha",
    l: "Vergonha",
    e: "😳"
  }, {
    v: "culpa",
    l: "Culpa",
    e: "😞"
  }, {
    v: "frustração",
    l: "Frustração",
    e: "😠"
  }, {
    v: "solidão",
    l: "Solidão",
    e: "🥺"
  }];
  const COMPORTAMENTOS = [{
    v: "evitei",
    l: "Evitei"
  }, {
    v: "gritei",
    l: "Gritei"
  }, {
    v: "chorei",
    l: "Chorei"
  }, {
    v: "me afastei",
    l: "Me afastei"
  }, {
    v: "fui ao celular",
    l: "Fui ao celular"
  }, {
    v: "comi",
    l: "Comi"
  }, {
    v: "fiquei quieto",
    l: "Fiquei quieto"
  }, {
    v: "pedi desculpa",
    l: "Pedi desculpa"
  }];
  const [p, setP] = useState(0);
  const [d, setD] = useState({
    episodio: "",
    gatilho: "",
    pensamento: "",
    emocoes: [],
    intensidade: 6,
    sensacao: "",
    comportamentos: [],
    reflexao: ""
  });
  const [salvo, setSalvo] = useState(false);
  const PASSOS = [{
    letra: "1",
    titulo: "Escolha um episódio",
    subtitulo: "O que aconteceu?",
    dica: "Descreva a situação de forma objetiva — onde estava, com quem, o que aconteceu.",
    valido: d.episodio.trim().length > 5
  }, {
    letra: "2",
    titulo: "Identifique o gatilho",
    subtitulo: "O que veio imediatamente antes?",
    dica: "Pode ser externo (uma frase, evento) ou interno (memória, pensamento espontâneo).",
    valido: d.gatilho.trim().length > 3
  }, {
    letra: "3",
    titulo: "Pensamento automático",
    subtitulo: "O que passou pela sua cabeça?",
    dica: "Escreva exatamente como surgiu, sem filtrar.",
    valido: d.pensamento.trim().length > 3
  }, {
    letra: "4",
    titulo: "Emoção primária",
    subtitulo: "O que sentiu?",
    dica: "Selecione a emoção principal e avalie a intensidade.",
    valido: d.emocoes.length > 0
  }, {
    letra: "5",
    titulo: "Sensação física",
    subtitulo: "O que sentiu no corpo?",
    dica: "Aperto no peito? Nó na garganta? Tensão nos ombros? Descreva onde e como.",
    valido: true
  }, {
    letra: "6",
    titulo: "Comportamento",
    subtitulo: "O que fez a seguir?",
    dica: "Selecione o que melhor descreve sua reação imediata.",
    valido: d.comportamentos.length > 0
  }, {
    letra: "7",
    titulo: "Reflexão",
    subtitulo: "O que poderia ter sido diferente?",
    dica: "Em que ponto da cadeia você poderia ter intervido? Qual alternativa teria mudado o resultado?",
    valido: true
  }];
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDD17"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "An\xE1lise registrada!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 24,
      lineHeight: 1.6
    }
  }, "Identificar a cadeia \xE9 o primeiro passo para interromp\xEA-la. \uD83D\uDC9C"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setD({
        episodio: "",
        gatilho: "",
        pensamento: "",
        emocoes: [],
        intensidade: 6,
        sensacao: "",
        comportamentos: [],
        reflexao: ""
      });
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Nova an\xE1lise"));
  const pInfo = PASSOS[p];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: PASSOS.length,
    cor: COR
  }), /*#__PURE__*/React.createElement(StepHeader, {
    letra: pInfo.letra,
    titulo: pInfo.titulo,
    subtitulo: pInfo.subtitulo,
    dica: pInfo.dica,
    cor: COR,
    bg: BG
  }), p === 0 && /*#__PURE__*/React.createElement("textarea", {
    value: d.episodio,
    onChange: e => setD({
      ...d,
      episodio: e.target.value
    }),
    placeholder: "Ex: Minha chefe me chamou para conversar de \xFAltima hora...",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), p === 1 && /*#__PURE__*/React.createElement("textarea", {
    value: d.gatilho,
    onChange: e => setD({
      ...d,
      gatilho: e.target.value
    }),
    placeholder: "Ex: Recebi uma mensagem dizendo que ela precisava falar comigo urgente...",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), p === 2 && /*#__PURE__*/React.createElement("textarea", {
    value: d.pensamento,
    onChange: e => setD({
      ...d,
      pensamento: e.target.value
    }),
    placeholder: "Ex: Fiz algo errado. Vou ser demitida. N\xE3o sirvo para este trabalho...",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: EMOCOES,
    selecionadas: d.emocoes,
    onChange: v => setD({
      ...d,
      emocoes: v
    }),
    cor: COR,
    bg: BG
  }), d.emocoes.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(SliderStep, {
    label: `Intensidade da ${d.emocoes[0]}`,
    valor: d.intensidade,
    onChange: v => setD({
      ...d,
      intensidade: v
    }),
    cor: COR,
    antes: "Leve",
    depois: "Muito intensa"
  }))), p === 4 && /*#__PURE__*/React.createElement("textarea", {
    value: d.sensacao,
    onChange: e => setD({
      ...d,
      sensacao: e.target.value
    }),
    placeholder: "Ex: Aperto no peito, respira\xE7\xE3o acelerada, est\xF4mago contra\xEDdo...",
    style: {
      width: "100%",
      minHeight: 80,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), p === 5 && /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: COMPORTAMENTOS,
    selecionadas: d.comportamentos,
    onChange: v => setD({
      ...d,
      comportamentos: v
    }),
    cor: COR,
    bg: BG
  }), p === 6 && /*#__PURE__*/React.createElement("textarea", {
    value: d.reflexao,
    onChange: e => setD({
      ...d,
      reflexao: e.target.value
    }),
    placeholder: "Ex: No passo 2 eu poderia ter respirado antes de catastrofizar...",
    style: {
      width: "100%",
      minHeight: 90,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      resize: "none",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: PASSOS.length,
    onBack: () => setP(p - 1),
    onNext: () => setP(p + 1),
    onSave: () => setSalvo(true),
    podeProsseguir: pInfo.valido
  }));
}

// ── 2. Plano de Ativação Comportamental ──────────────────────────
function FerramentaBehavioralActivation({
  user
}) {
  const COR = "#059669";
  const BG = "#dcfce7";
  const PRAZER_OPCOES = [{
    v: "musica",
    l: "Ouvir música",
    e: "🎵"
  }, {
    v: "banho",
    l: "Banho quente",
    e: "🚿"
  }, {
    v: "caminhada",
    l: "Caminhar",
    e: "🚶"
  }, {
    v: "ligar",
    l: "Ligar para alguém",
    e: "📞"
  }, {
    v: "serie",
    l: "Assistir série",
    e: "📺"
  }, {
    v: "ler",
    l: "Ler",
    e: "📚"
  }, {
    v: "cozinhar",
    l: "Cozinhar",
    e: "🍳"
  }, {
    v: "natureza",
    l: "Ficar na natureza",
    e: "🌿"
  }];
  const DOMINIO_OPCOES = [{
    v: "louça",
    l: "Lavar a louça",
    e: "🍽️"
  }, {
    v: "email",
    l: "Responder email",
    e: "📧"
  }, {
    v: "gaveta",
    l: "Arrumar gaveta",
    e: "🗂️"
  }, {
    v: "compras",
    l: "Lista de compras",
    e: "🛒"
  }, {
    v: "roupa",
    l: "Dobrar roupa",
    e: "👕"
  }, {
    v: "mensagem",
    l: "Enviar mensagem",
    e: "💬"
  }, {
    v: "tarefa",
    l: "Uma tarefa pendente",
    e: "✅"
  }, {
    v: "ambiente",
    l: "Organizar ambiente",
    e: "🏠"
  }];
  const [p, setP] = useState(0);
  const [prazer, setPrazer] = useState([]);
  const [dominio, setDominio] = useState([]);
  const [escolhaPrazer, setEscolhaPrazer] = useState("");
  const [escolhaDominio, setEscolhaDominio] = useState("");
  const [horaPrazer, setHoraPrazer] = useState("");
  const [horaDominio, setHoraDominio] = useState("");
  const [humorAntes, setHumorAntes] = useState(5);
  const [humorDepois, setHumorDepois] = useState(5);
  const [feito, setFeito] = useState({
    prazer: false,
    dominio: false
  });
  const [salvo, setSalvo] = useState(false);
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\u26A1"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Plano registrado!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 8,
      lineHeight: 1.6
    }
  }, "Humor antes: ", /*#__PURE__*/React.createElement("strong", null, humorAntes, "/10"), " \u2192 depois: ", /*#__PURE__*/React.createElement("strong", null, humorDepois, "/10")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 24
    }
  }, "A a\xE7\xE3o gerou a motiva\xE7\xE3o. \uD83D\uDC9C"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setPrazer([]);
      setDominio([]);
      setEscolhaPrazer("");
      setEscolhaDominio("");
      setHoraPrazer("");
      setHoraDominio("");
      setHumorAntes(5);
      setHumorDepois(5);
      setFeito({
        prazer: false,
        dominio: false
      });
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Novo plano"));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 5,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "Humor agora",
    subtitulo: "Como est\xE1 se sentindo antes de come\xE7ar?",
    dica: "Seja honesto \u2014 n\xE3o h\xE1 resposta certa.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(SliderStep, {
    label: "Meu humor agora",
    valor: humorAntes,
    onChange: setHumorAntes,
    cor: COR,
    antes: "Muito mal",
    depois: "Muito bem"
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onNext: () => setP(1),
    podeProsseguir: true
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Atividades de prazer",
    subtitulo: "O que pode dar leveza hoje?",
    dica: "Escolha op\xE7\xF5es pequenas \u2014 poss\xEDveis mesmo num dia dif\xEDcil.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: PRAZER_OPCOES,
    selecionadas: prazer,
    onChange: setPrazer,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onBack: () => setP(0),
    onNext: () => setP(2),
    podeProsseguir: prazer.length > 0
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "Atividades de dom\xEDnio",
    subtitulo: "O que pode concluir hoje?",
    dica: "Tarefas pequenas que d\xE3o sensa\xE7\xE3o de capacidade quando conclu\xEDdas.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: DOMINIO_OPCOES,
    selecionadas: dominio,
    onChange: setDominio,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: dominio.length > 0
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Agenda do dia",
    subtitulo: "Defina a hora exata de cada atividade",
    dica: "Hora definida = muito mais chance de acontecer.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text)",
      marginBottom: 6,
      display: "block"
    }
  }, "Prazer \u2014 ", PRAZER_OPCOES.find(x => x.v === prazer[0])?.l || prazer[0]), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: horaPrazer,
    onChange: e => setHoraPrazer(e.target.value),
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text)",
      marginBottom: 6,
      display: "block"
    }
  }, "Dom\xEDnio \u2014 ", DOMINIO_OPCOES.find(x => x.v === dominio[0])?.l || dominio[0]), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: horaDominio,
    onChange: e => setHoraDominio(e.target.value),
    style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1.5px solid " + COR + "50",
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none"
    }
  })), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onBack: () => setP(2),
    onNext: () => setP(4),
    podeProsseguir: horaPrazer.length > 0 && horaDominio.length > 0
  })), p === 4 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "5",
    titulo: "Como ficou?",
    subtitulo: "Registre ap\xF3s realizar as atividades",
    dica: "Marque o que fez e avalie o humor depois.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, [{
    k: "prazer",
    l: "Atividade de prazer feita"
  }, {
    k: "dominio",
    l: "Atividade de domínio feita"
  }].map(item => /*#__PURE__*/React.createElement("div", {
    key: item.k,
    onClick: () => setFeito(f => ({
      ...f,
      [item.k]: !f[item.k]
    })),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px",
      borderRadius: 10,
      border: "1.5px solid",
      marginBottom: 8,
      cursor: "pointer",
      borderColor: feito[item.k] ? COR : "var(--gray-200)",
      background: feito[item.k] ? BG : "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      border: "2px solid",
      flexShrink: 0,
      borderColor: feito[item.k] ? COR : "var(--gray-300)",
      background: feito[item.k] ? COR : "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, feito[item.k] && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "white",
      fontSize: 13
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: feito[item.k] ? 700 : 400,
      color: feito[item.k] ? COR : "var(--text-muted)"
    }
  }, item.l)))), /*#__PURE__*/React.createElement(SliderStep, {
    label: "Meu humor agora",
    valor: humorDepois,
    onChange: setHumorDepois,
    cor: COR,
    antes: "Muito mal",
    depois: "Muito bem"
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 5,
    onBack: () => setP(3),
    onSave: () => setSalvo(true),
    podeProsseguir: true
  })));
}

// ── 3. Kit SOS — TIPP ────────────────────────────────────────────
function FerramentaTIPP({
  user
}) {
  const COR = "#dc2626";
  const BG = "#fee2e2";
  const FASES = [{
    id: "T",
    titulo: "T — Temperatura",
    instrucao: "Mergulhe o rosto em água fria 15-30s ou segure gelo nas mãos.",
    tipo: "timer",
    dur: 30,
    cor: "#0891b2",
    bg: "#e0f2fe"
  }, {
    id: "I",
    titulo: "I — Intensidade",
    instrucao: "Jumping jacks, correr no lugar ou flexões por 60 segundos.",
    tipo: "timer",
    dur: 60,
    cor: "#d97706",
    bg: "#fef3c7"
  }, {
    id: "P1",
    titulo: "P — Pace respiratório",
    instrucao: "Inspire 4s → Expire 8s. Repita 5 vezes.",
    tipo: "timer",
    dur: 60,
    cor: "#7c3aed",
    bg: "#ede9fe"
  }, {
    id: "P2",
    titulo: "P — Relaxamento muscular",
    instrucao: "Contraia e solte grupos musculares dos pés à cabeça. 5s contraído, 10s solto.",
    tipo: "check",
    cor: "#059669",
    bg: "#dcfce7"
  }];
  const [p, setP] = useState(-1); // -1=intro
  const [intensAntes, setIntensAntes] = useState(8);
  const [intensDepois, setIntensDepois] = useState(8);
  const [checks, setChecks] = useState({});
  const [tempoRestante, setTempoRestante] = useState(0);
  const [rodando, setRodando] = useState(false);
  const [faseConcluida, setFaseConcluida] = useState({});
  const timerRef = React.useRef(null);
  function iniciarTimer(dur) {
    setTempoRestante(dur);
    setRodando(true);
  }
  React.useEffect(() => {
    if (!rodando) return;
    timerRef.current = setInterval(() => {
      setTempoRestante(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setRodando(false);
          setFaseConcluida(f => ({
            ...f,
            [p]: true
          }));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [rodando, p]);
  if (p === -1) return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 12,
      padding: "16px",
      marginBottom: 20,
      borderLeft: "3px solid " + COR
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: COR,
      marginBottom: 6
    }
  }, "Kit SOS Emocional \u2014 T\xE9cnica TIPP"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#7f1d1d",
      lineHeight: 1.6
    }
  }, "Esta t\xE9cnica ativa o sistema nervoso parassimp\xE1tico em minutos. Use quando estiver em pico emocional.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(SliderStep, {
    label: "Intensidade emocional agora",
    valor: intensAntes,
    onChange: setIntensAntes,
    cor: COR,
    antes: "Baixa",
    depois: "Muito alta"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setP(0),
    style: {
      width: "100%",
      padding: "13px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Iniciar SOS \u2192"));
  if (p >= FASES.length) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83E\uDDD8"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: "#059669",
      marginBottom: 12
    }
  }, "TIPP conclu\xEDdo!"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(SliderStep, {
    label: "Intensidade emocional agora",
    valor: intensDepois,
    onChange: setIntensDepois,
    cor: "#059669",
    antes: "Baixa",
    depois: "Muito alta"
  })), intensDepois < intensAntes && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#dcfce7",
      borderRadius: 10,
      padding: "12px",
      fontSize: 13,
      color: "#166534",
      marginBottom: 20
    }
  }, "\u2713 Redu\xE7\xE3o de ", intensAntes - intensDepois, " pontos. O seu sistema nervoso respondeu. \uD83D\uDC9C"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setP(-1);
      setFaseConcluida({});
      setChecks({});
      setRodando(false);
      setIntensAntes(8);
      setIntensDepois(8);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Usar novamente"));
  const fase = FASES[p];
  const concluida = faseConcluida[p];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: FASES.length,
    cor: COR
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: fase.bg,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 16,
      borderLeft: "3px solid " + fase.cor
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: fase.cor,
      marginBottom: 4
    }
  }, fase.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text)",
      lineHeight: 1.6
    }
  }, fase.instrucao)), fase.tipo === "timer" && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, !rodando && !concluida && /*#__PURE__*/React.createElement("button", {
    onClick: () => iniciarTimer(fase.dur),
    style: {
      padding: "12px 28px",
      borderRadius: 10,
      border: "none",
      background: fase.cor,
      color: "white",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "\u25B6 Iniciar (", fase.dur, "s)"), rodando && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90,
      height: 90,
      borderRadius: "50%",
      border: "3px solid " + fase.cor,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      color: fase.cor
    }
  }, tempoRestante), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)"
    }
  }, "seg")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--gray-100)",
      borderRadius: 20,
      height: 5,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: (fase.dur - tempoRestante) / fase.dur * 100 + "%",
      height: "100%",
      borderRadius: 20,
      background: fase.cor,
      transition: "width 1s linear"
    }
  }))), concluida && /*#__PURE__*/React.createElement("div", {
    style: {
      background: fase.bg,
      borderRadius: 10,
      padding: "12px",
      fontSize: 13,
      fontWeight: 600,
      color: fase.cor
    }
  }, "\u2713 Conclu\xEDdo!")), fase.tipo === "check" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, ["Pés e pernas", "Abdômen", "Ombros e braços", "Rosto e pescoço"].map(m => /*#__PURE__*/React.createElement("div", {
    key: m,
    onClick: () => setChecks(c => ({
      ...c,
      [m]: !c[m]
    })),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "11px 12px",
      borderRadius: 10,
      border: "1.5px solid",
      marginBottom: 8,
      cursor: "pointer",
      borderColor: checks[m] ? fase.cor : "var(--gray-200)",
      background: checks[m] ? fase.bg : "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      border: "2px solid",
      flexShrink: 0,
      borderColor: checks[m] ? fase.cor : "var(--gray-300)",
      background: checks[m] ? fase.cor : "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, checks[m] && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "white",
      fontSize: 11
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: checks[m] ? fase.cor : "var(--text-muted)"
    }
  }, m)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 8
    }
  }, p > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setP(p - 1);
      setRodando(false);
      clearInterval(timerRef.current);
    },
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      background: "white",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, "\u2190 Voltar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setP(p + 1);
      setRodando(false);
      clearInterval(timerRef.current);
    },
    disabled: fase.tipo === "timer" && !concluida && !rodando === false && tempoRestante > 0,
    style: {
      flex: 2,
      padding: "10px",
      borderRadius: 10,
      border: "none",
      background: fase.cor,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, p === FASES.length - 1 ? "Ver resultado →" : "Próxima etapa →")));
}

// ── 4. Pausa Estratégica ──────────────────────────────────────────
function FerramentaStrategicPause({
  user
}) {
  const COR = "#7c3aed";
  const BG = "#ede9fe";
  const SINAIS = [{
    v: "voz",
    l: "Voz que sobe"
  }, {
    v: "peito",
    l: "Aperto no peito"
  }, {
    v: "rapido",
    l: "Pensamentos acelerados"
  }, {
    v: "chorar",
    l: "Vontade de chorar"
  }, {
    v: "fugir",
    l: "Vontade de sair"
  }, {
    v: "atacar",
    l: "Vontade de atacar"
  }, {
    v: "travar",
    l: "Travar/congelar"
  }, {
    v: "sarcasmo",
    l: "Sarcasmo automático"
  }];
  const [p, setP] = useState(0);
  const [sinais, setSinais] = useState([]);
  const [anunciou, setAnunciou] = useState(false);
  const [tempoPausa, setTempoPausa] = useState(20);
  const [rodando, setRodando] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(20 * 60);
  const [ativou, setAtivou] = useState([]);
  const [pronto, setPronto] = useState(null);
  const timerRef = React.useRef(null);
  React.useEffect(() => {
    if (!rodando) return;
    timerRef.current = setInterval(() => {
      setTempoRestante(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setRodando(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [rodando]);
  const min = Math.floor(tempoRestante / 60);
  const seg = tempoRestante % 60;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: 4,
    cor: COR
  }), p === 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "1",
    titulo: "Seus sinais de alarme",
    subtitulo: "O que sente quando est\xE1 sendo sequestrado?",
    dica: "Reconhecer o sinal \xE9 o primeiro passo para a pausa.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(TagsSelector, {
    opcoes: SINAIS,
    selecionadas: sinais,
    onChange: setSinais,
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onNext: () => setP(1),
    podeProsseguir: sinais.length > 0
  })), p === 1 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "2",
    titulo: "Anuncie a pausa",
    subtitulo: "N\xE3o saia sem avisar",
    dica: "\"Preciso de 20 minutos. N\xE3o estou fugindo \u2014 vou voltar para resolvermos isso.\"",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    onClick: () => setAnunciou(!anunciou),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "14px",
      borderRadius: 12,
      border: "1.5px solid",
      cursor: "pointer",
      marginBottom: 16,
      borderColor: anunciou ? COR : "var(--gray-200)",
      background: anunciou ? BG : "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      border: "2px solid",
      flexShrink: 0,
      borderColor: anunciou ? COR : "var(--gray-300)",
      background: anunciou ? COR : "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, anunciou && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "white",
      fontSize: 12
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: anunciou ? 700 : 400,
      color: anunciou ? COR : "var(--text-muted)"
    }
  }, "Avisei a outra pessoa que vou fazer uma pausa")), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(0),
    onNext: () => {
      setTempoRestante(tempoPausa * 60);
      setP(2);
    },
    podeProsseguir: anunciou
  })), p === 2 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "3",
    titulo: "Pausa de 20 minutos",
    subtitulo: "N\xE3o alimente a raiva durante a pausa",
    dica: "Evite rever a conversa mentalmente. Caminhe, beba \xE1gua, respire.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 100,
      height: 100,
      borderRadius: "50%",
      border: "3px solid " + COR,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 12px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 700,
      color: COR
    }
  }, min, ":", seg.toString().padStart(2, "0")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)"
    }
  }, "restantes")), !rodando && tempoRestante === tempoPausa * 60 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setRodando(true),
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Iniciar pausa"), rodando && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setRodando(false);
      clearInterval(timerRef.current);
    },
    style: {
      padding: "8px 20px",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      background: "white",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, "Pausar timer")), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(1),
    onNext: () => setP(3),
    podeProsseguir: true
  })), p === 3 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepHeader, {
    letra: "4",
    titulo: "Voc\xEA est\xE1 pronto?",
    subtitulo: "Antes de voltar, verifique",
    dica: "S\xF3 volte ao assunto quando conseguir falar com tom calmo e acesso ao racioc\xEDnio.",
    cor: COR,
    bg: BG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, ["Voz está calma", "Corpo está relaxado", "Consigo ouvir sem contra-atacar", "Tenho acesso ao raciocínio"].map(item => /*#__PURE__*/React.createElement("div", {
    key: item,
    onClick: () => setAtivou(a => a.includes(item) ? a.filter(x => x !== item) : [...a, item]),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "11px",
      borderRadius: 10,
      border: "1.5px solid",
      marginBottom: 8,
      cursor: "pointer",
      borderColor: ativou.includes(item) ? COR : "var(--gray-200)",
      background: ativou.includes(item) ? BG : "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      border: "2px solid",
      flexShrink: 0,
      borderColor: ativou.includes(item) ? COR : "var(--gray-300)",
      background: ativou.includes(item) ? COR : "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, ativou.includes(item) && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "white",
      fontSize: 11
    }
  }, "\u2713")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: ativou.includes(item) ? COR : "var(--text-muted)"
    }
  }, item)))), ativou.length >= 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: BG,
      borderRadius: 10,
      padding: "12px",
      fontSize: 13,
      color: COR,
      fontWeight: 600,
      marginBottom: 16
    }
  }, "\u2713 Pronto para retomar a conversa com equil\xEDbrio."), ativou.length < 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fef3c7",
      borderRadius: 10,
      padding: "12px",
      fontSize: 13,
      color: "#854F0B",
      marginBottom: 16
    }
  }, "Ainda n\xE3o \u2014 aguarde mais um pouco ou estenda a pausa."), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: 4,
    onBack: () => setP(2),
    onSave: () => setPronto(ativou.length >= 3),
    podeProsseguir: true
  })), pronto !== null && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 12
    }
  }, pronto ? "🕊️" : "⏳"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      color: pronto ? COR : "#d97706",
      marginBottom: 16
    }
  }, pronto ? "Pausa concluída com sucesso!" : "Mais um pouco de pausa"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSinais([]);
      setAnunciou(false);
      setAtivou([]);
      setPronto(null);
      setTempoRestante(20 * 60);
      setP(0);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Reiniciar")));
}

// ── 5. Diário de Autocompaixão ────────────────────────────────────
function FerramentaRastreamentoCompulsao({
  user
}) {
  const COR = "#7c3aed";
  const BG = "#ede9fe";
  const BLOCOS = [{
    id: "A",
    titulo: "Perda de Controle",
    icone: "🔄",
    perguntas: ["Tento parar ou reduzir meu comportamento sexual, mas não consigo.", "Gasto mais tempo do que pretendia em atividades sexuais ou relacionadas.", "Já tentei parar mais de uma vez e voltei ao mesmo padrão.", "Sinto que o comportamento é maior do que minha vontade de controlá-lo."]
  }, {
    id: "B",
    titulo: "Gatilhos e Fissura",
    icone: "⚡",
    perguntas: ["Situações de estresse, tédio ou solidão me levam ao comportamento.", "Sinto uma tensão crescente antes de ceder, seguida de alívio temporário.", "Pensamentos sobre o comportamento aparecem mesmo quando não quero.", "O comportamento serve para aliviar emoções difíceis, não apenas por prazer."]
  }, {
    id: "C",
    titulo: "Consequências",
    icone: "💔",
    perguntas: ["O comportamento já afetou meus relacionamentos afetivos.", "Já prejudicou meu trabalho, estudos ou compromissos.", "Sinto culpa, vergonha ou arrependimento depois do comportamento.", "Escondo o comportamento de pessoas próximas."]
  }, {
    id: "D",
    titulo: "Escalada",
    icone: "📈",
    perguntas: ["Preciso de estímulos cada vez mais intensos para obter o mesmo efeito.", "O tempo ou frequência dedicados ao comportamento aumentou com o tempo.", "Já busquei situações de risco para manter o comportamento."]
  }];
  const LABELS = ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Quase sempre"];
  const totalQ = BLOCOS.reduce((a, b) => a + b.perguntas.length, 0);
  const [respostas, setRespostas] = React.useState({});
  const [resultado, setResultado] = React.useState(null);
  const [enviando, setEnviando] = React.useState(false);
  const respondidas = Object.keys(respostas).length;
  const scoreTotal = Object.values(respostas).reduce((a, b) => a + b, 0);
  function getNivel(s) {
    if (s <= 10) return {
      nivel: "Baixo",
      cor: "#059669",
      texto: "Seu padrão atual não indica compulsão significativa. Continue atento aos seus gatilhos emocionais."
    };
    if (s <= 22) return {
      nivel: "Moderado",
      cor: "#d97706",
      texto: "Há sinais de que o comportamento sexual pode estar sendo usado como regulação emocional. Vale explorar isso com sua psicóloga."
    };
    if (s <= 35) return {
      nivel: "Elevado",
      cor: "#dc2626",
      texto: "Os resultados indicam padrão compulsivo com impacto na sua vida. Este é um ponto importante para trabalhar em terapia."
    };
    return {
      nivel: "Alto",
      cor: "#7c3aed",
      texto: "Os dados sugerem comportamento compulsivo significativo. Seu processo terapêutico pode se beneficiar de atenção específica a este tema."
    };
  }
  async function enviar() {
    if (respondidas < totalQ) return;
    setEnviando(true);
    const res = getNivel(scoreTotal);
    setResultado({
      ...res,
      score: scoreTotal
    });
    try {
      await db.collection("clinica_respostas_ferramentas").add({
        pacienteId: user?.id || "",
        pacienteNome: user?.nome || "",
        formularioKey: "rastreamento-compulsao-sexual",
        respostas,
        score: scoreTotal,
        nivel: res.nivel,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.warn(e);
    }
    setEnviando(false);
  }
  if (resultado) return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: resultado.cor,
      borderRadius: 12,
      padding: "24px",
      textAlign: "center",
      color: "white",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 8
    }
  }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: 0.85,
      marginBottom: 4
    }
  }, "N\xEDvel identificado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      marginBottom: 8
    }
  }, resultado.nivel), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: 0.9
    }
  }, resultado.score, " de 60 pontos")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: resultado.cor + "15",
      border: "1px solid " + resultado.cor + "40",
      borderRadius: 10,
      padding: "16px 20px",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "#1f2937",
      lineHeight: 1.7
    }
  }, resultado.texto)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f3e6ff",
      borderRadius: 10,
      padding: "14px 16px",
      fontSize: 12,
      color: COR,
      lineHeight: 1.6
    }
  }, "\u26A0\uFE0F Instrumento de triagem interna \u2014 n\xE3o substitui avalia\xE7\xE3o cl\xEDnica formal. Resultado compartilhado com sua psic\xF3loga."));
  let qNum = 0;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: COR,
      borderRadius: "12px 12px 0 0",
      padding: "20px",
      color: "white"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: 0.85,
      marginBottom: 4
    }
  }, "Rastreamento Cl\xEDnico Interno"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 4
    }
  }, "Comportamento Sexual Compulsivo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      opacity: 0.8
    }
  }, "Responda pensando nos \xFAltimos 3 meses \xB7 ", respondidas, "/", totalQ, " respondidas")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      border: "1px solid #e9d5ff",
      borderRadius: "0 0 12px 12px",
      padding: "20px",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 4,
      background: "#f3f4f6",
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      width: respondidas / totalQ * 100 + "%",
      background: COR,
      transition: "width .3s"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: COR,
      fontWeight: 600,
      marginBottom: 16,
      textAlign: "center"
    }
  }, "0 = Nunca \xB7 1 = Raramente \xB7 2 = \xC0s vezes \xB7 3 = Frequentemente \xB7 4 = Quase sempre"), BLOCOS.map(bloco => /*#__PURE__*/React.createElement("div", {
    key: bloco.id,
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
      padding: "8px 12px",
      background: BG,
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, bloco.icone), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: COR
    }
  }, "Bloco ", bloco.id, " \u2014 ", bloco.titulo)), bloco.perguntas.map((p, pi) => {
    qNum++;
    const key = `${bloco.id}-${pi}`;
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      style: {
        marginBottom: 14,
        padding: "12px",
        background: "#fafafa",
        borderRadius: 8,
        border: "1px solid #f3f4f6"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#374151",
        lineHeight: 1.5,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: COR
      }
    }, qNum, ". "), p), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4,
        flexWrap: "wrap"
      }
    }, [0, 1, 2, 3, 4].map(v => /*#__PURE__*/React.createElement("button", {
      key: v,
      onClick: () => setRespostas(r => ({
        ...r,
        [key]: v
      })),
      style: {
        padding: "5px 8px",
        borderRadius: 16,
        border: "1.5px solid",
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "inherit",
        borderColor: respostas[key] === v ? COR : "#e5e7eb",
        background: respostas[key] === v ? COR : "white",
        color: respostas[key] === v ? "white" : "#374151",
        fontWeight: respostas[key] === v ? 700 : 400
      }
    }, v, " \u2014 ", LABELS[v]))));
  }))), /*#__PURE__*/React.createElement("button", {
    onClick: enviar,
    disabled: respondidas < totalQ || enviando,
    style: {
      width: "100%",
      padding: "14px",
      borderRadius: 10,
      border: "none",
      background: respondidas < totalQ ? "#e5e7eb" : COR,
      color: respondidas < totalQ ? "#9ca3af" : "white",
      fontSize: 14,
      fontWeight: 700,
      cursor: respondidas < totalQ ? "not-allowed" : "pointer",
      fontFamily: "inherit"
    }
  }, enviando ? "Enviando..." : respondidas < totalQ ? `Responda mais ${totalQ - respondidas} pergunta(s)` : "Ver meu resultado →")));
}
function FerramentaSelfCompassion({
  user
}) {
  const COR = "#d97706";
  const BG = "#fef3c7";
  const [p, setP] = useState(0);
  const [situacao, setSituacao] = useState("");
  const [juiz, setJuiz] = useState("");
  const [amigo, setAmigo] = useState("");
  const [reescrita, setReescrita] = useState("");
  const [acao, setAcao] = useState("");
  const [salvo, setSalvo] = useState(false);
  if (salvo) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56,
      marginBottom: 12
    }
  }, "\uD83D\uDC9B"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700,
      color: COR,
      marginBottom: 8
    }
  }, "Autocompaix\xE3o registrada!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 24,
      lineHeight: 1.6
    }
  }, "Voc\xEA praticou falar consigo mesmo com a gentileza que merece. \uD83D\uDC9C"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setSituacao("");
      setJuiz("");
      setAmigo("");
      setReescrita("");
      setAcao("");
      setP(0);
      setSalvo(false);
    },
    style: {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      background: COR,
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit"
    }
  }, "Nova entrada"));
  const PASSOS = [{
    letra: "1",
    titulo: "A situação",
    subtitulo: "O que aconteceu?",
    dica: "Descreva brevemente algo que correu mal ou que está fazendo você se sentir mal consigo mesmo.",
    campo: /*#__PURE__*/React.createElement("textarea", {
      value: situacao,
      onChange: e => setSituacao(e.target.value),
      placeholder: "Ex: Esqueci de um compromisso importante e decepcionei algu\xE9m...",
      style: {
        width: "100%",
        minHeight: 80,
        padding: "11px",
        borderRadius: 10,
        border: "1.5px solid " + COR + "50",
        fontSize: 14,
        fontFamily: "inherit",
        resize: "none",
        lineHeight: 1.6,
        boxSizing: "border-box",
        outline: "none"
      }
    }),
    valido: situacao.trim().length > 5
  }, {
    letra: "2",
    titulo: "O juiz interno",
    subtitulo: "O que a voz crítica está dizendo?",
    dica: "Escreva exatamente os pensamentos autocríticos que surgem. Sem filtro.",
    campo: /*#__PURE__*/React.createElement("textarea", {
      value: juiz,
      onChange: e => setJuiz(e.target.value),
      placeholder: "Ex: Que idiota. Sou irrespons\xE1vel. Nunca fa\xE7o nada certo...",
      style: {
        width: "100%",
        minHeight: 80,
        padding: "11px",
        borderRadius: 10,
        border: "1.5px solid " + COR + "50",
        fontSize: 14,
        fontFamily: "inherit",
        resize: "none",
        lineHeight: 1.6,
        boxSizing: "border-box",
        outline: "none"
      }
    }),
    valido: juiz.trim().length > 5
  }, {
    letra: "3",
    titulo: "O amigo que ama",
    subtitulo: "O que diria ao seu melhor amigo?",
    dica: "Imagine-o passando pela mesma situação. Escreva exatamente o que você diria a ele — com o tom que usaria.",
    campo: /*#__PURE__*/React.createElement("textarea", {
      value: amigo,
      onChange: e => setAmigo(e.target.value),
      placeholder: "Ex: Acontece, voc\xEA n\xE3o \xE9 perfeito. O que importa \xE9 como vai reparar...",
      style: {
        width: "100%",
        minHeight: 80,
        padding: "11px",
        borderRadius: 10,
        border: "1.5px solid " + COR + "50",
        fontSize: 14,
        fontFamily: "inherit",
        resize: "none",
        lineHeight: 1.6,
        boxSizing: "border-box",
        outline: "none"
      }
    }),
    valido: amigo.trim().length > 5
  }, {
    letra: "4",
    titulo: "Reescreva para si",
    subtitulo: "Agora fale consigo com essa mesma gentileza",
    dica: "Use o mesmo tom que usou com o amigo — rigoroso mas gentil. Reconheça o erro sem atacar a identidade.",
    campo: /*#__PURE__*/React.createElement("textarea", {
      value: reescrita,
      onChange: e => setReescrita(e.target.value),
      placeholder: "Ex: Cometi um erro e isso n\xE3o me define. Posso pedir desculpa e fazer diferente...",
      style: {
        width: "100%",
        minHeight: 80,
        padding: "11px",
        borderRadius: 10,
        border: "1.5px solid " + COR + "50",
        fontSize: 14,
        fontFamily: "inherit",
        resize: "none",
        lineHeight: 1.6,
        boxSizing: "border-box",
        outline: "none"
      }
    }),
    valido: reescrita.trim().length > 5
  }, {
    letra: "5",
    titulo: "Um passo pequeno",
    subtitulo: "O que pode fazer agora?",
    dica: "Uma ação concreta e pequena. Não precisa resolver tudo — só o próximo passo.",
    campo: /*#__PURE__*/React.createElement("textarea", {
      value: acao,
      onChange: e => setAcao(e.target.value),
      placeholder: "Ex: Vou enviar uma mensagem pedindo desculpa ainda hoje...",
      style: {
        width: "100%",
        minHeight: 70,
        padding: "11px",
        borderRadius: 10,
        border: "1.5px solid " + COR + "50",
        fontSize: 14,
        fontFamily: "inherit",
        resize: "none",
        lineHeight: 1.6,
        boxSizing: "border-box",
        outline: "none"
      }
    }),
    valido: true
  }];
  const pInfo = PASSOS[p];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(StepProgress, {
    passo: p,
    total: PASSOS.length,
    cor: COR
  }), /*#__PURE__*/React.createElement(StepHeader, {
    letra: pInfo.letra,
    titulo: pInfo.titulo,
    subtitulo: pInfo.subtitulo,
    dica: pInfo.dica,
    cor: COR,
    bg: BG
  }), pInfo.campo, p === 1 && juiz.length > 10 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f3f4f6",
      borderRadius: 10,
      padding: "10px 12px",
      marginTop: 10,
      fontSize: 12,
      color: "var(--text-muted)",
      fontStyle: "italic"
    }
  }, "\uD83D\uDCAD Voc\xEA diria isso a algu\xE9m que ama? Guarde essa pergunta para o pr\xF3ximo passo."), /*#__PURE__*/React.createElement(NavButtons, {
    passo: p,
    total: PASSOS.length,
    onBack: () => setP(p - 1),
    onNext: () => setP(p + 1),
    onSave: () => setSalvo(true),
    podeProsseguir: pInfo.valido
  }));
}
function ModalVisualizarFerramenta({
  recurso,
  onClose,
  user
}) {
  function renderFerramenta() {
    const k = recurso.formularioKey;
    if (k === "breathing-478") return /*#__PURE__*/React.createElement(FerramentaRespiracao, null);
    if (k === "muscle-relaxation") return /*#__PURE__*/React.createElement(FerramentaRelaxamento, null);
    if (k === "decision-tree") return /*#__PURE__*/React.createElement(FerramentaArvore, null);
    if (k === "abc-record") return /*#__PURE__*/React.createElement(FerramentaABC, null);
    if (k === "anxiety-management") return /*#__PURE__*/React.createElement(FerramentaGestaoAnsiedade, null);
    if (k === "emotional-eating") return /*#__PURE__*/React.createElement(FerramentaRastreamento, null);
    if (k === "treino-neuro-auditivo") return /*#__PURE__*/React.createElement(FerramentaTreino, null);
    if (k === "entrevista-clinica") return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "30px 20px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 44,
        marginBottom: 12
      }
    }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: 600,
        marginBottom: 8
      }
    }, "Entrevista Cl\xEDnica Inicial"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#6b7280",
        marginBottom: 20,
        lineHeight: 1.7
      }
    }, "Instrumento de avalia\xE7\xE3o com perfil et\xE1rio, escalas de observa\xE7\xE3o, question\xE1rio de habilidades e hip\xF3teses DSM-5."), /*#__PURE__*/React.createElement("a", {
      href: "https://luciakratz-arch.github.io/entrevista-inicial/",
      target: "_blank",
      className: "btn btn-purple",
      style: {
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 8
      }
    }, "\uD83D\uDD17 Abrir Entrevista Cl\xEDnica"));
    if (k === "anamnese") return /*#__PURE__*/React.createElement(FerramentaAnamnese, null);
    if (k === "diario-terapeutico") return /*#__PURE__*/React.createElement(FerramentaDiario, {
      user: user
    });
    // macro_corpo
    if (k === "polyvagal-ladder") return /*#__PURE__*/React.createElement(FerramentaPolyvagal, {
      user: user
    });
    if (k === "grounding-5senses") return /*#__PURE__*/React.createElement(FerramentaGrounding, {
      user: user
    });
    if (k === "body-mind-journal") return /*#__PURE__*/React.createElement(FerramentaBodyMind, {
      user: user
    });
    if (k === "wheel-of-life") return /*#__PURE__*/React.createElement(FerramentaWheelOfLife, {
      user: user
    });
    // macro_casais
    if (k === "differentiation-map") return /*#__PURE__*/React.createElement(FerramentaDifferentiation, {
      user: user
    });
    if (k === "triangulation-map") return /*#__PURE__*/React.createElement(FerramentaTriangulation, {
      user: user
    });
    if (k === "compassionate-parenting-journal") return /*#__PURE__*/React.createElement(FerramentaCompassionateParenting, {
      user: user
    });
    if (k === "financial-three-maps") return /*#__PURE__*/React.createElement(FerramentaFinancialMaps, {
      user: user
    });
    if (k === "intimacy-map") return /*#__PURE__*/React.createElement(FerramentaIntimacyMap, {
      user: user
    });
    // macro_relacionamentos
    if (k === "cnv-record") return /*#__PURE__*/React.createElement(FerramentaCNV, {
      user: user
    });
    if (k === "limits-map") return /*#__PURE__*/React.createElement(FerramentaLimitsMap, {
      user: user
    });
    if (k === "mental-load-inventory") return /*#__PURE__*/React.createElement(FerramentaMentalLoad, {
      user: user
    });
    if (k === "conflict-cycle-map") return /*#__PURE__*/React.createElement(FerramentaConflictCycle, {
      user: user
    });
    if (k === "active-listening") return /*#__PURE__*/React.createElement(FerramentaActiveListening, {
      user: user
    });
    // macro_habitos
    if (k === "sleep-ritual") return /*#__PURE__*/React.createElement(FerramentaSleepRitual, {
      user: user
    });
    if (k === "five-minute-rule") return /*#__PURE__*/React.createElement(FerramentaFiveMinute, {
      user: user
    });
    if (k === "habit-stacking") return /*#__PURE__*/React.createElement(FerramentaHabitStacking, {
      user: user
    });
    if (k === "energy-map") return /*#__PURE__*/React.createElement(FerramentaEnergyMap, {
      user: user
    });
    // macro_humor
    if (k === "chain-analysis") return /*#__PURE__*/React.createElement(FerramentaChainAnalysis, {
      user: user
    });
    if (k === "behavioral-activation") return /*#__PURE__*/React.createElement(FerramentaBehavioralActivation, {
      user: user
    });
    if (k === "tipp-sos") return /*#__PURE__*/React.createElement(FerramentaTIPP, {
      user: user
    });
    if (k === "strategic-pause") return /*#__PURE__*/React.createElement(FerramentaStrategicPause, {
      user: user
    });
    if (k === "self-compassion-journal") return /*#__PURE__*/React.createElement(FerramentaSelfCompassion, {
      user: user
    });

    // Fallback: mostra conteúdo dos campos passos e objetivo para ferramentas sem componente interativo
    if (recurso.passos || recurso.objetivo) return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "4px 0"
      }
    }, recurso.objetivo && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--purple-soft)",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 20,
        border: "1px solid #e9d5ff"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 12,
        color: "var(--purple)",
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }
    }, "\uD83C\uDFAF Objetivo Terap\xEAutico"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "#3d006a",
        lineHeight: 1.7
      }
    }, recurso.objetivo)), recurso.passos && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 12,
        color: "var(--text-muted)",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }
    }, "\uD83D\uDCCB Passo a Passo"), recurso.passos.split(/(?=\d+\.)/).filter(Boolean).map((passo, i) => {
      const linhas = passo.trim().split("\n");
      const titulo = linhas[0];
      const corpo = linhas.slice(1).join("\n").trim();
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          background: "white",
          border: "1px solid var(--gray-100)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 10,
          borderLeft: "3px solid var(--purple)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 13,
          color: "var(--purple)",
          marginBottom: corpo ? 6 : 0
        }
      }, titulo), corpo && /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap"
        }
      }, corpo));
    })));

    // macro_compulsao
    if (k === "rastreamento-compulsao-sexual") return /*#__PURE__*/React.createElement(FerramentaRastreamentoCompulsao, {
      user: user
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: 40,
        color: "#6b7280"
      }
    }, "Ferramenta n\xE3o configurada.");
  }
  const EMOJIS = {
    relaxamento: "💨",
    tcc: "🧠",
    avaliacao: "📋",
    musicoterapia: "🎵",
    outro: "🔧"
  };
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
    "diario-terapeutico": "📓",
    "rastreamento-compulsao-sexual": "🔒"
  };
  const iconeRecurso = ICONES_FERRAMENTA?.[recurso.formularioKey] || EMOJIS[recurso.categoria] || "🔧";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      marginBottom: 16,
      padding: "8px 12px"
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 16
  }), " Voltar para Recursos"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f9f5ff",
      border: "1px solid #e9d5ff",
      borderRadius: 8,
      padding: "10px 16px",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12,
      color: "#7c3aed"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "eye",
    size: 14
  }), " ", /*#__PURE__*/React.createElement("strong", null, "Visualiza\xE7\xE3o do paciente"), " \u2014 assim a ferramenta aparecer\xE1 na \xE1rea do paciente"), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 16,
      paddingBottom: 16,
      borderBottom: "1px solid #f3f4f6"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 52,
      height: 52,
      borderRadius: 12,
      background: "var(--purple-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontSize: 26
    }
  }, iconeRecurso), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600
    }
  }, recurso.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#6b7280",
      marginTop: 4
    }
  }, recurso.descricao), recurso.mediaUrl && /*#__PURE__*/React.createElement("a", {
    href: recurso.mediaUrl,
    target: "_blank",
    rel: "noreferrer",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
      padding: "6px 14px",
      borderRadius: 20,
      background: "var(--purple-soft)",
      color: "var(--purple)",
      fontSize: 12,
      fontWeight: 600,
      textDecoration: "none",
      border: "1px solid #e9d5ff"
    }
  }, "\u25B6 Ouvir / Assistir"))), renderFerramenta()));
}

// ── Protocolo de Terapia de Casais ──────────────────────────────────────────
const PROTOCOLO_CASAIS = [{
  stage: 0,
  titulo: "Diagnóstico Inicial de Casal",
  subtitulo: "Avaliação inicial do bem-estar conjugal antes da jornada",
  emoji: "🔍",
  cor: "#7c3aed",
  bg: "#f5f3ff",
  atividades: [{
    id: "inventario-bem-estar",
    titulo: "Inventário de Bem-Estar de Casais",
    desc: "42 questões sobre comunicação, resolução de conflitos, intimidade emocional, satisfação sexual e cooperação"
  }, {
    id: "roda-vida-relacionamento",
    titulo: "Roda da Vida do Relacionamento",
    desc: "Avalie 8 dimensões do relacionamento em formato visual"
  }, {
    id: "3-metas",
    titulo: "Nossas 3 Metas do Relacionamento",
    desc: "Definam juntos as 3 principais metas terapêuticas"
  }, {
    id: "quem-sou",
    titulo: "Quem Eu Sou no Relacionamento",
    desc: "Reflexão individual sobre identidade no relacionamento"
  }, {
    id: "o-que-quero",
    titulo: "O Que Eu Quero e Não Quero Mais",
    desc: "Mapeamento de expectativas e limites"
  }]
}, {
  stage: 1,
  titulo: "Reconexão e Segurança Emocional",
  subtitulo: "Reduzir defensividade e aumentar conexão emocional",
  emoji: "💚",
  cor: "#059669",
  bg: "#d1fae5",
  atividades: [{
    id: "detalhes-dia",
    titulo: "Detalhes do Dia a Dia",
    desc: "Compartilhem os pequenos detalhes que fazem diferença na conexão diária"
  }, {
    id: "plano-casal-ocupado",
    titulo: "Plano de Ação para um Casal Ocupado Demais",
    desc: "Estratégias práticas para manter conexão na correria"
  }]
}, {
  stage: 2,
  titulo: "Identidade e Vínculo do Casal",
  subtitulo: "Resgatar identidade afetiva e visão compartilhada",
  emoji: "💜",
  cor: "#7c3aed",
  bg: "#ede9fe",
  atividades: [{
    id: "renovando-votos",
    titulo: "Renovando os Votos",
    desc: "Recontem a história do casal e renovem seus compromissos através de 5 narrativas guiadas"
  }]
}, {
  stage: 3,
  titulo: "Conceitualização Cognitiva",
  subtitulo: "Identificar padrões cognitivos e crenças relacionais",
  emoji: "🧠",
  cor: "#0891b2",
  bg: "#e0f2fe",
  atividades: [{
    id: "mapa-cognitivo",
    titulo: "Mapa Cognitivo do Relacionamento",
    desc: "Identificar pensamentos automáticos, crenças e padrões que afetam o relacionamento"
  }]
}, {
  stage: 4,
  titulo: "Reestruturação Relacional",
  subtitulo: "Criar novos padrões emocionais e comportamentais",
  emoji: "🌱",
  cor: "#16a34a",
  bg: "#dcfce7",
  atividades: [{
    id: "novos-padroes",
    titulo: "Novos Padrões Relacionais",
    desc: "Desenvolver e praticar novos comportamentos e respostas emocionais"
  }]
}];
const CHECKIN_SEMANAL = ["Hoje eu me sinto conectado(a) com meu parceiro(a)", "Sinto que fui ouvido(a) esta semana", "Expressamos afeto um pelo outro", "Resolvemos conflitos de forma saudável", "Dedicamos tempo de qualidade juntos", "Sinto que somos uma equipe", "Me sinto seguro(a) emocionalmente com meu parceiro(a)"];

// ── Inventário de Bem-Estar de Casais (42 questões) ──
const INVENTARIO_QUESTOES = [{
  n: 1,
  texto: "Com que frequência você e seu parceiro(a) trabalham juntos para alcançar objetivos comuns?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 2,
  texto: "Como você descreveria a frequência com que você e seu parceiro(a) têm conversas abertas e honestas sobre suas preocupações e problemas?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 3,
  texto: "Como você avalia sua satisfação geral com a vida sexual em seu relacionamento?",
  opcoes: ["Muito insatisfeito(a)", "Insatisfeito(a)", "Neutro(a)", "Satisfeito(a)", "Muito satisfeito(a)"]
}, {
  n: 4,
  texto: "Quando você e seu parceiro(a) enfrentam um desentendimento, com que frequência vocês conseguem encontrar uma solução que seja satisfatória para ambos?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 5,
  texto: "Em geral, como você avalia a qualidade das discussões que você e seu parceiro(a) têm sobre assuntos importantes?",
  opcoes: ["Muito insatisfatória", "Insatisfatória", "Neutra", "Satisfatória", "Muito satisfatória"]
}, {
  n: 6,
  texto: "Com que frequência você e seu parceiro(a) se comunicam sobre suas necessidades e desejos sexuais?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 7,
  texto: "Com que frequência você e seu parceiro(a) compartilham seus sentimentos mais profundos um com o outro?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 8,
  texto: "Como você avalia a capacidade de seu relacionamento em resolver conflitos de forma efetiva?",
  opcoes: ["Muito insatisfatória", "Insatisfatória", "Neutra", "Satisfatória", "Muito satisfatória"]
}, {
  n: 9,
  texto: "Como você descreveria a qualidade de suas relações sexuais em seu relacionamento?",
  opcoes: ["Muito insatisfatória", "Insatisfatória", "Neutra", "Satisfatória", "Muito satisfatória"]
}, {
  n: 10,
  texto: "Como você descreveria a capacidade de seu relacionamento em criar um ambiente emocionalmente seguro e acolhedor?",
  opcoes: ["Muito insatisfatória", "Insatisfatória", "Neutra", "Satisfatória", "Muito satisfatória"]
}, {
  n: 11,
  texto: "Quando você e seu parceiro(a) discordam sobre algo, com que frequência vocês conseguem resolver o conflito de maneira efetiva?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 12,
  texto: "Como você se sente em relação à habilidade de seu parceiro(a) de expressar seus sentimentos de forma clara e compreensível durante uma conversa?",
  opcoes: ["Muito insatisfeito(a)", "Insatisfeito(a)", "Neutro(a)", "Satisfeito(a)", "Muito satisfeito(a)"]
}, {
  n: 13,
  texto: "Com que frequência você e seu parceiro(a) encontram soluções diferentes para resolver problemas ou desafios em seu relacionamento?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 14,
  texto: "Com que frequência você e seu parceiro(a) conseguem discutir um problema sem que isso afete negativamente o relacionamento?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 15,
  texto: "Com que frequência você e seu parceiro(a) experimentam momentos íntimos e prazerosos juntos?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 16,
  texto: "Como você avalia a disposição de seu parceiro(a) para ajudá-lo(a) nas tarefas domésticas e responsabilidades compartilhadas?",
  opcoes: ["Muito insatisfatória", "Insatisfatória", "Neutra", "Satisfatória", "Muito satisfatória"]
}, {
  n: 17,
  texto: "Quando você está passando por momentos difíceis, com quem você costuma compartilhar seus sentimentos primeiro?",
  opcoes: ["Com ninguém", "Com um membro da família", "Com um amigo(a)", "Com meu parceiro(a)", "Com um profissional especializado(a)"]
}, {
  n: 18,
  texto: "Quando ocorre um desacordo entre vocês, como vocês costumam resolver a situação?",
  opcoes: ["Ignorando o problema", "Gritando ou discutindo", "Evitando o assunto", "Argumentando meu ponto de vista", "Conversando e buscando uma solução"]
}, {
  n: 19,
  texto: "Quando você compartilha suas opiniões com seu parceiro(a), com que frequência você se sente ouvido(a) e compreendido(a)?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 20,
  texto: "Com que frequência você e seu parceiro(a) reservam um tempo específico para conversar sobre questões importantes ou preocupações relacionadas ao relacionamento?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 21,
  texto: "Você se sente à vontade para expressar suas preferências sexuais e fantasias com seu parceiro(a)?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 22,
  texto: "Como você se sente em relação à capacidade de seu parceiro(a) de compreender suas emoções e oferecer apoio quando você precisa?",
  opcoes: ["Muito insatisfeito(a)", "Insatisfeito(a)", "Neutro(a)", "Satisfeito(a)", "Muito satisfeito(a)"]
}, {
  n: 23,
  texto: "Vocês conseguem chegar a um consenso sobre questões importantes, mesmo quando têm opiniões diferentes?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 24,
  texto: "Com que frequência você e seu parceiro(a) dedicam tempo para se conectar emocionalmente, sem distrações externas?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 25,
  texto: "Como você avalia a capacidade de seu relacionamento em superar desafios ou dificuldades na vida sexual?",
  opcoes: ["Muito insatisfatória", "Insatisfatória", "Neutra", "Satisfatória", "Muito satisfatória"]
}, {
  n: 26,
  texto: "Você e seu parceiro(a) costumam discutir e tomar decisões importantes juntos?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 27,
  texto: "Você e seu parceiro(a) estão satisfeitos com a frequência das relações sexuais em seu relacionamento?",
  opcoes: ["Muito insatisfeito(a)", "Insatisfeito(a)", "Neutro(a)", "Satisfeito(a)", "Muito satisfeito(a)"]
}, {
  n: 28,
  texto: "Com que frequência vocês conseguem manter o respeito mútuo mesmo durante uma discussão acalorada?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 29,
  texto: "Você se sente à vontade para expressar suas emoções, mesmo as mais vulneráveis, com seu parceiro(a)?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 30,
  texto: "Com que frequência você e seu parceiro(a) compartilham momentos de diversão e risadas juntos?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 31,
  texto: "Quando um conflito é resolvido, como vocês se sentem em relação ao processo de resolução?",
  opcoes: ["Muito insatisfeito(a)", "Insatisfeito(a)", "Neutro(a)", "Satisfeito(a)", "Muito satisfeito(a)"]
}, {
  n: 32,
  texto: "Como você avalia a capacidade de seu parceiro(a) de fazer você rir e levantar seu ânimo quando necessário?",
  opcoes: ["Muito insatisfatória", "Insatisfatória", "Neutra", "Satisfatória", "Muito satisfatória"]
}, {
  n: 33,
  texto: "Você e seu parceiro(a) têm interesses em comum que os levam a participar de atividades recreativas juntos?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 34,
  texto: "Como você descreveria a importância do humor em seu relacionamento?",
  opcoes: ["Muito pouco importante", "Pouco importante", "Neutro(a)", "Importante", "Muito importante"]
}, {
  n: 35,
  texto: "Como você descreveria a profundidade do vínculo emocional entre você e seu parceiro(a)?",
  opcoes: ["Muito superficial", "Superficial", "Moderado", "Profundo", "Muito profundo"]
}, {
  n: 36,
  texto: "Com que frequência você e seu parceiro(a) compartilham momentos de descontração e relaxamento juntos?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 37,
  texto: "Com que frequência você e seu parceiro(a) se apoiam mutuamente para lidar com o estresse e os desafios da vida?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 38,
  texto: "Você se sente valorizado(a) e reconhecido(a) pelo seu parceiro(a) em suas contribuições para o relacionamento?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 39,
  texto: "Como você descreveria a igualdade de contribuição entre você e seu parceiro(a) nos compromissos financeiros e nas despesas domésticas?",
  opcoes: ["Muito desigual", "Desigual", "Neutra", "Igual", "Muito igual"]
}, {
  n: 40,
  texto: "Você se sente confortável para expressar seu senso de humor com seu parceiro(a)?",
  opcoes: ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
}, {
  n: 41,
  texto: "Como você avalia a capacidade de seu relacionamento em resolver conflitos de forma colaborativa, buscando soluções que beneficiem ambos os parceiros?",
  opcoes: ["Muito insatisfatória", "Insatisfatória", "Neutra", "Satisfatória", "Muito satisfatória"]
}, {
  n: 42,
  texto: "Como você avalia a capacidade de seu relacionamento em lidar com situações difíceis com leveza e humor?",
  opcoes: ["Muito insatisfatória", "Insatisfatória", "Neutra", "Satisfatória", "Muito satisfatória"]
}];
const INVENTARIO_CATEGORIAS = [{
  label: "Comunicação Eficaz",
  cor: "#6366f1",
  questoes: [2, 5, 11, 12, 13, 19, 20]
}, {
  label: "Resolução de Conflitos",
  cor: "#f59e0b",
  questoes: [4, 8, 14, 18, 23, 28, 31]
}, {
  label: "Intimidade Emocional",
  cor: "#ec4899",
  questoes: [7, 10, 17, 22, 24, 29, 35]
}, {
  label: "Satisfação Sexual",
  cor: "#dc2626",
  questoes: [3, 6, 9, 15, 21, 25, 27]
}, {
  label: "Cooperação e Colaboração",
  cor: "#16a34a",
  questoes: [1, 16, 26, 37, 38, 39, 41]
}, {
  label: "Senso de Humor e Lazer",
  cor: "#0891b2",
  questoes: [30, 32, 33, 34, 36, 40, 42]
}];
function InventarioBemEstarCasal({
  onVoltar
}) {
  const [respostas, setRespostas] = useState({});
  const [pagina, setPagina] = useState(0); // 0=instrucoes, 1-7=grupos de 6q, 8=resultado
  const [salvando, setSalvando] = useState(false);
  const POR_PAG = 6;
  const totalPaginas = Math.ceil(INVENTARIO_QUESTOES.length / POR_PAG);
  function responder(n, val) {
    setRespostas(r => ({
      ...r,
      [n]: val
    }));
  }
  function calcular() {
    return INVENTARIO_CATEGORIAS.map(cat => {
      const soma = cat.questoes.reduce((acc, q) => acc + (respostas[q] || 0), 0);
      const pct = Math.round((soma - 7) / 28 * 100);
      return {
        ...cat,
        soma,
        pct: Math.max(0, pct)
      };
    });
  }
  const questoesPagina = INVENTARIO_QUESTOES.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);
  const totalRespondidas = Object.keys(respostas).length;
  const completo = totalRespondidas === 42;

  // Tela de instruções
  if (pagina === 0) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 12
    }
  }, "\uD83D\uDC91"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Invent\xE1rio de Bem-Estar de Casais"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16,
      lineHeight: 1.7,
      maxWidth: 480,
      margin: "0 auto 16px"
    }
  }, "Este question\xE1rio avalia 6 dimens\xF5es importantes do relacionamento: Comunica\xE7\xE3o, Resolu\xE7\xE3o de Conflitos, Intimidade Emocional, Satisfa\xE7\xE3o Sexual, Coopera\xE7\xE3o e Senso de Humor.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("strong", null, "42 quest\xF5es"), " \xB7 Responda com honestidade \xB7 N\xE3o h\xE1 respostas certas ou erradas", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", null, "Seja r\xE1pido, n\xE3o pondere!")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      fontSize: 15,
      padding: "12px 32px"
    },
    onClick: () => setPagina(1)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: 16
  }), " Iniciar Invent\xE1rio"));

  // Tela de resultado
  if (pagina === totalPaginas + 1) {
    const resultados = calcular();
    const totalGeral = resultados.reduce((a, r) => a + r.soma, 0);
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: 24
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 40,
        marginBottom: 8
      }
    }, "\uD83D\uDCCA"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 20,
        fontWeight: 600
      }
    }, "Resultado do Invent\xE1rio"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginTop: 4
      }
    }, "Pontua\xE7\xE3o total: ", totalGeral, " / 252")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14,
        marginBottom: 24
      }
    }, resultados.map(cat => /*#__PURE__*/React.createElement("div", {
      key: cat.label
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: cat.cor
      }
    }, cat.label), /*#__PURE__*/React.createElement("span", null, cat.soma, " / 35")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f3f4f6",
        borderRadius: 20,
        height: 12,
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: cat.pct + "%",
        height: "100%",
        background: cat.cor,
        borderRadius: 20,
        transition: "width 1s ease"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 10,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, /*#__PURE__*/React.createElement("span", null, "Baixo (7)"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: cat.cor
      }
    }, cat.pct, "%"), /*#__PURE__*/React.createElement("span", null, "Alto (35)"))))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f9fafb",
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        fontSize: 12,
        color: "var(--gray-600)",
        lineHeight: 1.7
      }
    }, /*#__PURE__*/React.createElement("strong", null, "Como interpretar:"), " Pontua\xE7\xF5es mais altas (pr\xF3ximas de 35) indicam maior satisfa\xE7\xE3o naquela dimens\xE3o. Pontua\xE7\xF5es baixas (pr\xF3ximas de 7) indicam \xE1reas que merecem aten\xE7\xE3o terap\xEAutica."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        flex: 1
      },
      onClick: () => {
        setRespostas({});
        setPagina(0);
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "rotate-ccw",
      size: 15
    }), " Refazer"), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      style: {
        flex: 1
      },
      onClick: onVoltar
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 15
    }), " Concluir")));
  }

  // Páginas de questões
  const progresso = Math.round(totalRespondidas / 42 * 100);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", null, "Quest\xF5es ", (pagina - 1) * POR_PAG + 1, "\u2013", Math.min(pagina * POR_PAG, 42), " de 42"), /*#__PURE__*/React.createElement("span", null, totalRespondidas, " respondidas \xB7 ", progresso, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#f3f4f6",
      borderRadius: 20,
      height: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: progresso + "%",
      height: "100%",
      background: "var(--purple)",
      borderRadius: 20,
      transition: "width .3s"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, questoesPagina.map(q => /*#__PURE__*/React.createElement("div", {
    key: q.n,
    style: {
      background: "#fafafa",
      borderRadius: 10,
      padding: 16,
      border: "1px solid var(--gray-100)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 12,
      lineHeight: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--purple)",
      marginRight: 6
    }
  }, q.n, "."), q.texto), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, q.opcoes.map((op, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => responder(q.n, i + 1),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 12px",
      borderRadius: 8,
      border: `1.5px solid ${respostas[q.n] === i + 1 ? "var(--purple)" : "var(--gray-200)"}`,
      background: respostas[q.n] === i + 1 ? "var(--purple-bg)" : "white",
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "inherit",
      fontSize: 13,
      color: respostas[q.n] === i + 1 ? "var(--purple)" : "var(--gray-700)",
      fontWeight: respostas[q.n] === i + 1 ? 600 : 400,
      transition: "all .15s"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: "50%",
      flexShrink: 0,
      border: `2px solid ${respostas[q.n] === i + 1 ? "var(--purple)" : "var(--gray-300)"}`,
      background: respostas[q.n] === i + 1 ? "var(--purple)" : "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, respostas[q.n] === i + 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "white"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500,
      fontSize: 11,
      color: "var(--gray-400)",
      minWidth: 16
    }
  }, String.fromCharCode(97 + i), ")"), op)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setPagina(p => p - 1),
    disabled: pagina === 1
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-left",
    size: 15
  }), " Anterior"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), pagina < totalPaginas ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setPagina(p => p + 1)
  }, "Pr\xF3ximo ", /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 15
  })) : /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    onClick: () => setPagina(totalPaginas + 1),
    disabled: !completo,
    style: {
      opacity: completo ? 1 : 0.5
    }
  }, completo ? "Ver Resultado" : `Faltam ${42 - totalRespondidas}`, " ", /*#__PURE__*/React.createElement(Icon, {
    name: "bar-chart-2",
    size: 15
  }))));
}

// ── Admin: Roda da Vida ──
const RODA_DIMS_ADM = ["Comunicação", "Família", "Sexualidade", "Estresse e Pressão", "Divisão", "Ciúmes", "Espiritualidade", "Diferenças e Conflitos", "Estabilidade Financeira", "Rel. de Poder", "Mudanças", "Expectativas e Equilíbrio"];
function AdminRodaVida({
  onVoltar
}) {
  const [valores, setValores] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId: "admin",
        casalId: "admin",
        atividadeId: "roda-vida-relacionamento",
        respostas: valores,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch (e) {
      alert("Erro ao salvar.");
    }
    setSalvando(false);
  }
  function RodaSVG() {
    const n = RODA_DIMS_ADM.length,
      cx = 120,
      cy = 120,
      r = 90;
    const pontos = RODA_DIMS_ADM.map((_, i) => {
      const ang = i / n * 2 * Math.PI - Math.PI / 2;
      const v = (valores[RODA_DIMS_ADM[i]] || 0) / 10;
      return [cx + r * v * Math.cos(ang), cy + r * v * Math.sin(ang)];
    });
    const pts = pontos.map(p => p.join(",")).join(" ");
    const grades = [2, 4, 6, 8, 10].map(g => {
      const gpts = RODA_DIMS_ADM.map((_, i) => {
        const ang = i / n * 2 * Math.PI - Math.PI / 2;
        return [cx + r * (g / 10) * Math.cos(ang), cy + r * (g / 10) * Math.sin(ang)].join(",");
      }).join(" ");
      return /*#__PURE__*/React.createElement("polygon", {
        key: g,
        points: gpts,
        fill: "none",
        stroke: "#e5e7eb",
        strokeWidth: "0.5"
      });
    });
    const eixos = RODA_DIMS_ADM.map((_, i) => {
      const ang = i / n * 2 * Math.PI - Math.PI / 2;
      return /*#__PURE__*/React.createElement("line", {
        key: i,
        x1: cx,
        y1: cy,
        x2: cx + r * Math.cos(ang),
        y2: cy + r * Math.sin(ang),
        stroke: "#e5e7eb",
        strokeWidth: "0.5"
      });
    });
    const labels = RODA_DIMS_ADM.map((d, i) => {
      const ang = i / n * 2 * Math.PI - Math.PI / 2;
      return /*#__PURE__*/React.createElement("text", {
        key: i,
        x: cx + (r + 14) * Math.cos(ang),
        y: cy + (r + 14) * Math.sin(ang),
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: "5.5",
        fill: "#6b7280"
      }, d);
    });
    return /*#__PURE__*/React.createElement("svg", {
      width: "240",
      height: "240",
      viewBox: "0 0 240 240",
      style: {
        display: "block",
        margin: "0 auto 16px"
      }
    }, grades, eixos, /*#__PURE__*/React.createElement("polygon", {
      points: pts,
      fill: "#7B00C440",
      stroke: "#7B00C4",
      strokeWidth: "1.5"
    }), labels);
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16,
      lineHeight: 1.6
    }
  }, "Avalie cada dimens\xE3o de 0 a 10. ", /*#__PURE__*/React.createElement("strong", null, "0"), " = nenhuma tens\xE3o \xB7 ", /*#__PURE__*/React.createElement("strong", null, "10"), " = tens\xE3o m\xE1xima."), Object.keys(valores).length > 0 && /*#__PURE__*/React.createElement(RodaSVG, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 16
    }
  }, RODA_DIMS_ADM.map(dim => /*#__PURE__*/React.createElement("div", {
    key: dim
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      marginBottom: 3
    }
  }, dim), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "0",
    max: "10",
    step: "1",
    value: valores[dim] || 0,
    onChange: e => setValores(v => ({
      ...v,
      [dim]: parseInt(e.target.value)
    })),
    style: {
      flex: 1,
      accentColor: "var(--purple)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      textAlign: "center",
      fontWeight: 700,
      fontSize: 12,
      color: "var(--purple)"
    }
  }, valores[dim] || 0))))), salvo && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#d1fae5",
      borderRadius: 8,
      padding: "8px 12px",
      marginBottom: 12,
      fontSize: 13,
      color: "#065f46"
    }
  }, "\u2713 Salvo com sucesso!"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%"
    },
    onClick: salvar,
    disabled: salvando
  }, salvando ? "Salvando..." : "💾 Salvar Roda da Vida"));
}

// ── Admin: Nossas 3 Metas ──
function AdminMetas({
  onVoltar
}) {
  const [metas, setMetas] = useState([{
    titulo: "",
    indicador: "",
    dataInicio: ""
  }, {
    titulo: "",
    indicador: "",
    dataInicio: ""
  }, {
    titulo: "",
    indicador: "",
    dataInicio: ""
  }]);
  const [metasSalvas, setMetasSalvas] = useState([]);
  const [evolucoes, setEvolucoes] = useState({});
  const [novaEv, setNovaEv] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [aba, setAba] = useState("definir"); // definir | evolucao

  useEffect(() => {
    db.collection("clinica_metas_casal").where("tipo", "==", "admin").orderBy("createdAt", "desc").limit(3).onSnapshot(s => setMetasSalvas(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
  }, []);
  useEffect(() => {
    metasSalvas.forEach(m => {
      db.collection("clinica_metas_casal").doc(m.id).collection("evolucoes").orderBy("data", "asc").onSnapshot(s => setEvolucoes(ev => ({
        ...ev,
        [m.id]: s.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      })), () => {});
    });
  }, [metasSalvas]);
  async function salvarMetas() {
    const validas = metas.filter(m => m.titulo.trim());
    if (!validas.length) {
      alert("Digite pelo menos 1 meta.");
      return;
    }
    setSalvando(true);
    try {
      // Arquiva metas antigas
      const antigas = await db.collection("clinica_metas_casal").where("tipo", "==", "admin").where("status", "==", "ativa").get();
      const batch = db.batch();
      antigas.docs.forEach(d => batch.update(d.ref, {
        status: "arquivada"
      }));
      await batch.commit();
      // Cria novas
      for (const m of validas) {
        await db.collection("clinica_metas_casal").add({
          ...m,
          tipo: "admin",
          status: "ativa",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      setSalvo(true);
      setAba("evolucao");
    } catch (e) {
      alert("Erro ao salvar.");
    }
    setSalvando(false);
  }
  async function registrarEvolucao(metaId) {
    const ev = novaEv[metaId];
    if (!ev?.nota || !ev?.data) {
      alert("Preencha nota e data.");
      return;
    }
    await db.collection("clinica_metas_casal").doc(metaId).collection("evolucoes").add({
      nota: parseFloat(ev.nota),
      data: ev.data,
      obs: ev.obs || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setNovaEv(n => ({
      ...n,
      [metaId]: {
        nota: "",
        data: new Date().toISOString().slice(0, 10),
        obs: ""
      }
    }));
  }
  function GraficoLinha({
    evs
  }) {
    if (!evs || evs.length < 2) return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--text-muted)",
        textAlign: "center",
        padding: 8
      }
    }, "Registre pelo menos 2 evolu\xE7\xF5es para ver o gr\xE1fico");
    const w = 260,
      h = 80,
      pad = 20;
    const notas = evs.map(e => e.nota);
    const min = 0,
      max = 10;
    const pts = evs.map((e, i) => {
      const x = pad + i / (evs.length - 1) * (w - 2 * pad);
      const y = h - pad - (e.nota - min) / (max - min) * (h - 2 * pad);
      return [x, y];
    });
    const path = "M" + pts.map(p => p.join(",")).join(" L");
    return /*#__PURE__*/React.createElement("svg", {
      width: w,
      height: h,
      style: {
        display: "block",
        margin: "8px auto"
      }
    }, [0, 2, 4, 6, 8, 10].map(v => {
      const y = h - pad - (v - min) / (max - min) * (h - 2 * pad);
      return /*#__PURE__*/React.createElement("g", {
        key: v
      }, /*#__PURE__*/React.createElement("line", {
        x1: pad,
        y1: y,
        x2: w - pad,
        y2: y,
        stroke: "#f3f4f6",
        strokeWidth: "1"
      }), /*#__PURE__*/React.createElement("text", {
        x: pad - 4,
        y: y,
        textAnchor: "end",
        fontSize: "7",
        fill: "#9ca3af",
        dominantBaseline: "middle"
      }, v));
    }), /*#__PURE__*/React.createElement("path", {
      d: path,
      fill: "none",
      stroke: "#7B00C4",
      strokeWidth: "2"
    }), pts.map((p, i) => /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("circle", {
      cx: p[0],
      cy: p[1],
      r: "3",
      fill: "#7B00C4"
    }), /*#__PURE__*/React.createElement("text", {
      x: p[0],
      y: p[1] - 6,
      textAnchor: "middle",
      fontSize: "7",
      fill: "#7B00C4",
      fontWeight: "bold"
    }, evs[i].nota))));
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      borderBottom: "1px solid var(--gray-200)",
      marginBottom: 16
    }
  }, [{
    id: "definir",
    label: "📋 Definir Metas"
  }, {
    id: "evolucao",
    label: "📈 Registrar Evolução"
  }].map(a => /*#__PURE__*/React.createElement("button", {
    key: a.id,
    onClick: () => setAba(a.id),
    style: {
      padding: "10px 16px",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit",
      fontWeight: aba === a.id ? 700 : 400,
      borderBottom: aba === a.id ? "2px solid var(--purple)" : "2px solid transparent",
      color: aba === a.id ? "var(--purple)" : "var(--text-muted)"
    }
  }, a.label))), aba === "definir" && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Defina metas quantific\xE1veis com indicador de progresso. Cada c\xF4njuge define as suas pelo portal."), [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: "#fafafa",
      borderRadius: 10,
      padding: 14,
      marginBottom: 12,
      border: "1px solid var(--gray-100)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "var(--purple)",
      marginBottom: 10
    }
  }, "Meta ", i + 1), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: metas[i].titulo,
    onChange: e => {
      const n = [...metas];
      n[i] = {
        ...n[i],
        titulo: e.target.value
      };
      setMetas(n);
    },
    placeholder: "Ex: Melhorar a comunica\xE7\xE3o di\xE1ria"
  }), /*#__PURE__*/React.createElement("input", {
    className: "form-input",
    value: metas[i].indicador,
    onChange: e => {
      const n = [...metas];
      n[i] = {
        ...n[i],
        indicador: e.target.value
      };
      setMetas(n);
    },
    placeholder: "Indicador quantific\xE1vel: Ex: De 3 para 8 na escala de comunica\xE7\xE3o"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap"
    }
  }, "Data de in\xEDcio:"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    className: "form-input",
    value: metas[i].dataInicio,
    onChange: e => {
      const n = [...metas];
      n[i] = {
        ...n[i],
        dataInicio: e.target.value
      };
      setMetas(n);
    },
    style: {
      flex: 1
    }
  }))))), salvo && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#d1fae5",
      borderRadius: 8,
      padding: "8px 12px",
      marginBottom: 12,
      fontSize: 13,
      color: "#065f46"
    }
  }, "\u2713 Metas salvas! Aparecem no dashboard do casal."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%"
    },
    onClick: salvarMetas,
    disabled: salvando
  }, salvando ? "Salvando..." : "💾 Salvar metas")), aba === "evolucao" && /*#__PURE__*/React.createElement("div", null, metasSalvas.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 24,
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Defina as metas primeiro na aba \"Definir Metas\".") : metasSalvas.map(m => {
    const evs = evolucoes[m.id] || [];
    const ev = novaEv[m.id] || {
      nota: "",
      data: new Date().toISOString().slice(0, 10),
      obs: ""
    };
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      style: {
        background: "#fafafa",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        border: "1px solid var(--gray-100)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "var(--purple)",
        marginBottom: 2
      }
    }, m.titulo), m.indicador && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginBottom: 10
      }
    }, "\uD83C\uDFAF ", m.indicador), /*#__PURE__*/React.createElement(GraficoLinha, {
      evs: evs
    }), evs.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-muted)",
        marginBottom: 6
      }
    }, "HIST\xD3RICO"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 4
      }
    }, [...evs].reverse().slice(0, 5).map(e => /*#__PURE__*/React.createElement("div", {
      key: e.id,
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12,
        padding: "5px 10px",
        borderRadius: 6,
        background: "white",
        border: "1px solid var(--gray-100)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text-muted)"
      }
    }, e.data?.split("-").reverse().join("/")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: "var(--purple)",
        fontSize: 14
      }
    }, e.nota, "/10"), e.obs && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--text-muted)",
        fontSize: 11,
        maxWidth: 200,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, e.obs))))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: "white",
        borderRadius: 8,
        padding: 12,
        border: "1px solid var(--gray-200)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 8
      }
    }, "Registrar nova nota"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        display: "block",
        marginBottom: 4
      }
    }, "Nota (0-10)"), /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "0",
      max: "10",
      step: "0.5",
      className: "form-input",
      value: ev.nota,
      onChange: e => setNovaEv(n => ({
        ...n,
        [m.id]: {
          ...ev,
          nota: e.target.value
        }
      })),
      placeholder: "0-10"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        display: "block",
        marginBottom: 4
      }
    }, "Data"), /*#__PURE__*/React.createElement("input", {
      type: "date",
      className: "form-input",
      value: ev.data,
      onChange: e => setNovaEv(n => ({
        ...n,
        [m.id]: {
          ...ev,
          data: e.target.value
        }
      }))
    }))), /*#__PURE__*/React.createElement("input", {
      className: "form-input",
      value: ev.obs || "",
      onChange: e => setNovaEv(n => ({
        ...n,
        [m.id]: {
          ...ev,
          obs: e.target.value
        }
      })),
      placeholder: "Observa\xE7\xE3o (opcional)",
      style: {
        marginBottom: 8
      }
    }), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      style: {
        width: "100%",
        fontSize: 12
      },
      onClick: () => registrarEvolucao(m.id)
    }, "+ Registrar nota")));
  })));
}

// ── Admin: Quem Eu Sou ──
function AdminQuemSou({
  onVoltar
}) {
  const QUADRANTES = [{
    id: "sou",
    label: "SOU",
    desc: "Características que possuo e não me incomodam.",
    cor: "#7B00C4",
    bg: "#f5f3ff"
  }, {
    id: "nao_mas",
    label: "NÃO SOU, MAS GOSTARIA",
    desc: "Características que não possuo e me fazem falta.",
    cor: "#0891b2",
    bg: "#e0f2fe"
  }, {
    id: "sou_nao",
    label: "SOU, MAS NÃO GOSTARIA",
    desc: "Características que possuo mas me incomodam.",
    cor: "#d97706",
    bg: "#fef3c7"
  }, {
    id: "nao_sou",
    label: "NÃO SOU",
    desc: "Características que não possuo e não me incomodam.",
    cor: "#6b7280",
    bg: "#f3f4f6"
  }];
  const [campos, setCampos] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId: "admin",
        casalId: "admin",
        atividadeId: "quem-sou",
        respostas: campos,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch (e) {
      alert("Erro ao salvar.");
    }
    setSalvando(false);
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Reflex\xE3o individual sobre identidade no relacionamento. Cada c\xF4njuge preenche pelo pr\xF3prio login no portal."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 16
    }
  }, QUADRANTES.map(q => /*#__PURE__*/React.createElement("div", {
    key: q.id,
    style: {
      background: q.bg,
      borderRadius: 10,
      padding: 12,
      border: `1px solid ${q.cor}30`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 11,
      color: q.cor,
      marginBottom: 3
    }
  }, q.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)",
      marginBottom: 8,
      lineHeight: 1.4
    }
  }, q.desc), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 4,
    value: campos[q.id] || "",
    onChange: e => setCampos(c => ({
      ...c,
      [q.id]: e.target.value
    })),
    placeholder: "Digite aqui...",
    style: {
      fontSize: 12,
      resize: "none",
      background: "white"
    }
  })))), salvo && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#d1fae5",
      borderRadius: 8,
      padding: "8px 12px",
      marginBottom: 12,
      fontSize: 13,
      color: "#065f46"
    }
  }, "\u2713 Salvo!"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%"
    },
    onClick: salvar,
    disabled: salvando
  }, salvando ? "Salvando..." : "💾 Salvar"));
}

// ── Admin: O Que Eu Quero e Não Quero Mais ──
function AdminOQueQuero({
  onVoltar
}) {
  const CAMPOS = [{
    id: "quero_sit",
    label: "QUERO +  Situações",
    desc: "Situações que gosta e quer que continuem.",
    cor: "#16a34a",
    bg: "#f0fdf4"
  }, {
    id: "quero_val",
    label: "QUERO +  Valores",
    desc: "Situações MUITO IMPORTANTES a manter.",
    cor: "#16a34a",
    bg: "#dcfce7"
  }, {
    id: "nquero_sit",
    label: "QUERO −  Situações",
    desc: "Situações que NÃO gosta e quer que parem.",
    cor: "#dc2626",
    bg: "#fef2f2"
  }, {
    id: "nquero_val",
    label: "QUERO −  Valores",
    desc: "Situações MUITO IMPORTANTES a mudar.",
    cor: "#dc2626",
    bg: "#fee2e2"
  }];
  const [campos, setCampos] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId: "admin",
        casalId: "admin",
        atividadeId: "o-que-quero",
        respostas: campos,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch (e) {
      alert("Erro ao salvar.");
    }
    setSalvando(false);
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Mapeamento de expectativas e limites no relacionamento."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 16
    }
  }, CAMPOS.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      background: c.bg,
      borderRadius: 10,
      padding: 12,
      border: `1px solid ${c.cor}30`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 11,
      color: c.cor,
      marginBottom: 3
    }
  }, c.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)",
      marginBottom: 8,
      lineHeight: 1.4
    }
  }, c.desc), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 4,
    value: campos[c.id] || "",
    onChange: e => setCampos(v => ({
      ...v,
      [c.id]: e.target.value
    })),
    placeholder: "Digite aqui...",
    style: {
      fontSize: 12,
      resize: "none",
      background: "white"
    }
  })))), salvo && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#d1fae5",
      borderRadius: 8,
      padding: "8px 12px",
      marginBottom: 12,
      fontSize: 13,
      color: "#065f46"
    }
  }, "\u2713 Salvo!"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%"
    },
    onClick: salvar,
    disabled: salvando
  }, salvando ? "Salvando..." : "💾 Salvar"));
}

// ── Formulário genérico para atividades das etapas ──
const ATIVIDADES_FORMULARIOS = {
  "detalhes-dia": {
    titulo: "Detalhes do Dia a Dia",
    instrucao: "Pequenos gestos que reconstroem a conexão",
    perguntas: ["Que pequeno gesto positivo você fez hoje pelo(a) seu/sua parceiro(a)?", "Como foi a resposta do(a) seu/sua parceiro(a)?", "Como esse gesto te fez sentir?", "O que você gostaria de receber do(a) seu/sua parceiro(a) amanhã?", "Impacto emocional desse momento (0 = nenhum, 10 = muito intenso)"]
  },
  "plano-casal-ocupado": {
    titulo: "Plano de Ação para um Casal Ocupado Demais",
    instrucao: "Reorganizando a conexão na rotina",
    perguntas: ["Quais são os maiores obstáculos para a conexão no dia a dia de vocês?", "Que rituais gostaríamos de criar juntos?", "Qual o momento do dia que podemos reservar só para nós?", "O que admiro no(a) meu/minha parceiro(a) que nunca digo?", "Meu compromisso desta semana com o nosso relacionamento:"]
  },
  "renovando-votos": {
    titulo: "Renovando os Votos",
    instrucao: "Uma jornada de reflexão profunda sobre o relacionamento",
    perguntas: ["Quem éramos no início — Como vocês se conheceram? O que te atraiu nessa pessoa? Que memória do início do relacionamento você ainda guarda com carinho?", "O que construímos juntos — Quais conquistas, momentos e experiências construímos como casal? O que só existiu porque estávamos juntos?", "Sobre meu parceiro(a) — O que você admira profundamente no(a) seu/sua parceiro(a)? Que qualidades fazem você se sentir grato(a) por tê-lo(a) ao seu lado?", "Nosso futuro — Que tipo de casal queremos ser daqui a 5 anos? Como imaginamos nossa vida juntos? O que queremos preservar e o que queremos construir?", "Meus votos renovados — Escreva seus votos renovados. O que você se compromete a oferecer neste relacionamento? O que promete cuidar e honrar?"]
  },
  "mapa-cognitivo": {
    titulo: "Mapa Cognitivo do Relacionamento",
    instrucao: "Identificando crenças e padrões que moldam a relação",
    perguntas: ["Uma memória da sua história de vida que influencia como você se relaciona hoje:", "Quais crenças você carrega sobre relacionamentos? (Ex: 'Amor exige sacrifício', 'Parceiro(a) deve me adivinhar'...)", "Que situações no relacionamento disparam emoções intensas em você?", "Quando há conflito, qual é a sua estratégia habitual de enfrentamento?", "Que padrão repetitivo você observa em vocês como casal?", "O que você mais deseja que mude na dinâmica do relacionamento?"]
  },
  "novos-padroes": {
    titulo: "Novos Padrões Relacionais",
    instrucao: "Construindo acordos e comunicação saudável",
    perguntas: ["Descreva uma situação onde você reconheceu e validou o sentimento do(a) seu/sua parceiro(a) esta semana:", "Em vez de 'Você sempre...', use: 'Eu me sinto ___ quando ___. Preciso de ___.' Escreva uma situação real usando essa fórmula:", "Que acordo relacional vocês podem fazer para melhorar a convivência? (Ex: sem celular durante as refeições, check-in diário de 10 min...)", "Descreva um conflito passado e como poderiam tê-lo reparado de forma mais gentil:", "Que melhoria concreta você observou no relacionamento desde o início desta jornada?"]
  }
};
function FormularioCasal({
  atividadeId,
  onVoltar
}) {
  const config = ATIVIDADES_FORMULARIOS[atividadeId];
  const [respostas, setRespostas] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  if (!config) return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 32,
      color: "var(--text-muted)"
    }
  }, "Formul\xE1rio n\xE3o configurado para esta atividade.");
  async function salvar() {
    setSalvando(true);
    try {
      await db.collection("clinica_casais_respostas").add({
        pacienteId: "admin",
        casalId: "admin",
        atividadeId,
        respostas,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch (e) {
      alert("Erro ao salvar.");
    }
    setSalvando(false);
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20,
      fontStyle: "italic"
    }
  }, config.instrucao), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      marginBottom: 20
    }
  }, config.perguntas.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: "#fafafa",
      borderRadius: 10,
      padding: 14,
      border: "1px solid var(--gray-100)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      background: "var(--purple)",
      color: "white",
      borderRadius: "50%",
      width: 22,
      height: 22,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700,
      flexShrink: 0
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.5
    }
  }, p)), /*#__PURE__*/React.createElement(TextAreaVoz, {
    className: "form-input",
    rows: 3,
    value: respostas[i] || "",
    onChange: e => setRespostas(r => ({
      ...r,
      [i]: e.target.value
    })),
    placeholder: "Escreva sua resposta...",
    style: {
      resize: "vertical"
    }
  })))), salvo && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#d1fae5",
      borderRadius: 8,
      padding: "8px 12px",
      marginBottom: 12,
      fontSize: 13,
      color: "#065f46"
    }
  }, "\u2713 Respostas salvas!"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%"
    },
    onClick: salvar,
    disabled: salvando
  }, salvando ? "Salvando..." : "💾 Salvar respostas"));
}

// ── Psicoeducações e Fábulas para Casais ────────────────────────────────────
function PsicoFabCasais() {
  const [psicos, setPsicos] = useState([]);
  const [fabulas, setFabulas] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("psico");
  const [aberto, setAberto] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let loaded = 0;
    const check = () => {
      loaded++;
      if (loaded === 2) setLoading(false);
    };
    const u1 = db.collection("clinica_psicoeducacao").where("categoria", "==", "casais").onSnapshot(s => {
      setPsicos(s.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      check();
    }, check);
    const u2 = db.collection("clinica_fabulas").where("categoria", "==", "casais").onSnapshot(s => {
      setFabulas(s.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      check();
    }, check);
    return () => {
      u1();
      u2();
    };
  }, []);
  if (loading) return null;
  if (psicos.length === 0 && fabulas.length === 0) return null;
  if (aberto) {
    const VisualComp = PSICO_VISUAIS[aberto.visualKey || aberto.titulo];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        marginBottom: 12,
        padding: "8px 12px"
      },
      onClick: () => setAberto(null)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-left",
      size: 16
    }), " Voltar"), VisualComp ? /*#__PURE__*/React.createElement(VisualComp, {
      cat: {
        cor: "#7B00C4",
        bg: "#f3e6ff",
        accent: "#EC4899"
      }
    }) : /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "8px 0 16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 40,
        marginBottom: 8
      }
    }, aberto.emoji || "💜"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: 600,
        marginBottom: 6
      }
    }, aberto.titulo)), aberto.descricao && /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        fontStyle: "italic",
        marginBottom: 12
      }
    }, aberto.descricao), aberto.conteudo && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        lineHeight: 1.8,
        whiteSpace: "pre-wrap"
      }
    }, aberto.conteudo)));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 12,
      border: "1.5px solid #f0b8ff",
      overflow: "hidden",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(to right,#f9f0ff,#f3e6ff)",
      padding: "12px 18px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      borderBottom: "1px solid #e8c8ff"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, "\uD83D\uDC9C"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#7B00C4"
    }
  }, "Recursos para o Casal")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      padding: "10px 18px",
      borderBottom: "1px solid #e8c8ff",
      display: "flex",
      gap: 8
    }
  }, [["psico", "Psicoeducação", psicos.length], ["fabula", "Fábulas", fabulas.length]].map(([k, l, c]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setAbaAtiva(k),
    style: {
      padding: "5px 14px",
      borderRadius: 20,
      border: "1.5px solid",
      borderColor: abaAtiva === k ? "#7B00C4" : "#e5e7eb",
      background: abaAtiva === k ? "#f3e6ff" : "white",
      color: abaAtiva === k ? "#7B00C4" : "var(--gray-600)",
      fontSize: 12,
      cursor: "pointer",
      fontWeight: abaAtiva === k ? 600 : 400
    }
  }, l, " (", c, ")"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      padding: "12px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, (abaAtiva === "psico" ? psicos : fabulas).map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    onClick: () => setAberto(item),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      background: "#faf5ff",
      borderRadius: 10,
      border: "1px solid #e8c8ff",
      cursor: "pointer"
    },
    onMouseEnter: e => e.currentTarget.style.background = "#f3e6ff",
    onMouseLeave: e => e.currentTarget.style.background = "#faf5ff"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      flexShrink: 0
    }
  }, item.emoji || "💜"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#3d006a"
    }
  }, item.titulo), item.descricao && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#7B00C4",
      marginTop: 2,
      lineHeight: 1.4
    }
  }, item.descricao)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#7B00C4",
      fontWeight: 600,
      flexShrink: 0
    }
  }, "Ver \u2192"))), (abaAtiva === "psico" ? psicos : fabulas).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "16px 0",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhum item cadastrado para casais ainda.")));
}
function AbaProtocoloCasais() {
  const [expandido, setExpandido] = useState(null);
  const [atividadeAberta, setAtividadeAberta] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [checkin, setCheckin] = useState({});
  const [msg, setMsg] = useState("");
  if (atividadeAberta) {
    const {
      etapa,
      at
    } = atividadeAberta;
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        marginBottom: 16,
        padding: "8px 12px"
      },
      onClick: () => setAtividadeAberta(null)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-left",
      size: 16
    }), " Voltar ao Protocolo"), /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        marginBottom: 16,
        background: etapa.bg,
        border: "1.5px solid " + etapa.cor + "40"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 28
      }
    }, etapa.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: etapa.cor
      }
    }, etapa.stage === 0 ? "Diagnóstico" : "Etapa " + etapa.stage, " \u2014 ", etapa.titulo), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, at.titulo))), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: "var(--gray-700)",
        marginTop: 8,
        paddingLeft: 38
      }
    }, at.desc)), /*#__PURE__*/React.createElement("div", {
      className: "card"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 15,
        marginBottom: 16
      }
    }, at.titulo), at.id === "inventario-bem-estar" ? /*#__PURE__*/React.createElement(InventarioBemEstarCasal, {
      onVoltar: () => setAtividadeAberta(null)
    }) : at.id === "roda-vida-relacionamento" ? /*#__PURE__*/React.createElement(AdminRodaVida, {
      onVoltar: () => setAtividadeAberta(null)
    }) : at.id === "3-metas" ? /*#__PURE__*/React.createElement(AdminMetas, {
      onVoltar: () => setAtividadeAberta(null)
    }) : at.id === "quem-sou" ? /*#__PURE__*/React.createElement(AdminQuemSou, {
      onVoltar: () => setAtividadeAberta(null)
    }) : at.id === "o-que-quero" ? /*#__PURE__*/React.createElement(AdminOQueQuero, {
      onVoltar: () => setAtividadeAberta(null)
    }) : ATIVIDADES_FORMULARIOS[at.id] ? /*#__PURE__*/React.createElement(FormularioCasal, {
      atividadeId: at.id,
      onVoltar: () => setAtividadeAberta(null)
    }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: "#f9fafb",
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        fontSize: 13,
        color: "#6b7280",
        lineHeight: 1.7
      }
    }, "Responda com honestidade e na presen\xE7a da psic\xF3loga. Esta atividade faz parte do protocolo de Terapia de Casais TCC."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, [1, 2, 3].map(n => /*#__PURE__*/React.createElement("div", {
      key: n
    }, /*#__PURE__*/React.createElement("label", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        display: "block",
        marginBottom: 6
      }
    }, "Reflex\xE3o ", n), /*#__PURE__*/React.createElement(TextAreaVoz, {
      className: "form-input",
      rows: 3,
      value: respostas[at.id + "_" + n] || "",
      onChange: e => setRespostas(r => ({
        ...r,
        [at.id + "_" + n]: e.target.value
      })),
      placeholder: "Escreva sua resposta..."
    })))), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-purple",
      style: {
        width: "100%",
        marginTop: 16
      },
      onClick: () => {
        setMsg("✓ Salvo!");
        setTimeout(() => setMsg(""), 2000);
      }
    }, msg || /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Icon, {
      name: "save",
      size: 15
    }), " Salvar respostas")))));
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple-bg)",
      border: "1px solid var(--purple)30",
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
      display: "flex",
      alignItems: "flex-start",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "heart",
    size: 16
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--gray-700)",
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("strong", null, "Protocolo TCC para Casais"), " \u2014 diagn\xF3stico inicial + 4 etapas progressivas. Clique em cada atividade para acessar.")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 12,
      border: "1.5px solid #fda4af",
      overflow: "hidden",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpandido(expandido === "checkin" ? null : "checkin"),
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 18px",
      background: "linear-gradient(to right,#fff1f2,#fdf2f8)",
      border: "none",
      cursor: "pointer",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, "\u2728"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#be185d"
    }
  }, "Check-in Semanal do Casal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Recorrente \xB7 7 quest\xF5es de conex\xE3o emocional")), /*#__PURE__*/React.createElement(Icon, {
    name: expandido === "checkin" ? "chevron-up" : "chevron-down",
    size: 16
  })), expandido === "checkin" && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      padding: "16px 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 12
    }
  }, "Escala: 1=Nunca \xB7 2=Raramente \xB7 3=\xC0s vezes \xB7 4=Frequentemente \xB7 5=Sempre"), CHECKIN_SEMANAL.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 0",
      borderBottom: i < CHECKIN_SEMANAL.length - 1 ? "1px solid var(--gray-100)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: "#ffe4e6",
      color: "#be185d",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700,
      flexShrink: 0
    }
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      flex: 1,
      lineHeight: 1.4
    }
  }, q), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4
    }
  }, [1, 2, 3, 4, 5].map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setCheckin(c => ({
      ...c,
      [i]: v
    })),
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      border: "1.5px solid",
      borderColor: checkin[i] === v ? "#be185d" : "#e5e7eb",
      background: checkin[i] === v ? "#be185d" : "white",
      color: checkin[i] === v ? "white" : "#6b7280",
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, v))))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-purple",
    style: {
      width: "100%",
      marginTop: 12,
      background: "#be185d",
      border: "none"
    },
    onClick: () => {
      setMsg("✓ Check-in salvo!");
      setTimeout(() => setMsg(""), 2000);
    }
  }, msg || "Salvar Check-in"))), /*#__PURE__*/React.createElement(PsicoFabCasais, null), PROTOCOLO_CASAIS.map(etapa => /*#__PURE__*/React.createElement("div", {
    key: etapa.stage,
    style: {
      borderRadius: 12,
      border: "1.5px solid",
      borderColor: etapa.cor + "40",
      overflow: "hidden",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setExpandido(expandido === etapa.stage ? null : etapa.stage),
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 18px",
      background: etapa.bg,
      border: "none",
      cursor: "pointer",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22
    }
  }, etapa.emoji), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: etapa.cor
    }
  }, etapa.stage === 0 ? "Diagnóstico" : "Etapa " + etapa.stage, " \u2014 ", etapa.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, etapa.subtitulo)), /*#__PURE__*/React.createElement("span", {
    style: {
      background: "white",
      color: etapa.cor,
      borderRadius: 20,
      padding: "2px 10px",
      fontSize: 11,
      fontWeight: 600,
      border: "1px solid " + etapa.cor + "40"
    }
  }, etapa.atividades.length, " ativ."), /*#__PURE__*/React.createElement(Icon, {
    name: expandido === etapa.stage ? "chevron-up" : "chevron-down",
    size: 16
  })), expandido === etapa.stage && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "white",
      padding: "12px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, etapa.atividades.map(at => /*#__PURE__*/React.createElement("div", {
    key: at.id,
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "12px 14px",
      background: "var(--gray-50)",
      borderRadius: 10,
      border: "1px solid var(--gray-200)",
      cursor: "pointer",
      transition: "all .15s"
    },
    onClick: () => setAtividadeAberta({
      etapa,
      at
    }),
    onMouseEnter: e => {
      e.currentTarget.style.background = etapa.bg;
      e.currentTarget.style.borderColor = etapa.cor + "40";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = "var(--gray-50)";
      e.currentTarget.style.borderColor = "var(--gray-200)";
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: etapa.cor,
      marginTop: 5,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, at.titulo), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2,
      lineHeight: 1.5
    }
  }, at.desc)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: etapa.cor,
      fontWeight: 600,
      flexShrink: 0
    }
  }, "Acessar \u2192")))))));
}

// ── Aba Fábulas ──────────────────────────────────────────────────────────────
const CATS_FABULAS = {
  ansiedade: {
    label: "Ansiedade",
    cor: "#7B00C4",
    bg: "#f3e6ff",
    accent: "#F97316"
  },
  emocoes: {
    label: "Emoções",
    cor: "#7B00C4",
    bg: "#f3e6ff",
    accent: "#F43F5E"
  },
  autoconhecimento: {
    label: "Autoconhecimento",
    cor: "#7B00C4",
    bg: "#f3e6ff",
    accent: "#0EA5E9"
  },
  crescimento: {
    label: "Crescimento",
    cor: "#7B00C4",
    bg: "#f3e6ff",
    accent: "#22C55E"
  },
  relacionamentos: {
    label: "Relacionamentos",
    cor: "#7B00C4",
    bg: "#f3e6ff",
    accent: "#EF4444"
  },
  casais: {
    label: "Casais",
    cor: "#7B00C4",
    bg: "#f3e6ff",
    accent: "#EC4899"
  },
  perdao: {
    label: "Perdão",
    cor: "#7B00C4",
    bg: "#f3e6ff",
    accent: "#8B5CF6"
  },
  outros: {
    label: "Outros",
    cor: "#7B00C4",
    bg: "#f3e6ff",
    accent: "#64748B"
  }
};
function AbaFabulas() {
  const [fabulas, setFabulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fabulaAberta, setFabulaAberta] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [migrando, setMigrando] = useState(false);
  const MIGRACAO_CATS = {
    "resiliência": "crescimento",
    "resiliencia": "crescimento",
    "esperança": "crescimento",
    "esperanca": "crescimento",
    "autoconfiança": "autoconhecimento",
    "autoconfianca": "autoconhecimento",
    "autoestima": "autoconhecimento",
    "mindfulness": "emocoes",
    "tcc": "autoconhecimento",
    "expressão emocional": "emocoes",
    "expressao emocional": "emocoes",
    "regulação emocional": "emocoes",
    "regulacao emocional": "emocoes",
    "perspectiva": "autoconhecimento",
    "perdão": "perdao"
  };
  async function migrarCategorias() {
    if (!confirm("Migrar categorias antigas para as novas? Isso atualiza os documentos no Firebase.")) return;
    // Garante que breathing-478 e muscle-relaxation ficam visíveis com categoria ansiedade
    const snapAnsi = await db.collection("clinica_recursos").where("formularioKey", "in", ["breathing-478", "muscle-relaxation"]).get();
    for (const doc of snapAnsi.docs) {
      const cat = doc.data().categoria;
      if (!["tcc", "ansiedade", "emocoes", "autocuidado", "relacionamentos", "corpo", "esquema", "musicoterapia", "avaliacao", "outro"].includes(cat)) {
        await doc.ref.update({
          categoria: "ansiedade"
        });
      }
    }
    setMigrando(true);
    try {
      const snap = await db.collection("clinica_fabulas").get();
      let count = 0;
      for (const doc of snap.docs) {
        const cat = doc.data().categoria;
        const nova = MIGRACAO_CATS[cat];
        if (nova) {
          await db.collection("clinica_fabulas").doc(doc.id).update({
            categoria: nova
          });
          count++;
        }
      }
      alert("✓ " + count + " fábulas migradas!");
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setMigrando(false);
  }
  useEffect(() => {
    const unsub = db.collection("clinica_fabulas").onSnapshot(snap => {
      setFabulas(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  if (loading) return /*#__PURE__*/React.createElement(Spinner, null);
  if (fabulaAberta) {
    const cat = CATS_FABULAS[fabulaAberta.categoria] || {
      label: fabulaAberta.categoria,
      cor: "#7c3aed",
      bg: "#ede9fe"
    };
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
      className: "btn btn-ghost",
      style: {
        marginBottom: 16,
        padding: "8px 12px"
      },
      onClick: () => setFabulaAberta(null)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-left",
      size: 16
    }), " Todas as f\xE1bulas"), /*#__PURE__*/React.createElement("div", {
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
    }, fabulaAberta.emoji), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: 22,
        fontWeight: 600,
        marginBottom: 8
      }
    }, fabulaAberta.titulo), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontStyle: "italic",
        opacity: 0.9
      }
    }, "\"", fabulaAberta.moral, "\""), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 12,
        opacity: 0.75
      }
    }, (fabulaAberta.paginas || []).length, " p\xE1ginas \xB7 ", (fabulaAberta.perguntas || []).length, " reflex\xF5es"))), (fabulaAberta.paginas || []).map((pag, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "card",
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: cat.cor,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: "0.8px"
      }
    }, "P\xE1gina ", i + 1, " de ", fabulaAberta.paginas.length), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14,
        lineHeight: 1.9,
        color: "var(--gray-700)"
      }
    }, pag))), (fabulaAberta.perguntas || []).length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "card",
      style: {
        border: "1.5px solid " + cat.cor + "30",
        background: cat.bg
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: cat.cor
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "help-circle",
      size: 16
    }), " Perguntas de Reflex\xE3o"), fabulaAberta.perguntas.map((p, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 10,
        padding: "12px 0",
        borderBottom: i < fabulaAberta.perguntas.length - 1 ? "1px solid " + cat.cor + "20" : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: cat.cor,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0
      }
    }, i + 1), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        lineHeight: 1.6,
        color: "var(--gray-700)"
      }
    }, p)))));
  }
  if (fabulas.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      textAlign: "center",
      padding: 48,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "book-open",
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontWeight: 500
    }
  }, "Nenhuma f\xE1bula cadastrada ainda."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      marginTop: 6
    }
  }, "Execute o arquivo ", /*#__PURE__*/React.createElement("code", null, "popular-recursos.html"), " para criar as 15 f\xE1bulas."));

  // Agrupa por macrocategoria
  const filtradas = filtro === "todos" ? fabulas : fabulas.filter(f => {
    const macro = MACROCATEGORIAS.find(m => m.id === filtro);
    if (macro) {
      return FAB_LEGADO_MACRO[f.categoria || "outro"] === filtro || f.categoria === filtro;
    }
    return (f.categoria || "outro") === filtro;
  });

  // Para o grid: agrupa por macro
  const porMacro = MACROCATEGORIAS.map(m => {
    const itens = filtradas.filter(f => FAB_LEGADO_MACRO[f.categoria || "outro"] === m.id || f.categoria === m.id);
    return {
      ...m,
      itens
    };
  }).filter(m => m.itens.length > 0);
  // Órfãos
  const macroIds = new Set(Object.values(FAB_LEGADO_MACRO));
  const orfaos = filtradas.filter(f => !macroIds.has(f.categoria) && !FAB_LEGADO_MACRO[f.categoria || ""]);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
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
      padding: "6px 14px",
      borderRadius: 20,
      border: "1.5px solid",
      whiteSpace: "nowrap",
      flexShrink: 0,
      borderColor: filtro === "todos" ? "var(--purple)" : "#e5e7eb",
      background: filtro === "todos" ? "var(--purple)" : "white",
      color: filtro === "todos" ? "white" : "var(--gray-600)",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "\uD83D\uDCDA Todas (", fabulas.length, ")"), MACROCATEGORIAS.map(m => {
    const n = fabulas.filter(f => FAB_LEGADO_MACRO[f.categoria || "outro"] === m.id || f.categoria === m.id).length;
    if (n === 0) return null;
    const ativo = filtro === m.id;
    return /*#__PURE__*/React.createElement("button", {
      key: m.id,
      onClick: () => setFiltro(ativo ? "todos" : m.id),
      style: {
        padding: "6px 14px",
        borderRadius: 20,
        border: "1.5px solid",
        whiteSpace: "nowrap",
        flexShrink: 0,
        borderColor: ativo ? m.cor : m.cor + "50",
        background: ativo ? m.cor : m.bg,
        color: ativo ? "white" : m.cor,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer"
      }
    }, m.icone, " ", m.label, " (", n, ")");
  })), [...porMacro, ...(orfaos.length > 0 ? [{
    id: "_orfaos",
    label: "Sem Categoria",
    cor: "#6b7280",
    bg: "#f3f4f6",
    icone: "🔧",
    itens: orfaos
  }] : [])].map(grupo => {
    const c = {
      cor: grupo.cor,
      bg: grupo.bg,
      label: grupo.label
    };
    return /*#__PURE__*/React.createElement("div", {
      key: grupo.id,
      style: {
        marginBottom: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: "1px solid var(--gray-100)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 16
      }
    }, grupo.icone), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 11,
        color: c.cor,
        textTransform: "uppercase",
        letterSpacing: "0.8px"
      }
    }, c.label), /*#__PURE__*/React.createElement("span", {
      style: {
        background: c.bg,
        color: c.cor,
        borderRadius: 20,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600
      }
    }, grupo.itens.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
        gap: 12
      }
    }, grupo.itens.map(f => /*#__PURE__*/React.createElement("div", {
      key: f.id,
      style: {
        background: "white",
        border: "1.5px solid",
        borderColor: c.cor + "40",
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow .15s"
      },
      onClick: () => setFabulaAberta(f),
      onMouseEnter: e => e.currentTarget.style.boxShadow = "0 4px 16px " + c.cor + "30",
      onMouseLeave: e => e.currentTarget.style.boxShadow = ""
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: c.cor,
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 28
      }
    }, f.emoji || "📖"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 13,
        color: "white",
        lineHeight: 1.3
      }
    }, f.titulo), /*#__PURE__*/React.createElement("span", {
      style: {
        background: "rgba(255,255,255,0.2)",
        color: "white",
        borderRadius: 20,
        padding: "1px 8px",
        fontSize: 10,
        fontWeight: 600
      }
    }, c.label))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "12px 14px"
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        fontStyle: "italic",
        lineHeight: 1.5,
        marginBottom: 8
      }
    }, "\"", f.moral, "\""), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 11,
        color: "var(--text-muted)"
      }
    }, /*#__PURE__*/React.createElement("span", null, (f.paginas || []).length, " p\xE1g. \xB7 ", (f.perguntas || []).length, " reflex\xF5es"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: c.cor,
        fontWeight: 600,
        fontSize: 12
      }
    }, "Come\xE7ar a ler \u2192")))))));
  }));
}

// ── Aba Psicoeducação ─────────────────────────────────────────────────────────
const PILULAS_TCC = [{
  emoji: "💭",
  titulo: "O poder dos pensamentos",
  descricao: "Como o que pensamos afeta o que sentimos",
  categoria: "tcc",
  tipo: "texto",
  conteudo: "Você já reparou como uma ideia pode mudar completamente o seu humor?\n\nA mente funciona como um filtro: o que pensamos molda o que sentimos e o que fazemos. Um mesmo evento pode gerar tristeza ou tranquilidade — depende do que sua cabeça conta sobre ele. Não são as coisas em si que nos perturbam, mas o que acreditamos sobre elas.\n\n🎯 Na prática:\nHoje, quando notar uma emoção forte, pergunte: \"Que pensamento veio antes disso?\" Escreva num papel. Só observar já muda tudo."
}, {
  emoji: "🔍",
  titulo: "Fatos vs. interpretações",
  descricao: "Como não acreditar em tudo o que nossa mente diz",
  categoria: "tcc",
  tipo: "texto",
  conteudo: "A mente preenche lacunas automaticamente — e nem sempre acerta.\n\n\"Ela não me respondeu, deve estar com raiva de mim\" é uma interpretação, não um fato. O fato é apenas: \"Ela não respondeu\". Todo o resto é história que criamos. E histórias podem ser reescritas.\n\n🎯 Na prática:\nPegue uma situação que te incomodou hoje. Separe: o que REALMENTE aconteceu? E o que VOCÊ acrescentou? Escreva os dois lados."
}, {
  emoji: "⛈️",
  titulo: "A armadilha do pior cenário",
  descricao: "O hábito de catastrofizar o futuro e como parar",
  categoria: "ansiedade",
  tipo: "texto",
  conteudo: "Catastrofizar é o hábito de imaginar sempre o pior desfecho possível — e tratá-lo como certeza.\n\n\"E se eu reprovar? E se perder o emprego? E se ninguém me amar?\" O problema é que o cérebro não distingue ameaça real de imaginada, então você sofre antecipado por algo que talvez nunca aconteça.\n\n🎯 Na prática:\nQuando catastrofizar aparecer, faça 3 perguntas:\n1. Isso é provável?\n2. Já aconteceu antes?\n3. Se acontecer, eu consigo lidar?\nQuase sempre a resposta ao item 3 é sim."
}, {
  emoji: "🌀",
  titulo: "O ciclo da ansiedade",
  descricao: "Como evitar o que tememos só faz o medo crescer",
  categoria: "ansiedade",
  tipo: "texto",
  conteudo: "Quanto mais evitamos o que tememos, mais o medo cresce.\n\nParece contraditório, mas é assim: ao fugir da situação, o alívio imediato ensina ao cérebro que \"fugir = segurança\". Com o tempo, o gatilho fica cada vez menor e a evitação, cada vez maior. A única saída é, aos poucos, enfrentar.\n\n🎯 Na prática:\nEscolha uma coisa pequena que você evita há tempo. Faça por 5 minutos hoje — só 5. Observe que o pior quase nunca acontece."
}, {
  emoji: "🚀",
  titulo: "Agir antes de ter vontade",
  descricao: "O princípio prático: fazer algo para gerar motivação",
  categoria: "autocuidado",
  tipo: "texto",
  conteudo: "Esperamos a motivação aparecer para agir — mas funciona ao contrário.\n\nA ação cria a motivação, não o contrário. Você não precisa estar animado para começar; precisa começar para ficar animado. É como empurrar um carro parado: o começo exige mais força, depois o movimento sustenta.\n\n🎯 Na prática:\nEscolha uma tarefa que você está adiando. Faça os primeiros 2 minutos agora — sem julgamento. Só isso. Veja o que acontece depois."
}, {
  emoji: "🤗",
  titulo: "Autocompaixão",
  descricao: "Como ser menos crítico consigo mesmo",
  categoria: "autoestima",
  tipo: "texto",
  conteudo: "Nós seríamos horrorosos como amigos de nós mesmos.\n\nCom uma pessoa que amamos, somos gentis e pacientes. Com nós, somos críticos e impacientes. Autocompaixão não é preguiça nem fraqueza — é tratar a si mesmo com a mesma ternura que você ofereceria a quem você ama.\n\n🎯 Na prática:\nHoje, quando errar algo, diga internamente: \"Tudo bem, isso é humano. Qualquer pessoa teria dificuldade aqui. Eu faço o que posso.\" Apenas isso."
}, {
  emoji: "🎨",
  titulo: "A roda das emoções",
  descricao: "A importância de saber nomear exatamente o que sente",
  categoria: "mindfulness",
  tipo: "texto",
  conteudo: "\"Estou mal\" é vago demais para o cérebro agir.\n\nQuando nomeamos com precisão o que sentimos — \"estou ansioso\", \"estou frustrado\", \"estou envergonhado\" — ativamos o córtex pré-frontal, que acalma a amígdala. Nomear emoções é uma forma de regulação emocional.\n\nEmoções primárias: Alegria, Tristeza, Raiva, Medo, Surpresa, Nojo.\nCada uma tem dezenas de nuances — quanto mais preciso o nome, mais controle você tem.\n\n🎯 Na prática:\nAntes de dormir, escreva: \"Hoje me senti ___\" — use o nome mais preciso possível. Evite \"bem\" ou \"mal\"."
}, {
  emoji: "🔺",
  titulo: "O modelo ABC na prática",
  descricao: "Como nossa crença sobre um evento muda nossa reação",
  categoria: "tcc",
  tipo: "texto",
  conteudo: "A — Adversidade (o que aconteceu)\nB — Belief, ou seja, a crença sobre o que aconteceu\nC — Consequência emocional\n\nA mesma situação pode gerar emoções completamente diferentes dependendo do B. Dois colegas recebem críticas do chefe: um pensa \"Sou um fracasso\" e fica triste; o outro pensa \"Posso melhorar\" e fica motivado. Mesmo A, B diferente, C diferente.\n\n🎯 Na prática:\nPense em uma situação que te deixou mal. Escreva o A (fato), o B (o que você acreditou) e o C (emoção). Agora invente um B diferente — o que mudaria?"
}, {
  emoji: "⚡",
  titulo: "Eustresse vs. distresse",
  descricao: "Como diferenciar o estresse que impulsiona do que adoece",
  categoria: "ansiedade",
  tipo: "texto",
  conteudo: "Nem todo estresse é ruim.\n\nEustresse é o estresse que nos impulsiona — aquela energia antes de uma apresentação importante, a adrenalina de um desafio. Distresse é quando a pressão ultrapassa nossa capacidade e começa a nos adoecer. A diferença está na duração e na percepção de controle.\n\n🎯 Na prática:\nHoje, pergunte sobre um estressor: \"Isso me desafia ou me paralisa?\" Se desafia, use a energia. Se paralisa, é sinal de que precisa de pausa ou ajuda."
}, {
  emoji: "🪫",
  titulo: "Sinais de desgaste emocional",
  descricao: "Como identificar a sobrecarga e estratégias de pausa",
  categoria: "autocuidado",
  tipo: "texto",
  conteudo: "O corpo e a mente avisam antes de entrar em colapso — mas aprendemos a ignorar esses sinais.\n\nIrritabilidade sem causa, dificuldade de concentração, sono perturbado, sensação de vazio ou indiferença são sinais de que o sistema está sobrecarregado. Pausar não é fraqueza; é manutenção obrigatória.\n\n🎯 Na prática:\nHoje, reserve 15 minutos para fazer absolutamente nada útil: sentar ao sol, ouvir música, tomar um chá. Sem culpa. É recuperação."
}, {
  emoji: "∞",
  titulo: "O perigo do sempre e nunca",
  descricao: "Como a supergeneralização afeta nosso humor",
  categoria: "tcc",
  tipo: "texto",
  conteudo: "\"Eu SEMPRE faço isso errado.\" \"Ele NUNCA me ouve.\"\n\nEssas palavras parecem verdade, mas são armadilhas. Uma generalização transforma um evento pontual em característica permanente. E o que parece permanente gera desânimo. Quase nada na vida humana é realmente \"sempre\" ou \"nunca\".\n\n🎯 Na prática:\nQuando notar um \"sempre\" ou \"nunca\" no seu pensamento ou fala, troque por: \"desta vez\", \"às vezes\", \"com frequência\". Observe como a frase — e a emoção — mudam."
}, {
  emoji: "🍕",
  titulo: "A pizza da responsabilidade",
  descricao: "Como dividir a culpa evitando autoculpa ou vitimização",
  categoria: "tcc",
  tipo: "texto",
  conteudo: "Quando algo dá errado, tendemos aos extremos: ou colocamos toda a culpa em nós mesmos (autoculpa tóxica) ou em outro alguém (vitimização).\n\nA verdade é que a maioria dos problemas tem múltiplos autores: você, o outro e as circunstâncias. Dividir a culpa em fatias mais justas libera peso.\n\nFórmula: 33% Eu + 33% O Outro + 33% As Circunstâncias\n\n🎯 Na prática:\nPense num problema recente. Divida: qual parte foi sua? Qual foi do outro? Qual foi das circunstâncias? Você ficará surpreso com o quanto não precisa carregar."
}, {
  emoji: "🔦",
  titulo: "O filtro negativo da mente",
  descricao: "Por que ignoramos 10 elogios e focamos em 1 crítica",
  categoria: "autoestima",
  tipo: "texto",
  conteudo: "O cérebro tem um viés de negatividade — herança evolutiva para detectar perigos.\n\nIsso nos faz ignorar 10 elogios e ruminar 1 crítica por dias. É automático, não é fraqueza. Mas podemos treinar ativamente a atenção para o que funcionou.\n\n🎯 Na prática:\nAntes de dormir, anote 3 coisas que deram certo hoje — podem ser minúsculas. Fazer isso por 21 dias literalmente reconfigura os circuitos atencionais do cérebro."
}, {
  emoji: "⏱️",
  titulo: "A regra dos 5 minutos",
  descricao: "Uma técnica infalível para vencer a procrastinação",
  categoria: "autocuidado",
  tipo: "texto",
  conteudo: "Procrastinamos porque o cérebro antecipa a tarefa como enorme e desagradável.\n\nMas a aversão quase sempre é maior na antecipação do que na execução. A regra é: comprometa-se com apenas 5 minutos. Só. Após esses 5 minutos, você pode parar — com honra. Na maioria das vezes, você continua.\n\n🎯 Na prática:\nEscolha a tarefa mais temida da sua lista hoje. Configure um timer para 5 minutos. Comece agora. Só 5 minutos."
}, {
  emoji: "🌊",
  titulo: "Surfando a onda da emoção",
  descricao: "Como sentir uma emoção intensa sem agir por impulso",
  categoria: "mindfulness",
  tipo: "texto",
  conteudo: "Emoções intensas parecem eternas, mas têm um pico e depois diminuem — como uma onda do mar.\n\nO problema é que quando agimos por impulso no pico da onda, quase sempre nos arrependemos. A técnica de \"surfar a onda\" é: observe a emoção sem agir nela, sabendo que ela vai passar.\n\n🎯 Na prática:\nNa próxima emoção intensa, observe como uma onda: onde ela começa no corpo? Ela sobe? Quando chega ao pico? Você verá que em 10 a 20 minutos ela diminui naturalmente."
}, {
  emoji: "🧩",
  titulo: "7 Distorções de Pensamento",
  descricao: "Os padrões de pensamento que distorcem sua realidade",
  categoria: "tcc",
  tipo: "visual",
  conteudo: ""
}, {
  emoji: "🧠",
  titulo: "Desmontar o Circuito Cerebral da Ansiedade",
  descricao: "4 passos para retomar o comando da sua própria vida",
  categoria: "ansiedade",
  tipo: "visual",
  conteudo: ""
}, {
  emoji: "🎛️",
  titulo: "Preocupação produtiva vs. improdutiva",
  descricao: "Como separar o que posso resolver do que está fora do controle",
  categoria: "ansiedade",
  tipo: "texto",
  conteudo: "Preocupação produtiva: tenho uma ação concreta que posso fazer agora para resolver isso.\n\nPreocupação improdutiva: o problema está fora do meu controle ou no futuro, e ficar ruminando só gasta energia. A pergunta-chave é: existe algo que eu possa FAZER agora?\n\n🎯 Na prática:\nListe suas 3 preocupações do momento. Para cada uma: existe uma ação concreta que você pode fazer hoje? Se sim, faça. Se não, escreva: \"Isso está fora do meu controle agora\" e pratique soltar."
}, {
  emoji: "🏆",
  titulo: "O diário de pequenas vitórias",
  descricao: "Como treinar o cérebro para notar o que deu certo",
  categoria: "autocuidado",
  tipo: "texto",
  conteudo: "Positividade tóxica é fingir que tudo está bem quando não está.\n\nO diário de pequenas vitórias é diferente: é treinar o cérebro para notar o que realmente funcionou — por menor que seja. \"Tomei água hoje.\" \"Respondi um email difícil.\" \"Saí da cama quando não queria.\" Essas coisas contam.\n\n🎯 Na prática:\nHoje à noite, escreva 3 pequenas vitórias do dia. Podem ser minúsculas. Não vale inventar — vale notar o que realmente aconteceu e que você normalmente ignoraria."
}];

// ═══════════════════════════════════════════════════════════════════════
// PSICOEDUCAÇÕES VISUAIS — ANSIEDADE
// ═══════════════════════════════════════════════════════════════════════
