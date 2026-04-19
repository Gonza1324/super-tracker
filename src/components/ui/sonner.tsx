import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="system"
    className="toaster group"
    richColors
    position="top-center"
    {...props}
  />
)

export { Toaster }
