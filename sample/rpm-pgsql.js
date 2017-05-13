
/* eslint no-console: off */

const KeyVal = require("..")

;(async () => {
    let keyval = new KeyVal("rpm+pgsql://postgresql:postgresql@127.0.0.1:5432/example?table=kv&key=key&val=val")
    await keyval.open()
    let keys = await keyval.keys()
    console.log("keys", keys)
    await keyval.put("foo", "bar")
    await keyval.put("quux", "baz")
    keys = await keyval.keys()
    console.log("keys", keys)
    let v0 = await keyval.get("dummy")
    let v1 = await keyval.get("foo")
    let v2 = await keyval.get("quux")
    console.log(v0, v1, v2)
    await keyval.del("foo")
    keys = await keyval.keys()
    console.log("keys", keys)
    await keyval.close()
})().then(() => {
    console.log("OK")
}).catch((err) => {
    console.log("ERROR", err)
})

