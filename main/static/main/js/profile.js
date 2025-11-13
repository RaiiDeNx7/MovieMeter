import { supabase } from "./supabase.js";

console.log("✅ profile.js loaded");

const userId = "{{ request.session.user_id }}";
const likedMoviesDiv = document.getElementById("likedMovies");

/* -----------------------------
   Load liked movies on page load
------------------------------ */
window.addEventListener("DOMContentLoaded", async () => {
  if (!userId || userId === "None") {
    likedMoviesDiv.innerHTML = "<p>Please log in to see your liked movies.</p>";
    return;
  }

  await loadLikedMovies();
});

/* -----------------------------
   Load all liked movies from Supabase
------------------------------ */
async function loadLikedMovies() {
  likedMoviesDiv.innerHTML = "<p>Loading your liked movies...</p>";

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
    data.forEach((movie) => displayMovie(movie));
  } catch (err) {
    console.error("Error loading liked movies:", err);
    likedMoviesDiv.innerHTML = "<p style='color:red;'>Error loading liked movies.</p>";
  }
}

/* -----------------------------
   Display liked movie cards
------------------------------ */
function displayMovie(movie) {
  const movieDiv = document.createElement("div");
  movieDiv.classList.add("liked-movie");
  movieDiv.dataset.id = movie.movie_id;

  const poster = movie.poster_path
    ? movie.poster_path
    : "https://via.placeholder.com/200x300?text=No+Image";

  movieDiv.innerHTML = `
    <img src="${poster}" alt="${movie.title}">
    <h3>${movie.title}</h3>
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

/* -----------------------------
   Unlike movie (remove from Supabase and DOM)
------------------------------ */
async function unlikeMovie(movieId, movieDiv) {
  if (!userId || userId === "None") {
    alert("You must be logged in to unlike movies!");
    return;
  }

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
