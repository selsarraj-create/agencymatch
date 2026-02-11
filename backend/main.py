from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import shutil
import os
import logging
import datetime
from services.vision_engine import analyze_image
import database
from app.services.apply_service import apply_to_agency

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# ... (omitted unchanged lines) ...

class ApplyRequest(BaseModel):
    user_id: str
    casting_id: str
    notes: Optional[str] = None


# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB
database.init_db()

class Lead(BaseModel):
    first_name: str
    last_name: str
    age: int
    gender: str
    email: str
    phone: str
    city: str
    zip_code: str
    wants_assessment: bool
    analysis_data: dict

@app.get("/")
def read_root():
    return {"status": "online", "message": "AgencyMatch Backend is Running"}

@app.post("/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        content = await file.read()
        # Call Vision Engine
        result = analyze_image(content, mime_type=file.content_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lead")
def submit_lead(lead: Lead):
    try:
        lead_id = database.save_lead(lead)
        # Mock Email Sending
        print(f"Sending email to {lead.email} with report...")
        return {"status": "success", "lead_id": lead_id, "message": "Lead saved and report sent (mocked)."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ApplyRequest(BaseModel):
    user_id: str
    casting_id: str
    notes: str = None

@app.post("/apply")
def apply_casting(req: ApplyRequest):
    # Logic to handle single application
    if not database.supabase:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    try:
        # Check credits
        res = database.supabase.table('profiles').select('credits').eq('id', req.user_id).single().execute()
        if not res.data or res.data['credits'] < 1:
            raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # Deduct
        database.supabase.table('profiles').update({'credits': res.data['credits'] - 1}).eq('id', req.user_id).execute()
        
        # Record
        database.supabase.table('applications_tracking').insert({
            'user_id': req.user_id,
            'casting_id': req.casting_id,
            'status': 'applied'
        }).execute()
        
        return {"status": "success", "message": "Application sent"}
    except Exception as e:
        print(f"Apply error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class BulkApplyRequest(BaseModel):
    user_id: str
    agency_ids: list[str]

# ... existing code ...

async def background_worker(user_id: str, agency_id: str, submission_id: int, user_data: dict, agency_url: str):
    logger.info(f"🚀 WORKER STARTED processing application for {agency_id}...")
    try:
        # Call the actual service
        result = await apply_to_agency(agency_url, user_data)
        
        # Update DB with result
        status = 'success' if result['status'] == 'applied' else 'failed'
        # Update agency_submissions table
        if database.supabase:
            database.supabase.table('agency_submissions').update({
                'status': status,
                'proof_screenshot_url': result.get('screenshot')
            }).eq('id', submission_id).execute()
            
        logger.info(f"Worker finished for {agency_id}: {status}")

    except Exception as e:
        logger.error(f"CRITICAL WORKER FAILURE: {str(e)}", exc_info=True)
        # Try to update DB with failure
        if database.supabase:
             database.supabase.table('agency_submissions').update({
                'status': 'failed'
            }).eq('id', submission_id).execute()

@app.post("/api/apply-bulk")
def apply_bulk(req: BulkApplyRequest, background_tasks: BackgroundTasks):
    if not database.supabase:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    count = len(req.agency_ids)
    if count == 0:
        return {"status": "error", "message": "No agencies selected"}
        
    try:
        # Check credits
        res = database.supabase.table('profiles').select('credits').eq('id', req.user_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User found")
            
        current = res.data['credits']
        if current < count:
            raise HTTPException(status_code=402, detail=f"Insufficient credits. Need {count}, have {current}")
            
        # Deduct
        new_balance = current - count
        database.supabase.table('profiles').update({'credits': new_balance}).eq('id', req.user_id).execute()
        
        # Log Transaction
        database.supabase.table('transactions').insert({
            'user_id': req.user_id,
            'amount': -count,
            'type': 'spend',
            'description': f'Applied to {count} agencies'
        }).execute()
        
        # Fetch user data for application (Mocking for now, ideally fetch from profile)
        user_data = {
            "name": "Jane Doe", # Placeholder, ideally fetch from DB
            "email": "jane@example.com",
            # ...
        }

        # Fetch agency details
        agency_res = database.supabase.table('agencies').select('id, application_url').in_('id', req.agency_ids).execute()
        agency_map = {item['id']: item.get('application_url') for item in agency_res.data} if agency_res.data else {}

        # Create Submissions and trigger background tasks
        submissions = []
        for agency_id in req.agency_ids:
            # Get real URL
            real_app_url = agency_map.get(agency_id)
            
            # Insert 'processing' record
            data = {
                'user_id': req.user_id,
                'status': 'processing',
                'agency_url': real_app_url if real_app_url else f"Missing URL for {agency_id}",
                'proof_screenshot_url': None
            }
            res = database.supabase.table('agency_submissions').insert(data).execute()
            
            if res.data:
                sub_id = res.data[0]['id']
                
                if real_app_url:
                    # Add to background tasks with REAL URL
                    background_tasks.add_task(background_worker, req.user_id, agency_id, sub_id, user_data, real_app_url)
                else:
                    # Mark as failed immediately if no URL
                    logger.error(f"Agency {agency_id} has no application_url")
                    database.supabase.table('agency_submissions').update({
                        'status': 'failed',
                        'proof_screenshot_url': 'Error: Missing application URL'
                    }).eq('id', sub_id).execute()
             
        return {
            "status": "success",
            "message": f"Started applying to {count} agencies!",
            "new_balance": new_balance
        }
    except Exception as e:
        logger.error(f"Bulk Apply Sync Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

class GenerateDigitalsRequest(BaseModel):
    user_id: str
    photo_url: str

@app.post("/generate-digitals")
async def generate_digitals(req: GenerateDigitalsRequest):
    try:
        # 1. Deduct Credit (Double check balance first)
        res = database.supabase.table('profiles').select('credits').eq('id', req.user_id).single().execute()
        if not res.data or res.data['credits'] < 1:
             return {"error": "Insufficient credits"}
             
        # Deduct
        new_balance = res.data['credits'] - 1
        database.supabase.table('profiles').update({'credits': new_balance}).eq('id', req.user_id).execute()

        # 2. One-Shot Professional Headshot (Gemini 3 Pro Image — Identity Lock)
        from services.vision_engine import generate_professional_headshot
        
        # Download the user's selfie
        import requests
        try:
             img_resp = requests.get(req.photo_url)
             img_resp.raise_for_status()
             image_bytes = img_resp.content
        except Exception as dl_err:
             raise HTTPException(status_code=400, detail=f"Failed to download image: {dl_err}")

        print("[PhotoLab] Generating professional headshot (single-model pipeline)…")
        result = generate_professional_headshot(image_bytes)
        
        if "error" in result:
             raise HTTPException(status_code=500, detail=f"Generation failed: {result['error']}")
             
        image_bytes_out = result["image_bytes"]
        
        # 3. Save to Profile
        import base64
        
        # Upload generated image to Supabase 'generated' bucket
        generated_filename = f"{req.user_id}/{datetime.datetime.now().timestamp()}_digital.jpg"
        
        # Iterate to upload
        try:
             database.supabase.storage.from_("generated").upload(
                 file=image_bytes_out,
                 path=generated_filename,
                 file_options={"content-type": "image/jpeg"}
             )
             
             # Get Public URL
             public_url = database.supabase.storage.from_("generated").get_public_url(generated_filename)
             print(f"Generated Public URL: {public_url}")
             
             # Save to profile
             try:
                 p_res = database.supabase.table('profiles').select('generated_photos').eq('id', req.user_id).single().execute()
                 
                 if p_res.data:
                     current_photos = p_res.data.get('generated_photos') or []
                     current_photos.append(public_url)
                     
                     update_res = database.supabase.table('profiles').update({'generated_photos': current_photos}).eq('id', req.user_id).execute()
                     print(f"Profile updated: {update_res.data}")
                 else:
                     logger.error(f"Profile not found for user {req.user_id}")
             except Exception as db_err:
                 logger.error(f"Failed to update profile database: {db_err}")
                 # We don't raise here so the user at least gets the image in the response
                 
        except Exception as upload_err:
             logger.error(f"Failed to upload generated image: {upload_err}")
             public_url = None
        
        return {
            "status": "success",
            "identity_constraints": "Identity-locked via gemini-3-pro-image-preview",
            "image_bytes": base64.b64encode(image_bytes_out).decode('utf-8'),
            "public_url": public_url,
            "credits": new_balance
        }

    except Exception as e:
        logger.error(f"Generation Error: {e}", exc_info=True)
        return {"error": str(e)}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
