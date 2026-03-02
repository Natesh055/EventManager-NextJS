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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Create Event
        </h1>
        <p className="text-gray-500 mb-6">
          Fill in the details below to create a new event
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Event created successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {Object.entries(fieldLabels).map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {label} <span className="text-red-500">*</span>
              </label>

              <input
                type={key === "date" ? "date" : "text"}
                required
                disabled={formLoading}
                value={form[key as keyof typeof form]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={`Enter ${label.toLowerCase()}`}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={formLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2"
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
          className="w-full mt-3 text-gray-600 hover:text-gray-800 font-medium py-2 rounded-lg border border-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}