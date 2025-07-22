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
    let browser: Browser | null = null;
    
    try {
        console.log("🔍 Starting browser launch with options...");
        // Launch browser with strict media blocking
        const launchOptions: any = {
            headless: 'new',
            slowMo: 50, 
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
        };

        // Production-specific settings
        if (process.env.NODE_ENV === 'production') {
            console.log("✅ Configuring for production environment");
            // Don't specify executablePath in production - use bundled Chromium
            launchOptions.args.push(
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Recommended for Docker/container environments
                '--disable-extensions'
            );
            
            // Ensure we're using appropriate memory settings
            launchOptions.args.push('--js-flags="--max-old-space-size=2048"');
            
            // Additional production stability flags
            launchOptions.dumpio = true; // Log browser console to Node process
            launchOptions.timeout = 60000; // Increase timeout for slower systems
        } else {
            // In development, use the configured browser path
            launchOptions.executablePath = config.edgePath;
            console.log(`✅ Using configured browser at: ${config.edgePath}`);
        }

        console.log("Browser launch options:", JSON.stringify(launchOptions, null, 2));
        
        console.log("🚀 Launching browser...");
        browser = await puppeteer.launch(launchOptions);
        console.log("✅ Browser launched successfully");

        console.log("📝 Creating new page...");
        const page = await browser.newPage();
        console.log("✅ New page created");
        
        // Block media permissions at the browser level
        console.log("🔒 Setting up browser permissions...");
        const context = page.browserContext();
        await context.clearPermissionOverrides();
        await context.overridePermissions('https://meet.google.com', []);
        console.log("✅ Browser permissions configured");

        // Inject scripts to block media access
        console.log("💉 Injecting media blocking scripts...");
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
        console.log("✅ Media blocking scripts injected");

        // Set user agent and viewport
        console.log("🌐 Setting user agent and viewport...");
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0');
        await page.setViewport({ width: 1280, height: 800 });
        console.log("✅ User agent and viewport configured");

        // Navigate to Meet
        console.log("🎯 Navigating to Google Meet...");
        try {
            await page.goto(config.meetUrl, { waitUntil: 'networkidle0', timeout: 60000 });
            console.log("✅ Successfully navigated to Meet URL");
        } catch (error: any) {
            console.error("❌ Failed to navigate to Meet URL:", error);
            throw new Error(`Navigation failed: ${error.message}`);
        }

        // Wait for initial load
        console.log("⏳ Waiting for initial page load...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log("✅ Initial wait complete");

        // Ensure media is disabled
        console.log("🎤 Ensuring media is disabled...");
        await forceDisableMedia(page);
        console.log("✅ Media disabled successfully");

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
        console.error("❌ Error occurred during join process:", error);
        if (browser) {
            console.log("📸 Attempting to capture error state...");
            try {
                const pages = await browser.pages();
                const page = pages[0];
                if (page) {
                    const screenshot = await page.screenshot({ fullPage: true });
                    console.log("Screenshot captured:", screenshot);
                    
                    const html = await page.content();
                    console.log("Current page HTML:", html);
                }
            } catch (screenshotError) {
                console.error("Failed to capture error state:", screenshotError);
            }
            await browser.close();
        }
        throw error;
    }
}

async function forceDisableMedia(page: Page): Promise<void> {
    try {
        console.log("🔍 Checking for media controls...");
        // Click any visible media control buttons that might be enabled
        const mediaControlsResult = await page.evaluate(() => {
            const mediaButtons = Array.from(document.querySelectorAll('button'));
            const foundButtons: string[] = [];
            
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
                    foundButtons.push(ariaLabel);
                }
            });
            return foundButtons;
        });
        console.log("Found media controls:", mediaControlsResult);

        // Handle any permission dialogs
        console.log("🔍 Checking for permission dialogs...");
        const dismissResult = await page.evaluate(() => {
            const dismissButtons = document.querySelectorAll('button[aria-label*="dismiss"], button[aria-label*="Dismiss"]');
            const count = dismissButtons.length;
            dismissButtons.forEach(button => (button as HTMLElement).click());
            return count;
        });
        console.log(`Found ${dismissResult} permission dialogs`);

        // Additional check for specific Meet UI elements
        console.log("🔍 Final media control check...");
        const finalCheckResult = await page.evaluate(() => {
            const results: Record<string, boolean> = {};
            
            // Force camera off
            const cameraButton = document.querySelector('[aria-label*="camera"][aria-pressed="true"]') as HTMLElement;
            if (cameraButton) {
                cameraButton.click();
                results.camera = true;
            }

            // Force microphone off
            const micButton = document.querySelector('[aria-label*="microphone"][aria-pressed="true"]') as HTMLElement;
            if (micButton) {
                micButton.click();
                results.microphone = true;
            }
            
            return results;
        });
        console.log("Final media check results:", finalCheckResult);

    } catch (error) {
        console.error("❌ Error during media control check:", error);
        console.log("ℹ️ Media already disabled or controls not found");
    }
}

