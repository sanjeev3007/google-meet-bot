import { supabase } from '../lib/supabase';

export interface MeetingSession {
    sessionId: string;
    meetLink: string;
    startTime: Date;
    lastActivityTime: Date;
    isActive: boolean;
    transcripts: Array<{
        text: string;
        timestamp: string;
        segmentNumber: number;
    }>;
}

export class MeetingSessionManager {
    private currentSession: MeetingSession | null = null;
    private readonly ACTIVITY_TIMEOUT = 1 * 60 * 1000; // 5 minutes in milliseconds
    private leftMeetingTime: Date | null = null;

    constructor() {
        console.log('🔄 Initializing MeetingSessionManager');
    }

    async startNewSession(meetLink: string): Promise<string> {
        console.log(`🚀 Starting new session for meet link: ${meetLink}`);
        
        // Create a new session in the database
        const { data, error } = await supabase
            .from('meeting_transcripts')
            .insert({
                meet_link: meetLink,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().split(' ')[0],
                transcript: JSON.stringify([]),
                status: 'active'
            })
            .select('id')
            .single();

        if (error) {
            console.error('❌ Error creating new session:', error);
            throw error;
        }

        console.log(`✅ Created new session with ID: ${data.id}`);

        this.currentSession = {
            sessionId: data.id,
            meetLink,
            startTime: new Date(),
            lastActivityTime: new Date(),
            isActive: true,
            transcripts: []
        };

        return data.id;
    }

    async updateActivity() {
        if (!this.currentSession) {
            console.log('⚠️ No active session to update activity');
            return;
        }
        this.currentSession.lastActivityTime = new Date();
        // Reset leftMeetingTime when there's activity
        this.leftMeetingTime = null;
        console.log(`🔄 Updated activity time to: ${this.currentSession.lastActivityTime.toISOString()}`);
    }

    async addTranscript(transcript: string) {
        if (!this.currentSession) {
            console.error('❌ No active session to add transcript');
            throw new Error('No active session');
        }
        
        console.log('📝 Adding new transcript segment...');
        
        try {
            // First get the current transcript array from the database
            const { data: currentData, error: fetchError } = await supabase
                .from('meeting_transcripts')
                .select('transcript')
                .eq('id', this.currentSession.sessionId)
                .single();

            if (fetchError) {
                console.error('❌ Error fetching current transcript:', fetchError);
                throw fetchError;
            }

            console.log('📥 Retrieved current transcript data from database');

            let existingTranscripts = [];
            try {
                existingTranscripts = currentData.transcript ? JSON.parse(currentData.transcript) : [];
                console.log(`📚 Found ${existingTranscripts.length} existing segments`);
            } catch (e) {
                console.warn('⚠️ Error parsing existing transcripts, starting fresh');
            }

            const newSegment = {
                text: transcript,
                timestamp: new Date().toISOString(),
                segmentNumber: existingTranscripts.length + 1
            };

            existingTranscripts.push(newSegment);
            this.currentSession.transcripts = existingTranscripts;
            
            console.log(`➕ Added segment #${newSegment.segmentNumber}`);
            console.log(`📊 Total segments: ${existingTranscripts.length}`);

            // Update the transcript in the database
            const { error: updateError } = await supabase
                .from('meeting_transcripts')
                .update({
                    transcript: JSON.stringify(existingTranscripts),
                    status: 'active'
                })
                .eq('id', this.currentSession.sessionId);

            if (updateError) {
                console.error('❌ Error updating transcript in database:', updateError);
                throw updateError;
            }

            console.log('✅ Successfully updated transcript in database');
            this.updateActivity();

        } catch (error) {
            console.error('❌ Error in addTranscript:', error);
            if (error instanceof Error) {
                console.error('Error details:', error.message);
                console.error('Stack trace:', error.stack);
            }
            throw error;
        }
    }

    async checkActivity(): Promise<boolean> {
        if (!this.currentSession) {
            console.log('⚠️ No active session to check activity');
            return false;
        }

        const timeSinceLastActivity = Date.now() - this.currentSession.lastActivityTime.getTime();
        const isActive = timeSinceLastActivity <= this.ACTIVITY_TIMEOUT;
        
        console.log(`🔍 Activity check: ${isActive ? 'Active' : 'Inactive'}`);
        console.log(`⏱️ Time since last activity: ${Math.floor(timeSinceLastActivity / 1000)}s`);

        if (!isActive) {
            if (!this.leftMeetingTime) {
                // First time detecting inactivity, mark the time
                this.leftMeetingTime = new Date();
                console.log('👋 Meeting left detected, starting 1-minute grace period');
                return true; // Keep session active during grace period
            } else {
                // Check if grace period (1 minute) has passed
                const timeSinceLeft = Date.now() - this.leftMeetingTime.getTime();
                if (timeSinceLeft >= this.ACTIVITY_TIMEOUT) {
                    console.log('⏰ Grace period ended, ending session');
                    await this.endSession();
                    return false;
                } else {
                    console.log(`⏳ Grace period remaining: ${Math.floor((this.ACTIVITY_TIMEOUT - timeSinceLeft) / 1000)}s`);
                    return true;
                }
            }
        }

        // Reset leftMeetingTime if activity is detected
        if (this.leftMeetingTime && isActive) {
            console.log('🔄 Activity detected, resetting grace period');
            this.leftMeetingTime = null;
        }
        
        return isActive;
    }

    async endSession() {
        if (!this.currentSession) {
            console.log('⚠️ No active session to end');
            return;
        }

        console.log(`🛑 Ending session: ${this.currentSession.sessionId}`);

        // Update the database record as completed
        const { error } = await supabase
            .from('meeting_transcripts')
            .update({
                status: 'completed'
            })
            .eq('id', this.currentSession.sessionId);

        if (error) {
            console.error('❌ Error ending session:', error);
            throw error;
        }

        console.log('✅ Session ended successfully');
        this.currentSession = null;
    }

    getCurrentSessionId(): string | null {
        if (!this.currentSession) {
            console.log('⚠️ No active session');
            return null;
        }
        return this.currentSession.sessionId;
    }
} 