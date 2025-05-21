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
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          // Check if this is the first user after sign in
          await checkFirstUserSetup(currentSession?.user);
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
    
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await checkFirstUserSetup(currentSession.user);
      }
      setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, [toast, navigate]);

  const checkFirstUserSetup = async (user: User) => {
    try {
      // 1. Check if user already has admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') return;

      // 2. Check if this is the first user
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const isFirstUser = count === 0;

      // 3. Update profile if needed
      if (isFirstUser) {
        await supabase
          .from('profiles')
          .update({
            role: 'admin',
            is_first_user: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        // 4. Set up admin permissions
        const actions = [
          'add_product', 'delete_product', 'edit_product',
          'add_price_history', 'delete_price_history', 'edit_price_history'
        ];

        await supabase
          .from('role_permissions')
          .upsert(
            actions.map(action => ({
              role: 'admin',
              action,
              allowed: true
            })),
            { onConflict: 'role,action' }
          );

        toast({
          title: 'Admin privileges granted',
          description: 'As the first user, you have full admin access.',
        });
      }
    } catch (error) {
      console.error('First user setup check failed:', error);
    }
  };
  
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
    // Prepare profile data
    const [firstName, ...lastNameParts] = (name || '').split(' ');
    const lastName = lastNameParts.join(' ') || null;
    const displayName = name || email.split('@')[0];

    // 1. First check if this will be the first user
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    const isFirstUser = count === 0;

    // 2. Create auth user first
    const { data: { user }, error: authError } = await supabase.auth.signUp({
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

    if (authError) throw authError;
    if (!user) throw new Error('User creation failed - no user returned');

    // 3. Now create the profile with a small delay to ensure user exists
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        role: isFirstUser ? 'admin' : 'user',
        is_first_user: isFirstUser,
        status: 'active'
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      // If profile creation fails, delete the auth user to maintain consistency
      await supabase.auth.admin.deleteUser(user.id);
      throw profileError;
    }

    // 4. If first user, set up permissions
    if (isFirstUser) {
      const actions = [
        'add_product', 'delete_product', 'edit_product',
        'add_price_history', 'delete_price_history', 'edit_price_history'
      ];

      await supabase
        .from('role_permissions')
        .upsert(
          actions.map(action => ({
            role: 'admin',
            action,
            allowed: true
          })),
          { onConflict: 'role,action' }
        );
    }

    toast({
      title: "Account created",
      description: isFirstUser 
        ? "First admin account created successfully!" 
        : "Please check your email to confirm your account",
    });

    return user;

  } catch (error: any) {
    console.error("Signup error:", error);
    
    let errorMessage = error.message;
    if (error.code === '23503') { // Foreign key violation
      errorMessage = "Account creation failed due to system error. Please try again or contact support.";
    } else if (error.message.includes('duplicate key value')) {
      errorMessage = "An account with this email already exists.";
    }

    toast({
      title: "Signup failed",
      description: errorMessage,
      variant: "destructive"
    });
    throw error;
  } finally {
    setLoading(false);
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
