import { IsArray, ArrayMinSize } from 'class-validator';

export class CheckInDto {
  @IsArray()
  @ArrayMinSize(1, { message: '打卡必须上传至少一份归档材料（archiveFiles 不能为空）' })
  archiveFiles: any[];
}
