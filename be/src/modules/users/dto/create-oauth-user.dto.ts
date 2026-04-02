import { AuthProvider } from 'src/common/enums/auth-provider.enum';

export class CreateOAuthUserDto {
  email!: string;
  fullName!: string;
  provider!: AuthProvider;
  providerId!: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  accessToken?: string;
}
