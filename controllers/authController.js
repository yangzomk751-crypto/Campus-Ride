const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const driverModel = require('../models/driverModel');
const notificationModel = require('../models/notificationModel');

const authController = {
  getLogin(req, res) {
    res.render('auth/login', {
      title: 'Sign In | Sherubtse Campus Ride',
      email: '',
    });
  },

  async postLogin(req, res) {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const password = (req.body.password || '').trim();

      if (!email || !password) {
        req.flash('error_msg', 'Please enter your Sherubtse email and password.');
        return res.render('auth/login', {
          title: 'Sign In | Sherubtse Campus Ride',
          email,
        });
      }

      console.log(`[AUTH LOGIN] Attempting login for email: "${email}"`);
      const user = await userModel.findByEmail(email);

      if (!user) {
        console.warn(`[AUTH LOGIN] Account not found for email: "${email}"`);
        req.flash(
          'error_msg',
          `No account found with email "${email}". If you recently registered while the server was running in memory mode, server restart may have reset the temporary store. Please register again.`
        );
        return res.render('auth/login', {
          title: 'Sign In | Sherubtse Campus Ride',
          email,
        });
      }

      if (user.status === 'suspended') {
        req.flash('error_msg', 'Your account has been suspended. Please contact the Transport Office.');
        return res.render('auth/login', {
          title: 'Sign In | Sherubtse Campus Ride',
          email,
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        console.warn(`[AUTH LOGIN] Incorrect password for user: "${email}"`);
        req.flash('error_msg', 'Incorrect password. Please verify and try again.');
        return res.render('auth/login', {
          title: 'Sign In | Sherubtse Campus Ride',
          email,
        });
      }

      // Populate session
      req.session.user = {
        id: user.user_id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        passengerType: user.passenger_type,
        status: user.status,
      };

      req.flash('success_msg', `Welcome back, ${user.full_name}!`);

      // Role-based redirection
      if (user.role === 'admin') {
        return res.redirect('/admin');
      } else if (user.role === 'driver') {
        return res.redirect('/driver');
      } else {
        return res.redirect('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      req.flash('error_msg', 'An error occurred during login. Please try again.');
      res.redirect('/login');
    }
  },

  getRegister(req, res) {
    res.render('auth/register', {
      title: 'Register Account | Sherubtse Campus Ride',
      formData: {},
    });
  },

  async postRegister(req, res) {
    try {
      const fullName = (req.body.fullName || '').trim();
      const email = (req.body.email || '').trim().toLowerCase();
      const phone = (req.body.phone || '').trim();
      const password = (req.body.password || '').trim();
      const confirmPassword = (req.body.confirmPassword || '').trim();
      const role = req.body.role;
      const passengerType = req.body.passengerType;
      const licenseNumber = (req.body.licenseNumber || '').trim();
      const notes = (req.body.notes || '').trim();

      if (!fullName || !email || !phone || !password || !role) {
        req.flash('error_msg', 'Please fill in all required fields.');
        return res.render('auth/register', {
          title: 'Register Account | Sherubtse Campus Ride',
          formData: req.body,
        });
      }

      if (password !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match.');
        return res.render('auth/register', {
          title: 'Register Account | Sherubtse Campus Ride',
          formData: req.body,
        });
      }

      if (password.length < 6) {
        req.flash('error_msg', 'Password must be at least 6 characters long.');
        return res.render('auth/register', {
          title: 'Register Account | Sherubtse Campus Ride',
          formData: req.body,
        });
      }

      // Check email uniqueness
      const existing = await userModel.findByEmail(email);
      if (existing) {
        req.flash('error_msg', 'An account with this email address already exists.');
        return res.render('auth/register', {
          title: 'Register Account | Sherubtse Campus Ride',
          formData: req.body,
        });
      }

      const assignedRole = role === 'driver' ? 'driver' : 'passenger';
      const assignedPassengerType = assignedRole === 'passenger' ? (passengerType === 'staff' ? 'staff' : 'student') : null;

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await userModel.create({
        fullName,
        email,
        passwordHash,
        role: assignedRole,
        passengerType: assignedPassengerType,
        phone,
      });

      // If Driver, register in drivers table
      if (assignedRole === 'driver') {
        if (!licenseNumber) {
          req.flash('error_msg', 'Driving license number is required for driver registration.');
          return res.render('auth/register', {
            title: 'Register Account | Sherubtse Campus Ride',
            formData: req.body,
          });
        }
        await driverModel.create({
          userId: newUser.user_id,
          licenseNumber,
          notes: notes || 'New driver registered online',
        });

        // Notify admin
        await notificationModel.create({
          userId: 1, // Admin
          title: 'New Driver Registration Awaiting Verification',
          message: `Driver ${fullName} (${licenseNumber}) has registered and requires license verification.`,
          link: '/admin/drivers',
        });

        req.flash(
          'success_msg',
          'Driver registration submitted! Your account is pending Admin verification before you can accept rides. You may sign in.'
        );
        return res.redirect('/login');
      }

      // Passenger welcome notification
      await notificationModel.create({
        userId: newUser.user_id,
        title: 'Welcome to Sherubtse Campus Ride!',
        message: 'You can now request weekday rides between Hostel and Classroom, book taxis, or request college buses.',
        link: '/dashboard',
      });

      req.flash('success_msg', 'Registration successful! You can now sign in.');
      res.redirect('/login');
    } catch (err) {
      console.error('Registration error:', err);
      req.flash('error_msg', 'Registration failed: ' + err.message);
      res.render('auth/register', {
        title: 'Register Account | Sherubtse Campus Ride',
        formData: req.body,
      });
    }
  },

  async getProfile(req, res) {
    try {
      const user = await userModel.findById(req.session.user.id);
      if (!user) {
        req.flash('error_msg', 'Account not found. Please sign in again.');
        return res.redirect('/login');
      }

      let driver = null;
      if (user.role === 'driver') {
        driver = await driverModel.getByUserId(user.user_id);
      }

      res.render('auth/profile', {
        title: 'Profile Settings | Sherubtse Campus Ride',
        user,
        profileUser: user,
        driver,
      });
    } catch (err) {
      console.error('Profile view error:', err);
      req.flash('error_msg', 'Could not load profile.');
      if (req.session && req.session.user && req.session.user.role === 'admin') {
        return res.redirect('/admin');
      } else if (req.session && req.session.user && req.session.user.role === 'driver') {
        return res.redirect('/driver');
      }
      res.redirect('/dashboard');
    }
  },

  async postProfile(req, res) {
    try {
      const { fullName, phone } = req.body;
      const userId = req.session.user.id;

      if (!fullName || !phone) {
        req.flash('error_msg', 'Full name and phone number cannot be blank.');
        return res.redirect('/profile');
      }

      const updated = await userModel.updateProfile(userId, { fullName, phone });
      req.session.user.fullName = updated.full_name;
      req.session.user.phone = updated.phone;

      req.flash('success_msg', 'Profile updated successfully.');
      res.redirect('/profile');
    } catch (err) {
      console.error('Profile update error:', err);
      req.flash('error_msg', 'Could not update profile: ' + err.message);
      res.redirect('/profile');
    }
  },

  logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/login?logout=1');
    });
  },
};

module.exports = authController;
