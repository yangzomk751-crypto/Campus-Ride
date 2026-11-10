const bookingModel = require('../models/bookingModel');
const driverModel = require('../models/driverModel');
const vehicleModel = require('../models/vehicleModel');
const userModel = require('../models/userModel');
const fareRateModel = require('../models/fareRateModel');
const paymentModel = require('../models/paymentModel');
const notificationModel = require('../models/notificationModel');

const adminController = {
  // 1. DASHBOARD OVERVIEW
  async getDashboard(req, res) {
    try {
      const stats = await bookingModel.getPlatformStats();
      const userStats = await userModel.getPlatformStats();
      const paymentStats = await paymentModel.getSummaryStats();
      const allDrivers = await driverModel.getAll();
      const allVehicles = await vehicleModel.getAll();

      const pendingQuotations = await bookingModel.getAllBookings({ status: 'Pending' });
      const quotationRequests = pendingQuotations.filter((b) => b.quotation_status === 'Pending Admin Quotation');

      const recentBookings = await bookingModel.getAllBookings({ limit: 8 });

      res.render('admin/dashboard', {
        title: 'Admin Operations Console | Sherubtse Campus Ride',
        stats,
        userStats,
        paymentStats,
        totalDrivers: allDrivers.length,
        pendingDriversCount: allDrivers.filter((d) => d.verification_status === 'Pending').length,
        totalVehicles: allVehicles.length,
        quotationRequestsCount: quotationRequests.length,
        recentBookings,
      });
    } catch (err) {
      console.error('Admin dashboard error:', err);
      req.flash('error_msg', 'Could not load admin dashboard: ' + err.message);
      res.redirect('/dashboard');
    }
  },

  // 2. MANAGE PASSENGERS
  async getPassengers(req, res) {
    try {
      const passengers = await userModel.getAllPassengers();
      res.render('admin/passengers', {
        title: 'Manage Passengers | Sherubtse Campus Ride',
        passengers,
      });
    } catch (err) {
      console.error('Manage passengers error:', err);
      req.flash('error_msg', 'Could not load passenger list.');
      res.redirect('/admin');
    }
  },

  async postTogglePassengerStatus(req, res) {
    try {
      const userId = parseInt(req.params.id, 10);
      const user = await userModel.findById(userId);
      if (!user) {
        req.flash('error_msg', 'User not found.');
        return res.redirect('/admin/passengers');
      }

      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await userModel.updateStatus(userId, newStatus);

      req.flash('success_msg', `Passenger ${user.full_name} status updated to: ${newStatus}`);
      res.redirect('/admin/passengers');
    } catch (err) {
      console.error('Toggle status error:', err);
      req.flash('error_msg', 'Failed to update status.');
      res.redirect('/admin/passengers');
    }
  },

  // 3. MANAGE DRIVERS & VERIFICATION
  async getDrivers(req, res) {
    try {
      const drivers = await driverModel.getAll();
      const vehicles = await vehicleModel.getAll();
      res.render('admin/drivers', {
        title: 'Manage Drivers & Fleet | Sherubtse Campus Ride',
        drivers,
        vehicles,
      });
    } catch (err) {
      console.error('Manage drivers error:', err);
      req.flash('error_msg', 'Could not load drivers.');
      res.redirect('/admin');
    }
  },

  async postVerifyDriver(req, res) {
    try {
      const driverId = parseInt(req.params.id, 10);
      const { verificationStatus } = req.body;

      const validStatuses = ['Approved', 'Rejected', 'Deactivated', 'Pending'];
      if (!validStatuses.includes(verificationStatus)) {
        req.flash('error_msg', 'Invalid verification status.');
        return res.redirect('/admin/drivers');
      }

      const driver = await driverModel.getById(driverId);
      if (!driver) {
        req.flash('error_msg', 'Driver not found.');
        return res.redirect('/admin/drivers');
      }

      await driverModel.updateVerificationStatus(driverId, verificationStatus);

      // Notify driver
      await notificationModel.create({
        userId: driver.user_id,
        title: `Driver Verification: ${verificationStatus}`,
        message: `Your driver verification has been updated to "${verificationStatus}". ${verificationStatus === 'Approved' ? 'You are now authorized to accept rides on campus!' : ''}`,
        link: '/driver',
      });

      req.flash('success_msg', `Driver ${driver.full_name} updated to "${verificationStatus}".`);
      res.redirect('/admin/drivers');
    } catch (err) {
      console.error('Driver verify error:', err);
      req.flash('error_msg', 'Failed to update driver status.');
      res.redirect('/admin/drivers');
    }
  },

  // 4. MANAGE VEHICLES
  async getVehicles(req, res) {
    try {
      const vehicles = await vehicleModel.getAll();
      const drivers = await driverModel.getAll();
      res.render('admin/vehicles', {
        title: 'Manage Vehicles | Sherubtse Campus Ride',
        vehicles,
        drivers,
      });
    } catch (err) {
      console.error('Manage vehicles error:', err);
      req.flash('error_msg', 'Could not load vehicles.');
      res.redirect('/admin');
    }
  },

  async postAddVehicle(req, res) {
    try {
      const { registrationNumber, vehicleModel: modelName, vehicleType, capacity, description, driverId } = req.body;

      if (!registrationNumber || !modelName || !vehicleType || !capacity) {
        req.flash('error_msg', 'Please provide registration number, model, type, and passenger capacity.');
        return res.redirect('/admin/vehicles');
      }

      await vehicleModel.create({
        registrationNumber,
        vehicleModel: modelName,
        vehicleType,
        capacity: parseInt(capacity, 10),
        description,
        driverId: driverId ? parseInt(driverId, 10) : null,
      });

      req.flash('success_msg', `Vehicle ${registrationNumber} added successfully.`);
      res.redirect('/admin/vehicles');
    } catch (err) {
      console.error('Add vehicle error:', err);
      req.flash('error_msg', 'Failed to add vehicle: ' + err.message);
      res.redirect('/admin/vehicles');
    }
  },

  async postUpdateVehicleStatus(req, res) {
    try {
      const vehicleId = parseInt(req.params.id, 10);
      const { availabilityStatus } = req.body;

      await vehicleModel.updateStatus(vehicleId, availabilityStatus);
      req.flash('success_msg', 'Vehicle status updated.');
      res.redirect('/admin/vehicles');
    } catch (err) {
      console.error('Vehicle status error:', err);
      req.flash('error_msg', 'Failed to update vehicle status.');
      res.redirect('/admin/vehicles');
    }
  },

  // 5. MANAGE BOOKINGS (OVERVIEW & FILTERS)
  async getBookings(req, res) {
    try {
      const { status, type, date } = req.query;
      const bookings = await bookingModel.getAllBookings({ status, type, date });
      const stats = await bookingModel.getPlatformStats();

      res.render('admin/bookings', {
        title: 'Manage Bookings | Sherubtse Campus Ride',
        bookings,
        stats,
        filters: { status: status || 'all', type: type || 'all', date: date || '' },
      });
    } catch (err) {
      console.error('Admin bookings error:', err);
      req.flash('error_msg', 'Could not load bookings.');
      res.redirect('/admin');
    }
  },

  // 6. MANAGE WEEKDAY RIDES
  async getWeekdayRides(req, res) {
    try {
      const weekdayBookings = await bookingModel.getAllBookings({ type: 'Weekday Ride' });
      const availableDrivers = await driverModel.getAvailableWeekdayDrivers();

      res.render('admin/weekdayRides', {
        title: 'Manage Weekday Rides | Sherubtse Campus Ride',
        bookings: weekdayBookings,
        availableDrivers,
      });
    } catch (err) {
      console.error('Admin weekday rides error:', err);
      req.flash('error_msg', 'Could not load weekday rides.');
      res.redirect('/admin');
    }
  },

  // 7. MANAGE TAXI REQUESTS
  async getTaxiRequests(req, res) {
    try {
      const taxiBookings = await bookingModel.getAllBookings({ type: 'Taxi' });
      res.render('admin/taxiRequests', {
        title: 'Manage Taxi Bookings | Sherubtse Campus Ride',
        bookings: taxiBookings,
      });
    } catch (err) {
      console.error('Admin taxi requests error:', err);
      req.flash('error_msg', 'Could not load taxi bookings.');
      res.redirect('/admin');
    }
  },

  // 8. MANAGE BUS REQUESTS (Review, Quotation & Assignment)
  async getBusRequests(req, res) {
    try {
      const busBookings = await bookingModel.getAllBookings({ type: 'Bus' });
      const availableBuses = await vehicleModel.getAvailableVehicles('Bus');
      const approvedDrivers = await driverModel.getAvailableDrivers();

      res.render('admin/busRequests', {
        title: 'Manage Campus Bus Requests | Sherubtse Campus Ride',
        bookings: busBookings,
        availableBuses,
        approvedDrivers,
      });
    } catch (err) {
      console.error('Admin bus requests error:', err);
      req.flash('error_msg', 'Could not load bus requests.');
      res.redirect('/admin');
    }
  },

  async postAssignBus(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const { driverId, vehicleId, adminNotes } = req.body;

      if (!driverId || !vehicleId) {
        req.flash('error_msg', 'Please select both an available driver and a college bus.');
        return res.redirect('/admin/bus-requests');
      }

      const booking = await bookingModel.getById(bookingId);
      if (!booking) {
        req.flash('error_msg', 'Booking not found.');
        return res.redirect('/admin/bus-requests');
      }

      await bookingModel.assignDriverAndVehicle(
        bookingId,
        parseInt(driverId, 10),
        parseInt(vehicleId, 10),
        adminNotes || 'Assigned by Transport Office'
      );

      const driver = await driverModel.getById(parseInt(driverId, 10));
      const vehicle = await vehicleModel.getById(parseInt(vehicleId, 10));

      // Notify passenger
      await notificationModel.create({
        userId: booking.user_id,
        bookingId: booking.booking_id,
        title: 'Bus Reservation Confirmed!',
        message: `Your bus reservation #${booking.booking_id} for ${booking.destination} is Confirmed. Bus: ${vehicle.vehicle_model} (${vehicle.registration_number}), Driver: ${driver.full_name} (${driver.phone}).`,
        link: `/bookings/${booking.booking_id}`,
      });

      // Notify driver
      await notificationModel.create({
        userId: driver.user_id,
        bookingId: booking.booking_id,
        title: 'New Bus Trip Assignment',
        message: `You have been assigned to drive College Bus (${vehicle.registration_number}) for Group Trip #${booking.booking_id} to ${booking.destination} on ${booking.travel_date}.`,
        link: '/driver/bus-trips',
      });

      req.flash('success_msg', `Bus booking #${bookingId} confirmed! Driver and bus successfully assigned.`);
      res.redirect('/admin/bus-requests');
    } catch (err) {
      console.error('Assign bus error:', err);
      req.flash('error_msg', err.message || 'Failed to assign bus and driver.');
      res.redirect('/admin/bus-requests');
    }
  },

  // 9. CUSTOM FARE QUOTATIONS (Bus & Unlisted Taxis)
  async getCustomQuotations(req, res) {
    try {
      const allBookings = await bookingModel.getAllBookings();
      const quotationRequests = allBookings.filter(
        (b) => b.quotation_status === 'Pending Admin Quotation' || b.quotation_status === 'Quoted'
      );

      res.render('admin/quotations', {
        title: 'Custom Fare Quotations | Sherubtse Campus Ride',
        requests: quotationRequests,
      });
    } catch (err) {
      console.error('Quotations view error:', err);
      req.flash('error_msg', 'Could not load quotation requests.');
      res.redirect('/admin');
    }
  },

  async postQuoteFare(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const { quotedFare, adminNotes } = req.body;

      if (!quotedFare || parseFloat(quotedFare) <= 0) {
        req.flash('error_msg', 'Please enter a valid quotation amount (Nu.).');
        return res.redirect('/admin/quotations');
      }

      const booking = await bookingModel.provideQuotation(bookingId, quotedFare, adminNotes || 'Admin quotation provided');

      // Notify passenger
      await notificationModel.create({
        userId: booking.user_id,
        bookingId: booking.booking_id,
        title: 'Fare Quotation Received',
        message: `The Transport Admin has provided a fare quotation of Nu. ${quotedFare} for your ${booking.service_type} booking to ${booking.destination}. Please review and Accept or Decline.`,
        link: `/bookings/${booking.booking_id}`,
      });

      req.flash(
        'success_msg',
        `Quotation of Nu. ${quotedFare} sent to passenger for Booking #${bookingId}. Waiting for passenger acceptance.`
      );
      res.redirect('/admin/quotations');
    } catch (err) {
      console.error('Quote fare error:', err);
      req.flash('error_msg', 'Failed to submit quotation: ' + err.message);
      res.redirect('/admin/quotations');
    }
  },

  // 10. FARE CHART MANAGEMENT (All 20 Dzongkhags + Local Routes)
  async getFareChart(req, res) {
    try {
      const rates = await fareRateModel.getAll();
      res.render('admin/fareChart', {
        title: 'Fare Chart Management (20 Dzongkhags) | Sherubtse Campus Ride',
        rates,
      });
    } catch (err) {
      console.error('Fare chart admin error:', err);
      req.flash('error_msg', 'Could not load fare chart.');
      res.redirect('/admin');
    }
  },

  async postAddFareRate(req, res) {
    try {
      const { destination, busFare, taxiFare, notes } = req.body;

      if (!destination || !busFare || !taxiFare) {
        req.flash('error_msg', 'Destination name, bus fare, and taxi fare are required.');
        return res.redirect('/admin/fare-chart');
      }

      await fareRateModel.create({
        destination,
        busFare,
        taxiFare,
        notes,
      });

      req.flash('success_msg', `Fare rate for "${destination}" added successfully.`);
      res.redirect('/admin/fare-chart');
    } catch (err) {
      console.error('Add fare error:', err);
      req.flash('error_msg', 'Failed to add fare rate: ' + err.message);
      res.redirect('/admin/fare-chart');
    }
  },

  async postUpdateFareRate(req, res) {
    try {
      const rateId = parseInt(req.params.id, 10);
      const { busFare, taxiFare, notes } = req.body;

      await fareRateModel.update(rateId, { busFare, taxiFare, notes });
      req.flash('success_msg', 'Fare rate updated successfully.');
      res.redirect('/admin/fare-chart');
    } catch (err) {
      console.error('Update fare error:', err);
      req.flash('error_msg', 'Failed to update fare rate.');
      res.redirect('/admin/fare-chart');
    }
  },

  async postToggleFareRate(req, res) {
    try {
      const rateId = parseInt(req.params.id, 10);
      await fareRateModel.toggleActive(rateId);
      req.flash('success_msg', 'Fare rate status toggled.');
      res.redirect('/admin/fare-chart');
    } catch (err) {
      console.error('Toggle fare error:', err);
      req.flash('error_msg', 'Failed to toggle fare rate.');
      res.redirect('/admin/fare-chart');
    }
  },

  // 11. PAYMENT MANAGEMENT (Monitor & Mark Paid/Waived)
  async getPayments(req, res) {
    try {
      const statusFilter = req.query.status || 'all';
      const payments = await paymentModel.getAllPayments(statusFilter);
      const summary = await paymentModel.getSummaryStats();

      res.render('admin/payments', {
        title: 'Payment Management | Sherubtse Campus Ride',
        payments,
        summary,
        currentStatus: statusFilter,
      });
    } catch (err) {
      console.error('Admin payments error:', err);
      req.flash('error_msg', 'Could not load payment records.');
      res.redirect('/admin');
    }
  },

  async postUpdatePaymentStatus(req, res) {
    try {
      const paymentId = parseInt(req.params.id, 10);
      const { status, notes } = req.body;
      const adminUserId = req.session.user.id;

      await paymentModel.markStatus(paymentId, status, adminUserId, notes || `Marked as ${status} by Admin`);

      req.flash('success_msg', `Payment #${paymentId} marked as "${status}".`);
      res.redirect('/admin/payments');
    } catch (err) {
      console.error('Update payment error:', err);
      req.flash('error_msg', 'Failed to update payment status: ' + err.message);
      res.redirect('/admin/payments');
    }
  },

  // 12. REPORTS & STATISTICS
  async getReportsAndStats(req, res) {
    try {
      const bookingStats = await bookingModel.getPlatformStats();
      const paymentStats = await paymentModel.getSummaryStats();
      const userStats = await userModel.getPlatformStats();
      const allRates = await fareRateModel.getAllActive();

      res.render('admin/reportsStats', {
        title: 'Reports & Analytics | Sherubtse Campus Ride',
        bookingStats,
        paymentStats,
        userStats,
        allRates,
      });
    } catch (err) {
      console.error('Reports error:', err);
      req.flash('error_msg', 'Could not load reports.');
      res.redirect('/admin');
    }
  },

  // 13. SYSTEM SETTINGS
  async getSettings(req, res) {
    res.render('admin/settings', {
      title: 'System Settings | Sherubtse Campus Ride',
      systemInfo: {
        collegeName: 'Sherubtse College, Royal University of Bhutan',
        location: 'Kanglung, Trashigang, Bhutan',
        operatingDays: 'Monday to Friday (Weekday Rides) & Daily (Taxi/Bus)',
        fixedWeekdayFare: 'Nu. 100',
        supportedDzongkhags: 20,
        paymentMode: 'Cash (Recorded upon journey completion)',
      },
    });
  },
};

module.exports = adminController;
