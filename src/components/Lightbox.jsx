import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

export default function Lightbox({ image, onClose, onNext, onPrevious }) {
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const isOpen = Boolean(image);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    return () => {
      const previousFocus = previousFocusRef.current;

      if (
        previousFocus &&
        document.contains(previousFocus) &&
        typeof previousFocus.focus === "function"
      ) {
        previousFocus.focus();
      }
    };
  }, [isOpen]);

  function handleKeyDown(event) {
    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = [
      ...(panelRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [])
    ];

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  if (!image) {
    return null;
  }

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      onKeyDown={handleKeyDown}
    >
      <div className="lightbox-backdrop" onClick={onClose} />
      <section className="lightbox-panel" ref={panelRef}>
        <div className="lightbox-media">
          <img src={image.src} alt={image.title} />
        </div>
        <div className="lightbox-info">
          <div className="lightbox-actions">
            <button
              className="icon-button"
              type="button"
              onClick={onPrevious}
              aria-label="Previous image"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={onNext}
              aria-label="Next image"
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <button
              className="icon-button icon-button-close"
              type="button"
              onClick={onClose}
              aria-label="Close lightbox"
              ref={closeButtonRef}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <p className="kicker">{image.location || "Lookbook"}</p>
          <h2 id="lightbox-title">{image.title}</h2>
          <p>{image.description}</p>
          <dl className="meta-list">
            <div>
              <dt>Photographer</dt>
              <dd>{image.photographer || "Studio Sample"}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{image.date || "Undated"}</dd>
            </div>
            <div>
              <dt>Tags</dt>
              <dd>{image.tags.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
