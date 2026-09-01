import React, { useState } from 'react';
import { Invoice, Receipt } from '../types';
import { formatCurrency } from '../constants';
import { X, CheckCircle2, QrCode, CreditCard, Landmark, ShieldCheck, ArrowRight, Loader2, Sparkles, ReceiptText } from 'lucide-react';

interface PaymentModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPaymentSuccess: (receipt: Receipt) => void;
  residentName: string;
  residentId?: string;
  societyName?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  onClose,
  onPaymentSuccess,
  residentName,
  residentId,
  societyName = 'Arkade Earth'
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [upiId, setUpiId] = useState('resident@okaxis');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8891');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('890');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidReceipt, setPaidReceipt] = useState<Receipt | null>(null);

  if (!invoice) return null;

  const handlePayNow = async () => {
    setIsProcessing(true);
    try {
      const payMethodLabel = selectedMethod === 'UPI' ? 'UPI (Instant)' : selectedMethod === 'Card' ? 'Credit/Debit Card' : `Net Banking (${selectedBank})`;
      const txRef = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const res = await fetch(`/api/invoices/${invoice.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: payMethodLabel,
          transactionRef: txRef,
          amountPaid: invoice.amount,
          paidByResidentId: residentId || invoice.residentId,
          paidByResidentName: residentName || invoice.residentName,
        })
      });

      if (!res.ok) {
        throw new Error('Failed to process payment');
      }

      const data = await res.json();
      
      const newReceipt: Receipt = {
        id: data.receiptId || `REC-${Date.now()}`,
        invoiceId: invoice.id,
        residentId: residentId || invoice.residentId,
        residentName: residentName || invoice.residentName,
        wing: invoice.wing,
        apartmentNo: invoice.apartmentNo,
        amount: invoice.amount,
        paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
        paymentTime: data.paymentTime || new Date().toLocaleTimeString(),
        paymentMethod: payMethodLabel,
        transactionRef: data.transactionRef || txRef,
        period: invoice.period || 'Maintenance Period',
        frequency: invoice.frequency || 'Monthly',
        societyId: invoice.societyId,
        societyName: societyName,
        status: 'Success',
        breakdown: invoice.breakdown,
        createdAt: new Date().toISOString()
      };

      setPaidReceipt(newReceipt);
      onPaymentSuccess(newReceipt);
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment could not be processed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Society Maintenance Payment</h3>
              <p className="text-xs text-slate-400">Secure Payment Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paidReceipt ? (
          /* Payment Success View */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Payment Successful
              </span>
              <h2 className="text-2xl font-black text-gray-900 mt-2">{formatCurrency(paidReceipt.amount)}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Receipt #{paidReceipt.id} generated and saved to your account in Supabase.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Resident / Unit</span>
                <span className="font-semibold text-gray-900">{paidReceipt.residentName} ({paidReceipt.wing ? paidReceipt.wing + ' - ' : ''}{paidReceipt.apartmentNo})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Billing Cycle</span>
                <span className="font-semibold text-gray-900">{paidReceipt.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Ref</span>
                <span className="font-mono text-gray-900">{paidReceipt.transactionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date & Time</span>
                <span className="font-semibold text-gray-900">{paidReceipt.paymentDate} {paidReceipt.paymentTime}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <ReceiptText className="w-4 h-4" />
                Done & View in Maintenance Tab
              </button>
            </div>
          </div>
        ) : (
          /* Payment Form View */
          <div className="p-6 space-y-5">
            
            {/* Invoice Summary Card */}
            <div className="bg-gradient-to-br from-brand-50 to-blue-50/50 p-4 rounded-xl border border-brand-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block">
                  {invoice.frequency || 'Periodic'} Maintenance Bill
                </span>
                <h4 className="text-sm font-bold text-gray-900 mt-0.5">{invoice.description || invoice.period || 'Society Dues'}</h4>
                <p className="text-xs text-gray-500">Due Date: {invoice.dueDate}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 block font-medium">Total Due</span>
                <span className="text-xl font-black text-brand-700">{formatCurrency(invoice.amount)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Select Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('UPI')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
                    selectedMethod === 'UPI'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  UPI / QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('Card')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
                    selectedMethod === 'Card'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  Cards (Debit/Credit)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('NetBanking')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
                    selectedMethod === 'NetBanking'
                      ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Landmark className="w-5 h-5" />
                  Net Banking
                </button>
              </div>
            </div>

            {/* Payment Details Input */}
            {selectedMethod === 'UPI' && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Scan & Pay via any UPI App</span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">0% Gateway Fee</span>
                </div>

                <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-200">
                  <div className="w-20 h-20 bg-gray-900 text-white rounded-lg flex flex-col items-center justify-center shrink-0">
                    <QrCode className="w-12 h-12 text-white" />
                    <span className="text-[8px] font-mono tracking-tighter mt-1">BHIM UPI QR</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-gray-900">Supported Apps:</p>
                    <p className="text-gray-500 text-[11px]">Google Pay • PhonePe • Paytm • CRED • Amazon Pay</p>
                    <p className="font-mono text-brand-700 text-[11px] font-bold">VPA: arkade.society@icici</p>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Or enter your UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    placeholder="username@bank"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {selectedMethod === 'Card' && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 block mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">CVV</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                      maxLength={4}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'NetBanking' && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-3 text-xs">
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">Popular Banks</label>
                <div className="grid grid-cols-2 gap-2">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'].map(bank => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`px-3 py-2 rounded-lg border text-left font-medium transition ${
                        selectedBank === bank
                          ? 'border-brand-600 bg-brand-50 text-brand-700 font-bold'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Security note */}
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>256-Bit SSL Encrypted. Direct credit to society bank account.</span>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handlePayNow}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying & Recording Payment...
                </>
              ) : (
                <>
                  Pay {formatCurrency(invoice.amount)} Now
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
