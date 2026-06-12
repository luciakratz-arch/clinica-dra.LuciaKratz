const COLUNAS_FUNIL = [{
  id: "novo",
  label: "Lead Novo",
  cor: "#6b7280",
  bg: "#f3f4f6"
}, {
  id: "contato",
  label: "Primeiro Contato",
  cor: "#0891b2",
  bg: "#e0f2fe"
}, {
  id: "agendamento",
  label: "Agendamento Pendente",
  cor: "#d97706",
  bg: "#fef3c7"
}, {
  id: "agendado",
  label: "Agendado & Confirmado",
  cor: "#7B00C4",
  bg: "#f5f3ff"
}, {
  id: "convertido",
  label: "Convertido",
  cor: "#16a34a",
  bg: "#dcfce7"
}, {
  id: "convertido_social",
  label: "Convertido Social",
  cor: "#0d9488",
  bg: "#ccfbf1"
}, {
  id: "convertido_parceria",
  label: "Convertido — Parceria",
  cor: "#7B00C4",
  bg: "#f5f3ff"
}, {
  id: "perdido",
  label: "Perdido",
  cor: "#dc2626",
  bg: "#fef2f2"
}];
function parsearLeadIA(texto) {
  const linhas = texto.split("\n");
  function extrairLinha(chaves) {
    for (const linha of linhas) {
      const limpa = linha.replace(/\*/g, "").replace(/\[|\]/g, "").trim();
      for (const chave of chaves) {
        const idx = limpa.toLowerCase().indexOf(chave.toLowerCase() + ":");
        if (idx !== -1) return limpa.substring(idx + chave.length + 1).trim();
      }
    }
    return "";
  }
  return {
    nome: extrairLinha(["Nome do Lead", "Nome"]),
    telefone: extrairLinha(["WhatsApp/Contato", "WhatsApp", "Contato", "Telefone"]),
    queixa: extrairLinha(["Principal Queixa/Objetivo", "Queixa/Objetivo", "Principal Queixa", "Queixa", "Objetivo"]),
    servico: extrairLinha(["Serviço de Interesse", "Servico de Interesse", "Serviço", "Servico"])
  };
}
function TagInputCampanha({
  value = [],
  onChange
}) {
  const [input, setInput] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [todasTags, setTodasTags] = useState([]);
  useEffect(() => {
    db.collection("clinica_campanhas").orderBy("nome").onSnapshot(s => setTodasTags(s.docs.map(d => d.data().nome)), () => {});
  }, []);
  const filtradas = input.length > 0 ? todasTags.filter(t => t.toLowerCase().includes(input.toLowerCase()) && !value.includes(t)) : [];
  async function adicionarTag(tag) {
    const t = tag.trim();
    if (!t || value.includes(t)) return;
    if (!todasTags.includes(t)) {
      await db.collection("clinica_campanhas").add({
        nome: t,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }
    onChange([...value, t]);
    setInput("");
    setSugestoes([]);
  }
  function removerTag(t) {
    onChange(value.filter(x => x !== t));
  }
  function onKeyDown(e) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      adicionarTag(input);
    }
    if (e.key === "Backspace" && !input && value.length > 0) removerTag(value[value.length - 1]);
  }
  return React.createElement("div", {
    style: {
      border: "1px solid var(--gray-200)",
      borderRadius: 8,
      padding: "6px 8px",
      background: "white",
      minHeight: 38,
      cursor: "text"
    },
    onClick: () => document.getElementById("tag-input-camp")?.focus()
  }, React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 4,
      alignItems: "center"
    }
  }, value.map(t => React.createElement("span", {
    key: t,
    style: {
      background: "#ea580c18",
      color: "#ea580c",
      borderRadius: 20,
      padding: "2px 10px",
      fontSize: 12,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, t, React.createElement("button", {
    onClick: () => removerTag(t),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#ea580c",
      padding: 0,
      fontSize: 14,
      lineHeight: 1
    }
  }, "\xD7"))), React.createElement("div", {
    style: {
      position: "relative",
      flex: 1,
      minWidth: 120
    }
  }, React.createElement("input", {
    id: "tag-input-camp",
    value: input,
    onChange: e => {
      setInput(e.target.value);
    },
    onKeyDown: onKeyDown,
    placeholder: value.length === 0 ? "Campanha/Origem..." : "",
    style: {
      border: "none",
      outline: "none",
      fontSize: 13,
      width: "100%",
      padding: "2px 0",
      background: "transparent"
    }
  }), filtradas.length > 0 && React.createElement("div", {
    style: {
      position: "absolute",
      top: "100%",
      left: 0,
      background: "white",
      border: "1px solid var(--gray-200)",
      borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      zIndex: 100,
      minWidth: 200
    }
  }, filtradas.slice(0, 6).map(t => React.createElement("button", {
    key: t,
    onMouseDown: e => {
      e.preventDefault();
      adicionarTag(t);
    },
    style: {
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "8px 12px",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    },
    onMouseEnter: e => e.currentTarget.style.background = "#f5f3ff",
    onMouseLeave: e => e.currentTarget.style.background = "none"
  }, t)), input && !todasTags.includes(input.trim()) && React.createElement("button", {
    onMouseDown: e => {
      e.preventDefault();
      adicionarTag(input);
    },
    style: {
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "8px 12px",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit",
      color: "#7B00C4",
      fontWeight: 600
    },
    onMouseEnter: e => e.currentTarget.style.background = "#f5f3ff",
    onMouseLeave: e => e.currentTarget.style.background = "none"
  }, "+ Criar \"", input.trim(), "\"")))));
}
function ModalLead({
  lead,
  onSalvar,
  onFechar,
  user,
  onConverter
}) {
  const novo = !lead?.id;
  const [form, setForm] = useState(lead || {
    nome: "",
    telefone: "",
    queixa: "",
    servico: "",
    campanhas: [],
    status: "novo",
    temperatura: "morno",
    obs: ""
  });
  const [textoIA, setTextoIA] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState("dados");
  const [interacoes, setInteracoes] = useState([]);
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  useEffect(() => {
    if (!lead?.id) return;
    db.collection("clinica_leads").doc(lead.id).collection("interacoes").orderBy("createdAt", "desc").onSnapshot(s => setInteracoes(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
  }, [lead?.id]);
  function aplicarIA() {
    const parsed = parsearLeadIA(textoIA);
    if (!parsed.nome && !parsed.telefone) {
      alert("Não foi possível identificar os campos. Verifique o formato do texto.");
      return;
    }
    setForm(f => ({
      ...f,
      ...parsed
    }));
    setTextoIA("");
  }
  async function salvar() {
    if (!form.nome?.trim()) {
      alert("Nome é obrigatório.");
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        ...form,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (novo) {
        dados.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        dados.status = dados.status || "novo";
        await db.collection("clinica_leads").add(dados);
      } else {
        await db.collection("clinica_leads").doc(lead.id).update(dados);
      }
      onSalvar();
    } catch (e) {
      alert("Erro ao salvar.");
    }
    setSalvando(false);
  }
  async function registrarContato() {
    if (!novaAnotacao.trim()) return;
    if (!lead?.id) {
      alert("Salve o lead primeiro antes de registrar interações.");
      return;
    }
    setRegistrando(true);
    try {
      await db.collection("clinica_leads").doc(lead.id).collection("interacoes").add({
        texto: novaAnotacao.trim(),
        autor: user?.nome || "Usuário",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setNovaAnotacao("");
    } catch (e) {
      alert("Erro ao registrar.");
    }
    setRegistrando(false);
  }
  async function excluirLead() {
    if (!lead?.id) return;
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este lead? Esta ação não poderá ser desfeita.")) return;
    setExcluindo(true);
    try {
      await db.collection("clinica_leads").doc(lead.id).delete();
      onFechar();
    } catch (e) {
      alert("Erro ao excluir.");
    }
    setExcluindo(false);
  }
  const f = (campo, val) => setForm(x => ({
    ...x,
    [campo]: val
  }));
  function fmtDataHora(ts) {
    if (!ts?.toDate) return "—";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  return React.createElement("div", {
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
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      width: "100%",
      maxWidth: 600,
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
    }
  }, React.createElement("div", {
    style: {
      padding: "18px 24px",
      borderBottom: "1px solid var(--gray-100)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexShrink: 0
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16
    }
  }, novo ? "Novo Lead" : form.nome || "Lead"), React.createElement("button", {
    onClick: onFechar,
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-muted)",
      fontSize: 22,
      lineHeight: 1
    }
  }, "\xD7")), !novo && React.createElement("div", {
    style: {
      display: "flex",
      borderBottom: "1px solid var(--gray-100)",
      flexShrink: 0
    }
  }, [{
    id: "dados",
    label: "📋 Dados"
  }, {
    id: "timeline",
    label: `💬 Follow-up (${interacoes.length})`
  }].map(a => React.createElement("button", {
    key: a.id,
    onClick: () => setAba(a.id),
    style: {
      flex: 1,
      padding: "12px 0",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontWeight: aba === a.id ? 700 : 400,
      fontSize: 13,
      fontFamily: "inherit",
      borderBottom: aba === a.id ? "2px solid #7B00C4" : "2px solid transparent",
      color: aba === a.id ? "#7B00C4" : "var(--text-muted)",
      transition: "all .15s"
    }
  }, a.label))), React.createElement("div", {
    style: {
      overflowY: "auto",
      flex: 1
    }
  }, (novo || aba === "dados") && React.createElement("div", {
    style: {
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, novo && React.createElement("div", {
    style: {
      background: "#f5f3ff",
      border: "1px solid #7B00C420",
      borderRadius: 10,
      padding: 14
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      color: "#7B00C4",
      marginBottom: 8
    }
  }, "\u2728 Inserir Lead via IA"), React.createElement(TextAreaVoz, {
    value: textoIA,
    onChange: e => setTextoIA(e.target.value),
    rows: 5,
    placeholder: `Cole aqui o bloco gerado pela IA de triagem:\n\n### ESTRUTURA PARA O CRM\n* **Nome do Lead:** ...\n* **WhatsApp/Contato:** ...\n* **Principal Queixa/Objetivo:** ...\n* **Serviço de Interesse:** ...`,
    style: {
      width: "100%",
      border: "1px solid #7B00C430",
      borderRadius: 8,
      padding: "10px 12px",
      fontSize: 12,
      fontFamily: "monospace",
      resize: "vertical",
      outline: "none",
      boxSizing: "border-box",
      background: "white"
    }
  }), React.createElement("button", {
    onClick: aplicarIA,
    style: {
      marginTop: 8,
      background: "#7B00C4",
      color: "white",
      border: "none",
      borderRadius: 20,
      padding: "7px 18px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, "\u26A1 Preencher campos automaticamente")), [{
    label: "Nome do Lead *",
    campo: "nome",
    placeholder: "Nome completo"
  }, {
    label: "WhatsApp / Contato",
    campo: "telefone",
    placeholder: "(62) 99999-9999"
  }, {
    label: "Principal Queixa/Objetivo",
    campo: "queixa",
    placeholder: "Ex: Ansiedade, insônia..."
  }, {
    label: "Serviço de Interesse",
    campo: "servico",
    placeholder: "Ex: Psicoterapia individual"
  }].map(({
    label,
    campo,
    placeholder
  }) => React.createElement("div", {
    key: campo
  }, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, label), React.createElement("input", {
    type: "text",
    value: form[campo] || "",
    onChange: e => f(campo, e.target.value),
    placeholder: placeholder,
    className: "form-input"
  }))), React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Campanha / Origem"), React.createElement(TagInputCampanha, {
    value: form.campanhas || [],
    onChange: v => f("campanhas", v)
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "Digite e pressione Enter. Campanhas novas s\xE3o salvas automaticamente.")), React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Status"), React.createElement("select", {
    value: form.status || "novo",
    onChange: e => {
      const novoStatus = e.target.value;
      f("status", novoStatus);
      if ((novoStatus === "convertido" || novoStatus === "convertido_social" || novoStatus === "convertido_parceria") && !novo && onConverter) {
        onConverter({
          ...form,
          id: lead.id,
          _tipoConversao: novoStatus
        });
      }
    },
    className: "form-input"
  }, COLUNAS_FUNIL.map(c => React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.label)))), React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "\uD83C\uDF21\uFE0F Temperatura do Lead"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [{
    v: "quente",
    e: "🔥",
    l: "Quente",
    cor: "#dc2626",
    bg: "#fef2f2"
  }, {
    v: "morno",
    e: "🌡️",
    l: "Morno",
    cor: "#d97706",
    bg: "#fef3c7"
  }, {
    v: "frio",
    e: "🧊",
    l: "Frio",
    cor: "#0891b2",
    bg: "#e0f2fe"
  }].map(({
    v,
    e,
    l,
    cor,
    bg
  }) => React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => f("temperatura", v),
    style: {
      flex: 1,
      padding: "10px 6px",
      borderRadius: 10,
      border: "2px solid",
      borderColor: (form.temperatura || "morno") === v ? cor : "#e5e7eb",
      background: (form.temperatura || "morno") === v ? bg : "white",
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all .15s"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 18,
      marginBottom: 2
    }
  }, e), React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: (form.temperatura || "morno") === v ? cor : "#6b7280"
    }
  }, l))))), React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Observa\xE7\xF5es"), React.createElement(TextAreaVoz, {
    value: form.obs || "",
    onChange: e => f("obs", e.target.value),
    rows: 3,
    className: "form-input",
    placeholder: "Anota\xE7\xF5es internas...",
    style: {
      resize: "vertical"
    }
  }))), !novo && aba === "timeline" && React.createElement("div", {
    style: {
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, React.createElement("div", {
    style: {
      background: "#f9fafb",
      border: "1px solid var(--gray-200)",
      borderRadius: 12,
      padding: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 10
    }
  }, "\uD83D\uDCDD Nova anota\xE7\xE3o de follow-up"), React.createElement(TextAreaVoz, {
    value: novaAnotacao,
    onChange: e => setNovaAnotacao(e.target.value),
    rows: 3,
    className: "form-input",
    placeholder: "Ex: \"Cliente disse que vai falar com o marido e pediu para retornar na quinta-feira.\"",
    style: {
      resize: "vertical",
      marginBottom: 10
    }
  }), React.createElement("button", {
    onClick: registrarContato,
    disabled: registrando || !novaAnotacao.trim(),
    style: {
      background: "#7B00C4",
      color: "white",
      border: "none",
      borderRadius: 8,
      padding: "9px 20px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      opacity: !novaAnotacao.trim() || registrando ? 0.5 : 1
    }
  }, registrando ? "Registrando..." : "✅ Registrar Contato")), React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 12,
      color: "var(--text-muted)"
    }
  }, "HIST\xD3RICO DE INTERA\xC7\xD5ES"), interacoes.length === 0 ? React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 0",
      color: "var(--gray-400)",
      fontSize: 13
    }
  }, "Nenhuma intera\xE7\xE3o registrada ainda.") : React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("div", {
    style: {
      position: "absolute",
      left: 15,
      top: 0,
      bottom: 0,
      width: 2,
      background: "var(--gray-100)"
    }
  }), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 0
    }
  }, interacoes.map((it, idx) => React.createElement("div", {
    key: it.id,
    style: {
      display: "flex",
      gap: 16,
      paddingBottom: 20,
      position: "relative"
    }
  }, React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: "50%",
      background: "#7B00C4",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      zIndex: 1,
      fontSize: 13
    }
  }, "\uD83D\uDCAC"), React.createElement("div", {
    style: {
      flex: 1,
      background: "white",
      border: "1px solid var(--gray-100)",
      borderRadius: 10,
      padding: "12px 14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
      flexWrap: "wrap",
      gap: 4
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 12,
      color: "#7B00C4"
    }
  }, it.autor), React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--gray-400)"
    }
  }, fmtDataHora(it.createdAt))), React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: 1.6,
      color: "var(--text)"
    }
  }, it.texto))))))))), React.createElement("div", {
    style: {
      padding: "14px 24px",
      borderTop: "1px solid var(--gray-100)",
      display: "flex",
      gap: 10,
      justifyContent: "space-between",
      alignItems: "center",
      flexShrink: 0
    }
  }, !novo ? React.createElement("button", {
    onClick: excluirLead,
    disabled: excluindo,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "9px 14px",
      borderRadius: 8,
      border: "1px solid #fecaca",
      background: "#fef2f2",
      color: "#dc2626",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit",
      fontWeight: 500
    }
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 14
  }), " ", excluindo ? "Excluindo..." : "Excluir lead") : React.createElement("div", null), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, React.createElement("button", {
    onClick: onFechar,
    style: {
      padding: "9px 20px",
      borderRadius: 8,
      border: "1px solid var(--gray-200)",
      background: "white",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, aba === "timeline" ? "Fechar" : "Cancelar"), (novo || aba === "dados") && React.createElement("button", {
    onClick: salvar,
    disabled: salvando,
    className: "btn-primary"
  }, salvando ? "Salvando..." : "Salvar Lead")))));
}
const REGRAS_INATIVIDADE = [{
  status: "novo",
  limiteMs: 30 * 60 * 1000,
  emoji: "⚠️",
  titulo: nome => `⚠️ Lead aguardando primeiro contato`,
  corpo: (nome, tempo) => `${nome} está em "Lead Novo" há ${tempo} sem contato.`,
  cor: "#d97706",
  bg: "#fef3c7",
  borda: "#fde68a"
}, {
  status: "contato",
  limiteMs: 4 * 60 * 60 * 1000,
  emoji: "📞",
  titulo: nome => `📞 Primeiro contato sem avanço`,
  corpo: (nome, tempo) => `${nome} está em "Primeiro Contato" há ${tempo}. Tentar avançar para agendamento.`,
  cor: "#0891b2",
  bg: "#e0f2fe",
  borda: "#bae6fd"
}, {
  status: "agendamento",
  limiteMs: 24 * 60 * 60 * 1000,
  emoji: "⏰",
  titulo: nome => `⏰ Agendamento pendente há mais de 24h`,
  corpo: (nome, tempo) => `${nome} está em "Agendamento Pendente" há ${tempo}. Verificar contato.`,
  cor: "#dc2626",
  bg: "#fef2f2",
  borda: "#fecaca"
}];
function formatarTempo(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms % 3600000 / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
function fmtWhats(tel) {
  if (!tel) return null;
  const num = tel.replace(/\D/g, "");
  if (!num) return null;
  return num.startsWith("55") ? num : "55" + num;
}
function CardLead({
  lead,
  onEditar,
  onMover,
  colunas
}) {
  const [dragging, setDragging] = useState(false);
  const regra = REGRAS_INATIVIDADE.find(r => r.status === (lead.status || "novo"));
  const rawRef = lead.updatedAt || lead.createdAt;
  const refMs = rawRef ? typeof rawRef.toDate === "function" ? rawRef.toDate().getTime() : rawRef.seconds ? rawRef.seconds * 1000 : null : null;
  const emAlerta = regra && refMs && Date.now() - refMs >= regra.limiteMs;
  const whats = fmtWhats(lead.telefone);
  return React.createElement("div", {
    draggable: true,
    onDragStart: e => {
      setDragging(true);
      e.dataTransfer.setData("leadId", lead.id);
    },
    onDragEnd: () => setDragging(false),
    onClick: () => onEditar(lead),
    style: {
      background: "white",
      borderRadius: 10,
      padding: "12px 14px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      cursor: "grab",
      opacity: dragging ? 0.5 : 1,
      transition: "opacity .15s",
      border: emAlerta ? `1.5px solid ${regra.borda}` : "1px solid var(--gray-100)",
      marginBottom: 8
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, lead.nome), lead.temperatura && (() => {
    const t = {
      quente: {
        e: "🔥",
        c: "#dc2626",
        bg: "#fef2f2"
      },
      morno: {
        e: "🌡️",
        c: "#d97706",
        bg: "#fef3c7"
      },
      frio: {
        e: "🧊",
        c: "#0891b2",
        bg: "#e0f2fe"
      }
    };
    const cfg = t[lead.temperatura] || t.morno;
    return React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: cfg.c,
        background: cfg.bg,
        borderRadius: 20,
        padding: "1px 7px"
      }
    }, cfg.e, " ", lead.temperatura.charAt(0).toUpperCase() + lead.temperatura.slice(1));
  })()), lead.servico && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginBottom: 4
    }
  }, "\uD83C\uDFAF ", lead.servico), lead.queixa && React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--gray-500)",
      marginBottom: 6,
      lineHeight: 1.4
    }
  }, lead.queixa.slice(0, 60), lead.queixa.length > 60 ? "..." : ""), lead.telefone && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "\uD83D\uDCF1 ", lead.telefone), (lead.campanhas || []).length > 0 && React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 8
    }
  }, lead.campanhas.map(c => React.createElement("span", {
    key: c,
    style: {
      background: "#ea580c18",
      color: "#ea580c",
      borderRadius: 20,
      padding: "2px 8px",
      fontSize: 10,
      fontWeight: 600
    }
  }, c))), React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--gray-400)",
      marginTop: 8
    }
  }, lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString("pt-BR") : ""), emAlerta && whats && React.createElement("a", {
    href: `https://wa.me/${whats}`,
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: e => e.stopPropagation(),
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      marginTop: 8,
      background: "#16a34a",
      color: "white",
      borderRadius: 6,
      padding: "5px 0",
      fontSize: 11,
      fontWeight: 600,
      textDecoration: "none"
    }
  }, React.createElement(Icon, {
    name: "message-circle",
    size: 11
  }), " Acessar WhatsApp"));
}
const PARCEIRAS_CEGATTI = [{
  nome: "Psicóloga Parceira A",
  crp: "09/XXXXX",
  telefone: "5562999999999"
}, {
  nome: "Psicóloga Parceira B",
  crp: "09/XXXXX",
  telefone: "5562999999999"
}];
function ModalConversao({
  lead,
  onConfirmar,
  onCancelar
}) {
  const isSocial = lead._tipoConversao === "convertido_social";
  const isParceria = lead._tipoConversao === "convertido_parceria";
  const [email, setEmail] = useState("");
  const [tipoContratacao, setTipoContratacao] = useState("individual");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [parceiraSel, setParceiraSel] = useState(null);
  const [parceiras, setParceiras] = useState([]);
  const [valorPacoteParceria, setValorPacoteParceria] = useState("");
  const valorEstimado = tipoContratacao === "pacote" ? 250 : 300;
  useEffect(() => {
    db.collection("clinica_parceiras").orderBy("createdAt", "asc").onSnapshot(s => {
      const lista = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setParceiras(lista);
      if (isParceria && lista.filter(p => p.tipo === "parceira").length > 0) {
        setParceiraSel(lista.filter(p => p.tipo === "parceira")[0].id);
      }
    }, () => {});
  }, []);
  const parceiraObj = parceiras.find(p => p.id === parceiraSel) || null;
  const estagiaria = parceiras.find(p => p.tipo === "estagiaria") || null;
  const headerGrad = isParceria ? "linear-gradient(135deg,#7B00C4,#5a0090)" : isSocial ? "linear-gradient(135deg,#0d9488,#0f766e)" : "linear-gradient(135deg,#16a34a,#15803d)";
  const headerIcon = isParceria ? "🤝" : isSocial ? "📱" : "🎉";
  const headerTitulo = isParceria ? "Encaminhamento — Parceria!" : isSocial ? "Convertido pelo Social!" : "Lead Convertido!";
  async function confirmar() {
    const hoje = new Date().toISOString().slice(0, 10);
    const mesRef = hoje.slice(0, 7);
    if (isParceria) {
      const vBase = parseFloat(valorPacoteParceria) || 0;
      if (vBase <= 0) {
        setErro("Informe o valor do pacote fechado.");
        return;
      }
      setSalvando(true);
      try {
        const comissao10 = parseFloat((vBase * 0.10).toFixed(2));
        const nomePac = lead.nome || "Lead";
        const nomeParc = parceiraObj?.nome || "Parceira";
        const batch = db.batch();
        batch.set(db.collection("clinica_lancamentos").doc(), {
          tipo_lancamento: "parceria",
          tipo: `${nomePac} — Parceria ${nomeParc}`,
          descricao: `${nomePac} — Parceria ${nomeParc}`,
          pacienteNome: nomePac,
          valor: comissao10,
          data: hoje,
          mesRef,
          formaPag: "PIX",
          status: "recebido",
          origem: "convertido_parceria",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        batch.set(db.collection("clinica_comissoes").doc(), {
          tipo: "Parceria — Clínica",
          tipoVenda: "primeira",
          perc: 10,
          valorBase: vBase,
          valorComissao: comissao10,
          pacienteNome: nomePac,
          mesRef,
          status: "pendente",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (estagiaria) {
          batch.set(db.collection("clinica_comissoes").doc(), {
            tipo: "Parceria — Estagiária",
            tipoVenda: "primeira",
            perc: 10,
            valorBase: vBase,
            valorComissao: comissao10,
            pacienteNome: nomePac,
            responsavel: estagiaria.nome,
            mesRef,
            status: "pendente",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        await batch.commit();
        await db.collection("clinica_leads").doc(lead.id).update({
          status: "convertido_parceria",
          arquivado: true,
          convertidoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        setSalvo(true);
      } catch (e) {
        setErro("Erro: " + e.message);
      }
      setSalvando(false);
      return;
    }
    if (!email.trim()) {
      setErro("E-mail é obrigatório para criar o cadastro clínico.");
      return;
    }
    setSalvando(true);
    try {
      const nomePac = lead.nome || "";
      await db.collection("clinica_pacientes").add({
        nome: nomePac,
        email: email.trim().toLowerCase(),
        telefone: lead.telefone || "",
        cpf: "",
        dataNascimento: "",
        genero: "Não informar",
        status: "ativo",
        senha: "1234",
        objetivosTerapeuticos: lead.queixa || "",
        observacoesClinicas: "",
        origem: isSocial ? "projeto-social" : "crm-lead",
        leadId: lead.id,
        tipoContratacao,
        valorEstimado,
        campanhas: lead.campanhas || [],
        isSocial: isSocial || false,
        modulosConfig: MOD1_PADRAO,
        modulosAtivos: ["mod1"],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (isSocial) {
        const batch = db.batch();
        batch.set(db.collection("clinica_lancamentos").doc(), {
          tipo_lancamento: "social",
          tipo: `${nomePac} — Projeto Social`,
          descricao: `${nomePac} — Projeto Social`,
          pacienteNome: nomePac,
          valor: 40,
          data: hoje,
          mesRef,
          formaPag: "PIX",
          status: "recebido",
          origem: "convertido_social",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (estagiaria) {
          batch.set(db.collection("clinica_comissoes").doc(), {
            tipo: "Social — Estagiária",
            tipoVenda: "primeira",
            perc: 0,
            valorBase: 40,
            valorComissao: 20,
            pacienteNome: nomePac,
            responsavel: estagiaria.nome,
            mesRef,
            status: "pendente",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
        await batch.commit();
      }
      await db.collection("clinica_leads").doc(lead.id).update({
        status: lead._tipoConversao || "convertido",
        arquivado: true,
        convertidoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
      setSalvo(true);
    } catch (e) {
      setErro("Erro ao cadastrar. Tente novamente.");
    }
    setSalvando(false);
  }
  function gerarWhatsApp() {
    const parceira = parceiraObj;
    if (!parceira) {
      alert("Selecione uma parceira.");
      return;
    }
    const telPaciente = (lead.telefone || "").replace(/[^0-9]/g, "");
    const msg = `Olá, ${lead.nome || ""}! Tudo bem?
Aqui é da equipe de atendimento. Passando para informar que realizamos o seu encaminhamento clínico. Você será atendido(a) pela psicóloga ${parceira.nome}, CRP: ${parceira.crp}.
Ela faz parte dos grupos do Instituto Cegatti, que integram o projeto social e de parcerias da Doutora Lúcia Kratz.
Você pode entrar em contato diretamente com ela através do número abaixo para alinhar o seu primeiro horário:
👉 WhatsApp: https://wa.me/${parceira.telefone}
Estamos à disposição!`;
    const url = `https://wa.me/${telPaciente}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }
  function gerarWhatsAppSocial() {
    const telPaciente = (lead.telefone || "").replace(/\D/g, "");
    const msg = `Olá, ${lead.nome || ""}! Tudo bem?
Aqui é da equipe da Dra. Lúcia Kratz. Que bom ter você com a gente!
Seu cadastro foi realizado com sucesso. Entraremos em contato para alinhar os próximos passos do seu atendimento.
Estamos à disposição! 🌷`;
    const url = `https://wa.me/${telPaciente}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }
  return React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 16,
      width: "100%",
      maxWidth: 480,
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0,0,0,0.25)"
    }
  }, React.createElement("div", {
    style: {
      background: headerGrad,
      borderRadius: "16px 16px 0 0",
      padding: "24px",
      textAlign: "center",
      color: "white"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 8
    }
  }, headerIcon), React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      fontWeight: 700
    }
  }, headerTitulo), React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: 0.85,
      marginTop: 4
    }
  }, "Deseja cadastrar como Paciente na Cl\xEDnica?")), React.createElement("div", {
    style: {
      padding: "20px 24px",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      borderRadius: 10,
      padding: "12px 14px",
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "#16a34a",
      marginBottom: 8
    }
  }, "DADOS QUE SER\xC3O MIGRADOS"), React.createElement("div", {
    style: {
      fontSize: 13,
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, React.createElement("div", null, React.createElement("strong", null, "Nome:"), " ", lead.nome), lead.telefone && React.createElement("div", null, React.createElement("strong", null, "WhatsApp:"), " ", lead.telefone), lead.queixa && React.createElement("div", null, React.createElement("strong", null, "Queixa:"), " ", lead.queixa))), isParceria && React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 8
    }
  }, "Psic\xF3loga Parceira"), parceiras.filter(p => p.tipo === "parceira").length === 0 ? React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#d97706",
      padding: "8px 12px",
      background: "#fef3c7",
      borderRadius: 8
    }
  }, "Nenhuma parceira cadastrada. V\xE1 em Funil \u2192 aba Parceiras & Estagi\xE1rias.") : React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, parceiras.filter(p => p.tipo === "parceira").map(p => React.createElement("button", {
    key: p.id,
    onClick: () => setParceiraSel(p.id),
    style: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "2px solid",
      textAlign: "left",
      borderColor: parceiraSel === p.id ? "#7B00C4" : "var(--gray-200)",
      background: parceiraSel === p.id ? "#f5f3ff" : "white",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 13,
      fontWeight: 600,
      color: parceiraSel === p.id ? "#7B00C4" : "var(--text-muted)"
    }
  }, p.nome, React.createElement("span", {
    style: {
      display: "block",
      fontSize: 11,
      fontWeight: 400,
      marginTop: 2
    }
  }, p.crp && React.createElement("span", null, "CRP ", p.crp, " \xB7 "), "WhatsApp: ", p.telefone)))), React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Valor do pacote fechado (R$) ", React.createElement("span", {
    style: {
      color: "#dc2626"
    }
  }, "*")), React.createElement("input", {
    type: "number",
    value: valorPacoteParceria,
    onChange: e => setValorPacoteParceria(e.target.value),
    className: "form-input",
    placeholder: "Ex: 800"
  }), valorPacoteParceria && parseFloat(valorPacoteParceria) > 0 && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#7B00C4",
      marginTop: 6,
      background: "#f5f3ff",
      borderRadius: 6,
      padding: "6px 10px"
    }
  }, "Comiss\xE3o cl\xEDnica: ", React.createElement("b", null, "R$ ", (parseFloat(valorPacoteParceria) * 0.10).toFixed(2).replace(".", ",")), estagiaria && React.createElement("span", null, " \xB7 Comiss\xE3o estagi\xE1ria: ", React.createElement("b", null, "R$ ", (parseFloat(valorPacoteParceria) * 0.10).toFixed(2).replace(".", ",")))))), React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 8
    }
  }, "Tipo de Contrata\xE7\xE3o"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [{
    id: "individual",
    label: "Consulta Individual",
    valor: 300
  }, {
    id: "pacote",
    label: "Pacote",
    valor: 250
  }].map(op => React.createElement("button", {
    key: op.id,
    onClick: () => setTipoContratacao(op.id),
    style: {
      flex: 1,
      padding: "10px 8px",
      borderRadius: 8,
      border: "2px solid",
      borderColor: tipoContratacao === op.id ? "#16a34a" : "var(--gray-200)",
      background: tipoContratacao === op.id ? "#f0fdf4" : "white",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 12,
      fontWeight: 600,
      color: tipoContratacao === op.id ? "#16a34a" : "var(--text-muted)"
    }
  }, op.label, React.createElement("br", null), React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 400
    }
  }, "Est. R$ ", op.valor, "/sess\xE3o"))))), React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "E-mail do paciente ", React.createElement("span", {
    style: {
      color: "#dc2626"
    }
  }, "*")), React.createElement("input", {
    type: "email",
    value: email,
    onChange: e => {
      setEmail(e.target.value);
      setErro("");
    },
    className: "form-input",
    placeholder: "email@exemplo.com",
    autoFocus: true
  }), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "Necess\xE1rio para acesso ao portal. Senha inicial: ", React.createElement("strong", null, "1234"))), erro && React.createElement("div", {
    style: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: 8,
      padding: "10px 14px",
      marginTop: 12,
      fontSize: 13,
      color: "#dc2626"
    }
  }, erro), salvo && React.createElement("div", {
    style: {
      background: "#f0fdf4",
      border: "1px solid #86efac",
      borderRadius: 10,
      padding: "14px 16px",
      marginTop: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: "#059669",
      marginBottom: 10
    }
  }, "\u2705 Paciente cadastrado com sucesso!"), isParceria && React.createElement("button", {
    onClick: gerarWhatsApp,
    style: {
      width: "100%",
      padding: "12px",
      borderRadius: 8,
      border: "none",
      background: "#25D366",
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, "\uD83D\uDCF2 Gerar Mensagem para o Paciente (WhatsApp)"), (isSocial || !isParceria && !isSocial) && lead.telefone && React.createElement("button", {
    onClick: gerarWhatsAppSocial,
    style: {
      width: "100%",
      padding: "12px",
      borderRadius: 8,
      border: "none",
      background: "#25D366",
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, "\uD83D\uDCF2 Enviar boas-vindas pelo WhatsApp"), React.createElement("button", {
    onClick: onConfirmar,
    style: {
      width: "100%",
      marginTop: 8,
      padding: "10px",
      borderRadius: 8,
      border: "1px solid var(--gray-200)",
      background: "white",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit",
      color: "var(--text-muted)"
    }
  }, "Fechar"))), !salvo && React.createElement("div", {
    style: {
      padding: "16px 24px",
      display: "flex",
      gap: 10
    }
  }, React.createElement("button", {
    onClick: onCancelar,
    style: {
      flex: 1,
      padding: "11px 0",
      borderRadius: 8,
      border: "1px solid var(--gray-200)",
      background: "white",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit",
      fontWeight: 500
    }
  }, "Apenas mover o card"), React.createElement("button", {
    onClick: confirmar,
    disabled: salvando,
    style: {
      flex: 1,
      padding: "11px 0",
      borderRadius: 8,
      border: "none",
      background: isParceria ? "#7B00C4" : isSocial ? "#0d9488" : "#16a34a",
      color: "white",
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit",
      fontWeight: 700,
      opacity: salvando ? 0.7 : 1
    }
  }, salvando ? "Cadastrando..." : "✓ Sim, cadastrar paciente"))));
}
function AlertasInatividade({
  leads,
  onAbrirLead
}) {
  const [descartados, setDescartados] = useState(new Set());
  const [agora, setAgora] = useState(Date.now());
  const [expandido, setExpandido] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  function extrairMs(campo) {
    if (!campo) return null;
    if (campo.seconds) return campo.seconds * 1000;
    if (campo instanceof Date) return campo.getTime();
    if (typeof campo === "string") return new Date(campo).getTime();
    try {
      return campo.toDate().getTime();
    } catch (e) {}
    return null;
  }
  const alertas = leads.filter(l => !l.arquivado && !descartados.has(l.id) && l.status !== "perdido").reduce((acc, lead) => {
    const regra = REGRAS_INATIVIDADE.find(r => r.status === (lead.status || "novo"));
    if (!regra) return acc;
    const ms = extrairMs(lead.updatedAt) || extrairMs(lead.createdAt);
    if (!ms || isNaN(ms)) return acc;
    const inativo = agora - ms;
    if (inativo >= regra.limiteMs) acc.push({
      lead,
      regra,
      inativo
    });
    return acc;
  }, []).sort((a, b) => b.inativo - a.inativo);
  if (alertas.length === 0) return null;
  return React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, React.createElement("button", {
    onClick: () => setExpandido(e => !e),
    style: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      background: "#fef2f2",
      border: "1.5px solid #fca5a5",
      borderRadius: expandido ? "10px 10px 0 0" : 10,
      cursor: "pointer",
      textAlign: "left",
      fontFamily: "inherit"
    }
  }, React.createElement("div", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "#dc2626",
      flexShrink: 0
    }
  }), React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: "#dc2626",
      flex: 1
    }
  }, alertas.length, " alerta", alertas.length !== 1 ? "s" : "", " de inatividade"), React.createElement("span", {
    style: {
      fontSize: 11,
      color: "#dc2626",
      opacity: 0.7
    }
  }, alertas.slice(0, 2).map(a => a.lead.nome?.split(" ")[0]).join(", "), alertas.length > 2 ? ` +${alertas.length - 2}` : ""), React.createElement(Icon, {
    name: expandido ? "chevron-up" : "chevron-down",
    size: 14,
    style: {
      color: "#dc2626",
      flexShrink: 0
    }
  })), expandido && React.createElement("div", {
    style: {
      border: "1.5px solid #fca5a5",
      borderTop: "none",
      borderRadius: "0 0 10px 10px",
      overflow: "hidden"
    }
  }, alertas.map(({
    lead,
    regra,
    inativo
  }, idx) => {
    const whats = fmtWhats(lead.telefone);
    return React.createElement("div", {
      key: lead.id,
      style: {
        background: idx % 2 === 0 ? "#fef9f9" : "white",
        borderTop: idx > 0 ? "1px solid #fee2e2" : "none",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap"
      }
    }, React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("span", {
      style: {
        fontWeight: 600,
        fontSize: 12,
        color: regra.cor
      }
    }, lead.nome), React.createElement("span", {
      style: {
        fontSize: 11,
        color: "#6b7280",
        marginLeft: 6
      }
    }, regra.corpo(lead.nome, formatarTempo(inativo)).replace(lead.nome + " ", ""))), React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        flexShrink: 0
      }
    }, whats && React.createElement("a", {
      href: `https://wa.me/${whats}`,
      target: "_blank",
      rel: "noopener noreferrer",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "#16a34a",
        color: "white",
        borderRadius: 6,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 600,
        textDecoration: "none"
      }
    }, React.createElement(Icon, {
      name: "message-circle",
      size: 11
    }), " WA"), React.createElement("button", {
      onClick: () => onAbrirLead(lead),
      style: {
        background: "white",
        border: "1px solid #fca5a5",
        color: "#dc2626",
        borderRadius: 6,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit"
      }
    }, "Ver"), React.createElement("button", {
      onClick: () => setDescartados(s => new Set([...s, lead.id])),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#dc2626",
        opacity: 0.4,
        padding: "2px 4px",
        fontSize: 14,
        lineHeight: 1
      }
    }, "\xD7")));
  })));
}
function GerenciamentoParceiras() {
  const [parceiras, setParceiras] = useState([]);
  const [form, setForm] = useState({
    nome: "",
    crp: "",
    telefone: "",
    tipo: "parceira"
  });
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    db.collection("clinica_parceiras").orderBy("createdAt", "asc").onSnapshot(s => setParceiras(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
  }, []);
  async function salvar() {
    if (!form.nome.trim() || !form.telefone.trim()) {
      alert("Nome e telefone obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      if (editandoId) {
        await db.collection("clinica_parceiras").doc(editandoId).update({
          nome: form.nome,
          crp: form.crp,
          telefone: form.telefone.replace(/\D/g, ""),
          tipo: form.tipo
        });
        setEditandoId(null);
      } else {
        await db.collection("clinica_parceiras").add({
          nome: form.nome,
          crp: form.crp,
          telefone: form.telefone.replace(/\D/g, ""),
          tipo: form.tipo,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      setForm({
        nome: "",
        crp: "",
        telefone: "",
        tipo: "parceira"
      });
    } catch (e) {
      alert("Erro: " + e.message);
    }
    setSalvando(false);
  }
  async function excluir(id) {
    if (!confirm("Excluir este cadastro?")) return;
    await db.collection("clinica_parceiras").doc(id).delete();
  }
  function editar(p) {
    setForm({
      nome: p.nome,
      crp: p.crp || "",
      telefone: p.telefone || "",
      tipo: p.tipo || "parceira"
    });
    setEditandoId(p.id);
  }
  const parceirasLista = parceiras.filter(p => p.tipo === "parceira");
  const estagiariasLista = parceiras.filter(p => p.tipo === "estagiaria");
  return React.createElement("div", {
    style: {
      maxWidth: 700
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 4
    }
  }, "Parceiras & Estagi\xE1rias"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 20
    }
  }, "Psic\xF3logas parceiras e estagi\xE1rias do Instituto Cegatti"), React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 12,
      padding: 20,
      border: "1px solid #e8c8ff",
      marginBottom: 24
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 12
    }
  }, editandoId ? "✏️ Editar cadastro" : "➕ Novo cadastro"), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Nome completo *"), React.createElement("input", {
    className: "form-input",
    value: form.nome,
    onChange: e => setForm({
      ...form,
      nome: e.target.value
    }),
    placeholder: "Ex: Andr\xE9ia de F\xE1tima Mateus Silva"
  })), React.createElement("div", null, React.createElement("label", {
    className: "form-label"
  }, "CRP"), React.createElement("input", {
    className: "form-input",
    value: form.crp,
    onChange: e => setForm({
      ...form,
      crp: e.target.value
    }),
    placeholder: "Ex: 09/14031"
  })), React.createElement("div", null, React.createElement("label", {
    className: "form-label"
  }, "Telefone (WhatsApp) *"), React.createElement("input", {
    className: "form-input",
    value: form.telefone,
    onChange: e => setForm({
      ...form,
      telefone: e.target.value
    }),
    placeholder: "Ex: 5562985666960"
  })), React.createElement("div", {
    style: {
      gridColumn: "1/-1"
    }
  }, React.createElement("label", {
    className: "form-label"
  }, "Tipo"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, [["parceira", "🤝 Parceira"], ["estagiaria", "🎓 Estagiária"]].map(([v, l]) => React.createElement("button", {
    key: v,
    type: "button",
    onClick: () => setForm({
      ...form,
      tipo: v
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
      borderColor: form.tipo === v ? "#7B00C4" : "#e5e7eb",
      background: form.tipo === v ? "#f5f3ff" : "white",
      color: form.tipo === v ? "#7B00C4" : "#6b7280"
    }
  }, l))))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, editandoId && React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      setEditandoId(null);
      setForm({
        nome: "",
        crp: "",
        telefone: "",
        tipo: "parceira"
      });
    }
  }, "Cancelar"), React.createElement("button", {
    className: "btn btn-purple",
    onClick: salvar,
    disabled: salvando,
    style: {
      flex: 1
    }
  }, salvando ? "Salvando..." : editandoId ? "💾 Salvar alterações" : "➕ Cadastrar"))), parceirasLista.length > 0 && React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: "#7B00C4",
      marginBottom: 8
    }
  }, "\uD83E\uDD1D Parceiras"), parceirasLista.map(p => React.createElement("div", {
    key: p.id,
    style: {
      background: "white",
      borderRadius: 10,
      padding: "12px 16px",
      border: "1px solid #e8c8ff",
      marginBottom: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, p.nome), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, p.crp && React.createElement("span", null, "CRP ", p.crp, " \xB7 "), React.createElement("a", {
    href: `https://wa.me/${p.telefone}`,
    target: "_blank",
    style: {
      color: "#16a34a",
      textDecoration: "none"
    }
  }, "\uD83D\uDCF1 ", p.telefone))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, React.createElement("button", {
    onClick: () => editar(p),
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px",
      fontSize: 12
    }
  }, React.createElement(Icon, {
    name: "pencil",
    size: 13
  })), React.createElement("button", {
    onClick: () => excluir(p.id),
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px",
      fontSize: 12,
      color: "#dc2626"
    }
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 13
  })))))), estagiariasLista.length > 0 && React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13,
      color: "#0891b2",
      marginBottom: 8
    }
  }, "\uD83C\uDF93 Estagi\xE1rias"), estagiariasLista.map(p => React.createElement("div", {
    key: p.id,
    style: {
      background: "white",
      borderRadius: 10,
      padding: "12px 16px",
      border: "1px solid #bae6fd",
      marginBottom: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, p.nome), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, p.crp && React.createElement("span", null, "CRP ", p.crp, " \xB7 "), React.createElement("a", {
    href: `https://wa.me/${p.telefone}`,
    target: "_blank",
    style: {
      color: "#16a34a",
      textDecoration: "none"
    }
  }, "\uD83D\uDCF1 ", p.telefone))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6
    }
  }, React.createElement("button", {
    onClick: () => editar(p),
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px",
      fontSize: 12
    }
  }, React.createElement(Icon, {
    name: "pencil",
    size: 13
  })), React.createElement("button", {
    onClick: () => excluir(p.id),
    className: "btn btn-ghost",
    style: {
      padding: "6px 10px",
      fontSize: 12,
      color: "#dc2626"
    }
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 13
  })))))), parceiras.length === 0 && React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "32px 0",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhuma parceira ou estagi\xE1ria cadastrada ainda."));
}
function FunilLeads({
  user
}) {
  const [leads, setLeads] = useState([]);
  const [modalLead, setModalLead] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [modalConversao, setModalConversao] = useState(null);
  const [abaFunil, setAbaFunil] = useState("kanban");
  const [busca, setBusca] = useState("");
  const [filtroTemp, setFiltroTemp] = useState("todos");
  useEffect(() => {
    db.collection("clinica_leads").onSnapshot(s => setLeads(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
  }, []);
  async function moverLead(leadId, novoStatus) {
    await db.collection("clinica_leads").doc(leadId).update({
      status: novoStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(() => {});
  }
  function onDrop(e, colId) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) {
      setDragOver(null);
      return;
    }
    if (colId === "convertido" || colId === "convertido_social" || colId === "convertido_parceria") {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        moverLead(leadId, colId);
        setModalConversao({
          ...lead,
          _tipoConversao: colId
        });
      }
    } else {
      moverLead(leadId, colId);
    }
    setDragOver(null);
  }
  const leadsColuna = colId => leads.filter(l => {
    if ((l.status || "novo") !== colId || l.arquivado) return false;
    if (filtroTemp !== "todos" && (l.temperatura || "morno") !== filtroTemp) return false;
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      const nome = (l.nome || "").toLowerCase();
      const tel = (l.telefone || "").replace(/\D/g, "");
      const qTel = q.replace(/\D/g, "");
      if (!nome.includes(q) && !tel.includes(qTel)) return false;
    }
    return true;
  });
  return React.createElement("div", {
    style: {
      padding: "20px 24px"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 600
    }
  }, "Funil de Leads"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, leads.filter(l => !l.arquivado).length, " lead", leads.filter(l => !l.arquivado).length !== 1 ? "s" : "", " no funil")), abaFunil === "kanban" && React.createElement("button", {
    onClick: () => setModalLead({}),
    className: "btn-primary",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(Icon, {
    name: "plus",
    size: 15
  }), " Novo Lead")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginBottom: 20,
      borderBottom: "2px solid var(--gray-100)",
      paddingBottom: 0
    }
  }, [["kanban", "📋 Kanban"], ["parceiras", "🤝 Parceiras & Estagiárias"]].map(([id, label]) => React.createElement("button", {
    key: id,
    onClick: () => setAbaFunil(id),
    style: {
      padding: "8px 16px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 13,
      fontWeight: abaFunil === id ? 700 : 400,
      color: abaFunil === id ? "#7B00C4" : "var(--text-muted)",
      borderBottom: abaFunil === id ? "2px solid #7B00C4" : "2px solid transparent",
      marginBottom: -2,
      transition: "all .15s"
    }
  }, label))), abaFunil === "parceiras" && React.createElement(GerenciamentoParceiras, null), abaFunil === "kanban" && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 12,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, React.createElement("div", {
    style: {
      position: "relative",
      flex: 1,
      minWidth: 200
    }
  }, React.createElement(Icon, {
    name: "search",
    size: 15,
    style: {
      position: "absolute",
      left: 10,
      top: "50%",
      transform: "translateY(-50%)",
      color: "#9ca3af",
      pointerEvents: "none"
    }
  }), React.createElement("input", {
    value: busca,
    onChange: e => setBusca(e.target.value),
    placeholder: "Buscar por nome ou telefone...",
    style: {
      width: "100%",
      padding: "9px 12px 9px 34px",
      border: "1.5px solid",
      borderColor: busca ? "#7B00C4" : "#e5e7eb",
      borderRadius: 8,
      fontSize: 13,
      fontFamily: "inherit",
      outline: "none",
      transition: "border-color .15s"
    }
  }), busca && React.createElement("button", {
    onClick: () => setBusca(""),
    style: {
      position: "absolute",
      right: 8,
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 18,
      color: "#9ca3af",
      lineHeight: 1
    }
  }, "\xD7")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, [{
    v: "todos",
    l: "Todos",
    e: ""
  }, {
    v: "quente",
    l: "Quentes",
    e: "🔥"
  }, {
    v: "morno",
    l: "Mornos",
    e: "🌡️"
  }, {
    v: "frio",
    l: "Frios",
    e: "🧊"
  }].map(({
    v,
    l,
    e
  }) => React.createElement("button", {
    key: v,
    onClick: () => setFiltroTemp(v),
    style: {
      padding: "6px 12px",
      borderRadius: 20,
      border: "1.5px solid",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: filtroTemp === v ? 700 : 400,
      fontFamily: "inherit",
      borderColor: filtroTemp === v ? "#7B00C4" : "#e5e7eb",
      background: filtroTemp === v ? "#7B00C4" : "white",
      color: filtroTemp === v ? "white" : "#6b7280",
      transition: "all .15s"
    }
  }, e && React.createElement("span", {
    style: {
      marginRight: 3
    }
  }, e), l)))), React.createElement(AlertasInatividade, {
    leads: leads,
    onAbrirLead: l => setModalLead(l)
  }), busca.trim() || filtroTemp !== "todos" ? (() => {
    const ORDEM_TEMP = {
      quente: 0,
      morno: 1,
      frio: 2
    };
    const resultados = leads.filter(l => {
      if (l.arquivado) return false;
      if (filtroTemp !== "todos" && (l.temperatura || "morno") !== filtroTemp) return false;
      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        const nome = (l.nome || "").toLowerCase();
        const tel = (l.telefone || "").replace(/\D/g, "");
        const qTel = q.replace(/\D/g, "");
        if (!nome.includes(q) && (qTel.length < 3 || !tel.includes(qTel))) return false;
      }
      return true;
    }).sort((a, b) => {
      const ta = ORDEM_TEMP[a.temperatura || "morno"] ?? 1;
      const tb = ORDEM_TEMP[b.temperatura || "morno"] ?? 1;
      if (ta !== tb) return ta - tb;
      return (a.nome || "").localeCompare(b.nome || "");
    });
    const TEMP_CFG = {
      quente: {
        e: "🔥",
        c: "#dc2626",
        bg: "#fef2f2"
      },
      morno: {
        e: "🌡️",
        c: "#d97706",
        bg: "#fef3c7"
      },
      frio: {
        e: "🧊",
        c: "#0891b2",
        bg: "#e0f2fe"
      }
    };
    return React.createElement("div", null, React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 10,
        fontWeight: 500
      }
    }, resultados.length, " resultado", resultados.length !== 1 ? "s" : "", " ", busca ? `para "${busca}"` : "", filtroTemp !== "todos" ? ` · ${filtroTemp}s` : "", " ", React.createElement("button", {
      onClick: () => {
        setBusca("");
        setFiltroTemp("todos");
      },
      style: {
        background: "none",
        border: "none",
        color: "#7B00C4",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        padding: 0
      }
    }, "limpar")), resultados.length === 0 && React.createElement("div", {
      style: {
        textAlign: "center",
        padding: 40,
        color: "#9ca3af",
        fontSize: 13
      }
    }, "Nenhum lead encontrado."), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, resultados.map(lead => {
      const tcfg = TEMP_CFG[lead.temperatura || "morno"] || TEMP_CFG.morno;
      const col = COLUNAS_FUNIL.find(c => c.id === (lead.status || "novo"));
      return React.createElement("div", {
        key: lead.id,
        onClick: () => setModalLead(lead),
        style: {
          background: "white",
          border: "1.5px solid #e5e7eb",
          borderRadius: 10,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          transition: "border-color .15s"
        },
        onMouseEnter: e => e.currentTarget.style.borderColor = "#7B00C4",
        onMouseLeave: e => e.currentTarget.style.borderColor = "#e5e7eb"
      }, React.createElement("span", {
        style: {
          fontSize: 18,
          flexShrink: 0
        }
      }, tcfg.e), React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, React.createElement("div", {
        style: {
          fontWeight: 600,
          fontSize: 13,
          color: "#111827",
          marginBottom: 2
        }
      }, lead.nome || "—"), React.createElement("div", {
        style: {
          fontSize: 11,
          color: "#6b7280"
        }
      }, lead.telefone || "", lead.servico ? ` · ${lead.servico}` : "")), col && React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: col.cor,
          background: col.cor + "18",
          borderRadius: 20,
          padding: "2px 8px",
          flexShrink: 0
        }
      }, col.label), React.createElement(Icon, {
        name: "chevron-right",
        size: 14,
        style: {
          color: "#9ca3af",
          flexShrink: 0
        }
      }));
    })));
  })() : null, !busca.trim() && filtroTemp === "todos" && React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
      gap: 12,
      minWidth: 0
    }
  }, COLUNAS_FUNIL.map(col => {
    const cards = leadsColuna(col.id);
    const isOver = dragOver === col.id;
    return React.createElement("div", {
      key: col.id,
      onDragOver: e => {
        e.preventDefault();
        setDragOver(col.id);
      },
      onDragLeave: () => setDragOver(null),
      onDrop: e => onDrop(e, col.id),
      style: {
        background: isOver ? col.bg : "#f9fafb",
        borderRadius: 12,
        padding: "12px 10px",
        border: isOver ? `2px solid ${col.cor}` : "2px solid transparent",
        transition: "all .15s",
        minHeight: 400
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, React.createElement("div", {
      style: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: col.cor
      }
    }), React.createElement("span", {
      style: {
        fontWeight: 700,
        fontSize: 12,
        color: col.cor
      }
    }, col.label.toUpperCase())), React.createElement("span", {
      style: {
        background: col.cor + "20",
        color: col.cor,
        borderRadius: 20,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700
      }
    }, cards.length)), cards.map(lead => React.createElement(CardLead, {
      key: lead.id,
      lead: lead,
      onEditar: l => setModalLead(l),
      onMover: moverLead,
      colunas: COLUNAS_FUNIL
    })), cards.length === 0 && React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "20px 0",
        color: "var(--gray-400)",
        fontSize: 12
      }
    }, isOver ? "Solte aqui" : "Nenhum lead"));
  })), modalLead !== null && React.createElement(ModalLead, {
    lead: modalLead?.id ? modalLead : null,
    user: user,
    onConverter: l => {
      setModalLead(null);
      setModalConversao(l);
    },
    onSalvar: () => setModalLead(null),
    onFechar: () => setModalLead(null)
  }), modalConversao && React.createElement(ModalConversao, {
    lead: modalConversao,
    onConfirmar: () => setModalConversao(null),
    onCancelar: () => setModalConversao(null)
  })));
}
const CPL_LIMITES = {
  nacional: {
    verde: 10,
    amarelo: 15
  },
  internacional: {
    verde: 50,
    amarelo: 999
  }
};
function badgeCPL(cpl, abrangencia) {
  const lim = CPL_LIMITES[abrangencia || "nacional"];
  if (cpl <= lim.verde) return {
    cor: "#16a34a",
    bg: "#f0fdf4",
    label: "✅ Saudável"
  };
  if (cpl <= lim.amarelo) return {
    cor: "#d97706",
    bg: "#fef3c7",
    label: "⚠️ Atenção"
  };
  const aviso = abrangencia === "internacional" ? "🚨 Alerta de teto atingido. Custo de captação internacional inviabilizando o retorno do consultório." : "🚨 Custo acima do limite realista para o mercado nacional. Avaliar pausa imediata do anúncio.";
  return {
    cor: "#dc2626",
    bg: "#fef2f2",
    label: "🚨 Acima do limite",
    aviso
  };
}
function AnaliseCampanha({
  campanha,
  user
}) {
  const [comentarios, setComentarios] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [uploadando, setUploadando] = useState(false);
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    const unsub = db.collection("clinica_campanhas").doc(campanha.id).collection("analises").orderBy("createdAt", "asc").onSnapshot(s => setComentarios(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    const unsubPdf = db.collection("clinica_campanhas").doc(campanha.id).collection("relatorios").orderBy("createdAt", "desc").onSnapshot(s => setPdfs(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    return () => {
      unsub();
      unsubPdf();
    };
  }, [campanha.id, aberto]);
  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await db.collection("clinica_campanhas").doc(campanha.id).collection("analises").add({
        texto: texto.trim(),
        autor: user?.nome || "Usuário",
        tipo: user?.tipo || "psicologa",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setTexto("");
    } catch (e) {
      alert("Erro ao enviar.");
    }
    setEnviando(false);
  }
  async function uploadPdf(e) {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Selecione um arquivo PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 5MB.");
      return;
    }
    setUploadando(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        await db.collection("clinica_campanhas").doc(campanha.id).collection("relatorios").add({
          nome: file.name,
          tamanho: (file.size / 1024).toFixed(0) + "KB",
          base64: ev.target.result,
          autor: user?.nome || "Usuário",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        alert("Erro ao fazer upload.");
      }
      setUploadando(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  async function excluirPdf(id) {
    if (!window.confirm("Excluir este relatório?")) return;
    await db.collection("clinica_campanhas").doc(campanha.id).collection("relatorios").doc(id).delete();
  }
  async function excluirComentario(id) {
    await db.collection("clinica_campanhas").doc(campanha.id).collection("analises").doc(id).delete();
  }
  function fmtDH(ts) {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  const corTipo = {
    psicologa: "#7B00C4",
    marketing: "#ea580c",
    secretaria: "#0891b2"
  };
  return React.createElement("div", {
    style: {
      border: "1px solid var(--gray-200)",
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 12,
      background: "white"
    }
  }, React.createElement("button", {
    onClick: () => setAberto(x => !x),
    style: {
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "14px 18px",
      background: "white",
      border: "none",
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, React.createElement("span", {
    style: {
      background: "#ea580c18",
      color: "#ea580c",
      borderRadius: 20,
      padding: "3px 12px",
      fontSize: 12,
      fontWeight: 600
    }
  }, campanha.nome), React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, campanha.abrangencia === "internacional" ? "🌍 Internacional" : "🇧🇷 Nacional"), comentarios.length > 0 && React.createElement("span", {
    style: {
      background: "#7B00C418",
      color: "#7B00C4",
      borderRadius: 20,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 600
    }
  }, "\uD83D\uDCAC ", comentarios.length), pdfs.length > 0 && React.createElement("span", {
    style: {
      background: "#dc262618",
      color: "#dc2626",
      borderRadius: 20,
      padding: "2px 8px",
      fontSize: 11,
      fontWeight: 600
    }
  }, "\uD83D\uDCC4 ", pdfs.length)), React.createElement(Icon, {
    name: aberto ? "chevron-up" : "chevron-down",
    size: 16
  })), aberto && React.createElement("div", {
    style: {
      borderTop: "1px solid var(--gray-100)",
      background: "#fafafa"
    }
  }, React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "\uD83D\uDCC4 Relat\xF3rios em PDF"), React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "#7B00C4",
      color: "white",
      borderRadius: 8,
      padding: "6px 14px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, React.createElement(Icon, {
    name: "upload",
    size: 13
  }), " ", uploadando ? "Enviando..." : "Upload PDF", React.createElement("input", {
    type: "file",
    accept: ".pdf",
    onChange: uploadPdf,
    style: {
      display: "none"
    },
    disabled: uploadando
  }))), pdfs.length === 0 ? React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "Nenhum relat\xF3rio ainda.") : pdfs.map(pdf => React.createElement("div", {
    key: pdf.id,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "white",
      borderRadius: 8,
      padding: "10px 14px",
      border: "1px solid var(--gray-100)",
      marginBottom: 6
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, "\uD83D\uDCC4"), React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, pdf.nome), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, pdf.tamanho, " \xB7 ", pdf.autor, " \xB7 ", fmtDH(pdf.createdAt)))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, React.createElement("a", {
    href: pdf.base64,
    download: pdf.nome,
    style: {
      background: "#f0fdf4",
      color: "#16a34a",
      borderRadius: 6,
      padding: "5px 10px",
      fontSize: 11,
      fontWeight: 600,
      textDecoration: "none"
    }
  }, "\u2B07 Baixar"), (user?.tipo === "psicologa" || pdf.autor === user?.nome) && React.createElement("button", {
    onClick: () => excluirPdf(pdf.id),
    style: {
      background: "#fef2f2",
      color: "#dc2626",
      border: "none",
      borderRadius: 6,
      padding: "5px 10px",
      fontSize: 11,
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, "\uD83D\uDDD1"))))), React.createElement("div", {
    style: {
      padding: "14px 18px"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 12
    }
  }, "\uD83D\uDCAC An\xE1lise e A\xE7\xF5es de Ajuste"), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginBottom: 14,
      maxHeight: 300,
      overflowY: "auto",
      padding: "4px 0"
    }
  }, comentarios.length === 0 ? React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      textAlign: "center",
      padding: 16
    }
  }, "Nenhuma an\xE1lise ainda.") : comentarios.map(c => {
    const isMe = c.autor === user?.nome;
    return React.createElement("div", {
      key: c.id,
      style: {
        display: "flex",
        flexDirection: isMe ? "row-reverse" : "row",
        gap: 8,
        alignItems: "flex-start"
      }
    }, React.createElement("div", {
      style: {
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: corTipo[c.tipo] || "#7B00C4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 700,
        fontSize: 12,
        flexShrink: 0
      }
    }, (c.autor || "?")[0].toUpperCase()), React.createElement("div", {
      style: {
        maxWidth: "75%"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 3,
        flexDirection: isMe ? "row-reverse" : "row"
      }
    }, React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: corTipo[c.tipo] || "#7B00C4"
      }
    }, c.autor), React.createElement("span", {
      style: {
        fontSize: 10,
        color: "var(--gray-400)"
      }
    }, fmtDH(c.createdAt))), React.createElement("div", {
      style: {
        background: isMe ? "#7B00C4" : "white",
        color: isMe ? "white" : "var(--text)",
        borderRadius: isMe ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
        padding: "10px 14px",
        fontSize: 13,
        lineHeight: 1.6,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        border: isMe ? "none" : "1px solid var(--gray-100)"
      }
    }, c.texto), (user?.tipo === "psicologa" || isMe) && React.createElement("button", {
      onClick: () => excluirComentario(c.id),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 10,
        color: "var(--gray-400)",
        marginTop: 2,
        padding: "0 4px",
        fontFamily: "inherit",
        float: isMe ? "right" : "left"
      },
      onMouseEnter: e => e.currentTarget.style.color = "#dc2626",
      onMouseLeave: e => e.currentTarget.style.color = "var(--gray-400)"
    }, "excluir")));
  })), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "flex-end"
    }
  }, React.createElement(TextAreaVoz, {
    value: texto,
    onChange: e => setTexto(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviar();
      }
    },
    rows: 2,
    placeholder: "Escreva sua an\xE1lise ou a\xE7\xE3o de ajuste... (Enter para enviar)",
    className: "form-input",
    style: {
      flex: 1,
      resize: "none",
      fontSize: 13
    }
  }), React.createElement("button", {
    onClick: enviar,
    disabled: enviando || !texto.trim(),
    style: {
      background: "#7B00C4",
      color: "white",
      border: "none",
      borderRadius: 8,
      padding: "10px 14px",
      cursor: "pointer",
      opacity: !texto.trim() || enviando ? 0.5 : 1,
      flexShrink: 0
    }
  }, React.createElement(Icon, {
    name: "send",
    size: 16
  }))), React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "Enter para enviar \xB7 Shift+Enter para nova linha"))));
}
function AnaliseCampanhas({
  campanhas,
  user
}) {
  if (campanhas.length === 0) return null;
  return React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 4
    }
  }, "\uD83D\uDCCA An\xE1lise por Campanha"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginBottom: 16
    }
  }, "Relat\xF3rios em PDF e chat de estrat\xE9gia entre Psic\xF3loga e Marketing."), campanhas.map(c => React.createElement(AnaliseCampanha, {
    key: c.id,
    campanha: c,
    user: user
  })));
}
function DashboardPerformance({
  user
}) {
  const [leads, setLeads] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [campanhas, setCampanhas] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [lancClinica, setLancClinica] = useState([]);
  const [periodo, setPeriodo] = useState({
    de: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    ate: new Date().toISOString().slice(0, 10)
  });
  useEffect(() => {
    db.collection("clinica_leads").onSnapshot(s => setLeads(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    db.collection("clinica_pacientes").where("origem", "==", "crm-lead").onSnapshot(s => setPacientes(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    db.collection("clinica_campanhas").onSnapshot(s => setCampanhas(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    db.collection("clinica_lancamentos").where("origem", "==", "crm-marketing").onSnapshot(s => setLancamentos(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    db.collection("clinica_lancamentos").where("tipo_lancamento", "!=", "despesa").onSnapshot(s => setLancClinica(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
  }, []);
  function noPeriodo(data) {
    return data >= periodo.de && data <= periodo.ate;
  }
  const leadsFiltrados = leads.filter(l => {
    const d = l.createdAt?.toDate?.()?.toISOString().slice(0, 10) || "";
    return d >= periodo.de && d <= periodo.ate;
  });
  const convertidosFiltrados = pacientes.filter(p => {
    const d = p.createdAt?.toDate?.()?.toISOString().slice(0, 10) || "";
    return d >= periodo.de && d <= periodo.ate;
  });
  const lancFiltrados = lancamentos.filter(l => l.data && noPeriodo(l.data));
  const totalLeads = leadsFiltrados.length;
  const totalConvertidos = convertidosFiltrados.length;
  const taxaConversao = totalLeads > 0 ? (totalConvertidos / totalLeads * 100).toFixed(1) : 0;
  const totalInvestido = lancFiltrados.reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const cac = totalConvertidos > 0 ? totalInvestido / totalConvertidos : 0;
  const idsConversos = new Set(convertidosFiltrados.map(p => p.id));
  const receitaReal = lancClinica.filter(l => l.pacienteId && idsConversos.has(l.pacienteId) && (l.status === "recebido" || l.status === "pago")).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  const pacientesComReceita = new Set(lancClinica.filter(l => l.pacienteId && idsConversos.has(l.pacienteId)).map(l => l.pacienteId));
  const pacientesSemReceita = convertidosFiltrados.filter(p => !pacientesComReceita.has(p.id));
  const receitaEstimada = pacientesSemReceita.reduce((a, p) => a + (p.valorEstimado || 300), 0);
  const receitaTotal = receitaReal + receitaEstimada;
  const roi = totalInvestido > 0 ? ((receitaTotal - totalInvestido) / totalInvestido * 100).toFixed(1) : 0;
  const porCampanha = campanhas.map(camp => {
    const leadsC = leadsFiltrados.filter(l => (l.campanhas || []).includes(camp.nome));
    const convertC = convertidosFiltrados.filter(p => (p.campanhas || []).includes(camp.nome));
    const investidoC = lancFiltrados.filter(l => l.campanhaNome === camp.nome).reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
    const cpl = leadsC.length > 0 && investidoC > 0 ? investidoC / leadsC.length : 0;
    const receitaC = convertC.reduce((a, p) => {
      const real = lancClinica.filter(l => l.pacienteId === p.id && (l.status === "recebido" || l.status === "pago")).reduce((x, l) => x + (parseFloat(l.valor) || 0), 0);
      return a + (real > 0 ? real : p.valorEstimado || 300);
    }, 0);
    const roiC = investidoC > 0 ? ((receitaC - investidoC) / investidoC * 100).toFixed(1) : "—";
    const badge = cpl > 0 ? badgeCPL(cpl, camp.abrangencia) : null;
    return {
      ...camp,
      leadsC: leadsC.length,
      convertC: convertC.length,
      investidoC,
      cpl,
      receitaC,
      roiC,
      badge
    };
  }).filter(c => c.leadsC > 0 || c.investidoC > 0);
  function fmtR(v) {
    return "R$ " + parseFloat(v || 0).toFixed(2).replace(".", ",");
  }
  function fmtPct(v) {
    return v + "%";
  }
  return React.createElement("div", {
    style: {
      padding: "20px 28px",
      maxWidth: 1000
    }
  }, React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 700
    }
  }, "Dashboard de Performance"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, "M\xE9tricas de capta\xE7\xE3o, custo e retorno")), React.createElement("div", {
    style: {
      background: "white",
      border: "1px solid var(--gray-200)",
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "\uD83D\uDCC5 Per\xEDodo:"), React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, React.createElement("input", {
    type: "date",
    value: periodo.de,
    onChange: e => setPeriodo(p => ({
      ...p,
      de: e.target.value
    })),
    style: {
      border: "1px solid var(--gray-200)",
      borderRadius: 6,
      padding: "5px 8px",
      fontSize: 12,
      fontFamily: "inherit"
    }
  }), React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, "at\xE9"), React.createElement("input", {
    type: "date",
    value: periodo.ate,
    onChange: e => setPeriodo(p => ({
      ...p,
      ate: e.target.value
    })),
    style: {
      border: "1px solid var(--gray-200)",
      borderRadius: 6,
      padding: "5px 8px",
      fontSize: 12,
      fontFamily: "inherit"
    }
  })), React.createElement("button", {
    onClick: () => setPeriodo({
      de: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      ate: new Date().toISOString().slice(0, 10)
    }),
    style: {
      background: "var(--gray-100)",
      border: "none",
      borderRadius: 6,
      padding: "5px 12px",
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "inherit"
    }
  }, "Este m\xEAs")), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 14,
      marginBottom: 24
    }
  }, [{
    label: "Leads Recebidos",
    valor: totalLeads,
    icon: "users",
    cor: "#7B00C4"
  }, {
    label: "Convertidos",
    valor: totalConvertidos,
    icon: "check-circle",
    cor: "#16a34a"
  }, {
    label: "Taxa de Conversão",
    valor: fmtPct(taxaConversao),
    icon: "trending-up",
    cor: "#0891b2"
  }, {
    label: "Total Investido",
    valor: fmtR(totalInvestido),
    icon: "dollar-sign",
    cor: "#ea580c"
  }].map((c, i) => React.createElement("div", {
    key: i,
    style: {
      background: "white",
      borderRadius: 12,
      padding: "16px 18px",
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      fontWeight: 500
    }
  }, c.label), React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      background: c.cor + "18",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement(Icon, {
    name: c.icon,
    size: 15,
    style: {
      color: c.cor
    }
  }))), React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 700,
      color: c.cor
    }
  }, c.valor)))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginBottom: 24
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 12,
      padding: 20,
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)",
      marginBottom: 8
    }
  }, "\uD83D\uDCB0 CAC \u2014 CUSTO DE AQUISI\xC7\xC3O POR CLIENTE"), React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      color: cac > 300 ? "#dc2626" : "#16a34a",
      marginBottom: 4
    }
  }, fmtR(cac)), cac > 300 && React.createElement("div", {
    style: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 12,
      color: "#dc2626"
    }
  }, "\u26A0\uFE0F CAC acima de R$ 300,00 \u2014 avaliar efici\xEAncia das campanhas"), cac > 0 && cac <= 300 && React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#16a34a"
    }
  }, "\u2705 Dentro do limite saud\xE1vel (at\xE9 R$ 300,00)"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 8
    }
  }, "Total investido \xF7 pacientes convertidos no per\xEDodo")), React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 12,
      padding: 20,
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "var(--text-muted)",
      marginBottom: 8
    }
  }, "\uD83D\uDCC8 ROI \u2014 RETORNO SOBRE INVESTIMENTO"), React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      color: parseFloat(roi) >= 0 ? "#16a34a" : "#dc2626",
      marginBottom: 4
    }
  }, roi, "%"), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, React.createElement("div", null, "Receita real: ", React.createElement("strong", {
    style: {
      color: "#16a34a"
    }
  }, fmtR(receitaReal))), React.createElement("div", null, "Receita estimada: ", React.createElement("strong", {
    style: {
      color: "#0891b2"
    }
  }, fmtR(receitaEstimada)), " (", pacientesSemReceita.length, " pac. sem lan\xE7amentos)"), React.createElement("div", null, "Total investido: ", React.createElement("strong", {
    style: {
      color: "#ea580c"
    }
  }, fmtR(totalInvestido)))))), porCampanha.length > 0 && React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 12,
      border: "1px solid var(--gray-200)",
      overflow: "hidden",
      marginBottom: 24
    }
  }, React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--gray-100)",
      fontWeight: 600,
      fontSize: 14
    }
  }, "\uD83C\uDFAF Performance por Campanha"), React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "var(--gray-50)"
    }
  }, ["Campanha", "Tipo", "Leads", "Convertidos", "Investido", "CPL", "Receita", "ROI", "Status CPL"].map(h => React.createElement("th", {
    key: h,
    style: {
      padding: "10px 14px",
      textAlign: "left",
      fontWeight: 600,
      color: "var(--text-muted)",
      fontSize: 11,
      whiteSpace: "nowrap"
    }
  }, h)))), React.createElement("tbody", null, porCampanha.map(c => {
    const b = c.badge;
    return React.createElement("tr", {
      key: c.id,
      style: {
        borderTop: "1px solid var(--gray-100)"
      }
    }, React.createElement("td", {
      style: {
        padding: "12px 14px",
        fontWeight: 600
      }
    }, c.nome), React.createElement("td", {
      style: {
        padding: "12px 14px"
      }
    }, React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: c.abrangencia === "internacional" ? "#7B00C4" : "#0891b2"
      }
    }, c.abrangencia === "internacional" ? "🌍 Intl" : "🇧🇷 Nac")), React.createElement("td", {
      style: {
        padding: "12px 14px",
        textAlign: "center"
      }
    }, c.leadsC), React.createElement("td", {
      style: {
        padding: "12px 14px",
        textAlign: "center",
        color: "#16a34a",
        fontWeight: 600
      }
    }, c.convertC), React.createElement("td", {
      style: {
        padding: "12px 14px",
        color: "#ea580c",
        fontWeight: 500
      }
    }, fmtR(c.investidoC)), React.createElement("td", {
      style: {
        padding: "12px 14px",
        fontWeight: 700,
        color: b?.cor || "var(--text-muted)"
      }
    }, c.cpl > 0 ? fmtR(c.cpl) : "—"), React.createElement("td", {
      style: {
        padding: "12px 14px",
        color: "#16a34a",
        fontWeight: 500
      }
    }, fmtR(c.receitaC)), React.createElement("td", {
      style: {
        padding: "12px 14px",
        fontWeight: 700,
        color: parseFloat(c.roiC) >= 0 ? "#16a34a" : "#dc2626"
      }
    }, c.roiC !== "—" ? c.roiC + "%" : "—"), React.createElement("td", {
      style: {
        padding: "12px 14px"
      }
    }, b ? React.createElement("div", null, React.createElement("span", {
      style: {
        background: b.bg,
        color: b.cor,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap"
      }
    }, b.label), b.aviso && React.createElement("div", {
      style: {
        fontSize: 10,
        color: b.cor,
        marginTop: 4,
        maxWidth: 200,
        lineHeight: 1.4
      }
    }, b.aviso)) : "—"));
  }))))), porCampanha.length === 0 && React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 12,
      border: "1px solid var(--gray-200)",
      padding: 32,
      textAlign: "center",
      color: "var(--text-muted)",
      fontSize: 13
    }
  }, "Nenhuma campanha com dados no per\xEDodo selecionado. Crie campanhas no Funil de Leads e lance gastos em Marketing para ver as m\xE9tricas."), React.createElement(AnaliseCampanhas, {
    campanhas: campanhas,
    user: user
  }));
}
function CentralLancamentosMarketing() {
  const [campanhas, setCampanhas] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [novaCampanha, setNovaCampanha] = useState("");
  const [novaAbrangencia, setNovaAbrangencia] = useState("nacional");
  const [criandoCamp, setCriandoCamp] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    tipoDespesa: "trafego",
    descricao: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    campanhaId: ""
  });
  useEffect(() => {
    db.collection("clinica_campanhas").orderBy("nome").onSnapshot(s => setCampanhas(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    db.collection("clinica_lancamentos").where("origem", "==", "crm-marketing").orderBy("createdAt", "desc").limit(20).onSnapshot(s => setLancamentos(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), err => {
      db.collection("clinica_lancamentos").where("origem", "==", "crm-marketing").onSnapshot(s => setLancamentos(s.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))), () => {});
    });
  }, []);
  const TIPOS = [{
    id: "trafego",
    label: "Impulsionamento / Tráfego Pago"
  }, {
    id: "agencia",
    label: "Honorários da Equipe / Agência"
  }];
  const f = (k, v) => setForm(x => ({
    ...x,
    [k]: v
  }));
  async function criarCampanha() {
    if (!novaCampanha.trim()) return;
    if (campanhas.find(c => c.nome.toLowerCase() === novaCampanha.trim().toLowerCase())) {
      setMsg({
        tipo: "erro",
        texto: "Campanha já existe."
      });
      return;
    }
    try {
      const ref = await db.collection("clinica_campanhas").add({
        nome: novaCampanha.trim(),
        abrangencia: novaAbrangencia,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      f("campanhaId", ref.id);
      setNovaCampanha("");
      setNovaAbrangencia("nacional");
      setCriandoCamp(false);
    } catch (e) {
      setMsg({
        tipo: "erro",
        texto: "Erro ao criar campanha."
      });
    }
  }
  async function salvar() {
    if (!form.descricao?.trim()) {
      setMsg({
        tipo: "erro",
        texto: "Descrição é obrigatória."
      });
      return;
    }
    if (!form.valor || !form.data) {
      setMsg({
        tipo: "erro",
        texto: "Valor e data são obrigatórios."
      });
      return;
    }
    if (parseFloat(form.valor) <= 0) {
      setMsg({
        tipo: "erro",
        texto: "Valor deve ser maior que zero."
      });
      return;
    }
    setSalvando(true);
    try {
      const campanha = campanhas.find(c => c.id === form.campanhaId);
      await db.collection("clinica_lancamentos").add({
        tipo_lancamento: "despesa",
        tipo: form.descricao.trim(),
        categoria: "Marketing",
        descricao: form.descricao.trim(),
        tipoDespesaMkt: form.tipoDespesa,
        campanhaId: form.campanhaId || null,
        campanhaNome: campanha?.nome || null,
        valor: parseFloat(form.valor),
        data: form.data,
        formaPag: "PIX",
        status: "pago",
        origem: "crm-marketing",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setMsg({
        tipo: "ok",
        texto: `✓ Lançado R$ ${parseFloat(form.valor).toFixed(2).replace(".", ",")} — ${form.descricao.trim()}`
      });
      setForm({
        tipoDespesa: "trafego",
        descricao: "",
        valor: "",
        data: new Date().toISOString().slice(0, 10),
        campanhaId: ""
      });
      setTimeout(() => setMsg(null), 4000);
    } catch (e) {
      setMsg({
        tipo: "erro",
        texto: "Erro ao salvar. Tente novamente."
      });
    }
    setSalvando(false);
  }
  async function excluir(lanc) {
    if (!window.confirm(`Excluir o lançamento "${lanc.descricao}" de ${fmtVal(lanc.valor)}? Esta ação não pode ser desfeita.`)) return;
    await db.collection("clinica_lancamentos").doc(lanc.id).delete().catch(() => {});
  }
  const lancamentosFiltrados = lancamentos.filter(l => l.data?.startsWith(mesFiltro));
  const totalMes = lancamentosFiltrados.reduce((a, l) => a + (parseFloat(l.valor) || 0), 0);
  function fmtData(d) {
    return d ? d.split("-").reverse().join("/") : "—";
  }
  function fmtVal(v) {
    return "R$ " + parseFloat(v || 0).toFixed(2).replace(".", ",");
  }
  return React.createElement("div", {
    style: {
      marginTop: 28
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15
    }
  }, "\uD83D\uDCB8 Central de Lan\xE7amentos"), React.createElement("div", {
    style: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: 8,
      padding: "6px 14px",
      fontSize: 12,
      color: "#dc2626",
      fontWeight: 600
    }
  }, "\uD83D\uDD12 Vis\xEDvel apenas para Administradora")), React.createElement("div", {
    style: {
      background: "white",
      border: "1px solid var(--gray-200)",
      borderRadius: 12,
      padding: 20,
      marginBottom: 20
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      marginBottom: 16,
      color: "var(--text-muted)"
    }
  }, "LAN\xC7AR NOVO GASTO DE MARKETING"), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      marginBottom: 14
    }
  }, React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Tipo de Despesa"), React.createElement("select", {
    value: form.tipoDespesa,
    onChange: e => f("tipoDespesa", e.target.value),
    className: "form-input"
  }, TIPOS.map(t => React.createElement("option", {
    key: t.id,
    value: t.id
  }, t.label)))), React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Descri\xE7\xE3o / Observa\xE7\xE3o ", React.createElement("span", {
    style: {
      color: "#dc2626"
    }
  }, "*")), React.createElement("input", {
    type: "text",
    value: form.descricao,
    onChange: e => f("descricao", e.target.value),
    className: "form-input",
    placeholder: "Ex: \"Pagamento mensal Ag\xEAncia Scale Views\" ou \"Cr\xE9ditos Meta Ads maio\""
  })), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Valor (R$)"), React.createElement("input", {
    type: "number",
    min: "0",
    step: "0.01",
    value: form.valor,
    onChange: e => f("valor", e.target.value),
    className: "form-input",
    placeholder: "0,00"
  })), React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Data de Compet\xEAncia"), React.createElement("input", {
    type: "date",
    value: form.data,
    onChange: e => f("data", e.target.value),
    className: "form-input"
  }))), React.createElement("div", null, React.createElement("label", {
    style: {
      fontWeight: 600,
      fontSize: 13,
      display: "block",
      marginBottom: 6
    }
  }, "Campanha Vinculada ", React.createElement("span", {
    style: {
      fontWeight: 400,
      color: "var(--text-muted)"
    }
  }, "(opcional)")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, React.createElement("select", {
    value: form.campanhaId,
    onChange: e => f("campanhaId", e.target.value),
    className: "form-input",
    style: {
      flex: 1
    }
  }, React.createElement("option", {
    value: ""
  }, "\u2014 Selecionar campanha \u2014"), campanhas.map(c => React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.nome))), React.createElement("button", {
    onClick: () => setCriandoCamp(x => !x),
    style: {
      background: criandoCamp ? "#ea580c" : "#ea580c18",
      color: criandoCamp ? "white" : "#ea580c",
      border: "1px solid #ea580c40",
      borderRadius: 8,
      padding: "0 14px",
      fontWeight: 700,
      fontSize: 18,
      cursor: "pointer",
      flexShrink: 0
    }
  }, criandoCamp ? "×" : "+")), criandoCamp && React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, React.createElement("input", {
    type: "text",
    value: novaCampanha,
    onChange: e => setNovaCampanha(e.target.value),
    onKeyDown: e => e.key === "Enter" && criarCampanha(),
    className: "form-input",
    placeholder: "Nome da nova campanha...",
    style: {
      flex: 1
    },
    autoFocus: true
  }), React.createElement("button", {
    onClick: criarCampanha,
    style: {
      background: "#ea580c",
      color: "white",
      border: "none",
      borderRadius: 8,
      padding: "0 16px",
      fontWeight: 600,
      fontSize: 13,
      cursor: "pointer",
      flexShrink: 0,
      fontFamily: "inherit"
    }
  }, "Criar")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, ["nacional", "internacional"].map(op => React.createElement("button", {
    key: op,
    onClick: () => setNovaAbrangencia(op),
    style: {
      flex: 1,
      padding: "7px 0",
      borderRadius: 8,
      border: "2px solid",
      borderColor: novaAbrangencia === op ? "#ea580c" : "var(--gray-200)",
      background: novaAbrangencia === op ? "#fff7ed" : "white",
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 12,
      fontWeight: 600,
      color: novaAbrangencia === op ? "#ea580c" : "var(--text-muted)",
      textTransform: "capitalize"
    }
  }, op === "nacional" ? "🇧🇷 Nacional" : "🌍 Internacional")))))), msg && React.createElement("div", {
    style: {
      background: msg.tipo === "ok" ? "#f0fdf4" : "#fef2f2",
      border: "1px solid",
      borderColor: msg.tipo === "ok" ? "#bbf7d0" : "#fecaca",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 14,
      fontSize: 13,
      color: msg.tipo === "ok" ? "#15803d" : "#dc2626",
      fontWeight: 500
    }
  }, msg.texto), React.createElement("button", {
    onClick: salvar,
    disabled: salvando,
    className: "btn-primary",
    style: {
      width: "100%"
    }
  }, salvando ? "Salvando..." : "💾 Salvar e Lançar no Financeiro"), React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      marginTop: 8,
      textAlign: "center"
    }
  }, "O lan\xE7amento ser\xE1 registrado automaticamente como despesa paga em \"Financeiro Cl\xEDnica\"")), React.createElement("div", {
    style: {
      background: "white",
      border: "1px solid var(--gray-200)",
      borderRadius: 12,
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--gray-100)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "Lan\xE7amentos de Marketing"), React.createElement("input", {
    type: "month",
    value: mesFiltro,
    onChange: e => setMesFiltro(e.target.value),
    style: {
      border: "1px solid var(--gray-200)",
      borderRadius: 6,
      padding: "4px 8px",
      fontSize: 12,
      fontFamily: "inherit",
      outline: "none"
    }
  })), React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#dc2626"
    }
  }, mesFiltro.split("-").reverse().join("/"), " : ", fmtVal(totalMes))), lancamentosFiltrados.length === 0 ? React.createElement("div", {
    style: {
      padding: 24,
      textAlign: "center",
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Nenhum lan\xE7amento em ", mesFiltro.split("-").reverse().join("/"), ".") : React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "var(--gray-50)"
    }
  }, ["Data", "Descrição", "Campanha", "Valor", ""].map(h => React.createElement("th", {
    key: h,
    style: {
      padding: "9px 14px",
      textAlign: "left",
      fontWeight: 600,
      color: "var(--text-muted)",
      fontSize: 12
    }
  }, h)))), React.createElement("tbody", null, lancamentosFiltrados.map(l => React.createElement("tr", {
    key: l.id,
    style: {
      borderTop: "1px solid var(--gray-100)"
    }
  }, React.createElement("td", {
    style: {
      padding: "10px 14px",
      color: "var(--text-muted)"
    }
  }, fmtData(l.data)), React.createElement("td", {
    style: {
      padding: "10px 14px",
      fontWeight: 500
    }
  }, l.descricao || "—"), React.createElement("td", {
    style: {
      padding: "10px 14px"
    }
  }, l.campanhaNome ? React.createElement("span", {
    style: {
      background: "#ea580c18",
      color: "#ea580c",
      borderRadius: 20,
      padding: "2px 10px",
      fontSize: 11,
      fontWeight: 600
    }
  }, l.campanhaNome) : React.createElement("span", {
    style: {
      color: "var(--gray-400)",
      fontSize: 12
    }
  }, "\u2014")), React.createElement("td", {
    style: {
      padding: "10px 14px",
      fontWeight: 700,
      color: "#dc2626"
    }
  }, fmtVal(l.valor)), React.createElement("td", {
    style: {
      padding: "10px 14px"
    }
  }, React.createElement("button", {
    onClick: () => excluir(l),
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)",
      padding: 4,
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 12,
      fontFamily: "inherit"
    },
    onMouseEnter: e => e.currentTarget.style.color = "#dc2626",
    onMouseLeave: e => e.currentTarget.style.color = "var(--gray-400)"
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }), " Excluir"))))))), React.createElement("div", {
    style: {
      background: "white",
      border: "1px solid var(--gray-200)",
      borderRadius: 12,
      overflow: "hidden",
      marginTop: 20
    }
  }, React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--gray-100)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "\uD83C\uDFF7\uFE0F Gerenciar Campanhas"), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, campanhas.length, " campanha", campanhas.length !== 1 ? "s" : "", " cadastrada", campanhas.length !== 1 ? "s" : "")), campanhas.length === 0 ? React.createElement("div", {
    style: {
      padding: 24,
      textAlign: "center",
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Nenhuma campanha cadastrada ainda.") : React.createElement("div", {
    style: {
      padding: "8px 0"
    }
  }, campanhas.map(c => React.createElement("div", {
    key: c.id,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 18px",
      borderBottom: "1px solid var(--gray-50)"
    }
  }, React.createElement("span", {
    style: {
      background: "#ea580c18",
      color: "#ea580c",
      borderRadius: 20,
      padding: "3px 12px",
      fontSize: 12,
      fontWeight: 600
    }
  }, c.nome), React.createElement("button", {
    onClick: async () => {
      if (!window.confirm(`Excluir a campanha "${c.nome}" e todos os lançamentos financeiros vinculados? Esta ação não pode ser desfeita.`)) return;
      try {
        const snap = await db.collection("clinica_lancamentos").where("campanhaId", "==", c.id).get();
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        await db.collection("clinica_campanhas").doc(c.id).delete();
      } catch (e) {
        alert("Erro ao excluir.");
      }
    },
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--gray-400)",
      padding: 4,
      display: "flex",
      alignItems: "center",
      gap: 4,
      fontSize: 12,
      fontFamily: "inherit"
    },
    onMouseEnter: e => e.currentTarget.style.color = "#dc2626",
    onMouseLeave: e => e.currentTarget.style.color = "var(--gray-400)"
  }, React.createElement(Icon, {
    name: "trash-2",
    size: 13
  }), " Excluir"))))));
}
function DashboardMarketing({
  user
}) {
  const [leads, setLeads] = useState([]);
  useEffect(() => {
    db.collection("clinica_leads").limit(100).onSnapshot(s => setLeads(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
  }, []);
  const total = leads.length;
  const converted = leads.filter(l => l.status === "convertido").length;
  const inProgress = leads.filter(l => ["contato", "proposta", "agendado"].includes(l.status)).length;
  const taxa = total > 0 ? Math.round(converted / total * 100) : 0;
  const porOrigem = leads.reduce((acc, l) => {
    const camps = l.campanhas && l.campanhas.length > 0 ? l.campanhas : ["Não informado"];
    camps.forEach(o => {
      acc[o] = (acc[o] || 0) + 1;
    });
    return acc;
  }, {});
  const porStatus = leads.reduce((acc, l) => {
    const s = l.status || "novo";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const STATUS_LABEL = {
    novo: "Novo",
    contato: "Em contato",
    proposta: "Proposta enviada",
    agendado: "Agendado",
    convertido: "Convertido",
    convertido_social: "Convertido Social",
    convertido_parceria: "Convertido — Parceria",
    perdido: "Perdido"
  };
  const STATUS_COR = {
    novo: "#6b7280",
    contato: "#0891b2",
    proposta: "#7B00C4",
    agendado: "#d97706",
    convertido: "#16a34a",
    convertido_social: "#0d9488",
    convertido_parceria: "#7B00C4",
    perdido: "#dc2626"
  };
  return React.createElement("div", {
    style: {
      padding: "24px 28px",
      maxWidth: 900
    }
  }, React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 600
    }
  }, "Dashboard de Marketing"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 4
    }
  }, "Capta\xE7\xE3o de leads \u2014 somente leitura")), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
      gap: 16,
      marginBottom: 28
    }
  }, [{
    label: "Total de Leads",
    valor: total,
    icon: "users",
    cor: "#7B00C4"
  }, {
    label: "Em andamento",
    valor: inProgress,
    icon: "clock",
    cor: "#0891b2"
  }, {
    label: "Convertidos",
    valor: converted,
    icon: "check-circle",
    cor: "#16a34a"
  }, {
    label: "Taxa de conversão",
    valor: taxa + "%",
    icon: "trending-up",
    cor: "#ea580c"
  }].map((c, i) => React.createElement("div", {
    key: i,
    style: {
      background: "white",
      borderRadius: 12,
      padding: "18px 20px",
      border: "1px solid var(--gray-200)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      fontWeight: 500
    }
  }, c.label), React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: c.cor + "18",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement(Icon, {
    name: c.icon,
    size: 16,
    style: {
      color: c.cor
    }
  }))), React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      color: c.cor
    }
  }, c.valor)))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      marginBottom: 28
    }
  }, React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 12,
      padding: 20,
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 16
    }
  }, "\uD83D\uDCCA Leads por Origem"), Object.keys(porOrigem).length === 0 ? React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Nenhum dado ainda.") : Object.entries(porOrigem).sort((a, b) => b[1] - a[1]).map(([origem, qty]) => {
    const pct = total > 0 ? Math.round(qty / total * 100) : 0;
    return React.createElement("div", {
      key: origem,
      style: {
        marginBottom: 12
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        marginBottom: 4
      }
    }, React.createElement("span", null, origem), React.createElement("span", {
      style: {
        fontWeight: 600
      }
    }, qty, " (", pct, "%)")), React.createElement("div", {
      style: {
        background: "var(--gray-100)",
        borderRadius: 4,
        height: 6
      }
    }, React.createElement("div", {
      style: {
        width: pct + "%",
        height: "100%",
        background: "#7B00C4",
        borderRadius: 4
      }
    })));
  })), React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 12,
      padding: 20,
      border: "1px solid var(--gray-200)"
    }
  }, React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 16
    }
  }, "\uD83C\uDFAF Leads por Status"), Object.keys(porStatus).length === 0 ? React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Nenhum dado ainda.") : Object.entries(porStatus).sort((a, b) => b[1] - a[1]).map(([status, qty]) => React.createElement("div", {
    key: status,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      borderRadius: 8,
      marginBottom: 6,
      background: (STATUS_COR[status] || "#6b7280") + "15"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: STATUS_COR[status] || "#6b7280"
    }
  }), React.createElement("span", {
    style: {
      fontSize: 13
    }
  }, STATUS_LABEL[status] || status)), React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: STATUS_COR[status] || "#6b7280"
    }
  }, qty))))), React.createElement("div", {
    style: {
      background: "white",
      borderRadius: 12,
      border: "1px solid var(--gray-200)",
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      padding: "16px 20px",
      borderBottom: "1px solid var(--gray-100)",
      fontWeight: 600,
      fontSize: 14
    }
  }, "\uD83D\uDCCB Leads Recentes"), leads.length === 0 ? React.createElement("div", {
    style: {
      padding: 24,
      textAlign: "center",
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, "Nenhum lead cadastrado ainda.") : React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "var(--gray-50)"
    }
  }, ["Nome", "Origem", "Status", "Contato", "Data"].map(h => React.createElement("th", {
    key: h,
    style: {
      padding: "10px 16px",
      textAlign: "left",
      fontWeight: 600,
      color: "var(--text-muted)",
      fontSize: 12
    }
  }, h)))), React.createElement("tbody", null, leads.slice(0, 20).map(l => React.createElement("tr", {
    key: l.id,
    style: {
      borderTop: "1px solid var(--gray-100)"
    }
  }, React.createElement("td", {
    style: {
      padding: "10px 16px",
      fontWeight: 500
    }
  }, l.nome || "—"), React.createElement("td", {
    style: {
      padding: "10px 16px",
      color: "var(--text-muted)"
    }
  }, (l.campanhas || []).join(", ") || "—"), React.createElement("td", {
    style: {
      padding: "10px 16px"
    }
  }, React.createElement("span", {
    style: {
      background: (STATUS_COR[l.status] || "#6b7280") + "20",
      color: STATUS_COR[l.status] || "#6b7280",
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 11,
      fontWeight: 600
    }
  }, STATUS_LABEL[l.status] || l.status || "novo")), React.createElement("td", {
    style: {
      padding: "10px 16px",
      color: "var(--text-muted)"
    }
  }, l.telefone || l.email || "—"), React.createElement("td", {
    style: {
      padding: "10px 16px",
      color: "var(--text-muted)"
    }
  }, l.createdAt?.toDate ? l.createdAt.toDate().toLocaleDateString("pt-BR") : "—"))))))), user?.tipo === "psicologa" && React.createElement(CentralLancamentosMarketing, null));
}
