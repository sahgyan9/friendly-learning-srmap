-- Quick verification: Do canvas tables exist?
-- Run this in Supabase SQL Editor

-- Check if tables exist
SELECT 
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ ALL TABLES EXIST - Database is set up correctly!'
        WHEN COUNT(*) > 0 THEN '⚠️ PARTIAL SETUP - Only ' || COUNT(*) || ' of 3 tables exist'
        ELSE '❌ NO TABLES - Database setup needed'
    END as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('canvas_sessions', 'canvas_participants', 'canvas_drawings');

-- List which tables exist
SELECT 
    table_name,
    '✅ Exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('canvas_sessions', 'canvas_participants', 'canvas_drawings')
ORDER BY table_name;

-- Check if functions exist
SELECT 
    routine_name,
    '✅ Exists' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_canvas_session', 'join_canvas_session', 'get_canvas_session_participants', 'generate_session_code')
ORDER BY routine_name;

-- Check your mentor status
SELECT 
    id,
    email,
    role,
    CASE 
        WHEN role = 'mentor' THEN '✅ You are a mentor - can create sessions'
        ELSE '❌ Not a mentor - apply at /become-mentor'
    END as status
FROM users
WHERE id = auth.uid();
