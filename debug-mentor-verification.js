// Debug script to check mentor verification issues
const { createClient } = require('@supabase/supabase-js');

// You'll need to add your actual Supabase URL and anon key here
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugMentorVerifications() {
    try {
        console.log('🔍 Checking mentor verifications table...\n');

        // Check total count
        const { data: allVerifications, error: countError } = await supabase
            .from('mentor_verifications')
            .select('*');

        if (countError) {
            console.error('Error fetching verifications:', countError);
            return;
        }

        console.log(`📊 Total mentor verifications: ${allVerifications?.length || 0}`);

        if (allVerifications && allVerifications.length > 0) {
            // Group by user_id to find duplicates
            const userIdCounts = {};
            allVerifications.forEach(verification => {
                const userId = verification.user_id;
                userIdCounts[userId] = (userIdCounts[userId] || 0) + 1;
            });

            console.log('\n🔍 Checking for duplicate user_id entries...');
            const duplicates = Object.entries(userIdCounts).filter(([userId, count]) => count > 1);

            if (duplicates.length > 0) {
                console.log('⚠️  Found duplicate user_id entries:');
                duplicates.forEach(([userId, count]) => {
                    console.log(`  User ID: ${userId}, Count: ${count}`);
                });

                // Show details of duplicate records
                console.log('\n📝 Details of duplicate records:');
                for (const [userId, count] of duplicates) {
                    const userRecords = allVerifications.filter(v => v.user_id === userId);
                    console.log(`\nUser ${userId}:`);
                    userRecords.forEach((record, index) => {
                        console.log(`  Record ${index + 1}:`);
                        console.log(`    ID: ${record.id}`);
                        console.log(`    Status: ${record.status}`);
                        console.log(`    Submitted: ${record.submitted_at}`);
                        console.log(`    Reviewed: ${record.reviewed_at}`);
                    });
                }
            } else {
                console.log('✅ No duplicate user_id entries found');
            }

            // Check status distribution
            const statusCounts = {};
            allVerifications.forEach(verification => {
                const status = verification.status || 'null';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });

            console.log('\n📈 Status distribution:');
            Object.entries(statusCounts).forEach(([status, count]) => {
                console.log(`  ${status}: ${count}`);
            });
        }

        // Test a specific user query that might be causing the issue
        console.log('\n🧪 Testing query patterns...');

        // Test maybeSingle vs single
        const testUserId = allVerifications?.[0]?.user_id;
        if (testUserId) {
            console.log(`Testing with user ID: ${testUserId}`);

            try {
                const { data: singleResult, error: singleError } = await supabase
                    .from('mentor_verifications')
                    .select('*')
                    .eq('user_id', testUserId)
                    .single();

                console.log('✅ .single() query succeeded');
            } catch (error) {
                console.log('❌ .single() query failed:', error.message);
            }

            try {
                const { data: maybeSingleResult, error: maybeSingleError } = await supabase
                    .from('mentor_verifications')
                    .select('*')
                    .eq('user_id', testUserId)
                    .maybeSingle();

                console.log('✅ .maybeSingle() query succeeded');
            } catch (error) {
                console.log('❌ .maybeSingle() query failed:', error.message);
            }
        }

    } catch (error) {
        console.error('Debug script error:', error);
    }
}

console.log('🚀 Starting mentor verification debug...');
console.log('⚠️  Make sure to update the Supabase URL and key in this script first!\n');

// Uncomment the line below after adding your Supabase credentials
// debugMentorVerifications();

console.log('\n💡 To run this debug script:');
console.log('1. Add your Supabase URL and anon key to the variables at the top');
console.log('2. Uncomment the debugMentorVerifications() call');
console.log('3. Run: node debug-mentor-verification.js');
