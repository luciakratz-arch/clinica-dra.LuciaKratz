// tema.js v3 — SÓ carrega logo do parceiro. Nunca altera cores nem fundo.
(function(){
  var LOGO_LUCIA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAFgmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA3LTIxPC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUhQMy1KQUJiYyZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBQ0J0S1ZhbzJZJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O1Byb2ZhLiBMdWNpYSBLcmF0eiZxdW90O308L0F0dHJpYjpEYXRhPgogICAgIDxBdHRyaWI6RXh0SWQ+NWY1OThmY2ItZmNkMS00ZDBlLTljMTQtNzYxMTdkNjg2YTAyPC9BdHRyaWI6RXh0SWQ+CiAgICAgPEF0dHJpYjpGYklkPjUyNTI2NTkxNDE3OTU4MDwvQXR0cmliOkZiSWQ+CiAgICAgPEF0dHJpYjpUb3VjaFR5cGU+MjwvQXR0cmliOlRvdWNoVHlwZT4KICAgIDwvcmRmOmxpPgogICA8L3JkZjpTZXE+CiAgPC9BdHRyaWI6QWRzPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpkYz0naHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8nPgogIDxkYzp0aXRsZT4KICAgPHJkZjpBbHQ+CiAgICA8cmRmOmxpIHhtbDpsYW5nPSd4LWRlZmF1bHQnPkxvZ28gRHJhLiBMdWNpYSBLcmF0eiBUcmFuc3BhcmVudGUgKDE5MiB4IDE5MiBweCkgLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpwZGY9J2h0dHA6Ly9ucy5hZG9iZS5jb20vcGRmLzEuMy8nPgogIDxwZGY6QXV0aG9yPmx1Y2lha3JhdHouY29hY2g8L3BkZjpBdXRob3I+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnhtcD0naHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyc+CiAgPHhtcDpDcmVhdG9yVG9vbD5DYW52YSAoUmVuZGVyZXIpIGRvYz1EQUhQMy1KQUJiYyB1c2VyPVVBQ0J0S1ZhbzJZIGJyYW5kPVByb2ZhLiBMdWNpYSBLcmF0ejwveG1wOkNyZWF0b3JUb29sPgogPC9yZGY6RGVzY3JpcHRpb24+CjwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cjw/eHBhY2tldCBlbmQ9J3InPz78zL7lAAAATmVYSWZNTQAqAAAACAAEARoABQAAAAEAAAA+ARsABQAAAAEAAABGASgAAwAAAAEAAgAAAhMAAwAAAAEAAQAAAAAAAAAAAGAAAAABAAAAYAAAAAF3Bd/nAAAyL0lEQVR4nO2ddWAUZ97Hn2dm3bO7sY0nGzeihAQJ7tbSQqFGKUehAr2rXPveXXtUr9S40qsbpcULheJBEhIgAeLu7sm678y8fywNIUayu0mQ+fwFO7vPPLv5zmM/g88jXwMSEmtBxrsDJHc3pIBIbIIUEIlNkAIisQlSQCQ2QQqIxCZIAZHYBCkgEpsgBURiE6SASGyCFBCJTZACIrEJUkAkNkEKiMQmSAGR2AQpIBKbIAVEYhOkgEhsghQQiU2QAiKxCVJAJDZBCojEJkgBkdgEKSASm/h/qhy/IsvZ3z0AAAAASUVORK5CYII=';

  function init(){
    // Aplica logo da Lucia em todos os [data-tema="logo"] que estão ocultos
    document.querySelectorAll('[data-tema="logo"]').forEach(function(el){
      if(!el.src || el.src === window.location.href){
        el.src = LOGO_LUCIA;
      }
      el.style.display = 'block';
      el.style.maxHeight = '44px';
      el.style.objectFit = 'contain';
    });

    // Carrega logo do parceiro do Firebase (não altera nada mais)
    if(typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length){
      carregar();
    } else {
      // Aguarda Firebase inicializar
      var t = 0;
      var iv = setInterval(function(){
        t += 200;
        if((typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) || t > 5000){
          clearInterval(iv);
          if(typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) carregar();
        }
      }, 200);
    }
  }

  function carregar(){
    try{
      firebase.firestore().doc('lider_config/tema').get().then(function(doc){
        if(!doc.exists) return;
        var d = doc.data();
        // Logo do parceiro
        if(d.logoParceiro){
          document.querySelectorAll('[data-tema="logo-parceiro"]').forEach(function(el){
            el.src = d.logoParceiro;
            el.style.display = 'block';
          });
          var sep = document.getElementById('sep-logos');
          if(sep) sep.style.display = 'block';
        }
        // Logo da Lucia pode ser sobrescrita se configurada
        if(d.logoUrl){
          document.querySelectorAll('[data-tema="logo"]').forEach(function(el){
            el.src = d.logoUrl;
          });
        }
        // NUNCA altera: background, cores, fontes, header gradient
      }).catch(function(){});
    }catch(e){}
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
