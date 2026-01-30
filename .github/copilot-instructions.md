# Grounded - AI Coding Instructions

## Project Overview
**Grounded** is a focus-enhancing task management app designed specifically for ADHD minds. It presents one task at a time in a calm, minimalist interface to reduce decision fatigue and cognitive overload. The app is built as a full-stack TypeScript application with React frontend, Express backend, and PostgreSQL database.

**Mission**: Radical simplicity + cognitive ease. No animations, no gamification, no visual noise.

---

## Architecture & Data Flow

### High-Level Stack
- **Frontend**: React 18 + TypeScript (Vite, Tailwind CSS, Radix UI components)
- **Backend**: Express.js + TypeScript (tsx for dev, esbuild for production)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT-based (Bearer token in Authorization header)
- **Payment**: Stripe integration (trial + subscription)

### Directory Structure
- `client/src/` - React components, hooks, pages
- `server/` - Express routes, auth, database queries
- `shared/` - TypeScript schemas (Drizzle ORM definitions, shared types)
- `script/build.ts` - Custom build pipeline (Vite for client, esbuild for server bundle)

### Data Entities (Drizzle Schema - `shared/schema.ts`)
- **users**: User accounts (email, passwordHash, firstName, lastName, isAdmin, hasPaid, createdAt)
- **tasks**: User tasks (userId, text, position, completedAt, archivedAt)
- **payments**: Stripe subscription state (userId, payIdReference, paymentPending, subscriptionPlan)

### API Request Flow
1. **Client** makes authenticated requests via `apiRequest()` helper (includes `credentials: "include"` for session cookies)
2. **Express middleware** (`requireAuth`) validates JWT from Bearer token
3. **Database query** executes via Drizzle ORM (imported from `@shared/schema`)
4. **Response** returned as JSON; error responses use standard HTTP status codes

**Key Auth Implementation**: See `server/auth.ts` for JWT generation (7-day expiry). Session persistence happens via `express-session` with `connect-pg-simple` store.

---

## Design System & Component Patterns

### Core Design Philosophy
From `design_guidelines.md`: **Utility-Focused Minimalism**
- Zero animations or transitions (instant state changes)
- No loading spinners, no progress indicators, no celebrations
- Text-only UI (no images)
- Large typography and touch targets (min 44x44px)
- System font stack, generous spacing (Tailwind p-8 to p-12)

### UI Component Architecture
- **Radix UI base**: All interactive components (`button.tsx`, `input.tsx`, `card.tsx`, etc. in `client/src/components/ui/`)
- **shadcn/ui pattern**: Headless components with Tailwind styling
- **No custom CSS**: All styling via Tailwind classes
- **Theme support**: `ThemeProvider.tsx` + `ThemeToggle.tsx` (light/dark mode via `next-themes`)

### Key Components
- **TaskInput**: Text input + optional speech recognition (Web Speech API)
- **TaskDisplay**: Shows current task with "Done" button
- **CompletedTasks**: Lists archived tasks for the day
- **Paywall**: Trial countdown + subscription gate

### Forms & Validation
- Uses `react-hook-form` + `@hookform/resolvers` for validation
- Schema validation via Zod (from `shared/schema.ts` or custom Zod schemas)
- Example: See `client/src/components/` for form implementations

---

## Critical Developer Workflows

### Development
```bash
npm run dev        # Starts Express server in development (tsx watches and reloads)
```
- Vite serves the client on `localhost:5173` by default
- Express server includes request/response logging with formatted timestamps
- Environment variables loaded from `.env` (JWT_SECRET, DATABASE_URL required)

### Build & Production
```bash
npm run build      # Vite client + esbuild server (bundles dependencies for faster cold starts)
npm run start      # Runs production bundle (NODE_ENV=production)
```
- **esbuild allowlist** in `script/build.ts`: Pre-bundles key dependencies (express, drizzle-orm, pg, stripe, jwt, etc.)
- Production output: `dist/index.cjs` (server) + `dist/public/` (React SPA)

### Database Migrations
```bash
npm run db:push    # Applies Drizzle schema changes to PostgreSQL
```
- Requires `DATABASE_URL` environment variable
- Schema definition: `shared/schema.ts`

