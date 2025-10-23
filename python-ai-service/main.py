from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import os
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
