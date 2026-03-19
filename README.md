# Expenditure Tracker

A full-stack web application for tracking personal expenses and incomes, with role-based access control.

## Tech Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | Next.js 14, Tailwind CSS, Recharts |
| Backend   | Node.js, Express.js           |
| Database  | MongoDB with Mongoose         |
| Auth      | JWT (JSON Web Tokens)         |

## Features

- **Authentication** — JWT-based login & registration
- **Expense Tracking** — Add, edit, delete expenses with categories
- **Income Tracking** — Add, edit, delete income with sources
- **Dashboard** — Visual charts (bar + pie), summary stats, recent transactions
- **Super Admin** — User management, role/permission control, activate/deactivate users
- **Responsive Design** — Works on desktop and mobile

## Project Structure

```
expenditure/
├── backend/          # Node.js + Express API
│   └── src/
│       ├── config/   # DB connection
│       ├── middleware/  # Auth & role guards
│       ├── models/   # Mongoose schemas
│       └── routes/   # API endpoints
└── frontend/         # Next.js 14 App Router
    ├── app/
    │   ├── (auth)/   # Login, Register
    │   └── (dashboard)/  # Protected pages
    ├── components/   # Reusable UI components
    ├── context/      # React Context (Auth)
    └── lib/          # Axios API client
```

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and a strong JWT secret
npm run dev
```

### 2. Seed Super Admin

```bash
cd backend
node src/seed.js
```

Default super admin credentials:
- **Email:** `admin@expenditure.com`
- **Password:** `Admin@123`

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expenditure
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## API Reference

### Auth
| Method | Endpoint            | Access  | Description         |
|--------|---------------------|---------|---------------------|
| POST   | /api/auth/register  | Public  | Register new user   |
| POST   | /api/auth/login     | Public  | Login               |
| GET    | /api/auth/me        | Private | Get current user    |

### Expenses
| Method | Endpoint             | Access  | Description         |
|--------|----------------------|---------|---------------------|
| GET    | /api/expenses        | Private | List expenses       |
| POST   | /api/expenses        | Private | Create expense      |
| PUT    | /api/expenses/:id    | Private | Update expense      |
| DELETE | /api/expenses/:id    | Private | Delete expense      |

### Income
| Method | Endpoint          | Access  | Description      |
|--------|-------------------|---------|------------------|
| GET    | /api/income       | Private | List incomes     |
| POST   | /api/income       | Private | Create income    |
| PUT    | /api/income/:id   | Private | Update income    |
| DELETE | /api/income/:id   | Private | Delete income    |

### Dashboard
| Method | Endpoint                  | Access  | Description            |
|--------|---------------------------|---------|------------------------|
| GET    | /api/dashboard/summary    | Private | Stats & recent txns    |
| GET    | /api/dashboard/chart      | Private | Chart data             |

### Users (Super Admin only)
| Method | Endpoint        | Access      | Description      |
|--------|-----------------|-------------|------------------|
| GET    | /api/users      | Super Admin | List all users   |
| POST   | /api/users      | Super Admin | Create user      |
| PUT    | /api/users/:id  | Super Admin | Update user      |
| DELETE | /api/users/:id  | Super Admin | Delete user      |
