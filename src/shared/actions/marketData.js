import get from 'lodash/get';
import each from 'lodash/each';
import map from 'lodash/map';
import CoinGecko from 'coingecko-api';
import { formatChartData, getUrlTimeFormat, getUrlNumberFormat } from '../libs/utils';

const coingecko = new CoinGecko();

export const ActionTypes = {
    SET_TIMEFRAME: 'IOTA/MARKET_DATA/SET_TIMEFRAME',
    SET_CHART_DATA: 'IOTA/MARKET_DATA/SET_CHART_DATA',
    SET_STATISTICS: 'IOTA/MARKET_DATA/SET_STATISTICS',
    SET_CURRENCY: 'IOTA/MARKET_DATA/SET_CURRENCY',
    SET_PRICE: 'IOTA/MARKET_DATA/SET_PRICE',
};

/**
 * Dispatch to set timeframe for IOTA time series price information
 *
 * @method setTimeframe
 * @param {string} timeframe
 *
 * @returns {{type: {string}, payload: {string} }}
 */
export function setTimeframe(timeframe) {
    return {
        type: ActionTypes.SET_TIMEFRAME,
        payload: timeframe,
    };
}

/**
 * Dispatch to set latest IOTA market information in state
 *
 * @method setMarketData
 * @param {object} data
 *
 * @returns {{type: {string}, usdPrice: {number}, mcap: {number}, volume: {number}, change24h: {string} }}
 */
export function setMarketData(currency, data) {
    const price = get(data, currency) || 0;
    const mcap = Math.round(get(data, `${currency}_market_cap`, 0));
    const volume = Math.round(get(data, `${currency}_24h_vol`, 0));
    const changePct24Hours = get(data, `${currency}_24h_change`, 0);
    const change24h = parseFloat(Math.round(changePct24Hours * 100) / 100).toFixed(2);

    return {
        type: ActionTypes.SET_STATISTICS,
        price,
        mcap,
        volume,
        change24h,
    };
}

/**
 * Dispatch to set currency in state
 *
 * @method setCurrency
 * @param {string} currency
 *
 * @returns {{type: {string}, payload: {string} }}
 */
export function setCurrency(currency) {
    return {
        type: ActionTypes.SET_CURRENCY,
        payload: currency,
    };
}

/**
 * Dispatch to set latest IOTA price information in state
 *
 * @method setPrice
 * @param {object} data
 *
 * @returns {{type: {string}, usd: {number}, eur: {number}, btc: {number}, eth: {number} }}
 */
export function setPrice(price) {
    return {
        type: ActionTypes.SET_PRICE,
        price,
    };
}

/**
 * Gets latest IOTA price information
 *
 * @method getPrice
 *
 * @returns {function} dispatch
 */
export function getPrice() {
    return (dispatch, getState) => {
        const currency = getState().settings.toLowerCase();
        return coingecko.simple
            .price({
                ids: 'iota',
                vs_currencies: currency,
            })
            .then((price) => {
                return dispatch(setPrice(price));
            });
    };
}

/**
 * Gets latest time series price data to map on chart
 *
 * @method getChartData
 *
 * @returns {function} dispatch
 */
export function getChartData() {
    return (dispatch, getState) => {
        const currency = getState().settings.toLowerCase();
        const timeframes = ['24h', '7d', '1m', '1h'];
        const chartData = {};

        timeframes.forEach((timeframe) => {
            fetchChartData(currency, timeframe)
                .then((data) => {
                    chartData[timeframe] = formatChartData(data);
                })
                .catch((error) => {
                    console.log(error);
                });
        });
    };
}

function fetchChartData(currency, timeframe) {
    if (timeframe === '1h') {
        return fetchChartData(currency, '24h').then((prices24h) => {
            // TODO: Only take last hour of data
            return prices24h;
        });
    }

    const timeframeMap = {
        '24h': 1,
        '7d': 7,
        '1m': 30,
    };

    return coingecko.coins
        .fetchMarketChart('iota', {
            days: get(timeframeMap, timeframe),
            vs_currencies: currency,
        })
        .then((data) => {
            return data.prices;
        });
}

/**
 * Dispatch to set latest chart data points in state
 *
 * @method setPrice
 * @param {object} chartData
 *
 * @returns {{type: {string}, chartData: {object} }}
 */
export function setChartData(chartData) {
    return {
        type: ActionTypes.SET_CHART_DATA,
        chartData,
    };
}

/**
 * Gets latest market information
 *
 * @method getMarketData
 *
 * @returns {function} dispatch
 */
export function getMarketData() {
    return (dispatch, getState) => {
        const currency = getState().settings.toLowerCase();
        return coingecko.simple
            .price({
                ids: 'iota',
                vs_currencies: currency,
                include_market_cap: true,
                include_24hr_vol: true,
                include_24hr_change: true,
            })
            .then((data) => {
                return dispatch(setMarketData(currency, data.iota));
            });
    };
}

export function changeCurrency(currency, timeframe) {
    return (dispatch) => {
        dispatch(setCurrency(currency));
        dispatch(getPrice(currency));
        dispatch(getChartData(currency, timeframe));
    };
}

export function changeTimeframe(currency, timeframe) {
    return (dispatch) => {
        dispatch(setTimeframe(timeframe));
        dispatch(getPrice(currency));
        dispatch(getChartData(currency, timeframe));
    };
}
