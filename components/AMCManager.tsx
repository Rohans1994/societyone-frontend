import React, { useState, useEffect } from 'react';
import { AMC, Asset, Vendor } from '../types';
import { AlertTriangle, CheckCircle, FileText, Clock, X, Plus, Calendar, IndianRupee, ShieldCheck, Search, Box, Layers, Settings, Edit, Upload, Paperclip, Download } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cppybjxvxejeewdxmozl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'dummy-anon-key-configure-via-env');

interface AMCManagerProps {
  amcs: AMC[];
  assets: Asset[];
  vendors?: Vendor[];
  onAddAsset?: (asset: Asset) => void;
  onUpdateAsset?: (asset: Asset) => void;
  onAddAMC?: (amc: AMC) => void;
}

export const AMCManager: React.FC<AMCManagerProps> = ({ 
  amcs: initialAMCs, 
  assets: initialAssets, 
  vendors = [],
  onAddAsset,
  onUpdateAsset,
  onAddAMC
}) => {
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'AMC'>('ASSETS');
  
  const [amcs, setAmcs] = useState<AMC[]>(initialAMCs);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);

  useEffect(() => {
    setAmcs(initialAMCs);
  }, [initialAMCs]);

  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);
  
  // Modals State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null); // State for editing asset
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);

  const [isAMCModalOpen, setIsAMCModalOpen] = useState(false);
  const [selectedAMC, setSelectedAMC] = useState<AMC | null>(null);
  const [targetAssetForAMC, setTargetAssetForAMC] = useState<Asset | null>(null);

  // Search State
  const [assetSearch, setAssetSearch] = useState('');
  const [amcSearch, setAmcSearch] = useState('');

  // Asset Form State (New)
  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'General',
    location: 'Basement 1',
    purchaseDate: new Date().toISOString().split('T')[0],
    modelNo: '',
    description: '',
    hasWarranty: 'no',
  });
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);

  // AMC Form State
  const [amcForm, setAmcForm] = useState({
    assetId: '',
    vendorName: '',
    startDate: new Date().toISOString().split('T')[0],
    durationValue: 12,
    durationUnit: 'Months',
    cost: '',
    terms: 'Standard SLA applies. Quarterly maintenance visits required.',
    paymentDuration: 'Annual',
    paymentMethod: '',
    lastServiceDate: '',
    category: 'plumbing'
  });
  const [amcFiles, setAmcFiles] = useState<File[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateExpiry = (start: string, val: number, unit: string) => {
    const date = new Date(start);
    if (unit === 'Years') date.setFullYear(date.getFullYear() + val);
    else if (unit === 'Months') date.setMonth(date.getMonth() + val);
    else if (unit === 'Days') date.setDate(date.getDate() + val);
    return date.toISOString().split('T')[0];
  };

  const determineAMCStatus = (expiryDate: string): 'Active' | 'Expiring Soon' | 'Expired' => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(today.getMonth() + 1);

    if (expiry < today) return 'Expired';
    if (expiry <= oneMonthFromNow) return 'Expiring Soon';
    return 'Active';
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssetUploadError(null);

    let uploadedPdfUrl = undefined;
    if (warrantyFile && assetForm.hasWarranty === 'yes') {
      try {
        let warrantyFilename = `${Date.now()}_${warrantyFile.name}`;
        if (!warrantyFilename.toLowerCase().endsWith('.pdf')) {
          warrantyFilename += '.pdf';
        }

        // Upload via the backend, which uses the Supabase service role key server-side
        // (bypasses Storage RLS entirely; the anon key is never involved in uploads).
        const base64Data = await convertToBase64(warrantyFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'assets',
            filename: warrantyFilename,
            contentBase64: base64Data,
            mimeType: 'application/pdf'
          })
        });
        if (!uploadRes.ok) {
          throw new Error('Upload via /api/upload failed.');
        }
        const result = await uploadRes.json();
        uploadedPdfUrl = result.url;
      } catch (uploadErr: any) {
        console.error('Warranty upload failed:', uploadErr);
        setAssetUploadError(uploadErr.message || 'Warranty upload failed.');
        return;
      }
    }

    const newAsset: Asset = {
      id: 'ast-' + Math.random().toString(36).substr(2, 9),
      name: assetForm.name,
      category: assetForm.category,
      location: assetForm.location,
      purchaseDate: assetForm.purchaseDate,
      modelNo: assetForm.modelNo,
      status: 'Operational',
      description: assetForm.description || undefined,
      hasWarranty: assetForm.hasWarranty === 'yes',
      warrantyPdfUrl: uploadedPdfUrl
    };
    setAssets([...assets, newAsset]);
    if (onAddAsset) onAddAsset(newAsset);
    setIsAssetModalOpen(false);
    setAssetForm({ 
      name: '', 
      category: 'General', 
      location: 'Basement 1', 
      purchaseDate: new Date().toISOString().split('T')[0], 
      modelNo: '',
      description: '',
      hasWarranty: 'no'
    });
    setWarrantyFile(null);
  };

  const handleUpdateAsset = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingAsset) return;
      
      const updatedAssets = assets.map(a => a.id === editingAsset.id ? editingAsset : a);
      setAssets(updatedAssets);
      if (onUpdateAsset) onUpdateAsset(editingAsset);
      setEditingAsset(null);
  };

  const handleDownloadWarranty = async (asset: Asset) => {
    if (!asset.warrantyPdfUrl) return;
    
    try {
      // Files uploaded via /api/upload are served back from our own backend
      // (apiClient.ts attaches the auth header automatically to /api/... calls).
      // This avoids relying on a direct Supabase Storage client, whose ad-hoc
      // session picks up the logged-in user's real auth token rather than a
      // pure anon one. Only legacy URLs (from before this fix) fall through to
      // the Supabase-client logic below.
      if (asset.warrantyPdfUrl.startsWith('/api/')) {
        const res = await fetch(asset.warrantyPdfUrl);
        if (!res.ok) throw new Error('Failed to download file from backend');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Warranty_${asset.name}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      // Extract the filename from the URL path
      let filename = '';
      if (asset.warrantyPdfUrl.includes('/assets/')) {
        const parts = asset.warrantyPdfUrl.split('/assets/');
        filename = decodeURIComponent(parts[parts.length - 1]);
      } else {
        const parts = asset.warrantyPdfUrl.split('/');
        filename = decodeURIComponent(parts[parts.length - 1]);
      }
      
      if (!filename) {
        throw new Error('Could not parse filename from warranty URL.');
      }

      // Fetch Supabase configuration dynamically from backend so we get the correct keys
      let activeSupabaseUrl = SUPABASE_URL;
      let activeAnonKey = SUPABASE_ANON_KEY;
      try {
        const configRes = await fetch('/api/supabase-config');
        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.supabaseUrl && typeof configData.supabaseUrl === 'string' && configData.supabaseUrl.trim() !== '') {
            activeSupabaseUrl = configData.supabaseUrl.trim();
          }
          if (configData.supabaseAnonKey && typeof configData.supabaseAnonKey === 'string' && configData.supabaseAnonKey.trim() !== '') {
            activeAnonKey = configData.supabaseAnonKey.trim();
          }
        }
      } catch (err) {
        console.warn('Could not fetch Supabase config for download:', err);
      }

      // Fallback validate activeSupabaseUrl matches a valid http or https url
      if (!activeSupabaseUrl || (!activeSupabaseUrl.startsWith('http://') && !activeSupabaseUrl.startsWith('https://'))) {
        activeSupabaseUrl = 'https://cppybjxvxejeewdxmozl.supabase.co';
      }

      // Check if we can use the Supabase client directly
      const isValidJWT = activeAnonKey && activeAnonKey.split('.').length === 3;
      if (isValidJWT) {
        const activeSupabase = createClient(activeSupabaseUrl, activeAnonKey);
        
        // Use supabase.storage.download
        const { data, error } = await activeSupabase.storage
          .from('assets')
          .download(filename);

        if (error) {
          throw error;
        }

        if (data) {
          const blobUrl = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `Warranty_${asset.name}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          return;
        }
      }
      
      // Fallback: If JWT/AnonKey isn't valid or download fails, open in new tab
      window.open(asset.warrantyPdfUrl, '_blank');
    } catch (err: any) {
      console.error('Error downloading warranty card:', err);
      window.open(asset.warrantyPdfUrl, '_blank');
    }
  };

  const handleDownloadAMCFile = async (url: string, suggestedFilename: string) => {
    if (!url) return;
    
    try {
      // Files uploaded via /api/upload are served back from our own backend
      // (apiClient.ts attaches the auth header automatically to /api/... calls).
      // This avoids relying on a direct Supabase Storage client, whose ad-hoc
      // session picks up the logged-in user's real auth token rather than a
      // pure anon one. Only legacy URLs (from before this fix) fall through to
      // the Supabase-client logic below.
      if (url.startsWith('/api/')) {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to download file from backend');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = suggestedFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      // Extract the filename from the URL path
      let filename = '';
      if (url.includes('/amc/')) {
        const parts = url.split('/amc/');
        filename = decodeURIComponent(parts[parts.length - 1]);
      } else {
        const parts = url.split('/');
        filename = decodeURIComponent(parts[parts.length - 1]);
      }
      
      // Strip any query parameters
      if (filename.includes('?')) {
        filename = filename.split('?')[0];
      }

      if (!filename) {
        throw new Error('Could not parse filename from AMC url.');
      }

      // Fetch Supabase configuration dynamically from backend so we get the correct keys
      let activeSupabaseUrl = SUPABASE_URL;
      let activeAnonKey = SUPABASE_ANON_KEY;
      try {
        const configRes = await fetch('/api/supabase-config');
        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.supabaseUrl && typeof configData.supabaseUrl === 'string' && configData.supabaseUrl.trim() !== '') {
            activeSupabaseUrl = configData.supabaseUrl.trim();
          }
          if (configData.supabaseAnonKey && typeof configData.supabaseAnonKey === 'string' && configData.supabaseAnonKey.trim() !== '') {
            activeAnonKey = configData.supabaseAnonKey.trim();
          }
        }
      } catch (err) {
        console.warn('Could not fetch Supabase config for download:', err);
      }

      // Fallback validate activeSupabaseUrl matches a valid http or https url
      if (!activeSupabaseUrl || (!activeSupabaseUrl.startsWith('http://') && !activeSupabaseUrl.startsWith('https://'))) {
        activeSupabaseUrl = 'https://cppybjxvxejeewdxmozl.supabase.co';
      }

      // Check if we can use the Supabase client directly
      const isValidJWT = activeAnonKey && activeAnonKey.split('.').length === 3;
      if (isValidJWT) {
        const activeSupabase = createClient(activeSupabaseUrl, activeAnonKey);
        
        // Use supabase.storage.download from 'amc' bucket
        const { data, error } = await activeSupabase.storage
          .from('amc')
          .download(filename);

        if (error) {
          throw error;
        }

        if (data) {
          const blobUrl = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = suggestedFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          return;
        }
      }
      
      // Fallback: If JWT/AnonKey isn't valid or download fails, open in a new tab
      window.open(url, '_blank');
    } catch (err: any) {
      console.error('Error downloading AMC document:', err);
      window.open(url, '_blank');
    }
  };

  const openAddAMCModal = (asset: Asset | null) => {
    setTargetAssetForAMC(asset);
    const defaultAssetId = asset ? asset.id : (assets[0]?.id || '');
    setAmcForm({
        assetId: defaultAssetId,
        vendorName: '',
        startDate: new Date().toISOString().split('T')[0],
        durationValue: 12,
        durationUnit: 'Months',
        cost: '',
        terms: 'Standard SLA applies. Quarterly maintenance visits required.',
        paymentDuration: 'Annual',
        paymentMethod: '',
        lastServiceDate: '',
        category: 'plumbing'
    });
    setAmcFiles([]);
    setIsAMCModalOpen(true);
  };

  const handleAddAMC = async (e: React.FormEvent) => {
    e.preventDefault();
    const curAssetId = amcForm.assetId;
    const resolvedAsset = assets.find(a => a.id === curAssetId);
    if (!resolvedAsset) return;

    const expiryDate = calculateExpiry(amcForm.startDate, Number(amcForm.durationValue), amcForm.durationUnit);
    const status = determineAMCStatus(expiryDate);

    // Upload files to 'amc' bucket via the backend, which uses the Supabase service role
    // key server-side (bypasses Storage RLS entirely; the anon key is never involved in uploads).
    const uploadedUrls: string[] = [];
    for (const file of amcFiles) {
      try {
        let amcFilename = `${Date.now()}_${file.name}`;
        if (!amcFilename.toLowerCase().endsWith('.pdf')) {
          amcFilename += '.pdf';
        }

        const base64Data = await convertToBase64(file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'amc',
            filename: amcFilename,
            contentBase64: base64Data,
            mimeType: 'application/pdf'
          })
        });
        if (uploadRes.ok) {
          const result = await uploadRes.json();
          uploadedUrls.push(result.url);
        } else {
          console.error('AMC contract file upload failed:', await uploadRes.text());
        }
      } catch (uploadErr) {
        console.error('AMC contract file upload failed:', uploadErr);
      }
    }

    const newAMC: AMC = {
      id: 'amc-' + Math.random().toString(36).substr(2, 9),
      assetId: resolvedAsset.id,
      assetName: resolvedAsset.name,
      vendorName: amcForm.vendorName,
      startDate: amcForm.startDate,
      expiryDate: expiryDate,
      status: status,
      cost: Number(amcForm.cost),
      contractPdfUrl: uploadedUrls[0] || undefined,
      contractPdfUrls: uploadedUrls,
      paymentDuration: amcForm.paymentDuration,
      paymentMethod: amcForm.paymentMethod,
      lastServiceDate: amcForm.lastServiceDate || undefined,
      category: amcForm.category
    };

    setAmcs([...amcs, newAMC]);
    if (onAddAMC) onAddAMC(newAMC);
    setIsAMCModalOpen(false);
    setTargetAssetForAMC(null);
    setActiveTab('AMC'); // Switch to AMC tab to show the new contract
  };

  const filteredAssets = assets.filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()) || a.location.toLowerCase().includes(assetSearch.toLowerCase()));
  const filteredAMCs = amcs.filter(a => a.assetName.toLowerCase().includes(amcSearch.toLowerCase()) || a.vendorName.toLowerCase().includes(amcSearch.toLowerCase()));

  const getActiveAMCForAsset = (assetId: string) => {
      return amcs.find(amc => amc.assetId === assetId && amc.status !== 'Expired');
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AMC & Asset Management</h2>
          <p className="text-sm text-gray-500">Manage infrastructure, track warranties, and contracts.</p>
        </div>
        
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex">
            <button 
                onClick={() => setActiveTab('ASSETS')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'ASSETS' ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <Box className="w-4 h-4" /> Assets Registry
            </button>
            <button 
                onClick={() => setActiveTab('AMC')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${activeTab === 'AMC' ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <ShieldCheck className="w-4 h-4" /> AMC Contracts
            </button>
        </div>
      </div>

      {/* ASSETS TAB */}
      {activeTab === 'ASSETS' && (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search assets by name or location..." 
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <button 
                    onClick={() => { setAssetUploadError(null); setIsAssetModalOpen(true); }}
                    className="ml-4 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Asset
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssets.map(asset => {
                    const activeAMC = getActiveAMCForAsset(asset.id);
                    return (
                        <div key={asset.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition relative group">
                            {/* Update/Edit Button */}
                            <button 
                                onClick={() => setEditingAsset(asset)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-brand-600 hover:bg-brand-50 p-1.5 rounded-full transition"
                                title="Update Asset Details"
                            >
                                <Edit className="w-4 h-4" />
                            </button>

                            <div className="flex justify-between items-start mb-4 pr-8">
                                <div className="bg-gray-100 p-2 rounded-lg">
                                    <Box className="w-6 h-6 text-gray-600" />
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${asset.status === 'Operational' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {asset.status}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">{asset.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">{asset.category} • {asset.location}</p>
                            
                            <div className="space-y-2 text-xs text-gray-600 mb-4">
                                <div className="flex justify-between">
                                    <span>Model No:</span>
                                    <span className="font-medium text-gray-900">{asset.modelNo}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Purchased:</span>
                                    <span className="font-medium text-gray-900">{asset.purchaseDate}</span>
                                </div>
                                {asset.hasWarranty && (
                                    <div className="flex justify-between items-center bg-amber-50 text-amber-800 px-2 py-1.5 rounded-lg border border-amber-100 mt-2 font-medium">
                                        <span>Warranty Card:</span>
                                        {asset.warrantyPdfUrl ? (
                                            <a 
                                                onClick={() => handleDownloadWarranty(asset)} style={{ cursor: "pointer" }} 
                                                
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 underline text-xs ml-1"
                                                title={`Download warranty card for ${asset.name}`}
                                            >
                                                <Download className="w-3.5 h-3.5" /> Download
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 text-[10px]">No document</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                {activeAMC ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-green-700 text-xs font-medium">
                                            <CheckCircle className="w-4 h-4" /> Covered by AMC
                                        </div>
                                        <button 
                                            onClick={() => { setActiveTab('AMC'); setAmcSearch(asset.name); }}
                                            className="text-brand-600 hover:text-brand-800 text-sm font-medium"
                                        >
                                            View AMC
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => openAddAMCModal(asset)}
                                        className="w-full bg-brand-50 hover:bg-brand-100 text-brand-700 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                                    >
                                        <ShieldCheck className="w-4 h-4" /> Add AMC Details
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* AMC TAB */}
      {activeTab === 'AMC' && (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search active contracts..." 
                        value={amcSearch}
                        onChange={(e) => setAmcSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                </div>
                <button 
                    onClick={() => openAddAMCModal(null)}
                    className="ml-4 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2 flex-shrink-0"
                >
                    <Plus className="w-4 h-4" /> New AMC
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAMCs.map((amc) => (
                <div key={amc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                    <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-50 p-2 rounded-lg">
                        <FileText className="w-6 h-6 text-brand-600" />
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        amc.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' :
                        amc.status === 'Expiring Soon' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                        'bg-red-50 text-red-700 border-red-100'
                        }`}>
                        {amc.status}
                        </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{amc.assetName}</h3>
                    <p className="text-sm text-gray-500 mb-4">Vendor: {amc.vendorName}</p>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                        <span>Start Date:</span>
                        <span className="font-medium">{amc.startDate}</span>
                        </div>
                        <div className="flex justify-between">
                        <span>Expires:</span>
                        <span className={`font-medium ${amc.status === 'Expiring Soon' ? 'text-yellow-600' : ''}`}>
                            {amc.expiryDate}
                        </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-100 mt-2">
                        <span>Annual Cost:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(amc.cost)}</span>
                        </div>
                    </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                    <button 
                        onClick={() => setSelectedAMC(amc)}
                        className="text-sm font-medium text-brand-600 hover:text-brand-800"
                    >
                        View Contract
                    </button>
                    {amc.status !== 'Active' && (
                        <button className="text-xs bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
                        Renew
                        </button>
                    )}
                    </div>
                </div>
                ))}
            </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center rounded-t-2xl">
                    <h3 className="font-semibold text-lg text-gray-900">Register New Asset</h3>
                    <button onClick={() => setIsAssetModalOpen(false)} className="text-gray-500 hover:bg-gray-200 p-1 rounded-full transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleAddAsset} className="p-6 space-y-4">
                    {assetUploadError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex gap-2 items-start animate-in fade-in duration-200">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 font-medium">{assetUploadError}</div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                        <input required type="text" value={assetForm.name} onChange={(e) => setAssetForm({...assetForm, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Generator Set A" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <input required type="text" value={assetForm.category} onChange={(e) => setAssetForm({...assetForm, category: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. Electrical" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Model No.</label>
                            <input type="text" value={assetForm.modelNo} onChange={(e) => setAssetForm({...assetForm, modelNo: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="e.g. GEN-2023-X" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <select 
                            required 
                            value={assetForm.location} 
                            onChange={(e) => setAssetForm({...assetForm, location: e.target.value})} 
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                            <option value="Basement 1">Basement 1</option>
                            <option value="Basement 2">Basement 2</option>
                            <option value="Basement 3">Basement 3</option>
                            <option value="Gym">Gym</option>
                            <option value="Swimming Pool">Swimming Pool</option>
                            <option value="Turf 1">Turf 1</option>
                            <option value="Turf 2">Turf 2</option>
                            <option value="Children Play Area">Children Play Area</option>
                            <option value="Games Room">Games Room</option>
                            <option value="Amphi Theatre">Amphi Theatre</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea 
                            value={assetForm.description} 
                            onChange={(e) => setAssetForm({...assetForm, description: e.target.value})} 
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none h-20 resize-none" 
                            placeholder="Describe the asset, its condition, and tracking history..." 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                        <input required type="date" value={assetForm.purchaseDate} onChange={(e) => setAssetForm({...assetForm, purchaseDate: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Under Warranty?</label>
                        <div className="flex gap-6 items-center">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="hasWarranty" 
                                    value="no" 
                                    checked={assetForm.hasWarranty === 'no'} 
                                    onChange={() => setAssetForm({...assetForm, hasWarranty: 'no'})}
                                    className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500" 
                                />
                                No
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="hasWarranty" 
                                    value="yes" 
                                    checked={assetForm.hasWarranty === 'yes'} 
                                    onChange={() => setAssetForm({...assetForm, hasWarranty: 'yes'})}
                                    className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500" 
                                />
                                Yes
                            </label>
                        </div>
                        {assetForm.hasWarranty === 'yes' && (
                            <div className="pt-1 flex items-center gap-3 animate-in fade-in duration-200">
                                <input 
                                    type="file" 
                                    id="warranty-file-upload" 
                                    className="hidden" 
                                    accept="application/pdf"
                                    onChange={(e) => setWarrantyFile(e.target.files?.[0] || null)}
                                />
                                <label 
                                    htmlFor="warranty-file-upload" 
                                    className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-2 shadow-sm"
                                >
                                    <Upload className="w-4 h-4 text-gray-500" />
                                    Upload Warranty Card
                                </label>
                                {warrantyFile && (
                                    <div className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-brand-100 max-w-xs truncate">
                                        <FileText className="w-3.5 h-3.5 flex-shrink-0 text-brand-600" />
                                        <span className="truncate">{warrantyFile.name}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                         <button type="button" onClick={() => setIsAssetModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                         <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-black transition">Add Asset</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center rounded-t-2xl">
                    <h3 className="font-semibold text-lg text-gray-900">Update Asset Details</h3>
                    <button onClick={() => setEditingAsset(null)} className="text-gray-500 hover:bg-gray-200 p-1 rounded-full transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleUpdateAsset} className="p-6 space-y-4">
                     <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
                         <p className="text-xs text-blue-800 font-semibold">Asset ID: {editingAsset.id}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name</label>
                        <input required type="text" value={editingAsset.name} onChange={(e) => setEditingAsset({...editingAsset, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                        <select 
                            value={editingAsset.status}
                            onChange={(e) => setEditingAsset({...editingAsset, status: e.target.value as 'Operational' | 'Down'})}
                            className={`w-full p-2 border rounded-lg text-sm focus:ring-2 outline-none font-medium ${
                                editingAsset.status === 'Operational' ? 'border-green-300 text-green-700 bg-green-50 focus:ring-green-500' : 'border-red-300 text-red-700 bg-red-50 focus:ring-red-500'
                            }`}
                        >
                            <option value="Operational">Operational</option>
                            <option value="Down">Down</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <input required type="text" value={editingAsset.category} onChange={(e) => setEditingAsset({...editingAsset, category: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Model No.</label>
                            <input type="text" value={editingAsset.modelNo} onChange={(e) => setEditingAsset({...editingAsset, modelNo: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input required type="text" value={editingAsset.location} onChange={(e) => setEditingAsset({...editingAsset, location: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                   
                    <div className="pt-4 flex justify-end gap-3">
                         <button type="button" onClick={() => setEditingAsset(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition">Cancel</button>
                         <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Add AMC Modal */}
      {isAMCModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-brand-600 p-4 flex justify-between items-center">
              <div>
                  <h3 className="font-semibold text-lg text-white">Add AMC Details</h3>
                  <p className="text-brand-100 text-xs">Track and organize service contract details</p>
              </div>
              <button onClick={() => setIsAMCModalOpen(false)} className="text-white hover:bg-brand-700 p-1 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAMC} className="p-6 overflow-y-auto space-y-4">
                {/* Asset Dropdown - Only assets without AMC */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Asset Registry Selection</label>
                  <select 
                    required
                    value={amcForm.assetId}
                    onChange={(e) => {
                      const selectedAsset = assets.find(a => a.id === e.target.value);
                      setAmcForm({...amcForm, assetId: e.target.value});
                      if (selectedAsset) {
                        setTargetAssetForAMC(selectedAsset);
                      }
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="" disabled>Select an Asset</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.modelNo}) - {a.location}</option>
                    ))}
                  </select>
                </div>

                {/* Categories and Vendors list */}
                <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                       <select 
                         required
                         value={amcForm.category}
                         onChange={(e) => setAmcForm({...amcForm, category: e.target.value})}
                         className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                       >
                         <option value="plumbing">Plumbing</option>
                         <option value="security">Security</option>
                         <option value="gardening">Gardening</option>
                         <option value="AC">AC</option>
                         <option value="Elevator">Elevator</option>
                         <option value="Club House">Club House</option>
                       </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                      <select 
                        required
                        value={amcForm.vendorName}
                        onChange={(e) => setAmcForm({...amcForm, vendorName: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      >
                        <option value="" disabled>Select a Vendor</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.name}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input 
                            required
                            type="date" 
                            value={amcForm.startDate}
                            onChange={(e) => setAmcForm({...amcForm, startDate: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Annual Cost (₹)</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                            required
                            type="number" 
                            value={amcForm.cost}
                            onChange={(e) => setAmcForm({...amcForm, cost: e.target.value})}
                            className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Contract Duration</label>
                     <div className="flex gap-2">
                        <input 
                          type="number" 
                          min="1"
                          value={amcForm.durationValue}
                          onChange={(e) => setAmcForm({...amcForm, durationValue: Number(e.target.value)})}
                          className="w-1/3 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <select 
                          value={amcForm.durationUnit}
                          onChange={(e) => setAmcForm({...amcForm, durationUnit: e.target.value})}
                          className="w-2/3 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                          <option value="Months">Months</option>
                          <option value="Years">Years</option>
                          <option value="Days">Days</option>
                        </select>
                     </div>
                     <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                       <Clock className="w-3 h-3" />
                       Expires: {calculateExpiry(amcForm.startDate, amcForm.durationValue, amcForm.durationUnit)}
                     </p>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Payment Duration</label>
                     <select 
                       required
                       value={amcForm.paymentDuration}
                       onChange={(e) => setAmcForm({...amcForm, paymentDuration: e.target.value})}
                       className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                     >
                       <option value="Annual">Annual</option>
                       <option value="Quarterly">Quarterly</option>
                       <option value="Monthly">Monthly</option>
                     </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <input 
                      type="text" 
                      value={amcForm.paymentMethod}
                      onChange={(e) => setAmcForm({...amcForm, paymentMethod: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      placeholder="e.g. Bank Transfer, Cheque, UPI"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
                    <input 
                      type="date" 
                      value={amcForm.lastServiceDate}
                      onChange={(e) => setAmcForm({...amcForm, lastServiceDate: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>
                
                {/* Multiple PDF Upload Section */}
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Upload Contract Documents (PDF)</label>
                   <div className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition border-gray-300 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-brand-500 relative">
                      <input 
                        type="file" 
                        id="amc-files-upload" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        accept="application/pdf"
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            const selectedFiles = Array.from(e.target.files);
                            setAmcFiles(prev => [...prev, ...selectedFiles]);
                          }
                        }}
                      />
                      <div className="flex flex-col items-center pointer-events-none text-center">
                         <Upload className="w-8 h-8 text-gray-400 mb-2" />
                         <span className="text-sm font-medium text-gray-600">Click or Drag to Upload Files</span>
                         <span className="text-xs text-gray-400 mt-1">Allows attaching multiple PDF agreements</span>
                      </div>
                   </div>

                   {amcFiles.length > 0 && (
                     <div className="mt-3 space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                       {amcFiles.map((file, idx) => (
                         <div key={idx} className="flex items-center justify-between bg-brand-50 text-brand-700 px-3 py-2 rounded-lg text-xs font-semibold border border-brand-100 shadow-sm animate-in fade-in duration-200">
                           <div className="flex items-center gap-1.5 truncate max-w-[85%]">
                             <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                             <span className="truncate">{file.name}</span>
                             <span className="text-gray-400 font-normal text-[10px]">({(file.size / 1024).toFixed(1)} KB)</span>
                           </div>
                           <button 
                             type="button" 
                             onClick={() => setAmcFiles(prev => prev.filter((_, i) => i !== idx))}
                             className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-full transition flex-shrink-0"
                             title="Remove document"
                           >
                             <X className="w-3.5 h-3.5" />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SLA & Terms</label>
                  <textarea 
                    value={amcForm.terms}
                    onChange={(e) => setAmcForm({...amcForm, terms: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none h-20 resize-none"
                  />
                </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsAMCModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition shadow-sm"
                >
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Contract Modal */}
      {selectedAMC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-brand-600 p-6 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <ShieldCheck className="w-6 h-6 text-yellow-300" />
                   <h3 className="text-xl font-bold">Annual Maintenance Contract</h3>
                </div>
                <p className="opacity-90 text-sm">Contract ID: #AMC-{selectedAMC.id.toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedAMC(null)} className="hover:bg-brand-700 p-1 rounded-full transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-gray-50/50">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Asset</label>
                    <p className="text-lg font-bold text-gray-900">{selectedAMC.assetName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vendor</label>
                    <p className="text-lg font-bold text-gray-900">{selectedAMC.vendorName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</label>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                      selectedAMC.status === 'Active' ? 'bg-green-100 text-green-700' :
                      selectedAMC.status === 'Expiring Soon' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedAMC.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Annual Cost</label>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedAMC.cost)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Contract Period</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium">Start Date</span>
                    </div>
                    <p className="font-medium text-gray-900">{selectedAMC.startDate}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium">Expiry Date</span>
                    </div>
                    <p className="font-medium text-gray-900">{selectedAMC.expiryDate}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-6">
                  <h5 className="font-semibold text-blue-900 mb-2 text-sm">Service Level Agreement (SLA)</h5>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    This contract ensures quarterly preventive maintenance visits and emergency breakdown support within 4 hours. 
                    Parts replacement is covered up to ₹5,000 per instance.
                  </p>
                </div>

                {selectedAMC.contractPdfUrls && selectedAMC.contractPdfUrls.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contract Documents</h5>
                    {selectedAMC.contractPdfUrls.map((url, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between bg-white">
                          <div className="flex items-center gap-3">
                            <div className="bg-red-50 p-2 rounded text-red-600">
                               <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Contract Agreement {index + 1}.pdf</p>
                              <p className="text-xs text-gray-400">PDF Document</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDownloadAMCFile(url, `contract_${selectedAMC.assetName || selectedAMC.id}_doc_${index + 1}.pdf`)} 
                            className="text-brand-600 hover:bg-brand-50 p-2 rounded-full transition"
                          >
                             <Download className="w-4 h-4" />
                          </button>
                      </div>
                    ))}
                  </div>
                ) : selectedAMC.contractPdfUrl ? (
                  <div className="mt-4 border border-gray-200 rounded-lg p-3 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-50 p-2 rounded text-red-600">
                           <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Contract Agreement.pdf</p>
                          <p className="text-xs text-gray-400">PDF Document</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDownloadAMCFile(selectedAMC.contractPdfUrl!, `contract_${selectedAMC.assetName || selectedAMC.id}.pdf`)} 
                        className="text-brand-600 hover:bg-brand-50 p-2 rounded-full transition"
                      >
                         <Download className="w-4 h-4" />
                      </button>
                  </div>
                ) : null}
              </div>
            </div>
            
            <div className="p-4 bg-white border-t border-gray-200 flex justify-end">
              <button 
                className="text-gray-600 hover:text-gray-900 text-sm font-medium px-4 py-2"
                onClick={() => setSelectedAMC(null)}
              >
                Close
              </button>
              <button 
                onClick={() => {
                  if (selectedAMC.contractPdfUrls && selectedAMC.contractPdfUrls.length > 0) {
                    selectedAMC.contractPdfUrls.forEach((url, index) => {
                      handleDownloadAMCFile(url, `contract_${selectedAMC.assetName || selectedAMC.id}_doc_${index + 1}.pdf`);
                    });
                  } else if (selectedAMC.contractPdfUrl) {
                    handleDownloadAMCFile(selectedAMC.contractPdfUrl, `contract_${selectedAMC.assetName || selectedAMC.id}.pdf`);
                  } else {
                    alert('No contract documents found to download.');
                  }
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium ml-2 shadow-sm"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
