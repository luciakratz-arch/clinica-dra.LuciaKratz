/* ═══════════════════════════════════════════════════════
   PLATAFORMA CLÍNICA — DRA. LUCIA KRATZ
   style.css — Etapa 1: Base + Login
   ═══════════════════════════════════════════════════════ */

/* ── RESET & BASE ─────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --purple:        #7B00C4;
  --purple-dark:   #5a0090;
  --purple-light:  #9b30e0;
  --purple-bg:     #f5eeff;
  --purple-soft:   #ede0fa;
  --white:         #ffffff;
  --gray-50:       #fafafa;
  --gray-100:      #f4f4f5;
  --gray-200:      #e4e4e7;
  --gray-400:      #a1a1aa;
  --gray-600:      #52525b;
  --gray-800:      #27272a;
  --text:          #1a1a2e;
  --text-muted:    #6b7280;
  --danger:        #ef4444;
  --success:       #10b981;
  --sidebar-w:     260px;
  --header-h:      60px;
  --radius:        12px;
  --radius-sm:     8px;
  --shadow:        0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
  --shadow-md:     0 4px 24px rgba(123,0,196,0.12);
  --font-display:  'Playfair Display', Georgia, serif;
  --font-body:     'DM Sans', system-ui, sans-serif;
  --transition:    0.2s ease;
}

html, body {
  height: 100%;
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text);
  background: var(--gray-50);
  -webkit-font-smoothing: antialiased;
}

#root { min-height: 100vh; }

/* ── SPINNER ──────────────────────────────────────────── */
.spinner-wrap {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh;
}
.spinner {
  width: 40px; height: 40px;
  border: 3px solid var(--purple-soft);
  border-top-color: var(--purple);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ══════════════════════════════════════════════════════
   LOGIN — tela de seleção de perfil
   ══════════════════════════════════════════════════════ */
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Painel esquerdo — roxo */
.login-left {
  background: linear-gradient(145deg, #7B00C4 0%, #5a0090 60%, #3d006b 100%);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 48px 40px;
  position: relative;
  overflow: hidden;
}

.login-left::before {
  content: '';
  position: absolute;
  width: 400px; height: 400px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  top: -100px; right: -100px;
}
.login-left::after {
  content: '';
  position: absolute;
  width: 300px; height: 300px;
  border-radius: 50%;
  background: rgba(255,255,255,0.04);
  bottom: -80px; left: -80px;
}

.login-logo {
  width: auto; height: auto;
  border-radius: 0;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
  backdrop-filter: none;
  border: none;
  overflow: visible;
}
.login-logo img { width: 140px; height: 140px; object-fit: contain; }
.login-logo-placeholder {
  font-family: var(--font-display);
  font-size: 36px;
  color: white;
  font-style: italic;
}

.login-name {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 600;
  color: white;
  text-align: center;
  margin-bottom: 8px;
  position: relative; z-index: 1;
}

.login-subtitle {
  font-size: 14px;
  color: rgba(255,255,255,0.75);
  text-align: center;
  letter-spacing: 0.3px;
  position: relative; z-index: 1;
}

.login-crp {
  font-size: 12px;
  color: rgba(255,255,255,0.55);
  margin-top: 6px;
  position: relative; z-index: 1;
}

.login-left-btns {
  display: flex; gap: 10px;
  margin-top: 40px;
  position: relative; z-index: 1;
}
.login-left-btns button {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
  font-family: var(--font-body);
  font-size: 13px;
  padding: 8px 18px;
  border-radius: 20px;
  cursor: pointer;
  transition: background var(--transition);
}
.login-left-btns button:hover { background: rgba(255,255,255,0.25); }

/* Painel direito — branco */
.login-right {
  background: white;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 48px 56px;
}

.login-right-back {
  align-self: flex-start;
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--text-muted);
  cursor: pointer; margin-bottom: 40px;
  transition: color var(--transition);
  background: none; border: none; font-family: var(--font-body);
}
.login-right-back:hover { color: var(--purple); }

.login-right-title {
  font-family: var(--font-display);
  font-size: 28px; font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
  align-self: flex-start;
}
.login-right-sub {
  font-size: 14px; color: var(--text-muted);
  margin-bottom: 36px;
  align-self: flex-start;
}

/* Cards de perfil */
.profile-cards { display: flex; flex-direction: column; gap: 14px; width: 100%; }

.profile-card {
  display: flex; align-items: center; gap: 16px;
  padding: 18px 20px;
  border: 1.5px solid var(--gray-200);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all var(--transition);
  background: white;
  width: 100%;
  text-align: left;
}
.profile-card:hover {
  border-color: var(--purple);
  background: var(--purple-bg);
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.profile-card-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  background: var(--purple);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: white;
}

.profile-card-text { flex: 1; }
.profile-card-name {
  font-size: 15px; font-weight: 600;
  color: var(--text); margin-bottom: 2px;
}
.profile-card-desc { font-size: 13px; color: var(--text-muted); }

.profile-card-arrow { color: var(--gray-400); transition: color var(--transition); }
.profile-card:hover .profile-card-arrow { color: var(--purple); }

.login-footer {
  margin-top: 48px;
  font-size: 12px; color: var(--gray-400);
  text-align: center;
  align-self: center;
}

/* Formulário de login (senha) */
.login-form { width: 100%; display: flex; flex-direction: column; gap: 16px; }

.login-form-title {
  font-family: var(--font-display);
  font-size: 24px; font-weight: 600;
  color: var(--text); margin-bottom: 4px;
}
.login-form-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label {
  font-size: 11px; font-weight: 600;
  color: var(--gray-600); letter-spacing: 0.8px;
  text-transform: uppercase;
}
.form-input {
  width: 100%; padding: 12px 14px;
  border: 1.5px solid var(--gray-200);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 14px; color: var(--text);
  background: white;
  transition: border-color var(--transition), box-shadow var(--transition);
  outline: none;
}
.form-input:focus {
  border-color: var(--purple);
  box-shadow: 0 0 0 3px rgba(123,0,196,0.08);
}

.btn-primary {
  width: 100%; padding: 13px;
  background: var(--purple);
  color: white; border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 15px; font-weight: 500;
  cursor: pointer;
  transition: background var(--transition), transform var(--transition);
}
.btn-primary:hover { background: var(--purple-dark); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }

.login-error {
  background: #fef2f2; border: 1px solid #fecaca;
  color: var(--danger); border-radius: var(--radius-sm);
  padding: 10px 14px; font-size: 13px;
}

/* ══════════════════════════════════════════════════════
   LAYOUT PRINCIPAL
   ══════════════════════════════════════════════════════ */

/* Sidebar Desktop */
.sidebar-desktop {
  position: fixed; top: 0; left: 0;
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--purple);
  display: flex; flex-direction: column;
  z-index: 100;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-header {
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; gap: 12px;
}
.sidebar-logo {
  width: 44px; height: 44px;
  border-radius: 10px;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  overflow: visible; flex-shrink: 0;
}
.sidebar-logo img { width: 44px; height: 44px; object-fit: contain; }
.sidebar-logo-placeholder {
  font-family: var(--font-display);
  font-size: 16px; color: white; font-style: italic;
}
.sidebar-title { font-size: 13px; font-weight: 600; color: white; line-height: 1.3; }
.sidebar-role { font-size: 11px; color: rgba(255,255,255,0.65); }

.sidebar-nav { flex: 1; padding: 12px 8px; }

.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: rgba(255,255,255,0.75);
  font-size: 14px; font-weight: 400;
  transition: all var(--transition);
  margin-bottom: 2px;
  border: none; background: none;
  width: 100%; text-align: left;
  font-family: var(--font-body);
}
.nav-item:hover { background: rgba(255,255,255,0.1); color: white; }
.nav-item.active { background: rgba(255,255,255,0.18); color: white; font-weight: 500; }
.nav-item svg { flex-shrink: 0; width: 18px; height: 18px; }

