function EmbeddingStatus({ result }) {
  if (!result) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="text-sm font-semibold text-emerald-950">
        Embeddings Generated
      </h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-medium text-emerald-800">Chunks processed</dt>
          <dd className="mt-1 text-emerald-950">
            {result.total_chunks_processed}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-emerald-800">Model</dt>
          <dd className="mt-1 break-all font-mono text-xs text-emerald-950">
            {result.embedding_model}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-emerald-800">Dimensions</dt>
          <dd className="mt-1 text-emerald-950">
            {result.embedding_dimensions}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default EmbeddingStatus;
