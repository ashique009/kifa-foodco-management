import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { useBakery } from '../context/BakeryContext';
import { CheckCircle2, IndianRupee } from 'lucide-react';

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId?: string;
  tripId?: string;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  isOpen,
  onClose,
  shopId: initialShopId,
  tripId,
}) => {
  const { shops, receivePayment } = useBakery();
  const [selectedShopId, setSelectedShopId] = useState<string>(initialShopId || '');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialShopId) {
      setSelectedShopId(initialShopId);
      const s = shops.find((sh) => sh.id === initialShopId);
      if (s && s.outstanding > 0) {
        setAmount(s.outstanding);
      }
    }
  }, [initialShopId, shops, isOpen]);

  const targetShop = shops.find((s) => s.id === selectedShopId);

  const handlePayFull = () => {
    if (targetShop && targetShop.outstanding > 0) {
      setAmount(targetShop.outstanding);
    }
  };

  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;
    if (!selectedShopId || amount <= 0) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `pay-modal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      await receivePayment({
        shopId: selectedShopId,
        shopName: targetShop ? targetShop.name : 'Unknown Shop',
        tripId,
        amount,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
        receivedBy: 'Delivery Staff',
        idempotencyKey,
      });

      onClose();
    } catch {
      // Button restored on failure in finally
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receive Payment"
      description="Collect outstanding dues or instant payment from retail shop"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <Select
            label="Shop"
            value={selectedShopId}
            onChange={(e) => {
              setSelectedShopId(e.target.value);
              const s = shops.find((sh) => sh.id === e.target.value);
              if (s) setAmount(s.outstanding || 0);
            }}
            required
            disabled={!!initialShopId}
          >
            <option value="">-- Choose Shop --</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name} — Outstanding: ₹{shop.outstanding.toLocaleString('en-IN')}
              </option>
            ))}
          </Select>

          {targetShop && (
            <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-slate-500 block text-[11px]">Current Outstanding Balance:</span>
                <span className="text-base font-bold text-rose-600">
                  ₹{targetShop.outstanding.toLocaleString('en-IN')}
                </span>
              </div>

              {targetShop.outstanding > 0 && (
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 font-semibold text-xs transition-colors self-start sm:self-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pay Full ₹{targetShop.outstanding.toLocaleString('en-IN')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Amount Collected (₹)
            </label>
            {targetShop && targetShop.outstanding > 0 && amount !== targetShop.outstanding && (
              <button
                type="button"
                onClick={handlePayFull}
                className="text-[11px] font-semibold text-emerald-600 hover:underline"
              >
                Set Full Amount (₹{targetShop.outstanding.toLocaleString('en-IN')})
              </button>
            )}
          </div>
          <Input
            type="number"
            min="1"
            value={amount || ''}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            required
            placeholder="Enter amount..."
            className="text-base font-bold text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Payment Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Cash', 'UPI', 'Card', 'Bank Transfer'] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMethod(m)}
                className={`py-2 px-2 rounded-lg text-center font-medium border text-xs transition-colors truncate ${
                  method === m
                    ? 'bg-[#172554] text-white border-[#172554]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {method !== 'Cash' && (
          <div>
            <Input
              label="Transaction / Reference ID (Optional)"
              placeholder="e.g. UPI/12345678 or Txn Ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        )}

        <div>
          <Input
            label="Notes / Remarks"
            placeholder="Optional receipt notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!selectedShopId || amount <= 0 || isSubmitting}
            isLoading={isSubmitting}
          >
            {isSubmitting
              ? 'Processing Payment...'
              : `Confirm Payment (₹${amount.toLocaleString('en-IN')})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
