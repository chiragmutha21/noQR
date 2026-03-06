import cv2
import numpy as np
from imwatermark import WatermarkEncoder, WatermarkDecoder
import os

class WatermarkManager:
    def __init__(self):
        self.method = 'dwtDctSvd' # More robust than dwtDct

    def embed_id(self, image_data: bytes, content_id: str) -> tuple[bytes, bool]:
        """
        Embeds a bits-based ID into the image.
        Uses WatermarkEncoder from imwatermark.
        """
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return image_data, False

            # Last 8 hex chars = 64 bits (if UUID)
            id_suffix = content_id[-8:]
            bits = self._string_to_bits(id_suffix)
            
            encoder = WatermarkEncoder()
            encoder.set_watermark('bits', bits)
            
            # Encode image
            encoded_img = encoder.encode(img, self.method)
            
            # Save back to bytes
            success, buffer = cv2.imencode(".jpg", encoded_img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
            if not success:
                return image_data, False
                
            return buffer.tobytes(), True
        except Exception as e:
            print(f"Watermark embed error: {e}")
            return image_data, False

    def detect_bits(self, frame_data: bytes, bit_len: int = 64) -> np.ndarray:
        """
        Decodes the watermark bits from the frame.
        """
        try:
            nparr = np.frombuffer(frame_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return None
                
            decoder = WatermarkDecoder('bits', bit_len)
            detected_bits = decoder.decode(img, self.method)
            return detected_bits
        except Exception as e:
            print(f"Watermark decode error: {e}")
            return None

    def verify_suffix(self, detected_bits: np.ndarray, expected_id_suffix: str) -> bool:
        """
        Compares detected bits with expected suffix.
        """
        if detected_bits is None or not expected_id_suffix:
            return False
            
        expected_bits = self._string_to_bits(expected_id_suffix)
        ber = self._calculate_ber(detected_bits, expected_bits)
        
        # Match if error rate is low (threshold 25%)
        match = ber < 0.25
        if match:
             print(f"Watermark match for suffix '{expected_id_suffix}'! BER: {ber:.4f}")
        return match

    def detect_id(self, frame_data: bytes, expected_id_suffix: str) -> bool:
        """
        Legacy wrapper for single detection.
        """
        bits = self.detect_bits(frame_data, len(expected_id_suffix) * 8)
        return self.verify_suffix(bits, expected_id_suffix)
            
    def _string_to_bits(self, s):
        # Convert string to bytes then to bit array (as expected by imwatermark)
        bytes_data = s.encode('ascii')
        bits = []
        for byte in bytes_data:
            for i in range(8):
                bits.append((byte >> (7 - i)) & 1)
        return np.array(bits, dtype=np.uint8)

    def _calculate_ber(self, bits1, bits2):
        if bits1 is None:
            return 1.0
        # Ensure we are comparing the right length
        length = min(len(bits1), len(bits2))
        if length == 0:
            return 1.0
        diff = np.sum(bits1[:length] != bits2[:length])
        return diff / length
