
IPC-KeyVal
==========

Inter-Process-Communication (IPC) Key-Value (KeyVal) Storage Abstraction Layer

<p/>
<img src="https://nodei.co/npm/ipc-keyval.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/rse/ipc-keyval.png" alt=""/>

About
-----

This [Node.js](https://nodejs.org) module provides an abstraction layer
for Inter-Process-Communication through Key-Value Storage. It
supports the following modes (in order of increasing process scope and
overall complexity):

- **Single-Process-Model (SPM):**<br/>
  This is for Node applications NOT using the `cluster` module.
  The storage is performed with an in-memory hash.
  No external resource is needed.

- **Multi-Process-Model (MPM):**<br/>
  This is for Node applications using the `cluster` module.
  The storage is performed with an in-memory hash
  in each process and an IPC message exchange between the processes
  with the help of the `cluster` module. No external resource is needed.

- **Remote-Process-Model (RPM):**<br/>
  This is for Node applications split into distinct process, usually
  running also on distinct machines.
  The storage is performed with the help of an external database.
  Currently SQLite, MySQL/MariaDB, PostgreSQL and Redis are supported.

Installation
------------

```shell
$ npm install ipc-keyval --save-dev
```

For Remote-Process-Model (RPM) with SQLite an additional
driver is required. As this is based on native code, you have to
install it manually:

```shell
$ npm install sqlite3 --save-dev # for SQLite
```

Usage
-----

```js
(async () => {
    const KeyVal = require("ipc-keyval")

    /*  open connection  */
    let keyval = new KeyVal("spm")
    await keyval.open()

    /*  retrieve all keys  */
    await keyval.keys("*")

    /*  store a value  */
    await keyval.put("foo", "bar")

    /*  retrieve a value  */
    await keyval.get("foo")

    /*  delete a value  */
    await keyval.del("foo")

    /*  acquire exclusive lock  */
    await keyval.acquire()

    /*  release exclusive lock  */
    await keyval.release()

    /*  close connection  */
    await keyval.close()
})
```

The following URLs are supported on `new KeyVal(url)`:

- `spm:<id>`
- `mpm:<id>`
- `rpm+sqlite://<filename>[?table=<table>&colKey=<col>&colVal=<col>]`
- `rpm+mysql://[<username>:<password>@]<host>[:<port>][/<database>][?table=<table>&colKey=<col>&colVal=<col>]`
- `rpm+pgsql://[<username>:<password>@]<host>[:<port>][/<database>][?table=<table>&colKey=<col>&colVal=<col>]`
- `rpm+redis://[xxx:<secret>@]<host>[:<port>][/<scope>]`

The `<id>` is an arbitrary unique identifier matching the regular expression `^[a-zA-Z][a-zA-Z0-9-]*$`.

Application Programming Interface (API)
---------------------------------------

```ts
declare class KeyVal {
    constructor (url: string);
    open(): Promise<void>;
    keys(pattern?: string): Promise<string[]>;
    put(key: string, value: any): Promise<void>;
    get(key: string): Promise<any>;
    del(key: string): Promise<void>;
    acquire(): Promise<void>;
    release(): Promise<void>;
    close(): Promise<void>;
}
```

License
-------

Copyright (c) 2017-2019 Dr. Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

