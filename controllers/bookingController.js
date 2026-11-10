const bookingModel = require('../models/bookingModel');
const driverModel = require('../models/driverModel');
const vehicleModel = require('../models/vehicleModel');
const fareRateModel = require('../models/fareRateModel');
const paymentModel = require('../models/paymentModel');
const notificationModel = require('../models/notificationModel');

const bookingController = {
  // 1. PASSENGER DASHBOARD OVERVIEW
  async getDashboard(req, res) {
    try {
      const userId = req.session.user.id;
      const recentBookings = await bookingModel.getUserBookings(userId, 'all');
      const activeBookings = recentBookings.filter((b) =>
        ['Pending', 'Confirmed', 'In Progress'].includes(b.booking_status)
      );

      const payments = await paymentModel.getUserPayments(userId);
      const pendingPayments = payments.filter((p) => p.payment_status === 'Pending');

      const weekdayDrivers = await driverModel.getAvailableWeekdayDrivers();
      const allRates = await fareRateModel.getAllActive();

      res.render('student/dashboard', {
        title: 'Passenger Dashboard | Sherubtse Campus Ride',
        activeBookings,
        recentBookings: recentBookings.slice(0, 5),
        payments: payments.slice(0, 5),
        pendingPaymentsCount: pendingPayments.length,
        weekdayDriversCount: weekdayDrivers.length,
        ratesCount: allRates.length,
      });
    } catch (err) {
      console.error('Passenger dashboard error:', err);
      req.flash('error_msg', 'Could not load passenger dashboard.');
      res.redirect('/');
    }
  },

  // 2. AVAILABLE WEEKDAY RIDES (Hostel ⇄ Academic Block)
  async getWeekdayRides(req, res) {
    try {
      const availableDrivers = await driverModel.getAvailableWeekdayDrivers();
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 is Sun, 6 is Sat
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

      const hostels = [
        'DH1',
        'DH6',
        'DH7',
        'DH8',
        'Yontenling',
        'Rabtenling',
        'Gakiling',
        'Dekiling',
        'Pemaling',
        'Tshogyeling',
        'Yeatsholing',
        'Gatsheling',
      ];
      const campusLocations = hostels.map((h) => `${h} Hostel`).concat(['Academic Block']);

      res.render('student/weekdayRides', {
        title: 'Available Weekday Rides | Sherubtse Campus Ride',
        availableDrivers,
        isWeekday,
        hostels,
        campusLocations,
        fixedFare: 100.00,
        currentDay: today.toLocaleDateString('en-US', { weekday: 'long' }),
      });
    } catch (err) {
      console.error('Weekday rides error:', err);
      req.flash('error_msg', 'Could not load weekday rides.');
      res.redirect('/dashboard');
    }
  },

  async postWeekdayRide(req, res) {
    try {
      const userId = req.session.user.id;
      const { routeDirection, hostelName, pickupLocation, driverId, remarks } = req.body;

      // Check Monday to Friday restriction
      const today = new Date();
      const dayOfWeek = today.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        req.flash('error_msg', 'Weekday rides between Hostel and Academic Block operate Monday to Friday only.');
        return res.redirect('/weekday-rides');
      }

      if (!driverId) {
        req.flash('error_msg', 'Please select an available driver.');
        return res.redirect('/weekday-rides');
      }

      // Check chosen driver
      const selectedDriver = await driverModel.getById(parseInt(driverId, 10));
      if (!selectedDriver || selectedDriver.availability_status !== 'Available' || !selectedDriver.weekday_available) {
        req.flash('error_msg', 'The selected driver is currently unavailable for weekday rides.');
        return res.redirect('/weekday-rides');
      }

      const selectedHostel = hostelName || pickupLocation || 'DH1';
      const isToAcademic = routeDirection
        ? (routeDirection.includes('Academic') ? routeDirection.includes('to Academic') || routeDirection.includes('Hostel to') : routeDirection === 'Hostel to Classroom')
        : true;

      let pickup;
      let destination;
      if (isToAcademic) {
        pickup = `${selectedHostel} Hostel`;
        destination = 'Academic Block';
      } else {
        pickup = 'Academic Block';
        destination = `${selectedHostel} Hostel`;
      }

      const currentTimeStr = today.toTimeString().split(' ')[0].substring(0, 5);
      const currentDateStr = today.toISOString().split('T')[0];

      const booking = await bookingModel.create({
        userId,
        serviceType: 'Weekday Ride',
        bookingSubtype: 'Weekday',
        pickupLocation: pickup,
        destination,
        travelDate: currentDateStr,
        departureTime: currentTimeStr,
        passengerCount: 1,
        rideSharingOpted: false,
        farePerPassenger: 100.00,
        totalFare: 100.00,
        tripPurpose: `Regular Weekday Campus Transit: ${pickup} → ${destination}`,
        remarks: remarks || `Weekday ride between ${selectedHostel} Hostel and Academic Block`,
        bookingStatus: 'Pending',
        quotationStatus: 'Not Required',
        quotedFare: 100.00,
        assignedDriverId: selectedDriver.driver_id,
        assignedVehicleId: selectedDriver.vehicle_id,
      });

      // Send notification to driver
      await notificationModel.create({
        userId: selectedDriver.user_id,
        bookingId: booking.booking_id,
        title: 'New Weekday Ride Request',
        message: `Passenger ${req.session.user.fullName} requested a Nu. 100 weekday ride (${pickup} → ${destination}). Please accept or reject.`,
        link: '/driver/requests',
      });

      req.flash(
        'success_msg',
        `Weekday ride request (#${booking.booking_id}) submitted to Driver ${selectedDriver.full_name}! Route: ${pickup} → ${destination} (Fixed fare: Nu. 100). Waiting for driver confirmation.`
      );
      res.redirect(`/bookings/${booking.booking_id}`);
    } catch (err) {
      console.error('Weekday ride booking error:', err);
      req.flash('error_msg', 'Failed to submit weekday ride: ' + err.message);
      res.redirect('/weekday-rides');
    }
  },

  // 3. BOOK A TAXI (Book Now or Schedule for Later)
  async getTaxiBookingForm(req, res) {
    try {
      const activeRates = await fareRateModel.getAllActive();
      const campusLocations = [
        'Academic Block',
        'DH1 Hostel',
        'DH6 Hostel',
        'DH7 Hostel',
        'DH8 Hostel',
        'Yontenling Hostel',
        'Rabtenling Hostel',
        'Gakiling Hostel',
        'Dekiling Hostel',
        'Pemaling Hostel',
        'Tshogyeling Hostel',
        'Yeatsholing Hostel',
        'Gatsheling Hostel',
        'Sherubtse Upper Gate Parking',
        'Sherubtse Lower Gate',
        'College Central Cafeteria',
        'Kanglung Town Market Gate',
        'Kanglung Hospital',
      ];

      res.render('student/taxiBooking', {
        title: 'Book a Taxi | Sherubtse Campus Ride',
        rates: activeRates,
        locations: campusLocations,
        formData: {},
      });
    } catch (err) {
      console.error('Taxi form error:', err);
      req.flash('error_msg', 'Could not load taxi booking form.');
      res.redirect('/dashboard');
    }
  },

  async postTaxiBooking(req, res) {
    try {
      const userId = req.session.user.id;
      const {
        bookingMode, // 'Book Now' or 'Schedule Later'
        pickupLocation,
        destinationSelect,
        customDestination,
        travelDate,
        departureTime,
        passengerCount,
        rideSharingOpted,
        remarks,
      } = req.body;

      if (!pickupLocation) {
        req.flash('error_msg', 'Pickup location is required.');
        return res.redirect('/book-taxi');
      }

      const destination = destinationSelect === 'OTHER' ? (customDestination || '').trim() : destinationSelect;
      if (!destination) {
        req.flash('error_msg', 'Please select or provide a destination.');
        return res.redirect('/book-taxi');
      }

      const count = parseInt(passengerCount, 10) || 1;
      if (count < 1 || count > 4) {
        req.flash('error_msg', 'Taxi passenger capacity is 1 to 4 passengers.');
        return res.redirect('/book-taxi');
      }

      const isSharing = rideSharingOpted === 'true' || rideSharingOpted === true;
      const isBookNow = bookingMode === 'Book Now';

      const today = new Date();
      const finalTravelDate = isBookNow ? today.toISOString().split('T')[0] : travelDate;
      const finalDepartureTime = isBookNow
        ? today.toTimeString().split(' ')[0].substring(0, 5)
        : departureTime;

      if (!finalTravelDate || !finalDepartureTime) {
        req.flash('error_msg', 'Please specify travel date and preferred departure time.');
        return res.redirect('/book-taxi');
      }

      // Calculate fare server-side
      const fareInfo = await fareRateModel.calculateFare('Taxi', destination, count, isSharing);

      const quotationStatus = fareInfo.isQuotationRequired ? 'Pending Admin Quotation' : 'Not Required';
      const bookingStatus = 'Pending';

      const booking = await bookingModel.create({
        userId,
        serviceType: 'Taxi',
        bookingSubtype: isBookNow ? 'Book Now' : 'Schedule Later',
        pickupLocation,
        destination,
        travelDate: finalTravelDate,
        departureTime: finalDepartureTime,
        passengerCount: count,
        rideSharingOpted: isSharing,
        farePerPassenger: fareInfo.farePerPassenger,
        totalFare: fareInfo.totalFare,
        tripPurpose: isSharing ? 'Shared Taxi Ride' : 'Full Taxi Hire',
        remarks: remarks || '',
        bookingStatus,
        quotationStatus,
        quotedFare: fareInfo.isQuotationRequired ? null : fareInfo.totalFare,
      });

      if (fareInfo.isQuotationRequired) {
        // Notify admin for custom fare quotation
        await notificationModel.create({
          userId: 1,
          bookingId: booking.booking_id,
          title: 'Custom Destination Quotation Needed',
          message: `Taxi booking #${booking.booking_id} to unlisted destination "${destination}" requires a fare quote.`,
          link: '/admin/quotations',
        });

        req.flash(
          'info_msg',
          `Your taxi request to "${destination}" has been submitted (#${booking.booking_id}). Because this destination is unlisted, the Transport Admin will review and provide a fare quotation shortly.`
        );
      } else {
        // Send alert to verified drivers
        const eligibleDrivers = await driverModel.getAvailableDrivers('Taxi');
        for (const drv of eligibleDrivers) {
          await notificationModel.create({
            userId: drv.user_id,
            bookingId: booking.booking_id,
            title: `Incoming Taxi Request (${bookingMode})`,
            message: `New taxi request to ${destination} for ${count} pax. Fare: Nu. ${fareInfo.totalFare}. First to accept gets the ride!`,
            link: '/driver/requests',
          });
        }

        req.flash(
          'success_msg',
          `Taxi booking (#${booking.booking_id}) submitted! Estimated fare: Nu. ${fareInfo.totalFare} (${fareInfo.fareType}). Eligible verified drivers have been notified.`
        );
      }

      res.redirect(`/bookings/${booking.booking_id}`);
    } catch (err) {
      console.error('Taxi booking error:', err);
      req.flash('error_msg', 'Failed to submit taxi booking: ' + err.message);
      res.redirect('/book-taxi');
    }
  },

  // 4. REQUEST A BUS (Group Transportation & Study Tours)
  async getBusBookingForm(req, res) {
    try {
      const activeRates = await fareRateModel.getAllActive();
      res.render('student/busBooking', {
        title: 'Request a Campus Bus | Sherubtse Campus Ride',
        rates: activeRates,
        formData: {},
      });
    } catch (err) {
      console.error('Bus form error:', err);
      req.flash('error_msg', 'Could not load bus booking form.');
      res.redirect('/dashboard');
    }
  },

  async postBusBooking(req, res) {
    try {
      const userId = req.session.user.id;
      const {
        pickupLocation,
        destinationSelect,
        customDestination,
        travelDate,
        departureTime,
        passengerCount,
        tripPurpose,
        remarks,
      } = req.body;

      if (!pickupLocation || !travelDate || !departureTime || !tripPurpose) {
        req.flash('error_msg', 'All required fields including Purpose of Travel must be filled.');
        return res.redirect('/book-bus');
      }

      const destination = destinationSelect === 'OTHER' ? (customDestination || '').trim() : destinationSelect;
      if (!destination) {
        req.flash('error_msg', 'Please select or provide a destination for the bus trip.');
        return res.redirect('/book-bus');
      }

      const count = parseInt(passengerCount, 10);
      if (!count || count < 5 || count > 60) {
        req.flash('error_msg', 'Campus bus requests require between 5 and 60 passengers.');
        return res.redirect('/book-bus');
      }

      // Check standard rate if exists
      const rate = await fareRateModel.getByDestination(destination);
      let preliminaryFare = 0;
      if (rate) {
        preliminaryFare = parseFloat(rate.bus_fare) * count;
      }

      // Bus requests always require Admin Review & Official Quotation + Assignment
      const booking = await bookingModel.create({
        userId,
        serviceType: 'Bus',
        bookingSubtype: 'Group Bus',
        pickupLocation,
        destination,
        travelDate,
        departureTime,
        passengerCount: count,
        rideSharingOpted: false,
        farePerPassenger: rate ? parseFloat(rate.bus_fare) : 0,
        totalFare: preliminaryFare,
        tripPurpose,
        remarks: remarks || '',
        bookingStatus: 'Pending',
        quotationStatus: 'Pending Admin Quotation',
        quotedFare: null,
      });

      // Notify admin
      await notificationModel.create({
        userId: 1,
        bookingId: booking.booking_id,
        title: 'New Campus Bus Request Received',
        message: `Group bus request (#${booking.booking_id}) for ${count} passengers to ${destination} submitted by ${req.session.user.fullName}. Review and provide quotation.`,
        link: '/admin/bus-requests',
      });

      req.flash(
        'success_msg',
        `Bus request (#${booking.booking_id}) for ${count} passengers submitted successfully! Status is Pending while the Transport Admin reviews vehicle availability and provides the official fare quotation.`
      );
      res.redirect(`/bookings/${booking.booking_id}`);
    } catch (err) {
      console.error('Bus booking error:', err);
      req.flash('error_msg', 'Failed to submit bus request: ' + err.message);
      res.redirect('/book-bus');
    }
  },

  // 5. MY BOOKINGS
  async getMyBookings(req, res) {
    try {
      const userId = req.session.user.id;
      const statusFilter = req.query.status || 'all';
      const typeFilter = req.query.type || null;

      const bookings = await bookingModel.getUserBookings(userId, statusFilter, typeFilter);

      res.render('student/myBookings', {
        title: 'My Bookings | Sherubtse Campus Ride',
        bookings,
        currentStatus: statusFilter,
        currentType: typeFilter || 'all',
      });
    } catch (err) {
      console.error('My bookings error:', err);
      req.flash('error_msg', 'Could not load your bookings.');
      res.redirect('/dashboard');
    }
  },

  // 6. BOOKING DETAILS
  async getBookingDetails(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const booking = await bookingModel.getById(bookingId);

      if (!booking) {
        req.flash('error_msg', 'Booking not found.');
        return res.redirect('/my-bookings');
      }

      const user = req.session.user;
      const isOwner = booking.user_id === user.id;
      const isAdmin = user.role === 'admin';
      const isDriver = user.role === 'driver';

      if (!isOwner && !isAdmin && !isDriver) {
        req.flash('error_msg', 'Access denied.');
        return res.redirect('/dashboard');
      }

      const payment = await paymentModel.getByBookingId(bookingId);

      res.render('student/bookingDetails', {
        title: `Booking #${booking.booking_id} Details | Sherubtse Campus Ride`,
        booking,
        payment,
        isOwner,
        isAdmin,
        isDriver,
      });
    } catch (err) {
      console.error('Booking details error:', err);
      req.flash('error_msg', 'Could not load booking details.');
      res.redirect('/my-bookings');
    }
  },

  // 7. PASSENGER ACCEPTS QUOTATION
  async postAcceptQuotation(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const userId = req.session.user.id;

      const booking = await bookingModel.getById(bookingId);
      if (!booking || booking.user_id !== userId) {
        req.flash('error_msg', 'Booking not found or unauthorized.');
        return res.redirect('/my-bookings');
      }

      if (booking.quotation_status !== 'Quoted') {
        req.flash('error_msg', 'No pending quotation available to accept.');
        return res.redirect(`/bookings/${bookingId}`);
      }

      await bookingModel.acceptQuotation(bookingId, userId);

      // Notify admin
      await notificationModel.create({
        userId: 1,
        bookingId,
        title: 'Fare Quotation Accepted',
        message: `Passenger ${req.session.user.fullName} accepted the fare quotation of Nu. ${booking.quoted_fare} for Booking #${bookingId}. Please finalize driver/vehicle assignment.`,
        link: booking.service_type === 'Bus' ? '/admin/bus-requests' : '/admin/bookings',
      });

      req.flash(
        'success_msg',
        `You have accepted the fare quotation of Nu. ${booking.quoted_fare}. The Transport Admin has been notified to complete vehicle & driver confirmation.`
      );
      res.redirect(`/bookings/${bookingId}`);
    } catch (err) {
      console.error('Accept quote error:', err);
      req.flash('error_msg', 'Failed to accept quotation: ' + err.message);
      res.redirect(`/bookings/${req.params.id}`);
    }
  },

  // 8. PASSENGER DECLINES QUOTATION
  async postDeclineQuotation(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const userId = req.session.user.id;

      await bookingModel.declineQuotation(bookingId, userId);

      // Notify admin
      await notificationModel.create({
        userId: 1,
        bookingId,
        title: 'Fare Quotation Declined',
        message: `Passenger ${req.session.user.fullName} declined the quotation for Booking #${bookingId}. Booking cancelled.`,
        link: '/admin/bookings',
      });

      req.flash('info_msg', 'Fare quotation declined. The booking has been cancelled.');
      res.redirect(`/bookings/${bookingId}`);
    } catch (err) {
      console.error('Decline quote error:', err);
      req.flash('error_msg', 'Failed to decline quotation: ' + err.message);
      res.redirect(`/bookings/${req.params.id}`);
    }
  },

  // 9. CANCEL BOOKING
  async postCancelBooking(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const userId = req.session.user.id;
      const { cancellationReason } = req.body;

      await bookingModel.cancelBooking(bookingId, userId, cancellationReason || 'Cancelled by passenger');
      req.flash('success_msg', 'Booking cancelled successfully.');
      res.redirect('/my-bookings');
    } catch (err) {
      console.error('Cancel booking error:', err);
      req.flash('error_msg', err.message || 'Could not cancel booking.');
      res.redirect(`/bookings/${req.params.id}`);
    }
  },

  // 10. PAYMENT HISTORY
  async getPaymentHistory(req, res) {
    try {
      const userId = req.session.user.id;
      const payments = await paymentModel.getUserPayments(userId);

      res.render('student/paymentHistory', {
        title: 'Payment History | Sherubtse Campus Ride',
        payments,
      });
    } catch (err) {
      console.error('Payment history error:', err);
      req.flash('error_msg', 'Could not load payment history.');
      res.redirect('/dashboard');
    }
  },
};

module.exports = bookingController;
