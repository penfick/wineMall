import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class FreightRuleItemDto {
  /** null=兜底默认（除其他规则匹配外的所有省）*/
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  regionCodes?: string[] | null;

  @IsInt()
  @Min(1)
  @Max(100000)
  firstUnit: number;

  @IsNumberString({ no_symbols: false }, { message: 'firstFee 必须是金额字符串' })
  firstFee: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  continueUnit: number;

  @IsNumberString({ no_symbols: false }, { message: 'continueFee 必须是金额字符串' })
  continueFee: string;
}

export class CreateFreightTemplateDto {
  @IsString()
  @Length(1, 100)
  name: string;

  /** 1=按件 2=按重量(克) */
  @IsInt()
  @IsIn([1, 2])
  billingType: number;

  @IsInt()
  @IsIn([0, 1])
  isFree: number;

  /** 包邮阈值（金额字符串，可空）*/
  @IsOptional()
  @IsNumberString()
  freeThreshold?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FreightRuleItemDto)
  rules: FreightRuleItemDto[];
}

export class UpdateFreightTemplateDto extends CreateFreightTemplateDto {}

export class FreightCalcItemDto {
  @IsInt() @Min(1) skuId: number;
  @IsInt() @Min(1) @Max(999) quantity: number;
}

export class FreightCalcDto {
  @IsString()
  @Length(1, 10)
  @Matches(/^\d+$/)
  provinceCode: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => FreightCalcItemDto)
  items: FreightCalcItemDto[];
}
