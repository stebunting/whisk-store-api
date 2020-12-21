interface DeliveryProduct {
  slug: string,
  quantity: number
  deliveryCost: number,
}

export interface Delivery {
  date: string,
  products: Array<DeliveryProduct>
  totalPrice: number
}
