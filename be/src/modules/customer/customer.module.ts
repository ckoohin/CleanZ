import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAddressEntity } from './entity/customer-address.entity';
import { CustomerEntity } from './entity/customer.entity';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerEntity, CustomerAddressEntity]),
    UploadModule,
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [TypeOrmModule, CustomerService],
})
export class CustomerModule {}
