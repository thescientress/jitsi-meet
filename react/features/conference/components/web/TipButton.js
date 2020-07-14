// @flow

import React, { useState, useEffect } from 'react';

// todo:
declare type AeternityName = string;

type Props = {
    account: AeternityName,
};

// todo:
const CURRENCY = 'eur';
const BACKEND_URL = 'https://raendom-backend.z52da5wt.xyz';

const TipButton = async ({ account }: Props) => {
    const [ isOpen, toggleTip ] = useState(false);
    const [ currency, setCurrency ] = useState(CURRENCY);
    const [ rate, setRate ] = useState();

    const getPriceRates = async () => '';
    const getRate = async cur => await getPriceRates[cur];

    const getCurrency = function(amount) {
        return (amount * rate).toLocaleString('en-US', {
            style: 'currency',
            currency
        });
    };

    useEffect(async () => {
        setRate(
            await getRate()
        );
        setCurrency(CURRENCY);
    });

    const toCurrency = ({ event: { target: value } }) => getCurrency(value);

    // eslint-disable-next-line no-unused-vars
    const sendTipComment = async function({ id, text, author = account, signCb, parentId }) {
        const sendComment = postParam => fetch(`${BACKEND_URL}/${'comment/api'}`, {
            method: 'post',
            body: JSON.stringify(postParam),
            headers: { 'Content-Type': 'application/json' }
        });

        const responseChallenge = await sendComment({ id,
            text,
            author });
        const signedChallenge = await signCb(responseChallenge.challenge);
        const respondChallenge = {
            challenge: responseChallenge.challenge,
            signature: signedChallenge,
            parentId
        };

        return sendComment(respondChallenge);
    };

    return (
        <div>
            <button onClick = { toggleTip(!isOpen) }>Tip</button>
            {isOpen && (
                <div>
                    <input
                        // eslint-disable-next-line react/jsx-no-bind
                        onChange = { toCurrency } />
                        type = 'text'
                    <button>Send</button>
                </div>
            )}
        </div>
    );
};

export default TipButton;
