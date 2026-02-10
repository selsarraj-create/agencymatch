FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# Copy requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install-deps

# Copy application code (Only the backend folder)
COPY backend/ ./backend/

# Set working directory to backend so uvicorn finds code easily
WORKDIR /app/backend

# Expose port (Documentation purposes, actual port binding is via CMD)
EXPOSE 8000

# Start the application
# Use the $PORT environment variable provided by Railway, defaulting to 8000
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
