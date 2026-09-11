import React, { useState } from 'react';
import { Society, User, Role } from '../types';
import { Building2, X, Plus, Trash2, ShieldCheck, CheckCircle2, Copy, Check, ArrowRight, MapPin, Hash, Sparkles, Phone, KeyRound, RefreshCw, AlertCircle } from 'lucide-react';
import { INDIAN_STATES } from '../data/indianStates';

// Only India is supported today — fixed rather than a user-facing field
// since there's nothing to choose, but still sent to the backend so every
// society record has it (see routes/societies.ts).
const DEFAULT_COUNTRY = 'India';

interface CreateSocietyModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Persists the society + admin account (POST /api/societies, POST
  // /api/users) — called once the admin has reviewed the credentials
  // preview and clicked through. Must throw/reject on failure so the modal
  // can show an error instead of proceeding to email verification for an
  // account that doesn't actually exist yet.
  onSocietyCreated: (society: Society, adminUser: User) => Promise<void>;
  // Called only after the admin successfully verifies their email OTP —
  // this is the actual "log the new admin in" step (deferred from the old
  // immediate auto-login, since access shouldn't be granted before the
  // email is confirmed). autoLogin mirrors which footer button was used to
  // get here ("Log In As Admin Now" vs "Go to Login Page").
  onAdminVerified: (adminUser: User, autoLogin: boolean) => void;
}

