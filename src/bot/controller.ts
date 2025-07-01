import { AudioRecorder } from './recordAudio';
import { Transcriber } from './transcribe';
import { startMeetingSession, saveTranscript, checkMeetingActivity, endMeetingSession } from './saveTranscript';
import { joinGoogleMeet, checkParticipants } from './joinMeet';
import { StorageManager } from './storageManager';
import { config } from './config';
import fs from 'fs';
import path from 'path';
import { Browser, Page } from 'puppeteer';

export class BotController {
    private audioRecorder: AudioRecorder;
    private transcriber: Transcriber;
    private storageManager: StorageManager;
    private isRunning: boolean = false;
    private activityCheckInterval: NodeJS.Timeout | null = null;
    private participantCheckInterval: NodeJS.Timeout | null = null;
    private currentAudioFile: string | null = null;
    private recordingInterval: number = 60000; // 1 minute in milliseconds
    private segmentCount: number = 0;
    private totalTranscriptCount: number = 0;
    private browser: Browser | null = null;
    private page: Page | null = null;

    constructor() {
        this.audioRecorder = new AudioRecorder();
        this.transcriber = new Transcriber();
        this.storageManager = new StorageManager();
    }

    async start() {
        try {
            if (this.isRunning) {
                console.log('Bot is already running');
                return;
            }

            console.log('\n🤖 Starting bot...');
            this.isRunning = true;
            this.segmentCount = 0;
            this.totalTranscriptCount = 0;

            // Join the meeting
            const { browser, page } = await joinGoogleMeet();
            this.browser = browser;
            this.page = page;
            console.log('✅ Successfully joined the meeting!');

            // Start a new meeting session
            await startMeetingSession();
            
            // Start activity check interval
            this.startActivityCheck();

            // Start participant check interval
            this.startParticipantCheck();

            // Start recording and transcription loop
            await this.recordAndTranscribe();

        } catch (error) {
            console.error('❌ Error in bot controller:', error);
            this.isRunning = false;
            throw error;
        }
    }

    private startActivityCheck() {
        if (this.activityCheckInterval) {
            clearInterval(this.activityCheckInterval);
        }

        let inactiveCount = 0;
        const MAX_INACTIVE_COUNT = 2; // Stop after 2 consecutive inactive checks

        this.activityCheckInterval = setInterval(async () => {
            try {
                const isActive = await checkMeetingActivity();
                
                if (!isActive) {
                    inactiveCount++;
                    console.log(`\n⚠️ Meeting inactive (${inactiveCount}/${MAX_INACTIVE_COUNT})`);
                    
                    if (inactiveCount >= MAX_INACTIVE_COUNT) {
                        console.log('\n🛑 Meeting is inactive, stopping recording...');
                        await this.stop();
                    }
                } else {
                    if (inactiveCount > 0) {
                        console.log('✅ Meeting activity detected, resetting inactive counter');
                        inactiveCount = 0;
                    }
                }
            } catch (error) {
                console.error('❌ Error in activity check:', error);
            }
        }, 20000); // Check every 20 seconds
    }

    private startParticipantCheck() {
        if (this.participantCheckInterval) {
            clearInterval(this.participantCheckInterval);
        }

        let noParticipantsCount = 0;
        const MAX_NO_PARTICIPANTS_COUNT = 5; // Check for 5 consecutive times (total 5 minutes)

        this.participantCheckInterval = setInterval(async () => {
            try {
                if (!this.page) {
                    console.error('No page available for participant check');
                    return;
                }

                const hasParticipants = await checkParticipants(this.page);
                
                if (!hasParticipants) {
                    noParticipantsCount++;
                    console.log(`\n⚠️ No participants detected (${noParticipantsCount}/${MAX_NO_PARTICIPANTS_COUNT})`);
                    
                    if (noParticipantsCount >= MAX_NO_PARTICIPANTS_COUNT) {
                        console.log('\n🛑 No participants for 5 minutes, stopping bot...');
                        await this.stop();
                    }
                } else {
                    if (noParticipantsCount > 0) {
                        console.log('✅ Participants detected, resetting counter');
                        noParticipantsCount = 0;
                    }
                }
            } catch (error) {
                console.error('❌ Error in participant check:', error);
            }
        }, 60000); // Check every minute
    }

