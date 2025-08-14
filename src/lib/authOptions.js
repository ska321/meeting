// src/lib/authOptions.js
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * @type {import("next-auth").NextAuthOptions}
 */
export const authOptions = {
  providers: [
    // --- Google Provider ---
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    // --- Credentials Provider (optional) ---
    // Uncomment if you want to allow custom email/password login
    /*
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // TODO: Replace with DB lookup
        const dummyUser = { id: "1", name: "Test User", email: "test@example.com" };
        if (credentials.email === "test@example.com" && credentials.password === "password") {
          return dummyUser;
        }
        return null; // Authentication failed
      }
    })
    */
  ],

  secret: process.env.NEXTAUTH_SECRET,

  // Ensure session contains user ID
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || user._id || user.sub; // store user id in token
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id; // expose user id in session
      }
      return session;
    },
  },

  // Redirect to custom login page if not signed in
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === "development",
};
