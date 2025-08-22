# CLAUDE.md

This file guides Claude Code when working in this repository.

## Project Overview
**Contract AI** is a SaaS for AI-assisted contract analysis, optimization and management.  
Stack: **React + Vite + TS (frontend)**, **Node.js + Express (backend)**, **MongoDB (native MongoClient, no Mongoose)**, **Stripe**, **OpenAI**, **AWS S3 (eu-central-1/Frankfurt)**.  
Auth: **JWT in httpOnly cookies** (SameSite=None, Secure, domain `.contract-ai.de`). Frontend uses Vercel proxy to `https://api.contract-ai.de`.

## Development Commands

### Frontend (Vite + React + TS)
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
npm run lint       # if configured
```

### Backend (Node.js + Express)
```bash
cd backend
npm install          # Install dependencies
node server.js       # Start server (port 5000 by default)
```

Note: Backend has no npm dev script defined. Use `node server.js` directly.

## Architecture

### Frontend Structure
- **Pages**: Located in `frontend/src/pages/` - main app screens
- **Components**: Located in `frontend/src/components/` - reusable UI components
- **Context**: Auth context in `frontend/src/context/AuthContext.tsx`
- **API Calls**: Centralized in `frontend/src/utils/api.ts`
- **Routing**: Defined in `frontend/src/App.tsx` using React Router
- **Styles**: Module CSS files in `frontend/src/styles/` and component-specific modules

### Backend Structure
- **Server**: Main entry point at `backend/server.js`
- **Routes**: Modular route files in `backend/routes/` (all mounted under `/api` prefix)
- **Services**: Business logic in `backend/services/`
- **Models**: MongoDB models in `backend/models/`
- **Middleware**: Auth and subscription checks in `backend/middleware/`
- **File Storage**: S3 integration in `backend/services/fileStorage.js`

### API Structure
All backend routes are prefixed with `/api`:
- `/api/auth/*` - Authentication endpoints
- `/api/contracts/*` - Contract CRUD operations
- `/api/analyze` - Contract analysis
- `/api/optimize` - Contract optimization
- `/api/compare` - Contract comparison
- `/api/generate` - Contract generation
- `/api/stripe/*` - Payment processing
- `/api/calendar/*` - Calendar/reminder features

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite, React Router, Axios, Recharts, HTML2PDF
- **Backend**: Express, MongoDB/Mongoose, OpenAI API, Stripe, AWS S3, Nodemailer
- **Authentication**: JWT tokens with httpOnly cookies
- **File Storage**: AWS S3 for contract PDFs
- **Payments**: Stripe for subscriptions

## Environment Variables

Backend requires these environment variables:
- `MONGO_URI` - MongoDB connection string
- `OPENAI_API_KEY` - OpenAI API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `AWS_ACCESS_KEY_ID` - AWS access key for S3
- `AWS_SECRET_ACCESS_KEY` - AWS secret for S3
- `AWS_REGION` - AWS region
- `AWS_S3_BUCKET` - S3 bucket name
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` - Email configuration
- `API_BASE_URL` - Base URL for API (defaults based on NODE_ENV)
- `PORT` - Server port (default 5000)

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to main:
1. Installs frontend dependencies
2. Builds frontend (`npm run build`)
3. Runs linter (`npm run lint`)

## Deployment

- **Frontend**: Deployed to Vercel (configured in `frontend/vercel.json`)
- **Backend**: Deployed to Render
- **Database**: MongoDB Atlas
- **File Storage**: AWS S3

## API Proxy Configuration

In development, the frontend Vite server proxies `/api` requests to the backend.
In production, Vercel rewrites handle the API routing to the backend at `api.contract-ai.de`.