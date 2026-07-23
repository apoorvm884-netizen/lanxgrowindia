// TEMP DEMO MODE
// REMOVE BEFORE PRODUCTION
// ============================================================
// Complete In-Memory Demonstration Dataset
// ============================================================
// All data lives here. Nothing is inserted into Supabase.
// The data is returned for all lookup and CRUD operations.
// ============================================================

const NOW = new Date().toISOString();

// ------------------------------------------------------------------
// 1. SCHOOLS
// ------------------------------------------------------------------
const SCHOOLS = [
  {
    id: 'school-1',
    name: 'Green Valley Public School',
    code: 'GVPS',
    status: 'active',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    drive_folder_id: null,
    principal_name: 'Dr. Anil Verma',
    school_type: 'Private',
    contact_person: 'Dr. Anil Verma',
    phone: '+91-98765-43210',
    email: 'contact@gvps.edu',
    website: 'https://gvps.edu',
    address_line1: '123 Green Avenue',
    address_line2: 'Sector 15',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    postal_code: '110001',
    academic_year: '2025-2026',
    board: 'CBSE',
    medium: 'English',
    timezone: 'Asia/Kolkata',
    plan: 'premium',
    student_limit: 500,
    teacher_limit: 30,
    counselor_limit: 10,
    storage_limit: '100GB',
  },
  {
    id: 'school-2',
    name: 'Delhi Public School',
    code: 'DPS',
    status: 'active',
    created_at: '2025-06-15T00:00:00Z',
    updated_at: '2025-06-15T00:00:00Z',
    drive_folder_id: null,
    principal_name: 'Mrs. Meera Sharma',
    school_type: 'Public',
    contact_person: 'Mrs. Meera Sharma',
    phone: '+91-87654-32109',
    email: 'info@dps.edu',
    website: 'https://dps.edu',
    address_line1: '456 Knowledge Park',
    address_line2: 'Sector 22',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    postal_code: '110022',
    academic_year: '2025-2026',
    board: 'CBSE',
    medium: 'English',
    timezone: 'Asia/Kolkata',
    plan: 'standard',
    student_limit: 300,
    teacher_limit: 20,
    counselor_limit: 5,
    storage_limit: '50GB',
  },
];

// ------------------------------------------------------------------
// 2. CATEGORIES
// ------------------------------------------------------------------
const CATEGORIES = [
  { id: 'cat-1', name: 'Art', school_id: 'school-1', parent_id: null, drive_folder_id: null, created_at: NOW },
  { id: 'cat-1a', name: 'Digital Art', school_id: 'school-1', parent_id: 'cat-1', drive_folder_id: null, created_at: NOW },
  { id: 'cat-1b', name: 'Sketching', school_id: 'school-1', parent_id: 'cat-1a', drive_folder_id: null, created_at: NOW },
  { id: 'cat-1c', name: 'Watercolor', school_id: 'school-1', parent_id: 'cat-1b', drive_folder_id: null, created_at: NOW },
  { id: 'cat-2', name: 'Life Skills', school_id: 'school-1', parent_id: null, drive_folder_id: null, created_at: NOW },
  { id: 'cat-2a', name: 'Communication', school_id: 'school-1', parent_id: 'cat-2', drive_folder_id: null, created_at: NOW },
  { id: 'cat-2b', name: 'Leadership', school_id: 'school-1', parent_id: 'cat-2', drive_folder_id: null, created_at: NOW },
  { id: 'cat-3', name: 'Career Development', school_id: 'school-1', parent_id: null, drive_folder_id: null, created_at: NOW },
  { id: 'cat-3a', name: 'Financial Literacy', school_id: 'school-1', parent_id: 'cat-3', drive_folder_id: null, created_at: NOW },
  { id: 'cat-3b', name: 'Career Planning', school_id: 'school-1', parent_id: 'cat-3', drive_folder_id: null, created_at: NOW },
  { id: 'cat-3c', name: 'Entrepreneurship', school_id: 'school-1', parent_id: 'cat-3', drive_folder_id: null, created_at: NOW },
  { id: 'cat-4', name: 'Academic Support', school_id: 'school-1', parent_id: null, drive_folder_id: null, created_at: NOW },
  { id: 'cat-4a', name: 'Mathematics', school_id: 'school-1', parent_id: 'cat-4', drive_folder_id: null, created_at: NOW },
  { id: 'cat-4b', name: 'Science', school_id: 'school-1', parent_id: 'cat-4', drive_folder_id: null, created_at: NOW },
  { id: 'cat-5', name: 'Art', school_id: 'school-2', parent_id: null, drive_folder_id: null, created_at: NOW },
  { id: 'cat-5a', name: 'Digital Art', school_id: 'school-2', parent_id: 'cat-5', drive_folder_id: null, created_at: NOW },
  { id: 'cat-6', name: 'Life Skills', school_id: 'school-2', parent_id: null, drive_folder_id: null, created_at: NOW },
  { id: 'cat-7', name: 'Career Development', school_id: 'school-2', parent_id: null, drive_folder_id: null, created_at: NOW },
];

// ------------------------------------------------------------------
// 3. SUBJECTS
// ------------------------------------------------------------------
const SUBJECTS = [
  { id: 'sub-1', name: 'Soft Skills', school_id: 'school-1', category_id: 'cat-2', drive_folder_id: null, created_at: NOW },
  { id: 'sub-2', name: 'Leadership Fundamentals', school_id: 'school-1', category_id: 'cat-2b', drive_folder_id: null, created_at: NOW },
  { id: 'sub-3', name: 'Communication Basics', school_id: 'school-1', category_id: 'cat-2a', drive_folder_id: null, created_at: NOW },
  { id: 'sub-4', name: 'Financial Literacy', school_id: 'school-1', category_id: 'cat-3a', drive_folder_id: null, created_at: NOW },
  { id: 'sub-5', name: 'Career Planning', school_id: 'school-1', category_id: 'cat-3b', drive_folder_id: null, created_at: NOW },
  { id: 'sub-6', name: 'Entrepreneurship', school_id: 'school-1', category_id: 'cat-3c', drive_folder_id: null, created_at: NOW },
  { id: 'sub-7', name: 'Mathematics', school_id: 'school-1', category_id: 'cat-4a', drive_folder_id: null, created_at: NOW },
  { id: 'sub-8', name: 'Science', school_id: 'school-1', category_id: 'cat-4b', drive_folder_id: null, created_at: NOW },
  { id: 'sub-9', name: 'Soft Skills', school_id: 'school-2', category_id: 'cat-6', drive_folder_id: null, created_at: NOW },
  { id: 'sub-10', name: 'Leadership', school_id: 'school-2', category_id: 'cat-6', drive_folder_id: null, created_at: NOW },
  { id: 'sub-11', name: 'Financial Literacy', school_id: 'school-2', category_id: 'cat-7', drive_folder_id: null, created_at: NOW },
];

