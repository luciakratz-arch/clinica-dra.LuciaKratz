import { jsxDEV as _jsxDEV, Fragment as _Fragment } from "react/jsx-dev-runtime";
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
  const LINK_CADASTRO = "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/cadastro-aluno/";
  const [linkCopiado, setLinkCopiado] = useState(false);
  const filtrados = alunos.filter(a => {
    const fOk = filtro === "todos" || a.status === filtro;
    const bOk = !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()) || a.email?.toLowerCase().includes(busca.toLowerCase());
    return fOk && bOk;
  });
  const pendentes = alunos.filter(a => a.status === "pendente");
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
      const up = {
        ...dados
      };
      if (senha) up.senha = senha; // só atualiza senha se preenchida
      await db.collection("clinica_alunos").doc(editando).update(up);
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
  async function alterarStatus(id, novoStatus) {
    await db.collection("clinica_alunos").doc(id).update({
      status: novoStatus
    });
    // Envia email de aprovação via Firebase Trigger Email
    if (novoStatus === "ativo") {
      try {
        const doc = await db.collection("clinica_alunos").doc(id).get();
        const a = doc.data();
        if (a && a.email) {
          await db.collection("clinica_emails").add({
            to: a.email,
            message: {
              subject: "✅ Acesso aprovado — Portal de Supervisão Clínica",
              html: `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5F0FF;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0FF;padding:32px 0;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
    <tr><td style="background:#7B00C4;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
      <div style="font-family:Georgia,serif;font-size:24px;color:#fff;font-weight:700;">Dra. Lucia Kratz</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:0.1em;text-transform:uppercase;">CRP 09/20590 · Supervisão Clínica</div>
    </td></tr>
    <tr><td style="background:#6d00b0;padding:36px 40px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">🎓</div>
      <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 10px;">Acesso aprovado!</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;line-height:1.6;">Seu cadastro no Portal de Supervisão Clínica foi liberado.</p>
    </td></tr>
    <tr><td style="background:#ffffff;padding:36px 40px;">
      <p style="font-size:15px;color:#1f2937;line-height:1.7;margin:0 0 20px;">Olá, <strong>${a.nome}</strong>! 🦋<br/><br/>Sua conta foi aprovada pela Dra. Lucia. Você já pode acessar o portal.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:10px;margin-bottom:24px;">
        <tr><td style="padding:18px 22px;">
          <div style="font-weight:700;font-size:13px;color:#3d006a;margin-bottom:12px;">🔐 Como entrar:</div>
          <div style="font-size:14px;color:#4b5563;line-height:2.2;">
            1. Acesse o portal pelo botão abaixo<br/>
            2. Clique em <strong>Aluno/Estagiário</strong><br/>
            3. E-mail: <strong>${a.email}</strong><br/>
            4. Senha: a que você criou no cadastro
          </div>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr><td align="center">
          <a href="https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/" style="display:inline-block;background:#7B00C4;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;">
            Acessar Portal de Supervisão →
          </a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="background:#f9f5ff;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Dra. Lucia Kratz · CRP 09/20590 · Goiânia, GO 🦋</p>
    </td></tr>
  </table></td></tr>
</table>
</body></html>`
            }
          });
        }
      } catch (e) {
        console.error("Erro ao enviar email de aprovação:", e);
      }
    }
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
  if (loading) return /*#__PURE__*/_jsxDEV(Spinner, {}, void 0, false);
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Alunos em Supervisão"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: [alunos.filter(a => a.status === "ativo").length, " aluno(s) cadastrado(s)"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 12
          },
          onClick: () => {
            const texto = `🎓 *Supervisão Clínica — Dra. Lucia Kratz*\n\nOlá! Para solicitar acesso ao Portal de Supervisão Clínica, preencha seu cadastro pelo link abaixo:\n\n👉 ${LINK_CADASTRO}\n\n📝 Você vai informar: nome, e-mail, instituição e criar uma senha de acesso.\n\n⏳ Após o envio, seu cadastro ficará pendente até a aprovação da supervisora. Assim que aprovado, você já pode acessar o portal.\n\nQualquer dúvida, entre em contato! 💜`;
            navigator.clipboard.writeText(texto).then(() => {
              setLinkCopiado(true);
              setTimeout(() => setLinkCopiado(false), 2500);
            }).catch(() => prompt("Copie o texto:", texto));
          },
          children: linkCopiado ? "✓ Texto copiado!" : "📋 Link de Cadastro"
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
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
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "user-plus",
            size: 16
          }, void 0, false), " Cadastrar Aluno"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), pendentes.length > 0 && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "#fef3c7",
        border: "1px solid #f59e0b",
        borderRadius: 12,
        padding: "12px 18px",
        marginBottom: 18,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            color: "#92400e"
          },
          children: ["🔔 ", pendentes.length, " solicitação(ões) pendente(s)"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "#78350f",
            marginTop: 2
          },
          children: "Alunos que se cadastraram pelo link e aguardam sua aprovação."
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-ghost",
        style: {
          fontSize: 12,
          color: "#92400e",
          border: "1px solid #f59e0b"
        },
        onClick: () => setFiltro("pendente"),
        children: "Ver pendentes"
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 12,
        marginBottom: 20,
        flexWrap: "wrap"
      },
      children: [/*#__PURE__*/_jsxDEV("input", {
        className: "form-input",
        style: {
          flex: 1,
          minWidth: 200
        },
        placeholder: "Buscar por nome ou e-mail...",
        value: busca,
        onChange: e => setBusca(e.target.value)
      }, void 0, false), [["todos", "Todos"], ["ativo", "Ativos"], ["pendente", "Pendentes"], ["inativo", "Inativos"]].map(([f, l]) => /*#__PURE__*/_jsxDEV("button", {
        className: "btn " + (filtro === f ? "btn-purple" : "btn-ghost"),
        onClick: () => setFiltro(f),
        children: [l, " ", f === "pendente" && pendentes.length > 0 && /*#__PURE__*/_jsxDEV("span", {
          style: {
            background: "#f59e0b",
            color: "white",
            borderRadius: 20,
            padding: "1px 7px",
            fontSize: 10,
            fontWeight: 700,
            marginLeft: 4
          },
          children: pendentes.length
        }, void 0, false)]
      }, f, true))]
    }, void 0, true), filtrados.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        textAlign: "center",
        padding: 48,
        color: "var(--text-muted)"
      },
      children: [/*#__PURE__*/_jsxDEV(Icon, {
        name: "graduation-cap",
        size: 40
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginTop: 12
        },
        children: busca ? "Nenhum aluno encontrado." : "Nenhum aluno cadastrado ainda."
      }, void 0, false)]
    }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      },
      children: filtrados.map(a => /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 20px",
          borderLeft: a.status === "pendente" ? "4px solid #f59e0b" : a.status === "inativo" ? "4px solid #9ca3af" : "4px solid transparent"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: a.status === "pendente" ? "#fef3c7" : "var(--purple-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: a.status === "pendente" ? "#92400e" : "var(--purple)",
            flexShrink: 0,
            fontSize: 16
          },
          children: (a.nome || "?")[0].toUpperCase()
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            flex: 1,
            minWidth: 0
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap"
            },
            children: [/*#__PURE__*/_jsxDEV("span", {
              style: {
                fontWeight: 600
              },
              children: a.nome
            }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
              className: "badge " + (a.status === "ativo" ? "badge-green" : a.status === "pendente" ? "badge-yellow" : "badge-gray"),
              style: a.status === "pendente" ? {
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #f59e0b"
              } : {},
              children: a.status === "ativo" ? "Ativo" : a.status === "pendente" ? "⏳ Pendente" : "Inativo"
            }, void 0, false), a.origemCadastro === "auto-cadastro" && /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 10,
                color: "var(--text-muted)",
                background: "var(--gray-100)",
                borderRadius: 20,
                padding: "2px 8px"
              },
              children: "auto-cadastro"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 13,
              color: "var(--text-muted)",
              display: "flex",
              gap: 12,
              marginTop: 2,
              flexWrap: "wrap"
            },
            children: [/*#__PURE__*/_jsxDEV("span", {
              children: ["✉ ", a.email]
            }, void 0, true), a.instituicao && /*#__PURE__*/_jsxDEV("span", {
              children: ["🏛 ", a.instituicao, a.semestre ? " · " + a.semestre : ""]
            }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
              children: ["👤 ", a.pacientesVinculados || 0, " paciente(s)"]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 6,
            flexWrap: "wrap"
          },
          children: [a.status === "pendente" && /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            style: {
              fontSize: 12,
              padding: "6px 14px"
            },
            onClick: () => alterarStatus(a.id, "ativo"),
            children: "✓ Aprovar"
          }, void 0, false), a.status === "ativo" && /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              fontSize: 11,
              padding: "5px 10px",
              color: "#6b7280"
            },
            onClick: () => alterarStatus(a.id, "inativo"),
            children: "Inativar"
          }, void 0, false), a.status === "inativo" && /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              fontSize: 11,
              padding: "5px 10px",
              color: "#16a34a"
            },
            onClick: () => alterarStatus(a.id, "ativo"),
            children: "Reativar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              fontSize: 12,
              color: "var(--purple)",
              padding: "6px 12px"
            },
            onClick: () => setDetalhe(a),
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "eye",
              size: 13
            }, void 0, false), " Ver"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              padding: "6px 10px"
            },
            onClick: () => abrirEditar(a),
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "pencil",
              size: 13
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            style: {
              padding: "6px 10px",
              color: "var(--danger)"
            },
            onClick: () => excluir(a.id),
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "trash-2",
              size: 13
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true)]
      }, a.id, true))
    }, void 0, false), modal && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModal(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto"
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 20
          },
          children: editando ? "Editar Aluno" : "Cadastrar Novo Aluno"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "NOME COMPLETO *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: form.nome,
            onChange: e => setForm({
              ...form,
              nome: e.target.value
            }),
            placeholder: "Nome do aluno",
            autoFocus: true
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "E-MAIL *"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              type: "email",
              value: form.email,
              onChange: e => setForm({
                ...form,
                email: e.target.value
              }),
              placeholder: "aluno@email.com",
              disabled: !!editando
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "TELEFONE"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.telefone,
              onChange: e => setForm({
                ...form,
                telefone: e.target.value
              }),
              placeholder: "(00) 9 0000-0000"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "INSTITUIÇÃO"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.instituicao,
              onChange: e => setForm({
                ...form,
                instituicao: e.target.value
              }),
              placeholder: "Nome da faculdade"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "form-group",
            children: [/*#__PURE__*/_jsxDEV("label", {
              className: "form-label",
              children: "SEMESTRE"
            }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
              className: "form-input",
              value: form.semestre,
              onChange: e => setForm({
                ...form,
                semestre: e.target.value
              }),
              placeholder: "Ex: 8º semestre"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), !editando && /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "SENHA DE ACESSO *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "password",
            value: form.senha,
            onChange: e => setForm({
              ...form,
              senha: e.target.value
            }),
            placeholder: "Senha para o aluno acessar o portal"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "OBSERVAÇÕES"
          }, void 0, false), /*#__PURE__*/_jsxDEV(TextAreaVoz, {
            className: "form-input",
            rows: 2,
            value: form.obs,
            onChange: e => setForm({
              ...form,
              obs: e.target.value
            }),
            placeholder: "Notas sobre o aluno..."
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModal(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: salvar,
            disabled: salvando,
            children: salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar aluno"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), detalhe && /*#__PURE__*/_jsxDEV("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        zIndex: 500
      },
      onClick: () => setDetalhe(null),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          width: "100%",
          maxWidth: 480,
          height: "100%",
          overflowY: "auto",
          padding: 28
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "graduation-cap",
            size: 20
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600,
              flex: 1
            },
            children: detalhe.nome
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setDetalhe(null),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--gray-400)"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 8,
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("span", {
            className: "badge " + (detalhe.status === "ativo" ? "badge-green" : "badge-gray"),
            children: detalhe.status === "ativo" ? "Ativo" : "Inativo"
          }, void 0, false), detalhe.instituicao && /*#__PURE__*/_jsxDEV("span", {
            className: "badge badge-purple",
            children: detalhe.instituicao
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            fontSize: 14
          },
          children: [detalhe.email && /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)"
              },
              children: "E-mail"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 500
              },
              children: detalhe.email
            }, void 0, false)]
          }, void 0, true), detalhe.telefone && /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)"
              },
              children: "Telefone"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 500
              },
              children: detalhe.telefone
            }, void 0, false)]
          }, void 0, true), detalhe.instituicao && /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)"
              },
              children: "Instituicao"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 500
              },
              children: detalhe.instituicao
            }, void 0, false)]
          }, void 0, true), detalhe.semestre && /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)"
              },
              children: "Semestre"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 500
              },
              children: detalhe.semestre
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), detalhe.obs && /*#__PURE__*/_jsxDEV("div", {
          style: {
            marginTop: 16,
            padding: 12,
            background: "var(--gray-50)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--text-muted)"
          },
          children: detalhe.obs
        }, void 0, false)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
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
  return /*#__PURE__*/_jsxDEV("div", {
    style: {
      background: "#fff5f5",
      border: "2px solid #fecaca",
      borderRadius: 12,
      padding: 16,
      marginTop: 12
    },
    children: [/*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12
      },
      children: [/*#__PURE__*/_jsxDEV("span", {
        style: {
          fontSize: 20
        },
        children: "🔴"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: "#dc2626"
        },
        children: "Botão de Emergência"
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 12,
        lineHeight: 1.6
      },
      children: "Defina a palavra-código que o casal usará para acionar o tempo de pausa durante conflitos."
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 8,
        marginBottom: palavraSalva ? 12 : 0
      },
      children: [/*#__PURE__*/_jsxDEV("input", {
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
      }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: salvar,
        disabled: salvando,
        style: {
          whiteSpace: "nowrap"
        },
        children: salvando ? "..." : salvo ? "✓ Salvo!" : "Salvar"
      }, void 0, false)]
    }, void 0, true), palavraSalva && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "#7B00C4",
        borderRadius: 10,
        padding: "10px 16px",
        textAlign: "center",
        marginBottom: 12
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 11,
          color: "rgba(255,255,255,0.7)",
          marginBottom: 4
        },
        children: ["Palavra ativa para ", nomeCasal]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontFamily: "var(--font-display)",
          fontSize: 22,
          fontWeight: 700,
          color: "white",
          letterSpacing: 4
        },
        children: palavraSalva
      }, void 0, false)]
    }, void 0, true), acionamentos.length > 0 && /*#__PURE__*/_jsxDEV("div", {
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 11,
          fontWeight: 600,
          color: "#dc2626",
          marginBottom: 6
        },
        children: "ÚLTIMOS ACIONAMENTOS"
      }, void 0, false), acionamentos.map(a => /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          padding: "5px 0",
          borderBottom: "1px solid #fecaca"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          style: {
            color: "#6b7280"
          },
          children: fmtDH(a.createdAt)
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          style: {
            color: "#dc2626",
            fontWeight: 600
          },
          children: ["⏱ ", a.horas, "h de pausa · por ", a.acionadoPor || "—"]
        }, void 0, true)]
      }, a.id, true))]
    }, void 0, true)]
  }, void 0, true);
}
function Laudos() {
  const {
    data: pacientes
  } = useCollection("clinica_pacientes", "nome");
  const [laudos, setLaudos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    tipo: "Avaliacao Neuropsicologica",
    pacienteId: "",
    linkDrive: "",
    observacoes: ""
  });
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(null);
  const TIPOS_LAUDO = ["Avaliacao Neuropsicologica", "Avaliacao Psicologica", "Avaliacao Infantil", "Avaliacao de TDAH", "Avaliacao de Altas Habilidades", "Pericia Psicologica", "Demandas Judiciais", "Orientacao de Carreira", "Relatorio de Acompanhamento", "Outro"];
  const STATUS_CONFIG = {
    rascunho: {
      label: "Rascunho",
      bg: "#fef3c7",
      cor: "#b45309",
      icon: "edit-3"
    },
    enviado: {
      label: "Enviado",
      bg: "#d1fae5",
      cor: "#065f46",
      icon: "send"
    },
    arquivado: {
      label: "Arquivado",
      bg: "#f3f4f6",
      cor: "#6b7280",
      icon: "archive"
    }
  };
  useEffect(() => {
    const unsub = db.collection("clinica_laudos").onSnapshot(snap => {
      setLaudos(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);
  async function salvar() {
    if (!form.tipo || !form.pacienteId || !form.linkDrive) {
      alert("Selecione o tipo, o paciente e cole o link do PDF.");
      return;
    }
    setSalvando(true);
    const pac = pacientes.find(p => p.id === form.pacienteId);
    let link = form.linkDrive.trim();
    const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) link = `https://drive.google.com/file/d/${m[1]}/view`;
    await db.collection("clinica_laudos").add({
      tipo: form.tipo,
      titulo: form.tipo + " — " + (pacEfetivo?.nome || ""),
      pacienteId: form.pacienteId,
      pacienteNome: pac?.nome || "",
      linkDrive: link,
      observacoes: form.observacoes,
      status: "rascunho",
      enviadoEm: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    setModal(false);
    setForm({
      tipo: "Avaliacao Neuropsicologica",
      pacienteId: "",
      linkDrive: "",
      observacoes: ""
    });
    setSalvando(false);
  }
  async function enviarParaPaciente(laudo) {
    if (!confirm(`Enviar "${laudo.tipo}" para ${laudo.pacienteNome}?\n\nO paciente verá o documento no portal dele.`)) return;
    setEnviando(laudo.id);
    await db.collection("clinica_laudos").doc(laudo.id).update({
      status: "enviado",
      enviadoEm: new Date().toISOString()
    });
    setEnviando(null);
  }
  async function excluir(id) {
    if (!confirm("Excluir laudo permanentemente?")) return;
    await db.collection("clinica_laudos").doc(id).delete();
  }
  async function arquivar(id) {
    await db.collection("clinica_laudos").doc(id).update({
      status: "arquivado"
    });
  }
  if (loading) return /*#__PURE__*/_jsxDEV(Spinner, {}, void 0, false);
  const totalEnviado = laudos.filter(l => l.status === "enviado").length;
  const totalRascunho = laudos.filter(l => l.status === "rascunho").length;
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Laudos"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: [laudos.length, " laudo(s) · ", totalEnviado, " enviado(s) ao paciente"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: () => setModal(true),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "plus",
          size: 16
        }, void 0, false), " Novo Laudo"]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
        gap: 12,
        marginBottom: 24
      },
      children: [["Rascunho", totalRascunho, "#b45309", "#fef3c7"], ["Enviado ao Paciente", totalEnviado, "#065f46", "#d1fae5"], ["Total", laudos.length, "#7B00C4", "var(--purple-soft)"]].map(([l, n, cor, bg]) => /*#__PURE__*/_jsxDEV("div", {
        className: "metric-card",
        style: {
          textAlign: "center",
          background: bg
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "metric-value",
          style: {
            fontSize: 28,
            color: cor
          },
          children: n
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "metric-label",
          style: {
            color: cor
          },
          children: l
        }, void 0, false)]
      }, l, true))
    }, void 0, false), laudos.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        textAlign: "center",
        padding: 60,
        color: "var(--text-muted)"
      },
      children: [/*#__PURE__*/_jsxDEV(Icon, {
        name: "file-text",
        size: 48
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginTop: 12,
          fontWeight: 500
        },
        children: "Nenhum laudo criado ainda"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          marginTop: 8,
          marginBottom: 20,
          color: "var(--text-muted)"
        },
        children: "Crie o laudo no Word/Google Docs, salve como PDF no Drive, cole o link aqui e envie ao paciente."
      }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: () => setModal(true),
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "plus",
          size: 14
        }, void 0, false), " Criar primeiro laudo"]
      }, void 0, true)]
    }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      children: laudos.map(l => {
        const st = STATUS_CONFIG[l.status] || STATUS_CONFIG.rascunho;
        return /*#__PURE__*/_jsxDEV("div", {
          className: "card",
          style: {
            padding: "18px 20px"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "flex-start",
              gap: 14
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                width: 44,
                height: 44,
                borderRadius: 12,
                background: st.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              },
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: st.icon,
                size: 20
              }, void 0, false)
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                flex: 1,
                minWidth: 0
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 4
                },
                children: [/*#__PURE__*/_jsxDEV("span", {
                  style: {
                    fontWeight: 700,
                    fontSize: 15
                  },
                  children: l.tipo
                }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    background: st.bg,
                    color: st.cor,
                    borderRadius: 20,
                    padding: "2px 10px",
                    fontSize: 11,
                    fontWeight: 600
                  },
                  children: st.label
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 13,
                  color: "var(--text-muted)",
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap"
                },
                children: [/*#__PURE__*/_jsxDEV("span", {
                  children: ["👤 ", l.pacienteNome || "—"]
                }, void 0, true), l.createdAt?.seconds && /*#__PURE__*/_jsxDEV("span", {
                  children: ["📅 ", new Date(l.createdAt.seconds * 1000).toLocaleDateString("pt-BR")]
                }, void 0, true), l.enviadoEm && /*#__PURE__*/_jsxDEV("span", {
                  style: {
                    color: "#059669",
                    fontWeight: 600
                  },
                  children: ["✉ Enviado em ", new Date(l.enviadoEm).toLocaleDateString("pt-BR")]
                }, void 0, true)]
              }, void 0, true), l.observacoes && /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 4,
                  fontStyle: "italic"
                },
                children: l.observacoes
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 8,
              marginTop: 14,
              flexWrap: "wrap",
              borderTop: "1px solid var(--gray-100)",
              paddingTop: 12
            },
            children: [l.linkDrive && /*#__PURE__*/_jsxDEV("a", {
              href: l.linkDrive,
              target: "_blank",
              rel: "noreferrer",
              className: "btn btn-outline",
              style: {
                fontSize: 12,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6
              },
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "external-link",
                size: 13
              }, void 0, false), " Ver PDF"]
            }, void 0, true), l.status === "rascunho" && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              style: {
                fontSize: 12
              },
              onClick: () => enviarParaPaciente(l),
              disabled: enviando === l.id,
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "send",
                size: 13
              }, void 0, false), " ", enviando === l.id ? "Enviando..." : "Enviar ao Paciente"]
            }, void 0, true), l.status === "enviado" && /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#059669",
                fontWeight: 600
              },
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "check-circle",
                size: 14
              }, void 0, false), " Disponível no portal do paciente"]
            }, void 0, true), l.status !== "arquivado" && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                fontSize: 12
              },
              onClick: () => arquivar(l.id),
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "archive",
                size: 13
              }, void 0, false), " Arquivar"]
            }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                fontSize: 12,
                color: "var(--danger)",
                marginLeft: "auto"
              },
              onClick: () => excluir(l.id),
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: "trash-2",
                size: 13
              }, void 0, false)
            }, void 0, false)]
          }, void 0, true)]
        }, l.id, true);
      })
    }, void 0, false), modal && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModal(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 500
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 600
            },
            children: "Novo Laudo"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModal(false),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--gray-400)"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "x",
              size: 20
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Tipo de Laudo *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
            className: "form-input",
            value: form.tipo,
            onChange: e => setForm({
              ...form,
              tipo: e.target.value
            }),
            children: TIPOS_LAUDO.map(t => /*#__PURE__*/_jsxDEV("option", {
              value: t,
              children: t
            }, t, false))
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Paciente *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
            className: "form-input",
            value: form.pacienteId,
            onChange: e => setForm({
              ...form,
              pacienteId: e.target.value
            }),
            children: [/*#__PURE__*/_jsxDEV("option", {
              value: "",
              children: "Selecionar paciente..."
            }, void 0, false), pacientes.filter(p => p.status === "ativo").sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).map(p => /*#__PURE__*/_jsxDEV("option", {
              value: p.id,
              children: p.nome
            }, p.id, false))]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Link do PDF (Google Drive) *"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: form.linkDrive,
            onChange: e => setForm({
              ...form,
              linkDrive: e.target.value
            }),
            placeholder: "https://drive.google.com/file/d/..."
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 4
            },
            children: "No Drive: botão direito no arquivo → \"Obter link\" → cole aqui"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Observações internas (opcional)"
          }, void 0, false), /*#__PURE__*/_jsxDEV(TextAreaVoz, {
            className: "form-input",
            rows: 2,
            value: form.observacoes,
            onChange: e => setForm({
              ...form,
              observacoes: e.target.value
            }),
            placeholder: "Notas internas sobre este laudo..."
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModal(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: salvar,
            disabled: salvando,
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "save",
              size: 15
            }, void 0, false), " ", salvando ? "Salvando..." : "Salvar Laudo"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}

