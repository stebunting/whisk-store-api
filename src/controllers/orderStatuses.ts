import { OrderStatuses } from '../types/Order';

export default {
  NOT_ORDERED: 'NOT_ORDERED',
  CREATED: 'CREATED',
  INVOICED: 'INVOICED',
  PAID: 'PAID',
  FULFILLED: 'FULFILLED',
  DECLINED: 'DECLINED',
  ERROR: 'ERROR'
} as {
  [key: string]: OrderStatuses
};
