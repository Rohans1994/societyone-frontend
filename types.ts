export enum Role {
  SuperAdmin = 'SuperAdmin',
  WingAdmin = 'WingAdmin', // Treated as Admin
  Resident = 'Resident',
  Vendor = 'Vendor',
  // Gate/visitor management only — created by an admin (see GateManagement's
  // "Manage Guards"), scoped to one society, and restricted app-wide to
  // seeing nothing but Gate Management (see App.tsx's render branch for
  // Role.Guard, and requireRole('SuperAdmin', 'WingAdmin', 'Guard') on the
  // backend's visitor-request routes).
  Guard = 'Guard'
}

export interface Society {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  pincode: string;
  wings: string[];
  adminEmail: string;
  adminName?: string;
  adminPhone?: string;
  phone?: string;
  createdAt?: string;
  // Name of this society's dedicated Supabase Storage bucket (tendor/amc/assets
  // live in folders within it). Undefined for legacy societies not yet
  // backfilled — uploads fall back to the old shared flat buckets in that case.
  storageBucket?: string;
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

// Up to this many discrete booking slots may be defined per amenity.
export const MAX_FACILITY_SLOTS = 4;

export interface FacilitySlot {
  startTime: string;
  endTime: string;
}

export interface Facility {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  // Up to 4 admin-defined booking slots (e.g. a morning slot and an evening
  // slot), each with its own start/end time. Residents pick one of these
  // slots directly when booking — see FacilityBooking.tsx.
  slots: FacilitySlot[];
  imageUrl: string;
  images?: string[];
  canBook?: boolean; // ability to book as a check box
  requiresPayment?: boolean; // Payment checkbox
  price?: number; // Price/Fee per slot if payment is required
  // Payment collection details, all optional — an admin may offer any
  // combination of these (only shown/editable when requiresPayment is true)
  paymentQrUrl?: string;
  upiId?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
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
  // Optional image or PDF attached to the notice (stored under a notices/
  // folder in the society's storage bucket).
  attachmentUrl?: string;
  // When set, this notice is only visible to that one resident (an admin
  // sending a notice to a specific person from User Management) instead of
  // being a broadcast/common notice visible to everyone. targetUserName is
  // denormalized purely for display in admin views (e.g. "To: Jane Doe").
  targetUid?: string;
  targetUserName?: string;
}

export type VisitorRequestStatus = 'Pending' | 'Approved' | 'Denied';

// A guard (currently the admin login — no separate Guard role exists yet)
// logs a visitor at the main gate against one specific resident (this
// society allows only one registered owner per flat, so targeting a
// resident is equivalent to targeting "this flat"). The resident
// approves/denies in real time. No auto-expiry — an unanswered request just
// stays 'Pending' and the guard follows up by phone.
export interface VisitorRequest {
  id: string;
  societyId?: string;
  residentUid: string;
  residentName?: string;
  wing?: string;
  apartmentNo?: string;
  visitorName: string;
  visitorPhone?: string;
  purpose?: string;
  // Stored under a visitors/ folder in the society's storage bucket.
  photoUrl?: string;
  status: VisitorRequestStatus;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  respondedAt?: string;
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

export type ViewState = 'DASHBOARD' | 'RESIDENT_DASHBOARD' | 'AMC' | 'RESIDENTS' | 'FACILITIES' | 'AMENITIES' | 'FINANCE' | 'INVOICES_FULL' | 'HELPDESK' | 'SECURITY' | 'USER_MANAGEMENT' | 'EVENTS' | 'VENDORS' | 'FISHBOWL' | 'TENDORS' | 'MAINTENANCE' | 'MY_PROFILE' | 'VISITORS';