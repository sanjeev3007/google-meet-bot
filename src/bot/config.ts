import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

export interface BotConfig {
    meetUrl: string;
    email: string;
    password: string;
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
    email: process.env.GOOGLE_EMAIL || '',
    password: process.env.GOOGLE_PASSWORD || '',
    scheduleTime: process.env.SCHEDULE_TIME || '*/5 * * * *', // Run every 5 minutes
    audioOutputPath: path.join(process.cwd(), 'temp', 'audio'),
    edgePath: process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ffmpegPath: process.env.FFMPEG_PATH || 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    audioDevice: 'audio=CABLE Output (VB-Audio Virtual Cable)',
    userDataDir: process.env.USER_DATA_DIR || chromeProfilePath
};

// Validate config
if (!config.meetUrl || !config.email || !config.password) {
    throw new Error('Missing required environment variables. Please check .env.local file.');
} 