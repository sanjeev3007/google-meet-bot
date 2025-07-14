# Google Meet Bot 🤖

An automated bot that joins Google Meet calls, records audio, transcribes conversations, and intelligently manages meeting participation. Built with modern TypeScript and Next.js.

## 🌟 Features

- 🎯 **Automated Meeting Management**
  - Auto-join scheduled meetings
  - Smart participant detection
  - Auto-leave when no participants present (5-minute timeout)
  
- 🎙️ **Advanced Audio Handling**
  - High-quality audio recording
  - Segmented recording for better management
  - Virtual audio cable integration
  
- 🤖 **AI-Powered Transcription**
  - Real-time speech-to-text conversion
  - OpenAI integration for accurate transcription
  - Structured transcript storage
  
- 💾 **Cloud Storage & Database**
  - Supabase integration for secure storage
  - Efficient audio file management
  - Structured transcript database

## 🔧 Tech Stack

- **Core Technologies**
  - TypeScript 5.x
  - Node.js 18+
  - Next.js 15.x
  
- **Automation & Browser Control**
  - Puppeteer 24.x
  - supabase crone 
  
- **Audio Processing**
  - FFmpeg
  - fluent-ffmpeg
  - Virtual Audio Cable
  
- **Cloud Services**
  - OpenAI API (for transcription)
  - Supabase (storage & database)
  - DigitalOcean (bot hosting)
  
- **Development Tools**
  - tsx (TypeScript execution)
  - cross-env (environment management)
  - dotenv (configuration)

## 📋 Prerequisites

### 2. Required Software

#### FFmpeg Installation

**Windows:**
```powershell
# Using Chocolatey
choco install ffmpeg

# OR Manual Installation
1. Download from https://github.com/GyanD/codexffmpeg/releases
2. Extract to C:\Program Files\ffmpeg
3. Add to PATH: C:\Program Files\ffmpeg\bin
```

#### Virtual Audio Cable
1. Download from [VB-Audio](https://vb-audio.com/Cable/)
2. Install and restart your system
3. Set as default recording device

## 📁 Project Structure

```
google-meet-bot/
├── src/
│   ├── app/              # Next.js application
│   │   ├── api/         # API routes
│   │   │   └── cron/   # Supabase cron webhook
│   │   ├── globals.css  # Global styles
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Home page
│   ├── bot/             # Bot core functionality
│   │   ├── controller.ts    # Main bot controller
│   │   ├── joinMeet.ts     # Meeting join logic
│   │   ├── meetingSession.ts # Session management
│   │   ├── recordAudio.ts   # Audio recording
│   │   ├── transcribe.ts    # Speech to text
│   │   ├── saveTranscript.ts # Save transcriptions
│   │   ├── scheduler.ts     # Meeting scheduler
│   │   └── config.ts        # Bot configuration
│   ├── lib/             # Shared utilities
│   │   └── supabase.ts  # Database client
│   └── scripts/         # Setup scripts
│       ├── setupCron.ts # Supabase cron setup
│       └── setupLogin.ts # Browser profile setup
├── public/             # Static assets
├── temp/              # Temporary audio files
└── package.json       # Dependencies and scripts
```

## 🚀 Quick Start

### 1. Prerequisites

- FFmpeg installed on your system
- Virtual Audio Cable installed
- Node.js 18 or higher
- Edge browser installed
- DigitalOcean account
- Supabase account

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/sanjeev3007/google-meet-bot.git
cd google-meet-bot

# Install dependencies
npm install

# Create temp directories
mkdir -p temp/audio
```

### 3. Configuration

Create `.env.local` in the root directory:

```env
# Required: Google Meet Configuration
GOOGLE_MEET_LINK=https://meet.google.com/xxx-yyyy-zzz
GOOGLE_EMAIL=your.email@gmail.com
GOOGLE_PASSWORD=your_password

# Required: API Keys
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_WEBHOOK_SECRET=your_webhook_secret

# Required: Schedule Configuration
SCHEDULE_TIME="*/15 * * * *"  # Cron expression for schedule (default: every 15 minutes)
# Examples:
# "*/15 * * * *" - Every 15 minutes
# "*/30 * * * *" - Every 30 minutes
# "0 */1 * * *" - Every hour
# "0 9,14,18 * * *" - At 9 AM, 2 PM, and 6 PM
# "0 9-17 * * 1-5" - Every hour from 9 AM to 5 PM, Monday to Friday

# Optional: Paths (defaults shown)
EDGE_PATH=C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe
FFMPEG_PATH=C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe
AUDIO_DEVICE=audio=CABLE Output
```

## 🏃‍♂️ Running the Bot

### Development Mode
```bash
npm run bot:start
```

### Using Docker on DigitalOcean
```bash
# Build the image
docker build -t google-meet-bot .

# Run the container
docker run -d \
  --name meet-bot \
  --restart unless-stopped \
  -v $(pwd)/temp:/app/temp \
  --env-file .env.local \
  google-meet-bot
```

## 🤖 Bot Architecture

### DigitalOcean Setup

1. **Container Setup**
- `Dockerfile`: Defines the bot's container environment
- Installs required dependencies (FFmpeg, Edge browser)
- Sets up Virtual Audio Cable
- Configures environment variables

2. **Bot Components**
- `src/bot/scheduler.ts`: Entry point for bot execution
- `src/bot/controller.ts`: Main bot logic
- `src/bot/joinMeet.ts`: Meeting automation
- `src/bot/recordAudio.ts`: Audio capture
- `src/bot/transcribe.ts`: OpenAI transcription
- `src/bot/saveTranscript.ts`: Database storage

### Supabase Cron Integration

1. **Cron Setup**
- `src/scripts/setupCron.ts`: Creates Supabase cron job
- Configures 5-minute interval trigger
- Sets up webhook endpoint

2. **Webhook Handler**
- `src/app/api/cron/route.ts`: Receives cron triggers
- Verifies webhook authenticity
- Starts bot process

3. **Database Integration**
- `src/lib/supabase.ts`: Database client setup
- Manages cron job configuration
- Handles transcript storage

### Workflow

1. **Initial Setup**
```bash
# Setup Chrome profile
npm run setup:login

# Setup Supabase cron
npm run setup:cron
```

2. **Deployment**
```bash
# Deploy to DigitalOcean
doctl apps create --spec app.yaml

# Deploy to Vercel (for webhook)
vercel deploy
```

3. **Automatic Operation**
- Supabase cron triggers every 5 minutes
- Webhook endpoint receives trigger
- Bot container executes meeting join
- Audio recording and transcription begin
- Data stored in Supabase

## 📝 Key Files

- `src/bot/controller.ts`: Main bot logic and meeting management
- `src/bot/joinMeet.ts`: Handles meeting joining and browser automation
- `src/bot/recordAudio.ts`: Audio recording functionality
- `src/bot/transcribe.ts`: Speech-to-text conversion using OpenAI
- `src/bot/scheduler.ts`: Meeting scheduling and cron jobs
- `src/app/api/cron/route.ts`: Supabase webhook handler
- `src/scripts/setupCron.ts`: Cron job configuration
- `src/lib/supabase.ts`: Database and cron management

## 🔧 Available Scripts

- `npm run bot:start`: Start the bot in development mode
- `npm run setup:login`: Setup Chrome profile for Google login
- `npm run setup:cron`: Configure Supabase cron job
- `npm start`: Start the bot in production mode
- `npm run dev`: Start Next.js development server
- `npm run build`: Build the Next.js application
