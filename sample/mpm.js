
/* eslint no-console: off */

const suite   = require("./suite")
const cluster = require("cluster")

;(async () => {
    if (cluster.isMaster) {
        for (let i = 0; i < 2; i++)
            cluster.fork()
        cluster.on("exit", (worker, code, signal) => {
            console.log(`DIED ${worker.process.pid}`)
        })
    }
    setTimeout(async () => {
        console.log("START", cluster.isMaster, process.pid)
        await suite("mpm")
        console.log("END", cluster.isMaster, process.pid)
    }, cluster.isMaster ? 1000 : 2000)
})()

