import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { useBakery } from '../context/BakeryContext';
import { Product, PaymentMethod, SaleItem } from '../types';
import { Plus, Minus, Trash2, Store, ArrowRight, ArrowLeft, Check, Package } from 'lucide-react';

interface RecordSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId?: string;
  tripId?: string;
}

export const RecordSaleModal: React.FC<RecordSaleModalProps> = ({
  isOpen,
  onClose,
  shopId: initialShopId,
  tripId,
}) => {
  const { shops, products, trips, recordSale, showToast } = useBakery();

  const [selectedShopId, setSelectedShopId] = useState<string>(initialShopId || '');
  const [items, setItems] = useState<
    { productId: string; quantity: number; unitPrice: number }[]
  >([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paidNow, setPaidNow] = useState<number>(0);

  // Mobile 2-step navigation: 1 = Products, 2 = Payment
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);

  const idempotencyKeyRef = useRef<string>('');
  const isSubmittingRef = useRef<boolean>(false);

  // If a trip is provided, get available products loaded in this trip; otherwise fallback to active trip or active products
  const activeTrip = (tripId ? trips.find((t) => t.id === tripId) : undefined) || trips.find((t) => t.status === 'In Progress' || t.status === 'Loaded');
  const availableProducts = activeTrip && activeTrip.loadedItems?.length
    ? products.filter((p) => activeTrip.loadedItems.some((li) => li.productId === p.id))
    : products.filter((p) => p.isActive);

  // Helper to get stock available in vehicle for current trip
  const getVehicleStock = (productId: string): number => {
    if (!activeTrip || !activeTrip.loadedItems) return 0;
    return activeTrip.loadedItems
      .filter((li) => li.productId === productId)
      .reduce(
        (sum, li) =>
          sum +
          (li.vanBalance !== undefined
            ? li.vanBalance
            : Math.max(0, li.loadedQty - li.soldQty + li.returnedQty)),
        0
      );
  };

  const formatUnit = (unit?: string, qty: number = 0) => {
    if (!unit) return 'packets';
    const lower = unit.toLowerCase();
    if (lower === 'packet' || lower === 'packets') return 'packets';
    return lower.endsWith('s') ? lower : `${lower}s`;
  };

  const getItemError = (item: { productId: string; quantity: number }) => {
    const stock = getVehicleStock(item.productId);
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return 'Quantity must be greater than 0';
    }
    if (item.quantity > stock) {
      return `Quantity exceeds vehicle stock (${stock} available)`;
    }
    return null;
  };

  const hasInvalidQuantity = items.some((item) => getItemError(item) !== null);

  useEffect(() => {
    if (initialShopId) setSelectedShopId(initialShopId);
  }, [initialShopId]);

  // Reset or initialize items and generate fresh idempotency key when modal opens
  useEffect(() => {
    if (isOpen) {
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `sale-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setMobileStep(1);
      if (availableProducts.length > 0) {
        const firstProd = availableProducts[0];
        const stock = getVehicleStock(firstProd.id);
        const defaultQty = stock > 0 ? Math.min(10, stock) : 1;
        setItems([
          {
            productId: firstProd.id,
            quantity: defaultQty,
            unitPrice: firstProd.sellingPrice,
          },
        ]);
      } else {
        setItems([]);
      }
      setDiscount(0);
      setPaymentMethod('Cash');
    }
  }, [isOpen]);

  // Sync items if availableProducts becomes populated after modal open
  useEffect(() => {
    if (isOpen && items.length === 0 && availableProducts.length > 0) {
      const firstProd = availableProducts[0];
      const stock = getVehicleStock(firstProd.id);
      const defaultQty = stock > 0 ? Math.min(10, stock) : 1;
      setItems([
        {
          productId: firstProd.id,
          quantity: defaultQty,
          unitPrice: firstProd.sellingPrice,
        },
      ]);
    }
  }, [isOpen, availableProducts.length]);

  const targetShop = shops.find((s) => s.id === (initialShopId || selectedShopId));

  const handleAddItem = (productId?: string) => {
    const prod = productId
      ? products.find((p) => p.id === productId)
      : availableProducts.find((p) => !items.some((i) => i.productId === p.id)) ||
        availableProducts[0] ||
        products[0];

    if (prod) {
      const stock = getVehicleStock(prod.id);
      const existingIdx = items.findIndex((i) => i.productId === prod.id);
      if (existingIdx >= 0) {
        const currentQty = items[existingIdx].quantity;
        const newQty = stock > 0 ? Math.min(currentQty + 5, stock) : currentQty + 5;
        handleQuantityChange(existingIdx, newQty);
      } else {
        const defaultQty = stock > 0 ? Math.min(10, stock) : 1;
        setItems((prev) => [
          ...prev,
          { productId: prod.id, quantity: defaultQty, unitPrice: prod.sellingPrice },
        ]);
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const price = prod ? prod.sellingPrice : 0;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, productId, unitPrice: price } : item
      )
    );
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item))
    );
  };

  const handlePriceChange = (index: number, price: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unitPrice: Math.max(0, price) } : item))
    );
  };

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);

  // Sync paidNow default
  useEffect(() => {
    if (paymentMethod === 'Due') {
      setPaidNow(0);
    } else if (paymentMethod === 'Partial') {
      if (paidNow === 0 || paidNow > total) {
        setPaidNow(Math.round(total * 0.6));
      }
    } else {
      setPaidNow(total);
    }
  }, [paymentMethod, total]);

  const remainingDue = paymentMethod === 'Due' ? total : Math.max(0, total - paidNow);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    const effectiveShopId = initialShopId || selectedShopId;
    if (!effectiveShopId || items.length === 0) return;

    if (!activeTrip) {
      showToast('error', 'No Active Trip', 'Sales must be recorded during an active trip.');
      return;
    }

    // Strict validation against vehicle stock
    for (const item of items) {
      const stock = getVehicleStock(item.productId);
      const prod = products.find((p) => p.id === item.productId);
      const prodName = prod ? prod.name : 'Product';
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        showToast('error', 'Invalid Quantity', `${prodName}: Quantity must be greater than 0.`);
        return;
      }
      if (item.quantity > stock) {
        showToast(
          'error',
          'Insufficient Vehicle Stock',
          `${prodName}: Cannot sell ${item.quantity}. Only ${stock} available in vehicle.`
        );
        return;
      }
    }

    // Ensure we have a valid idempotency key
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `sale-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const saleItems: SaleItem[] = items.map((item) => {
        const prod = products.find((p) => p.id === item.productId)!;
        return {
          productId: item.productId,
          productName: prod ? prod.name : 'Product',
          unit: prod ? prod.unit : 'packet',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        };
      });

      await recordSale({
        tripId: activeTrip.id,
        shopId: effectiveShopId,
        shopName: targetShop ? targetShop.name : 'Retail Shop',
        items: saleItems,
        subtotal,
        discount,
        total,
        paidAmount: paymentMethod === 'Due' ? 0 : paidNow,
        remainingDue,
        paymentMethod,
        idempotencyKey: idempotencyKeyRef.current,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mobileStep === 2 ? 'Payment Method' : 'Record Sale'}
      description={
        targetShop
          ? `${targetShop.name} • Outstanding: ₹${targetShop.outstanding.toLocaleString('en-IN')}`
          : 'Deliver bakery products and collect payment'
      }
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Context-aware Shop Header if not pre-locked */}
        {!initialShopId && (
          <div>
            <Select
              label="Select Retail Shop"
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              required
            >
              <option value="">-- Choose Shop --</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name} ({shop.owner}) — Outstanding: ₹
                  {shop.outstanding.toLocaleString('en-IN')}
                </option>
              ))}
            </Select>
          </div>
        )}

        {!activeTrip && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            ⚠️ No active or loaded trip found. Sales can only be recorded when a vehicle is on an active trip.
          </div>
        )}

        {/* ============================================================ */}
        {/* MOBILE VIEW: STEP 1 (PRODUCTS SELECTION WITH STEPPER CARDS) */}
        {/* ============================================================ */}
        <div className={`md:hidden space-y-3 ${mobileStep === 1 ? 'block' : 'hidden'}`}>
          {/* Quick Product Adder Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Quick Add Products
              </span>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="text-xs font-semibold text-[#172554] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Other
              </button>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {availableProducts.slice(0, 6).map((p) => {
                const inCart = items.some((i) => i.productId === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddItem(p.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 transition-colors flex items-center gap-1.5 ${
                      inCart
                        ? 'bg-blue-50 border-blue-300 text-[#172554] font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{p.name.split(' ')[0]} (₹{p.sellingPrice})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Cards with large Stepper controls as per Section 6 */}
          <div className="space-y-2.5">
            {items.map((item, idx) => {
              const prod = products.find((p) => p.id === item.productId);
              const lineTotal = item.quantity * item.unitPrice;
              if (!prod) return null;
              const vehicleStock = getVehicleStock(item.productId);
              const itemError = getItemError(item);

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border bg-white shadow-2xs space-y-3 ${
                    itemError ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{prod.name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Available in vehicle: {vehicleStock} {formatUnit(prod.unit, vehicleStock)}
                      </p>
                      <span className="text-xs text-slate-500">
                        ₹{item.unitPrice} / {prod.unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 block">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-[11px] text-rose-600 hover:underline font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper [-] Qty [+] */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-xs font-medium text-slate-500">Quantity:</span>
                      {itemError && (
                        <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                          {itemError}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-base font-bold select-none transition-transform active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={vehicleStock > 0 ? vehicleStock : undefined}
                        value={isNaN(item.quantity) ? '' : item.quantity}
                        onChange={(e) => handleQuantityChange(idx, e.target.value === '' ? 0 : parseInt(e.target.value))}
                        className={`w-14 text-center font-bold text-sm py-1.5 border rounded-lg ${
                          itemError
                            ? 'border-rose-400 bg-rose-50 text-rose-900'
                            : 'border-slate-200 bg-slate-50 text-slate-900'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                        disabled={vehicleStock > 0 && item.quantity >= vehicleStock}
                        className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-base font-bold select-none transition-transform active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Product button */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => handleAddItem()}
            className="w-full py-2.5"
          >
            + Add Another Product
          </Button>

          {/* Order Summary (Section 6) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 mt-3">
            <div className="flex justify-between text-slate-600 text-xs">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 text-xs">
              <span>Discount (₹):</span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount || ''}
                placeholder="0"
                onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 text-right rounded border border-slate-200 bg-white py-1 px-2 text-xs font-semibold"
              />
            </div>

            <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
              <span>Total:</span>
              <span className="text-[#172554] text-base font-black">
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Primary Mobile Button: Continue to Payment */}
          <div className="pt-2">
            <Button
              type="button"
              variant="accent"
              size="lg"
              className="w-full py-3 text-sm font-bold shadow-md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setMobileStep(2)}
              disabled={items.length === 0 || hasInvalidQuantity || !activeTrip}
            >
              Continue to Payment (₹{total.toLocaleString('en-IN')})
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MOBILE VIEW: STEP 2 (PAYMENT STEP AFTER SALE - Section 7)    */}
        {/* ============================================================ */}
        <div className={`md:hidden space-y-4 ${mobileStep === 2 ? 'block' : 'hidden'}`}>
          {/* Sale Total Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Sale Total</span>
              <span className="text-2xl font-black text-slate-900">
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileStep(1)}
              className="text-xs font-semibold text-[#172554] hover:underline"
            >
              Edit Items
            </button>
          </div>

          {/* Large touch-friendly payment controls (Section 7) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['Cash', 'UPI', 'Card', 'Bank Transfer', 'Due', 'Partial'] as PaymentMethod[]).map(
                (method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`p-3 rounded-xl text-center font-bold text-xs border transition-colors flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-[#172554] text-white border-[#172554] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{method}</span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Partial payment details */}
          {paymentMethod === 'Partial' && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-amber-900">Sale Total:</span>
                <span className="font-bold text-slate-900">₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-amber-900">Paid Now:</span>
                <input
                  type="number"
                  min="0"
                  max={total}
                  value={paidNow}
                  onChange={(e) => setPaidNow(Math.min(total, parseInt(e.target.value) || 0))}
                  className="w-32 text-right font-bold text-sm rounded-lg border border-amber-300 bg-white py-1.5 px-2 text-slate-900"
                />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-amber-200 text-xs">
                <span className="font-bold text-rose-700">Remaining Due:</span>
                <span className="font-black text-rose-700 text-base">
                  ₹{remainingDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1 py-3"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setMobileStep(1)}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="flex-2 py-3 font-bold shadow-md"
              isLoading={isSubmitting}
              disabled={isSubmitting || hasInvalidQuantity || !activeTrip || (!initialShopId && !selectedShopId)}
            >
              {isSubmitting ? 'Processing Sale...' : 'Complete Sale'}
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* DESKTOP VIEW: COMBINED HIGH-DENSITY TABLE AND SUMMARY        */}
        {/* ============================================================ */}
        <div className="hidden md:block space-y-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
              Products Delivered
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleAddItem()}
            >
              Add Product
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-2 w-28 text-center">Qty</th>
                  <th className="py-2.5 px-2 w-24 text-right">Price (₹)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Total</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  const prod = products.find((p) => p.id === item.productId);
                  const vehicleStock = getVehicleStock(item.productId);
                  const itemError = getItemError(item);

                  return (
                    <tr key={idx} className={`hover:bg-slate-50/50 ${itemError ? 'bg-rose-50/30' : ''}`}>
                      <td className="py-2.5 px-3">
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full rounded border border-slate-200 bg-white py-1 px-2 text-xs font-medium text-slate-800"
                        >
                          {availableProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (₹{p.sellingPrice}/{p.unit})
                            </option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                          Available in vehicle: {vehicleStock} {formatUnit(prod?.unit, vehicleStock)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={vehicleStock > 0 ? vehicleStock : undefined}
                            value={isNaN(item.quantity) ? '' : item.quantity}
                            onChange={(e) => handleQuantityChange(idx, e.target.value === '' ? 0 : parseInt(e.target.value))}
                            className={`w-12 text-center rounded border py-0.5 px-1 text-xs font-bold ${
                              itemError
                                ? 'border-rose-400 bg-rose-50 text-rose-900'
                                : 'border-slate-200 text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                            disabled={vehicleStock > 0 && item.quantity >= vehicleStock}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        {itemError && (
                          <span className="text-[10px] text-rose-600 font-semibold block text-center mt-1">
                            {itemError}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-20 text-right rounded border border-slate-200 py-1 px-1 text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Desktop Summary & Payment */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between text-slate-600 text-xs">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 text-xs">
              <span>Discount (₹):</span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount || ''}
                placeholder="0"
                onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 text-right rounded border border-slate-200 bg-white py-1 px-2 text-xs font-semibold"
              />
            </div>

            <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Amount:</span>
              <span className="text-[#172554] text-base font-black">
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-6 gap-2">
              {(['Cash', 'UPI', 'Card', 'Bank Transfer', 'Due', 'Partial'] as PaymentMethod[]).map(
                (method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-1 rounded-lg text-center font-medium border text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#172554] text-white border-[#172554]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {paymentMethod === 'Partial' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
              <span>Paid Now:</span>
              <input
                type="number"
                min="0"
                max={total}
                value={paidNow}
                onChange={(e) => setPaidNow(Math.min(total, parseInt(e.target.value) || 0))}
                className="w-28 text-right font-bold rounded border border-amber-300 bg-white py-1 px-2 text-xs text-slate-900"
              />
              <span className="font-bold text-rose-700">
                Remaining: ₹{remainingDue.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting || (!initialShopId && !selectedShopId) || items.length === 0 || hasInvalidQuantity || !activeTrip}
            >
              {isSubmitting ? 'Processing Sale...' : `Complete Sale (₹${total.toLocaleString('en-IN')})`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
