// js/auth.js
import { auth } from './firebase-config.js';
import { DB } from './database.js';
import { Game } from './game.js';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const Auth = {
    currentUser: null,
    isGuest: false,

    showMessage(msg, type) {
        const el = document.getElementById('auth-message');
        if (!el) return;
        el.textContent = msg;
        el.className = 'auth-message ' + (type || '');
        setTimeout(() => { el.textContent = ''; el.className = 'auth-message'; }, 4000);
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
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value.trim();
            const p = document.getElementById('reg-password').value;
            const c = document.getElementById('reg-confirm').value;

            if (!email || !p || !c) return this.showMessage('Please fill all fields.', 'error');
            if (p !== c) return this.showMessage('Passwords do not match.', 'error');
            if (p.length < 6) return this.showMessage('Password must be at least 6 characters.', 'error');

            try {
                await createUserWithEmailAndPassword(auth, email, p);
                this.showMessage('Registration successful!', 'success');
            } catch (error) {
                console.error('Register error:', error);
                let msg = error.message;
                if (error.code === 'auth/email-already-in-use') msg = 'Email already registered.';
                if (error.code === 'auth/invalid-email') msg = 'Invalid email format.';
                if (error.code === 'auth/weak-password') msg = 'Password too weak (min 6 chars).';
                this.showMessage(msg, 'error');
            }
        });

        // Login
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const p = document.getElementById('login-password').value;
            if (!email || !p) return this.showMessage('Please fill all fields.', 'error');

            try {
                await signInWithEmailAndPassword(auth, email, p);
            } catch (error) {
                console.error('Login error:', error);
                let msg = error.message;
                if (error.code === 'auth/user-not-found') msg = 'User not found.';
                if (error.code === 'auth/wrong-password') msg = 'Wrong password.';
                if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
                this.showMessage('Login failed: ' + msg, 'error');
            }
        });

        // Guest
        document.getElementById('guest-btn').addEventListener('click', async () => {
            try {
                await signInAnonymously(auth);
            } catch (error) {
                console.error('Guest error:', error);
                this.showMessage('Guest login failed: ' + error.message, 'error');
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await signOut(auth);
                Game.reset();
                showPage('page-home');
            } catch (error) {
                console.error('Logout error:', error);
            }
        });

        // Auth state listener
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user.uid;
                this.isGuest = user.isAnonymous;
                console.log("User logged in:", user.uid, "Guest:", this.isGuest);

                const saveData = await DB.loadGame(this.currentUser);
                if (saveData && saveData.hero) {
                    await Game.load(saveData);
                    showPage('page-profile');
                } else {
                    showPage('page-hero-name');
                    document.getElementById('hero-name-input').value = '';
                    document.getElementById('hero-name-input').focus();
                }
            } else {
                this.currentUser = null;
                this.isGuest = false;
                Game.reset();
                showPage('page-home');
            }
        });
    },

    initHeroName() {
        document.getElementById('hero-name-confirm').addEventListener('click', async () => {
            const name = document.getElementById('hero-name-input').value.trim();
            if (!name) return alert('Please enter a hero name.');
            await Game.createHero(name, Auth.currentUser, Auth.isGuest);
            showPage('page-profile');
        });
        document.getElementById('hero-name-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('hero-name-confirm').click();
        });
    }
};

export { Auth };