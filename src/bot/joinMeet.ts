import puppeteer, { Browser, Page } from "puppeteer";
import { config } from "./config";

export async function checkParticipants(page: Page): Promise<boolean> {
    try {
        const hasParticipants = await page.evaluate(() => {
            const participantElements = document.querySelectorAll('[aria-label*="participant"], [aria-label*="Participant"]');
            for (const element of participantElements) {
                const text = element.textContent || '';
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
    // Launch browser with strict media blocking
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: config.edgePath,
        userDataDir: config.userDataDir,
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            // Disable all media devices
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--mute-audio',
            '--disable-audio-input',
            '--disable-audio-output',
            '--disable-webrtc',
            '--disable-notifications',
            // Block media permissions
            '--deny-permission-prompts',
            '--disable-permissions-api',
            // General settings
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-size=1280,800',
            '--start-maximized'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Block media permissions at the browser level
        const context = page.browserContext();
        await context.clearPermissionOverrides();
        await context.overridePermissions('https://meet.google.com', []);

        // Inject scripts to block media access
        await page.evaluateOnNewDocument(() => {
            // Override getUserMedia to return empty tracks
            Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
                value: async () => new MediaStream()
            });

            // Override getDisplayMedia to return empty tracks
            Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
                value: async () => new MediaStream()
            });

            // Block all media permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = async (permissionDesc: any) => {
                if (permissionDesc.name === 'camera' || permissionDesc.name === 'microphone') {
                    return { state: 'denied', addEventListener: () => {} } as any;
                }
                return originalQuery.call(window.navigator.permissions, permissionDesc);
            };

            // Ensure WebRTC is disabled
            Object.defineProperty(window, 'RTCPeerConnection', {
                writable: true,
                value: class extends EventTarget {
                    constructor() {
                        super();
                        throw new Error('WebRTC is disabled');
                    }
                }
            });
        });

        // Set user agent and viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0');
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to Meet
        console.log("🎯 Navigating to Google Meet...");
        await page.goto(config.meetUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Wait for initial load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Ensure media is disabled
        console.log("🎤 Ensuring media is disabled...");
        await forceDisableMedia(page);

        // Join the meeting
        console.log("🚪 Attempting to join the meeting...");
        const joined = await joinMeetingWithRetry(page);

        if (!joined) {
            throw new Error("Failed to join meeting after multiple attempts");
        }

        // Double-check media is still disabled after joining
        await forceDisableMedia(page);

        console.log("✅ Successfully joined the meeting with media disabled!");
        return { browser, page };

    } catch (error) {
        console.error("❌ Error occurred:", error);
        await browser.close();
        throw error;
    }
}

async function forceDisableMedia(page: Page): Promise<void> {
    try {
        // Click any visible media control buttons that might be enabled
        await page.evaluate(() => {
            const mediaButtons = Array.from(document.querySelectorAll('button'));
            mediaButtons.forEach(button => {
                const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
                const isEnabled = !ariaLabel.includes('off') && !ariaLabel.includes('disabled');
                
                if (isEnabled && (
                    ariaLabel.includes('camera') || 
                    ariaLabel.includes('microphone') ||
                    ariaLabel.includes('mic') ||
                    ariaLabel.includes('video')
                )) {
                    (button as HTMLElement).click();
                }
            });
        });

        // Handle any permission dialogs
        await page.evaluate(() => {
            const dismissButtons = document.querySelectorAll('button[aria-label*="dismiss"], button[aria-label*="Dismiss"]');
            dismissButtons.forEach(button => (button as HTMLElement).click());
        });

        // Additional check for specific Meet UI elements
        await page.evaluate(() => {
            // Force camera off
            const cameraButton = document.querySelector('[aria-label*="camera"][aria-pressed="true"]') as HTMLElement;
            if (cameraButton) cameraButton.click();

            // Force microphone off
            const micButton = document.querySelector('[aria-label*="microphone"][aria-pressed="true"]') as HTMLElement;
            if (micButton) micButton.click();
        });

    } catch (error) {
        console.log("ℹ️ Media already disabled or controls not found");
    }
}

async function joinMeetingWithRetry(page: Page): Promise<boolean> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Join attempt ${attempt}/3...`);

        try {
            const joined = await page.evaluate(() => {
                const selectors = [
                    'button[jsname="Qx7uuf"]',
                    'button[data-mdc-dialog-action="join"]',
                    'button[aria-label*="Join now"]',
                    'button[aria-label*="join"]',
                    'div[role="button"][aria-label*="Join now"]',
                    'div[role="button"][aria-label*="join"]'
                ];

                for (const selector of selectors) {
                    const button = document.querySelector(selector) as HTMLElement;
                    if (button) {
                        button.click();
                        return true;
                    }
                }

                const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                for (const button of buttons) {
                    const text = button.textContent?.toLowerCase() || '';
                    if (text.includes('join now') || text.includes('join meeting')) {
                        (button as HTMLElement).click();
                        return true;
                    }
                }

                return false;
            });

            if (joined) {
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Verify we're in the meeting
                const inMeeting = await page.evaluate(() => {
                    const indicators = [
                        '[data-meeting-title]',
                        '[aria-label*="meeting"]',
                        '[aria-label*="call"]',
                        '[data-call-id]',
                        'div[jscontroller][data-allocation-index]',
                        'div[jsname="r4nke"]'
                    ];
                    return indicators.some(selector => document.querySelector(selector) !== null);
                });

                if (inMeeting) {
                    // Double-check media is still disabled after joining
                    await forceDisableMedia(page);
                    return true;
                }
            }

            if (attempt < 3) {
                console.log("Trying keyboard navigation...");
                await keyboardNavigation(page);
                await new Promise(resolve => setTimeout(resolve, 5000));
                // Check media status after keyboard navigation
                await forceDisableMedia(page);
            }

        } catch (error) {
            console.log(`Error in join attempt ${attempt}:`, error);
        }
    }

    return false;
}

async function keyboardNavigation(page: Page): Promise<void> {
    const tabCount = 10;
    for (let i = 0; i < tabCount; i++) {
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 500));

        const isFocusedOnJoin = await page.evaluate(() => {
            const focused = document.activeElement;
            if (!focused) return false;
            const text = focused.textContent?.toLowerCase() || '';
            return text.includes('join') || text.includes('join now') || text.includes('join meeting');
        });

        if (isFocusedOnJoin) {
            await page.keyboard.press('Enter');
            break;
        }
    }
}
