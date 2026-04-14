class GeoFencing:
    def __init__(self):
        self.safe_zones = [
            {'name': 'Home', 'lat': 28.6139, 'lon': 77.2090, 'radius': 100},
            {'name': 'Office', 'lat': 28.6145, 'lon': 77.2100, 'radius': 200}
        ]
        self.current_location = {'lat': 28.6139, 'lon': 77.2090}

    def update_location(self, lat, lon):
        self.current_location = {'lat': lat, 'lon': lon}

    def is_in_safe_zone(self):
        for zone in self.safe_zones:
            dist = ((self.current_location['lat'] - zone['lat'])**2 + (self.current_location['lon'] - zone['lon'])**2)**0.5 * 111000
            if dist < zone['radius']:
                return True, zone['name']
        return False, None