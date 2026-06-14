const axios = require('axios');
const redis = require('redis');

async function run() {
  try {
    const loginRes = await axios.post('http://127.0.0.1:8003/api/auth/login', {
      email: 'admin@kaaval.ai',
      password: 'password123'
    });
    const token = loginRes.data.access_token;

    const statsRes = await axios.get('http://127.0.0.1:8003/api/violations/stats', {
      params: {
        dateFrom: '2026-06-13T00:00:00',
        dateTo: '2026-06-13T23:59:59'
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('STATS FOR 13-06-2026:');
    console.log(statsRes.data);

    const statsGlobalRes = await axios.get('http://127.0.0.1:8003/api/violations/stats', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\nSTATS WITHOUT PARAMS (GLOBAL):');
    console.log(statsGlobalRes.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
run();
