# FinOps Dashboard - Complete Documentation

## Overview
**FinOps** is a comprehensive financial operations dashboard for managing business finances, including transactions, invoicing, payroll, employee management, recurring expenses, and analytics. Built with modern React/TypeScript frontend (Vite + shadcn/ui + TanStack Query) and Node.js/Express backend with PostgreSQL (Drizzle ORM).

**Key Features**:
- Multi-currency transaction tracking (INR base, auto FX via Frankfurter API)
- Professional invoice creation/PDF/email with templates
- Complete payroll processing with salary slips
- Employee/team management with document storage
- Role-based access control (RBAC)
- Real-time notifications & reminders
- Comprehensive reporting & analytics
- Recurring expense automation

**Tech Stack**:
```
Frontend: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + TanStack Query + Recharts + Framer Motion
Backend: Node.js + Express 5 + Drizzle ORM + PostgreSQL + Zod validation + Nodemailer + PDFKit
Deployment: Railway (self-hosted) + Replit object storage integration
```

## User Roles & Permissions
All access is strictly role-based. Roles defined in `app_users.role` enum.

| Role | Description | Key Permissions | Dashboard Access | Menu Items |
|------|-------------|-----------------|------------------|------------|
| **admin** | Full system administrator | Everything (create/edit/delete/approve all) | Full | All menus + Settings |
| **hr** | HR & Finance Manager | Manage employees, payroll, teams, recurring expenses, basic transactions | Full except invoicing/reports | Dashboard, Transactions, Accounts, Employees, Payroll, Recurring Expenses |
| **manager** | Finance Manager | Invoicing, reports, goals, recurring expenses, view transactions | Dashboard, Invoicing, Reports | Dashboard, Transactions, Invoices, Reports, Goals, Recurring Expenses |
| **data_entry** | Transaction entry clerk | Create draft transactions only (cannot approve/delete others) | Redirected to Transactions only | Transactions only |

**Permission Matrix** (from `server/routes.ts`):
```
Transactions:
├─ Create: admin, hr, data_entry
├─ Approve/Reject: admin only
├─ Delete: admin (any), others (own drafts only)
├─ View: all authenticated

Invoices:
├─ Create/Send: admin, manager
├─ View: all authenticated

Employees/Payroll: admin, hr only
Accounts/Categories: admin, hr
Settings/SMTP: admin only
Reports/Analytics: admin, hr, manager
Recurring Expenses: admin, hr, manager
```

**Authentication Flow**:
1. Email/password login (`POST /api/auth/login`)
2. First-time: OTP verification via email (`POST /api/auth/send-otp` → `POST /api/auth/verify-otp`)
3. Session-based (PG session store, 30-day cookie)
4. Password change/reset available

## Core Functionalities

### 1. **Dashboard** (`/dashboard`)
**Access**: admin, hr, manager (data_entry auto-redirected to Transactions)
```
Stats Cards:
├─ Current Month P&L (income - approved expenses)
├─ Total Available Funds (sum of account currentBalance where type != 'od_cc')
├─ OD/CC Limit Used/Remaining
├─ Top Expenses (top 5 categories)
├─ Revenue Breakdown

Quick Actions:
├─ Recent Transactions table
├─ Upcoming Recurring Payments (7 days)
├─ Overdue Payments
├─ Notifications bell (in-app + email)
```

### 2. **Transactions** (`/transactions`)
**Access**: All roles
```
Features:
├─ CRUD transactions (income/expense/transfer/opening_balance)
├─ Multi-currency (auto FX: Frankfurter API)
├─ Filter by month/account/category/status
├─ Team/Employee attribution (HR feature)
├─ File uploads (Replit object storage)
├─ Approval workflow (draft → submitted → approved)
└─ Bulk delete own drafts (non-admin)

Status Workflow:
draft → submitted → approved/rejected
Data Entry: can only create drafts
Admin: full lifecycle
```

### 3. **Accounts** (`/accounts`)
**Access**: admin, hr
```
├─ Bank accounts (current/savings/od_cc/cash/upi)
├─ Real-time currentBalance (updated on approved txns)
├─ Opening balance setup
└─ CRUD with balance tracking
```

### 4. **Invoicing** (`/invoices`)
**Access**: admin, manager
**Complete Invoice Lifecycle**:
```
1. Templates (admin only):
   ├─ Customizable header/footer/terms
   ├─ Company branding (logo/address/bank details)
   ├─ Default template auto-created
   └─ Immutable snapshots per invoice

2. Creation (`POST /api/invoices`):
   ├─ Client management (w/ preferred currency)
   ├─ Line items (qty × unit price)
   ├─ Auto invoice numbering (INV_5000+)
   ├─ Multi-currency totals (w/ FX rate)

3. Workflow:
   ├─ Draft → Sent (PDF + email via SMTP)
   ├─ Payment recording (gateway stage: USD)
   ├─ Bank settlement (USD → INR txn)
   └─ Status: draft/sent/paid/overdue + reminders

4. PDF Generation (`GET /api/invoices/:id/pdf`)
5. Email (`POST /api/invoices/:id/email`) via invoice SMTP
```

