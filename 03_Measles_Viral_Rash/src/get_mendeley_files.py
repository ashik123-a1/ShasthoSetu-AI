import urllib.request
import json
import re

url = "https://data.mendeley.com/api/datasets/dfztdtfsxz/1"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req) as resp:
        content = resp.read().decode("utf-8")
        data = json.loads(content)
        print("API response keys:", list(data.keys()))
        print("Files in API:", data.get("files"))
except Exception as e:
    print("API error:", e)

# Now check HTML page for file IDs
url_html = "https://data.mendeley.com/datasets/dfztdtfsxz/1"
req_html = urllib.request.Request(url_html, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req_html) as resp:
    html = resp.read().decode("utf-8", errors="ignore")

# Look for file UUIDs in the HTML
matches = re.findall(r'"files":\[(.*?)\]', html)
print(f"Matches for files array: {len(matches)}")
for m in matches[:5]:
    if len(m) > 0:
        print("Files snippet:", m[:300])

# Look for direct download URLs
down_urls = re.findall(r'https://[^"]+download[^"]*', html)
print("Download URLs found:", down_urls)
