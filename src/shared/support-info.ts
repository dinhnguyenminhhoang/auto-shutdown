export interface SupportInfo {
  message: string
  bankName: string
  accountNumber: string
  accountName: string
}

export type SupportCopyField = 'accountNumber' | 'accountName' | null

export const SUPPORT_INFO: SupportInfo = {
  message:
    'Nếu bạn thấy ứng dụng hữu ích, bạn có thể ủng hộ để mình tiếp tục phát triển và bổ sung thêm tính năng mới trong tương lai.',
  bankName: 'Sacombank',
  accountNumber: '050133514497',
  accountName: 'DINH NGUYEN MINH HOANG'
}
