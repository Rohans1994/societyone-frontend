import React, { useEffect, useRef, useState } from 'react';
import { Notice } from '../types';
import { BellRing, X, Paperclip, Upload, FileText, User, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AuthedImg } from './AuthedImg';

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const isPdfUrl = (url: string) => url.toLowerCase().includes('.pdf');

export interface NoticeModalLockedTarget {
  uid: string;
  name: string;
  wing?: string;
  apartmentNo?: string;
}

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Second param is true only when the admin checked "Also send via
  // email" — never true for an edit (that checkbox isn't shown then).
  onSubmit: (notice: Notice, sendEmail: boolean) => void;
  editingNotice?: Notice | null;
  storageBucket?: string;
  // When set, this notice is locked to one specific resident (shown as a
  // read-only "To:" line instead of any audience picker) — used when opened
  // from that resident's row in User Management. When omitted, the notice
  // is a broadcast/common notice visible to everyone, same as before.
  lockedTarget?: NoticeModalLockedTarget;
}

// Shared "Post Official Notice" modal used by both Events & Notices (broadcast
// notices) and User Management (notices targeted at one specific resident,
// via lockedTarget). Identical form/fields in both places, plus an optional
// image/PDF attachment.
export const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingNotice = null,
  storageBucket,
  lockedTarget
}) => {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    priority: 'Normal',
    date: new Date().toISOString().split('T')[0],
    createdByName: 'Managing Committee'
  });
  // The already-persisted attachment URL when editing an existing notice
  // (untouched unless the admin picks a new file). A freshly picked file is
  // held locally (not uploaded) until the notice is actually submitted —
  // uploading on file-select would leave an orphaned file in storage if the
  // admin picks an attachment and then cancels without publishing.
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingNotice) {
      setForm({
        title: editingNotice.title,
        description: editingNotice.description,
        category: editingNotice.category || 'General',
        priority: editingNotice.priority || 'Normal',
        date: editingNotice.date,
        createdByName: editingNotice.createdByName || 'Managing Committee'
      });
      setExistingAttachmentUrl(editingNotice.attachmentUrl || '');
    } else {
      setForm({
        title: '',
        description: '',
        category: 'General',
        priority: 'Normal',
        date: new Date().toISOString().split('T')[0],
        createdByName: 'Managing Committee'
      });
      setExistingAttachmentUrl('');
    }
    setAttachmentFile(null);
    setAttachmentPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return '';
    });
    setAttachmentUploadError('');
    setSendEmail(false);
  }, [isOpen, editingNotice]);

  // Just holds the file + a local preview — nothing is uploaded yet. The
  // actual upload only happens in handleSubmit, once the admin actually
  // publishes/saves the notice.
  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentUploadError('');
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachmentFile(file);
    setAttachmentPreviewUrl(URL.createObjectURL(file));
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const uploadAttachment = async (file: File): Promise<string> => {
    const base64Data = await convertToBase64(file);
    const filename = `${Date.now()}_${file.name}`;
    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Society's dedicated bucket if available (falls back to the
        // legacy shared 'assets' bucket), always under a notices/ folder.
        bucket: storageBucket || 'assets',
        filename: `notices/${filename}`,
        contentBase64: base64Data,
        mimeType: file.type || 'application/octet-stream'
      })
    });
    if (!uploadRes.ok) {
      throw new Error('Failed to upload attachment.');
    }
    const result = await uploadRes.json();
    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAttachmentUploadError('');
    try {
      let attachmentUrl = existingAttachmentUrl;
      if (attachmentFile) {
        try {
          attachmentUrl = await uploadAttachment(attachmentFile);
        } catch (err: any) {
          setAttachmentUploadError(err.message || 'Failed to upload attachment.');
          setIsSubmitting(false);
          return;
        }
      }

      onSubmit({
        id: editingNotice ? editingNotice.id : `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...form,
        attachmentUrl: attachmentUrl || '',
        targetUid: lockedTarget?.uid || '',
        targetUserName: lockedTarget?.name || ''
      }, !editingNotice && sendEmail);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditing = Boolean(editingNotice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-amber-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <BellRing className="w-5 h-5" />
            {isEditing
              ? t('editNotice', 'Edit Society Notice')
              : lockedTarget
                ? `${t('sendNoticeTo', 'Send Notice to')} ${lockedTarget.name}`
                : t('createNotice', 'Post Official Notice')}
          </h3>
          <button onClick={onClose} className="text-white hover:bg-amber-700 p-1 rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {lockedTarget && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-800">
              <User className="w-4 h-4 shrink-0" />
              <span>
                {t('noticeToLabel', 'To')}: <strong>{lockedTarget.name}</strong>
                {lockedTarget.wing && (
                  <> ({lockedTarget.wing}{lockedTarget.apartmentNo ? `, Flat ${lockedTarget.apartmentNo}` : ''})</>
                )}
                {' — '}{t('noticePrivateHint', 'only visible to this resident')}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('noticeTitle', 'Notice Title')}</label>
            <input
              type="text"
              required
              placeholder="e.g. Scheduled Water Tank Cleaning - Wing A & B"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('category', 'Category')}</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="General">{t('general', 'General')}</option>
                <option value="Maintenance">{t('maintenance', 'Maintenance')}</option>
                <option value="Urgent">{t('urgent', 'Urgent')}</option>
                <option value="Security">{t('security', 'Security')}</option>
                <option value="Celebration">{t('celebration', 'Celebration')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('priority', 'Priority Level')}</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="Normal">{t('normal', 'Normal')}</option>
                <option value="High">{t('highPriority', 'High Priority')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('issuedBy', 'Issued By')}</label>
            <input
              type="text"
              required
              placeholder="e.g. Managing Committee / Hon. Secretary"
              value={form.createdByName}
              onChange={e => setForm({ ...form, createdByName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">{t('noticeContent', 'Notice Content & Instructions')}</label>
            <textarea
              rows={4}
              required
              placeholder="Provide full announcement details, time windows, contact persons..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Optional image or PDF attachment */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> {t('noticeAttachment', 'Attachment (Image or PDF)')}
            </label>
            <div className="flex items-center gap-3">
              {attachmentFile ? (
                // Freshly picked, not-yet-uploaded file — local preview only.
                attachmentFile.type === 'application/pdf' ? (
                  <div
                    className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-red-500 shrink-0"
                    title={attachmentFile.name}
                  >
                    <FileText className="w-6 h-6" />
                  </div>
                ) : (
                  <img
                    src={attachmentPreviewUrl}
                    alt="Notice attachment"
                    className="w-14 h-14 rounded-lg border border-gray-200 object-cover shrink-0"
                  />
                )
              ) : existingAttachmentUrl && (
                isPdfUrl(existingAttachmentUrl) ? (
                  <a
                    href={existingAttachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-red-500 shrink-0"
                    title="View PDF"
                  >
                    <FileText className="w-6 h-6" />
                  </a>
                ) : (
                  <AuthedImg
                    src={existingAttachmentUrl}
                    alt="Notice attachment"
                    className="w-14 h-14 rounded-lg border border-gray-200 object-cover shrink-0"
                  />
                )
              )}
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {(attachmentFile || existingAttachmentUrl) ? 'Replace Attachment' : 'Upload Attachment'}
              </button>
              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleAttachmentSelect}
                className="hidden"
              />
            </div>
            {attachmentUploadError && (
              <p className="text-[11px] text-red-600 mt-1">{attachmentUploadError}</p>
            )}
          </div>

          {!isEditing && (
            <label className="flex items-center gap-2.5 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                {lockedTarget
                  ? `Also email this notice to ${lockedTarget.name}`
                  : 'Also email this notice to all residents'}
              </span>
            </label>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer disabled:opacity-50"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? (attachmentFile ? 'Uploading...' : 'Saving...')
                : (isEditing ? t('saveChanges', 'Save Changes') : t('publishNotice', 'Publish Notice'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
