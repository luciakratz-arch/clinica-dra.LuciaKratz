<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Rastreamento de Habitos Alimentares | Dra. Lucia Kratz</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:linear-gradient(135deg,#f3e8ff 0%,#faf5ff 50%,#ede9fe 100%);min-height:100vh;padding:20px}
.card{background:white;border-radius:20px;padding:28px;width:100%;max-width:640px;margin:0 auto;box-shadow:0 8px 40px rgba(123,0,196,0.12)}
.header{text-align:center;margin-bottom:24px}
.header h1{font-size:19px;color:#3d006a;margin:10px 0 4px;font-weight:700}
.header p{font-size:13px;color:#6b7280}
.welcome-box{background:#f5f3ff;border-radius:14px;padding:20px;margin-bottom:20px;font-size:13.5px;color:#4b5563;line-height:1.7}
.welcome-box h2{font-size:15px;font-weight:700;color:#3d006a;margin-bottom:10px}
.welcome-box ul{padding-left:18px;display:flex;flex-direction:column;gap:5px}
.progress-wrap{margin-bottom:22px}
.progress-labels{display:flex;justify-content:space-between;font-size:11px;color:#9ca3af;margin-bottom:5px}
.progress-bar{height:6px;background:#ede9fe;border-radius:20px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#7B00C4,#a855f7);border-radius:20px;transition:width .4s ease}
.step-title{font-size:15px;font-weight:700;color:#3d006a;margin-bottom:3px}
.step-sub{font-size:12.5px;color:#6b7280;margin-bottom:18px;line-height:1.5;background:#f9fafb;border-left:3px solid #7B00C4;padding:8px 12px;border-radius:0 8px 8px 0}
.fg{margin-bottom:16px}
label.lbl{display:block;font-size:11.5px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}
input,select,textarea{width:100%;padding:10px 13px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:'Inter',sans-serif;color:#1f2937;outline:none;transition:border-color .2s;background:white}
input:focus,select:focus,textarea:focus{border-color:#7B00C4}
textarea{resize:vertical;min-height:80px;line-height:1.5}
.tipo-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.tipo-btn{background:white;border:2px solid #ede9fe;border-radius:14px;padding:18px 14px;text-align:center;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif}
.tipo-btn:hover,.tipo-btn.sel{border-color:#7B00C4;background:#f5f0ff}
.tipo-btn .ico{font-size:32px;margin-bottom:8px}
.tipo-btn .t{font-size:14px;font-weight:700;color:#3d006a}
.tipo-btn .d{font-size:11.5px;color:#6b7280;margin-top:4px}
.pergunta-card{background:#f9fafb;border:1px solid #ede9fe;border-radius:14px;padding:18px;margin-bottom:16px}
.perg-num{font-size:10px;font-weight:700;color:#7B00C4;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.perg-texto{font-size:14px;color:#1f2937;line-height:1.6;margin-bottom:14px;font-weight:500}
.opcoes{display:flex;flex-direction:column;gap:8px}
.opcao{display:flex;align-items:flex-start;gap:10px;background:white;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 14px;cursor:pointer;transition:all .2s;font-size:13.5px;color:#374151;line-height:1.5}
.opcao input[type=radio]{display:none}
.opcao .letra{width:22px;height:22px;min-width:22px;border-radius:50%;border:2px solid #d1d5db;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#9ca3af;transition:all .2s;margin-top:1px}
.opcao.sel{border-color:#7B00C4;background:#f5f0ff}
.opcao.sel .letra{background:#7B00C4;border-color:#7B00C4;color:white}
.opcao:hover{border-color:#a78bfa}
.sec{font-size:11px;font-weight:700;color:#7B00C4;text-transform:uppercase;letter-spacing:1px;padding:10px 0 6px;border-bottom:1px solid #ede9fe;margin:8px 0 16px}
.mic-wrap{position:relative}
.mic-btn{position:absolute;right:8px;top:8px;background:#f3e8ff;border:none;border-radius:7px;padding:5px 8px;cursor:pointer;font-size:15px;line-height:1;z-index:1}
textarea.has-mic{padding-right:44px}
.nav{display:flex;gap:10px;margin-top:24px}
.btn{padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;border:none}
.btn-back{background:#f3f4f6;color:#374151;flex:1}
.btn-next{background:#7B00C4;color:white;flex:2;box-shadow:0 4px 14px rgba(123,0,196,0.35)}
.btn-next:hover{opacity:.9}
.btn-next:disabled{opacity:.6;cursor:default}
.btn-start{background:#7B00C4;color:white;width:100%;margin-top:16px;padding:14px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;border:none;font-family:'Inter',sans-serif}
.aviso-amarelo{background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:13px 16px;font-size:12.5px;color:#92400e;line-height:1.6;margin-bottom:14px}
.success{text-align:center;padding:20px 0}
.success-icon{font-size:64px;margin-bottom:16px}
.success-title{font-size:22px;font-weight:700;color:#3d006a;margin-bottom:10px}
.success-msg{font-size:14px;color:#6b7280;line-height:1.7}
@media(max-width:500px){.tipo-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <img src="../../logo.png" alt="" style="width:60px;height:60px;border-radius:12px;object-fit:cover" onerror="this.style.display='none'"/>
    <h1>Rastreamento de Habitos Alimentares</h1>
    <p>Dra. Lucia Kratz &middot; Psicologa &middot; CRP 09/20590</p>
  </div>

  <div id="telaInicial">
    <div class="welcome-box">
      <h2>&#128203; Antes de comecar, leia com atencao:</h2>
      <ul>
        <li>Este questionario leva entre <strong>5 e 10 minutos</strong> para ser respondido.</li>
        <li>Nao ha respostas certas ou erradas - responda com <strong>honestidade e calma</strong>.</li>
        <li>Se for familiar, responda sobre o <strong>comportamento da pessoa avaliada</strong>.</li>
        <li>Voce pode usar o botao &#127908; para <strong>falar em vez de digitar</strong>.</li>
        <li>Suas respostas sao <strong>confidenciais</strong> e usadas apenas para fins clinicos.</li>
      </ul>
    </div>

    <div class="sec">&#128100; Quem esta respondendo?</div>
    <div class="tipo-grid">
      <div class="tipo-btn" id="btnPaciente" onclick="selecionarTipo('paciente')">
        <div class="ico">&#128587;</div>
        <div class="t">O proprio paciente</div>
        <div class="d">Voce e a pessoa que esta sendo avaliada</div>
      </div>
      <div class="tipo-btn" id="btnFamiliar" onclick="selecionarTipo('familiar')">
        <div class="ico">&#128106;</div>
        <div class="t">Familiar / pessoa proxima</div>
        <div class="d">Voce conhece bem a pessoa avaliada</div>
      </div>
    </div>

    <div id="camposFamiliar" style="display:none">
      <div class="fg">
        <label class="lbl">Seu nome completo *</label>
        <input id="nomeRespondente" type="text" placeholder="Seu nome"/>
      </div>
      <div class="fg">
        <label class="lbl">Sua relacao com o paciente *</label>
        <select id="parentesco">
          <option value="">Selecione</option>
          <option>Mae</option><option>Pai</option>
          <option>Conjuge / Companheiro(a)</option>
          <option>Irmao / Irma</option><option>Filho(a)</option>
          <option>Avo / Avo</option><option>Tio(a)</option>
          <option>Amigo(a) proximo(a)</option><option>Outro familiar</option>
        </select>
      </div>
    </div>
    <button class="btn-start" onclick="iniciar()">Comecar Questionario &rarr;</button>
  </div>

  <div id="formArea" style="display:none">
    <div class="progress-wrap">
      <div class="progress-labels">
        <span id="stepLabel">Etapa 1 de 4</span>
        <span id="stepPct">0%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
    </div>
    <div id="stepContent"></div>
    <div class="nav">
      <button class="btn btn-back" id="btnBack" onclick="voltarStep()" style="display:none">&#8592; Voltar</button>
      <button class="btn btn-next" id="btnNext" onclick="avancarStep()">Proximo &rarr;</button>
    </div>
  </div>

  <div id="revisaoArea" style="display:none">
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:36px;margin-bottom:8px">&#128269;</div>
      <div style="font-size:17px;font-weight:700;color:#3d006a;margin-bottom:4px">Revise suas respostas</div>
      <div style="font-size:13px;color:#6b7280;line-height:1.6">Confira tudo antes de enviar. Voce ainda pode voltar e corrigir.</div>
    </div>
    <div id="revisaoContent"></div>
    <div style="display:flex;gap:10px;margin-top:24px">
      <button class="btn btn-back" style="flex:1" onclick="voltarRevisao()">&#8592; Corrigir</button>
      <button class="btn btn-next" style="flex:2" onclick="enviar()">&#10003; Confirmar e Enviar</button>
    </div>
  </div>

  <div id="successArea" style="display:none">
    <div class="success">
      <div class="success-icon">&#129419;</div>
      <div class="success-title">Respostas enviadas!</div>
      <div class="success-msg">
        Obrigado por responder com cuidado e honestidade.<br/>
        Suas respostas foram registradas com seguranca<br/>
        e serao analisadas pela Dra. Lucia Kratz.<br/><br/>
        <strong>Pode fechar esta janela.</strong>
      </div>
    </div>
  </div>
</div>

<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
<script>
const fc={apiKey:"AIzaSyDnrgaY8R0Zetkr18uHQJAZXIUa4EwDnv4",authDomain:"entrevista-inicial.firebaseapp.com",projectId:"entrevista-inicial"};
if(!firebase.apps.length)firebase.initializeApp(fc);
const db=firebase.firestore();

const urlParams=new URLSearchParams(window.location.search);
const nomePaciente=urlParams.get("paciente")||"";

let tipoRespondente="";
let step=1;
let respostas={};
const TOTAL_STEPS=4;

function selecionarTipo(tipo){
  tipoRespondente=tipo;
  document.getElementById("btnPaciente").classList.toggle("sel",tipo==="paciente");
  document.getElementById("btnFamiliar").classList.toggle("sel",tipo==="familiar");
  document.getElementById("camposFamiliar").style.display=tipo==="familiar"?"block":"none";
}

function iniciar(){
  if(!tipoRespondente){alert("Por favor, selecione quem esta respondendo.");return;}
  if(tipoRespondente==="familiar"){
    if(!document.getElementById("nomeRespondente").value.trim()){alert("Por favor, informe seu nome.");return;}
    if(!document.getElementById("parentesco").value){alert("Por favor, selecione sua relacao.");return;}
    respostas.nomeRespondente=document.getElementById("nomeRespondente").value.trim();
    respostas.parentesco=document.getElementById("parentesco").value;
  } else {
    respostas.nomeRespondente="Proprio paciente";
    respostas.parentesco="paciente";
  }
  respostas.tipoRespondente=tipoRespondente;
  document.getElementById("telaInicial").style.display="none";
  document.getElementById("formArea").style.display="block";
  renderStep();
}

const BLOCOS=[
  {
    titulo:"Bloco 1 - Padrao de Alimentacao e Peso",
    sub:"Observe como a pessoa se relaciona com a alimentacao, o peso corporal e a imagem que tem de si mesma.",
    perguntas:[
      {id:"p1",num:"1",texto:"A pessoa apresenta restricao persistente na quantidade de alimentos que consome, resultando em peso corporal muito abaixo do esperado para sua idade e altura?",
        opcoes:[{letra:"A",texto:"Nao ha restricao calorica; alimenta-se de forma adequada e mantem peso saudavel."},{letra:"B",texto:"Apresenta restricoes dieteticas leves ou modismos alimentares esporadicos, sem perda de peso clinicamente significativa."},{letra:"C",texto:"Restricao alimentar drastica e continua, resultando em magreza acentuada e peso corporal abaixo do limite minimo esperado."}]},
      {id:"p2",num:"2",texto:"A pessoa demonstra medo intenso e persistente de ganhar peso ou de engordar, mesmo quando esta visivelmente abaixo do peso?",
        opcoes:[{letra:"A",texto:"Nao apresenta medo desproporcional em relacao ao peso."},{letra:"B",texto:"Preocupa-se com o peso esteticamente, mas sem pavor ou comportamentos fobicos."},{letra:"C",texto:"Medo intenso, irracional e persistente de engordar, acompanhado de pavor de qualquer alteracao na balanca."}]},
      {id:"p3",num:"3",texto:"A pessoa tem uma percepcao distorcida do proprio corpo, vendo-se acima do peso mesmo quando esta muito magra, ou valoriza sua autoestima exclusivamente pelo numero na balanca?",
        opcoes:[{letra:"A",texto:"Tem percepcao realista e saudavel de sua forma fisica."},{letra:"B",texto:"Possui insatisfacoes esteticas comuns, mas sem distorcao profunda da realidade corporal."},{letra:"C",texto:"Distorcao severa da imagem corporal e valor pessoal atrelado exclusivamente ao peso."}]},
      {id:"p4",num:"4",texto:"Nos ultimos 3 meses, como tem sido o padrao de controle de peso da pessoa?",
        opcoes:[{letra:"A",texto:"Nao se aplica - sem quadro restritivo."},{letra:"B",texto:"Controla o peso principalmente por meio de dietas rigidas ou exercicio excessivo, sem episodios de compulsao ou purgacao."},{letra:"C",texto:"Apresentou episodios de comer muito de uma vez seguidos de comportamentos para compensar (vomitos, laxantes ou jejum prolongado)."}]}
    ]
  },
  {
    titulo:"Bloco 2 - Episodios de Ingestao Excessiva",
    sub:"Observe se a pessoa tem momentos em que come muito mais do que o comum, com sensacao de perda de controle.",
    perguntas:[
      {id:"p5",num:"5",texto:"A pessoa tem episodios em que come uma quantidade muito grande de alimentos em pouco tempo, claramente mais do que a maioria das pessoas comeria na mesma situacao?",
        opcoes:[{letra:"A",texto:"Nunca ocorrem episodios de ingestao descontrolada de grandes volumes."},{letra:"B",texto:"Ocasionalmente come um pouco alem da conta em festas ou feriados, sem padrao clinico."},{letra:"C",texto:"Episodios recorrentes de ingestao volumosa e exagerada de comida."}]},
      {id:"p6",num:"6",texto:"Durante esses episodios de ingestao excessiva, a pessoa sente que nao consegue parar de comer ou controlar o quanto esta comendo?",
        opcoes:[{letra:"A",texto:"Mantem controle absoluto sobre a alimentacao."},{letra:"B",texto:"Sente que comeu rapido demais, mas sem perda de controle."},{letra:"C",texto:"Sensacao inegavel de impotencia e perda de controle sobre a quantidade ingerida."}]},
      {id:"p7",num:"7",texto:"Com que frequencia ocorrem esses episodios de comer em excesso?",
        opcoes:[{letra:"A",texto:"Nunca ou em frequencia irrelevante."},{letra:"B",texto:"Ocorrem esporadicamente (menos de uma vez por semana)."},{letra:"C",texto:"Ocorrem pelo menos uma vez por semana nos ultimos 3 meses."}]},
      {id:"p8",num:"8",texto:"Apos comer em excesso, a pessoa adota metodos para compensar, como provocar vomito, usar laxantes, fazer jejum prolongado ou se exercitar de forma excessiva e punitiva?",
        opcoes:[{letra:"A",texto:"Nunca utiliza metodos compensatorios."},{letra:"B",texto:"Compensa reduzindo levemente a refeicao seguinte de forma saudavel."},{letra:"C",texto:"Uso regular de metodos drasticos de compensacao ou purgacao apos os episodios."}]}
    ]
  },
  {
    titulo:"Bloco 3 - Comportamento Durante a Ingestao e Sentimentos Posteriores",
    sub:"Observe como a pessoa se comporta durante e apos os episodios de comer em excesso.",
    perguntas:[
      {id:"p9",num:"9",texto:"Durante os episodios de ingestao excessiva, a pessoa apresenta comportamentos como comer muito rapido, comer ate sentir desconforto fisico, comer escondida por vergonha ou comer sem sentir fome?",
        opcoes:[{letra:"A",texto:"Nao apresenta esses padroes de ingestao."},{letra:"B",texto:"Apresenta esporadicamente um ou outro comportamento."},{letra:"C",texto:"Apresenta sistematicamente esse padrao de ingestao rapida, secreta e exagerada sem fome."}]},
      {id:"p10",num:"10",texto:"Apos os episodios de comer em excesso, a pessoa sente culpa intensa, vergonha ou nojo de si mesma, mas NAO adota comportamentos de compensacao como vomito ou laxantes?",
        opcoes:[{letra:"A",texto:"Nao se aplica."},{letra:"B",texto:"Ha compulsao ocasional com leve culpa, mas sem padrao clinico."},{letra:"C",texto:"Sofre intensamente com a culpa da compulsao, mas nao usa metodos de compensacao."}]}
    ]
  },
  {
    titulo:"Observacoes Finais",
    sub:"Se quiser, compartilhe qualquer observacao adicional sobre os habitos alimentares da pessoa avaliada.",
    obs:true
  }
];

function renderStep(){
  const total=TOTAL_STEPS;
  const pct=Math.round(step/total*100);
  document.getElementById("stepLabel").textContent="Etapa "+step+" de "+total;
  document.getElementById("stepPct").textContent=pct+"%";
  document.getElementById("progressFill").style.width=pct+"%";
  document.getElementById("btnBack").style.display=step>1?"block":"none";
  document.getElementById("btnNext").textContent=step===total?"Revisar Respostas":"Proximo \u2192";
  const bloco=BLOCOS[step-1];
  let h="";
  h+="<div class='step-title'>"+bloco.titulo+"</div>";
  h+="<div class='step-sub'>"+bloco.sub+"</div>";
  if(bloco.obs){
    h+="<div class='fg'><label class='lbl'>Quer acrescentar algo? <span style='font-weight:400;text-transform:none;color:#9ca3af'>(opcional)</span></label>";
    h+="<textarea id='obsFinais' class='has-mic' placeholder='Fale ou escreva qualquer observacao que considera importante sobre os habitos alimentares...' style='min-height:120px'>"+(respostas.obsFinais||"")+"</textarea></div>";
    h+="<div class='aviso-amarelo'>Suas respostas sao confidenciais e serao analisadas exclusivamente pela Dra. Lucia Kratz para fins clinicos.</div>";
  } else {
    bloco.perguntas.forEach(p=>{
      h+="<div class='pergunta-card'>";
      h+="<div class='perg-num'>Pergunta "+p.num+" de 10</div>";
      h+="<div class='perg-texto'>"+p.texto+"</div>";
      h+="<div class='opcoes' id='grp_"+p.id+"'>";
      p.opcoes.forEach(o=>{
        const sel=respostas[p.id]===o.letra?" sel":"";
        h+="<div class='opcao"+sel+"' data-pid='"+p.id+"' data-letra='"+o.letra+"' onclick='handleOpcao(this)'>";
        h+="<input type='radio' name='"+p.id+"' value='"+o.letra+"'/>";
        h+="<div class='letra'>"+o.letra+"</div>";
        h+="<div>"+o.texto+"</div>";
        h+="</div>";
      });
      h+="</div></div>";
    });
  }
  document.getElementById("stepContent").innerHTML=h;
  initMic();
  window.scrollTo({top:0,behavior:"smooth"});
}

function handleOpcao(el){selecionarOpcao(el.dataset.pid,el.dataset.letra,el);}
function selecionarOpcao(pergId,letra,el){
  const grp=document.getElementById("grp_"+pergId);
  grp.querySelectorAll(".opcao").forEach(o=>o.classList.remove("sel"));
  el.classList.add("sel");
  respostas[pergId]=letra;
}

function avancarStep(){
  const bloco=BLOCOS[step-1];
  if(!bloco.obs){
    for(const p of bloco.perguntas){
      if(!respostas[p.id]){
        alert("Por favor, selecione uma opcao para a pergunta "+p.num+" antes de continuar.");
        const el=document.getElementById("grp_"+p.id);
        if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
        return;
      }
    }
  } else {
    const ta=document.getElementById("obsFinais");
    if(ta) respostas.obsFinais=ta.value;
  }
  if(step<TOTAL_STEPS){step++;renderStep();}
  else{mostrarRevisao();}
}

function voltarStep(){
  if(step>1){
    if(BLOCOS[step-1].obs){const ta=document.getElementById("obsFinais");if(ta) respostas.obsFinais=ta.value;}
    step--;renderStep();
  }
}

const PERGUNTAS_REVISAO=[
  {id:"p1",bloco:"Padrao Alimentar e Peso",texto:"Restricao persistente de alimentos / peso abaixo do esperado"},
  {id:"p2",bloco:"Padrao Alimentar e Peso",texto:"Medo intenso de engordar"},
  {id:"p3",bloco:"Padrao Alimentar e Peso",texto:"Distorcao da imagem corporal"},
  {id:"p4",bloco:"Padrao Alimentar e Peso",texto:"Padrao de controle de peso nos ultimos 3 meses"},
  {id:"p5",bloco:"Ingestao Excessiva",texto:"Episodios de ingestao muito acima do normal"},
  {id:"p6",bloco:"Ingestao Excessiva",texto:"Perda de controle durante os episodios"},
  {id:"p7",bloco:"Ingestao Excessiva",texto:"Frequencia dos episodios"},
  {id:"p8",bloco:"Ingestao Excessiva",texto:"Uso de metodos compensatorios apos ingestao excessiva"},
  {id:"p9",bloco:"Comportamento e Sentimentos",texto:"Padrao de ingestao rapida, secreta ou exagerada"},
  {id:"p10",bloco:"Comportamento e Sentimentos",texto:"Culpa intensa sem comportamentos compensatorios"},
];

const COR_LETRA={A:"#16a34a",B:"#d97706",C:"#dc2626"};

function mostrarRevisao(){
  const ta=document.getElementById("obsFinais");
  if(ta) respostas.obsFinais=ta.value;
  let h="";
  h+="<div style='background:#f5f3ff;border:1px solid #c4b5fd;border-radius:12px;padding:14px 16px;margin-bottom:16px'>";
  h+="<div style='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7B00C4;margin-bottom:4px'>Quem esta respondendo</div>";
  h+="<div style='font-size:14px;font-weight:600;color:#1f2937'>";
  h+=respostas.tipoRespondente==="paciente"?"Proprio paciente":(respostas.nomeRespondente||"Familiar")+" - "+(respostas.parentesco||"");
  h+="</div></div>";
  let blocoAtual="";
  PERGUNTAS_REVISAO.forEach(p=>{
    if(p.bloco!==blocoAtual){
      if(blocoAtual) h+="</div>";
      blocoAtual=p.bloco;
      h+="<div style='margin-bottom:12px'>";
      h+="<div style='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7B00C4;padding:8px 0 6px;border-bottom:1px solid #ede9fe;margin-bottom:8px'>"+p.bloco+"</div>";
    }
    const letra=respostas[p.id]||"-";
    const cor=COR_LETRA[letra]||"#6b7280";
    h+="<div style='display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f3f4f6'>";
    h+="<div style='width:26px;height:26px;min-width:26px;border-radius:50%;background:"+(letra!=="-"?cor+"22":"#f3f4f6")+";border:2px solid "+(letra!=="-"?cor:"#e5e7eb")+";display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:"+(letra!=="-"?cor:"#9ca3af")+"'>"+letra+"</div>";
    h+="<div style='font-size:13px;color:#374151;line-height:1.4'>"+p.texto+"</div>";
    h+="</div>";
  });
  if(blocoAtual) h+="</div>";
  if(respostas.obsFinais&&respostas.obsFinais.trim()){
    h+="<div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-top:4px'>";
    h+="<div style='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:6px'>Observacoes livres</div>";
    h+="<div style='font-size:13px;color:#374151;line-height:1.6'>"+respostas.obsFinais+"</div></div>";
  }
  document.getElementById("revisaoContent").innerHTML=h;
  document.getElementById("formArea").style.display="none";
  document.getElementById("revisaoArea").style.display="block";
  window.scrollTo({top:0,behavior:"smooth"});
}

function voltarRevisao(){
  document.getElementById("revisaoArea").style.display="none";
  document.getElementById("formArea").style.display="block";
  step=TOTAL_STEPS;renderStep();
  const ta=document.getElementById("obsFinais");
  if(ta&&respostas.obsFinais) ta.value=respostas.obsFinais;
  window.scrollTo({top:0,behavior:"smooth"});
}

async function enviar(){
  const btn=document.querySelector("#revisaoArea .btn-next");
  btn.disabled=true;btn.textContent="Enviando...";
  try{
    const doc={
      pacienteNome:nomePaciente||"",
      tipoRespondente:respostas.tipoRespondente||"",
      nomeRespondente:respostas.nomeRespondente||"",
      parentesco:respostas.parentesco||"",
      p1:respostas.p1||"",p2:respostas.p2||"",p3:respostas.p3||"",p4:respostas.p4||"",
      p5:respostas.p5||"",p6:respostas.p6||"",p7:respostas.p7||"",p8:respostas.p8||"",
      p9:respostas.p9||"",p10:respostas.p10||"",
      obsFinais:respostas.obsFinais||"",
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection("clinica_rastreamento_alimentar").add(doc);
    await db.collection("nr1map_emails").add({
      to:"luciakratz@gmail.com",
      message:{
        subject:"Rastreamento Alimentar - "+(nomePaciente||"Sem nome")+" ("+(respostas.tipoRespondente==="paciente"?"Proprio paciente":respostas.parentesco)+")",
        html:"<h2>Novo rastreamento recebido</h2><p><b>Paciente:</b> "+(nomePaciente||"-")+"</p><p><b>Respondido por:</b> "+respostas.nomeRespondente+" ("+respostas.parentesco+")</p><p><b>Data:</b> "+new Date().toLocaleDateString("pt-BR")+"</p>"
      },
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("revisaoArea").style.display="none";
    document.getElementById("successArea").style.display="block";
    window.scrollTo({top:0,behavior:"smooth"});
  }catch(e){
    alert("Erro ao enviar. Tente novamente.\\n"+e.message);
    btn.disabled=false;btn.textContent="Confirmar e Enviar";
  }
}

function initMic(){
  if(typeof SpeechRecognition==="undefined"&&typeof webkitSpeechRecognition==="undefined") return;
  const SR=typeof SpeechRecognition!=="undefined"?SpeechRecognition:webkitSpeechRecognition;
  document.querySelectorAll("textarea.has-mic").forEach(ta=>{
    if(ta.dataset.micDone) return;
    ta.dataset.micDone="1";
    const wrap=document.createElement("div");wrap.className="mic-wrap";
    ta.parentNode.insertBefore(wrap,ta);wrap.appendChild(ta);
    const btn=document.createElement("button");
    btn.type="button";btn.className="mic-btn";btn.title="Falar em vez de digitar";btn.textContent="\uD83C\uDF08";
    let rec=null;
    btn.onclick=()=>{
      if(rec){rec.stop();rec=null;btn.textContent="\uD83C\uDF08";return;}
      rec=new SR();rec.lang="pt-BR";rec.continuous=true;rec.interimResults=false;
      rec.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)ta.value+=(ta.value?" ":"")+e.results[i][0].transcript;};
      rec.onend=()=>{rec=null;btn.textContent="\uD83C\uDF08";};
      rec.start();btn.textContent="\uD83D\uDD34";
    };
    wrap.appendChild(btn);
  });
}
</script>
</body>
</html>
