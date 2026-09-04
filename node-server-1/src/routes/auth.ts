import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { API_PUBLIC_URL, FRONTEND_URL, JWT_SECRET } from "../config";
import { transporter } from "../mailer";
import logger from "../utils/logger";
import { generateOTP, otpStorage } from "../utils/otp";

const router = Router();

// Narrow shape of a Mongo duplicate-key error (code only set by the driver).
interface MongoDuplicateError {
  code?: number;
  keyPattern?: { email?: unknown };
  message?: string;
  stack?: string;
}

router.post("/register", async (req: Request, resp: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return resp.status(400).send({ message: "All details are required" });
    }

    const user = new User({ name, email, password, isVerified: true });
    const result = await user.save();

    // Generate a JWT token for verification
    const token = jwt.sign({ userId: result._id }, JWT_SECRET, { expiresIn: "1h" });

    // Send verification email (skip if dummy)
    const verificationLink = `${API_PUBLIC_URL}/verify/${token}`;
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verification",
        html: `<p>Hello ${name},</p><p>Please verify your email by clicking the link below:</p><br/><a href="${verificationLink}">Verify Email</a>`,
      });
    } catch (e) {
      logger.warn("Email skipped (local dev)", { error: e instanceof Error ? e.message : String(e), email });
    }
    logger.info("User registered", { email, userId: result._id });
    resp.send({ message: "Registration successful! Please verify your email." });
  } catch (error) {
    const err = error as MongoDuplicateError;
    logger.error("Registration failed", { error: err.message, stack: err.stack, email: req.body?.email });
    if (err.code === 11000 && err.keyPattern?.email) {
      resp.status(400).send({ message: "Email already exists" });
    } else {
      resp.status(500).send({ message: "An unexpected error occurred" });
    }
  }
});

//---------------------------------------------------------------------------------------------------------------------

router.get("/verify/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, JWT_SECRET);
    // sign() above always stores the id under userId
    const userId = typeof decoded === "string" ? decoded : (decoded as jwt.JwtPayload & { userId?: string }).userId;

    // Mark the user as verified
    const user = await User.findByIdAndUpdate(userId, { isVerified: true }, { new: true });

    if (user) {
      res.redirect(`${FRONTEND_URL}/confirmed?status=success`);
    } else {
      res.redirect(`${FRONTEND_URL}/confirmed?status=failed`);
    }
  } catch (error) {
    res.redirect(`${FRONTEND_URL}/confirmed?status=failed`);
  }
});
//-----------------------------------------------------------------------------------------------------------------

// Example: Backend endpoint to check email verification status
router.post("/check-verification", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });

  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }

  // Assuming the user model has an `isVerified` field
  if (user.isVerified) {
    const { name, _id } = user;
    return res.send({ name, _id });
  }

  res.send({ message: "Not verified!!!", verified: false });
});

//-----------------------------------------------------------------------------------------------------------------

router.post("/resend-verification", async (req: Request, resp: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return resp.status(404).send({ message: "User not found." });
    }

    if (user.isVerified) {
      return resp.status(400).send({ message: "User is already verified." });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });

    const verificationLink = `${API_PUBLIC_URL}/verify/${token}?email=${email}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Resend: Verify your Email",
      html: `<p>Hello ${user.name},</p>
                   <p>Please verify your email by clicking the link below:</p>
                   <a href="${verificationLink}">Verify Email</a>`,
    });

    resp.send({ message: "Verification email has been resent." });
  } catch (error) {
    logger.error(error);
    resp.status(500).send({ message: "Failed to resend the verification email." });
  }
});

//-------------------------------------------------------------------------------------------------------------------

router.post("/login", async (req: Request, resp: Response) => {
  const { email, password } = req.body || {};
  if (email && password) {
    try {
      const user = await User.findOne({ email: String(email).trim(), password: String(password) }).select("name");
      if (user) {
        resp.status(200).send(user);
      } else {
        resp.status(404).send({ message: "Invalid email or password" });
      }
    } catch (error) {
      logger.error("[login]", error);
      resp.status(500).send({ message: "Internal server error" });
    }
  } else {
    resp.status(400).send({ message: "Email and password are required" });
  }
});

//--------------------------------------------------------------------------------------------------------------------

// Send OTP route
router.post("/send-otp", async (req: Request, res: Response) => {
  const { email } = req.body;
  // delete otpStorage[email];

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  } else {
    const check = await User.findOne({ email: email });
    if (check) {
      try {
        const otp = generateOTP();
        otpStorage[email] = otp; // Store OTP against email

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Your OTP Code",
          text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: `OTP sent ${email} successfully!` });
      } catch (error) {
        logger.error("Error sending email:", error);
        res.status(500).json({ message: "Failed to send OTP" });
      }
    } else {
      return res.status(404).send({ message: `${email} is not Register!` });
    }
  }
});

//-------------------------------------------------------------------------------------------------------

// Verify OTP route
router.post("/newPassword-verify-otp", async (req: Request, res: Response) => {
  const { email, otp, newpassword } = req.body;
  if (!email || !otp || !newpassword) {
    return res.status(400).send({ message: "All Inputs are required!!!" });
  }

  if (otpStorage[email] === otp) {
    delete otpStorage[email]; // Remove OTP after verification
    const update = await User.updateOne({ email: email }, { $set: { password: newpassword } });
    if (update) {
      res.status(200).json({ message: "Your Password is successfully Change!" });
    } else {
      res.status(404).send({ message: "User is not available or Server error" });
    }
  } else {
    res.status(400).json({ message: `Invalid OTP or Expire! Regenrate OTP against ${email}` });
  }
});

//----------------------------------------------------------------------------------------------------

export default router;
