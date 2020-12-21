export interface SwishRefundPayload {
  id: string,
  paymentReference: string | null,
  payerPaymentReference: string,
  originalPaymentReference: string,
  callbackUrl: string,
  payerAlias: string,
  payeeAlias: string | null,
  amount: number,
  currency: 'SEK',
  message: string,
  status: 'CREATED' | 'DEBITED' | 'PAID',
  dateCreated: string,
  datePaid: string | null,
  errorMessage: string | null,
  additionalInformation: string | null,
  errorCode: string | null
}
