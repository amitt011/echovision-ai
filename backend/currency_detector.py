import cv2
import numpy as np

class CurrencyDetector:
    def __init__(self):
        self.denominations = {
            '10': {'color_range': ([0,50,50], [10,255,255]), 'min_area': 5000},
            '20': {'color_range': ([5,100,100], [15,255,255]), 'min_area': 5000},
            '50': {'color_range': ([20,100,100], [30,255,255]), 'min_area': 5000},
            '100': {'color_range': ([100,100,100], [130,255,255]), 'min_area': 5000},
            '200': {'color_range': ([25,100,100], [35,255,255]), 'min_area': 5000},
            '500': {'color_range': ([40,50,50], [80,255,255]), 'min_area': 5000}
        }

    def detect(self, frame):
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        for value, spec in self.denominations.items():
            lower, upper = spec['color_range']
            mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area > spec['min_area']:
                    return {'value': value, 'confidence': 0.8}
        return None