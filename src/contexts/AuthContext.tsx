// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  first_name?: string;
  last_name?: string;
  display_name?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  permissions: Record<string, boolean>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role, first_name, last_name, display_name')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const fetchUserPermissions = async (userId: string, role: string) => {
    try {
      // Get role-based permissions
      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select('action, allowed')
        .eq('role', role);

      // Get user-specific permissions (override role permissions)
      const { data: userPermissions } = await supabase
        .from('user_permissions')
        .select('action, allowed')
        .eq('user_id', userId);

      // Combine permissions (user-specific take precedence)
      const permissionsMap: Record<string, boolean> = {};

      // First apply role permissions
      rolePermissions?.forEach(perm => {
        permissionsMap[perm.action] = perm.allowed;
      });

      // Then override with user-specific permissions
      userPermissions?.forEach(perm => {
        permissionsMap[perm.action] = perm.allowed;
      });

      return permissionsMap;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      return {};
    }
  };

  const refreshUserData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const profileData = await fetchUserProfile(user.id);
      if (!profileData) return;

      const permissionsData = await fetchUserPermissions(user.id, profileData.role);
      
      setProfile(profileData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setLoading(false);
    }
  };

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
          .upsert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: 'admin',
            updated_at: new Date().toISOString()
          });

        // 4. Set up admin permissions
        const adminActions = [
          'create_products', 'edit_products', 'delete_products',
          'manage_price_history', 'manage_users', 'view_reports'
        ];

        await supabase
          .from('role_permissions')
          .upsert(
            adminActions.map(action => ({
              role: 'admin',
              action,
              allowed: true
            })),
            { onConflict: ['role', 'action'] }
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

  const handleAuthChange = async (event: string, currentSession: Session | null) => {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);

    if (event === 'SIGNED_IN' && currentSession?.user) {
      try {
        await checkFirstUserSetup(currentSession.user);
        const profileData = await fetchUserProfile(currentSession.user.id);
        
        if (profileData) {
          const permissionsData = await fetchUserPermissions(
            currentSession.user.id, 
            profileData.role
          );
          
          setProfile(profileData);
          setPermissions(permissionsData);
          
          toast({
            title: "Signed in successfully",
            description: `Welcome back, ${profileData.name || profileData.email}!`,
          });
          navigate("/dashboard");
        }
      } catch (error) {
        console.error('Error handling sign in:', error);
      }
    } else if (event === 'SIGNED_OUT') {
      setProfile(null);
      setPermissions({});
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate("/login");
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          await handleAuthChange('SIGNED_IN', currentSession);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    
    return () => subscription.unsubscribe();
  }, [navigate, toast]);

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
      // Validate input
      if (!email) throw new Error("Email is required");

      const [firstName, ...lastNameParts] = (name || '').split(' ');
      const lastName = lastNameParts.join(' ') || null;
      const displayName = name || email.split('@')[0];

      // 1. Check if this will be the first user
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const isFirstUser = count === 0;

      // 2. Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: displayName
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      // 3. Create profile with appropriate role
      if (data.user) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            name: displayName,
            role: isFirstUser ? 'admin' : 'user'
          });

        // 4. If first user, set up admin permissions
        if (isFirstUser) {
          const adminActions = [
            'create_products', 'edit_products', 'delete_products',
            'manage_price_history', 'manage_users', 'view_reports'
          ];

          await supabase
            .from('role_permissions')
            .upsert(
              adminActions.map(action => ({
                role: 'admin',
                action,
                allowed: true
              })),
              { onConflict: ['role', 'action'] }
            );
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
        description: error.message.includes("row-level security") 
          ? "Permission denied during signup" 
          : error.message || "Failed to create account",
        variant: "destructive"
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
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        permissions,
        login,
        signup,
        logout,
        resetPassword,
        isAuthenticated: !!user,
        refreshUserData
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
