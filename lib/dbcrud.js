
// *********************************************************************************
//
//   dbCRUD: Smart, flexible, automated CRUD for MySQL
//
//   Copyright(c) 2012 John Roers <jroers@gmail.com>, MIT Licensed
//
// *********************************************************************************

module.exports.init = function(client, database, datamodel)
{
    var db = this;
    db.client = client;
    db.model = datamodel;
    db.m = datamodel;
    db.log = false;
    
    db.returnResults = function(callback, data)
    {
        if (callback)
        {
            if (callback instanceof Function)
            {
                callback(data);
            }
            else if (callback.send)
            {
                callback.send(data);
            }
        }
    }
    
    db.sync = function()
    {
        db.client.query("use " + database, function(error, data, fields)
        {
            if (error)
            {
                db.client.query("create database " + database, function(error, data, fields)
                {
                    if (!error) db.sync();
                });
            }
            else
            {
                for (var table in db.model)
                {
                    db.syncTable(table);
                } 
            }
        });
    }
    
    db.syncTable = function(table)
    {
        client.query("select 1 from " + table + " where 0=1", function(error, data, fields)
        {
            if (error)
            {
                var sql = "create table " + table + " (";
                
                var needsComma = false;
                for (var field in db.model[table])
                {
                	if (field != "data")
                	{
	                    var col = db.model[table][field];
	                    if (needsComma) sql += ", ";
	                    sql += col.name + " " + db.getFieldType(col);
	                    sql += (col.nullable) ? " null" : " not null";
	                    needsComma = true;
	                }
                }
                sql += ")";
                
                if (db.log) console.log("SYNC: " + sql);
                
                client.query(sql);
                
                if (db.model[table].data)
                {
                	db.save(db.model[table], db.model[table].data);
                }
            }
            else
            {
                for (var field in db.model[table])
                {
                	if (field != "data")
                	{
	                    db.syncField(table, field);
	                }
                }
            }
        });
    }
    
    db.syncField = function(table, field)
    {
        client.query("select " + field + " from " + table + " where 0=1", function(error, data, fields)
        {
            if (error)
            {
                var sql = "alter table " + table + " add column (";
                var col = db.model[table][field];
                sql += col.name + " " + db.getFieldType(col);
                sql += (col.nullable) ? " null" : " not null";
                sql += ")";
        
                if (db.log) console.log("SYNC: " + sql);
                
                client.query(sql);
            }
        });
    }
    
    db.getFieldType = function(field)
    {
        if (field.type == "id") return "integer key auto_increment";
        for (var table in db.model)
        {
            if (table == field.type) return "integer";
        }
        return field.type;
    }
    
    db.select = function(query, callback)
    {
        if (query.success)
        {
            callback = query.success;
        }
        
        var tableName = db.getTableName(query.from);
        
        var sql = "select * from " + tableName;
        
        if (query.where)
        {
            sql += " where ";
            
            if (query.where.field)
            {
                query.where = [ query.where ];
            }
            
            var needsAnd = false;
            for (var clause in query.where)
            {
                if (needsAnd)
                {
                    sql += " and ";
                }
                if (query.where[clause].equals)
                {
                    sql += query.where[clause].field.name + " = '" + query.where[clause].equals + "'";
                }
                else if (query.where[clause].notEquals)
                {
                    sql += query.where[clause].field.name + " <> '" + query.where[clause].notEquals + "'";
                }
                else if (query.where[clause].greaterThan)
                {
                    sql += query.where[clause].field.name + " > '" + query.where[clause].greaterThan + "'";
                }
                else if (query.where[clause].lessThan)
                {
                    sql += query.where[clause].field.name + " < '" + query.where[clause].lessThan + "'";
                }
                else if (query.where[clause].greaterThanOrEquals)
                {
                    sql += query.where[clause].field.name + " >= '" + query.where[clause].greaterThanOrEquals + "'";
                }
                else if (query.where[clause].lessThanOrEquals)
                {
                    sql += query.where[clause].field.name + " <= '" + query.where[clause].lessThanOrEquals + "'";
                }
                else if (query.where[clause].like)
                {
                    sql += query.where[clause].field.name + " like '" + query.where[clause].like + "'";
                }
                needsAnd = true;
            }
        }
        
        if (!query.orderBy)
        {
            for (var field in query.from)
            {
                if (query.from[field].orderBy) query.orderBy = query.from[field];
            }
        }
        
        if (query.orderBy)
        {
            sql += " order by " + query.orderBy.name;
        }
        
        if (db.log) console.log("SELECT: " + sql);
        
        client.query(sql, function(error, data, fields)
        {
            db.returnResults(callback, data);
        });
    };
    
    db.selectOne = function(query, callback)
    {
        if (query.success)
        {
            callback = query.success;
            query.success = undefined;
        }
        db.select(query, function(list)
        {
            db.returnResults(callback, (list && list.length > 0) ? list[0] : null);
        });
    }
    
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
    }
    
    db.fetchTree = function(table, id, callback)
    {
        db.fetch(table, id, function(root)
        {
            var tableName = db.getTableName(table);
            var tables = db.getForeignTables(tableName);
            var totalCallbacks = 0;
            for (var t in tables)
            {
                db.addChildren(root, id, tableName, tables[t], function()
                {
                    totalCallbacks++;
                    if (totalCallbacks == tables.length)
                    {
                        db.returnResults(callback, root);
                    }
                });
            }
            
        });
    }
    
    db.addChildren = function(parent, id, tableName, childName, callback)
    {
        db.select({ from: db.model[childName], where: { field: db.model[childName][tableName], equals: id } }, function(data)
        {
            parent[childName + "s"] = data;
            callback();
        });
    }
    
    db.saveTree = function(table, object, callback)
    {
        if (db.log) console.log(JSON.stringify(object));
        
        db.save(table, object, function(root)
        {
            var id = root[db.getIdField(table)];
            var tableName = db.getTableName(table);
            var tables = db.getForeignTables(tableName);
            var totalCallbacks = 0;
            for (var t in tables)
            {
                var list = object[tables[t] + "s"];
                if (list)
                {
                    root[tables[t] + "s"] = list;
                    for (var item in list)
                    {
                        list[item][tableName] = id;
                    }
                    db.save(db.model[tables[t]], list, function(data)
                    {
                        root[tables[t] + "s"] = data;
                        if (++totalCallbacks == tables.length) db.returnResults(callback, root);
                    });
                }
                else
                {
                    if (++totalCallbacks == tables.length) db.returnResults(callback, root);
                }
            }
        });
    }
    
    db.getForeignTables = function(tableName)
    {
        var tables = new Array();
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
    }
    
    db.getIdField = function(table)
    {
        for (var field in table)
        {
            if (table[field].type == "id") return field;
        }
        return null;
    }
    
    db.save = function(table, list, callback)
    {
        if (list instanceof Array)
        {
            var totalCallbacks = 0;
            var resultsList = new Array();
            
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
    }
    
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
                var sql = "delete from " + tableName + " where id = '" + id + "'";
                
                if (db.log) console.log(sql);
                
                client.query(sql, function(error, data, fields) { db.returnResults(callback, null); });
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
                if (needsComma) sql += ", ";
                if (f != "data" && table[f].type != "id" && object[table[f].name] != undefined)
                {
                    if (object[table[f].name] == null || object[table[f].name] == "null" || object[table[f].name] == "")
                    {
                        sql += table[f].name + " = null";
                    }
                    else
                    {
                        sql += table[f].name + " = '" + object[table[f].name] + "'";
                    }
                    needsComma = true;
                }
            }
            
            sql += " where id = '" + id + "'";
            
            if (db.log) console.log(sql);
            
            client.query(sql, function(error, data, fields)
            {
                db.fetch(table, id, callback)
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
                    if (object[table[f].name] == null || object[table[f].name] == "null" || object[table[f].name] == "")
                    {
                        values += "null";
                    }
                    else
                    {
                        values += "'" + object[table[f].name] + "'";
                    }
                    needsComma = true;
                }
            }
            
            var sql = "insert into " + tableName + " (" + fields + ") values (" + values + ")";
            
            if (db.log) console.log(sql);
            
            client.query(sql, function(error, data, fields)
            {
                object[idField] = data["insertId"];
                db.fetch(table, object[idField], callback);
            });
        }
    }
    
    db.getTableName = function(table)
    {
        for (var tableName in db.model)
        {
            if (db.model[tableName] == table)
            {
                return tableName;
            }
        }
        return null;
    }
    
    db.sync();
    
    return db;
}
