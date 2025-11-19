import os
import pandas as pd
import numpy as np
import requests
from dotenv import load_dotenv
from supabase import create_client
from surprise import Dataset, Reader, SVD
from surprise.model_selection import train_test_split

# -----------------------------
# Load environment variables
# -----------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
TMDB_KEY = os.getenv("TMDB_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env")
if not TMDB_KEY:
    raise ValueError("Missing TMDB_API_KEY in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
print("Connected to Supabase ✓")

# -----------------------------
# Fetch user likes
# -----------------------------
response = supabase.table("liked_movies").select("*").execute()
likes = response.data
if not likes:
    print("⚠️ No likes found — cannot build recommendations.")
    exit()

df = pd.DataFrame(likes)
df["user_id"] = df["user_id"].astype(str)
df["movie_id"] = df["movie_id"].astype(str)
df["rating"] = 5.0  # arbitrary explicit rating for SVD

print(f"Loaded {len(df)} likes.")

# -----------------------------
# Build Surprise dataset
# -----------------------------
reader = Reader(rating_scale=(0, 5))
data = Dataset.load_from_df(df[["user_id", "movie_id", "rating"]], reader)
trainset = data.build_full_trainset()

# -----------------------------
# Train SVD model
# -----------------------------
model = SVD(n_factors=50, n_epochs=20, reg_all=0.1)
model.fit(trainset)
print("SVD model trained ✓")

# -----------------------------
# Fetch new movies from TMDB
# -----------------------------
NUM_PAGES = 10
tmdb_movies = []

for page in range(1, NUM_PAGES + 1):
    TMDB_URL = f"https://api.themoviedb.org/3/movie/popular?api_key={TMDB_KEY}&language=en-US&page={page}"
    response = requests.get(TMDB_URL)
    data_tmdb = response.json()
    tmdb_movies.extend(data_tmdb.get("results", []))

tmdb_lookup = {str(m["id"]): m for m in tmdb_movies}
tmdb_movie_ids = [str(m["id"]) for m in tmdb_movies]
print(f"Fetched {len(tmdb_movies)} new TMDB movies ✓")

# -----------------------------
# Generate top 20 recommendations per user
# -----------------------------
recommendations = []

user_ids = df["user_id"].unique()
movie_ids_all = df["movie_id"].unique()

for uid in user_ids:
    # Predict scores for all TMDB movies
    scores = []
    for m in tmdb_movie_ids:
        # Skip if user already liked it
        if m in df[df["user_id"] == uid]["movie_id"].tolist():
            continue
        pred = model.predict(uid, m)
        scores.append((m, pred.est))
    
    # Take top 20
    top20 = sorted(scores, key=lambda x: x[1], reverse=True)[:20]
    
    for mid, score in top20:
        m = tmdb_lookup.get(mid, {})
        recommendations.append({
            "user_id": uid,
            "movie_id": mid,
            "movie_title": m.get("title"),
            "poster_path": m.get("poster_path"),
            "release_date": m.get("release_date"),
            "tmdb_rating": m.get("vote_average"),
            "score": float(score)
        })

print(f"Generated top 20 recommendations for each user ✓")

# -----------------------------
# Upload to Supabase safely
# -----------------------------

# Deduplicate by (user_id, movie_id)
unique_recs = {}
for r in recommendations:
    key = (r["user_id"], r["movie_id"])
    unique_recs[key] = r

recommendations = list(unique_recs.values())
print(f"After dedupe: {len(recommendations)} rows remain.")

# Upload in batches
BATCH = 500
for i in range(0, len(recommendations), BATCH):
    batch = recommendations[i:i + BATCH]
    try:
        supabase.table("movie_recommendations").upsert(batch).execute()
    except Exception as e:
        print(f"Error uploading batch {i//BATCH + 1}: {e}")

print("🎉 Top 20 SVD recommendations uploaded successfully!")
