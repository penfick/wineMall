import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateLogisticsCompanyDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsString()
  @Length(1, 30)
  code: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}

export class UpdateLogisticsCompanyDto extends CreateLogisticsCompanyDto {}
