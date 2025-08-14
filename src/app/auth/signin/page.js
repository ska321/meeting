// src/app/auth/signin/page.js
import { getServerSession } from "next-auth";
import { getProviders } from "next-auth/react";
import { redirect } from 'next/navigation';
import { authOptions } from "../../api/auth/[...nextauth]/route"; // Correct import path for authOptions

// Import the client component
import SignInClientPage from './SignInClientPage';

// This is an async Server Component
export default async function SignInPageWrapper() {
  const providers = await getProviders(); // Fetch providers on the server
  const session = await getServerSession(authOptions);

  // If user is already authenticated, redirect
  if (session) {
    redirect('/');
  }

  // Pass providers to the client component
  return <SignInClientPage providers={providers} />;
}