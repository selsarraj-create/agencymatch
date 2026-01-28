from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import os
import time
import stripe
from typing import Optional
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Load valid environment
load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Fix path for Vercel import resolution
import sys
sys.path.append(os.path.dirname(__file__))

# Import local utils (copying logic from previous files)
try:
    from vision_logic import analyze_image
except Exception as e:
    print(f"Vision Import Error: {e}")
    # Fallback only if absolutely necessary
    def analyze_image(img_data, mime_type):
        return {"suitability_score": 70, "market_categorization": "Unknown"}

from webhook_utils import send_webhook
from email_utils import send_lead_email


app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to get Supabase client
def get_supabase() -> Client:
    url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    key = (
        os.getenv('BACKEND_SERVICE_KEY') or
        os.getenv('SUPABASE_SERVICE_ROLE_KEY') or 
        os.getenv('VITE_SUPABASE_ANON_KEY') or 
        os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or 
        os.getenv('SUPABASE_ANON_KEY') or 
        os.getenv('SUPABASE_PUBLISHABLE_KEY')
    )
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase credentials missing")
    return create_client(url, key)

# Background task for webhook and email processing
async def process_lead_background(lead_id: str, lead_record: dict, webhook_url: str, analysis_data: str):
    """Process webhook and email notifications in the background after lead is saved."""
    print(f"Starting background processing for lead {lead_id}")
    supabase = get_supabase()
    
    if webhook_url:
        # Format address from city and zip
        city = lead_record.get('city')
        zip_code = lead_record.get('zip_code')
        address = f"{city}, {zip_code}" if city and zip_code else (city or zip_code or "")
        
        # Prepare CRM payload
        crm_payload = {
            'campaign': lead_record.get('campaign') or '',
            'email': lead_record.get('email'),
            'telephone': lead_record.get('phone'),
            'address': address,
            'firstname': lead_record.get('first_name'),
            'lastname': lead_record.get('last_name'),
            'image': lead_record.get('image_url') or '',
            'analyticsid': '',
            'age': str(lead_record.get('age')),
            'gender': 'M' if lead_record.get('gender') == 'Male' else 'F',
            'opt_in': 'true' if lead_record.get('wants_assessment') else 'false'
        }
        
        # Send webhook
        try:
            import requests
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'ModelScanner/1.0'
            }
            
            print(f"Sending webhook to: {webhook_url}")
            wb_resp = requests.post(webhook_url, json=crm_payload, headers=headers, timeout=10)
            
            status = 'success' if wb_resp.status_code < 300 else 'failed'
            resp_text = wb_resp.text
            
        except requests.exceptions.Timeout:
            status = 'failed'
            resp_text = "Timeout: Request took longer than 10 seconds"
        except requests.exceptions.ConnectionError as e:
            status = 'failed'
            resp_text = f"Connection Error: {str(e)[:200]}"
        except requests.exceptions.SSLError as e:
            status = 'failed'
            resp_text = f"SSL Error: {str(e)[:200]}"
        except Exception as e:
            status = 'failed'
            resp_text = f"Unexpected Error: {str(e)[:200]}"
        
        # Update webhook status
        try:
            supabase.table('leads').update({
                'webhook_sent': True,
                'webhook_status': status,
                'webhook_response': resp_text
            }).eq('id', lead_id).execute()
        except Exception as e:
            print(f"Failed to update webhook status: {e}")

        # Send email notification
        email_data = lead_record.copy()
        try:
            analysis = json.loads(analysis_data)
            email_data['score'] = analysis.get('suitability_score', 'N/A')
            email_data['category'] = analysis.get('market_categorization', {}).get('primary', 'N/A')
        except:
            email_data['score'] = 'N/A'
            email_data['category'] = 'N/A'
        
        try:
            print("Sending email notification...")
            send_lead_email(email_data)
        except Exception as e:
            print(f"Error sending email: {e}")
    else:
        # Update status if no webhook URL configured
        supabase.table('leads').update({
            'webhook_status': 'not_configured',
            'webhook_response': 'CRM_WEBHOOK_URL not set'
        }).eq('id', lead_id).execute()

