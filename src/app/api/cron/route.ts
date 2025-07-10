import { NextResponse } from 'next/server';
import { handleCronJob } from '@/bot/scheduler';

// Verify the request is coming from Supabase
const verifySupabaseWebhook = async (request: Request) => {
    try {
        const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('Missing SUPABASE_WEBHOOK_SECRET environment variable');
            return false;
        }

        const signature = request.headers.get('x-webhook-signature');
        if (!signature) {
            console.error('Missing x-webhook-signature header');
            return false;
        }

        // For development, allow all requests if using localhost
        if (process.env.NODE_ENV === 'development' && request.headers.get('host')?.includes('localhost')) {
            console.log('Development mode: Skipping signature verification for localhost');
            return true;
        }

        // TODO: Implement proper signature verification for production
        return true;
    } catch (error) {
        console.error('Error verifying webhook:', error);
        return false;
    }
};

export async function POST(request: Request) {
    console.log('Received webhook request:', {
        time: new Date().toISOString(),
        headers: Object.fromEntries(request.headers.entries())
    });
    
    try {
        // Verify the webhook
        if (!await verifySupabaseWebhook(request)) {
            console.error('Webhook verification failed');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        console.log('Webhook verified, starting bot...');
        
        // Start the bot via the handler
        await handleCronJob();
        
        console.log('Bot execution completed successfully');
        return NextResponse.json({ 
            success: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error', 
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

// Health check endpoint
export async function GET() {
    return NextResponse.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
} 