export const CreateSocietyModal: React.FC<CreateSocietyModalProps> = ({
  isOpen,
  onClose,
  onSocietyCreated,
  onAdminVerified
}) => {
  // Step 1: Form, Step 2: Confirmation / Credentials preview, Step 3: Email
  // OTP verification (only reachable after the account is actually
  // persisted — see handleProceedToVerification).
  const [step, setStep] = useState<'form' | 'success' | 'otp'>('form');

  // Society Basic Info
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  
  // Wings Configuration
  const [wingCount, setWingCount] = useState<number>(3);
  const [wings, setWings] = useState<string[]>(['Wing A', 'Wing B', 'Wing C']);

  // Admin Account Setup
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('Admin@1234');

  // Feedback State
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [createdSociety, setCreatedSociety] = useState<Society | null>(null);
  const [createdAdmin, setCreatedAdmin] = useState<User | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);

  // Email OTP Verification State (mirrors Auth.tsx's resident verification
  // flow — same backend endpoints, same "Level 1" concept, just for the
  // admin account created here instead of a self-registering resident).
  const [pendingAutoLogin, setPendingAutoLogin] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  if (!isOpen) return null;

  // Handle wing count change dynamically
  const handleWingCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setWingCount(validCount);

    const defaultLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newWings = [...wings];
    
    if (validCount > newWings.length) {
      for (let i = newWings.length; i < validCount; i++) {
        const letter = defaultLetters[i] || `${i + 1}`;
        newWings.push(`Wing ${letter}`);
      }
    } else {
      newWings.splice(validCount);
    }
    setWings(newWings);
  };

  // Update specific wing name
  const handleWingNameChange = (index: number, val: string) => {
    const updated = [...wings];
    updated[index] = val;
    setWings(updated);
  };

  // Auto-suggest admin email when society name changes
  const handleSocietyNameChange = (val: string) => {
    setName(val);
    if (!adminEmail || adminEmail.includes('@society.')) {
      const cleanName = val.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanName) {
        setAdminEmail(`admin@${cleanName}.com`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter the Society Name.');
      return;
    }
    if (!address.trim()) {
      setError('Please enter the Society Address.');
      return;
    }
    if (!state.trim()) {
      setError('Please select the Society State.');
      return;
    }
    if (!pincode.trim() || pincode.trim().length < 4) {
      setError('Please enter a valid Pincode.');
      return;
    }
    if (wings.some(w => !w.trim())) {
      setError('Please provide a name for all wings.');
      return;
    }
    if (!adminPhone.trim()) {
      setError('Please enter the Admin Mobile / Phone Number.');
      return;
    }
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setError('Please provide complete admin credentials.');
      return;
    }

    const societyId = `soc-${Date.now().toString(36)}`;
    const adminUid = `admin-${Math.random().toString(36).substring(2, 9)}`;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const newSociety: Society = {
      id: societyId,
      name: name.trim(),
      address: address.trim(),
      city: city.trim() || 'Metro Area',
      state: state.trim(),
      country: DEFAULT_COUNTRY,
      pincode: pincode.trim(),
      wings: wings.map(w => w.trim()),
      adminEmail: adminEmail.trim(),
      adminName: adminName.trim() || `${name.trim()} Admin`,
      adminPhone: adminPhone.trim(),
      phone: adminPhone.trim(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    const newAdminUser: User = {
      uid: adminUid,
      name: adminName.trim() || `${name.trim()} Admin`,
      email: adminEmail.trim(),
      phone: adminPhone.trim(),
      password: adminPassword.trim(),
      role: Role.SuperAdmin,
      societyId: societyId,
      societyName: newSociety.name,
      wing: wings[0] || 'Wing A',
      apartmentNo: 'Office-101',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName.trim() || name.trim())}&background=4f46e5&color=fff`,
      // adminApproved is deliberately left unset — the backend defaults it
      // to true for non-Resident roles, same as before. Only email
      // verification is being gated now, not approval status.
      emailVerified: false,
      verificationToken: generatedOtp
    };

    setCreatedSociety(newSociety);
    setCreatedAdmin(newAdminUser);
    setStep('success');
  };

  const handleCopyCredentials = () => {
    if (!createdAdmin) return;
    const text = `Society: ${createdSociety?.name}\nAdmin Login: ${createdAdmin.email}\nPhone: ${createdAdmin.phone || createdSociety?.adminPhone || ''}\nPassword: ${createdAdmin.password}\nPincode: ${createdSociety?.pincode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleProceedToVerification = async (autoLogin: boolean) => {
    if (!createdSociety || !createdAdmin) return;
    setError('');
    setIsPersisting(true);
    try {
      await onSocietyCreated(createdSociety, createdAdmin);
      setPendingAutoLogin(autoLogin);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to create the society. Please try again.');
    } finally {
      setIsPersisting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdAdmin) return;
    setOtpError('');
    setOtpSuccess('');

    if (!otpCode.trim()) {
      setOtpError('Please enter the 6-digit confirmation code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/users/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: createdAdmin.uid, email: createdAdmin.email, token: otpCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Verification failed. Please try again.');
        return;
      }
      onAdminVerified({ ...createdAdmin, emailVerified: true }, pendingAutoLogin);
      handleReset();
      onClose();
    } catch (err: any) {
      setOtpError(err.message || 'Network error while verifying email.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!createdAdmin) return;
    setIsResendingOtp(true);
    setOtpError('');
    try {
      const res = await fetch('/api/users/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: createdAdmin.uid, email: createdAdmin.email })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSuccess(`New 6-digit verification code dispatched to ${createdAdmin.email}`);
        setTimeout(() => setOtpSuccess(''), 4000);
      } else {
        setOtpError(data.error || 'Failed to resend code.');
      }
    } catch (err: any) {
      setOtpError('Error resending verification code.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleReset = () => {
    setStep('form');
    setName('');
    setAddress('');
    setCity('');
    setState('');
    setPincode('');
    setWingCount(3);
    setWings(['Wing A', 'Wing B', 'Wing C']);
    setAdminName('');
    setAdminPhone('');
    setAdminEmail('');
    setAdminPassword('Admin@1234');
    setError('');
    setCreatedSociety(null);
    setCreatedAdmin(null);
    setPendingAutoLogin(false);
    setOtpCode('');
    setOtpError('');
    setOtpSuccess('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-brand-50/50 via-white to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {step === 'form' && 'Register New Housing Society'}
                {step === 'success' && 'Society Registered Successfully!'}
                {step === 'otp' && 'Verify Admin Email'}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {step === 'form' && 'Configure society details, wings, and unique administrator credentials'}
                {step === 'success' && 'Your society workspace and admin access are live'}
                {step === 'otp' && 'One last step before you can sign in'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { handleReset(); onClose(); }}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {step === 'form' ? (
            <form id="create-society-form" onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3.5 rounded-xl border border-red-200 font-medium animate-in fade-in">
                  {error}
                </div>
              )}

              {/* Section 1: Society Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg w-fit">
                  <Building2 className="w-3.5 h-3.5" /> Society Details
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Society Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Green Valley Residency, Palm Heights"
                    value={name}
                    onChange={(e) => handleSocietyNameChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-transparent outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Address / Street <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Plot / Street / Landmark"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-transparent outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="400076"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-transparent outline-none transition font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      City / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai, Pune, Bengaluru"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-transparent outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-transparent outline-none transition"
                    >
                      <option value="" disabled>Select a state...</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Wings Setup */}
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    <Building2 className="w-3.5 h-3.5" /> Wings & Towers Configuration
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Number of Wings:</span>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => handleWingCountChange(wingCount - 1)}
                        disabled={wingCount <= 1}
                        className="w-7 h-7 flex items-center justify-center rounded bg-white text-gray-700 hover:bg-gray-200 disabled:opacity-40 font-bold transition text-sm"
                      >
                        -
                      </button>
                      <span className="w-9 text-center font-bold text-gray-900 text-sm">
                        {wingCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleWingCountChange(wingCount + 1)}
                        disabled={wingCount >= 20}
                        className="w-7 h-7 flex items-center justify-center rounded bg-white text-gray-700 hover:bg-gray-200 disabled:opacity-40 font-bold transition text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Specify the name or letter for each wing (e.g. Wing A, Tower 1, Block East):
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {wings.map((wingName, idx) => (
                    <div key={idx} className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-500">
                        Wing #{idx + 1}
                      </label>
                      <input
                        type="text"
                        required
                        value={wingName}
                        onChange={(e) => handleWingNameChange(idx, e.target.value)}
                        placeholder={`Wing ${idx + 1}`}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Admin Credentials */}
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg w-fit">
                  <ShieldCheck className="w-3.5 h-3.5" /> Society Admin Account
                </div>

                <p className="text-xs text-gray-500">
                  This unique admin account will have full access to manage this society, vendors, AMCs, tenders, and residents.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Admin Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Sharma (Secretary)"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-transparent outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Admin Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-transparent outline-none transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Admin Email / Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@yoursociety.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-transparent outline-none transition font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Admin Password <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white focus:border-transparent outline-none transition font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const rand = `Sec#${Math.floor(1000 + Math.random() * 9000)}!`;
                          setAdminPassword(rand);
                        }}
                        className="px-3 py-2 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl whitespace-nowrap transition"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          ) : step === 'success' ? (
            /* Success Confirmation View */
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {createdSociety?.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Society registered with {createdSociety?.wings.length} wings: {createdSociety?.wings.join(', ')}
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-mono text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {createdSociety?.address}, {createdSociety?.city} - {createdSociety?.pincode}
                </div>
              </div>

              {/* Credentials Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <ShieldCheck className="w-28 h-28 text-white" />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Unique Administrator Credentials
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3 font-mono text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs text-gray-400">Society Name:</span>
                    <span className="font-semibold text-white">{createdSociety?.name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs text-gray-400">Admin Email:</span>
                    <span className="font-semibold text-brand-300">{createdAdmin?.email}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs text-gray-400">Admin Mobile:</span>
                    <span className="font-semibold text-sky-300">{createdAdmin?.phone || createdSociety?.adminPhone || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs text-gray-400">Password:</span>
                    <span className="font-semibold text-emerald-300">{createdAdmin?.password}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <span className="text-xs text-gray-400">Pincode:</span>
                    <span className="text-gray-300">{createdSociety?.pincode}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Please store these credentials safely. Residents will use the society name <strong>"{createdSociety?.name}"</strong> and pincode <strong>{createdSociety?.pincode}</strong> when signing up.
                </span>
              </div>
            </div>
          ) : (
            /* Email OTP Verification View — same "Level 1" concept and
               backend endpoints as the resident signup flow in Auth.tsx */
            <div className="space-y-5 animate-in zoom-in-95 duration-200">
              <div className="text-center">
                <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600">
                  <KeyRound className="w-7 h-7" />
                </div>
                <p className="text-sm text-gray-600 max-w-sm mx-auto">
                  We sent a 6-digit confirmation code to <span className="font-semibold text-gray-900">{createdAdmin?.email}</span>
                </p>
              </div>

              {otpSuccess && (
                <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="font-medium">{otpSuccess}</p>
                </div>
              )}
              {otpError && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="font-medium">{otpError}</p>
                </div>
              )}

              <form id="otp-verification-form" onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    6-Digit OTP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 123456"
                    className="w-full text-center tracking-[0.5em] font-mono text-xl py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp}
                  className="text-brand-600 hover:text-brand-800 text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                  {isResendingOtp ? 'Resending...' : 'Resend Code'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-3">
          {step === 'form' ? (
            <>
              <button
                type="button"
                onClick={() => { handleReset(); onClose(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-society-form"
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-200 transition active:scale-[0.98] flex items-center gap-2"
              >
                Create Society & Generate Admin <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : step === 'success' ? (
            <>
              {error && <p className="text-xs text-red-600 mr-auto self-center">{error}</p>}
              <button
                type="button"
                disabled={isPersisting}
                onClick={() => handleProceedToVerification(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
              >
                Go to Login Page
              </button>
              <button
                type="button"
                disabled={isPersisting}
                onClick={() => handleProceedToVerification(true)}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-200 transition active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
              >
                {isPersisting ? 'Creating...' : 'Log In As Admin Now'} <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { handleReset(); onClose(); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="otp-verification-form"
                disabled={isVerifyingOtp}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-200 transition active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" /> {isVerifyingOtp ? 'Verifying...' : 'Verify Email & Continue'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
