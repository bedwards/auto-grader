# Quick Start Guide

Get the Classroom Auto-Grader running in 15 minutes.

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

## Step 2: Get API Keys (5 min)

### Google OAuth Client ID (REQUIRED)

1. Visit: https://console.cloud.google.com/apis/credentials
2. Create new project: "Classroom Auto-Grader"
3. Enable "Google Classroom API"
4. Create OAuth Client ID (Web application)
5. Add authorized origins:
   - `https://bedwards.github.io`
   - `http://localhost:3000`
6. Copy the Client ID

### Gemini API Key (REQUIRED for AI grading)

1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

## Step 3: Configure Credentials (2 min)

```bash
npm run setup
```

Or manually:
```bash
cp .env.example .env
# Edit .env with your keys
```

## Step 4: Deploy Cloudflare Worker (5 min)

```bash
# First time only: login to Cloudflare
npx wrangler login

# Deploy the worker
npm run worker:deploy
```

Copy the worker URL (e.g., `https://classroom-auto-grader.abc.workers.dev`)

Add it to your `.env` file.

## Step 5: Test Locally (2 min)

```bash
npm run dev
```

Visit http://localhost:3000

1. Go to Settings tab
2. Paste your credentials
3. Click Save
4. Try to sign in with Google

If sign-in works → Success! 🎉

## Step 6: Deploy to GitHub Pages

### Option A: Automatic (via GitHub Actions)

```bash
git add -A
git commit -m "Initial commit"
git push origin main
```

Go to: https://github.com/bedwards/auto-grader/settings/pages
- Source: "GitHub Actions"
- Wait 2-3 minutes for deployment
- Visit: https://bedwards.github.io/auto-grader/

### Option B: Manual

```bash
npm run build
cd dist
git init
git add .
git commit -m "Deploy"
git push -f origin main:gh-pages
```

## Step 7: Install Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `/Users/bedwards/auto-grader/extension/`

Done!

## What's Next?

- Configure extension settings (same as web app)
- Go to Google Classroom
- Select a course with assignments
- Try auto-grading!

## Troubleshooting

### Build fails
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Worker deploy fails
```bash
npx wrangler login
npx wrangler whoami
npm run worker:deploy
```

### Can't sign in
- Check Client ID is correct
- Verify redirect URIs match exactly
- Clear browser cache

## Need Help?

Read the full [SETUP.md](./SETUP.md) for detailed instructions.
