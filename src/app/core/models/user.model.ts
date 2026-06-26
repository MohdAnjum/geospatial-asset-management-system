/**
 * ============================================================================
 *  AUTH MODELS
 * ============================================================================
 *  Shapes for the authenticated user and the login API contract. In mock mode
 *  these are produced locally by AuthService; in live mode they come from
 *  `POST /api/auth/login`.
 * ============================================================================
 */

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface AuthUser {
  username: string;
  role: UserRole;
  full_name: string;
}

/** Credentials submitted by the login form. */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Response returned by the login endpoint (mirrored by the mock login). */
export interface LoginResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}
