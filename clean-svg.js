const fs = require('fs');
let svg = fs.readFileSync('public/akwetche-symbole.svg', 'utf8');

console.log('Before - has rect:', svg.includes('<rect'));
console.log('Before length:', svg.length);

// Remove all rect elements
svg = svg.replace(/<rect[^>]*\/>/g, '');

console.log('After - has rect:', svg.includes('<rect'));
console.log('After length:', svg.length);

// Also remove xlink namespace since we'll render to PNG
fs.writeFileSync('public/akwetche-symbole.svg', svg, 'utf8');
console.log('Done');
