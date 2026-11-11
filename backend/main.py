from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import random
import uuid
import shutil
import os
from pathlib import Path

# Force load ONNX native dependencies before YOLO initializes (optional for GPU inference)
try:
    import onnx
    import onnxruntime
except ImportError:
    print("ONNX not installed - inference disabled. Install with: pip install onnx onnxruntime")

# Load .env from working dir and from the backend directory to handle different launch cwd
try:
    from dotenv import load_dotenv

    backend_env = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=backend_env)
    # also try current cwd for local runs
    load_dotenv(dotenv_path=Path(".env"))
except ImportError:
    # If python-dotenv isn't installed, skip silently.
    pass

try:
    from backend.report_generator import DentalReportGenerator
except ImportError:  # support running from the backend directory
    from report_generator import DentalReportGenerator
try:
    from ultralytics import YOLO
    import cv2
    import numpy as np
except ImportError:
    print("Ultralytics or OpenCV not installed. Running in mock mode.")
    YOLO = None

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get the directory where this script is located
BACKEND_DIR = Path(__file__).resolve().parent

# Ensure upload directory exists
# Images are saved here and served via FastAPI's static files
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Mount the uploads directory as static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# --- MODEL INITIALIZATION ---
MODELS_DIR = BACKEND_DIR / "models"
# Classifiers use .pt for reliable softmax probability calibration
BINARY_CLASSIFIER_WEIGHTS = MODELS_DIR / "xray_binary_classifier" / "best.pt"
TYPE_CLASSIFIER_WEIGHTS    = MODELS_DIR / "xray_type_classifier"  / "best.pt"

OPG_DISEASE_WEIGHTS = MODELS_DIR / "opg" / "disease.onnx"
OPG_TEETH_WEIGHTS = MODELS_DIR / "opg" / "teeth.onnx"

PERIAPICAL_DISEASE_WEIGHTS = MODELS_DIR / "periapical" / "disease.onnx"
PERIAPICAL_TEETH_WEIGHTS = MODELS_DIR / "periapical" / "teeth.onnx"
PERIAPICAL_LABEL_MAP = MODELS_DIR / "periapical" / "label_map.json"

BITEWING_DISEASE_WEIGHTS = MODELS_DIR / "bitewing" / "disease.onnx"
BITEWING_TEETH_WEIGHTS = MODELS_DIR / "bitewing" / "teeth.onnx"

MOBILE_SAM_WEIGHTS = MODELS_DIR / "shared" / "mobile_sam.pt"

models = {
    "binary_classifier": None,
    "classifier": None,
    "OPG": {"disease": None, "teeth": None},
    "Periapical": {"disease": None, "teeth": None, "labels": None},
    "Bitewing": {"disease": None, "teeth": None},
    "shared": {"mobile_sam": None}
}

