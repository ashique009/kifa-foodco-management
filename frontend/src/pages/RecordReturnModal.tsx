import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { useBakery } from '../context/BakeryContext';
import { ReturnReason } from '../types';
import { generateIdempotencyKey } from '../utils/idempotency';
import { formatINR } from '../utils/formatters';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface RecordReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId?: string;
  tripId?: string;
}

export const RecordReturnModal: React.FC<RecordReturnModalProps> = ({
  isOpen,
  onClose,
  shopId: initialShopId,
  tripId,
}) => {
  const { shops, products, trips, recordReturn } = useBakery();
  const [selectedShopId, setSelectedShopId] = useState<string>(initialShopId || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products.find((p) => p.isActive)?.id || products[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(3);
  const [reason, setReason] = useState<ReturnReason>('Shop Return');
  const [notes, setNotes] = useState<string>('');

  const targetShop = shops.find((s) => s.id === (initialShopId || selectedShopId));
  const targetProduct = products.find((p) => p.id === selectedProductId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef<boolean>(false);
  const idempotencyKeyRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      idempotencyKeyRef.current = generateIdempotencyKey('return');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;
    if (!targetShop || !targetProduct || quantity <= 0) return;

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey('return');
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await recordReturn({
        tripId,
        shopId: targetShop.id,
        shopName: targetShop.name,
        productId: targetProduct.id,
        productName: targetProduct.name,
        unit: targetProduct.unit,
        quantity,
        reason,
        notes: notes || undefined,
        idempotencyKey: idempotencyKeyRef.current,
      });

      onClose();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Return"
      description={
        targetShop
          ? `${targetShop.name} • Collect unsold or damaged items`
          : 'Record stock returned from retail shop'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {!initialShopId && (
          <div>
            <Select
              label="Shop"
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              required
            >
              <option value="">-- Choose Shop --</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Select
            label="Product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            required
          >
            {products
              .filter((p) => p.isActive || p.id === selectedProductId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit})
                </option>
              ))}
          </Select>
        </div>

        {/* Quantity with Stepper controls */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Quantity Returned ({targetProduct?.unit || 'units'})
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 flex items-center justify-center font-bold text-lg transition-transform active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 text-center font-bold text-base text-slate-900 py-2 border border-slate-200 rounded-lg bg-slate-50"
            />
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 flex items-center justify-center font-bold text-lg transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reasons */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Return Reason
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Shop Return', 'Damaged', 'Expired'] as ReturnReason[]).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setReason(r)}
                className={`py-2.5 px-2 rounded-xl text-center font-bold border text-xs transition-colors ${
                  reason === r
                    ? 'bg-[#172554] text-white border-[#172554] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Input
            label="Remarks (Optional)"
            placeholder="e.g. Expired packaging / damaged crust"
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
            isLoading={isSubmitting}
            disabled={isSubmitting || quantity <= 0}
          >
            {isSubmitting ? 'Processing Return...' : 'Save Return'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
