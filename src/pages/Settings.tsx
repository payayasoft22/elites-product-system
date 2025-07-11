
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface ProfileWithExtendedFields {
  id: string;
  first_name?: string;
  email?: string;
  name?: string;
  role?: string;
  avatar_url?: string;
  phone_number?: string;
  created_at?: string;
  last_sign_in_at?: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [existingAvatarPath, setExistingAvatarPath] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (profile) {
        const typedProfile = profile as ProfileWithExtendedFields;

        setFullName(typedProfile.first_name || "");

        if (typedProfile.phone_number !== undefined) {
          setPhoneNumber(typedProfile.phone_number || "");
        }

        if (typedProfile.avatar_url) {
          setExistingAvatarPath(typedProfile.avatar_url);
          try {
            const { data } = await supabase.storage
              .from("avatars")
              .createSignedUrl(typedProfile.avatar_url, 60 * 60 * 24); // 24 hour expiry

            if (data?.signedUrl) {
              setAvatarUrl(data.signedUrl);
            }
          } catch (avatarError) {
            console.error("Error downloading avatar:", avatarError);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Handle avatar upload if there's a new file
      let avatarPath = existingAvatarPath;
      
      if (avatarFile) {
        setUploading(true);
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        
        // Upload the new avatar
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;
        
        // If upload successful, update the avatar path
        avatarPath = fileName;
        
        // Delete the old avatar if it exists
        if (existingAvatarPath) {
          await supabase.storage
            .from("avatars")
            .remove([existingAvatarPath]);
        }
        
        setExistingAvatarPath(fileName);
        setUploading(false);
      }

      const updates: ProfileWithExtendedFields = {
        id: user?.id || "",
        first_name: fullName,
        phone_number: phoneNumber || "",
      };
      
      if (avatarPath) {
        updates.avatar_url = avatarPath;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your profile information has been updated.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Clean up object URLs when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (avatarUrl && avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatarUrl]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account details and profile information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4 sm:items-start">
                <Label className="text-center sm:text-left">
                  Profile Picture
                </Label>
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <Avatar className="h-24 w-24">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback className="text-2xl">
                        {fullName?.charAt(0) || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="picture" className="cursor-pointer">
                      <div className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 hover:bg-secondary/80">
                        <Camera className="h-4 w-4" />
                        <span>
                          {uploading ? "Uploading..." : "Change Picture"}
                        </span>
                        {uploading && (
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        )}
                      </div>
                      <input
                        id="picture"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or GIF. Max size 1MB.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <form onSubmit={handleSaveChanges}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue={user?.email} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="Enter your phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your phone number can be used for password recovery.
                    </p>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to ensure account security.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Change Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
