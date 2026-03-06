"""
Deep learning embedding extraction using ResNet-50.

Extracts a 2048-dimensional feature vector from an image using a pretrained
ResNet-50 with the final classification layer removed. Vectors are L2-normalized
so that inner product equals cosine similarity.
"""
import numpy as np
import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image

# ── Model Setup (singleton, loaded once) ───────────────────────────────────

_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load ResNet-50 pretrained on ImageNet, remove the classification head
_model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
_model = torch.nn.Sequential(*list(_model.children())[:-1])  # Remove fc layer → outputs (batch, 2048, 1, 1)
_model.eval()
_model.to(_device)

# Standard ImageNet preprocessing
_preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

EMBEDDING_DIM = 2048

print(f"Embedding model loaded on {_device} (ResNet-50, {EMBEDDING_DIM}-d)")


def extract_embedding(image_path: str) -> np.ndarray:
    """
    Extract a 2048-d L2-normalized embedding from an image file.

    Args:
        image_path: Path to the image file.

    Returns:
        np.ndarray of shape (EMBEDDING_DIM,) — L2-normalized feature vector.
    """
    img = Image.open(image_path).convert("RGB")
    
    # Enhanced image preprocessing for robust recognition (HD-aware)
    from PIL import ImageEnhance, ImageFilter, ImageOps
    
    # 0. Increase resolution for better feature preservation
    img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)

    # 1. Sharpening: Added to make edges more defined for the neural network
    img = ImageEnhance.Sharpness(img).enhance(2.0)

    # 2. Mild Gaussian Blur: Keep it very low to only handle minor noise
    img = img.filter(ImageFilter.GaussianBlur(radius=0.3))
    
    # 3. Histogram Equalization: Normalize colors/brightness
    img = ImageOps.equalize(img) 
    
    # 4. Color/Contrast Enhancement: Combat "washed out" camera look
    img = ImageEnhance.Color(img).enhance(1.2)
    img = ImageEnhance.Contrast(img).enhance(1.2)

    tensor = _preprocess(img).unsqueeze(0).to(_device)

    with torch.no_grad():
        features = _model(tensor)

    # Flatten from (1, 2048, 1, 1) → (2048,)
    embedding = features.squeeze().cpu().numpy().astype(np.float32)

    # L2-normalize so inner product = cosine similarity
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm

    return embedding
