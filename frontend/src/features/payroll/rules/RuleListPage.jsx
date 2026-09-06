import React, { useState, useEffect } from 'react';
import { Plus, Sliders } from 'lucide-react';
import { getSalaryRules, saveSalaryRule } from '../../../mockApi/apiHandlers';
import { DataTable } from '../../../components/data/DataTable';
import { StatusBadge } from '../../../components/data/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useAuth } from '../../../auth/useAuth';

export function RuleListPage() {
  const { can } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [selectedRule, setSelectedRule] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Allowance'); // Basic, Allowance, Deduction, Gross, Net
  const [sequence, setSequence] = useState(1);
  const [computationMethod, setComputationMethod] = useState('Percentage'); // Fixed Amount, Percentage, Formula
  const [percentageBase, setPercentageBase] = useState('Basic');
  const [amountPercentage, setAmountPercentage] = useState(10);
  const [fixedAmount, setFixedAmount] = useState(0);
  const [formula, setFormula] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const list = await getSalaryRules();
      setRules(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenNew = () => {
    setSelectedRule(null);
    setName('');
    setCode('');
    setCategory('Allowance');
    setSequence(rules.length + 1);
    setComputationMethod('Percentage');
    setPercentageBase('Basic');
    setAmountPercentage(10);
    setFixedAmount(0);
    setFormula('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r) => {
    setSelectedRule(r);
    setName(r.name);
    setCode(r.code);
    setCategory(r.category);
    setSequence(r.sequence);
    setComputationMethod(r.computationMethod);
    setPercentageBase(r.percentageBase || 'Basic');
    setAmountPercentage(r.amountPercentage || 0);
    setFixedAmount(r.fixedAmount || 0);
    setFormula(r.formula || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSalaryRule({
        id: selectedRule?.id,
        name,
        code: code.toUpperCase(),
        category,
        sequence: Number(sequence),
        computationMethod,
        percentageBase,
        amountPercentage: Number(amountPercentage),
        fixedAmount: Number(fixedAmount),
        formula,
      });
      setIsModalOpen(false);
      fetchRules();
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'sequence', header: 'Seq', align: 'center', render: (val) => `#${val}` },
    { key: 'name', header: 'Rule Name' },
    { key: 'code', header: 'Code', render: (val) => <span className="font-mono font-bold">{val}</span> },
    { key: 'category', header: 'Category' },
    { key: 'computationMethod', header: 'Computation Method' },
    {
      key: 'details',
      header: 'Value / Formula',
      render: (_, row) => {
        if (row.computationMethod === 'Fixed Amount') return `₹${row.fixedAmount}`;
        if (row.computationMethod === 'Percentage')
          return `${row.amountPercentage}% of ${row.percentageBase}`;
        return <code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded">{row.formula}</code>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary-600" />
            <span>Salary Rules Configuration</span>
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Sequenced rules computing Basic, Allowances, Deductions, Gross, and Net salary.
          </p>
        </div>
        {can('payroll.rules.manage') && (
          <Button variant="primary" icon={Plus} onClick={handleOpenNew}>
            New Salary Rule
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rules}
        onRowClick={(r) => can('payroll.rules.manage') && handleOpenEdit(r)}
        emptyMessage="No salary rules configured"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedRule ? 'Edit Salary Rule' : 'Create Salary Rule'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Rule'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rule Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="House Rent Allowance"
              required
            />
            <Input
              label="Rule Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="HRA"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Basic">Basic</option>
              <option value="Allowance">Allowance</option>
              <option value="Deduction">Deduction</option>
            </Select>
            <Input
              label="Execution Sequence Number"
              type="number"
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              required
            />
          </div>

          <Select
            label="Computation Method"
            value={computationMethod}
            onChange={(e) => setComputationMethod(e.target.value)}
          >
            <option value="Fixed Amount">Fixed Amount</option>
            <option value="Percentage">Percentage (%)</option>
            <option value="Formula">Python / Formula Code</option>
          </Select>

          {computationMethod === 'Fixed Amount' && (
            <Input
              label="Fixed Amount (₹ INR)"
              type="number"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              required
            />
          )}

          {computationMethod === 'Percentage' && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Percentage Base"
                value={percentageBase}
                onChange={(e) => setPercentageBase(e.target.value)}
              >
                <option value="Contract Wage">Contract Wage</option>
                <option value="Basic">Basic Salary</option>
                <option value="Gross">Gross Salary</option>
              </Select>
              <Input
                label="Percentage Rate (%)"
                type="number"
                value={amountPercentage}
                onChange={(e) => setAmountPercentage(e.target.value)}
                required
              />
            </div>
          )}

          {computationMethod === 'Formula' && (
            <Input
              label="Formula Expression"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="(BASIC / 22) * unpaid_days"
            />
          )}
        </form>
      </Modal>
    </div>
  );
}
