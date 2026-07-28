import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const ContentService = {

  async getAll() {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByDriveFolder(driveFolderId) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('drive_folder_id', driveFolderId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getProgress(contentId) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw userError || new Error('Authentication required');
    const { data, error } = await supabase
      .from('content_progress')
      .select('*')
      .eq('content_id', contentId)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getMyProgress() {
    const { data, error } = await supabase
      .from('content_progress')
      .select('*')
      .order('last_viewed_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveProgress(contentId, schoolId, progress) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw userError || new Error('Authentication required');
    const duration = Number(progress.durationSeconds) || null;
    const position = Math.max(0, Number(progress.positionSeconds) || 0);
    const completed = Boolean(progress.completed) || Boolean(duration && position / duration >= 0.75);
    const { data, error } = await supabase
      .from('content_progress')
      .upsert({
        content_id: contentId,
        user_id: userData.user.id,
        school_id: schoolId,
        position_seconds: position,
        duration_seconds: duration,
        playback_rate: Math.min(2, Math.max(0.25, Number(progress.playbackRate) || 1)),
        completed,
        watched_seconds: Math.max(0, Number(progress.watchedSeconds) || position),
        last_viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'content_id,user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async issuePlaybackToken(contentId) {
    const { data, error } = await supabase.rpc('issue_playback_token', {
      p_content_id: contentId,
      p_client_fingerprint: null
    });
    if (error) throw error;
    const token = Array.isArray(data) ? data[0] : data;
    if (!token?.stream_path) throw new Error('Unable to create a secure playback session.');
    return token;
  },

  async review(id, decision, reason) {
    const { data, error } = await supabase.rpc('review_content', {
      p_content_id: id,
      p_decision: decision,
      p_reason: reason || null
    });
    if (error) throw error;
    return data;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('content')
      .insert({
        name: item.name,
        type: item.type,
        url: item.url || null,
        size: item.size || null,
        school_id: item.schoolId,
        drive_folder_id: item.driveFolderId || null,
        description: item.description || null,
        tags: item.tags || [],
        status: item.status || 'draft',
        thumbnail: item.thumbnail || null,
        duration: item.duration || null,
        author: item.author || null,
        visibility: item.visibility || 'school'
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('uploaded', 'Content', data.name, `Content "${data.name}" uploaded`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.url !== undefined) payload.url = updates.url;
    if (updates.size !== undefined) payload.size = updates.size;
    if (updates.driveFolderId !== undefined) payload.drive_folder_id = updates.driveFolderId;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.thumbnail !== undefined) payload.thumbnail = updates.thumbnail;
    if (updates.duration !== undefined) payload.duration = updates.duration;
    if (updates.author !== undefined) payload.author = updates.author;
    if (updates.visibility !== undefined) payload.visibility = updates.visibility;

    const { data, error } = await supabase
      .from('content')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Content', data.name, `Content "${data.name}" updated`);
    return data;
  },

  async delete(id) {
    const { data: item, error: fetchError } = await supabase
      .from('content')
      .select('name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Content', item?.name || 'Unknown', `Content deleted`);
  }
};
