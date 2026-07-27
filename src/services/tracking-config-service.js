import { supabase } from '../lib/supabase.js';

const invoke = async body => {
  const { data, error } = await supabase.functions.invoke('tracking-config', { body });
  if (error) {
    let message = error.message || 'Tracking configuration request failed.';
    try {
      const details = await error.context?.json();
      if (details?.error) message = details.error;
    } catch (_) {
      // The response may not contain JSON.
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

export const TrackingConfigService = {
  async getStatus() {
    const result = await invoke({ action: 'status' });
    return result.config;
  },

  async save(config) {
    const result = await invoke({ action: 'save', ...config });
    return result.config;
  },

  async removeSecret(secretType) {
    const result = await invoke({ action: 'remove-secret', secretType });
    return result.config;
  }
};
