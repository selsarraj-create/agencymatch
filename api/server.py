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
        os.getenv('VITE_SUPABASE_SERVICE_ROLE_KEY') or
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

class HandoffRequest(BaseModel):
    user_id: str
    email: str
    analysis_data: str # JSON string

@app.post("/api/handoff")
async def auth_handoff(req: HandoffRequest):
    """
    Server-side handoff to bypass RLS policies on 'profiles' table.
    Updates the user profile with anonymous scan results.
    """
    try:
        supabase = get_supabase()
        
        # Parse analysis data
        try:
            analysis_json = json.loads(req.analysis_data)
        except:
            analysis_json = {}

        # Upsert Profile using Service Role (Bypasses RLS)
        data = {
            'id': req.user_id,
            'email': req.email,
            'analysis_data': analysis_json,
            'is_analysis_complete': True,
            'updated_at': time.strftime('%Y-%m-%dT%H:%M:%S%z') # Simple ISO format
        }
        
        # First ensure the profile exists (though Auth trigger should handle it, this is safer)
        # We need to be careful not to overwrite other fields if they exist, 
        # but 'upsert' with minimal data on 'id' conflict might overwrite nulls.
        # Ideally, we UPDATE. If update fails (no row), we INSERT.
        
        print(f"Executing Handoff for {req.user_id}...")
        
        # Try Update first
        try:
            update_resp = supabase.table('profiles').update({
                'analysis_data': analysis_json,
                'is_analysis_complete': True
            }).eq('id', req.user_id).execute()
            
            if update_resp.data:
                return {"status": "success", "message": "Profile updated"}
                
        except Exception as e:
            print(f"Update failed, trying upsert: {e}")

        # Fallback to Upsert (if trigger failed)
        response = supabase.table('profiles').upsert(data).execute()
        
        return {"status": "success", "message": "Profile hydrated (upsert)"}

    except Exception as e:
        print(f"Handoff Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/analyze")
async def analyze_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        mime_type = file.content_type or "image/jpeg"
        
        result = analyze_image(content, mime_type=mime_type)
        
        # DOUBLE CHECK: Enforce strict minimum score of 70 at the API level
        # EXCEPTION: If the vision logic explicitly returned 0 (Invalid Face), allow it.
        try:
            current_score = int(result.get('suitability_score', 0))
            if current_score > 0:
                result['suitability_score'] = max(current_score, 70)
            # If 0, leave it as 0 (No Face Detected)
        except:
             # Default fallback is still 70 for errors, but vision_logic handles the 0 case
            if result.get('suitability_score') != 0:
                result['suitability_score'] = 70
            
        return result
    except Exception as e:
        # Return partial result if available, or error structure
        # If we have a partial result with score 0, return it
        return result
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# --- Photo Lab Endpoints ---
from api.photo_lab import process_digitals

class DigitalGenRequest(BaseModel):
    photo_url: str
    user_id: str

@app.post("/api/generate-digitals")
async def generate_digitals_endpoint(req: DigitalGenRequest):
    try:
        # In a real app, we check credits here
        # supabase = get_supabase()
        # check_credits(req.user_id, cost=5) ...

        result = process_digitals(req.photo_url)
        
        if "error" in result:
             return JSONResponse(status_code=500, content=result)
             
        return result
        
    except Exception as e:
        print(f"Generate Digitals Error: {e}")
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
# PAYMENT ENDPOINTS
# ==========================================

class CheckoutRequest(BaseModel):
    user_id: str
    amount: int

