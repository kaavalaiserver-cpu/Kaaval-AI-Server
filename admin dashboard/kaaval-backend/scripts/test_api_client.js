async function test() {
  try {
    console.log("Logging in as nagercoil_admin...");
    const loginRes = await fetch('http://127.0.0.1:8003/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'nagercoil_admin',
        password: '720059'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.access_token || loginData.token;
    console.log("Logged in successfully. Token length:", token.length);
    
    console.log("\nFetching violations with limit=20, page=1...");
    const res = await fetch('http://127.0.0.1:8003/api/violations?limit=20&page=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      throw new Error(`API failed with status ${res.status}: ${await res.text()}`);
    }
    
    const resData = await res.json();
    console.log("Response status:", res.status);
    console.log("Total count in response:", resData.total);
    console.log("Data length returned:", resData.data.length);
    
    console.log("\nReturned Violations (Top 10):");
    resData.data.slice(0, 10).forEach((v, index) => {
      console.log(`${index + 1}. ID: ${v.id} | TS: ${v.timestamp} | CAM: ${v.camera_id} | VEHICLE: ${v.vehicle_number} | STATUS: ${v.status} (raw: ${v.raw_status})`);
    });
    
  } catch (err) {
    console.error("API Request Error:", err.message);
  }
}

test();
