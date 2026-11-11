import os
from pathlib import Path
from ultralytics import YOLO
import json
import csv

# Define model paths
models_info = {
    "classifier": {
        "weights": Path("models/xray_type_classifier/weights/best.pt"),
        "results_csv": Path("models/xray_type_classifier/results.csv"),
        "data": None,  # No yaml found
        "task": "classify"
    },
    "OPG": {
        "weights": Path("models/opg/best.pt"),
        "results_csv": None,  # No results.csv
        "data": Path("models/opg/dental_opg_dataset.yaml"),
        "task": "detect"
    },
    "Periapical": {
        "weights": Path("models/periapical/best.pt"),
        "results_csv": None,
        "data": None,  # No yaml
        "task": "detect"
    }
}

def parse_results_csv(csv_path):
    if not csv_path.exists():
        return None
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    if not rows:
        return None
    # Get the last row (best epoch)
    last_row = rows[-1]
    metrics = {}
    for key, value in last_row.items():
        if key.startswith('metrics/') or key == 'val/loss':
            try:
                metrics[key] = float(value)
            except ValueError:
                metrics[key] = value
    return metrics

def compute_metrics():
    results = {}
    for name, info in models_info.items():
        if not info["weights"].exists():
            results[name] = {"task": info["task"], "error": "Model weights not found"}
            continue
        
        model = YOLO(str(info["weights"]))
        model_info = {
            "task": info["task"],
            "model_summary": str(model.info()),  # Model summary
        }
        
        # Try to get metrics from results.csv if available
        if info["results_csv"]:
            csv_metrics = parse_results_csv(info["results_csv"])
            if csv_metrics:
                model_info["training_metrics"] = csv_metrics
        
        # Try validation if data available
        if info["data"] and info["data"].exists():
            try:
                metrics = model.val(data=str(info["data"]), split="val")
                model_info["validation_metrics"] = metrics.results_dict if hasattr(metrics, 'results_dict') else str(metrics)
            except Exception as e:
                model_info["validation_error"] = str(e)
        else:
            model_info["validation_note"] = "No dataset available for validation"
        
        results[name] = model_info
    
    return results

if __name__ == "__main__":
    metrics = compute_metrics()
    print(json.dumps(metrics, indent=2))