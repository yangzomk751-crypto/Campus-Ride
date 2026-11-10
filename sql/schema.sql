-- ============================================================
-- CAMPUS RIDE - SHERUBTSE COLLEGE, KANGLUNG, BHUTAN
-- Transport Booking System Database Schema (PostgreSQL)
-- Supports Weekday Rides, Taxis, and Campus Buses
-- ============================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS driver_availability CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS fare_rates CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
-- Roles: passenger (student/staff), driver, admin
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
    passenger_type VARCHAR(20) CHECK (passenger_type IN ('student', 'staff')),
    phone VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. DRIVERS TABLE
CREATE TABLE drivers (
    driver_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    license_number VARCHAR(50) NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Approved', 'Rejected', 'Deactivated')),
    availability_status VARCHAR(20) DEFAULT 'Available' CHECK (availability_status IN ('Available', 'Unavailable')),
    weekday_available BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. VEHICLES TABLE
CREATE TABLE vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(driver_id) ON DELETE SET NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL CHECK (vehicle_type IN ('Taxi', 'Bus', 'Van', 'Car')),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    availability_status VARCHAR(20) DEFAULT 'Available' CHECK (availability_status IN ('Available', 'Unavailable', 'Maintenance')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. FARE RATES TABLE (All 20 Dzongkhags of Bhutan + Local Routes)
CREATE TABLE fare_rates (
    rate_id SERIAL PRIMARY KEY,
    destination VARCHAR(100) NOT NULL UNIQUE,
    bus_fare NUMERIC(10,2) NOT NULL,    -- per-passenger rate
    taxi_fare NUMERIC(10,2) NOT NULL,   -- whole-vehicle one-way hire rate
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. BOOKINGS TABLE
-- Services: Weekday Ride, Taxi, Bus
-- Subtypes: Weekday, Book Now, Schedule Later, Group Bus
-- Statuses: Pending, Confirmed, Rejected, Cancelled, In Progress, Completed
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    service_type VARCHAR(30) NOT NULL CHECK (service_type IN ('Weekday Ride', 'Taxi', 'Bus')),
    booking_subtype VARCHAR(30) CHECK (booking_subtype IN ('Weekday', 'Book Now', 'Schedule Later', 'Group Bus')),
    pickup_location VARCHAR(150) NOT NULL,
    destination VARCHAR(150) NOT NULL,
    travel_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    passenger_count INTEGER NOT NULL CHECK (passenger_count > 0),
    ride_sharing_opted BOOLEAN DEFAULT FALSE,
    fare_per_passenger NUMERIC(10,2) DEFAULT 0.00,
    total_fare NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    trip_purpose TEXT,
    remarks TEXT,
    booking_status VARCHAR(20) DEFAULT 'Pending' CHECK (booking_status IN ('Pending', 'Confirmed', 'Rejected', 'Cancelled', 'In Progress', 'Completed')),
    quotation_status VARCHAR(30) DEFAULT 'Not Required' CHECK (quotation_status IN ('None', 'Not Required', 'Pending Admin Quotation', 'Quoted', 'Accepted', 'Declined')),
    quoted_fare NUMERIC(10,2),
    assigned_driver_id INTEGER REFERENCES drivers(driver_id) ON DELETE SET NULL,
    assigned_vehicle_id INTEGER REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    admin_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. PAYMENTS TABLE
-- Cash payment system, maintained separately from booking status
-- Statuses: Pending, Paid, Waived
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INTEGER UNIQUE NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    passenger_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    driver_id INTEGER REFERENCES drivers(driver_id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) DEFAULT 'Cash',
    payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Waived')),
    recorded_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. DRIVER AVAILABILITY TABLE
CREATE TABLE driver_availability (
    availability_id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL REFERENCES drivers(driver_id) ON DELETE CASCADE,
    service_type VARCHAR(30) DEFAULT 'Weekday Ride',
    day_of_week VARCHAR(15) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'All')),
    is_available BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(booking_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_service ON bookings(service_type);
CREATE INDEX idx_bookings_date ON bookings(travel_date);
CREATE INDEX idx_bookings_driver ON bookings(assigned_driver_id);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
