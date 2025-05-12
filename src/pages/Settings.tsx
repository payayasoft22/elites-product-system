
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import ProfileAvatar from "@/components/settings/ProfileAvatar";
import ProfileInfoForm from "@/components/settings/ProfileInfoForm";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";
import { useProfileManagement } from "@/hooks/useProfileManagement";

const Settings = () => {
  const { user } = useAuth();
  const {
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
  } = useProfileManagement();

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
              <ProfileAvatar 
                avatarUrl={avatarUrl} 
                fullName={fullName} 
                uploading={uploading} 
                handleFileChange={handleFileChange} 
              />
              
              <Separator />
              
              <ProfileInfoForm
                userEmail={user?.email}
                fullName={fullName}
                phoneNumber={phoneNumber}
                setFullName={setFullName}
                setPhoneNumber={setPhoneNumber}
                saving={saving}
                onSubmit={handleSaveChanges}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to ensure account security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm
                currentPassword={currentPassword}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                setCurrentPassword={setCurrentPassword}
                setNewPassword={setNewPassword}
                setConfirmPassword={setConfirmPassword}
                changingPassword={changingPassword}
                onSubmit={handleChangePassword}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
