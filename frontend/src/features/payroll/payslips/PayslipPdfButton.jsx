import React, { useState } from 'react';
import { Download, Printer, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { downloadPayslipPdfApi, openPayslipPdfApi } from '../../../api';

export function PayslipPdfButton({ payslip }) {
  const [downloading, setDownloading] = useState(false);

  const handleExportPdf = async () => {
    if (!payslip?.id) return;
    setDownloading(true);
    try {
      const filename = `Payslip_${payslip.employee_code || payslip.employeeCode || payslip.id}.pdf`;
      await downloadPayslipPdfApi(payslip.id, filename);
    } catch (err) {
      console.error('Failed to download PDF', err);
      alert('Could not download PDF. Printing payslip instead.');
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (payslip?.id) {
      try {
        await openPayslipPdfApi(payslip.id);
        return;
      } catch (err) {
        console.error('Failed to open PDF, falling back to print', err);
      }
    }
    window.print();
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" icon={Printer} onClick={handlePrint}>
        Print Payslip
      </Button>
      <Button
        variant="primary"
        icon={downloading ? Loader2 : Download}
        disabled={downloading}
        onClick={handleExportPdf}
        className="!bg-[#C5A059] !text-slate-950 font-bold hover:!bg-[#b38e36]"
      >
        {downloading ? 'Generating PDF...' : 'Export PDF'}
      </Button>
    </div>
  );
}
