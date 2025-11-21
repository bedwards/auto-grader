// Extension popup logic
// Worker URL is hardcoded - no need for user configuration
const WORKER_URL = 'https://classroom-auto-grader.brian-mabry-edwards.workers.dev';

document.addEventListener('DOMContentLoaded', async () => {
    // Load saved settings
    const settings = await chrome.storage.sync.get([
        'aiModel',
        'constructiveFeedback'
    ]);

    if (settings.aiModel) {
        document.getElementById('ai-model').value = settings.aiModel;
    }
    if (settings.constructiveFeedback !== undefined) {
        document.getElementById('constructive-feedback').checked = settings.constructiveFeedback;
    }

    // Save settings button
    document.getElementById('save-settings').addEventListener('click', async () => {
        const newSettings = {
            aiModel: document.getElementById('ai-model').value,
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
