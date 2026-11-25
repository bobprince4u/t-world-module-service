import mongoose from "mongoose";

export type UserRole = "admin" | "user";

interface UserAttributes {
  firebaseUid: string;
  email: string;
  role: UserRole;
  tokenBalance: number;
}

const userSchema = new mongoose.Schema<UserAttributes>(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
      required: true,
    },
    tokenBalance: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const User =
  mongoose.models.User ?? mongoose.model<UserAttributes>("User", userSchema);
