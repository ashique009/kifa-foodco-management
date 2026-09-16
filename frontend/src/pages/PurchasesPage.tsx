import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Receipt, Check, IndianRupee, Plus, ChevronRight, Calendar, Package } from 'lucide-react';
import { Purchase } from '../types';

export const PurchasesPage: React.FC = () => {
  const { suppliers, products, purchases, addPurchase } = useBakery();

  const [selectedSupplierId, setSelectedSupplierId] = useState(
    suppliers.find((s) => s.status === 'Active')?.id || suppliers[0]?.id || ''
  );
  const [selectedProductId, setSelectedProductId] = useState(
    products.find((p) => p.isActive)?.id || products[0]?.id || ''
  );
  const [batchNumber, setBatchNumber] = useState('B001');
  const [quantity, setQuantity] = useState(500);
  const [unitCost, setUnitCost] = useState(25);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const total = quantity * unitCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !selectedProduct || quantity <= 0) return;

    addPurchase({
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      batchNumber,
      quantity,
      unitCost,
      total,
    });

    // Reset batch number for next
    setBatchNumber(`B-${Math.floor(100 + Math.random() * 900)}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Purchases</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Record raw material and wholesale bakery stock intake into godown
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form as specified in Section 18 */}
        <div className="lg:col-span-1">
          <Card className="p-5">
            <CardHeader className="p-0 pb-3 border-b border-slate-100 mb-4">
              <CardTitle>Record Purchase</CardTitle>
              <p className="text-xs text-slate-500">Intake stock directly into godown</p>
            </CardHeader>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <Select
                  label="Supplier"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  required
                >
                  {suppliers
                    .filter((s) => s.status === 'Active')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </div>

              <div>
                <Select
                  label="Product"
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) setUnitCost(prod.purchasePrice);
                  }}
                  required
                >
                  {products
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </Select>
              </div>

              <div>
                <Input
                  label="Batch Number"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label={`Quantity (${selectedProduct?.unit || 'units'})`}
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              <div>
                <Input
                  label="Cost (₹ per unit)"
                  type="number"
                  min="1"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              {/* Total display */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <span className="font-semibold text-slate-700">Total:</span>
                <span className="text-base font-bold text-slate-900">
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>

              <Button type="submit" variant="primary" size="md" className="w-full">
                Save Purchase
              </Button>
            </form>
          </Card>
        </div>

        {/* Recent Purchases List */}
        <div className="lg:col-span-2">
          {/* MOBILE PRESENTATION: Clean Purchase Cards */}
          <div className="md:hidden space-y-2.5">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider px-1">
              Recent Godown Intake Records
            </h3>
            {purchases.map((pur) => (
              <Card
                key={pur.id}
                hoverEffect
                onClick={() => setSelectedPurchase(pur)}
                className="p-4 border-slate-200 bg-white cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-500 block">
                      {pur.invoiceNumber}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-0.5">
                      {pur.supplierName}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 block">
                      ₹{pur.total.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{pur.date}</span>
                  </span>
                  <span className="text-[#172554] font-semibold flex items-center gap-0.5 text-xs">
                    Details <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Card>
            ))}

            {purchases.length === 0 && (
              <Card className="p-8 text-center text-xs text-slate-500 border-slate-200">
                No purchase records found.
              </Card>
            )}
          </div>

          {/* DESKTOP PRESENTATION: Table */}
          <Card className="hidden md:block overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Recent Godown Intake Records
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">Batch</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map((pur) => (
                    <tr key={pur.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {pur.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {pur.supplierName}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{pur.productName}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{pur.batchNumber}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {pur.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{pur.total.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Purchase Detail Modal */}
      {selectedPurchase && (
        <Modal
          isOpen={!!selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          title={`Purchase ${selectedPurchase.invoiceNumber}`}
          description={`Intake from ${selectedPurchase.supplierName} on ${selectedPurchase.date}`}
          maxWidth="md"
          footer={
            <Button variant="secondary" size="sm" onClick={() => setSelectedPurchase(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-slate-500 block">Supplier</span>
                <span className="font-bold text-slate-900 text-sm">{selectedPurchase.supplierName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Date</span>
                <span className="font-semibold text-slate-800">{selectedPurchase.date}</span>
              </div>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Product Item:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedPurchase.productName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Batch Number:</span>
                <span className="font-mono font-semibold text-slate-700">{selectedPurchase.batchNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Intake Quantity:</span>
                <span className="font-bold text-slate-800">{selectedPurchase.quantity} units</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Unit Cost:</span>
                <span className="font-medium text-slate-700">₹{selectedPurchase.unitCost}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Total Purchase Value:</span>
                <span className="font-black text-slate-900 text-base">₹{selectedPurchase.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
