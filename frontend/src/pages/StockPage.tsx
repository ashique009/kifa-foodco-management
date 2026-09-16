import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { Drawer } from '../components/ui/Modal';
import { SearchInput } from '../components/ui/Input';
import { Layers, AlertTriangle, Clock, ArrowRight, Package, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';

export const StockPage: React.FC = () => {
  const { products } = useBakery();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Categorize
  const lowStockProducts = products.filter((p) => p.godownStock <= p.reorderLevel);
  const nearExpiryProducts = products.filter((p) =>
    p.batches?.some((b) => b.expiryDate <= '2026-09-16')
  );

  const tabs = [
    { id: 'all', label: 'All Products', count: products.length },
    { id: 'low', label: 'Low Stock Alert', count: lowStockProducts.length },
    { id: 'expiry', label: 'Near Expiry (Within 48h)', count: nearExpiryProducts.length },
  ];

  const displayedProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    if (activeTab === 'low') return matchesSearch && p.godownStock <= p.reorderLevel;
    if (activeTab === 'expiry')
      return matchesSearch && p.batches?.some((b) => b.expiryDate <= '2026-09-16');
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Stock</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Godown inventory levels, active batches, and expiry tracking
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search stock..."
          />
        </div>
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedProducts.map((prod) => {
          const isLow = prod.godownStock <= prod.reorderLevel;
          const hasExpiring = prod.batches?.some((b) => b.expiryDate <= '2026-09-16');

          return (
            <Card
              key={prod.id}
              hoverEffect
              className={`p-5 flex flex-col justify-between cursor-pointer border transition-all ${
                isLow
                  ? 'border-amber-200 bg-white hover:border-amber-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              onClick={() => setSelectedProduct(prod)}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">{prod.sku}</span>
                    <h3 className="font-bold text-base text-slate-900 mt-0.5">{prod.name}</h3>
                  </div>
                  {isLow ? (
                    <Badge variant="warning" dot>
                      Low Stock
                    </Badge>
                  ) : hasExpiring ? (
                    <Badge variant="accent" dot>
                      Expiring Soon
                    </Badge>
                  ) : (
                    <Badge variant="success" dot>
                      In Stock
                    </Badge>
                  )}
                </div>

                {/* Stock Metric */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Available in Godown</span>
                    <span className="text-2xl font-black text-slate-900 mt-0.5">
                      {prod.godownStock}{' '}
                      <span className="text-xs font-normal text-slate-500">{prod.unit}s</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Reorder Level</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {prod.reorderLevel} {prod.unit}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {prod.batches.length} Active {prod.batches.length === 1 ? 'Batch' : 'Batches'}
                </span>
                <span className="text-[#172554] font-semibold flex items-center gap-1">
                  View Batches <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Product Stock Detail Drawer */}
      {selectedProduct && (
        <Drawer
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          title={selectedProduct.name}
          description={`SKU: ${selectedProduct.sku} • Category: ${selectedProduct.category}`}
          width="md"
          footer={
            <Button variant="secondary" size="sm" onClick={() => setSelectedProduct(null)}>
              Done
            </Button>
          }
        >
          <div className="space-y-5 text-xs">
            {/* High Level Stock Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block">Current Available Stock</span>
                  <span className="text-2xl font-black text-slate-900">
                    {selectedProduct.godownStock} {selectedProduct.unit}s
                  </span>
                </div>
                {selectedProduct.godownStock <= selectedProduct.reorderLevel ? (
                  <Badge variant="warning" dot>
                    Low Stock Alert
                  </Badge>
                ) : (
                  <Badge variant="success" dot>
                    Normal Level
                  </Badge>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-600">
                <span>Low Stock Threshold:</span>
                <span className="font-semibold">
                  {selectedProduct.reorderLevel} {selectedProduct.unit}s
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Standard Selling Price:</span>
                <span className="font-bold text-slate-900">
                  ₹{selectedProduct.sellingPrice} / {selectedProduct.unit}
                </span>
              </div>
            </div>

            {/* Batches Breakdown */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5">
                Active Batches &amp; Expiry
              </h4>

              <div className="space-y-2">
                {selectedProduct.batches.map((batch) => {
                  const isExpiringSoon = batch.expiryDate <= '2026-09-16';
                  return (
                    <div
                      key={batch.batchNumber}
                      className={`p-3 rounded-lg border flex items-center justify-between ${
                        isExpiringSoon
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            Batch {batch.batchNumber}
                          </span>
                          {isExpiringSoon && (
                            <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-semibold">
                              Expiring Soon
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Expiry: <strong>{batch.expiryDate}</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-900 text-sm">
                          {batch.quantity} {selectedProduct.unit}s
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};
