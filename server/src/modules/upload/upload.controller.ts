import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { Auth } from '@common/decorators';

import { UploadService } from './upload.service';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

class MarkUsedDto {
  objectNames!: string[];
}

/**
 * 上传接口
 * - 默认仅 admin 可用；C 端用户头像/晒单上传可加 user 端口（按需扩展）
 * - 图片走 sharp 处理（≤2000px、jpeg/png/webp 通用）
 */
@Auth('admin')
@Controller('admin/upload')
export class UploadController {
  constructor(private readonly svc: UploadService) {}

  /** 单张图片：?prefix=goods|banner|avatar|editor|cover */
  @Post('image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadImage(
    @UploadedFile() file: MulterFile,
    @Query('prefix') prefix?: string,
  ) {
    return this.svc.uploadImage(file, prefix || 'common');
  }

  /** 批量图片（最多 9）*/
  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 9, { storage: memoryStorage() }))
  uploadImages(
    @UploadedFiles() files: MulterFile[],
    @Query('prefix') prefix?: string,
  ) {
    return this.svc.uploadImages(files, prefix || 'common');
  }

  /** 文档 */
  @Post('doc')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadDoc(
    @UploadedFile() file: MulterFile,
    @Query('prefix') prefix?: string,
  ) {
    return this.svc.uploadDoc(file, prefix || 'doc');
  }

  /** 删除（按 objectName） */
  @Delete(':objectName(*)')
  remove(@Param('objectName') objectName: string) {
    return this.svc.remove(objectName);
  }

  /** 标记已使用（业务保存表单时调用，避免被清理） */
  @Post('mark-used')
  markUsed(@Body() dto: MarkUsedDto) {
    return this.svc.markUsed(dto.objectNames);
  }
}
