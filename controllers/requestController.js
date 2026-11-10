const requestModel = require('../models/requestModel');
const tripModel = require('../models/tripModel');

const requestController = {
  async postRequestSeat(req, res) {
    const { tripId, seatsRequested, pickupNote } = req.body;
    const passengerId = req.session.user.id;

    if (!tripId || !seatsRequested) {
      req.flash('error_msg', 'Please provide trip information and number of seats.');
      return res.redirect('/find-ride');
    }

    try {
      await requestModel.createRequest({
        tripId: parseInt(tripId, 10),
        passengerId,
        seatsRequested: parseInt(seatsRequested, 10),
        pickupNote,
      });

      req.flash(
        'success_msg',
        'Seat request submitted successfully! The driver has been notified and will review your request.'
      );
      res.redirect('/my-requests');
    } catch (err) {
      console.error('Request seat error:', err);
      req.flash('error_msg', err.message || 'Failed to submit seat request.');
      res.redirect(`/trips/${tripId}`);
    }
  },

  async getMyRequests(req, res) {
    const passengerId = req.session.user.id;
    try {
      const requests = await requestModel.getByPassenger(passengerId);

      // Separate into upcoming and previous
      const today = new Date().toISOString().split('T')[0];
      const activeRequests = requests.filter((r) => r.travel_date.toISOString().split('T')[0] >= today);
      const pastRequests = requests.filter((r) => r.travel_date.toISOString().split('T')[0] < today);

      res.render('requests/myRequests', {
        title: 'My Ride Requests | Campus Ride',
        activeRequests,
        pastRequests,
      });
    } catch (err) {
      console.error('My requests fetch error:', err);
      req.flash('error_msg', 'Failed to load your ride requests.');
      res.redirect('/dashboard');
    }
  },

  async postCancelRequest(req, res) {
    const requestId = parseInt(req.params.id, 10);
    const passengerId = req.session.user.id;
    const { cancellationReason } = req.body;

    try {
      await requestModel.cancelRequest(requestId, passengerId, cancellationReason);
      req.flash('success_msg', 'Your ride request has been cancelled.');
      res.redirect('/my-requests');
    } catch (err) {
      console.error('Cancel request error:', err);
      req.flash('error_msg', err.message || 'Failed to cancel request.');
      res.redirect('/my-requests');
    }
  },

  async postAcceptRequest(req, res) {
    const requestId = parseInt(req.params.id, 10);
    const driverId = req.session.user.id;

    try {
      const result = await requestModel.acceptRequest(requestId, driverId);
      req.flash(
        'success_msg',
        `Passenger request accepted! Available seats updated (${result.newAvailableSeats} seats remaining).`
      );
      res.redirect('/my-trips');
    } catch (err) {
      console.error('Accept request error:', err);
      req.flash('error_msg', err.message || 'Failed to accept passenger request.');
      res.redirect('/my-trips');
    }
  },

  async postRejectRequest(req, res) {
    const requestId = parseInt(req.params.id, 10);
    const driverId = req.session.user.id;
    const { rejectionReason } = req.body;

    try {
      await requestModel.rejectRequest(requestId, driverId, rejectionReason);
      req.flash('info_msg', 'Passenger request rejected.');
      res.redirect('/my-trips');
    } catch (err) {
      console.error('Reject request error:', err);
      req.flash('error_msg', err.message || 'Failed to reject request.');
      res.redirect('/my-trips');
    }
  },
};

module.exports = requestController;
