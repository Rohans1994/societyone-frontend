import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Invoice, Transaction, Role, User, MaintenanceFrequency, Receipt } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { 
  Download, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  X, 
  IndianRupee, 
  FileText, 
  Eye, 
  Calendar,
  Layers,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  ReceiptText,
  CreditCard,
  Building2,
  RefreshCw,
  BellRing,
  Sparkles,
  Users,
  Clock
} from 'lucide-react';
import { formatCurrency } from '../constants';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { ReceiptModal } from './ReceiptModal';
import { jsPDF } from "jspdf";

interface FinanceOverviewProps {
  invoices: Invoice[];
  transactions: Transaction[];
  userRole: Role;
  users: User[];
  onCreateInvoice: (invoice: Invoice) => void;
  onAddTransaction: (transaction: Transaction) => void;
  onViewAllInvoices: () => void;
  societyName?: string;
  societyId?: string;
  onRefreshData?: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const FinanceOverview: React.FC<FinanceOverviewProps> = ({ 
  invoices, 
  transactions, 
  userRole, 
  users, 
  onCreateInvoice, 
  onAddTransaction, 
  onViewAllInvoices,
  societyName = 'Arkade Earth',
  societyId,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MAINTENANCE' | 'OPERATIONS'>('OVERVIEW');
  
  // Date State
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const currentDay = today.toISOString().split('T')[0];

  const [overviewDate, setOverviewDate] = useState({ start: firstDayOfMonth, end: currentDay });
  const [ledgerDate, setLedgerDate] = useState({ start: firstDayOfMonth, end: currentDay });
  
  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isSetMaintenanceModalOpen, setIsSetMaintenanceModalOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);
  const [manualPayInvoice, setManualPayInvoice] = useState<Invoice | null>(null);
  const [manualPayMethod, setManualPayMethod] = useState('Cheque');
  const [manualPayRef, setManualPayRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNoticeMsg, setActionNoticeMsg] = useState<string | null>(null);

  // Forms
  const [newInvoice, setNewInvoice] = useState({ 
    residentName: '', 
    amount: '', 
    type: 'Maintenance' as Invoice['type'], 
    dueDate: '',
    status: 'Unpaid' as Invoice['status'],
    description: ''
  });
  const [newTransaction, setNewTransaction] = useState({ title: '', amount: '', type: 'Expense' as const, category: '', date: '' });

  // Maintenance Plan Creation Form
  const [mPlanTitle, setMPlanTitle] = useState('Quarterly Society Maintenance & Sinking Fund');
  const [mPlanFrequency, setMPlanFrequency] = useState<MaintenanceFrequency>('Quarterly');
  const [mPlanPeriodLabel, setMPlanPeriodLabel] = useState('Q3 2026 (Jul - Sep)');
  const [mPlanStartDate, setMPlanStartDate] = useState('2026-07-01');
  const [mPlanEndDate, setMPlanEndDate] = useState('2026-09-30');
  const [mPlanDueDate, setMPlanDueDate] = useState('2026-07-15');
  const [mPlanBaseRate, setMPlanBaseRate] = useState('4500');
  const [mPlanWing, setMPlanWing] = useState('ALL');
  const [mPlanBreakdown, setMPlanBreakdown] = useState({
    maintenance: 3000,
    sinkingFund: 500,
    waterSecurity: 600,
    parking: 400
  });

  // Maintenance Tab Filters
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<'ALL_RESIDENTS' | 'DEFAULTERS' | 'PENDING' | 'PAID'>('ALL_RESIDENTS');
  const [maintenanceFrequencyFilter, setMaintenanceFrequencyFilter] = useState('ALL');
  const [maintenanceSearch, setMaintenanceSearch] = useState('');

  // Live Supabase fetched states for maintenance section
  const [supabaseUsers, setSupabaseUsers] = useState<User[]>(users);
  const [supabaseInvoices, setSupabaseInvoices] = useState<Invoice[]>(invoices);
  const [supabaseReceipts, setSupabaseReceipts] = useState<Receipt[]>([]);
  const [isLoadingMaintenanceData, setIsLoadingMaintenanceData] = useState(false);
  const [selectedResidentForHistory, setSelectedResidentForHistory] = useState<User | null>(null);

  // Fetch fresh data from Supabase tables (society_users, society_invoices, society_receipts)
  const fetchSupabaseMaintenanceData = React.useCallback(async () => {
    setIsLoadingMaintenanceData(true);
    try {
      const userParams = societyId ? `?societyId=${encodeURIComponent(societyId)}` : '';
      const invoiceParams = societyId ? `?societyId=${encodeURIComponent(societyId)}` : '';
      const receiptParams = societyId ? `?societyId=${encodeURIComponent(societyId)}` : '';
      const [usersRes, invoicesRes, receiptsRes] = await Promise.all([
        fetch(`/api/users${userParams}`).then(r => r.json()).catch(() => null),
        fetch(`/api/invoices${invoiceParams}`).then(r => r.json()).catch(() => null),
        fetch(`/api/receipts${receiptParams}`).then(r => r.json()).catch(() => null),
      ]);
      if (Array.isArray(usersRes)) setSupabaseUsers(usersRes);
      if (Array.isArray(invoicesRes)) setSupabaseInvoices(invoicesRes);
      if (Array.isArray(receiptsRes)) setSupabaseReceipts(receiptsRes);
    } catch (err) {
      console.error('Error fetching Supabase maintenance data:', err);
    } finally {
      setIsLoadingMaintenanceData(false);
    }
  }, [societyId]);

  useEffect(() => {
    fetchSupabaseMaintenanceData();
  }, [fetchSupabaseMaintenanceData]);

  // Combined Unique Records - strictly filtered for this specific society
  const activeUsers = useMemo(() => {
    const map = new Map<string, User>();
    [...users, ...supabaseUsers].forEach(u => {
      if (u.uid) {
        // Enforce strict society isolation
        if (societyId && u.societyId && u.societyId !== societyId) return;
        map.set(u.uid, u);
      }
    });
    return Array.from(map.values());
  }, [users, supabaseUsers, societyId]);

  const activeInvoices = useMemo(() => {
    const map = new Map<string, Invoice>();
    [...invoices, ...supabaseInvoices].forEach(i => {
      if (i.id) {
        if (societyId && i.societyId && i.societyId !== societyId) return;
        map.set(i.id, i);
      }
    });
    return Array.from(map.values());
  }, [invoices, supabaseInvoices, societyId]);

  const activeReceipts = useMemo(() => {
    const map = new Map<string, Receipt>();
    supabaseReceipts.forEach(r => {
      if (r.id) {
        if (societyId && r.societyId && r.societyId !== societyId) return;
        map.set(r.id, r);
      }
    });
    return Array.from(map.values());
  }, [supabaseReceipts, societyId]);

  // Calculations based on OVERVIEW Date Range
  const filteredTransactionsOverview = transactions.filter(t => t.date >= overviewDate.start && t.date <= overviewDate.end);
  const filteredInvoicesOverview = activeInvoices.filter(i => i.dueDate >= overviewDate.start && i.dueDate <= overviewDate.end);

  const totalIncome = filteredTransactionsOverview.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = filteredTransactionsOverview.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
  const totalRevenue = totalIncome - totalExpense;

  // Ledger Filtering
  const filteredTransactionsLedger = transactions.filter(t => t.date >= ledgerDate.start && t.date <= ledgerDate.end);

  // Prepare Chart Data
  const expenseData = filteredTransactionsOverview
    .filter(t => t.type === 'Expense')
    .reduce((acc: any[], curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) {
        existing.value += curr.amount;
      } else {
        acc.push({ name: curr.category, value: curr.amount });
      }
      return acc;
    }, []);

