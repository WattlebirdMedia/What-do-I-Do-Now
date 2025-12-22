# What Do I Do Now?

## Overview

A calm, minimal task manager designed for neurodivergent adults and people with ADHD. The core philosophy is "one task at a time" - showing users only their current task to reduce overwhelm and improve focus. The application follows utility-focused minimalism principles where visual calm and cognitive ease are paramount.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Routing**: Single-page application without client-side routing (simple view-based state)
- **Design System**: Custom neutral grayscale theme optimized for calm, distraction-free experience

The frontend follows a mobile-first design with large touch targets and generous spacing. Components are organized in `client/src/components/` with UI primitives in the `ui/` subdirectory.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Style**: RESTful JSON API under `/api/` prefix
- **Build System**: esbuild for server bundling, Vite for client

The backend uses a clean separation with routes defined in `server/routes.ts`, database operations abstracted through a storage interface in `server/storage.ts`, and schema definitions shared between client and server in `shared/schema.ts`.

### Data Model
- **Users**: Basic user table with id, username, password (prepared for future auth)
- **Tasks**: Core entity with text, position (for ordering), completed status, and timestamps

### Development vs Production
- Development: Vite dev server with HMR, proxied through Express
- Production: Static file serving from built assets in `dist/public`

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `/migrations` directory

### Third-Party Services
- **Stripe**: Payment integration configured via Replit Connectors (credentials fetched dynamically)
- **Web Speech API**: Browser-native speech recognition for voice input (optional feature)

### Key NPM Packages
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `@tanstack/react-query`: Server state management
- `@radix-ui/*`: Accessible UI primitives for shadcn components
- `zod`: Runtime type validation for API requests
- `express-session` / `connect-pg-simple`: Session management (prepared for auth)