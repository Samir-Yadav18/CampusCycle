# CampusCycle

CampusCycle is a campus bike-share and fleet management web app for a university environment. It combines a customer-facing booking flow, fleet administration, live ride tracking, wallet settlement, and backend APIs for managing bikes, bookings, and riders.

The project is built with Next.js and TypeScript, and it includes a Postgres-ready schema plus Prisma models for production data modeling.

## Overview

This app supports the full demo lifecycle of a campus micro-mobility system:

- student login and role-based access
- bike and dock discovery
- booking approval workflows
- trip lifecycle and active ride telemetry
- wallet balance and payments
- admin dashboard for fleet and user management
- campus station and bike inventory screens

## Product goals

- Make bike access simple for students on campus
- Enforce fleet capacity and same-day booking rules
- Let admins manage maintenance, approvals, and rider accounts
- Simulate a realistic campus mobility system with live UI state

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- PostgreSQL schema + Prisma ORM
- Supabase client support
- Node.js scripts for data validation and seed tasks

## Project layout

```text
CampusCatalyst/
├── prisma/
│   └── schema.prisma
├── public/
│   ├── bikes/
│   ├── images/
│   └── stitch_screens/
├── scripts/
│   ├── find_region.mjs
│   ├── inspect_pixels.mjs
│   ├── make_transparent_bikes.mjs
│   ├── seed_users.mjs
│   ├── test_composite.mjs
│   ├── test_db_connection.mjs
│   ├── verify_backend_api.mjs
│   └── ...
├── src/
│   ├── app/
│   ├── components/
│   ├── context/
│   ├── controllers/
│   ├── data/
│   ├── lib/
│   ├── models/
│   └── ...
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── schema.sql
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Core features

### Student experience

- login flow for campus users
- map-based bike discovery interface
- stations and bike list views
- booking unlock flow
- active trip screen with runtime telemetry
- trip summary with fare settlement

### Admin experience

- fleet overview dashboard
- maintenance toggling
- booking approval/rejection/cancelation
- user activation and deactivation
- overview statistics for operational monitoring

### Data and business rules

- fleet capacity validation
- same-day booking cutoff checks
- maintenance restrictions
- role-aware access controls in server routes
- wallet balance tracking and ride settlements

## Authentication and roles

The app includes a simple role model:

- student
- volunteer
- admin

Default seeded accounts are defined in the user store logic and include:

- Samir Yadav — student — userId: `260691`
- Kirtika Chaudhary — student — userId: `260816`
- Sumit Kumar — student — userId: `264071`
- Mohit Sharma — admin — userId: `Mohit Sharma`

The default admin login password is:

- `12345678`

Student demo users use their own IDs as passwords, for example:

- `260691`
- `260816`
- `264071`

## Local setup

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL (for the schema-based backend and Prisma usage)

### Install dependencies

```bash
npm install
```

### Run the app in development mode

```bash
npm run dev
```

Then open the app in your browser:

```text
http://localhost:3000
```

## Production build

```bash
npm run build
npm run start
```

## Database setup

This repository contains both a raw PostgreSQL migration file and Prisma schema definitions.

### Option 1: Use the SQL schema

```bash
psql -d your_database -f schema.sql
```

### Option 2: Use Prisma

1. Configure your `DATABASE_URL` in an environment file.
2. Run:

```bash
npx prisma generate
npx prisma db push
```

Example `.env` value:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/campuscycle"
```

## Scripts

The repository includes helper scripts for verification and fleet-related tasks.

```bash
npm run seed:users
```

This seeds the local user store used by the app.

Other scripts in `scripts/` include checks for backend API behavior, fleet management, telemetry validation, and booking policy enforcement.

## Route and app structure

### App pages

The app uses the Next.js App Router. Key entries include:

- `/` — default campus map/home screen
- `/login` — login landing screen
- `/booking` — booking flow
- `/map` — campus bike map view
- `/stations` — station and fleet overview
- `/active-ride` — active trip telemetry
- `/trip-summary` — ride completion summary
- `/admin` — admin dashboard

### API routes

The app exposes route handlers under `src/app/api` for:

- authentication
- users
- bookings
- fleet / cycles
- telemetry
- wallet operations
- admin overview and controls

## Notes on implementation

This project mixes a demo UI, server-side logic, and a real database-ready model structure. In particular:

- UI state and ride flow are managed primarily through a React context provider.
- Booking and fleet logic are represented in typed models and backend routes.
- SQL definitions in `schema.sql` and `prisma/schema.prisma` describe the intended persistent data model.
- The authentication layer is backed by a local JSON user store with optional Supabase syncing.

## Recommended next steps

- configure a real PostgreSQL database and set `DATABASE_URL`
- move from the local user store to a production-backed auth system if needed
- connect the booking and wallet flows to a real database-backed persistence layer
- add tests for booking rules, approval workflows, and fleet constraints

## License

This project currently does not include a dedicated license file. If you plan to publish or distribute it, add a proper license before release.

## Summary

CampusCycle is a full-stack campus bike-sharing prototype that demonstrates how a university mobility platform can handle user access, booking management, fleet operations, and ride settlement in a single application.
