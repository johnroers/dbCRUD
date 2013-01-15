
// *********************************************************************************
//
//   dbCRUD: Smart, flexible, automated CRUD for MySQL
//
//   Copyright(c) 2012 John Roers <jroers@gmail.com>, MIT Licensed
//
// *********************************************************************************

module.exports.extend = function(db)
{
    db.sync = function()
    {
        db.client.query("use " + db.database, function(error, data, fields)
        {
            if (error)
            {
                db.client.query("create database " + db.database, function(error, data, fields)
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
    };
    
    db.syncTable = function(table)
    {
        db.client.query("select 1 from " + table + " where 0=1", function(error, data, fields)
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
                
                db.client.query(sql);
                
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
    };
    
    db.syncField = function(table, field)
    {
        db.client.query("select " + field + " from " + table + " where 0=1", function(error, data, fields)
        {
            if (error)
            {
                var sql = "alter table " + table + " add column (";
                var col = db.model[table][field];
                sql += col.name + " " + db.getFieldType(col);
                sql += (col.nullable) ? " null" : " not null";
                sql += ")";
        
                if (db.log) console.log("SYNC: " + sql);
                
                db.client.query(sql);
            }
        });
    };
    
    return db;
};
