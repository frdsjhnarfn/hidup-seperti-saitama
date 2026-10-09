/* ============================================================
   Local Database Layer (localStorage)
   Dengan "lapisan keamanan": hashing sederhana + salt
   ============================================================ */

const DB = {
    USERS_KEY: 'hss_users',
    SESSION_KEY: 'hss_session',
    SAVE_KEY: 'hss_save_',

    /* ---------- Simple Hash (bukan kriptografi kuat, hanya obfuscation) ---------- */
    hash(str) {
        let h = 0;
        const salt = 'saitama_';
        const s = salt + str + salt;
        for (let i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h |= 0;
        }
        return 'h' + Math.abs(h).toString(36);
    },

    /* ---------- Users ---------- */
    getUsers() {
        try {
            return JSON.parse(localStorage.getItem(this.USERS_KEY)) || {};
        } catch { return {}; }
    },

    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },

    register(username, password) {
        const users = this.getUsers();
        const key = username.toLowerCase();
        if (users[key]) {
            return { ok: false, msg: 'Username already taken.' };
        }
        if (username.length < 3) {
            return { ok: false, msg: 'Username must be at least 3 characters.' };
        }
        if (password.length < 4) {
            return { ok: false, msg: 'Password must be at least 4 characters.' };
        }
        users[key] = {
            username,
            passwordHash: this.hash(password),
            createdAt: Date.now()
        };
        this.saveUsers(users);
        return { ok: true };
    },

    login(username, password) {
        const users = this.getUsers();
        const key = username.toLowerCase();
        const user = users[key];
        if (!user) return { ok: false, msg: 'User not found.' };
        if (user.passwordHash !== this.hash(password)) {
            return { ok: false, msg: 'Wrong password.' };
        }
        return { ok: true, username: user.username };
    },

    /* ---------- Session ---------- */
    setSession(username) {
        localStorage.setItem(this.SESSION_KEY, username);
    },
    getSession() {
        return localStorage.getItem(this.SESSION_KEY);
    },
    clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
    },

    /* ---------- Save Game ---------- */
    saveGame(username, data) {
        localStorage.setItem(this.SAVE_KEY + username.toLowerCase(), JSON.stringify(data));
    },
    loadGame(username) {
        try {
            return JSON.parse(localStorage.getItem(this.SAVE_KEY + username.toLowerCase()));
        } catch { return null; }
    },
    deleteSave(username) {
        localStorage.removeItem(this.SAVE_KEY + username.toLowerCase());
    }
};