
/* eslint no-console: off */

const KeyVal  = require("..")
const cluster = require("cluster")

;(async () => {
    if (cluster.isMaster) {
        for (let i = 0; i < 1; i++)
            cluster.fork()
        cluster.on("exit", (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died`)
        })
    }

    setTimeout(async () => {
        console.log("START", cluster.isMaster, process.pid)

        let keyval = new KeyVal("mpm")
        await keyval.open()

        console.log("KEYS...")
        let keys = await keyval.keys()
        console.log("KEYS", cluster.isMaster, process.pid, keys)

        await keyval.put("foo", "bar")
        await keyval.put("quux", "baz")

        keys = await keyval.keys()
        console.log("KEYS", cluster.isMaster, process.pid, keys)

        let v1 = await keyval.get("foo")
        let v2 = await keyval.get("quux")
        console.log("GET", cluster.isMaster, process.pid, "v1", v1, "v2", v2)

        await keyval.del("foo")
        await keyval.del("quux")

        keys = await keyval.keys()
        console.log("KEYS", cluster.isMaster, process.pid, keys)
    }, cluster.isMaster ? 1000 : 2000)
})()

