import { apiBaseUrl } from "./healthApi.js";

export async function searchDocuments(question) {
  const response = await fetch(`${apiBaseUrl}/api/retrieval/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Document search failed.");
  }

  return data;
}
