import ffmpeg from 'fluent-ffmpeg';
import { config } from './config';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Set FFmpeg path
ffmpeg.setFfmpegPath(config.ffmpegPath);

async function listAudioDevices(): Promise<string> {
    try {
        const { stdout, stderr } = await execPromise(`"${config.ffmpegPath}" -list_devices true -f dshow -i dummy`);
        return stdout + stderr; // FFmpeg outputs device list to stderr
    } catch (error: any) {
        // FFmpeg returns non-zero exit code when listing devices, but still outputs the list
        return error.stderr || '';
    }
}

async function checkFFmpeg() {
    console.log('Checking FFmpeg installation...');
    console.log('FFmpeg path:', config.ffmpegPath);

    // Check if FFmpeg exists
    if (!fs.existsSync(config.ffmpegPath)) {
        console.error('❌ FFmpeg not found at specified path');
        console.log('Please make sure FFmpeg is installed and the path is correct in your .env.local file');
        process.exit(1);
    }

    // List audio devices
    console.log('\nChecking available audio devices...');
    const devices = await listAudioDevices();
    console.log(devices);

    // Check specifically for CABLE Output
    if (!devices.includes('CABLE Output (VB-Audio Virtual Cable)')) {
        console.error('\n❌ CABLE Output device not found!');
        console.log('Please make sure Virtual Audio Cable is installed and enabled in your sound settings.');
        process.exit(1);
    }

    console.log('\n✅ CABLE Output device found!');

    // Try to run FFmpeg version command
    ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
            console.error('❌ Error running FFmpeg:', err);
            process.exit(1);
        }
        console.log('\n✅ FFmpeg is properly installed and configured');
    });
}

checkFFmpeg().catch(error => {
    console.error('Error:', error);
    process.exit(1);
}); 