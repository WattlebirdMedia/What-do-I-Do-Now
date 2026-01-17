import axios from "axios";

const API = "http://localhost:5000"; // adjust if your PORT is different

async function testAuth() {
  try {
    // 1️⃣ Register a new user
    const registerResp = await axios.post(`${API}/auth/register`, {
      email: "testuser@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });
    console.log("Register response:", registerResp.data);

    // 2️⃣ Login with the same user
    const loginResp = await axios.post(`${API}/auth/login`, {
      email: "testuser@example.com",
      password: "password123",
    });
    console.log("Login response:", loginResp.data);

    const token = loginResp.data.token;

    // 3️⃣ Test protected route
    const meResp = await axios.get(`${API}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("Protected /me response:", meResp.data);

  } catch (err: any) {
    if (err.response) {
      console.error("Error response:", err.response.data);
    } else {
      console.error(err);
    }
  }
}

testAuth();