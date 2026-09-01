import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Role, User, Society } from '../types';
import { Building2, Mail, Lock, User as UserIcon, Home, ArrowRight, Search, ChevronDown, Check, Sparkles, MapPin, Hash, Plus, AlertCircle, CheckCircle2, Phone, ShieldCheck, KeyRound, RefreshCw, Send } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../context/LanguageContext';


interface AuthProps {
  onLogin: (user: User) => void;
  users: User[];
  societies: Society[];
  onRegister: (newUser: User) => void;
  onCreateSocietyClick?: () => void;
  initialSocietyId?: string;
  onBackToLanding?: () => void;
}

export const Auth: React.FC<AuthProps> = ({
  onLogin,
  users,
  societies,
  onRegister,
  onCreateSocietyClick,
  initialSocietyId,
  onBackToLanding
}) => {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Selected Society State
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>(
    initialSocietyId || societies[0]?.id || ''
  );
  const [societySearchQuery, setSocietySearchQuery] = useState('');
  const [isSocietyDropdownOpen, setIsSocietyDropdownOpen] = useState(false);
  const [pincodeFilter, setPincodeFilter] = useState('');

  // Level 1: Email Verification Modal / Screen State
  const [verifyingEmailUser, setVerifyingEmailUser] = useState<{ email: string; uid: string; name: string } | null>(null);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync initial society ID
  useEffect(() => {
    if (initialSocietyId) {
      setSelectedSocietyId(initialSocietyId);
    } else if (!selectedSocietyId && societies.length > 0) {
      setSelectedSocietyId(societies[0].id);
    }
  }, [initialSocietyId, societies]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSocietyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSociety = useMemo(() => {
    return societies.find(s => s.id === selectedSocietyId) || societies[0];
  }, [societies, selectedSocietyId]);

  // Sync pincode filter with active society
  useEffect(() => {
    if (activeSociety) {
      setPincodeFilter(activeSociety.pincode);
    }
  }, [activeSociety]);

  // Filtered Societies for dropdown (matches society name, address, city, or pincode without restricting by default)
  const filteredSocieties = useMemo(() => {
    if (!societySearchQuery.trim()) {
      return societies;
    }
    const q = societySearchQuery.toLowerCase().trim();
    return societies.filter(s => {
      return (
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.pincode.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q))
      );
    });
  }, [societies, societySearchQuery]);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wing, setWing] = useState('');
  const [apartment, setApartment] = useState('');

  // Set default wing when activeSociety changes
  useEffect(() => {
    if (activeSociety && activeSociety.wings && activeSociety.wings.length > 0) {
      setWing(activeSociety.wings[0]);
    }
  }, [activeSociety]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!activeSociety) {
      setError('Please select a valid Housing Society.');
      return;
    }

    if (isLogin) {
      if (!email.trim() || !password.trim()) {
        setError('Please enter both Email/Username and Password.');
        return;
      }

      // Check user in database
      // 1. First priority: match email + password + societyId
      const matchingUser = users.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase() && 
             u.password === password &&
             (!u.societyId || u.societyId === activeSociety.id)
      );

      if (matchingUser) {
        // Level 1 Check: Email Verification
        if (matchingUser.emailVerified === false) {
          setError('Email verification required. Please verify your email with the 6-digit code sent to your inbox.');
          setVerifyingEmailUser({
            email: matchingUser.email,
            uid: matchingUser.uid,
            name: matchingUser.name
          });
          return;
        }

        // Level 2 Check: Admin Approval
        if (matchingUser.adminApproved === false) {
          setError('Level 1 (Email) verified! However, your account is still pending Level 2 (Admin Approval). Please wait for the society admin to approve your flat allocation.');
          return;
        }

        // Ensure user has society info attached
        const finalUser: User = {
          ...matchingUser,
          societyId: matchingUser.societyId || activeSociety.id,
          societyName: matchingUser.societyName || activeSociety.name
        };
        onLogin(finalUser);
      } else {
        // Check if user exists under another society
        const userInAnotherSociety = users.find(
          u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
        );
        if (userInAnotherSociety && userInAnotherSociety.societyId !== activeSociety.id) {
          setError(`This account belongs to another society (${userInAnotherSociety.societyName || 'different society'}). Please select that society to login.`);
        } else {
          setError('Invalid credentials. Check email, password, or selected society.');
        }
      }
    } else {
      // Basic validation for resident signup
      if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !apartment.trim()) {
        setError('All fields including mobile number are required.');
        return;
      }

      // Check if email already registered for this society in Supabase database
      try {
        const checkRes = await fetch(
          `/api/users/check?societyId=${encodeURIComponent(activeSociety.id)}&email=${encodeURIComponent(email.trim())}`
        );
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.exists) {
            setError(`This email address is already registered with ${activeSociety?.name || 'this society'}. Please switch to Sign In.`);
            return;
          }
        }
      } catch (err) {
        console.error('Error verifying email in Supabase database:', err);
      }

      // Fallback check against in-memory list for this society
      const existingInSociety = users.find(
        u => u.email.toLowerCase() === email.trim().toLowerCase() &&
             (!u.societyId || u.societyId === activeSociety.id)
      );
      if (existingInSociety) {
        setError(`This email address is already registered with ${activeSociety?.name || 'this society'}. Please switch to Sign In.`);
        return;
      }

      const selectedWing = wing.trim() || (activeSociety.wings && activeSociety.wings[0]) || 'Wing A';
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      const newUser: User = {
        uid: `res-${Math.random().toString(36).substring(2, 9)}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        wing: selectedWing,
        apartmentNo: apartment.trim(),
        role: Role.Resident,
        societyId: activeSociety.id,
        societyName: activeSociety.name,
        adminApproved: false, // Level 2: Pending admin approval
        emailVerified: false, // Level 1: Pending Supabase email OTP verification
        verificationToken: generatedOtp,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=6366f1&color=fff`
      };

      onRegister(newUser);
      
      // Open Level 1 Email Verification OTP prompt
      setVerifyingEmailUser({
        email: newUser.email,
        uid: newUser.uid,
        name: newUser.name
      });
      setSuccessMessage('Registration created! Please check your email for the 6-digit confirmation code.');
      
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setApartment('');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingEmailUser) return;
    setVerificationError('');
    setVerificationSuccess('');

    if (!verificationOtp.trim()) {
      setVerificationError('Please enter the 6-digit confirmation code.');
      return;
    }

    try {
      const res = await fetch('/api/users/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: verifyingEmailUser.uid,
          email: verifyingEmailUser.email,
          token: verificationOtp.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setVerificationError(data.error || 'Verification failed. Please try again.');
        return;
      }

      setVerificationSuccess('Level 1 (Email Verification) Complete! Your account has now been sent for Level 2 (Admin Approval).');
      
      // Update local users array with verified flag
      const target = users.find(u => u.uid === verifyingEmailUser.uid || u.email.toLowerCase() === verifyingEmailUser.email.toLowerCase());
      if (target) {
        target.emailVerified = true;
      }

      setTimeout(() => {
        setVerifyingEmailUser(null);
        setVerificationOtp('');
        setVerificationSuccess('');
        setIsLogin(true);
        setSuccessMessage('Email verified successfully! You can log in once the society admin approves your account.');
      }, 2500);

    } catch (err: any) {
      setVerificationError(err.message || 'Network error while verifying email.');
    }
  };

  const handleResendOtp = async () => {
    if (!verifyingEmailUser) return;
    setIsResendingOtp(true);
    setVerificationError('');
    try {
      const res = await fetch('/api/users/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: verifyingEmailUser.uid,
          email: verifyingEmailUser.email
        })
      });
      const data = await res.json();
      if (res.ok) {
        setVerificationSuccess(`New 6-digit verification code dispatched to ${verifyingEmailUser.email}`);
        setTimeout(() => setVerificationSuccess(''), 4000);
      } else {
        setVerificationError(data.error || 'Failed to resend code.');
      }
    } catch (err: any) {
      setVerificationError('Error resending verification code.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleSelectDemo = (type: 'super' | 'admin' | 'resident') => {
    setError('');
    setIsLogin(true);

    if (type === 'super') {
      const soc = societies.find(s => s.id === 'soc-1') || societies[0];
      if (soc) {
        setSelectedSocietyId(soc.id);
        setPincodeFilter(soc.pincode);
      }
      setEmail('super@society.com');
      setPassword('password123');
    } else if (type === 'admin') {
      const soc = societies.find(s => s.id === 'soc-1') || societies[0];
      if (soc) {
        setSelectedSocietyId(soc.id);
        setPincodeFilter(soc.pincode);
      }
      setEmail('admin@society.com');
      setPassword('password123');
    } else {
      const soc = societies.find(s => s.id === 'soc-1') || societies[0];
      if (soc) {
        setSelectedSocietyId(soc.id);
        setPincodeFilter(soc.pincode);
      }
      setEmail('resident@society.com');
      setPassword('password123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-visible relative flex flex-col border border-gray-100 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-6 sm:p-8 text-center text-white relative rounded-t-2xl">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="absolute left-4 top-4 text-xs text-white/70 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center gap-1 cursor-pointer"
            >
              {t('backToLanding', '← Landing')}
            </button>
          )}

          <div className="absolute right-4 top-4 z-20">
            <LanguageSelector />
          </div>

          <div className="w-14 h-14 bg-brand-600/30 border border-brand-400/40 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <Building2 className="w-7 h-7 text-brand-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SocietyOne</h1>
          <p className="text-brand-200 text-xs sm:text-sm mt-1 font-medium">
            {t('smartPortalSubtitle', 'Smart Housing Society Portal & Resident Management')}
          </p>

          {/* 2-Tier Security Badge */}
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-0.5 rounded-full bg-brand-500/20 border border-brand-400/30 text-[10px] text-brand-200 font-semibold">
            <ShieldCheck className="w-3 h-3 text-brand-300" />
            <span>2-Tier Verification: Level 1 Email OTP + Level 2 Admin Approval</span>
          </div>

          {/* Active Society Badge if chosen */}
          {activeSociety && (
            <div className="block mt-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-brand-100 font-medium">
                <MapPin className="w-3 h-3 text-brand-300" />
                <span>{activeSociety.name}</span>
                <span className="text-white/60 font-mono">({activeSociety.pincode})</span>
              </div>
            </div>
          )}
        </div>

        {/* Level 1 Email Verification Modal / In-line View */}
        {verifyingEmailUser ? (
          <div className="p-6 sm:p-8 flex-1 bg-white rounded-b-2xl animate-in fade-in slide-in-from-bottom-2">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Level 1: Email Verification</h2>
              <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
                We sent a 6-digit confirmation code to <span className="font-semibold text-gray-900">{verifyingEmailUser.email}</span>
              </p>
            </div>

            {verificationSuccess && (
              <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-200 flex items-start gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="font-medium">{verificationSuccess}</p>
              </div>
            )}

            {verificationError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200 flex items-start gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="font-medium">{verificationError}</p>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  6-Digit OTP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationOtp}
                  onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full text-center tracking-[0.5em] font-mono text-xl py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp}
                  className="text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                  {isResendingOtp ? 'Resending...' : 'Resend Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerifyingEmailUser(null);
                    setVerificationOtp('');
                    setError('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel / Back
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-200 active:scale-[0.98] flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> Verify Email & Proceed
              </button>
            </form>
          </div>
        ) : (
          /* Tab Switcher & Main Form */
          <div className="p-6 sm:p-8 flex-1 bg-white rounded-b-2xl">
            <div className="mb-6 flex justify-center">
              <div className="bg-gray-100 p-1 rounded-xl inline-flex border border-gray-200 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); setSuccessMessage(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isLogin 
                      ? 'bg-white text-brand-700 shadow-sm border border-gray-200/80 font-bold' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {t('signIn', 'Sign In')}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); setSuccessMessage(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    !isLogin 
                      ? 'bg-white text-brand-700 shadow-sm border border-gray-200/80 font-bold' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {t('residentSignUp', 'Resident Sign Up')}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {successMessage && (
                <div className="bg-emerald-50 text-emerald-800 text-xs sm:text-sm p-3.5 rounded-xl border border-emerald-200 flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-900">{t('registrationSubmitted', 'Registration Submitted')}</p>
                    <p className="text-emerald-700 text-xs mt-0.5">{successMessage}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-700 text-xs sm:text-sm p-3.5 rounded-xl border border-red-200 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">{t('accessRestricted', 'Access Restricted')}</p>
                    <p className="text-red-700 text-xs mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Society Searchable Selector & Pincode */}
              <div className="space-y-1.5" ref={dropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    {t('selectSociety', 'Select Society')} <span className="text-red-500">*</span>
                  </label>
                  {onCreateSocietyClick && (
                    <button
                      type="button"
                      onClick={onCreateSocietyClick}
                      className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> {t('newSocietyQ', 'New Society?')}
                    </button>
                  )}
                </div>

                {/* Custom Searchable Combobox */}
                <div className="relative">
                  <div 
                    onClick={() => setIsSocietyDropdownOpen(!isSocietyDropdownOpen)}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-xl text-sm cursor-pointer flex items-center justify-between transition focus:ring-2 focus:ring-brand-500"
                  >
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-600" />
                    <div className="truncate pr-2">
                      <span className="font-semibold text-gray-900">
                        {activeSociety?.name || t('chooseSocietyPlaceholder', 'Choose a society...')}
                      </span>
                      {activeSociety && (
                        <span className="text-xs text-gray-500 ml-1.5 hidden sm:inline">
                          • {activeSociety.city} ({activeSociety.pincode})
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSocietyDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Dropdown Menu */}
                  {isSocietyDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 p-2.5 space-y-2.5 animate-in fade-in slide-in-from-top-1 max-h-72 overflow-y-auto">
                      {/* Search Input inside Dropdown */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder={t('searchSocietyPlaceholder', 'Search name, city or pincode...')}
                          value={societySearchQuery}
                          onChange={(e) => setSocietySearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 transition"
                          autoFocus
                        />
                        {societySearchQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSocietySearchQuery('');
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold p-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between px-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span>{t('availableSocieties', 'Available Societies')} ({filteredSocieties.length})</span>
                        {filteredSocieties.length !== societies.length && (
                          <span className="text-brand-600">{t('filter', 'Filtered')}</span>
                        )}
                      </div>

                      <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto pr-0.5 space-y-1">
                        {filteredSocieties.length > 0 ? (
                          filteredSocieties.map((soc) => (
                            <div
                              key={soc.id}
                              onClick={() => {
                                setSelectedSocietyId(soc.id);
                                setPincodeFilter(soc.pincode);
                                setIsSocietyDropdownOpen(false);
                                setSocietySearchQuery('');
                              }}
                              className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition ${
                                soc.id === selectedSocietyId 
                                  ? 'bg-brand-50 border border-brand-200 text-brand-900 font-semibold' 
                                  : 'hover:bg-gray-50 border border-transparent text-gray-700'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">{soc.name}</p>
                                  {soc.id.startsWith('soc-') && soc.id !== 'soc-1' && soc.id !== 'soc-2' && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded">
                                      Created
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                  {soc.address}, {soc.city} • <span className="font-mono font-semibold text-gray-700">{soc.pincode}</span>
                                </p>
                                {soc.wings && soc.wings.length > 0 && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {soc.wings.length} {t('availableWings', 'wings')}: {soc.wings.join(', ')}
                                  </p>
                                )}
                              </div>
                              {soc.id === selectedSocietyId && (
                                <Check className="w-4 h-4 text-brand-600 shrink-0" />
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-gray-400">
                            No matching society found for "{societySearchQuery}".
                          </div>
                        )}
                      </div>

                      {onCreateSocietyClick && (
                        <div className="pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => {
                              setIsSocietyDropdownOpen(false);
                              onCreateSocietyClick();
                            }}
                            className="w-full py-2 px-3 text-xs text-center font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> {t('registerNewSociety', 'Register a New Housing Society')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Pincode Info / Confirmation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    {t('societyPincode', 'Society Pincode')}
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={activeSociety?.pincode || pincodeFilter}
                      onChange={(e) => setPincodeFilter(e.target.value)}
                      placeholder="Pincode"
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono text-gray-800 outline-none"
                      readOnly={!!activeSociety}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    {t('availableWings', 'Available Wings')}
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 truncate">
                    {activeSociety?.wings?.join(', ') || 'Wing A, Wing B'}
                  </div>
                </div>
              </div>

              {/* Resident Sign Up Specific Fields */}
              {!isLogin && (
                <>
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      {t('residentFullName', 'Resident Full Name')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition"
                        placeholder="e.g. Ananya Deshmukh"
                      />
                    </div>
                  </div>

                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      {t('mobileNumber', 'Mobile / Phone Number')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition"
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                        {t('wing', 'Wing')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        {activeSociety.wings && activeSociety.wings.length > 0 ? (
                          <select
                            value={wing}
                            onChange={(e) => setWing(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition"
                          >
                            {activeSociety.wings.map((w, i) => (
                              <option key={i} value={w}>
                                {w}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            value={wing}
                            onChange={(e) => setWing(e.target.value)}
                            placeholder="Wing A"
                            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                        {t('apartmentFlat', 'Apartment / Flat')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={apartment}
                        onChange={(e) => setApartment(e.target.value)}
                        placeholder="e.g. 402"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email & Password */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  {t('emailUsername', 'Email / Username')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition"
                    placeholder={isLogin ? "name@society.com or admin email" : "resident@example.com"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  {t('password', 'Password')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white outline-none transition font-mono"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-200 active:scale-[0.98] flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                {isLogin ? t('signInToSociety', 'Sign In to Society') : t('createResidentAccount', 'Create Resident Account')} <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> {t('quickDemoLogins', 'Quick Demo Logins:')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectDemo('super')}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 hover:bg-brand-50 border border-gray-200 rounded-lg text-gray-700 transition cursor-pointer"
                >
                  <div className="font-semibold text-brand-700">👑 {t('superAdmin', 'Super Admin')}</div>
                  <div className="text-[10px] text-gray-500 truncate">super@society.com</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDemo('resident')}
                  className="px-2.5 py-1.5 text-xs text-left bg-slate-50 hover:bg-emerald-50 border border-gray-200 rounded-lg text-gray-700 transition cursor-pointer"
                >
                  <div className="font-semibold text-emerald-700">👤 {t('residentUser', 'Resident User')}</div>
                  <div className="text-[10px] text-gray-500 truncate">resident@society.com</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
