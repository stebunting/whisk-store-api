# whisk-store-api

[![Build Status](https://travis-ci.com/stebunting/whisk-store-api.svg?branch=main)](https://travis-ci.com/stebunting/whisk-store-api)

## Get all products

```
GET /api/products
```

## Get single product

```
GET /api/product/:id
```

## Create basket

```
POST /api/basket
```

## Update single item in basket

```
PUT /api/basket/:id
```

## Get basket with statement

```
GET /api/basket/:id

RETURN OBJECT
{
  basketId: mongoId,
  items: [object]
  statement: {
    bottomLine: object
  }
}
```
