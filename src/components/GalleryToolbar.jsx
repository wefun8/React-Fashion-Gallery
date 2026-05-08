const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "title", label: "Title" },
  { value: "location", label: "Location" }
];

export default function GalleryToolbar({
  query,
  onQueryChange,
  tags,
  activeTag,
  onTagChange,
  sortMode,
  onSortModeChange,
  resultCount,
  onReset
}) {
  return (
    <section className="toolbar" aria-label="Gallery controls">
      <label className="field search-field">
        <span>Search</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Title, city, tag"
        />
      </label>

      <label className="field">
        <span>Sort</span>
        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="tag-filter" aria-label="Filter by tag">
        <button
          className={activeTag === "all" ? "tag-pill is-active" : "tag-pill"}
          type="button"
          onClick={() => onTagChange("all")}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            className={activeTag === tag ? "tag-pill is-active" : "tag-pill"}
            type="button"
            key={tag}
            onClick={() => onTagChange(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="toolbar-meta" aria-live="polite">
        <strong>{resultCount}</strong>
        <span>{resultCount === 1 ? "result" : "results"}</span>
      </div>

      <button className="button button-secondary" type="button" onClick={onReset}>
        Reset
      </button>
    </section>
  );
}
