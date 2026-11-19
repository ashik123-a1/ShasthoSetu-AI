# Cloudflare Quick Tunnel Live Verification (`UI-01` + Category 12)

- **Latest Active Session Timestamp:** `2026-11-19 02:40:57 +06:00` *(Daemon Active — `task-2448` + `task-2450`)*
- **Command Executed:** `"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:5173 --logfile ...\live_tunnel_daemon.log`
- **Vite Config Host Allowance:** `apps/web/vite.config.ts` (`allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1']`)
- **Active Public Tunnel URL (Open in Browser Tab 2):** `https://boulevard-anywhere-sheffield-largely.trycloudflare.com`
- **Local PC URL (Open in Browser Tab 1):** `http://127.0.0.1:5173/`
- **Host-Verified Browser Check (`bbc6d081-5641-4d28-be66-4d76fe36d23a`):**
  - `visited_origins`: `http://127.0.0.1:5173`, `https://boulevard-anywhere-sheffield-largely.trycloudflare.com` (`blocked_origins: none`)
  - Both tabs returned HTTP `200 OK`, rendered `"স্বাস্থ্যসেতু এআই — ডিজাইন সিস্টেম ও ইউআই ফাউন্ডেশন"`, fetched `/shasthosetu-logo.png` (`200 OK`, `63,301` bytes) in both header & hero slots, toggled Dark Obsidian mode cleanly, and recorded `0` failed requests (`0` console errors).
- **Previous Session Proof Log (`02:23 +06:00`):** `https://employed-ended-quick-entering.trycloudflare.com` -> screenshot [`screenshots/12_cloudflare_tunnel_live.png`](screenshots/12_cloudflare_tunnel_live.png).
- **Competition Status Assessment:** **`🟡 PARTIAL`** for Category 12 (live Cloudflare Tunnel serving `apps/web/` over QUIC; full-stack backend + frontend tunnel to be finalized cleanly in `OPS-01`).

## Live Daemon Connection Log (`live_tunnel_daemon.log`)
```text
{"level":"info","time":"2026-11-18T20:40:57Z","message":"|  https://boulevard-anywhere-sheffield-largely.trycloudflare.com |"}
{"level":"info","run_id":"d9e24ba8-c70f-463e-9a61-08b470b8aed9","component":"Cloudflare API","target":"api.cloudflare.com:443","status":"pass","details":"API is reachable"}
{"level":"info","event":0,"connection":"19b28c0e-8958-4319-b649-2dca2d72af16","connIndex":0,"location":"bom08","ip":"198.41.200.73","protocol":"quic","time":"2026-11-18T20:40:58Z","message":"Registered tunnel connection"}
```
