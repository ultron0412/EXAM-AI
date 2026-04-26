import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const extractToken = (authorization = "") => {
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice(7);
};

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req.headers.authorization);
  if (!token) {
    throw new ApiError(401, "Authentication token is required");
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(payload.sub).lean();
  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
  };
  next();
});

