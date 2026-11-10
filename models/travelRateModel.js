const db = require('../config/database');

const travelRateModel = {
  async getAllRates(serviceType = null) {
    let query = `SELECT * FROM travel_rates WHERE 1=1`;
    const params = [];
    if (serviceType && serviceType !== 'all') {
      params.push(serviceType);
      query += ` AND service_type = $${params.length}`;
    }
    query += ` ORDER BY service_type DESC, standard_fare ASC`;
    const res = await db.query(query, params);
    return res.rows;
  },

  async findRate(pickupLocation, destination) {
    const query = `
      SELECT * FROM travel_rates 
      WHERE (LOWER(pickup_location) LIKE LOWER($1) AND LOWER(destination) LIKE LOWER($2))
         OR (LOWER(pickup_location) LIKE LOWER($2) AND LOWER(destination) LIKE LOWER($1))
      LIMIT 1;
    `;
    const res = await db.query(query, [`%${pickupLocation.trim()}%`, `%${destination.trim()}%`]);
    return res.rows[0] || null;
  },

  async calculateFare(serviceType, pickupLocation, destination, passengerCount = 1) {
    const rate = await this.findRate(pickupLocation, destination);
    if (!rate) {
      // Default baseline fallbacks if custom route entered
      if (serviceType === 'Taxi') {
        return { fare: 30.00, fareType: 'Standard Campus Taxi Rate', rateName: 'Standard Campus Ride' };
      } else {
        return { fare: 1500.00, fareType: 'Standard Class Trip Day Rate', rateName: 'Standard Class Bus Reservation' };
      }
    }

    if (rate.fare_type.includes('per seat') || rate.fare_type.includes('Shared')) {
      return {
        fare: rate.standard_fare * parseInt(passengerCount, 10),
        fareType: rate.fare_type,
        rateName: rate.route_name,
        estimatedDuration: rate.estimated_duration,
      };
    }

    return {
      fare: parseFloat(rate.standard_fare),
      fareType: rate.fare_type,
      rateName: rate.route_name,
      estimatedDuration: rate.estimated_duration,
    };
  },
};

module.exports = travelRateModel;
