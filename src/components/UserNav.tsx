
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

const UserNav = () => {
  const { user, logout } = useAuth();
  const { isAdmin, userRole } = usePermission();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (user?.id) {
      fetchProfileAvatar();
    }
  }, [user]);

  const fetchProfileAvatar = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user?.id)
        .single();
      
      if (profile?.avatar_url) {
        const { data } = await supabase.storage
          .from('avatars')
          .download(profile.avatar_url);
          
        if (data) {
          const url = URL.createObjectURL(data);
          setAvatarUrl(url);
        }
      }
    } catch (error) {
      console.error('Error fetching avatar:', error);
    }
  };
  
  // Get user's initials for avatar
  const getUserInitials = () => {
    if (!user?.user_metadata?.full_name) return "U";
    return user.user_metadata.full_name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt="Profile" />
          ) : (
            <AvatarFallback className="bg-primary">
              {getUserInitials()}
            </AvatarFallback>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            <div className="flex items-center mt-1">
              {isAdmin ? (
                <div className="flex items-center text-xs text-purple-700 bg-purple-100 rounded-full px-2 py-0.5">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </div>
              ) : (
                <div className="flex items-center text-xs text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
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
          className="cursor-pointer"
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
