import { AMC, Asset, Booking, Event, Facility, FacilityBlock, FishBowlMessage, Invoice, Role, Society, Ticket, Transaction, User, Vendor } from './types';

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Verifies an invoice/receipt strictly belongs to a given resident. Single
 * source of truth for this check — previously duplicated separately in
 * ResidentDashboard.tsx and ResidentMaintenanceView.tsx, which drifted out of
 * sync: apartment numbers commonly repeat across different wings in the same
 * society (e.g. Wing B apt 101, Wing C apt 101 are different physical units),
 * so matching by apartmentNo alone — without also requiring wing to match —
 * incorrectly aggregates other residents' invoices into this resident's total.
 */
export const isResidentInvoiceMatch = (
  item: { residentId?: string; residentName?: string; wing?: string; apartmentNo?: string },
  currentUser: { uid?: string; name?: string; wing?: string; apartmentNo?: string }
): boolean => {
  if (item.residentId && currentUser.uid && item.residentId === currentUser.uid) {
    return true;
  }
  if (item.residentName && currentUser.name && item.residentName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) {
    if (item.apartmentNo && currentUser.apartmentNo && item.apartmentNo.trim() !== currentUser.apartmentNo.trim()) {
      return false;
    }
    return true;
  }
  if (item.apartmentNo && currentUser.apartmentNo && item.apartmentNo.trim().toLowerCase() === currentUser.apartmentNo.trim().toLowerCase()) {
    if (item.wing && currentUser.wing) {
      return item.wing.trim().toLowerCase() === currentUser.wing.trim().toLowerCase();
    }
    return true;
  }
  return false;
};

// Helper to get dynamic dates
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const getDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(today.getDate() + days);
    return formatDate(d);
};

// Mock Societies Database
export const MOCK_SOCIETIES: Society[] = [
  {
    id: 'soc-mtb32pfk',
    name: 'Arkade Earth',
    address: 'Kanjurmarg East, Near Station',
    city: 'Mumbai',
    pincode: '400042',
    wings: ['Wing A', 'Wing B', 'Wing C', 'Wing D'],
    adminEmail: 'super@society.com',
    adminName: 'Super Admin User',
    adminPhone: '9876543210',
    phone: '9876543210',
    createdAt: '2025-01-15'
  },
  {
    id: 'soc-2',
    name: 'Silver Oak Palms Residency',
    address: 'Survey 18/2, Green Valley Boulevard',
    city: 'Pune',
    pincode: '411045',
    wings: ['Tower 1', 'Tower 2', 'Tower 3'],
    adminEmail: 'admin@silveroak.com',
    adminName: 'Ramesh Kulkarni',
    adminPhone: '9876543213',
    phone: '9876543213',
    createdAt: '2025-02-10'
  }
];

// Mock Users Database for Auth
export const MOCK_USERS: User[] = [
  { 
    uid: 'u1', 
    name: 'Super Admin User', 
    email: 'super@society.com', 
    phone: '9876543210',
    role: Role.SuperAdmin, 
    wing: 'Wing A', 
    apartmentNo: '101', 
    avatarUrl: 'https://picsum.photos/id/64/200/200',
    password: 'password123',
    societyId: 'soc-mtb32pfk',
    societyName: 'Arkade Earth'
  },
  { 
    uid: 'u2', 
    name: 'Admin User', 
    email: 'admin@society.com', 
    phone: '9876543211',
    role: Role.WingAdmin, 
    wing: 'Wing B', 
    apartmentNo: '202', 
    avatarUrl: 'https://picsum.photos/id/65/200/200',
    password: 'password123',
    societyId: 'soc-mtb32pfk',
    societyName: 'Arkade Earth'
  },
  { 
    uid: 'u3', 
    name: 'Resident User', 
    email: 'resident@society.com', 
    phone: '9876543212',
    role: Role.Resident, 
    wing: 'Wing C', 
    apartmentNo: '305', 
    avatarUrl: 'https://picsum.photos/id/91/200/200',
    password: 'password123',
    societyId: 'soc-mtb32pfk',
    societyName: 'Arkade Earth'
  },
  { 
    uid: 'u4', 
    name: 'Ramesh Kulkarni (Admin)', 
    email: 'admin@silveroak.com', 
    phone: '9876543213',
    role: Role.SuperAdmin, 
    wing: 'Tower 1', 
    apartmentNo: 'PH-01', 
    avatarUrl: 'https://picsum.photos/id/68/200/200',
    password: 'password123',
    societyId: 'soc-2',
    societyName: 'Silver Oak Palms Residency'
  }
];

