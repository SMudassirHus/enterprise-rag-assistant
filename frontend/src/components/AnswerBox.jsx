import { useState } from "react";

import { generateAnswer } from "../services/answerApi.js";

function formatScore(score) {
  if (score === null || score === undefined) {
    return "Not available";
  }

  return score.toFixed(4);
}

function AnswerBox() {
  const [question, setQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [answerResult, setAnswerResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setAnswerResult(null);

    if (!question.trim()) {
      setErrorMessage("Enter a question before generating an answer.");
      return;
    }

    try {
      setIsAnswering(true);
      const result = await generateAnswer(question);
      setAnswerResult(result);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsAnswering(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-950">
          Ask Documents
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Generate an answer grounded only in retrieved document chunks.
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="answer-question"
          >
            Question
          </label>
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            id="answer-question"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a question about the stored documents..."
            value={question}
          />
        </div>

        <button
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isAnswering}
          type="submit"
        >
          {isAnswering ? "Generating..." : "Generate Answer"}
        </button>
      </form>

      {errorMessage && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      {answerResult && (
        <div className="mt-5 space-y-4">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="text-sm font-semibold text-emerald-950">
                Answer
              </h3>
              <p className="break-all font-mono text-xs text-emerald-800">
                {answerResult.model}
              </p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-emerald-950">
              {answerResult.answer}
            </p>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Source Chunks
            </h3>
            <div className="mt-4 space-y-3">
              {answerResult.sources.map((source, index) => (
                <article
                  className="rounded-md border border-slate-200 bg-white p-4"
                  key={`${source.document_filename}-${source.chunk_index}-${index}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Chunk {source.chunk_index ?? "Unknown"}
                      </h4>
                      <p className="mt-1 break-all font-mono text-xs text-slate-500">
                        {source.document_filename}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Relevance {formatScore(source.relevance_score)}
                    </p>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {source.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AnswerBox;
