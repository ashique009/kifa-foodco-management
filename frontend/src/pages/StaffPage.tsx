import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { Plus, Phone, MoreVertical, Edit2, Trash2, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Staff, StaffRole, StaffStatus } from '../types';

export const StaffPage: React.FC = () => {
  const {
    staff,
    addStaff,
    updateStaff,
    archiveStaff,
    deleteStaff,
    isStaffInUse,
    currentUser,
    isAdmin,
    canManage,
  } = useBakery();

  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Staff | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<StaffRole>('Driver');
  const [status, setStatus] = useState<StaffStatus>('Available');

  // Normal active staff list (deactivated staff are excluded)
  const activeStaff = staff.filter((s) => s.status !== 'Inactive' && s.isActive !== false);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setPhone('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRole('Driver');
    setStatus('Available');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (member: Staff) => {
    setEditingStaff(member);
    setName(member.name);
    setRole(member.role === 'Admin' ? 'Sales Staff' : member.role);
    setPhone(member.phone);
    setStatus(member.status);
    setUsername(member.username || '');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    // Client-side validations
    if (!cleanName) {
      setFormError('Staff name is required.');
      return;
    }

    if (!cleanPhone) {
      setFormError('Phone number is required.');
      return;
    }

    if (!editingStaff) {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        setFormError('Username is required and must be at least 3 characters.');
        return;
      }

      // Check duplicate username against active staff list for instant validation
      const isDuplicate = staff.some(
        (s) => s.isActive !== false && s.status !== 'Inactive' && s.username && s.username.toLowerCase() === cleanUsername
      );
      if (isDuplicate) {
        setFormError('Username already exists. Please choose a different username.');
        return;
      }

      if (!password) {
        setFormError('Password is required.');
        return;
      }

      if (password.length < 6) {
        setFormError('Password is required and must be at least 6 characters.');
        return;
      }

      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        updateStaff(editingStaff.id, {
          name: cleanName,
          role,
          phone: cleanPhone,
          status,
        });
      } else {
        await addStaff({
          name: cleanName,
          role,
          phone: cleanPhone,
          username: username.trim().toLowerCase(),
          password,
          confirmPassword,
          status,
          isActive: true,
        });
      }

      // Clear password states immediately
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setName('');
      setPhone('');
      setUsername('');
      setEditingStaff(null);
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save staff member. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Staff Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage delivery drivers, sales crew, and login credentials
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAdd}
          >
            + Add Staff
          </Button>
        )}
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
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {member.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-800 border border-blue-200">
                        {member.role}
                      </span>
                      {member.username && (
                        <span className="text-xs text-slate-500 font-mono">
                          @{member.username}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Three-dot (⋮) menu - Manager or Admin (Admin accounts protected from Manager) */}
                {canManage && (isAdmin || member.role !== 'Admin') && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveActionMenuId(
                          activeActionMenuId === member.id ? null : member.id
                        );
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
                )}
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <a
                  href={`tel:${member.phone}`}
                  className="inline-flex items-center gap-1.5 text-slate-600 hover:text-[#172554] font-medium transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{member.phone || 'No phone'}</span>
                </a>

                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    member.status === 'Available'
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      member.status === 'Available'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  {member.status}
                </span>
              </div>
            </div>
          </Card>
        ))}

        {activeStaff.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">No staff members found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Click "+ Add Staff" to register drivers or sales staff.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setEditingStaff(null);
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setShowConfirmPassword(false);
            setFormError(null);
          }
        }}
        title={editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
        description={
          editingStaff
            ? 'Update staff member contact details and assigned role'
            : 'Register a driver or sales crew member with login credentials'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="text-[11px] mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          {/* Section 1: Staff Information */}
          <div className="space-y-3">
            <div className="pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Staff Information
              </span>
            </div>

            <div>
              <Input
                label="Full Name"
                placeholder="e.g. Anand Menon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Contact Phone"
                  placeholder="e.g. 9847000199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <Select
                  label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                >
                  <option value="Driver">Driver</option>
                  <option value="Sales Staff">Sales Staff</option>
                  <option value="Manager">Manager</option>
                </Select>
              </div>
            </div>

            {editingStaff && (
              <div>
                <Select
                  label="Operational Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StaffStatus)}
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="Off Duty">Off Duty</option>
                </Select>
              </div>
            )}
          </div>

          {/* Section 2: Login Credentials (Only on creation) */}
          {!editingStaff && (
            <div className="pt-2 space-y-3">
              <div className="pb-1 border-b border-slate-100 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Login Credentials
                </span>
              </div>

              <div>
                <Input
                  label="Username"
                  placeholder="e.g. anand.driver"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  helperText="Unique username used to sign in to the application."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-[28px] text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-[28px] text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={isSubmitting}
              onClick={() => {
                setIsModalOpen(false);
                setEditingStaff(null);
                setPassword('');
                setConfirmPassword('');
                setShowPassword(false);
                setShowConfirmPassword(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : editingStaff
                ? 'Save Changes'
                : 'Create Staff'}
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
            {confirmTarget.username && (
              <div className="text-slate-400 font-mono text-[11px]">
                @{confirmTarget.username}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
