
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

def list_models():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("GOOGLE_API_KEY not found")
        return

    client = genai.Client(api_key=api_key, http_options={'api_version': 'v1beta'})
    
    print("Listing models in v1beta...")
    with open("models_list.txt", "w") as f:
        try:
            # Pager object, iterate
            # Try .list() as per common client patterns
            for model in client.models.list():
                f.write(f"Model: {model.name}\n")
                f.write(f"  DisplayName: {model.display_name}\n")
                f.write(f"  Supported Actions: {model.supported_actions}\n")
                f.write("-" * 20 + "\n")
        except Exception as e:
            f.write(f"Failed to list models via client.models.list(): {e}\n")
            try:
                 # Fallback to genai module level (older sdk style if mixed installed)
                 import google.generativeai as old_genai
                 old_genai.configure(api_key=api_key)
                 for m in old_genai.list_models():
                     f.write(f"OldSDK Model: {m.name}\n")
                     f.write(f"  Methods: {m.supported_generation_methods}\n")
            except Exception as e2:
                 f.write(f"Failed via old sdk: {e2}\n")
    print("Model list saved to models_list.txt")

if __name__ == "__main__":
    list_models()
