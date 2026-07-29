import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

const BRAND_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function validateBrandImage(file) {
  if (!file || !BRAND_IMAGE_TYPES.has(file.type)) {
    throw new Error('Please choose a PNG, JPG, or WebP image.');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Brand images must be 2 MB or smaller.');
  }
}

export const SettingsService = {

  async _getScope() {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) throw authError || new Error('Authentication required.');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', authData.user.id)
      .single();
    if (profileError) throw profileError;
    if (profile.role === 'super_admin') return { profile, companyId: null };
    if (profile.role === 'company_admin' && profile.company_id) {
      return { profile, companyId: profile.company_id };
    }
    throw new Error('You are not authorized to manage company settings.');
  },

  async getAll() {
    const { companyId } = await this._getScope();
    let query = supabase
      .from('settings')
      .select('*');
    query = companyId ? query.eq('company_id', companyId) : query.is('company_id', null);
    const { data, error } = await query.order('key');
    if (error) throw error;
    return data || [];
  },

  async get(key) {
    const { companyId } = await this._getScope();
    let query = supabase
      .from('settings')
      .select('*')
      .eq('key', key);
    query = companyId ? query.eq('company_id', companyId) : query.is('company_id', null);
    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async set(key, value, description) {
    const { data, error } = await supabase.rpc('set_company_setting', {
      p_key: key,
      p_value: value,
      p_description: description || null
    });
    if (error) throw error;

    await AuditLogService.log('edited', 'Setting', key, `Setting "${key}" updated`);
    return data;
  },

  async getEffectiveBranding() {
    const { data, error } = await supabase.rpc('get_effective_branding');
    if (error) throw error;
    return data || {};
  },

  async uploadBrandAsset(file, kind = 'logo') {
    validateBrandImage(file);

    const { profile } = await this._getScope();
    const { data: authData } = await supabase.auth.getUser();

    const prefix = profile.role === 'super_admin' ? 'global' : profile.company_id;
    if (!prefix || !['super_admin', 'company_admin'].includes(profile.role)) {
      throw new Error('You are not authorized to manage company branding.');
    }

    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const safeKind = ['favicon', 'orbit'].includes(kind) ? kind : 'logo';
    const path = `${prefix}/${safeKind}-${Date.now()}-${authData.user.id}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('branding-assets')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from('branding-assets').getPublicUrl(path);
    if (!publicData?.publicUrl) throw new Error('Brand image URL could not be created.');
    return publicData.publicUrl;
  },

  async uploadSchoolLogo(file, schoolId) {
    validateBrandImage(file);
    if (!schoolId) throw new Error('Save the school before uploading its logo.');

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) throw authError || new Error('Authentication required.');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, school_id, company_id')
      .eq('id', authData.user.id)
      .single();
    if (profileError) throw profileError;

    if (profile.role === 'school_admin' && profile.school_id !== schoolId) {
      throw new Error('You can only change your own school logo.');
    }
    if (profile.role === 'company_admin') {
      const { data: school, error } = await supabase
        .from('schools')
        .select('company_id')
        .eq('id', schoolId)
        .single();
      if (error) throw error;
      if (!profile.company_id || school.company_id !== profile.company_id) {
        throw new Error('This school is outside your company.');
      }
    }
    if (!['super_admin', 'company_admin', 'school_admin'].includes(profile.role)) {
      throw new Error('You are not authorized to change school branding.');
    }

    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const path = `schools/${schoolId}/logo-${Date.now()}-${authData.user.id}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('branding-assets')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from('branding-assets').getPublicUrl(path);
    if (!publicData?.publicUrl) throw new Error('School logo URL could not be created.');
    return publicData.publicUrl;
  },

  async delete(key) {
    const { companyId } = await this._getScope();
    let query = supabase
      .from('settings')
      .delete()
      .eq('key', key);
    query = companyId ? query.eq('company_id', companyId) : query.is('company_id', null);
    const { error } = await query;
    if (error) throw error;

    await AuditLogService.log('deleted', 'Setting', key, `Setting "${key}" deleted`);
  },

  async reset() {
    const defaults = [
      { key: 'companyName', value: 'LanxGrow Learning', description: 'Company display name' },
      { key: 'language', value: 'en', description: 'Default platform language' },
      { key: 'timezone', value: 'UTC', description: 'Default platform timezone' },
      { key: 'maxUploadSize', value: 100, description: 'Maximum upload size in MB' },
      { key: 'primaryColor', value: '#1A56DB', description: 'Primary brand color' },
      { key: 'smtpHost', value: 'smtp.sendgrid.net', description: 'SMTP server host' },
      { key: 'smtpPort', value: 587, description: 'SMTP server port' },
      { key: 'fromEmail', value: 'noreply@lanxgrow.com', description: 'From email address' },
      { key: 'fromName', value: 'LanxGrow Learning', description: 'From name for emails' }
    ];
    for (const setting of defaults) {
      await this.set(setting.key, setting.value, setting.description);
    }
  }
};
