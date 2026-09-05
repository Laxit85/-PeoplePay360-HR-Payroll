# PeoplePay360 - HR & Payroll Management System

Welcome to **PeoplePay360**, a comprehensive HR & Payroll solution.

## Project Structure

```
PeoplePay360-HR-Payroll/
├── backend/       # Express.js REST API & MySQL Database scripts
└── frontend/      # Vite + React Frontend Application
```

- **Frontend (`/frontend`)**: React + Vite application containing all HRMS UI dashboards, forms, and components (moved from the sanjay repository module into the root frontend folder).
- **Backend (`/backend`)**: Express.js server connected to MySQL database on port 3307 (API endpoints served at `http://localhost:4000/api`).

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm run init:db   # Creates MySQL database & tables
npm run seed      # Populates initial seed data
npm start         # Starts backend API server on http://localhost:4000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev       # Starts Vite dev server (proxies /api requests to backend)
```

