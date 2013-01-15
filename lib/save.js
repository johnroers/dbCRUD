
// *********************************************************************************
//
//   dbCRUD: Smart, flexible, automated CRUD for MySQL
//
//   Copyright(c) 2012 John Roers <jroers@gmail.com>, MIT Licensed
//
// *********************************************************************************

module.exports.extend = function(db)
{
    db.saveTree = function(table, object, callback)
    {
        if (db.log) console.log(JSON.stringify(object));
        
        db.save(table, object, function(root)
        {
            if (root == null) {
                db.returnResults(callback, root);
            } else {
                var id = root[db.getIdField(table)];
                var tableName = db.getTableName(table);
                var tables = db.getForeignTables(tableName);
                var totalCallbacks = 0;
                if (tables.length)
                {
                    for (var t in tables)
                    {
                        var list = object[tables[t]];
                        if (list)
                        {
                            root[tables[t]] = list;
                            for (var item in list)
                            {
                                list[item][db.getKeyField(tables[t], tableName)] = id;
                            }
                            db.save(db.model[tables[t]], list, function(data)
                            {
                                root[tables[t]] = data;
                                if (++totalCallbacks == tables.length) db.returnResults(callback, root);
                            });
                        }
                        else
                        {
                            if (++totalCallbacks == tables.length) db.returnResults(callback, root);
                        }
                    }
                }
                else
                {
                    db.returnResults(callback, root);
                }
            }
        });
    };
    
    db.save = function(table, list, callback)
    {
        if (list instanceof Array)
        {
            var totalCallbacks = 0;
            var resultsList = [];
            
            for (var i in list)
            {
                db.saveObject(table, list[i], function(data)
                {
                    totalCallbacks++;
                    if (data)
                    {
                        resultsList[resultsList.length] = data;
                    }
                    if (totalCallbacks == list.length)
                    {
                        db.returnResults(callback, resultsList);
                    }
                });
            }
        }
        else
        {
            db.saveObject(table, list, callback);
        }
    };
    
    db.saveObject = function(table, object, callback)
    {
        if (!object)
        {
            db.returnResults(callback, object);
            return;
        }
        
        var tableName = db.getTableName(table);
        var idField = db.getIdField(table);
        var id = object[idField];
        
        if (object._destroy)
        {
            if (id)
            {
                var sql = "delete from " + tableName + " where id = " + db.client.escape(id);
                
                if (db.log) console.log(sql);
                
                db.client.query(sql, function(error, data, fields) { db.returnResults(callback, null); });
            }
            else
            {
                db.returnResults(callback, null);
            }
        }
        else if (id)
        {
            var sql = "update " + tableName;
            
            sql += " set ";
            
            var needsComma = false;
            
            for (var f in table)
            {
                if (f != "data" && table[f].type != "id" && object[table[f].name] !== undefined)
                {
                    if (needsComma) sql += ", ";
                    
                    sql += table[f].name + " = ";
                    
                    if (!table[f].nullable &&
                        (object[table[f].name] == undefined ||
                    	object[table[f].name] == "undefined" ||
                    	object[table[f].name] == null ||
                    	object[table[f].name] == "null" ||
                    	object[table[f].name] == ""))
                    {
                    	if (db.getFieldType(table[f]).indexOf("char") == -1) {
                        	sql += "0";
                        } else {
                        	sql += "''";
                        }
                    } else {
                        sql += db.client.escape(object[table[f].name]);
                    }
                    needsComma = true;
                }
            }
            
            sql += " where id = " + db.client.escape(id);
            
            if (db.log) console.log(sql);
            
            db.client.query(sql, function(error, data, fields)
            {
                db.fetch(table, id, callback);
            });
        }
        else
        {
            var fields = "";
            var values = "";
            var needsComma = false;
            for (var f in table)
            {
                if (table[f].type != "id" && f != "data")
                {
                    if (needsComma)
                    {
                        fields += ", ";
                        values += ", ";
                    }
                    fields += table[f].name;

                    if (!table[f].nullable &&
                        (object[table[f].name] == undefined ||
                    	object[table[f].name] == null ||
                    	object[table[f].name] == "null" ||
                    	object[table[f].name] == ""))
                    {
                    	if (db.getFieldType(table[f]).indexOf("char") == -1) {
                        	values += "0";
                        } else {
                        	values += "''";
                        }
                    }
                    else
                    {
                        values += db.client.escape(object[table[f].name]);
                    }
                    needsComma = true;
                }
            }
            
            var sql = "insert into " + tableName + " (" + fields + ") values (" + values + ")";
            
            if (db.log) console.log(sql);
            
            db.client.query(sql, function(error, data, fields)
            {
                if (error && db.log) console.log(JSON.stringify(error));
                
                object[idField] = data.insertId;
                db.fetch(table, object[idField], callback);
            });
        }
    };
    
    return db;
};
