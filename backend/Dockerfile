FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Generate Prisma Client
RUN prisma generate

# Expose the API port
EXPOSE 5000

# Start with Gunicorn (modular app)
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:5000"]
