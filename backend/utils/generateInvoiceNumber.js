// 📁 backend/utils/generateInvoiceNumber.js

function generateInvoiceNumber(latestNumber = 0) {
  const year = new Date().getFullYear();
  const number = (latestNumber + 1).toString().padStart(5, '0');
  return `RE-${year}-${number}`;
}

module.exports = generateInvoiceNumber;
