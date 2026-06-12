import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CookieHelper } from 'src/common/helpers/cookie.helper';
import { AuthGoogleController } from './auth-google.controller';
import { AuthGoogleService } from './auth-google.service';

describe('AuthGoogleController', () => {
  let controller: AuthGoogleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthGoogleController],
      providers: [
        {
          provide: AuthGoogleService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
        {
          provide: CookieHelper,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AuthGoogleController>(AuthGoogleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
