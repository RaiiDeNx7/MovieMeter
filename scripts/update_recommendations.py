import os
import pandas as pd
import numpy as np
import requests
from dotenv import load_dotenv
from supabase import create_client
from surprise import Dataset, Reader, SVD

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
df["rating"] = np.random.uniform(4.0, 5.0, size=len(df))  # Add slight variation

print(f"Loaded {len(df)} likes.")

user_ids = df["user_id"].unique()

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
# Fetch TMDB movies (popular + genre discover)
# -----------------------------
NUM_PAGES = 50
tmdb_movies = []

# Popular movies
for page in range(1, NUM_PAGES + 1):
    url = f"https://api.themoviedb.org/3/movie/popular?api_key={TMDB_KEY}&language=en-US&page={page}"
    resp = requests.get(url).json()
    tmdb_movies.extend(resp.get("results", []))

# Discover superhero/action movies to expand candidate pool
SUPERHERO_GENRES = [28, 12, 14]  # Action, Adventure, Fantasy
for genre_id in SUPERHERO_GENRES:
    for page in range(1, 6):
        url = (
            f"https://api.themoviedb.org/3/discover/movie?"
            f"api_key={TMDB_KEY}&with_genres={genre_id}&language=en-US&page={page}"
        )
        resp = requests.get(url).json()
        tmdb_movies.extend(resp.get("results", []))

# Remove duplicates by movie ID
tmdb_lookup = {}
for m in tmdb_movies:
    mid = str(m["id"])
    if mid not in tmdb_lookup:
        tmdb_lookup[mid] = {
            "title": m.get("title"),
            "poster_path": m.get("poster_path"),
            "release_date": m.get("release_date"),
            "tmdb_rating": m.get("vote_average"),
            "genres": [g["name"] for g in m.get("genres", [])] if "genres" in m else [],
            "popularity": m.get("popularity", 0)
        }

tmdb_movie_ids = list(tmdb_lookup.keys())
print(f"Fetched {len(tmdb_movie_ids)} TMDB movies ✓")

# -----------------------------
# Build user liked genres map
# -----------------------------
user_liked_genres = {}
for uid in user_ids:
    liked_movies = df[df["user_id"] == uid]["movie_id"].tolist()
    genres = set()
    for mid in liked_movies:
        m = tmdb_lookup.get(mid)
        if m:
            genres.update(m.get("genres", []))
    user_liked_genres[uid] = genres

# -----------------------------
# Generate top 20 hybrid recommendations
# -----------------------------
recommendations = []

for uid in user_ids:
    liked_genres = user_liked_genres.get(uid, set())
    scores = []
    user_liked_movies = df[df["user_id"] == uid]["movie_id"].tolist()

    for m in tmdb_movie_ids:
        if m in user_liked_movies:
            continue

        # SVD prediction
        score_ml = model.predict(uid, m).est

        # TMDB normalized rating
        score_tmdb = tmdb_lookup[m].get("tmdb_rating", 0) / 10  # scale 0..1

        # Genre score
        movie_genres = set(tmdb_lookup[m].get("genres", []))
        common_genres = liked_genres & movie_genres
        genre_score = len(common_genres) / len(liked_genres) if liked_genres else 0

        # Hybrid score (SVD dominant)
        hybrid_score = score_ml + genre_score * 2 + score_tmdb / 2
        scores.append((m, hybrid_score))

    top20 = sorted(scores, key=lambda x: x[1], reverse=True)[:20]

    for mid, score in top20:
        m = tmdb_lookup.get(mid, {})
        recommendations.append({
            "user_id": uid,
            "movie_id": mid,
            "movie_title": m.get("title"),
            "poster_path": m.get("poster_path"),
            "release_date": m.get("release_date"),
            "tmdb_rating": m.get("tmdb_rating"),
            "score": float(score)
        })

print(f"Generated top 20 hybrid recommendations per user ✓")

# -----------------------------
# Deduplicate
# -----------------------------
unique_recs = {}
for r in recommendations:
    key = (r["user_id"], r["movie_id"])
    unique_recs[key] = r
recommendations = list(unique_recs.values())
print(f"After dedupe: {len(recommendations)} rows remain.")

# -----------------------------
# Clear old recommendations
# -----------------------------
print("Clearing old recommendations...")
for uid in user_ids:
    supabase.table("movie_recommendations").delete().eq("user_id", uid).execute()

# -----------------------------
# Upload new recommendations
# -----------------------------
BATCH = 500
for i in range(0, len(recommendations), BATCH):
    batch = recommendations[i:i + BATCH]
    supabase.table("movie_recommendations").upsert(batch).execute()

print("🎉 Top 20 hybrid recommendations uploaded successfully!")
