#!/bin/bash

echo "Building PolyCzar Chrome Extension..."

# Create icon directory if it doesn't exist
mkdir -p public/assets/icon

# Create simple placeholder icons if they don't exist
if [ ! -s "public/assets/icon/icon16.png" ]; then
  echo "Creating placeholder icon16.png"
  echo "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTFGN0JGRkVDMEM1MTFFMzg5NkNDMEYxNTNBQTdBMjgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTFGN0JGRkZDMEM1MTFFMzg5NkNDMEYxNTNBQTdBMjgiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1MUY3QkZGQ0MwQzUxMUUzODk2Q0MwRjE1M0FBN0EyOCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1MUY3QkZGREMwQzUxMUUzODk2Q0MwRjE1M0FBN0EyOCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pnrdc/QAAABiSURBVHjaYvz//z8DJYCJgUJAsQEsyIL3799HFxIWFv4/e/ZsRkqjAGwAIyMjAxMDhYBiA1iQbUAHlEQBxQYsXryYEVkDDw8PAwcHBwM7OzvD/v37yY8CXEFIKgAIMADAVBQcEVhxJwAAAABJRU5ErkJggg==" | base64 -d > public/assets/icon/icon16.png
fi

if [ ! -s "public/assets/icon/icon48.png" ]; then
  echo "Creating placeholder icon48.png"
  echo "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTFGN0JGRkVDMEM1MTFFMzg5NkNDMEYxNTNBQTdBMjgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTFGN0JGRkZDMEM1MTFFMzg5NkNDMEYxNTNBQTdBMjgiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1MUY3QkZGQ0MwQzUxMUUzODk2Q0MwRjE1M0FBN0EyOCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1MUY3QkZGREMwQzUxMUUzODk2Q0MwRjE1M0FBN0EyOCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pnrdc/QAAAHoSURBVHja7JpNSwJBGMf3VdMOiX0QO3Ts0CcI6lB0DLp07FRHvxfYqdgh8Bh0EzoF0kkQBD+AXcIXghQkEHvezB50WVdndldnB3bgl+juzrP/38w+M7OzIkJIwMvS8Lj8XwAO4OfZEvJiLKMNGM+UkNcOCGwBwZZnAQ5iGZVlWU2rpmkEj2s0Gp4EwNEG2RhLGEBPUoYOgON0MzEejwNjY2OUvRYKhYDb7XYdQlVVdQE6gJ0Ew+GwMDs7i/KhUCgQDAZdB9jZ2bGVYDQaFWZmZiiAz+dzHQDLVoLJZFKYmpqi7JXNZl0HwLKcYCqVEiYnJyl7ZTIZTwBgWUowk8kI4+PjlL3S6bRnALDMJphKpYTR0VHKXqlUylMAWKYTzGazwvDwMGWvZDLpOQAswwnm83lhcHCQslcikfAkAJbhBIvFotDf30/Za2FhwbMAWIYSXFpaouyVz+c9DYBlKMFyuSz09PRQ9orH454HwDKUYLVaFbq6uih7xWIxXwBg6U6wVqsJHR0dlL2i0ahvALB0J7i2tkbZKxKJ+AoAS3eCm5ublL3C4bDvALB0Jbi1tUXZa35+3pcAWLoS3N3dpew1NzfnWwAsTQnu7+9T9pqdnfU1AJamBOv1OmWvmZkZ3wNgaUqwWCxS9goGg74HwHId4I8AAwBBmT+3P2VI/QAAAABJRU5ErkJggg==" | base64 -d > public/assets/icon/icon48.png
fi

if [ ! -s "public/assets/icon/icon128.png" ]; then
  echo "Creating placeholder icon128.png"
  echo "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTFGN0JGRkVDMEM1MTFFMzg5NkNDMEYxNTNBQTdBMjgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTFGN0JGRkZDMEM1MTFFMzg5NkNDMEYxNTNBQTdBMjgiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo1MUY3QkZGQ0MwQzUxMUUzODk2Q0MwRjE1M0FBN0EyOCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo1MUY3QkZGREMwQzUxMUUzODk2Q0MwRjE1M0FBN0EyOCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pnrdc/QAAAQBSURBVHja7J1NbBVVFMfPtIUilVJKoUgLpZ2WQkVLQbQYrdHEYNSFuBKMK6Mmxo3GhTFx48qo0ZUxRhMTF8ZEE0BcGT5M1QrxA79KQflopUChtFQoH/bZZwqlj/fmvXln5s6Z+f+Sm7T0zn33nt+9c+aeOXNvRSgUEo4OVcUNcAM4bgPcAI7bADeA4zbADeC4DXADOG4D3ACO2wA3gOM2wA3guA1wAzhuA9wAjtsAN4DjNsAN4LgNcAM4bgPcAI7bADeA4zbADeC4DXADOG4D3ACO2wA3gOM2wA3guA1wAzhuA9wAjtsAN4DjNsAN4LgNcAM4bgPcAI7bADeA4zbADeC4DXADOG4D3ACO2wA3gOM2wA3guA1wAzhuA9wAjtsAN4DjNsAN4LgNcAM4bgPcAI7bADeA4zbADeC4DXADOG4D3ACO2wA3gOM2wA3guA1wAzhuA9wAjtsAN4DjNsAN4LgNcAM4bgPcAI7bADeA4zbADeC4DXADOG4D3ACO2wA3gOM2wA3guA1wAzhuA9wAjtsAN4DjNsAN4LgNcAM4bgPcAI7bADeA4zbADeC4DXADOG4D3ACO2wA3gOM2wA3guA1wAzhuA9wAjtsAN4DjNsAN4LgNcAM4bgPcAI7bADeA4zbADeC4DXADOG4D3ACO2wA3gOM2wA3guA1wAzhuA9wAjtsAN4DjNsAN4LgNcAM4bgPcAI7bADeA4zbADeC4DXADOG4D3ACO2wA3gOM2wA3guA1wAzhuA/4XYADVNLbCrJNSdwAAAABJRU5ErkJggg==" | base64 -d > public/assets/icon/icon128.png
fi

# Build the React application
echo "Building React application..."
pnpm build

# Make sure manifest.json is in the dist directory
echo "Copying manifest.json to dist directory..."
cp public/manifest.json dist/

# Create assets directory in dist if it doesn't exist
mkdir -p dist/assets/icon

# Copy icon files to dist
echo "Copying icon files to dist directory..."
cp public/assets/icon/*.png dist/assets/icon/

# Copy preload script to dist
echo "Copying preload script to dist directory..."
cp public/preload.js dist/

# Copy background script to dist
echo "Copying background script to dist directory..."
cp public/background.js dist/

# Remove _redirects file from dist directory as it causes issues with Chrome extensions
echo "Removing _redirects file from dist directory..."
rm -f dist/_redirects

# Create a zip file for Chrome Web Store submission
echo "Creating Chrome extension package..."
cd dist
zip -r ../polyczar-chrome-extension.zip *
cd ..

echo "PolyCzar Chrome Extension build complete!"
echo "Chrome extension package created at: polyczar-chrome-extension.zip"
echo ""
echo "To load the extension in Chrome:"
echo "1. Open Chrome and go to chrome://extensions"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked' and select the 'dist' directory"
echo ""
echo "For more details, see the chrome-extension-guide.html file."
