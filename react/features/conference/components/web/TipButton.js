// @flow
/* eslint-disable comma-dangle, max-len */

import React, { Component } from 'react';

import {
    isAccountOrChainName
} from '../../../aeternity';

// todo: as part of this comonent and print the error if it's not valid
// const isAccountOrChainName = isAccountOrChainNameUtil;

type Props = {

    /**
     * Account or chain name
     */
    account: string,
};

type State = {

    /**
     * Whether tooltip is open or not.
     */
    isOpen: boolean,

    /**
     * Fiat currency.
     */
    currency: string,

    /**
     * AE value
     *
     */
    value: string,

    /**
     * Any error
     */
    error: string,
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
            currency: 'eur',
            value: '',
            error: ''
        };

        this._changeCurrency = this._changeCurrency.bind(this);
        this._onToggleTooltip = this._onToggleTooltip.bind(this);
        this._tokensToCurrency = this._tokensToCurrency.bind(this);
        this._onSendTip = this._onSendTip.bind(this);
        this._onChangeValue = this._onChangeValue.bind(this);
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
     * Toggle tooltip.
     *
     * @param {string} currency - New currency.
     * @returns {void}
     */
    _onToggleTooltip() {
        this.setState({ isOpen: !this.state.isOpen });
    }

    /**
     * Change ae value.
     *
     * @param {Object} event - Contains new value.
     * @returns {void}
     */
    _onChangeValue({ target: { value } }) {
        this.setState({ value });
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
     * Send the tip with comment `tip to ${this.props.account}` to the account.
     *
     * @param {{ id: string, account: string, text: string, author: string, signCb: Function, parentId: string }} options - Options.
     * @returns {Promise}
     */
    async _onSendTip({
        id,
        text = `tip to ${this.props.account}`,
        author = this.props.account,
        signCb,
        parentId = ''
    }) {
        // todo: move to onChange
        if (!isAccountOrChainName(author)) {
            this.setState({ error: 'value is not account or chain name' });

            return;
        }

        const sendComment = body => fetch(`${BACKEND_URL}/${'comment/api'}`, {
            method: 'post',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });

        const { challenge } = await sendComment({
            id,
            text,
            author
        });
        const signature = await signCb(challenge);

        const commentPayload = {
            challenge,
            signature,
            parentId
        };

        return sendComment(commentPayload);
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
                <button onClick = { this._onToggleTooltip }>Tip</button>
                {isOpen && (
                    <div style = {{ background: 'red' }}>
                        <input
                            onChange = { this._onChangeValue }
                            type = 'text'
                            value = { this.state.value }
                        />
                        <button onClick = { this._onSendTip }>Send</button>
                    </div>
                )}
            </div>
        );
    }
}

export default TipButton;
