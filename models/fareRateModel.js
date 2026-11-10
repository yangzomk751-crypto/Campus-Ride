const db = require('../config/database');

const fareRateModel = {
  async getAllActive() {
    const res = await db.query(
      `SELECT * FROM fare_rates WHERE is_active = TRUE ORDER BY destination ASC`
    );
    return res.rows;
  },

  async getAll() {
    const res = await db.query(
      `SELECT * FROM fare_rates ORDER BY destination ASC`
    );
    return res.rows;
  },

  async getById(rateId) {
    const res = await db.query(
      `SELECT * FROM fare_rates WHERE rate_id = $1 LIMIT 1`,
      [rateId]
    );
    return res.rows[0] || null;
  },

  async getByDestination(destination) {
    const res = await db.query(
      `SELECT * FROM fare_rates WHERE LOWER(destination) = LOWER($1) LIMIT 1`,
      [destination.trim()]
    );
    return res.rows[0] || null;
  },

  async calculateFare(serviceType, destination, passengerCount = 1, rideSharing = false) {
    const count = Math.max(1, parseInt(passengerCount, 10) || 1);

    // 1. Weekday Ride: Always fixed Nu. 100 per ride
    if (
      serviceType === 'Weekday Ride' ||
      destination === 'Hostel to Classroom' ||
      destination === 'Classroom to Hostel' ||
      destination === 'Hostel to Academic Block' ||
      destination === 'Academic Block to Hostel' ||
      destination === 'Academic Block' ||
      destination.includes('Academic Block') ||
      destination.includes('Hostel')
    ) {
      return {
        serviceType: 'Weekday Ride',
        destination,
        passengerCount: count,
        farePerPassenger: 100.00,
        totalFare: 100.00,
        fareType: 'Fixed Weekday Rate (Nu. 100)',
        isQuotationRequired: false,
      };
    }

    const rate = await this.getByDestination(destination);

    if (!rate || !rate.is_active) {
      // Unlisted destination requires Admin Quotation!
      return {
        serviceType,
        destination,
        passengerCount: count,
        farePerPassenger: 0.00,
        totalFare: 0.00,
        fareType: 'Custom Quotation Required (Unlisted Destination)',
        isQuotationRequired: true,
      };
    }

    if (serviceType === 'Taxi') {
      const taxiBase = parseFloat(rate.taxi_fare);
      if (rideSharing) {
        // Shared Taxi: Total fare divided among passengers
        const perPax = Math.round((taxiBase / count) * 100) / 100;
        return {
          serviceType: 'Taxi',
          destination: rate.destination,
          passengerCount: count,
          farePerPassenger: perPax,
          totalFare: taxiBase,
          fareType: `Shared Taxi (${count} passengers @ Nu. ${perPax}/pax)`,
          isQuotationRequired: false,
        };
      } else {
        // Whole Taxi Hire
        return {
          serviceType: 'Taxi',
          destination: rate.destination,
          passengerCount: count,
          farePerPassenger: taxiBase,
          totalFare: taxiBase,
          fareType: 'Whole Taxi Hire (One-way)',
          isQuotationRequired: false,
        };
      }
    } else if (serviceType === 'Bus') {
      const busRatePerPax = parseFloat(rate.bus_fare);
      const totalBusFare = busRatePerPax * count;
      return {
        serviceType: 'Bus',
        destination: rate.destination,
        passengerCount: count,
        farePerPassenger: busRatePerPax,
        totalFare: totalBusFare,
        fareType: `Bus Fare (Nu. ${busRatePerPax} per passenger)`,
        isQuotationRequired: false,
      };
    }

    return {
      serviceType,
      destination,
      passengerCount: count,
      farePerPassenger: 0.00,
      totalFare: 0.00,
      fareType: 'Standard Rate',
      isQuotationRequired: false,
    };
  },

  async create({ destination, busFare, taxiFare, notes = '' }) {
    const res = await db.query(
      `INSERT INTO fare_rates (destination, bus_fare, taxi_fare, is_active, notes)
       VALUES ($1, $2, $3, TRUE, $4)
       RETURNING *`,
      [destination.trim(), parseFloat(busFare), parseFloat(taxiFare), notes.trim()]
    );
    return res.rows[0];
  },

  async update(rateId, { busFare, taxiFare, notes = '' }) {
    const res = await db.query(
      `UPDATE fare_rates
       SET bus_fare = $1, taxi_fare = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
       WHERE rate_id = $4
       RETURNING *`,
      [parseFloat(busFare), parseFloat(taxiFare), notes.trim(), rateId]
    );
    return res.rows[0];
  },

  async toggleActive(rateId) {
    const res = await db.query(
      `UPDATE fare_rates
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE rate_id = $1
       RETURNING *`,
      [rateId]
    );
    return res.rows[0];
  },
};

module.exports = fareRateModel;
