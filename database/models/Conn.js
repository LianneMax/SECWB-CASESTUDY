// MongoDB Connection Script
const mongoose = require('mongoose')

const mongoURI = 'mongodb+srv://admin:HdWcIfrhJ7oG6baf@labyrinthcluster.xwg3l.mongodb.net/'


// DB CONNECTION: mongodb+srv://admin:<db_password>@labyrinthcluster.xwg3l.mongodb.net/
// mongoose.connect('mongodb://127.0.0.1:27017/labyrinthDB', { 
function connectToDB() {
    mongoose.connect(mongoURI, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true 
    }).then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => console.error('MongoDB connection error:', err));
}

function disconnect(){
    console.log('Disconnecting from Mongodb...');
    mongoose.disconnect();
}

function signalHandler() {
    disconnect();
    process.exit();
}

module.exports = {
    connect: connectToDB,
    disconnect: disconnect
};