import React, { useState, useRef, useEffect } from 'react';
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
  Clock,
  History,
  Terminal,
  RefreshCw,
  Archive
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

interface StoredBackup {
  filename: string;
  sizeKb: string;
  createdAt: string;
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

  const [storedBackups, setStoredBackups] = useState<StoredBackup[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load retained backups from backend
  const fetchStoredBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const res = await fetch('/api/backup/list');
      if (res.ok) {
        const data = await res.json();
        setStoredBackups(data.backups || []);
      }
    } catch (e) {
      // Offline or fallback
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStoredBackups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Trigger automated daily backup run
  const handleTriggerAutomatedBackup = async () => {
    setIsTriggeringBackup(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/backup/automated', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(`Automated backup complete! Saved as ${data.filename} and retained 10 latest snapshots.`);
        fetchStoredBackups();
      } else {
        setError('Server was unable to create automated backup. Check console logs.');
      }
    } catch (e: any) {
      setError(`Failed to trigger automated backup: ${e.message}`);
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  // Create & Download JSON Backup
  const handleDownloadBackup = () => {
    const backupPayload = {
      app: 'LedgerPro',
      version: '2.1.0',
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

    setSuccessMsg('Comprehensive JSON backup downloaded successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // File Upload & Validation for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Invalid file format. Please upload a valid JSON backup file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || (typeof parsed !== 'object')) {
          throw new Error('Backup file does not contain valid JSON data.');
        }

        const txList = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        const usrList = Array.isArray(parsed.users) ? parsed.users : [];
        const comp = parsed.companyProfile?.companyName;

        setPreviewData({
          version: parsed.version || 'Unknown',
          timestamp: parsed.exportedAt || parsed.timestamp,
          transactionsCount: txList.length,
          usersCount: usrList.length,
          companyName: comp,
          raw: parsed,
        });
      } catch (err: any) {
        setError(`Failed to read backup file: ${err.message}`);
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  // Confirm and Execute Restore
  const handleApplyRestore = () => {
    if (!previewData || !previewData.raw) return;

    try {
      const incomingTxs: Transaction[] = previewData.raw.transactions || [];
      const restorePayload: {
        transactions?: Transaction[];
        companyProfile?: CompanyProfile;
        users?: User[];
      } = {};

      if (restoreMode === 'replace') {
        restorePayload.transactions = incomingTxs;
      } else {
        const existingMap = new Map(transactions.map((t) => [t.id, t]));
        incomingTxs.forEach((tx) => {
          existingMap.set(tx.id, tx);
        });
        restorePayload.transactions = Array.from(existingMap.values());
      }

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
                Automated daily snapshots, strict 10-backup retention policy, and instant manual JSON export.
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

          {/* Section 1: Automated Daily Backups with 10-Backup Retention */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-slate-900">Automated Daily Backups & Retention</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700">
                Strict 10-Backup Retention
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              LedgerPro includes automated snapshot scripts (<code className="bg-indigo-100/70 text-indigo-900 px-1 py-0.5 rounded font-mono">scripts/backup.sh</code> and <code className="bg-indigo-100/70 text-indigo-900 px-1 py-0.5 rounded font-mono">scripts/backup.js</code>) that generate daily archives and automatically delete older backups to keep strictly the <strong>10 most recent backups</strong>.
            </p>

            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-slate-500">
                <span>Stored snapshots: </span>
                <strong className="text-slate-800">{storedBackups.length} / 10 retained</strong>
              </div>
              <button
                type="button"
                onClick={handleTriggerAutomatedBackup}
                disabled={isTriggeringBackup}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringBackup ? 'animate-spin' : ''}`} />
                <span>{isTriggeringBackup ? 'Running Backup...' : 'Run Backup & Prune Now'}</span>
              </button>
            </div>

            {/* List of Recent Retained Backups */}
            {storedBackups.length > 0 && (
              <div className="mt-2 pt-2 border-t border-indigo-100/80 space-y-1.5">
                <span className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
                  <Archive className="w-3.5 h-3.5 text-indigo-600" />
                  Recent Retained Backups (Auto-pruned beyond 10)
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 bg-white rounded-lg p-2 border border-indigo-100">
                  {storedBackups.map((b, i) => (
                    <div key={b.filename} className="flex items-center justify-between text-[11px] py-0.5 px-1 hover:bg-indigo-50/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 text-[10px]">#{i + 1}</span>
                        <span className="font-mono text-slate-700">{b.filename}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">{b.sizeKb} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cron Command Instruction */}
            <div className="p-2.5 bg-slate-900 rounded-lg text-slate-300 font-mono text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto">
                <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>0 2 * * * /app/scripts/backup.sh</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 ml-2">Every day at 2:00 AM</span>
            </div>
          </div>

          {/* Section 2: Manual Download JSON Backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Export Manual Backup Archive</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Current Records: <strong>{transactions.length}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={includeUsers}
                  onChange={(e) => setIncludeUsers(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="text-slate-700">Include Authorized Users & Roles</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={includeBranding}
                  onChange={(e) => setIncludeBranding(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="text-slate-700">Include Company Profile & Branding</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup File (.json)</span>
            </button>
          </div>

          {/* Section 3: Restore Backup */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Restore From File</span>
              </h3>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1.5">
                Select LedgerPro Backup File (.json)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            {previewData && (
              <div className="p-3 bg-white rounded-lg border border-slate-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Backup File Contents Verified:</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    v{previewData.version}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Transactions</span>
                    <strong className="text-slate-800 text-xs">{previewData.transactionsCount}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Users</span>
                    <strong className="text-slate-800 text-xs">{previewData.usersCount}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 truncate">
                    <span className="text-slate-500 block">Company</span>
                    <strong className="text-slate-800 text-xs truncate block" title={previewData.companyName}>
                      {previewData.companyName || 'N/A'}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-slate-700 font-medium mb-1">Restore Strategy</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="replace"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                        className="text-indigo-600"
                      />
                      <span>Replace all current records (Clean state)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
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

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleApplyRestore}
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

          {/* Section 4: Reset / Clear Ledger */}
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
