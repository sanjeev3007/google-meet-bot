//supabse connect to database   

import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined in .env.local');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined in .env.local');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl); // Debug log

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

// Function to create a cron job in Supabase
export async function createCronJob(jobName: string, schedule: string, webhookUrl: string) {
    try {
        console.log('Creating cron job with parameters:', {
            jobName,
            schedule,
            webhookUrl
        });

        // Validate webhook URL
        if (!webhookUrl.startsWith('https://') && !webhookUrl.startsWith('http://localhost')) {
            throw new Error('Webhook URL must be HTTPS (or localhost for development)');
        }

        const { data, error } = await supabase.rpc('create_cron_job', {
            p_job_name: jobName,
            p_schedule: schedule,
            p_webhook_url: webhookUrl
        });

        if (error) {
            console.error('Detailed Supabase error:', error);
            throw error;
        }

        if (!data) {
            console.error('No data returned from Supabase');
            throw new Error('No data returned from create_cron_job function');
        }

        console.log('Supabase response:', data);
        return data;
    } catch (error) {
        console.error('❌ Error creating cron job:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
        }
        throw error;
    }
}

// Function to delete a cron job
export async function deleteCronJob(jobName: string) {
    try {
        const { data, error } = await supabase.rpc('delete_cron_job', {
            p_job_name: jobName
        });

        if (error) throw error;
        console.log(`✅ Cron job "${jobName}" deleted successfully`);
        return data;
    } catch (error) {
        console.error('❌ Error deleting cron job:', error);
        throw error;
    }
}

