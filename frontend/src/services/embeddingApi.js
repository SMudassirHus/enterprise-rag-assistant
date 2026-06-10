import { authFetch } from "./apiClient.js";
import { apiBaseUrl } from "./healthApi.js";

export async function generatePdfEmbeddings(filename) {
  const encodedFilename = encodeURIComponent(filename);
  const response = await authFetch(
    `${apiBaseUrl}/api/uploads/${encodedFilename}/embeddings`,
    {
      method: "POST",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Embedding generation failed.");
  }

  return data;
}