@app.post("/api/lead")
async def create_lead(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    first_name: str = Form(...),
    last_name: str = Form(...),
    age: str = Form(...),
    gender: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    city: str = Form(...),
    zip_code: str = Form(...),
    campaign: Optional[str] = Form(None),
    wants_assessment: Optional[str] = Form("false"), # Receiving as string from FormData
    analysis_data: Optional[str] = Form("{}")
):
    try:
        supabase = get_supabase()
        
        # 1. Duplicate/Update Check
        existing = supabase.table('leads').select('id').or_(f"email.eq.{email},phone.eq.{phone}").execute()
        existing_id = None
        if existing.data and len(existing.data) > 0:
            existing_id = existing.data[0]['id']
            print(f"Lead exists ({existing_id}), will update instead of create.")
            # return JSONResponse(
            #     status_code=400,
            #     content={"status": "error", "message": "This email or phone number has already been submitted."}
            # )

        # 2. Image Upload
        image_url = None
        if file:
            # Validate allowed file types
            if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
                return JSONResponse(
                    status_code=400,
                    content={"status": "error", "message": "Only JPEG and PNG images are allowed."}
                )

            try:
                content = await file.read()
                timestamp = int(time.time())
                clean_email = email.replace('@', '-at-').replace('.', '-')
                
                # Determine correct extension based on actual file type
                extension = '.jpeg'  # default
                if file.content_type == 'image/png':
                    extension = '.png'
                elif file.content_type in ['image/jpeg', 'image/jpg']:
                    extension = '.jpeg'
                    
                filename = f"{clean_email}_{timestamp}{extension}"
                
                # Upload
                upload_response = supabase.storage.from_("lead-images").upload(
                    path=filename,
                    file=content,
                    file_options={"content-type": "application/octet-stream"}
                )
                
                print(f"Upload response: {upload_response}")
                
                sb_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
                image_url = f"{sb_url}/storage/v1/object/public/lead-images/{filename}"
                
                print(f"Constructed URL: {image_url}")
            except Exception as e:
                print(f"Upload failed: {e}")
                # Save error to database to view in admin
                # supabase.table('leads').update({
                #     'webhook_status': 'upload_failed',
                #     'webhook_response': f"Image Upload Error: {str(e)}"
                # }).eq('id', lead_id).execute()
                # Stop processing to prevent sending incomplete data
                return {
                    "status": "error",
                    "message": f"Image upload failed: {str(e)}"
                }

        # 3. Prepare Data
        try:
            analysis_json = json.loads(analysis_data)
        except:
            analysis_json = {}
            
        score = analysis_json.get('suitability_score', 0)
        market_data = analysis_json.get('market_categorization', {})
        category = market_data.get('primary', 'Unknown') if isinstance(market_data, dict) else str(market_data)
        
        # Insert Record
        lead_record = {
            'first_name': first_name,
            'last_name': last_name,
            'age': age,
            'gender': gender,
            'email': email,
            'phone': phone,
            'city': city,
            'zip_code': zip_code,
            'campaign': campaign,
            'wants_assessment': (wants_assessment == 'true'),
            'score': score,
            'category': category,
            'analysis_json': analysis_json,
            'webhook_sent': False,
            'webhook_status': 'pending',
            'webhook_response': None
        }

        # Only update image_url if a new one was uploaded
        if image_url:
            lead_record['image_url'] = image_url
        
        if existing_id:
            # UPDATE existing
            result = supabase.table('leads').update(lead_record).eq('id', existing_id).execute()
            lead_id = existing_id
        else:
            # INSERT new
            # Ensure image_url is set (might be None)
            lead_record['image_url'] = image_url 
            result = supabase.table('leads').insert(lead_record).execute()
        
        if not result.data:
            # Fallback if update returned no data (unlikely)
            if existing_id: lead_id = existing_id
            else: raise Exception("Insert/Update failed")
        elif len(result.data) > 0:
            lead_id = result.data[0]['id']
        
        # 4. Offload webhook and email processing to background
        webhook_url = os.getenv('CRM_WEBHOOK_URL')
        background_tasks.add_task(
            process_lead_background,
            lead_id,
            lead_record,
            webhook_url,
            analysis_data
        )
            
        return {
            "status": "success",
            "lead_id": lead_id,
            "message": "Lead saved successfully."
        }

    except Exception as e:
        print(f"Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        mime_type = file.content_type or "image/jpeg"
        
        result = analyze_image(content, mime_type=mime_type)
        
        # DOUBLE CHECK: Enforce strict minimum score of 70 at the API level
        # This overrides anything returned by the vision engine
        try:
            current_score = int(result.get('suitability_score', 0))
            result['suitability_score'] = max(current_score, 70)
        except:
            result['suitability_score'] = 70
            
        return result
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

class RetryRequest(BaseModel):
    lead_id: str

@app.post("/api/retry_webhook")
async def retry_webhook(req: RetryRequest):
    try:
        supabase = get_supabase()
        webhook_url = os.getenv('CRM_WEBHOOK_URL')
        
        if not webhook_url:
            raise HTTPException(status_code=400, detail="CRM_WEBHOOK_URL not configured")
            
        resp = supabase.table('leads').select('*').eq('id', req.lead_id).execute()
        if not resp.data:
             raise HTTPException(status_code=404, detail="Lead not found")
             
        lead_record = resp.data[0]
        wb_resp = send_webhook(webhook_url, lead_record)
        
        status = 'success' if wb_resp and wb_resp.status_code < 300 else 'failed'
        resp_text = wb_resp.text if wb_resp else "Connection failed"
        
        supabase.table('leads').update({
            'webhook_sent': True,
            'webhook_status': status,
            'webhook_response': resp_text
        }).eq('id', req.lead_id).execute()
        
        return {
            "status": "success", 
            "message": "Webhook retry attempted",
            "webhook_status": status
        }
    except Exception as e:
         return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/test_webhook")
async def test_webhook_connection():
    """
    Test endpoint to verify CRM webhook connectivity from Vercel's serverless environment.
    Returns detailed diagnostic information about the connection attempt.
    """
    import time
    import requests
    
    webhook_url = os.getenv('CRM_WEBHOOK_URL')
    
    if not webhook_url:
        return {
            "status": "error",
            "message": "CRM_WEBHOOK_URL not configured"
        }
    
    # Test payload
    test_payload = {
        'campaign': '#TEST1M',
        'email': 'test@vercel-test.com',
        'telephone': '1234567890',
        'address': 'Test City, 12345',
        'firstname': 'Vercel',
        'lastname': 'Test',
        'image': '',
        'analyticsid': '',
        'age': '25',
        'gender': 'M',
        'opt_in': 'false'
    }
    
    start_time = time.time()
    error_details = None
    response_data = None
    status_code = None
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'ModelScanner-Test/1.0'
        }
        response = requests.post(webhook_url, json=test_payload, headers=headers, timeout=10)
        elapsed_time = time.time() - start_time
        status_code = response.status_code
        response_data = response.text[:500]  # Limit response size
        
        return {
            "status": "success" if status_code < 300 else "failed",
            "webhook_url": webhook_url,
            "status_code": status_code,
            "response_time_seconds": round(elapsed_time, 2),
            "response_preview": response_data,
            "message": "Connection successful" if status_code < 300 else f"HTTP {status_code} error"
        }
        
    except requests.exceptions.Timeout:
        elapsed_time = time.time() - start_time
        error_details = f"Timeout after {round(elapsed_time, 2)} seconds"
    except requests.exceptions.ConnectionError as e:
        error_details = f"Connection Error: {str(e)[:300]}"
    except requests.exceptions.SSLError as e:
        error_details = f"SSL Error: {str(e)[:300]}"
    except requests.exceptions.RequestException as e:
        error_details = f"Request Error: {str(e)[:300]}"
    except Exception as e:
        error_details = f"Unexpected Error: {str(e)[:300]}"
    
    return {
        "status": "error",
        "webhook_url": webhook_url,
        "error": error_details,
        "message": "Failed to connect to CRM server from Vercel"
    }

