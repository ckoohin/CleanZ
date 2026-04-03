export interface FormData {
  // Step 1
  username: string;
  email: string;
  // Step 2
  lastName: string,
  firstName: string,
  dateOfBirth: string,
  // Step 3
  password: string;
  confirmPassword: string;
  checkedTerms: boolean;
}