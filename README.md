# SocialBee MVP - AI-Powered Social Media Content Creation

A minimal content creation MVP built with Next.js frontend + backend and Python AI service, inspired by SocialBee.

## Project Structure

```
projectX/
├── projectx/                 # Next.js frontend + backend
│   ├── src/app/
│   │   ├── page.tsx         # Main SocialBee interface
│   │   └── api/             # API routes
│   │       ├── send-to-ai/  # AI content generation
│   │       └── post-to-x/   # X/Twitter posting
│   └── package.json
└── python-ai-service/        # Python FastAPI AI service
    ├── main.py              # FastAPI server
    ├── requirements.txt     # Python dependencies
    └── env_example.txt      # Environment variables template
```

## Features

- **Content Creation Interface**: Clean, modern UI for creating social media posts
- **AI Content Generation**: Generate posts using OpenAI GPT models
- **Tone Selection**: Choose from Neutral, Friendly, Professional, Funny, or Motivational
- **Content Editing**: Edit AI-generated content before posting
- **X/Twitter Integration**: Post directly to X (mock implementation)
- **Character Counter**: Track post length for Twitter's 280-character limit

## Quick Start

### 1. Start the Next.js Frontend
```bash
cd projectx
npm install
npm run dev
```
Visit: http://localhost:3000

### 2. Start the Python AI Service (Optional)
```bash
cd python-ai-service
pip install -r requirements.txt
# Set up your OpenAI API key
cp env_example.txt .env
# Edit .env and add your OPENAI_API_KEY
python main.py
```
Service runs on: http://localhost:8000

## How It Works

1. **User Input**: Enter a topic and select a tone
2. **AI Generation**: Click "Generate with AI" to create content
3. **Edit & Preview**: Modify the generated content as needed
4. **Post to X**: Click "Post to X" to share (currently mocked)

## Current Status

- ✅ Next.js frontend with modern UI
- ✅ Mock API responses working
- ✅ Python AI service structure ready
- ⏳ Real AI integration (requires OpenAI API key)
- ⏳ Real X/Twitter posting (requires X API credentials)

## Future Enhancements

- Multiple social media platforms
- Content scheduling
- Analytics dashboard
- User authentication
- Content templates
- Image generation
- Team collaboration features

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI Service**: Python, FastAPI, OpenAI API
- **Styling**: Tailwind CSS with modern design patterns
