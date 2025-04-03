import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphqlModule } from './graphql/graphql.module';
import { UserResolver } from './user/user.resolver';
import { UserService } from './user/user.service';

@Module({
  imports: [GraphqlModule],
  controllers: [AppController],
  providers: [AppService, UserResolver, UserService],
})
export class AppModule {}
