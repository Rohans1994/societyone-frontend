import React, { useState } from 'react';
import { User, Role } from '../types';
import { WINGS } from '../constants';
import { Search, Users, Shield, Home, Phone } from 'lucide-react';

interface ResidentDirectoryProps {
  onOpenAI: () => void;
  residents: User[];
  wings?: string[];
  societyName?: string;
}

export const ResidentDirectory: React.FC<ResidentDirectoryProps> = ({ 
  onOpenAI, 
  residents,
  wings = WINGS,
  societyName
}) => {
  const [selectedWing, setSelectedWing] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const activeWings = wings && wings.length > 0 ? wings : WINGS;

  const filteredResidents = residents.filter(r => 
    (selectedWing === 'All' || r.wing === selectedWing) &&
    (r.name.toLowerCase().includes(searchTerm.toLowerCase()) || (r.apartmentNo && r.apartmentNo.includes(searchTerm)) || (r.phone && r.phone.includes(searchTerm)))
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Residents & Wings</h2>
          <p className="text-sm text-gray-500">
            {societyName ? `${societyName} • ` : ''}Showing {residents.length} resident{residents.length === 1 ? '' : 's'} across {activeWings.length} wings.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <button 
                onClick={onOpenAI}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
            >
                <span className="text-lg">✨</span> Draft Notice
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, apartment, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedWing('All')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              selectedWing === 'All' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Wings ({residents.length})
          </button>
          {activeWings.map(wing => {
            const wingCount = residents.filter(r => r.wing === wing).length;
            return (
              <button
                key={wing}
                onClick={() => setSelectedWing(wing)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  selectedWing === wing ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {wing.startsWith('Wing') ? wing : `Wing ${wing}`} {wingCount > 0 ? `(${wingCount})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filteredResidents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResidents.map(resident => (
            <div key={resident.uid} className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition flex items-center gap-4">
              <img 
                src={resident.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(resident.name)}&background=random`} 
                alt={resident.name} 
                className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100" 
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{resident.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-gray-700">
                     <Home className="w-3 h-3 text-gray-400" /> {resident.wing} • {resident.apartmentNo || 'N/A'}
                  </span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 rounded-full shrink-0">
                      {resident.role === Role.SuperAdmin ? <Shield className="w-3 h-3 text-brand-600" /> : <Users className="w-3 h-3 text-gray-500" />}
                      {resident.role}
                  </span>
                </div>
                {resident.phone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-mono">
                    <Phone className="w-3 h-3 text-gray-400" /> {resident.phone}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-700">No Residents Found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {searchTerm 
              ? `No residents matching "${searchTerm}" in ${selectedWing === 'All' ? 'this society' : selectedWing}.`
              : `No registered residents found in ${selectedWing === 'All' ? 'this society' : selectedWing}.`}
          </p>
        </div>
      )}
    </div>
  );
};