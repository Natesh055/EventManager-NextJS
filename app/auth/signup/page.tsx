"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading, signup } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signup(form.name, form.email, form.password, form.confirmPassword);
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-card">Loading signup...</div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <span className="eyebrow">Create Account</span>
        <h1 className="section-heading mt-4 text-3xl">Sign Up</h1>
        <p className="section-copy">
          Set up your profile and start hosting or joining standout events.
        </p>

        <div className="mt-8 space-y-4">
          {error && <div className="alert-error">{error}</div>}
          {success && (
            <div className="alert-success">
              Account created successfully. Redirecting...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label">
              Full Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isLoading}
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="input"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="label">
              Email<span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              disabled={isLoading}
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label">
              Password<span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              disabled={isLoading}
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="input"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="label">
              Confirm Password<span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              disabled={isLoading}
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className="input"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="button-primary flex w-full"
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="button-link">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
