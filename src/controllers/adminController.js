const UserModel = require('../models/userModel');
const StopModel = require('../models/stopModel');
const RouteModel = require('../models/routeModel');
const VehicleModel = require('../models/vehicleModel');
const TripModel = require('../models/tripModel');
const BookingModel = require('../models/bookingModel');
const FeedbackModel = require('../models/feedbackModel');

const AdminController = {
  // 1. DASHBOARD
  async getDashboard(req, res) {
    try {
      const userStats = await UserModel.countStats();
      const bookingStats = await BookingModel.countStats();
      const feedbackStats = await FeedbackModel.getAverageRating();
      const recentBookings = await BookingModel.getAll({ limit: 8 });
      const recentFeedback = await FeedbackModel.getRecent(5);
      const vehicles = await VehicleModel.getAll();

      res.render('admin/dashboard', {
        title: 'Admin Command Center - Campus Ride',
        stats: {
          ...userStats,
          ...bookingStats,
          avgRating: feedbackStats.avg_rating || 'N/A',
          totalReviews: feedbackStats.total_reviews || 0,
          totalVehicles: vehicles.length,
          activeVehicles: vehicles.filter((v) => v.status === 'ACTIVE').length,
        },
        recentBookings,
        recentFeedback,
      });
    } catch (err) {
      console.error('Admin dashboard error:', err);
      req.flash('error_msg', 'Could not load admin dashboard.');
      res.redirect('/trips');
    }
  },

  // 2. STOPS MANAGEMENT
  async getStops(req, res) {
    try {
      const stops = await StopModel.getAll();
      res.render('admin/stops', {
        title: 'Manage Campus Stops - Admin',
        stops,
      });
    } catch (err) {
      req.flash('error_msg', 'Could not load stops.');
      res.redirect('/admin');
    }
  },

  async postCreateStop(req, res) {
    try {
      const { name, code, locationDescription, isActive } = req.body;
      if (!name || !code) {
        req.flash('error_msg', 'Stop name and code are required.');
        return res.redirect('/admin/stops');
      }
      await StopModel.create({
        name,
        code,
        locationDescription,
        isActive: isActive === 'on' || isActive === 'true',
      });
      req.flash('success_msg', `Stop "${name}" created successfully.`);
      res.redirect('/admin/stops');
    } catch (err) {
      console.error('Create stop error:', err);
      req.flash('error_msg', 'Failed to create stop. Code or name may already exist.');
      res.redirect('/admin/stops');
    }
  },

  async postDeleteStop(req, res) {
    try {
      const stopId = parseInt(req.params.id, 10);
      await StopModel.delete(stopId);
      req.flash('success_msg', 'Stop deleted successfully.');
      res.redirect('/admin/stops');
    } catch (err) {
      req.flash('error_msg', 'Cannot delete stop: it is currently used by one or more routes.');
      res.redirect('/admin/stops');
    }
  },

  // 3. ROUTES MANAGEMENT
  async getRoutes(req, res) {
    try {
      const routes = await RouteModel.getAll();
      const stops = await StopModel.getAll({ activeOnly: true });
      res.render('admin/routes', {
        title: 'Manage Routes - Admin',
        routes,
        stops,
      });
    } catch (err) {
      req.flash('error_msg', 'Could not load routes.');
      res.redirect('/admin');
    }
  },

  async postCreateRoute(req, res) {
    try {
      const { name, originStopId, destinationStopId, distanceKm, estimatedDurationMin, isActive } = req.body;
      if (originStopId === destinationStopId) {
        req.flash('error_msg', 'Origin and destination stops must be different.');
        return res.redirect('/admin/routes');
      }
      await RouteModel.create({
        name,
        originStopId: parseInt(originStopId, 10),
        destinationStopId: parseInt(destinationStopId, 10),
        distanceKm: parseFloat(distanceKm) || 0,
        estimatedDurationMin: parseInt(estimatedDurationMin, 10) || 15,
        isActive: isActive === 'on' || isActive === 'true',
      });
      req.flash('success_msg', `Route "${name}" created successfully.`);
      res.redirect('/admin/routes');
    } catch (err) {
      console.error('Create route error:', err);
      req.flash('error_msg', 'Failed to create route.');
      res.redirect('/admin/routes');
    }
  },

  async postDeleteRoute(req, res) {
    try {
      const routeId = parseInt(req.params.id, 10);
      await RouteModel.delete(routeId);
      req.flash('success_msg', 'Route deleted successfully.');
      res.redirect('/admin/routes');
    } catch (err) {
      req.flash('error_msg', 'Failed to delete route.');
      res.redirect('/admin/routes');
    }
  },

  // 4. FLEET / VEHICLES MANAGEMENT
  async getVehicles(req, res) {
    try {
      const vehicles = await VehicleModel.getAll();
      res.render('admin/vehicles', {
        title: 'Campus Fleet Vehicles - Admin',
        vehicles,
      });
    } catch (err) {
      req.flash('error_msg', 'Could not load vehicles.');
      res.redirect('/admin');
    }
  },

  async postCreateVehicle(req, res) {
    try {
      const { plateNumber, modelName, vehicleType, capacity, status } = req.body;
      if (!plateNumber || !modelName || !capacity) {
        req.flash('error_msg', 'Plate number, model name, and capacity are required.');
        return res.redirect('/admin/vehicles');
      }
      await VehicleModel.create({
        plateNumber,
        modelName,
        vehicleType,
        capacity: parseInt(capacity, 10),
        status: status || 'ACTIVE',
      });
      req.flash('success_msg', `Vehicle ${plateNumber} added to fleet.`);
      res.redirect('/admin/vehicles');
    } catch (err) {
      console.error('Create vehicle error:', err);
      req.flash('error_msg', 'Failed to add vehicle. Plate number must be unique.');
      res.redirect('/admin/vehicles');
    }
  },

  async postDeleteVehicle(req, res) {
    try {
      const vehicleId = parseInt(req.params.id, 10);
      await VehicleModel.delete(vehicleId);
      req.flash('success_msg', 'Vehicle removed from fleet.');
      res.redirect('/admin/vehicles');
    } catch (err) {
      req.flash('error_msg', 'Cannot delete vehicle: active trips are currently linked to it.');
      res.redirect('/admin/vehicles');
    }
  },

  // 5. TRIPS / SCHEDULE DISPATCH
  async getTrips(req, res) {
    try {
      const trips = await TripModel.getAll({ limit: 100 });
      const routes = await RouteModel.getAll({ activeOnly: true });
      const vehicles = await VehicleModel.getAll();
      const drivers = await UserModel.getDrivers();

      res.render('admin/trips', {
        title: 'Trip Schedules & Dispatch - Admin',
        trips,
        routes,
        vehicles: vehicles.filter((v) => v.status === 'ACTIVE'),
        drivers,
      });
    } catch (err) {
      req.flash('error_msg', 'Could not load trips.');
      res.redirect('/admin');
    }
  },

  async postCreateTrip(req, res) {
    try {
      const { routeId, vehicleId, driverId, departureTime, arrivalTime, availableSeats, fareAmount, notes } = req.body;

      if (!routeId || !vehicleId || !departureTime || !arrivalTime) {
        req.flash('error_msg', 'Please fill all required trip fields.');
        return res.redirect('/admin/trips');
      }

      if (new Date(arrivalTime) <= new Date(departureTime)) {
        req.flash('error_msg', 'Arrival time must be after departure time.');
        return res.redirect('/admin/trips');
      }

      // If availableSeats is not specified, default to the vehicle's capacity
      let seats = parseInt(availableSeats, 10);
      if (!seats || isNaN(seats)) {
        const vehicle = await VehicleModel.getById(parseInt(vehicleId, 10));
        seats = vehicle ? vehicle.capacity : 20;
      }

      await TripModel.create({
        routeId: parseInt(routeId, 10),
        vehicleId: parseInt(vehicleId, 10),
        driverId: driverId ? parseInt(driverId, 10) : null,
        departureTime: new Date(departureTime),
        arrivalTime: new Date(arrivalTime),
        availableSeats: seats,
        fareAmount: parseFloat(fareAmount) || 0.00,
        notes: notes || '',
      });

      req.flash('success_msg', 'Trip scheduled successfully.');
      res.redirect('/admin/trips');
    } catch (err) {
      console.error('Create trip error:', err);
      req.flash('error_msg', 'Failed to schedule trip: ' + err.message);
      res.redirect('/admin/trips');
    }
  },

  async postUpdateTripStatus(req, res) {
    try {
      const tripId = parseInt(req.params.id, 10);
      const { status } = req.body;
      await TripModel.updateStatus(tripId, status);
      req.flash('success_msg', `Trip status updated to ${status}.`);
      res.redirect('/admin/trips');
    } catch (err) {
      req.flash('error_msg', 'Could not update trip status.');
      res.redirect('/admin/trips');
    }
  },

  async postDeleteTrip(req, res) {
    try {
      const tripId = parseInt(req.params.id, 10);
      await TripModel.delete(tripId);
      req.flash('success_msg', 'Trip deleted.');
      res.redirect('/admin/trips');
    } catch (err) {
      req.flash('error_msg', 'Failed to delete trip.');
      res.redirect('/admin/trips');
    }
  },

  // 6. BOOKINGS VIEW
  async getBookings(req, res) {
    try {
      const bookings = await BookingModel.getAll({ limit: 100 });
      res.render('admin/bookings', {
        title: 'All Passenger Bookings - Admin',
        bookings,
      });
    } catch (err) {
      req.flash('error_msg', 'Could not load bookings.');
      res.redirect('/admin');
    }
  },

  async postCancelBookingAdmin(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const reason = req.body.cancellationReason || 'Cancelled by Admin Coordinator';
      await BookingModel.cancelWithTransaction(bookingId, null, true, reason);
      req.flash('success_msg', 'Booking cancelled and seats restored to shuttle.');
      res.redirect('/admin/bookings');
    } catch (err) {
      req.flash('error_msg', 'Failed to cancel booking: ' + err.message);
      res.redirect('/admin/bookings');
    }
  },

  // 7. USERS MANAGEMENT
  async getUsers(req, res) {
    try {
      const users = await UserModel.getAll();
      res.render('admin/users', {
        title: 'User Management - Admin',
        users,
      });
    } catch (err) {
      req.flash('error_msg', 'Could not load users.');
      res.redirect('/admin');
    }
  },

  async postUpdateUserRole(req, res) {
    try {
      const userId = parseInt(req.params.id, 10);
      const { role } = req.body;
      if (!['passenger', 'driver', 'admin'].includes(role)) {
        req.flash('error_msg', 'Invalid role selection.');
        return res.redirect('/admin/users');
      }
      await UserModel.updateRole(userId, role);
      req.flash('success_msg', 'User role updated successfully.');
      res.redirect('/admin/users');
    } catch (err) {
      req.flash('error_msg', 'Could not update user role.');
      res.redirect('/admin/users');
    }
  }
};

module.exports = AdminController;