export const MOCK_FISHBOWL: FishBowlMessage[] = [
  {
    id: 'm1',
    text: "The new gym equipment is amazing! Thanks committee.",
    timestamp: "2 hours ago",
    userId: "u3",
    userName: "Resident User",
    wing: "C",
    apartmentNo: "305",
    societyId: "soc-mtb32pfk"
  },
  {
    id: 'm2',
    text: "Does anyone know why the park lights are off since yesterday?",
    timestamp: "4 hours ago",
    userId: "u3",
    userName: "Resident User",
    wing: "C",
    apartmentNo: "305",
    societyId: "soc-mtb32pfk"
  },
  {
    id: 'm3',
    text: "Looking forward to the Diwali party! Hope the catering is better this year.",
    timestamp: "Yesterday",
    userId: "u4",
    userName: "Elena Rodriguez",
    wing: "D",
    apartmentNo: "402",
    societyId: "soc-mtb32pfk"
  }
];

export const MOCK_ASSETS: Asset[] = [
  { id: 'a1', name: 'Clubhouse HVAC', category: 'HVAC', location: 'Clubhouse Roof', purchaseDate: getDateOffset(-600), modelNo: 'TRANE-XR14', status: 'Operational', societyId: 'soc-mtb32pfk' },
  { id: 'a2', name: 'Elevator A', category: 'Lift', location: 'Wing A', purchaseDate: getDateOffset(-1000), modelNo: 'OTIS-GEN2', status: 'Operational', societyId: 'soc-mtb32pfk' },
  { id: 'a3', name: 'Swimming Pool Pump', category: 'Pump', location: 'Pool Area', purchaseDate: getDateOffset(-800), modelNo: 'HAYWARD-SP3200', status: 'Down', societyId: 'soc-mtb32pfk' },
  { id: 'a4', name: 'Main Gate Barrier', category: 'Security', location: 'Main Entrance', purchaseDate: getDateOffset(-200), modelNo: 'CAME-G4000', status: 'Operational', societyId: 'soc-mtb32pfk' },
];

export const MOCK_AMCS: AMC[] = [
  { id: '1', assetId: 'a1', assetName: 'Clubhouse HVAC', vendorName: 'CoolAir Systems', startDate: getDateOffset(-300), expiryDate: getDateOffset(65), status: 'Active', cost: 12000, societyId: 'soc-mtb32pfk' },
  { id: '2', assetId: 'a2', assetName: 'Elevator A', vendorName: 'Otis Maintain', startDate: getDateOffset(-150), expiryDate: getDateOffset(215), status: 'Active', cost: 25000, societyId: 'soc-mtb32pfk' },
  { id: '3', assetId: 'a3', assetName: 'Swimming Pool Pump', vendorName: 'AquaClean', startDate: getDateOffset(-400), expiryDate: getDateOffset(-35), status: 'Expired', cost: 5000, societyId: 'soc-mtb32pfk' },
  { id: '4', assetId: 'a4', assetName: 'Main Gate Barrier', vendorName: 'SecureGuard Pvt Ltd', startDate: getDateOffset(-340), expiryDate: getDateOffset(25), societyId: 'soc-mtb32pfk' },
];

export const MOCK_FACILITIES: Facility[] = [
  { id: 'f1', name: 'Grand Gym', capacity: 20, slots: [{ startTime: '06:00', endTime: '22:00' }], imageUrl: 'https://picsum.photos/id/203/400/300', societyId: 'soc-mtb32pfk' },
  { id: 'f2', name: 'Infinity Pool', capacity: 15, slots: [{ startTime: '07:00', endTime: '20:00' }], imageUrl: 'https://picsum.photos/id/250/400/300', societyId: 'soc-mtb32pfk' },
  { id: 'f3', name: 'Banquet Hall', capacity: 100, slots: [{ startTime: '10:00', endTime: '23:00' }], imageUrl: 'https://picsum.photos/id/439/400/300', societyId: 'soc-mtb32pfk' },
];

export const MOCK_TICKETS: Ticket[] = [
  { 
    id: 't1', 
    title: 'Leaking pipe in Lobby A', 
    description: 'There is a significant water leakage near the mailbox area.',
    category: 'Plumbing', 
    priority: 'High', 
    status: 'In Progress', 
    assignedTo: 'Mario Plumbers', 
    createdBy: 'u3', 
    createdByName: 'Resident User',
    wing: 'C',
    apartmentNo: '305',
    dateCreated: getDateOffset(-2),
    attachments: [],
    progressUpdate: 'Vendor has inspected the site. Parts ordered.',
    societyId: 'soc-mtb32pfk'
  },
  { 
    id: 't2', 
    title: 'Street light flickering', 
    description: 'The lamp post near the main gate is flickering constantly.',
    category: 'Electrical', 
    priority: 'Medium', 
    status: 'Open', 
    createdBy: 'u1', 
    createdByName: 'Super Admin User',
    wing: 'A',
    apartmentNo: '101',
    dateCreated: getDateOffset(-1),
    attachments: [],
    societyId: 'soc-mtb32pfk'
  },
  { 
    id: 't3', 
    title: 'Gym AC not cooling', 
    description: 'The AC unit in the cardio section is blowing warm air.',
    category: 'Other', 
    priority: 'Low', 
    status: 'Resolved', 
    createdBy: 'u3', 
    createdByName: 'Resident User', 
    wing: 'C',
    apartmentNo: '305',
    dateCreated: getDateOffset(-7),
    attachments: [],
    progressUpdate: 'Gas refilled and filter cleaned. Working fine now.',
    societyId: 'soc-mtb32pfk'
  },
];

