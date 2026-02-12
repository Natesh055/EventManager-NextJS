import Link from "next/link";

async function getEvents() {
  const res = await fetch("http://localhost:3000/api/events", {
    cache: "no-store",
  });

  return res.json();
}

export default async function Home() {
  const { events } = await getEvents();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Section */}
      <div className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">EventHub</h1>
              <p className="text-gray-600 mt-2">Discover and create amazing events</p>
            </div>
            <Link
              href="/create"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
            >
              + Create Event
            </Link>
          </div>
        </div>
      </div>

      {/* Events Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {events && events.length > 0 ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800">
                Upcoming Events ({events.length})
              </h2>
              <p className="text-gray-600 mt-2">Explore and join upcoming events</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event: any) => (
                <Link
                  key={event._id}
                  href={`/event/${event._id}`}
                  className="group"
                >
                  <div className="h-full bg-white rounded-lg shadow-md hover:shadow-xl transition duration-300 overflow-hidden hover:scale-105 transform">
                    {/* Event Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-32 flex items-end p-4">
                      <h3 className="text-2xl font-bold text-white group-hover:text-indigo-100 transition">
                        {event.title}
                      </h3>
                    </div>

                    {/* Event Content */}
                    <div className="p-6">
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="space-y-3 mb-4 border-b border-gray-200 pb-4">
                        <div className="flex items-center text-gray-700">
                          <span className="text-lg mr-3">📅</span>
                          <span className="font-medium">
                            {new Date(event.date).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center text-gray-700">
                          <span className="text-lg mr-3">📍</span>
                          <span className="font-medium">{event.location}</span>
                        </div>
                      </div>

                      {/* Participants */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600">👥 </span>
                          <span className="text-sm font-medium text-gray-700 ml-1">
                            {event.participants?.length || 0} Participants
                          </span>
                        </div>
                        <span className="text-indigo-600 font-medium group-hover:text-indigo-700 transition">
                          {/* Vie w → */}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Events Yet</h3>
            <p className="text-gray-600 mb-6">Be the first to create an event!</p>
            <Link
              href="/create"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition duration-200"
            >
              Create First Event
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
