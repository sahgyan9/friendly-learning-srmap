-- ================================================
-- CANVAS SETUP VERIFICATION
-- Run this AFTER running CANVAS_DATABASE_MIGRATION.sql
-- ================================================

-- Test 1: Check if all tables exist
SELECT 
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ All 3 tables exist'
        ELSE '❌ Missing tables! Count: ' || COUNT(*)::TEXT
    END as tables_status,
    string_agg(table_name, ', ') as tables_found
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'canvas_%';

-- Test 2: Check if all functions exist
SELECT 
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ All functions exist'
        ELSE '❌ Missing functions! Count: ' || COUNT(*)::TEXT
    END as functions_status,
    string_agg(routine_name, ', ') as functions_found
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%canvas%';

-- Test 3: Check if RLS is enabled
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Not Enabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'canvas_%';

-- Test 4: Check if Realtime is enabled
SELECT 
    tablename,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Realtime Enabled'
        ELSE '❌ Realtime Not Enabled'
    END as realtime_status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename LIKE 'canvas_%'
GROUP BY tablename;

-- Test 5: Check your user role
SELECT 
    u.email,
    COALESCE(u.role, 'No role set') as role,
    CASE 
        WHEN u.role = 'mentor' THEN '✅ You are a mentor!'
        WHEN u.role IS NOT NULL THEN '⚠️ You are a ' || u.role
        ELSE '❌ No role set - run UPDATE to set role'
    END as mentor_status
FROM users u
WHERE u.id = auth.uid();

-- Test 6: Try to create a test session (will fail if not mentor)
-- Comment this out if you're not a mentor yet
-- SELECT * FROM create_canvas_session(
--     auth.uid(),
--     'Test Session - DELETE ME'
-- );

-- ================================================
-- FINAL SUMMARY
-- ================================================
SELECT 
    '✅ Setup Complete!' as status,
    'Your canvas feature is ready to use!' as message
WHERE 
    -- All tables exist
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_name LIKE 'canvas_%') = 3
    AND
    -- All functions exist
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_schema = 'public' AND routine_name LIKE '%canvas%') >= 4
    AND
    -- RLS enabled on all tables
    (SELECT COUNT(*) FROM pg_tables 
     WHERE schemaname = 'public' AND tablename LIKE 'canvas_%' AND rowsecurity = true) = 3;

-- If you don't see "Setup Complete!" above, check the individual test results
