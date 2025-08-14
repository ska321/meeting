'use client'; // This directive is crucial for client-side components

import { useState } from 'react'; // For managing component state.
import { useRouter } from 'next/navigation'; // For programmatic navigation (redirects).
import { useSession, signOut } from 'next-auth/react'; // For authentication session management.
import { nanoid } from 'nanoid'; // To generate a unique short ID for new meetings.


export default function Home() {
  const { data: session, status } = useSession(); // Get session data and loading status.
  const router = useRouter(); // Initialize Next.js router.

  const [meetingTitle, setMeetingTitle] = useState(''); // State for the new meeting title input.
  const [joinMeetingId, setJoinMeetingId] = useState(''); // State for joining an existing meeting.
  const [createError, setCreateError] = useState(''); // State for displaying creation errors.
  const [createSuccess, setCreateSuccess] = useState(''); // New state for displaying creation success messages.
  const [joinError, setJoinError] = useState(''); // State for displaying join errors.

  // Handle creating a new meeting
  const handleCreateMeeting = async (e) => {
    e.preventDefault(); // Prevent default form submission.
    setCreateError(''); // Clear previous errors.
    setCreateSuccess(''); // Clear previous success messages.

    // Basic validation for meeting title
    if (!meetingTitle.trim()) {
      setCreateError('Meeting title cannot be empty.');
      return;
    }

    // Ensure user is authenticated before attempting to create a meeting
    if (status === 'unauthenticated' || !session) {
      setCreateError('Authentication required to create a meeting. Please sign in.');
      // Optional: Redirect to sign-in page if not authenticated
      // router.push('/api/auth/signin');
      return;
    }

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: meetingTitle }), // Send the meeting title to the API.
      });

      const data = await response.json(); // Parse the response from the API.

      if (response.ok) {
        // If the meeting was created successfully (2xx status code)
        setCreateSuccess(`Meeting "${data.data.title}" created successfully! ID: ${data.data.shortId}`);
        setMeetingTitle(''); // Clear the input field.
        // Redirect to the newly created meeting page after a short delay
        setTimeout(() => {
          router.push(`/meeting/${data.data.shortId}`);
        }, 1500); // Redirect after 1.5 seconds
      } else {
        // If there was an error from the API (e.g., 400, 401, 500)
        setCreateError(data.message || 'Failed to create meeting.');
      }
    } catch (error) {
      // Catch network errors or unexpected issues
      console.error('Error creating meeting:', error);
      setCreateError('An unexpected error occurred. Please try again.');
    }
  };

  // Handle joining an existing meeting
  const handleJoinMeeting = (e) => {
    e.preventDefault();
    setJoinError('');

    if (!joinMeetingId.trim()) {
      setJoinError('Please enter a Meeting ID.');
      return;
    }

    // Redirect to the meeting page using the entered ID
    router.push(`/meeting/${joinMeetingId.trim()}`);
  };

  // Display a loading state while session is being loaded
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading authentication...
      </div>
    );
  }

  // Main UI rendering
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      {/* User authentication status display */}
      <div className="absolute top-4 right-4 flex items-center space-x-4">
        {session ? (
          <>
            <span className="text-gray-300">Welcome, {session.user.name || session.user.email}!</span>
            <button onClick={() => signOut()} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200">
              Sign Out
            </button>
          </>
        ) : (
          <>
            <span className="text-gray-300">Not signed in</span>
            <button onClick={() => router.push('/api/auth/signin')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200">
              Sign In
            </button>
          </>
        )}
      </div>

      {/* Main Card for Meeting Actions */}
      <div className="w-full max-w-md bg-gray-800 text-white border-gray-700 shadow-lg p-6 rounded-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Start or Join a Meeting</h1>
          <p className="text-gray-400">
            Create a new instant meeting or join an existing one.
          </p>
        </div>
        <div className="space-y-6">
          {/* Create New Meeting Section */}
          <form onSubmit={handleCreateMeeting} className="space-y-4">
            <h2 className="text-xl font-semibold text-blue-400 border-b border-gray-700 pb-2">Create a New Meeting</h2>
            <label htmlFor="meeting-title" className="text-gray-300">Meeting Title</label>
            <input
              id="meeting-title"
              type="text"
              placeholder="e.g., Daily Standup"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 p-2 rounded-md"
            />
            {createError && <p className="text-red-400 text-sm mt-2">{createError}</p>}
            {createSuccess && <p className="text-green-400 text-sm mt-2">{createSuccess}</p>}
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md transition duration-200"
              disabled={status === 'unauthenticated' || !session} // Disable if not authenticated
            >
              Create Meeting
            </button>
          </form>

          <div className="flex items-center justify-center my-6">
            <span className="text-gray-500 text-lg">OR</span>
          </div>

          {/* Join Existing Meeting Section */}
          <form onSubmit={handleJoinMeeting} className="space-y-4">
            <h2 className="text-xl font-semibold text-purple-400 border-b border-gray-700 pb-2">Join an Existing Meeting</h2>
            <label htmlFor="meeting-id" className="text-gray-300">Enter Meeting ID</label>
            <input
              id="meeting-id"
              type="text"
              placeholder="e.g., abcdef123"
              value={joinMeetingId}
              onChange={(e) => setJoinMeetingId(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 p-2 rounded-md"
            />
            {joinError && <p className="text-red-400 text-sm mt-2">{joinError}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition duration-200">
              Join Meeting
            </button>
          </form>
        </div>
        <div className="text-center text-gray-500 text-sm mt-6">
          <p>&copy; {new Date().getFullYear()} NextMeet. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}