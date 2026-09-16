import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { Car, Plus, Truck, CheckCircle2, Wrench } from 'lucide-react';
import { Vehicle, VehicleStatus } from '../types';

export const VehiclesPage: React.FC = () => {
  const { vehicles, addVehicle } = useBakery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [model, setModel] = useState('');
  const [capacityKg, setCapacityKg] = useState(1000);
  const [status, setStatus] = useState<VehicleStatus>('Available');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber || !model) return;

    addVehicle({
      plateNumber,
      model,
      capacityKg,
      status,
    });

    setPlateNumber('');
    setModel('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Vehicles</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Bakery delivery van fleet, maintenance status, and trip dispatch
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          + Add Vehicle
        </Button>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {vehicles.map((v) => (
          <Card key={v.id} hoverEffect className="p-4 sm:p-5 flex flex-col justify-between border-slate-200 bg-white shadow-2xs">
            <div>
              <div>
                <h3 className="font-bold text-base text-slate-900 tracking-tight">
                  {v.plateNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{v.model}</p>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payload:</span>
                  <span className="font-medium text-slate-800">{v.capacityKg} kg</span>
                </div>
                {v.currentDriver && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver:</span>
                    <span className="font-medium text-[#172554]">{v.currentDriver}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Delivery Vehicle"
        description="Register a new van or transport vehicle into the bakery fleet"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <Input
              label="Registration Plate Number"
              placeholder="e.g. KL-11-JK-7890"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              label="Vehicle Model / Make"
              placeholder="e.g. Tata Ace Gold / Bolero Maxi"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Capacity (kg)"
                type="number"
                min="100"
                value={capacityKg}
                onChange={(e) => setCapacityKg(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Select
                label="Initial Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              >
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="Maintenance">Maintenance</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save Vehicle
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
