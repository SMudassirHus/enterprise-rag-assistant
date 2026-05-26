import { apiBaseUrl } from "./healthApi.js";

export async function generateAnswer(question) {
  const response = await fetch(`${apiBaseUrl}/api/chat/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Answer generation failed.");
  }

  return data;
}
