import cv2
import base64
import json
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from detector import ObjectDetector

app = FastAPI()

# Serve static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Initialize detector
detector = ObjectDetector()
print("Object Detector loaded")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                
                if msg.get('type') == 'frame':
                    img_data = base64.b64decode(msg['data'].split(',')[1])
                    nparr = np.frombuffer(img_data, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    
                    detections = detector.detect(frame)
                    
                    alerts = []
                    for obj in detections:
                        if obj['distance'] < 3.0:
                            alerts.append(f"{obj['name']}, {obj['distance']} meters, {obj['direction']}")
                    
                    response = {
                        'type': 'detection',
                        'objects': detections,
                        'alerts': alerts
                    }
                    
                    await websocket.send_json(response)
                    
                elif msg.get('type') == 'command':
                    command = msg.get('command', '').lower()
                    print(f"Command: {command}")
                    
                    if 'help' in command:
                        await websocket.send_json({'type': 'help', 'message': 'Commands: navigation, face search, currency, read text, emergency, where am i, mute, unmute'})
                    elif 'emergency' in command:
                        await websocket.send_json({'type': 'emergency', 'message': 'Emergency alert sent to guardians'})
                    elif 'where' in command:
                        await websocket.send_json({'type': 'location', 'message': 'Location: Getting current position'})
                    elif 'navigation' in command:
                        await websocket.send_json({'type': 'mode_change', 'message': 'Navigation mode activated'})
                    elif 'face' in command:
                        await websocket.send_json({'type': 'mode_change', 'message': 'Face search mode activated'})
                    elif 'currency' in command:
                        await websocket.send_json({'type': 'mode_change', 'message': 'Currency mode activated'})
                    elif 'read' in command:
                        await websocket.send_json({'type': 'mode_change', 'message': 'Text reading mode activated'})
                        
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        print("Client disconnected")

@app.get("/")
async def get():
    with open("../frontend/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)