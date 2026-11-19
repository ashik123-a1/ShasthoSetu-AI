import sys
import json
import time

def verify():
    print("="*60)
    print("ShasthoSetu AI — Hardware & GPU CUDA Verification")
    print("="*60)
    
    try:
        import torch
    except ImportError:
        print("ERROR: PyTorch is not yet installed in this environment.")
        sys.exit(1)
        
    print(f"PyTorch Version: {torch.__version__}")
    print(f"CUDA Available:  {torch.cuda.is_available()}")
    
    if not torch.cuda.is_available():
        print("WARNING: CUDA is not available. GPU acceleration cannot be used.")
        sys.exit(2)
        
    device_count = torch.cuda.device_count()
    device_name = torch.cuda.get_device_name(0)
    props = torch.cuda.get_device_properties(0)
    total_mem_gb = props.total_memory / (1024**3)
    major, minor = props.major, props.minor
    
    print(f"Device Count:    {device_count}")
    print(f"Device Name:     {device_name}")
    print(f"Compute Cap:     sm_{major}{minor}")
    print(f"Total VRAM:      {total_mem_gb:.2f} GB")
    
    # Run genuine tensor computation and backward pass
    print("\nExecuting real CUDA tensor computation (2048x2048 matmul + backward pass)...")
    t0 = time.time()
    x = torch.randn(2048, 2048, device="cuda", dtype=torch.float32, requires_grad=True)
    w = torch.randn(2048, 2048, device="cuda", dtype=torch.float32, requires_grad=True)
    y = torch.matmul(x, w)
    loss = y.sum()
    loss.backward()
    torch.cuda.synchronize()
    elapsed = (time.time() - t0) * 1000
    
    grad_norm = x.grad.norm().item()
    allocated_vram_mb = torch.cuda.memory_allocated() / (1024**2)
    max_vram_mb = torch.cuda.max_memory_allocated() / (1024**2)
    
    print(f"Computation successful! Elapsed time: {elapsed:.2f} ms")
    print(f"Gradient norm: {grad_norm:.4f}")
    print(f"Allocated VRAM: {allocated_vram_mb:.2f} MB")
    print(f"Peak VRAM:      {max_vram_mb:.2f} MB")
    
    gpu_profile = {
        "status": "PASS",
        "pytorch_version": torch.__version__,
        "cuda_version": torch.version.cuda,
        "device_name": device_name,
        "compute_capability": f"{major}.{minor}",
        "total_vram_gb": round(total_mem_gb, 2),
        "benchmark_elapsed_ms": round(elapsed, 2),
        "peak_vram_mb": round(max_vram_mb, 2)
    }
    
    out_path = r"F:\Clude cccccccccccccccccccccccc\data we test\_shared\gpu_verification.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(gpu_profile, f, indent=2)
    print(f"\nGPU verification profile saved to: {out_path}")
    print("="*60)

if __name__ == "__main__":
    verify()
