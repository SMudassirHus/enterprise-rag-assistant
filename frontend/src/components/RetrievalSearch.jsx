import { useState } from "react";

import { searchDocuments } from "../services/retrievalApi.js";

function formatScore(score) {
  if (score === null || score === undefined) {
    return "Not available";
  }

  return score.toFixed(4);
}

function RetrievalSearch() {
  const [question, setQuestion] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSearchResult(null);

    if (!question.trim()) {
      setErrorMessage("Enter a question before searching documents.");
      return;
    }

    try {
      setIsSearching(true);
      const result = await searchDocuments(question);
      setSearchResult(result);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-950">
          Semantic Search
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Search stored document chunks using an OpenAI embedding for your
          question.
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="retrieval-question"
          >
            Question
          </label>
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            id="retrieval-question"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What does the document say about..."
            value={question}
          />
        </div>

        <button
          className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isSearching}
          type="submit"
        >
          {isSearching ? "Searching..." : "Search Documents"}
        </button>
      </form>

      {errorMessage && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      {searchResult && (
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Retrieved Chunks
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {searchResult.total_matches} matches from{" "}
                {searchResult.collection_name}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {searchResult.matches.map((match, index) => (
              <article
                className="rounded-md border border-slate-200 bg-white p-4"
                key={`${match.document_filename}-${match.chunk_index}-${index}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      Chunk {match.chunk_index ?? "Unknown"}
                    </h4>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      {match.document_filename}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Relevance {formatScore(match.relevance_score)}
                  </p>
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {match.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default RetrievalSearch;
