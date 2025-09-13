const fs = require('fs');

const content = fs.readFileSync('./backend/routes/generate.js', 'utf8');
let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '{') braceCount++;
  else if (char === '}') braceCount--;
  else if (char === '(') parenCount++;
  else if (char === ')') parenCount--;
  else if (char === '[') bracketCount++;
  else if (char === ']') bracketCount--;
}

console.log("Brace balance:", braceCount);
console.log("Parentheses balance:", parenCount);
console.log("Bracket balance:", bracketCount);