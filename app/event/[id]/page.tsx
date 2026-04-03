"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";

interface EventItem {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  participants: string[];
}

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const eventId =
    typeof params.id === "string" ? params.id : params.id?.[0];

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  // Fetch event
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);

        if (!res.ok) {
          setError("Event not found");
          return;
        }

        const data = await res.json();
        setEvent(data);
      } catch {
        setError("Failed to fetch event");
      } finally {
        setLoading(false);
      }
    };

    if (eventId) fetchEvent();
  }, [eventId]);

  // Join event
  const handleJoinEvent = async () => {
    if (!event) return;

    const email = prompt("Enter your email to join the event:");
    if (!email) return;

    setJoining(true);

    try {
      const res = await fetch(
        `/api/events/${event._id}/participate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (res.ok) {
        alert("Successfully joined the event!");

        // refresh event
        const refreshRes = await fetch(`/api/events/${event._id}`);
        const updatedEvent = await refreshRes.json();
        setEvent(updatedEvent);
      } else {
        const errorData = await res.json();
        alert(`Failed to join event: ${errorData.message}`);
      }
    } catch (err) {
      alert(
        `Error joining event: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setJoining(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="loading-state">
        <div className="loading-card">Loading event details...</div>
      </div>
    );
  }

  if (!user) return null;

  // Error state
  if (error || !event) {
    return (
      <div className="page-shell flex items-center justify-center">
        <div className="empty-state">
          <h2 className="text-3xl font-semibold text-slate-900">Event Not Found</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
            The event you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <div className="mt-7">
            <Link href="/" className="button-primary">
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="page-shell">
      <div className="page-container max-w-4xl">
        <Link href="/" className="back-link mb-6">
          <span>←</span>
          <span>Back to Events</span>
        </Link>

        <article className="panel-strong overflow-hidden">
          <div className="event-card-banner min-h-56 p-8 sm:p-10">
            <div className="space-y-4">
              <span className="meta-chip">
                {event.participants?.length || 0} participants
              </span>
              <h1 className="section-heading max-w-2xl text-white">
                {event.title}
              </h1>
            </div>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            <section>
              <span className="eyebrow">Overview</span>
              <p className="mt-4 text-base leading-7 text-slate-700">
                {event.description}
              </p>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="detail-row">
                  <span className="detail-icon">📅</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Date
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="stat-card sm:col-span-2">
                <div className="detail-row">
                  <span className="detail-icon">📍</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Location
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {event.location}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="eyebrow">Attendance</span>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-900">
                    {event.participants?.length || 0} people joined
                  </h2>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  Invite more guests or join now to save your spot.
                </p>
              </div>
            </section>

            <button
              onClick={handleJoinEvent}
              disabled={joining}
              className="button-primary flex w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {joining ? "Joining..." : "Join Event"}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
