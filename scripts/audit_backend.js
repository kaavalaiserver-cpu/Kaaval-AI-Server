const axios = require('axios');

// CONFIGURATION
const BASE_URL = 'http://localhost:8003/api';
const ADMIN_USER = { username: 'devadmin', password: 'devadmin@123' };
let AUTH_TOKEN = '';

// UTILS
const logSection = (title) => console.log(`\n=== ${title} ===`);
const logSuccess = (msg) => console.log(`✅ ${msg}`);
const logError = (msg, err = '') => console.log(`❌ ${msg}`, err?.response?.data || err?.message || err);

// TESTS
const runTests = async () => {
    try {
        logSection('1. HEALTH CHECK');
        try {
            const health = await axios.get(`${BASE_URL}/health`); // AppController
            logSuccess(`Health Check: ${health.data}`);
        } catch (e) {
            logError('Health Check Failed', e);
        }

        logSection('2. AUTHENTICATION');
        try {
            const login = await axios.post(`${BASE_URL}/auth/login`, ADMIN_USER);
            AUTH_TOKEN = login.data.access_token;
            axios.defaults.headers.common['Authorization'] = `Bearer ${AUTH_TOKEN}`;
            logSuccess('Login Successful');
            
            const me = await axios.get(`${BASE_URL}/auth/me`);
            logSuccess(`Profile Verified: ${me.data.username} (${me.data.role})`);
        } catch (e) {
            logError('Authentication Failed - ABORTING REMAINING TESTS', e);
            process.exit(1);
        }

        logSection('3. SYSTEM STATUS');
        try {
            const status = await axios.get(`${BASE_URL}/system/status`);
            logSuccess(`System Uptime: ${status.data.uptime}`);
            logSuccess(`Cameras Online: ${status.data.camerasOnline}`);
        } catch (e) { logError('System Status Failed', e); }

        logSection('4. ANALYTICS');
        const analyticsEndpoints = ['summary', 'peak-hours', 'camera-efficiency', 'heatmap', 'dev'];
        for (const ep of analyticsEndpoints) {
            try {
                await axios.get(`${BASE_URL}/analytics/${ep}`);
                logSuccess(`Analytics /${ep} OK`);
            } catch (e) { logError(`Analytics /${ep} Failed`, e); }
        }

        logSection('5. VIOLATIONS');
        try {
            const v = await axios.get(`${BASE_URL}/violations?limit=1`);
            logSuccess(`Fetch Violations OK (Count: ${v.data.data.length})`);
        } catch (e) { logError('Fetch Violations Failed', e); }

        logSection('6. SEARCH');
        try {
            await axios.get(`${BASE_URL}/search?q=test`);
            logSuccess('Search API OK');
        } catch (e) { logError('Search API Failed', e); }

        logSection('7. AI SERVICE COMPATIBILITY');
        try {
            // Test if backend can talk to AI service (mock check via backend logs usually, but here we check status)
             const camStatus = await axios.get(`${BASE_URL}/cameras/status`);
             logSuccess('Camera Status OK');
        } catch (e) { logError('Camera Status Failed', e); }

        console.log('\n✨ Audit Complete');

    } catch (error) {
        logError('Unexpected Script Error', error);
    }
};

runTests();