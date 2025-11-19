import os
import pandas as pd
import numpy as np
import requests
from dotenv import load_dotenv
from supabase import create_client

# -----------------------------------------------
# Load environment variables
# -----------------------------------------------
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
print("Fetching user liked movies...")

# -----------------------------------------------
# Fetch liked movies
# -----------------------------------------------
response = supabase.table("liked_movies").select("*").execute()
likes = response.data

if not likes:
    print("⚠️ No likes found — cannot build recommendations.")
    exit()

df = pd.DataFrame(likes)

df["user_id"] = df["user_id"].astype(str)
df["movie_id"] = df["movie_id"].astype(str)
df["rating"] = 5.0   # default score

print(f"Loaded {len(df)} likes.")


# -----------------------------------------------
# Build user–movie matrix
# -----------------------------------------------
rating_matrix = df.pivot_table(
    index="user_id",
    columns="movie_id",
    values="rating",
    fill_value=0
)

user_ids = rating_matrix.index.tolist()
matrix = rating_matrix.to_numpy()

# Normalize rows for cosine similarity
norms = np.linalg.norm(matrix, axis=1)
norms[norms == 0] = 1
normalized = matrix / norms[:, None]

# Cosine similarity matrix
similarity = normalized @ normalized.T


# -----------------------------------------------
# Fetch NEW MOVIES from TMDB
# -----------------------------------------------
print("Fetching new movies from TMDB...")

tmdb_movies = []
NUM_PAGES = 10   # Fetch 10 pages = ~200 movies

for page in range(1, NUM_PAGES + 1):
    TMDB_URL = (
        f"https://api.themoviedb.org/3/movie/popular"
        f"?api_key={TMDB_KEY}&language=en-US&page={page}"
    )
    
    tmdb_response = requests.get(TMDB_URL)
    data = tmdb_response.json()
    
    results = data.get("results", [])
    tmdb_movies.extend(results)

print(f"Fetched {len(tmdb_movies)} fresh movies from TMDB.")


# Build lookup for fast access
tmdb_movie_ids = [str(m["id"]) for m in tmdb_movies]

tmdb_lookup = {
    str(m["id"]): {
        "title": m.get("title", "Unknown"),
        "poster_path": m.get("poster_path"),
        "release_date": m.get("release_date"),
        "tmdb_rating": m.get("vote_average"),
    }
    for m in tmdb_movies
}


# -----------------------------------------------
# Score and recommend TMDB movies
# -----------------------------------------------
recommendations = []

for i, user in enumerate(user_ids):
    user_likes = set(df[df["user_id"] == user]["movie_id"].tolist())

    weighted_scores = similarity[i] @ matrix

    for tmdb_mid in tmdb_movie_ids:
        if tmdb_mid in user_likes:
            continue

        # Compute similarity score
        try:
            movie_index = rating_matrix.columns.get_loc(tmdb_mid)
            score = float(weighted_scores[movie_index])
        except KeyError:
            score = float(np.mean(weighted_scores))  # fallback

        movie_info = tmdb_lookup.get(tmdb_mid, {})

        recommendations.append({
            "user_id": user,
            "movie_id": tmdb_mid,
            "movie_title": movie_info.get("title"),
            "poster_path": movie_info.get("poster_path"),
            "release_date": movie_info.get("release_date"),
            "tmdb_rating": movie_info.get("tmdb_rating"),
            "score": score
        })

print(f"Generated {len(recommendations)} recommendations.")


# -----------------------------------------------
# Upload to Supabase
# -----------------------------------------------
print("Clearing old recommendations...")
for user in user_ids:
    supabase.table("movie_recommendations") \
        .delete() \
        .eq("user_id", user) \
        .execute()

# -----------------------------------------------
# Deduplicate before upload
# -----------------------------------------------
print("Removing duplicates...")

unique_recs = {}
for r in recommendations:
    key = (r["user_id"], r["movie_id"])
    unique_recs[key] = r

recommendations = list(unique_recs.values())
print(f"After dedupe: {len(recommendations)} rows remain.")

# -----------------------------------------------
# Upload to Supabase in batches
# -----------------------------------------------
print("Uploading new recommendations...")

BATCH = 500
for i in range(0, len(recommendations), BATCH):
    batch = recommendations[i:i + BATCH]

    supabase.table("movie_recommendations") \
        .upsert(batch) \
        .execute()

print("🎉 Recommendations updated successfully!")

