import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

function ensureSupabaseClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env.",
    );
  }

  return supabase;
}

export async function getCurrentSession() {
  const client = ensureSupabaseClient();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export function onAuthStateChange(callback) {
  const client = ensureSupabaseClient();
  return client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

export async function signUpWithEmail(email, password) {
  const client = ensureSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signInWithEmail(email, password) {
  const client = ensureSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const client = ensureSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail(email, redirectTo) {
  const client = ensureSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw new Error(error.message);
  }
}
