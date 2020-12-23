interface Date {
  year: number,
  month: number,
  date: number,
  time: {
    start: string,
    end: string
  },
  deadline: {
    year: number,
    month: number,
    date: number,
    hours: number
  }
}

interface Ingredient {
  item: string,
  details: string
}

interface Link {
  text: string,
  url: string
}

interface Image {
  thumb: string,
  url: string,
  description: string
}

interface DeliveryTypes {
  [key: string]: {
    dates: Array<Date>
  },
  delivery: {
    dates: Array<Date>,
    costs: {
      [zone: string]: {
        zone: number,
        price: number,
        momsRate: number
      }
    }
    maxZone: number
  },
  collection: {
    dates: Array<Date>
  },
}

export type Product = DeliveryTypes & {
  _id: string,
  productId: string,
  name: string,
  slug: string,
  available: boolean,
  brand: string,
  category: string,
  contents?: Array<string>,
  description: Array<string>,
  ingredients?: Array<Ingredient>,
  links?: Array<Link>,
  momsRate: number,
  grossPrice: number,
  deliveryMethods: Array<string>,
  images: Array<Image>
}
