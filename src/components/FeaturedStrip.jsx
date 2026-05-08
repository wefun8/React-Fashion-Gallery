import { isRestrictedImage } from "../lib/gallery.js";

export default function FeaturedStrip({
  siteTitle,
  image,
  restrictedTags,
  user,
  onOpen,
  onLogin,
  onRequestAccess
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
        <p className="kicker">Now Showing</p>
        <h1 id="featured-title">{siteTitle}</h1>
        <p>{image.description || image.title}</p>
        {canView ? (
          <button className="button button-primary" type="button" onClick={handleOpen}>
            Open Feature
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
      <button
        className={`featured-image${!canView ? " is-restricted" : ""}`}
        type="button"
        onClick={handleOpen}
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
      </button>
    </section>
  );
}
