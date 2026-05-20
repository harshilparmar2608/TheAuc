const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs, makeMemoryCacheProvider } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'xyz',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;
const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider()
  }
};
exports.dataConnectSettings = dataConnectSettings;

const getAllAuctionItemsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAllAuctionItems');
}
getAllAuctionItemsRef.operationName = 'GetAllAuctionItems';
exports.getAllAuctionItemsRef = getAllAuctionItemsRef;

exports.getAllAuctionItems = function getAllAuctionItems(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getAllAuctionItemsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getMyWatchlistRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyWatchlist');
}
getMyWatchlistRef.operationName = 'GetMyWatchlist';
exports.getMyWatchlistRef = getMyWatchlistRef;

exports.getMyWatchlist = function getMyWatchlist(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getMyWatchlistRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const createNewAuctionItemRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewAuctionItem', inputVars);
}
createNewAuctionItemRef.operationName = 'CreateNewAuctionItem';
exports.createNewAuctionItemRef = createNewAuctionItemRef;

exports.createNewAuctionItem = function createNewAuctionItem(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createNewAuctionItemRef(dcInstance, inputVars));
}
;

const placeBidRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'PlaceBid', inputVars);
}
placeBidRef.operationName = 'PlaceBid';
exports.placeBidRef = placeBidRef;

exports.placeBid = function placeBid(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(placeBidRef(dcInstance, inputVars));
}
;
