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

        // Badge de fonte (campo "fonte": "Google" ou "Doctoralia")
        var fonteHtml = '';
        if (dep.fonte === 'Google') {
          fonteHtml = '<a href="https://www.google.com/search?q=lucia+kratz+psicologa+goiania" target="_blank" style="display:inline-flex;align-items:center;gap:4px;background:#e8f0fe;border-radius:20px;padding:3px 10px;text-decoration:none;">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>' +
            '<span style="font-size:11px;color:#1a73e8;font-weight:600;">Google</span></a>';
        } else if (dep.fonte === 'Doctoralia') {
          fonteHtml = '<a href="https://www.doctoralia.com.br/lucia-kratz/psicologo/goiania#profile-reviews" target="_blank" style="display:inline-flex;align-items:center;gap:4px;background:#e6f4ea;border-radius:20px;padding:3px 10px;text-decoration:none;">' +
            '<img src="https://raw.githubusercontent.com/luciakratz-arch/clinica-dra.LuciaKratz/main/images.png" style="width:12px;height:12px;object-fit:contain;">' +
            '<span style="font-size:11px;color:#137333;font-weight:600;">Doctoralia</span></a>';
        }

        var card = document.createElement('div');
        card.className = 'dep-firebase';
        card.style.cssText = 'min-width:320px;max-width:320px;background:white;border-radius:20px;padding:24px;box-shadow:0 2px 16px rgba(123,0,196,.08);display:flex;flex-direction:column;gap:12px;flex-shrink:0';

        var respostaHtml = '';
        if (dep.resposta) {
          respostaHtml = '<div style="background:#f5f0ff;border-radius:10px;padding:12px;font-size:13px;color:#5a0090;line-height:1.6">' +
            '<div style="font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px">' +
            '<img src="foto.jpeg" style="width:24px;height:24px;border-radius:50%;object-fit:cover" onerror="this.style.display=\'none\'">' +
            ' Lucia Kratz</div>' + dep.resposta + '</div>';
        }

        card.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<div style="color:#7B00C4;font-size:20px;letter-spacing:2px">' + estrelas + '</div>' +
            fonteHtml +
          '</div>' +
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
      if (typeof firebase.firestore !== 'undefined') {
        initFirebase();
      } else {
        loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js', initFirebase);
      }
    } else {
      loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js', loadFirestore);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
