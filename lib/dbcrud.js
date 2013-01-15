
// *********************************************************************************
//
//   dbCRUD: Smart, flexible, automated CRUD for MySQL
//
//   Copyright(c) 2012 John Roers <jroers@gmail.com>, MIT Licensed
//
// *********************************************************************************

module.exports.init = function(client, database, datamodel)
{
    var db = {
        client: client,
        database: database,
        model: datamodel,
        m: datamodel,
        getUserIdFunction: null,
        log: false
    };

    handleDisconnect(db.client);

    require('./fetch' ).extend(db);
    require('./routes').extend(db);
    require('./save'  ).extend(db);
    require('./select').extend(db);
    require('./sync'  ).extend(db);
    
    db.getFieldType = function(field)
    {
        if (field.type == "id") return "integer key auto_increment";
        if (field.type == "userid") return "integer";
        for (var table in db.model) if (table == field.type) return "integer";
        return field.type;
    };
    
    db.getIdField = function(table)
    {
        for (var field in table) if (table[field].type == "id") return field;
        return null;
    };
    
    db.getKeyField = function(childName, parentName)
    {
        var child = db.model[childName];
        for (var f in child) if (child[f].type == parentName) return f;
        return null;
    };
    
    db.getUserIdField = function(table)
    {
        for (var field in table) if (table[field].type == "userid") return field;
        return null;
    };
    
    db.getUserId = function() {
        if (db.getUserIdFunction) {
            return db.getUserIdFunction();
        }
        return 0;
    };
    
    db.getTableName = function(table)
    {
        for (var tableName in db.model) if (db.model[tableName] == table) return tableName;
        return null;
    };
    
    db.getForeignTables = function(tableName)
    {
        var tables = [];
        for (var t in db.model)
        {
            for (var f in db.model[t])
            {
                if (db.model[t][f].type == tableName)
                {
                    tables[tables.length] = t;
                }
            }
        }
        return tables;
    };
    
    db.returnResults = function(callback, data)
    {
        if (callback)
        {
            if (db.log) console.log("RETURN: " + JSON.stringify(data));
            
            if (callback instanceof Function)
            {
                callback(data);
            }
            else if (callback.send)
            {
                callback.send(data);
            }
        }
    };
    
    db.sync();
    
    return db;
};

function handleDisconnect(connection) {
    connection.on('error', function(err) {
        if (!err.fatal) {
            return;
        }
        if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
            throw err;
        }

        if (db.log) console.log('Re-connecting lost connection: ' + err.stack);

        connection = mysql.createConnection(connection.config);
        handleDisconnect(connection);
        connection.connect();
    });
}
