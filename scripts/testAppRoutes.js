const http = require('http');
const app = require('../app');

async function testHttpRoutes() {
  console.log('========================================================');
  console.log('🌐 TESTING EXPRESS HTTP ROUTES & EJS RENDERING');
  console.log('========================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(3099, '127.0.0.1', resolve));
  console.log('Test HTTP server listening on http://127.0.0.1:3099');

  const routesToTest = [
    { path: '/', expectedCode: 200, name: 'Home Page' },
    { path: '/about', expectedCode: 200, name: 'About Page' },
    { path: '/services', expectedCode: 200, name: 'Services Page' },
    { path: '/fare-chart', expectedCode: 200, name: '20 Dzongkhags Fare Chart' },
    { path: '/contact', expectedCode: 200, name: 'Contact Page' },
    { path: '/login', expectedCode: 200, name: 'Login Page' },
    { path: '/register', expectedCode: 200, name: 'Register Page' },
    { path: '/dashboard', expectedCode: 302, name: 'Protected Dashboard (Redirects to Login)' },
    { path: '/weekday-rides', expectedCode: 302, name: 'Protected Weekday Rides (Redirects to Login)' },
    { path: '/book-taxi', expectedCode: 302, name: 'Protected Taxi Booking (Redirects to Login)' },
    { path: '/book-bus', expectedCode: 302, name: 'Protected Bus Booking (Redirects to Login)' },
    { path: '/admin', expectedCode: 302, name: 'Protected Admin Console (Redirects to Login)' },
    { path: '/driver', expectedCode: 302, name: 'Protected Driver Console (Redirects to Login)' },
    { path: '/non-existent-page', expectedCode: 404, name: '404 Error Page' },
  ];

  let passed = 0;

  for (const route of routesToTest) {
    await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:3099${route.path}`, (res) => {
        if (res.statusCode === route.expectedCode) {
          console.log(`  ✅ [${res.statusCode}] ${route.name} (${route.path})`);
          passed++;
        } else {
          console.error(`  ❌ [${res.statusCode} != ${route.expectedCode}] ${route.name} (${route.path})`);
        }
        res.resume();
        resolve();
      }).on('error', reject);
    });
  }

  server.close();
  console.log(`\n🎉 HTTP Route Test Complete: ${passed}/${routesToTest.length} Routes Verified!`);
  process.exit(passed === routesToTest.length ? 0 : 1);
}

testHttpRoutes().catch((err) => {
  console.error('HTTP test error:', err);
  process.exit(1);
});
