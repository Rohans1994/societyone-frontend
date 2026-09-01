import React, { ReactNode } from 'react';
import { Role, ViewState } from '../types';
import { LayoutDashboard, Users, Wrench, Wallet, Building2, ShieldCheck, Menu, Bell, User as UserIcon, LogOut, Lock, Calendar, Home, Briefcase, Waves, ClipboardList, Sparkles, ReceiptText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface LayoutProps {
  children: ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  userRole: Role;
  userName: string;
  societyName?: string;
  societyPincode?: string;
  onLogout: () => void;
}

const NavItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      active 
        ? 'bg-brand-50 text-brand-700' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-brand-600' : 'text-gray-400'}`} />
    {label}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onChangeView, 
  userRole, 
  userName, 
  societyName = 'Grand Imperial Heights',
  societyPincode,
  onLogout 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { t } = useLanguage();

  const isAdminOrSuper = userRole === Role.SuperAdmin || userRole === Role.WingAdmin;
  const isSuperAdmin = userRole === Role.SuperAdmin;
  const isResident = userRole === Role.Resident;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center mr-3 shrink-0 shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold text-gray-900 tracking-tight block truncate" title={societyName}>
              {societyName}
            </span>
            <span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider block">
              {t('portalTitle', 'SocietyOne Portal')}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar">
          
          {/* Admin Only Sections */}
          {isAdminOrSuper && (
            <>
              <NavItem 
                icon={LayoutDashboard} 
                label={t('dashboard', 'Dashboard')} 
                active={currentView === 'DASHBOARD'} 
                onClick={() => { onChangeView('DASHBOARD'); setIsSidebarOpen(false); }} 
              />
              
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('management', 'Management')}
              </div>
              
              <NavItem 
                icon={Sparkles} 
                label={t('amenities', 'Amenities')} 
                active={currentView === 'AMENITIES'} 
                onClick={() => { onChangeView('AMENITIES'); setIsSidebarOpen(false); }} 
              />
              <NavItem 
                icon={Building2} 
                label={t('residentsAndWings', 'Residents & Wings')} 
                active={currentView === 'RESIDENTS'} 
                onClick={() => { onChangeView('RESIDENTS'); setIsSidebarOpen(false); }} 
              />
              <NavItem 
                icon={Wallet} 
                label={t('financeAndAccounting', 'Finance & Accounting')} 
                active={currentView === 'FINANCE' || currentView === 'INVOICES_FULL'} 
                onClick={() => { onChangeView('FINANCE'); setIsSidebarOpen(false); }} 
              />
              <NavItem 
                icon={ShieldCheck} 
                label={t('amcAndAssets', 'AMC & Assets')} 
                active={currentView === 'AMC'} 
                onClick={() => { onChangeView('AMC'); setIsSidebarOpen(false); }} 
              />
              <NavItem 
                icon={Briefcase} 
                label={t('vendors', 'Vendors')} 
                active={currentView === 'VENDORS'} 
                onClick={() => { onChangeView('VENDORS'); setIsSidebarOpen(false); }} 
              />
              <NavItem 
                icon={ClipboardList} 
                label={t('tendorManagement', 'Tendor Management')} 
                active={currentView === 'TENDORS'} 
                onClick={() => { onChangeView('TENDORS'); setIsSidebarOpen(false); }} 
              />
              {isSuperAdmin && (
                  <NavItem 
                    icon={Lock} 
                    label={t('userManagement', 'User Management')} 
                    active={currentView === 'USER_MANAGEMENT'} 
                    onClick={() => { onChangeView('USER_MANAGEMENT'); setIsSidebarOpen(false); }} 
                  />
              )}
            </>
          )}

          {isResident && (
            <>
              <NavItem 
                icon={Home} 
                label={t('home', 'Home')} 
                active={currentView === 'RESIDENT_DASHBOARD'} 
                onClick={() => { onChangeView('RESIDENT_DASHBOARD'); setIsSidebarOpen(false); }} 
              />
              <NavItem 
                icon={Wallet} 
                label={t('maintenance', 'Maintenance')} 
                active={currentView === 'MAINTENANCE'} 
                onClick={() => { onChangeView('MAINTENANCE'); setIsSidebarOpen(false); }} 
              />
            </>
          )}

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('community', 'Community')}
          </div>

           <NavItem 
            icon={Calendar} 
            label={isAdminOrSuper ? t('eventsAndNotices', 'Events and Notices') : t('events', 'Events')} 
            active={currentView === 'EVENTS'} 
            onClick={() => { onChangeView('EVENTS'); setIsSidebarOpen(false); }} 
          />
          <NavItem 
            icon={Waves} 
            label={t('fishBowl', 'Fish Bowl')} 
            active={currentView === 'FISHBOWL'} 
            onClick={() => { onChangeView('FISHBOWL'); setIsSidebarOpen(false); }} 
          />

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {t('services', 'Services')}
          </div>

          <NavItem 
            icon={Users} 
            label={t('facilityBooking', 'Facility Booking')} 
            active={currentView === 'FACILITIES'} 
            onClick={() => { onChangeView('FACILITIES'); setIsSidebarOpen(false); }} 
          />
          <NavItem 
            icon={Wrench} 
            label={t('helpdesk', 'Helpdesk')} 
            active={currentView === 'HELPDESK'} 
            onClick={() => { onChangeView('HELPDESK'); setIsSidebarOpen(false); }} 
          />

          <div className="mt-auto pt-4 border-t border-gray-100">
            <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
                <LogOut className="w-5 h-5" />
                {t('signOut', 'Sign Out')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Society Name Top Left */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
              <div>
                <span className="font-bold text-gray-900 text-sm sm:text-base tracking-tight block leading-tight">
                  {societyName}
                </span>
                {societyPincode && (
                  <span className="text-[11px] font-mono text-gray-400 block leading-tight">
                    PIN: {societyPincode}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
             {/* Language Switcher */}
             <LanguageSelector />

             <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                    {userName.charAt(0)}
                </div>
                <div className="hidden md:block pr-2 text-right">
                    <p className="text-sm font-semibold text-gray-900 leading-none">{userName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{userRole}</p>
                </div>
             </div>
             <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};