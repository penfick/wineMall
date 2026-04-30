import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';

export class CartAddDto {
  @IsInt()
  @Min(1)
  skuId: number;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}

export class CartUpdateQtyDto {
  @IsInt()
  @Min(1)
  skuId: number;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}

export class CartSelectDto {
  @IsInt()
  @Min(1)
  skuId: number;

  @IsInt()
  @IsIn([0, 1])
  selected: number;
}

export class CartBatchSelectDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(200)
  @Type(() => Number)
  @IsInt({ each: true })
  skuIds: number[];

  @IsInt()
  @IsIn([0, 1])
  selected: number;
}

export class CartRemoveBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @Type(() => Number)
  @IsInt({ each: true })
  skuIds: number[];
}
