import puppeteer, { Browser, Page } from "puppeteer";
import { config } from "./config";

export async function checkParticipants(page: Page): Promise<boolean> {
    try {
        // Check for participants count element
        const hasParticipants = await page.evaluate(() => {
            // Look for participant count element or participant list
            const participantElements = document.querySelectorAll('[aria-label*="participant"], [aria-label*="Participant"]');
            for (const element of participantElements) {
                const text = element.textContent || '';
                // If we find a number greater than 1 (excluding the bot itself)
                const count = parseInt(text.match(/\d+/)?.[0] || '1');
                if (count > 1) return true;
            }
            return false;
        });
        
        return hasParticipants;
    } catch (error) {
        console.error('Error checking participants:', error);
        return false;
    }
}

export async function joinGoogleMeet(): Promise<{ browser: Browser, page: Page }> {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: config.edgePath,
        defaultViewport: null,
        args: [
            '--use-fake-ui-for-media-stream',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-size=1280,800',
            '--disable-notifications',
            '--start-maximized',
            '--use-fake-device-for-media-stream',
            '--mute-audio',
            '--disable-audio-input',
            '--disable-audio-output'
        ]
    });

    try {
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        
        // Set a proper user agent for Edge
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0');
        
        // Set viewport to a larger size
        await page.setViewport({ width: 1280, height: 400 });

        // Set permissions to deny camera and microphone
        await context.overridePermissions('https://meet.google.com', []);

        // Navigate to Google Sign-In
        console.log("🔑 Navigating to Google Sign-in...");
        await page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle2' });

        // Login
        console.log("📧 Entering email...");
        await page.type('input[type="email"]', config.email);
        await page.click('#identifierNext');
        await page.waitForSelector('input[type="password"]', { visible: true });

        console.log("🔒 Entering password...");
        await page.type('input[type="password"]', config.password);
        await page.click('#passwordNext');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Go to Google Meet
        console.log("🎯 Navigating to Google Meet...");
        await page.goto(config.meetUrl, { waitUntil: 'networkidle2' });

        // Wait longer for the initial load
        await new Promise(resolve => setTimeout(resolve, 15000));

        // Wait and disable mic/camera
        console.log("🎤 Setting up audio/video...");
        await page.waitForSelector('div[role="button"]', { visible: true });
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');

        // Wait for everything to settle
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Click "Join now"
        console.log("🚪 Attempting to join the meeting...");

        try {
            // Try joining up to 3 times
            for (let attempt = 1; attempt <= 3; attempt++) {
                console.log(`Join attempt ${attempt}/3...`);

                // Check if we're on the correct URL
                const currentUrl = page.url();
                if (!currentUrl.includes(config.meetUrl)) {
                    console.log("Redirected away from meeting URL, navigating back...");
                    await page.goto(config.meetUrl, { waitUntil: 'networkidle2' });
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

                // Method 1: Try direct evaluation and click
                const joined = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    for (const button of buttons) {
                        const text = button.textContent || '';
                        const classes = button.className || '';
                        if (text.includes('Join now') || classes.includes('UywwFc-LgbsSe')) {
                            (button as HTMLElement).click();
                            return true;
                        }
                    }
                    return false;
                });

                // Wait after click attempt
                await new Promise(resolve => setTimeout(resolve, 5000));

                if (!joined) {
                    console.log("Direct click failed, trying keyboard navigation...");
                    // Method 2: Keyboard navigation with longer delays
                    for (let i = 0; i < 5; i++) {
                        await page.keyboard.press('Tab');
                        await new Promise(r => setTimeout(r, 2000));
                    }
                    await page.keyboard.press('Enter');
                }

                // Wait to see if we successfully joined
                console.log("Waiting for meeting to load...");
                await new Promise(resolve => setTimeout(resolve, 10000));

                // Check if we're in the meeting
                const inMeeting = await page.evaluate(() => {
                    return document.querySelector('[data-meeting-title]') !== null ||
                           document.querySelector('[aria-label*="meeting"]') !== null ||
                           document.querySelector('[aria-label*="call"]') !== null;
                });

                if (inMeeting) {
                    console.log("✅ Successfully joined the meeting!");
                    return { browser, page };
                } else if (attempt < 3) {
                    console.log("Join attempt failed, trying again...");
                    await page.goto(config.meetUrl, { waitUntil: 'networkidle2' });
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        } catch (error) {
            console.log("Join attempts failed:", error);
            throw error;
        }

        console.log("✅ Join attempts completed");
        return { browser, page };

    } catch (error) {
        console.error("❌ Error occurred:", error);
        await browser.close();
        throw error;
    }
}
