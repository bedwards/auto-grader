# Setup Guide - Step by Step

Follow these steps **in order** to get the Classroom Auto-Grader running.

## Prerequisites

- Node.js 18+ installed
- npm installed
- Google account with access to Google Classroom
- Cloudflare account (free tier works)
- Chrome browser

## Step 1: Clone and Install

```bash
cd /Users/bedwards/auto-grader
npm install
```

## Step 2: Google Cloud Setup (REQUIRED)

### Create OAuth Credentials

1. Visit https://console.cloud.google.com/
2. Create a new project: **"Classroom Auto-Grader"**
3. Enable APIs:
   - Click "Enable APIs and Services"
   - Search for "Google Classroom API" → Enable
   - Search for "Google Identity" → Enable

4. Create OAuth Consent Screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select "External" (unless you have Workspace)
   - Fill in:
     - App name: **Classroom Auto-Grader**
     - User support email: your email
     - Developer email: your email
   - Add scopes:
     - `.../auth/classroom.courses.readonly`
     - `.../auth/classroom.coursework.students`
     - `.../auth/classroom.rosters.readonly`
     - `.../auth/classroom.student-submissions.students.readonly`
   - Add yourself as test user
   - Save

5. Create Credentials:
   - Go to "Credentials" → "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Web application**
   - Name: **Auto-Grader Web App**
   - Authorized JavaScript origins:
     - `https://bedwards.github.io`
     - `http://localhost:3000`
   - Authorized redirect URIs:
     - `https://bedwards.github.io/auto-grader/`
     - `http://localhost:3000/`
   - Click CREATE
   - **COPY THE CLIENT ID** - you'll need it!

## Step 3: Get Gemini API Key

1. Visit https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Select your project or create new
4. **COPY THE API KEY** - you'll need it!

## Step 4: Setup Cloudflare Worker

### Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser - authorize the connection.

### Deploy the Worker

```bash
npm run worker:deploy
```

You'll see output like:
```
Published classroom-auto-grader (X.XX sec)
  https://classroom-auto-grader.your-subdomain.workers.dev
```

**COPY THAT URL** - you'll need it!

## Step 5: Create .env File

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
GOOGLE_CLIENT_ID=paste-your-client-id-here.apps.googleusercontent.com
GEMINI_API_KEY=paste-your-gemini-key-here
CLOUDFLARE_WORKER_URL=https://classroom-auto-grader.your-subdomain.workers.dev
GITHUB_PAGES_URL=https://bedwards.github.io/auto-grader
```

## Step 6: Test Locally

```bash
npm run dev
```

Visit http://localhost:3000

1. Go to Settings tab
2. Enter your Google Client ID
3. Enter your Gemini API Key  
4. Enter your Cloudflare Worker URL
5. Click Save Settings
6. Go to Dashboard
7. Click "Sign in with Google"

If sign-in works, you're ready!

## Step 7: Deploy to GitHub Pages

### Option A: Manual Deploy

```bash
npm run build
```

Then push the `dist/` folder to the `gh-pages` branch:

```bash
cd dist
git init
git add .
git commit -m "Deploy to GitHub Pages"
git remote add origin git@github.com:bedwards/auto-grader.git
git push -f origin main:gh-pages
```

### Option B: GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Commit and push this file. GitHub will auto-deploy on every push to main.

### Enable GitHub Pages

1. Go to https://github.com/bedwards/auto-grader/settings/pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` / `root`
4. Save

Wait a few minutes, then visit: https://bedwards.github.io/auto-grader/

## Step 8: Install Chrome Extension

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Navigate to `/Users/bedwards/auto-grader/extension/`
6. Select the folder
7. Extension is now installed!

Click the extension icon and configure it with same settings as web app.

## Step 9: Test Everything

### Test Web App

1. Go to https://bedwards.github.io/auto-grader/
2. Sign in
3. Check Dashboard shows your courses
4. Try navigating to each tab

### Test Chrome Extension

1. Go to https://classroom.google.com
2. Open any course with assignments
3. Look for auto-grade buttons (injected by extension)
4. Click extension icon → "Grade Current Page"

### Test Auto-Grading

1. In web app, go to Auto-Grade tab
2. Select a course with submitted assignments
3. Select an assignment
4. Check both AI options
5. Click "Start Auto-Grading"
6. Watch progress bar

## Common Issues

### "Failed to fetch" errors
- Check CORS is enabled on Cloudflare Worker
- Verify worker URL is correct
- Test worker directly: `curl https://your-worker.workers.dev/health`

### OAuth errors
- Make sure redirect URIs match exactly
- Include both http://localhost:3000 and https://bedwards.github.io
- Clear browser cache and try again

### "API key not valid"
- Double-check you copied the full key
- Make sure Gemini API is enabled in Google Cloud
- Try generating a new key

### Extension not injecting buttons
- Refresh the extension in chrome://extensions
- Hard refresh Classroom page (Cmd+Shift+R)
- Check console for errors (F12)

## Next Steps

- Read the main README.md for usage instructions
- Check out the API documentation in `/docs`
- Customize the grading prompts in `src/grading-engine.js`
- Add more AI models to `worker/src/index.js`

## Need Help?

If you get stuck:
1. Check the error in browser console (F12)
2. Check worker logs: `npx wrangler tail`
3. Open an issue on GitHub
4. Email for support

---

**Remember**: Never commit your `.env` file! It contains your API keys.
