import React from 'react';

const FALLBACK = "https://placehold.co/400x600/14141e/7878a0?text=No+Poster";

const MovieCard = ({
  movie, index,
  onOpen,
  onToggleWatchlist, isWatchlisted,
  onToggleWatched,   isWatched,
}) => {
  const { imdbID, Year, Poster, Title, Type } = movie;

  return (
    <div
      className={`movie${isWatched ? " is-watched" : ""}`}
      style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}
      onClick={() => onOpen(imdbID)}
    >
      <div className="movie-poster">
        <img
          src={Poster !== "N/A" ? Poster : FALLBACK}
          alt={Title}
          loading="lazy"
        />
        <div className="movie-overlay">
          <div className="play-btn">▶</div>
        </div>

        {Type && <span className="movie-badge">{Type}</span>}
        {isWatched && <span className="watched-stamp">✓</span>}
      </div>

      <div className="movie-info">
        <p className="movie-year">{Year}</p>
        <h3 className="movie-title">{Title}</h3>

        <div className="movie-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className={`action-btn${isWatchlisted ? " action-active-red" : ""}`}
            onClick={() => onToggleWatchlist(movie)}
            title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
          >
            {isWatchlisted ? "♥" : "♡"}
          </button>
          <button
            className={`action-btn${isWatched ? " action-active-green" : ""}`}
            onClick={() => onToggleWatched(movie)}
            title={isWatched ? "Unmark as watched" : "Mark as watched"}
          >
            {isWatched ? "✓" : "👁"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