    private async processAudioSegment(recordedFile: string, isLastSegment: boolean = false): Promise<boolean> {
        try {
            // Validate file exists and has content
            if (!fs.existsSync(recordedFile)) {
                console.error(`❌ Recorded file not found: ${recordedFile}`);
                return false;
            }

            const stats = fs.statSync(recordedFile);
            console.log(`\n📊 Audio file size: ${(stats.size / 1024).toFixed(2)} KB`);
            
            if (stats.size < 1024) { // Less than 1KB
                console.warn('⚠️ Audio file too small (no audio detected), skipping segment');
                return false;
            }

            // Transcribe the audio
            console.log(`\n🎤 Transcribing audio segment #${this.segmentCount}...`);
            try {
                const transcript = await this.transcriber.transcribeAudio(recordedFile);
                
                if (transcript && transcript.trim()) {
                    this.totalTranscriptCount++;
                    console.log('\n ━━━━━━━━━━━━ TRANSCRIPT ━━━━━━━━━━━━');
                    console.log(`Segment #${this.segmentCount} | Time: ${new Date().toLocaleTimeString()}`);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log(transcript);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                    
                    // Save transcript to database
                    console.log('💾 Saving transcript to database...');
                    await saveTranscript(transcript);
                    console.log(`✅ Transcript saved (Total segments: ${this.totalTranscriptCount})`);

                    // Upload audio to storage
                    console.log('☁️ Uploading audio to storage...');
                    const audioUrl = await this.storageManager.uploadAudio(recordedFile);
                    console.log('✅ Audio uploaded successfully');
                    
                    // Cleanup the file after successful processing
                    try {
                        fs.unlinkSync(recordedFile);
                        console.log('🧹 Cleaned up audio file');
                    } catch (cleanupError) {
                        console.error('⚠️ Error cleaning up audio file:', cleanupError);
                    }
                    
                    return true;
                } else {
                    console.log('\n⚠️ No speech detected in this segment, skipping...');
                    // Clean up empty audio file
                    try {
                        fs.unlinkSync(recordedFile);
                    } catch (cleanupError) {
                        console.error('⚠️ Error cleaning up empty audio file:', cleanupError);
                    }
                    return false;
                }
            } catch (transcriptionError) {
                console.error('❌ Transcription error:', transcriptionError);
                return false;
            }
        } catch (error) {
            console.error('❌ Error processing audio segment:', error);
            return false;
        }
    }

    private async recordAndTranscribe() {
        while (this.isRunning) {
            try {
                this.segmentCount++;
                console.log(`\n📝 Starting recording segment #${this.segmentCount}...`);
                
                // Start recording
                this.currentAudioFile = await this.audioRecorder.startRecording();
                console.log(`📼 Recording to: ${path.basename(this.currentAudioFile)}`);

                // Record for one minute
                await new Promise(resolve => setTimeout(resolve, this.recordingInterval));

                // Check if we should continue recording
                if (!this.isRunning) {
                    console.log('\n⏹️ Bot is stopping, ending recording loop...');
                    break;
                }

                // Stop recording and get the file
                console.log('\n⏹️ Stopping current segment...');
                const recordedFile = await this.audioRecorder.stopRecording();

                // Process the audio segment
                await this.processAudioSegment(recordedFile);

            } catch (error) {
                console.error(`\n❌ Error in recording/transcription loop:`, error);
                // If bot is stopping, break the loop
                if (!this.isRunning) {
                    break;
                }
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
        }
    }

    async stop() {
        try {
            console.log('\n🛑 Stopping bot...');
            this.isRunning = false;
            
            // Stop activity check interval
            if (this.activityCheckInterval) {
                clearInterval(this.activityCheckInterval);
                this.activityCheckInterval = null;
            }

            // Stop participant check interval
            if (this.participantCheckInterval) {
                clearInterval(this.participantCheckInterval);
                this.participantCheckInterval = null;
            }

            // Stop any ongoing recording
            if (this.currentAudioFile) {
                console.log('\n⏹️ Stopping recording...');
                await this.audioRecorder.stopRecording();
                this.currentAudioFile = null;
            }

            // Close browser
            if (this.browser) {
                console.log('🔒 Closing browser...');
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }

            // End meeting session
            await endMeetingSession();

            console.log(`\n🏁 Bot stopped. Total transcripts: ${this.totalTranscriptCount}`);

            if (this.totalTranscriptCount === 0) {
                console.log('\n⚠️ No transcripts were generated. Possible reasons:');
                console.log('1. No audio was detected in the meeting');
                console.log('2. The audio input device was not receiving sound');
                console.log('3. The audio files were too small or empty');
                console.log('4. There were errors during transcription');
            }

            // Exit the process to ensure everything is cleaned up
            process.exit(0);

        } catch (error) {
            console.error('❌ Error stopping bot:', error);
            // Force exit even if there's an error
            process.exit(1);
        }
    }
} 