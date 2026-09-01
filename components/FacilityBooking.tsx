import React, { useState, useMemo } from 'react';
import { Facility, Booking, FacilityBlock, User } from '../types';
import { 
  Calendar, Clock, QrCode, Users, Sparkles, ChevronLeft, ChevronRight, 
  CheckCircle2, X, AlertCircle, CreditCard, ShieldCheck, IndianRupee, 
  Smartphone, Building2, Check, ArrowRight, Info, CalendarCheck, ShieldAlert,
  AlertTriangle, Lock
} from 'lucide-react';
import { formatCurrency } from '../constants';

interface FacilityBookingProps {
  facilities: Facility[];
  bookings: Booking[];
  facilityBlocks?: FacilityBlock[];
  currentUser?: User | null;
  societyName?: string;
  onBookSlot?: (booking: Booking) => Promise<void>;
  onCancelBooking?: (id: string) => Promise<void>;
}

// Helpers for time string calculation and interval overlap
const parseTimeStringToMinutes = (tStr: string): number => {
  if (!tStr) return 0;
  const match = tStr.trim().match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const parseSlotRange = (slot: string): { start: number; end: number } => {
  if (!slot) return { start: 0, end: 60 };
  const parts = slot.split(/[-–—to]+/i);
  if (parts.length >= 2) {
    const s = parseTimeStringToMinutes(parts[0]);
    const e = parseTimeStringToMinutes(parts[1]);
    return { start: s, end: e > s ? e : s + 60 };
  }
  const s = parseTimeStringToMinutes(slot);
  return { start: s, end: s + 60 };
};

const doTimeRangesOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
  return Math.max(start1, start2) < Math.min(end1, end2);
};

