const express = require('express')
const hbs = require('hbs') 

const fileUpload = require('express-fileupload')
const session = require('express-session')
const mongoose = require('mongoose')
const crypto = require('crypto')
const cookieParser = require("cookie-parser")

// Register the 'eq' helper
hbs.registerHelper('eq', (a, b) => a === b);

/* Initialize User path */
const User = require("./database/models/User")
const Seat = require("./database/models/Seat")
const Building = require("./database/models/Building.js")
const Room = require("./database/models/Room")
const Reservation = require("./database/models/Reservation")
const SecurityQuestion = require('./database/models/SecurityQuestion');
const Logs = require('./database/models/Logs');
const SECURITY_QUESTIONS = [
    "What was the name of your first stuffed animal?",
    "What is the name of the street you grew up on?",
    "What was your childhood nickname?",
    "What is the name of your favorite childhood friend?",
    "What was the make and model of your first car?",
    "What is the name of the hospital where you were born?",
    "What was your dream job as a child?",
    "What is the middle name of your oldest sibling?",
    "What is the name of your favorite teacher?",
    "What is the title of the first movie you saw in a theater?"
];



const path = require('path')

const app = express()

app.set('view engine', 'hbs')

app.use(express.json())
app.use(express.urlencoded( {extended: false})) // files consist of more than strings
app.use(express.static('assets')) 
app.use(express.static('uploads'))

// MongoDB Connection
const { connect } = require('./database/models/Conn.js');

// SESSION
app.use(session({
    secret: 'some secret',

    // cookie expires in approx 3 weeks
    cookie: { maxAge: 1814400000 },

    resave: false,
    saveUninitialized: false

}))

app.use(cookieParser())

var bodyParser = require('body-parser')
app.use( bodyParser.urlencoded({extended: false}) )

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
    if(req.session.user) {
        next()
    } else {
        // Fail securely - redirect to login
        console.log(`🔒 Authentication failed for ${req.originalUrl} - redirecting to /login`);
        res.redirect("/login")
    }
}

// Middleware to check if the user is a Lab Technician
const isLabTech = (req, res, next) => {
    if (req.session.user && req.session.user.account_type === "Lab Technician") {
        next()
    } else {
        // Fail securely - serve 403 error page
        console.log(`🚫 Lab Tech access denied for user: ${req.session.user?.email || 'Anonymous'} to ${req.originalUrl}`);
        
        res.status(403);
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.sendFile(path.join(__dirname, '403.html'))
    }
}

// Middleware to check if the user is Staff
const isStaff = (req, res, next) => {
    console.log(`🔍 Staff middleware check - User: ${req.session.user?.email}, Account Type: ${req.session.user?.account_type}, URL: ${req.originalUrl}`);
    
    if (req.session.user && req.session.user.account_type === "Staff") {
        console.log(`✅ Staff access granted for ${req.session.user.email}`);
        next()
    } else {
        // Fail securely - serve 403 error page
        console.log(`🚫 Staff access denied for user: ${req.session.user?.email || 'Anonymous'} to ${req.originalUrl}`);
        console.log(`🔍 Session data:`, req.session.user);
        
        res.status(403);
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.sendFile(path.join(__dirname, '403.html'))
    }
}

// Middleware to check if the user is Lab Technician OR Staff
const isLabTechOrStaff = (req, res, next) => {
    console.log(`🔍 LabTech/Staff middleware check - User: ${req.session.user?.email}, Account Type: ${req.session.user?.account_type}, URL: ${req.originalUrl}`);
    
    if (req.session.user && (req.session.user.account_type === "Lab Technician" || req.session.user.account_type === "Staff")) {
        console.log(`✅ LabTech/Staff access granted for ${req.session.user.email}`);
        next()
    } else {
        // Fail securely - serve 403 error page
        console.log(`🚫 Lab Tech/Staff access denied for user: ${req.session.user?.email || 'Anonymous'} to ${req.originalUrl}`);
        console.log(`🔍 Session data:`, req.session.user);
        res.status(403).sendFile(path.join(__dirname, '403.html'))
    }
}

// Middleware to check if user is Student (for routes that should only be accessible to students)
const isStudent = (req, res, next) => {
    if (req.session.user && req.session.user.account_type === "Student") {
        next()
    } else {
        // Fail securely - serve 403 error page
        console.log(`🚫 Student access denied for user: ${req.session.user?.email || 'Anonymous'} to ${req.originalUrl}`);
        res.status(403).sendFile(path.join(__dirname, '403.html'))
    }
}

// Middleware to check if user owns the resource or is authorized
const isOwnerOrAuthorized = async (req, res, next) => {
    try {
        const user = req.session.user;
        const reservationId = req.params.id;

        if (!user) {
            console.log(`🔒 No user session for resource access: ${req.originalUrl}`);
            return res.redirect("/login");
        }

        // Lab Technicians and Staff have full access
        if (user.account_type === "Lab Technician" || user.account_type === "Staff") {
            return next();
        }

        // For students, check ownership
        if (reservationId) {
            const reservation = await Reservation.findById(reservationId);
            if (!reservation) {
                console.log(`🚫 Reservation not found: ${reservationId}`);
                return res.status(404).sendFile(path.join(__dirname, '404.html'));
            }

            if (reservation.reserved_for_email === user.email) {
                return next();
            }
        }

        // Fail securely - access denied
        console.log(`🚫 Resource access denied for user: ${user.email} to ${req.originalUrl}`);
        res.status(403).sendFile(path.join(__dirname, '403.html'));

    } catch (error) {
        console.error("⚠️ Error in ownership check:", error);
        res.status(500).sendFile(path.join(__dirname, '500.html'));
    }
}

