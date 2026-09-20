import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, onValue, set, get, remove, onDisconnect } from "firebase/database";
import { auth, database } from "../firebase";

const AuthContext = createContext(null);

// Session duration: 1 hour in milliseconds
const SESSION_DURATION = 60 * 60 * 1000;
const LOGIN_TIMESTAMP_KEY = "solardryer_login_timestamp";

// Role hierarchy for access checking
const ROLE_CONFIG = {
  guess:         { level: 0, tabs: ["dashboard"] },
  view_data:     { level: 1, tabs: ["dashboard", "data"] },
  eksekusi_data: { level: 2, tabs: ["dashboard", "control", "data"] },
  report_data:   { level: 3, tabs: ["dashboard", "data"] },
  admin:         { level: 4, tabs: ["dashboard", "control", "data", "management"] },
};

/**
 * Check if a role can access a specific tab
 */
export function canAccessTab(role, tabId) {
  const config = ROLE_CONFIG[role];
  if (!config) return false;
  return config.tabs.includes(tabId);
}

/**
 * Check if a role can use the Export feature
 * Only report_data and admin can export
 */
export function canExport(role) {
  return role === "report_data" || role === "admin";
}

/**
 * Check if a role can access the Management page
 * Only admin can manage
 */
export function canManage(role) {
  return role === "admin";
}

/**
 * Super Admin email — the only account that can toggle
 * Maintenance / Overload mode and bypass those screens.
 */
export const SUPER_ADMIN_EMAIL = "admin@solardryer.com";

/**
 * Check if the given email is the super admin
 */
export function isSuperAdmin(email) {
  return email === SUPER_ADMIN_EMAIL;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimer, setSessionTimer] = useState(null);

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (sessionTimer) clearTimeout(sessionTimer);
      localStorage.removeItem(LOGIN_TIMESTAMP_KEY);

      // Remove presence before signing out
      if (auth.currentUser) {
        const presRef = ref(database, `presence/${auth.currentUser.uid}`);
        await remove(presRef).catch(() => {});
      }

      setUserRole(null);
      setCurrentUser(null);
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, [sessionTimer]);

  // Start session timer
  const startSessionTimer = useCallback((loginTimestamp) => {
    if (sessionTimer) clearTimeout(sessionTimer);

    const elapsed = Date.now() - loginTimestamp;
    const remaining = SESSION_DURATION - elapsed;

    if (remaining <= 0) {
      // Session already expired
      logout();
      return;
    }

    const timer = setTimeout(() => {
      console.log("Session expired — auto logging out");
      logout();
    }, remaining);

    setSessionTimer(timer);
  }, [sessionTimer, logout]);

  // Login function
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save login timestamp
    const now = Date.now();
    localStorage.setItem(LOGIN_TIMESTAMP_KEY, now.toString());

    // Save user info to /users/{uid}
    try {
      await set(ref(database, `users/${user.uid}`), {
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        lastLogin: now,
      });

      // Check if user_akses exists, if not set default role (guess)
      const aksesSnap = await get(ref(database, `user_akses/${user.uid}`));
      if (!aksesSnap.exists()) {
        await set(ref(database, `user_akses/${user.uid}`), {
          role: "guess",
          updatedAt: now,
        });
      }
    } catch (err) {
      console.warn("Could not write user data:", err);
    }

    return user;
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);

        // Check session validity
        const storedTimestamp = localStorage.getItem(LOGIN_TIMESTAMP_KEY);
        if (storedTimestamp) {
          const ts = parseInt(storedTimestamp, 10);
          const elapsed = Date.now() - ts;
          if (elapsed >= SESSION_DURATION) {
            // Expired
            logout();
            return;
          }
          startSessionTimer(ts);
        } else {
          // No timestamp stored, set one now
          const now = Date.now();
          localStorage.setItem(LOGIN_TIMESTAMP_KEY, now.toString());
          startSessionTimer(now);
        }

        // Set up presence
        const presRef = ref(database, `presence/${user.uid}`);
        const presData = {
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
          lastSeen: Date.now(),
        };
        set(presRef, presData).catch(() => {});
        onDisconnect(presRef).remove();

        // Listen to user role
        const roleRef = ref(database, `user_akses/${user.uid}/role`);
        const unsubRole = onValue(roleRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserRole(snapshot.val());
          } else {
            setUserRole("guess"); // Default role
          }
          setLoading(false);
        });

        return () => unsubRole();
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []); // Run once on mount

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (sessionTimer) clearTimeout(sessionTimer);
    };
  }, [sessionTimer]);

  const value = {
    currentUser,
    userRole,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
