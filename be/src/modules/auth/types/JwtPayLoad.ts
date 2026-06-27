export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  /** Cờ buộc đổi mật khẩu lần đầu (tài khoản admin tạo bằng mật khẩu tạm). */
  mustChangePassword?: boolean;
  /** Phiên bản token; refresh sẽ bị từ chối nếu khác với DB (vô hiệu phiên cũ). */
  tokenVersion?: number;
  // iat?: number;
  // exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken?: string;
}