// ------------------------------------------------------------------
// 4. SECTIONS
// ------------------------------------------------------------------
const SECTIONS = [
  { id: 'sec-1', name: 'Introduction', school_id: 'school-1', subject_id: 'sub-1', drive_folder_id: null, description: 'Getting started with soft skills', sort_order: 1, created_at: NOW },
  { id: 'sec-2', name: 'Intermediate', school_id: 'school-1', subject_id: 'sub-1', drive_folder_id: null, description: 'Building on core skills', sort_order: 2, created_at: NOW },
  { id: 'sec-3', name: 'Advanced', school_id: 'school-1', subject_id: 'sub-1', drive_folder_id: null, description: 'Mastering advanced techniques', sort_order: 3, created_at: NOW },
  { id: 'sec-4', name: 'Fundamentals', school_id: 'school-1', subject_id: 'sub-2', drive_folder_id: null, description: 'Core leadership principles', sort_order: 1, created_at: NOW },
  { id: 'sec-5', name: 'Team Building', school_id: 'school-1', subject_id: 'sub-2', drive_folder_id: null, description: 'Building and managing effective teams', sort_order: 2, created_at: NOW },
  { id: 'sec-6', name: 'Basics', school_id: 'school-1', subject_id: 'sub-3', drive_folder_id: null, description: 'Fundamental communication skills', sort_order: 1, created_at: NOW },
  { id: 'sec-7', name: 'Public Speaking', school_id: 'school-1', subject_id: 'sub-3', drive_folder_id: null, description: 'Presenting with confidence', sort_order: 2, created_at: NOW },
  { id: 'sec-8', name: 'Savings', school_id: 'school-1', subject_id: 'sub-4', drive_folder_id: null, description: 'Building smart saving habits', sort_order: 1, created_at: NOW },
  { id: 'sec-9', name: 'Investing', school_id: 'school-1', subject_id: 'sub-4', drive_folder_id: null, description: 'Introduction to investments', sort_order: 2, created_at: NOW },
  { id: 'sec-10', name: 'Career Options', school_id: 'school-1', subject_id: 'sub-5', drive_folder_id: null, description: 'Exploring career paths', sort_order: 1, created_at: NOW },
  { id: 'sec-11', name: 'Business Basics', school_id: 'school-1', subject_id: 'sub-6', drive_folder_id: null, description: 'Starting your own business', sort_order: 1, created_at: NOW },
  { id: 'sec-12', name: 'Algebra', school_id: 'school-1', subject_id: 'sub-7', drive_folder_id: null, description: 'Understanding algebraic concepts', sort_order: 1, created_at: NOW },
  { id: 'sec-13', name: 'Physics', school_id: 'school-1', subject_id: 'sub-8', drive_folder_id: null, description: 'Motion, forces, and energy', sort_order: 1, created_at: NOW },
  { id: 'sec-14', name: 'Introduction', school_id: 'school-2', subject_id: 'sub-9', drive_folder_id: null, description: 'Getting started', sort_order: 1, created_at: NOW },
  { id: 'sec-15', name: 'Fundamentals', school_id: 'school-2', subject_id: 'sub-10', drive_folder_id: null, description: 'Core leadership skills', sort_order: 1, created_at: NOW },
  { id: 'sec-16', name: 'Savings Basics', school_id: 'school-2', subject_id: 'sub-11', drive_folder_id: null, description: 'Introduction to saving money', sort_order: 1, created_at: NOW },
];

