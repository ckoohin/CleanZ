import { Test, TestingModule } from '@nestjs/testing';
import { AuthGoogleService } from './auth-google.service';
import { UsersService } from '../users/users.service';
import { AuthTokenService } from '../auth/auth-token.service';

import { DataSource } from 'typeorm';
import { CustomerService } from '../customer/customer.service';

describe('AuthGoogleService', () => {
  let service: AuthGoogleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGoogleService,
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: AuthTokenService,
          useValue: {},
        },
        {
          provide: CustomerService,
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AuthGoogleService>(AuthGoogleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
