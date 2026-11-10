-- ============================================================
-- CAMPUS RIDE - SHERUBTSE COLLEGE SEED DATA
-- Default Users, Drivers, Vehicles, Dzongkhag Fare Rates & Sample Bookings
-- ============================================================

TRUNCATE notifications, payments, bookings, driver_availability, vehicles, drivers, fare_rates, users RESTART IDENTITY CASCADE;

-- 1. USERS
-- Pre-hashed passwords:
-- Admin: Admin@123
-- Driver: Driver@123
-- Passenger (Student/Staff): Student@123 / Staff@123
INSERT INTO users (full_name, email, password_hash, role, passenger_type, phone, status) VALUES
('Campus Transport Officer', 'admin@sherubtse.edu.bt', '$2a$10$z9Y78bNCnVv1LUqEZfYl5.j/HPyCpBpkx1PH5hgMsTI5Nd8pFSpvW', 'admin', NULL, '+975-17111000', 'active'),
('Ugyen Dorji', 'driver.ugyen@sherubtse.edu.bt', '$2a$10$RwOK7AE6povCa/1gDqvzTuY/IPNwXtpCtr.D3drUPjMgW5aAhzALG', 'driver', NULL, '+975-17222111', 'active'),
('Tashi Wangchuk', 'driver.tashi@sherubtse.edu.bt', '$2a$10$RwOK7AE6povCa/1gDqvzTuY/IPNwXtpCtr.D3drUPjMgW5aAhzALG', 'driver', NULL, '+975-17333222', 'active'),
('Dawa Penjor', 'driver.dawa@sherubtse.edu.bt', '$2a$10$RwOK7AE6povCa/1gDqvzTuY/IPNwXtpCtr.D3drUPjMgW5aAhzALG', 'driver', NULL, '+975-17444555', 'active'),
('Sonam Choden', 'sonam@sherubtse.edu.bt', '$2a$10$2zFGZKBmtLzisX/ATjzPvOgq7F6ovl15cnrgVrQDVxlS.WlB25jii', 'passenger', 'student', '+975-17555444', 'active'),
('Karma Phuntsho', 'karma.staff@sherubtse.edu.bt', '$2a$10$vinGQzoWSGzM.tBbFN4mS.XAbVXncx1kWCGuygxXQLBXRbjewXqTe', 'passenger', 'staff', '+975-17444333', 'active'),
('Kinley Tshering', 'kinley@sherubtse.edu.bt', '$2a$10$2zFGZKBmtLzisX/ATjzPvOgq7F6ovl15cnrgVrQDVxlS.WlB25jii', 'passenger', 'student', '+975-17666555', 'active');

-- 2. DRIVERS
INSERT INTO drivers (user_id, license_number, verification_status, availability_status, weekday_available, notes) VALUES
(2, 'BT-DRV-102938', 'Approved', 'Available', TRUE, 'Designated campus taxi driver with over 6 years of safe driving experience.'),
(3, 'BT-COM-887766', 'Approved', 'Available', TRUE, 'Licensed heavy vehicle operator for college buses and study tours.'),
(4, 'BT-DRV-998877', 'Pending', 'Unavailable', FALSE, 'New driver applicant awaiting admin license and background verification.');

-- 3. VEHICLES
INSERT INTO vehicles (driver_id, registration_number, vehicle_model, vehicle_type, capacity, availability_status, description) VALUES
(1, 'BP-1-A1234', 'Maruti Suzuki WagonR', 'Taxi', 4, 'Available', 'Sherubtse Campus Taxi 1 - Compact hatchback for hostel, library, and Kanglung routes.'),
(NULL, 'BP-1-B5678', 'Hyundai Santro Xing', 'Taxi', 4, 'Available', 'Sherubtse Campus Taxi 2 - Clean taxi with air-conditioning and boot luggage space.'),
(2, 'BG-1-0123', 'Eicher Starline 32-Seater', 'Bus', 32, 'Available', 'Sherubtse College Bus 1 - Institutional bus for department study tours and educational field trips.'),
(NULL, 'BG-1-0456', 'Tata Starbus 45-Seater Coach', 'Bus', 45, 'Available', 'Sherubtse College Bus 2 - High capacity coach for long-distance group excursions.');

