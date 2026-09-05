import React from 'react';
import { formatCurrency } from '../../lib/format';

export function CurrencyCell({ amount, currency = 'USD', className = '' }) {
  return (
    <span className={`currency-cell font-bold ${className}`}>
      {formatCurrency(amount, currency)}
    </span>
  );
}
