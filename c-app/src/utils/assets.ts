/**
 * 默认头像（灰底白色用户图标 SVG，data URI）。
 * 避免依赖 /static 下的二进制文件。
 */
export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#E5E7EB"/>
      <circle cx="100" cy="80" r="36" fill="#9CA3AF"/>
      <path d="M40 180c0-33 27-60 60-60s60 27 60 60" fill="#9CA3AF"/>
    </svg>`,
  );
