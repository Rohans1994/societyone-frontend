import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Invoice, Receipt, User } from '../types';
import { formatCurrency } from '../constants';
import { ReceiptModal } from './ReceiptModal';
import { PaymentModal } from './PaymentModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { 
  Wallet, 
  ReceiptText, 
  Calendar, 
  Filter, 
  Search, 
  Download, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Eye, 
  RefreshCw, 
  Building2, 
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';

interface ResidentMaintenanceViewProps {
  currentUser: User;
  invoices: Invoice[];
  receipts: Receipt[];
  societyName?: string;
  onRefreshReceipts?: () => void;
  onPaymentSuccess?: (receipt: Receipt, invoiceId?: string) => void;
}

export const ResidentMaintenanceView: React.FC<ResidentMaintenanceViewProps> = ({
  currentUser,
  invoices,
  receipts,
  societyName = 'Arkade Earth',
  onRefreshReceipts,
  onPaymentSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'BILLS' | 'RECEIPTS'>('BILLS');
  
  // Date and search filters for Receipts tab
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('ALL');

  // Modals state
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
  const [selectedReceiptForView, setSelectedReceiptForView] = useState<Receipt | null>(null);

  // Helper to verify an invoice/receipt strictly belongs to this logged-in resident
  const isCurrentResidentMatch = (item: { residentId?: string; residentName?: string; wing?: string; apartmentNo?: string }) => {
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

  // Local state for live fetched receipts strictly for this resident
  const [residentSpecificReceipts, setResidentSpecificReceipts] = useState<Receipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);

  // Fetch receipts from Supabase strictly for this resident
  const fetchMyReceipts = React.useCallback(async () => {
    setIsLoadingReceipts(true);
    try {
      const params = new URLSearchParams();
      if (currentUser.societyId) params.append('societyId', currentUser.societyId);
      if (currentUser.uid) params.append('residentId', currentUser.uid);
      const res = await fetch(`/api/receipts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setResidentSpecificReceipts(data.filter(isCurrentResidentMatch));
        }
      }
    } catch (err) {
      console.error('Error fetching resident receipts from Supabase:', err);
    } finally {
      setIsLoadingReceipts(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMyReceipts();
  }, [fetchMyReceipts]);

  // Filter invoices strictly for this resident (by residentId or matching name/unit)
  const residentInvoices = useMemo(() => {
    return invoices.filter(isCurrentResidentMatch);
  }, [invoices, currentUser]);

  // Separate pending and paid invoices for this resident
  const pendingInvoices = useMemo(() => {
    return residentInvoices.filter(i => i.status !== 'Paid');
  }, [residentInvoices]);

  const totalPendingAmount = useMemo(() => {
    return pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  }, [pendingInvoices]);

  // Combined receipts strictly matching only this resident
  const residentReceipts = useMemo(() => {
    const combined = [...residentSpecificReceipts, ...receipts];
    const uniqueMap = new Map<string, Receipt>();
    combined.forEach(rec => {
      if (isCurrentResidentMatch(rec)) {
        uniqueMap.set(rec.id, rec);
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }, [residentSpecificReceipts, receipts, currentUser]);

  // Filtered Receipts by Date, Frequency, and Search
  const filteredReceipts = useMemo(() => {
    return residentReceipts.filter(rec => {
      if (startDate && rec.paymentDate < startDate) return false;
      if (endDate && rec.paymentDate > endDate) return false;
      if (frequencyFilter !== 'ALL' && rec.frequency !== frequencyFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesId = rec.id.toLowerCase().includes(q);
        const matchesPeriod = rec.period?.toLowerCase().includes(q);
        const matchesRef = rec.transactionRef.toLowerCase().includes(q);
        const matchesMethod = rec.paymentMethod.toLowerCase().includes(q);
        if (!matchesId && !matchesPeriod && !matchesRef && !matchesMethod) return false;
      }
      return true;
    });
  }, [residentReceipts, startDate, endDate, frequencyFilter, searchTerm]);

  const totalPaidAmount = useMemo(() => {
    return residentReceipts.reduce((sum, r) => sum + r.amount, 0);
  }, [residentReceipts]);

  const handleInternalPaymentSuccess = (receipt: Receipt) => {
    setResidentSpecificReceipts(prev => [receipt, ...prev.filter(r => r.id !== receipt.id)]);
    if (onPaymentSuccess) {
      onPaymentSuccess(receipt, receipt.invoiceId);
    }
    fetchMyReceipts();
    // Switch to receipts tab to show the new receipt
    setActiveTab('RECEIPTS');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100/80">
              <Wallet className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Maintenance & Society Dues</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Unit {currentUser.wing ? `${currentUser.wing} • ` : ''}Flat {currentUser.apartmentNo || '101'} — {societyName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingInvoices.length > 0 && (
            <button
              onClick={() => setSelectedInvoiceForPay(pendingInvoices[0])}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Pay Total Dues ({formatCurrency(totalPendingAmount)})
            </button>
          )}
          <button
            onClick={() => {
              fetchMyReceipts();
              if (onRefreshReceipts) onRefreshReceipts();
            }}
            className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
            title="Refresh Receipts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingReceipts ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Pending Dues Card */}
        <div className={`p-5 rounded-2xl border transition ${
          totalPendingAmount > 0 
            ? 'bg-amber-50/60 border-amber-200/80' 
            : 'bg-emerald-50/60 border-emerald-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Current Dues</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              totalPendingAmount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {totalPendingAmount > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-3">{formatCurrency(totalPendingAmount)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {pendingInvoices.length > 0 
              ? `${pendingInvoices.length} bill(s) pending payment` 
              : 'All bills paid! No outstanding dues'}
          </p>
        </div>

        {/* Total Paid / Lifetime Contribution */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Settled</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-3">{formatCurrency(totalPaidAmount)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {residentReceipts.length} verified receipts stored in database
          </p>
        </div>

        {/* Supabase Storage Sync Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Digital Receipts</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-gray-900">Supabase Cloud Sync</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Official stamped receipts available for download anytime
          </p>
        </div>

      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('BILLS')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'BILLS'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Pending Invoices & Bills
          {pendingInvoices.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingInvoices.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('RECEIPTS')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'RECEIPTS'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          Paid Receipts History
          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {residentReceipts.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PENDING INVOICES & BILLS */}
      {activeTab === 'BILLS' && (
        <div className="space-y-4">
          {pendingInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-900">All Maintenance Bills Paid!</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                You have no outstanding maintenance charges for Unit {currentUser.wing || ''} {currentUser.apartmentNo || ''}. You can view past payment receipts under the Receipts tab.
              </p>
              <button
                onClick={() => setActiveTab('RECEIPTS')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition"
              >
                <ReceiptText className="w-4 h-4" />
                View Receipts History
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingInvoices.map(invoice => {
                const isOverdue = invoice.status === 'Overdue' || (invoice.status === 'Unpaid' && new Date(invoice.dueDate) < new Date());

                return (
                  <div
                    key={invoice.id}
                    className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isOverdue
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {isOverdue ? 'Overdue' : 'Due Soon'}
                          </span>
                          <h3 className="text-base font-bold text-gray-900 mt-2">
                            {invoice.description || `${invoice.period || 'Monthly'} Maintenance`}
                          </h3>
                          <p className="text-xs text-gray-500">Invoice #{invoice.id}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-gray-400 font-medium block">Amount</span>
                          <span className="text-xl font-black text-gray-900">{formatCurrency(invoice.amount)}</span>
                        </div>
                      </div>

                      {/* Info Chips */}
                      <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs mt-4">
                        <div>
                          <span className="text-gray-400 block font-medium">Due Date</span>
                          <span className="font-bold text-gray-800 mt-0.5 block">{invoice.dueDate}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-medium">Cycle / Frequency</span>
                          <span className="font-bold text-gray-800 mt-0.5 block">{invoice.frequency || 'Monthly'}</span>
                        </div>
                      </div>

                      {/* Breakdown summary if present */}
                      {invoice.breakdown && (
                        <div className="mt-3 text-[11px] text-gray-500 space-y-1">
                          {invoice.breakdown.maintenance ? (
                            <div className="flex justify-between">
                              <span>Maintenance:</span>
                              <span className="font-semibold">{formatCurrency(invoice.breakdown.maintenance)}</span>
                            </div>
                          ) : null}
                          {invoice.breakdown.sinkingFund ? (
                            <div className="flex justify-between">
                              <span>Sinking Fund:</span>
                              <span className="font-semibold">{formatCurrency(invoice.breakdown.sinkingFund)}</span>
                            </div>
                          ) : null}
                          {invoice.breakdown.waterSecurity ? (
                            <div className="flex justify-between">
                              <span>Water & Security:</span>
                              <span className="font-semibold">{formatCurrency(invoice.breakdown.waterSecurity)}</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setSelectedInvoiceForView(invoice)}
                        className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Invoice
                      </button>

                      <button
                        onClick={() => setSelectedInvoiceForPay(invoice)}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECEIPTS ARCHIVE (SUPABASE) */}
      {activeTab === 'RECEIPTS' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search receipts, periods..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Date Range Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
                <span className="text-gray-500 font-medium">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent text-gray-800 font-semibold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
                <span className="text-gray-500 font-medium">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent text-gray-800 font-semibold focus:outline-none"
                />
              </div>

              {/* Frequency Selector */}
              <select
                value={frequencyFilter}
                onChange={e => setFrequencyFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 focus:outline-none"
              >
                <option value="ALL">All Frequencies</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Six-Monthly">Six-Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>

              {(startDate || endDate || frequencyFilter !== 'ALL' || searchTerm) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setFrequencyFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="text-brand-600 hover:text-brand-800 font-bold px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>

          </div>

          {/* Receipts Table / List */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            {filteredReceipts.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <ReceiptText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-800">No payment receipts found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {residentReceipts.length === 0 
                    ? "Pay your first maintenance invoice to generate an official digital receipt stored in Supabase." 
                    : "Try clearing date or search filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3.5">Receipt #</th>
                      <th className="px-5 py-3.5">Billing Period</th>
                      <th className="px-5 py-3.5">Payment Date</th>
                      <th className="px-5 py-3.5">Payment Mode</th>
                      <th className="px-5 py-3.5">Transaction Ref</th>
                      <th className="px-5 py-3.5 text-right">Amount Paid</th>
                      <th className="px-5 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredReceipts.map(rec => (
                      <tr key={rec.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-5 py-3.5 font-bold text-gray-900">
                          <span className="font-mono text-brand-600">{rec.id}</span>
                          <span className="block text-[10px] text-gray-400 font-normal">Inv: {rec.invoiceId || 'N/A'}</span>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          {rec.period || 'General Maintenance'}
                          <span className="block text-[10px] text-gray-500">{rec.frequency || 'Periodic'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          {rec.paymentDate}
                          <span className="block text-[10px] text-gray-400">{rec.paymentTime || 'Recorded'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-medium text-[11px]">
                            {rec.paymentMethod}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-gray-500 text-[11px] truncate max-w-[140px]" title={rec.transactionRef}>
                          {rec.transactionRef}
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-emerald-700 text-sm">
                          {formatCurrency(rec.amount)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => setSelectedReceiptForView(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Payment Modal */}
      {selectedInvoiceForPay && (
        <PaymentModal
          invoice={selectedInvoiceForPay}
          residentName={currentUser.name}
          residentId={currentUser.uid}
          societyName={societyName}
          onClose={() => setSelectedInvoiceForPay(null)}
          onPaymentSuccess={handleInternalPaymentSuccess}
        />
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoiceForView && (
        <InvoiceDetailModal
          invoice={selectedInvoiceForView}
          societyName={societyName}
          onClose={() => setSelectedInvoiceForView(null)}
          onPayNow={inv => {
            setSelectedInvoiceForView(null);
            setSelectedInvoiceForPay(inv);
          }}
        />
      )}

      {/* Stamped Official Receipt Modal */}
      {selectedReceiptForView && (
        <ReceiptModal
          receipt={selectedReceiptForView}
          societyName={societyName}
          onClose={() => setSelectedReceiptForView(null)}
        />
      )}

    </div>
  );
};
