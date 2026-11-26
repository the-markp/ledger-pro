import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Default initial seed data
const DEFAULT_COMPANY_PROFILE = {
  companyName: 'Vertex Engineering & Design Consultancy',
  tagline: 'Civil, Structural & MEPFS Engineering Services',
  logoIcon: 'building',
  logoUrl: undefined,
  logoImage: undefined,
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
    fullName: 'System Administrator',
    pin: '1234',
    role: 'admin',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    lastLoginAt: '2026-10-18T08:00:00.000Z',
  },
];

const DEFAULT_TRANSACTIONS = [];

const ALLOWED_DISCIPLINE_KEYS = ['ee', 'pl', 'st', 'arch', 'ece', 'me', 'solarElectrical', 'others'];

function toSafeNonNegativeAmount(val) {
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Number(n.toFixed(2));
}

function sanitizeDisciplineFees(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const clean = {};
  for (const key of ALLOWED_DISCIPLINE_KEYS) {
    const entry = raw[key];
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const design = toSafeNonNegativeAmount(entry.design);
      const signAndSeal = toSafeNonNegativeAmount(entry.signAndSeal);
      const printing = toSafeNonNegativeAmount(entry.printing);
      if (design > 0 || signAndSeal > 0 || printing > 0) {
        clean[key] = { design, signAndSeal, printing };
      }
    }
  }
  return clean;
}

function sanitizePayments(raw) {
  if (!Array.isArray(raw)) return [];
  const clean = [];
  const limit = Math.min(raw.length, 200);
  for (let i = 0; i < limit; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const amount = toSafeNonNegativeAmount(item.amount);
    if (amount <= 0) continue;
    clean.push({
      id: typeof item.id === 'string' && item.id.trim()
        ? item.id.trim().slice(0, 80)
        : `PAY-${Date.now()}-${i + 1}`,
      amount,
      date: typeof item.date === 'string' && item.date.trim()
        ? item.date.trim().slice(0, 30)
        : new Date().toISOString().split('T')[0],
      method: typeof item.method === 'string' && item.method.trim()
        ? item.method.trim().slice(0, 80)
        : 'Bank Transfer',
      reference: typeof item.reference === 'string' ? item.reference.trim().slice(0, 120) : '',
      remarks: typeof item.remarks === 'string' ? item.remarks.trim().slice(0, 500) : '',
      recordedAt: typeof item.recordedAt === 'string' && item.recordedAt.trim()
        ? item.recordedAt.trim().slice(0, 50)
        : new Date().toISOString()
    });
  }
  return clean;
}

function summarizePayments(totalBill, payments, requestedStatus) {
  const amountPaid = Number(
    payments.reduce((sum, p) => sum + toSafeNonNegativeAmount(p.amount), 0).toFixed(2)
  );
  const balance = Math.max(0, Number((totalBill - amountPaid).toFixed(2)));
  let paymentStatus = requestedStatus || 'Pending';
  if (amountPaid >= totalBill && totalBill > 0) {
    paymentStatus = 'Paid';
  } else if (amountPaid > 0 && amountPaid < totalBill) {
    paymentStatus = requestedStatus === 'Overdue' ? 'Overdue' : 'Partially Paid';
  } else if (amountPaid === 0) {
    paymentStatus = requestedStatus === 'Overdue' ? 'Overdue' : 'Pending';
  }
  const sorted = [...payments].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const latest = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  return {
    amountPaid,
    balance,
    paymentStatus,
    paymentDate: latest ? latest.date : '',
    paymentMethod: latest ? latest.method : '',
    paymentReference: latest ? (latest.reference || '') : ''
  };
}

// Helper: map DB row to Transaction object
function rowToTransaction(r) {
  if (!r) return null;
  let parsedFees = {};
  if (r.discipline_fees && typeof r.discipline_fees === 'object') {
    parsedFees = sanitizeDisciplineFees(r.discipline_fees);
  } else if (typeof r.discipline_fees === 'string') {
    try {
      parsedFees = sanitizeDisciplineFees(JSON.parse(r.discipline_fees));
    } catch {
      parsedFees = {};
    }
  }

  let parsedPayments = [];
  if (Array.isArray(r.payments)) {
    parsedPayments = sanitizePayments(r.payments);
  } else if (typeof r.payments === 'string') {
    try {
      parsedPayments = sanitizePayments(JSON.parse(r.payments));
    } catch {
      parsedPayments = [];
    }
  }

  return {
    id: r.id,
    date: r.date || '',
    client: r.client || '',
    projectName: r.project_name || '',
    ee: r.ee || '',
    pl: r.pl || '',
    st: r.st || '',
    arch: r.arch || '',
    ece: r.ece || '',
    me: r.me || '',
    solarElectrical: r.solar_electrical || '',
    others: r.others || '',
    disciplineFees: parsedFees,
    purpose: r.purpose || '',
    bill: parseFloat(r.bill) || 0,
    printCost: parseFloat(r.print_cost) || 0,
    totalBill: parseFloat(r.total_bill) || 0,
    paymentStatus: r.payment_status || 'Pending',
    amountPaid: parseFloat(r.amount_paid) || 0,
    balance: parseFloat(r.balance) || 0,
    paymentDate: r.payment_date || '',
    paymentMethod: r.payment_method || '',
    paymentReference: r.payment_reference || '',
    payments: parsedPayments,
    remarks: r.remarks || '',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
  };
}

// Helper: map DB row to User object
function rowToUser(r) {
  if (!r) return null;
  return {
    id: r.id,
    username: r.username,
    fullName: r.full_name,
    pin: r.pin,
    role: r.role,
    isActive: Boolean(r.is_active),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined
  };
}

