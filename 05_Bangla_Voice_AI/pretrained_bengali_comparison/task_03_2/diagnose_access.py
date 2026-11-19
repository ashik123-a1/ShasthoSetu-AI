import os
import sys
import json
from pathlib import Path
import requests

def main():
    print("=" * 60)
    print("STEP 1: Diagnosing Hugging Face Repository Access")
    print("=" * 60)

    # 1. Inspect environment variables related to Hugging Face
    hf_env_keys = [
        "HF_TOKEN", 
        "HUGGING_FACE_HUB_TOKEN", 
        "HF_HUB_DISABLE_IMPLICIT_TOKEN",
        "HF_HOME",
        "HUGGINGFACE_HUB_CACHE",
        "TRANSFORMERS_CACHE"
    ]
    env_status = {}
    for k in hf_env_keys:
        val = os.environ.get(k)
        if val is not None:
            # Mask value to prevent token leakage
            env_status[k] = f"SET (length={len(val)})"
        else:
            env_status[k] = "NOT_SET"
    
    print("\n[Environment Variables Status]")
    for k, v in env_status.items():
        print(f"  {k}: {v}")

    # 2. Inspect filesystem credential files
    home_dir = Path.home()
    token_files = [
        home_dir / ".huggingface" / "token",
        home_dir / ".cache" / "huggingface" / "token"
    ]
    file_status = {}
    for tf in token_files:
        if tf.exists():
            file_status[str(tf)] = f"EXISTS (size={tf.stat().st_size} bytes)"
        else:
            file_status[str(tf)] = "NOT_FOUND"
    
    print("\n[Hugging Face Credential Files]")
    for k, v in file_status.items():
        print(f"  {k}: {v}")

    # 3. Test HTTP Access to vivasoft/whisper-small-bn
    model_id = "vivasoft/whisper-small-bn"
    api_url = f"https://huggingface.co/api/models/{model_id}"
    tree_url = f"https://huggingface.co/api/models/{model_id}/tree/main"

    print(f"\n[Probing API endpoint: {api_url}]")
    
    # 3a. Plain unauthenticated request (no custom auth headers)
    headers_plain = {"User-Agent": "python-requests/2.32"}
    try:
        r_plain = requests.get(api_url, headers=headers_plain, timeout=15)
        print(f"  Plain requests.get status: {r_plain.status_code} {r_plain.reason}")
        if r_plain.status_code == 200:
            m_data = r_plain.json()
            print("  --> Model is PUBLIC! Details:")
            print(f"      ID: {m_data.get('id')}")
            print(f"      Private: {m_data.get('private')}")
            print(f"      Gated: {m_data.get('gated')}")
            print(f"      Downloads: {m_data.get('downloads')}")
            print(f"      Likes: {m_data.get('likes')}")
            print(f"      Pipeline: {m_data.get('pipeline_tag')}")
        else:
            print(f"  --> Non-200 response: {r_plain.text[:300]}")
    except Exception as e:
        print(f"  --> Exception on plain request: {e}")

    # 3b. Probe files tree
    print(f"\n[Probing Tree endpoint: {tree_url}]")
    try:
        r_tree = requests.get(tree_url, headers=headers_plain, timeout=15)
        print(f"  Tree status: {r_tree.status_code}")
        if r_tree.status_code == 200:
            files_list = r_tree.json()
            print(f"  Found {len(files_list)} files in main branch:")
            for item in files_list:
                f_path = item.get("path")
                f_size = item.get("size")
                size_str = f"{f_size / (1024*1024):.2f} MB" if f_size else "N/A"
                print(f"    - {f_path} ({size_str})")
    except Exception as e:
        print(f"  --> Exception on tree probe: {e}")

    # 4. Test Hugging Face Hub library with explicit token=False
    print("\n[Testing huggingface_hub Python library with token=False]")
    try:
        from huggingface_hub import HfApi
        os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"
        api = HfApi(token=False)
        info = api.model_info(model_id, token=False)
        print(f"  HfApi.model_info succeeded!")
        print(f"    Model ID: {info.id}")
        print(f"    Private: {info.private}")
        print(f"    Gated: {info.gated}")
        print(f"    Sha: {info.sha}")
        print(f"    Siblings count: {len(info.siblings) if info.siblings else 0}")
    except Exception as e:
        print(f"  --> HfApi error: {e}")

    # 5. Check Drive G: for caching
    g_cache = Path("G:/hf_cache")
    print(f"\n[Verifying Cache Location: {g_cache}]")
    if not g_cache.exists():
        try:
            g_cache.mkdir(parents=True, exist_ok=True)
            print(f"  Created directory: {g_cache}")
        except Exception as e:
            print(f"  Could not create {g_cache}: {e}")
    else:
        print(f"  Directory already exists: {g_cache}")

    # Output JSON summary
    summary = {
        "env_status": env_status,
        "file_status": file_status,
        "plain_http_status": r_plain.status_code if 'r_plain' in locals() else None,
        "is_public": (r_plain.status_code == 200) if 'r_plain' in locals() else False,
    }
    with open("diagnosis_result.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print("\nSaved diagnosis_result.json successfully.")

if __name__ == "__main__":
    main()
