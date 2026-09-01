import React from 'react';
import { Invoice } from '../types';
import { X, Download, Building2, Calendar, FileText, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../constants';
import jsPDF from 'jspdf';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  onClose: () => void;
  onPayNow?: (invoice: Invoice) => void;
  societyName?: string;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ 
  invoice, 
  onClose,
  onPayNow,
  societyName = 'Arkade Earth CHSL'
}) => {
  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Dark header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(societyName, 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text('Society Maintenance & Utility Demand Notice', 14, 25);
    doc.text('Reg: BOM/HSG/14298/2018 | GSTIN: 27AABCU9603R1ZM', 14, 31);

    // Title badge
    doc.setFillColor(37, 99, 235);
    doc.rect(140, 10, 56, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE / BILL', 152, 21);

    // Invoice Meta Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice ID: ${invoice.id}`, 14, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bill Date: ${new Date().toISOString().split('T')[0]}`, 14, 58);
    doc.text(`Due Date: ${invoice.dueDate}`, 14, 64);
    doc.text(`Frequency: ${invoice.frequency || 'Monthly'}`, 14, 70);

    doc.setFont('helvetica', 'bold');
    doc.text(`Billing Period: ${invoice.period || 'General'}`, 120, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 120, 58);
    if (invoice.paidAt) {
      doc.text(`Paid On: ${invoice.paidAt}`, 120, 64);
    }
    if (invoice.receiptId) {
      doc.text(`Receipt Ref: ${invoice.receiptId}`, 120, 70);
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 75, 196, 75);

    // Billed To Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 80, 182, 24, 2, 2, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text('BILLED TO / MEMBER DETAILS', 18, 86);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.residentName, 18, 94);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Unit: ${invoice.wing ? invoice.wing + ' - ' : ''}Flat ${invoice.apartmentNo || 'N/A'}`, 120, 94);

    // Line items table
    let currentY = 114;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('ITEM DESCRIPTION', 18, currentY + 5.5);
    doc.text('PERIOD', 115, currentY + 5.5);
    doc.text('AMOUNT (INR)', 160, currentY + 5.5);

    currentY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);

    if (invoice.breakdown && Object.keys(invoice.breakdown).length > 0) {
      const items = [
        { label: 'Society Maintenance Charges', val: invoice.breakdown.maintenance },
        { label: 'Sinking & Reserve Fund', val: invoice.breakdown.sinkingFund },
        { label: 'Water & Common Utility Charges', val: invoice.breakdown.waterSecurity },
        { label: 'Designated Parking Space Charges', val: invoice.breakdown.parking },
        { label: 'Repair & Insurance Reserve', val: invoice.breakdown.repairFund || invoice.breakdown.other }
      ].filter(item => item.val && Number(item.val) > 0);

      items.forEach(item => {
        doc.text(item.label, 18, currentY);
        doc.text(invoice.period || 'General', 115, currentY);
        doc.text(formatCurrency(Number(item.val)), 160, currentY);
        currentY += 7;
      });
    } else {
      doc.text(`${invoice.type} Charges (${invoice.frequency || 'Periodic'})`, 18, currentY);
      doc.text(invoice.period || 'General', 115, currentY);
      doc.text(formatCurrency(invoice.amount), 160, currentY);
      currentY += 8;
    }

    currentY += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, currentY, 196, currentY);
    currentY += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAYABLE AMOUNT:', 105, currentY);
    doc.setTextColor(29, 78, 216);
    doc.text(formatCurrency(invoice.amount), 160, currentY);

    // Payment Instructions
    currentY += 16;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, 182, 30, 2, 2, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT INSTRUCTIONS & TERMS:', 18, currentY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('1. Please pay before the due date to avoid standard late payment interest of 12% p.a.', 18, currentY + 14);
    doc.text('2. Payments can be settled via UPI, Net Banking, or Credit Card directly via the Resident Portal.', 18, currentY + 20);
    doc.text('3. For NEFT/RTGS: Society Bank A/C: 50200012849102, IFSC: HDFC0000240, Branch: Kanjurmarg.', 18, currentY + 26);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('Generated via SocietyOne Smart Management Platform', 14, 280);

    doc.save(`Invoice-${invoice.id}.pdf`);
  };

  const isOverdue = invoice.status === 'Overdue' || (invoice.status === 'Unpaid' && new Date(invoice.dueDate) < new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
        
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Invoice Details</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  invoice.status === 'Paid'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : isOverdue
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {invoice.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{invoice.id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Top Meta info */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b border-gray-100 gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase font-medium">Billed Resident Member</p>
              <h4 className="font-bold text-gray-900 text-base mt-0.5">{invoice.residentName}</h4>
              <p className="text-xs text-gray-500">{invoice.wing ? `${invoice.wing} - ` : ''}Flat {invoice.apartmentNo || 'N/A'}</p>
            </div>
            <div className="text-left sm:text-right bg-brand-50/60 p-3 rounded-xl border border-brand-100">
              <p className="text-xs text-brand-700 font-medium">Total Bill Amount</p>
              <p className="text-xl font-black text-brand-700">{formatCurrency(invoice.amount)}</p>
              <p className="text-[11px] text-gray-500">Due Date: {invoice.dueDate}</p>
            </div>
          </div>

          {/* Quick Details Chips */}
          <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 block font-medium">Bill Type</span>
              <span className="font-bold text-gray-900 mt-0.5 block">{invoice.type}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Frequency</span>
              <span className="font-bold text-gray-900 mt-0.5 block">{invoice.frequency || 'Monthly'}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Cycle / Period</span>
              <span className="font-bold text-gray-900 mt-0.5 block">{invoice.period || 'General'}</span>
            </div>
          </div>

          {/* Line items breakdown */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">Billing Breakdown</h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {invoice.breakdown && Object.keys(invoice.breakdown).length > 0 ? (
                    <>
                      {invoice.breakdown.maintenance ? (
                        <tr>
                          <td className="px-4 py-2 font-medium">Society Maintenance Charges</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(invoice.breakdown.maintenance)}</td>
                        </tr>
                      ) : null}
                      {invoice.breakdown.sinkingFund ? (
                        <tr>
                          <td className="px-4 py-2 font-medium">Sinking & Reserve Fund</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(invoice.breakdown.sinkingFund)}</td>
                        </tr>
                      ) : null}
                      {invoice.breakdown.waterSecurity ? (
                        <tr>
                          <td className="px-4 py-2 font-medium">Water, Common Power & Security Fund</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(invoice.breakdown.waterSecurity)}</td>
                        </tr>
                      ) : null}
                      {invoice.breakdown.parking ? (
                        <tr>
                          <td className="px-4 py-2 font-medium">Designated Parking Space Charges</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(invoice.breakdown.parking)}</td>
                        </tr>
                      ) : null}
                      {invoice.breakdown.repairFund || invoice.breakdown.other ? (
                        <tr>
                          <td className="px-4 py-2 font-medium">Building Insurance & Repair Reserve</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(Number(invoice.breakdown.repairFund || invoice.breakdown.other))}</td>
                        </tr>
                      ) : null}
                    </>
                  ) : (
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-900">{invoice.type} ({invoice.frequency || 'Periodic'})</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(invoice.amount)}</td>
                    </tr>
                  )}
                  <tr className="bg-gray-50 font-bold text-gray-900 text-sm">
                    <td className="px-4 py-3">Total Payable</td>
                    <td className="px-4 py-3 text-right text-brand-700">{formatCurrency(invoice.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Note */}
          {invoice.status === 'Paid' ? (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block">Invoice Paid</span>
                <span>Paid on {invoice.paidAt || 'Recorded'} via {invoice.paymentMethod || 'Online'}. Receipt #{invoice.receiptId || 'Generated'}</span>
              </div>
            </div>
          ) : isOverdue ? (
            <div className="flex items-center gap-3 p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <span className="font-bold block">Overdue Payment Notice</span>
                <span>This bill passed its due date ({invoice.dueDate}). Please pay immediately to prevent late penalty interest.</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold block">Payment Pending</span>
                <span>Payment is due by {invoice.dueDate}.</span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>

          {invoice.status !== 'Paid' && onPayNow && (
            <button
              onClick={() => {
                onClose();
                onPayNow(invoice);
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-2"
            >
              Pay {formatCurrency(invoice.amount)} Now
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