// ═══════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════
// ─── COMISSÕES ────────────────────────────────────────────
function Comissoes({
  user
}) {
  const {
    data: pacotes
  } = useCollection("clinica_pacotes");
  // ── Esteira 1a: Comissões da secretária (vendas_secretaria) ──
  const [comissoes, setComissoes] = useState([]);
  // ── Esteira 1b: Repasses de parceiras/estagiárias (repasses_parcerias) ──
  const [repasses, setRepasses] = useState([]);
  // Fallback: lê clinica_comissoes legado para não perder histórico anterior
  const [comissoesLegado, setComissoesLegado] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [mesSel, setMesSel] = useState(() => {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
  });
  const [pagando, setPagando] = useState(false);

  // Configurações financeiras editáveis (clinica_config/comissoes)
  const [config, setConfig] = useState({
    ...CONFIG_FIN_PADRAO
  });
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [formConfig, setFormConfig] = useState({
    ...CONFIG_FIN_PADRAO
  });
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  // Parceiras
  const [parceiras, setParceiras] = useState([]);
  const [modalParceira, setModalParceira] = useState(false);
  const [editandoParceira, setEditandoParceira] = useState(null);
  const [formParceira, setFormParceira] = useState({
    nome: "",
    percentual: "70",
    pix: "",
    tipo: "parceira"
  });
  const SALARIO_FIXO = parseFloat(config.salarioFixo) || 0;
  useEffect(() => {
    // Esteira 1a: Comissões da secretária (nova coleção) — sem orderBy, ordenar client-side
    const u1 = db.collection("vendas_secretaria").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setComissoes(docs);
    }, () => {});
    // Esteira 1b: Repasses de parceiras — sem orderBy
    const u1b = db.collection("repasses_parcerias").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setRepasses(docs);
    }, () => {});
    // Fallback: histórico legado clinica_comissoes — sem orderBy
    const u1c = db.collection("clinica_comissoes").onSnapshot(s => {
      const docs = s.docs.map(d => ({
        id: d.id,
        ...d.data(),
        _legado: true
      }));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setComissoesLegado(docs);
    }, () => {});
    const u2 = db.collection("clinica_lancamentos").orderBy("createdAt", "desc").onSnapshot(s => setLancamentos(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    const u3 = db.collection("clinica_config").doc("comissoes").onSnapshot(d => {
      const cfg = d.exists ? {
        ...CONFIG_FIN_PADRAO,
        ...d.data()
      } : {
        ...CONFIG_FIN_PADRAO
      };
      setConfig(cfg);
      if (!editandoConfig) setFormConfig(cfg);
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
      u1b();
      u1c();
      u2();
      u3();
      u4();
    };
  }, []);

  // ── HIGIENIZAÇÃO: remove duplicatas por pacoteId nas coleções de comissão ──
  // ── AUDITORIA: cruza pacotes pagos com registros de comissão ──
  const [modalAuditComissao, setModalAuditComissao] = React.useState(false);
  const [auditResultado, setAuditResultado] = React.useState(null);
  const [auditando, setAuditando] = React.useState(false);
  async function auditarComissoes() {
    setAuditando(true);
    setModalAuditComissao(true);

    // 1. Buscar todos os pacotes
    const snapPac = await db.collection("clinica_pacotes").get();
    const todosPacotes = snapPac.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // 2. Buscar todas as comissões (nova + legado)
    const [snapVS, snapLeg] = await Promise.all([db.collection("vendas_secretaria").get(), db.collection("clinica_comissoes").get()]);
    const todasComissoes = [...snapVS.docs.map(d => ({
      id: d.id,
      ...d.data(),
      _col: "vendas_secretaria"
    })), ...snapLeg.docs.map(d => ({
      id: d.id,
      ...d.data(),
      _col: "clinica_comissoes"
    }))];
    const comissoesPorPacote = {};
    todasComissoes.forEach(c => {
      if (c.pacoteId) comissoesPorPacote[c.pacoteId] = c;
    });

    // 3. Filtrar pacotes de junho e julho com tipoVenda (particular/recorrente — que geram comissão)
    const mesesAlvo = ["2026-06", "2026-07"];
    const pacotesPagos = todosPacotes.filter(p => {
      const mes = (p.dataInicio || "").slice(0, 7);
      return mesesAlvo.includes(mes) && (p.statusPag || "pendente") === "recebido";
    });
    const pacotesPendentes = todosPacotes.filter(p => {
      const mes = (p.dataInicio || "").slice(0, 7);
      return mesesAlvo.includes(mes) && (p.statusPag || "pendente") !== "recebido";
    });

    // 4. Para pagos: checar se tem comissão
    const pagosComComissao = pacotesPagos.filter(p => comissoesPorPacote[p.id]);
    const pagosSemComissao = pacotesPagos.filter(p => !comissoesPorPacote[p.id]);
    setAuditResultado({
      pacotesPagos,
      pacotesPendentes,
      pagosComComissao,
      pagosSemComissao,
      todasComissoes,
      comissoesPorPacote
    });
    setAuditando(false);
  }
  async function gerarComissaoFaltante(pacote) {
    const tipoVenda = lancamentos.some(l => l.pacienteId === pacote.pacienteId && l.pacoteId !== pacote.id && l.status === "recebido") ? "recorrente" : "primeira";
    await registrarComissao({
      tipo: "Pacote",
      valor: parseFloat(pacote.valorTotal || 0),
      pacienteNome: pacote.pacienteNome || "",
      tipoVenda,
      pacoteId: pacote.id
    });
    // Atualizar resultado
    setAuditResultado(prev => ({
      ...prev,
      pagosSemComissao: prev.pagosSemComissao.filter(p => p.id !== pacote.id),
      pagosComComissao: [...prev.pagosComComissao, pacote]
    }));
  }
  async function gerarTodasFaltantes(lista) {
    if (!confirm(`Gerar ${lista.length} comissão(ões) faltante(s)? Isso vai criar os registros agora.`)) return;
    for (const p of lista) await gerarComissaoFaltante(p);
    alert("✅ Comissões geradas!");
  }
  async function higienizarDuplicatas() {
    if (!confirm("Essa operação vai:\n\n" + "1. Remover comissões DUPLICADAS pelo mesmo pacoteId\n" + "2. Remover comissões com ⚠️ Pacote não encontrado\n" + "3. Preencher mesRef nos registros antigos (restaura histórico de meses)\n\n" + "Confirma?")) return;
    let removidos = 0;
    let orfaos = 0;
    let migrados = 0;

    // Carrega IDs de todos os pacotes existentes para cruzar
    const snapPacotes = await db.collection("clinica_pacotes").get();
    const pacotesExistentes = new Set(snapPacotes.docs.map(d => d.id));

    // ── PASSO 1: Duplicatas em vendas_secretaria ──
    const snapVS = await db.collection("vendas_secretaria").get();
    const porPacoteVS = {};
    snapVS.docs.forEach(d => {
      const pid = d.data().pacoteId;
      if (!pid) return;
      if (!porPacoteVS[pid]) porPacoteVS[pid] = [];
      porPacoteVS[pid].push({
        id: d.id,
        ts: d.data().createdAt?.toMillis?.() || 0
      });
    });
    const bVS = db.batch();
    Object.values(porPacoteVS).forEach(lista => {
      if (lista.length <= 1) return;
      lista.sort((a, b) => b.ts - a.ts);
      lista.slice(1).forEach(r => {
        if (!r.id.startsWith("COM_")) {
          bVS.delete(db.collection("vendas_secretaria").doc(r.id));
          removidos++;
        }
      });
    });
    await bVS.commit();

    // ── PASSO 2: Duplicatas + órfãos em clinica_comissoes ──
    const snapLeg = await db.collection("clinica_comissoes").get();
    const porPacoteLeg = {};
    const bLeg = db.batch();
    let bLegCount = 0;
    snapLeg.docs.forEach(d => {
      const data = d.data();
      const pid = data.pacoteId;

      // Órfão: tem pacoteId mas o pacote não existe mais → remover
      if (pid && !pacotesExistentes.has(pid)) {
        bLeg.delete(db.collection("clinica_comissoes").doc(d.id));
        orfaos++;
        bLegCount++;
        return;
      }

      // Agrupar para detectar duplicatas
      if (!pid) return;
      if (!porPacoteLeg[pid]) porPacoteLeg[pid] = [];
      porPacoteLeg[pid].push({
        id: d.id,
        ts: data.createdAt?.toMillis?.() || 0
      });
    });

    // Duplicatas: manter só o mais recente
    Object.values(porPacoteLeg).forEach(lista => {
      if (lista.length <= 1) return;
      lista.sort((a, b) => b.ts - a.ts);
      lista.slice(1).forEach(r => {
        bLeg.delete(db.collection("clinica_comissoes").doc(r.id));
        removidos++;
        bLegCount++;
      });
    });
    if (bLegCount > 0) await bLeg.commit();

    // ── PASSO 3: Migração de mesRef (restaura histórico de meses) ──
    // Re-ler após limpeza para não tentar migrar docs que foram deletados
    const snapLeg2 = await db.collection("clinica_comissoes").get();
    const bMig = db.batch();
    let bMigCount = 0;
    snapLeg2.docs.forEach(d => {
      const data = d.data();
      if (!data.mesRef) {
        let mesRef = null;
        if (data.createdAt?.toDate) {
          const dt = data.createdAt.toDate();
          mesRef = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        } else if (data.data) {
          mesRef = String(data.data).slice(0, 7);
        }
        if (mesRef) {
          bMig.update(d.ref, {
            mesRef
          });
          migrados++;
          bMigCount++;
        }
      }
    });
    if (bMigCount > 0) await bMig.commit();
    alert("✅ Higienização concluída!\n\n" + `• ${removidos} duplicata(s) removida(s)\n` + `• ${orfaos} comissão(ões) com pacote inexistente removida(s)\n` + `• ${migrados} registro(s) com mesRef preenchido (histórico restaurado)`);
  }
  async function salvarConfig() {
    setSalvandoConfig(true);
    await db.collection("clinica_config").doc("comissoes").set({
      nomeSecretaria: formConfig.nomeSecretaria || "Secretária",
      salarioFixo: parseFloat(formConfig.salarioFixo) || 0,
      percPrimeira: parseFloat(formConfig.percPrimeira) || 10,
      percRecorrente: parseFloat(formConfig.percRecorrente) || 5,
      percParceiroPadrao: parseFloat(formConfig.percParceiroPadrao) || 70,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }, {
      merge: true
    });
    setSalvandoConfig(false);
    setEditandoConfig(false);
  }
  async function salvarParceira() {
    if (!formParceira.nome.trim()) {
      alert("Nome da parceira é obrigatório.");
      return;
    }
    const dados = {
      nome: formParceira.nome.trim(),
      percentual: parseFloat(formParceira.percentual) || parseFloat(config.percParceiroPadrao) || 70,
      pix: formParceira.pix || "",
      tipo: formParceira.tipo || "parceira"
    };
    if (editandoParceira) {
      await db.collection("clinica_parceiras").doc(editandoParceira).update(dados);
    } else {
      await db.collection("clinica_parceiras").add({
        ...dados,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    setModalParceira(false);
    setEditandoParceira(null);
    setFormParceira({
      nome: "",
      percentual: String(config.percParceiroPadrao || 70),
      pix: "",
      tipo: "parceira"
    });
  }

  // Meses disponíveis: une nova coleção + legado para mostrar histórico completo
  const meses = [...new Set([...comissoes, ...comissoesLegado].map(c => c.mesRef).filter(Boolean))].sort().reverse();
  // Auto-navegar para o mês mais recente com dados se o atual estiver vazio
  React.useEffect(() => {
    if (meses.length > 0 && !meses.includes(mesSel)) {
      setMesSel(meses[0]);
    }
  }, [meses.join(",")]); // eslint-disable-line

  // Mescla nova coleção + legado para garantir histórico completo
  const todasComissoes = useMemo(() => {
    // Deduplica por pacoteId: prefere registro novo (vendas_secretaria) sobre legado
    const porPacote = {};
    [...comissoesLegado, ...comissoes].forEach(c => {
      const key = c.pacoteId || c.id;
      if (!porPacote[key] || !c._legado) porPacote[key] = c;
    });
    return Object.values(porPacote);
  }, [comissoes, comissoesLegado]);
  const comissoesMes = todasComissoes.filter(c => c.mesRef === mesSel);
  // Secretária: registros sem responsável definido (vendas dela)
  const comissoesSecretaria = comissoesMes.filter(c => !c.responsavel);
  // Repasses: registros com responsável (parceiras, estagiária do social)
  const repassesMes = comissoesMes.filter(c => c.responsavel);
  const responsaveis = [...new Set(repassesMes.map(c => c.responsavel))];

  // Classificar comissões: limpas (entram no ciclo) vs suspeitas (fora do ciclo)
  const comissoesSecretariaPend = comissoesSecretaria.filter(c => c.status !== "pago");
  const comissoesSecretariaPagas = comissoesSecretaria.filter(c => c.status === "pago");
  function isComissaoSuspeita(c) {
    const pacoteVinc = c.pacoteId ? pacotes.find(p => p.id === c.pacoteId) : null;
    // Suspeita 1: pacote existe mas ainda está pendente
    if (pacoteVinc && (pacoteVinc.statusPag || "pendente") !== "recebido") return true;
    // Suspeita 2: valor base diverge do valor total do pacote
    if (pacoteVinc && Math.abs((c.valorBase || 0) - (pacoteVinc.valorTotal || 0)) > 0.01) return true;
    // Suspeita 3: tem pacoteId mas o pacote não existe mais
    if (c.pacoteId && !pacotes.some(p => p.id === c.pacoteId)) return true;
    return false;
  }

  // Apenas comissões limpas entram no ciclo de pagamento da Jéssica
  const comissoesPend = comissoesSecretariaPend.filter(c => !isComissaoSuspeita(c));
  const comissoesSuspeitas = comissoesSecretariaPend.filter(c => isComissaoSuspeita(c));
  const comissoesPagas = comissoesSecretariaPagas;
  const totalPend = comissoesPend.reduce((a, c) => a + (c.valorComissao || 0), 0);
  const totalPagas = comissoesPagas.reduce((a, c) => a + (c.valorComissao || 0), 0);
  const totalComissoes = totalPend + totalPagas;

  // Pagamentos já realizados neste mês (histórico)
  const pagamentosDoMes = lancamentos.filter(l => l.tipo_lancamento === "salario_secretaria" && l.mesRef === mesSel);
  const pagamentoMes = pagamentosDoMes[0] || null;
  const salarioJaPago = !!pagamentoMes;
  // Ciclo atual: salário fixo entra só no 1º pagamento do mês; depois, só comissões novas
  const totalAPagar = (salarioJaPago ? 0 : SALARIO_FIXO) + totalPend;
  const [mesLabel] = useState(() => {
    const [ano, mes] = mesSel.split("-");
    return new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
  });
  function getMesLabel(mesRef) {
    const [ano, mes] = mesRef.split("-");
    return new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric"
    });
  }
  async function pagarSalario() {
    const descr = salarioJaPago ? `${comissoesPend.length} comissão(ões) nova(s)` : `salário fixo + ${comissoesPend.length} comissão(ões)`;
    if (!confirm(`Confirma pagamento de R$ ${totalAPagar.toFixed(2).replace(".", ",")} para ${config.nomeSecretaria} (${descr}) em ${getMesLabel(mesSel)}?`)) return;
    setPagando(true);
    const hoje = new Date().toISOString().slice(0, 10);
    // Lança como despesa da clínica
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "despesa",
      tipo: "despesa",
      categoria: "Salário Secretária",
      descricao: salarioJaPago ? "Comissões Secretária (adicional)" : "Salário Secretária",
      centroCusto: "🏥 Clínica",
      mesRef: mesSel,
      valor: totalAPagar,
      valorSalarioFixo: salarioJaPago ? 0 : SALARIO_FIXO,
      valorComissoes: totalPend,
      qtdComissoes: comissoesPend.length,
      data: hoje,
      status: "pago",
      obs: `${salarioJaPago ? "Comissões adicionais" : "Salário"} ${getMesLabel(mesSel)} — ${config.nomeSecretaria}`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // Marca apenas as comissões pendentes da secretária como pagas
    const batch = db.batch();
    comissoesPend.forEach(c => {
      // Usa a coleção correta: nova ou legado
      const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
      batch.update(db.collection(col).doc(c.id), {
        status: "pago",
        dataPagamento: hoje
      });
    });
    await batch.commit();
    setPagando(false);
    alert("✅ Pagamento registrado! O ciclo zerou — novas vendas abrem o próximo pagamento.");
  }
  async function pagarRepasse(responsavel) {
    const pendentes = repassesMes.filter(c => c.responsavel === responsavel && c.status !== "pago");
    const totalRep = pendentes.reduce((a, c) => a + (c.valorComissao || 0), 0);
    if (pendentes.length === 0) return;
    const parc = parceiras.find(p => p.nome === responsavel);
    if (!confirm(`Confirma repasse de R$ ${totalRep.toFixed(2).replace(".", ",")} para ${responsavel} em ${getMesLabel(mesSel)}?${parc?.pix ? `\nPIX: ${parc.pix}` : ""}`)) return;
    setPagando(true);
    const hoje = new Date().toISOString().slice(0, 10);
    // Lança como despesa da clínica
    await db.collection("clinica_lancamentos").add({
      tipo_lancamento: "repasse_parceira",
      tipo: `Repasse — ${responsavel}`,
      mesRef: mesSel,
      valor: totalRep,
      data: hoje,
      status: "pago",
      obs: `Repasse ${getMesLabel(mesSel)} — ${responsavel} (${pendentes.length} venda(s))`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const batch = db.batch();
    pendentes.forEach(c => batch.update(db.collection("clinica_comissoes").doc(c.id), {
      status: "pago",
      dataPagamento: hoje
    }));
    await batch.commit();
    setPagando(false);
    alert(`✅ Repasse para ${responsavel} registrado como despesa da clínica!`);
  }
  const corTipoVenda = t => t === "primeira" ? "#7B00C4" : "#0891b2";
  const labelTipoVenda = t => t === "primeira" ? `🌟 Primeira Venda (${config.percPrimeira}%)` : `🔁 Recorrente (${config.percRecorrente}%)`;
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: ["Comissões — ", config.nomeSecretaria.split(" ")[0]]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: ["Salário fixo R$ ", SALARIO_FIXO.toFixed(2).replace(".", ","), " + comissões por vendas · Repasses a parceiras"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
          onClick: higienizarDuplicatas,
          style: {
            background: "none",
            border: "1px solid #c4b5fd",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            color: "#7c3aed",
            padding: "7px 14px",
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            display: "flex",
            alignItems: "center",
            gap: 5
          },
          title: "Remove registros duplicados de comissão pelo mesmo pacoteId",
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "trash-2",
            size: 13
          }, void 0, false), "🧹 Limpar Duplicatas"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          onClick: auditarComissoes,
          style: {
            background: "#059669",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            color: "white",
            padding: "7px 14px",
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            display: "flex",
            alignItems: "center",
            gap: 5
          },
          title: "Confere pacotes pagos de jun/jul vs registros de comissão",
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "search",
            size: 13
          }, void 0, false), "🔍 Auditar Jun/Jul"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), modalAuditComissao && /*#__PURE__*/_jsxDEV("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 600,
        padding: 20,
        overflowY: "auto"
      },
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 700,
          marginTop: 40
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontWeight: 700,
              fontSize: 18
            },
            children: "🔍 Auditoria de Comissões — Jun/Jul 2026"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setModalAuditComissao(false),
            style: {
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "#9ca3af"
            },
            children: "×"
          }, void 0, false)]
        }, void 0, true), auditando ? /*#__PURE__*/_jsxDEV("div", {
          style: {
            textAlign: "center",
            padding: 40,
            color: "var(--text-muted)"
          },
          children: "Analisando pacotes e comissões..."
        }, void 0, false) : auditResultado && (() => {
          const {
            pacotesPagos,
            pacotesPendentes,
            pagosComComissao,
            pagosSemComissao
          } = auditResultado;
          const fmtVal = v => `R$ ${parseFloat(v || 0).toFixed(2).replace(".", ",")}`;
          return /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 12,
                marginBottom: 20
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  background: "#f0fdf4",
                  borderRadius: 10,
                  padding: 14,
                  textAlign: "center"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#16a34a"
                  },
                  children: pacotesPagos.length
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: "#166534"
                  },
                  children: "Pacotes pagos jun/jul"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  background: "#f5f0ff",
                  borderRadius: 10,
                  padding: 14,
                  textAlign: "center"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#7B00C4"
                  },
                  children: pagosComComissao.length
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: "#4c1d95"
                  },
                  children: "Com comissão ✓"
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  background: pagosSemComissao.length > 0 ? "#fef2f2" : "#f0fdf4",
                  borderRadius: 10,
                  padding: 14,
                  textAlign: "center",
                  border: pagosSemComissao.length > 0 ? "2px solid #fca5a5" : "none"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 24,
                    fontWeight: 800,
                    color: pagosSemComissao.length > 0 ? "#dc2626" : "#16a34a"
                  },
                  children: pagosSemComissao.length
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: pagosSemComissao.length > 0 ? "#7f1d1d" : "#166534"
                  },
                  children: pagosSemComissao.length > 0 ? "⚠️ Sem comissão!" : "Tudo ok ✓"
                }, void 0, false)]
              }, void 0, true)]
            }, void 0, true), pagosSemComissao.length > 0 && /*#__PURE__*/_jsxDEV("div", {
              style: {
                marginBottom: 20
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#dc2626"
                  },
                  children: "⚠️ Pacotes pagos SEM comissão registrada"
                }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                  onClick: () => gerarTodasFaltantes(pagosSemComissao),
                  style: {
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)"
                  },
                  children: ["✚ Gerar todas (", pagosSemComissao.length, ")"]
                }, void 0, true)]
              }, void 0, true), pagosSemComissao.map(p => /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "#fef2f2",
                  borderRadius: 8,
                  marginBottom: 6,
                  border: "1px solid #fca5a5"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  children: [/*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontWeight: 600,
                      fontSize: 13
                    },
                    children: p.pacienteNome || "—"
                  }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontSize: 11,
                      color: "#6b7280"
                    },
                    children: [p.dataInicio, " · ", fmtVal(p.valorTotal), " · ", p.recorrencia]
                  }, void 0, true)]
                }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                  onClick: () => gerarComissaoFaltante(p),
                  style: {
                    background: "#7B00C4",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)"
                  },
                  children: "✚ Gerar comissão"
                }, void 0, false)]
              }, p.id, true))]
            }, void 0, true), pagosComComissao.length > 0 && /*#__PURE__*/_jsxDEV("div", {
              style: {
                marginBottom: 20
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#059669",
                  marginBottom: 8
                },
                children: "✓ Pacotes com comissão registrada"
              }, void 0, false), pagosComComissao.map(p => {
                const com = auditResultado.comissoesPorPacote[p.id];
                return /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#f0fdf4",
                    borderRadius: 8,
                    marginBottom: 6,
                    border: "1px solid #6ee7b7"
                  },
                  children: [/*#__PURE__*/_jsxDEV("div", {
                    children: [/*#__PURE__*/_jsxDEV("div", {
                      style: {
                        fontWeight: 600,
                        fontSize: 13
                      },
                      children: p.pacienteNome || "—"
                    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        fontSize: 11,
                        color: "#6b7280"
                      },
                      children: [p.dataInicio, " · ", fmtVal(p.valorTotal)]
                    }, void 0, true)]
                  }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      textAlign: "right"
                    },
                    children: [/*#__PURE__*/_jsxDEV("div", {
                      style: {
                        fontSize: 11,
                        color: "#059669",
                        fontWeight: 600
                      },
                      children: ["✓ Comissão: ", fmtVal(com?.valorComissao)]
                    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                      style: {
                        fontSize: 10,
                        color: "#9ca3af"
                      },
                      children: com?.status === "pago" ? "Paga" : "Pendente"
                    }, void 0, false)]
                  }, void 0, true)]
                }, p.id, true);
              })]
            }, void 0, true), pacotesPendentes.length > 0 && /*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#b45309",
                  marginBottom: 8
                },
                children: ["⏳ Pacotes ainda pendentes de pagamento (", pacotesPendentes.length, ")"]
              }, void 0, true), pacotesPendentes.map(p => /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  background: "#fffbeb",
                  borderRadius: 8,
                  marginBottom: 4,
                  border: "1px solid #fde68a"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  children: [/*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontWeight: 600,
                      fontSize: 13
                    },
                    children: p.pacienteNome || "—"
                  }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                    style: {
                      fontSize: 11,
                      color: "#6b7280"
                    },
                    children: [p.dataInicio, " · ", fmtVal(p.valorTotal)]
                  }, void 0, true)]
                }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 11,
                    color: "#b45309",
                    fontWeight: 600
                  },
                  children: "Comissão entra ao pagar"
                }, void 0, false)]
              }, p.id, true))]
            }, void 0, true)]
          }, void 0, true);
        })()]
      }, void 0, true)
    }, void 0, false), (() => {
      const listaMeses = meses.length > 0 ? meses : [mesSel];
      const idxAtual = listaMeses.indexOf(mesSel);
      const irAntes = () => {
        if (idxAtual < listaMeses.length - 1) setMesSel(listaMeses[idxAtual + 1]);
      };
      const irProx = () => {
        if (idxAtual > 0) setMesSel(listaMeses[idxAtual - 1]);
      };
      return /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20
        },
        children: [/*#__PURE__*/_jsxDEV("button", {
          onClick: irAntes,
          disabled: idxAtual >= listaMeses.length - 1,
          style: {
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "var(--purple)",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: idxAtual >= listaMeses.length - 1 ? 0.3 : 1
          },
          children: "‹"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 6,
            overflowX: "auto",
            flex: 1,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch"
          },
          children: listaMeses.map(m => /*#__PURE__*/_jsxDEV("button", {
            onClick: () => setMesSel(m),
            style: {
              padding: "6px 14px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
              background: m === mesSel ? "var(--purple)" : "var(--gray-100)",
              color: m === mesSel ? "white" : "var(--text)",
              display: Math.abs(listaMeses.indexOf(m) - idxAtual) <= 2 ? "flex" : "none",
              alignItems: "center"
            },
            children: getMesLabel(m)
          }, m, false))
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
          onClick: irProx,
          disabled: idxAtual <= 0,
          style: {
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "var(--purple)",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: idxAtual <= 0 ? 0.3 : 1
          },
          children: "›"
        }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
          style: {
            fontSize: 12,
            color: "var(--text-muted)",
            flexShrink: 0
          },
          children: [idxAtual + 1, "/", listaMeses.length]
        }, void 0, true)]
      }, void 0, true);
    })(), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        padding: "16px 20px",
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14
          },
          children: "⚙️ Configurações de Salário e Percentuais"
        }, void 0, false), !editandoConfig ? /*#__PURE__*/_jsxDEV("button", {
          onClick: () => {
            setFormConfig({
              ...config
            });
            setEditandoConfig(true);
          },
          style: {
            background: "var(--purple)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "7px 16px",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--font-body)"
          },
          children: "✏️ Editar"
        }, void 0, false) : /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 8
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            onClick: () => setEditandoConfig(false),
            style: {
              background: "white",
              color: "#6b7280",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "7px 14px",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "var(--font-body)"
            },
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: salvarConfig,
            disabled: salvandoConfig,
            style: {
              background: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "7px 16px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "var(--font-body)"
            },
            children: salvandoConfig ? "Salvando..." : "💾 Salvar"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true), !editandoConfig ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 24px",
          marginTop: 12,
          fontSize: 13,
          color: "#374151"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          children: ["👩‍💼 Secretária: ", /*#__PURE__*/_jsxDEV("strong", {
            children: config.nomeSecretaria
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          children: ["💵 Salário fixo: ", /*#__PURE__*/_jsxDEV("strong", {
            children: ["R$ ", SALARIO_FIXO.toFixed(2).replace(".", ",")]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          children: ["🌟 Primeira venda: ", /*#__PURE__*/_jsxDEV("strong", {
            children: [config.percPrimeira, "%"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          children: ["🔁 Recorrente: ", /*#__PURE__*/_jsxDEV("strong", {
            children: [config.percRecorrente, "%"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          children: ["🤝 Parceiro (padrão): ", /*#__PURE__*/_jsxDEV("strong", {
            children: [config.percParceiroPadrao, "%"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 12,
          marginTop: 14
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Nome da secretária"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: formConfig.nomeSecretaria,
            onChange: e => setFormConfig({
              ...formConfig,
              nomeSecretaria: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Salário fixo (R$)"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            value: formConfig.salarioFixo,
            onChange: e => setFormConfig({
              ...formConfig,
              salarioFixo: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "% primeira venda"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            value: formConfig.percPrimeira,
            onChange: e => setFormConfig({
              ...formConfig,
              percPrimeira: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "% recorrente"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            value: formConfig.percRecorrente,
            onChange: e => setFormConfig({
              ...formConfig,
              percRecorrente: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "% parceiro padrão"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            value: formConfig.percParceiroPadrao,
            onChange: e => setFormConfig({
              ...formConfig,
              percParceiroPadrao: e.target.value
            })
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          fontSize: 11,
          color: "var(--text-muted)",
          marginTop: 10
        },
        children: "Os novos percentuais valem para as próximas vendas; comissões já registradas não mudam."
      }, void 0, false)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
        gap: 16,
        marginBottom: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "var(--gray-50)",
          borderRadius: 14,
          padding: "18px 20px",
          border: "1px solid var(--gray-200)"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 6
          },
          children: "Salário Fixo"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text)"
          },
          children: ["R$ ", SALARIO_FIXO.toFixed(2).replace(".", ",")]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "var(--gray-50)",
          borderRadius: 14,
          padding: "18px 20px",
          border: "1px solid var(--gray-200)"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 6
          },
          children: "Comissões Pendentes"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 22,
            fontWeight: 700,
            color: "#7B00C4"
          },
          children: ["R$ ", totalPend.toFixed(2).replace(".", ",")]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 4
          },
          children: [comissoesPend.length, " venda(s) nova(s)", totalPagas > 0 && /*#__PURE__*/_jsxDEV("span", {
            style: {
              color: "#16a34a"
            },
            children: [" · ✓ R$ ", totalPagas.toFixed(2).replace(".", ","), " já pagas no mês"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: totalAPagar === 0 ? "#f0fdf4" : "#faf5ff",
          borderRadius: 14,
          padding: "18px 20px",
          border: `2px solid ${totalAPagar === 0 ? "#16a34a" : "#7B00C4"}`
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 6
          },
          children: ["Total a Pagar ", salarioJaPago ? "(novo ciclo)" : ""]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 26,
            fontWeight: 800,
            color: totalAPagar === 0 ? "#16a34a" : "#7B00C4"
          },
          children: totalAPagar === 0 ? "✓ Tudo pago" : `R$ ${totalAPagar.toFixed(2).replace(".", ",")}`
        }, void 0, false), pagamentoMes && /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontSize: 11,
            color: "#16a34a",
            marginTop: 4,
            fontWeight: 600
          },
          children: ["Último pagamento em ", pagamentosDoMes[0].data?.split("-").reverse().join("/"), " · ", pagamentosDoMes.length, " pagamento(s) no mês"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 10,
        marginBottom: 24,
        flexWrap: "wrap",
        alignItems: "center"
      },
      children: [totalAPagar > 0 && (salarioJaPago ? comissoesPend.length > 0 : true) && /*#__PURE__*/_jsxDEV("button", {
        onClick: pagarSalario,
        disabled: pagando,
        style: {
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: 10,
          padding: "12px 28px",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          fontFamily: "var(--font-body)"
        },
        children: pagando ? "Registrando..." : `💰 ${salarioJaPago ? "Pagar Comissões Novas" : "Registrar Pagamento"} — R$ ${totalAPagar.toFixed(2).replace(".", ",")}`
      }, void 0, false), (() => {
        const [showGrat, setShowGrat] = React.useState(false);
        const [valGrat, setValGrat] = React.useState("");
        const [obsGrat, setObsGrat] = React.useState("");
        const [salvGrat, setSalvGrat] = React.useState(false);
        async function registrarGratificacao() {
          const valor = parseFloat(valGrat);
          if (!valor || valor <= 0) {
            alert("Informe um valor válido.");
            return;
          }
          if (!obsGrat.trim()) {
            alert("Informe o motivo da gratificação.");
            return;
          }
          setSalvGrat(true);
          try {
            const hoje = new Date();
            const mesRef = mesSel;
            // Registra como comissão especial em vendas_secretaria
            await db.collection("vendas_secretaria").add({
              tipo: "Gratificação",
              tipoVenda: "gratificacao",
              perc: 0,
              valorBase: valor,
              valorComissao: valor,
              pacienteNome: `🎁 ${obsGrat.trim()}`,
              mesRef,
              pacoteId: null,
              status: "pendente",
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            // Registra também como lançamento financeiro (despesa)
            await db.collection("clinica_lancamentos").add({
              tipo: "despesa",
              tipo_lancamento: "despesa",
              categoria: "Salários",
              descricao: `Gratificação — ${config.nomeSecretaria} — ${obsGrat.trim()}`,
              valor,
              data: hoje.toISOString().slice(0, 10),
              centroCusto: "🏥 Clínica",
              mes: mesRef,
              formaPag: "PIX",
              status: "pago",
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setShowGrat(false);
            setValGrat("");
            setObsGrat("");
            alert(`✅ Gratificação de R$ ${valor.toFixed(2).replace(".", ",")} registrada com sucesso!`);
          } catch (e) {
            alert("Erro: " + e.message);
          }
          setSalvGrat(false);
        }
        return /*#__PURE__*/_jsxDEV("div", {
          children: [/*#__PURE__*/_jsxDEV("button", {
            onClick: () => setShowGrat(s => !s),
            style: {
              background: "none",
              border: "2px solid #7B00C4",
              color: "#7B00C4",
              borderRadius: 10,
              padding: "11px 18px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              display: "flex",
              alignItems: "center",
              gap: 6
            },
            children: "🎁 Registrar Gratificação"
          }, void 0, false), showGrat && /*#__PURE__*/_jsxDEV("div", {
            style: {
              marginTop: 10,
              background: "#f5f0ff",
              border: "1px solid #c4b5fd",
              borderRadius: 12,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minWidth: 280
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                fontWeight: 700,
                color: "#7B00C4"
              },
              children: ["🎁 Gratificação para ", config.nomeSecretaria]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("label", {
                style: {
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4
                },
                children: "VALOR (R$)"
              }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                type: "number",
                value: valGrat,
                onChange: e => setValGrat(e.target.value),
                placeholder: "Ex: 50",
                style: {
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #c4b5fd",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "var(--font-body)"
                }
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("label", {
                style: {
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6b7280",
                  display: "block",
                  marginBottom: 4
                },
                children: "MOTIVO"
              }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
                type: "text",
                value: obsGrat,
                onChange: e => setObsGrat(e.target.value),
                placeholder: "Ex: Ajuste jul/26 — diferença 10%→5%",
                style: {
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #c4b5fd",
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "var(--font-body)"
                }
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                gap: 8
              },
              children: [/*#__PURE__*/_jsxDEV("button", {
                onClick: registrarGratificacao,
                disabled: salvGrat,
                style: {
                  flex: 1,
                  background: "#7B00C4",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)"
                },
                children: salvGrat ? "Salvando..." : "✓ Confirmar"
              }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
                onClick: () => setShowGrat(false),
                style: {
                  padding: "9px 14px",
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "var(--font-body)"
                },
                children: "Cancelar"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true);
      })()]
    }, void 0, true), (() => {
      function gerarRecibo() {
        const mesLabel = getMesLabel(mesSel);
        const nomeSecretary = config.nomeSecretaria || "Secretária";
        // Inclui tanto pendentes quanto pagas do mês para o recibo histórico
        const itensPend = comissoesPend.map(c => ({
          desc: `${c.tipoVenda === "primeira" ? "1ª venda" : "Recorrente"} — ${c.pacienteNome || "Paciente"} (${c.perc || 10}%)`,
          valor: c.valorComissao || 0,
          status: "pendente"
        }));
        const itensPagos = comissoesPagas.map(c => ({
          desc: `${c.tipoVenda === "primeira" ? "1ª venda" : "Recorrente"} — ${c.pacienteNome || "Paciente"} (${c.perc || 10}%)`,
          valor: c.valorComissao || 0,
          status: "pago"
        }));
        const todoItens = [...itensPend, ...itensPagos];
        const totalRecibo = SALARIO_FIXO + todoItens.reduce((a, i) => a + i.valor, 0);
        const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Recibo de Pagamento — ${nomeSecretary} — ${mesLabel}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;padding:40px;max-width:620px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:3px solid #7B00C4;margin-bottom:24px}
.logo{font-family:Georgia,serif;font-size:22px;color:#7B00C4;font-weight:700}
.sub{font-size:10px;color:#6b7280;margin-top:3px}
h2{font-size:18px;color:#111827;margin-bottom:4px}
.mes{font-size:13px;color:#7B00C4;font-weight:600;margin-bottom:20px}
p{font-size:13px;color:#374151;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px}
th{background:#7B00C4;color:white;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase}
td{padding:8px 12px;border-bottom:1px solid #f3f4f6}
tr:nth-child(even) td{background:#fafafa}
.total-row td{font-weight:700;font-size:14px;border-top:2px solid #7B00C4;background:#f5f0ff;color:#7B00C4}
.assinatura{margin-top:40px;display:flex;justify-content:space-between;gap:40px}
.assinatura-bloco{flex:1;text-align:center}
.linha{border-top:1px solid #374151;margin-bottom:6px;margin-top:40px}
.nome-assinatura{font-size:12px;font-weight:600}
.cargo-assinatura{font-size:10px;color:#6b7280}
.footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
@media print{body{padding:20px}@page{margin:1.5cm}}
</style></head><body>
<div class="header">
  <div><div class="logo">Dra. Lucia Kratz</div><div class="sub">CRP 09/20590 · Psicóloga · Goiânia, GO</div></div>
  <div style="font-size:10px;color:#9ca3af">${new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        })}</div>
</div>
<h2>Recibo de Pagamento</h2>
<div class="mes">${mesLabel}</div>
<p>Declaro o recebimento da importância de <strong>R$ ${totalRecibo.toFixed(2).replace(".", ",")}</strong> referente à competência <strong>${mesLabel}</strong>:</p>
<table>
  <thead><tr><th>Descrição</th><th style="text-align:right;width:120px">Valor</th></tr></thead>
  <tbody>
    <tr><td>Salário Fixo</td><td style="text-align:right">R$ ${SALARIO_FIXO.toFixed(2).replace(".", ",")}</td></tr>
    ${todoItens.map(i => `<tr><td>${i.desc}</td><td style="text-align:right">R$ ${i.valor.toFixed(2).replace(".", ",")}</td></tr>`).join("")}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">R$ ${totalRecibo.toFixed(2).replace(".", ",")}</td></tr>
  </tbody>
</table>
<div class="assinatura">
  <div class="assinatura-bloco"><div class="linha"></div><div class="nome-assinatura">${nomeSecretary}</div><div class="cargo-assinatura">Secretária — Recebedor(a)</div></div>
  <div class="assinatura-bloco"><div class="linha"></div><div class="nome-assinatura">Dra. Lucia Kratz</div><div class="cargo-assinatura">CRP 09/20590 — Pagador(a)</div></div>
</div>
<div class="footer">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        })} · Clínica Dra. Lucia Kratz</div>
</body></html>`;
        const w = window.open("", "_blank");
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 800);
      }
      return /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginBottom: 16
        },
        children: /*#__PURE__*/_jsxDEV("button", {
          onClick: gerarRecibo,
          style: {
            background: "white",
            color: "#7B00C4",
            border: "2px solid #7B00C4",
            borderRadius: 10,
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            display: "flex",
            alignItems: "center",
            gap: 6
          },
          children: ["🖨️ Gerar Recibo — ", getMesLabel(mesSel)]
        }, void 0, true)
      }, void 0, false);
    })(), /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        overflow: "hidden"
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-200)",
          fontWeight: 700,
          fontSize: 14
        },
        children: ["🔄 Ciclo Atual (a pagar) — ", config.nomeSecretaria.split(" ")[0], " — ", getMesLabel(mesSel)]
      }, void 0, true), comissoesPend.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "30px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13
        },
        children: "✓ Nenhuma comissão pendente — novas vendas aparecem aqui e reabrem o pagamento"
      }, void 0, false) : comissoesPend.map(c => {
        const dataStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("pt-BR") : c.mesRef || "—";
        return /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid var(--gray-100)",
            background: "white"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600,
                fontSize: 14
              },
              children: c.pacienteNome || "—"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 2
              },
              children: [c.tipo, " · ", dataStr]
            }, void 0, true), c.pacoteId && /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 10,
                color: "#9ca3af",
                marginTop: 1
              },
              children: ["Pacote: ", c.pacoteId.slice(0, 8), "..."]
            }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 11,
                fontWeight: 700,
                color: corTipoVenda(c.tipoVenda),
                background: corTipoVenda(c.tipoVenda) + "18",
                padding: "2px 8px",
                borderRadius: 20,
                display: "inline-block",
                marginTop: 4
              },
              children: labelTipoVenda(c.tipoVenda)
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                textAlign: "right"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)"
                },
                children: ["Base: R$ ", (c.valorBase || 0).toFixed(2).replace(".", ",")]
              }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#7B00C4"
                },
                children: ["+R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")]
              }, void 0, true)]
            }, void 0, true), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("button", {
              title: "Excluir comissão",
              onClick: async () => {
                if (!confirm(`Excluir comissão de ${c.pacienteNome} (R$ ${(c.valorComissao || 0).toFixed(2).replace(".", ",")})?`)) return;
                const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
                await db.collection(col).doc(c.id).delete();
              },
              style: {
                background: "none",
                border: "1px solid #fca5a5",
                borderRadius: 6,
                color: "#dc2626",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: 11
              },
              children: "🗑️"
            }, void 0, false)]
          }, void 0, true)]
        }, c.id, true);
      })]
    }, void 0, true), comissoesSuspeitas.length > 0 && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "#fffbeb",
        borderRadius: 14,
        border: "1px solid #fde68a",
        overflow: "hidden",
        marginTop: 16
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "12px 20px",
          borderBottom: "1px solid #fde68a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          style: {
            fontWeight: 700,
            fontSize: 13,
            color: "#b45309"
          },
          children: ["⏳ Aguardando pagamento do pacote — ", comissoesSuspeitas.length, " comissão(ões) fora do ciclo"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          style: {
            fontSize: 11,
            color: "#92400e"
          },
          children: "Entram automaticamente quando o pacote for marcado como pago"
        }, void 0, false)]
      }, void 0, true), comissoesSuspeitas.map(c => {
        const pacoteVinc = c.pacoteId ? pacotes.find(p => p.id === c.pacoteId) : null;
        const semPacote = c.pacoteId && !pacoteVinc;
        const dataStr = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("pt-BR") : c.mesRef || "-";
        return /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderBottom: "1px solid #fef3c7"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#78350f"
                },
                children: c.pacienteNome || "-"
              }, void 0, false), semPacote && /*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontSize: 10,
                  background: "#fca5a5",
                  color: "#7f1d1d",
                  padding: "1px 6px",
                  borderRadius: 8,
                  fontWeight: 700
                },
                children: "Pacote removido"
              }, void 0, false), pacoteVinc && /*#__PURE__*/_jsxDEV("span", {
                style: {
                  fontSize: 10,
                  background: "#fed7aa",
                  color: "#7c2d12",
                  padding: "1px 6px",
                  borderRadius: 8,
                  fontWeight: 600
                },
                children: ["Pacote pendente · R$ ", (pacoteVinc.valorTotal || 0).toFixed(2).replace(".", ",")]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: "#92400e",
                marginTop: 2
              },
              children: [c.tipo, " · ", dataStr]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                textAlign: "right"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#92400e"
                },
                children: "Comissão prevista"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#b45309"
                },
                children: ["R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")]
              }, void 0, true)]
            }, void 0, true), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("button", {
              title: "Remover do sistema",
              onClick: async () => {
                if (!confirm(`Remover comissão de ${c.pacienteNome}? Ela será gerada novamente quando o pacote for pago.`)) return;
                const col = c._legado ? "clinica_comissoes" : "vendas_secretaria";
                await db.collection(col).doc(c.id).delete();
              },
              style: {
                background: "none",
                border: "1px solid #fca5a5",
                borderRadius: 6,
                color: "#dc2626",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: 11
              },
              children: "🗑️"
            }, void 0, false)]
          }, void 0, true)]
        }, c.id, true);
      })]
    }, void 0, true), (comissoesPagas.length > 0 || pagamentosDoMes.length > 0) && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        overflow: "hidden",
        marginTop: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-200)",
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          justifyContent: "space-between"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          children: ["✓ Histórico — ", getMesLabel(mesSel)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
          style: {
            fontSize: 13,
            color: "#16a34a",
            fontWeight: 600
          },
          children: ["R$ ", totalPagas.toFixed(2).replace(".", ","), " em comissões pagas"]
        }, void 0, true)]
      }, void 0, true), pagamentosDoMes.length > 0 && /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "10px 20px",
          background: "#f0fdf4",
          borderBottom: "1px solid var(--gray-100)"
        },
        children: pagamentosDoMes.map(pg => /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            padding: "4px 0"
          },
          children: [/*#__PURE__*/_jsxDEV("span", {
            style: {
              color: "#166534"
            },
            children: ["💰 ", pg.tipo, " — ", pg.data?.split("-").reverse().join("/"), pg.qtdComissoes ? ` · ${pg.qtdComissoes} comissão(ões)` : "", (pg.valorSalarioFixo || 0) > 0 ? ` · inclui salário fixo` : ""]
          }, void 0, true), /*#__PURE__*/_jsxDEV("strong", {
            style: {
              color: "#166534"
            },
            children: ["R$ ", (pg.valor || 0).toFixed(2).replace(".", ",")]
          }, void 0, true)]
        }, pg.id, true))
      }, void 0, false), comissoesPagas.map(c => /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          borderBottom: "1px solid var(--gray-100)",
          opacity: 0.75
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontWeight: 600,
              fontSize: 13
            },
            children: c.pacienteNome || "—"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 11,
              color: "var(--text-muted)"
            },
            children: [c.tipo, " · ", labelTipoVenda(c.tipoVenda), " · pago em ", c.dataPagamento ? c.dataPagamento.split("-").reverse().join("/") : "—"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 700,
            fontSize: 14,
            color: "#16a34a"
          },
          children: ["✓ R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")]
        }, void 0, true)]
      }, c.id, true))]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        overflow: "hidden",
        marginTop: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-200)",
          fontWeight: 700,
          fontSize: 14
        },
        children: ["🤝 Repasses a Parceiras — ", getMesLabel(mesSel)]
      }, void 0, true), responsaveis.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "30px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13
        },
        children: "Nenhum repasse neste mês. Vendas em parceria aparecem aqui automaticamente."
      }, void 0, false) : responsaveis.map(resp => {
        const itens = repassesMes.filter(c => c.responsavel === resp);
        const totalResp = itens.reduce((a, c) => a + (c.valorComissao || 0), 0);
        const pendentes = itens.filter(c => c.status !== "pago");
        const totalPend = pendentes.reduce((a, c) => a + (c.valorComissao || 0), 0);
        const parc = parceiras.find(p => p.nome === resp);
        return /*#__PURE__*/_jsxDEV("div", {
          style: {
            borderBottom: "1px solid var(--gray-100)"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              background: "#fffbeb",
              flexWrap: "wrap",
              gap: 10
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14
                },
                children: resp
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  color: "var(--text-muted)"
                },
                children: [itens.length, " venda(s) · Total R$ ", totalResp.toFixed(2).replace(".", ","), parc?.pix ? ` · PIX: ${parc.pix}` : ""]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 12
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  textAlign: "right"
                },
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 11,
                    color: "var(--text-muted)"
                  },
                  children: "Pendente"
                }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontWeight: 800,
                    fontSize: 18,
                    color: totalPend > 0 ? "#b45309" : "#16a34a"
                  },
                  children: ["R$ ", totalPend.toFixed(2).replace(".", ",")]
                }, void 0, true)]
              }, void 0, true), user.tipo === "psicologa" && totalPend > 0 && /*#__PURE__*/_jsxDEV("button", {
                onClick: () => pagarRepasse(resp),
                disabled: pagando,
                style: {
                  background: "#b45309",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 16px",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)"
                },
                children: pagando ? "..." : "💸 Marcar como pago"
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), itens.map(c => /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 20px",
              borderTop: "1px solid var(--gray-100)"
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 600,
                  fontSize: 13
                },
                children: c.pacienteNome || "—"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "var(--text-muted)"
                },
                children: [c.tipo, " · ", c.perc ? `${c.perc}% de R$ ${(c.valorBase || 0).toFixed(2).replace(".", ",")}` : ""]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                textAlign: "right"
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#b45309"
                },
                children: ["R$ ", (c.valorComissao || 0).toFixed(2).replace(".", ",")]
              }, void 0, true), c.status === "pago" ? /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#16a34a",
                  fontWeight: 600
                },
                children: ["✓ Pago ", c.dataPagamento ? c.dataPagamento.split("-").reverse().join("/") : ""]
              }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: "#b45309",
                  fontWeight: 600
                },
                children: "Pendente"
              }, void 0, false)]
            }, void 0, true)]
          }, c.id, true))]
        }, resp, true);
      })]
    }, void 0, true), user.tipo === "psicologa" && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "white",
        borderRadius: 14,
        border: "1px solid var(--gray-200)",
        overflow: "hidden",
        marginTop: 24
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "14px 20px",
          borderBottom: "1px solid var(--gray-200)",
          fontWeight: 700,
          fontSize: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [/*#__PURE__*/_jsxDEV("span", {
          children: "Parceiras Cadastradas"
        }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
          onClick: () => {
            setEditandoParceira(null);
            setFormParceira({
              nome: "",
              percentual: String(config.percParceiroPadrao || 70),
              pix: "",
              tipo: "parceira"
            });
            setModalParceira(true);
          },
          style: {
            background: "var(--purple)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "7px 16px",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--font-body)"
          },
          children: "+ Nova Parceira"
        }, void 0, false)]
      }, void 0, true), parceiras.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        style: {
          padding: "30px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13
        },
        children: "Nenhuma parceira cadastrada. Cadastre para usar nas vendas em parceria."
      }, void 0, false) : parceiras.map(p => /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          borderBottom: "1px solid var(--gray-100)"
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              fontWeight: 600,
              fontSize: 14
            },
            children: [p.nome, " ", p.tipo === "estagiaria" && /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 10,
                fontWeight: 700,
                background: "#ccfbf1",
                color: "#0d9488",
                padding: "2px 8px",
                borderRadius: 10,
                marginLeft: 6
              },
              children: "Estagiária"
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              fontSize: 12,
              color: "var(--text-muted)"
            },
            children: ["Repasse padrão: ", p.percentual || config.percParceiroPadrao, "% ", p.pix ? ` · PIX: ${p.pix}` : ""]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 6
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            onClick: () => {
              setEditandoParceira(p.id);
              setFormParceira({
                nome: p.nome || "",
                percentual: String(p.percentual || config.percParceiroPadrao || 70),
                pix: p.pix || "",
                tipo: p.tipo || "parceira"
              });
              setModalParceira(true);
            },
            style: {
              background: "none",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              cursor: "pointer",
              padding: "5px 10px",
              fontSize: 12
            },
            children: "✏️"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            onClick: async () => {
              if (!confirm(`Excluir parceira ${p.nome}? Os repasses já registrados não serão apagados.`)) return;
              await db.collection("clinica_parceiras").doc(p.id).delete();
            },
            style: {
              background: "none",
              border: "1px solid #fca5a5",
              borderRadius: 6,
              color: "#dc2626",
              cursor: "pointer",
              padding: "5px 10px",
              fontSize: 12
            },
            children: "🗑️"
          }, void 0, false)]
        }, void 0, true)]
      }, p.id, true))]
    }, void 0, true), modalParceira && /*#__PURE__*/_jsxDEV("div", {
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
      onClick: () => setModalParceira(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "white",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 420
        },
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 20
          },
          children: editandoParceira ? "Editar Parceira" : "Nova Parceira"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Nome"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: formParceira.nome,
            onChange: e => setFormParceira({
              ...formParceira,
              nome: e.target.value
            }),
            placeholder: "Ex: Thais Cordeiro"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "% de repasse padrão"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "number",
            min: "0",
            max: "100",
            value: formParceira.percentual,
            onChange: e => setFormParceira({
              ...formParceira,
              percentual: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 14
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Chave PIX (opcional)"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            value: formParceira.pix,
            onChange: e => setFormParceira({
              ...formParceira,
              pix: e.target.value
            })
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          style: {
            marginBottom: 20
          },
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Tipo"
          }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
            className: "form-input",
            value: formParceira.tipo,
            onChange: e => setFormParceira({
              ...formParceira,
              tipo: e.target.value
            }),
            children: [/*#__PURE__*/_jsxDEV("option", {
              value: "parceira",
              children: "Parceira (vendas em parceria)"
            }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
              value: "estagiaria",
              children: "Estagiária (projeto social)"
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10,
            justifyContent: "flex-end"
          },
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setModalParceira(false),
            children: "Cancelar"
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-purple",
            onClick: salvarParceira,
            children: editandoParceira ? "Salvar alterações" : "Salvar"
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
}
function Depoimentos() {
  const [lista, setLista] = useState([]);
  const [aba, setAba] = useState("pendente");
  const [salvando, setSalvando] = useState(null);
  const [respostaEdit, setRespostaEdit] = useState({});
  const [salvandoResposta, setSalvandoResposta] = useState(null);
  useEffect(() => {
    const unsub = db.collection("site_depoimentos").orderBy("createdAt", "desc").onSnapshot(s => setLista(s.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))), () => {});
    return unsub;
  }, []);
  const filtrado = lista.filter(d => d.status === aba);
  const pendentes = lista.filter(d => d.status === "pendente").length;
  async function aprovar(id) {
    setSalvando(id);
    await db.collection("site_depoimentos").doc(id).update({
      status: "aprovado"
    });
    setSalvando(null);
  }
  async function rejeitar(id) {
    if (!confirm("Rejeitar este depoimento?")) return;
    await db.collection("site_depoimentos").doc(id).update({
      status: "rejeitado"
    });
  }
  async function excluir(id) {
    if (!confirm("Excluir permanentemente?")) return;
    await db.collection("site_depoimentos").doc(id).delete();
  }
  async function salvarResposta(id) {
    const texto = (respostaEdit[id] || "").trim();
    setSalvandoResposta(id);
    await db.collection("site_depoimentos").doc(id).update({
      resposta: texto
    });
    setSalvandoResposta(null);
  }
  function Estrelas({
    n
  }) {
    return /*#__PURE__*/_jsxDEV("span", {
      style: {
        color: "#7B00C4",
        fontSize: 16,
        letterSpacing: 2
      },
      children: ["★".repeat(n || 5), "☆".repeat(5 - (n || 5))]
    }, void 0, true);
  }
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 12
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "page-title",
          children: "Depoimentos"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "page-subtitle",
          children: "Gerencie os depoimentos do site"
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap"
        },
        children: [/*#__PURE__*/_jsxDEV("a", {
          href: "../feedback/",
          target: "_blank",
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 10,
            background: "var(--purple-soft)",
            color: "var(--purple)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none"
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "external-link",
            size: 14
          }, void 0, false), " Ver formulário"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 13
          },
          onClick: () => {
            navigator.clipboard.writeText("https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/feedback/");
            alert("Link copiado!");
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "copy",
            size: 14
          }, void 0, false), " Copiar link"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("a", {
          href: "../depoimentos/",
          target: "_blank",
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 10,
            background: "var(--purple-soft)",
            color: "var(--purple)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none"
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "star",
            size: 14
          }, void 0, false), " Página depoimentos"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-ghost",
          style: {
            fontSize: 13
          },
          onClick: () => {
            navigator.clipboard.writeText("https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/depoimentos/");
            alert("Link copiado!");
          },
          children: [/*#__PURE__*/_jsxDEV(Icon, {
            name: "link",
            size: 14
          }, void 0, false), " Copiar link"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        gap: 0,
        marginBottom: 20,
        borderBottom: "2px solid var(--gray-200)"
      },
      children: [["pendente", "⏳ Pendentes", pendentes], ["aprovado", "✓ Aprovados", lista.filter(d => d.status === "aprovado").length], ["rejeitado", "✗ Rejeitados", lista.filter(d => d.status === "rejeitado").length]].map(([id, label, count]) => /*#__PURE__*/_jsxDEV("button", {
        onClick: () => setAba(id),
        style: {
          padding: "10px 20px",
          border: "none",
          background: "none",
          cursor: "pointer",
          fontWeight: aba === id ? 600 : 400,
          color: aba === id ? "var(--purple)" : "#6b7280",
          borderBottom: aba === id ? "2px solid var(--purple)" : "2px solid transparent",
          marginBottom: -2,
          fontSize: 14,
          fontFamily: "var(--font-body)",
          display: "flex",
          alignItems: "center",
          gap: 6
        },
        children: [label, count > 0 && /*#__PURE__*/_jsxDEV("span", {
          style: {
            background: id === "pendente" ? "#dc2626" : "var(--purple-soft)",
            color: id === "pendente" ? "white" : "var(--purple)",
            borderRadius: 20,
            padding: "1px 7px",
            fontSize: 11,
            fontWeight: 700
          },
          children: count
        }, void 0, false)]
      }, id, true))
    }, void 0, false), filtrado.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        textAlign: "center",
        padding: 48,
        color: "var(--text-muted)"
      },
      children: [/*#__PURE__*/_jsxDEV(Icon, {
        name: "star",
        size: 40
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginTop: 12,
          fontWeight: 500
        },
        children: aba === "pendente" ? "Nenhum depoimento aguardando aprovação" : aba === "aprovado" ? "Nenhum depoimento aprovado ainda" : "Nenhum depoimento rejeitado"
      }, void 0, false)]
    }, void 0, true) : /*#__PURE__*/_jsxDEV("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      },
      children: filtrado.map(d => /*#__PURE__*/_jsxDEV("div", {
        className: "card",
        style: {
          padding: "20px 24px"
        },
        children: /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--purple-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "var(--purple)",
                  flexShrink: 0
                },
                children: (d.nome || "?")[0].toUpperCase()
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                children: [/*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontWeight: 700,
                    fontSize: 15
                  },
                  children: d.nome
                }, void 0, false), d.cargo && /*#__PURE__*/_jsxDEV("div", {
                  style: {
                    fontSize: 12,
                    color: "var(--text-muted)"
                  },
                  children: d.cargo
                }, void 0, false)]
              }, void 0, true), /*#__PURE__*/_jsxDEV(Estrelas, {
                n: d.estrelas
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("p", {
              style: {
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.7,
                fontStyle: "italic"
              },
              children: ["\"", d.texto, "\""]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 11,
                color: "var(--text-muted)",
                marginTop: 8
              },
              children: d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              }) : ""
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                marginTop: 14,
                background: "var(--purple-bg,#f5eeff)",
                borderRadius: 10,
                padding: 14
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--purple)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                },
                children: [/*#__PURE__*/_jsxDEV(Icon, {
                  name: "message-circle",
                  size: 14
                }, void 0, false), " Sua resposta (aparece no site)"]
              }, void 0, true), /*#__PURE__*/_jsxDEV("textarea", {
                className: "form-input",
                style: {
                  width: "100%",
                  minHeight: 60,
                  fontSize: 13,
                  fontFamily: "var(--font-body)",
                  resize: "vertical"
                },
                placeholder: "Escreva aqui sua resposta pública a este depoimento...",
                value: respostaEdit[d.id] !== undefined ? respostaEdit[d.id] : d.resposta || "",
                onChange: e => setRespostaEdit(prev => ({
                  ...prev,
                  [d.id]: e.target.value
                }))
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 8
                },
                children: /*#__PURE__*/_jsxDEV("button", {
                  className: "btn btn-purple",
                  style: {
                    fontSize: 12,
                    padding: "6px 14px"
                  },
                  onClick: () => salvarResposta(d.id),
                  disabled: salvandoResposta === d.id,
                  children: [/*#__PURE__*/_jsxDEV(Icon, {
                    name: "save",
                    size: 13
                  }, void 0, false), " ", salvandoResposta === d.id ? "Salvando..." : "Salvar resposta"]
                }, void 0, true)
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              gap: 8,
              flexShrink: 0
            },
            children: [aba === "pendente" && /*#__PURE__*/_jsxDEV(_Fragment, {
              children: [/*#__PURE__*/_jsxDEV("button", {
                className: "btn btn-purple",
                style: {
                  fontSize: 12,
                  padding: "7px 14px"
                },
                onClick: () => aprovar(d.id),
                disabled: salvando === d.id,
                children: [/*#__PURE__*/_jsxDEV(Icon, {
                  name: "check",
                  size: 13
                }, void 0, false), " ", salvando === d.id ? "..." : "Aprovar"]
              }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                className: "btn btn-ghost",
                style: {
                  fontSize: 12,
                  padding: "7px 14px",
                  color: "#dc2626",
                  borderColor: "#fca5a5"
                },
                onClick: () => rejeitar(d.id),
                children: [/*#__PURE__*/_jsxDEV(Icon, {
                  name: "x",
                  size: 13
                }, void 0, false), " Rejeitar"]
              }, void 0, true)]
            }, void 0, true), aba === "rejeitado" && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-purple",
              style: {
                fontSize: 12,
                padding: "7px 14px"
              },
              onClick: () => aprovar(d.id),
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "check",
                size: 13
              }, void 0, false), " Aprovar mesmo assim"]
            }, void 0, true), aba === "aprovado" && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                fontSize: 12,
                padding: "7px 14px",
                color: "#dc2626",
                borderColor: "#fca5a5"
              },
              onClick: () => rejeitar(d.id),
              children: [/*#__PURE__*/_jsxDEV(Icon, {
                name: "x",
                size: 13
              }, void 0, false), " Remover do site"]
            }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              style: {
                fontSize: 12,
                padding: "7px 10px",
                color: "#dc2626"
              },
              onClick: () => excluir(d.id),
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: "trash-2",
                size: 13
              }, void 0, false)
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)
      }, d.id, false))
    }, void 0, false)]
  }, void 0, true);
}
function Configuracoes() {
  const [tiposLaudo, setTiposLaudo] = useState(["Avaliacao Neuropsicologica", "Avaliacao Psicologica", "Avaliacao Infantil", "Avaliacao de TDAH", "Avaliacao de Altas Habilidades", "Pericia Psicologica", "Demandas Judiciais", "Orientacao de Carreira", "Relatorio de Acompanhamento", "Outro"]);
  const [novoTipo, setNovoTipo] = useState("");
  const [logoUrl, setLogoUrl] = useState("../logo-transparente.png");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  function adicionarTipo() {
    const t = novoTipo.trim();
    if (!t || tiposLaudo.includes(t)) return;
    setTiposLaudo(prev => [...prev, t]);
    setNovoTipo("");
  }
  async function salvarTipos() {
    setSalvando(true);
    await db.collection("clinica_config").doc("laudoTypes").set({
      tipos: tiposLaudo
    });
    setMsg("Tipos de laudo salvos!");
    setSalvando(false);
    setTimeout(() => setMsg(""), 3000);
  }
  async function alterarSenha() {
    if (senhaAtual !== "1234") {
      setMsg("Senha atual incorreta.");
      return;
    }
    if (novaSenha.length < 4) {
      setMsg("Nova senha deve ter ao menos 4 caracteres.");
      return;
    }
    if (novaSenha !== confirmSenha) {
      setMsg("Senhas nao conferem.");
      return;
    }
    await db.collection("clinica_config").doc("admin").set({
      senha: novaSenha
    });
    setMsg("Senha alterada! Atualize o arquivo app.js com a nova senha.");
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmSenha("");
  }
  return /*#__PURE__*/_jsxDEV("div", {
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "page-header",
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "page-title",
        children: "Configuracoes"
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        className: "page-subtitle",
        children: "Personalize sua identidade clinica e documentos"
      }, void 0, false)]
    }, void 0, true), msg && /*#__PURE__*/_jsxDEV("div", {
      style: {
        background: "var(--purple-bg)",
        border: "1px solid var(--purple)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 20,
        fontSize: 14,
        color: "var(--purple)",
        fontWeight: 500
      },
      children: msg
    }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 4
        },
        children: "Identidade Visual"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 20
        },
        children: "Logotipo e assinatura digital para laudos e documentos oficiais."
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 14
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--gray-200)"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 44,
              height: 44,
              background: "var(--purple-soft)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "image",
              size: 22
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600
              },
              children: "Logo / Identidade Visual"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                color: "var(--text-muted)"
              },
              children: "Logotipo que aparecera no cabecalho dos laudos e documentos oficiais. Formatos aceitos: PNG, JPG, SVG."
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-outline",
            style: {
              fontSize: 13
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "upload",
              size: 14
            }, void 0, false), " Enviar Logo"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--gray-200)"
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              width: 44,
              height: 44,
              background: "#f5f3ff",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "pen-line",
              size: 22
            }, void 0, false)
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600
              },
              children: "Assinatura Digital"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                color: "var(--text-muted)"
              },
              children: "Imagem da sua assinatura manuscrita para uso nos laudos assinados. Recomendado fundo transparente (PNG)."
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-outline",
            style: {
              fontSize: 13
            },
            children: [/*#__PURE__*/_jsxDEV(Icon, {
              name: "upload",
              size: 14
            }, void 0, false), " Enviar Assinatura"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid var(--gray-200)",
            background: "var(--gray-50)"
          },
          children: [/*#__PURE__*/_jsxDEV("img", {
            src: "../logo-transparente.png",
            alt: "Logo padrao",
            style: {
              width: 56,
              height: 56,
              borderRadius: 10,
              objectFit: "contain",
              background: "var(--purple)",
              padding: 6
            },
            onError: e => e.target.style.display = "none"
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            style: {
              flex: 1
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600
              },
              children: "Logo Padrao do Sistema"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 13,
                color: "var(--text-muted)"
              },
              children: "Esta e a logo padrao. Ela e usada automaticamente enquanto voce nao enviar uma logo personalizada."
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              style: {
                fontSize: 12,
                marginTop: 4
              },
              children: [/*#__PURE__*/_jsxDEV("strong", {
                children: "Dra. Lucia Kratz"
              }, void 0, false), " · Psicologa Doutora · CRP 09/20590"]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      style: {
        marginBottom: 20
      },
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 4
        },
        children: "Sobre os Laudos"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 16,
          lineHeight: 1.7
        },
        children: "Os laudos gerados seguem a Resolucao CFP no 06/2019. Ao clicar em \"Assinar Laudo\", o documento recebe um registro de data/hora da assinatura e sua assinatura digital."
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          background: "var(--purple-bg)",
          borderRadius: 10,
          padding: 16
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            fontWeight: 600,
            marginBottom: 12
          },
          children: "Tipos de Laudo disponíveis"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 14
          },
          children: tiposLaudo.map((t, i) => /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "white",
              borderRadius: 8,
              padding: "10px 14px",
              border: "1px solid var(--gray-200)"
            },
            children: [/*#__PURE__*/_jsxDEV("span", {
              style: {
                flex: 1,
                fontSize: 14
              },
              children: t
            }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
              style: {
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--gray-400)",
                padding: 4
              },
              onClick: () => setTiposLaudo(prev => prev.filter((_, idx) => idx !== i)),
              children: /*#__PURE__*/_jsxDEV(Icon, {
                name: "x",
                size: 14
              }, void 0, false)
            }, void 0, false)]
          }, i, true))
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            display: "flex",
            gap: 10
          },
          children: [/*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            style: {
              flex: 1
            },
            placeholder: "Adicionar novo tipo...",
            value: novoTipo,
            onChange: e => setNovoTipo(e.target.value),
            onKeyDown: e => e.key === "Enter" && adicionarTipo()
          }, void 0, false), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-outline",
            onClick: adicionarTipo,
            children: /*#__PURE__*/_jsxDEV(Icon, {
              name: "plus",
              size: 16
            }, void 0, false)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-purple",
          style: {
            marginTop: 14,
            width: "100%"
          },
          onClick: salvarTipos,
          disabled: salvando,
          children: salvando ? "Salvando..." : "Salvar tipos de laudo"
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "card",
      children: [/*#__PURE__*/_jsxDEV("div", {
        style: {
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 4
        },
        children: "Segurança"
      }, void 0, false), /*#__PURE__*/_jsxDEV("p", {
        style: {
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 16
        },
        children: "Alterar senha de acesso da Psicologa."
      }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          marginBottom: 14
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Senha atual"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "password",
            value: senhaAtual,
            onChange: e => setSenhaAtual(e.target.value)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Nova senha"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "password",
            value: novaSenha,
            onChange: e => setNovaSenha(e.target.value)
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "form-group",
          children: [/*#__PURE__*/_jsxDEV("label", {
            className: "form-label",
            children: "Confirmar nova senha"
          }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
            className: "form-input",
            type: "password",
            value: confirmSenha,
            onChange: e => setConfirmSenha(e.target.value)
          }, void 0, false)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "btn btn-purple",
        onClick: alterarSenha,
        children: [/*#__PURE__*/_jsxDEV(Icon, {
          name: "key",
          size: 15
        }, void 0, false), " Alterar Senha"]
      }, void 0, true)]
    }, void 0, true)]
  }, void 0, true);
}

// ═══════════════════════════════════════════════════════
// AGENDA — Doctoralia integrado via iframe
// ═══════════════════════════════════════════════════════
