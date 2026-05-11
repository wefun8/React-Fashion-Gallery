import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import AdminRequestsPanel from "./components/AdminRequestsPanel.jsx";
import AgeGate from "./components/AgeGate.jsx";
import AuthControls from "./components/AuthControls.jsx";
import FeaturedStrip from "./components/FeaturedStrip.jsx";
import FirstAdminDialog from "./components/FirstAdminDialog.jsx";
import GalleryToolbar from "./components/GalleryToolbar.jsx";
import ImageGrid from "./components/ImageGrid.jsx";
import Lightbox from "./components/Lightbox.jsx";
import LoginDialog from "./components/LoginDialog.jsx";
import RequestAccessDialog from "./components/RequestAccessDialog.jsx";
import { EmptyState, ErrorState, LoadingState } from "./components/StateViews.jsx";
import { apiGet, apiPost } from "./lib/api.js";
import {
  canViewImage,
  collectTags,
  filterImages,
  normalizeGalleryData,
  sortImages
} from "./lib/gallery.js";
import {
  clearAgeConfirmation,
  hasAgeConfirmation,
  saveAgeConfirmation
} from "./lib/ageGate.js";

const DEFAULT_NOTICE =
  "Content is configured by the site owner. Confirm that you are legally allowed to view the content in your location.";

