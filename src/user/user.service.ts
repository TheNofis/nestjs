import { BadRequestException, Injectable } from '@nestjs/common';

import { UpdateUserDto } from './dto/update-user.dto';

import { PrismaService } from 'src/databases/prisma/prisma.service';
import { RedisService } from 'src/databases/redis/redis.service';

import { Nullable } from 'src/databases/prisma/prisma.interfaces';

import { PasswordService } from 'src/auth/password.service';
import { ChangePasswordUserDto } from './dto/changepassword-user.dto';

import { RequestUser } from './user.interfaces';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@prisma/client';

import ResponseModule, { IResponse } from 'src/response.module';

import * as path from 'path';
import * as fs from 'fs';

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
    dto: ChangePasswordUserDto,
  ): Promise<IResponse> {
    this.responseModule.start();
    const dbUser: Nullable<User> = await this.prisma.user.findFirst({
      where: { id: user.id },
    });
    if (dbUser === null) return this.responseModule.error('User not found');

    const isMatch: boolean = await this.passwordService.comparePassword(
      dto.oldPassword,
      dbUser?.password || '',
    );

    if (!isMatch) return this.responseModule.error('Password not match');

    const updatedUser: User = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await this.passwordService.hashPassword(dto.newPassword),
      },
    });

    return this.responseModule.success(updatedUser);
  }

  async uploadAvatar(
    @CurrentUser() user: RequestUser,
    file: any,
  ): Promise<IResponse> {
    this.responseModule.start();

    const fileExtension = path.extname(file.filename);
    file.filename = `avatar-${user.id}${fileExtension}`;

    const uploadDir = path.join(__dirname, '../..', 'avatars');

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    let fileSize = 0;
    file.file.on('data', (chunk) => (fileSize += chunk.length));

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(
        path.join(uploadDir, file.filename),
      );

      file.file.pipe(writeStream);
      writeStream.on('error', () => {
        reject(this.responseModule.error('File upload failed'));
      });
      writeStream.on('finish', () => {
        if (fileSize > MAX_FILE_SIZE) {
          fs.unlinkSync(path.join(uploadDir, file.filename));
          reject(this.responseModule.error('File size is too large'));
        }
        resolve(this.responseModule.success(file.filename));
      });
    })
      .then((result: IResponse) => result)
      .catch((error: IResponse) => {
        return error;
      });
  }

  async findAll(): Promise<IResponse> {
    this.responseModule.start();
    const users: User[] | [] = await this.prisma.user.findMany();
    return this.responseModule.success(users);
  }

  async findOne(id: string, hiddenPassword = false): Promise<IResponse> {
    this.responseModule.start();

    const user: Nullable<User> = await this.redisService.getCachedData(
      `user:${id}`,
      async () => await this.prisma.user.findUnique({ where: { id } }),
    );

    if (user === null) throw new BadRequestException('User not found');
    const userWithoutPassword: Omit<User, 'password'> = hiddenPassword
      ? (omitPassword(user) as Omit<User, 'password'>)
      : user;

    return this.responseModule.success(userWithoutPassword);
  }

  async update(id: string, dto: UpdateUserDto): Promise<IResponse> {
    this.responseModule.start();
    const newPassword: string = await this.passwordService.hashPassword(
      dto.password,
    );

    const updatedUser: User = await this.prisma.user.update({
      where: { id },
      data: { ...dto, password: newPassword },
    });

    await this.redisService.set(`user:${id}`, JSON.stringify(updatedUser));

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
