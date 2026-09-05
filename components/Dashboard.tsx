import React from 'react';
import { User, Invoice, Ticket, AMC, Event, Notice, Booking, ViewState } from '../types';
import { TrendingUp, Users, AlertTriangle, Activity, Clock, ShieldAlert, ChevronRight, MapPin, UserCheck, Check, ArrowRight, BellRing, Megaphone, IndianRupee, X } from 'lucide-react';
import { formatCurrency } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import { AuthedImg } from './AuthedImg';

interface DashboardProps {
  user: User;
  invoices: Invoice[];
  tickets: Ticket[];
  amcs: AMC[];
  events: Event[];
  notices?: Notice[];
  users?: User[];
  bookings?: Booking[];
  onNavigate: (view: ViewState) => void;
  onApproveUser?: (uid: string) => void;
  onConfirmBookingPayment?: (id: string) => void;
  onCancelBooking?: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  invoices, 
  tickets, 
  amcs, 
  events, 
  notices = [],
  users = [], 
  bookings = [],
  onNavigate,
  onApproveUser,
  onConfirmBookingPayment,
  onCancelBooking
}) => {
  const { t } = useLanguage();
  const openTickets = tickets.filter(t => t.status !== 'Resolved').length;
  const dueAmount = invoices.filter(i => i.status !== 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
  const expiringAMCs = amcs.filter(amc => amc.status === 'Expiring Soon');
  const activeAMCsCount = amcs.filter(amc => amc.status === 'Active').length;
  
  // Pending resident registrations for this society
  const pendingResidents = users.filter(u => u.adminApproved === false);
  const totalSocietyResidents = users.filter(u => u.adminApproved !== false).length;

  // Facility bookings paid manually (QR/UPI/bank transfer, no live gateway)
  // awaiting the facility manager's verification.
  const pendingPaymentBookings = bookings.filter(b => b.status === 'Pending');

  // Get upcoming events, sort by date
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Get latest notices, sort by date desc
  const recentNotices = [...notices]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-700 rounded-2xl p-8 text-white relative isolate overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">{t('welcomeBack', 'Welcome back')}, {user.name}</h1>
            <p className="text-brand-100">{t('whatsHappening', "Here's what's happening in your society today.")}</p>
        </div>
      </div>

      {/* Pending Resident Approvals (Admin View Only - Tile with Specific User Approval) */}
      {pendingResidents.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-300/80 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
                  {t('pendingApprovals', 'Pending Resident Approvals')}
                  <span className="bg-amber-200 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {pendingResidents.length} {t('awaiting', 'Awaiting')}
                  </span>
                </h3>
                <p className="text-gray-600 text-xs mt-0.5">
                  {t('approvePendingSub', 'Approve resident sign-ups below to activate their login access.')}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('USER_MANAGEMENT')}
              className="text-xs font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1.5 hover:underline bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-2xs cursor-pointer"
            >
              {t('allUsersRequests', 'All Users & Requests')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {pendingResidents.map(resident => (
              <div 
                key={resident.uid} 
                className="bg-white rounded-xl p-4 border border-amber-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-amber-100">
                    {resident.avatarUrl ? (
                      <AuthedImg src={resident.avatarUrl} alt={resident.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-brand-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm truncate">{resident.name}</p>
                    <p className="text-xs text-gray-500 truncate">{resident.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-700 font-semibold">
                      <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100 text-[11px]">
                        {resident.wing} • {t('flat', 'Flat')} {resident.apartmentNo || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => onApproveUser && onApproveUser(resident.uid)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> {t('approve', 'Approve Resident')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Facility Booking Payment Confirmations (Admin View Only) —
          residents pay manually via QR/UPI/bank transfer since no live
          payment gateway is integrated; the facility manager verifies here. */}
      {pendingPaymentBookings.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-300/80 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
                  Pending Payment Confirmations
                  <span className="bg-amber-200 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {pendingPaymentBookings.length} Awaiting
                  </span>
                </h3>
                <p className="text-gray-600 text-xs mt-0.5">
                  Confirm below once you've verified the resident's manual payment (QR/UPI/bank transfer) actually came through.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('AMENITIES')}
              className="text-xs font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1.5 hover:underline bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-2xs cursor-pointer"
            >
              Manage Amenities <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {pendingPaymentBookings.map(booking => (
              <div
                key={booking.id}
                className="bg-white rounded-xl p-4 border border-amber-200/90 shadow-2xs hover:shadow-sm transition flex flex-col justify-between"
              >
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{booking.facilityName}</p>
                  <p className="text-xs text-gray-500 truncate">{booking.residentName}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-700 font-semibold flex-wrap">
                    <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100 text-[11px]">
                      {booking.date} • {booking.timeSlot}
                    </span>
                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100 text-[11px] font-bold">
                      {formatCurrency(booking.amountPaid || 0)}
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => onConfirmBookingPayment && onConfirmBookingPayment(booking.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Confirm Payment
                  </button>
                  <button
                    onClick={() => onCancelBooking && onCancelBooking(booking.id)}
                    title="Reject / Cancel this booking"
                    className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-500 p-2 rounded-lg transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button 
          onClick={() => onNavigate('HELPDESK')}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-brand-200 transition text-left group cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">{t('openTickets', 'Open Tickets')}</p>
                    <p className="text-2xl font-bold text-gray-900">{openTickets}</p>
                </div>
            </div>
            <div className="mt-2 text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                {t('goToHelpdesk', 'Go to Helpdesk →')}
            </div>
        </button>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-brand-200 transition">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                    <Activity className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">{t('activeAMCs', 'Active AMCs')}</p>
                    <p className="text-2xl font-bold text-gray-900">{activeAMCsCount}</p>
                </div>
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-brand-200 transition">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">{t('totalDues', 'Total Dues')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(dueAmount)}</p>
                </div>
            </div>
        </div>
        <button 
          onClick={() => onNavigate('USER_MANAGEMENT')}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-brand-200 transition text-left group cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">{t('totalResidents', 'Total Residents')}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-gray-900">{totalSocietyResidents}</p>
                      {pendingResidents.length > 0 && (
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          +{pendingResidents.length} {t('pending', 'pending')}
                        </span>
                      )}
                    </div>
                </div>
            </div>
            <div className="mt-2 text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                {t('manageUsers', 'Manage Users & Approvals →')}
            </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Notices & Events */}
        <div className="space-y-6">
             {/* Recent Notices */}
             <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-600" />
                    {t('societyNotices', 'Recent Notices')}
                  </h3>
                  <button 
                    onClick={() => onNavigate('EVENTS')} 
                    className="text-sm text-brand-600 hover:text-brand-800 font-medium hover:underline cursor-pointer"
                  >
                    {t('all', 'View All')} →
                  </button>
                </div>

                {recentNotices.length > 0 ? (
                  <div className="space-y-3.5">
                    {recentNotices.map((notice) => {
                      const d = new Date(notice.date);
                      const month = !isNaN(d.getTime()) ? d.toLocaleString('default', { month: 'short' }) : 'OCT';
                      const day = !isNaN(d.getTime()) ? d.getDate() : '28';
                      const isHigh = notice.priority === 'High';

                      return (
                        <div key={notice.id} className="flex gap-3.5 p-3 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
                          <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex flex-col items-center justify-center font-bold text-xs ${
                            isHigh ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-800 border border-amber-100'
                          }`}>
                            <span className="text-[10px] uppercase leading-none font-semibold">{month}</span>
                            <span className="text-sm leading-tight">{day}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900 text-sm truncate">{notice.title}</h4>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                notice.category === 'Maintenance' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : notice.category === 'Urgent'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {notice.category || 'General'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                              {notice.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <BellRing className="w-8 h-8 mx-auto text-gray-300 mb-1" />
                    <p className="text-xs font-medium text-gray-600">{t('noNewNotifications', 'No recent notices published')}</p>
                    <button 
                      onClick={() => onNavigate('EVENTS')}
                      className="mt-2 text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
                    >
                      + {t('createNotice', 'Create Notice')}
                    </button>
                  </div>
                )}
            </div>
            
            {/* Upcoming Events */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
               <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-bold text-gray-900">{t('upcomingEvents', 'Upcoming Events')}</h3>
                   <button onClick={() => onNavigate('EVENTS')} className="text-sm text-brand-600 hover:text-brand-800 font-medium cursor-pointer">{t('all', 'View All')}</button>
               </div>
               
               {upcomingEvents.length > 0 ? (
                   <div className="space-y-3">
                       {upcomingEvents.map(evt => (
                           <div key={evt.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-100">
                               <div className="bg-purple-50 text-purple-700 w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                                   <span className="text-[10px] font-bold uppercase">{new Date(evt.date).toLocaleString('default', { month: 'short' })}</span>
                                   <span className="text-lg font-bold leading-none">{new Date(evt.date).getDate()}</span>
                               </div>
                               <div className="flex-1 min-w-0">
                                   <h4 className="text-sm font-semibold text-gray-900 truncate">{evt.title}</h4>
                                   <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {evt.time}</span>
                                       <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {evt.location}</span>
                                   </div>
                               </div>
                               <ChevronRight className="w-4 h-4 text-gray-400" />
                           </div>
                       ))}
                   </div>
               ) : (
                   <p className="text-sm text-gray-500 py-4 text-center">{t('noUpcomingEvents', 'No upcoming events scheduled.')}</p>
               )}
            </div>
        </div>

        {/* Right Column: Actions & AMCs */}
        <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('quickActions', 'Quick Actions')}</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition text-left cursor-pointer">
                        <span className="block font-semibold text-brand-600 mb-1">+ {t('myPasses', 'New Visitor')}</span>
                        <span className="text-xs text-gray-500">{t('createGatePass', 'Create gate pass')}</span>
                    </button>
                    <button onClick={() => onNavigate('FACILITIES')} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition text-left cursor-pointer">
                        <span className="block font-semibold text-brand-600 mb-1">{t('bookAmenity', 'Book Facility')}</span>
                        <span className="text-xs text-gray-500">{t('amenities', 'Gym, Pool, Clubhouse')}</span>
                    </button>
                    <button onClick={() => onNavigate('FINANCE')} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition text-left cursor-pointer">
                        <span className="block font-semibold text-brand-600 mb-1">{t('payDues', 'Pay Bills')}</span>
                        <span className="text-xs text-gray-500">{t('maintenanceBills', 'Maintenance & Utility')}</span>
                    </button>
                    <button onClick={() => onNavigate('HELPDESK')} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition text-left cursor-pointer">
                        <span className="block font-semibold text-brand-600 mb-1">{t('raiseComplaint', 'Raise Ticket')}</span>
                        <span className="text-xs text-gray-500">{t('reportIssue', 'Report an issue')}</span>
                    </button>
                </div>
            </div>

            {/* Expiring AMCs Section */}
            {expiringAMCs.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldAlert className="w-5 h-5 text-red-600" />
                        <h3 className="text-lg font-bold text-gray-900">{t('expiringAMCs', 'AMC Contracts Expiring Soon')}</h3>
                    </div>
                    <div className="space-y-3">
                        {expiringAMCs.map(amc => (
                            <div key={amc.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                <div>
                                    <h4 className="font-semibold text-sm text-gray-900">{amc.assetName}</h4>
                                    <p className="text-xs text-gray-600">{t('vendors', 'Vendor')}: {amc.vendorName}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-red-600 block">Exp: {amc.expiryDate}</span>
                                    <button 
                                      onClick={() => onNavigate('AMC')}
                                      className="text-xs text-brand-600 hover:underline cursor-pointer"
                                    >
                                      {t('renewNow', 'Renew Now')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
