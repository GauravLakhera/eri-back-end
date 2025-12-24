export const appConfig = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRY || '7d',
  },
  session: {
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30'),
    itdTimeoutMinutes: parseInt(process.env.ITD_SESSION_TIMEOUT_MINUTES || '25'),
  },
  otp: {
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3'),
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
  },
};