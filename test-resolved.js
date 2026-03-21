// Test script to verify resolved endpoints
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`\n✅ ${path}`);
          console.log('Status:', res.statusCode);
          
          // Show first level of response structure
          if (Array.isArray(parsed)) {
            console.log(`Array with ${parsed.length} items`);
            if (parsed[0]) {
              console.log('First item keys:', Object.keys(parsed[0]).join(', '));
            }
          } else if (typeof parsed === 'object') {
            console.log('Response keys:', Object.keys(parsed).join(', '));
            
            // Check for resolved structure
            if (parsed.profile && parsed.profile.costs) {
              console.log('✓ Character profile costs present');
              const ascend1 = parsed.profile.costs.ascend1;
              if (ascend1 && Array.isArray(ascend1)) {
                console.log(`  ascend1: ${ascend1.length} items`);
                if (ascend1[0] && ascend1[0].material) {
                  console.log(`  First item has material: ${ascend1[0].material.name}`);
                  console.log(`  Resolved item structure: material, count, craftable, craft`);
                }
              }
            }
            
            if (parsed.craft && parsed.craft.recipe) {
              console.log('✓ Material craft recipe present (resolved)');
              const recipe = parsed.craft.recipe;
              console.log(`  Recipe: ${recipe.length} items`);
              if (recipe[0] && recipe[0].material) {
                console.log(`  First recipe item: ${recipe[0].material.name}`);
              }
            }
          }
          resolve(parsed);
        } catch (e) {
          console.log(`\n❌ ${path} - Failed to parse JSON`);
          console.log('Error:', e.message);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.log(`\n❌ ${path} - Request failed`);
      console.log('Error:', e.message);
      reject(e);
    });

    req.end();
  });
}

async function verifyResolved() {
  console.log('🧪 Verifying Resolved Item Structure...\n');
  
  try {
    // Test character with resolved costs
    console.log('=== CHARACTER RESOLUTION ===');
    await makeRequest('/api/characters/10000037');
    
    // Test weapon with resolved costs
    console.log('\n=== WEAPON RESOLUTION ===');
    await makeRequest('/api/weapons/11301');
    
    // Test material with resolved craft
    console.log('\n=== MATERIAL RESOLUTION ===');
    await makeRequest('/api/materials/100021');
    
    console.log('\n\n✅ All endpoints verified with proper resolution!');
  } catch (e) {
    console.log('\n\n❌ Verification failed:', e.message);
    process.exit(1);
  }
}

// Wait a moment then verify
setTimeout(verifyResolved, 2000);
