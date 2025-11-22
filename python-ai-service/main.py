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
- IMPORTANT: When you generate a post, format it clearly using one of these methods:
  * Put the post in double quotes: "Your post here"
  * Put the post in a code block: ```Your post here```
  * Or simply write the post directly if it's the main content
- Make sure the post content is clearly distinguishable from any explanations you provide"""

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
        # Look for content that looks like a post (quotes, markdown code blocks, or direct posts)
        suggested_content = None
        
        # Strategy 1: Look for content in markdown code blocks (``` or `)
        code_block_pattern = r'```(?:[a-z]+\n)?(.*?)```'
        code_blocks = re.findall(code_block_pattern, ai_message, re.DOTALL)
        if code_blocks:
            for block in code_blocks:
                block_content = block.strip()
                if len(block_content) <= platform_max_chars and len(block_content) > 10:
                    suggested_content = block_content
                    break
        
        # Strategy 2: Look for content in inline code blocks (`content`)
        if not suggested_content:
            inline_code_pattern = r'`([^`]+)`'
            inline_codes = re.findall(inline_code_pattern, ai_message)
            if inline_codes:
                # Use the longest code block that fits
                for code in sorted(inline_codes, key=len, reverse=True):
                    if len(code) <= platform_max_chars and len(code) > 10:
                        suggested_content = code
                        break
        
        # Strategy 3: Look for quoted content (double quotes)
        if not suggested_content:
            quoted = re.findall(r'"([^"]+)"', ai_message)
            if quoted:
                # Use the longest quoted text that fits
                for quote in sorted(quoted, key=len, reverse=True):
                    if len(quote) <= platform_max_chars and len(quote) > 10:
                        suggested_content = quote
                        break
        
        # Strategy 4: Look for content after common prefixes like "Here's a post:", "Post:", etc.
        if not suggested_content:
            prefix_patterns = [
                r"(?:Here'?s? (?:a |your )?post[:\-]?\s*)(.{10,280})",
                r"(?:Post[:\-]?\s*)(.{10,280})",
                r"(?:Tweet[:\-]?\s*)(.{10,280})",
                r"(?:Content[:\-]?\s*)(.{10,280})",
            ]
            for pattern in prefix_patterns:
                match = re.search(pattern, ai_message, re.IGNORECASE | re.DOTALL)
                if match:
                    candidate = match.group(1).strip()
                    # Clean up - remove trailing punctuation that might be part of explanation
                    candidate = re.sub(r'[\.!?]+$', '', candidate)
                    # Take only the first sentence/segment that fits
                    sentences = re.split(r'[.\n]', candidate)
                    for sentence in sentences:
                        sentence = sentence.strip()
                        if len(sentence) <= platform_max_chars and len(sentence) > 10:
                            suggested_content = sentence
                            break
                    if suggested_content:
                        break
        
        # Strategy 5: If message is reasonable length and looks like a direct post
        if not suggested_content and len(ai_message) <= platform_max_chars + 100:
            # Check if it looks like a post (not just a question, explanation, or too short)
            # Exclude messages that are clearly explanations or questions
            is_explanation = any(phrase in ai_message.lower()[:50] for phrase in [
                'here\'s', 'here is', 'i can', 'i\'ll', 'would you', 'do you want',
                'let me', 'i\'ve', 'i have', 'you can', 'try this', 'how about',
                'sure!', 'of course', 'absolutely'
            ])
            
            if not ai_message.endswith('?') and len(ai_message) > 20 and not is_explanation:
                suggested_content = ai_message
        
        # Strategy 6: Extract the first substantial sentence or paragraph that fits (as last resort)
        if not suggested_content:
            # Split by newlines first (paragraphs), then by periods
            paragraphs = ai_message.split('\n')
            for para in paragraphs:
                para = para.strip()
                if len(para) <= platform_max_chars and len(para) > 20:
                    # Make sure it doesn't look like an explanation
                    if not any(phrase in para.lower()[:30] for phrase in [
                        'here\'s', 'here is', 'i can', 'let me', 'you can', 'sure!'
                    ]) and not para.endswith('?'):
                        suggested_content = para
                        break
            
            # If still nothing, try sentences
            if not suggested_content:
                sentences = re.split(r'[.\n]', ai_message)
                for sentence in sorted(sentences, key=len, reverse=True):
                    sentence = sentence.strip()
                    if len(sentence) <= platform_max_chars and len(sentence) > 20:
                        # Make sure it doesn't look like an explanation
                        if not any(phrase in sentence.lower()[:30] for phrase in [
                            'here\'s', 'here is', 'i can', 'let me', 'you can'
                        ]) and not sentence.endswith('?'):
                            suggested_content = sentence
                            break
        
        return ChatResponse(
            message=ai_message,
            suggested_content=suggested_content
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in chat: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
