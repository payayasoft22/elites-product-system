
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ChangePasswordFormProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  setCurrentPassword: (value: string) => void;
  setNewPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  changingPassword: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  currentPassword,
  newPassword,
  confirmPassword,
  setCurrentPassword,
  setNewPassword,
  setConfirmPassword,
  changingPassword,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4">
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
        <div className="pt-4">
          <Button type="submit" disabled={changingPassword}>
            {changingPassword && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Change Password
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ChangePasswordForm;
