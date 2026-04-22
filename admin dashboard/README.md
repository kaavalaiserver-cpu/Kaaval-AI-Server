# KAAVAL AI — AI-Powered Traffic Violation Detection System

![License](https://img.shields.io/badge/license-MIT-blue)
![NestJS](https://img.shields.io/badge/backend-NestJS%2011-red)
![React](https://img.shields.io/badge/frontend-React%2018-61dafb)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178c6)

**Kaaval AI** is an intelligent traffic monitoring and violation detection platform built for district-level traffic command centers. It uses AI-powered CCTV analysis to detect traffic violations in real time, enabling automated challan issuance, evidence archival, and analytics-driven decision making.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Authentication & Roles](#authentication--roles)
- [API Endpoints](#api-endpoints)
- [Security](#security)
- [Deployment](#deployment)
- [Screenshots](#screenshots)

---

## Features

- **Real-Time Violation Detection** — AI-powered CCTV analysis detects helmet violations, signal jumping, wrong-way driving, and more
- **Interactive Dashboard** — Live camera map with Leaflet + violation heatmap overlay, real-time alerts, and overview widgets
- **Violation Management** — Browse, filter, review, verify, and issue challans for detected violations
- **Evidence Review** — Side-by-side evidence viewer with AI confidence scores and one-click verification
- **Camera Network** — Monitor all CCTV cameras, GPS-mapped locations, online/offline status
- **Analytics** — Violation trends, camera performance, type breakdown charts (Chart.js)
- **Dev Analytics** — System-level performance metrics (AI pipeline latency, throughput, model accuracy)
- **Evidence Archive** — Search and retrieve historical violation evidence
- **Notification System** — Real-time notification bell with unread counts and mark-as-read
- **Role-Based Access Control** — 5 user roles with granular permission control
- **System Monitoring** — Server health, uptime, database status, and system logs (dev admin only)

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   React + Vite   │────▶│  NestJS Backend   │────▶│  PostgreSQL /    │
│   Dashboard      │ API │  (Port 8003)      │     │  SQLite          │
│   (Port 3000)    │◀────│                   │     └──────────────────┘
└──────────────────┘     │  JWT Auth         │     ┌──────────────────┐
                         │  Helmet + CORS    │────▶│  Redis Cache     │
                         │  Rate Limiting    │     │  (optional)      │
                         │  TypeORM          │     └──────────────────┘
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │  Python AI Worker │
                         │  (CV Pipeline)    │
                         └──────────────────┘
```

---

## Tech Stack

### Backend (`kaaval-backend/`)
| Technology | Purpose |
|---|---|
| NestJS 11 | REST API framework |
| TypeORM | Database ORM |
| PostgreSQL | Primary database |
| SQLite (better-sqlite3) | Fallback when PG is unavailable |
| Redis | Caching layer (falls back to in-memory) |
| Passport + JWT | Authentication |
| Helmet | HTTP security headers |
| @nestjs/throttler | Rate limiting |
| class-validator | Request validation |

### Frontend (`kaaval_dashboard/`)
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| Chart.js + react-chartjs-2 | Analytics charts |
| Leaflet + react-leaflet | Interactive camera map |
| leaflet.heat | Violation heatmap overlay |
| Lucide React | Icon library |

---

## Project Structure

```
kaaval-ai/
├── START.bat                    # One-click launcher (Windows)
├── login.txt                    # Login credentials reference
├── .gitignore
│
├── kaaval-backend/              # NestJS API Server
│   ├── src/
│   │   ├── main.ts              # Entry point (Helmet, CORS, validation)
│   │   ├── app.module.ts        # Root module (DB, cache, throttler)
│   │   ├── auth/                # JWT authentication & RBAC
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts      # Hardcoded users (hashed passwords)
│   │   │   ├── auth.module.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.enum.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── roles.guard.ts
│   │   ├── violations/          # Violation CRUD + stats + batch upload
│   │   ├── cameras/             # Camera management + GPS + seeding
│   │   ├── analytics/           # Summary + dev analytics
│   │   ├── notifications/       # Notification CRUD + unread count
│   │   ├── search/              # Evidence search
│   │   └── system/              # Health, status, logs
│   ├── .env                     # Environment variables (gitignored)
│   ├── package.json
│   └── tsconfig.json
│
└── kaaval_dashboard/            # React Frontend
    ├── src/
    │   ├── main.tsx             # Entry point
    │   ├── App.tsx              # Routes + ProtectedRoute wrapper
    │   ├── config.ts            # API_BASE = '/api' (relative)
    │   ├── types.ts             # TypeScript interfaces
    │   ├── context/
    │   │   └── AuthContext.tsx   # Auth state + axios header injection
    │   ├── components/
    │   │   ├── Layout.tsx       # Sidebar + top bar + role-aware nav
    │   │   ├── Layout.css
    │   │   ├── NotificationPanel.tsx
    │   │   ├── NotificationPanel.css
    │   │   └── HeatmapLayer.tsx # Leaflet heatmap component
    │   └── pages/
    │       ├── Login.tsx        # Login page
    │       ├── Dashboard.tsx    # Overview + map + alerts
    │       ├── Violations.tsx   # Violation list + filters
    │       ├── ReviewEvidence.tsx
    │       ├── Cameras.tsx      # Camera management
    │       ├── Analytics.tsx    # Charts & trends
    │       ├── DevAnalytics.tsx # AI pipeline metrics
    │       ├── EvidenceArchive.tsx
    │       ├── SystemStatus.tsx # Server health
    │       └── SystemLogs.tsx   # System logs viewer
    ├── vite.config.js           # Dev proxy → backend
    └── package.json
```

---

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** 14+ *(optional — falls back to SQLite automatically)*
- **Redis** *(optional — falls back to in-memory cache)*

---

## Installation

### Clone the repository

```bash
git clone https://github.com/SajivJess/Kaaval-AI.git
cd Kaaval-AI
```

### Install dependencies

```bash
# Backend
cd kaaval-backend
npm install

# Frontend
cd ../kaaval_dashboard
npm install
```

---

## Configuration

### Backend Environment Variables

Create or edit `kaaval-backend/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=kaaval_ai

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-strong-random-secret-here
JWT_EXPIRY=8h

# Server
PORT=8003
NODE_ENV=development

# CORS (comma-separated, set to your production domain)
CORS_ORIGINS=http://localhost:3000

# AI Backend
AI_BACKEND_URL=http://127.0.0.1:8000
```

> **Note:** If PostgreSQL is not running, the backend automatically falls back to a local SQLite database (`kaaval_local.db`). Similarly, if Redis is unavailable, it uses in-memory caching. No additional setup is required for development.

---

## Running the Application

### Windows (One-Click)

Double-click **`START.bat`** — it will:
1. Check and install dependencies if missing
2. Start the backend (NestJS) on port 8003
3. Start the frontend (Vite) on port 3000
4. Open the dashboard in your browser

### Manual Start

```bash
# Terminal 1 — Backend
cd kaaval-backend
npm run start:dev

# Terminal 2 — Frontend
cd kaaval_dashboard
npm run dev
```

### Production Build

```bash
# Build backend
cd kaaval-backend
npm run build
NODE_ENV=production node dist/main.js

# Build frontend
cd kaaval_dashboard
npm run build
# Serve the dist/ folder with any static server (nginx, serve, etc.)
```

---

## Authentication & Roles

The system uses **JWT-based authentication** with **5 predefined roles**:

| Username | Password | Role | Access |
|---|---|---|---|
| `superadmin` | `superadmin@123` | Super Admin | Full access to all features |
| `trafficadmin` | `trafficadmin@123` | Traffic Admin | Violations, cameras, analytics (no system config) |
| `officer` | `officer@123` | Verification Officer | Review and verify violations only |
| `viewer` | `viewer@123` | Analytics Officer | View-only access to analytics |
| `devadmin` | `devadmin@123` | Dev Admin | Full access including dev analytics and system logs |

### Role Permissions Matrix

| Feature | Super Admin | Traffic Admin | Verification Officer | Analytics Officer | Dev Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Violations | ✅ | ✅ | ✅ | — | ✅ |
| Review Evidence | ✅ | ✅ | ✅ | — | ✅ |
| Cameras | ✅ | ✅ | ✅ | — | ✅ |
| Analytics | ✅ | ✅ | — | ✅ | ✅ |
| Dev Analytics | — | — | — | — | ✅ |
| Evidence Archive | ✅ | ✅ | — | — | ✅ |
| System Status | — | — | — | — | ✅ |
| System Logs | — | — | — | — | ✅ |
| Delete Violations | ✅ | — | — | — | ✅ |

---

## API Endpoints

All endpoints are prefixed with `/api`. Protected endpoints require a `Bearer` token in the `Authorization` header.

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user profile |

### Violations
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/violations` | ✅ | List violations (paginated) |
| GET | `/api/violations/stats` | ✅ | Get violation statistics |
| GET | `/api/violations/:id` | ✅ | Get single violation |
| POST | `/api/violations/:id/verify` | ✅ | Verify a violation |
| PATCH | `/api/violations/:id` | ✅ | Update violation |
| DELETE | `/api/violations/:id` | ✅ | Delete violation (admin only) |
| POST | `/api/violations/batch-upload` | ✅ | Batch upload violations |

### Cameras
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/cameras` | ✅ | List all cameras |
| GET | `/api/cameras/status` | ✅ | Camera status summary + GPS |
| POST | `/api/cameras/seed` | ✅ | Seed demo cameras (admin only) |

### Analytics
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics/summary` | ✅ | Analytics summary |
| GET | `/api/analytics/dev` | ✅ | Dev analytics (dev admin only) |

### Notifications
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | ✅ | List notifications |
| GET | `/api/notifications/unread` | ✅ | Get unread count |
| POST | `/api/notifications/:id/read` | ✅ | Mark as read |
| POST | `/api/notifications/read-all` | ✅ | Mark all as read |

### System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/system/status` | ✅ | System status (dev admin) |
| GET | `/api/system/health` | ✅ | Health check (dev admin) |
| GET | `/api/system/logs` | ✅ | System logs (dev admin) |

### Search
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/search` | ✅ | Search evidence |

---

## Security

The application implements multiple layers of security:

| Layer | Implementation |
|---|---|
| **Authentication** | JWT tokens with configurable expiry (default 8h) |
| **Authorization** | Role-based access control (RBAC) on every endpoint |
| **Password Storage** | SHA-256 hashed with timing-safe comparison |
| **HTTP Headers** | Helmet.js (X-Frame-Options, HSTS, X-Content-Type-Options, etc.) |
| **Rate Limiting** | 60 requests/minute per IP via @nestjs/throttler |
| **CORS** | Restricted to configured origins (no wildcard) |
| **Input Validation** | class-validator with whitelist + forbidNonWhitelisted |
| **API Paths** | Relative `/api` paths — no hardcoded URLs |
| **Secrets** | Environment variables via `.env` (gitignored) |
| **SQL Injection** | TypeORM parameterized queries |
| **Schema Safety** | `synchronize: false` in production |

---

## Deployment

### Frontend + Backend on Same Server

1. Build the frontend:
   ```bash
   cd kaaval_dashboard
   npm run build
   ```
2. Copy `dist/` contents to a folder served by the backend (or use `@nestjs/serve-static`)
3. Set environment variables on the server
4. Start the backend:
   ```bash
   cd kaaval-backend
   NODE_ENV=production node dist/main.js
   ```

### Separate Deployment (Recommended)

1. Deploy the backend to a server/cloud (set `PORT`, `DB_*`, `JWT_SECRET`, `CORS_ORIGINS`)
2. Build the frontend with the production API URL
3. Deploy `dist/` to a CDN or static hosting (Vercel, Netlify, etc.)
4. Set `CORS_ORIGINS` to the frontend's domain

### Environment Checklist for Production

- [ ] Set `NODE_ENV=production`
- [ ] Set a strong, random `JWT_SECRET` (≥ 32 characters)
- [ ] Configure `CORS_ORIGINS` to your frontend domain
- [ ] Set `DB_*` variables for your production PostgreSQL
- [ ] Ensure `synchronize` is disabled (automatic when `NODE_ENV=production`)
- [ ] Use HTTPS (reverse proxy with nginx/Caddy)
- [ ] Set up proper SSL certificates

---

## License

MIT © 2026 Kaaval AI Team
