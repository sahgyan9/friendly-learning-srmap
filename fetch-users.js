import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchAllUsers() {
  try {
    console.log('🔍 Fetching all users from database...\n');
    
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        department,
        verification_status,
        is_admin,
        profile_image,
        bio,
        skills,
        linkedin_url,
        mobile,
        phone,
        is_available,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('📝 No users found in database');
      return;
    }

    console.log(`📊 Total Users Found: ${users.length}\n`);
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n👤 User #${index + 1}`);
      console.log('─'.repeat(40));
      console.log(`🆔 ID: ${user.id}`);
      console.log(`👨‍💼 Name: ${user.name || 'N/A'}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🎭 Role: ${user.role || 'N/A'}`);
      console.log(`🏫 Department: ${user.department || 'N/A'}`);
      console.log(`✅ Verification: ${user.verification_status || 'N/A'}`);
      console.log(`👑 Admin: ${user.is_admin ? 'Yes' : 'No'}`);
      console.log(`🌐 Available: ${user.is_available ? 'Yes' : 'No'}`);
      console.log(`📱 Mobile: ${user.mobile || 'N/A'}`);
      console.log(`📞 Phone: ${user.phone || 'N/A'}`);
      console.log(`🔗 LinkedIn: ${user.linkedin_url || 'N/A'}`);
      console.log(`🎯 Skills: ${user.skills ? user.skills.join(', ') : 'N/A'}`);
      console.log(`📝 Bio: ${user.bio ? (user.bio.length > 100 ? user.bio.substring(0, 100) + '...' : user.bio) : 'N/A'}`);
      console.log(`🖼️ Profile Image: ${user.profile_image ? 'Yes' : 'No'}`);
      console.log(`📅 Created: ${new Date(user.created_at).toLocaleString()}`);
    });

    console.log('\n' + '='.repeat(80));
    
    // Summary statistics
    const roleStats = users.reduce((acc, user) => {
      acc[user.role || 'unknown'] = (acc[user.role || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    
    const adminCount = users.filter(user => user.is_admin).length;
    const verifiedCount = users.filter(user => user.verification_status === 'approved').length;
    const availableCount = users.filter(user => user.is_available).length;
    
    console.log('\n📈 SUMMARY STATISTICS');
    console.log('─'.repeat(40));
    console.log(`👥 Total Users: ${users.length}`);
    console.log(`👑 Admins: ${adminCount}`);
    console.log(`✅ Verified: ${verifiedCount}`);
    console.log(`🟢 Available: ${availableCount}`);
    console.log('\n🎭 Role Distribution:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ User fetch completed successfully!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the function
fetchAllUsers();
