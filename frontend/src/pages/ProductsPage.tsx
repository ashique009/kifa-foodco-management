import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Plus, Package, Edit2, ChevronRight, Trash2, MoreVertical, Archive, RefreshCw } from 'lucide-react';
import { Product, ProductUnit } from '../types';

export const ProductsPage: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, archiveProduct, isProductInUse } = useBakery();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<Product['category']>('Bread');
  const [unit, setUnit] = useState<ProductUnit>('packet');
  const [purchasePrice, setPurchasePrice] = useState<number>(20);
  const [sellingPrice, setSellingPrice] = useState<number>(30);
  const [reorderLevel, setReorderLevel] = useState<number>(100);

  const activeCount = products.filter((p) => p.isActive).length;
  const archivedCount = products.filter((p) => !p.isActive).length;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? p.isActive
        : !p.isActive;

    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setSku(`PROD-${String(products.length + 1).padStart(3, '0')}`);
    setCategory('Bread');
    setUnit('packet');
    setPurchasePrice(20);
    setSellingPrice(30);
    setReorderLevel(80);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category);
    setUnit(p.unit);
    setPurchasePrice(p.purchasePrice);
    setSellingPrice(p.sellingPrice);
    setReorderLevel(p.reorderLevel);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name,
        sku,
        category,
        unit,
        purchasePrice,
        sellingPrice,
        reorderLevel,
      });
    } else {
      addProduct({
        name,
        sku,
        category,
        unit,
        purchasePrice,
        sellingPrice,
        godownStock: 100, // Initial seed
        reorderLevel,
        isActive: true,
        batches: [
          {
            batchNumber: `B-${Date.now().toString().slice(-4)}`,
            expiryDate: '2026-09-20',
            quantity: 100,
          },
        ],
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Products</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Bakery item catalog, selling prices, wholesale costs and units
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          + Add Product
        </Button>
      </div>

      {/* Search and Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search products by name or SKU..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(['active', 'archived', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                statusFilter === tab
                  ? 'bg-[#172554] text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab === 'active'
                ? `Active (${activeCount})`
                : tab === 'archived'
                ? `Archived (${archivedCount})`
                : `All (${products.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE PRESENTATION: Clean Product Cards */}
      <div className="md:hidden space-y-2.5">
        {filteredProducts.map((p) => (
          <Card
            key={p.id}
            hoverEffect
            className="p-4 border-slate-200 bg-white active:scale-[0.99] transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleOpenEdit(p)}>
                <h3 className="font-bold text-sm text-slate-900 leading-snug">{p.name}</h3>
                <span className="font-mono text-xs text-slate-400 block mt-0.5">{p.sku}</span>
                <span className="text-xs text-slate-500 block mt-1">
                  {p.category} • {p.unit}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant={p.isActive ? 'success' : 'secondary'} size="sm">
                  {p.isActive ? 'Active' : 'Archived'}
                </Badge>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveActionMenuId(activeActionMenuId === p.id ? null : p.id);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Product actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {activeActionMenuId === p.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenuId(null);
                        }}
                      />
                      <div className="absolute right-0 top-7 z-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-32 text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(null);
                            handleOpenEdit(p);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(null);
                            setConfirmTarget(p);
                          }}
                          className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div
              className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between cursor-pointer"
              onClick={() => handleOpenEdit(p)}
            >
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-500">
                  Wholesale <strong className="text-slate-700 font-semibold">₹{p.purchasePrice}</strong>
                </span>
                <span className="text-slate-900 font-bold text-sm">
                  Sale <strong className="text-amber-600 font-extrabold text-base">₹{p.sellingPrice}</strong>
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </Card>
        ))}

        {filteredProducts.length === 0 && (
          <Card className="p-8 text-center text-xs text-slate-500 border-slate-200">
            No products found matching your filter.
          </Card>
        )}
      </div>

      {/* DESKTOP PRESENTATION: Table */}
      <Card className="hidden md:block overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Unit</th>
                <th className="py-3 px-3 text-right">Wholesale Cost</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">{p.sku}</td>
                  <td className="py-3 px-3 text-slate-600">{p.category}</td>
                  <td className="py-3 px-3 text-slate-600">{p.unit}</td>
                  <td className="py-3 px-3 text-right text-slate-500 font-medium">
                    ₹{p.purchasePrice}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                    ₹{p.sellingPrice}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Badge variant={p.isActive ? 'success' : 'secondary'} size="sm">
                      {p.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmTarget(p)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title={isProductInUse(p.id) ? 'Archive Product' : 'Delete Product'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        description="Configure product details, wholesale pricing and selling rates"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <Input
              label="Product Name"
              placeholder="e.g. Garlic Toast Bread"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="SKU Code"
                placeholder="e.g. BRD009"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
              />
            </div>
            <div>
              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Product['category'])}
              >
                <option value="Bread">Bread</option>
                <option value="Bun">Bun</option>
                <option value="Cake">Cake</option>
                <option value="Cookies & Rusk">Cookies &amp; Rusk</option>
                <option value="Snacks & Puffs">Snacks &amp; Puffs</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Select
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
              >
                <option value="packet">packet</option>
                <option value="piece">piece</option>
                <option value="box">box</option>
                <option value="kg">kg</option>
              </Select>
            </div>
            <div>
              <Input
                label="Cost Price (₹)"
                type="number"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Input
                label="Selling Price (₹)"
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Reorder Alert Threshold"
              type="number"
              min="1"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
              helperText="Alerts when godown stock drops below this number"
            />
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
            {editingProduct ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setIsModalOpen(false);
                    setConfirmTarget(editingProduct);
                  }}
                >
                  {isProductInUse(editingProduct.id) ? 'Archive Product' : 'Delete'}
                </Button>
                {!editingProduct.isActive && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={() => {
                      updateProduct(editingProduct.id, { isActive: true });
                      setIsModalOpen(false);
                    }}
                  >
                    Restore
                  </Button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md">
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      {confirmTarget && (
        <Modal
          isOpen={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          title={isProductInUse(confirmTarget.id) ? 'Archive Product?' : 'Delete Product?'}
          description={
            isProductInUse(confirmTarget.id)
              ? 'This product is already used in business records, so it cannot be permanently deleted. Archive it instead?'
              : `Are you sure you want to delete ${confirmTarget.name}?`
          }
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmTarget(null)}
              >
                Cancel
              </Button>
              {isProductInUse(confirmTarget.id) ? (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    archiveProduct(confirmTarget.id);
                    setConfirmTarget(null);
                  }}
                >
                  Archive Product
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    deleteProduct(confirmTarget.id);
                    setConfirmTarget(null);
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          }
        >
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="font-bold text-slate-900">{confirmTarget.name}</div>
            <div className="text-slate-500 font-mono">
              SKU: {confirmTarget.sku} • {confirmTarget.category}
            </div>
            {isProductInUse(confirmTarget.id) && (
              <p className="text-amber-800 text-[11px] pt-1">
                Existing historical records (sales, purchases, stock) will continue to display this product. It will no longer appear for new sales or trips.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
