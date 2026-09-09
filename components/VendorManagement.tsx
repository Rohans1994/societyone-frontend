import React, { useState } from 'react';
import { Vendor } from '../types';
import { Search, Plus, Trash2, Edit2, Phone, Mail, Briefcase, X, Upload } from 'lucide-react';
import { BulkImportModal, BulkImportSummary } from './BulkImportModal';

interface VendorManagementProps {
    vendors: Vendor[];
    onAddVendor: (vendor: Vendor) => void;
    onUpdateVendor: (vendor: Vendor) => void;
    onDeleteVendor: (id: string) => void;
    onBulkImportVendors?: (rows: Record<string, string>[]) => Promise<BulkImportSummary>;
}

export const VendorManagement: React.FC<VendorManagementProps> = ({ vendors, onAddVendor, onUpdateVendor, onDeleteVendor, onBulkImportVendors }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; warning?: string } | null>(null);

    const [formData, setFormData] = useState<Omit<Vendor, 'id' | 'status'>>({
        name: '',
        serviceCategory: 'Plumbing',
        contactPerson: '',
        phone: '',
        email: ''
    });

    const filteredVendors = vendors.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.serviceCategory.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingVendor) {
            onUpdateVendor({ ...editingVendor, ...formData });
        } else {
            onAddVendor({
                id: Math.random().toString(36).substr(2, 9),
                status: 'Active',
                ...formData
            });
        }
        setIsModalOpen(false);
        setEditingVendor(null);
        setFormData({ name: '', serviceCategory: 'Plumbing', contactPerson: '', phone: '', email: '' });
    };

    const handleEdit = (vendor: Vendor) => {
        setEditingVendor(vendor);
        let cat = vendor.serviceCategory;
        const lowerCat = cat.toLowerCase();
        if (lowerCat === 'plumbing') cat = 'Plumbing';
        else if (lowerCat === 'security') cat = 'Security';
        else if (lowerCat === 'gardening') cat = 'Gardening';
        else if (lowerCat === 'ac' || lowerCat === 'hvac') cat = 'AC';
        else if (lowerCat === 'elevator') cat = 'Elevator';
        else if (lowerCat === 'club house') cat = 'Club House';
        else cat = 'Plumbing';

        setFormData({
            name: vendor.name,
            serviceCategory: cat,
            contactPerson: vendor.contactPerson,
            phone: vendor.phone,
            email: vendor.email
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (vendor: Vendor) => {
        // Check whether this vendor is still referenced by any AMC contracts
        // or tendor quotations first, and warn about it in the confirmation
        // modal if so — those references are plain text (no foreign key), so
        // they won't be automatically cleaned up or updated by this deletion.
        let warning: string | undefined;
        try {
            const res = await fetch(`/api/vendors/${vendor.id}/usage`);
            if (res.ok) {
                const { amcCount, quotationCount } = await res.json();
                if (amcCount > 0 || quotationCount > 0) {
                    const parts: string[] = [];
                    if (amcCount > 0) parts.push(`${amcCount} AMC contract${amcCount > 1 ? 's' : ''}`);
                    if (quotationCount > 0) parts.push(`${quotationCount} tendor quotation${quotationCount > 1 ? 's' : ''}`);
                    warning = `This vendor is still referenced by ${parts.join(' and ')}. Those references will not be updated automatically.`;
                }
            }
        } catch (err) {
            console.warn('Could not check vendor usage before delete:', err);
        }
        setDeleteConfirm({ id: vendor.id, name: vendor.name, warning });
    };

    const handleConfirmDelete = () => {
        if (!deleteConfirm) return;
        onDeleteVendor(deleteConfirm.id);
        setDeleteConfirm(null);
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Vendor Management</h2>
                    <p className="text-sm text-gray-500">Manage service providers and contracts.</p>
                </div>
                <div className="flex items-center gap-2">
                    {onBulkImportVendors && (
                        <button
                            onClick={() => setIsBulkImportOpen(true)}
                            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" /> Bulk Import
                        </button>
                    )}
                    <button 
                        onClick={() => { setEditingVendor(null); setFormData({ name: '', serviceCategory: 'Plumbing', contactPerson: '', phone: '', email: '' }); setIsModalOpen(true); }}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Vendor
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search vendors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map(vendor => (
                    <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-50 p-2 rounded-lg">
                                    <Briefcase className="w-6 h-6 text-brand-600" />
                                </div>
                                <div className="flex gap-2">
                                     <button onClick={() => handleEdit(vendor)} className="text-gray-400 hover:text-brand-600 p-1"><Edit2 className="w-4 h-4" /></button>
                                     <button onClick={() => handleDeleteClick(vendor)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
                            <p className="text-sm text-gray-500 font-medium mb-4">{vendor.serviceCategory}</p>

                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <UserIcon className="w-4 h-4 text-gray-400" />
                                    <span>{vendor.contactPerson}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>{vendor.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="truncate">{vendor.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-brand-600 p-4 border-b border-brand-700 flex justify-between items-center rounded-t-2xl">
                            <h3 className="font-semibold text-lg text-white">{editingVendor ? 'Update Vendor' : 'Add New Vendor'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-brand-700 p-1 rounded-full transition"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
                                <select 
                                    required 
                                    value={formData.serviceCategory} 
                                    onChange={e => setFormData({...formData, serviceCategory: e.target.value})} 
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    <option value="Plumbing">Plumbing</option>
                                    <option value="Security">Security</option>
                                    <option value="Gardening">Gardening</option>
                                    <option value="AC">AC</option>
                                    <option value="Elevator">Elevator</option>
                                    <option value="Club House">Club House</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                <input required type="text" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition mt-2">
                                {editingVendor ? 'Update Vendor' : 'Add Vendor'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {onBulkImportVendors && (
                <BulkImportModal
                    isOpen={isBulkImportOpen}
                    onClose={() => setIsBulkImportOpen(false)}
                    title="Bulk Import Vendors"
                    templateColumns={['name', 'serviceCategory', 'contactPerson', 'phone', 'email', 'status']}
                    templateSampleRow={['CoolAir Systems', 'AC', 'Rajesh Kumar', '9876543210', 'rajesh@coolair.com', 'Active']}
                    onImport={onBulkImportVendors}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-gray-900">Delete this Vendor?</h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Are you sure you want to remove <strong>{deleteConfirm.name}</strong>? This cannot be undone.
                            </p>
                            {deleteConfirm.warning && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 text-left">
                                    <strong>Warning:</strong> {deleteConfirm.warning}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2 justify-center pt-2">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Lucide icon stub for UserIcon since it clashes with component name
const UserIcon = (props: any) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
)
