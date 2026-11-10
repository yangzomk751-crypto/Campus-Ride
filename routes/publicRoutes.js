const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/', publicController.getHome);
router.get('/about', publicController.getAbout);
router.get('/services', publicController.getServices);
router.get('/fare-chart', publicController.getFareChart);
router.get('/rates', publicController.getFareChart); // alias
router.get('/contact', publicController.getContact);
router.post('/contact', publicController.postContact);

module.exports = router;
