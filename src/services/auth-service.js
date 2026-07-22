import { supabase } from '../lib/supabase.js';

export const AuthService = {
  _profileCache: null,
  _profileCacheTime: 0,
  _profileCacheTTL: 30000,

  async signInWithEmail(email, password) {
    this._profileCache = null;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user, session: data.session };
  },

  async signInWithGoogle() {
    this._profileCache = null;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) return { success: false, error: error.message };
    return { success: true, url: data.url };
  },

  async signOut() {
    this._profileCache = null;
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
      this._profileCache = null;
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
      redirectTo: window.location.origin
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async getProfile(forceRefresh) {
    if (!forceRefresh && this._profileCache && (Date.now() - this._profileCacheTime) < this._profileCacheTTL) {
      return this._profileCache;
    }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      this._profileCache = null;
      return null;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();
    this._profileCache = error ? null : data;
    this._profileCacheTime = Date.now();
    return error ? null : data;
  }
};