// ------------------------------------------------------------------
// 5. CONTENT / VIDEOS
// ------------------------------------------------------------------
function makeVideo(id, name, subjectId, sectionId, schoolId, duration, categoryId) {
  return {
    id,
    name,
    type: 'Video',
    url: `https://www.youtube.com/watch?v=demo-${id}`,
    size: `${Math.floor(Math.random() * 500 + 50)}MB`,
    school_id: schoolId,
    section_id: sectionId,
    subject_id: subjectId,
    category_id: categoryId,
    description: `${name} — a comprehensive educational video for students.`,
    tags: [name.toLowerCase().replace(/\s+/g, '-')],
    status: 'active',
    created_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    thumbnail: null,
    duration: `${Math.floor(Math.random() * 20 + 5)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    uploaded_by: 'Rajesh Gupta',
  };
}

const CONTENT = [
  makeVideo('vid-1', 'Introduction to Soft Skills', 'sub-1', 'sec-1', 'school-1', '10:30', 'cat-2'),
  makeVideo('vid-2', 'Effective Communication Basics', 'sub-1', 'sec-2', 'school-1', '12:15', 'cat-2'),
  makeVideo('vid-3', 'Advanced Interpersonal Skills', 'sub-1', 'sec-3', 'school-1', '15:45', 'cat-2'),
  makeVideo('vid-4', 'What Makes a Leader', 'sub-2', 'sec-4', 'school-1', '8:20', 'cat-2b'),
  makeVideo('vid-5', 'Building High-Performance Teams', 'sub-2', 'sec-5', 'school-1', '18:00', 'cat-2b'),
  makeVideo('vid-6', 'Public Speaking Mastery', 'sub-3', 'sec-7', 'school-1', '22:10', 'cat-2a'),
  makeVideo('vid-7', 'Active Listening Skills', 'sub-3', 'sec-6', 'school-1', '9:45', 'cat-2a'),
  makeVideo('vid-8', 'Smart Saving Habits', 'sub-4', 'sec-8', 'school-1', '11:30', 'cat-3a'),
  makeVideo('vid-9', 'Introduction to Investing', 'sub-4', 'sec-9', 'school-1', '14:50', 'cat-3a'),
  makeVideo('vid-10', 'Exploring Career Options', 'sub-5', 'sec-10', 'school-1', '16:20', 'cat-3b'),
  makeVideo('vid-11', 'Starting Your Own Business', 'sub-6', 'sec-11', 'school-1', '20:00', 'cat-3c'),
  makeVideo('vid-12', 'Algebra Made Easy', 'sub-7', 'sec-12', 'school-1', '25:00', 'cat-4a'),
  makeVideo('vid-13', 'Physics: Motion & Forces', 'sub-8', 'sec-13', 'school-1', '19:30', 'cat-4b'),
  makeVideo('vid-14', 'Soft Skills for Success', 'sub-9', 'sec-14', 'school-2', '11:00', 'cat-6'),
  makeVideo('vid-15', 'Leadership Fundamentals', 'sub-10', 'sec-15', 'school-2', '13:20', 'cat-6'),
  makeVideo('vid-16', 'Saving Money 101', 'sub-11', 'sec-16', 'school-2', '8:40', 'cat-7'),
];

// ------------------------------------------------------------------
// 6. COUNSELORS (as profile-like objects)
// ------------------------------------------------------------------
const COUNSELORS = [
  {
    id: 'demo-counselor-1',
    name: 'Anita Sharma',
    email: 'anita.sharma@gvps.edu',
    employee_id: 'EMP-001',
    role: 'counselor',
    school_id: 'school-1',
    phone: '+91-98765-43210',
    gender: 'Female',
    date_of_birth: '1985-03-12',
    department: 'Career Counseling',
    qualification: 'M.A. Psychology, B.Ed.',
    experience: 12,
    assigned_categories: ['cat-2', 'cat-3'],
    assigned_subjects: ['sub-1', 'sub-4', 'sub-5'],
    status: 'active',
    avatar_url: null,
    created_at: NOW,
  },
  {
    id: 'demo-counselor-2',
    name: 'Rahul Verma',
    email: 'rahul.verma@gvps.edu',
    employee_id: 'EMP-002',
    role: 'counselor',
    school_id: 'school-1',
    phone: '+91-98765-43211',
    gender: 'Male',
    date_of_birth: '1988-07-25',
    department: 'Academic Guidance',
    qualification: 'M.Sc. Mathematics, Ph.D. Education',
    experience: 8,
    assigned_categories: ['cat-4'],
    assigned_subjects: ['sub-7', 'sub-8'],
    status: 'active',
    avatar_url: null,
    created_at: NOW,
  },
  {
    id: 'demo-counselor-3',
    name: 'Sneha Nair',
    email: 'sneha.nair@dps.edu',
    employee_id: 'EMP-003',
    role: 'counselor',
    school_id: 'school-2',
    phone: '+91-98765-43212',
    gender: 'Female',
    date_of_birth: '1990-11-08',
    department: 'Student Wellness',
    qualification: 'M.A. Sociology, Diploma in Counseling',
    experience: 6,
    assigned_categories: ['cat-6'],
    assigned_subjects: ['sub-9', 'sub-10'],
    status: 'active',
    avatar_url: null,
    created_at: NOW,
  },
];

// ------------------------------------------------------------------
// 7. STUDENTS
// ------------------------------------------------------------------
const STUDENTS = [
  {
    id: 'demo-student-1',
    name: 'Aarav Patel',
    email: 'aarav.p@student.com',
    school_id: 'school-1',
    counselor_id: 'demo-counselor-1',
    class: 'Class 9',
    roll_number: 'GVPS-0901',
    section: 'A',
    status: 'active',
    attendance: 92,
    progress: 65,
    avatar_url: null,
    created_at: NOW,
    parent_name: 'Mr. Amit Patel',
    parent_contact: '+91-98765-43201',
    admission_no: 'GVPS-2025-101',
    dob: '2011-03-15',
    academic_year: '2025-2026',
    notes: '',
  },
  {
    id: 'demo-student-2',
    name: 'Priya Singh',
    email: 'priya.s@student.com',
    school_id: 'school-1',
    counselor_id: 'demo-counselor-1',
    class: 'Class 9',
    roll_number: 'GVPS-0902',
    section: 'A',
    status: 'active',
    attendance: 88,
    progress: 72,
    avatar_url: null,
    created_at: NOW,
    parent_name: 'Mr. Rajesh Singh',
    parent_contact: '+91-98765-43202',
    admission_no: 'GVPS-2025-102',
    dob: '2011-07-22',
    academic_year: '2025-2026',
    notes: '',
  },
  {
    id: 'demo-student-3',
    name: 'Rohan Gupta',
    email: 'rohan.g@student.com',
    school_id: 'school-1',
    counselor_id: 'demo-counselor-2',
    class: 'Class 10',
    roll_number: 'GVPS-1001',
    section: 'B',
    status: 'active',
    attendance: 95,
    progress: 80,
    avatar_url: null,
    created_at: NOW,
    parent_name: 'Mr. Suresh Gupta',
    parent_contact: '+91-98765-43203',
    admission_no: 'GVPS-2025-103',
    dob: '2010-11-10',
    academic_year: '2025-2026',
    notes: '',
  },
  {
    id: 'demo-student-4',
    name: 'Neha Kumar',
    email: 'neha.k@student.com',
    school_id: 'school-1',
    counselor_id: 'demo-counselor-2',
    class: 'Class 10',
    roll_number: 'GVPS-1002',
    section: 'B',
    status: 'active',
    attendance: 78,
    progress: 55,
    avatar_url: null,
    created_at: NOW,
    parent_name: 'Mrs. Sunita Kumar',
    parent_contact: '+91-98765-43204',
    admission_no: 'GVPS-2025-104',
    dob: '2010-05-18',
    academic_year: '2025-2026',
    notes: '',
  },
  {
    id: 'demo-student-5',
    name: 'Arjun Reddy',
    email: 'arjun.r@student.com',
    school_id: 'school-2',
    counselor_id: 'demo-counselor-3',
    class: 'Class 9',
    roll_number: 'DPS-0901',
    section: 'A',
    status: 'active',
    attendance: 90,
    progress: 70,
    avatar_url: null,
    created_at: NOW,
    parent_name: 'Mr. Vikram Reddy',
    parent_contact: '+91-98765-43205',
    admission_no: 'DPS-2025-201',
    dob: '2011-01-30',
    academic_year: '2025-2026',
    notes: '',
  },
  {
    id: 'demo-student-6',
    name: 'Kavya Iyer',
    email: 'kavya.i@student.com',
    school_id: 'school-2',
    counselor_id: 'demo-counselor-3',
    class: 'Class 10',
    roll_number: 'DPS-1001',
    section: 'A',
    status: 'active',
    attendance: 85,
    progress: 60,
    avatar_url: null,
    created_at: NOW,
    parent_name: 'Dr. Meena Iyer',
    parent_contact: '+91-98765-43206',
    admission_no: 'DPS-2025-202',
    dob: '2010-09-12',
    academic_year: '2025-2026',
    notes: '',
  },
  {
    id: 'demo-student-7',
    name: 'Vikram Joshi',
    email: 'vikram.j@student.com',
    school_id: 'school-1',
    counselor_id: 'demo-counselor-1',
    class: 'Class 9',
    roll_number: 'GVPS-0903',
    section: 'A',
    status: 'active',
    attendance: 96,
    progress: 88,
    avatar_url: null,
    created_at: NOW,
    parent_name: 'Mr. Deepak Joshi',
    parent_contact: '+91-98765-43207',
    admission_no: 'GVPS-2025-105',
    dob: '2011-06-05',
    academic_year: '2025-2026',
    notes: 'Excellent performance. Consider advanced courses.',
  },
  {
    id: 'demo-student-8',
    name: 'Isha Mehta',
    email: 'isha.m@student.com',
    school_id: 'school-1',
    counselor_id: 'demo-counselor-2',
    class: 'Class 10',
    roll_number: 'GVPS-1003',
    section: 'B',
    status: 'active',
    attendance: 82,
    progress: 45,
    avatar_url: null,
    created_at: NOW,
    parent_name: 'Mr. Pradeep Mehta',
    parent_contact: '+91-98765-43208',
    admission_no: 'GVPS-2025-106',
    dob: '2010-02-14',
    academic_year: '2025-2026',
    notes: 'Needs extra attention with progress.',
  },
];

// ------------------------------------------------------------------
// 8. COURSES
// ------------------------------------------------------------------
function makeCourse(id, name, desc, schoolId, categoryId, subjectId, difficulty, duration) {
  return { id, name, description: desc, school_id: schoolId, category_id: categoryId, subject_id: subjectId, difficulty, estimated_duration: duration, publish_status: 'published', version: 1, created_by: 'Rajesh Gupta', thumbnail: null, status: 'active', created_at: NOW };
}

const COURSES = [
  makeCourse('course-1', 'Soft Skills', 'Develop essential interpersonal and professional skills.', 'school-1', 'cat-2', 'sub-1', 'beginner', '4 weeks'),
  makeCourse('course-2', 'Leadership', 'Learn the principles of effective leadership and team management.', 'school-1', 'cat-2b', 'sub-2', 'intermediate', '6 weeks'),
  makeCourse('course-3', 'Communication', 'Master verbal, written, and non-verbal communication.', 'school-1', 'cat-2a', 'sub-3', 'beginner', '4 weeks'),
  makeCourse('course-4', 'Financial Literacy', 'Understand saving, budgeting, and investing fundamentals.', 'school-1', 'cat-3a', 'sub-4', 'beginner', '3 weeks'),
  makeCourse('course-5', 'Career Planning', 'Explore career paths and build a roadmap for your future.', 'school-1', 'cat-3b', 'sub-5', 'intermediate', '4 weeks'),
  makeCourse('course-6', 'Entrepreneurship', 'Learn how to start, run, and grow your own business.', 'school-1', 'cat-3c', 'sub-6', 'advanced', '8 weeks'),
  makeCourse('course-7', 'Soft Skills', 'Develop essential interpersonal and professional skills.', 'school-2', 'cat-6', 'sub-9', 'beginner', '4 weeks'),
  makeCourse('course-8', 'Leadership', 'Learn the principles of effective leadership and team management.', 'school-2', 'cat-6', 'sub-10', 'intermediate', '6 weeks'),
  makeCourse('course-9', 'Financial Literacy', 'Understand saving, budgeting, and investing fundamentals.', 'school-2', 'cat-7', 'sub-11', 'beginner', '3 weeks'),
];

// ------------------------------------------------------------------
// 9. COURSE SECTIONS (mapping courses to sections)
// ------------------------------------------------------------------
const COURSE_SECTIONS = [
  { id: 'cs-1', course_id: 'course-1', section_id: 'sec-1' },
  { id: 'cs-2', course_id: 'course-1', section_id: 'sec-2' },
  { id: 'cs-3', course_id: 'course-2', section_id: 'sec-4' },
  { id: 'cs-4', course_id: 'course-2', section_id: 'sec-5' },
  { id: 'cs-5', course_id: 'course-3', section_id: 'sec-6' },
  { id: 'cs-6', course_id: 'course-3', section_id: 'sec-7' },
  { id: 'cs-7', course_id: 'course-4', section_id: 'sec-8' },
  { id: 'cs-8', course_id: 'course-4', section_id: 'sec-9' },
  { id: 'cs-9', course_id: 'course-5', section_id: 'sec-10' },
  { id: 'cs-10', course_id: 'course-6', section_id: 'sec-11' },
  { id: 'cs-11', course_id: 'course-7', section_id: 'sec-14' },
  { id: 'cs-12', course_id: 'course-8', section_id: 'sec-15' },
  { id: 'cs-13', course_id: 'course-9', section_id: 'sec-16' },
];

// ------------------------------------------------------------------
// 10. ENROLLMENTS
// ------------------------------------------------------------------
const ENROLLMENTS = [
  { id: 'enr-1', student_id: 'demo-student-1', course_id: 'course-1', status: 'active', assigned_by: 'demo-counselor-1', created_at: NOW },
  { id: 'enr-2', student_id: 'demo-student-1', course_id: 'course-2', status: 'completed', assigned_by: 'demo-counselor-1', created_at: NOW },
  { id: 'enr-3', student_id: 'demo-student-2', course_id: 'course-1', status: 'active', assigned_by: 'demo-counselor-1', created_at: NOW },
  { id: 'enr-4', student_id: 'demo-student-2', course_id: 'course-3', status: 'active', assigned_by: 'demo-counselor-1', created_at: NOW },
  { id: 'enr-5', student_id: 'demo-student-2', course_id: 'course-4', status: 'active', assigned_by: 'demo-counselor-1', created_at: NOW },
  { id: 'enr-6', student_id: 'demo-student-3', course_id: 'course-1', status: 'completed', assigned_by: 'demo-counselor-2', created_at: NOW },
  { id: 'enr-7', student_id: 'demo-student-3', course_id: 'course-5', status: 'active', assigned_by: 'demo-counselor-2', created_at: NOW },
  { id: 'enr-8', student_id: 'demo-student-3', course_id: 'course-6', status: 'active', assigned_by: 'demo-counselor-2', created_at: NOW },
  { id: 'enr-9', student_id: 'demo-student-4', course_id: 'course-2', status: 'active', assigned_by: 'demo-counselor-2', created_at: NOW },
  { id: 'enr-10', student_id: 'demo-student-4', course_id: 'course-4', status: 'active', assigned_by: 'demo-counselor-2', created_at: NOW },
  { id: 'enr-11', student_id: 'demo-student-5', course_id: 'course-7', status: 'active', assigned_by: 'demo-counselor-3', created_at: NOW },
  { id: 'enr-12', student_id: 'demo-student-5', course_id: 'course-8', status: 'completed', assigned_by: 'demo-counselor-3', created_at: NOW },
  { id: 'enr-13', student_id: 'demo-student-6', course_id: 'course-7', status: 'active', assigned_by: 'demo-counselor-3', created_at: NOW },
  { id: 'enr-14', student_id: 'demo-student-6', course_id: 'course-9', status: 'active', assigned_by: 'demo-counselor-3', created_at: NOW },
  { id: 'enr-15', student_id: 'demo-student-7', course_id: 'course-3', status: 'completed', assigned_by: 'demo-counselor-1', created_at: NOW },
  { id: 'enr-16', student_id: 'demo-student-7', course_id: 'course-5', status: 'active', assigned_by: 'demo-counselor-1', created_at: NOW },
  { id: 'enr-17', student_id: 'demo-student-8', course_id: 'course-6', status: 'active', assigned_by: 'demo-counselor-2', created_at: NOW },
];

// ------------------------------------------------------------------
// 11. NOTIFICATIONS
// ------------------------------------------------------------------
const NOTIFICATIONS = [
  { id: 'notif-1', user_id: 'demo-schooladmin-1', title: 'Student Completed Course', message: 'Aarav Patel completed the Leadership course.', is_read: false, created_at: new Date(Date.now() - 1 * 3600000).toISOString() },
  { id: 'notif-2', user_id: 'demo-schooladmin-1', title: 'New Video Uploaded', message: 'A new video "Public Speaking Mastery" has been uploaded to Communication.', is_read: false, created_at: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: 'notif-3', user_id: 'demo-schooladmin-1', title: 'Counselor Assigned', message: 'Rahul Verma has been assigned as counselor for Class 10 Section B.', is_read: true, created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 'notif-4', user_id: 'demo-schooladmin-1', title: 'Assignment Due', message: 'Soft Skills assignment is due for Class 9 students by Friday.', is_read: false, created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'notif-5', user_id: 'demo-schooladmin-1', title: 'Course Published', message: 'New course "Financial Literacy" has been published successfully.', is_read: true, created_at: new Date(Date.now() - 72 * 3600000).toISOString() },
  { id: 'notif-6', user_id: 'demo-schooladmin-2', title: 'New Student Enrolled', message: 'Arjun Reddy has been enrolled in Soft Skills course.', is_read: false, created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 'notif-7', user_id: 'demo-counselor-1', title: 'Student Progress Update', message: 'Your student Priya Singh has reached 72% overall progress.', is_read: false, created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'notif-8', user_id: 'demo-counselor-1', title: 'New Course Available', message: 'A new course "Entrepreneurship" is now available for assignment.', is_read: true, created_at: new Date(Date.now() - 48 * 3600000).toISOString() },
  { id: 'notif-9', user_id: 'demo-student-1', title: 'Course Assigned', message: 'You have been assigned the "Communication" course.', is_read: false, created_at: new Date(Date.now() - 6 * 3600000).toISOString() },
  { id: 'notif-10', user_id: 'demo-student-1', title: 'Certificate Ready', message: 'Your certificate for "Leadership" is ready for download.', is_read: false, created_at: new Date(Date.now() - 12 * 3600000).toISOString() },
];

// ------------------------------------------------------------------
// 12. AUDIT LOG
// ------------------------------------------------------------------
const AUDIT_LOG = [
  { id: 'audit-1', user_id: 'demo-superadmin-1', user_name: 'Vikram Mehta', action: 'login', entity: 'session', entity_name: 'Session', detail: 'User logged in via demo mode', created_at: NOW },
  { id: 'audit-2', user_id: 'demo-schooladmin-1', user_name: 'Rajesh Gupta', action: 'create', entity: 'student', entity_name: 'Aarav Patel', detail: 'Created student record', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'audit-3', user_id: 'demo-counselor-1', user_name: 'Anita Sharma', action: 'enroll', entity: 'enrollment', entity_name: 'Aarav Patel → Soft Skills', detail: 'Student enrolled in course', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'audit-4', user_id: 'demo-schooladmin-1', user_name: 'Rajesh Gupta', action: 'create', entity: 'course', entity_name: 'Financial Literacy', detail: 'Created new course', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'audit-5', user_id: 'demo-schooladmin-1', user_name: 'Rajesh Gupta', action: 'upload', entity: 'content', entity_name: 'Public Speaking Mastery', detail: 'Uploaded video content', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
];

// ------------------------------------------------------------------
// 13. USERS (for User Management display)
// ------------------------------------------------------------------
const USERS = [
  { id: 'demo-superadmin-1', name: 'Vikram Mehta', email: 'founder@lanxgrow.com', role: 'super_admin', schoolId: null, created_at: NOW },
  { id: 'demo-superadmin-2', name: 'Priya Kapoor', email: 'admin@lanxgrow.com', role: 'super_admin', schoolId: null, created_at: NOW },
  { id: 'demo-schooladmin-1', name: 'Rajesh Gupta', email: 'demo@school1.com', role: 'school_admin', schoolId: 'school-1', created_at: NOW },
  { id: 'demo-schooladmin-2', name: 'Sunita Sharma', email: 'demo@school2.com', role: 'school_admin', schoolId: 'school-2', created_at: NOW },
  { id: 'demo-counselor-1', name: 'Anita Sharma', email: 'anita.sharma@gvps.edu', role: 'counselor', schoolId: 'school-1', created_at: NOW },
  { id: 'demo-counselor-2', name: 'Rahul Verma', email: 'rahul.verma@gvps.edu', role: 'counselor', schoolId: 'school-1', created_at: NOW },
  { id: 'demo-counselor-3', name: 'Sneha Nair', email: 'sneha.nair@dps.edu', role: 'counselor', schoolId: 'school-2', created_at: NOW },
  { id: 'demo-student-1', name: 'Aarav Patel', email: 'aarav.p@student.com', role: 'student', schoolId: 'school-1', created_at: NOW },
  { id: 'demo-student-2', name: 'Priya Singh', email: 'priya.s@student.com', role: 'student', schoolId: 'school-1', created_at: NOW },
  { id: 'demo-student-3', name: 'Rohan Gupta', email: 'rohan.g@student.com', role: 'student', schoolId: 'school-1', created_at: NOW },
  { id: 'demo-student-4', name: 'Neha Kumar', email: 'neha.k@student.com', role: 'student', schoolId: 'school-1', created_at: NOW },
  { id: 'demo-student-5', name: 'Arjun Reddy', email: 'arjun.r@student.com', role: 'student', schoolId: 'school-2', created_at: NOW },
  { id: 'demo-student-6', name: 'Kavya Iyer', email: 'kavya.i@student.com', role: 'student', schoolId: 'school-2', created_at: NOW },
  { id: 'demo-student-7', name: 'Vikram Joshi', email: 'vikram.j@student.com', role: 'student', schoolId: 'school-1', created_at: NOW },
  { id: 'demo-student-8', name: 'Isha Mehta', email: 'isha.m@student.com', role: 'student', schoolId: 'school-1', created_at: NOW },
];

// ------------------------------------------------------------------
// 14. ACTIVITY LOG (student & counselor activities for timelines)
// ------------------------------------------------------------------
const ACTIVITY_LOG = [
  { id: 'act-1', student_id: 'demo-student-1', user_id: 'demo-student-1', action: 'course_completed', description: 'Completed Leadership course', timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'act-2', student_id: 'demo-student-1', user_id: 'demo-student-1', action: 'video_watched', description: 'Watched "What Makes a Leader"', timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'act-3', student_id: 'demo-student-2', user_id: 'demo-student-2', action: 'course_assigned', description: 'Enrolled in Communication course', timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'act-4', student_id: 'demo-student-2', user_id: 'demo-student-2', action: 'video_watched', description: 'Watched "Active Listening Skills"', timestamp: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'act-5', student_id: 'demo-student-3', user_id: 'demo-student-3', action: 'course_completed', description: 'Completed Soft Skills course', timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'act-6', student_id: 'demo-student-3', user_id: 'demo-student-3', action: 'assignment_submitted', description: 'Submitted Leadership assignment', timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'act-7', student_id: 'demo-student-4', user_id: 'demo-student-4', action: 'attendance_marked', description: 'Attendance marked for today', timestamp: new Date(Date.now() - 0.5 * 86400000).toISOString() },
  { id: 'act-8', student_id: 'demo-student-4', user_id: 'demo-student-4', action: 'video_watched', description: 'Watched "Smart Saving Habits"', timestamp: new Date(Date.now() - 6 * 86400000).toISOString() },
  { id: 'act-9', student_id: 'demo-student-5', user_id: 'demo-student-5', action: 'course_completed', description: 'Completed Leadership course', timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'act-10', student_id: 'demo-student-5', user_id: 'demo-student-5', action: 'video_watched', description: 'Watched "Soft Skills for Success"', timestamp: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: 'act-11', student_id: 'demo-student-6', user_id: 'demo-student-6', action: 'assignment_submitted', description: 'Submitted Financial Literacy quiz', timestamp: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'act-12', student_id: 'demo-student-6', user_id: 'demo-student-6', action: 'attendance_marked', description: 'Attendance marked for yesterday', timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'act-13', student_id: 'demo-student-7', user_id: 'demo-student-7', action: 'course_completed', description: 'Completed Communication course', timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'act-14', student_id: 'demo-student-7', user_id: 'demo-student-7', action: 'video_watched', description: 'Watched "Public Speaking Mastery"', timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'act-15', student_id: 'demo-student-8', user_id: 'demo-student-8', action: 'course_assigned', description: 'Enrolled in Entrepreneurship course', timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'act-16', student_id: 'demo-student-8', user_id: 'demo-student-8', action: 'attendance_marked', description: 'Attendance marked for today', timestamp: new Date(Date.now() - 0.25 * 86400000).toISOString() },
  { id: 'act-17', user_id: 'demo-counselor-1', counselor_id: 'demo-counselor-1', action: 'counseling_session', description: 'Conducted counseling session with Aarav Patel', timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'act-18', user_id: 'demo-counselor-1', counselor_id: 'demo-counselor-1', action: 'progress_review', description: 'Reviewed progress of Class 9 students', timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'act-19', user_id: 'demo-counselor-2', counselor_id: 'demo-counselor-2', action: 'course_recommendation', description: 'Recommended Career Planning course to Rohan Gupta', timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'act-20', user_id: 'demo-counselor-2', counselor_id: 'demo-counselor-2', action: 'counseling_session', description: 'Conducted counseling session with Neha Kumar', timestamp: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: 'act-21', user_id: 'demo-counselor-3', counselor_id: 'demo-counselor-3', action: 'progress_review', description: 'Reviewed weekly progress reports', timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'act-22', student_id: 'demo-student-1', user_id: 'demo-student-1', action: 'certificate_earned', description: 'Earned certificate for Leadership course', timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: 'act-23', student_id: 'demo-student-3', user_id: 'demo-student-3', action: 'certificate_earned', description: 'Earned certificate for Soft Skills course', timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'act-24', student_id: 'demo-student-7', user_id: 'demo-student-7', action: 'certificate_earned', description: 'Earned certificate for Communication course', timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
];

// ------------------------------------------------------------------
// 15. COURSE MODULES (for LMS course player)
// ------------------------------------------------------------------
const COURSE_MODULES = [
  { id: 'mod-1', course_id: 'course-1', title: 'Getting Started', description: 'Introduction to soft skills', sort_order: 1, created_at: NOW },
  { id: 'mod-2', course_id: 'course-1', title: 'Core Skills', description: 'Building essential interpersonal skills', sort_order: 2, created_at: NOW },
  { id: 'mod-3', course_id: 'course-1', title: 'Mastery', description: 'Advanced soft skills', sort_order: 3, created_at: NOW },
  { id: 'mod-4', course_id: 'course-2', title: 'Leadership Foundations', description: 'Core leadership principles', sort_order: 1, created_at: NOW },
  { id: 'mod-5', course_id: 'course-2', title: 'Team Building', description: 'Building effective teams', sort_order: 2, created_at: NOW },
  { id: 'mod-6', course_id: 'course-3', title: 'Communication Basics', description: 'Fundamental communication', sort_order: 1, created_at: NOW },
  { id: 'mod-7', course_id: 'course-3', title: 'Public Speaking', description: 'Presenting with confidence', sort_order: 2, created_at: NOW },
  { id: 'mod-8', course_id: 'course-4', title: 'Saving Money', description: 'Smart saving habits', sort_order: 1, created_at: NOW },
  { id: 'mod-9', course_id: 'course-4', title: 'Investing', description: 'Introduction to investments', sort_order: 2, created_at: NOW },
  { id: 'mod-10', course_id: 'course-5', title: 'Career Exploration', description: 'Exploring career paths', sort_order: 1, created_at: NOW },
  { id: 'mod-11', course_id: 'course-6', title: 'Business Basics', description: 'Starting your own business', sort_order: 1, created_at: NOW },
];

// ------------------------------------------------------------------
// 16. LESSONS (tied to modules, with different content types)
// ------------------------------------------------------------------
function makeLesson(id, moduleId, title, contentType, contentUrl, sortOrder, duration) {
  return { id, module_id: moduleId, course_id: COURSE_MODULES.find(m => m.id === moduleId)?.course_id || '', title, description: `${title} — learn and practice.`, content_type: contentType, content_url: contentUrl, content_id: null, sort_order: sortOrder, duration, created_at: NOW };
}

const LESSONS = [
  makeLesson('les-1', 'mod-1', 'What are Soft Skills?', 'video', 'https://www.youtube.com/watch?v=demo-softskills-1', 1, 10),
  makeLesson('les-2', 'mod-1', 'Soft Skills Self-Assessment', 'assignment', null, 2, null),
  makeLesson('les-3', 'mod-1', 'Why Soft Skills Matter', 'video', 'https://www.youtube.com/watch?v=demo-softskills-2', 3, 8),
  makeLesson('les-4', 'mod-2', 'Effective Communication', 'video', 'https://www.youtube.com/watch?v=demo-softskills-3', 1, 12),
  makeLesson('les-5', 'mod-2', 'Communication Quiz', 'quiz', null, 2, null),
  makeLesson('les-6', 'mod-2', 'Teamwork Basics', 'video', 'https://www.youtube.com/watch?v=demo-softskills-4', 3, 9),
  makeLesson('les-7', 'mod-2', 'Teamwork Assignment', 'assignment', null, 4, null),
  makeLesson('les-8', 'mod-3', 'Advanced Interpersonal Skills', 'video', 'https://www.youtube.com/watch?v=demo-softskills-5', 1, 15),
  makeLesson('les-9', 'mod-3', 'Final Assessment', 'quiz', null, 2, null),
  makeLesson('les-10', 'mod-4', 'What Makes a Leader', 'video', 'https://www.youtube.com/watch?v=demo-leader-1', 1, 8),
  makeLesson('les-11', 'mod-4', 'Leadership Styles', 'pdf', 'https://drive.google.com/file/d/demo-leadership-styles', 2, null),
  makeLesson('les-12', 'mod-4', 'Leadership Self-Reflection', 'assignment', null, 3, null),
  makeLesson('les-13', 'mod-5', 'Building Trust', 'video', 'https://www.youtube.com/watch?v=demo-leader-2', 1, 11),
  makeLesson('les-14', 'mod-5', 'Conflict Resolution', 'video', 'https://www.youtube.com/watch?v=demo-leader-3', 2, 14),
  makeLesson('les-15', 'mod-5', 'Team Leadership Quiz', 'quiz', null, 3, null),
  makeLesson('les-16', 'mod-6', 'Active Listening', 'video', 'https://www.youtube.com/watch?v=demo-comm-1', 1, 9),
  makeLesson('les-17', 'mod-6', 'Non-Verbal Communication', 'pdf', 'https://drive.google.com/file/d/demo-nonverbal', 2, null),
  makeLesson('les-18', 'mod-7', 'Public Speaking Mastery', 'video', 'https://www.youtube.com/watch?v=demo-comm-2', 1, 22),
  makeLesson('les-19', 'mod-7', 'Speech Preparation', 'assignment', null, 2, null),
  makeLesson('les-20', 'mod-8', 'Why Save Money?', 'video', 'https://www.youtube.com/watch?v=demo-finance-1', 1, 11),
  makeLesson('les-21', 'mod-8', 'Budgeting Basics', 'pdf', 'https://drive.google.com/file/d/demo-budgeting', 2, null),
  makeLesson('les-22', 'mod-8', 'Saving Challenge', 'assignment', null, 3, null),
  makeLesson('les-23', 'mod-9', 'Introduction to Investing', 'video', 'https://www.youtube.com/watch?v=demo-finance-2', 1, 14),
  makeLesson('les-24', 'mod-9', 'Investment Quiz', 'quiz', null, 2, null),
  makeLesson('les-25', 'mod-10', 'Career Options Exploration', 'video', 'https://www.youtube.com/watch?v=demo-career-1', 1, 16),
  makeLesson('les-26', 'mod-10', 'Career Roadmap', 'assignment', null, 2, null),
  makeLesson('les-27', 'mod-11', 'Business Ideas', 'video', 'https://www.youtube.com/watch?v=demo-entre-1', 1, 20),
  makeLesson('les-28', 'mod-11', 'Business Plan Template', 'assignment', null, 2, null),
  makeLesson('les-29', 'mod-11', 'Entrepreneurship Quiz', 'quiz', null, 3, null),
];

// ------------------------------------------------------------------
// 17. ASSIGNMENTS (tied to courses via lesson content_id)
// ------------------------------------------------------------------
const ASSIGNMENTS = [
  { id: 'assign-1', course_id: 'course-1', title: 'Soft Skills Self-Assessment', description: 'Rate yourself on various soft skills and create a personal development plan.', due_date: new Date(Date.now() + 14 * 86400000).toISOString(), max_marks: 100, created_at: NOW },
  { id: 'assign-2', course_id: 'course-1', title: 'Teamwork Reflection', description: 'Write a reflection on a recent team experience and what you learned.', due_date: new Date(Date.now() + 21 * 86400000).toISOString(), max_marks: 100, created_at: NOW },
  { id: 'assign-3', course_id: 'course-2', title: 'Leadership Self-Reflection', description: 'Reflect on your leadership experiences and identify areas for growth.', due_date: new Date(Date.now() + 10 * 86400000).toISOString(), max_marks: 100, created_at: NOW },
  { id: 'assign-4', course_id: 'course-3', title: 'Speech Preparation', description: 'Prepare and submit a 3-minute speech on a topic of your choice.', due_date: new Date(Date.now() + 7 * 86400000).toISOString(), max_marks: 100, created_at: NOW },
  { id: 'assign-5', course_id: 'course-4', title: 'Saving Challenge', description: 'Create a monthly savings plan and track your expenses for one week.', due_date: new Date(Date.now() + 30 * 86400000).toISOString(), max_marks: 50, created_at: NOW },
  { id: 'assign-6', course_id: 'course-5', title: 'Career Roadmap', description: 'Research a career path and create a 5-year roadmap.', due_date: new Date(Date.now() + 14 * 86400000).toISOString(), max_marks: 100, created_at: NOW },
  { id: 'assign-7', course_id: 'course-6', title: 'Business Plan', description: 'Write a one-page business plan for your startup idea.', due_date: new Date(Date.now() + 21 * 86400000).toISOString(), max_marks: 100, created_at: NOW },
];

// ------------------------------------------------------------------
// 18. QUIZZES + QUIZ QUESTIONS
// ------------------------------------------------------------------
const QUIZZES = [
  { id: 'quiz-1', course_id: 'course-1', title: 'Communication Quiz', description: 'Test your understanding of communication concepts.', pass_percentage: 60, max_attempts: 3, time_limit: 10, created_at: NOW },
  { id: 'quiz-2', course_id: 'course-1', title: 'Final Assessment', description: 'Final assessment for Soft Skills course.', pass_percentage: 70, max_attempts: 2, time_limit: 20, created_at: NOW },
  { id: 'quiz-3', course_id: 'course-2', title: 'Team Leadership Quiz', description: 'Test your knowledge of team leadership.', pass_percentage: 60, max_attempts: 3, time_limit: 10, created_at: NOW },
  { id: 'quiz-4', course_id: 'course-4', title: 'Investment Quiz', description: 'Test your understanding of investment basics.', pass_percentage: 60, max_attempts: 3, time_limit: 10, created_at: NOW },
  { id: 'quiz-5', course_id: 'course-6', title: 'Entrepreneurship Quiz', description: 'Test your entrepreneurship knowledge.', pass_percentage: 60, max_attempts: 3, time_limit: 10, created_at: NOW },
];

const QUIZ_QUESTIONS = [
  // Quiz 1 - Communication Quiz (MCQ + T/F)
  { id: 'qq-1', quiz_id: 'quiz-1', question: 'What is the most important aspect of active listening?', question_type: 'multiple_choice', options: JSON.stringify(['Speaking clearly', 'Paying full attention', 'Taking notes', 'Asking questions']), correct_answer: 'Paying full attention', sort_order: 1 },
  { id: 'qq-2', quiz_id: 'quiz-1', question: 'Non-verbal communication includes body language and facial expressions.', question_type: 'true_false', options: JSON.stringify(['True', 'False']), correct_answer: 'True', sort_order: 2 },
  { id: 'qq-3', quiz_id: 'quiz-1', question: 'Which of these is a barrier to effective communication?', question_type: 'multiple_choice', options: JSON.stringify(['Clear message', 'Active listening', 'Noise', 'Feedback']), correct_answer: 'Noise', sort_order: 3 },
  { id: 'qq-4', quiz_id: 'quiz-1', question: 'Briefly explain why empathy is important in communication.', question_type: 'short_answer', options: null, correct_answer: null, sort_order: 4 },
  // Quiz 2 - Final Assessment
  { id: 'qq-5', quiz_id: 'quiz-2', question: 'Which soft skill is most important for career success?', question_type: 'multiple_choice', options: JSON.stringify(['Technical skills', 'Communication', 'Speed', 'Luck']), correct_answer: 'Communication', sort_order: 1 },
  { id: 'qq-6', quiz_id: 'quiz-2', question: 'Teamwork is only important in large organizations.', question_type: 'true_false', options: JSON.stringify(['True', 'False']), correct_answer: 'False', sort_order: 2 },
  { id: 'qq-7', quiz_id: 'quiz-2', question: 'Describe a situation where you demonstrated leadership.', question_type: 'short_answer', options: null, correct_answer: null, sort_order: 3 },
  // Quiz 3 - Team Leadership Quiz
  { id: 'qq-8', quiz_id: 'quiz-3', question: 'What is the primary role of a team leader?', question_type: 'multiple_choice', options: JSON.stringify(['Give orders', 'Guide and support', 'Do all the work', 'Take credit']), correct_answer: 'Guide and support', sort_order: 1 },
  { id: 'qq-9', quiz_id: 'quiz-3', question: 'Trust is the foundation of effective teamwork.', question_type: 'true_false', options: JSON.stringify(['True', 'False']), correct_answer: 'True', sort_order: 2 },
  // Quiz 4 - Investment Quiz
  { id: 'qq-10', quiz_id: 'quiz-4', question: 'What does diversification mean in investing?', question_type: 'multiple_choice', options: JSON.stringify(['Investing in one stock', 'Spreading investments across assets', 'Saving money', 'Taking loans']), correct_answer: 'Spreading investments across assets', sort_order: 1 },
  { id: 'qq-11', quiz_id: 'quiz-4', question: 'What is compound interest?', question_type: 'short_answer', options: null, correct_answer: null, sort_order: 2 },
  // Quiz 5 - Entrepreneurship Quiz
  { id: 'qq-12', quiz_id: 'quiz-5', question: 'A business plan should include a financial projection.', question_type: 'true_false', options: JSON.stringify(['True', 'False']), correct_answer: 'True', sort_order: 1 },
  { id: 'qq-13', quiz_id: 'quiz-5', question: 'What is a minimum viable product (MVP)?', question_type: 'multiple_choice', options: JSON.stringify(['A finished product', 'A simple version to test the market', 'An expensive product', 'A product with many features']), correct_answer: 'A simple version to test the market', sort_order: 2 },
];

// ------------------------------------------------------------------
// 19. STUDENT PROGRESS (pre-existing for demo)
// ------------------------------------------------------------------
const PROGRESS = [
  { id: 'prog-1', student_id: 'demo-student-1', lesson_id: 'les-1', completed: true, resume_position: 0, time_spent: 600, last_activity: new Date(Date.now() - 5 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-2', student_id: 'demo-student-1', lesson_id: 'les-2', completed: true, resume_position: 0, time_spent: 900, last_activity: new Date(Date.now() - 4 * 86400000).toISOString(), score: 85, created_at: NOW },
  { id: 'prog-3', student_id: 'demo-student-1', lesson_id: 'les-3', completed: true, resume_position: 0, time_spent: 480, last_activity: new Date(Date.now() - 4 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-4', student_id: 'demo-student-1', lesson_id: 'les-4', completed: false, resume_position: 240, time_spent: 300, last_activity: new Date(Date.now() - 2 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-5', student_id: 'demo-student-1', lesson_id: 'les-10', completed: true, resume_position: 0, time_spent: 480, last_activity: new Date(Date.now() - 8 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-6', student_id: 'demo-student-2', lesson_id: 'les-1', completed: true, resume_position: 0, time_spent: 600, last_activity: new Date(Date.now() - 3 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-7', student_id: 'demo-student-2', lesson_id: 'les-16', completed: true, resume_position: 0, time_spent: 540, last_activity: new Date(Date.now() - 2 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-8', student_id: 'demo-student-2', lesson_id: 'les-20', completed: true, resume_position: 0, time_spent: 660, last_activity: new Date(Date.now() - 1 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-9', student_id: 'demo-student-3', lesson_id: 'les-1', completed: true, resume_position: 0, time_spent: 600, last_activity: new Date(Date.now() - 10 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-10', student_id: 'demo-student-3', lesson_id: 'les-3', completed: true, resume_position: 0, time_spent: 480, last_activity: new Date(Date.now() - 9 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-11', student_id: 'demo-student-3', lesson_id: 'les-10', completed: true, resume_position: 0, time_spent: 480, last_activity: new Date(Date.now() - 7 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-12', student_id: 'demo-student-3', lesson_id: 'les-25', completed: false, resume_position: 120, time_spent: 200, last_activity: new Date(Date.now() - 1 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-13', student_id: 'demo-student-7', lesson_id: 'les-16', completed: true, resume_position: 0, time_spent: 540, last_activity: new Date(Date.now() - 5 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-14', student_id: 'demo-student-7', lesson_id: 'les-18', completed: true, resume_position: 0, time_spent: 1320, last_activity: new Date(Date.now() - 3 * 86400000).toISOString(), score: null, created_at: NOW },
  { id: 'prog-15', student_id: 'demo-student-7', lesson_id: 'les-19', completed: true, resume_position: 0, time_spent: 1200, last_activity: new Date(Date.now() - 2 * 86400000).toISOString(), score: 92, created_at: NOW },
];

// ------------------------------------------------------------------
// 20. CERTIFICATES (pre-existing for completed courses)
// ------------------------------------------------------------------
const CERTIFICATES = [
  { id: 'cert-1', student_id: 'demo-student-1', course_id: 'course-2', certificate_number: 'CERT-2025-0001', completed_at: new Date(Date.now() - 1 * 86400000).toISOString(), issued_at: new Date(Date.now() - 1 * 86400000).toISOString(), created_at: NOW },
  { id: 'cert-2', student_id: 'demo-student-3', course_id: 'course-1', certificate_number: 'CERT-2025-0002', completed_at: new Date(Date.now() - 2 * 86400000).toISOString(), issued_at: new Date(Date.now() - 2 * 86400000).toISOString(), created_at: NOW },
  { id: 'cert-3', student_id: 'demo-student-7', course_id: 'course-3', certificate_number: 'CERT-2025-0003', completed_at: new Date(Date.now() - 1 * 86400000).toISOString(), issued_at: new Date(Date.now() - 1 * 86400000).toISOString(), created_at: NOW },
  { id: 'cert-4', student_id: 'demo-student-5', course_id: 'course-8', certificate_number: 'CERT-2025-0004', completed_at: new Date(Date.now() - 3 * 86400000).toISOString(), issued_at: new Date(Date.now() - 3 * 86400000).toISOString(), created_at: NOW },
];

// ------------------------------------------------------------------
// HELPER: Map section + subject + category onto enrollments & course_sections
// ------------------------------------------------------------------
function enrichEnrollment(enr) {
  const student = STUDENTS.find((s) => s.id === enr.student_id);
  const course = COURSES.find((c) => c.id === enr.course_id);
  return { ...enr, student: student || null, course: course || null };
}

function enrichCourseSection(cs) {
  const section = SECTIONS.find((s) => s.id === cs.section_id);
  return { ...cs, section: section || null };
}

// ------------------------------------------------------------------
// BUILD THE COMPLETE DATA OBJECT
// ------------------------------------------------------------------
export function buildDemoData() {
  return {
    schools: SCHOOLS,
    categories: CATEGORIES,
    subjects: SUBJECTS,
    sections: SECTIONS,
    content: CONTENT,
    users: USERS,
    auditLog: AUDIT_LOG,
    students: STUDENTS,
    courses: COURSES,
    courseSections: COURSE_SECTIONS.map(enrichCourseSection),
    enrollments: ENROLLMENTS.map(enrichEnrollment),
    notifications: NOTIFICATIONS,
    counselors: COUNSELORS,
    activities: ACTIVITY_LOG,
    courseModules: COURSE_MODULES,
    lessons: LESSONS,
    assignments: ASSIGNMENTS,
    quizzes: QUIZZES,
    quizQuestions: QUIZ_QUESTIONS,
    progress: PROGRESS,
    certificates: CERTIFICATES,
  };
}

// ------------------------------------------------------------------
// EXPORT RAW COLLECTIONS FOR DIRECT SERVICE MOCKING
// ------------------------------------------------------------------
export {
  SCHOOLS,
  CATEGORIES,
  SUBJECTS,
  SECTIONS,
  CONTENT,
  STUDENTS,
  COURSES,
  COURSE_SECTIONS,
  ENROLLMENTS,
  NOTIFICATIONS,
  COUNSELORS,
  USERS,
  AUDIT_LOG,
  ACTIVITY_LOG,
  COURSE_MODULES,
  LESSONS,
  ASSIGNMENTS,
  QUIZZES,
  QUIZ_QUESTIONS,
  PROGRESS,
  CERTIFICATES,
};

// Helper to generate a new ID prefixed with demo-
let _counter = 100;
export function newDemoId(prefix = 'demo') {
  return `${prefix}-${Date.now()}-${++_counter}`;
}
