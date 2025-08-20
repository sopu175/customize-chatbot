#!/bin/bash

echo "🔒 Setting up HTTPS for Dcastalia Chatbot..."

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert is not installed. Installing..."
    npm install -g mkcert
fi

# Generate certificates for localhost
echo "📜 Generating SSL certificates..."
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Move certificates to project directory
echo "📁 Moving certificates to project directory..."
mkdir -p certs
mv localhost+2.pem certs/localhost.pem
mv localhost+2-key.pem certs/localhost-key.pem

echo "✅ HTTPS setup completed!"
echo ""
echo "🚀 You can now run the chatbot with HTTPS:"
echo "   npm run dev:https"
echo "   npm run dev:3003:https"
echo ""
echo "📁 Certificates are stored in the 'certs' directory"
echo "🔐 The certificates are valid for: localhost, 127.0.0.1, and ::1"
