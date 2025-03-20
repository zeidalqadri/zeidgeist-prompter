/**
 * Run this script with Node.js to generate a favicon.ico file
 * You'll need to install these packages first:
 * npm install canvas jimp
 */

const fs = require('fs');
const { createCanvas } = require('canvas');
const Jimp = require('jimp');

async function generateFavicon() {
  // Create a square canvas
  const size = 32;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Create gradient for the 'Z' letter
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1a1a1a');
  gradient.addColorStop(1, '#585858');
  
  // Draw a stylized 'Z'
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.lineTo(24, 8);
  ctx.lineTo(8, 24);
  ctx.lineTo(24, 24);
  ctx.closePath();
  ctx.fill();
  
  // Convert canvas to buffer
  const buffer = canvas.toBuffer('image/png');
  
  // Save as PNG first
  fs.writeFileSync('public/favicon.png', buffer);
  
  console.log('Favicon PNG created!');
  
  // Now convert to ICO using Jimp
  try {
    const image = await Jimp.read('public/favicon.png');
    image.write('public/favicon.ico');
    console.log('Favicon ICO created!');
  } catch (err) {
    console.error('Error creating ICO:', err);
  }
}

generateFavicon().catch(err => {
  console.error('Error generating favicon:', err);
}); 