import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Attaches the current Firebase ID token to every Supabase request so RLS
// policies can verify identity via auth.jwt() (Supabase "Third-Party Auth").
export const supabase = createClient(supabaseUrl, supabaseKey, {
    accessToken: async () => {
        const currentUser = auth.currentUser;
        return currentUser ? await currentUser.getIdToken() : null;
    },
});
