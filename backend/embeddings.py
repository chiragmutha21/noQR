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


def extract_embedding(image_source) -> np.ndarray:
    """
    Extract a 2048-d L2-normalized embedding.
    image_source can be a path (str) or raw bytes.
    Optimized for speed (< 0.5s per frame).
    """
    import io
    if isinstance(image_source, bytes):
        img = Image.open(io.BytesIO(image_source)).convert("RGB")
    else:
        img = Image.open(image_source).convert("RGB")
    
    # 1. Faster Resize: Directly to 224x224 using Bilinear (faster than Lanczos)
    img = img.resize((224, 224), Image.Resampling.BILINEAR)

    # 2. Minimal Enhancements (only the essential ones for AR noise)
    from PIL import ImageEnhance, ImageOps
    
    # Fast histogram normalization
    img = ImageOps.equalize(img) 
    
    # Single pass enhancement
    img = ImageEnhance.Contrast(img).enhance(1.1)

    tensor = _preprocess(img).unsqueeze(0).to(_device)

    with torch.no_grad():
        features = _model(tensor)

    # Flatten and normalize
    embedding = features.squeeze().cpu().numpy().astype(np.float32)
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm

    return embedding
