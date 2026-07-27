import { supabase } from '../lib/supabase.js';
import { edgeFunctionError } from './edge-function-error.js';

export const NotificationService = {

  async getByUser(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  },

  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count || 0;
  },

  async create(title, message, userId, schoolId) {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        title,
        message: message || null,
        user_ids: userId ? [userId] : [],
        school_id: schoolId || null
      }
    });
    if (error || data?.error) throw await edgeFunctionError(error, data, 'Notification failed.');
    return data;
  },

  async broadcast(title, message, schoolId) {
    return this.create(title, message, null, schoolId);
  },

  async markAsRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  },

  async delete(id) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteAll(userId) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }
};
