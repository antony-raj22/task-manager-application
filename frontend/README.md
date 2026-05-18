# Frontend Setup

## 1. Install dependencies

```powershell
cd frontend
npm install
```

## 2. Configure environment

Copy `.env.local.example` to `.env.local` and set your Google OAuth client ID.

```powershell
copy .env.local.example .env.local
```

## 3. Run the app

```powershell
npm run dev
```

Open `http://localhost:3000`.
