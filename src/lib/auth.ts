import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({ url: process.env.NEXT_PUBLIC_SUPABASE_URL!, secret: process.env.SUPABASE_SERVICE_ROLE_KEY! }),
  providers: [Credentials({
    name: "Supabase",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const { data, error } = await supabase.auth.signInWithPassword({ email: credentials.email as string, password: credentials.password as string });
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.full_name || data.user.email, image: data.user.user_metadata?.avatar_url };
    },
  })],
  pages: { signIn: "/login", newUser: "/chat", error: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) { if (session.user) session.user.id = token.sub!; return session; },
    async jwt({ token, user }) { if (user) token.sub = user.id; return token; },
  },
});
