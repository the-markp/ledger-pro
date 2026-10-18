import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Default initial seed data
const DEFAULT_COMPANY_PROFILE = {
  companyName: 'Vertex Engineering & Design Consultancy',
  tagline: 'Civil, Structural & MEPFS Engineering Services',
  logoIcon: 'building',
  accentColor: '#4f46e5',
  address: 'Suite 804, Cybergate Center, Ortigas Ave, Pasig City, Philippines',
  contactInfo: 'inquiries@vertexeng.com · +63 (2) 8876-2000',
  tinNumber: 'TIN: 240-891-342-000',
  signatoryName: 'Engr. Roberto D. Cruz, PE',
  signatoryTitle: 'Managing Principal & Senior Consultant',
};

const DEFAULT_USERS = [
  {
    id: 'USR-001',
    username: 'admin',
    fullName: 'Engr. Roberto Cruz, PE',
    pin: '1234',
    role: 'admin',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    lastLoginAt: '2026-10-18T08:00:00.000Z',
  },
  {
    id: 'USR-002',
    username: 'editor',
    fullName: 'Maria Santos (Accountant)',
    pin: '1234',
    role: 'editor',
    isActive: true,
    createdAt: '2026-02-15T08:00:00.000Z',
    lastLoginAt: '2026-10-17T14:30:00.000Z',
  },
  {
    id: 'USR-003',
    username: 'viewer',
    fullName: 'Dave Reyes (Project Auditor)',
    pin: '1234',
    role: 'viewer',
    isActive: true,
    createdAt: '2026-03-01T08:00:00.000Z',
    lastLoginAt: '2026-10-16T11:20:00.000Z',
  },
];

