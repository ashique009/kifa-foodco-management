import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select, SearchInput } from '../components/ui/Input';
import { Building2, Plus, Phone, MapPin, IndianRupee, MoreVertical, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { Supplier } from '../types';

export const SuppliersPage: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, archiveSupplier, isSupplierInUse } = useBakery();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Supplier | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [outstanding, setOutstanding] = useState(0);

  const activeCount = suppliers.filter((s) => s.status === 'Active').length;
  const archivedCount = suppliers.filter((s) => s.status === 'Inactive').length;

  const filteredSuppliers = suppliers.filter((sup) => {
    const matchesSearch =
      sup.name.toLowerCase().includes(search.toLowerCase()) ||
      sup.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      sup.address.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? sup.status === 'Active'
        : sup.status === 'Inactive';

    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setAddress('');
    setOutstanding(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setContactPerson(sup.contactPerson);
    setPhone(sup.phone);
    setAddress(sup.address);
    setOutstanding(sup.outstanding);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        name,
        contactPerson,
        phone,
        address,
        outstanding,
      });
    } else {
      addSupplier({
        name,
        contactPerson,
        phone,
        address,
        status: 'Active',
        outstanding,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Suppliers</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Flour mills, dairy, yeast, sugar and packaging material vendors
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          + Add Supplier
        </Button>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search suppliers by name or contact..."
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
                : `All (${suppliers.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredSuppliers.map((sup) => (
          <Card key={sup.id} hoverEffect className="p-4 sm:p-5 flex flex-col justify-between border-slate-200 bg-white shadow-2xs">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="cursor-pointer min-w-0 flex-1" onClick={() => handleOpenEdit(sup)}>
                  <h3 className="font-bold text-base text-slate-900 leading-snug">{sup.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{sup.contactPerson}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={sup.status === 'Active' ? 'success' : 'secondary'} size="sm">
                    {sup.status === 'Active' ? 'Active' : 'Archived'}
                  </Badge>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveActionMenuId(activeActionMenuId === sup.id ? null : sup.id);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      title="Supplier actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeActionMenuId === sup.id && (
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
                              handleOpenEdit(sup);
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
                              setConfirmTarget(sup);
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

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-slate-600">
                <a
                  href={`tel:${sup.phone}`}
                  className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#172554] font-medium transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sup.phone}</span>
                </a>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sup.address}</span>
                </div>
              </div>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Payable Balance:</span>
              <span className="font-bold text-slate-900 text-sm">
                ₹{sup.outstanding.toLocaleString('en-IN')}
              </span>
            </div>
          </Card>
        ))}

        {filteredSuppliers.length === 0 && (
          <Card className="p-8 text-center text-xs text-slate-500 border-slate-200 col-span-full">
            No suppliers found matching your filter.
          </Card>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        description={editingSupplier ? 'Update supplier contact details and accounts' : 'Register a raw material or packaging vendor'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <Input
              label="Supplier Company Name"
              placeholder="e.g. Apex Yeast & Flavours"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Contact Person"
                placeholder="e.g. Mohan Das"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Phone Number"
                placeholder="e.g. 9845099881"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Address / Location"
              placeholder="e.g. Industrial Area Phase 1"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
            {editingSupplier ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setIsModalOpen(false);
                    setConfirmTarget(editingSupplier);
                  }}
                >
                  {isSupplierInUse(editingSupplier.id) ? 'Archive Supplier' : 'Delete'}
                </Button>
                {editingSupplier.status === 'Inactive' && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={() => {
                      updateSupplier(editingSupplier.id, { status: 'Active' });
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
                {editingSupplier ? 'Save Changes' : 'Save Supplier'}
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
          title={isSupplierInUse(confirmTarget.id) ? 'Archive Supplier?' : 'Delete Supplier?'}
          description={
            isSupplierInUse(confirmTarget.id)
              ? 'This supplier has historical purchase records, so it cannot be permanently deleted. Archive it instead?'
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
              {isSupplierInUse(confirmTarget.id) ? (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    archiveSupplier(confirmTarget.id);
                    setConfirmTarget(null);
                  }}
                >
                  Archive Supplier
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    deleteSupplier(confirmTarget.id);
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
            <div className="text-slate-500">Contact: {confirmTarget.contactPerson} • {confirmTarget.phone}</div>
            {isSupplierInUse(confirmTarget.id) && (
              <p className="text-amber-800 text-[11px] pt-1">
                Historical purchase records will continue to display this supplier. It will no longer appear when creating new purchases.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
