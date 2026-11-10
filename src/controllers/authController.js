const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');

const AuthController = {
  getLogin(req, res) {
    res.render('auth/login', {
      title: 'Sign In - Campus Ride',
      email: '',
    });
  },

  async postLogin(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      req.flash('error_msg', 'Please provide both email and password.');
      return res.render('auth/login', {
        title: 'Sign In - Campus Ride',
        email: email || '',
      });
    }

    try {
      const user = await UserModel.findByEmail(email);
      if (!user) {
        req.flash('error_msg', 'Invalid email or password.');
        return res.render('auth/login', {
          title: 'Sign In - Campus Ride',
          email,
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        req.flash('error_msg', 'Invalid email or password.');
        return res.render('auth/login', {
          title: 'Sign In - Campus Ride',
          email,
        });
      }

      // Establish session
      req.session.user = {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        studentStaffId: user.student_staff_id,
      };

      req.flash('success_msg', `Welcome back, ${user.full_name}!`);

      // Redirect based on role or returnTo
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;

      if (returnTo) return res.redirect(returnTo);
      if (user.role === 'admin') return res.redirect('/admin');
      if (user.role === 'driver') return res.redirect('/driver');
      return res.redirect('/trips');
    } catch (err) {
      console.error('Login error:', err);
      req.flash('error_msg', 'An error occurred during login. Please try again.');
      return res.redirect('/login');
    }
  },

  getRegister(req, res) {
    res.render('auth/register', {
      title: 'Create Account - Campus Ride',
      formData: {},
    });
  },

  async postRegister(req, res) {
    const { fullName, email, password, confirmPassword, phone, studentStaffId, role } = req.body;
    const formData = { fullName, email, phone, studentStaffId };

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      req.flash('error_msg', 'Please fill in all required fields.');
      return res.render('auth/register', { title: 'Create Account - Campus Ride', formData });
    }

    if (password.length < 6) {
      req.flash('error_msg', 'Password must be at least 6 characters long.');
      return res.render('auth/register', { title: 'Create Account - Campus Ride', formData });
    }

    if (password !== confirmPassword) {
      req.flash('error_msg', 'Passwords do not match.');
      return res.render('auth/register', { title: 'Create Account - Campus Ride', formData });
    }

    try {
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        req.flash('error_msg', 'An account with that email already exists.');
        return res.render('auth/register', { title: 'Create Account - Campus Ride', formData });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Default role is passenger, but allow driver selection for testing/demo if requested
      const assignedRole = (role === 'driver') ? 'driver' : 'passenger';

      const newUser = await UserModel.create({
        fullName,
        email,
        passwordHash,
        role: assignedRole,
        phone: phone || null,
        studentStaffId: studentStaffId || null,
      });

      // Auto login
      req.session.user = {
        id: newUser.id,
        name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        studentStaffId: newUser.student_staff_id,
      };

      req.flash('success_msg', 'Registration successful! Welcome to Campus Ride.');
      if (newUser.role === 'driver') return res.redirect('/driver');
      return res.redirect('/trips');
    } catch (err) {
      console.error('Registration error:', err);
      req.flash('error_msg', 'Registration failed. Please check your input and try again.');
      return res.render('auth/register', { title: 'Create Account - Campus Ride', formData });
    }
  },

  logout(req, res) {
    req.session.destroy((err) => {
      if (err) console.error('Session destroy error:', err);
      res.redirect('/login');
    });
  },

  async getProfile(req, res) {
    try {
      const user = await UserModel.findById(req.session.user.id);
      res.render('auth/profile', {
        title: 'My Profile - Campus Ride',
        user,
      });
    } catch (err) {
      req.flash('error_msg', 'Could not load profile.');
      res.redirect('back');
    }
  }
};

module.exports = AuthController;
