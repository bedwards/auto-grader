#!/bin/bash

# Deploy Classroom Add-on to Cloud Run
# Run this script: chmod +x scripts/deploy-addon.sh && ./scripts/deploy-addon.sh

set -e

echo "🚀 Deploying Classroom Add-on to Cloud Run"
echo ""

# Add gcloud to PATH
export PATH=/opt/homebrew/share/google-cloud-sdk/bin:"$PATH"

# Check if authenticated
if ! gcloud auth list 2>/dev/null | grep -q "ACTIVE"; then
    echo "❌ Not authenticated with Google Cloud"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Check if project is set
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project configured"
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "✅ Using project: $PROJECT_ID"
echo ""

# Enable APIs
echo "📡 Enabling required APIs..."
gcloud services enable run.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet
echo "✅ APIs enabled"
echo ""

# Deploy
echo "🚢 Deploying to Cloud Run..."
cd "$(dirname "$0")/../classroom-addon"

gcloud run deploy classroom-addon \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=AIzaSyDQ9evzDjUilF8Y0-uEHA0i8GM-yT9yMKs" \
  --quiet

echo ""
echo "✅ Deployment complete!"
echo ""

# Get URL
URL=$(gcloud run services describe classroom-addon \
  --region us-central1 \
  --format="value(status.url)" 2>/dev/null)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 SUCCESS! Your add-on is live at:"
echo ""
echo "   $URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Test it:"
echo "   curl $URL/"
echo ""
echo "📧 For Kelley's email, use these links:"
echo ""
echo "1. Web Dashboard:"
echo "   https://bedwards.github.io/auto-grader/"
echo ""
echo "2. Chrome Extension:"
echo "   /Users/bedwards/auto-grader/classroom-auto-grader-extension.zip"
echo ""
echo "3. Classroom Add-on:"
echo "   $URL/addon-discovery"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
