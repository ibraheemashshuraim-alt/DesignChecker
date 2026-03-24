// auth.js - Authentication & Profile Management
import { auth, db, googleProvider } from './config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const profileBtn = document.getElementById('profile-btn');
const dropdown = document.getElementById('profile-dropdown');
const userAvatar = document.getElementById('user-avatar');
const displayEmail = document.getElementById('display-email');
const displayRole = document.getElementById('display-role');
const displayCredits = document.getElementById('display-credits');
const geminiInput = document.getElementById('gemini-key');
const saveKeyBtn = document.getElementById('save-key-btn');

// --- Auth Observer ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User Login UI
        loginBtn.style.display = 'none';
        profileBtn.style.display = 'block';
        userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`;
        
        // Sync User Data to Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName,
                email: user.email,
                photo: user.photoURL,
                credits: 10,
                role: "user",
                status: "active",
                createdAt: new Date()
            });
        }

        // Real-time listener for UI updates
        onSnapshot(userRef, (snapshot) => {
            const data = snapshot.data();
            if (data) {
                displayEmail.textContent = data.email;
                displayRole.textContent = data.role === 'admin' ? 'Administrator' : 'Free User';
                displayCredits.textContent = data.credits || 0;
            }
        });

        // Load API Key
        geminiInput.value = localStorage.getItem('gemini_api_key') || '';

    } else {
        // User Logout UI
        loginBtn.style.display = 'flex';
        profileBtn.style.display = 'none';
        dropdown.classList.remove('active');
    }
});

// --- Actions ---
loginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Login failed:", error);
        alert("Google Login failed.");
    }
});

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
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        saveKeyBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => saveKeyBtn.innerHTML = '<i class="fas fa-save"></i>', 2000);
    }
});
