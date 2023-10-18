'use strict';

const ImageUtils = (() => {

    function resizeImage(dataURL, type, width, height, callback) {
        // Reference: https://imagekit.io/blog/how-to-resize-image-in-javascript/

        let img = document.createElement("img");
        img.onload = function () {
            let canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            let ctx = canvas.getContext("2d");
            // ctx.mozImageSmoothingEnabled = false;
            // ctx.webkitImageSmoothingEnabled = false;
            // ctx.msImageSmoothingEnabled = false;
            // ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL(type));
        }
        img.src = dataURL;
    }

    return {
        resizeImage
    }
})();