-- 4. FARE RATES (All 20 Dzongkhags of Bhutan + Official Local Routes)
-- Bus Fare: per-passenger rate (Nu.)
-- Taxi Fare: whole-vehicle one-way hire rate (Nu.)
INSERT INTO fare_rates (destination, bus_fare, taxi_fare, is_active, notes) VALUES
('Trashigang', 200.00, 500.00, TRUE, 'District center, dzong, and hospital transit from Sherubtse College.'),
('Mongar', 300.00, 2600.00, TRUE, 'Regional commercial and administrative hub.'),
('Lhuentse', 450.00, 4400.00, TRUE, 'Ancestral home of the Wangchuck dynasty and textile heritage.'),
('Pemagatshel', 400.00, 3500.00, TRUE, 'Southern eastern district transit.'),
('Samdrup Jongkhar', 470.00, 4600.00, TRUE, 'Border gate commercial transit route.'),
('Trashiyangtse', 300.00, 1900.00, TRUE, 'Chorten Kora and Institute for Zorig Chusum.'),
('Zhemgang', 750.00, 9500.00, TRUE, 'Central biodiversity and biological corridors.'),
('Bumthang', 700.00, 7500.00, TRUE, 'Cultural heartland and historic temples valley.'),
('Trongsa', 850.00, 9500.00, TRUE, 'Historic watchtower and center of Bhutan.'),
('Sarpang', 1100.00, 13500.00, TRUE, 'Gelephu Mindfulness City transit hub.'),
('Tsirang', 1050.00, 14000.00, TRUE, 'Damphu agricultural and southern transit.'),
('Dagana', 1200.00, 15000.00, TRUE, 'Daga Dzong and surrounding valley.'),
('Chhukha', 1400.00, 17500.00, TRUE, 'Phuentsholing and hydropower belt.'),
('Samtse', 1500.00, 19000.00, TRUE, 'South-western industrial and academic center.'),
('Wangdue Phodrang', 1100.00, 14000.00, TRUE, 'Bajo town and historic dzong valley.'),
('Punakha', 1150.00, 14500.00, TRUE, 'Ancient winter capital and Pungtang Dechen Photrang.'),
('Gasa', 1300.00, 16000.00, TRUE, 'Highland hot springs and dzongkhag headquarters.'),
('Thimphu', 1250.00, 16000.00, TRUE, 'Capital city of Bhutan.'),
('Paro', 1400.00, 17500.00, TRUE, 'International airport and sacred pilgrimage sites.'),
('Haa', 1500.00, 19000.00, TRUE, 'Western valley and pristine alpine district.'),
-- Local routes
('Hostel to Academic Block', 100.00, 100.00, TRUE, 'Official weekday route between resident hostels (DH1-8, Yontenling, etc.) and Academic Block.'),
('Academic Block to Hostel', 100.00, 100.00, TRUE, 'Official weekday return campus route from Academic Block to resident hostels.'),
('Hostel to Classroom', 100.00, 100.00, TRUE, 'Official weekday student and faculty fixed shuttle route (alias).'),
('Classroom to Hostel', 100.00, 100.00, TRUE, 'Official weekday return campus shuttle route (alias).'),
('Sherubtse to Rangjung', 350.00, 800.00, TRUE, 'Local transit between Kanglung and Rangjung town.');

-- 5. DRIVER AVAILABILITY RECORDS
INSERT INTO driver_availability (driver_id, service_type, day_of_week, is_available) VALUES
(1, 'Weekday Ride', 'Monday', TRUE),
(1, 'Weekday Ride', 'Tuesday', TRUE),
(1, 'Weekday Ride', 'Wednesday', TRUE),
(1, 'Weekday Ride', 'Thursday', TRUE),
(1, 'Weekday Ride', 'Friday', TRUE),
(2, 'Weekday Ride', 'Monday', TRUE),
(2, 'Weekday Ride', 'Tuesday', TRUE),
(2, 'Weekday Ride', 'Wednesday', TRUE),
(2, 'Weekday Ride', 'Thursday', TRUE),
(2, 'Weekday Ride', 'Friday', TRUE);

