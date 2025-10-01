-- Fix get_canvas_session_participants to use existing users table instead of profiles
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