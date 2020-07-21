/* @flow */
/* global APP */

import { jitsiLocalStorage } from 'js-utils';

import { client } from '../../../client';
import { createDeepLinkUrl } from '../../base/util/createDeepLinkUrl';
import { setJWT } from '../jwt/actions';
import { parseURLParams } from '../util';

/**
 * Retrieves the JSON Web Token (JWT), if any, defined by a specific
 * {@link URL}.
 *
 * @param {URL} url - The {@code URL} to parse and retrieve the JSON Web Token
 * (JWT), if any, from.
 * @returns {string} The JSON Web Token (JWT), if any, defined by the specified
 * {@code url}; otherwise, {@code undefined}.
 */
export function parseJWTFromURLParams(url: URL = window.location) {
    return parseURLParams(url, true, 'search').jwt;
}

/**
 * Sogn.
 *
 * @param {string} signatureParam - Signature from the query string.
 * @param {string} addressParam - Address from the query string.
 * @param {string} messageParam - Message from the query string.
 * @returns {void}
 *
 */
export async function _sign(signatureParam, addressParam, messageParam) {
    const message = messageParam || `I would like to generate JWT token at ${new Date().toUTCString()}`;
    const signature = signatureParam || await client.signMessage(message);
    const address = addressParam || client.rpcClient.getCurrentAccount();

    const token = await (await fetch('https://jwt.z52da5wt.xyz/claim', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            address,
            message,
            signature
        })
    })).text();

    // if user will click the "reject" button the code will stops before that line
    APP.store.dispatch(setJWT(token));
}

/**
 * JWT auth.
 *
 * @returns {void}
 *
 */
export function authWithJWTDeeplink() {
    const { address: addressParam, signature: signatureParam } = parseURLParams(window.location, true, 'search');

    if (addressParam) {
        const message = `I would like to generate JWT token at ${new Date().toUTCString()}`;
        const currentUrl = window.location.href.split('?')[0];
        const signLink = createDeepLinkUrl({
            type: 'sign-message',
            message,
            'x-success': `${currentUrl}?result=success&signature={signature}`
        });

        jitsiLocalStorage.setItem('address', addressParam);
        jitsiLocalStorage.setItem('message', message);
        window.location = signLink;
    } else if (signatureParam) {
        const addressStorage = jitsiLocalStorage.getItem('address');
        const messageStorage = jitsiLocalStorage.getItem('message');

        _sign(signatureParam, addressStorage, messageStorage);
    }
}

