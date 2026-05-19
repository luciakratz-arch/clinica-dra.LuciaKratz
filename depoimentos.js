// depoimentos.js — carrega depoimentos aprovados do Firebase
// Adicione ao final do index.html:
//   <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
//   <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>
//   <script src="depoimentos.js"></script>

(function() {
  // Aguarda o DOM estar pronto
  function init() {
    var carrossel = document.getElementById('carrossel-dep');
    if (!carrossel) return; // segurança: se não achar o elemento, não faz nada

    // Inicializa Firebase (só se ainda não foi inicializado)
    var app;
    try {
      app = firebase.app(); // já existe
    } catch(e) {
      app = firebase.initializeApp({
        apiKey: "AIzaSyDnrgaY8R0Zetkr18uHQJAZXIUa4EwDnv4",
        authDomain: "entrevista-inicial.firebaseapp.com",
        projectId: "entrevista-inicial",
        storageBucket: "entrevista-inicial.firebasestorage.app",
        messagingSenderId: "437375609844",
        appId: "1:437375609844:web:2ed0e16a7da5d46c2e27a1"
      });
    }

    var db = firebase.firestore();

    // Escuta em tempo real os depoimentos aprovados
    db.collection('site_depoimentos')
      .where('status', '==', 'aprovado')
      .onSnapshot(function(snap) {

        // Remove cards dinâmicos anteriores (evita duplicatas)
        var antigos = carrossel.querySelectorAll('.dep-firebase');
        antigos.forEach(function(el) { el.remove(); });

        if (snap.empty) return;

        // Ordena por data decrescente no JS (sem precisar de índice composto)
        var docs = snap.docs.map(function(d) {
          return Object.assign({ id: d.id }, d.data());
        });
        docs.sort(function(a, b) {
          var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
          var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
          return tb - ta;
        });

        // Cria e insere os cards no INÍCIO do carrossel
        var fragment = document.createDocumentFragment();
        docs.forEach(function(dep) {
          var estrelas = '';
          var n = dep.estrelas || 5;
          for (var i = 0; i < n; i++) estrelas += '★';

          var card = document.createElement('div');
          card.className = 'dep-firebase';
          card.style.cssText = 'min-width:320px;max-width:320px;background:white;border-radius:16px;padding:24px;box-shadow:0 2px 16px rgba(123,0,196,.08);display:flex;flex-direction:column;gap:12px;flex-shrink:0';

          var dataFmt = '';
          if (dep.createdAt && dep.createdAt.seconds) {
            dataFmt = new Date(dep.createdAt.seconds * 1000).toLocaleDateString('pt-BR');
          }

          card.innerHTML =
            '<div style="color:#7B00C4;font-size:20px;letter-spacing:2px">' + estrelas + '</div>' +
            '<div>' +
              '<div style="font-weight:700;font-size:15px">' + (dep.nome || '') + '</div>' +
              '<div style="font-size:12px;color:#9ca3af">' + (dep.cargo || dataFmt) + '</div>' +
            '</div>' +
            '<p style="font-size:14px;color:#374151;line-height:1.7;flex:1">&ldquo;' + (dep.texto || '') + '&rdquo;</p>';

          fragment.appendChild(card);
        });

        carrossel.insertBefore(fragment, carrossel.firstChild);

      }, function(err) {
        // Falha silenciosa — os depoimentos fixos continuam aparecendo
        console.warn('Depoimentos Firebase:', err.message);
      });
  }

  // Executa quando o DOM estiver carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
