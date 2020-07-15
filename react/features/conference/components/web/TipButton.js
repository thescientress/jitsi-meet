// @flow

import React, { Component } from 'react';

// todo:
declare type AeternityName = string;

type Props = {

    /**
     * Account or chain name
     */
    account: AeternityName,
};

type State = {

    /**
     * Whether tooltip is open or not.
     */
    isOpen: boolean,

};

const BACKEND_URL = 'https://raendom-backend.z52da5wt.xyz';

/**
 * Aeternity tip button react version.
 */
class TipButton extends Component<Props, State> {
    /**
     * Initializes a new TipButton instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this.state = {
            isOpen: false,
            currency: 'eur'
        };
    }

    /**
     * WIP.
     * Chane currency.
     *
     * @param {string} currency - New currency.
     * @returns {void}
     */
    _changeCurrency(currency) {
        this.setState({ currency });
    }

    /**
     * WIP.
     * Get token price for the current currency.
     *
     * @returns {nubmer}
     */
    async _getPriceRates() {
        const getPriceRates = () => '';

        return await getPriceRates[this.state.currency];
    }

    /**
     * WIP.
     * Converts tokens to current currency.
     *
     * @returns {nubmer}
     */
    async _tokensToCurrency({ target: { value: amount } }) {
        const rate = await this._getPriceRates();

        return (amount * rate).toLocaleString('en-US', {
            style: 'currency',
            currency: this.state.currency
        });
    }

    /**
     * Sehnd the tip to some account.
     *
     * @param {{ id: string, account: string, author: string, signCb: Function, parentId: number }} options - Options.
     * @returns {Promise}
     */
    async _onSendTip({
        id,
        text = `tip to ${this.props.account}`,
        author = this.props.account,
        signCb,
        parentId
    }) {
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
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const { isOpen } = this.state;

        return (
            <div>
                <button>Tip</button>
                {isOpen && (
                    <div>
                        <input type = 'text' />
                        <button onClick = { this._onSendTip }>Send</button>
                    </div>
                )}
            </div>
        );
    }
}

export default TipButton;