### Type Checking
```bash
npm run check      # tsc --noEmit (catches TS errors without building)
```

---

## Key Patterns & Conventions

### Route Registration Pattern (`server/routes.ts`)
Routes are registered in a single `registerRoutes()` function that receives the Express app:
```typescript
export async function registerRoutes(_server: any, app: Express) {
  await setupAuth(app);  // Auth routes from auth.ts
  // Additional routes here
}
```
Auth setup happens via `setupAuth()` which defines `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/user`.

### Database Query Pattern (via Drizzle)
```typescript
const result = await db.select().from(users).where(eq(users.id, id)).execute();
return result[0] ?? null;
```
- Always use `.execute()` at the end
- Nullish coalescing (`?? null`) for safe returns
- Common queries encapsulated in `storage` object in `routes.ts`

### Client Data Fetching (React Query)
- **Hook**: `useAuth()` in `client/src/hooks/use-auth.ts` provides user state
- **Query**: Use `useQuery()` with `/api/...` endpoints as queryKey
- **Mutation**: Use `useMutation()` for POST/PUT/DELETE; invalidate queries on success
- **Error handling**: All non-OK responses throw (caught by React Query, shown as errors)

### Styling Approach
- **No inline styles** - all Tailwind classes
- **Responsive design**: Mobile-first (design targets small screens)
- **Dark mode**: Implemented via `next-themes` (class-based, respects system preference)

---

## Important Integration Points

### Authentication Flow
1. Client calls `/auth/register` or `/auth/login` → receives JWT token
2. Token stored in memory (not localStorage for security; session restored on page load via `/api/auth/user`)
3. Subsequent requests include token in `Authorization: Bearer <token>` header
4. Server middleware `requireAuth()` validates before accessing protected routes

### Payment & Trial Logic
- Users get 7-day trial on signup
- `hasPaid` flag in users table determines access after trial
- Stripe integration (`stripe` npm package + `stripe-replit-sync`) for subscriptions
- Trial countdown banner shown in App (calculated from `createdAt`)

### Real-time Considerations
- WebSocket support exists (`ws` in dependencies) but not currently used
- Current model: polling via React Query (staleTime: Infinity by default, no auto-refetch)

---

## Testing & Debugging

### Test Auth Script
- `testAuth.ts` exists for manual auth flow testing
- Run via: `tsx testAuth.ts` (if configured)

### Logging
- Server logs all API requests with method, path, duration, status code (see `server/index.ts`)
- Client-side: Use standard `console.log()` (errors visible in browser dev tools)

### Common Issues & Solutions
1. **Database connection fails**: Check `DATABASE_URL` in `.env` and PostgreSQL is running
2. **Auth token invalid**: JWT_SECRET mismatch between encode/decode; ensure `.env` JWT_SECRET is consistent
3. **Build errors**: Run `npm run check` first to catch TypeScript errors before esbuild
4. **Vite client not loading**: Ensure vite.config.ts root alias (`@` → `client/src/`, `@shared` → `shared`)

---

## Conventions & Project Norms

### File Organization
- React components: One component per file, named as `PascalCase.tsx`
- Server routes/logic: Organized by domain (auth, tasks, payments)
- Shared types: Always export from `shared/schema.ts` or create in `shared/models/`

### Naming
- Database tables: snake_case (e.g., `password_hash`, `created_at`)
- TypeScript types: PascalCase (e.g., `User`, `NewTask`)
- Component props: Use `interface ComponentNameProps`

### Error Handling
- Server: Return meaningful HTTP status codes + JSON error messages
- Client: React Query automatically throws errors; components handle via error UI
- Never silently ignore errors; log and display to user when relevant

### Environment Variables (`.env`)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Used for token signing (min 32 characters)
- Additional: `NODE_ENV`, Stripe keys, etc.

---

## Quick Start for New Features

1. **Add a database table**: Update `shared/schema.ts`, run `npm run db:push`
2. **Add an API route**: Create handler in `server/routes.ts`, register in `registerRoutes()`
3. **Add a React component**: Create in `client/src/components/`, use Radix UI + Tailwind
4. **Query data**: Use React Query's `useQuery()` with apiRequest helper
5. **Test**: Run `npm run dev`, check browser console + server logs
