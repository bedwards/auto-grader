# Chrome Extension Deployment Guide

## ✅ What's Been Done

### 1. Secure API Key Architecture
- **Worker Proxy**: Added `/gemini` endpoint to Cloudflare Worker
- **Server-side Secret**: Gemini API key stored as Cloudflare Worker secret (NOT in extension code)
- **No User Configuration**: Extension now hardcodes worker URL - users don't need API keys

### 2. Extension Updates
- **Removed API Key Input**: Users no longer prompted for Gemini API key
- **Simplified Settings**: Only AI model selection (Gemini vs Phi-2) and feedback preferences
- **Worker Integration**: All AI requests go through your Cloudflare Worker

### 3. Files Modified
- `worker/src/index.js` - Added `/gemini` proxy endpoint
- `extension/src/popup.html` - Removed API key input field
- `extension/src/popup.js` - Removed API key storage, hardcoded worker URL
- `extension/src/content.js` - Updated to call worker proxy instead of Gemini directly

## 🔑 API Key Status

The Gemini API key from `.env` appears to be **expired or invalid**. You need to:

1. Get a new API key from https://ai.google.dev/
2. Update the Cloudflare Worker secret:
   ```bash
   echo "YOUR_NEW_KEY" | npx wrangler secret put GEMINI_API_KEY
   ```

## 🧪 Testing the Worker

Once you have a valid API key, test the endpoints:

### Test Gemini Proxy
```bash
curl -X POST https://classroom-auto-grader.brian-mabry-edwards.workers.dev/gemini \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 2+2?", "systemPrompt": "You are a helpful teacher."}'
```

Expected response:
```json
{
  "success": true,
  "response": "2 + 2 = 4",
  "model": "gemini-1.5-pro-latest"
}
```

### Test Phi-2 (Should Work Now)
```bash
curl -X POST https://classroom-auto-grader.brian-mabry-edwards.workers.dev/grade \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 2+2?"}'
```

## 📦 Packaging the Extension

### Option 1: Quick Test (Load Unpacked)
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `/Users/bedwards/auto-grader/extension` directory

### Option 2: Package for Distribution
```bash
cd /Users/bedwards/auto-grader
zip -r classroom-auto-grader-extension.zip extension/ -x "*.DS_Store"
```

## 🚀 Publishing to Chrome Web Store

### Prerequisites
- Google account with Chrome Web Store Developer access ($5 one-time fee)
- Privacy policy URL (can use GitHub repo)
- Extension icons (already created at `/extension/icons/`)
- Screenshots of extension in use

### Steps
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item"
3. Upload `classroom-auto-grader-extension.zip`
4. Fill in:
   - **Name**: Classroom Auto-Grader
   - **Description**: AI-powered auto-grading for Google Classroom. Uses Gemini AI to provide instant, constructive feedback on student submissions.
   - **Category**: Education
   - **Language**: English
   - **Privacy Policy**: https://github.com/bedwards/auto-grader
   - **Single Purpose**: Auto-grade student submissions with AI
   - **Permissions Justification**:
     - `storage`: Save user preferences (AI model choice)
     - `activeTab`: Inject grading buttons on Classroom pages
     - `host_permissions` (classroom.google.com): Required to enhance Classroom UI
5. Upload screenshots (create these by loading extension and using it)
6. Submit for review (typically 1-7 days)

## 🔒 Security Notes

### What's Secure
✅ API key never exposed to users
✅ All AI requests go through your worker
✅ Worker URL is public but API key is server-side secret
✅ CORS properly configured
✅ No sensitive data in extension code

### What to Monitor
⚠️ Worker usage/costs (Cloudflare free tier is generous)
⚠️ Gemini API quotas and costs
⚠️ Rate limiting (not yet implemented)

### Recommended: Add Rate Limiting
To prevent abuse, consider adding rate limiting to your worker:

```javascript
// In worker/src/index.js
const RATE_LIMIT = 100; // requests per hour per IP
const rateLimitStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 3600000; // 1 hour
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }
  
  const requests = rateLimitStore.get(ip).filter(t => t > windowStart);
  
  if (requests.length >= RATE_LIMIT) {
    return false;
  }
  
  requests.push(now);
  rateLimitStore.set(ip, requests);
  return true;
}
```

## 📱 User Experience

### What Users Will Do
1. Install extension from Chrome Web Store
2. Navigate to Google Classroom
3. Open popup, select AI model preference (Gemini or Phi-2)
4. Click grading buttons that appear on student submissions
5. Receive instant AI feedback

### What Users Won't Do
❌ Configure API keys
❌ Set up worker URLs
❌ Deal with authentication errors

## 🐛 Troubleshooting

### Extension Not Working
1. Check that worker is deployed: `curl https://classroom-auto-grader.brian-mabry-edwards.workers.dev/health`
2. Check browser console for errors
3. Verify extension has permissions for classroom.google.com

### Gemini Endpoint Failing
1. Verify API key is valid: Visit https://ai.google.dev/
2. Check worker logs: `npx wrangler tail`
3. Test endpoint directly (see Testing section above)

### No Grading Buttons Appearing
1. Ensure you're on a Google Classroom page with submissions
2. Check content script loaded (console should show "Classroom Auto-Grader extension loaded")
3. Try refreshing the page

## 📊 Next Steps

1. **Get Valid Gemini API Key** (REQUIRED)
   - Visit https://ai.google.dev/
   - Create new API key
   - Run: `echo "YOUR_KEY" | npx wrangler secret put GEMINI_API_KEY`

2. **Test Worker Endpoints** (REQUIRED)
   - Test `/gemini` endpoint
   - Test `/grade` endpoint (Phi-2)
   - Verify error handling

3. **Test Extension Locally** (REQUIRED)
   - Load unpacked extension
   - Test on Google Classroom
   - Verify grading works end-to-end

4. **Create Screenshots** (For Chrome Web Store)
   - Extension popup
   - Grading button in Classroom
   - AI feedback display

5. **Publish to Chrome Web Store** (Optional but Recommended)
   - Creates better user experience
   - Automatic updates
   - Easier installation

## 🎉 Summary

The extension is now configured to use **your Gemini API key securely** without exposing it to users. The architecture is:

```
User → Extension → Cloudflare Worker → Gemini API
                        ↓
                  (API Key Secret)
```

Once you update the Gemini API key, everything should work perfectly!
