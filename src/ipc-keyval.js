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

import URL              from "url"

import KeyValSPM        from "./ipc-keyval-1-spm"
import KeyValMPM        from "./ipc-keyval-2-mpm"
import KeyValRPMlokijs  from "./ipc-keyval-3-rpm-lokijs"
import KeyValRPMleveldb from "./ipc-keyval-4-rpm-leveldb"
import KeyValRPMsqlite  from "./ipc-keyval-5-rpm-sqlite"
import KeyValRPMpgsql   from "./ipc-keyval-6-rpm-pgsql"
import KeyValRPMredis   from "./ipc-keyval-7-rpm-redis"

/*  Key-Value API  */
class KeyVal {
    constructor (url) {
        let m
        let urlParsed = URL.parse(url)
        if (url === "spm")
            this.strategy = new KeyValSPM(urlParsed)
        else if (url === "mpm")
            this.strategy = new KeyValMPM(urlParsed)
        else if (typeof urlParsed.protocol === "string" && (m = urlParsed.protocol.match(/^rpm(?:\+([a-z]+))?:$/)) !== null) {
            if (m[1] === "lokijs")
                this.strategy = new KeyValRPMlokijs(urlParsed)
            else if (m[1] === "leveldb")
                this.strategy = new KeyValRPMleveldb(urlParsed)
            else if (m[1] === "sqlite")
                this.strategy = new KeyValRPMsqlite(urlParsed)
            else if (m[1] === "pgsql")
                this.strategy = new KeyValRPMpgsql(urlParsed)
            else if (m[1] === "redis")
                this.strategy = new KeyValRPMredis(urlParsed)
            else
                throw new Error(`unknown implementation strategy "${url}"`)
        }
        else
            throw new Error(`unknown implementation strategy "${url}"`)
    }
    open      (...args) { return this.strategy.open(...args) }
    keys      (...args) { return this.strategy.keys(...args) }
    put       (...args) { return this.strategy.put(...args) }
    get       (...args) { return this.strategy.get(...args) }
    del       (...args) { return this.strategy.del(...args) }
    close     (...args) { return this.strategy.close(...args) }
}

module.exports = KeyVal

