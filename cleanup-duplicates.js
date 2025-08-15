import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanupDuplicateConversations() {
  try {
    console.log('🔍 Fetching all conversations to identify duplicates...\n');
    
    // Fetch all conversations
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_updated', { ascending: false }); // Order by last_updated instead

    if (error) {
      console.error('❌ Error fetching conversations:', error);
      return;
    }

    if (!conversations || conversations.length === 0) {
      console.log('📝 No conversations found in database');
      return;
    }

    console.log(`📊 Total Conversations Found: ${conversations.length}\n`);

    // Group conversations by user pairs
    const conversationGroups = new Map();
    
    conversations.forEach(conv => {
      // Create a consistent key for user pairs (always put smaller ID first)
      const user1 = conv.user1_id;
      const user2 = conv.user2_id;
      const key = user1 < user2 ? `${user1}-${user2}` : `${user2}-${user1}`;
      
      if (!conversationGroups.has(key)) {
        conversationGroups.set(key, []);
      }
      conversationGroups.get(key).push(conv);
    });

    console.log(`🔗 Unique user pairs: ${conversationGroups.size}`);
    
    // Find duplicates
    const duplicateGroups = [];
    let totalDuplicates = 0;
    
    for (const [userPair, convs] of conversationGroups) {
      if (convs.length > 1) {
        duplicateGroups.push({ userPair, conversations: convs });
        totalDuplicates += convs.length - 1; // All but the first one are duplicates
      }
    }

    console.log(`🚨 Found ${duplicateGroups.length} user pairs with duplicate conversations`);
    console.log(`🗑️ Total duplicate conversations to remove: ${totalDuplicates}\n`);

    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicate conversations found!');
      return;
    }

    // Display duplicate information
    duplicateGroups.forEach((group, index) => {
      console.log(`\n🔍 Duplicate Group #${index + 1} (${group.userPair}):`);
      group.conversations.forEach((conv, i) => {
        console.log(`  ${i === 0 ? '✅ KEEP' : '🗑️ DELETE'}: ${conv.id} (last_updated: ${conv.last_updated ? new Date(conv.last_updated).toLocaleString() : 'never'})`);
      });
    });

    // Note: In a real application, you would actually delete the duplicates here
    // For safety, we're just identifying them
    console.log('\n⚠️  NOTE: This script only identifies duplicates.');
    console.log('⚠️  The application has been updated to prevent future duplicates.');
    console.log('⚠️  Existing duplicates should be cleaned up manually or with proper admin access.');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Duplicate analysis completed!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the function
cleanupDuplicateConversations();
