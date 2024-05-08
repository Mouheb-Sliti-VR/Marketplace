// AuthenticationRoute.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Models/userModel');


// Registration route
router.post('/register', async (req, res) => {
    try {
        const { email, companyName, password } = req.body;

        // Check if the email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create new user
        const user = new User({ email, companyName, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).send('Invalid email or password');
        }
        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send('Invalid email or password');
        }
        // Generate JWT token
        const token = await jwt.sign({ email: user.email, companyName: user.companyName }, process.env.SECRET_KEY);
        res.send({ message: `${user.companyName} has successfully connected with this token`, token });
    } catch (error) {
        console.error(error);
        res.status(500).send('Login failed');
    }
});

module.exports = router;
