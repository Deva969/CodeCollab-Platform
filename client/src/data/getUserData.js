import axios from "axios";
import { resolveApiUrl } from "../config";

const API_URL = resolveApiUrl();

export const getUserData = async (navigate) => {
  const accessToken = localStorage.getItem("accessToken");

  try {
    const res = await axios.get(`${API_URL}/api/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      withCredentials: true,
    });

    return res.data;
  } catch (error) {
    if (error.response?.status === 401) {
      try {
        const refreshRes = await axios.post(
          `${API_URL}/api/refresh`,
          {},
          {
            withCredentials: true,
          },
        );

        const newAccessToken = refreshRes.data.accessToken;
        localStorage.setItem("accessToken", newAccessToken);

        return getUserData(navigate);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        navigate("/login");
      }
    }

    throw error;
  }
};
