# Google Classroom Add-on - AI Auto-Grader

A Google Classroom Add-on that provides AI-powered auto-grading with constructive feedback.

## Features

- **Attachment Discovery**: Teachers can add auto-grading to assignments
- **Teacher View**: Configure grading rubrics and options
- **Student View**: Students submit work and receive instant AI feedback
- **Grader View**: Teachers review AI grades and add comments
- **Grade Passback**: Automated grade sync to Google Classroom

## Setup

### 1. Install Dependencies

```bash
cd classroom-addon
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**IMPORTANT:** Get your Gemini API key from https://ai.google.dev/

Edit `.env`:
```
GEMINI_API_KEY=your-actual-key-here
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
```

### 3. Generate SSL Certificates (for local testing)

```bash
openssl req -x509 -newkey rsa:4096 -nodes -out localhost.pem -keyout localhost-key.pem -days 365
```

### 4. Configure Google Cloud Project

Follow the instructions at:
https://developers.google.com/workspace/classroom/add-ons/walkthroughs/create-an-add-on

Key steps:
1. Create a Google Cloud Project
2. Enable Google Workspace Marketplace SDK
3. Configure App Integration with Classroom add-on
4. Set Attachment Setup URI: `https://localhost:5000/addon-discovery`
5. Add OAuth scopes
6. Publish to Marketplace (or save as draft for testing)

### 5. Run Locally

```bash
python app.py
```

The add-on will be available at `https://localhost:5000/`

## Testing

### Local Testing

1. Install the add-on from Google Workspace Marketplace (draft mode)
2. Open Google Classroom as a teacher
3. Create an assignment
4. Click "Add-ons" and select "AI Auto-Grader"
5. The iframe will load `https://localhost:5000/addon-discovery`

### Automated Screenshot Testing

```bash
cd ..
node scripts/test-classroom-addon.js
```

## Project Structure

```
classroom-addon/
├── app.py                 # Flask application
├── config.py             # Configuration (loads from .env)
├── requirements.txt      # Python dependencies
├── .env                  # Environment variables (NOT committed)
├── .env.example          # Template for .env
├── static/
│   ├── scripts/
│   │   └── addon-utils.js  # Client-side utilities
│   └── styles/
└── templates/
    ├── base.html           # Base template
    ├── index.html          # Landing page
    ├── addon-discovery.html    # Discovery iframe
    ├── teacher-view.html       # Teacher configuration
    ├── student-view.html       # Student submission
    └── grader-view.html        # Teacher review
```

## iframes

The add-on uses different iframes for different contexts:

| iframe | Route | Purpose |
|--------|-------|---------|
| Attachment Discovery | `/addon-discovery` | First screen when adding to assignment |
| Teacher View | `/teacher-view` | Configure grading options |
| Student View | `/student-view` | Submit work for grading |
| Grader View | `/grader-view` | Review student work and grades |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/grade` | POST | Grade a submission with AI |
| `/api/create-attachment` | POST | Create add-on attachment |
| `/authorize` | GET | Start OAuth flow |
| `/callback` | GET | OAuth callback |

## Security

- **NEVER commit .env file** - It contains secrets!
- `.env` is already in `.gitignore`
- Use `.env.example` as a template
- API keys should only be in environment variables

## Deployment

### Option 1: Deploy to Cloud Run

```bash
gcloud run deploy classroom-addon \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

Update your add-on configuration with the deployed URL.

### Option 2: Deploy to App Engine

Create `app.yaml`:
```yaml
runtime: python39
entrypoint: gunicorn -b :$PORT app:app
```

Deploy:
```bash
gcloud app deploy
```

## Troubleshooting

### "Module not found" errors
```bash
pip install -r requirements.txt
```

### SSL certificate errors
Regenerate certificates:
```bash
openssl req -x509 -newkey rsa:4096 -nodes -out localhost.pem -keyout localhost-key.pem -days 365
```

### OAuth errors
- Check that redirect URI matches in Google Cloud Console
- Ensure all required scopes are added
- Verify OAuth consent screen is configured

### Add-on not loading in Classroom
- Check that Attachment Setup URI is correct
- Verify SSL certificates are valid
- Check browser console for errors
- Ensure add-on is installed (draft or published)

## Resources

- [Google Classroom Add-ons Documentation](https://developers.google.com/workspace/classroom/add-ons)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)

## License

See main project LICENSE file.
