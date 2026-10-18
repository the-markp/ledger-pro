import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { TransactionsTable } from './components/TransactionsTable';
import { WeeklyReport } from './components/WeeklyReport';
import { MonthlyReport } from './components/MonthlyReport';
import { AnalyticsView } from './components/AnalyticsView';
import { TransactionModal } from './components/TransactionModal';
import { PaymentModal } from './components/PaymentModal';
import { ExportModal } from './components/ExportModal';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ChangePinModal } from './components/ChangePinModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { AndroidCompanionModal } from './components/AndroidCompanionModal';
import { LoginScreen } from './components/LoginScreen';
import { Transaction, Currency, PaymentStatus, CompanyProfile, DEFAULT_COMPANY_PROFILE } from './types/transaction';
import { User, INITIAL_USERS, ROLE_PERMISSIONS } from './types/auth';
import { INITIAL_TRANSACTIONS } from './data/seedData';

const STORAGE_KEY = 'ledgerpro_transactions_data';
const CURRENCY_KEY = 'ledgerpro_preferred_currency';
const COMPANY_STORAGE_KEY = 'ledgerpro_company_branding';
const USERS_STORAGE_KEY = 'ledgerpro_registered_users';
const CURRENT_USER_KEY = 'ledgerpro_authenticated_user';