.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.sidebar-user {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; margin-bottom: 4px;
}
.sidebar-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; color: white;
  flex-shrink: 0;
}
.sidebar-user-name { font-size: 13px; font-weight: 500; color: white; }
.sidebar-user-crp { font-size: 11px; color: rgba(255,255,255,0.6); }

.nav-item-danger { color: rgba(255,150,150,0.85) !important; }
.nav-item-danger:hover { background: rgba(239,68,68,0.15) !important; color: #fca5a5 !important; }

/* Header Mobile */
.header-mobile {
  display: none;
  position: fixed; top: 0; left: 0; right: 0;
  height: var(--header-h);
  background: var(--purple);
  z-index: 100;
  align-items: center; justify-content: space-between;
  padding: 0 16px;
}
.header-mobile-logo {
  font-family: var(--font-display);
  font-size: 16px; color: white; font-weight: 600;
}
.header-mobile-btn {
  background: rgba(255,255,255,0.15);
  border: none; border-radius: 8px;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: white;
}

/* Nav Mobile */
.nav-mobile {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 64px;
  background: white;
  border-top: 1px solid var(--gray-200);
  z-index: 100;
  align-items: center; justify-content: space-around;
  padding: 0 8px;
}
.nav-mobile-item {
  display: flex; flex-direction: column;
  align-items: center; gap: 3px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--gray-400);
  font-size: 10px; font-weight: 500;
  transition: color var(--transition);
  border: none; background: none;
  font-family: var(--font-body);
}
.nav-mobile-item.active { color: var(--purple); }
.nav-mobile-item svg { width: 20px; height: 20px; }

