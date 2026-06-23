import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { useToast } from "../components/ui/Toast";

export const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gitHubURL, setGitHubURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signup(name, email, password, gitHubURL || undefined);
      toast("Account created successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-neutral-50/50 flex flex-col items-center justify-center px-4 py-20">
      <div className="max-w-[400px] w-full flex flex-col gap-6 text-center">
        
        {/* Brand logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white font-bold text-base tracking-wider shadow-sm">
            OS
          </div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight mt-1">
            Create an OpenScout account
          </h2>
          <p className="text-sm text-neutral-400">
            Sign up to classify and explain code issues
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg border-neutral-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-medium text-left">
                  {error}
                </div>
              )}

              <Input
                label="Full Name *"
                type="text"
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                label="Email address *"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                label="Password *"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                label="GitHub URL (Optional)"
                type="url"
                placeholder="https://github.com/username"
                value={gitHubURL}
                onChange={(e) => setGitHubURL(e.target.value)}
                disabled={loading}
              />

              <Button type="submit" loading={loading} className="w-full mt-2">
                Create Account
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* Login redirection */}
        <div className="text-sm text-neutral-400">
          Already have an account?{" "}
          <Link to="/login" className="text-neutral-950 font-medium hover:underline">
            Log in
          </Link>
        </div>

      </div>
    </div>
  );
};
export default SignupPage;
