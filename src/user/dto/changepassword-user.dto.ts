import { IsString } from 'class-validator';

export class ChangePasswordUserDto {
  @IsString()
  oldPassword: string;

  @IsString()
  newPassword: string;
}
