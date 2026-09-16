import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Settings, Store, Receipt, Shield, RotateCcw, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { resetToDemoData, showToast } = useBakery();
  const [activeTab, setActiveTab] = useState('business');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Business info form
  const [businessName, setBusinessName] = useState('Kifa Food Co.');
  const [gstin, setGstin] = useState('32ABCDE1234F1Z5');
  const [phone, setPhone] = useState('0495-2760000');
  const [email, setEmail] = useState('orders@kifafoodco.com');
  const [address, setAddress] = useState('Industrial Estate Road, Malaparamba, Kozhikode, Kerala 673009');

  // Invoice prefix
  const [invoicePrefix, setInvoicePrefix] = useState('KIFA-2026-');
  const [footerNote, setFooterNote] = useState('Thank you for choosing Kifa Food Co.! Goods once sold will only be replaced if reported within 24 hours.');

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('success', 'Settings Saved', 'Business information updated successfully.');
  };

  const tabs = [
    { id: 'business', label: 'Business Profile' },
    { id: 'invoice', label: 'Invoice Settings' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'demo', label: 'Data Management' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Bakery profile, tax invoice numbers, staff permission roles, and mock data options
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 1. Business Info */}
      {activeTab === 'business' && (
        <Card className="p-5">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
            <CardTitle>Business Information</CardTitle>
            <p className="text-xs text-slate-500">Legal entity info printed on invoices and delivery bills</p>
          </CardHeader>

          <form onSubmit={handleSaveBusiness} className="space-y-4 text-xs">
            <div>
              <Input
                label="Registered Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="GSTIN Tax Number"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Business Contact Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Input
                label="Official Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="Godown & Distribution Center Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Business Profile
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 2. Invoice Settings */}
      {activeTab === 'invoice' && (
        <Card className="p-5">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
            <CardTitle>Invoice &amp; Receipt Configuration</CardTitle>
            <p className="text-xs text-slate-500">Number formatting and terms printed for retail shops</p>
          </CardHeader>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Invoice Number Prefix"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Receipt Prefix"
                  value="REC-2026-"
                  readOnly
                  className="bg-slate-50"
                />
              </div>
            </div>

            <div>
              <Input
                label="Default Invoice Footer Note"
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => showToast('success', 'Invoice Settings Saved')}
              >
                Save Invoice Preferences
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Roles & Permissions */}
      {activeTab === 'roles' && (
        <Card className="p-5">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
            <CardTitle>Roles &amp; Access Controls</CardTitle>
            <p className="text-xs text-slate-500">Permissions matrix for delivery crew vs office staff</p>
          </CardHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Admin / Owner</p>
                <p className="text-slate-500 mt-0.5">Full access to reports, stock adjustments, pricing and staff</p>
              </div>
              <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Full Access
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Driver &amp; Sales Staff (Delivery Crew)</p>
                <p className="text-slate-500 mt-0.5">
                  Mobile access: Trip checklist, Record sale, Collect payment, Record return
                </p>
              </div>
              <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Crew Field View
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Data Management / Reset Demo */}
      {activeTab === 'demo' && (
        <Card className="p-5">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
            <CardTitle>Demo State &amp; Reset</CardTitle>
            <p className="text-xs text-slate-500">Manage prototype data stored in your local browser cache</p>
          </CardHeader>

          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              All your edits (new trips, sales recorded, payments collected, stock loaded) are automatically preserved in your browser's local storage.
              If you wish to restore the clean initial bakery mock dataset, click below.
            </p>

            <div className="pt-2">
              <Button
                variant="danger"
                size="md"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => setIsResetConfirmOpen(true)}
              >
                Reset to Sample Bakery Data
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          resetToDemoData();
          setIsResetConfirmOpen(false);
        }}
        title="Reset Demo Data?"
        message="This will reset all products, trips, shops, sales and ledger records back to default sample data."
        confirmText="Reset Now"
        variant="danger"
      />
    </div>
  );
};
