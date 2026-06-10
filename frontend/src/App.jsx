import { useEffect, useState } from "react";

import AtlasLogo from "./components/AtlasLogo.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import BackendStatus from "./components/BackendStatus.jsx";
import RagWorkspace from "./components/RagWorkspace.jsx";
import {
  getCurrentSession,
  onAuthStateChange,
  signOut,
} from "./services/authService.js";
import { getBackendHealth } from "./services/healthApi.js";
import { isSupabaseConfigured } from "./services/supabaseClient.js";

function App() {
  const [healthMessage, setHealthMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function checkBackendConnection() {
      try {
        const health = await getBackendHealth();
        setHealthMessage(health.message);
      } catch {
        setErrorMessage(
          "Could not reach the backend. Make sure FastAPI is running on the configured API URL.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    checkBackendConnection();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return undefined;
    }

    let isMounted = true;

    async function loadSession() {
      try {
        const currentSession = await getCurrentSession();

        if (isMounted) {
          setSession(currentSession);
        }
      } catch {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = onAuthStateChange((nextSession) => {
      setSession(nextSession);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  }

  const isConnected = !isLoading && !errorMessage;

  if (isAuthLoading) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#090f1f] text-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <AtlasLogo className="h-11 w-11 animate-pulse" />
          </div>
          <p className="text-sm text-slate-400">Loading Atlas AI...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <main className="h-screen overflow-hidden bg-[#090f1f] text-slate-100">
      <RagWorkspace
        key={session.user.id}
        backendStatus={
          <BackendStatus
            errorMessage={errorMessage}
            healthMessage={healthMessage}
            isConnected={isConnected}
            isLoading={isLoading}
          />
        }
        currentUser={session.user}
        isLoggingOut={isLoggingOut}
        onLogout={handleLogout}
      />
    </main>
  );
}

export default App;
