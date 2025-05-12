
import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";

interface ProfileAvatarProps {
  avatarUrl: string | null;
  fullName: string;
  uploading: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarUrl,
  fullName,
  uploading,
  handleFileChange,
}) => {
  return (
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
  );
};

export default ProfileAvatar;
