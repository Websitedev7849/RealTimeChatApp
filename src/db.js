const mysql = require('mysql');
const crypto = require("crypto");

function getConnection() {
    return mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    });
}


function isUserAlreadyExist(username) {

    const con = getConnection()
    con.connect()

    const sql = `SELECT * FROM users WHERE username = '${username}'`

    return new Promise(function (res, rej) {
        
        // query the connection
        con.query(sql, function (err, result) {
            if (err) throw err;
            
          //   end connection
            con.end()

            // resolve false if record exists
            if (result && result.length == 0) {
                res(false)
            }
            
            // resolve true if record does not exists
            res(true)
        });
    

    })
}

function createUser(username, password) {

    const con = getConnection()
    con.connect()

    const generatedUserId = crypto.randomBytes(10).toString('hex');
    // e.g 351ea7a3980b9fa5142c

    const sql = `INSERT INTO users(id, username, password) 
    VALUES ("${generatedUserId}", "${username}", "${password}");`

    return new Promise(function (res, rej) {
        
        // query the connection
        con.query(sql, function (err, result) {
            if (err) rej(err);
            
            con.end()
            res({id: generatedUserId, username})
          
        });
    

    })
}

function isUserValid(username, password) {
    return new Promise(async function (res, rej) {
     
        const sql = `SELECT * FROM users WHERE username="${username}" AND password="${password}";`
        const con = getConnection()
        con.connect()

        con.query(sql, function (err, result) {
            if (err) rej(err);
                        
            // result: [
            //     RowDataPacket { id: 1, username: 'siddharth04', password: '123456' }
            // ]
            con.end()
            
            if (result && result.length !== 0) {
                res({ id: result[0].id, username: result[0].username })
            }
            else{
                rej("Username or Password is Wrong")
            }
          
        });

    })
}

/**
 * 
 * @param {String} userID 
 * @param {String} socketID 
 * @returns {Promise} Promise
 * 
 */
function registerActiveUser(userID, socketID) {
    return new Promise((res, rej) => {

        const sql = `INSERT INTO activeusers VALUES ("${userID}", "${socketID}");`

        const con = getConnection()
        con.connect();

        con.query(sql, function (err, result) {
            if (err) rej(err)

            con.end()
            res(true)

        })

    })
}

function deRegisterActiveUser(userID) {
    return new Promise((res, rej) => {

        const sql = `DELETE FROM activeusers WHERE userID = "${userID}";`
        const con = getConnection()
        con.connect()

        con.query(sql, function (err) {
            if (err) rej(err)

            res(true)

        })

    })
}

function isUserActive(username) {
    return new Promise((res, rej) => {

        const sql = `SELECT users.id, users.username, activeusers.socketID 
                    FROM users, activeusers 
                    WHERE users.id = activeusers.userID 
                    AND users.username = "${username}"`
        const con = getConnection()
        con.connect()

        con.query(sql, function (err, result) {
            if (err) rej(err)

            res(result)

        })

    })
}

module.exports = {
    isUserAlreadyExist,
    createUser,
    isUserValid,
    registerActiveUser,
    deRegisterActiveUser,
    isUserActive
}