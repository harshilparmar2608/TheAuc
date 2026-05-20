import { GetAllAuctionItemsData, GetMyWatchlistData, CreateNewAuctionItemData, CreateNewAuctionItemVariables, PlaceBidData, PlaceBidVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useGetAllAuctionItems(options?: useDataConnectQueryOptions<GetAllAuctionItemsData>): UseDataConnectQueryResult<GetAllAuctionItemsData, undefined>;
export function useGetAllAuctionItems(dc: DataConnect, options?: useDataConnectQueryOptions<GetAllAuctionItemsData>): UseDataConnectQueryResult<GetAllAuctionItemsData, undefined>;

export function useGetMyWatchlist(options?: useDataConnectQueryOptions<GetMyWatchlistData>): UseDataConnectQueryResult<GetMyWatchlistData, undefined>;
export function useGetMyWatchlist(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyWatchlistData>): UseDataConnectQueryResult<GetMyWatchlistData, undefined>;

export function useCreateNewAuctionItem(options?: useDataConnectMutationOptions<CreateNewAuctionItemData, FirebaseError, CreateNewAuctionItemVariables>): UseDataConnectMutationResult<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;
export function useCreateNewAuctionItem(dc: DataConnect, options?: useDataConnectMutationOptions<CreateNewAuctionItemData, FirebaseError, CreateNewAuctionItemVariables>): UseDataConnectMutationResult<CreateNewAuctionItemData, CreateNewAuctionItemVariables>;

export function usePlaceBid(options?: useDataConnectMutationOptions<PlaceBidData, FirebaseError, PlaceBidVariables>): UseDataConnectMutationResult<PlaceBidData, PlaceBidVariables>;
export function usePlaceBid(dc: DataConnect, options?: useDataConnectMutationOptions<PlaceBidData, FirebaseError, PlaceBidVariables>): UseDataConnectMutationResult<PlaceBidData, PlaceBidVariables>;
