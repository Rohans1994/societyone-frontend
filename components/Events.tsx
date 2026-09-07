import React, { useState } from 'react';
import { Event, Notice, Role, User as UserType } from '../types';
import { Calendar, MapPin, Clock, Plus, X, Edit2, Trash2, User, BellRing, AlertTriangle, Megaphone, Shield, Lock, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { NoticeModal } from './NoticeModal';
import { AuthedImg } from './AuthedImg';

interface EventsProps {
  events: Event[];
  notices: Notice[];
  userRole: Role;
  currentUser?: UserType | null;
  societyName?: string;
  storageBucket?: string;
  onAddEvent: (event: Event) => void;
  onUpdateEvent: (event: Event) => void;
  onDeleteEvent: (id: string) => void;
  onAddNotice: (notice: Notice) => void;
  onUpdateNotice: (notice: Notice) => void;
  onDeleteNotice: (id: string) => void;
}

export const Events: React.FC<EventsProps> = ({ 
  events, 
  notices = [],
  userRole, 
  currentUser,
  societyName,
  storageBucket,
  onAddEvent, 
  onUpdateEvent, 
  onDeleteEvent,
  onAddNotice,
  onUpdateNotice,
  onDeleteNotice
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'ALL' | 'EVENTS' | 'NOTICES'>('ALL');
  
  // Event Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    organizer: ''
  });

  // Notice Modal State
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  const canManage = userRole === Role.SuperAdmin || userRole === Role.WingAdmin;

  // Residents (not admins) only ever receive broadcast notices plus their
  // own targeted ones (enforced server-side too — see notices.ts), so any
  // notice with a targetUid here is necessarily theirs. Split into two
  // groups for display, same pattern as "My Open Tickets" vs "Open Tickets
  // (Others)" in ResidentDashboard.tsx.
  const myNotices = !canManage ? notices.filter(n => n.targetUid) : [];
  const commonNotices = !canManage ? notices.filter(n => !n.targetUid) : notices;

  const handleOpenEventModal = (event?: Event) => {
    if (event) {
      setEditingEventId(event.id);
      setEventForm({
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        description: event.description,
        organizer: event.organizer
      });
    } else {
      setEditingEventId(null);
      setEventForm({ 
        title: '', 
        date: new Date().toISOString().split('T')[0], 
        time: '18:00', 
        location: '', 
        description: '', 
        organizer: 'Cultural Committee' 
      });
    }
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEventId) {
      onUpdateEvent({
        id: editingEventId,
        ...eventForm
      });
    } else {
      onAddEvent({
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...eventForm
      });
    }
    setIsEventModalOpen(false);
  };

  const handleOpenNoticeModal = (notice?: Notice) => {
    setEditingNotice(notice || null);
    setIsNoticeModalOpen(true);
  };

  const handleNoticeSubmit = (notice: Notice) => {
    if (editingNotice) {
      onUpdateNotice(notice);
    } else {
      onAddNotice(notice);
    }
    setIsNoticeModalOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      onDeleteEvent(id);
    }
  };

  const handleDeleteNotice = (id: string) => {
    if (window.confirm('Are you sure you want to delete this notice?')) {
      onDeleteNotice(id);
    }
  };

  const getNoticeCategoryBadge = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'maintenance':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'celebration':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'security':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isPdfAttachment = (url: string) => url.toLowerCase().includes('.pdf');

  const renderNoticeCard = (notice: Notice) => (
    <div 
      key={notice.id} 
      className="bg-white rounded-xl border border-gray-200 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between group relative"
    >
      {/* Admin Actions */}
      {canManage && (
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-gray-200 shadow-xs">
          <button 
            onClick={() => handleOpenNoticeModal(notice)}
            className="p-1.5 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded transition cursor-pointer"
            title="Edit Notice"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => handleDeleteNotice(notice.id)}
            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
            title="Delete Notice"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getNoticeCategoryBadge(notice.category)}`}>
            {notice.category || 'General'}
          </span>
          {notice.priority === 'High' && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {t('highPriority', 'High Priority')}
            </span>
          )}
          {/* Admins browse every notice in one list — this badge is the only
              way they can tell a targeted notice apart from a broadcast one. */}
          {canManage && notice.targetUid && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" /> {t('noticeToLabel', 'To')}: {notice.targetUserName || t('specificResident', 'Specific Resident')}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {notice.date}
          </span>
        </div>

        <h4 className="font-bold text-gray-900 text-base mb-2 group-hover:text-brand-600 transition-colors">
          {notice.title}
        </h4>

        <p className="text-xs text-gray-600 line-clamp-4 leading-relaxed whitespace-pre-line">
          {notice.description}
        </p>

        {notice.attachmentUrl && (
          isPdfAttachment(notice.attachmentUrl) ? (
            <a
              href={notice.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100"
            >
              <FileText className="w-3.5 h-3.5" /> {t('viewPdfAttachment', 'View PDF Attachment')}
            </a>
          ) : (
            <AuthedImg
              src={notice.attachmentUrl}
              alt="Notice attachment"
              className="mt-3 w-full max-h-40 object-cover rounded-lg border border-gray-200"
            />
          )
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1 font-medium text-gray-600">
          <Shield className="w-3.5 h-3.5 text-brand-600" /> {notice.createdByName || 'Managing Committee'}
        </span>
        <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
          {notice.targetUid ? t('privateNotice', 'Private Notice') : t('officialNotice', 'Official Notice')}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {canManage ? t('eventsAndNotices', 'Events and Notices') : t('eventsAndNotices', 'Community Events & Notices')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {societyName ? `${societyName} • ` : ''}{t('eventsSub', 'Manage community announcements, circulars, and scheduled gatherings.')}
          </p>
        </div>
        
        {canManage && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              id="btn-add-notice"
              type="button"
              onClick={() => handleOpenNoticeModal()}
              className="bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center justify-center gap-2 flex-1 sm:flex-none cursor-pointer"
            >
              <BellRing className="w-4 h-4" /> {t('addNotice', 'Add Notice')}
            </button>
            <button 
              id="btn-add-event"
              type="button"
              onClick={() => handleOpenEventModal()}
              className="bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center justify-center gap-2 flex-1 sm:flex-none cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {t('addEvent', 'Add Event')}
            </button>
          </div>
        )}
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-gray-200 gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'ALL'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('all', 'All Updates')}
          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {events.length + notices.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('NOTICES')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'NOTICES'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BellRing className="w-4 h-4" /> {t('societyNotices', 'Official Notices')}
          <span className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {notices.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('EVENTS')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'EVENTS'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4" /> {t('communityEvents', 'Community Events')}
          <span className="bg-brand-50 text-brand-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {events.length}
          </span>
        </button>
      </div>

      {/* 1. Official Notices Section */}
      {(activeTab === 'ALL' || activeTab === 'NOTICES') && (
        <div className="space-y-6">
          {/* Residents get their own targeted notices shown separately from
              general/broadcast ones. Admins see one unified list (with a
              "To:" badge on targeted notices, from renderNoticeCard above). */}
          {!canManage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" />
                  {t('noticesForYou', 'Notices For You')}
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-semibold">
                    {myNotices.length}
                  </span>
                </h3>
              </div>
              {myNotices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myNotices.map(renderNoticeCard)}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-6 border border-dashed border-gray-200 text-center">
                  <Lock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">{t('noPersonalNotices', 'No notices addressed to you yet')}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-600" />
                {canManage ? t('recentNotices', 'Recent Notices & Circulars') : t('generalNotices', 'General Society Notices')}
                <span className="text-xs font-normal text-gray-500">({commonNotices.length} {t('posted', 'posted')})</span>
              </h3>
              {canManage && activeTab === 'ALL' && (
                <button
                  type="button"
                  onClick={() => handleOpenNoticeModal()}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  + {t('postNotice', 'Post Notice')}
                </button>
              )}
            </div>

            {commonNotices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {commonNotices.map(renderNoticeCard)}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 border border-dashed border-gray-200 text-center">
                <BellRing className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">{t('noNoticesPublished', 'No notices published yet')}</p>
                <p className="text-xs text-gray-500 mt-1">{t('publishNoticesDesc', 'Publish notifications and announcements for residents.')}</p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleOpenNoticeModal()}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> {t('postFirstNotice', 'Post First Notice')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Community Events Section */}
      {(activeTab === 'ALL' || activeTab === 'EVENTS') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              {t('upcomingEvents', 'Upcoming Community Events')}
              <span className="text-xs font-normal text-gray-500">({events.length} {t('scheduled', 'scheduled')})</span>
            </h3>
            {canManage && activeTab === 'ALL' && (
              <button
                type="button"
                onClick={() => handleOpenEventModal()}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline cursor-pointer"
              >
                + {t('planEvent', 'Plan Event')}
              </button>
            )}
          </div>

          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition flex flex-col group relative">
                  {/* Admin Actions */}
                  {canManage && (
                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button 
                        onClick={() => handleOpenEventModal(event)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-brand-600 hover:text-brand-800 shadow-sm cursor-pointer"
                        title="Edit Event"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:text-red-700 shadow-sm cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="h-28 bg-gradient-to-r from-purple-600 to-brand-600 relative p-5 flex flex-col justify-end text-white">
                    <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-lg p-1.5 text-center min-w-[3.2rem]">
                      <span className="block text-[10px] font-bold uppercase tracking-wider">
                        {new Date(event.date).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="block text-lg font-bold leading-tight">
                        {new Date(event.date).getDate()}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold drop-shadow-sm pr-12 truncate">{event.title}</h3>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2 mb-3 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        <span className="truncate">{t('organizedBy', 'Organized by')}: <strong className="text-gray-800">{event.organizer}</strong></span>
                      </div>
                    </div>

                    <p className="text-gray-600 text-xs line-clamp-3 mb-4 flex-1">
                      {event.description}
                    </p>

                    <button type="button" className="w-full border border-brand-200 text-brand-700 hover:bg-brand-50 font-semibold py-2 rounded-lg transition text-xs cursor-pointer">
                      {t('rsvpDetails', 'RSVP / Event Details')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 border border-dashed border-gray-200 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">{t('noEventsScheduled', 'No events scheduled')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('scheduleEventsDesc', 'Schedule cultural and community events for society members.')}</p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleOpenEventModal()}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-50 text-brand-800 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> {t('planFirstEvent', 'Plan First Event')}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create / Edit Event */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-brand-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {editingEventId ? t('editEvent', 'Edit Community Event') : t('planNewEvent', 'Plan New Community Event')}
              </h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-white hover:bg-brand-700 p-1 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEventSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('eventTitle', 'Event Title')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Diwali Gala & Fireworks"
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('date', 'Date')}</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('time', 'Time')}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 18:30 PM - 21:30 PM"
                    value={eventForm.time}
                    onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('location', 'Location / Venue')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Clubhouse & Amphitheatre"
                  value={eventForm.location}
                  onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('organizedBy', 'Organized By')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cultural Subcommittee"
                  value={eventForm.organizer}
                  onChange={e => setEventForm({ ...eventForm, organizer: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('description', 'Description & Program Schedule')}</label>
                <textarea
                  rows={3}
                  placeholder="Provide schedule details, catering info, dress code..."
                  value={eventForm.description}
                  onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {editingEventId ? t('saveChanges', 'Save Changes') : t('publishEvent', 'Publish Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Notice (shared with User Management's "Send Notice" action) */}
      <NoticeModal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        onSubmit={handleNoticeSubmit}
        editingNotice={editingNotice}
        storageBucket={storageBucket}
      />
    </div>
  );
};
