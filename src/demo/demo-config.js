// TEMP DEMO MODE
// REMOVE BEFORE PRODUCTION
// ============================================================
// Demo Mode Configuration
// ============================================================
// Set to true to enable demo mode (bypasses Supabase auth).
// Set to false and remove this folder before production.
// ============================================================

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_CREDENTIALS = [
  {
    email: 'founder@lanxgrow.com',
    password: 'demo1234',
    role: 'super_admin',
    name: 'Vikram Mehta',
    title: 'Founder & CEO',
    schoolId: null,
    avatar: null,
  },
  {
    email: 'admin@lanxgrow.com',
    password: 'demo1234',
    role: 'super_admin',
    name: 'Priya Kapoor',
    title: 'Company Administrator',
    schoolId: null,
    avatar: null,
  },
  {
    email: 'demo@school1.com',
    password: 'demo1234',
    role: 'school_admin',
    name: 'Rajesh Gupta',
    title: 'School Admin',
    schoolId: 'school-1',
    avatar: null,
  },
  {
    email: 'demo@school2.com',
    password: 'demo1234',
    role: 'school_admin',
    name: 'Sunita Sharma',
    title: 'School Admin',
    schoolId: 'school-2',
    avatar: null,
  },
  {
    email: 'demo@counselor.com',
    password: 'demo1234',
    role: 'counselor',
    name: 'Anita Sharma',
    title: 'Senior Counselor',
    schoolId: 'school-1',
    avatar: null,
  },
  {
    email: 'demo@student.com',
    password: 'demo1234',
    role: 'student',
    name: 'Aarav Patel',
    title: 'Student',
    schoolId: 'school-1',
    avatar: null,
  },
];

export function findDemoUser(email, password) {
  return DEMO_CREDENTIALS.find(
    (u) => u.email === email && u.password === password
  );
}
