import { supabase } from '../lib/supabase.js';

export const GpsService = {

  // ── Vehicles ──────────────────────────────────────────────
  async getVehicles(schoolId) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, gps_devices(*)')
      .eq('school_id', schoolId)
      .order('label');
    if (error) throw error;
    return data || [];
  },

  async createVehicle(vehicle) {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        school_id: vehicle.school_id,
        label: vehicle.label,
        registration_number: vehicle.registration_number || null,
        capacity: vehicle.capacity || null,
        driver_name: vehicle.driver_name || null,
        driver_phone: vehicle.driver_phone || null,
        notes: vehicle.notes || null,
        status: vehicle.status || 'active'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateVehicle(id, updates) {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteVehicle(id) {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) throw error;
  },

  // ── GPS Devices ───────────────────────────────────────────
  async getDevices(schoolId) {
    const { data, error } = await supabase
      .from('gps_devices')
      .select('*, vehicles(label, registration_number)')
      .eq('school_id', schoolId)
      .order('device_uid');
    if (error) throw error;
    return data || [];
  },

  async createDevice(device) {
    const { data, error } = await supabase
      .from('gps_devices')
      .insert({
        school_id: device.school_id,
        vehicle_id: device.vehicle_id || null,
        device_uid: device.device_uid,
        sim_number: device.sim_number || null,
        status: device.status || 'active'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateDevice(id, updates) {
    const { data, error } = await supabase
      .from('gps_devices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteDevice(id) {
    const { error } = await supabase.from('gps_devices').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Live Locations ────────────────────────────────────────
  async getCurrentLocations(schoolId) {
    const { data, error } = await supabase
      .from('vehicle_current_location')
      .select('*, vehicles!inner(label, registration_number, driver_name, driver_phone, status)')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data || [];
  },

  // ── Location History ──────────────────────────────────────
  async getLocationHistory(vehicleId, from, to) {
    let query = supabase
      .from('vehicle_locations')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('recorded_at', { ascending: true });
    if (from) query = query.gte('recorded_at', from);
    if (to) query = query.lte('recorded_at', to);
    const { data, error } = await query.limit(2000);
    if (error) throw error;
    return data || [];
  },

  // ── Vehicle Events ────────────────────────────────────────
  async getEvents(schoolId, limit = 50) {
    const { data, error } = await supabase
      .from('vehicle_events')
      .select('*, vehicles(label)')
      .eq('school_id', schoolId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // ── Realtime subscription for live tracking ───────────────
  subscribeToLocations(schoolId, callback) {
    return supabase
      .channel(`gps-${schoolId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicle_current_location',
        filter: `school_id=eq.${schoolId}`
      }, payload => callback(payload))
      .subscribe();
  },

  unsubscribe(channel) {
    if (channel) supabase.removeChannel(channel);
  }
};
