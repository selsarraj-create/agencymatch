
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add current directory to path so we can import api.photo_lab
sys.path.append(os.getcwd())

from api.photo_lab import process_digitals

# Use a sample image (this is a stock photo of a face)
SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80"

print("🧪 Testing Photo Lab Processing with gemini-2.0-flash...")

try:
    result = process_digitals(SAMPLE_IMAGE_URL)
    
    if "error" in result:
        print(f"❌ TEST FAILED: {result['error']}")
    else:
        print("\n✅ TEST PASSED!")
        print(f"Identity Constraints: {result.get('identity_constraints')}")
        print(f"Image Bytes Length: {len(str(result.get('image_bytes')))}")

except Exception as e:
    print(f"❌ CRITICAL ERROR: {e}")
