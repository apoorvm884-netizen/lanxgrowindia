import { supabase } from '../lib/supabase.js';
import { edgeFunctionError } from './edge-function-error.js';

async function invoke(action, body = {}) {
  const { data, error } = await supabase.functions.invoke('admin-access', {
    body: { action, ...body }
  });
  if (error || data?.error) {
    throw await edgeFunctionError(error, data, 'Administrative action failed.');
  }
  return data;
}

export const AdminAccessService = {
  deleteSchool(schoolId) {
    return invoke('delete_school', { school_id: schoolId });
  },

  deleteSchoolAdmin(userId) {
    return invoke('delete_school_admin', { user_id: userId });
  },

  deleteInvitation(invitationId) {
    return invoke('delete_invitation', { invitation_id: invitationId });
  }
};
