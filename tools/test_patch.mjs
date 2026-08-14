const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s";

async function testPatch() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty?id=eq.8fe1f66d-1338-4971-87b5-67351f4bf4a8`, {
    method: 'PATCH',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      office_location: 'JC Bose Block'
    })
  });

  console.log('PATCH Status:', res.status);
  const data = await res.json();
  console.log('Result:', data);
}

testPatch();
