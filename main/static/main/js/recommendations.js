import { supabase } from "./supabase.js";

console.log("✅ recommendations.js loaded");

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
    // 1️⃣ Fetch personalized recommendations from Supabase (top 20 by score)
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

    // 2️⃣ Fetch full movie details from TMDB in parallel
    const tmdbMovies = await Promise.all(
      recs.map(async (r) => {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/movie/${r.movie_id}?api_key=${TMDB_KEY}`
          );
          const movieData = await res.json();
          movieData.rec_score = r.score; // include ML score
          return movieData;
        } catch (err) {
          console.error("TMDB fetch error for movie", r.movie_id, err);
          return null;
        }
      })
    );

    // Filter out failed fetches
    const filteredMovies = tmdbMovies.filter((m) => m !== null);

    // 3️⃣ Display movies
    recommendationsDiv.innerHTML = "";
    filteredMovies.forEach((movie) => {
      const poster = movie.poster_path
        ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
        : "https://via.placeholder.com/200x300?text=No+Image";

      const div = document.createElement("div");
      div.classList.add("movie");

      div.innerHTML = `
        <img src="${poster}" alt="${movie.title}">
        <h3>${movie.title}</h3>
        <p>Release: ${movie.release_date || "N/A"}</p>
        <p>⭐ TMDB: ${movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"} | ML Score: ${movie.rec_score.toFixed(2)}</p>
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
