import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

import { PrismaService } from 'src/prisma.service';
import { PasswordService } from 'src/auth/password.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

import ResponseModule, { Status, IResponse } from 'src/response.module';

@Injectable()
export class AuthService {
  private responseModule: ResponseModule;
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {
    this.responseModule = new ResponseModule();
  }

  async register(createUserDto: CreateUserDto): Promise<IResponse> {
    this.responseModule.start();

    const user: User | null = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      },
    });
    if (user !== null) return this.responseModule.error('User already exists');

    const generatedPassword: string = await this.passwordService.hashPassword(
      createUserDto.password,
    );
    createUserDto.password = generatedPassword;

    const newUser: User = await this.prisma.user.create({
      data: createUserDto,
    });

    const usertoken: string = this.jwtService.sign({
      id: newUser.id,
      role: newUser.role,
    });

    return this.responseModule.success({ token: usertoken });
  }

  async login(loginUserDto: LoginUserDto): Promise<IResponse> {
    this.responseModule.start();

    const { identifier, password } = loginUserDto;

    const user: User | null = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });

    if (user === null) return this.responseModule.error('Invalid credentials');

    const isValidPassword: boolean = await this.passwordService.comparePassword(
      password,
      user.password,
    );
    if (!isValidPassword)
      return this.responseModule.error('Invalid credentials');

    const usertoken: string = this.jwtService.sign({
      id: user.id,
      role: user.role,
    });
    return this.responseModule.success({ token: usertoken });
  }
}
