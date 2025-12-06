#!/bin/bash

# MacTheme - Development Environment Setup Script
# This script initializes the development environment and starts the application

set -e  # Exit on error

echo "🎨 MacTheme - Initializing Development Environment"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "${YELLOW}⚠️  Node.js is not installed.${NC}"
    echo "Please install Node.js from https://nodejs.org/ (v18 or higher recommended)"
    exit 1
fi

echo "${GREEN}✓${NC} Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "${YELLOW}⚠️  npm is not installed.${NC}"
    exit 1
fi

echo "${GREEN}✓${NC} npm version: $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    echo "${GREEN}✓${NC} Dependencies installed"
else
    echo "${GREEN}✓${NC} Dependencies already installed"
fi

echo ""
echo "${BLUE}🔧 Checking project structure...${NC}"

# Create necessary directories
mkdir -p src/main
mkdir -p src/renderer
mkdir -p src/preload
mkdir -p src/shared
mkdir -p public
mkdir -p dist

echo "${GREEN}✓${NC} Project directories verified"

echo ""
echo "=================================================="
echo "${GREEN}✓ Environment setup complete!${NC}"
echo ""
echo "Available commands:"
echo "  ${BLUE}npm run dev${NC}      - Start development server with hot reload"
echo "  ${BLUE}npm run build${NC}    - Build application for production"
echo "  ${BLUE}npm run preview${NC}  - Preview production build"
echo "  ${BLUE}npm run lint${NC}     - Run linter"
echo "  ${BLUE}npm run format${NC}   - Format code with Prettier"
echo ""
echo "To start development:"
echo "  ${YELLOW}npm run dev${NC}"
echo ""
echo "Application will be available at:"
echo "  ${BLUE}Electron window will open automatically${NC}"
echo ""
echo "MacTheme directories:"
echo "  Themes: ${BLUE}~/Library/Application Support/MacTheme/themes/${NC}"
echo "  Custom: ${BLUE}~/Library/Application Support/MacTheme/custom-themes/${NC}"
echo "  Current: ${BLUE}~/Library/Application Support/MacTheme/current/${NC}"
echo ""
echo "Happy theming! 🎨"