  const dataIncome = [
    { name: 'Income', value: totalIncome },
    { name: 'Expense', value: totalExpense },
  ];

  // Helper to check if invoice is a defaulter (overdue)
  const isDefaulterInvoice = (inv: Invoice) => {
    if (inv.status === 'Paid') return false;
    if (inv.status === 'Overdue') return true;
    if (!inv.dueDate) return false;
    const due = new Date(inv.dueDate);
    const now = new Date();
    return due < now;
  };

  // Maintenance Invoices list
  const maintenanceInvoices = useMemo(() => {
    return activeInvoices.filter(inv => inv.type === 'Maintenance' || inv.frequency || inv.period);
  }, [activeInvoices]);

  // Defaulter Count and Stats
  const defaulterInvoices = useMemo(() => {
    return maintenanceInvoices.filter(isDefaulterInvoice);
  }, [maintenanceInvoices]);

  const paidMaintenanceInvoices = useMemo(() => {
    return maintenanceInvoices.filter(i => i.status === 'Paid');
  }, [maintenanceInvoices]);

  const pendingMaintenanceInvoices = useMemo(() => {
    return maintenanceInvoices.filter(i => i.status !== 'Paid');
  }, [maintenanceInvoices]);

  const totalMaintenanceBilled = useMemo(() => {
    return maintenanceInvoices.reduce((sum, i) => sum + i.amount, 0);
  }, [maintenanceInvoices]);

  const totalMaintenanceCollected = useMemo(() => {
    return paidMaintenanceInvoices.reduce((sum, i) => sum + i.amount, 0);
  }, [paidMaintenanceInvoices]);

  const totalDefaulterAmount = useMemo(() => {
    return defaulterInvoices.reduce((sum, i) => sum + i.amount, 0);
  }, [defaulterInvoices]);

  const collectionRate = totalMaintenanceBilled > 0 
    ? Math.round((totalMaintenanceCollected / totalMaintenanceBilled) * 100) 
    : 100;

  // Helper to get invoices for a resident
  const getResidentInvoices = (resident: User) => {
    return maintenanceInvoices.filter(inv => {
      if (inv.residentId && resident.uid && inv.residentId === resident.uid) return true;
      if (inv.residentName && resident.name && inv.residentName.trim().toLowerCase() === resident.name.trim().toLowerCase()) return true;
      if (inv.apartmentNo && resident.apartmentNo && inv.apartmentNo.trim() === resident.apartmentNo.trim()) {
        if (inv.wing && resident.wing) return inv.wing.trim().toLowerCase() === resident.wing.trim().toLowerCase();
        return true;
      }
      return false;
    });
  };

  // Helper to get receipts for a resident
  const getResidentReceipts = (resident: User) => {
    return activeReceipts.filter(rec => {
      if (rec.residentId && resident.uid && rec.residentId === resident.uid) return true;
      if (rec.residentName && resident.name && rec.residentName.trim().toLowerCase() === resident.name.trim().toLowerCase()) return true;
      if (rec.apartmentNo && resident.apartmentNo && rec.apartmentNo.trim() === resident.apartmentNo.trim()) {
        if (rec.wing && resident.wing) return rec.wing.trim().toLowerCase() === resident.wing.trim().toLowerCase();
        return true;
      }
      return false;
    });
  };

  // All Residents List from Supabase for this specific society
  const allSupabaseResidents = useMemo(() => {
    // Filter for resident members belonging ONLY to this specific society
    const residents = activeUsers.filter(u => {
      const isResidentRole = u.role === Role.Resident || u.role === 'Resident' || (!u.role && u.apartmentNo);
      const matchesSociety = !societyId || !u.societyId || u.societyId === societyId;
      return isResidentRole && matchesSociety;
    });
    return residents.filter(r => {
      if (!maintenanceSearch) return true;
      const q = maintenanceSearch.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchFlat = r.apartmentNo?.toLowerCase().includes(q);
      const matchWing = r.wing?.toLowerCase().includes(q);
      const matchEmail = r.email?.toLowerCase().includes(q);
      const matchPhone = r.phone?.toLowerCase().includes(q);
      return matchName || matchFlat || matchWing || matchEmail || matchPhone;
    });
  }, [activeUsers, maintenanceSearch, societyId]);

  // Defaulters List from Supabase
  const filteredDefaultersList = useMemo(() => {
    return defaulterInvoices.filter(inv => {
      if (maintenanceFrequencyFilter !== 'ALL' && inv.frequency !== maintenanceFrequencyFilter) return false;
      if (maintenanceSearch) {
        const q = maintenanceSearch.toLowerCase();
        const matchesName = inv.residentName.toLowerCase().includes(q);
        const matchesFlat = inv.apartmentNo?.toLowerCase().includes(q) || false;
        const matchesWing = inv.wing?.toLowerCase().includes(q) || false;
        const matchesPeriod = inv.period?.toLowerCase().includes(q) || false;
        const matchesId = inv.id.toLowerCase().includes(q);
        if (!matchesName && !matchesFlat && !matchesWing && !matchesPeriod && !matchesId) return false;
      }
      return true;
    });
  }, [defaulterInvoices, maintenanceFrequencyFilter, maintenanceSearch]);

  // Pending Dues List from Supabase
  const filteredPendingList = useMemo(() => {
    return pendingMaintenanceInvoices.filter(inv => {
      if (maintenanceFrequencyFilter !== 'ALL' && inv.frequency !== maintenanceFrequencyFilter) return false;
      if (maintenanceSearch) {
        const q = maintenanceSearch.toLowerCase();
        const matchesName = inv.residentName.toLowerCase().includes(q);
        const matchesFlat = inv.apartmentNo?.toLowerCase().includes(q) || false;
        const matchesWing = inv.wing?.toLowerCase().includes(q) || false;
        const matchesPeriod = inv.period?.toLowerCase().includes(q) || false;
        const matchesId = inv.id.toLowerCase().includes(q);
        if (!matchesName && !matchesFlat && !matchesWing && !matchesPeriod && !matchesId) return false;
      }
      return true;
    });
  }, [pendingMaintenanceInvoices, maintenanceFrequencyFilter, maintenanceSearch]);

