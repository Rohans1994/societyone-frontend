import React, { useMemo } from 'react';
import { User, Event, Ticket, Booking, Notice, Invoice } from '../types';
import { 
  Calendar, 
  Bell, 
  Wrench, 
  CreditCard, 
  ChevronRight, 
  MapPin, 
  Activity, 
  User as UserIcon, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Shield, 
  Wallet,
  ArrowRight,
  FileText
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../constants';

interface ResidentDashboardProps {
  user: User;
  events: Event[];
  tickets: Ticket[];
  bookings: Booking[];
  notices?: Notice[];
  invoices?: Invoice[];
  onNavigate: (view: any) => void;
}

export const ResidentDashboard: React.FC<ResidentDashboardProps> = ({ 
  user, 
  events, 
  tickets, 
  notices = [],
  invoices = [],
  onNavigate 
}) => {
  const { t } = useLanguage();
  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 2);

  // Distinguish tickets created by the current resident vs tickets raised by other residents
  const isMyTicket = (t: Ticket) => {
    if (t.createdBy && user.uid && t.createdBy === user.uid) return true;
    if (t.createdByName && user.name && t.createdByName.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
    if (t.wing && user.wing && t.apartmentNo && user.apartmentNo && t.wing === user.wing && t.apartmentNo === user.apartmentNo) return true;
    return false;
  };

  const myOpenTickets = tickets.filter(t => t.status !== 'Resolved' && isMyTicket(t));
  const otherOpenTickets = tickets.filter(t => t.status !== 'Resolved' && !isMyTicket(t));
  
  // Sort notices by date descending
  const recentNotices = [...notices].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate pending maintenance for this resident
  const residentPendingInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchUser = (inv.residentId && inv.residentId === user.uid) ||
        (inv.residentName && user.name && inv.residentName.toLowerCase() === user.name.toLowerCase()) ||
        (inv.apartmentNo && user.apartmentNo && inv.apartmentNo === user.apartmentNo);
      return matchUser && inv.status !== 'Paid';
    });
  }, [invoices, user]);

  const totalPendingAmount = useMemo(() => {
    return residentPendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  }, [residentPendingInvoices]);

  const topPendingInvoice = residentPendingInvoices[0];

  return (
    <div className="space-y-8">
       {/* Header */}
       <div className="bg-gradient-to-br from-brand-600 to-purple-700 rounded-2xl p-8 text-white relative isolate overflow-hidden shadow-sm">
          <div className="relative z-10">
              <h1 className="text-3xl font-bold mb-2">{t('welcomeBack', 'Welcome back')}, {user.name}</h1>
              <p className="text-brand-100 opacity-90">{t('flat', 'Apartment')} {user.wing ? `${user.wing}-` : ''}{user.apartmentNo || '101'} • {t('resident', 'Resident')}</p>
          </div>
          <div className="absolute right-0 bottom-0 w-40 h-40 bg-white/10 rounded-full blur-2xl translate-y-1/2 translate-x-1/4"></div>
       </div>

       {/* Maintenance Alert Callout if dues exist */}
       {totalPendingAmount > 0 && topPendingInvoice && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
             <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                   <Wallet className="w-6 h-6" />
                </div>
                <div>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                         {topPendingInvoice.frequency || 'Periodic'} Maintenance Due
                      </span>
                      <span className="text-xs text-gray-500">Due: {topPendingInvoice.dueDate}</span>
                   </div>
                   <h3 className="text-base font-bold text-gray-900 mt-0.5">
                      {topPendingInvoice.description || `${topPendingInvoice.period || 'Maintenance'} Bill`} — {formatCurrency(totalPendingAmount)}
                   </h3>
                   <p className="text-xs text-gray-600 mt-0.5">
                      Pay now via UPI/NetBanking to receive your official receipt stored in Supabase.
                   </p>
                </div>
             </div>

             <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                   onClick={() => onNavigate('MAINTENANCE')}
                   className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                   <CreditCard className="w-4 h-4" />
                   Pay Dues ({formatCurrency(totalPendingAmount)})
                   <ArrowRight className="w-4 h-4" />
                </button>
             </div>
          </div>
       )}

       {/* 1. Quick Actions */}
       <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('quickActions', 'Quick Actions')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
             <button onClick={() => onNavigate('FACILITIES')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col items-center gap-2 text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition">
                   <Calendar className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t('bookAmenity', 'Book Facility')}</span>
             </button>
             <button onClick={() => onNavigate('HELPDESK')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col items-center gap-2 text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-100 transition">
                   <Wrench className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t('raiseComplaint', 'Raise Ticket')}</span>
             </button>
              <button onClick={() => onNavigate('MAINTENANCE')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col items-center gap-2 text-center group cursor-pointer relative">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-100 transition">
                   <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-sm font-medium text-gray-700">{t('payDues', 'Pay Bills')}</span>
                   {totalPendingAmount > 0 ? (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-0.5">
                         {formatCurrency(totalPendingAmount)} Due
                      </span>
                   ) : (
                      <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">All Paid</span>
                   )}
                </div>
             </button>
             <button onClick={() => onNavigate('EVENTS')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col items-center gap-2 text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition">
                   <Activity className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t('eventsAndNotices', 'Events & Notices')}</span>
             </button>
          </div>
       </div>

       {/* 2. Events and Notifications Sections Beside Each Other */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Events Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
             <div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                         <Calendar className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">{t('upcomingEvents', 'Upcoming Events')}</h3>
                   </div>
                   <button 
                      onClick={() => onNavigate('EVENTS')} 
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline flex items-center gap-1 cursor-pointer"
                   >
                      {t('all', 'View All')} <ChevronRight className="w-3.5 h-3.5" />
                   </button>
                </div>

                {upcomingEvents.length > 0 ? (
                   <div className="space-y-3.5">
                      {upcomingEvents.map(event => (
                         <div key={event.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                  <span className="bg-brand-100 text-brand-800 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                     {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                  <span className="text-xs text-gray-500 font-medium">{event.time}</span>
                               </div>
                               <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-brand-500" /> {event.location}
                                </span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">{event.title}</h4>
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{event.description}</p>
                            <div className="pt-1 flex justify-between items-center text-xs">
                               <span className="text-gray-400">{t('resident', 'By')}: {event.organizer}</span>
                               <button 
                                  onClick={() => onNavigate('EVENTS')} 
                                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 cursor-pointer"
                               >
                                  {t('rsvpDetails', 'RSVP / Details →')}
                                </button>
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                      <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-1.5" />
                      <p className="text-sm font-semibold text-gray-700">{t('noUpcomingEvents', 'No upcoming events')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t('stayTunedEvents', 'Stay tuned for cultural programs and meetings.')}</p>
                   </div>
                )}
             </div>
          </div>

          {/* Notifications & Notices Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
             <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                         <Bell className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900">{t('societyNotices', 'Notifications & Notices')}</h3>
                   </div>
                   {recentNotices.length > 0 && (
                      <button 
                        onClick={() => onNavigate('EVENTS')} 
                        className="text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                         {t('all', 'View All')} ({recentNotices.length}) <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                   )}
                </div>

                {recentNotices.length > 0 ? (
                   <div className="space-y-3">
                      {recentNotices.slice(0, 3).map(notice => {
                         const isHigh = notice.priority === 'High';
                         return (
                            <div key={notice.id} className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-100 hover:border-amber-200 transition">
                               <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isHigh ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}></span>
                                  <span className="font-bold text-gray-900 text-xs truncate flex-1">{notice.title}</span>
                                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{notice.date}</span>
                                </div>
                               <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed pl-4">
                                  {notice.description}
                                </p>
                               <div className="flex items-center justify-between mt-2 pl-4 pt-1.5 border-t border-gray-100 text-[10px] text-gray-500">
                                  <span className="text-brand-600 font-medium flex items-center gap-1">
                                     <Shield className="w-3 h-3 text-brand-600" /> {notice.createdByName || 'Managing Committee'}
                                  </span>
                                  <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-600 font-medium">
                                     {notice.category || 'General'}
                                  </span>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                ) : (
                   <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                      <Bell className="w-8 h-8 mx-auto text-gray-300 mb-1.5" />
                      <p className="text-sm font-semibold text-gray-700">{t('noNewNotifications', 'No new notifications')}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t('noticesWillAppear', 'Notices published for your society will appear here.')}</p>
                   </div>
                )}
             </div>
          </div>
       </div>

       {/* 3. My Open Tickets & Open Tickets Sections */}
       <div className="space-y-6">
          {/* 3A. My Open Tickets Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
             <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                   <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                      <Wrench className="w-4 h-4" />
                   </div>
                   <div>
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                         {t('myTickets', 'My Open Tickets')}
                         <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                            {myOpenTickets.length}
                         </span>
                      </h3>
                      <p className="text-xs text-gray-500">{t('myTicketsSub', 'Tickets and repair requests raised by you')}</p>
                   </div>
                </div>
                <button 
                   onClick={() => onNavigate('HELPDESK')} 
                   className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline cursor-pointer"
                >
                   + {t('raiseNewTicket', 'Raise Ticket')}
                </button>
             </div>

             {myOpenTickets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                   {myOpenTickets.map(ticket => (
                      <div 
                         key={ticket.id} 
                         onClick={() => onNavigate('HELPDESK')}
                         className="bg-gray-50/80 hover:bg-gray-100/80 p-4 rounded-xl border border-gray-100 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-sm transition cursor-pointer group"
                      >
                         <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                               <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  ticket.priority === 'High' ? 'bg-red-100 text-red-700' :
                                  ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                                  'bg-blue-100 text-blue-700'
                               }`}>
                                  {ticket.priority}
                               </span>
                               <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                  ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-800' : 'bg-red-50 text-red-700'
                               }`}>
                                  {ticket.status}
                               </span>
                               <span className="text-xs text-gray-400 font-medium">#{ticket.id} • {ticket.category}</span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm group-hover:text-brand-600 transition-colors truncate">
                               {ticket.title}
                            </h4>
                            {ticket.progressUpdate && (
                               <p className="text-xs text-amber-800 bg-amber-50/80 px-2 py-1 rounded border border-amber-200/60 line-clamp-1">
                                  <strong>{t('update', 'Update')}:</strong> {ticket.progressUpdate}
                               </p>
                            )}
                         </div>
                         <div className="flex items-center justify-between gap-3 shrink-0 pt-2 border-t border-gray-200/60">
                            <span className="text-xs text-gray-500">{ticket.dateCreated}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600 transition" />
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="py-6 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                   <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                   <p className="text-sm font-semibold text-gray-800">{t('noActiveTicketsUser', 'No active tickets created by you')}</p>
                   <p className="text-xs text-gray-500 mt-0.5">{t('everythingSmooth', 'Everything is running smoothly in your unit.')}</p>
                   <button 
                      onClick={() => onNavigate('HELPDESK')}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                   >
                      <Plus className="w-3.5 h-3.5" /> {t('needAssistance', 'Need Assistance? Raise a Ticket')}
                   </button>
                </div>
             )}
          </div>

          {/* 3B. Open Tickets Section */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
             <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                   <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4" />
                   </div>
                   <div>
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                         {t('openTickets', 'Open Tickets')}
                         <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                            {otherOpenTickets.length}
                         </span>
                      </h3>
                      <p className="text-xs text-gray-500">{t('openTicketsSub', 'Active tickets raised by other residents in the society')}</p>
                   </div>
                </div>
                <button 
                   onClick={() => onNavigate('HELPDESK')} 
                   className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline cursor-pointer"
                >
                   {t('all', 'View All')} <ChevronRight className="w-3.5 h-3.5" />
                </button>
             </div>

             {otherOpenTickets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                   {otherOpenTickets.map(ticket => (
                      <div 
                         key={ticket.id} 
                         onClick={() => onNavigate('HELPDESK')}
                         className="bg-gray-50/80 hover:bg-gray-100/80 p-4 rounded-xl border border-gray-100 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-sm transition cursor-pointer group"
                      >
                         <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                               <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  ticket.priority === 'High' ? 'bg-red-100 text-red-700' :
                                  ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-700' :
                                  'bg-blue-100 text-blue-700'
                               }`}>
                                  {ticket.priority}
                               </span>
                               <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                  ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-800' : 'bg-red-50 text-red-700'
                               }`}>
                                  {ticket.status}
                               </span>
                               <span className="text-xs text-gray-400 font-medium">{ticket.category}</span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm group-hover:text-brand-600 transition-colors truncate">
                               {ticket.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                               <span className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3 text-gray-400" />
                                  {ticket.createdByName || 'Other Resident'}
                                </span>
                               {ticket.wing && ticket.apartmentNo && (
                                  <span className="bg-gray-200/80 text-gray-700 text-[11px] px-1.5 py-0.2 rounded font-medium">
                                     {t('flat', 'Flat')} {ticket.wing}-{ticket.apartmentNo}
                                  </span>
                               )}
                            </div>
                         </div>
                         <div className="flex items-center justify-between gap-3 shrink-0 pt-2 border-t border-gray-200/60">
                            <span className="text-xs text-gray-500">{ticket.dateCreated}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600 transition" />
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="py-5 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                   <p className="text-xs text-gray-500">{t('noOpenTicketsOther', 'No open tickets reported by other residents.')}</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};
