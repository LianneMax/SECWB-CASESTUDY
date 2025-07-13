// Script for Populating Database

const { connect, disconnect } = require('./database/models/Conn.js');

const User = require("./database/models/User")
const Seat = require("./database/models/Seat")
const Building = require("./database/models/Building.js")
const Room = require("./database/models/Room")
const Reservation = require("./database/models/Reservation")
const SecurityQuestion = require('./database/models/SecurityQuestion');
const path = require('path')

// Sample Admin Accounts
var admin1 = {
    last_name: "Carunongan",
    first_name: "Arturo",
    email: "art@dlsu.edu.ph",
    password: "9478bb58c888759b01f502aec75dabd4ea5ba64b45442127ca337ceb280f4f57", // actual admin password: "adminpassword1234"
    account_type: "Lab Technician",
    profile_picture: "profile_pics/default_avatar.jpg",
}

var admin2 = {
    last_name: "Fazbear",
    first_name: "John",
    email: "john_fazbear@dlsu.edu.ph",
    password: "4b8f353889d9a05d17946e26d014efe99407cba8bd9d0102d4aab10ce6229043", // actual admin password: "password01"
    account_type: "Lab Technician",
    profile_picture: "profile_pics/default_avatar.jpg",
}

// Sample Student Accounts
var student1 = {
    last_name: "Ang",
    first_name: "Jeremiah",
    email: "jeremiah_ang@dlsu.edu.ph",
    password: "68eaeeaef51a40035b5d3705c4e0ffd68036b6b821361765145f410b0f996e11", // actual student password: "studentpassword"
    account_type: "Student",
    profile_picture: "profile_pics/Ang_Jeremiah_avatar.jpg",
}

var student2 = {
    last_name: "Duelas",
    first_name: "Charles Kevin",
    email: "charles_duelas@dlsu.edu.ph",
    password: "af0d81ce666749c1e154a461a8c4f1117010dc058a4b08a45987328730e19d20", // actual student password: "quackerson"
    account_type: "Student",
    profile_picture: "profile_pics/default_avatar.jpg",
}

var student3 = {
    last_name: "Woo",
    first_name: "Sung Jin",
    email: "sung_woo@dlsu.edu.ph",
    password: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f", // actual student password: "password123"
    account_type: "Student",
    profile_picture: "profile_pics/Woo_Sung Jin_20250312.jpg",
}

// Run all insert functions sequentially
async function runInserts() {
    try{
        await connect();

        await insertReservations();
        
        // Uncomment if building, rooms and seats aren't initialized in the DB
        await insertUsers();
        await insertBuildings();
        await insertRooms();
        await insertSeats();
        

        // addDefaultSecurityQuestions();

        console.log('Labyrinth Database has been populated! ');
        disconnect();
        process.exit();
    }

    catch (err) {
        console.error(err);
    }

}

runInserts();

// Function to Insert 5 Sample Users
async function insertUsers() {
    try {
        await User.findOneAndUpdate({ email: admin1.email }, admin1, { upsert: true, new: true })
        await User.findOneAndUpdate({ email: admin2.email }, admin2, { upsert: true, new: true })
        await User.findOneAndUpdate({ email: student1.email }, student1, { upsert: true, new: true })
        await User.findOneAndUpdate({ email: student2.email }, student2, { upsert: true, new: true })
        await User.findOneAndUpdate({ email: student3.email }, student3, { upsert: true, new: true })
        console.log("✅ Users inserted or updated")
    } catch (err) {
        console.error("⚠️ Error inserting users:", err)
    }
}

