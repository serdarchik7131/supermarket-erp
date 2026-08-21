export type UserRole = 'super_admin' | 'branch_admin' | 'cashier' | 'courier' | 'customer';

export type PaymentMethod = 'click' | 'payme' | 'uzum' | 'paynet' | 'visa_mastercard' | 'cash' | 'terminal' | 'split';

export type OrderStatus = 'pending' | 'accepted' | 'assembling' | 'in_delivery' | 'delivered' | 'cancelled';

export type DeliveryType = 'express' | 'standard' | 'pickup';

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  isMain: boolean;
  activeCouriers: number;
  dailyRevenue: number;
}

export interface Category {
  id: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  icon: string;
  slug: string;
}

export interface PriceType {
  id: string;
  nameUz: string;
  code: string; // 'prixod' | 'roznitsa' | 'optom' | 'vip' | custom
  defaultMarkupPercent: number; // e.g. 0 for prixod, 30 for roznitsa, 15 for optom
  isDefaultClientPrice?: boolean; // Default price shown in Client App
  description?: string;
}

export interface AgentPermissions {
  allowedCategoryIds?: string[]; // Empty or undefined = All categories allowed
  allowedProductIds?: string[]; // Empty or undefined = All products allowed
  assignedPriceTypeId?: string; // Default price list code (e.g. 'optom' or 'roznitsa')
  maxDiscountPercent?: number; // Maximum discount agent can give
  canCollectPayments?: boolean;
  canCreateClients?: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  categoryId: string;
  brand: string;
  price: number; // in UZS (Default Client price / Roznitsa)
  discountPrice?: number;
  costPrice: number; // Tannarx / Prixod narxi for profit calculation
  prices?: Record<string, number>; // Mapping of priceTypeId or code -> price in UZS (e.g. { prixod: 10000, roznitsa: 13000, optom: 11500, vip: 11000 })
  unit: 'kg' | 'dona' | 'litr' | 'quti' | 'pachka';
  image: string;
  description: string;
  descriptionUz?: string;
  descriptionRu?: string;
  descriptionEn?: string;
  minQuantity?: number; // Minimal xarid miqdori (dona/kg)
  expiryDays: number;
  isPopular?: boolean;
  isPromotional?: boolean;
  stockByBranch: Record<string, number>; // branchId -> stock count
  minStockAlert: number;
  tags: string[];
  sizes?: string[]; // e.g. ['S', 'M', 'L', 'XL'] or ['38', '39', '40', '41']
  colors?: string[]; // e.g. ['Qora', 'Oq', 'Qizil', 'Ko\'k']
  isActive?: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerTelegramId?: string;
  branchId: string;
  branchName: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  cashbackUsed: number;
  cashbackEarned: number;
  deliveryFee: number;
  finalTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  orderStatus: OrderStatus;
  deliveryType: DeliveryType;
  deliveryAddress: {
    address: string;
    lat?: number;
    lng?: number;
    notes?: string;
  };
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  assignedAgentName?: string;
  salesAgentId?: string;
  orderSource?: string;
  estimatedDeliveryTime?: string;
  proofImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  telegramId?: string;
  name: string;
  phone: string;
  role: UserRole;
  branchId?: string;
  avatar?: string;
  loyaltyPoints: number;
  cashbackBalance: number;
  totalOrders: number;
  totalSpent: number;
  vipTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  referralCode: string;
  joinedDate: string;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  branchId: string;
  status: 'available' | 'delivering' | 'offline';
  vehicleType: 'car' | 'scooter' | 'bicycle';
  rating: number;
  totalDelivered: number;
  currentLat: number;
  currentLng: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: 'POS' | 'Inventory' | 'Orders' | 'Security' | 'AI' | 'Branches';
  details: string;
  ipAddress: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  branchId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'EXPIRED';
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface SalesForecastItem {
  productId: string;
  productName: string;
  currentStock: number;
  predictedDemandNext7Days: number;
  recommendedRestock: number;
  riskOfStockout: 'High' | 'Medium' | 'Low';
  suggestedActionUz: string;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  channel: 'telegram' | 'sms' | 'email';
  targetAudience: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  sentCount: number;
  conversionRate: number;
}

export interface POSReceipt {
  id: string;
  receiptNumber: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number; totalPrice: number }>;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
}

export interface Territory {
  id: string;
  name: string;
  code?: string;
  description?: string;
  active?: boolean;
}

export interface Client {
  id: string;
  companyName: string;
  inn?: string;
  taxId?: string;
  contactName?: string;
  contactPerson?: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  locationUrl?: string;
  assignedAgentId?: string;
  assignedAgentName: string;
  creditLimit: number;
  currentDebt: number;
  status: 'active' | 'blocked' | 'pending';
  territoryId?: string;
  territoryName?: string;
  priceType?: string;
  bankAccount?: string;
  bankName?: string;
  mfo?: string;
  createdAt?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'super_admin' | 'manager' | 'sales_agent' | 'courier' | 'accountant';
  phone: string;
  email: string;
  login?: string;
  password?: string;
  branchName: string;
  status: 'active' | 'on_leave' | 'inactive';
  joinedDate: string;
  permissions?: AgentPermissions;
}

export interface PaymentRecord {
  id: string;
  paymentNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'click' | 'payme';
  referenceNo: string;
  notes: string;
  date: string;
  createdByName: string;
}

export interface AktSverkaEntry {
  id: string;
  date: string;
  documentNo: string;
  type: 'shipment' | 'payment';
  description: string;
  debit: number;  // Qarz oshdi (Yuk berildi)
  credit: number; // Qarz kamaydi (To'lov bo'ldi)
  runningBalance: number;
}

export interface Promotion {
  id: string;
  title: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  active: boolean;
  description?: string;
  bannerImage?: string;
}

export interface CustomPaymentMethod {
  id: string;
  name: string;
  code: string;
  icon: string;
  description: string;
  enabled: boolean;
}

export interface SystemSettings {
  minOrderAmountClient: number; // Minimal buyurtma summasi (Klient uchun)
  minOrderAmountAgent: number;  // Minimal buyurtma summasi (Agent uchun)
  isGeolocationRequiredForClient: boolean; // Geolokatsiya majburiyligi (Klient uchun)
  allowCustomAgentDiscounts?: boolean;
  checkoutNoticeText?: string; // Admin tomonidan belgilanadigan buyurtma eslatmasi va shartlari
  checkoutNoticeEnabled?: boolean; // Eslatma panelini ko'rsatish
  deliveryFeeType?: 'free' | 'fixed' | 'threshold_free'; // Bepul, Pulli (fixed) yoki Ma'lum summadan oshsa bepul
  deliveryFeeAmount?: number; // Standart (oddiy) yetkazib berish narxi (UZS)
  deliveryFeeExpressAmount?: number; // Express (tezkor) yetkazib berish narxi (UZS)
  freeDeliveryThreshold?: number; // Bepul yetkazib berish uchun minimal xarid summasi (UZS)
  territories?: Territory[];
  paymentMethods?: CustomPaymentMethod[];
}


