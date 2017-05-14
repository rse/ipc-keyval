/*
**  IPC-KeyVal -- Inter-Process-Communication Key-Value Store
**  Copyright (c) 2017 Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import LOKI from "lokijs"

/*  Key-Value for Remote-Process-Model (SPM) with LokiJS embedded database  */
export default class KeyVal {
    constructor (url) {
        this.url    = url
        this.opened = false
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        if (!this.url.pathname)
            throw new Error("require path in URL")
        let filename = this.url.pathname.replace(/^\//, "")
        return new Promise((resolve, reject) => {
            this.db = new LOKI(filename, {
                autosave: false,
                autoload: false
            })
            this.kv = this.db.addCollection("kv", {
                unique: [ "key" ]
            })
            this.db.loadDatabase({}, (err) => {
                if (err)
                    reject(err)
                else {
                    this.opened = true
                    resolve()
                }
            })
        })
    }

    /*  retrieve all keys  */
    keys () {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.loadDatabase({}, (err) => {
                if (err)
                    reject(err)
                else {
                    let results = this.kv.find({})
                    let keys = []
                    if (results !== null)
                        keys = results.map((record) => record.key)
                    resolve(keys)
                }
            })
        })
    }

    /*  put value under key into store  */
    put (key, value) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.loadDatabase({}, (err) => {
                if (err)
                    reject(err)
                else {
                    let record = this.kv.findOne({ key: key })
                    if (record !== null) {
                        record.value = value
                        this.kv.update(record)
                    }
                    else
                        this.kv.insert({ key: key, value: value })
                    this.db.saveDatabase((err) => {
                        if (err)
                            reject(err)
                        else
                            resolve()
                    })
                }
            })
        })
    }

    /*  get value under key from store  */
    get (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.loadDatabase({}, (err) => {
                if (err)
                    reject(err)
                else {
                    let result = this.kv.findOne({ key: key })
                    let value = result !== null ? result.value : undefined
                    resolve(value)
                }
            })
        })
    }

    /*  delete value under key from store  */
    del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.loadDatabase({}, (err) => {
                if (err)
                    reject(err)
                else {
                    let record = this.kv.findOne({ key: key })
                    if (record !== null)
                        this.kv.remove(record)
                    this.db.saveDatabase((err) => {
                        if (err)
                            reject(err)
                        else
                            resolve()
                    })
                }
            })
        })
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err)
                    reject(err)
                else {
                    delete this.db
                    delete this.kv
                    this.opened = false
                    resolve()
                }
            })
        })
    }
}

