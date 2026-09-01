import React, { useState } from 'react';
import { Ticket, Role, User } from '../types';
import { Wrench, CheckCircle, Clock, AlertCircle, Loader, User as UserIcon, X, Plus, Image, Film, Paperclip, Home } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HelpDeskProps {
  tickets: Ticket[];
  userRole?: Role;
  currentUser: User;
  onUpdateTicket?: (ticket: Ticket) => void;
  onAddTicket: (ticket: Ticket) => void;
}

export const HelpDesk: React.FC<HelpDeskProps> = ({ tickets, userRole, currentUser, onUpdateTicket, onAddTicket }) => {
  const { t } = useLanguage();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Edit State for Admin
  const [editForm, setEditForm] = useState<{ status: string; assignedTo: string; progressUpdate: string }>({ 
      status: '', 
      assignedTo: '',
      progressUpdate: '' 
  });

  // New Ticket State
  const [newTicket, setNewTicket] = useState<{
      title: string;
      description: string;
      category: Ticket['category'];
      priority: Ticket['priority'];
      files: File[];
  }>({
      title: '',
      description: '',
      category: 'Other',
      priority: 'Medium',
      files: []
  });

  const isAdmin = userRole === Role.SuperAdmin || userRole === Role.WingAdmin;
  const [residentScope, setResidentScope] = useState<'MY_TICKETS' | 'OPEN_TICKETS_OTHERS' | 'ALL'>('MY_TICKETS');

  const isMyTicket = (tkt: Ticket) => {
    if (tkt.createdBy && currentUser.uid && tkt.createdBy === currentUser.uid) return true;
    if (tkt.createdByName && currentUser.name && tkt.createdByName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
    if (tkt.wing && currentUser.wing && tkt.apartmentNo && currentUser.apartmentNo && tkt.wing === currentUser.wing && tkt.apartmentNo === currentUser.apartmentNo) return true;
    return false;
  };

  // Filter Logic: Admins see all, Residents can switch between My Tickets, Open Tickets (Others), or All
  const visibleTickets = isAdmin 
      ? tickets 
      : residentScope === 'MY_TICKETS'
        ? tickets.filter(tkt => isMyTicket(tkt))
        : residentScope === 'OPEN_TICKETS_OTHERS'
          ? tickets.filter(tkt => !isMyTicket(tkt))
          : tickets;

  const openTickets = visibleTickets.filter(tkt => tkt.status === 'Open');
  const inProgressTickets = visibleTickets.filter(tkt => tkt.status === 'In Progress');
  const resolvedTickets = visibleTickets.filter(tkt => tkt.status === 'Resolved');

  const handleTicketClick = (ticket: Ticket) => {
      setSelectedTicket(ticket);
      setEditForm({
          status: ticket.status,
          assignedTo: ticket.assignedTo || '',
          progressUpdate: ticket.progressUpdate || ''
      });
  };

  const handleUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedTicket && onUpdateTicket) {
          onUpdateTicket({
              ...selectedTicket,
              status: editForm.status as any,
              assignedTo: editForm.assignedTo,
              progressUpdate: editForm.progressUpdate
          });
          setSelectedTicket(null);
      }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const ticket: Ticket = {
          id: `T${Math.floor(Math.random() * 10000)}`,
          title: newTicket.title,
          description: newTicket.description,
          category: newTicket.category,
          priority: newTicket.priority,
          status: 'Open',
          createdBy: currentUser.uid,
          createdByName: currentUser.name,
          wing: currentUser.wing,
          apartmentNo: currentUser.apartmentNo,
          dateCreated: new Date().toISOString().split('T')[0],
          // Mock attachments
          attachments: newTicket.files.map(f => URL.createObjectURL(f)) 
      };
      onAddTicket(ticket);
      setIsReportModalOpen(false);
      setNewTicket({
          title: '',
          description: '',
          category: 'Other',
          priority: 'Medium',
          files: []
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setNewTicket({
              ...newTicket,
              files: Array.from(e.target.files)
          });
      }
  };

  const renderTicketCard = (ticket: Ticket) => (
    <div 
        key={ticket.id} 
        onClick={() => handleTicketClick(ticket)}
        className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs hover:shadow-md transition cursor-pointer group"
    >
        <div className="flex justify-between items-start mb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                ticket.priority === 'High' ? 'bg-red-50 text-red-700' :
                ticket.priority === 'Medium' ? 'bg-orange-50 text-orange-700' :
                'bg-blue-50 text-blue-700'
            }`}>
                {ticket.priority}
            </span>
            <span className="text-xs text-gray-400 font-mono">#{ticket.id}</span>
        </div>
        <h4 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-brand-600 transition-colors line-clamp-1">
            {ticket.title}
        </h4>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{ticket.description}</p>
        
        {(isAdmin || ticket.createdBy !== currentUser.uid) && ticket.createdByName && (
             <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                 <Home className="w-3 h-3 text-gray-400" />
                 <span>
                   {ticket.wing && ticket.apartmentNo ? `${ticket.wing}-${ticket.apartmentNo}` : ''} 
                   {ticket.createdByName ? ` (${ticket.createdByName})` : ''}
                 </span>
             </div>
        )}
        
        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
            {ticket.assignedTo ? (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                    <UserIcon className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{ticket.assignedTo}</span>
                </div>
            ) : (
                <span className="text-xs text-gray-400 italic">{t('unassigned', 'Unassigned')}</span>
            )}
            {ticket.attachments && ticket.attachments.length > 0 && (
                <Paperclip className="w-3 h-3 text-gray-400" />
            )}
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('helpdesk', 'Helpdesk')}</h2>
          <p className="text-sm text-gray-500">{t('helpdeskSub', 'Report issues, track repairs, and vendor assignments.')}</p>
        </div>
        <button 
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {t('reportIssue', 'Report Issue')}
        </button>
      </div>

      {/* Scope Tabs for Residents */}
      {!isAdmin && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2 flex-wrap">
          <button
            type="button"
            onClick={() => setResidentScope('MY_TICKETS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              residentScope === 'MY_TICKETS'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('myTickets', 'My Tickets')} ({tickets.filter(tkt => isMyTicket(tkt)).length})
          </button>
          <button
            type="button"
            onClick={() => setResidentScope('OPEN_TICKETS_OTHERS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              residentScope === 'OPEN_TICKETS_OTHERS'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('openTicketsOthers', 'Open Tickets (Others)')} ({tickets.filter(tkt => !isMyTicket(tkt) && tkt.status !== 'Resolved').length})
          </button>
          <button
            type="button"
            onClick={() => setResidentScope('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              residentScope === 'ALL'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('allTickets', 'All Society Tickets')} ({tickets.length})
          </button>
        </div>
      )}

      {/* Ticket Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
         {/* Open Column */}
         <div className="bg-gray-50 rounded-xl p-4 min-w-[280px]">
             <div className="flex items-center gap-2 mb-4 text-red-700 font-semibold text-sm uppercase tracking-wide">
                 <AlertCircle className="w-4 h-4" /> {t('open', 'Open')} ({openTickets.length})
             </div>
             <div className="space-y-3">
                 {openTickets.map(renderTicketCard)}
                 {openTickets.length === 0 && <p className="text-xs text-gray-400 text-center py-4">{t('noOpenTickets', 'No open tickets')}</p>}
             </div>
         </div>

         {/* In Progress Column */}
         <div className="bg-gray-50 rounded-xl p-4 min-w-[280px]">
             <div className="flex items-center gap-2 mb-4 text-yellow-700 font-semibold text-sm uppercase tracking-wide">
                 <Loader className="w-4 h-4" /> {t('inProgress', 'In Progress')} ({inProgressTickets.length})
             </div>
             <div className="space-y-3">
                 {inProgressTickets.map(renderTicketCard)}
                 {inProgressTickets.length === 0 && <p className="text-xs text-gray-400 text-center py-4">{t('noActiveTickets', 'No active tickets')}</p>}
             </div>
         </div>

         {/* Resolved Column */}
         <div className="bg-gray-50 rounded-xl p-4 min-w-[280px]">
             <div className="flex items-center gap-2 mb-4 text-green-700 font-semibold text-sm uppercase tracking-wide">
                 <CheckCircle className="w-4 h-4" /> {t('resolved', 'Resolved')} ({resolvedTickets.length})
             </div>
             <div className="space-y-3">
                 {resolvedTickets.map(renderTicketCard)}
                 {resolvedTickets.length === 0 && <p className="text-xs text-gray-400 text-center py-4">{t('noResolvedTickets', 'No resolved tickets')}</p>}
             </div>
         </div>
      </div>

      {/* Report Issue Modal */}
      {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                  <div className="bg-brand-600 p-4 border-b border-brand-700 flex justify-between items-center rounded-t-2xl">
                      <h3 className="font-semibold text-lg text-white">{t('raiseNewTicket', 'Report New Issue')}</h3>
                      <button onClick={() => setIsReportModalOpen(false)} className="text-white hover:bg-brand-700 p-1 rounded-full transition cursor-pointer"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={handleReportSubmit} className="p-6 space-y-4 overflow-y-auto">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('issueTitle', 'Issue Title')}</label>
                          <input 
                              required 
                              type="text" 
                              value={newTicket.title} 
                              onChange={e => setNewTicket({...newTicket, title: e.target.value})} 
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                              placeholder="e.g. Broken elevator light"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('category', 'Category')}</label>
                              <select 
                                  value={newTicket.category} 
                                  onChange={e => setNewTicket({...newTicket, category: e.target.value as any})} 
                                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="Electrical">{t('electrical', 'Electrical')}</option>
                                  <option value="Plumbing">{t('plumbing', 'Plumbing')}</option>
                                  <option value="Security">{t('security', 'Security')}</option>
                                  <option value="Other">{t('other', 'Other')}</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{t('priority', 'Priority')}</label>
                              <select 
                                  value={newTicket.priority} 
                                  onChange={e => setNewTicket({...newTicket, priority: e.target.value as any})} 
                                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                              >
                                  <option value="Low">{t('low', 'Low')}</option>
                                  <option value="Medium">{t('medium', 'Medium')}</option>
                                  <option value="High">{t('high', 'High')}</option>
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('description', 'Description')}</label>
                          <textarea 
                              required 
                              value={newTicket.description} 
                              onChange={e => setNewTicket({...newTicket, description: e.target.value})} 
                              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none h-24 resize-none"
                              placeholder={t('describeIssuePlaceholder', 'Describe the issue in detail...')}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('attachments', 'Attachments (Photo/Video)')}</label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition cursor-pointer relative">
                              <input type="file" multiple accept="image/*,video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                              <div className="flex gap-2 text-gray-400 mb-2">
                                  <Image className="w-6 h-6" />
                                  <Film className="w-6 h-6" />
                              </div>
                              <span className="text-sm text-gray-600 font-medium">{t('clickToUpload', 'Click to upload')}</span>
                              <span className="text-xs text-gray-400">{newTicket.files.length > 0 ? `${newTicket.files.length} files selected` : 'JPG, PNG, MP4 allowed'}</span>
                          </div>
                      </div>
                      <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition mt-2 cursor-pointer">
                          {t('submitTicket', 'Submit Ticket')}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Ticket Detail/Edit Modal */}
      {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                  <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center rounded-t-2xl">
                      <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('ticketId', 'Ticket ID')}: {selectedTicket.id}</p>
                          <h3 className="font-semibold text-lg text-white">{t('ticketDetails', 'Ticket Details')}</h3>
                      </div>
                      <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-white p-1 rounded-full transition cursor-pointer">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4 overflow-y-auto">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <h4 className="font-semibold text-gray-900 text-lg mb-1">{selectedTicket.title}</h4>
                          <p className="text-sm text-gray-600 mb-3">{selectedTicket.description || "No description provided."}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                              <span className="bg-white px-2 py-1 rounded border border-gray-200">{t('category', 'Category')}: {selectedTicket.category}</span>
                              <span className="bg-white px-2 py-1 rounded border border-gray-200">{t('date', 'Date')}: {selectedTicket.dateCreated}</span>
                          </div>
                          {/* Resident Info for Admin */}
                          {isAdmin && selectedTicket.wing && selectedTicket.apartmentNo && (
                             <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 text-sm text-gray-700">
                                 <Home className="w-4 h-4 text-brand-600" />
                                 <span className="font-semibold">{selectedTicket.wing}-{selectedTicket.apartmentNo}</span>
                                 <span className="text-gray-500">({selectedTicket.createdByName})</span>
                             </div>
                          )}
                      </div>

                      {/* Attachments View */}
                      {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                          <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('attachments', 'Attachments')}</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {selectedTicket.attachments.map((url, idx) => (
                                      <div key={idx} className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                          <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {/* Admin Update Form or Resident Status View */}
                      {isAdmin && onUpdateTicket ? (
                          <div className="pt-4 border-t border-gray-100">
                              <h5 className="font-semibold text-gray-900 mb-3">{t('updateTicket', 'Update Ticket')}</h5>
                              <form onSubmit={handleUpdate} className="space-y-4">
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('status', 'Status')}</label>
                                      <select 
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                      >
                                          <option value="Open">{t('open', 'Open')}</option>
                                          <option value="In Progress">{t('inProgress', 'In Progress')}</option>
                                          <option value="Resolved">{t('resolved', 'Resolved')}</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('assignedStaff', 'Assigned Vendor / Staff')}</label>
                                      <input 
                                        type="text" 
                                        value={editForm.assignedTo}
                                        onChange={(e) => setEditForm({...editForm, assignedTo: e.target.value})}
                                        placeholder="e.g. Mario Plumbers"
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('progressReport', 'Progress Report / Updates')}</label>
                                      <textarea 
                                        value={editForm.progressUpdate}
                                        onChange={(e) => setEditForm({...editForm, progressUpdate: e.target.value})}
                                        placeholder="Enter progress details visible to resident..."
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none h-20 resize-none"
                                      />
                                  </div>
                                  <button type="submit" className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition mt-2 cursor-pointer">
                                      {t('updateTicket', 'Update Ticket')}
                                  </button>
                              </form>
                          </div>
                      ) : (
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                             {/* Progress Update View for Resident */}
                             {selectedTicket.progressUpdate && (
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                                    <h5 className="font-semibold text-blue-900 text-sm mb-1 flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> {t('update', 'Latest Update')}
                                    </h5>
                                    <p className="text-sm text-blue-800 leading-relaxed">{selectedTicket.progressUpdate}</p>
                                </div>
                             )}

                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">{t('status', 'Status')}</span>
                                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                                    selectedTicket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 
                                    selectedTicket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>{selectedTicket.status}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">{t('assignedStaff', 'Assigned To')}</span>
                                <span className="text-sm font-medium text-gray-900">{selectedTicket.assignedTo || t('unassigned', 'Unassigned')}</span>
                            </div>
                             <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-500">{t('priority', 'Priority')}</span>
                                <span className="text-sm font-medium text-gray-900">{selectedTicket.priority}</span>
                            </div>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
