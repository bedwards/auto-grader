#!/bin/bash

# Deploy Cloudflare Worker script

echo "=================================="
echo "Cloudflare Worker Deployment"
echo "=================================="
echo ""

# Check if wrangler is authenticated
echo "🔍 Checking Cloudflare authentication..."
if ! npx wrangler whoami &>/dev/null; then
    echo "❌ Not authenticated with Cloudflare"
    echo ""
    echo "Please run: npx wrangler login"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Deploy
echo "🚀 Deploying worker..."
npx wrangler deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Worker deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Copy the worker URL from above"
    echo "   2. Add it to your .env file"
    echo "   3. Update Settings in the web app"
else
    echo ""
    echo "❌ Deployment failed"
    echo "   Check the error message above"
    exit 1
fi
