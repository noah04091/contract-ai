const fs = require('fs');

const content = fs.readFileSync('./backend/routes/generate.js', 'utf8');
const lines = content.split('\n');

let braceStack = [];
let inTemplateLiteral = false;
let parenStack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  
  // Track template literals (simplified)
  if (line.includes('`')) {
    const backtickCount = (line.match(/`/g) || []).length;
    if (backtickCount % 2 === 1) {
      inTemplateLiteral = !inTemplateLiteral;
    }
  }
  
  // Track braces
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      braceStack.push({ line: lineNum, char: j });
    } else if (char === '}') {
      if (braceStack.length === 0) {
        console.log(`ERROR: Extra closing brace at line ${lineNum}, char ${j}`);
        console.log(`Line: ${line}`);
        break;
      }
      braceStack.pop();
    } else if (char === '(') {
      parenStack.push({ line: lineNum, char: j });
    } else if (char === ')') {
      if (parenStack.length === 0) {
        console.log(`ERROR: Extra closing paren at line ${lineNum}, char ${j}`);
        console.log(`Line: ${line}`);
        break;
      }
      parenStack.pop();
    }
  }
  
  if (braceStack.length < 0) break;
}

console.log(`Remaining open braces: ${braceStack.length}`);
console.log(`Remaining open parens: ${parenStack.length}`);

if (braceStack.length > 0) {
  console.log("Unmatched opening braces:");
  braceStack.slice(-5).forEach(brace => {
    console.log(`  Line ${brace.line}: ${lines[brace.line - 1].substring(0, 100)}`);
  });
}

if (parenStack.length > 0) {
  console.log("Unmatched opening parens:");
  parenStack.slice(-5).forEach(paren => {
    console.log(`  Line ${paren.line}: ${lines[paren.line - 1].substring(0, 100)}`);
  });
}