import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client
from surprise import Dataset, Reader, SVD

# -----------------------------
# Load environment variables
# -----------------------------
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Connected to Supabase successfully ✓")

# -----------------------------
# Fetch liked movies from DB
# -----------------------------
print("Fetching user movie likes...")

response = supabase.table("liked_movies").select("*").execute()

likes = response.data

if not likes:
    print("⚠️ No liked movies found. Nothing to train.")
    exit()

df = pd.DataFrame(likes)

# Ensure strings for Surprise library
df["user_id"] = df["user_id"].astype(str)
df["movie_id"] = df["movie_id"].astype(str)

# Assign default rating if not present
if "rating" not in df.columns:
    print("No 'rating' column found — assigning default rating of 5 for all liked movies.")
    df["rating"] = 5.0
else:
    df["rating"] = df["rating"].astype(float)

print(f"Loaded {len(df)} likes.")


# -----------------------------
# Train SVD model
# -----------------------------
print("Training SVD model...")

reader = Reader(rating_scale=(1, 5))
data = Dataset.load_from_df(df[["user_id", "movie_id", "rating"]], reader)
trainset = data.build_full_trainset()

model = SVD()
model.fit(trainset)

print("Model trained ✓")

# -----------------------------
# Generate recommendations
# -----------------------------
print("Generating recommendations...")

all_movie_ids = df["movie_id"].unique()
all_users = df["user_id"].unique()

recommendations = []

for user in all_users:
    user_likes = df[df["user_id"] == user]["movie_id"].tolist()

    for movie in all_movie_ids:
        if movie not in user_likes:  # avoid recommending already-liked movies
            score = model.predict(user, movie).est
            recommendations.append({
                "user_id": user,
                "movie_id": movie,
                "score": float(score),
            })

print(f"Generated {len(recommendations)} predictions.")

# -----------------------------
# Clear old recommendations
# -----------------------------
print("Clearing old recommendations...")

supabase.table("movie_recommendations").delete().neq("user_id", "NULL").execute()

# -----------------------------
# Insert new recommendations
# -----------------------------
print("Uploading new recommendations... This may take a few seconds...")

BATCH = 500
for i in range(0, len(recommendations), BATCH):
    chunk = recommendations[i:i+BATCH]
    supabase.table("movie_recommendations").insert(chunk).execute()

print("🎉 Recommendations updated successfully!")