// Route to serve 403 error page directly
app.get('/403', (req, res) => {
    console.log(`🚫 403 page accessed - User: ${req.session.user?.email || 'Anonymous'}, Referrer: ${req.get('Referrer') || 'Direct'}`);
    
    res.status(403);
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.sendFile(path.join(__dirname, '403.html'));
});

// Get Reservations Seat Availability
app.get("/all-reservations", isAuthenticated, async (req, res) => {
    try {
        const reservations = await Reservation.find().lean();

        if (!reservations || reservations.length === 0) {
            console.warn("⚠️ No reservations found in the database.");
            return res.json([reservations]);
        }

        res.json(reservations);
    } catch (err) {
        console.error("⚠️ Error fetching reservations:", err);
        res.status(500).json({ message: "Error fetching reservations", error: err.message });
    }
});

// Get All Students - Restricted to Lab Tech and Staff only
app.get("/all-students", isAuthenticated, async (req, res) => {
    try {
        // Additional check - only Lab Tech and Staff can access student data
        if (req.session.user.account_type !== "Lab Technician" && req.session.user.account_type !== "Staff") {
            console.log(`🚫 Unauthorized attempt to access student data by: ${req.session.user.email}`);
            return res.status(403).sendFile(path.join(__dirname, '403.html'));
        }

        const students = await User.find({account_type: "Student"}).lean();

        if (!students || students.length === 0) {
            console.warn("⚠️ No students found in the database.");
            return res.json([students]);
        }

        res.json(students);
    } catch (err) {
        console.error("⚠️ Error fetching students:", err);
        res.status(500).json({ message: "Error fetching students", error: err.message });
    }
});

// LabTech Dashboard Table Data
app.get("/reservations", isLabTech, async (req, res) => {
    try {
        const reservations = await Reservation.find().lean();

        if (!reservations || reservations.length === 0) {
            console.warn("⚠️ No reservations found in the database.");
            return res.json([]);
        }

        // Collect all possible emails: reserving user + reserved_for_email
        const allEmails = reservations.flatMap(res => {
            const emails = [];
            if (res.email) emails.push(res.email);
            if (res.reserved_for_email) emails.push(res.reserved_for_email);
            return emails;
        });

        const uniqueEmails = [...new Set(allEmails)];

        const users = await User.find(
            { email: { $in: uniqueEmails } },
            "first_name last_name email"
        ).lean();

        // Create a map for quick lookup
        const userMap = {};
        users.forEach(user => {
            userMap[user.email] = `${user.first_name} ${user.last_name}`;
        });

        // Format the reservations with user data
        const formattedReservations = reservations.map(reservation => ({
            id: reservation._id,
            roomNumber: reservation.room_num || "N/A",
            seatNumber: `Seat #${reservation.seat_num}` || "N/A",
            date: reservation.reserved_date ? reservation.reserved_date.toISOString().split("T")[0] : "N/A",
            time: reservation.reserved_date ? reservation.reserved_date.toISOString().split("T")[1].slice(0, 5) : "N/A",
            reservedBy:
                reservation.anonymous === "Y"
                    ? "Anonymous"
                    : userMap[reservation.reserved_for_email] // ✅ Use reserved_for_email if available
                        || userMap[reservation.email]          // fallback to email if not
                        || "⚠️ Unknown"
        }));

        res.json(formattedReservations);
    } catch (err) {
        console.error("⚠️ Error fetching reservations:", err);
        res.status(500).json({ message: "Error fetching reservations", error: err.message });
    }
});

