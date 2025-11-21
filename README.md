# Classroom Auto-Grader

AI-powered automatic grading system for Google Classroom using Gemini AI and Cloudflare Workers with Phi-2. Provides constructive, grade-level feedback for student submissions.

## Features

- **Dual AI Models**: Use Gemini AI (advanced) or Phi-2 (fast) for grading
- **Chrome Extension**: Quick access to auto-grading directly from Google Classroom
- **Web Dashboard**: Full-featured app for managing courses, assignments, and rubrics
- **Smart Rubrics**: Generate and apply rubrics automatically
- **Constructive Feedback**: Grade-level appropriate, specific feedback for students
- **Batch Grading**: Grade multiple submissions at once
- **Assignment Generation**: Create assignments and rubrics with AI assistance

## Architecture

1. **GitHub Pages Web App** (`https://bedwards.github.io/auto-grader/`)
   - Full dashboard for teachers
   - Course and assignment management
   - Bulk grading operations
   - Settings management

2. **Chrome Extension**
   - Quick grading from Classroom UI
   - Injects grading buttons into submission pages
   - Syncs settings with web app

3. **Cloudflare Worker**
   - Backend API for Phi-2 model
   - Fast, serverless AI processing
   - CORS-enabled for browser access

## Quick Start

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Prerequisites

- Node.js 18+
- Google account with Classroom access
- Cloudflare account (free tier works)
- Chrome browser

### Installation

```bash
npm install
```

### Required: API Keys and Authentication

1. **Google OAuth Client ID** - [Get it here](https://console.cloud.google.com/apis/credentials)
2. **Gemini API Key** - [Get it here](https://makersuite.google.com/app/apikey)
3. **Cloudflare Worker** - Deploy with `npm run worker:deploy`

### Configuration

```bash
cp .env.example .env
# Edit .env with your credentials
```

The app will **fail hard** if credentials are missing - this is intentional. No placeholders, no mock data.

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Deploy Cloudflare Worker
npm run worker:deploy

# Test worker locally
npm run worker:dev
```

## Deployment

### Web App (GitHub Pages)

```bash
npm run build
# Push dist/ to gh-pages branch or use GitHub Actions
```

### Chrome Extension

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extension/` folder

## Usage

1. Open https://bedwards.github.io/auto-grader/
2. Go to Settings → Configure credentials
3. Sign in with Google
4. Select course and assignment
5. Start auto-grading

## Security

- `.env` file is gitignored - NEVER commit it
- API keys stored in browser localStorage
- OAuth tokens are session-only
- All API calls use HTTPS

## Troubleshooting

### "Google Client ID not configured"
→ Add your OAuth Client ID in Settings tab

### "Gemini API error"  
→ Check API key and quota limits

### "Cloudflare Worker error"
→ Verify worker is deployed: `npx wrangler deployments list`

### Extension not working
→ Reload extension and refresh Classroom page

## API Integration

Uses official Google Classroom API v1 with these endpoints:

- `/v1/courses` - List courses
- `/v1/courses/{id}/courseWork` - Get assignments
- `/v1/courses/{id}/courseWork/{id}/studentSubmissions` - Get submissions
- `/v1/courses/{id}/courseWork/{id}/rubrics` - Manage rubrics

## AI Models

### Gemini Pro (Google)
- Advanced reasoning
- Better feedback quality
- Requires API key
- Slower (~2-3s per submission)

### Phi-2 (Microsoft via Cloudflare)
- Fast inference (~500ms per submission)
- Good for bulk grading
- Runs on Cloudflare Workers
- Free tier available

## License

MIT

## Disclaimer

This tool uses AI to assist with grading. **Teachers must review all AI-generated grades and feedback before finalizing**. This tool assists but does not replace teacher judgment.
