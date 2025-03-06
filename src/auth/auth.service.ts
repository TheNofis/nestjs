import { Injectable } from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

import { PrismaService } from 'src/databases/prisma/prisma.service';
import { Nullable } from 'src/databases/prisma/prisma.interfaces';

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

  async register(dto: CreateUserDto): Promise<IResponse> {
    this.responseModule.start();

    const user: Nullable<User> = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });
    if (user !== null) return this.responseModule.error('User already exists');

    const generatedPassword: string = await this.passwordService.hashPassword(
      dto.password,
    );
    dto.password = generatedPassword;

    const newUser: User = await this.prisma.user.create({
      data: dto,
    });

    const usertoken: string = this.jwtService.sign({
      id: newUser.id,
      role: newUser.role,
    });

    return this.responseModule.success({ token: usertoken });
  }

  async login(dto: LoginUserDto): Promise<IResponse> {
    this.responseModule.start();

    const { identifier, password } = dto;

    const user: Nullable<User> = await this.prisma.user.findFirst({
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
