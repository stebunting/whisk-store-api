export interface SwishPayload {
  id: string,
  payeePaymentReference: string,
  paymentReference: string,
  callbackUrl: string,
  amount: number,
  currency: 'SEK',
  message: string,
  payeeAlias: string,
  payerAlias: string,
  status: 'CREATED' | 'PAID' | 'DECLINED' | 'CANCELLED' | 'ERROR',
  dateCreated: string,
  datePaid: string,
  errorCode: string | null,
  errorMessage: string | null
}
