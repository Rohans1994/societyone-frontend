import React, { useState } from 'react';
import { Invoice } from '../types';
import { Search, ArrowLeft, Calendar, Download, Eye } from 'lucide-react';
import { formatCurrency } from '../constants';
import { InvoiceDetailModal } from './InvoiceDetailModal';

interface InvoiceHistoryProps {
    invoices: Invoice[];
    onBack: () => void;
    onUpdateInvoice: (invoice: Invoice) => void;
}

export const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({ invoices, onBack, onUpdateInvoice }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.residentName.toLowerCase().includes(searchTerm.toLowerCase()) || inv.id.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesDate = true;
        if (dateFilter.start && dateFilter.end) {
            const dueDate = new Date(inv.dueDate);
            const start = new Date(dateFilter.start);
            const end = new Date(dateFilter.end);
            matchesDate = dueDate >= start && dueDate <= end;
        }
        return matchesSearch && matchesDate;
    });

    const handleDownload = (invoice: Invoice, e: React.MouseEvent) => {
        e.stopPropagation();
        // Mock download functionality
        const element = document.createElement("a");
        const file = new Blob([`Invoice ID: ${invoice.id}\nResident: ${invoice.residentName}\nAmount: ${invoice.amount}\nDue Date: ${invoice.dueDate}\nStatus: ${invoice.status}`], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `Invoice-${invoice.id}.txt`;
        document.body.appendChild(element); 
        element.click();
        document.body.removeChild(element);
    };

    const handleStatusChange = (invoice: Invoice, newStatus: string) => {
        onUpdateInvoice({ ...invoice, status: newStatus as any });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">All Invoices</h2>
                    <p className="text-sm text-gray-500">History of all billing and payments.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search resident or invoice ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input 
                            type="date" 
                            className="bg-transparent text-sm outline-none"
                            value={dateFilter.start}
                            onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-sm outline-none"
                            value={dateFilter.end}
                            onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                        />
                    </div>
                    {(dateFilter.start || dateFilter.end) && (
                        <button onClick={() => setDateFilter({start: '', end: ''})} className="text-xs text-red-500 hover:text-red-700">Clear</button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Invoice ID</th>
                                <th className="px-6 py-3">Resident</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Due Date</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{inv.id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{inv.residentName}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {inv.type}
                                        {inv.type === 'Others' && inv.description && <span className="text-xs text-gray-400 block">{inv.description}</span>}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{inv.dueDate}</td>
                                    <td className="px-6 py-4 font-bold">{formatCurrency(inv.amount)}</td>
                                    <td className="px-6 py-4">
                                        <select 
                                            value={inv.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleStatusChange(inv, e.target.value)}
                                            className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer outline-none focus:ring-2 focus:ring-brand-500 ${
                                                inv.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                                inv.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}
                                        >
                                            <option value="Unpaid">Unpaid</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Overdue">Overdue</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button 
                                            onClick={() => setSelectedInvoice(inv)}
                                            className="text-gray-400 hover:text-brand-600 transition"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDownload(inv, e)}
                                            className="text-gray-400 hover:text-brand-600 transition"
                                            title="Download PDF"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">No invoices found matching criteria.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedInvoice && (
                <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
            )}
        </div>
    );
};
