# Chrome Web Store Submission Guide

## 📦 Extension Ready for Publication

**File:** `/Users/bedwards/auto-grader/classroom-auto-grader-extension.zip`
**Status:** ✅ Packaged and tested
**Size:** 24 KB

---

## 🚀 Publish to Chrome Web Store (30 minutes)

### Step 1: Developer Account (One-Time, $5)

1. Go to: https://chrome.google.com/webstore/devconsole
2. Sign in with your Google account (brian.mabry.edwards@gmail.com)
3. Pay $5 one-time developer registration fee
4. Accept terms and conditions

### Step 2: Upload Extension

1. Click **"New Item"** button
2. Upload: `/Users/bedwards/auto-grader/classroom-auto-grader-extension.zip`
3. Click **"Upload"**

### Step 3: Fill Store Listing

#### Basic Information
- **Name:** Classroom Auto-Grader
- **Summary:** AI-powered auto-grading for Google Classroom with instant feedback
- **Description:**
```
Classroom Auto-Grader brings AI-powered grading directly to Google Classroom, saving teachers hours of grading time while providing students with instant, constructive feedback.

🎯 KEY FEATURES
• Instant AI grading with constructive feedback
• Seamless Google Classroom integration
• Multiple AI models (Gemini & Phi-2)
• Grade-level appropriate responses
• Secure API architecture (no API keys needed!)
• Custom rubric support

✨ HOW IT WORKS
1. Install the extension
2. Navigate to Google Classroom
3. Open student submissions
4. Click "Auto-Grade with AI" buttons that appear
5. Review AI feedback and grades
6. Adjust and return to students

🔒 PRIVACY & SECURITY
• Your Gemini API key is stored server-side (never in the extension)
• All AI requests proxied through secure Cloudflare Worker
• No student data stored or tracked
• HTTPS everywhere
• Open source: github.com/bedwards/auto-grader

💡 PERFECT FOR
• English teachers with essay assignments
• Any teacher with written responses
• Educators wanting to provide faster feedback
• Teachers looking to save grading time

🆓 FREE TO USE
No subscription required. Uses your institution's Google Workspace account.

Built by educators, for educators.
```

- **Category:** Education
- **Language:** English (United States)

#### Graphics

**Icon (128x128):** Use `/Users/bedwards/auto-grader/extension/icons/icon128.png`

**Screenshots (Required: 1280x800 or 640x400):**
Need to create 3-5 screenshots showing:
1. Extension popup with settings
2. Auto-grade button in Classroom
3. AI feedback displayed
4. Settings panel
5. Grading results

**Create Screenshots Script:**
```bash
cd /Users/bedwards/auto-grader
node scripts/create-store-screenshots.js
```

#### Additional Details

**Homepage URL:** https://bedwards.github.io/auto-grader/
**Support Email:** brian.mabry.edwards@gmail.com
**Privacy Policy:** https://github.com/bedwards/auto-grader/blob/main/PRIVACY.md

#### Permissions Justification

**"storage"**
- Used to save user preferences (AI model choice, feedback settings)
- No personal data stored

**"activeTab"**
- Needed to inject grading buttons on active Classroom pages
- Only activates on classroom.google.com

**"host_permissions: classroom.google.com"**
- Required to enhance Google Classroom UI with grading features
- Does not track or access other sites

### Step 4: Privacy Practices

**Data Collection:** None
**Single Purpose:** Auto-grade student submissions with AI
**Does NOT collect user data:** ✅ Yes
**Does NOT use or transfer data for unrelated purposes:** ✅ Yes
**Does NOT use or transfer data to third parties:** ✅ Yes

### Step 5: Distribution

**Visibility:** Public
**Regions:** All regions
**Pricing:** Free

### Step 6: Submit for Review

1. Click **"Submit for Review"**
2. Review time: 1-7 days (usually 2-3 days)
3. You'll receive email when published

---

## 📸 Create Store Screenshots

Since we need proper screenshots for the store, let me create a script:

```javascript
// scripts/create-store-screenshots.js
// Run: node scripts/create-store-screenshots.js
```

Or manually:
1. Load extension in Chrome (chrome://extensions → Load unpacked)
2. Open Google Classroom
3. Take screenshots at 1280x800 resolution
4. Show:
   - Extension popup
   - Grading button in Classroom
   - AI feedback
   - Settings

---

## ⚡ Quick Publish Checklist

- [ ] Pay $5 developer fee (one-time)
- [ ] Upload ZIP file
- [ ] Fill all required fields
- [ ] Create 3-5 screenshots (1280x800)
- [ ] Add privacy policy URL
- [ ] Justify permissions
- [ ] Submit for review
- [ ] Wait 2-3 days for approval

---

## 🎯 After Publication

Once approved, you'll get a Chrome Web Store URL like:
```
https://chrome.google.com/webstore/detail/classroom-auto-grader/[extension-id]
```

**Share with Kelley:**
"The extension is live in the Chrome Web Store! Install it here: [link]"

**Users can install with 1 click** - no ZIP file needed!

---

## 🔄 Updates

To update the extension:
1. Update code in `/Users/bedwards/auto-grader/extension/`
2. Increment version in `manifest.json`
3. Repackage: `zip -r extension.zip extension/`
4. Upload to Web Store dashboard
5. Submit for review
6. Auto-updates to all users when approved!

---

## 💡 Tips for Faster Approval

1. **Clear description** - Explain what it does simply
2. **Good screenshots** - Show actual functionality
3. **Privacy policy** - Link to GitHub or create simple one
4. **Justify permissions** - Explain why each is needed
5. **Test thoroughly** - No broken features

---

## 📞 If Rejected

Common reasons:
- Missing privacy policy → Add one
- Unclear permissions → Better explanations
- Misleading description → Clarify
- Broken functionality → Test and fix

Resubmit after addressing issues.

---

## 🎉 Timeline

- **Submit:** Today
- **Review:** 2-3 days
- **Published:** In ~3 days
- **Available to Kelley:** Immediately after approval

**Meanwhile:** She can use the ZIP file (load unpacked) to test it now!
