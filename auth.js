// auth.js - Firebase Authentication & Profile Management
const firebaseConfig = {
    apiKey: "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo",
    authDomain: "designcheck-8be9f.firebaseapp.com",
    projectId: "designcheck-8be9f",
    storageBucket: "designcheck-8be9f.firebasestorage.app",
    messagingSenderId: "766391064183",
    appId: "1:766391064183:web:36c6d4368196e3db2bd872",
    measurementId: "G-R8PZGRMJKS"
};

// Initialize Firebase using the globally exported methods from index.html
const { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = window.firebase;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const profileBtn = document.getElementById('profile-btn');
const dropdown = document.getElementById('profile-dropdown');
const userAvatar = document.getElementById('user-avatar');
const displayEmail = document.getElementById('display-email');
const geminiInput = document.getElementById('gemini-key');
const saveKeyBtn = document.getElementById('save-key-btn');

// --- Auth Logic ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        loginBtn.style.display = 'none';
        profileBtn.style.display = 'block';
        userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`;
        displayEmail.textContent = user.email;
        displayEmail.title = user.email; // Tooltip for full email
        
        // Load saved API Key
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) geminiInput.value = savedKey;

    } else {
        // User is signed out
        loginBtn.style.display = 'flex';
        profileBtn.style.display = 'none';
        dropdown.classList.remove('active');
    }
});

loginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login failed:", error);
        alert("Login failed. Please try again.");
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- UI Logic ---
profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !profileBtn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// --- API Settings Logic ---
saveKeyBtn.addEventListener('click', () => {
    const key = geminiInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        saveKeyBtn.innerHTML = '<i class="fas fa-check"></i>';
        saveKeyBtn.style.background = 'var(--accent)';
        setTimeout(() => {
            saveKeyBtn.innerHTML = '<i class="fas fa-save"></i>';
            saveKeyBtn.style.background = 'var(--primary)';
        }, 2000);
    } else {
        alert("Please enter a valid API key.");
    }
});
