// src/app/api/meetings/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions'; // Ensure this path is correct
import Meeting from '@/models/Meeting'; // Ensure this path is correct for your Mongoose Meeting model
import dbConnect from '@/lib/mongodb'; // Assuming you have a dbConnect utility

export async function GET(request, { params }) {
  await dbConnect(); // Ensure the database connection is established

  try {
    // ✅ FIX: Await params as it can be a Promise in Next.js Server Components (API Routes)
    const { id } = await params; // This 'id' will be your shortId (e.g., 'zrgumig')

    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ success: false, message: 'Authentication required' }), {
        status: 401, // Unauthorized
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ✅ Find meeting by shortId (as configured in your schema and POST handler)
    const meeting = await Meeting.findOne({ shortId: id });
    if (!meeting) {
      return new Response(JSON.stringify({ success: false, message: 'Meeting not found' }), {
        status: 404, // Not Found
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Optional: Add authorization check if only participants or host can view details
    // if (!meeting.participants.some(p => p._id.toString() === session.user.id) && meeting.hostId.toString() !== session.user.id) {
    //   return new Response(JSON.stringify({ success: false, message: 'Unauthorized access to meeting' }), {
    //     status: 403, // Forbidden
    //     headers: { 'Content-Type': 'application/json' }
    //   });
    // }

    return new Response(JSON.stringify({ success: true, data: meeting }), {
      status: 200, // OK
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching meeting:', error);

    // Handle Mongoose CastError if an ObjectId-like ID is passed but shortId expects string
    // This check is now less critical if you consistently use shortId, but good for robustness
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
        return new Response(JSON.stringify({ success: false, message: 'Invalid Meeting ID format' }), {
            status: 400, // Bad Request
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), {
      status: 500, // Internal Server Error
      headers: { 'Content-Type': 'application/json' }
    });
  }
}