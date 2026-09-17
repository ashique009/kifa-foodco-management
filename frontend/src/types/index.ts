export type ProductUnit = 'packet' | 'box' | 'piece' | 'kg';

export interface Batch {
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
}

export type ProductCategory = 'Bread' | 'Bun' | 'Cake' | 'Cookies & Rusk' | 'Snacks & Puffs' | 'General' | (string & {});

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  unit: ProductUnit;
  purchasePrice: number;
  sellingPrice: number;
  godownStock: number;
  reorderLevel: number;
  isActive: boolean;
  batches: Batch[];
}

export interface Shop {
  id: string;
  name: string;
  owner: string;
  phone: string;
  address: string;
  route: string;
  outstanding: number;
  creditLimit: number;
  totalSales: number;
  totalCollected: number;
  createdAt: string;
}

export type VehicleStatus = 'Available' | 'On Trip' | 'Maintenance' | 'Not Available';

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  capacityKg: number;
  status: VehicleStatus;
  currentDriver?: string;
}

export type StaffRole = 'Admin' | 'Manager' | 'Sales Staff' | 'Driver';
export type StaffStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Inactive';

export interface Staff {
  id: string;
  name: string;
  username?: string;
  role: StaffRole;
  phone: string;
  status: StaffStatus;
  isActive?: boolean;
  userId?: string;
}

export type TripStatus = 'Draft' | 'Loaded' | 'In Progress' | 'Completed' | 'Cancelled';

export interface TripShop {
  shopId: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  sequence: number;
  status: 'pending' | 'completed' | 'skipped';
  saleId?: string;
  paymentReceived?: number;
  returnRecorded?: boolean;
  visitedAt?: string;
}

export interface TripLoadedItem {
  productId: string;
  productName: string;
  unit: ProductUnit;
  loadedQty: number;
  soldQty: number;
  damagedQty?: number;
  returnedQty: number;
  unitPrice: number;
  vanBalance?: number;
}

export interface Trip {
  id: string;
  tripNumber: string;
  date: string;
  startDate?: string;
  endDate?: string;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  staffId: string;
  staffName: string;
  status: TripStatus;
  shops: TripShop[];
  loadedItems: TripLoadedItem[];
  startedAt?: string;
  completedAt?: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Due' | 'Partial';

export interface SaleItem {
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  tripId?: string;
  shopId: string;
  shopName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  remainingDue: number;
  paymentMethod: PaymentMethod;
  date: string;
  time: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  shopId: string;
  shopName: string;
  saleId?: string;
  tripId?: string;
  amount: number;
  method: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  date: string;
  reference?: string;
  receivedBy?: string;
  notes?: string;
}

export type ReturnReason = 'Shop Return' | 'Damaged' | 'Expired';

export interface ReturnItem {
  id: string;
  tripId?: string;
  shopId: string;
  shopName: string;
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  reason: ReturnReason;
  date: string;
  notes?: string;
  idempotencyKey?: string;
  unitPrice?: number;
}

export type ExpenseCategory = 'Fuel' | 'Vehicle Repair' | 'Staff Expense' | 'Vehicle Wash' | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  vehiclePlate?: string;
  tripNumber?: string;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  status: 'Active' | 'Inactive';
  outstanding: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  unitCost: number;
  total: number;
  date: string;
}

export interface BusinessAlert {
  id: string;
  type: 'low_stock' | 'outstanding' | 'expiring';
  title: string;
  description: string;
  severity: 'warning' | 'danger' | 'info';
  linkTo?: string;
}

export interface ShopLedgerEntry {
  id: string;
  date: string;
  type: 'Sale' | 'Payment' | 'Return Credit';
  reference: string;
  description: string;
  debit: number; // Increases receivable
  credit: number; // Decreases receivable
  balance: number;
}
