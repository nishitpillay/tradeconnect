#!/bin/bash

# TradeConnect Mobile - Quick Start Script
# This script sets up the mobile app for development

set -e

echo "🚀 TradeConnect Mobile - Quick Start"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the mobile directory:"
    echo "  cd /tmp/tradeconnect/mobile && ./quick-start.sh"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "✅ npm $(npm --version) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "This may take a few minutes..."
echo ""

npm install

if [ $? -ne 0 ]; then
    echo "❌ Error: npm install failed"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  Important: Edit .env if your backend is not on localhost:3000"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "===================================="
echo "✅ Setup Complete!"
echo "===================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start the backend server (in another terminal):"
echo "   cd /tmp/tradeconnect/backend && npm run dev"
echo ""
echo "2. Start the Expo dev server:"
echo "   npm start"
echo ""
echo "3. Choose a platform:"
echo "   - Press 'i' for iOS Simulator"
echo "   - Press 'a' for Android Emulator"
echo "   - Scan QR code for physical device"
echo ""
echo "For detailed instructions, see:"
echo "  - README.md"
echo "  - SETUP.md"
echo ""
echo "Happy coding! 🎉"
