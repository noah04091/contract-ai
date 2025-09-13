const fs = require('fs');

try {
  const code = fs.readFileSync('./backend/routes/generate.js', 'utf8');
  eval(code);
  console.log("✅ Code executed without syntax errors");
} catch (error) {
  console.error("❌ Syntax error details:");
  console.error("Message:", error.message);
  console.error("Stack:", error.stack);
}