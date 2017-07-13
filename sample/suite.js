
/* eslint no-console: off */

const expect = require("chai").expect
const KeyVal = require("..")

module.exports = async function (url) {
    /*  open connection  */
    console.log(`++ START: ${url}`)
    let keyval = new KeyVal(url)
    await keyval.open()

    /*  prepare  */
    let keys = await keyval.keys("*")
    for (let i = 0; i < keys.length; i++)
        await keyval.del(keys[i])
    keys = await keyval.keys()
    expect(keys).to.be.deep.equal([])

    /*  put data into store  */
    await keyval.put("foo",  "bar")
    await keyval.put("quux", "baz")

    /*  retrieve keys (again)  */
    keys = await keyval.keys()
    expect(keys.sort()).to.be.deep.equal([ "foo", "quux" ])

    /*  get data from store  */
    let v0 = await keyval.get("no-existing")
    let v1 = await keyval.get("foo")
    let v2 = await keyval.get("quux")
    expect(v0).to.be.equal(undefined)
    expect(v1).to.be.equal("bar")
    expect(v2).to.be.equal("baz")

    /*  delete data from store  */
    await keyval.del("foo")
    await keyval.del("quux")

    /*  retrieve keys (again)  */
    keys = await keyval.keys()
    expect(keys).to.be.deep.equal([])

    /*  work with wildcard keys  */
    await keyval.put("foo.bar.quux", "bar")
    await keyval.put("foo.baz.quux", "baz")
    keys = await keyval.keys("foo.*.quux")
    expect(keys.sort()).to.be.deep.equal([ "foo.bar.quux", "foo.baz.quux" ])
    for (let i = 0; i < keys.length; i++)
        await keyval.del(keys[i])

    /*  work with threads and transactions  */
    await new Promise((resolve, reject) => {
        const run = async (id, finish) => {
            let kv = new KeyVal(url)
            await kv.open()
            let done = 0
            let max  = 10
            for (let i = 0; i < max; i++) {
                setTimeout(async () => {
                    //  console.log(`thread=${id} burst=${i}`)
                    await keyval.acquire()
                    let val = await keyval.get(`foo.${id}`)
                    if (val === undefined)
                        val = 0
                    val++
                    await keyval.put(`foo.${id}`, val)
                    await keyval.release()
                    if (++done === max) {
                        kv.close()
                        finish()
                    }
                }, Math.round((Math.random() * 20)))
            }
        }
        let done = 0
        let max  = 5
        for (let i = 0; i < max; i++) {
            run(i, () => {
                if (++done === max)
                    resolve()
            })
        }
    })
    keys = await keyval.keys("foo.*")
    for (let i = 0; i < keys.length; i++) {
        let val = await keyval.get(keys[i])
        expect(val).to.be.equal(10)
        await keyval.del(keys[i])
    }

    /*  retrieve keys (again)  */
    keys = await keyval.keys()
    expect(keys).to.be.deep.equal([])

    /*  close connection  */
    await keyval.close()
    console.log(`++ END:   ${url}`)
}

