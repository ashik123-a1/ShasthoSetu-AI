import threading
import urllib.request
import time
from http.server import HTTPServer
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))
from demo_server import PrescriptionDemoHandler

def test_server():
    server = HTTPServer(("127.0.0.1", 8899), PrescriptionDemoHandler)
    t = threading.Thread(target=server.serve_forever)
    t.daemon = True
    t.start()
    
    time.sleep(0.5)
    try:
        # Test index.html
        resp = urllib.request.urlopen("http://127.0.0.1:8899/")
        html = resp.read().decode("utf-8")
        assert "ShasthoSetu AI" in html
        print(f"Index HTML verified: Status {resp.status}, length {len(html)}")
        
        # Test styles.css
        resp_css = urllib.request.urlopen("http://127.0.0.1:8899/styles.css")
        css = resp_css.read().decode("utf-8")
        assert "--primary" in css
        print(f"Styles CSS verified: Status {resp_css.status}")
        
        # Test app.js
        resp_js = urllib.request.urlopen("http://127.0.0.1:8899/app.js")
        js = resp_js.read().decode("utf-8")
        assert "SAMPLES" in js
        print(f"App JS verified: Status {resp_js.status}")
        
        # Test image serving /images/0052.jpg
        resp_img = urllib.request.urlopen("http://127.0.0.1:8899/images/0052.jpg")
        img_bytes = resp_img.read()
        print(f"Prescription Image verified: Status {resp_img.status}, {len(img_bytes)} bytes")
        
        print("\nALL DEMO SERVER ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!")
    finally:
        server.shutdown()
        server.server_close()

if __name__ == "__main__":
    test_server()
