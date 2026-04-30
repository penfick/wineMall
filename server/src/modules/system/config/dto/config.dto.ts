import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsInt } from 'class-validator';

export class CreateConfigDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'configKey 只能是小写字母/数字/下划线，且字母开头' })
  configKey!: string;

  @IsString()
  @MaxLength(5000)
  configValue!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  configValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class ConfigQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;
}

export class BatchConfigItem {
  @IsString()
  @MaxLength(50)
  configKey!: string;

  @IsString()
  @MaxLength(5000)
  configValue!: string;
}

export class BatchUpdateConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchConfigItem)
  items!: BatchConfigItem[];
}
