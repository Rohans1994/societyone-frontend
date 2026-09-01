import React from 'react';
import { Receipt } from '../types';
import { formatCurrency } from '../constants';
import { X, Download, Printer, CheckCircle, ShieldCheck, Building2, Calendar, CreditCard, Hash, FileText } from 'lucide-react';
import jsPDF from 'jspdf';

interface ReceiptModalProps {
  receipt: Receipt | null;
  onClose: () => void;
  societyName?: string;
  societyAddress?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  onClose,
  societyName = 'Arkade Earth CHSL',
  societyAddress = 'Kanjurmarg East, Mumbai - 400042'
}) => {
  if (!receipt) return null;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Background header band
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 42, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(receipt.societyName || societyName, 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(societyAddress, 14, 25);
    doc.text('Reg No: BOM/HSG/14298/2018 | GSTIN: 27AABCU9603R1ZM', 14, 31);

    // Title badge
    doc.setFillColor(37, 99, 235);
    doc.rect(140, 10, 56, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('MAINTENANCE RECEIPT', 143, 21);

    // Receipt Meta Info Section
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt No: ${receipt.id}`, 14, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Date: ${receipt.paymentDate} ${receipt.paymentTime || ''}`, 14, 58);
    doc.text(`Transaction Ref: ${receipt.transactionRef}`, 14, 64);
    doc.text(`Payment Mode: ${receipt.paymentMethod}`, 14, 70);

    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice Ref: ${receipt.invoiceId || 'N/A'}`, 120, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`Billing Cycle: ${receipt.period || 'General Maintenance'}`, 120, 58);
    doc.text(`Frequency: ${receipt.frequency || 'Monthly'}`, 120, 64);
    doc.text(`Status: PAID & VERIFIED`, 120, 70);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 75, 196, 75);

    // Resident Details Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 80, 182, 24, 2, 2, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text('MEMBER / RESIDENT DETAILS', 18, 86);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(receipt.residentName, 18, 94);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Unit: ${receipt.wing ? receipt.wing + ' - ' : ''}Flat ${receipt.apartmentNo || 'N/A'}`, 120, 94);

    // Line items table
    let currentY = 114;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DESCRIPTION', 18, currentY + 5.5);
    doc.text('BILLING PERIOD', 110, currentY + 5.5);
    doc.text('AMOUNT (INR)', 160, currentY + 5.5);

    currentY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);

    if (receipt.breakdown && Object.keys(receipt.breakdown).length > 0) {
      const items = [
        { label: 'Society Maintenance Charges', val: receipt.breakdown.maintenance },
        { label: 'Sinking & Reserve Fund', val: receipt.breakdown.sinkingFund },
        { label: 'Water & Security Service Fund', val: receipt.breakdown.waterSecurity },
        { label: 'Parking Space Charges', val: receipt.breakdown.parking },
        { label: 'Repair & Insurance Reserve', val: receipt.breakdown.repairFund || receipt.breakdown.other }
      ].filter(item => item.val && Number(item.val) > 0);

      items.forEach(item => {
        doc.text(item.label, 18, currentY);
        doc.text(receipt.period || 'General', 110, currentY);
        doc.text(formatCurrency(Number(item.val)), 160, currentY);
        currentY += 7;
      });
    } else {
      doc.text(`Society Maintenance & Utilities [${receipt.frequency || 'Regular'}]`, 18, currentY);
      doc.text(receipt.period || 'General', 110, currentY);
      doc.text(formatCurrency(receipt.amount), 160, currentY);
      currentY += 8;
    }

    // Total Box
    currentY += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, currentY, 196, currentY);
    currentY += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT PAID:', 110, currentY);
    doc.setTextColor(22, 101, 52); // green-800
    doc.text(formatCurrency(receipt.amount), 160, currentY);

    // Paid Stamp box
    currentY += 14;
    doc.setDrawColor(22, 163, 74);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(14, currentY, 80, 26, 2, 2, 'FD');
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ PAYMENT VERIFIED & SETTLED', 18, currentY + 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Authorized by SocietyOne Financial System`, 18, currentY + 14);
    doc.text(`Digital Sign Ref: ${receipt.transactionRef}`, 18, currentY + 20);

    // Footer note
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text('This is a computer-generated official receipt and does not require a physical signature.', 14, 275);
    doc.text('Generated via SocietyOne Smart Management Platform', 14, 280);

    doc.save(`Receipt-${receipt.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Action Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Official Payment Receipt</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Receipt #{receipt.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-gray-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-bold text-gray-900">{receipt.societyName || societyName}</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">{societyAddress}</p>
              <p className="text-[11px] font-mono text-gray-400 mt-0.5">Reg: BOM/HSG/14298/2018 • GSTIN: 27AABCU9603R1ZM</p>
            </div>

            <div className="text-left sm:text-right bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Amount Paid</span>
              <span className="text-xl font-black text-emerald-700">{formatCurrency(receipt.amount)}</span>
              <span className="text-[11px] text-emerald-600 block font-medium">via {receipt.paymentMethod}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 font-medium block">Resident Member</span>
              <span className="font-bold text-gray-900 block mt-0.5">{receipt.residentName}</span>
              <span className="text-gray-500 font-medium">{receipt.wing ? `${receipt.wing} - ` : ''}Flat {receipt.apartmentNo || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Billing Period</span>
              <span className="font-bold text-gray-900 block mt-0.5">{receipt.period || 'General'}</span>
              <span className="text-brand-600 font-medium">{receipt.frequency || 'Monthly'} Cycle</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Payment Date</span>
              <span className="font-bold text-gray-900 block mt-0.5">{receipt.paymentDate}</span>
              <span className="text-gray-500">{receipt.paymentTime || 'Online'}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Transaction Ref</span>
              <span className="font-mono text-gray-900 block mt-0.5 truncate" title={receipt.transactionRef}>
                {receipt.transactionRef}
              </span>
              <span className="text-gray-500">Invoice #{receipt.invoiceId || 'N/A'}</span>
            </div>
          </div>

          {/* Itemized Breakdown Table */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Itemized Billing Breakdown</h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">Billing Period</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {receipt.breakdown && Object.keys(receipt.breakdown).length > 0 ? (
                    <>
                      {receipt.breakdown.maintenance ? (
                        <tr>
                          <td className="px-4 py-2 font-medium text-gray-900">Society Maintenance Charges</td>
                          <td className="px-4 py-2 text-gray-500">{receipt.period || 'General'}</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(receipt.breakdown.maintenance)}</td>
                        </tr>
                      ) : null}
                      {receipt.breakdown.sinkingFund ? (
                        <tr>
                          <td className="px-4 py-2 font-medium text-gray-900">Sinking & Reserve Fund</td>
                          <td className="px-4 py-2 text-gray-500">{receipt.period || 'General'}</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(receipt.breakdown.sinkingFund)}</td>
                        </tr>
                      ) : null}
                      {receipt.breakdown.waterSecurity ? (
                        <tr>
                          <td className="px-4 py-2 font-medium text-gray-900">Water, Common Power & Security Fund</td>
                          <td className="px-4 py-2 text-gray-500">{receipt.period || 'General'}</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(receipt.breakdown.waterSecurity)}</td>
                        </tr>
                      ) : null}
                      {receipt.breakdown.parking ? (
                        <tr>
                          <td className="px-4 py-2 font-medium text-gray-900">Designated Parking Space Charges</td>
                          <td className="px-4 py-2 text-gray-500">{receipt.period || 'General'}</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(receipt.breakdown.parking)}</td>
                        </tr>
                      ) : null}
                      {receipt.breakdown.repairFund || receipt.breakdown.other ? (
                        <tr>
                          <td className="px-4 py-2 font-medium text-gray-900">Building Insurance & Repair Reserve</td>
                          <td className="px-4 py-2 text-gray-500">{receipt.period || 'General'}</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(Number(receipt.breakdown.repairFund || receipt.breakdown.other))}</td>
                        </tr>
                      ) : null}
                    </>
                  ) : (
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-900">Society Maintenance ({receipt.frequency || 'Periodic'})</td>
                      <td className="px-4 py-3 text-gray-500">{receipt.period || 'General'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(receipt.amount)}</td>
                    </tr>
                  )}
                  <tr className="bg-gray-50/70 font-bold text-gray-900 text-sm">
                    <td className="px-4 py-3" colSpan={2}>Total Amount Paid</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(receipt.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Verification & Stamp */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-emerald-900">PAID & OFFICIALLY RECORDED</h5>
                <p className="text-[11px] text-emerald-700">Stored securely in society financial ledger & Supabase database</p>
              </div>
            </div>
            
            <div className="text-right text-[11px] text-gray-500">
              <span className="font-mono block">Auth Code: {receipt.transactionRef.substring(0, 16)}</span>
              <span>Society Managing Committee</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Thank you for your timely contribution!</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Official PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
