// src/modules/payroll/pdf.service.js
// Owner: Person 4
// Requires: npm install pdfkit (not in the base package.json — add it when
// you start on the real template so the scaffold doesn't force a dependency
// nobody's using yet).

async function generatePayslipPdf(payslip, employee) {
  // Lazy-require so the base scaffold works before this dependency is added.
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];

  doc.on('data', (chunk) => buffers.push(chunk));

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(18).text('Payslip', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Employee: ${employee.full_name}`);
    doc.text(`Gross Pay: ${payslip.gross_pay}`);
    doc.text(`Net Pay: ${payslip.net_pay}`);
    doc.moveDown();
    doc.text('Breakdown:');

    const breakdown = JSON.parse(payslip.computation_json || '[]');
    breakdown.forEach((line) => {
      doc.text(`  ${line.label} (${line.code}): ${line.amount}`);
    });

    doc.end();
  });
}

module.exports = { generatePayslipPdf };
