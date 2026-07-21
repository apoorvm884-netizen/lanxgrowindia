import { supabase } from '../lib/supabase.js';

export const AuthService = {

  async signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user, session: data.session };
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) return { success: false, error: error.message };
    return { success: true, url: data.url };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return { authenticated: false };
    return { authenticated: true, session: data.session, user: data.session.user };
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return { authenticated: false };
    return { authenticated: true, user: data.user };
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      try { callback(event, session); } catch (e) { console.error('Auth state change handler error:', e); }
    });
  },

  async signUpWithEmail(email, password, options) {
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user, session: data.session };
  },

  async sendPasswordResetEmail(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async getProfile() {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    if (error) return null;
    return data;
  }
};
