/**
 * Check if the string is an aeternity account nubmer or chain name.
 *
* @param {string} str - String to check.
* @returns {boolean}
 */
export function isAccountOrChainName(str) {
    return str.startsWith('ak_') || str.endsWith('.chain');
}
