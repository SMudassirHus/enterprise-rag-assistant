function ExtractedTextPreview({ text }) {
  if (!text) {
    return null;
  }

  const previewText = text.length > 1500 ? `${text.slice(0, 1500)}...` : text;

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Extracted Text Preview
        </h3>
        <p className="text-xs text-slate-500">{text.length} characters</p>
      </div>

      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-white p-4 text-sm leading-6 text-slate-700">
        {previewText}
      </pre>
    </div>
  );
}

export default ExtractedTextPreview;
