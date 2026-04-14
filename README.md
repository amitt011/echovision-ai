# EchoVision AI - Visual Assistant for Visually Impaired

## Overview
EchoVision AI is a real-time object detection system designed to assist visually impaired individuals. It uses computer vision and voice feedback to describe the environment.

## Features
- Real-time object detection (80+ objects)
- Distance and direction estimation
- Voice command recognition
- Text-to-speech announcements
- Face recognition
- Currency detection
- OCR text reading
- Emergency alert system
- Location services

## Tech Stack
- **Backend**: FastAPI, Python, YOLOv8
- **Frontend**: HTML5, CSS3, JavaScript
- **AI/ML**: Ultralytics YOLO, TensorFlow.js
- **Voice**: Web Speech API

## Installation

### Prerequisites
- Python 3.8+
- Node.js (optional)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
python app.py