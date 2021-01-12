const _progress = require('cli-progress');

/**
 * Provides functionality for displaying, stopping and clearing progress bars
 *
 * @type {module.ProgressBar}
 */
module.exports = class ProgressBar {

    /**
     * Initializes the ProgressBar class with a progress_obj member object
     * @param progress_obj {Object}
     * @returns void
     */
    constructor(progress_obj){

        /**
         * A structures which stores the current value of the progress bar, the total expected value,
         * and a message to output before the progress bar starts
         * {
         *      counter: {number} the current value of the progress bar,
         *      total: {number} the total expected value,
         *      message: {string} message to output before the progress bar starts
         * };
         *
         *  @type {Object}
         */
        this.progress_obj = progress_obj;
    }

    /**
     * Resets the value counter of the progress bar object
     * @returns void
     */
    clear(){
        this.progress_obj.counter = 0;
    }

    /**
     * Initializes the progress bar and displays it to the console
     * @returns void
     */
    start() {

        // Needed to access member properties from within the setInterval function
        const self = this;

        // Output the message of the member progress bar object
        console.log(this.progress_obj.message);

        // create new progress bar using default values
        this.progress_obj.bar = new _progress.Bar({}, _progress.Presets.shades_grey);
        this.progress_obj.bar.start(this.progress_obj.total, 0);

        // 50ms update rate
        this.progress_obj.timer = setInterval(function () {

            // update the bar value
            //console.log(progress_obj.counter);
            self.progress_obj.bar.update(self.progress_obj.counter);

            // limit reached
            if (self.progress_obj.counter >= self.progress_obj.bar.getTotal()) {

                // stop timer
                clearInterval(self.progress_obj.timer);
                self.progress_obj.bar.stop();
            }
        }, 50);
    }

    /**
     * Stops the progress bar from continuing to update
     * @returns void
     */
    stop(){
        clearInterval(this.progress_obj.timer);
        this.progress_obj.bar.stop();
    }
};


