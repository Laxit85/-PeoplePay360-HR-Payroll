import React from 'react';
import { Select } from '../../../../components/ui/Select';
import { Input } from '../../../../components/ui/Input';

export function StepStructurePeriod({
  structures = [],
  salaryStructureId,
  setSalaryStructureId,
  periodStart,
  setPeriodStart,
  periodEnd,
  setPeriodEnd,
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="p-3 bg-primary-50 border border-primary-600/20 rounded-sm text-xs text-primary-600 font-medium">
        Step 1 of 2: Select Salary Structure & Pay Period range. (No record will be created until Step 2 is completed).
      </div>

      <Select
        label="Salary Structure"
        value={salaryStructureId}
        onChange={(e) => setSalaryStructureId(e.target.value)}
      >
        {structures.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.code})
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Pay Period Start Date"
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          required
        />
        <Input
          label="Pay Period End Date"
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          required
        />
      </div>
    </div>
  );
}
