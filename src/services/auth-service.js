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

  getDeviceId() {
    const key = 'lanxgrow_device_id';
    let deviceId = window.localStorage.getItem(key);
    if (!deviceId) {
      deviceId = window.crypto?.randomUUID?.() ||
        `browser-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(key, deviceId);
    }
    return deviceId;
  },

  async verifySessionAccess() {
    const { data, error } = await supabase.rpc('register_my_device', {
      p_device_id: this.getDeviceId(),
      p_device_label: navigator.userAgent.slice(0, 180)
    });
    if (error) return { allowed: false, error: error.message };
    const result = Array.isArray(data) ? data[0] : data;
    return {
      allowed: result?.allowed === true,
      activeDevices: result?.active_devices || 0,
      error: result?.message || 'Access denied.'
    };
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
    const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
    const recoveryOrigin = isLocalHost
      ? 'https://lanxgrowindia.vercel.app'
      : window.location.origin;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${recoveryOrigin}/?mode=recovery`
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  async updateEmail(email) {
    const nextEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return { success: false, error: 'Enter a valid email address.' };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return { success: false, error: userError?.message || 'Please sign in again.' };
    }
    if ((userData.user.email || '').toLowerCase() === nextEmail) {
      return { success: false, error: 'This is already your login email.' };
    }

    const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
    const confirmationOrigin = isLocalHost
      ? 'https://lanxgrowindia.vercel.app'
      : window.location.origin;
    const { data, error } = await supabase.auth.updateUser(
      { email: nextEmail },
      { emailRedirectTo: `${confirmationOrigin}/?mode=email-change` }
    );
    if (error) return { success: false, error: error.message };
    this._profileCache = null;
    return { success: true, data, email: nextEmail };
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
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    // Recover accounts created while the auth profile trigger was unavailable.
    if (error?.code === 'PGRST116') {
      const repairResult = await supabase.rpc('ensure_my_profile');
      data = repairResult.data;
      error = repairResult.error;
    }

    this._profileCache = error ? null : data;
    this._profileCacheTime = Date.now();
    return error ? null : data;
  },

  async completeOnboarding(details) {
    const { data, error } = await supabase.rpc('complete_my_onboarding', {
      p_full_name: details.fullName,
      p_phone: details.phone,
      p_requested_role: details.role,
      p_school_name: details.schoolName || null,
      p_school_code: details.schoolCode || null,
      p_class: details.studentClass || null
    });
    if (error) return { success: false, error: error.message };

    this._profileCache = data;
    this._profileCacheTime = Date.now();
    return { success: true, profile: data };
  }
};
