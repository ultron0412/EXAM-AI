import axios from "axios";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const aiClient = axios.create({
  baseURL: env.aiServiceUrl,
  timeout: 120000,
});

const handleAIError = (error) => {
  if (error.response) {
    throw new ApiError(
      502,
      "AI service returned an error",
      error.response.data ?? null,
    );
  }
  if (error.request) {
    throw new ApiError(
      503,
      "AI service is unavailable. Ensure FastAPI service is running.",
    );
  }
  throw error;
};

export const requestAnalysis = async (payload) => {
  try {
    const { data } = await aiClient.post("/analyze", payload);
    return data;
  } catch (error) {
    handleAIError(error);
  }
};

export const requestMockTest = async (payload) => {
  try {
    const { data } = await aiClient.post("/mock-test", payload);
    return data;
  } catch (error) {
    handleAIError(error);
  }
};

