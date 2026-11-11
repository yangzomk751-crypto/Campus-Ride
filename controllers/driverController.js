const driverModel = require('../models/driverModel');
const bookingModel = require('../models/bookingModel');
const paymentModel = require('../models/paymentModel');
const notificationModel = require('../models/notificationModel');

const driverController = {
  // 1. DRIVER DASHBOARD OVERVIEW
  async getDashboard(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);

      if (!driver) {
        req.flash('error_msg', 'No driver record associated with your account. Contact the administrator.');
        return res.redirect('/');
      }

      const isVerified = driver.verification_status === 'Approved';

      // Incoming requests
      const incomingRequests = isVerified ? await bookingModel.getIncomingDriverRequests(driver.driver_id) : [];

      // Active / Upcoming trips
      const upcomingTrips = await bookingModel.getDriverTrips(driver.driver_id, 'upcoming');

      // Assigned bus trips
      const assignedBuses = await bookingModel.getDriverTrips(driver.driver_id, 'bus');

      // Completed trips
      const completedTrips = await bookingModel.getDriverTrips(driver.driver_id, 'completed');

      // Cash payments
      const payments = await paymentModel.getDriverPayments(driver.driver_id);
      const pendingCashPayments = payments.filter((p) => p.payment_status === 'Pending');

      res.render('driver/dashboard', {
        title: 'Driver Console | Sherubtse Campus Ride',
        driver,
        isVerified,
        incomingRequests: incomingRequests.slice(0, 5),
        incomingCount: incomingRequests.length,
        upcomingTrips: upcomingTrips.slice(0, 5),
        upcomingCount: upcomingTrips.length,
        assignedBuses: assignedBuses.slice(0, 5),
        assignedBusCount: assignedBuses.length,
        completedCount: completedTrips.length,
        pendingPaymentsCount: pendingCashPayments.length,
        payments: payments.slice(0, 5),
      });
    } catch (err) {
      console.error('Driver dashboard error:', err);
      req.flash('error_msg', 'Could not load driver dashboard.');
      res.redirect('/');
    }
  },

  // 2. TOGGLE AVAILABILITY
  async postToggleAvailability(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/driver');

      if (driver.verification_status !== 'Approved') {
        req.flash('error_msg', 'Your account is not yet verified by the Transport Admin.');
        return res.redirect('/driver');
      }

      const newStatus = driver.availability_status === 'Available' ? 'Unavailable' : 'Available';
      await driverModel.updateAvailability(driver.driver_id, newStatus);

      req.flash('success_msg', `General availability updated to: ${newStatus}`);
      res.redirect('/driver');
    } catch (err) {
      console.error('Toggle availability error:', err);
      req.flash('error_msg', 'Failed to update availability.');
      res.redirect('/driver');
    }
  },

  // 3. TOGGLE WEEKDAY RIDES AVAILABILITY (Hostel ⇄ Academic Block)
  async postToggleWeekdayAvailability(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/driver');

      if (driver.verification_status !== 'Approved') {
        req.flash('error_msg', 'Only verified drivers can offer weekday rides.');
        return res.redirect('/driver');
      }

      const newWeekday = !driver.weekday_available;
      await driverModel.updateWeekdayAvailability(driver.driver_id, newWeekday);

      req.flash(
        'success_msg',
        `Weekday Hostel ⇄ Classroom rides set to: ${newWeekday ? 'Available' : 'Unavailable'}`
      );
      res.redirect('/driver');
    } catch (err) {
      console.error('Toggle weekday error:', err);
      req.flash('error_msg', 'Failed to update weekday availability.');
      res.redirect('/driver');
    }
  },

  // 4. INCOMING RIDE REQUESTS (Accept / Reject)
  async getIncomingRequests(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/');

      const isVerified = driver.verification_status === 'Approved';
      const requests = isVerified ? await bookingModel.getIncomingDriverRequests(driver.driver_id) : [];

      res.render('driver/requests', {
        title: 'Incoming Ride Requests | Sherubtse Campus Ride',
        driver,
        isVerified,
        requests,
      });
    } catch (err) {
      console.error('Incoming requests error:', err);
      req.flash('error_msg', 'Could not load incoming requests.');
      res.redirect('/driver');
    }
  },

  async postAcceptRequest(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/');

      if (driver.verification_status !== 'Approved') {
        req.flash('error_msg', 'You must be approved by the Admin before accepting rides.');
        return res.redirect('/driver');
      }

      const bookingId = parseInt(req.params.id, 10);
      const booking = await bookingModel.acceptDriverRequest(bookingId, driver.driver_id, driver.vehicle_id);

      // Notify passenger
      await notificationModel.create({
        userId: booking.user_id,
        bookingId: booking.booking_id,
        title: 'Ride Request Accepted!',
        message: `Driver ${req.session.user.fullName} accepted your ${booking.service_type} booking (#${booking.booking_id}). Vehicle: ${driver.vehicle_model} (${driver.registration_number}).`,
        link: `/bookings/${booking.booking_id}`,
      });

      req.flash('success_msg', `Booking #${bookingId} accepted! You are now assigned to this trip.`);
      res.redirect('/driver/trips');
    } catch (err) {
      console.error('Accept request error:', err);
      req.flash('error_msg', err.message || 'Could not accept ride request.');
      res.redirect('/driver/requests');
    }
  },

  async postRejectRequest(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/');

      const bookingId = parseInt(req.params.id, 10);
      const { rejectionReason } = req.body;

      await bookingModel.rejectDriverRequest(bookingId, driver.driver_id, rejectionReason || 'Driver declined');

      req.flash('info_msg', `Booking request #${bookingId} declined.`);
      res.redirect('/driver/requests');
    } catch (err) {
      console.error('Reject request error:', err);
      req.flash('error_msg', 'Failed to decline request: ' + err.message);
      res.redirect('/driver/requests');
    }
  },

  // 5. UPCOMING TRIPS & ALL DRIVER TRIPS
  async getDriverTrips(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/');

      const filter = req.query.filter || 'upcoming';
      const trips = await bookingModel.getDriverTrips(driver.driver_id, filter);

      res.render('driver/trips', {
        title: 'Driver Trips & Schedule | Sherubtse Campus Ride',
        driver,
        trips,
        currentFilter: filter,
      });
    } catch (err) {
      console.error('Driver trips error:', err);
      req.flash('error_msg', 'Could not load trips.');
      res.redirect('/driver');
    }
  },

  // 6. ASSIGNED BUS TRIPS
  async getAssignedBusTrips(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/');

      const busTrips = await bookingModel.getDriverTrips(driver.driver_id, 'bus');

      res.render('driver/busTrips', {
        title: 'Assigned Campus Bus Trips | Sherubtse Campus Ride',
        driver,
        trips: busTrips,
      });
    } catch (err) {
      console.error('Bus trips view error:', err);
      req.flash('error_msg', 'Could not load assigned bus trips.');
      res.redirect('/driver');
    }
  },

  // 7. UPDATE TRIP STATUS (In Progress / Completed)
  async postUpdateTripStatus(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/');

      const bookingId = parseInt(req.params.id, 10);
      const { status } = req.body;

      const validStatuses = ['In Progress', 'Completed'];
      if (!validStatuses.includes(status)) {
        req.flash('error_msg', 'Invalid trip status.');
        return res.redirect('/driver/trips');
      }

      const booking = await bookingModel.getById(bookingId);
      if (!booking || booking.assigned_driver_id !== driver.driver_id) {
        req.flash('error_msg', 'Booking not found or not assigned to you.');
        return res.redirect('/driver/trips');
      }

      await bookingModel.updateStatus(bookingId, status);

      // Notify passenger
      await notificationModel.create({
        userId: booking.user_id,
        bookingId: booking.booking_id,
        title: `Trip Status: ${status}`,
        message: `Your trip with Driver ${driver.full_name} is now ${status}. ${status === 'Completed' ? 'Please pay the fare in cash to the driver.' : ''}`,
        link: `/bookings/${booking.booking_id}`,
      });

      req.flash('success_msg', `Trip #${bookingId} status updated to: ${status}`);
      res.redirect('/driver/trips');
    } catch (err) {
      console.error('Update trip status error:', err);
      req.flash('error_msg', 'Failed to update status: ' + err.message);
      res.redirect('/driver/trips');
    }
  },

  // 8. RECORD CASH PAYMENT RECEIVED FROM PASSENGER
  async postRecordPayment(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/');

      const bookingId = parseInt(req.params.id, 10);
      const { notes } = req.body;

      const booking = await bookingModel.getById(bookingId);
      if (!booking || booking.assigned_driver_id !== driver.driver_id) {
        req.flash('error_msg', 'Booking not found or unauthorized.');
        return res.redirect('/driver');
      }

      await paymentModel.recordCashPayment(bookingId, userId, notes || 'Cash received by driver upon trip completion');

      // Notify passenger
      await notificationModel.create({
        userId: booking.user_id,
        bookingId: booking.booking_id,
        title: 'Cash Payment Recorded',
        message: `Driver ${driver.full_name} confirmed cash payment of Nu. ${booking.total_fare} for Booking #${booking.booking_id}.`,
        link: `/bookings/${booking.booking_id}`,
      });

      req.flash('success_msg', `Cash payment for Booking #${bookingId} marked as Paid!`);
      res.redirect('/driver/payments');
    } catch (err) {
      console.error('Record payment error:', err);
      req.flash('error_msg', 'Failed to record payment: ' + err.message);
      res.redirect('/driver');
    }
  },

  // 9. PAYMENT RECORDS FOR DRIVER
  async getPaymentRecords(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/');

      const payments = await paymentModel.getDriverPayments(driver.driver_id);

      res.render('driver/payments', {
        title: 'Payment Records | Sherubtse Campus Ride',
        driver,
        payments,
      });
    } catch (err) {
      console.error('Driver payments view error:', err);
      req.flash('error_msg', 'Could not load payment records.');
      res.redirect('/driver');
    }
  },

  // 10. VEHICLE INFORMATION
  async getVehicleInfo(req, res) {
    try {
      const userId = req.session.user.id;
      const driver = await driverModel.getByUserId(userId);
      if (!driver) return res.redirect('/');

      res.render('driver/vehicle', {
        title: 'Vehicle Information | Sherubtse Campus Ride',
        driver,
      });
    } catch (err) {
      console.error('Vehicle view error:', err);
      req.flash('error_msg', 'Could not load vehicle info.');
      res.redirect('/driver');
    }
  },
};

module.exports = driverController;
