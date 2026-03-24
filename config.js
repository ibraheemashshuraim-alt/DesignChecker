// config.js - Firebase Initialization & Exports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo",
  authDomain: "designcheck-8be9f.firebaseapp.com",
  projectId: "designcheck-8be9f",
  storageBucket: "designcheck-8be9f.firebasestorage.app",
  messagingSenderId: "766391064183",
  appId: "1:766391064183:web:36c6d4368196e3db2bd872",
  measurementId: "G-R8PZGRMJKS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
const analytics = getAnalytics(app);

// Save login state robustly in localStorage (Requested for session persistence)
auth.onAuthStateChanged((user) => {
    if (user) {
        localStorage.setItem('uid', user.uid);
        localStorage.setItem('email', user.email);
        console.log("[CONFIG] Session persisted to localStorage.");
    } else {
        localStorage.removeItem('uid');
        localStorage.removeItem('email');
    }
});

export { app, auth, db, storage, googleProvider, analytics, firebaseConfig };
