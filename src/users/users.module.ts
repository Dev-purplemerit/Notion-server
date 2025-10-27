// users/users.module.ts
import { MongooseModule } from '@nestjs/mongoose';
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { User, UserSchema } from './users.schema';
import { UsersService } from './users.service';
import { UsersController, UsersV2Controller } from './users.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
    JwtModule,
  ],
  providers: [UsersService],
  controllers: [UsersController, UsersV2Controller],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
