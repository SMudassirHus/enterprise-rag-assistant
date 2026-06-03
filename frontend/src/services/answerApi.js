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

function parseServerSentEvents(buffer, handlers) {
  const events = buffer.split("\n\n");
  const remainingBuffer = events.pop() ?? "";

  for (const eventText of events) {
    const lines = eventText.split("\n");
    const eventLine = lines.find((line) => line.startsWith("event: "));
    const dataLine = lines.find((line) => line.startsWith("data: "));

    if (!eventLine || !dataLine) {
      continue;
    }

    const eventName = eventLine.replace("event: ", "");
    const data = JSON.parse(dataLine.replace("data: ", ""));

    if (eventName === "metadata") {
      handlers.onMetadata?.(data);
    }

    if (eventName === "delta") {
      handlers.onDelta?.(data.text ?? "");
    }

    if (eventName === "done") {
      handlers.onDone?.(data);
    }

    if (eventName === "error") {
      throw new Error(data.message ?? "Streaming answer failed.");
    }
  }

  return remainingBuffer;
}

export async function streamAnswer(question, handlers = {}) {
  const response = await fetch(`${apiBaseUrl}/api/chat/answer/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail ?? "Streaming answer failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = parseServerSentEvents(buffer, handlers);
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      parseServerSentEvents(`${buffer}\n\n`, handlers);
    }
  } catch (error) {
    handlers.onError?.(error);
    throw error;
  }
}
