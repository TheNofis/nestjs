import { BadRequestException, Injectable } from '@nestjs/common';

import { UpdateUserDto } from './dto/update-user.dto';

import { PrismaService } from 'src/prisma.service';
import { RedisService } from 'src/redis.service';

import { PasswordService } from 'src/auth/password.service';
import { ChangePasswordUserDto } from './dto/changepassword-user.dto';

import { RequestUser } from './user.interfaces';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@prisma/client';

import ResponseModule, { Status, IResponse } from 'src/response.module';

import path from 'path';
import fs from 'fs';

@Injectable()
export class UserService {
  private responseModule: ResponseModule;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly redisService: RedisService,
  ) {
    this.responseModule = new ResponseModule();
  }

  async changePassword(
    @CurrentUser() user: RequestUser,
    changePasswordUserDto: ChangePasswordUserDto,
  ): Promise<IResponse> {
    this.responseModule.start();
    const dbUser: User | null = await this.prisma.user.findFirst({
      where: { id: user.id },
    });
    if (dbUser === null) return this.responseModule.error('User not found');

    const isMatch: boolean = await this.passwordService.comparePassword(
      changePasswordUserDto.oldPassword,
      dbUser?.password || '',
    );

    if (!isMatch) return this.responseModule.error('Password not match');

    const updatedUser: User = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await this.passwordService.hashPassword(
          changePasswordUserDto.newPassword,
        ),
      },
    });

    return this.responseModule.success(updatedUser);
  }

  async uploadAvatar(
    @CurrentUser() user: RequestUser,
    file: any,
  ): Promise<IResponse> {
    this.responseModule.start();
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, file.filename);
    fs.writeFileSync(filePath, file.buffer);

    return this.responseModule.success({ avatar: filePath });
  }

  async findAll(): Promise<IResponse> {
    this.responseModule.start();
    const users = await this.prisma.user.findMany();
    return this.responseModule.success(users);
  }

  async findOne(id: string, hiddenPassword = false): Promise<IResponse> {
    this.responseModule.start();

    const user: User | null = await this.redisService.getCachedData(
      `user:${id}`,
      async () => await this.prisma.user.findUnique({ where: { id } }),
    );

    if (user === null) throw new BadRequestException('User not found');
    const userWithoutPassword: Omit<User, 'password'> = hiddenPassword
      ? (omitPassword(user) as Omit<User, 'password'>)
      : user;

    return this.responseModule.success(userWithoutPassword);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<IResponse> {
    this.responseModule.start();
    const newPassword: string = await this.passwordService.hashPassword(
      updateUserDto.password,
    );

    const updatedUser: User = await this.prisma.user.update({
      where: { id },
      data: { ...updateUserDto, password: newPassword },
    });
    await this.redisService.delete(`user:${id}`);

    return this.responseModule.success(updatedUser);
  }

  async remove(id: string): Promise<IResponse> {
    this.responseModule.start();
    const user: User = await this.prisma.user.delete({ where: { id } });

    await this.redisService.delete(`user:${id}`);
    return this.responseModule.success(user);
  }
}

function omitPassword(user: User): Omit<User, 'password'> {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
