import * as React from 'react'
import { Slot } from 'radix-ui'
import { type VariantProps } from 'class-variance-authority'

import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }): React.JSX.Element {
  const Comp = asChild ? Slot.Root : 'button'

  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button }
