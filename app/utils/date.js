'use strict';

const DateUtils = (() => {
    function msToTime(duration) {
        // ref: https://stackoverflow.com/a/19700358

        // let milliseconds = Math.floor((duration % 1000) / 100);
        let seconds = Math.floor((duration / 1000) % 60);
        let minutes = Math.floor((duration / (1000 * 60)) % 60);
        let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

        hours = (hours < 10) ? "0" + hours : hours;
        minutes = (minutes < 10) ? "0" + minutes : minutes;
        seconds = (seconds < 10) ? "0" + seconds : seconds;

        return hours + ":" + minutes + ":" + seconds; // + "." + milliseconds;
    }

    return {
        msToTime
    }
})();