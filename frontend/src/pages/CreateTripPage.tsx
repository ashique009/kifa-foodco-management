import React, { useState, useEffect } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Plus, Trash2, ArrowLeft, Check, Store } from 'lucide-react';
import { TripLoadedItem, TripShop } from '../types';
import { getTodayIsoString } from '../utils/date';

interface CreateTripPageProps {
  onBack: () => void;
  onTripCreated: (tripId: string) => void;
}

export const CreateTripPage: React.FC<CreateTripPageProps> = ({ onBack, onTripCreated }) => {
  const { vehicles, staff, products, shops, createTrip, showToast } = useBakery();

  // Form states
  const [date, setDate] = useState(() => getTodayIsoString());
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loadItems, setLoadItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);

  // Synchronize initial selections when context data loads
  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      const avail = vehicles.find((v) => v.status === 'Available') || vehicles[0];
      if (avail) setSelectedVehicleId(avail.id);
    }
  }, [vehicles, selectedVehicleId]);

  useEffect(() => {
    if (!selectedDriverId && staff.length > 0) {
      const avail =
        staff.find((s) => s.role === 'Driver' && s.status === 'Available' && s.isActive !== false) ||
        staff.find((s) => s.role === 'Driver' && s.status !== 'Inactive' && s.isActive !== false);
      if (avail) setSelectedDriverId(avail.id);
    }
  }, [staff, selectedDriverId]);

  useEffect(() => {
    if (!selectedStaffId && staff.length > 0) {
      const avail =
        staff.find((s) => s.role === 'Sales Staff' && s.status === 'Available' && s.isActive !== false) ||
        staff.find((s) => (s.role === 'Sales Staff' || s.role === 'Manager') && s.status !== 'Inactive' && s.isActive !== false);
      if (avail) setSelectedStaffId(avail.id);
    }
  }, [staff, selectedStaffId]);

  useEffect(() => {
    if (selectedShopIds.length === 0 && shops.length > 0) {
      setSelectedShopIds(shops.map((s) => s.id).filter(Boolean));
    }
  }, [shops, selectedShopIds.length]);

  useEffect(() => {
    if (loadItems.length === 0 && products.length > 0) {
      const active = products.filter((p) => p.isActive);
      if (active.length > 0) {
        setLoadItems(
          active.slice(0, 2).map((p) => ({
            productId: p.id,
            quantity: Math.min(50, p.godownStock || 10),
          }))
        );
      }
    }
  }, [products, loadItems.length]);

  const activeProducts = products.filter((p) => p.isActive);

  const handleAddProductRow = () => {
    const unpicked = activeProducts.find((p) => !loadItems.some((li) => li.productId === p.id));
    if (unpicked) {
      setLoadItems((prev) => [
        ...prev,
        { productId: unpicked.id, quantity: Math.min(30, unpicked.godownStock || 10) },
      ]);
    } else if (activeProducts[0]) {
      setLoadItems((prev) => [
        ...prev,
        { productId: activeProducts[0].id, quantity: Math.min(30, activeProducts[0].godownStock || 10) },
      ]);
    }
  };

  const handleRemoveProductRow = (index: number) => {
    setLoadItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: string) => {
    setLoadItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, productId } : item))
    );
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setLoadItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
  };

  const toggleShop = (shopId: string) => {
    setSelectedShopIds((prev) =>
      prev.includes(shopId) ? prev.filter((id) => id !== shopId) : [...prev, shopId]
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if any product quantity exceeds stock or is invalid
  const hasStockErrors = loadItems.some((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const avail = prod?.godownStock ?? 0;
    return item.quantity <= 0 || item.quantity > avail;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    const driver = staff.find((s) => s.id === selectedDriverId);
    const salesRep = staff.find((s) => s.id === selectedStaffId);

    if (!vehicle) {
      showToast('error', 'Vehicle Required', 'Please select an available delivery vehicle.');
      return;
    }
    if (!driver) {
      showToast('error', 'Driver Required', 'Please select an available driver.');
      return;
    }
    if (!salesRep) {
      showToast('error', 'Sales Staff Required', 'Please select an available sales staff member.');
      return;
    }
    if (selectedShopIds.length === 0) {
      showToast('error', 'Shops Required', 'Please select at least one shop for this route.');
      return;
    }
    if (loadItems.length === 0) {
      showToast('error', 'Products Required', 'Please add at least one product to load.');
      return;
    }

    // Frontend stock limit validation
    for (const item of loadItems) {
      const prod = products.find((p) => p.id === item.productId);
      const avail = prod?.godownStock ?? 0;
      if (item.quantity <= 0) {
        showToast('error', 'Invalid Quantity', `Quantity for ${prod?.name || 'product'} must be greater than 0.`);
        return;
      }
      if (item.quantity > avail) {
        showToast('error', 'Stock Exceeded', `Only ${avail} ${prod?.unit || 'packet'}s available in godown for ${prod?.name}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formattedLoadedItems: TripLoadedItem[] = loadItems
        .map((li) => {
          const prod = products.find((p) => p.id === li.productId);
          if (!prod) return null;
          return {
            productId: li.productId,
            productName: prod.name,
            unit: prod.unit,
            loadedQty: li.quantity,
            soldQty: 0,
            returnedQty: 0,
            unitPrice: prod.sellingPrice,
          };
        })
        .filter((item): item is TripLoadedItem => Boolean(item));

      const formattedShops: TripShop[] = selectedShopIds
        .map((sId, index): TripShop | null => {
          const sh = shops.find((s) => s.id === sId);
          if (!sh) return null;
          return {
            shopId: sh.id,
            shopName: sh.name,
            ownerName: sh.owner,
            phone: sh.phone,
            address: sh.address,
            sequence: index + 1,
            status: 'pending',
          };
        })
        .filter((s): s is TripShop => s !== null);

      const newTrip = await createTrip({
        date,
        startDate: date,
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plateNumber,
        driverId: driver.id,
        driverName: driver.name,
        staffId: salesRep.id,
        staffName: salesRep.name,
        status: 'Loaded',
        shops: formattedShops,
        loadedItems: formattedLoadedItems,
      });

      if (newTrip) {
        onTripCreated(newTrip.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Trip</h1>
          <p className="text-xs text-slate-500">Plan delivery vehicle, load bakery stock, and select shops</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Trip Details */}
        <Card className="p-5">
          <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
            <CardTitle>1. Trip Details</CardTitle>
            <p className="text-xs text-slate-500">Assign vehicle and crew for this route</p>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Select
                label="Vehicle"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                required
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber} ({v.model}) — {v.status === 'Available' ? 'Available ✓' : v.status}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Select
                label="Driver"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                required
              >
                {staff
                  .filter(
                    (s) =>
                      s.role === 'Driver' &&
                      s.status !== 'Inactive' &&
                      s.isActive !== false
                  )
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.status === 'Available' ? 'Available ✓' : d.status}
                    </option>
                  ))}
              </Select>
            </div>

            <div>
              <Select
                label="Sales Staff"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                required
              >
                {staff
                  .filter(
                    (s) =>
                      (s.role === 'Sales Staff' || s.role === 'Manager') &&
                      s.status !== 'Inactive' &&
                      s.isActive !== false
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.status === 'Available' ? 'Available ✓' : s.status}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
        </Card>

        {/* Section 2: Products to Load */}
        <Card className="p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <CardTitle>2. Products to Load</CardTitle>
              <p className="text-xs text-slate-500">
                Specify quantities loaded from godown into delivery vehicle
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddProductRow}
            >
              + Add Product
            </Button>
          </div>

          <div className="space-y-3">
            {loadItems.map((item, index) => {
              const currentProd = products.find((p) => p.id === item.productId);
              const availableStock = currentProd?.godownStock ?? 0;
              const unit = currentProd?.unit || 'packet';
              const isExceeded = item.quantity > availableStock;
              const isZeroOrNegative = item.quantity <= 0;
              const hasError = isExceeded || isZeroOrNegative;

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border transition-colors ${
                    hasError ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Product
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white py-1.5 px-2.5 text-xs text-slate-800"
                      >
                        {products
                          .filter((p) => p.isActive || p.id === item.productId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Godown Stock: {p.godownStock} {p.unit}s)
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="w-36">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-500">
                          Quantity ({unit}s)
                        </label>
                        <span className="text-[10px] font-medium text-slate-400">
                          Max: {availableStock}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={availableStock}
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          handleQuantityChange(index, isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        className={`w-full rounded-md border py-1.5 px-2.5 text-xs text-center font-bold transition-colors ${
                          hasError
                            ? 'border-rose-400 bg-white text-rose-700 focus:outline-none focus:ring-1 focus:ring-rose-500'
                            : 'border-slate-300 bg-white text-slate-800'
                        }`}
                      />
                    </div>

                    {loadItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProductRow(index)}
                        className="mt-5 p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Stock validation messages */}
                  {isExceeded && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1.5 flex items-center gap-1">
                      <span>•</span> Only {availableStock} {unit}s available in godown.
                    </p>
                  )}
                  {isZeroOrNegative && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1.5 flex items-center gap-1">
                      <span>•</span> Quantity must be greater than 0.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Section 3: Shops on Route */}
        <Card className="p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <CardTitle>3. Select Shops on Route</CardTitle>
              <p className="text-xs text-slate-500">
                Choose shops to visit. {selectedShopIds.length} shops selected.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedShopIds(shops.map((s) => s.id))}
                className="text-xs text-[#172554] font-medium hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setSelectedShopIds([])}
                className="text-xs text-slate-500 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {shops.map((shop) => {
              const isChecked = selectedShopIds.includes(shop.id);
              return (
                <div
                  key={shop.id}
                  onClick={() => toggleShop(shop.id)}
                  className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-[#172554] bg-blue-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        isChecked
                          ? 'bg-[#172554] border-[#172554] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{shop.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {shop.owner} • {shop.route}
                      </p>
                    </div>
                  </div>

                  {shop.outstanding > 0 ? (
                    <span className="text-[11px] font-semibold text-rose-600">
                      Due ₹{shop.outstanding.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-medium">Clear</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Primary Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" size="lg" onClick={onBack}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={
              selectedShopIds.length === 0 ||
              loadItems.length === 0 ||
              hasStockErrors ||
              isSubmitting
            }
          >
            {isSubmitting ? 'Creating...' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </div>
  );
};
