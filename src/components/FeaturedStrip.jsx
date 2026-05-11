import { ArrowLeft, ArrowRight } from "lucide-react";
import { isRestrictedImage } from "../lib/gallery.js";

export default function FeaturedStrip({
  siteTitle,
  image,
  restrictedTags,
  user,
  onOpen,
  onLogin,
  onRequestAccess,
  onPrevious,
  onNext
}) {
  if (!image) {
    return (
      <section className="featured-strip">
        <div className="featured-copy">
        <p className="kicker">Now Showing</p>
        <h1>{siteTitle}</h1>
        <p>No images are available yet.</p>
        </div>
        <div className="featured-empty" aria-hidden="true" />
      </section>
    );
  }

  const restricted = isRestrictedImage(image, restrictedTags);
  const canView = Boolean(user) || !restricted;

  function handleOpen() {
    if (!canView) {
      onLogin();
      return;
    }

    onOpen();
  }

  return (
    <section className="featured-strip" aria-labelledby="featured-title">
      <div className="featured-copy">
        <p className="kicker">Featured</p>
        <h1 id="featured-title">{siteTitle}</h1>
        <p>{image.description || "Street looks for every mood."}</p>
        {canView ? (
          <button className="button button-primary" type="button" onClick={handleOpen}>
            View Gallery <ArrowRight aria-hidden="true" />
          </button>
        ) : (
          <div className="featured-restricted-actions">
            <button className="button button-primary" type="button" onClick={onLogin}>
              Login to view
            </button>
            <button className="button" type="button" onClick={onRequestAccess}>
              Request access
            </button>
          </div>
        )}
      </div>
      <div
        className={`featured-image${!canView ? " is-restricted" : ""}`}
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpen();
          }
        }}
        aria-label={canView ? `Open ${image.title}` : `Login to view ${image.title}`}
      >
        <img src={image.src} alt={image.title} loading="eager" />
        <span>
          <strong>{image.title}</strong>
          {image.location ? <small>{image.location}</small> : null}
        </span>
        {!canView ? (
          <em className="restricted-overlay featured-lock">
            Members only
          </em>
        ) : null}
        <span className="featured-arrows" aria-label="Featured image controls">
          <button
            className="icon-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPrevious();
            }}
            aria-label="Previous featured image"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNext();
            }}
            aria-label="Next featured image"
          >
            <ArrowRight aria-hidden="true" />
          </button>
        </span>
      </div>
    </section>
  );
}
