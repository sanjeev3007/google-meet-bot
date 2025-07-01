import dotenv from 'dotenv';

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
}

export const config: BotConfig = {
    meetUrl: process.env.GOOGLE_MEET_LINK || '',
    email: process.env.GOOGLE_EMAIL || '',
    password: process.env.GOOGLE_PASSWORD || '',
    scheduleTime: process.env.SCHEDULE_TIME || '55 18 * * *', // Default: 6:55 PM daily
    audioOutputPath: './temp/audio/',
    edgePath: process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ffmpegPath: process.env.FFMPEG_PATH || 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    audioDevice:'audio=CABLE Output (VB-Audio Virtual Cable)'
};

// Validate config
if (!config.meetUrl || !config.email || !config.password) {
    throw new Error('Missing required environment variables. Please check .env.local file.');
} 