# Supabase integration

This project connects to an existing Supabase project. Simploy does not install,
deploy, or operate Supabase.

## Next.js client libraries

The generated Next.js helpers use the official Supabase SSR client packages.
When Supabase is selected, Simploy adds `@supabase/supabase-js` and
`@supabase/ssr` to `app/package.json` with pnpm.

## Generated application boilerplate

The Next.js integration adds the following application-owned helpers:

- `app/lib/supabase/client.ts` for browser access;
- `app/lib/supabase/server.ts` for server-side access and session cookies;
- `app/lib/supabase/auth.ts` for password sign-in and sign-out actions;
- `app/lib/supabase/storage.ts` for upload and signed URL helpers.

The integration also adds the application-owned migration material in
`services/supabase/migrations/001_initial_schema.sql`. Review and apply it to
the external Supabase instance with the operator's chosen migration process.
Simploy does not apply migrations or manage the Supabase instance.

## Runtime configuration

Provide these values through the project's runtime-secret and CI mechanism. Do
not commit their values to the repository.

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | URL of the existing Supabase project. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server | Publishable client key. This value is intentionally exposed to browser code. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Optional privileged key for narrowly scoped server-side operations. Never expose it through `NEXT_PUBLIC_` variables. |

The generated browser helper uses only the two `NEXT_PUBLIC_` values. The
server helper uses the same publishable configuration and session cookies. Add
`SUPABASE_SERVICE_ROLE_KEY` only to server-side runtime configuration when an
application feature explicitly requires it.
