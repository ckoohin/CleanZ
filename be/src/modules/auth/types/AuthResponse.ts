export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  tokens: Tokens;
}
