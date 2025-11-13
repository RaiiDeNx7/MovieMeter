import { supabase } from "./supabase.js";

console.log("✅ script.js loaded");

const apiKey = "f8b7534aef60f21d1301d08c91637752";
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");
const userId = "{{ request.session.user_id }}";

let likedMoviesSet = new Set();

/* -----------------------------
   Load liked movies first
------------------------------ */
window.addEventListener("DOMContentLoaded", async () => {
  if (userId && userId !== "None") {
    await loadLikedMovies();
  }
  await loadDefaultMovies();
});

/* -----------------------------
   Event: Search button
------------------------------ */
if (searchBtn && searchInput && resultsDiv) {
  searchBtn.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (query) {
      searchMovies(query);
    } else {
      resultsDiv.innerHTML = "<p>Please enter a movie name.</p>";
    }
  });
} else {
  console.error("❌ Missing DOM elements:", { searchBtn, searchInput, resultsDiv });
}

/* -----------------------------
   Load liked movies
------------------------------ */
async function loadLikedMovies() {
  try {
    const { data, error } = await supabase
      .from("liked_movies")
      .select("movie_id")
      .eq("user_id", userId);

    if (error) throw error;

    likedMoviesSet = new Set(data.map((m) => String(m.movie_id)));
    console.log("💾 Loaded liked movies:", likedMoviesSet);
  } catch (err) {
    console.error("Error loading liked movies:", err);
  }
}

/* -----------------------------
   Load default movies (most recent)
------------------------------ */
async function loadDefaultMovies() {
  const url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=en-US&page=1`;
  resultsDiv.innerHTML = "<p>Loading latest movies...</p>";

  try {
    const response = await fetch(url);
    const data = await response.json();
    displayResults(data.results || []);
  } catch (error) {
    console.error("Error fetching default movies:", error);
    resultsDiv.innerHTML = `<p style="color:red;">Error loading movies.</p>`;
  }
}

/* -----------------------------
   Search movies
------------------------------ */
async function searchMovies(query) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
  resultsDiv.innerHTML = "<p>Loading...</p>";

  try {
    const response = await fetch(url);
    const data = await response.json();
    displayResults(data.results || []);
  } catch (error) {
    console.error("Error searching movies:", error);
    resultsDiv.innerHTML = `<p style="color:red;">Error loading results.</p>`;
  }
}

/* -----------------------------
   Display movies with like toggle
------------------------------ */
function displayResults(movies) {
  resultsDiv.innerHTML = "";

  if (!movies || movies.length === 0) {
    resultsDiv.innerHTML = "<p>No movies found.</p>";
    return;
  }

  movies.forEach((movie) => {
    const poster = movie.poster_path
      ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
      : "https://via.placeholder.com/200x300?text=No+Image";

    const movieId = String(movie.id);
    const isLiked = likedMoviesSet.has(movieId);

    const movieDiv = document.createElement("div");
    movieDiv.classList.add("movie");
    movieDiv.innerHTML = `
      <img src="${poster}" alt="${movie.title}">
      <h3>${movie.title}</h3>
      <p>Release: ${movie.release_date || "N/A"}</p>
      <button class="like-btn ${isLiked ? "liked" : ""}"
        data-id="${movieId}"
        data-title="${movie.title}"
        data-poster="${poster}"
        data-date="${movie.release_date}">
        ${isLiked ? "💔 Unlike" : "❤️ Like"}
      </button>
    `;
    resultsDiv.appendChild(movieDiv);
  });

  document.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const movie = {
        id: e.target.dataset.id,
        title: e.target.dataset.title,
        poster: e.target.dataset.poster,
        date: e.target.dataset.date,
      };
      await toggleLike(movie, e.target);
    });
  });
}

/* -----------------------------
   Toggle Like/Unlike
------------------------------ */
async function toggleLike(movie, button) {
  if (!userId || userId === "None") {
    alert("You must be logged in to like movies!");
    return;
  }

  const movieId = String(movie.id);
  const isLiked = likedMoviesSet.has(movieId);

  try {
    if (isLiked) {
      // Unlike
      const { error } = await supabase
        .from("liked_movies")
        .delete()
        .eq("user_id", userId)
        .eq("movie_id", movieId);

      if (error) throw error;

      likedMoviesSet.delete(movieId);
      button.textContent = "❤️ Like";
      button.classList.remove("liked");
      console.log(`💔 Unliked: ${movie.title}`);
    } else {
      // Like
      const { error } = await supabase
        .from("liked_movies")
        .insert([
          {
            user_id: userId,
            movie_id: movie.id,
            title: movie.title,
            poster_path: movie.poster,
            release_date: movie.date,
          },
        ]);

      if (error) throw error;

      likedMoviesSet.add(movieId);
      button.textContent = "💔 Unlike";
      button.classList.add("liked");
      console.log(`❤️ Liked: ${movie.title}`);
    }
  } catch (err) {
    console.error("Error toggling like:", err);
    alert("Error updating like status. Check console for details.");
  }
}
