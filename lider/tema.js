// tema.js — Carrega configuração do Firebase e aplica em toda a plataforma Líd@r 5.0
(function(){
  var LOGO_DEFAULT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAFgmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA3LTIxPC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUhQMy1KQUJiYyZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBQ0J0S1ZhbzJZJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O1Byb2ZhLiBMdWNpYSBLcmF0eiZxdW90O308L0F0dHJpYjpEYXRhPgogICAgIDxBdHRyaWI6RXh0SWQ+NWY1OThmY2ItZmNkMS00ZDBlLTljMTQtNzYxMTdkNjg2YTAyPC9BdHRyaWI6RXh0SWQ+CiAgICAgPEF0dHJpYjpGYklkPjUyNTI2NTkxNDE3OTU4MDwvQXR0cmliOkZiSWQ+CiAgICAgPEF0dHJpYjpUb3VjaFR5cGU+MjwvQXR0cmliOlRvdWNoVHlwZT4KICAgIDwvcmRmOmxpPgogICA8L3JkZjpTZXE+CiAgPC9BdHRyaWI6QWRzPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpkYz0naHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8nPgogIDxkYzp0aXRsZT4KICAgPHJkZjpBbHQ+CiAgICA8cmRmOmxpIHhtbDpsYW5nPSd4LWRlZmF1bHQnPkxvZ28gRHJhLiBMdWNpYSBLcmF0eiBUcmFuc3BhcmVudGUgKDE5MiB4IDE5MiBweCkgLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6QXV0aG9yPmx1Y2lha3JhdHouY29hY2g8L3BkZjpBdXRob3I+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnhtcD0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyc+CiAgPHhtcDpDcmVhdG9yVG9vbD5DYW52YSAoUmVuZGVyZXIpIGRvYz1EQUhQMy1KQUJiYyB1c2VyPVVBQ0J0S1ZhbzJZIGJyYW5kPVByb2ZhLiBMdWNpYSBLcmF0ejwveG1wOkNyZWF0b3JUb29sPgogPC9yZGY6RGVzY3JpcHRpb24+CjwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cjw/eHBhY2tldCBlbmQ9J3InPz78zL7lAAAATmVYSWZNTQAqAAAACAAEARoABQAAAAEAAAA+ARsABQAAAAEAAABGASgAAwAAAAEAAgAAAhMAAwAAAAEAAQAAAAAAAAAAAGAAAAABAAAAYAAAAAF3Bd/nAAAyL0lEQVR4nO2ddWAUZ97Hn2dm3bO7sY0nGzeihAQJ7tbSQqFGKUehAr2rXPveXXtUr9S40qsbpcULheJBEhIgAeLu7sm678y8fywNIUayu0mQ+fwFO7vPPLv5zmM/g88jXwMSEmtBxrsDJHc3pIBIbIIUEIlNkAIisQlSQCQ2QQqIxCZIAZHYBCkgEpsgBURiE6SASGyCFBCJTZACIrEJUkAkNkEKiMQmSAGR2AQpIBKbIAVEYhOkgEhsghQQiU2QAiKxCVJAJDZBCojEJkgBkdgEKSASm/h/qhy/IsvZ3z0AAAAASUVORK5CYII=';

  var DEFAULTS = {
    corPrimaria:'#7c3aed', corSecundaria:'#1a0a2e',
    corFundo:'#0f0f1a', corTexto:'#e2e2e8', modo:'escuro',
    nomeCliente:'Dra. Lucia Kratz', logoUrl:LOGO_DEFAULT
  };

  function aplicarLogo(url){
    document.querySelectorAll('[data-tema="logo"]').forEach(function(el){
      el.src = url;
      el.style.display = 'block';
    });
    document.querySelectorAll('[data-tema="logo-parceiro"]').forEach(function(el){
      el.src = url;
      el.style.display = 'block';
    });
  }

  function aplicarTema(c){
    var p = c.corPrimaria || DEFAULTS.corPrimaria;
    var s = c.corSecundaria || DEFAULTS.corSecundaria;
    var logo = c.logoUrl || DEFAULTS.logoUrl;
    var nome = c.nomeCliente || DEFAULTS.nomeCliente;

    // Aplica header gradient
    document.querySelectorAll('[data-tema="header"]').forEach(function(el){
      el.style.background = 'linear-gradient(135deg,'+s+' 0%,'+p+'55 100%)';
      el.style.borderBottomColor = p+'44';
    });
    // Badge cor primária
    document.querySelectorAll('[data-tema="badge"]').forEach(function(el){
      el.style.background = p+'33';
      el.style.color = p;
    });
    // Botão principal
    document.querySelectorAll('[data-tema="btn-primary"]').forEach(function(el){
      el.style.background = 'linear-gradient(135deg,'+p+','+s+')';
    });
    // Borda esquerda instrução
    document.querySelectorAll('[data-tema="border-left"]').forEach(function(el){
      el.style.borderLeftColor = p;
    });
    // Logo sempre visível
    aplicarLogo(logo);
    // Nome cliente
    document.querySelectorAll('[data-tema="nome-cliente"]').forEach(function(el){
      el.textContent = nome;
      el.style.display = 'block';
    });
  }

  // Aplica logo padrão IMEDIATAMENTE (antes do Firebase)
  function init(){
    aplicarLogo(LOGO_DEFAULT);
  }

  // Tenta carregar config do Firebase
  function tentarCarregar(){
    if(typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length){
      setTimeout(tentarCarregar, 200); return;
    }
    try{
      var db = firebase.firestore();
      db.doc('lider_config/tema').get().then(function(doc){
        if(doc.exists) aplicarTema(doc.data());
        else aplicarTema(DEFAULTS);
      }).catch(function(){ aplicarTema(DEFAULTS); });
    }catch(e){ aplicarTema(DEFAULTS); }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ init(); tentarCarregar(); });
  } else {
    init(); tentarCarregar();
  }
})();
