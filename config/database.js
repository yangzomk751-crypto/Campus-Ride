const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'campus_ride_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    };

const pool = new Pool(poolConfig);

let pgAvailable = false;
let checkDone = false;

const DB_FILE = path.join(__dirname, '..', 'data', 'campus_ride_db.json');

function loadStoreFromFile() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.users) && data.users.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Could not read persistent DB file:', err.message);
  }
  return null;
}

function saveStoreToFile() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save persistent DB file:', err.message);
  }
}

// In-Memory store as a fallback for offline/sandboxed development
const inMemoryStore = {
  users: [
    {
      user_id: 1,
      full_name: 'Campus Transport Officer',
      email: 'admin@sherubtse.edu.bt',
      password_hash: '$2a$10$z9Y78bNCnVv1LUqEZfYl5.j/HPyCpBpkx1PH5hgMsTI5Nd8pFSpvW',
      role: 'admin',
      passenger_type: null,
      phone: '+975-17111000',
      status: 'active',
      created_at: new Date(),
    },
    {
      user_id: 2,
      full_name: 'Ugyen Dorji',
      email: 'driver.ugyen@sherubtse.edu.bt',
      password_hash: '$2a$10$RwOK7AE6povCa/1gDqvzTuY/IPNwXtpCtr.D3drUPjMgW5aAhzALG',
      role: 'driver',
      passenger_type: null,
      phone: '+975-17222111',
      status: 'active',
      created_at: new Date(),
    },
    {
      user_id: 3,
      full_name: 'Tashi Wangchuk',
      email: 'driver.tashi@sherubtse.edu.bt',
      password_hash: '$2a$10$RwOK7AE6povCa/1gDqvzTuY/IPNwXtpCtr.D3drUPjMgW5aAhzALG',
      role: 'driver',
      passenger_type: null,
      phone: '+975-17333222',
      status: 'active',
      created_at: new Date(),
    },
    {
      user_id: 4,
      full_name: 'Dawa Penjor',
      email: 'driver.dawa@sherubtse.edu.bt',
      password_hash: '$2a$10$RwOK7AE6povCa/1gDqvzTuY/IPNwXtpCtr.D3drUPjMgW5aAhzALG',
      role: 'driver',
      passenger_type: null,
      phone: '+975-17444555',
      status: 'active',
      created_at: new Date(),
    },
    {
      user_id: 5,
      full_name: 'Sonam Choden',
      email: 'sonam@sherubtse.edu.bt',
      password_hash: '$2a$10$2zFGZKBmtLzisX/ATjzPvOgq7F6ovl15cnrgVrQDVxlS.WlB25jii',
      role: 'passenger',
      passenger_type: 'student',
      phone: '+975-17555444',
      status: 'active',
      created_at: new Date(),
    },
    {
      user_id: 6,
      full_name: 'Karma Phuntsho',
      email: 'karma.staff@sherubtse.edu.bt',
      password_hash: '$2a$10$vinGQzoWSGzM.tBbFN4mS.XAbVXncx1kWCGuygxXQLBXRbjewXqTe',
      role: 'passenger',
      passenger_type: 'staff',
      phone: '+975-17444333',
      status: 'active',
      created_at: new Date(),
    },
    {
      user_id: 7,
      full_name: 'Kinley Tshering',
      email: 'kinley@sherubtse.edu.bt',
      password_hash: '$2a$10$2zFGZKBmtLzisX/ATjzPvOgq7F6ovl15cnrgVrQDVxlS.WlB25jii',
      role: 'passenger',
      passenger_type: 'student',
      phone: '+975-17666555',
      status: 'active',
      created_at: new Date(),
    },
  ],
  drivers: [
    {
      driver_id: 1,
      user_id: 2,
      license_number: 'BT-DRV-102938',
      verification_status: 'Approved',
      availability_status: 'Available',
      weekday_available: true,
      notes: 'Designated campus taxi driver with over 6 years experience.',
      created_at: new Date(),
    },
    {
      driver_id: 2,
      user_id: 3,
      license_number: 'BT-COM-887766',
      verification_status: 'Approved',
      availability_status: 'Available',
      weekday_available: true,
      notes: 'Heavy vehicle operator for college buses and study tours.',
      created_at: new Date(),
    },
    {
      driver_id: 3,
      user_id: 4,
      license_number: 'BT-DRV-998877',
      verification_status: 'Pending',
      availability_status: 'Unavailable',
      weekday_available: false,
      notes: 'New driver applicant awaiting admin license verification.',
      created_at: new Date(),
    },
  ],
  vehicles: [
    {
      vehicle_id: 1,
      driver_id: 1,
      registration_number: 'BP-1-A1234',
      vehicle_model: 'Maruti Suzuki WagonR',
      vehicle_type: 'Taxi',
      capacity: 4,
      availability_status: 'Available',
      description: 'Campus taxi for hostel and town trips',
      created_at: new Date(),
    },
    {
      vehicle_id: 2,
      driver_id: null,
      registration_number: 'BP-1-B5678',
      vehicle_model: 'Hyundai Santro Xing',
      vehicle_type: 'Taxi',
      capacity: 4,
      availability_status: 'Available',
      description: 'Clean taxi with boot luggage space',
      created_at: new Date(),
    },
    {
      vehicle_id: 3,
      driver_id: 2,
      registration_number: 'BG-1-0123',
      vehicle_model: 'Eicher Starline 32-Seater',
      vehicle_type: 'Bus',
      capacity: 32,
      availability_status: 'Available',
      description: 'Sherubtse College Bus 1 for class study tours',
      created_at: new Date(),
    },
    {
      vehicle_id: 4,
      driver_id: null,
      registration_number: 'BG-1-0456',
      vehicle_model: 'Tata Starbus 45-Seater Coach',
      vehicle_type: 'Bus',
      capacity: 45,
      availability_status: 'Available',
      description: 'Sherubtse College Bus 2 for long distance tours',
      created_at: new Date(),
    },
  ],
  fare_rates: [
    { rate_id: 1, destination: 'Trashigang', bus_fare: 200, taxi_fare: 500, is_active: true, notes: 'District center and hospital transit' },
    { rate_id: 2, destination: 'Mongar', bus_fare: 300, taxi_fare: 2600, is_active: true, notes: 'Regional commercial hub' },
    { rate_id: 3, destination: 'Lhuentse', bus_fare: 450, taxi_fare: 4400, is_active: true, notes: 'Ancestral home of royal dynasty' },
    { rate_id: 4, destination: 'Pemagatshel', bus_fare: 400, taxi_fare: 3500, is_active: true, notes: 'Southern eastern district transit' },
    { rate_id: 5, destination: 'Samdrup Jongkhar', bus_fare: 470, taxi_fare: 4600, is_active: true, notes: 'Border gateway town' },
    { rate_id: 6, destination: 'Trashiyangtse', bus_fare: 300, taxi_fare: 1900, is_active: true, notes: 'Chorten Kora pilgrimage' },
    { rate_id: 7, destination: 'Zhemgang', bus_fare: 750, taxi_fare: 9500, is_active: true, notes: 'Central biological corridor' },
    { rate_id: 8, destination: 'Bumthang', bus_fare: 700, taxi_fare: 7500, is_active: true, notes: 'Historic temples and valleys' },
    { rate_id: 9, destination: 'Trongsa', bus_fare: 850, taxi_fare: 9500, is_active: true, notes: 'Historic watchtower' },
    { rate_id: 10, destination: 'Sarpang', bus_fare: 1100, taxi_fare: 13500, is_active: true, notes: 'Gelephu Mindfulness City hub' },
    { rate_id: 11, destination: 'Tsirang', bus_fare: 1050, taxi_fare: 14000, is_active: true, notes: 'Damphu transit route' },
    { rate_id: 12, destination: 'Dagana', bus_fare: 1200, taxi_fare: 15000, is_active: true, notes: 'Daga Dzong route' },
    { rate_id: 13, destination: 'Chhukha', bus_fare: 1400, taxi_fare: 17500, is_active: true, notes: 'Hydropower corridor' },
    { rate_id: 14, destination: 'Samtse', bus_fare: 1500, taxi_fare: 19000, is_active: true, notes: 'South-western college route' },
    { rate_id: 15, destination: 'Wangdue Phodrang', bus_fare: 1100, taxi_fare: 14000, is_active: true, notes: 'Bajo valley' },
    { rate_id: 16, destination: 'Punakha', bus_fare: 1150, taxi_fare: 14500, is_active: true, notes: 'Punakha Dzong valley' },
    { rate_id: 17, destination: 'Gasa', bus_fare: 1300, taxi_fare: 16000, is_active: true, notes: 'Hot springs highland' },
    { rate_id: 18, destination: 'Thimphu', bus_fare: 1250, taxi_fare: 16000, is_active: true, notes: 'Capital city' },
    { rate_id: 19, destination: 'Paro', bus_fare: 1400, taxi_fare: 17500, is_active: true, notes: 'Airport & sacred sites' },
    { rate_id: 20, destination: 'Haa', bus_fare: 1500, taxi_fare: 19000, is_active: true, notes: 'Western alpine valley' },
    { rate_id: 21, destination: 'Hostel to Academic Block', bus_fare: 100, taxi_fare: 100, is_active: true, notes: 'Fixed campus weekday route to Academic Block' },
    { rate_id: 22, destination: 'Academic Block to Hostel', bus_fare: 100, taxi_fare: 100, is_active: true, notes: 'Fixed campus return weekday route to resident hostels' },
    { rate_id: 23, destination: 'Sherubtse to Rangjung', bus_fare: 350, taxi_fare: 800, is_active: true, notes: 'Local Kanglung-Rangjung route' },
    { rate_id: 24, destination: 'Hostel to Classroom', bus_fare: 100, taxi_fare: 100, is_active: true, notes: 'Fixed campus weekday route (alias)' },
    { rate_id: 25, destination: 'Classroom to Hostel', bus_fare: 100, taxi_fare: 100, is_active: true, notes: 'Fixed campus return weekday route (alias)' },
  ],
  bookings: [
    {
      booking_id: 1,
      user_id: 5,
      service_type: 'Weekday Ride',
      booking_subtype: 'Weekday',
      pickup_location: 'North Hostel Block A',
      destination: 'Hostel to Classroom',
      travel_date: new Date().toISOString().split('T')[0],
      departure_time: '08:30:00',
      passenger_count: 1,
      ride_sharing_opted: false,
      fare_per_passenger: 100.00,
      total_fare: 100.00,
      trip_purpose: 'Morning lecture in Computer Science',
      remarks: 'Near the main hostel entrance',
      booking_status: 'Confirmed',
      quotation_status: 'None',
      quoted_fare: 100.00,
      assigned_driver_id: 1,
      assigned_vehicle_id: 1,
      admin_notes: null,
      rejection_reason: null,
      created_at: new Date(Date.now() - 3600000 * 2),
      updated_at: new Date(),
    },
    {
      booking_id: 2,
      user_id: 7,
      service_type: 'Taxi',
      booking_subtype: 'Book Now',
      pickup_location: 'Sherubtse Upper Gate',
      destination: 'Trashigang',
      travel_date: new Date().toISOString().split('T')[0],
      departure_time: '10:00:00',
      passenger_count: 2,
      ride_sharing_opted: true,
      fare_per_passenger: 250.00,
      total_fare: 500.00,
      trip_purpose: 'Medical appointment at Trashigang Hospital',
      remarks: 'Sharing taxi with fellow student',
      booking_status: 'Confirmed',
      quotation_status: 'None',
      quoted_fare: 500.00,
      assigned_driver_id: 1,
      assigned_vehicle_id: 1,
      admin_notes: null,
      rejection_reason: null,
      created_at: new Date(Date.now() - 3600000),
      updated_at: new Date(),
    },
    {
      booking_id: 3,
      user_id: 6,
      service_type: 'Bus',
      booking_subtype: 'Group Bus',
      pickup_location: 'Sherubtse Campus Bus Shelter',
      destination: 'Mongar',
      travel_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      departure_time: '07:30:00',
      passenger_count: 30,
      ride_sharing_opted: false,
      fare_per_passenger: 300.00,
      total_fare: 9000.00,
      trip_purpose: 'Environmental Science field study tour',
      remarks: 'Need luggage space for research instruments',
      booking_status: 'Confirmed',
      quotation_status: 'Accepted',
      quoted_fare: 9000.00,
      assigned_driver_id: 2,
      assigned_vehicle_id: 3,
      admin_notes: 'Bus BG-1-0123 assigned for field tour',
      rejection_reason: null,
      created_at: new Date(Date.now() - 86400000),
      updated_at: new Date(),
    },
    {
      booking_id: 4,
      user_id: 5,
      service_type: 'Bus',
      booking_subtype: 'Group Bus',
      pickup_location: 'Sherubtse Upper Gate',
      destination: 'Trashiyangtse',
      travel_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      departure_time: '08:00:00',
      passenger_count: 25,
      ride_sharing_opted: false,
      fare_per_passenger: 0.00,
      total_fare: 0.00,
      trip_purpose: 'Student Cultural Club excursion to Chorten Kora',
      remarks: 'Requesting college bus support',
      booking_status: 'Pending',
      quotation_status: 'Pending Admin Quotation',
      quoted_fare: null,
      assigned_driver_id: null,
      assigned_vehicle_id: null,
      admin_notes: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      booking_id: 5,
      user_id: 5,
      service_type: 'Taxi',
      booking_subtype: 'Schedule Later',
      pickup_location: 'Sherubtse Lower Gate',
      destination: 'Sherubtse to Rangjung',
      travel_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      departure_time: '14:00:00',
      passenger_count: 1,
      ride_sharing_opted: false,
      fare_per_passenger: 800.00,
      total_fare: 800.00,
      trip_purpose: 'Project meeting in Rangjung',
      remarks: 'Completed journey',
      booking_status: 'Completed',
      quotation_status: 'None',
      quoted_fare: 800.00,
      assigned_driver_id: 1,
      assigned_vehicle_id: 1,
      admin_notes: null,
      rejection_reason: null,
      created_at: new Date(Date.now() - 86400000 * 2),
      updated_at: new Date(),
    },
  ],
  payments: [
    {
      payment_id: 1,
      booking_id: 1,
      passenger_id: 5,
      driver_id: 1,
      amount: 100.00,
      payment_method: 'Cash',
      payment_status: 'Pending',
      recorded_by: null,
      notes: 'Passenger will pay cash upon arrival',
      paid_at: null,
      created_at: new Date(),
    },
    {
      payment_id: 2,
      booking_id: 2,
      passenger_id: 7,
      driver_id: 1,
      amount: 500.00,
      payment_method: 'Cash',
      payment_status: 'Pending',
      recorded_by: null,
      notes: 'Cash payment pending journey completion',
      paid_at: null,
      created_at: new Date(),
    },
    {
      payment_id: 3,
      booking_id: 3,
      passenger_id: 6,
      driver_id: 2,
      amount: 9000.00,
      payment_method: 'Cash',
      payment_status: 'Waived',
      recorded_by: 1,
      notes: 'College sponsored departmental excursion. Payment waived by administration.',
      paid_at: new Date(),
      created_at: new Date(),
    },
    {
      payment_id: 4,
      booking_id: 5,
      passenger_id: 5,
      driver_id: 1,
      amount: 800.00,
      payment_method: 'Cash',
      payment_status: 'Paid',
      recorded_by: 2,
      notes: 'Cash payment of Nu. 800 received in full by Driver Ugyen.',
      paid_at: new Date(Date.now() - 86400000),
      created_at: new Date(Date.now() - 86400000),
    },
  ],
  notifications: [
    {
      notification_id: 1,
      user_id: 5,
      booking_id: 1,
      title: 'Weekday Ride Confirmed',
      message: 'Driver Ugyen Dorji has accepted your weekday ride to Classroom Block. Vehicle: Maruti Suzuki WagonR (BP-1-A1234).',
      link: '/bookings/1',
      is_read: false,
      created_at: new Date(),
    },
    {
      notification_id: 2,
      user_id: 7,
      booking_id: 2,
      title: 'Taxi Booking Confirmed',
      message: 'Your shared taxi to Trashigang has been confirmed with Driver Ugyen Dorji.',
      link: '/bookings/2',
      is_read: false,
      created_at: new Date(),
    },
    {
      notification_id: 3,
      user_id: 6,
      booking_id: 3,
      title: 'Bus Reservation Confirmed',
      message: 'Sherubtse College Bus (BG-1-0123) and Driver Tashi Wangchuk have been assigned to your Mongar trip.',
      link: '/bookings/3',
      is_read: true,
      created_at: new Date(),
    },
  ],
};

