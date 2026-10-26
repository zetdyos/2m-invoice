# Invoicer — ACH Confirmations (FastAPI + React)

Web rebuild of the original .NET WinForms "Invoicer" used by **2M Mower and Tool LLC
(DBA 2M Equipment)** to send ACH payment confirmations to vendors.

- **Backend:** FastAPI + SQLModel + SQLite, JWT auth.
- **Frontend:** React (Vite), fully responsive. Built into the backend and served at `/`.
- **Email:** branded HTML template with the 2M logo embedded inline + a PDF copy attached.
- **Everything configurable in-app:** SMTP server, company details and email text (Settings page).

## What it does
1. **Vendors** — directory of vendors (name, email, account #).
2. **Confirmations** — create ACH confirmations (vendor, date, invoices, confirmation #, amount),
   generate a PDF, and email it to the vendor.
3. **Send history** — every email send is logged (delivered/failed) and searchable by date range.
4. Filtering and search by **date range** across confirmations and history.

## Quick start
```bash
cd webapp
./start.sh                 # builds the frontend, installs the backend, runs on :8000
# first time, to import the old data too:
MIGRATE=1 ./start.sh
```
Open http://localhost:8000 and sign in with **admin / admin123** (change it in Settings).

## Pieces, run manually
```bash
./build.sh                 # build React -> backend/app/static
cd backend && ./run.sh     # start API + serve the app  (PORT=8000 HOST=0.0.0.0)
```

## Development (hot reload)
```bash
cd webapp && ./dev.sh      # API :8000 + Vite :5173 (open :5173)
```

## Import data from the original .NET app
Reads the old `Vendors/Vendors.xlsx` and `ACHConfirmations.dat` into SQLite:
```bash
cd backend && . .venv/bin/activate
python migrate_from_dotnet.py                 # uses ../../ paths by default
python migrate_from_dotnet.py --force         # re-import over existing data
```

## Configuration
- First run creates `backend/data/invoicer.db` and a default admin.
- Override defaults via `backend/.env` (see `.env.example`): `SECRET_KEY`, `ADMIN_USERNAME`,
  `ADMIN_PASSWORD`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `DATABASE_URL`.
- SMTP and company details are edited in the **Settings** page and stored in the database.
  Use **Send test** there to verify the mail server before sending to vendors.

## Notes
- The SMTP password is stored in the local SQLite database, not in the source code.
- The data lives in `backend/data/`. Back up that folder to keep your confirmations.
