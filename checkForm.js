const fs = require('fs');  
const lines = fs.readFileSync('contact.html', 'utf8').split('\n');  
console.log(lines.slice(70, 78).join('\n'));  
