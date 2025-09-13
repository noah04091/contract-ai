try {
  require('./backend/routes/generate.js');
  console.log("✅ Syntax check passed - no errors found");
} catch (error) {
  console.error("❌ Syntax error:", error.message);
  process.exit(1);
}