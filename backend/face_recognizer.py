import face_recognition
import os
import cv2

class FaceRecognizer:
    def __init__(self, known_faces_dir='known_faces'):
        self.known_encodings = []
        self.known_names = []
        self.load_known_faces(known_faces_dir)

    def load_known_faces(self, dir_path):
        if not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)
            return
        for filename in os.listdir(dir_path):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                name = os.path.splitext(filename)[0]
                img_path = os.path.join(dir_path, filename)
                image = face_recognition.load_image_file(img_path)
                encodings = face_recognition.face_encodings(image)
                if encodings:
                    self.known_encodings.append(encodings[0])
                    self.known_names.append(name)

    def recognize(self, frame):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb)
        face_encodings = face_recognition.face_encodings(rgb, face_locations)
        results = []
        for encoding, location in zip(face_encodings, face_locations):
            matches = face_recognition.compare_faces(self.known_encodings, encoding)
            name = "Unknown"
            if True in matches:
                idx = matches.index(True)
                name = self.known_names[idx]
            results.append({
                'name': name,
                'location': location,
                'known': name != "Unknown"
            })
        return results