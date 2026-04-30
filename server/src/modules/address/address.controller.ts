import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';

import { Auth, CurrentUser } from '@common/decorators';
import { CurrentUserPayload } from '@common/decorators/current-user.decorator';

import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Auth('user')
@Controller('address')
export class AddressController {
  constructor(private readonly svc: AddressService) {}

  @Get()
  list(@CurrentUser() u: CurrentUserPayload) {
    return this.svc.list(u.id);
  }

  @Get('default')
  getDefault(@CurrentUser() u: CurrentUserPayload) {
    return this.svc.getDefault(u.id);
  }

  @Get(':id')
  detail(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.detail(u.id, id);
  }

  @Post()
  create(@CurrentUser() u: CurrentUserPayload, @Body() dto: CreateAddressDto) {
    return this.svc.create(u.id, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.svc.update(u.id, id, dto);
  }

  @Put(':id/default')
  setDefault(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.setDefault(u.id, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() u: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.remove(u.id, id);
  }
}
