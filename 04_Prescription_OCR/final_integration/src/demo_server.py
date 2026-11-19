import os
import sys
import json
import http.server
import socketserver
import urllib.parse

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEMO_DIR = os.path.join(BASE_DIR, "final_integration", "demo")
IMAGES_DIR = os.path.join(BASE_DIR, "data", "raw", "extracted", "images", "Prescription_ images.jpg")

PORT = 8080

class PrescriptionDemoHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Route /images/<filename> to actual raw images directory
        parsed = urllib.parse.urlparse(path)
        clean_path = parsed.path
        
        if clean_path.startswith("/images/"):
            img_name = clean_path[len("/images/"):]
            return os.path.join(IMAGES_DIR, img_name)
            
        # Route root or static files to demo directory
        if clean_path == "/" or clean_path == "":
            return os.path.join(DEMO_DIR, "index.html")
            
        # Default to demo static files
        req_file = clean_path.lstrip("/")
        candidate = os.path.join(DEMO_DIR, req_file)
        if os.path.exists(candidate):
            return candidate
            
        return super().translate_path(path)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local research demo
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

def run_server(port=PORT):
    print("=" * 60)
    print("ShasthoSetu AI — Prescription OCR & Safe Human Verification Portal")
    print(f"Local Research Demo running on: http://localhost:{port}")
    print(f"Serving Static UI from: {DEMO_DIR}")
    print(f"Serving Images from:    {IMAGES_DIR}")
    print("Mandatory Safety Gate:  ENABLED (reminder_auto_enabled = false)")
    print("=" * 60)
    
    with socketserver.TCPServer(("", port), PrescriptionDemoHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down demo server.")

if __name__ == "__main__":
    p = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(p)
