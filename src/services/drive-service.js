import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

const ENTITY_TABLES = {
  school: 'schools',
  category: 'categories',
  subject: 'subjects',
  section: 'sections'
};

export const DriveService = {

  parseDriveLink(link) {
    if (!link || typeof link !== 'string') return null;
    const trimmed = link.trim();

    // https://drive.google.com/drive/folders/FOLDER_ID
    let m = trimmed.match(/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];

    // https://drive.google.com/file/d/FILE_ID/view
    m = trimmed.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];

    // https://drive.google.com/open?id=FOLDER_ID
    m = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return m[1];

    // Bare ID (alphanumeric + underscore + dash, 28+ chars typical)
    if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) return trimmed;

    return null;
  },

  validateFolderId(folderId) {
    return folderId && typeof folderId === 'string' && /^[a-zA-Z0-9_-]{25,}$/.test(folderId);
  },

  async setFolderId(entityType, entityId, driveFolderId) {
    const table = ENTITY_TABLES[entityType];
    if (!table) throw new Error(`Invalid entity type: ${entityType}`);

    if (!this.validateFolderId(driveFolderId)) {
      throw new Error('Invalid Google Drive Folder ID format');
    }

    const { data, error } = await supabase
      .from(table)
      .update({ drive_folder_id: driveFolderId })
      .eq('id', entityId)
      .select()
      .single();

    if (error) throw error;

    await AuditLogService.log(
      'edited',
      entityType.charAt(0).toUpperCase() + entityType.slice(1),
      data.name || entityId,
      `Google Drive folder linked: ${driveFolderId}`
    );

    return data;
  },

  async getFolderId(entityType, entityId) {
    const table = ENTITY_TABLES[entityType];
    if (!table) throw new Error(`Invalid entity type: ${entityType}`);

    const { data, error } = await supabase
      .from(table)
      .select('drive_folder_id')
      .eq('id', entityId)
      .single();

    if (error) throw error;
    return data?.drive_folder_id || null;
  },

  async removeFolderId(entityType, entityId) {
    const table = ENTITY_TABLES[entityType];
    if (!table) throw new Error(`Invalid entity type: ${entityType}`);

    const { data, error } = await supabase
      .from(table)
      .update({ drive_folder_id: null })
      .eq('id', entityId)
      .select()
      .single();

    if (error) throw error;

    await AuditLogService.log(
      'edited',
      entityType.charAt(0).toUpperCase() + entityType.slice(1),
      data.name || entityId,
      'Google Drive folder unlinked'
    );

    return data;
  },

  async getEntityName(entityType, entityId) {
    const table = ENTITY_TABLES[entityType];
    if (!table) return entityId;

    const { data, error } = await supabase
      .from(table)
      .select('name')
      .eq('id', entityId)
      .single();

    if (error || !data) return entityId;
    return data.name;
  }
};
