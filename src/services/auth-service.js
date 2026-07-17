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
    return { success: !error, error: error?.message };
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
      callback(event, session);
    });
  },

  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) return null;
    return data;
  }
};
