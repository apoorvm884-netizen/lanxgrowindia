import { createClient } from '@supabase/supabase-js';

export class SupabaseTrackingStore {
  constructor(config) {
    this.client = createClient(config.supabaseUrl, config.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  async resolveDevice(deviceUid) {
    const { data, error } = await this.client
      .from('gps_devices')
      .select('id, school_id, vehicle_id, status')
      .eq('device_uid', deviceUid)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`No active GPS device matches deviceId: ${deviceUid}`);
    if (!data.vehicle_id) throw new Error(`GPS device is not assigned to a vehicle: ${deviceUid}`);

    const { data: school, error: schoolError } = await this.client
      .from('schools')
      .select('tracking_sheet_id')
      .eq('id', data.school_id)
      .single();
    if (schoolError) throw schoolError;
    if (!school?.tracking_sheet_id) {
      throw new Error(`Tracking Sheet ID is not configured for deviceId: ${deviceUid}`);
    }

    return { ...data, tracking_sheet_id: school.tracking_sheet_id };
  }

  async appendLocation(device, ping) {
    const { data: existing, error: lookupError } = await this.client
      .from('vehicle_locations')
      .select('id')
      .eq('device_id', device.id)
      .eq('recorded_at', ping.timestamp)
      .limit(1);
    if (lookupError) throw lookupError;
    if (existing?.length) return existing[0];

    const { data, error } = await this.client
      .from('vehicle_locations')
      .insert({
        school_id: device.school_id,
        vehicle_id: device.vehicle_id,
        device_id: device.id,
        latitude: ping.latitude,
        longitude: ping.longitude,
        speed_kmph: ping.speed,
        heading: ping.heading,
        accuracy_m: ping.accuracy,
        ignition: ping.ignition,
        recorded_at: ping.timestamp
      })
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }
}
