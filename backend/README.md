# PeoplePay360 (MySQL / Node.js scaffold)

Matches the team-division doc 1:1 — same 4 people, same folders, same
shared functions (`contractResolver`, `getWorkedDays`, `getApprovedLeave`),
now backed by real MySQL tables instead of Mongoose schemas.

## Project structure

```
peoplepay360/
├── package.json
├── .env.example
├── server.js
└── src/
    ├── app.js
    ├── db/
    │   ├── pool.js              # ⭐ shared MySQL pool — everyone imports this
    │   ├── migrate.js           # migration runner
    │   ├── seed.js               # seeds one login per role
    │   └── migrations/           # 001_*.sql ... 013_*.sql, run in order
    ├── middleware/
    │   ├── auth.middleware.js
    │   ├── rbac.middleware.js
    │   └── errorHandler.middleware.js
    ├── routes/
    │   └── index.js              # one line per person
    └── modules/
        ├── auth/                 # Person 1
        ├── employee/              # Person 2 (employee, contract, schedule)
        ├── attendance/            # Person 3
        ├── timeoff/               # Person 3
        ├── payroll/               # Person 4 (heaviest module)
        └── dashboard/             # Everyone
```

## Prerequisites
- Node.js 18+
- A running MySQL 8 server (locally or Docker)

## Setup — run these in order

```bash
# 1. Install dependencies
cd peoplepay360
npm install

# 2. Create the database (adjust user/password for your MySQL install)
mysql -u root -p -e "CREATE DATABASE peoplepay360;"

# 3. Copy the env file and fill in your DB credentials + JWT secret
cp .env.example .env
# then edit .env

# 4. Run all migrations (creates all 13 tables in order)
npm run migrate

# 5. Seed one login per role (admin, hr_manager, payroll_officer, employee)
npm run seed

# 6. Start the API in dev mode (auto-restarts on file changes)
npm run dev
```

The API will be listening at `http://localhost:4000` (or whatever `PORT`
you set in `.env`). Check it's alive:

```bash
curl http://localhost:4000/health
```

## Logging in with a seeded user

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@peoplepay360.test","password":"password123"}'
```

Copy the returned `token` and use it on any protected route:

```bash
curl http://localhost:4000/api/employees \
  -H "Authorization: Bearer <token>"
```

## Adding a new migration later
Never edit a migration file that's already been applied. Add a new
numbered file instead:

```bash
touch src/db/migrations/014_alter_employees_add_column.sql
npm run migrate   # only applies files not yet in the `migrations` bookkeeping table
```

## Optional dependencies not in the base install
Two Payroll files (`pdf.service.js`, `email.service.js`) lazy-require
packages that aren't in `package.json` yet, so the scaffold stays lean
until Person 4 actually needs them:

```bash
npm install pdfkit nodemailer
```

## Running with Docker (optional, if you don't want MySQL installed locally)

```bash
docker run --name peoplepay360-mysql \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=peoplepay360 \
  -p 3306:3306 \
  -d mysql:8
```

Then point `.env`'s `DB_HOST=127.0.0.1`, `DB_PASSWORD=yourpassword` at it
and continue from step 4 above.
