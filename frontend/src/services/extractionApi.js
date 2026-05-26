import { apiBaseUrl } from "./healthApi.js";

export async function extractPdfText(filename) {
  const encodedFilename = encodeURIComponent(filename);
  const response = await fetch(
    `${apiBaseUrl}/api/uploads/${encodedFilename}/extract`,
    {
      method: "POST",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "PDF text extraction failed.");
  }

  return data;
}
