// src/app/auth/signin/SignInClientPage.js
'use client'; // Essential for client-side interactivity

import { signIn } from 'next-auth/react';
import Image from 'next/image';

export default function SignInClientPage({ providers }) {
  // `providers` will only contain Google if configured correctly
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Sign In</h1>
        {providers && providers.google ? ( // Check specifically for google provider
          <div className="mb-4">
            <button
              onClick={() => signIn(providers.google.id, { callbackUrl: '/' })}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Image src="https://www.svgrepo.com/show/508272/google.svg" alt="Google logo" className="h-5 w-5 mr-2" />
              Sign in with Google
            </button>
          </div>
        ) : (
          <p className="text-gray-600">Loading providers...</p> // This will appear if no providers are found
        )}
        <p className="mt-6 text-sm text-gray-600">
          Or create an account via the sign-in options above.
        </p>
      </div>
    </div>
  );
}