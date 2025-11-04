from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import requests
import os
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="SocialBee AI Service", version="1.0.0")

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class GeneratePostRequest(BaseModel):
    topic: str
    tone: str

class GeneratePostResponse(BaseModel):
    post: str

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]  # Chat history: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    previous_posts: List[str] = []  # List of previous post contents for tone/style context
    use_account_tone: bool = False  # Whether to analyze and use account's tone
    platform: str = "twitter"  # Target platform

class ChatResponse(BaseModel):
    message: str  # AI's response
    suggested_content: Optional[str] = None  # Generated post content (if applicable)

@app.get("/")
async def root():
    return {"message": "SocialBee AI Service is running"}

@app.post("/generate-post", response_model=GeneratePostResponse)
async def generate_post(request: GeneratePostRequest):
    try:
        # Create the prompt based on topic and tone
        prompt = f"Generate 1 short and engaging social media post about: {request.topic}. Make sure the tone is {request.tone}. Keep it under 280 characters for X/Twitter."
        
        # Call OpenAI API using requests
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": "You are a social media content creator. Create engaging, concise posts that are perfect for Twitter/X."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 100,
            "temperature": 0.7
        }
        
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        post = result["choices"][0]["message"]["content"].strip()
        
        return GeneratePostResponse(post=post)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating post: {str(e)}")

def analyze_account_tone(previous_posts: List[str]) -> str:
    """
    Analyze previous posts to extract tone and style characteristics.
    Returns a description string that can be added to system prompt.
    """
    if not previous_posts:
        return ""
    
    # Use OpenAI to analyze the tone from previous posts
    try:
        posts_text = "\n".join([f"- {post}" for post in previous_posts[:10]])  # Analyze up to 10 posts
        
        analysis_prompt = f"""Analyze the following social media posts and identify the user's writing style and tone:
        
{posts_text}

Provide a brief description (2-3 sentences) of the tone, style, and any patterns you notice. Focus on:
- Tone (professional, casual, humorous, motivational, etc.)
- Writing style (sentence length, use of emojis, formality level)
- Common themes or topics
"""
        
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": "You are an expert at analyzing writing styles and tones from social media content."},
                {"role": "user", "content": analysis_prompt}
            ],
            "max_tokens": 150,
            "temperature": 0.3
        }
        
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        tone_analysis = result["choices"][0]["message"]["content"].strip()
        
        return f"\n\nUser's account tone and style: {tone_analysis}"
        
    except Exception as e:
        # If analysis fails, return empty string (fallback to generic)
        return ""

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Build system message with instructions
        platform_max_chars = 280 if request.platform == "twitter" or request.platform == "x" else 2200
        
        system_content = f"""You are a helpful social media content creation assistant for {request.platform}. Help users create engaging posts. 

Guidelines:
- Be conversational and friendly
- When the user shares an idea or asks for content, generate a social media post
- Keep posts under {platform_max_chars} characters
- After generating a post, you can provide a brief explanation or ask if they want to refine it
- If you generate a post, present it clearly - it can be anywhere in your response"""

        # Add account tone analysis if requested and previous posts are available
        if request.use_account_tone and request.previous_posts:
            tone_context = analyze_account_tone(request.previous_posts)
            system_content += tone_context
            system_content += "\n\nWhen generating posts, match this user's tone and style from their previous posts."
        
        # Build messages array with system message first, then chat history
        messages = [
            {"role": "system", "content": system_content}
        ]
        messages.extend(request.messages)
        
        # Call OpenAI API
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "gpt-3.5-turbo",
            "messages": messages,
            "max_tokens": 300,
            "temperature": 0.7
        }
        
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        ai_message = result["choices"][0]["message"]["content"].strip()
        
        # Try to extract suggested post content from the AI's message
        # Look for content that looks like a post (quotes, or content that fits post length)
        suggested_content = None
        
        # Check if message contains content that looks like a post (within character limits)
        # Simple heuristic: if there's text in quotes or if message length suggests it's a post
        if len(ai_message) <= platform_max_chars + 100:  # Allow some buffer for explanations
            # Try to find quoted content first
            quoted = re.findall(r'"([^"]+)"', ai_message)
            if quoted:
                # Use the longest quoted text that fits
                for quote in quoted:
                    if len(quote) <= platform_max_chars:
                        suggested_content = quote
                        break
            
            # If no quotes and message is reasonable length, might be a direct post
            if not suggested_content and len(ai_message) <= platform_max_chars:
                # Check if it looks like a post (not just a question or explanation)
                if not ai_message.endswith('?') and len(ai_message) > 20:
                    suggested_content = ai_message
        
        return ChatResponse(
            message=ai_message,
            suggested_content=suggested_content
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in chat: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
