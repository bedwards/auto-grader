// Content script that runs on Google Classroom pages
console.log('Classroom Auto-Grader extension loaded');

// Add grading buttons to submissions page
function injectGradingButtons() {
    // Check if we're on a student submission page
    const submissionItems = document.querySelectorAll('[data-submission-id]');
    
    submissionItems.forEach(item => {
        // Skip if button already exists
        if (item.querySelector('.auto-grade-btn')) return;
        
        const button = document.createElement('button');
        button.className = 'auto-grade-btn';
        button.textContent = 'Auto-Grade with AI';
        button.style.cssText = `
            background-color: #1a73e8;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            margin: 5px;
            cursor: pointer;
            font-size: 13px;
        `;
        
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await gradeSubmission(item);
        });
        
        item.appendChild(button);
    });
}

// Grade a single submission
async function gradeSubmission(submissionElement) {
    const submissionId = submissionElement.getAttribute('data-submission-id');
    
    if (!submissionId) {
        alert('Could not identify submission');
        return;
    }

    // Get settings from storage
    const settings = await chrome.storage.sync.get([
        'workerUrl',
        'geminiKey',
        'useGemini',
        'usePhi2',
        'constructiveFeedback'
    ]);

    // Extract submission content
    const submissionText = extractSubmissionContent(submissionElement);
    
    if (!submissionText) {
        alert('No submission content found');
        return;
    }

    // Show loading indicator
    const originalText = submissionElement.textContent;
    submissionElement.style.opacity = '0.5';

    try {
        // Call grading API
        const result = await performGrading(submissionText, settings);
        
        // Display result
        displayGradingResult(submissionElement, result);
        
    } catch (error) {
        console.error('Grading error:', error);
        alert('Failed to grade submission: ' + error.message);
    } finally {
        submissionElement.style.opacity = '1';
    }
}

function extractSubmissionContent(element) {
    // Try to find submission text in various possible locations
    const textAreas = element.querySelectorAll('textarea, [contenteditable="true"]');
    const paragraphs = element.querySelectorAll('p, div.submission-text');
    
    let content = '';
    
    textAreas.forEach(ta => {
        content += ta.value || ta.textContent || '';
    });
    
    if (!content) {
        paragraphs.forEach(p => {
            content += p.textContent || '';
        });
    }
    
    return content.trim();
}

async function performGrading(submissionText, settings) {
    // Simple grading logic - in production, this would call the Cloudflare Worker
    const prompt = `Grade this student submission and provide constructive feedback:\n\n${submissionText}`;
    
    let result = { grade: null, feedback: '' };
    
    // Try Gemini if enabled
    if (settings.useGemini && settings.geminiKey) {
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': settings.geminiKey
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const text = data.candidates[0]?.content?.parts[0]?.text || '';
                result = parseGradingResponse(text);
            }
        } catch (error) {
            console.error('Gemini error:', error);
        }
    }
    
    // Fallback to Phi-2
    if (!result.grade && settings.usePhi2 && settings.workerUrl) {
        try {
            const response = await fetch(`${settings.workerUrl}/grade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    model: '@cf/microsoft/phi-2'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                result = parseGradingResponse(data.response);
            }
        } catch (error) {
            console.error('Phi-2 error:', error);
        }
    }
    
    return result;
}

function parseGradingResponse(text) {
    const gradeMatch = text.match(/GRADE:\s*(\d+(?:\.\d+)?)/i);
    const feedbackMatch = text.match(/FEEDBACK:\s*([\s\S]+)/i);
    
    return {
        grade: gradeMatch ? parseFloat(gradeMatch[1]) : null,
        feedback: feedbackMatch ? feedbackMatch[1].trim() : ''
    };
}

function displayGradingResult(element, result) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'auto-grader-result';
    resultDiv.style.cssText = `
        background-color: #e8f0fe;
        border: 1px solid #1a73e8;
        border-radius: 4px;
        padding: 12px;
        margin: 10px 0;
    `;
    
    resultDiv.innerHTML = `
        <strong>AI Grading Result</strong><br>
        <strong>Grade:</strong> ${result.grade || 'N/A'}<br>
        <strong>Feedback:</strong> ${result.feedback || 'No feedback generated'}
    `;
    
    element.appendChild(resultDiv);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startGrading') {
        // Trigger grading for visible submissions
        const submissions = document.querySelectorAll('[data-submission-id]');
        
        if (submissions.length === 0) {
            sendResponse({ success: false, error: 'No submissions found on this page' });
            return;
        }
        
        // Grade first submission as example
        gradeSubmission(submissions[0])
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        
        return true; // Keep channel open for async response
    }
});

// Inject buttons when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectGradingButtons);
} else {
    injectGradingButtons();
}

// Re-inject when navigating (Classroom is a SPA)
const observer = new MutationObserver(() => {
    injectGradingButtons();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
