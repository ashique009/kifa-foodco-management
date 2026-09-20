import { api } from './client';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/api/auth/login', credentials),
};

export const productsApi = {
  getAll: () => api.get<{ products: any[] }>('/api/products'),
  getById: (id: string) => api.get<{ product: any }>(`/api/products/${id}`),
  create: (data: {
    product_name: string;
    sku?: string;
    unit: string;
    purchase_price?: number;
    selling_price?: number;
    category?: string;
  }) => api.post<{ message: string; product: any }>('/api/products', data),
  update: (id: string, data: Partial<{
    product_name: string;
    sku?: string;
    unit: string;
    purchase_price?: number;
    selling_price?: number;
    is_active?: boolean;
    category?: string;
  }>) => api.put<{ message: string; product: any }>(`/api/products/${id}`, data),
  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/products/${id}`),
};

export const batchesApi = {
  getAll: () => api.get<{ batches: any[] }>('/api/batches'),
  getByProduct: (productId: string) =>
    api.get<{ batches: any[] }>(`/api/batches/product/${productId}`),
  create: (data: {
    product_id: string;
    batch_number: string;
    production_date?: string;
    expiry_date?: string;
    purchase_price?: number;
  }) => api.post<{ message: string; batch: any }>('/api/batches', data),
};

export const stockApi = {
  getGodownStock: () =>
    api.get<{ stock: any[] }>('/api/stock/godown'),
};

export const suppliersApi = {
  getAll: () => api.get<{ suppliers: any[] }>('/api/suppliers'),
  create: (data: {
    supplier_name: string;
    contact_person?: string;
    phone?: string;
    address?: string;
  }) => api.post<{ message: string; supplier: any }>('/api/suppliers', data),
};

export const purchasesApi = {
  getAll: () => api.get<{ purchases: any[] }>('/api/purchases'),
  create: (data: {
    supplier_id?: string;
    purchase_date?: string;
    items: {
      product_id: string;
      batch_id: string;
      quantity: number;
      unit_cost: number;
    }[];
    discount?: number;
    notes?: string;
  }) => api.post<{ message: string; purchase: any }>('/api/purchases', data),
};

export const vehiclesApi = {
  getAll: () => api.get<{ vehicles: any[] }>('/api/vehicles'),
  create: (data: {
    vehicle_number: string;
    vehicle_name?: string;
    status?: string;
  }) => api.post<{ message: string; vehicle: any }>('/api/vehicles', data),
};

export const staffApi = {
  getAll: (params?: { include_inactive?: boolean }) =>
    api.get<{ staff: any[] }>('/api/staff', { params }),
  create: (data: {
    name: string;
    phone?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
    is_available?: boolean;
    designation?: string;
  }) => api.post<{ message: string; staff: any; user: any; is_reactivated?: boolean }>('/api/staff', data),
  delete: (id: string) =>
    api.delete<{ message: string; id: string }>(`/api/staff/${id}`),
};

export const shopsApi = {
  getAll: () => api.get<{ shops: any[] }>('/api/shops'),
  getById: (id: string) => api.get<{ shop: any }>(`/api/shops/${id}`),
  getLedger: (id: string) =>
    api.get<{
      shop: any;
      outstanding: number;
      ledger: any[];
    }>(`/api/shops/${id}/ledger`),
  create: (data: {
    shop_name: string;
    owner_name?: string;
    phone?: string;
    address?: string;
    credit_limit?: number;
  }) => api.post<{ message: string; shop: any }>('/api/shops', data),
};

export const tripsApi = {
  getAll: () => api.get<{ trips: any[] }>('/api/trips'),
  create: (data: {
    vehicle_id: string;
    driver_id: string;
    sales_staff_id: string;
    trip_date?: string;
    notes?: string;
    items?: {
      product_id: string;
      batch_id?: string;
      quantity: number;
    }[];
    shops?: {
      shop_id: string;
      visit_order?: number;
    }[];
  }) => api.post<{ message: string; trip: any }>('/api/trips', data),
  loadStock: (
    tripId: string,
    data: {
      product_id: string;
      batch_id: string;
      quantity: number;
    }
  ) => api.post<{ message: string; stock: any }>(`/api/trips/${tripId}/load`, data),
  addShop: (
    tripId: string,
    data: {
      shop_id: string;
      visit_order?: number;
    }
  ) => api.post<{ message: string; trip_shop: any }>(`/api/trips/${tripId}/shops`, data),
  addNewShop: (
    tripId: string,
    data: {
      shop_name: string;
      owner_name?: string;
      phone?: string;
      address?: string;
      credit_limit?: number;
      visit_order?: number;
    }
  ) =>
    api.post<{ message: string; shop: any; trip_shop: any }>(
      `/api/trips/${tripId}/shops/new`,
      data
    ),
  getShops: (tripId: string) =>
    api.get<{ shops: any[] }>(`/api/trips/${tripId}/shops`),
  markShopVisited: (tripId: string, shopId: string) =>
    api.post<{ message: string; trip_shop: any }>(
      `/api/trips/${tripId}/shops/${shopId}/visit`
    ),
  getStock: (tripId: string) =>
    api.get<{ stock: any[] }>(`/api/trips/${tripId}/stock`),
  start: (tripId: string) =>
    api.post<{ message: string; trip: any }>(`/api/trips/${tripId}/start`),
  recordDamage: (
    tripId: string,
    data: {
      product_id: string;
      batch_id?: string;
      quantity: number;
      notes?: string;
      idempotency_key?: string;
    }
  ) =>
    api.post<{ message: string; damage?: any; is_duplicate?: boolean }>(
      `/api/trips/${tripId}/damage`,
      data,
      {
        headers: data.idempotency_key
          ? { 'Idempotency-Key': data.idempotency_key }
          : undefined,
      }
    ),
  reconcile: (tripId: string) =>
    api.post<{
      message: string;
      total_items_returned: number;
      reconciled_items: any[];
    }>(`/api/trips/${tripId}/reconcile`),
};

export const salesApi = {
  getAll: () => api.get<{ sales: any[] }>('/api/sales'),
  create: (data: {
    trip_id: string;
    shop_id: string;
    sale_date?: string;
    items: {
      product_id: string;
      batch_id: string;
      quantity: number;
      unit_price: number;
      discount?: number;
    }[];
    discount?: number;
    notes?: string;
    idempotency_key?: string;
  }) =>
    api.post<{ message: string; sale: any; is_duplicate?: boolean }>('/api/sales', data, {
      headers: data.idempotency_key
        ? { 'Idempotency-Key': data.idempotency_key }
        : undefined,
    }),
};

export const paymentsApi = {
  getAll: () => api.get<{ payments: any[] }>('/api/payments'),
  create: (data: {
    shop_id: string;
    sale_id?: string;
    payment_method: 'cash' | 'upi' | 'card' | 'bank_transfer';
    amount: number;
    payment_date?: string;
    reference_number?: string;
    notes?: string;
    idempotency_key?: string;
  }) =>
    api.post<{
      message: string;
      payment: any;
      outstanding_balance: number;
      is_duplicate?: boolean;
    }>('/api/payments', data, {
      headers: data.idempotency_key
        ? { 'Idempotency-Key': data.idempotency_key }
        : undefined,
    }),
};

export const returnsApi = {
  getAll: () => api.get<{ returns: any[] }>('/api/returns'),
  create: (data: {
    trip_id: string;
    shop_id: string;
    reason: 'shop_return' | 'damaged' | 'expired';
    return_date?: string;
    items: {
      product_id: string;
      batch_id: string;
      quantity: number;
      unit_price?: number;
      sale_id?: string;
    }[];
    notes?: string;
    idempotency_key?: string;
  }) =>
    api.post<{ message: string; return: any; is_duplicate?: boolean }>('/api/returns', data, {
      headers: data.idempotency_key
        ? { 'Idempotency-Key': data.idempotency_key }
        : undefined,
    }),
};

export interface BusinessSettings {
  business_name: string;
  gstin?: string;
  phone: string;
  email?: string;
  address?: string;
  invoice_prefix: string;
  receipt_prefix: string;
  invoice_footer_note?: string;
  receipt_footer_note?: string;
  updated_at?: string;
}

export const settingsApi = {
  get: () => api.get<{ settings: BusinessSettings }>('/api/settings'),
  updateBusiness: (data: {
    business_name: string;
    gstin?: string;
    phone: string;
    email?: string;
    address?: string;
  }) => api.put<{ message: string; settings: BusinessSettings }>('/api/settings/business', data),
  updateInvoice: (data: {
    invoice_prefix: string;
    receipt_prefix: string;
    invoice_footer_note?: string;
    receipt_footer_note?: string;
  }) => api.put<{ message: string; settings: BusinessSettings }>('/api/settings/invoice', data),
};

export const healthApi = {
  check: () => api.get<{ message?: string; status?: string }>('/'),
};


