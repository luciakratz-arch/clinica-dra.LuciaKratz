// depoimentos.js — autônomo, não depende de nada externo

function carregarDepoimentos() {
  var carrossel = document.getElementById('carrossel-dep');
  if (!carrossel) return;

  var db = firebase.firestore();

  db.collection('site_depoimentos')
    .where('status', '==', 'aprovado')
    .onSnapshot(function(snap) {

      carrossel.querySelectorAll('.dep-firebase').forEach(function(el) { el.remove(); });

      if (snap.empty) return;

      var docs = snap.docs.map(function(d) {
        return Object.assign({ id: d.id }, d.data());
      });
      docs.sort(function(a, b) {
        var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return tb - ta;
      });

      var fragment = document.createDocumentFragment();
      docs.forEach(function(dep) {
        var estrelas = '';
        for (var i = 0; i < (dep.estrelas || 5); i++) estrelas += '★';

        var dataFmt = '';
        if (dep.createdAt && dep.createdAt.seconds) {
          dataFmt = new Date(dep.createdAt.seconds * 1000).toLocaleDateString('pt-BR');
        }

        var card = document.createElement('div');
        card.className = 'dep-firebase';
        card.style.cssText = 'min-width:320px;max-width:320px;background:white;border-radius:16px;padding:24px;box-shadow:0 2px 16px rgba(123,0,196,.08);display:flex;flex-direction:column;gap:12px;flex-shrink:0';

        var respostaHtml = '';
        if (dep.resposta) {
          respostaHtml = '<div style="background:#f5f0ff;border-radius:10px;padding:12px;font-size:13px;color:#5a0090;line-height:1.6">' +
            '<div style="font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px">' +
            '<img src="foto.jpeg" style="width:24px;height:24px;border-radius:50%;object-fit:cover" onerror="this.style.display=\'none\'">' +
            ' Lucia Kratz</div>' + dep.resposta + '</div>';
        }

        card.innerHTML =
          '<div style="color:#7B00C4;font-size:20px;letter-spacing:2px">' + estrelas + '</div>' +
          '<div><div style="font-weight:700;font-size:15px">' + (dep.nome || '') + '</div>' +
          '<div style="font-size:12px;color:#9ca3af">' + (dep.cargo || dataFmt) + '</div></div>' +
          '<p style="font-size:14px;color:#374151;line-height:1.7;flex:1">\u201c' + (dep.texto || '') + '\u201d</p>' +
          respostaHtml;

        fragment.appendChild(card);
      });

      carrossel.insertBefore(fragment, carrossel.firstChild);

    }, function(err) {
      console.warn('Depoimentos:', err.message);
    });
}

// Carrega Firebase e executa
(function() {
  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function() { console.warn('Erro ao carregar', src); };
    document.head.appendChild(s);
  }

  function initFirebase() {
    try { firebase.app(); } catch(e) {
      firebase.initializeApp({
        apiKey: "AIzaSyDnrgaY8R0Zetkr18uHQJAZXIUa4EwDnv4",
        authDomain: "entrevista-inicial.firebaseapp.com",
        projectId: "entrevista-inicial",
        storageBucket: "entrevista-inicial.firebasestorage.app",
        messagingSenderId: "437375609844",
        appId: "1:437375609844:web:2ed0e16a7da5d46c2e27a1"
      });
    }
    carregarDepoimentos();
  }

  function loadFirestore() {
    loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js', initFirebase);
  }

  function start() {
    if (typeof firebase !== 'undefined') {
      // Firebase app já carregado
      if (typeof firebase.firestore !== 'undefined') {
        initFirebase();
      } else {
        loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js', initFirebase);
      }
    } else {
      // Carrega tudo do zero
      loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js', loadFirestore);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
