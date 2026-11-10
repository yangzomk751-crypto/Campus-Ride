const tripModel = require('../models/tripModel');
const requestModel = require('../models/requestModel');
const notificationModel = require('../models/notificationModel');
const verificationModel = require('../models/verificationModel');
const vehicleModel = require('../models/vehicleModel');

const dashboardController = {
  async getDashboard(req, res) {
    const user = req.session.user;

    try {
      // 1. Fetch upcoming confirmed rides for this user as passenger
      const userRequests = await requestModel.getByPassenger(user.id);
      const upcomingConfirmedRides = userRequests.filter(
        (r) => r.request_status === 'Accepted' && (r.travel_date.toISOString().split('T')[0] >= new Date().toISOString().split('T')[0])
      );
      const recentRequests = userRequests.slice(0, 5);

      // 2. If user is driver, fetch upcoming published trips
      let driverUpcomingTrips = [];
      let pendingRequestsCount = 0;
      let isVerifiedDriver = false;

      if (user.role === 'driver' || user.role === 'admin') {
        const allDriverTrips = await tripModel.getByDriver(user.id);
        const today = new Date().toISOString().split('T')[0];
        driverUpcomingTrips = allDriverTrips.filter(
          (t) => t.travel_date.toISOString().split('T')[0] >= today && t.trip_status === 'Scheduled'
        );
        pendingRequestsCount = allDriverTrips.reduce((acc, t) => acc + (t.pending_requests_count || 0), 0);
        isVerifiedDriver = await verificationModel.isDriverVerified(user.id);
      }

      // 3. Recommended trips (including Campus Bus schedules)
      const recommendedTrips = await tripModel.findAvailableTrips();

      // 4. Notifications preview
      const notifications = await notificationModel.getByUser(user.id, 5);

      res.render('dashboard/student', {
        title: 'Student Dashboard | Campus Ride',
        upcomingConfirmedRides,
        recentRequests,
        driverUpcomingTrips,
        pendingRequestsCount,
        isVerifiedDriver,
        recommendedTrips: recommendedTrips.slice(0, 4),
        notifications,
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      req.flash('error_msg', 'Failed to load dashboard data.');
      res.render('dashboard/student', {
        title: 'Student Dashboard | Campus Ride',
        upcomingConfirmedRides: [],
        recentRequests: [],
        driverUpcomingTrips: [],
        pendingRequestsCount: 0,
        isVerifiedDriver: false,
        recommendedTrips: [],
        notifications: [],
      });
    }
  },

  async getMyTrips(req, res) {
    const driverId = req.session.user.id;
    try {
      const trips = await tripModel.getByDriver(driverId);

      // For each trip, load its pending and accepted requests
      const tripsWithDetails = await Promise.all(
        trips.map(async (trip) => {
          const requests = await requestModel.getByTrip(trip.trip_id);
          const accepted = requests.filter((r) => r.request_status === 'Accepted');
          const pending = requests.filter((r) => r.request_status === 'Pending');
          return {
            ...trip,
            requests,
            accepted,
            pending,
          };
        })
      );

      const isVerified = await verificationModel.isDriverVerified(driverId);

      res.render('trips/myTrips', {
        title: 'My Published Trips | Campus Ride',
        trips: tripsWithDetails,
        isVerified,
      });
    } catch (err) {
      console.error('My trips error:', err);
      req.flash('error_msg', 'Failed to load your published trips.');
      res.redirect('/dashboard');
    }
  },
};

module.exports = dashboardController;
