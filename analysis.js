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

    // Load saved API key
    const savedApiKey = localStorage.getItem('user_gemini_key') || localStorage.getItem('gemini-api-key');
    if(savedApiKey) {
        apiSettingInput.value = savedApiKey;
    }

    saveKeyBtn.addEventListener('click', () => {
        if(apiSettingInput.value.trim()) {
            localStorage.setItem('user_gemini_key', apiSettingInput.value.trim());
            saveKeyBtn.innerHTML = '<i class="fas fa-check"></i>';
            saveKeyBtn.style.color = 'var(--accent)';
        }
    });

    const getApiKey = () => {
        return window.userAppData?.geminiKey || localStorage.getItem('user_gemini_key') || firebaseConfig.apiKey;
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
        const uid = localStorage.getItem('uid') || window.userAppData?.uid;
        const credits = window.userAppData?.credits || 0;

        if (!apiKey || apiKey === 'YOUR_DEFAULT_KEY') {
            alert("No API Key! Set your Gemini Key in profile.");
            return;
        }

        if (!uid) {
            alert("Please login with Google!");
            return;
        }

        if (credits <= 0) {
            alert("No credits left!");
            return;
        }

        if (!currentImageBase64) return;

        // UI Reset
        blurryAura.style.display = 'none';
        centerPrompt.style.display = 'none';
        resultsContent.style.display = 'none';
        printBtn.style.display = 'none';
        loadingState.style.display = 'flex';
        statusText.innerText = "INITIALIZING DETECTION...";

        // --- Strategic Raw Fetch (v1 then v1beta Fallback) ---
        const strategies = [
            { 
                tag: 'v1 STABLE',
                url: `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                model: 'gemini-1.5-flash'
            },
            { 
                tag: 'v1BETA LATEST',
                url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
                model: 'gemini-1.5-flash-latest'
            }
        ];

        let finalData = null;
        let usedStrategy = null;

        const payload = {
            contents: [{
                parts: [
                    { text: "Analyze this image for UI design improvements, color balance, and typography." },
                    { 
                        inline_data: { 
                            mime_type: currentMimeType, 
                            data: currentImageBase64 
                        } 
                    }
                ]
            }]
        };

        try {
            for (const strat of strategies) {
                try {
                    console.log(`[STRATEGY] Trying: ${strat.tag} (${strat.model})...`);
                    statusText.innerText = `TRYING ${strat.tag}...`;

                    const response = await fetch(strat.url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    console.log(`[STRATEGY] HTTP STATUS:`, response.status);
                    const data = await response.json();
                    console.log(`[STRATEGY] FULL JSON:`, data);

                    if (response.ok && data.candidates) {
                        finalData = data;
                        usedStrategy = strat;
                        console.log(`[SUCCESS] Locked on ${strat.tag}`);
                        break; 
                    }
                } catch (e) {
                    console.error(`[STRATEGY] ${strat.tag} Error:`, e);
                }
            }

            if (!finalData) {
                throw new Error("Both v1 and v1beta endpoints failed. Check your API Key permissions.");
            }

            // Results UI
            const markdown = finalData.candidates[0].content.parts[0].text;
            let html = markdown
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h3>$1</h3>')
                .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
                .replace(/\n/gim, '<br>');

            resultsContent.innerHTML = html;

            // Credit Deduction
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, { credits: increment(-1) });

            loadingState.style.display = 'none';
            resultsContent.style.display = 'block';
            printBtn.style.display = 'inline-flex';
            statusText.innerText = `DONE [${usedStrategy.tag}]`;

        } catch (error) {
            console.error("ANALYSIS MASTER FAIL:", error);
            loadingState.style.display = 'none';
            resultsContent.style.display = 'block';
            resultsContent.innerHTML = `
                <div style="background:rgba(239,68,68,0.1); border:1px solid var(--danger); padding:20px; border-radius:12px; text-align:center;">
                    <i class="fas fa-exclamation-circle" style="font-size:32px; color:var(--danger); margin-bottom:10px;"></i>
                    <h3 style="color:var(--danger); margin:0;">Analysis Failed</h3>
                    <p style="color:#cbd5e1; font-size:13px;">${error.message}</p>
                    <p style="color:#94a3b8; font-size:12px;">Try again with a fresh API Key.</p>
                </div>
            `;
            statusText.innerText = "CRITICAL ERROR";
        }
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });
});
