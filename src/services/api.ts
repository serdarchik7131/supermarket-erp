import { Branch, Category, Product, Order, Courier, AuditLog, Client, StaffMember, PaymentRecord, AktSverkaEntry, Promotion, PriceType, SystemSettings, Territory, DualBotConfig, PendingProduct, PriceChangeLog, ProductTypeGroup } from '../types';
import { notifySyncEvent } from '../utils/syncManager';

export async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch('/api/branches');
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories');
  return res.json();
}

export interface PaginatedProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export async function fetchProducts(params?: {
  category?: string;
  brand?: string;
  search?: string;
  inStockOnly?: boolean;
  branchId?: string;
}): Promise<Product[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.brand) query.append('brand', params.brand);
  if (params?.search) query.append('search', params.search);
  if (params?.inStockOnly) query.append('inStockOnly', 'true');
  if (params?.branchId) query.append('branchId', params.branchId);

  const res = await fetch(`/api/products?${query.toString()}`);
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export async function fetchProductsPaginated(params: {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  search?: string;
  onlyHasBarcode?: boolean;
  minPrice?: number | string;
  maxPrice?: number | string;
  inStockOnly?: boolean;
  branchId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<PaginatedProductsResponse> {
  const query = new URLSearchParams();
  query.append('paginate', 'true');
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.category && params.category !== 'all') query.append('category', params.category);
  if (params.brand && params.brand !== 'all') query.append('brand', params.brand);
  if (params.search) query.append('search', params.search);
  if (params.onlyHasBarcode) query.append('onlyHasBarcode', 'true');
  if (params.minPrice) query.append('minPrice', String(params.minPrice));
  if (params.maxPrice) query.append('maxPrice', String(params.maxPrice));
  if (params.inStockOnly) query.append('inStockOnly', 'true');
  if (params.branchId) query.append('branchId', params.branchId);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  const res = await fetch(`/api/products?${query.toString()}`);
  const data = await res.json();
  if (data && Array.isArray(data.items)) {
    return data;
  }
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
      hasMore: false,
    };
  }
  return { items: [], total: 0, page: 1, limit: 50, totalPages: 1, hasMore: false };
}

