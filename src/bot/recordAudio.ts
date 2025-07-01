import ffmpeg from 'fluent-ffmpeg';
import { config } from './config';
import fs from 'fs';
import path from 'path';

// Set FFmpeg path
ffmpeg.setFfmpegPath(config.ffmpegPath);

export class AudioRecorder {
    private outputPath: string;
    private isRecording: boolean = false;
    private currentProcess: ffmpeg.FfmpegCommand | null = null;
    private currentChunkStartTime: Date | null = null;

    constructor() {
        this.outputPath = config.audioOutputPath;
        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }
        console.log('🎙️ Audio Recorder initialized');
        console.log(`📂 Output directory: ${this.outputPath}`);
    }

    private async validateAudioFile(filePath: string): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                if (!fs.existsSync(filePath)) {
                    console.error('❌ Audio file not found:', filePath);
                    resolve(false);
                    return;
                }

                const stats = fs.statSync(filePath);
                console.log(`\n📊 Audio file validation:
                - Path: ${filePath}
                - Size: ${(stats.size / 1024).toFixed(2)} KB
                - Created: ${stats.birthtime}
                - Modified: ${stats.mtime}`);

                if (stats.size < 1024) { // Less than 1KB
                    console.warn('⚠️ Audio file too small, might be empty:', stats.size, 'bytes');
                    resolve(false);
                    return;
                }

                ffmpeg.ffprobe(filePath, (err, data) => {
                    if (err) {
                        console.error('❌ Error probing audio file:', err.message);
                        resolve(false);
                        return;
                    }

                    const audioStream = data.streams.find(s => s.codec_type === 'audio');
                    if (!audioStream) {
                        console.error('❌ No audio stream found in file');
                        resolve(false);
                        return;
                    }

                    console.log(`✅ Audio file validation successful:
                    - Size: ${(stats.size / 1024).toFixed(2)} KB
                    - Duration: ${data.format.duration}s
                    - Bitrate: ${data.format.bit_rate}
                    - Format: ${data.format.format_name}
                    - Audio codec: ${audioStream.codec_name}
                    - Channels: ${audioStream.channels}
                    - Sample rate: ${audioStream.sample_rate}Hz`);
                    resolve(true);
                });
            } catch (error) {
                console.error('❌ Error validating audio file:', error);
                resolve(false);
            }
        });
    }

    async startRecording(): Promise<string> {
        if (this.isRecording) {
            throw new Error('Recording is already in progress');
        }

        this.currentChunkStartTime = new Date();
        const outputFile = this.generateOutputFilename();

        return new Promise((resolve, reject) => {
            try {
                console.log(`\n🎙️ Starting audio recording:
                - Device: ${config.audioDevice}
                - Output: ${path.basename(outputFile)}
                - Time: ${new Date().toISOString()}`);
                
                this.currentProcess = ffmpeg()
                    .input(config.audioDevice)
                    .inputOptions([
                        '-f', 'dshow',           // Use DirectShow
                        '-thread_queue_size', '4096',  // Increase buffer size
                        '-channels', '2',         // Stereo audio
                        '-sample_rate', '44100'   // 44.1kHz sample rate
                    ])
                    .audioChannels(2)
                    .audioFrequency(44100)
                    .format('wav')
                    .on('start', (command) => {
                        console.log('🎬 Started recording with command:', command);
                        console.log('📢 Recording status: Active');
                        this.isRecording = true;
                    })
                    .on('progress', (progress) => {
                        if (progress && progress.timemark) {
                            console.log(`🎙️ Recording duration: ${progress.timemark}`);
                        }
                    })
                    .on('error', (err) => {
                        console.error('\n❌ Error recording audio:', err);
                        console.error('FFmpeg Error Details:', {
                            device: config.audioDevice,
                            error: err.message,
                            time: new Date().toISOString()
                        });
                        console.error(`\n🔧 Troubleshooting steps:
                        1. Verify CABLE Output is enabled in Windows sound settings
                        2. Ensure audio is being played into CABLE Input
                        3. Try running: ffmpeg -list_devices true -f dshow -i dummy
                        4. Check if the device name matches exactly what FFmpeg shows
                        5. Check if any other application is using the audio device`);
                        this.isRecording = false;
                        reject(err);
                    })
                    .on('end', async () => {
                        console.log('✅ Finished recording audio chunk');
                        this.isRecording = false;
                        
                        // Validate the recorded audio
                        console.log('🔍 Validating recorded audio file...');
                        const isValid = await this.validateAudioFile(outputFile);
                        if (!isValid) {
                            console.error('❌ Audio validation failed - file may be empty or corrupted');
                            reject(new Error('Invalid or empty audio file'));
                            return;
                        }
                        
                        resolve(outputFile);
                    });

                this.currentProcess.save(outputFile);

            } catch (error) {
                console.error('❌ Error starting recording:', error);
                console.error('💡 Make sure Virtual Audio Cable is installed and CABLE Output is enabled in Windows sound settings');
                this.isRecording = false;
                reject(error);
            }
        });
    }

    async stopCurrentChunk(): Promise<string> {
        if (!this.isRecording || !this.currentProcess) {
            throw new Error('No recording in progress');
        }

        console.log('⏹️ Stopping current recording chunk...');
        const currentFile = this.generateOutputFilename(this.currentChunkStartTime!);

        return new Promise((resolve, reject) => {
            try {
                this.currentProcess?.on('end', () => {
                    this.isRecording = false;
                    this.currentProcess = null;
                    resolve(currentFile);
                });

                this.currentProcess?.kill('SIGTERM');
            } catch (error) {
                console.error('❌ Error stopping recording:', error);
                reject(error);
            }
        });
    }

    async startNewChunk(): Promise<string> {
        const previousFile = await this.stopCurrentChunk();
        const nextFile = await this.startRecording();
        return previousFile;
    }

    private generateOutputFilename(timestamp: Date = new Date()): string {
        const formattedTime = timestamp.toISOString().replace(/[:.]/g, '-');
        return path.join(this.outputPath, `recording-${formattedTime}.wav`);
    }

    async stopRecording(): Promise<string> {
        return this.stopCurrentChunk();
    }
} 