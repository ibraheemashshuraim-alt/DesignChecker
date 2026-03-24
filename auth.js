// auth.js - Authentication & Profile Management
import { auth, db, googleProvider } from './config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- Global App State ---
window.userAppData = {
    user: null,
    uid: null,
    credits: 0,
    role: 'user',
    geminiKey: localStorage.getItem('user_gemini_key') || ''
};

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app-container');
const mainHeader = document.getElementById('main-header');
const mainLoginBtn = document.getElementById('main-login-btn');

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const profileBtn = document.getElementById('profile-btn');
const dropdown = document.getElementById('profile-dropdown');
const userAvatar = document.getElementById('user-avatar');
const displayName = document.getElementById('display-name');
const displayEmail = document.getElementById('display-email');
const displayRole = document.getElementById('display-role');
const displayCredits = document.getElementById('display-credits');
const geminiInput = document.getElementById('gemini-key');
const saveKeyBtn = document.getElementById('save-key-btn');

let userSnapshotUnsubscribe = null;

// --- Auth Observer ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Global State Update
        window.userAppData.user = user;
        window.userAppData.uid = user.uid;

        // UI Updates: Hide Overlay, Show App
        loginOverlay.style.display = 'none';
        appContainer.style.display = 'flex';
        mainHeader.style.display = 'flex';
        
        loginBtn.style.display = 'none';
        profileBtn.style.display = 'block';
        userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`;
        
        // Sync User Data to Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName || 'Unknown User',
                email: user.email,
                photo: user.photoURL,
                credits: 10,
                role: "user",
                status: "active",
                createdAt: new Date()
            });
        }

        // Real-time listener for UI updates & Globals
        if(userSnapshotUnsubscribe) userSnapshotUnsubscribe();
        userSnapshotUnsubscribe = onSnapshot(userRef, (snapshot) => {
            const data = snapshot.data();
            if (data) {
                // Update Global Context Real-time
                window.userAppData.credits = data.credits || 0;
                window.userAppData.role = data.role || 'user';

                // Update UI visually
                displayName.textContent = data.name || user.displayName || 'User';
                displayEmail.textContent = data.email || user.email;
                displayRole.textContent = data.role === 'admin' ? 'Administrator' : 'Free User';
                displayCredits.textContent = window.userAppData.credits;
            }
        });

        // Load API Key
        geminiInput.value = window.userAppData.geminiKey;

    } else {
        // Global Reset
        window.userAppData.user = null;
        window.userAppData.uid = null;
        if(userSnapshotUnsubscribe) userSnapshotUnsubscribe();

        // Show Login Overlay, Hide App
        loginOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
        mainHeader.style.display = 'none';
        
        loginBtn.style.display = 'flex';
        profileBtn.style.display = 'none';
        dropdown.classList.remove('active');
    }
});

// --- Actions ---
const handleGoogleLogin = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Login failed:", error);
        alert("Google Login failed.");
    }
};

mainLoginBtn.addEventListener('click', handleGoogleLogin);
loginBtn.addEventListener('click', handleGoogleLogin);

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Save API Key logic
saveKeyBtn.addEventListener('click', () => {
    const key = geminiInput.value.trim();
    localStorage.setItem('user_gemini_key', key);
    window.userAppData.geminiKey = key;
    
    saveKeyBtn.innerHTML = '<i class="fas fa-check"></i>';
    saveKeyBtn.style.background = 'var(--accent)';
    setTimeout(() => {
        saveKeyBtn.innerHTML = '<i class="fas fa-save"></i>';
        saveKeyBtn.style.background = '';
    }, 2000);
});