export const MOCK_INVOICES: Invoice[] = [
  { id: 'inv1', residentName: 'John Doe', amount: 1500, dueDate: getDateOffset(5), status: 'Paid', type: 'Maintenance', societyId: 'soc-mtb32pfk' },
  { id: 'inv2', residentName: 'Sarah Smith', amount: 1500, dueDate: getDateOffset(5), status: 'Unpaid', type: 'Maintenance', societyId: 'soc-mtb32pfk' },
  { id: 'inv3', residentName: 'Mike Ross', amount: 450, dueDate: getDateOffset(-10), status: 'Overdue', type: 'Utility', societyId: 'soc-mtb32pfk' },
];

export const MOCK_BOOKINGS: Booking[] = [
  { id: 'b1', facilityId: 'f1', facilityName: 'Grand Gym', residentName: 'Alex Sterling', wing: 'Wing C', apartmentNo: '305', date: getDateOffset(1), timeSlot: '18:00 - 19:00', status: 'Confirmed', qrCode: 'QR_DATA_123', societyId: 'soc-mtb32pfk' }
];

export const MOCK_FACILITY_BLOCKS: FacilityBlock[] = [
  {
    id: 'blk-1',
    facilityId: 'f2',
    facilityName: 'Infinity Pool',
    date: getDateOffset(2),
    startTime: '10:00',
    endTime: '14:00',
    reason: 'Routine chemical filtration & deep pool chlorination',
    blockedBy: 'Super Admin',
    societyId: 'soc-mtb32pfk',
    createdAt: getDateOffset(0)
  }
];

export const MOCK_EVENTS: Event[] = [
  { id: 'e1', title: 'Diwali Celebration', date: getDateOffset(10), time: '18:00', location: 'Clubhouse', description: 'Grand celebration with dinner and music.', organizer: 'Cultural Committee', societyId: 'soc-mtb32pfk' },
  { id: 'e2', title: 'AGM Meeting', date: getDateOffset(20), time: '10:00', location: 'Banquet Hall', description: 'Annual General Meeting for all society members.', organizer: 'Managing Committee', societyId: 'soc-mtb32pfk' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx1', title: 'October Maintenance Collection', amount: 150000, type: 'Income', category: 'Maintenance', date: getDateOffset(-20), societyId: 'soc-mtb32pfk' },
  { id: 'tx2', title: 'Security Agency Payment', amount: 45000, type: 'Expense', category: 'Salaries', date: getDateOffset(-25), societyId: 'soc-mtb32pfk' },
  { id: 'tx3', title: 'Diwali Decoration', amount: 12000, type: 'Expense', category: 'Events', date: getDateOffset(-5), societyId: 'soc-mtb32pfk' },
  { id: 'tx4', title: 'Clubhouse Booking', amount: 5000, type: 'Income', category: 'Facility', date: getDateOffset(-10), societyId: 'soc-mtb32pfk' },
  { id: 'tx5', title: 'November Maintenance Collection', amount: 100000, type: 'Income', category: 'Maintenance', date: getDateOffset(0), societyId: 'soc-mtb32pfk' },
];

export const MOCK_VENDORS: Vendor[] = [
  { id: 'v1', name: 'CoolAir Systems', serviceCategory: 'HVAC', contactPerson: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@coolair.com', status: 'Active', societyId: 'soc-mtb32pfk' },
  { id: 'v2', name: 'Mario Plumbers', serviceCategory: 'Plumbing', contactPerson: 'Mario', phone: '9898989898', email: 'service@mario.com', status: 'Active', societyId: 'soc-mtb32pfk' },
  { id: 'v3', name: 'SecureGuard Pvt Ltd', serviceCategory: 'Security', contactPerson: 'Vikram Singh', phone: '9123456780', email: 'vikram@secureguard.com', status: 'Active', societyId: 'soc-mtb32pfk' },
];

export const WINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];