# ==========================================
# CREDIT SYSTEM & STRIPE WEBHOOKS
# ==========================================

@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    endpoint_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Get user identifier (client_reference_id should be the Supabase User ID)
        user_id = session.get('client_reference_id')
        customer_email = session.get('customer_details', {}).get('email')
        
        # Determine credits to add (logic can be customized)
        # Default: 10 credits for any purchase for now, or assume metadata
        credits_to_add = int(session.get('metadata', {}).get('credits', 10))
        
        if user_id:
            supabase = get_supabase()
            
            # 1. Update Profile Logic (Atomic increment via SQL preferred, but Python for now)
            # Fetch current
            profile = supabase.table('profiles').select('credits').eq('id', user_id).execute()
            current_credits = profile.data[0]['credits'] if profile.data else 0
            new_credits = current_credits + credits_to_add
            
            supabase.table('profiles').upsert({
                'id': user_id, 
                'email': customer_email,
                'credits': new_credits,
                'stripe_customer_id': session.get('customer')
            }).execute()

            # 2. Log Transaction
            supabase.table('transactions').insert({
                'user_id': user_id,
                'amount': credits_to_add,
                'type': 'deposit',
                'description': f"Stripe Checkout {session.get('id')}",
                'stripe_session_id': session.get('id')
            }).execute()
            
            print(f"Funded {credits_to_add} credits to user {user_id}")

    return {"status": "success"}

@app.get("/api/credits/balance")
async def get_credit_balance(user_id: str):
    """Check user credit balance"""
    try:
        supabase = get_supabase()
        resp = supabase.table('profiles').select('credits').eq('id', user_id).execute()
        if resp.data:
            return {"credits": resp.data[0]['credits']}
        return {"credits": 0}
    except Exception as e:
         return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/generate-portfolio")
async def generate_portfolio(request: Request):
    """
    Deducts 1 credit and triggers Gemini generation.
    (Stub for Phase 2)
    """
    try:
        body = await request.json()
        user_id = body.get('user_id')
        if not user_id:
             raise HTTPException(status_code=400, detail="Missing user_id")
             
        supabase = get_supabase()
        
        # 1. Check Balance
        profile_resp = supabase.table('profiles').select('credits').eq('id', user_id).execute()
        if not profile_resp.data:
             raise HTTPException(status_code=404, detail="User profile not found")
             
        current_credits = profile_resp.data[0]['credits']
        if current_credits < 1:
             raise HTTPException(status_code=402, detail="Insufficient credits")
        
        # 2. Deduct Credit
        new_credits = current_credits - 1
        supabase.table('profiles').update({'credits': new_credits}).eq('id', user_id).execute()
        
        # 3. Log Transaction
        supabase.table('transactions').insert({
            'user_id': user_id,
            'amount': -1,
            'type': 'spend',
            'description': 'Portfolio Generation'
        }).execute()
        
        # 4. Trigger Generation (TODO: Integrate Vision/Generative logic)
        # For now, return mock success
        return {
            "status": "success",
            "message": "Generation started",
            "remaining_credits": new_credits,
            "mock_image_url": "https://placehold.co/600x400/png"
        }

    except Exception as e:
        print(f"Gen Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
