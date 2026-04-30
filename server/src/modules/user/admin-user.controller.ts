import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { UserQueryDto } from './dto/user-query.dto';
import { CheckPermission } from '@common/decorators/check-permission.decorator';

@Controller('admin/user')
export class AdminUserController {
  constructor(private readonly service: UserService) {}

  @Get()
  @CheckPermission('user:detail')
  page(@Query() query: UserQueryDto) {
    return this.service.page(query);
  }

  @Get(':id')
  @CheckPermission('user:detail')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Put(':id/status/:status')
  @CheckPermission('user:status')
  toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('status', ParseIntPipe) status: number,
  ) {
    return this.service.toggleStatus(id, status === 1 ? 1 : 0);
  }

  @Get(':id/addresses')
  @CheckPermission('user:detail')
  addresses(@Param('id', ParseIntPipe) id: number) {
    return this.service.addresses(id);
  }

  @Get(':id/orders')
  @CheckPermission('user:detail')
  orders(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.orders(id, Number(page) || 1, Number(pageSize) || 20);
  }
}