const DEFAULT_TRANSACTIONS = [
  {
    id: 'TRX-2026-001',
    date: '2026-10-16',
    client: 'Apex Industrial Corp',
    projectName: 'Apex High-Bay Logistics Hub',
    ee: 'Engr. D. Reyes (EE-402)',
    pl: 'Engr. J. Santos (PL-110)',
    st: 'Engr. M. Cruz (ST-890)',
    arch: 'Arch. L. Vance (AR-032)',
    ece: 'Engr. K. Tanaka (ECE-221)',
    me: 'Engr. R. Morales (ME-504)',
    others: 'Geotech: Dr. Fernandez',
    purpose: 'Complete MEPFS & Structural Permit Drawings & Sign-off',
    bill: 48500.00,
    printCost: 2850.00,
    totalBill: 51350.00,
    paymentStatus: 'Paid',
    amountPaid: 51350.00,
    balance: 0.00,
    paymentDate: '2026-10-17',
    paymentMethod: 'Bank Transfer (BDO #9821)',
    paymentReference: 'REF-BDO-847291',
    remarks: 'Full payment cleared after city hall stamping. Client requested 5 additional blueprint sets.',
    createdAt: '2026-10-16T08:30:00.000Z',
    updatedAt: '2026-10-17T09:15:00.000Z',
  },
  {
    id: 'TRX-2026-002',
    date: '2026-10-14',
    client: 'Skyline Properties Ltd',
    projectName: 'Skyline Grand Residences Tower B',
    ee: 'Engr. D. Reyes',
    pl: 'Engr. J. Santos',
    st: 'Engr. M. Cruz',
    arch: 'Arch. M. Villanueva',
    ece: 'Engr. K. Tanaka',
    me: 'Engr. R. Morales',
    others: 'Acoustics: SoundLab Inc',
    purpose: 'Detailed Engineering Design (DED) Phase 2 - Electrical & HVAC Revision',
    bill: 32000.00,
    printCost: 1450.00,
    totalBill: 33450.00,
    paymentStatus: 'Partially Paid',
    amountPaid: 20000.00,
    balance: 13450.00,
    paymentDate: '2026-10-15',
    paymentMethod: 'Check',
    paymentReference: 'CHK-0091823',
    remarks: '50% progress billing paid; remaining balance payable upon zoning approval next week.',
    createdAt: '2026-10-14T10:00:00.000Z',
    updatedAt: '2026-10-15T14:20:00.000Z',
  },
  {
    id: 'TRX-2026-003',
    date: '2026-10-12',
    client: 'St. Luke Healthcare Foundation',
    projectName: 'St. Luke Specialty Clinic Expansion',
    ee: 'Engr. D. Reyes',
    pl: 'Engr. J. Santos',
    st: 'Engr. M. Cruz',
    arch: 'Arch. E. Tan',
    ece: 'Engr. K. Tanaka',
    me: 'Engr. R. Morales',
    others: 'Medical Gas: MedTech Phils',
    purpose: 'Medical Gas, HVAC Isolation & Fire Protection Engineering Sign-off',
    bill: 65000.00,
    printCost: 3200.00,
    totalBill: 68200.00,
    paymentStatus: 'Pending',
    amountPaid: 0.00,
    balance: 68200.00,
    remarks: 'Invoice submitted to hospital procurement committee. Standard 30-day corporate terms.',
    createdAt: '2026-10-12T11:00:00.000Z',
    updatedAt: '2026-10-12T11:00:00.000Z',
  },
  {
    id: 'TRX-2026-004',
    date: '2026-10-09',
    client: 'Pioneer Cold Storage Corp',
    projectName: 'Subic Cold Chain Facility Phase 1',
    ee: 'Engr. D. Reyes',
    pl: 'Engr. J. Santos',
    st: 'Engr. M. Cruz',
    arch: 'Arch. L. Vance',
    ece: 'Engr. K. Tanaka',
    me: 'Engr. R. Morales',
    others: 'Refrigeration: Arctic Solutions',
    purpose: 'Heavy Industrial Power Substation & Thermal Envelope Verification',
    bill: 54000.00,
    printCost: 2100.00,
    totalBill: 56100.00,
    paymentStatus: 'Paid',
    amountPaid: 56100.00,
    balance: 0.00,
    paymentDate: '2026-10-11',
    paymentMethod: 'Bank Transfer (Metrobank)',
    paymentReference: 'MB-TXN-884920',
    remarks: 'Payment settled directly by principal investor.',
    createdAt: '2026-10-09T09:00:00.000Z',
    updatedAt: '2026-10-11T16:00:00.000Z',
  },
  {
    id: 'TRX-2026-005',
    date: '2026-09-28',
    client: 'Robinsons Land Commercial',
    projectName: 'Galleria Retail Wing Retrofit',
    ee: 'Engr. D. Reyes',
    pl: 'Engr. J. Santos',
    st: 'Engr. M. Cruz',
    arch: 'Arch. M. Villanueva',
    ece: 'Engr. K. Tanaka',
    me: 'Engr. R. Morales',
    others: 'BMS: Honeywell Phils',
    purpose: 'As-Built Architectural & MEPFS Consolidation & Submission',
    bill: 42000.00,
    printCost: 1950.00,
    totalBill: 43950.00,
    paymentStatus: 'Overdue',
    amountPaid: 0.00,
    balance: 43950.00,
    remarks: 'Followed up with accounts payable; approval pending VP signature.',
    createdAt: '2026-09-28T08:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  }
];

class Database {
  constructor() {
    this.data = {
      transactions: DEFAULT_TRANSACTIONS,
      users: DEFAULT_USERS,
      companyProfile: DEFAULT_COMPANY_PROFILE,
      currency: 'PHP',
      lastUpdated: new Date().toISOString()
    };
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed && Array.isArray(parsed.transactions)) {
          this.data = parsed;
          return;
        }
      }
      this.save();
    } catch (err) {
      console.error('Error initializing database:', err);
    }
  }

  save() {
    try {
      this.data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing database to disk:', err);
    }
  }

  // --- Transactions ---
  getTransactions(query = {}) {
    let result = [...this.data.transactions];
    if (query.status && query.status !== 'All') {
      result = result.filter(t => t.paymentStatus.toLowerCase() === query.status.toLowerCase());
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      result = result.filter(t =>
        t.client.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q)
      );
    }
    return result;
  }

  getTransactionById(id) {
    return this.data.transactions.find(t => t.id === id);
  }

  createTransaction(txData) {
    const id = txData.id || `TRX-${new Date().getFullYear()}-${String(this.data.transactions.length + 1).padStart(3, '0')}`;
    const bill = Number(txData.bill) || 0;
    const printCost = Number(txData.printCost) || 0;
    const totalBill = bill + printCost;
    const amountPaid = Number(txData.amountPaid) || 0;
    const balance = Math.max(0, totalBill - amountPaid);
    
    let paymentStatus = txData.paymentStatus || 'Pending';
    if (amountPaid >= totalBill && totalBill > 0) {
      paymentStatus = 'Paid';
    } else if (amountPaid > 0 && amountPaid < totalBill) {
      paymentStatus = 'Partially Paid';
    }

    const newTx = {
      ...txData,
      id,
      bill,
      printCost,
      totalBill,
      amountPaid,
      balance,
      paymentStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.transactions.unshift(newTx);
    this.save();
    return newTx;
  }

  updateTransaction(id, updateData) {
    const index = this.data.transactions.findIndex(t => t.id === id);
    if (index === -1) return null;

    const current = this.data.transactions[index];
    const bill = updateData.bill !== undefined ? Number(updateData.bill) : current.bill;
    const printCost = updateData.printCost !== undefined ? Number(updateData.printCost) : current.printCost;
    const totalBill = bill + printCost;
    const amountPaid = updateData.amountPaid !== undefined ? Number(updateData.amountPaid) : current.amountPaid;
    const balance = Math.max(0, totalBill - amountPaid);

    let paymentStatus = updateData.paymentStatus || current.paymentStatus;
    if (amountPaid >= totalBill && totalBill > 0) {
      paymentStatus = 'Paid';
    } else if (amountPaid > 0 && amountPaid < totalBill) {
      paymentStatus = 'Partially Paid';
    }

    const updated = {
      ...current,
      ...updateData,
      id,
      bill,
      printCost,
      totalBill,
      amountPaid,
      balance,
      paymentStatus,
      updatedAt: new Date().toISOString()
    };

    this.data.transactions[index] = updated;
    this.save();
    return updated;
  }

  deleteTransaction(id) {
    const index = this.data.transactions.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.data.transactions.splice(index, 1);
    this.save();
    return true;
  }

  recordPayment(id, paymentData) {
    const index = this.data.transactions.findIndex(t => t.id === id);
    if (index === -1) return null;

    const current = this.data.transactions[index];
    const newPaymentAmount = Number(paymentData.amountPaid) || 0;
    const totalPaid = current.amountPaid + newPaymentAmount;
    const balance = Math.max(0, current.totalBill - totalPaid);

    let paymentStatus = 'Partially Paid';
    if (balance === 0 && current.totalBill > 0) {
      paymentStatus = 'Paid';
    } else if (totalPaid === 0) {
      paymentStatus = 'Pending';
    }

    const updated = {
      ...current,
      amountPaid: totalPaid,
      balance,
      paymentStatus,
      paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: paymentData.paymentMethod || current.paymentMethod || 'Bank Transfer',
      paymentReference: paymentData.paymentReference || current.paymentReference || '',
      remarks: paymentData.remarks ? `${current.remarks ? current.remarks + ' | ' : ''}${paymentData.remarks}` : current.remarks,
      updatedAt: new Date().toISOString()
    };

    this.data.transactions[index] = updated;
    this.save();
    return updated;
  }

  // --- Users & Auth ---
  getUsers() {
    return this.data.users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt
    }));
  }

  login(username, pin) {
    const user = this.data.users.find(
      u => u.username.toLowerCase() === username.toLowerCase().trim() && u.pin === pin && u.isActive
    );
    if (!user) return null;

    user.lastLoginAt = new Date().toISOString();
    this.save();

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  createUser(userData) {
    const id = `USR-${String(this.data.users.length + 1).padStart(3, '0')}`;
    const newUser = {
      id,
      username: userData.username.toLowerCase().trim(),
      fullName: userData.fullName.trim(),
      pin: userData.pin || '1234',
      role: userData.role || 'viewer',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id, updateData) {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;
    if (updateData.fullName) user.fullName = updateData.fullName;
    if (updateData.role) user.role = updateData.role;
    if (updateData.isActive !== undefined) user.isActive = updateData.isActive;
    this.save();
    return user;
  }

  deleteUser(id) {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    this.data.users.splice(index, 1);
    this.save();
    return true;
  }

  updatePin(id, newPin) {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return false;
    user.pin = newPin;
    this.save();
    return true;
  }

  // --- Company Profile ---
  getCompany() {
    return this.data.companyProfile;
  }

  updateCompany(newProfile) {
    this.data.companyProfile = {
      ...this.data.companyProfile,
      ...newProfile
    };
    this.save();
    return this.data.companyProfile;
  }

  // --- Backup & Restore ---
  getBackup() {
    return {
      app: 'LedgerPro',
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      currency: this.data.currency,
      companyProfile: this.data.companyProfile,
      users: this.data.users,
      transactions: this.data.transactions
    };
  }

  restoreBackup(backupData) {
    if (!backupData || !Array.isArray(backupData.transactions)) {
      throw new Error('Invalid backup format: missing transactions');
    }
    this.data = {
      transactions: backupData.transactions,
      users: Array.isArray(backupData.users) && backupData.users.length > 0 ? backupData.users : DEFAULT_USERS,
      companyProfile: backupData.companyProfile || DEFAULT_COMPANY_PROFILE,
      currency: backupData.currency || 'PHP',
      lastUpdated: new Date().toISOString()
    };
    this.save();
    return true;
  }

  reset() {
    this.data = {
      transactions: DEFAULT_TRANSACTIONS,
      users: DEFAULT_USERS,
      companyProfile: DEFAULT_COMPANY_PROFILE,
      currency: 'PHP',
      lastUpdated: new Date().toISOString()
    };
    this.save();
    return true;
  }
}

export const db = new Database();