def _parse_timeout(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    try:
        parsed = int(value)
        return parsed
    except ValueError:
        return None


generator = DentalReportGenerator(
    model_name=os.getenv("GROQ_MODEL", "moonshotai/kimi-k2-instruct-0905"),
    timeout_s=int(os.getenv("GROQ_TIMEOUT_S", "30")),
)

def _load_label_map(label_path: Path) -> Optional[Dict[int, str]]:
    if not label_path.exists():
        return None
    try:
        import json

        with label_path.open("r", encoding="utf-8") as fp:
            raw = json.load(fp)
        # label_map.json is expected as {"class_name": index}
        return {int(idx): name for name, idx in raw.items()}
    except Exception as exc:
        print(f"Failed to load label map {label_path}: {exc}")
        return None


def load_models():
    """Attempts to load YOLO models if weights exist."""
    if not YOLO:
        return

    # 0. Binary Classifier
    if BINARY_CLASSIFIER_WEIGHTS.exists():
        print(f"Loading Binary Classifier from {BINARY_CLASSIFIER_WEIGHTS}...")
        try: models["binary_classifier"] = YOLO(BINARY_CLASSIFIER_WEIGHTS, task='classify')
        except Exception as exc: print(f"Failed to load Binary Classifier: {exc}")

    # 1. Type Classifier
    if TYPE_CLASSIFIER_WEIGHTS.exists():
        print(f"Loading Type Classifier from {TYPE_CLASSIFIER_WEIGHTS}...")
        try: models["classifier"] = YOLO(TYPE_CLASSIFIER_WEIGHTS, task='classify')
        except Exception as exc: print(f"Failed to load Type Classifier: {exc}")
    
    # 2. OPG
    if OPG_DISEASE_WEIGHTS.exists():
        try: models["OPG"]["disease"] = YOLO(OPG_DISEASE_WEIGHTS, task='detect')
        except Exception as exc: print(f"Failed OPG disease: {exc}")
    if OPG_TEETH_WEIGHTS.exists():
        try: models["OPG"]["teeth"] = YOLO(OPG_TEETH_WEIGHTS, task='detect')
        except Exception as exc: print(f"Failed OPG teeth: {exc}")

    # 3. Periapical
    if PERIAPICAL_DISEASE_WEIGHTS.exists():
        try: models["Periapical"]["disease"] = YOLO(PERIAPICAL_DISEASE_WEIGHTS, task='segment')
        except Exception as exc: print(f"Failed Periapical disease: {exc}")
    if PERIAPICAL_TEETH_WEIGHTS.exists():
        try: models["Periapical"]["teeth"] = YOLO(PERIAPICAL_TEETH_WEIGHTS, task='detect')
        except Exception as exc: print(f"Failed Periapical teeth: {exc}")
    
    models["Periapical"]["labels"] = _load_label_map(PERIAPICAL_LABEL_MAP)

    # 4. Bitewing
    if BITEWING_DISEASE_WEIGHTS.exists():
        try: models["Bitewing"]["disease"] = YOLO(BITEWING_DISEASE_WEIGHTS, task='detect')
        except Exception as exc: print(f"Failed Bitewing disease: {exc}")
    if BITEWING_TEETH_WEIGHTS.exists():
        try: models["Bitewing"]["teeth"] = YOLO(BITEWING_TEETH_WEIGHTS, task='segment')
        except Exception as exc: print(f"Failed Bitewing teeth: {exc}")

# Load models on startup
load_models()

class BoundingBox(BaseModel):
    id: str
    label: str
    confidence: float
    x: float
    y: float
    width: float
    height: float
    color: str
    mask: Optional[List[List[float]]] = None  # SAM/seg polygon [[x,y], ...]

class AnalysisResult(BaseModel):
    imageId: str
    imageUrl: str
    type: str
    issues: List[BoundingBox]


class ClinicalData(BaseModel):
    chief_complaint: Optional[str] = None
    manual_diagnoses: Optional[List[str]] = None
    procedures_done: Optional[List[str]] = None
    prescription: Optional[str] = None
    follow_up: Optional[str] = None
    clinical_notes: Optional[str] = None
    measurements: Optional[List[Dict[str, Any]]] = None  # [{id, lengthMm, ...}]


class ReportRequest(BaseModel):
    patient_name: str
    clinical_data: Optional[ClinicalData] = None
    detections: Optional[List[Dict[str, Any]]] = None
    measurements: Optional[List[Dict[str, Any]]] = None  # Measurements from the UI

def process_yolo_results(results, label_map: Optional[Dict[int, str]] = None, is_disease=True) -> List[BoundingBox]:
    """Converts YOLO results (detection or segmentation) to our BoundingBox format."""
    boxes = []
    
    color_map = {
        "Caries": "#ef4444",
        "Restoration": "#3b82f6",
        "Root Canal Treatment": "#eab308",
        "Impacted": "#a855f7"
    }
    
    for r in results:
        # extract masks if available (segmentation models)
        masks_xy = None
        if hasattr(r, 'masks') and r.masks is not None:
            try:
                masks_xy = r.masks.xy  # list of (N,2) numpy arrays, already in image pixel coords
            except Exception:
                masks_xy = None

        for idx, box in enumerate(r.boxes):
            x, y, w, h = box.xywh[0].tolist()
            x = x - (w / 2)
            y = y - (h / 2)
            
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            label = label_map.get(cls) if label_map else r.names[cls]
            
            color = color_map.get(label, "#10b981") if is_disease else "#0ea5e9"

            # Extract polygon mask if this box has a corresponding mask
            mask_polygon = None
            if masks_xy is not None and idx < len(masks_xy):
                pts = masks_xy[idx]
                if len(pts) > 0:
                    mask_polygon = pts.tolist()  # [[x, y], ...]

            boxes.append(BoundingBox(
                id=str(uuid.uuid4()),
                label=f"Tooth {label}" if not is_disease and str(label).isdigit() else label,
                confidence=conf,
                x=x, y=y, width=w, height=h,
                color=color,
                mask=mask_polygon
            ))
    return boxes

# --- ANALYSIS FUNCTIONS ---

def validate_dental_xray(image_path: str) -> bool:
    """Model 0: Validates if the image is a dental X-ray. Returns True if valid."""
    if not models["binary_classifier"]:
        # If binary classifier not loaded, skip validation and proceed
        print("Binary classifier not loaded, skipping validation...")
        return True

    results = models["binary_classifier"](image_path)
    if results and results[0].probs:
        top_class_index = results[0].probs.top1
        class_name = results[0].names[top_class_index].lower()
        confidence = float(results[0].probs.top1conf)
        
        print(f"Binary classification: {class_name} (confidence: {confidence:.2f})")
        
        # Check if classified as dental X-ray
        # Accept variations like "dental_xray", "dental", "xray", "dental-xray"
        dental_keywords = ["dental", "xray", "x-ray", "x_ray"]
        is_dental = any(kw in class_name for kw in dental_keywords) and "non" not in class_name
        
        return is_dental
    
    # If no probabilities returned, skip validation
    return True


def classify_image(image_path: str) -> str:
    """Model 1: Classifies the image type. Fails fast if classifier not loaded."""
    if not models["classifier"]:
        raise HTTPException(status_code=500, detail="Classifier model not loaded. Ensure weights/yolov8n-cls.pt exists.")

    results = models["classifier"](image_path)
    if results and results[0].probs:
        top_class_index = results[0].probs.top1
        class_name = results[0].names[top_class_index]

        # Safety: enforce only known dental X-ray classes
        allowed = {"OPG", "Periapical", "Bitewing"}
        if class_name not in allowed:
            # Fallback for screen-captures: find the highest allowed class
            best_class = None
            best_prob = -1
            for i, name in results[0].names.items():
                if name in allowed:
                    prob = float(results[0].probs.data[i])
                    if prob > best_prob:
                        best_prob = prob
                        best_class = name
            
            if best_class:
                print(f"Warning: Primary class was {class_name}. Falling back to highest allowed class: {best_class}")
                return best_class
                
            raise HTTPException(
                status_code=400,
                detail="The uploaded image does not appear to be a valid dental X-ray. Please upload an OPG, Periapical, or Bitewing X-ray."
            )

        print(f"Classified as: {class_name}")
        return class_name

    raise HTTPException(status_code=500, detail="Classifier returned no probabilities.")

def compute_iou(boxA, boxB):
    """Computes Intersection over Union of two bounding boxes (x, y, w, h)."""
    xA = max(boxA.x, boxB.x)
    yA = max(boxA.y, boxB.y)
    xB = min(boxA.x + boxA.width, boxB.x + boxB.width)
    yB = min(boxA.y + boxA.height, boxB.y + boxB.height)

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = boxA.width * boxA.height
    boxBArea = boxB.width * boxB.height
    iou = interArea / float(boxAArea + boxBArea - interArea) if (boxAArea + boxBArea - interArea) > 0 else 0
    return iou

def detect_issues(image_path: str, image_type: str) -> List[BoundingBox]:
    """Routes to the specific models (disease + teeth) based on type and correlates them."""
    if image_type not in models:
        return []
        
    group = models[image_type]
    disease_model = group.get("disease")
    teeth_model = group.get("teeth")
    label_map = group.get("labels")
    
    disease_boxes = []
    teeth_boxes = []
    
    # 1. Run Disease Model
    if disease_model:
        results = disease_model(image_path)
        disease_boxes = process_yolo_results(results, label_map=label_map, is_disease=True)
        
    # 2. Run Teeth Numbering Model (used for numbering correlation only)
    if teeth_model:
        results = teeth_model(image_path)
        teeth_boxes = process_yolo_results(results, is_disease=False)
        print(f"[{image_type}] Teeth model returned {len(teeth_boxes)} boxes: {[t.label for t in teeth_boxes]}")
        
    # 3. Filter out "normal" / "healthy" / "tooth" disease labels (model sometimes predicts healthy regions)
    SKIP_KEYWORDS = {"normal", "healthy", "no finding", "no pathology"}
    disease_boxes = [
        d for d in disease_boxes
        if not any(kw in d.label.lower() for kw in SKIP_KEYWORDS)
    ]

    # 4. Aggressive NMS — merge overlapping/contained/nearby boxes with SAME base label
    def should_suppress(box, selected_box):
        """Returns True if 'box' should be suppressed in favour of 'selected_box'."""
        # a. Standard IoU check
        iou = compute_iou(box, selected_box)
        if iou > 0.3:
            return True

        # b. Containment check — if the smaller box is mostly inside the larger one
        xA = max(box.x, selected_box.x)
        yA = max(box.y, selected_box.y)
        xB = min(box.x + box.width, selected_box.x + selected_box.width)
        yB = min(box.y + box.height, selected_box.y + selected_box.height)
        inter = max(0, xB - xA) * max(0, yB - yA)
        smaller_area = min(box.width * box.height, selected_box.width * selected_box.height)
        if smaller_area > 0 and inter / smaller_area > 0.5:
            return True

        # c. Center proximity — if centers are very close (within 30% of avg box size)
        cx1 = box.x + box.width / 2
        cy1 = box.y + box.height / 2
        cx2 = selected_box.x + selected_box.width / 2
        cy2 = selected_box.y + selected_box.height / 2
        avg_size = (box.width + box.height + selected_box.width + selected_box.height) / 4
        dist = ((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2) ** 0.5
        if avg_size > 0 and dist < avg_size * 0.5:
            return True

        return False

    def nms_aggressive(boxes: List[BoundingBox]) -> List[BoundingBox]:
        if not boxes:
            return boxes
        from collections import defaultdict
        groups = defaultdict(list)
        for b in boxes:
            groups[b.label.lower()].append(b)
        kept = []
        for _, group_boxes in groups.items():
            group_boxes.sort(key=lambda b: b.width * b.height, reverse=True)  # prefer larger boxes
            selected = []
            for box in group_boxes:
                if not any(should_suppress(box, sel) for sel in selected):
                    selected.append(box)
            kept.extend(selected)
        return kept

    disease_boxes = nms_aggressive(disease_boxes)
        
    # 5. Correlate diseases to specific teeth via IoU coverage
    for d_box in disease_boxes:
        best_tooth = None
        best_iou = 0.0
        
        for t_box in teeth_boxes:
            iou = compute_iou(d_box, t_box)
            if iou > best_iou:
                best_iou = iou
                best_tooth = t_box.label.replace("Tooth ", "").strip()
                
        # If there's meaningful overlap, annotate the disease with the tooth number
        if best_tooth and best_iou > 0.01:
            d_box.label = f"{d_box.label} (Tooth {best_tooth})"
        elif teeth_boxes:
            # Fallback: find nearest tooth by center distance
            d_cx = d_box.x + d_box.width / 2
            d_cy = d_box.y + d_box.height / 2
            nearest = None
            nearest_dist = float('inf')
            for t_box in teeth_boxes:
                t_cx = t_box.x + t_box.width / 2
                t_cy = t_box.y + t_box.height / 2
                dist = ((d_cx - t_cx) ** 2 + (d_cy - t_cy) ** 2) ** 0.5
                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest = t_box.label.replace("Tooth ", "").strip()
            if nearest:
                d_box.label = f"{d_box.label} (Tooth {nearest})"

    # 6. Deduplicate by label+tooth — keep only best (largest area) per unique label
    seen_labels: Dict[str, BoundingBox] = {}
    for d in disease_boxes:
        key = d.label.lower()
        if key not in seen_labels or (d.width * d.height) > (seen_labels[key].width * seen_labels[key].height):
            seen_labels[key] = d
    disease_boxes = list(seen_labels.values())
            
    # Return diseases only. Only fall back to showing tooth boxes if there are zero diseases detected.
    if disease_boxes:
        return disease_boxes
    
    # Fallback: no disease found — do NOT show healthy tooth boxes at all, just return empty.
    return []


@app.post("/generate-report")
async def generate_report(payload: ReportRequest):
    try:
        clinical = payload.clinical_data.dict(exclude_none=True) if payload.clinical_data else {}
        detections = payload.detections or []
        measurements = payload.measurements or []
        
        # Add measurements to clinical data for the report generator
        if measurements:
            clinical["measurements"] = measurements
        
        
        report = generator.generate_report(detections, payload.patient_name, clinical)
        return {"report": report}
    except Exception as exc:
        print(f"Report generation failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


class TranslateRequest(BaseModel):
    prompt: str


@app.post("/translate")
async def translate_text(payload: TranslateRequest):
    """Uses Groq Kimi K2 to translate clinical report text."""
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not set")
        
        from groq import Groq
        client = Groq(api_key=api_key)
        
        completion = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "moonshotai/kimi-k2-instruct-0905"),
            messages=[
                {"role": "system", "content": "You are a medical translator. Translate exactly as requested. Keep medical/dental terminology intact. Output ONLY the translated text."},
                {"role": "user", "content": payload.prompt},
            ],
            temperature=0.3,
            max_completion_tokens=4096,
        )
        
        translated = completion.choices[0].message.content or ""
        return {"translated": translated.strip()}
    except Exception as exc:
        print(f"Translation failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/analyze", response_model=AnalysisResult)
async def analyze_xray(request: Request, file: UploadFile = File(...)):
    try:
        # Save the file
        file_id = str(uuid.uuid4())
        extension = file.filename.split(".")[-1]
        filename = f"{file_id}.{extension}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Full URL path for frontend (served by FastAPI static files)
        image_url = str(request.url_for("uploads", path=filename))
        
        # Step 0: Validate if it's a dental X-ray
        if not validate_dental_xray(str(file_path)):
            # Clean up the uploaded file
            file_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400, 
                detail="Invalid image: The uploaded image does not appear to be a dental X-ray. Please upload a valid dental X-ray image (OPG, Periapical, or Bitewing)."
            )
        
        # Step 1: Classification
        image_type = classify_image(str(file_path))
        
        # Ensure type matches our expected keys (normalize if needed)
        # For now assuming model returns exact strings "OPG", "Periapical", "Bitewing"
        
        # Step 2: Specific Detection
        issues = detect_issues(str(file_path), image_type)
            
        return AnalysisResult(
            imageId=file_id,
            imageUrl=image_url,
            type=image_type,
            issues=issues
        )
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "OrthoAI Backend is running", "models_loaded": {k: v is not None for k, v in models.items()}}
