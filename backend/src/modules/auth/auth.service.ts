import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../shared/db/prisma";
import { env } from "../../shared/config/env";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../shared/middleware/errors";
import type {
  DeleteAccountInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "./auth.validation";

const SALT_ROUNDS = 10;

const PUBLIC_USER_SELECT = { id: true, email: true, name: true, timezone: true } as const;

function toPublicUser(user: { id: string; email: string; name: string | null; timezone: string }) {
  return { id: user.id, email: user.email, name: user.name, timezone: user.timezone };
}

function issueToken(user: { id: string; email: string }) {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      ...(input.name !== undefined ? { name: input.name } : {}),
      // timezone falls back to the schema default ("UTC") when omitted.
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    },
  });

  return { user: toPublicUser(user), token: issueToken(user) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // passwordHash is nullable (room for OAuth-only accounts later) — an account
  // with no password set can't log in via this flow.
  if (!user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return { user: toPublicUser(user), token: issueToken(user) };
}

// Deletes the account and everything it owns — tasks, projects, schedule
// blocks, and custom categories all cascade via the FK's onDelete: Cascade.
export async function deleteAccount(userId: string, input: DeleteAccountInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("Account not found");
  }

  if (!user.passwordHash) {
    throw new UnauthorizedError("Invalid password");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid password");
  }

  await prisma.user.delete({ where: { id: userId } });
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PUBLIC_USER_SELECT,
  });
  if (!user) {
    throw new NotFoundError("Account not found");
  }
  return user;
}

// Updating timezone is a display/interpretation preference only — it does NOT
// touch existing Task/Project deadlines. Those are fixed instants the user
// meant at creation time, not relative to whatever zone the profile says
// today (see docs/PROGRESS.md Decisions Log).
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new NotFoundError("Account not found");
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    },
    select: PUBLIC_USER_SELECT,
  });
}

// JWTs are stateless and short-lived; there's no server-side session store in
// this stack (see CLAUDE.md — no event bus / no new infra without flagging it
// first), so "logout" is just a client-side contract: the client discards its
// token. This endpoint exists to give the frontend a stable place to call.
export function logout() {
  return { loggedOut: true };
}
