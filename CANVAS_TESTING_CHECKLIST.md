# 🧪 Canvas Feature Testing Checklist

## 📋 Pre-Testing Setup

### ✅ Step 1: Database Migration
- [ ] Opened Supabase Dashboard
- [ ] Navigated to SQL Editor
- [ ] Copied content from `CANVAS_DATABASE_MIGRATION.sql`
- [ ] Pasted in SQL Editor
- [ ] Clicked "Run"
- [ ] Saw success messages (✓ Tables created, ✓ Functions created, etc.)

### ✅ Step 2: Verify Database
Run this query in Supabase SQL Editor:
```sql
-- Should return 3 tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'canvas_%';

-- Should return 3 functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%canvas%';
```

### ✅ Step 3: Set Up Test Users
```sql
-- Make yourself a mentor (replace with your email)
UPDATE profiles SET role = 'mentor' WHERE email = 'your-mentor@email.com';

-- Verify your role
SELECT id, email, name, role FROM profiles WHERE email = 'your-mentor@email.com';
```

### ✅ Step 4: Start Dev Server
```powershell
npm run dev
```

---

## 🎯 Test Scenarios

### 🧑‍🏫 **Scenario 1: Mentor Creates Session**

#### Steps:
1. [ ] Login as mentor
2. [ ] Navigate to `/canvas` or click "Canvas" in navbar
3. [ ] Should see "Start New Session" button
4. [ ] Click "Start New Session"
5. [ ] Fill in session details:
   - Title: "Math Class"
   - Max Participants: 10
6. [ ] Click "Create Session"
7. [ ] Should be redirected to canvas session
8. [ ] Note the session code displayed (e.g., ABC123)

#### Expected Results:
- ✅ Modal opens smoothly
- ✅ Form validation works
- ✅ Session created successfully
- ✅ Redirected to canvas with loading canvas
- ✅ Session code is visible
- ✅ You appear in participants list
- ✅ You have "Mentor" badge

---

### 🎓 **Scenario 2: Student Joins Session**

#### Steps:
1. [ ] Open **different browser** or **incognito window**
2. [ ] Login as student (different account)
3. [ ] Navigate to `/canvas`
4. [ ] Click "Join Session"
5. [ ] Enter the session code from Scenario 1
6. [ ] Click "Join Session"
7. [ ] Should be redirected to canvas session

#### Expected Results:
- ✅ Join modal opens
- ✅ Can enter 6-character code
- ✅ Joined successfully
- ✅ Redirected to same canvas as mentor
- ✅ Student appears in participants list
- ✅ Student has "Student" badge
- ✅ Mentor can see student joined (in their window)

---

### ✏️ **Scenario 3: Collaborative Drawing**

#### In Mentor's Window:
1. [ ] Select pen tool
2. [ ] Choose a color (e.g., red)
3. [ ] Draw a circle

#### In Student's Window:
1. [ ] Should see mentor's circle appear immediately
2. [ ] Select pen tool
3. [ ] Choose different color (e.g., blue)
4. [ ] Draw a square

#### In Both Windows:
- [ ] Both drawings visible
- [ ] No lag (< 1 second delay)
- [ ] Drawings don't overlap incorrectly

#### Expected Results:
- ✅ Drawings appear in real-time (both directions)
- ✅ Colors preserved correctly
- ✅ Stroke widths correct
- ✅ No data loss

---

### 🖱️ **Scenario 4: Cursor Tracking**

#### Steps:
1. [ ] In mentor's window, move mouse on canvas
2. [ ] In student's window, observe colored dot/cursor
3. [ ] Should show "Mentor's Name" label
4. [ ] In student's window, move mouse on canvas
5. [ ] In mentor's window, observe student's cursor

#### Expected Results:
- ✅ Cursors appear in different colors
- ✅ User names displayed near cursors
- ✅ Cursors move smoothly (not jumpy)
- ✅ Cursors disappear when user leaves canvas area

---

### 🎨 **Scenario 5: Drawing Tools**

#### Test Each Tool:

**Pen Tool:**
- [ ] Select pen
- [ ] Change size (1-20)
- [ ] Change color
- [ ] Draw lines
- [ ] Changes visible to both users

**Eraser Tool:**
- [ ] Select eraser
- [ ] Change size
- [ ] Erase part of drawing
- [ ] Other user sees erasure

**Text Tool:**
- [ ] Select text tool
- [ ] Click on canvas
- [ ] Type "Hello World"
- [ ] Text appears for both users
- [ ] Change font size
- [ ] Change color

#### Expected Results:
- ✅ All tools work correctly
- ✅ Settings persist between strokes
- ✅ Changes sync to all users

---

### 🧹 **Scenario 6: Clear Canvas (Mentor Only)**

#### As Mentor:
1. [ ] Draw something
2. [ ] Click "Clear Canvas" button
3. [ ] Confirm action
4. [ ] Canvas should clear

#### As Student:
1. [ ] Try to find "Clear Canvas" button
2. [ ] Should NOT see it (mentor-only feature)
3. [ ] Canvas should clear when mentor clears it

