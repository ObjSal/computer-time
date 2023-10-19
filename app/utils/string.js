// noinspection JSUnusedGlobalSymbols

'use strict';

const StringUtils = (() => {

    Object.assign(String.prototype, {
        // Ref: https://stackoverflow.com/a/30259322/877225
        capitalizeFirstLetter() {
            return this.charAt(0).toUpperCase() + this.slice(1);
        }
    });

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
        base64ToHex
    }
})();