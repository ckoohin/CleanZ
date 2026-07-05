import { OmitType } from '@nestjs/swagger';
import { CreateBookingDto } from './create-booking.dto';

export class QuoteBookingDto extends OmitType(CreateBookingDto, [
  'paymentMethod',
  'quoteId',
] as const) {}
