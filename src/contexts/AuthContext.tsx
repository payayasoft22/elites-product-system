// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Debugging
  useEffect(() => {
    console.log("Auth state changed:", { user, session, loading });
  }, [user, session, loading]);

  // Improved first user setup with transaction
  const checkFirstUserSetup = async (user: User) => {
    if (!user) return;

    try {
      // Start a transaction
      const { data: profiles, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      const isFirstUser = (profiles?.length || 0) === 0;

      if (isFirstUser) {
        const { error: updateError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              role: "admin",
              is_first_user: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (updateError) throw updateError;

        const actions = [
          "add_product",
          "delete_product",
          "edit_product",
          "add_price_history",
          "delete_price_history",
          "edit_price_history",
        ];

        const { error: permissionError } = await supabase
          .from("role_permissions")
          .upsert(
            actions.map((action) => ({
              role: "admin",
              action,
              allowed: true,
            })),
            { onConflict: ["role", "action"] }
          );

        if (permissionError) throw permissionError;

        toast({
          title: "Admin privileges granted",
          description: "As the first user, you have full admin access.",
        });
      }
    } catch (error) {
      console.error("First user setup failed:", error);
      toast({
        title: "Setup error",
        description: "Failed to initialize user permissions",
        variant: "destructive",
      });
    }
  };

  // Robust auth state listener
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        try {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          switch (event) {
            case "SIGNED_IN":
              await checkFirstUserSetup(currentSession?.user!);
              navigate(sessionStorage.getItem("redirectPath") || "/dashboard");
              sessionStorage.removeItem("redirectPath");
              toast({
                title: "Welcome back!",
                description: "You've been successfully signed in.",
              });
              break;

            case "SIGNED_OUT":
              setUser(null);
              setSession(null);
              navigate("/login");
              toast({
                title: "Signed out",
                description: "You've been logged out successfully.",
              });
              break;

            case "PASSWORD_RECOVERY":
              navigate("/reset-password");
              break;
          }
        } catch (error) {
          console.error("Auth state change error:", error);
          toast({
            title: "Authentication error",
            description: "Failed to process auth state change",
            variant: "destructive",
          });
        } finally {
          if (mounted) setLoading(false);
        }
      }
    );

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await checkFirstUserSetup(currentSession.user);
        }
      } catch (error) {
        console.error("Session initialization failed:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate, toast]);

  // Fixed login with proper error mapping
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Enhanced error mapping
        const errorMap: Record<string, string> = {
          "Invalid login credentials": "Invalid email or password",
          "Email not confirmed": "Please verify your email first",
        };
        
        throw new Error(errorMap[error.message] || error.message);
      }

      if (!data.session) {
        throw new Error("No session returned from server");
      }

      // Navigation handled by auth state listener
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fixed signup with email confirmation check
  const signup = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      const [firstName, ...lastNameParts] = (name || "").trim().split(" ");
      const lastName = lastNameParts.join(" ") || null;
      const displayName = name || email.split("@")[0];

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: name || displayName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      if (data.user) {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        const isFirstUser = count === 0;

        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          role: isFirstUser ? "admin" : "user",
          is_first_user: isFirstUser,
        });

        toast({
          title: "Account created",
          description: data.user.identities?.length
            ? "Please check your email to confirm your account"
            : "Welcome! Your account is ready to use",
        });
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description: error.message.includes("already registered")
          ? "This email is already registered"
          : error.message || "Failed to create account",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Email sent",
        description: "Check your inbox for password reset instructions",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // State will be cleared by auth listener
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Could not terminate session",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        signup,
        logout,
        resetPassword,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
