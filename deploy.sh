#!/bin/bash
# Deployment Automation Script with Netlify
set -e

echo "🚀 Starting deployment process"

# 1. Build the project
echo "🔨 Building project..."
npm run build

echo "✅ Build complete"

# 2. Commit changes
echo "📦 Committing changes..."
git add -A
git commit -m "Live deployment: v25 Wallet Update" || echo "ℹ️ No changes to commit"
echo "✅ Changes committed"

# 3. Push to main branch
echo "🚚 Pushing to GitHub..."
BRANCH=main
git push origin $BRANCH --force

# 4. Trigger Netlify rebuild
echo "⚡ Triggering Netlify deployment..."
NETLIFY_SITE_ID="goldenvaultgames"
NETLIFY_TOKEN="$1"

curl -s -X POST \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clear_cache": true}' \
  "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/builds"

echo "
✅ Deployment triggered successfully!"
echo "📊 Monitor at: https://app.netlify.com/sites/$NETLIFY_SITE_ID/deploys"
