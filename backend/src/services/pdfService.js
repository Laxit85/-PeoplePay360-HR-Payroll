const PDFDocument = require('pdfkit');

/**
 * Generates an executive-grade PDF Payslip buffer
 */
function generatePayslipPDF(payslip, lines, employee, contract, payrun) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const primaryColor = '#0369a1';
      const darkColor = '#0f172a';
      const grayColor = '#64748b';
      const lightBg = '#f8fafc';

      // Header Banner
      doc.rect(40, 40, 515, 60).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('PeoplePay360', 60, 52);
      doc.fontSize(10).font('Helvetica').text('Official Salary & Compensation Statement', 60, 78);
      doc.fontSize(12).font('Helvetica-Bold').text('PAYSLIP', 450, 60, { align: 'right' });

      doc.moveDown(3);

      const pStart = new Date(payslip.period_start).toLocaleDateString();
      const pEnd = new Date(payslip.period_end).toLocaleDateString();

      // Info Box
      doc.rect(40, 115, 515, 75).fill(lightBg).stroke('#e2e8f0');
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold');
      doc.text('Employee Information', 55, 125);
      doc.text('Pay Period Details', 320, 125);

      doc.font('Helvetica').fontSize(9).fillColor(grayColor);
      doc.text(`Name: ${employee.first_name} ${employee.last_name}`, 55, 142);
      doc.text(`Code: ${employee.employee_code}`, 55, 156);
      doc.text(`Bank Acc: ${employee.bank_account_no || 'N/A'}`, 55, 170);

      doc.text(`Pay Period: ${pStart} to ${pEnd}`, 320, 142);
      doc.text(`Scheduled Days: ${payslip.scheduled_work_days} | Worked: ${payslip.worked_days}`, 320, 156);
      doc.text(`Unpaid Leave Days: ${payslip.unpaid_leave_days || 0}`, 320, 170);

      // Table Header
      let y = 210;
      doc.rect(40, y, 515, 24).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('Category', 55, y + 7);
      doc.text('Salary Component / Rule', 150, y + 7);
      doc.text('Rate / %', 350, y + 7);
      doc.text('Amount ($)', 460, y + 7, { align: 'right' });

      // Table Lines
      y += 24;
      doc.font('Helvetica').fontSize(9);

      for (const line of (lines || [])) {
        const isDeduction = line.category === 'DEDUCTION';
        const isNet = line.category === 'NET';
        const isGross = line.category === 'GROSS';

        if (isNet || isGross) {
          doc.rect(40, y, 515, 22).fill('#f1f5f9');
          doc.font('Helvetica-Bold').fillColor(primaryColor);
        } else {
          doc.fillColor(darkColor).font('Helvetica');
        }

        doc.text(line.category, 55, y + 6);
        doc.text(line.rule_name || line.rule_code, 150, y + 6);
        doc.text(line.rate_or_percentage ? `${line.rate_or_percentage}%` : '-', 350, y + 6);
        doc.text(`${isDeduction ? '-' : ''}$${Number(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 420, y + 6, { align: 'right', width: 120 });

        y += 22;
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, y).lineTo(555, y).stroke();
      }

      // Net Pay Highlight Box
      y += 20;
      doc.rect(40, y, 515, 55).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('FINAL NET SALARY PAYABLE', 60, y + 15);
      doc.fontSize(8).font('Helvetica').text('Disbursed via Electronic Direct Deposit', 60, y + 32);
      doc.fontSize(18).font('Helvetica-Bold').text(`$${Number(payslip.net_salary).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 350, y + 16, { align: 'right', width: 185 });

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor(grayColor);
      doc.text('This is a computer-generated payslip generated via PeoplePay360 HR & Payroll Platform.', 40, 760, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePayslipPDF
};