// Helper: map DB row to CompanyProfile object
function rowToCompany(r) {
  if (!r) return DEFAULT_COMPANY_PROFILE;
  const logo = r.logo_image || r.logo_url || undefined;
  return {
    companyName: r.company_name || DEFAULT_COMPANY_PROFILE.companyName,
    tagline: r.tagline || DEFAULT_COMPANY_PROFILE.tagline,
    logoIcon: r.logo_icon || DEFAULT_COMPANY_PROFILE.logoIcon,
    logoUrl: logo,
    logoImage: logo,
    accentColor: r.accent_color || DEFAULT_COMPANY_PROFILE.accentColor,
    address: r.address || DEFAULT_COMPANY_PROFILE.address,
    contactInfo: r.contact_info || DEFAULT_COMPANY_PROFILE.contactInfo,
    tinNumber: r.tin_number || DEFAULT_COMPANY_PROFILE.tinNumber,
    signatoryName: r.signatory_name || DEFAULT_COMPANY_PROFILE.signatoryName,
    signatoryTitle: r.signatory_title || DEFAULT_COMPANY_PROFILE.signatoryTitle
  };
}

class Database {
  constructor() {
    this.isPostgresConnected = false;
    this.pool = null;
    this.data = {
      transactions: [...DEFAULT_TRANSACTIONS],
      users: [...DEFAULT_USERS],
      companyProfile: { ...DEFAULT_COMPANY_PROFILE },
      currency: 'PHP',
      lastUpdated: new Date().toISOString()
    };

    // Load initial JSON fallback state synchronously
    this.initFileStorage();
  }

  initFileStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed && Array.isArray(parsed.transactions)) {
          const DEMO_IDS = ['TRX-2026-001', 'TRX-2026-002', 'TRX-2026-003', 'TRX-2026-004', 'TRX-2026-005'];
          parsed.transactions = parsed.transactions.filter((t) => !DEMO_IDS.includes(t.id));
          if (Array.isArray(parsed.users)) {
            parsed.users = parsed.users.filter((u) => u.username !== 'editor' && u.username !== 'viewer');
            if (parsed.users.length === 0) parsed.users = [...DEFAULT_USERS];
          }
          this.data = parsed;
          this.saveToFile();
          return;
        }
      }
      this.saveToFile();
    } catch (err) {
      console.warn('File storage init notice:', err.message);
    }
  }

  saveToFile() {
    try {
      this.data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing fallback database to disk:', err.message);
    }
  }

  async init() {
    const connectionString = process.env.DATABASE_URL ||
      (process.env.PGHOST ? `postgres://${process.env.PGUSER || 'ledgerpro_user'}:${process.env.PGPASSWORD || 'ledgerpro_password'}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'ledgerpro_db'}` : null);

    if (!connectionString) {
      console.log('ℹ️  No DATABASE_URL or PGHOST specified. Running in file-backed persistence mode.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 10
      });

      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle PostgreSQL client:', err);
      });

      // Test connection
      const client = await this.pool.connect();
      try {
        console.log('🐘 Connected to PostgreSQL database successfully!');
        this.isPostgresConnected = true;

        // Create tables if they do not exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            pin VARCHAR(100) NOT NULL,
            role VARCHAR(50) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            last_login_at TIMESTAMPTZ
          );

          CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(50) PRIMARY KEY,
            date VARCHAR(50),
            client VARCHAR(255) NOT NULL,
            project_name VARCHAR(255) NOT NULL,
            ee VARCHAR(255),
            pl VARCHAR(255),
            st VARCHAR(255),
            arch VARCHAR(255),
            ece VARCHAR(255),
            me VARCHAR(255),
            solar_electrical VARCHAR(255),
            others TEXT,
            discipline_fees JSONB DEFAULT '{}'::jsonb,
            purpose TEXT,
            bill NUMERIC(14,2) DEFAULT 0,
            print_cost NUMERIC(14,2) DEFAULT 0,
            total_bill NUMERIC(14,2) DEFAULT 0,
            payment_status VARCHAR(50) DEFAULT 'Pending',
            amount_paid NUMERIC(14,2) DEFAULT 0,
            balance NUMERIC(14,2) DEFAULT 0,
            payment_date VARCHAR(50),
            payment_method VARCHAR(100),
            payment_reference VARCHAR(100),
            payments JSONB DEFAULT '[]'::jsonb,
            remarks TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          ALTER TABLE transactions ADD COLUMN IF NOT EXISTS solar_electrical VARCHAR(255);
          ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discipline_fees JSONB DEFAULT '{}'::jsonb;
          ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;

          CREATE TABLE IF NOT EXISTS company_profile (
            id INT PRIMARY KEY DEFAULT 1,
            company_name VARCHAR(255) NOT NULL,
            tagline VARCHAR(255),
            logo_icon VARCHAR(100),
            logo_image TEXT,
            accent_color VARCHAR(50),
            address TEXT,
            contact_info TEXT,
            tin_number VARCHAR(100),
            signatory_name VARCHAR(255),
            signatory_title VARCHAR(255),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        // Clean out any legacy demo records if present in PostgreSQL
        await client.query(`DELETE FROM transactions WHERE id IN ('TRX-2026-001', 'TRX-2026-002', 'TRX-2026-003', 'TRX-2026-004', 'TRX-2026-005')`);
        await client.query(`DELETE FROM users WHERE username IN ('editor', 'viewer')`);

        // Seed users if table is empty
        const userCountRes = await client.query('SELECT COUNT(*) FROM users');
        if (parseInt(userCountRes.rows[0].count, 10) === 0) {
          console.log('🌱 Seeding initial users into PostgreSQL...');
          for (const u of DEFAULT_USERS) {
            await client.query(
              `INSERT INTO users (id, username, full_name, pin, role, is_active, created_at, last_login_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO NOTHING`,
              [u.id, u.username, u.fullName, u.pin, u.role, u.isActive, u.createdAt, u.lastLoginAt]
            );
          }
        }

        // Seed transactions if table is empty
        const txCountRes = await client.query('SELECT COUNT(*) FROM transactions');
        if (parseInt(txCountRes.rows[0].count, 10) === 0) {
          console.log('🌱 Seeding initial engineering transactions into PostgreSQL...');
          for (const t of DEFAULT_TRANSACTIONS) {
            await client.query(
              `INSERT INTO transactions (
                id, date, client, project_name, ee, pl, st, arch, ece, me, solar_electrical, others,
                discipline_fees, purpose, bill, print_cost, total_bill, payment_status, amount_paid,
                balance, payment_date, payment_method, payment_reference, payments, remarks,
                created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
              ON CONFLICT (id) DO NOTHING`,
              [
                t.id, t.date, t.client, t.projectName, t.ee, t.pl, t.st, t.arch, t.ece, t.me, t.solarElectrical || '', t.others,
                JSON.stringify(sanitizeDisciplineFees(t.disciplineFees)),
                t.purpose, t.bill, t.printCost, t.totalBill, t.paymentStatus, t.amountPaid,
                t.balance, t.paymentDate || null, t.paymentMethod || null, t.paymentReference || null,
                JSON.stringify(sanitizePayments(t.payments)), t.remarks || null,
                t.createdAt, t.updatedAt
              ]
            );
          }
        }

        // Seed company profile if empty
        const compCountRes = await client.query('SELECT COUNT(*) FROM company_profile');
        if (parseInt(compCountRes.rows[0].count, 10) === 0) {
          console.log('🌱 Seeding default company branding into PostgreSQL...');
          await client.query(
            `INSERT INTO company_profile (
              id, company_name, tagline, logo_icon, logo_image, accent_color, address,
              contact_info, tin_number, signatory_name, signatory_title, updated_at
            ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (id) DO NOTHING`,
            [
              DEFAULT_COMPANY_PROFILE.companyName,
              DEFAULT_COMPANY_PROFILE.tagline,
              DEFAULT_COMPANY_PROFILE.logoIcon,
              DEFAULT_COMPANY_PROFILE.logoImage || null,
              DEFAULT_COMPANY_PROFILE.accentColor,
              DEFAULT_COMPANY_PROFILE.address,
              DEFAULT_COMPANY_PROFILE.contactInfo,
              DEFAULT_COMPANY_PROFILE.tinNumber,
              DEFAULT_COMPANY_PROFILE.signatoryName,
              DEFAULT_COMPANY_PROFILE.signatoryTitle
            ]
          );
        }

        // Sync local cache
        await this.syncCacheFromPostgres();
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('⚠️  Could not connect to PostgreSQL instance. Operating in file-backed persistent mode:', err.message);
      this.isPostgresConnected = false;
      this.pool = null;
    }
  }

  async syncCacheFromPostgres() {
    if (!this.isPostgresConnected || !this.pool) return;
    try {
      const [txRes, usersRes, compRes] = await Promise.all([
        this.pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC'),
        this.pool.query('SELECT * FROM users ORDER BY created_at ASC'),
        this.pool.query('SELECT * FROM company_profile WHERE id = 1 LIMIT 1')
      ]);

      this.data.transactions = txRes.rows.map(rowToTransaction);
      this.data.users = usersRes.rows.map(rowToUser);
      if (compRes.rows.length > 0) {
        this.data.companyProfile = rowToCompany(compRes.rows[0]);
      }
      this.saveToFile();
    } catch (e) {
      console.error('Error syncing cache from PostgreSQL:', e.message);
    }
  }

  // --- Transactions ---
  async getTransactions(query = {}) {
    if (this.isPostgresConnected && this.pool) {
      try {
        let sql = 'SELECT * FROM transactions WHERE 1=1';
        const params = [];
        let paramIdx = 1;

        if (query.status && query.status !== 'All') {
          sql += ` AND LOWER(payment_status) = LOWER($${paramIdx++})`;
          params.push(query.status);
        }

        if (query.client && query.client !== 'ALL') {
          sql += ` AND LOWER(client) = LOWER($${paramIdx++})`;
          params.push(query.client);
        }

        if (query.search) {
          const q = `%${query.search.toLowerCase()}%`;
          sql += ` AND (LOWER(client) LIKE $${paramIdx} OR LOWER(project_name) LIKE $${paramIdx} OR LOWER(id) LIKE $${paramIdx} OR LOWER(purpose) LIKE $${paramIdx} OR LOWER(COALESCE(solar_electrical, '')) LIKE $${paramIdx})`;
          params.push(q);
          paramIdx++;
        }

        sql += ' ORDER BY date DESC, created_at DESC';
        const res = await this.pool.query(sql, params);
        return res.rows.map(rowToTransaction);
      } catch (err) {
        console.error('PostgreSQL getTransactions error:', err.message);
      }
    }

    // Fallback: in-memory / JSON
    let result = [...this.data.transactions];
    if (query.status && query.status !== 'All') {
      result = result.filter(t => t.paymentStatus.toLowerCase() === query.status.toLowerCase());
    }
    if (query.client && query.client !== 'ALL') {
      const targetClient = String(query.client).toLowerCase();
      result = result.filter(t => t.client && t.client.toLowerCase() === targetClient);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      result = result.filter(t =>
        (t.client && t.client.toLowerCase().includes(q)) ||
        (t.projectName && t.projectName.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.purpose && t.purpose.toLowerCase().includes(q)) ||
        (t.solarElectrical && t.solarElectrical.toLowerCase().includes(q))
      );
    }
    return result;
  }

  async getTransactionById(id) {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM transactions WHERE id = $1 LIMIT 1', [id]);
        if (res.rows.length > 0) {
          return rowToTransaction(res.rows[0]);
        }
        return null;
      } catch (err) {
        console.error('PostgreSQL getTransactionById error:', err.message);
      }
    }
    return this.data.transactions.find(t => t.id === id) || null;
  }

  async createTransaction(txData) {
    const id = txData.id || `TRX-${new Date().getFullYear()}-${String(this.data.transactions.length + 1).padStart(3, '0')}`;
    const disciplineFees = sanitizeDisciplineFees(txData.disciplineFees);

    let feeDesign = 0;
    let feeSignSeal = 0;
    let feePrinting = 0;
    for (const key of ALLOWED_DISCIPLINE_KEYS) {
      if (disciplineFees[key]) {
        feeDesign += disciplineFees[key].design;
        feeSignSeal += disciplineFees[key].signAndSeal;
        feePrinting += disciplineFees[key].printing;
      }
    }
    const hasStructuredFees = feeDesign + feeSignSeal + feePrinting > 0;

    const bill = hasStructuredFees
      ? Number((feeDesign + feeSignSeal).toFixed(2))
      : toSafeNonNegativeAmount(txData.bill);
    const printCost = hasStructuredFees
      ? Number(feePrinting.toFixed(2))
      : toSafeNonNegativeAmount(txData.printCost);
    const totalBill = Number((bill + printCost).toFixed(2));

    const now = new Date().toISOString();
    let payments = sanitizePayments(txData.payments);
    const rawAmountPaid = toSafeNonNegativeAmount(txData.amountPaid);

    // If caller sent an initial amountPaid without an explicit payments array, seed the first installment
    if (payments.length === 0 && rawAmountPaid > 0) {
      payments = [
        {
          id: `PAY-${Date.now()}-1`,
          amount: rawAmountPaid,
          date: txData.paymentDate || txData.date || now.split('T')[0],
          method: txData.paymentMethod || 'Bank Transfer',
          reference: txData.paymentReference || '',
          remarks: 'Initial payment',
          recordedAt: now
        }
      ];
    }

    const summary = payments.length > 0
      ? summarizePayments(totalBill, payments, txData.paymentStatus)
      : {
          amountPaid: 0,
          balance: totalBill,
          paymentStatus: txData.paymentStatus === 'Overdue' ? 'Overdue' : 'Pending',
          paymentDate: txData.paymentDate || '',
          paymentMethod: txData.paymentMethod || '',
          paymentReference: txData.paymentReference || ''
        };

    const newTx = {
      ...txData,
      id,
      ee: typeof txData.ee === 'string' ? txData.ee.trim() : '',
      pl: typeof txData.pl === 'string' ? txData.pl.trim() : '',
      st: typeof txData.st === 'string' ? txData.st.trim() : '',
      arch: typeof txData.arch === 'string' ? txData.arch.trim() : '',
      ece: typeof txData.ece === 'string' ? txData.ece.trim() : '',
      me: typeof txData.me === 'string' ? txData.me.trim() : '',
      solarElectrical: typeof txData.solarElectrical === 'string' ? txData.solarElectrical.trim() : '',
      others: typeof txData.others === 'string' ? txData.others.trim() : '',
      disciplineFees,
      payments,
      bill,
      printCost,
      totalBill,
      amountPaid: summary.amountPaid,
      balance: summary.balance,
      paymentStatus: summary.paymentStatus,
      paymentDate: summary.paymentDate || txData.paymentDate || '',
      paymentMethod: summary.paymentMethod || txData.paymentMethod || '',
      paymentReference: summary.paymentReference || txData.paymentReference || '',
      createdAt: now,
      updatedAt: now
    };

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO transactions (
            id, date, client, project_name, ee, pl, st, arch, ece, me, solar_electrical, others,
            discipline_fees, purpose, bill, print_cost, total_bill, payment_status, amount_paid,
            balance, payment_date, payment_method, payment_reference, payments, remarks,
            created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
          [
            newTx.id, newTx.date || now.split('T')[0], newTx.client, newTx.projectName,
            newTx.ee, newTx.pl, newTx.st, newTx.arch, newTx.ece, newTx.me, newTx.solarElectrical, newTx.others,
            JSON.stringify(newTx.disciplineFees),
            newTx.purpose || '', newTx.bill, newTx.printCost, newTx.totalBill, newTx.paymentStatus, newTx.amountPaid,
            newTx.balance, newTx.paymentDate || null, newTx.paymentMethod || null, newTx.paymentReference || null,
            JSON.stringify(newTx.payments), newTx.remarks || null,
            now, now
          ]
        );
      } catch (err) {
        console.error('PostgreSQL createTransaction error:', err.message);
      }
    }

    this.data.transactions.unshift(newTx);
    this.saveToFile();
    return newTx;
  }

  async updateTransaction(id, updateData) {
    const current = await this.getTransactionById(id);
    if (!current) return null;

    const disciplineFees = updateData.disciplineFees !== undefined
      ? sanitizeDisciplineFees(updateData.disciplineFees)
      : sanitizeDisciplineFees(current.disciplineFees);

    let feeDesign = 0;
    let feeSignSeal = 0;
    let feePrinting = 0;
    for (const key of ALLOWED_DISCIPLINE_KEYS) {
      if (disciplineFees[key]) {
        feeDesign += disciplineFees[key].design;
        feeSignSeal += disciplineFees[key].signAndSeal;
        feePrinting += disciplineFees[key].printing;
      }
    }
    const hasStructuredFees = feeDesign + feeSignSeal + feePrinting > 0;

    const bill = hasStructuredFees
      ? Number((feeDesign + feeSignSeal).toFixed(2))
      : (updateData.bill !== undefined ? toSafeNonNegativeAmount(updateData.bill) : current.bill);
    const printCost = hasStructuredFees
      ? Number(feePrinting.toFixed(2))
      : (updateData.printCost !== undefined ? toSafeNonNegativeAmount(updateData.printCost) : current.printCost);
    const totalBill = Number((bill + printCost).toFixed(2));

    const now = new Date().toISOString();
    const hasPaymentsInUpdate = Array.isArray(updateData.payments);
    let payments = hasPaymentsInUpdate
      ? sanitizePayments(updateData.payments)
      : sanitizePayments(current.payments);

    let amountPaid;
    let balance;
    let paymentStatus;
    let paymentDate;
    let paymentMethod;
    let paymentReference;

    if (hasPaymentsInUpdate) {
      const summary = summarizePayments(totalBill, payments, updateData.paymentStatus || current.paymentStatus);
      amountPaid = summary.amountPaid;
      balance = summary.balance;
      paymentStatus = summary.paymentStatus;
      paymentDate = summary.paymentDate;
      paymentMethod = summary.paymentMethod;
      paymentReference = summary.paymentReference;
    } else if (payments.length > 0 && updateData.amountPaid === undefined) {
      const summary = summarizePayments(totalBill, payments, updateData.paymentStatus || current.paymentStatus);
      amountPaid = summary.amountPaid;
      balance = summary.balance;
      paymentStatus = summary.paymentStatus;
      paymentDate = updateData.paymentDate !== undefined ? updateData.paymentDate : summary.paymentDate;
      paymentMethod = updateData.paymentMethod !== undefined ? updateData.paymentMethod : summary.paymentMethod;
      paymentReference = updateData.paymentReference !== undefined ? updateData.paymentReference : summary.paymentReference;
    } else {
      amountPaid = updateData.amountPaid !== undefined ? toSafeNonNegativeAmount(updateData.amountPaid) : current.amountPaid;
      balance = Math.max(0, Number((totalBill - amountPaid).toFixed(2)));
      paymentStatus = updateData.paymentStatus || current.paymentStatus;
      if (amountPaid >= totalBill && totalBill > 0) {
        paymentStatus = 'Paid';
      } else if (amountPaid > 0 && amountPaid < totalBill) {
        paymentStatus = paymentStatus === 'Overdue' ? 'Overdue' : 'Partially Paid';
      } else if (amountPaid === 0) {
        paymentStatus = paymentStatus === 'Overdue' ? 'Overdue' : 'Pending';
      }
      paymentDate = updateData.paymentDate !== undefined ? updateData.paymentDate : current.paymentDate;
      paymentMethod = updateData.paymentMethod !== undefined ? updateData.paymentMethod : current.paymentMethod;
      paymentReference = updateData.paymentReference !== undefined ? updateData.paymentReference : current.paymentReference;
    }

    const updated = {
      ...current,
      ...updateData,
      id,
      solarElectrical: updateData.solarElectrical !== undefined
        ? String(updateData.solarElectrical || '').trim()
        : (current.solarElectrical || ''),
      disciplineFees,
      payments,
      bill,
      printCost,
      totalBill,
      amountPaid,
      balance,
      paymentStatus,
      paymentDate: paymentDate || '',
      paymentMethod: paymentMethod || '',
      paymentReference: paymentReference || '',
      updatedAt: now
    };

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE transactions SET
            date = $1, client = $2, project_name = $3, ee = $4, pl = $5, st = $6,
            arch = $7, ece = $8, me = $9, solar_electrical = $10, others = $11, discipline_fees = $12,
            purpose = $13, bill = $14, print_cost = $15, total_bill = $16, payment_status = $17,
            amount_paid = $18, balance = $19, payment_date = $20, payment_method = $21,
            payment_reference = $22, payments = $23, remarks = $24, updated_at = $25
          WHERE id = $26`,
          [
            updated.date, updated.client, updated.projectName, updated.ee, updated.pl, updated.st,
            updated.arch, updated.ece, updated.me, updated.solarElectrical, updated.others,
            JSON.stringify(updated.disciplineFees), updated.purpose, updated.bill,
            updated.printCost, updated.totalBill, updated.paymentStatus, updated.amountPaid,
            updated.balance, updated.paymentDate || null, updated.paymentMethod || null, updated.paymentReference || null,
            JSON.stringify(updated.payments), updated.remarks || null, now, id
          ]
        );
      } catch (err) {
        console.error('PostgreSQL updateTransaction error:', err.message);
      }
    }

    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.transactions[idx] = updated;
    }
    this.saveToFile();
    return updated;
  }

  async deleteTransaction(id) {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('DELETE FROM transactions WHERE id = $1', [id]);
        if (res.rowCount === 0) return false;
      } catch (err) {
        console.error('PostgreSQL deleteTransaction error:', err.message);
      }
    }

    const index = this.data.transactions.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.data.transactions.splice(index, 1);
    this.saveToFile();
    return true;
  }

  async recordPayment(id, paymentData) {
    const current = await this.getTransactionById(id);
    if (!current) return null;

    const newPaymentAmount = toSafeNonNegativeAmount(paymentData.amountPaid ?? paymentData.amount);
    if (newPaymentAmount <= 0) return null;

    const now = new Date().toISOString();
    let existingPayments = sanitizePayments(current.payments);

    // Preserve any legacy lump-sum amountPaid as the first recorded payment before appending
    if (existingPayments.length === 0 && (Number(current.amountPaid) || 0) > 0) {
      existingPayments.push({
        id: `PAY-LEGACY-${current.id}`,
        amount: toSafeNonNegativeAmount(current.amountPaid),
        date: current.paymentDate || current.date || now.split('T')[0],
        method: current.paymentMethod || 'Bank Transfer',
        reference: current.paymentReference || '',
        remarks: 'Previous recorded payment',
        recordedAt: current.updatedAt || current.createdAt || now
      });
    }

    const newEntry = {
      id: typeof paymentData.id === 'string' && paymentData.id.trim()
        ? paymentData.id.trim().slice(0, 80)
        : `PAY-${Date.now()}-${existingPayments.length + 1}`,
      amount: newPaymentAmount,
      date: typeof paymentData.paymentDate === 'string' && paymentData.paymentDate.trim()
        ? paymentData.paymentDate.trim().slice(0, 30)
        : (typeof paymentData.date === 'string' && paymentData.date.trim()
            ? paymentData.date.trim().slice(0, 30)
            : now.split('T')[0]),
      method: typeof paymentData.paymentMethod === 'string' && paymentData.paymentMethod.trim()
        ? paymentData.paymentMethod.trim().slice(0, 80)
        : (typeof paymentData.method === 'string' && paymentData.method.trim()
            ? paymentData.method.trim().slice(0, 80)
            : 'Bank Transfer'),
      reference: typeof paymentData.paymentReference === 'string'
        ? paymentData.paymentReference.trim().slice(0, 120)
        : (typeof paymentData.reference === 'string' ? paymentData.reference.trim().slice(0, 120) : ''),
      remarks: typeof paymentData.remarks === 'string' ? paymentData.remarks.trim().slice(0, 500) : '',
      recordedAt: now
    };

    const nextPayments = [...existingPayments, newEntry];
    const summary = summarizePayments(current.totalBill, nextPayments, current.paymentStatus);

    const updated = {
      ...current,
      payments: nextPayments,
      amountPaid: summary.amountPaid,
      balance: summary.balance,
      paymentStatus: summary.paymentStatus,
      paymentDate: summary.paymentDate,
      paymentMethod: summary.paymentMethod,
      paymentReference: summary.paymentReference,
      updatedAt: now
    };

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE transactions SET
            amount_paid = $1, balance = $2, payment_status = $3, payment_date = $4,
            payment_method = $5, payment_reference = $6, payments = $7, updated_at = $8
          WHERE id = $9`,
          [
            updated.amountPaid, updated.balance, updated.paymentStatus, updated.paymentDate || null,
            updated.paymentMethod || null, updated.paymentReference || null,
            JSON.stringify(updated.payments), now, id
          ]
        );
      } catch (err) {
        console.error('PostgreSQL recordPayment error:', err.message);
      }
    }

    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.transactions[idx] = updated;
    }
    this.saveToFile();
    return updated;
  }

  async deletePayment(id, paymentId) {
    const current = await this.getTransactionById(id);
    if (!current) return null;

    const existingPayments = sanitizePayments(current.payments);
    const nextPayments = existingPayments.filter(p => p.id !== paymentId);
    const summary = summarizePayments(current.totalBill, nextPayments, current.paymentStatus);
    const now = new Date().toISOString();

    const updated = {
      ...current,
      payments: nextPayments,
      amountPaid: summary.amountPaid,
      balance: summary.balance,
      paymentStatus: summary.paymentStatus,
      paymentDate: summary.paymentDate,
      paymentMethod: summary.paymentMethod,
      paymentReference: summary.paymentReference,
      updatedAt: now
    };

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `UPDATE transactions SET
            amount_paid = $1, balance = $2, payment_status = $3, payment_date = $4,
            payment_method = $5, payment_reference = $6, payments = $7, updated_at = $8
          WHERE id = $9`,
          [
            updated.amountPaid, updated.balance, updated.paymentStatus, updated.paymentDate || null,
            updated.paymentMethod || null, updated.paymentReference || null,
            JSON.stringify(updated.payments), now, id
          ]
        );
      } catch (err) {
        console.error('PostgreSQL deletePayment error:', err.message);
      }
    }

    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.transactions[idx] = updated;
    }
    this.saveToFile();
    return updated;
  }

  // --- Users & Auth ---
  async getUsers() {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT id, username, full_name, pin, role, is_active, created_at, last_login_at FROM users ORDER BY created_at ASC');
        return res.rows.map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          pin: u.pin,
          role: u.role,
          isActive: u.is_active,
          createdAt: u.created_at ? new Date(u.created_at).toISOString() : undefined,
          lastLoginAt: u.last_login_at ? new Date(u.last_login_at).toISOString() : undefined
        }));
      } catch (err) {
        console.error('PostgreSQL getUsers error:', err.message);
      }
    }

    return this.data.users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      pin: u.pin,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt
    }));
  }

  async login(username, pin) {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND pin = $2 AND is_active = TRUE LIMIT 1',
          [username.trim(), String(pin)]
        );
        if (res.rows.length > 0) {
          const user = rowToUser(res.rows[0]);
          const now = new Date().toISOString();
          await this.pool.query('UPDATE users SET last_login_at = $1 WHERE id = $2', [now, user.id]);
          user.lastLoginAt = now;
          return {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastLoginAt: now
          };
        }
        return null;
      } catch (err) {
        console.error('PostgreSQL login error:', err.message);
      }
    }

    const user = this.data.users.find(
      u => u.username.toLowerCase() === username.toLowerCase().trim() && u.pin === pin && u.isActive
    );
    if (!user) return null;
    user.lastLoginAt = new Date().toISOString();
    this.saveToFile();
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

  async createUser(userData) {
    const id = `USR-${String(this.data.users.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const newUser = {
      id,
      username: userData.username.toLowerCase().trim(),
      fullName: userData.fullName.trim(),
      pin: userData.pin || '1234',
      role: userData.role || 'viewer',
      isActive: true,
      createdAt: now,
      lastLoginAt: undefined
    };

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO users (id, username, full_name, pin, role, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newUser.id, newUser.username, newUser.fullName, newUser.pin, newUser.role, newUser.isActive, now]
        );
      } catch (err) {
        console.error('PostgreSQL createUser error:', err.message);
      }
    }

    this.data.users.push(newUser);
    this.saveToFile();
    return newUser;
  }

  async updateUser(id, updateData) {
    if (this.isPostgresConnected && this.pool) {
      try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (updateData.fullName) {
          fields.push(`full_name = $${idx++}`);
          values.push(updateData.fullName);
        }
        if (updateData.role) {
          fields.push(`role = $${idx++}`);
          values.push(updateData.role);
        }
        if (updateData.isActive !== undefined) {
          fields.push(`is_active = $${idx++}`);
          values.push(Boolean(updateData.isActive));
        }

        if (fields.length > 0) {
          values.push(id);
          const res = await this.pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
          );
          if (res.rows.length > 0) {
            const updated = rowToUser(res.rows[0]);
            const i = this.data.users.findIndex(u => u.id === id);
            if (i !== -1) this.data.users[i] = updated;
            this.saveToFile();
            return updated;
          }
        }
      } catch (err) {
        console.error('PostgreSQL updateUser error:', err.message);
      }
    }

    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;
    if (updateData.fullName) user.fullName = updateData.fullName;
    if (updateData.role) user.role = updateData.role;
    if (updateData.isActive !== undefined) user.isActive = updateData.isActive;
    this.saveToFile();
    return user;
  }

  async deleteUser(id) {
    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
      } catch (err) {
        console.error('PostgreSQL deleteUser error:', err.message);
      }
    }

    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    this.data.users.splice(index, 1);
    this.saveToFile();
    return true;
  }

  async updatePin(id, newPin) {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('UPDATE users SET pin = $1 WHERE id = $2', [String(newPin), id]);
        if (res.rowCount === 0) return false;
      } catch (err) {
        console.error('PostgreSQL updatePin error:', err.message);
      }
    }

    const user = this.data.users.find(u => u.id === id);
    if (!user) return false;
    user.pin = newPin;
    this.saveToFile();
    return true;
  }

  // --- Company Profile ---
  async getCompany() {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM company_profile WHERE id = 1 LIMIT 1');
        if (res.rows.length > 0) {
          return rowToCompany(res.rows[0]);
        }
      } catch (err) {
        console.error('PostgreSQL getCompany error:', err.message);
      }
    }
    return this.data.companyProfile;
  }

  async updateCompany(newProfile) {
    const logo = newProfile.logoUrl !== undefined ? newProfile.logoUrl : (newProfile.logoImage !== undefined ? newProfile.logoImage : this.data.companyProfile.logoUrl);
    const updated = {
      ...this.data.companyProfile,
      ...newProfile,
      logoUrl: logo || undefined,
      logoImage: logo || undefined
    };

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO company_profile (
            id, company_name, tagline, logo_icon, logo_image, accent_color,
            address, contact_info, tin_number, signatory_name, signatory_title, updated_at
          ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (id) DO UPDATE SET
            company_name = EXCLUDED.company_name,
            tagline = EXCLUDED.tagline,
            logo_icon = EXCLUDED.logo_icon,
            logo_image = EXCLUDED.logo_image,
            accent_color = EXCLUDED.accent_color,
            address = EXCLUDED.address,
            contact_info = EXCLUDED.contact_info,
            tin_number = EXCLUDED.tin_number,
            signatory_name = EXCLUDED.signatory_name,
            signatory_title = EXCLUDED.signatory_title,
            updated_at = NOW()`,
          [
            updated.companyName || DEFAULT_COMPANY_PROFILE.companyName,
            updated.tagline || '',
            updated.logoIcon || 'building',
            updated.logoUrl || updated.logoImage || null,
            updated.accentColor || '#4f46e5',
            updated.address || '',
            updated.contactInfo || '',
            updated.tinNumber || '',
            updated.signatoryName || '',
            updated.signatoryTitle || ''
          ]
        );
      } catch (err) {
        console.error('PostgreSQL updateCompany error:', err.message);
      }
    }

    this.data.companyProfile = updated;
    this.saveToFile();
    return updated;
  }

  // --- Stats ---
  async getStats() {
    let txCount = this.data.transactions.length;
    let uCount = this.data.users.length;
    let companyName = this.data.companyProfile.companyName;

    if (this.isPostgresConnected && this.pool) {
      try {
        const [tc, uc, cp] = await Promise.all([
          this.pool.query('SELECT COUNT(*) FROM transactions'),
          this.pool.query('SELECT COUNT(*) FROM users'),
          this.pool.query('SELECT company_name FROM company_profile WHERE id = 1 LIMIT 1')
        ]);
        txCount = parseInt(tc.rows[0].count, 10);
        uCount = parseInt(uc.rows[0].count, 10);
        if (cp.rows.length > 0) companyName = cp.rows[0].company_name;
      } catch (e) {
        console.error('PostgreSQL getStats error:', e.message);
      }
    }

    return {
      transactionsCount: txCount,
      usersCount: uCount,
      companyName,
      currency: this.data.currency || 'PHP'
    };
  }

  // --- Backup & Restore ---
  async getBackup() {
    const transactions = await this.getTransactions();
    const users = await this.getUsers();
    const companyProfile = await this.getCompany();

    return {
      app: 'LedgerPro',
      version: '2.1.0',
      database: this.isPostgresConnected ? 'PostgreSQL' : 'JSON',
      exportedAt: new Date().toISOString(),
      currency: this.data.currency || 'PHP',
      companyProfile,
      users,
      transactions
    };
  }

  async restoreBackup(backupData) {
    if (!backupData || !Array.isArray(backupData.transactions)) {
      throw new Error('Invalid backup format: missing transactions');
    }

    const txs = backupData.transactions;
    const users = Array.isArray(backupData.users) && backupData.users.length > 0 ? backupData.users : DEFAULT_USERS;
    const company = backupData.companyProfile || DEFAULT_COMPANY_PROFILE;
    const currency = backupData.currency || 'PHP';

    if (this.isPostgresConnected && this.pool) {
      try {
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM transactions');
          await client.query('DELETE FROM users');

          for (const u of users) {
            await client.query(
              `INSERT INTO users (id, username, full_name, pin, role, is_active, created_at, last_login_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO UPDATE SET
                 username = EXCLUDED.username, full_name = EXCLUDED.full_name,
                 pin = EXCLUDED.pin, role = EXCLUDED.role, is_active = EXCLUDED.is_active`,
              [u.id, u.username, u.fullName, u.pin || '1234', u.role || 'viewer', u.isActive ?? true, u.createdAt || new Date().toISOString(), u.lastLoginAt || null]
            );
          }

          for (const t of txs) {
            await client.query(
              `INSERT INTO transactions (
                id, date, client, project_name, ee, pl, st, arch, ece, me, solar_electrical, others,
                discipline_fees, purpose, bill, print_cost, total_bill, payment_status, amount_paid,
                balance, payment_date, payment_method, payment_reference, payments, remarks,
                created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
              [
                t.id, t.date, t.client, t.projectName, t.ee || '', t.pl || '', t.st || '', t.arch || '', t.ece || '', t.me || '', t.solarElectrical || '', t.others || '',
                JSON.stringify(sanitizeDisciplineFees(t.disciplineFees)),
                t.purpose || '', t.bill || 0, t.printCost || 0, t.totalBill || 0, t.paymentStatus || 'Pending', t.amountPaid || 0,
                t.balance || 0, t.paymentDate || null, t.paymentMethod || null, t.paymentReference || null,
                JSON.stringify(sanitizePayments(t.payments)), t.remarks || null,
                t.createdAt || new Date().toISOString(), t.updatedAt || new Date().toISOString()
              ]
            );
          }

          await client.query(
            `INSERT INTO company_profile (
              id, company_name, tagline, logo_icon, logo_image, accent_color, address,
              contact_info, tin_number, signatory_name, signatory_title, updated_at
            ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (id) DO UPDATE SET
              company_name = EXCLUDED.company_name, tagline = EXCLUDED.tagline,
              logo_icon = EXCLUDED.logo_icon, logo_image = EXCLUDED.logo_image,
              accent_color = EXCLUDED.accent_color, address = EXCLUDED.address,
              contact_info = EXCLUDED.contact_info, tin_number = EXCLUDED.tin_number,
              signatory_name = EXCLUDED.signatory_name, signatory_title = EXCLUDED.signatory_title,
              updated_at = NOW()`,
            [
              company.companyName, company.tagline || '', company.logoIcon || 'building',
              company.logoImage || null, company.accentColor || '#4f46e5', company.address || '',
              company.contactInfo || '', company.tinNumber || '', company.signatoryName || '',
              company.signatoryTitle || ''
            ]
          );

          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error('PostgreSQL restoreBackup error:', err.message);
      }
    }

    this.data = {
      transactions: txs,
      users: users,
      companyProfile: company,
      currency: currency,
      lastUpdated: new Date().toISOString()
    };
    this.saveToFile();
    return true;
  }

  async reset() {
    if (this.isPostgresConnected && this.pool) {
      try {
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('DELETE FROM transactions');
          await client.query('DELETE FROM users');

          for (const u of DEFAULT_USERS) {
            await client.query(
              `INSERT INTO users (id, username, full_name, pin, role, is_active, created_at, last_login_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [u.id, u.username, u.fullName, u.pin, u.role, u.isActive, u.createdAt, u.lastLoginAt]
            );
          }

          for (const t of DEFAULT_TRANSACTIONS) {
            await client.query(
              `INSERT INTO transactions (
                id, date, client, project_name, ee, pl, st, arch, ece, me, solar_electrical, others,
                discipline_fees, purpose, bill, print_cost, total_bill, payment_status, amount_paid,
                balance, payment_date, payment_method, payment_reference, payments, remarks,
                created_at, updated_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
              [
                t.id, t.date, t.client, t.projectName, t.ee, t.pl, t.st, t.arch, t.ece, t.me, t.solarElectrical || '', t.others,
                JSON.stringify(sanitizeDisciplineFees(t.disciplineFees)),
                t.purpose, t.bill, t.printCost, t.totalBill, t.paymentStatus, t.amountPaid,
                t.balance, t.paymentDate || null, t.paymentMethod || null, t.paymentReference || null,
                JSON.stringify(sanitizePayments(t.payments)), t.remarks || null,
                t.createdAt, t.updatedAt
              ]
            );
          }

          await client.query(
            `INSERT INTO company_profile (
              id, company_name, tagline, logo_icon, logo_image, accent_color, address,
              contact_info, tin_number, signatory_name, signatory_title, updated_at
            ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (id) DO UPDATE SET
              company_name = EXCLUDED.company_name, tagline = EXCLUDED.tagline,
              logo_icon = EXCLUDED.logo_icon, logo_image = EXCLUDED.logo_image,
              accent_color = EXCLUDED.accent_color, address = EXCLUDED.address,
              contact_info = EXCLUDED.contact_info, tin_number = EXCLUDED.tin_number,
              signatory_name = EXCLUDED.signatory_name, signatory_title = EXCLUDED.signatory_title,
              updated_at = NOW()`,
            [
              DEFAULT_COMPANY_PROFILE.companyName,
              DEFAULT_COMPANY_PROFILE.tagline,
              DEFAULT_COMPANY_PROFILE.logoIcon,
              DEFAULT_COMPANY_PROFILE.logoImage || null,
              DEFAULT_COMPANY_PROFILE.accentColor,
              DEFAULT_COMPANY_PROFILE.address,
              DEFAULT_COMPANY_PROFILE.contactInfo,
              DEFAULT_COMPANY_PROFILE.tinNumber,
              DEFAULT_COMPANY_PROFILE.signatoryName,
              DEFAULT_COMPANY_PROFILE.signatoryTitle
            ]
          );

          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error('PostgreSQL reset error:', err.message);
      }
    }

    this.data = {
      transactions: [...DEFAULT_TRANSACTIONS],
      users: [...DEFAULT_USERS],
      companyProfile: { ...DEFAULT_COMPANY_PROFILE },
      currency: 'PHP',
      lastUpdated: new Date().toISOString()
    };
    this.saveToFile();
    return true;
  }
}

export const db = new Database();
