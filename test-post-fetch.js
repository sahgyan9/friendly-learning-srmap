// Test script to verify the post fetching optimization
import { getCommunityPostById, getCommunityPosts } from './src/integrations/supabase/services/community-posts.js';

async function testPostFetching() {
  console.log('Testing post fetching optimization...');
  
  // First, get all posts to find a valid post ID
  console.log('1. Fetching all posts to get a test post ID...');
  const { data: allPosts, error: allPostsError } = await getCommunityPosts(1);
  
  if (allPostsError || !allPosts || allPosts.length === 0) {
    console.error('No posts found to test with:', allPostsError);
    return;
  }
  
  const testPostId = allPosts[0].id;
  console.log(`2. Found test post ID: ${testPostId}`);
  
  // Test the optimized function
  console.log('3. Testing optimized getCommunityPostById...');
  console.time('getCommunityPostById');
  const { data: singlePost, error: singlePostError } = await getCommunityPostById(testPostId);
  console.timeEnd('getCommunityPostById');
  
  if (singlePostError) {
    console.error('Error fetching single post:', singlePostError);
    return;
  }
  
  console.log('✅ Successfully fetched single post:', {
    id: singlePost.id,
    title: singlePost.title,
    mentor: singlePost.mentor.name
  });
  
  // Test the old method for comparison
  console.log('4. Testing old method (getCommunityPosts + filter) for comparison...');
  console.time('getCommunityPosts + filter');
  const { data: allPostsForFilter, error: filterError } = await getCommunityPosts();
  if (!filterError && allPostsForFilter) {
    const filteredPost = allPostsForFilter.find(p => p.id === testPostId);
    console.timeEnd('getCommunityPosts + filter');
    
    if (filteredPost) {
      console.log('✅ Found post using old method:', {
        id: filteredPost.id,
        title: filteredPost.title,
        mentor: filteredPost.mentor.name
      });
    }
  }
  
  console.log('\n🚀 Optimization complete! The new method should be significantly faster.');
}

// Note: This test would need to be run in a proper Node.js environment with Supabase configured
console.log('Test script created. This demonstrates the optimization approach.');
console.log('The new getCommunityPostById function fetches only the specific post needed,');
console.log('instead of fetching ALL posts and then filtering by ID.');
