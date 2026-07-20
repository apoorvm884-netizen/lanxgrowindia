#!/usr/bin/env node
// Verify Supabase database state
// Run with: node verify-db.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log('=== LANXGROW SUPABASE VERIFICATION ===\n');
  console.log('URL:', supabaseUrl);
  console.log('');

  // 1. Check tables exist
  console.log('--- TABLE EXISTENCE ---');
  const tables = [
    'schools', 'categories', 'subjects', 'sections', 'content',
    'profiles', 'audit_logs', 'settings', 'permissions',
    'students', 'courses', 'course_sections', 'enrollments', 'notifications'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error && error.code === 'PGRST116') {
        console.log(`❌ ${table}: NOT FOUND (relation does not exist)`);
      } else if (error && error.code === '42501') {
        console.log(`🔒 ${table}: EXISTS but RLS blocks anon access`);
      } else if (error) {
        console.log(`⚠️  ${table}: ERROR - ${error.message}`);
      } else {
        console.log(`✅ ${table}: EXISTS (${data?.length || 0} rows visible)`);
      }
    } catch (e) {
      console.log(`❌ ${table}: EXCEPTION - ${e.message}`);
    }
  }

  // 2. Check schools table columns
  console.log('\n--- SCHOOLS TABLE COLUMNS ---');
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .limit(1);
    if (data && data.length > 0) {
      const cols = Object.keys(data[0]);
      const required = ['id', 'name', 'code', 'status', 'principal_name', 'drive_folder_id'];
      for (const col of required) {
        console.log(cols.includes(col) ? `✅ ${col}` : `❌ ${col} MISSING`);
      }
    } else {
      console.log('No rows to inspect columns');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }

  // 3. Check profiles role constraint
  console.log('\n--- PROFILES ROLE CONSTRAINT ---');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .limit(1);
    if (error) {
      console.log('Error:', error.message);
    } else {
      console.log('Profiles accessible, role column exists');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }

  // 4. Check RLS enabled
  console.log('\n--- RLS STATUS ---');
  const rlsTables = ['schools', 'categories', 'subjects', 'sections', 'content', 'profiles', 'audit_logs', 'settings', 'permissions'];
  for (const table of rlsTables) {
    try {
      const { data, error } = await supabase.rpc('check_rls', { table_name: table });
      if (error) {
        console.log(`⚠️  ${table}: Cannot check (${error.code})`);
      } else {
        console.log(data ? `✅ ${table}: RLS ENABLED` : `❌ ${table}: RLS DISABLED`);
      }
    } catch (e) {
      console.log(`⚠️  ${table}: RPC not available`);
    }
  }

  // 5. Test auth
  console.log('\n--- AUTHENTICATION ---');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('Session check error:', error.message);
    } else {
      console.log(data.session ? '✅ Session exists' : 'ℹ️  No active session');
    }
  } catch (e) {
    console.log('Auth error:', e.message);
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

verify().catch(console.error);