// LabTech & User Dashboard Deletion Feature Route - with proper authorization
app.delete('/reservations/:id', isAuthenticated, isOwnerOrAuthorized, async (req, res) => {
    try {
        const reservationId = req.params.id;

        // Find and delete the reservation
        const deletedReservation = await Reservation.findByIdAndDelete(reservationId);

        if (!deletedReservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        console.log(`✅ Reservation ${reservationId} deleted successfully by ${req.session.user.email}`);
        res.status(200).json({ message: "Reservation deleted successfully" });
    } catch (error) {
        console.error("⚠️ Error deleting reservation:", error);
        res.status(500).json({ message: "Error deleting reservation", error: error.message });
    }
});

// Staff Dashboard Table Data
app.get("/staff-reservations", isStaff, async (req, res) => {
    try {
        const reservations = await Reservation.find().lean();

        if (!reservations || reservations.length === 0) {
            console.warn("⚠️ No reservations found in the database.");
            return res.json([]);
        }

        // Collect all possible emails: reserving user + reserved_for_email
        const allEmails = reservations.flatMap(res => {
            const emails = [];
            if (res.email) emails.push(res.email);
            if (res.reserved_for_email) emails.push(res.reserved_for_email);
            return emails;
        });

        const uniqueEmails = [...new Set(allEmails)];

        const users = await User.find(
            { email: { $in: uniqueEmails } },
            "first_name last_name email"
        ).lean();

        // Create a map for quick lookup
        const userMap = {};
        users.forEach(user => {
            userMap[user.email] = `${user.first_name} ${user.last_name}`;
        });

        // Format the reservations with user data
        const formattedReservations = reservations.map(reservation => ({
            id: reservation._id,
            roomNumber: reservation.room_num || "N/A",
            seatNumber: `Seat #${reservation.seat_num}` || "N/A",
            date: reservation.reserved_date ? reservation.reserved_date.toISOString().split("T")[0] : "N/A",
            time: reservation.reserved_date ? reservation.reserved_date.toISOString().split("T")[1].slice(0, 5) : "N/A",
            reservedBy:
                reservation.anonymous === "Y"
                    ? "Anonymous"
                    : userMap[reservation.reserved_for_email] // ✅ Use reserved_for_email if available
                        || userMap[reservation.email]          // fallback to email if not
                        || "⚠️ Unknown"
        }));

        res.json(formattedReservations);
    } catch (err) {
        console.error("⚠️ Error fetching reservations:", err);
        res.status(500).json({ message: "Error fetching reservations", error: err.message });
    }
});

// Student Dashboard Table Data
app.get("/my-reservations", isAuthenticated, async (req, res) => {
    try {
        if (!req.session.user) {
            console.error("❌ No user session found.");
            return res.status(401).json({ message: "User not logged in." });
        }

        const userEmail = req.query.email || req.session.user.email;

        // Security check - students can only access their own reservations
        if (req.session.user.account_type === "Student" && userEmail !== req.session.user.email) {
            console.log(`🚫 Student ${req.session.user.email} attempted to access reservations for ${userEmail}`);
            return res.status(403).sendFile(path.join(__dirname, '403.html'));
        }

        console.log(`🔍 Fetching reservations for user: ${userEmail}`);

        let reservations = await Reservation.find({reserved_for_email: userEmail }).lean();

        if (!reservations || reservations.length === 0) {
            console.warn(`⚠️ No reservations found for ${userEmail}.`);
            return res.json([]);
        }

        // Format reservations to send to frontend
        const formattedReservations = reservations.map(reservation => ({
            id: reservation._id,
            roomNumber: reservation.room_num || "N/A",
            seatNumber: `Seat #${reservation.seat_num}` || "N/A",
            date: reservation.reserved_date ? reservation.reserved_date.toISOString().split("T")[0] : "N/A",
            time: reservation.reserved_date ? reservation.reserved_date.toISOString().split("T")[1].slice(0,5) : "N/A"
        }));

        console.log(`✅ Reservations found for ${userEmail}:`, formattedReservations);
        res.json(formattedReservations);
    } catch (err) {
        console.error("⚠️ Error fetching user reservations:", err);
        res.status(500).json({ message: "Error fetching reservations", error: err.message });
    }
});

// Function to fetch students from the database
async function getStudentsFromDB() {
    try {
        // Fetch all users with account_type 'Student'
        const students = await User.find({ account_type: 'Student' }).lean();

        // Return the students data
        return students;
    } catch (err) {
        console.error("⚠️ Error fetching students from database:", err);
        return [];
    }
}

function isPasswordComplex(password) {
    // Minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
}

/*
    SHA256 hash generation
    Reference: https://www.techiedelight.com/generate-sha-256-hash-javascript/
*/
function sha256(password) {
    // Create a hash object
    const hash = crypto.createHash('sha256')
 
    // Pass the input data to the hash object
    hash.update(password)
 
    // Get the output in hexadecimal format
    return hash.digest('hex')
}



//creating Logs
async function createLog({ action, user, room = null, seat = null, datetime = null, details = ''}){
    const logEntry = new Logs({
        timestamp: new Date(),
        action,
        user,
        room,
        seat,
        datetime,
        details
    });

    await logEntry.save();
}
// Route to INDEX.HTML
// localhost:3000/
app.get('/', function(req,res){
    res.sendFile(__dirname + '/' + 'index.html')
})

// Route to About Us
// localhost:3000/about-us
app.get('/about-us', function(req,res){
    res.sendFile(__dirname + '/' + 'about-us.html')
})

// Route to logs.hbs
// localhost:3000/logs
// Replace your existing logs route with this debugging version:

app.get('/logs', async (req, res) => {
    console.log('🔍 LOGS ROUTE HIT - Starting debugging...');
    console.log('📋 Session user:', req.session.user);
    console.log('🔑 User account type:', req.session.user?.account_type);
    console.log('✅ Is authenticated:', !!req.session.user);
    
    if (!req.session.user) {
        console.log('❌ No user session - redirecting to login');
        return res.redirect('/login');
    }
    
    if (req.session.user.account_type !== 'Lab Technician') {
        console.log('❌ Not a Lab Technician - serving 403');
        console.log('📊 Expected: "Lab Technician", Got:', req.session.user.account_type);
        return res.status(403).sendFile(path.join(__dirname, '403.html'));
    }
    
    console.log('✅ All checks passed - rendering logs template');
    console.log('📁 Looking for template: logs.hbs');

     const logs = await Logs.find();
    console.log("All logs from DB:", logs);

    console.log('👤 Passing userData:', {
        email: req.session.user.email,
        account_type: req.session.user.account_type,
        first_name: req.session.user.first_name
    });
    
    try {
        res.render('logs', { userData: req.session.user, logs
        });
        console.log('✅ Template rendered successfully');
    } catch (error) {
        console.error('❌ Error rendering template:', error);
        res.status(500).send('Template error: ' + error.message);
    }
});

// Route to register.html
// localhost:3000/register
app.get('/register', function(req,res){
    res.sendFile(__dirname + '/' + 'register.html')
})

// User registration POST Route
app.post('/register', async (req, res) => {
    try {
        const { 
            first_name, 
            last_name, 
            email, 
            password, 
            account_type,
            security_question,
            security_answer 
        } = req.body;

        // Check for missing fields
        if (!first_name || !last_name || !email || !password || !account_type || !security_question || !security_answer) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields" 
            });
        }

        // Validate field lengths
        if (first_name.length > 25) {
            await createLog({
            action: 'error-registration',
            user: email,
            details: 'First name must be at most 25 characters.'
        });
            return res.status(400).json({ success: false, message: "First name must be at most 25 characters." });
        }
        if (last_name.length > 25) {
            await createLog({
            action: 'error-registration',
            user: email,
            details: 'Last name must be at most 25 characters.'
        });
            return res.status(400).json({ success: false, message: "Last name must be at most 25 characters." });
        }
        if (security_answer.length > 50) {
            await createLog({
            action: 'error-registration',
            user: email,
            details: 'Security answer must be at most 50 characters.'
        });
            return res.status(400).json({ success: false, message: "Security answer must be at most 50 characters." });
        }
        const emailLocalPart = email.split('@')[0];
        if (emailLocalPart.length > 64) {
            await createLog({
            action: 'error-registration',
            user: email,
            details: 'Email local part must be at most 64 characters."'
        });
            return res.status(400).json({ success: false, message: "Email local part must be at most 64 characters." });
        }

        // Check if email contains @dlsu.edu.ph
        if (!email.endsWith("@dlsu.edu.ph")) {
            await createLog({
            action: 'error-email-domain',
            user: email,
            details: 'Email must end with @dlsu.edu.ph' 
        });
            return res.status(400).json({
                success: false,
                message: "Email must be a valid DLSU email ending with @dlsu.edu.ph"
            });
        }

        // Trim password before checking complexity
        const trimmedPassword = password.trim();

        // Enforce password complexity
        if (!isPasswordComplex(trimmedPassword)) {
            await createLog({
            action: 'error-password-complexity',
            user: email,
            details: 'Password did not meet requirements.'
        });
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
            });
        }

        // Check for existing user BEFORE creating new one
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "This account already exists"
            });
        }

        // If no existing user, proceed with registration
        const hashedPassword = sha256(trimmedPassword);
        const newUser = new User({
            email,
            first_name,
            last_name,
            password: hashedPassword,
            account_type,
            profile_picture: "profile_pics/default_avatar.jpg"
        });

        const savedUser = await newUser.save();

        if (!SECURITY_QUESTIONS.includes(security_question)) {
            return res.status(400).json({
                success: false,
                message: "Invalid security question selected."
            });
        }

        // Create security question document
        const securityQuestionDoc = new SecurityQuestion({
            user_id: savedUser._id,
            email: email,
            security_question,
            security_answer: security_answer
        });

        await securityQuestionDoc.save();

        console.log("✅ New user registered with security question:", email);
        res.status(201).json({ 
            success: true, 
            message: "User registered successfully!" 
        });

    } catch (err) {
        console.error("⚠️ Error registering user:", err);

        // Handle MongoDB duplicate key error
        if (err.code === 11000 && err.keyPattern?.email) {
            return res.status(409).json({
                success: false,
                message: "This account already exists"
            });
        }

        // Handle validation errors
        if (err.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Please complete all required fields"
            });
        }

        // Handle other errors
        res.status(500).json({
            success: false,
            message: "An error occurred during registration"
        });
    }
});

