"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

export default function CreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/"), 1500);
      } else {
        const errorData = await res.json();
        setError(errorData.message || "Failed to create event");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const fieldLabels = {
    title: "Event Title",
    description: "Description",
    date: "Event Date",
    location: "Location",
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-card">Preparing your event workspace...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <span className="eyebrow">Host Dashboard</span>
        <h1 className="section-heading mt-4 text-3xl">Create Event</h1>
        <p className="section-copy">
          Fill in the essentials and launch a polished event page in minutes.
        </p>

        <div className="mt-8 space-y-4">
          {error && <div className="alert-error">{error}</div>}
          {success && (
            <div className="alert-success">
              Event created successfully. Redirecting...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {Object.entries(fieldLabels).map(([key, label]) => (
            <div key={key}>
              <label className="label">
                {label} <span className="text-red-500">*</span>
              </label>

              <input
                type={key === "date" ? "date" : "text"}
                required
                disabled={formLoading}
                value={form[key as keyof typeof form]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={`Enter ${label.toLowerCase()}`}
                className="input"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={formLoading}
            className="button-primary flex w-full"
          >
            {formLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </button>
        </form>

        <button
          onClick={() => router.back()}
          className="button-ghost mt-3 flex w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
