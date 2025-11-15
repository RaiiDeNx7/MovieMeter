import { supabase } from "./supabase.js";

console.log("✅ profile.js loaded");

// TMDb API key
const TMDB_KEY = "f8b7534aef60f21d1301d08c91637752";

// Get user_id from data attribute
const likedMoviesDiv = document.getElementById("likedMovies");
const userId = likedMoviesDiv.dataset.userId;

if (!userId || userId === "None") {
  likedMoviesDiv.innerHTML = "<p>Please log in to see your liked movies.</p>";
} else {
  loadLikedMovies();
}

async function loadLikedMovies() {
  likedMoviesDiv.innerHTML = "<p>Loading liked movies...</p>";

  try {
    const { data, error } = await supabase
      .from("liked_movies")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    if (!data || data.length === 0) {
      likedMoviesDiv.innerHTML = "<p>You haven't liked any movies yet.</p>";
      return;
    }

    likedMoviesDiv.innerHTML = "";

    // Fetch ratings for each liked movie
    for (const movie of data) {
      await displayMovie(movie);
    }
  } catch (err) {
    console.error("Error loading liked movies:", err);
    likedMoviesDiv.innerHTML = "<p style='color:red;'>Failed to load liked movies.</p>";
  }
}

async function displayMovie(movie) {
  let rating = "N/A";

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.movie_id}?api_key=${TMDB_KEY}`
    );
    const tmdbData = await res.json();
    if (tmdbData.vote_average) {
      rating = tmdbData.vote_average.toFixed(1);
    }
  } catch (err) {
    console.warn("Could not fetch TMDb rating for movie", movie.movie_id, err);
  }

  const movieDiv = document.createElement("div");
  movieDiv.classList.add("liked-movie");
  movieDiv.dataset.id = movie.movie_id;

  const poster = movie.poster_path
    ? movie.poster_path
    : "https://via.placeholder.com/200x300?text=No+Image";

  movieDiv.innerHTML = `
    <img src="${poster}" alt="${movie.title}">
    <h3>${movie.title}</h3>
    <p>⭐ Rating: ${rating}</p>
    <p>Release: ${movie.release_date || "N/A"}</p>
    <button class="like-btn liked" data-id="${movie.movie_id}">💔 Unlike</button>
  `;

  likedMoviesDiv.appendChild(movieDiv);

  // Add unlike functionality
  const unlikeBtn = movieDiv.querySelector(".like-btn");
  unlikeBtn.addEventListener("click", async () => {
    await unlikeMovie(movie.movie_id, movieDiv);
  });
}

async function unlikeMovie(movieId, movieDiv) {
  try {
    const { error } = await supabase
      .from("liked_movies")
      .delete()
      .eq("user_id", userId)
      .eq("movie_id", movieId);

    if (error) throw error;

    movieDiv.remove();
    console.log(`💔 Unliked movie ${movieId}`);
  } catch (err) {
    console.error("Error unliking movie:", err);
    alert("Error unliking movie. Check console for details.");
  }
}
