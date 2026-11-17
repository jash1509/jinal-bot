# Jinal Bots web messaging

The messaging page uses Supabase Auth and Postgres. Open `/messages.html` to sign up, sign in, reset a password, or chat directly with another account. To start a chat, ask the recipient for the user ID shown on their messaging page.

## Local setup

1. Apply the SQL in `supabase/migrations` to a Supabase project. It expects the standard Supabase Auth schema and Realtime publication.
2. Enable the email provider in Supabase Auth. Add `http://localhost:5199/messages.html` to the redirect allowlist for sign-up confirmation and password recovery.
3. Create `frontend/.env.local` with the project URL and browser publishable key.

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. From `frontend`, run `npm ci` and `npm run dev`, then open `http://localhost:5199/messages.html`. Sign in with two different users in separate browser profiles. Copy one user’s ID into the other’s recipient field, send a message, and check the recipient’s unread count and chat.

## Hosting

Use the publishable key in the web build and keep privileged keys server-side. For a Render Static Site, set the root directory to `frontend`, the build command to `npm ci && npm run build`, the publish directory to `dist`, and the two Supabase environment variables at build time. Add the deployed `/messages.html` URL to the Auth redirect allowlist. The existing `render.yaml` deploys an upstream Kwant image and does not build this page from source.

Messages and unread state update while the web page is connected. Native clients, device push delivery, and bot conversations still need to be connected to the cloud architecture. The existing Kwant bot UI continues to use its installation-level login and SQLite data.
