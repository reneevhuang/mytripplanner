export function InterestSelector({
  tags,
  selected,
  onChange,
}: {
  tags: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const allSelected = selected.length === tags.length;
  return (
    <div className="interest-selector">
      <div className="interest-heading">
        <strong>Interests</strong>
        <label>
          <input checked={allSelected} onChange={(event) => onChange(event.target.checked ? tags : [])} type="checkbox" />
          Select all
        </label>
      </div>
      <div className="interest-grid" aria-label="Interests">
        {tags.map((tag) => {
          const checked = selected.includes(tag);
          return (
            <label className={checked ? "selected" : ""} key={tag}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked ? [...selected, tag] : selected.filter((value) => value !== tag))}
              />
              <span aria-hidden="true">{checked ? "✓" : "+"}</span>
              {tag.replaceAll("-", " ")}
            </label>
          );
        })}
      </div>
    </div>
  );
}
