import { authFetch } from "./apiClient.js";
import { apiBaseUrl } from "./healthApi.js";

export async function uploadPdf(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authFetch(`${apiBaseUrl}/api/uploads`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "PDF upload failed.");
  }

  return data;
}

export async function uploadPdfs(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await authFetch(`${apiBaseUrl}/api/uploads/multiple`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "PDF upload failed.");
  }

  return data;
}

export async function listUploadedDocuments() {
  const response = await authFetch(`${apiBaseUrl}/api/uploads`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Could not load uploaded documents.");
  }

  return data;
}

export async function deleteUploadedDocument(documentId) {
  const encodedDocumentId = encodeURIComponent(documentId);
  const response = await authFetch(`${apiBaseUrl}/api/uploads/${encodedDocumentId}`, {
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail ?? "Could not delete uploaded document.");
  }

  return data;
}
