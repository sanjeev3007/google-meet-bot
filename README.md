
# Google Meet Bot

A bot that automatically joins Google Meet calls, records audio, transcribes conversations, and leaves when no participants are present.

## Features

- 🤖 Automated meeting attendance
- 🎙️ Audio recording in segments
- 🔄 Auto-leave after 5 minutes of no participants
- 📝 Speech-to-text transcription
- 💾 Transcript storage in Supabase
- ⏰ Scheduled meeting joins

## Prerequisites

### 1. Install FFmpeg
1. Download FFmpeg from [here](https://github.com/GyanD/codexffmpeg/releases/download/6.0/ffmpeg-6.0-essentials_build.zip)
2. Extract and copy to `C:\Program Files\ffmpeg\bin`
3. Add to PATH: `C:\Program Files\ffmpeg\bin`

### 2. Install Virtual Audio Cable
1. Download from [VB-Audio](https://vb-audio.com/Cable/)
2. Install and restart computer
3. Configure Windows audio settings for CABLE Input/Output

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment File
Create `.env.local`:
```env
GOOGLE_MEET_LINK=your_meet_link
GOOGLE_EMAIL=your_email
GOOGLE_PASSWORD=your_password
SCHEDULE_TIME=55 18 * * *  # Cron format
EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
FFMPEG_PATH=C:\Program Files\ffmpeg\bin\ffmpeg.exe
AUDIO_DEVICE=audio=CABLE Output
OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Storage Setup

#### Local Development
```bash
# Create temp directories
mkdir -p temp/audio
```

#### Production Storage Options

1. **Local Storage** (Default)
   - Uses `temp/audio` directory
   - Automatic cleanup after processing
   - Files named: `recording-YYYY-MM-DDTHH-mm-ss-SSSZ.wav`
   - Pros: Simple, no configuration needed
   - Cons: Limited by disk space, no redundancy

2. **Cloud Storage** (Recommended for Production)
   - Use Supabase Storage bucket
   - Set in environment:
     ```bash
     STORAGE_TYPE=cloud
     ```
   - Pros: Scalable, redundant, managed cleanup
   - Cons: Additional cost

3. **Mounted Volume** (Alternative)
   - Mount dedicated volume:
     ```bash
     # Linux
     export AUDIO_OUTPUT_PATH=/mnt/audio_volume/temp
     
     # Windows
     set AUDIO_OUTPUT_PATH=D:\audio_storage\temp
     ```
   - Pros: Separate from system disk, manageable space
   - Cons: Requires volume setup

### 4. Supabase Setup

1. Create Storage Bucket:
   - Name: "audio"
   - Public/Private as needed

2. Create Database Table:
```sql
create table meeting_transcripts (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  time time not null,
  meet_link text not null,
  transcript text not null,
  status text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

## Storage Management

### Automatic Cleanup
- Files are deleted after:
  - Successful transcription
  - Bot shutdown
  - Processing errors

### Manual Cleanup
```bash
# Windows
del /Q temp\audio\*

# Linux
rm -f temp/audio/*
```

### Production Maintenance
1. Setup disk monitoring
2. Configure cleanup schedule:
   ```bash
   # Add to crontab (Linux)
   0 * * * * find /path/to/temp/audio -type f -mtime +1 -delete

   # Windows Task Scheduler
   forfiles /p "D:\path\to\temp\audio" /s /m *.* /d -1 /c "cmd /c del @path"
   ```

## Running the Bot

### Development
```bash
npm run bot:start
```

### Production
```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start npm --name "meet-bot" -- run bot:start

# Or using system service
# Create systemd service (Linux) or Windows Service
```

## Troubleshooting

### Storage Issues
1. Check space:
   ```bash
   df -h temp/audio  # Linux
   dir temp\audio    # Windows
   ```

2. Verify permissions:
   ```bash
   # Linux
   ls -la temp/audio
   chmod 755 temp/audio

   # Windows
   icacls temp\audio
   ```

3. Check file cleanup:
   - Monitor `temp/audio` directory
   - Verify file deletion after processing
   - Check Supabase storage quota

### Common Issues
- FFmpeg not found: Check PATH
- Audio not recording: Test CABLE setup
- Files not cleaning up: Check permissions
- Disk space full: Implement monitoring

## Monitoring

1. Storage Monitoring:
   ```bash
   # Add to monitoring script
   AUDIO_DIR="temp/audio"
   THRESHOLD=90  # 90% full

   USAGE=$(df -h $AUDIO_DIR | awk 'NR==2 {print $5}' | sed 's/%//')
   if [ $USAGE -gt $THRESHOLD ]; then
       echo "Warning: Storage usage above ${THRESHOLD}%"
   fi
   ```

2. File Count Alert:
   ```bash
   # Check file accumulation
   FILE_COUNT=$(ls -1 temp/audio | wc -l)
   if [ $FILE_COUNT -gt 1000 ]; then
       echo "Warning: Too many files in temp/audio"
   fi
   ```

## Best Practices

1. Regular Maintenance:
   - Monitor disk space
   - Check log files
   - Verify file cleanup
   - Test audio recording

2. Backup Strategy:
   - Database backups
   - Configuration backups
   - Log archival

3. Security:
   - Secure file permissions
   - Regular security updates
   - Monitor access logs
