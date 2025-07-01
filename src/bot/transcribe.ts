import OpenAI from 'openai';
import fs from 'fs';

export class Transcriber {
    private openai: OpenAI;

    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            console.error('\n❌ OPENAI_API_KEY is not set in environment variables');
            throw new Error('OPENAI_API_KEY is required');
        }

        try {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            console.log('✅ OpenAI API initialized');
            // Test API key validity
            this.testApiKey();
        } catch (error) {
            console.error('❌ Error initializing OpenAI:', error);
            throw error;
        }
    }

    private async testApiKey() {
        try {
            await this.openai.models.list();
            console.log('✅ OpenAI API key is valid');
        } catch (error) {
            console.error('❌ Invalid OpenAI API key:', error);
            throw new Error('Invalid OpenAI API key');
        }
    }

    async transcribeAudio(audioFilePath: string): Promise<string> {
        try {
            console.log(`\n🎤 Starting transcription process for: ${audioFilePath}`);
            
            // Validate file exists
            if (!fs.existsSync(audioFilePath)) {
                console.error(`❌ Audio file not found: ${audioFilePath}`);
                throw new Error(`Audio file not found: ${audioFilePath}`);
            }

            // Get file stats
            const stats = fs.statSync(audioFilePath);
            let isReadable = true;
            try {
                fs.accessSync(audioFilePath, fs.constants.R_OK);
            } catch {
                isReadable = false;
            }
            
            console.log(`📊 Audio file details:
            - Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB
            - Created: ${stats.birthtime}
            - Modified: ${stats.mtime}
            - Path: ${audioFilePath}
            - Exists: ${fs.existsSync(audioFilePath)}
            - Readable: ${isReadable}
            - Last Modified: ${new Date(stats.mtime).toISOString()}`);

            if (!isReadable) {
                console.error('❌ Audio file is not readable');
                throw new Error('Audio file is not readable');
            }

            if (stats.size === 0) {
                console.error('❌ Audio file is empty');
                throw new Error('Audio file is empty');
            }

            if (stats.size < 1024) { // Less than 1KB
                console.warn('⚠️ Audio file too small, might be empty');
                return '';
            }

            // Create read stream with error handling
            console.log('📡 Creating audio stream for transcription...');
            const audioStream = fs.createReadStream(audioFilePath);
            
            audioStream.on('error', (error) => {
                console.error('❌ Error reading audio file:', error);
                throw error;
            });

            // Start transcription with improved settings
            console.log('🔄 Sending to OpenAI Whisper API with enhanced settings...');
            console.time('transcription-time');
            
            try {
                console.log('📤 Sending audio to OpenAI...');
                const response = await this.openai.audio.transcriptions.create({
                    file: audioStream,
                    model: "whisper-1",
                    language: "en",
                    response_format: "text",
                    temperature: 0.2, // Lower temperature for more accurate transcription
                    prompt: "This is a Google Meet conversation. The audio may contain multiple speakers discussing various topics. Please transcribe accurately with proper punctuation and speaker separation if possible."
                });

                console.timeEnd('transcription-time');
                console.log('✅ OpenAI API response received');

                // The response is a string when response_format is "text"
                const transcription = response as string;

                // Validate response
                if (!transcription || transcription.trim().length === 0) {
                    console.log('⚠️ No speech detected in audio');
                    return '';
                }

                const transcriptLength = transcription.length;
                const words = transcription.split(' ').length;
                console.log(`\n✅ Transcription successful:
                - Characters: ${transcriptLength}
                - Words: ${words}
                - Words per minute: ${(words / (stats.size / 1024 / 1024)).toFixed(2)}
                - Preview: "${transcription.substring(0, 100)}${transcriptLength > 100 ? '...' : ''}"
                `);

                return transcription;
            } catch (apiError) {
                console.error('❌ OpenAI API Error:', apiError);
                if (apiError instanceof OpenAI.APIError) {
                    console.error('OpenAI API Error details:', {
                        status: apiError.status,
                        message: apiError.message,
                        code: apiError.code,
                        type: apiError.type
                    });

                    // Add specific error handling for common issues
                    if (apiError.status === 413) {
                        console.error('❌ Audio file too large for API. Maximum size is 25MB.');
                    } else if (apiError.status === 400) {
                        console.error('❌ Invalid audio format. Make sure the file is a valid WAV file.');
                    }
                }
                throw apiError;
            }

        } catch (error) {
            console.error('\n❌ Transcription error:', error);
            if (error instanceof Error) {
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
            }
            
            // Check if it's an OpenAI API error
            if (error instanceof OpenAI.APIError) {
                console.error('OpenAI API Error details:', {
                    status: error.status,
                    message: error.message,
                    code: error.code,
                    type: error.type
                });

                // Check for common API issues
                if (error.status === 401) {
                    console.error('❌ Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.');
                } else if (error.status === 429) {
                    console.error('❌ OpenAI API rate limit exceeded. Please wait a moment before trying again.');
                }
            }
            
            throw error;
        }
    }
} 