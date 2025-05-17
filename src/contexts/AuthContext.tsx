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
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed in successfully",
            description: "Welcome to Elites Project System!",
          });
          navigate("/dashboard");
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out",
            description: "You have been signed out successfully.",
          });
        }
      }
    );
    
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
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
    // Validate email is provided
    if (!email) {
      throw new Error("Email is required");
    }

    // Split name into first and last
    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ') || null;
    const displayName = name || email.split('@')[0];

    // 1. Create auth user
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: name || displayName
        },
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });
    
    if (error) throw error;

    // 2. Check if user already exists
    if (data.user?.identities?.length === 0) {
      throw new Error("An account with this email already exists.");
    }

    // 3. Create profile record - ensure email is included
    if (data.user) {
      const profileData = {
        id: data.user.id,
        email: data.user.email || email, // Fallback to the provided email
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        role: 'user',
        is_first_user: false,
        is_cross: false
      };

      console.log("Creating profile with:", profileData); // Debug log

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error("Profile error details:", profileError);
        throw new Error("Failed to create user profile.");
      }
    }

    toast({
      title: "Account created",
      description: "Please check your email to confirm your account.",
    });
    
  } catch (error: any) {
    console.error("Full signup error:", error);
    let errorMessage = error.message;
    
    if (error.code === '23505') {
      errorMessage = "This email is already registered. Please log in instead.";
    } else if (error.message.includes("permission denied")) {
      errorMessage = "Permission denied. Please contact support.";
    } else if (error.message.includes("null value in column \"email\"")) {
      errorMessage = "Email address is required for registration.";
    }
    
    toast({
      title: "Signup failed",
      description: errorMessage || "Failed to create account. Please try again.",
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
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
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
