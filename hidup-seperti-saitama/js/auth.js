/* ============================================================
   Authentication & Guest Handling
   ============================================================ */

const Auth = {
    currentUser: null,
    isGuest: false,

    showMessage(msg, type) {
        const el = document.getElementById('auth-message');
        el.textContent = msg;
        el.className = 'auth-message ' + (type || '');
        setTimeout(() => { el.textContent = ''; el.className = 'auth-message'; }, 3000);
    },

    init() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.tab + '-form').classList.add('active');
            });
        });

        // Register
        document.getElementById('register-form').addEventListener('submit', e => {
            e.preventDefault();
            const u = document.getElementById('reg-username').value.trim();
            const p = document.getElementById('reg-password').value;
            const c = document.getElementById('reg-confirm').value;
            if (!u || !p || !c) return this.showMessage('Please fill all fields.', 'error');
            if (p !== c) return this.showMessage('Passwords do not match.', 'error');
            const res = DB.register(u, p);
            if (!res.ok) return this.showMessage(res.msg, 'error');
            this.showMessage('Registration successful! Please login.', 'success');
            document.getElementById('register-form').reset();
            document.querySelector('.tab-btn[data-tab="login"]').click();
        });

        // Login
        document.getElementById('login-form').addEventListener('submit', e => {
            e.preventDefault();
            const u = document.getElementById('login-username').value.trim();
            const p = document.getElementById('login-password').value;
            if (!u || !p) return this.showMessage('Please fill all fields.', 'error');
            const res = DB.login(u, p);
            if (!res.ok) return this.showMessage(res.msg, 'error');
            this.currentUser = res.username;
            this.isGuest = false;
            DB.setSession(res.username);
            this.afterLogin();
        });

        // Guest
        document.getElementById('guest-btn').addEventListener('click', () => {
            this.isGuest = true;
            this.currentUser = 'Guest_' + Math.floor(Math.random() * 90000 + 10000);
            this.afterLogin();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            if (!this.isGuest) DB.clearSession();
            this.currentUser = null;
            this.isGuest = false;
            Game.reset();
            showPage('page-home');
        });
    },

    afterLogin() {
        // Cek apakah sudah ada save data
        const existing = this.isGuest ? null : DB.loadGame(this.currentUser);
        if (existing && existing.hero) {
            Game.load(existing);
            showPage('page-profile');
        } else {
            showPage('page-hero-name');
            document.getElementById('hero-name-input').value = '';
            document.getElementById('hero-name-input').focus();
        }
    },

    initHeroName() {
        document.getElementById('hero-name-confirm').addEventListener('click', () => {
            const name = document.getElementById('hero-name-input').value.trim();
            if (!name) return alert('Please enter a hero name.');
            Game.createHero(name, this.currentUser, this.isGuest);
            showPage('page-profile');
        });
        document.getElementById('hero-name-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('hero-name-confirm').click();
        });
    }
};