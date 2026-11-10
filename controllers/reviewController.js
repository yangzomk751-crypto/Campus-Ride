const reviewModel = require('../models/reviewModel');

const reviewController = {
  async postCreateReview(req, res) {
    const { tripId, driverId, rating, comment } = req.body;
    const reviewerId = req.session.user.id;

    if (!tripId || !driverId || !rating) {
      req.flash('error_msg', 'Please provide a rating from 1 to 5 stars.');
      return res.redirect(`/trips/${tripId}`);
    }

    try {
      await reviewModel.create({
        tripId: parseInt(tripId, 10),
        reviewerId,
        driverId: parseInt(driverId, 10),
        rating: parseInt(rating, 10),
        comment,
      });

      req.flash('success_msg', 'Thank you for submitting your driver review!');
      res.redirect(`/trips/${tripId}`);
    } catch (err) {
      console.error('Review error:', err);
      req.flash('error_msg', err.message || 'Failed to submit review.');
      res.redirect(`/trips/${tripId}`);
    }
  },
};

module.exports = reviewController;
