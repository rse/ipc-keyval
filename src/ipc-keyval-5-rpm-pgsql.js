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

/* eslint no-console: off */
import URI from "urijs"

/*  Key-Value for Remote-Process-Model (RPM) with SQLite Database  */
export default class KeyVal {
    constructor (url) {
        this.url    = url
        this.opened = false
        this.options = {
            database: null,
            table:    "KeyVal",
            colKey:   "key",
            colVal:   "val"
        }
        if (this.url.pathname)
            this.options.database = this.url.pathname.replace(/^\//, "")
        else
            throw new Error("require path in URL")
        if (this.url.query)
            this.options = Object.assign(this.options, URI.parseQuery(this.url.query))
        try {
            this.pg = require("pg")
        }
        catch (ex) {
            throw new Error("require PostgreSQL module (NPM package \"pg\")")
        }
    }

    /*  open connection  */
    open () {
        if (this.opened)
            throw new Error("already opened")
        let config = {
            database: this.options.database,
            host: this.url.hostname,
            port: this.url.port ? parseInt(this.url.port) : 5432
        }
        if (this.url.auth) {
            config.user     = this.url.auth.split(":")[0]
            config.password = this.url.auth.split(":")[1]
        }
        return new Promise((resolve, reject) => {
            this.db = new this.pg.Client(config)
            this.db.connect((err) => {
                if (err) reject(err)
                else     resolve()
            })
        }).then(() => {
            return new Promise((resolve, reject) => {
                this.db.query(`CREATE TABLE IF NOT EXISTS ${this.options.table} ` +
                    `(${this.options.colKey} VARCHAR(128) PRIMARY KEY, ` +
                    ` ${this.options.colVal} TEXT);`, [],
                    (err) => {
                        if (err)
                            reject(err)
                        else {
                            this.opened = true
                            resolve()
                        }
                    }
                )
            })
        })
    }

    /*  retrieve all keys  */
    keys () {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT ${this.options.colKey} FROM ${this.options.table};`, [],
                (err, result) => {
                    if (err)
                        reject(err)
                    else {
                        let keys = result.rows.map((row) => row[this.options.colKey])
                        resolve(keys)
                    }
                }
            )
        })
    }

    /*  put value under key into store  */
    put (key, value) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.query(`INSERT INTO ${this.options.table} ` +
                `(${this.options.colKey}, ${this.options.colVal}) VALUES ($1, $2) ` +
                `ON CONFLICT (${this.options.colKey}) ` +
                `DO UPDATE SET ${this.options.colVal} = EXCLUDED.${this.options.colVal};`,
                [ key, JSON.stringify(value) ],
                (err) => {
                    if (err) reject(err)
                    else     resolve()
                }
            )
        })
    }

    /*  get value under key from store  */
    get (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT ${this.options.colVal} FROM ${this.options.table} ` +
                `WHERE ${this.options.colKey} = $1;`,
                [ key ],
                (err, result) => {
                    if (err)
                        reject(err)
                    else {
                        let value
                        if (result.rowCount === 1)
                            value = JSON.parse(result.rows[0][this.options.colVal])
                        resolve(value)
                    }
                }
            )
        })
    }

    /*  delete value under key from store  */
    del (key) {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.query(`DELETE FROM ${this.options.table} ` +
                `WHERE ${this.options.colKey} = $1;`,
                [ key ],
                (err) => {
                    if (err) reject(err)
                    else     resolve()
                }
            )
        })
    }

    /*  close connection  */
    close () {
        if (!this.opened)
            throw new Error("still not opened")
        return new Promise((resolve, reject) => {
            this.db.end((err) => {
                if (err)
                    reject(err)
                else {
                    delete this.db
                    this.opened = false
                }
            })
        })
    }
}

