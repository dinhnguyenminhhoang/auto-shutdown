import * as React from 'react'
import { Check, Copy, Heart } from 'lucide-react'

import { SUPPORT_INFO, type SupportCopyField } from '../../../shared/support-info'
import { Button } from './ui/button'

interface SupportTabContentProps {
  qrSrc: string
  copiedField: SupportCopyField
  onCopyAccountNumber: () => void
  onCopyAccountName: () => void
}

export function SupportTabContent({
  qrSrc,
  copiedField,
  onCopyAccountNumber,
  onCopyAccountName
}: SupportTabContentProps): React.JSX.Element {
  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Heart className="size-5" />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Ủng hộ phát triển
            </p>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              Đồng hành cùng Auto Shutdown VN
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {SUPPORT_INFO.message}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div className="rounded-3xl border bg-background/70 p-5 shadow-sm">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <img
                src={qrSrc}
                alt="QR ung ho Auto Shutdown VN"
                className="w-full rounded-xl object-contain"
              />
            </div>
            <p className="mt-4 text-center text-xs font-medium leading-5 text-muted-foreground">
              Quét mã QR để chuyển khoản nhanh qua {SUPPORT_INFO.bankName}.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3">
              <SupportInfoRow label="Ngân hàng" value={SUPPORT_INFO.bankName} />
              <SupportInfoRow label="Số tài khoản" value={SUPPORT_INFO.accountNumber} />
              <SupportInfoRow label="Chủ tài khoản" value={SUPPORT_INFO.accountName} />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <CopyActionButton
                label={copiedField === 'accountNumber' ? 'Đã sao chép STK' : 'Sao chép STK'}
                copied={copiedField === 'accountNumber'}
                onClick={onCopyAccountNumber}
              />
              <CopyActionButton
                label={copiedField === 'accountName' ? 'Đã sao chép tên TK' : 'Sao chép tên TK'}
                copied={copiedField === 'accountName'}
                onClick={onCopyAccountName}
              />
            </div>

            <div className="rounded-2xl border border-dashed bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
              Mọi khoản ủng hộ sẽ giúp duy trì ứng dụng và mở rộng thêm các chức năng thông minh
              trong những bản tiếp theo.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SupportInfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-2xl border bg-background/70 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-all text-base font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

function CopyActionButton({
  label,
  copied,
  onClick
}: {
  label: string
  copied: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <Button
      variant={copied ? 'default' : 'outline'}
      className="h-10 rounded-xl px-4 text-xs font-semibold cursor-pointer"
      onClick={onClick}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label}
    </Button>
  )
}
