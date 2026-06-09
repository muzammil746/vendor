require("dotenv").config({
    path: __dirname + "/.env"
});
const express = require("express");
const cors = require("cors");
const mysql2 = require("mysql2");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("frontend"));

const db = mysql2.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.getConnection((err, connection) =>  {

    if (err) {
        console.log("Database connection failed");
        console.log(err);
        return;
    }

    console.log("Mysql connected");

    connection.release();
});

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});


app.get("/", (req, res) => {
    res.send("Server Running on port 3000");
});


app.get("/db-test", (req, res) => {
    db.query("SELECT 1", (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("db error");
        }
        res.send("db connected");
    });
});


app.get("/customers", (req, res) => {
    const query = "SELECT * FROM customers";

    db.query(query, (err, results) => {
        if (err) {
            console.error("fetching error", err);
            return res.status(500).json({ error : "db error" });
        }

        res.json(results);
    });
});


/* customer Table
    name 
    phone
*/

app.post("/add-customers", (req, res) => {

    const { name, phone } = req.body;

    const query = `INSERT INTO customers (name, phone) VALUES (?, ?)`;
    
    db.query(query, [name, phone], (err, results) => {
        if (err) {
            console.error("insert error", err);
            return res.status(500).json({ error: "db error" });
        }

        res.json({
            message: "customer added",
            id: results.insertId
        });
    });
});



app.delete("/delete/:id", (req, res) => {
    
    const id = req.params.id;
    const query = `DELETE FROM customers WHERE id = ?`;

    db.query(query, [id], (err, results) => {
        
        if(err) {
            console.error("delete error", err);
            return res.status(500).json({ error: "customer not found" });
        }

        if (results.affectedRows === 0) {   // means nothing deleted
            return res.status(404).json({ error: "customer not found" });
        }

        res.json({ message: "customer delete" });
    });
    
});


app.post("/add-milk", (req, res) => {

    const { customer_id, date, quantity, rate } = req.body;

    if (quantity <= 0) {
        return res.status(400).json({ error : "Invalid quantity" });
    }

    const customerquery = `SELECT * FROM customers WHERE id = ?`;

    db.query(customerquery, [customer_id], (err, customer_results) => {
        if (err) {
            console.error(err);
            return res.status(400).json({ error: "Database error" });
        }

        if (customer_results.length === 0) {
            return res.status(400).json({ error: "Customer does not exist" });
        }

        const total = quantity * rate;

        const insertquery = `INSERT INTO milk_entries (customer_id, date, quantity, rate, total) VALUES (?, ?, ?, ?, ?)`;

        db.query(insertquery, [customer_id, date, quantity, rate, total], (err, results) => {

            if (err) {
                console.error("Milk adding error", err);
                return res.status(400).json({ error : "Database error"});
            }

            res.json({
                message : "Milk Added successfully",
                inserted : results.affectedRows
            });
        });
    });
});



app.get("/fetch-milk/:customer_id", (req, res, params) => {

    const id = req.params.customer_id;

    const customerquery = `SELECT * FROM milk_entries WHERE customer_id = ? ORDER BY date DESC`;

    db.query(customerquery, [id], (err, results) => {

        if (err) return res.status(400).json({ error : "Database error" });

        if (results.length === 0) return res.json([]);

        res.json(results);
    });

});



app.delete ("/delete-milk/:id", (req, res) => {

    const entry_id = req.params.id;

    const deletequery = `DELETE FROM milk_entries WHERE id = ?`;

    db.query(deletequery, [entry_id], (err, delresults) => {

        if (err) {
            console.error("deleting error", err);
            return res.status(400).json({ error : "Database error" });
        }

        if (delresults.affectedRows === 0) return res.status(400).json({ error : "entry does not exist" });

        res.json({
            message : "milk entry deleted successfully"
        });

    });
});


// ADD PAYMENT API
app.post("/add-payment", (req, res) => {

    const {date, customer_id, amount} = req.body;
    const sql = `INSERT INTO payments(date, customer_id, amount) VALUES (?, ?, ?)`;

    if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    db.query(sql, [date, customer_id, amount], (err, results) => {
        if (err) {
            console.error("add payment error", err);
            return res.status(400).json({ error: "database error" });
        }

        res.json({
            message: "payment added successfully"
        });
    });
});



// GET PAYMENT API
app.get("/fetch-payment/:customer_id", (req, res) => {

    const id = req.params.customer_id;
    const sql = `SELECT * FROM payments WHERE customer_id = ? ORDER BY date DESC`;

    db.query(sql, [id], (err, results) => {

        if(err) {
            console.error("fetching payment error", err);
            return res.status(400).json({ error: "Database error" });
        }

        res.json(results);

    });
});


