import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function ApproveRefuseButtons({ onApprove, onRefuse, disabled = false }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="primary"
        size="sm"
        icon={Check}
        disabled={disabled}
        onClick={onApprove}
        className="!bg-money-600 hover:!bg-emerald-700 font-semibold text-xs !h-8"
      >
        Approve
      </Button>
      <Button
        variant="destructive"
        size="sm"
        icon={X}
        disabled={disabled}
        onClick={onRefuse}
        className="text-xs !h-8"
      >
        Refuse
      </Button>
    </div>
  );
}
