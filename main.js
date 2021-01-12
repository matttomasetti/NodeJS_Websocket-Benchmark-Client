const ConnectionManager = require('./connection_manager');
const ProgressBar = require('./progress_bar');
const FileManager = require('./file_manager');
const Results = require('./results');
const readline = require('readline');
const WebSocketClient = require('websocket').client;

class Benchmarker {

    /**
     * Initializes all the data that will be needed throughout the program
     *
     * We initialize data that will be shared between mutliple files as objects, becuase
     * objects will be passed as reference, where a primitve variable would be passed by value
     */
    constructor() {

        /**
         * The folder where the benchmark results will be saved. This will be set once the user is prompted for
         * the current language being tested
         * @type {string}
         */
        this.benchmark_folder = "";

        /**
         * The base directory where all benchmark results are stored
         * @type {string}
         */
        this.benchmark_results_directory = process.env.BENCHMARK_FOLDER || "./benchmarks";

        /**
         * The language which is being benchmarked. This can be pulled from an environment variable for easy
         * automation with Docker, or can be entered manually by the user if an environment variable is not set
         * @type {string | undefined}
         */
        this.benchmark_language = process.env.BENCHMARK_LANGUAGE || undefined;

        /**
         * An object storing data on the connections currently being made each round
         * {
         *      counter: {number} the number of clients currently created each round,
         *      total: {number} the total number of clients expected to me created each round,
         *      message: {string} the message to output before starting the connection process
         * }
         * @type {Object}
         */
        this.connection_progress_obj = {
            counter: 0,
            total: 0,
            message: "Connecting..."
        };

        /**
         * An object storing data on all the requests currently being made each round
         * {
         *      counter: {number} the number of requests currently completed each round,
         *      total: {number} the total number of requests expected to me completed each round,
         *      message: {string} the message to output before starting the benchmarking process
         * }
         * @type {Object}
         */
        this.benchmark_progress_obj = {
            counter: 0,
            total: 0,
            message: "Benchmarking..."
        };

        /**
         * An object storing websocket client connections and connection data
         * {
         *      connection_time: {number} the total time it took for all the clients to connect each round
         *      times: {Array}, time data produces by each client for each request to the websocket server
                clients: {Array} list of all connected clients
         * }
         * @type {Object}
         */
        this.connection_obj = {
            connection_time: 0,
            times: [],
            clients: []
        };

        /**
         * An object storing data that each client will need to connect to the benchmark server, and send requests
         * {
         *      websocket_address {string} IP address of the websocket server to connect to
         *      websocket_port: {number} Port number of the websocket to connect to
         *      connection_interval: {number} The number of websocket connections to add each round
         *      request_interval: {number} The number of requests to sound out per connected client per round
         *      request_timeout: {number} The number of minutes to wait before abandoning a request
         * }
         * @type {Object}
         */
        this.benchmark_obj = {
            websocket_address: process.env.WEBSOCKET_ADDRESS || "127.0.0.1",
            websocket_port: process.env.WEBSOCKET_PORT || 8080,
            connection_interval: process.env.ADD_CONNECTIONS || 100,
            request_interval: process.env.REQUESTS || 100,
            request_timeout: 10
        };

        /**
         * Instance of the FileManager. This will be set once the user is prompted for
         * the current language being tested
         * @type {module.FileManager}
         */
        this.fm = null;

        /**
         * Instance of the Results class. This will be set once the user is prompted for
         * the current language being tested, as it requires the instance of the FileManager
         * @type {module.Results}
         */
        this.result = null;

        /**
         * Instance of the ConnectionManager class
         * @type {module.ConnectionManager}
         */
        this.cm = new ConnectionManager(this.benchmark_obj, this.connection_obj, this.connection_progress_obj, this.benchmark_progress_obj);

        /**
         * The number of rounds to perform per test
         * @type {number}
         */
        this.ROUNDS = 50;

    }