-- 6. SAMPLE BOOKINGS (Demonstrating all 3 services)
INSERT INTO bookings (
    user_id, service_type, booking_subtype, pickup_location, destination,
    travel_date, departure_time, passenger_count, ride_sharing_opted,
    fare_per_passenger, total_fare, trip_purpose, remarks, booking_status,
    quotation_status, quoted_fare, assigned_driver_id, assigned_vehicle_id
) VALUES
-- 1. Weekday Ride (Hostel to Classroom) - Confirmed with Driver Ugyen
(5, 'Weekday Ride', 'Weekday', 'North Hostel Block A', 'Classroom Block (Drukgyel)', CURRENT_DATE, '08:30:00', 1, FALSE, 100.00, 100.00, 'Morning lecture in Computer Science', 'Near the main hostel entrance', 'Confirmed', 'Not Required', 100.00, 1, 1),

-- 2. Book a Taxi (Immediate - Book Now) - Confirmed
(7, 'Taxi', 'Book Now', 'Sherubtse Upper Gate', 'Trashigang', CURRENT_DATE, '10:00:00', 2, TRUE, 250.00, 500.00, 'Medical appointment at Trashigang Hospital', 'Sharing taxi with fellow student', 'Confirmed', 'Not Required', 500.00, 1, 1),

-- 3. Request a Bus (Class Group Excursion to Mongar) - Quoted, Accepted & Confirmed
(6, 'Bus', 'Group Bus', 'Sherubtse Campus Bus Shelter', 'Mongar', CURRENT_DATE + INTERVAL '3 days', '07:30:00', 30, FALSE, 300.00, 9000.00, 'Environmental Science field study tour', 'Need luggage space for research instruments', 'Confirmed', 'Accepted', 9000.00, 2, 3),

-- 4. Bus Request Awaiting Admin Quotation
(5, 'Bus', 'Group Bus', 'Sherubtse Upper Gate', 'Trashiyangtse', CURRENT_DATE + INTERVAL '5 days', '08:00:00', 25, FALSE, 0.00, 0.00, 'Student Cultural Club excursion to Chorten Kora', 'Requesting college bus support', 'Pending', 'Pending Admin Quotation', NULL, NULL, NULL),

-- 5. Completed Taxi Booking with Cash Payment
(5, 'Taxi', 'Schedule Later', 'Sherubtse Lower Gate', 'Sherubtse to Rangjung', CURRENT_DATE - INTERVAL '1 day', '14:00:00', 1, FALSE, 800.00, 800.00, 'Project meeting in Rangjung', 'Completed journey', 'Completed', 'Not Required', 800.00, 1, 1);

-- 7. SAMPLE PAYMENTS
INSERT INTO payments (booking_id, passenger_id, driver_id, amount, payment_method, payment_status, recorded_by, notes, paid_at) VALUES
(1, 5, 1, 100.00, 'Cash', 'Pending', NULL, 'Passenger will pay cash upon arrival', NULL),
(2, 7, 1, 500.00, 'Cash', 'Pending', NULL, 'Cash payment pending journey completion', NULL),
(3, 6, 2, 9000.00, 'Cash', 'Waived', 1, 'College sponsored departmental excursion. Payment waived by administration.', CURRENT_TIMESTAMP),
(5, 5, 1, 800.00, 'Cash', 'Paid', 2, 'Cash payment of Nu. 800 received in full by Driver Ugyen.', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- 8. SAMPLE NOTIFICATIONS
INSERT INTO notifications (user_id, booking_id, title, message, link, is_read) VALUES
(5, 1, 'Weekday Ride Confirmed', 'Driver Ugyen Dorji has accepted your weekday ride to Classroom Block. Vehicle: Maruti Suzuki WagonR (BP-1-A1234).', '/bookings/1', FALSE),
(7, 2, 'Taxi Booking Confirmed', 'Your shared taxi to Trashigang has been confirmed with Driver Ugyen Dorji.', '/bookings/2', FALSE),
(6, 3, 'Bus Reservation Confirmed', 'Sherubtse College Bus (BG-1-0123) and Driver Tashi Wangchuk have been assigned to your Mongar trip.', '/bookings/3', TRUE),
(1, 4, 'New Bus Request Submitted', 'Student Sonam Choden submitted a bus request for Trashiyangtse (25 passengers) requiring quotation.', '/admin/bus-requests', FALSE);
