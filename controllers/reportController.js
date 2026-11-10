const reportModel = require('../models/reportModel');

const reportController = {
  async postCreateReport(req, res) {
    const { reportedUserId, reportedTripId, reportType, description } = req.body;
    const reporterId = req.session.user.id;

    if (!reportType || !description) {
      req.flash('error_msg', 'Please provide report reason and description.');
      return res.redirect('back');
    }

    try {
      await reportModel.create({
        reporterId,
        reportedUserId: reportedUserId ? parseInt(reportedUserId, 10) : null,
        reportedTripId: reportedTripId ? parseInt(reportedTripId, 10) : null,
        reportType,
        description,
      });

      req.flash('success_msg', 'Your report has been submitted to campus administration for review.');
      res.redirect('back');
    } catch (err) {
      console.error('Submit report error:', err);
      req.flash('error_msg', 'Failed to submit report: ' + err.message);
      res.redirect('back');
    }
  },
};

module.exports = reportController;
