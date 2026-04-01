import { AuthProvider } from 'src/common/enums/auth-provider.enum';

export class CreateGoogleUserDto {
  email!: string;
  fullName!: string;
  provider!: AuthProvider;
  providerId!: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  accessToken?: string;
}
