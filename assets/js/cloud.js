/* Crown-Articles public client configuration. Access is enforced by Supabase RLS. */
window.createLuxCloud = auth => window.supabase?.createClient(
  'https://ooxuleheoijrolfxqlju.supabase.co',
  'sb_publishable_4RBWDj3boR-Fi5aRaGrhyQ_fQ_0ui_W',
  {auth:{storageKey:'lux-aeterna-auth',flowType:'pkce', ...auth}}
);
window.luxCloud = window.createLuxCloud();
