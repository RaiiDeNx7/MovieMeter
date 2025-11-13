import { supabase } from "./supabase.js";

console.log("🎬 recommendations.js loaded");

const recommendationsDiv = document.getElementById("recommendations");
const userId = recommendationsDiv.dataset.userId; // read from HTML

async function loadRecommendations() {
  if (!userId) {
    recommendationsDiv.innerHTML = "<p style='color:red'>User not found.</p>";
    return;
  }

  recommendationsDiv.innerHTML = "<p>Loading recommendations...</p>";

  try {
    const res = await fetch(`/api/recommendations/?user_id=${userId}`);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      recommendationsDiv.innerHTML = "<p>No recommendations yet. Like some movies first!</p>";
      return;
    }

    recommendationsDiv.innerHTML = "";
    data.results.forEach((movie) => {
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
    recommendationsDiv.innerHTML = `<p style="color:red;">Error loading recommendations.</p>`;
    console.error("Error fetching recommendations:", err);
  }
}

loadRecommendations();
