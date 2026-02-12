
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# 1. Setup
api_key = os.environ.get("GOOGLE_API_KEY")
if not api_key:
    print("❌ GOOGLE_API_KEY not found in environment variables.")
    exit(1)

genai.configure(api_key=api_key)

print("🔍 Searching for available Vision models...")

# 2. List all models that support 'generateContent' (Text/Vision)
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            # Check if it's a modern version (1.5, 2.0, or 3.0)
            if "gemini" in m.name:
                print(f"✅ FOUND: {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")

print("\nCopy the exact name of the newest model above!")
