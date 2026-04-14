import cv2
import numpy as np
import torch
from ultralytics import YOLO

# ----- PATCH: allow loading YOLO weights (must be BEFORE YOLO import) -----
_original_torch_load = torch.load
def _safe_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _safe_load
# -------------------------------------------------------------------------

class ObjectDetector:
    def __init__(self, model_path='yolov8n.pt'):
        self.model = YOLO(model_path)
        self.classes = self.model.names
        self.focal_length_px = 500

    def estimate_distance(self, bbox_height_px, frame_height):
        if bbox_height_px <= 0:
            return 10.0
        ratio = bbox_height_px / frame_height
        distance = 3.0 * (0.5 / max(0.05, ratio))
        return min(10.0, max(0.3, distance))

    def get_direction(self, bbox, frame_width):
        x1, _, x2, _ = bbox
        center = (x1 + x2) / 2
        frame_center = frame_width / 2
        threshold = frame_width * 0.25
        if center < frame_center - threshold:
            return 'left'
        elif center > frame_center + threshold:
            return 'right'
        return 'center'

    def detect(self, frame):
        results = self.model(frame, conf=0.5, verbose=False)
        detections = []
        for r in results:
            boxes = r.boxes
            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    name = self.classes[cls]
                    height = y2 - y1
                    distance = self.estimate_distance(height, frame.shape[0])
                    direction = self.get_direction((x1, y1, x2, y2), frame.shape[1])
                    detections.append({
                        'name': name,
                        'bbox': [x1, y1, x2, y2],
                        'confidence': conf,
                        'distance': round(distance, 1),
                        'direction': direction
                    })
        return detections