import { useState } from "react";
import { Heart, LockKeyhole } from "lucide-react";
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
      </button>
      {!canView ? (
        <div className="restricted-overlay">
          <span className="lock-mark" aria-hidden="true">
            <LockKeyhole />
          </span>
          <strong>Members only</strong>
          <small>Login to view</small>
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
      <div className="tile-meta" aria-label={`${image.title} details`}>
        <span>
          <strong>{image.title}</strong>
          <small>{image.tags[0] || image.location || "Lookbook"}</small>
        </span>
        <span className="like-count" aria-label={`${image.likes} likes`}>
          <Heart aria-hidden="true" />
          {image.likes}
        </span>
      </div>
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
