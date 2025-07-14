import { BotController } from './controller';
import { config } from './config';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Function to handle cron job execution
export async function handleCronJob() {
    console.log('Starting scheduled bot run...');
    try {
        // Validate required environment variables
        const requiredEnvVars = [
            'GOOGLE_MEET_LINK',
            'OPENAI_API_KEY'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        // Check if Chrome profile exists and is ready
        const profilePath = path.join(process.cwd(), 'chrome-profile');
        const profileExists = fs.existsSync(profilePath);
        const profileReady = fs.existsSync(path.join(profilePath, '.profile-ready'));

        if (!profileExists) {
            throw new Error('Chrome profile directory not found. Please run "npm run setup:login" first');
        }

        if (!profileReady) {
            // Create profile ready marker if profile exists but marker doesn't
            fs.writeFileSync(path.join(profilePath, '.profile-ready'), 'Profile setup completed');
            console.log('✅ Created profile ready marker');
        }

        console.log('✅ Chrome profile verified');
        const botController = new BotController();
        await botController.start();
    } catch (error) {
        console.error('Error in scheduled bot run:', error);
        throw error;
    }
}

// If running directly (not imported)
if (import.meta.url === new URL(import.meta.url).href) {
    handleCronJob().catch(console.error);
} 