// Test-Script für Stripe Integration
const fetch = require('node-fetch');

async function testStripeIntegration() {
  console.log('🧪 Testing Stripe Integration...\n');

  // Test 1: Business Monthly
  console.log('1️⃣ Testing Business Monthly (should be 19€)');
  try {
    const response1 = await fetch('http://localhost:5000/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token' // Das wird sowieso rejected
      },
      body: JSON.stringify({
        plan: 'business',
        billing: 'monthly'
      })
    });

    const result1 = await response1.json();
    console.log('Response:', result1);
  } catch (err) {
    console.log('Error (expected):', err.message);
  }

  console.log('\n2️⃣ Testing Business Yearly (should be 190€)');
  try {
    const response2 = await fetch('http://localhost:5000/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        plan: 'business',
        billing: 'yearly'
      })
    });

    const result2 = await response2.json();
    console.log('Response:', result2);
  } catch (err) {
    console.log('Error (expected):', err.message);
  }

  console.log('\n3️⃣ Testing Premium Monthly (should be 29€)');
  try {
    const response3 = await fetch('http://localhost:5000/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify({
        plan: 'premium',
        billing: 'monthly'
      })
    });

    const result3 = await response3.json();
    console.log('Response:', result3);
  } catch (err) {
    console.log('Error (expected):', err.message);
  }

  console.log('\n✅ Test completed! Check backend logs for debug output.');
}

testStripeIntegration();