async function joinMeetingWithRetry(page: Page): Promise<boolean> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔄 Join attempt ${attempt}/3...`);

        try {
            console.log("🔍 Looking for join button...");
            const joinAttemptResult = await page.evaluate(() => {
                const results: Record<string, any> = {
                    foundSelectors: [],
                    buttonTexts: [],
                    success: false
                };

                const selectors = [
                    'button[jsname="Qx7uuf"]',
                    'button[data-mdc-dialog-action="join"]',
                    'button[aria-label*="Join now"]',
                    'button[aria-label*="join"]',
                    'div[role="button"][aria-label*="Join now"]',
                    'div[role="button"][aria-label*="join"]'
                ];

                // Check each selector
                for (const selector of selectors) {
                    const button = document.querySelector(selector) as HTMLElement;
                    if (button) {
                        results.foundSelectors.push(selector);
                        button.click();
                        results.success = true;
                        break;
                    }
                }

                // If no selector worked, try text content
                if (!results.success) {
                    const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                    for (const button of buttons) {
                        const text = button.textContent?.toLowerCase() || '';
                        results.buttonTexts.push(text);
                        if (text.includes('join now') || text.includes('join meeting')) {
                            (button as HTMLElement).click();
                            results.success = true;
                            break;
                        }
                    }
                }

                return results;
            });
            
            console.log("Join attempt results:", joinAttemptResult);

            if (joinAttemptResult.success) {
                console.log("⏳ Waiting after join click...");
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Verify we're in the meeting
                console.log("🔍 Verifying meeting join success...");
                const verificationResult = await page.evaluate(() => {
                    const results: Record<string, boolean> = {};
                    const indicators = [
                        '[data-meeting-title]',
                        '[aria-label*="meeting"]',
                        '[aria-label*="call"]',
                        '[data-call-id]',
                        'div[jscontroller][data-allocation-index]',
                        'div[jsname="r4nke"]'
                    ];
                    
                    indicators.forEach(selector => {
                        results[selector] = document.querySelector(selector) !== null;
                    });
                    
                    return {
                        success: Object.values(results).some(v => v),
                        indicators: results
                    };
                });
                
                console.log("Join verification results:", verificationResult);

                if (verificationResult.success) {
                    console.log("✅ Successfully verified meeting join!");
                    await forceDisableMedia(page);
                    return true;
                } else {
                    console.log("❌ Failed to verify meeting join");
                }
            }

            if (attempt < 3) {
                console.log("↹ Trying keyboard navigation...");
                await keyboardNavigation(page);
                await new Promise(resolve => setTimeout(resolve, 5000));
                await forceDisableMedia(page);
            }

        } catch (error) {
            console.error(`❌ Error in join attempt ${attempt}:`, error);
        }
    }

    return false;
}

async function keyboardNavigation(page: Page): Promise<void> {
    console.log("⌨️ Starting keyboard navigation...");
    const tabCount = 10;
    for (let i = 0; i < tabCount; i++) {
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 500));

        const focusResult = await page.evaluate(() => {
            const focused = document.activeElement;
            if (!focused) return { success: false };
            const text = focused.textContent?.toLowerCase() || '';
            const tagName = focused.tagName;
            const className = focused.className;
            return {
                success: text.includes('join') || text.includes('join now') || text.includes('join meeting'),
                element: {
                    tagName,
                    className,
                    text
                }
            };
        });

        console.log(`Tab ${i + 1} focus result:`, focusResult);

        if (focusResult.success) {
            console.log("✅ Found join button through keyboard navigation!");
            await page.keyboard.press('Enter');
            break;
        }
    }
    console.log("⌨️ Keyboard navigation complete");
}
