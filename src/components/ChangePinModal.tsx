import React, { useState } from 'react';
import { X, KeyRound, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '../types/auth';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdatePin: (newPin: string) => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdatePin,
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (currentPin.trim() !== currentUser.pin) {
      setError('Current PIN is incorrect.');
      return;
    }

    if (newPin.trim().length < 4) {
      setError('New PIN must be at least 4 digits/characters.');
      return;
    }

    if (newPin.trim() !== confirmPin.trim()) {
      setError('New PIN and Confirm PIN do not match.');
      return;
    }

    onUpdatePin(newPin.trim());
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Change Self-Nominated PIN</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Account: <span className="font-semibold text-slate-700">@{currentUser.username}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>PIN updated successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-medium mb-1">Current PIN</label>
            <input
              type="password"
              required
              placeholder="Enter current PIN"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-medium">New Self-Nominated PIN</label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPin ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showPin ? 'text' : 'password'}
              required
              placeholder="Min. 4 characters/digits"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Confirm New PIN</label>
            <input
              type={showPin ? 'text' : 'password'}
              required
              placeholder="Re-enter new PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Update PIN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
