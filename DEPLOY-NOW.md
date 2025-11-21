# 🚀 DEPLOY CLASSROOM ADD-ON NOW - Step by Step

## Quick Deploy (15 minutes)

### Step 1: Authenticate with Google Cloud (2 minutes)

Open your terminal and run:

```bash
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"
gcloud auth login
```

This will open your browser - sign in with your Google account.

### Step 2: Create or Select Project (3 minutes)

```bash
# List existing projects
gcloud projects list

# OR create a new one
gcloud projects create classroom-auto-grader-$(date +%s) --name="Classroom Auto-Grader"

# Set the project (use YOUR project ID from above)
gcloud config set project YOUR_PROJECT_ID_HERE
```

### Step 3: Enable Required APIs (2 minutes)

```bash
gcloud services enable run.googleapis.com
gcloud services enable classroom.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Step 4: Deploy to Cloud Run (5 minutes)

```bash
cd /Users/bedwards/auto-grader/classroom-addon

# Deploy!
gcloud run deploy classroom-addon \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE"
```

When prompted:
- Service name: **classroom-addon** (press Enter)
- Region: **us-central1** (press Enter or choose another)
- Allow unauthenticated: **Y** (yes)

Wait for build and deployment (takes 3-5 minutes).

### Step 5: Get Your URL

```bash
gcloud run services describe classroom-addon \
  --region us-central1 \
  --format="value(status.url)"
```

Copy this URL! It'll look like:
`https://classroom-addon-abc123-uc.a.run.app`

### Step 6: Test It Works

```bash
# Replace with YOUR Cloud Run URL
curl https://YOUR_CLOUD_RUN_URL/
```

You should see the landing page HTML!

---

## 🎯 For Kelley's Email

Once deployed, update the email with:

**Classroom Add-on Link:**
```
Your Cloud Run URL + /addon-discovery
Example: https://classroom-addon-abc123-uc.a.run.app/addon-discovery
```

---

## 📧 Send Kelley These 3 Things

### 1. Web Dashboard (ready now)
https://bedwards.github.io/auto-grader/

### 2. Chrome Extension (ready now)
Attach file: `/Users/bedwards/auto-grader/classroom-auto-grader-extension.zip`

### 3. Classroom Add-on (after deploy)
**Direct Link:** `https://YOUR_CLOUD_RUN_URL/addon-discovery`

Tell her:
> "For the Classroom Add-on, I've deployed it here: [YOUR URL]
> You can test it by clicking that link. To use it in assignments, I'll need to 
> add it to the Workspace Marketplace (takes 1 hour) or I can share it directly 
> with you for testing!"

---

## 🔧 Alternative: Test Without Marketplace

Kelley can test the add-on views directly by visiting these URLs:

1. **Landing:** `https://YOUR_URL/`
2. **Discovery:** `https://YOUR_URL/addon-discovery`
3. **Teacher View:** `https://YOUR_URL/teacher-view?itemId=test&courseId=test`
4. **Student View:** `https://YOUR_URL/student-view?itemId=test`
5. **Grader View:** `https://YOUR_URL/grader-view?itemId=test&submissionId=test`

She can see the full UI and test everything except the actual Classroom integration.

---

## ⚠️ If You Get Errors

### "Project not found"
```bash
gcloud config set project YOUR_PROJECT_ID
```

### "API not enabled"
```bash
gcloud services enable run.googleapis.com
```

### "Permission denied"
```bash
gcloud auth login
```

### "Billing not enabled"
- Go to: https://console.cloud.google.com/billing
- Link a billing account (won't be charged within free tier)

---

## 🎉 When Deployed, Update These Files

Update `SEND-TO-KELLEY.txt` with your actual URL:

```bash
# Replace YOUR_URL in the email
export ADDON_URL="https://classroom-addon-abc123-uc.a.run.app"

# Create updated email
sed "s|I can send you a direct link once it's published|Here's the direct link: $ADDON_URL/addon-discovery|g" \
  /Users/bedwards/auto-grader/SEND-TO-KELLEY.txt > /tmp/email-ready.txt

cat /tmp/email-ready.txt
```

---

## 💡 Pro Tip: Test First

Before sending to Kelley, test yourself:

```bash
# Open in browser
open https://YOUR_CLOUD_RUN_URL/addon-discovery
```

You should see the beautiful "AI Auto-Grader Setup" page!

---

## ⏱️ Time Estimate

- Authentication: 2 min
- Project setup: 3 min  
- API enabling: 2 min
- Deployment: 5 min
- Testing: 2 min
- **Total: 14 minutes**

Then send to Kelley! ✉️
