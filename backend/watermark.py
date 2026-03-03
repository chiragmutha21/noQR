import cv2
import numpy as np
from imwatermark import WatermarkEncoder, WatermarkDecoder
import os

class WatermarkManager:
    def __init__(self):
        self.method = 'dwtDct' # Robust method

    def embed_id(self, image_data: bytes, content_id: str) -> tuple[bytes, bool]:
        """
        Embeds a 32-bit ID (derived from the content_id) into the image.
        Uses WatermarkEncoder from imwatermark.
        """
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return image_data, False

            # We'll use the last 4 chars of the ID (hex) = 16 bits
            # Or 8 chars = 32 bits. Let's do 8 chars.
            id_suffix = content_id[-8:]
            bits = self._string_to_bits(id_suffix)
            
            encoder = WatermarkEncoder()
            encoder.set_watermark('binary', bits)
            
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

    def detect_id(self, frame_data: bytes, expected_id_suffix: str) -> bool:
        """
        Detects if the expected suffix watermark is present in the frame.
        """
        if not expected_id_suffix:
            return False
            
        try:
            nparr = np.frombuffer(frame_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return False
                
            # Expected length in bits
            bit_len = len(expected_id_suffix) * 8
            
            decoder = WatermarkDecoder('binary', bit_len)
            detected_bits = decoder.decode(img, self.method)
            
            expected_bits = self._string_to_bits(expected_id_suffix)
            
            # Calculate Bit Error Rate
            ber = self._calculate_ber(detected_bits, expected_bits)
            
            # Similarity score: 1.0 - BER
            # threshold 0.15 error rate is usually safe for dwtDct
            match = ber < 0.20
            if match:
                print(f"Watermark match verified! BER: {ber:.4f}")
            return match
            
        except Exception as e:
            print(f"Watermark detect error: {e}")
            return False
            
    def _string_to_bits(self, s):
        result = []
        for c in s:
            bits = bin(ord(c))[2:]
            bits = '00000000'[len(bits):] + bits
            result.extend([int(b) for b in bits])
        return np.array(result, dtype=np.uint8)

    def _calculate_ber(self, bits1, bits2):
        # bits1 might be None or different length if detection failed
        if bits1 is None or len(bits1) != len(bits2):
            return 1.0
        diff = np.sum(bits1 != bits2)
        return diff / len(bits1)
