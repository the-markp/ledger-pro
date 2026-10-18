import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Trash2, 
  Edit3, 
  KeyRound, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, UserRole, ROLE_PERMISSIONS } from '../types/auth';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('editor');
  const [formIsActive, setFormIsActive] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormUsername('');
    setFormFullName('');
    setFormPin('1234');
    setFormRole('editor');
    setFormIsActive(true);
    setError('');
  };

  const handleOpenEdit = (user: User) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setFormUsername(user.username);
    setFormFullName(user.fullName);
    setFormPin(user.pin);
    setFormRole(user.role);
    setFormIsActive(user.isActive);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUname = formUsername.trim().toLowerCase();
    if (!cleanUname) {
      setError('Username is required.');
      return;
    }

    if (!formFullName.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!formPin.trim() || formPin.trim().length < 4) {
      setError('PIN must be at least 4 characters/digits.');
      return;
    }

    if (!isEditing) {
      // Check duplicate username
      if (users.some((u) => u.username.toLowerCase() === cleanUname)) {
        setError('A user with this username already exists.');
        return;
      }

      const newUser: User = {
        id: `USR-${Date.now().toString().slice(-5)}`,
        username: cleanUname,
        fullName: formFullName.trim(),
        pin: formPin.trim(),
        role: formRole,
        isActive: formIsActive,
        createdAt: new Date().toISOString(),
      };

      onAddUser(newUser);
      handleOpenAdd();
    } else if (editingUserId) {
      // Update existing
      const existing = users.find((u) => u.id === editingUserId);
      if (!existing) return;

      // Prevent disabling own admin account
      if (existing.id === currentUser.id && !formIsActive) {
        setError('You cannot disable your own active account.');
        return;
      }

      const updated: User = {
        ...existing,
        username: cleanUname,
        fullName: formFullName.trim(),
        pin: formPin.trim(),
        role: formRole,
        isActive: formIsActive,
      };

      onUpdateUser(updated);
      setIsEditing(false);
      setEditingUserId(null);
    }
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser.id) {
      alert('You cannot delete your own logged-in account.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete user @${user.username} (${user.fullName})?`)) {
      onDeleteUser(user.id);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShieldCheck className="w-3 h-3" />
            <span>Administrator</span>
          </span>
        );
      case 'editor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <UserCheck className="w-3 h-3" />
            <span>Editor</span>
          </span>
        );
      case 'viewer':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Lock className="w-3 h-3" />
            <span>Viewer</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                User Management & Access Control
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage accounts, assign roles (Admin, Editor, Viewer), and maintain self-nominated PIN credentials.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* User Form: Add or Edit */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                {isEditing ? <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> : <UserPlus className="w-3.5 h-3.5 text-indigo-600" />}
                <span>{isEditing ? 'Edit User Credentials & Role' : 'Create New User Account'}</span>
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Cancel Edit / Add New
                </button>
              )}
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jdoe"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name & Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe, PE"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Self-Nominated PIN</label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    placeholder="4-6 digits"
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    className="w-full pl-2.5 pr-8 py-1.5 bg-white border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">System Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="admin">Admin (Full Control)</option>
                  <option value="editor">Editor (Record & Bill)</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>

              <div className="md:col-span-4 flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-indigo-600 border-slate-300"
                  />
                  <span>Active user account (allow sign in)</span>
                </label>

                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Save User Changes' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Users List Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Registered Users ({users.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Logged in as: <span className="font-semibold text-slate-700">@{currentUser.username}</span> ({currentUser.role})
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-200 font-semibold">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">PIN</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Permissions Scope</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    const perms = ROLE_PERMISSIONS[u.role];

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center uppercase text-[11px]">
                              {u.username.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{u.fullName}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded font-mono font-normal">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-500">@{u.username}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          {getRoleBadge(u.role)}
                        </td>

                        <td className="p-3 font-mono text-slate-600">
                          <span className="tracking-widest">••••</span>
                        </td>

                        <td className="p-3">
                          {u.isActive ? (
                            <span className="inline-flex items-center text-[11px] font-medium text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-medium text-rose-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-[11px] text-slate-500 max-w-xs truncate">
                          {perms.description}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Edit User or Reset PIN"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(u)}
                              disabled={isSelf}
                              className={`p-1.5 rounded transition-colors ${
                                isSelf
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={isSelf ? 'Cannot delete your own account' : 'Delete User'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Admins have full privileges to edit and remove accounts.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
