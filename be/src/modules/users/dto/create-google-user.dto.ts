export class CreateGoogleUserDto {
  email!: string;
  fullName!: string;
  provider!: string;
  providerId!: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  accessToken?: string;
}
