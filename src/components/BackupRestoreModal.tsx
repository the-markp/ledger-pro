import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Database, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction, CompanyProfile } from '../types/transaction';
import { User } from '../types/auth';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  companyProfile: CompanyProfile;
  users: User[];
  onRestoreData: (backupData: {
    transactions?: Transaction[];
    companyProfile?: CompanyProfile;
    users?: User[];
  }) => void;
  onResetSeedData: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  transactions,
  companyProfile,
  users,
  onRestoreData,
  onResetSeedData,
}) => {
  const [includeUsers, setIncludeUsers] = useState(true);
  const [includeBranding, setIncludeBranding] = useState(true);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  
  const [previewData, setPreviewData] = useState<{
    version?: string;
    timestamp?: string;
    transactionsCount: number;
    usersCount: number;
    companyName?: string;
    raw: any;
  } | null>(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Create & Download JSON Backup
  const handleDownloadBackup = () => {
    const backupPayload = {
      app: 'LedgerPro',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      companyProfile: includeBranding ? companyProfile : undefined,
      users: includeUsers ? users : undefined,
      transactions: transactions,
      metrics: {
        totalTransactions: transactions.length,
        totalBilled: transactions.reduce((sum, t) => sum + (t.totalBill || 0), 0),
        totalCollected: transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0),
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateFormatted = new Date().toISOString().split('T')[0];
    const safeOrgName = companyProfile.companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `LedgerPro_Backup_${safeOrgName}_${dateFormatted}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setSuccessMsg('Backup package generated and downloaded successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Handle backup file upload and parse preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setPreviewData(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || (!parsed.transactions && !Array.isArray(parsed))) {
          setError('Invalid backup file. Missing transaction data records.');
          return;
        }

        const txList = Array.isArray(parsed) ? parsed : (parsed.transactions || []);
        const uList = parsed.users || [];
        const comp = parsed.companyProfile?.companyName;

        setPreviewData({
          version: parsed.version || '1.0',
          timestamp: parsed.exportedAt || 'Unknown date',
          transactionsCount: txList.length,
          usersCount: uList.length,
          companyName: comp,
          raw: parsed,
        });
      } catch (err) {
        setError('Failed to parse backup file. Please ensure it is a valid JSON document.');
      }
    };
    reader.readAsText(file);
  };

  // Execute restore
  const handleExecuteRestore = () => {
    if (!previewData) return;
    setError('');

    try {
      const incomingTxs: Transaction[] = Array.isArray(previewData.raw)
        ? previewData.raw
        : (previewData.raw.transactions || []);

      let finalTxs: Transaction[] = incomingTxs;
      if (restoreMode === 'merge') {
        const existingMap = new Map<string, Transaction>();
        transactions.forEach((t) => existingMap.set(t.id, t));
        incomingTxs.forEach((t) => existingMap.set(t.id, t));
        finalTxs = Array.from(existingMap.values());
      }

      const restorePayload: {
        transactions: Transaction[];
        companyProfile?: CompanyProfile;
        users?: User[];
      } = {
        transactions: finalTxs,
      };

      if (previewData.raw.companyProfile) {
        restorePayload.companyProfile = previewData.raw.companyProfile;
      }

      if (previewData.raw.users && Array.isArray(previewData.raw.users) && previewData.raw.users.length > 0) {
        restorePayload.users = previewData.raw.users;
      }

      onRestoreData(restorePayload);
      setSuccessMsg(`Successfully restored ${incomingTxs.length} transaction records!`);
      setPreviewData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(`Failed to apply restore: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Backup & Restore System Data
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Download JSON archives of your accounting ledger, user accounts, and company settings.
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
          
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Create Backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Export System Backup</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Current Records: <span className="font-bold text-slate-800">{transactions.length}</span>
              </span>
            </div>

            <p className="text-slate-600">
              Generates a full JSON snapshot of your engineering database, including project details, payment statuses, and financial milestones.
            </p>

            <div className="flex flex-wrap gap-4 text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeBranding}
                  onChange={(e) => setIncludeBranding(e.target.checked)}
                  className="rounded text-indigo-600 border-slate-300"
                />
                <span>Include Company Branding & Signatories</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeUsers}
                  onChange={(e) => setIncludeUsers(e.target.checked)}
                  className="rounded text-indigo-600 border-slate-300"
                />
                <span>Include User Accounts & Roles ({users.length})</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                <FileJson className="w-4 h-4" />
                <span>Download Full JSON Backup</span>
              </button>
            </div>
          </div>

          {/* Section 2: Restore from Backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Restore Database from File</span>
              </h3>
            </div>

            <p className="text-slate-600">
              Upload a previously exported LedgerPro JSON backup file to restore records and system state.
            </p>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                id="backup-file-upload"
              />
              <label
                htmlFor="backup-file-upload"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium cursor-pointer transition-colors shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Select JSON Backup File</span>
              </label>
            </div>

            {/* Backup Preview card */}
            {previewData && (
              <div className="p-3.5 bg-white rounded-lg border border-indigo-200 shadow-xs space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Backup File Verified</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Exported: {new Date(previewData.timestamp || '').toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Transactions</span>
                    <span className="text-sm font-bold text-slate-800">{previewData.transactionsCount}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Users Included</span>
                    <span className="text-sm font-bold text-slate-800">{previewData.usersCount}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Company</span>
                    <span className="text-xs font-semibold text-slate-800 truncate block">
                      {previewData.companyName || 'Not specified'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="font-medium text-slate-700 block">Restore Strategy:</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="replace"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                        className="text-indigo-600"
                      />
                      <span>Replace existing ledger (Clean overwrite)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="merge"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                        className="text-indigo-600"
                      />
                      <span>Merge with existing records</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Restore Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewData(null)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Reset / Clear Ledger */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-900 block">Clear / Reset Ledger Records</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Clears all transaction records and starts with a fresh clean ledger.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all transaction records and reset to an empty ledger?')) {
                  onResetSeedData();
                  setSuccessMsg('Ledger transactions cleared.');
                  setTimeout(() => setSuccessMsg(''), 3000);
                }
              }}
              className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 rounded-lg border border-rose-200 font-medium transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Ledger Data</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
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
