from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import shutil
import os
from vision_engine import analyze_image
import database

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

@app.post("/api/apply-bulk")
def apply_bulk(req: BulkApplyRequest):
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
        
        # Create Submissions (Mock)
        submissions = []
        for agency_id in req.agency_ids:
            submissions.append({
                'user_id': req.user_id,
                'status': 'success',
                'agency_url': f"Agency ID: {agency_id}",
                'proof_screenshot_url': "https://placehold.co/600x400/png?text=Application+Sent"
            })
        
        if submissions:
             database.supabase.table('agency_submissions').insert(submissions).execute()
             
        return {
            "status": "success",
            "message": f"Successfully applied to {count} agencies!",
            "new_balance": new_balance
        }
    except Exception as e:
        print(f"Bulk Apply error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
