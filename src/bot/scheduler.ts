import { BotController } from './controller';
import { config } from './config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Function to handle cron job execution
export async function handleCronJob() {
    console.log('Starting scheduled bot run...');
    try {
        // Validate required environment variables
        const requiredEnvVars = [
            'GOOGLE_MEET_LINK',
            'GOOGLE_EMAIL',
            'GOOGLE_PASSWORD',
            'OPENAI_API_KEY'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

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