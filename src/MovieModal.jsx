import React, { useEffect, useState } from 'react'; // useState kept for similar movies
import './MovieModal.css';

const API_URL  = "https://www.omdbapi.com?apikey=88f23ca";
const FALLBACK = "https://placehold.co/300x450/14141e/7878a0?text=No+Poster";
const FALLBACK_SM = "https://placehold.co/100x150/14141e/7878a0?text=?";

const ratingColor = (v) => {
  const n = parseFloat(v);
  if (n >= 7.5) return "#4ade80";
  if (n >= 6)   return "#facc15";
  return "#f87171";
};

const MovieModal = ({
  movie, loading,
  onClose,
  onToggleWatchlist, isWatchlisted,
  onToggleWatched,   isWatched,
  onShare,
  onSearch,
  onOpenMovie,
}) => {
  const [similar, setSimilar] = useState([]);

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    setSimilar([]);
  }, [movie?.imdbID]);

  /* fetch similar movies by first significant title word */
  useEffect(() => {
    if (!movie?.Title || loading) return;
    const SKIP = new Set(["The","A","An","Of","In","On","At","To","And"]);
    const keyword = movie.Title.split(" ").find(w => !SKIP.has(w)) || movie.Title.split(" ")[0];
    fetch(`${API_URL}&s=${encodeURIComponent(keyword)}&type=movie`)
      .then(r => r.json())
      .then(data => {
        if (data.Response === "True") {
          setSimilar(data.Search.filter(m => m.imdbID !== movie.imdbID).slice(0, 8));
        }
      })
      .catch(() => {});
  }, [movie?.Title, movie?.imdbID, loading]);

  const handleNameClick = (name) => {
    onSearch(name);
    onClose();
  };

  const trailerHref = movie
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.Title} ${movie.Year} official trailer`)}`
    : "#";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-close-bar">
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading ? (
          <div className="modal-loading">
            <div className="spinner" />
            <span>Loading details…</span>
          </div>
        ) : (
          <>
            <div className="modal-inner">

              {/* ── Left col ── */}
              <div className="modal-left">
                <div className="modal-poster-wrap">
                  <img src={movie.Poster !== "N/A" ? movie.Poster : FALLBACK} alt={movie.Title} />
                </div>
                <div className="modal-poster-actions">
                  <a className="mposter-btn btn-trailer" href={trailerHref} target="_blank" rel="noreferrer">
                    ▶ Watch Trailer
                  </a>
                  <button
                    className={`mposter-btn${isWatchlisted ? " btn-active-red" : ""}`}
                    onClick={() => onToggleWatchlist(movie)}
                  >
                    {isWatchlisted ? "♥ In Watchlist" : "♡ Watchlist"}
                  </button>
                  <button
                    className={`mposter-btn${isWatched ? " btn-active-green" : ""}`}
                    onClick={() => onToggleWatched(movie)}
                  >
                    {isWatched ? "✓ Watched" : "👁 Mark Watched"}
                  </button>
                  <button className="mposter-btn btn-share" onClick={() => onShare(movie)}>
                    ↗ Share
                  </button>
                </div>

                {/* IMDb link */}
                {movie.imdbID && (
                  <a
                    className="imdb-link"
                    href={`https://www.imdb.com/title/${movie.imdbID}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on IMDb ↗
                  </a>
                )}
              </div>

              {/* ── Right col ── */}
              <div className="modal-right">
                <div className="modal-meta-row">
                  {movie.Type    && <span className="meta-chip type-chip">{movie.Type}</span>}
                  {movie.Rated && movie.Rated !== "N/A"     && <span className="meta-chip">{movie.Rated}</span>}
                  {movie.Runtime && movie.Runtime !== "N/A" && <span className="meta-chip">⏱ {movie.Runtime}</span>}
                  {movie.Year    && <span className="meta-chip">{movie.Year}</span>}
                </div>

                <h2 className="modal-title">{movie.Title}</h2>

                {movie.Genre && movie.Genre !== "N/A" && (
                  <div className="modal-genres">
                    {movie.Genre.split(", ").map(g => (
                      <span key={g} className="genre-tag">{g}</span>
                    ))}
                  </div>
                )}

                {/* External ratings */}
                <div className="modal-ratings">
                  {movie.imdbRating && movie.imdbRating !== "N/A" && (
                    <div className="rating-pill">
                      <span className="rating-src">IMDb</span>
                      <span className="rating-val" style={{ color: ratingColor(movie.imdbRating) }}>
                        ★ {movie.imdbRating}
                      </span>
                      {movie.imdbVotes && movie.imdbVotes !== "N/A" && (
                        <span className="rating-votes">{movie.imdbVotes}</span>
                      )}
                    </div>
                  )}
                  {movie.Ratings?.filter(r => r.Source !== "Internet Movie Database").map(r => (
                    <div key={r.Source} className="rating-pill">
                      <span className="rating-src">
                        {r.Source.replace("Rotten Tomatoes", "RT").replace("Metacritic", "Meta")}
                      </span>
                      <span className="rating-val">{r.Value}</span>
                    </div>
                  ))}
                </div>

                {movie.Plot && movie.Plot !== "N/A" && (
                  <p className="modal-plot">{movie.Plot}</p>
                )}

                {/* Facts with clickable names */}
                <dl className="modal-facts">
                  {movie.Director && movie.Director !== "N/A" && (
                    <React.Fragment>
                      <dt>Director</dt>
                      <dd>
                        {movie.Director.split(", ").map((n, i, arr) => (
                          <React.Fragment key={n}>
                            <button className="name-btn" onClick={() => handleNameClick(n)}>{n}</button>
                            {i < arr.length - 1 && ", "}
                          </React.Fragment>
                        ))}
                      </dd>
                    </React.Fragment>
                  )}
                  {movie.Actors && movie.Actors !== "N/A" && (
                    <React.Fragment>
                      <dt>Cast</dt>
                      <dd>
                        {movie.Actors.split(", ").map((n, i, arr) => (
                          <React.Fragment key={n}>
                            <button className="name-btn" onClick={() => handleNameClick(n)}>{n}</button>
                            {i < arr.length - 1 && ", "}
                          </React.Fragment>
                        ))}
                      </dd>
                    </React.Fragment>
                  )}
                  {[
                    ["Language",   movie.Language],
                    ["Country",    movie.Country],
                    ["Released",   movie.Released],
                    ["Box Office", movie.BoxOffice],
                    ["Awards",     movie.Awards],
                  ].filter(([, v]) => v && v !== "N/A").map(([label, value]) => (
                    <React.Fragment key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </React.Fragment>
                  ))}
                </dl>

              </div>
            </div>

            {/* ── Similar movies ── */}
            {similar.length > 0 && (
              <div className="similar-section">
                <p className="similar-heading">You Might Also Like</p>
                <div className="similar-scroll">
                  {similar.map(m => (
                    <div key={m.imdbID} className="similar-card" onClick={() => onOpenMovie(m.imdbID)}>
                      <img
                        src={m.Poster !== "N/A" ? m.Poster : FALLBACK_SM}
                        alt={m.Title}
                        loading="lazy"
                      />
                      <p className="similar-title">{m.Title}</p>
                      <p className="similar-year">{m.Year}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MovieModal;