// Initialize persistent store from file if available, or write initial seed data
const savedStore = loadStoreFromFile();
if (savedStore) {
  Object.assign(inMemoryStore, savedStore);
} else {
  saveStoreToFile();
}

// Safe execute query: if pg is available, run pool.query. Otherwise fallback to persistent local store.
async function query(text, params = []) {
  if (pgAvailable) {
    try {
      const res = await pool.query(text, params);
      // Safeguard: If querying users and PostgreSQL returns 0 rows, check if database is unseeded
      if (res.rowCount === 0 && /^SELECT/i.test(text.trim()) && /FROM users/i.test(text)) {
        try {
          const countCheck = await pool.query('SELECT COUNT(*)::int AS count FROM users');
          if (countCheck.rows[0].count === 0) {
            console.warn('[DB] PostgreSQL users table is empty. Using persistent local store.');
            return executeInMemoryQuery(text, params);
          }
        } catch (_) {}
      }
      return res;
    } catch (err) {
      console.warn('PostgreSQL query error, falling back to persistent local store:', err.message);
    }
  }

  // Persistent local file/memory execution adapter
  const result = executeInMemoryQuery(text, params);
  if (!/^SELECT/i.test(text.trim())) {
    saveStoreToFile();
  }
  return result;
}

function executeInMemoryQuery(text, params) {
  const cleanSql = text.trim();

  // 1. SELECT queries
  if (/^SELECT/i.test(cleanSql)) {
    // Current time / db check
    if (/SELECT NOW\(\)/i.test(cleanSql) || /current_database\(\)/i.test(cleanSql)) {
      return { rows: [{ current_time: new Date(), db_name: 'campus_ride_db (memory/pg-ready)' }], rowCount: 1 };
    }

    // USERS
    if (/FROM users/i.test(cleanSql)) {
      let result = inMemoryStore.users.slice();
      if (/email/i.test(cleanSql) && params.length > 0) {
        result = result.filter((u) => u.email.toLowerCase() === String(params[0]).toLowerCase());
      } else if (/user_id/i.test(cleanSql) && params.length > 0) {
        result = result.filter((u) => u.user_id === parseInt(params[0], 10));
      } else if (/role = 'passenger'/i.test(cleanSql)) {
        result = result.filter((u) => u.role === 'passenger');
      }
      return { rows: result, rowCount: result.length };
    }

    // FARE RATES
    if (/FROM fare_rates/i.test(cleanSql)) {
      let result = inMemoryStore.fare_rates.slice();
      if (/destination/i.test(cleanSql) && params.length > 0) {
        result = result.filter((r) => r.destination.toLowerCase() === String(params[0]).toLowerCase());
      } else if (/rate_id/i.test(cleanSql) && params.length > 0) {
        result = result.filter((r) => r.rate_id === parseInt(params[0], 10));
      } else if (/is_active = TRUE/i.test(cleanSql)) {
        result = result.filter((r) => r.is_active === true);
      }
      return { rows: result, rowCount: result.length };
    }

    // DRIVERS
    if (/FROM drivers/i.test(cleanSql)) {
      let result = inMemoryStore.drivers.map((d) => {
        const u = inMemoryStore.users.find((user) => user.user_id === d.user_id) || {};
        const v = inMemoryStore.vehicles.find((veh) => veh.driver_id === d.driver_id) || {};
        return {
          ...d,
          full_name: u.full_name || 'Driver',
          email: u.email || '',
          phone: u.phone || '',
          registration_number: v.registration_number || 'N/A',
          vehicle_model: v.vehicle_model || 'Unassigned',
          vehicle_type: v.vehicle_type || 'Taxi',
          capacity: v.capacity || 4,
        };
      });

      if (/driver_id/i.test(cleanSql) && params.length > 0) {
        result = result.filter((d) => d.driver_id === parseInt(params[0], 10));
      } else if (/user_id/i.test(cleanSql) && params.length > 0) {
        result = result.filter((d) => d.user_id === parseInt(params[0], 10));
      } else if (/weekday_available = TRUE/i.test(cleanSql)) {
        result = result.filter((d) => d.weekday_available === true && d.availability_status === 'Available');
      }
      return { rows: result, rowCount: result.length };
    }

    // VEHICLES
    if (/FROM vehicles/i.test(cleanSql)) {
      let result = inMemoryStore.vehicles.map((v) => {
        const d = inMemoryStore.drivers.find((drv) => drv.driver_id === v.driver_id);
        const u = d ? inMemoryStore.users.find((user) => user.user_id === d.user_id) : null;
        return {
          ...v,
          driver_name: u ? u.full_name : 'Unassigned',
          driver_phone: u ? u.phone : '',
        };
      });

      if (/vehicle_id = \$1/i.test(cleanSql)) {
        result = result.filter((v) => v.vehicle_id === parseInt(params[0], 10));
      } else if (/vehicle_type = \$1/i.test(cleanSql)) {
        result = result.filter((v) => v.vehicle_type.toLowerCase() === String(params[0]).toLowerCase());
      }
      return { rows: result, rowCount: result.length };
    }

    // BOOKINGS
    if (/FROM bookings/i.test(cleanSql)) {
      let result = inMemoryStore.bookings.map((b) => {
        const pass = inMemoryStore.users.find((u) => u.user_id === b.user_id) || {};
        const drv = inMemoryStore.drivers.find((d) => d.driver_id === b.assigned_driver_id);
        const drvUser = drv ? inMemoryStore.users.find((u) => u.user_id === drv.user_id) : null;
        const veh = inMemoryStore.vehicles.find((v) => v.vehicle_id === b.assigned_vehicle_id);
        const pay = inMemoryStore.payments.find((p) => p.booking_id === b.booking_id);

        return {
          ...b,
          passenger_name: pass.full_name || 'Passenger',
          passenger_phone: pass.phone || '',
          passenger_email: pass.email || '',
          passenger_type: pass.passenger_type || 'student',
          driver_name: drvUser ? drvUser.full_name : null,
          driver_phone: drvUser ? drvUser.phone : null,
          driver_license: drv ? drv.license_number : null,
          vehicle_model: veh ? veh.vehicle_model : null,
          registration_number: veh ? veh.registration_number : null,
          vehicle_capacity: veh ? veh.capacity : null,
          payment_status: pay ? pay.payment_status : 'Pending',
          payment_amount: pay ? pay.amount : b.total_fare,
        };
      });

      if (/b\.booking_id = \$1/i.test(cleanSql) || /booking_id = \$1/i.test(cleanSql)) {
        result = result.filter((b) => b.booking_id === parseInt(params[0], 10));
      } else if (/user_id = \$1/i.test(cleanSql)) {
        result = result.filter((b) => b.user_id === parseInt(params[0], 10));
      } else if (/assigned_driver_id = \$1/i.test(cleanSql)) {
        result = result.filter((b) => b.assigned_driver_id === parseInt(params[0], 10));
        if (/travel_date = \$2/i.test(cleanSql) && params[1]) {
          result = result.filter((b) => String(b.travel_date) === String(params[1]));
        }
        if (/booking_status IN/i.test(cleanSql)) {
          result = result.filter((b) => ['Confirmed', 'In Progress'].includes(b.booking_status));
        }
        if (/booking_id != \$3/i.test(cleanSql) && params[2]) {
          result = result.filter((b) => b.booking_id !== parseInt(params[2], 10));
        }
      } else if (/assigned_vehicle_id = \$1/i.test(cleanSql)) {
        result = result.filter((b) => b.assigned_vehicle_id === parseInt(params[0], 10));
        if (/travel_date = \$2/i.test(cleanSql) && params[1]) {
          result = result.filter((b) => String(b.travel_date) === String(params[1]));
        }
        if (/booking_status IN/i.test(cleanSql)) {
          result = result.filter((b) => ['Confirmed', 'In Progress'].includes(b.booking_status));
        }
        if (/booking_id != \$3/i.test(cleanSql) && params[2]) {
          result = result.filter((b) => b.booking_id !== parseInt(params[2], 10));
        }
      }

      return { rows: result, rowCount: result.length };
    }

    // PAYMENTS
    if (/FROM payments/i.test(cleanSql)) {
      let result = inMemoryStore.payments.map((p) => {
        const b = inMemoryStore.bookings.find((bk) => bk.booking_id === p.booking_id) || {};
        const pass = inMemoryStore.users.find((u) => u.user_id === p.passenger_id) || {};
        const drv = p.driver_id ? inMemoryStore.drivers.find((d) => d.driver_id === p.driver_id) : null;
        const drvUser = drv ? inMemoryStore.users.find((u) => u.user_id === drv.user_id) : null;

        return {
          ...p,
          service_type: b.service_type || 'Taxi',
          destination: b.destination || 'Kanglung',
          pickup_location: b.pickup_location || 'Campus',
          travel_date: b.travel_date || new Date(),
          passenger_name: pass.full_name || 'Passenger',
          passenger_phone: pass.phone || '',
          driver_name: drvUser ? drvUser.full_name : 'N/A',
        };
      });

      if (/payment_id = \$1/i.test(cleanSql)) {
        result = result.filter((p) => p.payment_id === parseInt(params[0], 10));
      } else if (/passenger_id = \$1/i.test(cleanSql)) {
        result = result.filter((p) => p.passenger_id === parseInt(params[0], 10));
      } else if (/driver_id = \$1/i.test(cleanSql)) {
        result = result.filter((p) => p.driver_id === parseInt(params[0], 10));
      }

      return { rows: result, rowCount: result.length };
    }

    // NOTIFICATIONS
    if (/FROM notifications/i.test(cleanSql)) {
      let result = inMemoryStore.notifications.slice();
      if (/user_id = \$1/i.test(cleanSql)) {
        result = result.filter((n) => n.user_id === parseInt(params[0], 10));
      }
      return { rows: result, rowCount: result.length };
    }
  }

  // 2. INSERT queries
  if (/^INSERT INTO/i.test(cleanSql)) {
    if (/INSERT INTO users/i.test(cleanSql)) {
      const newId = inMemoryStore.users.length + 1;
      const newUser = {
        user_id: newId,
        full_name: params[0],
        email: params[1],
        password_hash: params[2],
        role: params[3],
        passenger_type: params[4] || null,
        phone: params[5],
        status: 'active',
        created_at: new Date(),
      };
      inMemoryStore.users.push(newUser);
      return { rows: [newUser], rowCount: 1 };
    }

    if (/INSERT INTO drivers/i.test(cleanSql)) {
      const newId = inMemoryStore.drivers.length + 1;
      const newDriver = {
        driver_id: newId,
        user_id: parseInt(params[0], 10),
        license_number: params[1],
        verification_status: params[2] || 'Pending',
        availability_status: 'Available',
        weekday_available: true,
        notes: params[3] || '',
        created_at: new Date(),
      };
      inMemoryStore.drivers.push(newDriver);
      return { rows: [newDriver], rowCount: 1 };
    }

    if (/INSERT INTO vehicles/i.test(cleanSql)) {
      const newId = inMemoryStore.vehicles.length + 1;
      const newVehicle = {
        vehicle_id: newId,
        driver_id: params[0] ? parseInt(params[0], 10) : null,
        registration_number: params[1],
        vehicle_model: params[2],
        vehicle_type: params[3],
        capacity: parseInt(params[4], 10),
        availability_status: 'Available',
        description: params[5] || '',
        created_at: new Date(),
      };
      inMemoryStore.vehicles.push(newVehicle);
      return { rows: [newVehicle], rowCount: 1 };
    }

    if (/INSERT INTO bookings/i.test(cleanSql)) {
      const newId = inMemoryStore.bookings.length + 1;
      const newBooking = {
        booking_id: newId,
        user_id: parseInt(params[0], 10),
        service_type: params[1],
        booking_subtype: params[2],
        pickup_location: params[3],
        destination: params[4],
        travel_date: params[5],
        departure_time: params[6],
        passenger_count: parseInt(params[7], 10),
        ride_sharing_opted: !!params[8],
        fare_per_passenger: parseFloat(params[9] || 0),
        total_fare: parseFloat(params[10] || 0),
        trip_purpose: params[11] || '',
        remarks: params[12] || '',
        booking_status: params[13] || 'Pending',
        quotation_status: params[14] || 'None',
        quoted_fare: params[15] ? parseFloat(params[15]) : null,
        assigned_driver_id: params[16] ? parseInt(params[16], 10) : null,
        assigned_vehicle_id: params[17] ? parseInt(params[17], 10) : null,
        admin_notes: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryStore.bookings.unshift(newBooking);

      // Auto create pending payment record
      const payId = inMemoryStore.payments.length + 1;
      inMemoryStore.payments.unshift({
        payment_id: payId,
        booking_id: newId,
        passenger_id: newBooking.user_id,
        driver_id: newBooking.assigned_driver_id,
        amount: newBooking.total_fare,
        payment_method: 'Cash',
        payment_status: 'Pending',
        recorded_by: null,
        notes: null,
        paid_at: null,
        created_at: new Date(),
      });

      return { rows: [newBooking], rowCount: 1 };
    }

    if (/INSERT INTO fare_rates/i.test(cleanSql)) {
      const newId = inMemoryStore.fare_rates.length + 1;
      const newRate = {
        rate_id: newId,
        destination: params[0],
        bus_fare: parseFloat(params[1]),
        taxi_fare: parseFloat(params[2]),
        is_active: true,
        notes: params[3] || '',
        created_at: new Date(),
      };
      inMemoryStore.fare_rates.push(newRate);
      return { rows: [newRate], rowCount: 1 };
    }

    if (/INSERT INTO notifications/i.test(cleanSql)) {
      const newId = inMemoryStore.notifications.length + 1;
      const newNotif = {
        notification_id: newId,
        user_id: parseInt(params[0], 10),
        booking_id: params[1] ? parseInt(params[1], 10) : null,
        title: params[2],
        message: params[3],
        link: params[4] || '',
        is_read: false,
        created_at: new Date(),
      };
      inMemoryStore.notifications.unshift(newNotif);
      return { rows: [newNotif], rowCount: 1 };
    }
  }

  // 3. UPDATE queries
  if (/^UPDATE/i.test(cleanSql)) {
    if (/UPDATE users/i.test(cleanSql)) {
      const idMatch = params[params.length - 1];
      const id = parseInt(idMatch, 10);
      const user = inMemoryStore.users.find((u) => u.user_id === id);
      if (user) {
        if (/status = \$1/i.test(cleanSql)) {
          user.status = params[0];
        }
        if (/full_name = \$1/i.test(cleanSql)) {
          user.full_name = params[0];
          user.phone = params[1];
        }
      }
      return { rows: [user], rowCount: 1 };
    }

    if (/UPDATE bookings/i.test(cleanSql)) {
      let id = null;
      if (/WHERE booking_id = \$(\d+)/i.test(cleanSql)) {
        const match = cleanSql.match(/WHERE booking_id = \$(\d+)/i);
        const pIdx = parseInt(match[1], 10) - 1;
        id = parseInt(params[pIdx], 10);
      } else {
        id = parseInt(params[params.length - 1], 10);
      }

      const booking = inMemoryStore.bookings.find((b) => b.booking_id === id);
      if (booking) {
        if (/quotation_status = 'Accepted'/i.test(cleanSql)) {
          booking.quotation_status = 'Accepted';
        } else if (/quotation_status = 'Declined'/i.test(cleanSql)) {
          booking.quotation_status = 'Declined';
          booking.booking_status = 'Cancelled';
        } else if (/quoted_fare/i.test(cleanSql)) {
          booking.quoted_fare = parseFloat(params[0]);
          booking.total_fare = parseFloat(params[0]);
          booking.quotation_status = 'Quoted';
          booking.admin_notes = params[1] || '';
        }

        if (/booking_status = \$1/i.test(cleanSql)) {
          booking.booking_status = params[0];
        } else if (/booking_status = 'Confirmed'/i.test(cleanSql)) {
          booking.booking_status = 'Confirmed';
        }

        if (/assigned_driver_id = \$1/i.test(cleanSql)) {
          booking.assigned_driver_id = parseInt(params[0], 10);
        }
        if (/assigned_vehicle_id = \$2/i.test(cleanSql)) {
          booking.assigned_vehicle_id = parseInt(params[1], 10);
        }

        booking.updated_at = new Date();
      }
      return { rows: [booking], rowCount: 1 };
    }

    if (/UPDATE drivers/i.test(cleanSql)) {
      const id = parseInt(params[params.length - 1], 10);
      const driver = inMemoryStore.drivers.find((d) => d.driver_id === id);
      if (driver) {
        if (/availability_status = \$1/i.test(cleanSql)) {
          driver.availability_status = params[0];
        }
        if (/weekday_available = \$1/i.test(cleanSql)) {
          driver.weekday_available = !!params[0];
        }
        if (/verification_status = \$1/i.test(cleanSql)) {
          driver.verification_status = params[0];
        }
      }
      return { rows: [driver], rowCount: 1 };
    }

    if (/UPDATE payments/i.test(cleanSql)) {
      const id = parseInt(params[params.length - 1], 10);
      const payment = inMemoryStore.payments.find((p) => p.payment_id === id || p.booking_id === id);
      if (payment) {
        if (/payment_status = 'Paid'/i.test(cleanSql)) {
          payment.payment_status = 'Paid';
          payment.paid_at = new Date();
        } else if (/payment_status = 'Waived'/i.test(cleanSql)) {
          payment.payment_status = 'Waived';
          payment.paid_at = new Date();
        } else if (/payment_status = \$1/i.test(cleanSql)) {
          payment.payment_status = params[0];
          if (params[0] === 'Paid' || params[0] === 'Waived') {
            payment.paid_at = new Date();
          }
        }
      }
      return { rows: [payment], rowCount: 1 };
    }

    if (/UPDATE fare_rates/i.test(cleanSql)) {
      const id = parseInt(params[params.length - 1], 10);
      const rate = inMemoryStore.fare_rates.find((r) => r.rate_id === id);
      if (rate) {
        if (/is_active = NOT is_active/i.test(cleanSql) || /is_active = \$1/i.test(cleanSql)) {
          rate.is_active = !rate.is_active;
        }
      }
      return { rows: [rate], rowCount: 1 };
    }
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  getClient: () => pool.connect(),
  testConnection: async () => {
    try {
      const res = await pool.query('SELECT NOW() AS current_time, current_database() AS db_name');
      pgAvailable = true;
      checkDone = true;
      return { success: true, ...res.rows[0], mode: 'postgresql' };
    } catch (err) {
      pgAvailable = false;
      checkDone = true;
      return {
        success: true,
        current_time: new Date(),
        db_name: 'campus_ride_db (active in-memory fallback)',
        mode: 'fallback',
        warning: err.message,
      };
    }
  },
  pool,
  inMemoryStore,
};
