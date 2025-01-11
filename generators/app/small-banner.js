/* eslint-disable no-useless-escape */
module.exports = function(short) {
  let banner = "";

  if (short) {
    banner  = `  .[====].(----).\\___/.[___].]@|--Y\\_`;
    banner += "\n";
    banner += `  __o__o_._o__o___o_o___o_o___O___oo__\\ `;
  } else {
    banner = `  .[====].[====].(----).(----).\\___/.[___].]@|--Y\\_`;
    banner += "\n";
    banner += `  __o__o___o__o___o__o___o__o___o_o___o_o___O___oo__\\ `;
  }

  return banner;
};
