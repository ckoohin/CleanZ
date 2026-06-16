import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { CustomerEntity } from './entity/customer.entity';

@Injectable()
export class CustomerService {
  async createProfileIfNotExists(
    manager: EntityManager,
    user: UserEntity,
  ): Promise<CustomerEntity> {
    const customerRepository = manager.getRepository(CustomerEntity);
    const existingCustomer = await customerRepository.findOne({
      where: { user: { id: user.id } },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    return customerRepository.save(
      customerRepository.create({
        user,
      }),
    );
  }
}
