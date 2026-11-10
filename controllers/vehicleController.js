const VehicleModel = require('../models/vehicleModel');

const VehicleController = {
  async getVehicles(req, res) {
    try {
      const vehicles = await VehicleModel.getAll();
      res.render('admin/vehicles', {
        title: 'Manage Campus Vehicles - Admin',
        vehicles,
      });
    } catch (err) {
      req.flash('error_msg', 'Could not load vehicles.');
      res.redirect('/admin');
    }
  },

  async postCreateVehicle(req, res) {
    try {
      const { registrationNumber, vehicleType, capacity, availabilityStatus, description } = req.body;

      if (!registrationNumber || !vehicleType || !capacity) {
        req.flash('error_msg', 'Registration number, type, and capacity are required.');
        return res.redirect('/admin/vehicles');
      }

      await VehicleModel.create({
        registrationNumber,
        vehicleType,
        capacity,
        availabilityStatus: availabilityStatus || 'Available',
        description: description || '',
      });

      req.flash('success_msg', `Vehicle ${registrationNumber} added successfully.`);
      res.redirect('/admin/vehicles');
    } catch (err) {
      console.error('Create vehicle error:', err);
      req.flash('error_msg', 'Failed to add vehicle. Registration number must be unique.');
      res.redirect('/admin/vehicles');
    }
  },

  async postUpdateVehicle(req, res) {
    try {
      const vehicleId = parseInt(req.params.id, 10);
      const { registrationNumber, vehicleType, capacity, availabilityStatus, description } = req.body;

      await VehicleModel.update(vehicleId, {
        registrationNumber,
        vehicleType,
        capacity,
        availabilityStatus,
        description,
      });

      req.flash('success_msg', `Vehicle ${registrationNumber} updated successfully.`);
      res.redirect('/admin/vehicles');
    } catch (err) {
      console.error('Update vehicle error:', err);
      req.flash('error_msg', 'Failed to update vehicle.');
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
      req.flash('error_msg', 'Cannot delete vehicle: active trip assignments are linked to it.');
      res.redirect('/admin/vehicles');
    }
  }
};

module.exports = VehicleController;
