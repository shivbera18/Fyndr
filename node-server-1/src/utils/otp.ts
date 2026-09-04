import crypto from "crypto";

// In-memory store mapping email -> OTP (same semantics as before:
// single live OTP per email, consumed on successful verification).
export const otpStorage: Record<string, string> = {};

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
}
