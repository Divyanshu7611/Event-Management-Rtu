/**
 * Script to fix the rollNumber index in MongoDB
 * Run this script once to drop and recreate the index with sparse option
 * 
 * Usage: node scripts/fix-rollnumber-index.js
 * Or use MongoDB shell: 
 * db.users.dropIndex("rollNumber_1")
 * db.users.createIndex({ rollNumber: 1 }, { unique: true, sparse: true })
 */

const mongoose = require('mongoose');
const User = require('../models/User').default;

async function fixRollNumberIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // Check existing indexes
    const indexes = await collection.indexes();
    console.log('Existing indexes:', indexes);

    // Drop the old rollNumber index if it exists
    try {
      await collection.dropIndex('rollNumber_1');
      console.log('Dropped old rollNumber_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('Index rollNumber_1 does not exist, skipping drop');
      } else {
        throw error;
      }
    }

    // Create new sparse unique index
    await collection.createIndex({ rollNumber: 1 }, { unique: true, sparse: true });
    console.log('Created new sparse unique index on rollNumber');

    // Update existing documents with null rollNumber to undefined
    const result = await collection.updateMany(
      { rollNumber: null },
      { $unset: { rollNumber: "" } }
    );
    console.log(`Updated ${result.modifiedCount} documents to remove null rollNumber`);

    console.log('Index fix completed successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error fixing index:', error);
    process.exit(1);
  }
}

fixRollNumberIndex();

