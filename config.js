// Live configuration — the anon key is Supabase's publishable client key (safe in public code).
window.TRIP_CONFIG = {
  SUPABASE_URL: "https://asxdpjlqndxpcwtsuyle.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzeGRwamxxbmR4cGN3dHN1eWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjI3MjYsImV4cCI6MjA5OTgzODcyNn0.o1aqBvxd-fkLK20xru6nVz_jtwW0tDLSRXO7ValDMZs",

  // ██ TODO ██ — paste the Railway URL for japan-2026-concierge here once deployed
  // (Railway → new service from the japan-2026-concierge repo → set ANTHROPIC_API_KEY
  //  + TRIP_KEY vars → Settings → Networking → Generate Domain → paste it below).
  // Until then the Chat tab shows its setup card and everything else works.
  CONCIERGE_URL: "https://japan-2026-concierge-production.up.railway.app",

  TRIP_KEY: "japan-2026",   // must match the TRIP_KEY env var on Railway
  TRIP_ID: "japan-2026"     // scopes rows in the shared Supabase table — never reuse an old trip's id
};
