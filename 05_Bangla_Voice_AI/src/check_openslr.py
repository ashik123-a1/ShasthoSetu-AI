import urllib.request
import re

url = "https://www.openslr.org/53/"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp:
    html = resp.read().decode("utf-8")

links = re.findall(r'href="([^"]+)"', html)
zip_links = [l for l in links if l.endswith(".zip") or l.endswith(".tgz") or l.endswith(".tar.gz") or "asr" in l]
print("OpenSLR 53 files found:")
for l in zip_links[:15]:
    print(" ", l)
