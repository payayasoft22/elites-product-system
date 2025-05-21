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

  // Check and assign first user admin privileges
  const checkFirstUserSetup = async (user: User | null) => {
    if (!user) return;
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (profile?.role === "admin") return;

      const { count, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      if (count === 0) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            role: "admin",
            is_first_user: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

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
            { onConflict: "role,action" }
          );

        if (permissionError) throw permissionError;

        toast({
          title: "Admin privileges granted",
          description: "As the first user, you have full admin access.",
        });
      }
    } catch (error) {
      console.error("First user setup check failed:", error);
    }
  };

  useEffect(() => {
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          await checkFirstUserSetup(currentSession?.user ?? null);
          toast({
            title: "Signed in successfully",
            description: "Welcome to Elites Project System!",
          });
          navigate("/dashboard");
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setSession(null);
          setLoading(false);
          navigate("/login");
          toast({
            title: "Signed out",
            description: "You have been signed out successfully.",
          });
        }
      }
    );

    supabase.auth.getSession()
      .then(async ({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await checkFirstUserSetup(currentSession.user);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to get current session", error);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [toast, navigate]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      if (!email) throw new Error("Email is required");

      const [firstName, ...lastNameParts] = (name || "").trim().split(" ");
      const lastName = lastNameParts.join(" ") || null;
      const displayName = name || email.split("@")[0];

      const { count, error: countError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      const isFirstUser = count === 0;

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
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              display_name: displayName,
              role: isFirstUser ? "admin" : "user",
              is_first_user: isFirstUser,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (profileError) throw profileError;

        if (isFirstUser) {
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
              { onConflict: "role,action" }
            );

          if (permissionError) throw permissionError;
        }
      }

      toast({
        title: "Account created",
        description: isFirstUser
          ? "First admin account created successfully!"
          : "Please check your email to confirm your account",
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description:
          error.message.includes("row-level security")
            ? "Permission denied during signup"
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
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message || "Failed to send reset email. Please try again.",
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

      setUser(null);
      setSession(null);
      navigate("/login");
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to log out. Please try again.",
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
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