export async function fetchProductByBarcode(barcode: string): Promise<Product | null> {
  if (!barcode) return null;
  try {
    const res = await fetch(`/api/products/by-barcode/${encodeURIComponent(barcode.trim())}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createProduct(productData: Partial<Product>): Promise<Product> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch('/api/orders');
  return res.json();
}

export async function createOrder(orderData: Partial<Order>): Promise<Order> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function updateOrderStatus(orderId: string, status: Order['orderStatus']): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function updateOrder(orderId: string, orderData: Partial<Order>): Promise<Order> {
  const res = await fetch(`/api/orders/${orderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function deleteOrder(orderId: string): Promise<void> {
  await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
  notifySyncEvent();
}

// B2B Clients API
export async function fetchClients(): Promise<Client[]> {
  const res = await fetch('/api/clients');
  return res.json();
}

export async function createClient(clientData: Partial<Client>): Promise<Client> {
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientData),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function updateClient(id: string, clientData: Partial<Client>): Promise<Client> {
  const res = await fetch(`/api/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientData),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  await fetch(`/api/clients/${id}`, { method: 'DELETE' });
  notifySyncEvent();
}

// Staff & Employees API
export async function fetchStaff(): Promise<StaffMember[]> {
  const res = await fetch('/api/staff');
  return res.json();
}

export async function createStaff(staffData: Partial<StaffMember>): Promise<StaffMember> {
  const res = await fetch('/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staffData),
  });
  return res.json();
}

export async function updateStaff(id: string, staffData: Partial<StaffMember>): Promise<StaffMember> {
  const res = await fetch(`/api/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staffData),
  });
  return res.json();
}

export async function deleteStaff(id: string): Promise<void> {
  await fetch(`/api/staff/${id}`, { method: 'DELETE' });
}

export async function checkStaffByPhone(phone: string): Promise<{ isStaff: boolean; staff?: StaffMember }> {
  const res = await fetch('/api/staff/check-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  return res.json();
}

// Payments / Kassa API
export async function fetchPayments(startDate?: string, endDate?: string): Promise<PaymentRecord[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const res = await fetch(`/api/payments?${params.toString()}`);
  return res.json();
}

export async function createPayment(paymentData: Partial<PaymentRecord>): Promise<PaymentRecord> {
  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

// Akt Sverka API
export async function fetchAktSverka(clientId: string, startDate?: string, endDate?: string): Promise<{
  client: Client;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: AktSverkaEntry[];
}> {
  const params = new URLSearchParams({ clientId });
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const res = await fetch(`/api/akt-sverka?${params.toString()}`);
  return res.json();
}

// Promotions API
export async function fetchPromotions(): Promise<Promotion[]> {
  const res = await fetch('/api/promotions');
  return res.json();
}

export async function createPromotion(promoData: Partial<Promotion>): Promise<Promotion> {
  const res = await fetch('/api/promotions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(promoData),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function updatePromotion(id: string, promoData: Partial<Promotion>): Promise<Promotion> {
  const res = await fetch(`/api/promotions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(promoData),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function deletePromotion(id: string): Promise<void> {
  await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
  notifySyncEvent();
}

export async function togglePromotionStatus(id: string): Promise<Promotion> {
  const res = await fetch(`/api/promotions/${id}/toggle`, {
    method: 'PATCH',
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function fetchCouriers(): Promise<Courier[]> {
  const res = await fetch('/api/couriers');
  return res.json();
}

export async function askAIAssistant(prompt: string, sessionId?: string): Promise<{
  replyText: string;
  matchedProductIds: string[];
  suggestedActions: string[];
  createdOrder?: Order;
}> {
  const res = await fetch('/api/ai/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, sessionId }),
  });
  return res.json();
}

export async function fetchAnalyticsDashboard(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const res = await fetch(`/api/analytics/dashboard?${params.toString()}`);
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch('/api/audit-logs');
  return res.json();
}

export async function fetchTelegramConfig(): Promise<{
  botTokenConfigured: boolean;
  botTokenPrefix: string | null;
  botTokenFull?: string;
  adminIdConfigured: boolean;
  adminId: string;
  customWebAppUrl?: string;
  status: string;
  botInfo?: any;
}> {
  const res = await fetch('/api/telegram/config');
  return res.json();
}

export async function saveTelegramConfig(data: { botToken: string; adminId: string; customWebAppUrl?: string }): Promise<any> {
  const res = await fetch('/api/telegram/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchSalesForecast(): Promise<any> {
  return {
    forecastDays: 7,
    predictedTotalRevenue: 450000000,
    topGrowthCategory: "Ichimliklar va Suv",
    aiRecommendations: [
      "Coca-Cola 1.5L zaxirasini +30% ga oshirish tavsiya etiladi",
      "Yunusobod filialida Alanga guruchga talab yuqori",
      "Chilonzor filiali uchun kuryerlar sonini oshirish lozim"
    ]
  };
}

export async function generateMarketingCampaign(topic: string, channel?: string, targetAudience?: string): Promise<any> {
  return {
    campaignTitle: `B2B Maxsus Chegirma: ${topic}`,
    messageText: `🎉 Osiyo Supermarket GO B2B Distributsiya!\n\n${topic}\n\nKanal: ${channel || 'Telegram'}\nAuditoriya: ${targetAudience || 'Barcha do\'konlar'}\nPromokod: B2B2026 - 5% chegirma!`,
    suggestedAudience: targetAudience || "Barcha B2B Do'konlar",
  };
}

export async function posCheckout(data: any): Promise<any> {
  const res = await fetch('/api/pos/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function sendTelegramTestNotification(message?: string): Promise<{ success: boolean; response: any }> {
  const res = await fetch('/api/telegram/test-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

// 15. Dual Telegram Bot & Automatic Price Sync APIs
export async function fetchDualBotConfig(): Promise<DualBotConfig> {
  const res = await fetch('/api/telegram/dual-config');
  return res.json();
}

export async function saveDualBotConfig(data: Partial<DualBotConfig>): Promise<{ success: boolean; config: DualBotConfig; message?: string }> {
  const res = await fetch('/api/telegram/dual-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchProductTypeGroups(search?: string): Promise<{ groups: ProductTypeGroup[]; totalGroups: number; totalAssortments: number }> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`/api/sync/type-groups${query}`);
  return res.json();
}

export async function applyTypePrice(typeKey: string, newPrice: number, costPrice?: number): Promise<{ success: boolean; affectedCount: number; typeKey: string; newPrice: number; log: PriceChangeLog }> {
  const res = await fetch('/api/sync/apply-type-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ typeKey, newPrice, costPrice }),
  });
  return res.json();
}

export async function triggerLivePriceSync(sampleType?: string, customNewPrice?: number): Promise<{
  success: boolean;
  message: string;
  updatedTypesCount: number;
  totalUpdatedAssortments: number;
  newProductsDetectedCount: number;
  logs: PriceChangeLog[];
  pendingProducts: PendingProduct[];
}> {
  const res = await fetch('/api/sync/trigger-now', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sampleType, customNewPrice }),
  });
  return res.json();
}

export async function fetchPendingProducts(): Promise<PendingProduct[]> {
  const res = await fetch('/api/sync/pending-products');
  return res.json();
}

export async function approvePendingProduct(pendingId: string, customPrice?: number, branchId?: string, initialStock?: number): Promise<{ success: boolean; product: Product; message: string }> {
  const res = await fetch('/api/sync/approve-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingId, customPrice, branchId, initialStock }),
  });
  return res.json();
}

export async function rejectPendingProduct(pendingId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/sync/reject-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingId }),
  });
  return res.json();
}

export async function approveAllPendingProducts(): Promise<{ success: boolean; count: number; message: string }> {
  const res = await fetch('/api/sync/approve-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function rejectAllPendingProducts(): Promise<{ success: boolean; count: number; message: string }> {
  const res = await fetch('/api/sync/reject-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function fetchPriceHistory(): Promise<PriceChangeLog[]> {
  const res = await fetch('/api/sync/price-history');
  return res.json();
}

export async function sendDualBotTestNotification(botType: 'sales' | 'sync', message?: string): Promise<{ success: boolean; response: any }> {
  const res = await fetch('/api/sync/test-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ botType, message }),
  });
  return res.json();
}

// Price Types & Auto Markup APIs
export async function fetchPriceTypes(): Promise<PriceType[]> {
  const res = await fetch('/api/price-types');
  return res.json();
}

export async function createPriceType(ptData: Partial<PriceType>): Promise<PriceType> {
  const res = await fetch('/api/price-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ptData),
  });
  return res.json();
}

export async function updatePriceType(id: string, ptData: Partial<PriceType>): Promise<PriceType> {
  const res = await fetch(`/api/price-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ptData),
  });
  return res.json();
}

export async function applyPriceMarkup(priceCode: string, markupPercent: number, categoryId?: string): Promise<{ success: boolean; updatedCount: number; products: Product[] }> {
  const res = await fetch('/api/prices/apply-markup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceCode, markupPercent, categoryId }),
  });
  return res.json();
}

export async function updateProductPrices(productId: string, prices: Record<string, number>): Promise<Product> {
  const res = await fetch(`/api/products/${productId}/prices`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prices }),
  });
  return res.json();
}

