const theme = { borderRadius: '4px' };
const logoBase64 = 'data:image/png;base64,abc123';

const test = `
  ${logoBase64 ? 
    '<div style="' +
      'width: 140px;' +
      'height: 70px;' +
    '">' +
      '<img src="' + logoBase64 + '" alt="Logo" />' +
    '</div>' : ''}
`;

console.log("Template test passed");
console.log(test);