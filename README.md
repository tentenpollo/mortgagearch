# MortgageArch

A secure, compliance-focused document management platform for mortgage brokers and borrowers.

## Features

- **Client Management** - Create and manage borrower profiles
- **Secure Upload Links** - Generate time-limited, use-limited upload tokens
- **Document Review** - Approve/reject documents with full audit trail
- **Compliance Logging** - Immutable audit log for all actions
- **Multi-tenant** - Broker-scoped access control
- **Mobile Responsive** - Optimized for desktop and mobile

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Supabase Auth (email/password)
- **Storage**: Vercel Blob
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Supabase account (for authentication)
- Vercel account (for blob storage)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd mortgagearch
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Fill in the required values:

**Database**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mortgagearch"
```

**Supabase** (get from [Supabase Dashboard](https://app.supabase.com) → Project Settings → API)
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

**Vercel Blob** (get from [Vercel Dashboard](https://vercel.com/dashboard/stores) → Create Blob Store)
```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxx"
```

**App URL**
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Change in production
```

### 3. Database Setup

Push the Drizzle schema to your database:

```bash
npm run db:push
```

### 4. Create Initial Broker User

In Supabase Dashboard:
1. Go to **Authentication** → **Users** → **Add user**
2. Create a user with email/password
3. Copy the User UID

Insert a broker profile in your database:

```sql
INSERT INTO broker_profiles (id, email, full_name, created_at)
VALUES (
  'paste-user-uid-here',
  'broker@example.com',
  'John Smith',
  NOW()
);
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and login with your broker credentials.

## Project Structure

```
src/
├── app/
│   ├── actions/           # Server Actions (mutations)
│   ├── api/               # API Routes
│   ├── dashboard/         # Broker dashboard pages
│   │   ├── clients/       # Client management
│   │   ├── documents/     # Document review
│   │   └── audit/         # Audit log
│   ├── upload/[token]/    # Public borrower upload
│   └── login/             # Authentication
├── lib/
│   ├── db/                # Drizzle schema & client
│   ├── services/          # Business logic layer
│   ├── supabase/          # Auth client/server
│   ├── types.ts           # TypeScript types
│   ├── validators.ts      # Zod schemas
│   └── utils.ts           # Utility functions
└── components/
    └── ui/                # Reusable UI components
```

## Key Workflows

### 1. Client Onboarding
1. Broker creates client profile (`/dashboard/clients`)
2. Broker generates secure upload link with optional expiration/limits
3. Link is shared with borrower (e.g., via email)

### 2. Document Upload
1. Borrower opens upload link (`/upload/{token}`)
2. Token is validated (expiration, revocation, upload limits)
3. Files are uploaded (drag-and-drop, 50MB max)
4. Documents auto-transition: UPLOADED → PROCESSING → PENDING_REVIEW

### 3. Document Review
1. Broker reviews documents (`/dashboard/documents`)
2. Broker can filter by status, client, or search by filename
3. Broker approves (with notes) or rejects (with reason)
4. All decisions are logged in audit trail
5. Broker can change review decision later (logged as "review changed")

### 4. Audit & Compliance
1. All actions logged to immutable audit log
2. Filterable by action type, client, document
3. Shows actor (SYSTEM, BROKER, BORROWER) and details
4. Supports compliance and security reviews

## Document Status Flow

```
UPLOADED (on upload)
    ↓ (automatic)
PROCESSING
    ↓ (automatic)
PENDING_REVIEW
    ↓ (broker action)
APPROVED or REJECTED (terminal states)
```

Brokers can change APPROVED ↔ REJECTED after initial review.

## Security Features

- ✅ Broker-scoped data access (multi-tenant isolation)
- ✅ Token-based upload authorization
- ✅ File type and size validation (compliance constraints)
- ✅ Filename sanitization
- ✅ Immutable audit trail
- ✅ Session refresh via middleware
- ✅ Server-side validation for all mutations

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio (DB GUI)
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel dashboard
3. Add environment variables
4. Deploy

**Important**: Set `NEXT_PUBLIC_APP_URL` to your production domain for upload links to work correctly.

### Database Migrations

After deployment, run migrations:

```bash
npm run db:push
```

## Support & Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)

## License

MIT