export async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch('/api/settings');
  return res.json();
}

export async function updateSettings(settingsData: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settingsData),
  });
  return res.json();
}

export async function askAdminAi(prompt: string): Promise<{ text: string }> {
  const res = await fetch('/api/admin/ai-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  return res.json();
}

// Territories API
export async function fetchTerritories(): Promise<Territory[]> {
  const res = await fetch('/api/territories');
  return res.json();
}

export async function createTerritory(data: Partial<Territory>): Promise<Territory> {
  const res = await fetch('/api/territories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateTerritory(id: string, data: Partial<Territory>): Promise<Territory> {
  const res = await fetch(`/api/territories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteTerritory(id: string): Promise<void> {
  await fetch(`/api/territories/${id}`, { method: 'DELETE' });
}

export async function resetDatabaseExceptProducts(): Promise<{ success: boolean; message: string; remainingProductsCount: number }> {
  const res = await fetch('/api/admin/reset-database-except-products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

// Regos Integration API
export async function getRegosStatus() {
  const res = await fetch('/api/regos/status');
  return res.json();
}

export async function testRegosConnection(config: { regosUrl: string; apiKey: string; branchId: string }) {
  const res = await fetch('/api/regos/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function syncRegosProducts(config: { regosUrl: string; apiKey: string; branchId: string }) {
  const res = await fetch('/api/regos/sync-products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function syncRegosStock(config: { regosUrl: string; apiKey: string; branchId: string }) {
  const res = await fetch('/api/regos/sync-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function exportRegosOrders(config: { regosUrl: string; apiKey: string; branchId: string }) {
  const res = await fetch('/api/regos/export-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function uploadProductImage(imageBase64: string, fileName?: string): Promise<{ success: boolean; imageUrl: string }> {
  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, fileName }),
  });
  return res.json();
}

export async function importRegosBulk(items: any[], updateExisting = true): Promise<{ success: boolean; addedCount: number; updatedCount: number; totalProducts: number }> {
  const res = await fetch('/api/regos/bulk-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, updateExisting }),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function fetchRegosLive(config: { apiUrl?: string; token?: string; apiKey?: string; login?: string; password?: string }) {
  const res = await fetch('/api/regos/fetch-live', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function triggerDualBotSync(): Promise<{ success: boolean; updatedTypesCount: number; newPendingCount: number; message: string }> {
  const res = await fetch('/api/telegram/sync-now', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}

export async function fetchPriceGroups(): Promise<ProductTypeGroup[]> {
  const res = await fetch('/api/price-groups');
  return res.json();
}

export async function updatePriceGroup(typeKey: string, newPrice: number, newCostPrice?: number, notifyAdmin: boolean = true): Promise<{ success: boolean; typeKey: string; updatedCount: number; message: string }> {
  const res = await fetch('/api/price-groups/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ typeKey, newPrice, newCostPrice, notifyAdmin }),
  });
  return res.json();
}

export async function fetchPriceChangeLogs(): Promise<PriceChangeLog[]> {
  const res = await fetch('/api/price-change-logs');
  return res.json();
}

// --- Strict Product Image Discovery & Verification Client APIs --- //

export async function discoverProductImage(id: string, force = false): Promise<{ success: boolean; product: Product; discoveryResult: any }> {
  const res = await fetch(`/api/products/discover-image/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force }),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function batchDiscoverProductImages(options: { categoryId?: string; brand?: string; onlyMissing?: boolean; limit?: number }): Promise<{
  success: boolean;
  totalProcessed: number;
  verifiedCount: number;
  rejectedCount: number;
  notFoundCount: number;
  threshold: number;
  results: any[];
}> {
  const res = await fetch('/api/products/batch-discover-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}

export async function runImageVerifierTestSuite(customProduct?: any): Promise<{
  success: boolean;
  testResults?: any[];
  result?: any;
  totalTests?: number;
}> {
  const res = await fetch('/api/products/test-image-verifier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customProduct }),
  });
  return res.json();
}

export async function fetchImageVerificationLogs(): Promise<any[]> {
  const res = await fetch('/api/products/image-verification-logs');
  return res.json();
}

export async function manualVerifyProductImage(id: string, payload: { imageUrl?: string; status: string; reason?: string }): Promise<{ success: boolean; product: Product }> {
  const res = await fetch(`/api/products/manual-verify-image/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  notifySyncEvent();
  return data;
}





