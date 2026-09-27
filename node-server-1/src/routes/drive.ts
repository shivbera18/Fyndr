import { Router, type Request, type Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import User from "../models/User";
import DriveConnection from "../models/DriveConnection";
import { encryptRefreshToken, decryptRefreshToken } from "../utils/driveCrypto";
import { JWT_SECRET, GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REDIRECT_URI } from "../config";
import logger from "../utils/logger";

const router = Router();
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME = "Fyndr Storage";

interface StatePayload {
  userId: string;
  nonce: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

interface DriveFileList {
  files?: { id: string }[];
}

interface DriveFileCreate {
  id: string;
}

interface UserInfo {
  email?: string;
}

// NOTE: follows existing trust convention — user_id comes from the client, no auth middleware.

router.get("/drive/connect", async (req: Request, res: Response) => {
  const user_id = req.query.user_id as string;
  if (!user_id) return res.status(400).send({ error: "user_id required" });
  try {
    const user = await User.findById(user_id);
    if (!user) return res.status(404).send({ error: "user not found" });
    const state = jwt.sign({ userId: user_id, nonce: randomUUID() }, JWT_SECRET, { expiresIn: "10m" });
    const params = new URLSearchParams({
      client_id: GOOGLE_DRIVE_CLIENT_ID,
      redirect_uri: GOOGLE_DRIVE_REDIRECT_URI,
      response_type: "code",
      scope: `openid email profile ${DRIVE_FILE_SCOPE}`,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    res.send({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  } catch (e: unknown) {
    logger.error("Drive connect failed", { error: e instanceof Error ? e.message : String(e) });
    return res.status(400).send({ error: "invalid user_id" });
  }
});

router.post("/drive/callback", async (req: Request, res: Response) => {
  const { code, state, user_id } = req.body as { code?: string; state?: string; user_id?: string };
  if (!code || !state || !user_id) return res.status(400).send({ error: "code, state, user_id required" });
  let decoded: StatePayload;
  try {
    decoded = jwt.verify(state, JWT_SECRET) as StatePayload;
  } catch {
    return res.status(401).send({ error: "invalid or expired state" });
  }
  if (decoded.userId !== user_id) return res.status(401).send({ error: "state mismatch" });
  let tokens: TokenResponse;
  try {
    const r = await axios.post<TokenResponse>("https://oauth2.googleapis.com/token", {
      code,
      client_id: GOOGLE_DRIVE_CLIENT_ID,
      client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
      redirect_uri: GOOGLE_DRIVE_REDIRECT_URI,
      grant_type: "authorization_code",
    });
    tokens = r.data;
  } catch (e: unknown) {
    logger.error("Drive token exchange failed", {
      error: e instanceof Error ? e.message : String(e),
      data: axios.isAxiosError(e) ? e.response?.data : undefined,
    });
    return res.status(502).send({ error: "token exchange failed" });
  }
  if (!tokens.refresh_token) return res.status(502).send({ error: "no refresh token — reconnect with consent" });
  let email = "";
  try {
    const me = await axios.get<UserInfo>("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    email = me.data.email || "";
  } catch (e: unknown) {
    logger.error("Drive userinfo failed", { error: e instanceof Error ? e.message : String(e) });
    return res.status(502).send({ error: "identity lookup failed" });
  }
  const headers = { Authorization: `Bearer ${tokens.access_token}` };
  let folderId = "";
  try {
    const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`);
    const found = await axios.get<DriveFileList>(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, { headers });
    folderId = found.data.files?.[0]?.id || "";
    if (!folderId) {
      const created = await axios.post<DriveFileCreate>(
        "https://www.googleapis.com/drive/v3/files?fields=id",
        { name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
        { headers }
      );
      folderId = created.data.id;
    }
  } catch (e: unknown) {
    logger.error("Drive folder ensure failed", { error: e instanceof Error ? e.message : String(e) });
    return res.status(502).send({ error: "folder setup failed" });
  }
  await DriveConnection.findOneAndUpdate(
    { userId: user_id },
    { email, refreshTokenEnc: encryptRefreshToken(tokens.refresh_token), folderId, scope: "drive.file", connectedAt: new Date() },
    { upsert: true, new: true }
  );
  res.send({ connected: true, email, folderId });
});

router.get("/drive/status", async (req: Request, res: Response) => {
  const user_id = req.query.user_id as string;
  if (!user_id) return res.status(400).send({ error: "user_id required" });
  const doc = await DriveConnection.findOne({ userId: user_id });
  if (!doc) return res.send({ connected: false, email: null, folderId: null, connectedAt: null });
  res.send({ connected: true, email: doc.email, folderId: doc.folderId, connectedAt: doc.connectedAt });
});

router.post("/drive/disconnect", async (req: Request, res: Response) => {
  const { user_id } = req.body as { user_id?: string };
  if (!user_id) return res.status(400).send({ error: "user_id required" });
  const doc = await DriveConnection.findOne({ userId: user_id });
  if (doc) {
    try {
      await axios.post(`https://oauth2.googleapis.com/revoke?token=${decryptRefreshToken(doc.refreshTokenEnc)}`);
    } catch {
      // revocation failure still deletes the doc
    }
    await DriveConnection.deleteOne({ userId: user_id });
  }
  res.send({ disconnected: true });
});

export default router;
