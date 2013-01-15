
// *********************************************************************************
//
//   dbCRUD: Smart, flexible, automated CRUD for MySQL
//
//   Copyright(c) 2012 John Roers <jroers@gmail.com>, MIT Licensed
//
// *********************************************************************************

module.exports.extend = function(db)
{
    db.select = function(query, callback)
    {
        if (query.success)
        {
            callback = query.success;
        }
        
        var tableName = db.getTableName(query.from);
        
        var sql = "select ";
        
        if (!query.fields)
        {
            query.fields = query.from;
        }
        else if (query.fields.name)
        {
            query.fields = [query.fields];
        }
        
        var needsComma = false;
        for (var f in query.fields)
        {
            if (f != 'data' && query.fields[f].type != "userid")
            {
                if (needsComma) sql += ', ';
                sql += query.fields[f].name;
                needsComma = true;
            }
        }
        
        sql += " from " + tableName;
        
        if (query.where)
        {
            sql += " where ";
            
            if (query.where.field)
            {
                query.where = [ query.where ];
            }
            
            var needsAnd = false;
            query.where.forEach(function(where)
            {
                if (needsAnd)
                {
                    sql += " and ";
                }
                if (where.equals)
                {
                    sql += where.field.name + " = " + db.client.escape(where.equals);
                }
                else if (typeof where['!='] != 'undefined')
                {
                    sql += where.field.name + " <> " + db.client.escape(where['!=']);
                }
                else if (typeof where.isNull != 'undefined')
                {
                    sql += where.field.name + (where.isNull ? " IS NULL" : " NOT NULL");
                }
                else if (where.notEquals)
                {
                    sql += where.field.name + " <> " + db.client.escape(where.notEquals);
                }
                else if (where.greaterThan)
                {
                    sql += where.field.name + " > " + db.client.escape(where.greaterThan);
                }
                else if (where.lessThan)
                {
                    sql += where.field.name + " < " + db.client.escape(where.lessThan);
                }
                else if (where.greaterThanOrEquals)
                {
                    sql += where.field.name + " >= " + db.client.escape(where.greaterThanOrEquals);
                }
                else if (where.lessThanOrEquals)
                {
                    sql += where.field.name + " <= " + db.client.escape(where.lessThanOrEquals);
                }
                else if (where.like)
                {
                    sql += where.field.name + " like " + db.client.escape(where.like);
                }
                needsAnd = true;
            });
        }
        
        if (query.groupBy)
        {
            sql += ' group by ' + query.groupBy.name;
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
            sql += " order by ";
            
            if (query.orderBy.name) query.orderBy = [query.orderBy];
            
            var needsComma = false;
            
            query.orderBy.forEach(function(order) {

                if (needsComma) sql += ', ';
                
                if (order.count)
                {
                    sql += 'count(' + order.count.name + ')';
                }
                else if (order.name)
                {
                    sql += order.name;
                }
                
                if (order.desc) sql += ' desc';
                
                needsComma = true;
            });

        }
        
        if (query.limit)
        {
            sql += " limit " + query.limit;
        }
        
        // if (db.log)
        console.log("SELECT: " + sql);
        
        db.client.query(sql, function(error, data, fields)
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
    };
    
    return db;
};
