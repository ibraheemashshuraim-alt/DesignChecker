// credits.js - Credit logic as a Module
import { auth, db } from './config.js';
import { doc, updateDoc, increment, setDoc, query, collection, onSnapshot, where } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const SADAPAY_NUMBER = "0300-1234567";
const ADMIN_EMAIL = "abdullah@example.com";

// Elements
const buyCreditsModal = document.getElementById('buy-credits-modal');
const adminPanelModal = document.getElementById('admin-panel-modal');
const adminToolLink = document.querySelector('.admin-only');
const tidInput = document.getElementById('tid-input');
const submitTidBtn = document.getElementById('submit-tid-btn');
const adminUserList = document.getElementById('admin-user-list');

// Granular UI Control for Admin Panel link
auth.onAuthStateChanged((user) => {
    if (user && (user.email === ADMIN_EMAIL || window.userAppData.role === 'admin')) {
        adminToolLink.style.display = 'block';
    } else {
        adminToolLink.style.display = 'none';
    }
});

// UI Event Handlers
document.querySelectorAll('.dropdown-list li a').forEach(link => {
    link.addEventListener('click', (e) => {
        const text = e.currentTarget.innerText.toLowerCase();
        if (text.includes('credits')) {
            e.preventDefault();
            buyCreditsModal.classList.add('active');
        }
        if (text.includes('admin panel')) {
            e.preventDefault();
            adminPanelModal.classList.add('active');
            loadAdminPanel();
        }
    });
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
    if (tid.length < 10) return alert("Please enter a valid Transaction ID.");

    if(!window.userAppData.uid) return alert("User session lost. Please re-login.");

    try {
        const userRef = doc(db, "users", window.userAppData.uid);
        // We update the user doc, auth.js onSnapshot will refresh UI automatically
        await updateDoc(userRef, { credits: increment(5) });
        
        await setDoc(doc(db, "transactions", tid), {
            userId: window.userAppData.uid,
            tid: tid,
            timestamp: new Date(),
            amount: 5
        });
        
        alert("Credit request submitted! 5 Trial Credits added.");
        buyCreditsModal.classList.remove('active');
        tidInput.value = "";
    } catch (e) { 
        console.error("Purchase failed:", e);
        alert("Transaction failed. Check console.");
    }
});

// Admin Control Panel
function loadAdminPanel() {
    // Show only active users for the table
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
                <td style="color:var(--primary); font-weight:700;">${userData.credits}</td>
                <td><span class="status-badge ${userData.status === 'blocked' ? 'status-blocked' : 'status-active'}">${userData.status || 'active'}</span></td>
                <td class="admin-actions">
                    <button class="action-btn approve" data-id="${userId}" title="Add 10 Credits"><i class="fas fa-plus"></i> 10</button>
                    <button class="action-btn block" data-id="${userId}" data-status="${userData.status}">${userData.status === 'blocked' ? 'Unblock' : 'Block'}</button>
                </td>
            `;
            adminUserList.appendChild(tr);
        });

        // Event delegation logic
        adminUserList.querySelectorAll('.action-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const target = e.currentTarget;
                const id = target.dataset.id;
                const userRef = doc(db, "users", id);

                if (target.classList.contains('approve')) {
                    await updateDoc(userRef, { credits: increment(10) });
                } else {
                    const currentStatus = target.dataset.status;
                    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
                    await updateDoc(userRef, { status: newStatus });
                }
            };
        });
    });
}

// Copy Number Helper
document.getElementById('copy-number-btn').onclick = () => {
    navigator.clipboard.writeText(SADAPAY_NUMBER);
    const btn = document.getElementById('copy-number-btn');
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => btn.innerHTML = '<i class="far fa-copy"></i>', 1500);
};
