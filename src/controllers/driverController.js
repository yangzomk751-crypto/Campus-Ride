const TripModel = require('../models/tripModel');
const BookingModel = require('../models/bookingModel');

const DriverController = {
  async getDashboard(req, res) {
    try {
      const driverId = req.session.user.id;
      const trips = await TripModel.getDriverTrips(driverId);

      res.render('driver/dashboard', {
        title: 'Driver Portal - My Assigned Shifts & Trips',
        trips,
      });
    } catch (err) {
      console.error('Driver dashboard error:', err);
      req.flash('error_msg', 'Unable to retrieve driver assignments.');
      res.redirect('/');
    }
  },

  async getTripManifest(req, res) {
    try {
      const tripId = parseInt(req.params.id, 10);
      const trip = await TripModel.getById(tripId);

      if (!trip) {
        req.flash('error_msg', 'Trip not found.');
        return res.redirect('/driver');
      }

      // Check if driver is assigned or user is admin
      if (trip.driver_id !== req.session.user.id && req.session.user.role !== 'admin') {
        req.flash('error_msg', 'You are not assigned to this trip.');
        return res.redirect('/driver');
      }

      const passengers = await BookingModel.getTripPassengerManifest(tripId);

      res.render('driver/manifest', {
        title: `Passenger Manifest - ${trip.route_name}`,
        trip,
        passengers,
      });
    } catch (err) {
      console.error('Manifest error:', err);
      req.flash('error_msg', 'Could not load passenger manifest.');
      res.redirect('/driver');
    }
  },

  async postUpdateTripStatus(req, res) {
    try {
      const tripId = parseInt(req.params.id, 10);
      const { status } = req.body;
      const validStatuses = ['SCHEDULED', 'BOARDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];

      if (!validStatuses.includes(status)) {
        req.flash('error_msg', 'Invalid trip status.');
        return res.redirect(`/driver/trips/${tripId}/manifest`);
      }

      const trip = await TripModel.getById(tripId);
      if (!trip) {
        req.flash('error_msg', 'Trip not found.');
        return res.redirect('/driver');
      }

      if (trip.driver_id !== req.session.user.id && req.session.user.role !== 'admin') {
        req.flash('error_msg', 'Unauthorized to modify this trip.');
        return res.redirect('/driver');
      }

      await TripModel.updateStatus(tripId, status);
      req.flash('success_msg', `Trip status successfully updated to "${status}".`);
      res.redirect(`/driver/trips/${tripId}/manifest`);
    } catch (err) {
      console.error('Update trip status error:', err);
      req.flash('error_msg', 'Failed to update trip status.');
      res.redirect('/driver');
    }
  }
};

module.exports = DriverController;
