# dbCRUD
      
  Smart, flexible, automated CRUD for MySQL, built on [node](http://nodejs.org)
  and [mysql](https://github.com/felixge/node-mysql),
  and optimized for use with [express](http://expressjs.com/)


## Features

  * Javascript-driven database management
  * Automated SQL for ID-based CRUD operations
  * Flexible query syntax for more complex logic


## Installation

    $ npm install dbcrud

----

## What dbCRUD Can Do

 With dbCRUD, you define your data model as a javascript object, such as:

    var model = {
          family: {
              id: { name: 'id', type: 'id' },
              name: { name: 'name', type: 'varchar(64)', orderBy: true },
              notes: { name: 'description', type: 'varchar(255)' }
          },
          person: {
              id: { name: 'id', type: 'id' },
              name: { name: 'name', type: 'varchar(64)', nullable: true, orderBy: true }
              family: { name: 'family', type: 'family' },
          }
    }

  Then you initialize dbCRUD with a mysql client, database name, and the data model:

    var client = require('mysql').createClient({ user: 'root', password: '' });
    var db = require('dbcrud').init(client, 'contacts', model);

  dbCRUD will create the database if it doesn't exist, create each table if it doesn't exist,
  and create each column if it doesn't exist.

### Simple CRUD

  Now that dbCRUD knows your data model structure, it exposes simple CRUD methods:

    db.fetch(db.model.family, 14, callback);
    db.save(db.model.family, myFamily, callback);

  The save method will do INSERT or UPDATE as appropriate, based on whether or not the object's
  ID field has a value.  It is also very lenient and will only update fields defined in the
  javascript object.  Here is a valid call that will only update the "notes" field of "family"
  ID 14:

    db.save(db.model.family, { id: 14, notes: 'updated notes' }, callback);

### Object Trees

  dbCRUD is aware of table relations, and it can fetch object trees automatically:

    db.fetchTree(db.model.family, 1, callback);

  which will return not only the "family" object requested, but will also embed an array of
  "person" objects which have a foreign-key of that "family" id

    db.saveTree(db.model.family, myFamily, callback);

  will save not only the "family" object, but its child "person" objects as well, if they are
  present in an embedded array

### Query Syntax

  dbCRUD also exposes a more powerful query syntax for returning lists of objects:

    db.select({
        from: db.model.person,
        where: { field: db.model.person.name, equals: 'John' },
        orderBy: db.model.person.name,
        success: callback
    });

### Using Express

  In all the above examples, the "callback" method simply takes one parameter: the object or array
  returned from the database.

  If you are using Express, you can pass the response object instead of a callback method, and
  dbCrud will automatically send the data it retrieves as the response.  This allows you to create
  one-line REST routes:

    app.get('/family/:id', function(request, response)
    {
        db.fetchTree(db.model.family, request.params.id, response);
    });

----

## To Do

  Deleting is half-baked at the moment.  When you issue a save on any object, if "_destroy" is defined
  and true in that object, dbCRUD will DELETE it.  That's currently the only way to delete, and it
  works well enough.  But clearly some devoted methods are in order.

  The "select" syntax is very limited and has much room to expand.

  Tree fetch/save is only one level deep, and it might be worthwhile to allow deeper nesting.

----

## License 

The MIT License (MIT)

Copyright (c) 2012 John Roers

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.