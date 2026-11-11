# Use Python 3.11 to ensure modern ONNX Runtime wheels are available.
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Avoid Ultralytics warning about non-writable default config path in containers.
ENV YOLO_CONFIG_DIR=/tmp/Ultralytics

# Install system dependencies required for OpenCV (glib, etc.)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /tmp/Ultralytics

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
# Note: We use the CPU version of PyTorch to keep image size small for free tiers
# If you need GPU, you'd use a different base image or install cuda versions
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create a directory for uploads if it doesn't exist
RUN mkdir -p uploads

# Expose port 7860 (Hugging Face Spaces default)
EXPOSE 7860

# Command to run the application
# Hugging Face expects the app to run on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
