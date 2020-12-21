import { Item } from './Item';
import { Delivery } from './Delivery';
import { SwishPayload } from './SwishPayload';
import { SwishRefundPayload } from './SwishRefundPayload';

export type OrderStatuses = 'NOT_ORDERED' | 'CREATED' | 'INVOICED' | 'PAID' | 'FULFILLED' | 'DECLINED' | 'ERROR';

interface OrderPayment {
  method: string,
  status: OrderStatuses,
  confirmationEmailSent: boolean
}

interface PaymentLinkOrderPayment extends OrderPayment {
  method: 'paymentLink'
}

interface SwishOrderPayment extends OrderPayment {
  method: 'swish',
  refunds: Array<SwishRefundPayload>,
  swish: SwishPayload
}

export interface BottomLine {
  totalDelivery: number,
  totalMoms: number,
  totalPrice: number
}

export interface Order {
  details: {
    name: string,
    email: string,
    telephone: string,
    address: string,
    notes: string
  },
  items: Array<Item>,
  delivery: Array<Delivery>,
  bottomLine: BottomLine,
  payment: PaymentLinkOrderPayment | SwishOrderPayment
}
