import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

export interface DraftEvent {
  name: string;
  date: string;
  location: string;
  description: string;
}

function requiredString(value: string, field: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing required field: ${field}`);
  }
  return normalized;
}

export async function createEvent(draft: DraftEvent) {
  await connectDB();

  const name = requiredString(draft.name, "name");
  const description = requiredString(draft.description, "description");
  const location = requiredString(draft.location, "location");
  const dateValue = requiredString(draft.date, "date");

  const fullDate = new Date(dateValue);
  if (isNaN(fullDate.getTime())) {
    throw new Error("Invalid date");
  }
  if (fullDate <= new Date()) {
    throw new Error("Date must be in the future");
  }

  const newEvent = await Event.create({
    title: name,
    description,
    date: fullDate,
    location,
  });

  return newEvent;
}
