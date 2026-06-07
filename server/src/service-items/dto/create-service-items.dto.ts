import { IsArray, ArrayMinSize, IsInt } from 'class-validator';

export class CreateServiceItemsDto {
  @IsArray()
  @ArrayMinSize(1, { message: '至少选择一个服务模板' })
  @IsInt({ each: true })
  templateIds: number[];
}
