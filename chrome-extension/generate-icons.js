const fs = require('fs');
const path = require('path');

// Create icons directory
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// SVG icon template
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#grad)"/>
  <path d="M64 24 L44 64 L64 64 L64 104 L84 64 L64 64 Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
</svg>
`;

// Save SVG
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);

// Create PNG placeholders (in production, use a proper image library)
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  // This is a placeholder - in production, convert SVG to PNG at each size
  const placeholder = `Icon ${size}x${size} - Please generate from icon.svg`;
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), placeholder);
});

console.log('Icon templates created in ./icons/');
console.log('Please use an image editor or tool to convert icon.svg to PNG at sizes: 16, 32, 48, 128');