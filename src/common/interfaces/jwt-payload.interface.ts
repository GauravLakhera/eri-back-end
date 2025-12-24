export interface JwtPayload {
  userId: string;
  clientId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}