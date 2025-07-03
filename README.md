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
  - node-cron 4.x
  
- **Audio Processing**
  - FFmpeg
  - fluent-ffmpeg
  - Virtual Audio Cable
  
- **Cloud Services**
  - OpenAI API (for transcription)
  - Supabase (storage & database)
  
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
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── bot/             # Bot core functionality
│   │   ├── controller.ts    # Main bot controller
│   │   ├── joinMeet.ts     # Meeting join logic
│   │   ├── meetingSession.ts # Session management
│   │   ├── recordAudio.ts   # Audio recording
│   │   ├── transcribe.ts    # Speech to text
│   │   ├── saveTranscript.ts # Save transcriptions
│   │   ├── scheduler.ts     # Meeting scheduler / run file /start bot by this file
│   │   └── config.ts        # Bot configuration
│   └── lib/             # Shared utilities
│       └── supabase.ts  # Database client
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

# Optional: Scheduling (Default: 6:58 PM daily)
SCHEDULE_TIME=58 18 * * *

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

### Using Docker
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

## 📝 Key Files

- `src/bot/controller.ts`: Main bot logic and meeting management
- `src/bot/joinMeet.ts`: Handles meeting joining and browser automation
- `src/bot/recordAudio.ts`: Audio recording functionality
- `src/bot/transcribe.ts`: Speech-to-text conversion using OpenAI
- `src/bot/scheduler.ts`: Meeting scheduling and cron jobs

## 🔧 Available Scripts

- `npm run bot:start`: Start the bot in development mode
- `npm start`: Start the bot in production mode
- `npm run dev`: Start Next.js development server
- `npm run build`: Build the Next.js application
