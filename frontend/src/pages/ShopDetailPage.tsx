import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PaymentMethodBadge } from '../components/ui/Badge';
import { RecordSaleModal } from './RecordSaleModal';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import {
  ArrowLeft,
  Store,
  Phone,
  MapPin,
  IndianRupee,
  Receipt,
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
} from 'lucide-react';

interface ShopDetailPageProps {
  shopId: string;
  onBack: () => void;
}

export const ShopDetailPage: React.FC<ShopDetailPageProps> = ({ shopId, onBack }) => {
  const { shops, sales, payments, getShopLedger } = useBakery();
  const [activeTab, setActiveTab] = useState<'ledger' | 'sales' | 'payments'>('ledger');
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);

  const shop = shops.find((s) => s.id === shopId);

  if (!shop) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Shop not found.</p>
        <Button size="sm" onClick={onBack} className="mt-3">
          Back to Shops
        </Button>
      </div>
    );
  }

  const shopSales = sales.filter((s) => s.shopId === shop.id);
  const shopPayments = payments.filter((p) => p.shopId === shop.id);
  const ledgerEntries = getShopLedger(shop.id);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{shop.name}</h1>
            <p className="text-xs text-slate-500">
              Owner: <strong>{shop.owner}</strong> • Route: {shop.route}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsRecordSaleOpen(true)}
          >
            Record Sale
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<IndianRupee className="w-4 h-4" />}
            onClick={() => setIsReceivePaymentOpen(true)}
          >
            Receive Payment
          </Button>
        </div>
      </div>

      {/* Shop Overview - 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
            Total Sales (Lifetime)
          </span>
          <div className="text-xl font-bold mt-2 text-slate-900">
            ₹{shop.totalSales.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {shopSales.length} total orders delivered
          </span>
        </Card>

        <Card className="p-4 border-slate-200">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
            Total Collected
          </span>
          <div className="text-xl font-bold mt-2 text-emerald-600">
            ₹{shop.totalCollected.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {shopPayments.length} payments recorded
          </span>
        </Card>

        <Card className="p-4 border-slate-200 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
            Current Outstanding Balance
          </span>
          <div
            className={`text-2xl font-black mt-1 ${
              shop.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            ₹{shop.outstanding.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Credit limit: ₹{shop.creditLimit.toLocaleString('en-IN')}
          </span>
        </Card>
      </div>

      {/* Contact and Route info strip */}
      <Card className="p-4 border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{shop.phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{shop.address}</span>
          </div>
        </div>
        <span className="text-slate-400">Customer since: {shop.createdAt}</span>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'ledger'
              ? 'border-[#172554] text-[#172554]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Customer Account Ledger
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-[#172554] text-[#172554]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Sales History ({shopSales.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-[#172554] text-[#172554]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Payment History ({shopPayments.length})
        </button>
      </div>

      {/* Tab 1: Ledger Statement */}
      {activeTab === 'ledger' && (
        <>
          {/* MOBILE LEDGER CARDS */}
          <div className="md:hidden space-y-2.5">
            {ledgerEntries.map((entry) => (
              <Card key={entry.id} className="p-3.5 border-slate-200 bg-white shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-slate-900">{entry.type}</span>
                    <span className="font-mono text-[11px] text-slate-400 block">{entry.reference}</span>
                  </div>
                  <div className="text-right">
                    {entry.debit > 0 && (
                      <span className="font-bold text-slate-900 text-sm block">
                        +₹{entry.debit.toLocaleString('en-IN')}
                      </span>
                    )}
                    {entry.credit > 0 && (
                      <span className="font-bold text-emerald-600 text-sm block">
                        -₹{entry.credit.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Bal: ₹{entry.balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{entry.date}</span>
                  <span className="text-slate-600 text-[11px] truncate max-w-[200px]">{entry.description}</span>
                </div>
              </Card>
            ))}

            {ledgerEntries.length === 0 && (
              <Card className="p-8 text-center text-xs text-slate-500 border-slate-200">
                No transactions recorded yet for this shop.
              </Card>
            )}
          </div>

          {/* DESKTOP LEDGER TABLE */}
          <Card className="hidden md:block overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Plain Business Statement of Account
              </span>
              <span className="text-xs text-slate-500">
                Debit = Goods Delivered • Credit = Payment Received
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-3">Transaction</th>
                    <th className="py-2.5 px-3">Ref #</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-3 text-right">Debit (+)</th>
                    <th className="py-2.5 px-3 text-right">Credit (-)</th>
                    <th className="py-2.5 px-4 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 text-slate-600">{entry.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{entry.type}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{entry.reference}</td>
                      <td className="py-2.5 px-4 text-slate-600">{entry.description}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                        {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-600">
                        {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        ₹{entry.balance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {ledgerEntries.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No transactions recorded yet for this shop.
              </div>
            )}
          </Card>
        </>
      )}

      {/* Tab 2: Sales History */}
      {activeTab === 'sales' && (
        <>
          {/* MOBILE SALES CARDS */}
          <div className="md:hidden space-y-2.5">
            {shopSales.map((s) => (
              <Card key={s.id} className="p-3.5 border-slate-200 bg-white shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-600 block">{s.invoiceNumber}</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">{s.items.length} products</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 block">₹{s.total.toLocaleString('en-IN')}</span>
                    <PaymentMethodBadge method={s.paymentMethod} />
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{s.date}</span>
                  <span className="font-medium text-slate-600">
                    Paid ₹{s.paidAmount.toLocaleString('en-IN')} • Due <strong className={s.remainingDue > 0 ? 'text-rose-600' : 'text-slate-600'}>₹{s.remainingDue.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </Card>
            ))}

            {shopSales.length === 0 && (
              <Card className="p-8 text-center text-xs text-slate-500 border-slate-200">
                No sales invoices found for this shop.
              </Card>
            )}
          </div>

          {/* DESKTOP SALES TABLE */}
          <Card className="hidden md:block overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3 text-right">Total (₹)</th>
                    <th className="py-3 px-3 text-right">Paid (₹)</th>
                    <th className="py-3 px-3 text-right">Due (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shopSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {s.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{s.date}</td>
                      <td className="py-3 px-3 text-slate-600">{s.items.length} products</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ₹{s.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                        ₹{s.paidAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-600 font-medium">
                        ₹{s.remainingDue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <PaymentMethodBadge method={s.paymentMethod} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Tab 3: Payment History */}
      {activeTab === 'payments' && (
        <>
          {/* MOBILE PAYMENT CARDS */}
          <div className="md:hidden space-y-2.5">
            {shopPayments.map((p) => (
              <Card key={p.id} className="p-3.5 border-slate-200 bg-white shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-600 block">{p.receiptNumber}</span>
                    {p.reference && <span className="text-[11px] text-slate-400 block">Ref: {p.reference}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-emerald-600 block">+₹{p.amount.toLocaleString('en-IN')}</span>
                    <PaymentMethodBadge method={p.method} />
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{p.date}</span>
                </div>
              </Card>
            ))}

            {shopPayments.length === 0 && (
              <Card className="p-8 text-center text-xs text-slate-500 border-slate-200">
                No payment records found for this shop.
              </Card>
            )}
          </div>

          {/* DESKTOP PAYMENT TABLE */}
          <Card className="hidden md:block overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shopPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{p.date}</td>
                      <td className="py-3 px-3">
                        <PaymentMethodBadge method={p.method} />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {p.reference || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">
                        +₹{p.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Modals */}
      <RecordSaleModal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        shopId={shop.id}
      />

      <ReceivePaymentModal
        isOpen={isReceivePaymentOpen}
        onClose={() => setIsReceivePaymentOpen(false)}
        shopId={shop.id}
      />
    </div>
  );
};
