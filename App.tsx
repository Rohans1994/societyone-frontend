import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ResidentDashboard } from './components/ResidentDashboard';
import { AMCManager } from './components/AMCManager';
import { ResidentDirectory } from './components/ResidentDirectory';
import { FacilityBooking } from './components/FacilityBooking';
import { FinanceOverview } from './components/FinanceOverview';
import { InvoiceHistory } from './components/InvoiceHistory';
import { HelpDesk } from './components/HelpDesk';
import { Events } from './components/Events';
import { FishBowl } from './components/FishBowl';
import { GeminiAssistant } from './components/GeminiAssistant';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { UserManagement } from './components/UserManagement';
import { VendorManagement } from './components/VendorManagement';
import { TendorManagement } from './components/TendorManagement';
import { AmenitiesManager } from './components/AmenitiesManager';
import { ResidentMaintenanceView } from './components/ResidentMaintenanceView';
import { ViewState, User, Role, Society, Invoice, Transaction, Event, Notice, Vendor, Ticket, FishBowlMessage, Tendor, Booking, Asset, AMC, Facility, FacilityBlock, Receipt } from './types';
import { supabase } from './supabaseClient';
import { 
  MOCK_SOCIETIES,
  MOCK_USERS,
  MOCK_AMCS, 
  MOCK_ASSETS, 
  MOCK_FACILITIES, 
  MOCK_FACILITY_BLOCKS,
  MOCK_INVOICES, 
  MOCK_TICKETS, 
  MOCK_BOOKINGS,
  MOCK_TRANSACTIONS,
  MOCK_EVENTS,
  MOCK_VENDORS,
  MOCK_FISHBOWL
} from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('FACILITIES');
  const [isAIOpen, setIsAIOpen] = useState(false);
  
  // Multi-tenant Societies State fetched from registered database records
  const [societies, setSocieties] = useState<Society[]>([]);

  // Users state fetched directly from Supabase database (no local storage)
  const [users, setUsers] = useState<User[]>([]);

  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [fishBowlMessages, setFishBowlMessages] = useState<FishBowlMessage[]>(MOCK_FISHBOWL);
  const [tendors, setTendors] = useState<Tendor[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>(MOCK_FACILITIES);
  const [facilityBlocks, setFacilityBlocks] = useState<FacilityBlock[]>(MOCK_FACILITY_BLOCKS);
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [amcs, setAmcs] = useState<AMC[]>(MOCK_AMCS);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  // Whether we've finished checking for an existing Supabase session on
  // mount (so we don't briefly flash the login screen before that check
  // resolves on a page refresh where the user was already signed in).
  const [sessionChecked, setSessionChecked] = useState(false);

  // Societies are needed pre-login (the Auth screen's society picker), so
  // they're fetched publicly and separately from everything else below.
  const fetchSocieties = useCallback(async () => {
    try {
      const res = await fetch('/api/societies');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSocieties(data);
      }
    } catch (err) {
      console.error('Failed to load societies from database:', err);
    }
  }, []);

  useEffect(() => {
    fetchSocieties();
  }, [fetchSocieties]);

  // Restore session on page load/refresh: if a Supabase session already
  // exists, fetch this account's profile and re-establish currentUser so a
  // refresh doesn't force a fresh login every time.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const res = await fetch('/api/users/me');
          if (res.ok) {
            const profile = await res.json();
            setCurrentUser({
              uid: profile.uid,
              name: profile.name,
              email: profile.email,
              phone: profile.phone,
              avatarUrl: profile.avatarUrl,
              role: profile.role,
              wing: profile.wing,
              apartmentNo: profile.apartmentNo,
              societyId: profile.societyId,
              societyName: profile.societyName,
              adminApproved: profile.adminApproved,
              emailVerified: profile.emailVerified
            });
          } else {
            // Session token is stale/invalid for our backend (e.g. profile
            // deleted) — clear it so the login screen shows instead of a
            // silently broken authenticated state.
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setSessionChecked(true);
      }
    })();
  }, []);

  // Everything below requires a logged-in session (see middleware/auth.ts on
  // the backend), so it's only fetched once currentUser is set — fetching it
  // before login would just 401.
  const fetchAllData = useCallback(async () => {
    try {
      const [
        usersRes,
        vendorsRes,
        tendorsRes,
        invoicesRes,
        transactionsRes,
        eventsRes,
        noticesRes,
        ticketsRes,
        fishbowlRes,
        bookingsRes,
        facilitiesRes,
        facilityBlocksRes,
        assetsRes,
        amcsRes,
        receiptsRes
      ] = await Promise.all([
        fetch('/api/users').then(r => r.json()).catch(() => null),
        fetch('/api/vendors').then(r => r.json()).catch(() => null),
        fetch('/api/tendors').then(r => r.json()).catch(() => null),
        fetch('/api/invoices').then(r => r.json()).catch(() => null),
        fetch('/api/transactions').then(r => r.json()).catch(() => null),
        fetch('/api/events').then(r => r.json()).catch(() => null),
        fetch('/api/notices').then(r => r.json()).catch(() => null),
        fetch('/api/tickets').then(r => r.json()).catch(() => null),
        fetch('/api/fishbowl').then(r => r.json()).catch(() => null),
        fetch('/api/bookings').then(r => r.json()).catch(() => null),
        fetch('/api/facilities').then(r => r.json()).catch(() => null),
        fetch('/api/facility-blocks').then(r => r.json()).catch(() => null),
        fetch('/api/assets').then(r => r.json()).catch(() => null),
        fetch('/api/amc').then(r => r.json()).catch(() => null),
        fetch('/api/receipts').then(r => r.json()).catch(() => null),
      ]);

      if (Array.isArray(usersRes)) {
        setUsers(usersRes);
      }
      if (Array.isArray(vendorsRes)) setVendors(vendorsRes);
      if (Array.isArray(tendorsRes)) setTendors(tendorsRes);
      if (Array.isArray(invoicesRes)) setInvoices(invoicesRes);
      if (Array.isArray(transactionsRes)) setTransactions(transactionsRes);
      if (Array.isArray(eventsRes)) setEvents(eventsRes);
      if (Array.isArray(noticesRes)) setNotices(noticesRes);
      if (Array.isArray(ticketsRes)) setTickets(ticketsRes);
      if (Array.isArray(fishbowlRes)) setFishBowlMessages(fishbowlRes);
      if (Array.isArray(bookingsRes)) setBookings(bookingsRes);
      if (Array.isArray(facilitiesRes)) setFacilities(facilitiesRes);
      if (Array.isArray(facilityBlocksRes)) setFacilityBlocks(facilityBlocksRes);
      if (Array.isArray(assetsRes)) setAssets(assetsRes);
      if (Array.isArray(amcsRes)) setAmcs(amcsRes);
      if (Array.isArray(receiptsRes)) setReceipts(receiptsRes);
    } catch (err) {
      console.error('Failed to load remote data from database:', err);
    }
  }, []);

  // Only fetch protected data once we have a logged-in user.
  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, fetchAllData]);

  // When user changes, set the appropriate initial view
  useEffect(() => {
    if (currentUser) {
       if (currentUser.role === Role.Resident) {
         setCurrentView('RESIDENT_DASHBOARD');
       } else {
         setCurrentView('DASHBOARD');
       }
    }
  }, [currentUser]);

  // Current active society mapping
  const activeSociety = useMemo(() => {
    if (!currentUser) return societies[0];
    return (
      societies.find(s => s.id === currentUser.societyId) ||
      societies.find(s => s.name === currentUser.societyName) ||
      societies[0]
    );
  }, [societies, currentUser]);

  const currentSocietyId = activeSociety?.id || 'soc-mtb32pfk';

  // Fetch residents from Supabase strictly for the active society
  const fetchSocietyResidents = useCallback(async (socId: string) => {
    if (!socId) return;
    try {
      const res = await fetch(`/api/users?societyId=${encodeURIComponent(socId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(prev => {
            const others = prev.filter(u => u.societyId !== socId);
            return [...others, ...data];
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch society residents from Supabase database:', err);
    }
  }, []);

  // Sync society residents from Supabase when society ID changes (requires login)
  useEffect(() => {
    if (currentUser && currentSocietyId) {
      fetchSocietyResidents(currentSocietyId);
    }
  }, [currentUser, currentSocietyId, fetchSocietyResidents]);

  // Filtered residents list for the active society (strictly from Supabase data matching society ID)
  const societyResidents = useMemo(() => {
    return users.filter(u => u.societyId === currentSocietyId);
  }, [users, currentSocietyId]);

  // Society-specific isolated data
  const societyTickets = useMemo(() => {
    return tickets.filter(t => !t.societyId || t.societyId === currentSocietyId);
  }, [tickets, currentSocietyId]);

  const societyInvoices = useMemo(() => {
    return invoices.filter(i => !i.societyId || i.societyId === currentSocietyId);
  }, [invoices, currentSocietyId]);

  const societyTransactions = useMemo(() => {
    return transactions.filter(tx => !tx.societyId || tx.societyId === currentSocietyId);
  }, [transactions, currentSocietyId]);

  const societyEvents = useMemo(() => {
    return events.filter(e => !e.societyId || e.societyId === currentSocietyId);
  }, [events, currentSocietyId]);

  const societyNotices = useMemo(() => {
    return notices.filter(n => !n.societyId || n.societyId === currentSocietyId);
  }, [notices, currentSocietyId]);

  const societyVendors = useMemo(() => {
    return vendors.filter(v => !v.societyId || v.societyId === currentSocietyId);
  }, [vendors, currentSocietyId]);

  const societyTendors = useMemo(() => {
    return tendors.filter(t => !t.societyId || t.societyId === currentSocietyId);
  }, [tendors, currentSocietyId]);

  const societyAssets = useMemo(() => {
    return assets.filter(a => !a.societyId || a.societyId === currentSocietyId);
  }, [assets, currentSocietyId]);

  const societyAMCs = useMemo(() => {
    return amcs.filter(a => !a.societyId || a.societyId === currentSocietyId);
  }, [amcs, currentSocietyId]);

  const societyBookings = useMemo(() => {
    return bookings.filter(b => !b.societyId || b.societyId === currentSocietyId);
  }, [bookings, currentSocietyId]);

  const societyFacilities = useMemo(() => {
    return facilities.filter(f => !f.societyId || f.societyId === currentSocietyId);
  }, [facilities, currentSocietyId]);

  const societyFacilityBlocks = useMemo(() => {
    return facilityBlocks.filter(b => !b.societyId || b.societyId === currentSocietyId);
  }, [facilityBlocks, currentSocietyId]);

  const societyFishbowl = useMemo(() => {
    return fishBowlMessages.filter(m => !m.societyId || m.societyId === currentSocietyId);
  }, [fishBowlMessages, currentSocietyId]);

  const societyReceipts = useMemo(() => {
    return receipts.filter(r => !r.societyId || r.societyId === currentSocietyId);
  }, [receipts, currentSocietyId]);

  const fetchReceipts = useCallback(async () => {
    try {
      const res = await fetch('/api/receipts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setReceipts(data);
      }
    } catch (err) {
      console.error('Error fetching receipts from Supabase:', err);
    }
  }, []);

  const handlePaymentSuccess = useCallback((receipt: Receipt, invoiceId: string) => {
    setReceipts(prev => [receipt, ...prev.filter(r => r.id !== receipt.id)]);
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'Paid' } : inv));
    fetch('/api/transactions')
      .then(r => r.json())
      .then(txData => {
        if (Array.isArray(txData)) setTransactions(txData);
      })
      .catch(() => {});
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleRegister = async (newUser: User) => {
    const isApproved = newUser.adminApproved !== undefined ? newUser.adminApproved : (newUser.role === Role.Resident ? false : true);
    const isEmailVerified = newUser.emailVerified !== undefined ? newUser.emailVerified : (newUser.role === Role.Resident ? false : true);
    const userToSave: User = {
      ...newUser,
      adminApproved: isApproved,
      emailVerified: isEmailVerified,
      societyId: newUser.societyId || activeSociety?.id || 'soc-mtb32pfk',
      societyName: newUser.societyName || activeSociety?.name || 'Arkade Earth'
    };
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userToSave)
      });
    } catch (err) {
      console.error('Error registering user API:', err);
    }
    
    setUsers(prev => {
      const filtered = prev.filter(u => u.uid !== userToSave.uid && u.email !== userToSave.email);
      return [...filtered, userToSave];
    });
    
    // Only auto-login if user is email verified AND admin approved
    if (userToSave.adminApproved !== false && userToSave.emailVerified !== false) {
      setCurrentUser(userToSave);
    }
  };

  const handleSocietyCreated = async (newSociety: Society, adminUser: User, autoLogin: boolean) => {
    // 1. Persist society in Supabase PostgreSQL — this also creates the
    // society's dedicated Storage bucket server-side and returns its name.
    let storageBucket: string | undefined;
    try {
      const res = await fetch('/api/societies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSociety)
      });
      const data = await res.json().catch(() => null);
      storageBucket = data?.storageBucket || undefined;
    } catch (err) {
      console.error('Error persisting new society in Supabase database:', err);
    }

    const finalSociety: Society = { ...newSociety, storageBucket };

    // 2. Save society in state (with its resolved storage bucket attached)
    setSocieties(prev => {
      if (prev.some(s => s.id === finalSociety.id)) return prev;
      return [finalSociety, ...prev];
    });

    // 3. Ensure admin user is linked to the new society ID
    const finalAdminUser: User = {
      ...adminUser,
      societyId: finalSociety.id,
      societyName: finalSociety.name
    };

    // 4. Persist admin user in Supabase PostgreSQL
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalAdminUser)
      });
    } catch (err) {
      console.error('Error persisting admin user in Supabase database:', err);
    }

    setUsers(prev => {
      const filtered = prev.filter(u => u.uid !== finalAdminUser.uid && u.email !== finalAdminUser.email);
      return [...filtered, finalAdminUser];
    });

    // 5. Auto login if requested
    if (autoLogin) {
      setCurrentUser(finalAdminUser);
      setCurrentView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut().catch((err) => console.error('Error signing out:', err));
    setCurrentUser(null);
    setCurrentView('FACILITIES');
  };

  // User Management
  const handleUpdateRole = async (uid: string, newRole: Role) => {
    try {
      await fetch(`/api/users/${uid}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating role in database:', err);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await fetch(`/api/users/${uid}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (err) {
      console.error('Error deleting user from database:', err);
    }
  };

  const handleAddUser = async (user: User) => {
    const userToSave: User = {
      ...user,
      adminApproved: user.adminApproved !== undefined ? user.adminApproved : true,
      societyId: user.societyId || currentUser?.societyId || activeSociety?.id || 'soc-mtb32pfk',
      societyName: user.societyName || currentUser?.societyName || activeSociety?.name || 'Arkade Earth'
    };
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userToSave)
      });
      const data = await res.json().catch(() => null);
      // This form doesn't collect a password, so the backend generates a
      // temporary one — surface it so the admin can actually hand it to the
      // new user (otherwise the account would be created with no way to sign in).
      if (data?.generatedPassword) {
        alert(`User created. Temporary password: ${data.generatedPassword}\n\nShare this with ${userToSave.name} — they should sign in and can reset it from their profile.`);
      }
      setUsers(prev => {
        const filtered = prev.filter(u => u.uid !== userToSave.uid && u.email !== userToSave.email);
        return [...filtered, userToSave];
      });
    } catch (err) {
      console.error('Error adding user to database:', err);
    }
  };

  const handleApproveUser = async (uid: string) => {
    try {
      await fetch(`/api/users/${uid}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, adminApproved: true } : u));
    } catch (err) {
      console.error('Error approving user in database:', err);
    }
  };

  // Finance Management
  const handleCreateInvoice = async (invoice: Invoice) => {
    const invoiceToSave: Invoice = {
      ...invoice,
      societyId: invoice.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceToSave)
      });
      setInvoices([invoiceToSave, ...invoices]);
    } catch (err) {
      console.error('Error creating invoice:', err);
    }
  };

  const handleUpdateInvoice = async (updatedInvoice: Invoice) => {
    try {
      const oldInvoice = invoices.find(i => i.id === updatedInvoice.id);
      await fetch(`/api/invoices/${updatedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInvoice)
      });
      setInvoices(invoices.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));

      // If status changed to Paid, add to transaction ledger
      if (updatedInvoice.status === 'Paid' && oldInvoice?.status !== 'Paid') {
          const tx: Transaction = {
              id: `TX-INV-${updatedInvoice.id}-${Date.now()}`,
              title: `Invoice Paid: ${updatedInvoice.residentName}${updatedInvoice.description ? ` - ${updatedInvoice.description}` : ''}`,
              amount: updatedInvoice.amount,
              type: 'Income',
              category: 'Invoice',
              date: new Date().toISOString().split('T')[0],
              societyId: updatedInvoice.societyId || activeSociety?.id || 'soc-mtb32pfk'
          };
          handleAddTransaction(tx);
      }
    } catch (err) {
      console.error('Error updating invoice:', err);
    }
  };

  const handleAddTransaction = async (transaction: Transaction) => {
    const txToSave: Transaction = {
      ...transaction,
      societyId: transaction.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txToSave)
      });
      setTransactions(prev => [txToSave, ...prev]);
    } catch (err) {
      console.error('Error adding transaction:', err);
    }
  };

  // Event Management
  const handleAddEvent = async (event: Event) => {
    const eventToSave: Event = {
      ...event,
      societyId: event.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventToSave)
      });
      setEvents(prev => [eventToSave, ...prev]);
    } catch (err) {
      console.error('Error adding event:', err);
    }
  };

  const handleUpdateEvent = async (updatedEvent: Event) => {
    try {
      await fetch(`/api/events/${updatedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent)
      });
      setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    } catch (err) {
      console.error('Error updating event:', err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      setEvents(events.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  // Notice Management
  const handleAddNotice = async (notice: Notice) => {
    const noticeToSave: Notice = {
      ...notice,
      societyId: notice.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noticeToSave)
      });
      setNotices(prev => [noticeToSave, ...prev]);
    } catch (err) {
      console.error('Error adding notice:', err);
    }
  };

  const handleUpdateNotice = async (updatedNotice: Notice) => {
    try {
      await fetch(`/api/notices/${updatedNotice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedNotice)
      });
      setNotices(prev => prev.map(n => n.id === updatedNotice.id ? updatedNotice : n));
    } catch (err) {
      console.error('Error updating notice:', err);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await fetch(`/api/notices/${id}`, { method: 'DELETE' });
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notice:', err);
    }
  };

  // Vendor Management
  const handleAddVendor = async (vendor: Vendor) => {
    const vendorToSave: Vendor = {
      ...vendor,
      societyId: vendor.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorToSave)
      });
      setVendors(prev => [...prev, vendorToSave]);
    } catch (err) {
      console.error('Error adding vendor:', err);
    }
  };

  const handleUpdateVendor = async (updatedVendor: Vendor) => {
    try {
      await fetch(`/api/vendors/${updatedVendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVendor)
      });
      setVendors(vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v));
    } catch (err) {
      console.error('Error updating vendor:', err);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      setVendors(vendors.filter(v => v.id !== id));
    } catch (err) {
      console.error('Error deleting vendor:', err);
    }
  };

  // Tendor Management handlers
  const handleAddTendor = async (newTendor: Tendor) => {
    const tendorToSave: Tendor = {
      ...newTendor,
      societyId: newTendor.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/tendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tendorToSave)
      });
      setTendors(prev => [...prev, tendorToSave]);
    } catch (err) {
      console.error('Error adding tendor:', err);
    }
  };

  const handleUpdateTendor = async (updatedTendor: Tendor) => {
    try {
      await fetch(`/api/tendors/${updatedTendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTendor)
      });
      setTendors(tendors.map(t => t.id === updatedTendor.id ? updatedTendor : t));
    } catch (err) {
      console.error('Error updating tendor:', err);
    }
  };

  const handleDeleteTendor = async (id: string) => {
    try {
      await fetch(`/api/tendors/${id}`, { method: 'DELETE' });
      setTendors(tendors.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting tendor:', err);
    }
  };

  // Help Desk Management
  const handleUpdateTicket = async (updatedTicket: Ticket) => {
    try {
      await fetch(`/api/tickets/${updatedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTicket)
      });
      setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    } catch (err) {
      console.error('Error updating ticket:', err);
    }
  };

  const handleAddTicket = async (newTicket: Ticket) => {
    const ticketToSave: Ticket = {
      ...newTicket,
      societyId: newTicket.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketToSave)
      });
      setTickets([ticketToSave, ...tickets]);
    } catch (err) {
      console.error('Error adding ticket:', err);
    }
  };

  // Asset and AMC persistence handlers
  const handleAddAsset = async (newAsset: Asset) => {
    const assetToSave: Asset = {
      ...newAsset,
      societyId: newAsset.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetToSave)
      });
      setAssets(prev => [...prev, assetToSave]);
    } catch (err) {
      console.error('Error adding asset to database:', err);
    }
  };

  const handleUpdateAsset = async (updatedAsset: Asset) => {
    try {
      await fetch(`/api/assets/${updatedAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAsset)
      });
      setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    } catch (err) {
      console.error('Error updating asset in database:', err);
    }
  };

  const handleAddAMC = async (newAMC: AMC) => {
    const amcToSave: AMC = {
      ...newAMC,
      societyId: newAMC.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/amc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(amcToSave)
      });
      setAmcs(prev => [...prev, amcToSave]);
    } catch (err) {
      console.error('Error adding AMC to database:', err);
    }
  };

  // Fish Bowl Management
  const handlePostFishBowlMessage = async (text: string, replyToId?: string) => {
    if (!currentUser) return;
    const newMessage: FishBowlMessage = {
      id: `m-${Date.now()}`,
      text,
      timestamp: 'Just now',
      userId: currentUser.uid,
      userName: currentUser.name,
      wing: currentUser.wing || '?',
      apartmentNo: currentUser.apartmentNo || '?',
      replyToId: replyToId,
      societyId: activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      await fetch('/api/fishbowl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage)
      });
      setFishBowlMessages(prev => [newMessage, ...prev]);
    } catch (err) {
      console.error('Error posting fishbowl message:', err);
    }
  };

  const handleDeleteFishBowlMessage = async (id: string) => {
    try {
      await fetch(`/api/fishbowl/${id}`, { method: 'DELETE' });
      setFishBowlMessages(prev => prev.map(m => 
        m.id === id ? { ...m, isDeleted: true } : m
      ));
    } catch (err) {
      console.error('Error setting deleted flag on fishbowl message:', err);
    }
  };

  // Amenities / Facilities Management
  const handleAddFacility = async (newFacility: Facility) => {
    const facilityToSave: Facility = {
      ...newFacility,
      societyId: activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facilityToSave)
      });
      if (res.ok) {
        setFacilities(prev => [facilityToSave, ...prev.filter(f => f.id !== facilityToSave.id)]);
      }
    } catch (err) {
      console.error('Error adding facility:', err);
    }
  };

  const handleUpdateFacility = async (updatedFacility: Facility) => {
    try {
      const res = await fetch(`/api/facilities/${updatedFacility.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFacility)
      });
      if (res.ok) {
        setFacilities(prev => prev.map(f => f.id === updatedFacility.id ? updatedFacility : f));
      }
    } catch (err) {
      console.error('Error updating facility:', err);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    try {
      const res = await fetch(`/api/facilities/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFacilities(prev => prev.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error('Error deleting facility:', err);
    }
  };

  // Facility Block / Maintenance Handlers
  const handleAddBlock = async (newBlock: FacilityBlock) => {
    const blockToSave: FacilityBlock = {
      ...newBlock,
      societyId: newBlock.societyId || activeSociety?.id || 'soc-mtb32pfk'
    };
    try {
      const res = await fetch('/api/facility-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockToSave)
      });
      if (res.ok) {
        setFacilityBlocks(prev => [blockToSave, ...prev.filter(b => b.id !== blockToSave.id)]);
      }
    } catch (err) {
      console.error('Error adding facility block:', err);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      const res = await fetch(`/api/facility-blocks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFacilityBlocks(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error('Error deleting facility block:', err);
    }
  };

  // Bookings Handlers
  const handleBookSlot = async (newBooking: Booking) => {
    try {
      const bookingToSave: Booking = {
        ...newBooking,
        wing: newBooking.wing || currentUser?.wing || '',
        apartmentNo: newBooking.apartmentNo || currentUser?.apartmentNo || ''
      };
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingToSave)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to complete booking. Slot may be unavailable.');
      }
      setBookings(prev => [bookingToSave, ...prev]);

      // If paid, also refresh transactions from DB
      if (bookingToSave.isPaid && bookingToSave.amountPaid) {
        fetch('/api/transactions')
          .then(r => r.json())
          .then(txData => {
            if (Array.isArray(txData)) setTransactions(txData);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Error recording booking:', err);
      throw err;
    }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error('Error deleting booking:', err);
    }
  };

  const renderView = () => {
    if (!currentUser) return null;

    const isAdminOrSuper = currentUser.role === Role.SuperAdmin || currentUser.role === Role.WingAdmin;
    const isSuperAdmin = currentUser.role === Role.SuperAdmin;

    switch (currentView) {
      case 'MAINTENANCE':
        return (
          <ResidentMaintenanceView 
            currentUser={currentUser}
            invoices={societyInvoices}
            receipts={societyReceipts}
            societyName={activeSociety?.name}
            onRefreshReceipts={fetchReceipts}
            onPaymentSuccess={handlePaymentSuccess}
          />
        );
      case 'DASHBOARD':
        return isAdminOrSuper ? (
          <Dashboard 
            user={currentUser} 
            invoices={societyInvoices} 
            tickets={societyTickets} 
            amcs={societyAMCs} 
            events={societyEvents} 
            notices={societyNotices}
            users={societyResidents}
            onApproveUser={handleApproveUser}
            onNavigate={setCurrentView} 
          />
        ) : (
          <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} invoices={societyInvoices} onNavigate={setCurrentView} />
        );
      case 'RESIDENT_DASHBOARD':
        return <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} invoices={societyInvoices} onNavigate={setCurrentView} />;
      case 'AMENITIES':
        return isAdminOrSuper ? (
          <AmenitiesManager 
            facilities={societyFacilities}
            facilityBlocks={societyFacilityBlocks}
            societyName={activeSociety?.name}
            userRole={currentUser.role}
            onAddFacility={handleAddFacility}
            onUpdateFacility={handleUpdateFacility}
            onDeleteFacility={handleDeleteFacility}
            onAddBlock={handleAddBlock}
            onDeleteBlock={handleDeleteBlock}
            onNavigateToBooking={() => setCurrentView('FACILITIES')}
          />
        ) : (
          <FacilityBooking 
            facilities={societyFacilities} 
            bookings={societyBookings} 
            facilityBlocks={societyFacilityBlocks}
            currentUser={currentUser}
            societyName={activeSociety?.name}
            onBookSlot={handleBookSlot}
            onCancelBooking={handleCancelBooking}
          />
        );
      case 'AMC':
        return isAdminOrSuper ? (
          <AMCManager 
            amcs={societyAMCs} 
            assets={societyAssets} 
            vendors={societyVendors} 
            storageBucket={activeSociety?.storageBucket}
            onAddAsset={handleAddAsset}
            onUpdateAsset={handleUpdateAsset}
            onAddAMC={handleAddAMC}
          />
        ) : (
          <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} onNavigate={setCurrentView} />
        );
      case 'RESIDENTS':
        return isAdminOrSuper ? (
          <ResidentDirectory 
            onOpenAI={() => setIsAIOpen(true)} 
            residents={societyResidents} 
            wings={activeSociety?.wings}
            societyName={activeSociety?.name}
          />
        ) : (
          <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} onNavigate={setCurrentView} />
        );
      case 'FACILITIES':
        return (
          <FacilityBooking 
            facilities={societyFacilities} 
            bookings={societyBookings} 
            facilityBlocks={societyFacilityBlocks}
            currentUser={currentUser}
            societyName={activeSociety?.name}
            onBookSlot={handleBookSlot}
            onCancelBooking={handleCancelBooking}
          />
        );
      case 'FINANCE':
        return isAdminOrSuper ? (
          <FinanceOverview 
            invoices={societyInvoices} 
            transactions={societyTransactions} 
            userRole={currentUser.role} 
            users={societyResidents} 
            societyId={currentSocietyId}
            societyName={activeSociety?.name}
            onCreateInvoice={handleCreateInvoice} 
            onAddTransaction={handleAddTransaction} 
            onViewAllInvoices={() => setCurrentView('INVOICES_FULL')} 
            onRefreshData={fetchAllData}
          />
        ) : (
          <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} onNavigate={setCurrentView} />
        );
      case 'INVOICES_FULL':
        return isAdminOrSuper ? <InvoiceHistory invoices={societyInvoices} onBack={() => setCurrentView('FINANCE')} onUpdateInvoice={handleUpdateInvoice} /> : <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} onNavigate={setCurrentView} />;
      case 'HELPDESK':
        return <HelpDesk tickets={societyTickets} userRole={currentUser.role} currentUser={currentUser} onUpdateTicket={handleUpdateTicket} onAddTicket={handleAddTicket} />;
      case 'EVENTS':
        return (
          <Events 
            events={societyEvents} 
            notices={societyNotices}
            userRole={currentUser.role} 
            societyName={activeSociety?.name}
            onAddEvent={handleAddEvent} 
            onUpdateEvent={handleUpdateEvent} 
            onDeleteEvent={handleDeleteEvent}
            onAddNotice={handleAddNotice}
            onUpdateNotice={handleUpdateNotice}
            onDeleteNotice={handleDeleteNotice}
          />
        );
      case 'FISHBOWL':
        return <FishBowl messages={societyFishbowl} currentUser={currentUser} onPostMessage={handlePostFishBowlMessage} onDeleteMessage={handleDeleteFishBowlMessage} />;
      case 'VENDORS':
        return isAdminOrSuper ? <VendorManagement vendors={societyVendors} onAddVendor={handleAddVendor} onUpdateVendor={handleUpdateVendor} onDeleteVendor={handleDeleteVendor} /> : <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} onNavigate={setCurrentView} />;
      case 'TENDORS':
        return isAdminOrSuper ? <TendorManagement vendors={societyVendors} tendors={societyTendors} storageBucket={activeSociety?.storageBucket} onAddTendor={handleAddTendor} onUpdateTendor={handleUpdateTendor} onDeleteTendor={handleDeleteTendor} /> : <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} onNavigate={setCurrentView} />;
      case 'USER_MANAGEMENT':
        return isSuperAdmin ? (
          <UserManagement 
            users={societyResidents} 
            wings={activeSociety?.wings}
            societyName={activeSociety?.name}
            onUpdateRole={handleUpdateRole} 
            onDeleteUser={handleDeleteUser} 
            onAddUser={handleAddUser} 
            onApproveUser={handleApproveUser}
          />
        ) : (
          <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} onNavigate={setCurrentView} />
        );
      default:
        return <ResidentDashboard user={currentUser} events={societyEvents} notices={societyNotices} tickets={societyTickets} bookings={societyBookings} onNavigate={setCurrentView} />;
    }
  };

  // Avoid flashing the login screen while we're still checking for an
  // existing Supabase session on page load/refresh.
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LandingPage 
        societies={societies} 
        users={users} 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        onSocietyCreated={handleSocietyCreated} 
      />
    );
  }

  return (
    <>
      <Layout 
        currentView={currentView} 
        onChangeView={setCurrentView}
        userRole={currentUser.role}
        userName={currentUser.name}
        societyName={activeSociety?.name}
        societyPincode={activeSociety?.pincode}
        onLogout={handleLogout}
      >
        {renderView()}
      </Layout>
      <GeminiAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </>
  );
};

export default App;