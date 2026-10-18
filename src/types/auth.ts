export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  username: string;
  fullName: string;
  pin: string; // 4 to 6 digit self-nominated PIN
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export const INITIAL_USERS: User[] = [
  {
    id: 'USR-001',
    username: 'admin',
    fullName: 'Engr. Roberto Cruz, PE',
    pin: '1234',
    role: 'admin',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    lastLoginAt: '2026-10-17T09:00:00.000Z',
  },
  {
    id: 'USR-002',
    username: 'editor',
    fullName: 'Maria Santos (Accountant)',
    pin: '1234',
    role: 'editor',
    isActive: true,
    createdAt: '2026-02-15T08:00:00.000Z',
    lastLoginAt: '2026-10-16T14:30:00.000Z',
  },
  {
    id: 'USR-003',
    username: 'viewer',
    fullName: 'Dave Reyes (Project Auditor)',
    pin: '1234',
    role: 'viewer',
    isActive: true,
    createdAt: '2026-03-01T08:00:00.000Z',
    lastLoginAt: '2026-10-15T11:20:00.000Z',
  },
];

export const ROLE_PERMISSIONS: Record<UserRole, { label: string; description: string; canEdit: boolean; canDelete: boolean; canManageUsers: boolean; canEditBranding: boolean }> = {
  admin: {
    label: 'Administrator',
    description: 'Full access: manage transactions, record payments, manage users, and edit company branding.',
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
    canEditBranding: true,
  },
  editor: {
    label: 'Editor',
    description: 'Operational access: record transactions, update payments, and export accounting reports.',
    canEdit: true,
    canDelete: false,
    canManageUsers: false,
    canEditBranding: false,
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access: view ledger, review monthly/weekly reports, and download PDF/Excel reports.',
    canEdit: false,
    canDelete: false,
    canManageUsers: false,
    canEditBranding: false,
  },
};
