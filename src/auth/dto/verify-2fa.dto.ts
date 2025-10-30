import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class Verify2FADto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '2FA token is required' })
  token: string;

  @IsString()
  @IsNotEmpty({ message: 'Temporary session token is required' })
  tempToken: string;
}
