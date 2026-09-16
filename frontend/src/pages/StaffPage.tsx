import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { Plus, Phone, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Staff, StaffRole, StaffStatus } from '../types';

export const StaffPage: React.FC = () => {
  const {
    staff,
    addStaff,
    updateStaff,
    archiveStaff,
    deleteStaff,
    isStaffInUse,
  } = useBakery();

  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Staff | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('Driver');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<StaffStatus>('Available');

  // Normal active staff list (deactivated staff are excluded)
  const activeStaff = staff.filter((s) => s.status !== 'Inactive' && s.isActive !== false);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setRole('Driver');
    setPhone('');
    setStatus('Available');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: Staff) => {
    setEditingStaff(member);
    setName(member.name);
    setRole(member.role);
    setPhone(member.phone);
    setStatus(member.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    if (editingStaff) {
      updateStaff(editingStaff.id, {
        name,
        role,
        phone,
        status,
      });
    } else {
      await addStaff({
        name,
        role,
        phone,
        status,
        isActive: true,
      });
    }

    setName('');
    setPhone('');
    setEditingStaff(null);
    setIsModalOpen(false);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;

    if (isStaffInUse(confirmTarget.id)) {
      await archiveStaff(confirmTarget.id);
    } else {
      await deleteStaff(confirmTarget.id);
    }

    setConfirmTarget(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Staff</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Delivery drivers, sales staff, and operational crew directory
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          + Add Staff
        </Button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {activeStaff.map((member) => (
          <Card
            key={member.id}
            hoverEffect
            className="p-4 sm:p-5 flex flex-col justify-between border-slate-200 bg-white shadow-2xs relative"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#172554] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">{member.name}</h3>
                    <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                      {member.role}
                    </span>
                  </div>
                </div>

                {/* Three-dot (⋮) menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveActionMenuId(activeActionMenuId === member.id ? null : member.id);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Staff actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeActionMenuId === member.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenuId(null);
                        }}
                      />
                      <div className="absolute right-0 top-7 z-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36 text-xs animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(null);
                            handleOpenEdit(member);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(null);
                            setConfirmTarget(member);
                          }}
                          className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove Staff
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <a
                  href={`tel:${member.phone}`}
                  className="inline-flex items-center gap-1.5 text-slate-600 hover:text-[#172554] font-medium transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{member.phone}</span>
                </a>
              </div>
            </div>
          </Card>
        ))}

        {activeStaff.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">No staff members found</h3>
            <p className="text-xs text-slate-500 mt-1">Click "+ Add Staff" to register delivery drivers or sales crew.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStaff(null);
        }}
        title={editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
        description={
          editingStaff
            ? 'Update staff member contact details and assigned role'
            : 'Register a driver or sales crew member'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <Input
              label="Full Name"
              placeholder="e.g. Anand Menon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
              >
                <option value="Driver">Driver</option>
                <option value="Sales Staff">Sales Staff</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </Select>
            </div>
            <div>
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StaffStatus)}
              >
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="Off Duty">Off Duty</option>
              </Select>
            </div>
          </div>

          <div>
            <Input
              label="Contact Phone"
              placeholder="e.g. 9847000199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setIsModalOpen(false);
                setEditingStaff(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              {editingStaff ? 'Save Changes' : 'Add Staff'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      {confirmTarget && (
        <Modal
          isOpen={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          title="Remove this staff member?"
          description="They will no longer be available for new trips or assignments. Existing trip and sales history will be preserved."
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
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmRemove}
              >
                Remove Staff
              </Button>
            </div>
          }
        >
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="font-bold text-slate-900">{confirmTarget.name}</div>
            <div className="text-slate-500">
              Role: {confirmTarget.role} • {confirmTarget.phone}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
