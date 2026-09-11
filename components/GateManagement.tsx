import React, { useMemo, useRef, useState } from 'react';
import { Role, User, VisitorRequest } from '../types';
import {
  DoorOpen, Plus, X, Search, Camera, Upload, Clock, CheckCircle2, XCircle,
  Phone, User as UserIcon, Home, CalendarDays, ShieldPlus, Trash2, Mail
} from 'lucide-react';
import { AuthedImg } from './AuthedImg';

// Same convention already used elsewhere in this app (e.g. NoticeModal's
// default date field) — a plain YYYY-MM-DD split of the ISO string, rather
// than a timezone-aware local-date conversion.
const toDateString = (isoOrDate: string | Date) => new Date(isoOrDate).toISOString().split('T')[0];
const todayDateString = () => toDateString(new Date());

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const PURPOSES = ['Guest', 'Delivery', 'Cab / Taxi', 'Service / Repair', 'Other'];

interface GateManagementProps {
  visitorRequests: VisitorRequest[];
  residents: User[];
  storageBucket?: string;
  societyId?: string;
  onCreateRequest: (request: Omit<VisitorRequest, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  // "Manage Guards" is admin-only — omitted entirely (including the button)
  // when rendered for a logged-in Guard themselves, who can log visitors
  // here but can't create/remove other guard accounts.
  canManageGuards?: boolean;
  onAddUser?: (user: User) => void;
  onDeleteUser?: (uid: string) => void;
}

// Gate/visitor logging screen — used by both admins (SuperAdmin/WingAdmin)
// and the dedicated Guard role. This society allows only one registered
// owner per flat, so picking a resident is equivalent to picking "this
// flat". Live-updates via the socket connection wired in App.tsx — no
// polling/refresh needed to see a resident's response.
export const GateManagement: React.FC<GateManagementProps> = ({
  visitorRequests,
  residents,
  storageBucket,
  societyId,
  onCreateRequest,
  canManageGuards,
  onAddUser,
  onDeleteUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [residentSearch, setResidentSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState<User | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  // Held locally (not uploaded) until the request is actually submitted —
  // uploading on file-select would leave an orphaned file in storage if the
  // guard picks a photo and then cancels without submitting.
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState(todayDateString());

  // --- Manage Guards (admin-only) ---
  const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
  const [guardName, setGuardName] = useState('');
  const [guardEmail, setGuardEmail] = useState('');
  const [guardPhone, setGuardPhone] = useState('');
  const [guardFormError, setGuardFormError] = useState('');
  const [deleteGuardConfirm, setDeleteGuardConfirm] = useState<{ uid: string; name: string } | null>(null);

  const guards = useMemo(() => residents.filter(r => r.role === Role.Guard), [residents]);

  const resetGuardForm = () => {
    setGuardName('');
    setGuardEmail('');
    setGuardPhone('');
    setGuardFormError('');
  };

  const handleAddGuardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim() || !guardEmail.trim()) {
      setGuardFormError('Name and email are required.');
      return;
    }
    if (!onAddUser) return;
    const guard: User = {
      uid: `guard-${Math.random().toString(36).substring(2, 9)}`,
      name: guardName.trim(),
      email: guardEmail.trim(),
      phone: guardPhone.trim(),
      role: Role.Guard,
      adminApproved: true,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(guardName.trim())}&background=random`
    };
    onAddUser(guard);
    resetGuardForm();
  };

  const handleConfirmDeleteGuard = () => {
    if (!deleteGuardConfirm || !onDeleteUser) return;
    onDeleteUser(deleteGuardConfirm.uid);
    setDeleteGuardConfirm(null);
  };

  const residentOptions = useMemo(() => {
    const q = residentSearch.trim().toLowerCase();
    const owners = residents.filter(r => r.role === Role.Resident);
    if (!q) return owners.slice(0, 8);
    return owners.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.wing && r.wing.toLowerCase().includes(q)) ||
      (r.apartmentNo && r.apartmentNo.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [residents, residentSearch]);

  const visitorsForSelectedDate = useMemo(
    () => visitorRequests
      .filter(v => toDateString(v.createdAt) === selectedDate)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [visitorRequests, selectedDate]
  );
  const pendingCount = useMemo(
    () => visitorsForSelectedDate.filter(v => v.status === 'Pending').length,
    [visitorsForSelectedDate]
  );

  const resetForm = () => {
    setResidentSearch('');
    setSelectedResident(null);
    setVisitorName('');
    setVisitorPhone('');
    setPurpose(PURPOSES[0]);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl('');
    setPhotoError('');
    setFormError('');
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Just holds the file + a local preview — nothing is uploaded yet. The
  // actual upload only happens in handleSubmit, once the guard actually
  // sends the request.
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const base64Data = await convertToBase64(file);
    const filename = `${Date.now()}_${file.name}`;
    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Society's dedicated bucket if available (falls back to the
        // legacy shared 'assets' bucket), always under a visitors/ folder.
        bucket: storageBucket || 'assets',
        filename: `visitors/${filename}`,
        contentBase64: base64Data,
        mimeType: file.type || 'image/jpeg'
      })
    });
    if (!uploadRes.ok) {
      throw new Error('Failed to upload photo.');
    }
    const result = await uploadRes.json();
    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResident) {
      setFormError('Please select which resident this visitor is here to see.');
      return;
    }
    if (!visitorName.trim()) {
      setFormError('Please enter the visitor\'s name.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setPhotoError('');
    try {
      let photoUrl = '';
      if (photoFile) {
        try {
          photoUrl = await uploadPhoto(photoFile);
        } catch (err: any) {
          setPhotoError(err.message || 'Failed to upload photo.');
          setIsSubmitting(false);
          return;
        }
      }

      await onCreateRequest({
        societyId,
        residentUid: selectedResident.uid,
        residentName: selectedResident.name,
        wing: selectedResident.wing,
        apartmentNo: selectedResident.apartmentNo,
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim(),
        purpose,
        photoUrl
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create visitor request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRequestCard = (request: VisitorRequest) => (
    <div key={request.id} className="bg-white rounded-xl border border-gray-200 shadow-2xs p-4 flex items-start gap-3">
      {request.photoUrl ? (
        <AuthedImg src={request.photoUrl} alt={request.visitorName} className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
          <UserIcon className="w-6 h-6" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-gray-900 text-sm truncate">{request.visitorName}</p>
          {request.status === 'Pending' && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" /> Waiting
            </span>
          )}
          {request.status === 'Approved' && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Approved
            </span>
          )}
          {request.status === 'Denied' && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-800 rounded-full flex items-center gap-1 shrink-0">
              <XCircle className="w-3 h-3" /> Denied
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
          <Home className="w-3 h-3 text-gray-400" /> To: {request.residentName} ({request.wing} {request.apartmentNo})
        </p>
        {request.visitorPhone && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-gray-400" /> {request.visitorPhone}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
            {request.purpose || 'Guest'}
          </span>
          <span className="text-[11px] text-gray-400">
            {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );

  const isToday = selectedDate === todayDateString();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-brand-600" /> Gate Management
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Log a visitor at the gate and send the resident a real-time approval request.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canManageGuards && (
            <button
              onClick={() => { resetGuardForm(); setIsGuardModalOpen(true); }}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <ShieldPlus className="w-4 h-4" /> Manage Guards
            </button>
          )}
          <button
            onClick={handleOpenModal}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Visitor
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            Visitors
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">{visitorsForSelectedDate.length}</span>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" /> {pendingCount} waiting
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={todayDateString()}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            {!isToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayDateString())}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {visitorsForSelectedDate.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visitorsForSelectedDate.map(renderRequestCard)}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 border border-dashed border-gray-200 text-center text-sm text-gray-500">
            {isToday ? 'No visitors logged yet today.' : 'No visitors logged on this date.'}
          </div>
        )}
      </div>

      {/* New Visitor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-brand-600 p-4 flex justify-between items-center text-white sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <DoorOpen className="w-5 h-5" /> New Visitor Entry
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white hover:bg-brand-700 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">{formError}</div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Visiting Which Resident? *</label>
                {selectedResident ? (
                  <div className="flex items-center justify-between p-2.5 border border-brand-300 bg-brand-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedResident.name}</p>
                      <p className="text-xs text-gray-500">{selectedResident.wing} {selectedResident.apartmentNo}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedResident(null)} className="text-xs font-semibold text-brand-600 hover:underline">
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, wing, or flat number..."
                      value={residentSearch}
                      onChange={(e) => setResidentSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                    {residentSearch && (
                      <div className="mt-1.5 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                        {residentOptions.length > 0 ? residentOptions.map(r => (
                          <button
                            type="button"
                            key={r.uid}
                            onClick={() => { setSelectedResident(r); setResidentSearch(''); }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            <span className="font-semibold text-gray-900">{r.name}</span>
                            <span className="text-gray-500"> — {r.wing} {r.apartmentNo}</span>
                          </button>
                        )) : (
                          <p className="px-3 py-2 text-xs text-gray-400">No matching resident.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Visitor Name *</label>
                <input
                  type="text"
                  required
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Purpose</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> Photo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {photoPreviewUrl && (
                    <img src={photoPreviewUrl} alt="Visitor" className="w-14 h-14 rounded-lg border border-gray-200 object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {photoFile ? 'Replace Photo' : 'Capture / Upload Photo'}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
                {photoError && <p className="text-[11px] text-red-600 mt-1">{photoError}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send Approval Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Guards Modal (admin-only) */}
      {canManageGuards && isGuardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-brand-600 p-4 flex justify-between items-center text-white sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShieldPlus className="w-5 h-5" /> Manage Guards
              </h3>
              <button onClick={() => setIsGuardModalOpen(false)} className="text-white hover:bg-brand-700 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Existing Guards ({guards.length})</h4>
                {guards.length > 0 ? (
                  <div className="space-y-2">
                    {guards.map(guard => (
                      <div key={guard.uid} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{guard.name}</p>
                          <p className="text-xs text-gray-500 truncate">{guard.email}{guard.phone ? ` • ${guard.phone}` : ''}</p>
                        </div>
                        {onDeleteUser && (
                          <button
                            type="button"
                            onClick={() => setDeleteGuardConfirm({ uid: guard.uid, name: guard.name })}
                            className="text-gray-400 hover:text-red-600 p-1.5 shrink-0"
                            title="Remove Guard"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No guard accounts yet.</p>
                )}
              </div>

              <form onSubmit={handleAddGuardSubmit} className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Add New Guard</h4>
                {guardFormError && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">{guardFormError}</div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={guardName}
                    onChange={(e) => setGuardName(e.target.value)}
                    placeholder="e.g. Ramesh Yadav"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={guardEmail}
                    onChange={(e) => setGuardEmail(e.target.value)}
                    placeholder="guard@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={guardPhone}
                    onChange={(e) => setGuardPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
                >
                  Add Guard
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Guard Confirmation Modal */}
      {deleteGuardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">Remove this Guard?</h4>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to remove <strong>{deleteGuardConfirm.name}</strong>'s access? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteGuardConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGuard}
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
