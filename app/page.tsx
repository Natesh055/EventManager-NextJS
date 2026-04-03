"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  participants: string[];
}

export default function Home() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // Fetch events when authenticated
  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setEventsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-card">Loading your event dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="page-shell">
      <div className="page-container space-y-8">
        <section className="hero-panel">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="eyebrow">Community Events</span>
              <h1 className="section-heading mt-4">EventHub</h1>
              <p className="section-copy">
                Discover memorable gatherings, launch your own experiences, and
                keep your crew in the loop from one polished dashboard.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="info-pill">Host signed in: {user.name}</div>
              <div className="flex flex-wrap gap-3">
                <Link href="/create" className="button-secondary">
                  Create Event
                </Link>
                <button onClick={logout} className="button-danger">
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="eyebrow">Live Feed</span>
              <h2 className="section-heading mt-3 text-2xl sm:text-3xl">
                Upcoming Events {events.length > 0 ? `(${events.length})` : ""}
              </h2>
              <p className="section-copy mt-1">
                Browse what&apos;s coming up and jump into the plans that match
                your energy.
              </p>
            </div>
          </div>

          {eventsLoading ? (
            <div className="loading-card">Loading events...</div>
          ) : events && events.length > 0 ? (
            <div className="event-grid">
              {events.map((event) => (
                <Link
                  key={event._id}
                  href={`/event/${event._id}`}
                  className="group"
                >
                  <article className="event-card">
                    <div className="event-card-banner">
                      <div className="space-y-3">
                        <span className="meta-chip">
                          {event.participants?.length || 0} attendees
                        </span>
                        <h3 className="event-card-title">{event.title}</h3>
                      </div>
                    </div>

                    <div className="event-card-body">
                      <p className="muted-copy line-clamp-3">
                        {event.description}
                      </p>

                      <div className="detail-list">
                        <div className="detail-row">
                          <span className="detail-icon">📅</span>
                          <span>
                            {new Date(event.date).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-icon">📍</span>
                          <span>{event.location}</span>
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="text-sm font-semibold text-slate-500">
                          View details
                        </span>
                        <span className="button-link">Open event</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="text-5xl">📭</div>
              <h3 className="mt-5 text-3xl font-semibold text-slate-900">
                No events yet
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                Start the calendar with a standout meetup, workshop, or casual
                hangout.
              </p>
              <div className="mt-7">
                <Link href="/create" className="button-primary">
                  Create the first event
                </Link>
              </div>
            </div>
          )}
        </section>

        <Link
          href="/chatbot"
          className="button-primary fixed bottom-6 right-6 z-20 shadow-2xl sm:bottom-8 sm:right-8"
        >
          Plan with Chatbot
        </Link>
      </div>
    </div>
  );
}
