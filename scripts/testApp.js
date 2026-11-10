const bcrypt = require('bcryptjs');
const UserModel = require('../src/models/userModel');
const TripModel = require('../src/models/tripModel');
const BookingModel = require('../src/models/bookingModel');
const FeedbackModel = require('../src/models/feedbackModel');
const StopModel = require('../src/models/stopModel');
const RouteModel = require('../src/models/routeModel');
const VehicleModel = require('../src/models/vehicleModel');

async function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING AUTOMATED BACKEND INTEGRATION TESTS');
  console.log('========================================================');

  try {
    // 1. Test User authentication
    console.log('\n[1/5] Testing User Authentication & Password Hashing...');
    const student = await UserModel.findByEmail('alice@campus.edu');
    if (!student) throw new Error('Student Alice not found in database.');
    const match = await bcrypt.compare('Student@123', student.password_hash);
    if (!match) throw new Error('Bcrypt password verification failed.');
    console.log(`  ✅ Student verified: ${student.full_name} (${student.email}), role=${student.role}`);

    // 2. Test Trips & Stops Queries
    console.log('\n[2/5] Testing Route, Stop & Trip Queries...');
    const stops = await StopModel.getAll();
    const trips = await TripModel.getUpcoming();
    console.log(`  ✅ Found ${stops.length} campus stops and ${trips.length} upcoming scheduled trips.`);
    if (trips.length === 0) throw new Error('Expected at least 1 upcoming trip.');
    const testTrip = trips[0];
    console.log(`  ✅ Sample Trip: "${testTrip.route_name}" with ${testTrip.available_seats} seats available.`);

    // 3. Test Atomic Booking Concurrency & Seat Decrement
    console.log('\n[3/5] Testing Atomic Transaction Seat Booking...');
    const initialSeats = testTrip.available_seats;
    const testPassenger = await UserModel.findByEmail('carol@campus.edu');
    
    const newBooking = await BookingModel.createWithTransaction({
      tripId: testTrip.id,
      passengerId: testPassenger.id,
      seatsBooked: 2,
    });
    console.log(`  ✅ Reservation created with code: ${newBooking.booking_code}`);

    const updatedTrip = await TripModel.getById(testTrip.id);
    if (updatedTrip.available_seats !== initialSeats - 2) {
      throw new Error(`Seat decrement mismatch: expected ${initialSeats - 2}, got ${updatedTrip.available_seats}`);
    }
    console.log(`  ✅ Seat count decremented properly: ${initialSeats} ➔ ${updatedTrip.available_seats}`);

    // 4. Test Atomic Cancellation & Seat Restoration
    console.log('\n[4/5] Testing Atomic Cancellation & Seat Refund...');
    await BookingModel.cancelWithTransaction(newBooking.id, testPassenger.id, false, 'Integration test cancellation');
    const restoredTrip = await TripModel.getById(testTrip.id);
    if (restoredTrip.available_seats !== initialSeats) {
      throw new Error(`Seat restoration mismatch: expected ${initialSeats}, got ${restoredTrip.available_seats}`);
    }
    console.log(`  ✅ Seat successfully refunded: back to ${restoredTrip.available_seats} seats.`);

    // 5. Test Admin KPI & Driver Manifest
    console.log('\n[5/5] Testing Admin KPI Aggregations & Driver Manifests...');
    const userStats = await UserModel.countStats();
    const bookingStats = await BookingModel.countStats();
    const manifest = await BookingModel.getTripPassengerManifest(testTrip.id);
    console.log(`  ✅ Admin User Stats: ${JSON.stringify(userStats)}`);
    console.log(`  ✅ Admin Booking Stats: ${JSON.stringify(bookingStats)}`);
    console.log(`  ✅ Driver Manifest for Trip #${testTrip.id}: ${manifest.length} registered passenger(s).`);

    console.log('\n========================================================');
    console.log('🎉 ALL 5 INTEGRATION SUITES PASSED FLAWLESSLY!');
    console.log('========================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
