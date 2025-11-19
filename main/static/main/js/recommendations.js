import { supabase } from "./supabase.js";

console.log("✅ recommendations.js loaded");

const recommendationsDiv = document.getElementById("recommendations");
const userId = recommendationsDiv.dataset.userId;

const TMDB_KEY = "f8b7534aef60f21d1301d08c91637752"; // replace with your key

async function loadRecommendations() {
  if (!userId || userId === "None") {
    recommendationsDiv.innerHTML =
      "<p style='color:red;'>User not found.</p>";
    return;
  }

  recommendationsDiv.innerHTML = "<p>Loading recommendations...</p>";

  try {
    // 1️⃣ Fetch personalized recommendations from Supabase
    const { data: recs, error } = await supabase
      .from("movie_recommendations")
      .select("movie_id, score")
      .eq("user_id", userId)
      .order("score", { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!recs || recs.length === 0) {
      recommendationsDiv.innerHTML =
        "<p>No recommendations yet. Run the script to generate some!</p>";
      return;
    }

    // 2️⃣ Fetch full movie details from TMDB
    const tmdbMovies = [];
    for (const r of recs) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${r.movie_id}?api_key=${TMDB_KEY}`
        );
        const movieData = await res.json();
        movieData.rec_score = r.score; // include score for reference
        tmdbMovies.push(movieData);
      } catch (err) {
        console.error("TMDB fetch error for movie", r.movie_id, err);
      }
    }

    // 3️⃣ Display movies
    recommendationsDiv.innerHTML = "";
    tmdbMovies.forEach((movie) => {
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
    recommendationsDiv.innerHTML =
      "<p style='color:red;'>Error loading recommendations.</p>";
  }
}

loadRecommendations();
