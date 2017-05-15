
/* eslint no-console: off */

const KeyVal = require("..")

;(async () => {
    let keyval = new KeyVal("spm")
    await keyval.open()

    let keys = await keyval.keys()
    console.log("KEYS", keys)

    await keyval.put("foo",  "bar")
    await keyval.put("quux", "baz")

    keys = await keyval.keys()
    console.log("KEYS", keys)

    let v1 = await keyval.get("foo")
    let v2 = await keyval.get("quux")
    console.log("V1", v1, "V2", v2)

    await keyval.del("foo")
    await keyval.del("quux")

    keys = await keyval.keys()
    console.log("KEYS", keys)

    await keyval.put("foo.bar.quux", "bar")
    await keyval.put("foo.baz.quux", "baz")

    keys = await keyval.keys("foo.*.quux")
    console.log("KEYS", keys)

    await keyval.close()
})()