export default function App() {
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(() => hasAgeConfirmation());
  const [galleryData, setGalleryData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [sortMode, setSortMode] = useState("latest");
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [user, setUser] = useState(null);
  const [needsFirstAdmin, setNeedsFirstAdmin] = useState(false);
  const [restrictedTags, setRestrictedTags] = useState([]);
  const [activeDialog, setActiveDialog] = useState(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const loadSetupAndAccess = useCallback(async () => {
    const [setupResult, accessResult] = await Promise.allSettled([
      apiGet("/api/setup/status"),
      apiGet("/api/gallery-access")
    ]);

    if (setupResult.status === "fulfilled") {
      setNeedsFirstAdmin(Boolean(setupResult.value?.needsFirstAdmin));
    }

    if (accessResult.status === "fulfilled") {
      setRestrictedTags(accessResult.value?.restrictedTags || []);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    async function loadGallery() {
      setStatus("loading");
      setErrorMessage("");

      try {
        const response = await fetch("/images.json", {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Gallery request failed with ${response.status}`);
        }

        const rawData = await response.json();
        const normalizedData = normalizeGalleryData(rawData);

        if (isActive) {
          setGalleryData(normalizedData);
          setStatus("ready");
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        if (isActive) {
          setGalleryData(normalizeGalleryData(null));
          setErrorMessage(error.message || "Unable to load gallery data.");
          setStatus("error");
        }
      }
    }

    loadGallery();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [reloadToken]);

  useEffect(() => {
    let isActive = true;

    async function loadAuthState() {
      const [meResult] = await Promise.allSettled([
        apiGet("/api/auth/me"),
        loadSetupAndAccess()
      ]);

      if (!isActive) {
        return;
      }

      if (meResult.status === "fulfilled") {
        setUser(meResult.value?.user || null);
      } else {
        setUser(null);
      }
    }

    loadAuthState();

    return () => {
      isActive = false;
    };
  }, [loadSetupAndAccess]);

  const site = galleryData?.site ?? {
    title: "Girl Mode",
    notice: DEFAULT_NOTICE
  };
  const images = galleryData?.images ?? [];

  const tags = useMemo(() => collectTags(images), [images]);
  const visibleImages = useMemo(() => {
    const filteredImages = filterImages(images, { query, tag: activeTag });
    return sortImages(filteredImages, sortMode);
  }, [activeTag, images, query, sortMode]);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? null,
    [images, selectedImageId]
  );

  const featuredCandidates = useMemo(() => {
    const candidates = visibleImages.length > 0 ? visibleImages : images;
    const viewableCandidates = candidates.filter((image) => canViewImage(image, restrictedTags, user));
    return viewableCandidates.length > 0 ? viewableCandidates : candidates;
  }, [images, restrictedTags, user, visibleImages]);

  const featuredImage =
    featuredCandidates.length > 0
      ? featuredCandidates[featuredIndex % featuredCandidates.length]
      : null;

  useEffect(() => {
    setFeaturedIndex(0);
  }, [activeTag, query, sortMode]);

  const resetFilters = useCallback(() => {
    setQuery("");
    setActiveTag("all");
    setSortMode("latest");
  }, []);

  const confirmAge = useCallback(() => {
    saveAgeConfirmation();
    setIsAgeConfirmed(true);
  }, []);

  const resetAgeConfirmation = useCallback(() => {
    clearAgeConfirmation();
    setSelectedImageId(null);
    setIsAgeConfirmed(false);
  }, []);

  const retryLoad = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const showPreviousFeature = useCallback(() => {
    setFeaturedIndex((index) => {
      const count = featuredCandidates.length || 1;
      return (index - 1 + count) % count;
    });
  }, [featuredCandidates.length]);

  const showNextFeature = useCallback(() => {
    setFeaturedIndex((index) => {
      const count = featuredCandidates.length || 1;
      return (index + 1) % count;
    });
  }, [featuredCandidates.length]);

  const openImage = useCallback(
    (image) => {
      if (!image) {
        setSelectedImageId(null);
        return;
      }

      if (!canViewImage(image, restrictedTags, user)) {
        setActiveDialog("login");
        return;
      }

      setSelectedImageId(image.id);
    },
    [restrictedTags, user]
  );

  const closeLightbox = useCallback(() => {
    setSelectedImageId(null);
  }, []);

  const handleAuthSuccess = useCallback(
    async (nextUser) => {
      setUser(nextUser || null);
      setActiveDialog(null);
      await loadSetupAndAccess();
    },
    [loadSetupAndAccess]
  );

  const logout = useCallback(async () => {
    try {
      await apiPost("/api/auth/logout");
    } finally {
      setUser(null);
      await loadSetupAndAccess();
    }
  }, [loadSetupAndAccess]);

  const moveSelection = useCallback(
    (direction) => {
      if (!selectedImageId || visibleImages.length === 0) {
        return;
      }

      const currentIndex = visibleImages.findIndex((image) => image.id === selectedImageId);
      const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex =
        (fallbackIndex + direction + visibleImages.length) % visibleImages.length;

      setSelectedImageId(visibleImages[nextIndex].id);
    },
    [selectedImageId, visibleImages]
  );

  useEffect(() => {
    if (!selectedImage) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowRight") {
        moveSelection(1);
      }

      if (event.key === "ArrowLeft") {
        moveSelection(-1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeLightbox, moveSelection, selectedImage]);

  if (!isAgeConfirmed) {
    return <AgeGate notice={site.notice} onConfirm={confirmAge} />;
  }

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "error") {
    return <ErrorState message={errorMessage} onRetry={retryLoad} />;
  }

  return (
    <>
      <main className="app-shell" id="gallery">
        <section className="browser-frame" aria-label="React Fashion Gallery application">
          <div className="browser-chrome" aria-hidden="true">
            <span className="browser-dot browser-dot-red" />
            <span className="browser-dot browser-dot-yellow" />
            <span className="browser-dot browser-dot-green" />
            <div className="address-bar">fashion-gallery.com</div>
          </div>

          <div className="browser-body">
            <AuthControls
              user={user}
              needsFirstAdmin={needsFirstAdmin}
              onCreateFirstAdmin={() => setActiveDialog("first-admin")}
              onLogin={() => setActiveDialog("login")}
              onRequestAccess={() => setActiveDialog("request-access")}
              onAdmin={() => setActiveDialog((current) => (current === "admin" ? null : "admin"))}
              onLogout={logout}
            />

            {activeDialog === "admin" ? (
              <AdminRequestsPanel onClose={() => setActiveDialog(null)} />
            ) : null}

            <FeaturedStrip
              siteTitle={site.title}
              image={featuredImage}
              restrictedTags={restrictedTags}
              user={user}
              onOpen={() => openImage(featuredImage)}
              onLogin={() => setActiveDialog("login")}
              onRequestAccess={() => setActiveDialog("request-access")}
              onPrevious={showPreviousFeature}
              onNext={showNextFeature}
            />

            <GalleryToolbar
              query={query}
              onQueryChange={setQuery}
              tags={tags}
              activeTag={activeTag}
              onTagChange={setActiveTag}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              resultCount={visibleImages.length}
              onReset={resetFilters}
            />

            {visibleImages.length > 0 ? (
              <ImageGrid
                images={visibleImages}
                restrictedTags={restrictedTags}
                user={user}
                onOpen={openImage}
                onLogin={() => setActiveDialog("login")}
                onRequestAccess={() => setActiveDialog("request-access")}
              />
            ) : (
              <EmptyState onReset={resetFilters} />
            )}

            <footer className="site-footer">
              <p>
                <ShieldCheck aria-hidden="true" />
                You must be 18+ to view this content.
              </p>
              <button className="text-button" type="button" onClick={resetAgeConfirmation}>
                Reset Age Confirmation
              </button>
            </footer>
          </div>
        </section>
      </main>

      <Lightbox
        image={selectedImage}
        onClose={closeLightbox}
        onNext={() => moveSelection(1)}
        onPrevious={() => moveSelection(-1)}
      />

      {activeDialog === "login" ? (
        <LoginDialog
          onClose={() => setActiveDialog(null)}
          onSuccess={handleAuthSuccess}
          onRequestAccess={() => setActiveDialog("request-access")}
        />
      ) : null}

      {activeDialog === "request-access" ? (
        <RequestAccessDialog onClose={() => setActiveDialog(null)} />
      ) : null}

      {activeDialog === "first-admin" ? (
        <FirstAdminDialog onClose={() => setActiveDialog(null)} onSuccess={handleAuthSuccess} />
      ) : null}
    </>
  );
}
