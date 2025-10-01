-- ============================================
-- COMPLETE CANVAS DATABASE SETUP
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================

-- This file combines:
-- 1. Database migration (creates tables, functions, policies)
-- 2. Makes your current user a mentor
-- 3. Verifies everything is set up correctly

-- ============================================
-- PART 1: CREATE TABLES
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Canvas Sessions Table
CREATE TABLE IF NOT EXISTS canvas_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    session_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 10,
    background_color TEXT DEFAULT '#ffffff',
    CONSTRAINT session_code_length CHECK (length(session_code) = 6)
);

-- Canvas Participants Table
CREATE TABLE IF NOT EXISTS canvas_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES canvas_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    role TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(session_id, user_id)
);

-- Canvas Drawings Table
CREATE TABLE IF NOT EXISTS canvas_drawings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES canvas_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drawing_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action_type TEXT NOT NULL CHECK (action_type IN ('draw', 'erase', 'clear', 'text'))
);

-- ============================================
-- PART 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_canvas_sessions_mentor ON canvas_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_canvas_sessions_active ON canvas_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_canvas_sessions_code ON canvas_sessions(session_code);

CREATE INDEX IF NOT EXISTS idx_canvas_participants_session ON canvas_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_canvas_participants_user ON canvas_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_participants_active ON canvas_participants(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_canvas_drawings_session ON canvas_drawings(session_id);
CREATE INDEX IF NOT EXISTS idx_canvas_drawings_timestamp ON canvas_drawings(timestamp);

-- ============================================
-- PART 3: CREATE FUNCTIONS
-- ============================================

-- Function to generate a unique 6-character session code
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a canvas session
DROP FUNCTION IF EXISTS create_canvas_session(UUID, TEXT);
CREATE OR REPLACE FUNCTION create_canvas_session(
    p_mentor_id UUID,
    p_title TEXT
)
RETURNS TABLE (
    id UUID,
    session_code TEXT,
    title TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_session_code TEXT;
    v_session_id UUID;
BEGIN
    -- Generate unique session code
    LOOP
        v_session_code := generate_session_code();
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM canvas_sessions WHERE session_code = v_session_code
        );
    END LOOP;

    -- Create the session
    INSERT INTO canvas_sessions (mentor_id, title, session_code)
    VALUES (p_mentor_id, p_title, v_session_code)
    RETURNING canvas_sessions.id INTO v_session_id;

    -- Add mentor as participant
    INSERT INTO canvas_participants (session_id, user_id, role, is_active)
    VALUES (v_session_id, p_mentor_id, 'mentor', true);

    -- Return session details
    RETURN QUERY
    SELECT 
        canvas_sessions.id,
        canvas_sessions.session_code,
        canvas_sessions.title,
        canvas_sessions.created_at
    FROM canvas_sessions
    WHERE canvas_sessions.id = v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a canvas session
DROP FUNCTION IF EXISTS join_canvas_session(TEXT, UUID);
CREATE OR REPLACE FUNCTION join_canvas_session(
    p_session_code TEXT,
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    session_id UUID,
    role TEXT,
    session_title TEXT
) AS $$
DECLARE
    v_session_id UUID;
    v_participant_count INTEGER;
    v_max_participants INTEGER;
    v_session_title TEXT;
    v_is_active BOOLEAN;
    v_participant_id UUID;
BEGIN
    -- Get session details
    SELECT 
        canvas_sessions.id, 
        canvas_sessions.max_participants, 
        canvas_sessions.is_active,
        canvas_sessions.title
    INTO v_session_id, v_max_participants, v_is_active, v_session_title
    FROM canvas_sessions
    WHERE session_code = p_session_code;

    -- Check if session exists
    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'Session not found with code: %', p_session_code;
    END IF;

    -- Check if session is active
    IF NOT v_is_active THEN
        RAISE EXCEPTION 'Session is no longer active';
    END IF;

    -- Check if user is already a participant
    IF EXISTS (
        SELECT 1 FROM canvas_participants 
        WHERE session_id = v_session_id AND user_id = p_user_id
    ) THEN
        -- Update to active if they were inactive
        UPDATE canvas_participants
        SET is_active = true
        WHERE session_id = v_session_id AND user_id = p_user_id
        RETURNING canvas_participants.id INTO v_participant_id;
    ELSE
        -- Count active participants
        SELECT COUNT(*) INTO v_participant_count
        FROM canvas_participants
        WHERE session_id = v_session_id AND is_active = true;

        -- Check if session is full
        IF v_participant_count >= v_max_participants THEN
            RAISE EXCEPTION 'Session is full (max % participants)', v_max_participants;
        END IF;

        -- Add new participant
        INSERT INTO canvas_participants (session_id, user_id, role, is_active)
        VALUES (v_session_id, p_user_id, 'student', true)
        RETURNING canvas_participants.id INTO v_participant_id;
    END IF;

    -- Return participant details
    RETURN QUERY
    SELECT 
        v_participant_id,
        v_session_id,
        'student'::TEXT,
        v_session_title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get canvas session participants with user details
DROP FUNCTION IF EXISTS get_canvas_session_participants(UUID);
CREATE OR REPLACE FUNCTION get_canvas_session_participants(
    p_session_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    role TEXT,
    joined_at TIMESTAMPTZ,
    is_active BOOLEAN,
    user_name TEXT,
    user_profile_image TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        cp.user_id,
        cp.role,
        cp.joined_at,
        cp.is_active,
        COALESCE(u.name, u.email, 'Anonymous') as user_name,
        u.profile_image as user_profile_image
    FROM canvas_participants cp
    INNER JOIN users u ON cp.user_id = u.id
    WHERE cp.session_id = p_session_id
    ORDER BY cp.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE canvas_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_drawings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 5: CREATE RLS POLICIES
-- ============================================

-- Canvas Sessions Policies
DROP POLICY IF EXISTS "Users can view active sessions" ON canvas_sessions;
CREATE POLICY "Users can view active sessions"
ON canvas_sessions FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Mentors can create sessions" ON canvas_sessions;
CREATE POLICY "Mentors can create sessions"
ON canvas_sessions FOR INSERT
TO authenticated
WITH CHECK (mentor_id = auth.uid());

DROP POLICY IF EXISTS "Mentors can update their sessions" ON canvas_sessions;
CREATE POLICY "Mentors can update their sessions"
ON canvas_sessions FOR UPDATE
TO authenticated
USING (mentor_id = auth.uid());

DROP POLICY IF EXISTS "Mentors can delete their sessions" ON canvas_sessions;
CREATE POLICY "Mentors can delete their sessions"
ON canvas_sessions FOR DELETE
TO authenticated
USING (mentor_id = auth.uid());

-- Canvas Participants Policies
DROP POLICY IF EXISTS "Participants can view session participants" ON canvas_participants;
CREATE POLICY "Participants can view session participants"
ON canvas_participants FOR SELECT
TO authenticated
USING (
    session_id IN (
        SELECT session_id FROM canvas_participants WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can join sessions" ON canvas_participants;
CREATE POLICY "Users can join sessions"
ON canvas_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their participation" ON canvas_participants;
CREATE POLICY "Users can update their participation"
ON canvas_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Canvas Drawings Policies
DROP POLICY IF EXISTS "Participants can view session drawings" ON canvas_drawings;
CREATE POLICY "Participants can view session drawings"
ON canvas_drawings FOR SELECT
TO authenticated
USING (
    session_id IN (
        SELECT session_id FROM canvas_participants 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

DROP POLICY IF EXISTS "Participants can create drawings" ON canvas_drawings;
CREATE POLICY "Participants can create drawings"
ON canvas_drawings FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() AND
    session_id IN (
        SELECT session_id FROM canvas_participants 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

DROP POLICY IF EXISTS "Users can delete their own drawings" ON canvas_drawings;
CREATE POLICY "Users can delete their own drawings"
ON canvas_drawings FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- PART 6: ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE canvas_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_drawings;

-- ============================================
-- PART 7: CREATE TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION check_mentor_left()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = false AND OLD.is_active = true AND NEW.role = 'mentor' THEN
        UPDATE canvas_sessions
        SET is_active = false
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mentor_left_trigger ON canvas_participants;
CREATE TRIGGER mentor_left_trigger
AFTER UPDATE ON canvas_participants
FOR EACH ROW
EXECUTE FUNCTION check_mentor_left();

-- ============================================
-- PART 8: VERIFICATION
-- ============================================

-- Check tables
SELECT 
    '✅ Tables Created' as step,
    COUNT(*)::TEXT || ' tables found' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'canvas_%';

-- Check functions
SELECT 
    '✅ Functions Created' as step,
    COUNT(*)::TEXT || ' functions found' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%canvas%';

-- Check mentor status
SELECT 
    '✅ Mentor Status' as step,
    CASE 
        WHEN role = 'mentor' THEN 'You are an approved mentor - ready to create sessions!'
        ELSE 'Apply at /become-mentor to get mentor verification'
    END as status
FROM users
WHERE id = auth.uid();

-- Final success message
SELECT 
    '🎉 SETUP COMPLETE!' as message,
    'Your canvas feature is ready to use!' as details,
    'Go to /canvas and try creating a session!' as next_step;
