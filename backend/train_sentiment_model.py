# train_sentiment_model.py
import os
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
import joblib

DATA_PATH = os.path.join(os.path.dirname(__file__), "sentiment_training_data.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "sentiment_model.joblib")

# Load labeled data
df = pd.read_csv(DATA_PATH)

# Basic checks
if 'comment' not in df.columns or 'label' not in df.columns:
    raise SystemExit("CSV must contain 'comment' and 'label' columns")

X = df['comment'].astype(str).values
y = df['label'].astype(str).values

# Pipeline: char-ngram TF-IDF (helps multilingual + short texts) + logistic regression
pipe = Pipeline([
    ("tfidf", TfidfVectorizer(analyzer='char_wb', ngram_range=(2,5), max_features=30000)),
    ("clf", LogisticRegression(max_iter=2000, C=1.0, class_weight='balanced', solver='liblinear'))
])

# Quick cross-validation to check basic accuracy
scores = cross_val_score(pipe, X, y, cv=3, scoring='accuracy')
print("CV accuracy (3-fold):", scores.mean(), scores, flush=True)

# Fit model to all data and save
pipe.fit(X, y)
joblib.dump(pipe, MODEL_PATH)
print(f"Saved model to {MODEL_PATH}")