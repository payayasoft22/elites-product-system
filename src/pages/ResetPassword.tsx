
import { useState, FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email && !phone) {
      toast({
        title: "Input required",
        description: "Please enter either your email or phone number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      if (email) {
        // Email-based reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) throw error;
        
        setVerificationSent(true);
        toast({
          title: "Reset link sent!",
          description: "Check your email for the password reset link.",
        });
      } else if (phone) {
        // Phone-based reset (this is a placeholder, as Supabase doesn't directly support phone resets)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('phone_number', phone)
          .single();
          
        if (error || !data?.email) {
          toast({
            title: "Account not found",
            description: "No account found with this phone number.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        // Now that we have the email, send a password reset to it
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (resetError) throw resetError;
        
        setVerificationSent(true);
        toast({
          title: "Reset link sent!",
          description: "A password reset link has been sent to your email address.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      toast({
        title: "Invalid password",
        description: "Your password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been successfully reset.",
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Helmet>
        <title>Reset Password | Elites Product Management</title>
      </Helmet>
      
      <Link to="/login" className="absolute left-8 top-8 flex items-center text-sm font-medium text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to login
      </Link>
      
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {token ? "Set New Password" : "Reset Password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {token 
              ? "Enter your new password below." 
              : "Enter your email or phone number to reset your password."}
          </p>
        </div>

        <Card>
          {!token ? (
            <form onSubmit={handleRequestReset}>
              <CardHeader>
                <CardTitle>Request Password Reset</CardTitle>
                <CardDescription>
                  We'll send you a link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-muted"></div>
                  <span className="mx-4 flex-shrink text-muted-foreground text-sm">OR</span>
                  <div className="flex-grow border-t border-muted"></div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="submit" disabled={loading || verificationSent}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {verificationSent ? "Check your email" : "Send reset link"}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <CardHeader>
                <CardTitle>Set New Password</CardTitle>
                <CardDescription>
                  Create a new secure password for your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
