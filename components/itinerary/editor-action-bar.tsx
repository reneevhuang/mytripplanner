export function EditorActionBar({
  readOnly,
  onSaveCopy,
  onShare,
  onPrint,
  onCalendar,
}: {
  readOnly: boolean;
  onSaveCopy: () => void;
  onShare: () => void;
  onPrint: () => void;
  onCalendar: () => void;
}) {
  return (
    <div className="editor-actions no-print">
      {!readOnly && <button className="button button-primary" type="button" onClick={onSaveCopy}>Save as copy</button>}
      {!readOnly && <button className="button button-secondary" type="button" onClick={onShare}>Copy share link</button>}
      <button className="button button-secondary" type="button" onClick={onPrint}>Print / Save PDF</button>
      <button className="button button-secondary" type="button" onClick={onCalendar}>Download calendar</button>
    </div>
  );
}
