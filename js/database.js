// js/database.js
import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const DB = {
    /* ---------- Save Game Data to Firestore ---------- */
    async saveGame(uid, data) {
        try {
            const userDoc = doc(db, "saves", uid);
            await setDoc(userDoc, data, { merge: true });
            console.log("Game saved to Firestore");
        } catch (error) {
            console.error("Error saving to Firestore: ", error);
            // Fallback: simpan ke localStorage
            localStorage.setItem('hss_save_' + uid, JSON.stringify(data));
        }
    },

    /* ---------- Load Game Data from Firestore ---------- */
    async loadGame(uid) {
        try {
            const userDoc = doc(db, "saves", uid);
            const docSnap = await getDoc(userDoc);
            if (docSnap.exists()) {
                console.log("Game loaded from Firestore");
                return docSnap.data();
            } else {
                console.log("No game data found in Firestore");
                const localData = localStorage.getItem('hss_save_' + uid);
                return localData ? JSON.parse(localData) : null;
            }
        } catch (error) {
            console.error("Error loading from Firestore: ", error);
            const localData = localStorage.getItem('hss_save_' + uid);
            return localData ? JSON.parse(localData) : null;
        }
    }
};

export { DB };
