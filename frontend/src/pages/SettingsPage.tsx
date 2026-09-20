import React, { useState, useEffect } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { Shield, Lock, AlertCircle, Save, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser, canManage, businessSettings, updateBusinessProfile, updateInvoiceSettings } = useBakery();

  const [activeTab, setActiveTab] = useState('business');

  // Business info form state
  const [businessName, setBusinessName] = useState(businessSettings.business_name || '');
  const [gstin, setGstin] = useState(businessSettings.gstin || '');
  const [phone, setPhone] = useState(businessSettings.phone || '');
  const [email, setEmail] = useState(businessSettings.email || '');
  const [address, setAddress] = useState(businessSettings.address || '');

  // Invoice & Receipt settings form state
  const [invoicePrefix, setInvoicePrefix] = useState(businessSettings.invoice_prefix || 'INV-');
  const [receiptPrefix, setReceiptPrefix] = useState(businessSettings.receipt_prefix || 'REC-');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(businessSettings.invoice_footer_note || '');
  const [receiptFooterNote, setReceiptFooterNote] = useState(businessSettings.receipt_footer_note || '');

  // Sync state when businessSettings updates from backend
  useEffect(() => {
    setBusinessName(businessSettings.business_name || '');
    setGstin(businessSettings.gstin || '');
    setPhone(businessSettings.phone || '');
    setEmail(businessSettings.email || '');
    setAddress(businessSettings.address || '');
    setInvoicePrefix(businessSettings.invoice_prefix || 'INV-');
    setReceiptPrefix(businessSettings.receipt_prefix || 'REC-');
    setInvoiceFooterNote(businessSettings.invoice_footer_note || '');
    setReceiptFooterNote(businessSettings.receipt_footer_note || '');
  }, [businessSettings]);

  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingBusiness) return;
    setIsSavingBusiness(true);
    try {
      await updateBusinessProfile({
        business_name: businessName,
        gstin,
        phone,
        email,
        address,
      });
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingInvoice) return;
    setIsSavingInvoice(true);
    try {
      await updateInvoiceSettings({
        invoice_prefix: invoicePrefix,
        receipt_prefix: receiptPrefix,
        invoice_footer_note: invoiceFooterNote,
        receipt_footer_note: receiptFooterNote,
      });
    } finally {
      setIsSavingInvoice(false);
    }
  };

  // If user does not have management access, display a clean security notice
  if (!canManage) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Management Access Required</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            Business settings, invoice numbering, tax details and roles can only be configured by business administrators and managers.
          </p>
        </div>
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Logged in as {currentUser.name} ({currentUser.role})</span>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'business', label: 'Business Profile' },
    { id: 'invoice', label: 'Invoice & Receipts' },
    { id: 'roles', label: 'Roles & Permissions' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Enterprise business profile, document prefixes, terms, and system access controls
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 1. Business Info */}
      {activeTab === 'business' && (
        <Card className="p-5">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
            <CardTitle>Business Profile</CardTitle>
            <p className="text-xs text-slate-500">Legal entity information printed on tax invoices and receipts</p>
          </CardHeader>

          <form onSubmit={handleSaveBusiness} className="space-y-4 text-xs">
            <div>
              <Input
                label="Registered Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Kifa Food Co."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="GSTIN Tax Number"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 32ABCDE1234F1Z5"
                />
              </div>
              <div>
                <Input
                  label="Business Contact Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0495-2760000"
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
                placeholder="e.g. orders@kifafoodco.com"
              />
            </div>

            <div>
              <Input
                label="Godown & Distribution Center Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full operational facility address"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSavingBusiness}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {isSavingBusiness ? 'Saving...' : 'Save Business Profile'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 2. Invoice & Receipt Settings */}
      {activeTab === 'invoice' && (
        <Card className="p-5">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
            <CardTitle>Invoice &amp; Receipt Configuration</CardTitle>
            <p className="text-xs text-slate-500">Number prefix formats and standard customer terms printed on delivery bills</p>
          </CardHeader>

          <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Invoice Number Prefix"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="e.g. INV- or KIFA-2026-"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Prefix applied to future generated invoices (e.g. {invoicePrefix || 'INV-'}00174).
                </p>
              </div>
              <div>
                <Input
                  label="Receipt Number Prefix"
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value)}
                  placeholder="e.g. REC- or REC-2026-"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Prefix applied to future collection receipts (e.g. {receiptPrefix || 'REC-'}00094).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Invoice Footer Note
              </label>
              <textarea
                value={invoiceFooterNote}
                onChange={(e) => setInvoiceFooterNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172554] focus:border-transparent"
                placeholder="Printed at the bottom of customer sales invoices..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Receipt Footer Note
              </label>
              <textarea
                value={receiptFooterNote}
                onChange={(e) => setReceiptFooterNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172554] focus:border-transparent"
                placeholder="Printed on payment collection receipts..."
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSavingInvoice}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {isSavingInvoice ? 'Saving...' : 'Save Invoice Preferences'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 3. Roles & Permissions (Truthful, non-fake architecture display) */}
      {activeTab === 'roles' && (
        <Card className="p-5">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
            <CardTitle>System Access Control Matrix</CardTitle>
            <p className="text-xs text-slate-500">
              Role permissions strictly enforced by the backend database and API middleware
            </p>
          </CardHeader>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Business Owner / Admin</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                    Master System Authority
                  </span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Unrestricted system-level authority: company financials, fleet dispatches, product pricing, staff credentials, enterprise settings, and system-level administrative protections.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {['Master Admin Account', 'Company-Wide Reports', 'Fleet & Trips', 'Stock Management', 'Pricing & SKUs', 'Staff Accounts', 'Business Settings'].map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Manager (Business Operations)</span>
                  <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] border border-amber-200">
                    Full Business Authority
                  </span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Full operational management: trip dispatches, product catalogue &amp; batches, supplier purchases, fleet vehicles, retail shops, sales &amp; collection ledgers, staff management, and business settings. Cannot modify Master Admin credentials.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {['Company-Wide Overview', 'Dispatch & Trips', 'Stock & Batches', 'Purchases & Suppliers', 'Fleet Management', 'Staff Management', 'Business Settings'].map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-amber-600" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Driver &amp; Sales Staff (Delivery Crew)</span>
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] border border-blue-200">
                    Crew Field Scoped
                  </span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Scoped strictly to their assigned delivery trips. Can record sales and collect payments only for retail shops on their route. Sensitive master data and company totals are hidden.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {['Assigned Route View', 'Record Sales on Trip', 'Collect Shop Payments', 'Record Shop Returns', 'Vehicle Stock Counts'].map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
