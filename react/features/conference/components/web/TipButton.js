// @flow
/* eslint-disable comma-dangle, max-len */

import React, { Component } from 'react';
import BigNumber from 'bignumber.js';

import TIPPING_INTERFACE from 'superhero-utls/src/contracts/TippingInterface.aes';

import { client } from '../../../../client';
import {
    isAccountOrChainName
} from '../../../aeternity';


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
     */
    value: string,

    /**
     * Any error
     */
    error: string,

    /**
     * Is show loading
     */
    showLoading: boolean,

    /**
     * Message for the author
     */
    message: string,
};

const URLS = {
    SUPER: 'https://superhero.com',
    RAENDOM: 'https://raendom-backend.z52da5wt.xyz'
};
const CONTRACT_ADDRESS = 'ct_2AfnEfCSZCTEkxL5Yoi4Yfq6fF7YapHRaFKDJK3THMXMBspp5z';

let contract;
const aeternity = {
    async initTippingContractIfNeeded(): void {
        if (!client) {
            throw new Error('Init sdk first');
        }
        if (contract) {
            return;
        }
        contract = await client.getContractInstance(TIPPING_INTERFACE, { contractAddress: CONTRACT_ADDRESS });
    },
    async tip(url, title, amount): Promise {
        await this.initTippingContractIfNeeded();

        contract.methods.tip(url, title, { amount });
    },
    util: {
        aeToAtoms(ae) {
            return (new BigNumber(ae)).times(new BigNumber(1000000000000000000));
        }
    }
};

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
            message: `button host ${window.location.host} tip to ${this.props.account}`,
            error: '',
            showLoading: false,
        };

        this._changeCurrency = this._changeCurrency.bind(this);
        this._onToggleTooltip = this._onToggleTooltip.bind(this);
        this._tokensToCurrency = this._tokensToCurrency.bind(this);
        this._onSendTip = this._onSendTip.bind(this);
        this._onSendTipComment = this._onSendTipComment.bind(this);
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
     * Send the tip comment, not the tip itself.
     *
     * @param {{ id: string, account: string, text: string, author: string, signCb: Function, parentId: string }} options - Options.
     * @returns {Promise}
     */
    async _onSendTipComment({
        id,
        text = this.state.message,
        author = this.props.account,
        signCb,
        parentId = ''
    }) {
        // todo: move to onChange
        if (!isAccountOrChainName(author)) {
            this.setState({ error: 'value is not account or chain name' });

            return;
        }

        const sendComment = body => fetch(`${URLS.RAENDOM}/${'comment/api'}`, {
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
     * Send the tip itself.
     *
     * @returns {void}
     */
    async _onSendTip() {
        if (!this.props.account) {
            return;
        }

        this.setState({ showLoading: true });

        const amount = aeternity.util.aeToAtoms(this.state.value);
        const url = `${URLS.SUPER}/user-profile/${this.props.account}`;

        // tip with sdk [wip]
        try {
            await aeternity.tip(url, this.state.message, amount);
        } catch (e) {
            console.error(e);
            this.setState({ error: `error ${JSON.stringify(e)}` });
        }
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
