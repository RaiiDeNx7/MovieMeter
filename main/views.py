from django.shortcuts import render, redirect
from django.contrib import messages
from supabase import create_client
from django.conf import settings

# Supabase setup
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
 
# -------------------------
# Movie search / homepage
# -------------------------
def index(request):
    return render(request, 'main/index.html')

# -------------------------
# Signup
# -------------------------
def signup_view(request):
    if request.method == 'POST':
        first_name = request.POST['first_name']
        last_name = request.POST['last_name']
        email = request.POST['email']
        password = request.POST['password']
        confirm = request.POST['confirm']

        if password != confirm:
            messages.error(request, "Passwords do not match.")
            return redirect('signup')

        try:
            # Sign up the user in Supabase Auth
            response = supabase.auth.sign_up({"email": email, "password": password})

            if response.user:
                # Insert user into your custom 'users' table
                supabase.table('users').insert({
                    'id': response.user.id,  # use Auth user ID
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': email
                }).execute()

                messages.success(request, "Account created! Please check your email to confirm.")
                return redirect('login')
            else:
                messages.info(request, "Signup successful! Check your email for confirmation link.")
                return redirect('login')

        except Exception as e:
            messages.error(request, f"Signup failed: {str(e)}")

    return render(request, 'main/signup.html')







# -------------------------
# Login
# -------------------------
def login_view(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']

        try:
            response = supabase.auth.sign_in_with_password({"email": email, "password": password})
            if response.user:
                request.session['user_id'] = response.user.id
                return redirect('profile')
            else:
                messages.error(request, "Invalid credentials")
        except Exception as e:
            messages.error(request, f"Error: {str(e)}")
    return render(request, 'main/login.html')

# -------------------------
# Profile
# -------------------------
def profile_view(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return redirect('login')
    return render(request, 'main/profile.html', {'user_id': user_id})

# -------------------------
# Logout
# -------------------------
def logout_view(request):
    request.session.flush()  # Clear session
    return redirect('login')

# -------------------------
# Recommendations API
# -------------------------
from django.http import JsonResponse
from django.shortcuts import redirect, render
import os
import requests
from supabase import create_client

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
TMDB_KEY = os.getenv("TMDB_KEY")  # put this in your .env

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def recommendations_view(request):
    """Render recommendations page"""
    if 'user_id' not in request.session:
        return redirect('login')
    return render(request, 'main/recommendations.html', {'user_id': request.session['user_id']})


def get_recommendations(request):
    user_id = request.GET.get("user_id")
    if not user_id:
        return JsonResponse({"error": "Missing user_id"}, status=400)

    # -------------------------
    # DEBUG: check Supabase query
    # -------------------------
    try:
        response = supabase.table("liked_movies").select("*").eq("user_id", user_id).execute()
        liked = response.data or []
        print("Supabase liked movies response:", liked)  # <-- debug log
    except Exception as e:
        print("Error fetching liked movies from Supabase:", e)
        return JsonResponse({"results": []})
    # -------------------------

    liked_ids = [m["movie_id"] for m in liked]
    print("Liked IDs:", liked_ids)  # <-- debug log

    if not liked_ids:
        return JsonResponse({"results": []})

    # 2️⃣ Fetch similar movies from TMDB (first 5 liked movies)
    similar_movies = []
    for movie_id in liked_ids[:5]:
        try:
            res = requests.get(
                f"https://api.themoviedb.org/3/movie/{movie_id}/similar",
                params={"api_key": TMDB_KEY, "language": "en-US", "page": 1},
                timeout=5
            )
            if res.status_code == 200:
                data = res.json().get("results", [])
                similar_movies.extend(data)
            else:
                print(f"TMDB API error for movie {movie_id}: {res.status_code}")
        except Exception as e:
            print(f"Error fetching TMDB similar movies for {movie_id}: {e}")

    # 3️⃣ Remove duplicates and already liked movies
    unique_movies = {m["id"]: m for m in similar_movies if m["id"] not in liked_ids}

    # 4️⃣ Return only necessary fields to JS
    results = []
    for m in unique_movies.values():
        results.append({
            "id": m.get("id"),
            "title": m.get("title"),
            "poster_path": m.get("poster_path"),
            "release_date": m.get("release_date"),
            "vote_average": m.get("vote_average")
        })

    return JsonResponse({"results": results})

