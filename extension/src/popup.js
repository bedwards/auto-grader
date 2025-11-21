// Extension popup logic
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved settings
    const settings = await chrome.storage.sync.get([
        'workerUrl',
        'geminiKey',
        'useGemini',
        'usePhi2',
        'constructiveFeedback'
    ]);

    if (settings.workerUrl) {
        document.getElementById('worker-url').value = settings.workerUrl;
    }
    if (settings.geminiKey) {
        document.getElementById('gemini-key').value = settings.geminiKey;
    }
    if (settings.useGemini !== undefined) {
        document.getElementById('use-gemini').checked = settings.useGemini;
    }
    if (settings.usePhi2 !== undefined) {
        document.getElementById('use-phi2').checked = settings.usePhi2;
    }
    if (settings.constructiveFeedback !== undefined) {
        document.getElementById('constructive-feedback').checked = settings.constructiveFeedback;
    }

    // Save settings button
    document.getElementById('save-settings').addEventListener('click', async () => {
        const newSettings = {
            workerUrl: document.getElementById('worker-url').value,
            geminiKey: document.getElementById('gemini-key').value,
            useGemini: document.getElementById('use-gemini').checked,
            usePhi2: document.getElementById('use-phi2').checked,
            constructiveFeedback: document.getElementById('constructive-feedback').checked
        };

        await chrome.storage.sync.set(newSettings);
        showStatus('Settings saved successfully!', 'success');
    });

    // Grade current page button
    document.getElementById('grade-current').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('classroom.google.com')) {
            showStatus('Please navigate to Google Classroom first', 'error');
            return;
        }

        showStatus('Initiating grading...', 'info');
        
        chrome.tabs.sendMessage(tab.id, { action: 'startGrading' }, (response) => {
            if (chrome.runtime.lastError) {
                showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            if (response && response.success) {
                showStatus('Grading completed!', 'success');
            } else {
                showStatus('Grading failed: ' + (response?.error || 'Unknown error'), 'error');
            }
        });
    });

    // Open dashboard link
    document.getElementById('open-dashboard').addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://bedwards.github.io/auto-grader/' });
    });
});

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
}
