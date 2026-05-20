import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AuctionItem_Key {
  id: UUIDString;
  __typename?: 'AuctionItem_Key';
}

export interface Bid_Key {
  id: UUIDString;
  __typename?: 'Bid_Key';
}

export interface CreateNewAuctionItemData {
  auctionItem_insert: AuctionItem_Key;
}

export interface CreateNewAuctionItemVariables {
  title: string;
  description: string;
  startPrice: number;
  endTime: TimestampString;
  category?: string | null;
  imageUrl?: string | null;
}

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

export interface Notification_Key {
  id: UUIDString;
  __typename?: 'Notification_Key';
}

export interface PlaceBidData {
  bid_insert: Bid_Key;
}

export interface PlaceBidVariables {
  itemId: UUIDString;
  bidAmount: number;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface Watchlist_Key {
  userId: UUIDString;
  itemId: UUIDString;
  __typename?: 'Watchlist_Key';
}

interface GetAllAuctionItemsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllAuctionItemsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetAllAuctionItemsData, undefined>;
  operationName: string;
}
export const getAllAuctionItemsRef: GetAllAuctionItemsRef;

export function getAllAuctionItems(options?: ExecuteQueryOptions): QueryPromise<GetAllAuctionItemsData, undefined>;
export function getAllAuctionItems(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetAllAuctionItemsData, undefined>;

interface GetMyWatchlistRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyWatchlistData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyWatchlistData, undefined>;
  operationName: string;
}
export const getMyWatchlistRef: GetMyWatchlistRef;

export function getMyWatchlist(options?: ExecuteQueryOptions): QueryPromise<GetMyWatchlistData, undefined>;
export function getMyWatchlist(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMyWatchlistData, undefined>;

interface CreateNewAuctionItemRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewAuctionItemVariables): MutationRef<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNewAuctionItemVariables): MutationRef<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;
  operationName: string;
}
export const createNewAuctionItemRef: CreateNewAuctionItemRef;

export function createNewAuctionItem(vars: CreateNewAuctionItemVariables): MutationPromise<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;
export function createNewAuctionItem(dc: DataConnect, vars: CreateNewAuctionItemVariables): MutationPromise<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;

interface PlaceBidRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: PlaceBidVariables): MutationRef<PlaceBidData, PlaceBidVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: PlaceBidVariables): MutationRef<PlaceBidData, PlaceBidVariables>;
  operationName: string;
}
export const placeBidRef: PlaceBidRef;

export function placeBid(vars: PlaceBidVariables): MutationPromise<PlaceBidData, PlaceBidVariables>;
export function placeBid(dc: DataConnect, vars: PlaceBidVariables): MutationPromise<PlaceBidData, PlaceBidVariables>;

