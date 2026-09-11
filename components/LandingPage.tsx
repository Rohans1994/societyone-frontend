import React, { useState, useRef } from 'react';
import { Society, User } from '../types';
import { 
  Building2, 
  ShieldCheck, 
  FileSpreadsheet, 
  Wallet, 
  Users, 
  Wrench, 
  Plus, 
  ArrowRight, 
  Search, 
  MapPin, 
  Sparkles,
  ChevronRight,
  CalendarCheck,
  Check,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { CreateSocietyModal } from './CreateSocietyModal';
import { Auth } from './Auth';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import dummySocieties from '../data/dummySocieties.json';

// The "Available Societies" showcase grid below is purely illustrative —
// static example content, not a live directory — so it intentionally does
// NOT read from the real `societies` prop (which stays wired to the actual
// /api/societies data everywhere else, e.g. the real Select Society dropdown
// inside <Auth>). Only the fields actually rendered by that grid are needed
// here, so this doesn't need the full Society type (e.g. no adminEmail).
interface DummySociety {
  id: string;
  name: string;
  address: string;
  city?: string;
  pincode: string;
  wings: string[];
}

interface LandingPageProps {
  societies: Society[];
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (newUser: User) => void;
  // Persists the society + admin account. Must throw/reject on failure —
  // see CreateSocietyModal's prop comment for why.
  onSocietyCreated: (society: Society, adminUser: User) => Promise<void>;
  // Called only after the admin verifies their email OTP — the actual
  // "log the new admin in" step (see CreateSocietyModal's prop comment).
  onAdminVerified: (adminUser: User) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  societies,
  users,
  onLogin,
  onRegister,
  onSocietyCreated,
  onAdminVerified
}) => {
  const { t } = useLanguage();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<boolean>(false);
  const [preselectedSocietyId, setPreselectedSocietyId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  // Demo clip playback controls (it autoplays muted on load — these let the
  // visitor pause/stop it instead of it just running with no way to control it).
  const demoVideoRef = useRef<HTMLVideoElement>(null);
  const [isDemoPlaying, setIsDemoPlaying] = useState(true);

  const handleDemoPlay = () => {
    demoVideoRef.current?.play();
    setIsDemoPlaying(true);
  };

  const handleDemoPause = () => {
    demoVideoRef.current?.pause();
    setIsDemoPlaying(false);
  };

  const handleDemoStop = () => {
    const video = demoVideoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setIsDemoPlaying(false);
  };

  const filteredSocieties = (dummySocieties as DummySociety[]).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.pincode.includes(searchQuery) ||
    (s.city && s.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenLoginForSociety = (societyId?: string) => {
    setPreselectedSocietyId(societyId);
    setAuthMode(true);
  };

  const handleSocietyCreatedInternal = (society: Society, adminUser: User) => {
    // Just persists — the modal itself stays open afterwards to run the
    // admin through email OTP verification before anything here reacts.
    return onSocietyCreated(society, adminUser);
  };

  // Only reached once the admin has actually verified their email OTP
  // inside CreateSocietyModal — safe to close the modal and either log
  // them straight in or send them to the login screen now.
  const handleAdminVerifiedInternal = (adminUser: User, autoLogin: boolean) => {
    setIsCreateModalOpen(false);
    if (autoLogin) {
      onAdminVerified(adminUser);
    } else {
      setPreselectedSocietyId(adminUser.societyId);
      setAuthMode(true);
    }
  };

  if (authMode) {
    return (
      <>
        <Auth
          onLogin={onLogin}
          users={users}
          societies={societies}
          onRegister={onRegister}
          initialSocietyId={preselectedSocietyId}
          onCreateSocietyClick={() => setIsCreateModalOpen(true)}
          onBackToLanding={() => setAuthMode(false)}
        />
        <CreateSocietyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSocietyCreated={handleSocietyCreatedInternal}
          onAdminVerified={handleAdminVerifiedInternal}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-200">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-gray-900">
                Society<span className="text-brand-600">One</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold bg-brand-50 text-brand-700 rounded-full uppercase tracking-wider">
                Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <button
              type="button"
              onClick={() => handleOpenLoginForSociety()}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              {t('signIn', 'Sign In')}
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-200 transition active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('registerSocietyBtn', 'Register Society')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              {t('landingHeroTitle', 'Smart Housing Society Management Platform')}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-950 tracking-tight leading-tight">
              {t('smartPortalSubtitle', 'Smart Housing Society Portal & Resident Management')}
            </h1>

            <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
              {t('landingHeroSubtitle', 'Transform your gated community with seamless facility bookings, automated billing, verified gate passes, and smart resident communication.')}
            </p>

            {/* Action Cards Grid */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
              {/* Option 1: Create Society */}
              <div 
                onClick={() => setIsCreateModalOpen(true)}
                className="group p-6 bg-gradient-to-br from-brand-600 to-indigo-700 text-white rounded-2xl shadow-xl shadow-brand-200 hover:shadow-2xl hover:scale-[1.02] transition cursor-pointer flex flex-col justify-between border border-brand-500"
              >
                <div>
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 text-white backdrop-blur-md">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {t('registerSocietyBtn', 'Register Society')}
                  </h3>
                  <p className="text-xs text-brand-100 leading-relaxed">
                    {t('featuresSubtitle', 'Everything your residential complex needs in one integrated platform.')}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
                  {t('registerNewSociety', 'Register a New Housing Society')} <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Option 2: Login */}
              <div 
                onClick={() => handleOpenLoginForSociety()}
                className="group p-6 bg-white hover:bg-gray-50/80 rounded-2xl shadow-lg border border-gray-200 hover:border-brand-300 hover:scale-[1.02] transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4 text-brand-600 border border-brand-100">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {t('signInPortal', 'Sign In to Portal')}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t('chooseSocietyPlaceholder', 'Choose a society...')}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform">
                  {t('signIn', 'Sign In')} <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* See SocietyOne in Action — real product screenshots + a short demo clip */}
      <section className="py-16 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">
              {t('inActionTitle', 'See SocietyOne in Action')}
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {t('inActionCaption', 'A resident booking a slot and paying via QR/UPI/bank transfer')}
            </p>
          </div>

          {/* Demo clip: booking a paid amenity end-to-end, including the QR/UPI/bank payment step */}
          <div className="max-w-4xl mx-auto mb-10">
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-xl shadow-gray-200/60">
              <video
                ref={demoVideoRef}
                className="w-full h-auto block"
                src="/demo/booking-demo.mp4"
                poster="/demo/booking-demo-poster.png"
                autoPlay
                loop
                muted
                playsInline
                onPlay={() => setIsDemoPlaying(true)}
                onPause={() => setIsDemoPlaying(false)}
              />
            </div>

            {/* Play / Pause / Stop controls */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleDemoPlay}
                disabled={isDemoPlaying}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" /> {t('demoPlay', 'Play')}
              </button>
              <button
                type="button"
                onClick={handleDemoPause}
                disabled={!isDemoPlaying}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" /> {t('demoPause', 'Pause')}
              </button>
              <button
                type="button"
                onClick={handleDemoStop}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" /> {t('demoStop', 'Stop')}
              </button>
            </div>
          </div>

          {/* Supporting screenshots */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <figure className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <img src="/screenshots/dashboard.png" alt="SocietyOne admin dashboard" className="w-full h-auto block" />
              <figcaption className="px-4 py-3 text-xs font-semibold text-gray-600 bg-gray-50 border-t border-gray-200">
                {t('screenshotDashboard', 'Admin Dashboard')}
              </figcaption>
            </figure>
            <figure className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <img src="/screenshots/amenities-management.png" alt="Amenities and facility booking management" className="w-full h-auto block" />
              <figcaption className="px-4 py-3 text-xs font-semibold text-gray-600 bg-gray-50 border-t border-gray-200">
                {t('screenshotAmenities', 'Amenities & Facility Management')}
              </figcaption>
            </figure>
            <figure className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <img src="/screenshots/amc-assets.png" alt="AMC and asset tracking" className="w-full h-auto block" />
              <figcaption className="px-4 py-3 text-xs font-semibold text-gray-600 bg-gray-50 border-t border-gray-200">
                {t('screenshotAmc', 'AMC & Asset Tracking')}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-2">
              {t('featuresTitle', 'Key Features Built for Modern Societies')}
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {t('featuresSubtitle', 'Everything your residential complex needs in one integrated platform.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">
                {t('feature6Title', 'AMC & Asset Tracking')}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('feature6Desc', 'Manage equipment warranties, lift maintenance, and vendor contracts seamlessly.')}
              </p>
              <ul className="space-y-1.5 pt-1">
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{t('feature6Bullet1', 'Warranty documents & AMC contract renewal dates in one place')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{t('feature6Bullet2', 'Every asset linked to its vendor contract & coverage status')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{t('feature6Bullet3', 'Get ahead of AMC expiry before contracts lapse')}</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">
                {t('tendorManagement', 'Tender Management')}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('featuresSubtitle', 'Side-by-side vendor quotation analysis with automatic L1 best bid badging and proposal document attachments.')}
              </p>
              <ul className="space-y-1.5 pt-1">
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <span>{t('tenderBullet1', 'Compare every vendor quotation side-by-side')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <span>{t('tenderBullet2', 'Automatic L1 (lowest bid) badge highlights the best offer')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <span>{t('tenderBullet3', 'Attach and review proposal documents per vendor')}</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">
                {t('feature2Title', 'Automated Billing & Dues')}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('feature2Desc', 'Generate maintenance invoices, pay online, and track expenses effortlessly.')}
              </p>
              <ul className="space-y-1.5 pt-1">
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                  <span>{t('billingBullet1', 'Auto-generate quarterly maintenance invoices per flat')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                  <span>{t('billingBullet2', 'Real-time income & expense finance overview')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                  <span>{t('billingBullet3', 'Track and follow up on overdue dues automatically')}</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">
                {t('residentsAndWings', 'Residents & Wings')}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('featuresSubtitle', 'Role-isolated directory for owners and tenants across wings, complete with instant dues payment and ticket tracking.')}
              </p>
              <ul className="space-y-1.5 pt-1">
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span>{t('residentsBullet1', 'Two-tier verification: email OTP + admin approval before login')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span>{t('residentsBullet2', 'Organized by wing, flat number, and owner/tenant role')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span>{t('residentsBullet3', 'Bulk import residents in one go via CSV')}</span>
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">
                {t('feature3Title', 'Digital Helpdesk')}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('feature3Desc', 'Raise maintenance tickets, track technician assignments, and resolve issues fast.')}
              </p>
              <ul className="space-y-1.5 pt-1">
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                  <span>{t('helpdeskBullet1', 'Residents raise tickets with photo attachments in seconds')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                  <span>{t('helpdeskBullet2', 'Admins assign technicians and track resolution status')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                  <span>{t('helpdeskBullet3', 'Full ticket history per resident and category')}</span>
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-base">
                {t('feature1Title', 'Instant Facility Booking')}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {t('feature1Desc', 'Book clubhouses, tennis courts, and swimming pools in real-time.')}
              </p>
              <ul className="space-y-1.5 pt-1">
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
                  <span>{t('bookingBullet1', 'Admin-defined multi-slot scheduling per amenity')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
                  <span>{t('bookingBullet2', 'Accept payments via QR code, UPI, or bank transfer')}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
                  <span>{t('bookingBullet3', 'Real-time conflict detection prevents double-booking')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Live Registered Societies Directory Section */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {t('availableSocieties', 'Available Societies')}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {t('whatsHappening', "Select your housing society to log in directly as a resident or administrator")}
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('searchSocietyPlaceholder', 'Search name, city or pincode...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSocieties.map((society) => (
              <div
                key={society.id}
                className="p-5 bg-white rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                      {t('pin', 'PIN')}: {society.pincode}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    {society.name}
                  </h3>

                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{society.address}, {society.city}</span>
                  </p>

                  <div className="flex flex-wrap gap-1.5 my-3">
                    {society.wings.slice(0, 4).map((wing, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {wing}
                      </span>
                    ))}
                    {society.wings.length > 4 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                        +{society.wings.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-2">
                  <span className="text-[11px] text-gray-400 font-medium">
                    {society.wings.length} {t('availableWings', 'Wings')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenLoginForSociety()}
                    className="px-3.5 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    {t('signIn', 'Select & Login')} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Quick Register Card in the Grid */}
            <div
              onClick={() => setIsCreateModalOpen(true)}
              className="p-6 bg-slate-50 hover:bg-brand-50/50 rounded-2xl border-2 border-dashed border-gray-300 hover:border-brand-400 transition cursor-pointer flex flex-col items-center justify-center text-center group min-h-[190px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-brand-600 group-hover:text-white flex items-center justify-center text-gray-500 shadow-sm transition mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm group-hover:text-brand-700 transition">
                {t('registerSocietyBtn', 'Register Your Society')}
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                {t('featuresSubtitle', 'Add custom wings, address, and create unique administrator access.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-white border-t border-gray-200 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <span className="font-bold text-gray-900">SocietyOne</span>
            <span>— {t('landingHeroTitle', 'Smart Housing Society Management Platform')}</span>
          </div>
          <div>
            <span>{t('joinSocieties', 'Join hundreds of thriving housing societies using SocietyOne today.')}</span>
          </div>
        </div>
      </footer>

      {/* Create Society Modal */}
      <CreateSocietyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSocietyCreated={handleSocietyCreatedInternal}
        onAdminVerified={handleAdminVerifiedInternal}
      />
    </div>
  );
};
