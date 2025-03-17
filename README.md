# Polymarket Options Chain Chrome Extension

## Overview
A Chrome extension for visualizing options chains for Polymarket events. This extension provides an intuitive interface for viewing and analyzing options data with features like dynamic date generation and trade modal integration.

## Features
- Dynamic generation of upcoming Friday dates
- Options chain visualization with strike prices and premiums
- Trade modal for detailed order placement
- Real-time breakeven and profit chance calculations
- Automatic date selection for upcoming Fridays

## Installation
1. Download the extension files
   - Download the ZIP file and extracting it
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top right
4. Click "Load unpacked" and select the `dist` directory from the downloaded files

## Development Setup
1. Install dependencies:
   ```
   pnpm install
   ```
2. Start the development server:
   ```
   pnpm dev
   ```
3. Build for production:
   ```
   pnpm build
   ```
4. The built extension will be in the `dist` directory

## Deployment
### Deploying to Netlify via GitHub
1. Push your code to a GitHub repository
2. Log in to Netlify and click "Add new site" > "Import an existing project"
3. Select your GitHub repository
4. Configure the build settings:
   - Build command: `./netlify-build.sh`
   - Publish directory: `dist`
5. Click "Deploy site"

## Project Structure