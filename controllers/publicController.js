const fareRateModel = require('../models/fareRateModel');
const driverModel = require('../models/driverModel');
const vehicleModel = require('../models/vehicleModel');

const publicController = {
  async getHome(req, res) {
    try {
      const activeRates = await fareRateModel.getAllActive();
      const weekdayDrivers = await driverModel.getAvailableWeekdayDrivers();
      const vehicles = await vehicleModel.getAll();

      res.render('public/home', {
        title: 'Sherubtse Campus Ride | Campus Transport Booking System',
        popularRates: activeRates.slice(0, 6),
        weekdayDriversCount: weekdayDrivers.length,
        busCount: vehicles.filter((v) => v.vehicle_type === 'Bus').length,
        taxiCount: vehicles.filter((v) => v.vehicle_type === 'Taxi').length,
      });
    } catch (err) {
      console.error('Home error:', err);
      res.render('public/home', {
        title: 'Sherubtse Campus Ride',
        popularRates: [],
        weekdayDriversCount: 0,
        busCount: 2,
        taxiCount: 2,
      });
    }
  },

  getAbout(req, res) {
    res.render('public/about', {
      title: 'About Campus Ride | Sherubtse College',
    });
  },

  getServices(req, res) {
    res.render('public/services', {
      title: 'Transportation Services | Sherubtse Campus Ride',
    });
  },

  async getFareChart(req, res) {
    try {
      const rates = await fareRateModel.getAllActive();
      res.render('public/fareChart', {
        title: 'Official Fare Chart (All 20 Dzongkhags) | Campus Ride',
        rates,
      });
    } catch (err) {
      console.error('Fare chart public error:', err);
      req.flash('error_msg', 'Could not load fare chart.');
      res.redirect('/');
    }
  },

  getContact(req, res) {
    res.render('public/contact', {
      title: 'Contact Transport Office | Sherubtse College',
    });
  },

  postContact(req, res) {
    req.flash('success_msg', 'Thank you! Your message has been sent to the Sherubtse Transport Office.');
    res.redirect('/contact');
  },
};

module.exports = publicController;
