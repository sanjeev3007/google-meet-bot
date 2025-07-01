import cron from 'node-cron';
import { BotController } from './controller.js';
import { config } from './config.js';

// Create a new instance of the bot controller
const botController = new BotController();

// Schedule the bot to run at the specified time
cron.schedule(config.scheduleTime, async () => {
    console.log('Starting scheduled bot run...');
    try {
        await botController.start();
    } catch (error) {
        console.error('Error in scheduled bot run:', error);
    }
}); 