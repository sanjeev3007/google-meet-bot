import { MeetingSessionManager } from './meetingSession';
import { config } from './config';
import { supabase } from '../lib/supabase';

export interface TranscriptSegment {
    text: string;
    timestamp: string;
    segmentNumber: number;
}

export interface TranscriptData {
    date: string;
    time: string;
    meet_link: string;
    transcript: TranscriptSegment[];
    status: 'pending' | 'active' | 'completed' | 'failed';
}

// Create a singleton instance of the session manager
const sessionManager = new MeetingSessionManager();

export async function startMeetingSession(): Promise<string> {
    console.log('\n🚀 Starting new meeting session...');
    const sessionId = await sessionManager.startNewSession(config.meetUrl);
    console.log(`✅ Meeting session started with ID: ${sessionId}`);
    return sessionId;
}

export async function saveTranscript(transcript: string): Promise<void> {
    try {
        console.log('\n💾 Starting transcript save process...');
        
        if (!transcript || transcript.trim().length === 0) {
            console.warn('⚠️ Empty transcript provided, skipping save');
            return;
        }

        const sessionId = sessionManager.getCurrentSessionId();
        if (!sessionId) {
            console.error('❌ No active session found');
            throw new Error('No active session found');
        }
        console.log(`🔑 Using session ID: ${sessionId}`);

        // First, get the current transcript from the database
        console.log('📥 Fetching current transcript from database...');
        const { data: currentData, error: fetchError } = await supabase
            .from('meeting_transcripts')
            .select('transcript, status')
            .eq('id', sessionId)
            .single();

        if (fetchError) {
            console.error('❌ Error fetching current transcript:', fetchError);
            throw fetchError;
        }

        // Parse existing transcripts or initialize empty array
        let existingTranscripts: TranscriptSegment[] = [];
        try {
            if (currentData?.transcript) {
                if (typeof currentData.transcript === 'string') {
                    // If stored as string, parse it
                    existingTranscripts = JSON.parse(currentData.transcript);
                } else {
                    // If stored as array directly
                    existingTranscripts = currentData.transcript;
                }
            }
            console.log(`📚 Current transcript segments: ${existingTranscripts.length}`);
        } catch (e) {
            console.warn('⚠️ Error parsing existing transcripts, starting fresh array');
            console.error('Parse error:', e);
            existingTranscripts = [];
        }

        // Add new transcript segment with improved metadata
        const newSegment: TranscriptSegment = {
            text: transcript,
            timestamp: new Date().toISOString(),
            segmentNumber: existingTranscripts.length + 1
        };

        existingTranscripts.push(newSegment);
        console.log(`➕ Added new segment #${newSegment.segmentNumber}`);
        console.log('📝 New segment content:', newSegment.text);

        // Update database with new transcript data
        console.log('📤 Updating database with new transcript...');
        
        const transcriptData = JSON.stringify(existingTranscripts);
        
        // Calculate some statistics
        const totalWords = transcriptData.split(/\s+/).length;
        const averageWordsPerSegment = Math.round(totalWords / existingTranscripts.length);
        
        console.log(`📊 Transcript Statistics:
        - Total Segments: ${existingTranscripts.length}
        - Total Words: ${totalWords}
        - Average Words per Segment: ${averageWordsPerSegment}
        - Latest Segment Size: ${newSegment.text.length} characters`);

        const { error: updateError } = await supabase
            .from('meeting_transcripts')
            .update({
                transcript: transcriptData,
                status: 'active',
                last_updated: new Date().toISOString(),
                segment_count: existingTranscripts.length,
                total_words: totalWords
            })
            .eq('id', sessionId);

        if (updateError) {
            console.error('❌ Error updating transcript in database:', updateError);
            throw updateError;
        }

        // Verify the update
        const { data: verifyData, error: verifyError } = await supabase
            .from('meeting_transcripts')
            .select('transcript, status, segment_count')
            .eq('id', sessionId)
            .single();

        if (verifyError) {
            console.error('❌ Error verifying transcript update:', verifyError);
        } else {
            console.log(`✅ Verified stored transcript:
            - Status: ${verifyData.status}
            - Segments: ${verifyData.segment_count}
            - Latest segment saved successfully`);
        }

        console.log(`✅ Successfully saved transcript segment #${newSegment.segmentNumber}`);
        
        // Update session manager
        await sessionManager.addTranscript(transcript);
        console.log('✅ Session manager updated');

    } catch (error) {
        console.error('\n❌ Error in saveTranscript:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        throw error;
    }
}

export async function checkMeetingActivity(): Promise<boolean> {
    const isActive = await sessionManager.checkActivity();
    console.log(`🔍 Meeting activity check: ${isActive ? 'Active' : 'Inactive'}`);
    return isActive;
}

export async function endMeetingSession(): Promise<void> {
    console.log('\n🛑 Ending meeting session...');
    await sessionManager.endSession();
    console.log('✅ Meeting session ended');
}

export function getCurrentSessionId(): string | null {
    const sessionId = sessionManager.getCurrentSessionId();
    console.log(`🔑 Current session ID: ${sessionId || 'None'}`);
    return sessionId;
} 