import React, { useMemo, useState } from 'react';
import { VisitorRequest } from '../types';
import { DoorOpen, CalendarDays, Clock, CheckCircle2, XCircle, Phone, User as UserIcon } from 'lucide-react';
import { AuthedImg } from './AuthedImg';

// Same convention already used elsewhere in this app (e.g. NoticeModal's
// default date field, and GateManagement's admin-side date filter) — a
// plain YYYY-MM-DD split of the ISO string, rather than a timezone-aware
// local-date conversion.
const toDateString = (isoOrDate: string | Date) => new Date(isoOrDate).toISOString().split('T')[0];
const todayDateString = () => toDateString(new Date());

interface ResidentVisitorsProps {
  visitorRequests: VisitorRequest[];
}

// Read-only visitor history for a resident — a day-scoped list of everyone
// logged at the gate to see them, defaulting to today. Approving/denying a
// pending one is intentionally NOT done here — that stays exclusively on
// the dashboard banner and push notification, so there's only one place
// that action actually happens.
export const ResidentVisitors: React.FC<ResidentVisitorsProps> = ({ visitorRequests }) => {
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const isToday = selectedDate === todayDateString();

  const visitorsForSelectedDate = useMemo(
    () => visitorRequests
      .filter(v => toDateString(v.createdAt) === selectedDate)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [visitorRequests, selectedDate]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-brand-600" /> Visitors
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Everyone logged at the gate to see you.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
          {visitorsForSelectedDate.map(request => (
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
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 border border-dashed border-gray-200 text-center text-sm text-gray-500">
          {isToday ? 'No visitors logged for you today.' : 'No visitors logged on this date.'}
        </div>
      )}
    </div>
  );
};
