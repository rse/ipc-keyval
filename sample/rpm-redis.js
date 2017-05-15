
/* eslint no-console: off */

const KeyVal = require("..")

;(async () => {
    let keyval = new KeyVal("rpm+redis://x:local-secret@127.0.0.1:6379/test")
    await keyval.open()

    let keys = await keyval.keys()
    console.log("keys", keys)

    await keyval.put("foo", "bar")
    await keyval.put("quux", "baz")
    keys = await keyval.keys()
    console.log("keys", keys)

    let v1 = await keyval.get("foo")
    let v2 = await keyval.get("quux")
    console.log(v1, v2)

    await keyval.del("foo")
    keys = await keyval.keys()
    console.log("keys", keys)

    await keyval.put("foo.bar.quux", "bar")
    await keyval.put("foo.baz.quux", "baz")
    keys = await keyval.keys("foo.*.quux")
    console.log("keys", keys)

    await keyval.close()
})()

