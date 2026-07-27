import { supabase } from '../lib/supabase.js';

function edgeError(error, data, fallback) {
  return new Error(data?.error || error?.context?.body?.error || error?.message || fallback);
}

export const AccountService = {
  async provision({ email, password, fullName, role, schoolId, studentId, counselorId }) {
    const { data, error } = await supabase.functions.invoke('provision-user', {
      body: {
        email,
        password,
        full_name: fullName,
        role,
        school_id: schoolId || null,
        student_id: studentId || null,
        counselor_id: counselorId || null
      }
    });
    if (error || data?.error) throw edgeError(error, data, 'Could not create the login account.');
    return data;
  },

  async resetPassword({ userId, email, password, role, schoolId, studentId, counselorId, fullName }) {
    const { data, error } = await supabase.functions.invoke('provision-user', {
      body: {
        action: 'reset_password',
        user_id: userId || null,
        email,
        password,
        full_name: fullName,
        role,
        school_id: schoolId || null,
        student_id: studentId || null,
        counselor_id: counselorId || null
      }
    });
    if (error || data?.error) throw edgeError(error, data, 'Could not reset the login password.');
    return data;
  },

  async setLogin({ email, password, role, schoolId, fullName }) {
    const { data, error } = await supabase.functions.invoke('provision-user', {
      body: {
        action: 'set_login',
        email,
        password,
        full_name: fullName,
        role,
        school_id: schoolId
      }
    });
    if (error || data?.error) throw edgeError(error, data, 'Could not create or reset the login.');
    return data;
  }
};
