import { IsString } from 'class-validator';

export class LoginUserDto {
  @IsString()
  identifier: string;

  @IsString()
  password: string;
}
