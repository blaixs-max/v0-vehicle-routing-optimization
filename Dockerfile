FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-railway.txt .
RUN pip install --no-cache-dir -r requirements-railway.txt

# Copy Python backend files - v2 optimizer (optimized version)
# Force rebuild: 2026-01-16 to clear Docker cache
COPY railway/main.py main.py
COPY railway/ortools_optimizer.py ortools_optimizer.py
COPY railway/ortools_optimizer_v2.py ortools_optimizer_v2.py
COPY railway/job_queue.py job_queue.py

# Expose port
EXPOSE 8080

# Health check (Railway will handle health monitoring via /health endpoint)

# Start server with production settings
CMD ["python", "-c", "import os; import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), workers=1, log_level='info')"]