export default function App() {
  // Initialize transactions from localStorage or seed
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load transactions from localStorage', e);
    }
    return INITIAL_TRANSACTIONS;
  });

  // Currency preference (defaults to Philippine Peso 'PHP')
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_KEY);
      if (saved && saved !== 'USD') return saved as Currency;
    } catch {}
    return 'PHP';
  });

  // Company profile & branding preference
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem(COMPANY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.companyName) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_COMPANY_PROFILE;
  });

  // Registered Users (Admin, Editor, Viewer)
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return INITIAL_USERS;
  });

  // Authenticated User Session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.username) {
          return parsed;
        }
      }
    } catch (e) {}
    // Default to admin user for seamless initial onboarding experience
    return INITIAL_USERS[0];
  });

  // Active Navigation Tab
  const [currentTab, setCurrentTab] = useState<'transactions' | 'weekly' | 'monthly' | 'analytics'>('transactions');

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetTransaction, setPaymentTargetTransaction] = useState<Transaction | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);

  // Sync transactions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save transactions to localStorage', e);
    }
  }, [transactions]);

  // Sync currency to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_KEY, currency);
    } catch (e) {}
  }, [currency]);

  // Sync company profile to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(companyProfile));
    } catch (e) {}
  }, [companyProfile]);

  // Sync users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {}
  }, [users]);

  // Sync current user session to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch (e) {}
  }, [currentUser]);

  // Derived existing clients and projects for quick autocomplete
  const existingClients = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.client).filter(Boolean)));
  }, [transactions]);

  const existingProjects = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.projectName).filter(Boolean)));
  }, [transactions]);

  // Auth Handlers
  const handleLoginSuccess = (user: User) => {
    const updatedUser = { ...user, lastLoginAt: new Date().toISOString() };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleRegisterUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
  };

  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleUpdatePin = (newPin: string) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, pin: newPin };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
  };

  // Handler: Save transaction (Add or Edit)
  const handleSaveTransaction = (savedTx: Transaction) => {
    setTransactions((prev) => {
      const idx = prev.findIndex((t) => t.id === savedTx.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedTx;
        return updated;
      }
      return [savedTx, ...prev];
    });
  };

  // Handler: Delete single transaction
  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Handler: Delete multiple transactions
  const handleDeleteMultiple = (ids: string[]) => {
    setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
  };

  // Handler: Batch status update
  const handleBatchStatusUpdate = (ids: string[], status: PaymentStatus) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (!ids.includes(t.id)) return t;
        const total = t.totalBill || 0;
        let amountPaid = t.amountPaid;
        let balance = t.balance;

        if (status === 'Paid') {
          amountPaid = total;
          balance = 0;
        } else if (status === 'Pending') {
          amountPaid = 0;
          balance = total;
        }

        return {
          ...t,
          paymentStatus: status,
          amountPaid,
          balance,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Handler: Open edit
  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setIsTxModalOpen(true);
  };

  // Handler: Open quick payment
  const handleOpenPayment = (t: Transaction) => {
    setPaymentTargetTransaction(t);
    setIsPaymentModalOpen(true);
  };

  // Handler: Mobile App simulation payment
  const handleMobilePayment = (
    transactionId: string,
    amount: number,
    method: string,
    reference: string,
    date: string,
    remarks?: string
  ) => {
    setTransactions(prev =>
      prev.map(t => {
        if (t.id === transactionId) {
          const newPaid = (t.amountPaid || 0) + amount;
          const newBalance = Math.max(0, (t.totalBill || 0) - newPaid);
          const newStatus: PaymentStatus =
            newBalance === 0 ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Pending';
          return {
            ...t,
            amountPaid: newPaid,
            balance: newBalance,
            paymentStatus: newStatus,
            paymentDate: date,
            paymentMethod: method,
            paymentReference: reference,
            remarks: remarks ? `${t.remarks ? t.remarks + ' | ' : ''}${remarks}` : t.remarks,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  // Handler: Reset sample data
  const handleResetSeedData = () => {
    if (window.confirm('Reset all transaction records to sample engineering project dataset?')) {
      setTransactions(INITIAL_TRANSACTIONS);
    }
  };

  // Handler: Backup & Restore Data
  const handleRestoreData = (backupData: {
    transactions?: Transaction[];
    companyProfile?: CompanyProfile;
    users?: User[];
  }) => {
    if (backupData.transactions && Array.isArray(backupData.transactions)) {
      setTransactions(backupData.transactions);
    }
    if (backupData.companyProfile) {
      setCompanyProfile(backupData.companyProfile);
    }
    if (backupData.users && Array.isArray(backupData.users) && backupData.users.length > 0) {
      setUsers(backupData.users);
      // If current user is still in the restored list, update session
      if (currentUser) {
        const found = backupData.users.find((u) => u.id === currentUser.id || u.username === currentUser.username);
        if (found) setCurrentUser(found);
      }
    }
  };

  // If user is logged out, show the clean PIN-protected Login Screen
  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        companyProfile={companyProfile}
        onLoginSuccess={handleLoginSuccess}
        onRegisterUser={handleRegisterUser}
      />
    );
  }

  const permissions = ROLE_PERMISSIONS[currentUser.role];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Header with Custom Company Branding & Role Badges */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currency={currency}
        setCurrency={setCurrency}
        transactions={transactions}
        companyProfile={companyProfile}
        currentUser={currentUser}
        onOpenCompanySettings={() => setIsCompanySettingsOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenChangePin={() => setIsChangePinOpen(true)}
        onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
        onOpenAndroidCompanion={() => setIsAndroidModalOpen(true)}
        onLogout={handleLogout}
        onNewTransaction={() => {
          setEditingTransaction(null);
          setIsTxModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onResetSeedData={handleResetSeedData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'transactions' && (
          <TransactionsTable
            transactions={transactions}
            currency={currency}
            companyProfile={companyProfile}
            currentUser={currentUser}
            onEditTransaction={handleOpenEdit}
            onDeleteTransaction={handleDeleteTransaction}
            onDeleteMultiple={handleDeleteMultiple}
            onOpenPaymentModal={handleOpenPayment}
            onBatchStatusUpdate={handleBatchStatusUpdate}
          />
        )}

        {currentTab === 'weekly' && (
          <WeeklyReport
            transactions={transactions}
            currency={currency}
            companyProfile={companyProfile}
            currentUser={currentUser}
            onEditTransaction={handleOpenEdit}
            onOpenPaymentModal={handleOpenPayment}
          />
        )}

        {currentTab === 'monthly' && (
          <MonthlyReport
            transactions={transactions}
            currency={currency}
            companyProfile={companyProfile}
            currentUser={currentUser}
            onEditTransaction={handleOpenEdit}
            onOpenPaymentModal={handleOpenPayment}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView
            transactions={transactions}
            currency={currency}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{companyProfile.companyName}</span>
            <span>·</span>
            <span>{companyProfile.tagline}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Disciplines: EE, Pl, St, Arch, ECE, ME, Others</span>
            <span>·</span>
            <button
              onClick={() => setIsBackupRestoreOpen(true)}
              className="text-slate-600 hover:text-slate-800 hover:underline cursor-pointer"
            >
              Backup & Restore
            </button>
            {permissions.canEditBranding && (
              <>
                <span>·</span>
                <button
                  onClick={() => setIsCompanySettingsOpen(true)}
                  className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  Edit Branding
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
        initialTransaction={editingTransaction}
        currency={currency}
        existingClients={existingClients}
        existingProjects={existingProjects}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        transaction={paymentTargetTransaction}
        currency={currency}
        onSavePayment={handleSaveTransaction}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        currency={currency}
        companyProfile={companyProfile}
      />

      <CompanySettingsModal
        isOpen={isCompanySettingsOpen}
        onClose={() => setIsCompanySettingsOpen(false)}
        companyProfile={companyProfile}
        onSave={setCompanyProfile}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        users={users}
        currentUser={currentUser}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />

      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
        currentUser={currentUser}
        onUpdatePin={handleUpdatePin}
      />

      <BackupRestoreModal
        isOpen={isBackupRestoreOpen}
        onClose={() => setIsBackupRestoreOpen(false)}
        transactions={transactions}
        companyProfile={companyProfile}
        users={users}
        onRestoreData={handleRestoreData}
        onResetSeedData={handleResetSeedData}
      />

      <AndroidCompanionModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
        transactions={transactions}
        currentUser={currentUser}
        companyProfile={companyProfile}
        currency={currency}
        onRecordPayment={handleMobilePayment}
        onNewTransaction={() => {
          setIsAndroidModalOpen(false);
          setEditingTransaction(null);
          setIsTxModalOpen(true);
        }}
      />
    </div>
  );
}
