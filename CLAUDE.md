# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Contract AI is a full-stack SaaS platform for AI-powered contract analysis, optimization, and management. The application consists of:

- **Frontend**: React 18 + TypeScript + Vite application
- **Backend**: Node.js + Express API server with MongoDB
- **Infrastructure**: AWS S3 for file storage, Stripe for payments, OpenAI for AI analysis

### Key Architectural Patterns

- Frontend makes API calls to backend via `/api` proxy (locally) or `https://api.contract-ai.de` (production)
- Authentication uses JWT tokens stored in localStorage
- File uploads go directly to AWS S3 with presigned URLs
- Real-time notifications via calendar integration and cron jobs
- All routes follow RESTful patterns with `/api` prefix

## Development Commands

### Frontend (from `/frontend` directory)
```bash
npm run dev      # Start development server on http://localhost:5173
npm run build    # Build for production (TypeScript check + Vite build)
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Backend (from `/backend` directory)
```bash
node server.js   # Start Express server (no dev script defined)
```

Note: Backend has no defined dev/test scripts. Use `node server.js` directly.

## Core Application Structure

### Frontend Routes & Features
- **Public Pages**: Home, Login, Register, Pricing, Blog, Feature pages
- **Protected Dashboard**: `/dashboard`, `/contracts`, `/profile`, `/calendar`
- **Premium Features**: `/optimizer`, `/compare`, `/chat`, `/generate`, `/legal-pulse`
- **Payment Flow**: `/subscribe`, `/success` (Stripe integration)

### Backend API Endpoints
All endpoints prefixed with `/api`:
- **Auth**: `/auth/register`, `/auth/login`, `/auth/verify-email`
- **Contracts**: CRUD operations at `/contracts/*`
- **AI Services**: `/analyze`, `/optimize`, `/generate`, `/compare`, `/chat`
- **Payments**: `/stripe/*`, `/stripe-webhook` (webhook on separate port)
- **File Storage**: `/s3/*` for presigned URLs and file operations

### Database Schema (MongoDB)
- **Users**: Authentication, subscription status, usage limits
- **Contracts**: User contracts with AI analysis results
- **Calendar Events**: Contract deadlines and reminders
- **Invoices**: Generated invoices with PDF storage

## Environment Configuration

Required environment variables:
- **MongoDB**: `MONGO_URI`
- **Authentication**: `JWT_SECRET`
- **OpenAI**: `OPENAI_API_KEY`
- **AWS S3**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Email**: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`

## Important Implementation Details

### Authentication Flow
- JWT tokens expire after 7 days
- Email verification required for new accounts
- Token verification middleware on protected routes

### File Upload Process
1. Frontend requests presigned URL from `/api/s3/upload-url`
2. Direct upload to S3 using presigned URL
3. Store S3 key in MongoDB contract record
4. Retrieve files via presigned GET URLs

### AI Analysis Pipeline
1. Extract text from PDF (`pdf-parse`)
2. Send to OpenAI with structured prompts
3. Parse GPT response for scores, risks, suggestions
4. Store analysis in MongoDB
5. Generate PDF report on demand

### Subscription Tiers
- **Free**: 3 analyses/month, limited features
- **Premium**: 15 analyses/month, all features
- **Business**: 50 analyses/month, priority support
- **Legendary**: Unlimited analyses, all features

### Calendar Integration
- Automatic deadline extraction from contracts
- Cron jobs for reminder notifications
- ICS file generation for calendar imports

## Deployment Process

**WICHTIG: Bei JEDEM Deploy IMMER alle drei Plattformen deployen!**

### 1. GitHub (Code)
```bash
git add .
git commit -m "Commit message"
git push origin main
```

### 2. Vercel (Frontend)
```bash
cd frontend
npx vercel --prod
```
Frontend URL: https://contract-ai.de

### 3. Render (Backend)
- Backend deployed automatisch bei git push auf main
- Falls manuell nötig: https://dashboard.render.com
- Backend URL: https://api.contract-ai.de

### Vollständiger Deploy-Befehl
```bash
# Aus dem Root-Verzeichnis:
git add . && git commit -m "message" && git push origin main && cd frontend && npx vercel --prod && cd ..
```