// Route to login.html
// localhost:3000/login
app.get('/login', async function(req, res) {
    if (req.session.user) {
        res.redirect('/dashboard')
    } else if (req.cookies.rememberMe) {
        try {
            const user = await User.findById(req.cookies.rememberMe)
            if (user) {
                req.session.user = user
                res.redirect('/dashboard')
            } else {
                res.sendFile(__dirname + '/login.html')
            }
        } catch (err) {
            console.error("⚠️ Error checking rememberMe cookie:", err)
            res.sendFile(__dirname + '/login.html')
        }
    } else {
        res.sendFile(__dirname + '/login.html')
    }
})

// Add these routes for the forgot password flow
app.post('/verify-email', async (req, res) => {
    try {
        const { email } = req.body;
        const securityQuestion = await SecurityQuestion.findOne({ email });

        if (!securityQuestion) {
            await createLog({
                action: 'verify-email-failed',
                user: email || 'unknown',
                details: 'Email not found during verification'
            });

            return res.status(404).json({ 
                success: false, 
                message: "Email not found" 
            });
        }
        await createLog({
            action: 'verify-email-success',
            user: email,
            details: 'Security question sent for email verification'
        });
        res.json({ 
            success: true, 
            question: securityQuestion.security_question 
        });
    } catch (error) {
        await createLog({
            action: 'verify-email-failed',
            user: email,
            details: 'Server Error'
        });
        console.error('Error verifying email:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Security Answer POST Route
app.post('/verify-security-answer', async (req, res) => {
    try {
        const { email, answer } = req.body;
        const securityQuestion = await SecurityQuestion.findOne({ email });

        if (!securityQuestion) {
            return res.status(404).json({ 
                success: false, 
                message: "Security question not found" 
            });
        }

        if (securityQuestion.security_answer === answer) {
            req.session.resetPasswordEmail = email;
            res.json({ success: true });
        } else {
            await createLog({
            action: 'error-security-question',
            user: email,
            details: 'Incorrect Security Question'
        });
            res.json({ 
                success: false, 
                message: "Incorrect answer" 
            });
        }
    } catch (error) {
        console.error('Error verifying answer:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Reset Password POST Route
app.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const trimmedPassword = newPassword.trim();

        // Enforce password complexity
        if (!isPasswordComplex(trimmedPassword)) {
            await createLog({
            action: 'error-password-reset',
            user: email,
            details: 'Password did not meet requirements.'
        });
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        // Prevent password re-use
        const hashedPassword = sha256(trimmedPassword);
        if (user && user.password === hashedPassword) {
            await createLog({
            action: 'error-password-reset',
            user: email,
            details: 'Password was the same as before.'
        });
            return res.status(400).json({
                success: false,
                message: "New password cannot be the same as the old password."
            });
        }

        // Enforce password age (1 day)
        const now = new Date();
        const lastChanged = user.passwordLastChanged || user.createdAt || user._id.getTimestamp();
        const oneDay = 24 * 60 * 60 * 1000;
        if (now - lastChanged < oneDay) {
            return res.status(400).json({
                success: false,
                message: "You can only change your password once every 24 hours."
            });
        }

        // Update password and last changed date
        const updatedUser = await User.findOneAndUpdate(
            { email },
            { password: hashedPassword, passwordLastChanged: now },
            { new: true }
        );

        res.json({ 
            success: true, 
            message: "Password updated successfully" 
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Submit Login Credentials POST Route
app.post("/login", express.urlencoded({ extended: true }), async (req, res) => {
    const { email, password, rememberMe } = req.body;
    const MAX_ATTEMPTS = 5;
    const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

    try {
        const existingUser = await User.findOne({ email: email });

        if (!existingUser) {
            // No such user exists.
            await createLog({
                action: 'no-user-login',
                user: email || 'unknown',
                details: 'No such user exists.'
            });
            return res.status(401).json({ success: false, message: "User not found." });
        }

        // Check if account is locked
        if (existingUser.lockUntil && existingUser.lockUntil > Date.now()) {
            const unlockDate = new Date(existingUser.lockUntil);
           
            await createLog({
                action: 'locked-account',
                user: email || 'unknown',
                details: 'Account Locked after numerous failed attempts.'
            });

            return res.status(403).json({
                success: false,
                message: `Account locked. Try again at ${unlockDate.toLocaleString()}.`,
                lockUntil: unlockDate
            });
        }

        // Check password
        if (existingUser.password !== sha256(password)) {
            // Update lastFailedLogin
            await User.updateOne(
                { _id: existingUser._id },
                { $set: { lastFailedLogin: new Date() } }
            );

            if ((existingUser.loginAttempts || 0) + 1 >= MAX_ATTEMPTS) {
                await User.updateOne(
                    { _id: existingUser._id },
                    { $set: { lockUntil: Date.now() + LOCK_TIME, loginAttempts: 0 } }
                );
            } else {
                await User.updateOne(
                    { _id: existingUser._id },
                    { $inc: { loginAttempts: 1 } }
                );
            }
            // Incorrect Password Log.
            await createLog({
                action: 'login-fail',
                user: email || 'unknown',
                details: 'User had the incorrect password.'
            });
            return res.status(401).json({ success: false, message: "Invalid password." });
        }

        // Successful login: reset attempts and lock, and update lastLogin
        const previousLastLogin = existingUser.lastLogin;
        const previousLastFailedLogin = existingUser.lastFailedLogin;

        await User.updateOne(
            { _id: existingUser._id },
            { $set: { loginAttempts: 0, lockUntil: null, lastLogin: new Date() } }
        );

        req.session.user = existingUser;
        if (rememberMe) {
            res.cookie("rememberMe", existingUser._id.toString(), { maxAge: 1814400000, httpOnly: true });
        }
        res.cookie("sessionId", req.sessionID);

        let redirectUrl;
        if (existingUser.account_type === "Student") {
            redirectUrl = "/dashboard";
        } else if (existingUser.account_type === "Lab Technician") {
            redirectUrl = "/labtech";
        } else if (existingUser.account_type === "Staff") {
            redirectUrl = "/staff";
        } else {
            return res.status(401).json({ success: false, message: "Invalid account type." });
        }
        // Successful Log-in Log.
            await createLog({
                action: 'login-success',
                user: email || 'unknown',
                details: 'User was able to log-in.'
            });
        // Send last login info to frontend
        return res.json({
            success: true,
            redirect: redirectUrl,
            lastLogin: previousLastLogin,
            lastFailedLogin: previousLastFailedLogin
        });

    } catch (err) {
        console.error("❌ Error during login:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// Profile Page - with proper access control
app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const email = req.query.email || req.session.user.email;
        
        // Security check - students can only view their own profile
        if (req.session.user.account_type === "Student" && email !== req.session.user.email) {
            console.log(`🚫 Student ${req.session.user.email} attempted to access profile for ${email}`);
            return res.status(403).sendFile(path.join(__dirname, '403.html'));
        }

        const userData = await User.findOne({ email }).lean();

        if (!userData) {
            return res.status(404).send("<script>alert('User not found!'); window.location='/dashboard';</script>");
        }

        res.render('profile', { userData, sessionUser: req.session.user });
    } catch (err) {
        console.error("⚠️ Error fetching profile:", err);
        res.status(500).send("<script>alert('Internal server error'); window.location='/dashboard';</script>");
    }
});

app.use(fileUpload()) // for fileuploads

// Upload Profile Picture POST Route
app.post('/profile', isAuthenticated, async(req, res) => {

    // Check if file was uploaded
    if (!req.files || Object.keys(req.files).length === 0)
        return res.status(400).send('No files were uploaded.')
    
    
    const userData = req.session.user
    const { profile_picture } = req.files
    
        if (!userData) {
            return res.status(401).send('Unauthorized')
        }
    
        try {
           /* const allowedTypes = ['image/jpeg', '/image/png', 'image/jpg'];
            if (!allowedTypes.includes(profile_picture.mimetype)){
                
                 await createLog({
                    action: 'invalid-profile-picture',
                    user: email,
                    details: 'Profile Picture File Format is not accepted.'
                    });

                return res.status(400).send('Invalid file type. Only JPG, JPEG, and PNG are allowed.');
            }*/

            const fileIdentifier = req.session.user.last_name + '_' + req.session.user.first_name + '_'
            // Move uploaded file
            await profile_picture.mv(path.resolve(__dirname, 'uploads/profile_pics', fileIdentifier + profile_picture.name))
    
            const updatedData = {
                ...req.body,
                profile_picture: 'profile_pics/' + fileIdentifier + profile_picture.name
            }
    
        // Update user data
            const updatedUser = await User.findByIdAndUpdate(userData._id, updatedData, { new: true })
            req.session.user = updatedUser // Update session user data
    
            res.redirect('/profile')
        } 
        catch (error) {
            console.log("Error!", error)
            res.status(500).send('Error updating user')
        }
        
})

// Submit Profile Details Route
app.post('/submit-profile-details', isAuthenticated, async (req, res) => {
    try {
        const userData = req.session.user;
        const { first_name, last_name, description } = req.body;

        // Validation checks
        if (first_name && first_name.length > 25) {
            return res.status(400).json({ 
                success: false, 
                message: 'First name must be at most 25 characters.' 
            });
        }
        if (last_name && last_name.length > 25) {
            return res.status(400).json({ 
                success: false, 
                message: 'Last name must be at most 25 characters.' 
            });
        }
        if (description && description.length > 50) {
            return res.status(400).json({ 
                success: false, 
                message: 'Description must be at most 50 characters.' 
            });
        }

        // Build update object with only non-empty fields
        const updatedData = {};
        if (first_name && first_name.trim()) updatedData.first_name = first_name.trim();
        if (last_name && last_name.trim()) updatedData.last_name = last_name.trim();
        if (description && description.trim()) updatedData.description = description.trim();

        if (Object.keys(updatedData).length > 0) {
            const updatedUser = await User.findByIdAndUpdate(userData._id, updatedData, { new: true });
            req.session.user = updatedUser; // Update session with new user data
            console.log("✅ Profile updated:", updatedData);

            // Return JSON response instead of redirect
            return res.status(200).json({ 
                success: true, 
                message: "Profile updated successfully!" 
            });

        } else {
            return res.status(400).json({ 
                success: false, 
                message: "No changes made." 
            });
        }
    } catch (err) {
        console.error("⚠️ Error updating profile:", err);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error." 
        });
    }
});

// Change password POST Route
// Change password POST Route - Improved version
app.post('/changepassword', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user_id = req.session.user._id;

        // Validation: Check if all fields are provided
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all password fields."
            });
        }

        // Validation: Check if new passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New password and confirmation password do not match."
            });
        }

        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Re-authenticate: Verify current password
        if (user.password !== sha256(currentPassword)) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect."
            });
        }

        // Trim and check complexity of new password
        const trimmedPassword = newPassword.trim();
        if (!isPasswordComplex(trimmedPassword)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
            });
        }

        // Prevent password re-use
        const hashedPassword = sha256(trimmedPassword);
        if (user.password === hashedPassword) {
            return res.status(400).json({
                success: false,
                message: "New password cannot be the same as the current password."
            });
        }

        // Enforce password age (1 day = 24 hours)
        const now = new Date();
        const lastChanged = user.passwordLastChanged || user.createdAt || user._id.getTimestamp();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (now - lastChanged < oneDay) {
            const nextAllowedChange = new Date(lastChanged.getTime() + oneDay);
            const hoursRemaining = Math.ceil((nextAllowedChange - now) / (1000 * 60 * 60));
            
            return res.status(429).json({
                success: false,
                message: `You can only change your password once every 24 hours. Please wait ${hoursRemaining} more hour(s).`
            });
        }

        // Update password and passwordLastChanged
        await User.findByIdAndUpdate(user_id, { 
            password: hashedPassword, 
            passwordLastChanged: now 
        });

        console.log(`✅ Password updated successfully for user: ${req.session.user.email}`);

        // Return success response
        res.status(200).json({
            success: true,
            message: "Password updated successfully. You will be logged out for security reasons."
        });

        // Log out the user after successful password change
        // We do this after sending the response to avoid response timing issues
        setTimeout(() => {
            req.session.destroy((err) => {
                if (err) {
                    console.error("⚠️ Error logging out after password change:", err);
                }
                console.log(`🔐 User ${req.session?.user?.email || 'unknown'} logged out after password change`);
            });
        }, 100);

    } catch (err) {
        console.error("⚠️ Error updating password:", err);
        res.status(500).json({
            success: false,
            message: "An internal error occurred. Please try again later."
        });
    }
});

