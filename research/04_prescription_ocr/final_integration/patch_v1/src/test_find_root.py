import os

cur = os.path.abspath(os.path.dirname(__file__))
while cur and os.path.splitdrive(cur)[1] not in ["", "\\", "/"]:
    if os.path.exists(os.path.join(cur, "data", "raw", "extracted", "images")):
        print(f"Found dataset root at: {cur}")
        break
    cur = os.path.dirname(cur)
