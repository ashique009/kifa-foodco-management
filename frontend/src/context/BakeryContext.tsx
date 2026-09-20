import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import {
  Product,
  Shop,
  Vehicle,
  Staff,
  Trip,
  Sale,
  Payment,
  ReturnItem,
  Expense,
  Supplier,
  Purchase,
  BusinessAlert,
  TripStatus,
  TripShop,
  ShopLedgerEntry,
  ProductUnit,
} from '../types';
import {
  authApi,
  productsApi,
  stockApi,
  batchesApi,
  suppliersApi,
  purchasesApi,
  vehiclesApi,
  staffApi,
  shopsApi,
  tripsApi,
  salesApi,
  paymentsApi,
  returnsApi,
  settingsApi,
  BusinessSettings,
} from '../api';
import {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  AuthUser,
} from '../api/client';
import { generateIdempotencyKey } from '../utils/idempotency';
import { toBackendPaymentMethod, toFrontendPaymentMethod } from '../utils/payment';
import { toIsoDateString, formatTimeShort } from '../utils/date';
import { formatINR } from '../utils/formatters';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface BakeryContextType {
  // Auth state
  isAuthenticated: boolean;
  isLoadingData: boolean;
  isGlobalLoading: boolean;
  globalLoadingMessage?: string;
  globalLoadingSubMessage?: string;
  setGlobalLoading: (isLoading: boolean, message?: string) => void;
  currentUser: {
    id?: string;
    username?: string;
    name: string;
    role: string;
    userRole: 'admin' | 'manager' | 'driver' | 'sales_staff';
    isAdmin: boolean;
    isManager: boolean;
    canManage: boolean;
  };
  isAdmin: boolean;
  isManager: boolean;
  canManage: boolean;
  login: (user: any) => void;
  logout: () => void;
  refreshAllData: () => Promise<void>;

  // Entities
  products: Product[];
  shops: Shop[];
  vehicles: Vehicle[];
  staff: Staff[];
  trips: Trip[];
  sales: Sale[];
  payments: Payment[];
  returns: ReturnItem[];
  expenses: Expense[];
  suppliers: Supplier[];
  purchases: Purchase[];
  alerts: BusinessAlert[];

  // Toasts
  toasts: ToastNotification[];
  showToast: (type: ToastNotification['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;

  // Derived Business Metrics
  todaySalesTotal: number;
  todayCollectionTotal: number;
  totalOutstanding: number;
  activeTripsCount: number;
  paymentBreakdown: {
    cash: number;
    upi: number;
    card: number;
    bankTransfer: number;
  };

  createTrip: (tripData: Omit<Trip, 'id' | 'tripNumber'>) => Promise<Trip | null>;
  updateTripStatus: (tripId: string, status: TripStatus) => Promise<void>;
  markShopVisited: (tripId: string, shopId: string) => Promise<void>;
  recordSale: (saleData: Omit<Sale, 'id' | 'invoiceNumber' | 'date' | 'time'> & { idempotencyKey?: string }) => Promise<Sale | null>;
  receivePayment: (paymentData: Omit<Payment, 'id' | 'receiptNumber' | 'date'> & { idempotencyKey?: string }) => Promise<Payment | null>;
  recordReturn: (returnData: Omit<ReturnItem, 'id' | 'date'>) => Promise<ReturnItem | null>;
  recordTransitDamage: (
    tripId: string,
    data: {
      product_id: string;
      batch_id?: string;
      quantity: number;
      notes?: string;
      idempotency_key?: string;
    }
  ) => Promise<boolean>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  archiveProduct: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  isProductInUse: (id: string) => boolean;
  addShop: (shop: Omit<Shop, 'id' | 'totalSales' | 'totalCollected' | 'createdAt'>) => Promise<void>;
  addShopToActiveTrip: (
    tripId: string,
    shopData?: {
      name: string;
      owner?: string;
      phone?: string;
      address?: string;
      creditLimit?: number;
    },
    existingShopId?: string
  ) => Promise<{ success: boolean; shopId?: string }>;
  updateShop: (id: string, shop: Partial<Shop>) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  addStaff: (staffMember: Omit<Staff, 'id'> & { username?: string; password?: string; confirmPassword?: string; designation?: string }) => Promise<void>;
  updateStaff: (id: string, staffMember: Partial<Staff>) => void;
  archiveStaff: (id: string) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  isStaffInUse: (id: string) => boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  addPurchase: (purchase: Omit<Purchase, 'id' | 'invoiceNumber' | 'date'>) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  archiveSupplier: (id: string) => void;
  deleteSupplier: (id: string) => void;
  isSupplierInUse: (id: string) => boolean;
  getShopLedger: (shopId: string) => ShopLedgerEntry[];
  resetToDemoData: () => void;

  // Settings
  businessSettings: BusinessSettings;
  updateBusinessProfile: (data: {
    business_name: string;
    gstin?: string;
    phone: string;
    email?: string;
    address?: string;
  }) => Promise<void>;
  updateInvoiceSettings: (data: {
    invoice_prefix: string;
    receipt_prefix: string;
    invoice_footer_note?: string;
    receipt_footer_note?: string;
  }) => Promise<void>;
}

const BakeryContext = createContext<BakeryContextType | undefined>(undefined);

export const BakeryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [token, setTokenState] = useState<string | null>(() => getToken());

  // Helper to normalize and compute role flags
  const resolveUserPermissions = (rawRole?: string) => {
    const r = (rawRole || 'admin').toLowerCase().trim().replace(/\s+/g, '_');
    const isAdmin = r === 'admin';
    const isManager = r === 'manager';
    const isDriver = r === 'driver';
    const isSalesStaff = r === 'sales_staff';
    const canManage = isAdmin || isManager;
    const userRole: 'admin' | 'manager' | 'driver' | 'sales_staff' =
      isAdmin ? 'admin' : isManager ? 'manager' : isDriver ? 'driver' : 'sales_staff';
    
    let displayRole = 'Sales Staff';
    if (isAdmin) displayRole = 'Admin';
    else if (isManager) displayRole = 'Manager';
    else if (isDriver) displayRole = 'Driver';

    return {
      userRole,
      isAdmin,
      isManager,
      canManage,
      displayRole,
    };
  };

  const [currentUser, setCurrentUserState] = useState<{
    id?: string;
    username?: string;
    name: string;
    role: string;
    userRole: 'admin' | 'manager' | 'driver' | 'sales_staff';
    isAdmin: boolean;
    isManager: boolean;
    canManage: boolean;
  }>(() => {
    const stored = getStoredUser();
    if (stored) {
      const perms = resolveUserPermissions(stored.role);
      return {
        id: stored.id,
        username: stored.username,
        name: stored.name || stored.username,
        role: perms.displayRole,
        userRole: perms.userRole,
        isAdmin: perms.isAdmin,
        isManager: perms.isManager,
        canManage: perms.canManage,
      };
    }
    const defaultPerms = resolveUserPermissions('admin');
    return {
      name: 'Admin',
      role: 'Admin',
      userRole: defaultPerms.userRole,
      isAdmin: defaultPerms.isAdmin,
      isManager: defaultPerms.isManager,
      canManage: defaultPerms.canManage,
    };
  });

  const isAuthenticated = Boolean(token);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(() => Boolean(getToken()));
  const [loadingCount, setLoadingCount] = useState(0);
  const [loadingMessage, setLoadingMessageState] = useState<string | undefined>(undefined);

  const setGlobalLoading = useCallback((isLoading: boolean, message?: string) => {
    if (isLoading) {
      setLoadingMessageState(message);
      setLoadingCount((c) => c + 1);
    } else {
      setLoadingCount((c) => Math.max(0, c - 1));
    }
  }, []);

  const withGlobalLoading = useCallback(
    async <T,>(action: () => Promise<T>, message: string): Promise<T> => {
      setLoadingMessageState(message);
      setLoadingCount((c) => c + 1);
      try {
        return await action();
      } finally {
        setLoadingCount((c) => Math.max(0, c - 1));
      }
    },
    []
  );

  const actionLoading = { isLoading: loadingCount > 0, message: loadingMessage };
  const isGlobalLoading = (isAuthenticated && isLoadingData) || actionLoading.isLoading;
  const globalLoadingMessage = actionLoading.isLoading
    ? actionLoading.message || 'Processing request...'
    : 'Loading KIFA FoodCo...';
  const globalLoadingSubMessage = actionLoading.isLoading
    ? undefined
    : 'Syncing system records and inventory...';

  // Settings state
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    business_name: 'Kifa Food Co.',
    gstin: '32ABCDE1234F1Z5',
    phone: '0495-2760000',
    email: 'orders@kifafoodco.com',
    address: 'Industrial Estate Road, Malaparamba, Kozhikode, Kerala 673009',
    invoice_prefix: 'INV-',
    receipt_prefix: 'REC-',
    invoice_footer_note: 'Thank you for choosing Kifa Food Co.! Goods once sold will only be replaced if reported within 24 hours.',
    receipt_footer_note: 'Thank you for your payment. Keep this receipt for your records.',
  });

  // Entities state
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [alerts, setAlerts] = useState<BusinessAlert[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Toast handler
  const showToast = useCallback(
    (type: ToastNotification['type'], title: string, message?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      setTokenState(null);
      clearToken();
      showToast('error', 'Session Expired', 'Please sign in again to continue.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [showToast]);

  const login = (user: AuthUser) => {
    const activeToken = getToken();
    setTokenState(activeToken);
    const perms = resolveUserPermissions(user.role);
    setCurrentUserState({
      id: user.id,
      username: user.username,
      name: user.name || user.username,
      role: perms.displayRole,
      userRole: perms.userRole,
      isAdmin: perms.isAdmin,
      isManager: perms.isManager,
      canManage: perms.canManage,
    });
    showToast('success', 'Welcome Back', `Logged in as ${user.username}`);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    showToast('info', 'Logged Out', 'You have been signed out safely.');
  };

  // Helper to map backend status
  const mapBackendVehicleStatus = (status: string): Vehicle['status'] => {
    if (status === 'on_trip') return 'On Trip';
    if (status === 'maintenance') return 'Maintenance';
    if (status === 'not_available') return 'Not Available';
    return 'Available';
  };

  const mapBackendTripStatus = (status: string): TripStatus => {
    if (status === 'in_progress') return 'In Progress';
    if (status === 'loaded') return 'Loaded';
    if (status === 'completed') return 'Completed';
    if (status === 'cancelled') return 'Cancelled';
    return 'Draft';
  };

  const mapBackendStaffRole = (role?: string): Staff['role'] => {
    if (!role) return 'Sales Staff';
    const r = role.toLowerCase().trim().replace(/\s+/g, '_');
    if (r === 'driver') return 'Driver';
    if (r === 'manager') return 'Manager';
    if (r === 'admin') return 'Admin';
    return 'Sales Staff';
  };

  const mapStaffRoleToBackend = (role?: string): string => {
    if (!role) return 'sales_staff';
    const r = role.toLowerCase().trim().replace(/\s+/g, '_');
    if (r === 'driver') return 'driver';
    if (r === 'manager') return 'manager';
    if (r === 'admin') return 'admin';
    return 'sales_staff';
  };

  // Scoped refresh: products + godown stock only (used by refreshAllData and
  // by lighter-weight mutations like trip creation that only affect stock)
  const refreshProductsAndStock = useCallback(async () => {
    const [productsRes, stockRes] = await Promise.all([
      productsApi.getAll().catch(() => ({ products: [] })),
      stockApi.getGodownStock().catch(() => ({ stock: [] })),
    ]);

    const godownStockItems = stockRes.stock || [];
    const mappedProducts: Product[] = (productsRes.products || []).map((p: any) => {
      const productStockEntries = godownStockItems.filter(
        (s: any) => s.product_id === p.id
      );
      const totalGodownQty = productStockEntries.reduce(
        (sum: number, s: any) => sum + Number(s.quantity || 0),
        0
      );

      const batches = productStockEntries.map((s: any) => ({
        batchNumber: s.batch_number || 'Default',
        expiryDate: s.expiry_date ? s.expiry_date.slice(0, 10) : '2026-09-30',
        quantity: Number(s.quantity || 0),
      }));

      return {
        id: p.id,
        name: p.product_name,
        sku: p.sku || '',
        category: p.category || 'General',
        unit: (p.unit?.toLowerCase() as any) || 'packet',
        purchasePrice: Number(p.purchase_price || 0),
        sellingPrice: Number(p.selling_price || 0),
        godownStock: totalGodownQty,
        reorderLevel: 50,
        isActive: p.is_active !== false,
        batches,
      };
    });
    setProducts(mappedProducts);
  }, []);

  // FETCH ALL DATA FROM REAL BACKEND
  const refreshAllData = useCallback(async () => {
    if (!getToken()) return;
    setIsLoadingData(true);

    try {
      // 1. Fetch Products & Godown Stock in parallel
      await refreshProductsAndStock();

      // 2. Fetch Shops & Ledgers
      const shopsRes = await shopsApi.getAll().catch(() => ({ shops: [] }));
      const mappedShops: Shop[] = await Promise.all(
        (shopsRes.shops || []).map(async (s: any) => {
          let outstanding = 0;
          try {
            const ledgerRes = await shopsApi.getLedger(s.id);
            outstanding = Number(ledgerRes.outstanding || 0);
          } catch {
            outstanding = 0;
          }

          return {
            id: s.id,
            name: s.shop_name,
            owner: s.owner_name || '',
            phone: s.phone || '',
            address: s.address || '',
            route: 'Town Route',
            outstanding,
            creditLimit: Number(s.credit_limit || 0),
            totalSales: 0,
            totalCollected: 0,
            createdAt: s.created_at ? s.created_at.slice(0, 10) : '',
          };
        })
      );
      setShops(mappedShops);

      // 3. Fetch Vehicles & Staff
      const [vehiclesRes, staffRes] = await Promise.all([
        vehiclesApi.getAll().catch(() => ({ vehicles: [] })),
        staffApi.getAll().catch(() => ({ staff: [] })),
      ]);

      setVehicles(
        (vehiclesRes.vehicles || []).map((v: any) => ({
          id: v.id,
          plateNumber: v.vehicle_number,
          model: v.vehicle_name || 'Delivery Van',
          capacityKg: 1000,
          status: mapBackendVehicleStatus(v.status),
        }))
      );

      setStaff(
        (staffRes.staff || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          username: s.username || '',
          role: mapBackendStaffRole(s.role),
          phone: s.phone || '',
          status: s.is_available ? 'Available' : 'On Trip',
          isActive: s.is_active !== undefined ? Boolean(s.is_active) : true,
          userId: s.user_id,
        }))
      );

      // 4. Fetch Suppliers
      const suppliersRes = await suppliersApi.getAll().catch(() => ({ suppliers: [] }));
      setSuppliers(
        (suppliersRes.suppliers || []).map((sup: any) => ({
          id: sup.id,
          name: sup.supplier_name,
          contactPerson: sup.contact_person || '',
          phone: sup.phone || '',
          address: sup.address || '',
          status: sup.is_active ? 'Active' : 'Inactive',
          outstanding: 0,
        }))
      );

      // 4b. Fetch Purchases
      const purchasesRes = await purchasesApi.getAll().catch(() => ({ purchases: [] }));
      const mappedPurchases: Purchase[] = (purchasesRes.purchases || []).flatMap((pur: any) => {
        const items = pur.items || [];
        if (items.length === 0) {
          return [
            {
              id: pur.id,
              invoiceNumber: pur.purchase_number,
              supplierId: pur.supplier_id || '',
              supplierName: pur.supplier_name || 'Supplier',
              productId: '',
              productName: 'Raw Materials',
              batchNumber: 'Default',
              quantity: 1,
              unitCost: Number(pur.total_amount || 0),
              total: Number(pur.total_amount || 0),
              date: pur.purchase_date ? pur.purchase_date.slice(0, 10) : '',
            },
          ];
        }
        return items.map((it: any) => ({
          id: `${pur.id}-${it.id}`,
          invoiceNumber: pur.purchase_number,
          supplierId: pur.supplier_id || '',
          supplierName: pur.supplier_name || 'Supplier',
          productId: it.product_id || '',
          productName: it.product_name || 'Raw Material',
          batchNumber: it.batch_id ? it.batch_id.slice(0, 8) : 'Default',
          quantity: Number(it.quantity || 0),
          unitCost: Number(it.unit_cost || 0),
          total: Number(it.line_total || it.quantity * it.unit_cost || 0),
          date: pur.purchase_date ? pur.purchase_date.slice(0, 10) : '',
        }));
      });
      setPurchases(mappedPurchases);

      // 5. Fetch Trips with details
      const tripsRes = await tripsApi.getAll().catch(() => ({ trips: [] }));
      const rawTrips = tripsRes.trips || [];

      const detailedTrips: Trip[] = await Promise.all(
        rawTrips.map(async (t: any) => {
          // Fetch trip shops and trip stock
          const [tShopsRes, tStockRes] = await Promise.all([
            tripsApi.getShops(t.id).catch(() => ({ shops: [] })),
            tripsApi.getStock(t.id).catch(() => ({ stock: [] })),
          ]);

          const tripShops = (tShopsRes.shops || []).map((ts: any) => ({
            shopId: ts.shop_id,
            shopName: ts.shop_name,
            ownerName: ts.owner_name || '',
            phone: ts.phone || '',
            address: ts.address || '',
            sequence: ts.visit_order || 1,
            status: ts.visited_at ? ('completed' as const) : ('pending' as const),
            visitedAt: ts.visited_at ? new Date(ts.visited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          }));

          const loadedItems = (tStockRes.stock || []).map((st: any) => ({
            productId: st.product_id,
            productName: st.product_name,
            unit: (st.unit || 'packet') as ProductUnit,
            loadedQty: Number(st.loaded_quantity !== undefined ? st.loaded_quantity : st.quantity || 0),
            soldQty: Number(st.sold_quantity || 0),
            damagedQty: Number(st.damaged_quantity || 0),
            returnedQty: Number(st.returned_quantity || 0),
            vanBalance: Number(st.van_balance !== undefined ? st.van_balance : 0),
            unitPrice: Number(st.unit_price || 30),
          }));

          const tripDateStr = t.trip_date
            ? new Date(t.trip_date).toISOString().slice(0, 10)
            : '';

          return {
            id: t.id,
            tripNumber: `TRP-${t.id.slice(0, 8).toUpperCase()}`,
            date: tripDateStr,
            startDate: tripDateStr,
            vehicleId: t.vehicle_id,
            vehiclePlate: t.vehicle_number || '',
            driverId: t.driver_id || '',
            driverName: t.driver_name || 'Driver',
            staffId: t.sales_staff_id || '',
            staffName: t.sales_staff_name || 'Sales Staff',
            status: mapBackendTripStatus(t.status),
            shops: tripShops,
            loadedItems,
            startedAt: t.started_at
              ? new Date(t.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined,
            completedAt: t.completed_at
              ? new Date(t.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : undefined,
          };
        })
      );
      setTrips(detailedTrips);

      // 6. Fetch Sales, Payments, Returns & Settings
      const [salesRes, paymentsRes, returnsRes, settingsRes] = await Promise.all([
        salesApi.getAll().catch(() => ({ sales: [] })),
        paymentsApi.getAll().catch(() => ({ payments: [] })),
        returnsApi.getAll().catch(() => ({ returns: [] })),
        settingsApi.get().catch(() => ({ settings: null })),
      ]);

      if (settingsRes?.settings) {
        setBusinessSettings(settingsRes.settings);
      }

      const mappedSales: Sale[] = (salesRes.sales || []).map((s: any) => ({
        id: s.id,
        invoiceNumber: s.invoice_number,
        tripId: s.trip_id,
        shopId: s.shop_id,
        shopName: s.shop_name || 'Shop',
        items: (s.items || []).map((it: any) => ({
          productId: it.product_id,
          productName: it.product_name || 'Bakery Item',
          unit: 'packet' as const,
          quantity: Number(it.quantity || 0),
          unitPrice: Number(it.unit_price || 0),
          total: Number(it.line_total || 0),
        })),
        subtotal: Number(s.subtotal || 0),
        discount: Number(s.discount || 0),
        total: Number(s.total_amount || 0),
        paidAmount: Number(s.total_amount || 0),
        remainingDue: 0,
        paymentMethod: 'Cash',
        date: s.sale_date ? new Date(s.sale_date).toISOString().slice(0, 10) : '',
        time: s.sale_date ? new Date(s.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      }));
      setSales(mappedSales);

      const mappedPayments: Payment[] = (paymentsRes.payments || []).map((p: any) => {
        const method = toFrontendPaymentMethod(p.payment_method);

        const recNum = p.receipt_number || `REC-${p.id.slice(0, 8).toUpperCase()}`;

        return {
          id: p.id,
          receiptNumber: recNum,
          shopId: p.shop_id,
          shopName: p.shop_name || 'Shop',
          saleId: p.sale_id,
          amount: Number(p.amount || 0),
          method,
          date: p.payment_date ? new Date(p.payment_date).toISOString().slice(0, 10) : '',
          reference: p.reference_number || undefined,
        };
      });
      setPayments(mappedPayments);

      const mappedReturns: ReturnItem[] = (returnsRes.returns || []).flatMap((r: any) =>
        (r.items || []).map((it: any) => ({
          id: it.id,
          tripId: r.trip_id,
          shopId: r.shop_id,
          shopName: r.shop_name || 'Shop',
          productId: it.product_id,
          productName: it.product_name || 'Bakery Item',
          unit: 'packet' as const,
          quantity: Number(it.quantity || 0),
          reason: (r.reason === 'damaged' ? 'Damaged' : r.reason === 'expired' ? 'Expired' : 'Shop Return') as any,
          date: r.return_date ? new Date(r.return_date).toISOString().slice(0, 10) : '',
          notes: r.notes || undefined,
        }))
      );
      setReturns(mappedReturns);

      setAlerts([]);
    } catch (err: any) {
      console.error('Error loading backend data:', err);
      showToast('error', 'Data Sync Warning', err.message || 'Unable to sync some records.');
    } finally {
      setIsLoadingData(false);
    }
  }, [showToast]);

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshAllData();
    }
  }, [isAuthenticated, refreshAllData]);

  // Today's summary calculations
  const todayDateStr = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const todaySalesTotal = useMemo(() => {
    return sales
      .filter((s) => s.date === todayDateStr)
      .reduce((acc, curr) => acc + curr.total, 0);
  }, [sales, todayDateStr]);

  const todayCollectionTotal = useMemo(() => {
    return payments
      .filter((p) => p.date === todayDateStr)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [payments, todayDateStr]);

  const totalOutstanding = useMemo(() => {
    return shops.reduce((acc, curr) => acc + (curr.outstanding || 0), 0);
  }, [shops]);

  const activeTripsCount = useMemo(() => {
    return trips.filter((t) => t.status === 'In Progress' || t.status === 'Loaded').length;
  }, [trips]);

  const paymentBreakdown = useMemo(() => {
    const todayPayments = payments.filter((p) => p.date === todayDateStr);
    let cash = 0;
    let upi = 0;
    let card = 0;
    let bankTransfer = 0;

    todayPayments.forEach((p) => {
      if (p.method === 'Cash') cash += p.amount;
      else if (p.method === 'UPI') upi += p.amount;
      else if (p.method === 'Card') card += p.amount;
      else if (p.method === 'Bank Transfer') bankTransfer += p.amount;
    });

    return { cash, upi, card, bankTransfer };
  }, [payments, todayDateStr]);

  // =========================================================================
  // ACTIONS CONNECTED TO REAL BACKEND
  // =========================================================================

  // 1. Create Trip
  const createTrip = async (tripData: Omit<Trip, 'id' | 'tripNumber'>): Promise<Trip | null> => {
    return withGlobalLoading(async () => {
      try {
        // Map loaded items
        const itemsPayload = tripData.loadedItems
          .filter((item) => item.loadedQty > 0)
          .map((item) => ({
            product_id: item.productId,
            quantity: item.loadedQty,
          }));

        // Map shops
        const shopsPayload = tripData.shops
          .filter((sh) => Boolean(sh.shopId))
          .map((sh, index) => ({
            shop_id: sh.shopId,
            visit_order: sh.sequence || index + 1,
          }));

        // Create trip atomically on backend with all items and shops
        const res = await tripsApi.create({
          vehicle_id: tripData.vehicleId,
          driver_id: tripData.driverId,
          sales_staff_id: tripData.staffId,
          trip_date: tripData.date,
          items: itemsPayload,
          shops: shopsPayload,
        });

        const newTripId = res.trip.id;

        showToast('success', 'Trip Created', `Trip created and loaded successfully.`);
        // Only stock levels change here (items moved from godown to van) —
        // a full refreshAllData() storm is not needed.
        await refreshProductsAndStock();

        // Fetch newly created trip details directly from backend to avoid stale React state
        try {
          const [tShopsRes, tStockRes] = await Promise.all([
            tripsApi.getShops(newTripId).catch(() => ({ shops: [] })),
            tripsApi.getStock(newTripId).catch(() => ({ stock: [] })),
          ]);

          const tripShops = (tShopsRes.shops || []).map((ts: any) => ({
            shopId: ts.shop_id,
            shopName: ts.shop_name,
            ownerName: ts.owner_name || '',
            phone: ts.phone || '',
            address: ts.address || '',
            sequence: ts.visit_order || 1,
            status: ts.visited_at ? ('completed' as const) : ('pending' as const),
            visitedAt: ts.visited_at ? new Date(ts.visited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          }));

          const loadedItems = (tStockRes.stock || []).map((st: any) => ({
            productId: st.product_id,
            productName: st.product_name,
            unit: (st.unit || 'packet') as ProductUnit,
            loadedQty: Number(st.loaded_quantity !== undefined ? st.loaded_quantity : st.quantity || 0),
            soldQty: Number(st.sold_quantity || 0),
            damagedQty: Number(st.damaged_quantity || 0),
            returnedQty: Number(st.returned_quantity || 0),
            vanBalance: Number(st.van_balance !== undefined ? st.van_balance : st.loaded_quantity || 0),
            unitPrice: Number(st.unit_price || 30),
          }));

          const newTrip: Trip = {
            ...tripData,
            id: newTripId,
            tripNumber: `TRP-${newTripId.slice(0, 8).toUpperCase()}`,
            status: mapBackendTripStatus(res.trip.status || 'loaded'),
            shops: tripShops.length > 0 ? tripShops : tripData.shops,
            loadedItems: loadedItems.length > 0 ? loadedItems : tripData.loadedItems,
          };
          setTrips((prev) => [newTrip, ...prev.filter((t) => t.id !== newTrip.id)]);
          return newTrip;
        } catch {
          const newTrip: Trip = {
            ...tripData,
            id: newTripId,
            tripNumber: `TRP-${newTripId.slice(0, 8).toUpperCase()}`,
            status: mapBackendTripStatus(res.trip.status || 'loaded'),
          };
          setTrips((prev) => [newTrip, ...prev.filter((t) => t.id !== newTrip.id)]);
          return newTrip;
        }
      } catch (err: any) {
        console.error('Create trip error:', err);
        const errorMsg =
          err.response?.data?.message || err.message || 'Error communicating with backend.';
        showToast('error', 'Failed to Create Trip', errorMsg);
        return null;
      }
    }, 'Creating and loading trip...');
  };

  // 2. Update Trip Status (including reconcile on Completed)
  const updateTripStatus = async (tripId: string, status: TripStatus) => {
    const loadingMessage =
      status === 'Completed'
        ? 'Reconciling and completing trip...'
        : status === 'In Progress'
        ? 'Starting trip route...'
        : `Updating trip to ${status}...`;

    return withGlobalLoading(async () => {
      try {
        if (status === 'Completed') {
          await tripsApi.reconcile(tripId);
          showToast('success', 'Trip Reconciled & Completed', 'Van stock returned to godown and vehicle released.');
        } else if (status === 'In Progress') {
          await tripsApi.start(tripId);
          showToast('success', 'Trip Started', 'Vehicle route is now in progress.');
        } else {
          showToast('info', 'Status Updated', `Trip marked as ${status}`);
        }
        await refreshAllData();
      } catch (err: any) {
        console.error('Update trip status error:', err);
        showToast('error', 'Status Update Failed', err.message || 'Error communicating with backend.');
      }
    }, loadingMessage);
  };

  // Mark Shop Visited on Trip
  const markShopVisited = async (tripId: string, shopId: string) => {
    try {
      await tripsApi.markShopVisited(tripId, shopId);
      showToast('success', 'Shop Visited', 'Shop marked as visited.');
      await refreshAllData();
    } catch (err: any) {
      console.error('Mark shop visited error:', err);
      showToast('error', 'Update Failed', err.message || 'Error communicating with backend.');
    }
  };

  // 3. Record Sale
  const recordSale = async (
    saleData: Omit<Sale, 'id' | 'invoiceNumber' | 'date' | 'time'> & { idempotencyKey?: string }
  ): Promise<Sale | null> => {
    return withGlobalLoading(async () => {
      try {
        const activeTripId = saleData.tripId || trips.find((t) => t.status === 'In Progress' || t.status === 'Loaded')?.id;

        if (!activeTripId) {
          showToast('error', 'No Active Trip', 'Sales must be recorded during an active trip.');
          return null;
        }

        // Fetch current trip stock to map batch_id
        let tripStockList: any[] = [];
        try {
          const sRes = await tripsApi.getStock(activeTripId);
          tripStockList = sRes.stock || [];
        } catch {
          tripStockList = [];
        }

        const itemsForBackend = await Promise.all(
          saleData.items.map(async (item) => {
            // Find batch in trip stock
            const matchInTrip = tripStockList.find((ts) => ts.product_id === item.productId);
            let batchId = matchInTrip?.batch_id;

            if (!batchId) {
              // Check batches API
              const bRes = await batchesApi.getByProduct(item.productId).catch(() => ({ batches: [] }));
              batchId = bRes.batches[0]?.id;
            }

            return {
              product_id: item.productId,
              batch_id: batchId || '00000000-0000-0000-0000-000000000000',
              quantity: item.quantity,
              unit_price: item.unitPrice,
              discount: 0,
            };
          })
        );

        const saleRes = await salesApi.create({
          trip_id: activeTripId,
          shop_id: saleData.shopId,
          items: itemsForBackend,
          discount: saleData.discount,
          notes: `Recorded via Web UI`,
          idempotency_key: saleData.idempotencyKey,
        });

        // If immediate payment was made (cash / upi / card / partial), record payment
        if (saleData.paidAmount > 0 && saleData.paymentMethod !== 'Due') {
          const payMethod =
            saleData.paymentMethod === 'Partial'
              ? 'cash'
              : toBackendPaymentMethod(saleData.paymentMethod);

          await paymentsApi.create({
            shop_id: saleData.shopId,
            sale_id: saleRes.sale.id,
            payment_method: payMethod,
            amount: saleData.paidAmount,
            notes: `Instant payment for invoice ${saleRes.sale.invoice_number}`,
            idempotency_key: saleData.idempotencyKey ? `pay-${saleData.idempotencyKey}` : undefined,
          }).catch((err) => console.warn('Auto payment recording warning:', err));
        }

        showToast('success', 'Sale Recorded', `Invoice #${saleRes.sale.invoice_number} saved.`);
        await refreshAllData();
        return null;
      } catch (err: any) {
        console.error('Record sale error:', err);
        showToast('error', 'Sale Failed', err.message || 'Error recording sale.');
        return null;
      }
    }, 'Recording sale...');
  };

  // 4. Receive Payment
  const receivePayment = async (
    paymentData: Omit<Payment, 'id' | 'receiptNumber' | 'date'> & { idempotencyKey?: string }
  ): Promise<Payment | null> => {
    return withGlobalLoading(async () => {
      try {
        const backendMethod = toBackendPaymentMethod(paymentData.method);
        const idempotencyKey = paymentData.idempotencyKey || generateIdempotencyKey('pay');

        const res = await paymentsApi.create({
          shop_id: paymentData.shopId,
          sale_id: paymentData.saleId,
          payment_method: backendMethod,
          amount: paymentData.amount,
          reference_number: paymentData.reference,
          notes: paymentData.notes,
          idempotency_key: idempotencyKey,
        });

        if (res.is_duplicate) {
          showToast('info', 'Payment Already Processed', `Payment of ${formatINR(paymentData.amount)} was already recorded.`);
        } else {
          showToast('success', 'Payment Received', `Collected ${formatINR(paymentData.amount)}.`);
        }
        await refreshAllData();
        return null;
      } catch (err: any) {
        console.error('Receive payment error:', err);
        showToast('error', 'Payment Failed', err.message || 'Error recording payment.');
        throw err;
      }
    }, 'Processing payment...');
  };

  // 5. Record Return
  const recordReturn = async (
    returnData: Omit<ReturnItem, 'id' | 'date'>
  ): Promise<ReturnItem | null> => {
    return withGlobalLoading(async () => {
      try {
        const activeTripId = returnData.tripId || trips.find((t) => t.status === 'In Progress' || t.status === 'Loaded')?.id;

        if (!activeTripId) {
          showToast('error', 'No Active Trip', 'Returns must be attached to an active trip.');
          return null;
        }

        const bRes = await batchesApi.getByProduct(returnData.productId).catch(() => ({ batches: [] }));
        const batchId = bRes.batches[0]?.id || '00000000-0000-0000-0000-000000000000';

        let reasonCode: 'shop_return' | 'damaged' | 'expired' = 'shop_return';
        if (returnData.reason === 'Damaged') reasonCode = 'damaged';
        else if (returnData.reason === 'Expired') reasonCode = 'expired';

        await returnsApi.create({
          trip_id: activeTripId,
          shop_id: returnData.shopId,
          reason: reasonCode,
          items: [
            {
              product_id: returnData.productId,
              batch_id: batchId,
              quantity: returnData.quantity,
              unit_price: returnData.unitPrice,
            },
          ],
          notes: returnData.notes,
          idempotency_key: returnData.idempotencyKey,
        });

        showToast('success', 'Return Recorded', `${returnData.quantity} ${returnData.unit} returned.`);
        await refreshAllData();
        return null;
      } catch (err: any) {
        console.error('Record return error:', err);
        showToast('error', 'Return Failed', err.message || 'Error recording return.');
        return null;
      }
    }, 'Recording return...');
  };

  // 5b. Record Transit Damage
  const recordTransitDamage = async (
    tripId: string,
    data: {
      product_id: string;
      batch_id?: string;
      quantity: number;
      notes?: string;
      idempotency_key?: string;
    }
  ): Promise<boolean> => {
    return withGlobalLoading(async () => {
      try {
        const res = await tripsApi.recordDamage(tripId, data);
        showToast(
          'success',
          'Damage Recorded',
          res.message || 'Transit damage recorded successfully.'
        );
        await refreshAllData();
        return true;
      } catch (err: any) {
        console.error('Record transit damage error:', err);
        showToast(
          'error',
          'Damage Recording Failed',
          err.response?.data?.message || err.message || 'Error communicating with backend.'
        );
        return false;
      }
    }, 'Recording transit damage...');
  };

  // 6. Products CRUD
  const addProduct = async (prodData: Omit<Product, 'id'>) => {
    try {
      await productsApi.create({
        product_name: prodData.name,
        sku: prodData.sku,
        unit: prodData.unit,
        purchase_price: prodData.purchasePrice,
        selling_price: prodData.sellingPrice,
        category: prodData.category,
      });
      showToast('success', 'Product Added', `${prodData.name} saved to catalog.`);
      await refreshAllData();
    } catch (err: any) {
      showToast('error', 'Failed to Add Product', err.message);
    }
  };

  const updateProduct = async (id: string, updated: Partial<Product>) => {
    try {
      await productsApi.update(id, {
        product_name: updated.name,
        sku: updated.sku,
        unit: updated.unit,
        purchase_price: updated.purchasePrice,
        selling_price: updated.sellingPrice,
        is_active: updated.isActive,
        category: updated.category,
      });
      showToast('info', 'Product Updated', 'Product details saved.');
      await refreshAllData();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productsApi.delete(id);
      showToast('info', 'Product Deleted', 'Product permanently removed.');
      await refreshAllData();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message);
    }
  };

  const archiveProduct = async (id: string) => {
    await updateProduct(id, { isActive: false });
  };

  const isProductInUse = (id: string): boolean => {
    return (
      sales.some((s) => s.items?.some((it) => it.productId === id)) ||
      purchases.some((p) => p.productId === id) ||
      trips.some((t) => t.loadedItems?.some((li) => li.productId === id))
    );
  };

  // 7. Shop CRUD
  const addShop = async (shopData: Omit<Shop, 'id' | 'totalSales' | 'totalCollected' | 'createdAt'>) => {
    return withGlobalLoading(async () => {
      try {
        const res = await shopsApi.create({
          shop_name: shopData.name,
          owner_name: shopData.owner,
          phone: shopData.phone,
          address: shopData.address,
          credit_limit: shopData.creditLimit,
        });

        if (res?.shop?.id) {
          const s = res.shop;
          const newShop: Shop = {
            id: s.id,
            name: s.shop_name,
            owner: s.owner_name || '',
            phone: s.phone || '',
            address: s.address || '',
            route: 'Town Route',
            outstanding: 0,
            creditLimit: Number(s.credit_limit || 0),
            totalSales: 0,
            totalCollected: 0,
            createdAt: s.created_at ? s.created_at.slice(0, 10) : '',
          };
          setShops((prev) => [newShop, ...prev.filter((item) => item.id !== newShop.id)]);
        } else {
          await refreshAllData();
        }

        showToast('success', 'Shop Added', `${shopData.name} registered.`);
      } catch (err: any) {
        showToast('error', 'Failed to Add Shop', err.message);
      }
    }, 'Adding shop...');
  };

  const addShopToActiveTrip = async (
    tripId: string,
    shopData?: {
      name: string;
      owner?: string;
      phone?: string;
      address?: string;
      creditLimit?: number;
    },
    existingShopId?: string
  ): Promise<{ success: boolean; shopId?: string }> => {
    const loadingMessage = existingShopId
      ? 'Assigning shop to active trip...'
      : 'Adding new shop to trip...';

    return withGlobalLoading(async () => {
      try {
        let createdShop: any = null;
        let tripShopRow: any = null;

        if (existingShopId) {
          // Assign existing shop to active trip
          const target = shops.find((s) => s.id === existingShopId);
          const res = await tripsApi.addShop(tripId, { shop_id: existingShopId });
          tripShopRow = res.trip_shop;
          createdShop = target
            ? {
                id: target.id,
                shop_name: target.name,
                owner_name: target.owner,
                phone: target.phone,
                address: target.address,
              }
            : null;
        } else if (shopData) {
          // Create new shop atomically and attach to trip
          const res = await tripsApi.addNewShop(tripId, {
            shop_name: shopData.name,
            owner_name: shopData.owner,
            phone: shopData.phone,
            address: shopData.address,
            credit_limit: shopData.creditLimit,
          });
          createdShop = res.shop;
          tripShopRow = res.trip_shop;

          if (createdShop) {
            const newShopModel: Shop = {
              id: createdShop.id,
              name: createdShop.shop_name,
              owner: createdShop.owner_name || '',
              phone: createdShop.phone || '',
              address: createdShop.address || '',
              route: createdShop.route || 'General Route',
              outstanding: 0,
              creditLimit: Number(createdShop.credit_limit || 0),
              totalSales: 0,
              totalCollected: 0,
              createdAt: createdShop.created_at || new Date().toISOString(),
            };
            setShops((prev) => [newShopModel, ...prev.filter((s) => s.id !== newShopModel.id)]);
          }
        } else {
          throw new Error('Shop data or existing shop ID is required');
        }

        const shopIdToUse = createdShop?.id || existingShopId || tripShopRow?.shop_id;
        const targetShop =
          shops.find((s) => s.id === shopIdToUse) ||
          (createdShop
            ? {
                name: createdShop.shop_name,
                owner: createdShop.owner_name,
                phone: createdShop.phone,
                address: createdShop.address,
              }
            : null);

        // Scoped update: update trip's shops in trips state
        setTrips((prevTrips) =>
          prevTrips.map((t) => {
            if (t.id !== tripId) return t;
            const nextSeq = tripShopRow?.visit_order || t.shops.length + 1;
            const newTripShop: TripShop = {
              shopId: shopIdToUse,
              shopName: targetShop?.name || 'New Shop',
              ownerName: targetShop?.owner || '',
              phone: targetShop?.phone || '',
              address: targetShop?.address || '',
              sequence: nextSeq,
              status: 'pending',
            };
            // Avoid duplicate entry if already present
            if (t.shops.some((s) => s.shopId === shopIdToUse)) return t;
            return {
              ...t,
              shops: [...t.shops, newTripShop],
            };
          })
        );

        showToast('success', 'Shop Added to Trip', `${targetShop?.name || 'Shop'} added to active route.`);
        return { success: true, shopId: shopIdToUse };
      } catch (err: any) {
        console.error('Add shop to active trip error:', err);
        const msg = err.response?.data?.message || err.message || 'Failed to add shop to trip';
        showToast('error', 'Add Shop Failed', msg);
        return { success: false };
      }
    }, loadingMessage);
  };

  const updateShop = (id: string, updated: Partial<Shop>) => {
    setShops((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    showToast('info', 'Shop Updated', 'Shop details saved.');
  };

  // 8. Vehicle CRUD
  const addVehicle = async (vehData: Omit<Vehicle, 'id'>) => {
    try {
      const res = await vehiclesApi.create({
        vehicle_number: vehData.plateNumber,
        vehicle_name: vehData.model,
      });

      if (res?.vehicle?.id) {
        const v = res.vehicle;
        const newVehicle: Vehicle = {
          id: v.id,
          plateNumber: v.vehicle_number,
          model: v.vehicle_name || 'Delivery Van',
          capacityKg: 1000,
          status: mapBackendVehicleStatus(v.status),
        };
        setVehicles((prev) => [newVehicle, ...prev.filter((item) => item.id !== newVehicle.id)]);
      } else {
        // Scoped fallback: refetch only vehicles if response lacks complete fields
        const vehiclesRes = await vehiclesApi.getAll().catch(() => ({ vehicles: [] }));
        setVehicles(
          (vehiclesRes.vehicles || []).map((v: any) => ({
            id: v.id,
            plateNumber: v.vehicle_number,
            model: v.vehicle_name || 'Delivery Van',
            capacityKg: 1000,
            status: mapBackendVehicleStatus(v.status),
          }))
        );
      }

      showToast('success', 'Vehicle Added', `${vehData.plateNumber} added to fleet.`);
    } catch (err: any) {
      showToast('error', 'Failed to Add Vehicle', err.message);
    }
  };

  const updateVehicle = (id: string, updated: Partial<Vehicle>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updated } : v)));
  };

  // 9. Staff CRUD
  const addStaff = async (staffData: Omit<Staff, 'id'> & { username?: string; password?: string; confirmPassword?: string; designation?: string }) => {
    return withGlobalLoading(async () => {
      try {
        const res = await staffApi.create({
          name: staffData.name,
          phone: staffData.phone,
          username: staffData.username,
          password: staffData.password,
          confirmPassword: staffData.confirmPassword,
          role: mapStaffRoleToBackend(staffData.role),
          designation: staffData.designation,
        });

        if (res?.staff?.id && res?.staff?.name) {
          const s = res.staff;
          const newStaffMember: Staff = {
            id: s.id,
            name: s.name,
            username: s.username || '',
            role: mapBackendStaffRole(s.role),
            phone: s.phone || '',
            status: s.is_available ? 'Available' : 'On Trip',
            isActive: s.is_active !== undefined ? Boolean(s.is_active) : true,
            userId: s.user_id,
          };
          setStaff((prev) => [newStaffMember, ...prev.filter((item) => item.id !== newStaffMember.id)]);
        } else {
          // Scoped fallback: Refetch only staff if response lacks complete fields
          const staffRes = await staffApi.getAll().catch(() => ({ staff: [] }));
          setStaff(
            (staffRes.staff || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              username: s.username || '',
              role: mapBackendStaffRole(s.role),
              phone: s.phone || '',
              status: s.is_available ? 'Available' : 'On Trip',
              isActive: s.is_active !== undefined ? Boolean(s.is_active) : true,
              userId: s.user_id,
            }))
          );
        }

        if (res?.is_reactivated) {
          showToast('success', 'Staff Account Reactivated', `${staffData.name} has been reactivated successfully.`);
        } else {
          showToast('success', 'User Created', `${staffData.name} registered successfully.`);
        }
      } catch (err: any) {
        showToast('error', 'Failed to Create User', err.message);
        throw err;
      }
    }, 'Creating user account...');
  };

  const updateStaff = (id: string, updated: Partial<Staff>) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };

  const archiveStaff = async (id: string) => {
    try {
      await staffApi.delete(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      showToast('info', 'Staff Removed', 'Staff member has been archived/deactivated.');
    } catch (err: any) {
      showToast('error', 'Remove Failed', err.message);
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      await staffApi.delete(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      showToast('info', 'Staff Removed', 'Staff member removed successfully.');
    } catch (err: any) {
      showToast('error', 'Remove Failed', err.message);
    }
  };

  const isStaffInUse = (id: string): boolean => {
    return trips.some((t) => t.driverId === id || t.staffId === id);
  };

  // 10. Suppliers CRUD
  const addSupplier = async (supData: Omit<Supplier, 'id'>) => {
    try {
      await suppliersApi.create({
        supplier_name: supData.name,
        contact_person: supData.contactPerson,
        phone: supData.phone,
        address: supData.address,
      });
      showToast('success', 'Supplier Added', `${supData.name} registered.`);
      await refreshAllData();
    } catch (err: any) {
      showToast('error', 'Failed to Add Supplier', err.message);
    }
  };

  const updateSupplier = (id: string, updated: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };

  const archiveSupplier = (id: string) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'Inactive' } : s)));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  const isSupplierInUse = (id: string): boolean => {
    return purchases.some((p) => p.supplierId === id);
  };

  // 11. Purchases
  const addPurchase = async (purData: Omit<Purchase, 'id' | 'invoiceNumber' | 'date'>) => {
    try {
      // Find or create batch
      let batchId: string | undefined;
      try {
        const bRes = await batchesApi.getByProduct(purData.productId);
        if (bRes.batches && bRes.batches.length > 0) {
          batchId = bRes.batches[0].id;
        } else {
          const newB = await batchesApi.create({
            product_id: purData.productId,
            batch_number: purData.batchNumber || `B-${Date.now().toString().slice(-4)}`,
          });
          batchId = newB.batch.id;
        }
      } catch {
        // fallback
      }

      if (!batchId) {
        throw new Error('Unable to assign batch for purchase.');
      }

      await purchasesApi.create({
        supplier_id: purData.supplierId,
        items: [
          {
            product_id: purData.productId,
            batch_id: batchId,
            quantity: purData.quantity,
            unit_cost: purData.unitCost,
          },
        ],
      });

      showToast('success', 'Purchase Saved', `Added ${purData.quantity} units to godown stock.`);
      await refreshAllData();
    } catch (err: any) {
      showToast('error', 'Purchase Failed', err.message);
    }
  };

  // 12. Expenses
  const addExpense = (expData: Omit<Expense, 'id' | 'date'>) => {
    const id = `exp-${Date.now()}`;
    setExpenses((prev) => [{ ...expData, id, date: todayDateStr }, ...prev]);
    showToast('success', 'Expense Recorded', `${formatINR(expData.amount)} for ${expData.category}.`);
  };

  // 13. Shop Ledger
  const getShopLedger = (shopId: string): ShopLedgerEntry[] => {
    const shopSales = sales.filter((s) => s.shopId === shopId);
    const shopPayments = payments.filter((p) => p.shopId === shopId);

    type RawEvent =
      | { type: 'Sale'; date: string; ref: string; desc: string; amount: number }
      | { type: 'Payment'; date: string; ref: string; desc: string; amount: number };

    const events: RawEvent[] = [];

    shopSales.forEach((s) => {
      events.push({
        type: 'Sale',
        date: s.date,
        ref: s.invoiceNumber,
        desc: `Bakery Goods Invoice (${s.items.length} items)`,
        amount: s.total,
      });
    });

    shopPayments.forEach((p) => {
      events.push({
        type: 'Payment',
        date: p.date,
        ref: p.receiptNumber,
        desc: `Payment Received via ${p.method}`,
        amount: p.amount,
      });
    });

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    return events.map((ev, index) => {
      let debit = 0;
      let credit = 0;

      if (ev.type === 'Sale') {
        debit = ev.amount;
        runningBalance += debit;
      } else {
        credit = ev.amount;
        runningBalance = Math.max(0, runningBalance - credit);
      }

      return {
        id: `ledger-${shopId}-${index}`,
        date: ev.date,
        type: ev.type,
        reference: ev.ref,
        description: ev.desc,
        debit,
        credit,
        balance: runningBalance,
      };
    });
  };

  const updateBusinessProfile = async (data: {
    business_name: string;
    gstin?: string;
    phone: string;
    email?: string;
    address?: string;
  }) => {
    await withGlobalLoading(async () => {
      try {
        const res = await settingsApi.updateBusiness(data);
        setBusinessSettings(res.settings);
        showToast('success', 'Business Profile Saved', 'Company information updated successfully.');
      } catch (err: any) {
        showToast('error', 'Update Failed', err.message || 'Unable to update business profile.');
        throw err;
      }
    }, 'Saving business profile...');
  };

  const updateInvoiceSettings = async (data: {
    invoice_prefix: string;
    receipt_prefix: string;
    invoice_footer_note?: string;
    receipt_footer_note?: string;
  }) => {
    await withGlobalLoading(async () => {
      try {
        const res = await settingsApi.updateInvoice(data);
        setBusinessSettings(res.settings);
        showToast('success', 'Invoice Settings Saved', 'Number prefixes and terms updated successfully.');
      } catch (err: any) {
        showToast('error', 'Update Failed', err.message || 'Unable to update invoice settings.');
        throw err;
      }
    }, 'Saving invoice preferences...');
  };

  const resetToDemoData = () => {
    refreshAllData();
    showToast('info', 'Data Refreshed', 'Records reloaded from PostgreSQL backend.');
  };

  return (
    <BakeryContext.Provider
      value={{
        isAuthenticated,
        isLoadingData,
        isGlobalLoading,
        globalLoadingMessage,
        globalLoadingSubMessage,
        setGlobalLoading,
        currentUser,
        isAdmin: currentUser.isAdmin,
        isManager: currentUser.isManager,
        canManage: currentUser.canManage,
        login,
        logout,
        refreshAllData,
        products,
        shops,
        vehicles,
        staff,
        trips,
        sales,
        payments,
        returns,
        expenses,
        suppliers,
        purchases,
        alerts,
        toasts,
        showToast,
        removeToast,
        todaySalesTotal,
        todayCollectionTotal,
        totalOutstanding,
        activeTripsCount,
        paymentBreakdown,
        createTrip,
        updateTripStatus,
        markShopVisited,
        recordSale,
        receivePayment,
        recordReturn,
        recordTransitDamage,
        addProduct,
        updateProduct,
        archiveProduct,
        deleteProduct,
        isProductInUse,
        addShop,
        addShopToActiveTrip,
        updateShop,
        addVehicle,
        updateVehicle,
        addStaff,
        updateStaff,
        archiveStaff,
        deleteStaff,
        isStaffInUse,
        addExpense,
        addPurchase,
        addSupplier,
        updateSupplier,
        archiveSupplier,
        deleteSupplier,
        isSupplierInUse,
        getShopLedger,
        resetToDemoData,
        businessSettings,
        updateBusinessProfile,
        updateInvoiceSettings,
      }}
    >
      {children}
    </BakeryContext.Provider>
  );
};

export const useBakery = (): BakeryContextType => {
  const context = useContext(BakeryContext);
  if (!context) {
    throw new Error('useBakery must be used within a BakeryProvider');
  }
  return context;
};
