import React, { useState, useRef } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';
import { AuthedImg } from './AuthedImg';
import { Camera, Lock, Save, CheckCircle2, AlertCircle, Home, Mail } from 'lucide-react';

interface MyProfileProps {
  user: User;
  onProfileUpdated: (updates: Partial<User>) => void;
}

type StatusMessage = { type: 'success' | 'error'; text: string } | null;

/**
 * Self-service profile screen, reachable by any role (Resident/WingAdmin/
 * SuperAdmin) by clicking their own avatar/name in the header. Deliberately
 * only allows editing name, avatar, and password — email and Wing/Apartment
 * stay admin-only, since the latter are tied to the Level 2 flat-allocation
 * approval this app already enforces at signup.
 */
export const MyProfile: React.FC<MyProfileProps> = ({ user, onProfileUpdated }) => {
  const [name, setName] = useState(user.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<StatusMessage>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<StatusMessage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<StatusMessage>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSavingName(true);
    setNameMessage(null);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to update name');
      }
      onProfileUpdated({ name: name.trim() });
      setNameMessage({ type: 'success', text: 'Name updated successfully.' });
    } catch (err: any) {
      setNameMessage({ type: 'error', text: err.message || 'Failed to update name' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    setAvatarMessage(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const ext = file.name.split('.').pop() || 'jpg';
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentBase64: base64, mimeType: file.type, fileExtension: ext })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Failed to upload avatar');
      }
      const data = await res.json();
      onProfileUpdated({ avatarUrl: data.avatarUrl });
      setAvatarMessage({ type: 'success', text: 'Profile picture updated.' });
    } catch (err: any) {
      setAvatarMessage({ type: 'error', text: err.message || 'Failed to upload avatar' });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Re-authenticate with the current password first, as a safeguard
      // against changing the password from an already-unlocked/left-open
      // session that isn't actually being used by the account owner.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      if (reauthError) {
        throw new Error('Current password is incorrect.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw new Error(updateError.message);
      }

      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-500">Manage your personal details and account security.</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile Picture</h3>
        <div className="flex items-center gap-4">
          <div className="relative">
            {user.avatarUrl ? (
              <AuthedImg src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-2xl">
                {user.name.charAt(0)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-1 -right-1 bg-brand-600 hover:bg-brand-700 text-white p-1.5 rounded-full shadow-sm transition disabled:opacity-50"
              title="Change profile picture"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <div className="text-xs text-gray-500">
            {isUploadingAvatar ? 'Uploading...' : 'Click the camera icon to upload a new photo (JPG/PNG).'}
          </div>
        </div>
        {avatarMessage && (
          <p className={`text-xs mt-3 flex items-center gap-1 ${avatarMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {avatarMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {avatarMessage.text}
          </p>
        )}
      </div>

      {/* Name + read-only info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Personal Details</h3>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <p className="text-sm text-gray-700 p-2.5 bg-gray-50 rounded-lg border border-gray-100 truncate">{user.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Home className="w-3 h-3" /> Wing & Apartment
              </label>
              <p className="text-sm text-gray-700 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                {user.wing ? `Wing ${user.wing}` : '—'}{user.apartmentNo ? `, ${user.apartmentNo}` : ''}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">Email and Wing/Apartment can only be changed by your society administrator.</p>

          {nameMessage && (
            <p className={`text-xs flex items-center gap-1 ${nameMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {nameMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {nameMessage.text}
            </p>
          )}

          <button
            type="submit"
            disabled={isSavingName || name.trim() === user.name}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> {isSavingName ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" /> Change Password
        </h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                autoComplete="new-password"
              />
            </div>
          </div>

          {passwordMessage && (
            <p className={`text-xs flex items-center gap-1 ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {passwordMessage.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {passwordMessage.text}
            </p>
          )}

          <button
            type="submit"
            disabled={isChangingPassword}
            className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" /> {isChangingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
