import { ObjectId } from 'mongodb';
import { Product } from './Product';
import { Statement } from './Statement';

export interface BasketItem {
  deliveryDate: string,
  deliveryType: string,
  name: string,
  productSlug: string,
  grossPrice: number,
  linePrice: number,
  momsRate: number,
  quantity: number,
  details: Product
}

export interface BasketDelivery {
  address: string,
  deliveryRequired: boolean,
  deliverable: boolean,
  deliveryTotal: number,
  momsRate: number,
  zone: number,
  details: {
    [dateCode: string]: {
      deliverable: boolean,
      maxZone: number,
      momsRate: number,
      total: number,
      products: Array<{
        slug: string,
        quantity: number,
        deliveryCost: number
      }>
    }
  }
}

export interface DbDelivery {
  zone: number,
  address: string
}

export interface DbBasket {
  _id: ObjectId,
  items: Array<BasketItem>,
  delivery: DbDelivery
}

export interface Basket extends DbBasket {
  basketId: string,
  items: Array<BasketItem>,
  delivery: BasketDelivery,
  statement: Statement
}
