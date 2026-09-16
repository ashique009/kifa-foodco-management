import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Wallet, Plus, Fuel, Wrench, Coffee, MoreHorizontal, Filter, Calendar } from 'lucide-react';
import { ExpenseCategory } from '../types';

export const ExpensesPage: React.FC = () => {
  const { expenses, addExpense, vehicles } = useBakery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form states
  const [category, setCategory] = useState<ExpenseCategory>('Fuel');
  const [amount, setAmount] = useState<number>(1000);
  const [vehiclePlate, setVehiclePlate] = useState(vehicles[0]?.plateNumber || '');
  const [notes, setNotes] = useState('');

  // Category totals
  const categoryTotals: Record<ExpenseCategory, number> = {
    Fuel: 0,
    'Vehicle Repair': 0,
    'Staff Expense': 0,
    'Vehicle Wash': 0,
    Other: 0,
  };

  expenses.forEach((e) => {
    if (categoryTotals[e.category] !== undefined) {
      categoryTotals[e.category] += e.amount;
    } else {
      categoryTotals['Other'] += e.amount;
    }
  });

  const filteredExpenses = expenses.filter(
    (e) => categoryFilter === 'all' || e.category === categoryFilter
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    addExpense({
      category,
      amount,
      vehiclePlate: vehiclePlate || undefined,
      notes: notes || `${category} payment`,
    });

    setNotes('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Expenses</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daily delivery vehicle fuel, repairs, maintenance and staff meal allowances
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          + Add Expense
        </Button>
      </div>

      {/* 4 Category Summary Cards (Matching Section 20) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fuel
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            ₹{categoryTotals.Fuel.toLocaleString('en-IN')}
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vehicle Repair
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            ₹{categoryTotals['Vehicle Repair'].toLocaleString('en-IN')}
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Staff Expense
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            ₹{categoryTotals['Staff Expense'].toLocaleString('en-IN')}
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Other Expenses
            </span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <MoreHorizontal className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            ₹{(categoryTotals.Other + categoryTotals['Vehicle Wash']).toLocaleString('en-IN')}
          </div>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" /> Filter Category:
        </span>
        {['all', 'Fuel', 'Vehicle Repair', 'Staff Expense', 'Other'].map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors shrink-0 ${
              categoryFilter === c
                ? 'bg-[#172554] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {c === 'all' ? 'All Expenses' : c}
          </button>
        ))}
      </div>

      {/* MOBILE PRESENTATION: Clean Expense Cards */}
      <div className="md:hidden space-y-2.5">
        {filteredExpenses.map((exp) => (
          <Card key={exp.id} className="p-4 border-slate-200 bg-white shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-slate-900 leading-snug">{exp.category}</h3>
                {exp.notes && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{exp.notes}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-base font-black text-slate-900 block">
                  ₹{exp.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{exp.date}</span>
              </span>
              {exp.vehiclePlate && (
                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                  {exp.vehiclePlate}
                </span>
              )}
            </div>
          </Card>
        ))}

        {filteredExpenses.length === 0 && (
          <Card className="p-8 text-center text-xs text-slate-500 border-slate-200">
            No expenses found for this category.
          </Card>
        )}
      </div>

      {/* DESKTOP PRESENTATION: Table */}
      <Card className="hidden md:block overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4">Description / Notes</th>
                <th className="py-3 px-3">Vehicle</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 text-slate-600">{exp.date}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{exp.category}</td>
                  <td className="py-3 px-4 text-slate-600">{exp.notes}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {exp.vehiclePlate || '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Expense"
        description="Log an operational expenditure"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                <option value="Fuel">Fuel</option>
                <option value="Vehicle Repair">Vehicle Repair</option>
                <option value="Staff Expense">Staff Expense</option>
                <option value="Vehicle Wash">Vehicle Wash</option>
                <option value="Other">Other</option>
              </Select>
            </div>

            <div>
              <Input
                label="Amount (₹)"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <Select
              label="Associated Vehicle (Optional)"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
            >
              <option value="">None / General Expense</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.plateNumber}>
                  {v.plateNumber} ({v.model})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Input
              label="Expense Notes / Details"
              placeholder="e.g. Diesel top-up 15 liters"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
