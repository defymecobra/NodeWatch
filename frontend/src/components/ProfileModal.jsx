import React, { useState } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const ProfileModal = ({ isOpen, onClose, user, onUpdated }) => {
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }

    const payload = { currentPassword };
    let hasChanges = false;

    if (newEmail.trim() && newEmail.trim() !== user.email) {
      payload.newEmail = newEmail.trim();
      hasChanges = true;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        toast.error('New password must be at least 6 characters');
        return;
      }
      payload.newPassword = newPassword;
      hasChanges = true;
    }

    if (!hasChanges) {
      toast.error('No changes to save');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await client.patch('/auth/profile', payload);
      if (res.data.success) {
        toast.success('Profile updated! Please log in again with new credentials.');
        onUpdated?.(res.data.user);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass-panel p-6 w-full max-w-md mx-4 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">New Login / Email</label>
            <input
              type="text"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave empty to keep current"
              className="w-full px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 outline-none focus:border-brand-500"
            />
          </div>

          <hr className="border-slate-700/50" />

          <div>
            <label className="block text-sm text-slate-300 mb-1">Current Password <span className="text-red-400">*</span></label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required to confirm changes"
              className="w-full px-4 py-2 bg-dark-800 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 outline-none focus:border-brand-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-2.5 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
