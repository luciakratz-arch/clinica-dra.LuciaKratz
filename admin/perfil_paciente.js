function AbaPerfil({ paciente, pacientes }) {
  const [form, setForm] = useState({...paciente});
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function salvar() {
    setSalvando(true);
    const { id, ...dados } = form;
    await db.collection("clinica_pacientes").doc(paciente.id).update(dados);
    setSalvando(false);
    alert("Salvo!");
  }

  async function redefinirSenha() {
    await db.collection("clinica_pacientes").doc(paciente.id).update({ senha:"1234" });
    alert("Senha redefinida para 1234.");
  }

  const msgAcesso = "Ola, "+paciente.nome+"! 🦋\n\nSeu acesso ao portal terapeutico da Dra. Lucia Kratz esta pronto.\n\nLink: "+SITE_URL+"/clinica/\n\nNome de acesso: "+paciente.nome+"\nSenha: 1234\n\nDra. Lucia Kratz - CRP 09/20590";

  function copiarMsg() {
    const msg = "Ola, "+paciente.nome+"! 🦋\n\nSeu acesso ao portal terapeutico da Dra. Lucia Kratz esta pronto.\n\nLink de acesso: "+SITE_URL+"/clinica/\n\nNome de acesso: "+paciente.nome+"\nSenha: 1234\n\nAo entrar, pesquise seu nome no campo e use a senha acima.\n\nQualquer duvida, estou a disposicao!\nDra. Lucia Kratz - CRP 09/20590";
    navigator.clipboard.writeText(msg);
    setCopiado(true);
    setTimeout(()=>setCopiado(false),2000);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div className="card">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div className="form-group" style={{gridColumn:"span 2"}}>
            <label className="form-label">Nome completo</label>
            <input className="form-input" value={form.nome||""} onChange={e=>setForm({...form,nome:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input className="form-input" value={form.telefone||""} onChange={e=>setForm({...form,telefone:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Data de Nascimento</label>
            <input className="form-input" type="date" value={form.dataNasc||""} onChange={e=>setForm({...form,dataNasc:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">CPF</label>
            <input className="form-input" value={form.cpf||""} onChange={e=>setForm({...form,cpf:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Genero</label>
            <select className="form-input" value={form.genero||""} onChange={e=>setForm({...form,genero:e.target.value})}>
              <option value="">Selecione</option>
              <option>Feminino</option><option>Masculino</option><option>Nao-binario</option><option>Nao informar</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              {[["ativo","Ativo","var(--success)"],["inativo","Inativo","var(--danger)"],["alta","Alta","var(--gray-400)"]].map(([s,l,c])=>(
                <button key={s} onClick={()=>setForm({...form,status:s})} style={{
                  padding:"7px 14px",borderRadius:20,border:"1.5px solid "+c,cursor:"pointer",fontSize:13,
                  fontFamily:"var(--font-body)",background:form.status===s?c:"white",color:form.status===s?"white":c
                }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{gridColumn:"span 2",fontSize:12,fontWeight:700,color:"var(--purple)",borderBottom:"1px solid var(--purple-soft)",paddingBottom:4,marginTop:4,textTransform:"uppercase",letterSpacing:0.5}}>
            🏢 Dados Ocupacionais — para documentos NR-1 e declarações
          </div>
          <div className="form-group" style={{gridColumn:"span 2"}}>
            <label className="form-label">Empresa Contratante</label>
            <input className="form-input" value={form.empresa||""} onChange={e=>setForm({...form,empresa:e.target.value})} placeholder="Ex: Construtora Horizonte Ltda."/>
          </div>
          <div className="form-group">
            <label className="form-label">Setor</label>
            <input className="form-input" value={form.setor||""} onChange={e=>setForm({...form,setor:e.target.value})} placeholder="Ex: Administrativo"/>
          </div>
          <div className="form-group">
            <label className="form-label">Cargo</label>
            <input className="form-input" value={form.cargo||""} onChange={e=>setForm({...form,cargo:e.target.value})} placeholder="Ex: Analista de RH"/>
          </div>
          <div className="form-group" style={{gridColumn:"span 2"}}>
            <label className="form-label">Objetivos Terapeuticos</label>
            <TextAreaVoz className="form-input" rows={3} value={form.objetivos||""} onChange={e=>setForm({...form,objetivos:e.target.value})} placeholder="Descreva os objetivos da terapia..."/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button className="btn btn-purple" onClick={salvar} disabled={salvando}>{salvando?"Salvando...":"Salvar alteracoes"}</button>
        </div>
      </div>
      <div className="card">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><Icon name="key" size={18}/><div style={{fontWeight:600}}>Credenciais de Acesso</div></div>
        <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:16}}>Copie o texto abaixo e envie para o paciente. A senha padrao e <strong>1234</strong>.</p>
        <div style={{background:"var(--gray-50)",border:"1px solid var(--gray-200)",borderRadius:10,padding:16,fontSize:13,lineHeight:1.8,color:"var(--text-muted)"}}>
          {"Ola, "+paciente.nome+"! 🦋\n\nSeu acesso ao portal terapeutico da Dra. Lucia Kratz esta pronto.\nLink: "+SITE_URL+"/clinica/\nNome de acesso: "+paciente.nome+"\nSenha: 1234\n\nDra. Lucia Kratz - CRP 09/20590"}
        </div>
        <div style={{display:"flex",gap:10,marginTop:12}}>
          <button className="btn btn-outline" onClick={copiarMsg}><Icon name="copy" size={15}/> {copiado?"Copiado!":"Copiar mensagem"}</button>
          <button className="btn btn-ghost" onClick={redefinirSenha}><Icon name="key" size={15}/> Redefinir senha para 1234</button>
        </div>
      </div>
    </div>
  );
}

// ABA MODULOS
// FERRAMENTAS FIXAS DO MÓDULO I
const FERRAMENTAS_MOD1 = [
  { id:"humor",  nome:"Check-in Diário",      desc:"Registro de humor e bem-estar diário" },
  { id:"metas",  nome:"Metas Terapêuticas",   desc:"Acompanhamento de metas" },
  { id:"diario", nome:"Diário Terapêutico",   desc:"Escrita reflexiva livre" },
  // Pensamentos Automáticos e Reflexões Cognitivas → Módulo III (Ansiedade e Controle dos Pensamentos)
];

function Toggle({ ativo, onClick }) {
  return (
    <button onClick={onClick} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:ativo?"var(--purple)":"var(--gray-200)",position:"relative",transition:"background .2s",flexShrink:0}}>
      <span style={{position:"absolute",top:2,left:ativo?"22px":"2px",width:20,height:20,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
    </button>
  );
}

function AbaModulos({ paciente }) {
  const [config, setConfig] = useState(paciente.modulosConfig || {});
  const [recursos, setRecursos] = useState([]);
  const [fabulas, setFabulas] = useState([]);
  const [psicoeducacao, setPsicoeducacao] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [modalSugestao, setModalSugestao] = useState(null); // {ferramenta, categoria, sugestoes}
  const [sugestoesSel, setSugestoesSel] = useState({});

  useEffect(() => {
    // Busca config atualizado do Firebase (ignora cache da prop)
    db.collection("clinica_pacientes").doc(paciente.id).get().then(d => {
      if (d.exists && d.data().modulosConfig) setConfig(d.data().modulosConfig);
    });
    db.collection("clinica_recursos").get().then(s => setRecursos(s.docs.map(d=>({id:d.id,...d.data()}))));
    db.collection("clinica_fabulas").onSnapshot(s => setFabulas(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
    db.collection("clinica_psicoeducacao").onSnapshot(s => setPsicoeducacao(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{});
  }, [paciente.id]);

  async function salvarConfig(novaConfig) {
    setConfig(novaConfig);
    // Atualiza também modulosAtivos para compatibilidade
    const ativos = Object.keys(novaConfig).filter(k => novaConfig[k]?.ativo);
    await db.collection("clinica_pacientes").doc(paciente.id).update({
      modulosConfig: novaConfig,
      modulosAtivos: ativos
    });
  }

  function toggleModulo(modId) {
    const atual = config[modId] || {};
    const novaConfig = { ...config, [modId]: { ...atual, ativo: !atual.ativo, ferramentas: atual.ferramentas || {} } };
    salvarConfig(novaConfig);
  }

  function toggleFerramenta(modId, ferrId) {
    const modAtual = config[modId] || { ativo: true, ferramentas: {} };
    const ferrAtual = modAtual.ferramentas || {};
    const hoje = new Date().toISOString().split("T")[0];
    const estaAtiva = !!ferrAtual[ferrId];

    // Se está desativando, só remove — sem sugestão
    if(estaAtiva){
      const novaFerr = { ...ferrAtual };
      delete novaFerr[ferrId];
      salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: novaFerr } });
      return;
    }

    // Ativando — primeiro salva a ferramenta
    const novaFerr = { ...ferrAtual, [ferrId]: { ativo: true, dataInicio: hoje } };
    salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: novaFerr } });

    // Busca categoria da ferramenta para sugestões
    const rec = recursos.find(r=>r.id===ferrId);
    const catFerr = rec?.categoria || "";
    const macroId = FAB_LEGADO_MACRO[catFerr] || catFerr;
    if(!macroId || !macroId.startsWith("macro_")) return; // sem sugestões para cats sem macro

    // Busca fábulas e psicoeducações da mesma macrocategoria não ativadas
    const ferrAtivadas = new Set(Object.keys(novaFerr));
    const fabSugest = fabulas.filter(f=>
      (FAB_LEGADO_MACRO[f.categoria||""]===macroId || f.categoria===macroId) &&
      !ferrAtivadas.has(f.id)
    ).slice(0,3);
    const psicoSugest = psicoeducacao.filter(p=>
      (PSICO_LEGADO_MACRO[p.categoria||""]===macroId || p.categoria===macroId) &&
      !ferrAtivadas.has(p.id)
    ).slice(0,3);

    if(fabSugest.length===0 && psicoSugest.length===0) return;

    const macro = MACROCATEGORIAS.find(m=>m.id===macroId);
    setModalSugestao({
      ferramenta: rec?.titulo || ferrId,
      categoria: macro?.label || macroId,
      cor: macro?.cor || "#7B00C4",
      bg: macro?.bg || "#f3e6ff",
      icone: macro?.icone || "🔧",
      modId,
      fabulas: fabSugest,
      psicoeducacao: psicoSugest,
    });
    setSugestoesSel({});
  }

  async function ativarSugestoes(){
    if(!modalSugestao) return;
    const hoje = new Date().toISOString().split("T")[0];
    const modAtual = config[modalSugestao.modId] || { ativo:true, ferramentas:{} };
    const ferrAtual = { ...modAtual.ferramentas };
    // Ativa fábulas selecionadas no mod2
    const modFab = config["mod2"] || { ativo:true, ferramentas:{} };
    const ferrFab = { ...modFab.ferramentas };
    // Ativa psico selecionadas no mod6
    const modPsico = config["mod6"] || { ativo:true, ferramentas:{} };
    const ferrPsico = { ...modPsico.ferramentas };

    Object.entries(sugestoesSel).forEach(([id, sel])=>{
      if(!sel) return;
      const isFab = modalSugestao.fabulas.some(f=>f.id===id);
      const isPsico = modalSugestao.psicoeducacao.some(p=>p.id===id);
      if(isFab) ferrFab[id] = { ativo:true, dataInicio: hoje };
      if(isPsico) ferrPsico[id] = { ativo:true, dataInicio: hoje };
    });

    await db.collection("clinica_pacientes").doc(paciente.id).update({
      modulosConfig: {
        ...config,
        mod2: { ...modFab, ativo:true, ferramentas: ferrFab },
        mod6: { ...modPsico, ativo:true, ferramentas: ferrPsico },
      },
      modulosAtivos: [...new Set([...Object.keys(config).filter(k=>config[k]?.ativo), "mod2", "mod6"])],
    });
    setConfig(c=>({
      ...c,
      mod2: { ...modFab, ativo:true, ferramentas: ferrFab },
      mod6: { ...modPsico, ativo:true, ferramentas: ferrPsico },
    }));
    setModalSugestao(null);
  }

  function setDataInicio(modId, ferrId, data) {
    const modAtual = config[modId] || { ativo: true, ferramentas: {} };
    const ferrAtual = modAtual.ferramentas || {};
    salvarConfig({ ...config, [modId]: { ...modAtual, ferramentas: { ...ferrAtual, [ferrId]: { ...(ferrAtual[ferrId]||{}), dataInicio: data } } } });
  }

  const MODULOS_DEF = [
    { id:"mod1", nome:"Módulo I — Dashboard", desc:"Ferramentas do dia a dia", icone:"🧠", ferramentas: FERRAMENTAS_MOD1 },
    { id:"mod2", nome:"Módulo II — Fábulas Terapêuticas", desc:"Fábulas cadastradas em Recursos", icone:"📖", ferramentas: fabulas.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.macroCategoria||f.categoria||"", cat:f.macroCategoria||f.categoria||""})) },
    { id:"mod3", nome:"Módulo III — Ferramentas", desc:"Ferramentas cadastradas em Recursos", icone:"🔧", ferramentas: recursos.filter(r=>r.categoria!=="musicoterapia"&&r.categoria!=="casal").map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.macroCategoria||f.categoria||"", cat:f.macroCategoria||f.categoria||""})) },
    { id:"mod4", nome:"Módulo IV — Musicoterapia", desc:"Ferramentas de musicoterapia", icone:"🎵", ferramentas: recursos.filter(r=>r.categoria==="musicoterapia").map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.descricao||""})) },
    { id:"mod5", nome:"Módulo V — Terapia de Casais", desc:"Etapas da terapia de casais", icone:"💑",
      ferramentas: [
        {id:"etapa1-casal", nome:"Etapa 1 — Reconexão e Segurança Emocional",    desc:"Reduzir defensividade e aumentar conexão emocional"},
        {id:"etapa2-casal", nome:"Etapa 2 — Identidade e Vínculo do Casal",       desc:"Resgatar identidade afetiva e visão compartilhada"},
        {id:"etapa3-casal", nome:"Etapa 3 — Conceitualização Cognitiva",          desc:"Identificar padrões cognitivos e crenças relacionais"},
        {id:"etapa4-casal", nome:"Etapa 4 — Reestruturação Relacional",           desc:"Criar novos padrões emocionais e comportamentais"},
      ],
      automatico: false },
    { id:"mod6", nome:"Módulo VI — Psicoeducação", desc:"Materiais psicoeducativos cadastrados em Recursos", icone:"🎓",
      ferramentas: psicoeducacao.map(f=>({id:f.id, nome:f.titulo||f.nome, desc:f.macroCategoria||f.categoria||"", cat:f.macroCategoria||f.categoria||""})) },
  ];

  // Módulos que agrupam por macrocategoria
  const MODS_COM_GRUPO = new Set(["mod2","mod3","mod6"]);

  // Mapa categoria → macrocategoria para agrupamento
  const CAT_PARA_MACRO_MOD = {
    // Ferramentas (mod3)
    ansiedade_diaria:"macro_ansiedade", distorcoes:"macro_ansiedade",
    crencas_esquemas:"macro_ansiedade", autocritica:"macro_ansiedade", procrastinacao:"macro_ansiedade",
    tcc:"macro_ansiedade", ansiedade:"macro_ansiedade", esquema:"macro_ansiedade",
    depressao:"macro_humor", desamor:"macro_humor", regulacao_emocional:"macro_humor",
    burnout:"macro_humor", vergonha:"macro_humor", emocoes:"macro_humor",
    rotina:"macro_habitos", sono:"macro_habitos", motivacao:"macro_habitos",
    neuroplasticidade:"macro_habitos", praticas_autocuidado:"macro_habitos", autocuidado:"macro_habitos",
    comunicacao:"macro_relacionamentos", dependencia:"macro_relacionamentos",
    limites:"macro_relacionamentos", ciumes:"macro_relacionamentos", toxicos:"macro_relacionamentos",
    relacionamentos:"macro_relacionamentos",
    conflitos_casal:"macro_casais", sexualidade:"macro_casais",
    parentalidade:"macro_casais", conflitos_familia:"macro_casais", traicao:"macro_casais",
    alimentacao:"macro_habitos", autoimagem:"macro_habitos", nervovago:"macro_habitos",
    sintomas_fisicos:"macro_habitos", saude_mental:"macro_habitos", corpo:"macro_habitos",
    musicoterapia:"macro_musico",
    avaliacao:"macro_aval",
    macro_corpo:"macro_habitos", macro_habitos:"macro_habitos",
    compulsao_ciclo:"macro_compulsao", compulsao_habitos:"macro_compulsao",
    compulsao_emocional:"macro_compulsao", compulsao_vinculos:"macro_compulsao",
    compulsao_aval:"macro_compulsao", compulsao:"macro_compulsao", macro_compulsao:"macro_compulsao",
    // Fábulas (mod2) — por tema
    resiliencia:"macro_habitos", esperanca:"macro_humor", autoconfianca:"macro_humor",
    autoconhecimento:"macro_ansiedade", perspectiva:"macro_habitos",
    mindfulness:"macro_habitos", ansiedade_fab:"macro_ansiedade",
    // Categorias adicionais de fábulas
    "resiliência":"macro_habitos", "esperança":"macro_humor",
    "autoconfiança":"macro_humor", "autoestima":"macro_humor",
    "expressão emocional":"macro_humor", "regulação emocional":"macro_humor",
    "perdão":"macro_humor", "crescimento":"macro_habitos",
    "autoconhecimento":"macro_ansiedade", "perspectiva":"macro_habitos",
    "mindfulness":"macro_habitos", "criatividade":"macro_habitos",
    "proposito":"macro_habitos", "propósito":"macro_habitos",
    // Psicoeducação (mod6) — igual ferramentas
  };

  // Mapa macroId → info visual
  const MACRO_INFO = {
    macro_ansiedade:      {icone:"🧠", label:"Ansiedade e Controle dos Pensamentos", cor:"#7B00C4", bg:"#f3e6ff"},
    macro_humor:          {icone:"❤️", label:"Humor e Regulação Emocional",          cor:"#db2777", bg:"#fce7f3"},
    macro_habitos:        {icone:"🌿", label:"Corpo, Saúde e Autocuidado",           cor:"#16a34a", bg:"#dcfce7"},
    macro_relacionamentos:{icone:"🤝", label:"Conflitos Interpessoais e Relacionamentos", cor:"#0891b2", bg:"#e0f2fe"},
    macro_casais:         {icone:"💑", label:"Casais, Família e Parentalidade",      cor:"#d97706", bg:"#fef3c7"},
    macro_compulsao:      {icone:"🔒", label:"Compulsão Sexual",                     cor:"#7c3aed", bg:"#ede9fe"},
    macro_musico:         {icone:"🎵", label:"Musicoterapia",                        cor:"#7B00C4", bg:"#f3e6ff"},
    macro_aval:           {icone:"📋", label:"Avaliação e Anamnese",                 cor:"#6366f1", bg:"#e0e7ff"},
    _outros:              {icone:"🔧", label:"Outros",                               cor:"#6b7280", bg:"#f3f4f6"},
  };

  // Mapa nome da ferramenta → macro (para itens com categoria "outro")
  const NOME_PARA_MACRO = {
    "Mapa de Intensidade": "macro_habitos",
    "Mapa de Intimidade": "macro_casais",
    "Roda da Vida Integral": "macro_habitos",
    "Protocolo dos 3 Mapas": "macro_relacionamentos",
    "Diário de Parentalidade Compassiva": "macro_casais",
    "Diário de Autocompaixão": "macro_humor",
    "Plano de Ativação Comportamental": "macro_humor",
    "Prática de Presença": "macro_habitos",
    "Empilhamento de Hábitos": "macro_habitos",
    "Protocolo de Regulação Nervosa": "macro_habitos",
    "Mapeamento do Ciclo de Conflito": "macro_relacionamentos",
    "Análise em Cadeia": "macro_ansiedade",
    "Registo CNV": "macro_relacionamentos",
    "Registro CNV": "macro_relacionamentos",
    "Mapa de Triangulação": "macro_casais",
    "Kit SOS Emocional": "macro_humor",
    "Mapa de Limites Pessoais": "macro_relacionamentos",
    "Ritual de Descompressão Noturna": "macro_habitos",
    "Pausa Estratégica": "macro_humor",
    "Mapa da Bateria": "macro_habitos",
    "Mapa de Diferenciação": "macro_relacionamentos",
    "Diário Corpo-Mente": "macro_habitos",
    "Escuta Ativa": "macro_relacionamentos",
    "Regra dos 5 Minutos": "macro_habitos",
    "Inventário de Carga Mental": "macro_relacionamentos",
    "Árvore da Decisão": "macro_ansiedade",
    "Diagnóstico de Macroatividades x Desgastes": "macro_habitos",
    "Rastreamento Bipolar / Borderline": "macro_aval",
    "Saude Sexual": "macro_aval",
    "Habitos Alimentares": "macro_aval",
    "Funcionamento e Comportamento": "macro_aval",
    "Dependencia Quimica e Substancias": "macro_aval",
    "Dependencia de Jogos e Apostas": "macro_aval",
  };

  function agruparPorMacro(ferramentas) {
    const grupos = {};
    ferramentas.forEach(f => {
      const raw = f.desc || f.cat || "";
      let macroId;
      // 1. Já é macro_* direto
      if (MACRO_INFO[raw]) {
        macroId = raw;
      // 2. É "outro" ou vazio — tentar pelo nome
      } else if (!raw || raw === "outro" || raw === "outros") {
        // Busca parcial no nome
        const nomeLower = (f.nome||"").toLowerCase();
        const encontrado = Object.entries(NOME_PARA_MACRO).find(([k])=>nomeLower.includes(k.toLowerCase()));
        macroId = encontrado ? encontrado[1] : "_outros";
      // 3. Mapear categoria técnica
      } else {
        macroId = CAT_PARA_MACRO_MOD[raw] || CAT_PARA_MACRO_MOD[f.cat] || "_outros";
      }
      if (!grupos[macroId]) grupos[macroId] = [];
      grupos[macroId].push(f);
    });
    return Object.entries(MACRO_INFO)
      .filter(([id]) => grupos[id]?.length > 0)
      .map(([id, info]) => ({ id, ...info, itens: grupos[id] }));
  }

  const [gruposAbertos, setGruposAbertos] = useState({});
  function toggleGrupo(modId, grupoId) {
    const key = modId+"_"+grupoId;
    setGruposAbertos(g => ({...g, [key]: !g[key]}));
  }

  function renderFerramenta(ferr, modId, ferramentas) {
    const ferrConfig = ferramentas[ferr.id];
    const ferrAtiva = !!ferrConfig;
    return (
      <div key={ferr.id} style={{background:"white",borderRadius:10,
        border:`1.5px solid ${ferrAtiva?"var(--purple)":"var(--gray-200)"}`,
        padding:"12px 16px",display:"flex",alignItems:"center",gap:12,transition:"border-color .2s"}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:500,fontSize:13}}>{ferr.nome}</div>
          {ferr.desc && <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{ferr.desc}</div>}
        </div>
        {ferrAtiva && (
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <label style={{fontSize:11,color:"var(--text-muted)"}}>Início:</label>
            <input type="date" value={ferrConfig.dataInicio||""} onChange={e=>setDataInicio(modId,ferr.id,e.target.value)}
              style={{fontSize:12,border:"1px solid var(--gray-200)",borderRadius:6,padding:"3px 6px",fontFamily:"var(--font-body)"}}/>
          </div>
        )}
        <Toggle ativo={ferrAtiva} onClick={()=>toggleFerramenta(modId,ferr.id)}/>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {MODULOS_DEF.map(mod => {
        const modConfig = config[mod.id] || {};
        const ativo = !!modConfig.ativo;
        const ferramentas = modConfig.ferramentas || {};
        const usaGrupo = MODS_COM_GRUPO.has(mod.id);
        return (
          <div key={mod.id} style={{background:"white",borderRadius:14,border:`2px solid ${ativo?"var(--purple)":"var(--gray-200)"}`,overflow:"hidden",transition:"border-color .2s"}}>
            {/* Cabeçalho */}
            <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:ativo?"var(--purple-bg)":"white"}}>
              <div style={{fontSize:24}}>{mod.icone}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:"var(--text)"}}>{mod.nome}</div>
                <div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{mod.desc}</div>
              </div>
              {mod.automatico
                ? <span style={{fontSize:12,color:"var(--text-muted)",fontStyle:"italic"}}>automático</span>
                : <Toggle ativo={ativo} onClick={()=>toggleModulo(mod.id)}/>}
            </div>

            {/* Ferramentas */}
            {ativo && !mod.automatico && (
              <div style={{borderTop:"1px solid var(--gray-100)",padding:"12px 20px",background:"#fafafa"}}>
                {mod.ferramentas.length === 0 ? (
                  <div style={{fontSize:13,color:"var(--text-muted)",padding:"8px 0"}}>
                    Nenhuma ferramenta cadastrada neste módulo ainda.
                  </div>
                ) : usaGrupo ? (
                  // ── Agrupado por macrocategoria ──
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {agruparPorMacro(mod.ferramentas).map(grupo => {
                      const key = mod.id+"_"+grupo.id;
                      const aberto = !!gruposAbertos[key]; // fechado por padrão
                      const ativosNoGrupo = grupo.itens.filter(f=>!!ferramentas[f.id]).length;
                      return (
                        <div key={grupo.id} style={{borderRadius:10,border:`1.5px solid ${grupo.cor}30`,overflow:"hidden"}}>
                          {/* Header do grupo */}
                          <div onClick={()=>toggleGrupo(mod.id,grupo.id)}
                            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                              background:grupo.bg,cursor:"pointer",userSelect:"none"}}>
                            <span style={{fontSize:16}}>{grupo.icone}</span>
                            <span style={{fontWeight:700,fontSize:12,color:grupo.cor,flex:1}}>
                              {grupo.label}
                            </span>
                            {ativosNoGrupo>0 && (
                              <span style={{background:grupo.cor,color:"white",borderRadius:20,
                                padding:"2px 8px",fontSize:11,fontWeight:700}}>
                                {ativosNoGrupo} ativo{ativosNoGrupo!==1?"s":""}
                              </span>
                            )}
                            <span style={{fontSize:11,color:grupo.cor,marginLeft:4}}>
                              {aberto?"▲":"▼"} {grupo.itens.length}
                            </span>
                          </div>
                          {/* Itens do grupo */}
                          {aberto && (
                            <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:8,background:"white"}}>
                              {grupo.itens.map(ferr => renderFerramenta(ferr, mod.id, ferramentas))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // ── Lista simples (mod1, mod4, mod5) ──
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>FERRAMENTAS DISPONÍVEIS</div>
                    {mod.ferramentas.map(ferr => renderFerramenta(ferr, mod.id, ferramentas))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    {/* Modal de sugestões */}
    {modalSugestao&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,
        display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:520,
          maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
          <div style={{background:`linear-gradient(135deg,${modalSugestao.cor},${modalSugestao.cor}cc)`,
            borderRadius:"16px 16px 0 0",padding:"18px 24px",color:"white"}}>
            <div style={{fontSize:11,opacity:0.85,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"}}>
              {modalSugestao.icone} {modalSugestao.categoria}
            </div>
            <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700,marginBottom:4}}>
              ✨ Sugestões para complementar
            </div>
            <div style={{fontSize:13,opacity:0.9}}>
              Você ativou <b>{modalSugestao.ferramenta}</b>. Selecione fábulas e psicoeducações da mesma temática.
            </div>
          </div>
          <div style={{padding:"20px 24px"}}>
            {modalSugestao.fabulas.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--purple)",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="book-open" size={15}/> Fábulas Terapêuticas
                </div>
                {modalSugestao.fabulas.map(f=>(
                  <label key={f.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",marginBottom:6,
                    background:sugestoesSel[f.id]?"var(--purple-soft)":"#fafafa",
                    border:`1.5px solid ${sugestoesSel[f.id]?"var(--purple)":"var(--gray-200)"}`,transition:"all .15s"}}>
                    <input type="checkbox" checked={!!sugestoesSel[f.id]}
                      onChange={e=>setSugestoesSel(s=>({...s,[f.id]:e.target.checked}))}
                      style={{marginTop:2,accentColor:"var(--purple)",flexShrink:0}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{f.titulo||f.nome}</div>
                      {f.moral&&<div style={{fontSize:11,color:"var(--text-muted)",marginTop:2,fontStyle:"italic"}}>"{f.moral}"</div>}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {modalSugestao.psicoeducacao.length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontWeight:700,fontSize:13,color:"var(--purple)",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="brain" size={15}/> Psicoeducação
                </div>
                {modalSugestao.psicoeducacao.map(p=>(
                  <label key={p.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",marginBottom:6,
                    background:sugestoesSel[p.id]?"var(--purple-soft)":"#fafafa",
                    border:`1.5px solid ${sugestoesSel[p.id]?"var(--purple)":"var(--gray-200)"}`,transition:"all .15s"}}>
                    <input type="checkbox" checked={!!sugestoesSel[p.id]}
                      onChange={e=>setSugestoesSel(s=>({...s,[p.id]:e.target.checked}))}
                      style={{marginTop:2,accentColor:"var(--purple)",flexShrink:0}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{p.titulo||p.nome}</div>
                      {p.descricao&&<div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{p.descricao.slice(0,80)}</div>}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setModalSugestao(null)}
                style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid var(--gray-200)",background:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                Agora não
              </button>
              <button onClick={()=>{const algum=Object.values(sugestoesSel).some(v=>v);if(algum)ativarSugestoes();else setModalSugestao(null);}}
                style={{flex:2,padding:"10px",borderRadius:8,border:"none",background:"var(--purple)",color:"white",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>
                {Object.values(sugestoesSel).some(v=>v)?`✓ Ativar ${Object.values(sugestoesSel).filter(v=>v).length} selecionado(s)`:"Fechar sem ativar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

// ABA FERRAMENTAS
function AbaFerramentas({ paciente }) {
  const [ferramentas, setFerramentas] = useState(paciente.ferramentasAtivas||[]);
  async function toggle(id) {
    const novas = ferramentas.includes(id)?ferramentas.filter(f=>f!==id):[...ferramentas,id];
    setFerramentas(novas);
    await db.collection("clinica_pacientes").doc(paciente.id).update({ferramentasAtivas:novas});
  }
  return (
    <div className="card">
      <div style={{fontWeight:600,marginBottom:4}}>Ferramentas Terapeuticas</div>
      <p style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>Selecione as ferramentas disponiveis para este paciente no portal.</p>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {FERRAMENTAS.map(f=>(
          <div key={f.id} style={{display:"flex",alignItems:"center",gap:14,padding:16,borderRadius:10,border:"1.5px solid",borderColor:ferramentas.includes(f.id)?"var(--purple)":"var(--gray-200)",background:ferramentas.includes(f.id)?"var(--purple-bg)":"white",cursor:"pointer",transition:"all .2s"}} onClick={()=>toggle(f.id)}>
            <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{f.nome}</div><div style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>{f.desc}</div></div>
            <button style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:ferramentas.includes(f.id)?"var(--purple)":"var(--gray-200)",position:"relative",flexShrink:0}}>
              <span style={{position:"absolute",top:2,left:ferramentas.includes(f.id)?"22px":"2px",width:20,height:20,borderRadius:"50%",background:"white",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ABA METAS
// URLs do portal do paciente para visualização de cada ferramenta
const PORTAL_URLS = {
  humor:      "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#humor",
  diario:     "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#diario",
  metas:      "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#metas",
  reflexoes:  "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#reflexoes",
  tcc:        "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#tcc",
  respiracao: "https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#respiracao",
  relaxamento:"https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/#relaxamento",
};

function AbaModulo1({ paciente }) {
  const [dados, setDados] = useState({humor:[],diario:[],metas:[],reflexoes:[],tcc:[],respiracao:[],relaxamento:[]});
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null); // id da ferramenta em preview

  useEffect(()=>{
    const id = paciente.id;
    Promise.all([
      db.collection("clinica_humor").where("pacienteId","==",id).get(),
      db.collection("clinica_diario").where("pacienteId","==",id).get(),
      db.collection("clinica_metas").where("pacienteId","==",id).where("status","==","ativa").get(),
      db.collection("clinica_reflexoes").where("pacienteId","==",id).get(),
      db.collection("clinica_tcc").where("pacienteId","==",id).get(),
      db.collection("clinica_atividades").where("pacienteId","==",id).where("tipo","==","respiracao").get(),
      db.collection("clinica_atividades").where("pacienteId","==",id).where("tipo","==","relaxamento").get(),
    ]).then(([h,d,m,r,t,resp,relax])=>{
      setDados({
        humor:    h.docs.map(x=>({id:x.id,...x.data()})),
        diario:   d.docs.map(x=>({id:x.id,...x.data()})),
        metas:    m.docs.map(x=>({id:x.id,...x.data()})),
        reflexoes:r.docs.map(x=>({id:x.id,...x.data()})),
        tcc:      t.docs.map(x=>({id:x.id,...x.data()})),
        respiracao: resp.docs.map(x=>({id:x.id,...x.data()})),
        relaxamento:relax.docs.map(x=>({id:x.id,...x.data()})),
      });
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[paciente.id]);

  const ITENS = [
    { id:"humor",  icone:"❤️", nome:"Check-in Diário",     qtd:dados.humor.length,  ultima:dados.humor.sort((a,b)=>(b.data||"").localeCompare(a.data||""))[0]?.data },
    { id:"metas",  icone:"🎯", nome:"Metas Terapêuticas",  qtd:dados.metas.length,  ultima:null },
    { id:"diario", icone:"📔", nome:"Diário Terapêutico",  qtd:dados.diario.length, ultima:dados.diario.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0))[0]?.data },
    // Pensamentos e Reflexões → Módulo III / Ansiedade e Controle dos Pensamentos
  ];

  // Descrições resumidas para o modal de preview
  const DESC = {
    humor:      "Registro diário da escala de humor do paciente.",
    diario:     "Espaço de escrita reflexiva livre, como um diário terapêutico.",
    metas:      "Metas terapêuticas com acompanhamento de progresso.",
    reflexoes:  "Exercícios de reestruturação cognitiva e insight.",
    tcc:        "Registro ABC de pensamentos automáticos — Modelo TCC.",
    respiracao: "Exercício de respiração diafragmática 4-7-8 para regulação emocional.",
    relaxamento:"Técnica de relaxamento muscular progressivo de Jacobson.",
  };

  return (
    <div>
      <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Módulo 1 — Dashboard</div>
      <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20}}>
        Ferramentas básicas do dia a dia de {paciente.nome.split(" ")[0]}
      </div>

      {loading
        ? <div style={{textAlign:"center",padding:32,color:"var(--text-muted)"}}>Carregando...</div>
        : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
            {ITENS.map(item=>(
              <div key={item.id} style={{background:"white",border:"1px solid var(--gray-100)",
                borderRadius:14,padding:18,boxShadow:"0 2px 8px rgba(123,0,196,0.05)",
                display:"flex",flexDirection:"column",gap:10}}>

                {/* Header */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:40,height:40,borderRadius:10,background:"var(--purple-soft)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {item.icone}
                  </div>
                  <div style={{fontWeight:600,fontSize:13,lineHeight:1.3}}>{item.nome}</div>
                </div>

                {/* Contagem */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:24,fontWeight:700,color:"var(--purple)"}}>{item.qtd}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"right"}}>
                    {item.qtd===0 ? "Sem registros" : `registro${item.qtd!==1?"s":""}`}
                    {item.ultima&&<div style={{marginTop:2}}>Último: {new Date(item.ultima+"T00:00:00").toLocaleDateString("pt-BR")}</div>}
                  </div>
                </div>

                {/* Botão visualizar */}
                <button onClick={()=>setPreview(item.id)}
                  style={{width:"100%",padding:"7px",borderRadius:8,border:"1px solid var(--purple)",
                    background:"white",color:"var(--purple)",cursor:"pointer",
                    fontSize:12,fontWeight:600,fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <Icon name="eye" size={13}/> Visualizar
                </button>
              </div>
            ))}
          </div>
        )
      }

      {/* Modal de preview — iframe do portal */}
      {preview&&(()=>{
        const item = ITENS.find(i=>i.id===preview);
        const TAB_MAP = {
          humor:"humor", diario:"diario", metas:"metas",
          reflexoes:"reflexoes", tcc:"tcc",
          respiracao:"ferramentas", relaxamento:"ferramentas",
        };
        const tab = TAB_MAP[preview]||"painel";
        const url = `https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/?preview=${tab}&email=${encodeURIComponent(paciente.email||"")}&senha=${encodeURIComponent(paciente.senha||"1234")}`;
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,
            display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
            onClick={()=>setPreview(null)}>
            <div style={{background:"white",borderRadius:16,width:"100%",maxWidth:900,
              height:"85vh",display:"flex",flexDirection:"column",
              boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}
              onClick={e=>e.stopPropagation()}>

              {/* Header */}
              <div style={{background:"linear-gradient(135deg,#7B00C4,#5a0090)",
                borderRadius:"16px 16px 0 0",padding:"14px 20px",color:"white",
                display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22}}>{item?.icone}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{item?.nome}</div>
                    <div style={{fontSize:11,opacity:0.8}}>👁 Prévia — visão de {paciente.nome.split(" ")[0]}</div>
                  </div>
                </div>
                <button onClick={()=>setPreview(null)}
                  style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,
                    padding:"6px 14px",color:"white",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>
                  ✕ Fechar
                </button>
              </div>

              {/* iFrame do portal */}
              <iframe
                src={`https://luciakratz-arch.github.io/clinica-dra.LuciaKratz/clinica/`}
                style={{flex:1,border:"none",borderRadius:"0 0 16px 16px"}}
                title="Prévia do portal do paciente"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function AbaMetas({ paciente }) {
  const [metas, setMetas] = useState([]);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null); // id da meta em edição
  const [form, setForm] = useState({titulo:"",categoria:"Emocional",progresso:0,status:"ativa"});

  useEffect(()=>{
    // Usa clinica_metas (coleção raiz) com pacienteId — mesma que o portal do paciente lê
    const unsub = db.collection("clinica_metas")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        setMetas(snap.docs.map(d=>({id:d.id,...d.data()})));
      },()=>{});
    return unsub;
  },[paciente.id]);

  function abrirNova(){
    setEditando(null);
    setForm({titulo:"",categoria:"Emocional",progresso:0,status:"ativa"});
    setModal(true);
  }
  function abrirEdicao(m){
    setEditando(m.id);
    setForm({titulo:m.titulo||"",categoria:m.categoria||"Emocional",progresso:m.progresso||0,status:m.status||"ativa"});
    setModal(true);
  }
  async function salvar() {
    if(!form.titulo){alert("Titulo obrigatorio.");return;}
    if(editando){
      await db.collection("clinica_metas").doc(editando).update({
        titulo:form.titulo, categoria:form.categoria,
        progresso:Number(form.progresso)||0, status:form.status,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await db.collection("clinica_metas").add({
        titulo:form.titulo, categoria:form.categoria,
        progresso:Number(form.progresso)||0, status:form.status,
        pacienteId: paciente.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    setModal(false); setEditando(null);
    setForm({titulo:"",categoria:"Emocional",progresso:0,status:"ativa"});
  }
  async function excluir(id){
    if(!confirm("Excluir meta?"))return;
    await db.collection("clinica_metas").doc(id).delete();
  }
  async function atualizarProgresso(id,val){
    await db.collection("clinica_metas").doc(id).update({progresso:val});
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontWeight:600}}>Metas Terapeuticas</div>
        <button className="btn btn-purple" onClick={abrirNova}><Icon name="plus" size={16}/> Nova Meta</button>
      </div>
      {metas.length===0?(
        <div className="card" style={{textAlign:"center",padding:48,color:"var(--text-muted)"}}><Icon name="target" size={40}/><div style={{marginTop:12}}>Nenhuma meta cadastrada.</div></div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {metas.map(m=>(
            <div key={m.id} className="card" style={m.status==="concluida"?{border:"1.5px solid #059669",background:"#f0fdf4"}:m.status==="arquivada"?{opacity:0.55}:{}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <div>
                  <div style={{fontWeight:500}}>{m.titulo}</div>
                  <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                    <span className="badge badge-purple">{m.categoria}</span>
                    {m.status==="concluida"&&<span style={{fontSize:11,fontWeight:700,color:"#059669",background:"#d1fae5",borderRadius:20,padding:"2px 8px"}}>Concluída</span>}
                    {m.status==="arquivada"&&<span style={{fontSize:11,fontWeight:700,color:"#6b7280",background:"#f3f4f6",borderRadius:20,padding:"2px 8px"}}>Arquivada</span>}
                    {m.atualizadoPor==="paciente"&&<span style={{fontSize:11,color:"var(--purple)"}}>✋ atualizada pelo paciente</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <button className="btn btn-ghost" style={{padding:"4px 8px"}} title="Editar meta" onClick={()=>abrirEdicao(m)}><Icon name="pencil" size={14}/></button>
                  <button className="btn btn-ghost" style={{padding:"4px 8px"}} title="Excluir meta" onClick={()=>excluir(m.id)}><Icon name="trash-2" size={14}/></button>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1,background:"var(--gray-100)",borderRadius:20,height:8,overflow:"hidden"}}>
                  <div style={{width:(m.progresso||0)+"%",height:"100%",background:"var(--purple)",borderRadius:20}}/>
                </div>
                <span style={{fontSize:13,fontWeight:600,color:"var(--purple)",minWidth:36}}>{m.progresso||0}%</span>
              </div>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button className="btn btn-ghost" style={{fontSize:12,padding:"4px 10px"}} onClick={()=>atualizarProgresso(m.id,Math.max(0,(m.progresso||0)-10))}>-10%</button>
                <button className="btn btn-ghost" style={{fontSize:12,padding:"4px 10px"}} onClick={()=>atualizarProgresso(m.id,Math.min(100,(m.progresso||0)+10))}>+10%</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setModal(false)}>
          <div style={{background:"white",borderRadius:16,padding:28,width:"100%",maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:600,marginBottom:20}}>{editando?"Editar Meta":"Nova Meta"}</div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Titulo da Meta</label>
              <input className="form-input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Ex: Praticar mindfulness diariamente"/>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Categoria</label>
              <select className="form-input" value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>
                {["Emocional","Saude","Pessoal","Profissional","Relacionamento","Outro"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Progresso: <strong style={{color:"var(--purple)"}}>{form.progresso}%</strong></label>
              <input type="range" min={0} max={100} step={5} value={form.progresso}
                onChange={e=>setForm({...form,progresso:+e.target.value})}
                style={{width:"100%",accentColor:"var(--purple)"}}/>
            </div>
            <div className="form-group" style={{marginBottom:20}}>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                <option value="ativa">Ativa (visível para o paciente)</option>
                <option value="concluida">Concluída (visível, marcada como alcançada)</option>
                <option value="arquivada">Arquivada (oculta do paciente)</option>
              </select>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancelar</button>
              <button className="btn btn-purple" onClick={salvar}>{editando?"Salvar alterações":"Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ABA EVOLUCAO
function AbaEvolucao({ paciente }) {
  const [humor, setHumor] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [metas, setMetas] = useState([]);
  const [sessoes, setSessoes] = useState(0);
  const [tcc, setTcc] = useState([]);
  const [diario, setDiario] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [reflexoes, setReflexoes] = useState([]);
  const [reflexaoAberta, setReflexaoAberta] = useState(null);
  const [tccAberto, setTccAberto] = useState(null);
  const [verTodoHistorico, setVerTodoHistorico] = useState(false);
  const [itemExpandido, setItemExpandido] = useState(null);
  useEffect(()=>{
    const u1 = db.collection("clinica_humor")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>{ const da=a.data||""; const db2=b.data||""; return da<db2?1:da>db2?-1:0; });
        setHumor(docs.slice(0,30));
      },()=>{});
    const u2 = db.collection("clinica_atividades")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setAtividades(docs);
      },()=>{});
    // Busca metas ativas em clinica_metas (coleção raiz — mesma do portal do paciente)
    const u3 = db.collection("clinica_metas")
      .where("pacienteId","==",paciente.id)
      .where("status","==","ativa")
      .onSnapshot(snap=>setMetas(snap.docs.map(d=>({id:d.id,...d.data()}))),()=>{});
    // Sessões registradas do paciente
    const u4 = db.collection("clinica_sessoes")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>setSessoes(snap.size),()=>{});
    // Registros TCC (pensamentos guiados salvos no portal)
    const u5 = db.collection("clinica_tcc")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setTcc(docs);
      },()=>{});
    // Entradas no diário terapêutico
    const u6 = db.collection("clinica_diario")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setDiario(docs);
      },()=>{});
    // Log de uso de recursos (abriu / salvou)
    const u7 = db.collection("clinica_recurso_acessos")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setAcessos(docs);
      },()=>{});
    // Reflexões salvas (fábulas e psicoeducações)
    const u8 = db.collection("clinica_reflexoes")
      .where("pacienteId","==",paciente.id)
      .onSnapshot(snap=>{
        const docs = snap.docs.map(d=>({id:d.id,...d.data()}));
        docs.sort((a,b)=>(b.createdAt?.toDate?.()??new Date(0))-(a.createdAt?.toDate?.()??new Date(0)));
        setReflexoes(docs);
      },()=>{});
    return ()=>{ u1(); u2(); u3(); u4(); u5(); u6(); u7(); u8(); };
  },[paciente.id]);
  const media = humor.length?(humor.reduce((a,h)=>a+(h.valor||0),0)/humor.length).toFixed(1):"—";
  return (
    <div>
      <div className="metrics-grid" style={{marginBottom:20}}>
        {/* Card Sessões */}
        <div className="metric-card">
          <div className="metric-icon"><Icon name="calendar" size={20}/></div>
          <div className="metric-label">Sessões registradas</div>
          <div className="metric-value">{sessoes}</div>
        </div>
        {/* Card Diário */}
        <div className="metric-card">
          <div className="metric-icon"><Icon name="book-open" size={20}/></div>
          <div className="metric-label">Diário Terapêutico</div>
          <div className="metric-value">{diario.length}</div>
          {diario.length>0&&<div className="metric-sub">última: {diario[0]?.data||diario[0]?.createdAt?.toDate?.()?.toLocaleDateString?.("pt-BR")||"—"}</div>}
        </div>
        {/* Card Metas */}
        <div className="metric-card">
          <div className="metric-icon"><Icon name="target" size={20}/></div>
          <div className="metric-label">Metas ativas</div>
          <div className="metric-value">{metas.length}</div>
        </div>
        {/* Card Humor */}
        <div className="metric-card">
          <div className="metric-icon"><Icon name="heart" size={20}/></div>
          <div className="metric-label">Humor médio</div>
          <div className="metric-value">{media}/10</div>
          {humor.length>0&&<div className="metric-sub">última: {humor[0]?.data||"—"}</div>}
        </div>
      </div>
      <div className="card">
        <div style={{fontWeight:600,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
          <span>Evolucao do Humor</span>
          {humor.length>0&&<span style={{fontSize:13,color:"var(--text-muted)"}}>Media: <strong style={{color:"var(--purple)"}}>{media}/10</strong></span>}
        </div>
        {humor.length===0?(
          <div style={{textAlign:"center",padding:40,color:"var(--text-muted)"}}><Icon name="heart" size={40}/><div style={{marginTop:12}}>Sem dados de humor para este paciente.</div></div>
        ):(
          humor.slice(0,10).map(h=>(
            <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid var(--gray-100)"}}>
              <div style={{fontWeight:600,color:"var(--purple)",minWidth:40}}>{h.valor}/10</div>
              <div style={{flex:1,background:"var(--gray-100)",borderRadius:20,height:6}}><div style={{width:((h.valor/10)*100)+"%",height:"100%",background:"var(--purple)",borderRadius:20}}/></div>
              <div style={{fontSize:12,color:"var(--text-muted)"}}>{h.data}</div>
            </div>
          ))
        )}
      </div>

      {/* Atividades de relaxamento */}
      {atividades.length>0&&(
        <div className="card" style={{marginTop:16}}>
          <div style={{fontWeight:600,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>🧘 Atividades de Relaxamento</span>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{atividades.length} registro(s)</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {atividades.slice(0,10).map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,border:"1px solid var(--gray-100)",background:"#fafafa"}}>
                <span style={{fontSize:24}}>{a.ferramenta==="respiracao"?"🫁":"💆"}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13,textTransform:"capitalize"}}>{a.ferramenta==="respiracao"?"Respiração 4-7-8":"Relaxamento Muscular"}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)"}}>{a.data} às {a.hora}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontWeight:700,fontSize:18,color:a.nota>=7?"#16a34a":a.nota>=4?"#d97706":"#dc2626"}}>{a.nota}/10</div>
                  <div style={{fontSize:10,color:"var(--text-muted)"}}>relaxamento</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USO DE RECURSOS (log de acessos) ── */}
      <div className="card" style={{marginTop:16}}>
        <div style={{fontWeight:600,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>📊 Uso de Recursos Terapêuticos</span>
          <span style={{fontSize:13,color:"var(--text-muted)"}}>{acessos.length} registro(s)</span>
        </div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:14}}>Cada vez que o paciente abre um recurso ou salva um exercício, aparece aqui.</div>
        {acessos.length===0?(
          <div style={{textAlign:"center",padding:30,color:"var(--text-muted)"}}>
            <Icon name="mouse-pointer-click" size={36}/>
            <div style={{marginTop:10,fontSize:13}}>Nenhum acesso registrado ainda.</div>
          </div>
        ):(()=>{
          const limite8 = new Date(); limite8.setDate(limite8.getDate()-8);
          const filtrados = verTodoHistorico ? acessos : acessos.filter(a=>{
            const d = a.createdAt?.toDate?.();
            return d && d >= limite8;
          });
          if(filtrados.length===0) return (
            <div style={{textAlign:"center",padding:20,color:"var(--text-muted)",fontSize:13}}>
              Nenhuma atividade nos últimos 8 dias.
              <button onClick={()=>setVerTodoHistorico(true)} style={{display:"block",margin:"8px auto 0",background:"none",border:"none",color:"var(--purple)",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"var(--font-body)"}}>Ver histórico completo →</button>
            </div>
          );
          return (
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:500,overflowY:"auto"}}>
              {filtrados.map(a=>{
                const temReflexao = a.tipo==="salvou" && a.detalhe;
                const expandido = itemExpandido===a.id;
                // Buscar reflexão salva correspondente
                const reflexaoVinc = reflexoes.find(r=>r.recursoId===a.recursoId&&r.pacienteId===a.pacienteId);
                return (
                  <div key={a.id} style={{borderRadius:10,border:"1px solid var(--gray-100)",overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",background:a.tipo==="salvou"?"#f0fdf4":"#fafafa",cursor:(temReflexao||reflexaoVinc)?"pointer":"default"}}
                      onClick={()=>(temReflexao||reflexaoVinc)&&setItemExpandido(expandido?null:a.id)}>
                      <span style={{fontSize:11,fontWeight:700,borderRadius:20,padding:"3px 9px",flexShrink:0,marginTop:1,
                        background:a.tipo==="salvou"?"#d1fae5":a.tipo==="concluiu"?"#dbeafe":"#ede9fe",
                        color:a.tipo==="salvou"?"#059669":a.tipo==="concluiu"?"#1d4ed8":"var(--purple)"}}>
                        {a.tipo==="salvou"?"💾 Salvou":a.tipo==="concluiu"?"✅ Concluiu":"👁 Abriu"}
                      </span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:13}}>{a.recursoTitulo||"Recurso"}</div>
                        {a.detalhe&&!expandido&&<div style={{fontSize:12,color:"#4b5563",marginTop:2,lineHeight:1.5,wordBreak:"break-word",opacity:.7}}>{a.detalhe}</div>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                        <div style={{fontSize:11,color:"var(--text-muted)",textAlign:"right"}}>{a.data}<br/>{a.hora}</div>
                        {(temReflexao||reflexaoVinc)&&<span style={{fontSize:12,color:"var(--purple)",fontWeight:600}}>{expandido?"▲":"▼"}</span>}
                      </div>
                    </div>
                    {expandido&&(
                      <div style={{padding:"12px 14px",background:"white",borderTop:"1px solid var(--gray-100)"}}>
                        {reflexaoVinc?(()=>{
                          // Suporta formato {registros:[{pergunta,resposta}]} (fábulas/psicoeducações)
                          // e formato legado {perguntas:[], respostas:[]}
                          const itens = reflexaoVinc.registros
                            ? reflexaoVinc.registros
                            : (reflexaoVinc.respostas||[]).map((r,i)=>({pergunta:(reflexaoVinc.perguntas||[])[i]||`Reflexão ${i+1}`,resposta:r}));
                          return itens.length>0?(
                            itens.map((item,i)=>(
                              <div key={i} style={{marginBottom:i<itens.length-1?12:0}}>
                                <div style={{fontSize:12,fontWeight:600,color:"var(--purple)",marginBottom:4}}>{item.pergunta||`Reflexão ${i+1}`}</div>
                                <div style={{fontSize:13,color:item.resposta?"#1f2937":"#9ca3af",lineHeight:1.65,paddingLeft:12,borderLeft:"3px solid #e9d5ff"}}>{item.resposta||"— sem resposta —"}</div>
                              </div>
                            ))
                          ):a.detalhe?(
                            <div style={{fontSize:13,color:"#1f2937",lineHeight:1.65,paddingLeft:12,borderLeft:"3px solid #e9d5ff"}}>{a.detalhe}</div>
                          ):null;
                        })():a.detalhe?(
                          <div style={{fontSize:13,color:"#1f2937",lineHeight:1.65,paddingLeft:12,borderLeft:"3px solid #e9d5ff"}}>{a.detalhe}</div>
                        ):null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── REGISTROS TCC (pensamentos guiados) ── */}
      {tcc.length>0&&(
        <div className="card" style={{marginTop:16}}>
          <div style={{fontWeight:600,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span>🧠 Registros TCC — Pensamentos Guiados</span>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{tcc.length} registro(s)</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {tcc.slice(0,15).map(t=>(
              <div key={t.id} style={{border:"1px solid var(--gray-100)",borderRadius:10,overflow:"hidden"}}>
                <div onClick={()=>setTccAberto(tccAberto===t.id?null:t.id)}
                  style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",cursor:"pointer",background:tccAberto===t.id?"var(--purple-soft,#f3e8ff)":"#fafafa"}}>
                  <div style={{fontWeight:600,fontSize:13}}>Registro de {t.data||"—"}</div>
                  <span style={{fontSize:12,color:"var(--purple)",fontWeight:600}}>{tccAberto===t.id?"▲ Fechar":"▼ Ver respostas"}</span>
                </div>
                {tccAberto===t.id&&(
                  <div style={{padding:"12px 14px",background:"white"}}>
                    {(t.registros||[]).map((r,i)=>(
                      <div key={i} style={{marginBottom:i<(t.registros||[]).length-1?12:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:"var(--purple)",marginBottom:3}}>{i+1}. {r.pergunta}</div>
                        <div style={{fontSize:13,color:r.resposta?"#1f2937":"#9ca3af",lineHeight:1.6,paddingLeft:14,borderLeft:"3px solid var(--purple-soft,#f3e8ff)"}}>{r.resposta||"— sem resposta —"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REFLEXÕES SALVAS (fábulas e psicoeducações) ── */}
      {reflexoes.length>0&&(
        <div className="card" style={{marginTop:16}}>
          <div style={{fontWeight:600,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span>💭 Reflexões Salvas — Fábulas e Psicoeducações</span>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{reflexoes.length} registro(s)</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {reflexoes.slice(0,15).map(r=>{
              const titulo = r.origemTitulo||r.psicoeducacaoTitulo||"Reflexão";
              const tipoBadge = r.origem==="fabula"?"📖 Fábula":"🎓 Psicoeducação";
              return (
                <div key={r.id} style={{border:"1px solid var(--gray-100)",borderRadius:10,overflow:"hidden"}}>
                  <div onClick={()=>setReflexaoAberta(reflexaoAberta===r.id?null:r.id)}
                    style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",cursor:"pointer",gap:10,background:reflexaoAberta===r.id?"var(--purple-soft,#f3e8ff)":"#fafafa"}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{titulo}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{tipoBadge} · {r.data||"—"}</div>
                    </div>
                    <span style={{fontSize:12,color:"var(--purple)",fontWeight:600,flexShrink:0}}>{reflexaoAberta===r.id?"▲ Fechar":"▼ Ver respostas"}</span>
                  </div>
                  {reflexaoAberta===r.id&&(
                    <div style={{padding:"12px 14px",background:"white"}}>
                      {(r.registros||[]).map((reg,i)=>(
                        <div key={i} style={{marginBottom:i<(r.registros||[]).length-1?12:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:"var(--purple)",marginBottom:3}}>{i+1}. {reg.pergunta}</div>
                          <div style={{fontSize:13,color:reg.resposta?"#1f2937":"#9ca3af",lineHeight:1.6,paddingLeft:14,borderLeft:"3px solid var(--purple-soft,#f3e8ff)"}}>{reg.resposta||"— sem resposta —"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DIÁRIO TERAPÊUTICO ── */}
      {diario.length>0&&(
        <div className="card" style={{marginTop:16}}>
          <div style={{fontWeight:600,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
            <span>📓 Diário Terapêutico</span>
            <span style={{fontSize:13,color:"var(--text-muted)"}}>{diario.length} entrada(s)</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:360,overflowY:"auto"}}>
            {diario.slice(0,15).map(d=>(
              <div key={d.id} style={{padding:"10px 14px",borderRadius:10,border:"1px solid var(--gray-100)",background:"#fafafa"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:700,color:"var(--purple)",background:"var(--purple-soft,#f3e8ff)",borderRadius:20,padding:"2px 8px",textTransform:"capitalize"}}>{d.tag||"geral"}</span>
                  <span style={{fontSize:11,color:"var(--text-muted)"}}>{d.data} {d.hora?("às "+d.hora):""}</span>
                </div>
                <div style={{fontSize:13,lineHeight:1.6,color:"#1f2937",whiteSpace:"pre-wrap"}}>{d.texto}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ABA CASAL
// ── Categorias do Inventário (espelhadas do clinica/app.js) ─────────────────
const INVENTARIO_CATS_C = [
  {label:"Comunicação Eficaz",      cor:"#6366f1", questoes:[2,5,11,12,13,19,20]},
  {label:"Resolução de Conflitos",   cor:"#f59e0b", questoes:[4,8,14,18,23,28,31]},
  {label:"Intimidade Emocional",     cor:"#ec4899", questoes:[7,10,17,22,24,29,35]},
  {label:"Satisfação Sexual",        cor:"#dc2626", questoes:[3,6,9,15,21,25,27]},
  {label:"Cooperação e Colaboração", cor:"#16a34a", questoes:[1,16,26,37,38,39,41]},
  {label:"Senso de Humor e Lazer",   cor:"#0891b2", questoes:[30,32,33,34,36,40,42]},
];
const RODA_DIMENSOES_C = [
  "Comunicação","Família","Sexualidade","Estresse e Pressão",
  "Divisão","Ciúmes","Espiritualidade","Diferenças e Conflitos",
  "Estabilidade Financeira","Rel. de Poder","Mudanças","Expectativas e Equilíbrio"
];

function calcularInventario(resp) {
  return INVENTARIO_CATS_C.map(cat=>{
    const soma = cat.questoes.reduce((a,q)=>a+(resp[q]||0),0);
    return {...cat, soma, pct:Math.max(0,Math.round(((soma-7)/28)*100))};
  });
}

// ── Bloco visual: Inventário de Bem-Estar (comparativo) ─────────────────────
function BlocoInventario({ docPaciente, docParceiro, nomePac, nomePar }) {
  const [verBrutos, setVerBrutos] = useState(false);
  if(!docPaciente&&!docParceiro) return <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum preencheu ainda.</div>;

  const resPac = docPaciente?.respostas||{};
  const resPar = docParceiro?.respostas||{};
  const catsPac = docPaciente ? calcularInventario(resPac) : null;
  const catsPar = docParceiro ? calcularInventario(resPar) : null;

  // Pontos fortes e fracos (baseado em quem respondeu)
  const base = catsPac||catsPar;
  const fortes  = [...base].sort((a,b)=>b.soma-a.soma).slice(0,2);
  const fracos   = [...base].sort((a,b)=>a.soma-b.soma).slice(0,2);

  const ESCALA = ["","Nunca/Raramente","Às vezes","Frequentemente","Sempre/Quase sempre"];

  return (
    <div>
      {/* Gráfico comparativo */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",gap:16,fontSize:12,marginBottom:10,flexWrap:"wrap"}}>
          {docPaciente && <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#7B00C4",marginRight:4}}/>
            {nomePac} ({docPaciente.createdAt?.toDate?.()?.toLocaleDateString("pt-BR")||"—"})</span>}
          {docParceiro && <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#ec4899",marginRight:4}}/>
            {nomePar} ({docParceiro.createdAt?.toDate?.()?.toLocaleDateString("pt-BR")||"—"})</span>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {INVENTARIO_CATS_C.map((cat,i)=>{
            const vPac = catsPac?.[i];
            const vPar = catsPar?.[i];
            return (
              <div key={cat.label}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,marginBottom:6}}>
                  <span style={{color:cat.cor}}>{cat.label}</span>
                </div>
                {/* Barra paciente */}
                {vPac&&(
                  <div style={{marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:"#7B00C4",minWidth:14,fontWeight:600}}>🟣</span>
                      <div style={{flex:1,background:"#f3f4f6",borderRadius:20,height:10,overflow:"hidden"}}>
                        <div style={{width:vPac.pct+"%",height:"100%",background:"#7B00C4",borderRadius:20,transition:"width .5s"}}/>
                      </div>
                      <span style={{fontSize:12,color:"#7B00C4",fontWeight:700,minWidth:36,textAlign:"right"}}>{vPac.soma}/35</span>
                    </div>
                  </div>
                )}
                {/* Barra parceiro */}
                {vPar&&(
                  <div style={{marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:"#ec4899",minWidth:14,fontWeight:600}}>🩷</span>
                      <div style={{flex:1,background:"#f3f4f6",borderRadius:20,height:10,overflow:"hidden"}}>
                        <div style={{width:vPar.pct+"%",height:"100%",background:"#ec4899",borderRadius:20,transition:"width .5s"}}/>
                      </div>
                      <span style={{fontSize:12,color:"#ec4899",fontWeight:700,minWidth:36,textAlign:"right"}}>{vPar.soma}/35</span>
                    </div>
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text-muted)",marginTop:2,paddingLeft:22}}>
                  <span>Baixo (7)</span><span>Alto (35)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pontos fortes e atenção */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{background:"#f0fdf4",borderRadius:10,padding:12,border:"1px solid #86efac"}}>
          <div style={{fontWeight:700,fontSize:12,color:"#16a34a",marginBottom:8}}>💪 Pontos Fortes</div>
          {fortes.map(c=>(
            <div key={c.label} style={{fontSize:12,color:"#15803d",marginBottom:4}}>
              ● {c.label} <span style={{fontWeight:700}}>{c.soma}/35</span>
            </div>
          ))}
        </div>
        <div style={{background:"#fef2f2",borderRadius:10,padding:12,border:"1px solid #fca5a5"}}>
          <div style={{fontWeight:700,fontSize:12,color:"#dc2626",marginBottom:8}}>⚠️ Pontos de Atenção</div>
          {fracos.map(c=>(
            <div key={c.label} style={{fontSize:12,color:"#b91c1c",marginBottom:4}}>
              ● {c.label} <span style={{fontWeight:700}}>{c.soma}/35</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dados brutos colapsáveis */}
      <button onClick={()=>setVerBrutos(v=>!v)}
        style={{background:"none",border:"1px solid var(--gray-200)",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",color:"var(--text-muted)",width:"100%"}}>
        {verBrutos?"▲ Ocultar respostas brutas":"▼ Ver respostas brutas"}
      </button>
      {verBrutos&&(
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:4}}>
          {Array.from({length:42},(_,i)=>i+1).map(n=>(
            <div key={n} style={{display:"flex",gap:8,fontSize:12,padding:"4px 8px",background:n%2===0?"#fafafa":"white",borderRadius:6}}>
              <span style={{color:"var(--purple)",fontWeight:600,minWidth:22}}>{n}.</span>
              {docPaciente&&<span style={{color:"#7B00C4",flex:1}}>{nomePac.split(" ")[0]}: {ESCALA[resPac[n]]||"—"}</span>}
              {docParceiro&&<span style={{color:"#ec4899",flex:1}}>{nomePar.split(" ")[0]}: {ESCALA[resPar[n]]||"—"}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bloco visual: Roda da Vida do Relacionamento ─────────────────────────────
function BlocoRodaVida({ docPaciente, docParceiro, nomePac, nomePar }) {
  const [verBrutos, setVerBrutos] = useState(false);
  if(!docPaciente&&!docParceiro) return <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum preencheu ainda.</div>;
  const vPac = docPaciente?.respostas||{};
  const vPar = docParceiro?.respostas||{};
  return (
    <div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        {RODA_DIMENSOES_C.map((dim,i)=>{
          const kPac = vPac[dim]; const kPar = vPar[dim];
          return (
            <div key={dim}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,marginBottom:3}}>
                <span>{dim}</span>
                <span style={{display:"flex",gap:10}}>
                  {docPaciente&&<span style={{color:"#7B00C4"}}>{kPac||0}/10</span>}
                  {docParceiro&&<span style={{color:"#ec4899"}}>{kPar||0}/10</span>}
                </span>
              </div>
              <div style={{position:"relative",height:8,borderRadius:20,background:"#f3f4f6",overflow:"hidden"}}>
                {docPaciente&&<div style={{position:"absolute",left:0,top:0,height:"100%",width:((kPac||0)*10)+"%",background:"#7B00C4",borderRadius:20,opacity:0.85}}/>}
                {docParceiro&&<div style={{position:"absolute",left:0,top:0,height:"100%",width:((kPar||0)*10)+"%",background:"#ec4899",borderRadius:20,opacity:0.5}}/>}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={()=>setVerBrutos(v=>!v)}
        style={{background:"none",border:"1px solid var(--gray-200)",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",color:"var(--text-muted)",width:"100%"}}>
        {verBrutos?"▲ Ocultar detalhes":"▼ Ver detalhes completos"}
      </button>
    </div>
  );
}

// ── Bloco visual genérico (Metas, Quem Sou, O Que Quero) ────────────────────
function BlocoTexto({ docPaciente, docParceiro, nomePac, nomePar }) {
  if(!docPaciente&&!docParceiro) return <div style={{fontSize:13,color:"var(--text-muted)"}}>Nenhum preencheu ainda.</div>;
  const ESCALA = ["","Nunca/Raramente","Às vezes","Frequentemente","Sempre/Quase sempre"];
  function renderResp(resp) {
    if(!resp||typeof resp!=="object") return null;
    return Object.entries(resp).map(([k,v])=>(
      <div key={k} style={{padding:"6px 10px",background:"white",borderRadius:7,border:"1px solid #f3f4f6",fontSize:13,marginBottom:4}}>
        <span style={{fontWeight:600,color:"var(--purple)",marginRight:6}}>{k}:</span>
        <span style={{color:"var(--gray-700)"}}>{typeof v==="number"?(ESCALA[v]||v):String(v)}</span>
      </div>
    ));
  }
  return (
    <div style={{display:"grid",gridTemplateColumns:docPaciente&&docParceiro?"1fr 1fr":"1fr",gap:16}}>
      {docPaciente&&(
        <div>
          <div style={{fontWeight:700,fontSize:12,color:"#7B00C4",marginBottom:8}}>
            🟣 {nomePac} ({docPaciente.createdAt?.toDate?.()?.toLocaleDateString("pt-BR")||"—"})
          </div>
          {renderResp(docPaciente.respostas)}
        </div>
      )}
      {docParceiro&&(
        <div>
          <div style={{fontWeight:700,fontSize:12,color:"#ec4899",marginBottom:8}}>
            🩷 {nomePar} ({docParceiro.createdAt?.toDate?.()?.toLocaleDateString("pt-BR")||"—"})
          </div>
          {renderResp(docParceiro.respostas)}
        </div>
      )}
    </div>
  );
}

// ── Respostas do diagnóstico — componente principal do admin ─────────────────
function RespostasCasal({ pacienteId, parceiroId, parceiro, nomePaciente }) {
  const [respostas, setRespostas] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expandido, setExpandido] = useState("inventario-bem-estar"); // abre o primeiro por padrão

  const ATIVIDADES = [
    {id:"inventario-bem-estar",     titulo:"Inventário de Bem-Estar de Casais", emoji:"📊"},
    {id:"roda-vida-relacionamento", titulo:"Roda da Vida do Relacionamento",    emoji:"🎯"},
    {id:"3-metas",                  titulo:"Nossas 3 Metas",                    emoji:"🏆"},
    {id:"quem-sou",                 titulo:"Quem Eu Sou no Relacionamento",     emoji:"🪞"},
    {id:"o-que-quero",              titulo:"O Que Eu Quero e Não Quero Mais",   emoji:"✍️"},
  ];

  const nomePac = nomePaciente?.split(" ")[0]||"Paciente";
  const nomePar = parceiro?.nome?.split(" ")[0]||"Parceiro(a)";

  useEffect(()=>{
    if(!pacienteId||!parceiroId){ setLoading(false); return; }
    let r1=[], r2=[], n=0;
    const done = ()=>{ n++; if(n<2) return;
      setRespostas([...r1,...r2].sort((a,b)=>(b.createdAt?.toDate?.()||new Date(0))-(a.createdAt?.toDate?.()||new Date(0))));
      setLoading(false);
    };
    const u1 = db.collection("clinica_casais_respostas")
      .where("pacienteId","==",pacienteId).where("casalId","==",parceiroId)
      .onSnapshot(s=>{ r1=s.docs.map(d=>({id:d.id,...d.data()})); done(); },()=>{ n++; setLoading(false); });
    const u2 = db.collection("clinica_casais_respostas")
      .where("pacienteId","==",parceiroId).where("casalId","==",pacienteId)
      .onSnapshot(s=>{ r2=s.docs.map(d=>({id:d.id,...d.data()})); done(); },()=>{ n++; setLoading(false); });
    return ()=>{ u1(); u2(); };
  },[pacienteId,parceiroId]);

  if(loading) return <div style={{fontSize:13,color:"var(--text-muted)",padding:"8px 0"}}>Carregando...</div>;
  if(respostas.length===0) return (
    <div style={{background:"#f9fafb",borderRadius:10,padding:20,fontSize:13,color:"var(--text-muted)",textAlign:"center"}}>
      Nenhuma resposta registrada ainda.
    </div>
  );

  // Para cada atividade, pega o doc mais recente de cada pessoa
  function getDoc(atividadeId, autorId) {
    return respostas.find(r=>r.atividadeId===atividadeId&&r.pacienteId===autorId)||null;
  }

  return (
    <div>
      <div style={{display:"flex",gap:8,fontSize:12,marginBottom:16,flexWrap:"wrap"}}>
        <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#7B00C4",marginRight:4}}/>
          {nomePac}</span>
        <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#ec4899",marginRight:4}}/>
          {nomePar}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ATIVIDADES.map(atv=>{
          const docPac = getDoc(atv.id, pacienteId);
          const docPar = getDoc(atv.id, parceiroId);
          const total  = (docPac?1:0)+(docPar?1:0);
          if(total===0) return null;
          const aberto = expandido===atv.id;
          return (
            <div key={atv.id} style={{border:"1px solid var(--gray-200)",borderRadius:12,overflow:"hidden"}}>
              <button onClick={()=>setExpandido(aberto?null:atv.id)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"14px 16px",
                  background:aberto?"#f5f3ff":"white",border:"none",cursor:"pointer",textAlign:"left"}}>
                <span style={{fontSize:20}}>{atv.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{atv.titulo}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>
                    {docPac&&<span style={{color:"#7B00C4",marginRight:10}}>✓ {nomePac}</span>}
                    {docPar&&<span style={{color:"#ec4899"}}>✓ {nomePar}</span>}
                    {!docPac&&<span style={{color:"var(--gray-400)",marginRight:10}}>○ {nomePac}</span>}
                    {!docPar&&<span style={{color:"var(--gray-400)"}}>○ {nomePar}</span>}
                  </div>
                </div>
                <Icon name={aberto?"chevron-up":"chevron-down"} size={16}/>
              </button>
              {aberto&&(
                <div style={{padding:"16px",background:"#fafafa",borderTop:"1px solid var(--gray-100)"}}>
                  {atv.id==="inventario-bem-estar"&&
                    <BlocoInventario docPaciente={docPac} docParceiro={docPar} nomePac={nomePac} nomePar={nomePar}/>}
                  {atv.id==="roda-vida-relacionamento"&&
                    <BlocoRodaVida docPaciente={docPac} docParceiro={docPar} nomePac={nomePac} nomePar={nomePar}/>}
                  {(atv.id==="3-metas"||atv.id==="quem-sou"||atv.id==="o-que-quero")&&
                    <BlocoTexto docPaciente={docPac} docParceiro={docPar} nomePac={nomePac} nomePar={nomePar}/>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── Aba Anamnese ─────────────────────────────────────────────────────────────
function gerarPDFAnamnese(paciente, anamnese, LABELS, SKIP){
  const ts = anamnese.createdAt?.toDate?.()?.toLocaleString("pt-BR")||"—";
  const respondente = anamnese.informanteTipo && anamnese.informanteTipo!=="proprio"
    ? (anamnese.nomeRespondente||anamnese.informanteTipo)+(anamnese.parentescoRespondente?" ("+anamnese.parentescoRespondente+")":"")
    : "A própria pessoa";
  const linhas = Object.entries(anamnese)
    .filter(([k,v])=>!SKIP.includes(k)&&k!=="queixa"&&v&&String(v).trim())
    .map(([k,v])=>`<tr><td style="font-weight:600;color:#374151;font-size:11px;text-transform:uppercase;background:#f3f4f6;width:200px;padding:7px 10px;border:1px solid #e5e7eb;vertical-align:top">${LABELS[k]||k}</td><td style="padding:7px 10px;border:1px solid #e5e7eb;font-size:13px;vertical-align:top">${String(v)}</td></tr>`).join("");
  const w = window.open("","_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Anamnese — ${paciente.nome}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:30px 40px;color:#1f2937}
  @page{margin:20mm}@media print{.no-print{display:none}}</style></head><body>
  <div style="border-bottom:2px solid #7B00C4;padding-bottom:14px;margin-bottom:18px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1 style="font-size:20px;color:#3d006a;margin-bottom:8px">📋 Anamnese — ${paciente.nome||"—"}</h1>
        <table style="font-size:12px;border-collapse:collapse;width:100%">
          <tr><td style="padding:3px 12px 3px 0;width:50%"><b>Perfil:</b> ${anamnese.perfil==="infantil"?"Infantil/Neurodesenvolvimento":"Adulto/Idoso"}</td>
              <td style="padding:3px 0"><b>Data de nascimento:</b> ${paciente.dataNasc||"—"}</td></tr>
          <tr><td style="padding:3px 12px 3px 0"><b>CPF:</b> ${paciente.cpf||"—"}</td>
              <td style="padding:3px 0"><b>Gênero:</b> ${paciente.genero||"—"}</td></tr>
          <tr><td style="padding:3px 12px 3px 0"><b>Telefone:</b> ${paciente.telefone||"—"}</td>
              <td style="padding:3px 0"><b>E-mail:</b> ${paciente.email||"—"}</td></tr>
          <tr><td style="padding:3px 12px 3px 0"><b>Escolaridade:</b> ${paciente.escolaridade||anamnese.escolaridade||"—"}</td>
              <td style="padding:3px 0"><b>Preenchido em:</b> ${ts}</td></tr>
          <tr><td colspan="2" style="padding:3px 0"><b>Respondido por:</b> ${respondente}</td></tr>
          ${paciente.encaminhador||anamnese.encaminhador?`<tr><td colspan="2" style="padding:3px 0"><b>Encaminhado por:</b> ${paciente.encaminhador||anamnese.encaminhador}</td></tr>`:""}
        </table>
      </div>
      <div style="text-align:right;font-size:11px;color:#6b7280">
        <div style="font-weight:700;color:#3d006a">Dra. Lucia Kratz</div>
        <div>Psicóloga · CRP 09/20590</div>
        <div>Goiânia, GO</div>
      </div>
    </div>
  </div>
  ${anamnese.queixa?`<div style="background:#f0f4ff;border-left:4px solid #4338ca;padding:10px 14px;margin-bottom:16px"><div style="font-size:10px;font-weight:700;color:#4338ca;text-transform:uppercase;margin-bottom:4px">Queixa Principal</div><div style="font-size:13.5px;line-height:1.6">${anamnese.queixa}</div></div>`:""}
  <table style="width:100%;border-collapse:collapse">${linhas}</table>
  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
    Documento gerado em ${new Date().toLocaleString("pt-BR")} · Clínica Dra. Lucia Kratz
  </div>
  <div class="no-print" style="margin-top:20px;text-align:center">
    <button onclick="window.print()" style="background:#7B00C4;color:white;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
  </div>
  </body></html>`);
  w.document.close();
}
