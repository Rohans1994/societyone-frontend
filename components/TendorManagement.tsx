import React, { useState } from 'react';
import { Vendor, Tendor, TendorQuotation } from '../types';
import { Search, Plus, Trash2, Edit2, ClipboardList, FileText, X, DollarSign, Award, ArrowUpDown, Upload, Download } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cppybjxvxejeewdxmozl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'dummy-anon-key-configure-via-env');

const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

interface TendorManagementProps {
    vendors: Vendor[];
    tendors: Tendor[];
    // Name of the active society's dedicated Storage bucket. Falls back to
    // the legacy shared 'tendor' bucket if undefined (societies created
    // before this feature, not yet backfilled).
    storageBucket?: string;
    onAddTendor: (tendor: Tendor) => void;
    onUpdateTendor: (tendor: Tendor) => void;
    onDeleteTendor: (id: string) => void;
}

interface QuotationRow {
    vendorId: string;
    quotation: string; // Keep as string for input control, parse to number on save
    pdfName?: string;
    pdfUrl?: string;
    pdfFile?: File;
}

export const TendorManagement: React.FC<TendorManagementProps> = ({
    vendors,
    tendors,
    storageBucket,
    onAddTendor,
    onUpdateTendor,
    onDeleteTendor
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTendor, setEditingTendor] = useState<Tendor | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Form inputs state
    const [tendorName, setTendorName] = useState('');
    const [tendorDescription, setTendorDescription] = useState('');

    const handleDownloadTendorFile = async (url: string, suggestedFilename: string) => {
        if (!url) return;
        
        try {
            // Check for locally created blobs
            if (url.startsWith('blob:')) {
                const link = document.createElement('a');
                link.href = url;
                link.download = suggestedFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }

            // Files uploaded via /api/upload are served back from our own backend
            // (apiClient.ts attaches the auth header automatically to /api/... calls).
            // This avoids relying on a direct Supabase Storage client, whose ad-hoc
            // session picks up the logged-in user's real auth token rather than a
            // pure anon one, and the 'tendor' bucket has no matching RLS policy for
            // either role. Only legacy URLs (from before this fix) fall through to
            // the Supabase-client logic below.
            if (url.startsWith('/api/')) {
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to download file from backend');
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = suggestedFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
                return;
            }

            // Extract the filename from the URL path
            let filename = '';
            if (url.includes('/tendor/')) {
                const parts = url.split('/tendor/');
                filename = decodeURIComponent(parts[parts.length - 1]);
            } else {
                const parts = url.split('/');
                filename = decodeURIComponent(parts[parts.length - 1]);
            }
            
            // Strip any query parameters
            if (filename.includes('?')) {
                filename = filename.split('?')[0];
            }

            if (!filename) {
                throw new Error('Could not parse filename from Tendor url.');
            }

            // Fetch Supabase configuration dynamically from backend so we get the correct keys
            let activeSupabaseUrl = SUPABASE_URL;
            let activeAnonKey = SUPABASE_ANON_KEY;
            try {
                const configRes = await fetch('/api/supabase-config');
                if (configRes.ok) {
                    const configData = await configRes.json();
                    if (configData.supabaseUrl && typeof configData.supabaseUrl === 'string' && configData.supabaseUrl.trim() !== '') {
                        activeSupabaseUrl = configData.supabaseUrl.trim();
                    }
                    if (configData.supabaseAnonKey && typeof configData.supabaseAnonKey === 'string' && configData.supabaseAnonKey.trim() !== '') {
                        activeAnonKey = configData.supabaseAnonKey.trim();
                    }
                }
            } catch (err) {
                console.warn('Could not fetch Supabase config for download:', err);
            }

            // Fallback validate activeSupabaseUrl matches a valid http or https url
            if (!activeSupabaseUrl || (!activeSupabaseUrl.startsWith('http://') && !activeSupabaseUrl.startsWith('https://'))) {
                activeSupabaseUrl = 'https://cppybjxvxejeewdxmozl.supabase.co';
            }

            // Check if we can use the Supabase client directly
            const isValidJWT = activeAnonKey && activeAnonKey.split('.').length === 3;
            if (isValidJWT) {
                const activeSupabase = createClient(activeSupabaseUrl, activeAnonKey);
                
                // Use supabase.storage.download from 'tendor' bucket
                const { data, error } = await activeSupabase.storage
                    .from('tendor')
                    .download(filename);

                if (error) {
                    throw error;
                }

                if (data) {
                    const blobUrl = URL.createObjectURL(data);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = suggestedFilename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                    return;
                }
            }
            
            // Fallback: If JWT/AnonKey isn't valid or download fails, open in a new tab
            window.open(url, '_blank');
        } catch (err: any) {
            console.error('Error downloading Tendor quotation document:', err);
            window.open(url, '_blank');
        }
    };
    
    // Provide by default 3 rows for vendor and quotation
    const [quotationRows, setQuotationRows] = useState<QuotationRow[]>([
        { vendorId: '', quotation: '' },
        { vendorId: '', quotation: '' },
        { vendorId: '', quotation: '' }
    ]);

    // Handle opening modal for creating
    const handleOpenCreateModal = () => {
        setEditingTendor(null);
        setTendorName('');
        setTendorDescription('');
        setQuotationRows([
            { vendorId: '', quotation: '' },
            { vendorId: '', quotation: '' },
            { vendorId: '', quotation: '' }
        ]);
        setIsModalOpen(true);
    };

    // Handle opening modal for editing
    const handleOpenEditModal = (tendor: Tendor) => {
        setEditingTendor(tendor);
        setTendorName(tendor.name);
        setTendorDescription(tendor.description);
        
        // Map existing quotations to rows
        const rows = tendor.quotations.map(q => ({
            vendorId: q.vendorId,
            quotation: q.quotation.toString(),
            pdfName: q.pdfName,
            pdfUrl: q.pdfUrl
        }));
        
        // Ensure there are at least 3 rows to fulfill default visual constraint if wanted
        while (rows.length < 3) {
            rows.push({ vendorId: '', quotation: '' });
        }
        
        setQuotationRows(rows);
        setIsModalOpen(true);
    };

    // Add row to quotation table
    const handleAddQuotationRow = () => {
        setQuotationRows(prev => [...prev, { vendorId: '', quotation: '' }]);
    };

    // Remove row from quotation table
    const handleRemoveQuotationRow = (index: number) => {
        // Prevent removal if they want specifically to keep rows, but allowing is standard
        setQuotationRows(prev => prev.filter((_, idx) => idx !== index));
    };

    // Update individual row values
    const handleRowChange = (index: number, field: keyof QuotationRow, value: any) => {
        setQuotationRows(prev => prev.map((row, idx) => {
            if (idx === index) {
                return { ...row, [field]: value };
            }
            return row;
        }));
    };

    // Save the tender details
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsUploading(true);
        
        try {
            // Upload via the backend, which uses the Supabase service role key
            // server-side (bypasses Storage RLS entirely). A direct-to-Supabase
            // client upload was tried here previously, but any ad-hoc client for
            // this project picks up the current logged-in user's real auth
            // session (Supabase persists sessions in localStorage keyed by
            // project, shared across every createClient() call for that
            // project) rather than a pure anon one, and the 'tendor' bucket has
            // no RLS policy for either role — so it always failed and only
            // "worked" via this same fallback anyway.
            const updatedRows = await Promise.all(quotationRows.map(async (row) => {
                if (row.pdfFile) {
                    let pdfFilename = `${Date.now()}_${row.pdfFile.name}`;
                    if (!pdfFilename.toLowerCase().endsWith('.pdf')) {
                        pdfFilename += '.pdf';
                    }

                    const storagePath = storageBucket
                        ? `tendor/${tendorName}/${pdfFilename}`
                        : `${tendorName}/${pdfFilename}`;
                    let uploadedUrl = row.pdfUrl;

                    try {
                        const base64Data = await convertToBase64(row.pdfFile);
                        const uploadRes = await fetch('/api/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                bucket: storageBucket || 'tendor',
                                filename: storagePath,
                                contentBase64: base64Data,
                                mimeType: 'application/pdf'
                            })
                        });
                        if (uploadRes.ok) {
                            const result = await uploadRes.json();
                            uploadedUrl = result.url;
                        } else {
                            console.error('Tendor quotation file upload failed:', await uploadRes.text());
                        }
                    } catch (uploadErr) {
                        console.error('Tendor quotation file upload failed:', uploadErr);
                    }

                    return {
                        ...row,
                        pdfUrl: uploadedUrl
                    };
                }
                return row;
            }));

            // Validate and filter quotations (ignore incomplete rows, but save complete ones)
            const validQuotations: TendorQuotation[] = [];
            updatedRows.forEach(row => {
                const parsedVal = parseFloat(row.quotation);
                if (row.vendorId && !isNaN(parsedVal)) {
                    const vendorObj = vendors.find(v => v.id === row.vendorId);
                    validQuotations.push({
                        vendorId: row.vendorId,
                        vendorName: vendorObj ? vendorObj.name : 'Unknown Vendor',
                        quotation: parsedVal,
                        pdfName: row.pdfName,
                        pdfUrl: row.pdfUrl
                    });
                }
            });

            if (editingTendor) {
                onUpdateTendor({
                    ...editingTendor,
                    name: tendorName,
                    description: tendorDescription,
                    quotations: validQuotations
                });
            } else {
                onAddTendor({
                    id: 'tendor-' + Math.random().toString(36).substr(2, 9),
                    name: tendorName,
                    description: tendorDescription,
                    quotations: validQuotations
                });
            }

            setIsModalOpen(false);
            setEditingTendor(null);
        } catch (err) {
            console.error('Error submitting tendor form:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this tender?')) {
            onDeleteTendor(id);
        }
    };

    const filteredTendors = tendors.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get L1 bidder (lowest quote) for visual enrichment
    const getL1Bidder = (quotations: TendorQuotation[]) => {
        if (!quotations || quotations.length === 0) return null;
        return [...quotations].sort((a,b) => a.quotation - b.quotation)[0];
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-350" id="tendor-management-section">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <ClipboardList className="w-7 h-7 text-brand-600" /> Tendor Management
                    </h2>
                    <p className="text-sm text-gray-500">Compare quotes, administer dynamic tenders, and choose optimal servicing bids.</p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    id="btn-create-tendor"
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 outline-none"
                >
                    <Plus className="w-5 h-5" /> Create Tendor
                </button>
            </div>

            {/* Search filter bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search tendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <span className="text-xs font-mono text-gray-400">Total: {filteredTendors.length}</span>
            </div>

            {/* List of Tenders */}
            {filteredTendors.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center flex flex-col items-center max-w-md mx-auto">
                    <ClipboardList className="w-12 h-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-bold text-gray-800">No tendors found</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-6">Create a new tender with vendor bids to start evaluating cost options.</p>
                    <button
                        onClick={handleOpenCreateModal}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                        Create Your First Tendor
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="tendor-grid">
                    {filteredTendors.map(tendor => {
                        const l1 = getL1Bidder(tendor.quotations);
                        return (
                            <div key={tendor.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition duration-200">
                                <div className="p-6">
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <div className="bg-brand-50 p-2.5 rounded-xl border border-brand-100">
                                            <FileText className="w-6 h-6 text-brand-600" />
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button 
                                                onClick={() => handleOpenEditModal(tendor)}
                                                className="text-gray-400 hover:text-brand-600 hover:bg-brand-50 p-2 rounded-lg transition"
                                                title="Edit Tendor"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(tendor.id)}
                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                                                title="Delete Tendor"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">{tendor.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1.5 mb-5 whitespace-pre-wrap leading-relaxed">{tendor.description}</p>

                                    {/* Quotations sub-section */}
                                    <div className="mt-4 space-y-3">
                                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor Bids</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quotation</span>
                                        </div>

                                        {tendor.quotations.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic text-center py-2">No vendor quotes added yet.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {tendor.quotations.map((q, idx) => {
                                                    const isL1 = l1 && l1.vendorId === q.vendorId;
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            className={`flex items-center justify-between p-2.5 rounded-lg text-sm transition ${
                                                                isL1 
                                                                    ? 'bg-emerald-50/70 border border-emerald-100 text-emerald-900 font-semibold' 
                                                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100/50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 truncate pr-4">
                                                                {isL1 && (
                                                                    <Award className="w-4 h-4 text-emerald-600 flex-shrink-0 animate-pulse" />
                                                                )}
                                                                <span className="truncate">{q.vendorName}</span>
                                                                {isL1 && (
                                                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">L1 Best</span>
                                                                )}
                                                                {q.pdfUrl && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleDownloadTendorFile(q.pdfUrl!, q.pdfName || 'tendor-quotation.pdf')}
                                                                        className="text-brand-600 hover:text-brand-800 hover:bg-white/60 p-1 rounded transition flex items-center justify-center inline-flex"
                                                                        title={`View/Download proposal: ${q.pdfName}`}
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <span className="font-mono text-gray-900 font-medium whitespace-nowrap">
                                                                ₹{q.quotation.toLocaleString('en-IN')}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer details */}
                                {l1 && (
                                    <div className="bg-gray-50/50 px-6 py-3 border-t border-gray-100 flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-medium">Best Price (L1 Bidder)</span>
                                        <span className="text-emerald-700 font-bold font-mono">
                                            {l1.vendorName} - ₹{l1.quotation.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand-600 p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-lg text-white">
                                    {editingTendor ? 'Update Tendor Details' : 'Create Tendor'}
                                </h3>
                                <p className="text-brand-100 text-xs">Specify requirements and vendor quotation proposals</p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="text-white hover:bg-brand-700 p-1.5 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* Tendor Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tendor Name</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={tendorName} 
                                    onChange={e => setTendorName(e.target.value)} 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition"
                                    placeholder="e.g. Elevators AMC Renewal 2026"
                                />
                            </div>

                            {/* Tendor Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tendor Description</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={tendorDescription} 
                                    onChange={e => setTendorDescription(e.target.value)} 
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition"
                                    placeholder="Provide high level parameters and service scope description"
                                />
                            </div>

                            {/* Quotation Rows Section */}
                            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/60">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Vendor Quotations</h4>
                                    <button 
                                        type="button" 
                                        onClick={handleAddQuotationRow}
                                        className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold px-2.5 py-1 rounded-md border border-brand-100 transition flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Quotation Row
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {quotationRows.map((row, index) => (
                                        <div key={index} className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm space-y-3">
                                            <div className="flex gap-3 items-center">
                                                {/* Vendor Selection Dropdown */}
                                                <div className="flex-1">
                                                    <select
                                                        value={row.vendorId}
                                                        onChange={e => handleRowChange(index, 'vendorId', e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white transition"
                                                    >
                                                        <option value="">Select Vendor</option>
                                                        {vendors.map(vendor => (
                                                            <option key={vendor.id} value={vendor.id}>
                                                                {vendor.name} ({vendor.serviceCategory})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Quotation Input (Numeric-Only check) */}
                                                <div className="w-1/3 relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={row.quotation}
                                                        onChange={e => handleRowChange(index, 'quotation', e.target.value)}
                                                        placeholder="Quotation"
                                                        className="w-full p-2 pl-6 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition"
                                                    />
                                                </div>

                                                {/* Remove Button for added convenience */}
                                                {quotationRows.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveQuotationRow(index)}
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition flex-shrink-0"
                                                        title="Remove Row"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* PDF Document Row Upload Support */}
                                            <div className="flex items-center justify-between gap-2 border-t border-dashed border-gray-100 pt-2 text-xs">
                                                <div className="flex items-center gap-1.5 text-gray-500 truncate max-w-[65%]">
                                                    <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                                    {row.pdfName ? (
                                                        <span className="truncate font-medium text-brand-700 font-sans" title={row.pdfName}>
                                                            {row.pdfName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No PDF document attached</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="file" 
                                                        id={`row-file-upload-${index}`}
                                                        className="hidden"
                                                        accept="application/pdf"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                handleRowChange(index, 'pdfName', file.name);
                                                                handleRowChange(index, 'pdfUrl', URL.createObjectURL(file));
                                                                handleRowChange(index, 'pdfFile', file);
                                                            }
                                                        }}
                                                    />

                                                    {row.pdfName ? (
                                                        <div className="flex items-center gap-1.5">
                                                            {row.pdfUrl && (
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleDownloadTendorFile(row.pdfUrl!, row.pdfName || 'quotation.pdf')}
                                                                    className="text-brand-600 hover:text-brand-800 hover:bg-brand-50 font-bold px-2 py-1 rounded transition text-[11px] flex items-center gap-0.5"
                                                                >
                                                                    <Download className="w-3 h-3" /> Save/View
                                                                </button>
                                                            )}
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    handleRowChange(index, 'pdfName', undefined);
                                                                    handleRowChange(index, 'pdfUrl', undefined);
                                                                    handleRowChange(index, 'pdfFile', undefined);
                                                                }}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold px-2 py-1 rounded transition text-[11px]"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label 
                                                            htmlFor={`row-file-upload-${index}`}
                                                            className="bg-brand-50 hover:bg-brand-100/80 text-brand-700 font-bold px-2.5 py-1.5 rounded-md border border-brand-100 cursor-pointer transition text-[11px] inline-flex items-center gap-1 focus-within:ring-2 focus-within:ring-brand-500 outline-none"
                                                        >
                                                            <Upload className="w-3.5 h-3.5 text-brand-600" /> Upload PDF
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10.5px] text-gray-400 mt-3 italic">
                                    * At least one complete row (Vendor + quotation value) is required. Only complete rows are saved.
                                </p>
                            </div>

                            {/* Save / Footer Actions */}
                            <div className="pt-2 border-t border-gray-100 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    disabled={isUploading}
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isUploading}
                                    className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? 'Uploading Proposals...' : 'Save Tendor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
