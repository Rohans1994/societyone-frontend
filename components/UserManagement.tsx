import React, { useState } from 'react';
import { User, Role } from '../types';
import { Shield, User as UserIcon, CheckCircle, Search, Trash2, Plus, X, Home, Mail, Check, Clock, UserCheck, AlertCircle, Phone, CheckCircle2, ShieldCheck, KeyRound, Upload } from 'lucide-react';
import { WINGS } from '../constants';
import { BulkImportModal, BulkImportSummary } from './BulkImportModal';
import { AuthedImg } from './AuthedImg';

interface UserManagementProps {
  users: User[];
  wings?: string[];
  societyName?: string;
  onUpdateRole: (uid: string, newRole: Role) => void;
  onDeleteUser: (uid: string) => void;
  onAddUser: (user: User) => void;
  onApproveUser?: (uid: string) => void;
  onBulkImportResidents?: (rows: Record<string, string>[]) => Promise<BulkImportSummary>;
}

export const UserManagement: React.FC<UserManagementProps> = ({ 
  users, 
  wings = WINGS, 
  societyName,
  onUpdateRole, 
  onDeleteUser, 
  onAddUser,
  onApproveUser,
  onBulkImportResidents
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  const handleConfirmDeleteUser = () => {
    if (!deleteConfirmUser) return;
    onDeleteUser(deleteConfirmUser.uid);
    setDeleteConfirmUser(null);
  };
  
  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: Role.Resident,
    wing: wings[0] || 'Wing A',
    apartmentNo: ''
  });

  const pendingUsers = users.filter(user => user.adminApproved === false);
  const approvedUsers = users.filter(user => user.adminApproved !== false);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm)) ||
      (user.apartmentNo && user.apartmentNo.includes(searchTerm));
    
    if (!matchesSearch) return false;
    if (statusFilter === 'APPROVED') return user.adminApproved !== false;
    if (statusFilter === 'PENDING') return user.adminApproved === false;
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      uid: `u-${Math.random().toString(36).substring(2, 9)}`,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      wing: newUser.wing,
      apartmentNo: newUser.apartmentNo,
      adminApproved: true, // Created directly by admin
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=random`
    };
    onAddUser(user);
    setIsAddModalOpen(false);
    setNewUser({ name: '', email: '', phone: '', role: Role.Resident, wing: wings[0] || 'Wing A', apartmentNo: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            {pendingUsers.length > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200 animate-pulse">
                {pendingUsers.length} Pending Approval
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Manage residents, review approval requests, assign roles, and maintain accounts for {societyName || 'this society'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onBulkImportResidents && (
            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
            >
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
          )}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {/* Pending Resident Approval Requests Widget */}
      {pendingUsers.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  Pending Resident Approvals
                  <span className="bg-amber-200/80 text-amber-900 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                    {pendingUsers.length}
                  </span>
                </h3>
                <p className="text-xs text-gray-600">
                  These residents have registered and require admin approval before they can log in.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingUsers.map(user => (
              <div 
                key={user.uid} 
                className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-amber-100">
                    {user.avatarUrl ? (
                      <AuthedImg src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 text-gray-400 shrink-0" /> {user.email}
                    </p>
                    {user.phone && (
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" /> {user.phone}
                      </p>
                    )}
                    <p className="text-xs font-medium text-brand-700 mt-1 flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      {user.wing} • Flat {user.apartmentNo || 'N/A'}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      {user.emailVerified !== false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Level 1 Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          <KeyRound className="w-3 h-3 text-amber-600" /> Level 1 Pending OTP
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                  {onApproveUser && (
                    <button
                      onClick={() => onApproveUser(user.uid)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Access
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirmUser(user)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Decline / Remove Request"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Users Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, flat..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'APPROVED' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Approved ({approvedUsers.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-sm font-semibold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending ({pendingUsers.length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Apartment</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                  const isPending = user.adminApproved === false;
                  return (
                    <tr key={user.uid} className={`hover:bg-gray-50/50 ${isPending ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                            {user.avatarUrl ? (
                      <AuthedImg src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 flex items-center gap-1.5">
                              {user.name}
                              {isPending && (
                                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-700 rounded">
                                  Pending
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            {user.phone && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-gray-400" /> {user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {user.wing ? `${user.wing} - ${user.apartmentNo || 'N/A'}` : (user.apartmentNo || 'N/A')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {/* Level 1: Email Verification Status */}
                          <div className="flex items-center gap-1.5">
                            {user.emailVerified !== false ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Level 1: Email Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Level 1: Unverified Email
                              </span>
                            )}
                          </div>

                          {/* Level 2: Admin Approval Status */}
                          <div>
                            {isPending ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" /> Level 2: Pending
                                </span>
                                {onApproveUser && (
                                  <button
                                    onClick={() => onApproveUser(user.uid)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" /> Approve
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                <CheckCircle className="w-3 h-3 text-emerald-600" /> Level 2: Approved
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.role}
                          onChange={(e) => onUpdateRole(user.uid, e.target.value as Role)}
                          className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg focus:ring-brand-500 focus:border-brand-500 p-2 outline-none"
                        >
                          <option value={Role.Resident}>Resident</option>
                          <option value={Role.WingAdmin}>Admin</option>
                          <option value={Role.SuperAdmin}>Super Admin</option>
                          <option value={Role.Vendor}>Vendor</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setDeleteConfirmUser(user)}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-brand-600 p-4 border-b border-brand-700 flex justify-between items-center rounded-t-2xl">
              <h3 className="font-semibold text-lg text-white">Add New User</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/80 hover:bg-brand-700 p-1 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile / Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" placeholder="e.g. 9876543210" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})} className="w-full pl-10 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                    <option value={Role.Resident}>Resident</option>
                    <option value={Role.WingAdmin}>Admin</option>
                    <option value={Role.SuperAdmin}>Super Admin</option>
                    <option value={Role.Vendor}>Vendor</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wing</label>
                  <select value={newUser.wing} onChange={e => setNewUser({...newUser, wing: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
                    {wings.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apartment</label>
                  <input required type="text" value={newUser.apartmentNo} onChange={e => setNewUser({...newUser, apartmentNo: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="101" />
                </div>
              </div>

              <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition mt-2">
                Create User (Auto-Approved)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">Remove this User?</h4>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to remove <strong>{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email}) from {societyName || 'this society'}? Their profile picture (if uploaded) will also be deleted. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {onBulkImportResidents && (
        <BulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          title="Bulk Import Residents"
          description="Leave the password column blank to use the default temporary password 'Abcd@12345' for that resident — they can change it after logging in. Residents are auto-approved and auto-verified since an admin is adding them directly."
          templateColumns={['name', 'email', 'phone', 'wing', 'apartmentNo', 'password']}
          templateSampleRow={['Jane Doe', 'jane.doe@example.com', '9876543210', 'A', '101', '']}
          onImport={onBulkImportResidents}
        />
      )}
    </div>
  );
};
