# Canvas Database Setup - Complete Instructions

## 🎯 **What You Need to Do**

I **cannot** directly access your Supabase account (for security reasons), but I've made it **super easy** for you!

---

## 📋 **Option 1: Manual Setup (Recommended - 5 minutes)**

### **Step-by-Step:**

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Login to your account
   - Select your project

2. **Navigate to SQL Editor**
   - Look at the **left sidebar**
   - Click on **"SQL Editor"** (database icon)
   - Click **"+ New query"** button

3. **Copy the Migration File**
   - In VS Code, open: `CANVAS_DATABASE_MIGRATION.sql`
   - Press `Ctrl+A` (select all)
   - Press `Ctrl+C` (copy)

4. **Paste and Execute**
   - Go back to Supabase
   - Press `Ctrl+V` (paste into SQL editor)
   - Click **"RUN"** button (or press `Ctrl+Enter`)
   - Wait 5-10 seconds

5. **Verify Success**
   - You should see green checkmarks
   - Messages saying tables created
   - No red errors

6. **Set Your Role as Mentor**
   ```sql
   -- Copy this, replace YOUR_EMAIL, paste in SQL editor, and run
   UPDATE profiles 
   SET role = 'mentor' 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');
   ```

7. **Verify Setup (Optional)**
   - Open: `VERIFY_CANVAS_SETUP.sql`
   - Copy and paste into SQL editor
   - Run it
   - Should see "✅ Setup Complete!"

---

## 📋 **Option 2: Quick Check What's Missing**

Run these one by one in Supabase SQL Editor to see what you need:

### **Check 1: Do tables exist?**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'canvas_%';
```

**Expected:** Should show 3 tables:
- canvas_sessions
- canvas_participants
- canvas_drawings

**If empty:** You need to run the migration

---

### **Check 2: Do functions exist?**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%canvas%';
```

**Expected:** Should show functions like:
- create_canvas_session
- join_canvas_session
- get_canvas_session_participants

**If empty:** You need to run the migration

---

### **Check 3: Is your user a mentor?**
```sql
SELECT u.email, p.role 
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.id = auth.uid();
```

**Expected:** Should show your email with role = 'mentor'

**If role is NULL or 'student':** Run the UPDATE query from step 6 above

---

## 🤔 **Why I Can't Do It For You**

For security reasons:
- I don't have access to your Supabase account
- I can't see your database credentials
- Only YOU can login to your Supabase dashboard
- This protects your data and privacy! 🔐

But I've made it **super simple** - just copy/paste/run!

---

## 🆘 **Need More Help?**

### **Can't find Supabase SQL Editor?**

1. Login to https://supabase.com
2. Click on your project
3. Look for these in the sidebar (in order):
   - Home
   - Table Editor
   - Authentication
   - Storage
   - **SQL Editor** ← This one!
   - Database
   - Settings

### **Don't remember Supabase login?**

Check your `.env` file or `supabase/config.toml` for project details.

Your `src/integrations/supabase/client.ts` has:
```typescript
const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
```

This means your project ID is: `ruapdkrgcbqrhvsayvpf`

Direct link to SQL Editor:
https://supabase.com/dashboard/project/ruapdkrgcbqrhvsayvpf/sql

### **Supabase account not working?**

1. Reset password at: https://supabase.com/reset-password
2. Or create new free account
3. Import your existing project

---

## 📊 **What the Files Do**

| File | Purpose |
|------|---------|
| `CANVAS_DATABASE_MIGRATION.sql` | ⭐ **THE MAIN FILE** - Creates everything |
| `VERIFY_CANVAS_SETUP.sql` | Tests if migration worked |
| `CANVAS_DIAGNOSTIC_QUERIES.sql` | Individual test queries |
| `CANVAS_SUPER_SIMPLE_SETUP.md` | Step-by-step guide |
| `CANVAS_FIX_GUIDE.md` | Troubleshooting guide |
| `CANVAS_EXPLAINED.md` | Technical explanation |

---

## ✅ **After Running Migration**

You'll be able to:

1. ✅ Create canvas sessions
2. ✅ Get session codes (like "ABC123")
3. ✅ Share codes with students
4. ✅ See canvas with drawing tools
5. ✅ Draw in real-time
6. ✅ Track participants
7. ✅ See live cursors

---

## 🎉 **Quick Recap**

**To fix your canvas:**
1. Go to Supabase SQL Editor
2. Paste `CANVAS_DATABASE_MIGRATION.sql`
3. Click RUN
4. Set yourself as mentor
5. Refresh your app
6. Try creating session again!

**That's it!** 🚀

---

## 📞 **Still Stuck?**

If you're still having trouble:
1. Share a screenshot of your Supabase dashboard
2. Share any error messages from the SQL editor
3. Check browser console (F12) for JavaScript errors
4. I can help debug from there!

But the migration file should work perfectly if you just copy/paste/run it! 💪
