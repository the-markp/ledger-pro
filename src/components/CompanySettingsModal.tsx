import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Building2, 
  Compass, 
  HardHat, 
  Cpu, 
  Layers, 
  Briefcase, 
  Check, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { CompanyProfile, DEFAULT_COMPANY_PROFILE, LogoIconType } from '../types/transaction';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyProfile: CompanyProfile;
  onSave: (profile: CompanyProfile) => void;
}

const PRESET_ICONS: { id: LogoIconType; label: string; icon: any }[] = [
  { id: 'building', label: 'Commercial & Structural', icon: Building2 },
  { id: 'compass', label: 'Architecture & Design', icon: Compass },
  { id: 'hard-hat', label: 'Civil & Construction', icon: HardHat },
  { id: 'cpu', label: 'Electrical & ECE', icon: Cpu },
  { id: 'layers', label: 'Blueprints & MEPFS', icon: Layers },
  { id: 'briefcase', label: 'Consultancy Group', icon: Briefcase },
];

const ACCENT_COLORS = [
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Sky Blue', value: '#0284c7' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Slate Dark', value: '#334155' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Crimson', value: '#e11d48' },
];

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  companyProfile,
  onSave,
}) => {
  const [profile, setProfile] = useState<CompanyProfile>(companyProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setProfile(companyProfile);
    }
  }, [isOpen, companyProfile]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo image size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfile((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomLogo = () => {
    setProfile((prev) => ({ ...prev, logoUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset company branding and details to default?')) {
      setProfile(DEFAULT_COMPANY_PROFILE);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    onClose();
  };

  const SelectedIcon = PRESET_ICONS.find((i) => i.id === profile.logoIcon)?.icon || Building2;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Company Branding & Letterhead Settings
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize company name, logo, tax registration, and signatories for official statements & reports.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* Live Preview Card */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              Live Letterhead & Header Preview
            </span>
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                {profile.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt="Company Logo"
                    className="w-12 h-12 object-contain rounded-lg bg-white p-1 border border-slate-700"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-inner"
                    style={{ backgroundColor: profile.accentColor }}
                  >
                    <SelectedIcon className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white leading-tight">
                    {profile.companyName || 'Your Company Name'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {profile.tagline || 'Engineering & Consulting Services'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {profile.tinNumber ? `${profile.tinNumber} · ` : ''}{profile.contactInfo}
                  </p>
                </div>
              </div>

              <div className="hidden sm:block text-right border-l border-slate-800 pl-4 font-mono text-[10px] text-slate-400">
                <span className="text-slate-200 font-semibold block">{profile.signatoryName}</span>
                <span className="block text-slate-400">{profile.signatoryTitle}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Company Logo */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 pb-1 border-b border-slate-200">
              1. Company Logo
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Custom Image Upload */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-semibold text-slate-800 block">Upload Custom Logo</span>
                <p className="text-[11px] text-slate-500">
                  Recommended: Square PNG, SVG, or JPG with transparent or clean background.
                </p>

                <div className="flex items-center gap-3">
                  {profile.logoUrl ? (
                    <div className="relative group">
                      <img
                        src={profile.logoUrl}
                        alt="Uploaded logo"
                        className="w-14 h-14 object-contain rounded-lg bg-white p-1 border border-slate-300 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveCustomLogo}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:bg-rose-700"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400">
                      <Upload className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{profile.logoUrl ? 'Change Logo Image' : 'Choose Logo File'}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preset Icon Alternative */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 block">Preset Icon (If no image)</span>
                  {profile.logoUrl && (
                    <span className="text-[10px] text-slate-400 italic">Custom image active</span>
                  )}
                </div>

                {/* Preset Icon Grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_ICONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = profile.logoIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setProfile({ ...profile, logoIcon: item.id })}
                        className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500 text-indigo-900 font-medium'
                            : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-slate-700" />
                        <span className="text-[10px] leading-tight truncate max-w-full">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Accent Color Picker */}
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1.5">Icon Background Color:</span>
                  <div className="flex items-center gap-2">
                    {ACCENT_COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setProfile({ ...profile, accentColor: col.value })}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          profile.accentColor === col.value ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col.value }}
                        title={col.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Company Info */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 pb-1 border-b border-slate-200">
              2. Company Information
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vertex Engineering & Consultancy"
                  value={profile.companyName}
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Tagline / Industry Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Civil, Structural & MEPFS Engineering"
                  value={profile.tagline}
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Company Office Address</label>
                <input
                  type="text"
                  placeholder="e.g. Suite 804, Cybergate Center, Ortigas Ave, Pasig City"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Contact Info (Phone / Email)</label>
                <input
                  type="text"
                  placeholder="e.g. inquiries@vertexeng.com · +63 (2) 8876-2000"
                  value={profile.contactInfo}
                  onChange={(e) => setProfile({ ...profile, contactInfo: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">TIN / Tax Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. TIN: 240-891-342-000"
                  value={profile.tinNumber}
                  onChange={(e) => setProfile({ ...profile, tinNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Official Signatory */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 pb-1 border-b border-slate-200">
              3. Authorized Signatory (For Billing Statements & Invoices)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Signatory Full Name & Titles</label>
                <input
                  type="text"
                  placeholder="e.g. Engr. Roberto D. Cruz, PE"
                  value={profile.signatoryName}
                  onChange={(e) => setProfile({ ...profile, signatoryName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Signatory Position / Role</label>
                <input
                  type="text"
                  placeholder="e.g. Managing Principal & Senior Consultant"
                  value={profile.signatoryTitle}
                  onChange={(e) => setProfile({ ...profile, signatoryTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Save Company Branding</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
