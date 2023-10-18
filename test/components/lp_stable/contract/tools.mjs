export function flattenInvokesList(stateChanges) {
  let outArray = [];

  stateChanges.invokes.forEach((element) => {
    outArray.push([element.dApp, element.call.function]);
    outArray = outArray.concat(flattenInvokesList(element.stateChanges));
  });

  return outArray;
}

export function flattenTransfers(stateChanges) {
  let outArray = [];

  stateChanges.invokes.forEach((element) => {
    outArray = outArray.concat(flattenTransfers(element.stateChanges));
  });

  outArray = outArray.concat(stateChanges.transfers);

  return outArray;
}

export function flattenInvokes(stateChanges) {
  let outArray = [];

  stateChanges.invokes.forEach((element) => {
    outArray = outArray.concat(flattenInvokes(element.stateChanges));
  });

  outArray = outArray.concat(stateChanges.invokes);

  return outArray;
}