// DELETE PAYMENT API
app.delete("/delete-payment", (req, res) => {

    const {date, customer_id} = req.body;
    const sql = `DELETE FROM payments WHERE date = ? AND customer_id = ?`;

    db.query(sql, [date, customer_id], (err, results) => {
        
        if(err) {
            console.error("Deleting payment error", err);
            return res.status(400).json({ error: "Database error" });
        }

        if(results.affectedRows === 0) return res.status(400).json({ error: "entry not found" });

        res.json({
            message: "deleted successfully"
        });
    });

});


// BILL API

app.get("/bill", (req, res) => {

    const customer_id = req.query.customer_id;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // total milk quantity
    const totalMilkQuery = `SELECT SUM(quantity) AS milk_quantity FROM milk_entries WHERE customer_id = ? AND date BETWEEN ? AND ?`;

    // total milk amount
    const totalAmountQuery = `SELECT SUM(total) AS milk_total FROM milk_entries WHERE customer_id = ? AND date BETWEEN ? AND ?`;

    // total payments
    const paymentQuery = ` SELECT SUM(amount) AS payment_total FROM payments WHERE customer_id = ? AND date BETWEEN ? AND ?`;

    // milk entries 
    const milkEntriesQuery = `SELECT date, quantity, rate, total FROM milk_entries WHERE customer_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC`;

    // fetch total milk quantity
    db.query(totalMilkQuery, [customer_id, startDate, endDate], (err1, result1) => {

        if (err1) {
            console.error( "Fetching milk quantity error", err1 );
            return res.status(500).json({ error: "Database error" });
        }

        const milkQuantity = result1[0].milk_quantity || 0;

        // fetch total milk amount
        db.query(totalAmountQuery, [customer_id, startDate, endDate], (err2, result2) => {

            if (err2) { 
                console.error("Fetching milk total error", err2);
                return res.status(500).json({ error: "Database error" });
            }

            const milkTotal = result2[0].milk_total || 0;

            // fetch total payments
            db.query(paymentQuery, [customer_id, startDate, endDate], (err3, result3) => {

                if (err3) {
                    console.error("Fetching payment total error", err3 );
                    return res.status(500).json({ error: "Database error" });
                }

                const paymentTotal = result3[0].payment_total || 0;

                // final balance
                const balance = milkTotal - paymentTotal;

                db.query( milkEntriesQuery, [customer_id, startDate, endDate], (err4, result4) => {

                    if (err4) {
                        console.error("Fetching milk entries error", err4);
                        return res.status(500).json({ error: "Database error" });
                    }

                    // Final response

                    res.json({

                        customer_id,

                        startDate,

                        endDate,

                        milk_quantity: milkQuantity,

                        milk_total: milkTotal,

                        payment_total: paymentTotal,

                        balance,

                        milk_entries: result4

                    });

                });
            });

        });

    });

});



app.get("/payment_bill", (req, res) => {

    const customer_id = req.query.customer_id;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate; 

    const paymentQuery = ` SELECT SUM(amount) AS payment_total FROM payments WHERE customer_id = ? AND date BETWEEN ? AND ?`;
    const totalAmountQuery = `SELECT SUM(total) AS milk_total FROM milk_entries WHERE customer_id = ? AND date BETWEEN ? AND ?`;
    const paymentEntriesQuery = `SELECT date, amount FROM payments WHERE customer_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC`;


    db.query(totalAmountQuery, [customer_id, startDate, endDate], (err, result) => {
        
        if (err) {
            console.error("Fetching milk total amount error", err);
            return res.status(500).json({ error : "Database error" });
        }

        const milkTotal = result[0].milk_total || 0;

        db.query(paymentQuery, [customer_id, startDate, endDate], (err2, result2) => {
            
            if (err2) {
                console.error("fetching payment bill error", err2);
                return res.status(500).json({ error : "Database error" });
            }

            const paymentTotal = result2[0].payment_total || 0;
            const balance = milkTotal - paymentTotal;

            db.query(paymentEntriesQuery, [customer_id, startDate, endDate], (err3, result3) => {

                if (err3) {
                    console.error("Fetching payment entries error", err3);
                    return res.status(500).json({ error: "Database error" });
                }

                res.json({

                    customer_id,

                    milk_total: milkTotal,

                    payment_total: paymentTotal,

                    balance,

                    payments: result3

                });
            });

        });
    });

});

app.use((req, res) => {
    res.status(404).send("Route not found");
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Running on port ${PORT}`);
});

