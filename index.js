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

const isAuthenticated = (req, res, next) => {
    if(req.session.user)
        next()

    else res.redirect("/login")
}

// Middleware to check if the user is a Lab Technician
const isLabTech = (req, res, next) => {
    if (req.session.user && req.session.user.account_type === "Lab Technician") {
        next()
    } else {
        res.status(403).json({ message: "Access denied. Only Lab Technicians can perform this action." })
    }
}

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

// Get All Students
app.get("/all-students", isAuthenticated, async (req, res) => {
    try {
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

// LabTech Dashboard Deletion Feature Route
app.delete('/reservations/:id', isLabTech, async (req, res) => {
    try {
        const reservationId = req.params.id;

        // Find and delete reservation
        const deletedReservation = await Reservation.findByIdAndDelete(reservationId);

        if (!deletedReservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        console.log(`✅ Reservation ${reservationId} deleted successfully`);
        res.status(200).json({ message: "Reservation deleted successfully" });
    } catch (error) {
        console.error("⚠️ Error deleting reservation:", error);
        res.status(500).json({ message: "Error deleting reservation", error: error.message });
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

        // const userEmail = req.session.user.email; // Get current user's email
        console.log(`🔍 Fetching reservations for user: ${userEmail}`);

        // Query database for user's reservations
        // let my_reservations = await Reservation.find({ email: userEmail }).lean();
        let reservations = await Reservation.find({reserved_for_email: userEmail }).lean();
        // let reservations = my_reservations.concat(labtech_reservations); //combine

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

        // Check if email contains @dlsu.edu.ph
        if (!email.endsWith("@dlsu.edu.ph")) {
            return res.status(400).json({
                success: false,
                message: "Email must be a valid DLSU email ending with @dlsu.edu.ph"
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
        const hashedPassword = sha256(password);
        const newUser = new User({
            email,
            first_name,
            last_name,
            password: hashedPassword,
            account_type,
            profile_picture: "profile_pics/default_avatar.jpg"
        });

        const savedUser = await newUser.save();

        // Create security question document
        const securityQuestionDoc = new SecurityQuestion({
            user_id: savedUser._id,
            email: email,
            security_question,
            security_answer: security_answer.toLowerCase()
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
            return res.status(404).json({ 
                success: false, 
                message: "Email not found" 
            });
        }

        res.json({ 
            success: true, 
            question: securityQuestion.security_question 
        });
    } catch (error) {
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

        if (securityQuestion.security_answer === answer.toLowerCase()) {
            req.session.resetPasswordEmail = email;
            res.json({ success: true });
        } else {
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
        const hashedPassword = sha256(newPassword);

        const updatedUser = await User.findOneAndUpdate(
            { email },
            { password: hashedPassword },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

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

    console.log("🔍 Attempting login with Email:", email);
    console.log("🔍 Hashed Password:", sha256(password));

    try {
        // Check if user exists
        const existingUser = await User.findOne({ email: email });

        if (!existingUser) {
            console.warn("⚠️ User not found:", email);
            return res.status(401).json({ success: false, message: "User not found." });
        }

        // Check if password matches
        if (existingUser.password !== sha256(password)) {
            console.warn("⚠️ Incorrect password for:", email);
            return res.status(401).json({ success: false, message: "Invalid password." });
        }

        console.log("✅ Signed in:", existingUser.email, "| Role:", existingUser.account_type);
        req.session.user = existingUser; // Store user session

        // Set "Remember Me" cookie if checked
        if (rememberMe) {
            res.cookie("rememberMe", existingUser._id.toString(), { maxAge: 1814400000, httpOnly: true }); // 3 weeks
        }

        res.cookie("sessionId", req.sessionID);

        // Role-based Redirection (ONLY Student & Lab Technician)
        let redirectUrl;
        if (existingUser.account_type === "Student") {
            redirectUrl = "/dashboard";
        } else if (existingUser.account_type === "Lab Technician") {
            redirectUrl = "/labtech";
        } else {
            console.warn("⚠️ Unknown account type:", existingUser.account_type);
            return res.status(401).json({ success: false, message: "Invalid account type." });
        }

        console.log(`🔀 Redirecting ${existingUser.email} to: ${redirectUrl}`);
        return res.json({ success: true, redirect: redirectUrl });

    } catch (err) {
        console.error("❌ Error during login:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// Profile Page
app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const email = req.query.email || req.session.user.email; // Use query parameter or fallback to logged-in user
        const userData = await User.findOne({ email }).lean();

        if (!userData) {
            return res.status(404).send("<script>alert('User not found!'); window.location='/dashboard';</script>");
        }

        res.render('profile', { userData, sessionUser: req.session.user }); // Pass session user
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

        const updatedData = {};
        if (first_name) updatedData.first_name = first_name;
        if (last_name) updatedData.last_name = last_name;
        if (description) updatedData.description = description;

        if (Object.keys(updatedData).length > 0) {
            const updatedUser = await User.findByIdAndUpdate(userData._id, updatedData, { new: true });
            req.session.user = updatedUser; // Update session with new user data
            console.log("✅ Profile updated:", updatedData);

            res.redirect('/profile')

        } else {
            return res.status(400).json({ success: false, message: "No changes made." });
        }
    } catch (err) {
        console.error("⚠️ Error updating profile:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

// Change password POST Route
app.post('/changepassword', isAuthenticated, async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const user_id = req.session.user._id;

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).send("<script>alert('Passwords do not match!'); window.location='/profile';</script>");
        }

        // Hash new password
        const hashedPassword = sha256(newPassword);

        // Update password in the database
        await User.findByIdAndUpdate(user_id, { password: hashedPassword });

        console.log(`✅ Password updated for user: ${req.session.user.email}`);

        // Destroy session to log user out
        req.session.destroy((err) => {
            if (err) {
                console.error("⚠️ Error logging out after password change:", err);
                return res.status(500).send("<script>alert('Error logging out. Please try again.'); window.location='/profile';</script>");
            }

            // Clear session-related cookies
            res.clearCookie("sessionId");
            res.clearCookie("rememberMe");

        });

    } catch (err) {
        console.error("⚠️ Error updating password:", err);
        res.status(500).send("<script>alert('Internal server error'); window.location='/profile';</script>");
    }
});

// Delete User Account Route
app.delete('/deleteaccount', isAuthenticated, async (req, res) => {
    try {
        const user_id = req.session.user._id;
        const user_email = req.session.user.email;

        // Delete all future reservations associated with the user
        const currentDate = new Date();
        const deletedReservations = await Reservation.deleteMany({
            email: user_email,
            reserved_date: { $gte: currentDate }
        });

        const deletedSecurityQuestion = await SecurityQuestion.deleteMany({
            email: user_email,
        });

        console.log(`🗑️ Deleted ${deletedReservations.deletedCount} future reservations for user: ${user_email}`);
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

// Route to labtech handlebar
app.get('/labtech', isAuthenticated, (req,res) => {
    const userData = req.session.user
    console.log(userData)

    res.render('labtech', {userData})
})

// Route so Labtech admins can reserve for walk-in students
app.post('/labtechReserve', isAuthenticated, async (req, res) => {
    try {
        const { reserved_date, building_id, room_num, seat_num, anonymous, reservedForEmail } = req.body;
        const user = req.session.user;

        // Confirm user is a lab technician
        if (user.account_type !== 'Lab Technician') {
            return res.status(403).json({ message: "Only Lab Technicians can create this type of reservation." });
        }

        // Check if the seat is already reserved
        const existingReservation = await Reservation.findOne({ room_num, seat_num, reserved_date });
        if (existingReservation) {
            return res.status(400).json({ message: "Seat already reserved for this date" });
        }

        // Determine who the reservation is for
        const reservedFor = anonymous === "Y" ? null : reservedForEmail;

        // Create the reservation
        const newReservation = new Reservation({
            email: user.email, // the labtech who made the reservation
            request_date: new Date(),
            reserved_date,
            building_id,
            room_num,
            seat_num,
            anonymous,
            reserved_for_email: reservedFor
        });

        await newReservation.save();
        console.log(`✅ LabTech ${user.email} reserved a seat for ${reservedFor || "Anonymous"}`);

        res.redirect('/labtech');
    } catch (err) {
        console.error("⚠️ Error creating LabTech reservation:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Route to get the list of registered students in the database
app.get('/labtechReserve', async (req, res) => {
    try {
        const userData = req.session.user;
        if (!userData) {
            return res.redirect('/login'); // Redirect to login if the user is not logged in
        }

        // Fetch buildings from the database
        const buildings = await Building.find({}, 'building_name').lean();

        // Fetch students using getStudentsFromDB function
        const students = await getStudentsFromDB();

        // Render the labtechReserve page and pass userData, buildings, and students
        res.render('labtechReserve', { userData, buildings, students });
    } catch (error) {
        console.error("Error fetching buildings and students:", error);
        res.status(500).send("Error fetching buildings and students");
    }
});

// Fetch available rooms for a selected building and floor
app.get("/available-rooms", async (req, res) => {
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

// Route to reservation handlebar (MUST DEPEND ON USER SESSION)
app.get('/reserve', isAuthenticated, async (req, res) => {
    try {
        const userData = req.session.user;
        console.log(userData);

        const buildings = await Building.find({}, 'building_name'); // Fetch buildings

        res.render('reserve', { userData, buildings }); // Pass buildings to Handlebars
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

    else res.render('labtech', {userData})
})

// Create Reservation POST Route
app.post('/reserve', isAuthenticated, async (req, res) => {
    try {
        const { reserved_date, building_id, room_num, seat_num, anonymous,  reserved_for_email } = req.body
        const user = req.session.user // Get logged-in user

        // Check if seat is already reserved
        const existingReservation = await Reservation.findOne({ room_num, seat_num, reserved_date })
        if (existingReservation) {
            return res.status(400).json({ message: "Seat already reserved for this date" })
        }

        let reserved_for = user.email;

        // If lab tech reserves for a student
        if(user.account_type != "Student"){
            reserved_for = reserved_for_email;
        }

        let anonStatus = "N"
        if(anonymous === "Y") anonStatus = "Y" 

        // Create reservation
        const newReservation = new Reservation({
            email: user.email, //who reserved the seat
            request_date: new Date(),
            reserved_date: reserved_date,
            building_id: building_id,
            room_num: room_num,
            seat_num: seat_num,
            anonymous: anonStatus,
            reserved_for_email: reserved_for,
        })

        await newReservation.save()
        console.log(`✅ Reservation created by ${req.session.user.first_name}`)

        // res.status(201).json({ message: "Reservation created successfully!" })
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

// Update reservation
app.put('/update-reservation/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { reserved_date, time, room, seat } = req.body;
        console.log("Edit reservation: " + reserved_date, time, room, seat);

        // Create a date object from the date and time
        const reservationDateTime = new Date(`${reserved_date}T${time}`);

        let reservationExists = await Reservation.findOne({reserved_date: reservationDateTime, room_num: room, seat_num: seat});
        console.log("reservationExists: " + reservationExists);

        let updatedReservation = {}

        // UPDATE if seat is available at the new time
        if(reservationExists == null){
            console.log("Reservation is free.")
            updatedReservation = await Reservation.findByIdAndUpdate(
                id,
                {
                    reserved_date: reservationDateTime,
                    request_date: new Date(), // Update request date to current time
                },
                { new: true }
            );

            res.json(updatedReservation);
            console.log("updatedReservation: " +updatedReservation);
        }
        else {
            return res.status(404).json({ error: 'Seat already reserved at that date and time' });
        }

        if (!updatedReservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }


    } catch (error) {
        console.error('Error updating reservation:', error);
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