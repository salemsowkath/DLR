from __future__ import annotations

import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


def preprocess_image(image: Image.Image) -> Image.Image:
    """Return an OCR-oriented copy while keeping the original image untouched."""
    if image.mode not in {'L', 'RGB', 'RGBA', 'CMYK'}:
        image = image.convert('RGB')

    grayscale = ImageOps.grayscale(image)
    grayscale = grayscale.filter(ImageFilter.MedianFilter(3))
    grayscale = ImageEnhance.Contrast(grayscale).enhance(1.8)
    grayscale = ImageOps.autocontrast(grayscale)

    array = np.asarray(grayscale)
    if array.size == 0:
        return grayscale

    normalized = cv2.adaptiveThreshold(
        array,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        10,
    )

    return Image.fromarray(normalized, mode='L')
