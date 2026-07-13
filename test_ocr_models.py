"""
Standalone test script for three Arabic OCR models:
  - Baseer  (Misraj AI,    Qwen2.5-VL-3B)  → Markdown output
  - Qari    (NAMAA,        Qwen2-VL-2B)    → plain text
  - AIN     (MBZUAI,       Qwen2-VL-7B)    → bilingual plain text

Each model is loaded, tested, then deleted before the next one loads
to avoid running out of VRAM.

Usage:
    python test_ocr_models.py path/to/arabic_image.jpg

    # test only specific models
    python test_ocr_models.py path/to/image.jpg --models baseer qari

    # skip downloading large models (dry-run)
    python test_ocr_models.py path/to/image.jpg --dry-run

Requirements:
    pip install transformers qwen-vl-utils accelerate torch Pillow
"""

import argparse
import time
import sys
import gc
import textwrap
from pathlib import Path

# ── CLI ────────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Test Baseer / Qari / AIN Arabic OCR models")
    p.add_argument("image", nargs="?", default=r"F:\visual new\graduation\iamge.png",
                   help="Path to the image file (default: image.png)")
    p.add_argument(
        "--models", nargs="+",
        choices=["baseer", "qari", "ain"],
        default=["baseer", "qari", "ain"],
        help="Which models to test (default: all three)",
    )
    p.add_argument(
        "--dry-run", action="store_true",
        help="Skip actual model loading — just print config and exit",
    )
    p.add_argument(
        "--max-new-tokens", type=int, default=2000,
        help="Max tokens to generate (default: 2000)",
    )
    return p.parse_args()


# ── Model configs ──────────────────────────────────────────────────────────────

MODELS = {
    "baseer": {
        "label":    "Baseer (Misraj AI — Qwen2.5-VL-3B)",
        "model_id": "Misraj/Baseer",
        "base":     "qwen2_5_vl",   # uses Qwen2_5_VLForConditionalGeneration
        "prompt":   "Convert this Arabic document to Markdown. Preserve all text exactly.",
        "note":     "Output is structured Markdown",
    },
    "qari": {
        "label":    "Qari v0.3 (NAMAA — Qwen2-VL-2B)",
        "model_id": "NAMAA-Space/Qari-OCR-v0.3-VL-2B-Instruct",
        "base":     "qwen2_vl",     # uses Qwen2VLForConditionalGeneration
        "prompt": (
            "Below is the image of one page of a document. "
            "Just return the plain text representation of this document "
            "as if you were reading it naturally. Do not hallucinate."
        ),
        "note":     "Output is plain text / HTML",
    },
    "ain": {
        "label":    "AIN (MBZUAI — Qwen2-VL-7B)",
        "model_id": "MBZUAI/AIN",
        "base":     "qwen2_vl",
        "prompt":   "اقرأ النص الموجود في هذه الصورة بدقة تامة.",  # "Read the text in this image accurately."
        "note":     "Output is bilingual plain text (Arabic + English)",
    },
}


# ── Inference helpers ──────────────────────────────────────────────────────────

def _load_model(cfg: dict):
    """Load the right class depending on which Qwen generation."""
    import torch
    from transformers import AutoProcessor

    if cfg["base"] == "qwen2_5_vl":
        from transformers import Qwen2_5_VLForConditionalGeneration as ModelCls
    else:
        from transformers import Qwen2VLForConditionalGeneration as ModelCls

    print(f"  Loading {cfg['model_id']} …", flush=True)
    model = ModelCls.from_pretrained(
        cfg["model_id"],
        torch_dtype="auto",
        device_map="auto",
    )
    processor = AutoProcessor.from_pretrained(cfg["model_id"])
    return model, processor


def _run_inference(model, processor, image_path: str, prompt: str, max_new_tokens: int) -> str:
    import torch
    from qwen_vl_utils import process_vision_info

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": f"file:///{Path(image_path).resolve()}"},
                {"type": "text",  "text": prompt},
            ],
        }
    ]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)

    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    ).to(model.device)

    with torch.no_grad():
        generated_ids = model.generate(**inputs, max_new_tokens=max_new_tokens)

    trimmed = [
        out[len(inp):]
        for inp, out in zip(inputs.input_ids, generated_ids)
    ]
    return processor.batch_decode(trimmed, skip_special_tokens=True,
                                  clean_up_tokenization_spaces=False)[0]


def _unload(model, processor):
    import torch
    del model
    del processor
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


# ── Main ───────────────────────────────────────────────────────────────────────

def _separator(title: str = "", width: int = 70):
    if title:
        pad = (width - len(title) - 2) // 2
        print("─" * pad + f" {title} " + "─" * pad)
    else:
        print("─" * width)


def main():
    args = parse_args()

    image_path = args.image
    if not Path(image_path).exists():
        print(f"ERROR: image not found: {image_path}")
        sys.exit(1)

    print(f"\nImage : {Path(image_path).resolve()}")
    print(f"Models: {', '.join(args.models)}")
    print(f"Max tokens: {args.max_new_tokens}")

    if args.dry_run:
        print("\n[DRY RUN] Model configs:\n")
        for key in args.models:
            cfg = MODELS[key]
            print(f"  {cfg['label']}")
            print(f"    HF model ID : {cfg['model_id']}")
            print(f"    Prompt      : {cfg['prompt'][:80]}…")
            print(f"    Note        : {cfg['note']}\n")
        return

    results = {}

    for key in args.models:
        cfg = MODELS[key]
        _separator(cfg["label"])

        try:
            t0 = time.perf_counter()
            model, processor = _load_model(cfg)
            load_time = time.perf_counter() - t0
            print(f"  Loaded in {load_time:.1f}s")

            t1 = time.perf_counter()
            output = _run_inference(
                model, processor, image_path,
                cfg["prompt"], args.max_new_tokens
            )
            infer_time = time.perf_counter() - t1
            print(f"  Inference done in {infer_time:.1f}s")

            results[key] = {
                "output": output,
                "load_s": round(load_time, 1),
                "infer_s": round(infer_time, 1),
                "error": None,
            }

        except Exception as e:
            print(f"  ERROR: {e}")
            results[key] = {"output": "", "load_s": 0, "infer_s": 0, "error": str(e)}

        finally:
            try:
                _unload(model, processor)
            except NameError:
                pass

    # ── Print comparison ───────────────────────────────────────────────────────
    print("\n")
    _separator("RESULTS COMPARISON")

    for key in args.models:
        cfg = MODELS[key]
        r   = results[key]
        print(f"\n{'━'*70}")
        print(f"  {cfg['label']}")
        print(f"  Note: {cfg['note']}")
        if r["error"]:
            print(f"  ❌ FAILED: {r['error']}")
        else:
            print(f"  ⏱  Load: {r['load_s']}s  |  Inference: {r['infer_s']}s")
            print(f"  📝 Output ({len(r['output'])} chars):\n")
            # indent and wrap output for readability
            wrapped = textwrap.fill(r["output"], width=66, break_long_words=False)
            for line in wrapped.splitlines():
                print(f"    {line}")

    print(f"\n{'━'*70}")
    print("\nDone. Compare the outputs above to decide which model to integrate.\n")


if __name__ == "__main__":
    main()
