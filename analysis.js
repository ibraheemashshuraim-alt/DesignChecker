// analysis.js - Gemini API and Design Analysis logic
import { firebaseConfig, db } from './config.js';
import { doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('trigger-upload-btn');
    const fileInput = document.getElementById('design-upload');
    const uploadState = document.getElementById('upload-state');
    const previewState = document.getElementById('preview-state');
    const imagePreview = document.getElementById('image-preview');
    const changeImageBtn = document.getElementById('change-image-btn');
    const analyseBtn = document.getElementById('start-analysis-btn');
    
    const blurryAura = document.getElementById('blurry-aura');
    const centerPrompt = document.getElementById('center-prompt');
    const loadingState = document.getElementById('loading-state');
    const resultsContent = document.getElementById('results-content');
    const statusText = document.getElementById('status-text');
    const printBtn = document.getElementById('print-report-btn');
    const apiSettingInput = document.getElementById('gemini-key');
    const saveKeyBtn = document.getElementById('save-key-btn');
    
    let currentImageBase64 = null;
    let currentMimeType = null;

    // Load saved API key (Prioritize 'user_gemini_key')
    const savedApiKey = localStorage.getItem('user_gemini_key') || localStorage.getItem('gemini-api-key');
    if(savedApiKey) {
        apiSettingInput.value = savedApiKey;
    }

    saveKeyBtn.addEventListener('click', () => {
        if(apiSettingInput.value.trim()) {
            localStorage.setItem('user_gemini_key', apiSettingInput.value.trim());
            
            // Beautiful UI Feedback instead of alert
            const originalText = saveKeyBtn.innerHTML;
            saveKeyBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
            saveKeyBtn.style.background = 'var(--accent)';
            setTimeout(() => {
                saveKeyBtn.innerHTML = originalText;
                saveKeyBtn.style.background = '';
            }, 2000);
        }
    });

    const getApiKey = () => {
        // Enforce priority: Saved Key -> Firebase API Key
        // using window.userAppData for robust global state tracking
        return window.userAppData?.geminiKey || firebaseConfig.apiKey; 
    };

    uploadBtn.addEventListener('click', () => fileInput.click());
    changeImageBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                currentImageBase64 = event.target.result.split(',')[1];
                currentMimeType = file.type;
                
                uploadState.style.display = 'none';
                previewState.style.display = 'flex';
                statusText.innerText = "READY FOR ANALYSIS";
            };
            reader.readAsDataURL(file);
        }
    });

    analyseBtn.addEventListener('click', async () => {
        const apiKey = getApiKey();
        
        // 1. "Wait" Logic: Check for API Key
        if (!apiKey || apiKey === 'YOUR_DEFAULT_KEY') {
            resultsContent.innerHTML = `<div style="background:rgba(239,68,68,0.1); border:1px solid var(--danger); padding:20px; border-radius:12px; text-align:center;">
                <i class="fas fa-key" style="font-size:32px; color:var(--danger); margin-bottom:10px;"></i>
                <h3 style="color:var(--danger); margin:0;">API Key Missing</h3>
                <p style="color:#cbd5e1; font-size:14px;">Please set your <b>Gemini API Key</b> in the Settings or Profiles menu first.</p>
            </div>`;
            statusText.innerText = "CONFIG ERROR";
            return;
        }

        // 2. Firebase Dependency: Check User & Credits
        if (!window.userAppData || !window.userAppData.user) {
            alert("Authentication is loading... Please wait or re-login.");
            return;
        }

        if (window.userAppData.credits <= 0) {
            alert("Insufficient Credits! Please top-up to continue analysis.");
            return;
        }

        if (!currentImageBase64) return;

        // UI Reset
        blurryAura.style.display = 'none';
        centerPrompt.style.display = 'none';
        resultsContent.style.display = 'none';
        printBtn.style.display = 'none';
        loadingState.style.display = 'flex';
        statusText.innerText = "ANALYSING...";

        // 3. Direct Fetch Call using the requested URL
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const promptText = `You are an expert UI/UX designer and Accessibility specialist.
Analyze the provided design image thoroughly. Give a score out of 10.
MUST include:
### 1. Overall Score
### 2. Accessibility Check (Font size & Clarity)
### 3. Color Contrast (Palette & Visual Balance)`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: currentMimeType, data: currentImageBase64 } }
                ]
            }]
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
            
            // Format Markdown -> HTML
            let formattedHtml = rawText
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h3>$1</h3>')
                .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
                .replace(/^\* (.*$)/gim, '<li>$1</li>')
                .replace(/\n/gim, '<br>');

            resultsContent.innerHTML = formattedHtml;
            
            // Deduct Credit
            if (window.userAppData.uid) {
                const userRef = doc(db, "users", window.userAppData.uid);
                await updateDoc(userRef, { credits: increment(-1) });
            }
            
            loadingState.style.display = 'none';
            resultsContent.style.display = 'block';
            printBtn.style.display = 'inline-flex';
            statusText.innerText = "DONE";

        } catch (error) {
            console.error('Fetch Error:', error);
            loadingState.style.display = 'none';
            resultsContent.style.display = 'block';
            resultsContent.innerHTML = `
                <div style="background:rgba(239,68,68,0.1); border:1px solid var(--danger); padding:20px; border-radius:12px; text-align:center;">
                    <i class="fas fa-bolt" style="font-size:32px; color:var(--danger); margin-bottom:10px;"></i>
                    <h3 style="color:var(--danger); margin:0;">Analysis Failed</h3>
                    <p style="color:#cbd5e1; font-size:13px;">${error.message}</p>
                    <p style="color:#94a3b8; font-size:12px;">Ensure your API key is correct and valid for Gemini 1.5 Flash.</p>
                </div>
            `;
            statusText.innerText = "ERROR";
        }
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });
});
