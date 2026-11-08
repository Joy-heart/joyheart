# JoyHeart

**Where Hearts Find Happiness.**

JoyHeart is an international dating and matchmaking platform focused on genuine connections, trust, safety, and meaningful relationships.

## Project architecture

This repository is the single source of truth for the JoyHeart application.

- **GitHub:** source code, reviews, and version history.
- **Cloudflare Workers:** application hosting, edge delivery, and runtime security.
- **Supabase:** authentication, PostgreSQL database, and managed backend services.
- **Live domain:** connected after the first production-ready deployment.

There is no separate staging project or staging database in this architecture. Changes are developed on a Git branch, reviewed, and merged to the production branch only when ready.

## Brand system

| Token | Value | Purpose |
| --- | --- | --- |
| Deep Burgundy | `#641D3B` | Primary identity |
| Dusty Rose | `#D98291` | Warmth and romance |
| Rose Gold | `#E5BD83` | Premium accents |
| Warm Ivory | `#FFF8F4` | Light backgrounds |
| Charcoal | `#29232A` | Text and contrast |
| Sage Green | `#527D68` | Positive trust and safety states |

## Application status

The initial public landing page and route shells are in progress. Authentication, profile management, matching, messaging, verification, moderation, and subscriptions are not yet implemented.

## Environment variables

Copy the names from `.env.example` into the appropriate deployment environment.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Only Supabase publishable credentials may be exposed to the browser. Never expose a service-role key, database password, or private API secret in client-side code.

## Security principles

- Enable and test Row Level Security before exposing any user data.
- Keep private profile fields and conversations inaccessible to other users unless explicitly authorized.
- Do not cache authenticated or personalized responses in a shared cache.
- Do not collect real passwords or personal information until Supabase authentication and policies are implemented and tested.
- Treat deployment as a release gate, not proof that the product is production-ready.
