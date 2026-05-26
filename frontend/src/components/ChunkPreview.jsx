function ChunkPreview({ chunks, chunkOverlap, chunkSize, totalChunks }) {
  if (!chunks.length) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Generated Chunks
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {totalChunks} chunks created
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Size {chunkSize} / overlap {chunkOverlap}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {chunks.slice(0, 5).map((chunk) => {
          const previewText =
            chunk.text.length > 500 ? `${chunk.text.slice(0, 500)}...` : chunk.text;

          return (
            <article
              className="rounded-md border border-slate-200 bg-white p-4"
              key={chunk.index}
            >
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-sm font-semibold text-slate-900">
                  Chunk {chunk.index}
                </h4>
                <p className="text-xs text-slate-500">
                  {chunk.character_count} characters
                </p>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {previewText}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default ChunkPreview;
