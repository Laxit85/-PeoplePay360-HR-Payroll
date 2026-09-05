import React from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function PayslipPdfButton({ payslip }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" icon={Printer} onClick={handlePrint}>
        Print Payslip
      </Button>
      <Button variant="primary" icon={Download} onClick={handlePrint}>
        Export PDF
      </Button>
    </div>
  );
}
