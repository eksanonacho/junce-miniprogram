import { IsInt } from 'class-validator';

export class AssignAccountantDto {
  @IsInt()
  accountantId: number;
}
