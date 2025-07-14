import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { join } from 'path';
import { config } from 'dotenv';
import readline from 'readline';
import fs from 'fs';

// Load environment variables
config({ path: '.env.local' });

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Create readline interface for user interaction
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};

async function setupLogin() {
    console.log('🔐 Starting Google login setup...');
    console.log('⚠️ Please login manually when the browser opens.');
    console.log('📝 This will save your session for future use.');

    const userDataDir = join(process.cwd(), 'chrome-profile');
    
    // Ensure the profile directory exists
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    console.log('📂 Using profile directory:', userDataDir);
    
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--disable-notifications'
        ],
        defaultViewport: null,
        executablePath: process.env.EDGE_PATH || undefined
    });

    try {
        const page = await browser.newPage();
        
        // First verify if already logged in
        console.log('🔍 Checking existing login status...');
        await page.goto('https://meet.google.com', { waitUntil: 'networkidle0' });
        
        const isAlreadyLoggedIn = await page.evaluate(() => {
            return document.querySelector('input[placeholder*="Enter a code"]') !== null ||
                   document.querySelector('[aria-label*="meeting code"]') !== null;
        });

        if (isAlreadyLoggedIn) {
            console.log('✅ Already logged in! Profile is working correctly.');
            console.log('📁 Profile location:', userDataDir);
            // Create profile ready marker
            fs.writeFileSync(join(userDataDir, '.profile-ready'), 'Profile setup completed');
            return;
        }
        
        // If not logged in, proceed with login
        console.log('🔑 Not logged in, proceeding with login setup...');
        await page.goto('https://accounts.google.com', { waitUntil: 'networkidle0' });
        
        console.log('\n✨ Browser launched. Please login to your Google account.');
        console.log('⏳ Take your time to complete the login process...');
        
        // Wait for user confirmation
        await question('\n👉 Press Enter AFTER you have successfully logged in (the browser should show your Google Account page)...');
        
        // Verify login by checking Google Meet access
        console.log('\n🔍 Verifying login and Meet access...');
        await page.goto('https://meet.google.com', { waitUntil: 'networkidle0' });
        
        const meetAccessible = await page.evaluate(() => {
            return document.querySelector('input[placeholder*="Enter a code"]') !== null ||
                   document.querySelector('[aria-label*="meeting code"]') !== null;
        });
        
        if (meetAccessible) {
            console.log('\n✅ Login successful! Profile saved and Meet access confirmed.');
            console.log('📁 Profile saved in:', userDataDir);
            console.log('🤖 The bot can now use this session.');
            
            // Create profile ready marker
            fs.writeFileSync(join(userDataDir, '.profile-ready'), 'Profile setup completed');
            console.log('✅ Profile marker created successfully');
        } else {
            console.log('\n❌ Could not verify Google Meet access.');
            console.log('💡 Please ensure you have access to Google Meet and try again.');
        }
    } catch (error) {
        console.error('\n❌ Error during setup:', error);
    } finally {
        // Ask user before closing
        await question('\n👉 Press Enter to close the browser...');
        await browser.close();
        rl.close();
    }
}

setupLogin().catch(console.error); 