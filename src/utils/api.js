import axios from 'axios';

// All requests are proxied through Vite dev server → http://localhost:5000
const api = axios.create({ baseURL: '/api', timeout: 30000 });

/**
 * Send a chat message to the AI backend.
 * @param {string} message       - User's text
 * @param {string} sessionId     - UUID for this consultation session
 * @param {object} collectedData - Data already gathered so AI can skip repeats
 * @returns {{ message, next_step, collected_data }}
 */
export async function sendMessage(message, sessionId, collectedData = {}) {
  const { data } = await api.post('/chat', { message, sessionId, collectedData });
  return data;
}

/**
 * Verify a 6-digit OTP (dummy — any 6 digits are accepted).
 * @param {string} mobile
 * @param {string} otp
 * @returns {{ success, message, mobile }}
 */
export async function verifyOTP(mobile, otp) {
  const { data } = await api.post('/verify-otp', { mobile, otp });
  return data;
}

/**
 * Persist the collected user profile to MySQL.
 * @param {object} profileData
 * @returns {{ success, message, userId }}
 */
export async function saveProfile(profileData) {
  const { data } = await api.post('/save-profile', profileData);
  return data;
}
