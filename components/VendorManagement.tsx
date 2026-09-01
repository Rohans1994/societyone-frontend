import React, { useState } from 'react';
import { Vendor } from '../types';
import { Search, Plus, Trash2, Edit2, Phone, Mail, Briefcase, X } from 'lucide-react';

interface VendorManagementProps {
    vendors: Vendor[];
    onAddVendor: (vendor: Vendor) => void;
    onUpdateVendor: (vendor: Vendor) => void;
    onDeleteVendor: (id: string) => void;
}

export const VendorManagement: React.FC<VendorManagementProps> = ({ vendors, onAddVendor, onUpdateVendor, onDeleteVendor }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

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

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to remove this vendor?')) {
            onDeleteVendor(id);
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Vendor Management</h2>
                    <p className="text-sm text-gray-500">Manage service providers and contracts.</p>
                </div>
                <button 
                    onClick={() => { setEditingVendor(null); setFormData({ name: '', serviceCategory: 'Plumbing', contactPerson: '', phone: '', email: '' }); setIsModalOpen(true); }}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Vendor
                </button>
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
                                     <button onClick={() => handleDelete(vendor.id)} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
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
