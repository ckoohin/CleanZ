import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAddressEntity } from './entity/customer-address.entity';
import { CustomerEntity } from './entity/customer.entity';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerEntity, CustomerAddressEntity])],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