// Insert Buildings into DB
async function insertBuildings() {
    try {
        // Define building data
        const buildings = [
            { building_id: 1, building_name: "Science Hall" },
            { building_id: 2, building_name: "Engineering Complex" },
            { building_id: 3, building_name: "Library" },
            { building_id: 4, building_name: "Miguel Hall" }
        ]

        for (const building of buildings) {
            const existingBuilding = await Building.findOne({ building_id: building.building_id })

            if (!existingBuilding) {
                // Explicitly create the document using `new Building()` before saving
                const newBuilding = new Building(building)
                await newBuilding.save()
                console.log(`✅ Building '${building.building_name}' (ID: ${building.building_id}) added.`)
            } else {
                console.warn(`⚠️ Building '${building.building_name}' already exists. Skipping...`)
            }
        }

        console.log("✅ Building insertion process completed.")
    } catch (err) {
        console.error("⚠️ Error inserting buildings:", err)
    }
}

//hardcoded room values
async function insertRooms() {
    try {
        // Validate that buildings exist before adding rooms
        const existingBuildings = await Building.find()
        if (existingBuildings.length === 0) {
            console.error("⚠️ No buildings found. Cannot insert rooms.")
            return
        }

        // Define room data
        const buildings = 3;
        const floorsPerBuilding = 3;
        const roomsPerFloor = 6;
        
        const prefixes = {
            1: "SH",
            2: "EC",
            3: "LB",
            4: "MH"
        };
        
        const rooms = [];
        
        for (let b = 1; b <= 4; b++) {
            for (let f = 1; f <= floorsPerBuilding; f++) {
                for (let r = 1; r <= roomsPerFloor; r++) {
                    rooms.push({
                        building_id: b,
                        room_num: `${prefixes[b]}${f}${r.toString().padStart(2, "0")}`, // Prefix + Floor + Room Number
                        floor_num: f
                    });
                }
            }
        }

        for (const room of rooms) {
            // Check if the referenced building exists
            const buildingExists = existingBuildings.some(b => b.building_id === room.building_id)

            if (!buildingExists) {
                console.warn(`⚠️ Skipping Room ${room.room_num}: Building ID ${room.building_id} not found.`)
                continue
            }

            // Check if the room already exists before inserting
            const existingRoom = await Room.findOne({ room_num: room.room_num })

            if (!existingRoom) {
                await Room.create(room)
                console.log(`✅ Room ${room.room_num} added in Building ID ${room.building_id}.`)
            } else {
                console.warn(`⚠️ Room ${room.room_num} already exists. Skipping...`)
            }
        }

        console.log("✅ Room insertion process completed.")
    } catch (err) {
        console.error("⚠️ Error inserting rooms:", err)
    }
}

//hardcoded seat values
async function insertSeats() {
    try {
        // Fetch all rooms from the database
        const existingRooms = await Room.find();

        if (existingRooms.length === 0) {
            console.error("⚠️ No rooms found. Cannot insert seats.");
            return;
        }

        const seats = [];

        // Generate 20 seats per room
        for (const room of existingRooms) {
            for (let seatNum = 1; seatNum <= 20; seatNum++) {
                seats.push({
                    room_num: room.room_num,
                    seat_num: seatNum
                });
            }
        }

        // Insert seats into the database
        for (const seat of seats) {
            await Seat.findOneAndUpdate(
                { room_num: seat.room_num, seat_num: seat.seat_num }, // Unique seat per room
                seat, // Data to insert/update
                { upsert: true, new: true, setDefaultsOnInsert: true } // Upsert options
            );
        }

        console.log("✅ Seats inserted (if not duplicates)");
    } catch (err) {
        console.error("⚠️ Error inserting seats:", err);
    }
}

// Add default security questions for existing users
async function addDefaultSecurityQuestions() {
    try {
        const users = await User.find();
        for (const user of users) {
            const existingQuestion = await SecurityQuestion.findOne({ user_id: user._id });
            if (!existingQuestion) {
                const defaultQuestion = new SecurityQuestion({
                    user_id: user._id,
                    email: user.email,
                    security_question: "What is your mother's maiden name?",
                    security_answer: "smith" // Default answer
                });
                await defaultQuestion.save();
                console.log(`Added default security question for ${user.email}`);
            }
        }
    } catch (err) {
        console.error("Error adding default security questions:", err);
    }
}

