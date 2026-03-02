import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";

export async function GET() {
  try {
    await connectDB();

    const events = await Event.find({})
      .sort({ date: 1 })
      .lean();

    return NextResponse.json(JSON.parse(JSON.stringify(events)));
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const { title, description, date, location } = body;

    if (!title || !description || !date || !location) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    if (new Date(date) <= new Date()) {
      return NextResponse.json(
        { message: "Date must be in the future" },
        { status: 400 }
      );
    }

    const newEvent = await Event.create({
      title,
      description,
      date,
      location,
    });

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create event" },
      { status: 500 }
    );
  }
}
