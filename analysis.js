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
            alert("Please set your Gemini API Key in Settings first.");
            return;
        }

        if (!uid) {
            alert("Please login with Google first!");
            return;
        }

        if (credits <= 0) {
            alert("No Credits! Please top-up to continue.");
            return;
        }

        if (!currentImageBase64) return;

        // UI Reset
        blurryAura.style.display = 'none';
        centerPrompt.style.display = 'none';
        resultsContent.style.display = 'none';
        printBtn.style.display = 'none';
        loadingState.style.display = 'flex';
        statusText.innerText = "DETECTING MODEL...";

        // --- Model Auto-Detection Logic ---
        const testModels = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-pro-vision'];
        let workingModel = null;
        let finalResponseData = null;

        const payload = {
            contents: [{
                parts: [
                    { text: "Analyze this image briefly and evaluate the UI design." },
                    { inline_data: { mime_type: currentMimeType, data: currentImageBase64 } }
                ]
            }]
        };

        try {
            for (const modelName of testModels) {
                try {
                    console.log(`[DEBUG] Attempting Auto-Detection with: ${modelName}`);
                    statusText.innerText = `TRYING ${modelName.toUpperCase()}...`;
                    
                    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                    
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    console.log(`[DEBUG] ${modelName} HTTP Status:`, response.status);
                    const data = await response.json();
                    console.log(`[DEBUG] ${modelName} Response:`, data);

                    if (response.ok && data.candidates) {
                        workingModel = modelName;
                        finalResponseData = data;
                        console.log(`[DEBUG] SUCCESS! Model Locked: ${workingModel}`);
                        break; 
                    }
                } catch (err) {
                    console.error(`[DEBUG] ${modelName} connection error:`, err);
                }
            }

            if (!workingModel) {
                throw new Error("No working Gemini model found. Please check your API Key permissions.");
            }

            // --- Analysis Success Processing ---
            const resultText = finalResponseData.candidates[0].content.parts[0].text;
            
            // Format Output
            let formattedHtml = resultText
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h3>$1</h3>')
                .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
                .replace(/\n/gim, '<br>');

            resultsContent.innerHTML = formattedHtml;

            // Deduct Credit
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, { credits: increment(-1) });

            loadingState.style.display = 'none';
            resultsContent.style.display = 'block';
            printBtn.style.display = 'inline-flex';
            statusText.innerText = `DONE (${workingModel.split('-')[1]})`;

        } catch (error) {
            console.error("Auto-Detection Failed:", error);
            loadingState.style.display = 'none';
            resultsContent.style.display = 'block';
            resultsContent.innerHTML = `
                <div style="background:rgba(239,68,68,0.1); border:1px solid var(--danger); padding:20px; border-radius:12px; text-align:center;">
                    <i class="fas fa-microscope" style="font-size:32px; color:var(--danger); margin-bottom:10px;"></i>
                    <h3 style="color:var(--danger); margin:0;">Detection Failed</h3>
                    <p style="color:#cbd5e1; font-size:13px;">${error.message}</p>
                    <p style="color:#94a3b8; font-size:12px;">Google sent a 404/403 for all models. Check F12 console.</p>
                </div>
            `;
            statusText.innerText = "ERROR";
        }
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });
});
