const fs = require('fs');

/**
 * Handles functionality for retrieving, creating, and saving files
 *
 * @type {module.FileManager}
 */
module.exports = class FileManager {

    /**
     * Initializes member variables that will be needed by the class
     *
     * @param benchmark_folder {string}, path to save benchmark file to
     * @returns void
     */
    constructor(benchmark_folder){

        /**
         * Path to save benchmark file to
         * @type {string}
         */
        this.benchmark_folder = benchmark_folder;

        /**
         * File which to save the benchmark data too
         * @type {string}
         */
        this.save_file = "";

    }

    /**
     * Gets the name of the last file in the directory. This is for running multiple benchmarks on a websocket
     * server. Files will be labels 1_1.csv, 2_1.csv, 3_1.csv, etc.
     *
     * @returns {Promise} resolves with the last file in the directory, 0_0.csv if the directory is empty
     */
    async getLastFile() {

        return new Promise((resolve, reject) => {

            //default to 0_0.csv is no files are found
            const last_file = "0_0.csv";

            try {

                //if directory doesn't exist, create it
                if (!fs.existsSync(this.benchmark_folder)) {
                    fs.mkdirSync(this.benchmark_folder,{ recursive: true });
                }

                // grab all the files in the directory
                fs.readdir(this.benchmark_folder, (err, files) => {

                    // resolve with the last file
                    resolve(files[files.length - 1]);
                });
            } catch (e) {

                //resolve the default file name
                resolve(last_file);
            }
        });
    }

    /**
     * Create a new file succeeding the previous file
     *
     * @returns {Promise<void>}
     */
    async createFile() {

        // retrieve the name of the last file in the directory
        await this.getLastFile().then((file) => {
            let found;

            // set default file numbers in case the last file has an invalid name
            if (file === undefined) {
                found = [0, 0, 0];
            } else {

                // grab the benchmark numbers of the previous filename
                const regex = /(?<test>\d)_(?<run>\d).csv/;
                found = file.match(regex);
            }

            // create a new file indicating it is a benchmark test succeeding the previous file
            const run_count = 1;
            this.save_file = this.benchmark_folder + (parseInt(found[1]) + 1).toString() + "_" + run_count + ".csv";

        });
    }

    /**
     * Saves a given Object of data to a CSV file determined earlier in the program
     *
     * @param data {Object} the given data to save to a CSV file
     *
     * @returns {Promise} resolves when done
     */
    saveDataToFile(data) {

        var newLine = '\r\n';

        // get the column headings
        let fields = Object.keys(data) + newLine;

        return new Promise((resolve, reject) => {

            // allows for this to be used within nested functions
            let self = this;

            // grab the predetermined file
            fs.stat(this.save_file, function (err, stat) {

                // if the file is retrieved without an error, append the data to the file
                if (err == null) {

                    // create a CSV string from the data object
                    const csv = Object.keys(data).map(function(k){return data[k]}).join(",") + newLine;

                    // append string to the file
                    fs.appendFile(self.save_file, csv, function (err) {
                        if (err) throw reject();
                    });

                // if the file is not found, create the file with the column headings
                } else {

                    fs.writeFile(self.save_file, fields, function (err) {
                        if (err) throw reject();
                    });

                    // recall self so that the data can be saved to the file after the column headings have be added
                    self.saveDataToFile(data);
                }

                // resolve when done
                resolve();
            });
        });
    }
};
