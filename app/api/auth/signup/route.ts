import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { email, password, confirmPassword, name } = await req.json();

    // Validation
    if (!email || !password || !confirmPassword || !name) {
      return Response.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return Response.json(
        { message: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { message: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return Response.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      email,
      password: hashedPassword,
      name,
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return Response.json(
      {
        message: "User created successfully",
        token,
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return Response.json(
      { message: "Failed to create user" },
      { status: 500 }
    );
  }
}
