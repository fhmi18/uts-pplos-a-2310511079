import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import os
from datetime import datetime

print("=" * 70)
print("TRAINING ROOM RECOMMENDATION MODEL")
print("=" * 70)

np.random.seed(42)

# Parameter
n_samples = 400
dataset_path = os.path.join(os.path.dirname(__file__), "data", "kos_recommendation_dataset.csv")

print("\n[1] Generating synthetic dataset...")

# Generate features
price = np.random.normal(1000000, 300000, n_samples)
price = np.clip(price, 500000, 3000000)  # Clamp ke range 500k - 3juta

room_size_m2 = np.random.normal(12, 4, n_samples)
room_size_m2 = np.clip(room_size_m2, 6, 25)

distance_to_campus_km = np.random.exponential(2, n_samples)
distance_to_campus_km = np.clip(distance_to_campus_km, 0.1, 10)

has_wifi = np.random.choice([0, 1], n_samples, p=[0.2, 0.8])
has_ac = np.random.choice([0, 1], n_samples, p=[0.3, 0.7])
has_private_bathroom = np.random.choice([0, 1], n_samples, p=[0.4, 0.6])

facility_count = np.random.randint(2, 10, n_samples)
occupancy_rate = np.random.uniform(0.2, 0.95, n_samples)
user_budget = np.random.normal(1200000, 400000, n_samples)
user_budget = np.clip(user_budget, 500000, 3000000)

# Create DataFrame
df = pd.DataFrame({
    'price': price,
    'room_size_m2': room_size_m2,
    'distance_to_campus_km': distance_to_campus_km,
    'has_wifi': has_wifi,
    'has_ac': has_ac,
    'has_private_bathroom': has_private_bathroom,
    'facility_count': facility_count,
    'occupancy_rate': occupancy_rate,
    'user_budget': user_budget,
})

def create_label(row):
    """
    Labeling logic:
    - highly_recommended (2): harga <= budget, fasilitas lengkap (>= 6), 
                             jarak dekat (< 2km), occupancy <= 0.7
    - recommended (1): harga masih masuk akal vs budget, fasilitas cukup (4-5),
                       jarak reasonable (< 4km)
    - not_recommended (0): harga jauh > budget, fasilitas minim (< 4), 
                          atau jarak sangat jauh (> 5km)
    """
    
    price = row['price']
    budget = row['user_budget']
    facility = row['facility_count']
    distance = row['distance_to_campus_km']
    occupancy = row['occupancy_rate']
    
    # Score based on criteria
    price_ratio = price / budget if budget > 0 else 1
    wifi_ac_bath = row['has_wifi'] + row['has_ac'] + row['has_private_bathroom']
    room_size = row['room_size_m2']
    
    # Scoring
    is_price_ok = price_ratio <= 1.1  # Harga masuk akal dengan budget
    is_price_good = price_ratio <= 0.95
    
    has_good_facilities = facility >= 6 and wifi_ac_bath >= 2
    has_ok_facilities = facility >= 4 and wifi_ac_bath >= 1
    
    has_good_distance = distance < 2
    has_ok_distance = distance < 4
    
    occupancy_ok = occupancy <= 0.7
    
    # Determine label
    if is_price_good and has_good_facilities and has_good_distance and occupancy_ok and room_size > 10:
        return 2  # highly_recommended
    elif is_price_ok and has_ok_facilities and has_ok_distance:
        return 1  # recommended
    else:
        return 0  # not_recommended

df['label'] = df.apply(create_label, axis=1)

# Balance dataset sedikit
label_counts = df['label'].value_counts()
print(f"\nLabel distribution (sebelum balancing):")
print(label_counts)
print(f"Total samples: {len(df)}")

# Save to CSV
os.makedirs(os.path.dirname(dataset_path), exist_ok=True)
df.to_csv(dataset_path, index=False)
print(f"\n✓ Dataset saved to: {dataset_path}")


print("\n[2] Preparing data for training...")

X = df[[
    'price', 'room_size_m2', 'distance_to_campus_km',
    'has_wifi', 'has_ac', 'has_private_bathroom',
    'facility_count', 'occupancy_rate', 'user_budget'
]]

y = df['label']

feature_names = list(X.columns)
class_labels = {0: 'not_recommended', 1: 'recommended', 2: 'highly_recommended'}
class_labels_list = [class_labels[i] for i in sorted(class_labels.keys())]

print(f"Features: {feature_names}")
print(f"Classes: {class_labels_list}")

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\nTrain set: {X_train.shape[0]} samples")
print(f"Test set: {X_test.shape[0]} samples")
print(f"Train label distribution:\n{pd.Series(y_train).value_counts().sort_index()}")
print(f"Test label distribution:\n{pd.Series(y_test).value_counts().sort_index()}")

print("\n[3] Training model...")

# Create pipeline
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('classifier', RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    ))
])

# Train
pipeline.fit(X_train, y_train)
print("✓ Model training completed")

print("\n[4] Evaluating model...")

y_pred_train = pipeline.predict(X_train)
y_pred_test = pipeline.predict(X_test)

train_accuracy = accuracy_score(y_train, y_pred_train)
test_accuracy = accuracy_score(y_test, y_pred_test)

print(f"\nTrain Accuracy: {train_accuracy:.4f}")
print(f"Test Accuracy: {test_accuracy:.4f}")

print("\nClassification Report (Test Set):")
print(classification_report(
    y_test, y_pred_test,
    target_names=class_labels_list
))

print("\nConfusion Matrix (Test Set):")
print(confusion_matrix(y_test, y_pred_test))

print("\n[5] Saving model...")

model_data = {
    'model': pipeline,
    'feature_names': feature_names,
    'class_labels': class_labels_list,
    'accuracy': test_accuracy,
    'model_version': '1.0.0',
    'training_date': datetime.now().isoformat(),
    'n_samples': len(df),
    'n_features': len(feature_names),
}

model_path = os.path.join(os.path.dirname(__file__), "models", "room_recommendation_model.joblib")
os.makedirs(os.path.dirname(model_path), exist_ok=True)

joblib.dump(model_data, model_path)
print(f"✓ Model saved to: {model_path}")

print("\n[6] Testing prediction with sample data...")

sample_features = [
    1200000,      # price
    12,           # room_size_m2
    1.5,          # distance_to_campus_km
    1,            # has_wifi
    1,            # has_ac
    1,            # has_private_bathroom
    6,            # facility_count
    0.65,         # occupancy_rate
    1500000,      # user_budget
]

X_sample = np.array(sample_features).reshape(1, -1)
prediction = pipeline.predict(X_sample)[0]
probabilities = pipeline.predict_proba(X_sample)[0]

print(f"\nSample input: {sample_features}")
print(f"Prediction: {prediction} ({class_labels_list[prediction]})")
print(f"Probabilities:")
for i, (label, prob) in enumerate(zip(class_labels_list, probabilities)):
    print(f"  {label}: {prob:.4f}")

print("\n" + "=" * 70)
print("TRAINING COMPLETED SUCCESSFULLY ✓")
print("=" * 70)
print(f"\nNext steps:")
print(f"\nuvicorn app.main:app --host 0.0.0.0 --port 8000 --reload")
print(f"\nAPI Docs: http://localhost:8000/docs")
