import axios from "axios";
import { resolveApiUrl } from "../config";

const BASE_URL = resolveApiUrl();

export const registerData = async (name, email, password) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/api/register`,
      {
        name,
        email,
        password,
      },
      { withCredentials: true },
    );
    return res.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};

