
const mongoose = require('mongoose');

// Hardcoded for testing script only
const MONGODB_URI = 'mongodb+srv://contactgokulravi123_db_user:KQqxmAYWniDouV07@cluster0.olbpjb2.mongodb.net/?appName=Cluster0';

async function testConnection() {
    console.log('Testing MongoDB Connection...');
    console.log('URI:', MONGODB_URI);

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Successfully connected to MongoDB!');
        await mongoose.connection.close();
        console.log('Connection closed.');
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

testConnection();
