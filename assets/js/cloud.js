/* Crown-Articles public client configuration. Access is enforced by Supabase RLS. */
window.luxCloud=window.supabase?.createClient(
  'https://ooxuleheoijrolfxqlju.supabase.co',
  'sb_publishable_4RBWDj3boR-Fi5aRaGrhyQ_fQ_0ui_W',
  {auth:{storageKey:'lux-aeterna-auth',flowType:'pkce'}}
);
