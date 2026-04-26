import { registerUser, loginUser } from "../services/authService.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validateCredentials = ({ email, password, name }, isRegister) => {
  if (!email || !password || (isRegister && !name)) {
    throw new ApiError(
      400,
      isRegister
        ? "name, email, and password are required"
        : "email and password are required",
    );
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }
};

export const register = asyncHandler(async (req, res) => {
  validateCredentials(req.body, true);
  const response = await registerUser(req.body);
  res.status(201).json(response);
});

export const login = asyncHandler(async (req, res) => {
  validateCredentials(req.body, false);
  const response = await loginUser(req.body);
  res.status(200).json(response);
});

