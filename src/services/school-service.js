import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const SchoolService = {

  async getAll() {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getByCode(code) {
    const { data, error } = await supabase
      .from('schools')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(school) {
    const { data, error } = await supabase
      .from('schools')
      .insert({
        name: school.name,
        code: school.code,
        status: school.status || 'active',
        principal_name: school.principal_name || null,
        school_type: school.school_type || null,
        contact_person: school.contact_person || null,
        phone: school.phone || null,
        email: school.email || null,
        website: school.website || null,
        address_line1: school.address_line1 || null,
        address_line2: school.address_line2 || null,
        city: school.city || null,
        state: school.state || null,
        country: school.country || 'India',
        postal_code: school.postal_code || null,
        academic_year: school.academic_year || null,
        board: school.board || null,
        medium: school.medium || null,
        timezone: school.timezone || 'Asia/Kolkata',
        plan: school.plan || 'basic',
        student_limit: school.student_limit || null,
        teacher_limit: school.teacher_limit || null,
        counselor_limit: school.counselor_limit || null,
        storage_limit: school.storage_limit || null
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'School', data.name, `School "${data.name}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.code !== undefined) payload.code = updates.code;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.principal_name !== undefined) payload.principal_name = updates.principal_name;
    if (updates.school_type !== undefined) payload.school_type = updates.school_type;
    if (updates.contact_person !== undefined) payload.contact_person = updates.contact_person;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.website !== undefined) payload.website = updates.website;
    if (updates.address_line1 !== undefined) payload.address_line1 = updates.address_line1;
    if (updates.address_line2 !== undefined) payload.address_line2 = updates.address_line2;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.state !== undefined) payload.state = updates.state;
    if (updates.country !== undefined) payload.country = updates.country;
    if (updates.postal_code !== undefined) payload.postal_code = updates.postal_code;
    if (updates.academic_year !== undefined) payload.academic_year = updates.academic_year;
    if (updates.board !== undefined) payload.board = updates.board;
    if (updates.medium !== undefined) payload.medium = updates.medium;
    if (updates.timezone !== undefined) payload.timezone = updates.timezone;
    if (updates.plan !== undefined) payload.plan = updates.plan;
    if (updates.student_limit !== undefined) payload.student_limit = updates.student_limit;
    if (updates.teacher_limit !== undefined) payload.teacher_limit = updates.teacher_limit;
    if (updates.counselor_limit !== undefined) payload.counselor_limit = updates.counselor_limit;
    if (updates.storage_limit !== undefined) payload.storage_limit = updates.storage_limit;

    const { data, error } = await supabase
      .from('schools')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'School', data.name, `School "${data.name}" updated`);
    return data;
  },

  async delete(id) {
    const { data: school, error: fetchError } = await supabase
      .from('schools')
      .select('name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'School', school?.name || 'Unknown', `School deleted`);
  }
};
