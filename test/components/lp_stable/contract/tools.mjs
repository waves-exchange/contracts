export function flattenInvokes(stateChanges) {
  let outArray = [];

  stateChanges.invokes.forEach((element) => {
    outArray.push([element.dApp, element.call.function]);
    outArray = outArray.concat(flattenInvokes(element.stateChanges));
  });

  return outArray;
}
