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

    // Load saved API key
    if(localStorage.getItem('gemini-api-key')) {
        apiSettingInput.value = localStorage.getItem('gemini-api-key');
    }

    saveKeyBtn.addEventListener('click', () => {
        if(apiSettingInput.value.trim()) {
            localStorage.setItem('gemini-api-key', apiSettingInput.value.trim());
            alert('API Key saved successfully!');
        }
    });

    const getApiKey = () => {
        const savedKey = localStorage.getItem('gemini-api-key') || apiSettingInput.value.trim();
        // Fallback default API key (placeholder for demonstration, strictly require actual key for production)
        return savedKey || 'YOUR_GEMINI_API_KEY_HERE'; 
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
        // Strictly use gemini-1.5-flash and v1beta version
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const promptText = `You are an expert UI/UX designer and Accessibility specialist.
Analyze the provided design image thoroughly.
Provide the response in clean Markdown format with headings. MUST include:
### 1. Overall Design Score
Give a score out of 10 for the overall design.
### 2. Visual Hierarchy & Layout
How well the elements are arranged and balanced.
### 3. Typography
Readability, font choices, and hierarchy.
### 4. Accessibility Audit
Check if font sizes and elements are clear and accessible for everyone. 
### 5. Color Contrast Ratio
Detailed analysis of color balance and specific contrast ratios for text vs background.`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: currentMimeType, data: currentImageBase64 } }
                ]
            }],
            generationConfig: { temperature: 0.4 }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API Error ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
            
            // Format markdown to HTML
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
            resultsContent.innerHTML = `<h3 style="color:var(--danger)">Analysis Error</h3><p>${error.message}</p><p>Please check your API key from API Settings.</p>`;
            statusText.innerText = "ANALYSIS FAILED";
        }
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });
});
