import { useState, useEffect, useRef } from 'react';
import MovieCard  from "./MovieCard";
import MovieModal from "./MovieModal";
import SearchIcon from "./search.svg";
import './App.css';

const API_URL = "https://www.omdbapi.com?apikey=88f23ca";

const GENRES = [
  "Action","Comedy","Drama","Horror","Thriller",
  "Sci-Fi","Animation","Romance","Crime","Adventure",
];

const getPaginationPages = (cur, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  const left  = Math.max(1, cur - 2);
  const right = Math.min(total, cur + 2);
  if (left > 1)     { pages.push(1); if (left > 2) pages.push("…"); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total){ if (right < total - 1) pages.push("…"); pages.push(total); }
  return pages;
};

const App = () => {
  /* ── search ── */
  const [searchTerm,    setSearchTerm]    = useState("");
  const [movies,        setMovies]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [searched,      setSearched]      = useState(false);
  const [totalResults,  setTotalResults]  = useState(0);
  const [currentPage,   setCurrentPage]   = useState(1);

  /* ── filters ── */
  const [typeFilter,   setTypeFilter]   = useState("");
  const [sortBy,       setSortBy]       = useState("default");
  const [yearFilter,   setYearFilter]   = useState("");

  /* ── recent searches ── */
  const [recentSearches, setRecentSearches] = useState(
    () => JSON.parse(localStorage.getItem("mh_recent") || "[]")
  );
  const [showRecent, setShowRecent] = useState(false);

  /* ── modal ── */
  const [modalMovie,   setModalMovie]   = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  /* ── persistent ── */
  const [watchlist, setWatchlist] = useState(
    () => JSON.parse(localStorage.getItem("mh_watchlist") || "[]")
  );
  const [watched, setWatched] = useState(
    () => JSON.parse(localStorage.getItem("mh_watched") || "[]")
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("mh_theme") || "dark"
  );

  /* ── view ── */
  const [view, setView] = useState("search");
  const [toast, setToast] = useState("");

  const searchRef        = useRef(null);
  const searchWrapperRef = useRef(null);

  /* ── theme ── */
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("mh_theme", theme);
  }, [theme]);

  /* ── initial load from URL ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q    = params.get("q");
    const page = parseInt(params.get("page") || "1", 10);
    if (q) {
      setSearchTerm(q);
      doSearch(q, page, "", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setModalMovie(null);
        setShowRecent(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ── close recent dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowRecent(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── search ── */
  const doSearch = async (title, page = 1, type = typeFilter, year = yearFilter) => {
    if (!title?.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setShowRecent(false);
    try {
      let url = `${API_URL}&s=${encodeURIComponent(title)}&page=${page}`;
      if (type) url += `&type=${type}`;
      if (year) url += `&y=${year}`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      if (data.Response === "True") {
        setMovies(data.Search);
        setTotalResults(parseInt(data.totalResults, 10));
        setCurrentPage(page);
        addToRecent(title);
        const p = new URLSearchParams();
        p.set("q", title);
        if (page > 1) p.set("page", String(page));
        window.history.pushState({}, "", "?" + p.toString());
      } else {
        setMovies([]);
        setTotalResults(0);
        if (data.Error !== "Movie not found!") setError(data.Error);
      }
    } catch {
      setMovies([]);
      setError("Could not reach the movie database. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    doSearch(searchTerm, 1, typeFilter, yearFilter);
    setView("search");
  };

  const handleTypeFilter = (type) => {
    setTypeFilter(type);
    if (searched) doSearch(searchTerm, 1, type, yearFilter);
  };

  /* ── recent searches ── */
  const addToRecent = (term) => {
    setRecentSearches(prev => {
      const next = [term, ...prev.filter(s => s !== term)].slice(0, 8);
      localStorage.setItem("mh_recent", JSON.stringify(next));
      return next;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("mh_recent");
  };

  /* ── modal ── */
  const openModal = async (imdbID) => {
    setModalLoading(true);
    setModalMovie({ loading: true });
    try {
      const res  = await fetch(`${API_URL}&i=${imdbID}&plot=full`);
      const data = await res.json();
      setModalMovie(data);
    } catch {
      setModalMovie(null);
    } finally {
      setModalLoading(false);
    }
  };

  /* ── watchlist / watched ── */
  const toggleWatchlist = (movie) => {
    setWatchlist(prev => {
      const has  = prev.some(m => m.imdbID === movie.imdbID);
      const next = has ? prev.filter(m => m.imdbID !== movie.imdbID) : [...prev, movie];
      localStorage.setItem("mh_watchlist", JSON.stringify(next));
      showToast(has ? "Removed from watchlist" : "Added to watchlist");
      return next;
    });
  };

  const toggleWatched = (movie) => {
    setWatched(prev => {
      const has  = prev.some(m => m.imdbID === movie.imdbID);
      const next = has ? prev.filter(m => m.imdbID !== movie.imdbID) : [...prev, movie];
      localStorage.setItem("mh_watched", JSON.stringify(next));
      showToast(has ? "Unmarked as watched" : "Marked as watched ✓");
      return next;
    });
  };

  /* ── share ── */
  const shareMovie = (movie) => {
    const url = `${window.location.origin}?q=${encodeURIComponent(movie.Title)}`;
    navigator.clipboard?.writeText(url)
      .then(() => showToast("Link copied!"))
      .catch(() => showToast(url));
  };

  /* ── modal search (from clickable names / similar movies) ── */
  const handleModalSearch = (query) => {
    setSearchTerm(query);
    setView("search");
    doSearch(query, 1, typeFilter, yearFilter);
  };

  /* ── toast ── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  /* ── sort ── */
  const sortMovies = (list) => {
    const s = [...list];
    if (sortBy === "year-desc") return s.sort((a, b) => parseInt(b.Year) - parseInt(a.Year));
    if (sortBy === "year-asc")  return s.sort((a, b) => parseInt(a.Year) - parseInt(b.Year));
    if (sortBy === "title-asc") return s.sort((a, b) => a.Title.localeCompare(b.Title));
    return s;
  };

  /* ── derived ── */
  const totalPages    = Math.ceil(totalResults / 10);
  const isWatchlisted = (id) => watchlist.some(m => m.imdbID === id);
  const isWatched     = (id) => watched.some(m => m.imdbID === id);
  const displayMovies = view === "watchlist" ? watchlist : sortMovies(movies);
  const showEmpty     = !loading && displayMovies.length === 0 && (searched || view === "watchlist");
  const showSearch    = view === "search";


  /* ── render ── */
  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-top">
          <div className="logo" onClick={() => setView("search")} role="button" tabIndex={0}>
            <span className="logo-icon">🎬</span>
            <h1>Movie Hub</h1>
          </div>
          <div className="header-actions">
            <button
              className={`nav-btn${view === "watchlist" ? " nav-active" : ""}`}
              onClick={() => setView(v => v === "watchlist" ? "search" : "watchlist")}
            >
              <span>♥</span>
              <span className="nav-label">Watchlist</span>
              {watchlist.length > 0 && <span className="badge">{watchlist.length}</span>}
            </button>
            <button
              className="icon-btn"
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀" : "☽"}
            </button>
          </div>
        </div>
        <p className="tagline">Discover your next favourite film</p>
      </header>

      {/* ── Search area ── */}
      {showSearch && (
        <>
          <div className="search-wrapper" ref={searchWrapperRef}>
            <div className="search-col">
              <div className="search">
                <input
                  ref={searchRef}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  onFocus={() => recentSearches.length > 0 && setShowRecent(true)}
                  placeholder="Search movies, series… (press / to focus)"
                  autoComplete="off"
                />
                <button className="search-btn" onClick={handleSearch}>
                  <img src={SearchIcon} alt="Search" />
                </button>
              </div>

              {/* Recent searches dropdown */}
              {showRecent && recentSearches.length > 0 && (
                <div className="recent-dropdown">
                  <div className="recent-header">
                    <span>Recent</span>
                    <button className="recent-clear" onClick={clearRecent}>Clear all</button>
                  </div>
                  {recentSearches.map(term => (
                    <button
                      key={term}
                      className="recent-item"
                      onMouseDown={() => {
                        setSearchTerm(term);
                        doSearch(term, 1, typeFilter, yearFilter);
                      }}
                    >
                      <span className="recent-icon">↺</span> {term}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Genre chips */}
          <div className="genre-chips">
            {GENRES.map(g => (
              <button
                key={g}
                className="chip"
                onClick={() => { setSearchTerm(g); doSearch(g, 1, typeFilter, yearFilter); }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Filters bar */}
          {searched && (
            <div className="filters-bar">
              <div className="type-tabs">
                {[["", "All"], ["movie", "Movies"], ["series", "Series"], ["episode", "Episodes"]].map(([val, label]) => (
                  <button
                    key={val}
                    className={`type-tab${typeFilter === val ? " tab-active" : ""}`}
                    onClick={() => handleTypeFilter(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="filters-right">
                <div className="year-filter-wrap">
                  <input
                    type="number"
                    className="year-input"
                    placeholder="Year"
                    value={yearFilter}
                    min="1888"
                    max="2099"
                    onChange={e => setYearFilter(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && doSearch(searchTerm, 1, typeFilter, e.target.value)}
                  />
                  {yearFilter && (
                    <button className="year-clear" onClick={() => { setYearFilter(""); doSearch(searchTerm, 1, typeFilter, ""); }}>✕</button>
                  )}
                </div>
                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="default">Sort: Relevance</option>
                  <option value="year-desc">Year: Newest first</option>
                  <option value="year-asc">Year: Oldest first</option>
                  <option value="title-asc">Title: A – Z</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Section headers ── */}
      {view === "watchlist" && (
        <div className="section-header">
          <h2>My Watchlist</h2>
          <span>{watchlist.length} {watchlist.length === 1 ? "film" : "films"}</span>
        </div>
      )}
      {/* ── Results info ── */}
      {showSearch && !loading && movies.length > 0 && (
        <p className="results-info">
          <strong>{totalResults}</strong> results — page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          {yearFilter && <span className="filter-tag"> · {yearFilter}</span>}
        </p>
      )}

      {/* ── Error ── */}
      {error && <div className="error-banner"><span>⚠</span> {error}</div>}

      {/* ── Grid / loading / empty ── */}
      {view !== "stats" && (
        loading ? (
          <div className="loading">
            <div className="spinner" />
            <span>Searching movies…</span>
          </div>
        ) : displayMovies.length > 0 ? (
          <div className="container">
            {displayMovies.map((movie, i) => (
              <MovieCard
                key={movie.imdbID}
                movie={movie}
                index={i}
                onOpen={openModal}
                onToggleWatchlist={toggleWatchlist}
                isWatchlisted={isWatchlisted(movie.imdbID)}
                onToggleWatched={toggleWatched}
                isWatched={isWatched(movie.imdbID)}
              />
            ))}
          </div>
        ) : showEmpty ? (
          <div className="empty">
            <span className="empty-icon">{view === "watchlist" ? "🎞" : "🎥"}</span>
            <h2>{view === "watchlist" ? "Your watchlist is empty" : "No movies found"}</h2>
            <p>
              {view === "watchlist"
                ? "Heart a movie to save it here."
                : "Try a different title or browse by genre above."}
            </p>
          </div>
        ) : null
      )}

      {/* ── Pagination ── */}
      {showSearch && !loading && totalPages > 1 && (
        <nav className="pagination" aria-label="Results pages">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => doSearch(searchTerm, currentPage - 1, typeFilter, yearFilter)}
          >
            ← Prev
          </button>
          <div className="page-nums">
            {getPaginationPages(currentPage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="page-ellipsis">…</span>
              ) : (
                <button
                  key={p}
                  className={`page-num${p === currentPage ? " page-current" : ""}`}
                  onClick={() => doSearch(searchTerm, p, typeFilter, yearFilter)}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => doSearch(searchTerm, currentPage + 1, typeFilter, yearFilter)}
          >
            Next →
          </button>
        </nav>
      )}

      {/* ── Footer ── */}
      <footer className="footer">
        Powered by{" "}
        <a href="https://www.omdbapi.com" target="_blank" rel="noreferrer">OMDb API</a>
        {" "}· <kbd>/</kbd> to search · <kbd>Esc</kbd> to close
      </footer>

      {/* ── Toast ── */}
      {toast && <div className="toast" role="status">{toast}</div>}

      {/* ── Modal ── */}
      {modalMovie && (
        <MovieModal
          movie={modalMovie}
          loading={modalLoading}
          onClose={() => setModalMovie(null)}
          onToggleWatchlist={toggleWatchlist}
          isWatchlisted={modalMovie.imdbID ? isWatchlisted(modalMovie.imdbID) : false}
          onToggleWatched={toggleWatched}
          isWatched={modalMovie.imdbID ? isWatched(modalMovie.imdbID) : false}
          onShare={shareMovie}
          onSearch={handleModalSearch}
          onOpenMovie={openModal}
        />
      )}
    </div>
  );
};

export default App;
