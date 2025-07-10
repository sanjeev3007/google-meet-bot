import { createCronJob } from '../lib/supabase';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function setupCronJob() {
    try {
        const jobName = 'google_meet_bot';
        const schedule = '*/5 * * * *'; // Run every 5 minutes
        
        // Get the webhook URL - prefer VERCEL_URL over NEXT_PUBLIC_APP_URL
        const appUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL;
        if (!appUrl) {
            throw new Error('No deployment URL found. Set NEXT_PUBLIC_APP_URL for local development or deploy to Vercel.');
        }

        // Ensure the URL is using HTTPS and remove any trailing slashes
        const baseUrl = appUrl.startsWith('http') 
            ? appUrl.replace(/\/+$/, '')
            : `https://${appUrl.replace(/\/+$/, '')}`;
        const webhookUrl = `${baseUrl}/api/cron`;

        console.log('Setting up cron job with parameters:', {
            jobName,
            schedule,
            webhookUrl,
            environment: process.env.NODE_ENV || 'development'
        });

        // Create the cron job
        const response = await createCronJob(jobName, schedule, webhookUrl);
        
        if (!response) {
            console.error('Failed to create cron job - no response received');
            throw new Error('Failed to create cron job - no response received');
        }
        
        console.log('✅ Cron job setup completed successfully');
        console.log(`ℹ️ Webhook URL: ${webhookUrl}`);
        console.log('ℹ️ The bot will run every 5 minutes');
    } catch (error) {
        console.error('❌ Error setting up cron job:', error);
        process.exit(1);
    }
}

setupCronJob();