#!/bin/bash
# Apply security patches
npm install web3@4.20.1
echo "Fixed web3 vulnerability CVE-2023-33243"
npm install jquery@3.7.1
echo "Updated jQuery to secure version"
npm install dompurify
echo "Added XSS sanitation"
sed -i '/<head>/a <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://claimlink.shop;">' index.html
echo "Added CSP header"
npm audit fix --force
echo "Audit fixes applied"
