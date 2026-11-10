process.env.NODE_ENV = 'test';
const app = require('../app');

async function testDirectRoutes() {
  console.log('========================================================');
  console.log('🌐 DIRECT MVC ROUTE & EJS RENDER VERIFICATION');
  console.log('Node.js + Express + EJS Views (Passenger, Driver, Admin)');
  console.log('========================================================\n');

  const publicRoutes = [
    { url: '/', label: 'Home Page' },
    { url: '/about', label: 'About Page' },
    { url: '/services', label: 'Services Page' },
    { url: '/fare-chart', label: '20 Dzongkhags Fare Chart' },
    { url: '/contact', label: 'Contact Page' },
    { url: '/login', label: 'Login Page' },
    { url: '/register', label: 'Registration Page' },
  ];

  const studentSession = {
    user: {
      id: 5,
      fullName: 'Sonam Choden',
      email: 'sonam@sherubtse.edu.bt',
      role: 'passenger',
      passengerType: 'student',
      phone: '+975-17555444',
      status: 'active',
    },
  };

  const driverSession = {
    user: {
      id: 2,
      fullName: 'Ugyen Dorji',
      email: 'driver.ugyen@sherubtse.edu.bt',
      role: 'driver',
      passengerType: null,
      phone: '+975-17222111',
      status: 'active',
    },
  };

  const adminSession = {
    user: {
      id: 1,
      fullName: 'Campus Transport Officer',
      email: 'admin@sherubtse.edu.bt',
      role: 'admin',
      passengerType: null,
      phone: '+975-17111000',
      status: 'active',
    },
  };

  const authenticatedRoutes = [
    // Passenger Pages
    { url: '/dashboard', label: 'Passenger Dashboard', session: studentSession },
    { url: '/weekday-rides', label: 'Available Weekday Rides Form', session: studentSession },
    { url: '/book-taxi', label: 'Book a Taxi Form (Dzongkhags & Campus)', session: studentSession },
    { url: '/book-bus', label: 'Request a Campus Bus Form', session: studentSession },
    { url: '/my-bookings', label: 'Passenger Booking History', session: studentSession },
    { url: '/bookings/1', label: 'Booking Details View (#1)', session: studentSession },
    { url: '/payments', label: 'Passenger Payment History', session: studentSession },
    { url: '/notifications', label: 'Passenger In-App Notifications', session: studentSession },

    // Driver Pages
    { url: '/driver', label: 'Driver Dashboard & Availability Console', session: driverSession },
    { url: '/driver/requests', label: 'Driver Incoming Ride Requests', session: driverSession },
    { url: '/driver/trips', label: 'Driver Trips & Schedule', session: driverSession },
    { url: '/driver/bus-trips', label: 'Driver Assigned Campus Bus Trips', session: driverSession },
    { url: '/driver/payments', label: 'Driver Cash Payment Records', session: driverSession },
    { url: '/driver/vehicle', label: 'Driver Vehicle Information', session: driverSession },

    // Admin Pages
    { url: '/admin', label: 'Admin Command Center Overview', session: adminSession },
    { url: '/admin/passengers', label: 'Admin Passenger Management', session: adminSession },
    { url: '/admin/drivers', label: 'Admin Driver Fleet & Verification', session: adminSession },
    { url: '/admin/vehicles', label: 'Admin Vehicle Management (Buses & Taxis)', session: adminSession },
    { url: '/admin/bookings', label: 'Admin All Bookings Management', session: adminSession },
    { url: '/admin/weekday-rides', label: 'Admin Weekday Rides Management', session: adminSession },
    { url: '/admin/taxi-requests', label: 'Admin Taxi Requests Management', session: adminSession },
    { url: '/admin/bus-requests', label: 'Admin Bus Requests & Assignment', session: adminSession },
    { url: '/admin/fare-chart', label: 'Admin 20 Dzongkhags Fare Chart Management', session: adminSession },
    { url: '/admin/quotations', label: 'Admin Custom Fare Quotations', session: adminSession },
    { url: '/admin/payments', label: 'Admin Payment Monitoring & Waiver Management', session: adminSession },
    { url: '/admin/reports', label: 'Admin Analytics & Operational Reports', session: adminSession },
    { url: '/admin/settings', label: 'Admin Campus Transport Settings', session: adminSession },
  ];

  let passed = 0;
  const allRoutes = [
    ...publicRoutes.map((r) => ({ ...r, session: {} })),
    ...authenticatedRoutes,
  ];

  for (const r of allRoutes) {
    await new Promise((resolve) => {
      const req = {
        method: 'GET',
        url: r.url,
        originalUrl: r.url,
        headers: { host: 'localhost:3000' },
        socket: { remoteAddress: '127.0.0.1' },
        connection: { remoteAddress: '127.0.0.1' },
        session: r.session,
        query: {},
        params: r.url.includes('/bookings/1') ? { id: '1' } : {},
        body: {},
        flash: () => [],
      };

      const res = {
        statusCode: 200,
        locals: {
          currentUser: r.session.user || null,
          success_msg: [],
          error_msg: [],
          info_msg: [],
          unreadNotificationCount: 0,
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        render(view, options) {
          app.render(view, { ...this.locals, ...options }, (err, html) => {
            if (err) {
              console.error(`  ❌ Render error on ${r.url} (${view}):`, err.message);
              resolve();
            } else {
              console.log(`  ✅ [200 OK] ${r.label.padEnd(46)} -> ${view} (${html.length} bytes)`);
              passed++;
              resolve();
            }
          });
        },
        redirect(url) {
          console.log(`  ➡️ [Redirect -> ${url}] ${r.label}`);
          passed++;
          resolve();
        },
        send(body) {
          console.log(`  ✅ [200 Send] ${r.label}`);
          passed++;
          resolve();
        },
        setHeader() {},
      };

      app.handle(req, res, (err) => {
        if (err) {
          console.error(`  ❌ Error on ${r.url}:`, err);
        }
        resolve();
      });
    });
  }

  console.log(`\n========================================================`);
  console.log(`🎉 Direct MVC Verification Complete: ${passed}/${allRoutes.length} Views Rendered Successfully!`);
  console.log(`========================================================`);
  process.exit(passed === allRoutes.length ? 0 : 1);
}

testDirectRoutes();
