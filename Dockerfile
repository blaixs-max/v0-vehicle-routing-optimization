FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python bağımlılıkları
COPY requirements-railway.txt .
RUN pip install --no-cache-dir -r requirements-railway.txt

# Uygulama dosyaları
COPY railway/main.py railway/
COPY railway/ortools_optimizer.py railway/
COPY railway_server.py .

# Port
EXPOSE 8080

CMD ["python", "railway_server.py"]