### 5. **Employees & Payroll** (`/employees`, `/payroll`)
**Access**: admin, hr
```
Employees:
├─ Full profile (ID, designation, team, docs)
├─ Document upload (ID/address/offer letters)
├─ Salary history tracking (hikes/adjustments)
└─ Team organization

Payroll (`/payroll`):
├─ Monthly runs (draft → processing → completed)
├─ Auto-generate salary slips from current salary
├─ Bulk email slips (HTML table format)
├─ Auto expense transaction ('Salaries' category)
└─ Resend slips functionality
```

### 6. **Recurring Expenses** (`/recurring-expenses`)
**Access**: admin, hr, manager
```
├─ Monthly/quarterly/yearly/custom schedules
├─ Auto reminders (email + in-app, configurable days before)
├─ Mark paid → auto next due date + optional txn
├─ Pause/resume/archive
├─ Dashboard widgets (upcoming/overdue)
└─ Linked to categories/accounts
```

### 7. **Reports & Analytics** (`/reports`)
**Access**: admin, manager
```
├─ Spending by Category (w/ %)
├─ Spending by Team
├─ Monthly trends (12 months)
├─ Export-ready charts (Recharts)
└─ Date range filters
```

### 8. **Goals** (`/goals`)
**Access**: admin, manager
```
├─ Revenue/Expense targets (monthly/quarterly)
├─ Progress tracking vs actuals
└─ Dashboard integration
```

### 9. **Settings** (`/settings`) - **Admin Only**
```
SMTP Configurations (3 types):
├─ System (OTP/general)
├─ Invoice (client emails)
├─ Payroll (salary slips)
├─ Test connection button
└─ Per-type credentials

User Management:
├─ CRUD app users (email/password/role)
├─ Reset passwords
├─ Activate/deactivate
└─ Self password change
```

## Backend API Endpoints
**Base**: All `GET/POST` include `credentials: \"include\"` for sessions.

| Category | Endpoint | Method | Auth | Role Req | Description |
|----------|----------|--------|------|----------|-------------|
| Auth | `/api/auth/login` | POST | No | - | Email/password + OTP |
| Auth | `/api/auth/me` | GET | Yes | - | Current user |
| Users | `/api/admin/users` | GET/POST | Yes | admin | List/create users |
| Txns | `/api/transactions` | GET/POST | Yes | Varies | List/create |
| Txns | `/api/transactions/:id/approve` | POST | Yes | admin | Approve txn |
| Invoices | `/api/invoices` | GET/POST | Yes | admin/manager | CRUD |
| Invoices | `/api/invoices/:id/pdf` | GET | Yes | - | Download PDF |
| Payroll | `/api/payroll-runs` | GET/POST | Yes | admin/hr | Runs + slips |
| Recurring | `/api/recurring-expenses` | GET/POST | Yes | admin/hr/manager | Manage recurring |
| Dashboard | `/api/dashboard/stats` | GET | Yes | - | Monthly stats |
| Notifications | `/api/notifications` | GET/POST/DELETE | Yes | admin/hr/manager | In-app alerts |

## Database Schema Highlights
**Key Tables** (Drizzle PG schema):
```
app_users: role enum + email_verified (OTP)
transactions: multi-currency + approval workflow + team attribution
invoices → invoice_items + payments → settlements (USD→INR)
employees → salary_records → payroll_runs → salary_slips
recurring_expenses + expense_reminders
smtp_configs (system/invoice/payroll)
in_app_notifications
```

## Deployment & Setup
```
1. npm install
2. DB: drizzle-kit push
3. npm run dev (Vite dev + Express)
4. Production: npm run build → npm start
5. Railway: auto-deploys from git
```

**Seed Data** (auto on first run):
```
Users: admin@finops.com / admin123
Categories: Sales Revenue, Salaries, Rent, etc.
Accounts: HDFC Current (₹100k), Petty Cash
Sample invoices/transactions/goals
Default invoice template
```

## Notifications & Reminders
**Types**:
- In-app (admin/hr/manager): expense reminders, overdue
- Email: invoice overdue, salary slips, OTP

**Schedulers** (`server/reminders.ts`):
```
Invoice reminders: every 5min
Expense reminders: hourly
```

**File created**: DOCUMENTATION.md (root of project)