    /**
     * Prompts the user at the beginning of the application for the current language being benchmarked
     * @returns {void}
     */
    prompt() {

        // allows this to be used inside nested functions
        let self = this;

        // create a readline interface for console input/output
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // continue running the programming asynchronously
        let manage_file = async function() {
            // assign the benchmark folder by conjoining the benchmark results root directory with the language name
            self.benchmark_folder = self.benchmark_results_directory + '/' + self.benchmark_language + "/";

            // create the FileManager and Results instances
            self.fm = new FileManager(self.benchmark_folder);
            self.result = new Results(self.fm, self.benchmark_obj.request_interval);

            // close the readline interface
            rl.close();

            // create the file where the benchmark results will be saved to
            self.fm.createFile();

            // benchmark the rest of the program
            await self.run_program();
        };

        if(this.benchmark_language === undefined){
            // prompt the user for the language being benchmarked and wait for a response
            rl.question('Language: ', async (benchmark_language) => {

                self.benchmark_language = benchmark_language;
                manage_file();
            });
        }else{
            manage_file();
        }

    }

    /**
     * Loops through the benchmarking process for the given number of rounds,
     * then closed the websocket connections
     * @return {Promise<void>}
     */
    async run_program() {

        // for the number of given rounds, perform the benchmarking process, waiting for each round to finish before
        // continuing
        for (let i = 0; i < this.ROUNDS; i++) {
            console.log("\nTest: " + (i + 1) + "/" + this.ROUNDS);
            await this.benchmark(i);
        }

        // once all round have been completed, close the websocket connections
        await this.cm.close();
    }

    /**
     * Performs the benchmarking process
     * @param round {number} The current iteration count of the round being performed
     * @return {Promise} resolves once the round of the benchmarking process is complete
     */
    async benchmark(round) {
        return new Promise(async (resolve, reject) => {
            try {

                // determine the total number of expected connections
                // REQUEST_INTERVAL * ROUND_NUMBER
                this.connection_progress_obj.total = (round + 1) * this.benchmark_obj.request_interval;

                // start the connection progress bar
                let connection_bar = new ProgressBar(this.connection_progress_obj);
                connection_bar.start();

                // begin the connection process, and wait for it to finish
                await this.cm.createConnections(round);

                // finalize the progress bar, and stop it from updating any further
                this.connection_progress_obj.bar.update(this.connection_progress_obj.counter);
                connection_bar.stop();

                // output to the conole the time elapse for the new connections to connect
                console.log("\nConnection Time: " + this.connection_obj.connection_time);

                // start the benchmarking progress bar
                this.benchmark_progress_obj.total = this.benchmark_obj.request_interval * this.connection_obj.clients.length;
                let benchmark_bar = new ProgressBar(this.benchmark_progress_obj);
                benchmark_bar.clear();
                benchmark_bar.start();

                // start the benchmarking process, and wait for it to finish
                await this.cm.sendRequests(round);

                // stop the progress bar from updating any further
                benchmark_bar.stop();

                // calculate the results for the current round of benchmarking
                await this.result.calculate(this.connection_obj);

                // resolve when done
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Checks if there is a websocket server accepting connections on the given IP and Port. If no server found,
     * the application terminates
     *
     * @return {Promise} Resolves when a connection is made to the websocket server, otherwise terminates
     */
    async serverCheck(){

        // connect to the websocket server
        let url = "ws://"+this.benchmark_obj.websocket_address+":"+this.benchmark_obj.websocket_port;
        let client = new WebSocketClient();
        client.connect(url);

        return new Promise(async (resolve, reject) => {

            // terminate the program is the connection is unsuccessful
            client.on('connectFailed', function (error) {
                console.log("Server Not Found");
                process.exit();
            });

            // resolve on a successful connection
            client.on('connect', function (connection) {
                connection.close();
                resolve();
            });
        });

    }
}

let benchmarker = new Benchmarker();
let check_server = async function(){await benchmarker.serverCheck()};
check_server().then( () => { benchmarker.prompt(); });
