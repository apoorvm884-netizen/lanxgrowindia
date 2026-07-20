import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const SettingsService = {

  async getAll() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('key');
    if (error) throw error;
    return data || [];
  },

  async get(key) {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async set(key, value, description) {
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        description
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Setting', key, `Setting "${key}" updated`);
    return data;
  },

  async delete(key) {
    const { error } = await supabase
      .from('settings')
      .delete()
      .eq('key', key);
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