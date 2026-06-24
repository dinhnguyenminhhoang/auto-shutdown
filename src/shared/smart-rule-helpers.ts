import type { SmartConditionType, SmartRule } from './app-types'

export interface SmartConditionOption {
  id: SmartConditionType
  label: string
  description: string
  durationHelp: string
  thresholdLabel?: string
  thresholdUnit?: string
  thresholdHelp?: string
  defaultThreshold: number
  defaultDuration: number
}

export const SMART_CONDITION_OPTIONS: readonly SmartConditionOption[] = [
  {
    id: 'idle',
    label: 'Không tác động máy (Idle)',
    description:
      'Tự động kích hoạt hành động khi máy tính không nhận bất kỳ thao tác bàn phím hoặc chuột nào.',
    durationHelp:
      'Thời gian rảnh liên tục của máy tính trước khi bắt đầu đếm ngược thực hiện hành động.',
    defaultThreshold: 0,
    defaultDuration: 15
  },
  {
    id: 'battery-below',
    label: 'Pin thấp hơn mức',
    description:
      'Chỉ kích hoạt khi máy đang dùng pin và phần trăm pin thực tế xuống thấp hơn ngưỡng đã đặt.',
    durationHelp:
      'Khoảng thời gian pin phải duy trì dưới ngưỡng khi đang dùng pin trước khi bắt đầu đếm ngược.',
    thresholdLabel: 'Ngưỡng pin tối thiểu',
    thresholdUnit: '%',
    thresholdHelp:
      'Nhập phần trăm pin tối đa. Ví dụ 20 nghĩa là rule chỉ bắt đầu khi pin còn 20% trở xuống và máy đang không cắm sạc.',
    defaultThreshold: 20,
    defaultDuration: 3
  },
  {
    id: 'cpu-below',
    label: 'Hiệu suất CPU thấp hơn mức',
    description:
      'Tự động kích hoạt hành động khi tải CPU toàn hệ thống hạ thấp liên tục dưới ngưỡng giới hạn.',
    durationHelp:
      'Khoảng thời gian liên tục mà CPU phải nằm dưới ngưỡng trước khi bắt đầu đếm ngược thực hiện hành động.',
    thresholdLabel: 'Ngưỡng CPU tối đa',
    thresholdUnit: '%',
    thresholdHelp:
      'Nhập phần trăm CPU tối đa. Ví dụ 10 nghĩa là CPU phải thấp hơn hoặc bằng 10% liên tục.',
    defaultThreshold: 10,
    defaultDuration: 15
  },
  {
    id: 'gpu-below',
    label: 'Hiệu suất GPU thấp hơn mức',
    description:
      'Tự động kích hoạt hành động khi mức sử dụng GPU duy trì thấp liên tục dưới ngưỡng giới hạn.',
    durationHelp:
      'Khoảng thời gian liên tục mà GPU phải nằm dưới ngưỡng trước khi bắt đầu đếm ngược thực hiện hành động.',
    thresholdLabel: 'Ngưỡng GPU tối đa',
    thresholdUnit: '%',
    thresholdHelp:
      'Nhập phần trăm GPU tối đa. Ví dụ 10 nghĩa là mức sử dụng GPU phải thấp hơn hoặc bằng 10% liên tục.',
    defaultThreshold: 10,
    defaultDuration: 15
  },
  {
    id: 'network-below',
    label: 'Lưu lượng mạng thấp hơn mức',
    description:
      'Tự động kích hoạt hành động khi tổng lưu lượng mạng hệ thống hạ thấp liên tục dưới ngưỡng giới hạn.',
    durationHelp:
      'Khoảng thời gian liên tục mà lưu lượng mạng phải nằm dưới ngưỡng trước khi bắt đầu đếm ngược thực hiện hành động.',
    thresholdLabel: 'Ngưỡng lưu lượng tối đa',
    thresholdUnit: 'KB/s',
    thresholdHelp:
      'Nhập tốc độ mạng tối đa bằng KB/s. Ví dụ 100 nghĩa là lưu lượng mạng toàn hệ thống phải thấp hơn hoặc bằng 100 KB/s liên tục.',
    defaultThreshold: 100,
    defaultDuration: 10
  },
  {
    id: 'download-complete',
    label: 'Tải xuống hoàn tất',
    description:
      'Theo dõi luồng tải xuống đang hoạt động, sau đó kích hoạt khi tốc độ tải xuống rơi về trạng thái yên lặng đủ lâu.',
    durationHelp:
      'Khoảng thời gian yên lặng của luồng tải xuống sau khi hệ thống từng ghi nhận tải xuống đủ nhanh.',
    thresholdLabel: 'Ngưỡng yên lặng tải xuống',
    thresholdUnit: 'KB/s',
    thresholdHelp:
      'Nhập tốc độ tải xuống được xem là gần như hoàn tất. Ví dụ 64 nghĩa là sau khi hệ thống từng tải nhanh, nếu tốc độ nhận dữ liệu còn 64 KB/s trở xuống liên tục thì rule sẽ kích hoạt.',
    defaultThreshold: 64,
    defaultDuration: 1
  }
] as const

export function getSmartConditionOption(condition: SmartConditionType): SmartConditionOption {
  return (
    SMART_CONDITION_OPTIONS.find((option) => option.id === condition) ?? SMART_CONDITION_OPTIONS[0]
  )
}

export function smartConditionUsesThreshold(condition: SmartConditionType): boolean {
  return Boolean(getSmartConditionOption(condition).thresholdUnit)
}

export function getDefaultSmartThreshold(condition: SmartConditionType): number {
  return getSmartConditionOption(condition).defaultThreshold
}

export function getDefaultSmartDuration(condition: SmartConditionType): number {
  return getSmartConditionOption(condition).defaultDuration
}

export function getDownloadActivationThresholdKbPerSecond(quietThresholdKbPerSecond: number): number {
  return Math.max(quietThresholdKbPerSecond * 4, 512)
}

export function formatSmartRuleSummary(rule: SmartRule): string {
  switch (rule.condition) {
    case 'idle':
      return `Không dùng máy ${rule.durationMinutes} phút`
    case 'battery-below':
      return `Pin dưới ${rule.threshold}% trong ${rule.durationMinutes} phút`
    case 'cpu-below':
      return `CPU dưới ${rule.threshold}% trong ${rule.durationMinutes} phút`
    case 'gpu-below':
      return `GPU dưới ${rule.threshold}% trong ${rule.durationMinutes} phút`
    case 'network-below':
      return `Mạng dưới ${rule.threshold} KB/s trong ${rule.durationMinutes} phút`
    case 'download-complete':
      return `Tải xuống yên lặng dưới ${rule.threshold} KB/s trong ${rule.durationMinutes} phút`
    default:
      return rule.name
  }
}