/* Conteúdo principal */
.main-content {
  margin-left: var(--sidebar-w);
  min-height: 100vh;
  padding: 32px;
  padding-bottom: 48px;
  background: var(--gray-50);
  box-sizing: border-box;
  width: calc(100% - var(--sidebar-w));
  max-width: 100%;
  overflow-x: hidden;
}

/* ══════════════════════════════════════════════════════
   COMPONENTES GERAIS
   ══════════════════════════════════════════════════════ */

/* Page Header */
.page-header { margin-bottom: 28px; }
.page-title {
  font-family: var(--font-display);
  font-size: 28px; font-weight: 600;
  color: var(--text); margin-bottom: 4px;
}
.page-subtitle { font-size: 14px; color: var(--text-muted); }

/* Cards */
.card {
  background: white;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
  padding: 24px;
  box-shadow: var(--shadow);
}

/* Metric Cards */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.metric-card {
  background: white;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
  padding: 20px;
  box-shadow: var(--shadow);
}
.metric-label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; font-weight: 500; }
.metric-value {
  font-size: 28px; font-weight: 600; color: var(--text);
  font-family: var(--font-display);
}
.metric-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.metric-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  background: var(--purple-soft);
  display: flex; align-items: center; justify-content: center;
  color: var(--purple);
  float: right; margin-top: -4px;
}

/* Em Breve */
.em-breve {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 400px;
  color: var(--text-muted); text-align: center; gap: 12px;
}
.em-breve svg { color: var(--gray-200); }
.em-breve-title { font-size: 18px; font-weight: 500; color: var(--gray-600); }
.em-breve-sub { font-size: 14px; color: var(--gray-400); }

/* Badge */
.badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.3px;
}
.badge-green { background: #d1fae5; color: #065f46; }
.badge-gray  { background: var(--gray-100); color: var(--gray-600); }
.badge-red   { background: #fee2e2; color: #991b1b; }
.badge-purple { background: var(--purple-soft); color: var(--purple-dark); }

/* Botões */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: var(--radius-sm);
  font-family: var(--font-body); font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all var(--transition); border: none;
}
.btn-purple { background: var(--purple); color: white; }
.btn-purple:hover { background: var(--purple-dark); }
.btn-outline { background: white; color: var(--purple); border: 1.5px solid var(--purple); }
.btn-outline:hover { background: var(--purple-bg); }
.btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--gray-200); }
.btn-ghost:hover { background: var(--gray-100); color: var(--text); }
.btn-danger { background: #fee2e2; color: var(--danger); }
.btn-danger:hover { background: #fecaca; }

/* ══════════════════════════════════════════════════════
   RESPONSIVIDADE
   ══════════════════════════════════════════════════════ */

@media (max-width: 767px) {
  .sidebar-desktop { display: none !important; }
  .header-mobile   { display: flex !important; }
  .nav-mobile      { display: flex !important; }
  .main-content    {
    margin-left: 0 !important;
    padding: 16px !important;
    padding-top: calc(var(--header-h) + 16px) !important;
    padding-bottom: 80px !important;
  }
  .login-page { grid-template-columns: 1fr; }
  .login-left { display: none; }
  .login-right { padding: 32px 24px; }
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 768px) {
  .sidebar-desktop { display: flex !important; }
  .header-mobile   { display: none !important; }
  .nav-mobile      { display: none !important; }
  .main-content    {
    margin-left: var(--sidebar-w) !important;
    width: calc(100% - var(--sidebar-w)) !important;
    max-width: calc(100% - var(--sidebar-w)) !important;
  }
}

@media (max-width: 1100px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ── OVERFLOW FIXES ─────────────────────────────────── */
.main-content * {
  max-width: 100%;
  box-sizing: border-box;
}
table {
  width: 100%;
  table-layout: fixed;
  word-break: break-word;
}
.metrics-grid {
  width: 100%;
}
/* Grids responsivos */
@media (max-width: 1024px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 640px) {
  .metrics-grid { grid-template-columns: 1fr !important; }
}
/* Fix para modais não causarem scroll horizontal */
[style*="position:fixed"], [style*="position: fixed"] {
  max-width: 100vw;
}

/* ── FILTROS DE CATEGORIA ───────────────────────────── */
/* Garante que botões de filtro quebrem linha e não cortem */
.filtros-macro {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}
.filtros-macro button {
  flex-shrink: 0;
  white-space: nowrap;
}