//  5 Sample Reservations
async function insertReservations() {
    try {
        // Fetch user IDs dynamically instead of hardcoding them
        const admin = await User.findOne({ email: "art@dlsu.edu.ph" })
        const admin2 = await User.findOne({ email: "john_fazbear@dlsu.edu.ph" })
        const student1 = await User.findOne({ email: "jeremiah_ang@dlsu.edu.ph" })
        const student2 = await User.findOne({ email: "charles_duelas@dlsu.edu.ph" })
        const student3 = await User.findOne({ email: "sung_woo@dlsu.edu.ph" })

        // Validate that all required users exist
        if (!admin || !admin2 || !student1 || !student2 || !student3) {
            console.error("❌ Error: One or more required users not found. Cannot create reservations.")
            return
        }

        // Define hardcoded reservations with dynamically fetched user IDs
        const reservations = [
            {
                email: student1.email,
                request_date: new Date("2025-04-09T10:00:00Z"),
                reserved_date: new Date("2025-04-09T14:00:00Z"),
                building_id: 3,
                room_num: "LB101",
                seat_num: 1,
                anonymous: "N",
                reserved_for_email: student1.email // Assigned to a student
            },
            {
                email: student3.email,
                request_date: new Date("2025-04-09T08:30:00Z"),
                reserved_date: new Date("2025-04-09T13:30:00Z"),
                building_id: 2,
                room_num: "EC104",
                seat_num: 3,
                anonymous: "N",
                reserved_for_email: student3.email // Assigned to a student
            },
            {
                email: student3.email,
                request_date: new Date("2025-04-08T11:30:00Z"),
                reserved_date: new Date("2025-04-09T09:00:00Z"),
                building_id: 3,
                room_num: "LB102",
                seat_num: 1,
                anonymous: "Y",
                reserved_for_email: student3.email // Anonymous reservation
            },
            {
                email: student3.email,
                request_date: new Date("2025-04-09T10:30:00Z"),
                reserved_date: new Date("2025-04-10T09:00:00Z"),
                building_id: 3,
                room_num: "LB103",
                seat_num: 1,
                anonymous: "N",
                reserved_for_email: student3.email // Anonymous reservation
            },
            {
                email: admin2.email,
                request_date: new Date("2025-04-09T14:45:00Z"),
                reserved_date: new Date("2025-04-09T16:00:00Z"),
                building_id: 3,
                room_num: "LB103",
                seat_num: 2,
                anonymous: "N",
                reserved_for_email: student2.email
            },
            // 🔹 New Anonymous Reservation
            {
                email: admin.email,
                request_date: new Date("2025-04-09T12:00:00Z"),
                reserved_date: new Date("2025-04-10T10:30:00Z"),
                building_id: 1,
                room_num: "SH105",
                seat_num: 4,
                anonymous: "Y", // ✅ Anonymous reservation
                reserved_for_email: student3.email
            },
            // 🔹 New Non-Anonymous Reservation
            {
                email: admin.email,
                request_date: new Date("2025-04-09T09:15:00Z"),
                reserved_date: new Date("2025-04-19T15:45:00Z"),
                building_id: 1,
                room_num: "SH106",
                seat_num: 1,
                anonymous: "N", // ✅ Non-anonymous reservation
                reserved_for_email: student1.email
            }
        ]        

        // Insert reservations only if they don't exist
        for (const reservation of reservations) {
            const existingReservation = await Reservation.findOne({
                room_num: reservation.room_num,
                seat_num: reservation.seat_num,
                reserved_date: reservation.reserved_date
            })

            if (!existingReservation) {
                await Reservation.create(reservation)
                console.log(`✅ Reservation added for Building ${reservation.building_id}, Room ${reservation.room_num}, Seat ${reservation.seat_num}`)
            } else {
                console.warn(`⚠️ Seat ${reservation.seat_num} in Room ${reservation.room_num}, Building ${reservation.building_id} is already reserved.`)
            }
        }

        console.log("✅ Reservation process completed.")
    } catch (err) {
        console.error("⚠️ Error inserting reservations:", err)
    }
}