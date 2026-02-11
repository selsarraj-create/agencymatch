
import os
import sys
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.services.vision_engine import analyze_user_appearance, generate_model_portfolio, analyze_image

# Test Image (URL to bytes)
import requests
SAMPLE_URL = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80"
print("Downloading sample image...")
img_bytes = requests.get(SAMPLE_URL).content

print("\n--- Test 1: Gemini 3 Pro Analysis ---")
try:
    analysis = analyze_user_appearance(img_bytes)
    print("Analysis Result Keys:", analysis.keys())
    print("Physical Description:", analysis.get("physical_description"))
except Exception as e:
    print(f"Analysis Failed: {e}")
    # Create mock for step 2 if step 1 fails
    analysis = {"physical_description": "A model with strong features", "best_fashion_style": "High Fashion"}

print("\n--- Test 2: Imagen 4 Ultra Generation (Strict Mode) ---")
try:
    # Now passing img_bytes
    generated = generate_model_portfolio(analysis, img_bytes)
    if generated:
        print("Generation Success: Image generated")
        print("Image Size:", len(generated.image.image_bytes))
    else:
        print("Generation Failed: Returned None")
except Exception as e:
    print(f"Generation Failed: {e}")

print("\n--- Test 3: Legacy Scan (Gemini 2.0 Flash) ---")
try:
    scan_result = analyze_image(img_bytes)
    print("Scan Result Keys:", scan_result.keys())
    print("Suitability Score:", scan_result.get("suitability_score"))
except Exception as e:
    print(f"Scan Analysis Failed: {e}")
