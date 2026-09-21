const { z } = require('zod');

const password = z.string().min(8, 'Password must be at least 8 characters').max(72);

// blank / whitespace → undefined; otherwise trim and validate
const optional = (schema) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : (typeof v === 'string' ? v.trim() : v)),
    schema.optional()
  );

const registerSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Please enter your name').max(120),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone: optional(z.string().min(7, 'Phone number looks too short').max(20)),
    password,
    referralCode: optional(z.string().min(4).max(20)),
  }),
};

const loginSchema = {
  body: z.object({
    emailOrPhone: z.string().trim().min(3, 'Enter your email or phone'),
    password: z.string().min(1, 'Enter your password'),
  }),
};

const forgotSchema = {
  body: z.object({ email: z.string().trim().toLowerCase().email() }),
};

const resetSchema = {
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    token: z.string().min(10),
    password,
  }),
};

const phone = z.string().trim().min(7, 'Enter a valid mobile number').max(20);

const otpRequestSchema = {
  body: z.object({ phone }),
};

const otpVerifySchema = {
  body: z.object({
    phone,
    otp: z.string().trim().length(6, 'Enter the 6-digit code'),
    name: optional(z.string().min(2).max(120)),
    email: optional(z.string().trim().toLowerCase().email('Enter a valid email address')),
    referralCode: optional(z.string().min(4).max(20)),
    // an enquiry submitted before OTP verification — link it to this account and
    // mark its phone verified once the code checks out (see auth.service.verifyOtp)
    leadId: optional(z.string()),
  }),
};

module.exports = { registerSchema, loginSchema, forgotSchema, resetSchema, otpRequestSchema, otpVerifySchema };
