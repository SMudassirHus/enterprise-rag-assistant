import { useMemo, useState } from "react";

import AtlasLogo from "./AtlasLogo.jsx";
import LoadingButton from "./LoadingButton.jsx";
import {
  sendPasswordResetEmail,
  signInWithEmail,
  signUpWithEmail,
} from "../services/authService.js";
import { isSupabaseConfigured } from "../services/supabaseClient.js";

const featureHighlights = [
  "Semantic Search",
  "Source-backed Answers",
  "Multi-document Retrieval",
  "Secure Knowledge Workspace",
];

function getModeContent(authMode) {
  if (authMode === "signup") {
    return {
      title: "Create your account",
      description: "Start a secure workspace for enterprise document search.",
      buttonLabel: "Create account",
      loadingLabel: "Creating account...",
    };
  }

  if (authMode === "reset") {
    return {
      title: "Reset password",
      description: "Enter your email and receive a secure recovery link.",
      buttonLabel: "Send reset link",
      loadingLabel: "Sending link...",
    };
  }

  return {
    title: "Welcome back",
    description: "Sign in to continue to your Atlas AI workspace.",
    buttonLabel: "Sign in",
    loadingLabel: "Signing in...",
  };
}

function AuthScreen() {
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modeContent = useMemo(() => getModeContent(authMode), [authMode]);
  const isSignup = authMode === "signup";
  const isReset = authMode === "reset";
  const showDeveloperSetup = !isSupabaseConfigured && import.meta.env.DEV;

  function switchMode(nextMode) {
    setAuthMode(nextMode);
    setErrorMessage("");
    setMessage("");
    setPassword("");
  }

  function validateForm() {
    if (!email.trim()) {
      return "Enter your email address to continue.";
    }

    if (!isReset && password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const validationMessage = validateForm();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isReset) {
        await sendPasswordResetEmail(email.trim(), window.location.origin);
        setMessage("Password reset link sent. Check your inbox to continue.");
      } else if (isSignup) {
        const result = await signUpWithEmail(email.trim(), password);

        if (!result.session) {
          setMessage("Account created. Check your inbox to confirm your email.");
        }
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "We could not complete that request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#070b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(34,211,238,0.13),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(129,140,248,0.14),transparent_28%),linear-gradient(135deg,#070b14_0%,#0b1220_48%,#111827_100%)]" />
      <div className="pointer-events-none fixed inset-x-8 top-6 h-32 rounded-full bg-cyan-300/5 blur-3xl" />

      <main className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex min-h-[36vh] flex-col justify-between px-5 py-5 sm:px-8 lg:min-h-screen lg:px-10 lg:py-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AtlasLogo className="h-10 w-10" />
              <div>
                <p className="text-sm font-semibold tracking-tight text-white">
                  Atlas AI
                </p>
                <p className="text-xs text-slate-500">
                  Enterprise Knowledge Assistant
                </p>
              </div>
            </div>
            <span className="hidden rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100 ring-1 ring-emerald-300/15 sm:inline-flex">
              Secure access
            </span>
          </div>

          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-7 lg:mx-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200/75">
              AI knowledge retrieval
            </p>
            <h1 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl xl:text-[2.65rem]">
              Enterprise knowledge. Instantly accessible.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
              Search thousands of pages, retrieve trusted answers, and cite
              your sources with confidence using Atlas AI.
            </p>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {featureHighlights.map((feature) => (
                <div
                  className="flex items-center gap-2.5 rounded-xl bg-white/[0.045] px-3.5 py-2.5 shadow-sm ring-1 ring-white/8"
                  key={feature}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-300/10 text-[10px] font-bold text-cyan-100 ring-1 ring-cyan-200/20">
                    ✓
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="hidden max-w-lg text-xs leading-5 text-slate-600 lg:block">
            Designed for teams that need fast answers without losing source
            visibility, governance, or trust.
          </p>
        </section>

        <section className="flex items-center justify-center px-5 pb-5 pt-0 sm:px-8 lg:min-h-screen lg:px-10 lg:py-6">
          <div className="w-full max-w-[25rem]">
            <div className="rounded-[1.5rem] bg-slate-950/55 p-4 shadow-2xl shadow-black/35 ring-1 ring-white/10 backdrop-blur-xl sm:p-5">
              <div className="mb-4 inline-flex rounded-full bg-white/[0.045] p-1 ring-1 ring-white/10">
                <button
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-200/50 ${
                    authMode === "login"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  disabled={isSubmitting}
                  onClick={() => switchMode("login")}
                  type="button"
                >
                  Sign In
                </button>
                <button
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-200/50 ${
                    authMode === "signup"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                  disabled={isSubmitting}
                  onClick={() => switchMode("signup")}
                  type="button"
                >
                  Create Account
                </button>
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  {modeContent.title}
                </h2>
                <p className="mt-1.5 text-sm leading-5 text-slate-500">
                  {modeContent.description}
                </p>
              </div>

              {!isSupabaseConfigured && (
                <div className="mt-4 rounded-xl bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100 ring-1 ring-amber-300/15">
                  Authentication is not available yet for this preview.
                  {showDeveloperSetup && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer font-medium text-amber-50">
                        Local setup details
                      </summary>
                      <p className="mt-1.5 text-xs leading-5 text-amber-100/80">
                        Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to
                        frontend/.env, then restart the Vite dev server.
                      </p>
                    </details>
                  )}
                </div>
              )}

              <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
                <label className="block" htmlFor="auth-email">
                  <span className="text-xs font-medium text-slate-300">
                    Work email
                  </span>
                  <input
                    autoComplete="email"
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-2.5 text-sm text-slate-100 shadow-inner shadow-black/10 transition placeholder:text-slate-600 hover:border-white/15 focus:border-cyan-200/45 focus:outline-none focus:ring-4 focus:ring-cyan-300/10"
                    disabled={!isSupabaseConfigured || isSubmitting}
                    id="auth-email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    type="email"
                    value={email}
                  />
                </label>

                {!isReset && (
                  <label className="block" htmlFor="auth-password">
                    <span className="text-xs font-medium text-slate-300">
                      Password
                    </span>
                    <input
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-2.5 text-sm text-slate-100 shadow-inner shadow-black/10 transition placeholder:text-slate-600 hover:border-white/15 focus:border-cyan-200/45 focus:outline-none focus:ring-4 focus:ring-cyan-300/10"
                      disabled={!isSupabaseConfigured || isSubmitting}
                      id="auth-password"
                      minLength={6}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      type="password"
                      value={password}
                    />
                  </label>
                )}

                {errorMessage && (
                  <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100 ring-1 ring-red-300/15">
                    {errorMessage}
                  </p>
                )}

                {message && (
                  <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-100 ring-1 ring-emerald-300/15">
                    {message}
                  </p>
                )}

                <LoadingButton
                  className="w-full rounded-xl bg-cyan-200 py-2.5 text-slate-950 shadow-lg shadow-cyan-950/20 hover:bg-cyan-100 focus:outline-none focus:ring-4 focus:ring-cyan-300/20"
                  disabled={!isSupabaseConfigured || isSubmitting}
                  isLoading={isSubmitting}
                  loadingLabel={modeContent.loadingLabel}
                  type="submit"
                >
                  {modeContent.buttonLabel}
                </LoadingButton>
              </form>

              <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="text-left font-medium text-slate-400 transition hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200/40"
                  disabled={isSubmitting}
                  onClick={() => switchMode(isReset ? "login" : "reset")}
                  type="button"
                >
                  {isReset ? "Back to sign in" : "Forgot password?"}
                </button>
                <button
                  className="text-left font-semibold text-cyan-100 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/40"
                  disabled={isSubmitting}
                  onClick={() => switchMode(isSignup ? "login" : "signup")}
                  type="button"
                >
                  {isSignup ? "Sign in instead" : "Create an account"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AuthScreen;
