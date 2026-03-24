// analysis.js - Gemini API and Design Analysis logic

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
        // Explicit logic enforcing priority as requested
        return localStorage.getItem('user_gemini_key') || localStorage.getItem('gemini-api-key') || apiSettingInput.value.trim() || 'YOUR_DEFAULT_KEY'; 
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
        if (!currentImageBase64) return;
        
        blurryAura.style.display = 'none';
        centerPrompt.style.display = 'none';
        resultsContent.style.display = 'none';
        printBtn.style.display = 'none';
        
        loadingState.style.display = 'flex';
        statusText.innerText = "ANALYSING DESIGN...";
        
        const apiKey = getApiKey();
        
        const promptText = `You are an expert UI/UX designer and Accessibility specialist.
Analyze the provided design image thoroughly.
Provide the response in clean Markdown format with headings. MUST explicitly include:
### 1. Overall Design Score
Give a score out of 10 for the overall design layout and feel.
### 2. Visual Hierarchy & Layout
How well the elements are arranged and balanced.
### 3. Typography
Readability, font choices, and textual hierarchy.
### 4. Accessibility Check
Analyse the font size and clarity of elements for all users, including those with visual impairments. 
### 5. Color Contrast
Detailed analysis of the color palette, visual balance, and contrast ratios for text vs background.`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: currentMimeType, data: currentImageBase64 } }
                ]
            }],
            generationConfig: { temperature: 0.4 }
        };

        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash-8b',
            'gemini-1.5-pro',
            'gemini-1.5-pro-latest',
            'gemini-pro-vision'
        ];

        let response = null;
        let success = false;
        let lastError = null;

        try {
            // Fallback Logic: Try 1.5-flash, then 1.5-flash-8b
            for (const model of modelsToTry) {
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    success = true;
                    break; // Request succeeded, exit fallback loop
                } else {
                    const errorData = await response.json();
                    lastError = new Error(errorData.error?.message || `API Error ${response.status} with model ${model}`);
                }
            }

            if (!success) {
                throw lastError || new Error("All model fallback attempts failed.");
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
            
            // Format markdown to HTML properly
            let formattedHtml = rawText
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h3>$1</h3>')
                .replace(/^\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
                .replace(/^\* (.*$)/gim, '<li>$1</li>')
                .replace(/\n\n/gim, '<br><br>')
                .replace(/\n/gim, '<br>');

            resultsContent.innerHTML = formattedHtml;
            
            loadingState.style.display = 'none';
            resultsContent.style.display = 'block';
            printBtn.style.display = 'inline-flex';
            statusText.innerText = "ANALYSIS COMPLETE";

        } catch (error) {
            console.error('Analysis failed:', error);
            loadingState.style.display = 'none';
            resultsContent.style.display = 'block';
            
            // Beautiful on-screen Error Message instead of alert
            resultsContent.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 25px; border-radius: 12px; text-align: center; margin-top: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: var(--danger); margin-bottom: 15px;"></i>
                    <h3 style="color: var(--danger); margin: 0 0 10px 0; border: none; font-size: 20px;">Analysis Failed</h3>
                    <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 15px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">${error.message}</p>
                    <p style="color: #94a3b8; font-size: 13px;">Please verify your API Key in Settings or check your internet connection.</p>
                </div>
            `;
            statusText.innerText = "ANALYSIS ERROR";
        }
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });
});
