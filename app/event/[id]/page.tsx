"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Event {
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
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${params.id}`);
        if (!res.ok) {
          setError("Event not found");
          return;
        }
        const data = await res.json();
        setEvent(data);
      } catch (err) {
        setError("Failed to fetch event");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchEvent();
  }, [params.id]);

  const handleJoinEvent = async () => {
    if (!event) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/events/${event._id}/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        alert("Successfully joined the event!");
        // Refresh event data
        const refreshRes = await fetch(`/api/events/${event._id}`);
        const updatedEvent = await refreshRes.json();
        setEvent(updatedEvent);
      } else {
        alert("Failed to join event");
      }
    } catch (err) {
      alert("Error joining event");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-6">The event you're looking for doesn't exist.</p>
          <Link
            href="/"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-block mb-6 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          ← Back to Events
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Event Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-8">
            <h1 className="text-4xl font-bold text-white mb-2">{event.title}</h1>
          </div>

          {/* Event Details */}
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Description</h2>
              <p className="text-gray-700 leading-relaxed">{event.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b">
              <div>
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3">📅</span>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-3">📍</span>
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="text-lg font-semibold text-gray-800">{event.location}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Participants ({event.participants?.length || 0})
              </h2>
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-indigo-800">
                  {event.participants?.length || 0} people have joined this event
                </p>
              </div>
            </div>

            <button
              onClick={handleJoinEvent}
              disabled={joining}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-lg transition duration-200"
            >
              {joining ? "Joining..." : "Join Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
