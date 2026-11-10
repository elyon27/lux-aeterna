(() => {
  'use strict';

  const cloud = window.createLuxCloud?.({
    storageKey: 'lux-aeterna-delete-auth',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  });
  const form = document.getElementById('deleteAccountForm');
  const status = document.getElementById('deleteStatus');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const confirmation = document.getElementById('confirmation');
  const submit = form.querySelector('button[type="submit"]');

  if (!cloud) {
    status.textContent = 'Secure sign-in is unavailable. Reload this page or contact support.';
    return;
  }

  status.textContent = '';
  submit.disabled = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled || confirmation.value !== 'DELETE') return;

    submit.disabled = true;
    status.textContent = 'Verifying your password…';
    let deleted = false;
    try {
      const { data, error: signInError } = await cloud.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });
      if (signInError) {
        status.textContent = 'Sign-in failed. Check your email and password or contact support.';
        return;
      }

      status.textContent = 'Deleting your account and online records…';
      const { error } = await cloud.rpc('lux_delete_my_account');
      if (error) {
        status.textContent = 'Deletion could not be confirmed. Try again or contact support.';
        return;
      }

      deleted = true;
      form.reset();
      form.hidden = true;
      status.textContent = 'Your Lux Aeterna account and online records have been permanently deleted.';
      const { data: { session } } = await window.luxCloud.auth.getSession();
      if (session?.user.id === data.user.id) {
        await window.luxCloud.auth.signOut({ scope: 'local' });
      }
    } catch {
      if (!deleted) status.textContent = 'Deletion could not be confirmed. Try again or contact support.';
    } finally {
      password.value = '';
      submit.disabled = deleted;
    }
  });
})();
