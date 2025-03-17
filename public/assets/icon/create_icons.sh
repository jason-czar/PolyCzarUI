#!/bin/bash

# Create a simple placeholder icon using ImageMagick
# This script creates placeholder icons in different sizes for the Chrome extension

# Function to create a simple colored square icon with text
create_icon() {
  size=$1
  output_file=$2
  
  convert -size ${size}x${size} xc:#4A90E2 \
    -fill white -gravity center -pointsize $((size/4)) \
    -annotate 0 "PC" \
    -stroke black -strokewidth 1 \
    -fill none -draw "rectangle 0,0 $((size-1)),$((size-1))" \
    "$output_file"
  
  echo "Created $output_file"
}

# Create icons in different sizes
create_icon 16 "icon16.png"
create_icon 48 "icon48.png"
create_icon 128 "icon128.png"

echo "Icon creation complete!"
