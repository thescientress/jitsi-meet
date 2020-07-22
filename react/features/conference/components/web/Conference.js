// @flow
// eslint-disable-next-line max-len
import browserWindowMessageConnection from '@aeternity/aepp-sdk/es/utils/aepp-wallet-communication/connection/browser-window-message';
import Detector from '@aeternity/aepp-sdk/es/utils/aepp-wallet-communication/wallet-detector';
import { jitsiLocalStorage } from 'js-utils';
import _ from 'lodash';
import React from 'react';

import VideoLayout from '../../../../../modules/UI/videolayout/VideoLayout';
import { client, initClient } from '../../../../client';
import { getConferenceNameForTitle } from '../../../base/conference';
import { connect, disconnect } from '../../../base/connection';
import { translate } from '../../../base/i18n';
import { setJWT } from '../../../base/jwt/actions';
import { connect as reactReduxConnect } from '../../../base/redux';
import { createDeepLinkUrl } from '../../../base/util/createDeepLinkUrl';
import { parseURLParams } from '../../../base/util/parseURLParams';
import { Chat } from '../../../chat';
import { Filmstrip } from '../../../filmstrip';
import { CalleeInfoContainer } from '../../../invite';
import { LargeVideo } from '../../../large-video';
import { Prejoin, isPrejoinPageVisible } from '../../../prejoin';
import {
    Toolbox,
    fullScreenChanged,
    setToolboxAlwaysVisible,
    showToolbox
} from '../../../toolbox';
import { LAYOUTS, getCurrentLayout } from '../../../video-layout';
import { maybeShowSuboptimalExperienceNotification } from '../../functions';
import {
    AbstractConference,
    abstractMapStateToProps
} from '../AbstractConference';
import type { AbstractProps } from '../AbstractConference';

import InviteMore from './InviteMore';
import Labels from './Labels';
import { default as Notice } from './Notice';
import { default as Subject } from './Subject';

declare var APP: Object;
declare var config: Object;
declare var interfaceConfig: Object;

/**
 * DOM events for when full screen mode has changed. Different browsers need
 * different vendor prefixes.
 *
 * @private
 * @type {Array<string>}
 */
const FULL_SCREEN_EVENTS = [
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'fullscreenchange'
];

/**
 * The CSS class to apply to the root element of the conference so CSS can
 * modify the app layout.
 *
 * @private
 * @type {Object}
 */
const LAYOUT_CLASSNAMES = {
    [LAYOUTS.HORIZONTAL_FILMSTRIP_VIEW]: 'horizontal-filmstrip',
    [LAYOUTS.TILE_VIEW]: 'tile-view',
    [LAYOUTS.VERTICAL_FILMSTRIP_VIEW]: 'vertical-filmstrip'
};

/**
 * The type of the React {@code Component} props of {@link Conference}.
 */
type Props = AbstractProps & {

    /**
     * Whether the local participant is recording the conference.
     */
    _iAmRecorder: boolean,

    /**
     * The CSS class to apply to the root of {@link Conference} to modify the
     * application layout.
     */
    _layoutClassName: string,

    /**
     * Name for this conference room.
     */
    _roomName: string,

    /**
     * If prejoin page is visible or not.
     */
    _showPrejoin: boolean,

    dispatch: Function,
    t: Function
}

/**
 * The conference page of the Web application.
 */
class Conference extends AbstractConference<Props, *> {
    _onFullScreenChange: Function;
    _onShowToolbar: Function;
    _originalOnShowToolbar: Function;
    _signAndReconnect: Function;
    _scanForWallets: Function;

    /**
     * Initializes a new Conference instance.
     *
     * @param {Object} props - The read-only properties with which the new
     * instance is to be initialized.
     */
    constructor(props) {
        super(props);

        this.state = {
            showDeeplink: true
        };

        // Throttle and bind this component's mousemove handler to prevent it
        // from firing too often.
        this._originalOnShowToolbar = this._onShowToolbar;
        this._onShowToolbar = _.throttle(
            () => this._originalOnShowToolbar(),
            100,
            {
                leading: true,
                trailing: false
            });

        // Bind event handler so it is only bound once for every instance.
        this._onFullScreenChange = this._onFullScreenChange.bind(this);
        this._signAndReconnect = this._signAndReconnect.bind(this);
        this._scanForWallets = this._scanForWallets.bind(this);
    }

