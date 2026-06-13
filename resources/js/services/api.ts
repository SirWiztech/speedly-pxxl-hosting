const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  const token = getToken();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const text = await response.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* non-JSON response */ }

  if (!response.ok) {
    const msg = data?.message || data?.error || (`Server error: ${response.status} ${response.statusText}`);
    throw new Error(msg);
  }

  return data || { success: true };
}

export const api = {
    // Auth
  auth: {
    register: (data: { full_name: string; username: string; email: string; password: string; role: string; phone: string }) =>
      apiFetch('/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { login: string; password: string }) =>
      apiFetch('/login', { method: 'POST', body: JSON.stringify(data) }),
    adminLogin: (data: { email: string; password: string }) =>
      apiFetch('/admin/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () =>
      apiFetch('/logout', { method: 'POST' }),
    adminLogout: () =>
      apiFetch('/admin/logout', { method: 'POST' }),
    me: () =>
      apiFetch('/me'),
    googleRedirect: () =>
      apiFetch('/auth/google'),
    changePassword: (data: { current_password: string; new_password: string }) =>
      apiFetch('/change-password', { method: 'POST', body: JSON.stringify(data) }),
    deleteAccount: () =>
      apiFetch('/delete-account', { method: 'POST' }),
    resendOtp: (data: { email: string }) =>
      apiFetch('/resend-otp', { method: 'POST', body: JSON.stringify(data) }),
    verifyOtp: (data: { email: string; otp: string }) =>
      apiFetch('/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
    forgotPassword: (data: { email: string }) =>
      apiFetch('/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
    resetPassword: (data: { email: string; token: string; password: string }) =>
      apiFetch('/reset-password', { method: 'POST', body: JSON.stringify(data) }),
    googleRedirect: () =>
      apiFetch('/auth/google'),
    facebookRedirect: () =>
      apiFetch('/auth/facebook'),
  },

  // Client
  client: {
    stats: () => apiFetch('/client/stats'),
    rides: (limit = 5) => apiFetch(`/client/rides?limit=${limit}`),
    rideHistory: (params?: { status?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch(`/client/rides/history?${qs}`);
    },
    wallet: () => apiFetch('/client/wallet'),
    transactions: (params?: { type?: string; category?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.type) qs.set('type', params.type);
      if (params?.category) qs.set('category', params.category);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch(`/client/wallet/transactions?${qs}`);
    },
    profile: () => apiFetch('/client/profile'),
    updateProfile: (data: Record<string, string>) =>
      apiFetch('/client/profile/update', { method: 'POST', body: JSON.stringify(data) }),
    kyc: () => apiFetch('/client/kyc'),
    uploadKyc: (formData: FormData) =>
      apiFetch('/client/kyc/upload', { method: 'POST', body: formData }),
    locations: () => apiFetch('/client/locations'),
    support: (data: { category: string; subject: string; message: string; priority: string }) =>
      apiFetch('/client/support', { method: 'POST', body: JSON.stringify(data) }),
    supportTickets: () => apiFetch('/client/support/tickets'),
  },

  // Driver
  driver: {
    stats: () => apiFetch('/driver/stats'),
    rides: (limit = 5) => apiFetch(`/driver/rides?limit=${limit}`),
    pendingRides: () => apiFetch('/driver/rides/pending'),
    rideHistory: (params?: { status?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch(`/driver/rides/history?${qs}`);
    },
    wallet: () => apiFetch('/driver/wallet'),
    transactions: (params?: { type?: string; category?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.type) qs.set('type', params.type);
      if (params?.category) qs.set('category', params.category);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch(`/driver/wallet/transactions?${qs}`);
    },
    requestWithdrawal: (data: { amount: number; password: string; bank_name?: string; bank_code?: string; account_number?: string; account_name?: string }) =>
      apiFetch('/driver/wallet/withdraw', { method: 'POST', body: JSON.stringify(data) }),
    profile: () => apiFetch('/driver/profile'),
    updateProfile: (data: Record<string, string>) =>
      apiFetch('/driver/profile/update', { method: 'POST', body: JSON.stringify(data) }),
    kyc: () => apiFetch('/driver/kyc'),
    uploadKyc: (formData: FormData) =>
      apiFetch('/driver/kyc/upload', { method: 'POST', body: formData }),
    locations: () => apiFetch('/driver/locations'),
    toggleStatus: (data: { status: string }) =>
      apiFetch('/driver/toggle-status', { method: 'POST', body: JSON.stringify(data) }),
    updateLocation: (data: { lat: number; lng: number }) =>
      apiFetch('/driver/update-location', { method: 'POST', body: JSON.stringify(data) }),
    nearbyDrivers: (params: { lat: number; lng: number; radius_km?: number }) => {
      const qs = new URLSearchParams();
      qs.set('lat', String(params.lat));
      qs.set('lng', String(params.lng));
      if (params.radius_km) qs.set('radius_km', String(params.radius_km));
      return apiFetch(`/driver/nearby?${qs}`);
    },
    support: (data: { category: string; subject: string; message: string; priority: string }) =>
      apiFetch('/driver/support', { method: 'POST', body: JSON.stringify(data) }),
    supportTickets: () => apiFetch('/driver/support/tickets'),
    bankDetails: () => apiFetch('/driver/bank'),
    saveBankDetails: (data: { bank_name: string; account_number: string; account_name: string }) =>
      apiFetch('/driver/bank/save', { method: 'POST', body: JSON.stringify(data) }),
    setDefaultBank: (id: string) =>
      apiFetch(`/driver/bank/${id}/set-default`, { method: 'POST' }),
    removeBankAccount: (id: string) =>
      apiFetch(`/driver/bank/${id}`, { method: 'DELETE' }),
    updateVehicle: (data: { vehicle_type?: string; vehicle_model?: string; vehicle_color?: string; plate_number?: string; vehicle_year?: string }) =>
      apiFetch('/driver/vehicle/update', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Rides
  rides: {
    getRideTypes: () => apiFetch('/ride-types'),
    calculateFare: (params: { pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number; ride_type: string }) => {
      const qs = new URLSearchParams();
      qs.set('pickup_lat', String(params.pickup_lat));
      qs.set('pickup_lng', String(params.pickup_lng));
      qs.set('dropoff_lat', String(params.dropoff_lat));
      qs.set('dropoff_lng', String(params.dropoff_lng));
      qs.set('ride_type', params.ride_type);
      return apiFetch(`/rides/calculate-fare?${qs}`);
    },
    book: (data: { pickup_location: string; dropoff_location: string; pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number; ride_type: string; scheduled_at?: string; notes?: string }) =>
      apiFetch('/rides/book', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id: string) => apiFetch(`/rides/${id}`),
    receipt: (id: string) => apiFetch(`/rides/${id}/receipt`),
    accept: (id: string) => apiFetch(`/rides/${id}/accept`, { method: 'POST' }),
    decline: (id: string) => apiFetch(`/rides/${id}/decline`, { method: 'POST' }),
    complete: (id: string) => apiFetch(`/rides/${id}/complete`, { method: 'POST' }),
    cancel: (id: string, data?: { reason?: string }) =>
      apiFetch(`/rides/${id}/cancel`, { method: 'POST', body: JSON.stringify(data || {}) }),
    rateDriver: (id: string, data: { rating: number; comment?: string }) =>
      apiFetch(`/rides/${id}/rate-driver`, { method: 'POST', body: JSON.stringify(data) }),
    rateClient: (id: string, data: { rating: number; comment?: string }) =>
      apiFetch(`/rides/${id}/rate-client`, { method: 'POST', body: JSON.stringify(data) }),
    releaseFunds: (id: string) =>
      apiFetch(`/rides/${id}/release-funds`, { method: 'POST' }),
    qrRelease: (id: string, token: string) =>
      apiFetch(`/rides/${id}/qr-release`, { method: 'POST', body: JSON.stringify({ release_token: token }) }),
    chatHistory: (id: string, before?: string) =>
      apiFetch(`/rides/${id}/chat${before ? `?before=${before}` : ''}`),
    sendChat: (id: string, message: string) =>
      apiFetch(`/rides/${id}/chat`, { method: 'POST', body: JSON.stringify({ message }) }),
  },

  // Admin
  admin: {
    stats: () => apiFetch('/admin/stats'),
    payments: (params?: { from?: string; to?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.from) qs.set('from', params.from);
      if (params?.to) qs.set('to', params.to);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch(`/admin/payments?${qs}`);
    },
    wallets: (page?: number) => apiFetch(`/admin/wallets${page ? `?page=${page}` : ''}`),
    reports: (params: { type: string; from: string; to: string }) => {
      const qs = new URLSearchParams();
      qs.set('type', params.type);
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      return apiFetch(`/admin/reports?${qs}`);
    },
    activityLogs: (page?: number) => apiFetch(`/admin/activity-logs${page ? `?page=${page}` : ''}`),
    withdrawals: (params?: { status?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch(`/admin/withdrawals?${qs}`);
    },
    approveWithdrawal: (id: string) =>
      apiFetch(`/admin/withdrawals/${id}/approve`, { method: 'POST' }),
    rejectWithdrawal: (id: string, data: { reason: string }) =>
      apiFetch(`/admin/withdrawals/${id}/reject`, { method: 'POST', body: JSON.stringify(data) }),
    settings: () => apiFetch('/admin/settings'),
    saveSettings: (data: Record<string, string | number>) =>
      apiFetch('/admin/settings', { method: 'POST', body: JSON.stringify(data) }),
    getUser: (id: string) => apiFetch(`/admin/users/${id}`),
    toggleUserActive: (id: string) =>
      apiFetch(`/admin/users/${id}/toggle-active`, { method: 'POST' }),
    rides: (params?: { status?: string; search?: string; page?: number; per_page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.per_page) qs.set('per_page', String(params.per_page));
      return apiFetch(`/admin/rides?${qs}`);
    },
    drivers: (params?: { status?: string; verification?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.verification) qs.set('verification', params.verification);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch(`/admin/drivers?${qs}`);
    },
    approveDriver: (id: string) =>
      apiFetch(`/admin/drivers/${id}/approve`, { method: 'POST' }),
    rejectDriver: (id: string, data: { reason: string }) =>
      apiFetch(`/admin/drivers/${id}/reject`, { method: 'POST', body: JSON.stringify(data) }),
    pendingKyc: (page?: number) => apiFetch(`/admin/kyc/pending${page ? `?page=${page}` : ''}`),
    supportTickets: (params?: { status?: string; priority?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.priority) qs.set('priority', params.priority);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch(`/admin/support-tickets?${qs}`);
    },
    replyTicket: (id: string, data: { reply: string }) =>
      apiFetch(`/admin/support-tickets/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }),
    closeTicket: (id: string) =>
      apiFetch(`/admin/support-tickets/${id}/close`, { method: 'POST' }),
    approveKyc: (id: string) =>
      apiFetch(`/admin/kyc/${id}/approve`, { method: 'POST' }),
    rejectKyc: (id: string, data: { reason: string }) =>
      apiFetch(`/admin/kyc/${id}/reject`, { method: 'POST', body: JSON.stringify(data) }),
    listPlaces: (params?: { search?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      return apiFetch(`/admin/places?${qs}`);
    },
    addPlace: (data: { name: string; state?: string; lat: number; lng: number; feature_code?: string; full_address?: string; population?: number }) =>
      apiFetch('/admin/places/add', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Notifications
  notifications: {
    list: (page?: number) => apiFetch(`/notifications${page ? `?page=${page}` : ''}`),
    clear: (data: { notification_id: string }) =>
      apiFetch('/notifications/clear', { method: 'POST', body: JSON.stringify(data) }),
    clearAll: () =>
      apiFetch('/notifications/clear-all', { method: 'POST' }),
  },

  // Payment
  // Payment
payment: {
    initiate: (data: { amount: number; email: string; name: string; reference?: string; metadata?: Record<string, string> }) =>
        apiFetch('/payment/initiate', { method: 'POST', body: JSON.stringify(data) }),
    callback: (paymentId: string, payerId: string) =>
        apiFetch(`/payment/callback?paymentId=${paymentId}&PayerID=${payerId}`),
    verify: (reference: string) =>
        apiFetch(`/payment/verify?reference=${reference}`),
    getBanks: (currency: string = 'NGN') =>
        apiFetch(`/payment/banks?currency=${currency}`),
    verifyAccount: (data: { bank_code: string; account_number: string }) =>
        apiFetch('/payment/verify-account', { method: 'POST', body: JSON.stringify(data) }),
},

  // Location
  location: {
    suggestions: (query: string) => apiFetch(`/location/suggestions?query=${encodeURIComponent(query)}`),
    placeDetails: (params: { id?: number; query?: string }) => {
      if (params.id) return apiFetch(`/location/details?id=${params.id}`);
      return apiFetch('/location/details', { method: 'POST', body: JSON.stringify({ query: params.query }) });
    },
  },
};

export default api;
