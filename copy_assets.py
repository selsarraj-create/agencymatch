import shutil
import os
import glob

# Logic to find the artifact directory and copy images
# Artifacts are in C:\Users\selsa\.gemini\antigravity\brain\e23a96d3-837e-41eb-b4e3-96297b16dc43
ARTIFACT_DIR = r"C:\Users\selsa\.gemini\antigravity\brain\e23a96d3-837e-41eb-b4e3-96297b16dc43"
DEST_DIR = r"d:\agencymatch\frontend\public\assets"

def copy_images():
    print(f"Looking for images in {ARTIFACT_DIR}")
    
    # Avatars 1-4
    for i in range(1, 5):
        pattern = os.path.join(ARTIFACT_DIR, f"avatar_user_{i}_*.png")
        files = glob.glob(pattern)
        if files:
            latest = max(files, key=os.path.getctime)
            target = os.path.join(DEST_DIR, f"avatar_user_{i}.png")
            shutil.copy(latest, target)
            print(f"Copied {latest} to {target}")
        else:
            print(f"No avatar_user_{i} found")

if __name__ == "__main__":
    if not os.path.exists(DEST_DIR):
        print(f"Creating {DEST_DIR}")
        os.makedirs(DEST_DIR)
    copy_images()
