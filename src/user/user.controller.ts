import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  Req,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from 'src/auth/decorators/http-jwt.decorators';
import { ChangePasswordUserDto } from './dto/changepassword-user.dto';

import { RequestUser, RequestWithUser } from './user.interfaces';
import { CurrentUser } from './decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';
import * as path from 'path';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ************************************
  // ********** CHANGE PASSWORD *********
  // ************************************
  @Patch('change-password')
  @Roles('user', 'admin')
  @UsePipes(new ValidationPipe())
  changePassword(
    @Req() @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordUserDto,
  ) {
    return this.userService.changePassword(user, dto);
  }

  // ************************************
  // *********** CHANGE AVATAR **********
  // ************************************
  @Post('avatar')
  @Roles('user', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './avatars',
        filename: (req: RequestWithUser, file, callback) => {
          const ext = path.extname(file.originalname);
          callback(null, `avatar-${req.user.id}${ext}`);
        },
      }),
      fileFilter: (req: Request, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (!allowedTypes.includes(file.mimetype)) {
          return callback(new Error('Только изображения разрешены'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(@UploadedFile() file: any) {
    return { message: 'Файл успешно загружен', file };
  }

  // ************************************
  // ************ GET PROFILE ***********
  // ************************************
  @Get('profile')
  @Roles('user', 'admin')
  getProfile(@Req() @CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.userService.findOne(user.id, true);
  }

  // ************************************
  // ********** GET ALL USER ************
  // ************************************
  @Get()
  @Roles('admin')
  findAll() {
    return this.userService.findAll();
  }

  // ************************************
  // ******* GET USERE BY ID  ***********
  // ************************************
  @Get(':id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  // ************************************
  // ********** UPDATE USER  ************
  // ************************************
  @Patch(':id')
  @Roles('admin')
  @UsePipes(new ValidationPipe())
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  // ************************************
  // ********** DETELE USER  ************
  // ************************************
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
