#!/bin/bash

# Interactive setup script for Classroom Auto-Grader credentials

echo "=================================="
echo "Classroom Auto-Grader Setup"
echo "=================================="
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy from example
cp .env.example .env

echo ""
echo "📝 Let's configure your credentials..."
echo ""

# Google Client ID
echo "1️⃣  Google OAuth Client ID"
echo "   Get it from: https://console.cloud.google.com/apis/credentials"
read -p "   Enter your Client ID: " client_id
if [ -z "$client_id" ]; then
    echo "   ❌ Client ID is required!"
    exit 1
fi
sed -i.bak "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$client_id|" .env

echo ""
echo "2️⃣  Gemini API Key (optional but recommended)"
echo "   Get it from: https://makersuite.google.com/app/apikey"
read -p "   Enter your Gemini API key (or press Enter to skip): " gemini_key
if [ ! -z "$gemini_key" ]; then
    sed -i.bak "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=$gemini_key|" .env
fi

echo ""
echo "3️⃣  Cloudflare Worker URL"
echo "   First deploy with: npm run worker:deploy"
read -p "   Have you deployed the worker? (y/N): " deployed
if [[ $deployed =~ ^[Yy]$ ]]; then
    read -p "   Enter your worker URL: " worker_url
    if [ ! -z "$worker_url" ]; then
        sed -i.bak "s|CLOUDFLARE_WORKER_URL=.*|CLOUDFLARE_WORKER_URL=$worker_url|" .env
    fi
else
    echo "   ⚠️  You'll need to deploy the worker and update .env later"
fi

# Clean up backup file
rm -f .env.bak

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review your .env file"
echo "   2. Run: npm run dev"
echo "   3. Go to Settings tab and save your credentials"
echo "   4. Sign in with Google"
echo ""
echo "⚠️  IMPORTANT: Never commit your .env file!"
