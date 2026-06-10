import { authFetch } from "./apiClient.js";
import { apiBaseUrl } from "./healthApi.js";

export async function generatePdfChunks(filename) {
  const encodedFilename = encodeURIComponent(filename);
  const response = await authFetch(`${apiBaseUrl}/api/uploads/${encodedFilename}/chunks`, {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Text chunking failed.");
  }

  return data;
}
