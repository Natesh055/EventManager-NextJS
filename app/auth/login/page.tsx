"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
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
      await login(form.email, form.password);
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-card">Checking your account...</div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <span className="eyebrow">Welcome Back</span>
        <h1 className="section-heading mt-4 text-3xl">Log In</h1>
        <p className="section-copy">Sign in to pick up where your plans left off.</p>

        <div className="mt-8 space-y-4">
          {error && <div className="alert-error">{error}</div>}
          {success && (
            <div className="alert-success">Login successful. Redirecting...</div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="button-primary flex w-full"
          >
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="button-link">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
