import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

export interface DraftEvent {
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
}

export async function createEvent(draft: DraftEvent) {
  await connectDB();
  // combine date & time into one Date object
  const fullDate = new Date(`${draft.date} ${draft.time}`);
  if (isNaN(fullDate.getTime())) {
    throw new Error("Invalid date/time");
  }

  const newEvent = await Event.create({
    title: draft.name,
    description: draft.description,
    date: fullDate,
    location: draft.location,
  });

  return newEvent;
}
