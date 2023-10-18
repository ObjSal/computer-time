// noinspection JSUnusedGlobalSymbols

'use strict';

const StringUtils = (() => {

    function capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function base64ToHex(str) {
        // Reference: https://stackoverflow.com/a/39460727/877225
        // TODO(sal): review code.
        const raw = atob(str);
        let result = '';
        for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16);
            result += (hex.length === 2 ? hex : '0' + hex);
        }
        return result.toUpperCase();
    }

    return {
        base64ToHex,
        capitalizeFirstLetter
    }
})();