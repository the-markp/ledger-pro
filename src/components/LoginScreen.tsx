import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  User as UserIcon, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  UserCheck, 
  Compass, 
  HardHat, 
  Cpu, 
  Layers, 
  Briefcase 
} from 'lucide-react';
import { User, UserRole } from '../types/auth';
import { CompanyProfile, LogoIconType } from '../types/transaction';

interface LoginScreenProps {
  users: User[];
  companyProfile: CompanyProfile;
  onLoginSuccess: (user: User) => void;
  onRegisterUser: (newUser: User) => void;
}

const ICON_MAP: Record<LogoIconType, any> = {
  building: Building2,
  compass: Compass,
  'hard-hat': HardHat,
  cpu: Cpu,
  layers: Layers,
  briefcase: Briefcase,
};

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  companyProfile,
  onLoginSuccess,
  onRegisterUser,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  
  // Sign In Form State
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('editor');
  const [regError, setRegError] = useState('');

  const LogoIcon = ICON_MAP[companyProfile.logoIcon] || Building2;

  // Handle standard login
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim().toLowerCase();
    const targetUser = users.find((u) => u.username.toLowerCase() === trimmedUser);

    if (!targetUser) {
      setError('Username not found. Check spelling or register below.');
      return;
    }

    if (!targetUser.isActive) {
      setError('This user account has been disabled. Please contact your system administrator.');
      return;
    }

    if (targetUser.pin !== pin.trim()) {
      setError('Incorrect self-nominated PIN. Please try again.');
      return;
    }

    onLoginSuccess(targetUser);
  };

  // Quick switch for demonstration and fast role testing
  const handleQuickLogin = (uname: string) => {
    const target = users.find((u) => u.username.toLowerCase() === uname.toLowerCase());
    if (target) {
      onLoginSuccess(target);
    }
  };

  // Handle self registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    const cleanUname = regUsername.trim().toLowerCase();
    if (!cleanUname) {
      setRegError('Username is required.');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUname)) {
      setRegError('Username is already taken. Please pick another.');
      return;
    }

    if (!regFullName.trim()) {
      setRegError('Full name is required.');
      return;
    }

    if (regPin.length < 4) {
      setRegError('PIN must be at least 4 digits/characters.');
      return;
    }

    if (regPin !== regConfirmPin) {
      setRegError('PINs do not match.');
      return;
    }

    const newUser: User = {
      id: `USR-${Date.now().toString().slice(-5)}`,
      username: cleanUname,
      fullName: regFullName.trim(),
      pin: regPin.trim(),
      role: regRole,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    onRegisterUser(newUser);
    onLoginSuccess(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      
      {/* Background ambient pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        
        {/* Company Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            {companyProfile.logoUrl ? (
              <img
                src={companyProfile.logoUrl}
                alt="Company Logo"
                className="w-16 h-16 object-contain rounded-2xl bg-white p-2 shadow-xl border border-slate-700"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-950"
                style={{ backgroundColor: companyProfile.accentColor || '#4f46e5' }}
              >
                <LogoIcon className="w-8 h-8" />
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {companyProfile.companyName}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {companyProfile.tagline || 'Engineering & Project Billing System'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
          
          {/* Card Tab switcher */}
          <div className="grid grid-cols-2 border-b border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('signin'); setError(''); }}
              className={`py-3 text-center transition-colors ${
                activeTab === 'signin'
                  ? 'bg-slate-900 text-white border-b-2 border-indigo-500 font-bold'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setRegError(''); }}
              className={`py-3 text-center transition-colors ${
                activeTab === 'register'
                  ? 'bg-slate-900 text-white border-b-2 border-indigo-500 font-bold'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'signin' ? (
              <form onSubmit={handleSignIn} className="space-y-4 text-xs">
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Username</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. admin, editor, or viewer"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-medium">Self-Nominated PIN</label>
                    <span className="text-[11px] text-slate-500">4-6 digits</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      placeholder="Enter your security PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-white font-mono tracking-widest text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Fast One-Click Demo Role Switcher */}
                <div className="pt-4 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                    Quick Demo Logins (PIN: 1234):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('admin')}
                      className="p-2 bg-slate-800 hover:bg-slate-700/80 rounded border border-slate-700/80 text-left transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Admin</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Full Control</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('editor')}
                      className="p-2 bg-slate-800 hover:bg-slate-700/80 rounded border border-slate-700/80 text-left transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Editor</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Add / Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('viewer')}
                      className="p-2 bg-slate-800 hover:bg-slate-700/80 rounded border border-slate-700/80 text-left transition-colors"
                    >
                      <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Viewer</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Read-Only</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
                {regError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>{regError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Desired Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jdelacruz"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Full Name & Position</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan dela Cruz (Project Engineer)"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Account Role</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="editor">Editor (Can record transactions and update payments)</option>
                    <option value="viewer">Viewer (Read-only reports and invoices)</option>
                    <option value="admin">Admin (Full administrative access)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Self-Nominated PIN</label>
                    <input
                      type="password"
                      required
                      placeholder="e.g. 5678"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-white font-mono tracking-widest text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Confirm PIN</label>
                    <input
                      type="password"
                      required
                      placeholder="Confirm PIN"
                      value={regConfirmPin}
                      onChange={(e) => setRegConfirmPin(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-white font-mono tracking-widest text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <span>Register & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Security badge footer */}
        <div className="text-center mt-4 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Role-Based Access Control · PIN Protected</span>
        </div>
      </div>
    </div>
  );
};
