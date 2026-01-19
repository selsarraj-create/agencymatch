from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI()

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

def get_db_connection():
    """Get database connection - uses Postgres on Vercel, SQLite locally"""
    postgres_url = os.getenv('POSTGRES_URL')
    
    if postgres_url:
        # Production: Use Vercel Postgres
        return psycopg2.connect(postgres_url, cursor_factory=RealDictCursor)
    else:
        # Local development: fallback to SQLite
        import sqlite3
        import sys
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
        import database
        database.init_db()
        return None  # Will use existing SQLite functions

def init_postgres_db():
    """Initialize Postgres database schema"""
    postgres_url = os.getenv('POSTGRES_URL')
    if not postgres_url:
        return
    
    conn = psycopg2.connect(postgres_url)
    cur = conn.cursor()
    
    cur.execute('''
        CREATE TABLE IF NOT EXISTS leads (
            id SERIAL PRIMARY KEY,
            first_name TEXT,
            last_name TEXT,
            age INTEGER,
            gender TEXT,
            email TEXT,
            phone TEXT,
            city TEXT,
            zip_code TEXT,
            wants_assessment BOOLEAN,
            score INTEGER,
            category TEXT,
            analysis_json TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    cur.close()
    conn.close()

def save_lead_postgres(lead: Lead):
    """Save lead to Postgres database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Extract score and category from analysis_data
    score = lead.analysis_data.get('suitability_score', 0)
    market_data = lead.analysis_data.get('market_categorization', {})
    if isinstance(market_data, dict):
        category = market_data.get('primary', 'Unknown')
    else:
        category = str(market_data)
    
    cur.execute('''
        INSERT INTO leads (first_name, last_name, age, gender, email, phone, city, zip_code, wants_assessment, score, category, analysis_json)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    ''', (
        lead.first_name,
        lead.last_name,
        lead.age,
        lead.gender,
        lead.email,
        lead.phone,
        lead.city,
        lead.zip_code,
        lead.wants_assessment,
        score,
        category,
        json.dumps(lead.analysis_data)
    ))
    
    lead_id = cur.fetchone()['id']
    conn.commit()
    cur.close()
    conn.close()
    
    return lead_id

@app.post("/api/lead")
def submit_lead(lead: Lead):
    """
    Serverless function for lead submission
    """
    try:
        # Initialize DB if needed
        if os.getenv('POSTGRES_URL'):
            init_postgres_db()
            lead_id = save_lead_postgres(lead)
        else:
            # Local development - use existing SQLite
            import sys
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
            import database
            lead_id = database.save_lead(lead)
        
        # Mock email sending
        print(f"Sending email to {lead.email} with report...")
        
        return JSONResponse(content={
            "status": "success",
            "lead_id": lead_id,
            "message": "Lead saved and report sent (mocked)."
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Vercel serverless handler
def handler(request):
    return app(request)