#### Expected Results:
- ✅ Only mentor has clear button
- ✅ Clear works instantly
- ✅ All users see cleared canvas
- ✅ Previous drawings removed

---

### 👥 **Scenario 7: Participants List**

#### Steps:
1. [ ] Click "Participants" button
2. [ ] Sidebar opens showing all participants
3. [ ] Each participant shows:
   - Avatar/initials
   - Name
   - Role badge (Mentor/Student)
   - Active status (green dot)
   - Cursor color indicator

#### With Multiple Students:
1. [ ] Have 2-3 students join
2. [ ] All appear in list
3. [ ] Each has unique cursor color

#### Expected Results:
- ✅ Accurate participant count
- ✅ Active status indicators working
- ✅ Role badges correct
- ✅ Cursor colors unique and visible

---

### 🚪 **Scenario 8: Leave Session**

#### As Student:
1. [ ] Click "Leave" button
2. [ ] Should be redirected to `/canvas`
3. [ ] In mentor's window, student disappears from list

#### As Mentor:
1. [ ] Click "End Session" button
2. [ ] Session ends for everyone
3. [ ] All students see notification
4. [ ] Session becomes inactive in database

#### Expected Results:
- ✅ Leave button works
- ✅ Participants list updates
- ✅ End session works (mentor only)
- ✅ All users notified when session ends

---

### 🔄 **Scenario 9: Rejoin Session**

#### Steps:
1. [ ] Student leaves session
2. [ ] Student clicks "Join Session" again
3. [ ] Enters same session code
4. [ ] Should rejoin successfully
5. [ ] Previous drawings still visible

#### Expected Results:
- ✅ Can rejoin same session
- ✅ Historical drawings preserved
- ✅ No duplicate participant entries

---

### ⚠️ **Scenario 10: Error Handling**

#### Invalid Session Code:
1. [ ] Try joining with code "XXXXXX"
2. [ ] Should show error: "Session not found"

#### Full Session:
1. [ ] Create session with max 2 participants
2. [ ] Have 2 students join
3. [ ] Third student tries to join
4. [ ] Should show error: "Session is full"

#### Inactive Session:
1. [ ] Mentor ends session
2. [ ] New student tries to join with old code
3. [ ] Should show error: "Session no longer active"

#### Expected Results:
- ✅ Clear error messages
- ✅ No crashes
- ✅ User redirected appropriately

---

### 📱 **Scenario 11: Mobile Testing**

#### On Mobile Device:
1. [ ] Navigate to `/canvas`
2. [ ] UI is responsive
3. [ ] Can create/join sessions
4. [ ] Touch drawing works
5. [ ] Tools accessible
6. [ ] Participants list works

#### Expected Results:
- ✅ Mobile-friendly layout
- ✅ Touch events work
- ✅ No horizontal scrolling
- ✅ Buttons easily tappable

---

### 🔐 **Scenario 12: Security Testing**

#### Without Login:
1. [ ] Logout
2. [ ] Try accessing `/canvas`
3. [ ] Should redirect to login

#### As Non-Mentor:
1. [ ] Login as student
2. [ ] Go to `/canvas`
3. [ ] Should NOT see "Start New Session" button
4. [ ] Can only see "Join Session"

#### Expected Results:
- ✅ Authentication required
- ✅ Role-based access control
- ✅ Protected routes work

---

## 📊 **Performance Testing**

### Load Test:
- [ ] Have 5+ participants join same session
- [ ] Everyone draws simultaneously
- [ ] Monitor:
  - Network tab (WebSocket messages)
  - CPU usage
  - Memory usage
  - Drawing lag

#### Expected Results:
- ✅ No significant lag with 10 users
- ✅ CPU usage reasonable
- ✅ No memory leaks
- ✅ WebSocket stable

---

## 🐛 **Bug Report Template**

If you find issues, document them:

```
**Bug:** [Brief description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Browser:** [Chrome/Firefox/Safari]
**Console Errors:** [Copy from F12 console]
**Screenshot:** [If applicable]
```

---

## ✅ **Testing Complete Checklist**

- [ ] All database tables created
- [ ] RPC functions working
- [ ] Mentor can create sessions
- [ ] Students can join sessions
- [ ] Real-time drawing works
- [ ] Cursor tracking works
- [ ] All tools functional
- [ ] Participants list accurate
- [ ] Clear canvas works (mentor only)
- [ ] Leave/End session works
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] Security/permissions correct
- [ ] Performance acceptable

---

## 🎉 **Success Criteria**

You're ready for production when:
- ✅ All 12 scenarios pass
- ✅ No console errors
- ✅ Smooth user experience
- ✅ Security working correctly
- ✅ Mobile fully functional

---

## 📝 **Notes Section**

Use this space to note any issues or observations:

```
Test Date: __________
Tester: __________

Issues Found:
1. 
2. 
3. 

Positive Feedback:
1. 
2. 
3. 

Suggestions:
1. 
2. 
3. 
```

---

**Happy Testing! 🧪✨**
