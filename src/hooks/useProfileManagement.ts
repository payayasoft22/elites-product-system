
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

export const useProfileManagement = () => {
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

  // Clean up object URLs when component unmounts or URL changes
  useEffect(() => {
    return () => {
      if (avatarUrl && avatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatarUrl]);

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

  return {
    fullName,
    setFullName,
    phoneNumber,
    setPhoneNumber,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    avatarUrl,
    uploading,
    saving,
    changingPassword,
    handleFileChange,
    handleSaveChanges,
    handleChangePassword,
  };
};
