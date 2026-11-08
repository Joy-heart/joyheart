# JoyHeart deployment policy

## One project, one production path

JoyHeart uses one GitHub repository, one Supabase project, one Cloudflare application, and one live domain when it is ready.

- GitHub repository: `Joy-heart/joyheart`
- Production source branch: `main`
- Current implementation branch: `feat/joyheart-foundation`
- Supabase project: the existing JoyHeart project
- Hosting: Cloudflare Workers
- Custom live domain: to be connected after the first release candidate is validated

Do not create a second Supabase project, a separate staging database, or another Cloudflare application for this workflow.

## Cloudflare initialization

The repository includes this non-interactive initialization command:

```sh
npm run setup:cloudflare
```

It invokes the official vinext Cloudflare initializer with these explicit choices:

- CDN/shared response cache: none
- Persistent data cache: none
- Image optimization: none
- Automatic prerendering: disabled

The initializer generates the Cloudflare-specific source configuration and installs the matching Cloudflare integration dependencies. Review the generated `vite.config.ts`, `cloudflare.config.ts`, and `package.json` before deployment. Do not hand-write a competing Wrangler configuration for this native vinext setup.

## Secrets and environment

Only these public Supabase values may be exposed to browser code:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Set them in the Cloudflare application environment when the application is ready to connect to Supabase.

Never expose any of the following in browser variables, committed files, or build logs:

- Supabase service-role key
- Database password or connection string
- Cloudflare API token
- Private signing keys or other server secrets

Private values must be stored as Cloudflare secrets and accessed only from server-side code.

## Release safeguards

1. Work on a Git branch and review changes before merging to `main`.
2. Run the vinext compatibility check and production build.
3. Verify that public pages do not return private user data.
4. Keep shared response and data caching disabled until each route has an explicit, reviewed cache policy.
5. Do not deploy authentication, profile, matching, or messaging flows until Supabase authentication and Row Level Security policies have been implemented and tested.
6. Connect the custom live domain only after the first release candidate passes review.

A successful deployment is not, by itself, evidence that authentication, privacy, or application security is production-ready.
