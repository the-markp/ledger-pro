import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Server,
  Download,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  Wifi,
  Battery,
  Layers,
  Receipt,
  Plus,
  RefreshCw,
  X,
  CreditCard,
  ShieldCheck,
  Cpu,
  FileCode,
  Terminal,
  Database
} from 'lucide-react';
import { Transaction, Currency, CompanyProfile } from '../types/transaction';
import { User } from '../types/auth';
import { formatCurrency } from '../utils/formatters';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currentUser: User | null;
  companyProfile: CompanyProfile;
  currency: Currency;
  onRecordPayment: (transactionId: string, amount: number, method: string, ref: string, date: string, remarks?: string) => void;
  onNewTransaction: () => void;
}

export const AndroidCompanionModal: React.FC<AndroidCompanionModalProps> = ({
  isOpen,
  onClose,
  transactions,
  currentUser,
  companyProfile,
  currency,
  onRecordPayment,
  onNewTransaction
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'api' | 'source' | 'pwa'>('simulator');
  const [simScreen, setSimScreen] = useState<'dashboard' | 'transactions' | 'payment' | 'server'>('dashboard');
  const [selectedTxId, setSelectedTxId] = useState<string>(transactions[0]?.id || '');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer (BDO)');
  const [paymentRef, setPaymentRef] = useState<string>('REF-MOBILE-991');
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  // Server test state
  const [serverStatus, setServerStatus] = useState<{ online: boolean; checking: boolean; info?: string }>({
    online: true,
    checking: false
  });
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { isInstallable, install } = usePWAInstall();

  // Selected transaction in simulator
  const activeTx = transactions.find(t => t.id === selectedTxId) || transactions[0];

  useEffect(() => {
    if (activeTx && !paymentAmount) {
      setPaymentAmount(String(activeTx.balance));
    }
  }, [activeTx]);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const backendPort = 8001;
  const backendApiUrl = `http://${currentHost}:${backendPort}/api`;
  const emulatorUrl = `http://10.0.2.2:${backendPort}/api`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleSimPayment = () => {
    if (!activeTx) return;
    const amount = Number(paymentAmount) || 0;
    if (amount <= 0) return;
    const today = new Date().toISOString().split('T')[0];
    onRecordPayment(activeTx.id, amount, paymentMethod, paymentRef, today, 'Mobile App payment sync');
    setPaymentSuccessMessage(`₱${amount.toLocaleString()} posted to ${activeTx.client}!`);
    setTimeout(() => {
      setPaymentSuccessMessage(null);
      setSimScreen('dashboard');
    }, 1500);
  };

  // Metrics for mobile dashboard
  const totalBilled = transactions.reduce((acc, t) => acc + t.totalBill, 0);
  const totalPaid = transactions.reduce((acc, t) => acc + t.amountPaid, 0);
  const totalBalance = transactions.reduce((acc, t) => acc + t.balance, 0);
  const overdueCount = transactions.filter(t => t.paymentStatus === 'Overdue').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">LedgerPro Android App & Backend Integration</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Exposed Port: 8001
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                  Port 3304 Conflict-Free
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Native Kotlin / Jetpack Compose Android client & REST API connected to LedgerPro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'simulator'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Live Android Simulator
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'api'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            Backend REST API (Port 8001)
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'source'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Native Android Source Code
          </button>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'pwa'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Install on Android Phone (PWA)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          
          {/* TAB 1: LIVE ANDROID SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Simulator Phone Frame */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-[320px] h-[640px] bg-slate-950 rounded-[40px] border-[6px] border-slate-800 shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-700/50">
                  
                  {/* Punch Hole Camera & Speaker */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 rounded-full z-30 border border-slate-800 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                  </div>

                  {/* Android Status Bar */}
                  <div className="h-7 bg-slate-900 flex items-center justify-between px-6 text-[11px] text-slate-400 font-medium z-20 select-none">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-400 font-bold">5G</span>
                      <Wifi className="w-3 h-3 text-slate-400" />
                      <Battery className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* App Screen Content */}
                  <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto text-slate-100">
                    
                    {/* Top App Bar inside Android */}
                    <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
                          ₱
                        </div>
                        <span className="text-xs font-bold text-slate-100">LedgerPro Mobile</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-emerald-400 font-medium">8001 OK</span>
                      </div>
                    </div>

                    {/* Simulator Views */}
                    {simScreen === 'dashboard' && (
                      <div className="p-3.5 space-y-3">
                        {/* Welcome Card */}
                        <div className="p-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-800/80 border border-slate-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-slate-400">Current Operator</p>
                              <p className="text-xs font-bold text-slate-100">{currentUser?.fullName || 'Engr. Roberto Cruz'}</p>
                            </div>
                            <span className="px-2 py-0.5 text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                              {currentUser?.role?.toUpperCase() || 'ADMIN'}
                            </span>
                          </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                            <p className="text-[10px] text-slate-400">Total Billed</p>
                            <p className="text-xs font-bold text-slate-100 truncate">{formatCurrency(totalBilled, 'PHP')}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                            <p className="text-[10px] text-emerald-400">Collected</p>
                            <p className="text-xs font-bold text-emerald-400 truncate">{formatCurrency(totalPaid, 'PHP')}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                            <p className="text-[10px] text-amber-400">Receivables</p>
                            <p className="text-xs font-bold text-amber-400 truncate">{formatCurrency(totalBalance, 'PHP')}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                            <p className="text-[10px] text-rose-400">Overdue</p>
                            <p className="text-xs font-bold text-rose-400">{overdueCount} Projects</p>
                          </div>
                        </div>

                        {/* Recent Transactions Section */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px] font-semibold text-slate-300">Active Accounts</p>
                            <span className="text-[10px] text-slate-500">{transactions.length} total</span>
                          </div>
                          <div className="space-y-2">
                            {transactions.slice(0, 4).map(tx => (
                              <div
                                key={tx.id}
                                onClick={() => {
                                  setSelectedTxId(tx.id);
                                  setPaymentAmount(String(tx.balance));
                                  setSimScreen('payment');
                                }}
                                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="truncate pr-2">
                                    <p className="text-[11px] font-bold text-slate-200 truncate">{tx.client}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{tx.projectName}</p>
                                  </div>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0 ${
                                    tx.paymentStatus === 'Paid'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : tx.paymentStatus === 'Partially Paid'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : tx.paymentStatus === 'Overdue'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-amber-500/20 text-amber-400'
                                  }`}>
                                    {tx.paymentStatus}
                                  </span>
                                </div>
                                <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                                  <span className="text-slate-500">{tx.id}</span>
                                  <span className={tx.balance > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                                    Bal: {formatCurrency(tx.balance, 'PHP')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Dialog inside Simulator */}
                    {simScreen === 'payment' && (
                      <div className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setSimScreen('dashboard')}
                            className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            ← Back to Dashboard
                          </button>
                          <span className="text-[10px] font-bold text-slate-400">Record Payment</span>
                        </div>

                        {activeTx && (
                          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                            <div>
                              <p className="text-[10px] text-slate-400">Project / Client</p>
                              <p className="text-xs font-bold text-slate-200">{activeTx.client}</p>
                              <p className="text-[10px] text-slate-400 truncate">{activeTx.projectName}</p>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                              <span className="text-[10px] text-slate-400">Total Billed:</span>
                              <span className="text-[11px] font-bold text-slate-200">{formatCurrency(activeTx.totalBill, 'PHP')}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-amber-400">Current Balance:</span>
                              <span className="text-xs font-bold text-amber-400">{formatCurrency(activeTx.balance, 'PHP')}</span>
                            </div>
                          </div>
                        )}

                        {paymentSuccessMessage ? (
                          <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-center space-y-1">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                            <p className="text-xs font-bold text-emerald-400">{paymentSuccessMessage}</p>
                            <p className="text-[10px] text-emerald-300">Synchronized with LedgerPro backend</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] font-medium text-slate-400">Payment Amount (₱ PHP)</label>
                              <input
                                type="number"
                                value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                                className="w-full mt-1 px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPaymentAmount(String(activeTx.balance))}
                                className="py-1 px-2 text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded"
                              >
                                100% Full (₱{activeTx.balance.toLocaleString()})
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentAmount(String(activeTx.balance * 0.5))}
                                className="py-1 px-2 text-[10px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded"
                              >
                                50% Progress
                              </button>
                            </div>

                            <div>
                              <label className="text-[10px] font-medium text-slate-400">Payment Method</label>
                              <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full mt-1 px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                              >
                                <option>Bank Transfer (BDO)</option>
                                <option>Bank Transfer (Metrobank)</option>
                                <option>Bank Transfer (BPI)</option>
                                <option>GCash / Maya</option>
                                <option>Check</option>
                                <option>Cash</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-medium text-slate-400">Reference / Check No.</label>
                              <input
                                type="text"
                                value={paymentRef}
                                onChange={e => setPaymentRef(e.target.value)}
                                className="w-full mt-1 px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none"
                              />
                            </div>

                            <button
                              onClick={handleSimPayment}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                            >
                              Post Payment to Backend
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Server screen inside simulator */}
                    {simScreen === 'server' && (
                      <div className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setSimScreen('dashboard')}
                            className="text-[10px] text-indigo-400 hover:underline"
                          >
                            ← Back
                          </button>
                          <span className="text-[10px] font-bold text-slate-300">Server Status</span>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Exposed Port:</span>
                            <span className="font-mono text-emerald-400 font-bold">8001</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Host DB (Port 3304):</span>
                            <span className="font-mono text-blue-400 font-bold">No Conflict</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">API Endpoint:</span>
                            <span className="font-mono text-slate-300 text-[10px] truncate max-w-[150px]">{backendApiUrl}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Currency:</span>
                            <span className="font-semibold text-slate-200">Philippine Peso (₱)</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Android Bottom Navigation Bar */}
                  <div className="h-12 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-4 z-20">
                    <button
                      onClick={() => setSimScreen('dashboard')}
                      className={`flex flex-col items-center gap-0.5 ${simScreen === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}`}
                    >
                      <Receipt className="w-4 h-4" />
                      <span className="text-[9px]">Dashboard</span>
                    </button>
                    <button
                      onClick={() => setSimScreen('payment')}
                      className={`flex flex-col items-center gap-0.5 ${simScreen === 'payment' ? 'text-indigo-400' : 'text-slate-500'}`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="text-[9px]">Payments</span>
                    </button>
                    <button
                      onClick={() => setSimScreen('server')}
                      className={`flex flex-col items-center gap-0.5 ${simScreen === 'server' ? 'text-indigo-400' : 'text-slate-500'}`}
                    >
                      <Server className="w-4 h-4" />
                      <span className="text-[9px]">Server</span>
                    </button>
                  </div>

                  {/* Android Home Bar Indicator */}
                  <div className="h-4 bg-slate-950 flex items-center justify-center">
                    <div className="w-24 h-1 bg-slate-700 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Explanatory Panel & Quick Actions */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    How the Android App Connects to the Backend
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                    The Android app uses **Retrofit & Coroutines** to communicate over HTTP/HTTPS with the LedgerPro backend on **port 8001**. All transactions, Philippine Peso billings, payment milestones, and user roles are synchronized in real time.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200">System & Database Architecture</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-900 border border-emerald-500/30">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Exposed Port: 8001
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Mapped to container <code className="text-slate-200 font-mono">8001:8001</code> in <code className="text-slate-200 font-mono">docker-compose.yml</code>.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-indigo-500/30">
                      <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                        <Database className="w-4 h-4" />
                        PostgreSQL 16 (Host Port 5433)
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Mapped to host port <code className="text-slate-200 font-mono">5433</code> (avoids conflict with host port 5432). Persistent volume <code className="text-slate-200 font-mono">postgres_data</code>.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-blue-500/30">
                      <div className="flex items-center gap-2 text-blue-400 font-semibold">
                        <Database className="w-4 h-4" />
                        Host Database: Port 3304
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Port 3304 is reserved for your host database instance and is untouched. Zero conflict.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-2">
                  <h4 className="text-xs font-bold text-slate-200">Interactive Simulation Features</h4>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Tap on any project card in the phone frame to record a field payment.</li>
                    <li>Payments posted in the simulator immediately update the main ledger table.</li>
                    <li>Switch roles (Admin, Editor, Viewer) to test role-based permissions on mobile.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BACKEND REST API */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              
              {/* Endpoint URLs */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    REST API Connection Endpoints
                  </h3>
                  <button
                    onClick={() => copyToClipboard(backendApiUrl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                  >
                    {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? 'Copied!' : 'Copy API URL'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 font-medium">Physical Android Device / Local Network</p>
                    <p className="mt-1 font-mono text-emerald-400 font-bold break-all">http://&lt;YOUR_HOST_IP&gt;:8001/api</p>
                    <p className="mt-1 text-[11px] text-slate-500">Use when running APK on a phone connected to the same WiFi</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-slate-400 font-medium">Android Studio Emulator</p>
                    <p className="mt-1 font-mono text-indigo-400 font-bold">{emulatorUrl}</p>
                    <p className="mt-1 text-[11px] text-slate-500">10.0.2.2 automatically loops back to host machine on port 8001</p>
                  </div>
                </div>
              </div>

              {/* Endpoints Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200">Available Backend REST API Endpoints</h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/80 text-slate-300">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Method</th>
                        <th className="py-2.5 px-4 font-semibold">Endpoint</th>
                        <th className="py-2.5 px-4 font-semibold">Description</th>
                        <th className="py-2.5 px-4 font-semibold">Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-300">
                      <tr>
                        <td className="py-2 px-4"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold">GET</span></td>
                        <td className="py-2 px-4 font-mono text-slate-200">/api/status</td>
                        <td className="py-2 px-4">Health & metadata (app name, version, PHP currency, stats)</td>
                        <td className="py-2 px-4 text-emerald-400">Public</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">POST</span></td>
                        <td className="py-2 px-4 font-mono text-slate-200">/api/auth/login</td>
                        <td className="py-2 px-4">Authenticate user via username & 4-digit PIN</td>
                        <td className="py-2 px-4 text-emerald-400">Public</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold">GET</span></td>
                        <td className="py-2 px-4 font-mono text-slate-200">/api/transactions</td>
                        <td className="py-2 px-4">List all project billings with optional ?status and ?search filters</td>
                        <td className="py-2 px-4 text-slate-400">All Roles</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold">POST</span></td>
                        <td className="py-2 px-4 font-mono text-slate-200">/api/transactions</td>
                        <td className="py-2 px-4">Create new project billing with design fee and print costs</td>
                        <td className="py-2 px-4 text-indigo-400">Admin, Editor</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4"><span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">PATCH</span></td>
                        <td className="py-2 px-4 font-mono text-slate-200">/api/transactions/:id/payment</td>
                        <td className="py-2 px-4">Record partial or full payment in ₱, calculate remaining balance</td>
                        <td className="py-2 px-4 text-indigo-400">Admin, Editor</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4"><span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold">GET</span></td>
                        <td className="py-2 px-4 font-mono text-slate-200">/api/company</td>
                        <td className="py-2 px-4">Get company branding, logo, and engineering signatory</td>
                        <td className="py-2 px-4 text-slate-400">All Roles</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4"><span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono font-bold">GET</span></td>
                        <td className="py-2 px-4 font-mono text-slate-200">/api/backup</td>
                        <td className="py-2 px-4">Export complete JSON backup of ledger and users</td>
                        <td className="py-2 px-4 text-rose-400">Admin</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NATIVE ANDROID SOURCE CODE */}
          {activeTab === 'source' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  Native Kotlin / Jetpack Compose Android Architecture
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  The complete Android codebase is organized in the <code className="text-emerald-400 font-mono">/android</code> directory following modern Android Architecture Components (MVVM) and Gradle Version Catalogs.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-slate-300">
                  <p className="text-emerald-400 font-bold mb-2">📁 Directory Structure</p>
                  <p>android/</p>
                  <p>├── build.gradle.kts</p>
                  <p>├── settings.gradle.kts</p>
                  <p>├── gradle/libs.versions.toml</p>
                  <p>├── README.md (Comprehensive Guide)</p>
                  <p>└── app/</p>
                  <p>    ├── build.gradle.kts</p>
                  <p>    └── src/main/</p>
                  <p>        ├── AndroidManifest.xml</p>
                  <p>        └── java/com/ledgerpro/app/</p>
                  <p>            ├── MainActivity.kt</p>
                  <p>            ├── data/api/ (Retrofit)</p>
                  <p>            ├── data/model/ (₱ Data Models)</p>
                  <p>            └── ui/screens/ (Jetpack Compose)</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-sans text-xs">
                  <p className="text-slate-200 font-bold">Quick Build Commands</p>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
                    <p className="text-slate-500"># 1. Open android directory</p>
                    <p className="text-emerald-400">cd android</p>
                    <p className="text-slate-500"># 2. Build debug APK</p>
                    <p className="text-emerald-400">./gradlew assembleDebug</p>
                    <p className="text-slate-500"># 3. Install on connected phone</p>
                    <p className="text-emerald-400">adb install app/build/outputs/apk/debug/app-debug.apk</p>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    See <code className="text-slate-200 font-mono">android/README.md</code> for complete IDE setup instructions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INSTALL ON ANDROID (PWA) */}
          {activeTab === 'pwa' && (
            <div className="max-w-xl mx-auto space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <Smartphone className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Install LedgerPro on Your Android Device</h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  Run LedgerPro as a standalone mobile app on your Android smartphone or tablet without needing Google Play Store.
                </p>
              </div>

              {isInstallable ? (
                <button
                  onClick={install}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install LedgerPro to Android Home Screen
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-left text-xs text-slate-300 space-y-2 max-w-md mx-auto">
                  <p className="font-bold text-slate-200">How to install on Chrome for Android:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Open this URL on your Android device in Google Chrome.</li>
                    <li>Tap the <strong>⋮ (Menu)</strong> button in the top right.</li>
                    <li>Select <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
                    <li>The LedgerPro icon will appear on your phone's home screen and app drawer!</li>
                  </ol>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Backend Port: <strong>8001</strong> · Host DB Port <strong>3304</strong> Isolated</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
