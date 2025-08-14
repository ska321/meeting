// src/app/api/meetings/route.js

import { getServerSession } from 'next-auth'; // For getting the current user session
import { authOptions } from '@/lib/authOptions'; // Your NextAuth.js configuration
import Meeting from '@/models/Meeting'; // Your Mongoose Meeting model
import { nanoid } from 'nanoid'; // For generating short unique IDs
import dbConnect from '@/lib/mongodb'; // Your database connection utility

// POST handler for creating a new meeting
export async function POST(request) {
  await dbConnect(); // Connect to MongoDB

  // Get the server-side session
  const session = await getServerSession(authOptions);

  // Check if the user is authenticated and has a user ID in the session
  if (!session || !session.user || !session.user.id) {
    console.error("Authentication required: Session or user ID missing for meeting creation.");
    return new Response(JSON.stringify({ success: false, message: 'Authentication required' }), {
      status: 401, // Unauthorized
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    // Parse the request body to get meeting details
    const { title, description } = await request.json();

    // Basic validation for the meeting title
    if (!title || title.trim() === '') {
      return new Response(JSON.stringify({ success: false, message: 'Meeting title is required.' }), {
        status: 400, // Bad Request
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Generate a unique short ID for the meeting
    const generatedShortId = nanoid(7); // e.g., "aBc123X"

    // Create a new Meeting document using the Mongoose model
    const newMeeting = new Meeting({
      shortId: generatedShortId, // Assign the generated unique ID
      hostId: session.user.id,   // Host's ID from the authenticated session
      title: title.trim(),
      description: description ? description.trim() : '', // Handle optional description
      participants: [{
        _id: session.user.id, // Host is the first participant
        name: session.user.name || 'Host' // Use session name or a default
      }],
      createdAt: new Date(), // Set creation timestamp
    });

    // Save the new meeting document to the database
    await newMeeting.save();

    // Return a success response with the created meeting data
    return new Response(JSON.stringify({ success: true, data: newMeeting }), {
      status: 201, // 201 Created - Indicates successful resource creation
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error creating meeting:', error);

    // Handle Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => error.errors[key].message);
      return new Response(JSON.stringify({ success: false, message: 'Validation failed', errors: errors }), {
        status: 400, // Bad Request due to validation issues
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Handle duplicate key errors (e.g., if shortId is somehow not unique, though nanoid is highly unlikely to repeat)
    if (error.code === 11000) {
        return new Response(JSON.stringify({ success: false, message: 'Duplicate meeting ID generated, please try again.' }), {
            status: 409, // Conflict
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }


    // Catch any other unexpected server errors
    return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), {
      status: 500, // Internal Server Error
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// You might also have a GET handler here if you need to fetch meetings
// export async function GET(request) {
//   // ...
// }