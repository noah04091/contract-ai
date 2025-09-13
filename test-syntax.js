// Test the exact structure from the file
const testFunction = async () => {
  const fullHTML = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Test</title>
</head>
<body>
  <div>Test content</div>
</body>
</html>`;

  return fullHTML;
};

console.log("Syntax test passed");