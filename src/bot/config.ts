import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export interface BotConfig {
    meetUrl: string;
    scheduleTime: string;
    audioOutputPath: string;
    edgePath: string;
    ffmpegPath: string;
    audioDevice: string;
    userDataDir: string;
}

// Get the absolute path to the chrome profile directory
const chromeProfilePath = path.join(process.cwd(), 'chrome-profile');

export const config: BotConfig = {
    meetUrl: process.env.GOOGLE_MEET_LINK || '',
    scheduleTime: process.env.SCHEDULE_TIME || '*/15 * * * *', // Default to 15 minutes if not specified
    audioOutputPath: path.join(process.cwd(), 'temp', 'audio'),
    edgePath: process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ffmpegPath: process.env.FFMPEG_PATH || 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    audioDevice: 'audio=CABLE Output (VB-Audio Virtual Cable)',
    userDataDir: process.env.USER_DATA_DIR || chromeProfilePath
};

// Validate config
if (!config.meetUrl) {
    throw new Error('Missing required environment variables. Please check .env.local file.');
}

// Validate schedule format
const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
if (!cronRegex.test(config.scheduleTime)) {
    throw new Error('Invalid SCHEDULE_TIME format. Must be a valid cron expression (e.g., "*/15 * * * *" for every 15 minutes)');
} 