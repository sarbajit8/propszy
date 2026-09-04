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

module.exports = { registerSchema, loginSchema, forgotSchema, resetSchema };