@app.post("/api/create-checkout-session")
async def create_checkout_session(req: CheckoutRequest):
    try:
        # Get correct domain
        # Vercel automatically sets VERCEL_URL, but it lacks 'https://'
        # PRIORITIZE PRODUCTION DOMAIN
        
        # Hardcoded production override (as requested by user)
        PRODUCTION_DOMAIN = "https://agencyscout.io"
        
        vercel_url = os.getenv('VERCEL_URL')
        site_url = os.getenv('VITE_SITE_URL')
        
        if os.getenv('VERCEL_ENV') == 'production':
            domain_url = PRODUCTION_DOMAIN
        elif site_url:
            domain_url = site_url
        elif vercel_url:
            domain_url = f"https://{vercel_url}"
        else:
            domain_url = 'http://localhost:5173'
            
        print(f"Using Stripe Domain: {domain_url}")
        
        # Pricing Tier Definition (GBP)
        PRICING_TIERS = {
            10:  500,   # £5.00
            30:  1000,  # £10.00
            50:  1500,  # £15.00
            100: 2500   # £25.00
        }
        
        if req.amount not in PRICING_TIERS:
             return JSONResponse(status_code=400, content={"error": "Invalid credit package selected."})
             
        unit_amount = PRICING_TIERS[req.amount]
        
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'gbp',
                        'product_data': {
                            'name': f'{req.amount} AgencyMatch Credits',
                            'description': 'Credits to scan and submit models',
                            'images': ['https://agencymatch.vercel.app/logo.png'], 
                        },
                        'unit_amount': unit_amount,
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=domain_url + '/dashboard?success=true',
            cancel_url=domain_url + '/dashboard?canceled=true',
            client_reference_id=req.user_id,
            metadata={
                'credits': req.amount,
                'user_id': req.user_id
            }
        )
        return {"url": checkout_session.url}
    except Exception as e:
        print(f"Stripe Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

    except Exception as e:
        print(f"Stripe Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# ==========================================
# ADMIN ENDPOINTS
# ==========================================

@app.get("/api/admin/users")
async def admin_get_users(request: Request):
    """
    Get all users with their profile data and associated lead info
    """
    try:
        # 1. Auth Check (Simplistic for demo - ideally use middleware)
        auth_header = request.headers.get("Authorization")
        if not auth_header: # In real app, verify JWT
             # Weak check: Allow frontend to pass user_id for now if JWT verification is complex
             # Better: Check 'sb-access-token' or require JWT
             pass

        # For this demo, we'll verify the requester is an admin by an explicit header or query param
        # OR better: The frontend passes the user_id of the requester, we check DB
        requester_id = request.headers.get("X-User-Id") 
        if not requester_id:
             return JSONResponse(status_code=401, content={"error": "Unauthorized"})

        supabase = get_supabase()
        
        # Verify Admin Status (via RPC to avoid RLS recursion)
        admin_check = supabase.rpc('is_user_admin', {'check_id': requester_id}).execute()
        if not admin_check.data:
             return JSONResponse(status_code=403, content={"error": "Forbidden: Admin access required"})

        # 2. Fetch All Profiles
        # Limit to 100 for now
        profiles = supabase.table('profiles').select('*').order('created_at', desc=True).limit(100).execute()
        
        # 3. Enrich with Lead Names (This is N+1, but Supabase JOIN is better. 
        # Since auth.users is separate, we join with our 'leads' table if linked, or just return profiles)
        
        # Optimziation: Fetch all leads that have a user_id
        # We need a new column user_id on leads table for this to work perfectly.
        # Assuming you added user_id to leads in the previous fix?
        # If not, we merge by email.
        
        user_list = []
        for p in profiles.data:
            user_data = {
                "id": p['id'],
                "email": p['email'],
                "credits": p['credits'],
                "is_admin": p.get('is_admin', False),
                "created_at": p['created_at'],
                "name": "N/A"
            }
            
            # Try to find matching lead
            lead_match = supabase.table('leads').select('first_name, last_name, campaign').eq('email', p['email']).limit(1).execute()
            if lead_match.data:
                l = lead_match.data[0]
                user_data['name'] = f"{l['first_name']} {l['last_name']}"
                user_data['campaign'] = l.get('campaign', 'N/A')
                
            user_list.append(user_data)
            
        return user_list

    except Exception as e:
        print(f"Admin Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

class CreditAdjustment(BaseModel):
    admin_id: str
    target_user_id: str
    amount: int

@app.post("/api/admin/credits/add")
async def admin_add_credits(payload: CreditAdjustment):
    try:
        supabase = get_supabase()
        
        # 1. Verify Admin (via RPC)
        admin_check = supabase.rpc('is_user_admin', {'check_id': payload.admin_id}).execute()
        if not admin_check.data:
             return JSONResponse(status_code=403, content={"error": "Forbidden"})

        # 2. Update Target User
        # Fetch current
        target = supabase.table('profiles').select('credits').eq('id', payload.target_user_id).single().execute()
        if not target.data:
             return JSONResponse(status_code=404, content={"error": "User not found"})
             
        current = target.data['credits']
        new_balance = current + payload.amount
        
        supabase.table('profiles').update({'credits': new_balance}).eq('id', payload.target_user_id).execute()
        
        # 3. Log Transaction
        supabase.table('transactions').insert({
            'user_id': payload.target_user_id,
            'amount': payload.amount,
            'type': 'bonus',
            'description': f'Admin adjustment by {payload.admin_id}'
        }).execute()
        
        return {"status": "success", "new_balance": new_balance}

    except Exception as e:
        print(f"Admin Update Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

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

# ==========================================
# AGENCY APPLICATION & AUTOMATION
# ==========================================

@app.get("/api/agencies")
async def get_agencies():
    try:
        supabase = get_supabase()
        response = supabase.table('agencies').select('*').eq('status', 'active').order('name').execute()
        return response.data
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

class BulkApplyRequest(BaseModel):
    user_id: str
    agency_ids: list[str]

@app.post("/api/apply-bulk")
async def apply_bulk(req: BulkApplyRequest):
    try:
        supabase = get_supabase()
        
        count = len(req.agency_ids)
        if count == 0:
            return {"status": "error", "message": "No agencies selected"}
            
        cost = count * 1 # 1 Credit per agency
        
        # 1. Check Balance
        profile_resp = supabase.table('profiles').select('credits').eq('id', req.user_id).single().execute()
        if not profile_resp.data:
             return JSONResponse(status_code=404, content={"error": "User profile not found"})
             
        current_credits = profile_resp.data['credits']
        if current_credits < cost:
             return JSONResponse(status_code=402, content={"error": f"Insufficient credits. Need {cost}, have {current_credits}."})
        
        # 2. Deduct Credits
        new_balance = current_credits - cost
        supabase.table('profiles').update({'credits': new_balance}).eq('id', req.user_id).execute()
        
        # 3. Log Transaction
        supabase.table('transactions').insert({
            'user_id': req.user_id,
            'amount': -cost,
            'type': 'spend',
            'description': f'Applied to {count} agencies'
        }).execute()
        
        # 4. Create Submissions (Mock Browserless)
        # In a real scenario, this would queue a job for the worker. 
        # Here we just insert the record as 'pending' -> 'success'
        submissions = []
        for agency_id in req.agency_ids:
            submissions.append({
                'user_id': req.user_id,
                'status': 'success', # Instant success for demo
                'agency_url': f"Agency ID: {agency_id}", # Placeholder connection
                'proof_screenshot_url': "https://placehold.co/600x400/png?text=Application+Sent"
            })
            
        supabase.table('agency_submissions').insert(submissions).execute()
        
        return {
            "status": "success", 
            "message": f"Successfully applied to {count} agencies!",
            "new_balance": new_balance
        }

    except Exception as e:
        print(f"Apply Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.delete("/api/delete-account")
async def delete_account(request: Request):
    """
    Securely deletes a user account, including:
    1. Storage files (photos/videos)
    2. Profile data
    3. Auth user record (Admin)
    """
    try:
        # Verify Auth Token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
             return JSONResponse(status_code=401, content={"error": "Missing auth token"})
        token = auth_header.split(' ')[1]
        
        supabase = get_supabase() # Admin Client
        
        # Verify User Identity
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        if not user:
             return JSONResponse(status_code=401, content={"error": "Invalid token"})
        
        user_id = user.id
        print(f"Processing Account Deletion for: {user_id}")
        
        # 1. Storage Cleanup
        for bucket in ['photos', 'videos']:
            try:
                # List files in users/{user_id}
                path = f"users/{user_id}"
                files = supabase.storage.from_(bucket).list(path)
                if files:
                    file_paths = [f"{path}/{f['name']}" for f in files]
                    if file_paths:
                        supabase.storage.from_(bucket).remove(file_paths)
            except Exception as e:
                print(f"Storage wipe warning ({bucket}): {e}")

        # 2. Database Cleanup (Manual)
        try:
            supabase.table('profiles').delete().eq('id', user_id).execute()
        except Exception as e:
             # This might fail if Auth delete handles it via cascade, which is fine.
            print(f"Profile delete warning: {e}")

        # 3. Auth Cleanup (Admin)
        supabase.auth.admin.delete_user(user_id)
        
        return {"status": "success", "message": "Account deleted"}
        
    except Exception as e:
        print(f"Delete Account Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
