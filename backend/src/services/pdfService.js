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

      const pStart = new Date(payslip.period_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
      const pEnd = new Date(payslip.period_end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

      // Info Box
      doc.rect(40, 115, 515, 88).fill(lightBg).stroke('#e2e8f0');
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold');
      doc.text('Employee & Contract Information', 55, 125);
      doc.text('Pay Period & Attendance Details', 320, 125);

      doc.font('Helvetica').fontSize(9).fillColor(grayColor);
      doc.text(`Name: ${employee.first_name} ${employee.last_name} (${employee.employee_code})`, 55, 142);
      doc.text(`Contract: ${contract?.reference_name || 'Standard Agreement'}`, 55, 156);
      doc.text(`Contract Monthly Wage: Rs. ${Number(contract?.wage || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 55, 170);
      doc.text(`Bank Account: ${employee.bank_account_no || 'Pending Direct Deposit'}`, 55, 184);

      const workedDaysVal = parseFloat(payslip.worked_days || 22);
      const schedDaysVal = parseFloat(payslip.scheduled_work_days || 22);
      const perDayVal = schedDaysVal > 0 ? (Number(contract?.wage || 0) / schedDaysVal) : Number(contract?.wage || 0);
      const earnedWageVal = perDayVal * workedDaysVal;
      const workedHrsVal = Math.round(workedDaysVal * 8);

      doc.text(`Effective Pay Period: ${pStart} to ${pEnd}`, 320, 142);
      doc.text(`Per Day Wage: Rs. ${perDayVal.toFixed(2)} / day (${schedDaysVal} days sched)`, 320, 156);
      doc.font('Helvetica-Bold').fillColor(primaryColor);
      doc.text(`Present: ${workedDaysVal} days (${workedHrsVal} hrs) | Earned: Rs. ${earnedWageVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 320, 170);
      doc.font('Helvetica').fillColor(grayColor);
      doc.text(`Unpaid Leaves: ${payslip.unpaid_leave_days || 0} days`, 320, 184);

      // Table Header
      let y = 220;
      doc.rect(40, y, 515, 24).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('Category', 55, y + 7);
      doc.text('Salary Component / Rule', 150, y + 7);
      doc.text('Rate / %', 350, y + 7);
      doc.text('Amount (Rs. INR)', 460, y + 7, { align: 'right' });

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
        doc.text(`${isDeduction ? '-' : ''}Rs. ${Number(line.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 420, y + 6, { align: 'right', width: 120 });

        y += 22;
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, y).lineTo(555, y).stroke();
      }

      // Net Pay Highlight Box
      y += 20;
      doc.rect(40, y, 515, 55).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text('FINAL NET SALARY PAYABLE', 60, y + 15);
      doc.fontSize(8).font('Helvetica').text('Disbursed via Electronic Direct Deposit (NEFT / IMPS)', 60, y + 32);
      doc.fontSize(18).font('Helvetica-Bold').text(`Rs. ${Number(payslip.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 350, y + 16, { align: 'right', width: 185 });

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
