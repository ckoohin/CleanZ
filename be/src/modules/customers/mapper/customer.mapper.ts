import { CustomerProfileResponseDto } from "../dto/customer-profile.response";
import { CustomerEntity } from "../entities/customer.entity";


export const toCustomerProfileResponseDto = (
    entity: CustomerEntity & { user: { id: string; fullName?: string } },
): CustomerProfileResponseDto => {
    return {
        id: entity.id,
        userId: entity.user.id,
        fullName: entity.user?.fullName ?? '',
        address: entity.address ?? '',
        gender: entity.gender ? String(entity.gender) : '',
        phone: entity.phone ?? '',
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
};