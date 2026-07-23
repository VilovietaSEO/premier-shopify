#!/usr/bin/env python3
"""Build the two 5:4 patriotic front-view selector cards from client originals.

The handset pixels come from the immutable INDY CONTENT photographs. rembg is
used only to create an alpha mask; the supplied Yealink mark is intentionally
retained. The compositor then applies the approved, product-specific mask
handling and writes byte-capped WebP files through cwebp.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import os
import platform
import shutil
import subprocess
import sys
import tempfile
from importlib import metadata
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms, ImageFilter, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_DIR = Path(
    os.environ.get("INDY_CONTENT_SOURCE_DIR", "/Users/vilovieta/Downloads/INDY CONTENT")
)
DEFAULT_BACKGROUND = REPO_ROOT / "independence-phone-theme/assets/ip-bg-flag-subtle.png"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "brief-materials/assets/indy-content/production/images"

CANVAS_SIZE = (800, 640)
HANDSET_HEIGHT = 580
HANDSET_TOP = 30
HANDSET_BASELINE = 610
HANDSET_CENTER_X = 520
SHADOW_OFFSET = (3, 7)
SHADOW_BLUR_RADIUS = 9
SHADOW_RGB = (10, 24, 48)
SHADOW_ALPHA_SCALE = 0.20
TARGET_BYTES = 95_000
MAX_BYTES = 100_000
DEFAULT_MODEL = "birefnet-general"
DEFAULT_MODEL_SHA256 = "58f621f00f5d756097615970a88a791584600dcf7c45b18a0a6267535a1ebd3c"
EXPECTED_TOOLCHAIN = {
    "python": "3.12.13",
    "Pillow": "12.3.0",
    "numpy": "2.4.6",
    "onnxruntime": "1.27.0",
    "rembg": "2.0.76",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--classic-source", type=Path)
    parser.add_argument("--rugged-source", type=Path)
    parser.add_argument("--background", type=Path, default=DEFAULT_BACKGROUND)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--model", default=os.environ.get("INDY_REMBG_MODEL", DEFAULT_MODEL))
    parser.add_argument("--model-dir", type=Path, default=os.environ.get("U2NET_HOME"))
    parser.add_argument("--model-sha256", default=DEFAULT_MODEL_SHA256)
    parser.add_argument("--cwebp", default=os.environ.get("CWEBP", "cwebp"))
    parser.add_argument("--target-bytes", type=int, default=TARGET_BYTES)
    parser.add_argument("--max-bytes", type=int, default=MAX_BYTES)
    return parser.parse_args()


def load_source(path: Path) -> tuple[Image.Image, bytes]:
    with Image.open(path) as opened:
        if opened.size != (5000, 4000):
            raise ValueError(f"Expected a 5000x4000 client original: {path}; got {opened.size}")
        source_profile = opened.info.get("icc_profile")
        image = opened.convert("RGB")

    if not source_profile:
        raise ValueError(f"Expected an embedded source color profile: {path}")

    return image, source_profile


def convert_source_to_srgb(image: Image.Image, source_profile: bytes) -> Image.Image:
    input_profile = ImageCms.ImageCmsProfile(io.BytesIO(source_profile))
    output_profile = ImageCms.createProfile("sRGB")
    return ImageCms.profileToProfile(
        image,
        input_profile,
        output_profile,
        renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC,
        outputMode="RGB",
    )


def load_background(path: Path) -> Image.Image:
    with Image.open(path) as opened:
        background = opened.convert("RGB")
    return ImageOps.fit(
        background,
        CANVAS_SIZE,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def rembg_mask(source: Image.Image, session) -> Image.Image:
    from rembg import remove

    result = remove(
        source,
        session=session,
        only_mask=True,
        alpha_matting=False,
        post_process_mask=False,
    )
    if isinstance(result, bytes):
        with Image.open(io.BytesIO(result)) as opened:
            return opened.convert("L")
    return result.convert("L")


def clean_classic_mask(source: Image.Image, mask: Image.Image) -> Image.Image:
    if mask.size != source.size:
        raise ValueError(f"Classic mask size {mask.size} does not match source {source.size}")

    alpha = (np.asarray(mask, dtype=np.float32) / 255.0).copy()
    gray = np.asarray(source.convert("L"), dtype=np.float32)

    pedestal_gate = np.clip((170.0 - gray[3400:3590, :]) / 25.0, 0.0, 1.0)
    alpha[3400:3590, :] *= pedestal_gate
    alpha[3590:, :] = 0.0

    cleaned = Image.fromarray(np.rint(alpha * 255.0).astype(np.uint8), mode="L")
    return cleaned.filter(ImageFilter.GaussianBlur(radius=0.65))


def crop_handset(source: Image.Image, mask: Image.Image) -> Image.Image:
    if mask.size != source.size:
        raise ValueError(f"Mask size {mask.size} does not match source {source.size}")

    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("rembg returned an empty handset mask")

    handset = source.copy()
    handset.putalpha(mask)
    return handset.crop(bounds)


def resize_handset(handset: Image.Image) -> Image.Image:
    scale = HANDSET_HEIGHT / handset.height
    resized_width = round(handset.width * scale)
    if resized_width <= 0 or resized_width > CANVAS_SIZE[0]:
        raise ValueError(f"Scaled handset width is outside the {CANVAS_SIZE[0]}px canvas: {resized_width}")
    return handset.resize((resized_width, HANDSET_HEIGHT), Image.Resampling.LANCZOS)


def composite_card(background: Image.Image, handset: Image.Image) -> Image.Image:
    if HANDSET_TOP + HANDSET_HEIGHT != HANDSET_BASELINE:
        raise ValueError("Handset top, height, and baseline constants are inconsistent")

    x = round(HANDSET_CENTER_X - handset.width / 2)
    y = HANDSET_TOP
    if x < 0 or x + handset.width > CANVAS_SIZE[0]:
        raise ValueError(f"Handset does not fit the output canvas at x={x}: {handset.size}")

    handset_alpha = handset.getchannel("A")
    full_alpha = Image.new("L", CANVAS_SIZE, 0)
    full_alpha.paste(handset_alpha, (x, y))

    shifted_alpha = Image.new("L", CANVAS_SIZE, 0)
    shifted_alpha.paste(full_alpha, SHADOW_OFFSET)
    blurred_alpha = shifted_alpha.filter(ImageFilter.GaussianBlur(radius=SHADOW_BLUR_RADIUS))
    shadow_alpha = blurred_alpha.point(lambda value: round(value * SHADOW_ALPHA_SCALE))
    shadow = Image.new("RGBA", CANVAS_SIZE, (*SHADOW_RGB, 0))
    shadow.putalpha(shadow_alpha)

    card = background.convert("RGBA")
    card.alpha_composite(shadow)
    card.alpha_composite(handset, (x, y))
    return card.convert("RGB")


def encode_webp(
    image: Image.Image,
    destination: Path,
    cwebp: str,
    target_bytes: int,
    max_bytes: int,
) -> None:
    if target_bytes <= 0 or target_bytes >= max_bytes:
        raise ValueError("Target bytes must be positive and strictly below the maximum")

    png_path = destination.with_suffix(".png")
    image.save(png_path, format="PNG", optimize=False)
    subprocess.run(
        [
            cwebp,
            "-preset",
            "photo",
            "-quiet",
            "-size",
            str(target_bytes),
            "-pass",
            "10",
            "-m",
            "6",
            "-sharp_yuv",
            "-metadata",
            "none",
            "-noalpha",
            str(png_path),
            "-o",
            str(destination),
        ],
        check=True,
    )

    size = destination.stat().st_size
    if size >= max_bytes:
        raise ValueError(f"Encoded WebP is {size} bytes; required <{max_bytes}: {destination.name}")

    payload = destination.read_bytes()
    if payload[:4] != b"RIFF" or payload[8:12] != b"WEBP":
        raise ValueError(f"cwebp did not produce a WebP container: {destination}")
    with Image.open(destination) as encoded:
        if encoded.format != "WEBP" or encoded.size != CANVAS_SIZE:
            raise ValueError(
                f"Invalid encoded card {destination.name}: format={encoded.format}, size={encoded.size}"
            )


def package_version(name: str) -> str:
    try:
        return metadata.version(name)
    except metadata.PackageNotFoundError:
        return "unknown"


def validate_toolchain() -> None:
    actual = {
        "python": platform.python_version(),
        "Pillow": package_version("Pillow"),
        "numpy": package_version("numpy"),
        "onnxruntime": package_version("onnxruntime"),
        "rembg": package_version("rembg"),
    }
    drift = [
        f"{name}: expected {expected}, got {actual[name]}"
        for name, expected in EXPECTED_TOOLCHAIN.items()
        if actual[name] != expected
    ]
    if drift:
        raise RuntimeError("Front-card toolchain drift:\n- " + "\n- ".join(drift))


def validate_model(model: str, model_dir: Path | None, expected_sha256: str) -> None:
    root = model_dir or Path(os.environ.get("U2NET_HOME", Path.home() / ".u2net"))
    model_path = root / f"{model}.onnx"
    if not model_path.is_file():
        raise FileNotFoundError(f"Expected downloaded rembg model: {model_path}")
    actual_sha256 = hashlib.sha256(model_path.read_bytes()).hexdigest()
    if actual_sha256 != expected_sha256:
        raise ValueError(
            f"rembg model hash mismatch for {model_path}: expected {expected_sha256}, got {actual_sha256}"
        )


def main() -> int:
    args = parse_args()
    classic_source = args.classic_source or args.source_dir / "Non-Rugged - Front.jpg"
    rugged_source = args.rugged_source or args.source_dir / "Rugged - Front.jpg"

    for path in (classic_source, rugged_source, args.background):
        if not path.is_file():
            raise FileNotFoundError(path)

    cwebp = shutil.which(args.cwebp) if not Path(args.cwebp).is_absolute() else args.cwebp
    if not cwebp or not Path(cwebp).is_file():
        raise FileNotFoundError(f"cwebp executable not found: {args.cwebp}")

    if args.model_dir:
        os.environ["U2NET_HOME"] = str(args.model_dir)
    try:
        from rembg import new_session
    except ImportError as error:
        raise RuntimeError(
            "rembg is required for front-card masking; install the pinned media toolchain first"
        ) from error

    validate_toolchain()
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    session = new_session(args.model, providers=["CPUExecutionProvider"])
    validate_model(args.model, args.model_dir, args.model_sha256)
    background = load_background(args.background)

    sources = {
        "ip-classic-phone-front.webp": (classic_source, True),
        "ip-rugged-phone-front.webp": (rugged_source, False),
    }

    with tempfile.TemporaryDirectory(prefix="indy-front-card-") as temporary:
        temporary_dir = Path(temporary)
        built: list[tuple[Path, Path]] = []
        for filename, (source_path, clean_classic) in sources.items():
            source, source_profile = load_source(source_path)
            mask = rembg_mask(source, session)
            if clean_classic:
                mask = clean_classic_mask(source, mask)
            srgb_source = convert_source_to_srgb(source, source_profile)
            handset = resize_handset(crop_handset(srgb_source, mask))
            card = composite_card(background, handset)
            temporary_output = temporary_dir / filename
            encode_webp(card, temporary_output, str(cwebp), args.target_bytes, args.max_bytes)
            built.append((temporary_output, args.output_dir / filename))

        args.output_dir.mkdir(parents=True, exist_ok=True)
        for temporary_output, final_output in built:
            os.replace(temporary_output, final_output)
            print(f"built {final_output} ({final_output.stat().st_size} bytes)")

    print(
        "toolchain "
        f"python={sys.version.split()[0]} "
        f"rembg={package_version('rembg')} "
        f"Pillow={package_version('Pillow')} "
        f"numpy={package_version('numpy')} "
        f"onnxruntime={package_version('onnxruntime')} "
        f"model={args.model}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