export const FacilityBooking: React.FC<FacilityBookingProps> = ({ 
  facilities, 
  bookings = [],
  facilityBlocks = [],
  currentUser,
  societyName = 'Society',
  onBookSlot,
  onCancelBooking
}) => {
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [bookingSuccessPass, setBookingSuccessPass] = useState<Booking | null>(null);

  // Calendar State
  const today = useMemo(() => new Date(), []);
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(() => today.toISOString().split('T')[0]);
  
  // Time Slot State
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [customStartTime, setCustomStartTime] = useState('07:00');
  const [customEndTime, setCustomEndTime] = useState('08:00');
  const [useCustomTime, setUseCustomTime] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('resident@okhdfcbank');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Selected Booking for Full QR Pass Modal
  const [viewingPass, setViewingPass] = useState<Booking | null>(null);

  // Open booking modal for a specific facility
  const handleOpenBooking = (facility: Facility) => {
    setSelectedFacility(facility);
    setSelectedDate(today.toISOString().split('T')[0]);
    setSelectedTimeSlot('');
    setUseCustomTime(false);
    setIsPaymentStep(false);
    setBookingError('');
    setIsBookingModalOpen(true);
  };

  // Generate 1-hour time slots based on facility open and close time
  const availableTimeSlots = useMemo(() => {
    if (!selectedFacility) return [];
    
    const openH = parseInt(selectedFacility.openTime.split(':')[0], 10) || 6;
    const closeH = parseInt(selectedFacility.closeTime.split(':')[0], 10) || 22;
    
    const slots: string[] = [];
    for (let h = openH; h < closeH; h++) {
      const startStr = `${h.toString().padStart(2, '0')}:00`;
      const endStr = `${(h + 1).toString().padStart(2, '0')}:00`;
      slots.push(`${startStr} - ${endStr}`);
    }
    return slots;
  }, [selectedFacility]);

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isPast: boolean; isToday: boolean }[] = [];
    
    // Empty slots for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dateStr: '', dayNum: 0, isCurrentMonth: false, isPast: true, isToday: false });
    }
    
    const todayStr = today.toISOString().split('T')[0];

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;
      
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isPast,
        isToday
      });
    }
    
    return days;
  }, [currentMonthDate, today]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const effectiveTimeSlot = useCustomTime 
    ? `${customStartTime} - ${customEndTime}` 
    : selectedTimeSlot;

  // Check whether the resident already has a booking on the selected date
  const residentExistingBookingForDate = useMemo(() => {
    if (!currentUser || !selectedDate) return null;
    return bookings.find(b => 
      b.date === selectedDate && 
      b.status !== 'Cancelled' &&
      (b.residentId === currentUser.uid || b.residentName === currentUser.name)
    );
  }, [bookings, currentUser, selectedDate]);

  // Evaluate slot status for preset or custom slots on the selected date
  const getSlotAvailability = (slotStr: string) => {
    if (!selectedFacility || !selectedDate) return { isAvailable: true };

    const { start, end } = parseSlotRange(slotStr);

    // 1. Check Maintenance / Blocked windows
    const matchingBlock = facilityBlocks.find(blk => {
      if (blk.facilityId !== selectedFacility.id || blk.date !== selectedDate) return false;
      const bStart = parseTimeStringToMinutes(blk.startTime);
      const bEnd = parseTimeStringToMinutes(blk.endTime);
      return doTimeRangesOverlap(start, end, bStart, bEnd);
    });

    if (matchingBlock) {
      return {
        isAvailable: false,
        reason: 'BLOCKED',
        label: 'Under Maintenance',
        details: matchingBlock.reason
      };
    }

    // 2. Check Existing Bookings for this facility and date
    const conflictingBooking = bookings.find(b => {
      if (b.facilityId !== selectedFacility.id || b.date !== selectedDate || b.status === 'Cancelled') return false;
      const { start: bStart, end: bEnd } = parseSlotRange(b.timeSlot);
      return doTimeRangesOverlap(start, end, bStart, bEnd);
    });

    if (conflictingBooking) {
      return {
        isAvailable: false,
        reason: 'BOOKED',
        label: 'Slot Already Booked',
        details: `Booked by ${conflictingBooking.residentName} (${conflictingBooking.timeSlot})`
      };
    }

    return { isAvailable: true };
  };

  // Evaluate current chosen slot
  const currentSlotStatus = useMemo(() => {
    if (!effectiveTimeSlot) return null;
    return getSlotAvailability(effectiveTimeSlot);
  }, [effectiveTimeSlot, selectedFacility, selectedDate, facilityBlocks, bookings]);

  // Handle final submission of booking (Free or Paid)
  const handleConfirmBooking = async (paid: boolean = false) => {
    if (!selectedFacility) return;
    if (!selectedDate) {
      setBookingError('Please select a booking date.');
      return;
    }
    if (!effectiveTimeSlot) {
      setBookingError('Please select a time slot from the box.');
      return;
    }

    // 1. Check daily limit on client
    if (residentExistingBookingForDate) {
      setBookingError(
        `You already have an active booking for this day (${residentExistingBookingForDate.facilityName} at ${residentExistingBookingForDate.timeSlot}). Only one booking per day is allowed.`
      );
      return;
    }

    // 2. Check slot conflicts
    const slotCheck = getSlotAvailability(effectiveTimeSlot);
    if (!slotCheck.isAvailable) {
      if (slotCheck.reason === 'BLOCKED') {
        setBookingError(`This facility is blocked for maintenance during this time: ${slotCheck.details}`);
      } else {
        setBookingError(`This slot is already booked for the selected date and time.`);
      }
      return;
    }

    setIsProcessingPayment(true);
    setBookingError('');

    try {
      const bookingId = 'b-' + Date.now();
      const qrPassCode = `PASS-${selectedFacility.name.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      
      const newBooking: Booking = {
        id: bookingId,
        facilityId: selectedFacility.id,
        facilityName: selectedFacility.name,
        residentName: currentUser?.name || 'Resident Member',
        residentId: currentUser?.uid,
        wing: currentUser?.wing || '',
        apartmentNo: currentUser?.apartmentNo || '',
        date: selectedDate,
        timeSlot: effectiveTimeSlot,
        status: 'Confirmed',
        qrCode: qrPassCode,
        isPaid: paid,
        amountPaid: paid ? (selectedFacility.price || 0) : 0,
        paymentRef: paid ? `TXN-PAY-${Date.now().toString().slice(-6)}` : undefined,
        societyId: selectedFacility.societyId || currentUser?.societyId || 'soc-mtb32pfk'
      };

      if (onBookSlot) {
        await onBookSlot(newBooking);
      }

      setIsProcessingPayment(false);
      setIsBookingModalOpen(false);
      setIsPaymentStep(false);
      setBookingSuccessPass(newBooking);
    } catch (err: any) {
      setIsProcessingPayment(false);
      setBookingError(err.message || 'Failed to complete booking. Slot may already be reserved or blocked.');
    }
  };

  // Filter bookings for the current resident
  const myBookings = useMemo(() => {
    if (currentUser?.role === 'Resident') {
      return bookings.filter(b => b.residentId === currentUser.uid || b.residentName === currentUser.name);
    }
    return bookings;
  }, [bookings, currentUser]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Facility Booking & Amenities</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Reserve amenities, select dates & slots, and generate digital access entry passes for {societyName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-1.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-xs font-semibold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            1 Booking / Day Policy Active
          </div>
          <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Instant QR Pass Issuance
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Amenities / Facilities List (2 Columns on Desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>Society Amenities</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {facilities.length} available
              </span>
            </h3>
          </div>

          {facilities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-base font-semibold text-gray-700">No amenities registered for {societyName}</p>
              <p className="text-xs text-gray-500 mt-1">Contact your society admin to add facilities.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {facilities.map(facility => {
                const isBookable = facility.canBook !== false;
                const isPaid = Boolean(facility.requiresPayment);
                const activeBlocks = facilityBlocks.filter(b => b.facilityId === facility.id);

                return (
                  <div 
                    key={facility.id} 
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition flex flex-col justify-between"
                  >
                    {/* Cover image & badges */}
                    <div>
                      <div className="h-44 overflow-hidden relative bg-gray-100">
                        <img 
                          src={facility.imageUrl} 
                          alt={facility.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        
                        {/* Badges Top */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md ${
                            isBookable 
                              ? 'bg-emerald-600/90 text-white shadow-sm' 
                              : 'bg-blue-600/90 text-white shadow-sm'
                          }`}>
                            {isBookable ? 'Online Booking' : 'Walk-in Access'}
                          </span>

                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md ${
                            isPaid 
                              ? 'bg-amber-500/90 text-white shadow-sm' 
                              : 'bg-emerald-700/80 text-white shadow-sm'
                          }`}>
                            {isPaid ? `Fee: ${formatCurrency(facility.price || 0)}` : 'Free'}
                          </span>
                        </div>

                        {/* Capacity Bottom Right */}
                        <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-300" />
                          <span>Cap: {facility.capacity}</span>
                        </div>

                        {activeBlocks.length > 0 && (
                          <div className="absolute bottom-2.5 left-2.5 bg-amber-600/90 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Maintenance active</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-2.5">
                        <h4 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition">
                          {facility.name}
                        </h4>
                        
                        {facility.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {facility.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 pt-1">
                          <Clock className="w-4 h-4 text-brand-600 shrink-0" />
                          <span>Hours: {facility.openTime} - {facility.closeTime}</span>
                        </div>

                        {facility.rules && (
                          <div className="p-2 bg-gray-50 rounded-lg text-[11px] text-gray-500 line-clamp-1 border border-gray-100 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                            <span>{facility.rules}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Book Slot Button or Walk-in Notice */}
                    <div className="p-5 pt-0">
                      {isBookable ? (
                        <button 
                          onClick={() => handleOpenBooking(facility)}
                          className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm hover:shadow flex items-center justify-center gap-2 active:scale-[0.99]"
                        >
                          <Calendar className="w-4 h-4" />
                          Book Slot {isPaid ? `(${formatCurrency(facility.price || 0)})` : '(Free)'}
                        </button>
                      ) : (
                        <div className="w-full bg-blue-50 text-blue-700 border border-blue-200/60 py-2 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          Open Access (No Slot Booking Needed)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Bookings Side Panel */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Your Active Passes</h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">
              {myBookings.length} bookings
            </span>
          </div>

          {myBookings.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
              <QrCode className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No Active Passes</p>
              <p className="text-xs text-gray-500 mt-1">Book an amenity slot on the left to get your entry QR pass.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map(booking => {
                const fac = facilities.find(f => f.id === booking.facilityId);
                const displayName = booking.facilityName || fac?.name || 'Amenity Pass';

                return (
                  <div 
                    key={booking.id} 
                    className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative isolate overflow-hidden hover:border-brand-300 transition"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50/70 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                    
                    <div className="relative z-10 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] font-bold tracking-wider text-brand-600 uppercase">
                          Pass #{booking.id.replace('b-', '').toUpperCase()}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                          {booking.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-lg text-gray-900 leading-snug">{displayName}</h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 font-medium flex-wrap">
                          <Calendar className="w-3.5 h-3.5 text-brand-600" />
                          <span>{booking.date}</span>
                          <span className="text-gray-300">•</span>
                          <Clock className="w-3.5 h-3.5 text-brand-600" />
                          <span>{booking.timeSlot}</span>
                          {(booking.wing || booking.apartmentNo) && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="bg-brand-50 text-brand-700 text-[11px] font-semibold px-1.5 py-0.5 rounded">
                                {booking.wing ? `${booking.wing}` : ''} {booking.apartmentNo ? `Flat ${booking.apartmentNo}` : ''}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Digital Pass / QR Code Box */}
                      <div 
                        onClick={() => setViewingPass(booking)}
                        className="bg-gray-50 hover:bg-gray-100 transition cursor-pointer p-3.5 rounded-xl flex items-center justify-between border border-dashed border-gray-300"
                      >
                        <div>
                          <p className="text-[11px] text-gray-500">Entry Code</p>
                          <p className="font-mono text-xs font-bold text-gray-900 mt-0.5">{booking.qrCode}</p>
                          {booking.isPaid && (
                            <span className="text-[10px] font-semibold text-emerald-600 inline-block mt-0.5">
                              ✓ Paid {booking.amountPaid ? formatCurrency(booking.amountPaid) : ''}
                            </span>
                          )}
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                          <QrCode className="w-7 h-7 text-gray-800" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => setViewingPass(booking)}
                          className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          View Full Pass QR →
                        </button>
                        {onCancelBooking && (
                          <button
                            onClick={() => onCancelBooking(booking.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Policy Guidelines Box */}
          <div className="bg-gradient-to-br from-brand-50 to-blue-50 p-5 rounded-2xl border border-brand-100 shadow-sm space-y-2">
            <h5 className="text-sm font-bold text-brand-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              Booking & Availability Rules
            </h5>
            <ul className="text-xs text-brand-800 space-y-1.5 pl-4 list-disc">
              <li><strong>One booking per day:</strong> Each resident is permitted 1 active booking per day to ensure fair access for everyone.</li>
              <li><strong>Overlap check:</strong> Two residents cannot book the same amenity slot at the same time.</li>
              <li><strong>Maintenance blocks:</strong> Slots scheduled for maintenance are blocked from reservations.</li>
              <li>Show digital QR pass to security kiosk at the entrance.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Booking Modal with Interactive Calendar & Time Selection Box */}
      {isBookingModalOpen && selectedFacility && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    Book Slot: {selectedFacility.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Operating Hours: {selectedFacility.openTime} - {selectedFacility.closeTime} • Max Capacity: {selectedFacility.capacity} • {societyName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Prominent Error Banner */}
              {bookingError && (
                <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-200 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Cannot Reserve Slot</p>
                    <p className="text-red-700 mt-0.5">{bookingError}</p>
                  </div>
                </div>
              )}

              {/* Warning: User already has a booking on this date */}
              {residentExistingBookingForDate && (
                <div className="p-3.5 bg-amber-50 text-amber-900 rounded-2xl border border-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                  <div>
                    <span className="font-bold">Daily Booking Limit Reached: </span>
                    <span>
                      You already have a booking on <strong>{selectedDate}</strong> for <strong>{residentExistingBookingForDate.facilityName}</strong> ({residentExistingBookingForDate.timeSlot}). Society rules permit only 1 booking per day per resident. Please select another date.
                    </span>
                  </div>
                </div>
              )}

              {!isPaymentStep ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Interactive Date Calendar */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-brand-600" />
                        1. Select Date
                      </label>
                      <span className="text-xs font-semibold text-brand-600">
                        {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Quick Select Buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(today.toISOString().split('T')[0]);
                          setBookingError('');
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition ${
                          selectedDate === today.toISOString().split('T')[0]
                            ? 'bg-brand-50 border-brand-500 text-brand-700 font-semibold'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tom = new Date(today);
                          tom.setDate(tom.getDate() + 1);
                          setSelectedDate(tom.toISOString().split('T')[0]);
                          setBookingError('');
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition ${
                          selectedDate === new Date(today.getTime() + 86400000).toISOString().split('T')[0]
                            ? 'bg-brand-50 border-brand-500 text-brand-700 font-semibold'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Tomorrow
                      </button>
                    </div>

                    {/* Calendar Month Card */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      {/* Month Header Navigation */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm text-gray-800">
                          {currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Day of week headers */}
                      <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-semibold text-gray-400 uppercase">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      {/* Calendar Day Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                          if (!day.isCurrentMonth) {
                            return <div key={`empty-${idx}`} className="h-8" />;
                          }

                          const isSelected = selectedDate === day.dateStr;
                          
                          // Check if resident has booking on this date
                          const hasResidentBooking = currentUser && bookings.some(b => 
                            b.date === day.dateStr && 
                            b.status !== 'Cancelled' && 
                            (b.residentId === currentUser.uid || b.residentName === currentUser.name)
                          );

                          return (
                            <button
                              type="button"
                              key={day.dateStr}
                              disabled={day.isPast}
                              onClick={() => {
                                setSelectedDate(day.dateStr);
                                setBookingError('');
                              }}
                              className={`h-8 w-full rounded-xl text-xs font-semibold transition flex flex-col items-center justify-center relative ${
                                isSelected
                                  ? 'bg-brand-600 text-white shadow-sm'
                                  : day.isPast
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-700 hover:bg-brand-50 hover:text-brand-700'
                              } ${day.isToday && !isSelected ? 'border border-brand-500 font-bold text-brand-600' : ''}`}
                            >
                              <span>{day.dayNum}</span>
                              {hasResidentBooking && (
                                <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Time Slot Selection Box */}
                  <div className="md:col-span-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-brand-600" />
                          2. Select Time Slot
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomTime(!useCustomTime);
                            setBookingError('');
                          }}
                          className="text-[11px] font-semibold text-brand-600 hover:underline"
                        >
                          {useCustomTime ? 'Preset Slots' : 'Custom Time'}
                        </button>
                      </div>

                      {/* Separate Box to select Time */}
                      <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                        {!useCustomTime ? (
                          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                            <p className="text-[11px] text-gray-500 mb-2">Available 1-hour slots for {selectedDate}:</p>
                            {availableTimeSlots.map(slot => {
                              const isSelected = selectedTimeSlot === slot;
                              const availability = getSlotAvailability(slot);
                              const isSlotDisabled = !availability.isAvailable || Boolean(residentExistingBookingForDate);

                              return (
                                <button
                                  type="button"
                                  key={slot}
                                  disabled={isSlotDisabled}
                                  onClick={() => {
                                    setSelectedTimeSlot(slot);
                                    setBookingError('');
                                  }}
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition border ${
                                    isSelected
                                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                      : !availability.isAvailable
                                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                      : residentExistingBookingForDate
                                      ? 'bg-white text-gray-400 border-gray-200 opacity-60 cursor-not-allowed'
                                      : 'bg-white text-gray-700 border-gray-200 hover:bg-brand-50 hover:border-brand-300'
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : !availability.isAvailable ? 'text-gray-300' : 'text-gray-400'}`} />
                                    <span>{slot}</span>
                                  </span>

                                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}

                                  {!availability.isAvailable && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                                      {availability.reason === 'BLOCKED' ? 'Maintenance' : 'Booked'}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-[11px] text-gray-500">Specify custom hours:</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Start Time</label>
                                <input
                                  type="time"
                                  value={customStartTime}
                                  onChange={(e) => {
                                    setCustomStartTime(e.target.value);
                                    setBookingError('');
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-gray-500 block mb-1">End Time</label>
                                <input
                                  type="time"
                                  value={customEndTime}
                                  onChange={(e) => {
                                    setCustomEndTime(e.target.value);
                                    setBookingError('');
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary & Price Box */}
                    <div className="bg-brand-50/60 p-4 rounded-2xl border border-brand-100 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">Selected Slot:</span>
                        <span className="font-bold text-gray-900">{effectiveTimeSlot || 'Not chosen'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">Date:</span>
                        <span className="font-bold text-gray-900">{selectedDate}</span>
                      </div>

                      {currentSlotStatus && !currentSlotStatus.isAvailable && (
                        <div className="p-2 bg-red-100 text-red-800 rounded-lg text-[11px] font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>{currentSlotStatus.reason === 'BLOCKED' ? 'Slot Under Maintenance' : 'Slot Already Booked'}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-brand-200/60 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-800">Booking Fee:</span>
                        <span className="text-base font-extrabold text-brand-700">
                          {selectedFacility.requiresPayment && (selectedFacility.price || 0) > 0
                            ? formatCurrency(selectedFacility.price || 0)
                            : 'Free (Included)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Step 2: Payment Checkout Flow (Only shown if Payment Checkbox was checked) */
                <div className="space-y-6">
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Amount Due</p>
                      <h4 className="text-2xl font-extrabold text-amber-950 mt-0.5">
                        {formatCurrency(selectedFacility.price || 0)}
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5">
                        For {selectedFacility.name} ({selectedDate}, {effectiveTimeSlot})
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <IndianRupee className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                          paymentMethod === 'UPI'
                            ? 'bg-brand-50 border-brand-600 text-brand-900 ring-2 ring-brand-500/20'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <Smartphone className="w-5 h-5 text-brand-600 mb-2" />
                        <span className="text-xs font-bold block">Instant UPI</span>
                        <span className="text-[10px] text-gray-500">GPay, PhonePe, Paytm</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CARD')}
                        className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                          paymentMethod === 'CARD'
                            ? 'bg-brand-50 border-brand-600 text-brand-900 ring-2 ring-brand-500/20'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-brand-600 mb-2" />
                        <span className="text-xs font-bold block">Debit / Credit</span>
                        <span className="text-[10px] text-gray-500">Visa, Mastercard, RuPay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('NETBANKING')}
                        className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                          paymentMethod === 'NETBANKING'
                            ? 'bg-brand-50 border-brand-600 text-brand-900 ring-2 ring-brand-500/20'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <Building2 className="w-5 h-5 text-brand-600 mb-2" />
                        <span className="text-xs font-bold block">Net Banking</span>
                        <span className="text-[10px] text-gray-500">All Indian Banks</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Details Input */}
                  {paymentMethod === 'UPI' && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
                      <label className="text-xs font-semibold text-gray-700 block">Enter UPI ID / VPA</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okhdfcbank"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                      <p className="text-[11px] text-gray-500">
                        Payment request will be processed securely and verified automatically into Supabase.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'CARD' && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">Card Number</label>
                        <input
                          type="text"
                          defaultValue="•••• •••• •••• 4242"
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-1">Expiry</label>
                          <input type="text" defaultValue="12/28" className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-mono" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-1">CVV</label>
                          <input type="password" defaultValue="888" className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-mono" />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'NETBANKING' && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                      <label className="text-xs font-semibold text-gray-700 block mb-1.5">Select Bank</label>
                      <select className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm">
                        <option>HDFC Bank</option>
                        <option>State Bank of India</option>
                        <option>ICICI Bank</option>
                        <option>Axis Bank</option>
                        <option>Kotak Mahindra Bank</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>256-bit SSL encrypted society gateway • Instant receipt generation</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              {isPaymentStep ? (
                <button
                  type="button"
                  onClick={() => setIsPaymentStep(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition"
                >
                  ← Back to Slot Selection
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              )}

              <div className="flex items-center gap-3">
                {selectedFacility.requiresPayment && (selectedFacility.price || 0) > 0 ? (
                  !isPaymentStep ? (
                    <button
                      type="button"
                      disabled={!effectiveTimeSlot || Boolean(residentExistingBookingForDate) || Boolean(currentSlotStatus && !currentSlotStatus.isAvailable)}
                      onClick={() => setIsPaymentStep(true)}
                      className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Proceed to Payment ({formatCurrency(selectedFacility.price || 0)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessingPayment}
                      onClick={() => handleConfirmBooking(true)}
                      className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isProcessingPayment ? (
                        <span>Processing Payment...</span>
                      ) : (
                        <span>Pay {formatCurrency(selectedFacility.price || 0)} & Confirm Pass</span>
                      )}
                    </button>
                  )
                ) : (
                  /* Free Amenity -> Direct Confirmation Button */
                  <button
                    type="button"
                    disabled={!effectiveTimeSlot || isProcessingPayment || Boolean(residentExistingBookingForDate) || Boolean(currentSlotStatus && !currentSlotStatus.isAvailable)}
                    onClick={() => handleConfirmBooking(false)}
                    className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayment ? (
                      <span>Reserving Slot...</span>
                    ) : (
                      <span>Confirm Booking (Free)</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Celebration & QR Pass Modal */}
      {bookingSuccessPass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl animate-bounce">
              ✓
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Booking Confirmed!</h3>
              <p className="text-xs text-gray-500 mt-1">
                Your reservation for <strong>{bookingSuccessPass.facilityName}</strong> is verified.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-left space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Date & Slot:</span>
                <span className="font-bold text-gray-900">{bookingSuccessPass.date} ({bookingSuccessPass.timeSlot})</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Resident:</span>
                <span className="font-bold text-gray-900">
                  {bookingSuccessPass.residentName}
                  {(bookingSuccessPass.wing || bookingSuccessPass.apartmentNo) && (
                    <span className="text-brand-600 font-medium ml-1">
                      ({bookingSuccessPass.wing ? `${bookingSuccessPass.wing}` : ''} {bookingSuccessPass.apartmentNo ? `Flat ${bookingSuccessPass.apartmentNo}` : ''})
                    </span>
                  )}
                </span>
              </div>
              {bookingSuccessPass.isPaid && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Paid Amount:</span>
                  <span className="font-bold text-emerald-700">✓ {formatCurrency(bookingSuccessPass.amountPaid || 0)}</span>
                </div>
              )}
            </div>

            {/* QR Visual */}
            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200 inline-block">
              <QrCode className="w-32 h-32 text-gray-900 mx-auto" />
              <p className="text-xs font-mono font-bold text-brand-600 mt-2">{bookingSuccessPass.qrCode}</p>
            </div>

            <button
              onClick={() => setBookingSuccessPass(null)}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              Done & View Passes
            </button>
          </div>
        </div>
      )}

      {/* View Single Pass Modal */}
      {viewingPass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-gray-900">Digital Amenity Pass</h4>
              <button onClick={() => setViewingPass(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-brand-600 font-bold">{viewingPass.facilityName}</p>
              <h3 className="text-xl font-bold text-gray-900">{viewingPass.residentName}</h3>
              {(viewingPass.wing || viewingPass.apartmentNo) && (
                <p className="text-xs font-semibold text-brand-700 bg-brand-50 inline-block px-2.5 py-0.5 rounded-full">
                  {viewingPass.wing ? `${viewingPass.wing}` : ''} {viewingPass.apartmentNo ? `Flat ${viewingPass.apartmentNo}` : ''}
                </p>
              )}
              <p className="text-xs text-gray-500">{viewingPass.date} • {viewingPass.timeSlot}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col items-center">
              <QrCode className="w-36 h-36 text-gray-900" />
              <p className="text-xs font-mono font-bold text-brand-700 mt-2">{viewingPass.qrCode}</p>
              <p className="text-[11px] text-gray-400 mt-1">Scan at entrance scanner</p>
            </div>

            <button
              onClick={() => setViewingPass(null)}
              className="w-full bg-gray-900 text-white py-2 rounded-xl text-xs font-semibold"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
