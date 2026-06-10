import { supabase } from "./supabaseClient.js";

async function getAccessToken() {
  if (!supabase) {
    throw new Error("Authentication is not configured.");
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return token;
}

export async function authFetch(url, options = {}) {
  const token = await getAccessToken();
  const headers = new Headers(options.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
