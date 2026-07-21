// TEMP DEMO MODE
// REMOVE BEFORE PRODUCTION
// ============================================================
// Demo Authentication Service
// ============================================================
// Implements the AuthService interface using only demo credentials.
// No Supabase Authentication is contacted.
// ============================================================

import { findDemoUser } from './demo-config.js';

// Map demo emails to fixed user IDs that match demo-data.js
const EMAIL_TO_ID = {
  'founder@lanxgrow.com': 'demo-superadmin-1',
  'admin@lanxgrow.com': 'demo-superadmin-2',
  'demo@school1.com': 'demo-schooladmin-1',
  'demo@school2.com': 'demo-schooladmin-2',
  'demo@counselor.com': 'demo-counselor-1',
  'demo@student.com': 'demo-student-1',
};

let _demoSession = null;
let _demoUser = null;
let _demoProfile = null;
let _authListeners = [];

function _notify(event, session) {
  _authListeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch (e) { console.error('Demo auth callback error:', e); }
  });
}

export const DemoAuth = {
  async signInWithEmail(email, password) {
    const cred = findDemoUser(email, password);
    if (!cred) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const userId = EMAIL_TO_ID[cred.email] || `demo-${cred.role}-${Date.now()}`;
    _demoUser = {
      id: userId,
      email: cred.email,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { name: cred.name, role: cred.role },
    };
    _demoProfile = {
      id: userId,
      email: cred.email,
      name: cred.name,
      role: cred.role,
      school_id: cred.schoolId,
      avatar_url: cred.avatar,
      created_at: new Date().toISOString(),
    };
    _demoSession = {
      access_token: `demo-token-${Date.now()}`,
      refresh_token: `demo-refresh-${Date.now()}`,
      expires_in: 86400,
      token_type: 'bearer',
      user: _demoUser,
    };

    _notify('SIGNED_IN', _demoSession);
    return { success: true, user: _demoUser, session: _demoSession };
  },

  async signInWithGoogle() {
    return {
      success: false,
      error: 'Demo mode does not support Google login. Use email/password instead.',
    };
  },

  async signOut() {
    _demoSession = null;
    _demoUser = null;
    _demoProfile = null;
    _notify('SIGNED_OUT', null);
    return { success: true };
  },

  async getSession() {
    if (!_demoSession) return { authenticated: false, session: null, user: null };
    return { authenticated: true, session: _demoSession, user: _demoUser };
  },

  async getUser() {
    if (!_demoUser) return { authenticated: false, user: null };
    return { authenticated: true, user: _demoUser };
  },

  async getProfile() {
    return _demoProfile;
  },

  onAuthStateChange(callback) {
    _authListeners.push(callback);
    // Return unsubscribe function
    return {
      unsubscribe() {
        _authListeners = _authListeners.filter((l) => l !== callback);
      },
    };
  },
};
