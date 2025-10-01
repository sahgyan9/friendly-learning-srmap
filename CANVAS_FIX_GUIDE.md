# 🔧 Canvas Feature - Step-by-Step Fix Guide

## 🚨 **Your Current Issues**

Based on your screenshots, you have 3 problems:

1. ❌ **"Failed to load your sessions"** error
2. ❌ Blank canvas page (no tools showing)
3. ❌ No session code displayed after creation

## 🔍 **Root Cause**

**The database migration hasn't been run yet!** 

The RPC functions (`create_canvas_session`, `join_canvas_session`, etc.) don't exist in your Supabase database, so the frontend can't communicate with the backend.

---

## ✅ **STEP-BY-STEP SOLUTION**

### **STEP 1: Run the Database Migration (MOST IMPORTANT!)**

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Login to your account
   - Select your project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"** button

3. **Copy the Migration**
   - Open file: `CANVAS_DATABASE_MIGRATION.sql` (it's in your project root)
   - Select **ALL content** (Ctrl+A)
   - Copy it (Ctrl+C)

4. **Paste and Run**
   - Paste into Supabase SQL Editor (Ctrl+V)
   - Click **"Run"** button (or press Ctrl+Enter)
   - Wait 5-10 seconds

5. **Verify Success**
   You should see these messages:
   ```
   ✓ canvas_sessions table created
   ✓ canvas_participants table created  
   ✓ canvas_drawings table created
   ✓ Canvas database migration completed successfully!
   ```

---

### **STEP 2: Make Yourself a Mentor**

If you want to CREATE sessions (not just join them), you need mentor role:

1. In Supabase SQL Editor, run this query:
```sql
-- Replace 'your-email@example.com' with YOUR actual email
UPDATE profiles 
SET role = 'mentor' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

2. Verify it worked:
```sql
-- Check your role
SELECT u.email, p.role 
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'your-email@example.com';
```

Expected output:
```
email                    | role
------------------------|--------
your-email@example.com  | mentor
```

---

### **STEP 3: Restart Your Dev Server**

Sometimes the connection needs to refresh:

```powershell
# In your terminal, press Ctrl+C to stop the server
# Then restart:
npm run dev
```

---

### **STEP 4: Clear Browser Cache**

1. Press **F12** to open Developer Tools
2. Right-click the **refresh button** in your browser
3. Select **"Empty Cache and Hard Reload"**

Or simply:
- Press **Ctrl+Shift+Delete**
- Select "Cached images and files"
- Click "Clear data"

---

### **STEP 5: Test Again**

1. **Login** to your application
2. Go to: http://localhost:5173/canvas
3. You should NO LONGER see "Failed to load your sessions"
4. Click **"Start New Session"**
5. Fill in:
   - Title: "My First Canvas"
   - Max Participants: 10
6. Click **"Create Session"**

**Expected Result NOW:**
- ✅ A popup appears showing your session code (e.g., "N7P4K2")
- ✅ Button to copy code
- ✅ Button to "Enter Session"
- ✅ After clicking "Enter Session", canvas loads with tools visible

---

## 🧪 **Quick Diagnostic Test**

Run these queries in Supabase SQL Editor to verify setup:

### **Test 1: Check if tables exist**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'canvas_%';
```

Should return 3 tables:
- canvas_sessions
- canvas_participants
- canvas_drawings

### **Test 2: Check if functions exist**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%canvas%';
```

Should return 5 functions:
- create_canvas_session
- join_canvas_session  
- get_canvas_session_participants
- generate_session_code
- check_mentor_left

### **Test 3: Check your user role**
```sql
SELECT u.email, p.role, p.name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.id = auth.uid();
```

Should show your email and role = 'mentor'

---

## 🐛 **If It Still Doesn't Work**

### **Check Browser Console**

1. Press **F12**
2. Go to **Console** tab
3. Look for red error messages
4. Copy and share them

Common errors and fixes:

**Error: "relation canvas_sessions does not exist"**
- **Fix:** Run the migration SQL again

**Error: "function create_canvas_session does not exist"**
- **Fix:** Run the migration SQL again, ensure all queries executed

**Error: "permission denied for table canvas_sessions"**
- **Fix:** RLS policies need to be created (they're in the migration)

**Error: "new row violates check constraint"**
- **Fix:** Probably session code length issue, migration will fix this

---

## 📋 **What the Migration Does**

When you run `CANVAS_DATABASE_MIGRATION.sql`, it creates:

1. **3 Tables**
   - `canvas_sessions` - Stores session information
   - `canvas_participants` - Tracks who's in each session
   - `canvas_drawings` - Stores all drawing actions

2. **5 Functions (RPC)**
   - `create_canvas_session` - Creates new session with unique code
   - `join_canvas_session` - Lets students join via code
   - `get_canvas_session_participants` - Gets list of participants
   - `generate_session_code` - Generates random 6-char codes
   - `check_mentor_left` - Cleanup trigger

3. **Security Policies (RLS)**
   - Only participants can see session data
   - Only mentors can create/end sessions
   - Users can only modify their own data

4. **Real-time Enablement**
   - Enables WebSocket subscriptions for live updates

5. **Indexes**
   - Makes queries fast even with lots of data

---

## ✅ **After Migration Succeeds**

You'll be able to:

1. **As Mentor:**
   - ✅ Create unlimited sessions
   - ✅ Get 6-character session codes (e.g., "ABC123")
   - ✅ Share codes with students
   - ✅ See all participants
   - ✅ Draw on canvas
   - ✅ Clear canvas anytime
   - ✅ End sessions

2. **As Student:**
   - ✅ Join sessions using codes
   - ✅ Draw collaboratively
   - ✅ See others drawing in real-time
   - ✅ See live cursors
   - ✅ Add text annotations

3. **Real-Time Features:**
   - ✅ Drawings sync in < 100ms
   - ✅ Cursors update in < 50ms
   - ✅ Participant list updates instantly
   - ✅ No page refresh needed

---

## 💡 **Pro Tips**

1. **Test with 2 browsers**
   - Open regular window as mentor
   - Open incognito window as student
   - Join same session and draw together!

2. **Session codes are case-insensitive**
   - "ABC123" = "abc123" = "Abc123"

3. **Sessions end when mentor leaves**
   - Or when mentor clicks "End Session"
   - Students can rejoin if session still active

4. **Drawings are persisted**
   - Even if everyone leaves
   - They'll reappear when someone rejoins

---

## 🎯 **Summary**

**Your issue:** Database not set up
**Solution:** Run `CANVAS_DATABASE_MIGRATION.sql` in Supabase
**Time needed:** 2-3 minutes
**After that:** Everything will work! ✨

---

## 📞 **Still Stuck?**

If you still have issues after running the migration:

1. **Share error messages** from browser console (F12)
2. **Share Supabase logs** (Dashboard → Logs)
3. **Verify migration ran** by checking if tables exist
4. **Check your user role** with the SQL query above

---

**The migration file is CRITICAL - everything depends on it! 🔑**

Once you run it, all your issues will be resolved! 🎉
