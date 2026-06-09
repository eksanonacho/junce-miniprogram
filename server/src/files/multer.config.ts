import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

// 允许的扩展名白名单
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
];

// 允许的 MIME（Office 文件可能因系统不同而 MIME 不准，加 octet-stream 兜底）
// TODO: 上线前收紧 MIME 校验，移除 application/octet-stream
const ALLOWED_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      const filename = `${Date.now()}-${randomUUID()}${ext}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new BadRequestException(
          `不支持的文件类型 ".${ext}"，允许的类型：${ALLOWED_EXTENSIONS.join(', ')}`,
        ),
        false,
      );
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          `不支持的文件格式 "${file.mimetype}"`,
        ),
        false,
      );
    }
    cb(null, true);
  },
};