// Delete User Account Route
app.post('/deleteaccount', isAuthenticated, async (req, res) => {
    try {
        const user_id = req.session.user._id;
        const user_email = req.session.user.email;
        const { currentPassword } = req.body;

        const user = await User.findById(user_id);

        // Re-authenticate
        if (user.password !== sha256(currentPassword)) {
            
            return res.status(400).json({ 
                success: false, 
                message: "Incorrect password inputted!" 
            });
        }

        // Delete all future reservations associated with the user
        const currentDate = new Date();
        const deletedReservations = await Reservation.deleteMany({
            reserved_for_email: user_email,
            reserved_date: { $gte: currentDate }
        });

        const deletedSecurityQuestion = await SecurityQuestion.deleteMany({
            email: user_email,
        });

        console.log(`🗑️ Deleted ${deletedReservations.deletedCount} future reservations for user: ${user.email}`);
        console.log(`🕒 Current session time: ${currentDate.toISOString()}`);

        // Find and delete the user
        const deletedUser = await User.findByIdAndDelete(user_id);

        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`❌ User deleted: ${deletedUser.email}`);

        // Destroy session and log out
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: "Error logging out after deletion" });
            }

            res.clearCookie("sessionId");
            res.clearCookie("rememberMe");

            res.status(200).json({ message: "Account and future reservations deleted successfully!" });
        });

    } catch (err) {
        console.error("⚠️ Error deleting user and reservations:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Route to staff handlebar
app.get('/staff', isAuthenticated, isStaff, (req,res) => {
    const userData = req.session.user
    console.log(userData)

    res.render('staff', {userData})
})

// Route to labtech handlebar
app.get('/labtech', isAuthenticated, isLabTech, (req,res) => {
    const userData = req.session.user
    console.log(userData)

    res.render('labtech', {userData})
})

// Fetch available rooms for a selected building and floor - Authenticated users only
app.get("/available-rooms", isAuthenticated, async (req, res) => {
    try {
        const { building, floor } = req.query;

        if (!building || !floor) {
            return res.status(400).json({ error: "Building and floor are required." });
        }

        // Find building ID based on building name
        const buildingData = await Building.findOne({ building_name: building }).lean();
        if (!buildingData) {
            return res.status(404).json({ error: "Building not found." });
        }

        // Fetch rooms that belong to the selected building and floor
        const availableRooms = await Room.find({
            building_id: buildingData.building_id,
            floor_num: parseInt(floor),
        }).lean();

        res.json({ success: true, rooms: availableRooms });
    } catch (error) {
        console.error("⚠️ Error fetching available rooms:", error);
        res.status(500).json({ error: "Failed to fetch available rooms." });
    }
});

// Route to reservation handlebar (All authenticated users)
app.get('/reserve', isAuthenticated, async (req, res) => {
    try {
        const userData = req.session.user;
        console.log(userData);

        const buildings = await Building.find({}, 'building_name'); // Fetch buildings

        // For Staff and LabTech, also fetch students
        let students = [];
        if (userData.account_type === "Staff" || userData.account_type === "Lab Technician") {
            students = await getStudentsFromDB();
        }

        // Pass different flags based on user type
        const templateData = {
            userData,
            buildings,
            isAdmin: userData.account_type === "Staff" || userData.account_type === "Lab Technician",
            students: students
        };

        res.render('reserve', templateData);
    } catch (error) {
        console.error("Error fetching buildings:", error);
        res.status(500).send("Error fetching buildings");
    }
});

// Route to dashboard handlebar (MUST DEPEND ON USER SESSION)
app.get('/dashboard', isAuthenticated, async(req,res) => {
    const userData = req.session.user
    console.log(userData)

    if(userData.account_type == "Student")
        res.render('dashboard', {userData})
    else if(userData.account_type == "Lab Technician")
        res.render('labtech', {userData})
    else if(userData.account_type == "Staff")
        res.render('staff', {userData})
    else {
        console.log(`🚫 Invalid account type for user: ${userData.email}`);
        res.status(403).sendFile(path.join(__dirname, '403.html'));
    }
})

// Create Reservation POST Route - All authenticated users
app.post('/reserve', isAuthenticated, async (req, res) => {
    try {
        const { reserved_date, building_id, room_num, seat_num, anonymous, reservedForEmail } = req.body
        const user = req.session.user // Get logged-in user

        // Check if seat is already reserved
        const existingReservation = await Reservation.findOne({ room_num, seat_num, reserved_date })
        if (existingReservation) {
            return res.status(400).json({ message: "Seat already reserved for this date" })
        }

        let anonStatus = "N"
        if(anonymous === "Y") anonStatus = "Y" 

        let finalReservedForEmail;
        
        // Determine who the reservation is for based on user type
        if (user.account_type === "Student") {
            // Students can only reserve for themselves
            finalReservedForEmail = user.email;
        } else if (user.account_type === "Lab Technician" || user.account_type === "Staff") {
            // Staff and LabTech can reserve for others
            finalReservedForEmail = anonStatus === "Y" ? null : (reservedForEmail || user.email);
        }

        // Create reservation
        const newReservation = new Reservation({
            email: user.email, // who made the reservation
            request_date: new Date(),
            reserved_date: reserved_date,
            building_id: building_id,
            room_num: room_num,
            seat_num: seat_num,
            anonymous: anonStatus,
            reserved_for_email: finalReservedForEmail
        })

        await newReservation.save()
        console.log(`✅ Reservation created by ${user.first_name} (${user.account_type}) for ${finalReservedForEmail || "Anonymous"}`)

        res.status(201).json({ message: "Reservation created successfully!" })
    } catch (err) {
        console.error("⚠️ Error creating reservation:", err)
        res.status(500).json({ message: "Internal server error" })
    }
})

// Check for reservation conflicts
app.post('/check-reservation-conflict', isAuthenticated, async (req, res) => {
    try {
        const { reservationId, date, time, roomNumber, seatNumber } = req.body;
        
        // Create a date object from the date and time
        const reservationDateTime = new Date(`${date}T${time}`);

        // Check for existing reservations
        const conflict = await Reservation.findOne({
            _id: { $ne: reservationId }, // Exclude current reservation
            room_num: roomNumber,
            seat_num: seatNumber,
            reserved_date: reservationDateTime
        });

        res.json({ conflict: !!conflict });
    } catch (error) {
        console.error('Error checking conflicts:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update reservation - with proper authorization and enhanced functionality
app.put('/update-reservation/:id', isAuthenticated, isOwnerOrAuthorized, async (req, res) => {
    try {
        const { id } = req.params;
        const { reserved_date, time, room, seat, anonymous, reservedForEmail } = req.body;
        const user = req.session.user;
        
        console.log(`🔄 Update request from ${user.email} (${user.account_type}) for reservation ${id}`);
        console.log('📋 Update data:', { reserved_date, time, room, seat, anonymous, reservedForEmail });

        // Find the existing reservation
        const existingReservation = await Reservation.findById(id);
        if (!existingReservation) {
            console.log(`❌ Reservation ${id} not found`);
            return res.status(404).json({ error: 'Reservation not found' });
        }

        // Create the new reservation datetime
        const reservationDateTime = new Date(`${reserved_date}T${time}`);

        // Check for conflicts (exclude current reservation)
        const conflictingReservation = await Reservation.findOne({
            _id: { $ne: id }, // Exclude current reservation
            reserved_date: reservationDateTime,
            room_num: room,
            seat_num: parseInt(seat)
        });

        if (conflictingReservation) {
            console.log(`❌ Conflict found for ${room} seat ${seat} at ${reservationDateTime}`);
            return res.status(409).json({ error: 'Seat already reserved at that date and time' });
        }

        // Prepare update data
        const updateData = {
            reserved_date: reservationDateTime,
            request_date: new Date() // Update request date to current time
        };

        // Handle reservation assignment based on user role
        if (user.account_type === "Staff" || user.account_type === "Lab Technician") {
            // Staff and Lab Techs can change who the reservation is for
            if (anonymous === "Y") {
                updateData.anonymous = "Y";
                updateData.reserved_for_email = null;
                console.log(`🕶️ Setting reservation ${id} as anonymous`);
            } else {
                updateData.anonymous = "N";
                updateData.reserved_for_email = reservedForEmail || existingReservation.reserved_for_email;
                console.log(`👤 Assigning reservation ${id} to: ${updateData.reserved_for_email}`);
            }
        } else if (user.account_type === "Student") {
            // Students can only update date/time, not assignment
            console.log(`👨‍🎓 Student update - keeping existing assignment: ${existingReservation.reserved_for_email}`);
        }

        // Update the reservation
        const updatedReservation = await Reservation.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!updatedReservation) {
            console.log(`❌ Failed to update reservation ${id}`);
            return res.status(500).json({ error: 'Failed to update reservation' });
        }

        console.log(`✅ Reservation ${id} updated successfully by ${user.email}`);
        
        // Return the updated reservation data
        res.json({
            success: true,
            message: 'Reservation updated successfully',
            reservation: {
                id: updatedReservation._id,
                room_num: updatedReservation.room_num,
                seat_num: updatedReservation.seat_num,
                reserved_date: updatedReservation.reserved_date,
                reserved_for_email: updatedReservation.reserved_for_email,
                anonymous: updatedReservation.anonymous
            }
        });

    } catch (error) {
        console.error('⚠️ Error updating reservation:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Logged In User
app.get("/get-current-user", isAuthenticated, async (req, res) => {
    try {
        const User = req.session.user;

        if (!User) {
            console.warn("⚠️ No User found in the database.");
            return res.json([User]);
        }

        res.json(User);
    } catch (err) {
        console.error("⚠️ Error fetching User:", err);
        res.status(500).json({ message: "Error fetching User", error: err.message });
    }
});

// LOGOUT (destroy the session)
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err)
            return res.status(500).send("Error logging out")

        res.clearCookie('sessionId')
        res.clearCookie('rememberMe')
        res.redirect('/')
    })
})

const PORT = 3000;

app.listen(PORT, async function() {
    console.log(`Labyrinth App is now listening on port ${PORT}`);

    try {
        await connect();

    } catch (err) {
        console.log('Connection to MongoDB failed: ');
        console.error(err);
    }
});

// Force login route - clears session and redirects to login
app.get('/force-login', (req, res) => {
    console.log('🔄 Force login redirect triggered');
    
    if (req.session) {
        req.session.destroy((err) => {
            if (err) console.error('Session destruction error:', err);
        });
    }
    
    res.clearCookie('sessionId');
    res.clearCookie('rememberMe');
    res.clearCookie('connect.sid'); // Default session cookie name
    
    res.redirect('/login');
});

// Force home route
app.get('/force-home', (req, res) => {
    console.log('🏠 Force home redirect triggered');
    res.redirect('/');
});