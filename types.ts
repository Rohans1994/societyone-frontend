export enum Role {
  SuperAdmin = 'SuperAdmin',
  WingAdmin = 'WingAdmin', // Treated as Admin
  Resident = 'Resident',
  Vendor = 'Vendor'
}

export interface Society {
  id: string;
  name: string;
  address: string;
  city?: string;
  pincode: string;
  wings: string[];
  adminEmail: string;
  adminName?: string;
  adminPhone?: string;
  phone?: string;
  createdAt?: string;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  wing?: string;
  apartmentNo?: string;
  avatarUrl?: string;
  password?: string;
  societyId?: string;
  societyName?: string;
  adminApproved?: boolean;
  emailVerified?: boolean;
  verificationToken?: string;
}

export interface FishBowlMessage {
  id: string;
  text: string;
  timestamp: string;
  userId: string;
  userName: string;
  wing: string;
  apartmentNo: string;
  isDeleted?: boolean;
  replyToId?: string;
  societyId?: string;
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  purchaseDate: string;
  modelNo: string;
  status: 'Operational' | 'Down';
  imageUrl?: string;
  description?: string;
  hasWarranty?: boolean;
  warrantyPdfUrl?: string;
  societyId?: string;
}

export interface AMC {
  id: string;
  assetId?: string;
  assetName: string;
  vendorName: string;
  startDate: string;
  expiryDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  cost: number;
  contractPdfUrl?: string;
  contractPdfUrls?: string[];
  paymentDuration?: string;
  paymentMethod?: string;
  lastServiceDate?: string;
  category?: string;
  societyId?: string;
}

export interface Facility {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  openTime: string;
  closeTime: string;
  imageUrl: string;
  images?: string[];
  canBook?: boolean; // ability to book as a check box
  requiresPayment?: boolean; // Payment checkbox
  price?: number; // Price/Fee per slot if payment is required
  rules?: string;
  societyId?: string;
}

export interface Booking {
  id: string;
  facilityId: string;
  facilityName?: string;
  residentName: string;
  residentId?: string;
  wing?: string;
  apartmentNo?: string;
  date: string;
  timeSlot: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  qrCode: string;
  isPaid?: boolean;
  amountPaid?: number;
  paymentRef?: string;
  societyId?: string;
}

export interface FacilityBlock {
  id: string;
  facilityId: string;
  facilityName?: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  blockedBy?: string;
  societyId?: string;
  createdAt?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  category: 'Electrical' | 'Plumbing' | 'Security' | 'Other';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved';
  assignedTo?: string;
  createdBy: string;
  createdByName?: string;
  wing?: string;
  apartmentNo?: string;
  dateCreated: string;
  attachments?: string[]; // URLs for photos/videos
  progressUpdate?: string;
  societyId?: string;
}

export type MaintenanceFrequency = 'Monthly' | 'Quarterly' | 'Six-Monthly' | 'Yearly';

export interface Invoice {
  id: string;
  residentName: string;
  residentId?: string;
  wing?: string;
  apartmentNo?: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  type: 'Maintenance' | 'Utility' | 'Penalty' | 'Others';
  frequency?: MaintenanceFrequency;
  period?: string;
  breakdown?: {
    maintenance?: number;
    sinkingFund?: number;
    waterSecurity?: number;
    parking?: number;
    repairFund?: number;
    other?: number;
  };
  paidAt?: string;
  receiptId?: string;
  paymentMethod?: string;
  description?: string;
  societyId?: string;
}

export interface Receipt {
  id: string;
  invoiceId: string;
  residentId?: string;
  residentName: string;
  wing?: string;
  apartmentNo?: string;
  amount: number;
  paymentDate: string;
  paymentTime?: string;
  paymentMethod: 'UPI' | 'Credit/Debit Card' | 'Net Banking' | 'Cheque' | 'Cash' | string;
  transactionRef: string;
  period?: string;
  frequency?: string;
  societyId?: string;
  societyName?: string;
  status: 'Success' | 'Settled';
  breakdown?: {
    maintenance?: number;
    sinkingFund?: number;
    waterSecurity?: number;
    parking?: number;
    repairFund?: number;
    other?: number;
  };
  pdfUrl?: string;
  createdAt?: string;
}

export interface MaintenancePlan {
  id: string;
  title: string;
  frequency: MaintenanceFrequency;
  periodLabel: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  rateAmount: number;
  breakdown?: {
    maintenance: number;
    sinkingFund?: number;
    waterSecurity?: number;
    parking?: number;
    repairFund?: number;
    other?: number;
  };
  wing?: string; // 'ALL' or specific wing
  notes?: string;
  societyId?: string;
  createdAt?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  organizer: string;
  societyId?: string;
}

export interface Notice {
  id: string;
  title: string;
  description: string;
  category?: 'General' | 'Maintenance' | 'Security' | 'Celebration' | 'Urgent' | string;
  date: string;
  priority?: 'High' | 'Normal' | 'Low' | string;
  createdBy?: string;
  createdByName?: string;
  societyId?: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  date: string;
  societyId?: string;
}

export interface Vendor {
  id: string;
  name: string;
  serviceCategory: string;
  contactPerson: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  societyId?: string;
}

export interface TendorQuotation {
  vendorId: string;
  vendorName: string;
  quotation: number;
  pdfUrl?: string;
  pdfName?: string;
  societyId?: string;
}

export interface Tendor {
  id: string;
  name: string;
  description: string;
  quotations: TendorQuotation[];
  societyId?: string;
}

export type ViewState = 'DASHBOARD' | 'RESIDENT_DASHBOARD' | 'AMC' | 'RESIDENTS' | 'FACILITIES' | 'AMENITIES' | 'FINANCE' | 'INVOICES_FULL' | 'HELPDESK' | 'SECURITY' | 'USER_MANAGEMENT' | 'EVENTS' | 'VENDORS' | 'FISHBOWL' | 'TENDORS' | 'MAINTENANCE';