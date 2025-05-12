
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ProfileInfoFormProps {
  userEmail: string | undefined;
  fullName: string;
  phoneNumber: string;
  setFullName: (value: string) => void;
  setPhoneNumber: (value: string) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export const ProfileInfoForm: React.FC<ProfileInfoFormProps> = ({
  userEmail,
  fullName,
  phoneNumber,
  setFullName,
  setPhoneNumber,
  saving,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" defaultValue={userEmail} readOnly />
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
  );
};

export default ProfileInfoForm;
