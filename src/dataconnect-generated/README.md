# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetAllAuctionItems*](#getallauctionitems)
  - [*GetMyWatchlist*](#getmywatchlist)
- [**Mutations**](#mutations)
  - [*CreateNewAuctionItem*](#createnewauctionitem)
  - [*PlaceBid*](#placebid)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetAllAuctionItems
You can execute the `GetAllAuctionItems` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getAllAuctionItems(options?: ExecuteQueryOptions): QueryPromise<GetAllAuctionItemsData, undefined>;

interface GetAllAuctionItemsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllAuctionItemsData, undefined>;
}
export const getAllAuctionItemsRef: GetAllAuctionItemsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAllAuctionItems(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetAllAuctionItemsData, undefined>;

interface GetAllAuctionItemsRef {
  ...
  (dc: DataConnect): QueryRef<GetAllAuctionItemsData, undefined>;
}
export const getAllAuctionItemsRef: GetAllAuctionItemsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAllAuctionItemsRef:
```typescript
const name = getAllAuctionItemsRef.operationName;
console.log(name);
```

### Variables
The `GetAllAuctionItems` query has no variables.
### Return Type
Recall that executing the `GetAllAuctionItems` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAllAuctionItemsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAllAuctionItemsData {
  auctionItems: ({
    id: UUIDString;
    title: string;
    description: string;
    startPrice: number;
    endTime: TimestampString;
    status: string;
    imageUrl?: string | null;
    category?: string | null;
    seller?: {
      id: UUIDString;
      username: string;
    } & User_Key;
  } & AuctionItem_Key)[];
}
```
### Using `GetAllAuctionItems`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAllAuctionItems } from '@dataconnect/generated';


// Call the `getAllAuctionItems()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAllAuctionItems();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAllAuctionItems(dataConnect);

console.log(data.auctionItems);

// Or, you can use the `Promise` API.
getAllAuctionItems().then((response) => {
  const data = response.data;
  console.log(data.auctionItems);
});
```

### Using `GetAllAuctionItems`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAllAuctionItemsRef } from '@dataconnect/generated';


// Call the `getAllAuctionItemsRef()` function to get a reference to the query.
const ref = getAllAuctionItemsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAllAuctionItemsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.auctionItems);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.auctionItems);
});
```

## GetMyWatchlist
You can execute the `GetMyWatchlist` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMyWatchlist(options?: ExecuteQueryOptions): QueryPromise<GetMyWatchlistData, undefined>;

interface GetMyWatchlistRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyWatchlistData, undefined>;
}
export const getMyWatchlistRef: GetMyWatchlistRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMyWatchlist(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyWatchlistData, undefined>;

interface GetMyWatchlistRef {
  ...
  (dc: DataConnect): QueryRef<GetMyWatchlistData, undefined>;
}
export const getMyWatchlistRef: GetMyWatchlistRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMyWatchlistRef:
```typescript
const name = getMyWatchlistRef.operationName;
console.log(name);
```

### Variables
The `GetMyWatchlist` query has no variables.
### Return Type
Recall that executing the `GetMyWatchlist` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMyWatchlistData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMyWatchlistData {
  watchlists: ({
    item: {
      id: UUIDString;
      title: string;
      startPrice: number;
      endTime: TimestampString;
      status: string;
    } & AuctionItem_Key;
      createdAt: TimestampString;
  })[];
}
```
### Using `GetMyWatchlist`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMyWatchlist } from '@dataconnect/generated';


// Call the `getMyWatchlist()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMyWatchlist();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMyWatchlist(dataConnect);

console.log(data.watchlists);

// Or, you can use the `Promise` API.
getMyWatchlist().then((response) => {
  const data = response.data;
  console.log(data.watchlists);
});
```

### Using `GetMyWatchlist`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMyWatchlistRef } from '@dataconnect/generated';


// Call the `getMyWatchlistRef()` function to get a reference to the query.
const ref = getMyWatchlistRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMyWatchlistRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.watchlists);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.watchlists);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateNewAuctionItem
You can execute the `CreateNewAuctionItem` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createNewAuctionItem(vars: CreateNewAuctionItemVariables): MutationPromise<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;

interface CreateNewAuctionItemRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewAuctionItemVariables): MutationRef<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;
}
export const createNewAuctionItemRef: CreateNewAuctionItemRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createNewAuctionItem(dc: DataConnect, vars: CreateNewAuctionItemVariables): MutationPromise<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;

interface CreateNewAuctionItemRef {
  ...
  (dc: DataConnect, vars: CreateNewAuctionItemVariables): MutationRef<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;
}
export const createNewAuctionItemRef: CreateNewAuctionItemRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createNewAuctionItemRef:
```typescript
const name = createNewAuctionItemRef.operationName;
console.log(name);
```

### Variables
The `CreateNewAuctionItem` mutation requires an argument of type `CreateNewAuctionItemVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateNewAuctionItemVariables {
  title: string;
  description: string;
  startPrice: number;
  endTime: TimestampString;
  category?: string | null;
  imageUrl?: string | null;
}
```
### Return Type
Recall that executing the `CreateNewAuctionItem` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateNewAuctionItemData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateNewAuctionItemData {
  auctionItem_insert: AuctionItem_Key;
}
```
### Using `CreateNewAuctionItem`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createNewAuctionItem, CreateNewAuctionItemVariables } from '@dataconnect/generated';

// The `CreateNewAuctionItem` mutation requires an argument of type `CreateNewAuctionItemVariables`:
const createNewAuctionItemVars: CreateNewAuctionItemVariables = {
  title: ..., 
  description: ..., 
  startPrice: ..., 
  endTime: ..., 
  category: ..., // optional
  imageUrl: ..., // optional
};

// Call the `createNewAuctionItem()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createNewAuctionItem(createNewAuctionItemVars);
// Variables can be defined inline as well.
const { data } = await createNewAuctionItem({ title: ..., description: ..., startPrice: ..., endTime: ..., category: ..., imageUrl: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createNewAuctionItem(dataConnect, createNewAuctionItemVars);

console.log(data.auctionItem_insert);

// Or, you can use the `Promise` API.
createNewAuctionItem(createNewAuctionItemVars).then((response) => {
  const data = response.data;
  console.log(data.auctionItem_insert);
});
```

### Using `CreateNewAuctionItem`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createNewAuctionItemRef, CreateNewAuctionItemVariables } from '@dataconnect/generated';

// The `CreateNewAuctionItem` mutation requires an argument of type `CreateNewAuctionItemVariables`:
const createNewAuctionItemVars: CreateNewAuctionItemVariables = {
  title: ..., 
  description: ..., 
  startPrice: ..., 
  endTime: ..., 
  category: ..., // optional
  imageUrl: ..., // optional
};

// Call the `createNewAuctionItemRef()` function to get a reference to the mutation.
const ref = createNewAuctionItemRef(createNewAuctionItemVars);
// Variables can be defined inline as well.
const ref = createNewAuctionItemRef({ title: ..., description: ..., startPrice: ..., endTime: ..., category: ..., imageUrl: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createNewAuctionItemRef(dataConnect, createNewAuctionItemVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.auctionItem_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.auctionItem_insert);
});
```

## PlaceBid
You can execute the `PlaceBid` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
placeBid(vars: PlaceBidVariables): MutationPromise<PlaceBidData, PlaceBidVariables>;

interface PlaceBidRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: PlaceBidVariables): MutationRef<PlaceBidData, PlaceBidVariables>;
}
export const placeBidRef: PlaceBidRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
placeBid(dc: DataConnect, vars: PlaceBidVariables): MutationPromise<PlaceBidData, PlaceBidVariables>;

interface PlaceBidRef {
  ...
  (dc: DataConnect, vars: PlaceBidVariables): MutationRef<PlaceBidData, PlaceBidVariables>;
}
export const placeBidRef: PlaceBidRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the placeBidRef:
```typescript
const name = placeBidRef.operationName;
console.log(name);
```

### Variables
The `PlaceBid` mutation requires an argument of type `PlaceBidVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface PlaceBidVariables {
  itemId: UUIDString;
  bidAmount: number;
}
```
### Return Type
Recall that executing the `PlaceBid` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `PlaceBidData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface PlaceBidData {
  bid_insert: Bid_Key;
}
```
### Using `PlaceBid`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, placeBid, PlaceBidVariables } from '@dataconnect/generated';

// The `PlaceBid` mutation requires an argument of type `PlaceBidVariables`:
const placeBidVars: PlaceBidVariables = {
  itemId: ..., 
  bidAmount: ..., 
};

// Call the `placeBid()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await placeBid(placeBidVars);
// Variables can be defined inline as well.
const { data } = await placeBid({ itemId: ..., bidAmount: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await placeBid(dataConnect, placeBidVars);

console.log(data.bid_insert);

// Or, you can use the `Promise` API.
placeBid(placeBidVars).then((response) => {
  const data = response.data;
  console.log(data.bid_insert);
});
```

### Using `PlaceBid`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, placeBidRef, PlaceBidVariables } from '@dataconnect/generated';

// The `PlaceBid` mutation requires an argument of type `PlaceBidVariables`:
const placeBidVars: PlaceBidVariables = {
  itemId: ..., 
  bidAmount: ..., 
};

// Call the `placeBidRef()` function to get a reference to the mutation.
const ref = placeBidRef(placeBidVars);
// Variables can be defined inline as well.
const ref = placeBidRef({ itemId: ..., bidAmount: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = placeBidRef(dataConnect, placeBidVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.bid_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.bid_insert);
});
```