  // Paid Records List from Supabase (Receipts & Paid Invoices)
  const filteredPaidList = useMemo(() => {
    // Map receipts
    const receiptsFormatted = activeReceipts.map(rec => ({
      id: rec.id,
      invoiceId: rec.invoiceId,
      residentId: rec.residentId,
      residentName: rec.residentName,
      wing: rec.wing,
      apartmentNo: rec.apartmentNo,
      amount: rec.amount,
      paymentDate: rec.paymentDate,
      paymentTime: rec.paymentTime,
      paymentMethod: rec.paymentMethod,
      transactionRef: rec.transactionRef,
      period: rec.period,
      frequency: rec.frequency,
      breakdown: rec.breakdown,
      isReceipt: true,
      rawReceipt: rec
    }));

    // Add paid invoices that may not have explicit receipt objects
    paidMaintenanceInvoices.forEach(inv => {
      const alreadyHasReceipt = receiptsFormatted.some(r => r.invoiceId === inv.id || r.id === inv.receiptId);
      if (!alreadyHasReceipt) {
        receiptsFormatted.push({
          id: inv.receiptId || `REC-PAID-${inv.id}`,
          invoiceId: inv.id,
          residentId: inv.residentId,
          residentName: inv.residentName,
          wing: inv.wing,
          apartmentNo: inv.apartmentNo,
          amount: inv.amount,
          paymentDate: inv.paidAt || inv.dueDate || '2026-08-20',
          paymentTime: 'Recorded',
          paymentMethod: inv.paymentMethod || 'Online Transfer',
          transactionRef: `TXREF-${inv.id}`,
          period: inv.period,
          frequency: inv.frequency,
          breakdown: inv.breakdown,
          isReceipt: false,
          rawReceipt: {
            id: inv.receiptId || `REC-PAID-${inv.id}`,
            invoiceId: inv.id,
            residentId: inv.residentId,
            residentName: inv.residentName,
            wing: inv.wing,
            apartmentNo: inv.apartmentNo,
            amount: inv.amount,
            paymentDate: inv.paidAt || inv.dueDate || '2026-08-20',
            paymentMethod: inv.paymentMethod || 'Online Transfer',
            transactionRef: `TXREF-${inv.id}`,
            period: inv.period,
            frequency: inv.frequency,
            societyName: societyName,
            status: 'Success',
            breakdown: inv.breakdown
          }
        });
      }
    });

    return receiptsFormatted.filter(item => {
      if (maintenanceFrequencyFilter !== 'ALL' && item.frequency !== maintenanceFrequencyFilter) return false;
      if (maintenanceSearch) {
        const q = maintenanceSearch.toLowerCase();
        const matchesName = item.residentName?.toLowerCase().includes(q);
        const matchesFlat = item.apartmentNo?.toLowerCase().includes(q) || false;
        const matchesWing = item.wing?.toLowerCase().includes(q) || false;
        const matchesPeriod = item.period?.toLowerCase().includes(q) || false;
        const matchesId = item.id.toLowerCase().includes(q) || item.invoiceId?.toLowerCase().includes(q);
        const matchesRef = item.transactionRef?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesFlat && !matchesWing && !matchesPeriod && !matchesId && !matchesRef) return false;
      }
      return true;
    });
  }, [activeReceipts, paidMaintenanceInvoices, maintenanceFrequencyFilter, maintenanceSearch, societyName]);

  const generateInvoicePDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text(societyName, 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Society Maintenance Demand Notice", 20, 28);
    doc.text("GSTIN: 27ABCDE1234F1Z5 | Reg: BOM/HSG/14298/2018", 20, 33);
    doc.text("Email: admin@societyone.com", 20, 38);

    doc.setTextColor(40);
    doc.setFontSize(16);
    doc.text("INVOICE", 150, 20);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.id}`, 150, 28);
    doc.text(`Date: ${new Date().toISOString().split('T')[0]}`, 150, 33);
    doc.text(`Due Date: ${invoice.dueDate}`, 150, 38);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.line(20, 45, 190, 45);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 20, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(invoice.residentName, 20, 62);
    doc.setTextColor(100);
    doc.text(`Unit: ${invoice.wing ? invoice.wing + ' - ' : ''}Flat ${invoice.apartmentNo || '101'}`, 20, 68); 
    doc.setTextColor(40);

    const yStart = 80;
    doc.setFillColor(245, 247, 250);
    doc.rect(20, yStart, 170, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DESCRIPTION", 25, yStart + 7);
    doc.text("PERIOD", 100, yStart + 7);
    doc.text("AMOUNT", 160, yStart + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const desc = invoice.description || "Society Maintenance Charges";
    doc.text(desc, 25, yStart + 20);
    doc.text(invoice.period || "General", 100, yStart + 20);
    doc.text(`Rs. ${invoice.amount.toLocaleString('en-IN')}`, 160, yStart + 20);

    doc.line(20, yStart + 30, 190, yStart + 30);

    const yTotal = yStart + 45;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Total Payable:", 110, yTotal);
    doc.text(`Rs. ${invoice.amount.toLocaleString('en-IN')}`, 160, yTotal);

    doc.save(`Invoice_${invoice.id}.pdf`);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    
    const invoice: Invoice = {
      id: `INV-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      residentName: newInvoice.residentName,
      amount: Number(newInvoice.amount),
      dueDate: newInvoice.dueDate,
      status: newInvoice.status,
      type: newInvoice.type,
      description: newInvoice.type === 'Others' ? newInvoice.description : undefined
    };
    
    onCreateInvoice(invoice);
    generateInvoicePDF(invoice);

    const autoTransaction: Transaction = {
      id: `TX-INV-${invoice.id}`,
      title: `Invoice Generated: ${invoice.residentName}${invoice.description ? ` - ${invoice.description}` : ''}`,
      amount: invoice.amount,
      type: 'Income',
      category: 'Invoice',
      date: new Date().toISOString().split('T')[0]
    };
    
    onAddTransaction(autoTransaction);
    setIsInvoiceModalOpen(false);
    setNewInvoice({ residentName: '', amount: '', type: 'Maintenance', dueDate: '', status: 'Unpaid', description: '' });
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const tx: Transaction = {
      id: `TX-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      title: newTransaction.title,
      amount: Number(newTransaction.amount),
      type: newTransaction.type,
      category: newTransaction.category,
      date: newTransaction.date
    };
    onAddTransaction(tx);
    setIsTransactionModalOpen(false);
    setNewTransaction({ title: '', amount: '', type: 'Expense', category: '', date: '' });
  };

  // Handler for Submitting the Maintenance Plan by Admin
  const handleSetMaintenancePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const totalAmount = Number(mPlanBaseRate);
      const calculatedBreakdown = {
        maintenance: Math.round(totalAmount * 0.65),
        sinkingFund: Math.round(totalAmount * 0.15),
        waterSecurity: Math.round(totalAmount * 0.12),
        parking: Math.round(totalAmount * 0.08),
      };

      const res = await fetch('/api/maintenance-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mPlanTitle,
          frequency: mPlanFrequency,
          periodLabel: mPlanPeriodLabel,
          startDate: mPlanStartDate,
          endDate: mPlanEndDate,
          dueDate: mPlanDueDate,
          rateAmount: totalAmount,
          breakdown: calculatedBreakdown,
          wing: mPlanWing,
          notes: `Set by Super Admin on ${new Date().toLocaleDateString()}`,
          societyId: societyId || 'soc-mtb32pfk'
        })
      });

      if (!res.ok) {
        throw new Error('Failed to set maintenance plan');
      }

      const data = await res.json();
      setIsSetMaintenanceModalOpen(false);
      setActionNoticeMsg(`Successfully configured ${mPlanFrequency} maintenance for ${mPlanPeriodLabel}. Generated ${data.generatedCount || 'all'} resident invoices and broadcasted notification to every resident!`);
      
      // Immediately refresh local supabase data in FinanceOverview
      await fetchSupabaseMaintenanceData();

      // Trigger global refresh in App.tsx for resident dashboards, notices, and invoices
      if (onRefreshData) {
        onRefreshData();
      }

      // Switch to Maintenance tab so Admin immediately sees the live generated records
      setActiveTab('MAINTENANCE');

      setTimeout(() => setActionNoticeMsg(null), 6000);
    } catch (err: any) {
      alert('Error creating maintenance plan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for recording manual payment by admin
  const handleRecordManualPayment = async () => {
    if (!manualPayInvoice) return;
    setIsSubmitting(true);
    try {
      const txRef = manualPayRef || `MANUAL-${manualPayMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const res = await fetch(`/api/invoices/${manualPayInvoice.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: manualPayMethod,
          transactionRef: txRef,
          amountPaid: manualPayInvoice.amount,
          paidByResidentId: manualPayInvoice.residentId,
          paidByResidentName: manualPayInvoice.residentName
        })
      });

      if (!res.ok) throw new Error('Failed to record payment');

      const data = await res.json();
      setManualPayInvoice(null);
      setManualPayRef('');
      setActionNoticeMsg(`Payment of ${formatCurrency(manualPayInvoice.amount)} recorded for ${manualPayInvoice.residentName}. Receipt #${data.receiptId} saved in Supabase!`);
      
      await fetchSupabaseMaintenanceData();
      if (onRefreshData) {
        onRefreshData();
      }
      setTimeout(() => setActionNoticeMsg(null), 6000);
    } catch (err: any) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for sending defaulter reminder
  const handleSendDefaulterReminder = (inv: Invoice) => {
    setActionNoticeMsg(`📢 Reminder Notice sent to ${inv.residentName} (Unit ${inv.wing ? inv.wing + '-' : ''}${inv.apartmentNo || 'Flat'}). Maintenance due date: ${inv.dueDate}.`);
    setTimeout(() => setActionNoticeMsg(null), 5000);
  };

  const isSuperAdmin = userRole === Role.SuperAdmin;

  return (
    <div className="space-y-6">
      
      {/* Toast Notification Banner */}
      {actionNoticeMsg && (
        <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionNoticeMsg}</span>
          </div>
          <button onClick={() => setActionNoticeMsg(null)} className="text-white/80 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Finance & Accounting</h2>
          <p className="text-sm text-gray-500">Balance sheets, periodic maintenance billing, defaulter tracking, and ledger.</p>
        </div>
        
        {isSuperAdmin && (
          <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
             <button 
               onClick={() => setActiveTab('OVERVIEW')} 
               className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                 activeTab === 'OVERVIEW' ? 'bg-brand-50 text-brand-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               Overview
             </button>
             <button 
               onClick={() => setActiveTab('MAINTENANCE')} 
               className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                 activeTab === 'MAINTENANCE' ? 'bg-brand-50 text-brand-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               <Layers className="w-3.5 h-3.5" />
               Maintenance
               {defaulterInvoices.length > 0 && (
                 <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                   {defaulterInvoices.length}
                 </span>
               )}
             </button>
             <button 
               onClick={() => setActiveTab('OPERATIONS')} 
               className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                 activeTab === 'OPERATIONS' ? 'bg-brand-50 text-brand-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
               }`}
             >
               Operations
             </button>
          </div>
        )}
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           {/* Date Filter for Overview */}
           <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-4 justify-end">
              <span className="text-sm font-medium text-gray-500">Reporting Period:</span>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <input 
                      type="date" 
                      className="bg-transparent text-sm outline-none"
                      value={overviewDate.start}
                      onChange={(e) => setOverviewDate({...overviewDate, start: e.target.value})}
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                      type="date" 
                      className="bg-transparent text-sm outline-none"
                      value={overviewDate.end}
                      onChange={(e) => setOverviewDate({...overviewDate, end: e.target.value})}
                  />
              </div>
           </div>

           {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Total Revenue (Net)</p>
                        <h3 className={`text-2xl font-bold ${totalRevenue >= 0 ? 'text-brand-600' : 'text-red-600'}`}>{formatCurrency(totalRevenue)}</h3>
                    </div>
                    <div className="bg-brand-50 p-3 rounded-full">
                        <DollarSign className="w-6 h-6 text-brand-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Total Income</p>
                        <h3 className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</h3>
                    </div>
                    <div className="bg-green-50 p-3 rounded-full">
                        <TrendingUp className="w-6 h-6 text-green-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
                        <h3 className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpense)}</h3>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-full">
                        <TrendingUp className="w-6 h-6 text-orange-500 transform rotate-180" />
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Health</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataIncome}>
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h4>
                    {expenseData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expenseData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {expenseData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">No expense data for selected period</div>
                    )}
                </div>
            </div>
             
             {/* Recent Invoices Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900">Recent Invoices (Selected Period)</h4>
                    <button onClick={onViewAllInvoices} className="text-sm text-brand-600 hover:text-brand-800 font-medium">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Resident</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Due Date</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInvoicesOverview.slice(0, 5).map(inv => (
                                <tr key={inv.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{inv.residentName}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {inv.type}
                                        {inv.type === 'Others' && inv.description && <span className="text-xs text-gray-400 block">{inv.description}</span>}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{inv.dueDate}</td>
                                    <td className="px-6 py-4 font-medium">{formatCurrency(inv.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            inv.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                            inv.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => setViewInvoice(inv)}
                                            className="text-gray-500 hover:text-brand-600"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {filteredInvoicesOverview.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No invoices in selected period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* ================= TAB 2: SUPER ADMIN MAINTENANCE & DEFAULTER TRACKER ================= */}
      {activeTab === 'MAINTENANCE' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
          
          {/* Top Actions & Banner */}
          <div className="bg-gradient-to-r from-brand-900 via-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-brand-500/20 text-brand-300 border border-brand-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Super Admin Control
                </span>
                <span className="text-xs text-slate-400">Society Maintenance Ledger</span>
              </div>
              <h3 className="text-xl font-bold mt-1 tracking-tight">Maintenance Billing & Defaulters Tracker</h3>
              <p className="text-xs text-slate-300 max-w-xl mt-1">
                Configure flexible billing cycles (Monthly, Quarterly, Six-Monthly, Yearly), broadcast demand notices, monitor collection per flat, and track overdue defaulters.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsSetMaintenanceModalOpen(true)}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Set Maintenance Billing Plan
              </button>
            </div>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Billed */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Billed</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 mt-2">{formatCurrency(totalMaintenanceBilled)}</p>
              <p className="text-xs text-gray-500 mt-1">{maintenanceInvoices.length} total generated invoices</p>
            </div>

            {/* Total Collected */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Collected Amount</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-2">{formatCurrency(totalMaintenanceCollected)}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${collectionRate}%` }} />
                </div>
                <span className="text-xs font-bold text-emerald-600 shrink-0">{collectionRate}%</span>
              </div>
            </div>

            {/* Total Defaulters (Overdue) */}
            <div className={`p-5 rounded-2xl border transition ${
              defaulterInvoices.length > 0 ? 'bg-red-50/60 border-red-200/80' : 'bg-white border-gray-200/80'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Defaulters / Overdue</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  defaulterInvoices.length > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-red-600 mt-2">{defaulterInvoices.length} Residents</p>
              <p className="text-xs font-semibold text-red-500 mt-1">
                {formatCurrency(totalDefaulterAmount)} pending past due date
              </p>
            </div>

            {/* Pending Collection */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Dues</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2">
                {formatCurrency(totalMaintenanceBilled - totalMaintenanceCollected)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {maintenanceInvoices.length - paidMaintenanceInvoices.length} uncollected invoices
              </p>
            </div>

          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-full md:w-auto overflow-x-auto">
              <button
                onClick={() => setMaintenanceStatusFilter('ALL_RESIDENTS')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                  maintenanceStatusFilter === 'ALL_RESIDENTS' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                All Residents ({allSupabaseResidents.length})
              </button>
              <button
                onClick={() => setMaintenanceStatusFilter('DEFAULTERS')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                  maintenanceStatusFilter === 'DEFAULTERS' 
                    ? 'bg-red-600 text-white shadow-xs' 
                    : 'text-red-700 hover:bg-red-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Defaulters Only ({defaulterInvoices.length})
              </button>
              <button
                onClick={() => setMaintenanceStatusFilter('PENDING')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                  maintenanceStatusFilter === 'PENDING' ? 'bg-white text-amber-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Pending Dues ({pendingMaintenanceInvoices.length})
              </button>
              <button
                onClick={() => setMaintenanceStatusFilter('PAID')}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                  maintenanceStatusFilter === 'PAID' ? 'bg-white text-emerald-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Paid ({filteredPaidList.length})
              </button>
            </div>

            {/* Right Controls: Refresh, Frequency Filter & Search */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              
              <button
                onClick={fetchSupabaseMaintenanceData}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
                title="Refresh Supabase Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingMaintenanceData ? 'animate-spin text-brand-600' : ''}`} />
              </button>

              <div className="relative flex-1 md:w-56">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search resident, flat, wing..."
                  value={maintenanceSearch}
                  onChange={e => setMaintenanceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {maintenanceStatusFilter !== 'ALL_RESIDENTS' && (
                <select
                  value={maintenanceFrequencyFilter}
                  onChange={e => setMaintenanceFrequencyFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none"
                >
                  <option value="ALL">All Frequencies</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Six-Monthly">Six-Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              )}

              {(maintenanceFrequencyFilter !== 'ALL' || maintenanceSearch) && (
                <button
                  onClick={() => {
                    setMaintenanceFrequencyFilter('ALL');
                    setMaintenanceSearch('');
                  }}
                  className="text-brand-600 hover:text-brand-800 font-bold px-2 py-1"
                >
                  Reset
                </button>
              )}

            </div>

          </div>

          {/* TAB VIEW 1: ALL RESIDENTS (FETCHED FROM SUPABASE society_users) */}
          {maintenanceStatusFilter === 'ALL_RESIDENTS' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    All Registered Society Residents (Supabase)
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Showing all registered members, their flat units, billed amounts, and real-time maintenance payment standing.
                  </p>
                </div>
                <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-lg border border-brand-100">
                  {allSupabaseResidents.length} Members
                </span>
              </div>

              {allSupabaseResidents.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">No resident members found in Supabase</p>
                  <p className="text-xs text-gray-400 mt-1">Try resetting search query or add residents in User Management.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3.5">Resident Member</th>
                        <th className="px-5 py-3.5">Flat / Unit</th>
                        <th className="px-5 py-3.5">Contact Details</th>
                        <th className="px-5 py-3.5 text-right">Total Billed</th>
                        <th className="px-5 py-3.5 text-right">Total Paid</th>
                        <th className="px-5 py-3.5 text-right">Pending Dues</th>
                        <th className="px-5 py-3.5">Standing Status</th>
                        <th className="px-5 py-3.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {allSupabaseResidents.map(resident => {
                        const resInvoices = getResidentInvoices(resident);
                        const totalBilled = resInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                        const paidInvs = resInvoices.filter(i => i.status === 'Paid');
                        const totalPaid = paidInvs.reduce((sum, inv) => sum + inv.amount, 0);
                        const pendingInvs = resInvoices.filter(i => i.status !== 'Paid');
                        const totalPending = pendingInvs.reduce((sum, inv) => sum + inv.amount, 0);
                        const hasDefaulter = pendingInvs.some(isDefaulterInvoice);

                        return (
                          <tr key={resident.uid || resident.id} className="hover:bg-gray-50/70 transition">
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {resident.name ? resident.name.charAt(0) : 'R'}
                                </span>
                                <div>
                                  {resident.name || 'Unnamed Resident'}
                                  <span className="block text-[10px] text-gray-400 font-mono font-normal">
                                    UID: {resident.uid ? resident.uid.substring(0, 8) : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-gray-800">
                                {resident.wing ? `${resident.wing} • ` : ''}Flat {resident.apartmentNo || '101'}
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              <div className="text-gray-700">{resident.phone || 'Phone: N/A'}</div>
                              <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">{resident.email}</span>
                            </td>

                            <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                              {formatCurrency(totalBilled)}
                            </td>

                            <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                              {formatCurrency(totalPaid)}
                            </td>

                            <td className="px-5 py-3.5 text-right font-black text-sm">
                              <span className={totalPending > 0 ? 'text-red-600' : 'text-gray-400 font-normal'}>
                                {totalPending > 0 ? formatCurrency(totalPending) : '₹0'}
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              {hasDefaulter ? (
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                  Defaulter ({formatCurrency(totalPending)})
                                </span>
                              ) : totalPending > 0 ? (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Pending Dues
                                </span>
                              ) : totalBilled > 0 ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Up to Date
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[11px] italic">No Invoices</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setNewInvoice({
                                      residentName: resident.name,
                                      amount: '4500',
                                      type: 'Maintenance',
                                      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
                                      status: 'Unpaid',
                                      description: `Maintenance for ${resident.wing || ''} Flat ${resident.apartmentNo || ''}`
                                    });
                                    setIsInvoiceModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[11px] font-bold transition"
                                  title="Generate Direct Maintenance Bill"
                                >
                                  <Plus className="w-3 h-3" />
                                  Bill Resident
                                </button>

                                <button
                                  onClick={() => setSelectedResidentForHistory(resident)}
                                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                                  title="View Invoices & Receipts History"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB VIEW 2: DEFAULTERS ONLY (FETCHED FROM SUPABASE society_invoices) */}
          {maintenanceStatusFilter === 'DEFAULTERS' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-red-50/60 border-b border-red-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Defaulter Residents (Overdue Maintenance in Supabase)
                  </span>
                  <p className="text-[11px] text-red-700">
                    Residents who have not cleared their society maintenance bills past the due date.
                  </p>
                </div>
                <span className="text-xs font-black bg-red-600 text-white px-2.5 py-1 rounded-lg">
                  {filteredDefaultersList.length} Overdue
                </span>
              </div>

              {filteredDefaultersList.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">No overdue defaulters!</p>
                  <p className="text-xs text-gray-400 mt-1">All residents are current with their maintenance dues.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-red-50/40 text-gray-500 uppercase font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3.5">Defaulter Resident</th>
                        <th className="px-5 py-3.5">Flat / Unit</th>
                        <th className="px-5 py-3.5">Billing Period</th>
                        <th className="px-5 py-3.5">Due Date</th>
                        <th className="px-5 py-3.5 text-right">Overdue Amount</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredDefaultersList.map(inv => (
                        <tr key={inv.id} className="bg-red-50/15 hover:bg-red-50/30 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-900 text-sm">{inv.residentName}</div>
                            <span className="text-[10px] text-gray-400 font-mono">Invoice #{inv.id}</span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-gray-800">
                              {inv.wing ? `${inv.wing} • ` : ''}Flat {inv.apartmentNo || '101'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-gray-900 block">{inv.period || 'Maintenance'}</span>
                            <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                              {inv.frequency || 'Monthly'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-bold text-red-700 block">{inv.dueDate}</span>
                            <span className="text-[10px] text-red-500 font-semibold">Overdue</span>
                          </td>

                          <td className="px-5 py-3.5 text-right font-black text-red-600 text-sm">
                            {formatCurrency(inv.amount)}
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              Defaulter
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSendDefaulterReminder(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold transition"
                                title="Send Overdue Defaulter Reminder Notice"
                              >
                                <BellRing className="w-3 h-3" />
                                Send Notice
                              </button>

                              <button
                                onClick={() => setViewInvoice(inv)}
                                className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                                title="View Invoice"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setManualPayInvoice(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                                title="Record Payment"
                              >
                                <CreditCard className="w-3 h-3" />
                                Pay
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB VIEW 3: PENDING DUES (FETCHED FROM SUPABASE society_invoices) */}
          {maintenanceStatusFilter === 'PENDING' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Unpaid & Pending Maintenance Dues (Supabase)
                  </span>
                  <p className="text-[11px] text-amber-700">
                    All invoices currently awaiting resident payment.
                  </p>
                </div>
                <span className="text-xs font-black bg-amber-600 text-white px-2.5 py-1 rounded-lg">
                  {filteredPendingList.length} Pending
                </span>
              </div>

              {filteredPendingList.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">No pending dues!</p>
                  <p className="text-xs text-gray-400 mt-1">All invoices are settled.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-amber-50/30 text-gray-500 uppercase font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3.5">Resident Member</th>
                        <th className="px-5 py-3.5">Flat / Unit</th>
                        <th className="px-5 py-3.5">Billing Period</th>
                        <th className="px-5 py-3.5">Due Date</th>
                        <th className="px-5 py-3.5 text-right">Amount Due</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredPendingList.map(inv => {
                        const isDefaulter = isDefaulterInvoice(inv);
                        return (
                          <tr key={inv.id} className="hover:bg-gray-50/70 transition">
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-gray-900 text-sm">{inv.residentName}</div>
                              <span className="text-[10px] text-gray-400 font-mono">Invoice #{inv.id}</span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-gray-800">
                                {inv.wing ? `${inv.wing} • ` : ''}Flat {inv.apartmentNo || '101'}
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-gray-900 block">{inv.period || 'Maintenance'}</span>
                              <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                                {inv.frequency || 'Monthly'}
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span className={`font-semibold block ${isDefaulter ? 'text-red-600' : 'text-gray-700'}`}>
                                {inv.dueDate}
                              </span>
                              {isDefaulter && (
                                <span className="text-[10px] text-red-500 font-bold">Overdue</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right font-black text-amber-700 text-sm">
                              {formatCurrency(inv.amount)}
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {isDefaulter ? 'Overdue' : 'Pending'}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setManualPayInvoice(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                                  title="Record Cash/Cheque/Online Payment"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  Record Payment
                                </button>

                                <button
                                  onClick={() => setViewInvoice(inv)}
                                  className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                                  title="View Invoice"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleSendDefaulterReminder(inv)}
                                  className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                  title="Send Payment Reminder"
                                >
                                  <BellRing className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB VIEW 4: PAID (FETCHED FROM SUPABASE society_receipts & society_invoices) */}
          {maintenanceStatusFilter === 'PAID' && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Paid Maintenance History & Receipts (Supabase)
                  </span>
                  <p className="text-[11px] text-emerald-700">
                    Official digital receipts and confirmed maintenance payments fetched from Supabase.
                  </p>
                </div>
                <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-1 rounded-lg">
                  {filteredPaidList.length} Settled
                </span>
              </div>

              {filteredPaidList.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <ReceiptText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800">No paid records found</p>
                  <p className="text-xs text-gray-400 mt-1">Paid receipts will appear here once resident transactions are completed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-emerald-50/30 text-gray-500 uppercase font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3.5">Resident Member</th>
                        <th className="px-5 py-3.5">Flat / Unit</th>
                        <th className="px-5 py-3.5">Billing Period</th>
                        <th className="px-5 py-3.5">Payment Date</th>
                        <th className="px-5 py-3.5">Payment Mode</th>
                        <th className="px-5 py-3.5">Transaction Ref</th>
                        <th className="px-5 py-3.5 text-right">Amount Paid</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-center">Receipt PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredPaidList.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-900 text-sm">{item.residentName}</div>
                            <span className="text-[10px] text-gray-400 font-mono">Receipt #{item.id}</span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-gray-800">
                              {item.wing ? `${item.wing} • ` : ''}Flat {item.apartmentNo || '101'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-gray-900 block">{item.period || 'General Maintenance'}</span>
                            <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                              {item.frequency || 'Monthly'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-gray-700 block">{item.paymentDate}</span>
                            <span className="text-[10px] text-gray-400">{item.paymentTime || 'Recorded'}</span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-medium text-[11px]">
                              {item.paymentMethod || 'Online'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 font-mono text-gray-500 text-[11px] truncate max-w-[130px]" title={item.transactionRef}>
                            {item.transactionRef}
                          </td>

                          <td className="px-5 py-3.5 text-right font-black text-emerald-700 text-sm">
                            {formatCurrency(item.amount)}
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Paid
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => setViewReceipt(item.rawReceipt as Receipt)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition shadow-2xs"
                              title="View & Download Official Receipt"
                            >
                              <ReceiptText className="w-3.5 h-3.5" />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Resident Ledger & History Modal */}
          {selectedResidentForHistory && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 bg-brand-900 text-white flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Resident Maintenance Profile</h3>
                    <p className="text-xs text-brand-200">
                      {selectedResidentForHistory.name} — Unit {selectedResidentForHistory.wing ? `${selectedResidentForHistory.wing} • ` : ''}Flat {selectedResidentForHistory.apartmentNo || '101'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedResidentForHistory(null)}
                    className="p-1.5 text-white/70 hover:text-white rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Summary Cards */}
                  {(() => {
                    const resInvs = getResidentInvoices(selectedResidentForHistory);
                    const resRecs = getResidentReceipts(selectedResidentForHistory);
                    const totalBilled = resInvs.reduce((sum, i) => sum + i.amount, 0);
                    const totalPaid = resInvs.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
                    const totalPending = resInvs.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);

                    return (
                      <>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Total Billed</span>
                            <p className="text-base font-black text-gray-900 mt-0.5">{formatCurrency(totalBilled)}</p>
                          </div>
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                            <span className="text-[10px] text-emerald-700 font-bold uppercase">Total Paid</span>
                            <p className="text-base font-black text-emerald-700 mt-0.5">{formatCurrency(totalPaid)}</p>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                            <span className="text-[10px] text-amber-700 font-bold uppercase">Pending Dues</span>
                            <p className="text-base font-black text-amber-700 mt-0.5">{formatCurrency(totalPending)}</p>
                          </div>
                        </div>

                        {/* Invoices List */}
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                            Invoices ({resInvs.length})
                          </h4>
                          {resInvs.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No invoices recorded for this resident.</p>
                          ) : (
                            <div className="space-y-2">
                              {resInvs.map(inv => (
                                <div key={inv.id} className="p-3 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-bold text-gray-900">{inv.period || 'Maintenance'} ({inv.frequency || 'Monthly'})</span>
                                    <span className="block text-[10px] text-gray-500">Due: {inv.dueDate} • Invoice #{inv.id}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-black text-sm text-gray-900">{formatCurrency(inv.amount)}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {inv.status}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setSelectedResidentForHistory(null);
                                        setViewInvoice(inv);
                                      }}
                                      className="p-1 text-gray-400 hover:text-brand-600"
                                      title="View Invoice"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Receipts List */}
                        <div>
                          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                            Payment Receipts ({resRecs.length})
                          </h4>
                          {resRecs.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No payment receipts found in Supabase.</p>
                          ) : (
                            <div className="space-y-2">
                              {resRecs.map(rec => (
                                <div key={rec.id} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-bold text-emerald-950">Receipt #{rec.id}</span>
                                    <span className="block text-[10px] text-gray-500">Date: {rec.paymentDate} • Mode: {rec.paymentMethod}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-black text-emerald-700 text-sm">{formatCurrency(rec.amount)}</span>
                                    <button
                                      onClick={() => {
                                        setSelectedResidentForHistory(null);
                                        setViewReceipt(rec);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[10px]"
                                    >
                                      View PDF
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= TAB 3: OPERATIONS ================= */}
      {activeTab === 'OPERATIONS' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="p-6 bg-white border border-dashed border-gray-300 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition flex flex-col items-center justify-center gap-3 group"
                >
                    <div className="bg-brand-100 p-4 rounded-full group-hover:bg-brand-200 transition">
                        <FileText className="w-8 h-8 text-brand-600" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-gray-900">Create Single Ad-hoc Invoice</h3>
                        <p className="text-sm text-gray-500">Bill a resident for miscellaneous penalties or repairs.</p>
                    </div>
                </button>
                <button 
                   onClick={() => setIsTransactionModalOpen(true)}
                   className="p-6 bg-white border border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition flex flex-col items-center justify-center gap-3 group"
                >
                    <div className="bg-green-100 p-4 rounded-full group-hover:bg-green-200 transition">
                        <IndianRupee className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-semibold text-gray-900">Add Transaction</h3>
                        <p className="text-sm text-gray-500">Record external income or operational expenses.</p>
                    </div>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                 <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h4 className="font-semibold text-gray-900">Transaction Ledger</h4>
                     <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <span className="text-xs text-gray-500 font-medium mr-1">Filter:</span>
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input 
                            type="date" 
                            className="bg-transparent text-sm outline-none"
                            value={ledgerDate.start}
                            onChange={(e) => setLedgerDate({...ledgerDate, start: e.target.value})}
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-sm outline-none"
                            value={ledgerDate.end}
                            onChange={(e) => setLedgerDate({...ledgerDate, end: e.target.value})}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactionsLedger.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 text-gray-600">{tx.date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{tx.title}</td>
                                    <td className="px-6 py-4 text-gray-600">{tx.category}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            tx.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 font-bold ${tx.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.type === 'Income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactionsLedger.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No transactions found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* ================= MODAL: SET MAINTENANCE BILLING PLAN ================= */}
      {isSetMaintenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-tight">Set Maintenance Billing Plan</h3>
                  <p className="text-xs text-slate-400">Generate Invoices & Broadcast Notice to Residents</p>
                </div>
              </div>
              <button onClick={() => setIsSetMaintenanceModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetMaintenancePlan} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              
              {/* Billing Frequency Selector */}
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Billing Frequency / Cycle <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Monthly', label: 'Monthly', desc: 'Every 1 Month' },
                    { id: 'Quarterly', label: 'Quarterly', desc: 'Every 3 Months' },
                    { id: 'Six-Monthly', label: 'Six-Monthly', desc: 'Every 6 Months' },
                    { id: 'Yearly', label: 'Yearly', desc: 'Annual (12 Mos)' },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setMPlanFrequency(f.id as MaintenanceFrequency);
                        if (f.id === 'Monthly') setMPlanPeriodLabel('August 2026');
                        if (f.id === 'Quarterly') setMPlanPeriodLabel('Q3 2026 (Jul - Sep)');
                        if (f.id === 'Six-Monthly') setMPlanPeriodLabel('H2 2026 (Jul - Dec)');
                        if (f.id === 'Yearly') setMPlanPeriodLabel('FY 2026-27 (Annual)');
                      }}
                      className={`p-3 rounded-xl border text-center transition ${
                        mPlanFrequency === f.id
                          ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20 font-bold'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="block font-bold">{f.label}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Period Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Plan Title</label>
                  <input
                    type="text"
                    required
                    value={mPlanTitle}
                    onChange={e => setMPlanTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Period Display Label</label>
                  <input
                    type="text"
                    required
                    value={mPlanPeriodLabel}
                    onChange={e => setMPlanPeriodLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold text-gray-800"
                    placeholder="e.g. Q3 2026 (Jul - Sep)"
                  />
                </div>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={mPlanStartDate}
                    onChange={e => setMPlanStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-gray-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={mPlanEndDate}
                    onChange={e => setMPlanEndDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none text-gray-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-red-700 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    required
                    value={mPlanDueDate}
                    onChange={e => setMPlanDueDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none text-red-900 font-semibold"
                  />
                </div>
              </div>

              {/* Rate & Target Wings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Total Maintenance Rate (₹ per unit)</label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      required
                      value={mPlanBaseRate}
                      onChange={e => setMPlanBaseRate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-bold text-gray-900 text-sm"
                      placeholder="4500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Applicable Wings</label>
                  <select
                    value={mPlanWing}
                    onChange={e => setMPlanWing(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:outline-none"
                  >
                    <option value="ALL">All Wings (Society-Wide)</option>
                    <option value="Wing A">Wing A Only</option>
                    <option value="Wing B">Wing B Only</option>
                    <option value="Wing C">Wing C Only</option>
                    <option value="Wing D">Wing D Only</option>
                  </select>
                </div>
              </div>

              {/* Automatic Broadcast Notice Callout */}
              <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <BellRing className="w-4 h-4 text-blue-600" />
                  Resident Notification Broadcast
                </div>
                <p className="text-[11px] text-blue-700">
                  On saving, individual invoices will be automatically generated for all matching residents, and a high-priority announcement notice will be broadcasted to every resident's portal.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsSetMaintenanceModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Creating & Broadcasting...' : 'Set & Broadcast Maintenance'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: MANUAL PAYMENT RECORD ================= */}
      {manualPayInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-emerald-700 px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5" />
                <h3 className="font-bold text-sm">Record Offline / Manual Payment</h3>
              </div>
              <button onClick={() => setManualPayInvoice(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Resident:</span>
                  <span className="font-bold text-gray-900">{manualPayInvoice.residentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Unit:</span>
                  <span className="font-semibold text-gray-800">{manualPayInvoice.wing || ''} Flat {manualPayInvoice.apartmentNo || '101'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cycle:</span>
                  <span className="font-semibold text-gray-800">{manualPayInvoice.period || manualPayInvoice.type}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5">
                  <span className="text-gray-700 font-bold">Amount Due:</span>
                  <span className="font-black text-emerald-700 text-sm">{formatCurrency(manualPayInvoice.amount)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
                <select
                  value={manualPayMethod}
                  onChange={e => setManualPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:outline-none"
                >
                  <option value="Cheque">Cheque (Society Bank Deposit)</option>
                  <option value="NEFT / RTGS">NEFT / RTGS / Bank Transfer</option>
                  <option value="Cash">Cash Collection</option>
                  <option value="UPI / QR">Direct UPI to Secretary</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Cheque No. / Transaction Reference</label>
                <input
                  type="text"
                  value={manualPayRef}
                  onChange={e => setManualPayRef(e.target.value)}
                  placeholder="e.g. CHQ-882910 or UTR92841"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setManualPayInvoice(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRecordManualPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm & Save Receipt in Supabase'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE SINGLE INVOICE ================= */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="bg-brand-600 p-4 border-b border-brand-700 flex justify-between items-center rounded-t-2xl">
                    <h3 className="font-semibold text-lg text-white">Generate Invoice</h3>
                    <button onClick={() => setIsInvoiceModalOpen(false)} className="text-white hover:bg-brand-700 p-1 rounded-full transition"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resident Name</label>
                        <input 
                            required 
                            type="text" 
                            value={newInvoice.residentName} 
                            onChange={e => setNewInvoice({...newInvoice, residentName: e.target.value})} 
                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="e.g. John Doe"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type</label>
                        <select required value={newInvoice.type} onChange={e => setNewInvoice({...newInvoice, type: e.target.value as any})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="Maintenance">Maintenance</option>
                            <option value="Utility">Utility</option>
                            <option value="Penalty">Penalty</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    {newInvoice.type === 'Others' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input 
                                required 
                                type="text" 
                                value={newInvoice.description} 
                                onChange={e => setNewInvoice({...newInvoice, description: e.target.value})} 
                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Details..."
                            />
                        </div>
                    )}
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                        <input required type="number" value={newInvoice.amount} onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="0.00" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input required type="date" value={newInvoice.dueDate} onChange={e => setNewInvoice({...newInvoice, dueDate: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                             <select required value={newInvoice.status} onChange={e => setNewInvoice({...newInvoice, status: e.target.value as any})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                                <option value="Unpaid">Unpaid</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition mt-2">
                      Create & Download PDF
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* ================= MODAL: ADD TRANSACTION ================= */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="bg-brand-600 p-4 border-b border-brand-700 flex justify-between items-center rounded-t-2xl">
                    <h3 className="font-semibold text-lg text-white">Add Transaction</h3>
                    <button onClick={() => setIsTransactionModalOpen(false)} className="text-white hover:bg-brand-700 p-1 rounded-full transition"><X className="w-5 h-5"/></button>
                </div>
                 <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Title</label>
                        <input required type="text" value={newTransaction.title} onChange={e => setNewTransaction({...newTransaction, title: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Garden Maintenance" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select value={newTransaction.type} onChange={e => setNewTransaction({...newTransaction, type: e.target.value as any})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                                <option value="Expense">Expense</option>
                                <option value="Income">Income</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                            <input required type="number" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="0.00" />
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                         <input required type="text" value={newTransaction.category} onChange={e => setNewTransaction({...newTransaction, category: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. Repairs, Event, Salary" />
                     </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input required type="date" value={newTransaction.date} onChange={e => setNewTransaction({...newTransaction, date: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                     <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition mt-2">Add to Ledger</button>
                 </form>
             </div>
        </div>
      )}

      {/* ================= MODAL: VIEW INVOICE ================= */}
      {viewInvoice && (
          <InvoiceDetailModal invoice={viewInvoice} societyName={societyName} onClose={() => setViewInvoice(null)} />
      )}

      {/* ================= MODAL: VIEW STAMPED RECEIPT ================= */}
      {viewReceipt && (
        <ReceiptModal
          receipt={viewReceipt}
          societyName={societyName}
          onClose={() => setViewReceipt(null)}
        />
      )}

    </div>
  );
};
