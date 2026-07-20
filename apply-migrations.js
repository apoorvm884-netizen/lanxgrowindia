#!/usr/bin/env node
// Apply Supabase migrations
// This script will run the migration SQL against the Supabase database
// Requires SERVICE_ROLE_KEY for DDL operations

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
// Service role key must be set for DDL operations
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is REQUIRED for DDL operations (migrations).');
  console.error('Add it to .env or run migrations manually via Supabase Dashboard SQL Editor.');
  console.error('');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const migrations = [
  '00007_fix_profiles_role.sql',
  '00008_add_school_columns.sql',
  '00009_settings.sql',
  '00010_permissions.sql'
];

async function applyMigration(filename) {
  const filepath = path.join('supabase/migrations', filename);
  const sql = fs.readFileSync(filepath, 'utf-8');
  
  console.log(`\n=== Applying ${filename} ===`);
  console.log(sql.substring(0, 200) + '...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`❌ FAILED: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Details: ${error.details}`);
      return false;
    }
    console.log(`✅ SUCCESS: ${filename}`);
    return true;
  } catch (e) {
    console.error(`❌ EXCEPTION: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('=== APPLYING SUPABASE MIGRATIONS ===');
  console.log('URL:', supabaseUrl);
  console.log('Using service_role key:', serviceRoleKey.substring(0, 20) + '...');
  
  let allPassed = true;
  for (const migration of migrations) {
    const passed = await applyMigration(migration);
    if (!passed) allPassed = false;
  }
  
  console.log('\n=== MIGRATION SUMMARY ===');
  if (allPassed) {
    console.log('✅ All migrations applied successfully');
  } else {
    console.log('❌ Some migrations failed - see above');
  }
}

main().catch(console.error);