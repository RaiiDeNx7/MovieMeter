import { supabase } from "./supabase.js";

console.log("✅ recommendations.js loaded");

// Get user_id from HTML data attribute
const recommendationsDiv = document.getElementById("recommendations");
const userId = recommendationsDiv.dataset.userId;

const TMDB_KEY = "f8b7534aef60f21d1301d08c91637752"; // replace with your key

async function loadRecommendations() {
  if (!userId || userId === "None") {
    recommendationsDiv.innerHTML = "<p style='color:red;'>User not found.</p>";
    return;
  }

  recommendationsDiv.innerHTML = "<p>Loading recommendations...</p>";

  try {
    // 1️⃣ Get liked movies from Supabase
    const { data: likedMovies, error } = await supabase
      .from("liked_movies")
      .select("movie_id")
      .eq("user_id", userId);

    if (error) throw error;

    if (!likedMovies || likedMovies.length === 0) {
      recommendationsDiv.innerHTML = "<p>No recommendations yet. Like some movies first!</p>";
      return;
    }

    const likedIds = likedMovies.map((m) => m.movie_id);

    console.log("Liked movie IDs:", likedIds);

    // 2️⃣ Fetch similar movies from TMDb for top 5 liked movies
    let similarMovies = [];
    for (const movieId of likedIds.slice(0, 5)) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${TMDB_KEY}`
        );
        const data = await res.json();
        similarMovies = similarMovies.concat(data.results || []);
      } catch (err) {
        console.error("Error fetching similar movies:", err);
      }
    }

    // 3️⃣ Remove duplicates and already liked movies
    const uniqueMovies = {};
    similarMovies.forEach((m) => {
      if (!likedIds.includes(m.id)) {
        uniqueMovies[m.id] = m;
      }
    });

    const recommendations = Object.values(uniqueMovies);

    if (recommendations.length === 0) {
      recommendationsDiv.innerHTML = "<p>No recommendations available based on your liked movies.</p>";
      return;
    }

    // 4️⃣ Display recommendations
    recommendationsDiv.innerHTML = "";
    recommendations.forEach((movie) => {
      const poster = movie.poster_path
        ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
        : "https://via.placeholder.com/200x300?text=No+Image";

      const div = document.createElement("div");
      div.classList.add("movie");
      div.innerHTML = `
        <img src="${poster}" alt="${movie.title}">
        <h3>${movie.title}</h3>
        <p>Release: ${movie.release_date || "N/A"}</p>
        <p>⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}</p>
      `;
      recommendationsDiv.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading recommendations:", err);
    recommendationsDiv.innerHTML = "<p style='color:red;'>Error loading recommendations.</p>";
  }
}

// Load recommendations when page loads
loadRecommendations();
