//supabse connect to database   

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a Supabase client with anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false
    }
});

// Verify database connection
(async () => {
    try {
        await supabase.from('meeting_transcripts').select('count(*)', { count: 'exact' });
        console.log('✅ Successfully connected to Supabase');
    } catch (error: unknown) {
        console.error('❌ Error connecting to Supabase:', error);
    }
})();

