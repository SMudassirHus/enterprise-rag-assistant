import { authFetch } from "./apiClient.js";
import { apiBaseUrl } from "./healthApi.js";

export async function storePdfInVectorDatabase(filename) {
  const encodedFilename = encodeURIComponent(filename);
  const response = await authFetch(
    `${apiBaseUrl}/api/uploads/${encodedFilename}/vector-store`,
    {
      method: "POST",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Vector database storage failed.");
  }

  return data;
}
