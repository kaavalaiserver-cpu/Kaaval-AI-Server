async function run() {
  try {
    const loginRes = await fetch('http://127.0.0.1:8003/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@kaaval.ai', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;

    const statsRes = await fetch('http://127.0.0.1:8003/api/violations/stats?dateFrom=2026-06-13T00:00:00&dateTo=2026-06-13T23:59:59', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const statsData = await statsRes.json();

    console.log('STATS FOR 13-06-2026:');
    console.log(statsData);

    const statsGlobalRes = await fetch('http://127.0.0.1:8003/api/violations/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const statsGlobalData = await statsGlobalRes.json();

    console.log('\nSTATS WITHOUT PARAMS (GLOBAL):');
    console.log(statsGlobalData);
  } catch (err) {
    console.error(err);
  }
}
run();
