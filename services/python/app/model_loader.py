import joblib
import os
from typing import Optional, Tuple
import numpy as np


class MLModelLoader:
    """Loader untuk model machine learning"""

    def __init__(self):
        self.model = None
        self.feature_names = None
        self.class_labels = None
        self.accuracy = None
        self.model_version = "1.0.0"
        self.is_loaded = False
        self.model_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "models",
            "room_recommendation_model.joblib"
        )

    def load_model(self) -> bool:
        """
        Load model dari file joblib
        
        Returns:
            bool: True jika berhasil, False jika gagal
        """
        try:
            if not os.path.exists(self.model_path):
                print(f"Model file tidak ditemukan: {self.model_path}")
                return False

            model_data = joblib.load(self.model_path)

            self.model = model_data.get("model")
            self.feature_names = model_data.get("feature_names")
            self.class_labels = model_data.get("class_labels")
            self.accuracy = model_data.get("accuracy")
            self.model_version = model_data.get("model_version", "1.0.0")

            self.is_loaded = True
            print(f"Model berhasil di-load: {self.model_path}")
            print(f"Model accuracy: {self.accuracy}")
            print(f"Model version: {self.model_version}")
            return True

        except Exception as e:
            print(f"Error loading model: {str(e)}")
            self.is_loaded = False
            return False

    def predict(
        self,
        features: list,
    ) -> Tuple[int, str, float, dict]:
        """
        Prediksi label berdasarkan features

        Args:
            features: List of feature values dalam urutan:
                [price, room_size_m2, distance_to_campus_km, has_wifi, has_ac,
                 has_private_bathroom, facility_count, occupancy_rate, user_budget]

        Returns:
            Tuple: (prediction, label, confidence, probabilities_dict)
        """
        if not self.is_loaded or self.model is None:
            raise Exception("Model tidak berhasil di-load")

        try:
            # Convert to numpy array dan reshape
            X = np.array(features).reshape(1, -1)

            # Prediksi
            prediction = self.model.predict(X)[0]

            # Probabilitas untuk setiap class
            probabilities = self.model.predict_proba(X)[0]

            # Label
            label = self.class_labels[prediction] if self.class_labels else str(prediction)

            # Confidence (probabilitas tertinggi)
            confidence = float(probabilities[prediction])

            # Dict probabilitas
            probabilities_dict = {
                self.class_labels[i]: float(probabilities[i])
                for i in range(len(self.class_labels))
            }

            return int(prediction), label, confidence, probabilities_dict

        except Exception as e:
            print(f"Error during prediction: {str(e)}")
            raise


# Global instance
ml_loader = MLModelLoader()
