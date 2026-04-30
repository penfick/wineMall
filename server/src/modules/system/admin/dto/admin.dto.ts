import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字、下划线' })
  username!: string;

  @IsString()
  @MinLength(8, { message: '密码长度至少 8 位' })
  @MaxLength(20)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: '密码必须包含字母和数字' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  roleIds!: number[];
}

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  roleIds?: number[];
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: '新密码必须包含字母和数字' })
  newPassword!: string;
}

export class AdminQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  status?: number;

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
  pageSize?: number = 20;
}