    /**
     * Start the connection and get the UI ready for the conference.
     *
     * @inheritdoc
     */
    componentDidMount() {
        document.title = `${this.props._roomName} | ${interfaceConfig.APP_NAME}`;
        const { DISABLE_SUPERHERO = false } = interfaceConfig;
        const { address: addressParam, signature: signatureParam } = parseURLParams(window.location, true, 'search');

        if (DISABLE_SUPERHERO === true) {
            return this._start();
        }

        if (!addressParam && !signatureParam) {
            initClient().then(() => {
                this._scanForWallets();
            });
        }

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

            this._signAndReconnect(signatureParam, addressStorage, messageStorage);
        }
        this._start();
    }

    /**
     * Calls into legacy UI to update the application layout, if necessary.
     *
     * @inheritdoc
     * returns {void}
     */
    componentDidUpdate(prevProps) {
        if (this.props._shouldDisplayTileView
            === prevProps._shouldDisplayTileView) {
            return;
        }

        // TODO: For now VideoLayout is being called as LargeVideo and Filmstrip
        // sizing logic is still handled outside of React. Once all components
        // are in react they should calculate size on their own as much as
        // possible and pass down sizings.
        VideoLayout.refreshLayout();
    }

    /**
     * Disconnect from the conference when component will be
     * unmounted.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        APP.UI.unbindEvents();

        FULL_SCREEN_EVENTS.forEach(name =>
            document.removeEventListener(name, this._onFullScreenChange));

        APP.conference.isJoined() && this.props.dispatch(disconnect());
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const {
            // XXX The character casing of the name filmStripOnly utilized by
            // interfaceConfig is obsolete but legacy support is required.
            filmStripOnly: filmstripOnly
        } = interfaceConfig;
        const {
            _iAmRecorder,
            _layoutClassName,
            _showPrejoin
        } = this.props;
        const hideLabels = filmstripOnly || _iAmRecorder;

        return (
            <div
                className = { _layoutClassName }
                id = 'videoconference_page'
                onMouseMove = { this._onShowToolbar }>

                <Notice />
                <Subject />
                <InviteMore showDeeplink = { this.state.showDeeplink } />
                <div id = 'videospace'>
                    <LargeVideo />
                    { hideLabels
                        || <Labels /> }
                    <Filmstrip filmstripOnly = { filmstripOnly } />
                </div>

                { filmstripOnly || _showPrejoin || <Toolbox /> }
                { filmstripOnly || <Chat /> }

                { this.renderNotificationsContainer() }

                { !filmstripOnly && _showPrejoin && <Prejoin />}

                <CalleeInfoContainer />
            </div>
        );
    }

    /**
     * Start to search the wallet with sdk.
     *
     * @private
     * @returns {void}
     *
     */
    async _scanForWallets() {
        const connection = await browserWindowMessageConnection({
            connectionInfo: { id: 'spy' }
        });

        // eslint-disable-next-line new-cap
        const detector = await Detector({ connection });

        detector.scan(async ({ newWallet }) => {
            if (newWallet) {
                detector.stopScan();
                await client.connectToWallet(await newWallet.getConnection());
                await client.subscribeAddress('subscribe', 'current');
                this._signAndReconnect();
            }
        });

    }

    /**
     * Start to search the wallet with sdk.
     *
     * @param {string} signatureParam - Signature from the query string.
     * @param {string} addressParam - Address from the query string.
     * @param {string} messageParam - Message from the query string.
     * @private
     * @returns {void}
     *
     */
    async _signAndReconnect(signatureParam, addressParam, messageParam) {
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
        this.props.dispatch(setJWT(token));
        await APP.conference.leaveRoomAndDisconnect();
        APP.UI.unbindEvents();
        FULL_SCREEN_EVENTS.forEach(name =>
            document.removeEventListener(name, this._onFullScreenChange));
        this.setState({ showDeeplink: false });
        this._start();
    }

    /**
     * Updates the Redux state when full screen mode has been enabled or
     * disabled.
     *
     * @private
     * @returns {void}
     */
    _onFullScreenChange() {
        this.props.dispatch(fullScreenChanged(APP.UI.isFullScreen()));
    }

    /**
     * Displays the toolbar.
     *
     * @private
     * @returns {void}
     */
    _onShowToolbar() {
        this.props.dispatch(showToolbox());
    }

    /**
     * Until we don't rewrite UI using react components
     * we use UI.start from old app. Also method translates
     * component right after it has been mounted.
     *
     * @inheritdoc
     */
    _start() {
        APP.UI.start();

        APP.UI.registerListeners();
        APP.UI.bindEvents();

        FULL_SCREEN_EVENTS.forEach(name =>
            document.addEventListener(name, this._onFullScreenChange));

        const { dispatch, t } = this.props;

        dispatch(connect());

        maybeShowSuboptimalExperienceNotification(dispatch, t);

        interfaceConfig.filmStripOnly
            && dispatch(setToolboxAlwaysVisible(true));
    }
}

/**
 * Maps (parts of) the Redux state to the associated props for the
 * {@code Conference} component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {Props}
 */
function _mapStateToProps(state) {
    return {
        ...abstractMapStateToProps(state),
        _iAmRecorder: state['features/base/config'].iAmRecorder,
        _layoutClassName: LAYOUT_CLASSNAMES[getCurrentLayout(state)],
        _roomName: getConferenceNameForTitle(state),
        _showPrejoin: isPrejoinPageVisible(state)
    };
}

export default reactReduxConnect(_mapStateToProps)(translate(Conference));
