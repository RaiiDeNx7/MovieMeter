console.log("✅ script.js loaded");

const apiKey = "f8b7534aef60f21d1301d08c91637752"; // Replace with your actual TMDB key
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");

if (!searchBtn || !searchInput || !resultsDiv) {
  console.error("❌ DOM elements missing:", { searchBtn, searchInput, resultsDiv });
} else {
  searchBtn.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (query) {
      searchMovies(query);
    } else {
      resultsDiv.innerHTML = "<p>Please enter a movie name.</p>";
    }
  });
}

async function searchMovies(query) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
  console.log("🎬 Searching TMDB for:", query);
  resultsDiv.innerHTML = "<p>Loading...</p>";

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      resultsDiv.innerHTML = "<p>No movies found.</p>";
      return;
    }

    displayResults(data.results);
  } catch (error) {
    console.error("Error fetching data:", error);
    resultsDiv.innerHTML = `<p style="color:red;">Error loading results: ${error.message}</p>`;
  }
}

function displayResults(movies) {
  resultsDiv.innerHTML = "";
  movies.forEach((movie) => {
    const poster = movie.poster_path
      ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
      : "https://via.placeholder.com/200x300?text=No+Image";

    const movieDiv = document.createElement("div");
    movieDiv.classList.add("movie");
    movieDiv.innerHTML = `
      <img src="${poster}" alt="${movie.title}">
      <h3>${movie.title}</h3>
      <p>Release: ${movie.release_date || "N/A"}</p>
    `;
    resultsDiv.appendChild(movieDiv);
  });
}
