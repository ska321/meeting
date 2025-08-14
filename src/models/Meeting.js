// src/models/Meeting.js
import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model and store user IDs
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  // You might add other participant-specific fields here, e.g., 'role', 'joinedAt'
});

const meetingSchema = new mongoose.Schema({
  // Use 'shortId' as the primary unique identifier for meetings
  shortId: {
    type: String,
    required: true,
    unique: true, // This is CRUCIAL for uniqueness
    index: true,  // Good practice for frequently queried fields
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  participants: [participantSchema], // Array of participant objects
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the `updatedAt` field on save
meetingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure the model is not recompiled if it already exists
const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);

export default Meeting;