# Canvas Database Diagnostic Queries

Run these queries in Supabase SQL Editor to check what's missing:

## 1. Check if tables exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'canvas_%';
```

**Expected Result:** Should show:
- canvas_sessions
- canvas_participants  
- canvas_drawings

---

## 2. Check if RPC functions exist
```sql
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%canvas%';
```

**Expected Result:** Should show:
- create_canvas_session (FUNCTION)
- join_canvas_session (FUNCTION)
- get_canvas_session_participants (FUNCTION)
- generate_session_code (FUNCTION)
- check_mentor_left (FUNCTION)

---

## 3. Check if your user has a role
```sql
-- Replace 'your-email@example.com' with your actual email
SELECT id, email, 
       (SELECT role FROM profiles WHERE id = auth.users.id) as role
FROM auth.users 
WHERE email = 'your-email@example.com';
```

**Expected Result:** Should show:
- Your user ID
- Your email
- role = 'mentor' (if you should be able to create sessions)

---

## 4. If you're not a mentor, make yourself one
```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET role = 'mentor' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

---

## 5. Check Realtime publication
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**Expected Result:** Should include:
- canvas_sessions
- canvas_participants
- canvas_drawings

---

## QUICK FIX: If nothing exists, run this minimal version first

```sql
-- Create tables only (no functions yet)
CREATE TABLE IF NOT EXISTS canvas_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL,
    title TEXT NOT NULL,
    session_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 10,
    background_color TEXT DEFAULT '#ffffff'
);

CREATE TABLE IF NOT EXISTS canvas_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES canvas_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    role TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(session_id, user_id)
);

CREATE TABLE IF NOT EXISTS canvas_drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES canvas_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    drawing_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action_type TEXT NOT NULL
);

-- Test query
SELECT 'Tables created successfully!' as status;
```
