import { supabase } from '../lib/supabase.js';
import { edgeFunctionError } from './edge-function-error.js';

const invoke = async body => {
  const { data, error } = await supabase.functions.invoke('tracking-config', { body });
  if (error || data?.error) throw await edgeFunctionError(error, data, 'Tracking configuration request failed.');
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
