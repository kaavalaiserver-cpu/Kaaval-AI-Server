# Troubleshooting Guide

## Common Issues

### Backend Connection Errors (`ConnectTimeoutError`, `MaxRetryError`)
**Symptom:** Python service crashes with `urllib3.exceptions.MaxRetryError: HTTPConnectionPool(host='localhost', port=8003)`.
**Cause:** The Backend service (Port 8003) is down, restarting, or slow to respond.
**Fix:**
1. Check if the Backend window is running.
2. Wait 10-15 seconds for the Backend to fully initialize.
3. We have implemented **Automatic Retry and Fault Tolerance** in the AI Engine. It will now silently retry instead of crashing.

### Empty Evidence Archive
**Symptom:** The Dashboard > Evidence Archive page shows no results.
**Checklist:**
1. Ensure `plate_api` (AI Engine) is running (Port 8000).
2. Check the **System Logs** page on the Dashboard. You should see "Processing batch..." and "Enqueued violation..." messages.
3. If logs show "No readable plates found", adjust the camera angle or check lighting.
4. If logs show "Backend connection failed", check if the Backend (Port 8003) is running.

### Windows Permissions
**Symptom:** "Access is denied" when running scripts.
**Fix:** Run `START_PROJECT.bat` as Administrator.
