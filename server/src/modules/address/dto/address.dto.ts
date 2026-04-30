import { IsIn, IsInt, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @Length(1, 50)
  receiverName: string;

  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  receiverPhone: string;

  @IsString()
  @Length(1, 10)
  provinceCode: string;

  @IsString()
  @Length(1, 10)
  cityCode: string;

  @IsString()
  @Length(1, 10)
  districtCode: string;

  @IsString()
  @Length(1, 200)
  detailAddress: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isDefault?: number;
}

export class UpdateAddressDto extends CreateAddressDto {}
