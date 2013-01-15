
// *********************************************************************************
//
//   dbCRUD: Smart, flexible, automated CRUD for MySQL
//
//   Copyright(c) 2012 John Roers <jroers@gmail.com>, MIT Licensed
//
// *********************************************************************************

module.exports.extend = function(db)
{
    db.fetch = function(table, id, callback)
    {
        var idField = db.getIdField(table);
        if (idField)
        {
            db.selectOne({ from: table, where: { field: table[idField], equals: id }}, callback);
        }
        else
        {
            db.returnResults(callback, null);
        }
    };
    
    db.fetchTree = function(table, id, callback)
    {
        db.fetch(table, id, function(root)
        {
            var tableName = db.getTableName(table);
            var tables = db.getForeignTables(tableName);
            if (root && tables.length)
            {
                var totalCallbacks = 0;
                tables.forEach(function(table)
                {
                    db.addChildren(root, id, tableName, table, function()
                    {
                        totalCallbacks++;
                        if (totalCallbacks == tables.length)
                        {
                            db.returnResults(callback, root);
                        }
                    });
                });
            }
            else
            {
                db.returnResults(callback, root);
            }
        });
    };
    
    db.addChildren = function(parent, id, tableName, childName, callback)
    {
        db.select({ from: db.model[childName], where: { field: db.model[childName][db.getKeyField(childName, tableName)], equals: id } }, function(data)
        {
            parent[childName] = data;
            callback();
        });
    };
    
    return db;
};
