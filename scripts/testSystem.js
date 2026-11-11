const bcrypt = require('bcryptjs');
const db = require('../config/database');
const userModel = require('../models/userModel');
const driverModel = require('../models/driverModel');
const vehicleModel = require('../models/vehicleModel');
const fareRateModel = require('../models/fareRateModel');
const bookingModel = require('../models/bookingModel');
const paymentModel = require('../models/paymentModel');
const notificationModel = require('../models/notificationModel');

async function runTestSuite() {
  console.log('========================================================');
  console.log('🧪 TESTING SHERUBTSE CAMPUS RIDE SYSTEM');
  console.log('Node.js + Express + EJS + PostgreSQL (MVC)');
  console.log('Weekday Rides • Taxis (20 Dzongkhags) • Campus Buses');
  console.log('========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      throw new Error(message);
    }
    passedTests++;
    console.log(`  ✅ PASSED: ${message}`);
  }

  try {
    // -----------------------------------------------------------
    // TEST 1: Database Connectivity Check
    // -----------------------------------------------------------
    console.log('[TEST 1] Verifying Database System Connectivity...');
    const conn = await db.testConnection();
    assert(conn.success === true, `Database online (${conn.db_name})`);

    // -----------------------------------------------------------
    // TEST 2: User Roles & Authentication (Passenger, Driver, Admin)
    // -----------------------------------------------------------
    console.log('\n[TEST 2] Verifying 3 User Roles (Passenger Student/Staff, Driver, Admin)...');
    
    // Admin check
    const admin = await userModel.findByEmail('admin@sherubtse.edu.bt');
    assert(admin !== null && admin.role === 'admin', 'Admin account verified');
    const isAdminPassValid = await bcrypt.compare('Admin@123', admin.password_hash);
    assert(isAdminPassValid, 'Admin password hashes correctly (Admin@123)');

    // Passenger (Student) check
    const student = await userModel.findByEmail('sonam@sherubtse.edu.bt');
    assert(student !== null && student.role === 'passenger' && student.passenger_type === 'student', 'Student passenger account verified');
    const isStudentPassValid = await bcrypt.compare('Student@123', student.password_hash);
    assert(isStudentPassValid, 'Student password hashes correctly (Student@123)');

    // Passenger (Staff) check
    const staff = await userModel.findByEmail('karma.staff@sherubtse.edu.bt');
    assert(staff !== null && staff.role === 'passenger' && staff.passenger_type === 'staff', 'Staff passenger account verified');

    // Driver check
    const driverUser = await userModel.findByEmail('driver.ugyen@sherubtse.edu.bt');
    assert(driverUser !== null && driverUser.role === 'driver', 'Driver user account verified');
    const driverRecord = await driverModel.getByUserId(driverUser.user_id);
    assert(driverRecord !== null && driverRecord.verification_status === 'Approved', 'Driver verified and approved by Admin');

    // -----------------------------------------------------------
    // TEST 3: Fare Rates for all 20 Dzongkhags & Local Routes
    // -----------------------------------------------------------
    console.log('\n[TEST 3] Verifying 20 Dzongkhags Fare Chart & Calculations...');
    const allRates = await fareRateModel.getAllActive();
    assert(allRates.length >= 20, `Retrieved ${allRates.length} active destinations (all 20 Dzongkhags + campus routes)`);

    // Verify sample Dzongkhags from Table 5.1
    const trashigang = await fareRateModel.getByDestination('Trashigang');
    assert(trashigang && parseFloat(trashigang.bus_fare) === 200 && parseFloat(trashigang.taxi_fare) === 500, 'Trashigang fare: Bus Nu. 200, Taxi Nu. 500');

    const mongar = await fareRateModel.getByDestination('Mongar');
    assert(mongar && parseFloat(mongar.bus_fare) === 300 && parseFloat(mongar.taxi_fare) === 2600, 'Mongar fare: Bus Nu. 300, Taxi Nu. 2600');

    const thimphu = await fareRateModel.getByDestination('Thimphu');
    assert(thimphu && parseFloat(thimphu.bus_fare) === 1250 && parseFloat(thimphu.taxi_fare) === 16000, 'Thimphu fare: Bus Nu. 1250, Taxi Nu. 16000');

    // -----------------------------------------------------------
    // TEST 4: Weekday Rides (Hostel ⇄ Academic Block)
    // -----------------------------------------------------------
    console.log('\n[TEST 4] Testing Weekday Rides...');
    const weekdayDrivers = await driverModel.getAvailableWeekdayDrivers();
    assert(weekdayDrivers.length > 0, `Found ${weekdayDrivers.length} verified drivers available for weekday rides`);

    const weekdayFare = await fareRateModel.calculateFare('Weekday Ride', 'Hostel to Classroom', 1, false);
    assert(weekdayFare.totalFare === 100.00, `Weekday campus ride fare is strictly fixed at Nu. ${weekdayFare.totalFare}`);

    // Create a Weekday Ride Booking
    const weekdayBooking = await bookingModel.create({
      userId: student.user_id,
      serviceType: 'Weekday Ride',
      bookingSubtype: 'Weekday',
      pickupLocation: 'North Hostel Block A',
      destination: 'Hostel to Classroom',
      travelDate: new Date().toISOString().split('T')[0],
      departureTime: '08:45:00',
      passengerCount: 1,
      rideSharingOpted: false,
      farePerPassenger: 100.00,
      totalFare: 100.00,
      tripPurpose: 'Morning Computer Science lecture',
      assignedDriverId: driverRecord.driver_id,
      assignedVehicleId: driverRecord.vehicle_id,
      bookingStatus: 'Pending',
    });
    assert(weekdayBooking && weekdayBooking.booking_id, `Weekday booking created (#${weekdayBooking.booking_id}) with Pending status`);

    // -----------------------------------------------------------
    // TEST 5: Taxi Booking (Whole Taxi Hire vs Shared Fare Splitting)
    // -----------------------------------------------------------
    console.log('\n[TEST 5] Testing Taxi Booking & Fare Splitting...');
    // Whole taxi hire for 1 pax
    const wholeTaxiFare = await fareRateModel.calculateFare('Taxi', 'Trashigang', 1, false);
    assert(wholeTaxiFare.totalFare === 500.00 && wholeTaxiFare.farePerPassenger === 500.00, 'Whole taxi hire to Trashigang is Nu. 500');

    // Shared taxi hire split among 2 passengers
    const sharedTaxi2Pax = await fareRateModel.calculateFare('Taxi', 'Trashigang', 2, true);
    assert(sharedTaxi2Pax.totalFare === 500.00 && sharedTaxi2Pax.farePerPassenger === 250.00, 'Shared taxi for 2 pax splits fare to Nu. 250/pax');

    // Shared taxi hire split among 4 passengers
    const sharedTaxi4Pax = await fareRateModel.calculateFare('Taxi', 'Trashigang', 4, true);
    assert(sharedTaxi4Pax.totalFare === 500.00 && sharedTaxi4Pax.farePerPassenger === 125.00, 'Shared taxi for 4 pax splits fare to Nu. 125/pax');

    // Unlisted custom destination quotation test
    const customFare = await fareRateModel.calculateFare('Taxi', 'Unlisted Village XYZ', 2, false);
    assert(customFare.isQuotationRequired === true, 'Unlisted destination correctly triggers Admin Quotation requirement');

    // -----------------------------------------------------------
    // TEST 6: Campus Bus Booking & Admin Workflow
    // -----------------------------------------------------------
    console.log('\n[TEST 6] Testing Campus Bus & Admin Quotation...');
    const busReq = await bookingModel.create({
      userId: staff.user_id,
      serviceType: 'Bus',
      bookingSubtype: 'Group Bus',
      pickupLocation: 'Sherubtse Upper Gate',
      destination: 'Mongar',
      travelDate: new Date(Date.now() + 86400000 * (15 + Math.floor(Math.random() * 1000))).toISOString().split('T')[0],
      departureTime: '08:00:00',
      passengerCount: 30,
      tripPurpose: 'Department of Life Science field survey',
      bookingStatus: 'Pending',
      quotationStatus: 'Pending Admin Quotation',
    });
    assert(busReq.quotation_status === 'Pending Admin Quotation', 'Bus request created with "Pending Admin Quotation"');

    // Admin provides quotation
    await bookingModel.provideQuotation(busReq.booking_id, 9000.00, 'Standard institutional bus quote for 30 pax');
    const quotedBooking = await bookingModel.getById(busReq.booking_id);
    assert(quotedBooking.quotation_status === 'Quoted' && parseFloat(quotedBooking.quoted_fare) === 9000.00, 'Admin quotation provided: Nu. 9000');

    // Passenger accepts quotation
    await bookingModel.acceptQuotation(busReq.booking_id, staff.user_id);
    const acceptedBooking = await bookingModel.getById(busReq.booking_id);
    assert(acceptedBooking.quotation_status === 'Accepted', 'Passenger successfully accepted quotation');

    // Admin assigns bus and driver
    const busVehicles = await vehicleModel.getAvailableVehicles('Bus');
    assert(busVehicles.length > 0, `Found ${busVehicles.length} available campus buses`);
    const busDriver = await driverModel.getById(2); // Driver Tashi (Bus driver)

    await bookingModel.assignDriverAndVehicle(busReq.booking_id, busDriver.driver_id, busVehicles[0].vehicle_id, 'Assigned by Transport Officer');
    const confirmedBus = await bookingModel.getById(busReq.booking_id);
    assert(confirmedBus.booking_status === 'Confirmed', 'Bus reservation successfully Confirmed with vehicle and driver assigned');

    // -----------------------------------------------------------
    // TEST 7: Driver Actions & Cash Payment Lifecycle
    // -----------------------------------------------------------
    console.log('\n[TEST 7] Testing Driver Actions, Status Updates & Cash Payment...');
    
    // Driver accepts weekday request
    await bookingModel.acceptDriverRequest(weekdayBooking.booking_id, driverRecord.driver_id, driverRecord.vehicle_id);
    let trip = await bookingModel.getById(weekdayBooking.booking_id);
    assert(trip.booking_status === 'Confirmed', 'Driver accepted ride -> status is Confirmed');

    // Driver updates status to In Progress
    await bookingModel.updateStatus(weekdayBooking.booking_id, 'In Progress');
    trip = await bookingModel.getById(weekdayBooking.booking_id);
    assert(trip.booking_status === 'In Progress', 'Driver updated status to In Progress');

    // Driver updates status to Completed
    await bookingModel.updateStatus(weekdayBooking.booking_id, 'Completed');
    trip = await bookingModel.getById(weekdayBooking.booking_id);
    assert(trip.booking_status === 'Completed', 'Driver updated status to Completed');

    // Verify Payment status is separate (should still be Pending before driver records cash)
    let payment = await paymentModel.getByBookingId(weekdayBooking.booking_id);
    assert(payment && payment.payment_status === 'Pending', 'Payment status is initially Pending (maintained separately from booking status)');

    // Driver records cash payment
    await paymentModel.recordCashPayment(weekdayBooking.booking_id, driverUser.user_id, 'Nu. 100 cash received by Driver Ugyen');
    payment = await paymentModel.getByBookingId(weekdayBooking.booking_id);
    assert(payment.payment_status === 'Paid', 'Driver recorded cash payment -> status updated to Paid');

    // -----------------------------------------------------------
    // TEST 8: Administrative Functions & Safety Controls
    // -----------------------------------------------------------
    console.log('\n[TEST 8] Testing Admin Driver Verification, Passenger Status & Waivers...');
    
    // Toggle passenger status (Suspend / Activate)
    await userModel.updateStatus(student.user_id, 'suspended');
    let updatedStudent = await userModel.findById(student.user_id);
    assert(updatedStudent.status === 'suspended', 'Admin suspended student account');
    await userModel.updateStatus(student.user_id, 'active');
    updatedStudent = await userModel.findById(student.user_id);
    assert(updatedStudent.status === 'active', 'Admin re-activated student account');

    // Admin verifies driver (Approve driver)
    const newDriver = await driverModel.getById(3); // Driver Dawa
    await driverModel.updateVerificationStatus(newDriver.driver_id, 'Approved');
    const approvedDriver = await driverModel.getById(3);
    assert(approvedDriver.verification_status === 'Approved', 'Admin successfully approved pending driver');

    // Admin marks payment as Waived for institutional bus
    const busPayment = await paymentModel.getByBookingId(busReq.booking_id);
    if (busPayment) {
      await paymentModel.markStatus(busPayment.payment_id, 'Waived', admin.user_id, 'Sponsored study tour waiver');
      const waivedPay = await paymentModel.getByBookingId(busReq.booking_id);
      assert(waivedPay.payment_status === 'Waived', 'Admin marked institutional bus payment as Waived');
    }

    console.log('\n========================================================');
    console.log(`🎉 ALL ${totalTests} TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests})`);
    console.log('Sherubtse Campus Ride System is verified & production ready!');
    console.log('========================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
    process.exit(1);
  }
}

runTestSuite();
