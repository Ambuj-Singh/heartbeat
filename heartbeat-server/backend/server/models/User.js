const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["ADMIN", "OPERATOR", "VIEWER"],
      required: true,
      default: "VIEWER",
      index: true
    },
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
    refreshTokenFamily: { type: String, default: null }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

module.exports = model("User", userSchema);
