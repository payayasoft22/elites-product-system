
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermission } from "@/hooks/usePermission";
import { Link } from "react-router-dom";
import { Shield, User, LogOut, Settings, Package, LayoutDashboard, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface ProfileWithAvatar {
  id: string;
  first_name?: string;
  email?: string;
  name?: string;
  role?: string;
  avatar_url?: string;
  created_at?: string;
  last_sign_in_at?: string;
  phone_number?: string;
}

const UserNav = () => {
  const { user, logout } = useAuth();
  const { isAdmin, userRole } = usePermission();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileWithAvatar | null>(null);
  
  useEffect(() => {
    if (user?.id) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      // Set the profile data
      setProfileData(profile);
      
      // If profile has an avatar_url property, fetch the avatar
      if (profile && profile.avatar_url) {
        try {
          const { data } = await supabase.storage
            .from('avatars')
            .createSignedUrl(profile.avatar_url, 60 * 60 * 24); // 24 hour expiry
            
          if (data?.signedUrl) {
            setAvatarUrl(data.signedUrl);
          }
        } catch (downloadError) {
          console.error('Error creating signed URL for avatar:', downloadError);
        }
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };
  
  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (avatarUrl && avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatarUrl]);
  
  // Get user's initials for avatar fallback
  const getUserInitials = () => {
    // Try to use profile data first
    if (profileData?.first_name) {
      return profileData.first_name.charAt(0).toUpperCase();
    }
    
    // Fall back to user metadata
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    
    // Last resort: use email
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return "U";
  };

  const getDisplayName = () => {
    if (profileData?.first_name) {
      return profileData.first_name;
    }
    return user?.user_metadata?.full_name || user?.email || "User";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer border-2 border-white hover:border-primary transition-all">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="Profile" />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getUserInitials()}
            </AvatarFallback>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getDisplayName()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            <div className="flex items-center mt-1">
              {isAdmin ? (
                <div className="flex items-center text-xs text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30 rounded-full px-2 py-0.5">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </div>
              ) : (
                <div className="flex items-center text-xs text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 rounded-full px-2 py-0.5">
                  <User className="h-3 w-3 mr-1" />
                  User
                </div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="cursor-pointer flex w-full items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/products" className="cursor-pointer flex w-full items-center">
            <Package className="mr-2 h-4 w-4" />
            <span>Products</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/users" className="cursor-pointer flex w-full items-center">
            <Users className="mr-2 h-4 w-4" />
            <span>Users</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="cursor-pointer flex w-full items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/user-permissions" className="cursor-pointer flex w-full items-center">
              <Shield className="mr-2 h-4 w-4" />
              <span>Manage Permissions</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/20"
          onClick={async () => {
            await logout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserNav;
