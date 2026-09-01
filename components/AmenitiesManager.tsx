import React, { useState } from 'react';
import { Facility, FacilityBlock, Role } from '../types';
import { 
  Sparkles, Plus, Search, Users, Clock, IndianRupee, 
  CheckCircle2, XCircle, Edit, Trash2, Image as ImageIcon, 
  Info, AlertCircle, Eye, CalendarCheck, ShieldAlert, Wrench, Calendar, X
} from 'lucide-react';
import { formatCurrency } from '../constants';

interface AmenitiesManagerProps {
  facilities: Facility[];
  facilityBlocks?: FacilityBlock[];
  societyName?: string;
  userRole?: Role;
  onAddFacility: (facility: Facility) => Promise<void>;
  onUpdateFacility: (facility: Facility) => Promise<void>;
  onDeleteFacility: (id: string) => Promise<void>;
  onAddBlock?: (block: FacilityBlock) => Promise<void>;
  onDeleteBlock?: (id: string) => Promise<void>;
  onNavigateToBooking?: () => void;
}

const PRESET_IMAGES = [
  { label: 'Gym', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60' },
  { label: 'Pool', url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800&auto=format&fit=crop&q=60' },
  { label: 'Banquet Hall', url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&auto=format&fit=crop&q=60' },
  { label: 'Badminton', url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=60' },
  { label: 'Tennis Court', url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&auto=format&fit=crop&q=60' },
  { label: 'Play Park', url: 'https://images.unsplash.com/photo-1588718704337-4044749b556a?w=800&auto=format&fit=crop&q=60' },
  { label: 'Yoga Deck', url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=60' },
  { label: 'Clubhouse Lounge', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=60' },
];

export const AmenitiesManager: React.FC<AmenitiesManagerProps> = ({
  facilities,
  facilityBlocks = [],
  societyName = 'Society',
  userRole,
  onAddFacility,
  onUpdateFacility,
  onDeleteFacility,
  onAddBlock,
  onDeleteBlock,
  onNavigateToBooking
}) => {
  const [activeTab, setActiveTab] = useState<'facilities' | 'blocks'>('facilities');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'bookable' | 'walkin' | 'paid' | 'free'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Maintenance / Block Modal State
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockFacilityId, setBlockFacilityId] = useState(facilities[0]?.id || '');
  const [blockDate, setBlockDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [blockStartTime, setBlockStartTime] = useState('08:00');
  const [blockEndTime, setBlockEndTime] = useState('18:00');
  const [isFullDay, setIsFullDay] = useState(false);
  const [blockReason, setBlockReason] = useState('Scheduled Maintenance & Sanitization');
  const [blockError, setBlockError] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState<number>(15);
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [imageUrl, setImageUrl] = useState('');
  const [canBook, setCanBook] = useState(true);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [rules, setRules] = useState('');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingFacility(null);
    setName('');
    setDescription('');
    setCapacity(15);
    setOpenTime('06:00');
    setCloseTime('22:00');
    setImageUrl(PRESET_IMAGES[0].url);
    setCanBook(true);
    setRequiresPayment(false);
    setPrice(0);
    setRules('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (facility: Facility) => {
    setEditingFacility(facility);
    setName(facility.name);
    setDescription(facility.description || '');
    setCapacity(facility.capacity || 10);
    setOpenTime(facility.openTime || '06:00');
    setCloseTime(facility.closeTime || '22:00');
    setImageUrl(facility.imageUrl || PRESET_IMAGES[0].url);
    setCanBook(facility.canBook !== false);
    setRequiresPayment(Boolean(facility.requiresPayment));
    setPrice(facility.price || 0);
    setRules(facility.rules || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const openBlockModal = (preselectedFacilityId?: string) => {
    setBlockFacilityId(preselectedFacilityId || facilities[0]?.id || '');
    setBlockDate(new Date().toISOString().split('T')[0]);
    setBlockStartTime('08:00');
    setBlockEndTime('18:00');
    setIsFullDay(false);
    setBlockReason('Scheduled Maintenance & Sanitization');
    setBlockError('');
    setIsBlockModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter an amenity name.');
      return;
    }
    if (capacity <= 0) {
      setFormError('Capacity must be at least 1.');
      return;
    }
    if (requiresPayment && price < 0) {
      setFormError('Please provide a valid non-negative fee amount.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const facilityData: Facility = {
        id: editingFacility ? editingFacility.id : 'fac-' + Date.now(),
        name: name.trim(),
        description: description.trim(),
        capacity: Number(capacity),
        openTime,
        closeTime,
        imageUrl: imageUrl.trim() || PRESET_IMAGES[0].url,
        images: [imageUrl.trim() || PRESET_IMAGES[0].url],
        canBook,
        requiresPayment: canBook ? requiresPayment : false,
        price: (canBook && requiresPayment) ? Number(price) : 0,
        rules: rules.trim(),
        societyId: editingFacility?.societyId
      };

      if (editingFacility) {
        await onUpdateFacility(facilityData);
      } else {
        await onAddFacility(facilityData);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save amenity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockFacilityId) {
      setBlockError('Please select a facility to block.');
      return;
    }
    if (!blockDate) {
      setBlockError('Please select a date.');
      return;
    }
    if (!isFullDay && blockStartTime >= blockEndTime) {
      setBlockError('End time must be after start time.');
      return;
    }
    if (!blockReason.trim()) {
      setBlockError('Please provide a reason for the block/maintenance.');
      return;
    }

    setIsSubmittingBlock(true);
    setBlockError('');

    try {
      const selectedFac = facilities.find(f => f.id === blockFacilityId);
      const newBlock: FacilityBlock = {
        id: 'blk-' + Date.now(),
        facilityId: blockFacilityId,
        facilityName: selectedFac?.name || 'Facility',
        date: blockDate,
        startTime: isFullDay ? '00:00' : blockStartTime,
        endTime: isFullDay ? '23:59' : blockEndTime,
        reason: blockReason.trim(),
        blockedBy: userRole === 'SuperAdmin' ? 'Super Admin' : 'Admin',
        societyId: selectedFac?.societyId,
        createdAt: new Date().toISOString()
      };

      if (onAddBlock) {
        await onAddBlock(newBlock);
      }

      setIsBlockModalOpen(false);
    } catch (err: any) {
      setBlockError(err.message || 'Failed to block facility.');
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteFacility(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Error deleting amenity:', err);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (onDeleteBlock) {
      await onDeleteBlock(id);
    }
  };

  // Filtered facilities
  const filteredFacilities = facilities.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (filterType === 'bookable') return f.canBook !== false;
    if (filterType === 'walkin') return f.canBook === false;
    if (filterType === 'paid') return Boolean(f.requiresPayment);
    if (filterType === 'free') return !f.requiresPayment;
    return true;
  });

  const totalCount = facilities.length;
  const bookableCount = facilities.filter(f => f.canBook !== false).length;
  const walkinCount = facilities.filter(f => f.canBook === false).length;
  const paidCount = facilities.filter(f => Boolean(f.requiresPayment)).length;
  const totalBlocksCount = facilityBlocks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Amenities & Facilities</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage society amenities, booking rules, maintenance blocks, and paid reservation slots for {societyName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onNavigateToBooking && (
            <button
              onClick={onNavigateToBooking}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
            >
              <CalendarCheck className="w-4 h-4 text-brand-600" />
              Resident Booking View
            </button>
          )}

          <button
            onClick={() => openBlockModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            Block Facility / Maintenance
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            Add New Amenity
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-6 rounded-2xl border shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('facilities')}
          className={`py-4 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'facilities'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Active Amenities</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('blocks')}
          className={`py-4 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 ${
            activeTab === 'blocks'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Maintenance & Closures</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${totalBlocksCount > 0 ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-gray-100 text-gray-700'}`}>
            {totalBlocksCount}
          </span>
        </button>
      </div>

      {activeTab === 'facilities' ? (
        <>
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider">Total Amenities</span>
              <span className="text-2xl font-bold text-gray-900 mt-1 block">{totalCount}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600 block uppercase tracking-wider">Online Bookable</span>
              <span className="text-2xl font-bold text-emerald-700 mt-1 block">{bookableCount}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-blue-600 block uppercase tracking-wider">Walk-in Access</span>
              <span className="text-2xl font-bold text-blue-700 mt-1 block">{walkinCount}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs font-semibold text-purple-600 block uppercase tracking-wider">Paid Amenities</span>
              <span className="text-2xl font-bold text-purple-700 mt-1 block">{paidCount}</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search amenities by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterType === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setFilterType('bookable')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterType === 'bookable' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Bookable ({bookableCount})
              </button>
              <button
                onClick={() => setFilterType('walkin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterType === 'walkin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Walk-in ({walkinCount})
              </button>
              <button
                onClick={() => setFilterType('paid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterType === 'paid' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Paid ({paidCount})
              </button>
            </div>
          </div>

          {/* Amenities Grid */}
          {filteredFacilities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-gray-800">No amenities found</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {searchTerm ? 'No results matched your search criteria.' : 'Start adding amenities like Gym, Pool, Clubhouse, or Badminton courts.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={openAddModal}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add First Amenity
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFacilities.map((facility) => {
                const isBookable = facility.canBook !== false;
                const isPaid = Boolean(facility.requiresPayment);
                const facilityBlocksForThis = facilityBlocks.filter(b => b.facilityId === facility.id);

                return (
                  <div
                    key={facility.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Preview & Badges */}
                      <div className="h-44 overflow-hidden relative bg-gray-100">
                        <img
                          src={facility.imageUrl}
                          alt={facility.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = PRESET_IMAGES[0].url;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-md ${
                              isBookable
                                ? 'bg-emerald-500/90 text-white'
                                : 'bg-blue-500/90 text-white'
                            }`}
                          >
                            {isBookable ? 'Online Booking' : 'Walk-in'}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-md ${
                              isPaid
                                ? 'bg-purple-600/90 text-white'
                                : 'bg-emerald-600/90 text-white'
                            }`}
                          >
                            {isPaid ? `${formatCurrency(facility.price || 0)}/slot` : 'Free'}
                          </span>
                        </div>

                        {/* Active maintenance badge if any */}
                        {facilityBlocksForThis.length > 0 && (
                          <div className="absolute bottom-3 left-3 bg-amber-500/95 text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>{facilityBlocksForThis.length} Maintenance Block(s)</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-3">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{facility.name}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {facility.description || 'Modern society amenity with full community access.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>{facility.openTime} - {facility.closeTime}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span>Cap: {facility.capacity} persons</span>
                          </div>
                        </div>

                        {facility.rules && (
                          <div className="p-2 bg-gray-50 rounded-xl text-[11px] text-gray-600 flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{facility.rules}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Bottom Bar */}
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openBlockModal(facility.id)}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-100/60 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                        title="Block this facility for maintenance"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Block</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(facility)}
                          className="p-2 text-gray-600 hover:text-brand-600 hover:bg-white rounded-lg transition"
                          title="Edit Amenity"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(facility.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                          title="Delete Amenity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Maintenance & Slot Blocks Tab */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600" />
                Scheduled Maintenance & Facility Closures
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Super Admins can block facilities for specific dates and times for cleaning, repair, or private events. Blocked slots will automatically prevent resident bookings and synchronize directly with the Supabase database.
              </p>
            </div>

            <button
              onClick={() => openBlockModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 transition shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Facility Block
            </button>
          </div>

          {facilityBlocks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-gray-800">All facilities are fully operational</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                No active maintenance or closure blocks are currently scheduled. Residents have full access to available booking slots.
              </p>
              <button
                onClick={() => openBlockModal()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition"
              >
                <Plus className="w-4 h-4" />
                Schedule Maintenance Block
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Amenity</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Blocked Window</th>
                      <th className="py-3 px-4">Reason / Activity</th>
                      <th className="py-3 px-4">Blocked By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {facilityBlocks.map((block) => (
                      <tr key={block.id} className="hover:bg-amber-50/30 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {block.facilityName || 'Amenity'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{block.date}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-amber-800">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg border border-amber-200 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {block.startTime === '00:00' && block.endTime === '23:59'
                              ? 'Full Day (All Slots)'
                              : `${block.startTime} - ${block.endTime}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">
                          <span className="font-medium">{block.reason}</span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          {block.blockedBy || 'Super Admin'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(block.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Block Facility / Maintenance Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Block Facility / Maintenance</h3>
                  <p className="text-xs text-gray-500">Temporarily prevent bookings for repairs or events</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBlockSubmit} className="p-6 space-y-4">
              {blockError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{blockError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Select Facility *
                </label>
                <select
                  value={blockFacilityId}
                  onChange={(e) => setBlockFacilityId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.openTime} - {f.closeTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Date of Maintenance *
                </label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Time Window
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={isFullDay}
                      onChange={(e) => setIsFullDay(e.target.checked)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span>Full Day (Block All Slots)</span>
                  </label>
                </div>

                {!isFullDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 block mb-1">Start Time</span>
                      <input
                        type="time"
                        value={blockStartTime}
                        onChange={(e) => setBlockStartTime(e.target.value)}
                        required={!isFullDay}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 block mb-1">End Time</span>
                      <input
                        type="time"
                        value={blockEndTime}
                        onChange={(e) => setBlockEndTime(e.target.value)}
                        required={!isFullDay}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Reason / Maintenance Description *
                </label>
                <textarea
                  rows={2}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Deep chlorination, Pump overhaul, Annual electrical maintenance..."
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBlock}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow-sm disabled:opacity-50"
                >
                  {isSubmittingBlock ? 'Saving Block...' : 'Block Facility & Update Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Amenity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingFacility ? 'Edit Amenity / Facility' : 'Add New Amenity'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure amenity details, operating schedule, and booking capabilities for {societyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Amenity Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grand Gym, Infinity Swimming Pool, Banquet Hall..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Features, equipment, location details, etc."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Operating Hours & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Opening Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Closing Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Capacity (Persons) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs"
                  />
                </div>
              </div>

              {/* Image Preset & URL */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Amenity Image
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => setImageUrl(preset.url)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition font-medium ${
                        imageUrl === preset.url
                          ? 'bg-brand-50 border-brand-500 text-brand-700 font-bold'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs"
                />
              </div>

              {/* Checkboxes: Ability to Book & Payment Checkbox */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Booking & Payment Configuration
                </h4>

                {/* 1. Ability to book as a check box */}
                <div className="flex items-start gap-3">
                  <input
                    id="canBook"
                    type="checkbox"
                    checked={canBook}
                    onChange={(e) => setCanBook(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <div>
                    <label htmlFor="canBook" className="text-xs font-bold text-gray-900 cursor-pointer">
                      Ability to Book (Online Slot Reservation)
                    </label>
                    <p className="text-[11px] text-gray-500">
                      When checked, residents can select date & time slots and book passes online. If unchecked, the amenity will be marked as Open Walk-in Access.
                    </p>
                  </div>
                </div>

                {/* 2. Payment check box & price input */}
                {canBook && (
                  <div className="pl-7 space-y-3 pt-2 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <input
                        id="requiresPayment"
                        type="checkbox"
                        checked={requiresPayment}
                        onChange={(e) => setRequiresPayment(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                      />
                      <div>
                        <label htmlFor="requiresPayment" className="text-xs font-bold text-gray-900 cursor-pointer">
                          Requires Payment (Paid Amenity)
                        </label>
                        <p className="text-[11px] text-gray-500">
                          Enable this if booking this facility requires a fee. Residents will complete payment checkout before receiving their pass.
                        </p>
                      </div>
                    </div>

                    {requiresPayment && (
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Booking Fee per Slot (₹ INR) *
                        </label>
                        <div className="relative max-w-xs">
                          <IndianRupee className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            min={1}
                            required={requiresPayment}
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            placeholder="e.g. 200, 1500"
                            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rules / Guidelines */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Rules & Guidelines
                </label>
                <textarea
                  rows={2}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="e.g. Appropriate sports shoes mandatory. Sanitize equipment after use."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Amenity...' : editingFacility ? 'Update Amenity' : 'Create Amenity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">Delete this Amenity?</h4>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to remove this amenity from {societyName}? Existing booking passes will remain recorded in history.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
