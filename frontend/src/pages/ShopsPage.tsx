import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Store, Plus, Phone, MapPin, ArrowRight, AlertCircle } from 'lucide-react';
import { Shop } from '../types';

interface ShopsPageProps {
  onSelectShop: (shopId: string) => void;
}

export const ShopsPage: React.FC<ShopsPageProps> = ({ onSelectShop }) => {
  const { shops, addShop } = useBakery();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add shop form state
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [route, setRoute] = useState('Town Route A');
  const [creditLimit, setCreditLimit] = useState(5000);
  const [initialOutstanding, setInitialOutstanding] = useState(0);

  const filteredShops = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.owner.toLowerCase().includes(search.toLowerCase()) ||
      s.route.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddShopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !owner || !phone) return;

    addShop({
      name,
      owner,
      phone,
      address: address || `${name}, Main Road`,
      route,
      creditLimit,
      outstanding: initialOutstanding,
    });

    // Reset
    setName('');
    setOwner('');
    setPhone('');
    setAddress('');
    setInitialOutstanding(0);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Shops</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Retail stores, supermarkets, balances and delivery route assignments
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          + Add Shop
        </Button>
      </div>

      {/* Search Bar */}
      <div className="w-full sm:w-80">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by shop name, owner or route..."
        />
      </div>

      {/* Shop Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShops.map((shop) => (
          <Card
            key={shop.id}
            hoverEffect
            className="p-5 flex flex-col justify-between cursor-pointer border border-slate-200 transition-all"
            onClick={() => onSelectShop(shop.id)}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#172554]" />
                    <h3 className="font-bold text-base text-slate-900">{shop.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Owner: <strong className="text-slate-700">{shop.owner}</strong>
                  </p>
                </div>
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  {shop.route}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{shop.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{shop.address}</span>
                </div>
              </div>
            </div>

            {/* Outstanding & View details */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">
                  Outstanding Balance
                </span>
                <span
                  className={`text-sm font-bold ${
                    shop.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  ₹{shop.outstanding.toLocaleString('en-IN')}
                </span>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectShop(shop.id);
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Account
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredShops.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          No shops found matching your search.
        </div>
      )}

      {/* Add Shop Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Retail Shop"
        description="Register a new retail customer store for bakery deliveries"
        maxWidth="md"
      >
        <form onSubmit={handleAddShopSubmit} className="space-y-4 text-xs">
          <div>
            <Input
              label="Shop Name"
              placeholder="e.g. Metro Supermarket"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Owner / Contact Name"
                placeholder="e.g. Suresh Kumar"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Phone Number"
                placeholder="e.g. 9876500099"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Shop Address"
              placeholder="e.g. Shop 12, Main Bazaar, Near Temple"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Delivery Route"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              >
                <option value="Town Route A">Town Route A</option>
                <option value="Town Route B">Town Route B</option>
                <option value="Highway East">Highway East</option>
                <option value="Suburban North">Suburban North</option>
              </Select>
            </div>
            <div>
              <Input
                label="Credit Limit (₹)"
                type="number"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <Input
              label="Opening Outstanding Balance (₹)"
              type="number"
              min="0"
              value={initialOutstanding}
              onChange={(e) => setInitialOutstanding(parseInt(e.target.value) || 0)}
              helperText="Set initial due balance if migrating from previous records"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save Shop
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
