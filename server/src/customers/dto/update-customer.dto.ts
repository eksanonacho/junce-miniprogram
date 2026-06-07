import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-customer.dto';

// PartialType 自动把所有字段变成可选
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
