import { useState } from "react";
import { isRestrictedImage } from "../lib/gallery.js";

function ImageTile({ image, restrictedTags, user, onOpen, onLogin, onRequestAccess }) {
  const [hasError, setHasError] = useState(false);
  const restricted = isRestrictedImage(image, restrictedTags);
  const canView = Boolean(user) || !restricted;

  function handleOpen() {
    if (!canView) {
      onLogin();
      return;
    }

    onOpen(image);
  }

  return (
    <article className={`image-tile${!canView ? " is-restricted" : ""}`}>
      <button type="button" onClick={handleOpen}>
        {hasError ? (
          <div className="image-fallback" role="img" aria-label={`${image.title} unavailable`}>
            Image unavailable
          </div>
        ) : (
          <img
            src={image.src}
            alt={image.title}
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
        <span className="tile-caption">
          <strong>{image.title}</strong>
          <small>{image.location || "Location TBD"}</small>
        </span>
      </button>
      {!canView ? (
        <div className="restricted-overlay">
          <strong>Members only</strong>
          <div>
            <button
              className="text-button"
              type="button"
              onClick={onLogin}
              aria-label={`Login to view ${image.title}`}
            >
              Login to view
            </button>
            <button
              className="text-button"
              type="button"
              onClick={onRequestAccess}
              aria-label={`Request access for ${image.title}`}
            >
              Request access
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function ImageGrid({
  images,
  restrictedTags,
  user,
  onOpen,
  onLogin,
  onRequestAccess
}) {
  return (
    <section className="image-grid" aria-label="Gallery images">
      {images.map((image) => (
        <ImageTile
          key={image.id}
          image={image}
          restrictedTags={restrictedTags}
          user={user}
          onOpen={onOpen}
          onLogin={onLogin}
          onRequestAccess={onRequestAccess}
        />
      ))}
    </section>
  );
}
