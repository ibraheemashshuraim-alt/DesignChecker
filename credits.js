// credits.js - Credit logic as a Module
import { auth, db } from './config.js';
import { doc, updateDoc, increment, setDoc, query, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const SADAPAY_NUMBER = "0300-1234567";
const ADMIN_EMAIL = "abdullah@example.com";

// Elements
const buyCreditsModal = document.getElementById('buy-credits-modal');
const adminPanelModal = document.getElementById('admin-panel-modal');
const adminToolLink = document.querySelector('.admin-only');
const tidInput = document.getElementById('tid-input');
const submitTidBtn = document.getElementById('submit-tid-btn');
const adminUserList = document.getElementById('admin-user-list');

// Show Admin Panel link for authorized users
auth.onAuthStateChanged((user) => {
    if (user && user.email === ADMIN_EMAIL) {
        adminToolLink.style.display = 'block';
    } else {
        adminToolLink.style.display = 'none';
    }
});

// UI Event Handlers
document.querySelectorAll('.dropdown-list a').forEach(link => {
    if (link.textContent.includes('Credits')) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            buyCreditsModal.classList.add('active');
        });
    }
    if (link.textContent.includes('Admin Panel')) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            adminPanelModal.classList.add('active');
            loadAdminPanel();
        });
    }
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        buyCreditsModal.classList.remove('active');
        adminPanelModal.classList.remove('active');
    });
});

// TID Submission
submitTidBtn.addEventListener('click', async () => {
    const tid = tidInput.value.trim();
    if (tid.length < 10) return alert("Valid TID please.");

    const user = auth.currentUser;
    try {
        await updateDoc(doc(db, "users", user.uid), { credits: increment(5) });
        await setDoc(doc(db, "transactions", tid), {
            userId: user.uid,
            tid: tid,
            timestamp: new Date()
        });
        alert("5 Trial Credits added!");
        buyCreditsModal.classList.remove('active');
    } catch (e) { console.error(e); }
});

// Admin Control Panel
function loadAdminPanel() {
    const q = query(collection(db, "users"));
    onSnapshot(q, (snapshot) => {
        adminUserList.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const userId = docSnap.id;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${userData.name || 'User'}</td>
                <td>${userData.email}</td>
                <td>${userData.credits}</td>
                <td>${userData.status}</td>
                <td class="admin-actions">
                    <button class="action-btn approve" data-id="${userId}">+10</button>
                    <button class="action-btn block" data-id="${userId}" data-status="${userData.status}">${userData.status === 'blocked' ? 'Unblock' : 'Block'}</button>
                </td>
            `;
            adminUserList.appendChild(tr);
        });

        // Use event delegation for admin buttons
        adminUserList.querySelectorAll('.action-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.target.dataset.id;
                if (e.target.classList.contains('approve')) {
                    await updateDoc(doc(db, "users", id), { credits: increment(10) });
                } else {
                    const status = e.target.dataset.status === 'blocked' ? 'active' : 'blocked';
                    await updateDoc(doc(db, "users", id), { status });
                }
            };
        });
    });
}

// Copy Number
document.getElementById('copy-number-btn').onclick = () => {
    navigator.clipboard.writeText(SADAPAY_NUMBER);
    alert("Copied!");
};
